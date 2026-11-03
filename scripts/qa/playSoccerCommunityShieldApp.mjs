import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

assert.equal(process.env.CI, '1');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''), 'Actual qualified App build source required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert(process.env.SC_SHIELD_APP_OUT && process.env.SC_SHIELD_APP_PREP, 'Explicit output and admitted fixture preparation required');
const out = path.resolve(process.env.SC_SHIELD_APP_OUT), prep = path.resolve(process.env.SC_SHIELD_APP_PREP);
assert(out.startsWith(path.join(root, 'tmp') + path.sep) && prep.startsWith(path.join(root, 'tmp') + path.sep));
assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0); assert.notEqual(out, prep);
fs.mkdirSync(out, { recursive: true });
const evidence = out;
const sha = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const gameKey = 'soccerCareerSave', fenceKey = 'dukb-fence:' + gameKey;
const files = ['src/main.tsx', 'src/App.tsx', 'src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerExtraCups.ts',
  'src/lib/soccerCareerSave.ts', 'src/lib/soccerSeasonCompetitions.ts', 'src/lib/soccerSeasonCalendar.ts', 'src/lib/season/soccer.ts', 'src/lib/saveFence.ts',
  'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts', 'src/contexts/AuthContext.tsx', 'src/components/game/GameHelp.tsx',
  'src/components/game/HowToPlayPopover.tsx', 'src/components/game/GameNavbar.tsx', 'src/components/game/Footer.tsx',
  'src/components/CookieConsent.tsx', 'src/components/layout/Header.tsx', 'src/components/seo/GameSeoContent.tsx',
  'src/components/soccer-career/SoccerSeasonCentre.tsx', 'src/components/soccer-career/SeasonCompetitionPanel.tsx', 'src/components/soccer-career/SeasonResumeChip.tsx',
  'src/components/soccer-career/TrophyCabinet.tsx', 'src/components/season-centre/SeasonCentre.tsx', 'src/components/season-centre/SeasonCentreHelp.tsx',
  'src/data/gameContent/soccer2.ts', 'src/data/gameContent/loader.ts', 'src/lib/liveScores.ts', 'src/hooks/useMostPlayed.ts',
  'src/components/home/PollOfTheDay.tsx', 'src/components/FlagImg.tsx', 'src/lib/consentPreferences.ts',
  'scripts/qa/playSoccerCommunityShieldApp.mjs', 'scripts/qa/prepareSoccerCommunityShieldApp.mjs',
  'scripts/qa/fixtures/soccerCommunityShield.captured.json', 'scripts/qa/fixtures/siteFonts.captured.json', 'package.json', 'package-lock.json'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
for (const [file, expected] of Object.entries({
  'src/pages/SoccerCareer.tsx': '47f141b5490079516ad40fbdab9d72300967964e4bb4920327ec3b297ae4e892',
  'src/components/soccer-career/SoccerSeasonCentre.tsx': '7ac1622f1bd099e323f85e8d407db820fc2091de35e26ebf8a275595c14f1a4c',
  'src/components/soccer-career/SeasonResumeChip.tsx': '81876bdad5c4d01396c9843a81fac191ef1acf5244baf52166e79860dee1f56c',
  'src/components/soccer-career/SeasonCompetitionPanel.tsx': '10cabb5a217d86eb55993de889afdbb6720b7c579014624cbb9897c8dc9da06f',
  'src/components/soccer-career/TrophyCabinet.tsx': 'cf26d308bdfadedef0f6035d127da9eb651bf96586e01c53137b609ad5443d9f',
  'src/components/season-centre/SeasonCentre.tsx': '254f1f1c1325af497e0e66abd1a07bffeeaabd343c04a723134ebb9dcab1a8fe',
  'src/lib/soccerCareerEngine.ts': '8d4f9285901d86225954a9e7e2c86abde1649da6a511d0eac9a06dd81eabdc4c',
  'src/lib/soccerCareerExtraCups.ts': '6562fef7c5f067ffa9a4fdf335a918a0d20bda908f0156308f3b705d378f2406',
  'src/lib/soccerSeasonCompetitions.ts': '4444fb465c145c1fcc5638306668680e515a7df439295a0baee7bef70f22f7a1',
  'src/lib/soccerSeasonCalendar.ts': '2ab91ed87ac3646d4881a762652e5073be1cf182c55049cc1ab0a11a92a769fe',
  'scripts/qa/fixtures/siteFonts.captured.json': 'a6c24e3ec7711d400f53a1baf10a3a6a3925d1f269e48ee0cd14bdca5b749938',
  'scripts/qa/fixtures/soccerCommunityShield.captured.json': '4c9cfeda29071c493c998671dd1ff37730ecee6616c8355f82b8668fc639aa09',
})) assert.equal(sha(held.get(file)), expected, 'Held exact SC App source: ' + file);
const sourceReceipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
write('source-before.json', sourceReceipts());
const prepHolds = new Map();
function holdTree(dir, map) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink()); const file = path.join(dir, entry.name);
    if (entry.isDirectory()) holdTree(file, map); else map.set(file, fs.readFileSync(file));
  }
}
holdTree(prep, prepHolds);
const prepared = JSON.parse(prepHolds.get(path.join(prep, 'manifest.json')));
const prepReceipt = JSON.parse(prepHolds.get(path.join(prep, 'receipt.json')));
assert.equal(prepared.schema, 1); assert.equal(prepared.prepared.length, 3); assert.equal(prepReceipt.completed, true); assert.equal(prepReceipt.primary, null);
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let api;
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
  api = await import(pathToFileURL(path.join(prep, 'actual-readers.mjs')).href);
} finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; }
const fixtures = new Map(prepared.prepared.map(item => {
  const raw = prepHolds.get(path.join(prep, item.saveFile)).toString('utf8');
  assert.equal(sha(Buffer.from(raw)), item.oracle.serializedSha256);
  const state = api.save.parseSoccerCareerSave(raw); assert.equal(api.save.isSoccerCareerSave(state), true);
  assert.equal(state.phase, 'playing'); assert.equal(api.extra.countCommunityShields(state.seasons), item.oracle.shieldCount);
  return [item.id, { ...item, raw, state }];
}));
assert.deepEqual([...fixtures.keys()], ['win', 'bench', 'loss']);
write('fixture-inputs.json', { manifest: prepared, manifestSha256: sha(prepHolds.get(path.join(prep, 'manifest.json'))), nodeReaderStorageBoundary: 'Empty import compatibility only, never a browser storage mock' });
const fontsPayload = JSON.parse(held.get('scripts/qa/fixtures/siteFonts.captured.json'));
const fontRows = fontsPayload.entries;
assert(Array.isArray(fontRows)); assert.equal(fontRows.length, 9);
const fonts = new Map(fontRows.map(row => {
  const url = new URL(row.url); assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(url.origin));
  assert.equal(row.encoding, 'gzip+hex'); const body = gunzipSync(Buffer.from(row.body, 'hex'));
  assert.equal(body.length, row.bytes); assert.equal(sha(body), row.sha256);
  return [row.url, { body, contentType: row.contentType, sha256: row.sha256 }];
}));
assert.equal(fonts.size, 9);
const dist = path.join(root, 'dist'), assets = new Map();
const mime = file => file.endsWith('.html') ? 'text/html' : file.endsWith('.js') || file.endsWith('.mjs') ? 'text/javascript'
  : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : file.endsWith('.svg') ? 'image/svg+xml'
    : file.endsWith('.png') ? 'image/png' : file.endsWith('.ico') ? 'image/x-icon' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
