/* Round 1574 walk (a runner probe, not committed): NHL Connections on the built site, with the live table answered
   from the table AFTER the migration (the file's four boards and the table file's 16 decided boards, in sort_order),
   every other request to the database host aborted. Three dated days that deal (a) nhlconn-005, the longest new
   label and four dated club groups, (b) nhlconn-008, four club groups, (c) nhlconn-016, a rebuilt board; at 390 by
   844 and 1280 by 900: solve the four groups by their five names, then a losing run. Records scrollY before and after
   every submit (clicks are dispatched, so the walk itself never scrolls), the revealed rows, every label's width
   against its row, the smallest text, and a screenshot of each end. Writes $RC_OUT/walk.json; exit 1 on a failure. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const ROOT = path.resolve('.');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'walk1574-'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1574b-'));
const R = ROOT.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'e.mjs'), `export { dailyIndex } from '${R}/src/lib/dateUtils.ts';\nexport { nhlConnectionsPuzzles } from '${R}/src/data/nhlConnectionsPuzzles.ts';`);
await build({ entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const app = await import(pathToFileURL(path.join(TMP, 'o.mjs')).href);
const table = JSON.parse(fs.readFileSync('scripts/data/nhlConnectionsTable-2026-10.json', 'utf8'));
const rows = [...app.nhlConnectionsPuzzles.map((b, i) => ({ puzzle_id: b.id, sort_order: i + 1, groups_json: b.groups })), ...table.rows.map(r => ({ puzzle_id: r.puzzle_id, sort_order: r.sort_order, groups_json: r.board }))].sort((a, b) => a.sort_order - b.sort_order);
const dateFor = id => {
  const start = new Date('2026-11-01T12:00:00Z');
  for (let i = 0; i < 60; i += 1) { const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10); if (rows[app.dailyIndex(d, rows.length)].puzzle_id === id) return d; }
  throw new Error(`no date in 60 deals ${id}`);
};
const TARGETS = ['nhlconn-005', 'nhlconn-008', 'nhlconn-016'].map(id => ({ id, date: dateFor(id), groups: rows.find(r => r.puzzle_id === id).groups_json }));
const VIEWS = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const report = { base: BASE, targets: TARGETS.map(t => `${t.id} on ${t.date}`), runs: [] };
let failures = 0;
const fail = (run, m) => { failures += 1; run.fail.push(m); console.error(`  FAIL ${run.name}: ${m}`); };

const browser = await chromium.launch();
async function open(t, v) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message ?? e)));
  await page.route(/supabase\.co/, route => (route.request().url().includes('nhl_connections_puzzles') ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows.map(r => ({ puzzle_id: r.puzzle_id, groups_json: r.groups_json }))) }) : route.abort()));
  await page.clock.install({ time: new Date(`${t.date}T17:00:00Z`) });
  await page.goto(`${BASE}/nhl-connections`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[aria-label="Available players"] button', { timeout: 30000 });
  /* the rules open on a first visit: close them the way a player does */
  for (let i = 0; i < 3 && await page.locator('[role="dialog"]').count(); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  return { ctx, page, errors };
}
const tap = async (page, name) => page.locator(`[aria-label="Available players"] button[aria-label="${name.replace(/"/g, '\\"')}"]`).evaluate(el => el.click());
const submit = async page => page.getByRole('button', { name: 'Submit five' }).evaluate(el => el.click());
const scrollY = page => page.evaluate(() => window.scrollY);

async function measureEnd(page, run, want) {
  const rowsShown = await page.locator('[aria-label="Revealed groups"] details').count();
  if (rowsShown !== want) fail(run, `${rowsShown} revealed rows, expected ${want}`);
  const labels = await page.locator('[aria-label="Revealed groups"] summary').evaluateAll(els => els.map(e => ({ text: e.textContent.trim(), over: e.scrollWidth - e.clientWidth, lines: Math.round(e.getBoundingClientRect().height) })));
  for (const l of labels) if (l.over > 1) fail(run, `label "${l.text}" is ${l.over}px wider than its row`);
  const small = await page.evaluate(() => { let min = 99, at = ''; for (const el of document.querySelectorAll('main *')) { if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const s = parseFloat(getComputedStyle(el).fontSize); const r = el.getBoundingClientRect(); if (r.width && s < min) { min = s; at = el.textContent.trim().slice(0, 40); } } return { min, at }; });
  if (small.min < 12) run.smallText = small; /* reported; the page's own small print is not this round's */
  run.labels = labels;
  run.smallest = small;
}

for (const t of TARGETS) for (const v of VIEWS) {
  const run = { name: `${t.id} ${v.w}x${v.h} win`, date: t.date, scroll: [], fail: [] };
  const { ctx, page, errors } = await open(t, v);
  const shown = await page.locator('[aria-label="Available players"] button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
  const want = t.groups.flatMap(g => g.players);
  if (shown.length !== 20 || want.some(n => !shown.includes(n))) fail(run, `the page deals ${shown.length} names, not the board ${t.id}`);
  for (const g of t.groups) {
    for (const n of g.players) await tap(page, n);
    const before = await scrollY(page);
    await submit(page);
    await page.waitForTimeout(700);
    const after = await scrollY(page);
    run.scroll.push([before, after]);
    if (Math.abs(after - before) > 1) fail(run, `scrollY ${before} became ${after} on submitting "${g.theme}"`);
  }
  await page.waitForSelector('text=All Groups Found!', { timeout: 10000 }).catch(() => fail(run, 'no win screen'));
  await measureEnd(page, run, 4);
  await page.screenshot({ path: path.join(OUT, `walk-${t.id}-${v.w}-win.png`), fullPage: true });
  if (errors.length) fail(run, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  report.runs.push(run);
  await ctx.close();
  /* a losing run: four wrong fives, each one away */
  const lose = { name: `${t.id} ${v.w}x${v.h} lose`, date: t.date, scroll: [], fail: [] };
  const o = await open(t, v);
  for (let i = 0; i < 4; i += 1) {
    const five = [...t.groups[0].players.slice(0, 4), t.groups[1].players[i]];
    const clear = o.page.getByRole('button', { name: 'Clear draft' });
    if (await clear.isEnabled().catch(() => false)) await clear.evaluate(el => el.click());
    for (const n of five) await tap(o.page, n);
    const before = await scrollY(o.page);
    await submit(o.page);
    await o.page.waitForTimeout(700);
    lose.scroll.push([before, await scrollY(o.page)]);
  }
  await o.page.waitForSelector('text=Out of Lives!', { timeout: 10000 }).catch(() => fail(lose, 'no loss screen'));
  await measureEnd(o.page, lose, 4);
  await o.page.screenshot({ path: path.join(OUT, `walk-${t.id}-${v.w}-lose.png`), fullPage: true });
  if (o.errors.length) fail(lose, `page errors: ${o.errors.slice(0, 2).join(' | ')}`);
  report.runs.push(lose);
  await o.ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(report, null, 1));
console.log(report.runs.map(r => `${r.name} (${r.date}): ${r.fail.length ? 'FAIL ' + r.fail.join('; ') : 'ok'}; scroll ${r.scroll.map(s => s.join('>')).join(' ')}; smallest ${r.smallest?.min}px`).join('\n'));
if (failures) { console.error(`walk1574: ${failures} failure(s)`); process.exit(1); }
console.log('walk1574: green. Every dealt board shows its 20 names, four solved groups reveal four rows with labels inside their rows, a loss reveals four, and no submit moves the page.');
