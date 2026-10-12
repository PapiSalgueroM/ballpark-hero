/* Round 1309 adversarial review (runs lens): a player's walk of the NFL front office's playoffs on a served build,
   never committed. 390 by 844 and 1280 by 900, reduced motion off and on. The database host is blocked.
   A: the morning of Week 17 for a strong club with a title mandate: Week 17's buttons, Watch Week 17, the bracket,
      a round a press (Watch your game whenever he plays), the hub in the bracket, the recap.
   T: the bracket three rounds on with his club in the title game (his own ratings), a title mandate: the title game
      WATCHED. Until full time nothing on the page may state the result (ruling 2f): the press card, the owner card. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { bundle } from '../../scripts/lib/gmGameDayFleet.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/review-walk';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'front-office-save-v1';
let fails = 0, checks = 0;
const say = (ok, what) => { checks += 1; console.log(`${ok ? '  PASS' : '  FAIL'}  ${what}`); if (!ok) fails += 1; };
const note = s => console.log(`  ....  ${s}`);

const { M: PO } = await bundle([
  "export { initLeague, simGame, REGULAR_WEEKS } from './src/lib/frontOffice.ts';",
  "export { NFL_POSTSEASON, nflPlayTie } from './src/lib/frontOfficePostseason.ts';",
  "export { openBracket, playBracketWeek, bracketPairings, bracketWeek } from './src/lib/gmBracket.ts';",
  "export { nflTell, nflWhere } from './src/lib/frontOfficeGameDay.ts';",
  "export { addToGmGameLog } from './src/lib/gmGameLog.ts';",
], [], 'review-run-walk');
const lehmer = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const MANDATE = season => ({ tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season });
const shapeOf = (league, myTeam, extra = {}) => JSON.stringify({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, mandate: MANDATE(league.season), trust: 60, ...extra });

function week17Save() {
  const rng = lehmer(1309);
  const league = PO.initLeague(rng);
  const team = Object.keys(league.teams)[0];
  for (const p of league.teams[team].players) p.ovr = 99;
  league.teams[team].defense = 99;
  let log = null;
  for (let w = 1; w < PO.REGULAR_WEEKS; w += 1) {
    const played = league.schedule[w - 1].map(g => PO.simGame(g, league.teams, rng));
    const mine = played.find(g => g.home === team || g.away === team);
    const t = mine ? PO.nflTell(mine, league.teams, league.season, PO.nflWhere(w)) : null;
    if (t && t.last) log = PO.addToGmGameLog(log, league.season, [t.last]);
    league.week += 1;
  }
  return shapeOf(league, team, log ? { gameLog: log } : {});
}
function titleGameSave() {
  for (let k = 1; k <= 12; k += 1) {
    const rng = lehmer(7);
    const league = PO.initLeague(rng);
    const played = [];
    for (let w = 1; w <= PO.REGULAR_WEEKS; w += 1) { played.push(league.schedule[w - 1].map(g => PO.simGame(g, league.teams, rng))); league.week += 1; }
    const seeds = PO.NFL_POSTSEASON.seeds(league);
    const format = PO.NFL_POSTSEASON.formatFor(league.season);
    const team = seeds[0];
    const club = league.teams[team];
    const own = { ovr: club.players.map(p => p.ovr), defense: club.defense };
    for (const p of club.players) p.ovr = 99;
    club.defense = 99;
    const told = [];
    const play = PO.nflPlayTie(league.teams, lehmer(k), league.season, undefined, told);
    let block = PO.openBracket(format, league.season, seeds);
    for (let w = 0; w < 3; w += 1) block = PO.playBracketWeek(format, block, play);
    club.players.forEach((p, i) => { p.ovr = own.ovr[i]; });
    club.defense = own.defense;
    const week = PO.bracketWeek(format, block);
    const final = week === null ? null : PO.bracketPairings(format, block, week);
    if (!final || !final.some(p => p.homeId === team || p.awayId === team)) continue;
    let log = null;
    for (let w = 1; w <= PO.REGULAR_WEEKS; w += 1) {
      const g = played[w - 1].find(x => x.home === team || x.away === team);
      const t = g ? PO.nflTell(g, league.teams, league.season, PO.nflWhere(w)) : null;
      if (t && t.last) log = PO.addToGmGameLog(log, league.season, [t.last]);
    }
    log = PO.addToGmGameLog(log, league.season, told.filter(g => g.home === team || g.away === team));
    return shapeOf(league, team, { playoffs: block, gameLog: log });
  }
  throw new Error('no stream put his club in the title game');
}
const FIX = { A: week17Save(), T: titleGameSave() };

const pageInfo = () => {
  const one = s => document.querySelector(s);
  const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) }; };
  const txt = s => (one(s)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    chip: txt('[data-week-chip]'), matchup: txt('[data-week-matchup]'),
    buttons: [...document.querySelectorAll('[data-press-row] button')].map(b => ({ text: (b.textContent ?? '').trim(), disabled: b.disabled, over: b.scrollWidth > b.clientWidth + 1, ...rect(b) })),
    face: one('[data-gameday-box]')?.getAttribute('data-box-face') ?? null, box: rect(one('[data-gameday-box]')),
    back: one('[data-bracket-back]') ? { disabled: one('[data-bracket-back]').disabled, ...rect(one('[data-bracket-back]')) } : null,
    row: rect(one('[data-bracket-row]')), clock: !!one('[data-match-clock]'), final: txt('[data-gameday-final]'), where: txt('[data-gameday-where]'),
    press: txt('[data-gm-press]'), pressRect: rect(one('[data-gm-press]')), owner: txt('[data-owner-mandate]'),
    recap: !!one('[data-verdict-reveal]'), place: txt('[data-bracket-place]'), bracket: !!one('[data-bracket]'),
    week18: /Week 18/.test(document.body.innerText), text: document.body.innerText,
    docW: document.documentElement.scrollWidth, vw: window.innerWidth, scrollY: Math.round(window.scrollY),
  };
};
const info = page => page.evaluate(pageInfo);
const saved = page => page.evaluate(k => localStorage.getItem(k), KEY);
const tag = (size, reduced) => `${size.w}${reduced ? '-rm' : ''}`;
const shot = async (page, size, reduced, name, full = false) => { await page.screenshot({ path: path.join(OUT, `rw-${tag(size, reduced)}-${name}.png`), fullPage: full }); };

async function newPage(browser, size, reduced, seed) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, ...(reduced ? { reducedMotion: 'reduce' } : {}) });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, seed);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}
async function loadSave(page, raw) {
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count() > 0) { await essential.first().click(); await page.waitForTimeout(300); }
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('button:has-text("This week")').click();
  await page.waitForSelector('[data-gameday-box] [data-bracket], [data-gameday-box] [data-gameday]', { timeout: 20000 });
  await page.waitForTimeout(500);
}
/* a pointer press at the button's centre (no scroll first, so any movement of the page is the board's) */
async function press(page, sel) {
  const r = await page.evaluate(s => { const b = document.querySelector(s); if (!b) return null; const x = b.getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2, vh: window.innerHeight }; }, sel);
  if (!r) throw new Error(`no button ${sel}`);
  if (r.y < 0 || r.y > r.vh) { note(`(${sel} was off the screen at ${Math.round(r.y)}; scrolled to it, as a player would)`); await page.locator(sel).scrollIntoViewIfNeeded(); return press(page, sel); }
  await page.mouse.click(r.x, r.y);
  await page.waitForTimeout(900);
}
const desc = p => `chip "${p.chip}", buttons [${p.buttons.map(b => `${b.text}${b.disabled ? ' (shut)' : ''} ${b.top}..${b.bottom}${b.over ? ' OVER' : ''}`).join(' | ')}], face ${p.face}, box ${p.box?.top}..${p.box?.bottom}, back ${p.back ? `${p.back.top}..${p.back.bottom}${p.back.disabled ? ' shut' : ''}` : 'none'}, scrollY ${p.scrollY}`;

