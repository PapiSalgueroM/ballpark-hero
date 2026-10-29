/* Reviewer walk (runner only, never committed): NHL Connections on the built site, the table answered from a pool the
   walk chooses, every other database request aborted. OLD = the lead's 10-29 export as it stands (before 1567 and
   1574). NEW = after both: the file's four boards (Round 1567) and the table file's 16 decided boards.
   1) NEW boards nhlconn-009 and 020, 390x844 and 1280x900, reduced motion on and off: solve all four, record scrollY,
      the revealed labels against the NEW board, the win screen; one loss per board at 390.
   2) the same board on OLD and NEW at both widths: the scroll sequence, the base comparison the builder did not run.
   3) old saves: a game started on OLD, the table then rewritten (NEW), the page reloaded the same day: nhlconn-005
      (labels only, the 1567 matcher's case) and nhlconn-009 (members moved, the case the dealt day rule exists for).
   Screenshots and rvwalk.json into $RC_OUT. Exit 1 on a failure of 1) or of the label only case in 3). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const ROOT = path.resolve('.');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalkb-'));
const R = ROOT.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'e.mjs'), `export { dailyIndex } from '${R}/src/lib/dateUtils.ts';\nexport { nhlConnectionsPuzzles } from '${R}/src/data/nhlConnectionsPuzzles.ts';`);
await build({ entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const app = await import(pathToFileURL(path.join(TMP, 'o.mjs')).href);
const exp = JSON.parse(fs.readFileSync('.rc/x/nhl-2026-10-29.json', 'utf8')).sort((a, b) => a.sort_order - b.sort_order);
const table = JSON.parse(fs.readFileSync('scripts/data/nhlConnectionsTable-2026-10.json', 'utf8'));
const OLD = exp.map(r => ({ puzzle_id: r.puzzle_id, groups_json: r.groups_json }));
const fileB = new Map(app.nhlConnectionsPuzzles.map(b => [b.id, b.groups]));
const tabB = new Map(table.rows.map(r => [r.puzzle_id, r.board]));
const NEW = exp.map(r => ({ puzzle_id: r.puzzle_id, groups_json: fileB.get(r.puzzle_id) ?? tabB.get(r.puzzle_id) }));
if (NEW.some(r => !r.groups_json)) throw new Error('a NEW row has no board');
const dateFor = id => {
  for (let i = 0; i < 80; i += 1) { const d = new Date(Date.UTC(2026, 10, 1, 12) + i * 86400000).toISOString().slice(0, 10); if (NEW[app.dailyIndex(d, NEW.length)].puzzle_id === id && OLD[app.dailyIndex(d, OLD.length)].puzzle_id === id) return d; }
  throw new Error(`no date deals ${id}`);
};
const boardIn = (pool, id) => pool.find(r => r.puzzle_id === id).groups_json;
let failures = 0;
const report = { runs: [] };
const fail = (run, m) => { failures += 1; run.fail.push(m); console.error(`  FAIL ${run.name}: ${m}`); };
const browser = await chromium.launch();
let pool = NEW;
async function open(date, v, motion) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, timezoneId: 'America/New_York', reducedMotion: motion });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message ?? e)));
  await page.route(/supabase\.co/, route => (route.request().url().includes('nhl_connections_puzzles') ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pool) }) : route.abort()));
  await page.clock.install({ time: new Date(`${date}T17:00:00Z`) });
  await page.goto(`${BASE}/nhl-connections`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  return { ctx, page, errors };
}
async function ready(page) {
  await page.waitForSelector('[aria-label="Available players"] button, [aria-label="Revealed groups"]', { timeout: 30000 });
  await page.waitForTimeout(600);
  for (let i = 0; i < 3 && await page.locator('[role="dialog"]').count(); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
}
const tiles = page => page.locator('[aria-label="Available players"] button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
const tap = (page, name) => page.locator(`[aria-label="Available players"] button[aria-label="${name.replace(/"/g, '\\"')}"]`).evaluate(el => el.click());
const submit = page => page.getByRole('button', { name: 'Submit five' }).evaluate(el => el.click());
const clear = async page => { const b = page.getByRole('button', { name: 'Clear draft' }); if (await b.isEnabled().catch(() => false)) await b.evaluate(el => el.click()); };
const scrollY = page => page.evaluate(() => Math.round(window.scrollY));
const shown = page => page.locator('[aria-label="Revealed groups"] summary').evaluateAll(els => els.map(e => ({ text: e.textContent.trim(), over: e.scrollWidth - e.clientWidth })));
async function solve(page, groups, run) {
  for (const g of groups) {
    await clear(page);
    for (const n of g.players) await tap(page, n);
    const before = await scrollY(page);
    await submit(page);
    await page.waitForTimeout(800);
    run.scroll.push(`${before}>${await scrollY(page)}`);
  }
}
const VIEWS = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const shot = async (page, name, full = false) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); };

/* 1) NEW boards, both widths, both motion settings */
for (const id of ['nhlconn-009', 'nhlconn-020']) {
  const date = dateFor(id);
  const groups = boardIn(NEW, id);
  for (const v of VIEWS) for (const motion of ['reduce', 'no-preference']) {
    pool = NEW;
    const run = { name: `${id} ${v.w} ${motion} win`, date, scroll: [], fail: [] };
    const { ctx, page, errors } = await open(date, v, motion);
    const t = await tiles(page);
    if (t.length !== 20 || groups.flatMap(g => g.players).some(n => !t.includes(n))) fail(run, `deals ${t.length} tiles, not ${id}`);
    await solve(page, groups, run);
    if (!(await page.locator('text=All Groups Found!').count())) fail(run, 'no win screen');
    const rows = await shown(page);
    run.labels = rows.map(r => r.text);
    const want = groups.map(g => g.theme);
    if (rows.length !== 4 || want.some(w => !rows.some(r => r.text.replace(/\s+/g, ' ') === w))) fail(run, `revealed ${JSON.stringify(run.labels)} not the NEW board's ${JSON.stringify(want)}`);
    for (const r of rows) if (r.over > 1) fail(run, `label "${r.text}" overflows by ${r.over}px`);
    await shot(page, `rv-${id}-${v.w}-${motion}-win`, true);
    if (errors.length) fail(run, `page errors: ${errors.slice(0, 2).join(' | ')}`);
    report.runs.push(run);
    await ctx.close();
  }
  /* a loss at 390: four wrong fives */
  const lose = { name: `${id} 390 lose`, date, scroll: [], fail: [] };
  const o = await open(date, VIEWS[0], 'reduce');
  for (let i = 0; i < 4; i += 1) {
    await clear(o.page);
    for (const n of [...groups[0].players.slice(0, 4), groups[1].players[i]]) await tap(o.page, n);
    await submit(o.page);
    await o.page.waitForTimeout(800);
  }
  if (!(await o.page.locator('text=Out of Lives!').count())) fail(lose, 'no loss screen');
  const rows = await shown(o.page);
  if (rows.length !== 4) fail(lose, `${rows.length} revealed rows after a loss`);
  await shot(o.page, `rv-${id}-390-lose`, true);
  report.runs.push(lose);
  await o.ctx.close();
}

