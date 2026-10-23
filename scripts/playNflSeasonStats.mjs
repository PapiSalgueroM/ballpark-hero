/**
 * Round 1542 browser harness: who scored, the season card, the award history
 * and the badge, on the NFL Front Office in a real Chromium on a served build,
 * at 320 by 640, 390 by 844 and 1280 by 900.
 *
 * The unit tests hold what the lib credits and what the board saves
 * (src/lib/nflSeasonStats.test.ts, FrontOfficeSeasonStats.test.tsx); the fleet
 * harness holds the rules (scripts/simNflSeasonStats.mjs). Only a browser can
 * say where things are and whether a phone can read them. Math.random is
 * seeded in the page; the database host and the ad hosts are blocked.
 *
 * WHAT IT ASKS, at every size:
 *   a a new franchise started through the screen plays Week 1, 2 and 3: after
 *     each press the tile's Touchdowns list names a man for every touchdown,
 *     as many rows as the story of the saved game has touchdowns (told here,
 *     in node, from the log entry read off the save, by the Game Day law), and
 *     the Game Day box keeps its height. The page's scrollY and its height are
 *     printed either side of each press, not held: the week's feed and its
 *     sixteen scores under the box move them, an earlier round's doing;
 *   b a save planted at Week 17 (built here in node by the lib on a seeded
 *     league, the board's way: never typed) plays the final week and the
 *     playoffs in one press: the recap draws the season card, its awards tab
 *     names three awards (a winner or why not in each), and the sim note is
 *     on every one of its three tabs;
 *   c a save planted in Week 9 of its second season, with the first season's
 *     awards in its history and his club the MVP's: Standings opens on the
 *     table, and its This season face draws the season so far and the award
 *     history with the first season's line (his club is that of a first season
 *     winner still on a roster after the summer);
 *   d its Roster box: a first season winner's row carries the sim badge;
 *   e on every face above: no horizontal overflow; every button this round
 *     adds is 44 px high or more; every text this round adds is 12 px or more
 *     and is not cut (the shared season card's own classes and the badge,
 *     which matches the roster row's 10 px line, are the brief's open
 *     question 5: measured and printed, not held).
 *
 * CONTROLS (a second build of a mutated copy, served on another port; the
 * request line makes it): PLAY_NFL_STATS_CONTROL=nonames (the board hands the
 * tile no credits: point a red) and =nocard (the recap's card mount taken
 * out: point b red). Exit 0 green, 1 red or a control that fired at its
 * point, 2 could not run, 3 a control that did not fire.
 *
 * Pictures: with RC_OUT set, one png a point a size (nss-<width>-<point>.png).
 *
 * Run: a served build (scripts/lib/hostLikeServer.mjs) on BASE, then
 *      ENGINES=chromium node scripts/playNflSeasonStats.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { bundle, seededGen, withMathRandom } from './lib/gmGameDayFleet.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.PLAY_NFL_STATS_CONTROL || '';
const CONTROLS = { nonames: 'a', nocard: 'b' };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`playNflSeasonStats: unknown control "${CONTROL}"`); process.exit(2); }
const OUT = process.env.RC_OUT || '';
const SAVE_KEY = 'front-office-save-v1';
const SIZES = [{ w: 320, h: 640 }, { w: 390, h: 844 }, { w: 1280, h: 900 }];
const BLOCK = [/supabase\.co/, /googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/];

let checks = 0;
let failures = 0;
const redPoints = new Set();
const say = (point, ok, what) => {
  checks += 1;
  if (!ok) { failures += 1; redPoints.add(point); }
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} (${point}) ${what}`);
};
const shot = async (page, size, point) => { if (OUT) await page.screenshot({ path: path.join(OUT, `nss-${size.w}-${point}.png`), fullPage: false }); };
/** A picture of one element (the part a point is about), beside the screen's. */
const shotEl = async (page, size, point, sel) => { const el = OUT ? await page.$(sel) : null; if (el) await el.screenshot({ path: path.join(OUT, `nss-${size.w}-${point}-part.png`) }).catch(() => {}); };

/* ─── node side: the engine, the lib and the Game Day law, for the planted saves and the story of a saved game ─── */
let M;
try {
  ({ M } = await bundle([
    "export * as E from './src/lib/frontOffice.ts';",
    "export * as S from './src/lib/nflSeasonStats.ts';",
    "export * as A from './src/lib/nflSeasonAwards.ts';",
    "export * as B from './src/lib/frontOfficeGameDay.ts';",
    "export * as D from './src/lib/gmGameDay.ts';",
    "export { NFL_GAME_DAY } from './src/lib/gameLaws/nflGameDay.ts';",
  ], [], 'walk'));
} catch (e) { console.error(`playNflSeasonStats: could not bundle: ${e.message}`); process.exit(2); }

