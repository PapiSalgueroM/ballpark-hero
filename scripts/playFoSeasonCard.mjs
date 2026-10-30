/**
 * Round 1562 browser harness: the Front Office season card read on a phone.
 *
 * One shared card (src/components/front-office-shared/FoSeasonStatsCard.tsx)
 * is drawn by the NFL recap (through src/components/front-office/NflSeasonStats.tsx)
 * and by the NBA close screen (NbaFrontOfficeBoard.tsx). Round 1542's closing
 * check found it set in 9, 10 and 11 px text with leader names cut short at
 * 390 wide. This walk plays a season to its close on BOTH boards in a real
 * Chromium on a served build, at 320 by 640, 390 by 844 and 1280 by 900, and
 * reads the card's three tabs. Math.random is seeded in the page; the saves
 * are planted from the real engine under a seeded generator in node; the
 * database host and the ad hosts are blocked.
 *
 * WHAT IT HOLDS, on each board at each size, on each of the three tabs:
 *   card  the close draws the card;
 *   size  every text node in the card is 12 px or more, computed;
 *   tab   every tab button is 44 px tall or more;
 *   cut   nothing in the card is clipped (scrollWidth within clientWidth on
 *         every element), nothing is set to cut with an ellipsis or held on
 *         one line under a hidden overflow, and no word is split across two
 *         lines; the LONGEST name in the board's whole league (every roster
 *         and the free agents) is put into a leader row, a club line and an
 *         award line of the live card in turn, and each of those is held to
 *         the same rules, then taken out again;
 *   page  no horizontal page scroll;
 *   still with the card on screen, switching tabs moves neither the page's
 *         scrollY nor the card's top (the card may grow below).
 * Round 1566 added, the phone leftovers of 1562's reviews and the one save shape:
 *   room  Your lines shows at least eleven men whole before its own scroll
 *         (every man of a smaller club): the base before 1562 showed 11 of 12
 *         at 390, and the stacked rows had halved it;
 *   cue   where a club line stacks (below 640 px), every man after the first
 *         is set apart from the man above by a visible rule or a 4 px gap;
 *   badge.nfl, badge.nba  on each board's Roster box the planted man's sim
 *         award badge is 12 px or more and not cut or held to one line (the
 *         NBA's own 10 px copy is gone; both draw FoAwardBadge);
 *   old   the NBA board on the same save as it was saved before the round
 *         (its season block in named rows, the "nbaold" board) draws the card
 *         word for word as it does on the shared shape, every tab, every size.
 * PRINTED, not held: the card's height on each tab, how many leader rows take
 * more than one line (the brief's measurement for the wrap it chose), whether
 * a club line puts its numbers under the name, and a hash of each tab's text,
 * so a base build's run can be compared line for line (the same words in the
 * same order).
 *
 * CONTROLS (a mutated tree copy built and served on the runner; the request
 * line makes it): PLAY_FO_CARD_CONTROL=smalltext (one 10 px line put back:
 * point size red) and =truncate (the leader name's truncate class put back:
 * point cut red); Round 1566: =nocue (the rule between stacked men taken
 * out: point cue red), =shortbox (Your lines capped at 14rem on a phone
 * again: point room red), =oldbadge (the shared badge back at 10 px and
 * truncated: badge.nfl AND badge.nba red, which proves both boards draw it).
 * Exit 0 green, 1 red or a control that fired at its point,
 * 2 could not run, 3 a control that did not fire as aimed.
 *
 * Pictures: with RC_OUT set, one png a board a size a tab, the card alone
 * (fsc-<board>-<width>-<tab>.png).
 *
 * Run: a served build (scripts/lib/hostLikeServer.mjs) on BASE, then
 *      ENGINES=chromium node scripts/playFoSeasonCard.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pw from './lib/playwrightLoader.mjs';
import { bundle, seededGen, withMathRandom } from './lib/gmGameDayFleet.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.PLAY_FO_CARD_CONTROL || '';
/* Round 1566 added nocue, shortbox and oldbadge; oldbadge must turn BOTH rosters red, which only happens when both
   boards draw the one shared badge */
