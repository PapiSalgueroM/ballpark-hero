// Actual production press-room import failure and healthy answer, with external IO held locally.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import pw from '../lib/playwrightLoader.mjs';
import { bundlePressMarket } from './careerPressMarketKit.mjs';

const BASE = process.env.BASE || process.env.SWEEP_BASE, OUT = process.env.PRESS_ROOM_FAILURE_BROWSER_OUT;
assert(process.env.CI === '1' || process.env.CI === 'true', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Inherited offline preload');
assert(BASE && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'Supplied loopback production server');
assert(OUT && path.isAbsolute(OUT) && !fs.existsSync(OUT), 'Fresh absolute browser output');
fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = new URL(BASE).origin, ROUTE = ORIGIN + '/soccer-career', SAVE = 'soccerCareerSave', NOW = Date.parse('2026-10-17T12:00:00Z');
const sha = body => createHash('sha256').update(body).digest('hex'), clone = value => JSON.parse(JSON.stringify(value));
const put = (file, value) => { const body = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body, { flag: 'wx' }); return { file, bytes: body.length, sha256: sha(body) }; };
const bodyRef = body => { const bytes = Buffer.from(body), file = `bodies/${sha(bytes)}.bin`, target = path.join(OUT, file);
  if (!fs.existsSync(target)) return put(file, bytes); assert(fs.readFileSync(target).equals(bytes)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const report = { version: 1, status: 'running', qualified: false, cases: [], controls: [] };
try {
const sourceNames = git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const filesBelow = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesBelow(path.join(root, entry.name)) : [path.join(root, entry.name)]).sort();
const inventory = files => Object.fromEntries(files.map(file => [file, { bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }]));
const sourceBefore = inventory(sourceNames), distNames = filesBelow('dist'), distBefore = inventory(distNames);
const require = createRequire(import.meta.url), pwPackage = fs.realpathSync(require.resolve('playwright/package.json'));
assert.equal(JSON.parse(fs.readFileSync(pwPackage)).version, '1.64.0'); assert.equal(process.versions.node.split('.')[0], '24');
const browserExecutable = pw.chromium.executablePath(), toolNames = [process.execPath, pwPackage, browserExecutable].sort(), toolsBefore = inventory(toolNames);
const cache = process.env.FREE_KICK_FONT_CACHE; assert(cache && path.isAbsolute(cache), 'Prepared actual font cache');
const fontNames = filesBelow(cache), fontsBefore = inventory(fontNames), manifest = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json')));
assert.equal(manifest.length, 9); assert.equal(fontNames.length, 10);
const fonts = new Map(manifest.map(entry => { const body = fs.readFileSync(path.join(cache, entry.file)); assert.equal(sha(body), entry.sha256); return [entry.url, { body, contentType: entry.contentType }]; }));
const pressAssets = fs.readdirSync('dist/assets').filter(file => /^PressRoom-[\w-]+\.js$/.test(file)); assert.equal(pressAssets.length, 1, 'Actual isolated production PressRoom chunk');
const CHUNK = '/assets/' + pressAssets[0], chunkBody = bodyRef(fs.readFileSync('dist' + CHUNK));
Object.assign(report, { head: git(['rev-parse', 'HEAD']).toString().trim(), declarations: { widths: [390, 1280], modes: ['failed-import', 'healthy-answer'] },
  scope: 'Actual built page, one deliberately aborted local PressRoom module, normal storage and actual answer. Browser offline hint prevents the unchanged global reload policy. Unit proof separately covers the actual pending-save registry.',
  limits: 'No live database, backend storage failure, global reload-policy fix, browser retry button or full focus-trap claim. Copied observation controls are separate from served application code.',
  sourceBefore: put('source-before.json', sourceBefore), distBefore: put('dist-before.json', distBefore), toolsBefore: put('tools-before.json', toolsBefore), fontsBefore: put('fonts-before.json', fontsBefore),
  chunk: { url: ORIGIN + CHUNK, body: chunkBody } });
const recoveryFindings = value => [value.expectedSave !== value.actualSave && 'save', !value.parent && 'parent',
  (value.beforeNonce !== value.afterNonce || value.beforeTimeOrigin !== value.afterTimeOrigin || value.documents !== 1 || value.navigationTypes.join() !== 'navigate') && 'reload', !value.focus && 'focus', value.beforeY !== value.afterY && 'scroll'].filter(Boolean);
const layoutFindings = value => [(value.width !== value.requestedWidth || value.clientWidth > value.requestedWidth + 1 || Math.abs(value.scale - 1) > 0.01) && 'viewport-scale', value.overflow && 'overflow', (!value.painted || value.opacity !== 1 || !value.button.painted) && 'paint',
  (value.rect.x < 0 || value.rect.right > value.width + 1 || value.rect.y < 0 || value.rect.bottom > value.height + 1) && 'viewport',
  (value.button.width < 43.5 || value.button.height < 43.5) && 'target', (!value.fonts || value.stable < 4 || value.animations !== 0) && 'readiness'].filter(Boolean);
function copiedControl(id, actual, mutate, detector, expected) {
  const before = put(`controls/${id}-before.json`, actual), changed = clone(actual); assert.deepEqual(detector(actual), []); mutate(changed);
  const fault = put(`controls/${id}-fault.json`, changed); assert.notDeepEqual(changed, actual); assert.notEqual(fault.sha256, before.sha256);
  const findings = detector(changed); assert.deepEqual(findings, expected); const undo = put(`controls/${id}-undo.json`, clone(actual)); assert.equal(undo.sha256, before.sha256);
  report.controls.push({ id, before, fault, undo, changed: true, findings, wholeUndo: true, status: 'passed', scope: 'Copied actual observation only' });
}
let browser, oracleContext;
try {
  assert.equal(sha(fs.readFileSync('src/components/soccer-career/PressRoomTile.tsx')), '39b584d461e6a242973f55749652c09bb829dd92184ccba1a3f2e8b5632b54f9', 'Exact qualified local-boundary source');
  const bundle = await bundlePressMarket({ browser: true }); report.oracle = { script: put('actual-oracle.js', bundle.value), loaded: put('oracle-loaded-source.json', bundle.loaded), faults: bundle.faults }; assert.deepEqual(bundle.faults, []);
  browser = await pw.chromium.launch({ headless: true, executablePath: browserExecutable }); report.runtime = { node: process.version, playwright: '1.64.0', chromium: browser.version(), executable: browserExecutable }; oracleContext = await browser.newContext();
  await oracleContext.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>Isolated current engine oracle</body></html>' }));
  const oracle = await oracleContext.newPage(); await oracle.goto(ORIGIN + '/__press-room-oracle'); await oracle.addScriptTag({ content: bundle.value });
  const fixture = await oracle.evaluate(now => {
    const B = PressMarketOracle, random = Math.random, clock = Date.now; Math.random = () => 0.99; Date.now = () => now;
    try { const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
      const start = B.engine.initCareer('Press Failure Browser Fixture', 'England', 'ST', '2020s', stats, 80, 2020, B.engine.FALLBACK_CLUBS, null, 90);
      const career = { ...start, phase: 'playing', age: 25, retired: false, currentClub: 'Press Fixture Town', currentClubCountry: 'England', currentClubTier: 3, currentLeague: 'Fixture League',
        seasons: [{ ...start.seasons[0], year: 2025, age: 25, club: 'Press Fixture Town', clubCountry: 'England', clubTier: 3, type: 'playing', apps: 28, leagueApps: 24, goals: 14, assists: 8, rating: 7.1 }],
        popularity: 50, morale: 50, events: ['Fictional browser failure fixture'], pendingEvents: [], pendingOffers: [], pendingSummary: null, pendingBallonDor: null };
      delete career.pressRoom; const value = B.engine.repairCareer(career); B.moments.settleLoadedMoments(value); return value;
    } finally { Math.random = random; Date.now = clock; }
  }, NOW);
  report.fixture = put('fictional-career.json', fixture); assert(JSON.stringify(fixture).length < 60000, 'Small actual fixture keeps literal save serialization');
  for (const width of report.declarations.widths) for (const mode of report.declarations.modes) {
    const id = `${width}-${mode}`, failed = mode === 'failed-import', row = { id, width, mode, status: 'running', requests: [], failedRequests: [], documents: [], assets: [], errors: [], console: [], observations: [], shots: [], layouts: [], fonts: [] };
    report.cases.push(row); const pending = new Set(); let breakChunk = false;
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: SAVE, value: JSON.stringify(fixture) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-guest-handle', value: 'PressFixture-18' }, { name: 'rules-gate-seen:/soccer-career', value: '1' }] }] } });
    await context.addInitScript(now => { Date.now = () => now; window.__press1411 = { nonce: crypto.randomUUID(), timeOrigin: performance.timeOrigin, draws: [] };
      const random = Math.random; Math.random = () => { const value = random(); window.__press1411.draws.push({ value, caller: new Error().stack }); return value; }; }, NOW);
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), record = { url: request.url(), method: request.method(), resourceType: request.resourceType(), action: null }; row.requests.push(record);
      try {
        if (url.origin === ORIGIN) {
          if (breakChunk && url.pathname === CHUNK) { assert.equal(request.resourceType(), 'script'); record.action = 'aborted actual built PressRoom module'; record.builtBody = chunkBody; await route.abort('failed'); return; }
          record.action = 'served unchanged loopback build'; await route.continue(); return;
        }
        if (fonts.has(url.href)) { record.action = 'fulfilled verified cached font'; row.fonts.push(url.href); await route.fulfill({ ...fonts.get(url.href), headers: { 'access-control-allow-origin': '*' } }); return; }
        if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co') { record.action = 'held unrelated external IO'; const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          await route.fulfill({ status: request.method() === 'OPTIONS' ? 204 : 200, headers, contentType: 'application/json', body: request.method() === 'OPTIONS' ? '' : request.method() === 'GET' ? '[]' : '{}' }); return; }
        record.action = 'aborted unrelated external resource'; await route.abort('blockedbyclient');
      } catch (error) { record.error = String(error.stack || error); row.errors.push({ kind: 'route-handler', message: record.error }); try { await route.abort('failed'); } catch {} }
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => row.errors.push({ kind: 'pageerror', message: String(error.stack || error) }));
    page.on('console', message => row.console.push({ type: message.type(), text: message.text(), location: message.location() }));
    page.on('requestfailed', request => row.failedRequests.push({ url: request.url(), resourceType: request.resourceType(), error: request.failure()?.errorText }));
    page.on('request', request => { if (request.isNavigationRequest() && request.resourceType() === 'document' && request.frame() === page.mainFrame()) row.documents.push({ url: request.url(), method: request.method() }); });
    page.on('response', response => {
      if (new URL(response.url()).origin !== ORIGIN) return;
      const record = { url: response.url(), status: response.status() }; row.assets.push(record);
      const job = (async () => { try { const body = await response.body(), relative = decodeURIComponent(new URL(response.url()).pathname).replace(/^\/+/, ''), full = path.resolve('dist', relative || 'index.html'), root = path.resolve('dist');
        assert(full.startsWith(root + path.sep)); const actual = fs.statSync(full).isDirectory() ? path.join(full, 'index.html') : full;
        const built = fs.readFileSync(actual); assert.equal(response.status(), 200); assert(built.equals(body), 'Served bytes equal actual production build'); record.body = bodyRef(body); record.built = { file: path.relative(process.cwd(), actual).replaceAll('\\', '/'), ...bodyRef(built) };
      } catch (error) { record.error = String(error.stack || error); } })(); pending.add(job); job.finally(() => pending.delete(job));
    });
    async function snapshot(label) {
      while (pending.size) await Promise.all([...pending]);
      const observed = await page.evaluate(key => ({ save: localStorage.getItem(key), storage: Object.fromEntries(Object.entries(localStorage)), parent: !!document.querySelector('[data-press-room-open]'),
        html: document.body.innerHTML, main: document.querySelector('#dukb-main')?.outerHTML ?? null, focus: document.activeElement?.outerHTML ?? null, tileFocused: document.activeElement === document.querySelector('[data-press-room-open]'),
        y: scrollY, overflow: document.body.style.overflow, online: navigator.onLine, href: location.href, identity: window.__press1411, navigation: performance.getEntriesByType('navigation').map(entry => ({ name: entry.name, type: entry.type })),
        reloaded: sessionStorage.getItem('dukb-reloaded-stale-chunk'), clicked: window.__press1411Clicked ?? null }), SAVE);
      const ref = put(`${id}/${label}.json`, observed); row.observations.push({ label, ...ref }); return observed;
    }
    async function capture(label, selector, buttonSelector) {
      await page.evaluate(async () => { await document.fonts.ready; });
      const value = await page.locator(selector).evaluate(async (element, { buttonSelector, requestedWidth }) => {
        const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        let last = '', stable = 0, value; const started = performance.now();
        do { await new Promise(requestAnimationFrame); const button = document.querySelector(buttonSelector); if (!button) throw Error('Measured actual Back control missing');
          const rect = box(element), style = getComputedStyle(element), point = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2), buttonBox = box(button), buttonStyle = getComputedStyle(button);
          const buttonPoint = document.elementFromPoint(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
          value = { width: innerWidth, height: innerHeight, requestedWidth, clientWidth: document.documentElement.clientWidth, scale: visualViewport?.scale ?? 1, overflow: document.documentElement.scrollWidth > innerWidth + 1, rect,
            button: { ...buttonBox, painted: !!buttonPoint && (buttonPoint === button || button.contains(buttonPoint)) && buttonStyle.visibility === 'visible' && buttonStyle.display !== 'none' && Number(buttonStyle.opacity) === 1 },
            painted: !!point && (point === element || element.contains(point)) && style.visibility === 'visible' && style.display !== 'none', opacity: Number(style.opacity),
            fonts: document.fonts.status === 'loaded' && ['Inter', 'Space Grotesk'].every(family => document.fonts.check(`400 16px "${family}"`, 'Press room')),
            fontFaces: [...document.fonts].map(face => ({ family: face.family, status: face.status })), animations: document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length };
          const signature = JSON.stringify(value); stable = signature === last ? stable + 1 : 1; last = signature;
          if (stable >= 4 && value.animations === 0 && value.fonts) break;
        } while (performance.now() - started < 10000); return { ...value, stable };
      }, { buttonSelector, requestedWidth: width });
      const measure = put(`${id}/${label}-layout.json`, value); row.layouts.push({ label, ...measure }); assert.deepEqual(layoutFindings(value), []);
      const file = `${id}/${label}.png`; assert(!fs.existsSync(path.join(OUT, file))); await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.shots.push({ file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))) }); return value;
    }
    try {
      await page.goto(ROUTE, { waitUntil: 'networkidle' }); const tile = page.locator('[data-press-room-open]'); await tile.waitFor({ state: 'visible' });
      await tile.scrollIntoViewIfNeeded(); await page.evaluate(async () => { await document.fonts.ready; });
      const before = await snapshot('before-open'); assert(before.parent && before.save); assert.equal(JSON.parse(before.save).playerName, fixture.playerName); assert.equal(before.href, ROUTE);
      assert.equal(row.requests.filter(request => new URL(request.url).pathname === CHUNK).length, 0, 'PressRoom stayed lazy before the actual click');
      await tile.evaluate(element => element.addEventListener('click', () => { window.__press1411Clicked = { y: scrollY, overflow: document.body.style.overflow }; }, { capture: true, once: true }));
      if (failed) { breakChunk = true; await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })); }
      await tile.click();
      if (failed) {
        const dialog = page.getByRole('dialog', { name: 'Press room unavailable', exact: true }); await dialog.waitFor({ state: 'visible' });
        const rejected = await snapshot('actual-import-rejected'); assert.equal(rejected.online, false); assert(rejected.parent); assert.equal(rejected.save, before.save); assert.equal(rejected.y, rejected.clicked.y);
        assert.equal(rejected.reloaded, null); assert(await dialog.evaluate(element => element.contains(document.activeElement))); assert.equal(await page.getByText('This page broke', { exact: true }).count(), 0);
        const layout = await capture('failure', '[role="dialog"][aria-labelledby="press-room-failure-title"]', '#press-room-failure-title ~ button');
        await dialog.getByRole('button', { name: 'Back to your career', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
        const closed = await snapshot('back-to-career'); const recovery = { expectedSave: sha(before.save), actualSave: sha(closed.save), parent: closed.parent, beforeNonce: before.identity.nonce, afterNonce: closed.identity.nonce,
          beforeTimeOrigin: before.identity.timeOrigin, afterTimeOrigin: closed.identity.timeOrigin, documents: row.documents.length, navigationTypes: closed.navigation.map(entry => entry.type), focus: closed.tileFocused, beforeY: rejected.clicked.y, afterY: closed.y };
        row.recovery = put(`${id}/recovery.json`, recovery); assert.deepEqual(recoveryFindings(recovery), []);
        await tile.click(); await dialog.waitFor({ state: 'visible' }); await snapshot('failed-room-reopened'); await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
        const escaped = await snapshot('escape-to-career'); assert(escaped.tileFocused && escaped.parent); assert.equal(escaped.save, before.save); assert.equal(escaped.y, closed.y); assert.equal(escaped.identity.nonce, before.identity.nonce);
        const aborted = row.requests.filter(request => request.action === 'aborted actual built PressRoom module'); assert.equal(aborted.length, 1, 'Real module failure stays cached when the room is reopened'); assert.equal(aborted[0].url, ORIGIN + CHUNK);
        assert(row.failedRequests.some(request => request.url === ORIGIN + CHUNK));
        if (width === 390) { copiedControl('save-bytes', recovery, value => { value.actualSave = 'changed'; }, recoveryFindings, ['save']); copiedControl('document-identity', recovery, value => { value.afterNonce = 'replacement-document'; }, recoveryFindings, ['reload']); copiedControl('back-target', layout, value => { value.button.height = 20; }, layoutFindings, ['target']); }
      } else {
        const dialog = page.locator('[data-press-room] [role="dialog"]'); await dialog.waitFor({ state: 'visible' });
        await page.getByText('Say it, then back it up', { exact: true }).waitFor(); const opened = await snapshot('actual-room-open'); assert.equal(opened.save, before.save);
        const expected = await oracle.evaluate(input => { const before = JSON.parse(input), value = PressMarketOracle.press.answerSoccerPress(before, 'calm'); return value; }, before.save);
        report.cases.at(-1).expectedAnswer = put(`${id}/actual-engine-answer.json`, expected);
        await dialog.locator('[data-press-start]').click(); await dialog.locator('[data-press-answer="calm"]').click(); await dialog.locator('[data-press-receipt]').waitFor();
        await page.waitForFunction(({ key, expected }) => localStorage.getItem(key) === expected, { key: SAVE, expected: JSON.stringify(expected) });
        const answered = await snapshot('actual-answer-saved'); assert.equal(answered.save, JSON.stringify(expected)); assert.equal(expected.morale, JSON.parse(before.save).morale + 3); assert.equal(expected.popularity, JSON.parse(before.save).popularity - 2);
        await capture('healthy-answer', '[data-press-room] [role="dialog"]', '[data-press-close]'); await dialog.locator('[data-press-close]').click(); await dialog.waitFor({ state: 'hidden' });
        await tile.click(); await dialog.waitFor({ state: 'visible' }); await dialog.locator('[data-press-start]').click(); await dialog.locator('[data-press-history="0"]').waitFor();
        const history = await snapshot('actual-history-reopened'); assert.equal(history.save, answered.save); assert.equal(await dialog.locator('[data-press-history]').count(), 1);
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); const closed = await snapshot('healthy-back-to-career'); assert(closed.parent && closed.tileFocused); assert.equal(closed.save, answered.save); assert.equal(closed.identity.nonce, before.identity.nonce);
        assert.equal(row.requests.filter(request => new URL(request.url).pathname === CHUNK).length, 1); assert(row.assets.some(asset => new URL(asset.url).pathname === CHUNK && asset.body && asset.built));
      }
      while (pending.size) await Promise.all([...pending]);
      assert.equal(row.documents.length, 1); assert.equal(row.documents[0].url, ROUTE); assert(row.fonts.length > 0); assert(row.assets.length > 0 && row.assets.every(asset => !asset.error && asset.body && asset.built));
      const expectedError = message => failed && message.includes(ORIGIN + CHUNK) && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
      const unrelatedErrors = row.errors.filter(error => !expectedError(error.message)); assert.deepEqual(unrelatedErrors, [], 'No unrelated page exception');
      const abortedUrls = new Set(row.requests.filter(request => request.action?.startsWith('aborted')).map(request => request.url));
      for (const error of row.console.filter(message => message.type === 'error')) assert(expectedError(error.text) || (abortedUrls.has(error.location.url) && /Failed to load resource|Failed to load module script/i.test(error.text)), `Unrelated console error: ${error.text}`);
      row.status = 'passed'; console.log(`PASS Press room ${id}, complete save held and actual ${failed ? 'failed chunk / Back / Escape' : 'calm answer / history'} observed.`);
    } catch (error) { row.status = 'failed'; row.error = String(error.stack || error); await snapshot('failure-final').catch(failure => { row.captureError = String(failure); });
      const file = `${id}/failure.png`; try { assert(!fs.existsSync(path.join(OUT, file))); await page.screenshot({ path: path.join(OUT, file) }); row.failureShot = { file, sha256: sha(fs.readFileSync(path.join(OUT, file))) }; } catch (failure) { row.screenshotError = String(failure); }
    } finally { while (pending.size) await Promise.all([...pending]); put(`${id}/raw-case.json`, row); await context.close(); }
    assert.deepEqual(inventory(sourceNames), sourceBefore, `${id} whole source held`); assert.deepEqual(inventory(distNames), distBefore, `${id} whole dist held`);
  }
  assert.equal(report.cases.length, 4); assert(report.cases.every(row => row.status === 'passed')); assert.equal(report.controls.length, 3); report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); process.exitCode = 1; }
finally {
  if (oracleContext) await oracleContext.close(); if (browser) await browser.close();
  try { assert.deepEqual(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(), sourceNames); assert.deepEqual(filesBelow('dist'), distNames); assert.deepEqual(filesBelow(cache), fontNames);
    const after = { source: inventory(sourceNames), dist: inventory(distNames), tools: inventory(toolNames), fonts: inventory(fontNames) }; report.finalHolds = put('final-holds.json', after);
    assert.deepEqual(after.source, sourceBefore); assert.deepEqual(after.dist, distBefore); assert.deepEqual(after.tools, toolsBefore); assert.deepEqual(after.fonts, fontsBefore); report.held = true;
  } catch (error) { report.status = 'failed'; report.qualified = false; report.holdError = String(error.stack || error); process.exitCode = 1; }
  put('report.json', report); console.log(`Press room browser: ${report.status}, ${report.cases.length} actual journeys, ${report.controls.length} copied observation controls.`);
}
} catch (error) {
  report.status = 'failed'; report.qualified = false; report.setupOrFinalizationError = String(error.stack || error); process.exitCode = 1;
  if (!fs.existsSync(path.join(OUT, 'report.json'))) put('report.json', report);
  console.error(report.setupOrFinalizationError);
}
