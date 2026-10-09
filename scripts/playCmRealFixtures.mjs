import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Club Manager fixture journeys run only on remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.CM_REAL_FIXTURE_NATIVE_ARTIFACTS || path.join(ROOT, 'cm-real-fixture-artifacts/native'));
const ENGINE_OUT = path.resolve(process.env.CM_REAL_FIXTURE_ARTIFACTS || path.join(ROOT, 'cm-real-fixture-artifacts/outcomes'));
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'cm-real-fixture-artifacts/font-cache'));
const KEY = 'dukb-club-manager-save', FIXTURE_KEY = 'premier-2026-27-v1', NOW = 1791547200000, SEED = 118401;
const LABEL = 'Real 2026/27 Premier League opponent order and home/away venues. Calendar dates and results are simulated.';
const clone = value => JSON.parse(JSON.stringify(value)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = ['src/lib/clubManager.ts', 'src/lib/clubManagerFixtures.ts', 'src/data/clubManagerPremierFixtures2026.ts',
  'scripts/data/clubManagerPremierFixtures2026.receipt.json', 'src/components/club-manager/CalendarCard.tsx',
  'src/components/club-manager/CalendarScreen.tsx', 'src/components/club-manager/ClubManagerHelp.tsx', 'scripts/playCmRealFixtures.mjs'];
const sourceHashes = () => Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
fs.mkdirSync(OUT, { recursive: true });
const report = { cases: [], controls: [], sourceBefore: sourceHashes(), forwardedExternalRequests: 0 };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/clubManagerPremierFixtures2026.receipt.json')));
assert.equal(receipt.ledgerKey, FIXTURE_KEY);
const sourcedRounds = Array.from({ length: 38 }, (_, round) => [...new Map(receipt.sources.find(s => s.role === 'official').rows.filter(r => r.round === round + 1).map(r => [`${r.home}|${r.away}`, [r.home, r.away]])).values()]);
assert(sourcedRounds.every(round => round.length === 10), 'Independent source contains all 380 directed fixtures');
const withinRoundPairs = rounds => rounds.map(round => round.map(pair => JSON.stringify(pair)).sort());
const realPairs = sourcedRounds[0];
assert.equal(realPairs.length, 10, 'Independent source contains all ten real opening pairings');
const evertonPair = realPairs.find(pair => pair.includes('Everton')); assert(evertonPair);
const fontCache = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'))).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(hash(body), entry.sha256); return [entry.url, { body, contentType: entry.contentType }];
}));
const bundled = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager'; export * as calendar from './src/lib/clubManagerCalendar';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'browser', format: 'iife', globalName: '__cmFixtureOracle', write: false, alias: { '@': path.join(ROOT, 'src') },
  define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, loader: { '.css': 'empty' }, logLevel: 'error' });
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
  const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, oracleContext, oracle, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned fixture server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned fixture server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
