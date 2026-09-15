/** Round 532: actual transfers retain their existing NFL card metadata.
 * No hook state or battle result is substituted. Requests are exact local fixtures.
 * NFL_ROSTER_CONTROL=card removes an acquired roster position from the actual DOM.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NFL_ROSTER_BASE || 'http://127.0.0.1:4209');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NFL_ROSTER_CONTROL || '';
assert.ok(['', 'card'].includes(control), 'Unknown control');
const widths = (process.env.NFL_ROSTER_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-roster-'));
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
console.log(`playConquestNflRoster: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
try {
  for (const width of widths) {
    const state = { width, violations: [], runtime: [], localFailures: [], requests: [], screenshots: [], transfers: [], battles: [] };
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
      let forced = 0.1, next = null;
      window.__nflRosterRoll = (value, first = null) => { forced = value; next = first; };
      Math.random = () => { if (next !== null) { const value = next; next = null; return value; } return forced; };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Signing Fixture');
      localStorage.setItem('round532-protected-save', 'keep unrelated game data');
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
      };
      await enter();
      const openBattle = async (forced, first = null) => {
        const start = main.getByRole('button', { name: /Start Conquest|Next Battle/ });
        await start.waitFor();
        await start.evaluate((node, rolls) => node.addEventListener('click', () => {
          window.__nflRosterRoll(rolls.forced, rolls.first);
        }, { once: true, capture: true }), { forced, first });
        await start.click();
        await main.getByRole('button', { name: /Skip to result/ }).waitFor({ timeout: 17000 });
        await main.getByRole('button', { name: /Skip to result/ }).click();
        const battle = {
          attacker: await main.getByText('Attacker', { exact: true }).locator('..').innerText(),
          defender: await main.getByText('Defender', { exact: true }).locator('..').innerText(),
          result: await main.getByText('Final Score', { exact: true }).locator('..').innerText(),
        };
        state.battles.push(battle);
        await main.getByRole('button', { name: /Choose Your Player/ }).click();
        await page.getByRole('dialog', { name: /Steal a Player!/ }).waitFor();
        return battle;
      };
      const dialog = page.getByRole('dialog', { name: /Steal a Player!/ });
      const player = 'Micah Parsons';
      const card = title => dialog.getByText(title, { exact: true }).locator('..').getByRole('row', { name: new RegExp(player) });
      const values = row => row.getByRole('cell').allTextContents();
      const recruit = () => dialog.getByRole('button', { name: new RegExp(player) });
      const transfer = async () => {
        const candidate = await recruit().innerText();
        await recruit().click();
        await main.getByRole('button', { name: /Next Battle/ }).waitFor();
        state.transfers.push(candidate);
        assert.ok(await main.getByText(`⚔️ Turn ${state.transfers.length}`, { exact: true }).isVisible(), 'Actual transfer settles one real battle');
      };
      const first = await openBattle(0.1);
      assert.equal(first.attacker, 'ATTACKER\nLions', 'First real battle uses the deterministic Detroit attacker');
      assert.equal(first.defender, 'DEFENDER\nPackers\n+2 home edge', 'First real battle uses the deterministic Green Bay defender');
      assert.match(first.result, /Detroit Lions win!/, 'The donor loses the real first battle');
      const original = await values(card("Packers's Roster"));
      assert.equal(original[0], player, 'The original donor card is the selected existing player');
      assert.ok(original.slice(1).every(value => value && value !== '-'), 'The original card supplies position, rating and key stat');
      const originalOption = await recruit().innerText();
      await transfer();
      // Only RNG is fixed: Detroit is picked from the 31 actual surviving teams,
      // then a high result roll produces a real away loss without removing it.
      const second = await openBattle(0.999, 0.07);
      assert.equal(second.attacker, 'ATTACKER\nLions', 'The acquired player participates with the real recipient');
      assert.doesNotMatch(second.result, /Detroit Lions win!/, 'The recipient loses the real second battle');
      const acquired = card("Lions's Roster");
      const assertCard = async () => assert.deepEqual(await values(acquired), original, 'Transferred roster card matches its original position, rating and key stat');
      if (control === 'card') {
        await acquired.getByRole('cell').nth(1).evaluate(node => { window.__originalPosition = node.textContent; node.textContent = 'CONTROL MISSING POSITION'; });
        assert.equal(await acquired.getByRole('cell').nth(1).textContent(), 'CONTROL MISSING POSITION', 'Control changes the actual acquired card cell');
        await assert.rejects(assertCard, error => error.name === 'AssertionError' && /Transferred roster card matches/.test(error.message));
        await acquired.getByRole('cell').nth(1).evaluate(node => { node.textContent = window.__originalPosition; delete window.__originalPosition; });
        state.control = 'missing acquired card position rejected; original restored';
      }
      await assertCard();
      await acquired.scrollIntoViewIfNeeded(); await capture(page, state, 'acquired-roster');
      assert.equal(await recruit().innerText(), originalOption, 'Transferred steal option retains its original metadata');
      await recruit().scrollIntoViewIfNeeded(); await capture(page, state, 'acquired-steal-option');
      await transfer();
      assert.equal(state.battles.length, 2, 'Exactly two real battles exercise acquisition and a later steal');
      assert.equal(state.transfers.length, 2, 'Both selections complete actual transfers');
      assert.equal(await page.evaluate(() => localStorage.getItem('round532-protected-save')), 'keep unrelated game data', 'Transfers preserve unrelated saved data');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      state.original = original;
      state.passed = true;
      console.log(`PASS ${width}: two actual battles/transfers, acquired roster and steal metadata retained${control ? ', DOM negative control rejected' : ''}`);
    } catch (error) {
      state.error = error.stack;
      await capture(page, state, 'failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  console.log(`playConquestNflRoster: PASS ${results.length} viewports; artifacts=${output}`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
