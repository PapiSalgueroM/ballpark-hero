/* Remote baseline only. No product implementation or positive feature credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { mulberry } from '../lib/tycoonBots.mjs';
import { loadFonts, seed, sha, checkFonts, shellFixture } from './siteMenuNavigationSupport.mjs';

/** @typedef {import('../../src/lib/stadiumTycoon').TycoonState} TycoonState */
const MAIN = 'bd0c07bf72dc0214842202fe2f931b14c65d82dc';
const BASE = 'http://127.0.0.1:4173', ROUTE = '/stadium-tycoon';
const ROOT = process.cwd(), DIST = path.resolve('dist'), OUT = process.env.STADIUM_BASELINE_OUT;
const CLOCK = Date.parse('2026-10-29T18:00:00.000Z');
const HELD = {
  'src/lib/stadiumTycoon.ts': '7ae67d9000bd6e371a7745b458060a0d3bdd6c8dc893c743cfdde46231b6280e',
  'src/hooks/useStadiumTycoon.ts': '0fc0bb748d4c4af39175ee53e9cefa06a512631076e553c38809d080f03d3a3e',
  'src/pages/StadiumTycoon.tsx': 'de6b232611eab80fd3b0abf3a351522b106d95673669fd959a6ec96f8ec9c3ee',
  'src/data/gameContent/stadiumManagement.ts': '12e4d14201b7901b3f84317a3698dbe4c91a582301e296b032eb46e695b2c804',
  'scripts/lib/tycoonBots.mjs': 'c8355e28c950442debed80eeabf43dc55334960a8bf560a5b4c901db6671c95a',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
};
const SOURCES = [...Object.keys(HELD), 'src/components/tycoon/TycoonPitch.tsx', 'src/lib/season/law.ts',
  'src/lib/leagueCore.ts', 'src/App.tsx', 'scripts/qa/playStadiumLatePlanBaseline.mjs'];
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pins = () => SOURCES.map(file => { const body = fs.readFileSync(file); return { path: file, bytes: body.length, sha256: sha(body),
  gitBlob: createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex') }; });
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}
const stateHash = value => sha(Buffer.from(JSON.stringify(value)));
assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''), 'REMOTE_BASELINE_ONLY');
assert.equal(process.env.EXPECTED_PARENT, MAIN);
assert.equal(process.env.EXPECTED_MAIN, MAIN);
assert(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'OUTPUT_OUTSIDE_SOURCE');
fs.mkdirSync(OUT, { recursive: true }); assert.equal(fs.readdirSync(OUT).length, 0);
const report = { schema: 1, status: 'BASELINE_NOT_ADMITTED', source: process.env.GITHUB_SHA, parent: MAIN, mainAtPlan: MAIN,
  mainAtStart: process.env.ACTUAL_MAIN_AT_START, fixtureTime: CLOCK, profile: { width: 390, height: 844, theme: 'light' },
  healthyFoundation: false, ownedFailure: null, methodFailure: null, io: [], wire: { pageErrors: [], console: [], failed: [], sockets: [] }, images: [] };
