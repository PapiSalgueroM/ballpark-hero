import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { READING_SOURCE_PINS, runReadingSession } from './scReadingJourney.mjs';
import { inventory } from './scReadingFixtures.mjs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function main() {
  const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0, name); return process.argv[i + 1]; };
  const out = path.resolve(arg('--out')), dir = path.resolve(arg('--fixtures')), dist = path.resolve(arg('--dist'));
  const base = arg('--base-url'), origin = new URL(base).origin, publicMode = process.argv.includes('--public');
  assert(publicMode ? origin === 'https://douknowball.com' : ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname));
  await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
  const manifestPath = path.join(dir, 'manifest.json'), manifestBytes = await fs.readFile(manifestPath), m = JSON.parse(manifestBytes);
  assert.equal(m.schema, 1); assert.deepEqual(m.sourceBefore, m.sourceAfter); assert.deepEqual(m.sourcePins, READING_SOURCE_PINS);
  const checkSource = async () => { for (const [file, digest] of Object.entries(m.sourceAfter)) assert.equal(sha(await fs.readFile(file)), digest, file); };
  await checkSource(); assert.deepEqual(await inventory(dist), m.distBefore); assert.equal(sha(JSON.stringify(m.distBefore)), m.distDigest);
  assert.equal(sha(await fs.readFile(path.join(dir, m.bundle))), m.bundleSHA);
  const api = await import(pathToFileURL(path.join(dir, m.bundle)).href), fixtures = {};
  for (const [name, f] of Object.entries(m.fixtures)) { const raw = await fs.readFile(path.join(dir, f.file), 'utf8'); assert.equal(sha(raw), f.sha256); fixtures[name] = { ...f, raw }; }
  assert.deepEqual(Object.keys(fixtures).sort(), ['cm', 'gk']);
  const { default: pw } = await import('../lib/playwrightLoader.mjs');
  const { answerConsent } = await import('../lib/answerConsent.mjs');
  const refs = new Map(m.distBefore.filter(row => row.file.startsWith('assets/')).map(row => [row.file, row]));
  const known = new Set(['https://flagcdn.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flawuiqbvjobmkfkauhw.supabase.co']);
  const report = { status: 'incomplete', core: m.core, distDigest: m.distDigest, mode: publicMode ? 'public' : 'local', contexts: [], screenshots: [], scope: 'Six controlled CM/GK reading sessions, existing reward, codec reload and spent replay. No full-fleet, natural-career or clock/RNG override claim.' };
  const browser = await pw.chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 1280]) for (const kind of ['cm', 'gk']) {
      const fixture = fixtures[kind], r = { id: 'soccer-reading-' + kind + '-' + width, width, kind, status: 'incomplete', requests: [], responses: [], aborts: [], requestFailures: [], console: [], pageErrors: [], assetBodies: [], assetErrors: [], drains: [] };
      report.contexts.push(r);
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' });
      await context.route('**/*', route => { const q = route.request(), u = new URL(q.url()); if (!['http:', 'https:'].includes(u.protocol) || u.origin === origin && ['GET', 'HEAD'].includes(q.method())) return route.continue(); r.aborts.push({ url: u.href, origin: u.origin, method: q.method() }); return route.abort('blockedbyclient'); });
      await context.routeWebSocket('**/*', async socket => { r.aborts.push({ url: socket.url(), origin: new URL(socket.url()).origin, method: 'WEBSOCKET' }); await socket.close({ code: 1008, reason: 'Source-owned reading QA' }); });
      await context.addInitScript(({ origin, key, raw }) => { if (location.origin !== origin || localStorage.getItem('sc-reading-seeded')) return; localStorage.setItem(key, raw); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); localStorage.setItem('sc-reading-unrelated', 'held'); localStorage.setItem('sc-reading-seeded', '1'); }, { origin, key: fixture.key, raw: fixture.raw });
      const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
      const active = new Set(), reads = new Set(); let last = Date.now();
      const asset = url => { const u = new URL(url); return u.origin === origin && u.pathname.startsWith('/assets/'); };
      const finished = q => { if (active.delete(q)) last = Date.now(); };
      const drain = async phase => { const start = Date.now(); while (active.size || reads.size || Date.now() - last < 100) { assert(Date.now() - start < 20000, 'SC_READING_ASSET_CAPTURE_UNSETTLED:' + phase); await new Promise(resolve => setTimeout(resolve, 25)); } assert.equal(r.assetErrors.length, 0); r.drains.push({ phase, ms: Date.now() - start, active: active.size, reads: reads.size }); };
      page.on('request', q => { r.requests.push({ url: q.url(), method: q.method() }); if (asset(q.url())) { active.add(q); last = Date.now(); } });
      page.on('requestfinished', finished); page.on('requestfailed', q => { r.requestFailures.push({ url: q.url(), failure: q.failure() }); finished(q); });
      page.on('response', response => {
        r.responses.push({ url: response.url(), status: response.status() });
        if (!asset(response.url())) return; last = Date.now();
        const promise = (async () => { try { const file = decodeURIComponent(new URL(response.url()).pathname.slice(1)), ref = refs.get(file); assert(ref, 'Unknown completed asset ' + file); assert.equal(response.status(), 200, file); const bytes = await response.body(); assert.equal(bytes.length, ref.bytes, file); assert.equal(sha(bytes), ref.sha256, file); r.assetBodies.push({ file, bytes: bytes.length, sha256: sha(bytes) }); } catch (error) { r.assetErrors.push({ url: response.url(), error: String(error.stack || error) }); } })();
        reads.add(promise); void promise.finally(() => { reads.delete(promise); last = Date.now(); });
      });
      page.on('console', event => r.console.push({ type: event.type(), text: event.text(), location: event.location() }));
      page.on('pageerror', error => r.pageErrors.push(String(error.stack || error)));
      const originalReload = page.reload.bind(page); page.reload = async (...args) => { await drain('before-reload'); return originalReload(...args); };
      try {
        const run = runReadingSession;
        r.observed = await run({ page, width, base, fixture, engine: api.engine, codec: api.codec,
          save: key => page.evaluate(k => localStorage.getItem(k), key),
          goto: async value => { const u = new URL(value, base); assert.equal(u.origin, origin); await page.goto(u.href, { waitUntil: 'domcontentloaded' }); await answerConsent(page, { wait: 1000 }); },
          photo: async (label, selector) => { assert(!r.screenshot); const target = page.locator(selector); assert.equal(await target.count(), 1); await target.scrollIntoViewIfNeeded(); await frames(page); r.geometry = await target.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x, right: b.right, width: b.width, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }; }); assert(r.geometry.width > 0 && r.geometry.x >= -1 && r.geometry.right <= width + 1); assert(r.geometry.documentWidth <= r.geometry.clientWidth + 1); r.checkpoint = label; r.screenshot = r.id + '.png'; await page.screenshot({ path: path.join(out, r.screenshot) }); report.screenshots.push(r.screenshot); },
        });
        assert.equal(await page.evaluate(() => localStorage.getItem('sc-reading-unrelated')), 'held'); assert(r.screenshot); r.status = 'passed';
      } catch (error) { r.status = 'failed'; r.error = String(error.stack || error); r.actions = error.readingActions; try { await page.screenshot({ path: path.join(out, r.id + '-failure.png') }); } catch {} }
      finally {
        try { await drain('before-context-close'); } catch (error) { r.status = 'failed'; r.drainError = String(error.stack || error); }
        await context.close(); await Promise.all([...reads]);
        const blocked = event => { if (!/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(event.text)) return false; try { const u = new URL(event.location.url); return (known.has(u.origin) || u.origin === origin) && r.aborts.some(a => new URL(a.url).href === u.href); } catch { return false; } };
        r.unexpectedConsole = r.console.filter(e => e.type === 'error' && !blocked(e));
        r.undeclaredAborts = r.aborts.filter(a => !known.has(a.origin.replace(/^ws/, 'http')) && a.origin !== origin);
        r.httpErrors = r.responses.filter(a => new URL(a.url).origin === origin && a.status >= 400);
        r.unexpectedFailures = r.requestFailures.filter(q => !r.aborts.some(a => a.url === q.url));
        if (r.pageErrors.length || r.unexpectedConsole.length || r.undeclaredAborts.length || r.httpErrors.length || r.assetErrors.length || r.unexpectedFailures.length || !r.assetBodies.length) r.status = 'failed';
        await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
      }
    }
  } finally { await browser.close(); }
  await checkSource(); assert.deepEqual(await inventory(dist), m.distBefore);
  assert.equal(sha(await fs.readFile(manifestPath)), sha(manifestBytes)); assert.equal(sha(await fs.readFile(path.join(dir, m.bundle))), m.bundleSHA);
  for (const f of Object.values(m.fixtures)) assert.equal(sha(await fs.readFile(path.join(dir, f.file))), f.sha256);
  report.sourceHeld = true; report.distHeld = true; report.fixtureManifestHeld = true; report.engineBundleHeld = true;
  report.status = report.contexts.length === 6 && report.contexts.every(r => r.status === 'passed') && report.screenshots.length === 6 && new Set(report.screenshots).size === 6 ? 'passed' : 'failed';
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); assert.equal(report.status, 'passed');
  console.log('scReadingBrowser: six native reading sessions and six normal photos passed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
