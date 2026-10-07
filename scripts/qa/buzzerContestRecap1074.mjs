/* Built-app contest inputs, unchanged engine outcomes, locally fulfilled transport. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'buzzer-contest-recap-artifacts/native');
const CACHE = path.resolve(process.env.BUZZER_CONTEST_FONT_CACHE || path.join(ROOT, 'buzzer-contest-recap-artifacts/font-cache'));
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--prefetch-fonts-only')) {
  assert(process.env.CI, 'Font downloads run only in remote CI');
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
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(match => match[1]))];
  assert(urls.length > 0, 'Actual stylesheet declares font files');
  for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prepared ${manifest.length} font dependencies for local fulfillment.`);
  process.exit(0);
}
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(digest(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(fonts.has(sheets[0]), 'Prefetch current template fonts before guarded native run');
const { chromium } = await import('../lib/playwrightLoader.mjs');
const { build } = await import('esbuild');
const sourceFiles = [
  'src/components/buzzer-beater/BuzzerBeaterBoard.tsx',
  'src/components/buzzer-beater/ContestScorecard.tsx',
  'src/lib/buzzerBeater.ts', 'src/lib/threePointContest.ts', 'src/lib/arcade.ts',
  'src/hooks/useArcadeFlight.ts', 'scripts/qa/buzzerContestRecap1074.mjs',
];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const beforeSources = sourceHashes();
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before native verification');
const report = { started: new Date().toISOString(), cases: [], controls: [], forwardedWrites: 0, sourceBefore: beforeSources };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

// The browser is never injected with these results. This independent Node call
// predicts only what the unchanged engine must score for the actual UI inputs.
const bundled = await build({ absWorkingDir: ROOT, stdin: { contents: "export * as hoop from './src/lib/buzzerBeater.ts'; export * as contest from './src/lib/threePointContest.ts';", resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const { hoop, contest } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const seed = Math.floor(0.25 * 2147483645) + 1;
const setups = contest.buildThreePointContest();
const planned = [];
for (let index = 0; index < 25; index++) {
  const wanted = index % 3 !== 1;
  const scoreCandidate = release => {
    const rng = hoop.lehmer(seed ^ 0x5eed1234);
    for (let prior = 0; prior < planned.length; prior++) hoop.takeShot(planned[prior].release, setups[prior], rng);
    return hoop.takeShot(release, setups[index], rng);
  };
  let chosen = null;
  for (let ticks = 0; ticks <= 22; ticks++) {
    let power = 0.4;
    for (let tick = 0; tick < ticks; tick++) power = Math.max(0, Math.min(1, power + 0.026));
    for (let arcStep = 10; arcStep <= 45; arcStep++) {
      const release = { x: wanted ? 0 : 1, arc: arcStep * 0.02, power };
      const result = scoreCandidate(release);
      if (result.made !== wanted) continue;
      const margin = wanted ? Math.min(result.lateralWindow - Math.abs(result.lateral), result.depthWindow - Math.abs(result.depth)) : Math.abs(result.lateral) - result.lateralWindow;
      if (!chosen || margin > chosen.margin) chosen = { index, ticks, release, result, margin };
    }
  }
  assert(chosen, `Shot ${index + 1} has a reachable genuine ${wanted ? 'make' : 'miss'}`);
  planned.push(chosen);
}
assert(planned.some(shot => shot.result.made) && planned.some(shot => !shot.result.made));
assert(planned.some(shot => shot.index % 5 === 4 && shot.result.made) && planned.some(shot => shot.index % 5 === 4 && !shot.result.made));
report.enginePlan = planned;
fs.writeFileSync(path.join(OUT, 'engine-plan.json'), JSON.stringify({ seed, setups, shots: planned }, null, 2));

const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned host-like server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
const DATE = '2026-10-07', DAILY = `buzzer-beater-daily-${DATE}`;
const dailyBytes = JSON.stringify({ score: 173, made: 4, v: 1, date: DATE });
const protectedKeys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const state = page => page.locator('[data-arcade-mode]');
const protectedState = page => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), protectedKeys);
const waitWall = ms => new Promise(resolve => setTimeout(resolve, ms));
async function activate(locator, profile) {
  const box = await locator.boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, 'Native action has a 44px target');
  if (profile.touch) await locator.tap();
  else { await locator.focus(); await locator.press('Enter'); }
}
async function range(board, name, value) {
  const slider = board.getByRole('slider', { name, exact: true });
  const min = Number(await slider.getAttribute('min')), step = Number(await slider.getAttribute('step'));
  await slider.focus(); await slider.press('Home');
  for (let index = 0; index < Math.round((value - min) / step); index++) await slider.press('ArrowRight');
  assert(Math.abs(Number(await slider.inputValue()) - value) < 1e-9, 'Native range keys reach chosen release setting');
}
async function readBalls(page, kind = 'live') {
  return page.locator(`[data-contest-balls="${kind}"]`).evaluate(el => ({
    rack: Number(el.getAttribute('data-rack')),
    markers: [...el.querySelectorAll('[data-contest-ball-marker]')].map(node => ({
      ball: Number(node.getAttribute('data-contest-ball-marker')), status: node.getAttribute('data-ball-status'),
      label: node.getAttribute('aria-label'), text: node.textContent,
    })),
  }));
}
function assertBalls(value, rack, settled, flying = -1, current = settled) {
  assert.equal(value.rack, rack + 1, 'Ball strip belongs to the selected rack');
  assert.equal(value.markers.length, 5, 'Exactly five actual balls are shown');
  for (const [offset, marker] of value.markers.entries()) {
    const index = rack * 5 + offset;
    const expected = index < settled ? planned[index].result.made ? 'made' : 'missed'
      : index === flying ? 'in-flight' : index === current ? 'current' : 'upcoming';
    assert.equal(marker.ball, offset + 1, 'Rack ball order is exact');
    assert.equal(marker.status, expected, 'Ball status matches the actual settled engine outcome');
    const points = offset === 4 ? '2' : '1';
    const glyph = expected === 'made' ? `✓${offset === 4 ? '2' : ''}`
      : expected === 'missed' ? `×${offset === 4 ? '2' : ''}` : expected === 'in-flight' ? '⋯' : points;
    assert.equal(marker.text, glyph, 'Visible ball mark matches the actual settled engine outcome');
    assert(marker.label?.includes(expected === 'in-flight' ? 'in flight' : expected), 'Accessible ball label agrees with outcome');
    if (offset === 4) assert(/money/i.test(marker.label), 'Money ball keeps its explicit accessible label');
  }
}
async function geometry(page, kind) {
  const value = await page.evaluate(which => {
    const pane = document.querySelector(which === 'recap' ? '[data-contest-scorecard]' : '[data-contest-balls="live"]');
    const rect = el => { const box = el.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; };
    const text = [...pane.querySelectorAll('*')].filter(el => [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())).map(el => ({ ...rect(el), text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), client: el.clientWidth, scroll: el.scrollWidth }));
    return { kind: which, viewport: { width: innerWidth, height: innerHeight }, pageWidth: document.documentElement.scrollWidth, scrollY, pane: { ...rect(pane), client: pane.clientWidth, scroll: pane.scrollWidth }, text,
      buttons: [...pane.querySelectorAll('button')].map(el => ({ ...rect(el), label: el.textContent })),
      markers: [...pane.querySelectorAll('[data-contest-ball-marker]')].map(rect),
      fonts: ['Inter', 'Space Grotesk'].flatMap(family => [400, 500, 600, 700].map(weight => ({ family, weight, loaded: document.fonts.check(`${weight} 16px "${family}"`, 'Buzzer Beater') }))),
    };
  }, kind);
  checkGeometry(value);
  return value;
}
function checkGeometry(value) {
  assert(value.fonts.length === 8 && value.fonts.every(font => font.loaded), 'Actual font faces remain loaded');
  assert(value.pageWidth <= value.viewport.width + 2, 'No horizontal page overflow');
  const pane = value.pane;
  assert(pane.width > 0 && pane.height > 0 && pane.x >= -1 && pane.right <= value.viewport.width + 1 && pane.scroll <= pane.client + 1, 'Contest pane is not clipped');
  if (value.kind === 'recap') assert(pane.y >= -1 && pane.bottom <= value.viewport.height + 1, 'Complete contest recap is visible after product reveal');
  for (const node of value.text) {
    assert(node.size >= 12, 'Contest text is at least 12px');
    assert(node.width > 0 && node.height > 0 && node.x >= pane.x - 1 && node.right <= pane.right + 1 && node.y >= pane.y - 1 && node.bottom <= pane.bottom + 1 && node.scroll <= node.client + 1, 'Contest text is not clipped');
  }
  for (const button of value.buttons) assert(button.width >= 44 && button.height >= 44, 'Rack selectors are at least 44px');
  for (const marker of value.markers) assert(marker.width >= 32 && marker.height >= 32, 'Ball strip retains 32px markers');
  for (let index = 1; index < value.markers.length; index++) assert(value.markers[index - 1].right <= value.markers[index].x + 0.5, 'Ball markers do not overlap');
}
async function checkFinal(page) {
  const card = page.locator('[data-contest-scorecard]');
  const buttons = await card.locator('[data-contest-rack-select]').evaluateAll(nodes => nodes.map(node => ({ rack: Number(node.getAttribute('data-contest-rack-select')), points: Number(node.getAttribute('data-rack-points')), text: node.textContent, pressed: node.getAttribute('aria-pressed') })));
  assert.equal(buttons.length, 5, 'Final scorecard has all five racks');
  for (const [index, button] of buttons.entries()) {
    const points = planned.slice(index * 5, index * 5 + 5).reduce((sum, shot) => sum + contest.contestPoints(shot.index, shot.result.made), 0);
    assert.equal(button.rack, index + 1);
    assert.equal(button.points, points, 'Rack score matches actual engine outcomes');
    assert(button.text.replace(/\s/g, '').includes(`${points}/6`), 'Visible rack score matches actual engine outcomes');
  }
  return buttons;
}
async function visibleUnaided(page, locator) {
  // All calls before this return are reads or clock advances. No focus, tap,
  // scrollIntoView or other driver reveal can make this product check pass.
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.clock.runFor(50); await waitWall(25);
    const boxes = await locator.evaluateAll(nodes => nodes.map(node => { const b = node.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, viewport: innerHeight, width: innerWidth }; }));
    const pane = await page.locator('[data-contest-scorecard]').evaluate(node => { const b = node.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, viewport: innerHeight, width: innerWidth }; });
    const visible = box => box.top >= 0 && box.bottom <= box.viewport && box.left >= 0 && box.right <= box.width;
    if (boxes.length === 5 && boxes.every(visible) && visible(pane)) return { pane, buttons: boxes };
  }
  assert.fail('The complete final recap and all rack selectors must appear without driver scrolling');
}

try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, theme: 'dark' },
    { width: 390, height: 844, touch: true, reduced: false, theme: 'light' },
    { width: 1280, height: 720, touch: false, reduced: false, theme: 'light' },
  ]) {
    const id = `${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${profile.theme}${profile.reduced ? '-reduced' : ''}`;
    const row = { id, ...profile, shots: [], releases: [], geometry: [], screenshots: [], driverNavigation: [], errors: [], assetErrors: [], externalRequests: [], fontResponses: [], blockedWrites: [], storageWrites: [] };
    report.cases.push(row);
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, deviceScaleFactor: 1, colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: DAILY, value: dailyBytes }, { name: 'dukb-theme', value: profile.theme }] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No local write transport'); return route.continue(); }
      row.externalRequests.push({ method: request.method(), origin: url.origin, path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.blockedWrites.push({ method: request.method(), path: url.pathname });
      if (fonts.has(url.href)) {
        const cached = fonts.get(url.href);
        row.fontResponses.push({ url: url.href, sha256: digest(cached.body), bytes: cached.body.length, contentType: cached.contentType });
        return route.fulfill({ status: 200, ...cached });
      }
      const resource = request.resourceType();
      return route.fulfill({ status: 200, contentType: resource === 'stylesheet' ? 'text/css' : resource === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(resource) ? '' : '[]' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    await page.clock.install({ time: new Date(`${DATE}T16:00:00Z`) });
    await page.addInitScript(keys => {
      Math.random = () => 0.25;
      window.__contestWrites = [];
      window.__contestInputs = [];
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'touchstart', 'touchend', 'touchcancel', 'click']) {
        document.addEventListener(type, event => {
          const board = document.querySelector('[data-arcade-mode]');
          if (!board) return;
          const button = event.target instanceof Element ? event.target.closest('button') : null;
          window.__contestInputs.push({ type, trusted: event.isTrusted, pointerType: event.pointerType, pointerId: event.pointerId, detail: event.detail, stamp: event.timeStamp,
            target: button?.textContent ?? event.target?.nodeName, phase: board.getAttribute('data-arcade-phase'),
            ball: board.querySelector('[data-contest-ball]')?.getAttribute('data-contest-ball'), rack: board.querySelector('[data-contest-rack]')?.getAttribute('data-contest-rack'),
            score: board.querySelector('[data-contest-score]')?.textContent });
        }, true);
      }
      for (const method of ['setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && (keys.includes(key) || key.startsWith('buzzer-beater'))) window.__contestWrites.push({ method, key });
          return original.call(this, key, ...args);
        };
      }
    }, protectedKeys);
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
    const cdp = await context.newCDPSession(page);
    const screenshot = async stage => { const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.screenshots.push(file); };
    const navigate = async (locator, reason) => { row.driverNavigation.push({ reason, before: await page.evaluate(() => scrollY) }); await locator.scrollIntoViewIfNeeded(); row.driverNavigation.at(-1).after = await page.evaluate(() => scrollY); };
    const button = name => state(page).getByRole('button', { name, exact: true });
    try {
      await page.goto(BASE + '/buzzer-beater', { waitUntil: 'domcontentloaded' });
      const entry = page.getByRole('button', { name: 'Three-point contest', exact: true }); await entry.waitFor();
      await page.evaluate(() => document.fonts.ready);
      row.loadedFonts = await page.evaluate(async () => {
        const faces = [];
        for (const family of ['Inter', 'Space Grotesk']) {
          for (const weight of [400, 500, 600, 700]) {
            const loaded = await document.fonts.load(`${weight} 16px "${family}"`, 'Buzzer Beater');
            faces.push({ family, weight, faces: loaded.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
          }
        }
        return faces;
      });
      assert.equal(row.loadedFonts.length, 8, 'All eight requested font faces are inspected');
      for (const requested of row.loadedFonts) assert(requested.faces.length > 0 && requested.faces.every(face => face.status === 'loaded' && face.family.replace(/['"]/g, '') === requested.family), 'Requested font family has actual nonempty loaded faces');
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      const before = await protectedState(page);
      assert((await state(page).innerText()).includes('three regular makes and a made money ball'), 'Actual worked example appears before entering contest');
      await navigate(entry, 'Initial mode navigation to existing contest entry'); await activate(entry, profile);
      assert.equal(await state(page).getAttribute('data-arcade-mode'), 'contest');
      assert.equal(await state(page).getAttribute('data-arcade-phase'), 'aiming');
      assertBalls(await readBalls(page), 0, 0);
      row.geometry.push(await geometry(page, 'live'));
      await screenshot('start');
      const help = button('Three-point contest rules');
      await navigate(help, 'User reopens contest rules'); await activate(help, profile);
      const dialog = page.getByRole('dialog', { name: 'Three-point contest rules', exact: true }); await dialog.waitFor();
      await page.clock.runFor(300);
      assert.equal(await state(page).getAttribute('data-arcade-paused'), 'true');
      await page.clock.runFor(900); assertBalls(await readBalls(page), 0, 0);
      await dialog.press('Space'); assert.equal(await state(page).getAttribute('data-arcade-phase'), 'aiming');
      await screenshot('help');
      await dialog.press('Escape'); await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
      assert.equal(await state(page).getAttribute('data-arcade-paused'), 'true', 'Closing Help still awaits explicit Resume');
      await activate(button('Resume'), profile);
      let earned = 0;
      for (const shot of planned) {
        const rack = Math.floor(shot.index / 5);
        assertBalls(await readBalls(page), rack, shot.index);
        await range(state(page), 'How high to put the arc on the shot', shot.release.arc);
        await range(state(page), 'How far to fade off the closeout', shot.release.x);
        const shoot = button('Hold to shoot'); await navigate(shoot, `User reaches shot ${shot.index + 1} release control`);
        const attempt = { index: shot.index, expected: shot.release, inputsBefore: await page.evaluate(() => window.__contestInputs.length) };
        row.releases.push(attempt);
        if (profile.touch) {
          const box = await shoot.boundingBox(); assert(box && box.height >= 44 && box.width >= 44);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 7 }] });
        } else { await shoot.focus(); await page.keyboard.down('Space'); }
        await page.clock.runFor(shot.ticks * 16);
        const release = await state(page).evaluate(el => {
          const sliders = [...el.querySelectorAll('input[type="range"]')];
          const strength = [...el.querySelectorAll('span')].find(node => node.textContent === 'Strength')?.parentElement;
          const width = strength?.querySelector('[style]')?.style.width;
          return { x: Number(sliders[1].value), arc: Number(sliders[0].value), power: parseFloat(width) / 100 };
        });
        for (const key of ['x', 'arc', 'power']) assert(Math.abs(release[key] - shot.release[key]) < 1e-9, `Shot ${shot.index + 1} actual ${key} matches independent engine input`);
        attempt.actual = release;
        if (profile.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        else await page.keyboard.up('Space');
        attempt.afterRelease = await state(page).evaluate(el => ({ phase: el.getAttribute('data-arcade-phase'), paused: el.getAttribute('data-arcade-paused'), rack: el.querySelector('[data-contest-rack]')?.getAttribute('data-contest-rack'), ball: el.querySelector('[data-contest-ball]')?.getAttribute('data-contest-ball'), score: el.querySelector('[data-contest-score]')?.textContent,
          sliders: [...el.querySelectorAll('input[type="range"]')].map(input => ({ label: input.getAttribute('aria-label'), value: input.value })), buttons: [...el.querySelectorAll('button')].map(button => button.textContent) }));
        attempt.inputs = await page.evaluate(start => window.__contestInputs.slice(start), attempt.inputsBefore);
        if (!profile.reduced) {
          assert.equal(await state(page).getAttribute('data-arcade-phase'), 'flying');
          assertBalls(await readBalls(page), rack, shot.index, shot.index);
          assert.equal(await state(page).locator('[data-arcade-feedback]').count(), 0, 'Flying shot has no premature settled verdict');
          assert.equal(Number(await state(page).locator('[data-contest-score]').innerText()), earned, 'Flying shot does not pay early');
          if (shot.index === 0) {
            await activate(button('Pause'), profile);
            const frozen = await state(page).locator('svg[role="img"]').innerHTML();
            await page.clock.runFor(1400);
            assert.equal(await state(page).locator('svg[role="img"]').innerHTML(), frozen, 'Pause freezes actual flight geometry');
            assert.equal(await state(page).getAttribute('data-arcade-phase'), 'flying');
            assertBalls(await readBalls(page), rack, 0, 0);
            row.pausedFlight = { phase: 'flying', score: earned, markers: await readBalls(page) };
            await screenshot('paused-flight'); await activate(button('Resume'), profile);
          }
          await page.clock.runFor(1000);
        }
        assert.equal(await state(page).getAttribute('data-arcade-phase'), 'shotEnd');
        const feedback = state(page).locator('[data-arcade-feedback]');
        assert.equal(await feedback.getAttribute('data-outcome'), shot.result.made ? 'success' : 'miss');
        assert((await feedback.innerText()).includes(shot.result.verdict), 'Actual native verdict agrees with unchanged engine');
        earned += contest.contestPoints(shot.index, shot.result.made);
        assert.equal(Number(await state(page).locator('[data-contest-score]').innerText()), earned, 'Actual score equals settled contest points');
        assertBalls(await readBalls(page), rack, shot.index + 1, -1, -1);
        const markers = await readBalls(page);
        row.shots.push({ index: shot.index, release, made: shot.result.made, verdict: shot.result.verdict, points: earned, markers });
        if (shot.index % 5 === 4) { row.geometry.push(await geometry(page, 'live')); await screenshot(`rack-${rack + 1}-settled`); }
        const next = button(shot.index === 24 ? 'See the run' : 'Next shot');
        await navigate(next, `User continues after settled shot ${shot.index + 1}`); await activate(next, profile);
      }
      assert.equal(await state(page).getAttribute('data-arcade-phase'), 'done');
      const scorecard = page.locator('[data-contest-scorecard]'); await scorecard.waitFor();
      row.unaidedFinal = await visibleUnaided(page, scorecard.locator('[data-contest-rack-select]'));
      row.finalButtons = await checkFinal(page);
      row.geometry.push(await geometry(page, 'recap')); await screenshot('final');
      for (const rack of [1, 4, 2, 5, 3]) {
        await activate(scorecard.locator(`[data-contest-rack-select="${rack}"]`), profile);
        assert.equal(await scorecard.locator(`[data-contest-rack-select="${rack}"]`).getAttribute('aria-pressed'), 'true');
        assert.equal(Number(await page.locator('[data-contest-balls="recap"]').getAttribute('data-rack')), rack);
        assertBalls(await readBalls(page, 'recap'), rack - 1, 25);
        await checkFinal(page);
        row.geometry.push(await geometry(page, 'recap'));
      }
      await screenshot('rack-selection');
      if (!report.controls.length) {
        const target = scorecard.locator('[data-contest-rack-select="1"]');
        const pointsText = target.locator('span').last();
        const original = await pointsText.textContent(), before = await checkFinal(page);
        await pointsText.evaluate(el => { el.textContent = '99/6'; });
        assert.notEqual(await pointsText.textContent(), original, 'Value fault changes the rendered rack score');
        let rejection;
        try { await checkFinal(page); } catch (error) { assert(error instanceof assert.AssertionError && error.message === 'Visible rack score matches actual engine outcomes'); rejection = error.message; }
        assert(rejection, 'Wrong rendered score must be rejected');
        await pointsText.evaluate((el, prior) => { el.textContent = prior; }, original);
        assert.deepEqual(await checkFinal(page), before, 'Exact rack values restore after value fault');
        report.controls.push({ name: 'value', changed: '99/6', rejection, restored: await checkFinal(page) });
        for (const [name, css, expected] of [['font', 'font-size:11px', 'Contest text is at least 12px'], ['clipping', 'max-width:8px;width:8px;min-width:8px;overflow:hidden', 'Contest text is not clipped']]) {
          const text = target.locator('span').last();
          const faultTarget = await text.count() ? text : target;
          const style = await faultTarget.getAttribute('style');
          const positive = await geometry(page, 'recap');
          await faultTarget.evaluate((el, value) => { el.setAttribute('style', value); }, css);
          assert.notEqual(await faultTarget.getAttribute('style'), style, `${name} fault changes actual DOM`);
          let failure;
          try { await geometry(page, 'recap'); } catch (error) { assert(error instanceof assert.AssertionError && error.message === expected, `${name} fault reaches only its intended assertion: ${error.message}`); failure = error.message; }
          assert(failure, `${name} fault must be rejected`);
          const broken = await faultTarget.evaluate(el => ({ size: getComputedStyle(el).fontSize, client: el.clientWidth, scroll: el.scrollWidth, style: el.getAttribute('style') }));
          if (name === 'font') assert.equal(broken.size, '11px'); else assert(broken.scroll > broken.client + 1);
          await faultTarget.evaluate((el, prior) => prior === null ? el.removeAttribute('style') : el.setAttribute('style', prior), style);
          const restored = await geometry(page, 'recap'); assert.deepEqual(restored, positive, 'Exact positive geometry restores');
          report.controls.push({ name, broken, rejection: failure, restored });
        }
        const recap = page.locator('[data-contest-balls="recap"]');
        const glyphTarget = recap.locator('[data-contest-ball-marker="1"]');
        const ballsBefore = await readBalls(page, 'recap'), originalGlyph = await glyphTarget.textContent();
        await glyphTarget.evaluate(el => { el.textContent = '?'; });
        const wrongGlyph = await readBalls(page, 'recap');
        assert.notEqual(wrongGlyph.markers[0].text, originalGlyph, 'Glyph fault changes the actual rendered outcome');
        assert.throws(() => assertBalls(wrongGlyph, ballsBefore.rack - 1, 25), error => error instanceof assert.AssertionError && error.message.startsWith('Visible ball mark matches the actual settled engine outcome'));
        await glyphTarget.evaluate((el, prior) => { el.textContent = prior; }, originalGlyph);
        const restoredBalls = await readBalls(page, 'recap');
        assert.deepEqual(restoredBalls, ballsBefore, 'Exact visible outcome restores after glyph fault');
        assertBalls(restoredBalls, ballsBefore.rack - 1, 25);
        report.controls.push({ name: 'glyph', broken: wrongGlyph, rejection: 'Visible ball mark matches the actual settled engine outcome', restored: restoredBalls });

        const paneStyle = await scorecard.getAttribute('style'), paneBefore = await geometry(page, 'recap');
        await scorecard.evaluate(el => { el.style.transform = `translateY(${innerHeight + 100}px)`; });
        const offscreen = await scorecard.boundingBox();
        assert.notEqual(await scorecard.getAttribute('style'), paneStyle, 'Vertical fault changes the actual recap position');
        assert(offscreen && offscreen.y > profile.height, 'Vertical fault moves the whole recap below the viewport');
        let verticalRejection;
        try { await geometry(page, 'recap'); }
        catch (error) { assert(error instanceof assert.AssertionError && error.message === 'Complete contest recap is visible after product reveal'); verticalRejection = error.message; }
        assert(verticalRejection, 'Offscreen recap must be rejected');
        await scorecard.evaluate((el, prior) => prior === null ? el.removeAttribute('style') : el.setAttribute('style', prior), paneStyle);
        const paneRestored = await geometry(page, 'recap');
        assert.deepEqual(paneRestored, paneBefore, 'Exact positive recap geometry restores after vertical fault');
        report.controls.push({ name: 'vertical', broken: offscreen, rejection: verticalRejection, restored: paneRestored });
      }
      if (profile.width === 390) {
        await activate(button('Steady practice'), profile);
        assert.equal(await state(page).getAttribute('data-arcade-mode'), 'practice');
        assert.equal(await page.locator('[data-contest-scorecard],[data-contest-balls]').count(), 0, 'Mode exit removes every contest recap');
        row.exit = 'Steady practice';
      } else {
        await activate(button('Another contest'), profile);
        assert.equal(await state(page).getAttribute('data-arcade-phase'), 'aiming');
        assert.equal(await page.locator('[data-contest-scorecard]').count(), 0, 'Retry removes completed scorecard');
        assert.equal(Number(await state(page).locator('[data-contest-score]').innerText()), 0);
        assertBalls(await readBalls(page), 0, 0);
        row.retry = { score: 0, balls: await readBalls(page) };
        row.storageWrites.push(...await page.evaluate(() => window.__contestWrites));
        assert.deepEqual(row.storageWrites, [], 'Contest and retry have no transient writes before reload');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Three-point contest', exact: true }).waitFor();
        assert.equal(await state(page).getAttribute('data-arcade-mode'), 'daily');
        assert.equal(await state(page).getAttribute('data-arcade-phase'), 'done');
        assert((await state(page).innerText()).includes('173 points'), 'Reload keeps the original daily score');
        row.exit = 'Reload restores original daily';
      }
      assert.deepEqual(await protectedState(page), before, 'Contest, replay and mode exit hold saved progress bytes');
      row.storageWrites.push(...await page.evaluate(() => window.__contestWrites));
      assert.deepEqual(row.storageWrites, [], 'Contest never writes or removes any score/progress key');
      assert.deepEqual(row.blockedWrites, [], 'Contest attempts no external write');
      assert.deepEqual(row.errors, [], 'No runtime errors'); assert.deepEqual(row.assetErrors, [], 'No local asset failures');
      assert.equal(row.shots.length, 25); row.passed = true; save();
    } catch (error) {
      row.failure = String(error.stack || error);
      row.inputTail = await page.evaluate(() => window.__contestInputs.slice(-100)).catch(() => []);
      row.failureState = await state(page).evaluate(el => ({ phase: el.getAttribute('data-arcade-phase'), mode: el.getAttribute('data-arcade-mode'), paused: el.getAttribute('data-arcade-paused'), text: el.textContent })).catch(() => null);
      await screenshot('failure').catch(() => {}); save(); throw error;
    } finally { await context.close(); }
  }
  assert.equal(report.cases.filter(row => row.passed).length, 3);
  assert.deepEqual(report.controls.map(control => control.name), ['value', 'font', 'clipping', 'glyph', 'vertical']);
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, beforeSources, 'All seven relevant sources are held');
  report.passed = true;
  console.log('buzzerContestRecap1074: three native profiles, 75 actual mixed shots, five earned rack recaps per profile, no premature flight reveal, Help/Pause/retry/mode exits, five effective restored DOM controls and seven held sources passed. Zero forwarded writes.');
} catch (error) { report.failure = String(error.stack || error); throw error; }
finally { report.sourceAfter = sourceHashes(); save(); await browser?.close(); server.kill(); }
