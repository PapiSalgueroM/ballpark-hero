/* Round1434: exact apostrophe canonical callbacks on the actual built Soccer Grid route. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '../lib/playwrightLoader.mjs';
import { readPlan, sourceForArm, BASE, PRODUCT } from './gridApostropheSearch1434.mjs';

async function main() {
const base = 'http://127.0.0.1:4173', api = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const mode = process.env.SOCCER_GRID_APOSTROPHE_MODE, arm = process.env.SOCCER_GRID_APOSTROPHE_ARM || 'normal', evidenceRoot = process.env.SOCCER_GRID_APOSTROPHE_OUT;
const arms = ['normal', 'removed-fold', 'restored'];
assert(['baseline', 'fixed'].includes(mode)); assert(arms.includes(arm)); assert(mode === 'fixed' || arm === 'normal');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline preload inherited');
assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(process.cwd(), evidenceRoot).split(path.sep).includes('..'), 'External evidence root');
const out = path.join(evidenceRoot, 'browser', arm); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const plan = readPlan(process.cwd(), mode, arm), originalSearch = git(['show', BASE + ':' + PRODUCT]).toString('utf8');
const expectedSearch = sourceForArm(plan, arm); assert.equal(hash(originalSearch), plan.originalSha256);
assert.equal(typeof expectedSearch, 'string');
const sourceFiles = [PRODUCT, 'src/pages/SoccerGrid.tsx', 'src/components/soccer-grid/SoccerGridBoard.tsx', 'src/hooks/useSoccerGrid.ts', 'src/hooks/useDailyPuzzle.ts',
  'src/lib/fetchCareerPlayers.ts', 'src/lib/fetchAllRows.ts', 'src/lib/fetchSoccerGridPuzzles.ts', 'src/types/soccerGrid.ts', 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts',
  'src/lib/smartSearch.ts', 'src/lib/soccerGridDifficulty.ts', 'src/lib/gridRarity.ts', 'scripts/simSoccerGridLabels.mjs', 'scripts/simSoccerGridTiers.mjs'];
const source = sourceFiles.map((file, index) => { const original = git(['show', BASE + ':' + file]), actual = fs.readFileSync(file); assert(actual.equals(index === 0 ? Buffer.from(expectedSearch) : original), 'Exact source arm: ' + file); return { file, originalSha256: hash(original), actualSha256: hash(actual) }; });
const sourceStatus = git(['status', '--porcelain=v1', '--untracked-files=all']);
const inventory = directory => {
  const result = []; const visit = current => { for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(current, entry.name); assert(!entry.isSymbolicLink(), 'No symlink in held physical tree'); if (entry.isDirectory()) visit(file); else { assert(entry.isFile()); const stat = fs.statSync(file); result.push({ file: path.relative(directory, file).split(path.sep).join('/'), bytes: stat.size, sha256: hash(fs.readFileSync(file)), modifiedTimeMs: stat.mtimeMs }); }
  } }; visit(directory); return result;
};
const distBefore = inventory(path.resolve('dist'));
const require = createRequire(path.join(process.cwd(), 'package.json')), coreDir = path.dirname(require.resolve('playwright-core'));
const packageVersion = JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('playwright')), 'package.json'))).version;
assert.equal(packageVersion, '1.64.0'); assert.equal(JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'))).version, packageVersion);
const coreBody = fs.readFileSync(path.join(coreDir, 'lib/coreBundle.js')), browsersBody = fs.readFileSync(path.join(coreDir, 'browsers.json'));
const installedChromium = JSON.parse(browsersBody).browsers.filter(entry => ['chromium', 'chromium-headless-shell'].includes(entry.name)); assert.equal(installedChromium.length, 2);
const binaryRoot = process.env.PLAYWRIGHT_BROWSERS_PATH; assert(binaryRoot && path.isAbsolute(binaryRoot));
const publicExecutablePath = chromium.executablePath(); assert(fs.realpathSync(publicExecutablePath).startsWith(fs.realpathSync(binaryRoot) + path.sep));
fs.writeFileSync(path.join(out, 'actual-browsers.json'), browsersBody, { flag: 'wx' });
const cacheRoot = process.env.FREE_KICK_FONT_CACHE; assert(cacheRoot && path.isAbsolute(cacheRoot));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(cacheRoot, 'manifest.json'))).map(row => { const body = fs.readFileSync(path.join(cacheRoot, row.file)); assert.equal(hash(body), row.sha256); return [row.url, { body, contentType: row.contentType }]; }));
const storageFixture = { origin: base, entries: [ ['cookie-consent', 'essential'], ['sg-rules-seen', '1'], ['rules-gate-seen:/soccer-grid', '1'], ['grid-search-held-career', '{"held":"unrelated career"}'] ] };
const puzzle = { puzzle_id: 'fixture-grid-blur', rows_json: [1, 2, 3].map(index => ({ label: 'Fixture Club ' + index, type: 'club' })), cols_json: [1, 2, 3].map(index => ({ label: 'Fixture Position ' + index, type: 'position' })) };
const legacy = mode === 'baseline' || arm === 'removed-fold';
const widths = ['normal', 'restored'].includes(arm) ? [390, 1280] : [390];
const pairs = [{ direction: 'catalog-curly', canonical: 'Fixture N\u2019Ara', query: "Fixture N'Ara" },
  { direction: 'catalog-straight', canonical: "Fixture N'Ara", query: 'Fixture N\u2019Ara' }];
const specs = pairs.flatMap(pair => widths.map(width => ({ ...pair, id: pair.direction + '-' + width, width })));
const report = { version: 1, mode, arm, base: BASE, source, sourceSearchSha256: source[0].actualSha256, sourceStatusSha256: hash(sourceStatus), startedAtUtc: new Date().toISOString(), status: 'failed', productQualified: false,
  scope: 'Actual built Soccer Grid Page/Search/Board/hook/DailyPuzzle/career loaders and native Chromium accessibility tree. Four disclosed fictional names and one synthetic board. All external IO locally fulfilled. No spoken assistive-technology, full WCAG, real-player, adjudication, live-backend, no-scroll or release claim.',
  nativeMethod: { engine: 'chromium', packageVersion, coreSha256: hash(coreBody), browsersJsonSha256: hash(browsersBody), installedChromium, binaryRoot, publicExecutablePath, storageFixture, logAttribution: 'Parent DEBUG=pw:browser log binds each sequential launch ordinal to its actual command, PID, installed executable and clean exit. Public executable path is not asserted to be the launched headless-shell path.' },
  fixtures: { puzzle, playerPool: 'Per context: exact canonical quote fixture plus three plain fictional names', validatorReply: { valid: false, unverified: true, reason: 'Synthetic no-penalty retry' } },
  expected: { contexts: specs.length, validatorDeliveries: specs.length, callbackFaults: legacy ? specs.length : 0 },
  census: specs, distBefore, distAfter: null, cases: [], cleanupErrors: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = async (row, label, run, timeoutMs = 15000) => { const receipt = { label, timeoutMs, status: 'pending' }; row.waits.push(receipt); save(); let timer;
  try { const value = await Promise.race([run(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded ' + timeoutMs + 'ms')), timeoutMs); })]); receipt.status = 'passed'; return value; }
  catch (error) { receipt.status = 'failed'; receipt.error = String(error?.stack ?? error); throw error; } finally { clearTimeout(timer); save(); }
};
const poll = async (row, label, read, predicate) => { for (let attempt = 0; attempt < 200; attempt++) { const value = await bounded(row, 'poll ' + label + ' read ' + attempt, read, 5000); if (predicate(value)) return value; await wall(20); } assert.fail('Setup/completion did not reach ' + label + '; no semantic fault credit'); };
const property = (node, name) => node?.properties?.find(item => item.name === name)?.value;
const relation = (node, name) => property(node, name)?.relatedNodes ?? [];
const squish = value => String(value ?? '').replace(/\s+/g, ' ').trim();
save();
try {
  for (const [index, spec] of specs.entries()) {
    const names = [spec.canonical, 'Fixture Plain Two', 'Fixture Plain Three', 'Fixture Plain Four'];
    const players = names.map((player_name, playerIndex) => ({ id: 'fixture-player-' + playerIndex, player_name, nationality: 'Fixture Nation', position: 'Fixture Position' }));
    const seasons = [{ player_id: 'fixture-player-0', season: 'Fixture Season', club: 'Fixture Club', goals: 0, assists: 0, appearances: 0, market_value: 0, sort_order: 0 }];
    const row = { ...spec, touch: spec.width < 600, nativeLaunchOrdinal: index + 1, status: 'failed', originalFault: false, healthyDelivery: false, requests: [], fixtures: [], invokes: [], counts: [], headResponses: [], finishedRequests: [], selections: [], readFixtures: [], externalFulfilled: [], localCssFixtures: [], diagnostics: [], unexpectedWrites: [], errors: [], assets: [], screenshots: [], waits: [], responseObservers: [], observations: [], actions: [], settles: [], axSnapshots: [], callbackChecks: [], axChecks: [], lifecycle: { launched: false, contextCreated: false, pageCreated: false, cdpDetached: false, contextClosed: false, browserClosed: false } };
    report.cases.push(row); save();
    let browser, context, page, cdp; const pending = new Map(), responses = [], pendingRoutes = new Set(), requestMap = new Map();
    const requestRecord = request => { if (!requestMap.has(request)) { const record = { id: row.requests.length, url: request.url(), method: request.method(), resourceType: request.resourceType(), terminal: 'pending' }; requestMap.set(request, record); row.requests.push(record); } return requestMap.get(request); };
    const release = async key => { assert(pending.has(key)); await pending.get(key)(); };
    const observeResponse = (kind, response, read) => { const observer = { id: row.responseObservers.length, kind, url: response.url(), requestId: requestRecord(response.request()).id, status: 'pending' }; row.responseObservers.push(observer); save(); responses.push((async () => { try { await bounded(row, kind + ' observer ' + observer.id, () => read(observer), 30000); observer.status = 'passed'; } catch (error) { observer.status = 'failed'; observer.error = String(error?.stack ?? error); row.errors.push(observer.error); } finally { save(); } })()); };
    const cors = request => ({ 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,HEAD,POST,OPTIONS', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,prefer,range,range-unit', 'access-control-expose-headers': 'content-range,date' });
    try {
      browser = await bounded(row, 'launch fresh Chromium process', () => chromium.launch({ headless: true }), 45000); row.lifecycle.launched = true; row.lifecycle.launchedAtUtc = new Date().toISOString();
      row.browserVersion = browser.version(); assert(installedChromium.some(entry => entry.browserVersion === row.browserVersion), 'Actual engine matches installed manifest'); row.publicExecutablePath = chromium.executablePath();
      context = await bounded(row, 'create fresh context', () => browser.newContext({ viewport: { width: spec.width, height: 844 }, deviceScaleFactor: 1, isMobile: row.touch, hasTouch: row.touch, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: storageFixture.entries.map(([name, value]) => ({ name, value })) }] } })); row.lifecycle.contextCreated = true;
      await bounded(row, 'install exact locally fulfilled IO', () => context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        const captured = requestRecord(request); pendingRoutes.add(captured.id);
        const fulfill = async (kind, options) => { await route.fulfill(options); row.externalFulfilled.push({ requestId: captured.id, url: url.href, kind, status: options.status }); };
        const json = async (kind, reply, status = 200, headers = {}) => fulfill(kind, { status, headers: { ...cors(request), ...headers }, contentType: 'application/json', body: JSON.stringify(reply) });
        const hold = async (key, finish) => {
          assert(!pending.has(key), 'Only one actual held ' + key + ' request');
          await new Promise(resolve => { pending.set(key, async () => { await finish(); pending.delete(key); resolve(); }); });
        };
        try {
          if (url.origin === base) {
            assert.equal(request.method(), 'GET', 'No local application write');
            if (url.pathname.endsWith('.css')) {
              const physical = path.resolve('dist', '.' + decodeURIComponent(url.pathname)); assert(physical.startsWith(path.resolve('dist') + path.sep));
              const body = fs.readFileSync(physical), contentType = 'text/css; charset=utf-8';
              const fixture = { requestId: captured.id, url: url.href, member: path.relative(path.resolve('dist'), physical).split(path.sep).join('/'), status: 200, contentType, bytes: body.length, sha256: hash(body), fulfilled: false };
              row.localCssFixtures.push(fixture); save();
              await route.fulfill({ status: 200, headers: { 'content-type': contentType, 'content-length': String(body.length), 'cache-control': 'no-store' }, body });
              fixture.fulfilled = true; save(); return;
            }
            return await route.continue();
          }
          if (request.method() === 'OPTIONS') { assert.equal(url.origin, api); assert(['/rest/v1/soccer_grid_puzzles', '/rest/v1/career_players', '/rest/v1/career_seasons', '/rest/v1/live_scores', '/functions/v1/soccer-grid-validate'].includes(url.pathname), 'Only disclosed actual fixture paths have preflight'); return await fulfill('api-preflight', { status: 204, headers: cors(request), body: '' }); }
          if (fonts.has(url.href)) { assert.equal(request.method(), 'GET'); return await fulfill('verified-font-cache', { status: 200, headers: cors(request), ...fonts.get(url.href) }); }
          if (url.origin === api) {
            const select = url.searchParams.get('select'), order = url.searchParams.get('order');
            if (url.pathname === '/rest/v1/soccer_grid_puzzles' && request.method() === 'GET') {
              assert.deepEqual([...url.searchParams.keys()], ['select', 'order']); assert.equal(request.postData(), null); assert.equal(select, 'puzzle_id,rows_json,cols_json'); assert.equal(order, 'sort_order.asc');
              const fixture = { requestId: captured.id, table: 'soccer_grid_puzzles', delivered: false, reply: [puzzle] }; row.fixtures.push(fixture);
              await json('synthetic-puzzle', fixture.reply); fixture.delivered = true; return;
            }
            if (url.pathname === '/rest/v1/career_players' && request.method() === 'GET') {
              assert.deepEqual([...url.searchParams.keys()], ['select', 'order']); assert.equal(request.postData(), null); assert.equal(select, 'id,player_name,nationality,position'); assert.equal(order, 'player_name.asc');
              const fixture = { requestId: captured.id, table: 'career_players', delivered: false, reply: players }; row.fixtures.push(fixture);
              await json('fictional-career-players', fixture.reply); fixture.delivered = true; return;
            }
            if (url.pathname === '/rest/v1/career_seasons' && request.method() === 'GET') {
              assert.deepEqual([...url.searchParams.keys()], ['select', 'order', 'offset', 'limit']); assert.equal(request.postData(), null); assert.equal(select, 'player_id,season,club,goals,assists,appearances,market_value,sort_order'); assert.equal(order, 'player_id.asc,sort_order.asc');
              assert.equal(url.searchParams.get('offset'), '0'); assert.equal(url.searchParams.get('limit'), '1000');
              const fixture = { requestId: captured.id, table: 'career_seasons', held: false, delivered: false, reply: seasons }; row.fixtures.push(fixture);
              await json('fictional-short-seasons-page', fixture.reply); fixture.delivered = true; return;
            }
            if (url.pathname === '/rest/v1/live_scores' && request.method() === 'GET') {
              assert.deepEqual([...url.searchParams.keys()], ['select', 'order', 'limit', 'start_at', 'start_at']); assert.equal(request.postData(), null); assert.equal(select, '*'); assert.equal(order, 'start_at.asc'); assert.equal(url.searchParams.get('limit'), '150');
              const times = url.searchParams.getAll('start_at'); assert.equal(times.length, 2); assert(times[0].startsWith('gte.') && Number.isFinite(Date.parse(times[0].slice(4)))); assert(times[1].startsWith('lte.') && Number.isFinite(Date.parse(times[1].slice(4)))); assert.equal(Date.parse(times[1].slice(4)) - Date.parse(times[0].slice(4)), 32 * 60 * 60 * 1000);
              row.readFixtures.push({ requestId: captured.id, kind: 'existing-live-scores-read', intercepted: true }); return await json('empty-live-scores', []);
            }
            if (url.pathname === '/functions/v1/soccer-grid-validate' && request.method() === 'POST') {
              assert.equal(url.search, ''); assert.equal(row.invokes.length, 0, 'One actual native validation per context');
              const body = request.postDataJSON(); assert.deepEqual(body, { playerName: legacy ? spec.query : spec.canonical, rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' });
              const reply = { valid: false, unverified: true, reason: 'Synthetic no-penalty retry' };
              const invoke = { requestId: captured.id, body, rawBody: request.postData(), reply, intercepted: true, fulfilled: false }; row.invokes.push(invoke);
              return await hold('validator', async () => { await json('synthetic-validator-reply', reply); invoke.fulfilled = true; });
            }
            if (!['GET', 'HEAD'].includes(request.method())) row.unexpectedWrites.push(captured);
            assert.fail('Unknown application API request: ' + request.method() + ' ' + url.pathname);
          }
          if (request.method() !== 'GET') row.unexpectedWrites.push(captured);
          assert.fail('Unknown external resource: ' + url.href);
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); try { await route.abort('failed'); } catch (abortError) { row.errors.push('Route abort: ' + String(abortError)); } } finally { pendingRoutes.delete(captured.id); }
      }));
      await bounded(row, 'block unexpected WebSockets', () => context.routeWebSocket('**/*', socket => { row.errors.push('Unexpected WebSocket: ' + socket.url()); socket.close(); }));
      await bounded(row, 'install passive native telemetry', () => context.addInitScript(origin => {
        const stores = () => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) });
        window.__gridA11y = { events: [], rejections: [], transport: [], randomCalls: 0, preApp: location.origin === origin && window === window.top ? { origin: location.origin, readyState: document.readyState, stores: stores() } : null };
        const random = Math.random; Math.random = function (...args) { window.__gridA11y.randomCalls++; return Reflect.apply(random, this, args); };
        const nativeFetch = window.fetch.bind(window); window.fetch = async (...args) => {
          const request = args[0], url = new URL(request instanceof Request ? request.url : String(request), location.href);
          const trace = url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' ? { url: url.href, method: args[1]?.method || (request instanceof Request ? request.method : 'GET'), responseResolved: false, bodyConsumed: false } : null;
          if (trace) window.__gridA11y.transport.push(trace); const response = await nativeFetch(...args);
          if (trace) { trace.responseResolved = true; for (const method of ['text', 'json']) { const consume = response[method].bind(response); response[method] = async (...readArgs) => { const value = await consume(...readArgs); trace.bodyConsumed = true; trace.reader = method; return value; }; } }
          return response;
        };
        window.addEventListener('unhandledrejection', event => window.__gridA11y.rejections.push(String(event.reason?.stack ?? event.reason)));
        for (const type of ['input', 'keydown', 'mousedown', 'click', 'submit', 'focus', 'blur', 'touchstart']) window.addEventListener(type, event => {
          const target = event.target instanceof Element ? event.target.closest('input,button,li,form') : null;
          if (target) window.__gridA11y.events.push({ type, trusted: event.isTrusted, time: performance.now(), key: event.key || null, label: target.getAttribute('aria-label') || target.textContent?.trim().slice(0, 160), value: target instanceof HTMLInputElement ? target.value : null, eventTargetTag: event.target instanceof Element ? event.target.tagName : null, eventTargetId: event.target instanceof Element ? event.target.id : null, eventTargetRole: event.target instanceof Element ? event.target.getAttribute('role') : null });
        }, { capture: true, passive: true });
      }, base));
      page = await bounded(row, 'create actual page', () => context.newPage()); row.lifecycle.pageCreated = true; page.setDefaultTimeout(15000);
      page.on('request', requestRecord);
      page.on('requestfinished', request => { const record = requestRecord(request); record.terminal = 'finished'; row.finishedRequests.push({ requestId: record.id, url: record.url, method: record.method }); });
      page.on('requestfailed', request => { const record = requestRecord(request); record.terminal = 'failed'; record.failure = request.failure(); row.errors.push('Request: ' + request.url() + ' ' + JSON.stringify(request.failure())); });
      page.on('pageerror', error => row.errors.push('Page: ' + error.message));
      page.on('console', message => { if (message.type() === 'error') row.errors.push('Console: ' + message.text()); });
      page.on('response', response => observeResponse('Actual response', response, async observer => {
        const headers = response.headers(), receipt = { requestId: observer.requestId, url: response.url(), method: response.request().method(), status: response.status(), headers, finished: false }; row.readFixtures.push({ response: receipt });
        assert.equal(await response.finished(), null, 'Every actual response finishes cleanly'); receipt.finished = true;
        if (response.request().method() === 'HEAD') { row.headResponses.push(receipt); assert.equal(response.status(), 200); }
        if (new URL(response.url()).origin !== base) return;
        assert.equal(response.status(), 200); const body = await response.body(), pathname = new URL(response.url()).pathname;
        const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
        const physical = path.resolve('dist', '.' + decodeURIComponent(relative)); assert(physical.startsWith(path.resolve('dist') + path.sep)); const expected = fs.readFileSync(physical);
        if (hash(body) !== hash(expected)) { const file = spec.id + '-response-' + observer.id + '-actual.bin'; fs.writeFileSync(path.join(out, file), body); row.diagnostics.push({ file, requestId: observer.requestId, url: response.url(), actualBytes: body.length, actualSha256: hash(body), expectedBytes: expected.length, expectedSha256: hash(expected) }); save(); }
        assert.equal(hash(body), hash(expected), 'Every local response equals completed physical dist');
        row.assets.push({ requestId: observer.requestId, path: pathname, member: path.relative(path.resolve('dist'), physical).split(path.sep).join('/'), bytes: body.length, sha256: hash(body), physicalSha256: hash(expected), contentType: headers['content-type'] });
      }));
      cdp = await bounded(row, 'create actual Chromium CDP session', () => context.newCDPSession(page));
      await bounded(row, 'enable native accessibility domain', () => cdp.send('Accessibility.enable'));
      const send = (method, params = {}) => bounded(row, 'CDP ' + method, () => cdp.send(method, params), 10000);
      const field = page.getByLabel('Search for a player', { exact: true }), cells = page.locator('#root [data-grid-cell-status]');
      const form = () => field.locator('xpath=ancestor::form');
      const settle = async label => {
        const receipt = { label, status: 'pending', wallWaitMs: 80 }; row.settles.push(receipt); save();
        try { receipt.timestamps = await bounded(row, 'two native frames ' + label, async () => { const values = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve([first, second]))))); await wall(80); return values; }, 5000); assert.equal(receipt.timestamps.length, 2); assert(receipt.timestamps.every(Number.isFinite)); assert(receipt.timestamps[1] > receipt.timestamps[0]); receipt.status = 'passed'; }
        catch (error) { receipt.status = 'failed'; receipt.error = String(error?.stack ?? error); throw error; } finally { save(); }
      };
      const read = () => bounded(row, 'passive actual DOM snapshot', () => page.evaluate(() => {
        const root = document.querySelector('#root'), input = root.querySelector('input[aria-label="Search for a player"]'), form = input?.closest('form'), list = form?.querySelector('ul');
        const bounds = element => { if (!element) return null; const r = element.getBoundingClientRect(), style = getComputedStyle(element); return { x: r.x, y: r.y, width: r.width, height: r.height, display: style.display, visibility: style.visibility, opacity: style.opacity }; };
        const attributes = element => element ? Object.fromEntries([...element.attributes].map(attribute => [attribute.name, attribute.value])) : null;
        return { query: input?.value ?? null, focused: !!input && document.activeElement === input, disabled: input?.disabled ?? null, submitDisabled: form?.querySelector('button[type="submit"]')?.disabled ?? null,
          input: input ? { attributes: attributes(input), bounds: bounds(input) } : null, list: list ? { attributes: attributes(list), bounds: bounds(list), client: { x: list.getBoundingClientRect().x + list.clientLeft, y: list.getBoundingClientRect().y + list.clientTop, width: list.clientWidth, height: list.clientHeight, scrollTop: list.scrollTop } } : null,
          options: [...(list?.querySelectorAll('li') || [])].map(element => ({ name: element.querySelector(':scope > span:first-child')?.textContent, text: element.textContent, visibleText: element.innerText, metadata: element.querySelector(':scope > span:nth-child(2)')?.textContent, labelBounds: bounds(element.querySelector(':scope > span:first-child')), attributes: attributes(element), visualCurrent: element.classList.contains('bg-accent'), bounds: bounds(element) })),
          page: { x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth }, guessesLeft: Number(root.textContent.match(/Guesses left:\s*(\d+)/)?.[1]), correctCount: Number(root.textContent.match(/Correct:\s*(\d+)\/9/)?.[1]),
          cells: [...root.querySelectorAll('[data-grid-cell-status]')].map(element => ({ status: element.getAttribute('data-grid-cell-status'), text: element.textContent })), daily: Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('soccer-grid-daily-'))),
          stores: { local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }, telemetry: window.__gridA11y };
      }), 5000);
      const snapshot = async (phase, expected) => {
        await settle(phase); const dom = await read(); row.observations.push({ phase, ...dom }); save();
        assert.equal(dom.query, expected.query); assert.equal(dom.guessesLeft, 15); assert.equal(dom.correctCount, 0);
        assert.deepEqual(dom.daily, {}); assert(dom.cells.every(cell => cell.status === 'empty'));
        assert.deepEqual(dom.stores, row.storesBefore); assert.equal(dom.telemetry.randomCalls, row.randomCallsBefore);
        if (expected.focused !== undefined) assert.equal(dom.focused, expected.focused);
        if (!expected.absent) { assert.equal(dom.disabled, expected.disabled ?? false); assert.deepEqual(dom.options.map(option => option.name), expected.open ? [spec.canonical] : []); }
        const document = await send('DOM.getDocument', { depth: 0 }), bindings = [];
        for (const [kind, selector] of [['input', 'input[aria-label="Search for a player"]'], ['list', 'form:has(input[aria-label="Search for a player"]) ul']]) {
          const selected = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector });
          if (selected.nodeId) { const description = await send('DOM.describeNode', { nodeId: selected.nodeId }), partialAX = await send('Accessibility.getPartialAXTree', { backendNodeId: description.node.backendNodeId, fetchRelatives: true }); bindings.push({ kind, selector, selected, description, partialAX }); }
        }
        const selectedOptions = await send('DOM.querySelectorAll', { nodeId: document.root.nodeId, selector: 'form:has(input[aria-label="Search for a player"]) ul > li' });
        for (const nodeId of selectedOptions.nodeIds) { const description = await send('DOM.describeNode', { nodeId }), partialAX = await send('Accessibility.getPartialAXTree', { backendNodeId: description.node.backendNodeId, fetchRelatives: true }); bindings.push({ kind: 'option', description, partialAX }); }
        const fullAX = await send('Accessibility.getFullAXTree'), raw = { phase, dom, document, bindings, selectedOptions, fullAX };
        const file = spec.id + '-' + phase + '-ax.json', body = Buffer.from(JSON.stringify(raw, null, 2)); fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
        const receipt = { phase, file, bytes: body.length, sha256: hash(body), query: dom.query, inputBackendNodeId: null, listBackendNodeId: null, optionBackendNodeIds: [] }; row.axSnapshots.push(receipt); save();
        const bind = kind => bindings.filter(value => value.kind === kind);
        const node = binding => { const found = fullAX.nodes.filter(value => !value.ignored && value.backendDOMNodeId === binding.description.node.backendNodeId); assert.equal(found.length, 1, 'One actual nonignored AX backend target'); return found[0]; };
        if (expected.absent) { assert.equal(bind('input').length, 0); assert.equal(bind('list').length, 0); assert.equal(bind('option').length, 0); return dom; }
        assert.equal(bind('input').length, 1); const input = node(bind('input')[0]); receipt.inputBackendNodeId = bind('input')[0].description.node.backendNodeId; receipt.inputAX = input;
        assert.equal(input.role?.value, 'combobox'); assert.equal(input.name?.value, 'Search for a player'); assert.equal(input.value?.value ?? '', dom.query);
        assert.equal(dom.input.attributes.role, 'combobox'); assert.equal(dom.input.attributes['aria-autocomplete'], 'list'); assert.equal(property(input, 'autocomplete')?.value, 'list');
        assert.equal(dom.input.attributes['aria-expanded'], String(!!expected.open)); assert.equal(property(input, 'expanded')?.value, !!expected.open);
        if (dom.focused) assert.equal(property(input, 'focused')?.value, true); if (expected.disabled) { assert.equal(property(input, 'disabled')?.value, true); assert.equal(dom.submitDisabled, true); }
        if (expected.open) {
          assert.equal(bind('list').length, 1); assert.equal(bind('option').length, 1); const list = node(bind('list')[0]), option = node(bind('option')[0]);
          receipt.listBackendNodeId = bind('list')[0].description.node.backendNodeId; receipt.optionBackendNodeIds = [bind('option')[0].description.node.backendNodeId]; receipt.listAX = list; receipt.optionAX = option;
          assert.equal(list.role?.value, 'listbox'); assert.equal(list.name?.value, 'Player suggestions'); assert.equal(option.role?.value, 'option'); assert.equal(squish(option.name?.value), squish(dom.options[0].visibleText));
          assert.equal(dom.options[0].name, spec.canonical); assert.equal(dom.options[0].visualCurrent, true); assert.equal(dom.options[0].attributes['aria-selected'], 'true'); assert.equal(property(option, 'selected')?.value, true);
          assert.equal(dom.input.attributes['aria-controls'], dom.list.attributes.id); assert.equal(dom.input.attributes['aria-activedescendant'], dom.options[0].attributes.id);
          assert.equal(relation(input, 'controls').length, 1); assert.equal(relation(input, 'controls')[0].backendDOMNodeId, receipt.listBackendNodeId);
          assert.equal(relation(input, 'activedescendant').length, 1); assert.equal(relation(input, 'activedescendant')[0].backendDOMNodeId, receipt.optionBackendNodeIds[0]);
          const label = dom.options[0].labelBounds, clip = dom.list.client; assert(label && label.width > 0 && label.height > 0);
          assert(label.x >= Math.max(0, clip.x) - 0.5 && label.y >= Math.max(0, clip.y) - 0.5 && label.x + label.width <= Math.min(dom.page.width, clip.x + clip.width) + 0.5 && label.y + label.height <= Math.min(dom.page.height, clip.y + clip.height) + 0.5, 'Actual complete catalog label is visible before callback purpose credit');
        } else { assert.equal(bind('list').length, 0); assert.equal(bind('option').length, 0); assert.equal(dom.input.attributes['aria-controls'], undefined); assert.equal(dom.input.attributes['aria-activedescendant'], undefined); assert.equal(relation(input, 'controls').length, 0); assert.equal(relation(input, 'activedescendant').length, 0); }
        row.axChecks.push({ phase, inputBackendNodeId: receipt.inputBackendNodeId, passed: true }); save(); return dom;
      };
      const position = async (locator, label) => { const before = await page.evaluate(() => ({ x: scrollX, y: scrollY })); await bounded(row, label, () => locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))); await settle(label); row.actions.push({ action: label, kind: 'explicit native DOM position preparation', before, after: await page.evaluate(() => ({ x: scrollX, y: scrollY })), bounds: await locator.boundingBox() }); };
      const activate = async (locator, label) => { const bounds = await locator.boundingBox(); assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= spec.width + 1 && bounds.y + bounds.height <= 844); if (row.touch) await bounded(row, label, () => page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)); else { await bounded(row, label + ' native focus', () => locator.focus()); await bounded(row, label + ' Enter', () => page.keyboard.press('Enter')); } row.actions.push({ action: label, kind: row.touch ? 'native touch' : 'native keyboard Enter', bounds }); };
      const key = async value => { await bounded(row, 'native key ' + value, () => page.keyboard.press(value)); row.actions.push({ action: 'native key', key: value }); };
      const type = async value => { assert.equal(await field.count(), 1); assert.equal(await field.evaluate(element => document.activeElement === element), true); await key('ControlOrMeta+A'); await key('Backspace'); if (value) await bounded(row, 'native exact query text', () => page.keyboard.insertText(value)); await settle('native query ' + value); assert.equal(await field.inputValue(), value); row.actions.push({ action: 'native query input', value }); };
      const screenshot = async label => { const dom = await read(); assert(dom.page.documentWidth <= spec.width + 2); for (const bounds of [dom.input?.bounds, dom.list?.bounds].filter(Boolean)) assert(bounds.x >= -1 && bounds.y >= 0 && bounds.x + bounds.width <= spec.width + 1 && bounds.y + bounds.height <= 845); for (const fullPage of [false, true]) { const file = spec.id + '-' + label + (fullPage ? '-full.png' : '-viewport.png'); await bounded(row, 'capture ' + file, () => page.screenshot({ path: path.join(out, file), fullPage, animations: 'allow', timeout: 10000 })); const body = fs.readFileSync(path.join(out, file)); row.screenshots.push({ file, bytes: body.length, sha256: hash(body) }); } save(); };
      await bounded(row, 'navigate actual Grid route', () => page.goto(base + '/soccer-grid', { waitUntil: 'domcontentloaded' }), 30000);
      await poll(row, 'actual fixture board and SDK-consumed complete player pool', read, value => value.cells.length === 9 && ['soccer_grid_puzzles', 'career_players', 'career_seasons'].every(table => row.fixtures.filter(item => item.table === table && item.delivered).length === 1 && value.telemetry.transport.some(item => new URL(item.url).pathname === '/rest/v1/' + table && item.responseResolved && item.bodyConsumed)));
      await bounded(row, 'actual requested fonts ready', () => page.evaluate(() => document.fonts.ready)); await settle('actual route ready');
      row.preApp = await page.evaluate(() => window.__gridA11y.preApp); assert.equal(row.preApp.origin, base); assert.equal(row.preApp.readyState, 'loading'); assert.deepEqual(row.preApp.stores, { local: Object.fromEntries([...storageFixture.entries].sort()), session: {} });
      row.cookiesAfterFixture = await context.cookies(); assert.deepEqual(row.cookiesAfterFixture, []);
      row.actualDocument = await page.evaluate(() => ({ url: location.href, characterSet: document.characterSet, language: navigator.language, viewport: document.querySelector('meta[name="viewport"]')?.content })); assert.equal(row.actualDocument.url, base + '/soccer-grid'); assert.equal(row.actualDocument.characterSet, 'UTF-8');
      assert.equal(await page.getByText('Fixture Club 1', { exact: true }).count(), 1); assert.equal(await page.getByText('Fixture Position 1', { exact: true }).count(), 1);
      await position(cells.first(), 'position actual empty cell0'); await activate(cells.first(), 'activate actual empty cell0'); await field.waitFor(); await position(form(), 'position actual Search');
      const initial = await read(); assert.equal(initial.query, ''); assert.equal(initial.focused, true); assert.equal(initial.guessesLeft, 15); assert.equal(initial.correctCount, 0); assert.deepEqual(initial.daily, {});
      row.storesBefore = initial.stores; row.randomCallsBefore = initial.telemetry.randomCalls;
      await type(spec.canonical); await key('ArrowDown'); await key('ArrowUp'); await snapshot('canonical-menu', { query: spec.canonical, focused: true, open: true }); await screenshot('canonical-menu');
      row.blur = { before: await page.evaluate(() => performance.now()) }; await key('Tab');
      assert.equal(await form().locator('button[type="submit"]').evaluate(element => document.activeElement === element), true, 'One-option nonoverflow menu leaves actual Submit as the native Tab target');
      await wall(180); row.blur.after = await page.evaluate(() => performance.now()); assert(row.blur.after - row.blur.before >= 150);
      await snapshot('expired-blur', { query: spec.canonical, focused: false, open: false });
      await key('Shift+Tab'); await snapshot('canonical-refocused', { query: spec.canonical, focused: true, open: true });
      await type(spec.query); await snapshot('alternate-query', { query: spec.query, focused: true, open: !legacy }); await screenshot('alternate-query');
      await key('Enter'); await poll(row, 'exact one real parent validator pending', async () => pending.has('validator'), Boolean);
      await snapshot('validator-held', { query: '', disabled: true, open: false }); await screenshot('validator-held');
      assert.equal(row.invokes.length, 1); assert.deepEqual(row.invokes[0].body, { playerName: legacy ? spec.query : spec.canonical, rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' });
      const check = { phase: 'actual-parent-validator-held', purpose: 'Actual submitted playerName retains the exact catalog spelling after alternate-apostrophe query', canonicalName: spec.canonical, typedQuery: spec.query, actualPlayerName: row.invokes[0].body.playerName, passed: row.invokes[0].body.playerName === spec.canonical, expectedFailure: legacy };
      row.callbackChecks.push(check); save(); assert.equal(check.passed, !check.expectedFailure, 'Only the precise actual canonical callback outcome is admitted');
      await release('validator'); await poll(row, 'actual unverified parent completion', read, value => value.query === null && value.guessesLeft === 15 && value.correctCount === 0);
      await snapshot('unverified-board', { query: null, absent: true }); await position(cells.first(), 'position unchanged empty cell0 after unverified'); await screenshot('unverified-board');
      await activate(cells.first(), 'reopen actual unchanged empty cell0'); await field.waitFor(); await position(form(), 'position actual blank retry'); await snapshot('blank-retry', { query: '', focused: true, open: false }); await screenshot('blank-retry');
      const final = await read(); row.storesAfter = final.stores; row.randomCallsAfter = final.telemetry.randomCalls; row.events = final.telemetry.events; row.transport = final.telemetry.transport;
      assert.deepEqual(row.storesAfter, row.storesBefore); assert.equal(row.randomCallsAfter, row.randomCallsBefore); assert.deepEqual(final.telemetry.rejections, []);
      assert.equal(row.invokes.length, 1); assert.equal(row.counts.length, 0); assert.equal(row.headResponses.length, 0); assert(row.invokes[0].fulfilled);
      for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Shift']) assert(row.events.some(event => event.type === 'keydown' && event.trusted && event.key === key), 'Genuine native key: ' + key);
      for (const value of [spec.canonical, spec.query]) assert(row.events.some(event => event.type === 'input' && event.trusted && event.value === value), 'Actual trusted input exact quote spelling');
      assert(row.events.some(event => event.type === 'blur' && event.trusted && event.eventTargetTag === 'INPUT')); assert(row.events.some(event => event.type === 'click' && event.trusted));
      if (row.touch) assert(row.events.some(event => event.type === 'touchstart' && event.trusted), 'Native phone touch retained');
      assert.equal(row.axSnapshots.length, 7); assert.equal(row.screenshots.length, 10); assert.equal(row.callbackChecks.length, 1); assert.equal(pending.size, 0);
      await bounded(row, 'response observers before outcome assertions', () => Promise.all(responses), 30000);
      for (const request of row.requests.filter(item => new URL(item.url).origin !== base)) assert.equal(row.externalFulfilled.filter(item => item.requestId === request.id).length, 1, 'Every external request locally fulfilled exactly once');
      assert(row.requests.every(request => request.terminal === 'finished')); assert.equal(row.requests.filter(request => request.method === 'GET' && request.resourceType === 'document' && new URL(request.url).origin === base).length, 1);
      assert.deepEqual(row.errors, []); assert.deepEqual(row.unexpectedWrites, []); assert.deepEqual(row.diagnostics, []);
      row.healthyDelivery = true; row.originalFault = legacy; row.status = 'passed'; save();
    } catch (error) { row.error = String(error?.stack ?? error); save(); if (page) { try { const file = spec.id + '-failure.png'; await page.screenshot({ path: path.join(out, file), timeout: 10000 }); const body = fs.readFileSync(path.join(out, file)); row.screenshots.push({ file, bytes: body.length, sha256: hash(body) }); } catch (captureError) { row.errors.push('Screenshot: ' + String(captureError)); } } }
    finally {
      row.pendingBeforeCleanup = { fixtures: pending.size, routes: pendingRoutes.size, observers: row.responseObservers.filter(observer => observer.status === 'pending').length }; save();
      for (const name of [...pending.keys()]) { try { await bounded(row, 'release pending fixture ' + name, () => release(name)); } catch (error) { row.errors.push('Pending fixture cleanup: ' + String(error)); } }
      try { await bounded(row, 'response observers before cleanup', () => Promise.all(responses), 30000); } catch (error) { row.errors.push('Response cleanup: ' + String(error)); }
      if (cdp) try { await bounded(row, 'detach actual CDP session', () => cdp.detach(), 10000); row.lifecycle.cdpDetached = true; } catch (error) { row.errors.push('CDP cleanup: ' + String(error)); }
      if (context) try { await bounded(row, 'close actual context', () => context.close(), 20000); row.lifecycle.contextClosed = true; row.lifecycle.contextClosedAtUtc = new Date().toISOString(); } catch (error) { row.errors.push('Context cleanup: ' + String(error)); }
      if (browser) try { await bounded(row, 'close actual Chromium process', () => browser.close(), 20000); row.lifecycle.browserClosed = true; row.lifecycle.browserClosedAtUtc = new Date().toISOString(); row.lifecycle.browserConnectedAfterClose = browser.isConnected(); assert.equal(row.lifecycle.browserConnectedAfterClose, false); } catch (error) { row.errors.push('Browser cleanup: ' + String(error)); }
      try { await bounded(row, 'response observers after cleanup', () => Promise.all(responses), 30000); } catch (error) { row.errors.push('Late response cleanup: ' + String(error)); }
      row.pendingAfterCleanup = { fixtures: pending.size, routes: pendingRoutes.size, observers: row.responseObservers.filter(observer => observer.status === 'pending').length, requests: row.requests.filter(request => request.terminal !== 'finished').length };
      if (row.errors.length || row.unexpectedWrites.length || Object.values(row.pendingAfterCleanup).some(Boolean) || !row.lifecycle.contextClosed || !row.lifecycle.browserClosed || !row.lifecycle.cdpDetached) { row.status = 'failed'; row.error ||= 'Late actual IO, CDP or browser lifetime failure'; } save();
    }
  }
} finally {
  report.sourceAfter = Object.fromEntries(sourceFiles.map(file => [file, hash(fs.readFileSync(file))])); report.distAfter = inventory(path.resolve('dist')); report.completedAtUtc = new Date().toISOString(); save();
  for (const bound of source) assert.equal(report.sourceAfter[bound.file], bound.actualSha256, 'Source held: ' + bound.file);
  assert.deepEqual(report.distAfter, report.distBefore, 'Entire completed physical dist membership, bytes and mtimes held'); assert(git(['status', '--porcelain=v1', '--untracked-files=all']).equals(sourceStatus), 'Complete Git source/untracked status held');
}
assert.equal(report.cases.length, specs.length); assert(report.cases.every(row => row.status === 'passed' && row.healthyDelivery && row.errors.length === 0 && row.responseObservers.every(observer => observer.status === 'passed')), 'Every actual native context reaches exact semantic outcomes and clean IO');
report.status = 'passed'; report.fixedBrowserPassed = mode === 'fixed' && ['normal', 'restored'].includes(arm); save();
console.log(JSON.stringify({ kind: 'soccer-grid-apostrophe-browser', mode, arm, contexts: report.cases.length, callbackFaults: report.cases.filter(row => row.originalFault).length, reportSha256: hash(fs.readFileSync(path.join(out, 'report.json'))), productQualified: false }));

}

await main();
