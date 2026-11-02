import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline execution required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.env.GP_BOSS_APP_OUT || path.join(root, 'tmp/grand-prix-app-browser'));
const prep = path.resolve(process.env.GP_BOSS_APP_PREP || '');
assert(process.env.GP_BOSS_APP_PREP, 'Prepared engine fixture directory is explicit');
assert(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''), 'Actual joined build source is identified');
fs.mkdirSync(out, { recursive: true });
const evidence = fs.mkdtempSync(path.join(out, 'actual-app-'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n');
const gameKey = 'grand-prix-boss-save-v1', fenceKey = 'dukb-fence:' + gameKey;
const files = ['src/main.tsx', 'src/App.tsx', 'src/pages/GrandPrixBoss.tsx', 'src/hooks/useGrandPrixBoss.ts',
  'src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'src/lib/saveFence.ts', 'src/lib/safeStorage.ts',
  'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts', 'src/contexts/AuthContext.tsx',
  'src/components/game/RulesGate.tsx', 'src/components/game/GameShell.tsx', 'src/components/game/GameNavbar.tsx',
  'src/components/game/Footer.tsx', 'src/components/CookieConsent.tsx', 'src/components/layout/Header.tsx',
  'src/components/seo/GameSeoContent.tsx', 'src/data/gameRegistry.ts', 'src/data/gameContent/grandPrixBoss.ts',
  'src/data/gameContent/loader.ts', 'src/data/gameContent/index.ts', 'src/test/fixtures/grandPrixBossV5Starter.json',
  'src/lib/liveScores.ts', 'src/hooks/useMostPlayed.ts', 'src/components/home/PollOfTheDay.tsx', 'src/components/FlagImg.tsx',
  'src/lib/consentPreferences.ts', 'src/lib/freshBuild.ts',
  'scripts/qa/playGrandPrixBossApp.mjs', 'scripts/qa/prepareGrandPrixBossApp.mjs',
  'scripts/qa/fixtures/siteFonts.captured.json', 'package.json', 'package-lock.json'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
for (const [file, expected] of [
  ['src/pages/GrandPrixBoss.tsx', 'd81e7182866ff7d6c40f44d3674e6ef5d3dddd1a43f337a0fbfb78eda7f2f9ba'],
  ['src/lib/grandPrixBoss.ts', '3dcaa003a5f71b6d85db9b4fd4097c5f54bb97d90a863b78bc7604b3027d1911'],
  ['src/hooks/useGrandPrixBoss.ts', 'b06293c184ba51e002189973c0eb39c6f52616023bb9f17fb3a5b3f67e8d2260'],
  ['src/test/fixtures/grandPrixBossV5Starter.json', 'cf3b484781dbff04df9033d0e1dfe239e6d9562f5cf026db2e4b1e233162a028'],
  ['scripts/qa/fixtures/siteFonts.captured.json', 'a6c24e3ec7711d400f53a1baf10a3a6a3925d1f269e48ee0cd14bdca5b749938'],
]) assert.equal(sha(held.get(file)), expected, 'Exact final App input: ' + file);
const sourceReceipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
write('source-before.json', sourceReceipts());
const fixtureManifestBytes = fs.readFileSync(path.join(prep, 'manifest.json'));
const prepared = JSON.parse(fixtureManifestBytes);
assert.equal(prepared.schemaVersion, 1);
const prepHolds = new Map([[path.join(prep, 'manifest.json'), fixtureManifestBytes]]);
const prepBody = row => {
  const name = row.bodyFile || row.file;
  assert(typeof name === 'string' && !path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'));
  const file = path.join(prep, name), bytes = fs.readFileSync(file);
  assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256); prepHolds.set(file, bytes); return bytes;
};
for (const row of prepared.sourceHolds) assert.equal(sha(fs.readFileSync(path.join(root, row.path))), row.sha256, 'Prepared source matches actual App source');
const oracleBytes = prepBody(prepared.oracle);
const engine = await import(pathToFileURL(path.join(prep, prepared.oracle.file)).href);
const legacyBytes = prepBody(prepared.legacy), reviewBytes = prepBody(prepared.review);
assert(legacyBytes.includes(held.get('src/test/fixtures/grandPrixBossV5Starter.json')), 'Exact old raw career is physically embedded');
const decode = raw => {
  assert.equal(typeof raw, 'string'); const envelope = JSON.parse(raw), before = JSON.stringify(envelope.career);
  assert.equal(envelope.schemaVersion, 1); assert(Array.isArray(envelope.completedSeasons));
  const result = engine.validateSavedCareer(envelope.career);
  assert.equal(JSON.stringify(envelope.career), before, 'Actual reader holds its input');
  assert.equal(result.ok, true, 'Actual reader admits saved career');
  return { ...envelope, career: result.state };
};
const legacyEnvelope = legacyBytes.toString('utf8'), reviewEnvelope = reviewBytes.toString('utf8');
assert.deepEqual(decode(legacyEnvelope).completedSeasons, []);
assert.deepEqual(decode(reviewEnvelope).completedSeasons, [1]);
assert.equal(decode(reviewEnvelope).career.phase, 'seasonReview');
assert.equal(decode(reviewEnvelope).career.results.length, 12);
assert.equal(decode(reviewEnvelope).career.nextSeasonPlan.seatReplacements.length, 1);
write('fixture-inputs.json', { manifestSha256: sha(fixtureManifestBytes), manifest: prepared, oracleSha256: sha(oracleBytes) });

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
readTree(dist); assert(assets.has('/index.html')); assert(assets.has('/grand-prix-boss/index.html'), 'Actual new route snapshot exists');
const html = assets.get('/index.html').body.toString('utf8');
const entryScript = [...html.matchAll(/<script\b[^>]*src=["'](\/assets\/[^"']+\.js)["']/gi)].map(row => row[1]);
assert.equal(entryScript.length, 1, 'One ordinary Vite main App entry'); assert(assets.has(entryScript[0]));
const assetRows = [...assets].map(([file, row]) => ({ file, bytes: row.body.length, sha256: row.sha256, contentType: row.contentType }));
write('build-assets.json', { sourceCommit: process.env.GITHUB_SHA, entryScript: entryScript[0], files: assetRows });
const documentAsset = url => {
  if (url.pathname === '/') { assert([...url.searchParams].every(([key, value]) => key === 'fresh' && /^\d+$/.test(value))); return '/index.html'; }
  assert.equal(url.search, '', 'No unknown local query');
  return url.pathname === '/grand-prix-boss' || url.pathname === '/grand-prix-boss/' ? '/grand-prix-boss/index.html' : url.pathname;
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
  if (initialRaw !== null && get.call(storage, 'grand-prix-boss-save-v1') === null) { set.call(storage, 'grand-prix-boss-save-v1', initialRaw); seeded = true; }
  const operations = [], scrolls = [], scrollTos = [];
  Storage.prototype.setItem = function (key, value) { const answer = set.apply(this, arguments); if (this === storage) operations.push({ operation: 'set', key, ...(key === 'grand-prix-boss-save-v1' ? { bytes: String(value) } : {}) }); return answer; };
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
  window.gpAppProof = Object.freeze({
    inspect() { return { raw: get.call(storage, 'grand-prix-boss-save-v1'), generation: get.call(storage, 'dukb-fence:grand-prix-boss-save-v1'),
      consent: get.call(storage, 'cookie-consent-v2'), operations: operations.slice(), seeded, timeOrigin: performance.timeOrigin,
      navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null, y: scrollY,
      native: { random: /\[native code\]/.test(Math.random.toString()), date: /\[native code\]/.test(Date.toString()), dateNow: /\[native code\]/.test(Date.now.toString()),
        crypto: /\[native code\]/.test(crypto.getRandomValues.toString()), performance: /\[native code\]/.test(performance.now.toString()), animation: /\[native code\]/.test(requestAnimationFrame.toString()) } }; },
    resetScroll() { scrolls.length = 0; scrollTos.length = 0; },
    scroll() { return { reveals: scrolls.map(({ node, ...row }) => ({ ...row, connected: node.isConnected, after: rect(node), finalY: scrollY, afterInsets: insets() })), window: scrollTos.map(row => ({ ...row, finalY: scrollY })) }; },
  });
}

let server = null, browser = null, origin = null, primary = null, summary = null;
const records = [], attempted = [], cleanupErrors = [];
const sizes = { mini: { width: 320, height: 664, deviceScaleFactor: 2 }, phone: { width: 392, height: 731, deviceScaleFactor: 2.75 }, desktop: { width: 1440, height: 900, deviceScaleFactor: 1 } };
const specs = [{ id: 'mini-natural', size: 'mini', mode: 'natural', catalog: true }, { id: 'phone-natural', size: 'phone', mode: 'natural' },
  { id: 'desktop-natural', size: 'desktop', mode: 'natural' }, { id: 'phone-prepared-C-review', size: 'phone', mode: 'review' }, { id: 'mini-captured-v5', size: 'mini', mode: 'legacy' }];
const own = state => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const money = value => '€' + value.toLocaleString('en-US');
const panel = (page, name) => page.locator('[data-gp-panel="' + name + '"]');
const button = (page, name) => page.getByRole('button', { name, exact: true });
const gameStatus = page => page.locator('main#dukb-main > div.relative > p[role="status"]');
async function collect(spec) {
  const size = sizes[spec.size], row = { ...spec, viewport: size, snapshots: [], turns: [], reloads: [], rules: [], readOnly: [], focus: [], targets: [], widths: [], actions: [], folds: [], routes: [], screenshots: [], assets: [], blocked: [], unexpected: [], pageErrors: [], consoleErrors: [], requestFailures: [], routeErrors: [], cleanupErrors: [] };
  attempted.push(spec.id);
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.deviceScaleFactor, serviceWorkers: 'block' });
  const tasks = new Set(), blockedUrls = new Set(); let page = null, localPrimary = null;
  const initialRaw = spec.mode === 'review' ? reviewEnvelope : spec.mode === 'legacy' ? legacyEnvelope : null;
  await context.addInitScript(probe, { origin, initialRaw });
  await context.route('**/*', route => {
    const task = (async () => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (url.origin === origin && method === 'GET') {
        let name;
        try { name = documentAsset(url); } catch (error) { row.unexpected.push({ method, url: url.href, reason: error.message }); return await route.abort(); }
        const asset = assets.get(name);
        if (asset) { assert(Buffer.isBuffer(asset.body)); assert.equal(sha(asset.body), asset.sha256); row.assets.push({ kind: 'local', request: url.href, name, bytes: asset.body.length, sha256: asset.sha256, fulfilledSha256: sha(asset.body) }); return await route.fulfill({ status: 200, body: asset.body, contentType: asset.contentType }); }
      }
      const font = fonts.get(url.href);
      if (font && method === 'GET') { row.assets.push({ kind: 'font', name: url.href, bytes: font.body.length, sha256: font.sha256, fulfilledSha256: sha(font.body) }); return await route.fulfill({ status: 200, body: font.body, contentType: font.contentType }); }
      const kind = publicRead(request);
      if (kind) { assert(row.blocked.length < 100, 'Finite unrelated public reads'); blockedUrls.add(url.href); row.blocked.push({ method, url: url.href, kind, ...(kind === 'catalog-read-rpc' ? { body: JSON.parse(request.postData()) } : {}) }); return await route.abort('failed'); }
      row.unexpected.push({ method, url: url.href, bodySha256: request.postData() ? sha(request.postData()) : null }); return await route.abort('blockedbyclient');
    })().catch(error => { row.routeErrors.push({ name: error.name, message: error.message }); }).finally(() => tasks.delete(task));
    tasks.add(task); return task;
  });
  const snapshot = async name => { const value = await page.evaluate(() => window.gpAppProof.inspect()); row.snapshots.push({ name, ...value }); return value; };
  const routeWeight = async name => {
    assert.equal(spec.id, 'phone-natural'); assert.equal(row.actions.length, 0, 'Weight is observed before any user action');
    const measured = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0], saved = window.gpAppProof.inspect();
      return { clock: { timeOrigin: performance.timeOrigin, nowMs: performance.now(), loadEventEndMs: nav.loadEventEnd, elapsedSinceLoadMs: performance.now() - nav.loadEventEnd },
        gameRaw: saved.raw, gameWrites: saved.operations.filter(value => value.key === 'grand-prix-boss-save-v1').length,
        guideReady: !!document.querySelector('[data-seo-content="ready"]'), resources: performance.getEntriesByType('resource')
          .filter(value => new URL(value.name).origin === location.origin && /^\/assets\/[^/]+\.js$/.test(new URL(value.name).pathname) && value.responseEnd > 0)
          .map(value => ({ file: new URL(value.name).pathname, startTime: value.startTime, responseEnd: value.responseEnd, duration: value.duration, initiatorType: value.initiatorType })) };
    });
    const names = [...new Set(measured.resources.map(value => value.file))].sort();
    const fetched = names.map(file => { const asset = assets.get(file); assert(asset, 'Completed route JS is held'); assert(row.assets.some(value => value.kind === 'local' && value.name === file && value.fulfilledSha256 === asset.sha256), 'Completed route JS was fulfilled from the same held Buffer'); return { file, bytes: asset.body.length, sha256: asset.sha256, gzipBytes: gzipSync(asset.body).length }; });
    const gzipBytes = fetched.reduce((sum, file) => sum + file.gzipBytes, 0);
    return { name, beforeAnyUserAction: true, ...measured, files: fetched, uniqueFiles: fetched.length,
      rawBytes: fetched.reduce((sum, file) => sum + file.bytes, 0), gzipBytes, gzipKiB: gzipBytes / 1024 };
  };
  const settle = async () => { let last = null; for (let i = 0; i < 35; i++) { const y = await page.evaluate(() => scrollY); if (last !== null && Math.abs(y - last) < .5) return; last = y; await page.waitForTimeout(40); } throw Error('Native scroll did not settle'); };
  const width = async name => { row.widths.push({ name, ...await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })) }); };
  const target = async (locator, name) => {
    assert.equal(await locator.count(), 1, name + ': unique actual control'); await locator.scrollIntoViewIfNeeded(); await settle();
    const data = await locator.evaluate(el => { const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, hit = document.elementFromPoint(x, y); return { x: r.x, y: r.y, width: r.width, height: r.height, viewportWidth: innerWidth, viewportHeight: innerHeight, hit: !!hit && (el === hit || el.contains(hit)), disabled: !!el.disabled, core: !el.closest('[data-site-chrome]') && !!el.closest('main#dukb-main,[role="dialog"]') }; });
    row.targets.push({ name, ...data }); await width(name); return data;
  };
  const press = async (locator, name, stable = false, navigation = false) => {
    await target(locator, name); const handle = stable ? await locator.elementHandle() : null;
    await page.evaluate(() => window.gpAppProof.resetScroll()); await locator.click(); await page.waitForTimeout(80); await settle();
    row.actions.push({ name, navigation, stable: handle ? await handle.evaluate(el => el.isConnected && document.activeElement === el) : null, scroll: await page.evaluate(() => window.gpAppProof.scroll()) });
  };
  const shot = async name => { const file = spec.id + '-' + name + '.png'; await page.screenshot({ path: path.join(evidence, file), fullPage: false }); const bytes = fs.readFileSync(path.join(evidence, file)); row.screenshots.push({ file, bytes: bytes.length, sha256: sha(bytes) }); };
  const readonly = async (name, fn) => { const before = await snapshot(name + '-before'); await fn(); const after = await snapshot(name + '-after'); row.readOnly.push({ name, before: { raw: before.raw, generation: before.generation }, after: { raw: after.raw, generation: after.generation } }); };
  const open = async name => { await press(button(page, name), 'Open ' + name); await panel(page, name).waitFor(); };
  const back = async name => { await readonly('Back from ' + name, async () => { await press(button(page, 'Back to team'), 'Back from ' + name); await button(page, name).waitFor(); row.focus.push({ name: 'Back ' + name, correct: await button(page, name).evaluate(el => el === document.activeElement) }); }); };
  const commit = async (name, action, locator) => {
    const before = await snapshot(name + '-before'), saved = decode(before.raw), fullAction = { ...action, expectedRevision: saved.career.revision };
    const input = JSON.stringify(saved.career), result = engine.applyAction(saved.career, fullAction);
    assert.equal(JSON.stringify(saved.career), input); assert.equal(result.ok, true, 'Actual legal public action: ' + action.type);
    await press(locator, name, true);
    await page.waitForFunction(({ key, revision }) => { try { return JSON.parse(localStorage.getItem(key)).career.revision === revision; } catch { return false; } }, { key: gameKey, revision: result.state.revision });
    const after = await snapshot(name + '-after'); row.turns.push({ name, action: fullAction, before, after });
    assert.deepEqual(decode(after.raw).career, result.state, 'Actual UI committed canonical engine result');
    assert.match(await gameStatus(page).innerText(), /saved|ready/i, 'Confirmed action feedback');
  };
  const reload = async () => {
    const before = await snapshot('reload-before'); await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
    await button(page, 'Next race').waitFor(); const after = await snapshot('reload-after'); row.reloads.push({ before, after });
  };
  const rules = async (first, reopen = false) => {
    const before = await snapshot('rules-before');
    if (reopen) await press(button(page, 'How to play'), 'Reopen rules');
    const dialog = page.getByRole('dialog', { name: 'How to play Grand Prix Boss', exact: true }); await dialog.waitFor();
    const text = await dialog.innerText(); row.rules.push({ first, text }); await shot(first ? 'first-rules' : 'reopened-rules');
    if (first) await press(dialog.getByRole('button', { name: "Let's Play!", exact: true }), 'Enter game'); else await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' }); await settle(); row.focus.push({ name: first ? 'First rules' : 'Reopened rules', correct: await button(page, 'How to play').evaluate(el => el === document.activeElement) });
    const after = await snapshot('rules-after'); row.readOnly.push({ name: 'Rules', before: { raw: before.raw, generation: before.generation }, after: { raw: after.raw, generation: after.generation } });
  };
  try {
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message }));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push({ text: message.text(), url: message.location().url || '' }); });
    page.on('requestfailed', request => row.requestFailures.push({ url: request.url(), reason: request.failure()?.errorText ?? null }));
    await page.goto(origin + (spec.catalog ? '/' : '/grand-prix-boss'), { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (spec.id === 'phone-natural') {
      await page.waitForLoadState('load');
      await page.waitForFunction(() => { const end = performance.getEntriesByType('navigation')[0].loadEventEnd; return end > 0 && performance.now() - end >= 1500; });
      row.routeWeight = { scope: 'Actual unique completed local JavaScript on the direct route, gzip of exact held bytes. Descriptive only, no assigned ceiling.',
        pageAndEngineSources: { pageSha256: sha(held.get('src/pages/GrandPrixBoss.tsx')), engineSha256: sha(held.get('src/lib/grandPrixBoss.ts')), separateEngineChunkClaim: false }, checkpoints: [await routeWeight('load+1500ms')] };
      await page.locator('[data-seo-content="ready"]').waitFor({ state: 'attached' });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      row.routeWeight.checkpoints.push(await routeWeight('settled-guide-before-action'));
      write('phone-natural-route-weight.json', row.routeWeight);
    }
    const firstRulesForConsent = spec.catalog ? null : page.getByRole('dialog', { name: 'How to play Grand Prix Boss', exact: true });
    if (firstRulesForConsent) await firstRulesForConsent.waitFor();
    const consentScope = firstRulesForConsent ? firstRulesForConsent.locator('[data-dukb-help-cookie-choices]') : page;
    const consent = consentScope.getByRole('region', { name: 'Cookie choices', exact: true }); await consent.waitFor();
    row.consent = { initialPresent: true, label: await consent.getAttribute('aria-label') };
    await press(consent.getByRole('button', { name: 'Reject all', exact: true }), 'Reject actual consent'); await consent.waitFor({ state: 'hidden' });
    row.consent.preferences = JSON.parse((await snapshot('consent-rejected')).consent);
    if (spec.catalog) {
      const catalog = page.locator('section').filter({ has: page.getByRole('heading', { name: /^Formula 1\s*\(/ }) });
      const card = catalog.locator('[data-home-game-card]').filter({ has: page.locator('a[href="/grand-prix-boss"]') });
      await card.waitFor(); row.catalog = { heading: await catalog.getByRole('heading', { level: 2 }).innerText(), card: await card.innerText(), href: await card.locator('a[href="/grand-prix-boss"]').getAttribute('href'), before: await snapshot('catalog-before') };
      row.routes.push({ name: 'Home', path: new URL(page.url()).pathname, header: await page.locator('header[data-site-chrome]').count(), gameNav: await page.locator('nav[data-site-chrome]').count() });
      await target(card.locator('a[href="/grand-prix-boss"]'), 'Actual Formula 1 card'); row.catalog.box = await card.boundingBox(); row.catalog.y = await page.evaluate(() => scrollY);
      await shot('catalog'); await press(card.locator('a[href="/grand-prix-boss"]'), 'Catalog Grand Prix Boss', false, true); await page.waitForURL(origin + '/grand-prix-boss');
    }
    await rules(true); await page.getByRole('heading', { name: 'Grand Prix Boss', exact: true, level: 1 }).waitFor();
    row.routes.push({ name: 'Game', path: new URL(page.url()).pathname, header: await page.locator('header[data-site-chrome]').count(), gameNav: await page.locator('main#dukb-main nav[data-site-chrome]').count(), footers: await page.locator('footer[data-site-chrome]').count() });
    const boot = await snapshot('game-boot'); row.boot = boot;
    if (spec.mode === 'natural') {
      row.folds.push({ name: 'First Start before deliberate game scroll', box: await button(page, 'Start your team').boundingBox(), y: await page.evaluate(() => scrollY) });
      assert.equal(boot.raw, null); await shot('first-action'); await press(button(page, 'Start your team'), 'Start natural team');
      await button(page, 'Next race').waitFor(); const started = await snapshot('natural-start'); row.started = started;
      assert.deepEqual(decode(started.raw).career, engine.createCareer(decode(started.raw).career.seed), 'Actual native seed creates its exact world');
    } else { await button(page, 'Next race').waitFor(); assert.equal(boot.raw, initialRaw, 'Fixture not rewritten on first boot'); }
    row.folds.push({ name: 'First hub before deliberate game scroll', box: await button(page, 'Next race').boundingBox(), y: await page.evaluate(() => scrollY) }); await shot('hub');
    if (spec.mode !== 'review') {
      await open('Drivers'); const before = await snapshot('focus-before'), career = decode(before.raw).career, driver = own(career)[0];
      const focus = driver.focus === 'pace' ? 'wet' : 'pace', select = page.getByRole('combobox', { name: 'Development focus for ' + driver.name, exact: true });
      await target(select, 'Owned development focus');
      const action = { type: 'setDriverFocus', driverId: driver.id, focus, expectedRevision: career.revision };
      await select.focus();
      const focusedBeforeChange = await select.evaluate(el => el === document.activeElement);
      row.focus.push({ name: 'Focus select before change', correct: focusedBeforeChange });
      assert.equal(focusedBeforeChange, true, 'Focus setup before selecting the actual development option');
      await select.selectOption(focus); await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key)).career.revision === revision, { key: gameKey, revision: career.revision + 1 });
      row.turns.push({ name: 'Save focus', action, before, after: await snapshot('focus-after') }); assert.equal(await select.inputValue(), focus); assert.match(await gameStatus(page).innerText(), /training focus saved\./); row.focus.push({ name: 'Saved native focus select', correct: await select.evaluate(el => el === document.activeElement) }); await shot('saved-focus');
      await back('Drivers'); await reload();
      if (spec.mode === 'legacy') row.legacy = { originalRaw: legacyEnvelope, normalizedBefore: decode(legacyEnvelope).career, after: await snapshot('legacy-reloaded') };
      else {
        await open('Next race'); await commit('Run qualifying', { type: 'qualify' }, button(page, 'Run qualifying'));
        let state = decode((await snapshot('grid')).raw).career;
        const drivers = own(state), setups = [];
        for (const [i, driver] of drivers.entries()) {
          const compound = state.race.weather === 'wet' ? 'wet' : i === 0 ? 'soft' : 'hard', pace = i === 0 ? 'push' : 'conserve';
          const tyre = page.getByRole('combobox', { name: 'Tyres for ' + driver.name, exact: true }), paceControl = page.getByRole('combobox', { name: 'Pace for ' + driver.name, exact: true });
          await target(tyre, 'Initial tyre ' + driver.id); await tyre.selectOption(compound); await target(paceControl, 'Initial pace ' + driver.id); await paceControl.selectOption(pace); setups.push({ driverId: driver.id, compound, pace });
        }
        await shot('grid-orders'); await commit('Start race', { type: 'startRace', setups }, button(page, 'Start race'));
        for (const lap of [12, 26, 40]) {
          state = decode((await snapshot('before-lap-' + lap)).raw).career;
          const pitDriver = own(state).find(driver => state.race.entries.find(entry => entry.driverId === driver.id).status === 'running')?.id ?? null;
          const orders = [];
          for (const [i, driver] of own(state).entries()) {
            const entry = state.race.entries.find(value => value.driverId === driver.id), paceControl = page.getByRole('combobox', { name: 'Pace for ' + driver.name, exact: true });
            let pace = entry.pace, pitTo = '';
            if (entry.status !== 'retired') {
              pace = i === 0 ? 'balanced' : 'conserve'; await target(paceControl, 'Race pace ' + driver.id + ' lap ' + lap); await paceControl.selectOption(pace);
              if (state.race.lap > 0) {
                const pit = page.getByRole('combobox', { name: 'Pit choice for ' + driver.name, exact: true }); await target(pit, 'Pit call ' + driver.id + ' lap ' + lap);
                pitTo = driver.id === pitDriver && lap === 26 ? state.race.weather === 'wet' ? 'wet' : 'hard' : ''; await pit.selectOption(pitTo);
              }
            } else {
              row.focus.push({ name: 'Retired pace disabled ' + driver.id, correct: await paceControl.isDisabled() });
              const pit = page.getByRole('combobox', { name: 'Pit choice for ' + driver.name, exact: true }); row.focus.push({ name: 'Retired pit disabled ' + driver.id, correct: await pit.isDisabled() });
            }
            orders.push({ driverId: driver.id, pace, ...(pitTo ? { pitTo } : {}) });
          }
          await commit('Run to lap ' + lap, { type: 'raceInterval', orders }, button(page, 'Run to lap ' + lap));
        }
        row.finished = await snapshot('one-race-finished');
        row.resultUI = { cards: await panel(page, 'Next race').locator('section').evaluateAll(sections => sections.map(section => ({ name: section.querySelector('h4')?.textContent, position: section.querySelector(':scope > div p')?.textContent, tyres: section.querySelector(':scope > p')?.textContent }))),
          prize: await panel(page, 'Next race').getByText('Race prize', { exact: true }).locator('..').locator('p').nth(1).innerText(),
          costs: await panel(page, 'Next race').getByText('Entry and wages', { exact: true }).locator('..').locator('p').nth(1).innerText() };
        await shot('race-result'); await back('Next race'); await open('Standings');
        row.standings = await panel(page, 'Standings').locator('section').evaluateAll(sections => sections.map(section => ({ title: section.querySelector('h3')?.textContent,
          rows: [...section.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map((cell, i) => i === 1 ? cell.firstChild?.textContent : cell.textContent)) })));
        await shot('standings'); await back('Standings');
      }
    } else {
      await open('Next race'); const saved = decode((await snapshot('review-plan')).raw).career;
      const fieldIds = ['gp-season-end-cash', 'gp-next-sponsor', 'gp-next-renewal-fee', 'gp-next-replacement-fee', 'gp-next-reserved', 'gp-next-cash-after'];
      row.plan = { raw: (await snapshot('review-plan-fields')).raw, actual: Object.fromEntries(await Promise.all(fieldIds.map(async id => [id, await page.getByTestId(id).innerText()]))), replacements: [] };
      for (const quote of saved.nextSeasonPlan.seatReplacements) row.plan.replacements.push({ departingId: quote.departingDriverId, text: await page.getByTestId('gp-seat-replacement-' + quote.departingDriverId).innerText() });
      await page.getByTestId('gp-next-replacement-fee').scrollIntoViewIfNeeded(); await shot('canonical-review-plan');
      await commit('Start next season', { type: 'startNextSeason' }, button(page, 'Start next season')); row.rolled = await snapshot('year-two');
      await back('Next race'); const historyBefore = await snapshot('history-read-before'); await open('History'); await press(button(page, 'Season 1'), 'Open engine-prepared season');
      const archive = decode(row.rolled.raw).career.history.find(value => value.season === 1);
      row.history = { raw: row.rolled.raw, coverage: await page.getByTestId('gp-history-coverage').innerText(), actual: {}, races: [] };
      for (const id of ['gp-archive-driver-champion', 'gp-archive-driver-points', 'gp-archive-team-champion', 'gp-archive-team-points', 'gp-archive-end-cash']) row.history.actual[id] = await page.getByTestId(id).innerText();
      row.history.car = {}; for (const area of ['power', 'aero', 'reliability']) row.history.car[area] = await page.getByTestId('gp-archive-' + area).innerText();
      row.history.totals = {}; for (const [name, id] of [['seasons', 'gp-history-total-seasons'], ['drivers', 'gp-history-driver-titles'], ['teams', 'gp-history-team-titles']]) row.history.totals[name] = await page.getByTestId(id).innerText();
      for (const result of archive.races) {
        const detail = page.getByTestId('gp-archive-race-' + result.roundId), summary = detail.locator('summary');
        row.history.races.push({ roundId: result.roundId, summary: await summary.innerText(), text: await detail.textContent() });
      }
      row.history.opened = [];
      for (const [name, race] of [['First', archive.races[0]], ['Last', archive.races.at(-1)]]) {
        const detail = page.getByTestId('gp-archive-race-' + race.roundId);
        await press(detail.locator('summary'), name + ' archived race');
        row.history.opened.push({ roundId: race.roundId, open: await detail.getAttribute('open') !== null, bodyVisible: await detail.locator('p').first().isVisible(), text: await detail.innerText() });
      }
      await shot('engine-prepared-history');
      await press(button(page, 'Back to history'), 'Back to history'); row.focus.push({ name: 'History entry restored', correct: await button(page, 'Season 1').evaluate(el => el === document.activeElement) });
      await back('History'); const historyAfter = await snapshot('history-read-after'); row.readOnly.push({ name: 'Complete native archive inspection', before: { raw: historyBefore.raw, generation: historyBefore.generation }, after: { raw: historyAfter.raw, generation: historyAfter.generation } });
      await reload(); row.history.afterReload = await snapshot('history-reloaded');
    }
    await readonly('Reopened help', () => rules(false, true));
    await readonly('Actual lazy guide and footer', async () => {
      const guide = page.locator('[data-seo-content="ready"]'); await guide.waitFor(); await guide.getByRole('heading', { name: 'Grand Prix Boss example: two different tyre plans', exact: true }).waitFor();
      row.guide = { status: await guide.getAttribute('data-seo-content'), text: await guide.innerText(), headings: await guide.locator('h2,h3').allTextContents() };
      const footer = page.locator('footer[data-site-chrome]'); row.footer = { text: await footer.innerText(), reportButtons: await footer.getByRole('button', { name: 'Report a problem', exact: true }).count() };
      await guide.getByRole('heading', { name: 'Grand Prix Boss example: two different tyre plans', exact: true }).scrollIntoViewIfNeeded(); await shot('actual-guide');
    });
    if (spec.catalog) {
      await readonly('Actual GameNavbar back to catalog', async () => {
        await press(button(page, 'Go back'), 'GameNavbar Back', false, true); await page.waitForURL(origin + '/');
        const card = page.locator('section[data-sport]').locator('a[href="/grand-prix-boss"]'); await card.waitFor(); await settle();
        row.routes.push({ name: 'Back Home', path: new URL(page.url()).pathname, header: await page.locator('header[data-site-chrome]').count(), card: await card.boundingBox(), y: await page.evaluate(() => scrollY) }); await shot('back-home');
      });
    }
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
    write(spec.id + (localPrimary ? '.failed.json' : '.json'), row);
  }
  if (localPrimary) throw localPrimary;
  assert.deepEqual(row.cleanupErrors, [], 'Actual context cleanup'); return row;
}

