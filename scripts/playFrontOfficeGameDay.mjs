/**
 * Round 1307 browser harness: the NFL front office's Game Day tile and Watch,
 * in a real Chromium on a served build, at 320 by 640, 390 by 844 and 1280
 * by 800.
 *
 * The unit tests hold what the tile SAYS (src/lib/gmGameDayView.test.ts) and
 * what the board saves and hides (FrontOfficeTile.test.tsx). Only a browser
 * can say where things ARE, and that is this file: the tile after a press,
 * a watch in progress, full time, Results, reduced motion, a reload in the
 * middle of a watch, the "?", an older save.
 *
 * A franchise is started through the screen (the first club), so every save
 * the walk reads is one the board itself wrote. Math.random is seeded in the
 * page so two runs walk the same season. The database host is blocked.
 *
 * WHAT IT ASKS, at every size unless a line says otherwise:
 *   1 the week box holds the tile's box, of the height its breakpoint has
 *     (400 under 768 wide, 352 from there), before the card's chunk lands
 *     and after; the chunk that draws the card is asked for only when the
 *     box is opened (no script loaded before holds the tile's marker);
 *   2 Play: the tile shows the saved final of his game, the line score adds
 *     up to it, sixteen scores sit under it, the box did not change size,
 *     and THE PAGE DID NOT TAKE THE TILE OUT OF VIEW: window.scrollY either
 *     side of the press is printed and the tile's top is inside the screen
 *     with at least 160 px of it showing (the reveal hook's own measure);
 *   3 Watch: sampled every 200 ms until full time, THE WHOLE PAGE holds
 *     nothing of the result: the week, his record and the matchup read as
 *     before the press, Play and Watch are shut, no league grid, no result
 *     face, no text anywhere with the final or his new record, and the score
 *     bug only ever climbs to the final. THE OWNER CARD is read whole and is
 *     the card of before the press (its pace line prints his wins). At full
 *     time the page moves on, the save is the very string the press wrote,
 *     and the owner's pace and the standing line are the SAVED league's, by
 *     the engine's own seeding and the owner's own pace (bundled here from
 *     source; the sentences are written out in this file). FULL TIME IS A
 *     REVEAL: in the middle of this watch the page is scrolled to its top,
 *     so the tile is out of view, and at full time it is back in view;
 *   4 Results is the sim to the end; a reload in the middle of a watch shows
 *     the result with no clock and the save is the string the press wrote;
 *   5 reduced motion: Watch shows the result with no clock at any sample;
 *   6 the "?" is drawn over the whole week box and not inside the tile, holds
 *     the law's words, closes and opens again (the page's scrollY either side
 *     of opening it is held equal when the box's top was already readable:
 *     the Season Center's sheet takes the focus, a browser brings a focused
 *     sheet into view by scrolling, and the card puts the page back);
 *   7 a chip opens its game on the same box; a save with no log shows the
 *     next game and plays on;
 *   8 ON EVERY FACE nothing in the tile's box but the named scrollers (the
 *     story, the clock's own feed) is taller than its frame, nothing but the
 *     chip row is wider, nothing leaves the box, no text is under 12 px, and
 *     every button of the week box is at least 44 px high;
 *   9 (390) THE OWNER CARD'S PACE, on a save that makes the case: the ask is
 *     made a number of wins, and weeks are watched (each held to point 3's
 *     own list) until the pace line has moved at full time, so what was held
 *     back was the result and not a line compared with itself;
 *  10 (390) HIS SEED, on a save that makes the case: the save is handed to
 *     the board for the club that tops the AFC, three weeks are played, and
 *     after each the standing line is his seed in the saved league, counted
 *     from 1. At least one of the three must find him holding a seed.
 * ROUND 1309, THE PLAYOFFS ON THE BOX, on saves made here from the engine's
 * own source (A: the morning of Week 17 for a club strong enough to top its
 * conference; B: the bracket after the Wild Card round, his club drawn
 * against an unbeatable top seed; C: the bracket open, an ordinary league,
 * the AFC's second seed):
 *  11 Week 17 has "Play Week 17", "Watch Week 17" and the old button, in that
 *     order, each at least 44 px high, none overflowing, no sideways scroll;
 *  12 "Play Week 17" opens the bracket (week 18, the bracket on the save, the
 *     chip reads Playoffs, no "Week 18" anywhere) and the box shows his Week
 *     17 game with the back chip under it and no league grid. THE REVEAL
 *     (the ruling of Round 1307's review, met through the box's bottom edge
 *     aligned to the end: see the board): from sm up, after the first press
 *     of a visit (a week, then a playoff round), the first button's top is
 *     on the screen and so is the whole box, at 1280 by 800 and 1280 by 900,
 *     and (the fix pass) the back chip under the box when his game is on it;
 *     under sm the numbers are printed, except the back chip (above the box
 *     under sm since the closing check), asserted on the screen at 390 by
 *     844. At 1280 a window resized across sm and back scrolls nothing;
 *  13 a desk off save refuses a trade in the bracket with the playoffs' line;
 *  14 the title run (A): the bracket says he has the bye, a round a press,
 *     his game on the box each time he plays and the bracket when he does
 *     not, the box never moving under its row, then the recap with his title;
 *     his exit (B): "Out in the AFC Divisional." (or the NFC's), "Sim the
 *     rest" reaches the recap; a watched playoff game (C): until full time
 *     nothing of the result anywhere on the page, every press and the back
 *     chip shut, the bracket not drawn, then his final and the page moved on
 *     and nothing saved by the watch. At 390 by 844 after every press he
 *     plays, his result and the next press button are both on the screen;
 *     at 320 by 640 the numbers are printed (the brief's ruling b);
 *  15 a reload in the middle of the bracket shows the same bracket and plays
 *     nothing;
 *  16 the old button on Week 17 goes straight to the recap;
 *  17 the bracket's "?" opens, closes, opens again and closes;
 *  18 (the fix pass) the title game watched (D: his club in the final, a
 *     title mandate, trust 60): its press closes the season, so until full
 *     time the press card and the owner card read as before the press, no
 *     answer of the card is open and no recap is drawn; at full time the
 *     recap comes with the room the result called (the podium or the scrum).
 *  19 (the closing check) "Watch Week 17" on E (A with a title mandate and
 *     trust 60, the review's own save: the owner card a line taller, so the
 *     feed box the press writes above the week box leaves less than the
 *     hook's 160 px of the box readable at 390 and the reveal fires; the
 *     page's generator seeded per stream, the review's seed first, and the
 *     first stream whose press MOVED the page is read, red at 390 if none
 *     did): at full time his result, the next press and the back chip are
 *     on the screen;
 *     then the back chip and his bye round: the next press and the box's top
 *     on the screen. Asserted at 390 by 844 (ruling 2b), printed at 320 by
 *     640 and at 1280 (point 12 holds the reveal from sm up). Its proof is
 *     the board before the closing check built and walked: red at 19.
 * Then a landscape phone, 844 by 390 (from sm up by its width), PRINTED
 * only for the lead: the first press of a visit on a regular week, on Week
 * 17 and on a playoff round, with where the buttons, the box and the chip sit.
 * Point 8 covers the bracket's faces too (its tie list and week chips are
 * the face's named scrollers).
 *
 * NEGATIVE CONTROLS (FO_GAMEDAY_WALK_CONTROL=). Each plants ONE thing in the
 * page, in the 390 walk, and names the point that must go red. A control run
 * exits 1 and its LAST LINE says "RED AT THE NAMED CHECK" (fired) or "DID NOT
 * FIRE"; a walk that could not run exits 2.
 *   recordspoils  his new record written into the Record chip during a watch   point 3
 *   spoiler       the final written into the week box during a watch           point 3
 *   tall          a 300 px block put in the tile outside its scroller          point 8
 *   noreveal      nothing in the page can scroll an element into view once he
 *                 has scrolled away in the middle of the watch (what a reveal
 *                 key without the watch state leaves him with)                 point 3
 *   helpjump      the page left 150 px lower with the "?" open (a browser's
 *                 scroll to the focused sheet, with nothing to put it back)    point 6
 *   pacespoils    the pace line of the league after the press written into
 *                 the owner card during a watch                                point 9
 *   seedoff       the standing line printed with his seed as an index          point 10
 *   bracketjump   (Round 1309) a spacer put above the box after a round press  point 14
 *   playoffspoil  (Round 1309) his final written into the week box while a
 *                 playoff game is watched                                      point 14
 *   lostblock     (Round 1309) the bracket taken off the save before point
 *                 15's reload (the save error screen comes up)                 point 15
 *   revealdown    (Round 1309) a BOARD MUTATION, not a plant: the request
 *                 line puts the reveal's ref back on the box from sm up and
 *                 builds again; the walk only names the point                  point 12
 *   titlespoil    (the fix pass) the room's verdict written into the owner
 *                 card while the title game is watched                         point 18
 * (The hold itself removed from the board is a control of the unit test:
 * node scripts/controlFrontOfficeBoard.mjs recordspoils; pacespoils and
 * seedoff there mutate the board itself.)
 *
 * Pictures: with RC_OUT (a runner) or FO_GAMEDAY_SHOTS set, one png a point a
 * size is written there (gd-<width>-<point>.png).
 *
 * Run: a served build (scripts/lib/hostLikeServer.mjs) on BASE, then
 *      ENGINES=chromium node scripts/playFrontOfficeGameDay.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { bundle } from './lib/gmGameDayFleet.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.FO_GAMEDAY_WALK_CONTROL || '';
const CONTROLS = { recordspoils: 3, spoiler: 3, tall: 8, noreveal: 3, helpjump: 6, pacespoils: 9, seedoff: 10, revealdown: 12, bracketjump: 14, playoffspoil: 14, lostblock: 15, titlespoil: 18 };
/* the controls planted in the 390 walk itself; pacespoils and seedoff are planted in the pass after it */
const WALK_PLANTS = ['recordspoils', 'spoiler', 'tall', 'noreveal', 'helpjump'];
/* Round 1309: the controls planted in the 390 playoffs walk (revealdown is a board mutation: the walk only names its point) */
const PLAYOFF_PLANTS = ['bracketjump', 'playoffspoil', 'lostblock', 'titlespoil'];
if (CONTROL && !Object.prototype.hasOwnProperty.call(CONTROLS, CONTROL)) { console.error(`playFrontOfficeGameDay: unknown control "${CONTROL}". Known: ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
const OUT = process.env.RC_OUT || process.env.FO_GAMEDAY_SHOTS || '';
const SAVE_KEY = 'front-office-save-v1';
const SIZES = [{ w: 320, h: 640 }, { w: 390, h: 844 }, { w: 1280, h: 800 }];
const MIN_LEAD = 160;

let failures = 0;
let checks = 0;
const redPoints = new Set();
const say = (point, ok, what) => {
  checks += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  [${point}] ${what}`);
  if (!ok) { failures += 1; redPoints.add(point); }
};
const note = what => console.log(`  ....  ${what}`);