/** The touchdowns of a saved game's story, by the Game Day law (a harness may read the story; a board may not). */
const storyTds = g => {
  const st = M.D.gameStory(M.NFL_GAME_DAY, g, 'home');
  return st ? st.game.events.filter(e => e.kind === 'td').length : -1;
};

/** A season the board's way in node, weeks `from` to `to`, recording (the board's playWeek with no desk). */
function playWeeks(lg, user, from, to) {
  const { E, S, B } = M;
  for (let w = from; w <= to; w += 1) {
    E.injuryPass(lg.teams, Math.random);
    E.aiWeeklyMoves(lg, user, Math.random);
    const games = lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, Math.random));
    S.nflRecordWeek(lg, games.map(g => B.nflTell(g, lg.teams, lg.season, B.nflWhere(lg.week)).last).filter(Boolean), user);
    lg.week += 1;
  }
}
const shape = (league, myTeam) => ({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });

/** b: a fifteen man league at the morning of Week 17, its lines kept from Week 1. */
function plantWeek17() {
  const gen = seededGen('play nfl season stats|week 17');
  return withMathRandom(gen, () => {
    const lg = M.E.initLeague(Math.random, {});
    const user = Object.keys(lg.teams)[5];
    playWeeks(lg, user, 1, 16);
    return shape(lg, user);
  }).value;
}
/** c and d: a league in Week 9 of its second season, the first closed with its awards, his club the MVP's. */
function plantSecondSeason() {
  /* a first season's only award is its MVP (no class drafted yet), and he can retire in the summer: the first seed
     whose winner is still on a roster is taken (the same one every run) */
  let out = null;
  for (let k = 0; k < 30 && !(out && out.badge); k += 1) out = plantSecondSeasonOf(`play nfl season stats|second season|${k}`);
  return out;
}
function plantSecondSeasonOf(key) {
  const gen = seededGen(key);
  return withMathRandom(gen, () => {
    const { E, S, A } = M;
    const lg = E.initLeague(Math.random, {});
    let user = Object.keys(lg.teams)[9];
    playWeeks(lg, user, 1, 17);
    lg.week = E.REGULAR_WEEKS;
    const { champion } = E.runPlayoffs(lg.teams, Math.random);
    lg.champions.push({ season: lg.season, team: champion });
    const closed = A.nflCloseSeasonStats(lg);
    E.runOffseason(lg, Math.random, user);
    /* the badge's man: a first season winner still on a roster after the summer (a winner can retire in it) */
    const winners = S.nflAwardList(closed).map(([k, m]) => ({ id: m.id, name: m.name, label: `${closed.season} ${S.NFL_AWARD_LABEL[k]}` }));
    const holder = winners.map(w => ({ w, club: Object.values(lg.teams).find(t => t.players.some(p => p.id === w.id)) })).find(x => x.club);
    if (holder) user = holder.club.abbr;
    playWeeks(lg, user, 1, 8);
    return { save: { ...shape(lg, user), seasonsPlayed: 1 }, closed, badge: holder ? holder.w : null };
  }).value;
}

/* ─── page side ─── */
async function newPage(browser, size, seed = 20261542) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, seed);
  const page = await ctx.newPage();
  for (const host of BLOCK) await page.route(host, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), SAVE_KEY);
/** A save planted from a page of the same origin (robots.txt is a file, so no app runs and writes over it). */
async function plant(page, save) {
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [SAVE_KEY, JSON.stringify(save)]);
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await answerConsent(page); await page.waitForTimeout(300);
}
async function startFranchise(page) {
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await answerConsent(page); await page.waitForTimeout(300);
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
}
const openTile = async (page, text) => { await page.locator(`button:has-text("${text}")`).first().click(); await page.waitForTimeout(500); };
const toHub = async page => { const hub = page.locator('button:has-text("Hub")').first(); if (await hub.count()) { await hub.click(); await page.waitForTimeout(300); } };

