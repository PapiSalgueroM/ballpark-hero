/* Round 1432: actual Chromium AX relations on the built Soccer Grid route. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '../lib/playwrightLoader.mjs';
import { sourcePlan, sourceForArm } from './gridSearchAccessibility1432.mjs';

const base = 'http://127.0.0.1:4173', api = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const mode = process.env.GRID_SEARCH_A11Y_MODE, arm = process.env.GRID_SEARCH_A11Y_ARM || 'normal', evidenceRoot = process.env.GRID_SEARCH_A11Y_OUT;
const arms = ['normal', 'whole-original', 'role-control', 'active-control', 'selected-control', 'stale-active-control', 'restored'];
assert(['baseline', 'fixed'].includes(mode)); assert(arms.includes(arm)); assert(mode === 'fixed' || arm === 'normal');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline preload inherited');
assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(process.cwd(), evidenceRoot).split(path.sep).includes('..'), 'External evidence root');
const out = path.join(evidenceRoot, 'browser', arm); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const plan = sourcePlan(), originalSearch = git(['show', plan.base + ':' + plan.file]).toString('utf8');
const expectedSearch = mode === 'baseline' ? originalSearch : sourceForArm(originalSearch, arm);
assert.equal(typeof expectedSearch, 'string');
const sourceFiles = [plan.file, 'src/pages/SoccerGrid.tsx', 'src/components/soccer-grid/SoccerGridBoard.tsx', 'src/hooks/useSoccerGrid.ts', 'src/hooks/useDailyPuzzle.ts',
  'src/lib/fetchCareerPlayers.ts', 'src/lib/fetchAllRows.ts', 'src/lib/fetchSoccerGridPuzzles.ts', 'src/types/soccerGrid.ts', 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts',
  'src/lib/smartSearch.ts', 'src/lib/soccerGridDifficulty.ts', 'src/lib/gridRarity.ts', 'scripts/simSoccerGridLabels.mjs', 'scripts/simSoccerGridTiers.mjs'];
const source = sourceFiles.map((file, index) => { const original = git(['show', plan.base + ':' + file]), actual = fs.readFileSync(file); assert(actual.equals(index === 0 ? Buffer.from(expectedSearch) : original), 'Exact source arm: ' + file); return { file, originalSha256: hash(original), actualSha256: hash(actual) }; });
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
const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three', 'Fixture Late Four'];
const players = names.map((player_name, index) => ({ id: 'fixture-player-' + index, player_name, nationality: 'Fixture Nation', position: 'Fixture Position' }));
const seasons = [{ player_id: 'fixture-player-0', season: 'Fixture Season', club: 'Fixture Club', goals: 0, assists: 0, appearances: 0, market_value: 0, sort_order: 0 }];
const puzzle = { puzzle_id: 'fixture-grid-blur', rows_json: [1, 2, 3].map(index => ({ label: 'Fixture Club ' + index, type: 'club' })), cols_json: [1, 2, 3].map(index => ({ label: 'Fixture Position ' + index, type: 'position' })) };
const legacy = mode === 'baseline' || arm === 'whole-original';
const widths = ['normal', 'restored'].includes(arm) ? [320, 390, 1280] : [390];
const specs = widths.map(width => ({ id: String(width), width, query: 'fixture', canonical: names[1] }));
const report = { version: 1, mode, arm, base: plan.base, source, sourceSearchSha256: source[0].actualSha256, sourceStatusSha256: hash(sourceStatus), startedAtUtc: new Date().toISOString(), status: 'failed', productQualified: false,
  scope: 'Actual built Soccer Grid Page/Search/Board/hook/DailyPuzzle/career loaders and native Chromium accessibility tree. Four disclosed fictional names and one synthetic board. All external IO locally fulfilled. No spoken assistive-technology, full WCAG, real-player, adjudication, live-backend, no-scroll or release claim.',
  nativeMethod: { engine: 'chromium', packageVersion, coreSha256: hash(coreBody), browsersJsonSha256: hash(browsersBody), installedChromium, binaryRoot, publicExecutablePath, storageFixture, logAttribution: 'Parent DEBUG=pw:browser log binds each sequential launch ordinal to its actual command, PID, installed executable and clean exit. Public executable path is not asserted to be the launched headless-shell path.' },
  fixtures: { puzzle, players, seasons, validatorReply: { valid: false, unverified: true, reason: 'Synthetic no-penalty retry' } },
  expected: { contexts: specs.length, canonicalUnverifiedDeliveries: specs.length, faultGroups: legacy ? ['role', 'active', 'selected'] : arm.endsWith('-control') ? [arm.slice(0, -8)] : [] },
  census: specs, distBefore, distAfter: null, cases: [], cleanupErrors: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = async (row, label, run, timeoutMs = 15000) => { const receipt = { label, timeoutMs, status: 'pending' }; row.waits.push(receipt); save(); let timer;
  try { const value = await Promise.race([run(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded ' + timeoutMs + 'ms')), timeoutMs); })]); receipt.status = 'passed'; return value; }
  catch (error) { receipt.status = 'failed'; receipt.error = String(error?.stack ?? error); throw error; } finally { clearTimeout(timer); save(); }
};
const poll = async (label, read, predicate) => { for (let attempt = 0; attempt < 200; attempt++) { const value = await read(); if (predicate(value)) return value; await wall(20); } assert.fail('Setup/completion did not reach ' + label + '; no semantic fault credit'); };
const property = (node, name) => node?.properties?.find(item => item.name === name)?.value;
const relation = (node, name) => property(node, name)?.relatedNodes ?? [];
const squish = value => String(value ?? '').replace(/\s+/g, ' ').trim();
save();
try {
  for (const [index, spec] of specs.entries()) {
    const row = { ...spec, touch: spec.width < 600, nativeLaunchOrdinal: index + 1, status: 'failed', originalFault: false, healthyDelivery: false, requests: [], fixtures: [], invokes: [], counts: [], headResponses: [], finishedRequests: [], selections: [], readFixtures: [], externalFulfilled: [], localCssFixtures: [], diagnostics: [], unexpectedWrites: [], errors: [], assets: [], screenshots: [], waits: [], responseObservers: [], observations: [], actions: [], settles: [], axSnapshots: [], semanticChecks: [], faultGroups: [], lifecycle: { launched: false, contextCreated: false, pageCreated: false, cdpDetached: false, contextClosed: false, browserClosed: false } };
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
          if (request.method() === 'OPTIONS') { assert.equal(url.origin, api, 'Only the existing API has preflight'); return await fulfill('api-preflight', { status: 204, headers: cors(request), body: '' }); }
          if (fonts.has(url.href)) { assert.equal(request.method(), 'GET'); return await fulfill('verified-font-cache', { status: 200, headers: cors(request), ...fonts.get(url.href) }); }
          if (url.origin === api) {
            const select = url.searchParams.get('select'), order = url.searchParams.get('order');
            if (url.pathname === '/rest/v1/soccer_grid_puzzles' && request.method() === 'GET') {
              assert.equal(select, 'puzzle_id,rows_json,cols_json'); assert.equal(order, 'sort_order.asc');
              const fixture = { requestId: captured.id, table: 'soccer_grid_puzzles', delivered: false, reply: [puzzle] }; row.fixtures.push(fixture);
              await json('synthetic-puzzle', fixture.reply); fixture.delivered = true; return;
            }
            if (url.pathname === '/rest/v1/career_players' && request.method() === 'GET') {
              assert.equal(select, 'id,player_name,nationality,position'); assert.equal(order, 'player_name.asc');
              const fixture = { requestId: captured.id, table: 'career_players', delivered: false, reply: players }; row.fixtures.push(fixture);
              await json('fictional-career-players', fixture.reply); fixture.delivered = true; return;
            }
            if (url.pathname === '/rest/v1/career_seasons' && request.method() === 'GET') {
              assert.equal(select, 'player_id,season,club,goals,assists,appearances,market_value,sort_order'); assert.equal(order, 'player_id.asc,sort_order.asc');
              assert.equal(url.searchParams.get('offset'), '0'); assert.equal(url.searchParams.get('limit'), '1000');
              const fixture = { requestId: captured.id, table: 'career_seasons', held: false, delivered: false, reply: seasons }; row.fixtures.push(fixture);
              await json('fictional-short-seasons-page', fixture.reply); fixture.delivered = true; return;
            }
            if (url.pathname === '/rest/v1/live_scores' && request.method() === 'GET') {
              assert.equal(select, '*'); assert.equal(order, 'start_at.asc'); assert.equal(url.searchParams.get('limit'), '150');
              const times = url.searchParams.getAll('start_at'); assert.equal(times.length, 2); assert(times.some(value => value.startsWith('gte.') && Number.isFinite(Date.parse(value.slice(4))))); assert(times.some(value => value.startsWith('lte.') && Number.isFinite(Date.parse(value.slice(4)))));
              row.readFixtures.push({ requestId: captured.id, kind: 'existing-live-scores-read', intercepted: true }); return await json('empty-live-scores', []);
            }
            if (url.pathname === '/rest/v1/rpc/most_played_today' && request.method() === 'POST') {
              assert.equal(request.postData(), '{"p_min":3,"p_limit":3}'); row.readFixtures.push({ requestId: captured.id, kind: 'existing-most-played-read', body: request.postDataJSON(), intercepted: true }); return await json('empty-most-played', []);
            }
            if (url.pathname === '/functions/v1/soccer-grid-validate' && request.method() === 'POST') {
              assert.equal(row.invokes.length, 0, 'One actual canonical validation per context');
              const body = request.postDataJSON(); assert.deepEqual(body, { playerName: spec.canonical, rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' });
              const reply = { valid: false, unverified: true, reason: 'Synthetic no-penalty retry' };
              const invoke = { requestId: captured.id, body, rawBody: request.postData(), reply, intercepted: true, fulfilled: false }; row.invokes.push(invoke);
              return await hold('validator', async () => { await json('synthetic-validator-reply', reply); invoke.fulfilled = true; });
            }
            if (!['GET', 'HEAD'].includes(request.method())) row.unexpectedWrites.push(captured);
            assert.fail('Unknown application API request: ' + request.method() + ' ' + url.pathname);
          }
          if (request.method() !== 'GET') row.unexpectedWrites.push(captured);
          assert.equal(request.method(), 'GET', 'Unknown external writes are fatal');
          if (url.hostname === 'flagcdn.com' && request.resourceType() === 'image') return await fulfill('local-flag-image', { status: 200, headers: cors(request), contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' });
          if (url.hostname === 'www.googletagmanager.com' && request.resourceType() === 'script' && url.pathname === '/gtag/js') return await fulfill('disabled-analytics-script', { status: 200, headers: cors(request), contentType: 'application/javascript', body: '' });
          if (url.hostname === 'pagead2.googlesyndication.com' && request.resourceType() === 'script' && url.pathname.endsWith('/adsbygoogle.js')) return await fulfill('disabled-ad-script', { status: 200, headers: cors(request), contentType: 'application/javascript', body: '' });
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
      const read = () => page.evaluate(() => {
        const root = document.querySelector('#root'), input = root.querySelector('input[aria-label="Search for a player"]'), form = input?.closest('form'), list = form?.querySelector('ul');
        const bounds = element => { if (!element) return null; const r = element.getBoundingClientRect(), style = getComputedStyle(element); return { x: r.x, y: r.y, width: r.width, height: r.height, display: style.display, visibility: style.visibility, opacity: style.opacity }; };
        const attributes = element => element ? Object.fromEntries([...element.attributes].map(attribute => [attribute.name, attribute.value])) : null;
        return { query: input?.value ?? null, focused: !!input && document.activeElement === input, disabled: input?.disabled ?? null, submitDisabled: form?.querySelector('button[type="submit"]')?.disabled ?? null,
          input: input ? { attributes: attributes(input), bounds: bounds(input) } : null, list: list ? { attributes: attributes(list), bounds: bounds(list), client: { x: list.getBoundingClientRect().x + list.clientLeft, y: list.getBoundingClientRect().y + list.clientTop, width: list.clientWidth, height: list.clientHeight, scrollTop: list.scrollTop } } : null,
          options: [...(list?.querySelectorAll('li') || [])].map(element => ({ name: element.querySelector(':scope > span:first-child')?.textContent, text: element.textContent, visibleText: element.innerText, metadata: element.querySelector(':scope > span:nth-child(2)')?.textContent, labelBounds: bounds(element.querySelector(':scope > span:first-child')), attributes: attributes(element), visualCurrent: element.classList.contains('bg-accent'), bounds: bounds(element) })),
          page: { x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth }, guessesLeft: Number(root.textContent.match(/Guesses left:\s*(\d+)/)?.[1]), correctCount: Number(root.textContent.match(/Correct:\s*(\d+)\/9/)?.[1]),
          cells: [...root.querySelectorAll('[data-grid-cell-status]')].map(element => ({ status: element.getAttribute('data-grid-cell-status'), text: element.textContent })), daily: Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('soccer-grid-daily-'))),
          stores: { local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }, telemetry: window.__gridA11y };
      });
      const check = (phase, group, passed, purpose, expectedFailure) => { const record = { phase, group, passed: !!passed, expectedFailure: !!expectedFailure, purpose }; row.semanticChecks.push(record); if (!passed && !row.faultGroups.includes(group)) row.faultGroups.push(group); save(); assert.equal(record.passed, !record.expectedFailure, 'Exact semantic outcome: ' + phase + '/' + group + ': ' + purpose); };
      const snapshot = async (phase, expected) => {
        await settle(phase); const dom = await read(); row.observations.push({ phase, ...dom });
        assert.equal(dom.query, expected.query); if (expected.focused !== undefined) assert.equal(dom.focused, expected.focused); assert.equal(dom.disabled, expected.disabled ?? false);
        assert.equal(dom.guessesLeft, 15); assert.equal(dom.correctCount, 0); assert.deepEqual(dom.daily, {}); assert(dom.cells.every(cell => cell.status === 'empty'));
        assert.deepEqual(dom.options.map(option => option.name), expected.open ? names : []);
        if (expected.open) { assert.equal(dom.options.filter(option => option.visualCurrent).length, 1); assert.equal(dom.options.findIndex(option => option.visualCurrent), expected.current); assert.equal(dom.options[expected.current].name, names[expected.current]); for (const option of dom.options) { assert.equal(squish(option.metadata), 'Fixture Nation · Fixture Position'); assert(option.bounds.width > 0 && option.bounds.height > 0 && option.bounds.display !== 'none' && option.bounds.visibility === 'visible'); } }
        if (expected.open) {
          const label = dom.options[expected.current].labelBounds, clip = dom.list.client;
          assert(label && label.width > 0 && label.height > 0, 'Current canonical label has actual positive bounds');
          assert(label.x >= Math.max(0, clip.x) - 0.5 && label.y >= Math.max(0, clip.y) - 0.5
            && label.x + label.width <= Math.min(dom.page.width, clip.x + clip.width) + 0.5
            && label.y + label.height <= Math.min(dom.page.height, clip.y + clip.height) + 0.5,
          'Complete current canonical label fits the actual list client clip and physical page viewport before AX purpose credit');
        }
        const document = await send('DOM.getDocument', { depth: 0 }), bindings = [];
        const selectors = ['input[aria-label="Search for a player"]', 'form:has(input[aria-label="Search for a player"]) ul'];
        for (const [kind, selector] of [['input', selectors[0]], ['list', selectors[1]]]) { const selected = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector }); if (selected.nodeId) { const description = await send('DOM.describeNode', { nodeId: selected.nodeId }); const partialAX = await send('Accessibility.getPartialAXTree', { backendNodeId: description.node.backendNodeId, fetchRelatives: true }); bindings.push({ kind, selector, selected, description, partialAX }); } }
        const selectedOptions = await send('DOM.querySelectorAll', { nodeId: document.root.nodeId, selector: selectors[1] + ' > li' });
        for (const [optionIndex, nodeId] of selectedOptions.nodeIds.entries()) { const description = await send('DOM.describeNode', { nodeId }); const partialAX = await send('Accessibility.getPartialAXTree', { backendNodeId: description.node.backendNodeId, fetchRelatives: true }); bindings.push({ kind: 'option', index: optionIndex, description, partialAX }); }
        const fullAX = await send('Accessibility.getFullAXTree'), raw = { phase, dom, document, bindings, selectedOptions, fullAX };
        const file = spec.id + '-' + phase + '-ax.json', body = Buffer.from(JSON.stringify(raw, null, 2)); fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
        const receipt = { phase, file, bytes: body.length, sha256: hash(body), inputBackendNodeId: null, listBackendNodeId: null, optionBackendNodeIds: [], currentName: expected.open ? names[expected.current] : null, query: dom.query, focused: dom.focused, disabled: dom.disabled }; row.axSnapshots.push(receipt); save();
        const bound = kind => bindings.filter(item => item.kind === kind), nodeFor = binding => { const visible = fullAX.nodes.filter(node => node.backendDOMNodeId === binding.description.node.backendNodeId && !node.ignored); return visible.length || !legacy ? visible : binding.partialAX.nodes.filter(node => node.backendDOMNodeId === binding.description.node.backendNodeId); };
        assert.equal(bound('input').length, 1, 'Actual input exists independently of proposed combobox role'); const inputBinding = bound('input')[0], inputNodes = nodeFor(inputBinding); assert.equal(inputNodes.length, 1, 'One nonignored actual native input AX target');
        const inputNode = inputNodes[0]; assert.equal(inputNode.ignored, false, 'Actual focused input AX target is not ignored'); receipt.inputBackendNodeId = inputBinding.description.node.backendNodeId; receipt.inputAX = inputNode;
        assert.equal(inputNode.name?.value, 'Search for a player'); assert.equal(inputNode.value?.value ?? '', dom.query); assert(['textbox', 'combobox'].includes(inputNode.role?.value), 'Supported actual input AX role before purpose evaluation');
        if (dom.focused) assert.equal(property(inputNode, 'focused')?.value, true, 'Native AX target agrees with actual focused input');
        if (expected.disabled) assert.equal(property(inputNode, 'disabled')?.value, true, 'Native disabled state survives held actual callback');
        if (expected.open) {
          assert.equal(bound('list').length, 1); assert.equal(bound('option').length, names.length); const listBinding = bound('list')[0], listNodes = nodeFor(listBinding); assert.equal(listNodes.length, 1, 'Actual visible UL has one native AX node');
          const listNode = listNodes[0], optionBindings = bound('option'), optionNodes = optionBindings.map(binding => { const nodes = nodeFor(binding); assert.equal(nodes.length, 1, 'Every actual visible LI has one native AX node'); return nodes[0]; });
          receipt.listBackendNodeId = listBinding.description.node.backendNodeId; receipt.optionBackendNodeIds = optionBindings.map(binding => binding.description.node.backendNodeId); receipt.optionAX = optionNodes; receipt.listAX = listNode;
          const rolesPass = inputNode.role?.value === 'combobox' && dom.input.attributes.role === 'combobox' && dom.input.attributes['aria-autocomplete'] === 'list' && property(inputNode, 'autocomplete')?.value === 'list'
            && listNode.role?.value === 'listbox' && listNode.name?.value === 'Player suggestions' && optionNodes.every((node, i) => node.role?.value === 'option' && squish(node.name?.value) === squish(dom.options[i].visibleText));
          check(phase, 'role', rolesPass, 'Actual native input/list/options expose combobox/listbox/option roles, list autocomplete and complete visible option names', legacy || arm === 'role-control');
          const current = expected.current, currentId = dom.options[current].attributes.id, listId = dom.list.attributes.id;
          const activePass = dom.input.attributes['aria-expanded'] === 'true' && property(inputNode, 'expanded')?.value === true && !!listId && dom.input.attributes['aria-controls'] === listId
            && relation(inputNode, 'controls').length === 1 && relation(inputNode, 'controls')[0].backendDOMNodeId === receipt.listBackendNodeId
            && !!currentId && dom.input.attributes['aria-activedescendant'] === currentId && relation(inputNode, 'activedescendant').length === 1 && relation(inputNode, 'activedescendant')[0].backendDOMNodeId === receipt.optionBackendNodeIds[current];
          check(phase, 'active', activePass, 'Native controls and active descendant bind the exact rendered UL and visually current canonical LI backend IDs', legacy || arm === 'active-control');
          const selectedPass = dom.options.every((option, i) => option.attributes['aria-selected'] === String(i === current) && property(optionNodes[i], 'selected')?.value === (i === current));
          check(phase, 'selected', selectedPass, 'Only the visually current canonical option is selected in the actual DOM and native AX tree', legacy || arm === 'selected-control');
        } else {
          assert.equal(bound('list').length, 0); assert.equal(bound('option').length, 0);
          const dangling = dom.input.attributes['aria-activedescendant'] ?? null, controls = dom.input.attributes['aria-controls'] ?? null;
          const cleared = dangling === null && controls === null && relation(inputNode, 'activedescendant').length === 0 && relation(inputNode, 'controls').length === 0;
          check(phase, 'stale-active', cleared, 'A collapsed popup leaves no DOM ID reference or AX controls/active relation; Chromium pruning a dangling ID is recorded, not credited as a valid DOM reference', arm === 'stale-active-control' && ['escape-collapsed', 'expired-blur'].includes(phase));
          if (!legacy) assert.equal(dom.input.attributes['aria-expanded'], 'false');
        }
        save(); return dom;
      };
      const position = async (locator, label) => { const before = await page.evaluate(() => ({ x: scrollX, y: scrollY })); await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })); await settle(label); row.actions.push({ action: label, kind: 'explicit position preparation', before, after: await page.evaluate(() => ({ x: scrollX, y: scrollY })), bounds: await locator.boundingBox() }); };
      const activate = async (locator, label) => { const bounds = await locator.boundingBox(); assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= spec.width + 1 && bounds.y + bounds.height <= 844); if (row.touch) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); else { await locator.focus(); await page.keyboard.press('Enter'); } row.actions.push({ action: label, kind: row.touch ? 'native touch' : 'native keyboard Enter', bounds }); };
      const type = async value => { assert.equal(await field.count(), 1); const bounds = await field.boundingBox(); assert(bounds); if (row.touch) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); else await field.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace'); if (value) await page.keyboard.insertText(value); await settle('native query ' + (value || 'empty')); assert.equal(await field.inputValue(), value); row.actions.push({ action: 'native query input', value, kind: row.touch ? 'native touch focus and text input' : 'native keyboard text input' }); };
      const key = async value => { await bounded(row, 'native key ' + value, () => page.keyboard.press(value)); row.actions.push({ action: 'native key', key: value }); };
      const screenshot = async label => { const value = await read(); assert(value.page.documentWidth <= spec.width + 2, 'Readable physical viewport'); for (const bounds of [value.input?.bounds, value.list?.bounds].filter(Boolean)) assert(bounds.x >= -1 && bounds.y >= 0 && bounds.x + bounds.width <= spec.width + 1 && bounds.y + bounds.height <= 845, 'Actual input/popup fits screenshot viewport'); for (const fullPage of [false, true]) { const file = spec.id + '-' + label + (fullPage ? '-full.png' : '-viewport.png'); await bounded(row, 'capture ' + file, () => page.screenshot({ path: path.join(out, file), fullPage, animations: 'allow', timeout: 10000 })); const body = fs.readFileSync(path.join(out, file)); row.screenshots.push({ file, bytes: body.length, sha256: hash(body) }); } save(); };
      await bounded(row, 'navigate actual Grid route', () => page.goto(base + '/soccer-grid', { waitUntil: 'domcontentloaded' }), 30000);
      await poll('actual authored board and complete consumed pool', read, value => value.cells.length === 9 && ['soccer_grid_puzzles', 'career_players', 'career_seasons'].every(table => row.fixtures.filter(item => item.table === table && item.delivered).length === 1 && value.telemetry.transport.some(item => new URL(item.url).pathname === '/rest/v1/' + table && item.responseResolved && item.bodyConsumed)));
      await bounded(row, 'actual requested fonts ready', () => page.evaluate(() => document.fonts.ready), 15000); await settle('actual route ready');
      row.preApp = await page.evaluate(() => window.__gridA11y.preApp); assert.equal(row.preApp.origin, base); assert.equal(row.preApp.readyState, 'loading'); assert.deepEqual(row.preApp.stores, { local: Object.fromEntries([...storageFixture.entries].sort()), session: {} });
      row.cookiesAfterFixture = await context.cookies(); assert.deepEqual(row.cookiesAfterFixture, []);
      row.actualDocument = await page.evaluate(() => ({ url: location.href, characterSet: document.characterSet, language: navigator.language, viewport: document.querySelector('meta[name="viewport"]')?.content })); assert.equal(row.actualDocument.url, base + '/soccer-grid'); assert.equal(row.actualDocument.characterSet, 'UTF-8');
      assert.equal(await page.getByText('Fixture Club 1', { exact: true }).count(), 1); assert.equal(await page.getByText('Fixture Position 1', { exact: true }).count(), 1);
      await position(cells.first(), 'position actual cell0'); await activate(cells.first(), 'open actual cell0'); await field.waitFor(); await position(form(), 'position actual input and future menu');
      const initial = await read(); row.storesBefore = initial.stores; row.randomCallsBefore = initial.telemetry.randomCalls; assert.equal(initial.guessesLeft, 15); assert.equal(initial.correctCount, 0); assert.deepEqual(initial.daily, {}); assert(initial.focused);
      await type(spec.query); await key('ArrowDown'); await settle('native arrow health before semantic purposes');
      const healthyArrow = await read(); assert.equal(healthyArrow.focused, true); assert.deepEqual(healthyArrow.options.map(option => option.name), names);
      assert.equal(healthyArrow.options.findIndex(option => option.visualCurrent), 1); assert.equal(healthyArrow.options[1].name, spec.canonical);
      const healthyLabel = healthyArrow.options[1].labelBounds, healthyClip = healthyArrow.list.client;
      assert(healthyLabel.x >= Math.max(0, healthyClip.x) - 0.5 && healthyLabel.y >= Math.max(0, healthyClip.y) - 0.5
        && healthyLabel.x + healthyLabel.width <= Math.min(healthyArrow.page.width, healthyClip.x + healthyClip.width) + 0.5
        && healthyLabel.y + healthyLabel.height <= Math.min(healthyArrow.page.height, healthyClip.y + healthyClip.height) + 0.5, 'Actual native arrow exposes the complete canonical label before semantic purpose evaluation');
      row.observations.push({ phase: 'pre-purpose-native-arrow-health', ...healthyArrow }); await key('ArrowUp');
      await snapshot('open-first', { query: spec.query, focused: true, open: true, current: 0 }); await screenshot('open-first');
      await key('ArrowDown'); await snapshot('arrow-down', { query: spec.query, focused: true, open: true, current: 1 }); await screenshot('arrow-down');
      await key('Escape'); await snapshot('escape-collapsed', { query: spec.query, focused: true, open: false }); await screenshot('escape-collapsed');
      await type(''); await snapshot('query-cleared', { query: '', focused: true, open: false });
      await type('fixture zz no match'); await snapshot('no-results', { query: 'fixture zz no match', focused: true, open: false });
      await type(spec.query); await snapshot('before-normal-blur', { query: spec.query, focused: true, open: true, current: 0 });
      row.blurTransition = { version: 1, scope: 'Strict native Tab preparation, no semantic-purpose credit', beforeBindings: row.axSnapshots.find(value => value.phase === 'before-normal-blur'), steps: [], nativeTabCount: 0 };
      const focusState = label => bounded(row, 'actual native blur target ' + label, () => page.evaluate(() => {
        const input = document.querySelector('input[aria-label="Search for a player"]'), form = input?.closest('form'), popup = form?.querySelector('ul'), submit = form?.querySelector('button[type="submit"]'), active = document.activeElement;
        const popupStyle = popup ? getComputedStyle(popup) : null;
        const isSubmit = !!submit && active === submit && submit.closest('form') === form;
        const isOwnedPopup = !!popup && active === popup && popup.tagName === 'UL' && popup.closest('form') === form;
        return { performanceNow: performance.now(), query: input?.value ?? null, inputFocused: active === input, submitEnabled: !!submit && !submit.disabled, isSubmit,
          isOwnedOverflowList: isOwnedPopup && popup.scrollHeight > popup.clientHeight && popupStyle.overflowY === 'auto',
          activeElement: active instanceof Element ? { tagName: active.tagName, id: active.id, role: active.getAttribute('role'), ariaLabel: active.getAttribute('aria-label'), text: active.textContent?.trim(), tabIndex: active.tabIndex } : null,
          popup: popup ? { nodeName: popup.tagName, id: popup.id, ownedByActualForm: popup.closest('form') === form, scrollHeight: popup.scrollHeight, clientHeight: popup.clientHeight, clientWidth: popup.clientWidth, scrollTop: popup.scrollTop, overflowY: popupStyle.overflowY } : null,
          events: window.__gridA11y.events };
      }), 5000);
      row.blurTransition.before = await focusState('before-first-Tab');
      assert.equal(row.blurTransition.before.inputFocused, true); assert.equal(row.blurTransition.before.submitEnabled, true); assert.equal(row.blurTransition.before.query, spec.query);
      const blurEventStart = row.blurTransition.before.events.length;
      await key('Tab'); row.blurTransition.nativeTabCount = 1;
      let tabTarget = await focusState('after-first-Tab'); row.blurTransition.steps.push({ tabOrdinal: 1, ...tabTarget, eventsSinceBefore: tabTarget.events.slice(blurEventStart) }); save();
      assert.equal(tabTarget.query, spec.query); assert.equal(tabTarget.inputFocused, false); assert.equal(tabTarget.submitEnabled, true);
      assert(tabTarget.isSubmit || tabTarget.isOwnedOverflowList, 'Native first Tab must reach actual Submit or the exact actual overflowing UL');
      if (tabTarget.isOwnedOverflowList) {
        assert.equal(tabTarget.activeElement.tagName, 'UL'); assert.equal(tabTarget.popup.ownedByActualForm, true); assert(tabTarget.popup.scrollHeight > tabTarget.popup.clientHeight); assert.equal(tabTarget.popup.overflowY, 'auto');
        assert(tabTarget.events.slice(blurEventStart).some(event => event.type === 'focus' && event.trusted && event.eventTargetTag === 'UL'), 'The actual overflowing UL receives trusted native focus');
        await key('Tab'); row.blurTransition.nativeTabCount = 2;
        tabTarget = await focusState('after-second-Tab'); row.blurTransition.steps.push({ tabOrdinal: 2, ...tabTarget, eventsSinceBefore: tabTarget.events.slice(blurEventStart) }); save();
      }
      assert.equal(tabTarget.isSubmit, true, 'Native Tab lands on actual Submit after at most the one real overflow-list stop'); assert.equal(tabTarget.inputFocused, false); assert.equal(tabTarget.submitEnabled, true); assert.equal(tabTarget.query, spec.query);
      row.blurTransition.events = tabTarget.events.slice(blurEventStart);
      const tabKeys = row.blurTransition.events.filter(event => event.type === 'keydown' && event.key === 'Tab');
      assert.equal(tabKeys.length, row.blurTransition.nativeTabCount); assert(tabKeys.every(event => event.trusted)); assert.equal(tabKeys[0].eventTargetTag, 'INPUT'); if (tabKeys.length === 2) assert.equal(tabKeys[1].eventTargetTag, 'UL');
      row.blurTransition.inputBlurEvents = row.blurTransition.events.filter(event => event.type === 'blur' && event.eventTargetTag === 'INPUT' && event.label === 'Search for a player');
      assert.equal(row.blurTransition.inputBlurEvents.length, 1); assert.equal(row.blurTransition.inputBlurEvents[0].trusted, true);
      assert(row.blurTransition.events.some(event => event.type === 'focus' && event.trusted && event.eventTargetTag === 'BUTTON' && event.label === 'Submit'), 'Actual Submit receives trusted native focus');
      const focusDocument = await send('DOM.getDocument', { depth: 0 }), focusSelection = await send('DOM.querySelector', { nodeId: focusDocument.root.nodeId, selector: 'form:has(input[aria-label="Search for a player"]) button[type="submit"]' });
      assert(focusSelection.nodeId > 0); const focusDescription = await send('DOM.describeNode', { nodeId: focusSelection.nodeId }), focusAX = await send('Accessibility.getPartialAXTree', { backendNodeId: focusDescription.node.backendNodeId, fetchRelatives: true });
      const submitAX = focusAX.nodes.filter(node => !node.ignored && node.backendDOMNodeId === focusDescription.node.backendNodeId); assert.equal(submitAX.length, 1); assert.equal(submitAX[0].role?.value, 'button'); assert.equal(submitAX[0].name?.value, 'Submit'); assert.equal(property(submitAX[0], 'focused')?.value, true, 'Native AX agrees with the final actual Submit focus');
      const focusRawFile = spec.id + '-native-blur-transition.json', focusRaw = Buffer.from(JSON.stringify({ transition: row.blurTransition, finalSubmit: { document: focusDocument, selection: focusSelection, description: focusDescription, partialAX: focusAX } }, null, 2));
      fs.writeFileSync(path.join(out, focusRawFile), focusRaw, { flag: 'wx' }); row.blurTransition.raw = { file: focusRawFile, bytes: focusRaw.length, sha256: hash(focusRaw), submitBackendNodeId: focusDescription.node.backendNodeId }; save();
      await wall(180); await snapshot('expired-blur', { query: spec.query, focused: false, open: false });
      await key('Shift+Tab'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowUp');
      await snapshot('canonical-current', { query: spec.query, focused: true, open: true, current: 1 }); await screenshot('canonical-current');
      await key('Enter'); await poll('one actual held canonical validator', async () => pending.has('validator'), Boolean);
      await snapshot('validator-held', { query: '', disabled: true, open: false }); await screenshot('validator-held');
      assert.equal(row.invokes.length, 1); assert.deepEqual(row.invokes[0].body, { playerName: spec.canonical, rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' });
      await release('validator'); await poll('actual unverified parent completion', read, value => value.query === null && value.guessesLeft === 15 && value.correctCount === 0);
      const completed = await read(); row.observations.push({ phase: 'canonical-unverified-completed', ...completed }); assert.deepEqual(completed.daily, {}); assert(completed.cells.every(cell => cell.status === 'empty')); assert(row.invokes[0].fulfilled); assert.deepEqual(row.counts, []); assert.deepEqual(row.headResponses, []);
      const completedDocument = await send('DOM.getDocument', { depth: 0 }), completedInput = await send('DOM.querySelector', { nodeId: completedDocument.root.nodeId, selector: 'input[aria-label="Search for a player"]' }), completedAX = await send('Accessibility.getFullAXTree');
      assert.equal(completedInput.nodeId, 0, 'Actual unverified completion unmounts Search');
      const completedAXFile = spec.id + '-unverified-board-ax.json', completedAXBody = Buffer.from(JSON.stringify({ phase: 'unverified-board', dom: completed, document: completedDocument, selectedInput: completedInput, fullAX: completedAX }, null, 2));
      fs.writeFileSync(path.join(out, completedAXFile), completedAXBody, { flag: 'wx' }); row.axSnapshots.push({ phase: 'unverified-board', file: completedAXFile, bytes: completedAXBody.length, sha256: hash(completedAXBody), inputBackendNodeId: null, listBackendNodeId: null, optionBackendNodeIds: [], currentName: null, query: null });
      await position(cells.first(), 'position unchanged empty cell0'); await screenshot('unverified-board');
      row.storesAfter = completed.stores; row.randomCallsAfter = completed.telemetry.randomCalls; row.events = completed.telemetry.events; row.transport = completed.telemetry.transport;
      assert.deepEqual(row.storesAfter, row.storesBefore, 'Complete stores stay identical after actual unverified canonical delivery'); assert.equal(row.randomCallsAfter, row.randomCallsBefore, 'Search journeys consume no additional native RNG calls'); assert.deepEqual(completed.telemetry.rejections, []);
      for (const value of ['ArrowDown', 'ArrowUp', 'Escape', 'Enter', 'Tab', 'Shift']) assert(row.events.some(event => event.type === 'keydown' && event.trusted && event.key === value), 'Trusted key observed: ' + value);
      assert(row.events.some(event => event.type === 'input' && event.trusted && event.value === spec.query)); assert(row.events.some(event => event.type === 'click' && event.trusted), 'Actual native cell activation recorded');
      assert.equal(row.invokes.length, 1); assert.equal(pending.size, 0); await bounded(row, 'response observers before outcome assertions', () => Promise.all(responses), 30000);
      for (const request of row.requests.filter(item => new URL(item.url).origin !== base)) assert.equal(row.externalFulfilled.filter(item => item.requestId === request.id).length, 1, 'Every external request locally fulfilled exactly once');
      assert(row.requests.every(request => request.terminal === 'finished'), 'Every actual request reaches requestfinished');
      assert.equal(row.requests.filter(request => request.method === 'GET' && request.resourceType === 'document' && new URL(request.url).origin === base).length, 1, 'One actual app document');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.unexpectedWrites, []); assert.deepEqual(row.diagnostics, []); assert.deepEqual([...row.faultGroups].sort(), [...report.expected.faultGroups].sort());
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
console.log(JSON.stringify({ kind: 'soccer-grid-search-accessibility-browser', mode, arm, contexts: report.cases.length, faultGroups: report.cases.map(row => ({ id: row.id, groups: row.faultGroups })), reportSha256: hash(fs.readFileSync(path.join(out, 'report.json'))), productQualified: false }));
