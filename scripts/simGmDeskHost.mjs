/* Round 1223: the GM desk host (src/lib/gmDeskHost.ts), its four read
 * adapters and its three panels, proven on the four REAL front office engines.
 *
 * The host is the one place a GM's career lives for all four sports: his
 * record across clubs, the job market after a sacking, the year out, XP and
 * what a point in each of the seven trees does. Nothing mounts it yet (this
 * round is the lift, new files only), so this harness is the proof a later
 * bind starts from. Every league below is made by an engine's own init and
 * played by its own calls in its board's order, with seeded draws.
 *   1  the four adapters over real leagues (mid season, closed, after a
 *      summer): every club once, strength, payroll and the standings order
 *      are the engine's own, and a read never changes the league
 *   2  the record of a save older than the block: nothing filled in over a
 *      grid, and four real saves a sport pass every read with no throw and
 *      no write
 *   3  the feed is keyed: the same save reads the same feed 200 times with
 *      Math.random reseeded between reads, and a year or a season on reads
 *      a new key (the digest printed is compared across two processes)
 *   4  the market rules on real tiers over a ladder of careers: never the
 *      club that let him go, nothing above tier 2 after a 'badly' season
 *      (also read six real clubs at a time, where the top tier is in reach),
 *      every ask built for the season after the league's
 *   5  shut means shut: no tier his old club can reach and no year out reopens
 *      a market whose next year reads shut, closed (nobody called) or on a
 *      last call (somebody did); a quiet one is never in that set; and the
 *      year out is on offer exactly while next year can hold a call
 *   6  the close on every club's real season: with no desk it is the two
 *      engine calls a board makes today; with one it records once, pays what
 *      gmSeasonXp pays, starts a new save's stint in the season he started,
 *      cushions the grade's change alone, and a corrupt block resets alone
 *   7  every level of every tree, through its consumer, on real engine
 *      inputs: zero points is the input and draws nothing; each level 1 to 5
 *      is gmXp fed its own keyed roll; and each level moves the fleet total
 *      past the level below (a flat step is a failure)
 *   8  spending: refused off the live list, with no point and past five; 35
 *      spends fill the board
 *   9  taking a seat and a year out on real leagues: what moves and what
 *      does not, who owns each block, the refusals with the league untouched
 *      (in a seat, an open season, a closed market, and a last call: offers
 *      on the table with next year shut), and a played year that is not a
 *      season on his record
 *  10  the words: never empty, no dash, no quote, no placeholder; a closed
 *      line never says sit; no line states fewer seasons than he played;
 *      with offers on the table the line and the stay out line say what
 *      passing costs; the stay out button is drawn only while next year can
 *      hold a call
 * Negative controls (SIM_GM_DESK_HOST_CONTROL), each must go red in its check:
 *   mutate (1) dropclub (1) fillmet (2) readwrites (2) unkeyed (3)
 *   firedclub (4) badlyceiling (4) askseason (4) closedquiet (5)
 *   twice (6) lateseat (6) failopen (6) cushionall (6)
 *   flatlevel (7) sharedroll (7) flatowner (7) flatmedia (7) flatcut (7) flatask (7)
 *   spendany (8) stalestaff (9) halfseason (9) noyear (9) lastcall (9)
 *   emptytile (10) closedsit (10) fewseasons (10) shutbutton (10) passquiet (10)
 * SIM_GM_DESK_HOST_ANCHORS=1 checks every control's anchor and stops (light).
 *
 * THE YEAR OUT HERE IS NOT THE BIND'S. Section 9 plays it with each engine's
 * own calls and the old club still named as the engine's user club, because
 * the engine option that plays a league with nobody in the chair belongs to
 * the bind. What it proves is the host's order and its bookkeeping.
 *
 * MEASURED 2026-10-10 on a GitHub runner, three seed sets of three (1,2,3 /
 * 4,5,6 / 7,8,9), three seasons a seed a sport. Every count is exact for its
 * seeds; all three sets pass every check.
 *   real leagues read        84 each       real saves read        240 each
 *   keyed feeds with offers  34 / 38 / 37 of 48
 *   markets on the ladder    16800 each: offers 12057 / 12052 / 12045, after a badly season 2260 / 2245 / 2262,
 *                            quiet 3310 / 3331 / 3337, quiet on a climb 811 / 801 / 805, closed 4766 / 4770 / 4781
 *   real seasons graded      1116 each: short of the ask 498 / 511 / 507, every one a firing from trust 12
 *   men / room to grow       3281 / 3275 / 3276 in the first league a sport; 10995 / 11049 / 10964 over nine leagues
 *   asks on the re-sign desk 8824 / 8868 / 8838     trade pairs 1045286 / 1047531 / 1047082
 *   cuts charged as quoted   288 each      gambles 24 each (six answers a sport, each exactly 30 more landings a point)
 *   seats taken 12, years out refused 36, years out played 12, each set
 *   pace on the four fed sources (wins, titles, playoff rounds, the ask): the median club earns 101 to 106 XP a
 *   season in every sport, and 20 to 37 percent of clubs hold the first point (400 XP) after three seasons, so
 *   the median GM is about four seasons from it. The GM level help says so (hostXpHelp computes it).
 * Every floor in T sits near 70 percent of the lowest set. The two processes of one seed set print one feed
 * digest (seeds 1,2,3: 4639809b50a97cedd2ac870d05cfdb6d59a4b6e4).
 * CONTROLS, each run alone on seeds 1,2,3, failures counted in its own check: see CONTROL COUNTS below T.
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const lf = s => s.replaceAll('\r\n', '\n');
const J = v => JSON.stringify(v);
const sha = s => crypto.createHash('sha1').update(s).digest('hex');

const CONTROL = process.env.SIM_GM_DESK_HOST_CONTROL || '';
const SEEDS = (process.env.SIM_GM_DESK_HOST_SEEDS || '1,2,3').split(',').map(Number);
const SEASONS = 3;

function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}

let check = '';
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(check) ?? 0) + 1;
  failedIn.set(check, n);
  if (n <= 6) console.error(`  FAIL [${check}]: ${m}`);
  else if (n === 7) console.error(`  FAIL [${check}]: (further failures in this check not printed)`);
};
const begin = (id, title) => { check = id; console.log(`${id}) ${title}`); };
const ok = (cond, m) => { if (!cond) fail(typeof m === 'function' ? m() : m); return !!cond; };

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  host: path.join(ROOT, 'src', 'lib', 'gmDeskHost.ts'),
  nhl: path.join(ROOT, 'src', 'lib', 'gmDeskHostNhl.ts'),
  seat: path.join(ROOT, 'src', 'lib', 'gmSeat.ts'),
  keyed: path.join(ROOT, 'src', 'lib', 'keyedRng.ts'),
};
/* name: [check, file, the one line it rewrites, what it becomes] */
const EDITS = {
  mutate: ['1', 'nhl', '    const table = nhlFoStandings(league);',
    '    const table = nhlFoStandings(league);\n    for (const t of Object.values(league.teams)) t.players.sort((a, b) => a.ovr - b.ovr);'],
  dropclub: ['1', 'nhl', '    return Object.values(league.teams).map((t): HostClub => {', '    return Object.values(league.teams).slice(1).map((t): HostClub => {'],
  fillmet: ['2', 'host', '  const unknown = seasons - grades.length;',
    "  for (let i = grades.length; i < seasons; i++) grades.push('met');\n  const unknown = seasons - grades.length;"],
  readwrites: ['2', 'host', '  return gmBlock<GmXp>(desk, GM_HOST_KEYS.xp, isValidGmXp, defaultGmXp);',
    '  if (!(GM_HOST_KEYS.xp in desk.blocks)) desk.blocks[GM_HOST_KEYS.xp] = defaultGmXp();\n  return gmBlock<GmXp>(desk, GM_HOST_KEYS.xp, isValidGmXp, defaultGmXp);'],
  unkeyed: ['3', 'host', '    keyedRng(hostFeedKey(host.sport, seat, season)), host.champion(league, season),', '    Math.random, host.champion(league, season),'],
  firedclub: ['4', 'seat', '.filter(t => t.id !== last.team)', '.filter(t => true)'],
  badlyceiling: ['4', 'seat', "lastGradeOf(last) === 'badly' ? BADLY_FIRED_CEILING : 1", 'false ? BADLY_FIRED_CEILING : 1'],
  askseason: ['4', 'host', '    host.pack, teams, seat.career, season + 1,', '    host.pack, teams, seat.career, season,'],
  closedquiet: ['5', 'host', '  for (let t = p.lastTier - 1; t >= 1; t--) {', '  for (let t = 0; t >= 1; t--) {'],
  twice: ['6', 'host', '  if (seat.last !== undefined && f.season <= seat.last) return same;', '  if (false) return same;'],
  lateseat: ['6', 'host', 'titles: i.titles, fired: i.fired, seasonCounted: false,', 'titles: i.titles, fired: i.fired, seasonCounted: true,'],
  failopen: ['6', 'host', 'v => isGmSeatBlock(v) && seatFitsSave(v, l)', 'v => !!v'],
  cushionall: ['6', 'host', '  const trustDelta = fx.trustDelta(grade.trustDelta) + movers;', '  const trustDelta = fx.trustDelta(grade.trustDelta + movers);'],
  flatlevel: ['7', 'host', '  for (const t of GM_TREES) points[t] = gmTreePoints(block, t);', '  for (const t of GM_TREES) points[t] = Math.min(1, gmTreePoints(block, t));'],
  sharedroll: ['7', 'host', 'keyedRng(hostXpRollKey(sport, tree, key))();', "keyedRng(hostXpRollKey(sport, 'scouting', key))();"],
  flatowner: ['7', 'host', '  const trustDelta = fx.trustDelta(grade.trustDelta) + movers;', '  const trustDelta = grade.trustDelta + movers;'],
  flatmedia: ['7', 'host', '  if (!g || fx.points.media <= 0) return opt;', '  if (!g || fx.points.media <= 9) return opt;'],
  flatcut: ['7', 'host', '  if (fx.points.capCraft <= 0) return base;', '  if (fx.points.capCraft <= 9) return base;'],
  flatask: ['7', 'host', '  if (fx.points.negotiation <= 0) return cases;', '  if (fx.points.negotiation <= 9) return cases;'],
  spendany: ['8', 'host', '  if (!(live as readonly string[]).includes(tree)) return null;', '  if (false) return null;'],
  stalestaff: ['9', 'host', '    if (r.fresh) blocks[r.key] = r.fresh(league, team);', '    if (r.fresh) blocks[r.key] = desk.blocks[r.key];'],
  halfseason: ['9', 'host', '  for (let i = 0; i < periods; i++) desk = kept(', '  for (let i = 0; i < periods / 2; i++) desk = kept('],
  noyear: ['9', 'host', '    desk: hostSitOut({ v: desk.v, blocks }, seat),', '    desk: { v: desk.v, blocks },'],
  lastcall: ['9', 'host', "  if (!hostCanSitOut(market)) return { ok: false, reason: 'last-call' };", "  if (false) return { ok: false, reason: 'last-call' };"],
  shutbutton: ['10', 'host', "  return !!market && market.nextYear !== 'shut';", "  return !!market && (market as HostMarket).state !== 'closed';"],
  passquiet: ['10', 'host', "    return climb !== null ? `${called} Pass, and next year ${climb}` : called;", '    return called;'],
  emptytile: ['10', 'host', "value: 'The phone has stopped',", "value: '',"],
  closedsit: ['10', 'host', 'Nobody called, and nobody will: the phone has stopped. A new front office is the way back in.',
    'Nobody has called yet. Sit the year out and see who remembers you.'],
  fewseasons: ['10', 'host', '  const record = seasonsAndTitles(hostStintSeasons(seat, index), s.grades', '  const record = seasonsAndTitles(s.grades.length, s.grades'],
};
if (CONTROL && !EDITS[CONTROL]) {
  console.error(`SIM_GM_DESK_HOST_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EDITS).join(', ')})`);
  process.exit(2);
}
const sources = new Map();
const srcOf = which => { if (!sources.has(which)) sources.set(which, lf(fs.readFileSync(FILES[which], 'utf8'))); return sources.get(which); };
/** A rewrite is refused unless its line is in the file exactly once and the rewrite changes it. */
function rewrite(name, which, from, to) {
  const src = srcOf(which);
  if (!src.includes(from)) return `${name}: ${path.basename(FILES[which])} does not hold the line it rewrites (${from.slice(0, 60)}...)`;
  if (src.split(from).length !== 2) return `${name}: the line it rewrites is in ${path.basename(FILES[which])} more than once`;
  if (src.replace(from, to) === src) return `${name}: the rewrite changes nothing`;
  return null;
}
/* Always on: keyedRng counts its calls, so check 7 can prove an effect with no point draws nothing. */
const COUNTING = ['count', 'keyed', 'export function keyedRng(key: string): () => number {',
  'export const keyedCalls: string[] = [];\nexport function keyedRng(key: string): () => number {\n  keyedCalls.push(key);'];
