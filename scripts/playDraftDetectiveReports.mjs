/** Offline actual Dart Draft and Stat Detective journeys. All response rows
 * below are explicitly fictional test fixtures, never new sports facts.
 * BASE can reuse a host. SHOTS receives 390/1280 screenshots and evidence JSON. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4584);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/draft-detective-shots');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-detective-'));
const modulePath = path.join(temp, 'map.mjs');
await build({ stdin: { contents: "export { countryAt, viewBoxOf } from '@/lib/dartMap'; export { GEO_COUNTRIES } from '@/data/worldMapGeo';", resolveDir: ROOT }, outfile: modulePath, bundle: true, platform: 'node', format: 'esm', plugins: [{ name: 'offline-source-alias', setup(builder) {
  builder.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'client', namespace: 'fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const supabase = {};', loader: 'js' }));
  builder.onResolve({ filter: /^@\// }, args => ({ path: path.join(ROOT, 'src', args.path.slice(2)) + '.ts' }));
} }] });
const map = await import(pathToFileURL(modulePath).href);
const france = map.GEO_COUNTRIES.find(country => country.iso === 'fr');
const europe = map.viewBoxOf('europe');
let target = map.countryAt(france.cx, france.cy)?.iso === 'fr' && france.cx > europe.x && france.cx < europe.x + europe.w && france.cy > europe.y && france.cy < europe.y + europe.h ? { x: france.cx, y: france.cy } : null;
if (!target) for (let y = europe.y + 1; y < europe.y + europe.h && !target; y += 1) for (let x = europe.x + 1; x < europe.x + europe.w; x += 1) if (map.countryAt(x, y)?.iso === 'fr') { target = { x, y }; break; }
if (!target) throw new Error('Fixture refused: no actual French map point');
const market = Array.from({ length: 2105 }, (_, index) => ({ id: index, year: 2026, player_name: `Fixture Draft ${String(index).padStart(4, '0')}`, position: 'Central Midfield', age: 20, nationality: index < 1305 ? 'France' : 'Fixture Other Nation', club: 'Fixture Club', market_value_usd: (3000 - index) * 1000000, goals: index % 5, assists: index % 3 }));
market.push({ ...market[0], id: 9999, year: 2025, player_name: 'Fixture wrong year' });
const nbaRow = (id, name, star) => ({ id, season: '1994-95', player_name: name, position: 'PG', team: 'BOS', minutes: 2200, pts: star ? 2000 : 800, trb: star ? 600 : 300, ast: star ? 500 : 200, stl: 50, blk: 10 });
const nba = [...Array.from({ length: 501 }, (_, index) => nbaRow(index, `Fixture Star ${index}`, true)), ...Array.from({ length: 2201 }, (_, index) => nbaRow(10000 + index, index < 3 ? ['Fixture Guess One', 'Fixture Guess Two', 'Fixture Guess Three'][index] : `Fixture Rotation ${index}`, false))];
nba.push({ ...nbaRow(999998, 'Fixture Case Anchor', true), season: '1989-90', team: 'LAL' }, { ...nbaRow(999999, 'Fixture Case Anchor', true), season: '1995-96' }, { ...nbaRow(1000000, 'Fixture Case Anchor', false), season: '2000-01', minutes: 80 });
/* Release AT (ruling R3): this walk follows what ships. Stat Detective's span and franchise count are complete since
   Round 1145 (the view bref_nba_career_spans, labels Career span and Career franchises), so the other lane's Round
   1183 sentence about 500 minute seasons would be false and the integrator's sentence stands. The page fails closed
   without the view, so the fixture answers it: one row a name, and the anchor's row runs from 1989-90 to the 80
   minute stint of 2000-01, which the old 500 minute window (1990 to 1996) left out. The global Dart Draft pool is
   the first 2,000 rows in two pages (Round 1145), not the whole table. */
