// Actual production Press Room loading keyboard exits, with the genuine lazy chunk held locally.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import pw from '../lib/playwrightLoader.mjs';
import { bundlePressMarket } from './careerPressMarketKit.mjs';

const BASE = process.env.BASE, OUT = process.env.PRESS_LOADING_KEYBOARD_BROWSER_OUT;
assert(process.env.CI === '1' || process.env.CI === 'true', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Inherited offline preload');
assert(BASE && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'Supplied loopback production server');
assert(OUT && path.isAbsolute(OUT) && !fs.existsSync(OUT), 'Fresh absolute browser output');
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(process.env.PRESS_LOADING_KEYBOARD_SOURCE || process.cwd());
const DIST = path.resolve(process.env.PRESS_LOADING_KEYBOARD_DIST || 'dist');
const ORIGIN = new URL(BASE).origin, PAGE = ORIGIN + '/soccer-career', SAVE = 'soccerCareerSave';
const NOW = Date.parse('2026-10-17T12:00:00Z'), TILE = 'src/components/soccer-career/PressRoomTile.tsx';
const sha = body => createHash('sha256').update(body).digest('hex'), clone = value => JSON.parse(JSON.stringify(value));
const put = (file, value) => {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body, { flag: 'wx' });
  return { file, bytes: body.length, sha256: sha(body) };
};
const bodyRef = body => {
  const bytes = Buffer.from(body), file = `bodies/${sha(bytes)}.bin`, target = path.join(OUT, file);
  if (!fs.existsSync(target)) return put(file, bytes); assert(fs.readFileSync(target).equals(bytes));
  return { file, bytes: bytes.length, sha256: sha(bytes) };
};
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const filesBelow = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesBelow(path.join(root, entry.name)) : [path.join(root, entry.name)]).sort();
const inventory = names => Object.fromEntries(names.map(file => [file, { bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }]));
async function bounded(promise, label) {
  let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(`Timed out waiting for ${label}`)), 20000); })]); }
  finally { clearTimeout(timer); }
}
const report = { version: 1, status: 'running', qualified: false, cases: [], controls: [] };
let browser, oracleContext;
try {
  assert.equal(ROOT, process.cwd(), 'Run against the actual held checkout');
  assert.equal(DIST, path.resolve(ROOT, 'dist'), 'Actual production dist');
  const sourceNames = git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
  const sourceBefore = inventory(sourceNames), distNames = filesBelow(DIST), distBefore = inventory(distNames);
  const require = createRequire(import.meta.url), pwPackage = fs.realpathSync(require.resolve('playwright/package.json'));
  assert.equal(JSON.parse(fs.readFileSync(pwPackage)).version, '1.64.0'); assert.equal(process.versions.node.split('.')[0], '24');
  const executable = pw.chromium.executablePath(), toolNames = [process.execPath, pwPackage, executable].sort(), toolsBefore = inventory(toolNames);
  const cache = process.env.FREE_KICK_FONT_CACHE; assert(cache && path.isAbsolute(cache), 'Prepared actual font cache');
  const fontNames = filesBelow(cache), fontsBefore = inventory(fontNames), manifest = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json')));
  assert.equal(manifest.length, 9); assert.equal(fontNames.length, 10);
  const fonts = new Map(manifest.map(entry => {
    const body = fs.readFileSync(path.join(cache, entry.file)); assert.equal(sha(body), entry.sha256);
    return [entry.url, { body, contentType: entry.contentType, headers: { 'access-control-allow-origin': '*' } }];
  }));
  const chunks = fs.readdirSync(path.join(DIST, 'assets')).filter(file => /^PressRoom-[\w-]+\.js$/.test(file));
  assert.equal(chunks.length, 1, 'One actual isolated production PressRoom module');
  const CHUNK = '/assets/' + chunks[0], chunkBody = bodyRef(fs.readFileSync(path.join(DIST, CHUNK.slice(1))));
  assert.equal(sha(fs.readFileSync(TILE)), '731e8bcd2ab5805942b5a29d22f0f48a5a1deb99819a56216aa04faa5991424b', 'Exact one-span loading-dialog candidate');
  Object.assign(report, {
    head: git(['rev-parse', 'HEAD']).toString().trim(), declarations: { widths: [390, 1280], modes: ['escape', 'back'], shotsPerCase: 2 },
    scope: 'Actual built Soccer Career, genuine PressRoom chunk held until a native loading-dialog exit, late unchanged bytes, healthy reopen and both native exits.',
    limits: 'No live database, failure or pending-save registry claim, answer/economy change, focus-trap claim or fixed-clock performance identity oracle. Date.now is fixed only for fixture/calendar repeatability; identity uses a crypto nonce and actual document requests.',
    sourceBefore: put('source-before.json', sourceBefore), distBefore: put('dist-before.json', distBefore), toolsBefore: put('tools-before.json', toolsBefore), fontsBefore: put('fonts-before.json', fontsBefore),
    chunk: { url: ORIGIN + CHUNK, body: chunkBody }, candidateTile: put('candidate-PressRoomTile.tsx', fs.readFileSync(TILE)),
  });
  const preservationFindings = value => [
    value.before.save !== value.after.save && 'save', JSON.stringify(value.before.local) !== JSON.stringify(value.after.local) && 'local',
    JSON.stringify(value.before.session) !== JSON.stringify(value.after.session) && 'session',
    JSON.stringify(value.before.identity.draws) !== JSON.stringify(value.after.identity.draws) && 'rng', !value.after.parent && 'parent',
    (value.before.identity.nonce !== value.after.identity.nonce || value.documents.length !== 1 || value.documents[0]?.url !== PAGE) && 'document',
    value.expectedY !== value.after.y && 'scroll', value.expectedOverflow !== value.after.overflow && 'overflow',
    (value.closed && (!value.after.tileFocused || value.after.loading || value.after.room || value.after.failure)) && 'closed',
  ].filter(Boolean);
  const pendingFindings = value => [!value.focusInside && 'focus', value.modal !== 'true' && 'modal', value.tabIndex !== -1 && 'tabindex',
    (!value.held || value.released || value.completed || value.room) && 'pending'].filter(Boolean);
  const releaseFindings = value => [(!value.closedBefore || !value.closedAfter || value.loading || value.room || value.failure) && 'late-reopen',
    (!value.bodyHeld || value.requests !== 1 || !value.finished || !(value.heldOrder < value.closedOrder && value.closedOrder < value.releaseOrder && value.releaseOrder < value.completedOrder)) && 'chunk'].filter(Boolean);
  const layoutFindings = value => [
    (value.width !== value.requestedWidth || value.clientWidth > value.requestedWidth + 1 || Math.abs(value.scale - 1) > 0.01) && 'viewport-scale',
    value.overflow && 'overflow', (!value.painted || value.opacity !== 1 || !value.button.painted) && 'paint',
    (value.rect.x < 0 || value.rect.right > value.width + 1 || value.rect.y < 0 || value.rect.bottom > value.height + 1) && 'viewport',
    (!value.focus.inside || !value.focus.painted || value.focus.rect.y < 0 || value.focus.rect.bottom > value.height + 1) && 'focus',
    (value.button.width < 43.5 || value.button.height < 43.5) && 'target', (!value.fonts || value.stable < 4 || value.animations !== 0) && 'readiness',
  ].filter(Boolean);
  function copiedControl(id, actual, mutate, detector, expected) {
    assert.deepEqual(detector(actual), []); const before = put(`controls/${id}-before.json`, actual), changed = clone(actual); mutate(changed);
    const fault = put(`controls/${id}-fault.json`, changed); assert.notDeepEqual(changed, actual); assert.notEqual(before.sha256, fault.sha256);
    const findings = detector(changed); assert.deepEqual(findings, expected); const undo = put(`controls/${id}-undo.json`, clone(actual)); assert.equal(undo.sha256, before.sha256);
    report.controls.push({ id, before, fault, undo, changed: true, findings, wholeUndo: true, status: 'passed', scope: 'Copied actual observation only; no served-source mutation' });
  }
  const heldInventories = label => {
    const after = { source: inventory(sourceNames), dist: inventory(distNames), tools: inventory(toolNames), fonts: inventory(fontNames) };
    const ref = put(`${label}-holds.json`, after);
    assert.deepEqual(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(), sourceNames);
    assert.deepEqual(filesBelow(DIST), distNames); assert.deepEqual(filesBelow(cache), fontNames);
    assert.deepEqual(after.source, sourceBefore); assert.deepEqual(after.dist, distBefore); assert.deepEqual(after.tools, toolsBefore); assert.deepEqual(after.fonts, fontsBefore);
    return ref;
  };
  try {
    const bundle = await bundlePressMarket({ browser: true });
    report.oracle = { script: put('actual-oracle.js', bundle.value), loaded: put('oracle-loaded-source.json', bundle.loaded), faults: bundle.faults };
    assert.deepEqual(bundle.faults, []);
    browser = await pw.chromium.launch({ headless: true, executablePath: executable });
    report.runtime = { node: process.version, playwright: '1.64.0', chromium: browser.version(), executable };
    oracleContext = await browser.newContext();
    await oracleContext.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>Isolated current engine oracle</body></html>' }));
    const oracle = await oracleContext.newPage(); await oracle.goto(ORIGIN + '/__press-loading-oracle'); await oracle.addScriptTag({ content: bundle.value });
    const fixture = await oracle.evaluate(now => {
      const B = PressMarketOracle, random = Math.random, clock = Date.now; Math.random = () => 0.99; Date.now = () => now;
      try {
        const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
        const start = B.engine.initCareer('Press Keyboard Browser Fixture', 'England', 'ST', '2020s', stats, 80, 2020, B.engine.FALLBACK_CLUBS, null, 90);
        const career = { ...start, phase: 'playing', age: 25, retired: false, currentClub: 'Press Fixture Town', currentClubCountry: 'England', currentClubTier: 3, currentLeague: 'Fixture League',
          seasons: [{ ...start.seasons[0], year: 2025, age: 25, club: 'Press Fixture Town', clubCountry: 'England', clubTier: 3, type: 'playing', apps: 28, leagueApps: 24, goals: 14, assists: 8, rating: 7.1 }],
          popularity: 50, morale: 50, events: ['Fictional browser keyboard fixture'], pendingEvents: [], pendingOffers: [], pendingSummary: null, pendingBallonDor: null };
        delete career.pressRoom; const value = B.engine.repairCareer(career); B.moments.settleLoadedMoments(value); return value;
      } finally { Math.random = random; Date.now = clock; }
    }, NOW);
    report.fixture = put('fictional-career.json', fixture); assert(JSON.stringify(fixture).length < 60000);
    report.fixtureView = put('actual-fixture-view.json', await oracle.evaluate(value => PressMarketOracle.press.pressRoomView(value), fixture));
    const fixtureView = JSON.parse(fs.readFileSync(path.join(OUT, report.fixtureView.file)));
    assert.equal(fixtureView.eligible, true); assert.equal(fixtureView.history.length, 0);
    for (const width of report.declarations.widths) for (const mode of report.declarations.modes) {
      const id = `${width}-${mode}`, touch = width === 390;
      const row = { id, width, mode, touch, status: 'running', order: 0, requests: [], responses: [], failedRequests: [], documents: [], errors: [], console: [], observations: [], preservations: [], shots: [], layouts: [], fonts: [], actions: [], gate: { held: false, released: false, completed: false } };
      report.cases.push(row); const next = () => ++row.order, pending = new Set(), requestRows = new WeakMap();
      let release, markHeld, markCompleted, markFinished, enabled = false;
      const releaseGate = new Promise(resolve => { release = resolve; }), chunkHeld = new Promise(resolve => { markHeld = resolve; });
      const chunkCompleted = new Promise(resolve => { markCompleted = resolve; }), chunkFinished = new Promise(resolve => { markFinished = resolve; });
      const releaseChunk = reason => { if (!row.gate.released) { Object.assign(row.gate, { released: true, releaseOrder: next(), releaseReason: reason }); release(); } };
      const context = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, isMobile: touch, hasTouch: touch, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block',
        storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [
          { name: SAVE, value: JSON.stringify(fixture) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-guest-handle', value: 'PressKeyboard-18' },
          { name: 'rules-gate-seen:/soccer-career', value: '1' }, { name: 'press-keyboard-unrelated', value: 'local-sentinel' },
        ] }] } });
      await context.addInitScript(now => {
        Date.now = () => now;
        const identity = { nonce: crypto.randomUUID(), draws: [], events: [], action: null };
        Object.defineProperty(window, '__pressLoading1415', { value: identity, writable: false, configurable: false });
        sessionStorage.setItem('press-keyboard-unrelated', 'session-sentinel');
        const random = Math.random; Math.random = () => { const value = random(); identity.draws.push({ value, caller: new Error().stack }); return value; };
        for (const type of ['pointerdown', 'click', 'keydown']) addEventListener(type, event => {
          const entry = { type, action: identity.action, trusted: event.isTrusted, key: event.key ?? null, pointerType: event.pointerType ?? null,
            target: event.target?.outerHTML ?? null, y: scrollY, focus: document.activeElement?.outerHTML ?? null,
            loadingBefore: !!document.querySelector('[aria-label="Opening the press room"]'), roomBefore: !!document.querySelector('[data-press-room]') };
          identity.events.push(entry);
          queueMicrotask(() => { entry.defaultPrevented = event.defaultPrevented; entry.loadingAfter = !!document.querySelector('[aria-label="Opening the press room"]'); entry.roomAfter = !!document.querySelector('[data-press-room]'); });
        }, true);
      }, NOW);
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), record = requestRows.get(request);
        try {
          assert(record, 'Route joins the actual native request record');
          if (url.origin === ORIGIN) {
            assert.equal(request.method(), 'GET');
            if (url.pathname === CHUNK) {
              assert(enabled, 'The module was genuinely lazy until the opener'); assert.equal(request.resourceType(), 'script');
              assert.equal(row.gate.held, false, 'Only one lazy module request');
              Object.assign(record, { action: 'held actual built PressRoom module', builtBody: chunkBody });
              Object.assign(row.gate, { held: true, heldOrder: next(), requestIndex: record.index, url: request.url(), body: chunkBody }); markHeld();
              await releaseGate; record.continuedOrder = next(); await route.continue(); record.routeCompletedOrder = next(); return;
            }
            record.action = 'served unchanged loopback build'; await route.continue(); record.routeCompletedOrder = next(); return;
          }
          if (fonts.has(url.href)) {
            assert.equal(request.method(), 'GET'); record.action = 'fulfilled verified cached font'; row.fonts.push(url.href);
            record.expectedBody = bodyRef(fonts.get(url.href).body); await route.fulfill(fonts.get(url.href)); record.routeCompletedOrder = next(); return;
          }
          if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co') {
            assert.equal(request.method(), 'GET', 'No career or completion write from reading or closing'); assert.equal(url.pathname, '/rest/v1/live_scores');
            assert.deepEqual([...new Set(url.searchParams.keys())].sort(), ['limit', 'order', 'select', 'start_at']);
            assert.equal(url.searchParams.get('select'), '*'); assert.equal(url.searchParams.get('order'), 'start_at.asc'); assert.equal(url.searchParams.get('limit'), '150');
            const bounds = url.searchParams.getAll('start_at'); assert.equal(bounds.length, 2); assert(bounds[0].startsWith('gte.') && bounds[1].startsWith('lte.'));
            assert(Number.isFinite(Date.parse(bounds[0].slice(4))) && Date.parse(bounds[0].slice(4)) < Date.parse(bounds[1].slice(4)));
            record.action = 'completed exact unrelated live-score read locally'; record.expectedBody = bodyRef('[]');
            await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' }, body: '[]' }); record.routeCompletedOrder = next(); return;
          }
          throw Error(`Undeclared external IO: ${request.method()} ${url.href}`);
        } catch (error) {
          if (record) record.error = String(error.stack || error); row.errors.push({ kind: 'route-handler', message: String(error.stack || error) });
          try { await route.abort('failed'); } catch {}
        }
      });
      const page = await context.newPage(); page.setDefaultTimeout(20000);
      page.on('pageerror', error => row.errors.push({ kind: 'pageerror', message: String(error.stack || error) }));
      page.on('console', message => row.console.push({ type: message.type(), text: message.text(), location: message.location() }));
      page.on('request', request => {
        const value = { index: row.requests.length, order: next(), url: request.url(), method: request.method(), resourceType: request.resourceType(), postData: request.postData(), action: null };
        row.requests.push(value); requestRows.set(request, value);
        if (request.isNavigationRequest() && request.resourceType() === 'document' && request.frame() === page.mainFrame()) row.documents.push({ requestIndex: value.index, url: request.url(), method: request.method(), order: value.order });
      });
      page.on('requestfinished', request => {
        const record = requestRows.get(request); if (record) record.finishedOrder = next();
        if (request.url() === ORIGIN + CHUNK) { row.gate.finishedOrder = next(); markFinished(); }
      });
      page.on('requestfailed', request => row.failedRequests.push({ requestIndex: requestRows.get(request)?.index, url: request.url(), error: request.failure()?.errorText, order: next() }));
      page.on('response', response => {
        const request = response.request(), record = { requestIndex: requestRows.get(request)?.index, url: response.url(), status: response.status(), order: next() };
        row.responses.push(record);
        const job = (async () => {
          try {
            const body = await response.body(), url = new URL(response.url()), source = requestRows.get(request); assert(source); assert.equal(response.status(), 200);
            record.body = bodyRef(body);
            if (url.origin === ORIGIN) {
              const full = path.resolve(DIST, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'); assert(full.startsWith(DIST + path.sep));
              const actual = fs.statSync(full).isDirectory() ? path.join(full, 'index.html') : full, built = fs.readFileSync(actual);
              assert(built.equals(body), 'Actual response body equals the held production file'); record.built = { source: path.relative(ROOT, actual).replaceAll('\\', '/'), ...bodyRef(built) };
            } else { assert(source.expectedBody, 'External response has a declared local body'); assert.equal(sha(body), source.expectedBody.sha256); record.localBody = source.expectedBody; }
            record.completedOrder = next();
            if (url.href === ORIGIN + CHUNK) { Object.assign(row.gate, { completed: true, completedOrder: record.completedOrder, responseBody: record.body }); markCompleted(); }
          } catch (error) { record.error = String(error.stack || error); }
        })(); pending.add(job); job.finally(() => pending.delete(job));
      });
      async function drain() { while (pending.size) await bounded(Promise.all([...pending]), 'actual completed response bodies'); }
      async function snapshot(label) {
        await drain();
        const value = await page.evaluate(key => {
          const store = storage => Object.fromEntries(Object.keys(storage).sort().map(name => [name, storage.getItem(name)]));
          const loading = document.querySelector('[aria-label="Opening the press room"]'), room = document.querySelector('[data-press-room] [role="dialog"]'), active = document.activeElement;
          return { save: localStorage.getItem(key), local: store(localStorage), session: store(sessionStorage), parent: !!document.querySelector('[data-press-room-open]'),
            html: document.body.innerHTML, main: document.querySelector('#dukb-main')?.outerHTML ?? null, focus: active?.outerHTML ?? null, tileFocused: active === document.querySelector('[data-press-room-open]'),
            loading: !!loading, room: !!room, failure: !!document.querySelector('#press-room-failure-title'), focusInside: !!loading && loading.contains(active), roomFocusInside: !!room && room.contains(active),
            modal: loading?.getAttribute('aria-modal') ?? null, tabIndex: loading?.tabIndex ?? null, y: scrollY, overflow: document.body.style.overflow,
            href: location.href, online: navigator.onLine, identity: window.__pressLoading1415,
            performanceObservedOnly: { timeOrigin: performance.timeOrigin, navigations: performance.getEntriesByType('navigation').map(item => ({ name: item.name, type: item.type })) } };
        }, SAVE);
        const order = next(), ref = put(`${id}/${label}.json`, value); row.observations.push({ label, order, gate: clone(row.gate), ...ref }); return { value, order, ref };
      }
      async function nativeAction(label, action) {
        await page.evaluate(value => { window.__pressLoading1415.action = value; }, label);
        const beforeOrder = next();
        if (action === 'Escape') await page.keyboard.press('Escape'); else if (touch) await action.tap(); else await action.click();
        const events = await page.evaluate(value => window.__pressLoading1415.events.filter(entry => entry.action === value), label);
        const observation = { label, action: action === 'Escape' ? 'page.keyboard.press(Escape)' : touch ? 'locator.tap()' : 'locator.click()', beforeOrder, afterOrder: next(), events };
        row.actions.push(observation); assert(events.length > 0 && events.every(event => event.trusted), 'Actual trusted native input');
        if (action === 'Escape') assert.equal(events.filter(event => event.type === 'keydown' && event.key === 'Escape').length, 1);
        else { assert.equal(events.filter(event => event.type === 'click').length, 1); assert(events.some(event => event.type === 'pointerdown' && event.pointerType === (touch ? 'touch' : 'mouse'))); }
        return observation;
      }
      let before, clickY;
      function preserve(label, observed, closed = false, overflow = before.overflow) {
        const value = { before, after: observed, expectedY: clickY, expectedOverflow: overflow, closed, documents: clone(row.documents) };
        const ref = put(`${id}/${label}-preservation.json`, value); row.preservations.push({ label, ...ref }); assert.deepEqual(preservationFindings(value), [], label); return value;
      }
      async function capture(label, selector, buttonSelector) {
        await page.evaluate(async () => { await document.fonts.ready; });
        const value = await page.locator(selector).evaluate(async (element, { requestedWidth, buttonSelector }) => {
          const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
          const painted = node => { const rect = box(node), style = getComputedStyle(node), point = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return !!point && (point === node || node.contains(point)) && style.visibility === 'visible' && style.display !== 'none' && Number(style.opacity) === 1; };
          let signature = '', stable = 0, value; const started = performance.now();
          do {
            await new Promise(requestAnimationFrame); const button = document.querySelector(buttonSelector), active = document.activeElement;
            if (!button || !active) throw Error('Actual visible panel focus or Back control missing');
            value = { width: innerWidth, height: innerHeight, requestedWidth, clientWidth: document.documentElement.clientWidth, scale: visualViewport?.scale ?? 1,
              overflow: document.documentElement.scrollWidth > innerWidth + 1, rect: box(element), opacity: Number(getComputedStyle(element).opacity), painted: painted(element),
              button: { ...box(button), painted: painted(button) }, focus: { inside: element.contains(active), html: active.outerHTML, rect: box(active), painted: painted(active) },
              fonts: document.fonts.status === 'loaded' && ['Inter', 'Space Grotesk'].every(family => document.fonts.check(`400 16px "${family}"`, 'Press room')),
              fontFaces: [...document.fonts].map(face => ({ family: face.family, status: face.status })), animations: document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length };
            const current = JSON.stringify(value); stable = current === signature ? stable + 1 : 1; signature = current;
            if (stable >= 4 && value.animations === 0 && value.fonts) break;
          } while (performance.now() - started < 10000);
          return { ...value, stable };
        }, { requestedWidth: width, buttonSelector });
        const layout = put(`${id}/${label}-layout.json`, value); row.layouts.push({ label, ...layout }); assert.deepEqual(layoutFindings(value), []);
        const atShot = await snapshot(`${label}-at-shot`), file = `${id}/${label}.png`; assert(!fs.existsSync(path.join(OUT, file)));
        await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.shots.push({ label, file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))), layout, observation: atShot.ref }); return value;
      }
      try {
        await page.goto(PAGE, { waitUntil: 'networkidle' }); const tile = page.locator('[data-press-room-open]'); await tile.waitFor({ state: 'visible' });
        await tile.scrollIntoViewIfNeeded(); await page.evaluate(async () => { await document.fonts.ready; });
        before = (await snapshot('before-open')).value;
        assert(before.parent && before.save); assert.equal(before.href, PAGE); assert.equal(before.save, JSON.stringify(fixture));
        assert.equal(before.local['press-keyboard-unrelated'], 'local-sentinel'); assert.equal(before.session['press-keyboard-unrelated'], 'session-sentinel');
        assert.equal(row.requests.filter(request => request.url === ORIGIN + CHUNK).length, 0, 'The actual PressRoom module has not loaded');
        enabled = true; const clicked = await nativeAction('open-pending', tile); clickY = clicked.events.find(event => event.type === 'click').y;
        await bounded(chunkHeld, 'actual held PressRoom request'); const loading = page.getByRole('dialog', { name: 'Opening the press room', exact: true });
        await loading.waitFor({ state: 'visible' }); const pendingState = (await snapshot('pending-open')).value;
        preserve('pending-open', pendingState); const pendingObservation = { focusInside: pendingState.focusInside, modal: pendingState.modal, tabIndex: pendingState.tabIndex,
          held: row.gate.held, released: row.gate.released, completed: row.gate.completed, room: pendingState.room };
        row.pending = put(`${id}/pending-outcome.json`, pendingObservation); assert.deepEqual(pendingFindings(pendingObservation), []);
        const pendingLayout = await capture('pending', '[aria-label="Opening the press room"]', '[aria-label="Opening the press room"] button');
        await nativeAction('dismiss-pending', mode === 'escape' ? 'Escape' : loading.getByRole('button', { name: /Back to your career/ }));
        await loading.waitFor({ state: 'hidden' }); const closed = await snapshot('pending-dismissed'); const closedPreservation = preserve('pending-dismissed', closed.value, true);
        assert.equal(row.gate.completed, false); assert.equal(row.gate.released, false); row.gate.closedOrder = closed.order;
        releaseChunk('after-native-loading-dismissal'); await bounded(Promise.all([chunkCompleted, chunkFinished]), 'unchanged PressRoom bytes and native request completion');
        await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
        const late = (await snapshot('late-chunk-settled')).value; preserve('late-chunk-settled', late, true);
        const lateObservation = { closedBefore: !closed.value.loading && !closed.value.room, closedAfter: late.tileFocused,
          loading: late.loading, room: late.room, failure: late.failure, requests: row.requests.filter(request => request.url === ORIGIN + CHUNK).length,
          bodyHeld: row.gate.responseBody?.sha256 === chunkBody.sha256, finished: !!row.gate.finishedOrder,
          heldOrder: row.gate.heldOrder, closedOrder: row.gate.closedOrder, releaseOrder: row.gate.releaseOrder, completedOrder: row.gate.completedOrder };
        row.lateRelease = put(`${id}/late-release-outcome.json`, lateObservation); assert.deepEqual(releaseFindings(lateObservation), []);
        await nativeAction('open-healthy', tile); const room = page.locator('[data-press-room] [role="dialog"]'); await room.waitFor({ state: 'visible' });
        await page.getByText('Say it, then back it up', { exact: true }).waitFor(); const healthy = (await snapshot('healthy-reopened')).value;
        preserve('healthy-reopened', healthy, false, 'hidden'); assert(healthy.roomFocusInside && !healthy.loading && !healthy.failure);
        assert.equal(await room.locator('[data-press-start]').count(), 1); await capture('settled', '[data-press-room] [role="dialog"]', '[data-press-close]');
        await nativeAction('escape-healthy', 'Escape'); await room.waitFor({ state: 'hidden' }); preserve('healthy-escaped', (await snapshot('healthy-escaped')).value, true);
        await nativeAction('reopen-for-back', tile); await room.waitFor({ state: 'visible' });
        const reopened = (await snapshot('healthy-reopened-for-back')).value; preserve('healthy-reopened-for-back', reopened, false, 'hidden'); assert(reopened.roomFocusInside);
        await nativeAction('back-healthy', room.locator('[data-press-close]')); await room.waitFor({ state: 'hidden' });
        const final = (await snapshot('healthy-back-closed')).value; preserve('healthy-back-closed', final, true);
        row.finalView = put(`${id}/actual-final-view.json`, await oracle.evaluate(value => PressMarketOracle.press.pressRoomView(JSON.parse(value)), final.save));
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(OUT, row.finalView.file))), fixtureView, 'Reading and closing did not answer or change eligibility');
        await page.waitForLoadState('networkidle'); await drain();
        assert.equal(row.requests.filter(request => request.url === ORIGIN + CHUNK).length, 1); assert.equal(row.documents.length, 1); assert.equal(row.documents[0].url, PAGE);
        assert(row.fonts.length > 0); assert(row.responses.length > 0 && row.responses.every(response => response.body && !response.error && (response.built || response.localBody)));
        assert(row.requests.every(request => request.routeCompletedOrder && request.finishedOrder && !request.error));
        assert.deepEqual(row.failedRequests, []); assert.deepEqual(row.errors, []); assert.deepEqual(row.console.filter(message => message.type === 'error'), []);
        assert.equal(row.shots.length, 2); assert.equal(row.actions.length, 6);
        if (width === 390 && mode === 'escape') {
          copiedControl('pending-focus', pendingObservation, value => { value.focusInside = false; }, pendingFindings, ['focus']);
          copiedControl('pending-modal', pendingObservation, value => { value.modal = null; }, pendingFindings, ['modal']);
          copiedControl('late-reopen', lateObservation, value => { value.room = true; }, releaseFindings, ['late-reopen']);
          copiedControl('whole-save', closedPreservation, value => { value.after.save += ' '; }, preservationFindings, ['save']);
          copiedControl('document-identity', closedPreservation, value => { value.after.identity.nonce = 'other-document'; }, preservationFindings, ['document']);
          copiedControl('back-target', pendingLayout, value => { value.button.height = 20; }, layoutFindings, ['target']);
        }
        row.holds = heldInventories(id); row.status = 'passed'; console.log(`PASS Press Room loading ${id}: held chunk, native ${mode}, late closed, healthy Escape and Back, whole career and stores held.`);
      } catch (error) {
        row.status = 'failed'; row.error = String(error.stack || error);
        await snapshot('failure-final').catch(failure => { row.captureError = String(failure.stack || failure); });
        const file = `${id}/failure.png`; try { assert(!fs.existsSync(path.join(OUT, file))); await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.failureShot = { file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))) }; }
        catch (failure) { row.screenshotError = String(failure.stack || failure); }
      } finally {
        releaseChunk('failure-cleanup-only');
        try { await drain(); } catch (error) { row.status = 'failed'; row.cleanupDrainError = String(error.stack || error); }
        try { await context.close(); } catch (error) { row.status = 'failed'; row.cleanupCloseError = String(error.stack || error); }
        try { await drain(); } catch (error) { row.status = 'failed'; row.cleanupFinalDrainError = String(error.stack || error); }
        put(`${id}/raw-case.json`, row);
      }
      assert.equal(row.status, 'passed', `${id} actual journey passed`);
    }
    assert.equal(report.cases.length, 4); assert(report.cases.every(row => row.status === 'passed')); assert.equal(report.cases.flatMap(row => row.shots).length, 8);
    assert.equal(report.controls.length, 6); report.status = 'passed'; report.qualified = true;
  } finally {
    if (oracleContext) await oracleContext.close(); if (browser) await browser.close();
    report.finalHolds = heldInventories('final'); report.held = true;
  }
} catch (error) { report.status = 'failed'; report.qualified = false; report.error = String(error.stack || error); process.exitCode = 1; }
finally {
  put('report.json', report); console.log(`Press Room loading browser: ${report.status}, ${report.cases.length} actual journeys, ${report.controls.length} copied observation controls.`);
}