if (process.env.SIM_GM_DESK_HOST_ANCHORS) {
  const bad = [rewrite(...COUNTING), ...Object.entries(EDITS).map(([n, [, which, from, to]]) => rewrite(n, which, from, to))].filter(Boolean);
  for (const b of bad) console.error(`  ANCHOR ${b}`);
  console.log(`simGmDeskHost anchors: ${Object.keys(EDITS).length + 1} rewrites checked, ${bad.length} cannot run`);
  process.exit(bad.length ? 1 : 0);
}
const overrides = new Map();
const apply = (name, which, from, to) => {
  const bad = rewrite(name, which, from, to);
  if (bad) { console.error(`control cannot run: ${bad}`); process.exit(2); }
  const key = path.resolve(FILES[which]).toLowerCase();
  overrides.set(key, (overrides.get(key) ?? srcOf(which)).replace(from, to));
};
apply(...COUNTING);
if (CONTROL) {
  const [section, which, from, to] = EDITS[CONTROL];
  apply(CONTROL, which, from, to);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${section} must go red`);
}

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const NM = modulesDir();
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simGmDeskHost-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
const lib = f => `'${ROOT_URL}/src/lib/${f}.ts'`;
const part = f => `'${ROOT_URL}/src/components/front-office-shared/${f}.tsx'`;
fs.writeFileSync(ENTRY, `
export * as H from ${lib('gmDeskHost')};
export * as SEAT from ${lib('gmSeat')};
export * as XP from ${lib('gmXp')};
export * as MO from ${lib('managerOffers')};
export * as FM from ${lib('foOwnerMandate')};
export * as FP from ${lib('foGmPress')};
export * as FC from ${lib('frontOfficeCuts')};
export * as GC from ${lib('gmContracts')};
export * as G from ${lib('gmDesk')};
export * as K from ${lib('keyedRng')};
export * as ENhl from ${lib('nhlFrontOffice')};
export * as ENba from ${lib('nbaFrontOffice')};
export * as EMlb from ${lib('mlbFrontOffice')};
export * as ENfl from ${lib('frontOffice')};
export { nhlDeskHost } from ${lib('gmDeskHostNhl')};
export { nbaDeskHost } from ${lib('gmDeskHostNba')};
export { mlbDeskHost } from ${lib('gmDeskHostMlb')};
export { nflDeskHost } from ${lib('gmDeskHostNfl')};
export { nhlContractHost } from ${lib('gmContractsHostNhl')};
export { nbaContractHost } from ${lib('gmContractsHostNba')};
export { mlbContractHost } from ${lib('gmContractsHostMlb')};
export { nflContractHost } from ${lib('gmContractsHostNfl')};
export { nbaCloseSeasonStats } from ${lib('nbaSeasonStats')};
export { leagueNames } from ${lib('foNames')};
export { GM_SEAT_PACKS } from '${ROOT_URL}/src/data/gmSeat/packs.ts';
export { GM_SPORTS } from ${lib('gmSport')};
export { NHL_OPENING_RATINGS } from '${ROOT_URL}/src/data/nhlOpeningRatings.ts';
export { NBA_OPENING_RATINGS } from '${ROOT_URL}/src/data/nbaOpeningRatings.ts';
export { FO_DEPTH } from '${ROOT_URL}/src/data/frontOfficeDepth.ts';
export { GM_CAREER_PANELS } from ${part('gmCareerDesk')};
export { default as MarketPanel } from ${part('GmJobMarketPanel')};
export { default as CareerPanel } from ${part('GmCareerPanel')};
export { default as XpPanel } from ${part('GmXpDeskPanel')};
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const render = (C, p) => renderToStaticMarkup(React.createElement(C, p));
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': `${ROOT_URL}/src` },
  outfile: BUNDLE, logLevel: 'error',
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const hit = overrides.get(path.resolve(args.path).toLowerCase());
        return hit === undefined ? undefined : { contents: hit, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  }],
});
/* Production is off limits: refuse to run a bundle that carries the database client. */
{
  const text = fs.readFileSync(BUNDLE, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) {
    if (text.includes(host)) { console.error(`refusing to run: the bundle names ${host}`); process.exit(2); }
  }
}
const M = createRequire(import.meta.url)(BUNDLE);
const { H, SEAT, XP, MO, FM, FP, FC, GC, G, K, ENhl, ENba, EMlb, ENfl, leagueNames, GM_SEAT_PACKS } = M;
if (!Array.isArray(K.keyedCalls)) { console.error('the bundle does not carry the counting keyedRng'); process.exit(2); }

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clone = v => JSON.parse(J(v));
const sameId = id => id;
const byGrade = cls => [...cls].sort((a, b) => b.grade - a.grade || a.id.localeCompare(b.id))[0];

/* ---- the four engines, each driven by its own calls in its board's order (a save with the desk off) ---- */
/* Draft night, the same four drivers the sport desk harnesses use: the user takes the best grade, the CPU clubs go in batches. */
function draftNhl(lg, team, rng) {
  const E = ENhl, mine = lg.teams[team];
  let cls = E.nhlDraftClass(rng, Math.max(24, (E.nhlDraftCapital(mine) ?? 0) + 10), leagueNames(lg));
  let left = 2, picksLeft = E.nhlDraftCapital(mine) ?? 0;
  const aiBatch = () => { cls = E.nhlAiDraftPicks(lg, cls, E.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), rng).remaining; left -= 1; };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = byGrade(cls);
    if (!E.nhlConsumeDraftPick(mine)) break;
    mine.players.push(E.nhlProspectToPlayer(pr, rng, lg.ratingModelVersion));
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    for (let i = nextPicks === 0 ? left : Math.min(1, left); i > 0; i--) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
}
function draftMlb(lg, team, rng) {
  const E = EMlb, mine = lg.teams[team];
  let cls = E.mlbDraftClass(rng, Math.max(24, (E.mlbDraftCapital(mine) ?? 0) + 10), leagueNames(lg));
  let left = 2, picksLeft = E.mlbDraftCapital(mine) ?? 0;
  const aiBatch = () => { cls = E.mlbAiDraftPicks(lg, cls, E.mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), rng).remaining; left -= 1; };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = byGrade(cls);
    if (!E.mlbConsumeDraftPick(mine)) break;
    mine.players.push(E.mlbProspectToPlayer(pr, rng));
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, E.mlbDraftCapital(mine) ?? 0);
    for (let i = nextPicks <= 0 ? left : Math.min(1, left); i > 0; i--) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
}
function draftNba(lg, team, rng) {
  const E = ENba, mine = lg.teams[team];
  const capital = E.nbaDraftCapital(mine) ?? 0;
  const rivals = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((s, t) => s + (E.nbaDraftCapital(t) ?? 0), 0);
  let cls = E.nbaDraftClass(rng, Math.max(24, capital + Math.min(10, rivals)), leagueNames(lg));
  let batches = 2;
  const aiBatch = () => { cls = E.nbaAiDraftPicks(lg, cls, E.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), rng).remaining; batches -= 1; };
  if (capital === 0) { mine.picks = []; while (batches > 0) aiBatch(); return; }
  let picksLeft = capital;
  while (picksLeft > 0) {
    const cap = E.nbaDraftCapital(mine) ?? 0;
    if (cap === 0) break;
    if (cap > picksLeft) mine.picks = mine.picks.slice(-picksLeft);
    const pr = cls[0];
    if (!pr || !E.nbaConsumeDraftPick(mine)) break;
    mine.players.push(E.nbaProspectToPlayer(pr, rng, E.nbaDraftSigning(lg)));
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    do { if (batches === 0) break; aiBatch(); } while (nextPicks === 0 && batches > 0);
    picksLeft = nextPicks;
  }
}
function draftNfl(lg, team, rng) {
  const E = ENfl, mine = lg.teams[team];
  const count = mine.picks.length;
  let batches = Math.max(3, count);
  const rivals = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((s, t) => s + t.picks.length, 0);
  let cls = E.generateDraftClass(rng, Math.max(40, count + Math.min(rivals, batches * 6)), leagueNames(lg));
  const ai = n => { for (let i = 0; i < n; i++) cls = E.nflAiDraftPicks(lg, cls, team, rng).remaining; batches -= n; };
  if (count <= 0) { ai(batches); return; }
  for (let picksLeft = count; picksLeft > 0; picksLeft--) {
    const pr = byGrade(cls);
    if (!pr || !E.consumeDraftPick(mine)) break;
    const p = E.prospectToPlayer(pr, rng);
    if (p) mine.players.push(p);
    cls = cls.filter(x => x.id !== pr.id);
    ai(picksLeft - 1 <= 0 ? batches : Math.min(1, batches));
  }
}
/** The board holds Play until the user's roster fits: the GM lets the weakest go. */
function cutDown(mine, fas, over, value, release) {
  while (over(mine)) {
    const down = [...mine.players].sort((a, b) => value(a) - value(b) || a.id.localeCompare(b.id))[0];
    if (!down || !release(mine, fas, down.id)) break;
  }
}
const post = (series, marker) => team => FM.seriesPostseason(series, team, marker);
const crown = (lg, champion) => { lg.champions.push({ season: lg.season, team: champion }); return champion; };
const DRIVE = {
  nhl: {
    E: ENhl, host: M.nhlDeskHost, contracts: M.nhlContractHost, team: 'TOR', periods: ENhl.NHL_FO_ROUNDS,
    init: rng => ENhl.initNhlLeague(rng, M.NHL_OPENING_RATINGS), at: lg => lg.round, step: lg => { lg.round += 1; },
    strength: ENhl.nhlStrength, payroll: ENhl.nhlCapUsed, table: lg => ENhl.nhlFoStandings(lg), value: ENhl.nhlTradeValue, release: ENhl.nhlRelease,
    period(lg, team, rng) { ENhl.simNhlRound(lg, team, rng); ENhl.nhlAiMoves(lg, team, rng); },
    close(lg, team, rng) { const po = ENhl.runNhlFoPlayoffs(lg, rng); return { champion: crown(lg, po.champion), post: post(po.series) }; },
    draft: draftNhl, summer(lg, team, rng) { ENhl.nhlOffseason(lg, rng, team); },
  },
  nba: {
    E: ENba, host: M.nbaDeskHost, contracts: M.nbaContractHost, team: 'BOS', periods: ENba.NBA_ROUNDS,
    init: rng => ENba.initNbaLeague(rng, M.NBA_OPENING_RATINGS), at: lg => lg.round, step: lg => { lg.round += 1; },
    strength: ENba.nbaStrength, payroll: ENba.nbaCapUsed, table: lg => ENba.nbaStandings(lg), value: ENba.nbaTradeValue, release: ENba.nbaRelease,
    period(lg, team, rng) {
      if (lg.round === 1) { cutDown(lg.teams[team], lg.freeAgents, t => !!ENba.nbaTipOffRefusal(t), p => p.ovr, ENba.nbaRelease); ENba.nbaTipOff(lg, rng, team); }
      ENba.simRound(lg, team, rng);
    },
    close(lg, team, rng) {
      const po = ENba.runNbaPlayoffs(lg, rng);
      crown(lg, po.champion); ENba.nbaAssessTax(lg); M.nbaCloseSeasonStats(lg);
      return { champion: po.champion, post: post(po.series, 'Play-In') };
    },
    draft: draftNba, summer(lg, team, rng) { ENba.nbaOffseason(lg, rng, team); },
  },
  mlb: {
    E: EMlb, host: M.mlbDeskHost, contracts: M.mlbContractHost, team: 'BOS', periods: EMlb.MLB_ROUNDS,
    init: rng => EMlb.initMlbLeague(rng), at: lg => lg.round, step: lg => { lg.round += 1; },
    strength: EMlb.mlbStrength, payroll: EMlb.mlbCapUsed, table: lg => EMlb.mlbStandings(lg), value: EMlb.mlbTradeValue, release: EMlb.mlbRelease,
    period(lg, team, rng) { EMlb.simMlbRound(lg, team, rng); EMlb.mlbAiMoves(lg, team, rng); },
    close(lg, team, rng) { const po = EMlb.runMlbPlayoffs(lg, rng); return { champion: crown(lg, po.champion), post: post(po.series) }; },
    draft: draftMlb,
    summer(lg, team, rng) { EMlb.mlbOffseason(lg, rng, team); cutDown(lg.teams[team], lg.freeAgents, t => EMlb.mlbOverLimit(t) > 0, EMlb.mlbTradeValue, EMlb.mlbRelease); },
  },
  nfl: {
    E: ENfl, host: M.nflDeskHost, contracts: M.nflContractHost, team: 'KC', periods: ENfl.REGULAR_WEEKS,
    init: rng => ENfl.initLeague(rng, { depth: M.FO_DEPTH, userTeam: 'KC' }), at: lg => lg.week, step: lg => { lg.week += 1; },
    strength: ENfl.teamStrength, payroll: ENfl.capUsed, table: lg => ENfl.standings(lg.teams), value: ENfl.tradeValue, release: ENfl.releasePlayer,
    period(lg, team, rng) { ENfl.injuryPass(lg.teams, rng); ENfl.aiWeeklyMoves(lg, team, rng); lg.schedule[lg.week - 1].map(g => ENfl.simGame(g, lg.teams, rng)); },
    close(lg, team, rng) { const po = ENfl.runPlayoffs(lg.teams, rng); return { champion: crown(lg, po.champion), post: t => FM.nflPostseason(po.rounds, t) }; },
    draft: draftNfl,
    summer(lg, team, rng) { ENfl.runOffseason(lg, rng, team); cutDown(lg.teams[team], lg.freeAgents, t => ENfl.deepOverLimit(t) > 0, ENfl.tradeValue, ENfl.releasePlayer); },
  },
};
const SPORTS = Object.keys(DRIVE);