/* CORRECTION 27 AT PHONE SIZES ON A REAL FRANCHISE'S PAGE. Every franchise started through the screen has a mandate,
   so the owner card sits above the week box. The builder's fixtures A, B and C carry none. Each case is walked twice,
   with the owner card and without it, and the first press of a visit is a Play press: his result and the next press. */
const seasonPlayed = (rng, weeks) => { const league = PO.initLeague(rng); for (let w = 1; w <= weeks; w += 1) { league.schedule[w - 1].forEach(g => PO.simGame(g, league.teams, rng)); league.week += 1; } return league; };
function bracketOpenSave() {
  const league = seasonPlayed(lehmer(1311), PO.REGULAR_WEEKS);
  const seeds = PO.NFL_POSTSEASON.seeds(league);
  return shapeOf(league, seeds[1], { playoffs: PO.openBracket(PO.NFL_POSTSEASON.formatFor(league.season), league.season, seeds) });
}
function divisionalLossSave() {
  const rng = lehmer(1310);
  const league = seasonPlayed(rng, PO.REGULAR_WEEKS);
  const seeds = PO.NFL_POSTSEASON.seeds(league);
  const format = PO.NFL_POSTSEASON.formatFor(league.season);
  const top = seeds[0];
  for (const p of league.teams[top].players) p.ovr = 99;
  league.teams[top].defense = 99;
  const told = [];
  const block = PO.playBracketWeek(format, PO.openBracket(format, league.season, seeds), PO.nflPlayTie(league.teams, rng, league.season, undefined, told));
  const tie = PO.bracketPairings(format, block, 2).find(p => p.homeId === top || p.awayId === top);
  const team = tie.homeId === top ? tie.awayId : tie.homeId;
  for (const p of league.teams[team].players) p.ovr = 40;
  league.teams[team].defense = 40;
  const log = PO.addToGmGameLog(null, league.season, told.filter(g => g.home === team || g.away === team));
  return shapeOf(league, team, { playoffs: block, ...(log ? { gameLog: log } : {}) });
}
const bare = raw => { const s = JSON.parse(raw); delete s.mandate; delete s.trust; return JSON.stringify(s); };
const CASES = [
  ['A Play Week 17', FIX.A, '[data-press="week"]'],
  ['A Watch Week 17', FIX.A, '[data-watch-week]'],
  ['C Play the Wild Card', bracketOpenSave(), '[data-press="round"]'],
  ['C Watch your game (WC)', bracketOpenSave(), '[data-watch-round]'],
  ['B Play the Divisional', divisionalLossSave(), '[data-press="round"]'],
];
const finalRect = () => { const el = document.querySelector('[data-gameday-final]'); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
const browser = await chromium.launch();
let crashed = null;
try {
  for (const size of [{ w: 390, h: 844 }, { w: 320, h: 640 }]) {
    for (const [name, raw, sel] of CASES) {
      for (const owner of [true, false]) {
        const { ctx, page } = await newPage(browser, size, false, 20261309);
        await loadSave(page, owner ? raw : bare(raw));
        const b = await info(page);
        await press(page, sel);
        if (sel.includes('watch')) { const r = page.locator('[data-gameday-speed="Results"]'); for (let k = 0; k < 20 && !(await r.count()); k += 1) await page.waitForTimeout(150); if (await r.count()) { const y0 = await page.evaluate(() => window.scrollY); await r.click(); await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y0); } await page.waitForTimeout(1500); }
        const p = await info(page);
        const f = await page.evaluate(finalRect);
        const next = p.buttons.find(x => !x.disabled) ?? p.buttons[0];
        const ok = !!f && f.top >= 0 && f.bottom <= size.h && !!next && next.top >= 0 && next.bottom <= size.h;
        const line = `${size.w}x${size.h} ${name}, owner card ${owner ? 'ON' : 'off'}: box top before ${b.box?.top}; after: scrollY ${p.scrollY}, his result ${f ? `${f.top}..${f.bottom}` : 'none'}, next press "${next?.text}" ${next?.top}..${next?.bottom}`;
        if (size.w === 390) say(ok, `${line}: both on the screen`); else note(line);
        await shot(page, size, false, `c27-${name.split(' ')[0]}${sel.includes('watch') ? 'w' : 'p'}-${owner ? 'owner' : 'bare'}`);
        await ctx.close();
      }
    }
  }
} catch (e) { crashed = e; } finally { await browser.close(); }
if (crashed) { console.log(`review walk 27: ABORTED after ${checks} checks: ${String(crashed.stack || crashed).slice(0, 600)}`); process.exit(2); }
console.log(`\nreview walk 27: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
