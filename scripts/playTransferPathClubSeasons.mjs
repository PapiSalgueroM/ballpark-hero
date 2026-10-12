/* Actual built /transfer-path, with the reported tpa-770 pair and an unchanged
   statistics pool. The app supplies verified club memberships from its own
   committed module. Pick Mbappe from the real autocomplete after Trent, at
   320, 390 and 1280 wide, under Everyday and Europe only. The painted chain
   and the saved action must both say Real Madrid, with no refusal.

   Remote runners only. Every database response is a local fixture projected
   from careerPlayers.ts, bundled at runtime. No database probe is sent. Every
   other external request is aborted. Serve an existing dist with the shared
   host-like server, or supply a literal loopback SWEEP_BASE. This script never
   builds the app. PLAY_SHOTS or RC_OUT selects the report and screenshot folder.

   The original-code hook reproduction and the missing-membership hook
   control separately prove that the reported refusal is detected. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { buildGraph, deriveHint } from './lib/transferPathHints.mjs';

assert(process.env.CI, 'Transfer Path club-season browser proof runs on remote runners only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.PLAY_SHOTS || process.env.RC_OUT || path.join(ROOT, 'artifacts/transfer-path-club-seasons'));
const VIEWPORTS = [[320, 568], [390, 844], [1280, 800]];
const RULES = [{ id: 'classic', label: 'Everyday' }, { id: 'europe', label: 'Europe only' }];
const START = 'Trent Alexander-Arnold';
const PICK = 'Kylian Mbappé';
const TARGET = 'Victor Osimhen';
const PUZZLE_ID = 'tpa-770';
const CLUB = 'Real Madrid';
const sha = value => createHash('sha256').update(value).digest('hex');
fs.mkdirSync(OUT, { recursive: true });

// Only copied identity and statistics rows become database fixtures.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-club-seasons-'));
let host;
let browser;
const report = {
  route: '/transfer-path', puzzleId: PUZZLE_ID, checks: 0, cases: [],
  policy: 'Fixture database GETs and literal loopback only; all other external requests aborted',
  sourceSha256: sha(fs.readFileSync(path.join(ROOT, 'src/data/careerPlayers.ts'))),
};

try {
  const bundle = path.join(tmp, 'fixture-source.mjs');
  await build({
    stdin: {
      contents: "export { careerPlayers } from './src/data/careerPlayers.ts'; export { isEuropeanClub } from './src/lib/transferPathModes.ts';",
      resolveDir: ROOT, sourcefile: 'transfer-path-fixture-source.mjs', loader: 'js',
    },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle,
    alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'offline-supabase', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'offline-supabase', namespace: 'offline-supabase' }));
      b.onLoad({ filter: /.*/, namespace: 'offline-supabase' }, () => ({
        contents: 'export const supabase = null; export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js',
      }));
    } }],
  });
  const { careerPlayers, isEuropeanClub } = await import(pathToFileURL(bundle).href);
  const players = careerPlayers.map((p, i) => ({
    id: `browser-fixture-${String(i + 1).padStart(5, '0')}`,
    player_name: p.name, nationality: p.nationality, position: p.position,
  }));
  const seasons = careerPlayers.flatMap((p, i) => p.career.map((s, sort_order) => ({
    player_id: players[i].id, season: s.season, club: s.club,
    goals: s.goals, assists: s.assists, appearances: s.appearances,
    market_value: s.marketValue, sort_order,
  })));
  for (const name of [START, PICK, TARGET]) assert(players.some(p => p.player_name === name), `${name} is absent from the committed fixture source`);
  const base = deriveHint(buildGraph(careerPlayers), START, TARGET);
  const europePlayers = careerPlayers.map(p => ({ ...p, career: p.career.filter(s => isEuropeanClub(s.club)) }));
  const europe = deriveHint(buildGraph(europePlayers), START, TARGET);
  assert(base && europe, 'The reported pair needs stored metadata under both tested rules');
  const puzzle = {
    puzzle_id: PUZZLE_ID, player_a: START, player_b: TARGET,
    min_steps: base.minSteps, hint: base.hint, sort_order: 0,
    active_min_steps: null, active_hint: null,
    europe_min_steps: europe.minSteps, europe_hint: europe.hint,
  };
  report.fixture = {
    players: players.length, seasons: seasons.length,
    nullAssists: seasons.filter(s => s.assists === null).length,
    puzzle, basePath: base.path, europePath: europe.path,
    playerRowsSha256: sha(JSON.stringify(players)), seasonRowsSha256: sha(JSON.stringify(seasons)),
  };

  let origin = process.env.SWEEP_BASE;
  if (!origin) {
    assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before this browser walk');
    const port = await new Promise((resolve, reject) => {
      const server = createServer();
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(error => error ? reject(error) : resolve(value)); });
    });
    origin = `http://127.0.0.1:${port}`;
    host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let hostError = '';
    host.stderr.on('data', value => { hostError += value; });
    const deadline = Date.now() + 15000;
    while (true) {
      try { const response = await fetch(origin); assert.equal(response.status, 200); break; }
      catch (error) {
        if (host.exitCode !== null || Date.now() > deadline) throw new Error(`Built-site server did not start: ${hostError || error}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  const originUrl = new URL(origin);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(originUrl.hostname) && ['http:', 'https:'].includes(originUrl.protocol), 'SWEEP_BASE must be literal loopback');
  assert(!originUrl.username && !originUrl.password, 'SWEEP_BASE must not carry credentials');
  const BASE = originUrl.origin;
  report.base = BASE;
  browser = await pw.chromium.launch();

  for (const [width, height] of VIEWPORTS) for (const rule of RULES) {
    const id = `${PUZZLE_ID}-${rule.id}-${width}x${height}`;
    const row = { id, rule: rule.id, width, height, checks: 0, errors: [], localAssetFailures: [], requests: [], assets: [], screenshots: [] };
    report.cases.push(row);
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1280, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      const table = /^\/rest\/v1\/(career_players|career_seasons|transfer_path_puzzles)$/.exec(url.pathname)?.[1];
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
      if (/\.supabase\.co$/i.test(url.hostname) && request.method() === 'OPTIONS' && table) {
        row.requests.push({ action: 'fixture-options', table });
        return route.fulfill({ status: 204, headers: cors, body: '' });
      }
      if (/\.supabase\.co$/i.test(url.hostname) && request.method() === 'GET' && table) {
        let data = table === 'career_players' ? players : table === 'career_seasons' ? seasons : [puzzle];
        const nameFilter = url.searchParams.get('player_name');
        if (nameFilter) {
          assert(nameFilter.startsWith('ilike.'), `Unexpected player fixture filter: ${nameFilter}`);
          const query = nameFilter.slice(6).replaceAll('%', '').toLowerCase();
          data = data.filter(p => p.player_name.toLowerCase().includes(query));
        }
        const range = request.headers().range?.match(/^(\d+)-(\d+)$/);
        const offset = Number(url.searchParams.get('offset') ?? range?.[1] ?? 0);
        const limit = Number(url.searchParams.get('limit') ?? (range ? Number(range[2]) - Number(range[1]) + 1 : 1000));
        const selected = url.searchParams.get('select')?.split(',').map(s => s.trim());
        const page = data.slice(offset, offset + limit).map(p => selected && !selected.includes('*') ? Object.fromEntries(selected.map(key => [key, p[key]])) : p);
        row.requests.push({ action: 'fixture', table, offset, limit, rows: page.length, select: selected, search: nameFilter ?? null });
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(page) });
      }
      row.requests.push({ action: 'abort', origin: url.origin, path: url.pathname, method: request.method() });
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => {
      if (message.type() === 'error' && !/^Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)/.test(message.text())) row.errors.push(message.text());
    });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin !== BASE) return;
      if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js') && !row.assets.includes(url.pathname)) row.assets.push(url.pathname);
      if (response.status() >= 400) row.localAssetFailures.push({ path: url.pathname, status: response.status() });
    });
    const check = (condition, message) => { assert(condition, `${id}: ${message}`); row.checks += 1; report.checks += 1; };
    const chain = () => page.locator('#dukb-main .space-y-0').first();
    const readChain = async () => ({
      players: await chain().locator('span.font-semibold.text-foreground').allTextContents(),
      clubs: await chain().locator('span.italic').allTextContents(),
    });
    const screenshot = async suffix => {
      const filename = `${id}-${suffix}.png`;
      await page.locator('#dukb-main').screenshot({ path: path.join(OUT, filename) });
      row.screenshots.push(filename);
    };
    try {
      await page.goto(`${BASE}/transfer-path`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const input = page.getByRole('combobox', { name: 'Type a player name...' });
      await input.waitFor({ state: 'visible', timeout: 15000 });
      check(await page.getByText(START, { exact: true }).count() >= 1 && await page.getByText(TARGET, { exact: true }).count() === 1, 'The actual reported endpoints are on the board');
      check(row.requests.some(r => r.action === 'fixture' && r.table === 'transfer_path_puzzles' && r.rows === 1), 'The daily came from the single reported puzzle fixture');
      check(row.requests.some(r => r.action === 'fixture' && r.table === 'career_players' && r.select?.includes('id')), 'The app fetched the real identity projection');
      const seasonRequests = row.requests.filter(r => r.action === 'fixture' && r.table === 'career_seasons');
      row.seasonRowsDelivered = seasonRequests.reduce((sum, r) => sum + r.rows, 0);
      check(row.seasonRowsDelivered === seasons.length, `All ${seasons.length} unchanged statistics rows reached the graph`);
      const ruleButton = page.getByRole('button', { name: rule.label, exact: true });
      await ruleButton.click();
      check(await ruleButton.getAttribute('aria-pressed') === 'true', 'The requested rule is selected');
      check(!await page.getByText(/Today's pair has no route under/).count(), 'The requested rule plays this daily directly');
      row.before = await readChain();
      check(JSON.stringify(row.before.players) === JSON.stringify([START]) && row.before.clubs.length === 0, 'The pick starts from Trent with no seeded move');

      await input.fill('mbappe');
      const option = page.getByRole('option').filter({ hasText: PICK });
      await option.waitFor({ state: 'visible', timeout: 10000 });
      check(await option.count() === 1, 'Autocomplete offers exactly one Mbappe identity to pick');
      row.autocomplete = await option.innerText();
      check(row.requests.some(r => r.action === 'fixture' && r.table === 'career_players' && !r.select?.includes('id')), 'The actual autocomplete queried its fixture source');
      await screenshot('autocomplete');
      if (width < 1280) await option.tap();
      else await option.click();
      await page.waitForFunction(name => {
        const main = document.querySelector('#dukb-main');
        return main && ([...main.querySelectorAll('.space-y-0 span.font-semibold.text-foreground')].some(e => e.textContent === name) || main.querySelector('p.text-destructive'));
      }, PICK, { timeout: 5000 });
      row.after = await readChain();
      row.refusals = await page.locator('#dukb-main p.text-destructive').allTextContents();
      row.save = await page.evaluate(() => {
        const key = Object.keys(localStorage).find(k => k.startsWith('transfer-path-daily-'));
        return key ? { key, value: JSON.parse(localStorage.getItem(key)) } : null;
      });
      await screenshot('outcome');
      check(row.refusals.length === 0, `The pick has no rejection: ${row.refusals.join(' ')}`);
      check(JSON.stringify(row.after.players) === JSON.stringify([START, PICK]), `The visible chain holds Trent then Mbappe: ${JSON.stringify(row.after.players)}`);
      check(JSON.stringify(row.after.clubs) === JSON.stringify([CLUB]), `The visible connection is Real Madrid: ${JSON.stringify(row.after.clubs)}`);
      check(row.save?.value.puzzleId === PUZZLE_ID, 'The saved move belongs to the reported puzzle');
      check(JSON.stringify(row.save.value.guesses) === JSON.stringify([{ t: 'step', player: PICK, club: CLUB }]), 'The actual game saved exactly the accepted Real Madrid step');
      check(row.save.value.gameStatus === 'playing', 'The chain continues toward Victor Osimhen');
      check(await input.inputValue() === '', 'The real selection clears the search box');
      row.layout = await page.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(row.layout.width === width && row.layout.scrollWidth <= row.layout.clientWidth + 1, 'The route stays within its requested viewport');
      check(row.errors.length === 0 && row.localAssetFailures.length === 0, 'No app exception or failed owned asset');
      row.ok = true;
      console.log(`PASS ${id}: ${row.checks} checks, ${row.seasonRowsDelivered} statistics rows, ${row.after.players.join(' -> ')} via ${row.after.clubs.join(', ')}`);
    } catch (error) {
      row.ok = false;
      row.error = String(error.stack || error);
      row.failureText = await page.locator('#dukb-main').innerText().catch(() => '');
      await screenshot('failure').catch(() => {});
      console.error(`FAIL ${id}: ${row.error}`);
    } finally {
      await context.close();
    }
  }
  report.failed = report.cases.filter(row => !row.ok).length;
  report.fixtureRequests = report.cases.reduce((sum, row) => sum + row.requests.filter(r => r.action === 'fixture').length, 0);
  report.abortedExternalRequests = report.cases.reduce((sum, row) => sum + row.requests.filter(r => r.action === 'abort').length, 0);
  const assetPaths = [...new Set(report.cases.flatMap(row => row.assets))];
  report.builtAssets = assetPaths.map(asset => {
    const file = path.join(ROOT, 'dist', decodeURIComponent(asset));
    return { path: asset, sha256: fs.existsSync(file) ? sha(fs.readFileSync(file)) : null };
  });
  assert.equal(report.cases.length, 6, 'All three widths and both rules must run');
  assert.equal(report.failed, 0, `${report.failed} actual browser journeys failed`);
  console.log(`Transfer Path club seasons: ${report.checks} checks, 6 journeys, ${report.fixtureRequests} fixture requests, ${report.abortedExternalRequests} external requests aborted, 0 failures.`);
} finally {
  await browser?.close();
  host?.kill();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  fs.rmSync(tmp, { recursive: true, force: true });
}
