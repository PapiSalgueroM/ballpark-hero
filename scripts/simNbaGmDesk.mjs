/* Round 1018: the NBA Front Office on the GM desk (src/lib/nbaGmDesk.ts).
 *
 * The second bind of the shared GM modules to a real engine, shaped on
 * scripts/simNhlGmDesk.mjs. This harness drives the NBA engine and the desk
 * in the board's own call order (NbaFrontOfficeBoard.tsx: the re-sign desk
 * before draft night, the summer straight after the last pick), with seeded
 * draws. It replays the board's calls in its own copy; the board itself is
 * played by src/components/nba-front-office/NbaGmDeskBoard.test.tsx. Checks:
 *   1  a save from before the desk plays to the identical league, season
 *      after season, as the engine did before this round (a fixture recorded
 *      from the pre-round engine), and opening the desk changes nothing in
 *      the league it opens on
 *   2  over ten seeded seasons, every user man whose deal runs out has a
 *      recorded decision, and what happened to him is what it says: a kept
 *      man is still here (or retired), a man let go is gone, a man whose
 *      sheet was let go is at the club that tabled it on its terms. A first
 *      round pick drafted with the desk on comes up after exactly the rookie
 *      scale's four seasons, a second rounder after the engine's three, and
 *      every one of them comes up restricted, with any sheet inside the
 *      league's limits (no picks, his maximum, four seasons)
 *   3  no trade lands after the deadline, and deals do land before it; the
 *      window shuts once round 13 is played (what the guide says), the older
 *      trade paths' refusal (nbaDeadlineRefusal) agrees with it every round,
 *      and each of the board's four old trade handlers asks it first; the two
 *      that can send a pick ask the pick rules (pickRuleBlock) first too
 *   4  picks are conserved league wide: every club's pick in every round of
 *      every year carried exists exactly once, after every deal and summer,
 *      and every engine list is the ledger's. Once a season the trade
 *      finder's sweetened deal is played the way acceptShopOffer and
 *      deskAfterTrade play it, and the ledger must follow the engine's own
 *      pick move (a mirror that misses is undone by the sync and would pass
 *      the census); a sweetener that would leave the club without a first in
 *      two drafts running is refused exactly as the Trade desk refuses it
 *   5  the staff's effects change their consumer at every level step: the
 *      win probability, the scouting miss, the rounds an injury costs, the
 *      summer growth of a young man, for the whole staff and for each post
 *      on its own, each edge post reaching the strength by exactly half a
 *      point an end, and the growth reaching the engine's own summer. And
 *      through the engine that consumes them, at every step: the user's
 *      wins over ten seasons of simRound, the rounds out simRound announces
 *      for his injured men, his wins in runNbaPlayoffs
 *   6  migration keeps every marker, a corrupt block resets alone, the
 *      package salary rule is the engine's nbaSalaryFits for one man each
 *      way, and over the first apron a package must send out what it takes
 *   7  every desk panel draws (server rendered), and the re-sign desk draws a
 *      tile for every expiring man; the deal box says shut only with the desk on
 * Negative controls (SIM_NBA_GM_DESK_CONTROL), each must go red in its check:
 *   coinflip    the summer runs the engine's own offseason, coin flip and all  (2)
 *   shortscale  a first round draftee signs the engine's figure, a season short (2)
 *   norfa       nobody is ever restricted                                    (2)
 *   latetrade   the package clock never moves, so deals pass the deadline     (3)
 *   noguard     the trade finder's accept skips the deadline                  (3)
 *   droppick    a pick sent in a package is dropped from the ledger           (4)
 *   flatstaff   the staff edge is always nothing                              (5)
 *   flatgrowth  the development coach's level changes nothing                 (5)
 *   nodefault   the engine's win probability reads an edge by default        (1)
 *   pilefit     the package salary rule forgets the apron                     (6)
 *   noedgeround simRound stops reading the staff's edge                       (5)
 *   noedgepo    the playoffs stop reading the staff's edge                    (5)
 *   noinjhook   simRound stops asking the trainer                             (5)
 *   nomirror    an old path's pick move never reaches the ledger              (4)
 *   nostepien   an old path's pick skips the two drafts running rule          (4)
 *   noruleblock the trade finder's accept skips the pick rules                (3)
 * Recording the fixture: SIM_NBA_GM_DESK_RECORD=<git ref of the engine before
 * this round> rewrites scripts/data/nbaGmDeskFixture.json from that engine.
 *
 * MEASURED 2026-10-05 on three seed sets of ten (1..10, 11..20, 21..30), ten
 * seasons a seed, totals per set:
 *   expiring men decided   427 / 415 / 411   (by the GM 240 / 234 / 228, by the staff's rule 187 / 181 / 183)
 *   draftees come up       first rounders 60 / 60 / 60 after exactly four seasons,
 *                          second rounders 72 / 63 / 63 after exactly three
 *   restricted cases       132 / 123 / 123, sheets 66 / 59 / 70 (matched 44 / 41 / 48,
 *                          let go and found at the rival on its terms 22 / 18 / 22)
 *   deals before deadline  233 / 233 / 252   tries after it 700 each, landed 0; refusal agreed 2000 rounds each
 *   deals moving a pick    232 / 232 / 250
 *   staff ladder (fixed)   edge 0 to 3.00 strength, win .548 to .683, scouting miss 2.25 to 0.56,
 *                          a three round injury 3.00 to 2.25 rounds, a young man's summer step 2.000 to
 *                          2.199; alone, the head coach and the lead assistant each take the win .548 to
 *                          .618; in the engine's own summer, 98 rating points of growth at level 1 and 108
 *                          at level 10 over five leagues of 21 year olds
 * Remeasured 2026-10-06 by the review fix, with the walk in the board's order
 * (the re-sign calls before draft night): every number above came back the
 * same on seeds 1..10. Added then:
 *   old trade paths        sweetened trade finder deals mirrored 60 / 60 on seeds 1..10 and 11..20, refused 0
 *                          (three seasons a seed, two tries a season; every try found an offer)
 *   through the engine     (fixed seeds) your wins over ten seasons of simRound 504, 512, 519,
 *                          526, 535, 547, 558, 572, 582, 596 at levels 1 to 10 (504 with no desk);
 *                          your playoff wins over 2000 runs 17561 rising to 26384, the smallest
 *                          step 830; the trainer over 1144 injuries in 4000 rounds announced 2286
 *                          rounds out at level 1 and 1839 at level 10, the smallest step 37 (the
 *                          rolls hash the man's id, which carries a per process epoch, so these
 *                          move run to run; 1000 rounds once gave a first step of 5, hence 4000)
 * Every floor in T sits near 70 percent of the lowest set. Every control was
 * run on seeds 1..10 on 2026-10-05 and fired in its own check, failures
 * counted: coinflip 73 in 2, shortscale 70 in 2, norfa 128 in 2, latetrade
 * 700 in 3, noguard 1 in 3, droppick 123 in 4, flatstaff 46 in 5, flatgrowth
 * 19 in 5, nodefault 8 in 1 and 5 (check 5 compares a level 1 staff against
 * the engine with no desk, so a default edge shows there too), pilefit 3 in 6.
 * Each red only in its own check otherwise. The review fix's controls, run on
 * seeds 1..10 on 2026-10-06, each red only in its own check: noedgeround 9 in
 * 5, noedgepo 9 in 5, noinjhook 9 in 5, nomirror 60 in 4, nostepien 2 in 4,
 * noruleblock 1 in 3; noguard (its anchor now carries pickRuleBlock) still 1
 * in 3, and coinflip still 73 in 2 with the walk in the board's order.
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const lf = s => s.replaceAll('\r\n', '\n');
const J = v => JSON.stringify(v);
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'nbaGmDeskFixture.json');

const CONTROL = process.env.SIM_NBA_GM_DESK_CONTROL || '';
const RECORD = process.env.SIM_NBA_GM_DESK_RECORD || '';
const CONTROLS = {
  coinflip: '2', shortscale: '2', norfa: '2', latetrade: '3', noguard: '3', droppick: '4',
  flatstaff: '5', flatgrowth: '5', nodefault: '1', pilefit: '6',
  noedgeround: '5', noedgepo: '5', noinjhook: '5', nomirror: '4', nostepien: '4', noruleblock: '3',
  sheetrepick: '2', dayonestature: '5',
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_NBA_GM_DESK_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const SEEDS = (process.env.SIM_NBA_GM_DESK_SEEDS || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const SEASONS = Number(process.env.SIM_NBA_GM_DESK_SEASONS || 10);

/* Floors: the measured size of each walk, see MEASURED in the header. */
const T = {
  minDecisions: 288, minGm: 160, minAuto: 126, minEarlyDeals: 163, minLateTries: 490, minPickMoves: 162,
  minScaleUp: 42, minSecondUp: 44, minRestricted: 86, minSheets: 41, minSheetGone: 12,
  minOldDeals: 42, minSheetFull: 1,
};

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
const NM = modulesDir();

