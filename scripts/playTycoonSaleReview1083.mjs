/* Actual built sale review, equal-clock cancellation and durable engine outcomes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'Sale review native verification runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = path.join(ROOT, 'tycoon-sale-review-artifacts');
const OUT = path.join(ARTIFACTS, 'native');
const CACHE = path.resolve(process.env.TYCOON_SALE_FONT_CACHE || path.join(ARTIFACTS, 'font-cache'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(CACHE, { recursive: true });
  const manifest = [];
  async function download(url) {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
    assert(response.ok, 'Actual font dependency succeeds');
    const body = Buffer.from(await response.arrayBuffer()), file = hash(url);
    fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: hash(body) });
    return body.toString('utf8');
  }
  const css = await download(sheets[0]);
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))];
  assert(urls.length > 0);
  for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prepared ${manifest.length} actual sale-review font dependencies.`);
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(row => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
  assert(/^[a-f0-9]{64}$/.test(row.file));
  const body = fs.readFileSync(path.join(CACHE, row.file)); assert.equal(hash(body), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
assert(fonts.has(sheets[0]));
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')));
function treeHashes(directory) {
  const out = {};
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(ROOT, relative), { withFileTypes: true })) {
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(name); else if (entry.isFile()) out[name] = hash(fs.readFileSync(path.join(ROOT, name)));
    }
  };
  walk(directory); return out;
}
const sourceHashes = () => ({ ...treeHashes('src'), ...Object.fromEntries(['index.html', 'package.json', 'package-lock.json', 'scripts/playTycoonSaleReview1083.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs'].map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))])) });
const cacheHashes = () => Object.fromEntries(fs.readdirSync(CACHE).map(file => [file, hash(fs.readFileSync(path.join(CACHE, file)))]));
const report = { complete: false, sourceBefore: sourceHashes(), buildBefore: treeHashes('dist'), cacheBefore: cacheHashes(), cases: [], controls: [], forwardedWrites: 0,
  limits: ['Two explicitly staged source-built sale-ready grounds, not a naturally played campaign.', 'One accepted trusted sale per journey; rapid duplicate activation is not exercised.', 'Academy contains a real generated prospect but no first team, so its unopened panel does not tick.', 'Clocked match rewards may change before sale; paired pages must earn identical rewards. The sale itself must preserve exact Academy and rewards bytes.', 'Synthetic pagehide events sample both actual save handlers equally; final departure uses real browser navigation.'] };
const save = () => write('report.json', report);
save();
const { build } = await import('esbuild');
const { chromium } = await import('./lib/playwrightLoader.mjs');
const built = await build({ absWorkingDir: ROOT, stdin: { contents: "export * as T from './src/lib/stadiumTycoon'; export * as A from './src/lib/wonderkidFactory'; export * as R from './src/lib/tycoonRewards';", resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
const bundlePath = path.join(OUT, 'independent-engine.mjs');
fs.writeFileSync(bundlePath, built.outputFiles[0].contents); write('independent-engine-metafile.json', built.metafile);
assert(!Object.keys(built.metafile.inputs).some(file => /useStadiumTycoon|TycoonSaleReview|pages\/StadiumTycoon/.test(file)), 'Independent expected results exclude product UI and hook');
const { T, A, R } = await import(pathToFileURL(bundlePath).href);
const NOW = Date.UTC(2026, 9, 7, 12), START = NOW + 1000, SEED = 10831007, SAVE_KEY = T.TYCOON_SAVE_KEY;
const protectedStorage = { 'unrelated-career-save': '{"keep":"exact"}', 'dukb-local-completions': '[]', 'dukb-streaks-v1': '{}', 'dukb-play-diary-v1': '[]' };
const academy = A.newFactory(START, 1083);
academy.prospects.push(A.makeProspectInBand(academy, 70, 80, () => 0.3));
const academyBytes = A.serialize(academy);
assert(A.deserialize(academyBytes, START));
const ledger = R.creditFullTimes(R.newLedger(1083), [{ totalMatches: 1, result: 'win', away: false, position: 1, division: 0 }, { totalMatches: 2, result: 'win', away: false, position: 1, division: 0 }]);
const ledgerBytes = JSON.stringify(ledger);
function checkOwnedGear(bytes) {
  const value = JSON.parse(bytes);
  assert.deepEqual(R.cleanLedger(value, 1083), value, 'Actual mounted rewards retain valid source-earned receipts');
  assert(value.gearUnlocked.length > 0 && value.gearTitles.some(match => match > 0) && value.kitUpgrades > 0, 'Actual mounted rewards retain owned gear and an earned kit upgrade');
}
checkOwnedGear(ledgerBytes);
const first = T.newTycoon(START);
Object.assign(first, { money: 700, lifetime: T.prestigeThreshold(first), totalMatches: 2, matchNo: 2 });
first.levels.stands = 3; first.staffLevels = { [T.STAFF[0].id]: 2 }; T.settleFirsts(first, []);
let late = T.newTycoon(START);
Object.assign(late, { rep: 2, league: T.newLeague(2, 4, 0), bestDivision: 4, ticketPolicy: 'premium', legacyPoints: 9, legacyPerks: { rolling: 3, sway: 2 } });
late.levels.stands = 12; late.levels.squad = 50; late.staffLevels = { [T.STAFF[0].id]: 4 };
let draws = 0, fixtureSteps = 0;
while (!(late.league.matchday === T.leagueShape(4).matchdays - 1 && late.minute === 84)) {
  assert(++fixtureSteps < 3000, 'Actual engine reaches the final-match fixture within budget');
  late = T.tick(late, 1.4, () => (++draws % 2 ? 0 : 1)).state;
  assert.equal(late.league.division, 4, 'Fixture stops before its promotion');
}
late.lifetime = Math.max(late.lifetime, T.prestigeThreshold(late)); late.savedAt = START; T.settleFirsts(late, []);
const fixtures = [
  { id: 'first-ground', state: first, staging: 'Actual newTycoon plus explicit eligibility, cash, first staff/stand levels and two historical match counters. Actual settleFirsts supplies earned latches.' },
  { id: 'late-ground', state: late, staging: 'Explicit reputation/division/perks/staff/premium setup, followed by actual tick minutes with alternating goal/miss input to reach minute 84 of the final match. Eligibility is then staged. No table or result is invented.' },
];
for (const fixture of fixtures) { fixture.bytes = T.serializeTycoon(fixture.state, START); fixture.loaded = T.deserializeTycoon(fixture.bytes, START); assert(fixture.loaded && T.canPrestige(fixture.loaded)); }
write('fixtures.json', { fixtures, academyBytes, ledgerBytes, fixtureSteps, fixtureDraws: draws });
report.baseline = { engineSha256: hash(built.outputFiles[0].contents), inputPaths: Object.keys(built.metafile.inputs), clockStart: START, seed: SEED };
const configured = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/^export const SUPABASE_URL = "([^"]+)";/m);
assert(configured); const serviceOrigin = new URL(configured[1]).origin;
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser, activePage;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Owned server timeout: ${serverLog}`)), 15000); server.once('error', error => { clearTimeout(timer); reject(error); }); server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}`)); }); server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); });
const pane = page => page.locator('[data-tycoon-sale-review]');
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function snapshot(page, flush = false) {
  return page.evaluate(shouldFlush => {
    if (shouldFlush) window.dispatchEvent(new PageTransitionEvent('pagehide'));
    const state = window.__saleNative;
    return { storage: Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b))), writes: structuredClone(state.writes), rng: { seed: state.seed, draws: state.draws }, now: Date.now(), performance: performance.now(), visibility: document.visibilityState, scrollY, frames: state.frames, pagehide: structuredClone(state.pagehide), events: structuredClone(state.events) };
  }, flush);
}
async function terms(page) {
  return pane(page).evaluate(node => {
    const read = name => { const el = node.querySelector(`[data-sale-${name}]`); return el ? { text: el.textContent.trim(), value: el.getAttribute(`data-sale-${name}`) } : null; };
    return { award: read('award'), cash: read('starting-cash'), current: read('rep-current'), next: read('rep-next'), resets: read('resets'), keeps: read('keeps'), help: read('help') };
  });
}
function checkTerms(value, state) {
  assert.equal(value.award.text, `+${T.pointsForSale(state)}`, 'Visible legacy award equals the actual current engine');
  assert.equal(Number(value.award.value), T.pointsForSale(state));
  assert.equal(value.cash.text, T.fmtMoney(T.startingMoneyOf(state)), 'Visible starting cash equals actual Rolling Investment');
  assert.equal(Number(value.cash.value), T.startingMoneyOf(state));
  assert.equal(value.current.text, `x${T.repMult(state).toFixed(2)}`, 'Visible current reputation equals actual engine');
  assert.equal(value.next.text, `x${T.repMult({ ...state, rep: state.rep + 1 }).toFixed(2)}`, 'Visible next reputation equals actual engine');
  assert.equal(Number(value.next.value), T.repMult({ ...state, rep: state.rep + 1 }));
  for (const phrase of ["This ground's earnings reset to 0", `Fans return to ${T.newTycoon(0).fanbase}`, 'Ground upgrades and staff start at level 0', T.DIVISIONS[0].name, 'current match, table, win streak and temporary boosts reset', 'Ticket offer returns to Standard']) assert(value.resets.text.includes(phrase), `Actual reset disclosure: ${phrase}`);
  for (const phrase of ['club name, reputation, legacy points and perks', 'badges, league titles and career records', 'Academy players, first team, gems and gear stay as they are']) assert(value.keeps.text.includes(phrase), `Actual retention disclosure: ${phrase}`);
}
async function geometry(page) {
  return pane(page).evaluate(node => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const text = el => ({ ...box(el), text: el.textContent, font: parseFloat(getComputedStyle(el).fontSize), scroll: el.scrollWidth, client: el.clientWidth });
    return { viewport: { width: innerWidth, height: innerHeight }, visualViewport: { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop }, documentWidth: document.documentElement.scrollWidth, pane: box(node), scrollY,
      buttons: [...node.querySelectorAll('button')].map(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { ...text(el), name: el.getAttribute('aria-label') || el.textContent, hit: hit === el || el.contains(hit) }; }),
      text: [...node.querySelectorAll('p,dt,dd')].map(text), critical: [...node.querySelectorAll('[data-sale-award],[data-sale-starting-cash],[data-sale-rep-next],[data-sale-save-error]')].map(text) };
  });
}
function checkGeometry(value) {
  const visible = r => r.x >= -1 && r.right <= value.viewport.width + 1 && r.y >= -1 && r.bottom <= value.viewport.height + 1;
  assert(value.documentWidth <= value.viewport.width + 1, 'Sale review has no horizontal page overflow');
  assert(visible(value.pane), 'Sale review fits the viewport');
  for (const node of value.critical) assert(visible(node), 'Sale rewards and refusal notice are visible without driver scrolling');
  for (const node of value.buttons) { assert(node.width >= 44 && node.height >= 44, 'Sale controls have 44px targets'); assert(visible(node) && node.hit, 'Sale controls are visible and own their hit targets'); }
  for (const node of [...value.text, ...value.buttons]) { assert(node.font >= 12, 'Sale text is at least 12px'); assert(node.scroll <= node.client + 1, 'Sale text is not clipped horizontally'); }
}
async function activate(page, locator, touch) {
  const r = await locator.boundingBox(); assert(r && r.width >= 44 && r.height >= 44, 'Trusted action targets a 44px control');
  assert(await locator.evaluate(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return hit === node || node.contains(hit); }), 'Trusted action target is visible and uncovered');
  if (touch) await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  else { await locator.evaluate(node => node.focus({ preventScroll: true })); await page.keyboard.press('Enter'); }
}
async function openPage(profile, fixture, row, arm) {
  const evidence = { arm, network: [], unexpectedRequests: [], fontResponses: [], errors: [], consoleErrors: [], writeEvents: [], pagehideEvents: [], sockets: [] };
  row.arms.push(evidence);
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: Object.entries({ ...protectedStorage, [SAVE_KEY]: fixture.bytes, [A.SAVE_KEY]: academyBytes, [R.REWARDS_KEY]: ledgerBytes, 'dukb-theme': profile.theme, 'dukb-guest-handle': 'SaleReview-1083', 'cookie-consent': 'essential', 'rules-gate-seen:/stadium-tycoon': '1' }).map(([name, value]) => ({ name, value })) }] } });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
    const receipt = { url: url.href, method: request.method(), type: request.resourceType(), handling: 'blocked' }; evidence.network.push(receipt);
    if (request.method() === 'GET' && fonts.has(url.href)) { const font = fonts.get(url.href); evidence.fontResponses.push({ url: url.href, sha256: hash(font.body), bytes: font.body.length }); receipt.handling = 'actual cached font'; return route.fulfill({ status: 200, ...font }); }
    if (request.method() === 'GET' && url.origin === serviceOrigin && url.pathname === '/rest/v1/live_scores') { receipt.handling = 'explicit locally fulfilled empty live board'; return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    evidence.unexpectedRequests.push(receipt); return route.abort();
  });
  await context.routeWebSocket('**/*', socket => { evidence.sockets.push(socket.url()); socket.close(); });
  await context.addInitScript(({ seed, key }) => {
    window.__saleNative = { seed, draws: 0, frames: 0, writes: [], events: [], pagehide: [], refuse: false };
    Math.random = () => { const s = window.__saleNative; s.draws++; s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; };
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function(...args) {
        if (this !== localStorage) return original.apply(this, args);
        const refused = method === 'setItem' && args[0] === key && window.__saleNative.refuse;
        const event = { method, key: method === 'clear' ? '*' : args[0], value: args[1] == null ? null : String(args[1]), refused, now: Date.now() };
        window.__saleNative.writes.push(event); console.log('SALE_NATIVE_WRITE ' + JSON.stringify(event));
        if (refused) throw new DOMException('Injected device quota refusal', 'QuotaExceededError');
        return original.apply(this, args);
      };
    }
    addEventListener('pagehide', event => { const receipt = { trusted: event.isTrusted, now: Date.now(), visibility: document.visibilityState }; window.__saleNative.pagehide.push(receipt); console.log('SALE_NATIVE_HIDE ' + JSON.stringify(receipt)); }, true);
    for (const type of ['pointerup', 'keydown', 'click']) addEventListener(type, event => window.__saleNative.events.push({ type, key: event.key, trusted: event.isTrusted, target: event.target instanceof Element ? event.target.closest('button')?.textContent : null }), true);
  }, { seed: SEED, key: SAVE_KEY });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15000);
  page.on('pageerror', error => evidence.errors.push(String(error)));
  page.on('console', message => { const text = message.text(); if (text.startsWith('SALE_NATIVE_WRITE ')) evidence.writeEvents.push(JSON.parse(text.slice(18))); else if (text.startsWith('SALE_NATIVE_HIDE ')) evidence.pagehideEvents.push(JSON.parse(text.slice(17))); else if (message.type() === 'error') evidence.consoleErrors.push(text); });
  page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) evidence.errors.push(`Local response ${response.status()}: ${response.url()}`); });
  await page.clock.install({ time: NOW }); await page.clock.pauseAt(START);
  await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' }); await page.locator('[data-sell-up]').waitFor();
  evidence.fonts = await page.evaluate(async () => { await document.fonts.ready; const out = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) { const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Sell up review'); out.push({ family, weight, faces: faces.map(face => ({ family: face.family, status: face.status })) }); } return out; });
  assert(evidence.fonts.every(row => row.faces.length && row.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === row.family)), 'All eight actual font faces loaded');
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => raf.call(window, time => { window.__saleNative.frames++; callback(time); });
  });
  assert.equal(await page.evaluate(() => Date.now()), START, 'Initial load does not advance the controlled clock');
  return { page, context, evidence };
}
try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of [{ width: 320, height: 780, touch: true, theme: 'dark', reduced: true }, { width: 390, height: 844, touch: true, theme: 'light', reduced: false }, { width: 1280, height: 720, touch: false, theme: 'light', reduced: false }]) for (const fixture of fixtures) {
    const row = { id: `${profile.width}-${fixture.id}`, profile, fixture: fixture.id, staging: fixture.staging, complete: false, arms: [], stages: [], steps: [], screenshots: [] }; report.cases.push(row); save();
    const baseline = await openPage(profile, fixture, row, 'no-review'), actual = await openPage(profile, fixture, row, 'review'), page = actual.page;
    const advance = async (label, ms) => { row.steps.push({ label, actualMs: ms, baselineMs: ms }); await baseline.page.clock.runFor(ms); await page.clock.runFor(ms); };
    const capture = async name => { const file = `${row.id}-${name}.png`; await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.screenshots.push(file); save(); };
    const paired = async label => {
      const a = await snapshot(page, true), b = await snapshot(baseline.page, true);
      row.stages.push({ label, actual: a, baseline: b }); save();
      assert.equal(a.visibility, 'visible'); assert.equal(b.visibility, 'visible', 'Both arms run in equivalent foreground environments');
      assert.equal(a.now, b.now); assert.equal(a.performance, b.performance, 'Both arms have identical elapsed clocks');
      assert.deepEqual(a.storage, b.storage, 'Review and cancellation preserve the actual equal-clock full saves');
      assert.deepEqual(a.rng, b.rng, 'Review and cancellation consume no extra RNG');
      assert.deepEqual(a.writes, b.writes, 'Review and cancellation add no write beyond the matched running baseline');
      assert.equal(a.storage[A.SAVE_KEY], academyBytes, 'Unopened Academy bytes stay exact');
      for (const [key, value] of Object.entries(protectedStorage)) assert.equal(a.storage[key], value);
      return a;
    };
    await advance('initial real frames', 256);
    const initial = await paired('initial');
    checkOwnedGear(initial.storage[R.REWARDS_KEY]);
    assert(initial.frames > 0, 'Actual requestAnimationFrame callbacks ran');
    const trigger = page.locator('[data-sell-up]'); await trigger.scrollIntoViewIfNeeded();
    const triggerY = await page.evaluate(() => scrollY);
    await activate(page, trigger, profile.touch); await advance('open review', 256);
    let before = await paired('opened'); checkTerms(await terms(page), JSON.parse(before.storage[SAVE_KEY])); checkGeometry(await geometry(page)); await capture('review');
    assert(Math.abs(await page.evaluate(() => scrollY) - triggerY) <= 1, 'Opening sale review preserves the reached gameplay viewport');
    await activate(page, button(page, 'Sell up help'), profile.touch); await advance('open worked help', 256);
    before = await paired('help'); const helpText = await page.locator('[data-sale-help]').innerText(), current = JSON.parse(before.storage[SAVE_KEY]);
    assert(helpText.includes(`taking your balance from ${T.legacyPointsOf(current)} to ${T.legacyPointsOf(current) + T.pointsForSale(current)}`)); checkGeometry(await geometry(page)); await capture('help');
    await activate(page, button(page, 'Back to sale review'), profile.touch); await advance('help back', 256); await paired('help-back');
    await activate(page, button(page, 'Back'), profile.touch); await advance('cancel Back', 256); await pane(page).waitFor({ state: 'detached' }); await paired('back');
    assert(await trigger.evaluate(node => document.activeElement === node)); assert(Math.abs(await page.evaluate(() => scrollY) - triggerY) <= 1, 'Back restores focus without a page jump');
    await activate(page, trigger, profile.touch); await advance('reopen for Escape', 256); await page.keyboard.press('Escape'); await advance('cancel Escape', 256); await pane(page).waitFor({ state: 'detached' }); await paired('escape');
    assert(await trigger.evaluate(node => document.activeElement === node)); assert(Math.abs(await page.evaluate(() => scrollY) - triggerY) <= 1, 'Escape restores focus without a page jump');
    await activate(page, trigger, profile.touch); await advance('reopen for live terms', 256);
    const liveStart = await paired('live-start'); await advance('match keeps running during review', 10000); before = await paired('live-end');
    const liveState = JSON.parse(before.storage[SAVE_KEY]), oldState = JSON.parse(liveStart.storage[SAVE_KEY]);
    assert(liveState.money !== oldState.money, 'Actual ground continues earning during review');
    assert(liveState.minute !== oldState.minute || liveState.totalMatches !== oldState.totalMatches, 'Actual match clock keeps running during review');
    if (fixture.id === 'late-ground') assert(T.pointsForSale(liveState) > T.pointsForSale(oldState), 'An actual live promotion updates the displayed sale award');
    row.liveTerms = await terms(page); checkTerms(row.liveTerms, liveState); checkGeometry(await geometry(page)); await capture('live-terms');
    if (fixture.id === 'late-ground') {
      for (const fault of ['award', 'cash', 'multiplier', 'font', 'offscreen-action']) {
        const target = fault === 'offscreen-action' ? button(page, 'Sell and restart') : page.locator(fault === 'cash' ? '[data-sale-starting-cash]' : fault === 'multiplier' ? '[data-sale-rep-next]' : '[data-sale-award]');
        const original = await target.evaluate(node => ({ text: node.textContent, style: node.getAttribute('style') }));
        const control = { id: row.id, fault, baselineState: liveState, before: { terms: await terms(page), geometry: await geometry(page) }, original }; report.controls.push(control);
        try {
          await target.evaluate((node, fault) => { if (fault === 'font') node.style.setProperty('font-size', '1px', 'important'); else if (fault === 'offscreen-action') node.style.setProperty('transform', 'translateY(1000px)', 'important'); else node.textContent = fault === 'cash' ? '$1' : fault === 'multiplier' ? 'x99.00' : '+999'; }, fault);
          control.faulted = { terms: await terms(page), geometry: await geometry(page) }; assert.notDeepEqual(control.faulted, control.before);
          const mapped = { award: 'Visible legacy award equals the actual current engine', cash: 'Visible starting cash equals actual Rolling Investment', multiplier: 'Visible next reputation equals actual engine', font: 'Sale text is at least 12px', 'offscreen-action': 'Sale controls are visible and own their hit targets' }[fault];
          let failure; try { if (['font', 'offscreen-action'].includes(fault)) checkGeometry(control.faulted.geometry); else checkTerms(control.faulted.terms, liveState); } catch (error) { failure = error; }
          assert.equal(failure?.name, 'AssertionError'); assert(failure.message.startsWith(mapped), 'DOM control reaches its named assertion'); control.error = { name: failure.name, message: failure.message }; await capture(`fault-${fault}`);
        } finally {
          await target.evaluate((node, original) => { node.textContent = original.text; if (original.style === null) node.removeAttribute('style'); else node.setAttribute('style', original.style); }, original);
          control.restored = { terms: await terms(page), geometry: await geometry(page) }; assert.deepEqual(control.restored, control.before, 'DOM fault restores exact geometry and text'); checkTerms(control.restored.terms, liveState); checkGeometry(control.restored.geometry); save();
        }
      }
      before = await paired('before-refusal');
      await page.evaluate(() => { window.__saleNative.refuse = true; });
      await activate(page, button(page, 'Sell and restart'), profile.touch); await page.locator('[data-sale-save-error]').waitFor();
      const refused = await snapshot(page); row.refusals = [refused]; assert.equal(refused.storage[SAVE_KEY], before.storage[SAVE_KEY], 'Refused sale retains exact old save bytes');
      assert.deepEqual(refused.storage, before.storage, 'Refused sale preserves every stored byte');
      assert.deepEqual(refused.rng, before.rng, 'Refused sale does not consume RNG'); checkGeometry(await geometry(page)); await capture('refused');
      await advance('ground runs after refusal', 2000);
      await activate(page, button(page, 'Sell and restart'), profile.touch); const refusedAgain = await snapshot(page); row.refusals.push(refusedAgain);
      assert.equal(refusedAgain.storage[SAVE_KEY], before.storage[SAVE_KEY], 'Repeated refusal retains old save');
      for (const key of [A.SAVE_KEY, R.REWARDS_KEY, ...Object.keys(protectedStorage)]) assert.equal(refusedAgain.storage[key], refused.storage[key], 'Refused retry preserves Academy, gear, rewards and unrelated bytes');
      assert.equal(refusedAgain.writes.filter(value => value.refused).length, 2, 'Two trusted refused attempts reach actual storage');
      await page.evaluate(() => { window.__saleNative.refuse = false; });
      const a = await snapshot(page, true), b = await snapshot(baseline.page, true); row.stages.push({ label: 'latest-ground-after-refusal', actual: a, baseline: b });
      assert.deepEqual(a.storage, b.storage, 'Failed sale preserves actual memory and all continuing ground outcomes'); assert.deepEqual(a.rng, b.rng);
      assert.equal(a.now, b.now); assert.equal(a.performance, b.performance); assert.equal(a.visibility, 'visible'); assert.equal(b.visibility, 'visible');
      assert.notDeepEqual(JSON.parse(a.storage[SAVE_KEY]), JSON.parse(before.storage[SAVE_KEY]), 'Retry uses an actually advanced ground');
      checkTerms(await terms(page), JSON.parse(a.storage[SAVE_KEY])); before = a;
    } else before = await paired('before-sale');
    checkOwnedGear(before.storage[R.REWARDS_KEY]);
    const beforeState = JSON.parse(before.storage[SAVE_KEY]), oracleInput = clone(beforeState), originalRandom = Math.random;
    let expected, expectedBytes, oracleDraws = 0;
    try { Math.random = () => { oracleDraws++; throw new Error('Independent sale unexpectedly consumes global RNG'); }; expected = T.prestige(oracleInput, before.now); expectedBytes = T.serializeTycoon(expected, before.now); }
    finally { Math.random = originalRandom; }
    assert.equal(oracleDraws, 0); assert.deepEqual(oracleInput, beforeState); assert.notDeepEqual(expected, beforeState);
    write(`${row.id}-expected-sale.json`, { before: beforeState, inputAfter: oracleInput, expected, expectedBytes, oracleDraws, rng: before.rng, now: before.now });
    await activate(page, button(page, 'Sell and restart'), profile.touch);
    await page.waitForFunction(({ key, rep }) => JSON.parse(localStorage.getItem(key)).rep === rep, { key: SAVE_KEY, rep: expected.rep });
    const sold = await snapshot(page); row.stages.push({ label: 'accepted-sale', actual: sold });
    assert.equal(sold.storage[SAVE_KEY], expectedBytes, 'One accepted sale saves the exact independent engine serialization');
    assert.deepEqual(sold.rng, before.rng, 'Accepting the sale consumes no global RNG');
    const saleWrites = sold.writes.slice(before.writes.length); assert.equal(saleWrites.length, 1, 'One accepted activation makes one sale write'); assert.equal(saleWrites[0].value, expectedBytes); assert.equal(saleWrites[0].refused, false);
    for (const key of [A.SAVE_KEY, R.REWARDS_KEY, ...Object.keys(protectedStorage)]) assert.equal(sold.storage[key], before.storage[key], 'Sale preserves exact Academy, gear, rewards and unrelated bytes');
    await capture('accepted-sale'); row.acceptedEvents = sold.events;
    const departureWrites = actual.evidence.writeEvents.length;
    await page.goto(`${BASE}/robots.txt`, { waitUntil: 'load' });
    const departed = await snapshot(page); row.stages.push({ label: 'real-pagehide-departure', actual: departed }); assert.equal(departed.storage[SAVE_KEY], expectedBytes, 'Actual pagehide retains the sold ground');
    assert(actual.evidence.pagehideEvents.some(event => event.trusted), 'Actual browser departure delivered a trusted pagehide');
    assert(actual.evidence.writeEvents.slice(departureWrites).some(event => event.key === SAVE_KEY && event.value === expectedBytes && !event.refused), 'Actual departure invoked the sold-ground save handler');
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' }); await page.locator('[data-room="stadium"]').waitFor();
    const reloaded = await snapshot(page); row.stages.push({ label: 'reloaded-before-flush', actual: reloaded });
    assert.equal(reloaded.storage[SAVE_KEY], expectedBytes, 'Immediate reload retains the exact saved sale bytes');
    const expectedLoaded = T.deserializeTycoon(expectedBytes, reloaded.now);
    assert(expectedLoaded, 'Independent actual loader accepts the sold ground');
    const expectedReloadBytes = T.serializeTycoon(expectedLoaded, reloaded.now);
    row.reloadOracle = { input: expectedBytes, now: reloaded.now, state: expectedLoaded, bytes: expectedReloadBytes };
    const restored = await snapshot(page, true); row.stages.push({ label: 'reloaded-ref-flushed', actual: restored });
    assert.equal(restored.storage[SAVE_KEY], expectedReloadBytes, 'Actual restored in-memory ground matches the complete independent loader result');
    const restoredWrites = restored.writes.slice(reloaded.writes.length);
    assert.equal(restoredWrites.length, 1, 'Reload proof invokes the actual save handler once');
    assert.equal(restoredWrites[0].key, SAVE_KEY); assert.equal(restoredWrites[0].value, expectedReloadBytes); assert.equal(restoredWrites[0].refused, false);
    assert.equal(await page.locator('[data-sell-up]').count(), 0, 'Reload does not offer an already-spent sale');
    for (const key of [A.SAVE_KEY, R.REWARDS_KEY, ...Object.keys(protectedStorage)]) {
      assert.equal(reloaded.storage[key], sold.storage[key], 'Immediate reload preserves protected bytes');
      assert.equal(restored.storage[key], sold.storage[key], 'Restored-memory save preserves protected bytes');
    }
    await capture('reloaded');
    assert(row.acceptedEvents.some(event => event.trusted && event.type === (profile.touch ? 'pointerup' : 'keydown')));
    for (const arm of row.arms) { assert.deepEqual(arm.errors, []); assert.deepEqual(arm.consoleErrors, []); assert.deepEqual(arm.unexpectedRequests, []); assert.deepEqual(arm.sockets, []); assert(arm.network.every(request => request.method === 'GET')); }
    row.complete = true; save(); await actual.context.close(); await baseline.context.close(); activePage = null;
  }
  assert.equal(report.cases.length, 6); assert(report.cases.every(row => row.complete)); assert.equal(report.controls.length, 15); report.complete = true;
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack };
  if (activePage && !activePage.isClosed()) { try { write('failure-snapshot.json', await snapshot(activePage)); await activePage.screenshot({ path: path.join(OUT, 'failure.png'), fullPage: false }); } catch {} }
  throw error;
} finally {
  report.sourceAfter = sourceHashes(); report.buildAfter = treeHashes('dist'); report.cacheAfter = cacheHashes();
  try { assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore); }
  catch (error) { report.complete = false; report.sourceHoldError = error.message; throw error; }
  finally { save(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); await browser?.close(); server.kill(); }
}
console.log('Tycoon sale review: 6 actual-route sale journeys and equal-clock baselines.');
console.log('15 effective restored DOM controls, actual engine sale and saved refusal/retry.');
console.log('Academy and sale-time rewards/gear bytes held; no forwarded writes.');
console.log('Actual source, build, fonts and full observed states retained.');