/* ---- the engine's own seeding and the owner's own pace, so the page is compared with the SAVE and not with itself.
   Bundled from the source the build was made from (the same bundler the Game Day harness uses); the sentences are
   written out here and not taken from the lib that prints them. ---- */
const { M: ENGINE } = await bundle([
  "export { conferenceSeeds, conferenceOf, REGULAR_WEEKS } from './src/lib/frontOffice.ts';",
  "export { mandatePace } from './src/lib/foOwnerMandate.ts';",
], [], 'fo-gameday-walk');
const NTH = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
/** Where the saved league seeds his club: `k` is his index in the seven (-1: outside), `line` the tile's sentence for it. */
const standingOf = raw => {
  const s = JSON.parse(raw);
  const conf = ENGINE.conferenceOf(s.myTeam);
  const seeds = ENGINE.conferenceSeeds(s.league.teams, conf);
  const k = seeds.indexOf(s.myTeam);
  return { k, conf, n: seeds.length, top: seeds[0], line: k >= 0 ? `${conf}: ${NTH[k]} seed of ${seeds.length} as it stands.` : `${conf}: outside the ${seeds.length} seeds as it stands.` };
};
/** The owner card's pace line for a save, as the board works it out from the saved league; null: none is drawn. */
const paceOf = raw => {
  const s = JSON.parse(raw);
  if (!s.mandate || !(s.league.week > 1 && s.league.week <= ENGINE.REGULAR_WEEKS)) return null;
  const inCut = ENGINE.conferenceSeeds(s.league.teams, ENGINE.conferenceOf(s.myTeam)).includes(s.myTeam);
  return ENGINE.mandatePace(s.mandate, s.league.teams[s.myTeam].wins, (s.league.week - 1) / ENGINE.REGULAR_WEEKS, inCut).line;
};
let seededReadings = 0;

/* ---- what the page is asked, in the page ---- */
const stateOf = () => {
  const one = sel => document.querySelector(sel);
  const txt = sel => (one(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const box = one('[data-gameday-box]');
  const r = box ? box.getBoundingClientRect() : null;
  const btn = label => [...document.querySelectorAll('[data-week-box] button')].find(b => (b.textContent ?? '').trim().startsWith(label));
  const play = btn('Play'), watch = btn('Watch Week');
  const gridRow = one('div.grid.max-h-56 > div');
  const scroller = one('[data-gameday-scroll]');
  return {
    scrollY: Math.round(window.scrollY), vh: window.innerHeight, vw: window.innerWidth, docW: document.documentElement.scrollWidth,
    box: r ? { top: Math.round(r.top), pageTop: Math.round(r.top + window.scrollY), height: Math.round(r.height), width: Math.round(r.width) } : null,
    face: one('[data-gameday]')?.getAttribute('data-gameday-face') ?? null,
    week: txt('[data-week-chip]'), record: txt('[data-record-chip]'), matchup: txt('[data-week-matchup]'), owner: txt('[data-owner-mandate]'),
    play: play ? { text: (play.textContent ?? '').trim(), disabled: play.disabled, top: Math.round(play.getBoundingClientRect().top) } : null,
    watch: watch ? { text: (watch.textContent ?? '').trim(), disabled: watch.disabled } : null,
    grid: document.querySelectorAll('div.grid.max-h-56 > div').length,
    gridTop: gridRow ? Math.round(gridRow.getBoundingClientRect().top) : null,
    final: txt('[data-gameday-final]'), where: txt('[data-gameday-where]'), standing: txt('[data-gameday-standing]'),
    lineUs: [...document.querySelectorAll('[data-line-row="us"] td')].slice(1).map(td => Number(td.textContent)),
    lineThem: [...document.querySelectorAll('[data-line-row="them"] td')].slice(1).map(td => Number(td.textContent)),
    chips: [...document.querySelectorAll('[data-gameday-chip]')].map(c => c.getAttribute('data-gameday-chip')),
    clock: !!one('[data-match-clock]'), bug: txt('[data-score-bug]'), fullTime: !!one('[data-full-time]'),
    scroller: scroller ? { content: scroller.scrollHeight, frame: scroller.clientHeight } : null,
    help: !!one('[data-season-help]'),
    weekTop: one('[data-week-box]') ? Math.round(one('[data-week-box]').getBoundingClientRect().top) : null,
    text: document.body.innerText,
  };
};
const saveOf = key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const s = JSON.parse(raw);
  const games = s.gameLog && Array.isArray(s.gameLog.games) ? s.gameLog.games : [];
  const last = games.length ? games[games.length - 1] : null;
  const t = s.league.teams[s.myTeam];
  return { raw, my: s.myTeam, week: s.league.week, record: `${t.wins}-${t.losses}`, n: games.length, last };
};
/* point 8: everything in the tile's box, on whatever face is up */
const fitOf = () => {
  const box = document.querySelector('[data-gameday-box]');
  if (!box) return { bad: ['there is no tile box'], seen: 0, small: [] };
  const b = box.getBoundingClientRect();
  /* Round 1309: and the bracket face's two (its list of ties, and its week chips sideways) */
  const SCROLLS = '[data-gameday-scroll], [data-clock-events], [data-bracket-scroll]';
  const bad = [], small = [];
  let seen = 0;
  const nameOf = el => `${el.tagName.toLowerCase()}${[...el.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}]`).join('')}.${String(el.className).split(' ').slice(0, 3).join('.')}`;
  for (const el of [box, ...box.querySelectorAll('*')]) {
    if (el.closest('.sr-only') || el.closest('[data-season-help]')) continue;
    seen += 1;
    if (el.clientHeight > 0 && !el.matches(SCROLLS) && el.scrollHeight > el.clientHeight + 1) bad.push(`${nameOf(el)} is ${el.scrollHeight} tall in a frame of ${el.clientHeight}`);
    if (el.clientWidth > 0 && !el.matches('[data-gameday-chips], [data-bracket-weeks]') && el.scrollWidth > el.clientWidth + 1) bad.push(`${nameOf(el)} is ${el.scrollWidth} wide in a frame of ${el.clientWidth}`);
    const inner = el.parentElement ? el.parentElement.closest(`${SCROLLS}, [data-gameday-chips], [data-bracket-weeks]`) : null;
    if (!inner) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.right > b.right + 1 || r.left < b.left - 1 || r.bottom > b.bottom + 1 || r.top < b.top - 1)) bad.push(`${nameOf(el)} leaves the box`);
    }
    const own = [...el.childNodes].some(n => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
    if (own && parseFloat(getComputedStyle(el).fontSize) < 12) small.push(`${nameOf(el)} is ${getComputedStyle(el).fontSize}`);
  }
  const buttons = [...document.querySelectorAll('[data-week-box] button')].filter(x => !x.closest('[data-season-help]'));
  const low = buttons.filter(x => x.getBoundingClientRect().height < 43.5).map(x => `"${(x.textContent ?? '').trim()}" is ${Math.round(x.getBoundingClientRect().height)} px high`);
  const story = document.querySelector('[data-gameday-scroll]');
  return { bad, small, low, seen, buttons: buttons.length, story: story && story.children.length > 0 ? { content: story.scrollHeight, frame: story.clientHeight } : null };
};

/* ---- the walk's own helpers ---- */
const finals = sv => {
  const g = sv.last;
  const home = g.home === sv.my;
  const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore, opp = home ? g.away : g.home;
  return { tile: `${g.winner === sv.my ? 'W' : 'L'}${sv.my} ${us}, ${opp} ${them}`, bare: `${sv.my} ${us}, ${opp} ${them}`, us, them, home: g.homeScore, away: g.awayScore };
};
const sum = xs => xs.reduce((a, b) => a + b, 0);
const shot = async (page, size, name) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, `gd-${size.w}-${name}.png`) }); } };
const inView = st => Math.min(st.box.top + st.box.height, st.vh) - Math.max(st.box.top, 0);
const state = page => page.evaluate(stateOf);
const saved = page => page.evaluate(saveOf, SAVE_KEY);
const realErrors = errors => errors.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED|NetworkError/i.test(e));
async function fit(page, size, face) {
  const f = await page.evaluate(fitOf);
  say(8, f.bad.length === 0 && f.seen >= 5, `${size.w}, ${face}: nothing in the tile's box is taller or wider than its frame or leaves the box (${f.seen} elements read)${f.bad.length ? `: ${f.bad.slice(0, 3).join('; ')}` : ''}`);
  if (f.story) say(8, f.story.frame >= 48, `${size.w}, ${face}: the story has room to be read (${f.story.content} px of it in a frame of ${f.story.frame})`);
  say(8, f.small.length === 0, `${size.w}, ${face}: no text in the tile is under 12 px${f.small.length ? `: ${f.small.slice(0, 3).join('; ')}` : ''}`);
  say(8, f.low.length === 0 && f.buttons >= 1, `${size.w}, ${face}: every button of the week box is at least 44 px high (${f.buttons} buttons)${f.low.length ? `: ${f.low.slice(0, 4).join('; ')}` : ''}`);
}
async function openWeek(page) {
  await page.locator('button:has-text("This week")').click();
  await page.waitForSelector('[data-gameday]', { timeout: 20000 });
  await page.waitForTimeout(500);
}
async function newPage(browser, size, reduced = false, seed = 20261307) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, ...(reduced ? { reducedMotion: 'reduce' } : {}) });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, seed);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}
async function startFranchise(page) {
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  /* the consent banner is pinned over the bottom of a phone: answered the private way, as a visitor who has been here before */
  await answerConsent(page); await page.waitForTimeout(300);
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
}