let check = '';
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(check) ?? 0) + 1;
  failedIn.set(check, n);
  if (n <= 8) console.error(`  FAIL [${check}]: ${m}`);
  else if (n === 9) console.error(`  FAIL [${check}]: (further failures in this check not printed)`);
};
const begin = (id, title) => { check = id; console.log(`${id}) ${title}`); };

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  desk: path.join(ROOT, 'src', 'lib', 'nbaGmDesk.ts'),
  engine: path.join(ROOT, 'src', 'lib', 'nbaFrontOffice.ts'),
  contracts: path.join(ROOT, 'src', 'lib', 'gmContracts.ts'),
  board: path.join(ROOT, 'src', 'components', 'nba-front-office', 'NbaFrontOfficeBoard.tsx'),
};
const EDITS = {
  /* The summer goes back to the engine's own coin flip for the user's men. */
  coinflip: ['desk', '  const run = runDeskOffseason(host, league, ledger, rng);',
    '  const run = { ok: true as const, engine: host.runOffseason(league, rng, team), applied: [] as GmDecision[], picksAdded: [] as number[] };'],
  /* A first round draftee signs the engine's figure, so the summer after draft night eats a season of his rookie scale. */
  shortscale: ['desk', '  if (round === NBA_ROOKIE_SCALE_ROUND) p.years = NBA_ROOKIE_SCALE_YEARS + 1;',
    '  if (round === NBA_ROOKIE_SCALE_ROUND) p.years = NBA_ROOKIE_SCALE_YEARS;'],
  /* Restricted free agency never applies. */
  norfa: ['contracts', '  return rec.round === NBA_ROOKIE_SCALE_ROUND || service <= NBA_RFA_MAX_SERVICE;', '  return false;'],
  latetrade: ['desk', 'periodsPlayed: nbaPeriodsPlayed(league), seasonClosed: false },', 'periodsPlayed: 0, seasonClosed: false },'],
  /* The trade finder's accept skips the deadline. */
  noguard: ['board', '    if (!league || !myTradePiece || deadlineBlock() || pickRuleBlock(league, o.teamId, o.sweeten)) return;\n    const lg: NbaLeague = JSON.parse(JSON.stringify(league));\n    const pickRound = lastPickRound(lg, o.sweeten);',
    '    if (!league || !myTradePiece || pickRuleBlock(league, o.teamId, o.sweeten)) return;\n    const lg: NbaLeague = JSON.parse(JSON.stringify(league));\n    const pickRound = lastPickRound(lg, o.sweeten);'],
  droppick: ['desk', '  const next = withGmBlock(desk, NBA_DESK_KEYS.picks, out.ledger);',
    "  const next = withGmBlock(desk, NBA_DESK_KEYS.picks, { v: 1, picks: out.ledger.picks.filter(p => !pkg.give.some(a => a.kind === 'pick' && a.key === pickKey(p))) });"],
  flatstaff: ['desk', "  return (e('offEdge') + e('defEdge')) * NBA_END_WEIGHT;", "  return 0 * (e('offEdge') + e('defEdge')) * NBA_END_WEIGHT;"],
  /* The development coach's level reaches nothing: a staff level that changes nothing. */
  flatgrowth: ['desk', "  const mult = gmStaffEffect(NBA_STAFF_PACK, block, 'growth');", '  const mult = 1;'],
  nodefault: ['engine', 'export function nbaWinProb(a: NbaGmTeam, b: NbaGmTeam, edgeA = 0, edgeB = 0): number {',
    'export function nbaWinProb(a: NbaGmTeam, b: NbaGmTeam, edgeA = 0.01, edgeB = 0): number {'],
  /* The package salary rule forgets the first apron. */
  pilefit: ['desk', '  if (league.taxScale != null && after > nbaFirstApron(league.cap, league.taxScale)) return inSalary <= outSalary;',
    '  if (false) return inSalary <= outSalary;'],
  /* The engine stops reading the staff: the round's edge, the playoffs' edge, the trainer. */
  noedgeround: ['engine', '    const p = opts?.edges ? nbaWinProb(me, them, opts.edges[abbr] ?? 0, opts.edges[opp] ?? 0) : nbaWinProb(me, them);',
    '    const p = nbaWinProb(me, them);'],
  noedgepo: ['engine', '  const p = edges ? nbaWinProb(home, away, edges[home.abbr] ?? 0, edges[away.abbr] ?? 0) : nbaWinProb(home, away);',
    '  const p = nbaWinProb(home, away);'],
  noinjhook: ['engine', '        if (opts?.injuryRounds) p.out = opts.injuryRounds(t.abbr, p, p.out);', '        /* the trainer is not read */'],
  /* The old trade paths: the ledger misses the engine's pick move, the pick rules are not asked, the board skips them. */
  nomirror: ['desk', '  return key ? movePicks(ledger, [key], to) : ledger;', '  return ledger;'],
  nostepien: ['desk', '  return key ? pickSwapRefusal(ledger, nbaGamePickRules(), season, from, [key], to, []) : null;', '  return null;'],
  noruleblock: ['board', '    if (!league || !myTradePiece || deadlineBlock() || pickRuleBlock(league, o.teamId, o.sweeten)) return;',
    '    if (!league || !myTradePiece || deadlineBlock()) return;'],
  /* The summer picks the sheet's club again, after the draft, instead of the club written down. */
  /* Day one hands the user's club the staff its size attracts, an edge the other clubs never get. */
  dayonestature: ['desk', '  block: gmDefaultStaff(NBA_STAFF_PACK.rules, { ...nbaStaffCtx(league, team), anchor: () => 1 }),', '  block: gmDefaultStaff(NBA_STAFF_PACK.rules, nbaStaffCtx(league, team)),'],
  sheetrepick: ['contracts', '        ? (named ?? sheetClubFor(host, league, ledger.team, man.id)) : null;', '        ? sheetClubFor(host, league, ledger.team, man.id) : null;'],
};
const overrides = new Map();
if (CONTROL) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape SIM_NBA_GM_DESK_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (src.split(from).length !== 2) { console.error(`control cannot run: the line ${CONTROL} rewrites is there more than once`); process.exit(2); }
  const out = src.replace(from, to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${CONTROLS[CONTROL]} must go red`);
}
if (RECORD) {
  const old = execFileSync('git', ['show', `${RECORD}:src/lib/nbaFrontOffice.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  overrides.set(path.resolve(FILES.engine).toLowerCase(), old);
  console.log(`RECORDING the fixture from the engine at ${RECORD}`);
}

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simNbaGmDesk-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as E from '${ROOT_URL}/src/lib/nbaFrontOffice.ts';
export * as D from '${ROOT_URL}/src/lib/nbaGmDesk.ts';
export * as C from '${ROOT_URL}/src/lib/gmContracts.ts';
export * as P from '${ROOT_URL}/src/lib/gmPicks.ts';
export * as S from '${ROOT_URL}/src/lib/gmStaff.ts';
export * as G from '${ROOT_URL}/src/lib/gmDesk.ts';
export * as F from '${ROOT_URL}/src/lib/tradeFinder.ts';
export { nbaCloseSeasonStats } from '${ROOT_URL}/src/lib/nbaSeasonStats.ts';
export { NBA_STAFF_PACK } from '${ROOT_URL}/src/data/gmStaff/packs.ts';
export { nbaContractHost } from '${ROOT_URL}/src/lib/gmContractsHostNba.ts';
export { leagueNames } from '${ROOT_URL}/src/lib/foNames.ts';
export { NBA_OPENING_RATINGS } from '${ROOT_URL}/src/data/nbaOpeningRatings.ts';
export { NBA_DESK_PANELS, NBA_RECAP_PANELS } from '${ROOT_URL}/src/components/nba-front-office/NbaGmDesk.tsx';
export { GmDeskMount } from '${ROOT_URL}/src/components/front-office-shared/GmDeskMount.tsx';
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
const { E, D, C, P, S, G, F, NBA_STAFF_PACK, nbaContractHost: HOST, leagueNames, NBA_OPENING_RATINGS, nbaCloseSeasonStats } = M;

/* ---- seeded draws and the board's own call order ---- */
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
/* Ids carry a per process epoch; the fixture compares the league with it taken out. */
const leagueHash = lg => crypto.createHash('sha1').update(J(lg).replace(/"n[0-9a-z]+-(\d+)"/g, '"n-$1"')).digest('hex');
const TEAM = 'BOS';

/** Every man the user drafted with the desk on: the season of his draft and the round. */
const draftedIn = new Map();

/** The board will not tip off a roster over fifteen: the GM waives the weakest, the way the board's waiver does it. */
function trimForTipOff(lg, team) {
  const mine = lg.teams[team];
  while (E.nbaTipOffRefusal(mine)) {
    const down = [...mine.players].sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
    if (!E.nbaRelease(mine, lg.freeAgents, down.id)) break;
  }
}

/** Draft night as the board runs it: the user takes the best grade he sees, the CPU clubs go in batches. */
function draftNight(lg, team, rng, desk) {
  const mine = lg.teams[team];
  const capital = E.nbaDraftCapital(mine) ?? 0;
  const rivalCapital = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((s, t) => s + (E.nbaDraftCapital(t) ?? 0), 0);
  let cls = E.nbaDraftClass(rng, Math.max(24, capital + Math.min(10, rivalCapital)), leagueNames(lg));
  const level = desk ? S.gmStaffLevel(D.nbaStaffOf(desk, lg, team).block, 'scouting') : 1;
  const grade = pr => (desk ? D.nbaScoutRead(pr, team, lg.season, level) : pr.grade);
  let batches = 2;
  const aiBatch = () => {
    const order = E.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team);
    cls = E.nbaAiDraftPicks(lg, cls, order, rng).remaining;
    batches -= 1;
  };
  if (capital === 0) { mine.picks = []; while (batches > 0) aiBatch(); return desk; }
  let picksLeft = capital;
  while (picksLeft > 0) {
    const cap = E.nbaDraftCapital(mine) ?? 0;
    if (cap === 0) break;
    if (cap > picksLeft) mine.picks = mine.picks.slice(-picksLeft);
    const pr = desk ? [...cls].sort((a, b) => grade(b) - grade(a) || a.id.localeCompare(b.id))[0] : cls[0];
    if (!pr) break;
    const round = mine.picks[0];
    if (!E.nbaConsumeDraftPick(mine)) break;
    const p = E.nbaProspectToPlayer(pr, rng, E.nbaDraftSigning(lg));
    if (desk) { D.nbaSignDraftee(p, round); draftedIn.set(p.id, { season: lg.season, round }); }
    mine.players.push(p);
    if (desk) desk = D.nbaNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    do { if (batches === 0) break; aiBatch(); } while (nextPicks === 0 && batches > 0);
    picksLeft = nextPicks;
  }
  return desk;
}

