// Remote served Chromium proof. All game replies are declared fictional external IO.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import pw from '../lib/playwrightLoader.mjs';

const BASE = process.env.BASE, OUT = process.env.GRID_SETTINGS_RACE_BROWSER_OUT;
const SOURCE = process.env.GRID_SETTINGS_SOURCE || process.cwd(), DIST = process.env.GRID_SETTINGS_DIST || path.join(SOURCE, 'dist'), CACHE = process.env.FREE_KICK_FONT_CACHE;
assert.equal(BASE, 'http://127.0.0.1:4173'); assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
for (const value of [OUT, SOURCE, DIST, CACHE]) assert(value && path.isAbsolute(value), 'Absolute output, source, dist and cached-font roots');
assert(!fs.existsSync(OUT), 'Fresh browser output'); fs.mkdirSync(OUT, { recursive: true });
let report = { version: 1, base: BASE, source: SOURCE, dist: DIST, status: 'setup', qualified: false, cases: [], errors: [] };
async function main() {
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
const receipt = file => { const bytes = fs.readFileSync(path.join(OUT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
function retain(folder, suffix, bytes) {
  const file = folder + '/' + sha(bytes) + suffix; fs.mkdirSync(path.join(OUT, folder), { recursive: true });
  if (!fs.existsSync(path.join(OUT, file))) fs.writeFileSync(path.join(OUT, file), bytes, { flag: 'wx' });
  return receipt(file);
}
function tree(root) {
  const rows = {};
  function walk(folder) { for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(folder, entry.name); if (entry.isDirectory()) walk(file); else if (entry.isFile()) rows[path.relative(root, file).replaceAll('\\', '/')] = sha(fs.readFileSync(file));
  } }
  walk(root); return rows;
}
const PINS = {
  'src/pages/SoccerGrid.tsx': '8e88e3dd1f7e093802f92673d686a15ff6254efc398933cd879d371c702c68ed',
  'src/hooks/useSoccerGrid.ts': '6940e46da1b9b9984ec85309ed01c502a24e54c6c80d5c4a79aa23a03363a2ca',
  'src/hooks/useDailyPuzzle.ts': '7ca4592d195f8446106faad991b73500113405d2ae8091b2d87077200461c308',
  'src/hooks/useGameCompletion.ts': '125b276927ca63746254f0abab5835d78e7233df7962baa957e8d9fe54d82d84',
};
const sourceNames = [...Object.keys(PINS), 'src/components/soccer-grid/SoccerGridSearch.tsx', 'src/components/soccer-grid/SoccerGridBoard.tsx', 'src/lib/fetchCareerPlayers.ts', 'src/lib/fetchSoccerGridPuzzles.ts', 'src/lib/soccerGridDifficulty.ts', 'scripts/qa/playSoccerGridSettingsRace.mjs'];
const sourceMap = () => Object.fromEntries(sourceNames.map(file => [file, sha(fs.readFileSync(path.join(SOURCE, file)))]));
const beforeSource = sourceMap(), beforeDist = tree(DIST);
for (const [file, expected] of Object.entries(PINS)) assert.equal(beforeSource[file], expected, 'Exact selected source: ' + file);
const head = execFileSync('git', ['-C', SOURCE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); assert.equal(head, process.env.GITHUB_SHA);
for (const file of sourceNames) assert(fs.readFileSync(path.join(SOURCE, file)).equals(execFileSync('git', ['-C', SOURCE, 'show', head + ':' + file], { maxBuffer: 8 * 1024 * 1024 })), 'Actual committed source: ' + file);
write('source-before.json', beforeSource); write('dist-before.json', beforeDist);
const projectMatch = fs.readFileSync(path.join(SOURCE, 'src/integrations/supabase/client.ts'), 'utf8').match(/export const SUPABASE_URL = ["']([^"']+)["']/); assert(projectMatch);
const API = new URL(projectMatch[1]).origin;
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'))).map(item => {
  assert(['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(item.url).hostname)); assert(/^[a-f0-9]{64}$/.test(item.file));
  const bytes = fs.readFileSync(path.join(CACHE, item.file)); assert.equal(sha(bytes), item.sha256);
  return [item.url, { body: bytes, contentType: item.contentType, original: item, retained: retain('fonts', '.font', bytes) }];
}));
assert.equal(fonts.size, 9); write('font-manifest.json', [...fonts.values()].map(font => ({ ...font.original, retained: font.retained })));
const NAME = 'Grid Settings Fixture';
const DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const SETTINGS = 'soccer-grid-settings-' + DATE, DAILY = 'soccer-grid-daily-' + DATE;
const POOL = ['Easy', 'Hard'].flatMap(tier => Array.from({ length: 20 }, (_, i) => ({ id: `settings-fixture-${tier.toLowerCase()}-${i}`,
  rows: Array.from({ length: 3 }, (_, row) => ({ label: `Fixture ${tier} ${i} Row ${row}`, type: tier === 'Easy' ? 'club' : 'award' })),
  cols: Array.from({ length: 3 }, (_, col) => ({ label: `Fixture ${tier} ${i} Column ${col}`, type: tier === 'Easy' ? 'league' : 'world_cup' })),
})));
const EXPECTED_IDS = Object.fromEntries(['easy', 'hard'].map(tier => [tier, `settings-fixture-${tier}-${Number(DATE.replaceAll('-', '')) % 20}`]));
report = { version: 1, source: SOURCE, dist: DIST, head, base: BASE, date: DATE, status: 'running', qualified: false, cases: [], errors: [], limits: ['Actual production build in Chromium at390 touch and1280 mouse, not physical Apple hardware.', 'Fictional Grid/player/count/write/validator replies are fulfilled locally. No real database, validator or selection write is made.', 'Three held-reply boundaries per width are deliberate timing controls. No natural network failure frequency is claimed.', 'External non-game request intent is recorded and aborted, apart from verified cached fonts. No zero-external-intent claim.', 'Browser observations are separate from the original/fixed source controls and prior deadline proof.'] };
const checkpoint = () => write('report.json', report);
const bounded = (promise, label, ms = 15000) => { let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), ms); })]).finally(() => clearTimeout(timer)); };
let browser;
checkpoint();
async function journey(width, kind) {
  const id = kind + '-' + width, row = { id, width, height: width === 390 ? 844 : 900, kind, status: 'running', requests: [], api: [], external: [], fonts: [], js: [], failures: [], errors: [], evidenceErrors: [], actions: [], observations: [], screenshots: [], hold: null };
  report.cases.push(row); checkpoint();
  const context = await browser.newContext({ viewport: { width, height: row.height }, isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'reduce', timezoneId: 'UTC', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
    { name: 'cookie-consent', value: 'essential' }, { name: SETTINGS, value: '{"difficulty":"easy","timerMode":40}' }, { name: 'grid-settings-opaque-save', value: '{"fixture":"unchanged unrelated game"}' },
  ] }] } });
  let page, release, lastJs = Date.now(); const pendingJs = new Set(), bodyTasks = [];
  const held = new Promise(resolve => { release = resolve; });
  const heldKind = ['validator', 'rarity', 'insert', 'unverified'].includes(kind) ? (kind === 'unverified' ? 'validator' : kind) : null;
  const requestIndex = request => { const index = row.requests.findIndex(item => item.url === request.url() && item.method === request.method()); assert(index >= 0); return index; };
  context.on('request', request => { const url = request.url(); row.requests.push({ url, method: request.method(), type: request.resourceType() }); if (new URL(url).origin === BASE && new URL(url).pathname.endsWith('.js')) { pendingJs.add(request); lastJs = Date.now(); } });
  context.on('requestfinished', request => { if (pendingJs.delete(request)) lastJs = Date.now(); });
  context.on('requestfailed', request => { if (pendingJs.delete(request)) lastJs = Date.now(); row.failures.push({ url: request.url(), owned: new URL(request.url()).origin === BASE, error: request.failure()?.errorText || '' }); });
  context.on('response', response => {
    const url = new URL(response.url()); if (url.origin !== BASE || !url.pathname.endsWith('.js')) return;
    bodyTasks.push((async () => {
      const file = path.resolve(DIST, '.' + decodeURIComponent(url.pathname)); assert(file.startsWith(path.resolve(DIST) + path.sep)); assert.equal(response.status(), 200);
      const actual = fs.readFileSync(file); assert(actual.length > 0); const body = await bounded(response.body(), 'Owned JavaScript body'); assert(body.equals(actual), 'Every requested JavaScript body equals physical dist');
      const gzip = gzipSync(body); row.js.push({ url: response.url(), file: path.relative(DIST, file).replaceAll('\\', '/'), status: response.status(), rawBytes: body.length, gzipBytes: gzip.length, sha256: sha(body), body: retain('js', '.js', body), gzip: retain('js', '.js.gz', gzip) });
    })().catch(error => row.evidenceErrors.push(String(error.stack || error))));
  });
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,HEAD,POST,OPTIONS', 'access-control-expose-headers': 'content-range' };
  const reply = async (route, item, body, status = 200, extra = {}) => {
    if (item.kind === heldKind && !row.hold) {
      row.hold = { kind: item.kind, requestIndex: item.requestIndex, enteredAt: Date.now(), released: false }; checkpoint(); await held;
      row.hold.released = true; row.hold.releasedAt = Date.now();
    }
    const bytes = Buffer.from(body); item.response = { status, headers: { ...headers, ...extra }, body: retain('api', '.body', bytes) };
    await route.fulfill({ status, contentType: 'application/json', headers: item.response.headers, body: bytes }); item.fulfilledAt = Date.now();
  };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    try {
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No owned write'); return await route.continue(); }
      if (fonts.has(url.href)) { const font = fonts.get(url.href); row.fonts.push({ url: url.href, contentType: font.contentType, ...font.retained }); return await route.fulfill({ body: font.body, contentType: font.contentType, headers: { 'access-control-allow-origin': '*' } }); }
      if (url.origin === API) {
        const allowed = ['/rest/v1/soccer_grid_puzzles', '/rest/v1/career_players', '/rest/v1/career_seasons', '/rest/v1/soccer_grid_selections', '/functions/v1/soccer-grid-validate'];
        if (url.pathname === '/rest/v1/live_scores' && ['GET', 'OPTIONS'].includes(request.method())) { row.external.push({ url: url.href, method: request.method(), action: 'aborted declared background scores intent' }); return await route.abort(); }
        assert(allowed.includes(url.pathname), 'No undeclared project API path: ' + url.pathname);
        if (request.method() === 'OPTIONS') return await route.fulfill({ status: 204, headers, body: '' });
        const item = { kind: '', url: url.href, method: request.method(), requestIndex: requestIndex(request), query: [...url.searchParams], headers: { prefer: request.headers().prefer ?? null, range: request.headers().range ?? null }, body: request.postData() ? JSON.parse(request.postData()) : null, enteredAt: Date.now() }; row.api.push(item);
        if (url.pathname === '/rest/v1/soccer_grid_puzzles') { assert.equal(request.method(), 'GET'); item.kind = 'puzzles'; return await reply(route, item, JSON.stringify(POOL.map(p => ({ puzzle_id: p.id, rows_json: p.rows, cols_json: p.cols })))); }
        if (url.pathname === '/rest/v1/career_players') { assert.equal(request.method(), 'GET'); item.kind = 'players'; return await reply(route, item, JSON.stringify([{ id: 'settings-fixture-player', player_name: NAME, nationality: 'Fixture Nation', position: 'CM' }])); }
        if (url.pathname === '/rest/v1/career_seasons') { assert.equal(request.method(), 'GET'); item.kind = 'seasons'; return await reply(route, item, JSON.stringify([{ player_id: 'settings-fixture-player', season: 'Fixture season', club: 'Fixture Club', goals: 0, assists: 0, appearances: 1, market_value: 1, sort_order: 0 }])); }
        if (url.pathname === '/functions/v1/soccer-grid-validate') { assert.equal(request.method(), 'POST'); item.kind = 'validator'; return await reply(route, item, JSON.stringify(kind === 'unverified' ? { valid: false, unverified: true } : { valid: true, fullName: NAME })); }
        if (request.method() === 'HEAD') { assert(item.headers.prefer?.includes('count=exact')); item.kind = url.searchParams.has('player_name') ? 'player-count' : 'rarity'; return await reply(route, item, '', 200, { 'content-range': item.kind === 'rarity' ? '0-8/9' : '0-0/1' }); }
        assert.equal(request.method(), 'POST'); item.kind = 'insert'; return await reply(route, item, '', 201);
      }
      row.external.push({ url: url.href, method: request.method(), type: request.resourceType(), action: 'aborted external intent' }); return await route.abort();
    } catch (error) { row.evidenceErrors.push(String(error.stack || error)); await route.abort(); }
  });
  await context.routeWebSocket('**/*', socket => { row.external.push({ url: socket.url(), type: 'websocket', action: 'closed websocket intent' }); socket.close(); });
  await context.addInitScript(() => { if (location.origin === 'http://127.0.0.1:4173' && sessionStorage.getItem('grid-settings-session') === null) sessionStorage.setItem('grid-settings-session', 'held unrelated session bytes'); });
  const observe = async label => {
    const value = await page.evaluate(({ pool, settings, daily }) => {
      const store = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
      const rect = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, documentTop: r.y + scrollY, width: r.width, height: r.height }; };
      const buttons = [...document.querySelectorAll('button')], hard = buttons.find(button => button.textContent.trim() === 'Hard'), cells = [...document.querySelectorAll('[data-grid-cell-status]')];
      const matches = pool.filter(p => document.body.textContent.includes(p.rows[0].label));
      return { href: location.href, at: Date.now(), date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), html: document.body.innerHTML,
        stores: { local: store(localStorage), session: store(sessionStorage) }, settingsJSON: localStorage.getItem(settings), dailyJSON: localStorage.getItem(daily), puzzles: matches,
        cells: cells.map(cell => ({ text: cell.textContent, status: cell.dataset.gridCellStatus, disabled: cell.disabled })),
        buttons: buttons.map(button => ({ text: button.textContent.trim(), disabled: button.disabled, rect: rect(button) })), panel: rect(hard?.parentElement?.parentElement), board: rect(cells[0]?.closest('.grid-cols-4')),
        window: { x: scrollX, y: scrollY, width: innerWidth, height: innerHeight }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, activeElement: document.activeElement?.outerHTML ?? null,
      };
    }, { pool: POOL, settings: SETTINGS, daily: DAILY });
    row.observations.push({ label, ...value }); assert.equal(value.date, DATE); assert.equal(value.puzzles.length, 1); assert.equal(value.cells.length, 9); assert(value.document.width <= width, 'No horizontal overflow');
    assert.equal(value.stores.local['grid-settings-opaque-save'], '{"fixture":"unchanged unrelated game"}'); assert.equal(value.stores.session['grid-settings-session'], 'held unrelated session bytes'); return value;
  };
  const pointer = async (locator, label) => {
    await locator.scrollIntoViewIfNeeded(); const handle = await locator.elementHandle(); assert(handle);
    const box = await locator.boundingBox(); assert(box && box.width > 0 && box.height > 0); const x = box.x + box.width / 2, y = box.y + box.height / 2;
    assert(x > 0 && x < width && y > 0 && y < row.height, 'Native pointer target is in the viewport');
    assert(await handle.evaluate((element, point) => element.isConnected && (element === document.elementFromPoint(point.x, point.y) || element.contains(document.elementFromPoint(point.x, point.y))), { x, y }), 'Actual painted control owns hit target');
    row.actions.push({ label, method: width === 390 ? 'native touchscreen tap' : 'native mouse click', x, y, disabled: await locator.isDisabled(), at: Date.now() });
    if (width === 390) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
  };
  const named = name => page.getByRole('button', { name, exact: true });
  const shot = async label => { const file = id + '-' + label + '.png'; await page.screenshot({ path: path.join(OUT, file) }); row.screenshots.push(receipt(file)); };
  const quiet = async () => { const started = Date.now(); while (pendingJs.size || Date.now() - lastJs < 500) { assert(Date.now() - started < 20000, 'Bounded owned JS quiet'); await page.waitForTimeout(50); } await bounded(Promise.all(bodyTasks), 'Complete physical JS evidence'); assert.deepEqual(row.evidenceErrors, []); };
  try {
    page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => row.errors.push(String(error.stack || error))); page.on('console', message => { if (message.type() === 'error') (row.consoleErrors ||= []).push(message.text()); });
    const document = await page.goto(BASE + '/soccer-grid', { waitUntil: 'domcontentloaded' }); assert.equal(document.status(), 200);
    const rules = page.getByRole('dialog', { name: 'How to Play Soccer Grid', exact: true }); await rules.waitFor({ state: 'visible' }); await pointer(rules.getByRole('button', { name: "Let's Play!", exact: true }), 'enter actual Grid rules'); await rules.waitFor({ state: 'hidden' });
    await page.getByText(POOL.find(p => p.id === EXPECTED_IDS.easy).rows[0].label, { exact: true }).waitFor(); await named('Hard').waitFor(); await quiet();
    const ready = await observe('ready'); assert.equal(ready.puzzles[0].id, EXPECTED_IDS.easy); assert.deepEqual(JSON.parse(ready.settingsJSON), { difficulty: 'easy', timerMode: 40 }); assert.equal(ready.dailyJSON, null); assert(ready.cells.every(cell => cell.status === 'empty'));
    if (kind === 'preplay') {
      await pointer(named('Hard'), 'choose Hard before play'); await page.getByText(POOL.find(p => p.id === EXPECTED_IDS.hard).rows[0].label, { exact: true }).waitFor(); await pointer(named('90s'), 'choose 90s before play');
      const chosen = await observe('settings-chosen'); assert.deepEqual(JSON.parse(chosen.settingsJSON), { difficulty: 'hard', timerMode: 90 }); assert.equal(chosen.puzzles[0].id, EXPECTED_IDS.hard); assert.equal(chosen.dailyJSON, null); assert(chosen.cells.every(cell => cell.status === 'empty')); await shot('settings-chosen');
    } else {
      await pointer(page.locator('[data-grid-cell-status]').first(), 'select actual first cell'); const input = page.getByRole('combobox', { name: 'Search for a player', exact: true }); await input.waitFor(); await pointer(input, 'focus actual player input'); await page.keyboard.type(NAME); await page.keyboard.press('Enter');
      const start = Date.now(); while (!row.hold) { assert(Date.now() - start < 15000, 'Declared actual IO hold reached'); await page.waitForTimeout(20); }
      assert.equal(row.hold.kind, heldKind); await page.waitForFunction(() => document.querySelector('input[aria-label="Search for a player"]')?.disabled === true); assert(await input.isDisabled());
      await named('Hard').scrollIntoViewIfNeeded(); const pending = await observe('pending'); assert(pending.panel && pending.panel.height > 0); assert.equal(pending.dailyJSON, null);
      const settingsButtons = pending.buttons.filter(button => ['Easy', 'Normal', 'Hard', 'Unlimited', '90s', '60s', '40s'].includes(button.text)); assert.equal(settingsButtons.length, 7); assert(settingsButtons.every(button => button.disabled), 'Both real native settings groups are locked while actual IO is pending');
      if (kind !== 'unverified') {
        await pointer(named('Hard'), 'attempt Hard during held ' + kind); await pointer(named('Unlimited'), 'attempt Unlimited during held ' + kind);
        const attempted = await observe('settings-attempted'); assert.deepEqual(attempted.stores, pending.stores, 'Complete stores held across ignored native attempts'); assert.equal(attempted.settingsJSON, pending.settingsJSON); assert.deepEqual(attempted.puzzles, pending.puzzles);
        assert.equal(attempted.panel.documentTop, pending.panel.documentTop); assert.equal(attempted.panel.height, pending.panel.height); assert.equal(attempted.panel.width, pending.panel.width); assert.equal(attempted.board.documentTop, pending.board.documentTop); await shot('held-settings');
      }
      release(); await input.waitFor({ state: 'hidden' });
      if (kind === 'unverified') {
        await page.getByText("Couldn't verify that answer, please try again.", { exact: true }).waitFor();
        for (const name of ['Easy', 'Normal', 'Hard', 'Unlimited', '90s', '60s', '40s']) assert.equal(await named(name).isDisabled(), false, 'Unverified response releases ' + name);
        const released = await observe('unverified-released'); assert.equal(released.dailyJSON, null); assert(released.cells.every(cell => cell.status === 'empty')); await shot('unverified-released');
        await pointer(named('Hard'), 'choose Hard after no-penalty retry'); await page.getByText(POOL.find(p => p.id === EXPECTED_IDS.hard).rows[0].label, { exact: true }).waitFor(); await pointer(named('60s'), 'choose 60s after no-penalty retry');
        const chosen = await observe('settings-chosen'); assert.deepEqual(JSON.parse(chosen.settingsJSON), { difficulty: 'hard', timerMode: 60 }); assert.equal(chosen.puzzles[0].id, EXPECTED_IDS.hard); assert.equal(chosen.dailyJSON, null); await shot('settings-chosen');
      } else {
        await page.locator('[data-grid-cell-status="correct"]').first().waitFor(); const settled = await observe('settled');
        assert.equal(settled.puzzles[0].id, ready.puzzles[0].id); assert.equal(settled.settingsJSON, ready.settingsJSON); assert.equal(settled.cells[0].status, 'correct'); assert(settled.cells[0].text.includes(NAME)); assert(settled.cells[0].text.includes('20% picked this')); assert.equal(settled.panel, null);
        assert.deepEqual(JSON.parse(settled.dailyJSON), { v: 1, date: DATE, puzzleIndex: 0, puzzleId: ready.puzzles[0].id, guesses: [{ t: 'ok', cellIndex: 0, playerName: NAME, rarity: 20 }], gameStatus: 'playing' }); await page.locator('[data-grid-cell-status]').first().scrollIntoViewIfNeeded(); await shot('settled-board');
      }
      assert(row.hold.released); const validator = row.api.filter(item => item.kind === 'validator'); assert.equal(validator.length, 1); assert.deepEqual(validator[0].body, { playerName: NAME, rowAttribute: ready.puzzles[0].rows[0].label, colAttribute: ready.puzzles[0].cols[0].label });
      const selections = row.api.filter(item => ['rarity', 'player-count', 'insert'].includes(item.kind)); assert.equal(selections.length, kind === 'unverified' ? 0 : 3);
      for (const item of selections) { if (item.kind === 'insert') assert.deepEqual(item.body, { puzzle_id: ready.puzzles[0].id, cell_index: 0, player_name: NAME.toLowerCase() }); else { const query = new URL(item.url).searchParams; assert.equal(query.get('puzzle_id'), 'eq.' + ready.puzzles[0].id); assert.equal(query.get('cell_index'), 'eq.0'); } }
    }
    await quiet(); assert.deepEqual(row.errors, []); assert.deepEqual(row.evidenceErrors, []); assert(!row.failures.some(failure => failure.owned), 'Every owned request succeeds'); assert(row.api.every(item => item.response && item.fulfilledAt));
    const requestedJs = [...new Set(row.requests.filter(request => new URL(request.url).origin === BASE && new URL(request.url).pathname.endsWith('.js')).map(request => request.url))].sort(); assert(requestedJs.length > 0); assert.deepEqual([...new Set(row.js.map(item => item.url))].sort(), requestedJs, 'Every requested owned JS has a successful physical body receipt');
    assert(row.fonts.length > 0); assert.equal(row.api.filter(item => item.kind === 'puzzles').length, 1); assert.equal(row.api.filter(item => item.kind === 'players').length, 1); assert.equal(row.api.filter(item => item.kind === 'seasons').length, 1);
    row.status = 'passed';
  } catch (error) { row.status = 'failed'; row.error = String(error.stack || error); report.errors.push({ id, error: row.error }); try { if (page) await observe('failure'); } catch (capture) { row.evidenceErrors.push('Failure snapshot: ' + String(capture)); } }
  finally { release(); await bounded(Promise.all(bodyTasks), 'Final physical responses').catch(error => row.evidenceErrors.push(String(error))); await context.close(); if (row.evidenceErrors.length) row.status = 'failed'; const file = id + '.json'; write(file, row); row.raw = receipt(file); checkpoint(); }
}
try {
  browser = await pw.chromium.launch({ headless: true });
  for (const width of [390, 1280]) for (const kind of ['validator', 'rarity', 'insert', 'preplay', 'unverified']) await journey(width, kind);
  assert.equal(report.cases.length, 10); assert(report.cases.every(row => row.status === 'passed'), 'Every actual served journey passes');
  assert.equal(report.cases.flatMap(row => row.screenshots).length, 18); report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.qualified = false; report.error = String(error.stack || error); process.exitCode = 1; }
finally {
  if (browser) await browser.close(); const afterSource = sourceMap(), afterDist = tree(DIST); write('source-after.json', afterSource); write('dist-after.json', afterDist);
  try { assert.deepEqual(afterSource, beforeSource); assert.deepEqual(afterDist, beforeDist); report.sourceHeld = true; report.distHeld = true; }
  catch (error) { report.sourceHeld = false; report.distHeld = false; report.status = 'failed'; report.qualified = false; report.holdError = String(error); process.exitCode = 1; }
  checkpoint(); console.log(`Soccer Grid settings browser: ${report.cases.filter(row => row.status === 'passed').length}/10 actual journeys, ${report.cases.flatMap(row => row.screenshots).length} PNGs; qualified=${report.qualified}`);
}
}
try { await main(); }
catch (error) { report.status = 'failed'; report.qualified = false; report.setupError = String(error.stack || error); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n'); process.exitCode = 1; }
