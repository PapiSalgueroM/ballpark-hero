/* Round999 native verification. The built page is real; every external request
   is fulfilled locally. Numeric rankings and slot counts are checked independently. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'rank-em-circuit-artifacts/native');
const DATE = '2026-10-03', DAILY = 'rank-em-daily-' + DATE, SAVE = 'rank-em-legends-circuit-v1';
const protectedKeys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const eligible = ['nba-pts', 'nba-reb', 'nba-blk', 'nba-gp', 'nhl-pts', 'nhl-ast', 'nhl-gp', 'mlb-hr', 'mlb-sb-circuit'];
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build the app before native verification');
// Read the canonical literals and date selection, never the circuit or scoring helpers.
const referenceFile = path.join(OUT, 'reference.mjs');
await build({ stdin: { contents: `import { RANK_ROUNDS } from './src/lib/orderTheList';
import { dailyIndex } from './src/lib/dateUtils';
export const rounds = RANK_ROUNDS;
export const dailyId = RANK_ROUNDS[dailyIndex('${DATE}', RANK_ROUNDS.length)].id;`, resolveDir: ROOT, loader: 'ts' },
outfile: referenceFile, bundle: true, platform: 'node', format: 'esm', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const { rounds: sourceRounds, dailyId } = await import(pathToFileURL(referenceFile).href);
// The circuit-only replacement uses the five two-source-verified records in the round audit.
// Keeping this expectation independent also catches an accidental legacy Cobb total or name.
const rounds = [...sourceRounds, { id: 'mlb-sb-circuit', sport: 'MLB', statLabel: 'career stolen bases', unit: 'SB', items: [
  { name: 'Rickey Henderson', value: 1406 }, { name: 'Lou Brock', value: 938 },
  { name: 'Tim Raines', value: 808 }, { name: 'Vince Coleman', value: 752 }, { name: 'Kenny Lofton', value: 622 },
] }];
const ranked = round => [...round.items].sort((a, b) => b.value - a.value);
const exactSlots = (round, order) => ranked(round).filter((item, index) => item.name === order[index]).length;
const dailyRound = rounds.find(round => round.id === dailyId);
assert(dailyRound, 'Frozen daily resolves to canonical data');
const dailyOrder = ranked(dailyRound).map(item => item.name);
[dailyOrder[3], dailyOrder[4]] = [dailyOrder[4], dailyOrder[3]];
assert.equal(exactSlots(dailyRound, dailyOrder), 3);
const dailyBytes = JSON.stringify({ v: 1, date: DATE, puzzleIndex: 0, guesses: [{ order: dailyOrder }], gameStatus: 'lost' });
const report = { started: new Date().toISOString(), dailyId, reference: 'Canonical literals plus verified circuit-only replacement, sorted numerically; no circuit/scoring helper imported', cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
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
async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(650);
}
async function activate(control, touch) {
  const box = await control.boundingBox();
  assert(box && box.width >= 43 && box.height >= 43, 'Native action has a 44px target');
  if (touch) await control.tap();
  else { await control.focus(); await control.press('Enter'); }
}
async function visible(control, page, stage) {
  const box = await control.boundingBox(), height = await page.evaluate(() => innerHeight);
  assert(box && box.y >= -1 && box.y + box.height <= height + 1, stage + ': complete context is visible without driver scrolling');
  return { stage, box };
}
async function layout(page, panel, stage) {
  const sizes = await panel.evaluate(el => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    elements: [el, ...el.querySelectorAll('[data-rank-name], [data-rank-player], [data-circuit-result], [data-circuit-reveal], [data-circuit-reveal] li, [data-circuit-reveal] li span, button, p')].map(node => {
      const box = node.getBoundingClientRect(), css = getComputedStyle(node);
      return { text: node.textContent?.trim().slice(0, 100), left: box.left, right: box.right, width: box.width,
        client: node.clientWidth, scroll: node.scrollWidth, ellipsis: css.textOverflow === 'ellipsis' };
    }).filter(row => row.width),
  }));
  assert(sizes.document <= sizes.viewport + 2, stage + ': no page overflow');
  for (const row of sizes.elements) assert(row.left >= -1 && row.right <= sizes.viewport + 1 && row.scroll <= row.client + 2 && !row.ellipsis,
    stage + ': full names and text fit their cards ' + JSON.stringify(row));
  return { stage, ...sizes };
}
async function scrollVisibilityControl(control, page, stage) {
  const baseline = await visible(control, page, stage);
  const before = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  let changed, rejection;
  try {
    await page.evaluate(y => scrollTo({ left: scrollX, top: y, behavior: 'instant' }), before.y + baseline.box.y + baseline.box.height + 4);
    changed = { scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })), box: await control.boundingBox() };
    assert(changed.scroll.y > before.y + 1 && changed.box.y < baseline.box.y - 1, stage + ': control changes actual scroll and target geometry');
    try { await visible(control, page, stage); }
    catch (error) {
      assert(error instanceof assert.AssertionError && error.message === stage + ': complete context is visible without driver scrolling', stage + ': only the intended visibility assertion earns control credit');
      rejection = error.message;
    }
    assert(rejection, stage + ': misplaced context must be rejected');
  } finally {
    await page.evaluate(position => scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), before);
  }
  const restored = await visible(control, page, stage);
  assert.deepEqual(await page.evaluate(() => ({ x: scrollX, y: scrollY })), before, stage + ': original scroll is restored');
  return { kind: 'scroll visibility', stage, baseline, before, changed, rejection, restored };
}
async function widthOverflowControl(row, page, panel, stage) {
  const baseline = await layout(page, panel, stage), style = await row.getAttribute('style'), originalBox = await row.boundingBox();
  const before = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  let changed, rejection;
  try {
    await row.evaluate(el => {
      el.style.width = `${innerWidth * 2}px`;
      el.style.minWidth = `${innerWidth * 2}px`;
      el.style.maxWidth = 'none';
    });
    changed = { style: await row.getAttribute('style'), box: await row.boundingBox() };
    assert(changed.style !== style && changed.box.width > originalBox.width + 1 && changed.box.x + changed.box.width > baseline.viewport + 1, stage + ': control changes row style and width');
    try { await layout(page, panel, stage); }
    catch (error) {
      assert(error instanceof assert.AssertionError && (error.message === stage + ': no page overflow'
        || error.message.startsWith(stage + ': full names and text fit their cards ')), stage + ': only the intended overflow assertion earns control credit');
      rejection = error.message;
    }
    assert(rejection, stage + ': oversized result row must be rejected');
  } finally {
    await row.evaluate((el, previous) => previous === null ? el.removeAttribute('style') : el.setAttribute('style', previous), style);
    await page.evaluate(position => scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), before);
  }
  assert.equal(await row.getAttribute('style'), style, stage + ': original inline style is restored');
  const restored = await layout(page, panel, stage);
  assert.deepEqual(await row.boundingBox(), originalBox, stage + ': original row geometry is restored');
  return { kind: 'width overflow', stage, baseline, originalBox, changed, rejection, restored };
}
const protectedState = page => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), protectedKeys);

try {
  await ready;
  browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, light: false, restores: false },
    { width: 390, height: 844, touch: true, reduced: false, light: false, restores: true },
    { width: 1440, height: 1000, touch: false, reduced: false, light: false, restores: false },
    { width: 1440, height: 1000, touch: false, reduced: false, light: true, restores: false },
  ]) {
    const { width, height, touch, reduced, light, restores } = profile;
    const id = `${width}-${light ? 'light' : 'dark'}-${touch ? 'touch' : 'keyboard'}${reduced ? '-reduced' : ''}`;
    const result = { id, ...profile, rounds: [], reviews: [], restores: [], screenshots: [], layouts: [], visibility: [], controls: [],
      pageErrors: [], consoleErrors: [], assetFailures: [], interceptedRequests: [], scoreWrites: [], protectedWrites: [] };
    report.cases.push(result);
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1, locale: 'en-US',
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: DAILY, value: dailyBytes },
        { name: 'rules-gate-seen:/rank-em', value: '1' },
        ...(light ? [{ name: 'dukb-theme', value: 'light' }] : []),
      ] }] },
    });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      result.interceptedRequests.push({ method: request.method(), path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        && /\/(game_completions|user_game_scores|daily_completions|user_best_scores|user_scores|record_auth_completion)$/.test(url.pathname)) {
        result.scoreWrites.push(request.method() + ' ' + url.pathname);
      }
      const type = request.resourceType();
      return route.fulfill({ status: 200,
        contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json',
        body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.addInitScript(({ date, keys }) => {
      const OriginalDate = Date, now = new OriginalDate(date + 'T16:00:00Z').getTime();
      window.Date = class extends OriginalDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
      };
      window.__rankCircuitWrites = [];
      for (const method of ['setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && (keys.includes(key) || key.startsWith('rank-em-daily-'))) {
            window.__rankCircuitWrites.push({ method, key });
          }
          return original.call(this, key, ...args);
        };
      }
    }, { date: DATE, keys: protectedKeys });
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => {
      if (request.url().startsWith(BASE)) result.assetFailures.push(request.url() + ': ' + request.failure()?.errorText);
    });
    page.on('response', response => {
      if (response.url().startsWith(BASE) && response.status() >= 400) result.assetFailures.push(response.url() + ': ' + response.status());
    });
    const panel = page.locator('[data-rank-circuit]');
    const button = name => page.getByRole('button', { name, exact: true });
    const phase = value => page.waitForFunction(expected => document.querySelector('[data-rank-circuit]')?.getAttribute('data-circuit-phase') === expected, value);
    const saveBytes = () => page.evaluate(key => localStorage.getItem(key), SAVE);
    const shot = async stage => {
      await settled(page);
      const file = `${id}-${stage}.png`;
      await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
      result.screenshots.push(file);
    };
    const isolate = async before => {
      assert.deepEqual(await protectedState(page), before, 'Daily and completion records retain their exact bytes');
      result.protectedWrites.push(...await page.evaluate(() => {
        const writes = window.__rankCircuitWrites; window.__rankCircuitWrites = []; return writes;
      }));
      assert.deepEqual(result.protectedWrites, [], 'Circuit never transiently writes protected records');
      assert.deepEqual(result.scoreWrites, [], 'Circuit never attempts completion or score writes');
    };
    const restore = async (stage, expectedPhase, before) => {
      const bytes = await saveBytes(); assert(bytes, stage + ': actual UI persisted a circuit');
      await isolate(before);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await button('Legends circuit').waitFor();
      if (!await panel.isVisible()) await activate(button('Legends circuit'), touch);
      await phase(expectedPhase); await settled(page);
      assert.equal(await saveBytes(), bytes, stage + ': reload preserves the actual circuit bytes');
      await isolate(before);
      result.restores.push({ stage, phase: expectedPhase, state: JSON.parse(bytes) });
    };
    const readDraft = () => panel.locator('[data-rank-name]').allTextContents();
    const referenceRound = async () => {
      const roundId = await panel.getAttribute('data-circuit-round');
      const round = rounds.find(item => item.id === roundId);
      assert(round && eligible.includes(roundId), 'Circuit uses an approved completed-career board');
      assert(roundId !== dailyId && !(dailyId === 'mlb-sb' && roundId === 'mlb-sb-circuit'), 'Circuit excludes the current Daily board family');
      assert.equal(await panel.getAttribute('data-circuit-sport'), round.sport);
      assert.equal(new Set(round.items.map(item => item.value)).size, 5, 'Canonical values give an unambiguous ranking');
      return round;
    };
    const checkReveal = async (round, order, nextLabel, stage) => {
      await settled(page);
      const reveal = panel.locator('[data-circuit-reveal]');
      const expected = ranked(round), expectedScore = exactSlots(round, order);
      assert.equal(await reveal.getByRole('heading', { level: 2 }).innerText(), `${expectedScore} / 5 exact places`);
      const actual = await reveal.locator('li').evaluateAll(items => items.map(row => ({
        rank: row.children[0].textContent.trim(), name: row.children[1].children[0].textContent.trim(),
        position: row.children[1].children[1].textContent.trim(), value: row.children[2].childNodes[0].textContent.trim(),
        unit: row.children[2].children[0].textContent.trim(),
      })));
      assert.deepEqual(actual, expected.map((item, index) => ({ rank: String(index + 1), name: item.name,
        position: `Your #${order.indexOf(item.name) + 1}${order[index] === item.name ? ', correct' : ''}`,
        value: item.value.toLocaleString('en-US'), unit: round.unit })), 'Reveal shows every actual name, value, unit and submitted position');
      result.visibility.push(await visible(reveal, page, stage + ' complete reveal'));
      result.visibility.push(await visible(button(nextLabel), page, stage + ' next action'));
      result.layouts.push(await layout(page, panel, stage));
      return { id: round.id, sport: round.sport, order, expectedScore, actual };
    };
    try {
      await page.goto(BASE + '/rank-em', { waitUntil: 'domcontentloaded' });
      await page.getByRole('region', { name: 'Rank result', exact: true }).getByText('3 / 5 correct', { exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const before = await protectedState(page);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), DAILY), dailyBytes);
      await isolate(before);
      await activate(button('Legends circuit'), touch); await phase('intro'); await settled(page);
      const initial = JSON.parse(await saveBytes());
      assert.equal(initial.excludedDailyId, dailyId);
      assert.deepEqual(initial.roundIds.map(roundId => rounds.find(round => round.id === roundId)?.sport), ['NBA', 'NHL', 'MLB']);
      assert.equal(new Set(initial.roundIds).size, 3);
      assert(initial.roundIds.every(roundId => eligible.includes(roundId) && roundId !== dailyId));
      result.visibility.push(await visible(panel.getByText('Worked example', { exact: true }).locator('..'), page, 'intro worked example'));
      result.visibility.push(await visible(button('Start circuit'), page, 'intro start'));
      result.layouts.push(await layout(page, panel, 'intro')); await shot('intro');
      if (width === 320) {
        const held = await saveBytes();
        result.controls.push(await scrollVisibilityControl(panel.getByText('Worked example', { exact: true }).locator('..'), page, 'intro worked example scroll control'));
        assert.equal(await saveBytes(), held, 'Intro geometry control preserves circuit bytes');
      }
      await activate(button('Start circuit'), touch); await phase('playing');
      const played = [];
      for (let index = 0; index < (light ? 1 : 3); index++) {
        const round = await referenceRound(), correct = ranked(round).map(item => item.name);
        assert.equal(round.sport, ['NBA', 'NHL', 'MLB'][index]);
        const order = index === 0 ? correct : index === 1 ? [...correct.slice(0, 3), correct[4], correct[3]] : [...correct.slice(1), correct[0]];
        assert.equal(exactSlots(round, order), [5, 3, 0][index]);
        // Board one starts swapped, then uses the actual move button to correct it before locking.
        const inputs = index === 0 ? [correct[1], correct[0], ...correct.slice(2)] : order;
        assert(await button('Lock order').isDisabled());
        for (let pick = 0; pick < 5; pick++) {
          await activate(panel.getByRole('button', { name: inputs[pick], exact: true }), touch);
          if (index === 0 && pick === 1) {
            assert.deepEqual((await readDraft()).slice(0, 2), inputs.slice(0, 2));
            assert(await button('Lock order').isDisabled());
            if (restores) {
              await restore('two-pick draft', 'playing', before);
              assert.deepEqual(await readDraft(), [...inputs.slice(0, 2), 'Pick a player', 'Pick a player', 'Pick a player']);
              await shot('restored-draft');
            }
            await activate(button(`Move ${correct[0]} up`), touch);
            assert.deepEqual((await readDraft()).slice(0, 2), correct.slice(0, 2), 'Actual move corrects the draft');
          }
        }
        assert.deepEqual(await readDraft(), order);
        const draft = JSON.parse(await saveBytes());
        assert.deepEqual(draft.drafts[index], order); assert.equal(draft.orders[index], null, 'A full editable draft is not a submitted result');
        result.layouts.push(await layout(page, panel, 'draft-' + round.sport));
        assert(await button('Lock order').isEnabled());
        await activate(button('Lock order'), touch); await phase('reveal');
        const nextLabel = index === 2 ? 'View circuit results' : 'Next sport';
        const checked = await checkReveal(round, order, nextLabel, 'reveal-' + round.sport);
        result.rounds.push(checked); played.push({ round, order });
        const saved = JSON.parse(await saveBytes());
        assert.deepEqual(saved.orders[index], order, 'One real lock persists the submitted order');
        await isolate(before); await shot('reveal-' + round.sport);
        if (index === 0) {
          if (width === 320) {
            const held = await saveBytes(), reveal = panel.locator('[data-circuit-reveal]');
            result.controls.push(await scrollVisibilityControl(reveal, page, 'complete first reveal scroll control'));
            result.controls.push(await widthOverflowControl(reveal.locator('li').first(), page, panel, 'first reveal width control'));
            assert.equal(await saveBytes(), held, 'Reveal geometry controls preserve circuit bytes');
          }
          const revealed = await panel.locator('[data-circuit-reveal]').innerText();
          await activate(button('Legends circuit rules'), touch);
          const dialog = page.getByRole('dialog', { name: 'Legends circuit rules', exact: true });
          await dialog.waitFor();
          assert((await dialog.innerText()).includes('30, 20 and 10'), 'Reopened rules retain their worked example');
          await dialog.press('Space'); assert(await dialog.isVisible()); await shot('rules');
          await activate(dialog.getByRole('button', { name: "Let's Play!", exact: true }), touch);
          await dialog.waitFor({ state: 'hidden' });
          assert(await button('Legends circuit rules').evaluate(el => document.activeElement === el), 'Rules return keyboard focus');
          assert.equal(await panel.locator('[data-circuit-reveal]').innerText(), revealed);
          const held = await saveBytes();
          await activate(button('📅 Daily'), touch);
          assert(!await panel.isVisible());
          await page.getByRole('region', { name: 'Rank result', exact: true }).getByText('3 / 5 correct', { exact: true }).waitFor();
          await activate(button('Legends circuit'), touch); await phase('reveal'); await settled(page);
          assert.equal(await saveBytes(), held, 'Mode return retains the submitted result');
          assert.equal(await panel.locator('[data-circuit-reveal]').innerText(), revealed);
          if (restores) {
            await restore('first reveal', 'reveal', before);
            assert.equal(await panel.locator('[data-circuit-reveal]').innerText(), revealed);
            await checkReveal(round, order, nextLabel, 'restored reveal'); await shot('restored-reveal');
          }
        }
        if (light) {
          assert(await page.locator('html').evaluate(el => el.classList.contains('light')));
          await shot('light-reveal');
        } else {
          await activate(button(nextLabel), touch); await phase(index === 2 ? 'done' : 'playing');
        }
      }
      if (!light) {
        const checkTotals = async () => {
          await settled(page);
          assert.equal(await panel.locator('[data-circuit-total]').innerText(), '8 / 15');
          for (const [index, sport] of ['NBA', 'NHL', 'MLB'].entries()) assert.equal(await panel.locator(`[data-circuit-score="${sport}"]`).innerText(), `${[5, 3, 0][index]} / 5`);
          result.visibility.push(await visible(panel.locator('[data-circuit-result]'), page, 'complete circuit results'));
          result.layouts.push(await layout(page, panel, 'results'));
        };
        await checkTotals(); await isolate(before); await shot('results');
        if (restores) { await restore('complete result', 'done', before); await checkTotals(); await shot('restored-results'); }
        const doneBytes = await saveBytes();
        for (const { round, order } of played) {
          await activate(button('Review ' + round.sport), touch);
          await panel.locator('[data-circuit-reveal]').waitFor();
          assert.equal((await referenceRound()).id, round.id);
          result.reviews.push(await checkReveal(round, order, 'Back to circuit results', 'review-' + round.sport));
          assert.equal(await saveBytes(), doneBytes, 'Review never mutates the completed circuit');
          if (round.sport === 'MLB') await shot('review-MLB');
          await activate(button('Back to circuit results'), touch);
          await panel.locator('[data-circuit-result]').waitFor();
        }
        await activate(button('Play another circuit'), touch); await phase('playing'); await settled(page);
        const fresh = JSON.parse(await saveBytes());
        assert.equal(fresh.index, 0); assert.equal(fresh.phase, 'playing');
        assert.deepEqual(fresh.orders, [null, null, null]); assert.deepEqual(fresh.drafts, [[], [], []]);
        assert.notDeepEqual(fresh.seeds, JSON.parse(doneBytes).seeds, 'Replay creates a fresh run');
        assert.equal(await panel.locator('[data-circuit-result]').count(), 0);
        assert.deepEqual(await readDraft(), Array(5).fill('Pick a player'));
        result.layouts.push(await layout(page, panel, 'replay')); await shot('replay');
      }
      await isolate(before);
      assert.deepEqual(result.pageErrors, [], 'No uncaught page errors');
      assert.deepEqual(result.consoleErrors, [], 'No console errors');
      assert.deepEqual(result.assetFailures, [], 'Built assets load successfully');
      result.passed = true;
      console.log(`${id}: actual ranks, quiet daily bytes, saved progress and readable results passed.`);
    } catch (error) {
      result.passed = false; result.error = String(error.stack || error);
      await shot('failure').catch(() => {});
      console.error(`${id}: ${result.error}`);
    } finally { await context.close(); saveReport(); }
  }
  assert.equal(report.cases.length, 4);
  assert(report.cases.every(row => row.passed), 'Every native circuit profile must pass');
  assert.equal(report.cases.flatMap(row => row.controls).length, 3, 'All three native geometry controls must reject and restore');
} finally {
  const controls = report.cases.flatMap(row => row.controls);
  report.geometryControls = { expected: 3, rejected: controls.filter(row => row.rejection).length, restored: controls.filter(row => row.restored).length };
  report.finished = new Date().toISOString(); saveReport();
  await browser?.close(); server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
}