const CONTROLS = { smalltext: ['size'], truncate: ['cut'], nocue: ['cue'], shortbox: ['room'], oldbadge: ['badge.nba', 'badge.nfl'] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`playFoSeasonCard: unknown control "${CONTROL}"`); process.exit(2); }
const OUT = process.env.RC_OUT || '';
const SIZES = [{ w: 320, h: 640 }, { w: 390, h: 844 }, { w: 1280, h: 900 }];
const BLOCK = [/supabase\.co/, /googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/];
const TABS = [['awards', 'Awards'], ['leaders', 'Leaders'], ['lines', 'Your lines']];

let checks = 0;
let failures = 0;
const redPoints = new Set();
const say = (point, ok, what) => {
  checks += 1;
  if (!ok) { failures += 1; redPoints.add(point); }
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} (${point}) ${what}`);
};

/* ─── node side: the real engines, for the planted saves and each league's longest name ─── */
let M;
try {
  ({ M } = await bundle([
    "export * as E from './src/lib/frontOffice.ts';",
    "export * as S from './src/lib/nflSeasonStats.ts';",
    "export * as B from './src/lib/frontOfficeGameDay.ts';",
    "export * as N from './src/lib/nbaFrontOffice.ts';",
    "export * as T from './src/lib/nbaSeasonStats.ts';",
  ], [], 'focard'));
} catch (e) { console.error(`playFoSeasonCard: could not bundle: ${e.message}`); process.exit(2); }

/** The longest name in a league: every man on a roster and every free agent, with his club's abbreviation. */
function longestOf(teams, freeAgents) {
  const men = [
    ...Object.entries(teams).flatMap(([abbr, t]) => t.players.map(p => ({ name: p.name, team: abbr }))),
    ...(freeAgents ?? []).map(p => ({ name: p.name, team: 'FA' })),
  ];
  return men.reduce((a, m) => (m.name.length > a.name.length ? m : a), { name: '', team: '' });
}
/** The club that holds the longest name on a roster, so his own line is on the Your lines tab too. */
const clubOfLongest = teams => longestOf(teams, []).team;
const shape = (league, myTeam) => ({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });

/** NFL: a league at the morning of Week 17, its lines kept from Week 1, played the board's way (no desk). */
function plantNfl() {
  return withMathRandom(seededGen('play fo season card|nfl'), () => {
    const { E, S, B } = M;
    const lg = E.initLeague(Math.random, {});
    const user = clubOfLongest(lg.teams);
    for (let w = 1; w <= 16; w += 1) {
      E.injuryPass(lg.teams, Math.random);
      E.aiWeeklyMoves(lg, user, Math.random);
      const games = lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, Math.random));
      S.nflRecordWeek(lg, games.map(g => B.nflTell(g, lg.teams, lg.season, B.nflWhere(lg.week)).last).filter(Boolean), user);
      lg.week += 1;
    }
    return { save: shape(lg, user), longest: longestOf(lg.teams, lg.freeAgents), badge: wearAwards(lg, user, NFL_AWARDS) };
  }).value;
}
/** NBA: a league at its last round, as the board's own test plants it (NbaSeasonStats.test.tsx). */
function plantNba() {
  return withMathRandom(seededGen('play fo season card|nba'), () => {
    const { N } = M;
    const lg = N.initNbaLeague(Math.random);
    const user = clubOfLongest(lg.teams);
    for (let r = 1; r < N.NBA_ROUNDS; r += 1) { N.simRound(lg, user, Math.random); lg.round += 1; }
    return { save: shape(lg, user), longest: longestOf(lg.teams, lg.freeAgents), badge: wearAwards(lg, user, NBA_AWARDS) };
  }).value;
}
/* Round 1566: three sim awards on the longest name of his club, for the roster badge (point badge). */
const NFL_AWARDS = ['2024 MVP', '2025 Defensive Rookie of the Year', '2025 MVP'];
const NBA_AWARDS = ['2024 All-League First Team', '2025 Defensive Player of the Year', '2025 MVP'];
function wearAwards(lg, user, awards) {
  const man = lg.teams[user].players.reduce((a, p) => (p.name.length > a.name.length ? p : a));
  man.awards = [...awards];
  return man.id;
}
/** Round 1566: the same NBA save as a save from before the round, its season block in named rows (point old). */
function plantNbaOld(planted) {
  const save = JSON.parse(JSON.stringify(planted.save));
  const { club, ...rows } = M.T.nbaFoStats(save.league.stats);
  void club;
  save.league.stats = rows;
  if (!rows.teams || 'clubs' in rows) throw new Error('the old plant is not named rows');
  return { ...planted, save };
}

const BOARDS = [
  {
    key: 'nfl', route: '/front-office', saveKey: 'front-office-save-v1', plant: plantNfl, root: '[data-nfl-season="close"] [data-season-stats]',
    /* This week's tile, then the press that plays the final week and the playoffs */
    async close(page) {
      await page.locator('button:has-text("This week")').first().click();
      await page.waitForFunction(() => { const b = document.querySelector('[data-press="old"]'); return !!b && !b.disabled; }, null, { timeout: 30000 });
      await page.locator('[data-press="old"]').click();
    },
  },
  {
    key: 'nba', route: '/nba-front-office', saveKey: 'nba-front-office-save-v1', plant: plantNba, root: '[data-season-stats]',
    /* the hub's Play box, then the last round's button */
    async close(page) {
      await page.locator('button:has(div.uppercase)').filter({ hasText: /Play/i }).first().click();
      await page.waitForTimeout(400);
      await page.locator('button:has-text("Final stretch + playoffs")').first().click();
    },
  },
];
/* Round 1566: the NBA board again on the same save as it was saved before the round (named rows); its card must read
   word for word as the NBA's (point old). Planted from the NBA's plant, so it is walked after it. */
BOARDS.push({ ...BOARDS[1], key: 'nbaold', plant: null });

/* ─── page side: what is measured inside the card (installed as an init script, so no page policy can refuse it) ─── */
function foMeasure(sel) {
  const root = document.querySelector(sel);
  if (!root) return null;
  const said = el => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 32)}"`;
  const out = { small: [], low: [], cut: [], held: [], split: [], overflow: document.documentElement.scrollWidth - window.innerWidth };
  for (const b of root.querySelectorAll('button')) { const r = b.getBoundingClientRect(); if (r.height < 44) out.low.push(`${said(b)} ${r.height.toFixed(1)} px`); }
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    if (cs.display !== 'inline' && el.scrollWidth > el.clientWidth + 1) out.cut.push(`${said(el)} ${el.scrollWidth} > ${el.clientWidth}`);
    const hides = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    if (cs.textOverflow === 'ellipsis' || (hides && cs.whiteSpace === 'nowrap')) out.held.push(said(el));
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent || '';
    if (!t.trim()) continue;
    const px = parseFloat(getComputedStyle(n.parentElement).fontSize);
    if (px < 12) out.small.push(`"${t.trim().slice(0, 32)}" ${px} px`);
    /* a word on two lines has two boxes; a hyphen is a fair place to break, so a hyphenated word is not asked */
    const words = /\S+/g;
    for (let m = words.exec(t); m; m = words.exec(t)) {
      if (m[0].includes('-')) continue;
      const r = document.createRange();
      r.setStart(n, m.index);
      r.setEnd(n, m.index + m[0].length);
      if ([...r.getClientRects()].filter(x => x.width > 0).length > 1) out.split.push(m[0]);
    }
  }
  return out;
}
/** The longest name put into one row of the open tab (a copy of its first row, beside it), measured, then taken out. */
function foProbe([sel, tab, name, team]) {
  const root = document.querySelector(sel);
  if (!root) return null;
  /* an award's first winner line (the one with the club and detail beside the name), a leader row, a club line */
  const src = tab === 'awards' ? [...root.querySelectorAll('[data-stats-awards] > div > p')].find(p => p.querySelector('span'))
    : root.querySelector(tab === 'leaders' ? '[data-stats-leaders] > div > p:nth-of-type(2)' : '[data-stats-team] > div:nth-of-type(2)');
  if (!src) return null;
  const c = src.cloneNode(true);
  const lead = c.firstElementChild;
  if (tab === 'awards') {
    /* a winner: "Name " then "(TEAM) detail" */
    for (const n of [...c.childNodes]) if (n.nodeType === 3) n.remove();
    c.insertBefore(document.createTextNode(`${name} `), lead);
    lead.textContent = lead.textContent.replace(/^\([^)]*\)/, `(${team})`);
  } else if (tab === 'leaders') {
    /* a leader: "1. Name " and "(TEAM)" in one span, the value beside it */
    const inner = lead.querySelector('span');
    for (const n of [...lead.childNodes]) if (n.nodeType === 3) n.remove();
    lead.insertBefore(document.createTextNode(`1. ${name} `), inner);
    inner.textContent = `(${team})`;
  } else {
    lead.textContent = `${name} (rookie)`;
  }
  src.parentElement.insertBefore(c, src.nextSibling);
  const text = (c.textContent || '').trim();
  const lines = Math.round(c.getBoundingClientRect().height / parseFloat(getComputedStyle(c).lineHeight));
  const m = window.__foMeasure(sel);
  const whole = c.scrollWidth <= c.clientWidth + 1 && (c.textContent || '').includes(name);
  c.remove();
  return { text, lines, whole, m };
}
/** What is printed, not held: the leader rows that take more than one line, and whether a club line stacks. */
function foShape(sel) {
  const root = document.querySelector(sel);
  const rows = [...root.querySelectorAll('[data-stats-leaders] > div > p:nth-of-type(n+2)')];
  const lh = r => parseFloat(getComputedStyle(r).lineHeight);
  const line = root.querySelector('[data-stats-team] > div:nth-of-type(2)');
  const stacked = line ? line.lastElementChild.getBoundingClientRect().top > line.firstElementChild.getBoundingClientRect().top + 2 : null;
  return {
    rows: rows.length,
    twoLine: rows.filter(r => Math.round(r.getBoundingClientRect().height / lh(r)) > 1).length,
    nameWidth: line ? Math.round(line.firstElementChild.getBoundingClientRect().width) : -1,
    stacked,
  };
}