/* Floors: the measured size of each walk on seeds 1,2,3 (see MEASURED). A walk that shrinks under its floor proves nothing. */
const T = {
  minLeagues: 58, minRealSaves: 168, minFeedsWithOffers: 23, minOffers: 8400, minBadlyOffers: 1570, minClimb: 560, minClosed: 3300, minQuietOpen: 2300,
  minReach: 455, minVerdicts: 780, minLosing: 348, minFiredCloses: 348, minCases: 6100, minMen: 2290, minYoung: 7600, minPairs: 730000, minCuts: 200,
};
/* CONTROL COUNTS, measured 2026-10-10 on a GitHub runner, seeds 1,2,3, each control run alone. Every one fired in
   its own check; the failures counted there, then any other check it also turned red:
     mutate 21 in 1          dropclub 63 in 1        fillmet 2640 in 2       readwrites 120 in 2 (and 6)
     unkeyed 48 in 3 (and 9) firedclub 504 in 4      badlyceiling 102 in 4   askseason 12057 in 4 (and 9)
     closedquiet 1311 in 5 (and the climb floor of 4)                        twice 1116 in 6
     lateseat 744 in 6       failopen 1116 in 6      cushionall 498 in 6     flatlevel 4272 in 7 (and 6)
     sharedroll 20 in 7      flatowner 5000 in 7 (and 6)                     flatmedia 140 in 7
     flatcut 260 in 7        flatask 20 in 7         spendany 1 in 8         stalestaff 12 in 9
     halfseason 24 in 9      noyear 24 in 9          emptytile 4770 in 10    closedsit 4946 in 10
     fewseasons 504 in 10
   badlyceiling did NOT fire on the full leagues alone (0 failures in 2,260 offers after a badly season): the
   engine's own ceiling hides the rule there, which is why check 4 also reads six real clubs at a time
   (653 / 651 / 653 offers in 216 feeds on the three seed sets, none from the top tier). */

const nameOf = id => `${id} club`;
const LIVE = XP.GM_TREES;
const strengthsOf = (d, lg) => Object.fromEntries(Object.values(lg.teams).map(t => [t.abbr, d.strength(t)]));
const tiersOf = (d, lg) => SEAT.leagueTiers(H.hostSeatTeams(d.host, lg, sameId));
/** A record that ended in a sacking, built by gmSeat's own calls. */
function firedSeat(team, tier, season, grades, out = 0) {
  let c = SEAT.newGmCareer(team, tier, season - out - grades.length + 1);
  for (const g of grades) c = SEAT.recordSeatSeason(c, g);
  c = SEAT.endSeatStint(c, 'fired');
  for (let i = 0; i < out; i++) c = SEAT.sitOutYear(c);
  return { v: 1, career: c, last: season - out };
}
/** A desk whose XP block holds these points, bought with gmXp's own spend. */
function deskWith(points) {
  let b = XP.addXp(XP.defaultGmXp(), 10_000_000);
  for (const [tree, n] of Object.entries(points)) {
    for (let i = 0; i < n; i++) { b = XP.spendGmPoint(b, tree); if (!b) { console.error(`harness: cannot buy ${n} in ${tree}`); process.exit(2); } }
  }
  return G.withGmBlock(G.freshGmDesk(), 'xp', b);
}

/* ---- the fleet: SEASONS real seasons a seed a sport, a copy of the league kept at each resting point ---- */
const FLEET = {};
for (const sport of SPORTS) {
  const d = DRIVE[sport], team = d.team;
  const F = FLEET[sport] = { mid: [], closed: [], open: [] };
  for (const seed of SEEDS) {
    const rng = mulberry32(seed * 7919 + SPORTS.indexOf(sport));
    const lg = d.init(rng);
    const ids = Object.keys(lg.teams);
    let trust = FM.FO_TRUST_START, fired = false, seasonsPlayed = 0, titles = 0;
    for (let s = 0; s < SEASONS; s++) {
      const start = strengthsOf(d, lg);
      const champ = lg.champions.length ? lg.champions[lg.champions.length - 1].team : null;
      const mandates = Object.fromEntries(ids.map(c => [c, FM.buildOwnerMandate(FM.strengthRank(start, c), ids.length, champ === c, d.host.pack.words, lg.season, 0)]));
      for (;;) {
        d.period(lg, team, rng);
        if (d.at(lg) >= d.periods) break;
        d.step(lg);
        if (s === 0 && d.at(lg) === 8) F.mid.push({ seed, s, team, lg: clone(lg), mandates, facts: { trust, fired, seasonsPlayed, titles } });
      }
      const po = d.close(lg, team, rng);
      const outcomes = Object.fromEntries(ids.map(c => [c, { wins: lg.teams[c].wins, ...po.post(c), wonTitle: po.champion === c }]));
      const g = FM.gradeSeason(mandates[team], outcomes[team]);
      const a = FM.applyMandateResult(trust, g);
      const beforeFacts = { trust, fired, seasonsPlayed, titles };
      trust = a.trust; fired = fired || a.fired; seasonsPlayed += 1; if (po.champion === team) titles += 1;
      F.closed.push({ seed, s, team, lg: clone(lg), mandates, outcomes, champion: po.champion, before: beforeFacts, facts: { trust, fired, seasonsPlayed, titles } });
      d.draft(lg, team, rng);
      d.summer(lg, team, rng);
      F.open.push({ seed, s, team, lg: clone(lg), mandates, facts: { trust, fired, seasonsPlayed, titles } });
    }
  }
}
/* Every string a walk meets, judged together in check 10. */
const WORDS = [];
const word = (s, where) => { WORDS.push([s, where]); };
const LINES = [];                      // the market's line and box for every career on the ladder
const SAMPLE = {};                     // sport -> state -> one seat and its market, for the panels

/* ================================================================== */
begin('1', 'the four adapters over real leagues: every club once, the engine\'s own numbers, and a read changes nothing');
let leaguesRead = 0;
for (const sport of SPORTS) {
  const d = DRIVE[sport], F = FLEET[sport];
  for (const snap of [...F.mid, ...F.closed, ...F.open]) {
    const lg = snap.lg, before = J(lg), ids = Object.keys(lg.teams), at = `${sport} seed ${snap.seed} season ${snap.s + 1}`;
    const clubs = d.host.clubs(lg);
    ok(clubs.length === ids.length && new Set(clubs.map(c => c.id)).size === ids.length && clubs.every(c => ids.includes(c.id)), `${at}: ${clubs.length} clubs read, the league holds ${ids.length}`);
    ok(J([...clubs].sort((x, y) => x.place - y.place).map(c => c.id)) === J(d.table(lg).map(t => t.abbr)), `${at}: the places are not the engine's standings order`);
    ok(J(clubs.map(c => c.place).sort((x, y) => x - y)) === J(clubs.map((_, i) => i + 1)), `${at}: the places are not 1 to ${clubs.length}`);
    for (const c of clubs) {
      const t = lg.teams[c.id];
      if (!t) continue;
      if (c.strength !== d.strength(t)) fail(`${at} ${c.id}: strength ${c.strength}, the engine says ${d.strength(t)}`);
      if (c.payroll !== d.payroll(t)) fail(`${at} ${c.id}: payroll ${c.payroll}, the engine says ${d.payroll(t)}`);
      if (c.wins !== t.wins || c.games !== c.wins + c.losses || !c.record.startsWith(`${t.wins}-`)) fail(`${at} ${c.id}: record ${c.record}, ${c.wins} wins in ${c.games} games`);
    }
    ok(d.host.season(lg) === lg.season && d.host.cap(lg) === lg.cap && d.host.sport === sport && d.host.pack === GM_SEAT_PACKS[sport], `${at}: the season, the line or the pack is not the league's`);
    for (const c of lg.champions) ok(d.host.champion(lg, c.season) === c.team, `${at}: the champion of ${c.season} is not the league's`);
    ok(d.host.champion(lg, lg.season + 9) === null, `${at}: a champion for a season not played`);
    H.hostSeatTeams(d.host, lg, sameId);
    H.hostLegacy(d.host, lg, { team: snap.team, seasonsPlayed: 1, titles: 0, fired: false, seasonCounted: true });
    ok(J(lg) === before, `${at}: a read changed the league`);
    leaguesRead++;
  }
}
ok(leaguesRead >= T.minLeagues, `only ${leaguesRead} leagues read, the walk measured ${T.minLeagues} or more`);
console.log(`   ${leaguesRead} real leagues read (${SPORTS.join(', ')}; mid season, closed and after a summer)`);

/* ================================================================== */
begin('2', 'the record of a save older than the block: nothing filled in, and real saves pass every read with no write');
const GRADES = ['title', 'overachieved', 'met', 'missed', 'badly'];
let gridRows = 0;
for (let sp = 0; sp <= 15; sp++) for (let ti = 0; ti <= sp; ti++) for (const lastGrade of [null, ...GRADES]) for (const fired of [false, true]) for (const counted of [false, true]) {
  const b = H.hostLegacySeat({ team: 'AAA', tier: 2, season: 2030, seasonCounted: counted, seasonsPlayed: sp, titles: ti, fired, lastGrade });
  const st = b.career.stints[0], at = `seasons ${sp} titles ${ti} last ${lastGrade} fired ${fired} counted ${counted}`;
  gridRows++;
  if (!H.isGmSeatBlock(b) || SEAT.sanitizeGmCareer(clone(b.career)) === null) fail(`${at}: the record fails its own validator`);
  if (st.grades.filter(g => g === 'title').length !== ti) fail(`${at}: ${ti} titles in, ${st.grades.filter(g => g === 'title').length} out`);
  if (st.grades.length + b.before.seasons !== sp) fail(`${at}: ${st.grades.length} graded plus ${b.before.seasons} counted is not ${sp}`);
  const rest = st.grades.filter(g => g !== 'title');
  if (rest.length > 1 || rest.some(g => g !== lastGrade)) fail(`${at}: a grade nobody handed in (${rest.join(',')})`);
  if (st.from !== 2030 - sp + (counted && sp >= 1 ? 1 : 0)) fail(`${at}: the stint starts in ${st.from}`);
  if (b.before.tierUnknown !== true || b.last !== undefined || (st.ended === 'fired') !== fired) fail(`${at}: the arrival tier, the last season or the ending is wrong`);
}
/** Every read the host offers, over one save. Returns what it read; the caller proves nothing was written. */
function readAll(d, save, desk, counted, outcome) {
  const lg = save.league;
  const legacy = H.hostLegacy(d.host, lg, {
    team: save.myTeam, seasonsPlayed: save.seasonsPlayed, titles: save.titles, fired: !!save.fired, seasonCounted: counted,
    lastGrade: H.hostLastGrade(d.host, lg, save.mandate, outcome ?? null),
  });
  const seat = H.hostSeatOf(desk, legacy);
  const xp = H.hostXpOf(desk);
  const market = H.hostMarket(d.host, lg, seat, nameOf);
  const where = `${d.host.sport} ${save.phase}`;
  const tile = t => { if (t) { word(t.value, `${where} tile`); word(t.sub, `${where} tile`); } };
  tile(H.hostMarketTile(market, d.host.pack)); tile(H.hostCareerTile(seat, nameOf)); tile(H.hostXpTile(desk, LIVE, !!desk));
  if (market) {
    word(market.line, `${where} market line`);
    const card = H.hostOutOfWorkCard(d.host, lg, seat, market, nameOf);
    word(card.title, `${where} card`); card.lines.forEach(l => word(l, `${where} card`));
    for (const o of market.offers) {
      word(H.hostOfferFactsLine(market.facts[o.teamId], M.GM_SPORTS[d.host.sport].cap.line), `${where} offer`);
      word(H.hostTakeArmLine(d.host.pack, o, !!desk), `${where} offer`); word(o.reason, `${where} offer`); word(o.ask.text, `${where} offer`);
    }
    word(H.hostSitArmLine(market, !!desk), `${where} sit`);
  }
  for (const v of H.hostStintViews(seat, nameOf)) { word(v.arrival, `${where} stint`); word(v.ended, `${where} stint`); if (v.earlier !== null) word(v.earlier, `${where} stint`); }
  word(H.hostCareerTotalsLine(seat), `${where} totals`);
  H.hostXpEffects(desk, d.host.sport); H.hostCanSpend(desk, LIVE); H.hostArriving(seat, lg.season);
  return { legacy, seat, xp, market };
}
let realSaves = 0;
const oldDesk = () => ({ v: 1, blocks: { contracts: { from: 'an older build' }, staff: { level: 2 } } });
for (const sport of SPORTS) {
  const d = DRIVE[sport], F = FLEET[sport];
  const saves = [
    ...F.mid.map(x => ({ snap: x, phase: 'hub', counted: false, fired: false })),
    ...F.closed.map(x => ({ snap: x, phase: 'recap', counted: true, fired: false, outcome: x.outcomes[x.team] })),
    ...F.closed.map(x => ({ snap: x, phase: 'fired', counted: true, fired: true, outcome: x.outcomes[x.team] })),
    ...F.open.map(x => ({ snap: x, phase: 'hub', counted: false, fired: false })),
  ];
  for (const sv of saves) for (const desk of [null, oldDesk()]) {
    const f = sv.snap.facts;
    const save = {
      league: sv.snap.lg, myTeam: sv.snap.team, trust: sv.fired ? 0 : f.trust, fired: sv.fired, mandate: sv.snap.mandates[sv.snap.team],
      seasonsPlayed: f.seasonsPlayed, titles: f.titles, pressTilt: 0, seasonTradeLine: null, phase: sv.phase,
    };
    const before = J([save, desk]), at = `${sport} seed ${sv.snap.seed} season ${sv.snap.s + 1} ${sv.phase}${desk ? ' with a desk' : ''}`;
    try {
      const r = readAll(d, save, desk, sv.counted, sv.outcome);
      if ((r.market !== null) !== sv.fired) fail(`${at}: the market is ${r.market ? 'open' : 'null'} on a save that is ${sv.fired ? '' : 'not '}fired`);
      if (H.hostSeasonsRecorded(r.seat) !== f.seasonsPlayed) fail(`${at}: the record holds ${H.hostSeasonsRecorded(r.seat)} seasons, the save played ${f.seasonsPlayed}`);
      if (SEAT.careerTotals(r.seat.career).titles !== Math.min(f.titles, f.seasonsPlayed)) fail(`${at}: the titles are not the save's`);
      if (sv.phase === 'recap' && r.legacy.lastGrade !== FM.gradeSeason(save.mandate, sv.outcome).result) fail(`${at}: the last grade worked out again is not the season's grade`);
      if (sv.phase === 'hub' && r.legacy.lastGrade !== null) fail(`${at}: a last grade on a season that is not closed`);
    } catch (e) { fail(`${at}: a read threw (${String(e && e.message).slice(0, 120)})`); }
    if (J([save, desk]) !== before) fail(`${at}: a read wrote to the save or the desk`);
    realSaves++;
  }
}
ok(realSaves >= T.minRealSaves, `only ${realSaves} real saves read`);
console.log(`   ${gridRows} grid records, ${realSaves} real saves read with and without a desk`);

