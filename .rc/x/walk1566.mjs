// Reviewer walk for Round 1566 (never committed). Needs .rc/ob (git archive 5d1198389 src) and a served head build.
// Plants REAL base-written saves (the base engine, named NBA rows) and plays them on the head build the way a player
// would: the NBA hub, the last rounds, the close, the season card's three tabs, the roster badge, a reload of the
// recap; the NFL at Week 17's morning to its close. 390x844 and 1280x900, reduced motion on and off.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { seededGen, withMathRandom } from '../../scripts/lib/gmGameDayFleet.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const ROOT = process.cwd();
const BASE_TREE = path.join(ROOT, '.rc/ob');
const URL = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(os.tmpdir(), 'walk1566');
fs.mkdirSync(OUT, { recursive: true });
let checks = 0, fails = 0;
const ok = (label, cond, detail = '') => { checks += 1; if (!cond) fails += 1; console.log(`${cond ? 'ok  ' : 'FAIL'} ${label} ${detail}`.slice(0, 500)); };

async function bundleTree(root, lines, tag) {
  const out = path.join(os.tmpdir(), `walk1566-${tag}-${process.pid}.mjs`);
  await build({
    stdin: { contents: lines.join('\n'), resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: root, logLevel: 'error',
    alias: { '@': './src' }, jsx: 'automatic', nodePaths: [path.join(ROOT, 'node_modules')],
  });
  return import(pathToFileURL(out).href);
}
const LINES = [
  "export * as E from './src/lib/frontOffice.ts';",
  "export * as S from './src/lib/nflSeasonStats.ts';",
  "export * as B from './src/lib/frontOfficeGameDay.ts';",
  "export * as N from './src/lib/nbaFrontOffice.ts';",
  "export * as T from './src/lib/nbaSeasonStats.ts';",
  "export * as V from './src/lib/nflSeasonView.ts';",
];
const BM = await bundleTree(BASE_TREE, LINES, 'base');
const HM = await bundleTree(ROOT, LINES, 'head');
ok('base bundle is the base', typeof BM.T.nbaCleanStats !== 'function');

const shape = (league, myTeam) => ({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
const longestMan = (lg, user) => lg.teams[user].players.reduce((a, p) => (p.name.length > a.name.length ? p : a));
function plantNbaBase(stopRound) {
  return withMathRandom(seededGen(`review 1566 nba|${stopRound}`), () => {
    const { N } = BM;
    const lg = N.initNbaLeague(Math.random);
    const user = Object.keys(lg.teams)[7];
    for (let r = 1; r < stopRound; r += 1) { N.simRound(lg, user, Math.random); lg.round += 1; }
    const man = longestMan(lg, user);
    man.awards = ['2024 All-League First Team', '2025 Defensive Player of the Year', '2025 Sixth Man of the Year'];
    return { save: shape(lg, user), badge: man.id, user };
  }).value;
}
function plantNflBase() {
  return withMathRandom(seededGen('review 1566 nfl'), () => {
    const { E, S, B } = BM;
    const lg = E.initLeague(Math.random, {});
    const user = Object.keys(lg.teams)[5];
    for (let w = 1; w <= 16; w += 1) {
      E.injuryPass(lg.teams, Math.random);
      E.aiWeeklyMoves(lg, user, Math.random);
      const games = lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, Math.random));
      S.nflRecordWeek(lg, games.map(g => B.nflTell(g, lg.teams, lg.season, B.nflWhere(lg.week)).last).filter(Boolean), user);
      lg.week += 1;
    }
    return { save: shape(lg, user), user };
  }).value;
}
const nbaMid = plantNbaBase(18);
ok('the NBA plant is a base save of named rows', !!nbaMid.save.league.stats.teams && !nbaMid.save.league.stats.clubs, `round ${nbaMid.save.league.round}`);
const nflOld = plantNflBase();
ok('the NFL plant is a base save', !!nflOld.save.league.stats && !!nflOld.save.league.stats.clubs);

const { chromium } = pw;
const BLOCK = [/supabase\.co/, /googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/];
async function newPage(browser, size, motion) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, reducedMotion: motion });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, 20261566);
  const page = await ctx.newPage();
  for (const host of BLOCK) await page.route(host, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}
