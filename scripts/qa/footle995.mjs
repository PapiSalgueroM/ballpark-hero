/* Actual built Footle, frozen local responses, native input and durable reloads. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { FIXED_TIME, FIXED_DAY, RUN_KEY, frozenMarketRows, marketResponse } from './footle995-fixtures.mjs';

const root = process.cwd(), output = path.join(root, 'footle-practice-artifacts/native');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const temp = await mkdtemp(path.join(parent, 'footle995-native-'));
await mkdir(output, { recursive: true });
const base = 'http://127.0.0.1:4195', dailyKey = `footle-daily-${FIXED_DAY}`;
const recordKeys = [dailyKey, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const rows = [], failures = [];
let browser, server;
try {
  const bundle = path.join(temp, 'dates.mjs');
  await build({ stdin: { contents: "export { getDailyTier } from './src/lib/dateUtils';", resolveDir: root, loader: 'ts' }, outfile: bundle, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' });
  const { getDailyTier } = await import(pathToFileURL(bundle).href);
  const dailyTier = getDailyTier(FIXED_DAY), fixtureRows = frozenMarketRows();
  const dailyWrong = dailyTier === 'insane' ? fixtureRows.famous[0].player_name : fixtureRows.obscure[0].player_name;
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4195'], { stdio: 'pipe', windowsHide: true });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) { try { ready = (await fetch(base)).ok; } catch { /* Owned server is starting. */ } if (ready) break; await pause(250); }
  assert.ok(ready, 'Built site starts'); browser = await chromium.launch();
  for (const [width, height, touch, tier, motion] of [[320, 780, true, 'easy', 'reduce'], [390, 844, true, 'hard', 'no-preference'], [1440, 960, false, 'insane', 'no-preference']]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, reducedMotion: motion });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    const errors = [], blocked = [], writes = [], layouts = [], actions = [];
    let changedPool = false;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (request.url().startsWith(base)) return route.continue();
      if (url.pathname === '/rest/v1/player_market_values' && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, OPTIONS' } });
      if (url.pathname === '/rest/v1/player_market_values' && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(marketResponse(url, changedPool)) });
      if (/\/(game_completions|user_game_scores|daily_completions|user_best_scores)$/.test(url.pathname) && request.method() !== 'GET') writes.push({ path: url.pathname, method: request.method() });
      blocked.push({ path: url.pathname, method: request.method() });
      return route.abort();
    });
    await page.addInitScript(({ fixed }) => {
      const OriginalDate = Date;
      globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return new OriginalDate(fixed).getTime(); } };
      localStorage.setItem('cookie-consent', 'essential');
      window.__practiceFocus = [];
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function(options) {
        const before = { x: scrollX, y: scrollY };
        const value = focus.call(this, options);
        if (this.hasAttribute('data-footle-practice')) window.__practiceFocus.push({ before, after: { x: scrollX, y: scrollY }, preventScroll: options?.preventScroll === true });
        return value;
      };
    }, { fixed: FIXED_TIME });
    const run = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), RUN_KEY);
    const rawRun = () => page.evaluate(key => localStorage.getItem(key), RUN_KEY);
    const heldRecords = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), recordKeys);
    const activate = async (locator, label, minHeight = 44) => {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      assert.ok(box && box.height >= minHeight && box.width >= 30, `${label} has a usable native target`);
      if (touch) await locator.tap();
      else { await locator.focus(); await page.keyboard.press('Enter'); }
      actions.push({ label, input: touch ? 'native tap' : 'native Enter after explicit focus', width: box.width, height: box.height });
    };
    const typeName = async name => {
      const input = page.getByRole('combobox', { name: 'Search for a player' });
      await input.waitFor(); await input.scrollIntoViewIfNeeded();
      if (touch) await input.tap(); else await input.focus();
      await page.keyboard.press('Control+A'); await page.keyboard.type(name);
      return input;
    };
    const guess = async name => {
      await typeName(name);
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const option = page.getByRole('option', { name: new RegExp(`^${escaped}`) });
      await option.waitFor();
      if (touch) await activate(option, `guess:${name}`);
      else {
        assert.equal(await option.getAttribute('aria-selected'), 'true', 'Exact search match is the current keyboard option');
        await page.keyboard.press('Enter'); actions.push({ label: `guess:${name}`, input: 'native search Enter' });
      }
    };
    const waitRound = (index, count, status) => page.waitForFunction(({ key, index, count, status }) => {
      const value = JSON.parse(localStorage.getItem(key));
      return value?.index === index && value.rounds[index].guesses.length === count && (!status || value.rounds[index].status === status);
    }, { key: RUN_KEY, index, count, status });
    const visibleResult = async (locator, label) => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const box = await locator.boundingBox();
      layouts.push({ label, box, viewportHeight: height });
      assert.ok(box && box.y >= -1 && box.y + box.height <= height + 1, `${label}: usable in the current viewport before any driver scroll or focus`);
    };
    const layout = async label => {
      const value = await page.evaluate(() => {
        const over = [];
        for (const element of document.querySelectorAll('main *')) {
          const box = element.getBoundingClientRect();
          if (!box.width || !box.height || (box.left >= -1 && box.right <= innerWidth + 1)) continue;
          let left = box.left, right = box.right;
          for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
            if (getComputedStyle(ancestor).overflowX !== 'visible') { const clip = ancestor.getBoundingClientRect(); left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
          }
          if (left < -1 || right > innerWidth + 1) over.push({ tag: element.tagName, text: element.textContent?.slice(0, 80), left, right });
        }
        return { viewport: innerWidth, width: document.documentElement.scrollWidth, over };
      });
      layouts.push({ label, ...value });
      assert.equal(value.width, value.viewport, `${label}: no page overflow`);
      assert.deepEqual(value.over, [], `${label}: wide clues remain inside their own scroll container`);
    };
    try {
      await page.goto(base + '/footle');
      const help = page.getByRole('dialog', { name: 'How to Play Footle' }); await help.waitFor();
      assert.match(await help.textContent(), /five|5/i, 'Instructions explain the run before play');
      assert.match(await help.textContent(), /example|imagine|hypothetical/i, 'Instructions include a worked example');
      await page.screenshot({ path: path.join(output, `${width}-instructions.png`), animations: 'disabled' });
      await activate(help.getByRole('button', { name: "Let's Play!" }), 'close instructions');
      await guess(dailyWrong);
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.guesses?.length === 1, dailyKey);
      const daily = JSON.parse(await page.evaluate(key => localStorage.getItem(key), dailyKey));
      assert.equal(daily.gameStatus, 'playing'); assert.notEqual(daily.puzzleId, dailyWrong);
      const records = await heldRecords();
      await activate(page.locator('[data-footle-mode="unlimited"]'), 'open Easy Unlimited');
      await guess(fixtureRows.obscure[0].player_name);
      await page.getByText(/^Guesses:\s*1\s*\/\s*8$/).waitFor();
      const unlimitedClues = await page.locator('.animate-cell-reveal').allTextContents();
      assert.equal(unlimitedClues.length, 9, 'One wrong Unlimited guess has all eight clues');
      await activate(page.getByRole('button', { name: 'Five-puzzle run', exact: true }), 'open practice');
      await activate(page.getByRole('button', { name: new RegExp(`^${tier}$`, 'i') }), `choose ${tier}`);
      await page.waitForFunction(tier => [...document.querySelectorAll('button')].some(button => button.textContent?.trim() === tier && button.getAttribute('aria-pressed') === 'true'), tier);
      await activate(page.locator('[data-footle-mode="unlimited"]'), 'return to preserved Unlimited');
      await page.getByText(/^Guesses:\s*1\s*\/\s*8$/).waitFor();
      assert.equal(await page.getByRole('button', { name: 'easy', exact: true }).getAttribute('aria-pressed'), 'true', 'Practice tier selection preserves the in-progress Unlimited tier');
      assert.deepEqual(await page.locator('.animate-cell-reveal').allTextContents(), unlimitedClues, 'Returning to Unlimited preserves the original guess clues');
      await activate(page.locator('[data-footle-mode="practice"]'), 'return to chosen practice tier');
      await page.waitForFunction(tier => [...document.querySelectorAll('button')].some(button => button.textContent?.trim() === tier && button.getAttribute('aria-pressed') === 'true'), tier);
      await layout('setup'); await page.screenshot({ path: path.join(output, `${width}-setup.png`), animations: 'disabled' });
      await activate(page.getByRole('button', { name: 'Start run', exact: true }), 'start run');
      await waitRound(0, 0, 'playing');
      const initial = await run(), poolBytes = JSON.stringify(initial.pool);
      assert.equal(initial.tier, tier); assert.equal(initial.targets.length, 5);
      assert.equal(new Set(initial.targets.map(name => name.trim().toLowerCase())).size, 5);
      assert.ok(!initial.targets.includes(daily.puzzleId), 'Today is excluded');
      for (const name of initial.targets) assert.equal(initial.pool.find(player => player.name === name)?.difficulty, tier);
      assert.equal(await page.getByRole('button', { name: 'Next puzzle', exact: true }).count(), 0, 'Unfinished puzzle cannot advance');
      const wrong = initial.pool.find(player => player.goals === null && player.name !== initial.targets[0]).name;
      await guess(wrong); await waitRound(0, 1, 'playing');
      const unknownGoal = page.locator('.animate-cell-reveal').nth(3);
      assert.match(await unknownGoal.textContent(), /\?/);
      assert.match(await unknownGoal.textContent(), /not on file/);
      assert.doesNotMatch(await unknownGoal.textContent(), /▲|▼|higher|lower/);
      if (motion === 'reduce') {
        const durations = await page.locator('.animate-cell-reveal').evaluateAll(cells => cells.map(cell => getComputedStyle(cell).animationDuration));
        assert.ok(durations.length > 0 && durations.every(value => value.split(',').every(duration => parseFloat(duration) <= 0.000001)), 'Reduced motion removes perceptible clue animation');
      }
      const beforeModeSwitch = await run();
      await activate(page.locator('[data-footle-mode="daily"]'), 'return to daily');
      assert.deepEqual(await heldRecords(), records, 'Returning to daily retains its exact saved guess');
      await activate(page.locator('[data-footle-mode="practice"]'), 'resume practice');
      assert.deepEqual(await run(), beforeModeSwitch, 'Returning to practice resumes the same puzzle and guesses');
      const beforeReload = await rawRun(); changedPool = true;
      await page.reload(); await page.getByRole('combobox').waitFor();
      assert.equal(await rawRun(), beforeReload, 'Reload restores the exact in-progress run despite new fetched clues');
      await typeName(wrong);
      assert.equal(await page.getByRole('option').evaluateAll((options, name) => options.filter(option => option.querySelector('span')?.textContent === name).length, wrong), 0, 'The same name is excluded');
      await page.keyboard.press('Escape'); await page.keyboard.press('Enter');
      assert.equal(await rawRun(), beforeReload, 'Same-name hidden Enter consumes no guess');
      await guess(initial.targets[0]); await waitRound(0, 2, 'won');
      await visibleResult(page.getByRole('button', { name: 'Next puzzle', exact: true }), 'first result next action');
      await layout('first result'); await page.screenshot({ path: path.join(output, `${width}-first-result.png`), animations: 'disabled' });
      for (let index = 1; index < 5; index++) {
        await activate(page.getByRole('button', { name: 'Next puzzle', exact: true }), `next puzzle ${index + 1}`);
        await waitRound(index, 0, 'playing');
        assert.ok(await page.locator('[data-footle-practice]').evaluate(panel => document.activeElement === panel), 'Next puzzle focuses the updated progress panel');
        const focusEvent = await page.evaluate(() => window.__practiceFocus.at(-1));
        assert.equal(focusEvent?.preventScroll, true, 'Progress focus requests preventScroll');
        assert.deepEqual(focusEvent.after, focusEvent.before, 'Progress focus does not scroll the page');
        await page.keyboard.press('Tab');
        assert.ok(await page.getByRole('combobox').evaluate(input => document.activeElement === input), 'One native Tab reaches the usable search');
        assert.equal(JSON.stringify((await run()).pool), poolBytes, 'Run comparisons retain the frozen pool');
        if (index === 1) {
          const misses = initial.pool.filter(player => player.name !== initial.targets[index]).slice(0, 8);
          for (let count = 0; count < misses.length; count++) { await guess(misses[count].name); await waitRound(index, count + 1, count === 7 ? 'lost' : 'playing'); }
          assert.equal(await page.getByRole('combobox').count(), 0, 'Eight misses end the puzzle');
          await visibleResult(page.getByRole('button', { name: 'Next puzzle', exact: true }), 'eight-miss next action');
          await layout('eight misses'); await page.screenshot({ path: path.join(output, `${width}-eight-misses.png`), animations: 'disabled' });
        } else if (index === 3) {
          await activate(page.getByRole('button', { name: 'Give up', exact: true }), 'give up');
          await activate(page.getByRole('button', { name: 'Yes, reveal it', exact: true }), 'confirm give up');
          await waitRound(index, 0, 'lost');
          await visibleResult(page.getByRole('button', { name: 'Next puzzle', exact: true }), 'give-up next action');
        } else { await guess(initial.targets[index]); await waitRound(index, 1, 'won'); }
        if (index === 2) await visibleResult(page.getByRole('button', { name: 'Next puzzle', exact: true }), 'third puzzle next action');
        assert.deepEqual(await heldRecords(), records, 'Practice changes no daily save or completion record');
      }
      const final = await run();
      assert.deepEqual(final.rounds.map(round => round.status), ['won', 'lost', 'won', 'lost', 'won']);
      assert.equal(final.rounds.reduce((total, round) => total + round.guesses.length, 0), 12);
      const receipt = page.locator('[data-footle-practice-result]'); await receipt.waitFor();
      assert.match(await receipt.textContent(), /Run complete/);
      assert.match(await receipt.textContent(), /3 of 5 solved/);
      assert.match(await receipt.textContent(), /12 total guesses/);
      await visibleResult(receipt.getByRole('heading', { name: 'Run complete', exact: true }), 'completed run heading');
      await visibleResult(receipt.getByRole('button', { name: 'Play another five', exact: true }), 'completed run next action');
      for (const name of initial.targets) assert.ok((await receipt.textContent()).includes(name), 'All five answer cards appear');
      assert.equal(await page.getByRole('button', { name: 'Next puzzle', exact: true }).count(), 0);
      await receipt.scrollIntoViewIfNeeded(); await layout('complete'); await page.screenshot({ path: path.join(output, `${width}-complete.png`), animations: 'disabled' });
      const finishedBytes = await rawRun(); await page.reload(); await receipt.waitFor();
      assert.equal(await rawRun(), finishedBytes, 'Completed reload keeps the same result and all five targets');
      assert.deepEqual(await heldRecords(), records); assert.deepEqual(writes, [], 'No daily score write is attempted by practice');
      await activate(page.getByRole('button', { name: /How to play/i }), 'reopen help', 30);
      await help.waitFor(); await activate(help.getByRole('button', { name: "Let's Play!" }), 'close help');
      assert.equal(await rawRun(), finishedBytes, 'Help does not restart or mutate the completed run');
      assert.deepEqual(errors, [], 'No browser exceptions');
      rows.push({ width, height, tier, motion, targets: initial.targets, statuses: final.rounds.map(round => round.status), guesses: 12, layouts, actions, blockedRequests: blocked.length, scoreWrites: writes.length });
      console.log(`Footle ${width}px ${tier}: five complete puzzles,3 wins/2 losses/12 guesses, frozen reload, duplicate guard, tier/daily isolation and native layout pass.`);
    } catch (error) {
      failures.push({ width, tier, message: error.message, layouts, actions, errors, writes });
      await page.screenshot({ path: path.join(output, `${width}-failure.png`) }).catch(() => {});
      console.error(`Footle ${width}px ${tier} failed: ${error.message}`);
    } finally { await context.close(); }
  }
  await writeFile(path.join(output, 'summary.json'), JSON.stringify({ rows, failures, scope: 'Actual built app with frozen fictional player responses. Three native five-puzzle runs, touch or real keyboard activation after explicit focus setup. No external request is allowed through, no live database probes or writes.' }, null, 2));
  assert.equal(rows.length, 3); assert.deepEqual(failures, []);
} finally {
  await browser?.close(); server?.kill();
  assert.equal(path.dirname(temp), parent); assert.ok(path.basename(temp).startsWith('footle995-native-'));
  await rm(temp, { recursive: true, force: true });
}
