/** Round 527: real built Arcade power flow on phone and desktop.
 * Battle simulation and UI are real. Seeded randomness selects each power only
 * after an actual conquest; no hook state or battle result is substituted.
 * All transport is intercepted, with only the exact synthetic reads below.
 * NBA_POWERS_CONTROL=saved proves a dead saved button fails the reopen check.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.NBA_POWERS_BASE || 'http://127.0.0.1:4205');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.NBA_POWERS_CONTROL || '';
assert.ok(['', 'saved'].includes(control), 'Unknown control');
const widths = (process.env.NBA_POWERS_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(w => [390, 1440].includes(w)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nba-powers-'));
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
  await page.getByRole('button', { name: /Arcade Play simulated battles/ }).click();
  const help = page.getByRole('button', { name: 'Start Conquering!', exact: true });
  if (await help.isVisible()) await help.click();
  await page.getByRole('button', { name: /Start Conquest/ }).waitFor();
}
async function capture(page, state, name) {
  await page.evaluate(async () => {
    await Promise.allSettled(document.getAnimations()
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished));
  });
  const shot = path.join(output, state.width + '-' + name + '.png');
  await page.screenshot({ path: shot, animations: 'disabled' });
  state.screenshots.push(shot);
}

console.log(`playConquestNbaPowers: ${base.origin}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
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
      let seed = 527; let forced = null;
      window.__nbaPowerRoll = value => { forced = value; };
      Math.random = () => { if (forced !== null) return forced; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Court Fixture');
    }, { origin: base.origin });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => state.runtime.push(error.message));
    page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
    page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push(`HTTP ${res.status()} ${res.url()}`); });
    try {
      await page.goto(new URL('/conquest-nba', base).href, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.setItem('round527-protected-save', 'keep this unrelated save'));
      await enterArcade(page);
      state.initial = await mapState(page); assertMap(state.initial);
      assert.equal(new Set(state.initial.regions.map(r => r.owner).filter(Boolean)).size, 30, 'Initial map must have 30 teams');
      const wanted = ['Invincibility', 'Free Agent Signing', 'Upgrade', 'All-Time Great', 'Territory Steal'];
      let awarded = 0;
      for (let turn = 0; turn < 24 && awarded < wanted.length; turn++) {
        await page.getByRole('button', { name: turn === 0 ? /Start Conquest/ : /Next Battle/ }).click();
        await page.getByRole('button', { name: /Skip to result/ }).waitFor({ timeout: 16000 });
        await page.getByRole('button', { name: /Skip to result/ }).click();
        await page.getByRole('button', { name: /Choose Your Player/ }).click();
        await page.evaluate(roll => window.__nbaPowerRoll(roll), (awarded + 0.1) / 5);
        await page.getByRole('button', { name: 'Skip Player', exact: true }).click();
        await page.evaluate(() => window.__nbaPowerRoll(null));
        const rewardHeading = page.getByRole('heading', { name: /Team Power/ });
        await rewardHeading.or(page.getByRole('button', { name: /Next Battle/ })).first().waitFor();
        if (!await rewardHeading.isVisible()) continue;
        const card = page.getByRole('dialog');
        await card.getByRole('heading', { name: /Team Power/ }).waitFor();
        const label = wanted[awarded];
        assert.ok(await card.getByText(label, { exact: true }).isVisible(), 'Actual conquest awards requested power');
        const owner = await card.getByText('Belongs to', { exact: true }).locator('..').innerText();
        const ownerName = await card.getByText('Belongs to', { exact: true }).locator('..').locator('span').last().innerText();
        const before = await mapState(page); assertMap(before);
        await capture(page, state, 'reward-' + awarded);
        await card.getByRole('button', { name: /Save for Later/ }).click();
        const saved = page.getByRole('button', { name: new RegExp('^Open ' + ownerName + ' saved ' + label + ', slot ') }).last();
        const savedLabel = await saved.getAttribute('aria-label');
        await saved.scrollIntoViewIfNeeded();
        const size = await saved.boundingBox();
        assert.ok(size && size.width >= 32 && size.height >= 32, 'Saved control has usable touch target');
        if (awarded === 0) await capture(page, state, 'saved-power');
        const reopen = async () => {
          await saved.click();
          await page.getByRole('dialog').getByRole('heading', { name: /Team Power/ }).waitFor({ timeout: 1800 });
        };
        if (control === 'saved' && awarded === 0) {
          await saved.evaluate(node => { const clone = node.cloneNode(true); window.__deadSaved = { node, clone }; node.replaceWith(clone); });
          assert.equal(await saved.evaluate(node => node === window.__deadSaved.clone), true, 'Control changed the actual saved button');
          await assert.rejects(reopen, error => error.name === 'TimeoutError' && /Team Power/.test(error.message));
          await page.evaluate(() => { const { node, clone } = window.__deadSaved; clone.replaceWith(node); delete window.__deadSaved; });
          state.control = 'dead saved button rejected; original restored';
        }
        await reopen();
        assert.equal(await card.getByText('Belongs to', { exact: true }).locator('..').innerText(), owner, 'Saved power retains owner');
        if (await card.getByRole('button', { name: /Use Now/ }).isDisabled()) {
          await card.getByRole('button', { name: /Save for Later/ }).click();
          continue;
        }
        await card.getByRole('button', { name: /Use Now/ }).click();
        if ([1, 2, 4].includes(awarded)) {
          await card.getByRole('button', { name: 'Back to Power', exact: true }).waitFor();
          const choices = card.locator('button.w-full');
          assert.ok(await choices.count() > 0, 'Reward has eligible choices');
          const firstChoice = await choices.first().innerText();
          await capture(page, state, 'selection-' + awarded);
          await card.getByRole('button', { name: 'Back to Power', exact: true }).click();
          await card.getByRole('button', { name: /Use Now/ }).click();
          assert.equal(await card.locator('button.w-full').first().innerText(), firstChoice, 'Cancel keeps the same recipient choices');
          await card.locator('button.w-full').first().click();
          state.turns.push({ power: label, owner, chosen: firstChoice });
        } else state.turns.push({ power: label, owner });
        await page.getByRole('button', { name: /Next Battle/ }).waitFor();
        const after = await mapState(page); assertMap(after);
        if (awarded === 4) assert.equal(after.regions.filter((r, i) => r.owner !== before.regions[i].owner).length, 1, 'Territory power transfers exactly one visible region');
        else assert.deepEqual(after.regions, before.regions, 'Roster or shield power does not move territory');
        assert.equal(await page.getByRole('button', { name: savedLabel, exact: true }).count(), 0, 'Using reopened power removes its inventory entry');
        awarded++;
      }
      assert.equal(awarded, 5, 'Actual run must acquire and use all five powers');
      assert.equal(await page.evaluate(() => localStorage.getItem('round527-protected-save')), 'keep this unrelated save', 'Unrelated save remains before reload');
      await page.reload({ waitUntil: 'domcontentloaded' }); await enterArcade(page);
      state.restarted = await mapState(page); assertMap(state.restarted);
      assert.deepEqual(state.restarted.regions, state.initial.regions, 'Reload restart restores initial visible owners');
      assert.ok(await page.getByText('⚔️ Turn 0', { exact: true }).isVisible(), 'Reload restart resets turn');
      assert.equal(await page.evaluate(() => localStorage.getItem('round527-protected-save')), 'keep this unrelated save', 'Unrelated local save remains');
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []);
      await page.locator('[data-map="conquest-region-map"]').scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const shot = path.join(output, `${width}-restart.png`); await page.screenshot({ path: shot }); state.screenshots.push(shot);
      console.log(`PASS ${width}: all five powers awarded, banked, reopened and used; 58 regions; reload restart${control ? ', saved control fired' : ''}`);
    } catch (error) {
      state.error = error.stack;
      await page.screenshot({ path: path.join(output, width + '-failure.png') });
      throw error;
    }
    finally { await context.close(); }
  }
  console.log(`playConquestNbaPowers: PASS ${results.length} viewports; zero backend writes or runtime errors`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
