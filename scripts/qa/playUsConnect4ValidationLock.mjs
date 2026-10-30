import a from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';
import { sha, inventory, loadFonts, checkFonts, shellFixture } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.US_C4_LOCK_OUT;
a(OUT && path.isAbsolute(OUT) && !path.resolve(OUT).startsWith(ROOT + path.sep) && path.resolve(OUT) !== ROOT, 'US_C4_METHOD_OUTPUT_OUTSIDE_SOURCE');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const HELD = {"scripts/lib/hostLikeServer.mjs":"3958c9a3b4d9e49bb60a3b7dd72d81a997bd1caed56e82e4c3bae07e1a918ef0","scripts/lib/playwrightLoader.mjs":"94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93","scripts/qa/siteMenuNavigationSupport.mjs":"c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303","src/components/game/PlayerAutocomplete.tsx":"7c11c31109912ccb50b23817b53c6c1e0c2ac809d6d7f9ce525fed2c36ffbe82","src/integrations/supabase/client.ts":"c8bd6d5ebf2610a34eda085224ae087293162b1fda6d4b7d03ae51d77e369684","src/lib/hockeyGrid.ts":"1ff5426e163623a0303f6a8adfe2e2668f39f57d31a134945a89fe46cfadc3f8","src/lib/mlbGrid.ts":"c3f9be84460d0b9abd2c7fb70a63f3a60b4d75c3c239e99f5e323a3d844c1b17","src/lib/playerSearch.ts":"f9727a18b786a23e5d9e1849abff8a676dcd6aec10058ccd2e857473bb5fdbcd","src/hooks/useNbaConnect4.ts":"9db63336365c6ae15af8258bebdbbe2b3dc3a4b9555e1b4804b8b08ba956299e","src/pages/NbaConnect4.tsx":"11f7fc4a2bfaac7012c705c3c73a1641b810c37df1fc13a33bf65ee5aac3d490","src/hooks/useNflConnect4.ts":"91637ba20d1b1d63330ad0bfa3bdfa221410f748f74d62d2dc51ccac8c1814fe","src/pages/NflConnect4.tsx":"316c907162cbd699da56c0ad6e17fb929b54fd5dd4081195f649993d79da5f72","src/hooks/useNhlConnect4.ts":"5b22fa80fd33c084f527fec4266e337a598b873448610bd5ced911c79e289ddf","src/pages/NhlConnect4.tsx":"3be131c53f4bf65c1e7e3f48fed00d57ee2a9f5b93e765e87ae422676c51fff4","src/hooks/useMlbConnect4.ts":"451acd6418168bb29fd7fd453cfffa7a44d53c8f68a0f6051dba0a0a51468a49","src/pages/MlbConnect4.tsx":"4f7d03757fccfabbf8c2f92c813ef108076b6df8d5f854c3bea3f4b59da6af86"};
write('source-inputs.json', Object.entries(HELD).map(([file, expected]) => { const body = fs.readFileSync(path.join(ROOT, file)); a.equal(sha(body), expected, 'US_C4_METHOD_SOURCE_PIN'); return { file, bytes: body.length, sha256: sha(body) }; }));
const DIST = path.resolve(process.env.US_C4_LOCK_DIST || path.join(ROOT, 'dist'));
const files = new Map(inventory(DIST).map(row => ['/' + row.file, row]));
const index = fs.readFileSync(path.join(DIST, 'index.html'));
a.equal(sha(index), files.get('/index.html')?.sha256, 'US_C4_METHOD_COMPLETED_INDEX');
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const client = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const BACKEND = new URL(client.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)[1]).origin;
const NAME = 'Qa Lock Player';
const PROFILES = [
  { id: 'nba390', sport: 'NBA', route: '/nba-connect-4', endpoint: 'nba-connect4-validate', table: 'nba_players_extended_v2', columns: ['last_name', 'first_name', 'player_id', 'team', 'position'], order: 'player_id.asc,last_name.asc', row: { first_name: 'Qa', last_name: 'Lock Player', player_id: 1, team: 'QA Fixture Team', position: 'QA' } },
  { id: 'nfl390', sport: 'NFL', route: '/nfl-connect-4', endpoint: 'nfl-connect4-validate', table: 'nfl_player_team_stints', columns: ['player_name', 'seasons'], order: 'seasons.desc,player_name.asc', row: { player_name: NAME, seasons: 1 } },
  { id: 'nhl390', sport: 'NHL', route: '/nhl-connect-4', endpoint: 'nhl-connect4-validate', table: 'nhl_player_stats', columns: ['player_name', 'points', 'position'], order: 'points.desc,player_name.asc', row: { player_name: NAME, points: 1, position: 'QA' } },
  { id: 'mlb390', sport: 'MLB', route: '/mlb-connect-4', endpoint: 'mlb-connect4-validate', table: 'mlb_grid_players', columns: ['player_name', 'hits'], order: 'hits.desc,player_name.asc', row: { player_name: NAME, hits: 1 } },
];
const mime = file => ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' }[path.extname(file)] || 'application/octet-stream');
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
async function bounded(promise, label) { let timer; try { return await Promise.race([promise, new Promise((_, no) => { timer = setTimeout(() => no(new Error('US_C4_METHOD_TIMEOUT_' + label)), 15000); })]); } finally { clearTimeout(timer); } }
async function frames(page) { return bounded(page.evaluate(() => new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve([first, second]))))), 'ACTUAL_FRAMES'); }
async function actualFonts(page, row) {
  await page.waitForFunction(() => document.fonts.status === 'loaded' && ['Inter', 'Space Grotesk'].every(name => [...document.fonts].some(face => face.family.replace(/['"]/g, '') === name && face.status === 'loaded')));
  const value = await page.evaluate(() => ({ status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) })); checkFonts(value); row.fonts.push(value);
}
async function sample(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('button[aria-label]')].filter(node => /^(Empty square,|Qa Lock Player,)/.test(node.getAttribute('aria-label')));
    const headers = nodes.length ? [...nodes[0].parentElement.children].filter(node => node.tagName === 'BUTTON' && !node.hasAttribute('aria-label')) : [];
    const input = document.querySelector('input[role="combobox"]'), skip = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === 'Skip');
    return { cells: nodes.map(node => ({ label: node.getAttribute('aria-label'), text: node.textContent.trim(), disabled: node.disabled, team: node.classList.contains('bg-red-500/80') ? 'red' : node.classList.contains('bg-blue-500/80') ? 'blue' : null })),
      headers: headers.map(node => ({ text: node.textContent.trim(), disabled: node.disabled, selected: node.classList.contains('bg-primary') })), skip: skip ? { disabled: skip.disabled } : null,
      input: input ? { value: input.value, disabled: input.disabled } : null, clue: input?.closest('.space-y-3')?.querySelector('p')?.textContent.trim().replace(/\s+/g, ' ') || null,
      redTurn: [...document.querySelectorAll('span')].filter(node => node.textContent.trim() === "Red's Turn").length, blueTurn: [...document.querySelectorAll('span')].filter(node => node.textContent.trim() === "Blue's Turn").length };
  });
}
function judge(value) {
  a.deepEqual(value.profiles.map(row => row.id), PROFILES.map(row => row.id), 'US_C4_METHOD_PROFILE_SET');
  for (const row of value.profiles) {
    a.deepEqual([row.pageErrors, row.consoleErrors], [[], []], 'US_C4_METHOD_PAGE_ERRORS'); a(row.io.every(item => item.kind !== 'unknown-refused'), 'US_C4_METHOD_KNOWN_IO_ONLY');
    a.deepEqual(row.normalTurns, ['red', 'blue', 'red'], 'US_C4_METHOD_ORDINARY_SKIP');
    a(row.pending.cells.length === 42 && row.pending.headers.length === 7 && row.pending.cells.every(cell => cell.team === null), 'US_C4_METHOD_EMPTY_FOUNDATION');
    a.deepEqual({ skip: row.pending.skip?.disabled, headers: row.pending.headers.map(header => header.disabled), cells: row.pending.cells.map(cell => cell.disabled), input: row.pending.input?.disabled }, { skip: true, headers: Array(7).fill(true), cells: Array(42).fill(true), input: true }, 'US_C4_NATIVE_UI_LOCK');
    a(row.afterAttempts.redTurn === 1 && row.afterAttempts.blueTurn === 0, 'US_C4_NATIVE_TURN_HELD');
    a.deepEqual({ clue: row.afterAttempts.clue, selected: row.afterAttempts.headers.map(header => header.selected), input: row.afterAttempts.input }, { clue: row.pending.clue, selected: [true, false, false, false, false, false, false], input: { value: NAME, disabled: true } }, 'US_C4_NATIVE_CLUE_HELD');
    a.deepEqual(row.afterAttempts.cells, row.pending.cells, 'US_C4_NATIVE_GRID_HELD');
    const placed = row.accepted.cells.filter(cell => cell.team);
    a(row.accepted.cells.length === 42 && placed.length === 1 && placed[0].team === 'red' && placed[0].label === `${NAME}, ${row.clue.row} and ${row.clue.column}` && row.accepted.cells[35].team === 'red' && row.accepted.redTurn === 0 && row.accepted.blueTurn === 1 && row.accepted.input === null && row.accepted.skip?.disabled === false && row.accepted.headers.every(header => !header.disabled) && row.accepted.cells.filter(cell => !cell.team).every(cell => !cell.disabled), 'US_C4_NATIVE_RED_ACCEPTED');
    a.equal(row.validators.length, 1, 'US_C4_METHOD_CALLBACK_ONCE'); const validator = row.validators[0]; a(validator.callbacks === 1 && validator.fulfillments === 1, 'US_C4_METHOD_CALLBACK_ONCE');
    a.deepEqual(validator.body, { playerName: NAME, columnAttribute: row.clue.column, rowAttribute: row.clue.row }, 'US_C4_METHOD_ACTUAL_CLUE_REQUEST');
    const response = fs.readFileSync(path.join(OUT, validator.response.file)); a.equal(sha(response), validator.response.sha256); a.deepEqual(JSON.parse(response), { valid: true, fullName: NAME });
    a.deepEqual(row.attempts.map(item => [item.id, item.disabled, item.hitOwner]), [['skip', true, true], ['header1', true, true], ['cell2', true, true]], 'US_C4_METHOD_NATIVE_TARGETS');
    a.equal(row.fonts.length, 3); row.fonts.forEach(checkFonts); a.deepEqual(row.images.map(image => image.file), [row.id + '-pending.png', row.id + '-accepted.png'], 'US_C4_METHOD_IMAGE_COUNT');
    for (const image of row.images) { const bytes = fs.readFileSync(path.join(OUT, image.file)); a.equal(sha(bytes), image.sha256, 'US_C4_METHOD_IMAGE_HASH'); a.equal(bytes.length, image.bytes); a.equal(bytes.readUInt32BE(16), 390); a.equal(bytes.readUInt32BE(20), 844); }
  }
}
async function wheelTo(page, locator) {
  for (let attempt = 0; attempt < 10; attempt += 1) { const box = await locator.boundingBox(); a(box, 'US_C4_METHOD_REAL_TARGET_BOX'); const y = box.y + box.height / 2; if (y >= 90 && y < 800) return box; await page.mouse.wheel(0, y - 430); await frames(page); }
  throw new Error('US_C4_METHOD_TARGET_NOT_VISIBLE');
}
async function attemptDisabled(page, locator, id, row) {
  const box = await wheelTo(page, locator), x = box.x + box.width / 2, y = box.y + box.height / 2; a(x >= 0 && x < 390, 'US_C4_METHOD_TARGET_INSIDE_VIEWPORT');
  const owner = await locator.evaluate((node, point) => ({ disabled: node.disabled, hitOwner: node.contains(document.elementFromPoint(point.x, point.y)) }), { x, y }); row.attempts.push({ id, x, y, box, ...owner }); a(owner.disabled && owner.hitOwner, 'US_C4_METHOD_NATIVE_DISABLED_OWNER'); await page.mouse.click(x, y); await frames(page);
}
async function picture(page, row, tag) {
  const file = row.id + '-' + tag + '.png'; a(!fs.existsSync(path.join(OUT, file)), 'US_C4_METHOD_NEW_ORIGINAL_IMAGE'); const body = await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.images.push({ file, bytes: body.length, sha256: sha(body), width: body.readUInt32BE(16), height: body.readUInt32BE(20), scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })), scope: 'NORMAL_NATIVE_PHONE_VIEWPORT_ORIGINAL' });
}
let server, browser, base = process.env.BASE, stopping = false;
const report = { scope: 'SYNTHETIC_US_CONNECT4_PENDING_LOCK_ONLY', source: process.env.GITHUB_SHA || null, realBackendWrites: false, realDataValidation: false, sourceShellSHA256: sha(index), viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce', profiles: [], controls: [], failures: [] };
async function journey(context, row, profile) {
  const page = await context.newPage(), release = deferred(), seen = deferred(), responseSeen = deferred(); let expected, capturedRequest;
  page.setDefaultTimeout(15000); page.on('pageerror', error => row.pageErrors.push(error.message)); page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.request() === capturedRequest) responseSeen.resolve(response); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), item = { url: url.href, method: request.method(), type: request.resourceType() };
    try {
      a(!url.username && !url.password && !url.hash, 'US_C4_METHOD_REQUEST_AUTHORITY');
      if (url.origin === new URL(base).origin) {
        const fresh = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
        a(['GET', 'HEAD'].includes(request.method()) && (!url.search || fresh), 'US_C4_METHOD_STATIC_REQUEST'); const shell = url.pathname === profile.route && request.resourceType() === 'document';
        const file = shell || url.pathname === '/' ? '/index.html' : url.pathname, pin = files.get(file); a(pin, 'US_C4_METHOD_COMPLETED_DIST_FILE'); const body = shell || file === '/index.html' ? index : fs.readFileSync(path.join(DIST, pin.file)); a.equal(sha(body), pin.sha256, 'US_C4_METHOD_ASSET_HELD'); row.io.push({ ...item, kind: shell ? 'actual-built-source-shell' : 'completed-dist', file: pin.file, bytes: body.length, sha256: sha(body) }); return await route.fulfill({ status: 200, contentType: mime(pin.file), body: request.method() === 'HEAD' ? Buffer.alloc(0) : body });
      }
      if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) { const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', bytes: font.body.length, sha256: font.sha256 }); return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } }); }
      if (url.origin === BACKEND && url.pathname === '/rest/v1/' + profile.table && request.method() === 'GET' && request.postData() === null && request.resourceType() === 'fetch') {
        const q = url.searchParams, leg = profile.sport === 'NBA' ? q.has('or') : q.has('player_name'); a.deepEqual([...q.keys()].sort(), (leg ? ['limit', 'order', profile.sport === 'NBA' ? 'or' : 'player_name', 'select'] : ['limit', 'order', 'select']).sort()); a.deepEqual(q.get('select').split(',').sort(), [...profile.columns].sort()); a.equal(q.get('order'), profile.order); a.equal(q.get('limit'), leg ? '200' : '1000');
        if (leg) a.equal(q.get(profile.sport === 'NBA' ? 'or' : 'player_name'), profile.sport === 'NBA' ? '(first_name.ilike.%Qa%,last_name.ilike.%Qa%)' : 'ilike.%' + NAME + '%');
        const body = JSON.stringify([profile.row]); row.io.push({ ...item, kind: 'synthetic-QA-player-search', bytes: Buffer.byteLength(body), sha256: sha(body) }); return await route.fulfill({ status: 200, contentType: 'application/json', body, headers: { 'content-range': '0-0/1' } });
      }
      if (url.origin === BACKEND && url.pathname === '/functions/v1/' + profile.endpoint) {
        a(request.method() === 'POST' && !url.search && request.resourceType() === 'fetch' && expected, 'US_C4_METHOD_VALIDATOR_SHAPE'); a.equal(row.validators.length, 0, 'US_C4_METHOD_UNEXPECTED_VALIDATOR'); const body = request.postDataJSON(); a.deepEqual(body, expected, 'US_C4_METHOD_ACTUAL_CLUE_REQUEST'); const record = { ...item, body, bodySHA256: sha(request.postData()), callbacks: 1, fulfillments: 0 }; row.validators.push(record); row.io.push({ ...item, kind: 'synthetic-QA-validator' }); capturedRequest = request; seen.resolve(); await release.promise; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, fullName: NAME }) }); record.fulfillments += 1; return;
      }
      const fixture = shellFixture(request, url); if (fixture) { row.io.push({ ...item, kind: fixture.id }); return await route.fulfill({ status: 200, contentType: 'application/json', body: fixture.body, headers: fixture.date ? { date: fixture.date } : {} }); }
      throw new Error('US_C4_METHOD_UNEXPECTED_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient').catch(() => {}); }
  });
  try {
    await page.goto(base + profile.route, { waitUntil: 'domcontentloaded' }); await page.getByRole('heading', { level: 1, name: profile.sport + ' CONNECT 4', exact: true }).waitFor(); const reject = page.getByRole('button', { name: 'Reject all', exact: true }); await reject.click(); await reject.waitFor({ state: 'hidden' }); await actualFonts(page, row);
    const turn = value => value.redTurn === 1 && value.blueTurn === 0 ? 'red' : value.blueTurn === 1 && value.redTurn === 0 ? 'blue' : 'ambiguous'; const skip = page.getByRole('button', { name: 'Skip', exact: true }); row.normalTurns.push(turn(await sample(page))); await skip.click(); row.normalTurns.push(turn(await sample(page))); await skip.click(); row.normalTurns.push(turn(await sample(page)));
    await page.getByRole('button', { name: /^Empty square,/ }).first().click(); const selected = await sample(page), pair = selected.clue?.match(/"(.+)"\s*\+\s*"(.+)"/); a(pair && selected.headers[0].selected, 'US_C4_METHOD_ACTUAL_SELECTED_CLUE'); row.clue = { column: pair[1], row: pair[2] }; a.equal(row.clue.column, selected.headers[0].text); a.equal(selected.cells[35].label, `Empty square, ${row.clue.row} and ${row.clue.column}`); expected = { playerName: NAME, columnAttribute: row.clue.column, rowAttribute: row.clue.row };
    await page.getByRole('combobox').fill(NAME); await page.getByRole('option', { name: new RegExp(NAME) }).click(); await bounded(seen.promise, profile.id + '_REQUEST'); row.pending = await sample(page);
    const grid = page.getByRole('button', { name: /^Empty square,/ }).first().locator('..'); const headers = grid.locator('button:not([aria-label])'); await attemptDisabled(page, skip, 'skip', row); await attemptDisabled(page, headers.nth(1), 'header1', row); await attemptDisabled(page, page.getByRole('button', { name: /^Empty square,/ }).nth(2), 'cell2', row); row.afterAttempts = await sample(page); await wheelTo(page, page.getByRole('combobox')); await actualFonts(page, row); await picture(page, row, 'pending');
    release.resolve(); const response = await bounded(responseSeen.promise, profile.id + '_RESPONSE'), body = await response.body(); a.equal(response.status(), 200); a.deepEqual(JSON.parse(body), { valid: true, fullName: NAME }); a.equal(await response.finished(), null); const file = profile.id + '-validator-response.json'; fs.writeFileSync(path.join(OUT, file), body, { flag: 'wx' }); row.validators[0].response = { status: 200, file, bytes: body.length, sha256: sha(body), actualFrameTimes: await frames(page) }; row.accepted = await sample(page); await actualFonts(page, row); await wheelTo(page, page.getByRole('button', { name: new RegExp('^' + NAME + ',') })); await picture(page, row, 'accepted');
  } finally { release.resolve(); await page.close(); }
}
try {
  if (!base) {
    const listener = net.createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve)); const port = listener.address().port; await new Promise(resolve => listener.close(resolve)); base = 'http://127.0.0.1:' + port;
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { stdio: ['ignore', fs.openSync(path.join(OUT, 'server.stdout'), 'wx'), fs.openSync(path.join(OUT, 'server.stderr'), 'wx')] }); server.on('error', error => { if (!stopping) report.failures.push({ method: 'server', message: error.message }); }); let ready = false; for (let attempt = 0; attempt < 40 && !ready; attempt += 1) { ready = await fetch(base).then(response => response.ok).catch(() => false); if (!ready) await new Promise(resolve => setTimeout(resolve, 100)); } a(ready, 'US_C4_METHOD_SERVER_READY');
  }
  const origin = new URL(base); a(origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) && !origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === '/', 'US_C4_METHOD_LOOPBACK_BASE'); base = origin.origin; browser = await chromium.launch();
  for (const profile of PROFILES) { const row = { id: profile.id, sport: profile.sport, route: profile.route, io: [], validators: [], pageErrors: [], consoleErrors: [], fonts: [], images: [], attempts: [], normalTurns: [] }; report.profiles.push(row); const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce' }); try { await journey(context, row, profile); } catch (error) { report.failures.push({ profile: row.id, name: error.name, message: error.message, stack: error.stack }); } finally { await context.close(); write(row.id + '-observations.json', row); } }
  a.equal(report.failures.length, 0, 'US_C4_METHOD_COMPLETE_JOURNEYS'); judge(report);
  const foundation = Buffer.from(JSON.stringify(report, null, 2) + '\n'), working = path.join(OUT, 'observation-working.json'); fs.writeFileSync(path.join(OUT, 'observation-foundation.json'), foundation, { flag: 'wx' }); fs.writeFileSync(working, foundation, { flag: 'wx' });
  const mutations = [
    ['skip-lock', value => { value.profiles[0].pending.skip.disabled = false; }, 'US_C4_NATIVE_UI_LOCK'],
    ['header-lock', value => { value.profiles[0].pending.headers[1].disabled = false; }, 'US_C4_NATIVE_UI_LOCK'],
    ['cell-lock', value => { value.profiles[0].pending.cells[2].disabled = false; }, 'US_C4_NATIVE_UI_LOCK'],
    ['input-lock', value => { value.profiles[0].pending.input.disabled = false; }, 'US_C4_NATIVE_UI_LOCK'],
    ['turn-held', value => { value.profiles[0].afterAttempts.redTurn = 0; value.profiles[0].afterAttempts.blueTurn = 1; }, 'US_C4_NATIVE_TURN_HELD'],
    ['clue-held', value => { value.profiles[0].afterAttempts.clue = 'QA Copied Clue'; }, 'US_C4_NATIVE_CLUE_HELD'],
    ['grid-held', value => { value.profiles[0].afterAttempts.cells[0].label = 'QA Copied Disc'; }, 'US_C4_NATIVE_GRID_HELD'],
    ['red-placement', value => { value.profiles[0].accepted.cells.find(cell => cell.team).team = 'blue'; }, 'US_C4_NATIVE_RED_ACCEPTED'],
    ['callback-once', value => { value.profiles[0].validators[0].fulfillments = 2; }, 'US_C4_METHOD_CALLBACK_ONCE'],
    ['image-hash', value => { value.profiles[0].images[0].sha256 = '0'.repeat(64); }, 'US_C4_METHOD_IMAGE_HASH'],
    ['unknown-request', value => { value.profiles[0].io[0].kind = 'unknown-refused'; }, 'US_C4_METHOD_KNOWN_IO_ONLY'],
    ['page-error', value => { value.profiles[0].pageErrors.push('QA copied error'); }, 'US_C4_METHOD_PAGE_ERRORS'],
  ];
  for (const [id, mutate, marker] of mutations) { const copy = JSON.parse(fs.readFileSync(working, 'utf8')); mutate(copy); const changed = Buffer.from(JSON.stringify(copy, null, 2) + '\n'); a.notEqual(sha(changed), sha(foundation)); fs.writeFileSync(working, changed); fs.writeFileSync(path.join(OUT, id + '.changed.json'), changed, { flag: 'wx' }); let error; try { judge(JSON.parse(fs.readFileSync(working, 'utf8'))); } catch (caught) { error = caught; } finally { fs.writeFileSync(working, foundation); a.deepEqual(fs.readFileSync(working), foundation); judge(JSON.parse(fs.readFileSync(working, 'utf8'))); fs.writeFileSync(path.join(OUT, id + '.restored.json'), fs.readFileSync(working), { flag: 'wx' }); } a(error instanceof a.AssertionError && error.message.includes(marker), 'US_C4_METHOD_OWNED_COPIED_REFUSAL'); report.controls.push({ id, marker, beforeSHA256: sha(foundation), changedSHA256: sha(changed), restoredSHA256: sha(foundation), workingFile: 'observation-working.json', sameCopyRestored: true, scope: 'COPIED_OBSERVATION_ONLY', featurePassCredit: false }); }
  report.status = 'US_C4_NATIVE_VALIDATION_LOCK_PASSED';
} catch (error) { report.status = 'US_C4_NATIVE_VALIDATION_LOCK_FAILED'; report.failures.push({ name: error.name, message: error.message, stack: error.stack }); process.exitCode = 1; }
finally { try { if (browser) await browser.close(); } catch (error) { report.status = 'US_C4_NATIVE_VALIDATION_LOCK_FAILED'; report.failures.push({ method: 'browser-close', message: error.message }); process.exitCode = 1; } stopping = true; if (server) server.kill(); write('VALIDATION-LOCK-REPORT.json', report); }
console.log(report.status + ': ' + report.profiles.length + ' phone journeys, ' + report.controls.length + ' copied controls; synthetic source-shell client scope only.');
