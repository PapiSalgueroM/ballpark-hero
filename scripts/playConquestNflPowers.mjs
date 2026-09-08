/** Round 533: an earned NFL power can be saved, reopened and resolved.
 * No hook state or battle result is substituted. Requests are exact local fixtures.
 * NFL_POWERS_CONTROL=saved removes the actual saved-power click handler.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NFL_POWERS_BASE || 'http://127.0.0.1:4210');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NFL_POWERS_CONTROL || '';
assert.ok(['', 'saved'].includes(control), 'Unknown control');
const widths = (process.env.NFL_POWERS_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-powers-'));
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
console.log(`playConquestNflPowers: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
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
      let seed = 29, forced = null;
      window.__nflPowerSeed = value => { seed = value; forced = null; };
      window.__nflPowerForce = value => { forced = value; };
      Math.random = () => {
        if (forced !== null) return forced;
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
        return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
      };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Signing Fixture');
      localStorage.setItem('round533-protected-save', 'keep unrelated game data');
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
        await arcade.evaluate(node => node.addEventListener('click', () => window.__nflPowerSeed(29), { once: true, capture: true }));
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
        await page.evaluate(() => window.__nflPowerForce(null));
        await main.getByRole('button', { name: /Start Conquest|Next Battle/ }).click();
        // Start selects its target and simulates battles synchronously. Only a
        // later, genuinely earned lightning reward uses this fixed random draw.
        await page.evaluate(() => window.__nflPowerForce(0.5));
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
      const saved = main.getByRole('button', { name: `Open ${owner} saved Upgrade, slot 1`, exact: true });
      const bank = main.locator('button[aria-label^="Open "][aria-label*=" saved "]');
      const stableMap = await mapState();
      const checkPending = async () => {
        await reward.waitFor();
        assert.equal(await reward.getByText('Awarded to', { exact: true }).locator('..').locator('span').last().innerText(), owner, 'Reopened power keeps its recipient');
        assert.equal(await main.getByRole('button', { name: /Start Conquest|Next Battle/ }).count(), 0, 'A pending card blocks another turn');
        assert.ok(await main.locator('select[aria-label="Pick your team"]').isDisabled(), 'A pending card locks free-agency team changes');
        assert.equal(await bank.count(), 0, 'The reopened card leaves its saved slot');
        assert.deepEqual(await mapState(), stableMap, 'Saving and cancelling do not change map ownership');
      };
      await capture(page, state, 'earned-card');
      await reward.getByRole('button', { name: 'Close', exact: true }).click();
      await next.waitFor(); await saved.waitFor();
      assert.equal(await bank.count(), 1, 'Closing the award saves one card');
      await saved.scrollIntoViewIfNeeded();
      const size = await saved.boundingBox();
      assert.ok(size && size.width >= 32 && size.height >= 32, 'Saved card has a usable touch target');
      await capture(page, state, 'saved-card');
      if (control === 'saved') {
        await saved.evaluate(node => { const clone = node.cloneNode(true); window.__deadSaved = { node, clone }; node.replaceWith(clone); });
        assert.equal(await saved.evaluate(node => node === window.__deadSaved.clone), true, 'Control replaces the actual saved-card button');
        await saved.click();
        await assert.rejects(() => reward.waitFor({ timeout: 1800 }), error => error.name === 'TimeoutError' && /Power-Up Found/.test(error.message));
        await page.evaluate(() => { const { node, clone } = window.__deadSaved; clone.replaceWith(node); delete window.__deadSaved; });
        state.control = 'dead saved button rejected; original restored';
      }
      await saved.click(); await checkPending();
      await page.keyboard.press('Escape'); await next.waitFor(); await saved.waitFor();
      assert.equal(await bank.count(), 1, 'Escape re-saves one card without duplication');
      await saved.click(); await checkPending();
      const picker = page.getByRole('dialog', { name: /Upgrade a Player/ });
      for (const exit of ['Close', 'Escape', 'Back to Power']) {
        await reward.getByRole('button', { name: /Use Now/ }).click(); await picker.waitFor();
        const description = await picker.getAttribute('aria-describedby');
        assert.ok((await page.locator(`[id="${description}"]`).innerText()).includes(owner), 'Picker describes the retained power owner');
        const candidates = picker.getByRole('button').filter({ hasNotText: /Close|Random player|Back to Power/ });
        assert.ok(await candidates.count() > 0, 'The real owner has selectable roster players');
        if (exit === 'Back to Power') await capture(page, state, 'upgrade-picker');
        if (exit === 'Escape') await page.keyboard.press('Escape');
        else await picker.getByRole('button', { name: exit, exact: true }).click();
        await checkPending();
      }
      await reward.getByRole('button', { name: /Save for Later/ }).click(); await next.waitFor(); await saved.waitFor();
      assert.equal(await bank.count(), 1, 'Explicit Save returns the same card to its bank');
      await saved.click(); await checkPending();
      await reward.getByRole('button', { name: /Use Now/ }).click(); await picker.waitFor();
      const candidate = picker.getByRole('button').filter({ hasNotText: /Close|Random player|Back to Power/ }).first();
      const player = await candidate.locator('span').first().innerText();
      await candidate.click(); await next.waitFor();
      assert.equal(await bank.count(), 0, 'Using the power consumes the saved card once');
      assert.equal(await main.getByText(/upgraded to 99 OVR!/).count(), 1, 'One actual upgrade is logged');
      const upgrade = await main.getByText(/boosted to 99 OVR for/).innerText();
      assert.ok(upgrade.includes(owner) && upgrade.includes(player), 'The upgrade is credited to the selected player and saved owner');
      assert.deepEqual(await mapState(), stableMap, 'The upgrade does not silently claim territory');
      state.used = { player, owner, turn };
      assert.equal(await page.evaluate(() => localStorage.getItem('round533-protected-save')), 'keep unrelated game data', 'Power actions preserve unrelated storage');
      await main.getByRole('button', { name: 'Modes', exact: true }).click(); await enter();
      assert.equal(await bank.count(), 0, 'A fresh run clears saved powers');
      assert.equal(await main.getByText(/boosted to 99 OVR for/).count(), 0, 'A fresh run clears the used upgrade');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      state.passed = true;
      console.log(`PASS ${width}: earned Upgrade in ${turn} real turns, saved/reopened, five dismissal paths, one owner upgrade${control ? ', dead saved control rejected' : ''}`);
    } catch (error) {
      state.error = error.stack;
      await capture(page, state, 'failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  console.log(`playConquestNflPowers: PASS ${results.length} viewports; artifacts=${output}`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
