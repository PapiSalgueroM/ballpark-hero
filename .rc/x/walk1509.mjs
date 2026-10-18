/* Review of Round 1509 (the run lens): the followed Europa League walked as a player would, on a served build.
 * Saves made by the engine (scripts/lib/worldUclFleet.mjs), one by the BASE engine (main) to load as an old save.
 * Supabase and the ad hosts aborted. Screenshots and a findings file into $RC_OUT. Never committed. */
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
const cannot = why => { say(`walk: cannot run: ${why}`); fs.writeFileSync(path.join(OUT, 'walk.txt'), log.join('\n')); process.exit(2); };
const opts = { skipHalftime: true, noCoach: true };

const E = await engineOf(ROOT, 'rwalk', {}, cannot);
const B = await engineOf(ROOT, 'rbase', { base: process.env.WALK_BASE || '77556430' }, cannot);
async function play(Eng, club, era, seed, until, max = 400) {
  const M = await Eng.fresh();
  let s = tape(seed, () => (era ? M.cm.startCareer(club, era) : M.cm.startCareer(club))).value;
  let i = 0;
  while (!until(M, s) && s.week < s.calendar.length && i < max) {
    s = tape(seed + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state;
    i += 1;
  }
  return { M, s, i };
}
function items(M, s) {
  M.store.clear();
  if (!M.cm.saveCareer(s)) cannot('the engine refused to save');
  return [...M.store.entries()];
}
const uelDone = (M, s) => M.cm.worldCompNightsDone(s, 'uel');
const fmtDate = d => (d ? `${d.y ?? d.year}-${d.m ?? d.month}-${d.d ?? d.day}` : String(d));
const saves = {};

/* Liverpool, season one of today's world: 5th in the real 2025-26 table, so the game's rule gives it a league place. */
{
  const mid = await play(E, 'Liverpool', null, 11, (M, s) => uelDone(M, s) >= 6);
  const sl = mid.s.worldComps?.uel;
  say(`liv-mid: season ${mid.s.season} week ${mid.s.week}/${mid.s.calendar.length}, uel nights done ${uelDone(mid.M, mid.s)}, earned ${sl?.earned ?? 'none'}, in UCL ${!!mid.s.uclGroup}, follows UCL ${!!mid.s.worldComps?.ucl}`);
  if (sl) {
    const eng = sl.clubs.filter(c => { try { return mid.M.cm.leagueOf(c).id === 'premier'; } catch { return false; } });
    say(`liv-mid: English clubs in the Europa League: ${eng.map(c => `${c} (${sl.via[sl.clubs.indexOf(c)]})`).join(', ')}`);
    const dates = mid.M.cal.worldCompNightDates(mid.s, 'uel') ?? [];
    const ucl = mid.M.cal.worldCompNightDates(mid.s, 'ucl') ?? [];
    const dl = mid.M.cal.entryDatesOf(mid.s);
    const lastLeague = dl.filter((_, i) => mid.s.calendar[i].type === 'league').pop();
    say(`liv-mid: uel nights ${dates.length}: ${dates.map(fmtDate).join(' ')}`);
    say(`liv-mid: ucl nights ${ucl.length}, last ${fmtDate(ucl[ucl.length - 1])}; last league date ${fmtDate(lastLeague)}`);
  }
  saves.livMid = items(mid.M, mid.s);
  const ko = await play(E, 'Liverpool', null, 11, (M, s) => uelDone(M, s) >= 12);
  say(`liv-ko: week ${ko.s.week}, uel nights done ${uelDone(ko.M, ko.s)}`);
  saves.livKo = items(ko.M, ko.s);
  const end = await play(E, 'Liverpool', null, 11, () => false);
  say(`liv-end: week ${end.s.week}/${end.s.calendar.length}, uel winner ${end.M.cm.worldCompWinnerOf(end.s, 'uel')}, ucl winner ${end.M.cm.worldCompWinnerOf(end.s, 'ucl')}, cup winner ${end.M.cm.euroCupOf(end.s).winner}, euroPlaceOf ${end.M.cm.euroPlaceOf(end.s)}`);
  saves.livEnd = items(end.M, end.s);
  let s2 = tape(5000, () => end.M.cm.startNextSeason(end.s)).value;
  for (let k = 0; k < 3; k += 1) s2 = tape(5001 + k, () => end.M.cm.playNextEntry(s2, opts)).value.state;
  const u2 = s2.worldComps?.uel;
  const uelWinner = end.M.cm.worldCompWinnerOf(end.s, 'uel');
  const inUcl = new Set(end.M.cm.uclEntrantsOf(s2));
  say(`liv-s2: season ${s2.season}, uel ${u2 ? u2.clubs.length : 0} clubs, earned ${u2?.earned ?? 'none'}, last season's uel winner ${uelWinner} in this season's UCL ${inUcl.has(uelWinner)}, routes ${u2?.via}`);
  saves.livS2 = items(end.M, s2);
}

/* A club whose board asks for the Europa League and that wins its cup in season one, from outside the places. */
{
  const M0 = await E.fresh();
  const pool = ['premier', 'laliga', 'seriea', 'bundesliga', 'ligue1'].flatMap(id => (M0.cm.REAL_LEAGUES.find(l => l.id === id)?.clubs ?? []).slice(3, 12));
  let found = null; let tried = 0;
  const t0 = Date.now();
  for (const club of pool) {
    if (found || Date.now() - t0 > 240000) break;
    const M = await E.fresh();
    let s0;
    try { s0 = M.cm.startCareer(club); } catch { continue; }
    const rung = M.cm.objectiveStatuses(s0).find(o => M.cm.europeRungOf(o.objective) === 'uel');
    if (!rung) continue;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      tried += 1;
      const r = await play(E, club, null, seed * 101, (Mm, s) => !!s.cupBracket?.find(t => t.round === 'F')?.winner);
      const w = r.s.cupBracket?.find(t => t.round === 'F')?.winner;
      if (w !== club) continue;
      const pos = r.M.cm.sortedLeagueTable(r.s).findIndex(x => x.club === club) + 1;
      const st = r.M.cm.objectiveStatuses(r.s).find(o => r.M.cm.europeRungOf(o.objective) === 'uel');
      say(`cupwin: ${club} seed ${seed * 101} won its cup at week ${r.s.week}, table ${pos}, rung "${st?.objective.label}" target ${st?.objective.target} status ${st?.status}, euroPlaceOf ${r.M.cm.euroPlaceOf(r.s)} route ${r.M.cm.euroPlaceRouteOf(r.s)}`);
      if (pos <= (st?.objective.target ?? 0)) continue;
      saves.cupMid = items(r.M, r.s);
      let s = r.s; let i = r.i;
      while (s.week < s.calendar.length && i < 400) { s = tape(seed * 101 + 1 + i, () => r.M.cm.playNextEntry(s, opts)).value.state; i += 1; }
      const pe = r.M.cm.sortedLeagueTable(s).findIndex(x => x.club === club) + 1;
      const se = r.M.cm.objectiveStatuses(s).find(o => r.M.cm.europeRungOf(o.objective) === 'uel');
      say(`cupwin-end: ${club} finished ${pe}, rung status ${se?.status}, euroPlaceOf ${r.M.cm.euroPlaceOf(s)} route ${r.M.cm.euroPlaceRouteOf(s)}`);
      saves.cupEnd = items(r.M, s);
      found = club; break;
    }
  }
  say(`cupwin: searched ${tried} seasons in ${((Date.now() - t0) / 1000).toFixed(0)} s, found ${found ?? 'none'}`);
}

