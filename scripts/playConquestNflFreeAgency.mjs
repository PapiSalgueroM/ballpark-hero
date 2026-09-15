/** Round 531: actual Arcade battles unlock player-pool signings and recovery.
 * No hook state or battle result is substituted. Requests are exact local fixtures.
 * NFL_FREE_AGENCY_CONTROL=change removes the actual Change team React handler.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NFL_FREE_AGENCY_BASE || 'http://127.0.0.1:4208');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NFL_FREE_AGENCY_CONTROL || '';
assert.ok(['', 'change'].includes(control), 'Unknown control');
const widths = (process.env.NFL_FREE_AGENCY_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-free-agency-'));
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
console.log(`playConquestNflFreeAgency: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
try {
  for (const width of widths) {
    const state = { width, violations: [], runtime: [], localFailures: [], requests: [], screenshots: [], signings: [], turns: [] };
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
      let seed = 527, forced = null;
      window.__nflFreeAgencyRoll = value => { forced = value; };
      Math.random = () => { if (forced !== null) return forced; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Signing Fixture');
      localStorage.setItem('round531-protected-save', 'keep unrelated game data');
    }, { origin: base.origin });
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    page.on('pageerror', error => state.runtime.push(error.message));
    page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
    page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push(`HTTP ${res.status()} ${res.url()}`); });
    try {
      await page.goto(new URL('/conquest', base).href, { waitUntil: 'domcontentloaded' });
      const main = page.locator('main#dukb-main');
      const enter = async () => {
        await main.getByRole('button', { name: /Arcade The original mode/ }).click();
        const close = page.getByRole('button', { name: 'Start Conquering!', exact: true });
        if (await close.isVisible()) await close.click();
        await main.getByRole('button', { name: /Start Conquest/ }).waitFor();
        await main.locator('summary').filter({ hasText: '✍️ Free Agency' }).click();
      };
      await enter();
      const panel = main.locator('details').filter({ has: page.locator('summary').filter({ hasText: '✍️ Free Agency' }) });
      const picker = panel.getByRole('combobox', { name: 'Pick your team' });
      const signs = () => panel.getByRole('button', { name: /^Sign / });
      const changeButton = panel.getByRole('button', { name: /Change team/ });
      const choose = async id => {
        if (await changeButton.isVisible()) await changeButton.click();
        const teamName = await picker.locator(`option[value="${id}"]`).innerText();
        await picker.selectOption(id);
        await changeButton.waitFor();
        assert.equal(await picker.count(), 0, 'Choosing a favorite preserves the badge and Change team flow');
        await panel.getByText(teamName, { exact: true }).waitFor();
      };
      await choose('KC');
      if (control === 'change') {
        await changeButton.evaluate(node => { const clone = node.cloneNode(true); window.__deadChange = { node, clone }; node.replaceWith(clone); });
        assert.equal(await changeButton.evaluate(node => node === window.__deadChange.clone), true, 'Control replaces the actual Change team button');
        await changeButton.click();
        await assert.rejects(() => picker.waitFor({ timeout: 1800 }), error => error.name === 'TimeoutError' && /Pick your team/.test(error.message));
        await page.evaluate(() => { const { node, clone } = window.__deadChange; clone.replaceWith(node); delete window.__deadChange; });
        state.control = 'dead Change team rejected; original restored';
      }
      await choose('BUF');
      await panel.getByRole('button', { name: / for Bills$/ }).first().waitFor();
      await choose('KC');
      await panel.getByRole('button', { name: / for Chiefs$/ }).first().waitFor();
      assert.ok(await panel.getByText('Arcade player pool. Availability follows the rosters in this run.').isVisible(), 'Pool copy describes this run');
      assert.ok(await signs().count() > 0, 'Initial pool has actual candidates');
      assert.ok((await signs().evaluateAll(nodes => nodes.map(node => node.disabled))).every(Boolean), 'Signing starts on cooldown');
      const changeSize = await changeButton.boundingBox();
      assert.ok(changeSize && changeSize.width >= 30 && changeSize.height >= 30, 'Change team has a usable touch target');
      if (control === 'change') {
        await panel.scrollIntoViewIfNeeded(); await capture(page, state, 'change-restored');
        assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
        state.passed = true;
        console.log(`PASS ${width}: dead Change team fails exact picker check; restored control changes both teams`);
        continue;
      }
      await main.getByRole('button', { name: 'How to play', exact: true }).click();
      await page.getByText(/after your third settled battle.*neutral state does not count/).scrollIntoViewIfNeeded();
      await capture(page, state, 'signing-help');
      await page.getByRole('button', { name: 'Start Conquering!', exact: true }).click();
      let favorite = 'KC', settled = 0, turn = 0, stage = 'signing';
      const owners = async () => main.locator('[data-layer="fill"]').evaluateAll(nodes => nodes.map(node => ({ region: node.dataset.region, owner: node.dataset.owner })).sort((a, b) => a.region.localeCompare(b.region)));
      const checkChoices = async regionOwners => {
        const alive = [...new Set(regionOwners.map(region => region.owner).filter(Boolean))].sort();
        if (favorite && !alive.includes(favorite)) {
          await panel.getByRole('status').filter({ hasText: /team was eliminated/ }).waitFor();
          assert.ok((await signs().evaluateAll(nodes => nodes.map(node => node.disabled))).every(Boolean), 'Eliminated favorite cannot receive a signing');
          state.elimination = { team: favorite, settled, turn, stage };
          await panel.scrollIntoViewIfNeeded(); await capture(page, state, 'eliminated-favorite');
        }
        if (await changeButton.isVisible()) await changeButton.click();
        const options = await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value).sort());
        assert.deepEqual(options, alive, 'Team choices match actual surviving map owners');
        if (favorite) {
          if (!alive.includes(favorite)) favorite = options.at(-1);
          await choose(favorite);
        }
        return alive;
      };
      const settleTurn = async () => {
        await main.getByRole('button', { name: /Start Conquest|Next Battle/ }).waitFor();
        const statusBefore = await panel.locator('[role="status"]').allTextContents();
        await main.getByRole('button', { name: /Start Conquest|Next Battle/ }).click();
        if (favorite) assert.ok(await changeButton.isDisabled(), 'Change team locks during unresolved battles');
        else assert.ok(await picker.isDisabled(), 'Team picker locks during unresolved battles');
        assert.ok((await signs().evaluateAll(nodes => nodes.map(node => node.disabled))).every(Boolean), 'Signings lock during unresolved battles');
        await panel.getByText('Finish this turn before changing teams or signing.').waitFor();
        const skip = main.getByRole('button', { name: /Skip to result/ });
        const next = main.getByRole('button', { name: /Next Battle/ });
        const reward = page.getByRole('heading', { name: /Power-Up Found!/ });
        await skip.or(next).or(reward).first().waitFor({ timeout: 17000 });
        let combatants = null;
        if (await skip.isVisible()) {
          await skip.click();
          combatants = {
            attacker: await main.getByText('Attacker', { exact: true }).locator('..').innerText(),
            defender: await main.getByText('Defender', { exact: true }).locator('..').innerText(),
            result: await main.getByText('Final Score', { exact: true }).locator('..').innerText(),
          };
          await main.getByRole('button', { name: /Choose Your Player/ }).click();
          const dialog = page.getByRole('dialog', { name: /Steal a Player!/ });
          const recruit = dialog.getByRole('button').filter({ hasNotText: 'Close' }).first();
          combatants.stolen = await recruit.innerText();
          await recruit.click();
          await next.waitFor();
          settled++;
        } else if (await reward.isVisible()) {
          await page.getByRole('button', { name: /Save for Later/ }).click();
        }
        await next.waitFor();
        turn++;
        assert.ok(await main.getByText(`⚔️ Turn ${turn}`, { exact: true }).isVisible(), 'Each actual turn increments the visible counter');
        if (!combatants) assert.deepEqual(await panel.locator('[role="status"]').allTextContents(), statusBefore, 'Neutral claims do not advance signing cooldown');
        const regionOwners = await owners();
        const alive = await checkChoices(regionOwners);
        state.turns.push({ stage, settled, turn, owners: alive.length, favorite, combatants });
        console.log(`${width} ${stage}: turn ${turn}, settled battles ${settled}, ${combatants ? 'battle' : 'neutral claim'}`);
        return { combatants, regionOwners };
      };
      const rank = async () => Number(await main.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Power Rankings' }) })
        .locator('tbody tr').filter({ has: page.getByText(favorite, { exact: true }) }).locator('td').nth(2).innerText());
      const sign = async () => {
        await panel.scrollIntoViewIfNeeded();
        const button = signs().first(), label = await button.getAttribute('aria-label');
        const before = await rank();
        assert.equal(await button.isEnabled(), true, 'Three settled battles unlock signing');
        const size = await button.boundingBox();
        assert.ok(size && size.width >= 30 && size.height >= 30, 'Signing has a usable touch target');
        await capture(page, state, `signing-${state.signings.length + 1}`);
        await button.click();
        await panel.getByText('Available after 3 more settled battles.').waitFor();
        assert.equal(await panel.getByRole('button', { name: label, exact: true }).count(), 0, 'Signed player leaves the available pool');
        assert.equal(await rank(), before + 2, 'Signing below the cap adds the displayed two-point team rating bonus');
        assert.ok((await signs().evaluateAll(nodes => nodes.map(node => node.disabled))).every(Boolean), 'Immediate repeat signing is disabled');
        const logs = page.getByText(/Free agency: signed/);
        assert.equal(await logs.count(), state.signings.length + 1, 'One signing creates one visible transaction');
        if (await signs().count()) await signs().first().evaluate(node => node.click());
        assert.equal(await logs.count(), state.signings.length + 1, 'Disabled repeat creates no extra transaction');
        state.signings.push({ settled, turn, favorite, label, before, after: await rank(), log: await logs.first().innerText() });
      };
      while (settled < 3 && turn < 18) await settleTurn();
      assert.equal(settled, 3, 'Bounded first cycle reaches three real battles');
      await sign();
      while (settled < 6 && turn < 24) await settleTurn();
      assert.equal(settled, 6, 'Bounded second cycle reaches six real battles');
      await sign();
      // A constant low roll scouts one real defender loss, then replays it from
      // identical fresh map state with that defender chosen as the favorite.
      await page.evaluate(() => window.__nflFreeAgencyRoll(0.1));
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      favorite = ''; settled = 0; turn = 0; stage = 'scout';
      const initialMap = await owners();
      const originalTeams = await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value).sort());
      const scout = await settleTurn();
      assert.ok(scout.combatants, 'Fixed-roll scout is a real battle');
      const survivors = await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value));
      const removed = originalTeams.filter(team => !survivors.includes(team));
      assert.equal(removed.length, 1, 'Fixed-roll scout conquers exactly one defender');
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      assert.deepEqual(await owners(), initialMap, 'Replay starts with the same fresh map');
      assert.deepEqual(await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value).sort()), originalTeams, 'Replay starts with the same fresh teams');
      favorite = removed[0]; settled = 0; turn = 0; stage = 'replay';
      await choose(favorite);
      const replay = await settleTurn();
      assert.deepEqual(replay, scout, 'Fresh scout and replay have identical combatants, player choice and resulting map');
      assert.equal(state.elimination?.team, removed[0], 'Scouted defender is the actual eliminated favorite');
      assert.equal(state.elimination?.stage, 'replay', 'Replay specifically exercises eliminated-favorite recovery');
      assert.equal(state.turns.filter(entry => entry.combatants).length, 8, 'Six signing battles plus one scout and one replay are sufficient');
      state.scoutReplay = { eliminatedTeam: removed[0], combatants: scout.combatants };
      assert.equal(await page.evaluate(() => localStorage.getItem('round531-protected-save')), 'keep unrelated game data', 'Signing preserves unrelated game data');
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      assert.equal(await picker.inputValue(), '', 'Fresh Arcade clears the favorite');
      assert.equal(await page.getByText(/Free agency: signed/).count(), 0, 'Fresh Arcade clears signing transactions');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      state.passed = true;
      console.log(`PASS ${width}: eight real battles, two signings, locked unresolved turns, live team changes and identical scout/replay recovery`);
    } catch (error) {
      state.error = error.stack;
      await capture(page, state, 'failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  console.log(`playConquestNflFreeAgency: PASS ${results.length} viewports; artifacts=${output}`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
