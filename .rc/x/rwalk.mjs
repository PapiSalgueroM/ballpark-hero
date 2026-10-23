// Reviewer walk for Round 1562 (sent as .rc/x/rwalk.mjs; #!serve #!playwright). Plays a season close on both boards
// at 390x844 and 1280x900 with reduced motion on and off, presses the card's tabs with REAL pointer clicks, checks
// overlap, alignment and the page holding still, an old NBA save without season lines, and the NFL roster badge.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { bundle, seededGen, withMathRandom } from '../../scripts/lib/gmGameDayFleet.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rwalk-out';
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const MOTIONS = ['reduce', 'no-preference'];
const TABS = [['awards', 'Awards'], ['leaders', 'Leaders'], ['lines', 'Your lines']];
let checks = 0; let fails = 0;
const say = (ok, what) => { checks += 1; if (!ok) fails += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); };

const { M } = await bundle([
  "export * as E from './src/lib/frontOffice.ts';",
  "export * as S from './src/lib/nflSeasonStats.ts';",
  "export * as B from './src/lib/frontOfficeGameDay.ts';",
  "export * as N from './src/lib/nbaFrontOffice.ts';",
], [], 'rwalk1562');
const shape = (league, myTeam) => ({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
const longestClub = teams => Object.entries(teams).flatMap(([a, t]) => t.players.map(p => ({ n: p.name, a }))).reduce((x, m) => (m.n.length > x.n.length ? m : x), { n: '', a: '' }).a;
function plantNfl() {
  return withMathRandom(seededGen('review run 1562|nfl'), () => {
    const { E, S, B } = M;
    const lg = E.initLeague(Math.random, {});
    const user = longestClub(lg.teams);
    for (let w = 1; w <= 16; w += 1) {
      E.injuryPass(lg.teams, Math.random);
      E.aiWeeklyMoves(lg, user, Math.random);
      const games = lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, Math.random));
      S.nflRecordWeek(lg, games.map(g => B.nflTell(g, lg.teams, lg.season, B.nflWhere(lg.week)).last).filter(Boolean), user);
      lg.week += 1;
    }
    /* the roster badge, stressed: the club's two longest names carry planted sim awards (layout only) */
    const two = [...lg.teams[user].players].sort((a, b) => b.name.length - a.name.length).slice(0, 2);
    two[0].awards = [`${lg.season - 3} Offensive Rookie of the Year`, `${lg.season - 2} MVP`, `${lg.season - 1} MVP`];
    two[1].awards = [`${lg.season - 1} Defensive Rookie of the Year`];
    return { save: shape(lg, user), badged: two.map(p => p.id) };
  }).value;
}
function plantNba() {
  return withMathRandom(seededGen('review run 1562|nba'), () => {
    const { N } = M;
    const lg = N.initNbaLeague(Math.random);
    const user = longestClub(lg.teams);
    for (let r = 1; r < N.NBA_ROUNDS; r += 1) { N.simRound(lg, user, Math.random); lg.round += 1; }
    return { save: shape(lg, user) };
  }).value;
}
const BOARDS = {
  nfl: { route: '/front-office', key: 'front-office-save-v1', root: '[data-nfl-season="close"] [data-season-stats]',
    async close(page) {
      await page.locator('button:has-text("This week")').first().click();
      await page.waitForFunction(() => { const b = document.querySelector('[data-press="old"]'); return !!b && !b.disabled; }, null, { timeout: 30000 });
      await page.locator('[data-press="old"]').click();
    } },
  nba: { route: '/nba-front-office', key: 'nba-front-office-save-v1', root: '[data-season-stats]',
    async close(page) {
      await page.locator('button:has(div.uppercase)').filter({ hasText: /Play/i }).first().click();
      await page.waitForTimeout(400);
      await page.locator('button:has-text("Final stretch + playoffs")').first().click();
    } },
};

