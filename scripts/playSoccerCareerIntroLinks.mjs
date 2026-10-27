/* Remote-only raw snapshot and actual client guide proof, including trailing slash routes. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.SEO_INTRO_ARTIFACTS || path.join(ROOT, 'soccer-intro-artifacts'));
const folder = path.join(OUT, 'browser'); fs.mkdirSync(folder, { recursive: true });
const contract = JSON.parse(fs.readFileSync(path.join(OUT, 'render-contract.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = ['src/components/seo/GameSeoContent.tsx', 'src/data/gameContent/types.ts', 'src/data/gameContent/soccer2.ts', 'public/soccer-career/index.html', 'scripts/data/lastmod.json'];
const held = () => Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const rawFile = path.join(ROOT, 'dist/soccer-career/index.html'), raw = fs.readFileSync(rawFile, 'utf8');
const report = { cases: [], controls: [], destinations: [], sourceBefore: held(), rawSha256: hash(Buffer.from(raw)), forwardedExternalRequests: 0 };
const save = () => fs.writeFileSync(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(OUT, 'font-cache'));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file)); assert.equal(hash(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType, headers: { 'access-control-allow-origin': '*' } }];
}));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); });
});
const BASE = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server not ready: ' + serverLog)), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error('Owned server exited ' + code)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
async function contextFor(profile, row, javaScriptEnabled = true, rawOverride) {
  const context = await browser.newContext({ viewport: profile, javaScriptEnabled, isMobile: profile.width < 600, hasTouch: profile.width < 600,
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.routeWebSocket('**/*', socket => { row.blocked.push({ method: 'WEBSOCKET', url: socket.url() }); socket.close(); });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE) {
      if (!javaScriptEnabled && /\.m?js$/.test(url.pathname)) return route.abort();
      if (rawOverride && ['/soccer-career', '/soccer-career/'].includes(url.pathname)) return route.fulfill({ contentType: 'text/html', body: rawOverride });
      if (!['GET', 'HEAD'].includes(request.method())) { row.blocked.push({ method: request.method(), url: url.href }); return route.fulfill({ status: 405, body: '' }); }
      return route.continue();
    }
    if (request.method() === 'GET' && fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
    if (/\.supabase\.co$/.test(url.hostname)) {
      row.emptyBackendFixtures.push({ method: request.method(), path: url.pathname });
      if (url.pathname === '/auth/v1/user') return route.fulfill({ status: 401, json: { message: 'No session' } });
      if (url.pathname.startsWith('/rest/v1/') && (['GET', 'HEAD'].includes(request.method()) || url.pathname.startsWith('/rest/v1/rpc/'))) {
        return route.fulfill({ status: 200, json: [], headers: { 'content-range': '*/0' } });
      }
    }
    row.blocked.push({ method: request.method(), url: url.href }); return route.fulfill({ status: 204, body: '' });
  });
  return context;
}
const normalized = value => value.replace(/\s+/g, ' ').trim();
function anchors(value) {
  for (const target of contract.targets) {
    const found = value.targets.find(item => item.href === target.href);
    assert(found && found.count === 1, 'Exactly one crawlable anchor: ' + target.href);
    assert.equal(found.text, target.text, 'Exact anchor text');
    assert.equal(normalized(found.paragraph), normalized(contract.intro[target.paragraph]), 'Complete existing intro paragraph');
  }
}
async function observe(page, client) {
  return page.evaluate(({ client, targets }) => {
    const root = document.querySelector(client ? 'section[data-seo-content="ready"] article > div' : '#dukb-snapshot');
    if (!root) throw new Error('Real guide root absent');
    return { targets: targets.map(target => {
      const links = [...root.querySelectorAll('a')].filter(a => a.getAttribute('href') === target.href), a = links[0];
      return { href: target.href, count: links.length, text: a?.textContent, paragraph: a?.closest('p')?.textContent, outerHTML: a?.outerHTML,
        rects: a ? [...a.getClientRects()].map(rect => ({ x: rect.x, right: rect.right, width: rect.width, height: rect.height })) : [],
        parent: a ? (() => { const p = a.closest('p'), r = p.getBoundingClientRect(); return { x: r.x, right: r.right, clientWidth: p.clientWidth, scrollWidth: p.scrollWidth }; })() : null };
    }), scrollWidth: document.documentElement.scrollWidth, width: innerWidth,
      canonical: document.querySelector('link[rel="canonical"]')?.href, robots: [...document.querySelectorAll('meta[name="robots"]')].map(el => el.content) };
  }, { client, targets: contract.targets });
}
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  for (const profile of [{ width: 320, height: 780 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    for (const routePath of ['/soccer-career', '/soccer-career/']) {
      for (const client of [false, true]) {
        const id = profile.width + (routePath.endsWith('/') ? '-slash' : '-plain') + (client ? '-client' : '-raw');
        const row = { id, client, routePath, ...profile, errors: [], blocked: [], emptyBackendFixtures: [] }; report.cases.push(row);
        const context = await contextFor(profile, row, client); const page = await context.newPage();
        page.on('pageerror', error => row.errors.push(String(error)));
        try {
          await page.goto(BASE + routePath, { waitUntil: 'domcontentloaded' });
          if (client) {
            await answerConsent(page);
            await page.locator('section[data-seo-content="ready"] article > div').first().waitFor();
            await page.evaluate(() => document.fonts.ready);
            row.fonts = await page.evaluate(() => ['Inter', 'Space Grotesk'].map(name => ({ name,
              loaded: [...document.fonts].some(face => face.family.includes(name) && face.status === 'loaded') })));
            assert(row.fonts.every(font => font.loaded), 'Production guide fonts loaded');
          }
          row.healthy = await observe(page, client); anchors(row.healthy);
          assert.equal(row.healthy.canonical, 'https://douknowball.com/soccer-career');
          assert(!row.healthy.robots.some(value => /\bnoindex\b/i.test(value)));
          if (client) {
            assert(row.healthy.scrollWidth <= profile.width + 1, 'Client page has no horizontal overflow');
            for (const item of row.healthy.targets) {
              assert(item.rects.length && item.rects.every(rect => rect.width > 0 && rect.height > 0 && rect.x >= item.parent.x - 0.75 && rect.right <= item.parent.right + 0.75), 'Actual inline link boxes stay in their paragraph');
              assert(item.parent.scrollWidth <= item.parent.clientWidth + 1, 'Complete paragraph stays contained');
            }
            const intro = page.locator('section[data-seo-content="ready"] article > div').first();
            const first = intro.locator('a[href="/wonderkid-factory"]'), second = intro.locator('a[href="/contract-chaos"]');
            await first.focus(); await page.keyboard.press('Tab'); assert(await second.evaluate(el => el === document.activeElement), 'Both anchors are in native keyboard order');
            await intro.scrollIntoViewIfNeeded();
            await intro.screenshot({ path: path.join(folder, id + '.png'), animations: 'disabled' });
            fs.writeFileSync(path.join(folder, id + '.html'), await intro.innerHTML());
            await first.evaluate(a => a.replaceWith(document.createTextNode(a.textContent)));
            row.flattened = await observe(page, true); assert.throws(() => anchors(row.flattened), /crawlable anchor/);
            assert.equal(hash(fs.readFileSync(rawFile)), report.rawSha256, 'Client fault leaves the raw snapshot untouched');
            await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('section[data-seo-content="ready"] article > div').first().waitFor();
            row.restored = await observe(page, true); anchors(row.restored); report.controls.push(id + '-client-flatten');
          } else if (profile.width === 320 && !routePath.endsWith('/')) {
            const literal = row.healthy.targets[0].outerHTML;
            assert.equal(raw.split(literal).length - 1, 1, 'Physical raw anchor fault has one real byte anchor');
            const changed = raw.replace(literal, contract.targets[0].text); assert.notEqual(changed, raw);
            fs.writeFileSync(path.join(folder, 'raw-flatten-control.html'), changed);
            row.rawControl = { beforeHash: report.rawSha256, changedHash: hash(Buffer.from(changed)), anchor: literal };
            const controlRow = { blocked: [], emptyBackendFixtures: [] }, control = await contextFor(profile, controlRow, false, changed);
            try {
              const controlled = await control.newPage(); await controlled.goto(BASE + routePath, { waitUntil: 'domcontentloaded' });
              row.rawControl.observation = await observe(controlled, false); assert.throws(() => anchors(row.rawControl.observation), /crawlable anchor/);
            } finally { await control.close(); }
            await page.reload({ waitUntil: 'domcontentloaded' }); anchors(await observe(page, false)); report.controls.push('raw-flatten-and-restore');
          }
          assert.deepEqual(row.errors, []); assert.deepEqual(row.blocked, []); row.passed = true;
        } catch (error) { row.error = String(error.stack || error); await page.screenshot({ path: path.join(folder, id + '-failure.png'), fullPage: true }).catch(() => {}); }
        finally { await context.close(); save(); }
      }
    }
  }
  for (const target of contract.targets) {
    const row = { href: target.href, blocked: [], emptyBackendFixtures: [] }, context = await contextFor({ width: 390, height: 844 }, row);
    try {
      const page = await context.newPage(); await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' }); await answerConsent(page);
      const intro = page.locator('section[data-seo-content="ready"] article > div').first(); await intro.waitFor();
      await intro.locator('a[href="' + target.href + '"]').click(); await page.waitForURL(BASE + target.href);
      await page.locator('section[data-seo-content="ready"] article').waitFor();
      row.headings = await page.locator('h1,h2').allTextContents();
      assert(row.headings.some(text => text.toLowerCase().includes(target.text.toLowerCase())), 'Real destination heading matches the linked game');
      assert.deepEqual(row.blocked, []); row.passed = true; report.destinations.push(row);
    } finally { await context.close(); }
  }
  assert.equal(report.cases.length, 12); assert(report.cases.every(row => row.passed), 'Every raw/client route and viewport passes');
  assert.equal(report.controls.length, 7); assert.equal(report.destinations.length, 2);
} finally {
  await browser?.close(); server.kill(); report.sourceAfter = held();
  report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); save();
}
assert(report.sourceHeld, 'Raw/client proof changes no source, public snapshot or ledger byte');
console.log('Soccer Career intro browser: 12 raw/client cases, 2 real targets, 7 effective controls, source held; no external forwarding.');
