import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGE_SHA = 'f2bf041677d3604c9137e617288a26172e56c8bcf67ab4c44483d900f9e999f7';
assert(/^[a-f0-9]{64}$/.test(PAGE_SHA), 'Final reviewed decision Page binding is required');
for (const key of ['GP_DECISION_APP_PREP', 'GP_DECISION_APP_OUT', 'GP_DECISION_APP_FONTS']) assert(process.env[key], 'Explicit ' + key);
const prep = path.resolve(process.env.GP_DECISION_APP_PREP), out = path.resolve(process.env.GP_DECISION_APP_OUT);
assert(!fs.existsSync(out), 'Fresh browser evidence'); fs.mkdirSync(out, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const clone = value => structuredClone(value), key = 'grand-prix-boss-save-v1';
const write = (name, value) => fs.writeFileSync(path.join(out, name), Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const files = ['src/main.tsx', 'src/App.tsx', 'src/pages/GrandPrixBoss.tsx', 'src/hooks/useGrandPrixBoss.ts',
  'src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'src/lib/saveFence.ts', 'src/lib/safeStorage.ts',
  'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts', 'src/contexts/AuthContext.tsx',
  'src/components/game/RulesGate.tsx', 'src/components/game/GameShell.tsx', 'src/components/game/GameNavbar.tsx',
  'src/components/game/Footer.tsx', 'src/components/CookieConsent.tsx', 'src/lib/consentPreferences.ts',
  'src/components/seo/GameSeoContent.tsx', 'src/data/gameContent/grandPrixBoss.ts',
  'src/lib/liveScores.ts', 'src/hooks/useMostPlayed.ts', 'src/components/home/PollOfTheDay.tsx',
  'src/components/FlagImg.tsx', 'scripts/qa/playGrandPrixDecisionApp.mjs',
  'scripts/qa/prepareGrandPrixDecisionApp.mjs', 'package.json', 'package-lock.json'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
assert.equal(sha(held.get(files[2])), PAGE_SHA);
const sourceRows = () => [...held].map(([file, b]) => ({ file, bytes: b.length, sha256: sha(b) }));
write('source-before.json', sourceRows());
const preparedBytes = fs.readFileSync(path.join(prep, 'manifest.json')), prepared = JSON.parse(preparedBytes);
assert.equal(prepared.status, 'prepared'); assert.equal(prepared.schema, 1);
const prepHeld = new Map([[path.join(prep, 'manifest.json'), preparedBytes]]);
const preparedBody = row => {
  assert(typeof row.file === 'string' && !path.isAbsolute(row.file) && !row.file.split(/[\\/]/).includes('..'));
  const file = path.join(prep, row.file), b = fs.readFileSync(file);
  assert.equal(b.length, row.bytes); assert.equal(sha(b), row.sha256); prepHeld.set(file, b); return b;
};
preparedBody(prepared.oracle); const initialBytes = preparedBody(prepared.save), initialRaw = initialBytes.toString('utf8');
for (const row of prepared.source) if (held.has(row.file)) assert.equal(sha(held.get(row.file)), row.sha256);
const engine = await import(pathToFileURL(path.join(prep, prepared.oracle.file)).href);
const decode = raw => {
  const envelope = JSON.parse(raw), input = JSON.stringify(envelope.career);
  assert.equal(envelope.schemaVersion, 1); assert.deepEqual(envelope.completedSeasons, []);
  const result = engine.validateSavedCareer(envelope.career);
  assert.equal(JSON.stringify(envelope.career), input); assert.equal(result.ok, true);
  assert.deepEqual(result.state, envelope.career); return result.state;
};
assert.deepEqual(decode(initialRaw), engine.createCareer(42));
const fontFile = path.resolve(process.env.GP_DECISION_APP_FONTS), fontBytes = fs.readFileSync(fontFile);
assert.equal(sha(fontBytes), 'a6c24e3ec7711d400f53a1baf10a3a6a3925d1f269e48ee0cd14bdca5b749938');
const fontRows = JSON.parse(fontBytes).entries; assert.equal(fontRows.length, 9);
const fonts = new Map(fontRows.map(row => {
  const u = new URL(row.url); assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(u.origin));
  assert.equal(row.encoding, 'gzip+hex'); const body = gunzipSync(Buffer.from(row.body, 'hex'));
  assert.equal(body.length, row.bytes); assert.equal(sha(body), row.sha256);
  return [row.url, { body, contentType: row.contentType, sha256: row.sha256 }];
}));
assert.equal(fonts.size, 9);
const dist = path.resolve(process.env.GP_DECISION_APP_DIST || path.join(root, 'dist')), assets = new Map();
const mime = name => name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8'
  : /\.m?js$/.test(name) ? 'text/javascript; charset=utf-8' : name.endsWith('.json') ? 'application/json'
  : name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.png') ? 'image/png' : name.endsWith('.ico') ? 'image/x-icon'
  : name.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
function tree(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name); assert(!item.isSymbolicLink());
    if (item.isDirectory()) tree(file); else { assert(item.isFile()); const body = Buffer.from(fs.readFileSync(file));
      assets.set('/' + path.relative(dist, file).split(path.sep).join('/'), { body, contentType: mime(file), sha256: sha(body) }); }
  }
}
tree(dist); assert(assets.has('/grand-prix-boss/index.html'));
write('asset-inputs.json', [...assets].map(([file, a]) => ({ file, bytes: a.body.length, sha256: a.sha256 })));
const localPath = u => { assert.equal(u.search, ''); if (u.pathname === '/') return '/index.html'; return ['/grand-prix-boss', '/grand-prix-boss/'].includes(u.pathname) ? '/grand-prix-boss/index.html' : u.pathname; };
const publicOrigin = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const pollSelect = 'poll_key,question,option_a,option_a_emoji,option_a_flag,option_b,option_b_emoji,option_b_flag,option_c,option_c_emoji,option_c_flag,option_d,option_d_emoji,option_d_flag,sort_order';
function publicRead(request) {
  const u = new URL(request.url()), m = request.method(), p = u.searchParams;
  if (u.origin === 'https://flagcdn.com' && m === 'GET' && !u.search && /^\/w(?:20|40|80|160|320)\/[a-z]{2}\.png$/.test(u.pathname)) return 'flag-image';
  if (u.origin !== publicOrigin || !['GET', 'POST', 'OPTIONS'].includes(m)) return null;
  const effective = m === 'OPTIONS' ? request.headers()['access-control-request-method']?.toUpperCase() : m;
  if (u.pathname === '/rest/v1/live_scores' && effective === 'GET' && p.get('select') === '*' && p.get('order') === 'start_at.asc' && p.get('limit') === '150'
    && [...p.keys()].length === 5 && p.getAll('start_at').length === 2 && p.getAll('start_at').map(v => v.slice(0, 4)).sort().join(',') === 'gte.,lte.'
    && p.getAll('start_at').every(v => Number.isFinite(Date.parse(v.slice(4))))) return 'live-scores';
  if (u.pathname === '/rest/v1/daily_polls' && effective === 'GET' && [...p.keys()].length === 3 && p.get('select') === pollSelect
    && /^eq\.\d{4}-\d{2}-\d{2}$/.test(p.get('poll_date') || '') && p.get('order') === 'sort_order.asc') return 'daily-polls';
  if (u.pathname === '/rest/v1/rpc/most_played_today' && effective === 'POST' && !u.search) {
    if (m === 'OPTIONS') return 'catalog-read-preflight';
    try { const b = JSON.parse(request.postData()); if (Object.keys(b).sort().join(',') === 'p_limit,p_min' && b.p_min === 3 && b.p_limit === 3) return 'catalog-read-rpc'; } catch {}
  }
  return null;
}
function probe({ origin, initialRaw }) {
  if (location.origin !== origin) return;
  const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  const storage = localStorage, gameKey = 'grand-prix-boss-save-v1';
  const seeded = get.call(storage, gameKey) === null;
  if (seeded) set.call(storage, gameKey, initialRaw);
  const operations = [], reveals = [], scrolls = [];
  Storage.prototype.setItem = function(k, v) { const r = set.apply(this, arguments); if (this === storage) operations.push({ type: 'set', key: k }); return r; };
  Storage.prototype.removeItem = function(k) { const r = remove.apply(this, arguments); if (this === storage) operations.push({ type: 'remove', key: k }); return r; };
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
  const into = Element.prototype.scrollIntoView, to = window.scrollTo;
  Element.prototype.scrollIntoView = function() { reveals.push({ node: this, before: rect(this), y: scrollY, insets: insets() }); return into.apply(this, arguments); };
  window.scrollTo = function() { scrolls.push({ y: scrollY }); return to.apply(this, arguments); };
  window.gpDecisionProof = Object.freeze({
    inspect() { return { raw: get.call(storage, gameKey), generation: get.call(storage, 'dukb-fence:' + gameKey),
      consent: get.call(storage, 'cookie-consent-v2'), operations: operations.slice(), seeded, y: scrollY, timeOrigin: performance.timeOrigin,
      navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null,
      native: { random: /\[native code\]/.test(Math.random.toString()), date: /\[native code\]/.test(Date.toString()),
        now: /\[native code\]/.test(Date.now.toString()), crypto: /\[native code\]/.test(crypto.getRandomValues.toString()),
        performance: /\[native code\]/.test(performance.now.toString()), animation: /\[native code\]/.test(requestAnimationFrame.toString()) } }; },
    reset() { reveals.length = 0; scrolls.length = 0; },
    scroll() { return { reveals: reveals.map(({ node, ...r }) => ({ ...r, connected: node.isConnected, after: rect(node), afterInsets: insets(), finalY: scrollY })),
      window: scrolls.map(r => ({ ...r, finalY: scrollY })) }; }
  });
}
const specs = [{ id: 'mini', width: 320, height: 664, deviceScaleFactor: 2 },
  { id: 'phone', width: 392, height: 731, deviceScaleFactor: 2.75 }, { id: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 }];
