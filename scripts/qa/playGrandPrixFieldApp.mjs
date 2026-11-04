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
const PAGE_SHA = 'e2f816673010d58e48d3ea329fb604ebc90f2695a9660cabaaccebb5191d4161';
assert(/^[a-f0-9]{64}$/.test(PAGE_SHA), 'Final reviewed field Page binding is required');
for (const name of ['GP_FIELD_APP_PREP', 'GP_FIELD_APP_OUT', 'GP_FIELD_APP_FONTS']) assert(process.env[name], 'Explicit ' + name);
const prep = path.resolve(process.env.GP_FIELD_APP_PREP), out = path.resolve(process.env.GP_FIELD_APP_OUT);
assert(!fs.existsSync(out), 'Fresh browser evidence'); fs.mkdirSync(out, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const git = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const key = 'grand-prix-boss-save-v1';
const write = (name, value) => {
  const target = path.join(out, name); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
};
const files = ['src/main.tsx', 'src/App.tsx', 'src/pages/GrandPrixBoss.tsx', 'src/hooks/useGrandPrixBoss.ts',
  'src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'src/lib/saveFence.ts', 'src/lib/safeStorage.ts',
  'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts', 'src/contexts/AuthContext.tsx',
  'src/components/game/RulesGate.tsx', 'src/components/game/GameShell.tsx', 'src/components/game/GameNavbar.tsx',
  'src/components/game/Footer.tsx', 'src/components/CookieConsent.tsx', 'src/lib/consentPreferences.ts',
  'src/components/seo/GameSeoContent.tsx', 'src/data/gameContent/grandPrixBoss.ts',
  'src/lib/liveScores.ts', 'src/hooks/useMostPlayed.ts', 'src/components/home/PollOfTheDay.tsx',
  'src/components/FlagImg.tsx', 'scripts/qa/playGrandPrixFieldApp.mjs',
  'scripts/qa/prepareGrandPrixFieldApp.mjs', 'package.json', 'package-lock.json'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
assert.equal(sha(held.get(files[2])), PAGE_SHA);
assert.equal(git(held.get('src/lib/grandPrixBoss.ts')), 'f85074736a50221d7cd74c9195cc68078cc68e0c');
assert.equal(git(held.get('src/hooks/useGrandPrixBoss.ts')), 'a66fe58c641217ccce0dffb191748f42551c86c6');
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
const saves = new Map();
function retainSave(raw, origin) {
  assert.equal(typeof raw, 'string'); decode(raw);
  const body = Buffer.from(raw), hash = sha(body);
  if (!saves.has(hash)) {
    const ref = { file: 'saves/' + hash + '.json', bytes: body.length, sha256: hash };
    write(ref.file, body); saves.set(hash, { ref, body, origins: [] });
  }
  const kept = saves.get(hash); assert(kept.body.equals(body)); kept.origins.push(origin);
  return { ...kept.ref };
}
function saveBody(ref) {
  assert(saves.has(ref.sha256)); const row = saves.get(ref.sha256);
  assert.equal(ref.file, row.ref.file); assert.equal(ref.bytes, row.body.length);
  const physical = fs.readFileSync(path.join(out, ref.file)); assert(physical.equals(row.body)); return physical;
}
const stateOf = ref => decode(saveBody(ref).toString('utf8'));
const expectedEnvelope = state => JSON.stringify({ schemaVersion: 1, career: state, completedSeasons: [] });
const fontFile = path.resolve(process.env.GP_FIELD_APP_FONTS), fontBytes = fs.readFileSync(fontFile);
assert.equal(sha(fontBytes), 'a6c24e3ec7711d400f53a1baf10a3a6a3925d1f269e48ee0cd14bdca5b749938');
const fontRows = JSON.parse(fontBytes).entries; assert.equal(fontRows.length, 9);
const fonts = new Map(fontRows.map(row => {
  const u = new URL(row.url); assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(u.origin));
  assert.equal(row.encoding, 'gzip+hex'); const body = gunzipSync(Buffer.from(row.body, 'hex'));
  assert.equal(body.length, row.bytes); assert.equal(sha(body), row.sha256);
  return [row.url, { body, contentType: row.contentType, sha256: row.sha256 }];
}));
assert.equal(fonts.size, 9);
const dist = path.resolve(process.env.GP_FIELD_APP_DIST || path.join(root, 'dist')), assets = new Map();
const mime = name => name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8'
  : /\.m?js$/.test(name) ? 'text/javascript; charset=utf-8' : name.endsWith('.json') ? 'application/json'
  : name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.png') ? 'image/png' : name.endsWith('.ico') ? 'image/x-icon'
  : name.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
function tree(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name); assert(!item.isSymbolicLink());
    if (item.isDirectory()) tree(file); else {
      assert(item.isFile()); const body = Buffer.from(fs.readFileSync(file));
      assets.set('/' + path.relative(dist, file).split(path.sep).join('/'), { body, contentType: mime(file), sha256: sha(body) });
    }
  }
}
tree(dist); assert(assets.has('/index.html')); assert(assets.has('/grand-prix-boss/index.html'));
write('asset-inputs.json', [...assets].map(([file, a]) => ({ file, bytes: a.body.length, sha256: a.sha256 })));
write('font-inputs.json', fontRows.map(({ url, bytes, sha256, contentType }) => ({ url, bytes, sha256, contentType })));
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
  const storage = localStorage, gameKey = 'grand-prix-boss-save-v1', seeded = get.call(storage, gameKey) === null;
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
  window.gpFieldProof = Object.freeze({
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
  const leader = entries(state).find(e => e.status !== 'retired'); assert(leader);
  return 'Gap to leader: ' + (entry.driverId === leader.driverId ? 'Leader' : '+' + ((entry.elapsedMs - leader.elapsedMs) / 1000).toFixed(3) + 's');
};
const tyreLine = entry => entry.compound.charAt(0).toUpperCase() + entry.compound.slice(1) + ' tyres, ' + Math.round(entry.tyreWear) + '% wear, ' + entry.stops + ' stops';
const errorRow = e => ({ name: e?.name || 'Error', message: String(e?.message || e), stack: String(e?.stack || e) });
let server = null, browser = null, origin = null, primary = null;
const records = [], controls = [], cleanup = [];
async function collect(spec) {
  const row = { id: spec.id, viewport: spec, checkpoints: [], fields: [], turns: [], readOnly: [], actions: [], targets: [], widths: [],
    focus: [], views: [], screenshots: [], reloads: [], fulfilled: [], responses: [], blocked: [], unexpected: [], pageErrors: [], console: [],
    requestFailures: [], routeErrors: [], responseErrors: [], cleanupErrors: [], primary: null };
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
  const capture = async label => {
    const { raw, ...data } = await page.evaluate(() => window.gpFieldProof.inspect());
    const snapshot = { label, ...data, save: retainSave(raw, spec.id + ':' + label) };
    row.checkpoints.push(snapshot); return snapshot;
  };
  const settle = async () => { let last = null; for (let i = 0; i < 35; i++) {
    const y = await page.evaluate(() => scrollY); if (last !== null && Math.abs(y - last) < .5) return;
    last = y; await page.waitForTimeout(40);
  } throw Error('Native scroll did not settle'); };
  const width = async label => row.widths.push({ label, ...await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })) });
  const target = async (loc, label) => {
    assert.equal(await loc.count(), 1, label); await loc.scrollIntoViewIfNeeded(); await settle();
    row.targets.push({ label, ...await loc.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight, hit: !!hit && (el === hit || el.contains(hit)),
        core: !el.closest('[data-site-chrome]') && !!el.closest('main#dukb-main,[role="dialog"]') }; }) }); await width(label);
  };
  const button = name => page.getByRole('button', { name, exact: true });
  const panel = () => page.locator('[data-gp-panel="Next race"]');
  const list = () => panel().locator('details ol');
  const press = async (loc, label) => {
    await target(loc, label); await page.evaluate(() => window.gpFieldProof.reset()); await loc.click();
    await page.waitForTimeout(80); await settle();
    row.actions.push({ label, method: 'locator.click', scroll: await page.evaluate(() => window.gpFieldProof.scroll()) });
  };
  const choose = async (loc, value, label) => {
    await target(loc, label); await loc.focus(); assert.equal(await loc.evaluate(el => document.activeElement === el), true);
    await page.evaluate(() => window.gpFieldProof.reset()); await loc.selectOption(value); await settle();
    row.focus.push({ label, correct: await loc.evaluate(el => document.activeElement === el) });
    row.actions.push({ label, method: 'locator.selectOption after explicit focus', value, scroll: await page.evaluate(() => window.gpFieldProof.scroll()) });
  };
  const readonly = async (label, fn) => {
    const before = await capture(label + '-before'); await fn();
    row.readOnly.push({ label, before, after: await capture(label + '-after') });
  };
  const openField = async label => {
    const summary = panel().locator('summary').filter({ hasText: /^Whole field$/ }); assert.equal(await summary.count(), 1);
    if (!await summary.evaluate(el => el.parentElement.open)) await press(summary, label);
    assert.equal(await summary.evaluate(el => el.parentElement.open), true);
  };
  const field = async label => {
    const saved = await capture(label), state = stateOf(saved.save);
    assert(state.race && state.race.lap > 0);
    const rows = await list().locator(':scope > li').evaluateAll(nodes => nodes.map(el => {
      const spans = [...el.querySelectorAll('span')], paragraphs = [...el.querySelectorAll('p')];
      return { spans: spans.map(node => node.textContent.trim()), paragraphs: paragraphs.map(node => {
        const style = getComputedStyle(node), r = node.getBoundingClientRect();
        return { text: node.textContent.trim().replace(/\s+/g, ' '), tag: node.tagName, directChild: node.parentElement === el,
          display: style.display, rendered: style.display !== 'none' && style.visibility !== 'hidden' && r.height > 0,
          width: r.width, rowWidth: el.getBoundingClientRect().width };
      }) };
    }));
    const observation = { label, save: saved.save, rows }; row.fields.push(observation); await width(label); return observation;
  };
  const showList = async (label, driverId = null) => {
    const state = stateOf((await capture(label + '-view')).save);
    if (driverId) {
      const index = entries(state).findIndex(entry => entry.driverId === driverId); assert(index >= 0);
      await list().locator(':scope > li').nth(index).scrollIntoViewIfNeeded();
    }
    await list().scrollIntoViewIfNeeded(); await settle(); await width(label);
    row.views.push({ label, driverId, ...await list().evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scrollTop: el.scrollTop }; }) });
  };
  const shot = async name => {
    await settle(); const file = spec.id + '-' + name + '.png';
    await page.screenshot({ path: path.join(out, file), fullPage: false });
    const b = fs.readFileSync(path.join(out, file)); row.screenshots.push({ file, bytes: b.length, sha256: sha(b) });
  };
  const commit = async (action, label) => {
    const before = await capture(label + '-before'), state = stateOf(before.save);
    const full = { ...action, expectedRevision: state.revision }, input = JSON.stringify(state), result = engine.applyAction(state, full);
    assert.equal(JSON.stringify(state), input); assert.equal(result.ok, true);
    const expected = retainSave(expectedEnvelope(result.state), spec.id + ':' + label + ':oracle');
    await press(button(label), label);
    await page.waitForFunction(({ key, revision }) => { try { return JSON.parse(localStorage.getItem(key)).career.revision === revision; } catch { return false; } }, { key, revision: result.state.revision });
    const turn = { label, action: full, before, after: await capture(label + '-after'), expected };
    row.turns.push(turn); return turn;
  };
  try {
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', e => row.pageErrors.push(errorRow(e)));
    page.on('console', m => { if (m.type() === 'error') row.console.push({ text: m.text(), url: m.location().url || '' }); });
    page.on('requestfailed', req => row.requestFailures.push({ url: req.url(), reason: req.failure()?.errorText || null }));
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
    row.consent = JSON.parse((await capture('consent')).consent);
    row.rulesText = await dialog.innerText();
    await press(dialog.getByRole('button', { name: "Let's Play!", exact: true }), 'Enter actual rules'); await dialog.waitFor({ state: 'hidden' });
    await button('Next race').waitFor(); row.boot = await capture('boot');
    row.route = { path: new URL(page.url()).pathname, gameNav: await page.locator('main#dukb-main nav[data-site-chrome]').count(), footer: await page.locator('footer[data-site-chrome]').count() };
    await press(button('Next race'), 'Open Next race');
    await commit({ type: 'qualify' }, 'Run qualifying');
    const grid = stateOf((await capture('grid')).save);
    const setups = own(grid).map(driver => {
      const entry = grid.race.entries.find(row => row.driverId === driver.id);
      return { driverId: driver.id, compound: entry.compound, pace: entry.pace };
    });
    await commit({ type: 'startRace', setups }, 'Start race');
    const started = stateOf((await capture('lap-zero')).save);
    await commit({ type: 'raceInterval', orders: own(started).map(driver => ({ driverId: driver.id, pace: started.race.entries.find(entry => entry.driverId === driver.id).pace })) }, 'Run to lap 12');
    await readonly('Read saved checkpoint', async () => {
      await openField('Open checkpoint Whole field'); await field('checkpoint'); await showList('checkpoint'); await shot('checkpoint');
    });
    const checkpoint = stateOf((await capture('pit-plan')).save);
    assert.equal(checkpoint.race.lap, 12);
    const driver = own(checkpoint).find(candidate => checkpoint.race.entries.find(entry => entry.driverId === candidate.id).status === 'running');
    assert(driver, 'Actual saved team has an eligible pit decision');
    const priorEntry = checkpoint.race.entries.find(entry => entry.driverId === driver.id);
    const pitTo = checkpoint.race.weather === 'wet' ? 'wet' : priorEntry.compound === 'hard' ? 'medium' : 'hard';
    row.pitPlan = { driverId: driver.id, pitTo, priorCompound: priorEntry.compound, priorStops: priorEntry.stops };
    await readonly('Choose unsaved pit', async () => {
      await choose(page.getByRole('combobox', { name: 'Pit choice for ' + driver.name, exact: true }), pitTo, 'Choose actual pit compound');
      await field('pending-pit');
    });
    await commit({ type: 'raceInterval', orders: own(checkpoint).map(candidate => ({
      driverId: candidate.id, pace: checkpoint.race.entries.find(entry => entry.driverId === candidate.id).pace,
      ...(candidate.id === driver.id ? { pitTo } : {}),
    })) }, 'Run to lap 26');
    await readonly('Read saved pitted checkpoint', async () => { await openField('Open pitted Whole field'); await field('post-pit'); });
    const before = await capture('reload-before');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }); await button('Next race').waitFor();
    const after = await capture('reload-after'); row.reloads.push({ before, after });
    await readonly('Read reloaded pitted checkpoint', async () => {
      await press(button('Next race'), 'Open reloaded Next race'); await openField('Open reloaded Whole field');
      await field('reloaded'); await showList('reloaded-pit', driver.id); await shot('reloaded-pit');
    });
  } catch (error) {
    row.primary = errorRow(error);
    if (page) try { const file = spec.id + '-failure.png'; await page.screenshot({ path: path.join(out, file), fullPage: false }); row.failureScreenshot = file; } catch {}
  } finally {
    await Promise.allSettled([...tasks]);
    try { await context.close(); } catch (error) { row.cleanupErrors.push(errorRow(error)); }
    await Promise.allSettled([...tasks]);
    row.consoleUnexpected = row.console.filter(error => {
      if (blockedUrls.has(error.url) && /^Failed to load resource: net::ERR_FAILED/.test(error.text)) return false;
      const cors = error.text.match(/^Access to fetch at '([^']+)' from origin '([^']+)' has been blocked by CORS policy:/);
      return !(cors && blockedUrls.has(cors[1]) && cors[2] === origin && /preflight|access control|Access-Control-Allow-Origin/i.test(error.text));
    });
    row.failedUnexpected = row.requestFailures.filter(error => !blockedUrls.has(error.url) || error.reason !== 'net::ERR_FAILED');
    write(spec.id + '.json', row);
  }
  return row;
}
function fieldObserver(observation) {
  const state = stateOf(observation.save), entry = state.race.entries.find(row => row.driverId === observation.driverId);
  assert(entry && state.race.lap > 0 && entry.status !== 'retired');
  assert.equal(observation.actualText, tyreLine(entry), 'GP_FIELD_APP_FIELD');
}
function pitObserver(observation) {
  const before = stateOf(observation.before), input = JSON.stringify(before), result = engine.applyAction(before, observation.action);
  assert.equal(JSON.stringify(before), input); assert.equal(result.ok, true);
  const expected = sha(Buffer.from(expectedEnvelope(result.state)));
  assert.equal(observation.actualAfterSHA256, expected, 'GP_FIELD_APP_PIT_SAVE');
  assert.equal(observation.oracleAfter.sha256, expected); saveBody(observation.oracleAfter);
}
function reloadObserver(observation) {
  assert.equal(observation.actualAfterSHA256, observation.beforeSHA256, 'GP_FIELD_APP_RELOAD_SAVE');
  assert.equal(observation.generationAfter, observation.generationBefore);
  assert.equal(observation.seededAfter, false); assert.equal(observation.navigationType, 'reload');
  assert.notEqual(observation.afterTimeOrigin, observation.beforeTimeOrigin);
}
function validate(rows) {
  assert.deepEqual(rows.map(row => row.id), specs.map(spec => spec.id));
  for (const row of rows) {
    assert.equal(row.primary, null);
    assert.deepEqual(row.route, { path: '/grand-prix-boss', gameNav: 1, footer: 1 });
    assert.equal(row.consent.version, 2); assert.equal(row.consent.analytics, false); assert.equal(row.consent.advertising, false);
    assert.match(row.rulesText, /tyre|race/i);
    for (const name of ['unexpected', 'pageErrors', 'consoleUnexpected', 'failedUnexpected', 'routeErrors', 'responseErrors', 'cleanupErrors']) assert.deepEqual(row[name], []);
    for (const snapshot of row.checkpoints) for (const value of Object.values(snapshot.native)) assert.equal(value, true);
    assert.equal(saveBody(row.boot.save).toString('utf8'), initialRaw); assert.equal(row.boot.seeded, true);
    assert.deepEqual(row.fields.map(field => field.label), ['checkpoint', 'pending-pit', 'post-pit', 'reloaded']);
    for (const field of row.fields) {
      const state = stateOf(field.save), sorted = entries(state); assert.equal(sorted.length, 20); assert.equal(field.rows.length, sorted.length);
      assert.equal(state.race.lap, ['checkpoint', 'pending-pit'].includes(field.label) ? 12 : 26);
      for (const [index, entry] of sorted.entries()) {
        const actual = field.rows[index], driver = state.drivers.find(candidate => candidate.id === entry.driverId); assert(driver);
        assert.deepEqual(actual.spans, [(index + 1) + '. ' + driver.name, metric(state, entry)]);
        if (entry.status === 'retired') assert.deepEqual(actual.paragraphs, []);
        else {
          assert.equal(actual.paragraphs.length, 1);
          const text = actual.paragraphs[0]; fieldObserver({ save: field.save, driverId: entry.driverId, actualText: text.text });
          assert.equal(text.tag, 'P'); assert.equal(text.directChild, true); assert.equal(text.rendered, true); assert.equal(text.display, 'block');
        }
      }
    }
    assert.deepEqual(row.fields[1].save, row.fields[0].save);
    assert.deepEqual(row.fields[3].save, row.fields[2].save);
    assert.deepEqual(row.turns.map(turn => turn.action.type), ['qualify', 'startRace', 'raceInterval', 'raceInterval']);
    for (const turn of row.turns) {
      const before = stateOf(turn.before.save), input = JSON.stringify(before), result = engine.applyAction(before, turn.action);
      assert.equal(JSON.stringify(before), input); assert.equal(result.ok, true);
      assert.deepEqual(stateOf(turn.expected), result.state); assert.deepEqual(stateOf(turn.after.save), result.state);
      assert.equal(saveBody(turn.after.save).toString('utf8'), expectedEnvelope(result.state));
      assert.equal(result.state.revision, before.revision + 1);
    }
    const pit = row.turns[3], beforePit = stateOf(pit.before.save), afterPit = stateOf(pit.after.save);
    assert.equal(beforePit.race.lap, 12); assert.equal(afterPit.race.lap, 26);
    assert.equal(row.pitPlan.priorCompound, beforePit.race.entries.find(entry => entry.driverId === row.pitPlan.driverId).compound);
    const pittedOrders = pit.action.orders.filter(order => order.pitTo);
    assert.deepEqual(pittedOrders.map(order => ({ driverId: order.driverId, pitTo: order.pitTo })), [{ driverId: row.pitPlan.driverId, pitTo: row.pitPlan.pitTo }]);
    const pittedEntry = afterPit.race.entries.find(entry => entry.driverId === row.pitPlan.driverId);
    assert.equal(pittedEntry.compound, row.pitPlan.pitTo); assert.equal(pittedEntry.stops, row.pitPlan.priorStops + 1);
    pitObserver({ before: pit.before.save, action: pit.action, oracleAfter: pit.expected, actualAfterSHA256: pit.after.save.sha256 });
    assert.equal(row.readOnly.length, 4);
    for (const observation of row.readOnly) {
      assert.deepEqual(observation.after.save, observation.before.save); assert.equal(observation.after.generation, observation.before.generation);
      assert.deepEqual(observation.after.operations.filter(operation => operation.key === key), observation.before.operations.filter(operation => operation.key === key));
    }
    assert.equal(row.reloads.length, 1); const { before, after } = row.reloads[0];
    reloadObserver({ beforeSHA256: before.save.sha256, actualAfterSHA256: after.save.sha256,
      generationBefore: before.generation, generationAfter: after.generation, seededAfter: after.seeded,
      navigationType: after.navigationType, beforeTimeOrigin: before.timeOrigin, afterTimeOrigin: after.timeOrigin });
    assert.deepEqual(after.save, before.save); assert.equal(stateOf(after.save).race.lap, 26);
    assert(row.widths.length > 0); for (const width of row.widths) assert(width.scroll <= width.client + 1);
    for (const target of row.targets) {
      assert.equal(target.hit, true); assert(target.width > 0); if (target.core) assert(target.height >= 44);
      assert(target.x >= -.5 && target.x + target.width <= target.vw + .5); assert(target.y + target.height > 0 && target.y < target.vh);
    }
    assert(row.focus.length > 0); for (const focus of row.focus) assert.equal(focus.correct, true);
    for (const action of row.actions) {
      for (const scroll of action.scroll.reveals) {
        assert.equal(scroll.connected, true);
        const visible = Math.max(0, Math.min(scroll.before.bottom, scroll.insets.vh - scroll.insets.bottom) - Math.max(scroll.before.top, scroll.insets.top));
        const comfortable = scroll.before.top >= scroll.insets.top - 4 && visible >= Math.min(190, scroll.before.height);
        assert(!(comfortable && scroll.finalY > scroll.y + 4)); assert(scroll.after.top >= scroll.afterInsets.top - 4);
      }
      for (const scroll of action.scroll.window) assert(Math.abs(scroll.finalY - scroll.y) <= 4);
    }
    assert(row.fulfilled.length > 0 && row.responses.length > 0);
    for (const response of [...row.fulfilled, ...row.responses]) {
      const asset = response.kind === 'font' ? fonts.get(response.name) : assets.get(response.name); assert(asset);
      assert.equal(response.bytes, asset.body.length); assert.equal(response.sha256, asset.sha256);
    }
    assert(row.responses.some(response => response.name === '/grand-prix-boss/index.html'));
    assert(row.responses.some(response => /\/assets\/.*\.js$/.test(response.name)));
    assert(row.responses.some(response => response.kind === 'font'));
    assert.equal(row.screenshots.length, 2);
    for (const screenshot of row.screenshots) {
      const body = fs.readFileSync(path.join(out, screenshot.file)); assert.equal(body.length, screenshot.bytes); assert.equal(sha(body), screenshot.sha256);
    }
  }
}
function detachedControl(owner, observation, check, mutate) {
  const dir = 'controls/' + owner, original = Buffer.from(JSON.stringify(observation, null, 2) + '\n');
  write(dir + '/original.json', original);
  const scratch = path.join(out, dir, 'physical.json'); fs.writeFileSync(scratch, original); check(JSON.parse(fs.readFileSync(scratch)));
  const changed = JSON.parse(fs.readFileSync(scratch)); mutate(changed);
  const changedBytes = Buffer.from(JSON.stringify(changed, null, 2) + '\n'); assert.notEqual(sha(changedBytes), sha(original));
  fs.writeFileSync(scratch, changedBytes); assert(fs.readFileSync(scratch).equals(changedBytes)); write(dir + '/changed.json', changedBytes);
  let nativeFirst = null;
  assert.throws(() => check(JSON.parse(fs.readFileSync(scratch))), error => {
    nativeFirst = errorRow(error); return error instanceof assert.AssertionError && error.message.startsWith('GP_FIELD_APP_' + owner);
  });
  write(dir + '/refusal.json', { owner, nativeFirst });
  fs.writeFileSync(scratch, original); assert(fs.readFileSync(scratch).equals(original));
  check(JSON.parse(fs.readFileSync(scratch))); write(dir + '/restored.json', fs.readFileSync(scratch));
  controls.push({ owner, originalSHA256: sha(original), changedSHA256: sha(changedBytes), restoredSHA256: sha(fs.readFileSync(scratch)),
    physicalMutation: true, nativeFirst, restoredHealthy: true });
}
try {
  server = http.createServer((request, response) => { try {
    const asset = assets.get(localPath(new URL(request.url, 'http://localhost')));
    if (request.method !== 'GET' || !asset) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': asset.contentType }); response.end(asset.body);
  } catch { response.writeHead(400); response.end(); } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port; browser = await chromium.launch({ headless: true });
  for (const spec of specs) records.push(await collect(spec));
  const failed = records.find(row => row.primary); if (failed) throw new Error(failed.id + ': ' + failed.primary.message);
  validate(records);
  const row = records[0], field = row.fields[0], state = stateOf(field.save);
  const rival = entries(state).find(entry => entry.teamId !== state.teamId && entry.status !== 'retired'); assert(rival);
  const index = entries(state).findIndex(entry => entry.driverId === rival.driverId);
  detachedControl('FIELD', { context: row.id, save: field.save, driverId: rival.driverId, actualText: field.rows[index].paragraphs[0].text },
    fieldObserver, observation => { observation.actualText = 'Fixture omitted saved strategy'; });
  const pit = row.turns[3];
  detachedControl('PIT_SAVE', { context: row.id, before: pit.before.save, action: pit.action, oracleAfter: pit.expected, actualAfterSHA256: pit.after.save.sha256 },
    pitObserver, observation => { observation.actualAfterSHA256 = observation.actualAfterSHA256 === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64); });
  const reload = row.reloads[0];
  detachedControl('RELOAD_SAVE', { context: row.id, beforeSHA256: reload.before.save.sha256, actualAfterSHA256: reload.after.save.sha256,
    generationBefore: reload.before.generation, generationAfter: reload.after.generation, seededAfter: reload.after.seeded,
    navigationType: reload.after.navigationType, beforeTimeOrigin: reload.before.timeOrigin, afterTimeOrigin: reload.after.timeOrigin },
    reloadObserver, observation => { observation.actualAfterSHA256 = observation.actualAfterSHA256 === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64); });
  assert.deepEqual(controls.map(control => control.owner), ['FIELD', 'PIT_SAVE', 'RELOAD_SAVE']); validate(records);
} catch (error) { primary = errorRow(error); write('primary.json', primary); }
finally {
  try { if (browser) await browser.close(); } catch (error) { cleanup.push(errorRow(error)); }
  try { if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } catch (error) { cleanup.push(errorRow(error)); }
  try {
    for (const [file, body] of held) assert(fs.readFileSync(path.join(root, file)).equals(body), 'Source held: ' + file);
    for (const [file, body] of prepHeld) assert(fs.readFileSync(file).equals(body), 'Prep held');
    assert(fs.readFileSync(fontFile).equals(fontBytes));
    const names = [];
    function inventory(dir) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        assert(!item.isSymbolicLink()); const file = path.join(dir, item.name);
        if (item.isDirectory()) inventory(file); else { assert(item.isFile()); names.push('/' + path.relative(dist, file).split(path.sep).join('/')); }
      }
    }
    inventory(dist); assert.deepEqual(names.sort(), [...assets.keys()].sort());
    for (const [name, asset] of assets) assert(fs.readFileSync(path.join(dist, name.slice(1))).equals(asset.body), 'Dist asset held');
    for (const { ref } of saves.values()) saveBody(ref);
    write('save-inputs.json', [...saves.values()].map(({ ref, origins }) => ({ ...ref, origins })));
    write('source-after.json', sourceRows());
  } catch (error) { cleanup.push(errorRow(error)); if (!primary) primary = errorRow(error); }
  write('summary.json', { status: primary || cleanup.length ? 'failed' : 'passed', configured: specs.length, collected: records.length,
    healthy: !primary && !cleanup.length ? records.length : 0, canonicalAdvances: records.reduce((sum, row) => sum + row.turns.length, 0),
    reloads: records.reduce((sum, row) => sum + row.reloads.length, 0), screenshots: records.reduce((sum, row) => sum + row.screenshots.length, 0),
    canonicalSaveBodies: saves.size, controls, primary, cleanup,
    scope: 'Three actual production App contexts from exact createCareer42. Four actual UI advances each through lap12 and saved pitted lap26, pending choice without save, native reload, all eligible saved Whole field rows and existing name/timing spans. Six viewport PNGs. Three detached physical small-observation faults. No altered clock/RNG, provider data, full race/year, physical device, performance, full suite or release claim.' });
}
if (primary || cleanup.length) throw new Error(primary?.message || 'Cleanup failed');
console.log('Grand Prix field App:3contexts,6PNGs,3reloads,3changed/owned/restored compact observation controls.');
