/* Round 998: native challenge outcomes with verified historical fixtures.
   External requests are fulfilled locally; no production data or writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'rugby-league-challenge-artifacts/native');
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/rugbyLeagueRecords.json'), 'utf8'));
assert(fixture.nrl.length >= 8 && fixture.dallym.length >= 8, 'Both verified banks can support claims');
const DATE = '2026-10-03', DAILY = 'champ-or-not-daily-' + DATE;
const protectedKeys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const tables = {
  nrl_premiers: fixture.nrl.map((row, index) => ({ id: index + 1, year: row.year, premier: row.team })),
  nrl_dally_m: fixture.dallym.map((row, index) => ({ id: index + 1, year: row.year, winner: row.team })),
};
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build before native verification');
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

async function activate(control, touch, minimum = 44) {
  const box = await control.boundingBox();
  assert(box && box.width >= minimum - 1 && box.height >= minimum - 1, 'Usable native target: ' + await control.innerText());
  if (touch) await control.tap();
  else { await control.focus(); await control.press('Enter'); }
}
async function settledLayout(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(400);
}
async function layout(page, panel, stage) {
  const sizes = await panel.evaluate(el => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    elements: [el, ...el.querySelectorAll('[data-rugby-statement], [data-rugby-result], button, a')].map(node => {
      const box = node.getBoundingClientRect();
      return { text: node.textContent?.slice(0, 70), left: box.left, right: box.right, width: box.width,
        client: node.clientWidth, scroll: node.scrollWidth };
    }).filter(row => row.width),
  }));
  assert(sizes.document <= sizes.viewport + 2, stage + ': page does not overflow');
  for (const row of sizes.elements) assert(row.left >= -1 && row.right <= sizes.viewport + 1 && row.scroll <= row.client + 2,
    stage + ': content fits its card ' + JSON.stringify(row));
  return { stage, ...sizes };
}
async function visibleUnaided(control, page, stage, kind = 'action') {
  await settledLayout(page);
  const box = await control.boundingBox(), height = await page.evaluate(() => innerHeight);
  assert(box && box.y >= -1 && box.y + box.height <= height + 1, stage + ': ' + kind + ' appears without driver scrolling');
  return { stage, box };
}
function truthFor(statement, category) {
  assert(['nrl', 'dallym'].includes(category), 'Claim belongs to a requested rugby bank');
  const match = category === 'nrl'
    ? statement.match(/^(.+) won the top grade rugby league premiership in (\d{4})\.$/)
    : statement.match(/^(.+) won the (\d{4}) Dally M Medal\.$/);
  assert(match, 'Displayed claim uses the actual competition wording: ' + statement);
  const [, team, yearText] = match, year = Number(yearText), rows = fixture[category];
  assert(rows.some(row => row.team === team), 'Every named winner is present in its verified bank');
  const winners = rows.filter(row => row.year === year).map(row => row.team);
  assert(winners.length > 0, 'Every claim year has a recorded winner');
  return { team, year, winners, isTrue: winners.includes(team) };
}
const protectedState = page => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), protectedKeys);

try {
  await ready;
  browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, kind: 'full', completedDaily: false },
    { width: 390, height: 844, touch: true, reduced: false, kind: 'full', completedDaily: true },
    { width: 1440, height: 1000, touch: false, reduced: false, kind: 'full', completedDaily: true },
    { width: 390, height: 844, touch: true, reduced: false, kind: 'missing-bank', completedDaily: false },
    { width: 1440, height: 1000, touch: false, reduced: false, kind: 'light', completedDaily: false },
  ]) {
    const { width, height, touch, reduced, kind, completedDaily } = profile;
    const id = `${width}-${kind}-${touch ? 'touch' : 'keyboard'}${reduced ? '-reduced' : ''}`;
    const dailyBytes = JSON.stringify({ answers: completedDaily ? [true, false, true, true, false, true, true, false, true, true] : [true, false, true] });
    const result = { id, ...profile, screenshots: [], layouts: [], visibility: [], guardControls: [], claims: [],
      pageErrors: [], consoleErrors: [], assetFailures: [], interceptedRequests: [], scoreWrites: [], storageWrites: [] };
    report.cases.push(result);
    let missingBank = kind === 'missing-bank';
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: DAILY, value: dailyBytes },
        { name: 'rules-gate-seen:/champ-or-not', value: '1' },
        ...(kind === 'light' ? [{ name: 'dukb-theme', value: 'light' }] : []),
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
      const table = url.pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
      if (table && Object.hasOwn(tables, table)) {
        const rows = missingBank && table === 'nrl_dally_m' ? [] : tables[table];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      }
      const type = request.resourceType();
      const contentType = type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json';
      return route.fulfill({ status: 200, contentType, body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.addInitScript(({ keys, date }) => {
      const OriginalDate = Date, now = new OriginalDate(date + 'T16:00:00Z').getTime();
      window.Date = class extends OriginalDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
      };
      window.__rugbyWrites = [];
      for (const method of ['setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && (keys.includes(key) || key.startsWith('champ-or-not'))) {
            window.__rugbyWrites.push({ method, key });
          }
          return original.call(this, key, ...args);
        };
      }
    }, { keys: protectedKeys, date: DATE });
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => {
      if (request.url().startsWith(BASE)) result.assetFailures.push(request.url() + ': ' + request.failure()?.errorText);
    });
    page.on('response', response => {
      if (response.url().startsWith(BASE) && response.status() >= 400) result.assetFailures.push(response.url() + ': ' + response.status());
    });
    const panel = page.locator('[data-rugby-challenge]');
    const button = name => panel.getByRole('button', { name, exact: true });
    const phase = value => page.waitForFunction(expected => document.querySelector('[data-rugby-challenge]')?.getAttribute('data-rugby-phase') === expected, value);
    const shot = async stage => {
      const file = `${id}-${stage}.png`;
      await settledLayout(page);
      await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
      result.screenshots.push(file);
    };
    const scrollGuardControl = async (scrollTarget, contextTarget, stage) => {
      const before = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      const originalBox = await contextTarget.boundingBox();
      let changed;
      try {
        // Reproduce the old action-only reveal without changing product code or outcome state.
        await scrollTarget.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'nearest' }));
        changed = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
        const movedBox = await contextTarget.boundingBox();
        assert(Math.abs(changed.y - before.y) > 1, stage + ': scroll control changed the real viewport');
        assert(originalBox && movedBox && movedBox.y < -1 && movedBox.y < originalBox.y - 1,
          stage + ': scroll control actually hid the reading context');
        const expected = stage + ': content appears without driver scrolling';
        await assert.rejects(() => visibleUnaided(contextTarget, page, stage, 'content'), error =>
          error.name === 'AssertionError' && error.code === 'ERR_ASSERTION' && error.message === expected);
      } finally {
        await page.evaluate(position => window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), before);
      }
      const restored = await visibleUnaided(contextTarget, page, stage + '-restored', 'content');
      const after = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      assert(Math.abs(after.x - before.x) <= 1 && Math.abs(after.y - before.y) <= 1, stage + ': original viewport restored');
      result.guardControls.push({ stage, kind: 'native visibility guard only', rejected: true, before, changed, restored, after });
    };
    const isolate = async before => {
      assert.deepEqual(await protectedState(page), before, 'Challenge preserves daily, completion, streak and diary bytes');
      result.storageWrites = await page.evaluate(() => window.__rugbyWrites);
      assert.deepEqual(result.storageWrites, [], 'Challenge never transiently writes or removes protected records');
      assert.deepEqual(result.scoreWrites, [], 'Challenge never attempts a score write');
    };
    try {
      await page.goto(BASE + '/champ-or-not', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Rugby League', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Wait for the original daily to load before measuring its save/record baseline.
      await page.getByText(completedDaily ? '7/10 Called Right!' : /Claim:/, { exact: completedDaily }).first().waitFor();
      assert.equal(await page.evaluate(key => localStorage.getItem(key), DAILY), dailyBytes);
      const before = await protectedState(page);
      await page.evaluate(() => { window.__rugbyWrites = []; });
      await activate(page.getByRole('button', { name: 'Rugby League', exact: true }), touch);
      if (kind === 'missing-bank') {
        await phase('error');
        assert.equal(await button('Start ten questions').count(), 0, 'Missing bank cannot start a partial challenge');
        result.layouts.push(await layout(page, panel, 'unavailable')); await shot('unavailable');
        await isolate(before);
        // A200 empty bank intentionally exercises unavailable data without HTTP error noise.
        missingBank = false;
        await activate(button('Retry rugby records'), touch);
        await phase('intro');
        assert(await button('Start ten questions').isEnabled(), 'Retry recovers when both actual banks arrive');
        result.recovered = true; await shot('recovered');
      } else {
        await phase('intro');
        assert((await panel.innerText()).includes('Five premiers. Five medallists.'), 'Intro explains the two question types');
        const exampleParagraph = panel.locator('p').filter({ hasText: /^.+ won the top grade rugby league premiership in \d{4}\.$/ });
        const example = (await exampleParagraph.innerText()).trim();
        assert(truthFor(example, 'nrl').isTrue, 'Worked example matches the independently verified winner and year');
        result.example = example;
        result.visibility.push(await visibleUnaided(exampleParagraph, page, 'intro example', 'content'));
        result.visibility.push(await visibleUnaided(button('Start ten questions'), page, 'intro start'));
        if (width === 320) await scrollGuardControl(button('Start ten questions'), exampleParagraph, 'intro example');
        result.layouts.push(await layout(page, panel, 'intro')); await shot('intro');
        await activate(button('Start ten questions'), touch);
        await phase('question');
        await settledLayout(page);
        result.visibility.push(await visibleUnaided(button('CHAMP'), page, 'first claim'));
        const wanted = Array.from({ length: 10 }, (_, i) => i % 3 !== 1);
        const rounds = kind === 'light' ? 1 : 10;
        for (let index = 0; index < rounds; index++) {
          const question = panel.locator('[data-rugby-question]');
          assert.equal(await question.getAttribute('data-rugby-question'), String(index + 1));
          const category = await question.getAttribute('data-rugby-category');
          assert.equal(category, index % 2 === 0 ? 'nrl' : 'dallym', 'The five banks alternate across ten claims');
          const statement = (await panel.locator('[data-rugby-statement]').innerText()).trim();
          const truth = truthFor(statement, category);
          const correct = wanted[index], pick = correct ? truth.isTrue : !truth.isTrue;
          await activate(button(pick ? 'CHAMP' : 'NOT'), touch);
          await phase('reveal');
          const next = button(index === 9 ? 'View results' : 'Next claim');
          result.visibility.push(await visibleUnaided(panel.locator('[data-rugby-statement]'), page, 'claim-' + (index + 1), 'content'));
          result.visibility.push(await visibleUnaided(panel.getByRole('status'), page, 'winner-' + (index + 1), 'content'));
          result.visibility.push(await visibleUnaided(next, page, 'reveal-' + (index + 1)));
          assert(await next.evaluate(el => document.activeElement === el), 'Reveal focuses the real next action');
          const reveal = panel.getByRole('status');
          const text = await reveal.innerText();
          assert(text.includes(correct ? 'Right call!' : 'Not this time.'), 'Feedback matches the independently verified decision');
          assert(text.includes('The claim is ' + (truth.isTrue ? 'true' : 'false')), 'Reveal states the independently verified truth');
          for (const winner of truth.winners) assert(text.includes(winner), 'Reveal names every real winner for that year');
          result.claims.push({ statement, category, ...truth, pick, correct });
          result.layouts.push(await layout(page, panel, 'reveal-' + (index + 1)));
          if (index === 0) {
            if (width === 320) await scrollGuardControl(reveal, panel.locator('[data-rugby-statement]'), 'claim-1');
            await shot('first-reveal');
            await activate(button('Rugby League rules'), touch);
            const dialog = page.getByRole('dialog', { name: 'Rugby League rules', exact: true });
            await dialog.waitFor();
            assert((await dialog.innerText()).includes(example), 'Reopened rules retain the independently verified worked example');
            await dialog.press('Space');
            assert(await dialog.isVisible(), 'Space on rules does not advance the hidden question');
            await shot('rules');
            await activate(dialog.getByRole('button', { name: "Let's Play!", exact: true }), touch);
            await dialog.waitFor({ state: 'hidden' });
            assert(await button('Rugby League rules').evaluate(el => document.activeElement === el), 'Rules close returns focus');
            assert.equal(await reveal.innerText(), text, 'Rules retain the same decision');
            await activate(page.getByRole('button', { name: 'Daily', exact: true }), touch, 30);
            assert(!await panel.isVisible(), 'Daily hides the challenge');
            await activate(page.getByRole('button', { name: 'Rugby League', exact: true }), touch);
            await phase('reveal'); await page.waitForTimeout(1000);
            assert.equal(await panel.locator('[data-rugby-statement]').innerText(), statement);
            assert.equal(await reveal.innerText(), text, 'Mode return retains the pending reveal and earned point');
            assert.equal(await question.getAttribute('data-rugby-question'), '1');
            await isolate(before);
          }
          if (kind === 'light') {
            assert(await page.locator('html').evaluate(el => el.classList.contains('light')));
            await settledLayout(page); await shot('light-reveal');
          } else {
            await activate(next, touch);
            await phase(index === 9 ? 'done' : 'question');
          }
        }
        if (kind === 'full') {
          assert.equal(await panel.locator('[data-rugby-score="total"]').innerText(), '7 / 10');
          assert.match(await panel.locator('[data-rugby-score="nrl"]').innerText(), /4\s*\/\s*5/);
          assert.match(await panel.locator('[data-rugby-score="dallym"]').innerText(), /3\s*\/\s*5/);
          result.visibility.push(await visibleUnaided(button('Play another ten'), page, 'results'));
          result.layouts.push(await layout(page, panel, 'results')); await shot('results');
          await isolate(before);
          await activate(button('Play another ten'), touch);
          await phase('question');
          assert.equal(await panel.locator('[data-rugby-question]').getAttribute('data-rugby-question'), '1', 'Replay returns to the first claim');
          assert.equal(await panel.getByRole('status').count(), 0, 'Replay clears old answer feedback');
          assert.equal(await panel.locator('[data-rugby-score="total"]').count(), 0, 'Replay clears old result totals');
          await activate(button('CHAMP'), touch); await phase('reveal');
          assert.equal(await panel.locator('[data-rugby-question]').getAttribute('data-rugby-question'), '1', 'Replay accepts a new first decision');
          result.visibility.push(await visibleUnaided(panel.locator('[data-rugby-statement]'), page, 'replay claim', 'content'));
          result.visibility.push(await visibleUnaided(panel.getByRole('status'), page, 'replay winner', 'content'));
          result.visibility.push(await visibleUnaided(button('Next claim'), page, 'replay next'));
          result.layouts.push(await layout(page, panel, 'replay')); await shot('replay');
        }
      }
      await isolate(before);
      await activate(button('Back to Champ or Not'), touch);
      assert(!await panel.isVisible());
      assert.equal(await page.evaluate(key => localStorage.getItem(key), DAILY), dailyBytes, 'Exit preserves the original daily');
      assert.deepEqual(result.scoreWrites, []);
      assert.deepEqual(result.pageErrors, [], 'No uncaught page errors');
      assert.deepEqual(result.consoleErrors, [], 'No console errors, including handled empty-bank recovery');
      assert.deepEqual(result.assetFailures, [], 'All built assets load');
      result.passed = true;
      console.log(`${id}: actual claim truth, retained decisions, daily isolation and layout passed.`);
    } catch (error) {
      result.passed = false; result.error = String(error.stack || error);
      await shot('failure').catch(() => {});
      console.error(`${id}: ${result.error}`);
    } finally { await context.close(); saveReport(); }
  }
  assert.equal(report.cases.length, 5);
  assert(report.cases.every(row => row.passed), 'Every native Rugby League profile must pass');
} finally {
  report.finished = new Date().toISOString(); saveReport();
  await browser?.close(); server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
}
