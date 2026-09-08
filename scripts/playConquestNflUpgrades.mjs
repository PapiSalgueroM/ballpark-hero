/** Round 534: an earned NFL upgrade lasts until its owner actually battles.
 * No hook state or battle result is substituted. Requests are exact local fixtures.
 * NFL_UPGRADES_CONTROL=queue removes the actual rendered owner queue.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NFL_UPGRADES_BASE || 'http://127.0.0.1:4211');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NFL_UPGRADES_CONTROL || '';
assert.ok(['', 'queue'].includes(control), 'Unknown control');
const widths = (process.env.NFL_UPGRADES_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-upgrades-'));
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
console.log(`playConquestNflUpgrades: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
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
      window.__nflUpgradeDraws = (values, rest) => { draws = [...values]; forced = rest; };
      window.__nflUpgradeSeed = value => { seed = value; forced = null; };
      window.__nflUpgradeForce = value => { forced = value; };
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
      localStorage.setItem('round534-protected-save', 'keep unrelated game data');
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
        await arcade.evaluate(node => node.addEventListener('click', () => window.__nflUpgradeSeed(29), { once: true, capture: true }));
        await arcade.click();
        const close = page.getByRole('button', { name: 'Start Conquering!', exact: true });
        if (await close.isVisible()) await close.click();
        await main.getByRole('button', { name: /Start Conquest/ }).waitFor();
      };
      await enter();
      await main.locator('summary').filter({ hasText: 'Free Agency' }).click();
      const teams = await main.getByRole('combobox', { name: 'Pick your team' }).locator('option:not([disabled])')
        .evaluateAll(nodes => nodes.map(node => ({ id: node.value, label: node.textContent })));
      const mapState = async () => main.locator('svg').filter({ has: page.locator('[data-layer="fill"]') }).evaluate(svg => {
        const paths = [...svg.querySelectorAll('[data-layer="fill"]')];
        const markers = [...svg.querySelectorAll('.cq-powerup')];
        const marked = markers.flatMap(marker => paths.filter(path => !path.dataset.owner && path.isPointInFill(new DOMPoint(Number(marker.getAttribute('x')), Number(marker.getAttribute('y'))))).map(path => path.dataset.region));
        return { owners: paths.map(path => [path.dataset.region, path.dataset.owner]), marked, markers: markers.length };
      });
      const reward = page.getByRole('dialog', { name: /Power-Up Found!/ });
      const next = main.getByRole('button', { name: /Next Battle/ });
      state.turns = []; let turn = 0, earnedFrom;
      while (!(await reward.isVisible()) && turn < 16) {
        const before = await mapState();
        await page.evaluate(() => window.__nflUpgradeForce(null));
        await main.getByRole('button', { name: /Start Conquest|Next Battle/ }).click();
        // Start selects its target and simulates battles synchronously. Only a
        // later, genuinely earned lightning reward uses this fixed random draw.
        await page.evaluate(() => window.__nflUpgradeForce(0.5));
        const skip = main.getByRole('button', { name: /Skip to result/ });
        await skip.or(next).or(reward).first().waitFor({ timeout: 18000 });
        let battle = null;
        if (await skip.isVisible()) {
          await skip.click();
          battle = await main.getByText('Final Score', { exact: true }).locator('..').innerText();
          await main.getByRole('button', { name: /Choose Your Player/ }).click();
          const steal = page.getByRole('dialog', { name: /Steal a Player!/ });
          await steal.getByRole('button').filter({ hasNotText: 'Close' }).first().click();
          await next.waitFor();
        }
        turn++;
        const after = await mapState();
        state.turns.push({ turn, battle, owners: after.owners });
        console.log(`${width}: actual turn ${turn}, ${battle ? 'settled battle' : 'neutral claim'}`);
        assert.ok(await main.locator('span').filter({ hasText: new RegExp(`^⚔️ Turn ${turn}$`) }).count(), 'The real turn counter advances');
        if (await reward.isVisible()) earnedFrom = { before, after };
      }
      assert.ok(earnedFrom, 'A real marked neutral claim earns a reward within the bounded run');
      const owner = await reward.getByText('Awarded to', { exact: true }).locator('..').locator('span').last().innerText();
      const ownerTeam = teams.filter(team => team.label.endsWith(` ${owner}`));
      assert.equal(ownerTeam.length, 1, 'The award owner maps to one actual team');
      await reward.getByText('Upgrade', { exact: true }).waitFor();
      const changed = earnedFrom.after.owners.filter(([region, id]) => earnedFrom.before.owners.find(([prior]) => prior === region)?.[1] !== id);
      assert.equal(changed.length, 1, 'The earning turn claims one region');
      assert.equal(changed[0][1], ownerTeam[0].id, 'The actual claiming team owns the reward');
      assert.ok(earnedFrom.before.marked.includes(changed[0][0]), 'The claimed neutral region was visibly marked with a power');
      assert.equal(earnedFrom.after.markers, earnedFrom.before.markers - 1, 'Earning removes that map power marker');
      state.powers.push({ owner, teamId: ownerTeam[0].id, label: 'Upgrade', region: changed[0][0], turn });
      await capture(page, state, 'earned-card');
      await reward.getByRole('button', { name: /Use Now/ }).click();
      const picker = page.getByRole('dialog', { name: /Upgrade a Player/ });
      await picker.waitFor();
      const candidate = picker.getByRole('button').filter({ hasNotText: /Close|Random player|Back to Power/ }).first();
      const player = await candidate.locator('span').first().innerText();
      assert.ok((await candidate.innerText()).includes('88 OVR'), 'The selected original owner card starts at 88 OVR');
      await candidate.click(); await next.waitFor();
      const queue = main.getByText(/boosted to 99 OVR for/);
      const queueText = await queue.innerText();
      assert.ok(queueText.includes(owner) && queueText.includes(player), 'The earned upgrade belongs to its selected owner and player');
      state.used = { player, owner, turn };
      await queue.scrollIntoViewIfNeeded();
      await capture(page, state, 'queued');
      // Pure helpers select RNG inputs from visible owners in the game's region
      // order. They never write browser state. Actual UI targets must match.
      const orderedTerritories = async () => {
        const visible = new Map((await mapState()).owners);
        return Object.fromEntries(selection.STATE_POSITIONS.map(region => [region.id, visible.get(region.id) || null]));
      };
      // A random sort comparator differs across Node and Chrome V8 versions.
      // Calculate the recorded draw sequence in the same browser as the app.
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
        throw new Error('No bounded legal map turn matches the requested witness');
      };
      const ownId = ownerTeam[0].id;
      const drive = async (label, predicate, consumes = false) => {
        const plan = await choose(predicate), before = await mapState();
        state.plannedTurn = { label, ...plan };
        const button = main.getByRole('button', { name: /Next Battle/ });
        await button.evaluate((node, draws) => node.addEventListener('click', () => window.__nflUpgradeDraws(draws, .1), { once: true, capture: true }), plan.draws);
        await button.click();
        const skip = main.getByRole('button', { name: /Skip to result/ });
        await skip.or(next).or(reward).first().waitFor({ timeout: 18000 });
        const record = { label, attacker: plan.attacker, target: plan.target, turn: ++turn };
        if (plan.target.type === 'neutral') {
          assert.equal(await skip.isVisible(), false, 'A predicted neutral claim does not start a battle');
          const after = await mapState();
          const changes = after.owners.filter(([region, id]) => before.owners.find(([prior]) => prior === region)?.[1] !== id);
          assert.deepEqual(changes, [[plan.target.stateId, plan.attacker]], 'The actual neutral claim matches the visible-map RNG selection');
          if (await reward.isVisible()) {
            record.reward = await reward.innerText();
            await reward.getByRole('button', { name: /Save for Later/ }).click(); await next.waitFor();
          }
          record.owners = after.owners;
        } else {
          await skip.waitFor(); await skip.click();
          record.battle = await main.getByText('Final Score', { exact: true }).locator('..').innerText();
          const scoreLines = record.battle.split('\n');
          assert.ok(scoreLines[1] === selection.TEAM_MAP.get(plan.attacker).name && scoreLines[4] === selection.TEAM_MAP.get(plan.target.id).name, 'The actual battle matches both selected map teams in attacker and defender order');
          await main.getByRole('button', { name: /Choose Your Player/ }).click();
          const steal = page.getByRole('dialog', { name: /Steal a Player!/ }); await steal.waitFor();
          if (consumes) {
            assert.equal(await queue.count(), 0, 'The participating owner queue is consumed when its battle starts');
            const roster = steal.getByText(owner + "'s Roster", { exact: true }).locator('..');
            const row = roster.getByRole('row', { name: new RegExp(player) });
            const cells = await row.getByRole('cell').allTextContents();
            assert.ok(cells[0].includes('⬆️') && cells[0].includes(player) && cells[2] === '99', 'The actual owner battle roster retains its consumed player at 99');
            record.snapshot = cells;
            await row.scrollIntoViewIfNeeded();
            await capture(page, state, 'consumed-battle');
          }
          await steal.getByRole('button').filter({ hasNotText: 'Close' }).first().click(); await next.waitFor();
          record.owners = (await mapState()).owners;
        }
        assert.ok(await main.locator('span').filter({ hasText: new RegExp('^⚔️ Turn ' + turn + '$') }).count(), 'The actual lifetime turn counter advances');
        if (!consumes) {
          if (control === 'queue' && label === 'unrelated neutral') {
            await queue.evaluate(node => { window.__removedUpgrade = { node, parent: node.parentNode, next: node.nextSibling }; node.remove(); });
            assert.equal(await queue.count(), 0, 'Control removes the actual rendered owner queue');
            await assert.rejects(async () => assert.equal(await queue.count(), 1, 'Preserved owner queue remains visible'), error => error.name === 'AssertionError' && error.message.startsWith('Preserved owner queue remains visible'));
            await page.evaluate(() => { const { node, parent, next } = window.__removedUpgrade; parent.insertBefore(node, next); delete window.__removedUpgrade; });
            state.control = 'missing rendered owner queue rejected and restored';
          }
          assert.equal(await queue.count(), 1, 'Preserved owner queue remains visible');
          assert.equal(await queue.innerText(), queueText, 'The unrelated or neutral turn preserves the same owner and selected player');
          await queue.scrollIntoViewIfNeeded();
          await capture(page, state, label.replaceAll(' ', '-'));
        } else assert.equal(await queue.count(), 0, 'The owner boost stays consumed after the real battle settles');
        state.turns.push(record);
        console.log(width + ': lifetime ' + label + ' completed on actual turn ' + turn);
      };
      await drive('unrelated neutral', (attacker, target) => attacker !== ownId && target.type === 'neutral');
      await drive('owner neutral', (attacker, target) => attacker === ownId && target.type === 'neutral');
      await drive('unrelated battle', (attacker, target) => attacker !== ownId && target.type === 'team' && target.id !== ownId);
      await drive('owner battle', (attacker, target) => attacker === ownId && target.type === 'team', true);
      assert.equal(await page.evaluate(() => localStorage.getItem('round534-protected-save')), 'keep unrelated game data', 'Power actions preserve unrelated storage');
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      assert.equal(await main.getByRole('button', { name: /^Open .* saved / }).count(), 0, 'The fresh run has no saved powers');
      assert.equal(await main.getByText(/boosted to 99 OVR for/).count(), 0, 'The fresh run has no queued upgrade');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      state.passed = true;
      console.log('PASS ' + width + ': earned owner Upgrade preserved through neutral and unrelated turns, then consumed in its actual battle');
    } catch (error) {
      state.error = error.stack;
      await capture(page, state, 'failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  console.log(`playConquestNflUpgrades: PASS ${results.length} viewports; artifacts=${output}`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
