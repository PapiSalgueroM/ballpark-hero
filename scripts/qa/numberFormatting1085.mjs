/* Actual built routes and saved fictional records. Remote display verification only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'Number formatting native verification runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'number-formatting-artifacts/native');
const CACHE = path.resolve(process.env.NUMBER_FORMATTING_ASSET_CACHE || path.join(ROOT, 'number-formatting-artifacts/font-cache/manifest.json'));
const NOW = Date.parse('2026-10-07T12:00:00.000Z'), SEED = 10851007;
const profiles = [
  { width: 320, height: 780, touch: true, theme: 'dark', reduced: true },
  { width: 390, height: 844, touch: true, theme: 'light', reduced: false },
  { width: 1280, height: 720, touch: false, theme: 'light', reduced: false },
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(sheets.length, 1, 'Actual template has one font stylesheet');
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const manifest = [];
  const fetchAsset = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url); assert.equal(response.status, 200);
    const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
    fs.writeFileSync(path.join(path.dirname(CACHE), file), body);
    manifest.push({ url, file, sha256: digest(body), contentType: response.headers.get('content-type') }); return body;
  };
  for (const sheet of sheets) {
    const css = (await fetchAsset(sheet)).toString('utf8');
    for (const url of new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/g)].map(match => match[1]))) await fetchAsset(url);
  }
  assert(manifest.length > 1); fs.writeFileSync(CACHE, JSON.stringify(manifest, null, 2));
  console.log(`Number formatting: cached ${manifest.length} actual font assets.`); process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build the actual app first');
const entries = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const assets = new Map(entries.map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(path.dirname(CACHE), entry.file)); assert.equal(digest(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(assets.has(sheets[0]));
const payloadHashes = () => Object.fromEntries(entries.map(entry => [entry.file, digest(fs.readFileSync(path.join(path.dirname(CACHE), entry.file)))]));
const serviceOrigin = new URL(fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/export const SUPABASE_URL = "([^"]+)";/)[1]).origin;
function hashes(directories, extras = []) {
  const result = {};
  const walk = relative => { for (const entry of fs.readdirSync(path.join(ROOT, relative), { withFileTypes: true })) {
    const file = `${relative}/${entry.name}`; if (entry.isDirectory()) walk(file); else if (entry.isFile()) result[file] = digest(fs.readFileSync(path.join(ROOT, file)));
  } };
  directories.forEach(walk); for (const file of extras) result[file] = digest(fs.readFileSync(path.join(ROOT, file))); return result;
}
const sourceHashes = () => hashes(['src'], ['index.html', 'package.json', 'package-lock.json', 'scripts/qa/numberFormatting1085.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs']);
const writeJSON = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
const report = { started: new Date().toISOString(), complete: false,
  scope: 'Six actual built-route display cases. Fictional saved numeric records, trusted touch/keyboard navigation, exact storage holds and independently specified displayed strings.',
  limits: ['No full campaign or earned career totals claim. Recorded stress values are explicitly staged on real engine-created states.', 'Tycoon browser time advances only 128ms, below its unchanged 200ms simulation threshold. No stadium tap, purchase, sale or scored completion is exercised.', 'Readability covers changed numeric leaves and used navigation controls, not all older metadata.', 'No production read, write, scoring or socket is forwarded.'],
  sourceBefore: sourceHashes(), buildBefore: hashes(['dist']), assetManifestBefore: digest(fs.readFileSync(CACHE)), assetPayloadBefore: payloadHashes(), cases: [], controls: [], forwardedWrites: 0 };
const save = () => writeJSON('report.json', report);
save();

function fixtureEnvironment() {
  const OriginalDate = Date, originalRandom = Math.random, originalFetch = globalThis.fetch;
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), oldSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
  const memory = new Map(), writes = [], transport = []; let seed = SEED, draws = 0;
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  Math.random = () => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => { writes.push({ method: 'setItem', key, value: String(value) }); memory.set(key, String(value)); },
    removeItem: key => { writes.push({ method: 'removeItem', key }); memory.delete(key); }, clear: () => { writes.push({ method: 'clear' }); memory.clear(); } } });
  globalThis.fetch = async url => { transport.push(String(url)); throw new Error('Fixture engine transport is prohibited'); };
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: class { constructor(url) { transport.push(String(url)); throw new Error('Fixture engine sockets are prohibited'); } } });
  return { snapshot: () => ({ seed, draws, now: Date.now(), writes: clone(writes), transport: clone(transport) }), restore: () => {
    globalThis.Date = OriginalDate; Math.random = originalRandom; globalThis.fetch = originalFetch;
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
    if (oldSocket) Object.defineProperty(globalThis, 'WebSocket', oldSocket); else delete globalThis.WebSocket;
  } };
}

const { build } = await import('esbuild');
const { chromium } = await import('../lib/playwrightLoader.mjs');
const engineFile = path.join(OUT, 'fixture-engine.mjs');
const bundle = await build({ absWorkingDir: ROOT, stdin: { contents: `export * as T from './src/lib/stadiumTycoon'; export * as N from './src/lib/nflMyCareer'; export { keyedRng } from './src/lib/keyedRng'; export { defaultAppearance } from './src/lib/soccerCareerAppearance';`, resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
fs.writeFileSync(engineFile, bundle.outputFiles[0].contents); writeJSON('fixture-engine-metafile.json', bundle.metafile);
const env = fixtureEnvironment(); let fixtures;
try {
  const beforeImport = env.snapshot(), E = await import(pathToFileURL(engineFile).href), afterImport = env.snapshot();
  report.fixtureEngine = { sha256: digest(bundle.outputFiles[0].contents), beforeImport, afterImport };
  const tycoonOrigin = E.T.newTycoon(NOW), tycoon = clone(tycoonOrigin);
  Object.assign(tycoon, { money: 9999, lifetime: 10000, totalWins: 1234, totalGoals: 5678, totalTaps: 12345, totalMatches: 2345 });
  const tycoonBytes = E.T.serializeTycoon(tycoon, NOW), parsed = E.T.deserializeTycoon(tycoonBytes, NOW);
  assert(parsed); for (const key of ['money', 'lifetime', 'totalWins', 'totalGoals', 'totalTaps', 'totalMatches']) assert.equal(parsed[key], tycoon[key]);
  const rng = E.keyedRng('number-formatting-1085'), career = E.N.startCareer('Native Number Review', 'QB', E.N.ARCHETYPES.QB[0], rng, E.defaultAppearance(), 'now');
  const careerOrigin = clone(career), actualSeasons = [];
  for (let i = 0; i < 2; i++) { E.N.simSeason(career, 78, rng); actualSeasons.push(clone(career.seasons.at(-1))); E.N.progress(career, rng); }
  assert.equal(career.seasons.length, 2);
  Object.assign(career.seasons[0], { year: 2026, ovr: 84, salary: 10.125, passYds: 4567, passTd: 32, ints: 8 });
  Object.assign(career.seasons[1], { year: 2027, ovr: 86, salary: 12.375, passYds: 5432, passTd: 37, ints: 9 });
  Object.assign(career, { year: 2028, ovr: 86, salary: 12.375, retired: false, pendingRivalryEvent: null, pendingRivalryChoice: null });
  const nflSave = { c: career, phase: 'season', teamQuality: 78, coach: null }, nflBytes = JSON.stringify(nflSave);
  const totals = E.N.careerTotals(career); assert.equal(totals.passYds, 9999); assert.equal(totals.passTd, 69);
  fixtures = { tycoon: { key: E.T.TYCOON_SAVE_KEY, bytes: tycoonBytes, state: tycoon, loaded: parsed,
    expected: { money: '$9,999', lifetime: '$10.0K', wins: '1,234', goals: '5,678', taps: '12,345', matches: '2,345' } },
    nfl: { key: 'nfl-my-career-save-v1', bytes: nflBytes, state: nflSave,
      expected: { seasonYards: '5,432', careerYards: '9,999 pass yds', year: '2027 season', ovr: '86', salary: '$12.375M', firstYards: '4,567', deltaYards: '+865' } } };
  writeJSON('fixture-origins.json', { tycoonOrigin, tycoonStaging: 'Display stress values only: money9999, lifetime10000, career wins1234/goals5678/taps12345/matches2345. Unchanged serializer and loader.', careerOrigin, actualSeasons,
    nflStaging: 'Two real engine seasons; recorded fields explicitly staged for display: years2026/2027, OVR84/86, salary10.125/12.375M, yards4567/5432, TD32/37, INT8/9. Current year2028, OVR86, salary12.375M; pending rivalry UI cleared.', finalEnvironment: env.snapshot() });
  assert.deepEqual(env.snapshot().writes, []); assert.deepEqual(env.snapshot().transport, []);
} finally { env.restore(); save(); }
writeJSON('fixtures.json', fixtures);

const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser, active;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Owned server timeout: ${serverLog}`)), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); }); server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
const protectedStorage = { soccerCareerSave: '{"native-protected":1085}', 'nba-my-career-save-v1': '{"keep":"nba"}', 'mlb-my-career-save-v1': '{"keep":"mlb"}', 'nhl-my-career-save-v1': '{"keep":"nhl"}', 'dukb-local-completions': '[]', 'dukb-streaks-v1': '{}', 'dukb-play-diary-v1': '[]' };
const snapshot = page => page.evaluate(() => ({ storage: Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b))), writes: structuredClone(window.__numberAudit.writes), rng: { seed: window.__numberAudit.seed, draws: window.__numberAudit.draws }, now: Date.now(), performance: performance.now(), scrollY, events: structuredClone(window.__numberAudit.events), focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.slice(0, 160) }));
async function fonts(page) {
  const value = await page.evaluate(async () => {
    await document.fonts.ready; const rows = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Numbers 1,234.50');
      rows.push({ family, weight, faces: faces.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
    } return rows;
  });
  assert(value.every(row => row.faces.length && row.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === row.family && face.weight === String(row.weight))), 'Eight actual template font faces load'); return value;
}
async function geometry(locator, profile) {
  return locator.evaluate((node, viewport) => {
    const r = node.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
    const textRects = [...range.getClientRects()].filter(r => r.width && r.height).map(r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom }));
    const style = getComputedStyle(node);
    return { text: node.textContent.trim(), html: node.outerHTML, box: { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }, textRects,
      font: parseFloat(style.fontSize), viewport, layoutViewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
      hit: node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)), scrollY };
  }, { width: profile.width, height: profile.height });
}
function checkGeometry(value, button = false) {
  const b = value.box, v = value.viewport;
  assert(b.x >= -1 && b.right <= v.width + 1 && b.y >= -1 && b.bottom <= v.height + 1, 'Measured leaf is visible within the physical viewport');
  assert(value.hit, 'Measured leaf owns its hit target');
  assert(value.documentWidth <= v.width + 1 && value.scrollWidth <= value.clientWidth + 1, 'Measured content has no horizontal overflow');
  if (button) assert(b.width >= 44 && b.height >= 44, 'Used navigation has a 44px target');
  else {
    assert(value.font >= 12, 'Changed numeric leaf is readable at 12px');
    assert(value.textRects.every(r => r.x >= b.x - 1 && r.right <= b.right + 1 && r.y >= b.y - 1 && r.bottom <= b.bottom + 1), 'Displayed number is not clipped');
  }
}
async function finiteAnimations(page) { await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); }); }
async function openCase(kind, profile) {
  const route = kind === 'tycoon' ? '/stadium-tycoon' : '/nfl-my-career', expectedStorage = { ...protectedStorage, [fixtures.tycoon.key]: fixtures.tycoon.bytes, [fixtures.nfl.key]: fixtures.nfl.bytes };
  const row = { id: `${profile.width}-${kind}`, kind, profile, route, complete: false, expectedStorage, stages: [], measured: [], navigation: [], screenshots: [], network: [], errors: [], consoleErrors: [], unexpected: [], sockets: [], assetResponses: [], clockAdvances: [] };
  report.cases.push(row); save();
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: Object.entries({ ...expectedStorage, 'cookie-consent': 'essential', 'dukb-theme': profile.theme, 'dukb-guest-handle': 'TidyAnchor-17', [`rules-gate-seen:${route}`]: '1' }).map(([name, value]) => ({ name, value })) }] } });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
    const entry = { method: request.method(), url: url.href, handling: 'blocked' }; row.network.push(entry);
    if (request.method() === 'GET' && assets.has(url.href)) { const asset = assets.get(url.href); entry.handling = 'actual cached asset'; row.assetResponses.push({ url: url.href, sha256: digest(asset.body), bytes: asset.body.length }); return route.fulfill({ status: 200, ...asset }); }
    if (request.method() === 'GET' && url.origin === serviceOrigin && url.pathname === '/rest/v1/live_scores') { entry.handling = 'explicit locally empty live score read'; return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    row.unexpected.push(entry); return route.abort();
  });
  await context.routeWebSocket('**/*', socket => { row.sockets.push(socket.url()); socket.close(); });
  await context.addInitScript(({ seed }) => {
    const s = window.__numberAudit = { seed, draws: 0, writes: [], events: [] };
    Math.random = () => { s.draws++; s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; };
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method]; Storage.prototype[method] = function(...args) {
        if (this === localStorage) s.writes.push({ method, key: method === 'clear' ? '*' : String(args[0]), value: method === 'setItem' ? String(args[1]) : null, now: Date.now() });
        return Reflect.apply(original, this, args);
      };
    }
    for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'focusin']) window.addEventListener(type, event => {
      s.events.push({ type, trusted: event.isTrusted, key: event.key, pointerType: event.pointerType, text: event.target?.textContent?.slice(0, 160), now: Date.now(), scrollY });
    }, true);
  }, { seed: SEED });
  const page = await context.newPage(); active = { page, row }; page.setDefaultTimeout(15000);
  page.on('pageerror', error => row.errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.errors.push(`${request.url()}: ${request.failure()?.errorText}`); });
  page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.errors.push(`${response.status()} ${response.url()}`); });
  await page.clock.install({ time: new Date(NOW - 1000) }); await page.clock.pauseAt(new Date(NOW));
  const advance = async (ms, why) => { row.clockAdvances.push({ ms, why }); await page.clock.runFor(ms); };
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.locator(kind === 'tycoon' ? '[data-tile="stats"]' : '[data-career-hub-buttons]').waitFor();
  row.fonts = await fonts(page); await advance(64, 'Initial layout and real reveal frames'); await finiteAnimations(page);
  const stage = async label => {
    const value = await snapshot(page); row.stages.push({ label, ...value }); save();
    for (const [key, bytes] of Object.entries(expectedStorage)) assert.equal(value.storage[key], bytes, `Display preserves saved bytes: ${key}`);
    assert(value.writes.every(write => !Object.hasOwn(expectedStorage, write.key) && write.method !== 'clear'), 'Display attempts no protected or career write'); return value;
  };
  const picture = async label => { const file = `${row.id}-${label}.png`; await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.screenshots.push(file); save(); };
  const navigate = async (locator, label) => { row.navigation.push(label); await locator.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' })); };
  const inspect = async (locator, expected, label, move = true) => {
    if (move) await navigate(locator, `Read ${label}`); const value = await geometry(locator, profile); row.measured.push({ label, expected, value }); save();
    assert.equal(value.text, expected, label); checkGeometry(value); return value;
  };
  const activate = async (locator, label, advanceMs = 64) => {
    await navigate(locator, `Use ${label}`); const value = await geometry(locator, profile); row.measured.push({ label, value, button: true }); save(); checkGeometry(value, true);
    if (profile.touch) await page.touchscreen.tap(value.box.x + value.box.width / 2, value.box.y + value.box.height / 2);
    else { await locator.focus(); await locator.press('Enter'); }
    if (advanceMs) await advance(advanceMs, label); await finiteAnimations(page);
  };
  const before = await stage('loaded');
  return { page, context, row, before, stage, picture, navigate, inspect, activate, advance };
}