/** The close of a season as the board runs it: the playoffs, the champion, the tax and the season's lines. */
function closeSeason(lg, rng, edges) {
  const po = E.runNbaPlayoffs(lg, rng, edges);
  lg.champions.push({ season: lg.season, team: po.champion });
  E.nbaAssessTax(lg);
  nbaCloseSeasonStats(lg);
}

/** A season with the desk off: the exact calls the board makes on a save from before the desk. */
function seasonOff(lg, team, rng) {
  for (;;) {
    if (lg.round === 1) { trimForTipOff(lg, team); E.nbaTipOff(lg, rng, team); }
    E.simRound(lg, team, rng);
    if (lg.round >= E.NBA_ROUNDS) break;
    lg.round += 1;
  }
  closeSeason(lg, rng);
  draftNight(lg, team, rng, null);
  E.nbaOffseason(lg, rng, team);
}

/* ================================================================== */
begin('1', 'a save from before the desk plays exactly as the engine did before this round');
/* First, before anything else mints an id, so the recorder and the replay
   walk the same id stream. */
const ID_SEEDS = [11, 22, 33];
const ID_SEASONS = 3;
const played = {};
for (const seed of ID_SEEDS) {
  const rng = mulberry32(seed);
  const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
  played[seed] = [];
  for (let s = 0; s < ID_SEASONS; s++) { seasonOff(lg, TEAM, rng); played[seed].push(leagueHash(lg)); }
}
if (RECORD) {
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, `${J({ recordedFrom: RECORD, team: TEAM, seasons: ID_SEASONS, hashes: played }, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, FIXTURE)} from ${RECORD}: ${ID_SEEDS.length} seeds x ${ID_SEASONS} seasons`);
  process.exit(0);
}
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
let idCompared = 0;
for (const seed of ID_SEEDS) {
  for (let s = 0; s < ID_SEASONS; s++) {
    idCompared++;
    if (fixture.hashes?.[seed]?.[s] !== played[seed][s]) fail(`seed ${seed} season ${s + 1}: the league is not the one the engine before this round played (${played[seed][s].slice(0, 10)} vs ${String(fixture.hashes?.[seed]?.[s]).slice(0, 10)})`);
  }
}
{
  /* Opening the desk reads the league and never changes it. */
  const rng = mulberry32(44);
  const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
  E.nbaTipOff(lg, rng, TEAM);
  for (let r = 0; r < 7; r++) { E.simRound(lg, TEAM, rng); lg.round += 1; }
  const before = J(lg);
  const desk = D.openNbaDesk(lg, TEAM);
  if (J(lg) !== before) fail('openNbaDesk changed the league it opened on');
  if (!desk || desk.v !== 1 || !['contracts', 'picks', 'staff'].every(k => k in desk.blocks)) fail(`the opened desk is missing a block: ${J(Object.keys(desk?.blocks ?? {}))}`);
}
console.log(`   ${idCompared} seasons replayed against ${fixture.recordedFrom}`);

/* ================================================================== */
/* Sections 2, 3 and 4 share one walk: ten seasons a seed with the desk on. */
const stats = {
  decisions: 0, gm: 0, auto: 0, earlyDeals: 0, lateTries: 0, lateDeals: 0, pickMoves: 0,
  pickChecks: 0, applyChecks: 0, buyers: 0, sellers: 0, refusalChecks: 0, oldDeals: 0, oldRefused: 0,
  scaleUp: 0, secondUp: 0, restricted: 0, sheets: 0, sheetGone: 0, sheetMatched: 0, sheetFull: 0,
};
const problems = { s2: [], s3: [], s4: [] };
const ids = lg => Object.keys(lg.teams);
const rules = () => D.nbaGamePickRules();

/** Every club's pick in every round of every year carried exists exactly once, and every engine list is the ledger's. */
function checkPicks(lg, desk, where) {
  stats.pickChecks++;
  /* The block as stored, not as read: a reader that fails closed would hand
     back a fresh ledger and hide the very loss this check is for. */
  const ledger = desk.blocks[D.NBA_DESK_KEYS.picks];
  if (!P.validateLedger(ledger, ids(lg), rules())) { problems.s4.push(`${where}: the stored pick ledger does not validate`); return; }
  for (const p of P.ledgerProblems(ledger, ids(lg), lg.season, rules())) problems.s4.push(`${where}: ${p}`);
  for (const [abbr, t] of Object.entries(lg.teams)) {
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    const list = [...t.picks].sort((a, b) => a - b);
    if (J(held) !== J(list)) problems.s4.push(`${where}: ${abbr} engine list ${J(list)} but the ledger says ${J(held)}`);
  }
}

const byValue = arr => [...arr].sort((a, b) => E.nbaTradeValue(a) - E.nbaTradeValue(b) || a.id.localeCompare(b.id));

/** One package a round, before the round is played, the way a GM on the hub would: alternately a man and a
    second rounder for their man, and two men for their man and their second rounder. */
function tryDeal(lg, team, desk, s, where) {
  const r = lg.round;
  const others = ids(lg).filter(k => k !== team).sort();
  const partner = others[(s * 7 + r * 3) % others.length];
  const me = lg.teams[team], them = lg.teams[partner];
  const ledger = D.nbaPicksOf(desk, lg);
  const myPick = P.picksHeldBy(ledger, team).filter(p => p.round === 2).pop();
  const theirPick = P.picksHeldBy(ledger, partner).filter(p => p.round === 2).pop();
  const pkg = r % 2 === 1
    ? { from: team, to: partner, give: [{ kind: 'player', id: byValue(me.players)[0].id }, ...(myPick ? [{ kind: 'pick', key: P.pickKey(myPick) }] : [])], get: [{ kind: 'player', id: byValue(them.players)[0].id }] }
    : { from: team, to: partner, give: byValue(me.players).slice(0, 2).map(p => ({ kind: 'player', id: p.id })), get: [{ kind: 'player', id: byValue(them.players)[0].id }, ...(theirPick ? [{ kind: 'pick', key: P.pickKey(theirPick) }] : [])] };
  const open = D.nbaTradeWindow(lg).open;
  /* The board's older trade paths (the phone talks, the trade finder) ask
     nbaDeadlineRefusal; the packages ask the package clock. All three must
     read the same deadline in every round. */
  const refusal = D.nbaDeadlineRefusal(lg);
  stats.refusalChecks++;
  /* What the guide and the hub promise: the break after round 12 is the last
     chance, and once round 13 is played every deal is shut (0.6 of 20
     rounds, NBA_DEADLINE in gmDeadline.ts). `lg.round` is the round about to
     be played. */
  if (open !== (lg.round <= 13)) problems.s3.push(`${where} round ${r}: the window is ${open ? 'open' : 'shut'} with ${lg.round - 1} rounds played, the guide says deals shut once round 13 is played`);
  if ((refusal === null) !== open) problems.s3.push(`${where} round ${r}: the window says ${open ? 'open' : 'shut'} but the trade paths' refusal says ${J(refusal)}`);
  const res = D.nbaProposePackage(lg, desk, team, pkg);
  const yes = res.verdict.verdict === 'accepted';
  if (refusal !== null && res.verdict.step === 1 && res.verdict.reason !== refusal) problems.s3.push(`${where} round ${r}: the package refusal ${J(res.verdict.reason)} is not the trade paths' ${J(refusal)}`);
  if (!open) {
    stats.lateTries++;
    if (yes) { stats.lateDeals++; problems.s3.push(`${where} round ${r}: a deal landed after the deadline (round ${D.nbaTradeWindow(lg).deadlineAfter})`); }
    else if (res.verdict.step !== 1) problems.s3.push(`${where} round ${r}: refused after the deadline, but by step ${res.verdict.step} (${res.verdict.reason}), not the deadline`);
  }
  if (!yes) return desk;
  if (open) stats.earlyDeals++;
  if ([...pkg.give, ...pkg.get].some(a => a.kind === 'pick')) stats.pickMoves++;
  checkPicks(lg, res.desk, `${where} round ${r} deal`);
  return res.desk;
}

/** Round one picks a club holds in each year the ledger carries. */
const firstsByYear = (ledger, club, season) => P.ledgerYears(season, rules()).map(y => P.picksHeldBy(ledger, club, y).filter(p => p.round === 1).length);

/** The trade finder's sweetened deal with the desk on, in the board's order
    (acceptShopOffer then deskAfterTrade): shop the weakest men until an offer
    costs a pick, ask the pick rules (pickRuleBlock), let the engine trade, then
    mirror the pick it moved into the ledger and sync every engine list. The
    sync must leave the engine's own move standing: a mirror that misses would
    hand the pick straight back to the user at the sync and pass every census. */
