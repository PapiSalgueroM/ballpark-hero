/* Baseline QA only. Observe native interruption; do not repair the application. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';
import { loadFonts, seed, sha, checkFonts, shellFixture } from './siteMenuNavigationSupport.mjs';

const BASE = 'http://127.0.0.1:4173', GAME = '/buzzer-beater';
const OUT = path.resolve(process.env.BUZZER_BROWSER_OUT || ''), DIST = path.resolve('dist');
assert(process.env.CI === 'true' && process.env.SIM_NETWORK === 'offline' && process.env.BUZZER_BROWSER_OUT, 'BUZZER_REMOTE_ONLY');
assert(process.env.DISPLAY && process.env.EXPECTED_PARENT && process.env.EXPECTED_TREE, 'BUZZER_BOUND_HEADED_METHOD');
assert(!fs.existsSync(OUT), 'BUZZER_FRESH_OUTPUT'); fs.mkdirSync(OUT, { recursive: true });
const held = {
  'src/components/buzzer-beater/BuzzerBeaterBoard.tsx': '705e7c481d88137334df6e8609b01c29974ac8a37cebfadc353c72cc89ac0388',
  'src/pages/BuzzerBeater.tsx': '024d3d8b740fa0a5ff7d5a10663a5be4416f5883a7e1f3686f95c5047245061b',
  'src/lib/buzzerBeater.ts': 'a5c8a689b52eba447f0f8c9deaba1d1c662a18363727d18b7ec0afc176fd4a88',
  'src/hooks/useArcadeFlight.ts': 'b622bd7973bdbf59196c580902d1e949c1552ed1724159898c0ccc523c29c465',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
};
const verifySources = () => { for (const [file, pin] of Object.entries(held)) assert.equal(sha(fs.readFileSync(file)), pin, 'BUZZER_SOURCE_HELD:' + file); };
verifySources();
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const manifestBody = fs.readFileSync(path.join(DIST, '.vite/manifest.json')), manifest = JSON.parse(manifestBody);
const html = fs.readFileSync(path.join(DIST, 'index.html')), htmlText = html.toString('utf8');
const app = manifest['index.html'], game = manifest['src/pages/BuzzerBeater.tsx'];
assert(app?.isEntry && game?.isDynamicEntry && game.src === 'src/pages/BuzzerBeater.tsx', 'BUZZER_ACTUAL_MANIFEST_ENTRIES');
for (const item of [app, game]) assert(/^assets\/[A-Za-z0-9._-]+\.js$/.test(item.file), 'BUZZER_MANIFEST_PATH');
assert(htmlText.includes('/' + app.file), 'BUZZER_FRESH_ROOT_ENTRY');
const authority = { manifestSHA256: sha(manifestBody), rootHTMLSHA256: sha(html), app: { file: app.file, sha256: sha(fs.readFileSync(path.join(DIST, app.file))) }, game: { file: game.file, sha256: sha(fs.readFileSync(path.join(DIST, game.file))) } };
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const profiles = [{ id: 'global-space', key: ' ', global: true }, { id: 'button-space', key: ' ', global: false }, { id: 'button-enter', key: 'Enter', global: false }];
const report = { status: 'PENDING', parent: process.env.EXPECTED_PARENT, parentTree: process.env.EXPECTED_TREE, headed: true, display: process.env.DISPLAY, authority, contexts: [], controls: [], featureReady: false };
const browser = await pw.chromium.launch({ headless: false });
report.browserVersion = browser.version();

function observe() {
  window.__buzzerNative = [];
  const target = node => node instanceof Element ? { tag: node.tagName, text: node.textContent.trim().slice(0, 100), aria: node.getAttribute('aria-label'), interactive: Boolean(node.closest('button,a[href],input,textarea,select,[role="button"],[contenteditable="true"]')) } : null;
  for (const type of ['focus', 'blur', 'visibilitychange', 'keydown', 'keyup']) {
    window.addEventListener(type, event => {
      if (window.__buzzerNative.length >= 512) return;
      window.__buzzerNative.push({ seq: window.__buzzerNative.length, type, key: event.key || null, repeat: Boolean(event.repeat), trusted: event.isTrusted, focus: document.hasFocus(), visibility: document.visibilityState, target: target(event.target), at: performance.now() });
    }, true);
  }
}
async function sample(page, label) {
  return page.evaluate(label => {
    const node = document.querySelector('[data-arcade-phase]'), text = node?.textContent.replace(/\s+/g, ' ') || '';
    const count = text.match(/Shot\s*(\d+)\s*\/\s*(\d+)/), strength = text.match(/Strength\s*(\d+)/), made = text.match(/Made\s*(\d+)/), points = text.match(/Points\s*(\d+)/);
    const active = document.activeElement;
    return { label, url: location.href, phase: node?.getAttribute('data-arcade-phase'), mode: node?.getAttribute('data-arcade-mode'), paused: node?.getAttribute('data-arcade-paused'),
      shot: count ? +count[1] : null, rounds: count ? +count[2] : null, made: made ? +made[1] : null, points: points ? +points[1] : null, power: strength ? +strength[1] : null,
      charging: Boolean([...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Release to shoot')),
      focused: document.hasFocus(), visibility: document.visibilityState, active: active ? { tag: active.tagName, text: active.textContent.trim().slice(0, 100), interactive: Boolean(active.closest('button,a[href],input,textarea,select,[role="button"],[contenteditable="true"]')) } : null,
      court: Boolean(document.querySelector('svg[role="img"][aria-label^="Jump shot from"]')), dialogs: document.querySelectorAll('[role="dialog"]').length,
      fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
      storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]), trace: [...window.__buzzerNative] };
  }, label);
}
function foundation(row) {
  const s = row.initial;
  assert(s.phase === 'aiming' && s.mode === 'unlimited' && s.paused === 'false' && s.shot === 1 && s.rounds === 10 && s.points === 0 && s.made === 0 && s.court && s.dialogs === 0, 'BUZZER_HEALTHY_REAL_GAME');
  assert(s.focused && s.visibility === 'visible', 'BUZZER_INITIAL_NATIVE_FOCUS');
  checkFonts(s.fonts);
}
function witness(row) {
  const after = row.returned.trace.filter(event => event.seq >= row.mark);
  assert(row.held.charging && row.held.phase === 'aiming', 'BUZZER_NATIVE_HOLD_REQUIRED');
  assert(Number.isInteger(row.beforeHold.power) && Number.isInteger(row.held.power)
    && row.beforeHold.power >= 0 && row.beforeHold.power <= 100 && row.held.power >= 0 && row.held.power <= 100
    && row.held.power !== row.beforeHold.power, 'BUZZER_NATIVE_POWER_MOVED_REQUIRED');
  assert(row.held.trace.some(event => event.seq >= row.mark && event.type === 'keydown' && event.key === row.spec.key && event.trusted && !event.repeat), 'BUZZER_TRUSTED_DOWN_REQUIRED');
  assert(row.away.focused === false || row.away.visibility === 'hidden', 'BUZZER_ACTUAL_FOCUS_LOSS_REQUIRED');
  assert(after.some(event => event.trusted && (event.type === 'blur' || (event.type === 'visibilitychange' && event.visibility === 'hidden'))), 'BUZZER_NATIVE_TRANSITION_REQUIRED');
  assert(!after.some(event => event.type === 'keyup' && event.key === row.spec.key), 'BUZZER_NO_RELEASE_BEFORE_RETURN');
  assert(row.returned.focused && row.returned.visibility === 'visible', 'BUZZER_NATIVE_RETURN_REQUIRED');
}
function wire(row) {
  assert(row.io.some(x => x.kind === 'prepared-font') && !row.io.some(x => x.kind === 'unknown-refused'), 'BUZZER_STRICT_IO');
  assert.equal(row.wire.pageErrors.length, 0, 'BUZZER_PAGE_ERROR'); assert.equal(row.wire.sockets.length, 0, 'BUZZER_SOCKET');
  const allowed = new Set(['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector']);
  const known = request => row.io.some(x => x.kind === 'source-shell-backend-abort' && x.url === request.url && x.method === request.method);
  for (const x of row.wire.failed) assert(allowed.has(x.error) && known(x), 'BUZZER_EXACT_ABORT');
  for (const x of row.wire.console.filter(x => x.type === 'error')) assert(row.wire.failed.some(r => allowed.has(r.error) && known(r) && r.url === x.url && x.text === 'Failed to load resource: ' + r.error), 'BUZZER_EXACT_CONSOLE');
  for (const item of [authority.app, authority.game]) assert(row.responses.some(x => x.path === '/' + item.file && x.sha256 === item.sha256 && x.status === 200), 'BUZZER_ACTUAL_FRESH_SCRIPT_RESPONSE');
}
async function boundary(context, row) {
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), item = { url: request.url(), method: request.method(), type: request.resourceType(), externalForwarded: false };
    try {
      assert(!url.username && !url.password && !url.hash, 'BUZZER_URL_SHAPE');
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(request.method()) && request.postData() === null && !url.search, 'BUZZER_LOCAL_GET_HEAD');
        if (url.pathname === GAME) {
          assert(request.resourceType() === 'document' && request.method() === 'GET', 'BUZZER_GAME_DOCUMENT');
          row.io.push({ ...item, kind: 'fresh-built-source-shell', sha256: sha(html) });
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
        }
        const file = path.resolve(DIST, '.' + decodeURIComponent(url.pathname));
        assert(file.startsWith(DIST + path.sep) && fs.statSync(file).isFile() && fs.realpathSync(file).startsWith(fs.realpathSync(DIST) + path.sep), 'BUZZER_COMPLETED_DIST_FILE');
        row.io.push({ ...item, kind: 'completed-dist', file: path.relative(DIST, file) }); return route.continue();
      }
      if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      const known = shellFixture(request, url);
      if (known) { row.io.push({ ...item, kind: 'source-shell-backend-abort', classifier: known.id, requestBodySHA256: request.postData() === null ? null : sha(request.postData()) }); return route.abort('blockedbyclient'); }
      throw new Error('BUZZER_UNKNOWN_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); return route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', socket => { row.wire.sockets.push(socket.url()); socket.close({ code: 1008, reason: 'Baseline refuses sockets' }); });
}
async function target(page, spec) {
  await page.getByRole('heading', { name: 'Buzzer Beater', exact: true, level: 1 }).click();
  if (spec.global) {
    assert(await page.evaluate(() => document.hasFocus() && !document.activeElement?.closest('button,a[href],input,textarea,select,[role="button"],[contenteditable="true"]')), 'BUZZER_NATIVE_GLOBAL_TARGET'); return;
  }
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.tagName === 'BUTTON' && document.activeElement.textContent.trim() === 'Hold to shoot')) return;
  }
  throw new Error('BUZZER_NATIVE_TAB_TARGET_MISSING');
}
async function normal(page, spec, label) {
  await target(page, spec); const before = await sample(page, label + '-before');
  await page.keyboard.down(spec.key);
  await page.getByRole('button', { name: 'Release to shoot', exact: true }).waitFor();
  await page.waitForTimeout(80); await page.keyboard.up(spec.key);
  await page.waitForFunction(() => document.querySelector('[data-arcade-phase]')?.getAttribute('data-arcade-phase') === 'shotEnd', null, { timeout: 4000 });
  const after = await sample(page, label + '-after'); await page.waitForTimeout(160); const quiet = await sample(page, label + '-quiet');
  assert(after.phase === 'shotEnd' && after.shot === before.shot && after.rounds === 10 && !after.charging, 'BUZZER_NORMAL_SHOT_CYCLE');
  assert.deepEqual([quiet.phase, quiet.shot, quiet.made, quiet.points], [after.phase, after.shot, after.made, after.points], 'BUZZER_NORMAL_VISIBLE_OUTCOME_STABLE');
  return { before, after, quiet };
}
async function image(page, row, stage) {
  const file = row.spec.id + '-' + stage + '.png'; await page.screenshot({ path: path.join(OUT, file) });
  const bytes = fs.readFileSync(path.join(OUT, file)); row.images.push({ file, bytes: bytes.length, sha256: sha(bytes), original: true });
}
try {
  for (const spec of profiles) {
    const row = { spec, images: [], responses: [], io: [], wire: { pageErrors: [], console: [], failed: [], sockets: [] }, methodError: null, failures: [] }; report.contexts.push(row);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', reducedMotion: 'no-preference', serviceWorkers: 'block' });
    const pending = [];
    try {
      await boundary(context, row);
      const other = await context.newPage(), page = await context.newPage();
      await page.addInitScript(seed, { theme: 'light', pending: false }); await page.addInitScript(observe);
      for (const surface of [page, other]) {
        surface.on('pageerror', error => row.wire.pageErrors.push(error.message));
        surface.on('console', m => row.wire.console.push({ type: m.type(), text: m.text(), url: m.location().url }));
        surface.on('requestfailed', r => row.wire.failed.push({ url: r.url(), method: r.method(), error: r.failure()?.errorText || null }));
      }
      page.on('response', response => {
        const pathname = new URL(response.url()).pathname;
        if ([authority.app.file, authority.game.file].some(file => pathname === '/' + file)) pending.push(response.body().then(body => row.responses.push({ path: pathname, status: response.status(), sha256: sha(body) })));
      });
      await page.goto(BASE + GAME, { waitUntil: 'domcontentloaded' }); await page.bringToFront();
      await page.getByRole('heading', { name: 'Buzzer Beater', exact: true, level: 1 }).waitFor();
      await page.getByRole('button', { name: 'How to play', exact: true }).click();
      const help = page.getByRole('dialog', { name: 'How to play', exact: true }); await help.waitFor({ state: 'visible' });
      row.help = { opened: true, text: await help.innerText(), closed: false };
      await help.getByRole('button', { name: "Let's Play!", exact: true }).click(); await help.waitFor({ state: 'hidden' }); row.help.closed = true;
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.hasFocus() && document.fonts.status === 'loaded' && document.fonts.check('16px Inter') && document.fonts.check('16px "Space Grotesk"'));
      await page.getByRole('button', { name: 'Unlimited', exact: true }).click();
      row.initial = await sample(page, 'initial'); foundation(row); await image(page, row, 'healthy');
      row.normalBefore = await normal(page, spec, 'ordinary-before');
      await page.getByRole('button', { name: 'Next shot', exact: true }).click(); await target(page, spec);
      row.beforeHold = await sample(page, 'before-interruption'); row.mark = row.beforeHold.trace.length;
      await page.keyboard.down(spec.key); await page.getByRole('button', { name: 'Release to shoot', exact: true }).waitFor(); await page.waitForTimeout(80);
      row.held = await sample(page, 'held');
      await other.bringToFront();
      await page.waitForFunction(() => !document.hasFocus() || document.visibilityState === 'hidden', null, { timeout: 2000, polling: 50 });
      row.away = await sample(page, 'away'); await other.waitForTimeout(80);
      await page.bringToFront(); await page.waitForFunction(() => document.hasFocus() && document.visibilityState === 'visible', null, { timeout: 2000 });
      row.returned = await sample(page, 'returned-still-held'); witness(row); await image(page, row, 'returned');
      await page.waitForTimeout(80); row.beforeRelease = await sample(page, 'before-one-original-keyup');
      await page.keyboard.up(spec.key);
      await page.waitForTimeout(60);
      if ((await sample(page, 'release-phase')).phase === 'flying') await page.waitForFunction(() => document.querySelector('[data-arcade-phase]')?.getAttribute('data-arcade-phase') === 'shotEnd', null, { timeout: 4000 });
      row.afterRelease = await sample(page, 'after-one-original-keyup'); await image(page, row, 'released');
      if (row.afterRelease.phase === 'shotEnd') await page.getByRole('button', { name: 'Next shot', exact: true }).click();
      row.fresh = await normal(page, spec, 'fresh-recovery');
      assert.deepEqual(row.beforeHold.storage, row.afterRelease.storage, 'BUZZER_INTERRUPTION_STORAGE_HELD');
      assert.deepEqual(row.beforeHold.storage, row.fresh.after.storage, 'BUZZER_FRESH_STORAGE_HELD');
      await Promise.all(pending); assert.equal(context.pages().length, 2, 'BUZZER_ONLY_TWO_NATIVE_TABS'); wire(row);
      row.diagnostics = { returnedCharging: row.returned.charging, powerContinues: row.returned.power !== row.beforeRelease.power,
        postKeyupProgressed: row.afterRelease.phase !== 'aiming' || ['shot', 'made', 'points'].some(key => row.afterRelease[key] !== row.beforeRelease[key]) };
      if (row.beforeRelease.charging && row.beforeRelease.phase === 'aiming' && row.afterRelease.phase === 'shotEnd'
        && row.afterRelease.shot === row.beforeRelease.shot) row.failures.push('BUZZER_ONE_RETURNED_KEYUP_SPENDS_SHOT');
    } catch (error) { row.methodError = { name: error.name, message: error.message, stack: error.stack }; }
    finally { await context.close(); write(spec.id + '.json', row); }
  }
} finally { await browser.close(); verifySources(); }
const clone = value => JSON.parse(JSON.stringify(value));
function copiedControl(id, original, healthy, corrupt, expected) {
  const file = id + '.control.json', actual = path.join(OUT, file), before = JSON.stringify(original) + '\n';
  fs.writeFileSync(actual, before, { flag: 'wx' }); healthy(JSON.parse(fs.readFileSync(actual)));
  const changed = clone(original); corrupt(changed); const bytes = JSON.stringify(changed) + '\n'; assert.notEqual(bytes, before, 'BUZZER_CONTROL_CHANGED');
  fs.writeFileSync(actual, bytes); let refusal = null;
  try { healthy(JSON.parse(fs.readFileSync(actual))); } catch (error) { refusal = { name: error.name, message: error.message }; }
  assert(refusal?.name === 'AssertionError' && refusal.message.includes(expected), 'BUZZER_CONTROL_OWNED_REFUSAL');
  const changedFile = id + '.changed.json'; fs.writeFileSync(path.join(OUT, changedFile), bytes, { flag: 'wx' });
  fs.writeFileSync(actual, before); healthy(JSON.parse(fs.readFileSync(actual)));
  assert.equal(fs.readFileSync(actual, 'utf8'), before, 'BUZZER_CONTROL_SAME_COPY_RESTORED');
  report.controls.push({ id, working: file, changed: changedFile, beforeSHA256: sha(before), changedSHA256: sha(bytes), restoredSHA256: sha(fs.readFileSync(actual)), refusal, sameCopyRestored: true, featureGreenCredit: false });
}
if (report.contexts.every(row => !row.methodError)) {
  const row = report.contexts[0];
  copiedControl('native-focus', row, foundation, x => { x.initial.focused = false; }, 'BUZZER_INITIAL_NATIVE_FOCUS');
  copiedControl('native-power', row, witness, x => { x.held.power = x.beforeHold.power; }, 'BUZZER_NATIVE_POWER_MOVED_REQUIRED');
  copiedControl('native-witness', row, witness, x => { x.away.focused = true; x.away.visibility = 'visible'; }, 'BUZZER_ACTUAL_FOCUS_LOSS_REQUIRED');
}
report.methodFailures = report.contexts.filter(row => row.methodError).length;
report.ownedCases = report.contexts.filter(row => row.failures.length).length;
report.diagnosticCases = report.contexts.filter(row => row.diagnostics && Object.values(row.diagnostics).some(Boolean)).length;
report.status = report.methodFailures ? 'BASELINE_METHOD_FAILURE' : report.ownedCases ? 'OWNED_NATIVE_CHARGE_INTERRUPTION_RED'
  : report.diagnosticCases ? 'NATIVE_DIAGNOSTICS_WITHOUT_OWNED_RED' : 'HYPOTHESIS_NOT_REPRODUCED';
write('BASELINE-REPORT.json', report);
if (report.methodFailures) { console.error('BUZZER_BASELINE_METHOD_FAILURE'); process.exitCode = 2; }
else if (report.ownedCases) { console.error('BUZZER_OWNED_NATIVE_CHARGE_INTERRUPTION_RED:' + report.ownedCases + '/3'); process.exitCode = 1; }
else if (report.diagnosticCases) console.log('BUZZER_NATIVE_DIAGNOSTICS_WITHOUT_OWNED_RED: no product fix authorized by this result.');
else console.log('BUZZER_HYPOTHESIS_NOT_REPRODUCED:3/3 native journeys healthy; no product fix authorized by this result.');