/**
 * Round 1566, Your lines: how many men the box shows whole before its own scroll (from its top), and how many rows
 * after the first are set apart from the row above by a visible rule (a top border of 1 px or more in a colour that is
 * not transparent) or a gap of 4 px or more. Stacked: the numbers sit under the name.
 */
function foLines(sel) {
  const box = document.querySelector(`${sel} [data-stats-team]`);
  if (!box) return null;
  box.scrollTop = 0;
  const rows = [...box.querySelectorAll('[data-stats-team-row]')];
  const top = box.getBoundingClientRect().top + box.clientTop;
  const shown = rows.filter(r => { const x = r.getBoundingClientRect(); return x.top >= top - 0.5 && x.bottom <= top + box.clientHeight + 0.5; }).length;
  const alpha = c => { const m = /^rgba?\(([^)]*)\)$/.exec(c); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const cued = rows.slice(1).filter((r, i) => {
    const cs = getComputedStyle(r);
    const rule = parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none' && alpha(cs.borderTopColor) > 0;
    return rule || r.getBoundingClientRect().top - rows[i].getBoundingClientRect().bottom >= 4;
  }).length;
  const first = rows[0];
  const stacked = !!first && first.lastElementChild.getBoundingClientRect().top > first.firstElementChild.getBoundingClientRect().top + 2;
  return { men: rows.length, shown, cued, stacked, boxH: box.clientHeight, fullH: box.scrollHeight };
}
/** Round 1566, the roster badge of one man: its size, and whether it is cut, held to one line or split. */
function foBadge(id) {
  const b = document.querySelector(`[data-roster-row="${id}"] [data-award-badge]`);
  if (!b) return null;
  const cs = getComputedStyle(b);
  const hides = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
  return {
    text: (b.textContent || '').trim(), px: parseFloat(cs.fontSize),
    cut: b.scrollWidth > b.clientWidth + 1, held: cs.textOverflow === 'ellipsis' || (hides && cs.whiteSpace === 'nowrap'),
    lines: Math.round(b.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
  };
}
/* the base build showed 11 of a 12 man club's lines at 390 before Round 1562 stacked them: the floor */
const ROOM = 11;

/* ─── the walk ─── */
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const some = a => a.slice(0, 3).join('; ');

async function newPage(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, 20261562);
  await ctx.addInitScript({ content: `window.__foMeasure = ${foMeasure.toString()}; window.__foProbe = ${foProbe.toString()}; window.__foShape = ${foShape.toString()}; window.__foLines = ${foLines.toString()}; window.__foBadge = ${foBadge.toString()};` });
  const page = await ctx.newPage();
  for (const host of BLOCK) await page.route(host, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}

/** A tab pressed with the card 60 px under the top of the screen: the page and the card's top must stay put. */
async function switchTo(page, board, word, where) {
  await page.evaluate(s => { const c = document.querySelector(s); window.scrollTo(0, window.scrollY + c.getBoundingClientRect().top - 60); }, board.root);
  await page.waitForTimeout(300);
  const at = () => page.evaluate(s => ({ y: Math.round(window.scrollY), top: Math.round(document.querySelector(s).getBoundingClientRect().top), h: document.documentElement.scrollHeight }), board.root);
  const before = await at();
  /* a click from inside the page: a pointer click would scroll the button into view first */
  const pressed = await page.evaluate(([s, w]) => {
    const b = [...document.querySelectorAll(`${s} [role="tab"]`)].find(x => (x.textContent || '').trim() === w);
    if (b) b.click();
    return !!b;
  }, [board.root, word]);
  await page.waitForTimeout(350);
  const after = await at();
  say('still', pressed && Math.abs(before.y - after.y) <= 1 && Math.abs(before.top - after.top) <= 1, `${where}: to ${word}, scrollY ${before.y} then ${after.y}, the card's top ${before.top} then ${after.top} (page ${before.h} then ${after.h} px)`);
}

async function walk(browser, board, size, planted) {
  const { ctx, page, errors } = await newPage(browser, size);
  const where = `${board.key} ${size.w}`;
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [board.saveKey, JSON.stringify(planted.save)]);
  await page.goto(`${BASE}${board.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await answerConsent(page);
  await page.waitForTimeout(300);
  await board.close(page);
  const card = await page.waitForSelector(board.root, { timeout: 45000 }).catch(() => null);
  say('card', !!card, `${where}: the close draws the season card`);
  if (card) {
    await page.waitForTimeout(600);
    for (let i = 0; i < TABS.length; i += 1) {
      const [tab, word] = TABS[i];
      if (i > 0) await switchTo(page, board, word, where);
      const m = await page.evaluate(s => window.__foMeasure(s), board.root);
      say('size', m.small.length === 0, `${where}, ${word}: every text in the card is 12 px or more${m.small.length ? ` (${m.small.length} under: ${some(m.small)})` : ''}`);
      say('tab', m.low.length === 0, `${where}, ${word}: every tab is 44 px tall or more${m.low.length ? ` (${some(m.low)})` : ''}`);
      say('cut', m.cut.length + m.held.length + m.split.length === 0, `${where}, ${word}: nothing clipped, held to one line or split mid word${m.cut.length + m.held.length + m.split.length ? ` (clipped: ${some(m.cut) || 'none'}; held: ${some(m.held) || 'none'}; split: ${some(m.split) || 'none'})` : ''}`);
      say('page', m.overflow <= 0, `${where}, ${word}: no horizontal page scroll (${m.overflow} px)`);
      const p = await page.evaluate(a => window.__foProbe(a), [board.root, tab, planted.longest.name, planted.longest.team]);
      const pm = p ? p.m.cut.length + p.m.held.length + p.m.split.length : -1;
      say('cut', !!p && p.whole && pm === 0, `${where}, ${word}: the league's longest name shown whole in a copied row (${p ? `"${p.text.slice(0, 60)}", ${p.lines} line${p.lines === 1 ? '' : 's'}` : 'no row to copy'}${p && pm ? `; clipped: ${some(p.m.cut) || 'none'}; held: ${some(p.m.held) || 'none'}; split: ${some(p.m.split) || 'none'}` : ''})`);
      const text = await page.$eval(board.root, e => e.textContent || '');
      TEXTS.set(`${board.key}|${size.w}|${tab}`, sha(text));
      if (tab === 'lines') {
        const L = await page.evaluate(s => window.__foLines(s), board.root);
        say('room', !!L && L.men > 0 && L.shown >= Math.min(L.men, ROOM), `${where}, Your lines: ${L ? `${L.shown} of ${L.men} men shown whole before the box scrolls (the floor ${Math.min(L.men, ROOM)}; the box ${L.boxH} of ${L.fullH} px)` : 'no box'}`);
        if (L && L.stacked) say('cue', L.men > 1 && L.cued === L.men - 1, `${where}, Your lines, stacked: ${L.cued} of ${L.men - 1} men after the first set apart from the man above by a rule or a gap`);
        else console.log(`  (printed) ${where}, Your lines: one row a man, ${L ? L.cued : 0} of ${L ? L.men - 1 : 0} set apart`);
      }
      const h = await page.$eval(board.root, e => Math.round(e.getBoundingClientRect().height));
      console.log(`  (printed) text ${board.key} ${size.w} ${tab} ${sha(text)} ${text.length} chars; the card ${h} px tall`);
      if (tab !== 'awards') {
        const s = await page.evaluate(sel => window.__foShape(sel), board.root);
        console.log(tab === 'leaders'
          ? `  (printed) ${where}, Leaders: ${s.twoLine} of ${s.rows} leader rows take more than one line`
          : `  (printed) ${where}, Your lines: the name has ${s.nameWidth} px, ${s.stacked ? 'the numbers under it' : 'the numbers beside it'}`);
      }
      if (OUT) await card.screenshot({ path: path.join(OUT, `fsc-${board.key}-${size.w}-${tab}.png`) }).catch(() => {});
    }
    await switchTo(page, board, TABS[0][1], where);
  }
  say('card', errors.length === 0, `${where}: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

/* Round 1566: the planted man's sim award badge on his own Roster box, both boards drawing the one shared badge */
async function badgeWalk(browser, board, size, planted) {
  const { ctx, page, errors } = await newPage(browser, size);
  const where = `${board.key} ${size.w}`;
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [board.saveKey, JSON.stringify(planted.save)]);
  await page.goto(`${BASE}${board.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await answerConsent(page);
  await page.locator('button:has-text("Roster")').first().click().catch(() => {});
  await page.waitForTimeout(600);
  const b = await page.evaluate(id => window.__foBadge(id), planted.badge);
  say(`badge.${board.key}`, !!b && b.px >= 12 && !b.cut && !b.held && b.text.includes('Sim 2025'), `${where}, Roster: the sim award badge ${b ? `"${b.text.slice(0, 70)}" ${b.px} px, ${b.lines} line${b.lines === 1 ? '' : 's'}${b.cut ? ', CUT' : ''}${b.held ? ', HELD to one line' : ''}` : 'not drawn'}`);
  say('card', errors.length === 0, `${where}, Roster: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

/* ─── run ─── */
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const planted = {};
const TEXTS = new Map();
for (const b of BOARDS) {
  try { planted[b.key] = b.key === 'nbaold' ? plantNbaOld(planted.nba) : b.plant(); } catch (e) { console.error(`playFoSeasonCard: could not plant the ${b.key} save: ${e.stack || e.message}`); process.exit(2); }
  const L = planted[b.key].longest;
  console.log(`${b.key}: planted, his club ${planted[b.key].save.myTeam}; the league's longest name is ${L.name} (${L.team}, ${L.name.length} letters)`);
  if (!L.name) { console.error(`playFoSeasonCard: the ${b.key} league has no names`); process.exit(2); }
}
let browser;
try { browser = await chromium.launch(); } catch (e) { console.error(`playFoSeasonCard: no browser: ${e.message}`); process.exit(2); }
try {
  for (const size of SIZES) {
    console.log('');
    console.log(`${size.w} by ${size.h}`);
    for (const board of BOARDS) await walk(browser, board, size, planted[board.key]);
    for (const [tab] of TABS) {
      const a = TEXTS.get(`nba|${size.w}|${tab}`), o = TEXTS.get(`nbaold|${size.w}|${tab}`);
      say('old', !!a && a === o, `nba ${size.w}, ${tab}: a save from before Round 1566 (named rows) draws the same card, word for word (${a ?? 'none'} and ${o ?? 'none'})`);
    }
    for (const board of BOARDS.filter(b => b.key !== 'nbaold')) await badgeWalk(browser, board, size, planted[board.key]);
  }
} catch (e) {
  console.error(`playFoSeasonCard: the walk broke: ${e.stack || e.message}`);
  await browser.close();
  process.exit(2);
}
await browser.close();
console.log('');
const red = [...redPoints].sort();
if (CONTROL) {
  const aim = CONTROLS[CONTROL];
  const ok = aim.every(p => red.includes(p)) && red.every(p => aim.includes(p));
  console.log(ok ? `control ${CONTROL}: FIRED at point ${aim.join(' and ')}` : `control ${CONTROL}: DID NOT FIRE as aimed (points red: ${red.join(', ') || 'none'})`);
  console.log(`playFoSeasonCard: ${checks} checks, ${failures} failed (control ${CONTROL})`);
  process.exit(ok ? 1 : 3);
}
console.log(`playFoSeasonCard: ${checks} checks, ${failures} failed${red.length ? ` (points red: ${red.join(', ')})` : ''}`);
process.exit(failures ? 1 : 0);