async function plantAndOpen(page, key, save, route) {
  await page.goto(`${URL}/robots.txt`);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [key, JSON.stringify(save)]);
  await page.goto(`${URL}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await answerConsent(page);
  await page.waitForTimeout(300);
}
const readSave = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);
async function pressTab(page, root, word) {
  await page.evaluate(([s, w]) => { const b = [...document.querySelectorAll(`${s} [role="tab"]`)].find(x => (x.textContent || '').trim() === w); if (b) b.click(); }, [root, word]);
  await page.waitForTimeout(400);
}
const rowsOf = (page, root) => page.evaluate(s => [...document.querySelectorAll(`${s} [data-stats-team-row]`)].map(r => {
  const [a, b] = r.children;
  return { name: (a.textContent || '').trim(), values: [...b.children].map(x => (x.textContent || '').trim()) };
}), root);
const linesBox = (page, root) => page.evaluate(s => {
  const box = document.querySelector(`${s} [data-stats-team]`);
  if (!box) return null;
  box.scrollTop = 0;
  const rows = [...box.querySelectorAll('[data-stats-team-row]')];
  const top = box.getBoundingClientRect().top + box.clientTop;
  const shown = rows.filter(r => { const x = r.getBoundingClientRect(); return x.top >= top - 0.5 && x.bottom <= top + box.clientHeight + 0.5; }).length;
  const ruled = rows.slice(1).filter(r => parseFloat(getComputedStyle(r).borderTopWidth) >= 1).length;
  return { men: rows.length, shown, ruled, boxH: box.clientHeight, fullH: box.scrollHeight, overflowX: document.documentElement.scrollWidth - window.innerWidth };
}, root);
const shot = async (page, sel, name) => {
  const el = sel ? await page.$(sel) : null;
  if (el) await el.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  else await page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
};
const fmt = v => String(v);

async function nbaWalk(browser, size, motion) {
  const tag = `nba-${size.w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const { ctx, page, errors } = await newPage(browser, size, motion);
  const KEY = 'nba-front-office-save-v1', ROOTSEL = '[data-season-stats]';
  await plantAndOpen(page, KEY, nbaMid.save, '/nba-front-office');
  await shot(page, null, `${tag}-hub`);
  await nbaPlayAndCard(page, errors, tag, KEY, ROOTSEL);
  await ctx.close();
  // the roster badge, on the base save, on a fresh page (the roster view hides the hub's tiles)
  const second = await newPage(browser, size, motion);
  await nbaBadge(second.page, tag, KEY);
  ok(`${tag}: no page error on the roster`, second.errors.length === 0, second.errors[0] || '');
  await second.ctx.close();
}

async function nbaBadge(page, tag, KEY) {
  await plantAndOpen(page, KEY, nbaMid.save, '/nba-front-office');
  await page.locator('button:has-text("Roster")').first().click().catch(() => {});
  await page.waitForTimeout(600);
  const badge = await page.evaluate(id => {
    const b = document.querySelector(`[data-roster-row="${id}"] [data-award-badge]`);
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { text: (b.textContent || '').trim(), px: parseFloat(cs.fontSize), cut: b.scrollWidth > b.clientWidth + 1, lines: Math.round(b.getBoundingClientRect().height / parseFloat(cs.lineHeight)) };
  }, nbaMid.badge);
  ok(`${tag}: roster badge 12 px, whole, newest first`, !!badge && badge.px >= 12 && !badge.cut && /Sim 2025 Sixth Man of the Year, Sim 2025 Defensive Player of the Year \+1 more/.test(badge.text), JSON.stringify(badge));
  await shot(page, `[data-roster-row="${nbaMid.badge}"]`, `${tag}-badge`);
}

async function nbaPlayAndCard(page, errors, tag, KEY, ROOTSEL) {
  // play the last two rounds and the close the way a player does
  for (let i = 0; i < 10 && (await page.locator(ROOTSEL).count()) === 0; i += 1) {
    const fin = page.locator('button:has-text("Final stretch + playoffs")');
    const rnd = page.locator('button:has-text("Play Round")');
    if (await fin.count() && await fin.first().isVisible()) { await fin.first().click(); await page.waitForTimeout(2000); continue; }
    if (await rnd.count() && await rnd.first().isVisible()) { await rnd.first().click(); await page.waitForTimeout(1200); continue; }
    await page.locator('button:has(div.uppercase)').filter({ hasText: /Round \d+ of \d+/ }).first().click().catch(() => {});
    await page.waitForTimeout(700);
  }
  const card = await page.waitForSelector(ROOTSEL, { timeout: 30000 }).catch(() => null);
  ok(`${tag}: the base save plays to the close and draws the season card`, !!card);
  if (!card) { await shot(page, null, `${tag}-nocard`); ok(`${tag}: no page error (no card)`, errors.length === 0, errors[0] || ''); return; }
  await page.waitForTimeout(700);
  await shot(page, null, `${tag}-recap-view`);
  const saved = await readSave(page, KEY);
  const st = saved && saved.league && saved.league.stats;
  ok(`${tag}: the save after the close keeps the shared shape`, !!st && !!st.clubs && !st.teams && HM.T.nbaCleanStats({ stats: JSON.parse(JSON.stringify(st)) }) === 'kept', st ? Object.keys(st).join(',') : 'none');
  const texts = {};
  for (const word of ['Awards', 'Leaders', 'Your lines']) {
    await pressTab(page, ROOTSEL, word);
    texts[word] = await page.$eval(ROOTSEL, e => e.textContent || '');
    await shot(page, ROOTSEL, `${tag}-card-${word === 'Your lines' ? 'lines' : word.toLowerCase()}`);
  }
  const box = await linesBox(page, ROOTSEL);
  console.log(`  (printed) ${tag} Your lines: ${JSON.stringify(box)}`);
  if (size.w < 640) ok(`${tag}: every stacked man after the first has a rule over him`, !!box && box.ruled === box.men - 1, JSON.stringify(box));
  ok(`${tag}: no horizontal page scroll`, !!box && box.overflowX <= 0, JSON.stringify(box));
  // truth: the card's lines are the save's lines, through the head's own readers
  const want = HM.T.nbaTeamLines(saved.league, saved.myTeam).map(l => ({ name: `${l.name}${l.rookie ? ' (rookie)' : l.gs * 2 < l.g ? ' (bench)' : ''}`, values: [l.g, l.ppg, l.rpg, l.apg].map(fmt) }));
  const got = await rowsOf(page, ROOTSEL);
  ok(`${tag}: Your lines say what the save holds (${want.length} men)`, JSON.stringify(got) === JSON.stringify(want), `${JSON.stringify(got[0])} vs ${JSON.stringify(want[0])}`);
  // a reload on the recap draws the same card from the saved block
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const again = await page.waitForSelector(ROOTSEL, { timeout: 15000 }).catch(() => null);
  const again2 = again ? await page.$eval(ROOTSEL, e => e.textContent || '') : '';
  ok(`${tag}: a reload on the recap draws the same Awards tab`, !!again && again2 === texts.Awards, `${again2.length} vs ${texts.Awards.length}`);
  if (again) await shot(page, ROOTSEL, `${tag}-after-reload`);
  ok(`${tag}: no page error`, errors.length === 0, errors[0] || '');
}

async function nflWalk(browser, size, motion) {
  const tag = `nfl-${size.w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const { ctx, page, errors } = await newPage(browser, size, motion);
  const KEY = 'front-office-save-v1', ROOTSEL = '[data-nfl-season="close"] [data-season-stats]';
  await plantAndOpen(page, KEY, nflOld.save, '/front-office');
  await page.locator('button:has-text("This week")').first().click().catch(() => {});
  await page.waitForFunction(() => { const b = document.querySelector('[data-press="old"]'); return !!b && !b.disabled; }, null, { timeout: 30000 }).catch(() => {});
  await page.locator('[data-press="old"]').click().catch(() => {});
  const card = await page.waitForSelector(ROOTSEL, { timeout: 45000 }).catch(() => null);
  ok(`${tag}: a base NFL save plays its last week and the close on the head and draws the card`, !!card);
  if (!card) { await shot(page, null, `${tag}-nocard`); await ctx.close(); return; }
  await page.waitForTimeout(700);
  await pressTab(page, ROOTSEL, 'Your lines');
  await shot(page, ROOTSEL, `${tag}-card-lines`);
  const saved = await readSave(page, KEY);
  const want = HM.V.nflTeamLines(saved.league, saved.myTeam).map(l => ({ name: `${l.name}${l.rookie ? ' (rookie)' : ''}`, values: [l.g, ...l.values].map(fmt) }));
  const got = await rowsOf(page, ROOTSEL);
  ok(`${tag}: Your lines say what the save holds (${want.length} men)`, got.length === want.length && got.every((r, i) => r.values.join(',') === want[i].values.join(',') && r.name.startsWith(want[i].name.replace(' (rookie)', ''))), `${JSON.stringify(got[0])} vs ${JSON.stringify(want[0])}`);
  const box = await linesBox(page, ROOTSEL);
  console.log(`  (printed) ${tag} Your lines: ${JSON.stringify(box)}`);
  if (size.w < 640) ok(`${tag}: every stacked man after the first has a rule over him`, !!box && box.ruled === box.men - 1, JSON.stringify(box));
  // the kicks line against the saved club row itself ([games, wins, for, against, td, fg, sf])
  const raw = saved.league.stats.clubs[saved.myTeam];
  const cardText = await page.$eval(ROOTSEL, e => e.textContent || '');
  ok(`${tag}: the card's field goals and safeties are the saved club's`, !!raw && cardText.includes(`kicked ${raw[5]} field goal`) && cardText.includes(`scored ${raw[6]} safet`), `${JSON.stringify(raw)} | ${(cardText.match(/kicked[^.]*\./) || [''])[0]}`);
  ok(`${tag}: no page error`, errors.length === 0, errors[0] || '');
  await ctx.close();
}

const browser = await chromium.launch();
try {
  for (const size of [{ w: 390, h: 844 }, { w: 1280, h: 900 }]) {
    for (const motion of ['reduce', 'no-preference']) {
      await nbaWalk(browser, size, motion);
      await nflWalk(browser, size, motion);
    }
  }
} catch (e) { console.log(`FAIL the walk broke: ${e.stack || e.message}`); fails += 1; }
await browser.close();
console.log(`walk1566: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
