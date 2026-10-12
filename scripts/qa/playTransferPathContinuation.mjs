/* Remote browser proof against frozen PR242 source. Six reported-pair walks
   continue through a moved hint, accepted-action reload, surrender and reload.
   Two measured shortened paths come from fleet.json. Their names, statistics
   and puzzle metadata come from committed records, never typed test stats.
   Three separate detector controls omit the move, omit surrender or delete an
   actual save. A setup error cannot count as a detected outcome failure.

   CI=1 TRANSFER_PATH_CANDIDATE_ROOT=<frozen checkout>
   TRANSFER_PATH_PROOF_OUT=<folder holding fleet.json> node this-script
   Build the candidate first. This script serves its existing dist, fulfills
   only fixture database reads, and aborts every other external request. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { buildGraph, deriveHint, hintProblems, hintText, shortestPath } from '../lib/transferPathHints.mjs';

assert(process.env.CI, 'Transfer Path continuation proof runs remotely only');
assert(process.env.TRANSFER_PATH_CANDIDATE_ROOT && process.env.TRANSFER_PATH_PROOF_OUT, 'Explicit frozen source and proof output roots are required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = path.resolve(process.env.TRANSFER_PATH_CANDIDATE_ROOT);
const OUT = path.join(path.resolve(process.env.TRANSFER_PATH_PROOF_OUT), 'browser');
const COMMIT = '2dfee3048450e2dd61479473c7a1f48861b7512b';
const START = 'Trent Alexander-Arnold', PICK = 'Kylian Mbappé', TARGET = 'Victor Osimhen';
const LABEL = { classic: 'Everyday', europe: 'Europe only' };
const sha = value => createHash('sha256').update(value).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esc = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const files = [
  'src/hooks/useTransferPath.ts', 'src/hooks/useDailyPuzzle.ts',
  'src/lib/transferPathClubSeasons.ts', 'src/data/transferPathClubSeasons.ts',
  'src/lib/transferPathGraph.ts', 'src/lib/transferPathModes.ts',
  'src/data/careerPlayers.ts', 'src/data/transferPathPuzzles.ts',
  'src/components/transfer-path/TransferPathBoard.tsx',
  'scripts/lib/transferPathHints.mjs', 'scripts/lib/hostLikeServer.mjs',
  'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs',
  'package.json', 'package-lock.json',
];
const sourceReceipt = () => files.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(SOURCE, file))) }));
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: SOURCE, encoding: 'utf8' }).trim();
assert.equal(head(), COMMIT, 'Candidate HEAD must stay on the accepted PR242 source');
const before = sourceReceipt();
for (const item of before) assert.equal(item.sha256, sha(execFileSync('git', ['show', `${COMMIT}:${item.file}`], { cwd: SOURCE })), `${item.file} differs from the frozen commit`);
for (const file of ['scripts/lib/transferPathHints.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs']) {
  assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), sha(fs.readFileSync(path.join(SOURCE, file))), `The primary proof helper differs from the candidate: ${file}`);
}
const fleet = JSON.parse(fs.readFileSync(path.join(path.dirname(OUT), 'fleet.json'), 'utf8'));
assert.equal(fleet.status, 'passed', 'The independent fleet proof must pass before its cases are used');
assert.equal(fleet.candidateCommit, COMMIT);
assert.equal(fleet.careerPlayersSha256, before.find(item => item.file === 'src/data/careerPlayers.ts').sha256);
assert.equal(fleet.selected.length, 2, 'The fleet must supply one measured shortened pair per tested rule');
for (const rule of Object.keys(LABEL)) assert.equal(fleet.selected.filter(item => item.rule === rule).length, 1);
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-continuation-'));
const report = { candidateCommit: COMMIT, sourceBefore: before, fleetSha256: sha(JSON.stringify(fleet)), checks: 0, cases: [], controls: [] };
let browser, host;

try {
  const bundle = path.join(tmp, 'source.mjs');
  await build({
    stdin: { contents: "export { careerPlayers } from './src/data/careerPlayers.ts'; export { VERIFIED_TRANSFER_PATH_CLUB_SEASONS as memberships } from './src/data/transferPathClubSeasons.ts'; export { isEuropeanClub, isActivePlayer } from './src/lib/transferPathModes.ts';", resolveDir: SOURCE, sourcefile: 'continuation-source.mjs', loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle,
    alias: { '@': path.join(SOURCE, 'src') }, logLevel: 'error',
    plugins: [{ name: 'offline-supabase', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'offline-supabase', namespace: 'offline-supabase' }));
      b.onLoad({ filter: /.*/, namespace: 'offline-supabase' }, () => ({ contents: 'export const supabase = null; export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' }));
    } }],
  });
  const { careerPlayers, memberships, isEuropeanClub, isActivePlayer } = await import(pathToFileURL(bundle).href);
  assert.equal(memberships.length, 2);
  for (const name of [START, PICK]) assert(memberships.some(s => s.name === name && s.club === 'Real Madrid' && s.season === '2025-2026'));
  const players = careerPlayers.map((p, i) => ({ id: `continuation-fixture-${String(i + 1).padStart(5, '0')}`, player_name: p.name, nationality: p.nationality, position: p.position }));
  const seasons = careerPlayers.flatMap((p, i) => p.career.map((s, sort_order) => ({ player_id: players[i].id, season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, market_value: s.marketValue, sort_order })));
  report.fixture = { players: players.length, seasons: seasons.length, playersSha256: sha(JSON.stringify(players)), seasonsSha256: sha(JSON.stringify(seasons)) };
  // Independent merge and graph, without the product membership or graph helper.
  function graphFor(rule, skip = [], augmented = true) {
    return buildGraph(careerPlayers.filter(p => !skip.includes(p.name) && (rule !== 'active' || isActivePlayer(p))).map(p => ({
      name: p.name,
      career: [...p.career, ...(augmented ? memberships.filter(s => s.name === p.name && s.nationality === p.nationality).map(({ club, season }) => ({ club, season })) : [])].filter(s => rule !== 'europe' || isEuropeanClub(s.club)),
    })));
  }
  const graphs = { classic: graphFor('classic'), europe: graphFor('europe') };
  const rawGraphs = { classic: graphFor('classic', [], false), europe: graphFor('europe', [], false) };
  const stored = Object.fromEntries(Object.entries(rawGraphs).map(([rule, graph]) => [rule, deriveHint(graph, START, TARGET)]));
  assert(stored.classic && stored.europe);
  const reported = { id: 'tpa-770', playerA: START, playerB: TARGET, minSteps: stored.classic.minSteps, hint: stored.classic.hint, active: null, europe: { minSteps: stored.europe.minSteps, hint: stored.europe.hint } };
  assert.equal(reported.minSteps, 3);
  for (const rule of Object.keys(LABEL)) assert.equal(deriveHint(graphs[rule], START, TARGET)?.minSteps, 3);
  for (const selected of fleet.selected) {
    assert(selected.oldMinSteps > selected.newMinSteps && selected.newMinSteps >= 2, 'The selected case must shorten a path with a middle player');
    assert.equal(deriveHint(rawGraphs[selected.rule], selected.puzzle.playerA, selected.puzzle.playerB)?.minSteps, selected.oldMinSteps);
    assert.equal(deriveHint(graphs[selected.rule], selected.puzzle.playerA, selected.puzzle.playerB)?.minSteps, selected.newMinSteps);
    assert.equal(selected.path.length - 1, selected.newMinSteps);
    assert.equal(selected.path[0], selected.puzzle.playerA);
    assert.equal(selected.path.at(-1), selected.puzzle.playerB);
    assert.equal(selected.clubs.length, selected.path.length - 1);
    for (let i = 1; i < selected.path.length; i += 1) assert(graphs[selected.rule].adj.get(selected.path[i - 1])?.get(selected.path[i])?.some(s => s.club === selected.clubs[i - 1]), 'Fleet-selected path must be independently legal');
  }

  assert(fs.existsSync(path.join(SOURCE, 'dist/index.html')), 'Build the frozen candidate before this walk');
  const port = await new Promise((resolve, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(error => error ? reject(error) : resolve(value)); });
  });
  const BASE = `http://127.0.0.1:${port}`;
  host = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.join(SOURCE, 'dist'), String(port)], { cwd: SOURCE, stdio: ['ignore', 'pipe', 'pipe'] });
  let hostError = ''; host.stderr.on('data', value => { hostError += value; });
  const deadline = Date.now() + 15000;
  while (true) {
    try { const response = await fetch(BASE); assert.equal(response.status, 200); break; }
    catch (error) { if (host.exitCode !== null || Date.now() > deadline) throw new Error(`Candidate server did not start: ${hostError || error}`); await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  browser = await pw.chromium.launch();

  function movedHintIssues(observed, puzzle, chain, rule) {
    const from = chain.at(-1), to = puzzle.playerB;
    const graph = graphFor(rule, chain.slice(0, -1));
    const expected = deriveHint(graph, from, to);
    if (!expected) return ['oracle-path'];
    const suffix = esc(to), prefix = esc(from);
    const one = new RegExp(`^You are one away\\. ${prefix} and ${suffix} were at (.+) together\\.$`).exec(observed);
    const two = new RegExp(`^From ${prefix} one more man does it\\. He was at (.+) with him and at (.+) with ${suffix}\\.$`).exec(observed);
    const many = new RegExp(`^From ${prefix} it takes (\\d+) more men at least\\. The first was at (.+) with him, the last at (.+) with ${suffix}\\.$`).exec(observed);
    const claim = one ? { steps: 1, first: one[1], last: one[1] } : two ? { steps: 2, first: two[1], last: two[2] } : many ? { steps: Number(many[1]) + 1, first: many[2], last: many[3] } : null;
    if (!claim) return ['hint-head-or-shape'];
    return hintProblems(graph, from, to, claim.steps, hintText(from, to, claim.steps, claim.first, claim.last));
  }
  function pathIssues(observed, puzzle, rule) {
    if (!observed.present) return ['reveal-presence'];
    const issues = [], graph = graphs[rule];
    const expected = shortestPath(graph, puzzle.playerA, puzzle.playerB);
    if (!expected || observed.players.length !== expected.length) issues.push('reveal-minimum');
    if (observed.players[0] !== puzzle.playerA || observed.players.at(-1) !== puzzle.playerB) issues.push('reveal-endpoints');
    if (new Set(observed.players).size !== observed.players.length) issues.push('reveal-reused-name');
    if (observed.clubs.length !== observed.players.length - 1) issues.push('reveal-club-count');
    for (let i = 1; i < observed.players.length; i += 1) if (!graph.adj.get(observed.players[i - 1])?.get(observed.players[i])?.some(s => s.club === observed.clubs[i - 1])) issues.push('reveal-edge');
    return issues;
  }
  function reloadIssues(expected, actual) {
    const issues = [];
    if (expected.save?.key !== actual.save?.key || expected.save?.raw !== actual.save?.raw) issues.push('reload-bytes');
    if (!same(expected.chain.players, actual.chain.players)) issues.push('reload-chain');
    if (!same(expected.chain.clubs, actual.chain.clubs)) issues.push('reload-connector');
    if (expected.minimum !== actual.minimum) issues.push('reload-minimum');
    if (!actual.everyday) issues.push('reload-rule');
    return issues;
  }

  async function walk(spec, action, control = false) {
    const row = { id: spec.id, rule: spec.rule, width: spec.width, height: spec.height, puzzle: spec.puzzle, selectionScope: spec.selectionScope, checks: 0, requests: [], errors: [], assets: [], assetFailures: [], shots: [], stages: [] };
    (control ? report.controls : report.cases).push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, hasTouch: spec.width < 1280, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    const fixturePuzzle = { puzzle_id: spec.puzzle.id, player_a: spec.puzzle.playerA, player_b: spec.puzzle.playerB, min_steps: spec.puzzle.minSteps, hint: spec.puzzle.hint, sort_order: 0, active_min_steps: spec.puzzle.active?.minSteps ?? null, active_hint: spec.puzzle.active?.hint ?? null, europe_min_steps: spec.puzzle.europe?.minSteps ?? null, europe_hint: spec.puzzle.europe?.hint ?? null };
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      const table = /^\/rest\/v1\/(career_players|career_seasons|transfer_path_puzzles)$/.exec(url.pathname)?.[1];
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'OPTIONS') { row.requests.push({ action: 'fixture-options', table }); return route.fulfill({ status: 204, headers: cors, body: '' }); }
      if (/\.supabase\.co$/i.test(url.hostname) && table && request.method() === 'GET') {
        let data = table === 'career_players' ? players : table === 'career_seasons' ? seasons : [fixturePuzzle];
        const filter = url.searchParams.get('player_name');
        if (filter) { assert(filter.startsWith('ilike.')); const query = filter.slice(6).replaceAll('%', '').toLowerCase(); data = data.filter(p => p.player_name.toLowerCase().includes(query)); }
        const range = request.headers().range?.match(/^(\d+)-(\d+)$/);
        const offset = Number(url.searchParams.get('offset') ?? range?.[1] ?? 0), limit = Number(url.searchParams.get('limit') ?? (range ? Number(range[2]) - Number(range[1]) + 1 : 1000));
        const selected = url.searchParams.get('select')?.split(',').map(s => s.trim());
        const payload = data.slice(offset, offset + limit).map(p => selected && !selected.includes('*') ? Object.fromEntries(selected.map(key => [key, p[key]])) : p);
        row.requests.push({ action: 'fixture', table, offset, rows: payload.length, search: filter ?? null });
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      row.requests.push({ action: 'abort', origin: url.origin, path: url.pathname, method: request.method() });
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && !/^Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)/.test(message.text())) row.errors.push(message.text()); });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin !== BASE) return; if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js') && !row.assets.includes(url.pathname)) row.assets.push(url.pathname); if (response.status() >= 400) row.assetFailures.push({ path: url.pathname, status: response.status() }); });
    const check = (value, message) => { assert(value, `${spec.id}: ${message}`); row.checks += 1; report.checks += 1; };
    const activate = locator => spec.width < 1280 ? locator.tap() : locator.click();
    const input = () => page.getByRole('combobox', { name: 'Type a player name...' });
    const optionDiagnostics = () => page.getByRole('option').evaluateAll(options => options.map(option => ({
      nameText: option.querySelector('span.text-sm.font-medium')?.textContent ?? null,
      nameInnerText: option.querySelector('span.text-sm.font-medium')?.innerText ?? null,
      textContent: option.textContent, innerText: option.innerText,
    })));
    const readChain = async locator => ({ players: await locator.locator('span.font-semibold.text-foreground').allTextContents(), clubs: await locator.locator('span.italic').allTextContents() });
    const snapshot = async () => {
      const minimumText = await page.locator('#dukb-main p').filter({ hasText: /^Optimal: \d+/ }).first().innerText();
      return { chain: await readChain(page.locator('#dukb-main .space-y-0').first()), minimum: Number(/^Optimal:\s*(\d+)/.exec(minimumText)?.[1]), everyday: await page.getByRole('button', { name: LABEL.classic, exact: true }).getAttribute('aria-pressed') === 'true', save: await page.evaluate(() => { const key = Object.keys(localStorage).find(k => k.startsWith('transfer-path-daily-')); const raw = key ? localStorage.getItem(key) : null; return key && raw ? { key, raw, value: JSON.parse(raw) } : null; }) };
    };
    const shot = async stage => { const file = `${spec.id}-${stage}.png`; await page.locator('#dukb-main').screenshot({ path: path.join(OUT, file) }); row.shots.push(file); };
    const readHint = async () => (await page.locator('#dukb-main p.italic').filter({ hasText: /^💡/ }).innerText()).replace(/^💡\s*/, '').trim();
    const readReveal = async () => {
      const title = page.getByText("Here's a path that works", { exact: true });
      if (!await title.count()) return { present: false, players: [], clubs: [] };
      return { present: true, ...await readChain(title.locator('..').locator('.space-y-0')) };
    };
    const completionAttempts = () => row.requests.filter(r => r.path === '/rest/v1/game_completions' && r.method === 'POST').length;
    async function ready(fromRequest = 0) {
      await page.getByText(spec.puzzle.playerB, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('#dukb-main p').filter({ hasText: /^Optimal: \d+/ }).first().waitFor({ state: 'visible' });
      await page.waitForLoadState('networkidle', { timeout: 8000 });
      const reads = row.requests.slice(fromRequest);
      check(reads.filter(r => r.action === 'fixture' && r.table === 'career_seasons').reduce((sum, r) => sum + r.rows, 0) === seasons.length, 'Every unchanged statistics row reached this mounted graph');
      check(reads.some(r => r.action === 'fixture' && r.table === 'transfer_path_puzzles' && r.rows === 1), 'The mounted daily read its single fixture puzzle');
    }
    async function choose(name, query = name) {
      const previous = await snapshot();
      row.lastPick = { name, query, after: previous.chain.players.at(-1) };
      await input().fill(query);
      const nameSpan = page.locator('span.text-sm.font-medium').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`) });
      const option = page.getByRole('option').filter({ has: nameSpan });
      await option.waitFor({ state: 'visible', timeout: 10000 });
      check(await option.count() === 1, `Exactly one real identity can be selected: ${name}`);
      const offeredName = (await option.locator('span.text-sm.font-medium').innerText()).trim();
      check(offeredName === name, `The suggestion name itself is exactly ${name}: ${offeredName}`);
      row.stages.push({ stage: 'autocomplete', name, query, offeredName, options: await optionDiagnostics() });
      await activate(option);
      await page.waitForFunction(size => document.querySelector('#dukb-main p.text-destructive') || document.querySelector('#dukb-main .space-y-0')?.querySelectorAll('span.font-semibold.text-foreground').length > size, previous.chain.players.length, { timeout: 5000 });
      const refusals = await page.locator('#dukb-main p.text-destructive').allTextContents();
      check(refusals.length === 0, `The actual pick is accepted: ${refusals.join(' ')}`);
      check(await input().count() === 0 || await input().inputValue() === '', 'Selecting a suggestion clears or finishes the search');
      const current = await snapshot(); row.stages.push({ stage: 'pick', name, ...current }); return current;
    }
    async function showMoved(state, rule, stage) {
      const button = page.getByRole('button', { name: 'Show hint', exact: true });
      if (await button.count()) await activate(button);
      const text = await readHint(), issues = movedHintIssues(text, spec.puzzle, state.chain.players, rule);
      row.stages.push({ stage, text, issues, from: state.chain.players.at(-1), skip: state.chain.players.slice(0, -1) });
      check(issues.length === 0, `Moved hint agrees with the independent remaining graph: ${issues.join(', ')}`);
      await shot(stage);
      return text;
    }
    async function reloadHeld(expected, stage) {
      const startRequests = row.requests.length, completions = completionAttempts();
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready(startRequests);
      const restoredMinimum = deriveHint(graphs.classic, spec.puzzle.playerA, spec.puzzle.playerB).minSteps;
      const expectedAfterReload = { ...expected, minimum: restoredMinimum };
      const actual = await snapshot(), issues = reloadIssues(expectedAfterReload, actual);
      row.stages.push({ stage, before: expected, expectedAfterReload, actual, issues });
      check(issues.length === 0, `Reload holds exact daily bytes, names, connectors and minimum: ${issues.join(', ')}`);
      check(completionAttempts() === completions, 'Reload does not attempt to record this daily again');
      await shot(stage); return actual;
    }
    async function surrender(state) {
      await activate(page.getByRole('button', { name: 'Give up and see a path', exact: true }));
      await activate(page.getByRole('button', { name: 'Yes, reveal it', exact: true }));
      await page.getByText("Here's a path that works", { exact: true }).waitFor();
      const reveal = await readReveal(), issues = pathIssues(reveal, spec.puzzle, 'classic'), current = await snapshot();
      row.stages.push({ stage: 'surrender', reveal, issues, ...current });
      check(issues.length === 0, `The displayed reveal is legal and minimal: ${issues.join(', ')}`);
      check(same(current.chain, state.chain), 'Surrender preserves the chain actually played');
      check(same(current.save?.value.guesses, [...state.save.value.guesses, { t: 'give' }]) && current.save.value.gameStatus === 'lost', 'The actual surrender is saved once after the accepted step');
      check(await input().count() === 0, 'Surrender closes the player picker');
      await page.waitForLoadState('networkidle', { timeout: 8000 });
      await shot('surrender'); return { state: current, reveal };
    }
    try {
      await page.goto(`${BASE}/transfer-path`, { waitUntil: 'domcontentloaded' }); await ready();
      await input().waitFor({ state: 'visible' });
      await activate(page.getByRole('button', { name: LABEL[spec.rule], exact: true }));
      check(await page.getByRole('button', { name: LABEL[spec.rule], exact: true }).getAttribute('aria-pressed') === 'true', 'The requested rule is actually selected');
      const initial = await snapshot();
      check(same(initial.chain.players, [spec.puzzle.playerA]) && initial.chain.clubs.length === 0, 'The board starts without a seeded action');
      check(initial.minimum === deriveHint(graphs[spec.rule], spec.puzzle.playerA, spec.puzzle.playerB).minSteps, 'The displayed initial minimum matches the augmented graph');
      row.stages.push({ stage: 'initial', ...initial });
      await action({ page, row, check, activate, input, snapshot, shot, readHint, readReveal, choose, showMoved, reloadHeld, surrender, ready, initial });
      row.layout = await page.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(row.layout.width === spec.width && row.layout.scrollWidth <= row.layout.clientWidth + 1, 'The route stays within the requested width');
      check(row.errors.length === 0 && row.assetFailures.length === 0, 'No app exception or failed owned asset');
      row.ok = true; console.log(`PASS ${spec.id}: ${row.checks} checks${control ? ', detector control fired' : ''}`);
    } catch (error) {
      row.ok = false; row.error = String(error.stack || error);
      row.failureOptions = await optionDiagnostics().catch(() => []);
      row.failureSearch = await input().inputValue().catch(() => null);
      row.failureText = await page.locator('#dukb-main').innerText().catch(() => '');
      await shot('failure').catch(() => {}); console.error(`FAIL ${spec.id}: ${row.error}\nAvailable options: ${JSON.stringify(row.failureOptions)}`);
    } finally { await context.close(); }
  }

  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) for (const rule of Object.keys(LABEL)) {
    await walk({ id: `tpa-770-${rule}-${width}x${height}`, rule, width, height, puzzle: reported, selectionScope: 'reported' }, async j => {
      const accepted = await j.choose(PICK, 'mbappe');
      j.check(same(accepted.chain, { players: [START, PICK], clubs: ['Real Madrid'] }), 'The reported Madrid connector is painted');
      j.check(accepted.minimum === 3 && accepted.save?.value.puzzleId === 'tpa-770' && same(accepted.save.value.guesses, [{ t: 'step', player: PICK, club: 'Real Madrid' }]), 'The reported daily naturally saves the accepted step with its unchanged minimum');
      await j.showMoved(accepted, rule, 'moved-hint');
      const restored = await j.reloadHeld(accepted, 'accepted-reload');
      j.check(restored.everyday, 'Reload uses Everyday because selected rules are not saved');
      await j.showMoved(restored, 'classic', 'reload-moved-hint');
      const surrendered = await j.surrender(restored);
      await j.reloadHeld(surrendered.state, 'surrender-reload');
      const reveal = await j.readReveal();
      j.check(pathIssues(reveal, reported, 'classic').length === 0 && same(reveal, surrendered.reveal), 'Reload retains the surrendered minimal path');
    });
  }
  for (const selected of fleet.selected) await walk({ id: `shortened-${selected.rule}-390x844`, rule: selected.rule, width: 390, height: 844, puzzle: selected.puzzle, selectionScope: selected.selectionScope }, async j => {
    j.check(j.initial.minimum === selected.newMinSteps && j.initial.minimum < selected.oldMinSteps, 'The actual fixture minimum shortens by the measured amount');
    await j.activate(j.page.getByRole('button', { name: 'Show hint', exact: true }));
    const initialHint = await j.readHint(), issues = hintProblems(graphs[selected.rule], selected.puzzle.playerA, selected.puzzle.playerB, j.initial.minimum, initialHint);
    j.row.stages.push({ stage: 'shortened-initial-hint', text: initialHint, issues, oldMinSteps: selected.oldMinSteps, newMinSteps: selected.newMinSteps });
    j.check(issues.length === 0, 'The refreshed middle-player hint describes a shortest route'); await j.shot('shortened-initial-hint');
    let state;
    for (const name of selected.path.slice(1, -1)) {
      state = await j.choose(name);
      if (await j.input().count()) await j.showMoved(state, selected.rule, `moved-${state.chain.players.length}`);
    }
    await j.page.getByText('Connected!', { exact: true }).waitFor();
    state = await j.snapshot();
    j.check(same(state.chain.players, selected.path), 'Natural picks and the automatic target complete the independently selected shortest path');
    j.check(pathIssues({ present: true, ...state.chain }, selected.puzzle, selected.rule).length === 0, 'Every displayed winning connector is independently legal');
    const classicMinimum = deriveHint(graphs.classic, selected.puzzle.playerA, selected.puzzle.playerB).minSteps;
    const score = Math.max(0, 1000 - Math.max(0, state.chain.players.length - 1 - classicMinimum) * 100);
    j.check(await j.page.getByText(`${score} pts`, { exact: true }).count() > 0, 'The completed daily score uses the new Everyday minimum');
    j.check(state.save?.value.gameStatus === 'won' && same(state.save.value.guesses, [...state.chain.players.slice(1).map((player, i) => ({ t: 'step', player, club: state.chain.clubs[i] })), { t: 'won' }]), 'The real game saves exactly the completed chain and one win');
    j.row.stages.push({ stage: 'shortened-win', score, classicMinimum, ...state });
    await j.page.waitForLoadState('networkidle', { timeout: 8000 }); await j.shot('shortened-win');
    await j.reloadHeld(state, 'shortened-win-reload');
    j.check(await j.page.getByText('Connected!', { exact: true }).count() === 1 && await j.page.getByText(`${score} pts`, { exact: true }).count() > 0, 'The natural completed result survives reload');
  });

  const controlSpec = name => ({ id: `control-${name}-390x844`, rule: 'classic', width: 390, height: 844, puzzle: reported, selectionScope: 'detector-control' });
  await walk(controlSpec('omitted-move'), async j => {
    await j.activate(j.page.getByRole('button', { name: 'Show hint', exact: true }));
    const text = await j.readHint(), actual = await j.snapshot();
    j.check(same(actual.chain, j.initial.chain), 'Control actually omitted the move and remains at Trent');
    const issues = movedHintIssues(text, reported, [START, PICK], 'classic');
    j.check(same(issues, ['hint-head-or-shape']), 'The owned moved-hint detector rejects the actual unplayed-head hint');
    j.row.control = { omittedAction: 'autocomplete Mbappe pick', actual, text, intendedChain: [START, PICK], detected: issues }; await j.shot('detected');
  }, true);
  await walk(controlSpec('omitted-surrender'), async j => {
    const accepted = await j.choose(PICK, 'mbappe');
    j.check(same(accepted.chain, { players: [START, PICK], clubs: ['Real Madrid'] }), 'Control reaches a genuinely accepted step before omitting surrender');
    const reveal = await j.readReveal(), actual = await j.snapshot(), issues = pathIssues(reveal, reported, 'classic');
    j.check(same(actual.save, accepted.save) && actual.save.value.gameStatus === 'playing', 'Control actually remains unsurrendered with its accepted save');
    j.check(same(issues, ['reveal-presence']), 'The owned reveal detector rejects the actual missing reveal');
    j.row.control = { omittedAction: 'Give up and confirm', reveal, actual, detected: issues }; await j.shot('detected');
  }, true);
  await walk(controlSpec('deleted-save'), async j => {
    const accepted = await j.choose(PICK, 'mbappe');
    j.check(accepted.save?.raw && accepted.save.value.guesses.length === 1, 'Control owns a real nonempty daily action save');
    await j.page.evaluate(key => localStorage.removeItem(key), accepted.save.key);
    j.check(await j.page.evaluate(key => localStorage.getItem(key), accepted.save.key) === null, 'Control actually deletes those saved bytes');
    const from = j.row.requests.length; await j.page.reload({ waitUntil: 'domcontentloaded' }); await j.ready(from);
    const actual = await j.snapshot(), issues = reloadIssues(accepted, actual);
    j.check(same(actual.chain, j.initial.chain), 'The controlled reload actually returns to the unplayed start');
    j.check(same(issues, ['reload-bytes', 'reload-chain', 'reload-connector']), 'The owned reload detector rejects the lost actual saved progress');
    j.row.control = { changedKey: accepted.save.key, before: accepted, after: actual, detected: issues }; await j.shot('detected');
  }, true);

  report.failed = report.cases.filter(row => !row.ok).length;
  report.failedControls = report.controls.filter(row => !row.ok).length;
  report.fixtureRequests = [...report.cases, ...report.controls].reduce((sum, row) => sum + row.requests.filter(r => r.action === 'fixture').length, 0);
  report.abortedExternalRequests = [...report.cases, ...report.controls].reduce((sum, row) => sum + row.requests.filter(r => r.action === 'abort').length, 0);
  report.assets = [...new Set([...report.cases, ...report.controls].flatMap(row => row.assets))].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(SOURCE, 'dist', decodeURIComponent(file)))) }));
  assert.equal(report.cases.length, 8); assert.equal(report.controls.length, 3);
  assert.equal(report.failed, 0, `${report.failed} natural browser journeys failed`);
  assert.equal(report.failedControls, 0, `${report.failedControls} detector controls failed to prove their owned outcome`);
  console.log(`Transfer Path continuation: ${report.checks} checks, 8 natural journeys, 3 effective detector controls, ${report.fixtureRequests} fixture reads, ${report.abortedExternalRequests} external requests aborted, 0 failures.`);
} finally {
  await browser?.close(); host?.kill();
  report.sourceAfter = sourceReceipt(); report.sourceHeld = same(report.sourceAfter, before) && head() === COMMIT;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  fs.rmSync(tmp, { recursive: true, force: true });
  assert(report.sourceHeld, 'Frozen candidate source bytes changed during this proof');
}