/* ================================================================== */
begin('3', 'the feed is keyed: the same save reads the same feed every time, and a year or a season on reads a new one');
const digest = [];
let feedsRead = 0, feedsWithOffers = 0;
for (const sport of SPORTS) {
  const d = DRIVE[sport], lg = FLEET[sport].closed[0].lg, tiers = tiersOf(d, lg);
  const olds = [1, 2, 3, 4].map(t => d.host.clubs(lg).map(c => c.id).sort().find(id => tiers.get(id) === t));
  for (const old of olds) for (const grades of [['met', 'overachieved', 'title', 'met'], ['title', 'title', 'missed'], ['met', 'missed']]) {
    const seat = firedSeat(old, tiers.get(old), lg.season, grades);
    const first = J(H.hostMarket(d.host, lg, seat, nameOf).offers);
    feedsRead++;
    if (first !== '[]') feedsWithOffers++;
    for (let i = 0; i < 200; i++) {
      Math.random();
      if (J(H.hostMarket(d.host, lg, seat, nameOf).offers) !== first) { fail(`${sport} ${old} ${grades.join(',')}: read ${i + 2} of the same save is another feed`); break; }
    }
    digest.push(first);
    const key = H.hostFeedKey(sport, seat, lg.season);
    if (key === H.hostFeedKey(sport, firedSeat(old, tiers.get(old), lg.season + 1, grades, 1), lg.season + 1)) fail(`${sport} ${old}: a year out reads the same key`);
    if (key === H.hostFeedKey(sport, seat, lg.season + 1)) fail(`${sport} ${old}: a season on reads the same key`);
    if (key !== H.hostFeedKey(sport, clone(seat), lg.season)) fail(`${sport} ${old}: the same record reads two keys`);
  }
}
ok(feedsWithOffers >= T.minFeedsWithOffers, `only ${feedsWithOffers} of ${feedsRead} feeds held an offer, too few to tell a keyed feed from an empty one`);
console.log(`   ${feedsRead} feeds read 201 times each, ${feedsWithOffers} of them with offers; feed digest ${sha(digest.join('|'))}`);

/* ================================================================== */
begin('4', 'the market rules on real tiers: never the club that let him go, a ceiling after a badly season, the ask is next season\'s');
/* The ladder: 0 to 6 titles, then one of these endings. The last five are the
   bad careers the standing formula can sink (two and three 'badly' seasons),
   without which no career reads closed and check 5 would be empty. */
const TAILS = [['title'], ['overachieved'], ['met'], ['missed'], ['badly'], ['badly', 'badly'], ['badly', 'badly', 'badly'],
  ['badly', 'badly', 'missed'], ['badly', 'missed', 'missed'], ['missed', 'missed', 'missed', 'missed']];
const M4 = { markets: 0, offers: 0, withOffers: 0, badlyOffers: 0, quietOpen: 0, climb: 0, closed: 0, most: 0, lastCalls: 0, passClimb: 0 };
const closedCareers = [], quietCareers = [], lastCallCareers = [];
for (const sport of SPORTS) {
  const d = DRIVE[sport], pack = d.host.pack;
  for (const snap of FLEET[sport].closed.filter(x => x.s === 0)) {
    const lg = snap.lg, season = lg.season, before = J(lg), clubs = d.host.clubs(lg), tiers = tiersOf(d, lg);
    const olds = [1, 2, 3, 4].map(t => clubs.map(c => c.id).sort().find(id => tiers.get(id) === t));
    for (const old of olds) for (let titles = 0; titles <= 6; titles++) for (const tail of TAILS) for (let out = 0; out <= 4; out++) {
      const grades = [...Array(titles).fill('title'), ...tail];
      const seat = firedSeat(old, tiers.get(old), season, grades, out);
      const m = H.hostMarket(d.host, lg, seat, nameOf), at = `${sport} seed ${snap.seed} ${old} ${grades.join(',')} out ${out}`;
      M4.markets++;
      if (!m || m.season !== season + 1 || m.seasonsOut !== out) { fail(`${at}: no market, or not next season's`); continue; }
      const lastBadly = tail[tail.length - 1] === 'badly';
      for (const o of m.offers) {
        const c = clubs.find(x => x.id === o.teamId), f = m.facts[o.teamId];
        if (o.teamId === old) fail(`${at}: the club that let him go is in the feed`);
        if (lastBadly && o.tier < SEAT.BADLY_FIRED_CEILING) fail(`${at}: a tier ${o.tier} club calls straight after a badly season`);
        if (o.ask.season !== season + 1) fail(`${at}: the ask is for ${o.ask.season}, he would first be graded in ${season + 1}`);
        if (!c || o.tier !== tiers.get(o.teamId)) fail(`${at}: an offer from a club or a tier the league does not hold`);
        else if (!f || f.record !== c.record || f.place !== c.place || f.room !== Math.round((lg.cap - c.payroll) * 10) / 10) fail(`${at}: the facts under ${o.teamId} are not that club's`);
      }
      if ((m.offers.length > 0) !== (m.state === 'offers') || (m.state === 'closed') !== (m.offers.length === 0 && m.nextYear === 'shut')
        || (m.nextYear === 'climb') !== (m.climbTo !== null)) fail(`${at}: state ${m.state} with ${m.offers.length} offers and next year ${m.nextYear}`);
      M4.offers += m.offers.length; M4.most = Math.max(M4.most, m.offers.length);
      if (m.offers.length) { M4.withOffers++; if (lastBadly) M4.badlyOffers += m.offers.length; }
      if (m.state === 'closed') { M4.closed++; closedCareers.push({ sport, lg, seat, old, at }); }
      if (m.state === 'quiet') { if (m.nextYear === 'climb') M4.climb++; else M4.quietOpen++; quietCareers.push({ sport, lg, seat, old, at, m }); }
      /* Somebody called, and next year is not open: the last calls, or a year that hangs on a climb. */
      if (m.state === 'offers' && m.nextYear === 'shut') { M4.lastCalls++; lastCallCareers.push({ sport, lg, seat, old, at, m }); }
      if (m.state === 'offers' && m.nextYear === 'climb') M4.passClimb++;
      const tile = H.hostMarketTile(m, pack);
      LINES.push({ at, state: m.state, out, line: m.line, value: tile.value, sub: tile.sub, seasons: H.hostStintSeasons(seat, 0), m, pack, seat, oldName: nameOf(old) });
      const kind = m.state === 'quiet' && m.nextYear === 'climb' ? 'climb' : m.state === 'offers' && m.nextYear === 'shut' ? 'last' : m.state === 'offers' && m.nextYear === 'climb' ? 'pass' : m.state;
      (SAMPLE[sport] ??= {})[kind] ??= { seat, m, lg };
    }
    ok(J(lg) === before, `${sport} seed ${snap.seed}: reading the market changed the league`);
  }
}
/* The ceiling again, where it bites. In a full league the engine's own ceiling hides the rule (scripts/simGmSeat.mjs
   measured a top tier call after a badly season about once in 2,800 offers), so the same real clubs are read six at
   a time through the same adapter, where the one other top tier club is always in reach, for the decorated careers
   the rule exists for: three seasons over the ask, 5 to 10 titles, then four badly seasons and the sack. */
let reach = 0, reachFeeds = 0;
for (const sport of SPORTS) {
  const d = DRIVE[sport];
  for (const snap of FLEET[sport].closed) {
    const lg = snap.lg, six = [...d.host.clubs(lg)].sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id)).slice(0, 6).map(c => c.id);
    const small = { ...d.host, clubs: l => d.host.clubs(l).filter(c => six.includes(c.id)) };
    for (let k = 5; k <= 10; k++) {
      const seat = firedSeat(six[0], 1, lg.season, [...Array(3).fill('overachieved'), ...Array(k).fill('title'), ...Array(4).fill('badly')]);
      const m = H.hostMarket(small, lg, seat, nameOf);
      reachFeeds++;
      reach += m.offers.length;
      for (const o of m.offers) if (o.tier < SEAT.BADLY_FIRED_CEILING) fail(`${sport} seed ${snap.seed} season ${snap.s + 1}, six clubs, ${k} titles then four badly seasons: a tier ${o.tier} club calls`);
    }
  }
}
ok(reach >= T.minReach, `only ${reach} offers in the six club view, too few to hold the ceiling`);
ok(M4.offers >= T.minOffers && M4.badlyOffers >= T.minBadlyOffers, `${M4.offers} offers and ${M4.badlyOffers} after a badly season: too few to hold the rules`);
ok(M4.climb >= T.minClimb && M4.closed >= T.minClosed && M4.quietOpen >= T.minQuietOpen, `the ladder holds ${M4.quietOpen} quiet, ${M4.climb} quiet on a climb and ${M4.closed} closed careers: a state is missing`);
console.log(`   ${M4.markets} markets: ${M4.withOffers} with offers (${M4.offers} offers, ${M4.badlyOffers} after a badly season, at most ${M4.most} a feed), ${M4.quietOpen} quiet, ${M4.climb} quiet on a climb, ${M4.closed} closed`);
console.log(`   with offers on the table and next year not open: ${M4.lastCalls} are the last calls (next year shut), ${M4.passClimb} hang on a climb`);
console.log(`   the ceiling six clubs at a time: ${reach} offers in ${reachFeeds} feeds of the most decorated careers, none from the top tier`);

/* ================================================================== */
begin('5', 'closed means closed: no tier his old club can reach and no year out reopens it, and a quiet market is never in that set');
/** The league's clubs with one club's strength moved so it ranks inside tier t. */
function placeInTier(teams, id, t) {
  const others = teams.filter(x => x.id !== id).sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
  /* The middle slot of the tier, so a tie at either edge cannot push it out. */
  const at = Math.floor((Math.ceil(((t - 1) * teams.length) / 4) + Math.ceil((t * teams.length) / 4) - 1) / 2);
  const strength = (others[at - 1].strength + others[at].strength) / 2;
  const out = teams.map(x => (x.id === id ? { ...x, strength } : x));
  if (SEAT.leagueTiers(out).get(id) !== t) { console.error(`harness: could not place ${id} in tier ${t}`); process.exit(2); }
  return out;
}
const later = (career, years) => { let c = career; for (let i = 0; i < years; i++) c = SEAT.sitOutYear(c); return c; };
let reopenChecks = 0, quietChecks = 0;
/* Shut is shut with or without a call today: the last call careers (offers on the table, next year shut) are held
   to the same proof as the closed ones, since the year out is refused on the same word. */
for (const k of [...closedCareers, ...lastCallCareers]) {
  const d = DRIVE[k.sport], teams0 = H.hostSeatTeams(d.host, k.lg, sameId);
  for (const t of [1, 2, 3, 4]) {
    const teams = placeInTier(teams0, k.old, t), tiers = SEAT.leagueTiers(teams);
    for (let y = 1; y <= 10; y++) {
      const c = later(k.seat.career, y);
      reopenChecks++;
      if (MO.bestTierAvailable(SEAT.careerProfile(c, tiers)) !== null) { fail(`${k.at}: next year reads shut, yet ${y} more year(s) out with the old club in tier ${t} the market looks again`); break; }
      if (SEAT.seatOffers(d.host.pack, teams, c, k.lg.season + 1 + y, K.keyedRng(`closed|${k.at}|${t}|${y}`), null).length) { fail(`${k.at}: next year reads shut, yet a feed ${y} year(s) on holds an offer`); break; }
    }
  }
}
/* The year out is on offer exactly while next year can hold a call, whatever the state says today. */
for (const k of LINES) {
  if (H.hostCanSitOut(k.m) !== (k.m.nextYear !== 'shut')) fail(`${k.at}: state ${k.m.state}, next year ${k.m.nextYear}, and the year out is ${H.hostCanSitOut(k.m) ? 'offered' : 'not offered'}`);
}
ok(H.hostCanSitOut(null) === false, 'a year out is offered to a man who holds a seat');
for (const k of quietCareers) {
  const d = DRIVE[k.sport], teams0 = H.hostSeatTeams(d.host, k.lg, sameId), next = later(k.seat.career, 1);
  const open = t => MO.bestTierAvailable(SEAT.careerProfile(next, SEAT.leagueTiers(t === 0 ? teams0 : placeInTier(teams0, k.old, t)))) !== null;
  quietChecks++;
  if (k.m.nextYear === 'open' ? !open(0) : !(k.m.climbTo !== null && !open(0) && open(k.m.climbTo))) fail(`${k.at}: reads quiet (${k.m.nextYear}${k.m.climbTo ? ` to tier ${k.m.climbTo}` : ''}), and next year does not hold what it says`);
  if (k.m.nextYear === 'climb' && k.m.climbTo < 3 && tiersOf(d, k.lg).get(k.old) > k.m.climbTo + 1 && open(k.m.climbTo + 1)) fail(`${k.at}: a smaller climb than tier ${k.m.climbTo} already reopens it`);
}
console.log(`   ${closedCareers.length} closed careers and ${lastCallCareers.length} last call careers held shut over ${reopenChecks} tier and year checks; ${quietCareers.length} quiet careers each still open as they say`);

