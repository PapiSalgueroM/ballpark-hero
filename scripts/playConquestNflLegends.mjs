/** Round 535: earned NFL legends retain their cards through actual transfers.
 * No hook state or battle result is substituted. Requests are exact local fixtures.
 * NFL_LEGENDS_CONTROL=card changes the actual transferred legend rating cell.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NFL_LEGENDS_BASE || 'http://127.0.0.1:4212');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NFL_LEGENDS_CONTROL || '';
assert.ok(['', 'card'].includes(control), 'Unknown control');
const widths = (process.env.NFL_LEGENDS_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-legends-'));
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
console.log(`playConquestNflLegends: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
try {
  for (const width of widths) {
    const state = { width, violations: [], runtime: [], localFailures: [], requests: [], screenshots: [], powers: [] };
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
      window.__nflLegendDraws = (values, rest) => { draws = [...values]; forced = rest; };
      window.__nflLegendSeed = value => { seed = value; forced = null; };
      window.__nflLegendForce = value => { forced = value; };
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
      localStorage.setItem('round535-protected-save', 'keep unrelated game data');
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
        await arcade.evaluate(node => node.addEventListener('click', () => window.__nflLegendSeed(29), { once: true, capture: true }));
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
      const ownerId = 'MIN', legend = selection.TEAM_LEGENDS[ownerId];
      const ordinary = selection.FREE_AGENTS.find(player => player.name === legend.name);
      assert.ok(ordinary && ordinary.overall === 80, 'The existing pool provides the same-name ordinary card');
      const reward = page.getByRole('dialog', { name: /Power-Up Found!/ });
      const next = main.getByRole('button', { name: /Next Battle/ });
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
        throw new Error('No bounded legal map turn matches the requested legend witness');
      };
      state.turns = [];
      let turn = 0;
      const start = async (plan, rewardDraw) => {
        state.plannedTurn = plan;
        const button = main.getByRole('button', { name: /Start Conquest|Next Battle/ });
        await button.evaluate((node, draws) => node.addEventListener('click', () => window.__nflLegendDraws(draws, .1), { once: true, capture: true }), plan.draws);
        await button.click();
        // The actual neutral target is locked before this later reward draw.
        if (rewardDraw !== undefined) await page.evaluate(draw => window.__nflLegendForce(draw), rewardDraw);
      };
      const countTurn = async () => {
        turn++;
        assert.equal(await main.locator('span').filter({ hasText: new RegExp('^⚔️ Turn ' + turn + '$') }).count(), 1, 'The actual scenario turn counter advances');
      };
      const earn = async (draw, label) => {
        const before = await mapState();
        const plan = await choose((attacker, target) => attacker === ownerId && target.type === 'neutral' && before.marked.includes(target.stateId));
        await start(plan, draw); await reward.waitFor({ timeout: 18000 });
        await reward.getByText(label, { exact: true }).waitFor();
        const recipient = await reward.getByText('Awarded to', { exact: true }).locator('..').locator('span').last().innerText();
        assert.equal(recipient, selection.TEAM_MAP.get(ownerId).name, 'The actual power is awarded to its neutral-state claimant');
        const after = await mapState(), changes = after.owners.filter(([region, id]) => before.owners.find(([prior]) => prior === region)?.[1] !== id);
        assert.deepEqual(changes, [[plan.target.stateId, ownerId]], 'The actual marked neutral claim matches its planned owner and region');
        assert.equal(after.markers, before.markers - 1, 'Earning removes one visible power marker');
        await countTurn();
        state.turns.push({ scenario: label, turn, attacker: ownerId, target: plan.target, owners: after.owners });
        state.powers.push({ teamId: ownerId, label, region: plan.target.stateId });
        await capture(page, state, label === 'All-Time Great' ? 'earned-legend' : 'earned-free-agent');
        await reward.getByRole('button', { name: /Use Now/ }).click();
      };
      const battle = async (plan, inspect) => {
        assert.equal(plan.target.type, 'team');
        await start(plan);
        const skip = main.getByRole('button', { name: /Skip to result/ });
        await skip.waitFor({ timeout: 18000 }); await skip.click();
        const score = await main.getByText('Final Score', { exact: true }).locator('..').innerText(), lines = score.split('\n');
        const attacker = selection.TEAM_MAP.get(plan.attacker), defender = selection.TEAM_MAP.get(plan.target.id);
        assert.equal(lines[1], attacker.name, 'The actual attacker matches the planned visible-map target');
        assert.equal(lines[4], defender.name, 'The actual defender matches the planned visible-map target');
        assert.equal(lines.at(-1), `${attacker.city} ${attacker.name} win!`, 'The real simulator awards the fixture battle to its attacker');
        await main.getByRole('button', { name: /Choose Your Player/ }).click();
        const steal = page.getByRole('dialog', { name: /Steal a Player!/ }); await steal.waitFor();
        const selected = await inspect(steal);
        await selected.click(); await next.waitFor(); await countTurn();
        state.turns.push({ scenario: state.scenario, turn, attacker: plan.attacker, target: plan.target, battle: score, owners: (await mapState()).owners });
      };
      const rosterRow = (dialog, teamId) => dialog.getByText(selection.TEAM_MAP.get(teamId).name + "'s Roster", { exact: true }).locator('..').getByRole('row', { name: new RegExp(legend.name) });
      const legendCard = async row => {
        const values = await row.getByRole('cell').allTextContents();
        assert.deepEqual(values, [`🐐${legend.name}`, legend.position, '99', 'Legend'], 'Earned legend retains its exact marked 99 card');
        return values;
      };
      state.scenario = 'earned transfer';
      await earn(.7, 'All-Time Great'); await next.waitFor();
      assert.equal(await main.getByText(new RegExp(legend.name + ' joins the roster!')).count(), 1, 'The real earned power adds one legend');
      const transferPlan = await choose((attacker, target) => attacker !== ownerId && target.type === 'team' && target.id === ownerId);
      await battle(transferPlan, async steal => {
        const row = rosterRow(steal, ownerId);
        state.beforeTransfer = await legendCard(row);
        const option = steal.getByRole('button', { name: new RegExp(legend.name) });
        assert.equal(await option.textContent(), `${legend.name}${legend.position} · 99 OVR · Legend`, 'The actual losing-roster choice offers the earned legend card');
        await row.scrollIntoViewIfNeeded(); await capture(page, state, 'legend-before-transfer');
        return option;
      });
      const recipientId = transferPlan.attacker;
      state.transfer = { name: legend.name, from: ownerId, to: recipientId };
      await battle(await choose((attacker, target) => attacker === recipientId && target.type === 'team'), async steal => {
        const row = rosterRow(steal, recipientId);
        if (control === 'card') {
          const overall = row.getByRole('cell').nth(2);
          await overall.evaluate((node, value) => { window.__legendControl = { node, text: node.textContent }; node.textContent = String(value); }, ordinary.overall);
          assert.equal(await overall.innerText(), String(ordinary.overall), 'Control changes the actual transferred legend rating cell');
          await assert.rejects(() => legendCard(row), error => error.name === 'AssertionError' && error.message.startsWith('Earned legend retains its exact marked 99 card'));
          await page.evaluate(() => { const { node, text } = window.__legendControl; node.textContent = text; delete window.__legendControl; });
          state.control = 'downgraded transferred legend card rejected and restored';
        }
        state.afterTransfer = await legendCard(row);
        await row.scrollIntoViewIfNeeded(); await capture(page, state, 'legend-after-transfer');
        return steal.getByRole('button').filter({ hasNotText: 'Close' }).first();
      });
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter(); turn = 0;
      state.scenario = 'ordinary signing';
      await earn(.3, 'Free Agent Signing');
      const agents = page.getByRole('dialog', { name: /Sign a Free Agent/ }); await agents.waitFor();
      const ordinaryOption = agents.getByRole('button', { name: new RegExp(ordinary.name) });
      assert.equal(await ordinaryOption.textContent(), `${ordinary.name}${ordinary.position} · ${ordinary.overall} OVR`, 'The real free-agent reward offers the ordinary same-name player at 80');
      await ordinaryOption.scrollIntoViewIfNeeded(); await capture(page, state, 'ordinary-offer');
      await ordinaryOption.click(); await next.waitFor();
      await battle(await choose((attacker, target) => attacker === ownerId && target.type === 'team'), async steal => {
        const row = rosterRow(steal, ownerId), values = await row.getByRole('cell').allTextContents();
        assert.deepEqual(values, [ordinary.name, ordinary.position, String(ordinary.overall), '-'], 'The actual ordinary signing stays at its pool rating without a legend badge');
        state.ordinaryCard = values;
        await row.scrollIntoViewIfNeeded(); await capture(page, state, 'ordinary-roster');
        return steal.getByRole('button').filter({ hasNotText: 'Close' }).first();
      });
      assert.equal(await page.evaluate(() => localStorage.getItem('round535-protected-save')), 'keep unrelated game data', 'Legend and signing actions preserve unrelated storage');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      state.passed = true;
      console.log('PASS ' + width + ': earned legend transfer retains 99, ordinary pool signing stays 80');
    } catch (error) {
      state.error = error.stack;
      await capture(page, state, 'failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  console.log(`playConquestNflLegends: PASS ${results.length} viewports; artifacts=${output}`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
