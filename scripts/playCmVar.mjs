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

assert(process.env.CI, 'Run the actual VAR browser proof only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.CM_VAR_NATIVE_ARTIFACTS || path.join(ROOT, 'cm-var-artifacts/native'));
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'cm-var-artifacts/font-cache'));
const KEY = 'dukb-club-manager-save', NOW = 1791547200000, SECOND_SEED = 5312, FINISH_SEED = 5313;
const clone = value => JSON.parse(JSON.stringify(value)), hash = value => createHash('sha256').update(value).digest('hex');
const sources = ['src/lib/clubManager.ts', 'src/lib/clubManagerVar.ts', 'src/lib/clubManagerCalendar.ts', 'src/lib/clubManagerMatchCentre.ts',
  'src/hooks/useClubManager.ts', 'src/components/club-manager/LiveSimScreen.tsx', 'src/components/club-manager/ClubManagerVarReview.tsx',
  'src/components/club-manager/MatchTimeline.tsx', 'scripts/simCmVar.mjs', 'scripts/playCmVar.mjs'];
const sourceHashes = () => Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { cases: [], controls: [], forwardedExternalRequests: 0, sourceBefore: sourceHashes() };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const fontCache = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin)); assert(/^[a-f0-9]{64}$/.test(entry.file));
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
process.env.CM_VAR_FIXTURE_ONLY = '1';
const { findCmVarFixture, withCmVarSeed } = await import('./simCmVar.mjs');
const kinds = ['disallowed', 'confirmed', 'awarded_scored', 'awarded_missed'];
const fixtures = [];
for (const kind of kinds) {
  const cm = await import(`${pathToFileURL(bundle).href}?fixture=${kind}`);
  const fixture = fixedDate(() => findCmVarFixture(cm, kind));
  fixtures.push({ kind, ...fixture }); fs.writeFileSync(path.join(OUT, `fixture-${kind}.json`), JSON.stringify(fixture, null, 2));
}
fixtures.push({ ...fixtures[0], kind: 'quick' });
function reviewRows(rows, expected, cm) {
  assert.equal(rows.length, expected.length, 'Every actual review has exactly one report row');
  for (const e of expected) {
    const label = e.review.incident === 'penalty' ? e.review.decision === 'awarded' ? 'VAR: penalty awarded' : 'VAR: penalty confirmed'
      : e.review.decision === 'confirmed' ? 'VAR: goal confirmed' : `VAR: goal ruled out, ${e.review.reason === 'offside' ? 'offside' : e.review.reason === 'handball' ? 'attacking handball' : 'attacking foul'}`;
    assert.equal(rows.filter(row => row.clock === cm.minuteLabel(e) && row.side === e.side && row.title.includes(`${label}: ${e.who}`)).length, 1, 'Review result, side, taker and clock match the committed engine');
  }
}
function decidedState(actual, expected, cm) {
  assert.deepEqual(actual, clone(cm.trimCareer(expected)), 'Review presentation never rewrites saved state or decided play');
}
function settlement(actual, before, expected, cm) {
  assert.equal(actual.week, before.week + 1, 'Exactly one fixture advances');
  assert.equal(actual.resultLog.length, before.resultLog.length + 1, 'Exactly one result is credited');
  assert.equal(actual.live, null); assert.deepEqual(actual, clone(cm.trimCareer(expected)), 'Every saved field matches the actual engine settlement');
}
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
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
  for (const profile of [{ width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }]) {
    for (const fixture of fixtures) {
      const id = `${profile.width}-${fixture.kind}`;
      const row = { id, ...profile, seed: fixture.seed, errors: [], assetErrors: [], intercepted: [], writes: [], snapshots: [] }; report.cases.push(row);
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch,
        colorScheme: 'dark', reducedMotion: 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE,
          localStorage: [{ name: KEY, value: JSON.stringify(fixture.pre) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No loopback writes'); return route.continue(); }
        row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.writes.push({ method: request.method(), path: url.pathname });
        if (request.method() === 'GET' && fontCache.has(url.href)) return route.fulfill({ status: 200, ...fontCache.get(url.href) });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { row.assetErrors.push(`Uncached font ${url.href}`); return route.abort(); }
        return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      await page.addInitScript(({ now, seed, second, finish, key }) => {
        const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        const seedRandom = seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
        window.__varInputs = { kickoff: 0, resume: 0, second: 0, finish: 0 };
        document.addEventListener('click', event => {
          const button = event.target.closest?.('button'); if (!button) return;
          if (button.matches('[data-cm-way="live"], [data-cm-way="quick"]')) {
            if (button.matches('[data-cm-way="live"]') && JSON.parse(localStorage.getItem(key) || 'null')?.live) window.__varInputs.resume++;
            else { window.__varInputs.kickoff++; seedRandom(seed); }
          }
          if (button.textContent.trim() === 'Second half') { window.__varInputs.second++; seedRandom(second); }
          if (button.textContent.trim() === 'Skip' && document.querySelector('[data-cm-live-stage="second"]')) { window.__varInputs.finish++; seedRandom(finish); }
        }, true);
      }, { now: NOW, seed: fixture.seed, second: SECOND_SEED, finish: FINISH_SEED, key: KEY });
      page.on('pageerror', error => row.errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') row.errors.push(message.text()); });
      page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
      page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
      const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
      const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      const readScore = () => page.locator('[data-cm-live-stagebox] [data-cm-score-of]').evaluateAll(elements => Object.fromEntries(elements.map(el => [el.dataset.cmScoreOf, Number(el.textContent)])));
      const waitForStage = async stage => {
        await page.locator(`[data-cm-live-stage="${stage}"]`).waitFor({ state: 'attached' });
        await page.locator('[data-cm-live-stagebox]').waitFor({ state: 'visible' });
      };
      try {
        await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
        await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
        await page.locator('[data-cm-way="live"]').waitFor(); await page.evaluate(() => document.fonts.ready);
        const before = await saved();
        const cm = await import(`${pathToFileURL(bundle).href}?case=${id}`);
        if (fixture.kind === 'quick') {
          const expected = fixedDate(() => withCmVarSeed(fixture.seed, () => cm.playNextEntry(before, { skipHalftime: true, varReviews: true })));
          assert.equal(expected.kind, 'match');
          const incidents = expected.report.detail.play.filter(e => e.kind === 'var');
          assert(incidents.length > 0 && incidents.some(e => e.review.decision === 'disallowed'), 'Actual quick simulation includes the intended VAR outcome');
          assert.equal(expected.report.detail.play.filter(e => e.kind === 'shot' && e.goal).length, expected.report.homeGoals + expected.report.awayGoals);
          await activate(page.locator('[data-cm-way="quick"]'));
          await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor(); await page.locator('[data-cm-timeline]').waitFor();
          await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: KEY, week: before.week + 1 });
          const after = await saved(); settlement(after, before, expected.state, cm);
          row.rows = await page.locator('[data-cm-tl="var"]').evaluateAll(elements => elements.map(el => ({ clock: el.dataset.cmTlClock, side: el.dataset.cmTlSide, title: el.querySelector('[title]')?.getAttribute('title') ?? '' })));
          reviewRows(row.rows, incidents, cm); row.inputs = await page.evaluate(() => window.__varInputs);
          assert.deepEqual(row.inputs, { kickoff: 1, resume: 0, second: 0, finish: 0 }, 'One actual VAR-enabled Quick Sim input settles once');
          row.savedHash = hash(JSON.stringify(after));
          await page.screenshot({ path: path.join(OUT, `${id}-quick-report.png`) }); row.snapshots.push(`${id}-quick-report.png`);
          await activate(page.getByRole('button', { name: 'Continue', exact: true }).first());
          await page.locator('[data-cm-timeline]').waitFor({ state: 'hidden' }); await page.reload({ waitUntil: 'domcontentloaded' });
          await page.locator('[data-testid="cm-slot-1"]').waitFor(); assert.equal(hash(JSON.stringify(await saved())), row.savedHash, 'Quick Sim reload never repeats a review or player credit');
          assert.deepEqual(row.errors, []); assert.deepEqual(row.assetErrors, []); row.passed = true; continue;
        }
        const expectedHalf = fixedDate(() => withCmVarSeed(fixture.seed, () => cm.playNextEntry(before, { varReviews: true })));
        assert.equal(expectedHalf.kind, 'halftime');
        const incident = expectedHalf.state.live.h1Play.find(e => e.review?.id === fixture.event.review.id); assert(incident, 'The actual seeded route starts the intended engine review');
        await activate(page.locator('[data-cm-way="live"]'));
        await waitForStage('first');
        await activate(page.locator('[data-cm-live-controls]').getByRole('button', { name: '4x', exact: true }));
        await page.waitForFunction(id => { const el = document.querySelector('[data-cm-var]'); return el?.dataset.cmVarId === id && el.dataset.cmVar === 'checking'; }, incident.review.id, { timeout: 60000 });
        const checking = page.locator('[data-cm-var="checking"]');
        assert.equal(await checking.getAttribute('data-cm-var-decision'), null, 'Checking does not expose the final outcome');
        assert.match(await checking.innerText(), /checking/); assert.match(await checking.innerText(), /game simulation/);
        const priorGoals = { me: expectedHalf.state.live.h1My.filter(g => g.minute < incident.minute).length, opp: expectedHalf.state.live.h1Opp.filter(g => g.minute < incident.minute).length };
        row.pendingScore = await readScore(); assert.deepEqual(row.pendingScore, priorGoals, 'Pending review never credits its unconfirmed goal');
        const storedDuringReview = await saved(); decidedState(storedDuringReview, expectedHalf.state, cm);
        row.reviewStateHash = hash(JSON.stringify(storedDuringReview));
        if (!report.controls.includes('saved-review-decision')) {
          const defect = clone(storedDuringReview), review = defect.live.h1Play.find(e => e.review?.id === incident.review.id).review;
          const old = review.decision; review.decision = old === 'confirmed' ? 'disallowed' : 'confirmed'; assert.notEqual(review.decision, old);
          assert.throws(() => decidedState(defect, expectedHalf.state, cm), /Review presentation never rewrites saved state or decided play/);
          report.controls.push('saved-review-decision');
        }
        row.layout = await checking.evaluate(el => { const box = el.getBoundingClientRect(); return { x: box.x, right: box.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, font: parseFloat(getComputedStyle(el.querySelector('p')).fontSize) }; });
        assert(row.layout.scrollWidth <= profile.width + 2 && row.layout.x >= 0 && row.layout.right <= profile.width + 1 && row.layout.font >= 11, 'Review card remains readable inside the viewport');
        await page.screenshot({ path: path.join(OUT, `${id}-checking.png`) }); row.snapshots.push(`${id}-checking.png`);
        await page.locator('[data-cm-var="decided"]').waitFor();
        assert.equal(await page.locator('[data-cm-var="decided"]').getAttribute('data-cm-var-decision'), incident.review.decision);
        row.decidedText = await page.locator('[data-cm-var="decided"]').innerText();
        assert(row.decidedText.includes(incident.review.decision === 'awarded' ? 'penalty awarded' : incident.review.decision === 'disallowed' ? 'ruled out' : 'goal confirmed'));
        assert.deepEqual(await readScore(), priorGoals, 'The decision is shown before the accepted goal reaches the scoreboard');
        await page.screenshot({ path: path.join(OUT, `${id}-decided.png`) }); row.snapshots.push(`${id}-decided.png`);
        await page.locator('[data-cm-var]').waitFor({ state: 'hidden' });
        if (fixture.kind === 'disallowed' || fixture.kind === 'awarded_missed') {
          await page.waitForFunction(minute => Number(document.querySelector('[data-cm-live-stage]')?.dataset.cmLiveMinute) >= minute, incident.minute);
          const afterScore = await readScore(); assert.deepEqual(afterScore, priorGoals, 'Ruled-out goals and missed awarded kicks do not change the score');
        }
        await activate(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
        await page.locator('[data-cm-live-stage="interval"]').waitFor();
        await activate(page.getByRole('button', { name: 'Second half', exact: true }));
        await waitForStage('second');
        if (fixture.kind === 'confirmed') {
          await activate(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Pause', exact: true }));
          row.inputsBeforeReload = await page.evaluate(() => window.__varInputs);
          row.scoreBeforeReload = await readScore();
          await page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Resume', exact: true }).waitFor();
          row.reloadMinute = Number(await page.locator('[data-cm-live-stage="second"]').getAttribute('data-cm-live-minute'));
          assert(row.reloadMinute >= 46 && row.reloadMinute < 90, 'Reload exercises an actual unfinished second half');
          const beforeReload = await saved(), savedReview = clone(beforeReload.live.h1Play);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
          const resumeBaseline = await saved();
          assert.deepEqual(resumeBaseline, clone(cm.trimCareer(cm.markLiveMinute(beforeReload, row.reloadMinute))), 'Reload records only the actual presentation clock, preserving every decided field');
          await activate(page.getByRole('button', { name: 'Resume match', exact: true }));
          await waitForStage('second');
          await activate(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Pause', exact: true }));
          assert.deepEqual(await readScore(), row.scoreBeforeReload, 'Reopening a later period retains already played reviewed goals on the scoreboard');
          const afterReload = await saved(); decidedState(afterReload, resumeBaseline, cm);
          assert.deepEqual(afterReload.live.h1Play, savedReview, 'Reopening never rerolls the earlier review stream');
          assert.deepEqual(afterReload.live.h1My, beforeReload.live.h1My);
          assert.equal(afterReload.week, beforeReload.week); assert.deepEqual(afterReload.resultLog, beforeReload.resultLog);
          row.midMatchReload = true;
        }
        const beforeFinish = await saved();
        const expected = fixedDate(() => withCmVarSeed(FINISH_SEED, () => cm.resumeMatch(beforeFinish)));
        assert.equal(expected.kind, 'match');
        await activate(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
        await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: KEY, week: before.week + 1 });
        await waitForStage('done');
        const after = await saved(); settlement(after, before, expected.state, cm);
        await activate(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Full report', exact: true }));
        await page.locator('[data-cm-timeline]').waitFor();
        const readRows = () => page.locator('[data-cm-tl="var"]').evaluateAll(elements => elements.map(el => ({ clock: el.dataset.cmTlClock, side: el.dataset.cmTlSide, title: el.querySelector('[title]')?.getAttribute('title') ?? '', text: el.textContent })));
        row.rows = await readRows(); const incidents = expected.report.detail.play.filter(e => e.kind === 'var'); reviewRows(row.rows, incidents, cm);
        if (!report.controls.includes('visible-review-clock')) {
          const first = page.locator('[data-cm-tl="var"]').first();
          const old = await first.getAttribute('data-cm-tl-clock'); await first.evaluate(el => el.dataset.cmTlClock = "999'");
          assert.notEqual(await first.getAttribute('data-cm-tl-clock'), old); assert.throws(() => reviewRows(row.rows.map((r, i) => i ? r : { ...r, clock: "999'" }), incidents, cm), /Review result, side, taker and clock/);
          const broken = await readRows(); assert.throws(() => reviewRows(broken, incidents, cm), /Review result, side, taker and clock/);
          await first.evaluate((el, value) => { el.dataset.cmTlClock = value; }, old); reviewRows(await readRows(), incidents, cm); report.controls.push('visible-review-clock');
          const duplicate = clone(after); duplicate.resultLog.push(clone(duplicate.resultLog.at(-1))); assert.notDeepEqual(duplicate, after);
          assert.throws(() => settlement(duplicate, before, expected.state, cm), /Exactly one result/); report.controls.push('duplicate-settlement');
        }
        await page.screenshot({ path: path.join(OUT, `${id}-report.png`) }); row.snapshots.push(`${id}-report.png`);
        row.inputsBeforeLeaving = await page.evaluate(() => window.__varInputs);
        assert.equal((row.inputsBeforeReload?.kickoff ?? 0) + row.inputsBeforeLeaving.kickoff, 1);
        assert.equal((row.inputsBeforeReload?.second ?? 0) + row.inputsBeforeLeaving.second, 1);
        assert.equal((row.inputsBeforeReload?.resume ?? 0) + row.inputsBeforeLeaving.resume, fixture.kind === 'confirmed' ? 1 : 0, 'Only the confirmed case resumes its already decided match once');
        assert.equal(row.inputsBeforeLeaving.finish, 1, 'The actual final live input settles once');
        row.savedHash = hash(JSON.stringify(after)); fs.writeFileSync(path.join(OUT, `${id}-actual.json`), JSON.stringify(after, null, 2));
        await activate(page.getByRole('button', { name: 'Continue', exact: true }).first());
        await page.locator('[data-cm-timeline]').waitFor({ state: 'hidden' }); await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-testid="cm-slot-1"]').waitFor(); assert.equal(hash(JSON.stringify(await saved())), row.savedHash, 'Reload never rerolls reviews or settles a fixture twice');
        row.reloadInputs = await page.evaluate(() => window.__varInputs);
        assert.deepEqual(row.reloadInputs, { kickoff: 0, resume: 0, second: 0, finish: 0 });
        assert.deepEqual(row.errors, [], 'No console or unhandled page errors'); assert.deepEqual(row.assetErrors, [], 'No missing local assets or fonts');
        row.passed = true;
      } catch (error) { row.error = String(error.stack || error); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), fullPage: true }).catch(() => {}); }
      finally { await context.close(); save(); }
    }
  }
  assert.equal(report.cases.length, 10); assert(report.cases.every(row => row.passed), 'Every actual live and quick VAR journey passes'); assert.equal(report.controls.length, 3);
} finally { await browser?.close(); server.kill(); report.sourceAfter = sourceHashes(); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); save(); }
assert(report.sourceHeld, 'Native proof never changes product source');
console.log('playCmVar: 2 viewports, 4 actual review outcomes, 8 settled live reports, 2 actual quick reports, 2 mid-match reloads, 3 effective controls; zero external forwarding and source held.');
