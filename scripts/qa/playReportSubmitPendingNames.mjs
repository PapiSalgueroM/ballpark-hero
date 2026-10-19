/* Actual report buttons through one locally intercepted relay and direct fallback. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { chromium } from '../lib/playwrightLoader.mjs';
import { readPlan, sourceForArm } from './reportSubmitPendingNames1433.mjs';
const root = process.cwd(), base = process.env.BASE_URL || 'http://127.0.0.1:4173', api = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const mode = process.env.REPORT_PENDING_NAMES_MODE, arm = process.env.REPORT_PENDING_NAMES_ARM || 'normal', evidenceRoot = process.env.REPORT_PENDING_NAMES_OUT;
const require = createRequire(path.join(root, 'package.json'));
assert(require.cache[require.resolve('./scripts/lib/offlineTransport.cjs')]); assert.equal(process.env.SIM_NETWORK, 'offline'); assert(['1', 'true'].includes(process.env.CI));
assert.equal(base, 'http://127.0.0.1:4173'); assert(['baseline', 'fixed'].includes(mode)); assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(root, evidenceRoot).split(path.sep).includes('..'));
assert(['normal', 'footer-omission', 'game-omission', 'whole-original', 'restored'].includes(arm)); if (mode === 'baseline') assert.equal(arm, 'normal');
assert(process.env.SIM_OFFLINE_RECEIPT && fs.existsSync(process.env.SIM_OFFLINE_RECEIPT) && fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size === 0);
const out = path.join(evidenceRoot, 'browser', arm); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const hash = body => createHash('sha256').update(body).digest('hex'), git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
const sourceBefore = tracked.toString('utf8').split('\0').filter(Boolean).map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
const plan = readPlan(root, mode, arm), expectedForms = sourceForArm(plan, arm);
for (const [file, body] of Object.entries(expectedForms)) assert.equal(fs.readFileSync(file, 'utf8'), body, 'Whole exact form source arm');
const inventory = directory => { const rows = []; const visit = relative => { for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
  assert(!entry.isSymbolicLink()); const file = path.join(relative, entry.name); if (entry.isDirectory()) visit(file); else { assert(entry.isFile()); const body = fs.readFileSync(path.join(directory, file)); rows.push({ file: file.split(path.sep).join('/'), bytes: body.length, sha256: hash(body) }); }
} }; visit(''); assert(rows.length); return rows; };
const distBefore = inventory(path.resolve('dist')), coreDir = path.dirname(require.resolve('playwright-core'));
const packageVersion = JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('playwright')), 'package.json'))).version;
assert.equal(packageVersion, '1.64.0'); assert.equal(JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'))).version, packageVersion);
const coreBody = fs.readFileSync(path.join(coreDir, 'lib/coreBundle.js')), browsersBody = fs.readFileSync(path.join(coreDir, 'browsers.json'));
const installedChromium = JSON.parse(browsersBody).browsers.filter(row => ['chromium', 'chromium-headless-shell'].includes(row.name)); assert.equal(installedChromium.length, 2);
const binaryRoot = process.env.PLAYWRIGHT_BROWSERS_PATH; assert(binaryRoot && path.isAbsolute(binaryRoot)); const publicExecutablePath = chromium.executablePath(); assert(fs.realpathSync(publicExecutablePath).startsWith(fs.realpathSync(binaryRoot) + path.sep));
fs.writeFileSync(path.join(out, 'actual-browsers.json'), browsersBody, { flag: 'wx' });
const cacheRoot = process.env.FREE_KICK_FONT_CACHE; assert(cacheRoot && path.isAbsolute(cacheRoot));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(cacheRoot, 'manifest.json'))).map(row => { const body = fs.readFileSync(path.join(cacheRoot, row.file)); assert.equal(hash(body), row.sha256); return [row.url, { body, contentType: row.contentType }]; }));
const forms = [
  { id: 'footer', route: '/', source: 'footer-report-button', gameType: 'site', name: 'Send report', success: 'Got it, thank you!', trigger: '#root footer' },
  { id: 'game', route: '/perfect-season-nba', source: 'game-report-button', gameType: 'perfect-season-nba', name: 'Submit Report', success: 'Thanks for reporting!', trigger: '#root [data-seo-content] > [data-no-prerender]' },
];
const specs = forms.flatMap(form => { if (arm === 'footer-omission' && form.id !== 'footer' || arm === 'game-omission' && form.id !== 'game') return []; return (['normal', 'restored'].includes(arm) ? [390, 1280] : [390]).map(width => ({ id: form.id + '-' + width, form, width })); });
const report = { version: 1, mode, arm, status: 'failed', productQualified: false, startedAtUtc: new Date().toISOString(),
  scope: 'Actual submit names and native Chromium AX through one fully intercepted relay/fallback delivery. No real report/email/DB, spoken AT or broad accessibility qualification. Explicit native trigger positioning, no no-scroll claim.',
  clock: 'Native route/font setup precedes paused finite PageClock. Later explicit dialog and success deadline turns are PageClock, not native wall-clock/rAF credit.',
  nativeMethod: { engine: 'chromium', packageVersion, coreSha256: hash(coreBody), browsersJsonSha256: hash(browsersBody), installedChromium, binaryRoot, publicExecutablePath },
  sourceBefore, sourceAfter: null, formSha256: Object.fromEntries(Object.entries(expectedForms).map(([file, body]) => [file, hash(body)])), sourceStatusSha256: hash(status),
  distBefore, distAfter: null, census: specs.map(({ id, form, width }) => ({ id, form: form.id, route: form.route, width })), cases: [], cleanupErrors: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'), wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = async (row, label, run, timeoutMs = 15000) => { const item = { label, timeoutMs, status: 'pending' }; row.waits.push(item); save(); let timer;
  try { const value = await Promise.race([run(), new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), timeoutMs); })]); item.status = 'passed'; return value; }
  catch (error) { item.status = 'failed'; item.error = String(error?.stack || error); throw error; } finally { clearTimeout(timer); save(); }
};
const stores = page => page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }));
save();
try {
  for (const [index, spec] of specs.entries()) {
    const { form, width } = spec, row = { id: spec.id, form: form.id, route: form.route, width, touch: width === 390, nativeLaunchOrdinal: index + 1, status: 'failed',
      lifecycle: { launched: false, contextCreated: false, pageCreated: false, cdpDetached: false, contextClosed: false, browserClosed: false }, requests: [], finishedRequests: [], reportRequests: [], readFixtures: [], externalFulfilled: [], responseObservers: [], assets: [], errors: [], unexpectedWrites: [], actions: [], events: [], observations: [], axSnapshots: [], nameChecks: [], screenshots: [], waits: [] };
    report.cases.push(row); save(); let browser, context, page, cdp;
    const held = new Map(), requestMap = new Map(), pendingRoutes = new Set(), observers = [];
    const requestRecord = request => { if (!requestMap.has(request)) { const value = { id: row.requests.length, url: request.url(), method: request.method(), resourceType: request.resourceType(), terminal: 'pending' }; requestMap.set(request, value); row.requests.push(value); } return requestMap.get(request); };
    const cors = request => ({ 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,prefer', 'access-control-expose-headers': 'date' });
    const poll = async (label, read, test) => bounded(row, label, async () => { for (let i = 0; i < 300; i++) { const value = await read(); if (test(value)) return value; await wall(20); } assert.fail('Finite setup failed: ' + label); });
    try {
      browser = await bounded(row, 'launch fresh Chromium', () => chromium.launch({ headless: true }), 45000); row.lifecycle.launched = true; row.lifecycle.launchedAtUtc = new Date().toISOString();
      row.browserVersion = browser.version(); assert(installedChromium.some(entry => entry.browserVersion === row.browserVersion)); row.publicExecutablePath = chromium.executablePath();
      context = await bounded(row, 'fresh context', () => browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: row.touch, hasTouch: row.touch, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:' + form.route, value: '1' }, { name: 'report-pending-held-save', value: '{"held":"unrelated"}' }] }] } })); row.lifecycle.contextCreated = true;
      await bounded(row, 'strict local fixtures', () => context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), captured = requestRecord(request); pendingRoutes.add(captured.id);
        const fulfill = async (kind, options) => { await route.fulfill(options); row.externalFulfilled.push({ requestId: captured.id, kind, url: url.href, status: options.status }); save(); };
        const json = (kind, reply, status = 200) => fulfill(kind, { status, headers: cors(request), contentType: 'application/json', body: JSON.stringify(reply) });
        try {
          if (url.origin === base) { assert.equal(request.method(), 'GET'); return await route.continue(); }
          const channel = url.origin === api && url.search === '' ? url.pathname === '/functions/v1/report-relay' ? 'relay' : url.pathname === '/rest/v1/question_reports' ? 'fallback' : null : null;
          if (request.method() === 'OPTIONS') { assert.equal(url.origin, api); assert(channel || url.pathname === '/rest/v1/rpc/most_played_today'); return await fulfill('exact-api-preflight', { status: 204, headers: cors(request), body: '' }); }
          if (channel) { assert.equal(request.method(), 'POST'); assert(!held.has(channel)); assert(!row.reportRequests.some(value => value.channel === channel));
            const entry = { channel, requestId: captured.id, url: url.href, method: 'POST', rawBody: request.postData(), body: request.postDataJSON(), intercepted: true, fulfilled: false }; row.reportRequests.push(entry); save();
            return await new Promise(resolve => held.set(channel, async reply => { await json('held-report-' + channel, reply, channel === 'fallback' ? 201 : 200); entry.reply = reply; entry.fulfilled = true; held.delete(channel); resolve(); save(); }));
          }
          if (url.origin === api && url.pathname === '/rest/v1/live_scores' && request.method() === 'GET') {
            assert.deepEqual([...url.searchParams.keys()], ['select', 'order', 'limit', 'start_at', 'start_at']); assert.equal(url.searchParams.get('select'), '*'); assert.equal(url.searchParams.get('order'), 'start_at.asc'); assert.equal(url.searchParams.get('limit'), '150');
            const dates = url.searchParams.getAll('start_at'); assert(/^gte\.\d{4}-\d\d-\d\dT[0-9:.]+Z$/.test(dates[0]) && /^lte\.\d{4}-\d\d-\d\dT[0-9:.]+Z$/.test(dates[1])); assert.equal(Date.parse(dates[1].slice(4)) - Date.parse(dates[0].slice(4)), 32 * 3600000);
            row.readFixtures.push({ requestId: captured.id, kind: 'live-scores-empty', url: url.href, method: 'GET', reply: [] }); return await json('live-scores-empty', []);
          }
          if (url.href === api + '/rest/v1/rpc/most_played_today' && request.method() === 'POST') { assert.equal(form.id, 'footer'); assert.equal(request.postData(), '{"p_min":3,"p_limit":3}'); row.readFixtures.push({ requestId: captured.id, kind: 'most-played-empty', rawBody: request.postData(), reply: [] }); return await json('most-played-empty', []); }
          if (fonts.has(url.href)) { assert.equal(request.method(), 'GET'); return await fulfill('held-font', { status: 200, headers: cors(request), ...fonts.get(url.href) }); }
          row.unexpectedWrites.push({ url: url.href, method: request.method(), rawBody: request.postData() }); assert.fail('Unknown request, no broad empty fixture: ' + request.method() + ' ' + url.href);
        } catch (error) { row.errors.push('Route: ' + String(error?.stack || error)); try { await route.abort('failed'); } catch (abortError) { row.errors.push(String(abortError)); } } finally { pendingRoutes.delete(captured.id); save(); }
      }));
      await bounded(row, 'refuse unknown WebSockets', () => context.routeWebSocket('**/*', socket => { row.errors.push('Unknown WebSocket: ' + socket.url()); socket.close(); }));
      await bounded(row, 'passive same-response telemetry', () => context.addInitScript(() => {
        window.__reportNames = { events: [], transport: [], rejections: [], randomCalls: 0 };
        const random = Math.random; Math.random = function (...args) { window.__reportNames.randomCalls++; return Reflect.apply(random, this, args); };
        const nativeFetch = window.fetch.bind(window); window.fetch = async (...args) => { const req = args[0], url = new URL(req instanceof Request ? req.url : String(req), location.href), trace = url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' ? { url: url.href, method: args[1]?.method || (req instanceof Request ? req.method : 'GET'), responseResolved: false, bodyConsumed: false } : null;
          if (trace) window.__reportNames.transport.push(trace); const response = await nativeFetch(...args); if (trace) { trace.responseResolved = true; for (const method of ['text', 'json']) { const read = response[method].bind(response); response[method] = async (...readArgs) => { const value = await read(...readArgs); trace.bodyConsumed = true; trace.reader = method; return value; }; } } return response;
        };
        window.addEventListener('unhandledrejection', event => window.__reportNames.rejections.push(String(event.reason?.stack || event.reason)));
        for (const type of ['click', 'touchstart', 'keydown', 'input', 'focus', 'blur']) window.addEventListener(type, event => { const target = event.target instanceof Element ? event.target.closest('button,textarea') : null; if (target) window.__reportNames.events.push({ type, trusted: event.isTrusted, key: event.key || null, label: target.getAttribute('aria-label') || target.textContent?.trim(), tag: target.tagName, time: performance.now() }); }, { capture: true, passive: true });
      }));
      page = await bounded(row, 'create page', () => context.newPage()); row.lifecycle.pageCreated = true; page.setDefaultTimeout(15000);
      page.on('request', requestRecord); page.on('requestfinished', request => { const value = requestRecord(request); value.terminal = 'finished'; row.finishedRequests.push({ requestId: value.id, url: value.url }); });
      page.on('requestfailed', request => { const value = requestRecord(request); value.terminal = 'failed'; row.errors.push('Request: ' + value.url + ' ' + JSON.stringify(request.failure())); });
      page.on('pageerror', error => row.errors.push('Page: ' + error.message)); page.on('console', message => { if (message.type() === 'error') row.errors.push('Console: ' + message.text()); });
      page.on('response', response => { const request = requestRecord(response.request()), observer = { requestId: request.id, url: response.url(), status: 'pending' }; row.responseObservers.push(observer); save(); observers.push((async () => {
        try { await bounded(row, 'response body and finished ' + request.id, async () => {
          if (new URL(response.url()).origin === base) {
            assert.equal(response.status(), 200); const body = await response.body(), url = new URL(response.url()); let member = decodeURIComponent(url.pathname); member = member.endsWith('/') ? member + 'index.html' : path.extname(member) ? member : member + '/index.html';
            const physical = path.resolve('dist', '.' + member); assert(physical.startsWith(path.resolve('dist') + path.sep)); const expected = fs.readFileSync(physical); assert(body.equals(expected), 'Every local body equals physical completed dist'); row.assets.push({ requestId: request.id, member: path.relative(path.resolve('dist'), physical).split(path.sep).join('/'), bytes: body.length, sha256: hash(body), physicalSha256: hash(expected), headers: response.headers() });
          }
          assert.equal(await response.finished(), null, 'Every actual response finishes without error');
        }, 30000); observer.status = 'passed'; } catch (error) { observer.status = 'failed'; observer.error = String(error?.stack || error); row.errors.push(observer.error); } finally { save(); }
      })()); });
      cdp = await bounded(row, 'attach actual Chromium CDP', () => context.newCDPSession(page)); await bounded(row, 'enable native AX', () => cdp.send('Accessibility.enable'));
      const trigger = page.locator(form.trigger).getByRole('button', { name: 'Report a problem', exact: true }), dialog = page.getByRole('dialog', { name: 'Report a problem', exact: true });
      const textbox = dialog.getByRole('textbox', { name: 'Describe the problem', exact: true }), send = dialog.locator('button.w-full');
      const position = async (locator, label) => { const value = await locator.evaluate(element => { element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scrollX, scrollY, viewportWidth: innerWidth, viewportHeight: innerHeight }; }); row.actions.push({ action: 'native DOM positioning', label, ...value }); assert(value.width > 0 && value.height > 0 && value.x >= 0 && value.y >= 0 && value.x + value.width <= width + 1 && value.y + value.height <= 845); save(); };
      const activate = async (locator, label) => { assert.equal(await locator.count(), 1); assert(await locator.isVisible()); const box = await locator.boundingBox(); assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= 845); if (row.touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); else { await locator.focus(); await page.keyboard.press('Enter'); } row.actions.push({ action: 'native activation', label, input: row.touch ? 'touch' : 'keyboard Enter' }); save(); };
      const read = () => page.evaluate(() => { const dialog = document.querySelector('[role="dialog"]'), button = dialog?.querySelector('button.w-full'), field = dialog?.querySelector('textarea'); return { dialog: !!dialog, details: field?.value ?? null, category: [...(dialog?.querySelectorAll('button.rounded-full.bg-primary') || [])].map(value => value.textContent.trim()), disabled: button?.disabled ?? null, buttonText: button?.textContent ?? null, attributes: button ? Object.fromEntries([...button.attributes].map(value => [value.name, value.value])) : null, spinner: button?.querySelectorAll('svg.animate-spin').length ?? 0, success: !!dialog?.querySelector('.text-correct'), stores: { local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }, telemetry: window.__reportNames }; });
      const tick = ms => bounded(row, 'PageClock advance ' + ms, () => page.clock.runFor(ms));
      const screenshot = async phase => { for (const fullPage of [false, true]) { const file = spec.id + '-' + phase + (fullPage ? '-full.png' : '-viewport.png'); await bounded(row, 'PNG ' + file, () => page.screenshot({ path: path.join(out, file), fullPage, animations: 'allow', timeout: 10000 })); const body = fs.readFileSync(path.join(out, file)); row.screenshots.push({ phase, file, bytes: body.length, sha256: hash(body) }); } save(); };
      await bounded(row, 'navigate actual report route', () => page.goto(base + form.route, { waitUntil: 'domcontentloaded' }), 30000); await trigger.waitFor(); assert.equal(await trigger.count(), 1);
      if (form.id === 'game') { await page.locator('#root [data-seo-content="ready"]').waitFor(); assert(await trigger.evaluate(element => !!element.closest('[data-seo-content]')?.querySelector('article') && element.closest('[data-no-prerender]').parentElement.firstElementChild === element.closest('[data-no-prerender]'))); }
      await bounded(row, 'native fonts ready', () => page.evaluate(() => document.fonts.ready)); await position(trigger, 'initial actual trigger');
      row.nativePreClockFrames = await bounded(row, 'native pre-clock frames', () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(a => requestAnimationFrame(b => resolve([a, b])))))); assert(row.nativePreClockFrames[1] > row.nativePreClockFrames[0]);
      if (form.id === 'footer') await poll('native home scroll save', () => page.evaluate(() => ({ y: scrollY, saved: sessionStorage.getItem('home-scroll-y') })), value => value.y > 0 && value.saved === String(value.y));
      row.hydratedDateET = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()));
      await page.clock.install({ time: new Date('2026-10-18T16:00:00.000Z') }); await page.clock.pauseAt(new Date('2026-10-18T16:00:01.000Z'));
      await activate(trigger, 'open real report form'); await tick(250); await textbox.waitFor();
      const details = 'QA fictional pending-name report ' + spec.id;
      if (row.touch) { const box = await textbox.boundingBox(); assert(box); await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); } else await textbox.click();
      await page.keyboard.insertText(details); await activate(dialog.getByRole('button', { name: 'Bug', exact: true }), 'choose existing Bug category');
      assert.equal(await textbox.inputValue(), details); row.storesBefore = await stores(page); assert.equal(row.storesBefore.local['report-pending-held-save'], '{"held":"unrelated"}'); row.cookiesAfterFixture = await context.cookies(); assert.deepEqual(row.cookiesAfterFixture, []); row.randomCallsBefore = await page.evaluate(() => window.__reportNames.randomCalls);
      const expectedContext = await page.evaluate(({ source, game, puzzleDate }) => { const entry = document.querySelector('script[type="module"][src]'); const value = { path: location.pathname, date: '2026-10-18', submittedAt: new Date().toISOString(), source, contextTruncated: false };
        if (game) Object.assign(value, { phase: 'mode-select', mode: 'classic', puzzleDate, decade: null, theme: null, spins: 0, rerolls: 2, squad: null, selected: null, picks: ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'].map(slot => [slot, null]), openSlots: ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'], result: null, lockedResult: null });
        value.diagnostics = { build: new URL(entry.src).pathname.split('/').pop(), viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, browser: navigator.userAgent.slice(0, 200), language: navigator.language }; return value;
      }, { source: form.source, game: form.id === 'game', puzzleDate: row.hydratedDateET });
      row.expectedPayload = { game_type: form.gameType, game_context: expectedContext, description: 'Bug: ' + details };
      const snapshot = async phase => {
        const dom = await read(); assert(dom.dialog && !dom.success); assert.equal(dom.details, details); assert.deepEqual(dom.category, ['Bug']); assert.deepEqual(dom.stores, row.storesBefore); assert.equal(dom.telemetry.randomCalls, row.randomCallsBefore); assert.deepEqual(dom.telemetry.rejections, []);
        const pending = phase !== 'idle'; assert.equal(dom.disabled, pending); assert.equal(dom.spinner, pending ? 1 : 0); assert.equal(dom.buttonText.trim(), pending ? '' : form.name);
        const document = await bounded(row, phase + ' native document', () => cdp.send('DOM.getDocument')), selected = await bounded(row, phase + ' actual button selection', () => cdp.send('DOM.querySelector', { nodeId: document.root.nodeId, selector: '[role="dialog"] button.w-full' })); assert(selected.nodeId > 0);
        const description = await bounded(row, phase + ' actual button backend', () => cdp.send('DOM.describeNode', { nodeId: selected.nodeId })), partialAX = await bounded(row, phase + ' native partial AX', () => cdp.send('Accessibility.getPartialAXTree', { nodeId: selected.nodeId, fetchRelatives: true })), fullAX = await bounded(row, phase + ' native full AX', () => cdp.send('Accessibility.getFullAXTree'));
        const backend = description.node.backendNodeId, nodes = fullAX.nodes.filter(value => value.backendDOMNodeId === backend && !value.ignored); assert.equal(nodes.length, 1); const native = nodes[0]; assert.equal(native.role.value, 'button');
        assert.equal(partialAX.nodes.filter(value => value.backendDOMNodeId === backend && !value.ignored).length, 1); assert.equal(description.node.nodeName, 'BUTTON');
        if (phase === 'idle') row.buttonBackendNodeId = backend; else assert.equal(backend, row.buttonBackendNodeId, 'Same physical submit button in both pending channels');
        const disabled = native.properties?.find(value => value.name === 'disabled')?.value.value === true; assert.equal(disabled, pending);
        const name = native.name?.value || '', expectedFailure = pending && (mode === 'baseline' || arm === 'whole-original' || arm === form.id + '-omission');
        const passed = name === form.name;
        row.nameChecks.push({ phase, purpose: 'The actual ' + form.id + ' submit button retains its idle accessible name while delivery is pending', expectedName: form.name, actualName: name, passed, expectedFailure });
        const file = spec.id + '-' + phase + '-ax.json', body = Buffer.from(JSON.stringify({ phase, dom, document, selected, description, partialAX, fullAX }, null, 2)); fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
        row.axSnapshots.push({ phase, file, bytes: body.length, sha256: hash(body), buttonBackendNodeId: backend, actualName: name, disabled, native }); row.observations.push({ phase, ...dom }); save();
        if (expectedFailure) assert.equal(name, '', 'Original/omission pending button is actually unnamed'); else assert.equal(name, form.name);
        assert.equal(passed, !expectedFailure); await screenshot(phase);
      };
      await snapshot('idle'); await activate(send, 'one actual submit'); await poll('actual held relay', async () => held.has('relay'), Boolean);
      assert.equal(row.reportRequests.length, 1); assert.deepEqual(row.reportRequests[0].body, row.expectedPayload); await snapshot('held-relay');
      await held.get('relay')({ ok: false }); await poll('actual held SDK fallback', async () => held.has('fallback'), Boolean);
      assert.equal(row.reportRequests.length, 2); assert.deepEqual(row.reportRequests[1].body, row.expectedPayload); await snapshot('held-fallback');
      await held.get('fallback')({}); await poll('success after actual fallback', read, value => value.success);
      const success = await read(); assert.equal(success.details, null); assert.equal(await dialog.getByText(form.success, { exact: true }).count(), 1); row.observations.push({ phase: 'success', ...success }); await screenshot('success');
      await tick(1499); assert((await read()).success, 'Success remains at1499ms'); await tick(1); await poll('1500ms closed', () => dialog.count(), value => value === 0); await tick(250); await tick(1);
      assert(await trigger.evaluate(element => document.activeElement === element), 'Actual trigger regains focus'); await position(trigger, 'return to actual trigger'); await activate(trigger, 'reopen after successful reset'); await tick(250); await textbox.waitFor();
      const reopened = await read(); assert.equal(reopened.details, ''); assert.deepEqual(reopened.category, []); assert.equal(reopened.disabled, true); assert.equal(reopened.success, false); row.observations.push({ phase: 'blank-reopened', ...reopened }); await screenshot('blank-reopened');
      row.storesAfter = await stores(page); const telemetry = await page.evaluate(() => window.__reportNames); row.randomCallsAfter = telemetry.randomCalls; row.events = telemetry.events; row.transport = telemetry.transport;
      assert.deepEqual(row.storesAfter, row.storesBefore); assert.equal(row.randomCallsAfter, row.randomCallsBefore); assert.deepEqual(telemetry.rejections, []);
      assert.equal(row.reportRequests.length, 2); assert(row.reportRequests.every(value => value.intercepted && value.fulfilled)); assert.equal(held.size, 0);
      for (const channel of ['relay', 'fallback']) { const pathname = channel === 'relay' ? '/functions/v1/report-relay' : '/rest/v1/question_reports', consumed = row.transport.filter(value => new URL(value.url).pathname === pathname); assert.equal(consumed.length, 1); assert(consumed[0].responseResolved && consumed[0].bodyConsumed, 'Actual SDK consumes the same native response'); }
      assert(row.events.some(value => value.type === 'input' && value.trusted)); assert.equal(row.events.filter(value => value.type === 'click' && value.trusted && value.tag === 'BUTTON' && (value.label === form.name || value.label === '')).length, 1, 'One genuine report submit action');
      if (row.touch) assert(row.events.some(value => value.type === 'touchstart' && value.trusted)); else assert(row.events.some(value => value.type === 'keydown' && value.key === 'Enter' && value.trusted));
      await bounded(row, 'all response observers', () => Promise.all(observers), 45000); assert(row.requests.every(value => value.terminal === 'finished'));
      for (const request of row.requests.filter(value => new URL(value.url).origin !== base)) assert.equal(row.externalFulfilled.filter(value => value.requestId === request.id).length, 1);
      assert(row.assets.length > 5); assert(row.assets.some(value => value.member === (form.route === '/' ? 'index.html' : 'perfect-season-nba/index.html'))); assert.deepEqual(row.errors, []); assert.deepEqual(row.unexpectedWrites, []);
      row.pendingBeforeCleanup = { held: held.size, routes: pendingRoutes.size, observers: row.responseObservers.filter(value => value.status !== 'passed').length }; assert.deepEqual(row.pendingBeforeCleanup, { held: 0, routes: 0, observers: 0 }); row.status = 'passed';
    } catch (error) { row.failure = String(error?.stack || error); if (page) try { const file = spec.id + '-failed-viewport.png'; await bounded(row, 'failure PNG', () => page.screenshot({ path: path.join(out, file), fullPage: false, timeout: 10000 })); const body = fs.readFileSync(path.join(out, file)); row.screenshots.push({ phase: 'failure', file, bytes: body.length, sha256: hash(body) }); } catch (captureError) { row.errors.push(String(captureError)); } }
    finally {
      try {
        for (const [channel, finish] of [...held]) await bounded(row, 'drain held ' + channel, () => finish(channel === 'relay' ? { ok: false } : {}));
        if (cdp) { await bounded(row, 'detach CDP', () => cdp.detach()); row.lifecycle.cdpDetached = true; }
        if (context) { await bounded(row, 'close context', () => context.close()); row.lifecycle.contextClosed = true; row.lifecycle.contextClosedAtUtc = new Date().toISOString(); }
        if (browser) { await bounded(row, 'close browser', () => browser.close()); row.lifecycle.browserClosed = true; row.lifecycle.browserClosedAtUtc = new Date().toISOString(); row.lifecycle.browserConnectedAfterClose = browser.isConnected(); assert.equal(row.lifecycle.browserConnectedAfterClose, false); }
        await bounded(row, 'final observers', () => Promise.all(observers), 45000);
      } catch (error) { row.status = 'failed'; report.cleanupErrors.push(String(error?.stack || error)); }
      row.pendingAfterCleanup = { held: held.size, routes: pendingRoutes.size, observers: row.responseObservers.filter(value => value.status !== 'passed').length }; if (Object.values(row.pendingAfterCleanup).some(value => value !== 0) || row.errors.length) row.status = 'failed'; save();
    }
  }
  assert.equal(report.cases.length, specs.length); assert(report.cases.every(row => row.status === 'passed' && row.nameChecks.length === 3 && row.axSnapshots.length === 3 && row.screenshots.length === 10)); assert.deepEqual(report.cleanupErrors, []);
  report.censusObserved = { contexts: report.cases.length, checks: report.cases.reduce((sum, row) => sum + row.nameChecks.length, 0), faults: report.cases.reduce((sum, row) => sum + row.nameChecks.filter(value => !value.passed).length, 0), healthy: report.cases.reduce((sum, row) => sum + row.nameChecks.filter(value => value.passed).length, 0) };
  const faults = mode === 'baseline' || arm === 'whole-original' ? specs.length * 2 : arm.endsWith('-omission') ? 2 : 0; assert.equal(report.censusObserved.faults, faults); assert.equal(report.censusObserved.healthy, specs.length * 3 - faults);
  report.sourceAfter = sourceBefore.map(({ file }) => ({ file, sha256: hash(fs.readFileSync(file)) })); assert.deepEqual(report.sourceAfter, sourceBefore); assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])));
  report.distAfter = inventory(path.resolve('dist')); assert.deepEqual(report.distAfter, distBefore); assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0);
  report.status = 'passed'; report.fixedBrowserPassed = mode === 'fixed' && ['normal', 'restored'].includes(arm); report.completedAtUtc = new Date().toISOString();
  console.log('Report submit names browser: ' + mode + '/' + arm + ', actual ' + report.censusObserved.contexts + ' contexts, ' + report.censusObserved.faults + ' deliberate name faults.');
} finally { save(); }