async function expectedSeason(state, seed, play = false) {
  return oracle.evaluate(({ state, seed, play, now }) => {
    const { cm, calendar } = window.__cmFixtureOracle, oldRandom = Math.random, OldDate = Date; let t = seed >>> 0;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    Math.random = () => { t = (t + 0x6d2b79f5) | 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      const entry = state.calendar[state.week], fixture = cm.fixtureFor(state, entry), days = calendar.seasonDays(state);
      const day = [...days.entryDays.values()].find(d => d.weekIdx === state.week);
      const pairs = cm.careerRoundPairs(state, entry.round), coverage = cm.careerFixtureCoverage(state);
      const generated = cm.roundPairs(state.leagueClubs, entry.round, !!state.balancedFixtures);
      const played = play ? cm.playNextEntry(state, { skipHalftime: true }) : null;
      return JSON.parse(JSON.stringify({ fixture, day, dateLabel: calendar.shortDate(day.date), pairs, generated, coverage, played: played && { ...played, state: cm.trimCareer(played.state) } }));
    } finally { Math.random = oldRandom; window.Date = OldDate; }
  }, { state, seed, play, now: NOW });
}
async function expectedReload(state) {
  return oracle.evaluate(({ state, key, now }) => {
    const { cm } = window.__cmFixtureOracle, OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    try {
      localStorage.setItem(key, JSON.stringify(state)); const loaded = cm.loadCareer();
      if (!loaded || !cm.saveCareer(loaded)) throw new Error('Unchanged loader oracle did not preserve a valid career');
      return { state: JSON.parse(localStorage.getItem(key)), bytes: localStorage.getItem(key), pairs: Array.from({ length: 38 }, (_, round) => cm.careerRoundPairs(loaded, round)) };
    } finally { window.Date = OldDate; }
  }, { state, key: KEY, now: NOW });
}
function compareSaved(actual, expected, id, stage, message) {
  const differences = [];
  function walk(a, b, location) {
    if (Object.is(a, b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const actualPresent = Object.hasOwn(a, key), expectedPresent = Object.hasOwn(b, key);
        if (!actualPresent || !expectedPresent) differences.push({ path: `${location}.${key}`, actualPresent, expectedPresent, actual: a[key], expected: b[key] });
        else walk(a[key], b[key], `${location}.${key}`);
      }
    } else differences.push({ path: location, actual: a, expected: b });
  }
  walk(actual, expected, '$');
  for (const [name, value] of [['expected', expected], ['actual', actual], ['diff', differences]]) fs.writeFileSync(path.join(OUT, `${id}-${stage}-${name}.json`), JSON.stringify(value, null, 2));
  assert.deepEqual(actual, expected, message);
}
function roundResults(state, pairs) {
  const ledger = state.pairResults?.premier; assert(ledger, 'Opening round records the human and neutral result ledger');
  assert.deepEqual(Object.keys(ledger).sort(), pairs.map(([home, away]) => `${home}|${away}`).sort(), 'Exactly the sourced human and nine neutral pairings settle');
  for (const row of state.table) {
    const pair = pairs.find(pair => pair.includes(row.club)); assert(pair);
    const [hg, ag] = ledger[`${pair[0]}|${pair[1]}`], mine = pair[0] === row.club ? hg : ag, theirs = pair[0] === row.club ? ag : hg;
    assert.deepEqual({ w: row.w, d: row.d, l: row.l, gf: row.gf, ga: row.ga, pts: row.pts },
      { w: Number(mine > theirs), d: Number(mine === theirs), l: Number(mine < theirs), gf: mine, ga: theirs, pts: mine > theirs ? 3 : mine === theirs ? 1 : 0 }, 'Every table row agrees with its actual opening result');
  }
}
async function journey(profile, kind, fixture) {
  const id = `${profile.width}-${kind}`, row = { id, errors: [], assetErrors: [], intercepted: [], screenshots: [] }; report.cases.push(row);
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width === 390, hasTouch: profile.width === 390, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url()); if (url.origin === BASE) return route.continue();
    row.intercepted.push({ method: request.method(), origin: url.origin });
    if (fontCache.has(url.href)) return route.fulfill({ status: 200, ...fontCache.get(url.href) });
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { row.assetErrors.push(`Uncached font ${url.href}`); return route.abort(); }
    return route.fulfill({ status: 200, contentType: request.resourceType() === 'image' ? 'image/svg+xml' : 'application/json',
      body: request.resourceType() === 'image' ? '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' : '[]' });
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.addInitScript(({ now, fixture, key }) => {
    const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential'); if (fixture && !sessionStorage.getItem('cm-fixture-seeded')) {
      sessionStorage.setItem('cm-fixture-seeded', '1'); localStorage.setItem(key, JSON.stringify(fixture)); }
    window.__cmFixtureInputs = 0;
  }, { now: NOW, fixture, key: KEY });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') row.errors.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
  page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY), bytes = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const activate = async button => { if (profile.width === 390) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) }); row.screenshots.push(`${id}-${name}.png`); };
  const captureVisible = async (target, name) => {
    const diagnostics = await target.evaluate(element => new Promise(resolve => {
      const frames = []; let previous = '', stable = 0, frame = 0, finished = false;
      const finish = passed => { if (finished) return; finished = true; clearTimeout(timeout); cancelAnimationFrame(frame); resolve({ passed, frames }); };
      const timeout = setTimeout(() => finish(false), 2000);
      const sample = () => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element), ancestors = [];
        for (let node = element.parentElement; node; node = node.parentElement) {
          const css = getComputedStyle(node);
          ancestors.push({ tag: node.tagName, scrollTop: node.scrollTop, scrollLeft: node.scrollLeft,
            overflow: css.overflow, display: css.display, visibility: css.visibility, opacity: css.opacity });
        }
        const animations = document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length;
        const viewport = { width: innerWidth, height: innerHeight, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth };
        const box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, right: rect.right };
        const ownStyle = { display: style.display, visibility: style.visibility, opacity: style.opacity };
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        const readable = element.isConnected && rect.width > 0 && rect.height > 0 && rect.x >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
          && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0
          && ancestors.every(css => css.display !== 'none' && css.visibility === 'visible' && Number(css.opacity) > 0) && element.contains(hit);
        const signature = JSON.stringify({ box, viewport, ownStyle, ancestors });
        stable = readable && animations === 0 && signature === previous ? stable + 1 : 0; previous = signature;
        frames.push({ box, viewport, style: ownStyle, ancestors, animations, readable, stable });
        if (stable >= 3) finish(true); else frame = requestAnimationFrame(sample);
      };
      frame = requestAnimationFrame(sample);
    }));
    (row.captureDiagnostics ??= {})[name] = diagnostics;
    fs.writeFileSync(path.join(OUT, `${id}-${name}-layout.json`), JSON.stringify(diagnostics, null, 2));
    assert(diagnostics.passed, `${name}: the actual content must become readable and stable after its native interaction`);
    assert(diagnostics.frames.at(-1).viewport.documentWidth <= profile.width + 1, `${name}: the stable screenshot has no horizontal overflow`);
    await shot(name);
  };
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    if (kind === 'real') {
      await activate(page.getByRole('button', { name: /2026-27/ }));
      await activate(page.getByRole('button', { name: /^England/ }));
      await activate(page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ hasText: 'Premier League' }));
      await activate(page.getByRole('button').filter({ has: page.getByText('Everton', { exact: true }) }));
      await activate(page.getByRole('button', { name: 'Take the job', exact: true }));
      await activate(page.getByRole('button', { name: 'Skip: just manage', exact: true }));
    } else await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await page.locator('[data-cm-way="quick"]').waitFor(); await page.evaluate(() => document.fonts.ready);
    await oracle.reload({ waitUntil: 'domcontentloaded' }); await oracle.addScriptTag({ content: bundled.outputFiles[0].text });
    const before = await read(), inputBytes = await bytes();
    fs.writeFileSync(path.join(OUT, `${id}-input.json`), JSON.stringify(before, null, 2));
    if (kind !== 'real') {
      const initialized = await expectedReload(before);
      compareSaved(initialized.state, before, id, 'oracle-query', 'Loading the canonical query input preserves every field while registering its saved world');
      assert.equal(initialized.bytes, inputBytes, 'Canonical query input keeps identical serialized bytes');
    }
    const next = await expectedSeason(before, SEED);
    assert.equal(before.clubName, kind === 'later' ? fixture.clubName : 'Everton'); assert.equal(before.calendar[before.week].type, 'league');
    assert.equal(before.realLeagueFixtures, kind === 'real' ? FIXTURE_KEY : undefined, 'Only a newly eligible real first season holds the source key');
    if (kind === 'real') { assert.equal(next.fixture.opponent, evertonPair.find(name => name !== 'Everton')); assert.equal(next.fixture.home, evertonPair[0] === 'Everton'); }
    else { assert.equal(next.coverage, null); assert.deepEqual(next.pairs, next.generated, 'Legacy and later seasons retain the generated schedule'); }
    await activate(page.getByRole('button').filter({ has: page.getByText('Calendar', { exact: true }) }));
    await page.locator('[data-testid="cm-calendar-grid"]').waitFor();
    const coverage = page.locator(`[data-cm-fixture-coverage="${FIXTURE_KEY}"]`);
    if (kind === 'real') {
      assert((await coverage.innerText()).startsWith(LABEL), 'Real opponent order and venues are labelled separately from simulated dates and results');
      assert.deepEqual(await coverage.locator('a').evaluateAll(links => links.map(link => link.href)), receipt.sources.map(source => source.url), 'Calendar exposes both independently verified fixture sources');
    } else assert.equal(await coverage.count(), 0, 'Generated calendars make no real fixture claim');
    await page.locator('[data-testid="cm-calendar-grid"] button').last().focus();
    await captureVisible(page.locator('[data-testid="cm-calendar-grid"]'), 'calendar-overview');
    if (kind === 'real') { await coverage.locator('a').first().focus(); await captureVisible(coverage, 'calendar-sources'); }
    const venue = next.fixture.home ? 'vs' : 'at';
    const named = page.getByRole('button', { name: `${next.dateLabel}: ${venue} ${next.fixture.opponent} · ${next.fixture.compLabel}`, exact: true });
    await named.waitFor(); assert.match(await named.getAttribute('aria-label'), new RegExp(`${venue} ${next.fixture.opponent}`));
    await activate(named); assert((await page.locator('[data-testid="cm-calendar-day"]').innerText()).includes(`${venue} ${next.fixture.opponent}`));
    if (!report.controls.includes('visible-fixture')) {
      const old = await named.getAttribute('aria-label'); await named.evaluate(el => el.setAttribute('aria-label', 'wrong fixture control'));
      assert.equal(await page.getByRole('button', { name: old, exact: true }).count(), 0, 'Changed actual calendar fixture is detected');
      await page.locator('[aria-label="wrong fixture control"]').evaluate((el, label) => el.setAttribute('aria-label', label), old); await named.waitFor(); report.controls.push('visible-fixture');
    }
    await captureVisible(page.locator('[data-testid="cm-calendar-day"]'), 'calendar'); assert(await bytes() === inputBytes, 'Calendar inspection preserves every saved byte');
    const helpTrigger = page.getByRole('button', { name: 'How to play', exact: true }); await activate(helpTrigger);
    const help = page.getByRole('dialog', { name: 'How to Play Club Manager' }); await help.waitFor();
    assert.match(await help.innerText(), /opponent order|fixture order/i); assert.match(await help.innerText(), /dates.*simulated|simulated.*dates/i);
    await page.waitForFunction(dialog => dialog.contains(document.activeElement), await help.elementHandle(), { timeout: 2000 });
    await captureVisible(help, 'help');
    await page.keyboard.press('Escape'); await help.waitFor({ state: 'hidden' });
    await page.waitForFunction(trigger => document.activeElement === trigger, await helpTrigger.elementHandle(), { timeout: 2000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Calendar and help fit the viewport');
    const firstReload = kind === 'real' ? await expectedReload(before) : null;
    if (firstReload) { assert.equal(firstReload.state.realLeagueFixtures, FIXTURE_KEY); assert.deepEqual(withinRoundPairs(firstReload.pairs), withinRoundPairs(sourcedRounds), 'First-load repairs keep all 38 sourced pairings and venues'); }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await page.locator('[data-cm-way="quick"]').waitFor();
    if (firstReload) {
      compareSaved(await read(), firstReload.state, id, 'first-reload', 'First real reload exactly matches the unchanged loader on the identical full input');
      assert.equal(await bytes(), firstReload.bytes, 'First-load serialization matches the entire unchanged loader result');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
      await page.locator('[data-cm-way="quick"]').waitFor(); assert.equal(await bytes(), firstReload.bytes, 'Canonical real save reloads byte-for-byte without further repairs');
    } else assert.equal(await bytes(), inputBytes, 'Already loaded legacy and later saves reload byte-for-byte');
    const playedBefore = await read();
    await oracle.reload({ waitUntil: 'domcontentloaded' }); await oracle.addScriptTag({ content: bundled.outputFiles[0].text });
    const initialized = await expectedReload(playedBefore);
    compareSaved(initialized.state, playedBefore, id, 'oracle-settlement', 'The fresh oracle loads the identical canonical input and registers its complete saved world');
    assert.equal(initialized.bytes, await bytes(), 'Canonical settlement input keeps identical serialized bytes');
    const expected = await expectedSeason(playedBefore, SEED, true); assert.equal(expected.played.kind, 'match');
    await page.locator('[data-cm-way="quick"]').evaluate((button, seed) => button.addEventListener('click', () => {
      window.__cmFixtureInputs++; let t = seed >>> 0; Math.random = () => { t = (t + 0x6d2b79f5) | 0; let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    }, { capture: true, once: true }), SEED);
    await activate(page.locator('[data-cm-way="quick"]'));
    await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: KEY, week: playedBefore.week + 1 });
    await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor();
    const after = await read(); compareSaved(after, expected.played.state, id, 'settlement', 'Actual Quick Sim writes the complete unchanged engine result');
    assert.equal(after.resultLog.length, playedBefore.resultLog.length + 1); assert.equal(after.resultLog.at(-1).opp, next.fixture.opponent); assert.equal(after.resultLog.at(-1).home, next.fixture.home);
    if (kind === 'real') {
      roundResults(after, realPairs); row.realNeutralResults = 9;
      if (!report.controls.includes('neutral-result')) {
        const defect = clone(after); delete defect.pairResults.premier[`${realPairs[0][0]}|${realPairs[0][1]}`];
        assert.notDeepEqual(defect, after); assert.throws(() => roundResults(defect, realPairs), /Exactly the sourced human and nine neutral pairings settle/); report.controls.push('neutral-result');
      }
    }
    assert.equal(await page.evaluate(() => window.__cmFixtureInputs), 1, 'One actual Quick Sim press settles one fixture');
    await shot('result'); row.savedHash = hash(await bytes());
    await activate(page.getByRole('button', { name: 'Continue', exact: true }).first());
    await page.locator('[data-cm-way="quick"]').waitFor(); await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="cm-slot-1"]').waitFor(); assert.equal(hash(await bytes()), row.savedHash, 'Result and source key reload without duplicate fixture credit');
    assert.deepEqual(row.errors, [], 'No console or unhandled page errors'); assert.deepEqual(row.assetErrors, [], 'No missing local assets or fonts');
    row.passed = true; return playedBefore;
  } catch (error) { row.error = String(error.stack || error); await shot('failure').catch(() => {}); throw error; }
  finally { await context.close(); saveReport(); }
}
try {
  await ready; browser = await pw.chromium.launch({ headless: true }); oracleContext = await browser.newContext(); oracle = await oracleContext.newPage();
  const oracleUrl = `${BASE}/__fixture-oracle`; await oracle.route(oracleUrl, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await oracle.goto(oracleUrl); await oracle.addScriptTag({ content: bundled.outputFiles[0].text });
  const laterBytes = fs.readFileSync(path.join(ENGINE_OUT, 'native-later-season.json')), later = JSON.parse(laterBytes);
  const completed = JSON.parse(fs.readFileSync(path.join(ENGINE_OUT, 'native-later-season-receipt.json')));
  assert.equal(later.season, 2); assert.equal(later.realLeagueFixtures, undefined); assert.equal(completed.nativeSaveSha256, hash(laterBytes));
  assert.equal(completed.season, 1); assert.equal(completed.nextSeason, 2); assert.equal(completed.club, later.clubName);
  assert.equal(completed.settledRounds, 38); assert.equal(completed.fixtureKeyAfter, null);
  assert.equal(completed.matches, 380); assert.equal(completed.results.length, 380); assert.equal(completed.played.length, 20);
  assert(completed.played.every(([, played]) => played === 38), 'Later-season native input follows an actually completed 38-round campaign');
  assert.deepEqual(completed.played.map(([club]) => club).sort(), [...new Set(realPairs.flat())].sort());
  for (const profile of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    let started; try { started = await journey(profile, 'real'); } catch {}
    if (started) { const legacy = clone(started); delete legacy.realLeagueFixtures; try { await journey(profile, 'legacy', legacy); } catch {} }
    try { await journey(profile, 'later', later); } catch {}
  }
  assert.equal(report.cases.length, 6, 'All three save kinds are reached at both widths'); assert(report.cases.every(row => row.passed), 'Every actual fixture calendar and Quick Sim journey passes'); assert.equal(report.controls.length, 2);
} finally { await oracleContext?.close(); await browser?.close(); server.kill(); report.sourceAfter = sourceHashes(); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); saveReport(); }
assert(report.sourceHeld, 'Native fixture proof never changes product source');
console.log('playCmRealFixtures: 2 viewports, 6 real/legacy/later-season calendar and actual Quick Sim journeys, 18 neutral real-opening results, 2 effective controls; full saved states and source bytes held.');
