import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { FIXED_TIME, FIXED_DAY, RUN_KEY, marketResponse } from './footle995-fixtures.mjs';

const root = process.cwd(), output = path.join(root, 'footle-clue-desk-artifacts/native');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const temp = await mkdtemp(path.join(parent, 'footle-clue-desk-native-')); await mkdir(output, { recursive: true });
const base = 'http://127.0.0.1:4101', dailyKey = `footle-daily-${FIXED_DAY}`;
const recordKeys = [RUN_KEY, dailyKey, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const heldFiles = ['src/pages/Footle.tsx', 'src/components/footle/FootleClueDesk.tsx', 'src/components/footle/FootleClueDesk.module.css', 'src/hooks/useGame.ts', 'src/lib/gameLogic.ts', 'src/lib/footlePracticeRun.ts'];
const held = new Map(); for (const file of heldFiles) held.set(file, await readFile(path.join(root, file)));
const rows = [], failures = [];
let browser, server;
try {
  const bundle = path.join(temp, 'reference.mjs');
  await build({ stdin: { contents: "export { compareGuess } from './src/lib/gameLogic'; export { getDailyTier } from './src/lib/dateUtils';", resolveDir: root, loader: 'ts' }, outfile: bundle, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' });
  const { compareGuess, getDailyTier } = await import(pathToFileURL(bundle).href);
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4101'], { stdio: 'pipe', windowsHide: true });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) { try { ready = (await fetch(base)).ok; } catch { /* Own server starting. */ } if (ready) break; await pause(250); }
  assert.ok(ready, 'Built app starts'); browser = await chromium.launch();
  for (const [width, height, touch, motion, theme] of [[320, 780, true, 'reduce', 'dark'], [390, 844, true, 'no-preference', 'light'], [430, 932, true, 'no-preference', 'dark'], [1440, 960, false, 'no-preference', 'light']]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, reducedMotion: motion, colorScheme: theme });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    const errors = [], writes = [], layouts = [], actions = [], checks = [];
    let changedPool = false;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base) return route.continue();
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, OPTIONS' };
      if (url.pathname === '/rest/v1/player_market_values' && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (url.pathname === '/rest/v1/player_market_values' && request.method() === 'GET') {
        const data = marketResponse(url, changedPool).map(row => row.player_name === 'Practice Fixture Famous 001' ? { ...row, player_name: 'Fixture Maximilian Alexander Longname', club: 'Fixture Athletic Association of the Northern Valley' } : row);
        return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(data) });
      }
      if (/\/(game_completions|user_game_scores|daily_completions|user_best_scores)$/.test(url.pathname) && request.method() !== 'GET') writes.push({ path: url.pathname, method: request.method() });
      return route.abort();
    });
    await page.addInitScript(({ fixed, theme }) => {
      const OriginalDate = Date;
      globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return new OriginalDate(fixed).getTime(); } };
      localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('dukb-theme', theme);
      window.__clueDeskStorage = [];
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__clueDeskStorage.push({ key, value }); return set.call(this, key, value); };
    }, { fixed: FIXED_TIME, theme });
    const run = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), RUN_KEY);
    const records = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), recordKeys);
    const settle = async () => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await pause(450); };
    const activate = async (locator, label, minimum = 44) => {
      await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox();
      assert.ok(box && box.height >= minimum && box.width >= 30, `${label}: usable native target`);
      const beforeY = await page.evaluate(() => scrollY);
      if (touch) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); }
      actions.push({ label, input: touch ? 'native tap' : 'native Enter after explicit focus setup', box });
      await settle(); return beforeY;
    };
    const guess = async name => {
      const input = page.getByRole('combobox', { name: 'Search for a player' }); await input.waitFor(); await input.scrollIntoViewIfNeeded();
      if (touch) await input.tap(); else await input.focus();
      await page.keyboard.press('Control+A'); await page.keyboard.type(name);
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const option = page.getByRole('option', { name: new RegExp(`^${escaped}`) }); await option.waitFor();
      if (touch) await option.tap(); else {
        const id = await option.getAttribute('id');
        const positions = await page.getByRole('option').evaluateAll((options, id) => ({ target: options.findIndex(node => node.id === id), current: options.findIndex(node => node.getAttribute('aria-selected') === 'true') }), id);
        assert.ok(positions.target >= 0 && positions.current >= 0);
        for (let step = 0; step < Math.abs(positions.target - positions.current); step++) await page.keyboard.press(positions.target > positions.current ? 'ArrowDown' : 'ArrowUp');
        assert.equal(await option.getAttribute('aria-selected'), 'true', 'Exact named player is the keyboard-selected option');
        await page.keyboard.press('Enter');
      }
      actions.push({ label: `guess:${name}`, input: touch ? 'native option tap' : 'native search Enter' }); await settle();
    };
    const visible = async (locator, label) => {
      const box = await locator.boundingBox(); layouts.push({ label, box });
      assert.ok(box && box.y >= -1 && box.y + box.height <= height + 1 && box.x >= -1 && box.x + box.width <= width + 1, `${label}: visible before any driver scroll or focus`);
    };
    const readDesk = () => page.locator('[data-footle-clue-desk]').evaluate(desk => ({
      player: desk.querySelector('h2').textContent, selected: Number(desk.getAttribute('data-clue-guess')),
      cards: [...desk.querySelectorAll('[data-clue]')].map(card => ({ key: card.getAttribute('data-clue'), status: card.getAttribute('data-status'), values: [...card.querySelectorAll('dd')].map(dd => dd.textContent.trim()) })),
    }));
    const compare = async (expected, label) => {
      const current = await readDesk(); assert.equal(current.player, expected.playerName, `${label}: correct guessed player`);
      const statuses = { correct: 'Exact match', close: 'Close', incorrect: 'Not a match', unknown: 'Not on file' };
      assert.deepEqual(current.cards, Object.entries(expected.cells).map(([key, cell]) => ({ key, status: cell.status, values: [cell.value, statuses[cell.status], ...(cell.arrow && cell.status !== 'unknown' ? [cell.arrow === 'up' ? '↑ Answer is higher' : '↓ Answer is lower'] : [])] })), `${label}: all eight actual values statuses and directions`);
      checks.push({ label, ...current }); return current;
    };
    const layout = async label => {
      const result = await page.evaluate(() => {
        const desk = document.querySelector('[data-footle-clue-desk]');
        const cards = [...document.querySelectorAll('[data-clue]')].map(card => {
          const rect = card.getBoundingClientRect(), value = card.querySelector('dd'), style = getComputedStyle(value);
          const range = document.createRange(); range.selectNodeContents(value);
          const textRects = [...range.getClientRects()].map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
          let shown = true;
          for (let node = card; node; node = node.parentElement) { const s = getComputedStyle(node); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) shown = false; }
          return { key: card.getAttribute('data-clue'), text: value.textContent, x: rect.x, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom, scrollWidth: card.scrollWidth, clientWidth: card.clientWidth, font: parseFloat(style.fontSize), shown, textRects };
        });
        const grid = desk?.querySelector('[data-clue-cards]'), style = grid && getComputedStyle(grid);
        return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, cards, animation: style && { duration: style.animationDuration, count: style.animationIterationCount, name: style.animationName } };
      });
      layouts.push({ label, ...result });
      assert.equal(result.pageWidth, width, `${label}: no horizontal page overflow`);
      assert.equal(result.cards.length, 8, `${label}: eight readable cards`);
      for (const card of result.cards) {
        assert.ok(card.shown && card.width > 50 && card.x >= -1 && card.right <= width + 1, `${label}: ${card.key} is painted inside viewport width`);
        assert.ok(card.scrollWidth <= card.clientWidth + 1 && card.font >= 14, `${label}: ${card.key} full value fits its card at readable size`);
        assert.ok(card.textRects.every(rect => rect.left >= card.x - 1 && rect.right <= card.right + 1 && rect.top >= card.top - 1 && rect.bottom <= card.bottom + 1), `${label}: ${card.key} text is not clipped`);
      }
      assert.ok(result.animation.count.split(',').every(value => value.trim() !== 'infinite'), `${label}: reveal motion is finite`);
      if (motion === 'reduce') assert.ok(result.animation.name === 'none' || result.animation.duration.split(',').every(value => parseFloat(value) === 0), `${label}: reduced motion is static`);
    };
    const screenshot = label => page.screenshot({ path: path.join(output, `${width}-${theme}-${label}.png`), animations: 'disabled' });
    try {
      await page.goto(base + '/footle');
      assert.equal(await page.locator('html').evaluate(node => node.classList.contains('light')), theme === 'light', 'Requested theme is actually applied');
      const help = page.getByRole('dialog', { name: 'How to Play Footle' }); await help.waitFor();
      assert.match(await help.textContent(), /Each guess opens eight cards/); assert.match(await help.textContent(), /hypothetical/);
      await screenshot('rules'); await activate(help.getByRole('button', { name: "Let's Play!" }), 'close initial rules');
      const dailyWrong = getDailyTier(FIXED_DAY) === 'insane' ? 'Practice Fixture Famous 002' : 'Practice Fixture Obscure 001';
      await guess(dailyWrong);
      const daily = JSON.parse((await records())[dailyKey]); assert.equal(daily.guesses.length, 1); assert.equal(daily.gameStatus, 'playing');
      await compare(daily.guesses[0], 'daily'); await layout('daily');
      await visible(page.locator('[data-footle-clue-desk] h2'), 'daily guess heading');
      await visible(page.getByRole('button', { name: /Back to search/ }), 'daily return action'); await screenshot('daily');
      if (width === 320) {
        const card = page.locator('[data-clue]').first(), original = await card.getAttribute('style');
        const before = await card.boundingBox(); let rejection;
        try {
          await card.evaluate((node, size) => { node.style.width = `${size}px`; }, width * 2);
          const changed = await card.boundingBox(); assert.ok(changed.width > before.width && changed.width >= width * 2, 'Geometry control changes the actual painted card width');
          try { await layout('oversized card control'); } catch (error) { rejection = { name: error.name, message: error.message }; }
          assert.equal(rejection?.name, 'AssertionError'); assert.match(rejection.message, /oversized card control: no horizontal page overflow/);
          checks.push({ label: 'effective native width control', before, changed, rejection });
        } finally { await card.evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, original); }
        assert.equal(await card.getAttribute('style'), original); await layout('restored after width control');
      }
      if (touch) await activate(page.getByRole('button', { name: /Back to search/ }), 'return to daily search');
      else {
        assert.ok(await page.locator('[data-footle-clue-desk] h2').evaluate(node => node === document.activeElement), 'New clue heading gets one-shot focus');
        await page.keyboard.press('Tab');
        assert.ok(await page.getByRole('button', { name: /Back to search/ }).evaluate(node => node === document.activeElement), 'One native Tab reaches Back to search');
        await page.keyboard.press('Enter'); await settle(); actions.push({ label: 'return to daily search', input: 'native Tab and Enter from actual new-clue focus' });
      }
      assert.ok(await page.getByRole('combobox').evaluate(node => node === document.activeElement)); await visible(page.getByRole('combobox'), 'returned daily search');
      const dailyRecords = await records(); delete dailyRecords[RUN_KEY];
      await activate(page.locator('[data-footle-mode="unlimited"]'), 'open Unlimited');
      await guess('Practice Fixture Obscure 002'); const unlimited = await readDesk(); await layout('unlimited'); await screenshot('unlimited');
      await activate(page.getByRole('button', { name: 'Five-puzzle run', exact: true }), 'open five-puzzle run');
      await activate(page.getByRole('button', { name: 'hard', exact: true }), 'choose hard answers with the long easy fixture available to guess');
      await activate(page.getByRole('button', { name: 'Start run', exact: true }), 'start run');
      const initial = await run(), target = initial.pool.find(player => player.name === initial.targets[0]);
      assert.equal(await page.getByRole('button', { name: /^Review puzzle/ }).count(), 0, 'No historical or future answers before completion');
      const long = [...initial.pool].filter(player => player.name !== target.name).sort((a, b) => (b.name.length + b.club.length) - (a.name.length + a.club.length))[0];
      assert.match(long.name, /Longname/); assert.match(long.club, /Northern Valley/);
      await guess(long.name); await compare(compareGuess(long, target), 'longest fixture guess'); await layout('longest fixture guess');
      await visible(page.locator('[data-footle-clue-desk] h2'), 'long guess heading'); await visible(page.getByRole('button', { name: /Back to search/ }), 'long guess return'); await screenshot('long-name-club');
      const second = initial.pool.find(player => player.name !== target.name && player.name !== long.name);
      await guess(second.name); await compare(compareGuess(second, target), 'second practice guess');
      const history = page.getByRole('button', { name: `View guess 1: ${long.name}`, exact: true });
      const y = await activate(history, 'review first revealed guess');
      await compare(compareGuess(long, target), 'first revealed history');
      assert.equal(await page.evaluate(() => scrollY), y, 'Reading history does not move the page');
      await screenshot('history'); await activate(page.getByRole('button', { name: /Back to search/ }), 'back from history'); await visible(page.getByRole('combobox'), 'history search continuation');
      await guess(initial.targets[0]);
      for (let index = 1; index < 5; index++) {
        await activate(page.getByRole('button', { name: 'Next puzzle', exact: true }), `next puzzle ${index + 1}`);
        if (index === 1) {
          const wrong = initial.pool.filter(player => player.name !== initial.targets[index]).slice(0, 8);
          for (const player of wrong) await guess(player.name);
        } else if (index === 3) {
          await activate(page.getByRole('button', { name: 'Give up', exact: true }), 'give up without guesses');
          await activate(page.getByRole('button', { name: 'Yes, reveal it', exact: true }), 'confirm give up');
        } else await guess(initial.targets[index]);
      }
      const finished = await run(); assert.deepEqual(finished.rounds.map(round => round.status), ['won', 'lost', 'won', 'lost', 'won']);
      const receipt = page.locator('[data-footle-practice-result]'); await receipt.waitFor();
      await visible(receipt.getByRole('heading', { name: 'Run complete' }), 'completed receipt'); await screenshot('complete');
      const bytes = (await records())[RUN_KEY]; changedPool = true; await page.reload(); await receipt.waitFor(); await settle();
      const beforeReview = await records(); assert.equal(beforeReview[RUN_KEY], bytes);
      await page.evaluate(() => { window.__clueDeskStorage = []; });
      for (const index of [1, 0, 2, 3, 4]) {
        await activate(page.getByRole('button', { name: `Review puzzle ${index + 1}`, exact: true }), `review completed puzzle ${index + 1}`);
        const review = page.locator('[data-footle-review]'); assert.equal(await review.getAttribute('data-footle-review'), String(index + 1));
        await visible(review.getByRole('button', { name: 'Back to run results' }), `review ${index + 1} return`);
        if (finished.rounds[index].guesses.length) {
          const name = finished.rounds[index].guesses.at(-1), answer = initial.pool.find(player => player.name === initial.targets[index]);
          await compare(compareGuess(initial.pool.find(player => player.name === name), answer), `round ${index + 1} frozen latest`); await layout(`round ${index + 1} review`);
          if (index === 1) {
            const first = finished.rounds[index].guesses[0];
            await activate(page.getByRole('button', { name: `View guess 1: ${first}`, exact: true }), 'review first of eight missed guesses');
            await compare(compareGuess(initial.pool.find(player => player.name === first), answer), 'missed round first guess'); await screenshot('missed-review');
          }
          if (index === 0) await screenshot('solved-review');
        } else {
          assert.equal(await review.locator('[data-clue]').count(), 0); assert.match(await review.textContent(), /No guesses were made for this puzzle/); await screenshot('zero-guess-review');
        }
        await activate(review.getByRole('button', { name: 'Back to run results' }), `return from puzzle ${index + 1}`);
        const opener = page.getByRole('button', { name: `Review puzzle ${index + 1}`, exact: true });
        assert.ok(await opener.evaluate(node => node === document.activeElement)); await visible(opener, 'review opener restored');
      }
      await activate(page.getByRole('button', { name: 'Review puzzle 2', exact: true }), 'reopen missed puzzle');
      const previous = await readDesk(); await activate(page.getByRole('button', { name: 'How to play', exact: true }), 'reopen clue rules', 30);
      await help.waitFor(); await activate(help.getByRole('button', { name: "Let's Play!" }), 'close clue rules');
      assert.ok(await page.getByRole('button', { name: 'How to play', exact: true }).evaluate(node => node === document.activeElement));
      assert.deepEqual(await readDesk(), previous); assert.deepEqual(await records(), beforeReview, 'Review and rules retain every run/daily/completion byte');
      const savedWrites = await page.evaluate(keys => window.__clueDeskStorage.filter(row => keys.includes(row.key)), recordKeys);
      assert.deepEqual(savedWrites, [], 'Review attempts no saved run or record writes');
      await activate(page.locator('[data-footle-mode="daily"]'), 'return to held daily');
      await compare(daily.guesses[0], 'daily after finished review');
      const afterDaily = await records(); delete afterDaily[RUN_KEY]; assert.deepEqual(afterDaily, dailyRecords);
      await activate(page.locator('[data-footle-mode="unlimited"]'), 'fresh Unlimited after reload');
      assert.equal(await page.locator('[data-footle-review]').count(), 0); assert.equal(await page.locator('[data-clue]').count(), 0, 'Unlimited remount starts without review cards');
      await activate(page.locator('[data-footle-mode="practice"]'), 'return to completed run');
      assert.equal(await page.locator('[data-footle-review]').count(), 0, 'Mode return closes old local review');
      await activate(page.getByRole('button', { name: 'Play another five', exact: true }), 'start another run');
      assert.equal((await run()).index, 0); assert.equal(await page.getByRole('button', { name: /^Review puzzle/ }).count(), 0);
      assert.equal(await page.locator('[data-clue]').count(), 0, 'New run has no stale revealed clues');
      assert.deepEqual(errors, []); assert.deepEqual(writes, []);
      rows.push({ width, height, motion, theme, checks, layouts, actions, priorUnlimited: unlimited, reviewWrites: savedWrites, scoreWrites: writes, errors });
      console.log(`Footle clue desk ${width}px ${theme}: actual eight-clue comparisons, five frozen reviews, no saved writes, native navigation and readable card bounds passed.`);
    } catch (error) {
      failures.push({ width, theme, message: error.message, stack: error.stack, checks, layouts, actions, errors, writes });
      await screenshot('failure').catch(() => {}); console.error(`${width}px: ${error.message}`);
    } finally { await context.close(); }
  }
  await writeFile(path.join(output, 'summary.json'), JSON.stringify({ rows, failures, scope: 'Actual built Footle with fictional frozen network responses, four viewports, real touch/keyboard inputs. Existing comparison engine supplies expected clues. No production data calls, score writes or live data audit.' }, null, 2));
  assert.equal(rows.length, 4); assert.deepEqual(failures, []);
} finally {
  await browser?.close(); server?.kill();
  assert.equal(path.dirname(temp), parent); assert.ok(path.basename(temp).startsWith('footle-clue-desk-native-'));
  await rm(temp, { recursive: true, force: true });
  for (const [file, bytes] of held) assert.deepEqual(await readFile(path.join(root, file)), bytes, `${file}: source bytes held`);
}