const own = state => state.drivers.filter(d => d.contract?.teamId === state.teamId);
const entries = state => state.race.entries.slice().sort((a, b) => Number(a.status === 'retired') - Number(b.status === 'retired')
  || b.completedLaps - a.completedLaps || a.elapsedMs - b.elapsedMs || a.driverId.localeCompare(b.driverId));
const metric = (state, entry) => {
  if (entry.status === 'retired') return 'Retired after ' + entry.completedLaps + ' lap' + (entry.completedLaps === 1 ? '' : 's');
  const leader = entries(state).find(e => e.status !== 'retired');
  assert(leader); return 'Gap to leader: ' + (entry.driverId === leader.driverId ? 'Leader' : '+' + ((entry.elapsedMs - leader.elapsedMs) / 1000).toFixed(3) + 's');
};
let server = null, browser = null, origin = null, primary = null;
const records = [], controls = [], cleanup = [];
const errorRow = e => ({ name: e?.name || 'Error', message: String(e?.message || e), stack: String(e?.stack || e) });
async function collect(spec) {
  const row = { id: spec.id, viewport: spec, snapshots: [], profiles: [], quotes: [], timings: [], turns: [], readOnly: [], actions: [], targets: [], widths: [],
    focus: [], screenshots: [], reloads: [], fulfilled: [], responses: [], blocked: [], unexpected: [], pageErrors: [], console: [], requestFailures: [], routeErrors: [], responseErrors: [], cleanupErrors: [], primary: null };
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: spec.deviceScaleFactor, serviceWorkers: 'block' });
  let page; const tasks = new Set(), blockedUrls = new Set();
  await context.addInitScript(probe, { origin, initialRaw });
  await context.route('**/*', route => {
    const task = (async () => {
      const req = route.request(), u = new URL(req.url()), method = req.method();
      let asset, name, kind;
      if (u.origin === origin && method === 'GET') { name = localPath(u); asset = assets.get(name); kind = 'local'; }
      else if (method === 'GET' && fonts.has(u.href)) { name = u.href; asset = fonts.get(name); kind = 'font'; }
      if (asset) {
        assert(Buffer.isBuffer(asset.body)); assert.equal(sha(asset.body), asset.sha256);
        row.fulfilled.push({ name, kind, url: u.href, bytes: asset.body.length, sha256: asset.sha256 });
        return await route.fulfill({ status: 200, body: asset.body, contentType: asset.contentType, headers: { 'access-control-allow-origin': '*' } });
      }
      const read = publicRead(req);
      if (read) { assert(row.blocked.length < 100); blockedUrls.add(u.href); row.blocked.push({ method, url: u.href, kind: read }); return await route.abort('failed'); }
      row.unexpected.push({ method, url: u.href, bodySHA256: req.postData() ? sha(req.postData()) : null }); return await route.abort('blockedbyclient');
    })().catch(e => row.routeErrors.push(errorRow(e))).finally(() => tasks.delete(task)); tasks.add(task); return task;
  });
  const snap = async label => { const s = await page.evaluate(() => window.gpDecisionProof.inspect()); row.snapshots.push({ label, ...s }); return s; };
  const settle = async () => { let last = null; for (let i = 0; i < 35; i++) { const y = await page.evaluate(() => scrollY); if (last !== null && Math.abs(y - last) < .5) return; last = y; await page.waitForTimeout(40); } throw Error('Native scroll did not settle'); };
  const width = async label => row.widths.push({ label, ...await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })) });
  const target = async (loc, label) => {
    assert.equal(await loc.count(), 1, label); await loc.scrollIntoViewIfNeeded(); await settle();
    row.targets.push({ label, ...await loc.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight, hit: !!hit && (el === hit || el.contains(hit)),
        core: !el.closest('[data-site-chrome]') && !!el.closest('main#dukb-main,[role="dialog"]') }; }) }); await width(label);
  };
  const button = name => page.getByRole('button', { name, exact: true });
  const panel = name => page.locator('[data-gp-panel="' + name + '"]');
  const press = async (loc, label) => { await target(loc, label); await page.evaluate(() => window.gpDecisionProof.reset()); await loc.click(); await page.waitForTimeout(80); await settle();
    row.actions.push({ label, method: 'locator.click', scroll: await page.evaluate(() => window.gpDecisionProof.scroll()) }); };
  const choose = async (loc, value, label) => {
    await target(loc, label); await loc.focus(); assert.equal(await loc.evaluate(el => document.activeElement === el), true);
    await page.evaluate(() => window.gpDecisionProof.reset()); await loc.selectOption(value); await settle();
    row.focus.push({ label, correct: await loc.evaluate(el => document.activeElement === el) });
    row.actions.push({ label, method: 'locator.selectOption after explicit focus', value, scroll: await page.evaluate(() => window.gpDecisionProof.scroll()) });
  };
  const readonly = async (label, fn) => { const before = await snap(label + '-before'); await fn(); const after = await snap(label + '-after'); row.readOnly.push({ label, before, after }); };
  const shot = async name => { await settle(); const file = spec.id + '-' + name + '.png'; await page.screenshot({ path: path.join(out, file), fullPage: false });
    const b = fs.readFileSync(path.join(out, file)); row.screenshots.push({ file, bytes: b.length, sha256: sha(b) }); };
  const profile = async () => {
    const state = decode((await snap('profile')).raw), outgoing = await page.getByRole('combobox', { name: 'Seat to change', exact: true }).inputValue(),
      incoming = await page.getByRole('combobox', { name: 'Incoming driver', exact: true }).inputValue();
    const region = page.getByRole('region', { name: 'Incoming driver profile', exact: true }); await region.waitFor();
    const text = await region.evaluate(el => { const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), pieces = []; while (walker.nextNode()) pieces.push(walker.currentNode.textContent || ''); return pieces.join(' ').replace(/\s+/g, ' '); });
    row.profiles.push({ state, outgoing, incoming, text, beforeQuote: await region.evaluate(el => !!(el.compareDocumentPosition(document.querySelector('[data-testid="gp-offer-wage"]')) & Node.DOCUMENT_POSITION_FOLLOWING)) });
    row.quotes.push({ state, outgoing, incoming, actual: await page.locator('[data-testid^="gp-offer-"]').evaluateAll(nodes => Object.fromEntries(nodes.map(el => [el.getAttribute('data-testid'), el.textContent]))) });
  };
  const timing = async label => {
    const state = decode((await snap(label)).raw), cards = [];
    for (const driver of own(state)) {
      const section = panel('Next race').locator('section').filter({ has: page.getByRole('heading', { level: 4, name: driver.name, exact: true }) });
      assert.equal(await section.count(), 1);
      cards.push({ driverId: driver.id, labels: await section.getByText(/^(?:Gap to leader:|Retired after )/).allTextContents() });
    }
    row.timings.push({ label, state, cards, field: await panel('Next race').locator('details ol > li').evaluateAll(nodes => nodes.map(el => ({
      name: el.querySelector('span')?.textContent, metric: el.querySelectorAll('span')[1]?.textContent }))) });
  };
  const commit = async (action, label) => {
    const before = await snap(label + '-before'), state = decode(before.raw), full = { ...action, expectedRevision: state.revision }, input = JSON.stringify(state), result = engine.applyAction(state, full);
    assert.equal(JSON.stringify(state), input); assert.equal(result.ok, true);
    await press(button(label), label);
    await page.waitForFunction(({ key, revision }) => { try { return JSON.parse(localStorage.getItem(key)).career.revision === revision; } catch { return false; } }, { key, revision: result.state.revision });
    row.turns.push({ action: full, before, after: await snap(label + '-after'), expected: result.state });
  };
  try {
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', e => row.pageErrors.push(errorRow(e)));
    page.on('console', m => { if (m.type() === 'error') row.console.push({ text: m.text(), url: m.location().url || '' }); });
    page.on('requestfailed', r => row.requestFailures.push({ url: r.url(), reason: r.failure()?.errorText || null }));
    page.on('response', response => {
      const task = (async () => {
        const u = new URL(response.url()); let a, name, kind;
        if (u.origin === origin) { name = localPath(u); a = assets.get(name); kind = 'local'; }
        else if (fonts.has(u.href)) { name = u.href; a = fonts.get(name); kind = 'font'; }
        if (!a) return;
        const b = Buffer.from(await response.body()); row.responses.push({ name, kind, bytes: b.length, sha256: sha(b), contentType: response.headers()['content-type'] || null });
        assert.equal(b.length, a.body.length); assert.equal(sha(b), a.sha256);
      })().catch(e => row.responseErrors.push(errorRow(e))).finally(() => tasks.delete(task)); tasks.add(task);
    });
    await page.goto(origin + '/grand-prix-boss', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const dialog = page.getByRole('dialog', { name: 'How to play Grand Prix Boss', exact: true }); await dialog.waitFor();
    const consent = dialog.locator('[data-dukb-help-cookie-choices]').getByRole('region', { name: 'Cookie choices', exact: true }); await consent.waitFor();
    await press(consent.getByRole('button', { name: 'Reject all', exact: true }), 'Reject actual consent'); await consent.waitFor({ state: 'hidden' });
    row.consent = JSON.parse((await snap('consent')).consent);
    row.rulesText = await dialog.innerText(); await press(dialog.getByRole('button', { name: "Let's Play!", exact: true }), 'Enter actual rules'); await dialog.waitFor({ state: 'hidden' });
    await button('Drivers').waitFor(); row.boot = await snap('boot');
    row.route = { path: new URL(page.url()).pathname, gameNav: await page.locator('main#dukb-main nav[data-site-chrome]').count(), footer: await page.locator('footer[data-site-chrome]').count() };
    await readonly('Open and choose incoming driver', async () => {
      await press(button('Drivers'), 'Open Drivers'); await panel('Drivers').waitFor(); await profile();
      const state = decode((await snap('choices')).raw), outgoing = own(state)[0].id;
      const ids = state.marketOffers.filter(o => o.outgoingDriverId === outgoing).map(o => o.incomingDriverId);
      assert(ids.length >= 2);
      await choose(page.getByRole('combobox', { name: 'Incoming driver', exact: true }), ids[1], 'Choose actual second incoming driver'); await profile(); await shot('profile');
      await press(button('Back to team'), 'Back from Drivers'); row.focus.push({ label: 'Back Drivers', correct: await button('Drivers').evaluate(el => el === document.activeElement) });
    });
    await press(button('Next race'), 'Open Next race'); await commit({ type: 'qualify' }, 'Run qualifying');
    await readonly('Grid setup choices', async () => {
      const state = decode((await snap('grid')).raw), setups = [];
      for (const [i, d] of own(state).entries()) {
        const compound = state.race.weather === 'wet' ? 'wet' : i ? 'hard' : 'soft', pace = i ? 'conserve' : 'push';
        await choose(page.getByRole('combobox', { name: 'Tyres for ' + d.name, exact: true }), compound, 'Grid tyres ' + d.id);
        await choose(page.getByRole('combobox', { name: 'Pace for ' + d.name, exact: true }), pace, 'Grid pace ' + d.id); setups.push({ driverId: d.id, compound, pace });
      }
      row.setups = setups; await timing('grid'); await shot('grid');
    });
    await commit({ type: 'startRace', setups: row.setups }, 'Start race');
    const started = decode((await snap('lap-zero')).raw); row.lapZeroLabels = await panel('Next race').getByText(/^(?:Gap to leader:|Retired after )/).allTextContents();
    await commit({ type: 'raceInterval', orders: own(started).map(d => ({ driverId: d.id, pace: started.race.entries.find(e => e.driverId === d.id).pace })) }, 'Run to lap 12');
    await readonly('Read saved whole field', async () => { await press(panel('Next race').locator('summary').filter({ hasText: /^Whole field$/ }), 'Open Whole field'); await timing('checkpoint'); await shot('checkpoint'); });
    const before = await snap('reload-before'); await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }); await button('Next race').waitFor();
    const after = await snap('reload-after'); row.reloads.push({ before, after });
    await readonly('Read reloaded checkpoint', async () => { await press(button('Next race'), 'Open reloaded Next race'); await press(panel('Next race').locator('summary').filter({ hasText: /^Whole field$/ }), 'Open reloaded Whole field'); await timing('reloaded'); await shot('reloaded'); });
  } catch (e) { row.primary = errorRow(e); if (page) try { const file = spec.id + '-failure.png'; await page.screenshot({ path: path.join(out, file), fullPage: false }); row.failureScreenshot = file; } catch {} }
  finally {
    await Promise.allSettled([...tasks]);
    try { await context.close(); } catch (e) { row.cleanupErrors.push(errorRow(e)); }
    await Promise.allSettled([...tasks]);
    row.consoleUnexpected = row.console.filter(e => {
      if (blockedUrls.has(e.url) && /^Failed to load resource: net::ERR_FAILED/.test(e.text)) return false;
      const cors = e.text.match(/^Access to fetch at '([^']+)' from origin '([^']+)' has been blocked by CORS policy:/);
      return !(cors && blockedUrls.has(cors[1]) && cors[2] === origin && /preflight|access control|Access-Control-Allow-Origin/i.test(e.text));
    });
    row.failedUnexpected = row.requestFailures.filter(e => !blockedUrls.has(e.url) || e.reason !== 'net::ERR_FAILED');
    write(spec.id + '.json', row);
  }
  return row;
}
const money = v => '€' + v.toLocaleString('en-US');
const guards = [
  ['PROFILE', rows => { for (const r of rows) { assert.equal(r.profiles.length, 2); assert.notEqual(r.profiles[0].incoming, r.profiles[1].incoming);
    for (const p of r.profiles) { const d = p.state.drivers.find(v => v.id === p.incoming); assert(d); assert.equal(p.beforeQuote, true); assert(p.text.includes(d.name));
      for (const [label, v] of [['Age', d.age], ['Potential', d.potential], ['Pace', d.skills.pace], ['Consistency', d.skills.consistency], ['Tyre care', d.skills.tyreCare], ['Wet', d.skills.wet]])
        assert(new RegExp('\\b' + label + '\\s*' + v + '\\b', 'i').test(p.text)); }
    for (const q of r.quotes) { const o = q.state.marketOffers.find(v => v.outgoingDriverId === q.outgoing && v.incomingDriverId === q.incoming); assert(o);
      assert.deepEqual(q.actual, { 'gp-offer-wage': money(o.wagePerRace), 'gp-offer-signing-fee': money(o.signingFee), 'gp-offer-buyout': money(o.buyout), 'gp-offer-total-fee': money(o.totalFee),
        'gp-offer-reserved': money(o.reserveAfter), 'gp-offer-term': o.years + ' season', 'gp-offer-start': 'Year ' + o.startsSeason }); } } }],
  ['TIMING', rows => { for (const r of rows) { assert.equal(r.timings.length, 3); assert.deepEqual(r.lapZeroLabels, []);
    for (const t of r.timings) { const sorted = entries(t.state); assert.equal(t.cards.length, 2); assert.equal(t.field.length, 20);
      for (const c of t.cards) { const e = t.state.race.entries.find(v => v.driverId === c.driverId); assert.deepEqual(c.labels, t.state.race.lap === 0 ? [] : [metric(t.state, e)]); }
      for (const [i, e] of sorted.entries()) { assert.equal(t.field[i].name, (i + 1) + '. ' + t.state.drivers.find(d => d.id === e.driverId).name);
        assert.equal(t.field[i].metric, t.state.race.lap === 0 ? e.completedLaps + ' laps' : metric(t.state, e)); } } } }],
  ['ACTIONS', rows => { for (const r of rows) { assert.equal(r.turns.length, 3); assert.deepEqual(r.turns.map(t => t.action.type), ['qualify', 'startRace', 'raceInterval']);
    for (const t of r.turns) { const before = decode(t.before.raw), result = engine.applyAction(before, t.action); assert.equal(result.ok, true); assert.deepEqual(t.expected, result.state); assert.deepEqual(decode(t.after.raw), result.state); assert.equal(result.state.revision, before.revision + 1); }
    for (const p of r.readOnly) { assert.equal(p.after.raw, p.before.raw); assert.equal(p.after.generation, p.before.generation);
      assert.deepEqual(p.after.operations.filter(o => o.key === key), p.before.operations.filter(o => o.key === key)); } } }],
  ['RELOAD', rows => { for (const r of rows) { assert.equal(r.boot.raw, initialRaw); assert.equal(r.boot.seeded, true); assert.equal(r.reloads.length, 1);
    const { before, after } = r.reloads[0]; assert.equal(after.raw, before.raw); assert.equal(after.generation, before.generation); assert.equal(after.seeded, false);
    assert.equal(after.navigationType, 'reload'); assert.notEqual(after.timeOrigin, before.timeOrigin); assert.equal(decode(after.raw).race.lap, 12); } }],
  ['GEOMETRY', rows => { for (const r of rows) { assert(r.widths.length > 0); for (const w of r.widths) assert(w.scroll <= w.client + 1);
    for (const t of r.targets) { assert.equal(t.hit, true); assert(t.width > 0); if (t.core) assert(t.height >= 44); assert(t.x >= -.5 && t.x + t.width <= t.vw + .5); assert(t.y + t.height > 0 && t.y < t.vh); } } }],
  ['FOCUS_SCROLL', rows => { for (const r of rows) { assert(r.focus.length > 0); for (const f of r.focus) assert.equal(f.correct, true);
    for (const a of r.actions) { for (const s of a.scroll.reveals) { assert.equal(s.connected, true); const visible = Math.max(0, Math.min(s.before.bottom, s.insets.vh - s.insets.bottom) - Math.max(s.before.top, s.insets.top));
      const comfortable = s.before.top >= s.insets.top - 4 && visible >= Math.min(190, s.before.height); assert(!(comfortable && s.finalY > s.y + 4)); assert(s.after.top >= s.afterInsets.top - 4); }
      for (const s of a.scroll.window) assert(Math.abs(s.finalY - s.y) <= 4); } } }],
  ['BOUNDARY', rows => { assert.equal(rows.length, 3); assert.deepEqual(rows.map(r => r.id), specs.map(s => s.id));
    for (const r of rows) { assert.equal(r.primary, null); assert.deepEqual(r.route, { path: '/grand-prix-boss', gameNav: 1, footer: 1 }); assert.equal(r.consent.version, 2); assert.equal(r.consent.analytics, false); assert.equal(r.consent.advertising, false); assert.match(r.rulesText, /tyre|race/i);
      for (const name of ['unexpected', 'pageErrors', 'consoleUnexpected', 'failedUnexpected', 'routeErrors', 'responseErrors', 'cleanupErrors']) assert.deepEqual(r[name], []);
      for (const s of r.snapshots) for (const v of Object.values(s.native)) assert.equal(v, true); assert.equal(r.screenshots.length, 4); } }],
  ['ASSETS', rows => { for (const r of rows) { assert(r.fulfilled.length > 0 && r.responses.length > 0);
    for (const response of [...r.fulfilled, ...r.responses]) { const a = response.kind === 'font' ? fonts.get(response.name) : assets.get(response.name); assert(a); assert.equal(response.bytes, a.body.length); assert.equal(response.sha256, a.sha256); }
    assert(r.responses.some(v => v.name === '/grand-prix-boss/index.html')); assert(r.responses.some(v => /\/assets\/.*\.js$/.test(v.name))); } }]
];
function validate(rows) {
  for (const [name, check] of guards) try { check(rows); } catch (e) {
    if (!(e instanceof assert.AssertionError)) throw e;
    throw new assert.AssertionError({ message: 'GP_DECISION_APP_' + name + ': ' + e.message, actual: e.actual, expected: e.expected, operator: e.operator });
  }
}
const faults = [
  ['PROFILE', r => { r[0].profiles[0].text = 'Fixture omitted profile'; }],
  ['TIMING', r => { r[0].timings[1].cards[0].labels = ['Fixture wrong saved timing']; }],
  ['ACTIONS', r => { r[0].turns[0].expected.revision += 1; }],
  ['RELOAD', r => { r[0].reloads[0].after.seeded = true; }],
  ['GEOMETRY', r => { r[0].widths[0].scroll = r[0].widths[0].client + 2; }],
  ['FOCUS_SCROLL', r => { r[0].focus[0].correct = false; }],
  ['BOUNDARY', r => { r[0].unexpected.push({ method: 'POST', url: 'https://fixture.invalid/write' }); }],
  ['ASSETS', r => { r[0].responses[0].bytes += 1; }]
];
try {
  server = http.createServer((request, response) => { try { const a = assets.get(localPath(new URL(request.url, 'http://localhost')));
    if (request.method !== 'GET' || !a) { response.writeHead(404); response.end(); return; } response.writeHead(200, { 'content-type': a.contentType }); response.end(a.body);
  } catch { response.writeHead(400); response.end(); } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port; browser = await chromium.launch({ headless: true });
  for (const spec of specs) records.push(await collect(spec));
  const first = records.find(r => r.primary); if (first) throw new Error(first.id + ': ' + first.primary.message);
  write('healthy-observations.json', records); validate(records);
  const original = Buffer.from(JSON.stringify(records)), copy = path.join(out, 'copied-observations.json');
  for (const [owner, mutate] of faults) {
    const changed = clone(records); mutate(changed); const b = Buffer.from(JSON.stringify(changed)); assert.notEqual(sha(b), sha(original));
    fs.writeFileSync(copy, b); assert(fs.readFileSync(copy).equals(b)); write(owner + '.changed.json', b);
    let refused = null;
    assert.throws(() => validate(JSON.parse(fs.readFileSync(copy))), e => {
      refused = errorRow(e);
      return e instanceof assert.AssertionError && e.message.startsWith('GP_DECISION_APP_' + owner + ':');
    });
    write(owner + '.refusal.json', { owner, nativeFirst: refused });
    fs.writeFileSync(copy, original); assert(fs.readFileSync(copy).equals(original)); validate(JSON.parse(fs.readFileSync(copy)));
    controls.push({ owner, changed: true, owned: true, nativeFirst: refused, restoredHealthy: true, changedSHA256: sha(b), restoredSHA256: sha(original) });
  }
} catch (e) { primary = errorRow(e); write('primary.json', primary); }
finally {
  try { if (browser) await browser.close(); } catch (e) { cleanup.push(errorRow(e)); }
  try { if (server?.listening) await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); } catch (e) { cleanup.push(errorRow(e)); }
  try {
    for (const [file, b] of held) assert(fs.readFileSync(path.join(root, file)).equals(b), 'Source held: ' + file);
    for (const [file, b] of prepHeld) assert(fs.readFileSync(file).equals(b), 'Prep held');
    assert(fs.readFileSync(fontFile).equals(fontBytes));
    for (const [name, a] of assets) assert(fs.readFileSync(path.join(dist, name.slice(1))).equals(a.body), 'Dist asset held');
    write('source-after.json', sourceRows());
  } catch (e) { cleanup.push(errorRow(e)); if (!primary) primary = errorRow(e); }
  write('summary.json', { status: primary || cleanup.length ? 'failed' : 'passed', configured: specs.length, collected: records.length,
    healthy: !primary && !cleanup.length ? records.length : 0, nativeActions: records.reduce((s, r) => s + r.actions.length, 0), reloads: records.reduce((s, r) => s + r.reloads.length, 0),
    screenshots: records.reduce((s, r) => s + r.screenshots.length, 0), controls, primary, cleanup,
    scope: 'Three actual built App contexts from exact actual createCareer42 save. Native UI option selection/clicks and three canonical advances each. No natural new-team, full race/year, physical device, live provider, performance or release proof. Controls are detached copied-observation faults.' });
}
if (primary || cleanup.length) throw new Error(primary?.message || 'Cleanup failed');
console.log('Grand Prix decision App:3contexts,12PNGs,3reloads,8changed/owned/restored observation controls.');