/* page side: overlap, alignment, the club lines' columns under their heads, the smallest text, the inner scroll box */
function rMeasure(sel) {
  const root = document.querySelector(sel);
  if (!root) return null;
  const R = e => e.getBoundingClientRect();
  const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const out = { minPx: 99, overlap: [], align: [], cols: [], team: null, overflow: document.documentElement.scrollWidth - window.innerWidth };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if ((n.textContent || '').trim()) out.minPx = Math.min(out.minPx, parseFloat(getComputedStyle(n.parentElement).fontSize));
  for (const p of root.querySelectorAll('[data-stats-leaders] > div > p:nth-of-type(n+2)')) {
    const a = R(p.firstElementChild); const b = R(p.lastElementChild);
    if (hit(a, b)) out.overlap.push(`leader "${(p.textContent || '').slice(0, 40)}"`);
    if (Math.abs(b.right - R(p).right) > 1.5) out.align.push(`leader value not at the right: "${(p.textContent || '').slice(0, 40)}"`);
  }
  const team = root.querySelector('[data-stats-team]');
  if (team) {
    const rows = [...team.children].filter(d => d.tagName === 'DIV');
    const xs = r => [...r.lastElementChild.children].map(c => Math.round(R(c).right));
    const head = rows[0] ? xs(rows[0]).join(',') : '';
    for (const r of rows.slice(1)) {
      if (xs(r).join(',') !== head) out.cols.push(`"${(r.firstElementChild.textContent || '').slice(0, 24)}" ${xs(r).join(',')} vs head ${head}`);
      if (hit(R(r.firstElementChild), R(r.lastElementChild))) out.overlap.push(`club line "${(r.firstElementChild.textContent || '').slice(0, 30)}"`);
    }
    out.team = { men: rows.length - 1, shown: team.clientHeight, all: team.scrollHeight, rowH: rows[1] ? Math.round(R(rows[1]).height) : -1 };
  }
  return out;
}

