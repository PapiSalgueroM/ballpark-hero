/* fix2-1509 (closing check major 1): the board panel of a club that won its cup from outside its league places, on
 * a served build. The cup search is the run reviewer's (walk1509.mjs). Checks the why line is there, says the cup,
 * is at least 12 px, sits inside the viewport, and that nothing scrolls sideways. Pictures into $RC_OUT.
 * Supabase and the ad hosts aborted. Never committed. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const BASE_URL = process.env.BASE || 'http://localhost:4173';
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const log = [];
const say = s => { console.log(s); log.push(s); };
const cannot = why => { say(`walkBoard: cannot run: ${why}`); fs.writeFileSync(path.join(OUT, 'walkBoard.txt'), log.join('\n')); process.exit(2); };
const opts = { skipHalftime: true, noCoach: true };
const E = await engineOf(ROOT, 'rboard', {}, cannot);
async function play(club, seed, until, max = 400) {
  const M = await E.fresh();
  let s = tape(seed, () => M.cm.startCareer(club)).value;
  let i = 0;
  while (!until(M, s) && s.week < s.calendar.length && i < max) { s = tape(seed + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state; i += 1; }
  return { M, s, i };
}
function items(M, s) { M.store.clear(); if (!M.cm.saveCareer(s)) cannot('the engine refused to save'); return [...M.store.entries()]; }
const saves = {};
const expectWhy = {};
{
  const M0 = await E.fresh();
  const pool = ['premier', 'laliga', 'seriea', 'bundesliga', 'ligue1'].flatMap(id => (M0.cm.REAL_LEAGUES.find(l => l.id === id)?.clubs ?? []).slice(3, 12));
  let found = null; let tried = 0;
  const t0 = Date.now();
  for (const club of pool) {
    if (found || Date.now() - t0 > 300000) break;
    const M = await E.fresh();
    let s0;
    try { s0 = M.cm.startCareer(club); } catch { continue; }
    if (!M.cm.objectiveStatuses(s0).some(o => M.cm.europeRungOf(o.objective) === 'uel')) continue;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      tried += 1;
      const r = await play(club, seed * 101, (Mm, s) => !!s.cupBracket?.find(t => t.round === 'F')?.winner);
      if (r.s.cupBracket?.find(t => t.round === 'F')?.winner !== club) continue;
      const pos = r.M.cm.sortedLeagueTable(r.s).findIndex(x => x.club === club) + 1;
      const st = r.M.cm.objectiveStatuses(r.s).find(o => r.M.cm.europeRungOf(o.objective) === 'uel');
      say(`cupwin: ${club} seed ${seed * 101} won its cup at week ${r.s.week}, table ${pos}, "${st?.objective.label}" target ${st?.objective.target} ${st?.status}, route ${r.M.cm.euroPlaceRouteOf(r.s)}, why "${st?.why ?? ''}"`);
      if (pos <= (st?.objective.target ?? 0)) continue;
      saves.cupMid = items(r.M, r.s); expectWhy.cupMid = st?.why ?? null;
      let s = r.s; let i = r.i;
      while (s.week < s.calendar.length && i < 400) { s = tape(seed * 101 + 1 + i, () => r.M.cm.playNextEntry(s, opts)).value.state; i += 1; }
      const se = r.M.cm.objectiveStatuses(s).find(o => r.M.cm.europeRungOf(o.objective) === 'uel');
      say(`cupwin-end: ${club} finished ${r.M.cm.sortedLeagueTable(s).findIndex(x => x.club === club) + 1}, ${se?.status}, route ${r.M.cm.euroPlaceRouteOf(s)}, why "${se?.why ?? ''}"`);
      saves.cupEnd = items(r.M, s); expectWhy.cupEnd = se?.why ?? null;
      found = club; break;
    }
  }
  say(`cupwin: searched ${tried} seasons in ${((Date.now() - t0) / 1000).toFixed(0)} s, found ${found ?? 'none'}`);
  if (!found) cannot('no club won its cup from outside its places in the search');
}
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const browser = await chromium.launch();
const problems = [];
const problem = (where, what) => { problems.push(`${where}: ${what}`); say(`PROBLEM ${where}: ${what}`); };
async function press(page, loc, ms = 4000) {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); await loc.first().evaluate(el => el.click()); await page.waitForTimeout(500); return true; } catch { return false; }
}
let seen = 0;
for (const key of ['cupMid', 'cupEnd']) {
  if (!expectWhy[key]) { problem(key, 'the engine gave no why line for this save'); continue; }
  for (const [w, h] of [[320, 640], [390, 844], [1280, 900]]) {
    const where = `${key}-${w}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
    try {
      await page.route(BLOCK, r => r.abort());
      await page.goto(`${BASE_URL}/robots.txt`);
      await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, saves[key]);
      await page.goto(`${BASE_URL}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await press(page, page.getByRole('button', { name: /^Essential only$/i }), 1500);
      await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 6000);
      await page.waitForTimeout(800);
      if (!(await press(page, page.getByRole('button', { name: /Board.*(behind|done|track)/i }), 8000))) { problem(where, 'no board button'); continue; }
      const why = page.locator('[data-cm-board-why]');
      if (!(await why.count())) { problem(where, 'no why line on the board panel'); continue; }
      await why.first().scrollIntoViewIfNeeded().catch(() => {});
      const m = await why.first().evaluate(el => { const r = el.getBoundingClientRect(); return { text: el.innerText, px: parseFloat(getComputedStyle(el).fontSize), left: r.left, right: r.right, sw: document.scrollingElement.scrollWidth, vw: window.innerWidth }; });
      say(`${where}: why "${m.text}" at ${m.px} px, box ${m.left.toFixed(0)} to ${m.right.toFixed(0)} of ${m.vw}`);
      seen += 1;
      if (m.text !== expectWhy[key]) problem(where, `the line reads "${m.text}", the engine says "${expectWhy[key]}"`);
      if (m.px < 12) problem(where, `the line is ${m.px} px`);
      if (m.left < 0 || m.right > m.vw + 1) problem(where, 'the line is cut by the viewport');
      if (m.sw > m.vw + 1) problem(where, `sideways scroll ${m.sw} > ${m.vw}`);
      const panel = page.locator('[data-cm-board-why]').first().locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
      await (await panel.count() ? panel.screenshot({ path: path.join(OUT, `${where}-board.jpg`), type: 'jpeg', quality: 70 }) : page.screenshot({ path: path.join(OUT, `${where}-board.jpg`), type: 'jpeg', quality: 70 })).catch(() => {});
      if (errors.length) problem(where, `page errors: ${errors.join(' | ')}`);
    } catch (e) { problem(where, `threw ${String(e).slice(0, 200)}`); } finally { await ctx.close(); }
  }
}
await browser.close();
if (seen === 0) problem('walk', 'no why line was ever measured');
say(`walkBoard: ${problems.length} problems, ${seen} lines measured`);
fs.writeFileSync(path.join(OUT, 'walkBoard.txt'), log.join('\n'));
console.log(`WALK BOARD DONE ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