const guards = new Map([
  ['canonical-save', rows => {
    for (const row of rows) {
      if (row.started) { const saved = decode(row.started.raw); assert.deepEqual(saved.career, engine.createCareer(saved.career.seed)); assert.deepEqual(saved.completedSeasons, []); }
      for (const turn of row.turns) {
        const before = decode(turn.before.raw), source = JSON.stringify(before.career), result = engine.applyAction(before.career, turn.action);
        assert.equal(JSON.stringify(before.career), source); assert.equal(result.ok, true);
        assert.equal(turn.after.raw, JSON.stringify({ schemaVersion: 1, career: result.state, completedSeasons: before.completedSeasons }));
        assert.equal(Number(turn.after.generation), Number(turn.before.generation || 0) + 1);
      }
      for (const entry of row.readOnly) { assert.equal(entry.after.raw, entry.before.raw); assert.equal(entry.after.generation, entry.before.generation); }
      for (const reload of row.reloads) { assert.notEqual(reload.after.timeOrigin, reload.before.timeOrigin); assert.equal(reload.after.navigationType, 'reload'); assert.equal(reload.after.raw, reload.before.raw); assert.equal(reload.after.generation, reload.before.generation); }
      if (row.finished) {
        const saved = decode(row.finished.raw), state = saved.career, result = state.results[0]; assert.equal(state.phase, 'raceResult'); assert.equal(state.results.length, 1); assert.deepEqual(saved.completedSeasons, []);
        assert.deepEqual(row.resultUI, { cards: own(state).map(driver => { const entry = state.race.entries.find(value => value.driverId === driver.id), c = result.classification.find(value => value.driverId === driver.id); return { name: driver.name, position: c.status === 'retired' ? 'Retired' : 'P' + c.position, tyres: entry.compound.charAt(0).toUpperCase() + entry.compound.slice(1) + ' tyres, ' + Math.round(entry.tyreWear) + '% wear, ' + entry.stops + ' stops' }; }), prize: money(result.teamPrize), costs: money(result.operatingCost) });
        const rank = (a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums;
        assert.deepEqual(row.standings, [{ title: 'Driver standings', rows: state.driverStandings.slice().sort((a, b) => rank(a, b) || a.driverId.localeCompare(b.driverId)).map((value, i) => [String(i + 1), state.drivers.find(driver => driver.id === value.driverId).name, String(value.points), String(value.wins)]) },
          { title: 'Team standings', rows: state.constructorStandings.slice().sort((a, b) => rank(a, b) || a.teamId.localeCompare(b.teamId)).map((value, i) => [String(i + 1), state.teams.find(team => team.id === value.teamId).name, String(value.points), String(value.wins)]) }]);
      }
    }
  }],
  ['legacy-raw', rows => {
    const row = rows.find(value => value.mode === 'legacy'); assert(row); assert.equal(row.boot.raw, legacyEnvelope);
    assert.equal(row.boot.operations.filter(value => value.key === gameKey).length, 0);
    const before = decode(legacyEnvelope).career, after = decode(row.final.raw).career;
    assert.equal(before.teamId, 'gp-team-6'); assert.deepEqual(own(before).map(driver => driver.id), ['gp-driver-12', 'gp-driver-13']);
    assert.equal(after.teamId, before.teamId); assert.deepEqual(own(after).map(driver => ({ id: driver.id, wage: driver.contract.wagePerRace })), own(before).map(driver => ({ id: driver.id, wage: driver.contract.wagePerRace })));
    assert.equal(row.legacy.after.raw, row.turns[0].after.raw);
  }],
  ['plan', rows => {
    const row = rows.find(value => value.mode === 'review'), state = decode(row.plan.raw).career, p = state.nextSeasonPlan;
    assert.deepEqual(row.plan.actual, { 'gp-season-end-cash': money(state.cash), 'gp-next-sponsor': money(p.sponsor), 'gp-next-renewal-fee': money(p.totalRenewalFee), 'gp-next-replacement-fee': money(p.totalReplacementFee), 'gp-next-reserved': money(p.nextReserved), 'gp-next-cash-after': money(p.cashAfter) });
    assert.equal(row.plan.replacements.length, p.seatReplacements.length);
    for (const quote of p.seatReplacements) {
      const data = row.plan.replacements.find(value => value.departingId === quote.departingDriverId), d = quote.rookie, departing = state.drivers.find(value => value.id === quote.departingDriverId);
      for (const value of [departing.name, d.name, 'Age ' + d.age, 'Potential ' + d.potential, 'Pace ' + d.skills.pace, 'Consistency ' + d.skills.consistency, 'Tyre care ' + d.skills.tyreCare, 'Wet ' + d.skills.wet, 'Fee ' + money(quote.signingFee), 'Wage ' + money(d.contract.wagePerRace) + ' per race', d.contract.years + ' season from year ' + d.contract.startsSeason]) assert(data.text.includes(value));
    }
  }],
  ['history', rows => {
    const row = rows.find(value => value.mode === 'review'), state = decode(row.history.raw).career, saved = state.history.find(value => value.season === 1);
    assert.deepEqual(row.history.actual, { 'gp-archive-driver-champion': saved.driverChampion.name, 'gp-archive-driver-points': String(saved.driverChampion.points), 'gp-archive-team-champion': saved.constructorChampion.name, 'gp-archive-team-points': String(saved.constructorChampion.points), 'gp-archive-end-cash': money(saved.endCash) });
    assert.equal(row.history.races.length, 12);
    assert.deepEqual(row.history.car, Object.fromEntries(['power', 'aero', 'reliability'].map(area => [area, String(saved.finalCar[area])])));
    assert.deepEqual(row.history.totals, { seasons: String(state.careerTotals.archivedSeasons), drivers: String(state.careerTotals.driverTitles), teams: String(state.careerTotals.constructorTitles) });
    for (const result of saved.races) { const observed = row.history.races.find(value => value.roundId === result.roundId); assert.equal(observed.summary, result.trackName); for (const d of result.drivers) assert(observed.text.includes(d.name + ': ' + (d.status === 'retired' ? 'retired' : 'P' + d.position) + ', ' + d.points + ' pts')); assert(observed.text.includes('Prize ' + money(result.teamPrize) + ', costs ' + money(result.operatingCost))); }
    assert.deepEqual(row.history.opened.map(value => value.roundId), [saved.races[0].roundId, saved.races.at(-1).roundId]);
    for (const opened of row.history.opened) { assert.equal(opened.open, true); assert.equal(opened.bodyVisible, true); const race = saved.races.find(value => value.roundId === opened.roundId); assert(opened.text.includes(race.trackName)); for (const d of race.drivers) assert(opened.text.includes(d.name)); assert(opened.text.includes('Prize ' + money(race.teamPrize) + ', costs ' + money(race.operatingCost))); }
    assert.equal(row.history.afterReload.raw, row.rolled.raw); assert(row.history.coverage.includes('Recorded since year ' + state.careerTotals.sinceSeason + '.'));
  }],
  ['route', rows => {
    assert.equal(rows.length, 5); assert.deepEqual(rows.map(row => row.id), specs.map(row => row.id));
    for (const row of rows) { const game = row.routes.find(value => value.name === 'Game'); assert.equal(game.path, '/grand-prix-boss'); assert.equal(game.header, 0); assert.equal(game.gameNav, 1); assert.equal(game.footers, 1); assert(row.assets.some(asset => asset.name === entryScript[0])); assert(row.footer.text.includes('independent fan project')); assert(row.footer.text.includes('UEFA')); assert.equal(row.footer.reportButtons, 1); }
    const mini = rows[0]; assert.equal(mini.catalog.href, '/grand-prix-boss'); assert(mini.catalog.heading.startsWith('Formula 1')); assert(mini.catalog.card.includes('Grand Prix Boss')); assert.equal(mini.routes.find(value => value.name === 'Home').header, 1); assert.equal(mini.routes.find(value => value.name === 'Back Home').path, '/');
  }],
  ['guide', rows => { for (const row of rows) { assert.equal(row.guide.status, 'ready'); for (const value of ['How to play Grand Prix Boss', 'Grand Prix Boss rules for racing and money', 'Grand Prix Boss example: two different tyre plans']) assert(row.guide.headings.includes(value)); assert(row.guide.text.includes('This is a made-up example')); assert(row.guide.text.includes('forty-three team points')); assert(row.guide.text.includes('seventy percent')); } }],
  ['rules', rows => { for (const row of rows) { assert.equal(row.rules.length, 2); assert.equal(row.rules[0].first, true); for (const help of row.rules) for (const re of [/development focus/i, /before the first qualifying session/i, /paid terms remain honored/i, /retirement/i, /reserve/i, /70%/i, /A retirement replacement example/i, /two/i]) assert.match(help.text, re); } }],
  ['consent', rows => { for (const row of rows) { assert.equal(row.consent.initialPresent, true); assert.equal(row.consent.label, 'Cookie choices'); assert.equal(row.consent.preferences.version, 2); assert.equal(row.consent.preferences.advertising, false); assert.equal(row.consent.preferences.analytics, false); } }],
  ['focus', rows => { for (const row of rows) { assert(row.focus.length >= 3); for (const f of row.focus) assert.equal(f.correct, true); for (const action of row.actions) { if (action.stable !== null) assert.equal(action.stable, true); if (action.navigation) continue; for (const s of action.scroll.reveals) { assert.equal(s.connected, true); const visible = Math.max(0, Math.min(s.before.bottom, s.insets.vh - s.insets.bottom) - Math.max(s.before.top, s.insets.top)); const comfortable = s.before.top >= s.insets.top - 4 && visible >= Math.min(190, s.before.height); assert(!(comfortable && s.finalY > s.y + 4)); assert(s.after.top >= s.afterInsets.top - 4); } for (const s of action.scroll.window) assert(Math.abs(s.finalY - s.y) <= 4); } } }],
  ['target-size', rows => { for (const row of rows) { assert(row.folds.length >= 1); for (const f of row.folds) { assert(f.box); assert(f.box.height >= 44); } for (const t of row.targets) { if (t.core) assert(t.height >= 44); assert(t.width > 0); } } }],
  ['target-hit', rows => { for (const row of rows) for (const t of row.targets) { assert.equal(t.hit, true); assert(t.x >= -.5 && t.x + t.width <= t.viewportWidth + .5); assert(t.y + t.height > 0 && t.y < t.viewportHeight); } }],
  ['overflow', rows => { for (const row of rows) { assert(row.widths.length > 0); for (const w of row.widths) assert(w.scroll <= w.client + 1); } }],
  ['native-APIs', rows => { for (const row of rows) for (const s of row.snapshots) for (const value of Object.values(s.native)) assert.equal(value, true); }],
  ['transport', rows => { for (const row of rows) { assert.deepEqual(row.unexpected, []); for (const read of row.blocked) if (!['GET', 'OPTIONS'].includes(read.method)) { assert.equal(read.method, 'POST'); assert.equal(read.kind, 'catalog-read-rpc'); assert.deepEqual(read.body, { p_min: 3, p_limit: 3 }); } } }],
  ['runtime', rows => { for (const row of rows) { assert.deepEqual(row.pageErrors, []); assert.deepEqual(row.consoleUnexpected, []); assert.deepEqual(row.failedUnexpected, []); assert.deepEqual(row.routeErrors, []); assert.deepEqual(row.cleanupErrors, []); } }],
  ['asset-bytes', rows => { for (const row of rows) { assert(row.assets.length > 0); for (const asset of row.assets) { const heldAsset = asset.kind === 'font' ? fonts.get(asset.name) : assets.get(asset.name); assert(heldAsset); assert.equal(asset.sha256, heldAsset.sha256); assert.equal(asset.bytes, heldAsset.body.length); assert.equal(asset.fulfilledSha256, heldAsset.sha256); }
    if (row.id === 'phone-natural') {
      assert.deepEqual(row.routeWeight.checkpoints.map(value => value.name), ['load+1500ms', 'settled-guide-before-action']);
      assert.deepEqual(row.routeWeight.pageAndEngineSources, { pageSha256: sha(held.get('src/pages/GrandPrixBoss.tsx')), engineSha256: sha(held.get('src/lib/grandPrixBoss.ts')), separateEngineChunkClaim: false });
      for (const point of row.routeWeight.checkpoints) {
        assert.equal(point.beforeAnyUserAction, true); assert.equal(point.gameRaw, null); assert.equal(point.gameWrites, 0);
        assert(point.clock.loadEventEndMs > 0); assert(point.clock.elapsedSinceLoadMs >= 1500);
        assert.deepEqual(point.files.map(value => value.file), [...new Set(point.resources.map(value => value.file))].sort()); assert(point.files.some(value => value.file === entryScript[0]));
        for (const file of point.files) { const actual = assets.get(file.file); assert(actual); assert.equal(file.bytes, actual.body.length); assert.equal(file.sha256, actual.sha256); assert.equal(file.gzipBytes, gzipSync(actual.body).length); }
        assert.equal(point.uniqueFiles, point.files.length); assert.equal(point.rawBytes, point.files.reduce((sum, file) => sum + file.bytes, 0)); assert.equal(point.gzipBytes, point.files.reduce((sum, file) => sum + file.gzipBytes, 0)); assert.equal(point.gzipKiB, point.gzipBytes / 1024);
      }
      assert.equal(row.routeWeight.checkpoints[1].guideReady, true);
    }
  } }],
]);
function validate(rows, selected = null) {
  for (const [name, check] of guards) if (!selected || name === selected) {
    try { check(rows); } catch (error) { if (!(error instanceof assert.AssertionError)) throw error; throw new assert.AssertionError({ message: 'GP_APP_' + name.toUpperCase().replaceAll('-', '_') + ': ' + error.message, actual: error.actual, expected: error.expected, operator: error.operator }); }
  }
}
function controls(rows) {
  const mutations = new Map([
    ['canonical-save', values => { values[0].turns[0].after = { ...values[0].turns[0].after, raw: values[0].turns[0].before.raw }; }],
    ['legacy-raw', values => { values.find(row => row.mode === 'legacy').boot = { ...values.find(row => row.mode === 'legacy').boot, raw: JSON.stringify(decode(legacyEnvelope)) }; }],
    ['plan', values => { values.find(row => row.mode === 'review').plan.actual['gp-next-replacement-fee'] += '1'; }],
    ['history', values => { values.find(row => row.mode === 'review').history.actual['gp-archive-driver-champion'] = 'Copied wrong champion'; }],
    ['route', values => { values[0].routes.find(row => row.name === 'Game').path = '/'; }],
    ['guide', values => { values[0].guide.headings = []; }],
    ['rules', values => { values[0].rules[0].text = 'Copied missing lifecycle rules'; }],
    ['consent', values => { values[0].consent.preferences.advertising = true; }],
    ['focus', values => { values[0].focus[0].correct = false; }],
    ['target-size', values => { values[0].targets.find(value => value.core).height = 43; }],
    ['target-hit', values => { values[0].targets[0].hit = false; }],
    ['overflow', values => { values[0].widths[0].scroll = values[0].widths[0].client + 2; }],
    ['native-APIs', values => { values[0].snapshots[0].native.random = false; }],
    ['transport', values => { values[0].unexpected.push({ method: 'POST', url: 'https://example.invalid/copied-write' }); }],
    ['runtime', values => { values[0].pageErrors.push({ name: 'CopiedError', message: 'Owned detached runtime control' }); }],
    ['asset-bytes', values => { values.find(row => row.id === 'phone-natural').routeWeight.checkpoints[0].gzipBytes += 1; }],
  ]);
  assert.equal(mutations.size, 16); const baseHash = sha(JSON.stringify(rows)), result = [];
  for (const [name, mutate] of mutations) {
    const changed = clone(rows); mutate(changed); const changedHash = sha(JSON.stringify(changed)); assert.notEqual(changedHash, baseHash);
    assert.throws(() => validate(changed), error => error instanceof assert.AssertionError && error.message.startsWith('GP_APP_' + name.toUpperCase().replaceAll('-', '_') + ':'));
    assert.equal(sha(JSON.stringify(rows)), baseHash); validate(rows); result.push({ name, originalSha256: baseHash, changedSha256: changedHash, ownedRefusal: true, restoredHealthy: true });
  }
  return result;
}
try {
  server = http.createServer((request, response) => { try { const name = documentAsset(new URL(request.url, 'http://localhost')); const asset = assets.get(name); if (request.method !== 'GET' || !asset) { response.writeHead(404); response.end(); return; } response.writeHead(200, { 'content-type': asset.contentType }); response.end(asset.body); } catch { response.writeHead(400); response.end(); } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port; browser = await chromium.launch({ headless: true });
  for (const spec of specs) { const row = await collect(spec); records.push(row); validate([row], 'canonical-save'); console.log(spec.id + ': actual App flow collected, full five-context acceptance pending.'); }
  validate(records); const refusalControls = controls(records); assert.equal(refusalControls.length, 16);
  summary = { scope: 'Five actual built main/App contexts. Three native one-race starts, one declared engine-played C review and one exact captured old-byte load. Real providers, chrome, consent and RulesGate. No production request delivery or full UI-played year claim.', sourceCommit: process.env.GITHUB_SHA, configured: specs.length, attempted: attempted.length, completed: records.length, healthyContexts: records.length, copiedObservationControls: refusalControls.length, controls: refusalControls, routeWeight: records.find(row => row.id === 'phone-natural').routeWeight, screenshotCount: records.reduce((sum, row) => sum + row.screenshots.length, 0), records: records.map(row => ({ id: row.id, screenshots: row.screenshots.length, canonicalTransitions: row.turns.length, nativeReloads: row.reloads.length, blockedReads: row.blocked.length, fulfilledAssets: row.assets.length })) };
} catch (error) {
  primary = error; write('failure.json', { name: error.name, message: error.message, stack: error.stack, configured: specs.length, attempted, completed: records.map(row => row.id), healthyContextCredit: 0, copiedControlCredit: 0 });
} finally {
  try { if (browser) await browser.close(); } catch (error) { cleanupErrors.push({ step: 'browser', name: error.name, message: error.message }); }
  try { if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } catch (error) { cleanupErrors.push({ step: 'server', name: error.name, message: error.message }); }
  const actualSources = [];
  for (const [file, bytes] of held) { try { const actual = fs.readFileSync(path.join(root, file)); actualSources.push({ file, bytes: actual.length, sha256: sha(actual) }); assert.deepEqual(actual, bytes, 'Actual source stays held: ' + file); } catch (error) { cleanupErrors.push({ step: 'source', file, message: error.message }); } }
  for (const [file, bytes] of prepHolds) { try { assert.deepEqual(fs.readFileSync(file), bytes, 'Prepared fixture stays held'); } catch (error) { cleanupErrors.push({ step: 'prepared', file, message: error.message }); } }
  for (const [name, asset] of assets) { try { assert.equal(sha(fs.readFileSync(path.join(dist, name.slice(1)))), asset.sha256, 'Built bytes stay held'); assert.equal(sha(asset.body), asset.sha256); } catch (error) { cleanupErrors.push({ step: 'build', file: name, message: error.message }); } }
  write('source-after.json', actualSources); write('cleanup.json', cleanupErrors); console.log('Actual App evidence: ' + evidence);
}
if (primary) throw primary;
assert.deepEqual(cleanupErrors, [], 'All source, build, fixture and cleanup holds');
write('summary.json', summary);
console.log('GP_APP: five healthy actual App contexts and sixteen effective copied-observation refusals, exact final source and assets held.');