async function open(browser, size, motion, board, save) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, reducedMotion: motion });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, 15621562);
  await ctx.addInitScript({ content: `window.__rMeasure = ${rMeasure.toString()};` });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [board.key, JSON.stringify(save)]);
  await page.goto(`${BASE}${board.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await answerConsent(page);
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(e => console.log(`  (no picture ${name}: ${e.message})`));

async function closeAndRead(browser, bk, size, motion, save) {
  const board = BOARDS[bk];
  const at = `${bk} ${size.w} ${motion}`;
  const { ctx, page, errors } = await open(browser, size, motion, board, save);
  await board.close(page);
  const card = await page.waitForSelector(board.root, { timeout: 45000 }).catch(() => null);
  say(!!card, `${at}: the close draws the card`);
  if (card) {
    await page.waitForTimeout(900);
    await page.evaluate(s => { const c = document.querySelector(s); window.scrollTo(0, window.scrollY + c.getBoundingClientRect().top - 70); }, board.root);
    await page.waitForTimeout(400);
    for (let i = 0; i < TABS.length; i += 1) {
      const [tab, word] = TABS[i];
      if (i > 0) {
        const pos = () => page.evaluate(s => ({ y: Math.round(window.scrollY), top: Math.round(document.querySelector(s).getBoundingClientRect().top) }), board.root);
        const b0 = await pos();
        await page.locator(`${board.root} [role="tab"]`, { hasText: word }).click();
        await page.waitForTimeout(450);
        const b1 = await pos();
        say(Math.abs(b0.y - b1.y) <= 1 && Math.abs(b0.top - b1.top) <= 1, `${at}: a pointer press on ${word} holds the page (scrollY ${b0.y} to ${b1.y}, card top ${b0.top} to ${b1.top})`);
      }
      const m = await page.evaluate(s => window.__rMeasure(s), board.root);
      say(m.minPx >= 12, `${at}, ${word}: smallest text ${m.minPx} px`);
      say(m.overlap.length === 0, `${at}, ${word}: nothing overlaps${m.overlap.length ? `: ${m.overlap.slice(0, 3).join('; ')}` : ''}`);
      say(m.align.length === 0, `${at}, ${word}: leader values right aligned${m.align.length ? `: ${m.align.slice(0, 2).join('; ')}` : ''}`);
      say(m.cols.length === 0, `${at}, ${word}: club line numbers sit under their heads${m.cols.length ? `: ${m.cols.slice(0, 2).join('; ')}` : ''}`);
      say(m.overflow <= 0, `${at}, ${word}: no horizontal page scroll (${m.overflow})`);
      if (m.team) console.log(`  (printed) ${at}, ${word}: Your lines box shows ${m.team.shown} of ${m.team.all} px, ${m.team.men} men, a row ${m.team.rowH} px`);
      if (motion === 'reduce' || i === 0) await shot(page, `w-${bk}-${size.w}-${motion}-${tab}`);
    }
  }
  say(errors.length === 0, `${at}: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

/* an NBA save from before season lines (no league.stats), closed at 390 and 1280: the pending line */
async function oldNba(browser, size, save) {
  const old = JSON.parse(JSON.stringify(save));
  delete old.league.stats;
  const { ctx, page, errors } = await open(browser, size, 'reduce', BOARDS.nba, old);
  await BOARDS.nba.close(page);
  const el = await page.waitForSelector('[data-season-stats-pending], [data-season-stats]', { timeout: 45000 }).catch(() => null);
  const got = el ? await el.evaluate(e => ({ pending: e.hasAttribute('data-season-stats-pending'), px: parseFloat(getComputedStyle(e).fontSize), text: (e.textContent || '').slice(0, 90) })) : null;
  say(!!got, `nba ${size.w} old save: the close draws ${got ? (got.pending ? 'the pending line' : 'a card') : 'nothing'} (${got ? `${got.px} px: ${got.text}` : ''})`);
  if (got && got.pending) say(got.px >= 12, `nba ${size.w} old save: the pending line is ${got.px} px`);
  if (el) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await shot(page, `w-nba-${size.w}-oldsave`); }
  say(errors.length === 0, `nba ${size.w} old save: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

/* the NFL Roster box: the shared FoAwardBadge on the two planted rows (12 px, wraps, overlaps nothing) */
async function badgeRows(browser, size, planted) {
  const { ctx, page, errors } = await open(browser, size, 'reduce', BOARDS.nfl, planted.save);
  await page.locator('button:has-text("Roster")').first().click();
  await page.waitForTimeout(700);
  for (const id of planted.badged) {
    const row = page.locator(`[data-roster-row="${id}"]`);
    if (!(await row.count())) { say(false, `nfl ${size.w} roster: the planted row ${id} is on the Roster box`); continue; }
    await row.scrollIntoViewIfNeeded();
    const m = await row.evaluate(r => {
      const b = r.querySelector('[data-award-badge]');
      if (!b) return null;
      const R = e => e.getBoundingClientRect();
      const left = r.firstElementChild.firstElementChild; const right = r.firstElementChild.lastElementChild;
      const a = R(left); const c = R(right);
      return { px: parseFloat(getComputedStyle(b).fontSize), lines: Math.round(R(b).height / parseFloat(getComputedStyle(b).lineHeight)), cut: b.scrollWidth > b.clientWidth + 1, overlap: a.right > c.left + 0.5, text: b.textContent, lineAbove: parseFloat(getComputedStyle(b.previousElementSibling).fontSize) };
    });
    say(!!m, `nfl ${size.w} roster: row ${id} draws the badge${m ? ` "${m.text}" on ${m.lines} line(s), ${m.px} px (the line above it ${m.lineAbove} px)` : ''}`);
    if (m) say(m.px >= 12 && !m.cut && !m.overlap, `nfl ${size.w} roster: the badge is 12 px or more, not cut, overlaps nothing (px ${m.px}, cut ${m.cut}, overlap ${m.overlap})`);
    await row.screenshot({ path: path.join(OUT, `w-nfl-${size.w}-badge-${planted.badged.indexOf(id)}.png`) }).catch(() => {});
  }
  say(errors.length === 0, `nfl ${size.w} roster: no page error${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}

const planted = { nfl: plantNfl(), nba: plantNba() };
console.log(`planted: nfl club ${planted.nfl.save.myTeam}, nba club ${planted.nba.save.myTeam}`);
const browser = await chromium.launch();
try {
  for (const size of SIZES) {
    for (const motion of MOTIONS) for (const bk of ['nfl', 'nba']) await closeAndRead(browser, bk, size, motion, planted[bk].save);
    await oldNba(browser, size, planted.nba.save);
    await badgeRows(browser, size, planted.nfl);
  }
} catch (e) { console.log(`rwalk: the walk broke: ${e.stack || e.message}`); fails += 1; }
await browser.close();
console.log(`rwalk: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
