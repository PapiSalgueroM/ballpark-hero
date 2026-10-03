/* Actual built NHL page, native planning and original scoring. All external requests stay local. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'nhl-planning-artifacts/native');
const DATE = '2026-10-03', DAILY = 'nhl-connections-daily-' + DATE;
const noteKey = mode => 'nhl-connections-notes-v1:' + mode;
const protectedKeys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build before native verification');
// Fixture setup imports only accepted records and the original date selector, never the notes or scoring implementation.
const fixtureBuild = await build({ stdin: { contents: "export { nhlConnectionsPuzzles } from './src/data/nhlConnectionsPuzzles'; export { dailyIndex } from './src/lib/dateUtils';", resolveDir: ROOT }, bundle: true, platform: 'node', format: 'esm', write: false });
const { nhlConnectionsPuzzles, dailyIndex } = await import('data:text/javascript;base64,' + Buffer.from(fixtureBuild.outputFiles[0].text).toString('base64'));
const fixtures = nhlConnectionsPuzzles.slice(0, 2);
assert.equal(fixtures.length, 2);
for (const puzzle of fixtures) assert.equal(new Set(puzzle.groups.flatMap(group => group.players)).size, 20);
fs.writeFileSync(path.join(OUT, 'accepted-fixtures.json'), JSON.stringify(fixtures, null, 2));
const report = { started: new Date().toISOString(), cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '', browser;
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start in 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
const settle = async page => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.waitForTimeout(450); };
async function activate(locator, touch) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert(box && box.width >= 43 && box.height >= 43, 'Native action has a 44px target: ' + await locator.innerText());
  if (touch) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); }
}
async function visible(locator, page, label) {
  const box = await locator.boundingBox(), height = await page.evaluate(() => innerHeight);
  assert(box && box.width > 0 && box.height > 0 && box.y >= -1 && box.y + box.height <= height + 1, label + ': visible without driver scrolling');
  return { label, box };
}
async function layout(page, label) {
  const value = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
    rows: [...document.querySelectorAll('[data-nhl-planning] button, [data-nhl-planning] p, [data-nhl-final], [role="dialog"]')].map(el => {
      const box = el.getBoundingClientRect(); return { text: el.textContent?.slice(0, 70), left: box.left, right: box.right, width: box.width, client: el.clientWidth, scroll: el.scrollWidth };
    }).filter(row => row.width) }));
  assert(value.document <= value.viewport + 2, label + ': document fits viewport');
  for (const row of value.rows) assert(row.left >= -1 && row.right <= value.viewport + 1 && row.scroll <= row.client + 2, label + ': full text fits ' + JSON.stringify(row));
  return { label, ...value };
}

try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, light: false },
    { width: 390, height: 844, touch: true, reduced: false, light: false },
    { width: 430, height: 932, touch: true, reduced: false, light: true },
    { width: 1440, height: 1000, touch: false, reduced: false, light: false },
  ]) {
    const { width, height, touch, reduced, light } = profile;
    const id = `${width}-${light ? 'light' : 'dark'}-${touch ? 'touch' : 'keyboard'}${reduced ? '-reduced' : ''}`;
    const pool = width === 390 ? fixtures : fixtures.slice(0, 1), dailyPuzzle = pool[dailyIndex(DATE, pool.length)];
    const result = { id, ...profile, screenshots: [], layouts: [], visibility: [], controls: [], pageErrors: [], consoleErrors: [], assetFailures: [], interceptedRequests: [], scoreWrites: [], storageWrites: [] };
    report.cases.push(result);
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: light ? 'light' : 'dark' },
        { name: 'rules-gate-seen:/nhl-connections', value: '1' }, { name: 'dukb-guest-handle', value: 'FixtureGoal-42' },
      ] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      result.interceptedRequests.push({ method: request.method(), path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && /\/(game_completions|user_game_scores|daily_completions|user_best_scores|user_scores|record_auth_completion)$/.test(url.pathname)) {
        result.scoreWrites.push({ method: request.method(), path: url.pathname, body: request.postDataJSON() });
      }
      if (url.pathname === '/rest/v1/nhl_connections_puzzles') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pool.map(puzzle => ({ puzzle_id: puzzle.id, groups_json: puzzle.groups }))) });
      const type = request.resourceType();
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    await page.addInitScript(({ date, keys }) => {
      const OriginalDate = Date, now = new OriginalDate(date + 'T16:00:00Z').getTime();
      window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      Math.random = () => Number(localStorage.getItem('qa-nhl-random') || 0);
      window.__nhlWrites = [];
      for (const method of ['setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && (keys.includes(key) || key.startsWith('nhl-connections-notes-v1:'))) window.__nhlWrites.push({ method, key, value: args[0] ?? null });
          return original.call(this, key, ...args);
        };
      }
    }, { date: DATE, keys: protectedKeys });
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) result.assetFailures.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) result.assetFailures.push(response.url() + ': ' + response.status()); });
    const bench = page.locator('[data-nhl-planning]');
    const button = name => bench.getByRole('button', { name, exact: true });
    const modeButton = mode => page.getByRole('button', { name: mode === 'daily' ? '📅 Daily' : '∞ Unlimited', exact: true });
    const stored = key => page.evaluate(value => localStorage.getItem(value), key);
    const notes = async mode => JSON.parse(await stored(noteKey(mode)));
    const protectedState = () => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), protectedKeys);
    const readyBench = async () => { await button('Draft A').waitFor(); await settle(page); };
    const choose = async label => activate(button('Draft ' + label), touch);
    const pick = async names => { for (const name of names) await activate(button(name), touch); };
    const shoot = async stage => { await settle(page); const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); result.screenshots.push(file); result.layouts.push(await layout(page, stage)); };
    const changeMode = async mode => { await activate(modeButton(mode), touch); await readyBench(); assert.equal(await modeButton(mode).getAttribute('aria-pressed'), 'true'); };
    const receipt = async stage => {
      await settle(page);
      result.visibility.push(await visible(page.locator('[data-nhl-receipt]'), page, stage + '-receipt'));
      result.visibility.push(await visible(button('Submit five'), page, stage + '-action'));
      assert(await page.locator('[data-nhl-receipt]').evaluate(el => document.activeElement?.contains(el)), stage + ': actual receipt owns focus');
    };
    try {
      await page.goto(BASE + '/nhl-connections', { waitUntil: 'domcontentloaded' });
      const dialog = page.getByRole('dialog'); await dialog.waitFor();
      assert.match(await dialog.innerText(), /Try this example[\s\S]*Keep another idea in B/);
      assert.match(await dialog.innerText(), /Planning is free/);
      await dialog.getByText('Try this example', { exact: true }).scrollIntoViewIfNeeded();
      await shoot('rules-example');
      await activate(dialog.getByRole('button', { name: 'Close', exact: true }), touch); await readyBench();
      const before = await protectedState();
      const group = dailyPuzzle.groups, wrong = [...group[0].players.slice(0, 4), group[1].players[0]];
      await choose('B'); await pick(group[2].players); await choose('A'); await pick(wrong);
      assert.deepEqual((await notes('daily')).groups, [wrong, group[2].players, [], []]);
      assert(await page.getByLabel('4 lives remaining', { exact: true }).count());
      assert.deepEqual(await protectedState(), before, 'Planning has no score, action, completion or streak effect');
      assert.deepEqual(result.scoreWrites, [], 'Planning makes no score request');
      const dailyNotes = await stored(noteKey('daily'));
      await shoot('planned');
      const help = page.locator('header').getByRole('button', { name: 'How to play', exact: true });
      await activate(help, touch); await dialog.waitFor();
      assert.match(await dialog.innerText(), /Try this example[\s\S]*Keep another idea in B/);
      await activate(dialog.getByRole('button', { name: 'Close', exact: true }), touch); await settle(page);
      assert.equal(await stored(noteKey('daily')), dailyNotes, 'Reopened rules preserve the complete draft');
      assert.deepEqual(await protectedState(), before);
      assert.deepEqual(await page.evaluate(keys => window.__nhlWrites.filter(write => keys.includes(write.key)), protectedKeys), [], 'Free planning never transiently writes protected state');
      if (width === 320) {
        const style = await bench.getAttribute('style');
        try {
          await bench.evaluate(el => { el.style.width = '200vw'; });
          assert((await bench.boundingBox()).width > width * 1.5, 'Layout control enlarges the actual bench');
          await assert.rejects(() => layout(page, 'wide-bench-control'), error => error.name === 'AssertionError' && error.code === 'ERR_ASSERTION' && error.message === 'wide-bench-control: document fits viewport');
        } finally { await bench.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), style); }
        await layout(page, 'restored-bench'); assert.equal(await stored(noteKey('daily')), dailyNotes);
        result.controls.push({ kind: 'native horizontal geometry guard', changed: true, rejected: true, restored: true });
      }
      await changeMode('unlimited'); await choose('D'); await pick([pool[0].groups[0].players[0]]);
      const unlimitedNotes = await stored(noteKey('unlimited'));
      await page.evaluate(() => localStorage.setItem('qa-nhl-random', '0.9'));
      await page.reload({ waitUntil: 'domcontentloaded' }); await readyBench();
      assert.equal(await stored(noteKey('daily')), dailyNotes);
      assert.equal(await button('Draft A').getAttribute('aria-pressed'), 'true');
      await changeMode('unlimited');
      assert.equal(await stored(noteKey('unlimited')), unlimitedNotes, 'Reload preserves exact Unlimited notes bytes');
      assert.equal(await button('Draft D').getAttribute('aria-pressed'), 'true');
      assert.equal(await button(pool[0].groups[0].players[0]).getAttribute('aria-pressed'), 'true');
      assert(await page.getByLabel('4 lives remaining', { exact: true }).count());
      await shoot('unlimited-restored');
      await changeMode('daily'); assert.equal(await stored(noteKey('daily')), dailyNotes);
      assert.deepEqual(await protectedState(), before, 'Mode changes and reload preserve original Daily bytes');
      assert.deepEqual(result.scoreWrites, []);
      await activate(button('Submit five'), touch); await receipt('wrong');
      assert.equal(await stored(DAILY).then(JSON.parse).then(save => save.guesses.length), 1);
      assert.equal(await button('Submit five').isDisabled(), true, 'Unchanged wrong group cannot be booked twice');
      assert.match(await page.locator('[data-nhl-receipt]').innerText(), /One life used/);
      assert.deepEqual((await notes('daily')).groups, [wrong, group[2].players, [], []]);
      if (reduced) assert.equal(await page.getByRole('group', { name: 'Available players' }).evaluate(el => getComputedStyle(el).animationName), 'none');
      await shoot('wrong-retained');
      if (width === 320) {
        const target = page.locator('[data-nhl-receipt]'), save = await stored(DAILY);
        const style = await target.getAttribute('style');
        try {
          await target.evaluate(el => { el.style.display = 'none'; });
          assert.equal(await target.boundingBox(), null, 'Visibility control changes actual receipt geometry');
          await assert.rejects(() => visible(target, page, 'hidden-receipt-control'), error => error.name === 'AssertionError' && error.code === 'ERR_ASSERTION' && error.message === 'hidden-receipt-control: visible without driver scrolling');
        } finally { await target.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), style); }
        await visible(target, page, 'restored-receipt'); assert.equal(await stored(DAILY), save);
        result.controls.push({ kind: 'native receipt visibility guard', changed: true, rejected: true, restored: true });
      }
      await pick([wrong[4], group[0].players[4]]); await activate(button('Submit five'), touch); await receipt('correct');
      assert.match(await page.locator('[data-nhl-receipt]').innerText(), new RegExp('Locked: ' + group[0].theme));
      for (const name of group[0].players) assert.equal(await button(name).count(), 0, 'Solved names are no longer editable');
      assert.deepEqual((await notes('daily')).groups[1], group[2].players, 'Other draft survives the solve');
      await shoot('correct-locked');
      await choose('B'); await activate(button('Submit five'), touch); await receipt('parked-correct');
      for (const index of [1, 3]) {
        await choose('A'); await pick(group[index].players); await activate(button('Submit five'), touch);
        if (index === 1) await receipt('third-correct');
      }
      await page.getByText('All Groups Found!', { exact: true }).waitFor(); await settle(page);
      result.visibility.push(await visible(page.getByText('All Groups Found!', { exact: true }), page, 'final-headline'));
      const finalBytes = await stored(DAILY), final = JSON.parse(finalBytes);
      assert.equal(final.gameStatus, 'won'); assert.equal(final.puzzleId, dailyPuzzle.id);
      assert.deepEqual(final.guesses.map(action => action.t), ['x', 'ok', 'ok', 'ok', 'ok']);
      assert.deepEqual(final.guesses.filter(action => action.t === 'ok').map(action => action.players), [group[0], group[2], group[1], group[3]].map(value => value.players));
      assert.deepEqual((await notes('daily')).groups.flat(), []);
      assert.equal(result.scoreWrites.length, 1, 'Exactly one original Daily completion request');
      assert.equal(result.scoreWrites[0].path, '/rest/v1/game_completions');
      assert.equal(result.scoreWrites[0].body.game, 'nhl-connections'); assert.equal(result.scoreWrites[0].body.score, 750);
      result.score = 750; result.dailyPayload = final; await shoot('daily-complete');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByText('All Groups Found!', { exact: true }).waitFor(); await settle(page);
      assert.equal(await stored(DAILY), finalBytes, 'Completed Daily reload preserves the exact original payload');
      assert.equal(result.scoreWrites.length, 1, 'Restoring completion never records twice');
      if (width === 390) {
        await changeMode('unlimited'); await choose('A');
        const wrongUnlimited = [...pool[0].groups[0].players.slice(0, 4), pool[0].groups[1].players[0]];
        for (let attempt = 0; attempt < 4; attempt++) {
          if (!(await button('Clear draft').isDisabled())) await activate(button('Clear draft'), touch);
          await pick(wrongUnlimited); await activate(button('Submit five'), touch);
          if (attempt < 3) await receipt('unlimited-miss-' + attempt);
        }
        await page.getByText('Out of Lives!', { exact: true }).waitFor(); await settle(page);
        assert.match(await page.locator('[data-nhl-final]').innerText(), /Found 0\/4 groups/);
        assert.equal(result.scoreWrites.length, 1, 'Unlimited retains the original unranked contract');
        await activate(page.getByRole('button', { name: 'Play Again', exact: true }), touch); await readyBench();
        const resetNotes = await notes('unlimited');
        assert.deepEqual(JSON.parse(resetNotes.scope), ['unlimited', pool[1].id, null]);
        assert.deepEqual(resetNotes.groups, [[], [], [], []]);
        await page.evaluate(() => localStorage.setItem('qa-nhl-random', '0'));
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByText('All Groups Found!', { exact: true }).waitFor();
        await changeMode('unlimited');
        assert.deepEqual(await notes('unlimited'), resetNotes, 'Immediate reset reload opens the new puzzle with empty notes');
        for (const name of pool[1].groups.flatMap(value => value.players)) assert.equal(await button(name).count(), 1);
        assert(await page.getByLabel('4 lives remaining', { exact: true }).count());
        assert.equal(await stored(DAILY), finalBytes); assert.equal(result.scoreWrites.length, 1);
        result.unlimitedReset = { oldPuzzle: pool[0].id, newPuzzle: pool[1].id, reloadHeld: true }; await shoot('unlimited-new-puzzle');
      }
      result.storageWrites = await page.evaluate(() => window.__nhlWrites);
      assert.deepEqual(result.pageErrors, [], 'No native page errors'); assert.deepEqual(result.consoleErrors, [], 'No native console errors'); assert.deepEqual(result.assetFailures, [], 'Built local assets load');
      result.passed = true;
    } catch (error) {
      result.passed = false; result.error = String(error?.stack || error);
      await page.screenshot({ path: path.join(OUT, id + '-failure.png'), animations: 'disabled' }).catch(() => {});
    } finally { saveReport(); await context.close(); }
  }
  assert.equal(report.cases.length, 4); assert(report.cases.every(value => value.passed), 'Every native planning profile passes; see report.json');
  assert.equal(report.cases.flatMap(value => value.controls).length, 2);
  console.log('NHL planning native: four complete 750-point Daily solves, independent notes/reloads, Unlimited reset, native touch/keyboard and two effective geometry controls passed.');
} finally {
  saveReport(); if (browser) await browser.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
}