async function fault(session, locator, name, wrong, expected, message) {
  const { page, row, stage, picture } = session;
  const beforeState = await stage(`${name}-before`), before = await geometry(locator, row.profile); checkGeometry(before); assert.equal(before.text, expected, message);
  const record = { caseId: row.id, name, mappedAssertion: message, before }; report.controls.push(record); save();
  await picture(`${name}-before`);
  try {
    await locator.evaluate((node, wrong) => { node.__numberOriginalChildren = [...node.childNodes]; node.replaceChildren(document.createTextNode(wrong)); }, wrong);
    record.faulted = await geometry(locator, row.profile); assert.notDeepEqual(record.faulted, before, 'DOM fault changes the actual rendered leaf'); assert.notEqual(record.faulted.text, before.text); save();
    await picture(`${name}-fault`);
    let caught; try { assert.equal(record.faulted.text, expected, message); } catch (error) { caught = error; }
    assert.equal(caught?.name, 'AssertionError'); assert(caught.message.startsWith(message)); record.rejected = { name: caught.name, message: caught.message, actual: caught.actual, expected: caught.expected }; save();
  } finally {
    await locator.evaluate(node => { node.replaceChildren(...node.__numberOriginalChildren); delete node.__numberOriginalChildren; });
    record.restored = await geometry(locator, row.profile); assert.deepEqual(record.restored, before, 'DOM fault restores exact markup and geometry'); assert.equal(record.restored.text, expected, message); checkGeometry(record.restored);
    const afterState = await stage(`${name}-restored`); assert.deepEqual(afterState.storage, beforeState.storage); assert.deepEqual(afterState.rng, beforeState.rng); assert.equal(afterState.now, beforeState.now); assert.equal(afterState.scrollY, beforeState.scrollY);
    await picture(`${name}-restored`); save();
  }
}
async function finish(session) {
  const { row, context, stage, before } = session, after = await stage('complete');
  assert.deepEqual(after.rng, before.rng, 'Reading formatted records consumes no random draw');
  assert(row.network.every(request => request.method === 'GET')); assert.deepEqual(row.unexpected, []); assert.deepEqual(row.sockets, []); assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []);
  assert(after.events.some(event => event.trusted && event.type === (row.profile.touch ? 'pointerup' : 'keydown')), 'Actual route navigation uses trusted browser input');
  row.complete = true; save(); await context.close(); active = null;
}