const scope = 'Career span and Career franchises count every NBA season on file for the player, short stints included. Years are season end years. The files run from 1949-50 to 2024-25, so a career that started earlier or is still going shows only those seasons.';
const spans = [...new Set(nba.map(row => row.player_name))].map(name => name === 'Fixture Case Anchor'
  ? { player_name: name, first_season: '1989-90', last_season: '2000-01', cohort: 1967, rows_500: 2, teams: 'LAL,BOS' }
  : { player_name: name, first_season: '1994-95', last_season: '1994-95', cohort: 1970, rows_500: 1, teams: 'BOS' })
  .sort((a, b) => (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0) || a.cohort - b.cohort);
const evidence = { fixture: 'Fictional response rows, no live database calls', target, viewports: [], checks: [] };
let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (!ok) failed += 1; evidence.checks.push({ ok, label }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };
let browser, server;
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
async function walk(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const requests = [], reports = [], errors = [];
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'essential');
    window.__sample = 0.5; Math.random = () => window.__sample;
    if (location.pathname !== '/dart-draft') return;
    let now = 0, next = 0; const callbacks = new Map();
    Object.defineProperty(performance, 'now', { value: () => now });
    window.requestAnimationFrame = callback => { callbacks.set(++next, callback); return next; };
    window.cancelAnimationFrame = id => callbacks.delete(id);
    window.__advance = delta => { now += delta; const run = [...callbacks.values()]; callbacks.clear(); run.forEach(callback => callback(now)); };
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(BASE).origin) return route.continue();
    if (!url.hostname.endsWith('supabase.co')) return route.abort();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
    if (url.pathname === '/functions/v1/report-relay') {
      reports.push(request.postDataJSON());
      return route.fulfill({ status: 200, headers: cors, body: '{"ok":true}' });
    }
    const table = url.pathname.split('/').at(-1);
    if (!['player_market_values', 'bref_nba_player_seasons', 'bref_nba_career_spans'].includes(table)) return route.abort();
    const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 1000);
    requests.push({ table, offset, limit, year: url.searchParams.get('year'), nationality: url.searchParams.get('nationality'), position: url.searchParams.get('position'), order: url.searchParams.get('order'), minutes: url.searchParams.get('minutes') });
    let rows;
    if (table === 'player_market_values') {
      const nations = url.searchParams.get('nationality')?.replace(/^in\.\(|\)$/g, '').split(',').map(value => value.replaceAll('"', ''));
      const positions = url.searchParams.get('position')?.replace(/^in\.\(|\)$/g, '').split(',').map(value => value.replaceAll('"', ''));
      rows = market.filter(row => (!url.searchParams.has('year') || `eq.${row.year}` === url.searchParams.get('year')) && (!nations || nations.includes(row.nationality)) && (!positions || positions.includes(row.position)))
        .sort((a, b) => b.market_value_usd - a.market_value_usd || a.player_name.localeCompare(b.player_name) || a.id - b.id);
    } else if (table === 'bref_nba_career_spans') {
      rows = spans;
    } else {
      const floor = Number(url.searchParams.get('minutes')?.split('.').at(-1) || 0);
      rows = nba.filter(row => row.minutes >= floor).sort((a, b) => b.id - a.id);
    }
    return route.fulfill({ status: 200, headers: { ...cors, 'content-range': `${offset}-${Math.min(offset + limit, rows.length) - 1}/${rows.length}` }, body: JSON.stringify(rows.slice(offset, offset + limit)) });
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(String(error)));
  const tag = `${width}x${height}`;
  const record = { viewport: tag, dart: [], requests, reports, errors }; evidence.viewports.push(record);
  try {
    await page.goto(`${BASE}/dart-draft`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Current Stars/ }).click();
    await page.getByRole('button', { name: /^CM throw$/ }).first().waitFor();
    const draftNames = () => page.getByRole('button').filter({ has: page.locator('div.font-bold.text-foreground.truncate') }).evaluateAll(buttons => buttons.map(button => button.querySelector('div.font-bold.text-foreground.truncate')?.textContent).filter(Boolean));
    for (let turn = 0; turn < 2; turn += 1) {
      await page.getByRole('button', { name: /^CM throw$/ }).first().click();
      const box = turn === 0 ? { x: 0, y: 0, w: 1000, h: 540 } : europe;
      const speed = 0.0011 + turn * 0.00009;
      await page.evaluate(delta => window.__advance(delta), ((target.x - box.x) / box.w) / speed);
      await page.keyboard.press('Space');
      await page.waitForTimeout(40);
      await page.evaluate(delta => window.__advance(delta), ((target.y - box.y) / box.h) / speed);
      await page.keyboard.press('Space');
      await page.evaluate(value => { window.__sample = value; }, turn === 0 ? 0 : 0.999999);
      await page.getByRole('button').filter({ hasText: 'Fixture Draft 0001' }).first().waitFor({ timeout: 15000 });
      const offered = await draftNames(); record.dart.push(offered);
      check(offered.length === 8 && new Set(offered).size === 8, `${tag}: turn ${turn + 1} has eight distinct choices`);
      check(offered.slice(0, 3).join() === (turn === 0 ? ['Fixture Draft 0000', 'Fixture Draft 0001', 'Fixture Draft 0002'] : ['Fixture Draft 0001', 'Fixture Draft 0002', 'Fixture Draft 0003']).join(), `${tag}: strongest three remain after used-player exclusion`);
      check(offered.every(name => Number(name.slice(-4)) < 1305), `${tag}: every country choice belongs to its recorded nation and CM pool`);
      if (turn === 1) check(offered.includes('Fixture Draft 1304') && !offered.includes('Fixture Draft 0000') && offered.slice(3).join() !== record.dart[0].slice(3).join(), `${tag}: second throw reaches deeper names with no already drafted player`);
      await page.getByRole('button').filter({ hasText: 'Fixture Draft 0001' }).first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOTS, `dart-${tag}-${turn + 1}.png`) });
      if (turn === 0) {
        await page.getByRole('button').filter({ hasText: 'Fixture Draft 0000' }).first().click();
        await page.evaluate(() => { window.__sample = 0.5; });
      }
    }
    const global = requests.filter(request => request.table === 'player_market_values' && !request.nationality);
    const national = requests.filter(request => request.table === 'player_market_values' && request.nationality);
    check(global.map(request => request.offset).sort((a, b) => a - b).join() === '0,1000' && global.every(request => request.limit === 1000), `${tag}: actual global request is the first 2,000 rows as two pages and nothing past them`);
    check(national.map(request => request.offset).join() === '0,1000' && [...global, ...national].every(request => request.year === 'eq.2026' && request.order?.endsWith('id.asc')), `${tag}: country pages beyond 120 and 1000 with stable id order and 2026 scope`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: Dart Draft has no horizontal overflow`);

    await page.goto(`${BASE}/stat-detective`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Stars/ }).waitFor({ timeout: 30000 });
    check(await page.getByText(scope, { exact: true }).first().isVisible(), `${tag}: the career span scope appears before play`);
    { const box = await page.getByRole('button', { name: /^Deep Cuts/ }).boundingBox(); check(!!box && box.y + box.height <= height, `${tag}: both difficulty buttons are on the first screen (Deep Cuts ends at ${box ? Math.round(box.y + box.height) : 'nowhere'} of ${height})`); }
    await page.evaluate(() => { window.__sample = 0; });
    await page.getByRole('button', { name: /^Stars/ }).click();
    for (const name of ['Fixture Guess One', 'Fixture Guess Two', 'Fixture Guess Three']) {
      await page.getByRole('textbox', { name: 'Guess the mystery player' }).fill(name);
      await page.getByRole('textbox', { name: 'Guess the mystery player' }).press('Enter');
    }
    check(await page.locator('[data-stat-clue="Career span"]').innerText() === 'Career span: 1990-2001', `${tag}: the clue is the complete span in season end years, the 80 minute stint of 2000-01 included`);
    check(await page.locator('[data-stat-clue="Career franchises"]').innerText() === 'Career franchises: 2' && await page.locator('[data-stat-profile-scope]').innerText() === scope, `${tag}: the franchise count sits beside its stated scope`);
    check(await page.locator('[data-stat-clue="Recorded seasons"], [data-stat-clue="Recorded franchises"]').count() === 0 && await page.getByText('Fixture Case Anchor', { exact: true }).count() === 0, `${tag}: no 500 minute label and no visible answer spoiler`);
    await page.screenshot({ path: path.join(SHOTS, `detective-${tag}.png`) });
    const help = page.getByRole('button', { name: 'How to play' });
    const helpTrigger = await help.elementHandle({ timeout: 2000 });
    await help.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Stat Detective rules' });
    check(await dialog.getByText(scope, { exact: true }).isVisible(), `${tag}: reopened help repeats the career span scope`);
    record.help = { phase: 'focus readiness' };
    try {
      await dialog.waitFor({ state: 'visible', timeout: 2000 });
      await page.waitForFunction(panel => panel.isConnected && panel.contains(document.activeElement), await dialog.elementHandle({ timeout: 2000 }), { timeout: 2000 });
      record.help.phase = 'Escape restoration';
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 2000 });
      await page.waitForFunction(button => button.isConnected && document.activeElement === button, helpTrigger, { timeout: 2000 });
      check(await helpTrigger.evaluate(button => document.activeElement === button), `${tag}: Escape returns native help focus`);
      record.help.phase = 'restored';
    } catch (error) {
      record.help.error = String(error.stack || error);
      record.help.diagnostic = await helpTrigger.evaluate(button => ({ triggerConnected: button.isConnected, triggerFocused: document.activeElement === button,
        triggerHidden: !!button.closest('[aria-hidden="true"]'), active: document.activeElement?.outerHTML ?? null,
        dialogs: Array.from(document.querySelectorAll('[role="dialog"]')).map(panel => ({ state: panel.getAttribute('data-state'), focused: panel.contains(document.activeElement), text: panel.textContent.slice(0, 300) })) }));
      throw error;
    }
    await page.getByRole('button', { name: 'Report', exact: true }).click();
    await page.getByRole('button', { name: 'Other', exact: true }).click();
    await page.getByRole('textbox', { name: 'Describe what is wrong with this question' }).fill('Fictional offline fixture report');
    await page.getByRole('button', { name: 'Submit Report', exact: true }).click();
    await page.getByText('Thanks for reporting!', { exact: true }).waitFor();
    const report = reports.at(-1);
    check(report?.game_type === 'stat-detective' && report.game_context.puzzleId === 'Fixture Case Anchor|1995-96|BOS' && report.game_context.player === 'Fixture Case Anchor' && report.game_context.difficulty === 'stars', `${tag}: intercepted report identifies exact random puzzle and mode`);
    check(report?.game_context.recordedSeasons === '1990-2001' && report.game_context.profileScope === 'career-span-every-season-on-file' && report.game_context.guesses.join() === 'Fixture Guess One,Fixture Guess Two,Fixture Guess Three', `${tag}: report includes visible scope and actual guesses`);
    check(requests.filter(request => request.table === 'bref_nba_player_seasons').length === 25 && requests.filter(request => request.table === 'bref_nba_player_seasons').every(request => request.minutes === 'gte.500'), `${tag}: existing mystery eligibility remains 500 minutes`);
    { const view = requests.filter(request => request.table === 'bref_nba_career_spans'); check(view.length >= 3 && view.some(request => request.offset === 0) && view.every(request => request.offset % 1000 === 0 && request.order === 'player_name.asc,cohort.asc'), `${tag}: the spans view is read in whole pages from the first row, in its key order (${view.length} requests)`); }
    check(errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: no page errors or sideways Stat Detective scroll`);
  } finally { await context.close(); }
}
try {
  fs.mkdirSync(SHOTS, { recursive: true });
  if (!process.env.BASE) {
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  for (const [width, height] of [[390, 844], [1280, 900]]) try { await walk(width, height); } catch (error) { check(false, `${width}x${height}: ${String(error.stack || error).slice(0, 1500)}`); }
  console.log(`playDraftDetectiveReports: ${checks} checks, ${failed} failed. Screenshots and evidence: ${SHOTS}`);
  fs.writeFileSync(path.join(SHOTS, 'draft-detective-evidence.json'), JSON.stringify({ ...evidence, checksRun: checks, failed }, null, 2));
  process.exitCode = failed ? 1 : 0;
} finally { if (browser) await browser.close(); if (server) server.kill(); fs.rmSync(temp, { recursive: true, force: true }); }