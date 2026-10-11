/* Remote-only actual Quick Sim inputs with two engine-built saved fixtures. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { cmVarLiveState } from './qa/cmVarLit.mjs';

assert(process.env.CI, 'Run this browser proof only in remote CI');
/* Round 1218: the page's Quick Sim asks the engine for video reviews when the switch CM_VAR_LIVE is on (the
   hook's own line), so the engine run this proof compares the page with asks for the same. The switch is read
   from the source the build was made from, the way scripts/playCmVar.mjs reads it. With the switch off this is
   the call it always was. */
const HOOK_ASKS = cmVarLiveState() === 'on' ? { varReviews: true } : {};
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'cm-quick-subs-artifacts/native');
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'cm-quick-subs-artifacts/font-cache'));
const KEY = 'dukb-club-manager-save', FINISH_SEED = 107202, NOW = Date.parse('2026-10-06T16:00:00Z');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const sources = ['src/lib/clubManager.ts', 'src/hooks/useClubManager.ts', 'src/pages/ClubManager.tsx', 'src/components/club-manager/MatchReportCard.tsx', 'src/components/club-manager/MatchTimeline.tsx', 'scripts/simCmQuickSubs.mjs', 'scripts/playCmQuickSubs.mjs'];
const sourceHashes = () => Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { cases: [], controls: [], forwardedExternalRequests: 0, sourceBefore: sourceHashes() };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const fontCache = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file)); assert.equal(hash(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
function fixedDate(fn) {
  const OriginalDate = Date;
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return fn(); } finally { globalThis.Date = OriginalDate; }
}
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
const bundle = path.join(OUT, 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const cm = await import(pathToFileURL(bundle).href);
process.env.CM_QUICK_SUBS_FIXTURE_ONLY = '1';
const { findQuickSubsFixture, withQuickSubsSeed } = await import('./simCmQuickSubs.mjs');
const fixtures = fixedDate(() => ['injury', 'fatigue'].map(kind => ({ kind, ...findQuickSubsFixture(cm, kind) })));
for (const fixture of fixtures) {
  assert(fixture.paused.live && fixture.paused.squad.every(player => !player.generated), 'Real roster and actual paused match');
  fs.writeFileSync(path.join(OUT, `fixture-${fixture.kind}.json`), JSON.stringify(fixture, null, 2));
}
function settlement(actual, before, expected) {
  assert.equal(actual.week, before.week + 1, 'Exactly one fixture advances');
  assert.equal(actual.resultLog.length, before.resultLog.length + 1, 'Exactly one result is credited');
  assert.equal(actual.live, null, 'The settled live match is cleared');
  assert.deepEqual(actual, clone(cm.trimCareer(expected)), 'Every saved career field matches one engine settlement');
}
function rowsMatch(rows, subs) {
  assert.equal(rows.length, subs.length, 'Every own substitution has exactly one report row');
  for (const sub of subs) {
    const clock = sub.plus ? `${sub.minute}+${sub.plus}'` : `${sub.minute}'`;
    assert.equal(rows.filter(row => row.clock === clock && row.title.endsWith(`Sub: ${sub.on} on for ${sub.off}`) && row.text.includes(`Sub: ${sub.on} on for ${sub.off}`)).length, 1, 'Own substitution name and minute match engine report');
  }
}
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  for (const profile of [{ width: 320, height: 780, touch: true, reduced: true }, { width: 390, height: 844, touch: true, reduced: false }, { width: 1280, height: 720, touch: false, reduced: false }]) {
    for (const fixture of fixtures) {
      const id = `${profile.width}-${fixture.kind}`;
      const row = { id, ...profile, fixtureSeed: fixture.seed, finishSeed: FINISH_SEED, inputs: 0, errors: [], assetErrors: [], intercepted: [], writes: [], snapshots: [] };
      report.cases.push(row);
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch,
        reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: 'dark', serviceWorkers: 'block',
        storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: JSON.stringify(fixture.paused) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No loopback writes'); return route.continue(); }
        row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.writes.push({ method: request.method(), path: url.pathname, payload: request.postDataJSON() });
        if (request.method() === 'GET' && fontCache.has(url.href)) return route.fulfill({ status: 200, ...fontCache.get(url.href) });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { row.assetErrors.push(`Uncached font ${url.href}`); return route.abort(); }
        return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      await page.addInitScript(({ now, seed, key }) => {
        const OldDate = Date;
        window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        window.__quickInputs = 0; window.__careerWrites = [];
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(name, value) { if (this === localStorage && name === key) window.__careerWrites.push(JSON.parse(value)); return setItem.call(this, name, value); };
        document.addEventListener('click', event => {
          if (!event.target.closest?.('[data-cm-way="quick"]')) return;
          window.__quickInputs++;
          let a = seed >>> 0;
          Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        }, true);
      }, { now: NOW, seed: FINISH_SEED, key: KEY });
      page.on('pageerror', error => row.errors.push(String(error)));
      page.on('console', message => { if (message.type() === 'error') row.errors.push(message.text()); });
      page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
      page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
      const activate = async control => { row.inputs++; if (profile.touch) await control.tap(); else { await control.focus(); await control.press('Enter'); } };
      const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      const readRows = () => page.locator('[data-cm-tl="sub"][data-cm-tl-side="me"]').evaluateAll(elements => elements.map(el => ({ clock: el.children[1].textContent.trim(), title: el.querySelector('[title]')?.getAttribute('title') ?? '', text: el.textContent })));
      try {
        await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
        await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
        const quick = page.locator('[data-cm-way="quick"]'); await quick.waitFor();
        await page.evaluate(() => document.fonts.ready);
        const before = await saved();
        fs.writeFileSync(path.join(OUT, `${id}-before.json`), JSON.stringify(before, null, 2));
        // Each browser context boots fresh module counters, so its oracle does too.
        const caseCm = await import(`${pathToFileURL(bundle).href}?case=${id}`);
        const expected = fixedDate(() => withQuickSubsSeed(FINISH_SEED, () => caseCm.playNextEntry(before, { skipHalftime: true, ...HOOK_ASKS })));
        assert.equal(expected.kind, 'match'); assert(expected.report.detail.subs.length > 0, 'Actual coaching makes own substitutions');
        const subs = expected.report.detail.subs;
        for (const sub of subs) for (const nameKey of ['off', 'on']) {
          const players = before.squad.filter(player => player.name === sub[nameKey]);
          assert.equal(players.length, 1, 'Report name resolves to exactly one saved squad identity');
          assert(players[0].id && !players[0].generated, 'Substitution uses the real saved squad identity');
        }
        if (fixture.kind === 'injury') {
          const injured = before.squad.find(player => player.id === fixture.injury.id);
          assert(injured && injured.name === fixture.injury.name, 'Drawn injury identifies the saved squad player');
          assert(subs.some(sub => sub.off === injured.name && sub.minute >= fixture.injury.minute), 'Actual drawn injury receives a replacement');
        }
        else assert(subs.some(sub => sub.minute === 46), 'Fatigue produces an actual restart substitution');
        fs.writeFileSync(path.join(OUT, `${id}-expected.json`), JSON.stringify(expected, null, 2));
        await quick.scrollIntoViewIfNeeded();
        row.quickTarget = await quick.boundingBox(); assert(row.quickTarget.width >= 43.5 && row.quickTarget.height >= 43.5, 'Quick Sim target at least 44px');
        await activate(quick);
        await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor();
        await page.locator('[data-cm-timeline]').waitFor();
        await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: KEY, week: before.week + 1 });
        const after = await saved();
        fs.writeFileSync(path.join(OUT, `${id}-actual.json`), JSON.stringify(after, null, 2));
        settlement(after, before, expected.state);
        row.rows = await readRows(); rowsMatch(row.rows, subs);
        row.subs = subs; row.injury = fixture.injury; row.beforeWeek = before.week; row.afterWeek = after.week;
        row.beforeResults = before.resultLog.length; row.afterResults = after.resultLog.length;
        row.savedHash = hash(JSON.stringify(after)); row.expectedHash = hash(JSON.stringify(clone(cm.trimCareer(expected.state))));
        if (report.controls.length === 0) {
          const first = page.locator('[data-cm-tl="sub"][data-cm-tl-side="me"]').first();
          const original = await first.evaluate(el => el.children[1].firstChild.nodeValue);
          await first.evaluate(el => { el.children[1].firstChild.nodeValue = "999'"; });
          assert.notEqual(await first.evaluate(el => el.children[1].firstChild.nodeValue), original);
          const changed = await readRows(); assert.throws(() => rowsMatch(changed, subs), /Own substitution name and minute/);
          await first.evaluate((el, value) => { el.children[1].firstChild.nodeValue = value; }, original); rowsMatch(await readRows(), subs);
          report.controls.push('visible-row-clock');
          const duplicate = clone(after); duplicate.resultLog.push(clone(duplicate.resultLog.at(-1)));
          assert.notDeepEqual(duplicate.resultLog, after.resultLog); assert.throws(() => settlement(duplicate, before, expected.state), /Exactly one result/);
          settlement(after, before, expected.state); report.controls.push('duplicate-settlement');
        }
        if (id === '390-fatigue') {
          const verdict = page.locator('h2.cm-slam'); await verdict.waitFor({ state: 'attached' });
          const animationState = await verdict.evaluate(el => {
            const animation = el.getAnimations().find(item => item.animationName === 'cmSlam');
            if (!animation) throw new Error('Actual verdict animation is missing');
            const state = { time: animation.currentTime, running: animation.playState === 'running' };
            animation.pause(); animation.currentTime = 0; return state;
          });
          const readPeak = () => verdict.evaluate(el => {
            const rect = node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; };
            return { scrollWidth: document.documentElement.scrollWidth, width: innerWidth, heading: rect(el), card: rect(el.parentElement),
              transform: getComputedStyle(el).transform, overflow: getComputedStyle(el.parentElement).overflow };
          });
          const fits = value => assert(value.scrollWidth <= profile.width + 2 && value.width <= profile.width + 2, 'Animated report fits the viewport horizontally');
          await page.evaluate(() => new Promise(requestAnimationFrame));
          row.verdictPeak = await readPeak(); fits(row.verdictPeak);
          assert(row.verdictPeak.heading.right > profile.width + 2, 'Actual enlarged heading exercises the overflow boundary');
          const oldOverflow = await verdict.evaluate(el => { const value = el.parentElement.style.overflow; el.parentElement.style.overflow = 'visible'; return value; });
          await page.evaluate(() => new Promise(requestAnimationFrame));
          row.unclippedVerdictPeak = await readPeak();
          assert.notEqual(row.unclippedVerdictPeak.overflow, row.verdictPeak.overflow, 'Control changes actual card containment');
          assert.throws(() => fits(row.unclippedVerdictPeak), /Animated report fits the viewport/);
          await verdict.evaluate((el, value) => { el.parentElement.style.overflow = value; }, oldOverflow);
          await page.evaluate(() => new Promise(requestAnimationFrame));
          row.restoredVerdictPeak = await readPeak(); fits(row.restoredVerdictPeak);
          await verdict.evaluate((el, state) => {
            const animation = el.getAnimations().find(item => item.animationName === 'cmSlam');
            animation.currentTime = state.time; if (state.running) animation.play();
          }, animationState);
          report.controls.push('verdict-overflow');
        }
        await page.locator('[data-cm-timeline]').scrollIntoViewIfNeeded();
        row.layout = await page.locator('[data-cm-timeline]').evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { x: rect.x, right: rect.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            ownRows: [...el.querySelectorAll('[data-cm-tl="sub"][data-cm-tl-side="me"]')].map(row => { const box = row.getBoundingClientRect(); return { x: box.x, right: box.right, height: box.height, font: parseFloat(getComputedStyle(row).fontSize) }; }),
            fonts: ['Inter', 'Space Grotesk'].map(font => document.fonts.check(`400 16px "${font}"`, 'Quick Sim')) };
        });
        assert(row.layout.scrollWidth <= profile.width + 2 && row.layout.x >= 0 && row.layout.right <= profile.width + 1, 'Report fits the viewport horizontally');
        assert(row.layout.fonts.every(Boolean), 'Actual report fonts loaded');
        assert(row.layout.ownRows.every(box => box.font >= 10 && box.height >= 18 && box.x >= 0 && box.right <= profile.width + 1), 'Own substitution rows remain readable and contained');
        if (fixture.kind === 'injury') { const image = `${id}-report.png`; await page.screenshot({ path: path.join(OUT, image) }); row.snapshots.push(image); }
        row.quickInputs = await page.evaluate(() => window.__quickInputs); assert.equal(row.quickInputs, 1, 'One actual Quick Sim activation');
        row.careerWriteWeeks = await page.evaluate(() => window.__careerWrites.map(career => career.week));
        assert(row.careerWriteWeeks.every(week => week === before.week || week === after.week), 'Persistence never advances a second fixture');
        await activate(page.getByRole('button', { name: /^Continue$/i }).first());
        await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor({ state: 'hidden' });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-testid="cm-slot-1"]').waitFor();
        assert.equal(hash(JSON.stringify(await saved())), row.savedHash, 'Leaving the report and reloading never settles again');
        row.localActivity = await page.evaluate(() => JSON.parse(localStorage.getItem('dukb-local-completions')));
        assert.deepEqual(row.localActivity, { date: '2026-10-06', slugs: ['club-manager'] }, 'One match records its existing distinct daily activity');
        row.reloadWriteWeeks = await page.evaluate(() => window.__careerWrites.map(career => career.week));
        assert(row.reloadWriteWeeks.every(week => week === after.week), 'Reload writes retain the settled week');
        assert.equal(row.writes.length, 1, 'Exactly one locally intercepted match activity and no other write');
        assert.equal(row.writes[0].method, 'POST'); assert.equal(row.writes[0].path, '/rest/v1/game_completions');
        assert.equal(row.writes[0].payload.game, 'club-manager'); assert.equal(row.writes[0].payload.score, cm.currentSeasonScore(expected.state));
        assert.deepEqual(row.errors, [], 'No console or unhandled page error'); assert.deepEqual(row.assetErrors, [], 'No missing local asset or font');
        row.passed = true;
      } catch (error) {
        row.error = String(error.stack || error); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), fullPage: true }).catch(() => {});
      } finally { await context.close(); save(); }
    }
  }
  assert.equal(report.cases.length, 6); assert(report.cases.every(row => row.passed), 'Every real Quick Sim journey passed');
  assert.equal(report.controls.length, 3);
} finally {
  await browser?.close(); server.kill();
  report.sourceAfter = sourceHashes(); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); save();
}
assert(report.sourceHeld, 'Native proof never changes product source');
console.log('playCmQuickSubs: 3 viewports, 2 actual saved fixtures, 6 settled reports, 3 effective controls, zero external forwarding; source held.');