function readTree(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name); assert(!item.isSymbolicLink());
    if (item.isDirectory()) readTree(file);
    else { const bytes = fs.readFileSync(file); assets.set('/' + path.relative(dist, file).replaceAll('\\', '/'), { body: Buffer.from(bytes), contentType: mime(file), sha256: sha(bytes) }); }
  }
}
readTree(dist); assert(assets.has('/index.html')); assert(assets.has('/soccer-career/index.html'), 'Actual new route snapshot exists');
const html = assets.get('/index.html').body.toString('utf8');
const entryScript = [...html.matchAll(/<script\b[^>]*src=["'](\/assets\/[^"']+\.js)["']/gi)].map(row => row[1]);
assert.equal(entryScript.length, 1, 'One ordinary Vite main App entry'); assert(assets.has(entryScript[0]));
const assetRows = [...assets].map(([file, row]) => ({ file, bytes: row.body.length, sha256: row.sha256, contentType: row.contentType }));
write('build-assets.json', { sourceCommit: process.env.GITHUB_SHA, entryScript: entryScript[0], files: assetRows });
const documentAsset = url => {
  if (url.pathname === '/') { assert([...url.searchParams].every(([key, value]) => key === 'fresh' && /^\d+$/.test(value))); return '/index.html'; }
  assert.equal(url.search, '', 'No unknown local query');
  return url.pathname === '/soccer-career' || url.pathname === '/soccer-career/' ? '/soccer-career/index.html' : url.pathname;
};
const publicOrigin = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const pollSelect = 'poll_key,question,option_a,option_a_emoji,option_a_flag,option_b,option_b_emoji,option_b_flag,option_c,option_c_emoji,option_c_flag,option_d,option_d_emoji,option_d_flag,sort_order';
function publicRead(request) {
  const url = new URL(request.url()), method = request.method();
  if (url.origin === 'https://flagcdn.com' && method === 'GET' && !url.search && /^\/w(?:20|40|80|160|320)\/[a-z]{2}\.png$/.test(url.pathname)) return 'flag-image';
  if (url.origin !== publicOrigin || !['GET', 'POST', 'OPTIONS'].includes(method)) return null;
  const effective = method === 'OPTIONS' ? request.headers()['access-control-request-method']?.toUpperCase() : method;
  const p = url.searchParams;
  if (url.pathname === '/rest/v1/live_scores' && effective === 'GET' && p.get('select') === '*' && p.get('order') === 'start_at.asc' && p.get('limit') === '150'
    && [...p.keys()].length === 5 && p.getAll('start_at').length === 2 && p.getAll('start_at').map(value => value.slice(0, 4)).sort().join(',') === 'gte.,lte.' && p.getAll('start_at').every(value => Number.isFinite(Date.parse(value.slice(4))))) return 'live-scores';
  if (url.pathname === '/rest/v1/daily_polls' && effective === 'GET' && [...p.keys()].length === 3 && p.get('select') === pollSelect && /^eq\.\d{4}-\d{2}-\d{2}$/.test(p.get('poll_date') || '') && p.get('order') === 'sort_order.asc') return 'daily-polls';
  if (url.pathname === '/rest/v1/rpc/most_played_today' && effective === 'POST' && !url.search) {
    if (method === 'OPTIONS') return 'catalog-read-preflight';
    try { const value = JSON.parse(request.postData()); if (Object.keys(value).sort().join(',') === 'p_limit,p_min' && value.p_min === 3 && value.p_limit === 3) return 'catalog-read-rpc'; } catch {}
  }
  return null;
}

