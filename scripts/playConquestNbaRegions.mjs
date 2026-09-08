/** Round 526: local signed-out Arcade smoke, not proof of hidden hook keys.
 * The hook tests own that defect and real reset. This walks rendered regions,
 * a seeded battle, its result and player choice, then a reload restart.
 * NBA_REGIONS_BASE defaults to loopback 4204; NBA_REGIONS_CONTROL=map removes
 * exactly one rendered region, proves the map assertion fails, then restores it.
 * All backend replies are synthetic reads, including the exact global_rank RPC.
 * All other POSTs, writes and WebSockets fail closed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NBA_REGIONS_BASE || 'http://127.0.0.1:4204');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NBA_REGIONS_CONTROL || '';
assert.ok(['', 'map'].includes(control), 'Unknown control');
const widths = (process.env.NBA_REGIONS_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(w => [390, 1440].includes(w)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nba-regions-'));
const results = [];
const paramsKey = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
live.append('start_at', 'gte.2026-09-08T05:30:00.000Z');
live.append('start_at', 'lte.2026-09-09T13:30:00.000Z');
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });

async function mapState(page) {
  return page.locator('[data-map="conquest-region-map"][data-sport="nba"]').evaluate(map => ({
    regions: [...map.querySelectorAll('path[data-layer="fill"]')].map(node => ({ id: node.dataset.region, owner: node.dataset.owner })),
    bleed: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    width: map.getBoundingClientRect().width,
  }));
}
function assertMap(state) {
  assert.equal(state.regions.length, 58, 'NBA map must render 58 regions');
  assert.equal(new Set(state.regions.map(r => r.id)).size, 58, 'NBA map regions must be unique');
  assert.ok(state.regions.every(r => !['CA_N', 'TX_S'].includes(r.id)), 'NFL-only regions must not render');
  assert.ok(state.width > 250 && state.bleed <= 2, 'Map must fit the page');
}
async function enterArcade(page) {
  await page.getByRole('button', { name: /Arcade The original mode/ }).click();
  const help = page.getByRole('button', { name: 'Start Conquering!', exact: true });
  if (await help.isVisible()) await help.click();
  await page.getByRole('button', { name: /Start Conquest/ }).waitFor();
}

console.log(`playConquestNbaRegions: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
try {
  for (const width of widths) {
    const state = { width, violations: [], runtime: [], localFailures: [], requests: [], screenshots: [], turns: [] };
    results.push(state);
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
      isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block', locale: 'en-US' });
    await context.routeWebSocket('**/*', socket => { state.violations.push(`WebSocket ${socket.url()}`); socket.close(); });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const deny = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': base.origin }, body: JSON.stringify(data) });
      if (url.origin === backend && url.pathname === '/rest/v1/rpc/global_rank' && !url.search && req.method() === 'POST'
        && JSON.stringify(req.postDataJSON()) === JSON.stringify({ p_player: 'Local Court Fixture', p_period: 'today', p_games: null })) {
        state.requests.push('synthetic POST read global_rank'); return json([]);
      }
      if (!['GET', 'HEAD'].includes(req.method())) return deny(`Blocked ${req.method()} ${url.origin}${url.pathname}`);
      if (url.origin === base.origin) return route.continue();
      if (url.origin === backend) {
        state.requests.push(`${req.method()} ${url.pathname}?${url.searchParams}`);
        if (req.method() === 'GET' && url.pathname === '/rest/v1/live_scores' && paramsKey(url.searchParams) === paramsKey(live)) {
          return json([]);
        }
        if (req.method() === 'GET' && url.pathname === '/rest/v1/game_completions' && paramsKey(url.searchParams)
          === paramsKey(new URLSearchParams({ select: 'game', player_name: 'eq.Local Court Fixture', completed_on: 'eq.2026-09-08' }))) return json([]);
        return deny(`Unexpected backend ${req.method()} ${url.href}`);
      }
      if (url.hostname.endsWith('.supabase.co')) return deny(`Unexpected backend host ${url.href}`);
      return route.abort('blockedbyclient');
    });
    await context.addInitScript(({ origin }) => {
      if (location.origin !== origin) return;
      const NativeDate = Date, started = NativeDate.now(), fixed = NativeDate.parse('2026-09-08T17:30:00.000Z');
      window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed + NativeDate.now() - started; } };
      let seed = 526;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Court Fixture');
    }, { origin: base.origin });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => state.runtime.push(error.message));
    page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
    page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push(`HTTP ${res.status()} ${res.url()}`); });
    try {
      await page.goto(new URL('/conquest-nba', base).href, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.setItem('round526-protected-save', 'keep this unrelated save'));
      await enterArcade(page);
      state.initial = await mapState(page); assertMap(state.initial);
      assert.equal(new Set(state.initial.regions.map(r => r.owner).filter(Boolean)).size, 30, 'Initial map must have 30 teams');
      if (control) {
        const region = page.locator('[data-map="conquest-region-map"] path[data-layer="fill"]').first();
        await region.evaluate(node => { window.__nbaRemovedRegion = { node, parent: node.parentNode, next: node.nextSibling }; node.remove(); });
        assert.equal((await mapState(page)).regions.length, 57, 'Control must change one rendered region');
        const altered = await mapState(page);
        assert.throws(() => assertMap(altered), { name: 'AssertionError', message: /NBA map must render 58 regions/ });
        await page.evaluate(() => { const { node, parent, next } = window.__nbaRemovedRegion; parent.insertBefore(node, next); delete window.__nbaRemovedRegion; });
        assertMap(await mapState(page)); state.control = 'one missing region rejected, restored';
      }
      let playedBattle = false;
      for (let turn = 0; turn < 6 && !playedBattle; turn++) {
        await page.getByRole('button', { name: turn === 0 ? /Start Conquest/ : /Next Battle/ }).click();
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Skip to result|Save for Later|Next Battle/.test(b.textContent)), undefined, { timeout: 15000 });
        const skip = page.getByRole('button', { name: /Skip to result/ });
        if (await skip.isVisible()) {
          await skip.click();
          await page.getByText('Final Score', { exact: true }).waitFor();
          const result = await page.locator('#dukb-main').innerText();
          assert.match(result, /win!/); assert.ok(!/undefined|NaN|claimed (CA_N|TX_S)/.test(result), 'Battle result must be readable');
          state.result = await page.getByText('Final Score', { exact: true }).locator('../..').innerText();
          const shot = path.join(output, `${width}-result.png`);
          assert.deepEqual(state.violations, [], 'No transport violation before screenshot');
          await page.getByText('Final Score', { exact: true }).locator('../..').evaluate(async node => {
            await Promise.all(node.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished));
          });
          await page.screenshot({ path: shot }); state.screenshots.push(shot);
          await page.getByRole('button', { name: /Choose Your Player/ }).click();
          const dialog = page.getByRole('dialog');
          await dialog.getByRole('heading', { name: /Steal a Player/ }).waitFor();
          await dialog.locator('button.w-full').first().click();
          await page.getByRole('button', { name: /Next Battle/ }).waitFor();
          playedBattle = true;
        } else {
          const save = page.getByRole('button', { name: /Save for Later/ });
          if (await save.isVisible()) await save.click();
          await page.getByRole('button', { name: /Next Battle/ }).waitFor();
        }
        const settled = await mapState(page); assertMap(settled);
        assert.ok(await page.getByText(`⚔️ Turn ${turn + 1}`, { exact: true }).isVisible(), 'Settled action advances exactly one turn');
        state.turns.push(settled);
      }
      assert.ok(playedBattle, 'Seeded walk must reach an actual battle, not only neutral claims');
      assert.equal(await page.evaluate(() => localStorage.getItem('round526-protected-save')), 'keep this unrelated save', 'Unrelated save remains before reload');
      await page.reload({ waitUntil: 'domcontentloaded' }); await enterArcade(page);
      state.restarted = await mapState(page); assertMap(state.restarted);
      assert.deepEqual(state.restarted.regions, state.initial.regions, 'Reload restart restores initial visible owners');
      assert.ok(await page.getByText('⚔️ Turn 0', { exact: true }).isVisible(), 'Reload restart resets turn');
      assert.equal(await page.evaluate(() => localStorage.getItem('round526-protected-save')), 'keep this unrelated save', 'Unrelated local save remains');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      await page.locator('[data-map="conquest-region-map"]').scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const shot = path.join(output, `${width}-restart.png`); await page.screenshot({ path: shot }); state.screenshots.push(shot);
      console.log(`PASS ${width}: 58 visible regions, actual battle, turn advance, reload restart${control ? ', map control fired' : ''}`);
    } catch (error) { state.error = error.stack; throw error; }
    finally { await context.close(); }
  }
  console.log(`playConquestNbaRegions: PASS ${results.length} viewports; zero backend writes or runtime errors`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
