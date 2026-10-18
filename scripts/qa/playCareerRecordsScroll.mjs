// Real record-book navigation after native scrolling, on the unchanged baseline and the approved candidate.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

const MODE = process.env.CAREER_RECORD_SCROLL_MODE, BASE = process.env.BASE, OUT = process.env.CAREER_RECORD_SCROLL_BROWSER_OUT;
assert(process.env.CI === '1' || process.env.CI === 'true', 'Remote CI only'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Inherited offline preload');
assert(['baseline', 'fixed'].includes(MODE), 'Explicit baseline or fixed phase');
assert(BASE && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'Supplied loopback production server');
assert(OUT && path.isAbsolute(OUT) && !fs.existsSync(OUT), 'Fresh absolute browser output'); fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(process.env.CAREER_RECORD_SCROLL_SOURCE || process.cwd()), DIST = path.resolve(process.env.CAREER_RECORD_SCROLL_DIST || 'dist');
const ORIGIN = new URL(BASE).origin, PAGE = ORIGIN + '/soccer-career', SAVE = 'soccerCareerSave', NOW = Date.parse('2026-10-18T12:00:00Z');
const SHEET = 'src/components/soccer-career/CareerRecordsSheet.tsx', ORIGINAL = '5c5745c6da5933b630f26c5775d235321169770ccf864681616b52f6a72bf455';
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), clone = value => JSON.parse(JSON.stringify(value));
const put = (file, value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n'), target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' }); return { file, bytes: bytes.length, sha256: sha(bytes) };
};
const bodyRef = value => {
  const bytes = Buffer.from(value), file = `bodies/${sha(bytes)}.bin`, target = path.join(OUT, file);
  if (!fs.existsSync(target)) return put(file, bytes); assert(fs.readFileSync(target).equals(bytes)); return { file, bytes: bytes.length, sha256: sha(bytes) };
};
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const filesBelow = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesBelow(path.join(root, entry.name)) : [path.join(root, entry.name)]).sort();
const inventory = names => Object.fromEntries(names.map(file => [file, { bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }]));
async function bounded(promise, label) {
  let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(`Timed out waiting for ${label}`)), 20000); })]); }
  finally { clearTimeout(timer); }
}
const report = { version: 1, phase: MODE, status: 'running', qualified: false, cases: [], controls: [] };
let browser, oracleContext;
try {
  assert.equal(ROOT, process.cwd()); assert.equal(DIST, path.resolve(ROOT, 'dist'));
  const expectedSource = MODE === 'baseline' ? ORIGINAL : process.env.CAREER_RECORD_SCROLL_CANDIDATE_SHA256;
  assert(typeof expectedSource === 'string' && /^[a-f0-9]{64}$/.test(expectedSource), 'Approved exact source hash for this phase');
  if (MODE === 'fixed') assert.notEqual(expectedSource, ORIGINAL, 'The approved candidate is an effective source change');
  assert.equal(sha(fs.readFileSync(SHEET)), expectedSource, 'Whole actual sheet source bound before any browser action');
  const sourceNames = git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(), sourceBefore = inventory(sourceNames);
  const distNames = filesBelow(DIST), distBefore = inventory(distNames), require = createRequire(import.meta.url), pwPackage = fs.realpathSync(require.resolve('playwright/package.json'));
  assert.equal(JSON.parse(fs.readFileSync(pwPackage)).version, '1.64.0'); assert.equal(process.versions.node.split('.')[0], '24');
  const executable = pw.chromium.executablePath(), toolNames = [process.execPath, pwPackage, executable].sort(), toolsBefore = inventory(toolNames);
  const cache = process.env.FREE_KICK_FONT_CACHE; assert(cache && path.isAbsolute(cache));
  const fontNames = filesBelow(cache), fontsBefore = inventory(fontNames), manifest = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json')));
  assert.equal(manifest.length, 9); assert.equal(fontNames.length, 10);
  const fonts = new Map(manifest.map(entry => { const bytes = fs.readFileSync(path.join(cache, entry.file)); assert.equal(sha(bytes), entry.sha256);
    return [entry.url, { body: bytes, contentType: entry.contentType, headers: { 'access-control-allow-origin': '*' } }]; }));
  const chunks = fs.readdirSync(path.join(DIST, 'assets')).filter(file => /^CareerRecordsSheet-[\w-]+\.js$/.test(file)); assert.equal(chunks.length, 1);
  const CHUNK = '/assets/' + chunks[0], chunkBody = bodyRef(fs.readFileSync(path.join(DIST, CHUNK.slice(1))));
  Object.assign(report, { head: git(['rev-parse', 'HEAD']).toString().trim(), expectedSource, declarations: { widths: [390, 1280], navigationStarts: ['list-to-detail', 'detail-to-list'], shotsPerCase: 4 },
    scope: 'Actual built career record book, real saved-fictional-career oracle, native wheel or touch scroll and native navigation. Baseline admits exactly two observed clipped starts per width; fixed requires both actual starts at the top.',
    limits: 'No DOM scrollTop assignment, mocked geometry, played-season claim, live data or database, cross-document raw/RNG identity comparison, source-tree publication claim or full focus-trap claim. Date.now is fixed for fixture/calendar repeatability; document identity uses a crypto nonce and native document requests.',
    sourceBefore: put('source-before.json', sourceBefore), distBefore: put('dist-before.json', distBefore), toolsBefore: put('tools-before.json', toolsBefore), fontsBefore: put('fonts-before.json', fontsBefore),
    sourceBody: put('actual-CareerRecordsSheet.tsx', fs.readFileSync(SHEET)), chunk: { url: ORIGIN + CHUNK, body: chunkBody } });
  const heldInventories = label => {
    const after = { source: inventory(sourceNames), dist: inventory(distNames), tools: inventory(toolNames), fonts: inventory(fontNames) }, ref = put(`${label}-holds.json`, after);
    assert.deepEqual(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(), sourceNames); assert.deepEqual(filesBelow(DIST), distNames); assert.deepEqual(filesBelow(cache), fontNames);
    assert.deepEqual(after.source, sourceBefore); assert.deepEqual(after.dist, distBefore); assert.deepEqual(after.tools, toolsBefore); assert.deepEqual(after.fonts, fontsBefore); return ref;
  };
  const preservationFindings = value => [value.before.save !== value.after.save && 'save', JSON.stringify(value.before.local) !== JSON.stringify(value.after.local) && 'local',
    JSON.stringify(value.before.session) !== JSON.stringify(value.after.session) && 'session', JSON.stringify(value.before.identity.draws) !== JSON.stringify(value.after.identity.draws) && 'rng',
    (!value.after.parent || value.after.href !== PAGE) && 'parent', (value.before.identity.nonce !== value.after.identity.nonce || value.documents.length !== 1 || value.documents[0]?.url !== PAGE) && 'document',
    (value.after.x !== value.expectedX || value.after.y !== value.expectedY) && 'page-scroll', value.after.overflow !== value.expectedOverflow && 'body-overflow',
    (value.closed && (value.after.panel || !value.after.tileFocused)) && 'close-focus'].filter(Boolean);
  const startFindings = value => [(!value.samePane || value.oldTop <= 0 || value.newExtent <= 0) && 'setup', (value.newTop !== 0 || !value.firstVisible) && 'start'].filter(Boolean);
  const expectedStarts = MODE === 'baseline' ? ['start'] : [];
  const phaseFindings = value => JSON.stringify(startFindings(value)) === JSON.stringify(expectedStarts) ? [] : ['phase'];
  const layoutFindings = value => [(value.width !== value.requestedWidth || value.clientWidth > value.width + 1 || Math.abs(value.scale - 1) > 0.01 || value.overflow) && 'viewport',
    (!value.painted || value.rect.x < 0 || value.rect.right > value.width + 1 || value.rect.y < 0 || value.rect.bottom > value.height + 1) && 'panel',
    (!value.focus.inside || !value.focus.painted || value.focus.rect.y < 0 || value.focus.rect.bottom > value.height + 1) && 'focus',
    (!value.button.painted || value.button.width < 43.5 || value.button.height < 43.5) && 'target', (!value.fonts || value.stable < 4 || value.animations !== 0) && 'readiness'].filter(Boolean);
  function copiedControl(id, actual, mutate, detector, expectedBefore, expectedAfter) {
    assert.deepEqual(detector(actual), expectedBefore); const before = put(`controls/${id}-before.json`, actual), changed = clone(actual); mutate(changed);
    const fault = put(`controls/${id}-fault.json`, changed); assert.notDeepEqual(changed, actual); assert.notEqual(before.sha256, fault.sha256);
    const findings = detector(changed); assert.deepEqual(findings, expectedAfter); const undo = put(`controls/${id}-undo.json`, clone(actual)); assert.equal(undo.sha256, before.sha256);
    report.controls.push({ id, before, fault, undo, changed: true, findingsBefore: expectedBefore, findings, wholeUndo: true, status: 'passed', scope: 'Copied actual observation only, never served-source or geometry mutation' });
  }
  try {
    const loaded = [];
    const bundle = await build({ absWorkingDir: ROOT, stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine';export * as records from './src/lib/soccerCareerRecords';export * as moments from './src/components/soccer-career/careerMoments';", resolveDir: ROOT, loader: 'ts' },
      bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'RecordsScrollOracle', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') },
      define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error',
      plugins: [{ name: 'actual-source-observer', setup(context) { context.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const file = path.relative(ROOT, args.path).replaceAll('\\', '/'); if (!file.startsWith('src/')) return;
        const bytes = fs.readFileSync(args.path); loaded.push({ file, bytes: bytes.length, sha256: sha(bytes) });
        return { contents: bytes.toString('utf8'), loader: file.endsWith('.json') ? 'json' : file.endsWith('.tsx') ? 'tsx' : 'ts' };
      }); } }] });
    report.oracle = { script: put('actual-oracle.js', bundle.outputFiles[0].text), loaded: put('oracle-loaded-source.json', loaded), sourceMutations: [] };
    for (const entry of loaded) assert.deepEqual(sourceBefore[entry.file], { bytes: entry.bytes, sha256: entry.sha256 });
    browser = await pw.chromium.launch({ headless: true, executablePath: executable }); report.runtime = { node: process.version, playwright: '1.64.0', chromium: browser.version(), executable };
    oracleContext = await browser.newContext(); await oracleContext.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>Isolated actual records oracle</body></html>' }));
    const oracle = await oracleContext.newPage(); await oracle.goto(ORIGIN + '/__records-scroll-oracle'); await oracle.addScriptTag({ content: bundle.outputFiles[0].text });
    const fixtureResult = await oracle.evaluate(now => {
      const B = RecordsScrollOracle, random = Math.random, clock = Date.now; Math.random = () => 0.99; Date.now = () => now;
      try {
        const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
        const start = B.engine.initCareer('Records Scroll Fixture', 'England', 'ST', '2020s', stats, 80, 2020, B.engine.FALLBACK_CLUBS, null, 90);
        const input = { ...start, phase: 'playing', age: 42, retired: false, currentClub: 'Fixture Valley', currentClubCountry: 'England', currentClubTier: 3, currentLeague: 'Fixture League',
          seasons: Array.from({ length: 25 }, (_, index) => ({ ...start.seasons[0], year: 2020 + index, age: 18 + index,
            club: index < 12 ? index % 2 === 0 ? 'Fixture Harbor' : 'Fixture Ridge' : 'Fixture Valley', clubCountry: 'England', clubTier: 3, type: 'playing',
            apps: 30, leagueApps: 26, goals: 12, assists: 4, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2, ovr: 80 })),
          events: ['Unsaved fictional career change'], pendingEvents: [], pendingOffers: [], pendingSummary: null, pendingBallonDor: null };
        const career = B.engine.repairCareer(JSON.parse(JSON.stringify(input))); B.moments.settleLoadedMoments(career);
        return { input, career, book: B.records.careerRecordBook(career) };
      } finally { Math.random = random; Date.now = clock; }
    }, NOW);
    const fixture = fixtureResult.career, book = fixtureResult.book; report.fixtureInput = put('fictional-input-career.json', fixtureResult.input); report.fixture = put('actual-load-career.json', fixture); report.book = put('actual-record-book.json', book);
    assert(JSON.stringify(fixture).length < 60000); assert.equal(book.rows.length, 25); assert.equal(book.stints.length, 13); assert.equal(book.stints[12].rows.length, 13);
    assert.equal(book.stints[12].firstYear, 2032); assert.equal(book.stints[12].club, 'Fixture Valley');
    for (const width of report.declarations.widths) {
      const id = String(width), touch = width === 390;
      const row = { id, width, touch, phase: MODE, status: 'running', order: 0, requests: [], responses: [], documents: [], failedRequests: [], errors: [], console: [], fonts: [], actions: [], scrolls: [], observations: [], preservations: [], layouts: [], shots: [] };
      report.cases.push(row); const next = () => ++row.order, pending = new Set(), requestRows = new WeakMap();
      const context = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, isMobile: touch, hasTouch: touch, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block',
        storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: SAVE, value: JSON.stringify(fixture) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-guest-handle', value: 'RecordsFixture-18' },
          { name: 'rules-gate-seen:/soccer-career', value: '1' }, { name: 'records-scroll-unrelated', value: 'local-sentinel' }] }] } });
      await context.addInitScript(now => {
        Date.now = () => now; const state = { nonce: crypto.randomUUID(), draws: [], events: [], action: null, panes: new WeakMap() };
        Object.defineProperty(window, '__recordsScroll1416', { value: state, writable: false, configurable: false }); sessionStorage.setItem('records-scroll-unrelated', 'session-sentinel');
        const random = Math.random; Math.random = () => { const value = random(); state.draws.push({ value, caller: new Error().stack }); return value; };
        for (const type of ['pointerdown', 'click', 'keydown', 'wheel', 'touchstart', 'touchmove', 'touchend']) addEventListener(type, event => {
          const panel = document.querySelector('[data-career-records] [role="dialog"]'), pane = panel?.children[1], target = event.target;
          state.events.push({ type, action: state.action, trusted: event.isTrusted, key: event.key ?? null, pointerType: event.pointerType ?? null, deltaY: event.deltaY ?? null,
            touches: event.touches ? [...event.touches].map(point => ({ x: point.clientX, y: point.clientY })) : null, targetTag: target?.tagName ?? null,
            targetStint: target?.closest?.('[data-record-stint]')?.getAttribute('data-record-stint') ?? null, targetText: target?.textContent?.slice(0, 160) ?? null,
            x: scrollX, y: scrollY, paneTop: pane?.scrollTop ?? null, insidePane: !!pane && pane.contains(target) });
        }, { capture: true, passive: true });
      }, NOW);
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), record = requestRows.get(request);
        try {
          assert(record); assert.equal(request.method(), 'GET', 'No write from reading or navigating records');
          if (url.origin === ORIGIN) { record.action = 'served unchanged loopback build'; await route.continue(); record.routeCompletedOrder = next(); return; }
          if (fonts.has(url.href)) { record.action = 'fulfilled verified cached font'; row.fonts.push(url.href); record.expectedBody = bodyRef(fonts.get(url.href).body);
            await route.fulfill(fonts.get(url.href)); record.routeCompletedOrder = next(); return; }
          if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co') {
            assert.equal(url.pathname, '/rest/v1/live_scores'); assert.deepEqual([...new Set(url.searchParams.keys())].sort(), ['limit', 'order', 'select', 'start_at']);
            assert.equal(url.searchParams.get('select'), '*'); assert.equal(url.searchParams.get('order'), 'start_at.asc'); assert.equal(url.searchParams.get('limit'), '150');
            const bounds = url.searchParams.getAll('start_at'); assert.equal(bounds.length, 2); assert(bounds[0].startsWith('gte.') && bounds[1].startsWith('lte.'));
            assert(Number.isFinite(Date.parse(bounds[0].slice(4))) && Date.parse(bounds[0].slice(4)) < Date.parse(bounds[1].slice(4)));
            record.action = 'completed exact unrelated live-score read locally'; record.expectedBody = bodyRef('[]');
            await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' }, body: '[]' }); record.routeCompletedOrder = next(); return;
          }
          throw Error(`Undeclared external IO: ${request.method()} ${url.href}`);
        } catch (error) { if (record) record.error = String(error.stack || error); row.errors.push({ kind: 'route-handler', message: String(error.stack || error) }); try { await route.abort('failed'); } catch {} }
      });
      const page = await context.newPage(); page.setDefaultTimeout(20000); const cdp = touch ? await context.newCDPSession(page) : null;
      page.on('pageerror', error => row.errors.push({ kind: 'pageerror', message: String(error.stack || error) }));
      page.on('console', message => row.console.push({ type: message.type(), text: message.text(), location: message.location() }));
      page.on('request', request => { const value = { index: row.requests.length, order: next(), url: request.url(), method: request.method(), resourceType: request.resourceType(), postData: request.postData(), action: null };
        row.requests.push(value); requestRows.set(request, value);
        if (request.isNavigationRequest() && request.resourceType() === 'document' && request.frame() === page.mainFrame()) row.documents.push({ requestIndex: value.index, url: request.url(), method: request.method(), order: value.order }); });
      page.on('requestfinished', request => { const record = requestRows.get(request); if (record) record.finishedOrder = next(); });
      page.on('requestfailed', request => row.failedRequests.push({ requestIndex: requestRows.get(request)?.index, url: request.url(), error: request.failure()?.errorText, order: next() }));
      page.on('response', response => {
        const record = { requestIndex: requestRows.get(response.request())?.index, url: response.url(), status: response.status(), order: next() }; row.responses.push(record);
        const job = (async () => { try {
          const bytes = await response.body(), url = new URL(response.url()), request = requestRows.get(response.request()); assert(request); assert.equal(response.status(), 200); record.body = bodyRef(bytes);
          if (url.origin === ORIGIN) {
            const full = path.resolve(DIST, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'); assert(full.startsWith(DIST + path.sep));
            const actual = fs.statSync(full).isDirectory() ? path.join(full, 'index.html') : full, built = fs.readFileSync(actual); assert(built.equals(bytes), 'Actual response equals whole production file');
            record.built = { source: path.relative(ROOT, actual).replaceAll('\\', '/'), ...bodyRef(built) };
          } else { assert(request.expectedBody); assert.equal(sha(bytes), request.expectedBody.sha256); record.localBody = request.expectedBody; }
          record.completedOrder = next();
        } catch (error) { record.error = String(error.stack || error); } })(); pending.add(job); job.finally(() => pending.delete(job));
      });
      const panel = page.getByRole('dialog', { name: 'Your career record book', exact: true });
      const pane = panel.locator(':scope > div').nth(1);
      async function drain() { while (pending.size) await bounded(Promise.all([...pending]), 'actual completed response bodies'); }
      async function stablePane() {
        return pane.evaluate(async element => {
          let previous = '', stable = 0, last; const started = performance.now();
          do { await new Promise(requestAnimationFrame); last = { top: element.scrollTop, height: element.scrollHeight, client: element.clientHeight };
            const signature = JSON.stringify(last); stable = signature === previous ? stable + 1 : 1; previous = signature; if (stable >= 6) return { ...last, stable };
          } while (performance.now() - started < 10000); throw Error('Actual scroll pane did not settle');
        });
      }
      async function snapshot(label) {
        await drain(); const value = await page.evaluate(key => {
          const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
          const state = window.__recordsScroll1416, panel = document.querySelector('[data-career-records] [role="dialog"]'), body = panel?.children[1], active = document.activeElement;
          const store = storage => Object.fromEntries(Object.keys(storage).sort().map(name => [name, storage.getItem(name)]));
          let measuredPane = null;
          if (body) {
            if (!state.panes.has(body)) state.panes.set(body, crypto.randomUUID());
            const rect = box(body), clip = { x: rect.x + body.clientLeft, y: rect.y + body.clientTop, right: rect.x + body.clientLeft + body.clientWidth, bottom: rect.y + body.clientTop + body.clientHeight };
            const describe = element => { const r = box(element), point = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              return { rect: r, text: element.innerText, title: element.querySelector('span')?.textContent ?? null, painted: !!point && (point === element || element.contains(point)),
                fullyVisible: r.x >= clip.x && r.right <= clip.right + 1 && r.y >= clip.y && r.bottom <= clip.bottom + 1 }; };
            measuredPane = { id: state.panes.get(body), top: body.scrollTop, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, overflowY: getComputedStyle(body).overflowY, rect, clip, html: body.outerHTML,
              stints: [...body.querySelectorAll('[data-record-stint]')].map(element => ({ index: Number(element.getAttribute('data-record-stint')), ...describe(element) })),
              seasons: [...body.querySelectorAll('[data-record-season]')].map(element => ({ year: Number(element.getAttribute('data-record-season')), ...describe(element) })) };
          }
          return { save: localStorage.getItem(key), local: store(localStorage), session: store(sessionStorage), parent: !!document.querySelector('[data-career-records-tile]'), html: document.body.innerHTML,
            main: document.querySelector('#dukb-main')?.outerHTML ?? null, panel: !!panel, pane: measuredPane, panelFocused: !!panel && active === panel, focusInside: !!panel && panel.contains(active),
            focus: active?.outerHTML ?? null, tileFocused: active === document.querySelector('[data-career-records-tile]'), x: scrollX, y: scrollY, overflow: document.body.style.overflow, href: location.href,
            identity: { nonce: state.nonce, draws: state.draws, events: state.events }, performanceObservedOnly: { timeOrigin: performance.timeOrigin, navigations: performance.getEntriesByType('navigation').map(entry => ({ name: entry.name, type: entry.type })) } };
        }, SAVE);
        const ref = put(`${id}/${label}.json`, value); row.observations.push({ label, order: next(), ...ref }); return value;
      }
      async function nativeClick(label, locator) {
        await page.evaluate(value => { window.__recordsScroll1416.action = value; }, label); const beforeOrder = next(); if (touch) await locator.tap(); else await locator.click();
        const events = await page.evaluate(value => window.__recordsScroll1416.events.filter(entry => entry.action === value), label), action = { label, input: touch ? 'locator.tap()' : 'locator.click()', beforeOrder, afterOrder: next(), events };
        row.actions.push(action); assert(events.every(event => event.trusted)); assert.equal(events.filter(event => event.type === 'click').length, 1);
        assert(events.some(event => event.type === 'pointerdown' && event.pointerType === (touch ? 'touch' : 'mouse'))); return action;
      }
      async function nativeScroll(label, direction) {
        const before = await stablePane(), rect = await pane.boundingBox(); assert(rect && rect.height > 100);
        const delta = Math.min(340, rect.height * 0.6), x = rect.x + rect.width / 2, startY = direction === 'down' ? rect.y + rect.height - 24 : rect.y + 24;
        await page.evaluate(value => { window.__recordsScroll1416.action = value; }, label); const input = { label, direction, before, beforeOrder: next(), method: touch ? 'CDP native touchStart/touchMove/touchEnd' : 'page.mouse.wheel', points: [] };
        row.scrolls.push(input);
        if (touch) {
          let ended = false;
          try {
            const first = { x, y: startY, id: 7 }; input.points.push(first); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
            for (let step = 1; step <= 10; step++) { const point = { x, y: startY + (direction === 'down' ? -1 : 1) * delta * step / 10, id: 7 }; input.points.push(point);
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] }); await page.evaluate(() => new Promise(requestAnimationFrame)); }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); ended = true;
          } finally { if (!ended) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); }
        } else { await page.mouse.move(x, rect.y + rect.height / 2); input.deltaY = direction === 'down' ? delta : -delta; await page.mouse.wheel(0, input.deltaY); }
        input.after = await stablePane(); input.afterOrder = next(); input.events = await page.evaluate(value => window.__recordsScroll1416.events.filter(entry => entry.action === value), label);
        assert(input.events.length > 0 && input.events.every(event => event.trusted), 'Actual trusted native scrolling input');
        assert(input.events.some(event => event.insidePane && event.type === (touch ? 'touchmove' : 'wheel')), 'Real scroll input targeted the actual pane');
        assert(direction === 'down' ? input.after.top > before.top : input.after.top < before.top, 'Real native input changed the observed pane offset'); return input;
      }
      async function scrollUntil(label, locator, direction) {
        for (let attempt = 0; attempt < 12; attempt++) {
          const visible = await locator.evaluate(element => { const pane = document.querySelector('[data-career-records] [role="dialog"]')?.children[1]; if (!pane) return false;
            const r = element.getBoundingClientRect(), p = pane.getBoundingClientRect(); return r.top >= p.top && r.bottom <= p.top + pane.clientHeight + 1; });
          if (visible) return; await nativeScroll(`${label}-${attempt}`, direction);
        }
        throw Error(`Real native scrolling did not reveal ${label}`);
      }
      let before, clickX, clickY;
      function preserve(label, observed, closed = false) {
        const value = { before, after: observed, documents: clone(row.documents), expectedX: clickX, expectedY: clickY, expectedOverflow: closed ? before.overflow : 'hidden', closed };
        const ref = put(`${id}/${label}-preservation.json`, value); row.preservations.push({ label, ...ref }); assert.deepEqual(preservationFindings(value), []); return value;
      }
      async function capture(label, target) {
        await page.evaluate(async () => { await document.fonts.ready; }); await stablePane();
        const button = await target.elementHandle(); assert(button);
        const value = await panel.evaluate(async (element, { button, requestedWidth }) => {
          const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
          const painted = node => { const r = box(node), style = getComputedStyle(node), point = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return !!point && (point === node || node.contains(point)) && style.visibility === 'visible' && style.display !== 'none' && Number(style.opacity) === 1; };
          let previous = '', stable = 0, value; const started = performance.now();
          do { await new Promise(requestAnimationFrame); const active = document.activeElement;
            value = { width: innerWidth, height: innerHeight, requestedWidth, clientWidth: document.documentElement.clientWidth, scale: visualViewport?.scale ?? 1,
              overflow: document.documentElement.scrollWidth > innerWidth + 1, rect: box(element), painted: painted(element), button: { ...box(button), painted: painted(button) },
              focus: { inside: element.contains(active), html: active.outerHTML, rect: box(active), painted: painted(active) },
              fonts: document.fonts.status === 'loaded' && ['Inter', 'Space Grotesk'].every(family => document.fonts.check(`400 16px "${family}"`, 'Record book')),
              fontFaces: [...document.fonts].map(face => ({ family: face.family, status: face.status })), animations: document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length };
            const signature = JSON.stringify(value); stable = signature === previous ? stable + 1 : 1; previous = signature; if (stable >= 4 && value.animations === 0 && value.fonts) break;
          } while (performance.now() - started < 10000); return { ...value, stable };
        }, { button, requestedWidth: width });
        const layout = put(`${id}/${label}-layout.json`, value); row.layouts.push({ label, ...layout }); assert.deepEqual(layoutFindings(value), []);
        const atShot = await snapshot(`${label}-at-shot`), observation = row.observations.at(-1), file = `${id}/${label}.png`; preserve(`${label}-at-shot`, atShot); assert(!fs.existsSync(path.join(OUT, file)));
        await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.shots.push({ label, file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))), layout,
          observation: { file: observation.file, bytes: observation.bytes, sha256: observation.sha256 } }); return { layout: value, state: atShot };
      }
      function navigation(label, oldState, newState, first) {
        assert(oldState.pane && newState.pane && first); const value = { label, phase: MODE, samePane: oldState.pane.id === newState.pane.id, paneBefore: oldState.pane.id, paneAfter: newState.pane.id,
          oldTop: oldState.pane.top, newTop: newState.pane.top, newExtent: newState.pane.scrollHeight - newState.pane.clientHeight,
          firstVisible: first.fullyVisible && first.painted, firstRect: first.rect, clip: newState.pane.clip, atTop: newState.pane.top === 0 };
        const ref = put(`${id}/${label}-outcome.json`, value); row.outcomes.push({ label, ...ref }); assert.deepEqual(startFindings(value), expectedStarts, `${label} exact expected phase outcome`);
        if (MODE === 'baseline') { assert(value.newTop > 0); assert(value.firstRect.y < value.clip.y, 'First actual row is clipped above the real pane'); }
        else { assert.equal(value.newTop, 0); assert.equal(value.firstVisible, true); }
        return value;
      }
      try {
        row.outcomes = [];
        await page.goto(PAGE, { waitUntil: 'networkidle' }); const tile = page.locator('[data-career-records-tile]'); await tile.waitFor({ state: 'visible' }); await tile.scrollIntoViewIfNeeded();
        await page.evaluate(async () => { await document.fonts.ready; }); before = await snapshot('before-open');
        assert(before.parent && before.save); assert.equal(before.href, PAGE); assert.equal(before.save, JSON.stringify(fixture));
        assert.equal(before.local['records-scroll-unrelated'], 'local-sentinel'); assert.equal(before.session['records-scroll-unrelated'], 'session-sentinel');
        assert.equal(row.requests.filter(request => request.url === ORIGIN + CHUNK).length, 0, 'Records module remains genuinely lazy');
        const opened = await nativeClick('open-record-book', tile), click = opened.events.find(event => event.type === 'click'); clickX = click.x; clickY = click.y;
        await panel.waitFor({ state: 'visible' }); await stablePane(); const initial = await snapshot('initial-personal-bests'); preserve('initial-personal-bests', initial);
        assert(initial.panel && initial.focusInside); assert.equal(initial.pane.stints.length, 0); assert.equal(initial.pane.seasons.length, 0);
        await nativeClick('open-club-history', panel.getByRole('button', { name: 'Club history', exact: true })); await panel.locator('[data-record-stint="12"]').waitFor({ state: 'attached' }); await stablePane();
        const history = await snapshot('club-history-start'); preserve('club-history-start', history);
        assert.equal(history.pane.top, 0); assert.equal(history.pane.stints.length, 13); assert(history.panelFocused);
        assert.deepEqual(history.pane.stints.map(stint => stint.title), book.stints.map(stint => stint.club));
        assert(history.pane.scrollHeight > history.pane.clientHeight, 'Actual club list is scrollable at this viewport');
        const lastStint = panel.locator('[data-record-stint="12"]'); await scrollUntil('history-to-last-stint', lastStint, 'down'); await stablePane();
        const beforeList = await snapshot('before-list'); preserve('before-list', beforeList); assert(beforeList.pane.top > 0); assert(beforeList.pane.stints.at(-1).fullyVisible);
        assert(row.scrolls.some(input => input.label.startsWith('history-to-last-stint') && input.after.top > input.before.top), 'History offset came from actual native input');
        await capture('before-list', lastStint); const detailClick = await nativeClick('open-long-stint', lastStint);
        assert(detailClick.events.some(event => event.type === 'click' && event.targetStint === '12' && event.paneTop > 0));
        const firstYear = book.stints[12].rows[0].season.year, lastYear = book.stints[12].rows.at(-1).season.year;
        await panel.locator(`[data-record-season="${firstYear}"]`).waitFor({ state: 'attached' }); await stablePane();
        const detail = await snapshot('open-detail'); preserve('open-detail', detail); assert(detail.panelFocused); assert.equal(detail.pane.stints.length, 0);
        assert.deepEqual(detail.pane.seasons.map(season => season.year), book.stints[12].rows.map(record => record.season.year));
        for (const season of detail.pane.seasons) { assert(season.text.includes('Fixture Valley')); assert(season.text.includes('30 apps')); assert(season.text.includes('12 goals')); assert(season.text.includes('4 assists')); assert(season.text.includes('Rating 7.2')); }
        const detailStart = navigation('list-to-detail', beforeList, detail, detail.pane.seasons[0]);
        const back = panel.getByRole('button', { name: '← Back', exact: true }); await capture('open-detail', back);
        await scrollUntil('detail-to-first-season', panel.locator(`[data-record-season="${firstYear}"]`), 'up');
        const detailFirst = await snapshot('detail-native-first'); preserve('detail-native-first', detailFirst); assert(detailFirst.pane.seasons[0].fullyVisible);
        await scrollUntil('detail-to-last-season', panel.locator(`[data-record-season="${lastYear}"]`), 'down'); await stablePane();
        const beforeBack = await snapshot('before-back'); preserve('before-back', beforeBack); assert(beforeBack.pane.top > 0); assert(beforeBack.pane.seasons.at(-1).fullyVisible);
        assert(row.scrolls.some(input => input.label.startsWith('detail-to-last-season') && input.after.top > input.before.top), 'Detail offset came from actual native input');
        await capture('before-back', back); const backClick = await nativeClick('back-to-history', back); assert(backClick.events.some(event => event.type === 'click' && event.paneTop > 0));
        await panel.locator('[data-record-stint="0"]').waitFor({ state: 'attached' }); await stablePane(); const afterBack = await snapshot('after-back'); preserve('after-back', afterBack);
        assert(afterBack.panelFocused); assert.equal(afterBack.pane.seasons.length, 0); assert.deepEqual(afterBack.pane.stints.map(stint => stint.title), book.stints.map(stint => stint.club));
        const historyStart = navigation('detail-to-list', beforeBack, afterBack, afterBack.pane.stints[0]);
        await capture('after-back', panel.getByRole('button', { name: 'Club history', exact: true }));
        assert.equal(new Set([history.pane.id, beforeList.pane.id, detail.pane.id, detailFirst.pane.id, beforeBack.pane.id, afterBack.pane.id]).size, 1, 'Same actual scroll pane survives both navigation changes');
        const closing = await nativeClick('close-record-book', panel.getByRole('button', { name: 'Close', exact: true })); assert(closing.events.length > 0); await panel.waitFor({ state: 'hidden' });
        const closed = await snapshot('closed-career'), closePreservation = preserve('closed-career', closed, true);
        const finalBook = await oracle.evaluate(value => RecordsScrollOracle.records.careerRecordBook(JSON.parse(value)), closed.save); row.finalBook = put(`${id}/actual-final-book.json`, finalBook); assert.deepEqual(finalBook, book);
        row.navigationStarts = { detailAtTop: detailStart.newTop === 0 && detailStart.firstVisible, historyAtTop: historyStart.newTop === 0 && historyStart.firstVisible };
        assert.deepEqual(row.navigationStarts, MODE === 'baseline' ? { detailAtTop: false, historyAtTop: false } : { detailAtTop: true, historyAtTop: true });
        row.observedFaultCount = Object.values(row.navigationStarts).filter(value => !value).length; assert.equal(row.observedFaultCount, MODE === 'baseline' ? 2 : 0);
        await page.waitForLoadState('networkidle'); await drain();
        assert.equal(row.requests.filter(request => request.url === ORIGIN + CHUNK).length, 1); assert.equal(row.documents.length, 1); assert.equal(row.documents[0].url, PAGE);
        assert(row.responses.some(response => response.url === ORIGIN + CHUNK && response.body.sha256 === chunkBody.sha256));
        assert(row.responses.length > 0 && row.responses.every(response => response.body && !response.error && (response.built || response.localBody)));
        assert(row.requests.every(request => request.routeCompletedOrder && request.finishedOrder && !request.error)); assert(row.fonts.length > 0);
        assert.deepEqual(row.failedRequests, []); assert.deepEqual(row.errors, []); assert.deepEqual(row.console.filter(message => message.type === 'error'), []);
        assert.equal(row.shots.length, 4); assert.equal(row.actions.length, 5);
        if (width === 390) {
          copiedControl('whole-save', closePreservation, value => { value.after.save += ' '; }, preservationFindings, [], ['save']);
          copiedControl('document-identity', closePreservation, value => { value.after.identity.nonce = 'other-document'; }, preservationFindings, [], ['document']);
          copiedControl('same-pane', detailStart, value => { value.samePane = false; }, startFindings, expectedStarts, MODE === 'baseline' ? ['setup', 'start'] : ['setup']);
          copiedControl('native-old-offset', detailStart, value => { value.oldTop = 0; }, startFindings, expectedStarts, MODE === 'baseline' ? ['setup', 'start'] : ['setup']);
          copiedControl('phase-admission', historyStart, value => { value.newTop = MODE === 'baseline' ? 0 : 50; value.firstVisible = MODE === 'baseline'; }, phaseFindings, [], ['phase']);
          const firstLayout = JSON.parse(fs.readFileSync(path.join(OUT, row.layouts[0].file)));
          copiedControl('visible-target', firstLayout, value => { value.button.height = 20; }, layoutFindings, [], ['target']);
        }
        row.holds = heldInventories(id); row.status = 'passed'; console.log(`PASS Career records ${MODE} ${id}: ${row.observedFaultCount} precise navigation faults, native list/detail scrolling and four actual viewport captures.`);
      } catch (error) {
        row.status = 'failed'; row.error = String(error.stack || error); await snapshot('failure-final').catch(failure => { row.captureError = String(failure.stack || failure); });
        const file = `${id}/failure.png`; try { assert(!fs.existsSync(path.join(OUT, file))); await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.failureShot = { file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))) }; }
        catch (failure) { row.screenshotError = String(failure.stack || failure); }
      } finally {
        try { await drain(); } catch (error) { row.status = 'failed'; row.cleanupDrainError = String(error.stack || error); }
        try { await context.close(); } catch (error) { row.status = 'failed'; row.cleanupCloseError = String(error.stack || error); }
        try { await drain(); } catch (error) { row.status = 'failed'; row.cleanupFinalDrainError = String(error.stack || error); }
        put(`${id}/raw-case.json`, row);
      }
      assert.equal(row.status, 'passed', `${id} complete phase journey`);
    }
    assert.equal(report.cases.length, 2); assert(report.cases.every(row => row.status === 'passed')); assert.equal(report.cases.flatMap(row => row.shots).length, 8); assert.equal(report.controls.length, 6);
    report.observedFaultCount = report.cases.reduce((sum, row) => sum + row.observedFaultCount, 0); assert.equal(report.observedFaultCount, MODE === 'baseline' ? 4 : 0);
    report.status = 'passed'; report.qualified = true;
  } finally {
    if (oracleContext) await oracleContext.close(); if (browser) await browser.close(); report.finalHolds = heldInventories('final'); report.held = true;
  }
} catch (error) { report.status = 'failed'; report.qualified = false; report.error = String(error.stack || error); process.exitCode = 1; }
finally { put('report.json', report); console.log(`Career record scroll browser: ${MODE} ${report.status}, ${report.cases.length} actual journeys, ${report.controls.length} copied observation controls.`); }
