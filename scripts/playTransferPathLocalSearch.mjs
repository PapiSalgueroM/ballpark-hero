/* Remote-only proof of Transfer Path play after its name search fails.
   The committed tpa-662 pair and unchanged career records load normally.
   Only the two career_players autocomplete projections fail with HTTP 503,
   after the real graph is ready. baseline owns nine blocked legal searches;
   fixed plays nine shortest paths through the caller's canonical local pool.
   Two extra journeys hold successful remote dedupe and empty remote results.
   Two actual controls omit a closing pick or delete a genuine won save.

   TRANSFER_PATH_LOCAL_SEARCH_PHASE=baseline|fixed
   TRANSFER_PATH_LOCAL_SEARCH_OUT=<artifact root>
   node scripts/playTransferPathLocalSearch.mjs
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
import { buildGraph, deriveHint } from './lib/transferPathHints.mjs';

assert(process.env.CI, 'Local search browser proof runs remotely only');
const PHASE = process.env.TRANSFER_PATH_LOCAL_SEARCH_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'Select baseline or fixed explicitly');
assert(process.env.TRANSFER_PATH_LOCAL_SEARCH_OUT, 'Set TRANSFER_PATH_LOCAL_SEARCH_OUT');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.env.TRANSFER_PATH_LOCAL_SEARCH_OUT), PHASE);
const RULES = { classic: 'Everyday', active: 'Active players only', europe: 'Europe only' };
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
];
const receipt = () => heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const installedReceipt = () => ['esbuild', 'playwright', 'playwright-core'].map(name => {
  const file = path.join(ROOT, 'node_modules', name, 'package.json'), raw = fs.readFileSync(file);
  return { name, version: JSON.parse(raw).version, sha256: sha(raw) };
});
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
fs.mkdirSync(OUT, { recursive: true });
const sourceBefore = receipt(), installedBefore = installedReceipt();
const report = { phase: PHASE, sourceCommit: head(), methodSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), sourceBefore, installedBefore, scope: 'Signed-out loaded-graph play with fixture-only name searches and blocked client completion intent; no bootstrap, authenticated or backend award claim', status: 'pending', checks: 0, blockedLegalSearches: 0, setupFailures: 0, failures: 0, cases: [], controls: [] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-local-search-'));
let browser, host;

try {
  for (const item of sourceBefore) assert.equal(item.sha256, sha(execFileSync('git', ['show', `${report.sourceCommit}:${item.file}`], { cwd: ROOT })), `${item.file} differs from committed source`);
  const bundle = path.join(tmp, 'fixture-source.mjs');
  await build({
    stdin: { contents: "export { careerPlayers } from './src/data/careerPlayers.ts'; export { playersUnderRule, isActivePlayer, ACTIVE_YEAR } from './src/lib/transferPathModes.ts'; export { normalizeName } from './src/lib/playerSearch.ts';", resolveDir: ROOT, sourcefile: 'local-search-fixtures.mjs', loader: 'js' },
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
    assert(value.path.slice(1, -1).every(name => site.normalizeName(name).length <= 24), 'Every actual shortest-path pick must exercise both autocomplete query legs');
    return [rule, value];
  }));
  const puzzle = { id: retained[0], playerA: retained[1], playerB: retained[2], minSteps: routes.classic.minSteps, hint: routes.classic.hint, active: { minSteps: routes.active.minSteps, hint: routes.active.hint }, europe: { minSteps: routes.europe.minSteps, hint: routes.europe.hint } };
  const expectedScore = rule => Math.max(0, 1000 - Math.max(0, routes[rule].minSteps - routes.classic.minSteps) * 100);
  const names = site.careerPlayers.map(p => p.name);
  const players = site.careerPlayers.map((p, i) => ({ id: `local-search-fixture-${String(i + 1).padStart(5, '0')}`, player_name: p.name, nationality: p.nationality, position: p.position }));
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
  function reloadIssues(before, after, rule) {
    const issues = winIssues(after, rule, true);
    if (before.save?.key !== after.save?.key || before.save?.raw !== after.save?.raw) issues.push('reload-bytes');
    if (before.localCompletions !== after.localCompletions) issues.push('reload-local-completions');
    return issues;
  }
  async function walk(spec, action, control = false) {
    const row = { ...spec, checks: 0, requests: [], errors: [], expectedSearchDiagnostics: [], expectedBlockedDiagnostics: [], assetFailures: [], assets: [], guards: [], stages: [], shots: [] };
    (control ? report.controls : report.cases).push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, hasTouch: spec.width < 1280, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    let searchReady = false;
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
        const columns = url.searchParams.get('select')?.split(',').map(v => v.trim());
        const search = table === 'career_players' && columns && !columns.includes('id') && !columns.includes('*');
        const filter = url.searchParams.get('player_name');
        if (search) {
          assert(searchReady, 'Autocomplete outage may begin only after the graph is ready');
          assert(same([...columns].sort(), ['nationality', 'player_name', 'position']), 'Only the actual autocomplete projection is controlled');
          if (spec.remote === 'outage') {
            row.requests.push({ action: 'search-503', table, url: url.href, columns, filter: filter ?? null, leg: filter ? 'substring' : 'prominence', status: 503, rows: 0 });
            return route.fulfill({ status: 503, headers: cors, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST000', message: 'Offline proof refuses this autocomplete query', details: null, hint: null }) });
          }
        }
        let data = table === 'career_players' ? players : table === 'career_seasons' ? seasons : [puzzleRow];
        if (search && spec.remote === 'empty') data = [];
        if (filter) { assert(filter.startsWith('ilike.')); const query = site.normalizeName(filter.slice(6).replaceAll('%', '')); data = data.filter(v => site.normalizeName(v.player_name).includes(query)); }
        const range = request.headers().range?.match(/^(\d+)-(\d+)$/);
        const offset = Number(url.searchParams.get('offset') ?? range?.[1] ?? 0), limit = Number(url.searchParams.get('limit') ?? (range ? Number(range[2]) - Number(range[1]) + 1 : 1000));
        const payload = data.slice(offset, offset + limit).map(v => columns && !columns.includes('*') ? Object.fromEntries(columns.map(key => [key, v[key]])) : v);
        row.requests.push({ action: search ? `search-${spec.remote}` : 'fixture', table, columns, offset, rows: payload.length, filter: filter ?? null, ...(search ? { leg: filter ? 'substring' : 'prominence', status: 200, names: payload.map(v => v.player_name) } : {}) });
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
      if (message.type() !== 'error') return;
      const text = message.text(), location = message.location();
      if (/^Failed to load resource: the server responded with a status of 503\b/.test(text) && row.requests.some(r => r.action === 'search-503' && r.url === location.url)) { row.expectedSearchDiagnostics.push({ text, url: location.url }); return; }
      if (/^Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)/.test(text) && row.requests.some(r => r.action === 'abort')) { row.expectedBlockedDiagnostics.push({ text, url: location.url }); return; }
      consoleTasks.push((async () => {
        const details = await Promise.allSettled(message.args().map(arg => arg.evaluate(v => v instanceof Error ? `${v.name}: ${v.message}\n${v.stack ?? ''}` : null)));
        row.errors.push([text, ...details.flatMap(v => v.status === 'fulfilled' && v.value ? [v.value] : [])].join('\n'));
      })());
    });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin !== BASE) return; if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js') && !row.assets.includes(url.pathname)) row.assets.push(url.pathname); if (response.status() >= 400) row.assetFailures.push({ path: url.pathname, status: response.status() }); });
    page.on('requestfailed', request => { const url = new URL(request.url()); if (url.origin === BASE) row.assetFailures.push({ path: url.pathname, error: request.failure()?.errorText }); });
    const check = (ok, message) => { assert(ok, `${spec.id}: ${message}`); row.checks += 1; report.checks += 1; };
    const activate = locator => spec.width < 1280 ? locator.tap() : locator.click();
    const input = () => page.getByRole('combobox', { name: 'Type a player name...' });
    const options = () => page.getByRole('option').evaluateAll(elements => elements.map(e => ({ name: e.querySelector('span.text-sm.font-medium')?.innerText ?? null, textContent: e.textContent, innerText: e.innerText })));
    const readSave = () => page.evaluate(() => { const key = Object.keys(localStorage).find(k => k.startsWith('transfer-path-daily-')); const raw = key ? localStorage.getItem(key) : null; return key && raw ? { key, raw, value: JSON.parse(raw) } : null; });
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
      await page.locator('#dukb-main').screenshot({ path: target, animations: 'allow' }); row.shots.push(name);
    }
    function poolReads(from) {
      const reads = row.requests.slice(from);
      check(reads.filter(r => r.action === 'fixture' && r.table === 'career_seasons').reduce((n, r) => n + r.rows, 0) === seasons.length, 'All unchanged statistics rows reached this mount');
      check(reads.some(r => r.action === 'fixture' && r.table === 'career_players' && r.rows === players.length && r.columns.includes('id')), 'The separate bulk graph identity read loaded every original player');
      check(reads.some(r => r.action === 'fixture' && r.table === 'transfer_path_puzzles' && r.rows === 1), 'The actual single-puzzle fixture loaded');
    }
    async function ready(from = 0) { await input().waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from); searchReady = true; }
    async function query(name) {
      const from = row.requests.length; row.lastQuery = name; await input().fill(name); await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForFunction(() => { const list = document.querySelector('[role=listbox]'); return list && !list.textContent.includes('Finding players...'); }, null, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 });
      const reads = row.requests.slice(from).filter(r => r.action.startsWith('search-'));
      const legs = site.normalizeName(name).length <= 24 ? ['prominence', 'substring'] : ['substring'];
      check(reads.length === legs.length && same(reads.map(r => r.leg).sort(), legs), 'Every actual autocomplete query leg settles under the owned response policy');
      check(reads.every(r => r.action === (spec.remote === 'outage' ? 'search-503' : `search-${spec.remote}`) && r.status === (spec.remote === 'outage' ? 503 : 200)), 'No graph read is mistaken for a controlled name search');
      const offered = await options(); row.stages.push({ stage: 'search-settled', query: name, remote: spec.remote, reads, options: offered }); return offered;
    }
    function exactOption(name) { return page.getByRole('option').filter({ has: page.locator('span.text-sm.font-medium').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`) }) }); }
    async function offer(name) {
      check(names.includes(name), 'The queried canonical identity exists in the unchanged committed player pool');
      const offered = await query(name), option = exactOption(name);
      check(await option.count() === 1 && (await option.locator('span.text-sm.font-medium').innerText()).trim() === name, 'Exactly the requested canonical full-name identity is offered');
      check(new Set(offered.map(v => site.normalizeName(v.name))).size === offered.length, 'Local and remote results show no duplicate canonical player');
      if (spec.remote === 'success') check(row.stages.at(-1).reads.some(r => r.names.includes(name)), 'Successful remote results and the local pool both contain this canonical identity');
      if (spec.remote === 'empty') check(row.stages.at(-1).reads.every(r => r.rows === 0) && await page.getByText('Could not load players. Try searching again.', { exact: true }).count() === 0, 'Settled empty remote results offer the real local identity without a search error');
      return option;
    }
    async function choose(name, capture) {
      const previous = await snapshot(), option = await offer(name); if (capture) await shot(capture); await activate(option);
      await page.waitForFunction(size => document.querySelector('#dukb-main p.text-destructive') || document.querySelector('#dukb-main .space-y-0')?.querySelectorAll('span.font-semibold.text-foreground').length > size, previous.chain.players.length, { timeout: 5000 });
      const actual = await snapshot(); check(await page.locator('#dukb-main p.text-destructive').count() === 0, 'The actual shortest-path pick is accepted'); row.stages.push({ stage: 'player-picked', query: name, ...actual }); return actual;
    }
    async function guardRejected(name, kind) {
      const before = await snapshot(), intentCount = completions().length, option = await offer(name); await activate(option);
      const refusal = page.locator('#dukb-main p.text-destructive'); await refusal.waitFor({ state: 'visible', timeout: 5000 });
      const text = await refusal.innerText(), actual = await snapshot();
      check(await refusal.count() === 1 && text.includes(name), 'The actual offered local identity is refused once with its name');
      if (kind === 'unverified-active') check(text.includes(`verified ${site.ACTIVE_YEAR} active-player records`), 'The refusal owns the committed Active identity filter');
      else if (kind === 'outside-europe') check(text.includes(before.chain.players.at(-1)) && text.includes('outside Europe'), 'The refusal owns the non-European-only club link');
      else check(text.includes(before.chain.players.at(-1)) && /(?:never at the same club|(?:no|don't have|do not have).*verified.*(?:link|same.club))/i.test(text), 'The refusal names both endpoints and denies their verified link');
      check(same(before, actual) && completions().length === intentCount, 'A refused local selection changes no chain, score, saved bytes or client completion intent');
      row.guards.push({ kind, name, before, after: actual, refusal: text });
    }
    async function guards() {
      const unknown = 'zzzzzzzlocalproof'; check(names.every(n => !site.normalizeName(n).includes(unknown)), 'The unknown search text matches no real pool identity');
      const before = await snapshot(); await query(unknown); check(await page.getByRole('option').count() === 0, 'An unknown query never becomes a local player'); await input().press('Enter');
      check(same(before, await snapshot()) && completions().length === 0, 'Unknown typed text cannot submit a daily action'); row.guards.push({ kind: 'unknown-query', query: unknown });
      for (const name of [puzzle.playerA, puzzle.playerB]) { await query(name); check(await exactOption(name).count() === 0, 'The played start and longer-path target remain excluded'); check(same(before, await snapshot()), 'Excluded identities change no play or save'); row.guards.push({ kind: 'excluded', name }); }
      const nonlink = names.find(n => n !== puzzle.playerA && n !== puzzle.playerB && graphs[spec.rule].keys.has(n) && !graphs.classic.adj.get(puzzle.playerA)?.has(n));
      check(Boolean(nonlink), 'An actual source-derived nonlink exists for this rule'); await guardRejected(nonlink, 'nonlink');
      if (spec.rule === 'active') {
        const unverified = site.careerPlayers.find(p => p.name !== puzzle.playerB && !site.isActivePlayer(p) && graphs.classic.adj.get(puzzle.playerA)?.has(p.name));
        check(Boolean(unverified), 'An actual everyday teammate excluded by verified Active identities exists'); await guardRejected(unverified.name, 'unverified-active');
      }
      if (spec.rule === 'europe') {
        const outside = names.find(n => n !== puzzle.playerA && n !== puzzle.playerB && graphs.classic.adj.get(puzzle.playerA)?.has(n) && !graphs.europe.adj.get(puzzle.playerA)?.has(n));
        if (outside) await guardRejected(outside, 'outside-europe');
        else row.guards.push({ kind: 'outside-europe', exercised: false, reason: 'No source-derived non-European-only teammate exists from this actual initial head' });
      }
    }
    async function playWin(capture) {
      for (const [index, name] of routes[spec.rule].path.slice(1, -1).entries()) await choose(name, index === 0 ? capture : null);
      await page.getByText('Connected!', { exact: true }).waitFor({ state: 'visible' }); await page.waitForLoadState('networkidle', { timeout: 8000 });
      const actual = await snapshot(), issues = winIssues(actual, spec.rule);
      check(issues.length === 0, `A natural win has its legal shortest chain and shared daily score: ${issues.join(', ')}`);
      check(actual.save?.value.puzzleId === puzzle.id && actual.save.value.gameStatus === 'won' && same(actual.save.value.guesses, [...stepsOf(actual), { t: 'won' }]), 'The actual app saves its exact legal steps and ordinary won marker');
      check(completions().length === 1 && completions()[0].completion.score === expectedScore(spec.rule), 'The genuine win emits one blocked client completion intent with its actual daily score');
      row.stages.push({ stage: 'natural-win', ...actual, completionIntents: completions().length, issues }); return actual;
    }
    async function reloadWin(before, stage) {
      const from = row.requests.length, intentCount = completions().length; await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Connected!', { exact: true }).waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from);
      const actual = await snapshot(), issues = reloadIssues(before, actual, spec.rule);
      check(issues.length === 0, `The actual win reloads under Everyday with literal saved bytes and the same chain: ${issues.join(', ')}`);
      check(completions().length === intentCount, 'Reload adds no blocked client completion intent');
      row.stages.push({ stage, before, after: actual, issues, completionIntentsBefore: intentCount, completionIntentsAfter: completions().length }); await shot(stage); return actual;
    }
    try {
      await page.goto(`${BASE}/transfer-path`, { waitUntil: 'domcontentloaded' }); await ready(); await activate(page.getByRole('button', { name: RULES[spec.rule], exact: true }));
      const initial = await snapshot();
      check(initial.rule === spec.rule && initial.minimum === routes[spec.rule].minSteps && same(initial.chain, { players: [puzzle.playerA], clubs: [] }) && !initial.won && initial.inputVisible && initial.save === null, 'The requested daily starts naturally from the complete source graph without saved play');
      await Promise.allSettled(consoleTasks); check(row.errors.length === 0, 'No setup app error precedes the controlled name search'); row.stages.push({ stage: 'initial', ...initial });
      await action({ page, row, check, input, activate, snapshot, shot, ready, poolReads, completions, query, offer, choose, guards, playWin, reloadWin, initial });
      await Promise.allSettled(consoleTasks);
      row.layout = await page.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(row.layout.width === spec.width && row.layout.clientWidth === row.layout.scrollWidth, 'The requested viewport has no sideways overflow');
      check(row.errors.length === 0 && row.assetFailures.length === 0, 'No unexpected app exception or failed owned asset'); row.ok = true;
      if (PHASE === 'baseline' && row.ownedBlockedSearch) report.blockedLegalSearches += 1;
      console.log(`${PHASE === 'baseline' ? 'BASELINE' : 'PASS'} ${spec.id}: ${row.checks} checks`);
    } catch (error) {
      row.ok = false; row.error = String(error.stack || error); report.setupFailures += 1;
      row.failureOptions = await options().catch(() => []); row.failureSearch = await input().inputValue().catch(() => null); row.failureText = await page.locator('body').innerText().catch(() => ''); await shot('failure').catch(() => {});
      console.error(`FAIL ${spec.id}: ${row.error}\nOptions: ${JSON.stringify(row.failureOptions)}`);
    } finally { await context.close(); }
  }

  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) for (const rule of Object.keys(RULES)) await walk({ id: `${PHASE}-outage-tpa-662-${rule}-${width}x${height}`, kind: 'outage', remote: 'outage', rule, width, height }, async j => {
    if (PHASE === 'fixed') { await j.guards(); const before = await j.playWin('outage-local-option'); await j.shot('natural-win'); await j.reloadWin(before, 'win-reload'); return; }
    const name = routes[rule].path[1]; j.check(names.includes(name) && graphs[rule].adj.get(puzzle.playerA)?.has(name), 'The requested source-derived first middle player is a legal available graph move');
    const offered = await j.query(name); await j.page.getByText('Could not load players. Try searching again.', { exact: true }).waitFor({ state: 'visible' });
    j.check(offered.length === 0 && await j.page.getByRole('option').count() === 0, 'Both failed searches leave the known legal identity unavailable');
    await j.input().press('Enter'); const actual = await j.snapshot();
    j.check(same(actual, j.initial) && j.completions().length === 0 && await j.page.locator('#dukb-main p.text-destructive').count() === 0, 'Typed-only Enter adds no chain, save, refusal or win despite the legal loaded identity');
    j.row.stages.push({ stage: 'owned-blocked-legal-search', name, before: j.initial, after: actual, options: offered, completionIntents: j.completions().length }); j.row.ownedBlockedSearch = true; await j.shot('blocked-legal-search');
  });
  if (PHASE === 'fixed') {
    for (const remote of ['success', 'empty']) await walk({ id: `fixed-${remote}-tpa-662-classic-390x844`, kind: remote === 'success' ? 'remote-dedupe' : 'remote-empty', remote, rule: 'classic', width: 390, height: 844 }, async j => { const before = await j.playWin(); await j.shot('natural-win'); await j.reloadWin(before, 'win-reload'); });
    await walk({ id: 'control-omitted-closing-pick-390x844', kind: 'detector-control', remote: 'outage', rule: 'active', width: 390, height: 844 }, async j => {
      await j.choose(routes.active.path[1]); const before = await j.snapshot(); await j.offer(routes.active.path.at(-2));
      j.check(before.inputVisible && !before.won && before.save?.value.gameStatus === 'playing' && same(before.save.value.guesses, stepsOf(before)), 'The omission control owns a real accepted nonterminal Active step and an offered legal closing identity');
      const from = j.row.requests.length; await j.page.reload({ waitUntil: 'domcontentloaded' }); await j.ready(from);
      const actual = await j.snapshot(), issues = reloadIssues(before, actual, 'active');
      j.check(actual.inputVisible && !actual.won && actual.save.raw === before.save.raw && j.completions().length === 0, 'Omitting the actual closing pick holds unfinished saved play and no completion intent');
      j.check(same(issues, ['view-win', 'view-chain', 'view-connectors', 'view-score']), 'The played-win detector rejects the actual omitted closing pick');
      j.row.control = { omittedAction: `Pick ${routes.active.path.at(-2)} from the actual local option`, before, after: actual, detected: issues }; await j.shot('detected');
    }, true);
    await walk({ id: 'control-deleted-won-save-390x844', kind: 'detector-control', remote: 'outage', rule: 'classic', width: 390, height: 844 }, async j => {
      const before = await j.playWin(); j.check(before.save?.raw && before.save.value.gameStatus === 'won', 'The deletion control owns an actual completed daily save');
      await j.page.evaluate(key => localStorage.removeItem(key), before.save.key); j.check(await j.page.evaluate(key => localStorage.getItem(key), before.save.key) === null, 'The control actually removes that completed daily key');
      const from = j.row.requests.length, intentCount = j.completions().length; await j.page.reload({ waitUntil: 'domcontentloaded' }); await j.ready(from);
      const actual = await j.snapshot(), issues = reloadIssues(before, actual, 'classic');
      j.check(actual.inputVisible && !actual.won && actual.save === null && same(actual.chain, j.initial.chain) && j.completions().length === intentCount, 'The controlled reload loses saved play without adding client completion intent');
      j.check(same(issues, ['view-win', 'view-chain', 'view-connectors', 'view-score', 'reload-bytes']), 'The restore detector rejects the actual deleted won save');
      j.row.control = { changedKey: before.save.key, before, after: actual, detected: issues }; await j.shot('detected');
    }, true);
  }
  assert.equal(report.cases.length, PHASE === 'baseline' ? 9 : 11); assert.equal(report.controls.length, PHASE === 'baseline' ? 0 : 2);
  report.outageCases = report.cases.filter(row => row.kind === 'outage').length;
  report.remoteDedupeCases = report.cases.filter(row => row.kind === 'remote-dedupe').length; report.remoteEmptyCases = report.cases.filter(row => row.kind === 'remote-empty').length;
  report.failures = [...report.cases, ...report.controls].filter(row => !row.ok).length;
  report.naturalChecks = report.cases.reduce((n, row) => n + row.checks, 0); report.controlChecks = report.controls.reduce((n, row) => n + row.checks, 0);
  report.fixtureRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'fixture').length, 0);
  report.failedSearchRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'search-503').length, 0);
  report.expectedSearchDiagnostics = [...report.cases, ...report.controls].reduce((n, row) => n + row.expectedSearchDiagnostics.length, 0);
  report.abortedExternalRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'abort').length, 0);
  report.assets = [...new Set([...report.cases, ...report.controls].flatMap(row => row.assets))].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, 'dist', decodeURIComponent(file)))) }));
  const shots = [...report.cases, ...report.controls].flatMap(row => row.shots);
  report.inventory = shots.map(file => ({ file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))) }));
  assert.equal(report.failures, 0, 'A setup or unexpected outcome failed; no outage reproduction or local play credit');
  assert.equal(shots.length, PHASE === 'baseline' ? 9 : 33); assert.equal(new Set(shots).size, shots.length);
  assert.equal(JSON.stringify(site.careerPlayers), originalPlayers);
  if (PHASE === 'baseline') { assert.equal(report.blockedLegalSearches, 9); report.status = 'baseline-reproduced'; process.exitCode = 1; console.log('Local search baseline: 9 loaded legal identities are unavailable after both actual name queries fail, setupFailures 0. Intentional exit 1.'); }
  else { report.status = 'passed'; console.log(`Local search fixed: ${report.checks} checks (${report.naturalChecks} natural, ${report.controlChecks} control), 9 outage wins, 1 remote dedupe, 1 empty remote, 2 effective controls, 33 original captures, ${report.fixtureRequests} bulk fixture reads, ${report.failedSearchRequests} owned 503 name queries, ${report.abortedExternalRequests} external aborts, 0 failures.`); }
} catch (error) {
  report.status = 'failed'; report.error = String(error.stack || error); report.setupFailures += 1; process.exitCode = 1; console.error(report.error);
} finally {
  await browser?.close(); host?.kill();
  report.sourceAfter = receipt(); report.installedAfter = installedReceipt();
  report.sourceHeld = same(sourceBefore, report.sourceAfter) && head() === report.sourceCommit; report.installedHeld = same(installedBefore, report.installedAfter);
  if (!report.sourceHeld || !report.installedHeld) { report.status = 'failed'; report.setupFailures += 1; process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.rmSync(tmp, { recursive: true, force: true });
}
