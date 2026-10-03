/* Round 997: native Shot Lab outcomes on the built app. Every external request
   is fulfilled locally. Daily fixtures use the real arcade record format. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'buzzer-shot-lab-artifacts/native');
const DATE = '2026-10-03';
const DAILY = 'buzzer-beater-daily-' + DATE;
const dailyBytes = JSON.stringify({ score: 173, made: 4, v: 1, date: DATE });
const protectedKeys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before native verification');
const report = { started: new Date().toISOString(), cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const chosen = probe.address().port;
    probe.close(error => error ? reject(error) : resolve(chosen));
  });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], {
  cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start in 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => {
    if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); }
  });
});

async function activate(control, touch) {
  const box = await control.boundingBox();
  assert(box && box.width >= 43 && box.height >= 43, 'Action has a 44px touch target');
  if (touch) await control.tap();
  else { await control.focus(); await control.press('Enter'); }
}
async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function layout(page, stage) {
  const sizes = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    cards: [...document.querySelectorAll('[data-lab-shot], [data-lab-comparison], [data-lab-result]')].map(el => {
      const box = el.getBoundingClientRect();
      return { left: box.left, right: box.right, client: el.clientWidth, scroll: el.scrollWidth };
    }),
  }));
  assert(sizes.document <= sizes.viewport + 2, `${stage}: horizontal page overflow ${JSON.stringify(sizes)}`);
  for (const card of sizes.cards) {
    assert(card.left >= -1 && card.right <= sizes.viewport + 1 && card.scroll <= card.client + 2,
      `${stage}: comparison leaves its card ${JSON.stringify(card)}`);
  }
  return { stage, ...sizes };
}
async function visibleWithoutDriverScroll(locator, page, label) {
  // Let the product's reveal hook finish. No driver focus, click or scroll is allowed here.
  await frames(page);
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('[data-lab-result] button')][0];
    const box = button?.getBoundingClientRect();
    return box && box.top >= 0 && box.bottom <= innerHeight;
  });
  await page.waitForTimeout(450);
  const box = await locator.boundingBox();
  const height = await page.evaluate(() => innerHeight);
  assert(box && box.y >= -1 && box.y + box.height <= height + 1, `${label} must appear in view unaided`);
  return box;
}
async function courtVisible(board, page, stage) {
  await frames(page);
  const box = await board.locator('svg[role="img"]').boundingBox();
  const height = await page.evaluate(() => innerHeight);
  const visible = box ? Math.max(0, Math.min(height, box.y + box.height) - Math.max(0, box.y)) : 0;
  assert(box && visible >= Math.min(80, box.height), stage + ': the court remains readable without driver scrolling');
  return { stage, box, visible };
}
async function shotShape(board, which = 'current') {
  return board.evaluate((el, label) => {
    const path = el.querySelector(`[data-lab-path="${label}"]`);
    const landing = el.querySelector(`[data-lab-landing="${label}"]`);
    const card = el.querySelector(`[data-lab-shot="${label}"]`);
    return {
      path: path?.getAttribute('d'), dash: path?.getAttribute('stroke-dasharray'),
      landing: landing ? [landing.getAttribute('cx'), landing.getAttribute('cy')] : null,
      fields: [...(card?.querySelectorAll('dl') || [])].map(dl => dl.textContent),
      text: card?.textContent,
    };
  }, which);
}
const powerName = 'Power';
const arcName = 'How high to put the arc on the shot';
const fadeName = 'How far to fade off the closeout';
async function settings(board) {
  return Promise.all([powerName, arcName, fadeName].map(name => board.getByRole('slider', { name, exact: true }).inputValue()));
}
async function changeRange(board, name, value) {
  const slider = board.getByRole('slider', { name, exact: true });
  const min = Number(await slider.getAttribute('min'));
  const step = Number(await slider.getAttribute('step'));
  await slider.focus();
  await slider.press('Home');
  for (let n = 0; n < Math.round((value - min) / step); n++) await slider.press('ArrowRight');
  assert.equal(Number(await slider.inputValue()), value, name + ' reflects real range key input');
}
const protectedState = page => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), protectedKeys);

try {
  await ready;
  browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, restored: false },
    { width: 390, height: 844, touch: true, reduced: false, restored: true },
    { width: 1440, height: 1000, touch: false, reduced: false, restored: true },
  ]) {
    const { width, height, touch, reduced, restored } = profile;
    const id = `${width}-${touch ? 'touch' : 'keyboard'}${reduced ? '-reduced' : ''}`;
    const result = { id, ...profile, screenshots: [], layouts: [], visibility: [], exits: [],
      pageErrors: [], assetFailures: [], interceptedRequests: [], scoreWrites: [], storageWrites: [], courts: [] };
    report.cases.push(result);
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: 'cookie-consent', value: 'essential' },
        ...(restored ? [{ name: DAILY, value: dailyBytes }] : []),
      ] }] },
    });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      result.interceptedRequests.push({ method: request.method(), origin: url.origin, path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        && /\/(game_completions|user_game_scores|daily_completions|user_best_scores|user_scores|record_auth_completion)$/.test(url.pathname)) {
        result.scoreWrites.push(request.method() + ' ' + url.pathname);
      }
      const css = request.resourceType() === 'stylesheet';
      return route.fulfill({ status: 200, contentType: css ? 'text/css' : 'application/json', body: css ? '' : '[]' });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.addInitScript(({ keys, date }) => {
      const OriginalDate = Date, now = new OriginalDate(date + 'T16:00:00Z').getTime();
      window.Date = class extends OriginalDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
      };
      window.__labWrites = [];
      for (const method of ['setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && (keys.includes(key) || key.startsWith('buzzer-beater'))) {
            window.__labWrites.push({ method, key });
          }
          return original.call(this, key, ...args);
        };
      }
    }, { keys: protectedKeys, date: DATE });
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('requestfailed', request => {
      if (request.url().startsWith(BASE)) result.assetFailures.push(request.url() + ': ' + request.failure()?.errorText);
    });
    page.on('response', response => {
      if (response.url().startsWith(BASE) && response.status() >= 400) result.assetFailures.push(response.url() + ': ' + response.status());
    });
    const shot = async stage => {
      const file = `${id}-${stage}.png`;
      await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
      result.screenshots.push(file);
    };
    const board = page.locator('[data-shot-lab]');
    const button = name => board.getByRole('button', { name, exact: true });
    const enter = async () => {
      await page.getByRole('button', { name: 'Shot lab', exact: true }).waitFor();
      await activate(page.getByRole('button', { name: 'Shot lab', exact: true }), touch);
      await board.waitFor();
      await frames(page);
      assert(await board.getByRole('slider', { name: powerName, exact: true }).evaluate(el => document.activeElement === el),
        'Entering or retrying focuses the actual Power control');
      assert.equal(await board.getAttribute('data-lab-setup'), '1');
      // The product may reveal smoothly; read the settled position without scrolling it ourselves.
      await page.waitForTimeout(reduced ? 0 : 400);
      result.courts.push(await courtVisible(board, page, 'entry'));
    };
    const settled = async attempt => {
      await board.locator('[data-lab-result]').waitFor();
      assert.equal(await board.locator('[data-lab-attempt]').getAttribute('data-lab-attempt'), String(attempt));
      result.visibility.push(await visibleWithoutDriverScroll(button('Retry this shot'), page, 'Retry this shot'));
      result.courts.push(await courtVisible(board, page, 'settled-' + attempt));
      assert(await button('Retry this shot').evaluate(el => document.activeElement === el), 'Settled shot focuses Retry');
      result.layouts.push(await layout(page, 'settled-' + attempt));
    };
    const isolate = async before => {
      assert.deepEqual(await protectedState(page), before, 'Lab and exits preserve daily, completions, streak and diary bytes');
      const writes = await page.evaluate(() => window.__labWrites);
      result.storageWrites.push(...writes);
      assert.deepEqual(writes, [], 'Lab and exits never transiently write or remove saved scores');
      assert.deepEqual(result.scoreWrites, [], 'Lab and exits never attempt a score write');
    };
    try {
      await page.goto(BASE + '/buzzer-beater', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Shot lab', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const entry = page.getByRole('button', { name: 'Shot lab', exact: true }).locator('xpath=../..');
      assert((await entry.innerText()).includes('Try Power 35, Arc 60 and Fade square.'), 'Worked example precedes entry');
      await entry.scrollIntoViewIfNeeded(); await shot('entry');
      const before = await protectedState(page);
      await page.evaluate(() => { window.__labWrites = []; });
      await enter();
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), reduced);
      const power = board.getByRole('slider', { name: powerName, exact: true });
      if (touch) {
        const court = board.locator('svg[role="img"]');
        const box = await court.boundingBox();
        assert(box);
        await court.tap({ position: { x: box.width * 0.75, y: box.height * 0.55 } });
        assert.equal(await board.getAttribute('data-arcade-phase'), 'aiming', 'Touching the lab court aims without shooting');
        const aimed = await settings(board);
        assert.equal(aimed[0], '0.4', 'Touch aiming preserves steady power');
        assert.notDeepEqual(aimed.slice(1), ['0.6', '0'], 'Actual court touch changes Arc and Fade');
      }
      await changeRange(board, powerName, 0.35);
      await changeRange(board, arcName, 0.6);
      await changeRange(board, fadeName, 0);
      const firstSettings = await settings(board);
      await power.press('Space');
      assert.deepEqual(await settings(board), firstSettings, 'Field Space cannot charge or shoot');
      assert.equal(await board.getAttribute('data-arcade-phase'), 'aiming');
      await activate(button('Shot lab rules'), touch);
      const dialog = page.getByRole('dialog', { name: 'Shot lab rules', exact: true });
      await dialog.waitFor();
      assert((await dialog.innerText()).includes('identical settings repeat exactly'), 'Rules explain the fixed setup');
      assert.equal(await board.getAttribute('data-arcade-paused'), 'true');
      await dialog.press('Space');
      assert(await dialog.isVisible(), 'Space on the rules panel keeps the dialog open');
      assert.equal(await board.getAttribute('data-arcade-phase'), 'aiming', 'Rules do not release an underlying shot');
      await shot('rules');
      await activate(dialog.getByRole('button', { name: "Let's Play!", exact: true }), touch);
      await dialog.waitFor({ state: 'hidden' });
      assert(await button('Shot lab rules').evaluate(el => document.activeElement === el), 'Closing rules returns focus');
      await activate(button('Resume'), touch);
      assert.deepEqual(await settings(board), firstSettings, 'Help and resume preserve controls');
      result.layouts.push(await layout(page, 'setup')); await shot('setup');

      await activate(button('Shoot'), touch);
      if (reduced) assert.equal(await board.getAttribute('data-arcade-phase'), 'shotEnd', 'Reduced motion settles without a flight animation');
      await settled(1);
      const first = await shotShape(board);
      assert(first.path && first.path.startsWith('M '), 'A real settled engine path rendered');
      assert(first.landing?.length === 2 && first.landing.every(value => Number.isFinite(Number(value))),
        'The first free throw reaches rim height and renders its actual landing marker');
      assert.equal(await board.locator('[data-lab-path]').count(), 1, 'First attempt cannot fabricate a previous path');
      await shot('first-result');
      await activate(button('Retry this shot'), touch);
      assert(await power.evaluate(el => document.activeElement === el), 'Retry restores focus to Power');
      await page.waitForTimeout(reduced ? 0 : 400);
      result.courts.push(await courtVisible(board, page, 'retry'));
      assert.deepEqual(await settings(board), firstSettings, 'Retry retains all three controls');
      const retryScroll = await page.evaluate(() => scrollY);
      await activate(button('Shoot'), touch);
      await settled(2);
      if (width === 1440) {
        const settledScroll = await page.evaluate(() => scrollY);
        assert(Math.abs(settledScroll - retryScroll) <= 2, 'Already visible desktop result does not jump the page');
        result.stableDesktopScroll = { before: retryScroll, after: settledScroll };
      }
      const repeated = await shotShape(board), previous = await shotShape(board, 'previous');
      assert.equal(repeated.path, first.path, 'Same setup and controls repeat the exact actual path');
      assert.deepEqual(repeated.landing, first.landing, 'Exact retry repeats its actual rim marker');
      assert.deepEqual(repeated.fields, first.fields, 'Exact retry repeats actual result measurements');
      assert.equal(previous.path, first.path, 'Previous path is the actual first shot');
      assert(previous.dash && !repeated.dash, 'Previous is dashed and current is solid');
      await shot('exact-retry');
      await activate(button('Retry this shot'), touch);
      await changeRange(board, powerName, 0.4);
      assert.deepEqual((await settings(board)).slice(1), firstSettings.slice(1), 'Only Power changes');
      await activate(button('Shoot'), touch);
      await settled(3);
      const adjusted = await shotShape(board), retained = await shotShape(board, 'previous');
      assert.notEqual(adjusted.path, repeated.path, 'A real Power adjustment changes the engine path');
      assert.equal(retained.path, repeated.path, 'Comparison retains the preceding actual shot');
      assert.deepEqual(retained.fields, repeated.fields, 'Previous measurements are preserved');
      assert.notDeepEqual(adjusted.fields, repeated.fields, 'Comparison shows changed settings and result');
      assert.equal(await board.locator('[data-lab-shot]').count(), 2, 'Only the two latest actual attempts compare');
      result.paths = { first, repeated, adjusted, retained };
      await shot('adjustment');
      await board.locator('[data-lab-comparison]').scrollIntoViewIfNeeded(); await shot('comparison-details');
      await board.locator('svg[role="img"]').scrollIntoViewIfNeeded(); await shot('compared-court');
      await activate(button('Change setup'), touch);
      assert.equal(await board.getAttribute('data-lab-setup'), '2');
      assert.equal(await board.locator('[data-lab-attempt]').getAttribute('data-lab-attempt'), '0');
      assert.equal(await board.locator('[data-lab-path], [data-lab-landing], [data-lab-comparison]').count(), 0,
        'New setup clears both old paths, markers and comparison');
      assert.deepEqual(await settings(board), ['0.4', '0.6', '0'], 'New setup retains chosen controls');
      await activate(button('Shoot'), touch);
      if (!reduced) {
        assert.equal(await board.getAttribute('data-arcade-phase'), 'flying');
        await activate(button('Pause'), touch);
        await page.waitForFunction(() => document.querySelector('[data-shot-lab]')?.getAttribute('data-arcade-paused') === 'true');
        await frames(page);
        const frozen = await board.locator('svg[role="img"]').innerHTML();
        await page.waitForTimeout(1000);
        assert.equal(await board.getAttribute('data-arcade-phase'), 'flying', 'Pause cannot settle a shot');
        assert.equal(await board.locator('[data-lab-attempt]').getAttribute('data-lab-attempt'), '0');
        assert.equal(await board.locator('svg[role="img"]').innerHTML(), frozen, 'Paused actual flight stops moving');
        await activate(button('Resume'), touch);
      }
      await settled(1);
      assert.equal(await board.locator('[data-lab-path]').count(), 1, 'New setup starts a new comparison');
      await isolate(before);

      for (const [label, mode] of [["Today's ten", 'daily'], ['Unlimited', 'unlimited'], ['Steady practice', 'practice'], ['Three-point contest', 'contest']]) {
        if (result.exits.length) {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.getByRole('button', { name: 'Shot lab', exact: true }).waitFor();
          await enter();
        }
        const exitBefore = await protectedState(page);
        await page.evaluate(() => { window.__labWrites = []; });
        await activate(board.locator('summary').filter({ hasText: 'Leave lab' }), touch);
        await activate(button(label), touch);
        const destination = page.locator('[data-arcade-mode]');
        assert.equal(await destination.getAttribute('data-arcade-mode'), mode);
        assert.equal(await page.locator('[data-shot-lab], [data-lab-path], [data-lab-comparison]').count(), 0, 'Lab state does not leak into another mode');
        if (mode === 'daily' && restored) {
          assert.equal(await destination.getAttribute('data-arcade-phase'), 'done');
          assert((await destination.innerText()).includes('4 of 10 made'));
          assert((await destination.innerText()).includes('173 points'));
        } else assert.equal(await destination.getAttribute('data-arcade-phase'), 'aiming');
        await isolate(exitBefore);
        result.exits.push({ label, mode, passed: true });
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Shot lab', exact: true }).waitFor();
      assert.equal(await page.evaluate(key => localStorage.getItem(key), DAILY), restored ? dailyBytes : null, 'Reload holds the exact original daily');
      if (width === 1440) {
        await page.evaluate(() => localStorage.setItem('dukb-theme', 'light'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await enter();
        assert(await page.locator('html').evaluate(el => el.classList.contains('light')), 'Real stored light theme loaded');
        const lightBefore = await protectedState(page);
        await page.evaluate(() => { window.__labWrites = []; });
        await activate(button('Shoot'), touch); await settled(1);
        await activate(button('Retry this shot'), touch);
        await changeRange(board, powerName, 0.35);
        await activate(button('Shoot'), touch); await settled(2);
        assert.equal(await board.locator('[data-lab-shot]').count(), 2);
        result.layouts.push(await layout(page, 'light-comparison'));
        await shot('light-comparison');
        assert.equal(await page.evaluate(key => localStorage.getItem(key), DAILY), dailyBytes, 'Light pass keeps the daily record');
        await isolate(lightBefore);
      }
      assert.deepEqual(result.pageErrors, [], 'No uncaught page errors');
      assert.deepEqual(result.assetFailures, [], 'All built assets load');
      result.passed = true;
      console.log(`${id}: actual exact retry, adjustment, setup, rules, pause, focus, four exits and untouched daily passed.`);
    } catch (error) {
      result.passed = false; result.error = String(error.stack || error);
      await shot('failure').catch(() => {});
      console.error(`${id}: ${result.error}`);
    } finally { await context.close(); saveReport(); }
  }
  assert.equal(report.cases.length, 3);
  assert(report.cases.every(row => row.passed), 'Every native Shot Lab profile must pass');
} finally {
  report.finished = new Date().toISOString(); saveReport();
  await browser?.close(); server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
}