/** The layout of what this round draws, inside `root` (a selector): overflow, buttons, text sizes and cut text. */
async function layout(page, roots, exempt) {
  return page.evaluate(([sel, ex]) => {
    const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, low: [], small: [], cut: [], exemptSmall: [] };
    for (const root of document.querySelectorAll(sel)) {
      for (const b of root.querySelectorAll('button')) { const r = b.getBoundingClientRect(); if (r.height < 44 && !b.closest(ex)) out.low.push(`${(b.textContent || '').trim().slice(0, 24)} ${Math.round(r.height)}`); }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = (n.textContent || '').trim();
        if (!t) continue;
        const el = n.parentElement;
        const px = parseFloat(getComputedStyle(el).fontSize);
        const where = el.closest(ex) ? out.exemptSmall : out.small;
        if (px < 12) where.push(`${t.slice(0, 30)} ${px}px`);
        const cs = getComputedStyle(el);
        if (!el.closest(ex) && cs.display !== 'inline' && cs.overflowX !== 'auto' && el.scrollWidth > el.clientWidth + 1) out.cut.push(t.slice(0, 30));
      }
    }
    return out;
  }, [roots, exempt]);
}
function sayLayout(size, face, f) {
  say('e', f.overflow <= 0, `${size.w}, ${face}: no horizontal overflow (${f.overflow} px)`);
  say('e', f.low.length === 0, `${size.w}, ${face}: every button this round adds is 44 px high${f.low.length ? `: ${f.low.slice(0, 3).join('; ')}` : ''}`);
  say('e', f.small.length === 0, `${size.w}, ${face}: every text this round adds is 12 px or more${f.small.length ? `: ${f.small.slice(0, 3).join('; ')}` : ''}`);
  say('e', f.cut.length === 0, `${size.w}, ${face}: nothing this round adds is cut${f.cut.length ? `: ${f.cut.slice(0, 3).join('; ')}` : ''}`);
  if (f.exemptSmall.length) console.log(`  (open question 5, printed) ${size.w}, ${face}: ${f.exemptSmall.length} texts under 12 px in the shared card or the badge, e.g. ${f.exemptSmall.slice(0, 2).join('; ')}`);
}
const EXEMPT = '[data-season-stats], [data-award-badge]';

const box = page => page.evaluate(() => ({ y: Math.round(window.scrollY), h: document.documentElement.scrollHeight, box: Math.round(document.querySelector('[data-gameday-box]')?.getBoundingClientRect().height ?? -1) }));

