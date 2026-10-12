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

/* one watch, sampled until full time (or at once under reduced motion); every sample is held to: no press open, the
   press card and the owner card as before, and nothing of the final on the page */
async function watch(page, size, reduced, sel, name, before) {
  await press(page, sel);
  const raw = await saved(page);
  const s = JSON.parse(raw);
  const g = s.gameLog?.games?.at(-1);
  const bare = g ? `${s.myTeam} ${g.home === s.myTeam ? g.homeScore : g.awayScore}, ${g.home === s.myTeam ? g.away : g.home} ${g.home === s.myTeam ? g.awayScore : g.homeScore}` : '';
  const bad = new Set();
  let samples = 0, sawClock = false;
  const t0 = Date.now();
  for (;;) {
    const p = await info(page);
    if (!p.clock) break;
    sawClock = true;
    samples += 1;
    if (p.buttons.some(b => !b.disabled)) bad.add('a press is open');
    if (p.back && !p.back.disabled) bad.add('the back chip is open');
    if (p.press !== before.press) bad.add(`the press card changed to "${p.press.slice(0, 90)}"`);
    if (p.owner !== before.owner) bad.add(`the owner card changed to "${p.owner.slice(0, 70)}"`);
    if (p.recap) bad.add('the recap is drawn');
    if (bare && p.text.includes(bare)) bad.add(`the final "${bare}" is on the page`);
    if (samples === 1) { note(`${size.w}${reduced ? ' rm' : ''} ${name} watching: ${desc(p)}${p.pressRect ? `; press card at ${p.pressRect.top}..${p.pressRect.bottom}` : ''}`); await shot(page, size, reduced, `${name}-watching`); await shot(page, size, reduced, `${name}-watching-full`, true); }
    if (samples === 3) { const c = page.locator('[data-gameday-speed="3x"]'); if (await c.count()) await c.click(); }
    if (Date.now() - t0 > 60000) { bad.add('no full time in 60 s'); break; }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(900);
  if (reduced) say(!sawClock, `${size.w} rm ${name}: reduced motion shows the result with no clock (clock seen: ${sawClock})`);
  else say(bad.size === 0, `${size.w} ${name}: until full time nothing of the result on the page (${samples} samples, clock ${sawClock})${bad.size ? `: ${[...bad].join('; ')}` : ''}`);
  return { sawClock, bad: [...bad], raw };
}


async function passA(browser, size, reduced) {
  console.log(`\n=== A, ${size.w} by ${size.h}${reduced ? ', reduced motion' : ''} ===`);
  const { ctx, page, errors } = await newPage(browser, size, reduced, 20261309);
  await loadSave(page, FIX.A);
  const p0 = await info(page);
  note(`Week 17: ${desc(p0)}`);
  say(p0.buttons.map(b => b.text).join(' | ') === 'Play Week 17 | Watch Week 17 | Play the final week + playoffs', `${size.w}: Week 17's three buttons`);
  say(p0.buttons.every(b => b.h >= 44 && !b.over) && p0.docW <= p0.vw, `${size.w}: 44 px each, none overflowing, no sideways scroll (${p0.buttons.map(b => b.h).join(', ')}; page ${p0.docW} of ${p0.vw})`);
  await shot(page, size, reduced, 'A0-week17');
  await watch(page, size, reduced, '[data-watch-week]', 'A1-w17', { press: p0.press, owner: p0.owner });
  const p1 = await info(page);
  note(`after Week 17: ${desc(p1)}; where "${p1.where}" final "${p1.final}"`);
  say(p1.chip.includes('Playoffs') && !p1.week18 && p1.face === 'game' && !!p1.back && !p1.back.disabled, `${size.w}: after Watch Week 17, the chip reads Playoffs, no Week 18 anywhere, his game on the box, the back chip open`);
  await shot(page, size, reduced, 'A2-after-w17');
  await press(page, '[data-bracket-back]');
  await page.waitForSelector('[data-gameday-box] [data-bracket]', { timeout: 20000 });
  const p2 = await info(page);
  note(`the bracket: place "${p2.place}"; ${desc(p2)}`);
  await shot(page, size, reduced, 'A3-bracket');
  await page.locator('button:has-text("Hub")').first().click();
  await page.waitForTimeout(600);
  const hub = await page.evaluate(() => document.body.innerText);
  say(/Postseason/.test(hub) && !/0 weeks to play|with 0 to play|0 to play/.test(hub), `${size.w}: the hub in the bracket says Postseason and counts no weeks (regular season over: ${/regular season is over/i.test(hub)})`);
  await shot(page, size, reduced, 'A4-hub');
  await page.locator('button:has-text("This week")').click();
  await page.waitForTimeout(800);
  for (let i = 0; i < 5; i += 1) {
    const p = await info(page);
    if (p.recap) break;
    const mine = !!(await page.$('[data-watch-round]'));
    if (mine) await watch(page, size, reduced, '[data-watch-round]', `A5-r${i}`, { press: p.press, owner: p.owner });
    else await press(page, '[data-press="round"]');
    const q = await info(page);
    if (q.recap) { note(`round ${i + 1}: the recap`); break; }
    note(`round ${i + 1} (${mine ? 'watched his game' : 'played, no game of his'}): ${desc(q)}; where "${q.where}" final "${q.final}" place "${q.place}"`);
    say(q.docW <= q.vw && q.buttons.every(b => b.h >= 44 && !b.over), `${size.w}: round ${i + 1}: no sideways scroll, every press 44 px and none overflowing`);
    if (q.face === 'game' && q.box) note(`round ${i + 1}: box on screen ${q.box.top >= 0 && q.box.bottom <= size.h}, first press on screen ${!!q.buttons[0] && q.buttons[0].top >= 0}`);
    await shot(page, size, reduced, `A6-r${i + 1}-after`);
  }
  await page.waitForTimeout(1500);
  const pe = await info(page);
  say(pe.recap, `${size.w}: the run ends on the recap`);
  await shot(page, size, reduced, 'A9-recap');
  const real = errors.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED|NetworkError/i.test(e));
  say(real.length === 0, `${size.w}: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

async function passT(browser, size, reduced) {
  console.log(`\n=== T, the title game watched, ${size.w} by ${size.h}${reduced ? ', reduced motion' : ''} ===`);
  for (let seed = 11; seed < 19; seed += 1) {
    const { ctx, page, errors } = await newPage(browser, size, reduced, seed);
    await loadSave(page, FIX.T);
    const p0 = await info(page);
    if (!(await page.$('[data-watch-round]'))) { say(false, `${size.w}: no Watch your game on the title game (${desc(p0)})`); await ctx.close(); return; }
    note(`before the title game: ${desc(p0)}; press card "${p0.press.slice(0, 60)}"; owner "${p0.owner.slice(0, 60)}"`);
    await shot(page, size, reduced, 'T0-before');
    const r = await watch(page, size, reduced, '[data-watch-round]', 'T1-title', { press: p0.press, owner: p0.owner });
    if (!reduced && !r.sawClock) { note(`seed ${seed}: the title game had no clock, next stream`); await ctx.close(); continue; }
    await page.waitForTimeout(1500);
    const p1 = await info(page);
    const s = JSON.parse(r.raw);
    note(`after full time: recap ${p1.recap}; champion ${s.postseason?.champion}, his club ${s.myTeam}, trust ${s.trust}`);
    say(p1.recap, `${size.w}${reduced ? ' rm' : ''}: the recap comes after the title game`);
    await shot(page, size, reduced, 'T2-after');
    const real = errors.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED|NetworkError/i.test(e));
    say(real.length === 0, `${size.w}: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
    await ctx.close();
    return;
  }
  say(false, `${size.w}: no stream of eight gave a title game with a clock`);
}

let crashed = null;
const browser = await chromium.launch();
try {
  for (const size of [{ w: 390, h: 844 }, { w: 1280, h: 900 }]) {
    for (const reduced of [false, true]) {
      await passT(browser, size, reduced);
      await passA(browser, size, reduced);
    }
  }
} catch (e) { crashed = e; } finally { await browser.close(); }
if (crashed) { console.log(`review walk: ABORTED after ${checks} checks (${fails} failed): ${String(crashed.stack || crashed).slice(0, 600)}`); process.exit(2); }
console.log(`\nreview walk: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