/** One watched week, sampled until full time. `speed`: the chip pressed after `after` samples (null: let the clock run).
 *  `away`: in the middle of the watch the page is scrolled to its top, so the tile is out of view when full time comes. */
async function watchWeek(page, size, point, { after = 0, speed = null, plant = '', label, away = false }) {
  const b = await state(page);
  const svB = await saved(page);
  await page.locator('[data-watch-week]').click();
  const svP = await saved(page);
  const f = finals(svP);
  const forbidden = [['the final', f.bare], ['his new record', `Record ${svP.record}`], ['the next week', `Week ${svP.week}/17`], ['the next Play label', `Play Week ${svP.week}`]];
  const spoiled = [];
  let samples = 0, bug = [0, 0], awayAt = null;
  const t0 = Date.now();
  for (;;) {
    const st = await state(page);
    if (st.face === 'result') break;
    if (Date.now() - t0 > 45000) { spoiled.push('the watch did not reach full time in 45 s'); break; }
    if (st.face === 'watch') {
      samples += 1;
      if (st.week !== b.week) spoiled.push(`the week chip reads "${st.week}"`);
      if (st.record !== b.record) spoiled.push(`the record chip reads "${st.record}"`);
      if (st.matchup !== b.matchup) spoiled.push(`the matchup reads "${st.matchup}"`);
      /* the owner card whole: its pace line prints his wins, so read from the league after the press it is the result */
      if (st.owner !== b.owner) spoiled.push(`the owner card reads "${st.owner.slice(-70)}" and read "${b.owner.slice(-70)}" before the press`);
      if (!st.play || !st.play.disabled || st.play.text !== b.play.text) spoiled.push('Play is open or reads another week');
      if (!st.watch || !st.watch.disabled) spoiled.push('Watch is open');
      if (st.grid !== 0) spoiled.push('the league grid is drawn');
      if (st.final !== '' || st.standing !== '' || st.chips.length > 0) spoiled.push('a part of the result face is in the page');
      for (const [what, str] of forbidden) if (st.text.includes(str)) spoiled.push(`the page holds ${what} ("${str}")`);
      const [h, a] = st.bug.split('-').map(Number);
      if (!(h >= bug[0] && a >= bug[1] && h <= f.home && a <= f.away)) spoiled.push(`the score bug read ${st.bug} after ${bug.join('-')} in a game that ends ${f.home}-${f.away}`);
      bug = [h, a];
      if (samples === 1) {
        if (st.bug !== '0-0') spoiled.push(`the first reading of the score bug was ${st.bug}`);
        await fit(page, size, `${label}, the clock running`);
        await shot(page, size, `${label}-watching`);
        /* the record is written into the text nodes React itself owns, so the page still moves on at full time */
        if (plant === 'recordspoils') await page.evaluate(rec => { const kids = [...document.querySelector('[data-record-chip] b').childNodes].filter(n => n.nodeType === 3); const [w, l] = rec.split('-'); kids[0].nodeValue = w; kids[kids.length - 1].nodeValue = l; }, svP.record);
        if (plant === 'spoiler') await page.evaluate(str => { const p = document.createElement('p'); p.setAttribute('data-planted', ''); p.textContent = str; document.querySelector('[data-week-box]').appendChild(p); }, f.bare);
        /* the pace line of the league AFTER the press, written into the text node React owns (what the board did before Watch held it) */
        if (plant === 'pacespoils') await page.evaluate(line => { const p = [...document.querySelectorAll('[data-owner-mandate] p')].find(x => { const t = x.textContent ?? ''; return t.includes('wins keeps the mandate on pace.') || t.includes('-win ask.'); }); if (p && line) { const kids = [...p.childNodes].filter(n => n.nodeType === 3); kids[kids.length - 1].nodeValue = line; } }, paceOf(svP.raw));
      }
      if (speed && samples === after) await page.locator(`[data-gameday-speed="${speed}"]`).click();
      /* he scrolls to the top of the page in the middle of the watch (after the speed chip: a click of this walk's
         own scrolls to its button). Under `noreveal` nothing in the page can scroll an element into view from here on. */
      if (away && !awayAt && samples === (speed ? after + 1 : 2)) {
        if (plant === 'noreveal') await page.evaluate(() => { window.__realScrollIntoView = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function () {}; });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(120);
        awayAt = await state(page);
      }
    }
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => document.querySelectorAll('[data-planted]').forEach(n => n.remove()));
  await page.waitForTimeout(away ? 1600 : 900);
  const a = await state(page);
  const svA = await saved(page);
  await page.evaluate(() => { if (window.__realScrollIntoView) { Element.prototype.scrollIntoView = window.__realScrollIntoView; delete window.__realScrollIntoView; } });
  say(point, samples >= 2 && spoiled.length === 0, `${size.w}, ${label}: until full time the whole page held nothing of the result (${samples} samples, ${((Date.now() - t0) / 1000).toFixed(1)} s, the bug ended on ${bug.join('-')} of ${f.home}-${f.away})${spoiled.length ? `: ${[...new Set(spoiled)].slice(0, 3).join('; ')}` : ''}`);
  say(point, a.face === 'result' && !a.clock && a.final === f.tile && a.grid === 16 && a.week.includes(`Week ${svP.week}/17`) && a.record === `Record ${svP.record}` && !!a.play && !a.play.disabled && a.play.text.endsWith(`Week ${svP.week}`),
    `${size.w}, ${label}: at full time the tile shows the saved final (${a.final}) and the page has moved on (${a.week}, ${a.record})`);
  say(point, svA.raw === svP.raw && svP.n === svB.n + 1 && svP.week === svB.week + 1, `${size.w}, ${label}: the press saved the week once and the watch saved nothing (the save at full time is the string the press wrote, ${svP.raw.length} bytes)`);
  if (away) {
    /* FULL TIME IS A REVEAL: the tile was out of view (the reveal hook's own measure of readable) and full time brought it back */
    const gone = !!awayAt && !(awayAt.box.top >= 0 && awayAt.vh - awayAt.box.top >= MIN_LEAD);
    say(point, gone && a.box.top >= -2 && inView(a) >= MIN_LEAD && a.box.height === b.box.height, `${size.w}, ${label}: full time is a reveal: scrolled to the top of the page in the middle of the watch the tile was out of view (its top at ${awayAt?.box.top} of ${awayAt?.vh}, scrollY ${awayAt?.scrollY}; out of view: ${gone}), and at full time the page brought it back: scrollY ${a.scrollY}, its top at ${a.box.top} of ${a.vh}, ${inView(a)} px showing`);
  } else {
    say(point, a.box.top >= -2 && inView(a) >= MIN_LEAD && a.box.height === b.box.height, `${size.w}, ${label}: the tile stayed in view and the same size: scrollY ${b.scrollY} to ${a.scrollY}, its top at ${a.box.top} of ${a.vh}, ${inView(a)} px showing`);
  }
  /* the two readers the review found nothing held, each against the SAVE: the owner's pace and his seed */
  const pace = paceOf(svP.raw);
  say(point, pace === null || a.owner.includes(pace), `${size.w}, ${label}: at full time the owner card's pace is the saved league's (${pace === null ? 'none is drawn this week' : `"${pace}"`}; the card ends "${a.owner.slice(-60)}")`);
  const stand = standingOf(svP.raw);
  if (stand.k >= 0) seededReadings += 1;
  say(point, a.standing === stand.line, `${size.w}, ${label}: where he stands is the engine's own seeding of the saved league ("${a.standing}"; the save seeds him ${stand.k >= 0 ? stand.k + 1 : 'outside the seven'})`);
  await fit(page, size, `${label}, full time`);
  await shot(page, size, `${label}-fulltime`);
  return { a, moved: a.owner !== b.owner, before: b.owner };
}