function probe({ origin, initialRaw }) {
  if (location.origin !== origin) return;
  const storage = window.localStorage, get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  let seeded = false;
  if (initialRaw !== null && get.call(storage, 'soccerCareerSave') === null) { set.call(storage, 'soccerCareerSave', initialRaw); seeded = true; }
  const operations = [], scrolls = [], scrollTos = [], clicks = [];
  document.addEventListener('click', event => { const control = event.target?.closest?.('button,a'); if (control) clicks.push({ trusted: event.isTrusted, label: control.getAttribute('aria-label') || control.textContent.trim() }); }, true);
  Storage.prototype.setItem = function (key, value) { const answer = set.apply(this, arguments); if (this === storage) operations.push({ operation: 'set', key, ...(key === 'soccerCareerSave' ? { bytes: String(value) } : {}) }); return answer; };
  Storage.prototype.removeItem = function (key) { const answer = remove.apply(this, arguments); if (this === storage) operations.push({ operation: 'remove', key }); return answer; };
  const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
  const insets = () => {
    let top = 0, bottom = 0;
    for (const [y, upper] of [[1, true], [innerHeight - 2, false]]) for (const x of [6, innerWidth / 2, innerWidth - 6]) for (const el of document.elementsFromPoint(x, y)) {
      const r = el.getBoundingClientRect(); if (!['fixed', 'sticky'].includes(getComputedStyle(el).position) || r.height > innerHeight * .4 || !r.height) continue;
      if (upper && r.top <= 2) top = Math.max(top, r.bottom);
      if (!upper && r.bottom >= innerHeight - 2) bottom = Math.max(bottom, innerHeight - r.top);
    }
    return { top, bottom, vh: innerHeight };
  };
  const siv = Element.prototype.scrollIntoView, sto = window.scrollTo;
  Element.prototype.scrollIntoView = function () { scrolls.push({ node: this, before: rect(this), y: scrollY, insets: insets() }); return siv.apply(this, arguments); };
  window.scrollTo = function () { scrollTos.push({ y: scrollY }); return sto.apply(this, arguments); };
  window.scShieldProof = Object.freeze({
    inspect() { return { raw: get.call(storage, 'soccerCareerSave'), generation: get.call(storage, 'dukb-fence:soccerCareerSave'),
      consent: get.call(storage, 'cookie-consent-v2'), operations: operations.slice(), clicks: clicks.slice(), seeded, timeOrigin: performance.timeOrigin,
      navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null, y: scrollY, viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio }, userAgent: navigator.userAgent,
      native: { random: /\[native code\]/.test(Math.random.toString()), date: /\[native code\]/.test(Date.toString()), dateNow: /\[native code\]/.test(Date.now.toString()),
        crypto: /\[native code\]/.test(crypto.getRandomValues.toString()), performance: /\[native code\]/.test(performance.now.toString()), animation: /\[native code\]/.test(requestAnimationFrame.toString()) } }; },
    resetScroll() { scrolls.length = 0; scrollTos.length = 0; },
    scroll() { return { reveals: scrolls.map(({ node, ...row }) => ({ ...row, connected: node.isConnected, after: rect(node), finalY: scrollY, afterInsets: insets() })), window: scrollTos.map(row => ({ ...row, finalY: scrollY })) }; },
  });
}

