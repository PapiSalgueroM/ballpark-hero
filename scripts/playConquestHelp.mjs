/** Round 529: actual built NBA/NFL Arcade onboarding under isolated storage faults.
 * Only the route's help preference key can throw. Game state and other storage stay real.
 * External reads are exact synthetic fixtures; every other transport is blocked.
 * CONQUEST_HELP_CONTROL=manual proves a dead help button fails before restoring it.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.CONQUEST_HELP_BASE || 'http://127.0.0.1:4206');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const control = process.env.CONQUEST_HELP_CONTROL || '';
assert.ok(['', 'manual'].includes(control), 'Unknown control');
const select = (value, allowed) => {
  const choices = value.split(',');
  assert.ok(choices.length && new Set(choices).size === choices.length && choices.every(choice => allowed.includes(choice)), 'Unknown or duplicate case selection');
  return choices;
};
const widths = select(process.env.CONQUEST_HELP_WIDTHS || '390,1440', ['390', '1440']).map(Number);
const sports = select(process.env.CONQUEST_HELP_SPORTS || 'nba,nfl', ['nba', 'nfl']);
const scenarios = select(process.env.CONQUEST_HELP_SCENARIOS || 'missing,seen,read,write', ['missing', 'seen', 'read', 'write']);
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-conquest-help-'));
const results = [];
const paramsKey = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
live.append('start_at', 'gte.2026-09-08T05:30:00.000Z');
live.append('start_at', 'lte.2026-09-09T13:30:00.000Z');
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });

async function capture(page, state, label) {
  await page.evaluate(async () => {
    await Promise.allSettled(document.getAnimations()
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished));
  });
  const file = path.join(output, `${state.sport}-${state.scenario}-${state.width}-${label}.png`);
  await page.screenshot({ path: file, animations: 'disabled' });
  state.screenshots.push(file);
}

console.log(`playConquestHelp: ${base.origin}; sports=${sports}; scenarios=${scenarios}; widths=${widths}; control=${control || 'none'}; artifacts=${output}`);
try {
  for (const width of widths) for (const sport of sports) for (const scenario of scenarios) {
    const state = { sport, scenario, width, violations: [], runtime: [], localFailures: [], requests: [], blockedExternal: [], screenshots: [] };
    results.push(state);
    const routePath = sport === 'nba' ? '/conquest-nba' : '/conquest';
    const helpKey = sport === 'nba' ? 'conquest-nba-how-to-play-seen' : 'conquest-how-to-play-seen';
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
      isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block', locale: 'en-US' });
    await context.routeWebSocket('**/*', socket => { state.violations.push(`WebSocket ${socket.url()}`); socket.close(); });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const deny = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': base.origin }, body: JSON.stringify(data) });
      if (url.origin === backend && url.pathname === '/rest/v1/rpc/global_rank' && !url.search && req.method() === 'POST'
        && JSON.stringify(req.postDataJSON()) === JSON.stringify({ p_player: 'Local Help Fixture', p_period: 'today', p_games: null })) {
        state.requests.push('synthetic POST read global_rank'); return json([]);
      }
      if (!['GET', 'HEAD'].includes(req.method())) return deny(`Blocked ${req.method()} ${url.origin}${url.pathname}`);
      if (url.origin === base.origin) return route.continue();
      if (url.origin === backend) {
        state.requests.push(`${req.method()} ${url.pathname}?${url.searchParams}`);
        if (req.method() === 'GET' && url.pathname === '/rest/v1/live_scores' && paramsKey(url.searchParams) === paramsKey(live)) return json([]);
        if (req.method() === 'GET' && url.pathname === '/rest/v1/game_completions' && paramsKey(url.searchParams)
          === paramsKey(new URLSearchParams({ select: 'game', player_name: 'eq.Local Help Fixture', completed_on: 'eq.2026-09-08' }))) return json([]);
        return deny(`Unexpected backend ${req.method()} ${url.href}`);
      }
      if (url.hostname.endsWith('.supabase.co')) return deny(`Unexpected backend host ${url.href}`);
      state.blockedExternal.push(`${req.method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    });
    await context.addInitScript(({ origin, key, mode }) => {
      if (location.origin !== origin) return;
      const NativeDate = Date, started = NativeDate.now(), fixed = NativeDate.parse('2026-09-08T17:30:00.000Z');
      window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed + NativeDate.now() - started; } };
      let seed = 529;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const nativeGet = Storage.prototype.getItem, nativeSet = Storage.prototype.setItem;
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Help Fixture');
      localStorage.setItem('round529-protected-save', 'keep unrelated game data');
      if (mode === 'seen') localStorage.setItem(key, 'true');
      const probe = { reads: 0, writes: 0, readThrows: 0, writeThrows: 0 };
      window.__conquestHelpProbe = () => ({ ...probe,
        saved: nativeGet.call(localStorage, key), protectedSave: nativeGet.call(localStorage, 'round529-protected-save') });
      Storage.prototype.getItem = function(name) {
        if (this === localStorage && name === key) {
          probe.reads++;
          if (mode === 'read') { probe.readThrows++; throw new Error('ROUND529_HELP_READ_DENIED'); }
        }
        return nativeGet.call(this, name);
      };
      Storage.prototype.setItem = function(name, value) {
        if (this === localStorage && name === key) {
          probe.writes++;
          if (mode === 'write') { probe.writeThrows++; throw new Error('ROUND529_HELP_WRITE_DENIED'); }
        }
        return nativeSet.call(this, name, value);
      };
    }, { origin: base.origin, key: helpKey, mode: scenario });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    page.on('pageerror', error => state.runtime.push(error.message));
    page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
    page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push(`HTTP ${res.status()} ${res.url()}`); });
    try {
      await page.goto(new URL(routePath, base).href, { waitUntil: 'domcontentloaded' });
      const main = page.locator('main#dukb-main');
      const arcade = main.getByRole('button', { name: /Arcade/ });
      const dialog = page.getByRole('dialog', { name: 'How to Play', exact: true });
      const start = main.getByRole('button', { name: /Start Conquest/ });
      await arcade.click();
      if (scenario === 'seen') {
        await start.waitFor();
        assert.equal(await dialog.count(), 0, 'Seen preference skips automatic help');
      } else {
        await dialog.waitFor({ timeout: 3500 });
        assert.ok(await dialog.getByRole('heading', { name: 'How to Play', exact: true }).isVisible(), 'First-run help survives missing or inaccessible preference');
        await capture(page, state, 'automatic-help');
        await dialog.getByRole('button', { name: 'Start Conquering!', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
      }
      await start.waitFor();
      const manual = main.getByRole('button', { name: 'How to play', exact: true });
      const rect = await manual.boundingBox();
      assert.ok(rect && rect.width >= 30 && rect.height >= 30, 'Manual help has a usable target');
      const reopen = async () => {
        await manual.click();
        await dialog.waitFor({ timeout: 1800 });
      };
      if (control === 'manual') {
        await manual.evaluate(node => { const clone = node.cloneNode(true); window.__deadHelp = { node, clone }; node.replaceWith(clone); });
        assert.equal(await manual.evaluate(node => node === window.__deadHelp.clone), true, 'Control replaced the actual help button');
        await assert.rejects(reopen, error => error.name === 'TimeoutError' && /How to Play/.test(error.message));
        await page.evaluate(() => { const { node, clone } = window.__deadHelp; clone.replaceWith(node); delete window.__deadHelp; });
        state.control = 'dead manual help rejected; original restored';
      }
      await reopen();
      await capture(page, state, 'manual-help');
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await main.locator('[data-map="conquest-region-map"]').scrollIntoViewIfNeeded();
      await capture(page, state, 'ready-board');
      await start.click();
      await main.getByText('Attacker', { exact: true }).waitFor();
      assert.equal(await start.count(), 0, 'Battle starts after closing help');
      await main.getByRole('button', { name: 'Modes', exact: true }).click();
      await arcade.waitFor();
      assert.equal(await main.locator('[data-map="conquest-region-map"]').count(), 0, 'Returning to modes unmounts the running board');
      assert.equal(await dialog.count(), 0, 'Returning to modes leaves no blocking help dialog');
      const bleed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(bleed <= 2, 'Onboarding leaves no horizontal page overflow');
      state.storage = await page.evaluate(() => window.__conquestHelpProbe());
      assert.ok(state.storage.reads > 0, 'The real onboarding preference read was exercised');
      if (scenario === 'read') assert.ok(state.storage.readThrows > 0, 'Read fault reached the real onboarding effect');
      if (scenario === 'write') assert.ok(state.storage.writeThrows > 0, 'Write fault reached the real onboarding effect');
      if (scenario === 'missing' || scenario === 'seen') assert.equal(state.storage.saved, 'true', 'Normal onboarding retains its seen preference');
      assert.equal(state.storage.protectedSave, 'keep unrelated game data', 'Help does not change unrelated game data');
      assert.deepEqual(state.violations, [], 'No unexpected backend or write transport');
      assert.deepEqual(state.runtime, [], 'No uncaught runtime errors');
      assert.deepEqual(state.localFailures, [], 'No failed local assets');
      state.passed = true;
      console.log(`PASS ${sport} ${scenario} ${width}: onboarding, close, manual reopen, battle and mode return${control ? '; dead help control fired' : ''}`);
    } catch (error) {
      state.error = error.stack;
      state.storage = await page.evaluate(() => window.__conquestHelpProbe?.()).catch(() => null);
      await capture(page, state, 'failure').catch(() => {});
      console.error(`FAIL ${sport} ${scenario} ${width}: ${error.message}\nRuntime: ${JSON.stringify(state.runtime)}; storage: ${JSON.stringify(state.storage)}`);
    } finally { await context.close(); }
  }
  const failed = results.filter(result => !result.passed);
  console.log(`playConquestHelp: ${failed.length ? 'FAIL' : 'PASS'} ${results.length - failed.length}/${results.length} exact cases; artifacts=${output}`);
  if (failed.length) process.exitCode = 1;
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, results }, null, 2));
}
