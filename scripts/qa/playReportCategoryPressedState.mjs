/* Actual native category buttons, with fictional held delivery and no clock replacement. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { chromium } from '../lib/playwrightLoader.mjs';
import { FORM_FILES, hash, readPlan, sourceForArm } from './reportCategoryPressedState1437.mjs';

const root = process.cwd(), base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const api = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const mode = process.env.REPORT_CATEGORY_MODE, arm = process.env.REPORT_CATEGORY_ARM || 'normal', evidenceRoot = process.env.REPORT_CATEGORY_OUT;
const require = createRequire(path.join(root, 'package.json'));
assert(require.cache[require.resolve('./scripts/lib/offlineTransport.cjs')], 'Ordinary offline preload is mandatory');
assert.equal(process.env.SIM_NETWORK, 'offline'); assert(['1', 'true'].includes(process.env.CI));
assert.equal(base, 'http://127.0.0.1:4173'); assert(['baseline', 'fixed'].includes(mode));
assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(root, evidenceRoot).split(path.sep).includes('..'));
assert(['normal', 'whole-original', 'footer-omission', 'game-omission', 'restored'].includes(arm));
if (mode === 'baseline') assert.equal(arm, 'normal');
assert(process.env.SIM_OFFLINE_RECEIPT && fs.existsSync(process.env.SIM_OFFLINE_RECEIPT) && fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size === 0);
const out = path.join(evidenceRoot, 'browser', arm); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const rawDir = path.join(out, 'response-bodies'); fs.mkdirSync(rawDir);
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const tracked = git(['ls-files', '-z']);
const sourceBefore = tracked.toString('utf8').split('\0').filter(Boolean).map(file => { const body = fs.readFileSync(file); return { file, bytes: body.length, sha256: hash(body) }; });
const inventory = directory => { const rows = []; const visit = relative => {
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    assert(!entry.isSymbolicLink()); const file = path.join(relative, entry.name);
    if (entry.isDirectory()) visit(file); else { assert(entry.isFile()); const body = fs.readFileSync(path.join(directory, file)); rows.push({ file: file.split(path.sep).join('/'), bytes: body.length, sha256: hash(body) }); }
  }
}; visit(''); assert(rows.length); return rows; };
const plan = readPlan(root, mode, arm), expectedForms = sourceForArm(plan, arm);
assert.deepEqual(Object.keys(expectedForms), FORM_FILES);
for (const file of FORM_FILES) assert.equal(fs.readFileSync(file, 'utf8'), expectedForms[file], 'Whole exact compiled form source arm');
const distBefore = inventory(path.resolve('dist')), coreDir = path.dirname(require.resolve('playwright-core'));
const packageBody = fs.readFileSync(path.join(path.dirname(require.resolve('playwright')), 'package.json'));
const corePackageBody = fs.readFileSync(path.join(coreDir, 'package.json'));
const packageVersion = JSON.parse(packageBody).version; assert.equal(packageVersion, '1.64.0'); assert.equal(JSON.parse(corePackageBody).version, packageVersion);
const coreBody = fs.readFileSync(path.join(coreDir, 'lib/coreBundle.js')), browsersBody = fs.readFileSync(path.join(coreDir, 'browsers.json'));
const installedChromium = JSON.parse(browsersBody).browsers.filter(row => ['chromium', 'chromium-headless-shell'].includes(row.name)); assert.equal(installedChromium.length, 2);
const binaryRoot = process.env.PLAYWRIGHT_BROWSERS_PATH, publicExecutablePath = chromium.executablePath();
assert(binaryRoot && path.isAbsolute(binaryRoot)); assert(fs.realpathSync(publicExecutablePath).startsWith(fs.realpathSync(binaryRoot) + path.sep));
const cacheRoot = process.env.FREE_KICK_FONT_CACHE; assert(cacheRoot && path.isAbsolute(cacheRoot));
const manifestBody = fs.readFileSync(path.join(cacheRoot, 'manifest.json')), fontRows = JSON.parse(manifestBody);
assert(Array.isArray(fontRows) && fontRows.length); const fonts = new Map();
fs.mkdirSync(path.join(out, 'held-fonts'));
for (const [index, entry] of fontRows.entries()) {
  assert.equal(typeof entry.url, 'string'); assert(!fonts.has(entry.url));
  const physical = path.resolve(cacheRoot, entry.file); assert(physical.startsWith(path.resolve(cacheRoot) + path.sep));
  const body = fs.readFileSync(physical); assert.equal(hash(body), entry.sha256);
  const file = 'held-fonts/' + index + '.body'; fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
  fonts.set(entry.url, { body, contentType: entry.contentType, receipt: { ...entry, savedBody: file, bytes: body.length, sha256: hash(body) } });
}
for (const [file, body] of [['actual-browsers.json', browsersBody], ['playwright-package.json', packageBody], ['playwright-core-package.json', corePackageBody], ['font-manifest.json', manifestBody]]) fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
const forms = [
  { id: 'footer', route: '/', source: 'footer-report-button', gameType: 'site', submit: 'Send report', success: 'Got it, thank you!', trigger: '#root footer' },
  { id: 'game', route: '/perfect-season-nba', source: 'game-report-button', gameType: 'perfect-season-nba', submit: 'Submit Report', success: 'Thanks for reporting!', trigger: '#root [data-seo-content] > [data-no-prerender]' },
];
const names = ['Wrong answer', 'Wrong info', 'Bug', 'Idea', 'Other'];
const specs = forms.flatMap(form => {
  if (arm === 'footer-omission' && form.id !== 'footer' || arm === 'game-omission' && form.id !== 'game') return [];
  const widths = mode === 'baseline' || !['normal', 'restored'].includes(arm) ? [390] : [390, 1280];
  return widths.map(width => ({ id: form.id + '-' + width, form, width }));
});
const report = { version: 1, mode, arm, status: 'failed', productQualified: false, startedAtUtc: new Date().toISOString(),
  scope: 'Actual native Chromium category DOM/backend/partial and full AX joins with fictional local relay/fallback delivery. No real reports, spoken assistive technology or full accessibility qualification. Trigger positioning is explicit and carries no global scroll claim.',
  clock: 'Native Date, performance, timers and animation frames throughout. Real bounded waits retain the source1500ms success reset. No PageClock, frozen date, timer replacement or synthetic semantic tree.',
  nativeMethod: { engine: 'chromium', packageVersion, packageSha256: hash(packageBody), corePackageSha256: hash(corePackageBody), coreSha256: hash(coreBody), browsersJsonSha256: hash(browsersBody), installedChromium, binaryRoot, publicExecutablePath },
  sourceBefore, sourceAfter: null, trackedMembersSha256: hash(tracked), formSha256: Object.fromEntries(FORM_FILES.map(file => [file, hash(expectedForms[file])])),
  distBefore, distAfter: null, fonts: { cacheRoot, manifestSha256: hash(manifestBody), entries: [...fonts.values()].map(value => value.receipt) },
  census: specs.map(({ id, form, width }) => ({ id, form: form.id, route: form.route, width })), cases: [], cleanupErrors: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = async (row, label, run, timeoutMs = 15000) => {
  const receipt = { label, timeoutMs, status: 'pending', startedAtUtc: new Date().toISOString() }; row.waits.push(receipt); save(); let timer;
  try { const result = await Promise.race([run(), new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), timeoutMs); })]); receipt.status = 'passed'; return result; }
  catch (error) { receipt.status = 'failed'; receipt.error = String(error?.stack || error); throw error; }
  finally { clearTimeout(timer); receipt.completedAtUtc = new Date().toISOString(); save(); }
};
const bodyReceipt = body => {
  const sha256 = hash(body), file = 'response-bodies/' + sha256 + '.body', absolute = path.join(out, file);
  if (fs.existsSync(absolute)) assert(fs.readFileSync(absolute).equals(body)); else fs.writeFileSync(absolute, body, { flag: 'wx' });
  return { file, bytes: body.length, sha256 };
};
const pollDate = instant => 'eq.' + new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(instant - 12 * 3600000));
save();
try {
  for (const [index, spec] of specs.entries()) {
    const { form, width } = spec;
    const expectedMissing = mode === 'baseline' || arm === 'whole-original' || arm === form.id + '-omission';
    const row = { id: spec.id, form: form.id, route: form.route, width, touch: width === 390, expectedMissing, nativeLaunchOrdinal: index + 1, status: 'failed',
      lifecycle: { launched: false, contextCreated: false, pageCreated: false, cdpDetached: false, contextClosed: false, browserClosed: false },
      requests: [], reportRequests: [], responses: [], externalFulfilled: [], responseObservers: [], assets: [], readFixtures: [], errors: [], unknownTraffic: [], actions: [], events: [], observations: [], axSnapshots: [], pressedChecks: [], screenshots: [], waits: [] };
    report.cases.push(row); save();
    let browser, context, page, cdp; const held = new Map(), requestMap = new Map(), pendingRoutes = new Set(), observers = [];
    let expectedDelivery = null, backendIdentity = null;
    const requestRecord = request => {
      if (!requestMap.has(request)) { const url = new URL(request.url()); const body = request.postDataBuffer();
        const value = { id: row.requests.length, url: request.url(), origin: url.origin, pathname: url.pathname, orderedQuery: [...url.searchParams], method: request.method(), resourceType: request.resourceType(), rawBody: request.postData(), bodyBytes: body?.length ?? 0, bodySha256: body ? hash(body) : null, terminal: 'pending' };
        requestMap.set(request, value); row.requests.push(value);
      } return requestMap.get(request);
    };
    const cors = request => ({ 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,prefer', 'access-control-expose-headers': 'date' });
    const poll = async (label, read, predicate, timeoutMs = 15000) => bounded(row, label, async () => {
      const until = Date.now() + timeoutMs - 100; let last;
      do { last = await read(); if (predicate(last)) return last; await wall(20); } while (Date.now() < until);
      assert.fail('Bounded native observation did not reach ' + label + ': ' + JSON.stringify(last));
    }, timeoutMs);
    try {
      row.nativeStartMs = Date.now(); browser = await bounded(row, 'launch fresh Chromium', () => chromium.launch({ headless: true }), 45000); row.lifecycle.launched = true; row.lifecycle.launchedAtUtc = new Date().toISOString();
      row.browserVersion = browser.version(); assert(installedChromium.some(value => value.browserVersion === row.browserVersion)); row.publicExecutablePath = chromium.executablePath();
      context = await bounded(row, 'fresh context', () => browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: row.touch, hasTouch: row.touch, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:' + form.route, value: '1' }, { name: 'report-category-held-save', value: '{"held":"unrelated"}' }] }] } })); row.lifecycle.contextCreated = true;
      await bounded(row, 'strict local fixtures', () => context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), captured = requestRecord(request); pendingRoutes.add(captured.id);
        const fulfill = async (kind, options) => {
          const body = Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body || '');
          const reply = { requestId: captured.id, kind, url: url.href, status: options.status, headers: options.headers || {}, contentType: options.contentType || null, ...bodyReceipt(body) };
          await route.fulfill({ ...options, body }); row.externalFulfilled.push(reply); save();
        };
        const json = (kind, body, status = 200) => fulfill(kind, { status, headers: cors(request), contentType: 'application/json', body: JSON.stringify(body) });
        try {
          captured.orderedHeaders = await request.headersArray();
          if (url.origin === base) {
            assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null); assert.equal(url.search, '');
            let member = decodeURIComponent(url.pathname); member = member.endsWith('/') ? member + 'index.html' : path.extname(member) ? member : member + '/index.html';
            const physical = path.resolve('dist', '.' + member); assert(physical.startsWith(path.resolve('dist') + path.sep)); assert(fs.statSync(physical).isFile(), 'Only a real completed physical dist member can be served');
            captured.physicalMember = path.relative(path.resolve('dist'), physical).split(path.sep).join('/'); return await route.continue();
          }
          const channel = url.origin === api && url.search === '' ? url.pathname === '/functions/v1/report-relay' ? 'relay' : url.pathname === '/rest/v1/question_reports' ? 'fallback' : null : null;
          if (request.method() === 'OPTIONS') {
            assert.equal(url.origin, api); assert.equal(url.search, ''); assert(channel || url.pathname === '/rest/v1/rpc/most_played_today'); assert.equal(request.postData(), null);
            assert.equal(request.headers()['access-control-request-method'], 'POST'); return await fulfill('known-post-preflight', { status: 204, headers: cors(request), body: '' });
          }
          if (channel) {
            assert.equal(request.method(), 'POST'); assert(expectedDelivery && expectedDelivery.channel === channel, 'Only the currently declared captured report channel is allowed'); assert(!held.has(channel));
            assert.equal(request.headers()['content-type'], 'application/json'); assert.equal(typeof request.headers().apikey, 'string'); assert.equal(request.headers().authorization, 'Bearer ' + request.headers().apikey);
            const body = request.postDataJSON(), declared = expectedDelivery;
            if (channel === 'relay') {
              const timestamp = body.game_context?.submittedAt, observedNativeMs = await page.evaluate(() => Date.now());
              assert.match(timestamp, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
              assert(Date.parse(timestamp) >= declared.clickWindow.beforeMs && Date.parse(timestamp) <= observedNativeMs, 'Source timestamp belongs to the actual native submit activation window');
              declared.clickWindow.observedRequestMs = observedNativeMs;
              declared.payload = { game_type: form.gameType, game_context: { ...declared.contextTemplate, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(Date.parse(timestamp))), submittedAt: timestamp }, description: declared.category + ': ' + declared.details };
            }
            assert.deepEqual(body, declared.payload, 'Captured payload equals the click-owned category, details and complete bounded context');
            assert.equal(request.postData(), JSON.stringify(declared.payload), 'Full ordered JSON bytes equal the expected captured report body');
            const entry = { ...captured, channel, submission: declared.submission, body, expectedPayload: declared.payload, clickWindow: declared.clickWindow, intercepted: true, fulfilled: false }; row.reportRequests.push(entry); expectedDelivery = null; save();
            return await new Promise(resolve => held.set(channel, async (reply, status = 200) => {
              await json('held-fictional-' + declared.submission + '-' + channel, reply, status); entry.reply = reply; entry.replyStatus = status; entry.replyBody = bodyReceipt(Buffer.from(JSON.stringify(reply))); entry.fulfilled = true; held.delete(channel); resolve(); save();
            }));
          }
          if (url.origin === api && url.pathname === '/rest/v1/live_scores' && request.method() === 'GET') {
            assert.equal(request.postData(), null); assert.deepEqual([...url.searchParams.keys()], ['select', 'order', 'limit', 'start_at', 'start_at']);
            assert.equal(url.searchParams.get('select'), '*'); assert.equal(url.searchParams.get('order'), 'start_at.asc'); assert.equal(url.searchParams.get('limit'), '150');
            const dates = url.searchParams.getAll('start_at'); assert(/^gte\.\d{4}-\d\d-\d\dT[0-9:.]+Z$/.test(dates[0]) && /^lte\.\d{4}-\d\d-\d\dT[0-9:.]+Z$/.test(dates[1])); assert.equal(Date.parse(dates[1].slice(4)) - Date.parse(dates[0].slice(4)), 32 * 3600000);
            row.readFixtures.push({ requestId: captured.id, kind: 'optional-source-live-scores-empty', orderedQuery: [...url.searchParams], reply: [] }); return await json('optional-source-live-scores-empty', []);
          }
          if (url.href === api + '/rest/v1/rpc/most_played_today' && request.method() === 'POST') {
            assert.equal(form.id, 'footer'); assert.equal(request.postData(), '{"p_min":3,"p_limit":3}'); row.readFixtures.push({ requestId: captured.id, kind: 'source-most-played-empty', reply: [] }); return await json('source-most-played-empty', []);
          }
          if (url.origin === api && url.pathname === '/rest/v1/daily_polls' && request.method() === 'GET') {
            assert.equal(form.id, 'footer'); assert.equal(request.postData(), null); assert.deepEqual([...url.searchParams.keys()], ['select', 'poll_date', 'order']);
            assert.equal(url.searchParams.get('select'), 'poll_key,question,option_a,option_a_emoji,option_a_flag,option_b,option_b_emoji,option_b_flag,option_c,option_c_emoji,option_c_flag,option_d,option_d_emoji,option_d_flag,sort_order'); assert.equal(url.searchParams.get('order'), 'sort_order.asc');
            const now = Date.now(), allowedNativeDates = [...new Set([pollDate(row.nativeStartMs), pollDate(now)])]; assert(allowedNativeDates.includes(url.searchParams.get('poll_date')));
            row.readFixtures.push({ requestId: captured.id, kind: 'source-native-poll-empty', orderedQuery: [...url.searchParams], reply: [], dateBasis: { nativeStartMs: row.nativeStartMs, observedMs: now, allowedNativeDates, pollSourceSha256: hash(fs.readFileSync('src/components/home/PollOfTheDay.tsx')), dateSourceSha256: hash(fs.readFileSync('src/lib/dateUtils.ts')) } }); return await json('source-native-poll-empty', []);
          }
          if (fonts.has(url.href)) { assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null); const font = fonts.get(url.href); return await fulfill('held-font', { status: 200, headers: cors(request), contentType: font.contentType, body: font.body }); }
          row.unknownTraffic.push({ ...captured }); assert.fail('Unknown origin/path/method/request is fatal: ' + request.method() + ' ' + url.href);
        } catch (error) { row.errors.push('Route: ' + String(error?.stack || error)); try { await route.abort('failed'); } catch (abortError) { row.errors.push('Route abort: ' + String(abortError)); } }
        finally { pendingRoutes.delete(captured.id); save(); }
      }));
      await bounded(row, 'refuse WebSockets', () => context.routeWebSocket('**/*', socket => { row.errors.push('Unknown WebSocket: ' + socket.url()); socket.close(); }));
      await bounded(row, 'native pass-through telemetry', () => context.addInitScript(() => {
        window.__reportCategory = { events: [], transport: [], rejections: [], random: { calls: 0, finite: 0, values: [] } };
        const nativeRandom = Math.random; Math.random = function (...args) { const value = Reflect.apply(nativeRandom, this, args), record = window.__reportCategory.random; record.calls++; if (Number.isFinite(value)) record.finite++; record.values.push(value); return value; };
        const nativeFetch = window.fetch.bind(window); window.fetch = async (...args) => {
          const input = args[0], url = new URL(input instanceof Request ? input.url : String(input), location.href);
          const trace = url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' ? { url: url.href, method: args[1]?.method || (input instanceof Request ? input.method : 'GET'), rawBody: typeof args[1]?.body === 'string' ? args[1].body : null, atMs: Date.now(), performanceMs: performance.now(), responseResolved: false, bodyConsumed: false } : null;
          if (trace) window.__reportCategory.transport.push(trace); const response = await nativeFetch(...args);
          if (trace) { trace.responseResolved = true; for (const method of ['text', 'json']) { const nativeRead = response[method].bind(response); response[method] = async (...readArgs) => { const value = await nativeRead(...readArgs); trace.bodyConsumed = true; trace.reader = method; return value; }; } } return response;
        };
        window.addEventListener('unhandledrejection', event => window.__reportCategory.rejections.push(String(event.reason?.stack || event.reason)));
        for (const type of ['click', 'touchstart', 'keydown', 'keyup', 'input', 'focus', 'blur']) window.addEventListener(type, event => {
          const target = event.target instanceof Element ? event.target.closest('button,textarea') : null;
          if (target) window.__reportCategory.events.push({ type, trusted: event.isTrusted, key: event.key || null, label: target.getAttribute('aria-label') || target.textContent?.trim(), tag: target.tagName, atMs: Date.now(), performanceMs: performance.now() });
        }, { capture: true, passive: true });
      }));
      page = await bounded(row, 'create actual page', () => context.newPage()); row.lifecycle.pageCreated = true; page.setDefaultTimeout(15000);
      page.on('request', requestRecord);
      page.on('requestfinished', request => { requestRecord(request).terminal = 'finished'; });
      page.on('requestfailed', request => { const entry = requestRecord(request); entry.terminal = 'failed'; row.errors.push('Request: ' + entry.url + ' ' + JSON.stringify(request.failure())); });
      page.on('pageerror', error => row.errors.push('Page: ' + error.message));
      row.console = []; row.expectedTransportDiagnostics = [];
      page.on('console', message => {
        const entry = { type: message.type(), text: message.text(), location: message.location() }; row.console.push(entry);
        if (entry.type === 'error') {
          if (row.declaredFailureReleased && entry.text === 'Failed to load resource: the server responded with a status of 400 ()' && entry.location.url === api + '/rest/v1/question_reports' && row.expectedTransportDiagnostics.length === 0) row.expectedTransportDiagnostics.push({ ...entry, classification: 'declared-fictional-fallback-http400' });
          else row.errors.push('Console: ' + JSON.stringify(entry));
        }
      });
      page.on('response', response => {
        const request = requestRecord(response.request()), receipt = { requestId: request.id, url: response.url(), status: 'pending' }; row.responseObservers.push(receipt); save();
        observers.push((async () => { try {
          await bounded(row, 'retain same response body and terminal ' + request.id, async () => {
            const body = await response.body(), orderedHeaders = await response.headersArray();
            const result = { requestId: request.id, url: response.url(), status: response.status(), orderedHeaders, ...bodyReceipt(body) }; row.responses.push(result);
            if (new URL(response.url()).origin === base) {
              assert.equal(response.status(), 200); assert(request.physicalMember); const expected = fs.readFileSync(path.join(root, 'dist', request.physicalMember)); assert(body.equals(expected), 'Every actual local body equals its completed physical dist member');
              row.assets.push({ ...result, member: request.physicalMember, physicalSha256: hash(expected) });
            } else {
              const declared = await poll('one local fulfillment for response ' + request.id, async () => row.externalFulfilled.filter(value => value.requestId === request.id), values => values.length === 1);
              assert.equal(response.status(), declared[0].status); assert.equal(result.sha256, declared[0].sha256); assert.equal(result.bytes, declared[0].bytes);
            }
            assert.equal(await response.finished(), null, 'Every actual response completes without pending I/O');
          }, 30000); receipt.status = 'passed';
        } catch (error) { receipt.status = 'failed'; receipt.error = String(error?.stack || error); row.errors.push(receipt.error); } finally { save(); } })());
      });
      cdp = await bounded(row, 'attach actual Chromium CDP', () => context.newCDPSession(page)); await bounded(row, 'enable native AX', () => cdp.send('Accessibility.enable'));
      const trigger = page.locator(form.trigger).getByRole('button', { name: 'Report a problem', exact: true });
      const dialog = page.getByRole('dialog', { name: 'Report a problem', exact: true });
      const textbox = dialog.getByRole('textbox', { name: 'Describe the problem', exact: true });
      const send = dialog.getByRole('button', { name: form.submit, exact: true });
      const read = () => page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]'), field = modal?.querySelector('textarea'), submit = modal?.querySelector('button.w-full');
        const rect = value => { const r = value.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        const categories = [...(modal?.querySelectorAll('button.rounded-full') || [])].map(button => { const range = document.createRange(); range.selectNodeContents(button); const style = getComputedStyle(button); return { label: button.textContent.trim(), tag: button.tagName, attributes: Object.fromEntries([...button.attributes].map(value => [value.name, value.value])), visuallySelected: button.classList.contains('bg-primary'), focused: document.activeElement === button, rect: rect(button), textRect: rect(range), style: { color: style.color, backgroundColor: style.backgroundColor, borderColor: style.borderColor, overflow: style.overflow, whiteSpace: style.whiteSpace }, visible: button.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) }; });
        return { atMs: Date.now(), performanceMs: performance.now(), dialog: !!modal, details: field?.value ?? null, categories, disabled: submit?.disabled ?? null, submitText: submit?.textContent.trim() ?? null, submitName: submit?.getAttribute('aria-label') ?? null, spinner: submit?.querySelectorAll('svg.animate-spin').length ?? 0, success: !!modal?.querySelector('.text-correct'), error: modal?.textContent.includes('Something went wrong. Try again.') ?? false, active: { tag: document.activeElement?.tagName ?? null, label: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() || null }, stores: { local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }, telemetry: window.__reportCategory };
      });
      const ready = label => poll(label, read, value => value.dialog && value.categories.length === names.length && value.categories.every(button => button.visible));
      const position = async (locator, label) => {
        const value = await locator.evaluate(element => { element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scrollX, scrollY }; });
        row.actions.push({ action: 'explicit native DOM positioning', label, ...value }); assert(value.width > 0 && value.height > 0 && value.x >= 0 && value.y >= 0 && value.x + value.width <= width + 1 && value.y + value.height <= 845); save();
      };
      const activate = async (locator, label, input = row.touch ? 'touch' : 'pointer') => {
        assert.equal(await locator.count(), 1); assert(await locator.isVisible()); const box = await locator.boundingBox(); assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= 845);
        const eventStart = await page.evaluate(() => window.__reportCategory.events.length);
        if (input === 'touch') await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else if (input === 'pointer') await locator.click();
        else { assert(['Space', 'Enter'].includes(input)); await locator.focus(); await page.keyboard.press(input); }
        const events = await page.evaluate(start => window.__reportCategory.events.slice(start), eventStart);
        const clicks = events.filter(value => value.type === 'click' && value.trusted && value.tag === 'BUTTON'); assert.equal(clicks.length, 1, 'One real trusted native click per activation');
        if (input === 'touch') assert(events.some(value => value.type === 'touchstart' && value.trusted));
        if (input === 'Space' || input === 'Enter') assert(events.some(value => value.type === 'keydown' && value.trusted && value.key === (input === 'Space' ? ' ' : 'Enter')));
        row.actions.push({ action: 'trusted native activation', label, input, events }); save();
      };
      const screenshot = async (phase, full = true) => {
        for (const fullPage of full ? [false, true] : [false]) {
          const file = spec.id + '-' + phase + (fullPage ? '-full.png' : '-viewport.png');
          const before = await read();
          await bounded(row, 'saved PNG ' + file, () => page.screenshot({ path: path.join(out, file), fullPage, animations: 'allow', timeout: 10000 }));
          const after = await read(), body = fs.readFileSync(path.join(out, file));
          const owner = value => ({ atMs: value.atMs, performanceMs: value.performanceMs, dialog: value.dialog, success: value.success, details: value.details, selected: value.categories.filter(button => button.visuallySelected).map(button => button.label) });
          row.screenshots.push({ phase, fullPage, file, bytes: body.length, sha256: hash(body), before: owner(before), after: owner(after) });
          if (phase === 'native-success-panel') assert(before.success && after.success, 'Saved success pixels belong wholly to the actual natural success panel before its timer closes');
        } save();
      };
      const snapshot = async (phase, category, details, state = 'idle', newIdentity = false, purpose = false) => {
        const dom = await read(); assert(dom.dialog && !dom.success); assert.equal(dom.details, details); assert.deepEqual(dom.categories.map(value => value.label), names);
        assert.deepEqual(dom.categories.filter(value => value.visuallySelected).map(value => value.label), category ? [category] : []);
        assert.equal(dom.disabled, state === 'loading' || !details.trim()); assert.equal(dom.spinner, state === 'loading' ? 1 : 0); assert.equal(dom.submitName, form.submit); assert.equal(dom.submitText, state === 'loading' ? '' : form.submit); assert.equal(dom.error, state === 'error');
        assert.deepEqual(dom.telemetry.rejections, []); if (row.storesHeld) assert.deepEqual(dom.stores, row.storesHeld);
        const document = await cdp.send('DOM.getDocument'), selected = await cdp.send('DOM.querySelectorAll', { nodeId: document.root.nodeId, selector: '[role="dialog"] button.rounded-full' }); assert.equal(selected.nodeIds.length, names.length);
        const fullAX = await cdp.send('Accessibility.getFullAXTree'), joined = [];
        for (const [i, nodeId] of selected.nodeIds.entries()) {
          const visible = dom.categories[i]; assert(visible.visible && visible.tag === 'BUTTON' && visible.rect.width > 0 && visible.rect.height > 0);
          assert(visible.rect.x >= 0 && visible.rect.y >= 0 && visible.rect.x + visible.rect.width <= width + 1 && visible.rect.y + visible.rect.height <= 845, 'Actual visible category is inside viewport');
          assert(visible.textRect.x >= visible.rect.x - 1 && visible.textRect.y >= visible.rect.y - 1 && visible.textRect.x + visible.textRect.width <= visible.rect.x + visible.rect.width + 1 && visible.textRect.y + visible.textRect.height <= visible.rect.y + visible.rect.height + 1, 'Actual current category label is not clipped');
          const description = await cdp.send('DOM.describeNode', { nodeId }), backendNodeId = description.node.backendNodeId;
          assert.equal(description.node.nodeName, 'BUTTON'); assert(backendNodeId > 0);
          const partialAX = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: true });
          const fullMatches = fullAX.nodes.filter(value => value.backendDOMNodeId === backendNodeId && !value.ignored), partialMatches = partialAX.nodes.filter(value => value.backendDOMNodeId === backendNodeId && !value.ignored);
          assert.equal(fullMatches.length, 1); assert.equal(partialMatches.length, 1);
          const native = fullMatches[0], partial = partialMatches[0]; assert.equal(native.role.value, 'button'); assert.equal(partial.role.value, 'button'); assert.equal(native.name?.value, names[i]); assert.equal(partial.name?.value, names[i]);
          const pressed = native.properties?.filter(value => value.name === 'pressed') || [], partialPressed = partial.properties?.filter(value => value.name === 'pressed') || []; assert(pressed.length <= 1); assert.deepEqual(partialPressed, pressed);
          if (pressed.length) { assert.equal(pressed[0].value.type, 'tristate'); assert(['true', 'false'].includes(pressed[0].value.value), 'Only the actual boolean states of a native AX tristate pressed property are valid'); }
          const actualPressed = pressed.length ? pressed[0].value.value === 'true' : null, wanted = category === names[i];
          const nativeFocused = native.properties?.find(value => value.name === 'focused')?.value.value === true; assert.equal(nativeFocused, visible.focused, 'Native focus and actual DOM focus refer to the same category button');
          assert.equal(visible.attributes['aria-checked'], undefined); assert.equal(visible.attributes['aria-selected'], undefined);
          if (expectedMissing) { assert.equal(visible.attributes['aria-pressed'], undefined); assert.equal(actualPressed, null, 'Omitted source actually lacks native pressed state'); }
          else { assert.equal(visible.attributes['aria-pressed'], String(wanted)); assert.equal(actualPressed, wanted, 'Actual native category pressed property matches visual selection'); }
          joined.push({ label: names[i], nodeId, backendNodeId, description, partialAX, native, nativePressedValue: pressed[0]?.value ?? null, actualPressed, expectedPressed: wanted, focused: visible.focused });
        }
        if (newIdentity || !backendIdentity) backendIdentity = joined.map(value => value.backendNodeId);
        else assert.deepEqual(joined.map(value => value.backendNodeId), backendIdentity, 'The same physical category nodes survive selection, repeated choice, details and pending rerenders');
        if (phase === 'selected-Bug' || phase === 'selected-Idea') assert(joined.find(value => value.label === category).focused, 'Native Space and Enter retain focus on the activated category');
        if (purpose) {
          assert(category && dom.categories.find(value => value.label === category)?.visuallySelected, 'Purpose fault is considered only after the actual visible chosen category is found');
          const current = joined.find(value => value.label === category); assert(current && current.native.role.value === 'button' && current.native.name.value === category);
          const passed = current.actualPressed === true;
          row.pressedChecks.push({ phase, purpose: 'The actual visible selected ' + form.id + ' category exposes native pressed true on its joined button', category, actualPressed: current.actualPressed, expectedPressed: true, expectedFailure: expectedMissing, passed, backendNodeId: current.backendNodeId }); assert.equal(passed, !expectedMissing);
        }
        const file = spec.id + '-' + phase + '-ax.json', body = Buffer.from(JSON.stringify({ phase, dom, document, selected, fullAX, joined }, null, 2)); fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
        row.axSnapshots.push({ phase, file, bytes: body.length, sha256: hash(body), categoryVector: joined.map(value => ({ label: value.label, nodeId: value.nodeId, backendNodeId: value.backendNodeId, role: value.native.role.value, name: value.native.name.value, pressed: value.actualPressed, focused: value.focused })) }); row.observations.push({ phase, ...dom }); save();
      };
      await bounded(row, 'navigate real built route', () => page.goto(base + form.route, { waitUntil: 'domcontentloaded' }), 30000); await trigger.waitFor(); assert.equal(await trigger.count(), 1);
      if (form.id === 'game') { await page.locator('#root [data-seo-content="ready"]').waitFor(); assert(await trigger.evaluate(element => !!element.closest('[data-seo-content]')?.querySelector('article') && element.closest('[data-no-prerender]').parentElement.firstElementChild === element.closest('[data-no-prerender]'))); }
      await bounded(row, 'native fonts ready', () => page.evaluate(() => document.fonts.ready)); await position(trigger, 'initial trigger');
      row.nativeFrames = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(a => requestAnimationFrame(b => resolve([a, b]))))); assert(row.nativeFrames[1] > row.nativeFrames[0]);
      if (form.id === 'footer') await poll('native home scroll saved', () => page.evaluate(() => ({ y: scrollY, saved: sessionStorage.getItem('home-scroll-y') })), value => value.y > 0 && value.saved === String(value.y));
      row.hydratedDateET = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()));
      await activate(trigger, 'open actual report'); await textbox.waitFor(); await ready('native initial dialog entered');
      row.storesHeld = (await read()).stores; assert.equal(row.storesHeld.local['report-category-held-save'], '{"held":"unrelated"}'); assert.deepEqual(await context.cookies(), []);
      await snapshot('initial-no-category', '', '', 'idle', true); await screenshot('initial-no-category');
      await activate(dialog.getByRole('button', { name: 'Bug', exact: true }), 'choose Bug with native Space', 'Space'); await snapshot('selected-Bug', 'Bug', '', 'idle', false, true); await screenshot('selected-Bug');
      await activate(dialog.getByRole('button', { name: 'Idea', exact: true }), 'switch to Idea with native Enter', 'Enter'); await snapshot('selected-Idea', 'Idea', '');
      await activate(dialog.getByRole('button', { name: 'Idea', exact: true }), 'repeat current Idea'); await snapshot('repeated-Idea', 'Idea', '');
      await page.keyboard.press('Escape'); await poll('Escape closed actual dialog', () => dialog.count(), value => value === 0); assert(await trigger.evaluate(element => document.activeElement === element));
      await position(trigger, 'Escape returned trigger'); await activate(trigger, 'reopen preserved category'); await textbox.waitFor(); await ready('native preserved dialog entered'); await snapshot('Escape-reopened-Idea', 'Idea', '', 'idle', true);
      const firstDetails = 'QA fictional category draft ' + spec.id, newerDetails = 'QA fictional newer category draft ' + spec.id;
      const typeDetails = async value => { await textbox.click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.insertText(value); assert.equal(await textbox.inputValue(), value); };
      await typeDetails(firstDetails); await snapshot('fictional-Idea-draft', 'Idea', firstDetails);
      const contextTemplate = await page.evaluate(({ source, game, puzzleDate }) => {
        const entry = document.querySelector('script[type="module"][src]'); const value = { path: location.pathname, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), submittedAt: null, source, contextTruncated: false };
        if (game) Object.assign(value, { phase: 'mode-select', mode: 'classic', puzzleDate, decade: null, theme: null, spins: 0, rerolls: 2, squad: null, selected: null, picks: ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'].map(slot => [slot, null]), openSlots: ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'], result: null, lockedResult: null });
        value.diagnostics = { build: new URL(entry.src).pathname.split('/').pop(), viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, browser: navigator.userAgent.slice(0, 200), language: navigator.language }; return value;
      }, { source: form.source, game: form.id === 'game', puzzleDate: row.hydratedDateET }); row.contextTemplate = contextTemplate;
      const submit = async (submission, category, details) => {
        assert.equal(expectedDelivery, null); assert.equal(held.size, 0);
        const beforeMs = await page.evaluate(() => Date.now());
        const delivery = { channel: 'relay', submission, category, details, contextTemplate, payload: null, clickWindow: { beforeMs, observedRequestMs: null, afterMs: null } }; expectedDelivery = delivery;
        await activate(send, 'submit captured ' + submission); delivery.clickWindow.afterMs = await page.evaluate(() => Date.now());
        await poll('held actual relay ' + submission, async () => held.has('relay'), Boolean); assert(delivery.payload);
        assert(Date.parse(delivery.payload.game_context.submittedAt) <= delivery.clickWindow.afterMs); return delivery;
      };
      const first = await submit('first-Idea', 'Idea', firstDetails); await snapshot('held-first-Idea', 'Idea', firstDetails, 'loading'); await screenshot('held-first-Idea');
      await activate(dialog.getByRole('button', { name: 'Bug', exact: true }), 'edit category while relay pending'); await typeDetails(newerDetails); await snapshot('held-newer-Bug', 'Bug', newerDetails, 'loading');
      assert.deepEqual(row.reportRequests[0].body, first.payload); row.staleReleaseAtMs = await page.evaluate(() => Date.now()); await held.get('relay')({ ok: true });
      await poll('stale success returns to actual editable newer draft', read, value => value.dialog && !value.success && !value.disabled && value.details === newerDetails);
      await snapshot('stale-completion-kept-newer-Bug', 'Bug', newerDetails); await wall(1650); await snapshot('stale-completion-no-reset-after1500', 'Bug', newerDetails); await screenshot('stale-completion-kept-newer-Bug');
      const second = await submit('newer-Bug-failed', 'Bug', newerDetails); await snapshot('held-second-relay-Bug', 'Bug', newerDetails, 'loading');
      expectedDelivery = { channel: 'fallback', submission: second.submission, payload: second.payload, clickWindow: second.clickWindow }; await held.get('relay')({ ok: false }); await poll('held actual direct fallback', async () => held.has('fallback'), Boolean);
      await snapshot('held-direct-fallback-Bug', 'Bug', newerDetails, 'loading'); await screenshot('held-direct-fallback-Bug');
      row.declaredFailureReleased = true; await held.get('fallback')({ code: 'QA_FICTIONAL_REJECTION', message: 'QA fictional fallback failure', details: null, hint: null }, 400);
      await poll('real delivery error preserved newer draft', read, value => value.error && !value.disabled); await snapshot('failed-delivery-kept-Bug', 'Bug', newerDetails, 'error'); await screenshot('failed-delivery-kept-Bug');
      await submit('retry-Bug-success', 'Bug', newerDetails); await snapshot('held-retry-Bug', 'Bug', newerDetails, 'loading');
      row.successReleaseAtMs = await page.evaluate(() => Date.now()); await held.get('relay')({ ok: true });
      const success = await poll('real retry success panel', read, value => value.success); assert.equal(success.details, null); assert.equal(await dialog.getByText(form.success, { exact: true }).count(), 1); row.observations.push({ phase: 'native-success-panel', ...success }); save(); await screenshot('native-success-panel', false);
      await poll('natural source1500ms close', () => dialog.count(), value => value === 0, 10000); row.successClosedAtMs = await page.evaluate(() => Date.now()); assert(row.successClosedAtMs - row.successReleaseAtMs >= 1400, 'Actual close was delayed by the natural success timer');
      await poll('natural close restored actual trigger focus', () => trigger.evaluate(element => document.activeElement === element), Boolean);
      await position(trigger, 'natural close trigger'); await activate(trigger, 'reopen actual reset form'); await textbox.waitFor(); await ready('native reset dialog entered'); await snapshot('reset-all-unselected-empty', '', '', 'idle', true); await screenshot('reset-all-unselected-empty');
      const final = await read(); row.storesAfter = final.stores; row.events = final.telemetry.events; row.transport = final.telemetry.transport; row.random = final.telemetry.random;
      assert.deepEqual(row.storesAfter, row.storesHeld); assert.deepEqual(await context.cookies(), []); assert.deepEqual(final.telemetry.rejections, []);
      assert.equal(row.random.calls, row.random.values.length); assert.equal(row.random.finite, row.random.calls); assert(row.random.values.every(value => value >= 0 && value < 1));
      assert.equal(row.reportRequests.length, 4); assert.deepEqual(row.reportRequests.map(value => [value.channel, value.submission]), [['relay', 'first-Idea'], ['relay', 'newer-Bug-failed'], ['fallback', 'newer-Bug-failed'], ['relay', 'retry-Bug-success']]); assert(row.reportRequests.every(value => value.intercepted && value.fulfilled)); assert.equal(expectedDelivery, null);
      const transported = row.transport.filter(value => ['/functions/v1/report-relay', '/rest/v1/question_reports'].includes(new URL(value.url).pathname)); assert.equal(transported.length, 4); assert(transported.every(value => value.responseResolved && value.bodyConsumed));
      for (const [i, entry] of row.reportRequests.entries()) { assert.equal(transported[i].rawBody, entry.rawBody); assert.equal(transported[i].method, entry.method); }
      assert(row.events.some(value => value.type === 'input' && value.trusted)); assert(row.events.some(value => value.type === 'keydown' && value.trusted && value.key === ' ')); assert(row.events.some(value => value.type === 'keydown' && value.trusted && value.key === 'Enter'));
      await bounded(row, 'all real response observers', () => Promise.all(observers), 45000);
      assert(row.requests.every(value => value.terminal === 'finished')); assert(row.responses.length > 5); assert.equal(row.responses.length, row.requests.length);
      for (const request of row.requests.filter(value => value.origin !== base)) assert.equal(row.externalFulfilled.filter(value => value.requestId === request.id).length, 1);
      assert(row.assets.some(value => value.member === (form.route === '/' ? 'index.html' : 'perfect-season-nba/index.html'))); assert(row.assets.some(value => value.member.endsWith('.js'))); assert(row.assets.some(value => value.member.endsWith('.css'))); assert.deepEqual(row.errors, []); assert.deepEqual(row.unknownTraffic, []);
      row.pendingBeforeCleanup = { held: held.size, routes: pendingRoutes.size, observers: row.responseObservers.filter(value => value.status !== 'passed').length }; assert.deepEqual(row.pendingBeforeCleanup, { held: 0, routes: 0, observers: 0 }); row.status = 'passed';
    } catch (error) {
      row.failure = String(error?.stack || error);
      if (page) try { await bounded(row, 'failure PNG', () => page.screenshot({ path: path.join(out, spec.id + '-failure.png'), fullPage: false, timeout: 10000 })); const body = fs.readFileSync(path.join(out, spec.id + '-failure.png')); row.screenshots.push({ phase: 'failure', file: spec.id + '-failure.png', bytes: body.length, sha256: hash(body) }); } catch (captureError) { row.errors.push('Failure capture: ' + String(captureError)); }
    } finally {
      try {
        for (const [channel, finish] of [...held]) { row.cleanupDrain = true; await bounded(row, 'drain failed held fictional ' + channel, () => finish(channel === 'relay' ? { ok: true } : { code: 'QA_ABORT', message: 'QA fictional cleanup' }, channel === 'relay' ? 200 : 400)); }
        if (cdp) { await bounded(row, 'detach actual CDP', () => cdp.detach()); row.lifecycle.cdpDetached = true; }
        if (context) { await bounded(row, 'close actual context', () => context.close()); row.lifecycle.contextClosed = true; row.lifecycle.contextClosedAtUtc = new Date().toISOString(); }
        if (browser) { await bounded(row, 'close actual browser', () => browser.close()); row.lifecycle.browserClosed = true; row.lifecycle.browserClosedAtUtc = new Date().toISOString(); row.lifecycle.browserConnectedAfterClose = browser.isConnected(); assert.equal(row.lifecycle.browserConnectedAfterClose, false); }
        await bounded(row, 'final real response observers', () => Promise.all(observers), 45000);
      } catch (error) { row.status = 'failed'; report.cleanupErrors.push(String(error?.stack || error)); }
      row.pendingAfterCleanup = { held: held.size, routes: pendingRoutes.size, observers: row.responseObservers.filter(value => value.status !== 'passed').length };
      if (Object.values(row.pendingAfterCleanup).some(value => value !== 0) || row.errors.length || row.cleanupDrain) row.status = 'failed'; save();
    }
  }
  assert.equal(report.cases.length, specs.length); assert(report.cases.every(row => row.status === 'passed' && row.pressedChecks.length === 1 && row.axSnapshots.length === 15)); assert.deepEqual(report.cleanupErrors, []);
  report.censusObserved = { contexts: report.cases.length, checks: report.cases.reduce((sum, row) => sum + row.pressedChecks.length, 0), faults: report.cases.reduce((sum, row) => sum + row.pressedChecks.filter(value => !value.passed).length, 0), healthy: report.cases.reduce((sum, row) => sum + row.pressedChecks.filter(value => value.passed).length, 0), categorySnapshots: report.cases.reduce((sum, row) => sum + row.axSnapshots.length, 0) };
  const faults = mode === 'baseline' || arm === 'whole-original' ? specs.length : arm.endsWith('-omission') ? 1 : 0; assert.equal(report.censusObserved.faults, faults); assert.equal(report.censusObserved.healthy, specs.length - faults);
  report.status = 'passed'; report.contextCount = report.censusObserved.contexts; report.faultCount = report.censusObserved.faults; report.nativeActivationsOnly = true; report.fixedBrowserPassed = mode === 'fixed' && ['normal', 'restored'].includes(arm); report.completedAtUtc = new Date().toISOString();
  console.log('Report categories browser: ' + mode + '/' + arm + ', ' + report.censusObserved.contexts + ' actual contexts, ' + report.censusObserved.faults + ' precise selected-state purpose faults.');
} finally {
  report.sourceAfter = sourceBefore.map(({ file }) => { const body = fs.readFileSync(file); return { file, bytes: body.length, sha256: hash(body) }; });
  report.distAfter = inventory(path.resolve('dist')); save();
  try {
    assert.deepEqual(report.sourceAfter, sourceBefore); assert(tracked.equals(git(['ls-files', '-z']))); assert.deepEqual(report.distAfter, distBefore);
    assert.equal(hash(fs.readFileSync(path.join(cacheRoot, 'manifest.json'))), hash(manifestBody));
    for (const entry of report.fonts.entries) assert.equal(hash(fs.readFileSync(path.join(cacheRoot, entry.file))), entry.sha256);
    assert.equal(hash(fs.readFileSync(path.join(coreDir, 'lib/coreBundle.js'))), report.nativeMethod.coreSha256); assert.equal(hash(fs.readFileSync(path.join(coreDir, 'browsers.json'))), report.nativeMethod.browsersJsonSha256); assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0);
    assert.equal(hash(fs.readFileSync(path.join(path.dirname(require.resolve('playwright')), 'package.json'))), report.nativeMethod.packageSha256); assert.equal(hash(fs.readFileSync(path.join(coreDir, 'package.json'))), report.nativeMethod.corePackageSha256);
    report.inputHolds = 'passed'; report.sourceHeld = true; report.distHeld = true;
  } catch (error) { report.status = 'failed'; report.inputHolds = 'failed'; report.inputHoldError = String(error?.stack || error); throw error; }
  finally { save(); }
}