function oldPathDeal(lg, team, desk, where) {
  if (D.nbaDeadlineRefusal(lg)) return desk;
  for (const piece of byValue(lg.teams[team].players).slice(0, 4)) {
    const offers = F.findTrades(lg.teams, team, piece.id, lg.cap, (m, t, a, b, s, c) => E.nbaTrade(m, t, a, b, s, c, lg.taxScale), E.nbaTradeValue);
    const o = offers.find(x => x.sweeten);
    if (!o) continue;
    const list = lg.teams[team].picks;
    const round = list[list.length - 1];
    const ledger = D.nbaPicksOf(desk, lg);
    const why = D.nbaMirrorPickRefusal(ledger, team, o.teamId, round, lg.season);
    if (why) { stats.oldRefused++; return desk; }
    const before = firstsByYear(ledger, team, lg.season);
    if (E.nbaTrade(lg.teams[team], lg.teams[o.teamId], piece.id, o.playerId, true, lg.cap, lg.taxScale) !== 'accepted') {
      problems.s4.push(`${where}: the finder's offer for ${piece.name} was not accepted by the engine`);
      return desk;
    }
    const engineMove = J(Object.fromEntries(Object.entries(lg.teams).map(([k, t]) => [k, [...t.picks].sort((a, b) => a - b)])));
    const moved = D.nbaMirrorPickMove(ledger, team, o.teamId, round, lg.season);
    let d = G.withGmBlock(desk, D.NBA_DESK_KEYS.picks, moved);
    D.syncNbaPicks(lg, moved);
    d = D.nbaNoteArrivals(d, lg, team, [o.playerId], 'trade');
    stats.oldDeals++;
    const synced = J(Object.fromEntries(Object.entries(lg.teams).map(([k, t]) => [k, [...t.picks].sort((a, b) => a - b)])));
    if (synced !== engineMove) problems.s4.push(`${where}: the sweetener's round ${round} pick went to ${o.teamId} in the engine, but the ledger did not follow and the sync undid it`);
    const after = firstsByYear(moved, team, lg.season);
    for (let i = 0; i + 1 < after.length; i++) {
      if (after[i] + after[i + 1] === 0 && before[i] + before[i + 1] > 0) problems.s4.push(`${where}: the sweetener left ${team} without a first round pick in two drafts running`);
    }
    checkPicks(lg, d, `${where} old path`);
    return d;
  }
  return desk;
}

/** The GM takes every other case himself, and leaves the rest open for the staff's rule. An offer sheet he
    matches one time and lets go the next. Every case is read for what the rules owe it first. */
let sheetTurn = 0;
function gmDecides(lg, team, desk, where) {
  const ledger = D.deskCopy(D.nbaContractsOf(desk, lg, team));
  C.deskCases(HOST, lg, ledger).forEach((c, i) => {
    const rec = ledger.men[c.man.id];
    if (draftedIn.has(c.man.id) && rec?.how === 'draft' && !rec.firstDealDone) {
      if (!c.restricted) problems.s2.push(`${where}: ${c.man.name}, drafted here in round ${rec.round}, came up at the end of his first deal and is not restricted`);
      else stats.restricted++;
    }
    const sheet = c.restricted?.sheet;
    if (sheet) {
      stats.sheets++;
      if (sheet.picks.length) problems.s2.push(`${where}: an NBA offer sheet on ${c.man.name} pays picks ${J(sheet.picks)}`);
      if (sheet.salary > (c.maxSalary ?? Infinity) + 1e-9) problems.s2.push(`${where}: a sheet of ${sheet.salary} on ${c.man.name} is over his maximum ${c.maxSalary}`);
      if (sheet.years > 4 || sheet.years < 2) problems.s2.push(`${where}: a sheet on ${c.man.name} runs ${sheet.years} seasons`);
      if (c.canNegotiate) problems.s2.push(`${where}: ${c.man.name} is open to talks with a sheet on the table`);
    }
    if (i % 2 === 1) return;
    if (sheet) { if (sheetTurn++ % 2 === 0) C.matchSheet(ledger, lg, c); else C.letGo(ledger, lg, c); }
    else if (c.restricted) C.tenderHim(ledger, lg, c);
    else if (c.man.ovr >= 76) { if (!C.keepAtAsk(ledger, lg, c).ok) C.letGo(ledger, lg, c); }
    else C.letGo(ledger, lg, c);
  });
  return G.withGmBlock(desk, D.NBA_DESK_KEYS.contracts, ledger);
}

const STAYS = new Set(['keep', 'option', 'tender', 'qualify-accepted', 'match']);

/**
 * The worst draft night for a sheet the GM let stand: on a copy, every rival
 * club is filled to the limit before the summer (fillers rated 40, so the
 * engine's own waiver takes one of them). He still goes to the club written
 * down on his decision, on its terms. The copy runs on its own rng, so the
 * walk itself is untouched.
 */
function sheetAfterFullDraft(lg, team, desk, where) {
  const taken = D.nbaContractsOf(desk, lg, team).decisions.filter(d => d.season === lg.season && d.kind === 'take-picks');
  for (const d of taken) {
    const c = JSON.parse(J(lg));
    for (const [k, t] of Object.entries(c.teams)) {
      if (k === team || !t.players.length) continue;
      for (let i = 0; t.players.length < E.NBA_ROSTER_MAX; i++) {
        t.players.push({ ...t.players[0], id: `fill-${k}-${i}`, name: `Filler ${k} ${i}`, age: 30, ovr: 40, pot: 40, years: 3, out: 0 });
      }
    }
    const summer = D.nbaDeskOffseason(c, JSON.parse(J(desk)), team, mulberry32(7000 + c.season));
    if (!summer.ok) { problems.s2.push(`${where} full draft: the desk summer refused to run`); continue; }
    if (summer.notes.some(n => n.includes(`${d.name} retires`))) continue;
    const p = c.teams[d.club]?.players.find(x => x.id === d.id);
    if (!p) problems.s2.push(`${where} full draft: ${d.name} let ${d.club}'s sheet stand and is not there after the summer`);
    else if (p.years !== d.years || Math.abs(p.salary - d.salary) > 1e-9) problems.s2.push(`${where} full draft: ${d.name} is at ${d.club} on ${p.years}y at ${p.salary}, the sheet said ${d.years}y at ${d.salary}`);
    else stats.sheetFull++;
  }
}

/** A season with the desk on, in the board's order, and the summer through the desk. */
function seasonDesk(lg, team, desk, rng, s, where) {
  for (;;) {
    if (lg.round === 1) trimForTipOff(lg, team);
    desk = tryDeal(lg, team, desk, s, where);
    if (lg.round === 1) E.nbaTipOff(lg, rng, team);
    E.simRound(lg, team, rng, D.nbaDeskRoundOptions(desk, lg, team));
    desk = D.nbaDeskAfterRound(desk, lg, team).desk;
    if (lg.round === D.nbaTradeWindow(lg).deadlineAfter) {
      const st = Object.values(D.nbaStances(lg));
      stats.buyers += st.filter(x => x === 'buyer').length;
      stats.sellers += st.filter(x => x === 'seller').length;
    }
    if (lg.round >= E.NBA_ROUNDS) break;
    lg.round += 1;
  }
  closeSeason(lg, rng, D.nbaDeskEdges(desk, lg, team));
  /* The board's order: the re-sign desk is offered in the season and on the
     recap, before draft night, and finishDraft runs the summer straight after
     the last pick. So the GM decides first and the clubs draft after him. */
  desk = gmDecides(lg, team, desk, where);
  desk = draftNight(lg, team, rng, desk);
  const closed = lg.season;
  const up = C.expiringMen(HOST, lg, team).map(m => ({ id: m.id, name: m.name }));
  /* A man drafted with the desk on comes up when his first deal has run: the
     rookie scale's four seasons in round one, the engine's three in round two. */
  const upIds = new Set(up.map(m => m.id));
  const rosterNow = new Set(lg.teams[team].players.map(p => p.id));
  for (const [id, at] of [...draftedIn]) {
    const playedHere = closed - at.season;
    const want = at.round === 1 ? 4 : 3;
    if (!rosterNow.has(id)) { if (playedHere >= want) draftedIn.delete(id); continue; }
    if (upIds.has(id)) {
      if (at.round === 1) stats.scaleUp++; else stats.secondUp++;
      if (playedHere !== want) problems.s2.push(`${where}: a round ${at.round} draftee came up after ${playedHere} seasons, his first deal is ${want}`);
      draftedIn.delete(id);
    } else if (playedHere >= want) {
      problems.s2.push(`${where}: a round ${at.round} draftee has played ${playedHere} seasons and his ${want} season first deal has not come up`);
      draftedIn.delete(id);
    }
  }
  sheetAfterFullDraft(lg, team, desk, where);
  const summer = D.nbaDeskOffseason(lg, desk, team, rng);
  if (!summer.ok) { problems.s2.push(`${where}: the desk summer refused to run (${summer.lines.join(' ')})`); return desk; }
  desk = summer.desk;
  const ledger = D.nbaContractsOf(desk, lg, team);
  const roster = new Set(lg.teams[team].players.map(p => p.id));
  for (const m of up) {
    stats.applyChecks++;
    const d = ledger.decisions.find(x => x.season === closed && x.id === m.id);
    if (!d) { problems.s2.push(`${where}: ${m.name}'s deal ran out with no recorded decision`); continue; }
    stats.decisions++;
    if (d.via === 'gm') stats.gm++; else stats.auto++;
    if (d.kind === 'match') stats.sheetMatched++;
    const retired = summer.notes.some(n => n.includes(`${m.name} retires`));
    if (STAYS.has(d.kind) && !roster.has(m.id) && !retired) problems.s2.push(`${where}: ${m.name} was kept (${d.kind}) but is not on the roster`);
    if (!STAYS.has(d.kind) && roster.has(m.id)) problems.s2.push(`${where}: ${m.name} was let go (${d.kind}) but is still on the roster`);
    if (d.kind === 'take-picks' && !retired) {
      /* He signed the rival's sheet, so he is at the club that tabled it, on its terms. */
      const at = ids(lg).find(k => k !== team && lg.teams[k].players.some(p => p.id === m.id));
      const p = at ? lg.teams[at].players.find(x => x.id === m.id) : null;
      if (!p) problems.s2.push(`${where}: ${m.name} let his sheet stand and is at no rival club`);
      else if (!d.club) problems.s2.push(`${where}: ${m.name}'s sheet was taken with no club written down`);
      else if (at !== d.club) problems.s2.push(`${where}: ${m.name} let ${d.club}'s sheet stand and the summer sent him to ${at}`);
      else if (p.years !== d.years || Math.abs(p.salary - d.salary) > 1e-9) problems.s2.push(`${where}: ${m.name} is at ${at} on ${p.years}y at ${p.salary}, the sheet said ${d.years}y at ${d.salary}`);
      else stats.sheetGone++;
      if (d.picks?.length) problems.s2.push(`${where}: an NBA sheet let go was paid with picks ${J(d.picks)}`);
    }
  }
  checkPicks(lg, desk, `${where} summer`);
  return desk;
}

