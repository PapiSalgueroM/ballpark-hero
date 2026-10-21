/* Diagnostic observations only. No stability threshold or app qualification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.SCROLL_DIAG_OUT || 'cm-scroll-diagnostic-artifacts');
const BASE = 'http://127.0.0.1:4173';
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert.equal(process.env.CURRENT_SOURCE, '86e45814734bffce89e6bc2ec0c317514f382a9e');
assert.equal(process.env.BASELINE_SOURCE, 'e13280c8cdab53a96b6b51071f5570fda8a55113');
fs.mkdirSync(OUT, { recursive: true });
const report = { diagnosticOnly: true, status: 'running', operator: process.env.GITHUB_SHA, run: process.env.GITHUB_RUN_ID,
  plannedArms: 2, plannedCases: 4, plannedWalks: 8, cases: [], arms: [], errors: [],
  limitation: 'Native scroll and layout observations only. No old stability guard pass or release qualification is asserted.' };
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const persist = () => write('report.json', report);
const heldPaths = ['package.json', 'package-lock.json', 'src/lib/clubManager.ts', 'src/lib/clubManagerFinances.ts', 'src/lib/clubManagerSlots.ts', 'src/lib/saveFence.ts', 'src/hooks/useClubManager.ts', 'src/hooks/useRevealScroll.ts', 'src/pages/ClubManager.tsx', 'src/components/club-manager/FinancesScreen.tsx', 'scripts/qa/playCmShirtSales1443.mjs', 'scripts/qa/diagnoseCmFinanceScroll1443.mjs'];
const holds = new Map(heldPaths.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
report.sourceHolds = Object.fromEntries(holds);
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'), 'utf8')).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file)); assert.equal(hash(body), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
assert(fonts.size > 0, 'An actual font cache is required');
report.fonts = [...fonts].map(([url, row]) => ({ url, sha256: hash(row.body) }));
let fixture, browser;
const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-scroll-fixture-'));
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) } });
  const bundle = path.join(scratch, 'engine.mjs');
  await build({ stdin: { contents: "export { startCareer, saveCareer, loadCareer, SAVE_KEY, engineRegistrations, restoreEngineRegistrations } from './src/lib/clubManager'; export { ensureBooks } from './src/lib/clubManagerFinances';", resolveDir: ROOT, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: bundle, absWorkingDir: ROOT, alias: { '@': './src' }, jsx: 'automatic', logLevel: 'error', banner: { js: "import { createRequire as __fixtureRequire } from 'node:module'; const require = __fixtureRequire(import.meta.url);" } });
  const E = await import(pathToFileURL(bundle).href);
  const random = Math.random, now = Date.now, registrations = E.engineRegistrations(); let seed = 1519;
  Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = (n + Math.imul(n ^ n >>> 7, 61 | n)) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  Date.now = () => Date.UTC(2026, 9, 21, 12);
  try {
    const career = E.startCareer('Shirt Browser Athletic', 'now', { name: 'Shirt Browser Athletic', leagueId: 'premier', stadium: 'Fixture Ground', budgetTier: 'small', quality: 72, crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'SB' }, replacedClub: '' });
    assert(career.customClub && career.squad.length > 0 && career.squad.every(player => player.generated));
    const books = E.ensureBooks(career);
    books.season = { ...books.season, weeks: 2, shirts: { v: 1, weeks: 2, openingPence: 123400, grossPence: 1800025, costPence: 600000, paidPence: 1000000 } };
    books.lastSeason = { ...books.season, shirts: { v: 1, weeks: 2, openingPence: 0, grossPence: 2400000, costPence: 800000, paidPence: 1000000 }, transferIn: 0, transferOut: 0, facilities: 0, staffFees: 0, income: 0.01, spend: 0, result: 0.01 };
    E.restoreEngineRegistrations(registrations); Math.random = random; Date.now = now;
    assert.equal(E.saveCareer(career), true);
    const loaded = E.loadCareer(); assert(loaded); assert.equal(E.saveCareer(loaded), true);
    const value = memory.get(E.SAVE_KEY); const again = E.loadCareer(); assert(again); assert.equal(E.saveCareer(again), true);
    assert.equal(memory.get(E.SAVE_KEY), value); assert.deepEqual(loaded.books, career.books); assert.equal(loaded.budget, career.budget);
    assert.equal(hash(value), '678365456eae1d3e4cd2d68e54194e3ac61d71cb758f07ff52539736810729e0', 'Reuse the exact fixture bytes from failed run39662369995');
    fixture = { key: E.SAVE_KEY, value }; write('fixture.json', value);
    report.fixture = { source: process.env.CURRENT_SOURCE, sha256: hash(value), bytes: Buffer.byteLength(value), seed: 1519, engineAdvances: 0, syntheticLedgerWeeks: 2, referenceRun: '39662369995', reference: 'scripts/qa/playCmShirtSales1443.mjs current fixture' };
  } finally { E.restoreEngineRegistrations(registrations); Math.random = random; Date.now = now; }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
  if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage); else delete globalThis.localStorage;
}
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350); };
async function tap(locator, row) {
  await locator.click({ trial: true });
  const target = await locator.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { text: el.textContent?.trim(), width: r.width, height: r.height, topmost: !!hit && (hit === el || el.contains(hit)) }; });
  row.controls.push(target); assert(target.width >= 43.5 && target.height >= 43.5 && target.topmost, 'Trusted44px control precondition');
  await locator.tap(); await settle(locator.page());
}
async function observeStart(page) {
  await page.evaluate(() => {
    const started = performance.now(), frames = [], events = [], samples = [];
    const read = label => { const el = document.querySelector('[data-finance-projection]'), r = el?.getBoundingClientRect(); return { label, ms: performance.now() - started, scrollY, projectionTop: r?.top ?? null, projectionHeight: r?.height ?? null, bodyHeight: document.body.getBoundingClientRect().height, documentHeight: document.documentElement.scrollHeight, focus: { tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().slice(0, 80) }, readyState: document.readyState, fonts: document.fonts.status }; };
    const listener = event => events.push({ ...read(event.type), target: event.target === document ? 'document' : event.target === window ? 'window' : event.target?.tagName });
    document.addEventListener('scrollend', listener, true); document.addEventListener('scroll', listener, true);
    const state = { frames, events, samples, done: false, mark: label => samples.push(read(label)) };
    window.__cmScrollDiagnostic = state; state.mark('before-finance-trial');
    for (const ms of [700, 1150]) setTimeout(() => state.mark('timed-' + ms), ms);
    const frame = () => { frames.push(read('rAF')); if (performance.now() - started < 3500) requestAnimationFrame(frame); else { state.done = true; document.removeEventListener('scrollend', listener, true); document.removeEventListener('scroll', listener, true); } };
    requestAnimationFrame(frame);
  });
}
const mark = (page, label) => page.evaluate(label => window.__cmScrollDiagnostic.mark(label), label);
const tile = page => page.getByRole('button', { name: /Finances.*Kitty change, projected/i });
async function walk(page, row, name) {
  const result = { name, status: 'running' }; row.walks.push(result); persist();
  await observeStart(page);
  try {
    await tile(page).click({ trial: true }); await mark(page, 'after-first-trial');
    await mark(page, 'before-trusted-tap'); await tap(tile(page), row); await mark(page, 'after-tap-and-first-350ms');
    await page.locator('[data-finance-projection]').waitFor({ state: 'visible' }); await settle(page); await mark(page, 'old-arrival-after-second-350ms');
    await page.waitForTimeout(450); await mark(page, 'old-stable-after-450ms');
    await page.waitForFunction(() => window.__cmScrollDiagnostic.done, undefined, { timeout: 6000 });
    result.status = 'observed';
  } catch (error) { result.status = 'incomplete'; result.error = String(error?.stack || error); }
  finally {
    result.timeline = await page.evaluate(() => { const state = window.__cmScrollDiagnostic; return state && { frames: state.frames, events: state.events, samples: state.samples, done: state.done }; });
    const samples = result.timeline?.samples || [], arrived = samples.find(row => row.label === 'old-arrival-after-second-350ms'), stable = samples.find(row => row.label === 'old-stable-after-450ms');
    result.oldWindowObservation = { arrived, stable, deltaScroll: arrived && stable ? stable.scrollY - arrived.scrollY : null, thresholdEvaluated: false };
    const png = `${row.id}-${name}-final.png`; await page.screenshot({ path: path.join(OUT, png), fullPage: false, animations: 'allow' }); result.screenshot = png;
    write(`${row.id}-${name}-timeline.json`, result); persist();
  }
}
async function runCase(arm, profile) {
  const row = { arm: arm.name, ...profile, id: `${arm.name}-${profile.width}${profile.reduced ? '-reduced' : ''}`, fixtureSha256: hash(fixture.value), controls: [], walks: [], external: [], errors: [], assets: [], status: 'running' };
  report.cases.push(row); persist();
  const context = await browser.newContext({ viewport: { width: row.width, height: row.height }, isMobile: true, hasTouch: true, reducedMotion: row.reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1, serviceWorkers: 'block' });
  try {
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(req.method())); return route.continue(); }
      row.external.push({ origin: url.origin, path: url.pathname, method: req.method() });
      if (fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
      if (/fonts\.(?:googleapis|gstatic)\.com/.test(url.hostname)) row.errors.push('Uncached font: ' + url.href);
      const type = req.resourceType(); return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => { row.errors.push('WebSocket blocked'); socket.close(); });
    await context.addInitScript(({ key, value }) => { localStorage.setItem(key, value); localStorage.setItem('dukb-cm-slots', JSON.stringify({ active: 1 })); }, fixture);
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assets.push(response.url() + ': ' + response.status()); });
    page.on('requestfailed', req => { if (req.url().startsWith(BASE)) row.assets.push(req.url() + ': ' + req.failure()?.errorText); });
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
    const choices = page.getByRole('region', { name: 'Cookie choices', exact: true }); await choices.waitFor({ state: 'visible' });
    await tap(choices.getByRole('button', { name: 'Reject all', exact: true }), row); await choices.waitFor({ state: 'hidden' });
    row.consent = await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-consent-v2')));
    assert.equal(row.consent.analytics, false); assert.equal(row.consent.advertising, false);
    const resume = page.locator('[data-testid="cm-slot-1"] [data-cm-slot-open="resume"]'); await resume.waitFor({ state: 'visible' }); await tap(resume, row);
    await tile(page).waitFor({ state: 'visible' }); await settle(page);
    row.bootSaveSha256 = hash(await page.evaluate(key => localStorage.getItem(key), fixture.key));
    assert.equal(row.bootSaveSha256, hash(fixture.value), 'Both arms use the same complete canonical fixture bytes');
    row.layoutBefore = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollY, bodyHeight: document.body.getBoundingClientRect().height, fonts: document.fonts.status, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }));
    await walk(page, row, 'first-entry');
    const back = page.getByRole('button', { name: 'Club home', exact: true }); await back.waitFor({ state: 'visible' }); await tap(back, row); await tile(page).waitFor({ state: 'visible' }); await settle(page);
    await walk(page, row, 're-entry');
    row.finalSaveSha256 = hash(await page.evaluate(key => localStorage.getItem(key), fixture.key));
    assert.equal(row.finalSaveSha256, hash(fixture.value)); assert.deepEqual(row.errors, []); assert.deepEqual(row.assets, []);
    row.status = row.walks.every(walk => walk.status === 'observed' && walk.timeline.done) ? 'observed' : 'incomplete';
  } catch (error) { row.status = 'incomplete'; row.error = String(error?.stack || error); }
  finally { await context.close(); persist(); }
}
try {
  browser = await chromium.launch();
  for (const arm of [{ name: 'baseline', source: process.env.BASELINE_SOURCE, dist: process.env.BASELINE_DIST }, { name: 'current', source: process.env.CURRENT_SOURCE, dist: process.env.CURRENT_DIST }]) {
    assert(arm.dist && fs.existsSync(path.join(arm.dist, 'index.html'))); arm.indexSha256 = hash(fs.readFileSync(path.join(arm.dist, 'index.html'))); report.arms.push(arm); persist();
    const log = fs.openSync(path.join(OUT, arm.name + '-server.log'), 'w');
    const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), arm.dist, '4173'], { stdio: ['ignore', log, log] });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 30; attempt += 1) { try { const response = await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) }); if (response.status === 200 && hash(Buffer.from(await response.arrayBuffer())) === arm.indexSha256) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 200)); }
      assert(ready, 'Fixed loopback server serves the exact arm build');
      for (const profile of [{ width: 360, height: 800 }, { width: 390, height: 844, reduced: true }]) await runCase(arm, profile);
    } finally { const exited = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM'); await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]); fs.closeSync(log); }
  }
  assert.equal(report.cases.length, 4); assert.equal(report.cases.flatMap(row => row.walks).length, 8);
  assert(report.cases.every(row => row.status === 'observed'));
  report.status = 'DIAGNOSTIC_COMPLETE';
} catch (error) { report.status = 'DIAGNOSTIC_INCOMPLETE'; report.errors.push(String(error?.stack || error)); process.exitCode = 1; }
finally {
  await browser?.close();
  report.sourceUnchanged = [...holds].every(([file, sha]) => hash(fs.readFileSync(path.join(ROOT, file))) === sha);
  if (!report.sourceUnchanged) { report.status = 'DIAGNOSTIC_INCOMPLETE'; process.exitCode = 1; }
  persist(); console.log(`CM_SCROLL_DIAGNOSTIC ${report.status}: ${report.cases.length}/4 cases, ${report.cases.flatMap(row => row.walks).length}/8 walks. No stability verdict or app qualification.`);
}
