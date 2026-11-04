import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { inventory, CM_SOURCE_PINS } from './cmReplacementFixtures.mjs';
import { runCmReplacementChoice } from './cmReplacementBrowser.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const marker = 'CM_REPLACEMENT_APP_NO_JUMP:start';

// A separate fresh context adds one real 10px movement to the trusted start click.
// The unchanged normal flow must reject it before pause, reload or Stop.
export async function runCmReplacementScrollControl(args) {
  const { page, fixture, save } = args;
  await page.addInitScript(() => {
    document.addEventListener('click', event => {
      const button = event.target instanceof Element && event.target.closest('[data-cm-retrain-to="ST"]');
      if (!button || !event.isTrusted || window.__cmReplacementScrollFault) return;
      const evidence = { trusted: event.isTrusted, type: event.type, target: button.getAttribute('data-cm-retrain-to'),
        clickX: scrollX, clickY: scrollY, clicks: 1, applied: false };
      window.__cmReplacementScrollFault = evidence;
      requestAnimationFrame(() => {
        evidence.before = { x: scrollX, y: scrollY };
        window.scrollBy(0, 10);
        evidence.after = { x: scrollX, y: scrollY }; evidence.applied = true;
      });
    }, true);
  });
  let owned;
  try { await runCmReplacementChoice(args); }
  catch (error) { owned = error; }
  const evidence = await page.evaluate(() => window.__cmReplacementScrollFault ?? null);
  assert(owned, 'The physical start-click scroll fault must be rejected');
  assert.equal(owned.name, 'AssertionError'); assert.match(owned.message, new RegExp(marker));
  assert.deepEqual(owned.cmActions?.map(a => a.label), ['start']);
  const action = owned.cmActions[0];
  assert.equal(action.after.x, action.before.x); assert.equal(action.after.y - action.before.y, 10);
  assert(evidence?.trusted === true && evidence.applied === true && evidence.target === 'ST');
  assert.equal(evidence.after.x, evidence.before.x); assert.equal(evidence.after.y - evidence.before.y, 10);
  const expected = JSON.parse(fixture.raw), target = expected.squad.find(p => p.id === fixture.expected.target.id);
  assert(target); target.retraining = structuredClone(fixture.expected.course);
  const saved = await save(fixture.expected.key);
  assert.deepEqual(JSON.parse(saved), expected, 'Fault must change only document scroll, not the real start result');
  assert.equal(saved, action.saved);
  return { qualified: true, marker, expectedNativeExit: 1, actualPixels: 10, evidence, action,
    saved, expectedSaved: expected, originalError: String(owned.stack || owned),
    scope: 'One trusted mobile start click plus 10px physical document movement. Original strict guard rejects; no tolerance, actor, save or App change.' };
}