for (const seed of SEEDS) {
  const rng = mulberry32(1000 + seed);
  const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
  let desk = D.openNbaDesk(lg, TEAM);
  checkPicks(lg, desk, `seed ${seed} open`);
  for (let s = 0; s < SEASONS; s++) desk = seasonDesk(lg, TEAM, desk, rng, s, `seed ${seed} season ${s + 1}`);
}
/* The old trade paths on a walk of their own (three seasons a seed, a
   sweetened trade finder deal at rounds 2 and 9), so the sweeteners, nearly
   always the last marker and so the second rounder, leave the draftees the
   walk above counts alone. Checked in section 4. */
for (const seed of SEEDS) {
  const rng = mulberry32(3000 + seed);
  const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
  let desk = D.openNbaDesk(lg, TEAM);
  for (let s = 0; s < 3; s++) {
    const where = `old paths seed ${seed} season ${s + 1}`;
    for (;;) {
      if (lg.round === 1) { trimForTipOff(lg, TEAM); E.nbaTipOff(lg, rng, TEAM); }
      if (lg.round === 2 || lg.round === 9) desk = oldPathDeal(lg, TEAM, desk, where);
      E.simRound(lg, TEAM, rng, D.nbaDeskRoundOptions(desk, lg, TEAM));
      desk = D.nbaDeskAfterRound(desk, lg, TEAM).desk;
      if (lg.round >= E.NBA_ROUNDS) break;
      lg.round += 1;
    }
    closeSeason(lg, rng, D.nbaDeskEdges(desk, lg, TEAM));
    desk = draftNight(lg, TEAM, rng, desk);
    const summer = D.nbaDeskOffseason(lg, desk, TEAM, rng);
    if (!summer.ok) { problems.s4.push(`${where}: the desk summer refused to run (${summer.lines.join(' ')})`); break; }
    desk = summer.desk;
    checkPicks(lg, desk, `${where} summer`);
  }
}

begin('2', 'over ten seasons a seed, no expiring man of yours leaves without a recorded decision, applied as written');
for (const p of problems.s2) fail(p);
if (stats.decisions < T.minDecisions) fail(`only ${stats.decisions} decisions over the walk, floor ${T.minDecisions}`);
if (stats.gm < T.minGm) fail(`only ${stats.gm} decisions by the GM, floor ${T.minGm}`);
if (stats.auto < T.minAuto) fail(`only ${stats.auto} settled by the staff's rule, floor ${T.minAuto}`);
if (stats.scaleUp < T.minScaleUp) fail(`only ${stats.scaleUp} first round draftees reached the end of the rookie scale, floor ${T.minScaleUp}`);
if (stats.secondUp < T.minSecondUp) fail(`only ${stats.secondUp} second round draftees reached the end of their first deal, floor ${T.minSecondUp}`);
if (stats.restricted < T.minRestricted) fail(`only ${stats.restricted} restricted cases, floor ${T.minRestricted}`);
if (stats.sheets < T.minSheets) fail(`only ${stats.sheets} offer sheets, floor ${T.minSheets}`);
if (stats.sheetGone < T.minSheetGone) fail(`only ${stats.sheetGone} men left on a sheet and found at the rival, floor ${T.minSheetGone}`);
if (stats.sheetFull < T.minSheetFull) fail(`only ${stats.sheetFull} sheets let stand reached their club after a draft that filled every roster, floor ${T.minSheetFull}`);
console.log(`   ${stats.sheetFull} sheets let stand still reached the club written down after a draft that filled every rival roster`);
console.log(`   ${stats.applyChecks} expiring men: ${stats.gm} decided by the GM, ${stats.auto} by the staff's rule`);
console.log(`   draftees up: ${stats.scaleUp} first rounders after the rookie scale, ${stats.secondUp} second rounders; ${stats.restricted} restricted cases, ${stats.sheets} sheets (${stats.sheetMatched} matched, ${stats.sheetGone} gone to the rival on its terms)`);

begin('3', 'no trade lands after the deadline, and deals do land before it');
for (const p of problems.s3) fail(p);
if (stats.earlyDeals < T.minEarlyDeals) fail(`only ${stats.earlyDeals} deals before the deadline, floor ${T.minEarlyDeals}`);
if (stats.lateTries < T.minLateTries) fail(`only ${stats.lateTries} tries after the deadline, floor ${T.minLateTries}`);
if (!(stats.buyers > 0 && stats.sellers > 0)) fail(`the deadline split nobody: ${stats.buyers} buyers, ${stats.sellers} sellers`);
console.log(`   ${stats.earlyDeals} deals before the deadline, ${stats.lateTries} tries after it, ${stats.lateDeals} landed; ${stats.buyers} buyer and ${stats.sellers} seller places at the deadline`);
{
  /* The board's older trade paths are guarded in the board itself, so read
     it: the code, with every comment stripped, so prose about the guard can
     never stand in for the guard. Each handler that opens or closes a deal
     asks deadlineBlock() before it touches the trade engine, and
     deadlineBlock asks nbaDeadlineRefusal, the refusal checked above. */
  const raw = overrides.get(path.resolve(FILES.board).toLowerCase()) ?? lf(fs.readFileSync(FILES.board, 'utf8'));
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const body = name => {
    const at = code.indexOf(`  const ${name} = (`);
    if (at < 0) return null;
    const end = code.indexOf('\n  const ', at + 10);
    return code.slice(at, end < 0 ? undefined : end);
  };
  const guard = body('deadlineBlock');
  if (!guard || !guard.includes('nbaDeadlineRefusal(league)')) fail('deadlineBlock no longer asks nbaDeadlineRefusal');
  const paths = { openTradeTalks: 'openTalks(', acceptTalks: 'nbaExecuteTalksTrade(', doShop: 'findTrades(', acceptShopOffer: 'nbaTrade(' };
  let guarded = 0;
  for (const [name, engineCall] of Object.entries(paths)) {
    const b = body(name);
    if (!b) { fail(`the board has no ${name} handler to check`); continue; }
    const g = b.indexOf('deadlineBlock()'), t = b.indexOf(engineCall);
    if (t < 0) fail(`${name} no longer calls ${engineCall}, so this check is reading the wrong handler`);
    else if (g < 0 || g > t) fail(`${name} reaches ${engineCall} without asking deadlineBlock() first`);
    else guarded++;
  }
  /* The two handlers that can send a pick ask the pick rules too (the walk
     in check 4 holds nbaMirrorPickRefusal to them). */
  const rule = body('pickRuleBlock');
  if (!rule || !rule.includes('nbaMirrorPickRefusal(')) fail('pickRuleBlock no longer asks nbaMirrorPickRefusal');
  let ruled = 0;
  for (const [name, engineCall] of [['acceptTalks', 'nbaExecuteTalksTrade('], ['acceptShopOffer', 'nbaTrade(']]) {
    const b = body(name) ?? '';
    const g = b.indexOf('pickRuleBlock('), t = b.indexOf(engineCall);
    if (g < 0 || t < 0 || g > t) fail(`${name} reaches ${engineCall} without asking pickRuleBlock() first`);
    else ruled++;
  }
  console.log(`   ${stats.refusalChecks} rounds where the trade paths' refusal matched the window; ${guarded} of 4 board trade handlers ask the deadline first, ${ruled} of 2 that send a pick ask the pick rules`);
}

begin('4', 'picks are conserved league wide after every deal and every summer');
for (const p of problems.s4) fail(p);
if (stats.pickMoves < T.minPickMoves) fail(`only ${stats.pickMoves} deals moved a pick, floor ${T.minPickMoves}`);
if (stats.oldDeals < T.minOldDeals) fail(`only ${stats.oldDeals} sweetened trade finder deals landed, floor ${T.minOldDeals}`);
console.log(`   ${stats.pickChecks} ledger checks, ${stats.pickMoves} deals with a pick in them; ${stats.oldDeals} sweetened trade finder deals mirrored into the ledger, ${stats.oldRefused} refused by the pick rules`);
{
  /* The two drafts running rule on the old paths, set up on purpose: next
     season's first already gone and this season's second too, so the
     sweetener's marker is this season's first. The old path must refuse it
     the way the Trade desk refuses a package, and a pick it may send must
     still be allowed. */
  const lg = E.initNbaLeague(mulberry32(31), NBA_OPENING_RATINGS);
  lg.round = 3;
  const S0 = lg.season, other = ids(lg).find(k => k !== TEAM);
  let ledger = D.nbaPicksOf(D.openNbaDesk(lg, TEAM), lg);
  const own = (y, r) => P.picksHeldBy(ledger, TEAM, y).find(p => p.round === r && p.orig === TEAM);
  if (D.nbaMirrorPickRefusal(ledger, TEAM, other, 2, S0) !== null) fail('the old path refuses a plain second round sweetener');
  ledger = P.movePicks(ledger, [P.pickKey(own(S0 + 1, 1)), P.pickKey(own(S0, 2))], other);
  D.syncNbaPicks(lg, ledger);
  if (J(lg.teams[TEAM].picks) !== J([1])) fail(`the set up left ${J(lg.teams[TEAM].picks)} on the engine list, not this season's first alone`);
  const why = D.nbaMirrorPickRefusal(ledger, TEAM, other, 1, S0);
  if (!why || !why.includes('two drafts running')) fail(`the old path would send this season's first with next season's gone: refusal ${J(why)}`);
  const pkg = P.pickSwapRefusal(ledger, rules(), S0, TEAM, [P.pickKey(own(S0, 1))], other, []);
  if (why !== pkg) fail(`the old path's refusal ${J(why)} is not the Trade desk's ${J(pkg)}`);
}