function checkWire() {
  assert(report.io.some(row => row.kind === 'prepared-font') && !report.io.some(row => row.kind === 'unknown-refused'), 'KNOWN_IO_ONLY');
  assert.equal(report.wire.pageErrors.length, 0); assert.equal(report.wire.sockets.length, 0);
  const aborted = report.io.filter(row => row.kind === 'source-shell-backend-abort'), allowed = new Set(['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector']);
  const known = row => aborted.some(request => request.url === row.url && request.method === row.method);
  for (const row of report.wire.failed) assert(allowed.has(row.error) && known(row), 'EXPLAINED_REQUEST_FAILURE');
  for (const row of report.wire.console.filter(row => row.type === 'error')) assert(report.wire.failed.some(request => allowed.has(request.error) && known(request) && request.url === row.url && row.text === 'Failed to load resource: ' + request.error), 'EXPLAINED_CONSOLE_ERROR');
}
let browser, context, before;
try {
  before = pins(); write('source-before.json', before);
  for (const row of before) if (HELD[row.path]) assert.equal(row.sha256, HELD[row.path], 'HELD_SOURCE:' + row.path);
  assert.equal(before.find(row => row.path === 'src/components/tycoon/TycoonPitch.tsx').gitBlob, '1ef131f61360f7da36e7c1befc18ad409194d8af');
  const generated = path.join(OUT, 'actual-engine.mjs');
  const bundled = await build({ entryPoints: [path.join(ROOT, 'src/lib/stadiumTycoon.ts')], bundle: true, format: 'esm',
    platform: 'node', outfile: generated, metafile: true, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  write('engine-metafile.json', bundled.metafile);
  const T = await import(pathToFileURL(generated).href);
  assert.equal(T.TYCOON_SAVE_KEY, 'stadiumTycoonSaveV1');
  /** @type {Readonly<TycoonState>} */
  const original = freeze(T.newTycoon(CLOCK));
  const beforeHash = stateHash(original);
  const play = (whichSeed, minutes) => {
    /** @type {TycoonState} */
    const state = structuredClone(original);
    const events = [], random = mulberry(whichSeed); let calls = 0;
    const roll = () => { calls++; return random(); };
    let at65 = null;
    for (let minute = 0; minute < minutes; minute++) {
      T.playMinute(state, roll, events, { pay: true }, 0);
      if (minute === 64) at65 = { state: structuredClone(state), events: structuredClone(events), calls };
    }
    return { state, events, calls, at65 };
  };
  let fixture, selectedSeed;
  for (let candidate = 1; candidate <= 4096; candidate++) {
    const played = play(candidate, 65);
    if (played.state.goalsFor === 1 && played.state.goalsAgainst === 0) { fixture = played; selectedSeed = candidate; break; }
  }
  assert(fixture && selectedSeed, 'FINITE_ENGINE_FIXTURE_SEARCH');
  assert.equal(fixture.calls, 130); assert.equal(fixture.state.minute, 65); assert.equal(fixture.state.totalMatches, 0);
  assert.equal(fixture.state.totalGoals, 1); assert.equal(fixture.state.matchNo, 0);
  assert.equal(fixture.events.length, 1); assert.equal(fixture.events[0].kind, 'goal');
  const paid = fixture.events.reduce((sum, event) => sum + (event.amount ?? 0), 0);
  assert.equal(fixture.state.money, original.money + paid); assert.equal(fixture.state.lifetime, original.lifetime + paid);
  const full = play(selectedSeed, 90), repeated = play(selectedSeed, 90);
  assert.deepEqual(full, repeated, 'EXACT_NEUTRAL_REPEAT');
  assert.deepEqual(full.at65, { state: fixture.state, events: fixture.events, calls: 130 }, 'SAME_CALLER_STREAM_PREFIX');
  assert.equal(full.calls, 180); assert.equal(full.state.minute, 0); assert.equal(full.state.totalMatches, 1);
  assert.equal(full.state.matchNo, 1); assert.equal(full.events.filter(event => ['win', 'draw', 'loss'].includes(event.kind)).length, 1);
  assert.equal(full.state.totalGoals, full.events.filter(event => event.kind === 'goal').length);
  const fullPaid = full.events.reduce((sum, event) => sum + (event.amount ?? 0), 0);
  assert.equal(full.state.money, original.money + fullPaid); assert.equal(full.state.lifetime, original.lifetime + fullPaid);
  assert.equal(stateHash(original), beforeHash, 'FROZEN_ORIGINAL_INPUT_UNCHANGED');
  const generatedSave = T.serializeTycoon(fixture.state, CLOCK);
  const loaded = T.deserializeTycoon(generatedSave, CLOCK); assert(loaded, 'REAL_GENERATED_SAVE_LOADS');
  const omitEmptyMaps = value => { const { staffLevels, legacyPerks, ...rest } = value; return rest; };
  assert.deepEqual(omitEmptyMaps(loaded), omitEmptyMaps(fixture.state), 'ONLY_EXISTING_ZERO_MAP_NORMALIZATION');
  assert.equal(Object.keys(fixture.state.staffLevels).length, 0); assert.equal(Object.keys(fixture.state.legacyPerks).length, 0);
  assert(Object.values(loaded.staffLevels).every(level => level === 0) && Object.values(loaded.legacyPerks).every(level => level === 0));
  const live = freeze(loaded), raw = T.serializeTycoon(live, CLOCK);
  assert.deepEqual(T.deserializeTycoon(raw, CLOCK), live, 'ACTUAL_SERIALIZER_LOADER_ROUNDTRIP');
  assert.equal(T.serializeTycoon(T.deserializeTycoon(raw, CLOCK), CLOCK), raw, 'ACTUAL_SERIALIZED_BYTES_ROUNDTRIP');
  write('neutral-original-input.json', original); write('neutral-full90.json', full);
  write('fixture65.json', { type: 'TycoonState', origin: 'ACTUAL_NEW_TYCOON_AND_65_PLAY_MINUTE_CALLS', fixtureTime: CLOCK, selectedSeed,
    seedsTried: selectedSeed, bound: 4096, originalInputSHA256: beforeHash, generatedStateSHA256: stateHash(fixture.state), stateSHA256: stateHash(live), callerRolls: fixture.calls,
    generatedState: fixture.state, existingLoaderNormalizedFields: ['staffLevels', 'legacyPerks'], generatedSaveSHA256: sha(generatedSave), state: live, events: fixture.events,
    saveKey: T.TYCOON_SAVE_KEY, serializedSHA256: sha(raw), full90CallerRolls: full.calls, full90StateSHA256: stateHash(full.state), full90EventsSHA256: stateHash(full.events) });
  fs.writeFileSync(path.join(OUT, 'fixture65.save.json'), raw, { flag: 'wx' });
  console.log('STADIUM_NEUTRAL_BASELINE: actual engine seed ' + selectedSeed + ', live65 caller rolls130, full90 caller rolls180, repeated outputs exact and frozen input held.');
  const manifestBytes = fs.readFileSync(path.join(DIST, '.vite/manifest.json')), manifest = JSON.parse(manifestBytes);
  const entry = manifest['src/pages/StadiumTycoon.tsx'];
  assert(entry?.src === 'src/pages/StadiumTycoon.tsx' && entry.isDynamicEntry && /^assets\/[A-Za-z0-9._-]+\.js$/.test(entry.file), 'ACTUAL_STADIUM_DYNAMIC_ENTRY');
  write('compiled-route-authority.json', { source: 'src/pages/StadiumTycoon.tsx', sourceSHA256: HELD['src/pages/StadiumTycoon.tsx'],
    manifestSHA256: sha(manifestBytes), entry, compiledSHA256: sha(fs.readFileSync(path.join(DIST, entry.file))) });
  const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
  browser = await pw.chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', serviceWorkers: 'block' });
  await context.addInitScript(seed, { theme: 'light', pending: false });
  await context.addInitScript(({ key, saved }) => localStorage.setItem(key, saved), { key: T.TYCOON_SAVE_KEY, saved: raw });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), item = { method: request.method(), url: request.url(), type: request.resourceType(), externalForwarded: false };
    try {
      assert(!url.username && !url.password && !url.hash);
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(item.method) && request.postData() === null);
        const freshness = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
        assert(!url.search || freshness);
        const isRoute = ['/', ROUTE].includes(url.pathname), file = path.resolve(DIST, '.' + decodeURIComponent(url.pathname), isRoute ? 'index.html' : '');
        assert(file.startsWith(DIST + path.sep) && fs.statSync(file).isFile() && fs.realpathSync(file).startsWith(fs.realpathSync(DIST) + path.sep));
        report.io.push({ ...item, kind: 'completed-dist', file: path.relative(DIST, file) }); return route.continue();
      }
      if (item.method === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(item.type)) {
        const font = fonts.get(url.href); report.io.push({ ...item, kind: 'prepared-font', sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      const known = shellFixture(request, url);
      if (known) { report.io.push({ ...item, kind: 'source-shell-backend-abort', classifier: known.id }); return route.abort('blockedbyclient'); }
      throw new Error('UNKNOWN_REQUEST');
    } catch (error) { report.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', socket => { report.wire.sockets.push(socket.url()); socket.close({ code: 1008, reason: 'Offline baseline' }); });
  const page = await context.newPage();
  page.on('pageerror', error => report.wire.pageErrors.push(String(error)));
  page.on('console', message => report.wire.console.push({ type: message.type(), text: message.text(), url: message.location().url }));
  page.on('requestfailed', request => report.wire.failed.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText || null }));
  await page.clock.install({ time: CLOCK - 60000 });
  await page.clock.pauseAt(CLOCK);
  await page.clock.setFixedTime(CLOCK);
  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded' });
  await page.clock.runFor(64); report.clock = { installedBeforeNavigation: true, fixedDateNow: CLOCK, pausedTimers: true, explicitRenderMilliseconds: 64 };
  await page.getByRole('heading', { name: 'STADIUM TYCOON', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('[data-tycoon-pitch]').waitFor({ state: 'visible', timeout: 10000 });
  await page.evaluate(async () => { await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); await document.fonts.ready; });
  const pitch = page.locator('[data-tycoon-pitch]');
  assert.equal(await pitch.count(), 1);
  assert(await pitch.getByText('YOU 1', { exact: true }).isVisible(), 'REAL_HOME_SCORE');
  assert(await pitch.getByText("65'", { exact: true }).isVisible(), 'REAL_MINUTE65');
  assert(await pitch.getByText('0', { exact: true }).isVisible(), 'REAL_AWAY_SCORE');
  assert(await pitch.getByText(T.opponentName(live), { exact: true }).isVisible(), 'REAL_ENGINE_OPPONENT');
  assert.equal(await page.locator('[data-room="stadium"]').getAttribute('aria-pressed'), 'true');
  assert(await page.getByRole('button', { name: 'How it works', exact: true }).isVisible(), 'REAL_REOPENABLE_HELP');
  assert.equal(await page.getByRole('dialog', { name: 'While you were away', exact: true }).count(), 0);
  assert.equal(await page.getByRole('dialog', { name: 'How Stadium Tycoon works', exact: true }).count(), 0, 'REAL_EXISTING_SAVE_SKIPS_FIRST_VISIT_HELP');
  const sample = await page.evaluate(key => ({ href: location.href, dateNow: Date.now(), performanceNow: performance.now(), rawSave: localStorage.getItem(key),
    heading: [...document.querySelectorAll('h1')].map(node => node.textContent), pitch: (() => { const node = document.querySelector('[data-tycoon-pitch]'), r = node.getBoundingClientRect(); return { text: node.textContent.trim(), rect: { x: r.x, y: r.y, width: r.width, height: r.height } }; })(),
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) } }), T.TYCOON_SAVE_KEY);
  checkFonts(sample.fonts); assert.equal(sample.dateNow, CLOCK); assert.equal(sample.rawSave, raw);
  assert.equal(new URL(sample.href).pathname, ROUTE); assert(sample.pitch.rect.width > 0 && sample.pitch.rect.height > 0);
  write('healthy65-observation.json', sample);
  const file = 'stadium-minute65-live1-0.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  const image = fs.readFileSync(path.join(OUT, file)); report.images.push({ file, bytes: image.length, sha256: sha(image), normal: true });
  report.healthyFoundation = true;
  const decision = { groupCount: await page.getByRole('group', { name: 'Late-match plan', exact: true }).count(), buttons: [] };
  for (const name of ['Protect the lead', 'Balanced', 'Chase a goal']) decision.buttons.push({ name, count: await page.getByRole('button', { name, exact: true }).count() });
  write('actual-decision-observation.json', decision);
  assert.equal(decision.groupCount, 0, 'BASELINE_EXPECTS_ACTUAL_MISSING_GROUP');
  assert(decision.buttons.every(button => button.count === 0), 'BASELINE_EXPECTS_ACTUAL_MISSING_CONTROLS');
  report.ownedFailure = { marker: 'OWNED_MISSING_FEATURE', accessibleName: 'Late-match plan', expectedControls: 3, actual: decision };
  checkWire();
  report.status = 'EXPECTED_OWNED_MISSING_FEATURE';
} catch (error) { report.methodFailure = String(error.stack || error); report.status = 'BASELINE_NOT_ADMITTED'; }
finally {
  if (context) await context.close().catch(error => { report.methodFailure = String(error); report.status = 'BASELINE_NOT_ADMITTED'; });
  if (browser) await browser.close().catch(error => { report.methodFailure = String(error); report.status = 'BASELINE_NOT_ADMITTED'; });
  if (report.healthyFoundation) try { checkWire(); } catch (error) { report.methodFailure = String(error.stack || error); report.status = 'BASELINE_NOT_ADMITTED'; }
  try { const after = pins(); write('source-after.json', after); assert.deepEqual(after, before, 'SOURCE_BEFORE_AFTER_HELD'); }
  catch (error) { report.methodFailure = String(error.stack || error); report.status = 'BASELINE_NOT_ADMITTED'; }
  write('report.json', report);
}
if (report.status === 'EXPECTED_OWNED_MISSING_FEATURE' && report.healthyFoundation && !report.methodFailure) {
  console.error('OWNED_MISSING_FEATURE: actual healthy Stadium minute65 1-0 has no accessible Late-match plan or its three controls.');
  process.exitCode = 1;
} else { console.error('BASELINE_NOT_ADMITTED: ' + report.methodFailure); process.exitCode = 2; }
