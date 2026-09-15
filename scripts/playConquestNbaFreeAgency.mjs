/** Round 530: actual Arcade battles unlock player-pool signings and recovery.
 * No hook state or battle result is substituted. Requests are exact local fixtures.
 * NBA_FREE_AGENCY_CONTROL=picker removes the actual team picker's React handler.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NBA_FREE_AGENCY_BASE || 'http://127.0.0.1:4207');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NBA_FREE_AGENCY_CONTROL || '';
assert.ok(['', 'picker'].includes(control), 'Unknown control');
const widths = (process.env.NBA_FREE_AGENCY_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nba-free-agency-'));
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
console.log(`playConquestNbaFreeAgency: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
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
      window.__nbaFreeAgencyRoll = value => { forced = value; };
      Math.random = () => { if (forced !== null) return forced; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Signing Fixture');
      localStorage.setItem('round530-protected-save', 'keep unrelated game data');
    }, { origin: base.origin });
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    page.on('pageerror', error => state.runtime.push(error.message));
    page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
    page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push(`HTTP ${res.status()} ${res.url()}`); });
    try {
      await page.goto(new URL('/conquest-nba', base).href, { waitUntil: 'domcontentloaded' });
      const main = page.locator('main#dukb-main');
      const enter = async () => {
        await main.getByRole('button', { name: /Arcade Play simulated battles/ }).click();
        const close = page.getByRole('button', { name: 'Start Conquering!', exact: true });
        if (await close.isVisible()) await close.click();
        await main.getByRole('button', { name: /Start Conquest/ }).waitFor();
        await main.locator('summary').filter({ hasText: '✍️ Free Agency' }).click();
      };
      await enter();
      const panel = main.locator('details').filter({ has: page.locator('summary').filter({ hasText: '✍️ Free Agency' }) });
      const picker = panel.getByRole('combobox', { name: 'Pick your team' });
      const signs = () => panel.getByRole('button', { name: /^Sign / });
      const change = async id => {
        await picker.selectOption(id);
        await picker.waitFor({ timeout: 1800 });
        assert.equal(await picker.inputValue(), id, 'Selected favorite keeps a controlled picker');
      };
      await change('POR');
      assert.ok(await panel.getByText('Arcade player pool. Availability follows the rosters in this run.').isVisible(), 'Pool copy describes this run');
      if (control === 'picker') {
        await picker.evaluate(node => { const clone = node.cloneNode(true); window.__deadPicker = { node, clone }; node.replaceWith(clone); });
        assert.equal(await picker.evaluate(node => node === window.__deadPicker.clone), true, 'Control replaces the actual team picker');
        await picker.selectOption('BOS');
        await assert.rejects(() => panel.getByRole('button', { name: / for Celtics$/ }).first().waitFor({ timeout: 1800 }), error => error.name === 'TimeoutError' && /Celtics/.test(error.message));
        await page.evaluate(() => { const { node, clone } = window.__deadPicker; clone.replaceWith(node); delete window.__deadPicker; });
        state.control = 'dead team picker rejected; original restored';
      }
      await change('BOS');
      await panel.getByRole('button', { name: / for Celtics$/ }).first().waitFor();
      await change('POR');
      await panel.getByRole('button', { name: / for Trail Blazers$/ }).first().waitFor();
      assert.ok(await signs().count() > 0, 'Initial available pool has actual candidates');
      assert.ok((await signs().evaluateAll(nodes => nodes.map(node => node.disabled))).every(Boolean), 'Signing starts on cooldown');
      if (control === 'picker') {
        await panel.scrollIntoViewIfNeeded(); await capture(page, state, 'picker-restored');
        assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
        state.passed = true;
        console.log(`PASS ${width}: dead picker fails exact recipient check; restored picker changes both teams`);
        continue;
      }
      let favorite = 'POR', settled = 0, stage = 'signing';
      const recover = async () => {
        if (await picker.inputValue()) return;
        await panel.getByRole('status').filter({ hasText: /have been eliminated/ }).waitFor();
        assert.equal(await picker.locator(`option[value="${favorite}"]`).count(), 0, 'Eliminated favorite is absent from live choices');
        state.elimination = { team: favorite, settled, stage };
        await panel.scrollIntoViewIfNeeded(); await capture(page, state, 'eliminated-favorite');
        favorite = await picker.locator('option:not([disabled])').last().getAttribute('value');
        await change(favorite);
      };
      const settle = async () => {
        await main.getByRole('button', { name: /Start Conquest|Next Battle/ }).click();
        assert.ok(await picker.isDisabled(), 'Team picker locks during unresolved battles');
        assert.ok((await signs().evaluateAll(nodes => nodes.map(node => node.disabled))).every(Boolean), 'Signings lock during unresolved battles');
        await panel.getByText('Finish this turn before changing teams or signing.').waitFor();
        await main.getByRole('button', { name: /Skip to result/ }).waitFor({ timeout: 16000 });
        await main.getByRole('button', { name: /Skip to result/ }).click();
        const combatants = {
          attacker: await main.getByText('Attacker', { exact: true }).locator('..').innerText(),
          defender: await main.getByText('Defender', { exact: true }).locator('..').innerText(),
          winner: await main.getByText(/ win!$/).first().innerText(),
        };
        await main.getByRole('button', { name: /Choose Your Player/ }).click();
        await page.getByRole('button', { name: 'Skip Player', exact: true }).click();
        const reward = page.getByRole('heading', { name: /Team Power/ });
        await reward.or(main.getByRole('button', { name: /Next Battle/ })).first().waitFor();
        if (await reward.isVisible()) await page.getByRole('button', { name: /Save for Later/ }).click();
        await main.getByRole('button', { name: /Next Battle/ }).waitFor();
        settled++;
        assert.ok(await main.getByText(`⚔️ Turn ${settled}`, { exact: true }).isVisible(), 'Real settled battle increments the turn');
        const regionOwners = await main.locator('[data-layer="fill"]').evaluateAll(nodes => nodes.map(node => ({ region: node.dataset.region, owner: node.dataset.owner })).sort((a, b) => a.region.localeCompare(b.region)));
        const owners = [...new Set(regionOwners.map(region => region.owner).filter(Boolean))].sort();
        const options = await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value).sort());
        assert.deepEqual(options, owners, 'Team choices match actual surviving map owners');
        state.turns.push({ stage, settled, owners: owners.length, favorite: await picker.inputValue(), combatants });
        if (favorite) await recover();
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
        assert.equal(await rank(), before + 2, 'Signing adds the displayed two-point team rating bonus');
        assert.ok((await signs().evaluateAll(nodes => nodes.map(node => node.disabled))).every(Boolean), 'Immediate repeat signing is disabled');
        const logs = page.getByText(/Free agency: signed/);
        assert.equal(await logs.count(), state.signings.length + 1, 'One signing creates one visible transaction');
        if (await signs().count()) await signs().first().evaluate(node => node.click());
        assert.equal(await logs.count(), state.signings.length + 1, 'Disabled repeat creates no extra transaction');
        state.signings.push({ settled, favorite, label, before, after: await rank(), log: await logs.last().innerText() });
      };
      while (settled < 3) await settle();
      await sign();
      while (settled < 6) await settle();
      await sign();
      assert.equal(state.signings.length, 2, 'Two real cooldown cycles produce two signings');
      // A fresh zero-roll scout and replay use the actual bounded simulator.
      // No state or result is injected; choosing a favorite cannot alter this draw.
      await page.evaluate(() => window.__nbaFreeAgencyRoll(0));
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      favorite = ''; settled = 0; stage = 'scout';
      const originalTeams = await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value).sort());
      const initialMap = await main.locator('[data-layer="fill"]').evaluateAll(nodes => nodes.map(node => [node.dataset.region, node.dataset.owner]));
      const scout = await settle();
      const survivingTeams = await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value));
      const removed = originalTeams.filter(team => !survivingTeams.includes(team));
      assert.equal(removed.length, 1, 'Real zero-roll scout conquers exactly one defender');
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      assert.deepEqual(await picker.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value).sort()), originalTeams, 'Replay starts with the same fresh teams');
      assert.deepEqual(await main.locator('[data-layer="fill"]').evaluateAll(nodes => nodes.map(node => [node.dataset.region, node.dataset.owner])), initialMap, 'Replay starts with the same fresh region owners');
      favorite = removed[0]; settled = 0; stage = 'replay';
      await change(favorite);
      const replay = await settle();
      assert.deepEqual(replay, scout, 'Fresh scout and replay have identical combatants, winner and resulting map');
      assert.equal(state.elimination?.team, removed[0], 'Scouted defender is the actual eliminated favorite');
      assert.equal(state.elimination?.stage, 'replay', 'Replay exercises the eliminated-favorite recovery');
      assert.equal(state.turns.length, 8, 'Six signing battles plus one scout and one replay are sufficient');
      state.scoutReplay = { eliminatedTeam: removed[0], combatants: scout.combatants };
      assert.equal(await page.evaluate(() => localStorage.getItem('round530-protected-save')), 'keep unrelated game data', 'Signing preserves unrelated game data');
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      assert.equal(await picker.inputValue(), '', 'A fresh Arcade run clears the favorite');
      assert.equal(await page.getByText(/Free agency: signed/).count(), 0, 'A fresh Arcade run clears signing transactions');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      state.passed = true;
      console.log(`PASS ${width}: eight real battles, two signings, phase/cooldown locks, live team changes and identical scout/replay elimination recovery`);
    } catch (error) {
      state.error = error.stack;
      await capture(page, state, 'failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  console.log(`playConquestNbaFreeAgency: PASS ${results.length} viewports; artifacts=${output}`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