/* ================================================================== */
begin('5', "the staff's effects change their consumer at every level step");
const L5 = E.initNbaLeague(mulberry32(5), NBA_OPENING_RATINGS);
const base = S.gmDefaultStaff(NBA_STAFF_PACK.rules, D.nbaStaffCtx(L5, TEAM));
const atLevel = level => {
  const block = { ...base };
  for (const post of NBA_STAFF_PACK.posts) block[post.id] = { ...base[post.id], level, potential: Math.max(level, base[post.id].potential) };
  return block;
};
const rival = L5.teams.NYK, mine5 = L5.teams[TEAM];
const missAt = lv => { let v = 0; for (let i = 0; i < 3000; i++) { const t = 70 + (i % 15); v += Math.abs(D.nbaScoutRead({ id: `p${i}`, trueOvr: t }, TEAM, 2026, lv) - t); } return v / 3000; };
const outAt = block => { let v = 0; for (let i = 0; i < 4000; i++) v += D.nbaInjuryRounds(block, TEAM, 2026, 1, `i${i}`, 3); return v / 4000; };
const growAt = block => { let v = 0; for (let i = 0; i < 4000; i++) v += D.nbaGrowthStep(block, TEAM, 2026, `g${i}`, 1 + (i % 3)); return v / 4000; };
const ladder = [];
for (let level = 1; level <= 10; level++) {
  const block = atLevel(level);
  const desk = G.withGmBlock(D.openNbaDesk(L5, TEAM), D.NBA_DESK_KEYS.staff, { block, purse: 9 });
  const opts = D.nbaDeskRoundOptions(desk, L5, TEAM);
  const win = E.nbaWinProb(mine5, rival, opts.edges[TEAM], 0);
  let out = 0;
  for (let i = 0; i < 4000; i++) out += opts.injuryRounds(TEAM, { id: `i${i}` }, 3);
  ladder.push({ level, edge: opts.edges[TEAM], win, miss: missAt(S.gmStaffLevel(block, 'scouting')), out: out / 4000, grow: growAt(block) });
}
if (Math.abs(ladder[0].win - E.nbaWinProb(mine5, rival)) > 1e-12) fail(`a level 1 staff moves the game: ${ladder[0].win} against ${E.nbaWinProb(mine5, rival)} with no desk`);
{
  /* The engine's own steps over the same 4000 men, untouched: 1, 2, 3 in turn. */
  let plain = 0;
  for (let i = 0; i < 4000; i++) plain += 1 + (i % 3);
  if (Math.abs(ladder[0].grow - plain / 4000) > 1e-12) fail(`a level 1 development coach moves the summer: mean step ${ladder[0].grow}, the engine's is ${plain / 4000}`);
}
for (let i = 1; i < ladder.length; i++) {
  const a = ladder[i - 1], b = ladder[i];
  if (!(b.win > a.win)) fail(`level ${a.level} to ${b.level}: the win probability did not rise (${a.win.toFixed(4)} to ${b.win.toFixed(4)})`);
  if (!(b.miss < a.miss)) fail(`level ${a.level} to ${b.level}: the scouting miss did not shrink (${a.miss.toFixed(3)} to ${b.miss.toFixed(3)})`);
  if (!(b.out < a.out)) fail(`level ${a.level} to ${b.level}: an injury did not get shorter (${a.out.toFixed(3)} to ${b.out.toFixed(3)})`);
  if (!(b.grow > a.grow)) fail(`level ${a.level} to ${b.level}: a young man's summer step did not grow (${a.grow.toFixed(4)} to ${b.grow.toFixed(4)})`);
}
/* Each post on its own: every other chair at level 1, this one up the
   ladder. A post whose effect reaches nothing hides inside the all posts
   ladder above (gmStaffEffect reads a key it does not know as nothing), so
   each post must move its own consumer at every step, and an edge post must
   reach the strength by exactly half a point an end, as its panel says. */
