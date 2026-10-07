/* Actual built Home, failed real search chunk, explicit offline-safe reload. Remote CI only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.GITHUB_ACTIONS, 'Home search verification runs only in remote GitHub Actions');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'home-search-recovery-artifacts');
const OUT = path.join(ART, 'native');
const CACHE = path.resolve(process.env.HOME_SEARCH_RECOVERY_ASSET_CACHE || path.join(ART, 'asset-cache/manifest.json'));
const NOW = Date.parse('2026-10-07T12:00:00.000Z');
const QUERY = 'soccer career';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sheets = [...template.matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"\s+rel="stylesheet"/g)].map(m => new URL(m[1]).href);
assert.equal(sheets.length, 1);
const { build } = await import('esbuild');
if (process.argv.includes('--prefetch-assets-only')) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const entries = [];
  const fetchAsset = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(url).origin));
    const r = await fetch(url); assert.equal(r.status, 200);
    const body = Buffer.from(await r.arrayBuffer()), file = hash(url); fs.writeFileSync(path.join(path.dirname(CACHE), file), body);
    entries.push({ url, file, sha256: hash(body), bytes: body.length, contentType: r.headers.get('content-type') }); return body;
  };
  const css = (await fetchAsset(sheets[0])).toString('utf8');
  for (const url of new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/g)].map(m => m[1]))) await fetchAsset(url);
  const bundle = await build({ absWorkingDir: ROOT, stdin: { contents: "export { POLLS } from './src/data/pollFixtures'; export { FLAG_EMOJI_RE, flagEmojiToIso } from './src/lib/flagUtils';", resolveDir: ROOT }, platform: 'node', format: 'esm', bundle: true, write: false, logLevel: 'silent', metafile: true });
  const helper = path.join(path.dirname(CACHE), 'poll-flag-sources.mjs'); fs.writeFileSync(helper, bundle.outputFiles[0].contents);
  fs.writeFileSync(path.join(path.dirname(CACHE), 'poll-flag-metafile.json'), JSON.stringify(bundle.metafile, null, 2));
  const { POLLS, FLAG_EMOJI_RE, flagEmojiToIso } = await import(pathToFileURL(helper).href);
  const codes = new Set([...JSON.stringify(POLLS).matchAll(FLAG_EMOJI_RE)].map(m => flagEmojiToIso(m[0])).filter(c => c && c !== 'gb-eng'));
  for (const code of codes) for (const width of [40, 80]) await fetchAsset(`https://flagcdn.com/w${width}/${code}.png`);
  fs.writeFileSync(CACHE, JSON.stringify(entries, null, 2));
  console.log(`Home search: ${entries.length} actual template font and baked-poll flag payloads cached.`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build the actual application first');
const chunks = fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(name => /^siteSearch-[\w-]+\.js$/.test(name));
assert.equal(chunks.length, 1, 'Exactly one actual lazy siteSearch chunk');
const CHUNK = `/assets/${chunks[0]}`;
const freshSource = fs.readFileSync(path.join(ROOT, 'src/lib/freshBuild.ts'), 'utf8');
const staleKeys = [...freshSource.matchAll(/const STALE_KEY = '([^']+)';/g)]; assert.equal(staleKeys.length, 1);
const STALE_KEY = staleKeys[0][1];
const serviceOrigin = new URL(fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/export const SUPABASE_URL = "([^"]+)";/)[1]).origin;
const entries = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const assets = new Map(entries.map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(path.dirname(CACHE), entry.file));
  assert.equal(hash(body), entry.sha256); assert.equal(body.length, entry.bytes);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(assets.has(sheets[0]));
function hashes(directories, files = []) {
  const out = {}; const walk = rel => { for (const item of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) { const file = `${rel}/${item.name}`; if (item.isDirectory()) walk(file); else if (item.isFile()) out[file] = hash(fs.readFileSync(path.join(ROOT, file))); } };
  directories.forEach(walk); files.forEach(file => { out[file] = hash(fs.readFileSync(path.join(ROOT, file))); }); return out;
}
const sourceHashes = () => hashes(['src'], ['scripts/playHomeSearchRecovery1088.mjs', 'scripts/simHomeSearchRecovery.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'index.html', 'package.json', 'package-lock.json']);
const cacheHashes = () => Object.fromEntries([path.basename(CACHE), ...entries.map(e => e.file)].map(file => [file, hash(fs.readFileSync(path.join(path.dirname(CACHE), file)))]));
const report = { complete: false, scope: 'Four actual built Home profiles, each with healthy search and failed-import recovery through actual offline/online explicit reload.',
  limits: ['Fresh signed-out browser fixtures; no saved career is played, queried, completed or changed.', 'Known public read endpoints return explicit locally empty results, so popularity uses its actual curated fallback.', 'No real network read, write, score, analytics or socket is forwarded. The stale-chunk automatic retry is already exhausted by the actual session guard fixture.'],
  sourceBefore: sourceHashes(), buildBefore: hashes(['dist']), cacheBefore: cacheHashes(), chunk: { path: CHUNK, sha256: hash(fs.readFileSync(path.join(ROOT, 'dist', CHUNK))) }, staleKey: STALE_KEY,
  cases: [], controls: [], unexpected: [], sockets: [] };
const save = () => write('report.json', report); save();
const bundle = await build({ absWorkingDir: ROOT, stdin: { contents: "export * from './src/lib/siteSearch';", resolveDir: ROOT }, platform: 'node', format: 'esm', bundle: true, write: false, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent', metafile: true });
const oraclePath = path.join(OUT, 'search-oracle.mjs'); fs.writeFileSync(oraclePath, bundle.outputFiles[0].contents); write('search-oracle-metafile.json', bundle.metafile);
const oracle = await import(pathToFileURL(oraclePath).href);
const expected = oracle.searchSite(QUERY).map(r => ({ href: r.game.path, label: r.game.label })); assert(expected.length > 0);
write('search-expected.json', { query: QUERY, results: expected });
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Owned server did not start: ${serverLog}`)), 15000); server.once('error', e => { clearTimeout(timer); reject(e); }); server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}`)); }); server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); });
const initialStorage = { 'cookie-consent': 'essential', 'dukb-guest-handle': 'TidyAnchor-17', 'dukb-game-picks-v1': '[]', 'home-search-recovery-sentinel': 'unchanged bytes 1088' };
async function snapshot(page) {
  return page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()), draws: window.__homeSearchAudit.draws, writes: structuredClone(window.__homeSearchAudit.writes), now: Date.now(), doc: performance.timeOrigin, scrollY, input: document.querySelector('input[aria-label="Search games"]')?.value, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 100) }));
}
async function fonts(page) {
  const rows = await page.evaluate(async () => { await document.fonts.ready; const out = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) { const faces = await document.fonts.load(`${weight} 16px "${family}"`); out.push({ family, weight, faces: faces.map(f => ({ family: f.family, weight: f.weight, status: f.status })) }); } return out; });
  assert(rows.every(r => r.faces.length && r.faces.every(f => f.status === 'loaded' && f.family.replaceAll('"', '') === r.family && f.weight === String(r.weight))), 'Eight actual font faces load'); return rows;
}
async function finite(page) {
  let watchdog;
  await Promise.race([
    page.evaluate(async () => { const pending = document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity && a.playState !== 'finished'); await Promise.all(pending.map(a => a.finished)); }),
    new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('Finite Home animations did not finish naturally')), 5000); }),
  ]).finally(() => clearTimeout(watchdog));
}
async function measure(locator, width, height) {
  return locator.evaluate((node, viewport) => {
    const box = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
    const text = [...node.querySelectorAll('h2,p,button')].map(el => { const range = document.createRange(); range.selectNodeContents(el); const clips = []; for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (/hidden|clip|auto|scroll/.test(s.overflowX + s.overflowY)) clips.push({ box: box(n), x: s.overflowX !== 'visible', y: s.overflowY !== 'visible' }); } return { text: el.textContent.trim(), font: parseFloat(getComputedStyle(el).fontSize), rects: [...range.getClientRects()].filter(r => r.width && r.height).map(r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom, hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) })), clips }; });
    const buttons = [...node.querySelectorAll('button')].map(el => { const r = box(el); return { ...r, text: el.textContent.trim(), hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }; });
    return { box: box(node), text, buttons, html: node.outerHTML, viewport, documentWidth: document.documentElement.scrollWidth, scrollY };
  }, { width, height });
}
function checkGeometry(value) {
  const v = value.viewport, inside = b => b.x >= -1 && b.right <= v.width + 1 && b.y >= -1 && b.bottom <= v.height + 1;
  assert(inside(value.box), 'Recovery panel is visible in the physical viewport');
  assert(value.documentWidth <= v.width + 1, 'Recovery has no document horizontal overflow');
  assert(value.buttons.every(b => b.width >= 44 && b.height >= 44 && b.hit && inside(b)), 'Recovery controls have visible 44px hit targets');
  assert(value.text.every(t => t.font >= 12), 'Recovery text is at least 12px');
  assert(value.text.every(t => t.rects.every(r => inside(r) && t.clips.every(c => (!c.x || (r.x >= c.box.x - 1 && r.right <= c.box.right + 1)) && (!c.y || (r.y >= c.box.y - 1 && r.bottom <= c.box.bottom + 1))))), 'All wrapped recovery text is visible without ancestor clipping');
  assert(value.text.every(t => t.rects.length && t.rects.every(r => r.hit)), 'Recovery text is not covered by another element');
}
function held(before, after, rng = true) {
  assert.deepEqual(after.local, before.local, 'Complete local storage bytes held'); assert.deepEqual(after.session, before.session, 'Complete session storage bytes held'); assert.deepEqual(after.writes, before.writes, 'Search actions make no storage write');
  assert.equal(after.now, before.now); if (rng) assert.equal(after.draws, before.draws, 'Search action consumes no RNG');
}
async function catalog(page) { return page.locator('[data-home-stage] [data-stage-card]').evaluateAll(nodes => nodes.map(n => ({ href: n.getAttribute('href'), text: n.textContent.trim() }))); }
async function accountAsks(page) {
  return page.evaluate(() => {
    const first = document.querySelector('[data-home-stage] [data-stage-card]'), r = first.getBoundingClientRect();
    const firstTop = r.y + scrollY, asks = [];
    for (const el of document.querySelectorAll('a,button,span,p')) {
      if (el.querySelector('a,button,span,p')) continue;
      const text = (el.innerText || el.textContent || '').trim(); if (!/sign ?up|create a free account|make a free (account|one)|log ?in/i.test(text)) continue;
      const b = el.getBoundingClientRect(), style = getComputedStyle(el), y = b.y + scrollY;
      if (b.width <= 0 || b.height <= 0 || style.visibility !== 'visible' || Number(style.opacity) === 0 || y < 0 || y >= firstTop) continue;
      asks.push({ text, y, bucket: Math.round(y / 24) });
    }
    return { first: { x: r.x, y: r.y, width: r.width, height: r.height }, asks, places: [...new Set(asks.map(a => a.bucket))].sort((a, b) => a - b), scrollY, documentWidth: document.documentElement.scrollWidth };
  });
}
function checkAsks(value) { assert(value.places.length <= 2, 'At most two account prompt places appear before the first game'); }
async function accountControl(page, row) {
  const before = await accountAsks(page); row.healthy.accountAsks = before; save(); checkAsks(before);
  assert.equal(await page.locator('[data-home-account-control]').count(), 0);
  const injected = await page.evaluate(() => {
    const top = document.querySelector('[data-home-stage] [data-stage-card]').getBoundingClientRect().y + scrollY;
    const node = document.createElement('div'); node.setAttribute('data-home-account-control', '');
    for (let i = 0; i < 3; i++) { const ask = document.createElement('p'); ask.textContent = 'Create a free account'; ask.style.cssText = `position:absolute;left:8px;top:${top - 28 * (i + 1)}px;margin:0;font-size:12px;line-height:16px;z-index:99999`; node.append(ask); }
    document.body.append(node); return node.outerHTML;
  });
  const fault = await accountAsks(page), screenshot = `${row.width}-account-asks-fault.png`; await page.screenshot({ path: path.join(OUT, screenshot) });
  let rejection; try { checkAsks(fault); } catch (error) { rejection = { name: error.name, message: error.message }; }
  await page.locator('[data-home-account-control]').evaluate(node => node.remove()); const restored = await accountAsks(page);
  report.controls.push({ width: row.width, name: 'account-asks', before, fault, restored, injected, rejection, screenshot }); save();
  assert.notDeepEqual(fault, before); assert.equal(rejection?.name, 'AssertionError'); assert.equal(rejection?.message, 'At most two account prompt places appear before the first game');
  assert.equal(await page.locator('[data-home-account-control]').count(), 0); assert.deepEqual(restored, before, 'Account control restores exact prompt and first-tile geometry'); checkAsks(restored);
}
async function results(page) { return page.locator('[data-home-game-card] > a').evaluateAll(nodes => nodes.map(n => ({ href: n.getAttribute('href'), label: n.querySelector('h3')?.textContent.trim() }))); }
async function act(page, locator, touch) { if (touch) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } }
async function input(page, text, touch) { const field = page.getByRole('textbox', { name: 'Search games', exact: true }); if (touch) await field.tap(); else await field.focus(); await page.keyboard.type(text); }
async function domControls(page, row) {
  const panel = page.locator('[data-home-search-unavailable]');
  for (const [name, selector, css, message] of [
    ['small-text', 'p', 'font-size:8px', 'Recovery text is at least 12px'],
    ['small-target', 'button', 'height:10px;min-height:0;padding-top:0;padding-bottom:0', 'Recovery controls have visible 44px hit targets'],
    ['offscreen', null, 'transform:translateY(1000px)', 'Recovery panel is visible in the physical viewport'],
  ]) {
    const locator = selector ? panel.locator(selector).first() : panel, before = await measure(panel, row.width, row.height);
    const originalStyle = await locator.getAttribute('style'); await locator.evaluate((node, value) => node.setAttribute('style', value), css);
    const fault = await measure(panel, row.width, row.height); const file = `${row.width}-${name}-fault.png`; await page.screenshot({ path: path.join(OUT, file) });
    let rejection; try { checkGeometry(fault); } catch (error) { rejection = { name: error.name, message: error.message }; }
    await locator.evaluate((node, value) => { if (value === null) node.removeAttribute('style'); else node.setAttribute('style', value); }, originalStyle);
    const restored = await measure(panel, row.width, row.height); const control = { width: row.width, name, before, fault, restored, rejection, screenshot: file }; report.controls.push(control); save();
    assert.notDeepEqual(fault, before, 'DOM control changes its actual measured state'); assert.equal(rejection?.name, 'AssertionError'); assert.equal(rejection?.message, message); assert.deepEqual(restored, before, 'Control restores exact HTML and geometry'); checkGeometry(restored);
  }
  const before = await measure(panel, row.width, row.height); assert.equal(await panel.locator('[data-home-text-control]').count(), 0);
  await panel.evaluate(node => {
    const p = node.querySelector('p'), r = p.getBoundingClientRect(), cover = document.createElement('div'); cover.setAttribute('data-home-text-control', '');
    cover.style.cssText = `position:fixed;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:#888`; node.append(cover);
  });
  const fault = await measure(panel, row.width, row.height), screenshot = `${row.width}-text-covered-fault.png`; await page.screenshot({ path: path.join(OUT, screenshot) });
  let rejection; try { checkGeometry(fault); } catch (error) { rejection = { name: error.name, message: error.message }; }
  await panel.locator('[data-home-text-control]').evaluate(node => node.remove()); const restored = await measure(panel, row.width, row.height);
  report.controls.push({ width: row.width, name: 'text-covered', before, fault, restored, rejection, screenshot }); save();
  assert.notDeepEqual(fault, before); assert.equal(rejection?.name, 'AssertionError'); assert.equal(rejection?.message, 'Recovery text is not covered by another element');
  assert.deepEqual(restored, before, 'Text cover restores exact HTML and geometry'); checkGeometry(restored);
}
try {
  await ready; browser = await chromium.launch({ headless: false });
  for (const [width, height, reduced] of [[320, 780, true], [390, 844, false], [430, 932, false], [1440, 960, false]]) {
    const row = { width, height, reduced, complete: false, healthy: {}, recovery: {}, documents: [], chunkRequests: [], reads: [], assetResponses: [], errors: [], console: [], requests: [], inputs: [], snapshots: [], screenshots: [] };
    report.cases.push(row); save(); let releaseChunk, releaseDocument, documentRequested; let rejectChunk = false, blockChunk = false, holdDocument = false;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, isMobile: width < 1000, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: width === 320 ? 'dark' : 'light', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: Object.entries({ ...initialStorage, 'dukb-theme': width === 320 ? 'dark' : 'light' }).map(([name, value]) => ({ name, value })) }] } });
    await context.addInitScript(({ now, staleKey }) => {
      sessionStorage.setItem(staleKey, '1');
      const OriginalDate = Date; window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      const a = window.__homeSearchAudit = { draws: 0, seed: 1088, writes: [], input: [] };
      Math.random = () => { a.draws++; a.seed = (Math.imul(a.seed, 1664525) + 1013904223) >>> 0; return a.seed / 4294967296; };
      for (const method of ['setItem', 'removeItem', 'clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function(...args) { a.writes.push({ local: this === localStorage, method, args }); return original.apply(this, args); }; }
      for (const type of ['click', 'input', 'keydown', 'pointerdown']) document.addEventListener(type, e => a.input.push({ type, trusted: e.isTrusted, text: e.target?.textContent?.trim().slice(0, 80), key: e.key, t: performance.now() }), true);
    }, { now: NOW, staleKey: STALE_KEY });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()), record = { method: req.method(), url: url.href, type: req.resourceType() }; row.requests.push(record);
      if (url.origin === BASE && ['GET', 'HEAD'].includes(req.method())) {
        if (req.isNavigationRequest() && req.frame().parentFrame() === null) {
          row.documents.push(url.href);
          if (holdDocument) { documentRequested(); await new Promise(resolve => { releaseDocument = resolve; }); }
        }
        if (url.pathname === CHUNK) { row.chunkRequests.push({ ...record, blocked: blockChunk }); if (blockChunk) { await new Promise(resolve => { releaseChunk = resolve; }); if (rejectChunk) return route.abort('failed'); } }
        return route.continue();
      }
      if (req.method() === 'GET' && assets.has(url.href)) { const asset = assets.get(url.href); row.assetResponses.push({ url: url.href, sha256: hash(asset.body), bytes: asset.body.length }); return route.fulfill({ status: 200, ...asset }); }
      if (url.origin === serviceOrigin && req.method() === 'GET' && ['/rest/v1/live_scores', '/rest/v1/daily_polls', '/rest/v1/poll_votes'].includes(url.pathname)) { row.reads.push(record); return route.fulfill({ status: 200, contentType: 'application/json', headers: { date: new Date(NOW).toUTCString() }, body: '[]' }); }
      if (url.origin === serviceOrigin && req.method() === 'POST' && url.pathname === '/rest/v1/rpc/most_played_today') { assert.deepEqual(req.postDataJSON(), { p_min: 3, p_limit: 3 }); row.reads.push({ ...record, body: req.postDataJSON() }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
      report.unexpected.push(record); return route.abort();
    });
    await context.routeWebSocket('**/*', socket => { report.sockets.push(socket.url()); socket.close(); });
    const page = await context.newPage(); page.on('pageerror', error => row.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') row.console.push({ text: message.text(), location: message.location() }); });
    const snap = async name => { const value = await snapshot(page); row.snapshots.push({ name, ...value }); save(); return value; };
    const shot = async name => { const file = `${width}-${name}.png`; await page.screenshot({ path: path.join(OUT, file) }); row.screenshots.push(file); };
    try {
      await page.goto(BASE, { waitUntil: 'load' }); await page.locator('[data-home-stage] [data-stage-card]').first().waitFor(); row.healthy.fonts = await fonts(page); await finite(page);
      row.healthy.catalog = await catalog(page); assert.equal(row.healthy.catalog.length, 4);
      row.healthy.firstTile = await page.locator('[data-stage-card]').first().boundingBox(); assert(row.healthy.firstTile.y <= 430 && row.healthy.firstTile.height >= 44, 'Actual healthy first playable tile stays at or above y430');
      await accountControl(page, row);
      assert.equal(row.chunkRequests.length, 0, 'Search stays lazy before interaction');
      const healthyBefore = await snap('healthy-before'); await shot('healthy-home'); await input(page, QUERY, width < 1000);
      await page.waitForFunction(count => document.querySelectorAll('[data-home-game-card] > a').length === count, expected.length); await finite(page);
      row.healthy.results = await results(page); assert.deepEqual(row.healthy.results, expected, 'Healthy built ranking equals unchanged source engine');
      const healthyAfter = await snap('healthy-search'); held(healthyBefore, healthyAfter); await shot('healthy-results');
      row.inputs.push(...await page.evaluate(() => window.__homeSearchAudit.input));
      // A fresh document clears the browser module cache while preserving the exact storage fixture.
      blockChunk = true; rejectChunk = true; await page.reload({ waitUntil: 'load' }); await page.locator('[data-home-stage]').waitFor(); row.recovery.fonts = await fonts(page); await finite(page);
      const before = await snap('failure-document-before'), docsBefore = row.documents.length; await input(page, QUERY, width < 1000);
      await page.locator('#dukb-main div[aria-busy="true"]').waitFor(); row.recovery.pending = await snap('pending');
      assert.equal(await page.locator('[data-home-search-unavailable]').count(), 0); assert.equal(await page.getByText(/^No games found/).count(), 0, 'Pending is never false empty results');
      assert(releaseChunk, 'Actual lazy chunk request is held'); releaseChunk();
      await page.getByRole('heading', { name: 'Search could not load', exact: true }).waitFor(); await finite(page);
      row.recovery.failure = await snap('failed'); held(before, row.recovery.failure);
      assert(Math.abs(row.recovery.failure.scrollY - before.scrollY) <= 1, 'Search failure preserves viewport within1px');
      assert.equal(row.documents.length, docsBefore, 'Exhausted stale-chunk guard prevents an ambient reload');
      assert.equal(await page.locator('#dukb-main div[aria-busy="true"]').count(), 0, 'Failure clears busy'); assert.equal(await page.getByText(/^No games found/).count(), 0, 'Failure is not an empty result');
      row.recovery.geometry = await measure(page.locator('[data-home-search-unavailable]'), width, height); save(); checkGeometry(row.recovery.geometry); await shot('recovery');
      await domControls(page, row);
      await act(page, page.getByRole('button', { name: 'Back to games', exact: true }), width < 1000); await page.locator('[data-home-stage]').waitFor(); await finite(page);
      row.recovery.back = await snap('back'); held(before, row.recovery.back); assert.equal(row.recovery.back.input, ''); assert.equal(row.recovery.back.focus, 'Search games'); assert(Math.abs(row.recovery.back.scrollY - row.recovery.failure.scrollY) <= 1, 'Back preserves viewport within1px');
      assert.deepEqual(await catalog(page), row.healthy.catalog, 'Back restores unchanged real flagship catalog');
      const requestsBefore = row.chunkRequests.length; await input(page, QUERY, width < 1000); await page.locator('[data-home-search-unavailable]').waitFor(); await finite(page);
      row.recovery.reentry = await snap('reentry'); held(before, row.recovery.reentry); assert.equal(row.chunkRequests.length, requestsBefore, 'Terminal failure never retries a cached failed import');
      await context.setOffline(true); const offlineBefore = await snap('offline-before');
      await act(page, page.getByRole('button', { name: 'Reload page', exact: true }), width < 1000);
      await page.waitForTimeout(400); row.recovery.offline = await snap('offline-after'); held(offlineBefore, row.recovery.offline); assert.equal(row.recovery.offline.doc, offlineBefore.doc, 'Offline reload keeps the current document'); assert.equal(row.documents.length, docsBefore); await shot('offline-reload-held');
      await context.setOffline(false); blockChunk = false; rejectChunk = false;
      const savedBeforeReload = await snap('before-explicit-reload');
      // Hold only the requested document response long enough to retain the old
      // document's real trusted click before navigation destroys its event log.
      holdDocument = true; const navigationStarted = new Promise(resolve => { documentRequested = resolve; });
      const activation = act(page, page.getByRole('button', { name: 'Reload page', exact: true }), width < 1000).catch(error => {
        row.recovery.activationError = { name: error.name, message: error.message }; return error;
      });
      let watchdog; await Promise.race([navigationStarted, new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('Explicit reload did not request a document')), 12000); })]).finally(() => clearTimeout(watchdog));
      row.recovery.reloadDeparture = await snap('explicit-reload-before-response'); held(savedBeforeReload, row.recovery.reloadDeparture);
      row.inputs.push(...await page.evaluate(() => window.__homeSearchAudit.input));
      releaseDocument(); holdDocument = false; const activationError = await activation; if (activationError) throw activationError;
      await page.waitForLoadState('domcontentloaded');
      await page.locator('[data-home-stage]').waitFor(); row.recovery.reloadFonts = await fonts(page); await finite(page); const reloaded = await snap('reloaded');
      assert.notEqual(reloaded.doc, savedBeforeReload.doc, 'Trusted explicit reload creates a new document'); assert.equal(row.documents.length, docsBefore + 1); assert.equal(reloaded.input, ''); assert.deepEqual(reloaded.local, savedBeforeReload.local); assert.deepEqual(reloaded.session, savedBeforeReload.session); assert.deepEqual(savedBeforeReload.writes, []); assert.deepEqual(reloaded.writes, []);
      assert.equal(await page.locator('[data-home-search-unavailable]').count(), 0); await input(page, QUERY, width < 1000);
      await page.waitForFunction(count => document.querySelectorAll('[data-home-game-card] > a').length === count, expected.length); await finite(page);
      row.recovery.resultsAfterReload = await results(page); assert.deepEqual(row.recovery.resultsAfterReload, expected); held(reloaded, await snap('reload-search')); await shot('reload-search');
      row.inputs.push(...await page.evaluate(() => window.__homeSearchAudit.input));
      assert.equal(row.inputs.filter(e => e.type === 'click' && e.text === 'Reload page' && e.trusted).length, 2, 'Actual offline and online reload actions are trusted');
      assert(row.inputs.some(e => e.type === 'input' && e.trusted)); assert.deepEqual(row.errors, []);
      assert(row.console.every(e => e.location.url === `${BASE}${CHUNK}` && /Failed to load resource/.test(e.text)), 'Only the intentionally rejected search chunk logs a resource error');
      row.complete = true; save();
    } finally { releaseChunk?.(); releaseDocument?.(); await context.close(); save(); }
  }
  assert.deepEqual(report.unexpected, []); assert.deepEqual(report.sockets, []); assert.equal(report.controls.length, 20); report.complete = true;
} catch (error) { report.error = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  await browser?.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  report.sourceAfter = sourceHashes(); report.buildAfter = hashes(['dist']); report.cacheAfter = cacheHashes();
  try { assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore); }
  catch (error) { report.complete = false; report.sourceHoldError = { name: error.name, message: error.message }; }
  save();
}
console.log(`Home search native: ${report.complete ? 'PASS' : 'FAIL'}, ${report.cases.filter(c => c.complete).length}/4 completed route journeys.`);
console.log(`Effective restored DOM controls: ${report.controls.length}/20; unexpected requests: ${report.unexpected.length}.`);
console.log(`Source/build/cache held: ${!report.sourceHoldError}; artifact path: ${OUT}`);
console.log('Scope: actual built signed-out Home with explicit locally fulfilled public reads and real cached fonts/flags; no gameplay or production forwarding.');
process.exitCode = report.complete ? 0 : 1;