/* 2) the scroll on OLD and NEW, same board, same build: is the jump this round's data or the page's own? */
for (const v of VIEWS) for (const which of ['OLD', 'NEW']) {
  pool = which === 'OLD' ? OLD : NEW;
  const id = 'nhlconn-009';
  const date = dateFor(id);
  const run = { name: `scroll ${which} ${id} ${v.w}`, date, scroll: [], fail: [], info: true };
  const { ctx, page } = await open(date, v, 'reduce');
  await solve(page, boardIn(pool, id), run);
  report.runs.push(run);
  await ctx.close();
}

/* 3) old saves: started on OLD, the table rewritten to NEW, the page reloaded the same day */
async function oldSave(id, solveIdx, v) {
  const date = dateFor(id);
  pool = OLD;
  const run = { name: `oldsave ${id} solved ${solveIdx.join('+')} ${v.w}`, date, scroll: [], fail: [] };
  const { ctx, page, errors } = await open(date, v, 'reduce');
  const oldG = boardIn(OLD, id);
  await solve(page, solveIdx.map(i => oldG[i]), run);
  const key = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('nhl-connections-daily')));
  run.saveKeys = key;
  pool = NEW;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  const t = await tiles(page);
  run.afterReload = { tiles: t.length, revealed: (await shown(page)).map(r => r.text) };
  const newG = boardIn(NEW, id);
  run.strays = t.filter(n => !newG.some(g => g.players.includes(n)));
  run.unreachable = newG.flatMap(g => g.players).filter(n => !t.includes(n) && !run.afterReload.revealed.length);
  await shot(page, `rv-oldsave-${id}-${v.w}-reloaded`, true);
  /* then lose the rest, the case where 1567 once showed five rows */
  for (let i = 0; i < 4 && !(await page.locator('text=Out of Lives!').count()) && !(await page.locator('text=All Groups Found!').count()); i += 1) {
    const left = await tiles(page);
    if (left.length < 5) break;
    await clear(page);
    const unsolved = newG.filter(g => g.players.every(n => left.includes(n)));
    const five = unsolved.length >= 2 ? [...unsolved[0].players.slice(0, 4), unsolved[1].players[i % 5]] : left.slice(0, 5);
    for (const n of five) await tap(page, n);
    await submit(page);
    await page.waitForTimeout(800);
  }
  const end = await shown(page);
  run.afterLoss = { revealed: end.map(r => r.text), lost: !!(await page.locator('text=Out of Lives!').count()), won: !!(await page.locator('text=All Groups Found!').count()) };
  const names = end.length;
  if (id === 'nhlconn-005' && (names !== 4 || run.afterReload.tiles !== 20 - 5 * solveIdx.length)) fail(run, `labels only board: ${run.afterReload.tiles} tiles after reload, ${names} rows after the loss`);
  await shot(page, `rv-oldsave-${id}-${v.w}-end`, true);
  if (errors.length) fail(run, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  report.runs.push(run);
  await ctx.close();
}
await oldSave('nhlconn-005', [0, 1], VIEWS[0]);
await oldSave('nhlconn-009', [2], VIEWS[0]);
await oldSave('nhlconn-009', [3, 0], VIEWS[0]);

await browser.close();
fs.writeFileSync(path.join(OUT, 'rvwalk.json'), JSON.stringify(report, null, 1));
for (const r of report.runs) console.log(`${r.name} (${r.date}): ${r.fail.length ? 'FAIL ' + r.fail.join('; ') : 'ok'}; scroll ${r.scroll.join(' ')}${r.afterReload ? `; after reload ${JSON.stringify(r.afterReload)} strays ${JSON.stringify(r.strays)} end ${JSON.stringify(r.afterLoss)}` : ''}`);
if (failures) { console.error(`rvwalk: ${failures} failure(s)`); process.exit(1); }
console.log('rvwalk: green');