const WEIGHTS = { offEdge: D.NBA_END_WEIGHT, defEdge: D.NBA_END_WEIGHT };
const postLines = [];
for (const post of NBA_STAFF_PACK.posts) {
  const keys = post.effects.map(x => x.key);
  const edgeKeys = keys.filter(k => k in WEIGHTS);
  const consumer = edgeKeys.length ? 'win' : keys.includes('scoutSpread') ? 'miss' : keys.includes('injuryWeeks') ? 'out' : keys.includes('growth') ? 'grow' : null;
  if (!consumer) { fail(`the ${post.id} post's effects ${J(keys)} reach no consumer this harness knows`); continue; }
  const vals = [];
  for (let level = 1; level <= 10; level++) {
    const block = atLevel(1);
    block[post.id] = { ...base[post.id], level, potential: Math.max(level, base[post.id].potential) };
    const edge = D.nbaStaffEdge(block);
    const want = edgeKeys.reduce((s, k) => s + S.gmStaffEffect(NBA_STAFF_PACK, block, k) * WEIGHTS[k], 0);
    if (Math.abs(edge - want) > 1e-9) fail(`${post.id} at level ${level}: the staff edge is ${edge.toFixed(3)}, its own effects at their weights make ${want.toFixed(3)}`);
    const v = consumer === 'win' ? E.nbaWinProb(mine5, rival, edge, 0)
      : consumer === 'miss' ? missAt(S.gmStaffLevel(block, 'scouting'))
        : consumer === 'out' ? outAt(block) : growAt(block);
    if (vals.length && !(consumer === 'win' || consumer === 'grow' ? v > vals.at(-1) : v < vals.at(-1))) fail(`${post.id} alone, level ${level - 1} to ${level}: the ${consumer} did not move (${vals.at(-1).toFixed(4)} to ${v.toFixed(4)})`);
    vals.push(v);
  }
  postLines.push(`${post.id} ${consumer} ${vals[0].toFixed(3)} to ${vals[9].toFixed(3)}`);
}
console.log(`   each post alone: ${postLines.join('; ')}`);
{
  /* The ladders above read the helpers. These read the engine that consumes
     them, so an edge or a trainer the engine stops reading goes red here.
     Each walk plays the same seeded draws at every level:
       the regular season through simRound, the trainer held at level 1 so
         every level draws the same injuries and only the win probability
         moves (the user's wins can only rise with the edge, and must rise at
         every step);
       one round through simRound for the trainer, from a league nobody is
         out of, so every level draws the same injuries and only the rounds
         out differ (the announced rounds can only fall, and must at every step);
       the playoffs through runNbaPlayoffs on one finished season. */
  const deskWith = block => G.withGmBlock(D.openNbaDesk(L5, TEAM), D.NBA_DESK_KEYS.staff, { block, purse: 9 });
  const withPost = (block, id, level) => ({ ...block, [id]: { ...base[id], level, potential: Math.max(level, base[id].potential) } });
  const snapOf = seed => {
    const rng = mulberry32(seed);
    const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
    E.nbaTipOff(lg, rng, TEAM);
    return J(lg);
  };
  const playSeason = (snap, seed, opts) => {
    const lg = JSON.parse(snap);
    const rng = mulberry32(seed * 31 + 1);
    for (;;) {
      E.simRound(lg, TEAM, rng, opts ? opts(lg) : undefined);
      if (lg.round >= E.NBA_ROUNDS) break;
      lg.round += 1;
    }
    return lg;
  };
  const SEASON_SEEDS = [71, 72, 73, 74, 75, 76, 77, 78, 79, 80];
  const seasonSnaps = SEASON_SEEDS.map(snapOf);
  let plainWins = 0;
  seasonSnaps.forEach((snap, i) => { plainWins += playSeason(snap, SEASON_SEEDS[i]).teams[TEAM].wins; });
  const wins = [];
  for (let level = 1; level <= 10; level++) {
    const desk = deskWith(withPost(atLevel(level), 'medical', 1));
    let w = 0;
    seasonSnaps.forEach((snap, i) => { w += playSeason(snap, SEASON_SEEDS[i], lg => D.nbaDeskRoundOptions(desk, lg, TEAM)).teams[TEAM].wins; });
    wins.push(w);
  }
  if (wins[0] !== plainWins) fail(`through simRound a level 1 staff moves the season: ${wins[0]} wins against ${plainWins} with no desk`);
  for (let i = 1; i < wins.length; i++) {
    if (!(wins[i] > wins[i - 1])) fail(`through simRound, level ${i} to ${i + 1}: the user's wins over ${SEASON_SEEDS.length} seasons did not rise (${wins[i - 1]} to ${wins[i]})`);
  }
  console.log(`   through simRound: your wins over ${SEASON_SEEDS.length} seasons ${wins.join(', ')} at levels 1 to 10 (${plainWins} with no desk)`);

  const injSnap = snapOf(81);
  /* The trainer's hash reads the man's id, and ids carry a per process
     epoch, so the rolls differ run to run: 1000 rounds gave a first step of
     only 5 announced rounds, so the walk is four times that. One league a
     level, everybody back to fit before each round, so every level plays the
     same rounds on the same draws. */
  const INJ_SAMPLES = 4000;
  const outs = [];
  let injuries = 0;
  for (let level = 1; level <= 10; level++) {
    const desk = deskWith(withPost(atLevel(1), 'medical', level));
    const lg = JSON.parse(injSnap);
    /* Every round booked with no games: simRound still rolls every man's
       injury and asks the trainer, and four thousand rounds of games (most
       of the cost, and nothing the trainer touches) are skipped. */
    delete lg.stats;
    lg.schedule = Array.from({ length: E.NBA_ROUNDS }, () => []);
    let rounds = 0, n = 0;
    for (let k = 0; k < INJ_SAMPLES; k++) {
      for (const t of Object.values(lg.teams)) for (const p of t.players) p.out = 0;
      lg.round = 1 + (k % E.NBA_ROUNDS);
      const rep = E.simRound(lg, TEAM, mulberry32(7000 + k), D.nbaDeskRoundOptions(desk, lg, TEAM));
      for (const note of rep.notes) {
        const m = /is out (\d+) round/.exec(note);
        if (m) { rounds += Number(m[1]); n++; }
      }
    }
    outs.push(rounds);
    if (level === 1) injuries = n;
  }
  if (injuries < 700) fail(`only ${injuries} injuries to the user's men in ${INJ_SAMPLES} rounds, too few to read the trainer`);
  for (let i = 1; i < outs.length; i++) {
    if (!(outs[i] < outs[i - 1])) fail(`through simRound, trainer level ${i} to ${i + 1}: the announced rounds out over ${injuries} injuries did not fall (${outs[i - 1]} to ${outs[i]})`);
  }
  console.log(`   through simRound: ${injuries} injuries to your men announced ${outs.join(', ')} rounds out at trainer levels 1 to 10`);

  const post = JSON.parse(J(playSeason(snapOf(91), 91)));
  const PO_SAMPLES = 2000;
  const mineIn = s => (s.home === TEAM ? s.homeWins : s.away === TEAM ? s.awayWins : 0);
  const poWins = [];
  for (let level = 1; level <= 10; level++) {
    const desk = deskWith(withPost(atLevel(level), 'medical', 1));
    const edges = D.nbaDeskEdges(desk, post, TEAM);
    let w = 0;
    for (let k = 0; k < PO_SAMPLES; k++) w += E.runNbaPlayoffs(post, mulberry32(9000 + k), edges).series.reduce((s, x) => s + mineIn(x), 0);
    poWins.push(w);
  }
  if (poWins[0] === 0) fail('the user\'s club won no playoff game at level 1, so the playoff walk reads nothing');
  for (let i = 1; i < poWins.length; i++) {
    if (!(poWins[i] > poWins[i - 1])) fail(`through runNbaPlayoffs, level ${i} to ${i + 1}: the user's playoff wins over ${PO_SAMPLES} runs did not rise (${poWins[i - 1]} to ${poWins[i]})`);
  }
  console.log(`   through runNbaPlayoffs: your playoff wins over ${PO_SAMPLES} runs ${poWins.join(', ')} at levels 1 to 10`);
}
{
  /* The other clubs never feel the user's staff, and the development coach
     reaches the engine's own summer: at level 1 the summer is the engine's
     exactly, at level 10 his young men gain more, and every other club's
     summer is untouched (the hook draws nothing). */
  const opts = D.nbaDeskRoundOptions(G.withGmBlock(D.openNbaDesk(L5, TEAM), D.NBA_DESK_KEYS.staff, { block: atLevel(10), purse: 9 }), L5, TEAM);
  if (Object.keys(opts.edges).join() !== TEAM) fail(`the desk hands an edge to ${J(Object.keys(opts.edges))}`);
  if (opts.injuryRounds('NYK', { id: 'x' }, 3) !== 3) fail('the user trainer shortened a rival injury');
  let gain1 = 0, gain10 = 0, seeds = 0;
  for (const seed of [61, 62, 63, 64, 65]) {
    const lg = E.initNbaLeague(mulberry32(seed), NBA_OPENING_RATINGS);
    for (const p of lg.teams[TEAM].players) { p.age = 21; p.pot = Math.min(99, p.ovr + 12); }
    const before = new Map(lg.teams[TEAM].players.map(p => [p.id, p.ovr]));
    const run = (fn) => { const c = JSON.parse(J(lg)); fn(c, mulberry32(seed * 7)); return c; };
    const plain = run((c, r) => E.nbaOffseason(c, r, TEAM));
    const one = run((c, r) => D.nbaDeskHost(atLevel(1), TEAM, lg.season).runOffseason(c, r, TEAM));
    const ten = run((c, r) => D.nbaDeskHost(atLevel(10), TEAM, lg.season).runOffseason(c, r, TEAM));
    /* The summer mints ids for the men it hands short clubs, and each of the
       three runs takes the next ones off the counter, so ids are compared out. */
    const noIds = v => J(v).replace(/"n[0-9a-z]+-\d+"/g, '"n"');
    if (noIds(one) !== noIds(plain)) fail(`seed ${seed}: a level 1 development coach changed the engine's summer`);
    const others = c => noIds(Object.fromEntries(Object.entries(c.teams).filter(([k]) => k !== TEAM)));
    if (others(ten) !== others(plain)) fail(`seed ${seed}: the user's development coach changed another club's summer`);
    const gain = c => c.teams[TEAM].players.reduce((s, p) => s + (before.has(p.id) ? p.ovr - before.get(p.id) : 0), 0);
    gain1 += gain(one); gain10 += gain(ten); seeds++;
  }
  if (!(gain10 > gain1)) fail(`a level 10 development coach did not add growth in the engine's summer: ${gain1} rating points at level 1, ${gain10} at 10 over ${seeds} leagues`);
  console.log(`   summer growth of your young men over ${seeds} leagues: ${gain1} rating points at level 1, ${gain10} at level 10`);
}
console.log(`   a level 6 head coach alone adds ${D.nbaStaffEdge({ ...atLevel(1), hc: { ...base.hc, level: 6, potential: Math.max(6, base.hc.potential) } }).toFixed(2)} team strength (the page's worked example says +0.83)`);
console.log(`   edge ${ladder[0].edge.toFixed(2)} to ${ladder[9].edge.toFixed(2)}, win ${ladder[0].win.toFixed(3)} to ${ladder[9].win.toFixed(3)}, miss ${ladder[0].miss.toFixed(2)} to ${ladder[9].miss.toFixed(2)}, rounds out ${ladder[0].out.toFixed(2)} to ${ladder[9].out.toFixed(2)}, summer step ${ladder[0].grow.toFixed(3)} to ${ladder[9].grow.toFixed(3)}`);
{
  /* The page's worked example names a number: hold it to the code. */
  const hc6 = D.nbaStaffEdge({ ...atLevel(1), hc: { ...base.hc, level: 6, potential: Math.max(6, base.hc.potential) } });
  const page = lf(fs.readFileSync(path.join(ROOT, 'src', 'pages', 'NbaFrontOffice.tsx'), 'utf8'));
  if (!page.includes(`level 6 head coach for +${hc6.toFixed(2)} team strength`)) fail(`the page's worked example does not say what a level 6 head coach adds (+${hc6.toFixed(2)})`);
}
{
  /* Day one: only the user's club has a desk, so the staff a club opens with
     must be worth nothing over the engine, or a big club wins for free (the
     closing check measured Boston at 5 titles in 40 seeds with no desk and
     19 with a desk opened on day one and nobody hired). For every club, a
     desk opened on a new franchise with nobody hired plays the regular
     season and the playoffs exactly as no desk. The edge is what he hires. */
  let same = 0, clubs = 0, edgeSum = 0;
  for (const seed of [1, 2, 3]) {
    const start = E.initNbaLeague(mulberry32(5000 + seed), NBA_OPENING_RATINGS);
    for (const abbr of Object.keys(start.teams).sort()) {
      const play = withDesk => {
        const lg = JSON.parse(J(start));
        const rng = mulberry32(6000 + seed);
        let desk = withDesk ? D.openNbaDesk(lg, abbr) : null;
        if (desk) edgeSum += D.nbaStaffEdge(D.nbaStaffOf(desk, lg, abbr).block);
        E.nbaTipOff(lg, rng, abbr);
        for (;;) {
          E.simRound(lg, abbr, rng, desk ? D.nbaDeskRoundOptions(desk, lg, abbr) : undefined);
          if (desk) desk = D.nbaDeskAfterRound(desk, lg, abbr).desk;
          if (lg.round >= E.NBA_ROUNDS) break;
          lg.round += 1;
        }
        const po = E.runNbaPlayoffs(lg, rng, desk ? D.nbaDeskEdges(desk, lg, abbr) : undefined);
        /* Tip off mints ids off one counter for the whole process, so the
           second play's men carry later numbers: ids are compared out,
           including inside the season stat keys (club|id). */
        return `${J(lg).replace(/n[0-9a-z]{6,}-\d+/g, 'n')}|${po.champion}|${J(po.series.map(s => s.winner))}`;
      };
      clubs++;
      if (play(false) === play(true)) same++;
      else fail(`seed ${seed}: ${abbr} opened the desk on day one, hired nobody, and the season played differently from no desk`);
    }
  }
  console.log(`   day one: ${same} of ${clubs} clubs opening the desk on a new franchise and hiring nobody played the season exactly as no desk (total opening edge ${edgeSum.toFixed(2)})`);
}