/* ================================================================== */
begin('6', 'the close on every club\'s real season: today\'s two calls with no desk, and with one the record, the XP and the order');
const C6 = { verdicts: 0, losing: 0, firedCloses: 0, cushioned: 0 };
const pace = {};                       // sport -> { awards: [], reached: [per season counts], clubs }
const clampTrust = n => Math.max(0, Math.min(100, n));
for (const sport of SPORTS) {
  const d = DRIVE[sport], F = FLEET[sport];
  const P = pace[sport] = { awards: [], reached: Array(SEASONS).fill(0), clubs: 0 };
  const total = new Map();
  for (const snap of F.closed) {
    const lg = snap.lg, before = J(lg), clubs = d.host.clubs(lg), k = snap.s;
    for (const c of clubs) {
      const mandate = snap.mandates[c.id], outcome = snap.outcomes[c.id], grade = FM.gradeSeason(mandate, outcome);
      const at = `${sport} seed ${snap.seed} season ${k + 1} ${c.id} (${grade.result})`;
      const input = { team: c.id, mandate, trust: 60, fired: false, outcome, desk: null, seasonsPlayed: k, titles: 0 };
      C6.verdicts++;
      if (grade.trustDelta < 0) C6.losing++;
      /* No desk: exactly gradeSeason then applyMandateResult, at three trusts. */
      for (const trust of [60, 16, 100]) {
        const v0 = H.hostSeasonVerdict(d.host, lg, { ...input, trust }), today = FM.applyMandateResult(trust, grade);
        if (v0.trust !== today.trust || v0.fired !== today.fired || v0.warning !== today.warning || J(v0.grade) !== J(grade) || v0.desk !== null || v0.award !== null) fail(`${at}: with no desk at trust ${trust} the verdict is not today's two calls`);
      }
      if (H.hostSeasonVerdict(d.host, lg, { ...input, mandate: null, trust: 37 }).trust !== 37) fail(`${at}: no mandate, and the trust moved`);
      /* A desk, on a save that played k seasons before the record began. */
      const desk0 = G.freshGmDesk();
      const v = H.hostSeasonVerdict(d.host, lg, { ...input, desk: desk0 });
      const want = XP.gmSeasonXp({ winPct: c.games > 0 ? c.wins / c.games : 0, titles: outcome.wonTitle ? 1 : 0, playoffRoundsWon: outcome.roundsWon,
        mandateSteps: XP.mandateSteps(grade.result), placesAboveExpectation: 0, prospectsGraduated: 0 });
      const seat = v.desk && v.desk.blocks.seat;
      if (!v.award || v.award.total !== want.total || J(v.award) !== J(want)) { fail(`${at}: the award is not gmSeasonXp of the season's facts`); continue; }
      if (!H.isGmSeatBlock(seat) || seat.last !== lg.season || J(desk0) !== J(G.freshGmDesk())) { fail(`${at}: the record was not written, or the desk handed in was changed`); continue; }
      const st = SEAT.currentStint(seat.career);
      if (st.from !== lg.season - k) fail(`${at}: the stint starts in ${st.from}, he started in ${lg.season - k}`);
      if (H.hostArriving(seat, lg.season)) fail(`${at}: the recap of his own season reads as an arrival`);
      if (st.grades[st.grades.length - 1] !== grade.result || H.hostSeasonsRecorded(seat) !== k + 1) fail(`${at}: the grade or the seasons on the record are not the season's`);
      if (J(G.readGmDesk(clone(v.desk))) !== J(v.desk)) fail(`${at}: the desk does not survive JSON`);
      /* Once: the recap read again, as a reload does. */
      const again = H.hostSeasonVerdict(d.host, lg, { ...input, desk: v.desk, seasonsPlayed: k + 1 });
      if (again.award !== null || J(again.desk) !== J(v.desk)) fail(`${at}: the same season was recorded twice`);
      /* A firing ends the stint, and only a firing. */
      const vf = H.hostSeasonVerdict(d.host, lg, { ...input, trust: 12, desk: G.freshGmDesk() });
      const ended = SEAT.currentStint(vf.desk.blocks.seat.career).ended;
      if ((ended === 'fired') !== vf.fired || (ended !== undefined && !vf.fired)) fail(`${at}: fired ${vf.fired}, the stint ended ${ended}`);
      if (vf.fired) { C6.firedCloses++; if (H.hostMarket(d.host, lg, vf.desk.blocks.seat, nameOf) === null) fail(`${at}: fired, and no market opens`); }
      /* The order: the cushion is on the grade's change alone, a business change rides uncushioned, the firing reads the sum. */
      const vm = H.hostSeasonVerdict(d.host, lg, { ...input, trust: 20, desk: deskWith({ ownership: 2 }), trustMovers: [-5] });
      const sum = XP.cushionTrustLoss(grade.trustDelta, 2) + -5;
      if (vm.trustDelta !== sum || vm.trust !== clampTrust(20 + sum) || vm.fired !== (clampTrust(20 + sum) <= 0)) fail(`${at}: with two Ownership points and a 5 point cheque the change is ${vm.trustDelta}, the order gives ${sum}`);
      if (XP.cushionTrustLoss(grade.trustDelta, 2) !== grade.trustDelta) C6.cushioned++;
      /* One corrupt block costs that block and no other. */
      const legacy = H.hostLegacy(d.host, lg, { team: c.id, seasonsPlayed: k + 1, titles: 0, fired: false, seasonCounted: true });
      const badSeat = { v: 1, blocks: { ...v.desk.blocks, seat: { v: 1, career: { stints: 'x' } } } };
      const badXp = { v: 1, blocks: { ...v.desk.blocks, xp: { xp: 'lots' } } };
      if (J(H.hostSeatOf(badSeat, legacy)) !== J(H.hostLegacySeat(legacy)) || J(H.hostXpOf(badSeat)) !== J(v.desk.blocks.xp)) fail(`${at}: a corrupt record was read as stored, or took the XP with it`);
      if (J(H.hostSeatOf(badXp, legacy)) !== J(seat) || J(H.hostXpOf(badXp)) !== J(XP.defaultGmXp())) fail(`${at}: corrupt XP was read as stored, or took the record with it`);
      /* The last grade, worked out again from the save, and only from this season. */
      if (H.hostLastGrade(d.host, lg, mandate, outcome) !== grade.result || H.hostLastGrade(d.host, lg, { ...mandate, season: lg.season - 1 }, outcome) !== null
        || H.hostLastGrade(d.host, lg, mandate, null) !== null) fail(`${at}: the last grade is not this season's, or a stale one was worked out`);
      /* The ask he was shown survives exactly one summer. */
      const offerAsk = { ...mandate, season: lg.season + 1 }, built = { ...mandate, season: lg.season + 1, text: 'built' };
      if (H.hostSummerMandate(offerAsk, built, lg.season + 1) !== offerAsk || H.hostSummerMandate(mandate, built, lg.season + 1) !== built || H.hostSummerMandate(null, built, lg.season + 1) !== built) fail(`${at}: the summer kept the wrong ask`);
      const line = H.hostXpRecapLine(v, LIVE);
      word(line, `${at} recap line`);
      /* Pace: what the four fed sources pay a club that plays every season. */
      const key = `${snap.seed}|${c.id}`;
      total.set(key, (total.get(key) ?? 0) + v.award.total);
      P.awards.push(v.award.total);
      if (total.get(key) >= XP.XP_FIRST_LEVEL) P.reached[k]++;
      if (k === 0) P.clubs++;
    }
    ok(J(lg) === before, `${sport} seed ${snap.seed} season ${k + 1}: the verdict changed the league`);
  }
  for (const m of F.mid) ok(H.hostLastGrade(d.host, m.lg, m.mandates[m.team], { wins: 1, madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false }) === null, `${sport}: a last grade on a season still being played`);
}
ok(C6.verdicts >= T.minVerdicts && C6.losing >= T.minLosing && C6.firedCloses >= T.minFiredCloses, `${C6.verdicts} verdicts, ${C6.losing} short of the ask, ${C6.firedCloses} firings: the walk shrank`);
console.log(`   ${C6.verdicts} real seasons graded: ${C6.losing} short of the ask (${C6.cushioned} cushioned), ${C6.firedCloses} firings from trust 12`);
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
for (const sport of SPORTS) {
  const P = pace[sport], share = P.reached.map(n => Math.round((100 * n) / Math.max(1, P.clubs)));
  const at = share.findIndex(x => x >= 50);
  console.log(`   ${sport} pace on four sources: median ${median(P.awards)} XP a season; clubs at the first point (${XP.XP_FIRST_LEVEL} XP) after 1, 2, 3 seasons: ${share.join(', ')} percent; median seasons to it: ${at < 0 ? `more than ${SEASONS}` : at + 1}`);
}

/* ================================================================== */
begin('7', 'every level of every tree, through its consumer, on real engine inputs');
const LEVELS = [0, 1, 2, 3, 4, 5];
const fxAt = (sport, tree, L) => H.hostXpEffects(L === 0 ? G.freshGmDesk() : deskWith({ [tree]: L }), sport);
const r2 = n => Math.round(n * 100) / 100;
/** A fleet total must move past the level below at EVERY step, the way a point is sold. A flat step is a failure. */
function steps(name, totals, dir) {
  for (let L = 1; L <= 5; L++) {
    if (!(dir > 0 ? totals[L] > totals[L - 1] : totals[L] < totals[L - 1])) fail(`${name}: level ${L} moves nothing past level ${L - 1} (${totals.map(r2).join(' / ')})`);
  }
}
const KLASS = {
  nhl: (lg, rng) => ENhl.nhlDraftClass(rng, 24, leagueNames(lg)), nba: (lg, rng) => ENba.nbaDraftClass(rng, 24, leagueNames(lg)),
  mlb: (lg, rng) => EMlb.mlbDraftClass(rng, 24, leagueNames(lg)), nfl: (lg, rng) => ENfl.generateDraftClass(rng, 40, leagueNames(lg)),
};
const C7 = { men: 0, young: 0, cases: 0, pairs: 0, cuts: 0, prospects: 0, gambles: 0, exact: 0, lost: 0, underMin: 0 };
const LADDER = {};
for (const sport of SPORTS) {
  const d = DRIVE[sport], pack = d.host.pack, lg = FLEET[sport].closed[0].lg, season = lg.season, before = J(lg);
  const men = Object.values(lg.teams).flatMap(t => t.players.map(p => ({ club: t.abbr, p })));
  const row = LADDER[sport] = {};
  C7.men += men.length;
  /* (a) No point: the input comes back and nothing is drawn. */
  for (const desk of [null, G.freshGmDesk(), deskWith({})]) {
    const fx = H.hostXpEffects(desk, sport);
    K.keyedCalls.length = 0;
    for (const { club, p } of men.slice(0, 200)) {
      const key = H.hostKey(club, season, p.id);
      if (fx.scoutNoise(3, key) !== 3 || fx.ask(p.salary, 0.5, key) !== p.salary || fx.deadMoney(p.salary, key) !== p.salary || fx.growth(2, 5, key) !== 2
        || fx.premium(1.07) !== 1.07 || fx.trustDelta(-16) !== -16 || fx.pressOdds(0.5) !== 0.5) { fail(`${sport}: an effect with no point changed its input`); break; }
    }
    if (K.keyedCalls.length !== 0) fail(`${sport}: effects with no point drew ${K.keyedCalls.length} keyed rolls`);
  }
  /* (b) Each level is gmXp's own function fed that tree's own keyed roll. */
  const roll = (tree, key) => K.keyedRng(H.hostXpRollKey(sport, tree, key))();
  for (let L = 1; L <= 5; L++) {
    const fs = fxAt(sport, 'scouting', L), fn = fxAt(sport, 'negotiation', L), fc = fxAt(sport, 'capCraft', L), fd = fxAt(sport, 'development', L);
    for (const { club, p } of men.slice(0, 300)) {
      const key = H.hostKey(club, season, p.id);
      C7.exact++;
      if (fs.scoutNoise(4, key) !== XP.scoutedNoise(4, L, roll('scouting', key)) || fs.scoutNoise(-3, key) !== XP.scoutedNoise(-3, L, roll('scouting', key))
        || fn.ask(p.salary, 0.5, key) !== XP.contractAsk(p.salary, L, roll('negotiation', key), 0.5)
        || fc.deadMoney(p.salary, key) !== XP.craftedDeadMoney(p.salary, L, roll('capCraft', key))
        || fd.growth(1, 6, key) !== XP.developedGrowth(1, 6, L, roll('development', key))
        || fn.ask(p.salary, 0.5, key) !== fn.ask(p.salary, 0.5, key)) { fail(`${sport} level ${L}: an effect is not gmXp fed its own keyed roll (${key})`); break; }
    }
    if (fxAt(sport, 'trading', L).premium(1.07) !== XP.tradePremium(1.07, L) || fxAt(sport, 'ownership', L).trustDelta(-28) !== XP.cushionTrustLoss(-28, L)
      || fxAt(sport, 'media', L).pressOdds(0.45) !== XP.pressOdds(0.45, L)) fail(`${sport} level ${L}: a plain effect is not gmXp's`);
  }
  if (J(lg) !== before) fail(`${sport}: reading the effects changed the league`);
}
/* (c) The consumers, one closed league at a time. The totals are summed over every closed league of the sport
   (three seasons a seed) before a step is judged, so no step leans on one roster. */