/* Real Madrid in the Champions League; Chelsea saved by MAIN's engine (an old save); Villarreal in 2005. */
{
  const rm = await play(E, 'Real Madrid', null, 21, (M, s) => uelDone(M, s) >= 3);
  say(`rm: in UCL ${!!rm.s.uclGroup}, uel ${rm.s.worldComps?.uel ? 'followed' : 'none'}, uel nights done ${uelDone(rm.M, rm.s)}`);
  saves.rm = items(rm.M, rm.s);
  const old = await play(B, 'Chelsea', null, 31, (M, s) => s.week >= 14);
  say(`old: main's Chelsea save at week ${old.s.week}, worldComps keys ${Object.keys(old.s.worldComps ?? {}).join(',') || 'none'}`);
  saves.old = items(old.M, old.s);
  const T = await E.fresh();
  for (const [k, v] of saves.old) T.store.set(k, v);
  const lt = T.cm.loadCareer();
  say(`old: loaded on the head: uel ${lt?.worldComps?.uel ? `${lt.worldComps.uel.clubs.length} clubs, nights done ${T.cm.worldCompNightsDone(lt, 'uel')}` : 'none'}`);
  const era = await play(E, 'Villarreal', 'era2005', 41, (M, s) => s.week >= 10);
  say(`era: worldComps keys ${Object.keys(era.s.worldComps ?? {}).join(',') || 'none'}, in UCL ${!!era.s.uclGroup}`);
  saves.era = items(era.M, era.s);
}

