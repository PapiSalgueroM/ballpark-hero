/** Round 539: World XI rejects an incomplete required pool and recovers by retry.
 * All database responses are local synthetic fixtures. No game state is injected.
 * WORLD_XI_POOL_CONTROL=actions blocks actual Retry and Draw clicks, proves each
 * exact missing transition is detected, then restores the real controls.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';
import { worldXiPoolFixture } from './lib/worldXiPoolFixture.mjs';

const base = new URL(process.env.WORLD_XI_POOL_BASE || 'http://127.0.0.1:4215');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.WORLD_XI_POOL_CONTROL || '';
assert.ok(['', 'actions'].includes(control), 'Unknown browser control');
const widths = (process.env.WORLD_XI_POOL_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const scenarios = control ? ['current'] : ['current', 'previous', 'history'];
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-world-xi-pool-'));
const results = [];
const fixture = worldXiPoolFixture();
const paramsKey = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
live.append('start_at', 'gte.2026-09-08T05:30:00.000Z');
live.append('start_at', 'lte.2026-09-09T13:30:00.000Z');
const poolSelect = 'player_name,nationality,position,club,market_value_usd,year,age';
const expectedCurrent = offset => new URLSearchParams({ select: poolSelect, year: 'eq.2026', market_value_usd: 'gt.0', order: 'id.asc', offset: String(offset), limit: '1000' });
const expectedPrevious = new URLSearchParams({ select: poolSelect, year: 'eq.2025', market_value_usd: 'gt.0', order: 'market_value_usd.desc', limit: '1000' });
const expectedHistory = new URLSearchParams({ select: 'player_name,secondary_positions,primary_position', limit: '1000' });
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
async function capture(page, state, label) {
  await page.evaluate(async () => { await Promise.allSettled(document.getAnimations()
    .filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished)); });
  const file = path.join(output, `${state.width}-${state.scenario}-${label}.png`);
  await page.screenshot({ path: file, animations: 'disabled' }); state.screenshots.push(file);
}
async function noOverflow(page, state, phase) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }));
  assert.ok(Math.max(dimensions.body, dimensions.document) <= dimensions.width + 1, 'The World XI state fits the viewport without horizontal overflow');
  state.layouts.push({ phase, ...dimensions });
}
console.log(`playWorldXiPool: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
try {
  for (const width of widths) for (const scenario of scenarios) {
    const state = { width, scenario, violations: [], runtime: [], consoleErrors: [], localFailures: [], requests: [], screenshots: [], layouts: [], controls: [] };
    results.push(state);
    let failing = true;
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
      isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block', locale: 'en-US' });
    await context.routeWebSocket('**/*', socket => { state.violations.push(`WebSocket ${socket.url()}`); socket.close(); });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const deny = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
      const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': base.origin }, body: JSON.stringify(data) });
      if (url.origin === backend && url.pathname === '/rest/v1/rpc/global_rank' && !url.search && req.method() === 'POST'
        && JSON.stringify(req.postDataJSON()) === JSON.stringify({ p_player: 'Local Pool Fixture', p_period: 'today', p_games: null })) {
        state.requests.push({ type: 'site-read', name: 'global_rank' }); return json([]);
      }
      if (!['GET', 'HEAD'].includes(req.method())) return deny(`Blocked ${req.method()} ${url.origin}${url.pathname}`);
      if (url.origin === base.origin) return route.continue();
      if (url.origin === backend) {
        if (req.method() !== 'GET') return deny(`Unexpected backend method ${req.method()}`);
        if (url.pathname === '/rest/v1/live_scores' && paramsKey(url.searchParams) === paramsKey(live)) {
          state.requests.push({ type: 'site-read', name: 'live_scores' }); return json([]);
        }
        if (url.pathname === '/rest/v1/game_completions' && paramsKey(url.searchParams)
          === paramsKey(new URLSearchParams({ select: 'game', player_name: 'eq.Local Pool Fixture', completed_on: 'eq.2026-09-08' }))) {
          state.requests.push({ type: 'site-read', name: 'game_completions' }); return json([]);
        }
        let key, rows;
        if (url.pathname === '/rest/v1/player_market_values') {
          const offset = Number(url.searchParams.get('offset'));
          if (Number.isInteger(offset) && offset >= 0 && offset < 8000 && offset % 1000 === 0
            && paramsKey(url.searchParams) === paramsKey(expectedCurrent(offset))) {
            key = `current:${offset}`; rows = fixture.current.slice(offset, offset + 1000);
          } else if (paramsKey(url.searchParams) === paramsKey(expectedPrevious)) {
            key = 'previous'; rows = fixture.previous;
          }
        } else if (url.pathname === '/rest/v1/player_verified_positions' && paramsKey(url.searchParams) === paramsKey(expectedHistory)) {
          key = 'history'; rows = fixture.verified;
        }
        if (key) {
          const refused = failing && key === ({ current: 'current:1000', previous: 'previous', history: 'history' })[scenario];
          state.requests.push({ type: 'pool', key, status: refused ? 503 : 200, rows: refused ? 0 : rows.length });
          return refused ? json({ code: 'SYNTHETIC_UNAVAILABLE', message: 'Synthetic fixture unavailable' }, 503) : json(rows);
        }
        return deny(`Unexpected backend ${req.method()} ${url.href}`);
      }
      if (url.hostname.endsWith('.supabase.co')) return deny(`Unexpected backend host ${url.href}`);
      state.requests.push({ type: 'external-block', origin: url.origin, path: url.pathname });
      return route.abort('blockedbyclient');
    });
    await context.addInitScript(({ origin }) => {
      if (location.origin !== origin) return;
      const NativeDate = Date, started = NativeDate.now(), fixed = NativeDate.parse('2026-09-08T17:30:00.000Z');
      window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed + NativeDate.now() - started; } };
      let seed = 39;
      Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let n = Math.imul(seed ^ (seed >>> 15), 1 | seed); n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n; return ((n ^ (n >>> 14)) >>> 0) / 4294967296; };
      localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('dukb-guest-handle', 'Local Pool Fixture');
      localStorage.setItem('round539-protected-save', 'keep unrelated game data');
    }, { origin: base.origin });
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    page.on('pageerror', error => state.runtime.push(error.message));
    page.on('console', message => { if (message.type() === 'error') state.consoleErrors.push({ text: message.text(), location: message.location() }); });
    page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
    page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push(`HTTP ${res.status()} ${res.url()}`); });
    try {
      await page.goto(new URL('/world-xi', base).href, { waitUntil: 'domcontentloaded' });
      const main = page.locator('main#dukb-main');
      const retry = main.getByRole('button', { name: 'Try again', exact: true });
      const draw = main.getByRole('button', { name: 'Draw my 11 nations', exact: true });
      const input = main.getByRole('textbox', { name: 'Name a player for this slot', exact: true });
      const poolRequests = () => state.requests.filter(item => item.type === 'pool');
      const setupPresent = async () => assert.ok(await draw.isVisible() && await main.getByText('12 nations are in the draw. Each of your 11 slots gets a different one.', { exact: true }).isVisible(), 'Retry loads the complete twelve-nation setup');
      const playingPresent = async () => assert.ok(await input.isVisible() && await main.getByText(/^Slot 1 of 11/).isVisible(), 'The real Draw button starts the first playable slot');
      const blockClick = async button => button.evaluate(node => {
        const block = event => { window.__poolControl.hits++; event.preventDefault(); event.stopImmediatePropagation(); };
        window.__poolControl = { node, block, hits: 0 }; node.addEventListener('click', block, true);
      });
      const restoreClick = async () => {
        const hits = await page.evaluate(() => { const { node, block, hits } = window.__poolControl; node.removeEventListener('click', block, true); delete window.__poolControl; return hits; });
        assert.equal(hits, 1, 'The negative control intercepted one actual DOM click');
      };
      if (scenario !== 'history') {
        await retry.waitFor();
        assert.equal(await main.getByText("Couldn't load the player database right now.", { exact: true }).count(), 1, 'A missing required page displays the existing retry error');
        assert.equal(await draw.count(), 0, 'An incomplete required pool cannot authorize a new game');
        assert.ok(poolRequests().some(request => request.status === 503), 'The required failure was actually served');
        await noOverflow(page, state, 'error'); await retry.scrollIntoViewIfNeeded(); await capture(page, state, 'error');
        failing = false;
        const before = poolRequests().length;
        if (control) {
          await blockClick(retry); await retry.click();
          assert.equal(poolRequests().length, before, 'The blocked Retry click does not reload the pool');
          await assert.rejects(setupPresent, error => error.name === 'AssertionError' && error.message === 'Retry loads the complete twelve-nation setup');
          await restoreClick(); state.controls.push('dead retry rejected and restored');
        }
        await retry.click(); await draw.waitFor();
        assert.equal(poolRequests().length, before + 10, 'Retry reissues all eight current pages, previous extras and optional history');
        assert.ok(poolRequests().slice(before).every(request => request.status === 200), 'The retry uses only restored successful responses');
      } else {
        await draw.waitFor();
        assert.ok(poolRequests().some(request => request.key === 'history' && request.status === 503), 'Optional history was actually unavailable');
        assert.equal(await retry.count(), 0, 'Optional history failure preserves the usable base pool');
      }
      await setupPresent();
      assert.equal(poolRequests().filter(request => request.key === 'current:1000' && request.status === 200).at(-1)?.rows, 1000, 'The recovered setup includes the whole required middle page');
      await noOverflow(page, state, 'setup'); await draw.scrollIntoViewIfNeeded(); await capture(page, state, 'setup');
      if (control) {
        await blockClick(draw); await draw.click();
        await assert.rejects(playingPresent, error => error.name === 'AssertionError' && error.message === 'The real Draw button starts the first playable slot');
        await restoreClick(); state.controls.push('dead draw rejected and restored');
      }
      await draw.click(); await input.waitFor();
      await playingPresent();
      await page.waitForFunction(() => !document.querySelector('input[aria-label="Name a player for this slot"]')?.disabled);
      const instruction = await main.getByText(/^Name a player from .* who can play /).innerText();
      const match = instruction.match(/^Name a player from (.+) who can play (.+)\. Accepts (.+)\.$/);
      assert.ok(match, 'The playable slot names its nation and accepted positions');
      const [, country, slot, accepts] = match;
      const candidate = fixture.current.slice(1000, 2000).find(row => row.nationality === country && accepts.split(' / ').includes(row.position));
      assert.ok(candidate, 'The formerly missing middle page contains a primary-position match for the visible slot');
      await input.fill(candidate.player_name);
      const option = main.getByRole('button').filter({ hasText: candidate.player_name });
      await option.waitFor(); await option.click();
      await main.getByText(/^Slot 2 of 11/).waitFor();
      assert.equal(await main.getByText('Filled 1/11', { exact: true }).count(), 1, 'A valid player choice fills exactly one slot');
      state.choice = { country, slot, player: candidate.player_name, position: candidate.position, filled: 1 };
      await page.waitForFunction(() => !document.querySelector('input[aria-label="Name a player for this slot"]')?.disabled);
      await input.scrollIntoViewIfNeeded(); await noOverflow(page, state, 'first-pick'); await capture(page, state, 'first-pick');
      await main.getByText('Filled 1/11', { exact: true }).evaluate(node => node.scrollIntoView({ block: 'start' }));
      await capture(page, state, 'filled-squad');
      assert.equal(await page.evaluate(() => localStorage.getItem('round539-protected-save')), 'keep unrelated game data', 'Pool recovery preserves unrelated storage');
      state.unexpectedConsoleErrors = state.consoleErrors.filter(({ text, location }) => {
        let url; try { url = new URL(location.url); } catch { return true; }
        if (/^Failed to load resource: the server responded with a status of 503 \(.*\)$/.test(text)
          && url.origin === backend && poolRequests().some(request => request.status === 503)) return false;
        if (/^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT(?:\.Inspector)?$/.test(text)
          && state.requests.some(request => request.type === 'external-block' && request.origin === url.origin && request.path === url.pathname)) return false;
        return true;
      });
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []); assert.deepEqual(state.unexpectedConsoleErrors, []);
      state.passed = true; console.log(`PASS ${width} ${scenario}: actual pool requests, authorized setup and one valid UI pick`);
    } catch (error) {
      state.error = error.stack; await capture(page, state, 'failure').catch(() => {}); throw error;
    } finally { await context.close(); }
  }
  console.log(`playWorldXiPool: PASS ${results.length} browser cases; artifacts=${output}`);
} finally { await browser.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2)); }