/* a: a new franchise, three presses, the Touchdowns list against the story of the saved game */
async function pointA(browser, size) {
  const { ctx, page, errors } = await newPage(browser, size);
  await startFranchise(page);
  await openTile(page, 'This week');
  await page.waitForSelector('[data-gameday]', { timeout: 20000 });
  let named = 0;
  for (const w of [1, 2, 3]) {
    const before = await box(page);
    await page.locator('[data-press="week"]').first().click();
    await page.waitForSelector('[data-gameday-face="result"]', { timeout: 20000 });
    await page.waitForTimeout(700);
    const after = await box(page);
    const sv = await saved(page);
    const games = sv?.gameLog?.games ?? [];
    const last = games[games.length - 1];
    const want = last ? storyTds(last) : -1;
    const rows = await page.$$eval('[data-gameday-scorer]', els => els.map(e => (e.textContent || '').trim()));
    named += rows.length;
    say('a', !!last && want >= 0 && rows.length === want, `${size.w}, Week ${w}: a row for every touchdown of the saved game's story (${rows.length} rows, the story ${want})`);
    say('a', rows.every(r => / to .|.runs it in/.test(r)), `${size.w}, Week ${w}: every row names a man${rows[0] ? ` (${rows[0].slice(0, 60)})` : ''}`);
    say('a', !!last && !!sv.league.stats?.plays?.[last.key], `${size.w}, Week ${w}: the save keeps his game's credits under its key`);
    say('a', before.box === after.box && after.box > 0, `${size.w}, Week ${w}: the Game Day box keeps its height (${before.box} then ${after.box})`);
    /* printed, not held: the page's height moves with the week's feed and scores under the box, an earlier round's */
    console.log(`  (printed) ${size.w}, Week ${w}: scrollY ${before.y} then ${after.y}, page height ${before.h} then ${after.h}`);
  }
  say('a', named > 0, `${size.w}: the three games named ${named} scorers`);
  const list = await page.$('[data-gameday-scorers]');
  if (list) await list.scrollIntoViewIfNeeded();
  await shot(page, size, 'a');
  await shotEl(page, size, 'a', '[data-gameday-box]');
  sayLayout(size, 'the tile', await layout(page, '[data-gameday-scorers]', EXEMPT));
  say('e', errors.length === 0, `${size.w}, a: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

/* b: the final week and the playoffs from a planted Week 17, the recap's card */
async function pointB(browser, size) {
  const { ctx, page, errors } = await newPage(browser, size);
  await plant(page, plantWeek17());
  await openTile(page, 'This week');
  await page.waitForFunction(() => { const b = document.querySelector('[data-press="old"]'); return !!b && !b.disabled; }, null, { timeout: 30000 });
  await page.locator('[data-press="old"]').click();
  await page.waitForSelector('[data-verdict-reveal]', { timeout: 30000 });
  const card = await page.waitForSelector('[data-nfl-season="close"] [data-season-stats]', { timeout: 20000 }).catch(() => null);
  say('b', !!card, `${size.w}: the recap draws the season card`);
  if (card) {
    const awards = await page.$$eval('[data-stats-awards] > div', els => els.map(e => (e.textContent || '').trim()));
    say('b', awards.length === 3 && awards.every(a => a.includes('Rule: ')), `${size.w}: the awards tab names three awards, each a winner or nobody, with its rule (${awards.map(a => a.slice(0, 28)).join(' | ')})`);
    for (const tab of ['Awards', 'Leaders', 'Your lines']) {
      await page.locator(`[data-season-stats] button[role="tab"]:has-text("${tab}")`).click();
      await page.waitForTimeout(200);
      const note = await page.$eval('[data-season-stats] [data-sim-note]', e => e.textContent || '').catch(() => '');
      say('b', note.startsWith('Sim season: ') && note.endsWith('not real NFL stats.'), `${size.w}: the sim note is on the ${tab} tab`);
    }
    await card.scrollIntoViewIfNeeded();
  }
  await shot(page, size, 'b');
  await shotEl(page, size, 'b', '[data-nfl-season]');
  sayLayout(size, 'the recap card', await layout(page, '[data-nfl-season]', EXEMPT));
  say('e', errors.length === 0, `${size.w}, b: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

/* c and d: Standings' two faces and the history, then the MVP's badge on the Roster box */
async function pointCD(browser, size, second) {
  const { ctx, page, errors } = await newPage(browser, size);
  await plant(page, second.save);
  await openTile(page, 'Standings');
  const faces = await page.$('[data-standings-faces]');
  say('c', !!faces && !(await page.$('[data-nfl-season]')), `${size.w}: Standings opens on the table, with its two faces`);
  await page.locator('[data-standings-faces] button:has-text("This season")').click();
  const live = await page.waitForSelector('[data-nfl-season="live"] [data-season-stats]', { timeout: 20000 }).catch(() => null);
  say('c', !!live, `${size.w}: This season draws the season so far`);
  const hist = await page.$eval('[data-award-history]', e => e.textContent || '').catch(() => '');
  say('c', hist.includes(`${second.closed.season}`) && hist.includes(`MVP ${second.closed.mvp.name}`) && hist.includes('Sim seasons, not real NFL history.'), `${size.w}: the award history holds the first season's line (${hist.slice(0, 90)})`);
  await shot(page, size, 'c');
  await shotEl(page, size, 'c', 'div:has(> [data-standings-faces])');
  sayLayout(size, 'Standings', await layout(page, '[data-standings-faces], [data-award-history], [data-season-stats-pending]', EXEMPT));
  await toHub(page);
  await openTile(page, 'Roster');
  const bid = second.badge ? second.badge.id : "no-winner";
  const badge = await page.$eval(`[data-roster-row="${bid}"] [data-award-badge]`, e => ({ text: e.textContent || '', title: e.getAttribute('title') || '' })).catch(() => null);
  say('d', !!badge && badge.text.includes(`Sim ${second.badge?.label}`) && badge.title.includes("This save's sim awards, not real NFL ones"), `${size.w}: the MVP's roster row carries the sim badge${badge ? ` (${badge.text.trim()})` : ''}`);
  const row = await page.$(`[data-roster-row="${bid}"]`);
  if (row) await row.scrollIntoViewIfNeeded();
  await shot(page, size, 'd');
  await shotEl(page, size, 'd', `[data-roster-row="${bid}"]`);
  say('e', errors.length === 0, `${size.w}, c and d: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

/* ─── run ─── */
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const second = plantSecondSeason();
say('c', !!second.closed && !!second.closed.mvp && !!second.badge, `the planted second season has its first season's awards and a winner still on a roster (${second.badge ? `${second.badge.name}, ${second.badge.label}` : 'none'})`);
let browser;
try { browser = await chromium.launch(); } catch (e) { console.error(`playNflSeasonStats: no browser: ${e.message}`); process.exit(2); }
try {
  for (const size of SIZES) {
    console.log('');
    console.log(`${size.w} by ${size.h}`);
    await pointA(browser, size);
    await pointB(browser, size);
    await pointCD(browser, size, second);
  }
} catch (e) {
  console.error(`playNflSeasonStats: the walk broke: ${e.stack || e.message}`);
  await browser.close();
  process.exit(2);
}
await browser.close();
console.log('');
const red = [...redPoints].sort();
if (CONTROL) {
  const aim = CONTROLS[CONTROL];
  const ok = red.includes(aim) && red.every(p => p === aim);
  console.log(ok ? `control ${CONTROL}: FIRED at point ${aim}` : `control ${CONTROL}: DID NOT FIRE as aimed (points red: ${red.join(', ') || 'none'})`);
  console.log(`playNflSeasonStats: ${checks} checks, ${failures} failed (control ${CONTROL})`);
  process.exit(ok ? 1 : 3);
}
console.log(`playNflSeasonStats: ${checks} checks, ${failures} failed${red.length ? ` (points red: ${red.join(', ')})` : ''}`);
process.exit(failures ? 1 : 0);