/* ---------- the page ---------- */
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const browser = await chromium.launch();
const problems = [];
const problem = (where, what) => { problems.push(`${where}: ${what}`); say(`PROBLEM ${where}: ${what}`); };
async function press(page, loc, ms = 4000) {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); await loc.first().evaluate(el => el.click()); await page.waitForTimeout(500); return true; } catch { return false; }
}
async function open(save, [w, h], reduced) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(BLOCK, r => r.abort());
  await page.goto(`${BASE_URL}/robots.txt`);
  await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, save);
  await page.goto(`${BASE_URL}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await press(page, page.getByRole('button', { name: /^Essential only$/i }), 1500);
  await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 6000);
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}
/* JPEG, and a panel shot of the Cups panel alone (a full page at 390 is 22,000 px of guide text, and the first run
   dropped every file past 25 MB). */
const shot = async (page, name, full = false) => {
  const file = path.join(OUT, `${name}.jpg`);
  const panel = page.locator('[data-cm-cups-view]').first();
  if (full && (await panel.count())) return panel.screenshot({ path: file, type: 'jpeg', quality: 60 }).catch(() => {});
  return page.screenshot({ path: file, type: 'jpeg', quality: 60 }).catch(() => {});
};
const shotTop = async (page, name, h = 1700) => {
  const vw = page.viewportSize().width;
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  return page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 60, fullPage: true, clip: { x: 0, y: 0, width: vw, height: Math.min(h, total) } }).catch(() => {});
};
const text = async (page, sel) => (((await page.locator(sel).first().innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim());
async function sideways(page, where) {
  const m = await page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, vw: window.innerWidth, anim: document.getAnimations().length }));
  if (m.sw > m.vw + 1) problem(where, `sideways scroll ${m.sw} > ${m.vw}`);
  return m;
}
async function toCups(page, where) {
  const ok = await press(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000);
  const tiles = ok && await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (!tiles) { problem(where, `no Cups panel (page: ${(await text(page, '#root')).slice(0, 200)})`); await shot(page, `fail-${where}`); }
  return tiles;
}
async function walkUel(page, tag, deep) {
  const tiles = await page.locator('[data-cm-world-tile]').evaluateAll(els => els.map(e => `${e.getAttribute('data-cm-world-tile')}: ${e.innerText.replace(/\s+/g, ' ')}`));
  say(`${tag} tiles: ${tiles.join(' | ')}`);
  await shot(page, `${tag}-tiles`);
  await sideways(page, `${tag} tiles`);
  if (!(await page.locator('[data-cm-world-tile="uel"]').count())) return;
  const before = await page.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
  await press(page, page.locator('[data-cm-world-tile="uel"]'));
  say(`${tag} screen: ${(await text(page, '[data-cm-cups-view="uel"]')).slice(0, 700)}`);
  await shot(page, `${tag}-screen`, true);
  const m = await sideways(page, `${tag} screen`);
  say(`${tag} animations on the screen: ${m.anim}`);
  if (deep) {
    for (const t of ['table', 'matchdays', 'knockouts', 'final']) {
      if (!(await press(page, page.locator(`[data-cm-world-tile="${t}"]`)))) { problem(tag, `no ${t} tile`); continue; }
      await page.waitForTimeout(400);
      say(`${tag} ${t}: ${(await text(page, '[data-cm-cups-view="uel"]')).slice(0, 600)}`);
      await shot(page, `${tag}-${t}`, true);
      await sideways(page, `${tag} ${t}`);
      if (t === 'matchdays' || t === 'knockouts') {
        const club = page.locator('[data-cm-world-club]');
        if (await club.count()) {
          await press(page, club);
          say(`${tag} ${t} run: ${(await text(page, '[data-cm-cups-view="uel"]')).slice(0, 500)}`);
          await shot(page, `${tag}-${t}-run`, true);
          await press(page, page.locator('[data-cm-world-back]'));
        }
      }
      await press(page, page.locator('[data-cm-world-back]'));
    }
    await press(page, page.locator('[data-cm-world-help-toggle]'));
    await shot(page, `${tag}-help`, true);
    await press(page, page.locator('[data-cm-world-help-toggle]'));
  }
  await press(page, page.locator('[data-cm-world-back]'));
  const after = await page.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
  if (before.y !== after.y || before.h !== after.h) problem(tag, `the page moved: scrollY ${before.y} to ${after.y}, height ${before.h} to ${after.h}`);
}
const CASES = [
  ['livMid', true, 2], ['livKo', true, 1], ['livEnd', true, 2], ['livS2', true, 1], ['cupMid', false, 1], ['cupEnd', false, 2], ['rm', false, 1], ['old', true, 1], ['era', false, 1],
];
for (const [key, deep, nSizes] of CASES) {
  if (!saves[key]) { say(`${key}: no save`); continue; }
  for (const [size, reduced, tag] of [[[390, 844], false, '390'], [[1280, 900], true, '1280']].slice(0, nSizes)) {
    const where = `${key}-${tag}`;
    const { ctx, page, errors } = await open(saves[key], size, reduced);
    try {
      await shot(page, `${where}-hub`);
      if (key.startsWith('cup') && (await press(page, page.getByRole('button', { name: /Board.*(behind|done)/i }), 8000))) {
        const t = await text(page, '#root');
        say(`${where} board: ${t.slice(Math.max(0, t.indexOf('Club home') - 50), Math.max(0, t.indexOf('Club home')) + 900)}`);
        await shotTop(page, `${where}-board`);
        await press(page, page.getByRole('button', { name: /back|hub/i }));
        await page.goto(`${BASE_URL}/club-manager`); await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 6000);
      }
      if (await toCups(page, where)) await walkUel(page, where, deep);
      if (errors.length) problem(where, `page errors: ${errors.join(' | ')}`);
    } catch (e) { problem(where, `threw ${String(e).slice(0, 200)}`); } finally { await ctx.close(); }
  }
}
await browser.close();
say(`walk: ${problems.length} problems`);
fs.writeFileSync(path.join(OUT, 'walk.txt'), log.join('\n'));
console.log(`WALK DONE ${problems.length} problems`);
