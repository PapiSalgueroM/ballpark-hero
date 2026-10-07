/* Actual Soccer Career, an earned practice reward, and a refused local save. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACTS = path.join(ROOT, 'soccer-career-save-retry-artifacts');
const OUT = path.join(ARTIFACTS, 'native');
const CACHE = path.resolve(process.env.SOCCER_CAREER_SAVE_RETRY_FONT_CACHE || path.join(ARTIFACTS, 'font-cache'));
const SAVE_KEY = 'soccerCareerSave';
const WARNING = 'Your latest progress could not be saved. Keep this tab open, then try again.';
const digest = value => createHash('sha256').update(value).digest('hex');
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
assert(process.env.CI, 'Save recovery native execution runs only in remote CI');
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(CACHE, { recursive: true });
  const manifest = [];
  const download = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
    assert(response.ok, 'Font dependency response succeeds');
    const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
    fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: digest(body) });
    return body.toString('utf8');
  };
  const css = await download(sheets[0]);
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))];
  assert(urls.length > 0, 'Actual stylesheet declares font files');
  for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prepared ${manifest.length} Soccer Career font dependencies.`);
  process.exit(0);
}
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file)); assert.equal(digest(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(fonts.has(sheets[0]), 'Prefetch current fonts before the guarded native run');
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build the actual app before native verification');
const sourceFiles = [
  'src/pages/SoccerCareer.tsx', 'src/components/soccer-career/TrainingPanel.tsx',
  'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/hooks/usePracticeClock.ts',
  'src/components/ui/sonner.tsx', 'src/App.tsx', 'index.html', 'scripts/qa/soccerCareerSaveRetry1078.mjs',
];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const report = { started: new Date().toISOString(), sourceBefore: sourceHashes(), cases: [], controls: [], forwardedWrites: 0 };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const { chromium } = await import('../lib/playwrightLoader.mjs');
const { build } = await import('esbuild');
const baseline = await build({ absWorkingDir: ROOT, stdin: { contents: "export { initCareer, FALLBACK_CLUBS, repairCareer, applyTrainingResult, trainingAvailable } from './src/lib/soccerCareerEngine'; export { isSoccerCareerSave } from './src/lib/soccerCareerSave';", resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
const engine = await import('data:text/javascript;base64,' + Buffer.from(baseline.outputFiles[0].text).toString('base64'));
report.baseline = { sha256: digest(baseline.outputFiles[0].text), mode: 'Unmodified actual engine initialization, repair and training reward reducer; actual built app in browser' };
const initial = engine.initCareer('Native Save Retry', 'England', 'ST', '2020-24', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, engine.FALLBACK_CLUBS, undefined, 90);
assert(engine.isSoccerCareerSave(initial));
assert(engine.trainingAvailable(initial));
const initialBytes = JSON.stringify(initial);
fs.writeFileSync(path.join(OUT, 'initial-career.json'), initialBytes);
const protectedStorage = { 'unrelated-career-save': '{"keep":"exact"}', 'dukb-local-completions': '[]', 'dukb-streaks-v1': '{}', 'dukb-play-diary-v1': '[]' };
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start in 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
async function loadedFonts(page) {
  const result = await page.evaluate(async () => {
    await document.fonts.ready; const loaded = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Career save retry');
      loaded.push({ family, weight, faces: faces.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
    }
    return loaded;
  });
  for (const font of result) assert(font.faces.length > 0 && font.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === font.family), `Actual loaded ${font.family} ${font.weight}`);
  return result;
}
async function rect(locator) {
  return locator.evaluate(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; });
}
async function warningGeometry(page) {
  return page.locator('[data-soccer-save-status="failed"]').evaluate(node => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const button = node.querySelector('button'), copy = node.querySelector('p'), r = button.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, pane: box(node),
      copy: { ...box(copy), text: copy.textContent, font: parseFloat(getComputedStyle(copy).fontSize), clientWidth: copy.clientWidth, scrollWidth: copy.scrollWidth },
      button: { ...box(button), text: button.textContent, font: parseFloat(getComputedStyle(button).fontSize), clientWidth: button.clientWidth, scrollWidth: button.scrollWidth, hit: hit === button || button.contains(hit) } };
  });
}
function checkWarning(value) {
  assert(value.documentWidth <= value.viewport.width + 1, 'Warning does not cause horizontal overflow');
  for (const [name, box] of Object.entries({ pane: value.pane, copy: value.copy, button: value.button })) {
    assert(box.x >= -1 && box.right <= value.viewport.width + 1 && box.y >= -1 && box.bottom <= value.viewport.height + 1, `${name} is fully visible`);
  }
  assert.equal(value.copy.text, WARNING, 'Warning states the save problem and safe next step');
  assert(value.copy.font >= 12 && value.button.font >= 12, 'Warning and retry text are at least 12px');
  assert(value.copy.scrollWidth <= value.copy.clientWidth + 1 && value.button.scrollWidth <= value.button.clientWidth + 1, 'Warning and retry text are not clipped');
  assert(value.button.width >= 44 && value.button.height >= 44, 'Retry has a 44px target');
  assert(value.button.hit, 'Retry owns its hit target');
}
try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, theme: 'dark' },
    { width: 390, height: 844, touch: true, reduced: false, theme: 'light' },
    { width: 1280, height: 720, touch: false, reduced: false, theme: 'light' },
  ]) {
    const id = `${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${profile.theme}`;
    const row = { id, profile, screenshots: [], stages: [], geometry: [], events: [], writes: [], network: [], fontResponses: [], errors: [], consoleErrors: [], assetErrors: [], unexpectedAssets: [], webSockets: [] };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: SAVE_KEY, value: initialBytes }, { name: 'dukb-theme', value: profile.theme }, { name: 'cookie-consent', value: 'essential' },
      { name: 'rules-gate-seen:/soccer-career', value: '1' }, ...Object.entries(protectedStorage).map(([name, value]) => ({ name, value })),
    ] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      row.network.push({ method: request.method(), url: url.href, body: request.postData(), fulfilledLocally: true });
      if (request.method() === 'GET' && fonts.has(url.href)) {
        const cached = fonts.get(url.href); row.fontResponses.push({ url: url.href, sha256: digest(cached.body), bytes: cached.body.length });
        return route.fulfill({ status: 200, ...cached });
      }
      const type = request.resourceType();
      if (['font', 'image', 'stylesheet'].includes(type)) { row.unexpectedAssets.push({ type, url: url.href }); return route.abort(); }
      return route.fulfill({ status: 200, contentType: type === 'script' ? 'application/javascript' : 'application/json', body: type === 'script' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => { row.webSockets.push(socket.url()); socket.close(); });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    await page.clock.install({ time: new Date('2026-10-07T16:00:00Z') });
    await page.addInitScript(({ saveKey, warning }) => {
      window.__saveRetry = { refuse: false, writes: [], events: [], toasts: [] };
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        const refused = this === localStorage && key === saveKey && window.__saveRetry.refuse;
        if (this === localStorage) window.__saveRetry.writes.push({ key, value: String(value), refused, at: Date.now() });
        if (refused) throw new DOMException('Native test refuses this career save only', 'QuotaExceededError');
        return original.call(this, key, value);
      };
      const seen = new WeakSet();
      new MutationObserver(() => {
        for (const node of document.querySelectorAll('[data-sonner-toast]')) if (!seen.has(node) && node.textContent.includes(warning)) {
          seen.add(node); window.__saveRetry.toasts.push({ text: node.textContent, at: Date.now() });
        }
      }).observe(document, { childList: true, subtree: true, characterData: true });
      for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'focusin', 'blur']) window.addEventListener(type, event => {
        const target = event.target instanceof Element ? event.target : null;
        window.__saveRetry.events.push({ type, trusted: event.isTrusted, key: event.key, pointerType: event.pointerType, at: Date.now(), target: target?.getAttribute('aria-label') || target?.closest('button')?.textContent || target?.tagName || 'window' });
      }, true);
    }, { saveKey: SAVE_KEY, warning: WARNING });
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
    const button = name => page.getByRole('button', { name, exact: true });
    const warning = () => page.locator('[data-soccer-save-status="failed"]');
    const training = () => page.getByRole('dialog', { name: 'Training ground', exact: true });
    const state = () => page.evaluate(key => ({ bytes: localStorage.getItem(key), ...window.__saveRetry }), SAVE_KEY);
    const tick = ms => page.clock.runFor(ms);
    const screenshot = async stage => { const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.screenshots.push(file); save(); };
    const activate = async (locator, navigate = true) => {
      if (navigate) await locator.scrollIntoViewIfNeeded();
      const box = await rect(locator); assert(box.width >= 44 && box.height >= 44, 'Trusted input uses an actual 44px control');
      if (profile.touch) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); }
    };
    const inspectProtectedStorage = async () => {
      const values = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(protectedStorage));
      assert.deepEqual(values, protectedStorage, 'Other saved careers, completion records and progress remain byte exact');
    };
    try {
      await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' });
      await button('Open the training ground').waitFor(); row.loadedFonts = await loadedFonts(page);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await page.bringToFront(); assert(await page.evaluate(() => document.hasFocus()), 'Actual page has browser focus before practice');
      const loaded = await state(); assert(engine.isSoccerCareerSave(JSON.parse(loaded.bytes)));
      const repaired = engine.repairCareer(JSON.parse(initialBytes));
      assert.deepEqual(JSON.parse(loaded.bytes), JSON.parse(JSON.stringify(repaired)), 'Actual page restores and repairs the actual engine fixture');
      assert.equal(await warning().count(), 0); await inspectProtectedStorage();
      row.initialSavedSha256 = digest(loaded.bytes);
      await activate(button('Open the training ground'));
      await activate(page.getByRole('button', { name: /Sprint Burst/ }));
      await activate(page.getByRole('button', { name: /Tap to start the 5 second sprint/ }));
      const track = page.getByRole('button', { name: /GO GO GO/ });
      for (let tap = 0; tap < 25; tap++) await activate(track, false);
      await tick(5000); await page.locator('[data-training-result="pace"]').waitFor(); await tick(500);
      assert.equal(await page.locator('[data-training-score]').innerText(), '80', 'Actual 25 trusted taps earn 80');
      const expected = JSON.parse(JSON.stringify(engine.applyTrainingResult(JSON.parse(loaded.bytes), 'pace', 80)));
      assert.equal(engine.trainingAvailable(expected), false);
      assert.equal(expected.statBoostNextSeason.pace, (repaired.statBoostNextSeason?.pace || 0) + 2);
      assert.equal(expected.events.length, repaired.events.length + 1);
      fs.writeFileSync(path.join(OUT, `${id}-expected-career.json`), JSON.stringify(expected, null, 2));
      await button('Bank the session').scrollIntoViewIfNeeded();
      const before = { pane: await rect(training()), score: await rect(page.locator('[data-training-score]')) };
      await screenshot('earned-before-save');
      await page.evaluate(() => { window.__saveRetry.refuse = true; });
      await activate(button('Bank the session'), false); await warning().waitFor(); await tick(500);
      const failed = await state(), attempts = failed.writes.filter(write => write.key === SAVE_KEY && write.refused);
      assert.equal(attempts.length, 1, 'Bank makes one refused autosave attempt');
      assert.deepEqual(JSON.parse(attempts[0].value), expected, 'Refused write contains the exact earned engine reward');
      assert.equal(failed.bytes, loaded.bytes, 'Failed save preserves old bytes');
      assert(await button('Back to your career').isVisible(), 'Earned practice remains banked in memory');
      const after = { pane: await rect(training()), score: await rect(page.locator('[data-training-score]')) };
      for (const part of ['pane', 'score']) for (const axis of ['x', 'y', 'width', 'height']) assert(Math.abs(before[part][axis] - after[part][axis]) <= 1, 'Save warning does not move the active training viewport');
      row.geometry.push({ stage: 'failure leaves active training in place without driver scroll', before, after });
      const toast = page.locator('[data-sonner-toast]').filter({ hasText: WARNING }); await toast.waitFor();
      const toastBox = await rect(toast);
      assert(toastBox.x >= -1 && toastBox.right <= profile.width + 1 && toastBox.y >= -1 && toastBox.bottom <= profile.height + 1, 'Save failure notification is visible without driver scroll');
      assert(await toast.evaluate(node => { const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === node || node.contains(hit); }), 'Save notification is visible above the practice overlay');
      assert.equal(await button('Retry save').evaluate(node => node === document.activeElement), false, 'Save warning does not steal focus');
      assert.equal(failed.toasts.length, 1, 'First save failure notifies once');
      row.geometry.push({ stage: 'failure toast before any driver scroll', toast: toastBox });
      await screenshot('failed-bank'); row.stages.push('Actual reward remains banked after refused persistence; visible notification without viewport jump');
      await activate(button('Back to your career')); await training().waitFor({ state: 'detached' });
      // The player now navigates to the persistent recovery action. No scroll is
      // performed between banking and the unaided notification proof above.
      await warning().scrollIntoViewIfNeeded(); await tick(500);
      let geometry = await warningGeometry(page); checkWarning(geometry); row.geometry.push({ stage: 'player navigates to persistent retry', ...geometry });
      const beforeRetry = await state(); await activate(button('Retry save'), false); await tick(100);
      const refusedAgain = await state();
      assert.equal(refusedAgain.writes.length, beforeRetry.writes.length + 1, 'Retry performs exactly one write');
      assert.equal(refusedAgain.writes.at(-1).key, SAVE_KEY); assert.equal(refusedAgain.writes.at(-1).refused, true);
      assert.deepEqual(JSON.parse(refusedAgain.writes.at(-1).value), expected, 'Refused retry retains the current earned career');
      assert.equal(refusedAgain.bytes, loaded.bytes, 'Refused retry keeps original saved bytes');
      assert.equal(await warning().getAttribute('role'), 'alert');
      assert.equal(refusedAgain.toasts.length, 1, 'A refused retry retains one warning without repeating the toast');
      checkWarning(await warningGeometry(page)); await screenshot('retry-still-refused');
      row.stages.push('Refused Retry remains accessible and retains exact old save and earned current career');
      for (const control of [
        { name: 'warning-font', selector: '[data-soccer-save-status] p', style: 'font-size:8px!important' },
        { name: 'retry-target', selector: '[data-soccer-save-status] button', style: 'width:20px!important;min-width:0!important;max-width:20px!important;height:20px!important;min-height:0!important;padding:0!important;overflow:hidden!important' },
        { name: 'warning-offscreen', selector: '[data-soccer-save-status]', style: 'transform:translateY(150vh)!important' },
      ]) {
        const target = page.locator(control.selector), original = await target.getAttribute('style');
        const prior = await warningGeometry(page);
        await target.evaluate((node, style) => node.setAttribute('style', style), control.style);
        let changed, rejection;
        try {
          changed = await warningGeometry(page); assert.notDeepEqual(changed, prior, `${control.name} changes rendered geometry`);
          try { checkWarning(changed); } catch (error) { assert(error instanceof assert.AssertionError, 'A DOM fault must fail a geometry assertion'); rejection = String(error); }
          assert(rejection, `${control.name} must fail the actual geometry assertion`);
        } finally {
          await target.evaluate((node, style) => style === null ? node.removeAttribute('style') : node.setAttribute('style', style), original);
        }
        assert.equal(await target.getAttribute('style'), original, 'Fault restores the exact inline style');
        assert.deepEqual(await warningGeometry(page), prior, 'Fault restores exact readable recovery geometry');
        checkWarning(await warningGeometry(page));
        report.controls.push({ case: id, name: control.name, prior, changed, rejection, restored: true }); save();
      }
      await page.evaluate(() => { window.__saveRetry.refuse = false; });
      const beforeSuccess = await state(); await activate(button('Retry save'), false); await warning().waitFor({ state: 'detached' }); await tick(100);
      const success = await state();
      assert.equal(success.writes.length, beforeSuccess.writes.length + 1, 'Successful Retry only writes once');
      assert.equal(success.writes.at(-1).key, SAVE_KEY); assert.equal(success.writes.at(-1).refused, false);
      assert.deepEqual(JSON.parse(success.bytes), expected, 'Successful Retry persists the current earned state without replay');
      assert.equal(success.bytes, success.writes.at(-1).value);
      assert.equal(success.toasts.length, 1); await inspectProtectedStorage();
      const practiceClicks = success.events.filter(event => event.type === 'click' && event.target.includes('GO GO GO'));
      assert.equal(practiceClicks.length, 25); assert(practiceClicks.every(event => event.trusted), 'Actual native practice inputs are trusted');
      const bankClicks = success.events.filter(event => event.type === 'click' && event.target.trim() === 'Bank the session');
      assert.equal(bankClicks.length, 1); assert(bankClicks[0].trusted, 'The single bank action is trusted');
      const retryClicks = success.events.filter(event => event.type === 'click' && event.target.trim() === 'Retry save');
      assert.equal(retryClicks.length, 2); assert(retryClicks.every(event => event.trusted), 'Both Retry actions use trusted input');
      assert(success.events.some(event => event.trusted && (profile.touch ? event.type === 'pointerdown' && event.pointerType === 'touch' : event.type === 'keydown' && event.key === 'Enter')), 'Configured input method is observed on the real page');
      row.events.push(...success.events); row.writes.push(...success.writes); row.toasts = success.toasts;
      assert.equal(row.writes.filter(write => Object.hasOwn(protectedStorage, write.key)).length, 0, 'No other protected persistence writes before reload');
      row.successSavedSha256 = digest(success.bytes);
      await screenshot('retry-saved'); row.stages.push('Restored writer saves the already earned career once');
      // Preserve all evidence before navigation because document init resets it.
      save(); await page.reload({ waitUntil: 'domcontentloaded' }); await button('Open the training ground').waitFor();
      row.reloadFonts = await loadedFonts(page); await tick(1000);
      const reloaded = await state(); assert.deepEqual(JSON.parse(reloaded.bytes), expected, 'Reload restores the exact successfully retried career');
      assert.equal(await warning().count(), 0); assert.equal(reloaded.toasts.length, 0); await inspectProtectedStorage();
      await activate(button('Open the training ground')); await training().getByText('Already trained this season', { exact: true }).waitFor();
      assert.equal(await button('Bank the session').count(), 0, 'Reload cannot bank the same earned session again');
      const final = await state(); assert.deepEqual(JSON.parse(final.bytes), expected);
      row.events.push(...final.events); row.writes.push(...final.writes);
      assert.equal(row.writes.filter(write => Object.hasOwn(protectedStorage, write.key)).length, 0, 'No other protected persistence writes across reload');
      assert.equal(row.writes.filter(write => write.key === SAVE_KEY && write.refused).length, 2, 'Only the bank and first Retry were refused');
      await screenshot('reloaded-earned-session'); row.stages.push('Actual page reload retains one earned training result and cannot award it again');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []); assert.deepEqual(row.assetErrors, []); assert.deepEqual(row.unexpectedAssets, []);
      assert.equal(row.network.filter(request => !['GET', 'HEAD'].includes(request.method)).length, 0, 'This signed-out practice journey attempts no network write');
      row.passed = true; save();
    } catch (error) {
      row.failure = String(error.stack || error);
      const evidence = await state().catch(() => null); if (evidence) { row.failureState = evidence; }
      await screenshot('failure').catch(() => {}); save(); throw error;
    } finally { await context.close(); }
  }
  assert.equal(report.cases.filter(row => row.passed).length, 3);
  assert.equal(report.controls.length, 9);
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Native verification preserves every relevant source');
  report.finished = new Date().toISOString(); report.passed = true; save();
  console.log('Soccer Career save recovery: 3 real-page journeys, 9 effective DOM controls, exact earned-state retry and reload.');
} catch (error) {
  report.failure = String(error.stack || error); report.sourceAfter = sourceHashes(); save(); throw error;
} finally {
  await browser?.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
}