const add = (row, tree, arr) => { row[tree] = (row[tree] ?? LEVELS.map(() => 0)).map((v, i) => v + arr[i]); };
function consume(sport, lg, nth, row) {
  const d = DRIVE[sport], season = lg.season, before = J(lg);
  const men = Object.values(lg.teams).flatMap(t => t.players.map(p => ({ club: t.abbr, p })));
  /* Scouting: the read error left on a real class, a club at a time. */
  const cls = KLASS[sport](lg, mulberry32(77 + nth)), someClubs = Object.keys(lg.teams).sort().slice(0, 8);
  C7.prospects += cls.length;
  add(row, 'scouting', LEVELS.map(L => { const fx = fxAt(sport, 'scouting', L); let s = 0; for (const club of someClubs) for (const pr of cls) for (const n of [-4, -3, -2, 2, 3, 4]) s += Math.abs(fx.scoutNoise(n, H.hostKey(club, season, pr.id))); return s; }));
  /* Negotiation: the asks on every club's real re-sign desk. */
  const asks = LEVELS.map(() => 0);
  for (const club of Object.keys(lg.teams)) {
    try {
      const base = GC.deskCases(d.contracts, lg, GC.openLedger(lg, club));
      const minimum = d.contracts.minSalary ? d.contracts.minSalary(lg) : 0.5;
      for (const L of LEVELS) {
        const got = H.hostDeskCases(d.contracts, lg, GC.openLedger(lg, club), fxAt(sport, 'negotiation', L));
        if (got.length !== base.length) { fail(`${sport} ${club} level ${L}: ${got.length} cases, the desk holds ${base.length}`); break; }
        got.forEach((c, i) => {
          const b = base[i];
          if (!b.canNegotiate || L === 0) { if (J(c) !== J(b)) fail(`${sport} ${club} level ${L}: ${b.man.id} cannot be talked down and his case moved`); }
          /* gmXp keeps money in tenths, so the floor it can hold is the minimum's own tenth. */
          else if (c.ask.salary > b.ask.salary || c.ask.salary < Math.min(b.ask.salary, Math.floor(minimum * 10 + 1e-9) / 10) || J({ ...c, ask: { ...c.ask, salary: b.ask.salary } }) !== J(b)) fail(`${sport} ${club} level ${L}: ${b.man.id} asks ${c.ask.salary} from ${b.ask.salary}, or more than the ask moved`);
          if (b.canNegotiate) { asks[L] += c.ask.salary; if (c.ask.salary < Math.min(b.ask.salary, minimum) - 1e-9) C7.underMin++; }
        });
      }
      C7.cases += base.filter(b => b.canNegotiate).length;
    } catch (e) { fail(`${sport} ${club}: the re-sign desk threw (${String(e && e.message).slice(0, 100)})`); }
  }
  add(row, 'negotiation', asks);
  /* Cap craft: the quote on every man, then (in the first league) the charge after the engine's own release. */
  add(row, 'capCraft', LEVELS.map(L => { const fx = fxAt(sport, 'capCraft', L); let s = 0; for (const { club, p } of men) { const q = H.hostCutQuote(p, fx, club, season), b = FC.deadMoneyFor(p); s += q.now; if (q.now > b.now || q.next !== (b.next > 0 ? Math.round((q.now / 2) * 10) / 10 : 0) || (L === 0 && J(q) !== J(b))) fail(`${sport} level ${L}: the quote on ${p.id} is ${J(q)} from ${J(b)}`); } return s; }));
  for (const L of nth === 0 ? LEVELS : []) {
    const lgc = clone(lg), fx = fxAt(sport, 'capCraft', L);
    for (const club of Object.keys(lgc.teams).sort().slice(0, 6)) {
      const t = lgc.teams[club];
      for (const p of [...t.players].sort((a, b) => b.salary - a.salary || a.id.localeCompare(b.id)).slice(0, 2)) {
        const quote = H.hostCutQuote(p, fx, club, season);
        if (!d.release(t, lgc.freeAgents, p.id)) continue;
        const charged = H.hostCraftCut(t, p.id, fx, club, season);
        const entry = [...(t.deadCap ?? [])].reverse().find(e => e.playerId === p.id);
        if (charged !== quote.now || !entry || entry.amount !== quote.now) fail(`${sport} ${club} level ${L}: quoted ${quote.now}, charged ${charged}, stored ${entry ? entry.amount : 'nothing'}`);
        C7.cuts++;
      }
    }
  }
  /* Development: one year of growth for every man with room under his ceiling. */
  const young = men.filter(({ p }) => typeof p.pot === 'number' && p.pot - p.ovr >= 2);
  C7.young += young.length;
  add(row, 'development', LEVELS.map(L => { const fx = fxAt(sport, 'development', L); let s = 0; for (const { club, p } of young) { const g = fx.growth(1, p.pot - p.ovr, H.hostKey(club, season, p.id)); if (g < 1 || p.ovr + g > p.pot) fail(`${sport} level ${L}: ${p.id} grows ${g} past his ceiling`); s += g; } return s; }));
  /* Trading: a rival's margin, and the real pairs it lets through by the engine's own value. */
  for (const premium of nth === 0 ? [1.02, 1.07, 1.15] : []) {
    const at = LEVELS.map(L => fxAt(sport, 'trading', L).premium(premium));
    steps(`${sport} trading, the ${premium} margin`, at, -1);
    if (at.some(x => x < 1)) fail(`${sport} trading: a margin under value (${at.map(r2).join(' / ')})`);
  }
  const mine = lg.teams[d.team].players.map(p => d.value(p)), theirs = men.filter(m => m.club !== d.team).map(m => d.value(m.p)).filter(v => v > 0);
  C7.pairs += mine.length * theirs.length;
  add(row, 'trading', LEVELS.map(L => { const ask = fxAt(sport, 'trading', L).premium(1.07); let n = 0; for (const a of mine) for (const b of theirs) if (a >= b * ask) n++; return n; }));
  if (J(lg) !== before) fail(`${sport}: walking the trees changed the league`);
}
for (const sport of SPORTS) {
  const row = LADDER[sport];
  FLEET[sport].closed.forEach((snap, nth) => consume(sport, snap.lg, nth, row));
  steps(`${sport} scouting, read error left`, row.scouting, -1);
  steps(`${sport} negotiation, asks`, row.negotiation, -1);
  steps(`${sport} cap craft, dead money quoted`, row.capCraft, -1);
  steps(`${sport} development, growth`, row.development, 1);
  steps(`${sport} trading, pairs a rival accepts`, row.trading, 1);
}
/* Ownership: the trust every real season that fell short of the ask costs, through the verdict. */
for (const sport of SPORTS) {
  const d = DRIVE[sport], lost = LEVELS.map(() => 0);
  const desks = LEVELS.map(L => (L === 0 ? G.freshGmDesk() : deskWith({ ownership: L })));
  for (const snap of FLEET[sport].closed) for (const c of Object.keys(snap.lg.teams)) {
    const grade = FM.gradeSeason(snap.mandates[c], snap.outcomes[c]);
    let prev = null;
    for (const L of LEVELS) {
      const v = H.hostSeasonVerdict(d.host, snap.lg, { team: c, mandate: snap.mandates[c], trust: 60, fired: false, outcome: snap.outcomes[c], desk: desks[L], seasonsPlayed: snap.s, titles: 0 });
      const cost = 60 - v.trust;
      if (cost !== -XP.cushionTrustLoss(grade.trustDelta, L)) fail(`${sport} ${c} ${grade.result} level ${L}: the season costs ${cost} trust, the tree says ${-XP.cushionTrustLoss(grade.trustDelta, L)}`);
      if (grade.trustDelta < 0) { lost[L] += cost; if (prev !== null && !(cost < prev)) fail(`${sport} ${c} ${grade.result}: level ${L} costs ${cost}, level ${L - 1} cost ${prev}`); }
      else if (prev !== null && cost !== prev) fail(`${sport} ${c} ${grade.result}: a season that met the ask pays ${-cost} at level ${L} and ${-prev} below it`);
      prev = cost;
    }
    if (grade.trustDelta < 0) C7.lost++;
  }
  LADDER[sport].ownership = lost;
  steps(`${sport} ownership, trust lost`, lost, -1);
}
/* Media: every answer the four rooms hold, through the board's own call, on a half step grid of rolls. */
for (const sport of SPORTS) {
  const pack = DRIVE[sport].host.pack, landedAll = LEVELS.map(() => 0);
  const base = { justHired: false, teamLabel: 'the club', fired: false, wonTitle: false, gradeResult: 'met', tradeLine: null, seasonsPlayed: 2 };
  const rooms = [{ ...base, justHired: true }, { ...base, wonTitle: true, gradeResult: 'title' }, { ...base, gradeResult: 'missed' }, { ...base, tradeLine: 'a deal for a starter' }]
    .map(f => FP.buildGmPresser(pack.words, f));
  if (rooms.some(r => !r) || new Set(rooms.map(r => r && r.id)).size !== 4) { fail(`${sport}: the four press rooms could not be built`); continue; }
  for (const room of rooms) for (const opt of room.options) {
    const g = opt.effect.gamble, frozen = J(opt);
    let prev = null;
    for (const L of LEVELS) {
      const eased = H.hostPressOption(opt, fxAt(sport, 'media', L));
      if ((L === 0 || !g) && eased !== opt) fail(`${sport} ${room.id}: an answer that should come back as it is was copied (level ${L})`);
      let landed = 0, trust = null;
      for (let i = 0; i < 1000; i++) {
        const r = FP.applyGmPressChoice(50, eased, () => (i + 0.5) / 1000);
        if (r.tilt !== opt.effect.tilt) fail(`${sport} ${room.id}: the tilt moved at level ${L}`);
        if (g && r.trust === 50 + opt.effect.trust + g.gain) landed++;
        if (!g) { if (trust !== null && r.trust !== trust) fail(`${sport} ${room.id}: a safe answer pays two ways`); trust = r.trust; }
      }
      if (g) {
        if (prev !== null && landed - prev !== 30) fail(`${sport} ${room.id} (odds ${g.odds}): level ${L} lands ${landed} of 1000, level ${L - 1} landed ${prev}; a point is 30`);
        landedAll[L] += landed;
        prev = landed;
      } else if (prev !== null && trust !== prev) fail(`${sport} ${room.id}: a safe answer pays ${trust} at level ${L} and ${prev} below it`);
      else prev = trust;
    }
    if (g) C7.gambles++;
    if (J(opt) !== frozen) fail(`${sport} ${room.id}: easing an answer changed the room's own option`);
  }
  LADDER[sport].media = landedAll;
  steps(`${sport} media, gambles landed`, landedAll, 1);
}
ok(C7.men >= T.minMen && C7.young >= T.minYoung && C7.cases >= T.minCases && C7.pairs >= T.minPairs && C7.cuts >= T.minCuts && C7.lost >= T.minLosing && C7.gambles >= 24,
  `the tree walks shrank: ${J(C7)}`);
console.log(`   ${C7.men} men, ${C7.young} with room to grow, ${C7.cases} asks, ${C7.prospects} prospects, ${C7.pairs} trade pairs, ${C7.cuts} cuts charged as quoted, ${C7.lost} losing seasons, ${C7.gambles} gambles`);
if (C7.underMin) console.log(`   NOTE: ${C7.underMin} eased asks sit a tenth under the sport's minimum deal (gmXp rounds to tenths; reported, not this round's file)`);
for (const sport of SPORTS) for (const tree of XP.GM_TREES) console.log(`   ${sport} ${tree}: ${(LADDER[sport][tree] ?? []).map(r2).join(' / ')}`);