/* ================================================================== */
begin('6', 'migration keeps every marker, a corrupt block resets alone, a package is held to the engine salary rule and the apron');
{
  const lg = E.initNbaLeague(mulberry32(6), NBA_OPENING_RATINGS);
  lg.teams.NYK.picks = [1]; lg.teams.MIA.picks = [1, 2, 2]; lg.teams.CHI.picks = [];
  const desk = D.openNbaDesk(lg, TEAM);
  const ledger = D.nbaPicksOf(desk, lg);
  let markers = 0;
  for (const [abbr, t] of Object.entries(lg.teams)) {
    markers += t.picks.length;
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    if (J(held) !== J([...t.picks].sort((a, b) => a - b))) fail(`migration: ${abbr} held ${J(t.picks)} and the ledger gives it ${J(held)}`);
  }
  if (P.picksHeldBy(ledger, TEAM).length === 0 || markers !== ledger.picks.filter(p => p.year === lg.season).length) fail(`migration: ${markers} markers on the old lists, ${ledger.picks.filter(p => p.year === lg.season).length} picks this year in the ledger`);
  const broken = G.withGmBlock(desk, D.NBA_DESK_KEYS.picks, { v: 7 });
  if (D.nbaContractsOf(broken, lg, TEAM) !== desk.blocks.contracts) fail('a corrupt picks block took the contracts block with it');
  if (D.nbaStaffOf(broken, lg, TEAM) !== desk.blocks.staff) fail('a corrupt picks block took the staff block with it');
  if (!P.validateLedger(D.nbaPicksOf(broken, lg), Object.keys(lg.teams), D.nbaGamePickRules())) fail('a corrupt picks block did not come back as a sound fresh one');
  const badStaff = G.withGmBlock(desk, D.NBA_DESK_KEYS.staff, { block: 'x', purse: -1 });
  if (!D.isNbaStaffState(D.nbaStaffOf(badStaff, lg, TEAM))) fail('a corrupt staff block did not come back as a sound fresh one');
  if (D.nbaContractsOf(badStaff, lg, TEAM) !== desk.blocks.contracts) fail('a corrupt staff block took the contracts block with it');

  /* The package rule is the engine's nbaSalaryFits for one man each way, the
     apron branch included: two clubs are pushed over the first apron. */
  if (lg.taxScale == null) fail('a new league has no tax scale, so the apron branch cannot be read');
  const apron = E.nbaFirstApron(lg.cap, lg.taxScale ?? 1);
  for (const k of ['LAL', 'GSW']) {
    const t = lg.teams[k];
    const f = (apron + 8) / E.nbaCapUsed(t);
    for (const p of t.players) p.salary = Math.round(p.salary * f * 10) / 10;
  }
  let compared = 0, apronCases = 0, disagree = 0;
  const abbrs = Object.keys(lg.teams).sort();
  abbrs.forEach((recv, i) => {
    const t = lg.teams[recv], other = lg.teams[abbrs[(i + 1) % abbrs.length]];
    for (const out of t.players.slice(0, 5)) for (const inc of other.players.slice(0, 5)) {
      compared++;
      if (E.nbaCapUsed(t) - out.salary + inc.salary > apron) apronCases++;
      const a = E.nbaSalaryFits(t, out, inc, lg.cap, lg.taxScale);
      const b = D.nbaPileFits(lg, recv, out.salary, inc.salary);
      if (a !== b && ++disagree <= 3) fail(`${recv} sending ${out.salary} for ${inc.salary}: the engine says ${a}, the package rule says ${b}`);
    }
  });
  if (apronCases < 10) fail(`only ${apronCases} pairs over the first apron, so the apron branch was barely read`);
  /* Over the first apron a package must send out at least what it takes back. */
  const lal = lg.teams.LAL, sas = lg.teams.SAS;
  const cheap = [...lal.players].sort((a, b) => a.salary - b.salary)[0];
  const dear = [...sas.players].sort((a, b) => b.salary - a.salary).find(p => p.salary > cheap.salary);
  const said = dear ? D.nbaPackageCapCheck(lg, { from: 'LAL', to: 'SAS', give: [{ kind: 'player', id: cheap.id }], get: [{ kind: 'player', id: dear.id }] }) : null;
  if (!said || !said.includes('apron')) fail(`a club over the first apron took back ${dear?.salary} for ${cheap.salary} and the package rule said ${J(said)}`);
  console.log(`   ${markers} markers migrated; ${compared} one for one pairs agree with nbaSalaryFits (${apronCases} over the first apron)`);
}

/* ================================================================== */
begin('7', 'every desk panel draws, and the re-sign desk shows a tile for every expiring man');
{
  const { NBA_DESK_PANELS, NBA_RECAP_PANELS, GmDeskMount, render } = M;
  const rng = mulberry32(77);
  const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
  let desk = D.openNbaDesk(lg, TEAM);
  /* One season on, so somebody's deal is running out. */
  desk = seasonDesk(lg, TEAM, desk, rng, 0, 'render walk');
  const facts = { teamId: TEAM, teamLabel: TEAM, seasonsPlayed: 1, phase: 'hub', hub: {}, league: lg, seasonOver: false, deskOn: true, clubName: x => x, say: () => {}, commit: () => {} };
  const props = { sport: { key: 'nba' }, desk, facts, onDesk: () => {}, onBack: () => {} };
  const marks = { staff: 'data-nba-desk-staff', contracts: 'data-resign-desk', picks: 'data-gm-picks', deals: 'data-nba-desk-deals' };
  for (const p of NBA_DESK_PANELS) {
    let html = '';
    try { html = render(p.Panel, props); } catch (e) { fail(`the ${p.key} panel threw: ${String(e).slice(0, 160)}`); continue; }
    if (!html.includes(marks[p.key])) fail(`the ${p.key} panel drew without its ${marks[p.key]} mark`);
  }
  const cases = C.deskCases(HOST, lg, D.nbaContractsOf(desk, lg, TEAM)).length;
  const html = render(NBA_DESK_PANELS.find(p => p.key === 'contracts').Panel, props);
  const tiles = (html.match(/data-resign-tile=/g) ?? []).length;
  if (cases === 0) fail('nobody is expiring a season in, so the re-sign tiles were not drawn at all');
  if (tiles !== cases) fail(`${cases} expiring men and ${tiles} tiles on the re-sign desk`);
  const hub = render(GmDeskMount, { sport: 'nba', desk, facts, panels: NBA_DESK_PANELS, open: null, onOpen: () => {}, onDesk: () => {} });
  if ((hub.match(/<button/g) ?? []).length < NBA_DESK_PANELS.length) fail(`the hub drew ${(hub.match(/<button/g) ?? []).length} desk boxes for ${NBA_DESK_PANELS.length} panels`);
  if (NBA_RECAP_PANELS.length !== 1 || NBA_RECAP_PANELS[0].key !== 'contracts') fail('the recap mounts more than the re-sign desk');
  /* The deal box past the deadline: shut with the desk on; on a save without it the phone still deals, so it must not say shut. */
  const deals = NBA_DESK_PANELS.find(p => p.key === 'deals');
  const late = { ...facts, league: { ...lg, round: 15 } };
  if (deals.tile({ desk, facts: late }).value !== 'Deadline passed') fail(`with the desk on, the deal box at round 15 reads ${J(deals.tile({ desk, facts: late }).value)}`);
  if (deals.tile({ desk, facts: { ...late, deskOn: false } }).value === 'Deadline passed') fail('a save without the desk reads Deadline passed while its phone and trade finder still deal');
  /* Without the desk no staff works and the summer still decides: the staff
     and re-sign boxes must not claim an edge or men waiting on the GM. */
  const staffBox = NBA_DESK_PANELS.find(p => p.key === 'staff').tile({ desk, facts: { ...facts, deskOn: false } });
  if (/team strength|jobs filled/.test(`${staffBox.value} ${staffBox.sub}`)) fail(`a save without the desk shows a working staff: ${J(staffBox)}`);
  if (!/team strength/.test(NBA_DESK_PANELS.find(p => p.key === 'staff').tile({ desk, facts }).sub)) fail('with the desk on, the staff box no longer shows its edge');
  const resignBox = NBA_DESK_PANELS.find(p => p.key === 'contracts').tile({ desk, facts: { ...facts, deskOn: false } });
  if (/waiting on you|Every call is made/.test(resignBox.sub)) fail(`a save without the desk says ${J(resignBox.sub)} while the summer still decides`);
  console.log(`   4 panels drawn, ${tiles} re-sign tiles for ${cases} expiring men`);
}

/* ================================================================== */
const failed = [...failedIn.values()].reduce((s, n) => s + n, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const red = [...failedIn.keys()];
  console.log(`control ${CONTROL}: red in ${J(red)}, wanted ${want}`);
  if (!red.includes(want)) { console.error(`simNbaGmDesk: CONTROL ${CONTROL} DID NOT FIRE in check ${want}`); process.exit(1); }
  console.log(`simNbaGmDesk: control ${CONTROL} fired (${failed} failures, as it should)`);
  process.exit(0);
}
if (failed) { console.error(`simNbaGmDesk: ${failed} failure(s) in ${J([...failedIn.keys()])}`); process.exit(1); }
console.log(`simNbaGmDesk: all seven checks passed (${SEEDS.length} seeds x ${SEASONS} seasons)`);
