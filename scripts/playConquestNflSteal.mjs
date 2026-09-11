/** Round 536: one real player choice settles one pending NFL battle.
 * Uses actual visible-map targets and simulator RNG inputs, without state injection.
 * NFL_STEAL_CONTROL=duplicate duplicates a real acquired roster row and proves detection.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NFL_STEAL_BASE || 'http://127.0.0.1:4213');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NFL_STEAL_CONTROL || '';
assert.ok(['', 'duplicate'].includes(control), 'Unknown control');
const widths = (process.env.NFL_STEAL_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-steal-'));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selectorFile = path.join(output, 'selection.mjs');
buildSync({ stdin: { contents: fs.readFileSync(path.join(root, 'src/hooks/useConquest.ts'), 'utf8') + '\nexport { findTarget, getAliveTeamsFrom, STATE_POSITIONS, DIRECTIONS, TEAM_MAP };', resolveDir: path.join(root, 'src/hooks'), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: selectorFile, alias: { '@': path.join(root, 'src') }, define: { 'process.env.NODE_ENV': '"production"' } });
const selection = await import(pathToFileURL(selectorFile).href);
const results = [];
const paramsKey = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
live.append('start_at', 'gte.2026-09-08T05:30:00.000Z');
live.append('start_at', 'lte.2026-09-09T13:30:00.000Z');
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
async function capture(page, state, label) {
  await page.evaluate(async () => { await Promise.allSettled(document.getAnimations()
    .filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished)); });
  const file = path.join(output, `${state.width}-${label}.png`);
  await page.screenshot({ path: file, animations: 'disabled' });
  state.screenshots.push(file);
}
console.log(`playConquestNflSteal: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
try {
  for (const width of widths) {
    const state = { width, violations: [], runtime: [], localFailures: [], requests: [], screenshots: [] };
    results.push(state);
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
      isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block', locale: 'en-US' });
    await context.routeWebSocket('**/*', socket => { state.violations.push(`WebSocket ${socket.url()}`); socket.close(); });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const deny = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': base.origin }, body: JSON.stringify(data) });
      if (url.origin === backend && url.pathname === '/rest/v1/rpc/global_rank' && !url.search && req.method() === 'POST'
        && JSON.stringify(req.postDataJSON()) === JSON.stringify({ p_player: 'Local Signing Fixture', p_period: 'today', p_games: null })) {
        state.requests.push('synthetic POST read global_rank'); return json([]);
      }
      if (!['GET', 'HEAD'].includes(req.method())) return deny(`Blocked ${req.method()} ${url.origin}${url.pathname}`);
      if (url.origin === base.origin) return route.continue();
      if (url.origin === backend) {
        state.requests.push(`${req.method()} ${url.pathname}?${url.searchParams}`);
        if (req.method() === 'GET' && url.pathname === '/rest/v1/live_scores' && paramsKey(url.searchParams) === paramsKey(live)) return json([]);
        if (req.method() === 'GET' && url.pathname === '/rest/v1/game_completions' && paramsKey(url.searchParams)
          === paramsKey(new URLSearchParams({ select: 'game', player_name: 'eq.Local Signing Fixture', completed_on: 'eq.2026-09-08' }))) return json([]);
        return deny(`Unexpected backend ${req.method()} ${url.href}`);
      }
      if (url.hostname.endsWith('.supabase.co')) return deny(`Unexpected backend host ${url.href}`);
      return route.abort('blockedbyclient');
    });
    await context.addInitScript(({ origin }) => {
      if (location.origin !== origin) return;
      const NativeDate = Date, started = NativeDate.now(), fixed = NativeDate.parse('2026-09-08T17:30:00.000Z');
      window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed + NativeDate.now() - started; } };
      let seed = 29, forced = null, draws = [];
      window.__nflStealDraws = (values, rest) => { draws = [...values]; forced = rest; };
      window.__nflStealSeed = value => { seed = value; forced = null; };
      window.__nflStealForce = value => { forced = value; };
      Math.random = () => {
        if (draws.length) return draws.shift();
        if (forced !== null) return forced;
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
        return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
      };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Signing Fixture');
      localStorage.setItem('round536-protected-save', 'keep unrelated game data');
    }, { origin: base.origin });
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    page.on('pageerror', error => state.runtime.push(error.message));
    page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
    page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push(`HTTP ${res.status()} ${res.url()}`); });
    try {
      await page.goto(new URL('/conquest', base).href, { waitUntil: 'domcontentloaded' });
      const main = page.locator('main#dukb-main');
      const enter = async () => {
        const arcade = main.getByRole('button', { name: /Arcade The original mode/ });
        await arcade.evaluate(node => node.addEventListener('click', () => window.__nflStealSeed(29), { once: true, capture: true }));
        await arcade.click();
        const close = page.getByRole('button', { name: 'Start Conquering!', exact: true });
        if (await close.isVisible()) await close.click();
        await main.getByRole('button', { name: /Start Conquest/ }).waitFor();
      };
      await enter();
      const mapState = async () => main.locator('svg').filter({ has: page.locator('[data-layer="fill"]') }).evaluate(svg => {
        const paths = [...svg.querySelectorAll('[data-layer="fill"]')];
        const markers = [...svg.querySelectorAll('.cq-powerup')];
        const marked = markers.flatMap(marker => paths.filter(path => !path.dataset.owner && path.isPointInFill(new DOMPoint(Number(marker.getAttribute('x')), Number(marker.getAttribute('y'))))).map(path => path.dataset.region));
        return { owners: paths.map(path => [path.dataset.region, path.dataset.owner]), marked, markers: markers.length };
      });
      const orderedTerritories = async () => {
        const visible = new Map((await mapState()).owners);
        return Object.fromEntries(selection.STATE_POSITIONS.map(region => [region.id, visible.get(region.id) || null]));
      };
      // Match the actual browser's random comparator order, including its draw
      // count. The read-only helper chooses inputs; actual UI targets must match.
      const directionPlans = await page.evaluate(directions => Array.from({ length: 128 }, (_, seed) => {
        let value = seed;
        const draws = [];
        const rng = () => {
          value |= 0; value = (value + 0x6d2b79f5) | 0;
          let n = Math.imul(value ^ (value >>> 15), 1 | value);
          n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
          return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
        };
        const dirs = [...directions].sort(() => { const draw = rng(); draws.push(draw); return draw - .5; });
        return { dirs, draws };
      }), [...selection.DIRECTIONS]);
      const choose = async predicate => {
        const territories = await orderedTerritories(), alive = selection.getAliveTeamsFrom(territories);
        for (const attacker of alive) for (const { dirs, draws } of directionPlans) {
          const target = dirs.map(dir => selection.findTarget(attacker, dir, territories)).find(Boolean);
          if (target && predicate(attacker, target)) return { attacker, target, draws: [(alive.indexOf(attacker) + .5) / alive.length, ...draws] };
        }
        throw new Error('No bounded legal map turn matches the requested steal witness');
      };

      const next = main.getByRole('button', { name: /Next Battle/ });
      const picker = page.getByRole('dialog', { name: /Steal a Player!/ });
      const chooseButton = main.getByRole('button', { name: /Choose Your Player/ });
      const turnValue = async () => {
        const label = await main.locator('span').filter({ hasText: /^⚔️ Turn \d+$/ }).innerText();
        return Number(label.match(/\d+/)[0]);
      };
      state.battles = [];
      const startBattle = async plan => {
        assert.equal(plan.target.type, 'team', 'The requested turn is an actual team battle');
        state.plannedTurn = plan;
        const button = main.getByRole('button', { name: /Start Conquest|Next Battle/ });
        await button.evaluate((node, draws) => node.addEventListener('click', () => window.__nflStealDraws(draws, .1), { once: true, capture: true }), plan.draws);
        await button.click();
        const skip = main.getByRole('button', { name: /Skip to result/ });
        await skip.waitFor({ timeout: 18000 }); await skip.click();
        await chooseButton.waitFor();
        const score = await main.getByText('Final Score', { exact: true }).locator('..').innerText(), lines = score.split('\n');
        const attacker = selection.TEAM_MAP.get(plan.attacker), defender = selection.TEAM_MAP.get(plan.target.id);
        assert.equal(lines[1], attacker.name, 'The real attacker matches its planned visible-map target');
        assert.equal(lines[4], defender.name, 'The real defender matches its planned visible-map target');
        assert.equal(lines.at(-1), attacker.city + ' ' + attacker.name + ' win!', 'The real simulator awards the fixture battle to its attacker');
        const record = { attacker: plan.attacker, defender: plan.target.id, score, turnBefore: await turnValue(), settled: false };
        state.battles.push(record);
        await chooseButton.click(); await picker.waitFor();
        return record;
      };
      const eligible = () => picker.getByRole('button').filter({ hasNotText: 'Close' }).locator('visible=true').filter({ has: page.locator('span.font-medium') });
      const firstOption = async () => {
        const buttons = eligible();
        for (let index = 0; index < await buttons.count(); index++) if (await buttons.nth(index).isEnabled()) return buttons.nth(index);
        throw new Error('The actual loser has no eligible player choice');
      };
      const expectOne = async row => assert.equal(await row.count(), 1, 'The acquired player appears exactly once on the recipient roster');
      const recordSettlement = async (record, player) => {
        await next.waitFor();
        assert.equal(await turnValue(), record.turnBefore + 1, 'One confirmed player advances the battle by exactly one turn');
        const logs = main.locator('span').filter({ hasText: new RegExp('^ → Stole ' + player + '$') });
        assert.equal(await logs.count(), 1, 'The chosen player has exactly one settled battle log');
        record.player = player; record.settled = true; record.turnAfter = await turnValue();
        record.owners = (await mapState()).owners;
      };
      const original = await mapState();
      const first = await startBattle(await choose((attacker, target) => attacker === 'DET' && target.type === 'team' && target.id === 'GB'));
      const unchanged = async () => {
        await chooseButton.waitFor();
        assert.equal(await main.getByText('Final Score', { exact: true }).locator('..').innerText(), first.score, 'Dismissing the picker preserves the actual box score');
        assert.deepEqual((await mapState()).owners, original.owners, 'Reviewing the box score does not settle territory ownership');
        assert.equal(await turnValue(), 0, 'Reviewing the box score does not advance the battle');
        assert.equal(await main.getByText('Battle Log', { exact: true }).count(), 0, 'Reviewing the box score does not write a battle log');
      };
      await picker.getByRole('button', { name: 'Close', exact: true }).click(); await unchanged();
      await chooseButton.click(); await picker.waitFor(); await page.keyboard.press('Escape'); await unchanged();
      await chooseButton.click(); await picker.waitFor();
      state.review = 'Close and Escape preserve score, map, turn and log; both reopen';
      const selected = await firstOption(), player = await selected.locator('span.font-medium').innerText();
      await selected.scrollIntoViewIfNeeded(); await capture(page, state, 'eligible-choice');
      state.rapidClicks = await selected.evaluate(node => {
        let events = 0; node.addEventListener('click', () => events++);
        const connected = [node.isConnected]; node.click(); connected.push(node.isConnected); node.click(); connected.push(node.isConnected);
        return { events, connected };
      });
      assert.equal(state.rapidClicks.events, 2, 'Two native clicks are dispatched in the same browser callback');
      assert.ok(state.rapidClicks.connected[0] && state.rapidClicks.connected[1], 'The second click is dispatched before React removes the live choice');
      const confirmation = main.getByText(player + ' acquired!', { exact: false }); await confirmation.waitFor();
      assert.equal(await confirmation.count(), 1, 'The rapid clicks expose one player confirmation');
      await picker.waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('dialog', { name: /Steal a Player/ }).count(), 0, 'The accepted choice closes the picker');
      assert.equal(await main.getByRole('button', { name: /Choose Your Player|Continue →|Next Battle/ }).count(), 0, 'Confirmation exposes no further settlement action');
      await confirmation.scrollIntoViewIfNeeded(); await capture(page, state, 'confirmation');
      await recordSettlement(first, player);
      const second = await startBattle(await choose((attacker, target) => attacker === 'DET' && target.type === 'team'));
      const roster = picker.getByText("Lions's Roster", { exact: true }).locator('..');
      const row = roster.getByRole('row', { name: new RegExp(player) });
      if (control === 'duplicate') {
        await row.evaluate(node => { const copy = node.cloneNode(true); copy.dataset.stealControl = 'duplicate'; node.after(copy); });
        assert.equal(await row.count(), 2, 'Control inserts a second copy of the actual acquired row');
        await assert.rejects(() => expectOne(row), error => error.name === 'AssertionError' && error.message.startsWith('The acquired player appears exactly once on the recipient roster'));
        await roster.locator('[data-steal-control="duplicate"]').evaluate(node => node.remove());
        state.control = 'actual duplicate acquired row rejected and restored';
      }
      await expectOne(row); state.acquiredCard = await row.getByRole('cell').allTextContents();
      await row.scrollIntoViewIfNeeded(); await capture(page, state, 'single-acquired-player');
      const secondChoice = await firstOption(), secondPlayer = await secondChoice.locator('span.font-medium').innerText();
      await secondChoice.click(); await recordSettlement(second, secondPlayer);
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      const fresh = await mapState();
      const abandoned = await startBattle(await choose((attacker, target) => attacker === 'DET' && target.type === 'team' && target.id === 'GB'));
      const abandonedChoice = await firstOption(), abandonedPlayer = await abandonedChoice.locator('span.font-medium').innerText();
      // DOM clicks keep the Mode exit inside the actual 1200 ms confirmation.
      const started = await abandonedChoice.evaluate(node => { const now = performance.now(); node.click(); return now; });
      await main.getByText(abandonedPlayer + ' acquired!', { exact: false }).waitFor();
      state.modeExitDelayMs = await main.getByRole('button', { name: 'Modes', exact: true }).evaluate(node => { const now = performance.now(); node.click(); return now; }) - started;
      assert.ok(state.modeExitDelayMs < 1200, 'Modes leaves the mounted game during the confirmation window');
      abandoned.abandonedDuringConfirmation = true;
      await enter(); await page.waitForTimeout(1500);
      assert.equal(await turnValue(), 0, 'A fresh Arcade entry stays at turn zero after the abandoned confirmation window');
      assert.deepEqual((await mapState()).owners, fresh.owners, 'A fresh Arcade entry keeps its original territory owners');
      assert.equal(await main.getByText(/acquired!|→ Stole /).count(), 0, 'A fresh Arcade entry has no old confirmation or steal log');
      state.freshEntry = 'clean after prior confirmation window; hook tests independently prove timer cancellation';
      await main.getByRole('button', { name: /Start Conquest/ }).scrollIntoViewIfNeeded(); await capture(page, state, 'fresh-entry');
      assert.equal(await page.evaluate(() => localStorage.getItem('round536-protected-save')), 'keep unrelated game data', 'Battle choice actions preserve unrelated storage');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      state.passed = true;
      console.log('PASS ' + width + ': two actual settled battles, one abandoned confirmation, two native clicks give one acquisition');
    } catch (error) {
      state.error = error.stack;
      await capture(page, state, 'failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  console.log('playConquestNflSteal: PASS ' + results.length + ' viewports; artifacts=' + output);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
