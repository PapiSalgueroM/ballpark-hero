'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
if (process.env.RELEASE_ROOT) {
  const cache = process.env.FREE_KICK_FONT_CACHE;
  const manifestBytes = fs.readFileSync(path.join(cache, 'manifest.json'));
  assert.match(process.env.FONT_CACHE_MANIFEST_SHA256 || '', /^[a-f0-9]{64}$/);
  assert.equal(hash(manifestBytes), process.env.FONT_CACHE_MANIFEST_SHA256, 'Prepared font manifest stays exact');
  const sheet = [...fs.readFileSync(path.join(process.env.RELEASE_ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(m => new URL(m[1]).href);
  assert.equal(sheet.length, 1, 'Use the actual single template stylesheet');
  const entries = JSON.parse(manifestBytes);
  assert(Array.isArray(entries) && entries.length > 1);
  const fonts = new Map();
  for (const entry of entries) {
    assert(!fonts.has(entry.url), 'No duplicate font cache URL');
    const url = new URL(entry.url);
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(url.origin));
    assert.equal(url.href, entry.url);
    assert.equal(entry.file, hash(entry.url));
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.equal(typeof entry.contentType, 'string');
    const body = fs.readFileSync(path.join(cache, entry.file));
    assert.equal(hash(body), entry.sha256, 'Prepared font body stays exact');
    fonts.set(entry.url, { ...entry, body });
  }
  assert(fonts.has(sheet[0]), 'Current template stylesheet is cached');
  const css = fonts.get(sheet[0]);
  assert.match(css.contentType, /^text\/css(?:;|$)/);
  const declared = [...new Set([...css.body.toString('utf8').matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(m => m[1]))];
  assert(declared.length > 0);
  assert.deepEqual([...fonts.keys()].sort(), [sheet[0], ...declared].sort(), 'Only actual stylesheet dependencies are fulfilled');
  for (const url of declared) assert.equal(new URL(url).origin, 'https://fonts.gstatic.com');
  const pw = require(path.join(process.env.RELEASE_ROOT,'node_modules/playwright-core'));
  let contextId = 0;
  const originalLaunch = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async options => {
    const browser = await originalLaunch(options);
    const originalContext = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await originalContext(options);
      const id = ++contextId;
      fs.appendFileSync(process.env.SWEEP_CONTEXT_RECEIPT, JSON.stringify({ contextId: id }) + "\n");
      await context.route(url => url.origin === "https://flagcdn.com", async route => {
        const request = route.request(), url = new URL(request.url());
        const validPath = /^\/(?:w[1-9][0-9]{0,2}\/|h[1-9][0-9]{0,2}\/|[1-9][0-9]{0,2}x[1-9][0-9]{0,2}\/)?[a-z]{2}(?:-[a-z0-9]{1,8})?\.(?:png|webp|svg)$/.test(url.pathname);
        if (url.origin !== "https://flagcdn.com" || url.username || url.password || url.search || url.hash || !validPath || request.method() !== "GET" || request.resourceType() !== "image") return route.fallback();
        await route.abort("blockedbyclient");
        fs.appendFileSync(process.env.SWEEP_FLAG_RECEIPT, JSON.stringify({ contextId: id, method: request.method(), resourceType: request.resourceType(), url: url.href, action: "LOCAL_ABORT" }) + "\n");
      });
      await context.route(/^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//, async route => {
        const request = route.request(), entry = fonts.get(request.url());
        if (request.method() !== 'GET' || !entry || !['stylesheet', 'font'].includes(request.resourceType())) return route.fallback();
        await route.fulfill({ status: 200, contentType: entry.contentType, body: entry.body });
        fs.appendFileSync(process.env.FONT_CACHE_USE_RECEIPT, JSON.stringify({ contextId: id, url: entry.url, sha256: entry.sha256, manifestSha256: hash(manifestBytes), resourceType: request.resourceType() }) + '\n');
      });
      return context;
    };
    return browser;
  };
}
