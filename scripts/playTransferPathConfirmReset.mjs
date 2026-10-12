/* Remote-only actual-route proof of a confirmation crossing round contexts.
   The unchanged committed pool [tp-2, tp-3, tp-5] and career records are
   served as fixtures at ET 2026-10-12. The actual blocked daily entry reaches
   Unlimited without a direct-target win or a surrendered-daily entry.
   Three flows change the pair after a real nonterminal move, change the rule
   of the same practice pair, or change a valid daily rule before any step.
   baseline owns nine stale confirmations after true context changes.
   fixed requires a neutral control, a fresh request and a real legal reveal.
   Same-rule and blocked-rule selections keep the actual context intact.
   Two effective controls omit an actual rule activation or fresh Yes action.

   TRANSFER_PATH_CONFIRM_RESET_PHASE=baseline|fixed
   TRANSFER_PATH_CONFIRM_RESET_OUT=<artifact root>
   node scripts/playTransferPathConfirmReset.mjs
   Build dist first on the remote runner. All external traffic is intercepted.
   Completion POSTs are counted and aborted, never credited as backend awards. */
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
import { buildGraph, deriveHint, hintProblems } from './lib/transferPathHints.mjs';

assert(process.env.CI, 'Confirmation reset browser proof runs remotely only');
const PHASE = process.env.TRANSFER_PATH_CONFIRM_RESET_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'Select baseline or fixed explicitly');
assert(process.env.TRANSFER_PATH_CONFIRM_RESET_OUT, 'Set TRANSFER_PATH_CONFIRM_RESET_OUT');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.env.TRANSFER_PATH_CONFIRM_RESET_OUT), PHASE);
const RULES = { classic: 'Everyday', active: 'Active players only', europe: 'Europe only' };
const ET_DAY = '2026-10-12', FIXED_TIME = '2026-10-12T16:00:00Z';
const FLOWS = ['changed-pair-after-step', 'same-pair-rule', 'daily-rule'];
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
  'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/lib/restoredFinish.ts',
  'src/lib/dailySaveShapes.ts', 'src/components/RouteErrorBoundary.tsx',
  'src/lib/dateUtils.ts', 'src/lib/fetchCareerPlayers.ts',
  'src/lib/fetchTransferPathPuzzles.ts', 'src/lib/fetchAllRows.ts',
  'src/components/game/GiveUpButton.tsx',
];
const receipt = () => heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const installedReceipt = () => ['esbuild', 'playwright', 'playwright-core'].map(name => {
  const raw = fs.readFileSync(path.join(ROOT, 'node_modules', name, 'package.json'));
  return { name, version: JSON.parse(raw).version, sha256: sha(raw) };
});
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
fs.mkdirSync(OUT, { recursive: true });
const sourceBefore = receipt(), installedBefore = installedReceipt();
const report = { phase: PHASE, sourceCommit: head(), methodSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), sourceBefore, installedBefore, scope: 'Signed-out confirmation and local daily state on an actual fixture-only built route; no bootstrap, authenticated or backend award claim', status: 'pending', checks: 0, staleConfirmations: 0, setupFailures: 0, failures: 0, cases: [], controls: [] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-confirm-reset-'));
let browser, host;

