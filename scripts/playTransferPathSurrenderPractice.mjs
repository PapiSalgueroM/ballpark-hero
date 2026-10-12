/* Remote-only actual-route proof of daily surrender continuing into practice.
   baseline: nine natural surrenders must reveal a legal path and persist a
   loss, then expose no practice entry. Only that owned result earns the
   baseline-reproduced status and intentional exit 1.
   fixed: give up, reload, enter Unlimited, select the requested practice rule,
   and naturally win a shortest path while every daily loss byte stays held.
   At 390 wide each rule also exercises Unlimited surrender and Next Puzzle.
   Two actual detector controls omit activation or delete the real give save.

   TRANSFER_PATH_SURRENDER_PHASE=baseline|fixed
   TRANSFER_PATH_SURRENDER_OUT=<artifact root> node scripts/playTransferPathSurrenderPractice.mjs
   Build dist first. Database reads are projected from committed career stats
   and independently derived metadata for the committed tpa-662 pair. All
   other external requests are aborted. No authenticated completion claim. */
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

assert(process.env.CI, 'Surrender practice browser proof runs remotely only');
const PHASE = process.env.TRANSFER_PATH_SURRENDER_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'Select baseline or fixed explicitly');
assert(process.env.TRANSFER_PATH_SURRENDER_OUT, 'Set TRANSFER_PATH_SURRENDER_OUT');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.env.TRANSFER_PATH_SURRENDER_OUT), PHASE);
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
];
const receipt = () => heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
fs.mkdirSync(OUT, { recursive: true });
const sourceBefore = receipt();
const report = { phase: PHASE, sourceCommit: head(), methodSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), sourceBefore, scope: 'Signed-out built route and local daily saves; no authenticated completion claim', status: 'pending', checks: 0, missingEntries: 0, setupFailures: 0, failures: 0, cases: [], controls: [] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-surrender-'));
let browser, host;