let server = null, browser = null, origin = null, primary = null, summary = null;
const records = [], attempted = [], cleanupErrors = [];
const specs = [
  { id: 'win', width: 360, height: 664, deviceScaleFactor: 2 },
  { id: 'bench', width: 392, height: 731, deviceScaleFactor: 2.75 },
  { id: 'loss', width: 1440, height: 900, deviceScaleFactor: 1 },
];
const visible = (page, selector) => page.locator(selector + ':visible');
async function collect(spec) {
  const fixture = fixtures.get(spec.id), oracle = fixture.oracle;
  const row = { ...spec, oracle, snapshots: [], actions: [], targets: [], widths: [], focus: [], screenshots: [], help: {}, assets: [], blocked: [], unexpected: [], pageErrors: [], consoleErrors: [], requestFailures: [], routeErrors: [], cleanupErrors: [] };
  attempted.push(spec.id);
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: spec.deviceScaleFactor, serviceWorkers: 'block' });
  const tasks = new Set(), blockedUrls = new Set();
  let page = null, localPrimary = null;
  await context.addInitScript(probe, { origin, initialRaw: fixture.raw });
  await context.route('**/*', route => {
    const task = (async () => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (url.origin === origin && method === 'GET') {
        let name;
        try { name = documentAsset(url); } catch (error) { row.unexpected.push({ method, url: url.href, reason: error.message }); return await route.abort(); }
        const asset = assets.get(name);
        if (asset) { assert(Buffer.isBuffer(asset.body)); assert.equal(sha(asset.body), asset.sha256); row.assets.push({ kind: 'local', name, request: url.href, bytes: asset.body.length, sha256: asset.sha256, fulfilledSha256: sha(asset.body) }); return await route.fulfill({ status: 200, body: asset.body, contentType: asset.contentType }); }
      }
      const font = fonts.get(url.href);
      if (font && method === 'GET') { row.assets.push({ kind: 'font', name: url.href, bytes: font.body.length, sha256: font.sha256, fulfilledSha256: sha(font.body) }); return await route.fulfill({ status: 200, body: font.body, contentType: font.contentType }); }
      const kind = publicRead(request);
      if (kind) { assert(row.blocked.length < 100); blockedUrls.add(url.href); row.blocked.push({ method, url: url.href, kind, ...(kind === 'catalog-read-rpc' ? { body: JSON.parse(request.postData()) } : {}) }); return await route.abort('failed'); }
      row.unexpected.push({ method, url: url.href, bodySha256: request.postData() ? sha(request.postData()) : null }); return await route.abort('blockedbyclient');
    })().catch(error => { row.routeErrors.push({ name: error.name, message: error.message }); }).finally(() => tasks.delete(task));
    tasks.add(task); return task;
  });
  const snapshot = async name => { const value = await page.evaluate(() => window.scShieldProof.inspect()); row.snapshots.push({ name, ...value }); return value; };
  const settle = async () => { let last = null; for (let i = 0; i < 35; i++) { const y = await page.evaluate(() => scrollY); if (last !== null && Math.abs(y - last) < .5) return; last = y; await page.waitForTimeout(40); } throw Error('Native scroll did not settle'); };
  const width = async name => row.widths.push({ name, ...await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })) });
  const press = async (locator, name) => {
    assert.equal(await locator.count(), 1, 'Unique actual native control: ' + name);
    const beforeBringIntoView = await locator.boundingBox();
    await locator.scrollIntoViewIfNeeded(); await settle();
    const data = await locator.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { x: r.x, y: r.y, width: r.width, height: r.height, viewportWidth: innerWidth, viewportHeight: innerHeight, hit: !!hit && (hit === el || el.contains(hit)), core: !el.closest('[data-site-chrome]') && !!el.closest('main#dukb-main,[role="dialog"]'), disabled: !!el.disabled }; });
    row.targets.push({ name, beforeBringIntoView, ...data });
    const before = await page.evaluate(() => window.scShieldProof.inspect());
    await page.evaluate(() => window.scShieldProof.resetScroll());
    await locator.click(); await page.waitForTimeout(80); await settle();
    const after = await page.evaluate(() => window.scShieldProof.inspect());
    row.actions.push({ name, yBefore: before.y, yAfter: after.y, trustedClicks: after.clicks.slice(before.clicks.length), scroll: await page.evaluate(() => window.scShieldProof.scroll()) });
    await width(name);
  };
  const shot = async name => { const file = spec.id + '-' + name + '.png'; await page.screenshot({ path: path.join(evidence, file), fullPage: false }); const bytes = fs.readFileSync(path.join(evidence, file)); row.screenshots.push({ file, bytes: bytes.length, sha256: sha(bytes) }); };
  const decode = raw => { const state = api.save.parseSoccerCareerSave(raw); assert.equal(api.save.isSoccerCareerSave(state), true); return state; };
  const checkCareer = raw => {
    const state = decode(raw);
    assert.deepEqual(state.seasons, fixture.state.seasons, 'Actual admitted seasons equal prepared saved outcome');
    assert.deepEqual(api.engine.getCareerTotals(state.seasons), oracle.totals);
    assert.deepEqual(api.extra.readCommunityShield(state.seasons.at(-1)), api.extra.readCommunityShield(fixture.state.seasons.at(-1)));
    return state;
  };
  try {
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message }));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push({ text: message.text(), url: message.location().url || '' }); });
    page.on('requestfailed', request => row.requestFailures.push({ url: request.url(), reason: request.failure()?.errorText ?? null }));
    await page.goto(origin + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const tile = page.locator('[data-trophy-category="shield"]'); await tile.waitFor();
    await page.waitForFunction(key => localStorage.getItem('dukb-fence:' + key) !== null, gameKey);
    await page.locator('[data-seo-content="ready"]').waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    row.supplied = { rawSha256: sha(Buffer.from(fixture.raw)), bytes: Buffer.byteLength(fixture.raw), fixture: fixture.originalFile, lab: fixture.labFile };
    row.boot = await snapshot('settled-boot'); checkCareer(row.boot.raw);
    row.chrome = { path: new URL(page.url()).pathname, siteHeaders: await page.locator('header[data-site-chrome]').count(), gameNavs: await page.locator('nav[data-site-chrome]').count(), title: await page.title() };
    row.guide = { headings: await page.locator('[data-seo-content="ready"] h2').allTextContents() };
    const consent = page.getByRole('region', { name: 'Cookie choices', exact: true }); await consent.waitFor();
    await press(consent.getByRole('button', { name: 'Reject all', exact: true }), 'Reject actual consent'); await consent.waitFor({ state: 'hidden' });
    row.consent = JSON.parse((await snapshot('consent-rejected')).consent);
    await shot('career');
    const globalHelp = page.getByRole('button', { name: 'How to play', exact: true });
    await press(globalHelp, 'Actual global help');
    const globalDialog = page.getByRole('dialog', { name: 'How to play', exact: true }); await globalDialog.waitFor(); row.help.global = await globalDialog.innerText();
    const globalHelpY = await page.evaluate(() => scrollY);
    await page.keyboard.press('Escape'); await globalDialog.waitFor({ state: 'hidden' }); await settle();
    row.focus.push({ name: 'Global help closes to its native opener', yBefore: globalHelpY, yAfter: await page.evaluate(() => scrollY), correct: await globalHelp.evaluate(el => el === document.activeElement) });
    const replay = page.locator('[data-open-season-replays]');
    row.entry = { publicReplayButton: await replay.count(), apps: oracle.apps, leagueApps: oracle.leagueApps };
    await press(replay, 'Open saved season replays');
    const season = page.locator('[data-replay-row="' + (fixture.state.seasons.length - 1) + '"]'); await season.waitFor();
    row.entry.yearLabel = await season.getAttribute('aria-label') || await season.innerText();
    row.entry.pickerText = await season.innerText();
    await press(season, 'Select actual saved year');
    let stage = null;
    if (spec.id === 'bench') {
      const unavailable = visible(page, '[data-centre-league-unavailable]'); await unavailable.waitFor();
      row.help.seasonFirst = null;
      row.opening = { kind: 'league-unavailable', calendarApplicable: false, unavailableText: await unavailable.innerText(), calendarNodes: await page.locator('[data-centre-calendar-cup]').count(), fixtureNodes: await page.locator('[data-fixture-cup="shield:0"]').count() };
      await shot('opening');
      await press(visible(page, '[data-centre-competition="shield"]'), 'Open saved Shield from zero-app league panel');
    } else {
      const firstHelp = page.locator('[data-season-help]'); await firstHelp.waitFor(); row.help.seasonFirst = await firstHelp.innerText();
      await press(firstHelp.getByRole('button', { name: 'Got it', exact: true }), 'Close first Season Centre help'); await firstHelp.waitFor({ state: 'hidden' });
      const opening = page.locator('[data-fixture-cup="shield:0"]'), firstLeague = page.locator('[data-fixture-row="1"]');
      row.opening = await opening.evaluate((el, selector) => ({ afterLeague: Number(el.getAttribute('data-cup-after-league')), precedesLeagueOne: !!document.querySelector(selector) && !!(el.compareDocumentPosition(document.querySelector(selector)) & Node.DOCUMENT_POSITION_FOLLOWING), text: el.textContent }), '[data-fixture-row="1"]');
      assert.equal(await firstLeague.count(), 1);
      await press(page.getByRole('button', { name: '▶ Kick off', exact: true }), 'Open neutral saved opening');
      stage = page.locator('[data-centre-calendar-cup="shield:0"]'); await stage.waitFor();
      row.opening.beforeReveal = { scoreNodes: await stage.locator('[data-calendar-cup-score]').count(), text: await stage.innerText() };
      await press(page.locator('[data-calendar-cup-reveal]'), 'Reveal actual saved Shield result');
      await stage.locator('[data-calendar-cup-score]').waitFor();
      row.opening.revealedScore = await stage.locator('[data-calendar-cup-score]').innerText(); row.opening.revealedText = await stage.innerText();
      await snapshot('opening-revealed'); await shot('opening');
      await press(page.locator('[data-calendar-cup-competition]'), 'Inspect actual saved Shield competition');
    }
    const cupDialog = page.locator('[data-centre-saved-competition] [role="dialog"]'); await cupDialog.waitFor();
    await press(cupDialog.locator('[data-centre-cup-open="0"]'), 'Open the recorded Shield game');
    const score = cupDialog.locator('[data-centre-cup-score]'); await score.waitFor();
    row.result = { score: await score.innerText(), text: await cupDialog.innerText(), neutral: await cupDialog.getByText('Neutral ground', { exact: true }).count() };
    await press(cupDialog.getByRole('button', { name: 'How saved competitions work', exact: true }), 'Reopen saved competition help');
    const cupHelp = cupDialog.locator('[data-centre-competition-help]'); await cupHelp.waitFor(); row.help.competition = await cupHelp.innerText();
    await shot('saved-help');
    await press(cupHelp.getByRole('button', { name: '‹ Back', exact: true }), 'Back from saved competition help'); await score.waitFor();
    row.result.scoreAfterHelp = await score.innerText();
    await press(visible(page, '[data-centre-competition="league"]'), 'Back to held league viewer');
    if (spec.id === 'bench') {
      const unavailable = visible(page, '[data-centre-league-unavailable]'); await unavailable.waitFor();
      row.opening.preservedOnBack = { kind: 'league-unavailable', text: await unavailable.innerText() };
    } else {
      await stage.waitFor();
      row.opening.preservedOnBack = { revealed: await stage.getAttribute('data-cup-revealed'), score: await stage.locator('[data-calendar-cup-score]').innerText() };
    }
    await press(visible(page, '[data-centre-exit]'), 'Back from replay to career'); await replay.waitFor();
    row.focus.push({ name: 'Replay closes to public replay entry', yBefore: row.actions.at(-1).yBefore, yAfter: row.actions.at(-1).yAfter, correct: await replay.evaluate(el => el === document.activeElement) });
    await snapshot('after-replay');
    row.cabinet = { tileLabel: await tile.getAttribute('aria-label'), winningRows: null };
    await press(tile, 'Open personal Shield cabinet');
    const cabinet = page.locator('[data-trophy-cabinet] [role="dialog"]'); await cabinet.waitFor();
    row.cabinet.winningRows = await cabinet.locator('[data-trophy-win]').count();
    if (spec.id === 'win') {
      await press(cabinet.locator('[data-trophy-win="2030"]'), 'Open actual personal winning row');
      const detail = cabinet.locator('[data-trophy-shield]'); await detail.waitFor(); row.cabinet.score = await detail.locator('[data-trophy-shield-score]').innerText(); row.cabinet.detail = await detail.innerText();
    } else row.cabinet.empty = await cabinet.getByText('No wins recorded here yet.', { exact: true }).innerText();
    await shot('cabinet');
    await press(cabinet.getByRole('button', { name: 'Trophy cabinet help', exact: true }), 'Reopen cabinet help');
    await cabinet.locator('[data-trophy-help]').waitFor(); row.help.cabinet = await cabinet.locator('[data-trophy-help]').innerText();
    await press(cabinet.locator('[data-trophy-help-back]'), 'Back from cabinet help');
    await cabinet.locator('[data-trophy-help]').waitFor({ state: 'hidden' });
    await press(cabinet.locator('[data-trophy-back="career"]'), 'Back from cabinet to career'); await cabinet.waitFor({ state: 'hidden' });
    row.focus.push({ name: 'Cabinet closes to actual tile', yBefore: row.actions.at(-1).yBefore, yAfter: row.actions.at(-1).yAfter, correct: await tile.evaluate(el => el === document.activeElement) });
    const beforeReload = await snapshot('reload-before'); checkCareer(beforeReload.raw);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }); await tile.waitFor();
    await page.waitForFunction(key => localStorage.getItem('dukb-fence:' + key) !== null, gameKey);
    await page.locator('[data-seo-content="ready"]').waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const afterReload = await snapshot('reload-after'); checkCareer(afterReload.raw);
    row.reload = { before: beforeReload, after: afterReload, tileLabel: await tile.getAttribute('aria-label') };
    const footer = page.locator('footer[data-site-chrome]'); row.footer = { text: await footer.innerText(), reportButtons: await footer.getByRole('button', { name: 'Report a problem', exact: true }).count() };
    row.final = await snapshot('final'); await width('final');
  } catch (error) {
    localPrimary = error; row.failure = { name: error.name, message: error.message, stack: error.stack };
    if (page) { try { await shot('failure'); } catch (failure) { row.cleanupErrors.push({ step: 'failure-screenshot', message: failure.message }); } }
    write(spec.id + '.partial.json', row);
  } finally {
    try { await context.close(); } catch (error) { row.cleanupErrors.push({ step: 'context-close', message: error.message }); }
    await Promise.all([...tasks]);
    row.consoleUnexpected = row.consoleErrors.filter(error => {
      if (blockedUrls.has(error.url) && /^Failed to load resource: net::ERR_FAILED/.test(error.text)) return false;
      const cors = error.text.match(/^Access to fetch at '([^']+)' from origin '([^']+)' has been blocked by CORS policy:/);
      return !(cors && blockedUrls.has(cors[1]) && cors[2] === origin && /preflight|access control|Access-Control-Allow-Origin/i.test(error.text));
    });
    row.failedUnexpected = row.requestFailures.filter(error => !blockedUrls.has(error.url) || error.reason !== 'net::ERR_FAILED');
    row.completed = !localPrimary && row.cleanupErrors.length === 0;
    write(spec.id + '.json', row); records.push(row);
  }
}