async function walk(browser, size) {
  console.log(`\n=== ${size.w} by ${size.h} ===`);
  const { ctx, page, errors } = await newPage(browser, size);
  const scripts = [];
  let opened = false;
  page.on('response', res => {
    const url = res.url(), late = opened;
    if (!/\.js(\?|$)/.test(url)) return;
    res.text().then(body => scripts.push({ url, late, marked: body.includes('data-gameday-face') })).catch(() => scripts.push({ url, late, marked: false }));
  });
  await startFranchise(page);
  const plant = size.w === 390 && WALK_PLANTS.includes(CONTROL) ? CONTROL : '';

  /* 1: the box, and the chunk asked for only now */
  opened = true;
  await page.locator('button:has-text("This week")').click();
  const early = await state(page);
  await page.waitForSelector('[data-gameday]', { timeout: 20000 });
  await page.waitForTimeout(700);
  const s1 = await state(page);
  const want = size.w >= 768 ? 352 : 400;
  say(1, !!early.box && early.box.height === want && s1.box.height === want && early.box.pageTop === s1.box.pageTop, `${size.w}: the tile's box is ${want} px high and where it was before its card landed (${early.box?.height} then ${s1.box?.height}, top ${early.box?.top} then ${s1.box?.top})`);
  say(1, s1.face === 'next' && /Next up: (at|home to) \S+/.test(s1.text) && s1.play?.text === 'Play Week 1' && s1.watch?.text === 'Watch Week 1' && !s1.play.disabled && !s1.watch.disabled, `${size.w}: before a press the tile shows the next game, with Play Week 1 and Watch Week 1 open`);
  const before = scripts.filter(x => !x.late), late = scripts.filter(x => x.late);
  say(1, before.length >= 3 && before.every(x => !x.marked) && late.filter(x => x.marked).length === 1, `${size.w}: the card's chunk was asked for only when the box opened (${before.length} scripts before it, ${before.filter(x => x.marked).length} of them with the tile's marker; ${late.length} after, ${late.filter(x => x.marked).length} with it)`);
  await fit(page, size, 'the next game');
  await shot(page, size, '1-next');

  /* 2: Play */
  await page.locator('[data-week-box] button:has-text("Play Week")').click();
  await page.waitForTimeout(1300);
  const a2 = await state(page);
  const sv2 = await saved(page);
  const f2 = finals(sv2);
  say(2, a2.face === 'result' && a2.final === f2.tile && sv2.n === 1, `${size.w}: after Play Week 1 the tile shows the saved final of his game (${a2.final}; the save holds ${f2.tile})`);
  say(2, a2.lineUs.length === 5 && sum(a2.lineUs.slice(0, 4)) === f2.us && a2.lineUs[4] === f2.us && sum(a2.lineThem.slice(0, 4)) === f2.them && a2.lineThem[4] === f2.them, `${size.w}: the line score adds up to the final (${a2.lineUs.join(' ')} and ${a2.lineThem.join(' ')})`);
  say(2, a2.grid === 16 && a2.box.height === s1.box.height && a2.docW <= a2.vw, `${size.w}: sixteen scores sit under the tile, the box is the size it was and the page has no sideways scroll (${a2.docW} of ${a2.vw})`);
  say(2, a2.box.top >= -2 && inView(a2) >= MIN_LEAD, `${size.w}: the press did not take the tile out of view: scrollY ${s1.scrollY} to ${a2.scrollY}, the tile's top at ${a2.box.top} of ${a2.vh}, ${inView(a2)} px of it showing`);
  const stand2 = standingOf(sv2.raw);
  if (stand2.k >= 0) seededReadings += 1;
  say(2, a2.standing === stand2.line, `${size.w}: where he stands is the engine's own seeding of the saved league ("${a2.standing}"; the save seeds him ${stand2.k >= 0 ? stand2.k + 1 : 'outside the seven'})`);
  note(`${size.w}: measured after Play: the tile's top ${s1.box.top} before and ${a2.box.top} after, the Play button's top ${a2.play?.top}, the grid's first row at ${a2.gridTop}, the story ${a2.scroller?.content} px in a frame of ${a2.scroller?.frame}`);
  if (plant === 'tall') await page.evaluate(() => { const root = document.querySelector('[data-gameday]'); const d = document.createElement('div'); d.setAttribute('data-planted', ''); d.style.cssText = 'height:300px;flex-shrink:0'; root.insertBefore(d, root.firstChild); });
  await fit(page, size, 'the result after Play');
  await shot(page, size, '2-played');
  if (plant === 'tall') await page.evaluate(() => document.querySelector('[data-planted]')?.remove());

  /* 3: Watch (the clock left to run at 320, 3x elsewhere), then 4: Results */
  await watchWeek(page, size, 3, size.w === 320 ? { label: '3-watch-1x', away: true } : { after: 3, speed: '3x', plant, label: '3-watch-3x', away: true });
  await watchWeek(page, size, 4, { after: 2, speed: 'Results', label: '4-results' });

  /* 4: a reload in the middle of a watch */
  await page.locator('[data-watch-week]').click();
  await page.waitForSelector('[data-match-clock]', { timeout: 10000 });
  await page.waitForTimeout(600);
  const svM = await saved(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await openWeek(page);
  const aM = await state(page);
  const svR = await saved(page);
  say(4, aM.face === 'result' && !aM.clock && aM.final === finals(svM).tile && svR.raw === svM.raw && aM.grid === 0 && aM.play?.text === `Play Week ${svM.week}` && !aM.play.disabled && aM.chips.length === svM.n,
    `${size.w}: a reload in the middle of a watch shows the result (${aM.final}) with no clock, and the save is the string the press wrote (week ${svR.week}, ${svR.n} games logged)`);
  await fit(page, size, 'the result after a reload');
  await shot(page, size, '4-reloaded');

  /* 6: the "?". The button is brought into view FIRST (a click of this walk's own scrolls to a button below the
     fold, and that scroll is not the page's), and the page is read after that and before the press. */
  await page.locator('[data-gameday-help]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const bH = await state(page);
  await page.locator('[data-gameday-help]').click();
  await page.waitForTimeout(500);
  /* `helpjump`: the page left 150 px lower with the sheet open, as a browser's own scroll to the focused sheet leaves it when nothing puts it back */
  if (plant === 'helpjump') { await page.evaluate(() => window.scrollBy({ top: 150, behavior: 'instant' })); await page.waitForTimeout(100); }
  const helpOf = () => {
    const sheet = document.querySelector('[data-season-help]'), wb = document.querySelector('[data-week-box]');
    if (!sheet || !wb) return null;
    const a = sheet.getBoundingClientRect(), b = wb.getBoundingClientRect();
    return { child: sheet.parentElement?.parentElement === wb && sheet.parentElement.hasAttribute('data-gameday-help-host'), inTile: !!sheet.closest('[data-gameday-box]'), dw: Math.round(Math.abs(a.width - b.width)), dh: Math.round(Math.abs(a.height - b.height)), text: sheet.innerText, y: Math.round(window.scrollY), height: Math.round(a.height) };
  };
  const h = await page.evaluate(helpOf);
  say(6, !!h && h.child && !h.inTile && h.dw <= 3 && h.dh <= 3 && h.text.includes('Real: a touchdown is 6') && h.text.includes('A worked example') && h.text.includes('Got it'), `${size.w}: the "?" is drawn over the whole week box and not inside the tile, with the law's words and a worked example (the sheet is ${h?.height} px high, ${h?.dw} px narrower and ${h?.dh} px shorter than the box's own frame; in the box's host: ${h?.child}; inside the tile: ${h?.inTile})`);
  /* the reveal hook's own measure of "already readable": the top on screen with 160 px of the box showing */
  const readable = bH.weekTop !== null && bH.weekTop >= 0 && bH.vh - bH.weekTop >= MIN_LEAD;
  say(6, !!h && (!readable || h.y === bH.scrollY), `${size.w}: opening the "?" over a week box whose top was readable did not move the page (the box's top at ${bH.weekTop} of ${bH.vh}, readable: ${readable}; scrollY ${bH.scrollY} before and ${h?.y} with the sheet open)`);
  await shot(page, size, '6-help');
  await page.locator('[data-season-help] button:has-text("Got it")').click();
  await page.waitForTimeout(300);
  const closed = !(await state(page)).help;
  await page.locator('[data-gameday-help]').click();
  await page.waitForTimeout(300);
  const again = (await state(page)).help;
  await page.locator('[data-season-help] button:has-text("Got it")').click();
  await page.waitForTimeout(300);
  say(6, closed && again && !(await state(page)).help, `${size.w}: the "?" closes, opens again and closes`);

  /* 7: a chip opens its game on the same box; then a save with no log */
  const b7 = await state(page);
  await page.locator('[data-gameday-chip]').first().click();
  await page.waitForTimeout(300);
  const a7 = await state(page);
  say(7, a7.where.startsWith('Wk 1 ·') && a7.final !== '' && a7.box.height === b7.box.height && a7.box.pageTop === b7.box.pageTop && a7.face === 'result', `${size.w}: the first chip opens Week 1 on the same box (${a7.where}: ${a7.final}; the box did not move)`);
  await fit(page, size, 'an earlier game opened from a chip');
  await shot(page, size, '7-chip');
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); delete s.gameLog; localStorage.setItem(k, JSON.stringify(s)); }, SAVE_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await openWeek(page);
  const o1 = await state(page);
  await page.locator('[data-week-box] button:has-text("Play Week")').click();
  await page.waitForTimeout(1300);
  const o2 = await state(page);
  const svO = await saved(page);
  say(7, o1.face === 'next' && o1.chips.length === 0 && o2.face === 'result' && o2.final === finals(svO).tile && o2.chips.length === 1 && o2.chips[0] === `w${svO.week - 1}`, `${size.w}: a save with no log shows the next game, plays on, and its chips start at that week (${o2.chips.join(', ')})`);
  await fit(page, size, 'the result on a save that began with no log');
  await shot(page, size, '7-nolog');

  const real = realErrors(errors);
  say(0, real.length === 0, `${size.w}: no page error on the walk (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

/* 5: reduced motion, on the phone */
async function reducedWalk(browser, size) {
  console.log(`\n=== ${size.w} by ${size.h}, reduced motion ===`);
  const { ctx, page, errors } = await newPage(browser, size, true);
  await startFranchise(page);
  await openWeek(page);
  await page.locator('[data-watch-week]').click();
  let clocks = 0;
  for (let i = 0; i < 8; i += 1) { if ((await state(page)).clock) clocks += 1; await page.waitForTimeout(100); }
  await page.waitForTimeout(600);
  const a = await state(page);
  const sv = await saved(page);
  say(5, clocks === 0 && a.face === 'result' && a.final === finals(sv).tile && a.grid === 16 && a.week.includes('Week 2/17') && !!a.play && !a.play.disabled, `${size.w}, reduced motion: Watch shows the result at once (${a.final}), with no clock at any of 8 readings`);
  await fit(page, size, 'reduced motion, the result');
  await shot(page, size, '5-reduced');
  const real = realErrors(errors);
  say(0, real.length === 0, `${size.w}, reduced motion: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

/* 9 and 10: the two readers the review found nothing held, each on a save that MAKES the case, on the phone.
   9, the owner card's pace: the franchise's ask is made a number of wins (the only kind of ask whose pace line
   prints his wins), and weeks are watched until the line has moved at full time. 10, his seed: the save is handed
   to the board for the club that tops the AFC today, in the shape of a save from before the owner, the desk and
   the log, and three weeks are played. */
async function ownerAndSeedWalk(browser, size) {
  console.log(`\n=== ${size.w} by ${size.h}, the owner card's pace and his seed ===`);
  const { ctx, page, errors } = await newPage(browser, size);
  await startFranchise(page);
  await page.evaluate(k => {
    const s = JSON.parse(localStorage.getItem(k));
    s.mandate = { tier: 'rebuild', text: 'Rebuild honestly: 6 wins keeps the project on schedule upstairs.', winFloor: 6, reqLevel: 0, season: s.league.season };
    localStorage.setItem(k, JSON.stringify(s));
  }, SAVE_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await openWeek(page);
  await page.locator('[data-week-box] button:has-text("Play Week")').click();
  await page.waitForTimeout(1300);
  const p1 = await state(page);
  const sv1 = await saved(page);
  const pace1 = paceOf(sv1.raw);
  say(9, pace1 !== null && /^\d+ wins /.test(pace1) && p1.owner.includes(pace1), `${size.w}: with an ask of six wins the owner card prints his wins from Week 2 on ("${pace1}"; the card ends "${p1.owner.slice(-60)}")`);
  let watched = 0, moved = 0;
  while (watched < 6 && moved === 0) {
    const r = await watchWeek(page, size, 9, { after: 2, speed: 'Results', plant: CONTROL === 'pacespoils' ? CONTROL : '', label: `9-pace-${watched + 1}` });
    watched += 1;
    if (r.moved) moved += 1;
  }
  say(9, moved > 0, `${size.w}: the pace line moved at full time in ${moved} of ${watched} watched week(s), so held back it was the result and not a line compared with itself`);

  /* 10 */
  const svS = await saved(page);
  const top = ENGINE.conferenceSeeds(JSON.parse(svS.raw).league.teams, 'AFC')[0];
  await page.evaluate(([k, team]) => {
    const s = JSON.parse(localStorage.getItem(k));
    localStorage.setItem(k, JSON.stringify({ league: s.league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
  }, [SAVE_KEY, top]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await openWeek(page);
  const before = seededReadings;
  let read = 0;
  const wrong = [], lines = [];
  for (let i = 0; i < 3; i += 1) {
    await page.locator('[data-week-box] button:has-text("Play Week")').click();
    await page.waitForTimeout(1300);
    const sv = await saved(page);
    const stand = standingOf(sv.raw);
    /* `seedoff`: the line as the board printed it with the seed handed over as an index (one too good; a top seed reads 0th) */
    if (CONTROL === 'seedoff' && stand.k >= 0) await page.evaluate(line => { const el = document.querySelector('[data-gameday-standing]'); if (el) el.textContent = line; }, `${stand.conf}: ${stand.k === 0 ? '0th' : NTH[stand.k - 1]} seed of ${stand.n} as it stands.`);
    const st = await state(page);
    read += 1;
    if (stand.k >= 0) seededReadings += 1;
    lines.push(st.standing);
    if (sv.my !== top || st.final !== finals(sv).tile) wrong.push(`press ${i + 1}: the tile shows "${st.final}" and the save's last game of ${sv.my} is "${finals(sv).tile}"`);
    if (st.standing !== stand.line) wrong.push(`press ${i + 1}: the tile says "${st.standing}" and the saved league seeds him ${stand.k >= 0 ? stand.k + 1 : 'outside the seven'} ("${stand.line}")`);
  }
  say(10, read === 3 && wrong.length === 0 && seededReadings > before, `${size.w}: on the club that topped the AFC (${top}) the standing line is his seed in the saved league, counted from 1, after each of ${read} presses, ${seededReadings - before} of them with a seed (${lines.join(' / ')})${wrong.length ? `: ${wrong.slice(0, 2).join('; ')}` : ''}`);
  await fit(page, size, 'the result on a club that holds a seed');
  await shot(page, size, '10-seeded');
  const real = realErrors(errors);
  say(0, real.length === 0, `${size.w}, the owner card and the seed: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

/* ---- Round 1309: the playoffs on the box (points 11 to 17). The saves are made here from the engine's own source (the
   league, the bracket machine, the NFL's bind and the log, bundled from the tree the build was made from), so the walk
   does not press sixteen weeks to reach Week 17. Every save is then loaded by the board itself. ---- */
const { M: PO } = await bundle([
  "export { initLeague, simGame, REGULAR_WEEKS } from './src/lib/frontOffice.ts';",
  "export { NFL_POSTSEASON, nflPlayTie } from './src/lib/frontOfficePostseason.ts';",
  "export { openBracket, playBracketWeek, bracketPairings, bracketWeek } from './src/lib/gmBracket.ts';",
  "export { nflTell, nflWhere } from './src/lib/frontOfficeGameDay.ts';",
  "export { addToGmGameLog } from './src/lib/gmGameLog.ts';",
], [], 'fo-postseason-walk');
const lehmer = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const shapeOf = (league, myTeam, extra = {}) => JSON.stringify({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...extra });
const seasonPlayed = (rng, weeks) => {
  const league = PO.initLeague(rng);
  for (let w = 1; w <= weeks; w += 1) { league.schedule[w - 1].forEach(g => PO.simGame(g, league.teams, rng)); league.week += 1; }
  return league;
};
/** A: the morning of Week 17 for a club made strong from Week 1 (so it tops its conference and has the bye), his
 *  sixteen games told into the log the way the board tells a week. */
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
/** B: the bracket after the Wild Card round, his club through it and drawn against a top seed made unbeatable, his
 *  own club made weak: the Divisional round is his exit. */
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
/** C: an ordinary league the morning after Week 17, the bracket open and unplayed, for the AFC's second seed (he
 *  plays the Wild Card round): the watched playoff game. */
function bracketOpenSave() {
  const league = seasonPlayed(lehmer(1311), PO.REGULAR_WEEKS);
  const seeds = PO.NFL_POSTSEASON.seeds(league);
  return shapeOf(league, seeds[1], { playoffs: PO.openBracket(PO.NFL_POSTSEASON.formatFor(league.season), league.season, seeds) });
}
/** D (the fix pass): the bracket three rounds on with his club (the top seed) in the title game, a title mandate and
 *  trust 60, so a title (the podium) or a loss (the scrum) both move what the press card and the owner card say. His
 *  club is strong for those three rounds only and saved with its own ratings, so its final is an ordinary game. A few
 *  streams, because a final the law will not tell has no clock and its watch ends at once (the tile's rule): the walk
 *  takes the first whose watch runs a clock. */
function titleGameSaves() {
  const out = [];
  for (let k = 1; k <= 12 && out.length < 4; k += 1) {
    const league = seasonPlayed(lehmer(7), PO.REGULAR_WEEKS);
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
    const log = PO.addToGmGameLog(null, league.season, told.filter(g => g.home === team || g.away === team));
    const mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: league.season };
    out.push(shapeOf(league, team, { playoffs: block, ...(log ? { gameLog: log } : {}), trust: 60, mandate }));
  }
  return out;
}
/** E (the closing check): A with a title mandate and trust 60, the review's own save (its r1309RunWalk.mjs): the owner
 *  card a line taller than A's, so at 390 the feed box the press writes above the week box tips the reveal. */
function week17TitleSave() {
  const s = JSON.parse(week17Save());
  const mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: s.league.season };
  return JSON.stringify({ ...s, mandate, trust: 60 });
}
const FIXTURES = { A: week17Save(), B: divisionalLossSave(), C: bracketOpenSave(), D: titleGameSaves(), E: week17TitleSave() };

/* in the page: the bracket's parts, the press row and where his result is */
const playoffOf = () => {
  const one = sel => document.querySelector(sel);
  const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) }; };
  const row = [...document.querySelectorAll('[data-press-row] button')];
  return {
    face: one('[data-gameday-box]')?.getAttribute('data-box-face') ?? null,
    place: one('[data-bracket-place]')?.getAttribute('data-bracket-place') ?? null,
    placeLine: (one('[data-bracket-place]')?.textContent ?? '').trim(),
    bracketText: one('[data-bracket]') ? one('[data-bracket]').innerText : '',
    buttons: row.map(b => ({ text: (b.textContent ?? '').trim(), disabled: b.disabled, ...rect(b), over: b.scrollWidth > b.clientWidth + 1 })),
    back: one('[data-bracket-back]') ? { disabled: one('[data-bracket-back]').disabled, ...rect(one('[data-bracket-back]')) } : null,
    box: rect(one('[data-gameday-box]')), boxPageTop: one('[data-gameday-box]') ? Math.round(one('[data-gameday-box]').getBoundingClientRect().top + window.scrollY) : null,
    final: rect(one('[data-gameday-final]')), finalText: (one('[data-gameday-final]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    where: (one('[data-gameday-where]')?.textContent ?? '').trim(),
    weekBox: rect(one('[data-week-box]')),
    recap: !!one('[data-verdict-reveal]'), saveError: !!one('[data-save-error]') || (document.body.textContent ?? '').includes('Delete unusable save'),
  };
};
const po = page => page.evaluate(playoffOf);
async function loadSave(page, raw) {
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await answerConsent(page); await page.waitForTimeout(300);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, raw]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('button:has-text("This week")').click();
  await page.waitForSelector('[data-gameday-box] [data-bracket], [data-gameday-box] [data-gameday]', { timeout: 20000 });
  await page.waitForTimeout(500);
}
/* a press of the walk's own, by a click that does NOT scroll first: a real pointer at the button's centre (Playwright's
   own click scrolls the button into view, which is the page moving for a reason that is not the board's) */
async function pressAt(page, sel) {
  const r = await page.evaluate(s => { const b = document.querySelector(s); if (!b) return null; const x = b.getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2, vh: window.innerHeight }; }, sel);
  if (!r) throw new Error(`no button ${sel}`);
  if (r.y < 0 || r.y > r.vh) { await page.locator(sel).scrollIntoViewIfNeeded(); return pressAt(page, sel); }
  await page.mouse.click(r.x, r.y);
  await page.waitForTimeout(1100);
}

/* 12's reveal (the ruling of Round 1307's review): from sm up, after the FIRST press of a visit, the first button is on
   the screen and the whole box is. Under sm the numbers are printed (point 2 holds Round 1307's there). */
function revealSay(size, p, what) {
  const first = p.buttons[0];
  const line = `${size.w}x${size.h}, ${what}: the first button's top at ${first?.top}, the box from ${p.box?.top} to ${p.box?.bottom} of ${size.h}`;
  if (size.w >= 640) say(12, !!first && first.top >= 0 && p.box.top >= 0 && p.box.bottom <= size.h, `${line}: the buttons and the whole box are on the screen`);
  else note(line);
  /* the fix pass (the review's minor 4): with his game on the box, the back chip under it is on the screen too */
  const chip = `${size.w}x${size.h}, ${what}: the back chip from ${p.back?.top} to ${p.back?.bottom} of ${size.h}`;
  if (size.w >= 640 && p.back) say(12, p.back.top >= 0 && p.back.bottom <= size.h, `${chip}: on the screen with the box`);
  /* the closing check (its finding 2): under sm the chip's row is above the box, so at 390 by 844 it is on the screen */
  else if (size.w === 390 && p.back) say(12, p.back.top >= 0 && p.back.bottom <= size.h, `${chip}: on the screen with the buttons`);
  else if (p.back) note(chip);
}
/* correction 27: after a playoff press, his result and the next press button inside the screen with no scroll by him;
   asserted at 390 by 844, printed at 320 by 640 (under sm the reveal's element is the box, as shipped) */
function inScreenSay(size, p, what) {
  const next = p.buttons[0];
  const res = p.face === 'game' ? p.final : null;
  const ok = !!res && res.top >= 0 && res.bottom <= size.h && (!next || (next.top >= 0 && next.bottom <= size.h));
  const line = `${size.w}x${size.h}, ${what}: his result from ${res?.top} to ${res?.bottom}, the next press from ${next?.top} to ${next?.bottom}`;
  if (size.w === 390) say(14, ok, `${line}: both on the screen`);
  else note(line);
}
/* the press row's last button to the box: a gap that a press must never change (the box never moves under its row) */
const gapOf = p => (p.box && p.buttons.length ? p.box.top - p.buttons[p.buttons.length - 1].bottom : null);

/* 14, the title run (A, Week 17 played): the bye on the bracket, then a round a press, his game on the box each time
   he plays, the box never moving under its row, then the recap with his title. */
async function titleRun(page, size, plant) {
  await pressAt(page, '[data-bracket-back]');
  await page.waitForSelector('[data-gameday-box] [data-bracket]', { timeout: 20000 });
  const p0 = await po(page);
  say(14, p0.face === 'bracket' && p0.place === 'bye', `${size.w}: the back chip shows the bracket, and the bracket says he has the bye ("${p0.placeLine}")`);
  await fit(page, size, 'the bracket, his bye');
  await shot(page, size, '14-bye');
  const gap0 = gapOf(p0);
  const steps = [];
  for (let i = 0; i < 4; i += 1) {
    const n0 = (await saved(page)).n;
    await pressAt(page, '[data-press="round"]');
    /* `bracketjump`: a spacer put above the box after the first press, what a face that grows a line would do */
    if (plant === 'bracketjump' && i === 0) await page.evaluate(() => { const d = document.createElement('div'); d.setAttribute('data-planted', ''); d.style.height = '120px'; const box = document.querySelector('[data-gameday-box]'); box.parentElement.insertBefore(d, box); });
    const p = await po(page);
    if (p.recap) { steps.push('the recap'); break; }
    const sv = await saved(page);
    const logged = sv.n > n0;
    steps.push(logged ? `his game (${p.where})` : `the bracket (${p.place})`);
    say(14, logged ? p.face === 'game' && p.finalText === finals(sv).tile : p.face === 'bracket', `${size.w}: round ${i + 1}: ${logged ? `his game on the box (${p.where}: ${p.finalText})` : `no game of his, the bracket on the box ("${p.placeLine}")`}`);
    say(14, gapOf(p) === gap0, `${size.w}: round ${i + 1}: the box did not move under its row (${gap0} px before the first press, ${gapOf(p)} now)`);
    if (logged) inScreenSay(size, p, `round ${i + 1}`);
    await fit(page, size, `round ${i + 1}, ${p.face}`);
    await shot(page, size, `14-round${i + 1}`);
    await page.evaluate(() => document.querySelectorAll('[data-planted]').forEach(n => n.remove()));
  }
  const s = JSON.parse((await saved(page)).raw);
  say(14, (await po(page)).recap && s.postseason?.champion === s.myTeam && !('playoffs' in s), `${size.w}: the title run ends on the recap with his title (${steps.join(', ')}; champion ${s.postseason?.champion}, his club ${s.myTeam})`);
  await shot(page, size, '14-title');
}
/* 14, his exit (B): "Out in the ... Divisional." on the bracket, then "Sim the rest" reaches the recap; the press is the
   first of the visit, so 12's reveal is read on a playoff round too */
async function exitRun(page, size) {
  await loadSave(page, FIXTURES.B);
  await pressAt(page, '[data-press="round"]');
  const p = await po(page);
  revealSay(size, p, 'a playoff round, the first press of a visit');
  inScreenSay(size, p, 'his Divisional game');
  await pressAt(page, '[data-bracket-back]');
  await page.waitForSelector('[data-gameday-box] [data-bracket]', { timeout: 20000 });
  const q = await po(page);
  say(14, q.place === 'out' && /^Out in the (AFC|NFC) Divisional\.$/.test(q.placeLine), `${size.w}: beaten in the Divisional round, the bracket says so ("${q.placeLine}")`);
  await shot(page, size, '14-exit');
  await pressAt(page, '[data-press="rest"]');
  say(14, (await po(page)).recap, `${size.w}: "Sim the rest of the playoffs" reaches the recap`);
}
/* 14, a watched playoff game (C): until full time the page holds nothing of the result; then it moves on */
async function watchRun(page, size, plant) {
  await loadSave(page, FIXTURES.C);
  const b = await po(page);
  const sv0 = await saved(page);
  await pressAt(page, '[data-watch-round]');
  const svP = await saved(page);
  const f = finals(svP);
  const spoiled = [];
  let samples = 0;
  const t0 = Date.now();
  for (;;) {
    const st = await state(page);
    if (st.face === 'result') break;
    if (Date.now() - t0 > 45000) { spoiled.push('the watch did not reach full time in 45 s'); break; }
    if (st.face === 'watch') {
      samples += 1;
      const p = await po(page);
      if (p.buttons.some(x => !x.disabled) || (p.back && !p.back.disabled)) spoiled.push('a press or the back chip is open');
      if (p.buttons.map(x => x.text).join('|') !== b.buttons.map(x => x.text).join('|')) spoiled.push(`the buttons read ${p.buttons.map(x => x.text).join(' | ')}`);
      if (p.bracketText !== '') spoiled.push('the bracket is drawn');
      if (st.text.includes(f.bare)) spoiled.push(`the page holds the final ("${f.bare}")`);
      if (samples === 1) {
        await fit(page, size, 'a playoff game on the clock');
        await shot(page, size, '14-watching');
        if (plant === 'playoffspoil') await page.evaluate(str => { const x = document.createElement('p'); x.setAttribute('data-planted', ''); x.textContent = str; document.querySelector('[data-week-box]').appendChild(x); }, f.bare);
      }
      if (samples === 2) await page.locator('[data-gameday-speed="3x"]').click();
    }
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => document.querySelectorAll('[data-planted]').forEach(n => n.remove()));
  await page.waitForTimeout(900);
  const a = await po(page);
  say(14, samples >= 2 && spoiled.length === 0 && svP.n === sv0.n + 1, `${size.w}: a watched playoff game: until full time the page held nothing of the result (${samples} samples)${spoiled.length ? `: ${[...new Set(spoiled)].slice(0, 3).join('; ')}` : ''}`);
  say(14, a.finalText === f.tile && a.buttons[0]?.text !== b.buttons[0]?.text && !!a.back && !a.back.disabled && (await saved(page)).raw === svP.raw, `${size.w}: at full time his final is on the box (${a.finalText}), the page has moved on ("${a.buttons[0]?.text}") and the watch saved nothing`);
  await shot(page, size, '14-watched');
}
/* 15, a reload in the middle of the bracket (C, one round played), and 17, the bracket's "?" */
async function reloadAndHelp(page, size, plant) {
  await pressAt(page, '[data-bracket-back]');
  await page.waitForSelector('[data-gameday-box] [data-bracket]', { timeout: 20000 });
  const before = await po(page);
  const sv = await saved(page);
  /* `lostblock`: the bracket taken off the save before the reload */
  if (plant === 'lostblock') await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); delete s.playoffs; localStorage.setItem(k, JSON.stringify(s)); }, SAVE_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const err = (await po(page)).saveError;
  if (!err) { await page.locator('button:has-text("This week")').click(); await page.waitForSelector('[data-gameday-box] [data-bracket]', { timeout: 20000 }); await page.waitForTimeout(400); }
  const after = await po(page);
  say(15, !err && after.face === 'bracket' && after.bracketText === before.bracketText && (await saved(page)).raw === sv.raw, `${size.w}: a reload in the middle of the bracket shows the same bracket and plays nothing (save error screen: ${err})`);
  await shot(page, size, '15-reloaded');
  if (err) return;
  /* 17 */
  const open = async () => { await page.locator('[data-bracket-help]').click(); await page.waitForTimeout(300); return !!(await page.$('[data-season-help]')); };
  const close = async () => { await page.locator('[data-season-help] button:has-text("Got it")').click(); await page.waitForTimeout(300); return !(await page.$('[data-season-help]')); };
  const o1 = await open();
  await shot(page, size, '17-help');
  const c1 = await close();
  const o2 = await open();
  const c2 = await close();
  say(17, o1 && c1 && o2 && c2, `${size.w}: the bracket's "?" opens, closes, opens again and closes`);
}

/* 18 (the fix pass), the title game watched (D): its press closes the season, so until full time the press card and
   the owner card read as they did before the press, the card's answers are shut and no recap is drawn; at full time
   the recap comes with the room the result called. */
const roomOf = () => {
  const txt = sel => (document.querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return { press: txt('[data-gm-press]'), owner: txt('[data-owner-mandate]'), open: [...document.querySelectorAll('[data-gm-press] button')].filter(b => !b.disabled).length, recap: !!document.querySelector('[data-verdict-reveal]') };
};
async function titleWatchRun(page, size, plant) {
  let tried = 0, samples = 0, before = null, sv = null;
  const spoiled = [];
  for (const raw of FIXTURES.D) {
    tried += 1;
    await loadSave(page, raw);
    before = await page.evaluate(roomOf);
    await pressAt(page, '[data-watch-round]');
    if ((await state(page)).face !== 'watch') continue;
    sv = JSON.parse((await saved(page)).raw);
    const t0 = Date.now();
    for (;;) {
      const st = await state(page);
      const room = await page.evaluate(roomOf);
      if (st.face !== 'watch' || room.recap) break;
      if (Date.now() - t0 > 45000) { spoiled.push('the watch did not reach full time in 45 s'); break; }
      samples += 1;
      if (room.press !== before.press) spoiled.push(`the press card reads "${room.press.slice(0, 60)}"`);
      if (room.owner !== before.owner) spoiled.push(`the owner card reads "${room.owner.slice(0, 60)}"`);
      if (room.open > 0) spoiled.push('an answer of the press card is open');
      if (samples === 1) {
        await shot(page, size, '18-title-watching');
        /* `titlespoil`: the room's verdict written into the owner card while he watches */
        if (plant === 'titlespoil') await page.evaluate(() => { const x = document.createElement('p'); x.setAttribute('data-planted', ''); x.textContent = 'The podium'; document.querySelector('[data-owner-mandate]').appendChild(x); });
      }
      if (samples === 2) await page.locator('[data-gameday-speed="3x"]').click();
      await page.waitForTimeout(200);
    }
    break;
  }
  await page.evaluate(() => document.querySelectorAll('[data-planted]').forEach(n => n.remove()));
  await page.waitForTimeout(900);
  const after = await page.evaluate(roomOf);
  const won = !!sv && sv.postseason?.champion === sv.myTeam;
  say(18, !!sv && samples >= 2 && spoiled.length === 0 && sv.phase === 'recap' && sv.trust !== 60, `${size.w}: the title game watched (stream ${tried} of ${FIXTURES.D.length}; the save closed at the press: ${won ? 'won' : 'lost'}, trust 60 to ${sv?.trust}): until full time the press card ("${before?.press.slice(0, 30)}") and the owner card held, no answer open (${samples} samples)${spoiled.length ? `: ${[...new Set(spoiled)].slice(0, 3).join('; ')}` : ''}`);
  say(18, after.recap && (won ? /The podium/ : /The accountability scrum/).test(after.press), `${size.w}: at full time the recap comes with the room the result called ("${after.press.slice(0, 50)}")`);
  await shot(page, size, '18-title-watched');
}

/* 19 (the closing check, ruling 2b): "Watch Week 17" on E, the first press of a visit, watched to full time at 3x; then
   the back chip and his bye round. Asserted at 390 by 844, printed at the other sizes. The case is a press that MOVES
   the page (the hook fires when the feed box the press writes pushes the box's top under its 160 px), so the page's
   generator is seeded per stream, the review walk's own seed first (20261309: two feed lines), and the first stream
   whose press moved the page is the one read; a run where none did is red at 390, not green by not reaching it. */
const onScreen = (r, h) => !!r && r.top >= 0 && r.bottom <= h;
async function week17WatchRun(browser, size) {
  let ctx = null, page = null, errors = [], p0 = null, moved = 0, stream = 0;
  for (const seed of [20261309, 20261311, 20261313, 20261317]) {
    stream += 1;
    ({ ctx, page, errors } = await newPage(browser, size, false, seed));
    await loadSave(page, FIXTURES.E);
    p0 = await po(page);
    const y0 = await page.evaluate(() => Math.round(window.scrollY));
    await pressAt(page, '[data-watch-week]');
    moved = (await page.evaluate(() => Math.round(window.scrollY))) - y0;
    if (moved !== 0 || stream === 4) break;
    await ctx.close();
  }
  if (size.w === 390) say(19, moved !== 0, `${size.w}x${size.h}, "Watch Week 17" on E: the press moved the page (stream ${stream} of 4, by ${moved} px), so the case is reached`);
  else note(`${size.w}x${size.h}, "Watch Week 17" on E: stream ${stream} of 4, the press moved the page by ${moved} px`);
  let samples = 0;
  const t0 = Date.now();
  for (;;) {
    const st = await state(page);
    if (st.face === 'result') break;
    if (Date.now() - t0 > 45000) break;
    if (st.face === 'watch') {
      samples += 1;
      if (samples === 2) await page.locator('[data-gameday-speed="3x"]').click();
    }
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(900);
  const p = await po(page);
  const next = p.buttons[0];
  const res = p.face === 'game' ? p.final : null;
  const line = `${size.w}x${size.h}, "Watch Week 17" on E at full time (${samples} samples on the clock; the week box from ${p0.weekBox?.top} before the press to ${p.weekBox?.top}, the box from ${p0.box?.top} to ${p.box?.top}): his result from ${res?.top} to ${res?.bottom}, the next press from ${next?.top} to ${next?.bottom}, the back chip from ${p.back?.top} to ${p.back?.bottom}`;
  const ok = samples >= 2 && onScreen(res, size.h) && onScreen(next, size.h) && onScreen(p.back, size.h);
  if (size.w === 390) say(19, ok, `${line}: all on the screen`);
  else note(line);
  await shot(page, size, '19-w17-watched');
  await pressAt(page, '[data-bracket-back]');
  await page.waitForSelector('[data-gameday-box] [data-bracket]', { timeout: 20000 });
  await pressAt(page, '[data-press="round"]');
  const q = await po(page);
  const qNext = q.buttons[0];
  const qLine = `${size.w}x${size.h}, then his bye round (the box's face: ${q.face}, "${q.placeLine}"): the next press from ${qNext?.top} to ${qNext?.bottom}, the box's top at ${q.box?.top}`;
  if (size.w === 390) say(19, q.face === 'bracket' && onScreen(qNext, size.h) && !!q.box && q.box.top >= 0 && q.box.top < size.h - MIN_LEAD, `${qLine}: the next press and the box's top on the screen`);
  else note(qLine);
  await shot(page, size, '19-bye');
  const real = realErrors(errors);
  say(0, real.length === 0, `${size.w}x${size.h}, point 19: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

/* The closing check (the review's read minor 2, the first fix pass's minor 6, never measured before): a landscape
   phone, 844 by 390, which is "from sm up" by its width. PRINTED ONLY, for the lead's ruling: after the first press of
   a visit (a regular week, "Play Week 17", a playoff round) where the first button, the box, the back chip and his
   result sit. The route mounts no sticky header (App.tsx's HEADER_PATHS), so the hook's top inset is 0 here and what
   can lift the box's top off the screen is the end alignment of a span taller than the screen. */
async function landscapePass(browser, size) {
  console.log(`\n=== ${size.w} by ${size.h}, a landscape phone (printed for the lead) ===`);
  const { ctx, page, errors } = await newPage(browser, size);
  const line = async what => {
    const p = await po(page);
    const sy = await page.evaluate(() => Math.round(window.scrollY));
    note(`${size.w}x${size.h}, ${what}: scrollY ${sy}, the first button from ${p.buttons[0]?.top} to ${p.buttons[0]?.bottom}, the box from ${p.box?.top} to ${p.box?.bottom}, the back chip ${p.back ? `from ${p.back.top} to ${p.back.bottom}` : 'not drawn'}, his result ${p.final ? `from ${p.final.top} to ${p.final.bottom}` : 'not drawn'}`);
  };
  await startFranchise(page);
  await openWeek(page);
  await pressAt(page, '[data-press="week"]');
  await line('"Play Week 1", the first press of a visit');
  await shot(page, size, 'L-week1');
  await loadSave(page, FIXTURES.A);
  await pressAt(page, '[data-press="week"]');
  await line('"Play Week 17", the first press of a visit');
  await shot(page, size, 'L-week17');
  await loadSave(page, FIXTURES.B);
  await pressAt(page, '[data-press="round"]');
  await line('a playoff round, the first press of a visit');
  await shot(page, size, 'L-round');
  const real = realErrors(errors);
  say(0, real.length === 0, `${size.w}x${size.h}, a landscape phone: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

/* 12's reveal at 1280 by 900 as well (the size the review measured the scroll of 0 to 778 at): the first press of a
   visit, a week (A) and then a playoff round (B, a new visit) */
async function revealPass(browser, size) {
  console.log(`\n=== ${size.w} by ${size.h}, the reveal ===`);
  const { ctx, page, errors } = await newPage(browser, size);
  await loadSave(page, FIXTURES.A);
  await pressAt(page, '[data-press="week"]');
  revealSay(size, await po(page), '"Play Week 17", the first press of a visit');
  await shot(page, size, '12-reveal-week');
  await loadSave(page, FIXTURES.B);
  await pressAt(page, '[data-press="round"]');
  revealSay(size, await po(page), 'a playoff round, the first press of a visit');
  await shot(page, size, '12-reveal-round');
  const real = realErrors(errors);
  say(0, real.length === 0, `${size.w}x${size.h}, the reveal: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

/* Points 11 to 19 at one size. Plants of the 390 walk: bracketjump (14), playoffspoil (14), lostblock (15), titlespoil (18). */
async function playoffsWalk(browser, size) {
  console.log(`\n=== ${size.w} by ${size.h}, the playoffs ===`);
  const { ctx, page, errors } = await newPage(browser, size);
  const plant = size.w === 390 && PLAYOFF_PLANTS.includes(CONTROL) ? CONTROL : '';

  /* 11: Week 17's three buttons (A, the morning of Week 17) */
  await loadSave(page, FIXTURES.A);
  const p11 = await po(page);
  const st11 = await state(page);
  const labels = p11.buttons.map(b => b.text);
  say(11, labels.join(' | ') === 'Play Week 17 | Watch Week 17 | Play the final week + playoffs', `${size.w}: Week 17 has its three buttons in order (${labels.join(' | ')})`);
  say(11, p11.buttons.length === 3 && p11.buttons.every(b => b.height >= 43.5 && !b.over) && st11.docW <= st11.vw, `${size.w}: each is at least 44 px high and none overflows (${p11.buttons.map(b => `${b.height}${b.over ? ' OVER' : ''}`).join(', ')}; the page ${st11.docW} of ${st11.vw} wide)`);
  await fit(page, size, 'Week 17');
  await shot(page, size, '11-week17');

  /* 12: "Play Week 17", the first press of this visit */
  await pressAt(page, '[data-press="week"]');
  const p12 = await po(page);
  const st12 = await state(page);
  const sv12 = await saved(page);
  const s12 = JSON.parse(sv12.raw);
  say(12, s12.league.week === 18 && 'playoffs' in s12 && s12.phase === 'hub' && st12.week.includes('Playoffs') && !/Week 18/.test(st12.text), `${size.w}: "Play Week 17" opens the bracket (week ${s12.league.week}, a bracket on the save: ${'playoffs' in s12}) and the chip reads "${st12.week}"`);
  say(12, p12.face === 'game' && /^Wk 17/.test(p12.where) && p12.finalText === finals(sv12).tile && !!p12.back && !p12.back.disabled && st12.grid === 0, `${size.w}: the box shows his Week 17 game (${p12.where}: ${p12.finalText}) with the back chip under it, and no league grid`);
  revealSay(size, p12, '"Play Week 17", the first press of a visit');
  await fit(page, size, 'his Week 17 game in the bracket');
  await shot(page, size, '12-opened');
  if (size.w === 1280) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 390, height: size.h });
    await page.waitForTimeout(500);
    const mid = await page.evaluate(() => Math.round(window.scrollY));
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(500);
    const end = await page.evaluate(() => Math.round(window.scrollY));
    say(12, mid === 0 && end === 0, `${size.w}: a window resized across sm and back scrolled nothing (scrollY 0, then ${mid} at 390 wide, then ${end})`);
  }

  /* 13: a desk off save refuses a trade with the playoffs line */
  await page.locator('button:has-text("Hub")').first().click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Trades")').first().click();
  await page.waitForTimeout(400);
  const finder = page.locator('p:has-text("Trade Finder")').locator('..');
  await finder.locator('.grid.grid-cols-2 button').first().click();
  await finder.locator('button:has-text("Shop him around the league")').click();
  await page.waitForTimeout(400);
  const st13 = await state(page);
  say(13, st13.text.includes('Trades are shut for the playoffs.') && !/Nobody bit/.test(st13.text), `${size.w}: with the desk off a trade in the bracket is refused with the playoffs' line`);
  await page.locator('button:has-text("Hub")').first().click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("This week")').click();
  await page.waitForTimeout(800);

  await titleRun(page, size, plant);
  await exitRun(page, size);
  await watchRun(page, size, plant);
  await reloadAndHelp(page, size, plant);
  await titleWatchRun(page, size, plant);
  await week17WatchRun(browser, size);

  /* 16: the old button, on the morning of Week 17, goes straight to the recap as it always did */
  await loadSave(page, FIXTURES.A);
  await pressAt(page, '[data-press="old"]');
  await page.waitForTimeout(600);
  const s16 = JSON.parse((await saved(page)).raw);
  const p16 = await po(page);
  say(16, p16.recap && !('playoffs' in s16) && s16.league.champions.some(c => c.season === s16.league.season) && ['recap', 'fired'].includes(s16.phase), `${size.w}: "Play the final week + playoffs" goes straight to the recap (phase ${s16.phase}, champion ${s16.postseason?.champion})`);
  const real = realErrors(errors);
  say(0, real.length === 0, `${size.w}, the playoffs: no page error (${real.length ? real[0].slice(0, 160) : 'clean'})`);
  await ctx.close();
}

let crashed = null;
const browser = await chromium.launch();
try {
  for (const size of SIZES) await walk(browser, size);
  await reducedWalk(browser, SIZES[1]);
  await ownerAndSeedWalk(browser, SIZES[1]);
  for (const size of SIZES) await playoffsWalk(browser, size);
  await revealPass(browser, { w: 1280, h: 900 });
  await landscapePass(browser, { w: 844, h: 390 });
} catch (e) {
  crashed = e;
} finally {
  await browser.close();
}
if (crashed) {
  console.error(`playFrontOfficeGameDay: THE WALK COULD NOT RUN TO ITS END: ${String(crashed && crashed.stack ? crashed.stack : crashed).slice(0, 700)}`);
  console.log(`playFrontOfficeGameDay: ${checks} checks before it stopped, ${failures} failed. ABORTED, this is not a result.`);
  process.exit(2);
}
console.log(`\nplayFrontOfficeGameDay: ${checks} checks, ${failures} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
if (CONTROL) {
  const named = CONTROLS[CONTROL];
  const fired = redPoints.has(named) && [...redPoints].every(p => p === named);
  console.log(fired ? `control ${CONTROL}: RED AT THE NAMED CHECK (point ${named}) and nowhere else` : `control ${CONTROL}: DID NOT FIRE as named (point ${named} wanted; red points: ${[...redPoints].join(', ') || 'none'})`);
  process.exit(fired ? 1 : 3);
}
process.exit(failures > 0 ? 1 : 0);
