/* Round 1429: actual built parent, pool loader and native search discovery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { webkit } from '../lib/playwrightLoader.mjs';

const base = 'http://127.0.0.1:4173', api = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const mode = process.env.SOCCER_GRID_SEARCH_MODE, evidenceRoot = process.env.SOCCER_GRID_SEARCH_OUT;
const originalHead = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
assert(['baseline', 'fixed'].includes(mode));
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline preload inherited');
assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(process.cwd(), evidenceRoot).split(path.sep).includes('..'), 'External evidence root');
const out = path.join(evidenceRoot, 'browser'); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const files = ['src/components/soccer-grid/SoccerGridSearch.tsx', 'src/pages/SoccerGrid.tsx',
  'src/components/soccer-grid/SoccerGridBoard.tsx', 'src/hooks/useSoccerGrid.ts', 'src/hooks/useDailyPuzzle.ts',
  'src/lib/fetchCareerPlayers.ts', 'src/lib/fetchAllRows.ts', 'src/lib/fetchSoccerGridPuzzles.ts',
  'src/types/soccerGrid.ts', 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'src/lib/smartSearch.ts',
  'src/lib/soccerGridDifficulty.ts', 'src/lib/gridRarity.ts', 'scripts/simSoccerGridLabels.mjs', 'scripts/simSoccerGridTiers.mjs'];
const source = files.map((file, index) => {
  const original = git(['show', originalHead + ':' + file]), actual = fs.readFileSync(file);
  assert.equal(original.equals(actual), index === 0 ? mode === 'baseline' : true, file + ' has its declared source arm');
  return { file, originalSha256: hash(original), actualSha256: hash(actual) };
});
const sourceStatus = git(['status', '--porcelain=v1', '--untracked-files=all']);
const cacheRoot = process.env.FREE_KICK_FONT_CACHE; assert(cacheRoot && path.isAbsolute(cacheRoot));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(cacheRoot, 'manifest.json'))).map(row => {
  const body = fs.readFileSync(path.join(cacheRoot, row.file)); assert.equal(hash(body), row.sha256, row.url);
  return [row.url, { body, contentType: row.contentType }];
}));
const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three', 'Fixture Late Four'];
const players = names.map((player_name, index) => ({ id: 'fixture-player-' + index, player_name, nationality: 'Fixture Nation', position: 'Fixture Position' }));
const seasons = [{ player_id: 'fixture-player-0', season: 'Fixture Season', club: 'Fixture Club', goals: 0, assists: 0, appearances: 0, market_value: 0, sort_order: 0 }];
const puzzle = { puzzle_id: 'fixture-grid-discovery', rows_json: [1, 2, 3].map(index => ({ label: 'Fixture Club ' + index, type: 'club' })),
  cols_json: [1, 2, 3].map(index => ({ label: 'Fixture Position ' + index, type: 'position' })) };
const scenarios = [{ scenario: 'accent', query: 'fixture alex one', canonical: names[0] },
  { scenario: 'special-latin', query: 'fixture oren two', canonical: names[1] },
  { scenario: 'spacing', query: '  fixture   plain three  ', canonical: names[2] },
  { scenario: 'delayed-pool', query: 'Fixture Late', canonical: names[3] },
  { scenario: 'canonical-valid', query: names[0], canonical: names[0] },
  { scenario: 'manual-unverified', query: '  fixture missing entry  ', canonical: 'Fixture Missing Entry' }];
const specs = [390, 1280].flatMap(width => scenarios.map(spec => ({ ...spec, width, id: width + '-' + spec.scenario })));
const report = { version: 1, mode, originalHead, source, status: 'failed', productQualified: false, fixedBrowserPassed: false,
  scope: 'Actual built /soccer-grid Page/Search/hook/DailyPuzzle/career loader. Four fictional names and one authored synthetic board; all traffic locally fulfilled. No real-player, validator correctness, complete player-universe or live-data claim.',
  fixtures: { puzzle, players, seasons, counts: { totalBefore: 9, playerBefore: 1, expectedRarity: 20 } },
  setup: 'Fresh storage has no daily grid save. Only consent/rules dismissal and an unrelated held save are preloaded. Native positioning is recorded; no no-scroll claim. Transport instrumentation preserves fetch results and records actual SDK body consumption.',
  census: specs.map(({ id, width, scenario, query, canonical }) => ({ id, width, scenario, query, canonical, originalFaultExpected: !['canonical-valid', 'manual-unverified'].includes(scenario) })),
  expected: { contexts: 12, originalFaults: mode === 'baseline' ? 8 : 0, discoveryContexts: 8, healthyDeliveryContexts: 4 }, waits: [], cleanupErrors: [], cases: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = async (waits, label, run, timeoutMs = 15000) => {
  const receipt = { label, timeoutMs, status: 'pending' }; waits.push(receipt); save();
  let timer;
  try {
    const result = await Promise.race([run(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded ' + timeoutMs + 'ms')), timeoutMs); })]);
    receipt.status = 'passed'; return result;
  } catch (error) { receipt.status = 'failed'; receipt.error = String(error?.stack ?? error); throw error; }
  finally { clearTimeout(timer); save(); }
};
const poll = async (label, read, predicate) => {
  for (let attempt = 0; attempt < 200; attempt++) { const value = await read(); if (predicate(value)) return value; await wall(20); }
  assert.fail('Setup or completion did not reach ' + label + '; no original-fault credit');
};
const browser = await webkit.launch({ headless: true });
assert.equal(browser.version(), '27.2', 'Pinned WebKit fixture engine');
report.browserEngine = 'webkit'; report.browserVersion = browser.version();
try {
  for (const spec of specs) {
    const row = { id: spec.id, width: spec.width, scenario: spec.scenario, query: spec.query, canonical: spec.canonical, status: 'failed', originalFault: false,
      healthyDelivery: false, actions: [], observations: [], requests: [], fixtures: [], invokes: [], counts: [], headResponses: [], finishedRequests: [], selections: [], readFixtures: [], externalFulfilled: [], localCssFixtures: [], diagnostics: [], unexpectedWrites: [], errors: [], assets: [], screenshots: [], waits: [], responseObservers: [] };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width: spec.width, height: 844 }, deviceScaleFactor: 1, isMobile: spec.width === 390, hasTouch: spec.width === 390,
      locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: 'sg-rules-seen', value: '1' }, { name: 'rules-gate-seen:/soccer-grid', value: '1' },
        { name: 'grid-search-held-career', value: '{"held":"unrelated career"}' },
      ] }] } });
    const pending = new Map(), responses = [];
    let page;
    const observeResponse = (kind, response, read) => {
      const observer = { id: row.responseObservers.length, kind, url: response.url(), status: 'pending' }; row.responseObservers.push(observer); save();
      responses.push((async () => {
        try { await read(observer); observer.status = 'passed'; }
        catch (error) { observer.status = 'failed'; observer.error = String(error?.stack ?? error); row.errors.push(kind + ': ' + observer.error); }
        finally { save(); }
      })());
    };
    const cors = request => ({ 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,HEAD,POST,OPTIONS',
      'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,prefer,range,range-unit', 'access-control-expose-headers': 'content-range,date' });
    const release = async key => { assert(pending.has(key), 'An actual intercepted request is held: ' + key); await pending.get(key)(); };
    try {
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        const captured = { id: row.requests.length, url: url.href, method: request.method(), resourceType: request.resourceType() }; row.requests.push(captured);
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
              const fixture = { requestId: captured.id, table: 'career_seasons', held: spec.scenario === 'delayed-pool', delivered: false, reply: seasons }; row.fixtures.push(fixture);
              const finish = async () => { await json('fictional-short-seasons-page', fixture.reply); fixture.delivered = true; };
              if (fixture.held) return await hold('seasons', finish); return await finish();
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
              assert(['canonical-valid', 'manual-unverified'].includes(spec.scenario), 'Discovery observations never submit a name'); assert.equal(row.invokes.length, 0, 'One native validation per healthy context');
              const body = request.postDataJSON(); assert.deepEqual(body, { playerName: spec.canonical, rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' });
              const reply = spec.scenario === 'canonical-valid' ? { valid: true, fullName: spec.canonical } : { valid: false, unverified: true, reason: 'Synthetic no-penalty retry' };
              const invoke = { requestId: captured.id, body, rawBody: request.postData(), reply, intercepted: true, fulfilled: false }; row.invokes.push(invoke);
              return await hold('validator', async () => { await json('synthetic-validator-reply', reply); invoke.fulfilled = true; });
            }
            if (url.pathname === '/rest/v1/soccer_grid_selections' && request.method() === 'HEAD') {
              assert.equal(spec.scenario, 'canonical-valid'); assert.equal(row.invokes.length, 1); assert(row.invokes[0].fulfilled);
              assert.equal(select, '*'); assert.equal(url.searchParams.get('puzzle_id'), 'eq.' + puzzle.puzzle_id); assert.equal(url.searchParams.get('cell_index'), 'eq.0');
              assert(request.headers().prefer?.split(',').includes('count=exact'), 'Actual rarity count HEAD has Prefer count=exact');
              const index = row.counts.length; assert(index < 2); assert.equal(url.searchParams.get('player_name'), index === 0 ? null : 'eq.' + spec.canonical.toLowerCase());
              const count = index === 0 ? 9 : 1; row.counts.push({ requestId: captured.id, index, count, player: index === 0 ? null : spec.canonical.toLowerCase() });
              return await fulfill('synthetic-rarity-count', { status: 200, contentType: 'application/json',
                headers: { ...cors(request), 'content-range': '0-' + (count - 1) + '/' + count, 'content-length': '0' }, body: '' });
            }
            if (url.pathname === '/rest/v1/soccer_grid_selections' && request.method() === 'POST') {
              assert.equal(spec.scenario, 'canonical-valid'); assert.equal(row.counts.length, 2, 'Both crowd counts happen before the player insert'); assert.equal(row.selections.length, 0);
              const body = request.postDataJSON(); assert.deepEqual(body, { puzzle_id: puzzle.puzzle_id, cell_index: 0, player_name: spec.canonical.toLowerCase() });
              const selection = { requestId: captured.id, body, rawBody: request.postData(), intercepted: true, fulfilled: false }; row.selections.push(selection);
              await json('intercepted-synthetic-selection', [], 201); selection.fulfilled = true; return;
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
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); try { await route.abort('failed'); } catch (abortError) { row.errors.push('Route abort: ' + String(abortError)); } }
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.addInitScript(() => {
        window.__gridEvents = []; window.__gridTransport = [];
        const fetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const request = args[0], url = new URL(request instanceof Request ? request.url : String(request), location.href);
          const watched = url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co';
          const trace = watched ? { url: url.href, method: args[1]?.method || (request instanceof Request ? request.method : 'GET'), responseResolved: false, bodyConsumed: false } : null;
          if (trace) window.__gridTransport.push(trace);
          const response = await fetch(...args); if (trace) {
            trace.responseResolved = true;
            for (const method of ['text', 'json']) { const consume = response[method].bind(response); response[method] = async (...readArgs) => { const value = await consume(...readArgs); trace.bodyConsumed = true; trace.reader = method; return value; }; }
          }
          return response;
        };
        window.addEventListener('unhandledrejection', event => window.__gridEvents.push({ type: 'unhandledrejection', message: String(event.reason?.stack ?? event.reason) }));
        for (const type of ['input', 'keydown', 'mousedown', 'click', 'submit']) window.addEventListener(type, event => {
          const target = event.target instanceof Element ? event.target.closest('input,button,li,form') : null;
          if (target) window.__gridEvents.push({ type, trusted: event.isTrusted, key: event.key, label: target.getAttribute('aria-label') || target.textContent?.trim().slice(0, 160), value: target instanceof HTMLInputElement ? target.value : undefined });
        }, true);
      });
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push('Page: ' + error.message));
      page.on('console', message => { if (message.type() === 'error') row.errors.push('Console: ' + message.text()); });
      page.on('requestfailed', request => row.errors.push('Request: ' + request.url() + ' ' + JSON.stringify(request.failure())));
      page.on('requestfinished', request => row.finishedRequests.push({ url: request.url(), method: request.method() }));
      page.on('response', response => {
        if (response.request().method() === 'HEAD') {
          observeResponse('HEAD response', response, async observer => {
            const headers = response.headers();
            const receipt = { url: response.url(), status: response.status(), headers: { contentType: headers['content-type'], contentLength: headers['content-length'], contentRange: headers['content-range'] }, finished: false, finishError: null };
            row.headResponses.push(receipt); save(); assert.equal(response.status(), 200, 'Actual count HEAD keeps200');
            try {
              const error = await bounded(row.waits, 'HEAD response.finished observer ' + observer.id, () => response.finished());
              receipt.finishError = error ? String(error) : null; assert.equal(error, null, 'Actual count HEAD response finished'); receipt.finished = true;
            } catch (error) { receipt.observerError = String(error?.stack ?? error); throw error; }
            finally { save(); }
          });
        }
        if (new URL(response.url()).origin !== base) return;
        observeResponse('Response', response, async observer => {
          assert.equal(response.status(), 200, response.url()); const body = await response.body(), pathname = new URL(response.url()).pathname;
          const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
          const physical = path.resolve('dist', '.' + decodeURIComponent(relative)); assert(physical.startsWith(path.resolve('dist') + path.sep));
          const expected = fs.readFileSync(physical);
          if (hash(body) !== hash(expected)) {
            const file = spec.id + '-observer-' + observer.id + '-actual.bin'; fs.writeFileSync(path.join(out, file), body);
            row.diagnostics.push({ id: observer.id, url: response.url(), member: path.relative(path.resolve('dist'), physical).split(path.sep).join('/'), status: response.status(), headers: response.headers(), actualBytes: body.length, actualSha256: hash(body), expectedBytes: expected.length, expectedSha256: hash(expected), file }); save();
          }
          assert.equal(hash(body), hash(fs.readFileSync(physical)), 'Every local response matches completed physical dist');
          const asset = { path: pathname, bytes: body.length, sha256: hash(body) };
          if (pathname.endsWith('.css')) { const headers = response.headers(); asset.headers = { contentType: headers['content-type'], contentLength: headers['content-length'] }; }
          row.assets.push(asset);
        });
      });
      const field = page.getByRole('textbox', { name: 'Search for a player', exact: true });
      const cells = page.locator('#root [data-grid-cell-status]');
      const form = () => field.locator('xpath=ancestor::form');
      const settle = async () => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await wall(80); };
      const stores = () => page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }));
      const read = () => page.evaluate(() => {
        const root = document.querySelector('#root'), input = root.querySelector('input[aria-label="Search for a player"]'), form = input?.closest('form'), list = form?.querySelector('ul');
        const bounds = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        return { query: input?.value ?? null, focused: !!input && document.activeElement === input, disabled: input?.disabled ?? null,
          submitDisabled: form?.querySelector('button[type="submit"]')?.disabled ?? null, visibleNames: [...(list?.querySelectorAll('li > span:first-child') || [])].map(element => element.textContent),
          inputBounds: bounds(input), menuBounds: bounds(list), page: { x: scrollX, y: scrollY, width: innerWidth, documentWidth: document.documentElement.scrollWidth },
          cells: [...root.querySelectorAll('[data-grid-cell-status]')].map(element => ({ status: element.getAttribute('data-grid-cell-status'), text: element.textContent, title: element.querySelector('[title]')?.getAttribute('title') ?? null })),
          guessesLeft: Number(root.textContent.match(/Guesses left:\s*(\d+)/)?.[1]), correctCount: Number(root.textContent.match(/Correct:\s*(\d+)\/9/)?.[1]),
          daily: Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('soccer-grid-daily-'))), transport: window.__gridTransport };
      });
      const observe = async label => { const value = await read(); row.observations.push({ label, ...value }); return value; };
      const activate = async (locator, label) => {
        assert.equal(await locator.count(), 1, 'One native target: ' + label); const bounds = await locator.boundingBox();
        assert(bounds && bounds.x >= -1 && bounds.y >= 0 && bounds.x + bounds.width <= spec.width + 1 && bounds.y + bounds.height <= 844, 'Native target already fits viewport: ' + label);
        if (spec.width === 390) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        else { await locator.focus(); await page.keyboard.press('Enter'); }
        row.actions.push({ action: label, input: spec.width === 390 ? 'native touch' : 'keyboard Enter', bounds });
      };
      const position = async (locator, label) => {
        const before = await page.evaluate(() => ({ x: scrollX, y: scrollY })); await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })); await settle();
        row.actions.push({ action: label, input: 'explicit native DOM scrollIntoView preparation', before, after: await page.evaluate(() => ({ x: scrollX, y: scrollY })), bounds: await locator.boundingBox() });
      };
      const type = async value => {
        const bounds = await field.boundingBox(); assert(bounds); if (spec.width === 390) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); else await field.focus();
        await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.insertText(value); await settle();
        assert.equal(await field.inputValue(), value); assert(await field.evaluate(element => document.activeElement === element)); row.actions.push({ action: 'native query input', value, input: spec.width === 390 ? 'touch focus and native text input' : 'keyboard input' });
      };
      const delivered = async () => {
        await poll('all three actual pool/puzzle replies consumed', read, value => ['soccer_grid_puzzles', 'career_players', 'career_seasons'].every(table => {
          const fixtures = row.fixtures.filter(item => item.table === table); return fixtures.length === 1 && fixtures[0].delivered && value.transport.some(item => new URL(item.url).pathname === '/rest/v1/' + table && item.responseResolved && item.bodyConsumed);
        })); await settle();
      };
      const screenshot = async label => {
        const value = await observe(label); assert(value.page.documentWidth <= spec.width + 2, 'Readable viewport has no horizontal overflow');
        for (const bounds of [value.inputBounds, value.menuBounds].filter(Boolean)) assert(bounds.x >= -1 && bounds.y >= 0 && bounds.x + bounds.width <= spec.width + 1 && bounds.y + bounds.height <= 845, 'Current input/menu is readable inside the viewport');
        for (const fullPage of [false, true]) { const file = spec.id + '-' + label + (fullPage ? '-full.png' : '-viewport.png'); await page.screenshot({ path: path.join(out, file), fullPage, animations: 'disabled' }); row.screenshots.push(file); }
      };

      await page.goto(base + '/soccer-grid', { waitUntil: 'domcontentloaded' });
      await poll('actual synthetic board committed', async () => ({ cells: await cells.count(), row: await page.getByText('Fixture Club 1', { exact: true }).count(), col: await page.getByText('Fixture Position 1', { exact: true }).count() }), value => value.cells === 9 && value.row === 1 && value.col === 1);
      await page.evaluate(() => document.fonts.ready); await settle();
      if (spec.scenario !== 'delayed-pool') await delivered(); else await poll('actual seasons request held after player reply', async () => pending.has('seasons') && row.fixtures.some(item => item.table === 'career_players' && item.delivered), Boolean);
      await position(cells.first(), 'position actual empty cell'); await activate(cells.first(), 'open actual cell0'); await field.waitFor();
      await position(form(), 'position actual input and future menu'); assert(await field.evaluate(element => document.activeElement === element), 'Actual parent mounts the focused field');
      row.dateET = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()));
      row.storesBefore = await stores(); const initial = await observe('fresh-empty-puzzle'); assert.equal(initial.guessesLeft, 15); assert.equal(initial.correctCount, 0); assert.deepEqual(initial.daily, {}); assert(initial.cells.every(cell => cell.status === 'empty'));
      await type(spec.query);
      if (spec.scenario === 'delayed-pool') {
        const held = await observe('query-before-held-pool'); assert.deepEqual(held.visibleNames, []); assert.equal(held.query, spec.query); assert(held.focused);
        await screenshot('held-pool-query'); await release('seasons'); await delivered();
      }
      const observed = await observe('delivered-query-observation'); assert.equal(observed.query, spec.query); assert(observed.focused); assert.equal(observed.guessesLeft, 15); assert.deepEqual(observed.daily, {});
      const discovery = !['canonical-valid', 'manual-unverified'].includes(spec.scenario);
      if (discovery) {
        if (mode === 'baseline') assert.deepEqual(observed.visibleNames, [], 'Explicit original missing canonical suggestion after whole API consumption');
        else assert.deepEqual(observed.visibleNames, [spec.canonical], 'Fixed query exposes exact canonical spelling after whole API consumption');
        await screenshot('query-outcome');
        const recovery = spec.scenario === 'delayed-pool' ? 'Fixture Late F' : spec.canonical;
        await type(recovery); await poll('actual pool recovered through native query editing', read, value => value.visibleNames.length === 1 && value.visibleNames[0] === spec.canonical); await settle();
        const recovered = await observe('canonical-or-query-edit-recovery'); assert(recovered.focused); assert.equal(recovered.query, recovery); assert.equal(recovered.guessesLeft, 15);
        assert.equal(row.invokes.length, 0); assert.equal(row.counts.length, 0); assert.equal(row.selections.length, 0);
        row.originalFault = mode === 'baseline'; if (row.originalFault) row.fault = 'Delivered canonical suggestion absent beneath unchanged focused ' + spec.scenario + ' query; recovered through native query editing';
        await screenshot('recovered-menu');
      } else {
        if (spec.scenario === 'canonical-valid') {
          assert.deepEqual(observed.visibleNames, [spec.canonical]); await screenshot('canonical-menu');
          await page.keyboard.press('Escape'); await settle(); assert.deepEqual((await read()).visibleNames, [], 'Escape closes the visible canonical menu');
          await position(cells.first(), 'position same-cell native blur target'); await activate(cells.first(), 'native blur without changing selected cell0'); await wall(200);
          await position(form(), 'return to canonical input'); await type(spec.query); await poll('canonical menu after actual blur and focus', read, value => value.visibleNames[0] === spec.canonical);
          if (spec.width === 390) await activate(form().locator('ul li').first(), 'select actual canonical suggestion');
          else { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter'); row.actions.push({ action: 'select actual canonical suggestion', input: 'native ArrowDown ArrowUp Enter' }); }
        } else {
          assert.deepEqual(observed.visibleNames, []); await screenshot('manual-free-entry'); await activate(form().getByRole('button', { name: 'Submit', exact: true }), 'submit actual manual entry');
        }
        await poll('held actual validator request', async () => pending.has('validator'), Boolean);
        const busy = await observe('validator-held'); assert.equal(busy.disabled, true); assert.equal(busy.submitDisabled, true); assert.equal(busy.guessesLeft, 15); assert.equal(row.invokes.length, 1);
        await screenshot('validator-held'); await release('validator');
        await poll('actual validation and parent finally complete', read, value => value.query === null && value.correctCount === (spec.scenario === 'canonical-valid' ? 1 : 0)); await settle();
        const completed = await observe('native-submission-completed');
        assert(row.invokes[0].fulfilled); assert.equal(completed.guessesLeft, spec.scenario === 'canonical-valid' ? 14 : 15);
        if (spec.scenario === 'canonical-valid') {
          assert.equal(row.counts.length, 2); assert.equal(row.selections.length, 1); assert(row.selections[0].fulfilled);
          assert.equal(completed.cells[0].status, 'correct'); assert.equal(completed.cells[0].title, spec.canonical); assert(completed.cells[0].text.includes('20% picked this'));
          assert.deepEqual(Object.keys(completed.daily), ['soccer-grid-daily-' + row.dateET]);
          assert.deepEqual(JSON.parse(Object.values(completed.daily)[0]), { v: 1, date: row.dateET, puzzleIndex: 0, puzzleId: puzzle.puzzle_id, guesses: [{ t: 'ok', cellIndex: 0, playerName: spec.canonical, rarity: 20 }], gameStatus: 'playing' });
        } else { assert.equal(row.counts.length, 0); assert.equal(row.selections.length, 0); assert.deepEqual(completed.daily, {}); assert(completed.cells.every(cell => cell.status === 'empty')); }
        row.healthyDelivery = true;
        await position(cells.first(), 'position actual completed board cell0');
        const completedCellBounds = await cells.first().boundingBox();
        assert(completedCellBounds && completedCellBounds.x >= -1 && completedCellBounds.y >= 0
          && completedCellBounds.x + completedCellBounds.width <= spec.width + 1 && completedCellBounds.y + completedCellBounds.height <= 844,
        'Actual completed-board cell0 target fits the readable viewport');
        row.completedBoardTarget = { cellIndex: 0, bounds: completedCellBounds, status: await cells.first().getAttribute('data-grid-cell-status') };
        assert.equal(row.completedBoardTarget.status, spec.scenario === 'canonical-valid' ? 'correct' : 'empty');
        await screenshot('completed-board');
      }
      row.storesAfter = await stores(); const expectedStores = structuredClone(row.storesBefore);
      if (spec.scenario === 'canonical-valid') expectedStores.local['soccer-grid-daily-' + row.dateET] = (await read()).daily['soccer-grid-daily-' + row.dateET];
      assert.deepEqual(row.storesAfter, expectedStores, 'Complete stores change only by the one actual accepted daily guess');
      row.events = await page.evaluate(() => window.__gridEvents); row.transport = await page.evaluate(() => window.__gridTransport);
      assert(!row.events.some(event => event.type === 'unhandledrejection')); assert(row.events.some(event => event.type === 'input' && event.trusted && event.value === spec.query), 'Trusted native query input recorded');
      assert(row.events.some(event => event.type === 'click' && event.trusted), 'Trusted native cell/control action recorded');
      for (const request of row.requests.filter(item => new URL(item.url).origin !== base)) assert.equal(row.externalFulfilled.filter(item => item.requestId === request.id).length, 1, 'Every external request was fulfilled locally once');
      assert.equal(pending.size, 0); await bounded(row.waits, 'response observers before outcome assertions', () => Promise.all(responses), 30000);
      assert.equal(row.headResponses.length, spec.scenario === 'canonical-valid' ? 2 : 0);
      for (const receipt of row.headResponses) { assert(receipt.finished && receipt.finishError === null); assert.equal(row.finishedRequests.filter(request => request.method === 'HEAD' && request.url === receipt.url).length, 1, 'Every actual count HEAD emits requestfinished'); }
      assert.deepEqual(row.errors, []); assert.deepEqual(row.unexpectedWrites, []); assert.deepEqual(row.diagnostics, []);
      row.status = 'passed'; console.log(spec.id + ': actual parent discovery/delivery observations passed');
    } catch (error) {
      row.error = String(error?.stack ?? error); save();
      if (page) { const file = spec.id + '-failure.png'; try { await page.screenshot({ path: path.join(out, file), animations: 'disabled' }); row.screenshots.push(file); } catch (captureError) { row.errors.push('Screenshot: ' + String(captureError)); } }
    } finally {
      row.pendingBeforeCleanup = pending.size; row.pendingObserversBeforeCleanup = row.responseObservers.filter(observer => observer.status === 'pending').length; save();
      for (const key of [...pending.keys()]) { try { await bounded(row.waits, 'pending fixture cleanup ' + key, () => release(key)); } catch (error) { row.errors.push('Pending cleanup: ' + String(error?.stack ?? error)); } }
      row.pendingAfterCleanup = pending.size; save();
      try { await bounded(row.waits, 'context.close', () => context.close()); } catch (error) { row.errors.push('Context cleanup: ' + String(error?.stack ?? error)); }
      try { await bounded(row.waits, 'response observers after context cleanup', () => Promise.all(responses), 30000); } catch (error) { row.errors.push('Response cleanup: ' + String(error?.stack ?? error)); }
      row.pendingObserversAfterCleanup = row.responseObservers.filter(observer => observer.status === 'pending').length;
      if (row.pendingObserversAfterCleanup) row.errors.push('Response observers remain pending after cleanup: ' + row.pendingObserversAfterCleanup);
      if (row.status === 'passed' && (row.errors.length || row.pendingBeforeCleanup || row.pendingAfterCleanup)) { row.status = 'failed'; row.error = 'Late error, unfinished fixture delivery or unfinished response observer'; }
      save();
    }
  }
} finally {
  try { await bounded(report.waits, 'browser.close', () => browser.close()); } catch (error) { report.cleanupErrors.push(String(error?.stack ?? error)); }
  report.sourceAfter = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))])); save();
  for (const bound of source) assert.equal(report.sourceAfter[bound.file], bound.actualSha256, bound.file + ' remains held');
  assert.deepEqual(git(['status', '--porcelain=v1', '--untracked-files=all']), sourceStatus, 'Source and untracked status held'); save();
}
assert.deepEqual(report.cleanupErrors, [], 'Browser cleanup must finish without errors or timeout');
assert(report.cases.every(row => row.errors.length === 0 && row.responseObservers.every(observer => observer.status === 'passed')), 'No late errors or pending response observers after browser cleanup');
assert.equal(report.cases.length, 12); assert(report.cases.every(row => row.status === 'passed'), 'Every actual built context must reach its exact observations');
assert.equal(report.cases.filter(row => row.originalFault).length, report.expected.originalFaults); assert.equal(report.cases.filter(row => row.healthyDelivery).length, 4);
report.status = 'passed'; report.fixedBrowserPassed = mode === 'fixed'; save();
console.log(mode === 'baseline' ? 'Eight explicit original missing-suggestion faults after delivered pool, four healthy actual submissions; no fixed or real-player correctness claim.'
  : 'Twelve actual built fixed discovery/healthy contexts passed; no real-player correctness claim.');
