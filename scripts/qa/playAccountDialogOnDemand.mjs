/* Served Chromium evidence only. Controlled chunk holds/offline faults are declared,
 * not natural failure-frequency or physical-device claims. Run only in remote CI. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import pw from '../lib/playwrightLoader.mjs';

const BASE = process.env.BASE, VARIANT = process.env.ACCOUNT_DIALOG_VARIANT;
const SOURCE = process.env.ACCOUNT_DIALOG_SOURCE, DIST = process.env.ACCOUNT_DIALOG_DIST;
assert.equal(BASE, 'http://127.0.0.1:4173');
assert(['original', 'fixed'].includes(VARIANT));
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
for (const value of [SOURCE, DIST, process.env.ACCOUNT_DIALOG_OUT, process.env.FREE_KICK_FONT_CACHE]) assert(value && path.isAbsolute(value), 'Absolute actual source, dist, output and font roots required');
const OUT = path.join(process.env.ACCOUNT_DIALOG_OUT, 'browser');
assert(!fs.existsSync(OUT), 'Never overwrite browser evidence'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');
const receipt = file => { const bytes = fs.readFileSync(path.join(OUT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
function retain(folder, extension, bytes) {
  const file = folder + '/' + sha(bytes) + extension; fs.mkdirSync(path.join(OUT, folder), { recursive: true });
  if (!fs.existsSync(path.join(OUT, file))) fs.writeFileSync(path.join(OUT, file), bytes);
  return receipt(file);
}
function tree(root) {
  const result = {};
  const walk = folder => { for (const item of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(folder, item.name); if (item.isDirectory()) walk(file); else if (item.isFile()) result[path.relative(root, file).replaceAll('\\', '/')] = sha(fs.readFileSync(file));
  } }; walk(root); return result;
}
const sourceFiles = ['src/App.tsx', 'src/components/layout/Header.tsx', 'src/pages/Index.tsx', 'src/components/game/GameNavbar.tsx', 'src/components/auth/AuthModal.tsx', 'src/components/auth/AccountDialogOnDemand.tsx', 'src/lib/freshBuild.ts'];
const sourceBindings = () => Object.fromEntries(sourceFiles.map(file => {
  const actual = path.join(SOURCE, file); if (!fs.existsSync(actual)) return [file, null];
  const bytes = fs.readFileSync(actual); return [file, { bytes: bytes.length, sha256: sha(bytes) }];
}));
const beforeSource = sourceBindings(), beforeDist = tree(DIST);
write('source-bindings.before.json', beforeSource); write('dist.before.json', beforeDist);
const marker = 'Guests earn points, build streaks and appear on the leaderboard too.';
const holders = Object.keys(beforeDist).filter(file => file.startsWith('assets/') && file.endsWith('.js') && fs.readFileSync(path.join(DIST, file), 'utf8').includes(marker));
assert.equal(holders.length, 1, 'Actual emitted AuthModal marker has exactly one owner');
const authFile = holders[0], authUrl = BASE + '/' + authFile, authBytes = fs.readFileSync(path.join(DIST, authFile));
const authHolder = { file: authFile, url: authUrl, sha256: sha(authBytes), rawBytes: authBytes.length, gzipBytes: gzipSync(authBytes).length, bodyReceipt: retain('emitted', '.js', authBytes), gzipReceipt: retain('emitted', '.js.gz', gzipSync(authBytes)) };
const fontRoot = process.env.FREE_KICK_FONT_CACHE, fontManifest = JSON.parse(fs.readFileSync(path.join(fontRoot, 'manifest.json')));
assert(Array.isArray(fontManifest) && fontManifest.length > 0);
const fonts = new Map(fontManifest.map(item => {
  assert(['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(item.url).hostname));
  const bytes = fs.readFileSync(path.join(fontRoot, item.file)); assert.equal(sha(bytes), item.sha256); assert(item.contentType);
  return [item.url, { body: bytes, contentType: item.contentType, physical: retain('font-cache', '.font', bytes), original: item }];
}));
assert.equal(fonts.size, fontManifest.length); write('font-manifest.json', fontManifest);
const report = { variant: VARIANT, source: SOURCE, dist: DIST, base: BASE, status: 'running', qualified: false, ready: false, authHolder, sourceBindings: beforeSource,
  boot: [], journeys: [], coldAccountAssets: null, errors: [], limits: ['Chromium at320 touch and1440 mouse, not physical Apple hardware.', 'Held chunk and browser offline mode are deliberate faults, not natural frequency evidence.', 'No auth submission, database request, provider popup or production account operation is performed.', 'External request intent is retained and aborted except verified cached fonts; zero external intent is not claimed.', 'Original arm qualifies three closed route boots only. No new original served UI inverse is claimed.', 'Full source/package/tool binding is owned by the paired workflow; this method holds its selected actual source leaves and every dist file.'] };
const checkpoint = () => write('report.json', report);
let browser;
const bounded = (promise, label, ms = 15000) => {
  let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), ms); })]).finally(() => clearTimeout(timer));
};
function asset(url) {
  const pathname = decodeURIComponent(new URL(url).pathname), file = path.resolve(DIST, '.' + pathname);
  assert(file.startsWith(path.resolve(DIST) + path.sep)); assert(fs.statSync(file).isFile());
  const bytes = fs.readFileSync(file); assert(bytes.length > 0);
  return { file: path.relative(DIST, file).replaceAll('\\', '/'), bytes };
}
const isJs = url => new URL(url).origin === BASE && new URL(url).pathname.endsWith('.js');
checkpoint();
async function runCase(collection, id, route, width, work) {
  const row = { id, route, width, height: width === 320 ? 640 : 900, status: 'running', requests: [], js: [], failures: [], documents: [], external: [], fontReceipts: [], errors: [], console: [], observations: [], screenshots: [], evidenceErrors: [], held: [] };
  if (id === 'offline-retry') { assert(report.coldAccountAssets); row.coldAccountAssets = report.coldAccountAssets; }
  collection.push(row); checkpoint();
  const context = await browser.newContext({ viewport: { width, height: row.height }, isMobile: width === 320, hasTouch: width === 320, reducedMotion: 'reduce', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'account-proof-save', value: '{"fixture":"opaque held game bytes"}' }] }] } });
  let page, holdAuth = false, releaseAuth = () => {}, lastJs = Date.now();
  let holdPromise; const pendingJs = new Set(), bodyTasks = [], documentByRequest = new Map();
  context.on('request', request => {
    const url = request.url(), owned = new URL(url).origin === BASE;
    row.requests.push({ url, method: request.method(), type: request.resourceType(), owned });
    if (isJs(url)) { pendingJs.add(request); lastJs = Date.now(); }
    if (owned && request.isNavigationRequest() && request.resourceType() === 'document' && page && request.frame() === page.mainFrame()) {
      const item = { url, method: request.method(), status: null }; row.documents.push(item); documentByRequest.set(request, item);
    }
  });
  context.on('requestfinished', request => { if (pendingJs.delete(request)) lastJs = Date.now(); });
  context.on('requestfailed', request => { if (pendingJs.delete(request)) lastJs = Date.now(); row.failures.push({ url: request.url(), owned: new URL(request.url()).origin === BASE, error: request.failure()?.errorText || '' }); });
  context.on('response', response => {
    const request = response.request(), document = documentByRequest.get(request); if (document) document.status = response.status();
    if (!isJs(response.url())) return;
    const task = (async () => {
      const actual = asset(response.url()); assert.equal(response.status(), 200, 'Every fetched owned JavaScript response succeeds');
      const bytes = await bounded(response.body(), 'Actual emitted JS body');
      assert.deepEqual(bytes, actual.bytes, 'Actual response bytes equal the selected physical dist');
      const zipped = gzipSync(bytes); row.js.push({ url: response.url(), file: actual.file, status: response.status(), rawBytes: bytes.length, gzipBytes: zipped.length,
        diskSha256: sha(actual.bytes), bodySha256: sha(bytes), bodyReceipt: retain('js-bodies', '.js', bytes), gzipReceipt: retain('js-bodies', '.js.gz', zipped) });
    })().catch(error => row.evidenceErrors.push(String(error.stack || error)));
    bodyTasks.push(task);
  });
  await context.route('**/*', async routed => {
    const request = routed.request(), url = request.url();
    try {
      if (new URL(url).origin !== BASE) {
        if (fonts.has(url)) { const cached = fonts.get(url); row.fontReceipts.push({ url, contentType: cached.contentType, ...cached.physical }); return await routed.fulfill({ body: cached.body, contentType: cached.contentType, headers: { 'access-control-allow-origin': '*' } }); }
        row.external.push({ url, method: request.method(), type: request.resourceType(), action: 'aborted external intent' }); return await routed.abort();
      }
      assert(['GET', 'HEAD'].includes(request.method()), 'No owned auth submission or write');
      if (url === authUrl && holdAuth) { row.held.push({ url, requestIndex: row.requests.length, action: 'hold actual AuthModal asset response' }); checkpoint(); await holdPromise; }
      return await routed.continue();
    } catch (error) { row.evidenceErrors.push(String(error.stack || error)); throw error; }
  });
  await context.routeWebSocket('**/*', socket => { row.external.push({ url: socket.url(), type: 'websocket', action: 'closed external or owned websocket intent' }); socket.close(); });
  await context.addInitScript(() => { if (location.origin === 'http://127.0.0.1:4173' && sessionStorage.getItem('account-proof-session') === null) sessionStorage.setItem('account-proof-session', 'held session bytes'); });
  const snapshot = () => page.evaluate(() => {
    const saved = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
    const dialog = document.querySelector('[role="dialog"]'), rect = dialog?.getBoundingClientRect();
    const field = id => document.querySelector('input#' + id)?.value ?? null;
    return { href: location.href, timeOrigin: performance.timeOrigin, window: { x: scrollX, y: scrollY }, stores: { local: saved(localStorage), session: saved(sessionStorage) },
      heading: dialog?.querySelector('h2')?.textContent ?? null, dialogHtml: dialog?.outerHTML ?? null, dialog: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      email: field('email'), password: field('password'), ageConfirmed: dialog?.querySelector('input[type="checkbox"]')?.checked ?? null, emailFocused: document.activeElement?.id === 'email',
      pageWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
  });
  const observe = async name => { const value = await bounded(snapshot(), 'DOM and storage ' + name); row.observations.push({ stage: name, ...value }); return value; };
  const shot = async name => { const file = id + '-' + name + '.png'; await bounded(page.screenshot({ path: path.join(OUT, file) }), 'Screenshot ' + file); row.screenshots.push(receipt(file)); };
  const quiet = async () => {
    const start = Date.now(); while (pendingJs.size || Date.now() - lastJs < 1000) { assert(Date.now() - start < 20000, 'Owned JavaScript reaches a bounded quiet period'); await page.waitForTimeout(100); }
    await bounded(Promise.all(bodyTasks), 'All physical response bodies'); assert.deepEqual(row.evidenceErrors, []);
  };
  const pointer = async locator => {
    const box = await locator.boundingBox(); assert(box && box.width > 0 && box.height > 0, 'A real control is painted');
    const point = [box.x + box.width / 2, box.y + box.height / 2]; assert(point[0] >= 0 && point[0] < width && point[1] >= 0 && point[1] < row.height);
    assert.equal(await locator.evaluate((element, p) => element.contains(document.elementFromPoint(p[0], p[1])), point), true, 'Actual pointer reaches the control without forced click or click-time scrolling');
    if (width === 320) await page.touchscreen.tap(point[0], point[1]); else await page.mouse.click(point[0], point[1]);
  };
  const openers = { header: () => page.getByRole('button', { name: 'Log In', exact: true }), home: () => page.getByRole('button', { name: 'Make a free one', exact: true }), navbar: () => page.getByRole('button', { name: /Sign up to track your stats|Track stats/i }) };
  const formReady = async heading => {
    await page.getByRole('heading', { name: heading, exact: true }).waitFor(); await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'email'); await quiet();
  };
  const held = (actual, expected, allowNewDocument = false) => { assert.deepEqual(actual.stores, expected.stores, 'All local and session bytes held'); assert.deepEqual(actual.window, expected.window, 'Outer page does not jump'); if (!allowNewDocument) { assert.equal(actual.timeOrigin, expected.timeOrigin); assert.equal(actual.href, expected.href); } assert(actual.pageWidth <= actual.clientWidth + 1); };
  const close = async (opener, escape = false) => {
    if (escape) await page.keyboard.press('Escape'); else { const button = page.getByRole('button', { name: 'Close', exact: true }); await button.scrollIntoViewIfNeeded(); await pointer(button); }
    await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(await opener.evaluate(element => element.isConnected && document.activeElement === element), true, 'Same connected opener regains focus');
  };
  try {
    page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
    page.on('pageerror', error => row.errors.push(String(error.stack || error)));
    page.on('console', message => { if (message.type() === 'error') row.console.push({ type: message.type(), text: message.text() }); });
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    const rulesTitle = { 'boot-hot-seat': 'How to Play Manager Hot Seat', 'boot-deadline-day': 'How to Play Deadline Day' }[id];
    if (rulesTitle) {
      const rules = page.getByRole('dialog', { name: rulesTitle, exact: true }); await rules.waitFor();
      await observe('entry-rules');
      const play = rules.getByRole('button', { name: "Let's Play!", exact: true }); await play.scrollIntoViewIfNeeded(); await pointer(play);
      await rules.waitFor({ state: 'hidden' });
      row.rulesEntry = { title: rulesTitle, action: "Let's Play!", method: 'actual native pointer', dismissed: true };
    }
    if (route === '/') await openers.header().waitFor(); else await openers.navbar().waitFor();
    await quiet(); row.jsRequestedBeforeOpen = [...new Set(row.requests.filter(item => item.owned && isJs(item.url)).map(item => item.url))].sort();
    row.authFetchedBeforeOpen = row.jsRequestedBeforeOpen.includes(authUrl);
    assert.equal(row.authFetchedBeforeOpen, VARIANT === 'original', 'Actual closed route AuthModal holder request');
    const first = await observe('boot'); row.storesBefore = first.stores;
    assert.equal(row.documents.length, 1); assert.equal(row.documents[0].method, 'GET'); assert.equal(row.documents[0].status, 200);
    await bounded(work({ page, context, row, first, observe, shot, quiet, pointer, openers, formReady, held, close,
      hold: () => { assert(!holdAuth); holdAuth = true; holdPromise = new Promise(resolve => { releaseAuth = resolve; }); },
      release: () => { holdAuth = false; releaseAuth(); } }), 'Actual case ' + id, 90000);
    await quiet(); row.storesAfter = (await observe('final')).stores;
    assert.deepEqual(row.errors, [], 'No page errors, including failed-import recovery'); assert.deepEqual(row.evidenceErrors, []);
    const ownedFailures = row.failures.filter(item => item.owned);
    if (id === 'offline-retry') {
      assert(ownedFailures.length >= 1, 'Actual first account import path fails while offline');
      for (const failure of ownedFailures) { assert(row.coldAccountAssets.urls.includes(failure.url), 'Every owned failure is from the independently measured healthy cold account path'); assert(/ERR_INTERNET_DISCONNECTED|ERR_FAILED|NS_ERROR_OFFLINE/i.test(failure.error)); }
    } else assert.equal(ownedFailures.length, 0);
    for (const request of row.requests.filter(item => item.owned && isJs(item.url))) {
      const successful = row.js.some(item => item.url === request.url), declaredFailure = ownedFailures.some(item => item.url === request.url);
      assert(successful || declaredFailure, 'Every requested owned JS has a physical200 body or a declared offline failure in the independently measured cold account path');
    }
    row.status = 'passed';
  } catch (error) { row.status = 'failed'; row.error = String(error.stack || error); }
  finally {
    holdAuth = false; releaseAuth();
    try { await bounded(context.close(), 'Context cleanup'); } catch (error) { row.status = 'failed'; row.cleanupError = String(error); }
    try { await bounded(Promise.all(bodyTasks), 'Final response receipts'); } catch (error) { row.status = 'failed'; row.cleanupError = String(error); }
    if (row.evidenceErrors.length) row.status = 'failed';
    write(id + '.json', row); row.rawReceipt = receipt(id + '.json'); checkpoint();
  }
}
try {
  browser = await pw.chromium.launch({ headless: true }); report.browserVersion = browser.version(); report.executable = pw.chromium.executablePath();
  for (const [id, route] of [['boot-club-manager', '/club-manager'], ['boot-hot-seat', '/manager-hot-seat'], ['boot-deadline-day', '/deadline-day']]) {
    await runCase(report.boot, id, route, 1440, async () => {});
  }
  if (VARIANT === 'fixed') {
    for (const caller of ['header', 'home', 'navbar']) for (const width of [320, 1440]) {
      await runCase(report.journeys, caller + '-' + width, caller === 'navbar' ? '/club-manager' : '/', width, async api => {
        const { page, row, observe, shot, pointer, openers, formReady, held, close } = api;
        const opener = openers[caller](); await opener.scrollIntoViewIfNeeded(); const before = await observe('before-open');
        await pointer(opener); await formReady(caller === 'header' ? 'Welcome Back!' : 'Join DoUKnowBall');
        const opened = await observe('opened'); held(opened, before); assert(opened.emailFocused); await shot('form');
        for (const [field, value] of [['Email', 'fixture@example.invalid'], ['Password', 'retained-field-only']]) {
          const input = field === 'Email' ? page.getByRole('textbox', { name: 'Email', exact: true }) : page.getByLabel('Password', { exact: true });
          await input.scrollIntoViewIfNeeded(); await pointer(input); await page.keyboard.insertText(value);
        }
        if (caller !== 'header') { const box = page.getByRole('checkbox'); await box.scrollIntoViewIfNeeded(); await pointer(box); }
        const typed = await observe('typed'); held(typed, before); assert.equal(typed.email, 'fixture@example.invalid'); assert.equal(typed.password, 'retained-field-only');
        if (caller !== 'header') assert.equal(typed.ageConfirmed, true);
        await close(opener); const closed = await observe('closed'); held(closed, before); assert.equal(closed.heading, null);
        const requestsBeforeReopen = row.requests.filter(item => item.url === authUrl).length;
        await pointer(opener); await formReady(caller === 'header' ? 'Welcome Back!' : 'Join DoUKnowBall');
        const reopened = await observe('reopened'); held(reopened, before); assert.equal(reopened.email, typed.email); assert.equal(reopened.password, typed.password); assert.equal(reopened.ageConfirmed, typed.ageConfirmed); await shot('reopened');
        assert.equal(row.requests.filter(item => item.url === authUrl).length, requestsBeforeReopen); assert.equal(requestsBeforeReopen, 1);
        await close(opener, true); held(await observe('closed-again'), before); assert.equal(row.documents.length, 1);
      });
    }
    const healthy = report.journeys.find(row => row.id === 'navbar-320'); assert.equal(healthy?.status, 'passed');
    const coldUrls = [...new Set(healthy.requests.filter(item => item.owned && isJs(item.url)).map(item => item.url))].filter(url => !healthy.jsRequestedBeforeOpen.includes(url)).sort();
    assert(coldUrls.length > 0 && coldUrls.includes(authUrl), 'Actual healthy account opening requests its emitted holder');
    const coldFiles = coldUrls.map(url => { const file = healthy.js.find(item => item.url === url); assert(file && file.status === 200 && file.diskSha256 === file.bodySha256); return file; });
    report.coldAccountAssets = { healthyCaseId: healthy.id, healthyRawReceipt: healthy.rawReceipt, jsRequestedBeforeOpen: healthy.jsRequestedBeforeOpen, urls: coldUrls, files: coldFiles }; checkpoint();
    for (const id of ['pending-cancel', 'pending-complete']) await runCase(report.journeys, id, '/club-manager', 320, async api => {
      const { page, row, observe, shot, pointer, openers, formReady, held, close } = api;
      const opener = openers.navbar(); await opener.scrollIntoViewIfNeeded(); const before = await observe('before-open'); api.hold(); await pointer(opener);
      await page.getByRole('heading', { name: 'Opening your account', exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
      const waiting = await observe('waiting'); held(waiting, before); assert.equal(waiting.email, null); await shot('waiting');
      assert.equal(row.held.length, 1);
      await close(opener, id === 'pending-complete'); held(await observe('cancelled'), before);
      if (id === 'pending-complete') { await pointer(opener); await page.getByRole('heading', { name: 'Opening your account', exact: true }).waitFor(); }
      api.release(); await api.quiet();
      if (id === 'pending-cancel') { assert.equal(await page.getByRole('dialog').count(), 0); await pointer(opener); }
      await formReady('Join DoUKnowBall'); const opened = await observe('completed'); held(opened, before); assert.equal(opened.email, ''); assert(opened.emailFocused); await shot('form');
      await close(opener); held(await observe('closed'), before); assert.equal(row.requests.filter(item => item.url === authUrl).length, 1); assert.equal(row.documents.length, 1);
    });
    await runCase(report.journeys, 'offline-retry', '/club-manager', 320, async api => {
      const { page, context, row, observe, shot, pointer, openers, formReady, held, close } = api;
      const opener = openers.navbar(); await opener.scrollIntoViewIfNeeded(); const before = await observe('before-offline');
      await context.setOffline(true); assert.equal(await page.evaluate(() => navigator.onLine), false); await pointer(opener);
      await page.getByRole('heading', { name: 'Account could not open', exact: true }).waitFor();
      const failed = await observe('failed'); held(failed, before); assert.equal(failed.email, null); assert.equal(row.documents.length, 1); await shot('failed');
      const retry = page.getByRole('button', { name: 'Try again', exact: true }); await retry.scrollIntoViewIfNeeded(); await pointer(retry);
      await page.getByText('Reconnect, or save your game, then try again.', { exact: true }).waitFor();
      held(await observe('offline-retry-blocked'), before); assert.equal(row.documents.length, 1); assert.equal(await page.evaluate(() => navigator.onLine), false);
      await context.setOffline(false); assert.equal(await page.evaluate(() => navigator.onLine), true);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), pointer(retry)]);
      await openers.navbar().waitFor(); await api.quiet(); const reloaded = await observe('user-reloaded');
      assert.notEqual(reloaded.timeOrigin, before.timeOrigin); assert.equal(row.documents.length, 2);
      for (const document of row.documents) { assert.equal(document.status, 200); assert.equal(document.method, 'GET'); assert.equal(new URL(document.url).pathname, '/club-manager'); }
      assert.deepEqual(reloaded.stores, before.stores); assert.equal(reloaded.heading, null);
      const freshOpener = openers.navbar(); await freshOpener.scrollIntoViewIfNeeded(); const freshBefore = await observe('before-reopen'); await pointer(freshOpener); await formReady('Join DoUKnowBall');
      const recovered = await observe('recovered'); held(recovered, freshBefore); assert.equal(recovered.email, ''); await shot('recovered'); await close(freshOpener);
      assert.deepEqual((await observe('recovered-closed')).stores, before.stores);
    });
  }
  assert.equal(report.boot.length, 3); assert.equal(report.journeys.length, VARIANT === 'fixed' ? 9 : 0);
  assert([...report.boot, ...report.journeys].every(row => row.status === 'passed'), 'Every finite case must actually complete');
  assert.equal(report.journeys.reduce((sum, row) => sum + row.screenshots.length, 0), VARIANT === 'fixed' ? 18 : 0);
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.errors.push(String(error.stack || error)); }
finally {
  if (browser) try { await bounded(browser.close(), 'Browser cleanup'); } catch (error) { report.status = 'failed'; report.qualified = false; report.errors.push(String(error)); }
  const afterSource = sourceBindings(), afterDist = tree(DIST); write('source-bindings.after.json', afterSource); write('dist.after.json', afterDist);
  report.sourceHeld = JSON.stringify(beforeSource) === JSON.stringify(afterSource); report.distHeld = JSON.stringify(beforeDist) === JSON.stringify(afterDist);
  if (!report.sourceHeld || !report.distHeld) { report.status = 'failed'; report.qualified = false; report.errors.push('Actual selected source or complete dist bytes changed'); }
  checkpoint();
}
console.log('Account dialog served method: ' + VARIANT + ' ' + report.status + '; ' + report.boot.filter(row => row.status === 'passed').length + '/3 route boots; ' + report.journeys.filter(row => row.status === 'passed').length + '/' + (VARIANT === 'fixed' ? 9 : 0) + ' UI journeys. No READY or live claim.');
if (report.status !== 'passed') process.exitCode = 1;
