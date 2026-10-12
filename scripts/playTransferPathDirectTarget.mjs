/* Remote-only proof of direct target selection on the actual built route.
   baseline: nine genuine min-one searches must settle on the owned target
   exclusion text, remain unplayed, and record baseline-reproduced before exit 1.
   fixed: the same nine searches naturally win in one step. At 390 wide each
   rule also wins through Play Unlimited while keeping the daily save bytes.
   Five controls cover false min-one metadata, an omitted pick and a deleted
   actual won save. Statistics and direct metadata come from committed files.

   TRANSFER_PATH_DIRECT_TARGET_PHASE=baseline|fixed
   TRANSFER_PATH_PROOF_OUT=<artifact folder> node scripts/playTransferPathDirectTarget.mjs
   Build dist first. The method serves that existing build, fulfills fixture
   database reads and aborts all other external requests. No database probe. */
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
import { buildGraph, deriveHint, sharedClub } from './lib/transferPathHints.mjs';

assert(process.env.CI, 'Direct target browser proof runs remotely only');
const PHASE = process.env.TRANSFER_PATH_DIRECT_TARGET_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'Select baseline or fixed explicitly');
assert(process.env.TRANSFER_PATH_PROOF_OUT, 'Set TRANSFER_PATH_PROOF_OUT');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.env.TRANSFER_PATH_PROOF_OUT), PHASE);
const RULES = { classic: 'Everyday', active: 'Active players only', europe: 'Europe only' };
const EXCLUDED = "Already in your chain, or it's the target. Name one of his teammates.";
const sha = value => createHash('sha256').update(value).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esc = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const heldFiles = [
  'src/components/transfer-path/TransferPathBoard.tsx', 'src/hooks/useTransferPath.ts',
  'src/hooks/useDailyPuzzle.ts', 'src/components/game/PlayerAutocomplete.tsx',
  'src/lib/playerSearch.ts', 'src/lib/transferPathEmptyList.ts',
  'src/lib/transferPathGraph.ts', 'src/lib/transferPathModes.ts',
  'src/data/careerPlayers.ts', 'src/data/transferPathPuzzles.ts',
  'src/data/transferPathVerifiedActive.ts', 'scripts/data/transferPathPull/puzzles.txt',
  'scripts/lib/transferPathHints.mjs', 'package.json', 'package-lock.json',
];
const receipt = () => heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
fs.mkdirSync(OUT, { recursive: true });
const sourceBefore = receipt();
const report = { phase: PHASE, sourceCommit: head(), methodSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), sourceBefore, status: 'pending', checks: 0, missingTargets: 0, setupFailures: 0, failures: 0, cases: [], controls: [] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-direct-target-'));
let browser, host;