try {
  for (const item of sourceBefore) assert.equal(item.sha256, sha(execFileSync('git', ['show', `${report.sourceCommit}:${item.file}`], { cwd: ROOT })), `${item.file} differs from committed source`);
  const bundle = path.join(tmp, 'fixture-source.mjs');
  await build({
    stdin: { contents: "export { careerPlayers } from './src/data/careerPlayers.ts'; export { default as fallbackPuzzles } from './src/data/transferPathPuzzles.ts'; export { playersUnderRule } from './src/lib/transferPathModes.ts'; export { dateSeed } from './src/lib/dateUtils.ts';", resolveDir: ROOT, sourcefile: 'confirm-reset-fixtures.mjs', loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'offline-supabase', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'offline-supabase', namespace: 'offline-supabase' }));
      b.onLoad({ filter: /.*/, namespace: 'offline-supabase' }, () => ({ contents: 'export const supabase = null; export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' }));
    } }],
  });
  const site = await import(pathToFileURL(bundle).href), originalPlayers = JSON.stringify(site.careerPlayers), originalPuzzles = JSON.stringify(site.fallbackPuzzles);
  const puzzles = ['tp-2', 'tp-3', 'tp-5'].map(id => site.fallbackPuzzles.find(p => p.id === id));
  assert(puzzles.every(Boolean), 'The three actual committed fallback rows are required');
  assert.equal(site.dateSeed(ET_DAY) % puzzles.length, 2); assert.equal(puzzles[2].playerA, 'Steven Gerrard'); assert.equal(puzzles[2].playerB, 'Cristiano Ronaldo');
  const graphs = Object.fromEntries(Object.keys(RULES).map(rule => [rule, buildGraph(site.playersUnderRule(site.careerPlayers, rule))]));
  const metadata = puzzles.map(puzzle => ({ id: puzzle.id, rules: Object.fromEntries(Object.keys(RULES).map(rule => {
    const stored = rule === 'classic' ? puzzle : puzzle[rule], truth = deriveHint(graphs[rule], puzzle.playerA, puzzle.playerB);
    assert.equal(Boolean(stored), Boolean(truth), `${puzzle.id}/${rule}: committed reachability differs from the original graph`);
    if (stored) {
      assert.equal(stored.minSteps, truth.minSteps, `${puzzle.id}/${rule}: committed minimum differs`);
      assert.deepEqual(hintProblems(graphs[rule], puzzle.playerA, puzzle.playerB, stored.minSteps, stored.hint), [], `${puzzle.id}/${rule}: committed hint is invalid`);
      if (stored.oneOptimalPath) assert(stored.oneOptimalPath.length - 1 === truth.minSteps && stored.oneOptimalPath.every((name, i, list) => i === 0 || graphs[rule].adj.get(list[i - 1])?.has(name)), `${puzzle.id}/${rule}: committed worked path is invalid`);
    }
    return [rule, truth];
  })) }));
  assert.deepEqual(puzzles.filter(p => p.active).map(p => p.id), ['tp-2']); assert(puzzles.every(p => p.europe));
  const practice = puzzles[1], activePractice = puzzles[0], daily = puzzles[2];
  const withoutStart = buildGraph(site.careerPlayers.filter(p => p.name !== practice.playerA));
  const nonterminal = site.careerPlayers.find(p => p.name !== practice.playerB && graphs.classic.adj.get(practice.playerA)?.has(p.name) && !graphs.classic.adj.get(p.name)?.has(practice.playerB) && deriveHint(withoutStart, p.name, practice.playerB));
  assert(nonterminal, 'A real accepted Pirlo teammate that does not automatically close the round is required');
  const players = site.careerPlayers.map((p, i) => ({ id: `confirm-reset-fixture-${String(i + 1).padStart(5, '0')}`, player_name: p.name, nationality: p.nationality, position: p.position }));
  const seasons = site.careerPlayers.flatMap((p, i) => p.career.map((s, sort_order) => ({ player_id: players[i].id, season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, market_value: s.marketValue, sort_order })));
  assert.equal(players.length, 253); assert.equal(seasons.length, 3640);
  const puzzleRows = puzzles.map((p, sort_order) => ({ puzzle_id: p.id, player_a: p.playerA, player_b: p.playerB, min_steps: p.minSteps, hint: p.hint, sort_order, active_min_steps: p.active?.minSteps ?? null, active_hint: p.active?.hint ?? null, europe_min_steps: p.europe?.minSteps ?? null, europe_hint: p.europe?.hint ?? null }));
  report.fixture = { metadataSource: 'Three unchanged actual committed fallback records, independently checked on the unchanged original career graph', day: ET_DAY, fixedTime: FIXED_TIME, puzzleOrder: puzzles.map(p => p.id), dailyIndex: 2, puzzles, metadata, nonterminal: { name: nonterminal.name, shared: graphs.classic.adj.get(practice.playerA).get(nonterminal.name), remainingWithoutStart: deriveHint(withoutStart, nonterminal.name, practice.playerB) }, players: players.length, statisticsRows: seasons.length, playerRowsSha256: sha(JSON.stringify(players)), seasonRowsSha256: sha(JSON.stringify(seasons)) };
  assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before browser proof');
  const port = await new Promise((resolve, reject) => { const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(error => error ? reject(error) : resolve(value)); }); });
  const BASE = `http://127.0.0.1:${port}`;
  host = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let hostError = ''; host.stderr.on('data', value => { hostError += value; }); const deadline = Date.now() + 15000;
  while (true) { try { const response = await fetch(BASE); assert.equal(response.status, 200); break; } catch (error) { if (host.exitCode !== null || Date.now() > deadline) throw new Error(`Built-site server did not start: ${hostError || error}`); await new Promise(resolve => setTimeout(resolve, 100)); } }
  browser = await pw.chromium.launch();

  function contextMatches(state, puzzle, mode, rule) { return state.puzzleId === puzzle.id && state.mode === mode && state.activeRule === rule && state.unlimitedIndex === 0 && state.minimum === (rule === 'classic' ? puzzle.minSteps : puzzle[rule].minSteps); }
  function resetIssues(state, puzzle, mode, rule) {
    const issues = [];
    if (!contextMatches(state, puzzle, mode, rule)) issues.push('context');
    if (!same(state.chain, { players: [puzzle.playerA], clubs: [] })) issues.push('chain');
    if (state.confirming) issues.push('confirmation');
    if (!state.neutral) issues.push('neutral-control');
    if (!state.inputVisible || state.revealed || state.won) issues.push('view-building');
    return issues;
  }
  function legalReveal(state, puzzle, rule) {
    const path = state.reveal.players, minimum = rule === 'classic' ? puzzle.minSteps : puzzle[rule].minSteps;
    return path[0] === puzzle.playerA && path.at(-1) === puzzle.playerB && path.length - 1 === minimum && new Set(path).size === path.length && state.reveal.clubs.length === minimum && state.reveal.clubs.every((club, i) => graphs[rule].adj.get(path[i])?.get(path[i + 1])?.some(s => s.club === club));
  }
  function surrenderIssues(state, puzzle, rule) { const issues = []; if (!state.revealed || state.inputVisible || state.confirming || state.neutral || state.won) issues.push('view-surrender'); if (!legalReveal(state, puzzle, rule)) issues.push('reveal-path'); return issues; }
  async function walk(spec, action, control = false) {
    const row = { ...spec, checks: 0, requests: [], errors: [], expectedBlockedDiagnostics: [], assetFailures: [], assets: [], stages: [], shots: [] };
    (control ? report.controls : report.cases).push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, hasTouch: spec.width < 1280, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()); if (url.origin === BASE) return route.continue();
      const table = /^\/rest\/v1\/(career_players|career_seasons|transfer_path_puzzles)$/.exec(url.pathname)?.[1], cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      if (/\.supabase\.co$/i.test(url.hostname) && url.pathname === '/rest/v1/game_completions' && request.method() === 'OPTIONS') { row.requests.push({ action: 'completion-preflight', path: url.pathname }); return route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,prefer', 'access-control-allow-methods': 'POST,OPTIONS' }, body: '' }); }
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'GET') {
        let data = table === 'career_players' ? players : table === 'career_seasons' ? seasons : puzzleRows;
        const filter = url.searchParams.get('player_name'); if (filter) { assert(filter.startsWith('ilike.')); const query = filter.slice(6).replaceAll('%', '').toLowerCase(); data = data.filter(v => v.player_name.toLowerCase().includes(query)); }
        const range = request.headers().range?.match(/^(\d+)-(\d+)$/), offset = Number(url.searchParams.get('offset') ?? range?.[1] ?? 0), limit = Number(url.searchParams.get('limit') ?? (range ? Number(range[2]) - Number(range[1]) + 1 : 1000));
        const columns = url.searchParams.get('select')?.split(',').map(v => v.trim()), payload = data.slice(offset, offset + limit).map(v => columns && !columns.includes('*') ? Object.fromEntries(columns.map(key => [key, v[key]])) : v);
        row.requests.push({ action: 'fixture', table, columns, offset, rows: payload.length, filter: filter ?? null, names: filter ? payload.map(v => v.player_name) : [] });
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      let completion; if (url.pathname === '/rest/v1/game_completions' && request.method() === 'POST') { const body = request.postDataJSON(), value = Array.isArray(body) ? body[0] : body; completion = { game: value?.game, score: value?.score }; }
      row.requests.push({ action: 'abort', url: request.url(), origin: url.origin, path: url.pathname, method: request.method(), ...(completion ? { completion } : {}) }); return route.abort('blockedbyclient');
    });
    const page = await context.newPage(), consoleTasks = []; await page.clock.setFixedTime(FIXED_TIME);
    page.on('pageerror', error => row.errors.push(String(error.stack || error)));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      if (/^Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)/.test(message.text()) && row.requests.some(r => r.action === 'abort' && r.url === message.location().url)) { row.expectedBlockedDiagnostics.push({ text: message.text(), url: message.location().url }); return; }
      consoleTasks.push((async () => { const details = await Promise.allSettled(message.args().map(arg => arg.evaluate(v => v instanceof Error ? `${v.name}: ${v.message}\n${v.stack ?? ''}` : null))); row.errors.push([message.text(), ...details.flatMap(v => v.status === 'fulfilled' && v.value ? [v.value] : [])].join('\n')); })());
    });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin !== BASE) return; if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js') && !row.assets.includes(url.pathname)) row.assets.push(url.pathname); if (response.status() >= 400) row.assetFailures.push({ path: url.pathname, status: response.status() }); });
    page.on('requestfailed', request => { const url = new URL(request.url()); if (url.origin === BASE) row.assetFailures.push({ path: url.pathname, error: request.failure()?.errorText }); });
    const check = (ok, message) => { assert(ok, `${spec.id}: ${message}`); row.checks += 1; report.checks += 1; };
    const activate = locator => spec.width < 1280 ? locator.tap() : locator.click();
    const input = () => page.getByRole('combobox', { name: 'Type a player name...' });
    const yes = () => page.getByRole('button', { name: 'Yes, reveal it', exact: true });
    const neutral = () => page.getByRole('button', { name: 'Give up and see a path', exact: true });
    const ruleButton = rule => page.getByRole('button', { name: RULES[rule], exact: true });
    const completions = () => row.requests.filter(r => r.method === 'POST' && r.completion?.game === 'transfer-path');
    const options = () => page.getByRole('option').evaluateAll(elements => elements.map(e => ({ name: e.querySelector('span.text-sm.font-medium')?.innerText ?? null, textContent: e.textContent, innerText: e.innerText })));
    const readSave = () => page.evaluate(() => { const key = Object.keys(localStorage).find(k => k.startsWith('transfer-path-daily-')); const raw = key ? localStorage.getItem(key) : null; return key && raw ? { key, raw, value: JSON.parse(raw) } : null; });
    async function snapshot() {
      let selectedRule; for (const rule of Object.keys(RULES)) if (await ruleButton(rule).getAttribute('aria-pressed') === 'true') selectedRule = rule;
      const minimumText = await page.locator('#dukb-main p').filter({ hasText: /^Optimal: \d+/ }).first().innerText(), activeRule = Object.keys(RULES).find(r => minimumText.includes(`under ${RULES[r]}`)) ?? 'classic';
      const pair = await page.locator('#dukb-main div.rounded-2xl.border.border-border.bg-surface-1.p-5').first().locator('p.text-sm.font-bold').allTextContents(), puzzle = puzzles.find(p => p.playerA === pair[0] && p.playerB === pair[1]);
      const dailyMode = await page.getByText('📅 Daily Challenge', { exact: true }).count() === 1, unlimitedText = dailyMode ? null : await page.locator('#dukb-main p').filter({ hasText: /^♾️ Unlimited #/ }).first().innerText();
      const lists = page.locator('#dukb-main .space-y-0'), readPath = async index => await lists.count() > index ? { players: await lists.nth(index).locator('span.font-semibold.text-foreground').allTextContents(), clubs: await lists.nth(index).locator('span.italic').allTextContents() } : { players: [], clubs: [] };
      return { puzzleId: puzzle?.id, pair, mode: dailyMode ? 'daily' : 'unlimited', unlimitedIndex: dailyMode ? 0 : Number(/Unlimited #(\d+)/.exec(unlimitedText)?.[1]) - 1, rule: selectedRule, activeRule, minimum: Number(/^Optimal:\s*(\d+)/.exec(minimumText)?.[1]), chain: await readPath(0), reveal: await readPath(1), confirming: await yes().count() === 1 && await yes().isVisible(), neutral: await neutral().count() === 1 && await neutral().isVisible(), inputVisible: await input().count() === 1 && await input().isVisible(), revealed: await page.getByText("Here's a path that works", { exact: true }).count() === 1, won: await page.getByText('Connected!', { exact: true }).count() === 1, save: await readSave(), localCompletions: await page.evaluate(() => localStorage.getItem('dukb-local-completions')) };
    }
    async function shot(stage) {
      await page.waitForFunction(() => {
        const nodes = [...document.querySelectorAll('#dukb-main button, #dukb-main p')].filter(e => ['Yes, reveal it', 'Give up and see a path', "Here's a path that works"].includes(e.textContent.trim()));
        return nodes.length > 0 && nodes.every(e => Number(getComputedStyle(e).opacity) >= 0.99 && !e.getAnimations().some(a => a.playState === 'running' || a.pending));
      }, null, { timeout: 5000 });
      const name = `${spec.id}-${stage}.png`, target = path.join(OUT, name); assert(!fs.existsSync(target), `Refuse to overwrite original capture ${name}`);
      await page.locator('#dukb-main').screenshot({ path: target, animations: 'allow' }); row.shots.push(name);
    }
    function holdDaily(before, after, intentCount) { check(same(before.save, after.save) && before.save?.raw === after.save?.raw && before.localCompletions === after.localCompletions && completions().length === intentCount, 'The actual daily key, literal raw bytes and client completion state remain held'); }
    function poolReads(from) {
      const reads = row.requests.slice(from); check(reads.filter(r => r.action === 'fixture' && r.table === 'career_seasons').reduce((n, r) => n + r.rows, 0) === seasons.length, 'All original statistics rows reached this mount');
      check(reads.some(r => r.action === 'fixture' && r.table === 'career_players' && r.rows === players.length && r.columns.includes('id')), 'All original bulk graph identities loaded');
      check(reads.some(r => r.action === 'fixture' && r.table === 'transfer_path_puzzles' && r.rows === 3), 'The three unchanged committed puzzle fixtures loaded');
    }
    async function ready(from = 0) { await input().waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from); check(await page.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())) === ET_DAY, 'The actual app clock selects the declared Eastern daily'); }
    async function selectNonterminal() {
      const before = await snapshot(), from = row.requests.length; row.lastQuery = nonterminal.name; await input().fill(nonterminal.name);
      const label = page.locator('span.text-sm.font-medium').filter({ hasText: new RegExp(`^\\s*${esc(nonterminal.name)}\\s*$`) }), option = page.getByRole('option').filter({ has: label }); await option.waitFor({ state: 'visible', timeout: 10000 });
      check(await option.count() === 1 && (await option.locator('span.text-sm.font-medium').innerText()).trim() === nonterminal.name, 'The exact source-derived canonical nonterminal identity is offered');
      check(row.requests.slice(from).some(r => r.action === 'fixture' && r.filter && r.names.includes(nonterminal.name)), 'The actual queried career fixture supplies that identity'); row.stages.push({ stage: 'nonterminal-offered', options: await options() }); await activate(option);
      await page.waitForFunction(size => document.querySelector('#dukb-main p.text-destructive') || document.querySelector('#dukb-main .space-y-0')?.querySelectorAll('span.font-semibold.text-foreground').length > size, before.chain.players.length, { timeout: 5000 });
      const actual = await snapshot(); check(actual.inputVisible && !actual.won && !actual.revealed && same(actual.chain.players, [practice.playerA, nonterminal.name]) && actual.chain.clubs.length === 1 && graphs.classic.adj.get(practice.playerA).get(nonterminal.name).some(s => s.club === actual.chain.clubs[0]) && await page.locator('#dukb-main p.text-destructive').count() === 0, 'A real legal nonterminal move is accepted without automatic completion'); holdDaily(before, actual, 0); row.stages.push({ stage: 'nonterminal-played', ...actual });
    }
    async function setup() {
      if (spec.flow === 'daily-rule') return;
      await activate(ruleButton('active')); const blocked = await snapshot(); check(blocked.puzzleId === daily.id && blocked.mode === 'daily' && blocked.rule === 'active' && blocked.activeRule === 'classic' && blocked.minimum === daily.minSteps, 'The actual committed daily correctly blocks Active without changing its real graph');
      await activate(page.getByRole('button', { name: `Play unlimited under ${RULES.active}`, exact: true }));
      let actual = await snapshot(); check(contextMatches(actual, activePractice, 'unlimited', 'active') && same(actual.chain, { players: [activePractice.playerA], clubs: [] }), 'The existing blocked-daily entry naturally deals the only actual Active pair');
      await activate(ruleButton('classic')); actual = await snapshot(); check(contextMatches(actual, practice, 'unlimited', 'classic') && same(actual.chain, { players: [practice.playerA], clubs: [] }), 'Everyday resets practice to the actual second row tp-3');
      if (spec.flow === 'changed-pair-after-step') await selectNonterminal();
    }
    async function arm() {
      await activate(neutral()); await yes().waitFor({ state: 'visible' }); const armed = await snapshot();
      check(armed.confirming && !armed.neutral && armed.inputVisible && !armed.revealed && !armed.won, 'An actual Give Up request arms the original round confirmation');
      const count = completions().length; await activate(ruleButton(armed.rule)); const unchanged = await snapshot(); check(same(armed, unchanged), 'Selecting the already selected rule preserves the actual armed confirmation'); holdDaily(armed, unchanged, count);
      if (spec.flow === 'daily-rule') { await activate(ruleButton('active')); const blocked = await snapshot(); check(blocked.rule === 'active' && blocked.activeRule === 'classic' && blocked.puzzleId === armed.puzzleId && blocked.confirming && !blocked.neutral && same(blocked.chain, armed.chain), 'A blocked selected rule preserves confirmation for the unchanged actual daily context'); holdDaily(armed, blocked, count); }
      const before = await snapshot(); row.stages.push({ stage: 'old-context-armed', ...before }); return before;
    }
    const desired = () => spec.flow === 'changed-pair-after-step' ? { puzzle: activePractice, mode: 'unlimited', rule: 'active' } : { puzzle: spec.flow === 'daily-rule' ? daily : practice, mode: spec.flow === 'daily-rule' ? 'daily' : 'unlimited', rule: 'europe' };
    async function change(before) {
      const target = desired(), count = completions().length; await activate(ruleButton(target.rule)); await page.waitForLoadState('networkidle', { timeout: 8000 }); const after = await snapshot();
      check(contextMatches(after, target.puzzle, target.mode, target.rule) && after.rule === target.rule, 'The actual rule activation reaches the declared replacement context');
      check(before.mode !== after.mode || before.puzzleId !== after.puzzleId || before.activeRule !== after.activeRule || before.unlimitedIndex !== after.unlimitedIndex, 'The owned context identity really changes');
      check(same(after.chain, { players: [target.puzzle.playerA], clubs: [] }) && after.inputVisible && !after.won && !after.revealed, 'The actual hook resets this context to one unplayed start without a finish'); holdDaily(before, after, count); row.stages.push({ stage: 'context-changed', before, after }); return after;
    }
    async function confirmSurrender(before, fresh) {
      const target = desired(), count = completions().length;
      if (fresh) await activate(neutral());
      else check(before.confirming && !before.neutral, 'The actual surviving old Yes is activated without a new Give Up request');
      await yes().waitFor({ state: 'visible' }); const requested = await snapshot();
      check(requested.confirming && !requested.neutral && same(requested.chain, before.chain), 'The pending Yes belongs to the currently displayed replacement context'); holdDaily(before, requested, count); row.stages.push({ stage: fresh ? 'fresh-confirmation' : 'surviving-old-confirmation', ...requested }); await activate(yes());
      await page.getByText("Here's a path that works", { exact: true }).waitFor({ state: 'visible' }); await page.waitForLoadState('networkidle', { timeout: 8000 }); const after = await snapshot(), issues = surrenderIssues(after, target.puzzle, target.rule);
      check(issues.length === 0 && same(after.chain, before.chain), `The actual confirmed surrender reveals a legal shortest path for the current pair: ${issues.join(', ')}`);
      if (target.mode === 'daily') check(after.save?.key === `transfer-path-daily-${ET_DAY}` && after.save.value.puzzleId === daily.id && after.save.value.gameStatus === 'lost' && same(after.save.value.guesses, [{ t: 'give' }]) && completions().length === 1 && completions()[0].completion.score === 0, 'The real daily surrender saves only give/lost and emits one blocked zero-score client completion intent');
      else holdDaily(before, after, count);
      row.stages.push({ stage: fresh ? 'fresh-surrender' : 'surviving-old-yes-surrender', ...after, issues, completionIntents: completions().length }); return after;
    }
    async function reloadDaily(before) {
      const from = row.requests.length, count = completions().length; await page.reload({ waitUntil: 'domcontentloaded' });
      if (spec.flow === 'daily-rule') await page.getByText("Here's a path that works", { exact: true }).waitFor({ state: 'visible', timeout: 15000 }); else await input().waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from); const actual = await snapshot();
      check(contextMatches(actual, daily, 'daily', 'classic') && actual.rule === 'classic', 'Actual reload returns to the seeded daily under Everyday'); holdDaily(before, actual, count);
      if (spec.flow === 'daily-rule') check(surrenderIssues(actual, daily, 'classic').length === 0 && actual.save.raw === before.save.raw, 'The actual daily lost bytes restore the independent Everyday reveal without duplicate intent');
      else check(actual.save === null && actual.localCompletions === null && completions().length === 0 && actual.inputVisible && !actual.revealed && !actual.won && same(actual.chain, { players: [daily.playerA], clubs: [] }), 'Practice surrender remains ephemeral while the untouched daily stays unplayed');
      row.stages.push({ stage: 'daily-reload', before, after: actual, completionIntentsBefore: count, completionIntentsAfter: completions().length }); return actual;
    }
    try {
      await page.goto(`${BASE}/transfer-path`, { waitUntil: 'domcontentloaded' }); await ready(); const initial = await snapshot();
      check(contextMatches(initial, daily, 'daily', 'classic') && initial.rule === 'classic' && initial.inputVisible && initial.neutral && !initial.confirming && initial.save === null && initial.localCompletions === null && completions().length === 0, 'The declared actual daily starts naturally without prior play or confirmation');
      await Promise.allSettled(consoleTasks); check(row.errors.length === 0, 'No setup app error precedes the owned confirmation interaction'); row.stages.push({ stage: 'initial', ...initial });
      await setup(); await action({ page, row, check, input, yes, neutral, ruleButton, activate, snapshot, shot, completions, holdDaily, arm, desired, change, confirmSurrender, reloadDaily });
      await Promise.allSettled(consoleTasks); row.layout = await page.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(row.layout.width === spec.width && row.layout.clientWidth === row.layout.scrollWidth, 'The requested viewport has no sideways overflow'); check(row.errors.length === 0 && row.assetFailures.length === 0, 'No unexpected app exception or failed owned asset'); row.ok = true;
      if (PHASE === 'baseline' && row.ownedStaleConfirmation) report.staleConfirmations += 1;
      console.log(`${PHASE === 'baseline' ? 'BASELINE' : 'PASS'} ${spec.id}: ${row.checks} checks`);
    } catch (error) { row.ok = false; row.error = String(error.stack || error); report.setupFailures += 1; row.failureOptions = await options().catch(() => []); row.failureText = await page.locator('body').innerText().catch(() => ''); await shot('failure').catch(() => {}); console.error(`FAIL ${spec.id}: ${row.error}\nOptions: ${JSON.stringify(row.failureOptions)}`); }
    finally { await context.close(); }
  }

  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) for (const flow of FLOWS) await walk({ id: `${PHASE}-${flow}-${width}x${height}`, flow, width, height }, async j => {
    const before = await j.arm(); if (PHASE === 'fixed') await j.shot('old-context-confirmation'); const after = await j.change(before), target = j.desired();
    if (PHASE === 'baseline') { j.check(before.confirming && after.confirming && !after.neutral, 'The original Yes confirmation survives the actual changed context without a fresh Give Up request'); j.row.stages.push({ stage: 'owned-stale-confirmation', before, after }); await j.shot('stale-confirmation-after-change'); await j.confirmSurrender(after, false); j.row.ownedStaleConfirmation = true; return; }
    const issues = resetIssues(after, target.puzzle, target.mode, target.rule); j.check(issues.length === 0, `The replacement context has a neutral Give Up control with no stale Yes: ${issues.join(', ')}`); j.row.stages.push({ stage: 'confirmation-reset', ...after, issues }); await j.shot('new-context-neutral');
    const surrendered = await j.confirmSurrender(after, true); if (flow !== 'daily-rule') await j.shot('fresh-surrender'); await j.reloadDaily(surrendered); if (flow === 'daily-rule') await j.shot('daily-surrender-reload');
  });
  if (PHASE === 'fixed') {
    await walk({ id: 'control-omitted-rule-activation-390x844', flow: 'changed-pair-after-step', width: 390, height: 844 }, async j => {
      const before = await j.arm(), actual = await j.snapshot(), target = j.desired(), issues = resetIssues(actual, target.puzzle, target.mode, target.rule);
      j.check(same(before, actual) && actual.confirming && actual.chain.players.length === 2, 'Omitting the actual rule activation holds the real accepted move and armed old context'); j.holdDaily(before, actual, 0);
      j.check(same(issues, ['context', 'chain', 'confirmation', 'neutral-control']), 'The reset detector rejects the actual omitted context activation');
      j.row.control = { omittedAction: `Activate ${RULES[target.rule]}`, before, after: actual, detected: issues }; await j.shot('detected');
    }, true);
    await walk({ id: 'control-omitted-fresh-yes-390x844', flow: 'same-pair-rule', width: 390, height: 844 }, async j => {
      const before = await j.arm(), changed = await j.change(before), target = j.desired(); j.check(resetIssues(changed, target.puzzle, target.mode, target.rule).length === 0, 'The omission control owns a real successful context reset');
      await j.activate(j.neutral()); await j.yes().waitFor({ state: 'visible' }); const actual = await j.snapshot(), issues = surrenderIssues(actual, target.puzzle, target.rule);
      j.check(actual.confirming && actual.inputVisible && !actual.revealed && same(actual.chain, changed.chain), 'Omitting the actual fresh Yes action holds a genuinely armed new request without surrender'); j.holdDaily(changed, actual, 0);
      j.check(same(issues, ['view-surrender', 'reveal-path']), 'The surrender detector rejects the actual omitted fresh Yes action');
      j.row.control = { omittedAction: 'Activate Yes, reveal it for the fresh current-round request', before: changed, after: actual, detected: issues }; await j.shot('detected');
    }, true);
  }
  assert.equal(report.cases.length, 9); assert.equal(report.controls.length, PHASE === 'baseline' ? 0 : 2);
  report.flowCounts = Object.fromEntries(FLOWS.map(flow => [flow, report.cases.filter(row => row.flow === flow).length]));
  report.failures = [...report.cases, ...report.controls].filter(row => !row.ok).length; report.naturalChecks = report.cases.reduce((n, row) => n + row.checks, 0); report.controlChecks = report.controls.reduce((n, row) => n + row.checks, 0);
  report.fixtureRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'fixture').length, 0); report.abortedExternalRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'abort').length, 0);
  report.assets = [...new Set([...report.cases, ...report.controls].flatMap(row => row.assets))].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, 'dist', decodeURIComponent(file)))) }));
  const shots = [...report.cases, ...report.controls].flatMap(row => row.shots); report.inventory = shots.map(file => ({ file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))) }));
  assert.equal(report.failures, 0, 'A setup or unexpected outcome failed; no stale-confirmation or reset credit'); assert.equal(shots.length, PHASE === 'baseline' ? 9 : 29); assert.equal(new Set(shots).size, shots.length);
  assert.equal(JSON.stringify(site.careerPlayers), originalPlayers); assert.equal(JSON.stringify(site.fallbackPuzzles), originalPuzzles);
  if (PHASE === 'baseline') { assert.equal(report.staleConfirmations, 9); report.status = 'baseline-reproduced'; process.exitCode = 1; console.log('Confirmation baseline: 9 actual context changes retain old Yes, then that surviving request surrenders the replacement round without a fresh Give Up request. Intentional exit 1.'); }
  else { report.status = 'passed'; console.log(`Confirmation fixed: ${report.checks} checks (${report.naturalChecks} natural, ${report.controlChecks} control), 9 natural resets/fresh legal surrenders, 2 effective controls, 29 original captures, ${report.fixtureRequests} fixture reads, ${report.abortedExternalRequests} external aborts, 0 failures.`); }
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); report.setupFailures += 1; process.exitCode = 1; console.error(report.error); }
finally {
  await browser?.close(); host?.kill(); report.sourceAfter = receipt(); report.installedAfter = installedReceipt(); report.sourceHeld = same(sourceBefore, report.sourceAfter) && head() === report.sourceCommit; report.installedHeld = same(installedBefore, report.installedAfter);
  if (!report.sourceHeld || !report.installedHeld) { report.status = 'failed'; report.setupFailures += 1; process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.rmSync(tmp, { recursive: true, force: true });
}
