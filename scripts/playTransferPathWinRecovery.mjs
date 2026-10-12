/* Remote-only actual-route proof of a failed final won-marker write.
   The actual app plays the committed tpa-662 pair. After load, a document-only
   Storage wrapper throws QuotaExceededError for exactly one owned won-marker
   write, leaving the app's real playing target-step prefix unchanged.
   baseline: nine genuine wins reload into the owned reading-club route crash.
   fixed: those nine prefixes restore a finished view without rewriting bytes
   or repeating client completion intent. Three normal wins preserve their
   ordinary won saves. Two actual controls omit the closing pick or delete
   a real fault-produced prefix. No authenticated or backend payment claim.

   TRANSFER_PATH_WIN_PHASE=baseline|fixed
   TRANSFER_PATH_WIN_OUT=<artifact root> node scripts/playTransferPathWinRecovery.mjs
   Build dist first. Career/puzzle reads use source-derived fixtures. Only
   completion preflight is also fulfilled; its POST and every other external
   request are aborted. No local or production probe. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { buildGraph, deriveHint } from './lib/transferPathHints.mjs';

assert(process.env.CI, 'Win recovery browser proof runs remotely only');
const PHASE = process.env.TRANSFER_PATH_WIN_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'Select baseline or fixed explicitly');
assert(process.env.TRANSFER_PATH_WIN_OUT, 'Set TRANSFER_PATH_WIN_OUT');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.env.TRANSFER_PATH_WIN_OUT), PHASE);
const RULES = { classic: 'Everyday', active: 'Active players only', europe: 'Europe only' };
const sha = value => createHash('sha256').update(value).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esc = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CLUB_CRASH = /Cannot read properties of undefined \(reading ['"]club['"]\)/;
const heldFiles = [
  'src/components/transfer-path/TransferPathBoard.tsx', 'src/hooks/useTransferPath.ts',
  'src/hooks/useDailyPuzzle.ts', 'src/components/game/PlayerAutocomplete.tsx',
  'src/lib/playerSearch.ts', 'src/lib/transferPathEmptyList.ts',
  'src/lib/transferPathGraph.ts', 'src/lib/transferPathModes.ts',
  'src/data/careerPlayers.ts', 'src/data/transferPathPuzzles.ts',
  'src/data/transferPathVerifiedActive.ts', 'scripts/data/transferPathPull/puzzles.txt',
  'scripts/lib/transferPathHints.mjs', 'package.json', 'package-lock.json',
  'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/lib/restoredFinish.ts',
  'src/lib/dailySaveShapes.ts', 'src/components/RouteErrorBoundary.tsx',
];
const receipt = () => heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
fs.mkdirSync(OUT, { recursive: true });
const sourceBefore = receipt();
const report = { phase: PHASE, sourceCommit: head(), methodSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), sourceBefore, scope: 'Signed-out local daily view and blocked client completion intent; no authenticated or backend award claim', status: 'pending', checks: 0, baselineCrashes: 0, setupFailures: 0, failures: 0, cases: [], controls: [] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-win-recovery-'));
let browser, host;

try {
  for (const item of sourceBefore) assert.equal(item.sha256, sha(execFileSync('git', ['show', `${report.sourceCommit}:${item.file}`], { cwd: ROOT })), `${item.file} differs from committed source`);
  const bundle = path.join(tmp, 'fixture-source.mjs');
  await build({
    stdin: { contents: "export { careerPlayers } from './src/data/careerPlayers.ts'; export { playersUnderRule } from './src/lib/transferPathModes.ts';", resolveDir: ROOT, sourcefile: 'win-recovery-fixtures.mjs', loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'offline-supabase', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'offline-supabase', namespace: 'offline-supabase' }));
      b.onLoad({ filter: /.*/, namespace: 'offline-supabase' }, () => ({ contents: 'export const supabase = null; export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' }));
    } }],
  });
  const site = await import(pathToFileURL(bundle).href), originalPlayers = JSON.stringify(site.careerPlayers);
  const retained = fs.readFileSync(path.join(ROOT, 'scripts/data/transferPathPull/puzzles.txt'), 'utf8').split(/\r?\n/).map(line => line.split('|')).find(row => row[0] === 'tpa-662');
  assert(retained?.[1] === 'Lionel Messi' && retained?.[2] === 'Mohamed Salah', 'The actual committed retained pair is required');
  const graphs = Object.fromEntries(Object.keys(RULES).map(rule => [rule, buildGraph(site.playersUnderRule(site.careerPlayers, rule))]));
  const routes = Object.fromEntries(Object.keys(RULES).map(rule => {
    const value = deriveHint(graphs[rule], retained[1], retained[2]);
    assert(value && value.minSteps === { classic: 2, active: 3, europe: 2 }[rule], `${rule}: independent original minimum is unavailable or changed`);
    return [rule, value];
  }));
  const puzzle = { id: retained[0], playerA: retained[1], playerB: retained[2], minSteps: routes.classic.minSteps, hint: routes.classic.hint, active: { minSteps: routes.active.minSteps, hint: routes.active.hint }, europe: { minSteps: routes.europe.minSteps, hint: routes.europe.hint } };
  const expectedScore = rule => Math.max(0, 1000 - Math.max(0, routes[rule].minSteps - routes.classic.minSteps) * 100);
  const players = site.careerPlayers.map((p, i) => ({ id: `win-recovery-fixture-${String(i + 1).padStart(5, '0')}`, player_name: p.name, nationality: p.nationality, position: p.position }));
  const seasons = site.careerPlayers.flatMap((p, i) => p.career.map((s, sort_order) => ({ player_id: players[i].id, season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, market_value: s.marketValue, sort_order })));
  assert.equal(players.length, 253); assert.equal(seasons.length, 3640);
  report.fixture = { metadataSource: 'Actual committed tpa-662 endpoints with independently derived original graph metadata', puzzle, routes, scores: Object.fromEntries(Object.keys(RULES).map(rule => [rule, expectedScore(rule)])), players: players.length, statisticsRows: seasons.length, playerRowsSha256: sha(JSON.stringify(players)), seasonRowsSha256: sha(JSON.stringify(seasons)) };
  assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before browser proof');
  const port = await new Promise((resolve, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(error => error ? reject(error) : resolve(value)); });
  });
  const BASE = `http://127.0.0.1:${port}`;
  host = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let hostError = ''; host.stderr.on('data', value => { hostError += value; });
  const deadline = Date.now() + 15000;
  while (true) {
    try { const response = await fetch(BASE); assert.equal(response.status, 200); break; }
    catch (error) { if (host.exitCode !== null || Date.now() > deadline) throw new Error(`Built-site server did not start: ${hostError || error}`); await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  browser = await pw.chromium.launch();

  function winIssues(state, rule, restored = false) {
    const issues = [];
    if (!state.won || state.inputVisible) issues.push('view-win');
    if (!same(state.chain.players, routes[rule].path)) issues.push('view-chain');
    if (state.chain.clubs.length !== routes[rule].minSteps || state.chain.clubs.some((club, i) => !graphs[rule].adj.get(state.chain.players[i])?.get(state.chain.players[i + 1])?.some(s => s.club === club))) issues.push('view-connectors');
    if (!state.scoreText.includes(`${expectedScore(rule)} pts`)) issues.push('view-score');
    if (state.rule !== (restored ? 'classic' : rule) || state.minimum !== routes[restored ? 'classic' : rule].minSteps) issues.push('view-rule-or-minimum');
    return issues;
  }
  const stepsOf = state => state.chain.players.slice(1).map((player, i) => ({ t: 'step', player, club: state.chain.clubs[i] }));
  function recoveryIssues(before, after, rule) {
    const issues = winIssues(after, rule, true);
    if (before.save?.key !== after.save?.key || before.save?.raw !== after.save?.raw) issues.push('recovery-bytes');
    if (before.localCompletions !== after.localCompletions) issues.push('recovery-local-completions');
    return issues;
  }
  async function walk(spec, action, control = false) {
    const row = { id: spec.id, kind: spec.kind, rule: spec.rule, width: spec.width, height: spec.height, checks: 0, requests: [], errors: [], expectedCrashErrors: [], assetFailures: [], assets: [], stages: [], shots: [] };
    (control ? report.controls : report.cases).push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, hasTouch: spec.width < 1280, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    const puzzleRow = { puzzle_id: puzzle.id, player_a: puzzle.playerA, player_b: puzzle.playerB, min_steps: puzzle.minSteps, hint: puzzle.hint, sort_order: 0, active_min_steps: puzzle.active.minSteps, active_hint: puzzle.active.hint, europe_min_steps: puzzle.europe.minSteps, europe_hint: puzzle.europe.hint };
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      const table = /^\/rest\/v1\/(career_players|career_seasons|transfer_path_puzzles)$/.exec(url.pathname)?.[1];
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      if (/\.supabase\.co$/i.test(url.hostname) && url.pathname === '/rest/v1/game_completions' && request.method() === 'OPTIONS') {
        row.requests.push({ action: 'completion-preflight', origin: url.origin, path: url.pathname, method: request.method() });
        return route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,prefer', 'access-control-allow-methods': 'POST,OPTIONS' }, body: '' });
      }
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'GET') {
        let data = table === 'career_players' ? players : table === 'career_seasons' ? seasons : [puzzleRow];
        const filter = url.searchParams.get('player_name');
        if (filter) { assert(filter.startsWith('ilike.')); const query = filter.slice(6).replaceAll('%', '').toLowerCase(); data = data.filter(v => v.player_name.toLowerCase().includes(query)); }
        const range = request.headers().range?.match(/^(\d+)-(\d+)$/);
        const offset = Number(url.searchParams.get('offset') ?? range?.[1] ?? 0), limit = Number(url.searchParams.get('limit') ?? (range ? Number(range[2]) - Number(range[1]) + 1 : 1000));
        const columns = url.searchParams.get('select')?.split(',').map(v => v.trim());
        const payload = data.slice(offset, offset + limit).map(v => columns && !columns.includes('*') ? Object.fromEntries(columns.map(key => [key, v[key]])) : v);
        row.requests.push({ action: 'fixture', table, offset, rows: payload.length, filter: filter ?? null, names: filter ? payload.map(v => v.player_name) : [] });
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      let completion;
      if (url.pathname === '/rest/v1/game_completions' && request.method() === 'POST') {
        const body = request.postDataJSON(), value = Array.isArray(body) ? body[0] : body;
        completion = { game: value?.game, score: value?.score };
      }
      row.requests.push({ action: 'abort', origin: url.origin, path: url.pathname, method: request.method(), ...(completion ? { completion } : {}) }); return route.abort('blockedbyclient');
    });
    const page = await context.newPage(), consoleTasks = [];
    page.on('pageerror', error => row.errors.push(String(error.stack || error)));
    page.on('console', message => {
      if (message.type() !== 'error' || /^Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)/.test(message.text())) return;
      consoleTasks.push((async () => {
        const details = await Promise.allSettled(message.args().map(arg => arg.evaluate(v => v instanceof Error ? `${v.name}: ${v.message}\n${v.stack ?? ''}` : null)));
        row.errors.push([message.text(), ...details.flatMap(v => v.status === 'fulfilled' && v.value ? [v.value] : [])].join('\n'));
      })());
    });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin !== BASE) return; if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js') && !row.assets.includes(url.pathname)) row.assets.push(url.pathname); if (response.status() >= 400) row.assetFailures.push({ path: url.pathname, status: response.status() }); });
    const check = (ok, message) => { assert(ok, `${spec.id}: ${message}`); row.checks += 1; report.checks += 1; };
    const activate = locator => spec.width < 1280 ? locator.tap() : locator.click();
    const input = () => page.getByRole('combobox', { name: 'Type a player name...' });
    const options = () => page.getByRole('option').evaluateAll(elements => elements.map(e => ({ name: e.querySelector('span.text-sm.font-medium')?.innerText ?? null, textContent: e.textContent, innerText: e.innerText })));
    const readSave = () => page.evaluate(() => { const key = Object.keys(localStorage).find(k => k.startsWith('transfer-path-daily-')); const raw = key ? localStorage.getItem(key) : null; return key && raw ? { key, raw, value: JSON.parse(raw) } : null; });
    const fault = () => page.evaluate(() => window.__TP_WIN_QUOTA__ ?? null);
    const completions = () => row.requests.filter(r => r.path === '/rest/v1/game_completions' && r.method === 'POST' && r.completion?.game === 'transfer-path');
    const snapshot = async () => {
      let selectedRule;
      for (const r of Object.keys(RULES)) if (await page.getByRole('button', { name: RULES[r], exact: true }).getAttribute('aria-pressed') === 'true') selectedRule = r;
      return {
        rule: selectedRule, minimum: Number(/^Optimal:\s*(\d+)/.exec(await page.locator('#dukb-main p').filter({ hasText: /^Optimal: \d+/ }).first().innerText())?.[1]),
        chain: { players: await page.locator('#dukb-main .space-y-0').first().locator('span.font-semibold.text-foreground').allTextContents(), clubs: await page.locator('#dukb-main .space-y-0').first().locator('span.italic').allTextContents() },
        won: await page.getByText('Connected!', { exact: true }).count() === 1, inputVisible: await input().count() === 1 && await input().isVisible(), scoreText: await page.locator('#dukb-main span').filter({ hasText: /^\d+ pts$/ }).allTextContents(),
        save: await readSave(), localCompletions: await page.evaluate(() => localStorage.getItem('dukb-local-completions')),
      };
    };
    async function shot(stage) {
      if (await page.getByText('Connected!', { exact: true }).count()) {
        await page.waitForFunction(() => {
          const headline = [...document.querySelectorAll('#dukb-main h2')].find(e => e.textContent === 'Connected!');
          const card = headline?.closest('[role=status]'), score = headline?.closest('[data-result-moment]')?.querySelector('.rm-score');
          return [headline, card, score].every(e => e && Number(getComputedStyle(e).opacity) >= 0.99 && !e.getAnimations().some(a => a.playState === 'running' || a.pending));
        }, null, { timeout: 5000 });
        check(true, 'The original result animation has settled before capture');
      }
      const name = `${spec.id}-${stage}.png`, target = path.join(OUT, name);
      assert(!fs.existsSync(target), `Refuse to overwrite original capture ${name}`);
      if (await page.locator('#dukb-main').count()) await page.locator('#dukb-main').screenshot({ path: target, animations: 'allow' });
      else await page.screenshot({ path: target, fullPage: true, animations: 'allow' });
      row.shots.push(name);
    }
    function poolReads(from) {
      const reads = row.requests.slice(from);
      check(reads.filter(r => r.action === 'fixture' && r.table === 'career_seasons').reduce((n, r) => n + r.rows, 0) === seasons.length, 'All unchanged statistics rows reached this mount');
      check(reads.some(r => r.action === 'fixture' && r.table === 'transfer_path_puzzles' && r.rows === 1), 'The actual single-puzzle fixture loaded');
    }
    async function ready(from = 0) { await input().waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from); }
    async function armFault() {
      await page.evaluate(id => {
        if (window.__TP_WIN_QUOTA__) throw new Error('Quota fault was already installed');
        const native = Storage.prototype.setItem;
        const observed = { rejected: 0, markerAttempts: 0, rejectedKey: null, attemptedRaw: null, previousRaw: null, exceptionName: null };
        window.__TP_WIN_QUOTA__ = observed;
        Storage.prototype.setItem = function(key, raw) {
          let value;
          if (this === localStorage && String(key).startsWith('transfer-path-daily-')) { try { value = JSON.parse(String(raw)); } catch { /* unrelated values pass through unchanged */ } }
          if (value?.puzzleId === id && value.gameStatus === 'won' && value.guesses?.at(-1)?.t === 'won') {
            observed.markerAttempts += 1;
            if (observed.rejected === 0) {
              observed.rejected = 1; observed.rejectedKey = String(key); observed.attemptedRaw = String(raw); observed.previousRaw = localStorage.getItem(String(key)); observed.exceptionName = 'QuotaExceededError';
              throw new DOMException('Proof refuses this one final won-marker write', 'QuotaExceededError');
            }
          }
          return native.call(this, key, raw);
        };
      }, puzzle.id);
      check((await fault()).rejected === 0, 'The document-only write fault is armed after the actual graph loads');
    }
    async function choose(name) {
      const previous = await snapshot(), from = row.requests.length; row.lastQuery = name; await input().fill(name);
      const label = page.locator('span.text-sm.font-medium').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`) });
      const option = page.getByRole('option').filter({ has: label }); await option.waitFor({ state: 'visible', timeout: 10000 });
      check(await option.count() === 1 && (await option.locator('span.text-sm.font-medium').innerText()).trim() === name, 'Exactly the requested full-name identity is offered');
      check(row.requests.slice(from).some(r => r.action === 'fixture' && r.filter && r.names.includes(name)), 'The actual queried fixture supplied the chosen identity');
      row.stages.push({ stage: 'player-offered', query: name, options: await options() }); await activate(option);
      await page.waitForFunction(size => document.querySelector('#dukb-main p.text-destructive') || document.querySelector('#dukb-main .space-y-0')?.querySelectorAll('span.font-semibold.text-foreground').length > size, previous.chain.players.length, { timeout: 5000 });
      const actual = await snapshot(); check(await page.locator('#dukb-main p.text-destructive').count() === 0, 'The actual shortest-path pick is accepted'); row.stages.push({ stage: 'player-picked', ...actual }); return actual;
    }
    async function playWin(withFault) {
      if (withFault) await armFault();
      for (const name of routes[spec.rule].path.slice(1, -1)) await choose(name);
      await page.getByText('Connected!', { exact: true }).waitFor({ state: 'visible' }); await page.waitForLoadState('networkidle', { timeout: 8000 });
      const actual = await snapshot(), issues = winIssues(actual, spec.rule);
      check(issues.length === 0, `A natural daily win has the legal shortest chain and correct shared daily score: ${issues.join(', ')}`);
      check(completions().length === 1 && completions()[0].completion.score === expectedScore(spec.rule), 'The genuine live finish emits one blocked client completion intent with its actual daily score');
      if (withFault) {
        const observed = await fault(), attempted = observed.attemptedRaw ? JSON.parse(observed.attemptedRaw) : null;
        check(observed.rejected === 1 && observed.markerAttempts === 1 && observed.exceptionName === 'QuotaExceededError', 'Exactly one real final won-marker write was attempted and refused');
        check(observed.rejectedKey === actual.save?.key && observed.previousRaw === actual.save?.raw, 'The persisted raw prefix is exactly the native bytes present before the failed write');
        check(actual.save?.value.puzzleId === puzzle.id && actual.save.value.gameStatus === 'playing' && same(actual.save.value.guesses, stepsOf(actual)), 'The app itself saved every legal target step as playing without a won or give marker');
        check(attempted?.gameStatus === 'won' && same(attempted.guesses, [...stepsOf(actual), { t: 'won' }]) && same({ ...attempted, guesses: attempted.guesses.slice(0, -1), gameStatus: 'playing' }, actual.save.value), 'The one refused payload differs only by the app completion marker and status');
        row.faultReceipt = observed;
      } else check(actual.save?.value.gameStatus === 'won' && same(actual.save.value.guesses, [...stepsOf(actual), { t: 'won' }]), 'The normal app retains its complete ordinary won action log');
      row.stages.push({ stage: withFault ? 'natural-win-marker-refused' : 'natural-normal-win', ...actual, completionIntents: completions().length, issues }); return actual;
    }
    async function reloadWin(before, stage) {
      const from = row.requests.length, intentCount = completions().length; await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Connected!', { exact: true }).waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from);
      const actual = await snapshot(), issues = recoveryIssues(before, actual, spec.rule);
      check(await fault() === null, 'Reload has a fresh native Storage realm with no reinstalled quota fault');
      check(issues.length === 0, `The actual finished view restores with identical saved bytes: ${issues.join(', ')}`);
      check(completions().length === intentCount, 'Recovery adds no blocked client completion intent');
      row.stages.push({ stage, before, after: actual, issues, completionIntentsBefore: intentCount, completionIntentsAfter: completions().length }); await shot(stage); return actual;
    }
    try {
      await page.goto(`${BASE}/transfer-path`, { waitUntil: 'domcontentloaded' }); await ready();
      await activate(page.getByRole('button', { name: RULES[spec.rule], exact: true }));
      const initial = await snapshot();
      check(initial.rule === spec.rule && initial.minimum === routes[spec.rule].minSteps && same(initial.chain, { players: [puzzle.playerA], clubs: [] }) && !initial.won && initial.inputVisible && initial.save === null, 'The real requested daily starts naturally without saved play');
      await Promise.allSettled(consoleTasks); check(row.errors.length === 0, 'No setup app error precedes the owned fault'); row.stages.push({ stage: 'initial', ...initial });
      await action({ page, row, check, input, activate, snapshot, shot, ready, poolReads, readSave, fault, completions, armFault, choose, playWin, reloadWin, consoleTasks, initial });
      await Promise.allSettled(consoleTasks);
      row.layout = await page.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(row.layout.width === spec.width && row.layout.clientWidth === row.layout.scrollWidth, 'The requested viewport has no sideways overflow');
      check(row.errors.length === 0 && row.assetFailures.length === 0, 'No unexpected app exception or failed owned asset'); row.ok = true;
      if (PHASE === 'baseline' && row.ownedCrashReproduced) report.baselineCrashes += 1;
      console.log(`${PHASE === 'baseline' ? 'BASELINE' : 'PASS'} ${spec.id}: ${row.checks} checks`);
    } catch (error) {
      row.ok = false; row.error = String(error.stack || error); report.setupFailures += 1;
      row.failureOptions = await options().catch(() => []); row.failureSearch = await input().inputValue().catch(() => null); row.failureText = await page.locator('body').innerText().catch(() => ''); await shot('failure').catch(() => {});
      console.error(`FAIL ${spec.id}: ${row.error}\nOptions: ${JSON.stringify(row.failureOptions)}`);
    } finally { await context.close(); }
  }

  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) for (const rule of Object.keys(RULES)) await walk({ id: `${PHASE}-fault-tpa-662-${rule}-${width}x${height}`, kind: 'fault', rule, width, height }, async j => {
    const before = await j.playWin(true); await j.shot('natural-win-marker-refused');
    if (PHASE === 'fixed') { await j.reloadWin(before, 'recovered-win'); return; }
    await Promise.allSettled(j.consoleTasks); j.check(j.row.errors.length === 0, 'The natural win did not crash before reload');
    const from = j.row.requests.length, intentCount = j.completions().length; await j.page.reload({ waitUntil: 'domcontentloaded' });
    await j.page.getByRole('heading', { name: 'This page broke', exact: true }).waitFor({ state: 'visible', timeout: 15000 }); await j.page.waitForLoadState('networkidle', { timeout: 8000 }); j.poolReads(from);
    await Promise.allSettled(j.consoleTasks); const observedErrors = [...j.row.errors];
    j.check(observedErrors.some(line => CLUB_CRASH.test(line)), 'The actual reload owns the path[1].club TypeError, not a setup error');
    const unrelated = observedErrors.filter(line => !CLUB_CRASH.test(line) && !/^The above error occurred in/.test(line));
    j.check(unrelated.length === 0, 'Every observed reload error belongs to the owned reading-club render failure');
    const actualSave = await j.readSave();
    j.check(actualSave?.key === before.save.key && actualSave?.raw === before.save.raw && await j.fault() === null, 'The reload crash keeps the original target prefix and has no active injected fault');
    j.check(await j.page.getByText('Connected!', { exact: true }).count() === 0 && await j.page.locator('#dukb-main').count() === 0 && j.completions().length === intentCount, 'The observed route crash cannot restore the win or emit a second completion intent');
    j.row.expectedCrashErrors = observedErrors; j.row.errors = [];
    j.row.stages.push({ stage: 'owned-reload-crash', before, actualSave, expectedCrashErrors: observedErrors, completionIntentsBefore: intentCount, completionIntentsAfter: j.completions().length });
    j.row.ownedCrashReproduced = true; await j.shot('owned-reload-crash');
  });
  if (PHASE === 'fixed') {
    for (const rule of Object.keys(RULES)) await walk({ id: `fixed-normal-tpa-662-${rule}-390x844`, kind: 'normal', rule, width: 390, height: 844 }, async j => {
      const before = await j.playWin(false); j.check(await j.fault() === null, 'The normal preservation case has no injected write fault'); await j.shot('normal-win');
      await j.reloadWin(before, 'normal-win-reload');
    });
    await walk({ id: 'control-omitted-closing-pick-390x844', kind: 'detector-control', rule: 'active', width: 390, height: 844 }, async j => {
      await j.choose(routes.active.path[1]); const before = await j.snapshot();
      j.check(before.inputVisible && !before.won && before.save?.value.gameStatus === 'playing' && same(before.save.value.guesses, stepsOf(before)) && before.chain.players.at(-1) !== puzzle.playerB, 'The omission control owns a real nonterminal accepted Active step');
      const from = j.row.requests.length; await j.page.reload({ waitUntil: 'domcontentloaded' }); await j.ready(from);
      const actual = await j.snapshot(), issues = recoveryIssues(before, actual, 'active');
      j.check(actual.inputVisible && !actual.won && actual.save.raw === before.save.raw && j.completions().length === 0, 'A real unfinished log stays playing and never emits completion intent');
      j.check(same(issues, ['view-win', 'view-chain', 'view-connectors', 'view-score']), 'The owned recovery detector rejects the actual omitted final closing pick');
      j.row.control = { omittedAction: `Pick ${routes.active.path.at(-2)} to close the actual shortest path`, before, after: actual, detected: issues }; await j.shot('detected');
    }, true);
    await walk({ id: 'control-deleted-target-prefix-390x844', kind: 'detector-control', rule: 'classic', width: 390, height: 844 }, async j => {
      const before = await j.playWin(true); j.check(before.save?.raw && before.save.value.guesses.at(-1).player === puzzle.playerB, 'The deletion control owns the real fault-produced terminal prefix');
      await j.page.evaluate(key => localStorage.removeItem(key), before.save.key);
      j.check(await j.page.evaluate(key => localStorage.getItem(key), before.save.key) === null, 'The control actually removes that target-prefix saved key');
      const from = j.row.requests.length, intentCount = j.completions().length; await j.page.reload({ waitUntil: 'domcontentloaded' }); await j.ready(from);
      const actual = await j.snapshot(), issues = recoveryIssues(before, actual, 'classic');
      j.check(actual.inputVisible && !actual.won && actual.save === null && same(actual.chain, j.initial.chain) && j.completions().length === intentCount, 'The actual controlled reload loses saved progress and adds no client completion intent');
      j.check(same(issues, ['view-win', 'view-chain', 'view-connectors', 'view-score', 'recovery-bytes']), 'The owned recovery detector rejects the actual deleted target prefix');
      j.row.control = { changedKey: before.save.key, before, after: actual, detected: issues }; await j.shot('detected');
    }, true);
  }
  assert.equal(report.cases.length, PHASE === 'baseline' ? 9 : 12); assert.equal(report.controls.length, PHASE === 'baseline' ? 0 : 2);
  report.faultCases = report.cases.filter(row => row.kind === 'fault').length; report.normalCases = report.cases.filter(row => row.kind === 'normal').length;
  report.failures = [...report.cases, ...report.controls].filter(row => !row.ok).length;
  report.naturalChecks = report.cases.reduce((n, row) => n + row.checks, 0); report.controlChecks = report.controls.reduce((n, row) => n + row.checks, 0);
  report.fixtureRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'fixture').length, 0);
  report.abortedExternalRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'abort').length, 0);
  report.assets = [...new Set([...report.cases, ...report.controls].flatMap(row => row.assets))].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, 'dist', decodeURIComponent(file)))) }));
  const shots = [...report.cases, ...report.controls].flatMap(row => row.shots);
  report.inventory = shots.map(file => ({ file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))) }));
  assert.equal(report.failures, 0, 'A setup or unexpected outcome failed; no reproduction or recovery credit');
  assert.equal(shots.length, PHASE === 'baseline' ? 18 : 26); assert.equal(new Set(shots).size, shots.length);
  assert.equal(JSON.stringify(site.careerPlayers), originalPlayers);
  if (PHASE === 'baseline') { assert.equal(report.baselineCrashes, 9); report.status = 'baseline-reproduced'; process.exitCode = 1; console.log('Win recovery baseline: 9 natural quota-type marker failures reload into the owned reading-club route crash, setupFailures 0. Intentional exit 1.'); }
  else { report.status = 'passed'; console.log(`Win recovery fixed: ${report.checks} checks (${report.naturalChecks} natural, ${report.controlChecks} control), 9 real failed-marker recoveries, 3 normal save preservations, 2 effective controls, 26 original captures, ${report.fixtureRequests} fixture reads, ${report.abortedExternalRequests} external aborts, 0 failures.`); }
} catch (error) {
  report.status = 'failed'; report.error = String(error.stack || error); report.setupFailures += 1; process.exitCode = 1; console.error(report.error);
} finally {
  await browser?.close(); host?.kill();
  report.sourceAfter = receipt(); report.sourceHeld = same(sourceBefore, report.sourceAfter) && head() === report.sourceCommit;
  if (!report.sourceHeld) { report.status = 'failed'; report.setupFailures += 1; process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.rmSync(tmp, { recursive: true, force: true });
}