try {
  for (const item of sourceBefore) assert.equal(item.sha256, sha(execFileSync('git', ['show', `${report.sourceCommit}:${item.file}`], { cwd: ROOT })), `${item.file} differs from committed source`);
  const bundle = path.join(tmp, 'fixture-source.mjs');
  await build({
    stdin: { contents: "export { careerPlayers } from './src/data/careerPlayers.ts'; export { playersUnderRule } from './src/lib/transferPathModes.ts';", resolveDir: ROOT, sourcefile: 'surrender-fixtures.mjs', loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'offline-supabase', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'offline-supabase', namespace: 'offline-supabase' }));
      b.onLoad({ filter: /.*/, namespace: 'offline-supabase' }, () => ({ contents: 'export const supabase = null; export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' }));
    } }],
  });
  const site = await import(pathToFileURL(bundle).href), originalPlayers = JSON.stringify(site.careerPlayers);
  const retained = fs.readFileSync(path.join(ROOT, 'scripts/data/transferPathPull/puzzles.txt'), 'utf8').split(/\r?\n/).map(line => line.split('|')).find(row => row[0] === 'tpa-662');
  assert(retained?.[1] === 'Lionel Messi' && retained?.[2] === 'Mohamed Salah', 'The actual retained pair is required');
  const graphs = Object.fromEntries(Object.keys(RULES).map(rule => [rule, buildGraph(site.playersUnderRule(site.careerPlayers, rule))]));
  const routes = Object.fromEntries(Object.keys(RULES).map(rule => {
    const value = deriveHint(graphs[rule], retained[1], retained[2]);
    assert(value && value.minSteps === { classic: 2, active: 3, europe: 2 }[rule], `${rule}: independently verified original minimum changed or is unavailable`);
    return [rule, value];
  }));
  const puzzle = { id: retained[0], playerA: retained[1], playerB: retained[2], minSteps: routes.classic.minSteps, hint: routes.classic.hint, active: { minSteps: routes.active.minSteps, hint: routes.active.hint }, europe: { minSteps: routes.europe.minSteps, hint: routes.europe.hint } };
  const players = site.careerPlayers.map((p, i) => ({ id: `surrender-fixture-${String(i + 1).padStart(5, '0')}`, player_name: p.name, nationality: p.nationality, position: p.position }));
  const seasons = site.careerPlayers.flatMap((p, i) => p.career.map((s, sort_order) => ({ player_id: players[i].id, season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, market_value: s.marketValue, sort_order })));
  assert.equal(players.length, 253); assert.equal(seasons.length, 3640);
  report.fixture = { metadataSource: 'Actual committed tpa-662 endpoints with independently derived original graph metadata', puzzle, routes, players: players.length, statisticsRows: seasons.length, playerRowsSha256: sha(JSON.stringify(players)), seasonRowsSha256: sha(JSON.stringify(seasons)) };
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

  function pathIssues(reveal, rule) {
    if (!reveal.present) return ['reveal-presence'];
    const issues = [];
    if (reveal.players[0] !== puzzle.playerA || reveal.players.at(-1) !== puzzle.playerB) issues.push('reveal-endpoints');
    if (reveal.players.length - 1 !== routes[rule].minSteps) issues.push('reveal-minimum');
    if (new Set(reveal.players).size !== reveal.players.length) issues.push('reveal-repeated-name');
    if (reveal.clubs.length !== reveal.players.length - 1) issues.push('reveal-club-count');
    for (let i = 1; i < reveal.players.length; i++) if (!graphs[rule].adj.get(reveal.players[i - 1])?.get(reveal.players[i])?.some(s => s.club === reveal.clubs[i - 1])) issues.push('reveal-edge');
    return issues;
  }
  function reloadIssues(before, after) {
    const issues = [];
    if (before.save?.key !== after.save?.key || before.save?.raw !== after.save?.raw) issues.push('reload-save');
    if (after.save?.value.gameStatus !== 'lost' || !same(after.save.value.guesses, [{ t: 'give' }])) issues.push('reload-loss');
    if (!same(before.chain, after.chain)) issues.push('reload-chain');
    if (pathIssues(after.reveal, 'classic').length) issues.push('reload-reveal');
    if (after.mode !== 'daily' || after.rule !== 'classic' || after.minimum !== routes.classic.minSteps) issues.push('reload-rule-or-minimum');
    if (after.won || after.inputVisible || after.scoreText.length) issues.push('reload-finish');
    return issues;
  }
  function practiceIssues(state, held, rule, index) {
    const issues = [];
    if (state.mode !== 'unlimited') issues.push('practice-mode');
    if (state.index !== index) issues.push('practice-index');
    if (state.rule !== rule || state.minimum !== routes[rule].minSteps) issues.push('practice-rule-or-minimum');
    if (!same(state.chain, { players: [puzzle.playerA], clubs: [] })) issues.push('practice-chain');
    if (!state.inputVisible || state.won || state.scoreText.length) issues.push('practice-input');
    if (state.reveal.present) issues.push('practice-reveal');
    if (state.save?.key !== held.save.key || state.save?.raw !== held.save.raw) issues.push('practice-daily-save');
    return issues;
  }
  async function walk(spec, action, control = false) {
    const row = { id: spec.id, rule: spec.rule, width: spec.width, height: spec.height, checks: 0, requests: [], errors: [], assetFailures: [], assets: [], stages: [], shots: [] };
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
      row.requests.push({ action: 'abort', origin: url.origin, path: url.pathname, method: request.method() }); return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && !/^Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)/.test(message.text())) row.errors.push(message.text()); });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin !== BASE) return; if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js') && !row.assets.includes(url.pathname)) row.assets.push(url.pathname); if (response.status() >= 400) row.assetFailures.push({ path: url.pathname, status: response.status() }); });
    const check = (ok, message) => { assert(ok, `${spec.id}: ${message}`); row.checks += 1; report.checks += 1; };
    const activate = locator => spec.width < 1280 ? locator.tap() : locator.click();
    const input = () => page.getByRole('combobox', { name: 'Type a player name...' });
    const entry = () => page.getByRole('button', { name: 'Play Unlimited', exact: true });
    const options = () => page.getByRole('option').evaluateAll(elements => elements.map(e => ({ name: e.querySelector('span.text-sm.font-medium')?.innerText ?? null, textContent: e.textContent, innerText: e.innerText })));
    const snapshot = async () => {
      const caption = await page.locator('#dukb-main p').filter({ hasText: /^(?:📅 Daily Challenge|♾️ Unlimited #\d+)/ }).first().innerText();
      let selectedRule;
      for (const r of Object.keys(RULES)) if (await page.getByRole('button', { name: RULES[r], exact: true }).getAttribute('aria-pressed') === 'true') selectedRule = r;
      const revealed = await page.getByText("Here's a path that works", { exact: true }).count() === 1;
      return {
        caption, mode: caption.includes('Daily Challenge') ? 'daily' : 'unlimited', index: Number(/Unlimited #(\d+)/.exec(caption)?.[1]) || null, rule: selectedRule,
        minimum: Number(/^Optimal:\s*(\d+)/.exec(await page.locator('#dukb-main p').filter({ hasText: /^Optimal: \d+/ }).first().innerText())?.[1]),
        chain: { players: await page.locator('#dukb-main .space-y-0').first().locator('span.font-semibold.text-foreground').allTextContents(), clubs: await page.locator('#dukb-main .space-y-0').first().locator('span.italic').allTextContents() },
        reveal: { present: revealed, players: revealed ? await page.locator('#dukb-main .space-y-0').nth(1).locator('span.font-semibold.text-foreground').allTextContents() : [], clubs: revealed ? await page.locator('#dukb-main .space-y-0').nth(1).locator('span.italic').allTextContents() : [] },
        won: await page.getByText('Connected!', { exact: true }).count() === 1, inputVisible: await input().count() === 1 && await input().isVisible(), scoreText: await page.locator('#dukb-main span').filter({ hasText: /^\d+ pts$/ }).allTextContents(),
        save: await page.evaluate(() => { const key = Object.keys(localStorage).find(k => k.startsWith('transfer-path-daily-')); const raw = key ? localStorage.getItem(key) : null; return key && raw ? { key, raw, value: JSON.parse(raw) } : null; }),
      };
    };
    async function shot(stage) {
      if (await page.getByText('Connected!', { exact: true }).count()) {
        await page.waitForFunction(() => {
          const headline = [...document.querySelectorAll('#dukb-main h2')].find(e => e.textContent === 'Connected!');
          const card = headline?.closest('[role=status]'), score = headline?.closest('[data-result-moment]')?.querySelector('.rm-score');
          return [headline, card, score].every(e => e && Number(getComputedStyle(e).opacity) >= 0.99 && !e.getAnimations().some(a => a.playState === 'running' || a.pending));
        }, null, { timeout: 5000 });
        check(true, 'The original result headline, card and score animation are settled before capture');
      }
      const name = `${spec.id}-${stage}.png`, target = path.join(OUT, name);
      assert(!fs.existsSync(target), `Refuse to overwrite original capture ${name}`);
      await page.locator('#dukb-main').screenshot({ path: target, animations: 'allow' }); row.shots.push(name);
    }
    const completionAttempts = () => row.requests.filter(r => r.path === '/rest/v1/game_completions' && r.method === 'POST').length;
    function poolReads(from) {
      const reads = row.requests.slice(from);
      check(reads.filter(r => r.action === 'fixture' && r.table === 'career_seasons').reduce((n, r) => n + r.rows, 0) === seasons.length, 'All unchanged statistics rows reached this mount');
      check(reads.some(r => r.action === 'fixture' && r.table === 'transfer_path_puzzles' && r.rows === 1), 'The actual single-puzzle fixture loaded');
    }
    async function ready(from = 0) { await input().waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from); }
    async function selectRule(rule) {
      await activate(page.getByRole('button', { name: RULES[rule], exact: true }));
      check(await page.getByRole('button', { name: RULES[rule], exact: true }).getAttribute('aria-pressed') === 'true', 'The requested current rule is selected');
    }
    async function surrender(stage, rule) {
      await activate(page.getByRole('button', { name: 'Give up and see a path', exact: true }));
      await page.getByText('Give up and see the answer?', { exact: true }).waitFor({ state: 'visible' });
      await activate(page.getByRole('button', { name: 'Yes, reveal it', exact: true }));
      await page.getByText("Here's a path that works", { exact: true }).waitFor({ state: 'visible' });
      await page.waitForLoadState('networkidle', { timeout: 8000 });
      const state = await snapshot(), issues = pathIssues(state.reveal, rule);
      check(issues.length === 0 && !state.won && !state.inputVisible && state.scoreText.length === 0, `Natural surrender reveals a legal minimal path and ends play: ${issues.join(', ')}`);
      row.stages.push({ stage, ...state, pathIssues: issues }); return state;
    }
    function dailyLoss(state) {
      check(state.mode === 'daily' && state.save?.value.puzzleId === puzzle.id && state.save.value.gameStatus === 'lost' && same(state.save.value.guesses, [{ t: 'give' }]), 'The actual daily saves exactly one give action as a loss');
      check(same(state.chain, { players: [puzzle.playerA], clubs: [] }), 'Surrender does not invent a played step');
    }
    async function reloadLoss(expected, stage) {
      const from = row.requests.length, completions = completionAttempts(); await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText("Here's a path that works", { exact: true }).waitFor({ state: 'visible', timeout: 15000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }); poolReads(from);
      const actual = await snapshot(), issues = reloadIssues(expected, actual);
      row.stages.push({ stage, before: expected, after: actual, issues });
      check(issues.length === 0, `Literal daily loss bytes restore with the independently valid Everyday reveal: ${issues.join(', ')}`);
      check(completionAttempts() === completions, 'Restored daily loss does not repeat a completion request'); await shot(stage); return actual;
    }
    async function choose(name) {
      const previous = await snapshot(), from = row.requests.length; row.lastQuery = name; await input().fill(name);
      const label = page.locator('span.text-sm.font-medium').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`) });
      const option = page.getByRole('option').filter({ has: label }); await option.waitFor({ state: 'visible', timeout: 10000 });
      check(await option.count() === 1 && (await option.locator('span.text-sm.font-medium').innerText()).trim() === name, 'Exactly the requested full-name identity is offered');
      check(row.requests.slice(from).some(r => r.action === 'fixture' && r.filter && r.names.includes(name)), 'The actual queried fixture supplied that chosen identity');
      row.stages.push({ stage: 'player-offered', query: name, options: await options() }); await activate(option);
      await page.waitForFunction(size => document.querySelector('#dukb-main p.text-destructive') || document.querySelector('#dukb-main .space-y-0')?.querySelectorAll('span.font-semibold.text-foreground').length > size, previous.chain.players.length, { timeout: 5000 });
      const actual = await snapshot(); check(await page.locator('#dukb-main p.text-destructive').count() === 0, 'The actual shortest-path pick is accepted'); row.stages.push({ stage: 'player-picked', ...actual }); return actual;
    }
    try {
      await page.goto(`${BASE}/transfer-path`, { waitUntil: 'domcontentloaded' }); await ready(); await selectRule(spec.rule);
      const initial = await snapshot();
      check(initial.mode === 'daily' && initial.minimum === routes[spec.rule].minSteps && same(initial.chain, { players: [puzzle.playerA], clubs: [] }) && !initial.won && !initial.reveal.present && initial.save === null, 'The requested real pair starts naturally without saved play');
      row.stages.push({ stage: 'initial', ...initial });
      await action({ page, row, check, input, entry, activate, snapshot, shot, ready, selectRule, surrender, dailyLoss, reloadLoss, choose, initial });
      row.layout = await page.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(row.layout.width === spec.width && row.layout.clientWidth === row.layout.scrollWidth, 'The requested viewport has no sideways overflow');
      check(row.errors.length === 0 && row.assetFailures.length === 0, 'No app exception or failed owned asset'); row.ok = true;
      if (PHASE === 'baseline' && row.deadEndReproduced) report.missingEntries += 1;
      console.log(`${PHASE === 'baseline' ? 'BASELINE' : 'PASS'} ${spec.id}: ${row.checks} checks`);
    } catch (error) {
      row.ok = false; row.error = String(error.stack || error); report.setupFailures += 1;
      row.failureOptions = await options().catch(() => []); row.failureSearch = await input().inputValue().catch(() => null); row.failureText = await page.locator('#dukb-main').innerText().catch(() => ''); await shot('failure').catch(() => {});
      console.error(`FAIL ${spec.id}: ${row.error}\nOptions: ${JSON.stringify(row.failureOptions)}`);
    } finally { await context.close(); }
  }

  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) for (const rule of Object.keys(RULES)) await walk({ id: `${PHASE}-tpa-662-${rule}-${width}x${height}`, rule, width, height }, async j => {
    const lost = await j.surrender('daily-surrender', rule); j.dailyLoss(lost); await j.shot('daily-surrender');
    if (PHASE === 'baseline') {
      j.check(await j.page.getByRole('button', { name: /Play\s+unlimited/i }).count() === 0 && await j.page.getByRole('button', { name: 'Next Puzzle', exact: true }).count() === 0, 'The settled surrendered daily has no accessible practice or next-puzzle entry');
      j.row.deadEnd = { observed: lost, practiceEntryCount: 0, nextPuzzleCount: 0 }; j.row.deadEndReproduced = true; return;
    }
    const restored = await j.reloadLoss(lost, 'daily-surrender-reload');
    j.check(await j.entry().count() === 1 && await j.entry().isVisible(), 'The surrendered daily offers exactly one accessible practice entry');
    await j.activate(j.entry()); await j.input().waitFor({ state: 'visible' });
    const entered = await j.snapshot(), entryIssues = practiceIssues(entered, restored, 'classic', 1);
    j.row.stages.push({ stage: 'practice-entry-after-everyday-reload', ...entered, issues: entryIssues });
    j.check(entryIssues.length === 0, 'Practice entry carries the actual current Everyday rule and preserves the lost daily bytes');
    await j.selectRule(rule); let playing = await j.snapshot();
    const requestedIssues = practiceIssues(playing, restored, rule, 1);
    j.row.stages.push({ stage: 'practice-requested-rule', ...playing, issues: requestedIssues }); j.check(requestedIssues.length === 0, 'The unlocked practice explicitly selects its requested rule and resets its own round');
    if (width === 390) {
      const practiceLoss = await j.surrender('unlimited-surrender', rule);
      j.check(practiceLoss.mode === 'unlimited' && practiceLoss.index === 1 && practiceLoss.save.raw === lost.save.raw, 'Unlimited surrender leaves every daily loss byte held'); await j.shot('unlimited-surrender');
      await j.activate(j.page.getByRole('button', { name: 'Next Puzzle', exact: true })); await j.input().waitFor({ state: 'visible' });
      playing = await j.snapshot(); const nextIssues = practiceIssues(playing, restored, rule, 2);
      j.row.stages.push({ stage: 'unlimited-next-puzzle', before: practiceLoss, after: playing, issues: nextIssues });
      j.check(nextIssues.length === 0, 'The existing Next Puzzle action advances the actual index and resets practice without writing the daily'); await j.shot('unlimited-next-puzzle');
    }
    let won;
    for (const name of routes[rule].path.slice(1, -1)) won = await j.choose(name);
    j.check(won.won && same(won.chain.players, routes[rule].path) && pathIssues({ present: true, ...won.chain }, rule).length === 0 && won.scoreText.includes('1000 pts'), 'Natural middle-player picks and automatic target win the independent shortest path for 1000');
    j.check(won.mode === 'unlimited' && won.rule === rule && won.save.raw === lost.save.raw && won.save.key === lost.save.key, 'The actual practice win preserves the original daily lost key and literal bytes');
    j.row.stages.push({ stage: 'practice-win', ...won }); await j.shot('practice-win');
    await j.reloadLoss(lost, 'final-daily-surrender-reload');
  });
  if (PHASE === 'fixed') {
    const controlSpec = name => ({ id: `control-${name}-390x844`, rule: 'classic', width: 390, height: 844 });
    await walk(controlSpec('omitted-activation'), async j => {
      const lost = await j.surrender('control-daily-surrender', 'classic'); j.dailyLoss(lost);
      j.check(await j.entry().count() === 1 && await j.entry().isVisible(), 'The omission control owns an actual offered practice entry');
      const actual = await j.snapshot(), issues = practiceIssues(actual, lost, 'classic', 1);
      j.check(same(actual, lost), 'The actual controlled daily remains surrendered because activation was omitted');
      j.check(same(issues, ['practice-mode', 'practice-index', 'practice-input', 'practice-reveal']), 'The owned entry detector rejects the actual omitted activation');
      j.row.control = { omittedAction: 'Activate the offered Play Unlimited button', actual, detected: issues }; await j.shot('detected');
    }, true);
    await walk(controlSpec('deleted-give-save'), async j => {
      const lost = await j.surrender('control-daily-surrender', 'classic'); j.dailyLoss(lost);
      j.check(lost.save?.raw && lost.save.value.guesses.length === 1, 'The deletion control owns actual nonempty lost give bytes');
      await j.page.evaluate(key => localStorage.removeItem(key), lost.save.key);
      j.check(await j.page.evaluate(key => localStorage.getItem(key), lost.save.key) === null, 'The control actually removes its real give saved key');
      const from = j.row.requests.length; await j.page.reload({ waitUntil: 'domcontentloaded' }); await j.ready(from);
      const actual = await j.snapshot(), issues = reloadIssues(lost, actual);
      j.check(actual.mode === 'daily' && actual.inputVisible && !actual.reveal.present && actual.save === null && same(actual.chain, j.initial.chain), 'The actual controlled reload loses the surrendered finish and returns to an unplayed daily');
      j.check(same(issues, ['reload-save', 'reload-loss', 'reload-reveal', 'reload-finish']), 'The owned loss-restoration detector rejects the actual deleted give save');
      j.row.control = { changedKey: lost.save.key, before: lost, after: actual, detected: issues }; await j.shot('detected');
    }, true);
  }
  assert.equal(report.cases.length, 9); assert.equal(report.controls.length, PHASE === 'baseline' ? 0 : 2);
  report.failures = [...report.cases, ...report.controls].filter(row => !row.ok).length;
  report.naturalChecks = report.cases.reduce((n, row) => n + row.checks, 0); report.controlChecks = report.controls.reduce((n, row) => n + row.checks, 0);
  report.fixtureRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'fixture').length, 0);
  report.abortedExternalRequests = [...report.cases, ...report.controls].reduce((n, row) => n + row.requests.filter(r => r.action === 'abort').length, 0);
  report.assets = [...new Set([...report.cases, ...report.controls].flatMap(row => row.assets))].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, 'dist', decodeURIComponent(file)))) }));
  const shots = [...report.cases, ...report.controls].flatMap(row => row.shots);
  report.inventory = shots.map(file => ({ file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))) }));
  assert.equal(report.failures, 0, 'A setup or unexpected outcome failed; no reproduction or acceptance credit');
  assert.equal(shots.length, PHASE === 'baseline' ? 9 : 44); assert.equal(new Set(shots).size, shots.length);
  assert.equal(JSON.stringify(site.careerPlayers), originalPlayers);
  if (PHASE === 'baseline') { assert.equal(report.missingEntries, 9); report.status = 'baseline-reproduced'; process.exitCode = 1; console.log('Surrender practice baseline: 9 genuine daily surrenders with no practice entry, setupFailures 0. Intentional exit 1.'); }
  else { report.status = 'passed'; console.log(`Surrender practice fixed: ${report.checks} checks (${report.naturalChecks} natural, ${report.controlChecks} control), 9 natural journeys, 2 effective controls, 44 original captures, ${report.fixtureRequests} fixture reads, ${report.abortedExternalRequests} external aborts, 0 failures.`); }
} catch (error) {
  report.status = 'failed'; report.error = String(error.stack || error); report.setupFailures += 1; process.exitCode = 1; console.error(report.error);
} finally {
  await browser?.close(); host?.kill();
  report.sourceAfter = receipt(); report.sourceHeld = same(sourceBefore, report.sourceAfter) && head() === report.sourceCommit;
  if (!report.sourceHeld) { report.status = 'failed'; report.setupFailures += 1; process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.rmSync(tmp, { recursive: true, force: true });
}
