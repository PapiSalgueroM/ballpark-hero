// Round 1542 review (run lens): play who scored on the NFL Front Office like a player, on the runner.
// BASE = this head's served dist; OLD_BASE = the base c9d188972's dist (old saves are made there, by playing).
// Sizes 390x844 and 1280x900, reduced motion on and off. Screenshots into RC_OUT. Supabase and ad hosts blocked.
// Exit 0 when every held check is green, 1 otherwise. Printed lines start with "  (printed)".
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { bundle, seededGen, withMathRandom } from '../../scripts/lib/gmGameDayFleet.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OLD = process.env.OLD_BASE || '';
const OUT = process.env.RC_OUT || '/tmp/rvwalk';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'front-office-save-v1';
const BLOCK = [/supabase\.co/, /googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/];
let checks = 0, fails = 0;
const say = (part, ok, what) => { checks += 1; if (!ok) fails += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} [${part}] ${what}`); };
const note = s => console.log(`  (printed) ${s}`);
const shot = async (page, name, full = false) => { await page.screenshot({ path: path.join(OUT, `rv-${name}.png`), fullPage: full }).catch(e => note(`shot ${name} failed ${e.message}`)); };
const shotEl = async (page, name, sel) => { const el = await page.$(sel); if (el) await el.screenshot({ path: path.join(OUT, `rv-${name}.png`) }).catch(e => note(`shotEl ${name} failed ${e.message}`)); else note(`shotEl ${name}: no ${sel}`); };

let M;
try {
  ({ M } = await bundle([
    "export * as E from './src/lib/frontOffice.ts';",
    "export * as S from './src/lib/nflSeasonStats.ts';",
    "export * as B from './src/lib/frontOfficeGameDay.ts';",
    "export * as D from './src/lib/gmGameDay.ts';",
    "export { NFL_GAME_DAY } from './src/lib/gameLaws/nflGameDay.ts';",
  ], [], 'rvwalk'));
} catch (e) { console.error(`rvwalk: could not bundle: ${e.message}`); process.exit(2); }
const storyTds = (g, side) => { const st = M.D.gameStory(M.NFL_GAME_DAY, g, 'home'); return st ? st.game.events.filter(e => e.kind === 'td' && (!side || e.side === side)).length : -1; };

async function newPage(browser, size, reduced, seed = 15421542) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, seed);
  const page = await ctx.newPage();
  for (const host of BLOCK) await page.route(host, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { ctx, page, errors };
}
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
async function plant(page, base, save) {
  await page.goto(`${base}/robots.txt`);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [KEY, typeof save === 'string' ? save : JSON.stringify(save)]);
  await page.goto(`${base}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await answerConsent(page); await page.waitForTimeout(300);
}
async function startFranchise(page, base) {
  await page.goto(`${base}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await answerConsent(page); await page.waitForTimeout(300);
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(1000);
}
const openTile = async (page, text) => { await page.locator(`button:has-text("${text}")`).first().click(); await page.waitForTimeout(600); };
const toHub = async page => { const hub = page.locator('button:has-text("Hub")').first(); if (await hub.count()) { await hub.click(); await page.waitForTimeout(400); } };
const face = page => page.$eval('[data-gameday]', e => e.getAttribute('data-gameday-face')).catch(() => null);
async function pressWeek(page) {
  await page.waitForFunction(() => { const b = document.querySelector('[data-press="week"]'); return !!b && !b.disabled; }, null, { timeout: 30000 });
  await page.locator('[data-press="week"]').first().click();
  await page.waitForSelector('[data-gameday-face="result"]', { timeout: 30000 });
  await page.waitForTimeout(700);
}
const scorerRows = page => page.$$eval('[data-gameday-scorer]', els => els.map(e => ({ clock: (e.children[0]?.textContent || '').trim(), text: (e.children[1]?.textContent || '').trim(), after: (e.children[2]?.textContent || '').trim() })));
/** Every name on the tile's rows is a man of that row's club in the saved league (roster or practice squad). */
function namesOnClub(rows, league) {
  const bad = [];
  for (const r of rows) {
    const [club, ...rest] = r.text.split(' ');
    const words = rest.join(' ');
    const t = league.teams[club];
    const men = t ? [...t.players, ...(t.practice ?? [])].map(p => p.name) : [];
    const m = words.match(/^(.+) to (.+)$/) || words.match(/^(.+) runs it in$/);
    const names = m ? m.slice(1) : [];
    if (!t || names.length === 0 || names.some(n => !men.includes(n))) bad.push(r.text);
  }
  return bad;
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const scrollY = page => page.evaluate(() => Math.round(window.scrollY));

/* OLD: a save made by PLAYING the base build (no lines), loaded and played on this head */
async function partOld(browser) {
  if (!OLD) { note('OLD_BASE not set: the old save part is skipped'); return; }
  const size = { w: 390, h: 844 };
  const b = await newPage(browser, size, false);
  await startFranchise(b.page, OLD);
  await openTile(b.page, 'This week');
  const y0 = await scrollY(b.page);
  await pressWeek(b.page);
  note(`base 390: scrollY around the Week 1 press ${y0} then ${await scrollY(b.page)}`);
  for (let w = 2; w <= 4; w += 1) await pressWeek(b.page);
  const mid = await b.page.evaluate(k => localStorage.getItem(k), KEY);
  const midObj = JSON.parse(mid || 'null');
  say('old', !!midObj && midObj.league && midObj.league.stats === undefined && midObj.league.week === 5, `the base build saved a Week 5 save with no lines (week ${midObj?.league?.week})`);
  say('old', b.errors.length === 0, `the base build played with no page error ${b.errors[0] ?? ''}`);
  await b.ctx.close();
  const h = await newPage(browser, size, false);
  await plant(h.page, BASE, mid);
  await openTile(h.page, 'This week');
  const miss = await h.page.$eval('[data-gameday-scorers-missing]', e => e.textContent || '').catch(() => '');
  say('old', miss === 'Who scored was not kept for this game.', `the old save's last game says who scored was not kept ("${miss}")`);
  await shotEl(h.page, 'old-390-tile-loaded', '[data-gameday-box]');
  await pressWeek(h.page);
  const after = await saved(h.page);
  say('old', after && after.league.week === 6 && after.league.stats === undefined && after.league.awards === undefined, `Week 5 played on the head: week ${after?.league?.week}, no block written (${after?.league?.stats === undefined})`);
  const miss2 = await h.page.$eval('[data-gameday-scorers-missing]', e => e.textContent || '').catch(() => '');
  note(`old save, the head's own Week 5 game: "${miss2}" rows ${(await scorerRows(h.page)).length}`);
  await shotEl(h.page, 'old-390-tile-week5', '[data-gameday-box]');
  await toHub(h.page);
  await openTile(h.page, 'Standings');
  await h.page.locator('[data-standings-faces] button:has-text("This season")').click();
  await h.page.waitForTimeout(1500);
  const pend = await h.page.$eval('[data-season-stats-pending]', e => e.textContent || '').catch(() => '');
  say('old', pend.startsWith('This save started before season lines were kept'), `Standings' This season says why there are no lines ("${pend.slice(0, 90)}")`);
  await shot(h.page, 'old-390-standings');
  say('old', h.errors.length === 0, `the head loaded and played the old save with no page error ${h.errors[0] ?? ''}`);
  /* the same old save played to its recap on the BASE, then opened on the head */
  const b2 = await newPage(browser, size, false);
  await plant(b2.page, OLD, mid);
  await openTile(b2.page, 'This week');
  for (let w = 5; w <= 16; w += 1) await pressWeek(b2.page);
  await b2.page.waitForFunction(() => { const x = document.querySelector('[data-press="old"]'); return !!x && !x.disabled; }, null, { timeout: 30000 });
  await b2.page.locator('[data-press="old"]').click();
  await b2.page.waitForSelector('[data-verdict-reveal]', { timeout: 30000 }).catch(() => null);
  const recap = await b2.page.evaluate(k => localStorage.getItem(k), KEY);
  note(`base recap save phase ${JSON.parse(recap || '{}').phase}`);
  await b2.ctx.close();
  const h2 = await newPage(browser, size, false);
  await plant(h2.page, BASE, recap);
  const card = await h2.page.waitForSelector('[data-nfl-season="close"]', { timeout: 15000 }).catch(() => null);
  const pend2 = card ? await h2.page.$eval('[data-nfl-season="close"] [data-season-stats-pending]', e => e.textContent || '').catch(() => '') : '';
  say('old', pend2.startsWith('This save started before season lines were kept'), `the old recap opens on the head and its card says why there are no lines ("${pend2.slice(0, 70)}")`);
  if (card) await card.scrollIntoViewIfNeeded();
  await shot(h2.page, 'old-390-recap');
  say('old', h2.errors.length === 0, `the old recap loaded with no page error ${h2.errors[0] ?? ''}`);
  await h.ctx.close(); await h2.ctx.close();
}

/* NEW: a new franchise on the head, the tile, Watch, the two "?", a reload, Standings' faces */
async function partNew(browser, size, reduced) {
  const tag = `${size.w}-${reduced ? 'rm' : 'mo'}`;
  const { ctx, page, errors } = await newPage(browser, size, reduced);
  await startFranchise(page, BASE);
  await openTile(page, 'This week');
  await page.waitForSelector('[data-gameday]', { timeout: 20000 });
  const y0 = await scrollY(page);
  await pressWeek(page);
  note(`${tag}: scrollY around the Week 1 press ${y0} then ${await scrollY(page)}`);
  let sv = await saved(page);
  let last = sv.gameLog.games[sv.gameLog.games.length - 1];
  let rows = await scorerRows(page);
  say('new', rows.length === storyTds(last) && rows.length > 0, `${tag} Week 1: a row for every touchdown of the story (${rows.length} rows, story ${storyTds(last)}): ${rows.slice(0, 2).map(r => `${r.clock} ${r.text} ${r.after}`).join(' | ')}`);
  let bad = namesOnClub(rows, sv.league);
  say('new', bad.length === 0, `${tag} Week 1: every name on a row is a man of that row's club ${bad.slice(0, 2).join(' | ')}`);
  const heading = await page.$eval('[data-gameday-scorers] > p', e => e.textContent || '').catch(() => '');
  say('new', heading === "Touchdowns in this save's game", `${tag}: the list's heading ("${heading}")`);
  const list = await page.$('[data-gameday-scorers]');
  if (list) await list.scrollIntoViewIfNeeded();
  await shotEl(page, `${tag}-tile-week1`, '[data-gameday-box]');
  /* Watch Week 2: no names while the clock runs, the names at full time */
  const watch = page.locator('[data-watch-week]').first();
  if (await watch.count()) {
    await watch.click();
    await page.waitForTimeout(1200);
    const f = await face(page);
    const during = await page.$('[data-gameday-scorers]');
    say('new', reduced ? f === 'result' : (f === 'watch' && !during), `${tag} Watch Week 2: face ${f}, list drawn while watching ${!!during}`);
    await shotEl(page, `${tag}-tile-watching`, '[data-gameday-box]');
    if (f === 'watch') {
      await page.locator('[data-gameday-speed="Results"]').click().catch(() => {});
      await page.waitForSelector('[data-gameday-face="result"]', { timeout: 120000 }).catch(() => null);
      await page.waitForTimeout(600);
    }
    sv = await saved(page);
    last = sv.gameLog.games[sv.gameLog.games.length - 1];
    rows = await scorerRows(page);
    say('new', (await face(page)) === 'result' && rows.length === storyTds(last), `${tag} Watch Week 2 at full time: ${rows.length} rows, story ${storyTds(last)}`);
    bad = namesOnClub(rows, sv.league);
    say('new', bad.length === 0, `${tag} Week 2: every name on a row is a man of that row's club ${bad.slice(0, 2).join(' | ')}`);
  } else note(`${tag}: no Watch button`);
  /* the Game Day "?" */
  await page.locator('[data-gameday-help]').first().click();
  await page.waitForTimeout(500);
  const help = await page.$eval('[data-season-help]', e => e.textContent || '').catch(() => '');
  say('new', help.includes("every touchdown goes to one of the club's starters") && help.includes('kickers and punters are not on these rosters') && !help.includes('No player is credited'), `${tag}: the Game Day "?" tells who scores (${help.length} chars)`);
  await shotEl(page, `${tag}-gameday-help`, '[data-gameday-box]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  /* a reload keeps the names */
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
  await openTile(page, 'This week');
  const rowsAgain = await scorerRows(page);
  say('new', rowsAgain.length === rows.length && rowsAgain.every((r, i) => r.text === rows[i]?.text), `${tag}: after a reload the tile names the same scorers (${rowsAgain.length})`);
  /* Standings: Table first, then This season with its three tabs */
  await toHub(page);
  await openTile(page, 'Standings');
  const tableFirst = !(await page.$('[data-nfl-season]'));
  say('new', tableFirst, `${tag}: Standings opens on the table`);
  await page.locator('[data-standings-faces] button:has-text("This season")').click();
  const live = await page.waitForSelector('[data-nfl-season="live"] [data-season-stats]', { timeout: 20000 }).catch(() => null);
  say('new', !!live, `${tag}: This season draws the season so far`);
  for (const tab of ['Awards', 'Leaders', 'Your lines']) {
    await page.locator(`[data-season-stats] button[role="tab"]:has-text("${tab}")`).click().catch(() => {});
    await page.waitForTimeout(300);
    await shotEl(page, `${tag}-standings-${tab.replace(' ', '')}`, 'div:has(> [data-standings-faces])');
  }
  const txt = await page.$eval('[data-nfl-season="live"]', e => e.textContent || '').catch(() => '');
  note(`${tag}: This season text: ${txt.slice(0, 260)}`);
  say('new', (await overflow(page)) <= 0, `${tag}: no horizontal overflow on Standings (${await overflow(page)})`);
  /* the page "?" */
  await page.getByRole('button', { name: 'How to play' }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  const rules = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map(d => d.textContent || '').join(' '));
  say('new', rules.includes('Who scored: every touchdown') && rules.includes('throws 65 of every 100') && rules.includes('1.78 times'), `${tag}: the page "?" carries the rules and the computed example`);
  await shot(page, `${tag}-page-help`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  say('new', errors.length === 0, `${tag}: no page error ${errors[0] ?? ''}`);
  await ctx.close();
}

/* node side: a league the board's way (no desk), recording, weeks from..to */
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
const shape = (league, myTeam, extra = {}) => ({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...extra });
/** A league at the morning of Week 17 with lines from Week 1; his club a likely playoff club. */
function plantWeek17(key) {
  return withMathRandom(seededGen(key), () => {
    const lg = M.E.initLeague(Math.random, {});
    const first = Object.keys(lg.teams)[0];
    playWeeks(lg, first, 1, 16);
    /* the fifth best record: in the bracket, and almost never a top seed with a first round bye */
    const best = Object.values(lg.teams).sort((a, b) => b.wins - a.wins || a.abbr.localeCompare(b.abbr))[4].abbr;
    return shape(lg, best);
  }).value;
}

/* RECAP: Play Week 17 opens the bracket, a round at a time then the rest (playPlayoffs), the recap's card */
async function partRecap(browser, size, reduced) {
  const tag = `${size.w}-${reduced ? 'rm' : 'mo'}`;
  const { ctx, page, errors } = await newPage(browser, size, reduced);
  const save = plantWeek17(`rv1542 recap ${tag}`);
  await plant(page, BASE, save);
  await openTile(page, 'This week');
  await pressWeek(page); /* Play Week 17: plays the week, opens the bracket */
  let sv = await saved(page);
  note(`${tag}: after Play Week 17 the save is at week ${sv.league.week}, bracket ${!!sv.playoffs}`);
  await page.waitForFunction(() => { const b = document.querySelector('[data-press="round"]'); return !!b && !b.disabled; }, null, { timeout: 30000 }).catch(() => null);
  if (await page.$('[data-press="round"]')) {
    await page.locator('[data-press="round"]').click();
    await page.waitForTimeout(1200);
    sv = await saved(page);
    const last = sv?.gameLog?.games?.[sv.gameLog.games.length - 1];
    const rows = await scorerRows(page);
    note(`${tag}: after one playoff round his last game is ${last?.key} (${last?.where})`);
    if (last && !/^w\d+$/.test(String(last.where))) {
      say('recap', rows.length === storyTds(last) && namesOnClub(rows, sv.league).length === 0, `${tag}: his playoff game's tile names every scorer (${rows.length} rows, story ${storyTds(last)})`);
      await shotEl(page, `${tag}-tile-playoff`, '[data-gameday-box]');
    }
    const lines = sv.league.stats ? Object.values(sv.league.stats.clubs).map(c => c[0]) : [];
    say('recap', lines.length === 32 && lines.every(g => g === 17), `${tag}: the club lines hold the 17 regular season games only after a playoff round (${[...new Set(lines)].join(',')})`);
  }
  await page.waitForFunction(() => { const b = document.querySelector('[data-press="rest"]'); return !!b && !b.disabled; }, null, { timeout: 30000 }).catch(() => null);
  if (await page.$('[data-press="rest"]')) await page.locator('[data-press="rest"]').click();
  await page.waitForSelector('[data-verdict-reveal]', { timeout: 30000 }).catch(() => null);
  const card = await page.waitForSelector('[data-nfl-season="close"] [data-season-stats]', { timeout: 20000 }).catch(() => null);
  say('recap', !!card, `${tag}: the recap draws the closed season's card`);
  sv = await saved(page);
  const hist = sv?.league?.awards ?? [];
  say('recap', hist.length === 1 && hist[0].season === sv.league.season && !!hist[0].mvp, `${tag}: the close named an MVP once (${hist.length} entries, MVP ${hist[0]?.mvp?.name} ${hist[0]?.mvp?.team} ${hist[0]?.mvp?.pos})`);
  if (card) {
    const awards = await page.$$eval('[data-stats-awards] > div', els => els.map(e => (e.textContent || '').trim()));
    note(`${tag}: award boxes: ${awards.map(a => a.slice(0, 110)).join(' || ')}`);
    await card.scrollIntoViewIfNeeded();
    await shotEl(page, `${tag}-recap-card`, '[data-nfl-season="close"]');
    for (const tab of ['Leaders', 'Your lines']) {
      await page.locator(`[data-season-stats] button[role="tab"]:has-text("${tab}")`).click().catch(() => {});
      await page.waitForTimeout(300);
      await shotEl(page, `${tag}-recap-${tab.replace(' ', '')}`, '[data-nfl-season="close"]');
    }
  }
  await shot(page, `${tag}-recap-screen`);
  const body = await page.evaluate(() => document.body.innerText);
  note(`${tag}: award feed lines on screen: ${(body.match(/🏅[^\n]*/g) || []).join(' | ') || 'none'}`);
  say('recap', (await overflow(page)) <= 0, `${tag}: no horizontal overflow on the recap (${await overflow(page)})`);
  say('recap', errors.length === 0, `${tag}: no page error ${errors[0] ?? ''}`);
  await ctx.close();
}

/** A league in Week 9 of its second season, the first closed with awards, his club a winner's (still on a roster). */
function plantSecond() {
  for (let k = 0; k < 30; k += 1) {
    const out = withMathRandom(seededGen(`rv1542 second ${k}`), () => {
      const { E, S } = M;
      const lg = E.initLeague(Math.random, {});
      let user = Object.keys(lg.teams)[3];
      playWeeks(lg, user, 1, 17);
      lg.week = E.REGULAR_WEEKS;
      const { champion } = E.runPlayoffs(lg.teams, Math.random);
      lg.champions.push({ season: lg.season, team: champion });
      const closed = S.nflCloseSeasonStats(lg);
      E.runOffseason(lg, Math.random, user);
      const w = closed && closed.mvp;
      const club = w ? Object.values(lg.teams).find(t => t.players.some(p => p.id === w.id)) : null;
      if (!club) return null;
      user = club.abbr;
      playWeeks(lg, user, 1, 8);
      return { save: shape(lg, user, { seasonsPlayed: 1 }), closed, id: w.id, name: w.name };
    }).value;
    if (out) return out;
  }
  return null;
}

async function partBadge(browser, size, reduced, second) {
  const tag = `${size.w}-${reduced ? 'rm' : 'mo'}`;
  const { ctx, page, errors } = await newPage(browser, size, reduced);
  await plant(page, BASE, second.save);
  await openTile(page, 'Standings');
  await page.locator('[data-standings-faces] button:has-text("This season")').click();
  await page.waitForSelector('[data-nfl-season="live"] [data-season-stats]', { timeout: 20000 }).catch(() => null);
  const hist = await page.$eval('[data-award-history]', e => e.textContent || '').catch(() => '');
  say('badge', hist.includes(`MVP ${second.name}`), `${tag}: the history names the first season's MVP (${hist.slice(0, 160)})`);
  await page.locator('[data-season-stats] button[role="tab"]:has-text("Leaders")').click().catch(() => {});
  await page.waitForTimeout(300);
  await shotEl(page, `${tag}-standings-history`, 'div:has(> [data-standings-faces])');
  await shot(page, `${tag}-standings-history-screen`);
  await toHub(page);
  await openTile(page, 'Roster');
  const sel = `[data-roster-row="${second.id}"]`;
  const badge = await page.$eval(`${sel} [data-award-badge]`, e => ({ text: (e.textContent || '').trim(), title: e.getAttribute('title') || '' })).catch(() => null);
  say('badge', !!badge && badge.text.includes(`Sim ${second.closed.season} MVP`), `${tag}: the MVP's row carries the badge (${badge ? `${badge.text} / ${badge.title}` : 'none'})`);
  const row = await page.$(sel);
  if (row) await row.scrollIntoViewIfNeeded();
  await shotEl(page, `${tag}-badge-row`, sel);
  await shot(page, `${tag}-roster-screen`);
  say('badge', (await overflow(page)) <= 0, `${tag}: no horizontal overflow on the roster (${await overflow(page)})`);
  say('badge', errors.length === 0, `${tag}: no page error ${errors[0] ?? ''}`);
  await ctx.close();
}

/* run */
const browser = await chromium.launch();
const parts = [];
const run = async (name, fn) => { try { await fn(); } catch (e) { fails += 1; console.log(`  FAIL [${name}] the walk broke: ${String(e.stack || e.message).slice(0, 400)}`); } };
await run('old', () => partOld(browser));
for (const [size, reduced] of [[{ w: 390, h: 844 }, true], [{ w: 390, h: 844 }, false], [{ w: 1280, h: 900 }, true], [{ w: 1280, h: 900 }, false]]) {
  console.log(`\n${size.w} by ${size.h}, reduced motion ${reduced}`);
  await run(`new ${size.w} ${reduced}`, () => partNew(browser, size, reduced));
  await run(`recap ${size.w} ${reduced}`, () => partRecap(browser, size, reduced));
}
const second = plantSecond();
say('badge', !!second, `a second season plant with a first season MVP still on a roster (${second ? `${second.name}` : 'none'})`);
if (second) for (const [size, reduced] of [[{ w: 390, h: 844 }, false], [{ w: 1280, h: 900 }, true]]) await run(`badge ${size.w}`, () => partBadge(browser, size, reduced, second));
await browser.close();
console.log(`\nrvwalk: ${checks} checks, ${fails} failed; pictures ${fs.readdirSync(OUT).filter(f => f.startsWith('rv-')).length}`);
process.exit(fails ? 1 : 0);
