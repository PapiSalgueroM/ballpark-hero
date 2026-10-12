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
 *     bug only ever climbs to the final. At full time the page moves on and
 *     the save is the very string the press wrote;
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
 *     every button of the week box is at least 44 px high.
 *
 * NEGATIVE CONTROLS (FO_GAMEDAY_WALK_CONTROL=). Each plants ONE thing in the
 * page, in the 390 walk, and names the point that must go red. A control run
 * exits 1 and its LAST LINE says "RED AT THE NAMED CHECK" (fired) or "DID NOT
 * FIRE"; a walk that could not run exits 2.
 *   recordspoils  his new record written into the Record chip during a watch   point 3
 *   spoiler       the final written into the week box during a watch           point 3
 *   tall          a 300 px block put in the tile outside its scroller          point 8
 * (The hold itself removed from the board is a control of the unit test:
 * node scripts/controlFrontOfficeBoard.mjs recordspoils.)
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

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.FO_GAMEDAY_WALK_CONTROL || '';
const CONTROLS = { recordspoils: 3, spoiler: 3, tall: 8 };
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
    week: txt('[data-week-chip]'), record: txt('[data-record-chip]'), matchup: txt('[data-week-matchup]'),
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
  const SCROLLS = '[data-gameday-scroll], [data-clock-events]';
  const bad = [], small = [];
  let seen = 0;
  const nameOf = el => `${el.tagName.toLowerCase()}${[...el.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}]`).join('')}.${String(el.className).split(' ').slice(0, 3).join('.')}`;
  for (const el of [box, ...box.querySelectorAll('*')]) {
    if (el.closest('.sr-only') || el.closest('[data-season-help]')) continue;
    seen += 1;
    if (el.clientHeight > 0 && !el.matches(SCROLLS) && el.scrollHeight > el.clientHeight + 1) bad.push(`${nameOf(el)} is ${el.scrollHeight} tall in a frame of ${el.clientHeight}`);
    if (el.clientWidth > 0 && !el.matches('[data-gameday-chips]') && el.scrollWidth > el.clientWidth + 1) bad.push(`${nameOf(el)} is ${el.scrollWidth} wide in a frame of ${el.clientWidth}`);
    const inner = el.parentElement ? el.parentElement.closest(`${SCROLLS}, [data-gameday-chips]`) : null;
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
async function newPage(browser, size, reduced = false) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, ...(reduced ? { reducedMotion: 'reduce' } : {}) });
  await ctx.addInitScript(() => { let s = 20261307; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });
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
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count() > 0) { await essential.first().click(); await page.waitForTimeout(300); }
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
}

/** One watched week, sampled until full time. `speed`: the chip pressed after `after` samples (null: let the clock run). */
async function watchWeek(page, size, point, { after = 0, speed = null, plant = '', label }) {
  const b = await state(page);
  const svB = await saved(page);
  await page.locator('[data-watch-week]').click();
  const svP = await saved(page);
  const f = finals(svP);
  const forbidden = [['the final', f.bare], ['his new record', `Record ${svP.record}`], ['the next week', `Week ${svP.week}/17`], ['the next Play label', `Play Week ${svP.week}`]];
  const spoiled = [];
  let samples = 0, bug = [0, 0];
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
      }
      if (speed && samples === after) await page.locator(`[data-gameday-speed="${speed}"]`).click();
    }
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => document.querySelectorAll('[data-planted]').forEach(n => n.remove()));
  await page.waitForTimeout(900);
  const a = await state(page);
  const svA = await saved(page);
  say(point, samples >= 2 && spoiled.length === 0, `${size.w}, ${label}: until full time the whole page held nothing of the result (${samples} samples, ${((Date.now() - t0) / 1000).toFixed(1)} s, the bug ended on ${bug.join('-')} of ${f.home}-${f.away})${spoiled.length ? `: ${[...new Set(spoiled)].slice(0, 3).join('; ')}` : ''}`);
  say(point, a.face === 'result' && !a.clock && a.final === f.tile && a.grid === 16 && a.week.includes(`Week ${svP.week}/17`) && a.record === `Record ${svP.record}` && !!a.play && !a.play.disabled && a.play.text.endsWith(`Week ${svP.week}`),
    `${size.w}, ${label}: at full time the tile shows the saved final (${a.final}) and the page has moved on (${a.week}, ${a.record})`);
  say(point, svA.raw === svP.raw && svP.n === svB.n + 1 && svP.week === svB.week + 1, `${size.w}, ${label}: the press saved the week once and the watch saved nothing (the save at full time is the string the press wrote, ${svP.raw.length} bytes)`);
  say(point, a.box.top >= -2 && inView(a) >= MIN_LEAD && a.box.height === b.box.height, `${size.w}, ${label}: the tile stayed in view and the same size: scrollY ${b.scrollY} to ${a.scrollY}, its top at ${a.box.top} of ${a.vh}, ${inView(a)} px showing`);
  await fit(page, size, `${label}, full time`);
  await shot(page, size, `${label}-fulltime`);
  return a;
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
  const plant = size.w === 390 ? CONTROL : '';

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
  note(`${size.w}: measured after Play: the tile's top ${s1.box.top} before and ${a2.box.top} after, the Play button's top ${a2.play?.top}, the grid's first row at ${a2.gridTop}, the story ${a2.scroller?.content} px in a frame of ${a2.scroller?.frame}`);
  if (plant === 'tall') await page.evaluate(() => { const root = document.querySelector('[data-gameday]'); const d = document.createElement('div'); d.setAttribute('data-planted', ''); d.style.cssText = 'height:300px;flex-shrink:0'; root.insertBefore(d, root.firstChild); });
  await fit(page, size, 'the result after Play');
  await shot(page, size, '2-played');
  if (plant === 'tall') await page.evaluate(() => document.querySelector('[data-planted]')?.remove());

  /* 3: Watch (the clock left to run at 320, 3x elsewhere), then 4: Results */
  await watchWeek(page, size, 3, size.w === 320 ? { label: '3-watch-1x' } : { after: 3, speed: '3x', plant, label: '3-watch-3x' });
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

  /* 6: the "?" */
  await page.locator('[data-gameday-help]').click();
  await page.waitForTimeout(500);
  const helpOf = () => {
    const sheet = document.querySelector('[data-season-help]'), wb = document.querySelector('[data-week-box]');
    if (!sheet || !wb) return null;
    const a = sheet.getBoundingClientRect(), b = wb.getBoundingClientRect();
    return { child: sheet.parentElement?.parentElement === wb && sheet.parentElement.hasAttribute('data-gameday-help-host'), inTile: !!sheet.closest('[data-gameday-box]'), dw: Math.round(Math.abs(a.width - b.width)), dh: Math.round(Math.abs(a.height - b.height)), text: sheet.innerText, y: Math.round(window.scrollY), height: Math.round(a.height) };
  };
  const h = await page.evaluate(helpOf);
  say(6, !!h && h.child && !h.inTile && h.dw <= 3 && h.dh <= 3 && h.text.includes('Real: a touchdown is 6') && h.text.includes('A worked example') && h.text.includes('Got it'), `${size.w}: the "?" is drawn over the whole week box and not inside the tile, with the law's words and a worked example (the sheet is ${h?.height} px high, ${h?.dw} px narrower and ${h?.dh} px shorter than the box's own frame; in the box's host: ${h?.child}; inside the tile: ${h?.inTile})`);
  /* the reveal hook's own measure of "already readable": the top on screen with 160 px of the box showing */
  const readable = aM.weekTop !== null && aM.weekTop >= 0 && aM.vh - aM.weekTop >= MIN_LEAD;
  say(6, !!h && (!readable || h.y === aM.scrollY), `${size.w}: opening the "?" over a week box whose top was readable did not move the page (the box's top at ${aM.weekTop} of ${aM.vh}, readable: ${readable}; scrollY ${aM.scrollY} before and ${h?.y} with the sheet open)`);
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

let crashed = null;
const browser = await chromium.launch();
try {
  for (const size of SIZES) await walk(browser, size);
  await reducedWalk(browser, SIZES[1]);
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