try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const tycoon = await openCase('tycoon', profile), { page, inspect, picture, activate, row } = tycoon;
    const money = page.locator('#dukb-main .text-3xl.font-display.text-gold.tabular-nums');
    await inspect(money, fixtures.tycoon.expected.money, 'Tycoon fallback money keeps exact grouped whole dollars'); await picture('money');
    await activate(page.locator('[data-tile="stats"]'), 'Records');
    for (const [label, expected] of [['Lifetime, this ground', '$10.0K'], ['Career wins', '1,234'], ['Career goals', '5,678'], ['Matches played', '2,345'], ['Taps', '12,345']]) {
      const value = page.getByText(label, { exact: true }).locator('..').locator('div').first();
      await inspect(value, expected, `Tycoon ${label}`);
    }
    await picture('records');
    const lifetime = page.locator('#dukb-main div.text-center.pb-4').filter({ hasText: /^lifetime / });
    await tycoon.navigate(lifetime, 'Read changed lifetime counts'); const lifetimeGeometry = await geometry(lifetime, profile); row.measured.push({ label: 'Tycoon lifetime line', value: lifetimeGeometry }); save(); checkGeometry(lifetimeGeometry);
    assert.match(lifetimeGeometry.text, /^lifetime \$10\.0K · 1,234 wins · 5,678 goals · 12,345 taps · match #1 · milestones \d+\/\d+ · badges \d+\/\d+$/, 'Lifetime line groups counts while keeping compact money and match identifiers'); await picture('lifetime');
    assert.equal(row.clockAdvances.reduce((total, value) => total + value.ms, 0), 128, 'Display leaves the actual Tycoon below its first 200ms simulation step');
    await finish(tycoon);

    const nfl = await openCase('nfl', profile), p = nfl.page, e = fixtures.nfl.expected;
    const summary = p.getByText(/^Career so far:/);
    await nfl.navigate(summary, 'Read actual career summary'); const summaryGeometry = await geometry(summary, profile); nfl.row.summary = summaryGeometry; save(); checkGeometry(summaryGeometry);
    assert(summaryGeometry.text.includes(e.careerYards), 'Career summary groups the sum of actual saved yard records'); await nfl.picture('career-summary');
    await nfl.activate(p.locator('[data-career-hub-buttons]').getByRole('button', { name: /Career Log/ }), 'Career Log');
    await p.locator('[data-season-tile="1"]').waitFor(); await nfl.activate(p.locator('[data-season-tile="1"]'), 'Review saved 2027 season');
    await nfl.inspect(p.locator('#career-season-title'), e.year, 'Season year remains an ungrouped identifier');
    await fault(nfl, p.locator('#career-season-title'), 'grouped-year', '2,027 season', e.year, 'Season year remains an ungrouped identifier');
    await nfl.inspect(p.locator('[data-season-ovr]'), e.ovr, 'Season OVR remains unchanged');
    await nfl.inspect(p.locator('[data-season-pay]'), e.salary, 'Displayed salary preserves recorded precision and compact unit');
    await fault(nfl, p.locator('[data-season-pay]'), 'lost-precision', '$12.4M', e.salary, 'Displayed salary preserves recorded precision and compact unit');
    await nfl.picture('overview');
    await nfl.activate(p.locator('[data-season-tab="Regular season"]'), 'Regular season');
    const yards = p.locator('[data-season-stat="Passing yards"] dd');
    await nfl.inspect(yards, e.seasonYards, 'Large saved passing yards use grouping');
    await fault(nfl, yards, 'ungrouped-count', '5432', e.seasonYards, 'Large saved passing yards use grouping'); await nfl.picture('regular-season');
    await nfl.activate(p.getByRole('button', { name: 'Back to seasons', exact: true }), 'Back to seasons');
    await nfl.activate(p.locator('[data-season-compare-open]'), 'Compare seasons');
    await nfl.activate(p.locator('[data-season-compare-tab="Regular season"]'), 'Compare regular seasons');
    const comparison = p.locator('[data-season-compare-stat="Passing yards"]');
    await nfl.inspect(comparison.locator('[data-compare-first]'), e.firstYards, 'Comparison first saved yard count');
    await nfl.inspect(comparison.locator('[data-compare-second]'), e.seasonYards, 'Comparison second saved yard count');
    await nfl.inspect(comparison.locator('[data-compare-delta]'), e.deltaYards, 'Comparison delta preserves its actual arithmetic'); await nfl.picture('comparison');
    await finish(nfl);
  }
  assert.equal(report.cases.length, 6); assert(report.cases.every(row => row.complete)); assert.equal(report.controls.length, 9);
  assert(report.controls.every(control => control.rejected?.name === 'AssertionError' && control.restored)); report.complete = true;
  console.log('Number formatting native: 6 actual route cases and 9 effective restored DOM controls passed.');
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack };
  if (active) { active.row.failureState = await snapshot(active.page).catch(e => ({ error: String(e) })); await active.page.screenshot({ path: path.join(OUT, `${active.row.id}-failure.png`), fullPage: false }).catch(() => {}); }
  throw error;
} finally {
  await browser?.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  report.sourceAfter = sourceHashes(); report.buildAfter = hashes(['dist']); report.assetManifestAfter = digest(fs.readFileSync(CACHE)); report.assetPayloadAfter = payloadHashes(); save();
  assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Native verification leaves source and dependency manifests unchanged');
  assert.deepEqual(report.buildAfter, report.buildBefore, 'Native verification leaves actual build bytes unchanged');
  assert.equal(report.assetManifestAfter, report.assetManifestBefore); assert.deepEqual(report.assetPayloadAfter, report.assetPayloadBefore, 'Native verification holds all real cached payloads');
}