/* ================================================================== */
begin('8', 'spending: refused off the live list, with no point and past five, and 35 spends fill the board');
{
  const rich = G.withGmBlock(G.freshGmDesk(), 'xp', XP.addXp(XP.defaultGmXp(), 10_000_000));
  ok(H.hostSpendPoint(rich, 'scouting', []) === null && H.hostSpendPoint(rich, 'media', ['ownership']) === null, 'a point was sold in a tree that is not on the live list');
  ok(H.hostSpendPoint(rich, 'nonsense', LIVE) === null, 'a point was sold in a tree that does not exist');
  ok(H.hostSpendPoint(G.freshGmDesk(), 'scouting', LIVE) === null, 'a point was sold to a GM who has none');
  let desk = rich, spends = 0;
  for (const tree of XP.GM_TREES) for (let i = 0; i < XP.GM_MAX_TREE_POINTS; i++) {
    const next = H.hostSpendPoint(desk, tree, LIVE);
    if (!next) { fail(`spend ${spends + 1} (${tree}) was refused`); break; }
    if (!XP.isValidGmXp(next.blocks.xp) || XP.gmTreePoints(next.blocks.xp, tree) !== i + 1 || J(desk) === J(next)) fail(`after spend ${spends + 1} the block is not valid or the point is not there`);
    desk = next; spends++;
  }
  ok(spends === XP.GM_TREES.length * XP.GM_MAX_TREE_POINTS, `${spends} spends accepted, the board holds ${XP.GM_TREES.length * XP.GM_MAX_TREE_POINTS}`);
  for (const tree of XP.GM_TREES) ok(H.hostSpendPoint(desk, tree, LIVE) === null, `a sixth point was sold in ${tree}`);
  ok(J(rich.blocks.xp.points) === J(XP.defaultGmXp().points), 'spending changed the desk it was handed');
  console.log(`   ${spends} spends accepted, every refusal held`);
}

/* ================================================================== */
begin('9', 'taking a seat and a year out on real leagues: what moves, who owns a block, the refusals, and a year that is not a season');
const C9 = { seats: 0, years: 0, refusals: 0, lastCalls: 0 };
/* A sport's own rows, the way a bind will spread them after the host's: the staff is the club's and opened again, the books are the club's and dropped, the picks are the league's. */
const RULES = [...H.HOST_BLOCK_RULES, { key: 'staff', owner: 'club', fresh: (league, team) => ({ club: team }) }, { key: 'books', owner: 'club' }, { key: 'picks', owner: 'league' }];
const boom = () => { throw new Error('the league was touched'); };
const NEVER = { awayDraft: boom, awaySummer: boom, periods: boom, playRound: boom, playoffs: boom };
for (const sport of SPORTS) {
  const d = DRIVE[sport];
  for (const snap of FLEET[sport].closed.filter(x => x.s === 0)) {
    const lg = snap.lg, season = lg.season, tiers = tiersOf(d, lg), at = `${sport} seed ${snap.seed}`;
    /* A fired GM with a feed: the first of these records, at the first of these clubs, that somebody calls. */
    let found = null;
    for (const old of [d.team, ...Object.keys(lg.teams).sort().filter(id => id !== d.team)]) {
      for (const grades of [['met', 'overachieved', 'title', 'met'], ['title', 'title', 'met'], ['overachieved', 'met']]) {
        const seat = firedSeat(old, tiers.get(old), season, grades), m = H.hostMarket(d.host, lg, seat, nameOf);
        if (m && m.state === 'offers') { found = { old, grades, seat, m }; break; }
      }
      if (found) break;
    }
    if (!found) { fail(`${at}: no fired GM in the league draws an offer`); continue; }
    const { old, grades, seat, m } = found, xp = XP.addXp(XP.defaultGmXp(), 777);
    const desk = { v: 1, blocks: { seat, xp, staff: { club: old }, books: { club: old }, picks: { ledger: 1 }, later: { keep: true } } };
    const save = { league: lg, myTeam: old, trust: 0, fired: true, mandate: snap.mandates[old], pressTilt: 1, seasonTradeLine: 'a deal', seasonsPlayed: grades.length, titles: grades.filter(g => g === 'title').length, phase: 'fired' };
    const legacy = H.hostLegacy(d.host, lg, { team: old, seasonsPlayed: save.seasonsPlayed, titles: save.titles, fired: true, seasonCounted: true });
    const before = J([save, desk]), offer = m.offers[0];
    const out = H.hostTakeSeat({ host: d.host, league: lg, desk, save, legacy, teamId: offer.teamId, nameOf, blocks: RULES });
    if (!out) { fail(`${at}: the offer on the table was refused`); continue; }
    C9.seats++;
    ok(J([save, desk]) === before, `${at}: taking the seat changed the save, the league or the desk it was handed`);
    ok(out.save.league === lg && out.save.myTeam === offer.teamId && out.save.trust === FM.FO_TRUST_START && out.save.fired === false && out.save.pressTilt === 0 && out.save.seasonTradeLine === null
      && out.save.seasonsPlayed === save.seasonsPlayed && out.save.titles === save.titles, `${at}: the save after the move is not his club, fresh trust, no press state and the rest untouched`);
    ok(J(out.save.mandate) === J(offer.ask) && offer.ask.season === season + 1 && H.hostSummerMandate(out.save.mandate, { ...offer.ask, text: 'built' }, season + 1) === out.save.mandate, `${at}: the ask he took is not the ask he will be graded on`);
    ok(J(out.desk.blocks.staff) === J({ club: offer.teamId }), `${at}: the old club's staff rode along (${J(out.desk.blocks.staff)})`);
    ok(!('books' in out.desk.blocks), `${at}: a club block with no fresh value was not dropped`);
    ok(J(out.desk.blocks.picks) === J(desk.blocks.picks) && J(out.desk.blocks.later) === J(desk.blocks.later) && J(out.desk.blocks.xp) === J(xp), `${at}: a league block, an unknown block or his XP moved`);
    const ns = out.desk.blocks.seat, st = SEAT.currentStint(ns.career);
    ok(H.isGmSeatBlock(ns) && ns.career.stints.length === 2 && st.team === offer.teamId && st.from === season + 1 && st.tier === offer.tier && !st.ended && ns.career.seasonsOut === 0, `${at}: the new stint is not his new club from next season`);
    ok(H.hostArriving(ns, season) && H.hostMarket(d.host, lg, ns, nameOf) === null && H.hostSeasonsRecorded(ns) === H.hostSeasonsRecorded(seat), `${at}: he should be arriving, off the market, with the seasons he had`);
    const stranger = Object.keys(lg.teams).find(id => id !== old && !m.offers.some(o => o.teamId === id));
    const refuse = teamId => H.hostTakeSeat({ host: d.host, league: lg, desk, save, legacy, teamId, nameOf, blocks: RULES });
    ok(refuse(old) === null && refuse(stranger) === null && refuse('no such club') === null, `${at}: a seat nobody offered was taken`);
    const newLegacy = H.hostLegacy(d.host, lg, { team: offer.teamId, seasonsPlayed: save.seasonsPlayed, titles: save.titles, fired: false, seasonCounted: true });
    ok(H.hostTakeSeat({ host: d.host, league: lg, desk: out.desk, save: out.save, legacy: newLegacy, teamId: offer.teamId, nameOf, blocks: RULES }) === null, `${at}: a man who holds a seat took another`);
    word(H.hostTakeArmLine(d.host.pack, offer, false), `${at} arm`); word(H.hostCareerTile(ns, nameOf).value, `${at} career tile`);

    /* The year out. Refused three ways, each before the league is touched. */
    const copy = clone(lg), frozen = J(copy), rng = mulberry32(900 + snap.seed);
    const away = input => H.hostSeasonAway({ host: d.host, away: NEVER, league: copy, rng, ...input });
    const shut = closedCareers.find(k => k.sport === sport && k.lg === lg);
    const midLg = FLEET[sport].mid.find(x => x.seed === snap.seed).lg;
    try {
      const inSeat = away({ desk: out.desk, legacy: newLegacy });
      const open = H.hostSeasonAway({ host: d.host, away: NEVER, league: midLg, rng, desk, legacy: H.hostLegacy(d.host, midLg, { team: old, seasonsPlayed: save.seasonsPlayed, titles: save.titles, fired: true, seasonCounted: true }) });
      ok(inSeat.ok === false && inSeat.reason === 'in-seat', `${at}: a year out while he holds a seat (${J(inSeat).slice(0, 60)})`);
      ok(open.ok === false && open.reason === 'season-open', `${at}: a year out from a season still being played (${J(open).slice(0, 60)})`);
      if (shut) {
        const sd = { v: 1, blocks: { seat: shut.seat } }, t = SEAT.careerTotals(shut.seat.career);
        const no = away({ desk: sd, legacy: H.hostLegacy(d.host, copy, { team: shut.old, seasonsPlayed: t.seasons, titles: t.titles, fired: true, seasonCounted: true }) });
        ok(no.ok === false && no.reason === 'market-closed', `${at}: a year out on a market that reads closed (${J(no).slice(0, 60)})`);
        C9.refusals++;
      }
      C9.refusals += 2;
      /* Offers on the table that are the last calls. The top tier club's wreck is over the floor today and under it
         next year whatever happens, and somebody calls on about one key in three. Read off as many keys as it takes
         (the key holds the season he took the club), then the year out must be refused before the league is touched. */
      const topOld = Object.keys(lg.teams).sort().find(id => tiers.get(id) === 1);
      let lastCall = null;
      for (let j = 0; j < 80 && !lastCall; j++) {
        const base = firedSeat(topOld, 1, season, ['badly', 'badly', 'badly']);
        const s = { ...base, career: { ...base.career, stints: [{ ...base.career.stints[0], from: base.career.stints[0].from - j }] } };
        const mk = H.hostMarket(d.host, copy, s, nameOf);
        if (mk && mk.state === 'offers' && mk.nextYear === 'shut') lastCall = { seat: s, m: mk };
      }
      if (!lastCall) fail(`${at}: no key in 80 brings the top tier club's wreck a call, so the last call refusal was never tried`);
      else {
        (SAMPLE[sport] ??= {}).last ??= { seat: lastCall.seat, m: lastCall.m, lg };
        const t = SEAT.careerTotals(lastCall.seat.career);
        const no = away({ desk: { v: 1, blocks: { seat: lastCall.seat } }, legacy: H.hostLegacy(d.host, copy, { team: topOld, seasonsPlayed: t.seasons, titles: t.titles, fired: true, seasonCounted: true }) });
        ok(no.ok === false && no.reason === 'last-call', `${at}: a year out was played with ${lastCall.m.offers.length} offer(s) on the table and next year shut (${J(no).slice(0, 60)})`);
        ok(H.hostCanSitOut(lastCall.m) === false && H.hostTakeSeat({ host: d.host, league: copy, desk: { v: 1, blocks: { seat: lastCall.seat } }, save: { ...save, myTeam: topOld }, legacy: H.hostLegacy(d.host, copy, { team: topOld, seasonsPlayed: t.seasons, titles: t.titles, fired: true, seasonCounted: true }), teamId: lastCall.m.offers[0].teamId, nameOf, blocks: RULES }) !== null,
          `${at}: on the last call the year out is offered, or the offer itself cannot be taken`);
        C9.lastCalls++;
      }
    } catch (e) { fail(`${at}: a refused year out touched the league (${String(e && e.message).slice(0, 80)})`); }
    ok(J(copy) === frozen, `${at}: a refused year out changed the league`);

    /* Accepted: the engine's own season in the host's order (the old club still named as the engine's user club, see the header). */
    const calls = [];
    const real = {
      awayDraft: (l, r) => { calls.push('draft'); d.draft(l, old, r); },
      awaySummer: (l, r) => { calls.push('summer'); d.summer(l, old, r); },
      periods: () => d.periods,
      playRound: (l, r) => { calls.push('round'); d.period(l, old, r); if (d.at(l) < d.periods) d.step(l); },
      playoffs: (l, r) => { calls.push('playoffs'); return d.close(l, old, r).champion; },
    };
    let res;
    try { res = H.hostSeasonAway({ host: d.host, away: real, league: copy, desk, legacy, rng }); } catch (e) { fail(`${at}: the year out threw (${String(e && e.message).slice(0, 100)})`); continue; }
    if (res.ok !== true) { fail(`${at}: the year out was refused (${res.reason})`); continue; }
    C9.years++;
    ok(J(calls) === J(['draft', 'summer', ...Array(d.periods).fill('round'), 'playoffs']), `${at}: the year was not played draft, summer, ${d.periods} periods, postseason (${calls.length} calls, first ${calls.slice(0, 3)})`);
    ok(d.host.season(copy) === season + 1 && res.report.season === season + 1 && d.host.champion(copy, season + 1) === res.report.champion, `${at}: the league is not one decided season on`);
    const gamesOf = l => d.host.clubs(l).reduce((s, c) => s + c.games, 0);
    ok(gamesOf(copy) === gamesOf(lg) && d.host.clubs(copy).every(c => c.games > 0), `${at}: the league played ${gamesOf(copy)} club games while he was away, a whole season is ${gamesOf(lg)}`);
    const ys = res.desk.blocks.seat;
    ok(H.isGmSeatBlock(ys) && ys.career.seasonsOut === seat.career.seasonsOut + 1, `${at}: the year out is not on the record`);
    ok(H.hostSeasonsRecorded(ys) === H.hostSeasonsRecorded(seat) && SEAT.currentStint(ys.career).ended === 'fired', `${at}: a year out counted as a season he ran a club`);
    ok(J(res.desk.blocks.xp) === J(xp) && J(res.desk.blocks.later) === J(desk.blocks.later), `${at}: the year out moved his XP or a block it does not know`);
    ok(H.hostFeedKey(sport, ys, season + 1) !== H.hostFeedKey(sport, seat, season), `${at}: next summer reads the feed he already saw`);
    ok(res.report.oldClub && res.report.oldClub.id === old && J(desk.blocks.seat) === J(seat), `${at}: the report has no old club, or the desk handed in was changed`);
    const m2 = H.hostMarket(d.host, copy, ys, nameOf), card = m2 && H.hostOutOfWorkCard(d.host, copy, ys, m2, nameOf);
    ok(m2 && m2.seasonsOut === 1 && m2.season === season + 2 && card && card.lines.length === 3, `${at}: the market after the year out is not next summer's`);
    if (card) { word(card.title, `${at} card`); card.lines.forEach(l => word(l, `${at} card`)); }
  }
}
ok(C9.seats >= SPORTS.length && C9.years >= SPORTS.length && C9.refusals >= SPORTS.length * 2 && C9.lastCalls >= SPORTS.length, `only ${C9.seats} seats taken, ${C9.years} years out played, ${C9.refusals} refusals and ${C9.lastCalls} last calls`);
console.log(`   ${C9.seats} seats taken, ${C9.refusals} years out refused with the league untouched (and ${C9.lastCalls} more on a last call, offers on the table), ${C9.years} played by the engines in the host's order`);