const checks = [
  ['SC_APP_ENTRY', rows => {
    assert.deepEqual(rows.map(row => [row.id, row.width, row.height, row.deviceScaleFactor]), specs.map(row => [row.id, row.width, row.height, row.deviceScaleFactor]));
    for (const row of rows) {
      assert.equal(row.completed, true); assert.equal(row.failure, undefined);
      assert.deepEqual(row.boot.viewport, { width: row.width, height: row.height, pixelRatio: row.deviceScaleFactor });
      assert.equal(row.chrome.path, '/soccer-career'); assert.equal(row.chrome.siteHeaders, 0); assert.equal(row.chrome.gameNavs, 1); assert.match(row.chrome.title, /Soccer Career/);
      assert.equal(row.entry.publicReplayButton, 1); assert(row.entry.yearLabel.includes(row.oracle.label));
      assert(row.footer.text.includes('independent fan project') && row.footer.text.includes('UEFA')); assert.equal(row.footer.reportButtons, 1);
      assert(row.guide.headings.some(text => text.includes('How to play Soccer Career')));
      assert.equal(row.consent.version, 2); assert.equal(row.consent.analytics, false); assert.equal(row.consent.advertising, false);
      assert.equal(row.screenshots.length, 4);
    }
  }],
  ['SC_APP_RESULTS', rows => { for (const row of rows) {
    const score = row.oracle.playerScore.join('-'); assert.equal(row.result.score, score); assert.equal(row.result.scoreAfterHelp, score);
    assert(row.result.text.includes(row.oracle.club) && row.result.text.includes(row.oracle.opponent) && row.result.text.includes(row.oracle.result));
    assert(row.result.text.includes(row.oracle.note)); assert.equal(row.result.neutral, 1);
    assert(!row.result.text.includes('on penalties'), 'These two captured matches have no shootout witness');
  } }],
  ['SC_APP_OPENING', rows => { for (const row of rows) {
    if (row.id === 'bench') {
      assert.equal(row.opening.kind, 'league-unavailable'); assert.equal(row.opening.calendarApplicable, false);
      assert.equal(row.opening.calendarNodes, 0); assert.equal(row.opening.fixtureNodes, 0); assert(row.opening.unavailableText.includes('League replay unavailable'));
      assert.equal(row.opening.preservedOnBack.kind, 'league-unavailable'); assert.equal(row.opening.preservedOnBack.text, row.opening.unavailableText);
    } else {
      assert.equal(row.opening.afterLeague, 0); assert.equal(row.opening.precedesLeagueOne, true); assert.equal(row.opening.beforeReveal.scoreNodes, 0);
      assert(row.opening.beforeReveal.text.includes('Before league game 1.') && row.opening.beforeReveal.text.includes('Neutral ground'));
      assert.equal(row.opening.revealedScore, row.oracle.playerScore.join('-')); assert.equal(row.opening.preservedOnBack.revealed, 'true'); assert.equal(row.opening.preservedOnBack.score, row.opening.revealedScore);
    }
  } }],
  ['SC_APP_BENCH', rows => {
    const row = rows.find(value => value.id === 'bench'); assert.equal(row.entry.apps, 0); assert.equal(row.entry.leagueApps, 0); assert(row.entry.pickerText.includes('0 apps'));
    assert.equal(row.oracle.selected, false); assert.equal(row.oracle.playerTitle, false); assert.equal(row.oracle.shieldCount, 0);
    assert(row.result.text.includes('You did not play, so no appearance or personal Shield trophy is added.')); assert.equal(row.cabinet.winningRows, 0);
  }],
  ['SC_APP_CABINET', rows => { for (const row of rows) {
    assert.equal(row.cabinet.tileLabel, 'Community Shield: ' + row.oracle.shieldCount + '. View winning seasons'); assert.equal(row.reload.tileLabel, row.cabinet.tileLabel);
    assert.equal(row.cabinet.winningRows, row.oracle.shieldCount);
    if (row.id === 'win') { assert.equal(row.cabinet.score, row.oracle.playerScore.join('-')); assert(row.cabinet.detail.includes(row.oracle.club) && row.cabinet.detail.includes(row.oracle.opponent) && row.cabinet.detail.includes('Neutral ground') && row.cabinet.detail.includes(row.oracle.note)); }
    else assert.equal(row.cabinet.empty, 'No wins recorded here yet.');
  } }],
  ['SC_APP_SAVE', rows => { for (const row of rows) {
    assert.equal(row.boot.seeded, true);
    assert.equal(row.supplied.rawSha256, fixtures.get(row.id).oracle.serializedSha256);
    for (const snapshot of row.snapshots) assert.equal(snapshot.raw, row.boot.raw, 'Read-only career bytes after settled boot: ' + row.id + '/' + snapshot.name);
    assert.equal(row.reload.after.navigationType, 'reload'); assert.notEqual(row.reload.before.timeOrigin, row.reload.after.timeOrigin); assert.equal(row.reload.after.seeded, false);
    assert.equal(row.reload.before.raw, row.reload.after.raw);
  } }],
  ['SC_APP_NATIVE', rows => { for (const row of rows) {
    for (const snapshot of row.snapshots) for (const flag of Object.values(snapshot.native)) assert.equal(flag, true);
    for (const action of row.actions) assert(action.trustedClicks.some(click => click.trusted === true), 'Actual trusted click: ' + action.name);
  } }],
  ['SC_APP_HELP', rows => { for (const row of rows) {
    assert(row.help.global.includes('Community Shield: modern matches need a recorded qualifying season.')); assert(row.help.global.includes('Example: 1-1 and 5-4 on penalties'));
    if (row.id === 'bench') assert.equal(row.help.seasonFirst, null, 'No Season Centre model or first help for zero apps');
    else assert(row.help.seasonFirst.includes('An opening Shield') && row.help.seasonFirst.includes('before league game one'));
    assert(row.help.competition.includes('The Community Shield is one saved neutral opening match.') && row.help.competition.includes('Shootout kicks never become player goals.'));
    assert(row.help.cabinet.includes('A personal Community Shield win needs a valid saved appearance for the winning club.'));
  } }],
  ['SC_APP_FOCUS', rows => { for (const row of rows) {
    assert.equal(row.focus.length, 3); for (const observed of row.focus) { assert.equal(observed.correct, true, observed.name); assert(Math.abs(observed.yAfter - observed.yBefore) <= 4, 'Native close focus must not jump: ' + observed.name); }
    for (const action of row.actions) for (const reveal of action.scroll.reveals) {
      assert.equal(reveal.connected, true); const visible = Math.max(0, Math.min(reveal.before.bottom, reveal.insets.vh - reveal.insets.bottom) - Math.max(reveal.before.top, reveal.insets.top));
      const comfortable = reveal.before.top >= reveal.insets.top - 4 && visible >= Math.min(190, reveal.before.height);
      assert(!(comfortable && reveal.finalY > reveal.y + 4)); assert(reveal.after.top >= reveal.afterInsets.top - 4);
    }
    for (const action of row.actions) for (const scroll of action.scroll.window) assert(Math.abs(scroll.finalY - scroll.y) <= 4);
  } }],
  ['SC_APP_GEOMETRY', rows => { for (const row of rows) {
    const expectedActions = row.id === 'win' ? 18 : row.id === 'bench' ? 14 : 17;
    assert.equal(row.actions.length, expectedActions); assert.equal(row.targets.length, expectedActions); assert.equal(row.widths.length, expectedActions + 1);
    for (const target of row.targets) { if (target.core) assert(target.height >= 44); assert(target.width > 0); assert.equal(target.hit, true); assert.equal(target.disabled, false); assert(target.x >= -.5 && target.x + target.width <= target.viewportWidth + .5); assert(target.y + target.height > 0 && target.y < target.viewportHeight); }
    for (const width of row.widths) assert(width.scroll <= width.client + 1);
  } }],
  ['SC_APP_TRANSPORT', rows => { for (const row of rows) {
    for (const name of ['unexpected', 'pageErrors', 'consoleUnexpected', 'failedUnexpected', 'routeErrors', 'cleanupErrors']) assert.deepEqual(row[name], []);
    for (const read of row.blocked) if (!['GET', 'OPTIONS'].includes(read.method)) { assert.equal(read.method, 'POST'); assert.equal(read.kind, 'catalog-read-rpc'); assert.deepEqual(read.body, { p_min: 3, p_limit: 3 }); }
  } }],
  ['SC_APP_ASSETS', rows => { for (const row of rows) {
    assert(row.assets.some(asset => asset.kind === 'local' && asset.name === entryScript[0]));
    for (const asset of row.assets) { const original = asset.kind === 'font' ? fonts.get(asset.name) : assets.get(asset.name); assert(original); assert.equal(asset.sha256, original.sha256); assert.equal(asset.fulfilledSha256, original.sha256); assert.equal(asset.bytes, original.body.length); }
  } }],
];
function validate(rows, selected = null) {
  for (const [marker, check] of checks) if (!selected || marker === selected) {
    try { check(rows); } catch (error) { if (!(error instanceof assert.AssertionError)) throw error; assert.fail(marker + ': ' + error.message); }
  }
}
function controls(rows) {
  const definitions = [
    ['entry', 'SC_APP_ENTRY', copy => { copy[0].chrome.siteHeaders = 1; }],
    ['result', 'SC_APP_RESULTS', copy => { copy[0].result.score = '9-9'; }],
    ['opening', 'SC_APP_OPENING', copy => { copy[0].opening.afterLeague = 1; }],
    ['bench', 'SC_APP_BENCH', copy => { copy[1].entry.apps = 1; }],
    ['cabinet', 'SC_APP_CABINET', copy => { copy[0].cabinet.score = '9-9'; }],
    ['save', 'SC_APP_SAVE', copy => { copy[0].snapshots.at(-1).raw += ' '; }],
    ['native', 'SC_APP_NATIVE', copy => { copy[0].snapshots[0].native.random = false; }],
    ['help', 'SC_APP_HELP', copy => { copy[0].help.global = 'No Shield instructions'; }],
    ['focus', 'SC_APP_FOCUS', copy => { copy[0].focus[0].correct = false; }],
    ['height', 'SC_APP_GEOMETRY', copy => { copy[0].targets.find(target => target.core).height = 43; }],
    ['hit', 'SC_APP_GEOMETRY', copy => { copy[0].targets[0].hit = false; }],
    ['overflow', 'SC_APP_GEOMETRY', copy => { copy[0].widths[0].scroll = copy[0].widths[0].client + 2; }],
    ['unexpected-request', 'SC_APP_TRANSPORT', copy => { copy[0].unexpected.push({ method: 'POST', url: 'https://invalid.test/write' }); }],
    ['runtime', 'SC_APP_TRANSPORT', copy => { copy[0].pageErrors.push({ name: 'Error', message: 'copied observation fault' }); }],
    ['bytes', 'SC_APP_ASSETS', copy => { copy[0].assets[0].fulfilledSha256 = '0'.repeat(64); }],
  ];
  const results = [];
  for (const [id, marker, mutate] of definitions) {
    const changed = clone(rows); mutate(changed); assert.notDeepEqual(changed, rows);
    const originalSha256 = sha(Buffer.from(JSON.stringify(rows))), changedSha256 = sha(Buffer.from(JSON.stringify(changed)));
    let refusal = null; try { validate(changed, marker); } catch (error) { refusal = error; }
    assert(refusal instanceof assert.AssertionError && refusal.message.startsWith(marker + ':'), 'Owned copied observation: ' + id);
    const restored = clone(rows); validate(restored); assert.deepEqual(restored, rows);
    const result = { id, marker, changed: true, ownedRefusal: true, restoredHealthy: true, originalSha256, changedSha256, restoredSha256: sha(Buffer.from(JSON.stringify(restored))), refusal: { name: refusal.name, message: refusal.message } };
    write('control-' + id + '.json', result); results.push(result);
  }
  assert.equal(results.length, 15); return results;
}
try {
  server = http.createServer((_request, response) => { response.writeHead(410); response.end('Only immutable intercepted App assets are served'); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
  for (const spec of specs) await collect(spec);
  write('observations.json', records);
  const firstFailure = records.find(row => row.failure)?.failure;
  if (firstFailure) throw Object.assign(new Error(firstFailure.message), firstFailure);
  validate(records);
  const controlled = controls(records);
  summary = { schema: 1, sourceCommit: process.env.GITHUB_SHA, scope: 'Actual compiled Soccer Career App, two captured annual outcomes and one explicit bench/zero-app saved-result lab. No physical Android, natural bench, penalty fixture, full UI season or calibration claim.', contextsAttempted: attempted.length, contextsCompleted: records.filter(row => row.completed).length, healthyContexts: records.length, controls: controlled.length, restored: controlled.filter(row => row.restoredHealthy).length, originalPngs: records.reduce((sum, row) => sum + row.screenshots.length, 0), nativeReloads: records.filter(row => row.reload).length, nativeActions: records.reduce((sum, row) => sum + row.actions.length, 0), fixtureScope: prepared.scope, runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN', copiedObservationControlScope: 'Detached guard observations only, no source or browser faults' };
} catch (error) { primary = error; }
finally {
  try { if (browser) await browser.close(); } catch (error) { cleanupErrors.push({ step: 'browser', name: error.name, message: error.message }); }
  try { if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } catch (error) { cleanupErrors.push({ step: 'server', name: error.name, message: error.message }); }
  try {
    for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Held source: ' + file);
    const currentPrep = new Map(); holdTree(prep, currentPrep); assert.deepEqual([...currentPrep.keys()].sort(), [...prepHolds.keys()].sort());
    for (const [file, bytes] of prepHolds) assert.deepEqual(fs.readFileSync(file), bytes, 'Held prepared state: ' + file);
    const currentAssets = new Map(); for (const [file, asset] of assets) { const actual = fs.readFileSync(path.join(dist, file.slice(1))); assert.equal(sha(actual), asset.sha256); currentAssets.set(file, actual.length); }
    const finalFiles = new Map(); holdTree(dist, finalFiles); assert.equal(finalFiles.size, assets.size);
    write('source-after.json', sourceReceipts()); write('prep-holds.json', [...prepHolds].map(([file, bytes]) => ({ file: path.relative(prep, file), bytes: bytes.length, sha256: sha(bytes) }))); write('dist-held.json', [...currentAssets].map(([file, bytes]) => ({ file, bytes, sha256: assets.get(file).sha256 })));
  } catch (error) { cleanupErrors.push({ step: 'holds', name: error.name, message: error.message }); }
  try {
    write('receipt.json', { completed: !primary && cleanupErrors.length === 0, attempted, contextsCompleted: records.filter(row => row.completed).length, healthyContexts: summary?.healthyContexts ?? 0, primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, cleanupErrors, runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN' });
    if (summary) write('summary.json', { ...summary, completed: !primary && cleanupErrors.length === 0 });
  } catch (error) { cleanupErrors.push({ step: 'final-receipt', name: error.name, message: error.message }); }
}
if (primary) throw primary;
assert.equal(cleanupErrors.length, 0, 'Final browser/source holds');
console.log('SC_SHIELD_APP: three real App contexts, two captured outcomes plus explicit bench lab,15 effective copied observations/restores and12 original screenshots.');