async function main() {
  const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0, name); return process.argv[i + 1]; };
  const out = path.resolve(arg('--out')), dir = path.resolve(arg('--fixtures')), dist = path.resolve(arg('--dist'));
  const base = arg('--base-url'), origin = new URL(base).origin;
  assert(origin === 'https://douknowball.com' || ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname));
  await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
  const manifestPath = path.join(dir, 'manifest.json'), manifestBytes = await fs.readFile(manifestPath), m = JSON.parse(manifestBytes);
  assert.equal(m.schema, 1); assert.deepEqual(m.sourceBefore, m.sourceAfter); assert.deepEqual(m.sourcePins, CM_SOURCE_PINS);
  const checkSource = async () => { for (const [file, digest] of Object.entries(m.sourceAfter)) assert.equal(sha(await fs.readFile(file)), digest, file); };
  await checkSource(); assert.deepEqual(await inventory(dist), m.distBefore); assert.equal(sha(JSON.stringify(m.distBefore)), m.distDigest);
  const bundlePath = path.join(dir, m.bundle); assert.equal(sha(await fs.readFile(bundlePath)), m.bundleSHA);
  const f = m.fixtures.choice, raw = await fs.readFile(path.join(dir, f.file), 'utf8'); assert.equal(sha(raw), f.sha256);
  const fixture = { ...f, raw }, { cm: engine } = await import(pathToFileURL(bundlePath).href);
  const { default: pw } = await import('../lib/playwrightLoader.mjs');
  const { answerConsent } = await import('../lib/answerConsent.mjs');
  const known = new Set(['https://flagcdn.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flawuiqbvjobmkfkauhw.supabase.co']);
  const refs = new Map(m.distBefore.filter(row => row.file.startsWith('assets/')).map(row => [row.file, row]));
  const report = { status: 'incomplete', core: m.core, distDigest: m.distDigest, width: 320,
    requests: [], responses: [], aborts: [], requestFailures: [], console: [], pageErrors: [], assetBodies: [], assetErrors: [] };
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await context.route('**/*', route => { const q = route.request(), u = new URL(q.url()); if (!['http:', 'https:'].includes(u.protocol) || u.origin === origin && ['GET', 'HEAD'].includes(q.method())) return route.continue(); report.aborts.push({ url: u.href, origin: u.origin, method: q.method() }); return route.abort('blockedbyclient'); });
  await context.routeWebSocket('**/*', async socket => { report.aborts.push({ url: socket.url(), origin: new URL(socket.url()).origin, method: 'WEBSOCKET' }); await socket.close({ code: 1008, reason: 'CM physical scroll control' }); });
  await context.addInitScript(({ origin, key, raw }) => { if (location.origin !== origin || localStorage.getItem('cm-replacement-seeded')) return; localStorage.setItem(key, raw); localStorage.setItem('rules-gate-seen:/club-manager', '1'); localStorage.setItem('cm-replacement-seeded', '1'); }, { origin, key: f.key, raw });
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
  const active = new Set(), reads = new Set(); let last = Date.now();
  const asset = url => { const u = new URL(url); return u.origin === origin && u.pathname.startsWith('/assets/'); };
  const done = q => { if (active.delete(q)) last = Date.now(); };
  page.on('request', q => { report.requests.push({ url: q.url(), method: q.method() }); if (asset(q.url())) { active.add(q); last = Date.now(); } });
  page.on('requestfinished', done); page.on('requestfailed', q => { report.requestFailures.push({ url: q.url(), failure: q.failure() }); done(q); });
  page.on('response', response => {
    report.responses.push({ url: response.url(), status: response.status() }); if (!asset(response.url())) return;
    last = Date.now(); const read = (async () => { try { const file = decodeURIComponent(new URL(response.url()).pathname.slice(1)), ref = refs.get(file); assert(ref); assert.equal(response.status(), 200); const bytes = await response.body(); assert.equal(bytes.length, ref.bytes); assert.equal(sha(bytes), ref.sha256); report.assetBodies.push({ file, bytes: bytes.length, sha256: sha(bytes) }); } catch (error) { report.assetErrors.push({ url: response.url(), error: String(error.stack || error) }); } })();
    reads.add(read); void read.finally(() => { reads.delete(read); last = Date.now(); });
  });
  page.on('console', event => report.console.push({ type: event.type(), text: event.text(), location: event.location() }));
  page.on('pageerror', error => report.pageErrors.push(String(error.stack || error)));
  let failure;
  try {
    report.observed = await runCmReplacementScrollControl({ page, width: 320, base, fixture, engine,
      save: key => page.evaluate(k => localStorage.getItem(k), key),
      goto: async value => { const u = new URL(value, base); assert.equal(u.origin, origin); await page.goto(u.href, { waitUntil: 'domcontentloaded' }); await answerConsent(page, { wait: 1000 }); },
      photo: async (label, selector) => {
        assert.equal(label, 'replacement-choice-preview'); assert(!report.previewPhoto);
        const target = page.locator(selector); assert.equal(await target.count(), 1);
        await target.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        report.previewGeometry = await target.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x, right: b.right, width: b.width, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }; });
        assert(report.previewGeometry.width > 0 && report.previewGeometry.x >= -1 && report.previewGeometry.right <= 321);
        assert(report.previewGeometry.documentWidth <= report.previewGeometry.clientWidth + 1);
        report.previewPhoto = 'start-preview-control-320.png';
        await page.screenshot({ path: path.join(out, report.previewPhoto) });
      },
    });
    await page.screenshot({ path: path.join(out, 'start-scroll-fault-320.png') });
  } catch (error) { failure = error; report.error = String(error.stack || error); }
  finally {
    try { const start = Date.now(); while (active.size || reads.size || Date.now() - last < 100) { assert(Date.now() - start < 20000, 'CM_CONTROL_ASSET_CAPTURE_UNSETTLED'); await new Promise(resolve => setTimeout(resolve, 25)); } } catch (error) { failure ??= error; report.drainError = String(error.stack || error); }
    await context.close(); await Promise.all([...reads]); await browser.close();
  }
  const blocked = event => { if (!/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(event.text)) return false; try { const u = new URL(event.location.url); return (known.has(u.origin) || u.origin === origin) && report.aborts.some(a => new URL(a.url).href === u.href); } catch { return false; } };
  report.unexpectedConsole = report.console.filter(e => e.type === 'error' && !blocked(e));
  report.undeclaredAborts = report.aborts.filter(a => !known.has(a.origin.replace(/^ws/, 'http')) && a.origin !== origin);
  report.httpErrors = report.responses.filter(r => new URL(r.url).origin === origin && r.status >= 400);
  report.unexpectedFailures = report.requestFailures.filter(q => !report.aborts.some(a => a.url === q.url));
  await checkSource(); assert.deepEqual(await inventory(dist), m.distBefore);
  assert.equal(sha(await fs.readFile(manifestPath)), sha(manifestBytes)); assert.equal(sha(await fs.readFile(bundlePath)), m.bundleSHA);
  for (const f of Object.values(m.fixtures)) assert.equal(sha(await fs.readFile(path.join(dir, f.file))), f.sha256);
  report.sourceHeld = true; report.distHeld = true; report.fixtureManifestHeld = true; report.engineBundleHeld = true;
  report.status = !failure && report.observed?.qualified && !report.unexpectedConsole.length && !report.undeclaredAborts.length && !report.httpErrors.length && !report.unexpectedFailures.length && !report.pageErrors.length && !report.assetErrors.length && report.assetBodies.length > 0 ? 'owned-fault-qualified' : 'failed';
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (failure) throw failure; assert.equal(report.status, 'owned-fault-qualified');
  console.error(marker + ': actual trusted start-click +10px rejected; complete real start save and source/output holds exact.');
  process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