/* ================================================================== */
begin('10', 'the words: never empty, no dash, no quote, no placeholder; a closed line never says sit; no line states fewer seasons than he played');
const NOT_ALLOWED = [[String.fromCharCode(0x2013), 'an en dash'], [String.fromCharCode(0x2014), 'an em dash'], ['"', 'a quote mark'],
  [String.fromCharCode(0x201c), 'a quote mark'], [String.fromCharCode(0x201d), 'a quote mark']];
const FIRST_PERSON = /\b(I|me|my|mine|we|our|us)\b/;
const RAW = /[{}]|undefined|NaN|\bnull\b|\[object/;
const SIT = /\bsit\b/i;
let wordsRead = 0;
const judge = (s, where) => {
  wordsRead++;
  if (typeof s !== 'string' || !s.trim()) { fail(`an empty string on ${where}`); return; }
  for (const [ch, what] of NOT_ALLOWED) if (s.includes(ch)) fail(`${what} on ${where}: ${s.slice(0, 80)}`);
  if (FIRST_PERSON.test(s)) fail(`first person on ${where}: ${s.slice(0, 80)}`);
  if (RAW.test(s)) fail(`an unfilled value on ${where}: ${s.slice(0, 80)}`);
};
for (const [s, where] of WORDS) judge(s, where);
const ARMS = {};
for (const k of LINES) {
  judge(k.line, `${k.at} line`); judge(k.value, `${k.at} box`); judge(k.sub, `${k.at} box`);
  if (k.state === 'closed' && SIT.test(`${k.line} ${k.value} ${k.sub}`)) fail(`${k.at}: a closed market tells him to sit (${k.line.slice(-70)})`);
  const told = /after (\d+) seasons?/.exec(k.line);
  if (k.out === 0 && (!told || Number(told[1]) !== k.seasons)) fail(`${k.at}: the line states ${told ? told[1] : 'no'} seasons, he ran the club for ${k.seasons}`);
  /* Somebody called: the line says what passing costs whenever next year is not open, and nothing more when it is.
     Judged against the line the same market prints with next year open, so no wording is pinned here. */
  if (k.state === 'offers') {
    const plain = H.hostMarketLine(k.pack, k.seat, 'offers', { nextYear: 'open', climbTo: null }, k.m.offers.length, k.oldName);
    if (k.m.nextYear === 'open' ? k.line !== plain : !(k.line.startsWith(plain) && k.line.length > plain.length + 20)) fail(`${k.at}: ${k.m.offers.length} called and next year is ${k.m.nextYear}, and the line reads: ${k.line.slice(-90)}`);
    if (k.m.nextYear === 'shut' && SIT.test(k.line)) fail(`${k.at}: the last calls, and the line tells him to sit`);
  }
  /* The stay out line: what he turns down, and a sentence for next year that an open year and a climb do not share. */
  if (H.hostCanSitOut(k.m)) {
    const arm = H.hostSitArmLine(k.m, true), turned = /turn down (\d+) offers?/.exec(arm);
    judge(arm, `${k.at} stay out line`);
    if (k.m.offers.length ? !turned || Number(turned[1]) !== k.m.offers.length : !!turned) fail(`${k.at}: ${k.m.offers.length} on the table, and the stay out line says: ${arm.slice(0, 90)}`);
    (ARMS[k.m.nextYear] ??= new Set()).add(arm.replace(/ You turn down \d+ offers? to do it\./, ''));
  }
}
ok(ARMS.open && ARMS.climb && ![...ARMS.open].some(a => ARMS.climb.has(a)), 'the stay out line reads the same whether next year is open or hangs on a climb');
/* A record older than the block: the line counts the seasons known only as a count. */
let legacyLines = 0;
for (const sport of SPORTS) for (let sp = 1; sp <= 15; sp++) for (let ti = 0; ti <= Math.min(2, sp); ti++) for (const state of ['offers', 'quiet', 'closed']) {
  const pack = DRIVE[sport].host.pack;
  const b = H.hostLegacySeat({ team: 'AAA', tier: 3, season: 2030, seasonCounted: true, seasonsPlayed: sp, titles: ti, fired: true, lastGrade: null });
  const line = H.hostMarketLine(pack, b, state, { nextYear: state === 'closed' ? 'shut' : 'open', climbTo: null }, state === 'offers' ? 2 : 0, nameOf('AAA'));
  const told = /after (\d+) seasons?/.exec(line);
  legacyLines++;
  judge(line, `${sport} legacy line`);
  if (!told || Number(told[1]) !== sp) fail(`${sport} legacy ${sp} seasons ${ti} titles (${state}): the line states ${told ? told[1] : 'no'} seasons`);
  if (state === 'closed' && SIT.test(line)) fail(`${sport} legacy: a closed line tells him to sit`);
}
/* The rules behind each "?", the earn sentence, and the boxes in the states no walk above reaches. */
for (const sport of SPORTS) {
  const pack = DRIVE[sport].host.pack, earns = H.hostEarnsLine(['wins', 'titles', 'playoffs', 'mandate']);
  for (const s of [...H.hostMarketHelp(pack), ...H.hostCareerHelp(pack), ...H.hostXpHelp(earns), earns, H.hostEarnsLine([]), H.hostEarnsLine(['wins']),
    H.hostEarnsLine(['wins', 'titles', 'playoffs', 'mandate', 'overperformance', 'prospects']),
    ...['open', 'climb', 'shut'].flatMap(nextYear => [0, 1, 3].flatMap(n => [true, false].map(on => H.hostSitArmLine({ nextYear, offers: Array(n).fill(null) }, on))))]) judge(s, `${sport} help`);
  for (const [desk, live, on] of [[null, LIVE, false], [deskWith({}), LIVE, true], [deskWith({}), [], true], [G.freshGmDesk(), LIVE, true], [deskWith(Object.fromEntries(LIVE.map(t => [t, 5]))), LIVE, true]]) {
    const t = H.hostXpTile(desk, live, on);
    judge(t.value, `${sport} GM level box`); judge(t.sub, `${sport} GM level box`);
  }
}
for (const e of ['fired', 'walked', 'poached', 'expired', undefined]) judge(H.hostStintEndWords({ team: 'AAA', tier: 1, from: 2030, grades: [], ended: e }), 'a stint ending');
for (const g of GRADES) { judge(H.HOST_GRADE_MARKS[g].word, 'a grade word'); judge(H.HOST_GRADE_MARKS[g].mark, 'a grade mark'); }
for (const t of [1, 2, 3, 4]) judge(H.HOST_TIER_WORDS[t], 'a tier word');
/* The three panels, drawn for every market state a sport's ladder reached, and the list they hang on. */
const strip = html => html.replace(/<[^>]*>/g, ' ').replaceAll('&#x27;', "'").replaceAll('&amp;', '&').replaceAll('&quot;', '"');
let panelsDrawn = 0;
const PANELS = M.GM_CAREER_PANELS;
ok(PANELS === M.GM_CAREER_PANELS && J(PANELS.map(p => p.key)) === J(['seat', 'career', 'xp']) && PANELS.every(p => typeof p.Panel === 'function' && typeof p.tile === 'function'), 'the career list is not three panels under seat, career and xp');
for (const sport of SPORTS) {
  const pack = DRIVE[sport].host.pack, gm = M.GM_SPORTS[sport];
  const facts = (seat, market, phase, deskOn) => ({ teamId: 'AAA', teamLabel: 'AAA club', seasonsPlayed: 3, phase, hub: {},
    career: { pack, seat, market, nameOf, live: LIVE, deskOn, earns: H.hostEarnsLine(['wins', 'titles', 'playoffs', 'mandate']), take() {}, sitOut() {}, spend() {} } });
  const draw = (Panel, desk, f, where) => {
    try {
      const text = strip(M.render(Panel, { sport: gm, desk, facts: f, onDesk() {}, onBack() {} })).trim();
      panelsDrawn++;
      judge(text, where);
      return text;
    } catch (e) { fail(`${where} threw (${String(e && e.message).slice(0, 100)})`); return ''; }
  };
  for (const [kind, k] of Object.entries(SAMPLE[sport] ?? {})) {
    const text = draw(M.MarketPanel, G.freshGmDesk(), facts(k.seat, k.m, 'fired', true), `${sport} job market panel (${kind})`);
    if (!text.includes(k.m.line)) fail(`${sport} job market panel (${kind}): the market's line is not on the screen`);
    if (kind === 'closed' && SIT.test(text)) fail(`${sport} job market panel: a closed market offers a year out`);
    /* The stay out button is on the screen exactly while next year can hold a call. */
    if (/stay out/i.test(text) !== (k.m.nextYear !== 'shut')) fail(`${sport} job market panel (${kind}): next year is ${k.m.nextYear} and the year out is ${/stay out/i.test(text) ? 'on' : 'not on'} the screen`);
    if (kind === 'last') {
      const plain = H.hostMarketLine(pack, k.seat, 'offers', { nextYear: 'open', climbTo: null }, k.m.offers.length, nameOf(SEAT.currentStint(k.seat.career).team));
      judge(k.m.line, `${sport} last call line`);
      if (!(k.m.line.startsWith(plain) && k.m.line.length > plain.length + 20) || SIT.test(k.m.line)) fail(`${sport}: the last calls, and the line does not say what passing costs (${k.m.line.slice(-90)})`);
    }
    draw(M.CareerPanel, G.freshGmDesk(), facts(k.seat, k.m, 'fired', true), `${sport} career panel (${kind})`);
    const tiles = PANELS.map(p => p.tile({ sport: gm, desk: G.freshGmDesk(), facts: facts(k.seat, k.m, 'fired', true) }));
    if (tiles.some(t => !t)) fail(`${sport} (${kind}): a career box is missing between seats`);
    for (const t of tiles) if (t) { judge(t.value, `${sport} box (${kind})`); judge(t.sub, `${sport} box (${kind})`); }
  }
  const held = H.hostLegacySeat({ team: 'AAA', tier: 2, season: 2030, seasonCounted: true, seasonsPlayed: 4, titles: 1, fired: false, lastGrade: 'met' });
  draw(M.MarketPanel, G.freshGmDesk(), facts(held, null, 'hub', true), `${sport} job market panel (in a seat)`);
  draw(M.CareerPanel, G.freshGmDesk(), facts(held, null, 'hub', true), `${sport} career panel (old save)`);
  for (const [desk, on] of [[deskWith({}), true], [G.freshGmDesk(), false], [deskWith({ ownership: 2, media: 5 }), true]]) draw(M.XpPanel, desk, facts(held, null, 'hub', on), `${sport} GM level panel`);
  if (PANELS[0].tile({ sport: gm, desk: G.freshGmDesk(), facts: facts(held, null, 'hub', true) }) !== null) fail(`${sport}: the Job market box shows while he holds a seat`);
  const lazy = M.render(PANELS[1].Panel, { sport: gm, desk: G.freshGmDesk(), facts: facts(held, null, 'hub', true), onDesk() {}, onBack() {} });
  if (!lazy.includes('data-gm-panel-loading')) fail(`${sport}: a panel that loads on demand drew no holding box under a server render`);
}
ok(SPORTS.every(s => ['offers', 'quiet', 'closed', 'last'].every(k => SAMPLE[s] && SAMPLE[s][k])), 'a sport reached no career in one of the three market states or on a last call, so its panel was not drawn');
console.log(`   ${wordsRead} strings read (${LINES.length} market lines, ${legacyLines} lines of an older record), ${panelsDrawn} panels drawn`);

/* ================================================================== */
const red = [...failedIn.entries()].filter(([, n]) => n > 0);
const redList = red.map(([k, n]) => `${k}:${n}`).join(' ');
if (CONTROL) {
  const want = EDITS[CONTROL][0], hits = failedIn.get(want) ?? 0;
  console.log(hits > 0 ? `simGmDeskHost CONTROL ${CONTROL} FIRED: check ${want} went red with ${hits} failures (red checks ${redList})`
    : `simGmDeskHost CONTROL ${CONTROL} DID NOT FIRE: check ${want} stayed green (red checks ${redList || 'none'})`);
  process.exit(hits > 0 ? 1 : 3);
}
console.log(red.length ? `simGmDeskHost: FAILED, red checks ${redList}` : `simGmDeskHost: all 10 checks passed on seeds ${SEEDS.join(',')} (${SPORTS.length} engines, ${SEASONS} seasons a seed)`);
process.exit(red.length ? 1 : 0);
