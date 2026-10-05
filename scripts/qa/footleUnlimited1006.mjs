/* Built Footle with fictional frozen responses and real touch, mouse and keyboard input. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { FIXED_TIME, FIXED_DAY, RUN_KEY, marketResponse } from './footle995-fixtures.mjs';

const root = process.cwd(), output = path.join(root, 'footle-unlimited-artifacts/native');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const temp = await mkdtemp(path.join(parent, 'footle-unlimited-native-')); await mkdir(output, { recursive: true });
const base = 'http://127.0.0.1:4106', key = 'footle-unlimited-session-v1', dailyKey = `footle-daily-${FIXED_DAY}`;
const protectedKeys = [dailyKey, RUN_KEY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const longName = 'Fixture Maximilian Alexander Longname';
const heldFiles = ['src/pages/Footle.tsx', 'src/hooks/useGame.ts', 'src/lib/footleUnlimitedSession.ts', 'src/lib/footlePracticeRun.ts', 'src/components/footle/FootleClueDesk.tsx'];
const held = new Map(); for (const file of heldFiles) held.set(file, await readFile(path.join(root, file)));
const reports = [], failures = [];
let browser, server;
try {
  const bundle = path.join(temp, 'reference.mjs');
  await build({ stdin: { contents: "export { compareGuess } from './src/lib/gameLogic'; export { getDailyTier } from './src/lib/dateUtils'; export { normalizeName } from './src/lib/playerSearch'; export { createPracticeRun } from './src/lib/footlePracticeRun';", resolveDir: root, loader: 'ts' }, outfile: bundle, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    plugins: [{ name: 'offline-reference-client', setup(builder) {
      builder.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'supabase-client', namespace: 'offline-reference' }));
      builder.onLoad({ filter: /.*/, namespace: 'offline-reference' }, () => ({ loader: 'js', contents: [
        "const offline = () => { throw new Error('Footle native reference must stay offline'); };",
        'export const supabase = new Proxy({}, { get: offline });',
        "export const SUPABASE_URL = 'http://offline.invalid';",
        "export const SUPABASE_PUBLISHABLE_KEY = 'offline';",
      ].join('\n') }));
    } }],
  });
  const { compareGuess, getDailyTier, normalizeName, createPracticeRun } = await import(pathToFileURL(bundle).href);
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4106'], { stdio: 'pipe', windowsHide: true });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) { try { ready = (await fetch(base)).ok; } catch { /* Own server starting. */ } if (ready) break; await pause(250); }
  assert.ok(ready, 'Built app starts'); browser = await chromium.launch();
  for (const [width, height, inputMode, motion, theme] of [[320, 780, 'touch', 'reduce', 'dark'], [390, 844, 'touch', 'no-preference', 'light'], [1280, 720, 'mouse', 'no-preference', 'dark'], [1280, 720, 'keyboard', 'reduce', 'light']]) {
    const profile = `${width}-${theme}-${inputMode}`;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: inputMode === 'touch', isMobile: inputMode === 'touch', deviceScaleFactor: 1, reducedMotion: motion, colorScheme: theme });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    const errors = [], networkWrites = [], protectedWrites = [], actions = [], geometry = [], controls = [];
    let changedPool = false;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base) return route.continue();
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, OPTIONS' };
      if (url.pathname === '/rest/v1/player_market_values' && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (url.pathname === '/rest/v1/player_market_values' && request.method() === 'GET') {
        const data = marketResponse(url, changedPool).map(row => row.player_name === 'Practice Fixture Famous 001'
          ? { ...row, player_name: longName, club: 'Fixture Athletic Association of the Northern Valley' } : row);
        return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(data) });
      }
      if (/\/(game_completions|user_game_scores|daily_completions|user_best_scores)$/.test(url.pathname) && request.method() !== 'GET') networkWrites.push({ path: url.pathname, method: request.method() });
      return route.abort();
    });
    await page.addInitScript(({ fixed, theme }) => {
      const OriginalDate = Date;
      globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return new OriginalDate(fixed).getTime(); } };
      localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('dukb-theme', theme); localStorage.setItem('footle-rules-seen', '1');
      window.__footle1006Writes = [];
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__footle1006Writes.push({ key, value }); return set.call(this, key, value); };
    }, { fixed: FIXED_TIME, theme });
    const session = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const rawSession = () => page.evaluate(key => localStorage.getItem(key), key);
    const records = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), protectedKeys);
    const collectWrites = async () => {
      protectedWrites.push(...await page.evaluate(keys => window.__footle1006Writes.filter(write => keys.includes(write.key)), protectedKeys));
      await page.evaluate(() => { window.__footle1006Writes = []; });
    };
    const settle = async () => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await pause(450); };
    const activate = async (locator, label) => {
      await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44, `${label}: 44px native target`);
      if (inputMode === 'touch') await locator.tap();
      else if (inputMode === 'mouse') await locator.click();
      else { await locator.focus(); await page.keyboard.press('Enter'); }
      actions.push({ label, inputMode, box }); await settle();
    };
    const visible = async (locator, label) => {
      const box = await locator.boundingBox(); geometry.push({ label, box });
      assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1 && box.y >= -1 && box.y + box.height <= height + 1, `${label}: visible without driver scroll after action`);
    };
    const layout = async label => {
      const result = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('[data-unlimited-progress], [data-unlimited-result] > p, [data-footle-clue-desk] h2')];
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, names: nodes.filter(node => node.getClientRects().length).map(node => {
          const box = node.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
          const rects = [...range.getClientRects()];
          return { text: node.textContent, left: box.left, right: box.right, fits: rects.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1) };
        }) };
      });
      geometry.push({ label, ...result });
      assert.ok(result.scrollWidth <= result.width + 1, `${label}: no horizontal page overflow`);
      assert.ok(result.names.every(name => name.left >= -1 && name.right <= width + 1 && name.fits), `${label}: full names fit their painted boxes`);
    };
    const guess = async name => {
      const before = await rawSession();
      const input = page.getByRole('combobox', { name: 'Search for a player' }); await input.scrollIntoViewIfNeeded();
      if (inputMode === 'touch') await input.tap(); else if (inputMode === 'mouse') await input.click(); else await input.focus();
      await page.keyboard.press('Control+A'); await page.keyboard.type(name);
      const options = page.getByRole('option');
      await options.first().waitFor();
      const index = await options.evaluateAll((nodes, name) => nodes.findIndex(node => node.firstElementChild?.textContent === name), name);
      assert.ok(index >= 0, 'The exact named player is an actual option');
      assert.equal(await rawSession(), before, 'Typing never submits a guess');
      const option = options.nth(index), box = await option.boundingBox();
      assert.ok(box && box.height >= 44 && box.width >= 44, 'Player option has a 44px target');
      if (inputMode === 'touch') await option.tap(); else if (inputMode === 'mouse') await option.click(); else {
        const current = await options.evaluateAll(nodes => nodes.findIndex(node => node.getAttribute('aria-selected') === 'true'));
        for (let step = 0; step < Math.abs(index - current); step++) await page.keyboard.press(index > current ? 'ArrowDown' : 'ArrowUp');
        assert.equal(await option.getAttribute('aria-selected'), 'true'); await page.keyboard.press('Enter');
      }
      actions.push({ label: `guess:${name}`, inputMode, box }); await settle();
    };
    const desk = () => page.locator('[data-footle-clue-desk]').evaluate(node => ({ name: node.querySelector('h2').textContent, cards: [...node.querySelectorAll('[data-clue]')].map(card => ({ key: card.getAttribute('data-clue'), status: card.getAttribute('data-status'), values: [...card.querySelectorAll('dd')].map(value => value.textContent) })) }));
    const resultVisible = async label => { await visible(page.locator('[data-unlimited-progress]'), `${label} counter`); await visible(page.locator('[data-unlimited-result]'), `${label} result and next action`); await layout(label); };
    const giveUp = async label => { await activate(page.getByRole('button', { name: 'Give up', exact: true }), `${label}: give up`); await activate(page.getByRole('button', { name: 'Yes, reveal it', exact: true }), `${label}: confirm reveal`); };
    try {
      await page.goto(`${base}/footle`, { waitUntil: 'domcontentloaded' }); await page.getByRole('combobox').waitFor();
      const dailyWrong = getDailyTier(FIXED_DAY) === 'insane' ? longName : 'Practice Fixture Obscure 002';
      await guess(dailyWrong);
      const dailyName = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).puzzleId, dailyKey);
      assert.notEqual(dailyName, dailyWrong);
      await activate(page.locator('[data-footle-mode="unlimited"]'), 'open Unlimited');
      await activate(page.getByRole('button', { name: 'insane', exact: true }), 'choose insane answers');
      await page.locator('[data-unlimited-state="playing"]').waitFor();
      const initial = await session(), deck = initial.decks.insane;
      const protectedRun = createPracticeRun(deck.pool, 'easy', dailyName, () => 0); assert.ok(protectedRun); protectedRun.active = false;
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: RUN_KEY, raw: JSON.stringify(protectedRun) });
      const heldRecords = await records(); await page.evaluate(() => { window.__footle1006Writes = []; });
      await activate(page.getByRole('button', { name: 'How to play', exact: true }), 'reopen worked rules');
      const help = page.getByRole('dialog'); assert.match(await help.innerText(), /Your Unlimited session/); assert.match(await help.innerText(), /Next puzzle gives you a different answer/);
      await activate(help.getByRole('button', { name: "Let's Play!", exact: true }), 'close worked rules');
      await guess(longName);
      const target = deck.pool.find(player => player.name === deck.current.target), wrong = deck.pool.find(player => player.name === longName);
      const expected = compareGuess(wrong, target), states = { correct: 'Exact match', close: 'Close', incorrect: 'Not a match', unknown: 'Not on file' };
      const expectedCards = Object.entries(expected.cells).map(([key, cell]) => ({ key, status: cell.status, values: [cell.value, states[cell.status], ...(cell.arrow && cell.status !== 'unknown' ? [`${cell.arrow === 'up' ? '↑ Answer is higher' : '↓ Answer is lower'}`] : [])] }));
      assert.deepEqual((await desk()).cards, expectedCards); await layout('long name clue');
      await page.screenshot({ path: path.join(output, `${profile}-clues.png`), animations: 'disabled' });
      const unfinished = await rawSession(), clues = await desk(); await collectWrites(); changedPool = true;
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-footle-clue-desk] h2').waitFor(); await settle();
      assert.equal(await rawSession(), unfinished, 'Reload preserves every unfinished session byte'); assert.deepEqual(await desk(), clues, 'Reload preserves all eight frozen clue values and states');
      assert.deepEqual(await records(), heldRecords);
      await activate(page.getByRole('button', { name: 'easy', exact: true }), 'switch to easy');
      await guess('Practice Fixture Obscure 002'); const easy = (await session()).decks.easy;
      await activate(page.getByRole('button', { name: 'insane', exact: true }), 'return to saved insane puzzle');
      assert.deepEqual((await session()).decks.insane, JSON.parse(unfinished).decks.insane);
      assert.deepEqual(await desk(), clues); assert.deepEqual((await session()).decks.easy, easy);
      const expectedNames = deck.pool.filter(player => player.difficulty === 'insane' && normalizeName(player.name) !== normalizeName(dailyName)).map(player => player.name);
      const seen = [];
      for (let index = 0; index < expectedNames.length; index++) {
        const current = (await session()).decks.insane.current;
        assert.ok(expectedNames.includes(current.target)); assert.ok(!seen.includes(current.target), 'Every next answer is fresh'); seen.push(current.target);
        await giveUp(`puzzle ${index + 1}`); await resultVisible(`puzzle ${index + 1}`);
        assert.match(await page.locator('[data-unlimited-progress]').innerText(), new RegExp(`^Puzzle ${index + 1}$`));
        assert.ok((await page.locator('[data-unlimited-result]').innerText()).includes(current.target));
        if (index === 0) {
          await page.screenshot({ path: path.join(output, `${profile}-result.png`), animations: 'disabled' });
          if (width === 320) {
            const panel = page.locator('[data-footle-unlimited]'), before = await panel.boundingBox(), style = await panel.getAttribute('style');
            let rejection;
            try { await panel.evaluate(node => { node.style.width = '760px'; node.style.maxWidth = 'none'; }); const changed = await panel.boundingBox(); assert.ok(changed.width > before.width); try { await layout('oversized panel control'); } catch (error) { rejection = error.message; } assert.match(rejection ?? '', /oversized panel control: no horizontal page overflow/); controls.push({ label: 'width', before, changed, rejection }); }
            finally { await panel.evaluate((node, value) => value === null ? node.removeAttribute('style') : node.setAttribute('style', value), style); }
            await layout('restored width control');
            const action = page.locator('[data-unlimited-next]'), prior = await action.boundingBox(), original = await action.getAttribute('style'); rejection = undefined;
            try { await action.evaluate(node => { node.style.transform = `translateY(${innerHeight}px)`; }); const changed = await action.boundingBox(); assert.ok(changed.y > prior.y + height - 1); try { await visible(action, 'shifted action control'); } catch (error) { rejection = error.message; } assert.match(rejection ?? '', /shifted action control: visible without driver scroll after action/); controls.push({ label: 'vertical action', prior, changed, rejection }); }
            finally { await action.evaluate((node, value) => value === null ? node.removeAttribute('style') : node.setAttribute('style', value), original); }
            await resultVisible('restored vertical control');
          }
        }
        if (index < expectedNames.length - 1) {
          assert.equal(await page.getByRole('button', { name: 'Reshuffle deck', exact: true }).count(), 0);
          await activate(page.getByRole('button', { name: 'Next puzzle', exact: true }), 'next fresh puzzle');
          await visible(page.locator('[data-unlimited-progress]'), 'new puzzle counter');
          assert.deepEqual((await session()).decks.insane.current.guesses, []);
        }
      }
      assert.deepEqual([...seen].sort(), [...expectedNames].sort());
      assert.equal(await page.locator('[data-unlimited-state="exhausted"]').count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Next puzzle', exact: true }).count(), 0);
      const exhausted = await rawSession(); await collectWrites();
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-unlimited-state="exhausted"]').waitFor(); await settle();
      assert.equal(await rawSession(), exhausted, 'Exhaustion never reshuffles itself on reload'); await resultVisible('exhausted reload');
      await page.screenshot({ path: path.join(output, `${profile}-exhausted.png`), animations: 'disabled' });
      await activate(page.getByRole('button', { name: 'Reshuffle deck', exact: true }), 'explicit reshuffle');
      const reshuffled = (await session()).decks.insane;
      assert.equal(reshuffled.seen.length, 1); assert.equal(reshuffled.current.status, 'playing'); assert.deepEqual(reshuffled.current.guesses, []);
      assert.notEqual(normalizeName(reshuffled.current.target), normalizeName(dailyName));
      assert.deepEqual(await records(), heldRecords); await collectWrites();
      assert.deepEqual(protectedWrites, [], 'Unlimited causes no Daily, five-run, completion, streak or diary writes'); assert.deepEqual(networkWrites, []); assert.deepEqual(errors, []);
      reports.push({ profile, width, height, inputMode, motion, theme, completed: true, answers: seen, actions, geometry, controls, protectedWrites, networkWrites, errors });
    } catch (error) {
      failures.push({ profile, error: error.stack ?? String(error) });
      await page.screenshot({ path: path.join(output, `${profile}-failure.png`), animations: 'disabled' }).catch(() => {});
      reports.push({ profile, completed: false, actions, geometry, controls, protectedWrites, networkWrites, errors });
    } finally { await context.close(); }
  }
} finally {
  await browser?.close(); server?.kill();
  for (const [file, bytes] of held) assert.deepEqual(await readFile(path.join(root, file)), bytes, `${file} remained unchanged`);
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ reports, failures }, null, 2));
  await rm(temp, { recursive: true, force: true });
}
assert.deepEqual(failures, [], 'Every native Unlimited profile completed');
assert.equal(reports.length, 4); assert.ok(reports.every(report => report.completed));
console.log(`Footle Unlimited native: ${reports.length} profiles passed, frozen reloads, fresh decks, two effective geometry controls, zero protected writes.`);
