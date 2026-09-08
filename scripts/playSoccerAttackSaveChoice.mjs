/** Round 540: save retries own the pending Attack choice until they finish.
 * Two real tabs queue actual Web Locks; only RNG inputs and one local-storage
 * write failure are controlled. No saved state or engine result is injected.
 * An intermediate real lock delays Retry until the competing restart reaches
 * tab1 through a native storage event and readback. This proves choice ownership,
 * not durability of a queue released before cross-tab storage becomes visible.
 * ATTACK_SAVE_CHOICE_BARRIER=none preserves the raw-queue durability diagnostic.
 * ATTACK_SAVE_CHOICE_CONTROL=disabled proves the live disabled-choice check.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.ATTACK_SAVE_CHOICE_BASE || 'http://127.0.0.1:4216');
assert.ok(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  && base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'Expected loopback origin');
const barrier = process.env.ATTACK_SAVE_CHOICE_BARRIER || 'visible';
assert.ok(['visible', 'none'].includes(barrier), 'Unknown visibility barrier');
const control = process.env.ATTACK_SAVE_CHOICE_CONTROL || '';
assert.ok(['', 'disabled'].includes(control), 'Unknown control');
const widths = (process.env.ATTACK_SAVE_CHOICE_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(widths.length && new Set(widths).size === widths.length && widths.every(width => [390, 1440].includes(width)), 'Unknown viewport');
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-attack-save-choice-'));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engineFile = path.join(output, 'engine.mjs');
buildSync({ stdin: { contents: "export { createAttack, advanceAttack, parseAttackSave } from '@/lib/conquestAttack'; export { makeSoccerAttackSetup } from '@/data/soccerAttack';", resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: engineFile, alias: { '@': path.join(root, 'src') } });
const engine = await import(pathToFileURL(engineFile).href);
const saveKey = 'dukb-conquest-attack-soccer-v1', lockKey = saveKey + '-write';
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
console.log(`playSoccerAttackSaveChoice: ${base.origin}; widths=${widths}; control=${control || 'none'}; barrier=${barrier}; artifacts=${output}`);
try {
  for (const width of widths) {
    const state = { width, violations: [], runtime: [], localFailures: [], requests: [], screenshots: [], consoleErrors: [], layouts: [] };
    results.push(state);
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
      isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block', locale: 'en-US' });
    await context.routeWebSocket('**/*', socket => { state.violations.push(`WebSocket ${socket.url()}`); socket.close(); });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const deny = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': base.origin }, body: JSON.stringify(data) });
      if (url.origin === backend && url.pathname === '/rest/v1/rpc/global_rank' && !url.search && req.method() === 'POST'
        && JSON.stringify(req.postDataJSON()) === JSON.stringify({ p_player: 'Local Attack Fixture', p_period: 'today', p_games: null })) {
        state.requests.push('synthetic POST read global_rank'); return json([]);
      }
      if (!['GET', 'HEAD'].includes(req.method())) return deny(`Blocked ${req.method()} ${url.origin}${url.pathname}`);
      if (url.origin === base.origin) return route.continue();
      if (url.origin === backend) {
        state.requests.push(`${req.method()} ${url.pathname}?${url.searchParams}`);
        if (req.method() === 'GET' && url.pathname === '/rest/v1/live_scores' && paramsKey(url.searchParams) === paramsKey(live)) return json([]);
        if (req.method() === 'GET' && url.pathname === '/rest/v1/game_completions' && paramsKey(url.searchParams)
          === paramsKey(new URLSearchParams({ select: 'game', player_name: 'eq.Local Attack Fixture', completed_on: 'eq.2026-09-08' }))) return json([]);
        return deny(`Unexpected backend ${req.method()} ${url.href}`);
      }
      if (url.hostname.endsWith('.supabase.co')) return deny(`Unexpected backend host ${url.href}`);
      state.requests.push({ type: 'external-block', origin: url.origin, path: url.pathname });
      return route.abort('blockedbyclient');
    });

    await context.addInitScript(({ origin, saveKey }) => {
      if (location.origin !== origin) return;
      const NativeDate = Date, started = NativeDate.now(), fixed = NativeDate.parse('2026-09-08T17:30:00.000Z');
      window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed + NativeDate.now() - started; } };
      const nativeRandom = crypto.getRandomValues.bind(crypto);
      window.__attackSeed = 9;
      crypto.getRandomValues = array => {
        if (array instanceof Uint32Array && array.length === 1) { array[0] = window.__attackSeed; return array; }
        return nativeRandom(array);
      };
      const nativeSet = Storage.prototype.setItem, nativeGet = Storage.prototype.getItem;
      window.__attackWrites = []; window.__attackReads = []; window.__attackEvents = []; window.__attackRefuse = false;
      window.addEventListener('storage', event => {
        if (event.key === saveKey) { const value = event.newValue ? JSON.parse(event.newValue) : null; window.__attackEvents.push({ seed: value?.setup.seed, revision: value?.revision }); }
      });
      Storage.prototype.getItem = function(key) {
        const raw = nativeGet.call(this, key);
        if (key === saveKey) { const value = raw ? JSON.parse(raw) : null; window.__attackReads.push({ seed: value?.setup.seed, revision: value?.revision }); }
        return raw;
      };
      Storage.prototype.setItem = function(key, value) {
        if (key === saveKey) {
          const refused = window.__attackRefuse; window.__attackRefuse = false;
          window.__attackWrites.push({ raw: String(value), refused });
          if (refused) throw new DOMException('Synthetic Attack quota refusal', 'QuotaExceededError');
        }
        return nativeSet.call(this, key, value);
      };
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'Local Attack Fixture');
      localStorage.setItem('round540-protected-save', 'keep unrelated game data');
    }, { origin: base.origin, saveKey });
    const makePage = async () => {
      const page = await context.newPage(); page.setDefaultTimeout(7000);
      page.on('pageerror', error => state.runtime.push(error.message));
      page.on('console', message => { if (message.type() === 'error') state.consoleErrors.push({ text: message.text(), location: message.location() }); });
      page.on('requestfailed', req => { if (new URL(req.url()).origin === base.origin) state.localFailures.push(req.failure()?.errorText); });
      page.on('response', res => { if (new URL(res.url()).origin === base.origin && res.status() >= 400) state.localFailures.push('HTTP ' + res.status() + ' ' + res.url()); });
      page.on('dialog', dialog => dialog.type() === 'confirm' && dialog.message() === 'Replace this unfinished Attack run with a new one?'
        ? dialog.accept() : (state.violations.push('Unexpected dialog ' + dialog.message()), dialog.dismiss()));
      await page.goto(new URL('/soccer-conquest', base).href, { waitUntil: 'domcontentloaded' });
      const attack = page.locator('main#dukb-main').getByRole('button', { name: 'Attack', exact: true });
      await attack.waitFor(); if (await attack.getAttribute('aria-pressed') !== 'true') await attack.click();
      return page;
    };
    const a = await makePage(); let b;
    const main = page => page.locator('main#dukb-main');
    const panel = page => main(page).locator('section[aria-live="polite"]');
    const raw = page => page.evaluate(key => localStorage.getItem(key), saveKey);
    const read = async page => { const value = JSON.parse(await raw(page)); assert.ok(engine.parseAttackSave(value), 'The browser saved a genuine valid Attack state'); return value; };
    const button = (page, name) => main(page).getByRole('button', { name, exact: true });
    const waitEnabled = async (page, name) => {
      await button(page, name).waitFor();
      await page.waitForFunction(name => [...document.querySelectorAll('main button')].some(node => node.textContent.trim() === name && !node.disabled), name);
    };
    const layout = async (page, label) => {
      const dimensions = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }));
      assert.ok(Math.max(dimensions.body, dimensions.document) <= dimensions.width + 1, 'The Attack choice fits the viewport'); state.layouts.push({ label, ...dimensions });
    };
    const reachTarget = async page => {
      await waitEnabled(page, 'Spin team wheel'); await button(page, 'Spin team wheel').click();
      await waitEnabled(page, 'Spin direction wheel'); await button(page, 'Spin direction wheel').click();
      await waitEnabled(page, 'Play attack');
      const target = await read(page);
      assert.equal(target.phase, 'target'); assert.equal(target.revision, 2);
      assert.deepEqual(target, engine.advanceAttack(engine.advanceAttack(engine.createAttack(engine.makeSoccerAttackSetup(9)))), 'Real UI spins reach the exact generated seed9 target');
      return target;
    };
    const failMove = async page => {
      const before = await raw(page);
      await page.evaluate(() => { window.__attackRefuse = true; }); await button(page, 'Play attack').click();
      await waitEnabled(page, 'Retry save');
      const attempt = await page.evaluate(() => window.__attackWrites.at(-1));
      assert.equal(attempt.refused, true, 'The actual pending save write was refused');
      assert.equal(await raw(page), before, 'A failed save preserves the prior saved bytes');
      const next = engine.advanceAttack(JSON.parse(before));
      assert.deepEqual(JSON.parse(attempt.raw), next, 'The failed write contains the exact generated pending result');
      return { before, next };
    };
    const assertMap = async (page, expected) => {
      const labels = await main(page).locator('svg path[role="button"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')).sort());
      const expectedLabels = expected.setup.regions.map(region => {
        const owner = expected.teams.find(team => team.id === expected.owners[region.id]);
        return region.name + ', ' + (owner ? 'owned by ' + owner.name : 'neutral region');
      }).sort();
      assert.deepEqual(labels, expectedLabels, 'The visible map owns exactly the expected generated regions');
    };
    try {
      await button(a, 'Start Attack').click(); const target = await reachTarget(a);
      b = await makePage(); await waitEnabled(b, 'Play attack');
      assert.equal(await raw(b), await raw(a), 'Both real tabs begin from the same saved target');
      const pending = await failMove(a); state.pending = { seed: target.setup.seed, revision: pending.next.revision, result: pending.next.lastResult };
      await b.evaluate(key => {
        window.__attackHold = navigator.locks.request(key, async () => {
          window.__attackHeld = true; await new Promise(resolve => { window.__attackRelease = resolve; });
        });
      }, lockKey);
      await b.waitForFunction(() => window.__attackHeld === true);
      await b.evaluate(() => { window.__attackSeed = 88; });
      await button(b, 'Start new Attack').click();
      await b.waitForFunction(async key => (await navigator.locks.query()).pending.filter(lock => lock.name === key).length === 1, lockKey);
      if (barrier === 'visible') {
      await b.evaluate(key => {
        window.__attackVisibilityHold = navigator.locks.request(key, async () => {
          window.__attackVisibilityHeld = true; await new Promise(resolve => { window.__attackVisibilityRelease = resolve; });
        });
      }, lockKey);
      await b.waitForFunction(async key => (await navigator.locks.query()).pending.filter(lock => lock.name === key).length === 2, lockKey);
      }
      state.rapidChoice = await button(a, 'Retry save').evaluate(node => {
        const unsaved = [...document.querySelectorAll('main button')].find(item => item.textContent.trim() === 'Play this run without saving');
        let hits = 0; unsaved.addEventListener('click', () => hits++);
        const before = unsaved.disabled; node.click(); const beforeSecond = unsaved.disabled; unsaved.click();
        return { before, beforeSecond, unsavedNativeClicks: hits, connected: unsaved.isConnected };
      });
      assert.equal(state.rapidChoice.before, false, 'The unsaved option is initially enabled before Retry');
      if (!state.rapidChoice.beforeSecond) {
        assert.equal(state.rapidChoice.unsavedNativeClicks, 1, 'The enabled second native click actually reaches the unsaved button');
        assert.equal(state.rapidChoice.connected, true, 'The second native click reaches the mounted choice');
        state.busyGuardWitness = 'native second click reached enabled choice before React painted the lock';
      } else {
        assert.equal(state.rapidChoice.unsavedNativeClicks, 0, 'The painted disabled button prevents the second native click');
        state.busyGuardWitness = 'UI lock prevented native dispatch; component tests independently prove the busy ref';
      }
      await a.waitForFunction(async ({ key, count }) => (await navigator.locks.query()).pending.filter(lock => lock.name === key).length === count, { key: lockKey, count: barrier === 'visible' ? 3 : 2 });
      const unsaved = button(a, 'Play this run without saving');
      await a.waitForFunction(() => [...document.querySelectorAll('main button')].some(node => node.textContent.trim() === 'Retry save' && node.disabled));
      const assertLocked = async () => assert.ok(await unsaved.isDisabled(), 'An in-flight Retry disables the unsaved choice');
      if (control === 'disabled') {
        await unsaved.evaluate(node => node.disabled = false);
        assert.equal(await unsaved.isEnabled(), true, 'The control really enables the live queued choice');
        await assert.rejects(assertLocked, error => error.name === 'AssertionError' && error.message === 'An in-flight Retry disables the unsaved choice');
        await unsaved.evaluate(node => node.disabled = true); state.control = 'enabled queued choice rejected and restored';
      }
      await assertLocked();
      assert.equal(await main(a).getByText('Unsaved session', { exact: true }).count(), 0, 'A same-task unsaved click cannot take ownership from Retry');
      assert.equal(await panel(a).getByRole('heading', { name: 'Attack lined up', exact: true }).count(), 1, 'The pending result stays hidden while Retry owns the choice');
      assert.equal(await raw(a), pending.before, 'Queued actions have not changed the saved target');
      state.locks = await a.evaluate(async key => { const locks = await navigator.locks.query(); return { held: locks.held.filter(lock => lock.name === key).length, pending: locks.pending.filter(lock => lock.name === key).length }; }, lockKey);
      assert.deepEqual(state.locks, { held: 1, pending: barrier === 'visible' ? 3 : 2 }, 'The actual lock queue matches the explicitly selected barrier mode');
      await unsaved.scrollIntoViewIfNeeded(); await layout(a, 'locked-choice'); await capture(a, state, 'locked-choice');
      await b.evaluate(async () => { window.__attackRelease(); await window.__attackHold; });
      if (barrier === 'visible') {
      await b.waitForFunction(() => window.__attackVisibilityHeld === true);
      await a.waitForFunction(key => window.__attackEvents.some(event => event.seed === 88 && event.revision === 0)
        && JSON.parse(localStorage.getItem(key)).setup.seed === 88, saveKey);
      state.visibilityBarrier = await a.evaluate(async key => ({
        nativeEvent: window.__attackEvents.find(event => event.seed === 88 && event.revision === 0),
        readbackSeed: JSON.parse(localStorage.getItem(key)).setup.seed,
        pending: (await navigator.locks.query()).pending.filter(lock => lock.name === key + '-write').length,
        scope: 'Retry released after native cross-tab visibility; not unbarriered durability proof',
      }), saveKey);
      assert.equal(state.visibilityBarrier.pending, 1, 'Only the actual Retry remains queued behind the visibility barrier');
      await b.evaluate(async () => { window.__attackVisibilityRelease(); await window.__attackVisibilityHold; });
      } else { state.visibilityBarrier = { scope: 'No visibility barrier: raw queued-write durability diagnostic' }; }
      await a.waitForFunction(key => { const value = JSON.parse(localStorage.getItem(key)); return value.setup.seed === 88 && value.revision === 0; }, saveKey);
      await waitEnabled(a, 'Spin team wheel');
      assert.deepEqual(await read(a), engine.createAttack(engine.makeSoccerAttackSetup(88)), 'The competing confirmed restart is the exact saved seed88 run');
      await assertMap(a, await read(a));
      assert.equal(await main(a).getByText('Unsaved session', { exact: true }).count(), 0, 'The conflicting retry never produces an unsaved session');
      assert.equal(await button(a, 'Retry save').count(), 0, 'The old pending retry is cleared after conflict');
      state.conflict = { savedSeed: 88, revision: 0, visiblePhase: 'team', unsaved: false };
      await b.close(); b = null;
      await button(a, 'Start new Attack').click(); await reachTarget(a);
      const ordinary = await failMove(a);
      assert.equal(await button(a, 'Play this run without saving').isEnabled(), true, 'The idle unsaved choice remains available after save failure');
      await button(a, 'Play this run without saving').click(); await waitEnabled(a, 'Continue');
      assert.equal(await main(a).getByText('Unsaved session', { exact: true }).count(), 1, 'Idle unsaved play explicitly marks the local session');
      await assertMap(a, ordinary.next);
      const result = ordinary.next.lastResult;
      const teamName = id => ordinary.next.teams.find(team => team.id === id)?.name;
      const headline = result.kind === 'match' ? teamName(result.winner) + ' beat ' + teamName(result.loser)
        : teamName(result.attacker) + ' claimed ' + ordinary.next.setup.regions.find(region => region.id === result.targetRegion).name;
      assert.equal(await panel(a).getByRole('heading', { level: 2 }).innerText(), headline, 'Unsaved play reveals the exact pending result headline');
      if (result.score) {
        const score = result.score.attacker + '-' + result.score.defender + (result.score.shootout ? ' (' + result.score.shootout.attacker + '-' + result.score.shootout.defender + ' on penalties)' : '');
        assert.equal(await panel(a).getByText(teamName(result.attacker) + ' ' + score + ' ' + teamName(result.defender), { exact: true }).count(), 1, 'Unsaved play reveals the exact pending score');
      }
      if (result.capturedPlayers.length) assert.equal(await panel(a).getByText('Captured: ' + result.capturedPlayers.map(player => player.name).join(', '), { exact: true }).count(), 1, 'Unsaved play preserves the exact captured players');
      assert.equal(await raw(a), ordinary.before, 'Showing the unsaved recap does not replace saved bytes');
      state.unsaved = { headline, result, recap: await panel(a).innerText(), savedRevision: JSON.parse(ordinary.before).revision };
      await panel(a).scrollIntoViewIfNeeded(); await layout(a, 'unsaved-recap'); await capture(a, state, 'unsaved-recap');
      await button(a, 'Continue').click(); await waitEnabled(a, 'Spin team wheel');
      assert.equal(await raw(a), ordinary.before, 'Continuing unsaved keeps the original saved target intact');
      assert.equal(await a.evaluate(() => localStorage.getItem('round540-protected-save')), 'keep unrelated game data', 'Attack choices preserve unrelated storage');
      state.unexpectedConsoleErrors = state.consoleErrors.filter(({ text, location }) => {
        let url; try { url = new URL(location.url); } catch { return true; }
        return !(/^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT(?:\.Inspector)?$/.test(text)
          && state.requests.some(request => request.type === 'external-block' && request.origin === url.origin && request.path === url.pathname));
      });
      assert.deepEqual(state.violations, []); assert.deepEqual(state.runtime, []); assert.deepEqual(state.localFailures, []); assert.deepEqual(state.unexpectedConsoleErrors, []);
      state.passed = true; console.log('PASS ' + width + ': actual queued retry stays authoritative; idle unsaved keeps its exact pending result');
    } catch (error) {
      state.tabReceipts = await Promise.all([a, b].filter(Boolean).map(page => page.evaluate(key => ({
        seedInput: window.__attackSeed, reads: window.__attackReads, events: window.__attackEvents,
        writes: window.__attackWrites.map(item => { const value = JSON.parse(item.raw); return { seed: value.setup.seed, revision: value.revision, refused: item.refused }; }),
        stored: (() => { const value = JSON.parse(localStorage.getItem(key)); return { seed: value?.setup.seed, revision: value?.revision }; })(),
        notice: [...document.querySelectorAll('[role=status]')].map(node => node.textContent),
      }), saveKey)));
      state.error = error.stack; await capture(a, state, 'failure').catch(() => {}); throw error;
    } finally { await context.close(); }
  }
  console.log('playSoccerAttackSaveChoice: PASS ' + results.length + ' viewports; artifacts=' + output);
} finally { await browser.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ base: base.href, control, barrier, results }, null, 2)); }
