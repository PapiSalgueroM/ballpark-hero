'use strict';
// Remote browser I/O boundary. Original game and harness predicates stay untouched.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const pw = require(path.join(process.cwd(), 'node_modules/playwright-core'));
const originalLaunch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async options => {
  const support = await import(pathToFileURL(path.join(process.cwd(), 'scripts/qa/siteMenuNavigationSupport.mjs')).href);
  const fonts = support.loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
  const browser = await originalLaunch(options);
  const originalContext = browser.newContext.bind(browser);
  let sequence = 0;
  browser.newContext = async options => {
    const context = await originalContext(options), id = ++sequence;
    const directory = process.env.CHROME_RECIPE_OUT;
    const emit = value => { if (directory) fs.appendFileSync(path.join(directory, 'browser-io.jsonl'), JSON.stringify({ context: id, ...value }) + '\n'); };
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && !url.username && !url.password) {
        if (!['GET', 'HEAD'].includes(request.method())) { emit({ kind: 'unknown', method: request.method(), url: url.href }); return route.abort('blockedbyclient'); }
        return route.continue();
      }
      const font = fonts.get(url.href);
      if (font && request.method() === 'GET' && ['font', 'stylesheet'].includes(request.resourceType())) {
        emit({ kind: 'prepared-font', url: url.href, sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body });
      }
      const shell = support.shellFixture(request, url);
      if (shell) {
        emit({ kind: 'source-shell-fixture', id: shell.id, url: url.href });
        return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json', ...(shell.date ? { date: shell.date } : {}) }, body: shell.body });
      }
      const flag = url.origin === 'https://flagcdn.com' && !url.username && !url.password && !url.search && !url.hash
        && /^\/(?:w[1-9][0-9]{0,2}\/|h[1-9][0-9]{0,2}\/|[1-9][0-9]{0,2}x[1-9][0-9]{0,2}\/)?[a-z]{2}(?:-[a-z0-9]{1,8})?\.(?:png|webp|svg)$/.test(url.pathname);
      if (flag && request.method() === 'GET' && request.resourceType() === 'image') { emit({ kind: 'local-flag-abort', url: url.href }); return route.abort('blockedbyclient'); }
      emit({ kind: 'unknown', method: request.method(), type: request.resourceType(), url: url.href });
      return route.abort('blockedbyclient');
    });
    const originalPage = context.newPage.bind(context);
    context.newPage = async () => {
      const page = await originalPage();
      const screenshot = page.screenshot.bind(page);
      let rawSequence = 0;
      page.screenshot = async options => {
        if (directory && options && typeof options.path === 'string' && path.resolve(options.path).startsWith(path.resolve(directory) + path.sep)) {
          const raw = await page.evaluate(() => {
            const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
            const describe = node => {
              const r = rect(node), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              return { tag: node.tagName, label: node.getAttribute('aria-label'), text: node.textContent.trim().slice(0, 160), rect: r,
                hit: !!hit && (hit === node || node.contains(hit)), hitNode: hit ? { tag: hit.tagName, label: hit.getAttribute('aria-label'), chrome: !!hit.closest('[data-site-chrome]'), text: hit.textContent.trim().slice(0, 100) } : null };
            };
            return { url: location.href, viewport: { width: innerWidth, height: innerHeight, scrollY, documentWidth: document.documentElement.scrollWidth },
              body: { inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow },
              stageCount: document.querySelectorAll('[data-cm-live-stagebox]').length,
              compactCount: document.querySelectorAll('[data-cm-live-compact]').length,
              nodes: [...document.querySelectorAll('button[aria-label="Back to the club page"],[data-cm-live-score],input[data-timeline],button[aria-label="Open site menu"]')].map(describe) };
          });
          let rawPath = options.path + '.raw.json';
          while (fs.existsSync(rawPath)) rawPath = options.path + '.raw.' + (++rawSequence) + '.json';
          fs.writeFileSync(rawPath, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
        }
        return screenshot(options);
      };
      return page;
    };
    return context;
  };
  return browser;
};