try {
  for (const item of sourceBefore) assert.equal(item.sha256, sha(execFileSync('git', ['show', `${report.sourceCommit}:${item.file}`], { cwd: ROOT })), `${item.file} differs from the committed source`);
  const bundle = path.join(tmp, 'fixture-source.mjs');
  await build({
    stdin: { contents: "export { careerPlayers } from './src/data/careerPlayers.ts'; export { default as puzzles } from './src/data/transferPathPuzzles.ts'; export { playersUnderRule } from './src/lib/transferPathModes.ts';", resolveDir: ROOT, sourcefile: 'direct-target-fixtures.mjs', loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'offline-supabase', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'offline-supabase', namespace: 'offline-supabase' }));
      b.onLoad({ filter: /.*/, namespace: 'offline-supabase' }, () => ({ contents: 'export const supabase = null; export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' }));
    } }],
  });
  const site = await import(pathToFileURL(bundle).href);
  const originalPlayers = JSON.stringify(site.careerPlayers), originalPuzzles = JSON.stringify(site.puzzles);
  const direct = site.puzzles.find(p => p.id === 'tp-2');
  assert(direct && direct.playerA === 'Lionel Messi' && direct.playerB === 'Neymar', 'The actual committed direct fixture is required');
  const graphs = Object.fromEntries(Object.keys(RULES).map(rule => [rule, buildGraph(site.playersUnderRule(site.careerPlayers, rule))]));
  for (const rule of Object.keys(RULES)) {
    const entry = rule === 'classic' ? direct : direct[rule];
    assert.equal(entry?.minSteps, 1, `${rule}: committed direct metadata is unavailable`);
    assert.equal(deriveHint(graphs[rule], direct.playerA, direct.playerB)?.minSteps, 1, `${rule}: independent graph does not verify the direct pair`);
  }
  const retained = fs.readFileSync(path.join(ROOT, 'scripts/data/transferPathPull/puzzles.txt'), 'utf8').split(/\r?\n/).map(line => line.split('|')).find(row => row[0] === 'tpa-662');
  assert(retained?.[1] === 'Lionel Messi' && retained?.[2] === 'Mohamed Salah', 'The non-direct control must use its actual committed retained pair');
  const nonDirectEntries = Object.fromEntries(Object.keys(RULES).map(rule => {
    const value = deriveHint(graphs[rule], retained[1], retained[2]);
    assert(value && value.minSteps > 1, `${rule}: no independently verified non-direct route is available for the control`);
    assert.equal(sharedClub(graphs[rule], retained[1], retained[2]), null, `${rule}: control pair has a direct link`);
    return [rule, { minSteps: value.minSteps, hint: value.hint }];
  }));
  const nonDirect = { id: retained[0], playerA: retained[1], playerB: retained[2], ...nonDirectEntries.classic, active: nonDirectEntries.active, europe: nonDirectEntries.europe };
  const forged = { ...nonDirect, minSteps: 1, active: { ...nonDirect.active, minSteps: 1 }, europe: { ...nonDirect.europe, minSteps: 1 } };
  assert(!same(nonDirect, forged), 'Wrong-minimum control changed nothing');
  const players = site.careerPlayers.map((p, i) => ({ id: `direct-fixture-${String(i + 1).padStart(5, '0')}`, player_name: p.name, nationality: p.nationality, position: p.position }));
  const seasons = site.careerPlayers.flatMap((p, i) => p.career.map((s, sort_order) => ({ player_id: players[i].id, season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, market_value: s.marketValue, sort_order })));
  report.fixture = { directMetadataSource: 'actual committed tp-2 fallback object', direct, nonDirectMetadataSource: 'committed retained pair, independently derived original graph metadata', nonDirect, forgedMinimums: forged, players: players.length, statisticsRows: seasons.length, playerRowsSha256: sha(JSON.stringify(players)), seasonRowsSha256: sha(JSON.stringify(seasons)) };

  assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before the browser proof');
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

  function winIssues(state, puzzle, rule) {
    const issues = [];
    if (!state.won) issues.push('win-state');
    if (!same(state.chain.players, [puzzle.playerA, puzzle.playerB])) issues.push('win-chain');
    if (state.chain.clubs.length !== 1 || !graphs[rule].adj.get(puzzle.playerA)?.get(puzzle.playerB)?.some(s => s.club === state.chain.clubs[0])) issues.push('win-connector');
    if (!state.scoreText.includes('1000 pts')) issues.push('win-score');
    if (state.save?.value.gameStatus !== 'won' || !same(state.save.value.guesses, [{ t: 'step', player: puzzle.playerB, club: state.chain.clubs[0] }, { t: 'won' }])) issues.push('win-actions');
    return issues;
  }
  function reloadIssues(before, after) {
    const issues = [];
    if (before.save?.key !== after.save?.key || before.save?.raw !== after.save?.raw) issues.push('reload-save');
    if (!same(before.chain.players, after.chain.players)) issues.push('reload-chain');
    if (!same(before.chain.clubs, after.chain.clubs)) issues.push('reload-connector');
    if (before.won !== after.won) issues.push('reload-win');
    if (!same(before.scoreText, after.scoreText)) issues.push('reload-score');
    if (before.minimum !== after.minimum || !after.everyday) issues.push('reload-rule-or-minimum');
    return issues;
  }
  async function walk(spec, action, control = false) {
    const row = { id: spec.id, rule: spec.rule, width: spec.width, height: spec.height, puzzleId: spec.puzzle.id, checks: 0, requests: [], errors: [], assetFailures: [], assets: [], stages: [], shots: [] };
    (control ? report.controls : report.cases).push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, hasTouch: spec.width < 1280, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    const p = spec.puzzle;
    const puzzleRow = { puzzle_id: p.id, player_a: p.playerA, player_b: p.playerB, min_steps: p.minSteps, hint: p.hint, sort_order: 0, active_min_steps: p.active?.minSteps ?? null, active_hint: p.active?.hint ?? null, europe_min_steps: p.europe?.minSteps ?? null, europe_hint: p.europe?.hint ?? null };
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      const table = /^\/rest\/v1\/(career_players|career_seasons|transfer_path_puzzles)$/.exec(url.pathname)?.[1];
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'GET') {
        let data = table === 'career_players' ? players : table === 'career_seasons' ? seasons : [puzzleRow];
        const filter = url.searchParams.get('player_name');
        if (filter) { assert(filter.startsWith('ilike.')); const query = filter.slice(6).replaceAll('%', '').toLowerCase(); data = data.filter(v => v.player_name.toLowerCase().includes(query)); }
        const range = request.headers().range?.match(/^(\d+)-(\d+)$/);
        const offset = Number(url.searchParams.get('offset') ?? range?.[1] ?? 0), limit = Number(url.searchParams.get('limit') ?? (range ? Number(range[2]) - Number(range[1]) + 1 : 1000));
        const columns = url.searchParams.get('select')?.split(',').map(v => v.trim());
        const payload = data.slice(offset, offset + limit).map(v => columns && !columns.includes('*') ? Object.fromEntries(columns.map(key => [key, v[key]])) : v);
        row.requests.push({ action: 'fixture', table, offset, rows: payload.length, filter: filter ?? null, targetInPayload: table === 'career_players' && payload.some(v => v.player_name === p.playerB) });
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      row.requests.push({ action: 'abort', origin: url.origin, path: url.pathname, method: request.method() }); return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && !/^Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)/.test(message.text())) row.errors.push(message.text()); });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin !== BASE) return; if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js') && !row.assets.includes(url.pathname)) row.assets.push(url.pathname); if (response.status() >= 400) row.assetFailures.push({ path: url.pathname, status: response.status() }); });
    const check = (ok, message) => { assert(ok, `${spec.id}: ${message}`); row.checks += 1; report.checks += 1; };
    const activate = locator => spec.width < 1280 ? locator.tap() : locator.click();
    const input = () => page.getByRole('combobox', { name: 'Type a player name...' });
    const options = () => page.getByRole('option').evaluateAll(elements => elements.map(e => ({ name: e.querySelector('span.text-sm.font-medium')?.innerText ?? null, textContent: e.textContent, innerText: e.innerText })));
    const targetOption = () => page.getByRole('option').filter({ has: page.locator('span.text-sm.font-medium').filter({ hasText: new RegExp(`^\\s*${esc(p.playerB)}\\s*$`) }) });
    const snapshot = async () => ({
      chain: { players: await page.locator('#dukb-main .space-y-0').first().locator('span.font-semibold.text-foreground').allTextContents(), clubs: await page.locator('#dukb-main .space-y-0').first().locator('span.italic').allTextContents() },
      minimum: Number(/^Optimal:\s*(\d+)/.exec(await page.locator('#dukb-main p').filter({ hasText: /^Optimal: \d+/ }).first().innerText())?.[1]),
      everyday: await page.getByRole('button', { name: RULES.classic, exact: true }).getAttribute('aria-pressed') === 'true',
      won: await page.getByText('Connected!', { exact: true }).count() === 1,
      scoreText: await page.locator('#dukb-main span').filter({ hasText: /^\d+ pts$/ }).allTextContents(),
      save: await page.evaluate(() => { const key = Object.keys(localStorage).find(k => k.startsWith('transfer-path-daily-')); const raw = key ? localStorage.getItem(key) : null; return key && raw ? { key, raw, value: JSON.parse(raw) } : null; }),
    });
    const shot = async stage => { const name = `${spec.id}-${stage}.png`; await page.locator('#dukb-main').screenshot({ path: path.join(OUT, name) }); row.shots.push(name); };
    const completionAttempts = () => row.requests.filter(r => r.path === '/rest/v1/game_completions' && r.method === 'POST').length;
    async function ready(from = 0) {
      await input().waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 });
      const reads = row.requests.slice(from);
      check(reads.filter(r => r.action === 'fixture' && r.table === 'career_seasons').reduce((n, r) => n + r.rows, 0) === seasons.length, 'All unchanged statistics rows reached this mounted graph');
      check(reads.some(r => r.action === 'fixture' && r.table === 'transfer_path_puzzles' && r.rows === 1), 'The actual single-puzzle fixture loaded');
    }
    async function searchTarget() {
      row.lastQuery = p.playerB; const from = row.requests.length; await input().fill(p.playerB);
      return from;
    }
    function searchVerified(from) {
      check(row.requests.slice(from).some(r => r.action === 'fixture' && r.table === 'career_players' && r.filter && r.targetInPayload), 'The queried fixture actually supplied the target identity');
    }
    async function offeredTarget() {
      const from = await searchTarget(); await targetOption().waitFor({ state: 'visible', timeout: 10000 });
      check(await targetOption().count() === 1, 'Exactly one target identity is offered');
      const name = (await targetOption().locator('span.text-sm.font-medium').innerText()).trim();
      check(name === p.playerB, 'The offered full-name label is exactly the target'); searchVerified(from);
      row.stages.push({ stage: 'target-offered', query: p.playerB, options: await options() }); return targetOption();
    }
    async function pickTarget() {
      const option = await offeredTarget(); await activate(option);
      await page.waitForFunction(() => document.querySelector('#dukb-main p.text-destructive') || document.querySelector('#dukb-main .space-y-0')?.querySelectorAll('span.font-semibold.text-foreground').length > 1 || !document.querySelector('[role=combobox]'), null, { timeout: 5000 });
      const state = await snapshot(); row.stages.push({ stage: 'target-picked', ...state }); return state;
    }
    async function reloadWon(expected, stage) {
      const from = row.requests.length, completions = completionAttempts(); await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Connected!', { exact: true }).waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 });
      const reads = row.requests.slice(from);
      check(reads.filter(r => r.action === 'fixture' && r.table === 'career_seasons').reduce((n, r) => n + r.rows, 0) === seasons.length, 'Reload consumes all original statistics rows');
      const actual = await snapshot(), issues = reloadIssues(expected, actual);
      row.stages.push({ stage, before: expected, after: actual, issues });
      check(issues.length === 0, `Won daily bytes and one-step outcome restore: ${issues.join(', ')}`);
      check(completionAttempts() === completions, 'Reload does not attempt to record the restored win again'); await shot(stage); return actual;
    }
    try {
      await page.goto(`${BASE}/transfer-path`, { waitUntil: 'domcontentloaded' }); await ready();
      await activate(page.getByRole('button', { name: RULES[spec.rule], exact: true }));
      check(await page.getByRole('button', { name: RULES[spec.rule], exact: true }).getAttribute('aria-pressed') === 'true', 'The requested rule is selected');
      const initial = await snapshot();
      check(initial.minimum === 1 && same(initial.chain.players, [p.playerA]) && initial.chain.clubs.length === 0 && !initial.won && initial.save === null, 'The min-one board starts naturally with no saved move or win');
      row.stages.push({ stage: 'initial', ...initial });
      await action({ page, row, check, input, activate, snapshot, shot, ready, searchTarget, searchVerified, offeredTarget, pickTarget, reloadWon, initial });
      row.layout = await page.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(row.layout.width === spec.width && row.layout.clientWidth === row.layout.scrollWidth, 'The actual requested viewport has no sideways overflow');
      check(row.errors.length === 0 && row.assetFailures.length === 0, 'No app exception or failed owned asset'); row.ok = true;
      if (PHASE === 'baseline' && row.bugReproduced) report.missingTargets += 1;
      console.log(`${PHASE === 'baseline' ? 'BASELINE' : 'PASS'} ${spec.id}: ${row.checks} checks`);
    } catch (error) {
      row.ok = false; row.error = String(error.stack || error); report.setupFailures += 1;
      row.failureOptions = await options().catch(() => []); row.failureSearch = await input().inputValue().catch(() => null);
      row.failureText = await page.locator('#dukb-main').innerText().catch(() => ''); await shot('failure').catch(() => {});
      console.error(`FAIL ${spec.id}: ${row.error}\nOptions: ${JSON.stringify(row.failureOptions)}`);
    } finally { await context.close(); }
  }

  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) for (const rule of Object.keys(RULES)) {
    await walk({ id: `${PHASE}-tp-2-${rule}-${width}x${height}`, rule, width, height, puzzle: direct }, async j => {
      if (PHASE === 'baseline') {
        const from = await j.searchTarget(); const empty = j.page.locator('[role=listbox] [role=status]');
        await empty.waitFor({ state: 'visible', timeout: 10000 }); const text = await empty.innerText();
        j.searchVerified(from); j.check(text === EXCLUDED && await j.page.getByRole('option').count() === 0, 'The settled list owns the target-exclusion result');
        await j.input().press('Enter'); const actual = await j.snapshot();
        j.check(same(actual, j.initial), 'Typing the direct target and pressing Enter cannot change the unplayed chain/save');
        const issues = winIssues(actual, direct, rule);
        j.check(same(issues, ['win-state', 'win-chain', 'win-connector', 'win-score', 'win-actions']), 'The actual one-step outcome is unavailable for the owned reason');
        j.row.targetExclusion = { query: direct.playerB, suppliedByFixture: true, text, observedOutcome: actual, unavailableOutcome: issues };
        j.row.bugReproduced = true; await j.shot('excluded-target'); return;
      }
      const won = await j.pickTarget(), issues = winIssues(won, direct, rule);
      j.row.stages.push({ stage: 'daily-win', issues, ...won }); j.check(issues.length === 0, `Natural one-step win: ${issues.join(', ')}`);
      j.check(won.save?.value.puzzleId === direct.id && won.minimum === 1, 'The real one-step save belongs to the committed direct puzzle');
      await j.page.waitForLoadState('networkidle', { timeout: 8000 }); await j.shot('daily-win');
      if (width === 390) {
        const held = won.save.raw;
        await j.activate(j.page.getByRole('button', { name: 'Play Unlimited', exact: true })); await j.input().waitFor({ state: 'visible' });
        j.check(await j.page.getByRole('button', { name: RULES[rule], exact: true }).getAttribute('aria-pressed') === 'true', 'Unlimited keeps the deliberately selected in-memory rule');
        const playing = await j.snapshot(); j.check(playing.save.raw === held && same(playing.chain.players, [direct.playerA]), 'Starting unlimited holds daily bytes and resets its own chain');
        const practice = await j.pickTarget();
        j.check(practice.won && same(practice.chain.players, [direct.playerA, direct.playerB]) && practice.chain.clubs.length === 1 && graphs[rule].adj.get(direct.playerA)?.get(direct.playerB)?.some(s => s.club === practice.chain.clubs[0]) && practice.scoreText.includes('1000 pts'), 'The actual unlimited pick wins in one valid step for 1000');
        j.check(practice.save.raw === held, 'Unlimited winning keeps every daily saved byte'); j.row.stages.push({ stage: 'unlimited-win', ...practice }); await j.shot('unlimited-win');
      }
      await j.reloadWon(won, 'daily-win-reload');
    });
  }
  if (PHASE === 'fixed') {
    for (const rule of Object.keys(RULES)) await walk({ id: `control-false-minimum-${rule}-390x844`, rule, width: 390, height: 844, puzzle: forged }, async j => {
      const state = await j.pickTarget(), refusals = await j.page.locator('#dukb-main p.text-destructive').allTextContents();
      const refusal = refusals[0] ?? '';
      const rejectsLink = /\bnever at the same club\b.*\bin the same season\b/.test(refusal) || /\bverified season records do not connect\b/.test(refusal);
      j.check(refusals.length === 1 && refusal.includes(forged.playerA) && refusal.includes(forged.playerB) && rejectsLink, 'One refusal names both endpoints and denies a verified link despite the min-one claim');
      j.check(same(state, j.initial), 'The refused non-direct target burns no move, save or score');
      j.row.control = { changedMinimums: ['classic', 'active', 'europe'], actualOriginal: nonDirect, supplied: forged, observed: state, refusals }; await j.shot('rejected-target');
    }, true);
    await walk({ id: 'control-omitted-selection-390x844', rule: 'classic', width: 390, height: 844, puzzle: direct }, async j => {
      await j.offeredTarget(); const state = await j.snapshot(), issues = winIssues(state, direct, 'classic');
      j.check(same(state, j.initial), 'The controlled actual offered target has not been selected');
      j.check(same(issues, ['win-state', 'win-chain', 'win-connector', 'win-score', 'win-actions']), 'The owned win detector rejects the actual omitted selection');
      j.row.control = { omittedAction: 'Select the actual offered Neymar option', observed: state, detected: issues }; await j.shot('detected');
    }, true);
    await walk({ id: 'control-deleted-won-save-390x844', rule: 'classic', width: 390, height: 844, puzzle: direct }, async j => {
      const won = await j.pickTarget(); j.check(winIssues(won, direct, 'classic').length === 0, 'Save-deletion control reaches a genuine direct win');
      j.check(won.save?.raw && won.save.value.guesses.length === 2, 'The control owns actual nonempty won bytes');
      await j.page.evaluate(key => localStorage.removeItem(key), won.save.key);
      j.check(await j.page.evaluate(key => localStorage.getItem(key), won.save.key) === null, 'The control actually removes its won saved bytes');
      const from = j.row.requests.length; await j.page.reload({ waitUntil: 'domcontentloaded' }); await j.ready(from);
      const actual = await j.snapshot(), issues = reloadIssues(won, actual);
      j.check(same(actual.chain, j.initial.chain) && !actual.won && actual.save === null, 'The actual controlled reload loses the completed chain');
      j.check(same(issues, ['reload-save', 'reload-chain', 'reload-connector', 'reload-win', 'reload-score']), 'The owned reload detector rejects the actual lost win');
      j.row.control = { changedKey: won.save.key, before: won, after: actual, detected: issues }; await j.shot('detected');
    }, true);
  }
  assert.equal(report.cases.length, 9); assert.equal(report.controls.length, PHASE === 'baseline' ? 0 : 5);
  report.failures = [...report.cases, ...report.controls].filter(row => !row.ok).length;
  report.fixtureRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'fixture').length, 0);
  report.abortedExternalRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'abort').length, 0);
  report.assets = [...new Set([...report.cases, ...report.controls].flatMap(row => row.assets))].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, 'dist', decodeURIComponent(file)))) }));
  assert.equal(report.failures, 0, 'A setup or unexpected outcome failed; no acceptance credit');
  assert.equal(JSON.stringify(site.careerPlayers), originalPlayers); assert.equal(JSON.stringify(site.puzzles), originalPuzzles);
  if (PHASE === 'baseline') { assert.equal(report.missingTargets, 9); report.status = 'baseline-reproduced'; process.exitCode = 1; console.log('Direct target baseline: 9 genuine min-one target searches excluded, no one-step win, setupFailures 0. Intentional exit 1.'); }
  else { report.status = 'passed'; console.log(`Direct target fixed: ${report.checks} checks, 9 direct daily wins, 3 unlimited wins, 5 effective controls, ${report.fixtureRequests} fixture reads, ${report.abortedExternalRequests} external aborts, 0 failures.`); }
} catch (error) {
  report.status = 'failed'; report.error = String(error.stack || error); report.setupFailures += 1; process.exitCode = 1; console.error(report.error);
} finally {
  await browser?.close(); host?.kill();
  report.sourceAfter = receipt(); report.sourceHeld = same(sourceBefore, report.sourceAfter) && head() === report.sourceCommit;
  if (!report.sourceHeld) { report.status = 'failed'; report.setupFailures += 1; process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.rmSync(tmp, { recursive: true, force: true });
}
