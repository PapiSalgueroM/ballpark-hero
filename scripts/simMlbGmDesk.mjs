/* Round 1020: the MLB Front Office on the GM desk (src/lib/mlbGmDesk.ts).
 *
 * The second bind of the shared GM modules, on the shape of simNhlGmDesk
 * (Round 987). This harness drives the MLB engine and the desk exactly the
 * way the board calls them (MlbFrontOfficeBoard.tsx), with seeded draws, and
 * checks:
 *   1  a save from before the desk plays to the identical league, season
 *      after season, as the engine did before this round (a fixture recorded
 *      from the pre-round engine), and opening the desk changes nothing in
 *      the league it opens on
 *   2  over ten seeded seasons, every user man whose deal runs out has a
 *      recorded decision, and what happened to him is what it says: a kept
 *      man is still here (or retired), a man let go is gone; a man drafted
 *      with the desk on comes up after exactly three seasons, arbitration
 *      eligible (MLB_ARBITRATION_AFTER), and is a free agent from six
 *   3  no trade lands after the deadline, and deals do land before it; the
 *      window shuts once round 19 is played (what the guide says), the older
 *      trade paths' refusal (mlbDeadlineRefusal) agrees with it every round,
 *      each of the board's four old trade handlers asks it first, and with
 *      the desk on the old paths put no pick in a deal; the buyer and seller
 *      split is drawn at the engine's own October field (six a league, what
 *      mlbLeagueSeeds seeds), checked at every deadline of the walk
 *   4  picks are conserved league wide: every club's own pick in every round
 *      of the draft carried exists exactly once and is still its own
 *      (ordinary MLB picks cannot be traded and this game awards no
 *      Competitive Balance pick: every package carrying one is refused by
 *      the pick rule), every extra pick is one a turned down qualifying offer
 *      paid, and every engine list is the ledger's
 *   5  the staff's effects change their consumer at every level step: the
 *      win probability, the scouting miss, the rounds an injury costs, the
 *      winter growth of a young man, for the whole staff and for each post on
 *      its own, each edge post reaching the strength by exactly its weight;
 *      and the desk's winter really hands the farm director to the engine
 *   6  migration keeps every marker, a corrupt block resets alone, cash in a
 *      deal keeps its figure while the deal runs and the limits hold (half a
 *      salary, three deals a club, twice a contract)
 *   7  every desk panel draws (server rendered), and the re-sign desk draws a
 *      tile for every expiring man; the deal box says shut only with the desk on
 * Negative controls (SIM_MLB_GM_DESK_CONTROL), each must go red in its check:
 *   coinflip      the winter runs the engine's own offseason, coin flip and all (2)
 *   latetrade     the package clock never moves, so deals pass the deadline   (3)
 *   refusaldrift  the old trade paths count the clock a round behind         (3)
 *   noguard       the trade finder's accept skips the deadline               (3)
 *   droppick      a package deal drops a pick from the stored ledger         (4)
 *   pickmoves     ordinary MLB picks made tradable                           (4)
 *   nocomp        the extra pick a turned down qualifying offer earns is not awarded (4)
 *   flatstaff     the staff edge is always nothing                           (5)
 *   onepost       the pitching key misspelt, so that post does nothing       (5)
 *   nofarm        the desk's winter hands the engine no farm director        (5)
 *   nodefault     the engine's win probability reads an edge by default      (1)
 *   retaintwice   cash deals counted by club, not by contract                (6)
 *   spots5        buyers and sellers split at five places, not October's six (3)
 * Recording the fixture: SIM_MLB_GM_DESK_RECORD=<git ref of the engine before
 * this round> rewrites scripts/data/mlbGmDeskFixture.json from that engine.
 *
 * MEASURED 2026-10-05 on three seed sets of ten (1..10, 11..20, 21..30), ten
 * seasons a seed, totals per set:
 *   expiring men decided   1088 / 1078 / 1093   (by the GM 568 / 565 / 572, by the staff's rule 520 / 513 / 521)
 *   tendered under control 415 / 418 / 412      qualifying offers taken 163 / 153 / 156, turned down 79 / 86 / 83
 *   draftees come up       165 / 166 / 164, every one after exactly three seasons; free agents at six 85 / 86 / 84
 *   deals before deadline  472 / 445 / 442      tries after it 800 each, landed 0; refusal agreed 2700 rounds each
 *   packages with a pick   400 each, every one refused by the pick rule; with cash 49 / 50 / 51
 *   extra picks paid       63 / 69 / 69 (a turned down qualifying offer whose man signed elsewhere)
 *   staff ladder (fixed)   edge 0 to 3.00 strength, win .495 to .564, scouting miss 2.24 to 0.57,
 *                          a three round IL stint 3.00 to 2.25 rounds, a young man's winter 2.000 to
 *                          2.208 points; alone, the manager takes the win .495 to .513, the pitching
 *                          coach to .519, the hitting coach to .524; through the desk's own winter 60
 *                          young men grow 131 points under a level 1 farm and 143 under a level 10 one
 * Every floor in T sits near 70 percent of the lowest set. Every control was
 * run on seeds 1..10 and fired in its own check, failures counted: coinflip
 * 142 in 2 (and 4: no qualifying offer, no extra pick), latetrade 800 in 3,
 * refusaldrift 100 in 3, droppick 1617 in 4, pickmoves 154 in 4, nocomp 145
 * in 4, flatstaff 63 in 5, onepost 27 in 5, nofarm 1 in 5, nodefault 2 in 1
 * (and 5: a level 1 staff moves the game), retaintwice 1 in 6, noguard 1 in 3.
 * Review rerun 2026-10-05 on seeds 1..10 after the copy fixes: the same counts
 * for all twelve, and spots5 200 in 3 (every deadline of the walk, both
 * leagues); the walk itself measured 1560 buyer and 746 seller places.
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
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'mlbGmDeskFixture.json');

const CONTROL = process.env.SIM_MLB_GM_DESK_CONTROL || '';
const RECORD = process.env.SIM_MLB_GM_DESK_RECORD || '';
const CONTROLS = {
  coinflip: '2', latetrade: '3', refusaldrift: '3', noguard: '3', droppick: '4', pickmoves: '4', nocomp: '4',
  flatstaff: '5', onepost: '5', nofarm: '5', nodefault: '1', retaintwice: '6', spots5: '3',
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_MLB_GM_DESK_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const SEEDS = (process.env.SIM_MLB_GM_DESK_SEEDS || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const SEASONS = Number(process.env.SIM_MLB_GM_DESK_SEASONS || 10);

/* Floors: the measured size of each walk, see MEASURED in the header. */
const T = {
  minDecisions: 755, minGm: 395, minAuto: 359, minEarlyDeals: 309, minLateTries: 560, minPickTries: 280, minRetained: 34,
  minDrafteesUp: 115, minDrafteesFree: 59, minArbTenders: 288, minQualify: 167, minCompPaid: 44,
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
  desk: path.join(ROOT, 'src', 'lib', 'mlbGmDesk.ts'),
  engine: path.join(ROOT, 'src', 'lib', 'mlbFrontOffice.ts'),
  board: path.join(ROOT, 'src', 'components', 'mlb-front-office', 'MlbFrontOfficeBoard.tsx'),
};
const EDITS = {
  coinflip: ['desk', '  const run = runDeskOffseason(host, league, ledger, rng);',
    '  const run = { ok: true as const, engine: host.runOffseason(league, rng, team), applied: [] as GmDecision[], picksAdded: [] as number[] };'],
  latetrade: ['desk', 'periodsPlayed: mlbPeriodsPlayed(league), seasonClosed: false },', 'periodsPlayed: 0, seasonClosed: false },'],
  /* The older trade paths' refusal counts the clock one round behind the window. */
  refusaldrift: ['desk', '  return mlbTradeWindow(league).reason;',
    '  return tradeWindow(MLB_DEADLINE, MLB_ROUNDS, Math.max(0, league.round - 2), false).reason;'],
  /* The trade finder's accept skips the deadline. */
  noguard: ['board', '    if (!league || !myTradePiece || deadlineBlock()) return;\n    const lg: MlbLeague = JSON.parse(JSON.stringify(league));\n    const res = (gm ? mlbDeskFinderTrade : mlbTrade)(',
    '    if (!league || !myTradePiece) return;\n    const lg: MlbLeague = JSON.parse(JSON.stringify(league));\n    const res = (gm ? mlbDeskFinderTrade : mlbTrade)('],
  /* A package deal stores a ledger one pick short. */
  droppick: ['desk', '  let next = withGmBlock(desk, MLB_DESK_KEYS.picks, out.ledger);',
    '  let next = withGmBlock(desk, MLB_DESK_KEYS.picks, { v: 1 as const, picks: out.ledger.picks.slice(1) });'],
  /* Ordinary MLB picks made tradable, against the league's rule. */
  pickmoves: ['desk', '    ...MLB_PICK_RULES,\n    rounds: 2,', "    ...MLB_PICK_RULES,\n    tradableKinds: ['std', 'cb'],\n    rounds: 2,"],
  /* The extra pick a turned down qualifying offer earns is never put in the ledger. */
  nocomp: ['desk', "  for (const round of compPicks) picks = awardPick(picks, league.season, round, team, 'comp');",
    "  for (const round of compPicks) picks = round < 0 ? awardPick(picks, league.season, round, team, 'comp') : picks;"],
  flatstaff: ['desk', '  const e = (key: string) => gmStaffEffect(MLB_STAFF_PACK, block, key);', '  const e = (key: string) => 0 * gmStaffEffect(MLB_STAFF_PACK, block, key);'],
  /* One post's effect key misspelt: gmStaffEffect reads an unknown key as nothing. */
  onepost: ['desk', "e('pitchEdge') * MLB_PITCHING_WEIGHT;", "e('pitchingEdge') * MLB_PITCHING_WEIGHT;"],
  /* The desk's winter runs the engine without the farm director. */
  nofarm: ['desk', '    runOffseason: (lg, r, t) => mlbOffseason(lg, r, t, mlbDeskOffseasonOptions(staffBefore.block, team, closed)),',
    '    runOffseason: (lg, r, t) => mlbOffseason(lg, r, t),'],
  nodefault: ['engine', 'export function mlbWinProb(a: MlbGmTeam, b: MlbGmTeam, edgeA = 0, edgeB = 0): number {',
    'export function mlbWinProb(a: MlbGmTeam, b: MlbGmTeam, edgeA = 0.01, edgeB = 0): number {'],
  /* The desk counts cash deals by club instead of by contract. */
  retaintwice: ['desk', '    timesRetained: id => retained.filter(r => r.playerId === id).length,', '    timesRetained: id => retained.filter(r => r.club === id).length,'],
  /* The buyer and seller split drawn at five places a league, not October's six. */
  spots5: ['desk', 'export const MLB_PLAYOFF_SPOTS = 6;', 'export const MLB_PLAYOFF_SPOTS = 5;'],
};
const overrides = new Map();
if (CONTROL) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape SIM_MLB_GM_DESK_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (src.split(from).length !== 2) { console.error(`control cannot run: the line ${CONTROL} rewrites is there more than once`); process.exit(2); }
  const out = src.replace(from, to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${CONTROLS[CONTROL]} must go red`);
}
if (RECORD) {
  const old = execFileSync('git', ['show', `${RECORD}:src/lib/mlbFrontOffice.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  overrides.set(path.resolve(FILES.engine).toLowerCase(), old);
  console.log(`RECORDING the fixture from the engine at ${RECORD}`);
}

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simMlbGmDesk-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as E from '${ROOT_URL}/src/lib/mlbFrontOffice.ts';
export * as D from '${ROOT_URL}/src/lib/mlbGmDesk.ts';
export * as C from '${ROOT_URL}/src/lib/gmContracts.ts';
export * as P from '${ROOT_URL}/src/lib/gmPicks.ts';
export * as S from '${ROOT_URL}/src/lib/gmStaff.ts';
export * as G from '${ROOT_URL}/src/lib/gmDesk.ts';
export { MLB_STAFF_PACK } from '${ROOT_URL}/src/data/gmStaff/packs.ts';
export { mlbContractHost } from '${ROOT_URL}/src/lib/gmContractsHostMlb.ts';
export { MLB_ARBITRATION_AFTER, MLB_FREE_AGENCY_AFTER } from '${ROOT_URL}/src/lib/gmContractRules.ts';
export { leagueNames } from '${ROOT_URL}/src/lib/foNames.ts';
export { MLB_DESK_PANELS, MLB_RECAP_PANELS, MlbDeskHelp } from '${ROOT_URL}/src/components/mlb-front-office/MlbGmDesk.tsx';
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
const { E, D, C, P, S, G, MLB_STAFF_PACK, mlbContractHost: HOST, leagueNames, MLB_ARBITRATION_AFTER, MLB_FREE_AGENCY_AFTER } = M;

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
const leagueHash = lg => crypto.createHash('sha1').update(J(lg).replace(/"m[0-9a-z]+-(\d+)"/g, '"m-$1"')).digest('hex');
const TEAM = 'BOS';

/** Every man the user drafted with the desk on: the season of his draft. */
const draftedIn = new Map();

/** Draft night as the board runs it: the user takes the best grade he sees, the CPU clubs go in batches. */
function draftNight(lg, team, rng, desk) {
  const mine = lg.teams[team];
  const count = E.mlbDraftCapital(mine) ?? 0;
  let cls = E.mlbDraftClass(rng, Math.max(24, count + 10), leagueNames(lg));
  const level = desk ? S.gmStaffLevel(D.mlbStaffOf(desk, lg, team).block, 'scouting') : 1;
  const grade = pr => (desk ? D.mlbScoutRead(pr, team, lg.season, level) : pr.grade);
  let left = 2;
  let picksLeft = count;
  const aiBatch = () => {
    const order = E.mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team);
    cls = E.mlbAiDraftPicks(lg, cls, order, rng).remaining;
    left -= 1;
  };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = [...cls].sort((a, b) => grade(b) - grade(a))[0];
    const round = mine.picks[0];
    if (!E.mlbConsumeDraftPick(mine)) break;
    const p = E.mlbProspectToPlayer(pr, rng);
    mine.players.push(p);
    if (desk) { draftedIn.set(p.id, lg.season); desk = D.mlbNoteArrivals(desk, lg, team, [p.id], 'draft', round); }
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, E.mlbDraftCapital(mine) ?? 0);
    const batches = nextPicks <= 0 ? left : Math.min(1, left);
    for (let i = 0; i < batches; i++) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
  return desk;
}

const byValue = arr => [...arr].sort((a, b) => E.mlbTradeValue(a) - E.mlbTradeValue(b) || a.id.localeCompare(b.id));

/** The board holds Play until a club the draft took past 28 has designated down: the GM lets the weakest go. */
function cutToMax(lg, team) {
  const mine = lg.teams[team];
  while (E.mlbOverLimit(mine) > 0) {
    const down = byValue(mine.players)[0];
    if (!E.mlbRelease(mine, lg.freeAgents, down.id)) break;
  }
}

/** A season with the desk off: the exact calls the board makes on a save from before the desk. */
function seasonOff(lg, team, rng) {
  for (;;) {
    E.simMlbRound(lg, team, rng);
    E.mlbAiMoves(lg, team, rng);
    if (lg.round >= E.MLB_ROUNDS) break;
    lg.round += 1;
  }
  const po = E.runMlbPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  draftNight(lg, team, rng, null);
  E.mlbOffseason(lg, rng, team);
  cutToMax(lg, team);
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
  const lg = E.initMlbLeague(rng);
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
  const lg = E.initMlbLeague(rng);
  for (let r = 0; r < 7; r++) { E.simMlbRound(lg, TEAM, rng); E.mlbAiMoves(lg, TEAM, rng); lg.round += 1; }
  const before = J(lg);
  const desk = D.openMlbDesk(lg, TEAM);
  if (J(lg) !== before) fail('openMlbDesk changed the league it opened on');
  if (!desk || desk.v !== 1 || !['contracts', 'picks', 'staff', 'retained'].every(k => k in desk.blocks)) fail(`the opened desk is missing a block: ${J(Object.keys(desk?.blocks ?? {}))}`);
  /* And the engine's hooks, handed nothing, are the engine before them: a desk of level 1 men hands a zero edge. */
  const a = lg.teams[TEAM], b = lg.teams.NYY;
  if (E.mlbWinProb(a, b) !== E.mlbWinProb(a, b, 0, 0)) fail('mlbWinProb with no edges is not mlbWinProb with zero edges');
}
console.log(`   ${idCompared} seasons replayed against ${fixture.recordedFrom}`);

/* ================================================================== */
/* Sections 2, 3 and 4 share one walk: ten seasons a seed with the desk on. */
const stats = {
  decisions: 0, gm: 0, auto: 0, earlyDeals: 0, lateTries: 0, lateDeals: 0, retained: 0, pickTries: 0, pickRefused: 0,
  pickChecks: 0, applyChecks: 0, buyers: 0, sellers: 0, refusalChecks: 0, fieldChecks: 0,
  drafteesUp: 0, drafteesFree: 0, arbTenders: 0, qualifyAccepted: 0, qualifyRejected: 0, compPaid: 0,
};
const problems = { s2: [], s3: [], s4: [] };
const ids = lg => Object.keys(lg.teams);
const rules = () => D.mlbGamePickRules();
/** Extra picks the desk has awarded and not yet seen spent, by holder: the only picks that are not a club's own grid. */
let compOwed = 0;

/** Every club's own pick in every round of the draft carried exists exactly once and is still its own, and every engine list is the ledger's. */
function checkPicks(lg, desk, where) {
  stats.pickChecks++;
  /* The block as stored, not as read: a reader that fails closed would hand
     back a fresh ledger and hide the very loss this check is for. */
  const ledger = desk.blocks[D.MLB_DESK_KEYS.picks];
  if (!P.validateLedger(ledger, ids(lg), rules())) { problems.s4.push(`${where}: the stored pick ledger does not validate`); return; }
  for (const p of P.ledgerProblems(ledger, ids(lg), lg.season, rules())) problems.s4.push(`${where}: ${p}`);
  for (const p of ledger.picks) {
    if (p.holder !== p.orig) problems.s4.push(`${where}: ${P.pickKey(p)} belongs to ${p.orig} and is held by ${p.holder}, but ordinary MLB picks cannot be traded`);
    if (P.pickKind(p) === 'comp' && p.orig !== TEAM) problems.s4.push(`${where}: ${P.pickKey(p)} is an extra pick for a club the desk does not run`);
  }
  const comps = ledger.picks.filter(p => P.pickKind(p) === 'comp').length;
  if (comps !== compOwed) problems.s4.push(`${where}: ${comps} extra picks in the ledger, ${compOwed} paid by turned down qualifying offers`);
  for (const [abbr, t] of Object.entries(lg.teams)) {
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    const list = [...t.picks].sort((a, b) => a - b);
    if (J(held) !== J(list)) problems.s4.push(`${where}: ${abbr} engine list ${J(list)} but the ledger says ${J(held)}`);
  }
}

/** One package a round, before the round is played, the way a GM on the hub would: alternately a man for their
    man and two men for their man. Every fourth round he tries to put his own pick in too, which MLB refuses.
    Round 3 sends half a salary in cash with the man. */
function tryDeal(lg, team, desk, s, where) {
  const r = lg.round;
  const others = ids(lg).filter(k => k !== team).sort();
  const partner = others[(s * 7 + r * 3) % others.length];
  const me = lg.teams[team], them = lg.teams[partner];
  const ledger = D.mlbPicksOf(desk, lg);
  const myPick = P.picksHeldBy(ledger, team).filter(p => p.round === 2).pop();
  const withPick = r % 4 === 0 && !!myPick;
  const pkg = r % 2 === 1
    ? { from: team, to: partner, give: [{ kind: 'player', id: byValue(me.players)[0].id }], get: [{ kind: 'player', id: byValue(them.players)[0].id }] }
    : { from: team, to: partner, give: byValue(me.players).slice(0, 2).map(p => ({ kind: 'player', id: p.id })), get: [{ kind: 'player', id: byValue(them.players)[0].id }] };
  if (withPick) pkg.give.push({ kind: 'pick', key: P.pickKey(myPick) });
  if (r === 3) pkg.give[0] = { ...pkg.give[0], retain: 0.5 };
  const open = D.mlbTradeWindow(lg).open;
  /* The board's older trade paths (the phone talks, the trade finder) ask
     mlbDeadlineRefusal; the packages ask the package clock. All three must
     read the same deadline in every round. */
  const refusal = D.mlbDeadlineRefusal(lg);
  stats.refusalChecks++;
  /* What the guide and the hub promise: once round 19 is played every deal
     is shut (two thirds of 27 rounds, MLB_DEADLINE in gmDeadline.ts).
     `lg.round` is the round about to be played. */
  if (open !== (lg.round <= 19)) problems.s3.push(`${where} round ${r}: the window is ${open ? 'open' : 'shut'} with ${lg.round - 1} rounds played, the guide says deals shut once round 19 is played`);
  if ((refusal === null) !== open) problems.s3.push(`${where} round ${r}: the window says ${open ? 'open' : 'shut'} but the trade paths' refusal says ${J(refusal)}`);
  const res = D.mlbProposePackage(lg, desk, team, pkg);
  const yes = res.verdict.verdict === 'accepted';
  if (refusal !== null && res.verdict.step === 1 && res.verdict.reason !== refusal) problems.s3.push(`${where} round ${r}: the package refusal ${J(res.verdict.reason)} is not the trade paths' ${J(refusal)}`);
  if (!open) {
    stats.lateTries++;
    if (yes) { stats.lateDeals++; problems.s3.push(`${where} round ${r}: a deal landed after the deadline (round ${D.mlbTradeWindow(lg).deadlineAfter})`); }
    else if (res.verdict.step !== 1) problems.s3.push(`${where} round ${r}: refused after the deadline, but by step ${res.verdict.step} (${res.verdict.reason}), not the deadline`);
  } else if (withPick) {
    stats.pickTries++;
    if (yes) problems.s4.push(`${where} round ${r}: a package with an MLB draft pick in it was accepted`);
    else if (res.verdict.step === 3 && /pick/i.test(String(res.verdict.reason))) stats.pickRefused++;
    else if (res.verdict.step < 3) stats.pickTries--;
  }
  if (!yes) return desk;
  if (open) stats.earlyDeals++;
  if (pkg.give.some(a => a.retain)) stats.retained++;
  checkPicks(lg, res.desk, `${where} round ${r} deal`);
  return res.desk;
}

/** The GM takes every other case himself, and leaves the rest open for the staff's rule. */
function gmDecides(lg, team, desk) {
  const ledger = D.deskCopy(D.mlbContractsOf(desk, lg, team));
  C.deskCases(HOST, lg, ledger).forEach((c, i) => {
    if (i % 2 === 1) return;
    let made;
    if (c.tender) made = C.tenderHim(ledger, lg, c);
    else if (c.qualifying && c.man.ovr >= 76) made = C.qualify(ledger, lg, c);
    else if (c.man.ovr >= 76) { made = C.keepAtAsk(ledger, lg, c); if (!made.ok) made = C.letGo(ledger, lg, c); }
    else made = C.letGo(ledger, lg, c);
    return made;
  });
  return G.withGmBlock(desk, D.MLB_DESK_KEYS.contracts, ledger);
}

const STAYS = new Set(['keep', 'option', 'tender', 'qualify-accepted', 'match']);
/** What a man the GM drafted is at the desk after `played` seasons: MLB's club control, arbitration from three, free from six. */
const wantClass = played => (played < MLB_ARBITRATION_AFTER ? 'pre-arbitration' : played < MLB_FREE_AGENCY_AFTER ? 'arbitration' : 'free-agent');
const firstUp = new Set();

/** A season with the desk on, in the board's order, and the winter through the desk. */
function seasonDesk(lg, team, desk, rng, s, where) {
  for (;;) {
    desk = tryDeal(lg, team, desk, s, where);
    E.simMlbRound(lg, team, rng, D.mlbDeskRoundOptions(desk, lg, team));
    E.mlbAiMoves(lg, team, rng);
    desk = D.mlbDeskAfterRound(desk, lg, team).desk;
    if (lg.round === D.mlbTradeWindow(lg).deadlineAfter) {
      const st = Object.values(D.mlbStances(lg));
      stats.buyers += st.filter(x => x === 'buyer').length;
      stats.sellers += st.filter(x => x === 'seller').length;
      /* The split is drawn at the engine's own October field: as many places a
         league as runMlbPlayoffs seeds (mlbLeagueSeeds), never a number of its own. */
      for (const al of [true, false]) {
        const field = E.mlbLeagueSeeds(lg, al).length;
        stats.fieldChecks++;
        if (field !== D.MLB_PLAYOFF_SPOTS) problems.s3.push(`${where}: the deadline splits buyers from sellers at ${D.MLB_PLAYOFF_SPOTS} places a league, but October seeds ${field}`);
      }
    }
    if (lg.round >= E.MLB_ROUNDS) break;
    lg.round += 1;
  }
  const po = E.runMlbPlayoffs(lg, rng, D.mlbDeskEdges(desk, lg, team));
  lg.champions.push({ season: lg.season, team: po.champion });
  desk = draftNight(lg, team, rng, desk);
  desk = gmDecides(lg, team, desk);
  const closed = lg.season;
  const up = C.expiringMen(HOST, lg, team).map(m => ({ id: m.id, name: m.name }));
  /* A man drafted with the desk on comes up when his first deal has run: three seasons, arbitration eligible. */
  const cases = new Map(C.deskCases(HOST, lg, D.mlbContractsOf(desk, lg, team)).map(c => [c.man.id, c]));
  const rosterNow = new Set(lg.teams[team].players.map(p => p.id));
  for (const [id, at] of [...draftedIn]) {
    const playedSeasons = closed - at;
    if (!rosterNow.has(id)) { draftedIn.delete(id); continue; }
    const c = cases.get(id);
    if (!c) {
      if (!firstUp.has(id) && playedSeasons >= MLB_ARBITRATION_AFTER) problems.s2.push(`${where}: a draftee has played ${playedSeasons} seasons and has not come up`);
      continue;
    }
    if (!firstUp.has(id)) {
      firstUp.add(id);
      stats.drafteesUp++;
      if (playedSeasons !== MLB_ARBITRATION_AFTER) problems.s2.push(`${where}: a draftee came up after ${playedSeasons} seasons, his first deal is ${MLB_ARBITRATION_AFTER}`);
    }
    if (c.cls !== wantClass(playedSeasons)) problems.s2.push(`${where}: a draftee after ${playedSeasons} seasons is ${c.cls} at the desk, MLB says ${wantClass(playedSeasons)}`);
    if (c.cls === 'free-agent') { stats.drafteesFree++; draftedIn.delete(id); }
  }
  const summer = D.mlbDeskOffseason(lg, desk, team, rng);
  if (!summer.ok) { problems.s2.push(`${where}: the desk winter refused to run (${summer.lines.join(' ')})`); return desk; }
  desk = summer.desk;
  compOwed = summer.compPicks.length;
  stats.compPaid += summer.compPicks.length;
  const ledger = D.mlbContractsOf(desk, lg, team);
  const roster = new Set(lg.teams[team].players.map(p => p.id));
  for (const m of up) {
    stats.applyChecks++;
    const d = ledger.decisions.find(x => x.season === closed && x.id === m.id);
    if (!d) { problems.s2.push(`${where}: ${m.name}'s deal ran out with no recorded decision`); continue; }
    stats.decisions++;
    if (d.via === 'gm') stats.gm++; else stats.auto++;
    if (d.kind === 'tender') stats.arbTenders++;
    if (d.kind === 'qualify-accepted') stats.qualifyAccepted++;
    if (d.kind === 'qualify-rejected') stats.qualifyRejected++;
    const retired = summer.notes.some(n => n.includes(`${m.name} retires`));
    if (STAYS.has(d.kind) && !roster.has(m.id) && !retired) problems.s2.push(`${where}: ${m.name} was kept (${d.kind}) but is not on the roster`);
    if (!STAYS.has(d.kind) && roster.has(m.id)) problems.s2.push(`${where}: ${m.name} was let go (${d.kind}) but is still on the roster`);
  }
  cutToMax(lg, team);
  checkPicks(lg, desk, `${where} winter`);
  return desk;
}

for (const seed of SEEDS) {
  const rng = mulberry32(1000 + seed);
  const lg = E.initMlbLeague(rng);
  let desk = D.openMlbDesk(lg, TEAM);
  compOwed = 0;
  checkPicks(lg, desk, `seed ${seed} open`);
  for (let s = 0; s < SEASONS; s++) desk = seasonDesk(lg, TEAM, desk, rng, s, `seed ${seed} season ${s + 1}`);
}

begin('2', 'over ten seasons a seed, no expiring man of yours leaves without a recorded decision, applied as written');
for (const p of problems.s2) fail(p);
if (stats.decisions < T.minDecisions) fail(`only ${stats.decisions} decisions over the walk, floor ${T.minDecisions}`);
if (stats.gm < T.minGm) fail(`only ${stats.gm} decisions by the GM, floor ${T.minGm}`);
if (stats.auto < T.minAuto) fail(`only ${stats.auto} settled by the staff's rule, floor ${T.minAuto}`);
if (stats.drafteesUp < T.minDrafteesUp) fail(`only ${stats.drafteesUp} draftees reached the end of their first deal, floor ${T.minDrafteesUp}`);
if (stats.drafteesFree < T.minDrafteesFree) fail(`only ${stats.drafteesFree} draftees reached free agency at ${MLB_FREE_AGENCY_AFTER} seasons, floor ${T.minDrafteesFree}`);
if (stats.arbTenders < T.minArbTenders) fail(`only ${stats.arbTenders} men tendered under club control, floor ${T.minArbTenders}`);
if (stats.qualifyAccepted + stats.qualifyRejected < T.minQualify) fail(`only ${stats.qualifyAccepted + stats.qualifyRejected} qualifying offers made, floor ${T.minQualify}`);
console.log(`   ${stats.applyChecks} expiring men: ${stats.gm} decided by the GM, ${stats.auto} by the staff's rule; ${stats.arbTenders} tendered under club control; qualifying offers ${stats.qualifyAccepted} taken, ${stats.qualifyRejected} turned down`);
console.log(`   ${stats.drafteesUp} draftees came up after exactly ${MLB_ARBITRATION_AFTER} seasons, ${stats.drafteesFree} reached free agency at ${MLB_FREE_AGENCY_AFTER}`);

begin('3', 'no trade lands after the deadline, and deals do land before it');
for (const p of problems.s3) fail(p);
if (stats.earlyDeals < T.minEarlyDeals) fail(`only ${stats.earlyDeals} deals before the deadline, floor ${T.minEarlyDeals}`);
if (stats.lateTries < T.minLateTries) fail(`only ${stats.lateTries} tries after the deadline, floor ${T.minLateTries}`);
if (!(stats.buyers > 0 && stats.sellers > 0)) fail(`the deadline split nobody: ${stats.buyers} buyers, ${stats.sellers} sellers`);
if (stats.fieldChecks < 2 * SEEDS.length * SEASONS) fail(`the split was held against the October field only ${stats.fieldChecks} times`);
console.log(`   ${stats.earlyDeals} deals before the deadline, ${stats.lateTries} tries after it, ${stats.lateDeals} landed; ${stats.buyers} buyer and ${stats.sellers} seller places at the deadline`);
{
  /* The board's older trade paths are guarded in the board itself, so read
     it: the code, with every comment stripped, so prose about the guard can
     never stand in for the guard. Each handler that opens or closes a deal
     asks deadlineBlock() before it touches the trade engine, and
     deadlineBlock asks mlbDeadlineRefusal, the refusal checked above. */
  const raw = overrides.get(path.resolve(FILES.board).toLowerCase()) ?? lf(fs.readFileSync(FILES.board, 'utf8'));
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\{\s*\}/g, '{}');
  const body = name => {
    const at = code.indexOf(`  const ${name} = (`);
    if (at < 0) return null;
    const end = code.indexOf('\n  const ', at + 10);
    return code.slice(at, end < 0 ? undefined : end);
  };
  const guard = body('deadlineBlock');
  if (!guard || !guard.includes('mlbDeadlineRefusal(league)')) fail('deadlineBlock no longer asks mlbDeadlineRefusal');
  const paths = { openTradeTalks: 'openTalks(', acceptTalks: 'mlbExecuteTalksTrade(', doShop: 'findTrades(', acceptShopOffer: 'mlbTrade)(' };
  let guarded = 0;
  for (const [name, engineCall] of Object.entries(paths)) {
    const b = body(name);
    if (!b) { fail(`the board has no ${name} handler to check`); continue; }
    const g = b.indexOf('deadlineBlock()'), t = b.indexOf(engineCall);
    if (t < 0) fail(`${name} no longer calls ${engineCall}, so this check is reading the wrong handler`);
    else if (g < 0 || g > t) fail(`${name} reaches ${engineCall} without asking deadlineBlock() first`);
    else guarded++;
  }
  /* With the desk on, the old paths put no pick in a deal: the finder trades through mlbDeskFinderTrade, the talks are handed no pick. */
  const shop = body('doShop') ?? '', take = body('acceptShopOffer') ?? '', talksArgs = body('talksArgsFor') ?? '', accept = body('acceptTalks') ?? '';
  if (!shop.includes('gm ? mlbDeskFinderTrade : mlbTrade')) fail('doShop does not trade through mlbDeskFinderTrade with the desk on');
  if (!take.includes('(gm ? mlbDeskFinderTrade : mlbTrade)(')) fail('acceptShopOffer does not trade through mlbDeskFinderTrade with the desk on');
  if (!talksArgs.includes('myPickCount: gm ? 0 :')) fail('the phone talks are handed a pick count with the desk on');
  if (!accept.includes('gm && pkg.addPick')) fail('acceptTalks does not refuse a pick with the desk on');
  {
    const L = E.initMlbLeague(mulberry32(31));
    const a = L.teams[TEAM], b = L.teams.NYY;
    if (D.mlbDeskFinderTrade(a, b, a.players[0].id, b.players[0].id, true, L.cap) === 'accepted') fail('mlbDeskFinderTrade took a sweetened deal');
    if (J(L.teams[TEAM].picks) !== J([1, 2])) fail(`a refused sweetener still moved a pick: ${J(L.teams[TEAM].picks)}`);
  }
  console.log(`   ${stats.refusalChecks} rounds where the trade paths' refusal matched the window; ${guarded} of 4 board trade handlers ask the deadline first; the old paths carry no pick with the desk on`);
}

begin('4', 'picks are conserved league wide after every deal and every winter, and none ever moves');
for (const p of problems.s4) fail(p);
if (stats.pickTries < T.minPickTries) fail(`only ${stats.pickTries} packages tried a pick before the deadline, floor ${T.minPickTries}`);
if (stats.pickRefused !== stats.pickTries) fail(`${stats.pickTries} packages carried a pick and ${stats.pickRefused} were refused by the pick rule`);
if (stats.retained < T.minRetained) fail(`only ${stats.retained} deals carried cash, floor ${T.minRetained}`);
if (stats.compPaid < T.minCompPaid) fail(`only ${stats.compPaid} extra picks paid by turned down qualifying offers, floor ${T.minCompPaid}`);
console.log(`   ${stats.pickChecks} ledger checks; ${stats.pickTries} packages carried a pick, ${stats.pickRefused} refused by MLB's rule; ${stats.retained} deals with cash; ${stats.compPaid} extra picks paid by turned down qualifying offers`);

/* ================================================================== */
begin('5', "the staff's effects change their consumer at every level step");
const L5 = E.initMlbLeague(mulberry32(5));
const base = S.gmDefaultStaff(MLB_STAFF_PACK.rules, D.mlbStaffCtx(L5, TEAM));
const lift = (b, post, level) => ({ ...b, [post]: { ...base[post], level, potential: Math.max(level, base[post].potential) } });
const atLevel = level => {
  let block = { ...base };
  for (const post of MLB_STAFF_PACK.posts) block = lift(block, post.id, level);
  return block;
};
const rival = L5.teams.NYY, mine5 = L5.teams[TEAM];
const missAt = lv => { let v = 0; for (let i = 0; i < 3000; i++) { const t = 70 + (i % 15); v += Math.abs(D.mlbScoutRead({ id: `p${i}`, trueOvr: t }, TEAM, 2026, lv) - t); } return v / 3000; };
const outAt = block => { let v = 0; for (let i = 0; i < 4000; i++) v += D.mlbInjuryRounds(block, TEAM, 2026, 1, `i${i}`, 3); return v / 4000; };
const growAt = block => { let v = 0; for (let i = 0; i < 3000; i++) v += D.mlbFarmGain(block, TEAM, 2026, `g${i}`, 1 + (i % 3)); return v / 3000; };
const ladder = [];
for (let level = 1; level <= 10; level++) {
  const block = atLevel(level);
  const desk = G.withGmBlock(D.openMlbDesk(L5, TEAM), D.MLB_DESK_KEYS.staff, { block, purse: 8 });
  const opts = D.mlbDeskRoundOptions(desk, L5, TEAM);
  const win = E.mlbWinProb(mine5, rival, opts.edges[TEAM], 0);
  let out = 0;
  for (let i = 0; i < 4000; i++) out += opts.injuryRounds(TEAM, { id: `i${i}` }, 3);
  ladder.push({ level, edge: opts.edges[TEAM], win, miss: missAt(S.gmStaffLevel(block, 'scouting')), out: out / 4000, grow: growAt(block) });
}
if (Math.abs(ladder[0].win - E.mlbWinProb(mine5, rival)) > 1e-12) fail(`a level 1 staff moves the game: ${ladder[0].win} against ${E.mlbWinProb(mine5, rival)} with no desk`);
if (Math.abs(ladder[0].grow - 2) > 1e-12) fail(`a level 1 farm moves a young man's winter: ${ladder[0].grow} points on average where the engine draws 2`);
for (let i = 1; i < ladder.length; i++) {
  const a = ladder[i - 1], b = ladder[i];
  if (!(b.win > a.win)) fail(`level ${a.level} to ${b.level}: the win probability did not rise (${a.win.toFixed(4)} to ${b.win.toFixed(4)})`);
  if (!(b.miss < a.miss)) fail(`level ${a.level} to ${b.level}: the scouting miss did not shrink (${a.miss.toFixed(3)} to ${b.miss.toFixed(3)})`);
  if (!(b.out < a.out)) fail(`level ${a.level} to ${b.level}: an injury did not get shorter (${a.out.toFixed(3)} to ${b.out.toFixed(3)})`);
  if (!(b.grow > a.grow)) fail(`level ${a.level} to ${b.level}: a young man's winter did not grow (${a.grow.toFixed(3)} to ${b.grow.toFixed(3)})`);
}
/* Each post on its own: every other chair at level 1, this one up the
   ladder. A post whose effect reaches nothing hides inside the all posts
   ladder above (gmStaffEffect reads a key it does not know as nothing), so
   each post must move its own consumer at every step, and an edge post must
   reach the strength by exactly its weight: the engine's own mlbStrength
   weights, the lineup's for the bats and the rotation's and pen's together
   for the arms. */
const WEIGHTS = { hitEdge: D.MLB_LINEUP_WEIGHT, pitchEdge: D.MLB_PITCHING_WEIGHT };
if (Math.abs(WEIGHTS.hitEdge - 0.55) > 1e-12 || Math.abs(WEIGHTS.pitchEdge - 0.45) > 1e-12) fail(`the desk's weights ${J(WEIGHTS)} are not mlbStrength's 0.55 and 0.33 plus 0.12`);
const postLines = [];
for (const post of MLB_STAFF_PACK.posts) {
  const keys = post.effects.map(x => x.key);
  const edgeKeys = keys.filter(k => k in WEIGHTS);
  const consumer = edgeKeys.length ? 'win' : keys.includes('scoutSpread') ? 'miss' : keys.includes('injuryWeeks') ? 'out' : keys.includes('growth') ? 'grow' : null;
  if (!consumer) { fail(`the ${post.id} post's effects ${J(keys)} reach no consumer this harness knows`); continue; }
  const vals = [];
  for (let level = 1; level <= 10; level++) {
    const block = lift(atLevel(1), post.id, level);
    const edge = D.mlbStaffEdge(block);
    const want = edgeKeys.reduce((s, k) => s + S.gmStaffEffect(MLB_STAFF_PACK, block, k) * WEIGHTS[k], 0);
    if (Math.abs(edge - want) > 1e-9) fail(`${post.id} at level ${level}: the staff edge is ${edge.toFixed(3)}, its own effects at their weights make ${want.toFixed(3)}`);
    const v = consumer === 'win' ? E.mlbWinProb(mine5, rival, edge, 0)
      : consumer === 'miss' ? missAt(S.gmStaffLevel(block, 'scouting'))
        : consumer === 'out' ? outAt(block) : growAt(block);
    const up = consumer === 'win' || consumer === 'grow';
    if (vals.length && !(up ? v > vals.at(-1) : v < vals.at(-1))) fail(`${post.id} alone, level ${level - 1} to ${level}: the ${consumer} did not move (${vals.at(-1).toFixed(4)} to ${v.toFixed(4)})`);
    vals.push(v);
  }
  postLines.push(`${post.id} ${consumer} ${vals[0].toFixed(3)} to ${vals[9].toFixed(3)}`);
}
console.log(`   each post alone: ${postLines.join('; ')}`);
{
  /* The other clubs never feel the user's staff. */
  const opts = D.mlbDeskRoundOptions(G.withGmBlock(D.openMlbDesk(L5, TEAM), D.MLB_DESK_KEYS.staff, { block: atLevel(10), purse: 8 }), L5, TEAM);
  if (Object.keys(opts.edges).join() !== TEAM) fail(`the desk hands an edge to ${J(Object.keys(opts.edges))}`);
  if (opts.injuryRounds('NYY', { id: 'x' }, 3) !== 3) fail('the user trainer shortened a rival injury');
  const grow = D.mlbDeskOffseasonOptions(atLevel(10), TEAM, 2026).growth;
  let rivalMoved = 0;
  for (let i = 0; i < 300; i++) if (grow('NYY', { id: `r${i}` }, 1 + (i % 3)) !== 1 + (i % 3)) rivalMoved++;
  if (rivalMoved) fail(`the user farm director grew ${rivalMoved} rival young men`);
}
{
  /* The desk's winter hands the farm director to the engine: the same league and the same draws, a level 1 farm
     against a level 10 one, and only the user's young men come out of the winter better. */
  const L = E.initMlbLeague(mulberry32(55));
  L.round = E.MLB_ROUNDS;
  const kids = [];
  for (let i = 0; i < 60; i++) kids.push({ id: `kid${i}`, name: `Farm Kid ${i}`, pos: i % 2 ? 'SP' : 'SS', age: 20, ovr: 66, salary: 0.8, years: 4, out: 0, pot: 92 });
  L.teams[TEAM].players.push(...kids);
  const winter = level => {
    const lg = JSON.parse(J(L));
    const block = lift(atLevel(1), 'farm', level);
    let desk = G.withGmBlock(D.openMlbDesk(lg, TEAM), D.MLB_DESK_KEYS.staff, { block, purse: 8 });
    const summer = D.mlbDeskOffseason(lg, desk, TEAM, mulberry32(56));
    if (!summer.ok) fail(`the farm walk winter refused to run at level ${level}`);
    const mineOvr = lg.teams[TEAM].players.filter(p => p.id.startsWith('kid')).reduce((s, p) => s + p.ovr, 0);
    const cpu = J(Object.values(lg.teams).filter(t => t.abbr !== TEAM).map(t => t.players.map(p => p.ovr)));
    return { mineOvr, cpu };
  };
  const low = winter(1), high = winter(10);
  if (!(high.mineOvr > low.mineOvr)) fail(`a level 10 farm director's winter grew your 60 young men by ${high.mineOvr - 60 * 66} points, a level 1 one by ${low.mineOvr - 60 * 66}`);
  if (high.cpu !== low.cpu) fail('your farm director changed a rival club\'s winter');
  console.log(`   the desk's winter: 60 young men grow ${low.mineOvr - 60 * 66} points under a level 1 farm, ${high.mineOvr - 60 * 66} under a level 10 one; rivals unchanged`);
}
console.log(`   edge ${ladder[0].edge.toFixed(2)} to ${ladder[9].edge.toFixed(2)}, win ${ladder[0].win.toFixed(3)} to ${ladder[9].win.toFixed(3)}, miss ${ladder[0].miss.toFixed(2)} to ${ladder[9].miss.toFixed(2)}, rounds out ${ladder[0].out.toFixed(2)} to ${ladder[9].out.toFixed(2)}, winter growth ${ladder[0].grow.toFixed(3)} to ${ladder[9].grow.toFixed(3)}`);

/* ================================================================== */
begin('6', 'migration keeps every marker, a corrupt block resets alone, cash in a deal holds its figure and its limits');
{
  const lg = E.initMlbLeague(mulberry32(6));
  /* An old save: the trade finder's sweetener moved picks before the desk existed. */
  lg.teams.NYY.picks = [1]; lg.teams.TBR.picks = [1, 2, 2]; lg.teams.CHC.picks = [];
  const desk = D.openMlbDesk(lg, TEAM);
  const ledger = D.mlbPicksOf(desk, lg);
  let markers = 0;
  for (const [abbr, t] of Object.entries(lg.teams)) {
    markers += t.picks.length;
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    if (J(held) !== J([...t.picks].sort((a, b) => a - b))) fail(`migration: ${abbr} held ${J(t.picks)} and the ledger gives it ${J(held)}`);
  }
  if (P.picksHeldBy(ledger, TEAM).length === 0 || markers !== ledger.picks.filter(p => p.year === lg.season).length) fail(`migration: ${markers} markers on the old lists, ${ledger.picks.filter(p => p.year === lg.season).length} picks this year in the ledger`);
  const broken = G.withGmBlock(desk, D.MLB_DESK_KEYS.picks, { v: 7 });
  if (D.mlbContractsOf(broken, lg, TEAM) !== desk.blocks.contracts) fail('a corrupt picks block took the contracts block with it');
  if (D.mlbStaffOf(broken, lg, TEAM) !== desk.blocks.staff) fail('a corrupt picks block took the staff block with it');
  if (!P.validateLedger(D.mlbPicksOf(broken, lg), Object.keys(lg.teams), D.mlbGamePickRules())) fail('a corrupt picks block did not come back as a sound fresh one');
  const badStaff = G.withGmBlock(desk, D.MLB_DESK_KEYS.staff, { block: 'x', purse: -1 });
  if (D.mlbPicksOf(badStaff, lg) !== desk.blocks.picks) fail('a corrupt staff block took the picks block with it');
  if (!D.isMlbStaffState(D.mlbStaffOf(badStaff, lg, TEAM))) fail('a corrupt staff block did not come back as a sound fresh one');
  if (D.mlbRetainedOf(G.withGmBlock(desk, D.MLB_DESK_KEYS.retained, [{ club: TEAM, playerId: 'x', name: 'x', share: 0.9, kept: 1 }])).length !== 0) fail('a cash row past the limit was read back as sound');
}
{
  const lg = E.initMlbLeague(mulberry32(61));
  const desk = D.openMlbDesk(lg, TEAM);
  let d = desk;
  const partners = ['ATL', 'DET', 'SEA', 'TEX'];
  const deal = (give, retain) => {
    const partner = partners[d.blocks.retained.length % partners.length];
    const them = lg.teams[partner];
    return D.mlbProposePackage(lg, d, TEAM, { from: TEAM, to: partner, give: [{ kind: 'player', id: give.id, retain }], get: [{ kind: 'player', id: byValue(them.players)[0].id }] });
  };
  const sendable = () => [...lg.teams[TEAM].players].filter(p => p.years >= 2).sort((a, b) => E.mlbTradeValue(b) - E.mlbTradeValue(a));
  {
    /* A contract can carry cash twice at most (the game's own limit, MLB_CASH_RETENTION), counted per contract, on a copy of the league. */
    const y = sendable()[0];
    const row = club => ({ club, playerId: y.id, name: y.name, share: 0.5, kept: 1 });
    const tryWith = rows => {
      const lc = JSON.parse(J(lg));
      const dk = G.withGmBlock(desk, D.MLB_DESK_KEYS.retained, rows);
      return D.mlbProposePackage(lc, dk, TEAM, { from: TEAM, to: 'SEA', give: [{ kind: 'player', id: y.id, retain: 0.5 }], get: [{ kind: 'player', id: byValue(lc.teams.SEA.players)[0].id }] }).verdict;
    };
    const twice = tryWith([row('ATL'), row('DET')]);
    if (twice.verdict !== 'invalid' || !String(twice.reason).includes('as often as this game allows')) fail(`a contract already carrying cash twice took it a third time: ${J(twice)}`);
    const once = tryWith([row('ATL')]);
    if (once.verdict !== 'accepted') fail(`a contract carrying cash once could not carry it again: ${J(once)}`);
  }
  const over = deal(sendable()[0], 0.6);
  if (over.verdict.verdict !== 'invalid' || over.verdict.step !== 3) fail(`cash for 60 percent of a salary was not refused by the limit: ${J(over.verdict)}`);
  const first = sendable()[0];
  const salary = first.salary;
  const res1 = deal(first, 0.5);
  if (res1.verdict.verdict !== 'accepted') fail(`a star for a depth man with half his salary in cash was refused: ${J(res1.verdict)}`);
  else {
    d = res1.desk;
    const kept = Math.round(salary * 0.5 * 10) / 10;
    const entry = (lg.teams[TEAM].deadCap ?? []).find(x => x.playerId === first.id);
    if (!entry || entry.amount !== kept) fail(`the sending club carries ${J(entry)} for ${first.name}, wanted ${kept}`);
    const moved = Object.values(lg.teams).flatMap(t => t.players).find(p => p.id === first.id);
    if (!moved || Math.abs(moved.salary - (salary - kept)) > 0.051) fail(`${first.name} costs his new club ${moved?.salary}, wanted ${salary - kept}`);
    for (let i = 0; i < 2; i++) { const r = deal(sendable()[0], 0.5); if (r.verdict.verdict === 'accepted') d = r.desk; else fail(`cash deal ${i + 2} of 3 refused: ${r.verdict.reason}`); }
    const fourth = deal(sendable()[0], 0.5);
    if (fourth.verdict.verdict !== 'invalid' || !String(fourth.verdict.reason).includes('retained contracts')) fail(`a fourth cash deal was not refused by the three deal limit: ${J(fourth.verdict)}`);
    const yearsLeft = moved ? moved.years : 0;
    lg.round = E.MLB_ROUNDS;
    const summer = D.mlbDeskOffseason(lg, d, TEAM, mulberry32(66));
    const after = (lg.teams[TEAM].deadCap ?? []).find(x => x.playerId === first.id);
    if (!summer.ok) fail('the desk winter refused to run in the cash walk');
    else if (yearsLeft >= 2 && (!after || after.amount !== kept)) fail(`after a winter the cash line reads ${J(after)}, wanted ${kept} again`);
    else if (yearsLeft < 2 && after) fail(`a cash line outlived the deal it was on: ${J(after)}`);
  }
}

/* ================================================================== */
begin('7', 'every desk panel draws, and the re-sign desk shows a tile for every expiring man');
{
  const { MLB_DESK_PANELS, MLB_RECAP_PANELS, GmDeskMount, render } = M;
  const rng = mulberry32(77);
  const lg = E.initMlbLeague(rng);
  let desk = D.openMlbDesk(lg, TEAM);
  /* One season on, so somebody's deal is running out. */
  compOwed = 0;
  desk = seasonDesk(lg, TEAM, desk, rng, 0, 'render walk');
  const facts = { teamId: TEAM, teamLabel: TEAM, seasonsPlayed: 1, phase: 'hub', hub: {}, league: lg, seasonOver: false, deskOn: true, clubName: x => x, say: () => {}, commit: () => {} };
  const props = { sport: { key: 'mlb' }, desk, facts, onDesk: () => {}, onBack: () => {} };
  const marks = { staff: 'data-mlb-desk-staff', contracts: 'data-resign-desk', picks: 'data-gm-picks', deals: 'data-mlb-desk-deals' };
  for (const p of MLB_DESK_PANELS) {
    let html = '';
    try { html = render(p.Panel, props); } catch (e) { fail(`the ${p.key} panel threw: ${String(e).slice(0, 160)}`); continue; }
    if (!html.includes(marks[p.key])) fail(`the ${p.key} panel drew without its ${marks[p.key]} mark`);
    if (p.key === 'deals' && !html.includes('only Competitive Balance picks can be traded, and this game awards none')) fail('the trade desk does not say only Competitive Balance picks can be traded and this game awards none');
  }
  const cases = C.deskCases(HOST, lg, D.mlbContractsOf(desk, lg, TEAM)).length;
  const html = render(MLB_DESK_PANELS.find(p => p.key === 'contracts').Panel, props);
  const tiles = (html.match(/data-resign-tile=/g) ?? []).length;
  if (cases === 0) fail('nobody is expiring a season in, so the re-sign tiles were not drawn at all');
  if (tiles !== cases) fail(`${cases} expiring men and ${tiles} tiles on the re-sign desk`);
  const hub = render(GmDeskMount, { sport: 'mlb', desk, facts, panels: MLB_DESK_PANELS, open: null, onOpen: () => {}, onDesk: () => {} });
  if ((hub.match(/<button/g) ?? []).length < MLB_DESK_PANELS.length) fail(`the hub drew ${(hub.match(/<button/g) ?? []).length} desk boxes for ${MLB_DESK_PANELS.length} panels`);
  if (MLB_RECAP_PANELS.length !== 1 || MLB_RECAP_PANELS[0].key !== 'contracts') fail('the recap mounts more than the re-sign desk');
  /* The deal box past the deadline: shut with the desk on; on a save without it the phone still deals, so it must not say shut. */
  const deals = MLB_DESK_PANELS.find(p => p.key === 'deals');
  const late = { ...facts, league: { ...lg, round: 21 } };
  if (deals.tile({ desk, facts: late }).value !== 'Deadline passed') fail(`with the desk on, the deal box at round 21 reads ${J(deals.tile({ desk, facts: late }).value)}`);
  if (deals.tile({ desk, facts: { ...late, deskOn: false } }).value === 'Deadline passed') fail('a save without the desk reads Deadline passed while its phone and trade finder still deal');
  if (!String(deals.tile({ desk, facts: { ...late, deskOn: false } }).sub).includes('round 19')) fail('the deal box on a save without the desk does not say deals shut once round 19 is played');
  /* The help beside the boxes: its trigger draws, and the board mounts it on the hub. The dialog itself opens on a tap. */
  const help = render(M.MlbDeskHelp, { league: lg });
  if (!help.includes('data-mlb-desk-help') || !help.includes('How the GM desk works')) fail('the desk help does not draw its "?"');
  const boardCode = lf(fs.readFileSync(FILES.board, 'utf8'));
  if (!boardCode.includes('<MlbDeskHelp league={league} />')) fail('the board does not mount the desk help on the hub');
  console.log(`   4 panels drawn, ${tiles} re-sign tiles for ${cases} expiring men, the desk help drawn`);
}

/* ================================================================== */
const failed = [...failedIn.values()].reduce((s, n) => s + n, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const red = [...failedIn.keys()];
  console.log(`control ${CONTROL}: red in ${J(red)}, wanted ${want}`);
  if (!red.includes(want)) { console.error(`simMlbGmDesk: CONTROL ${CONTROL} DID NOT FIRE in check ${want}`); process.exit(1); }
  console.log(`simMlbGmDesk: control ${CONTROL} fired (${failed} failures, as it should)`);
  process.exit(0);
}
if (failed) { console.error(`simMlbGmDesk: ${failed} failure(s) in ${J([...failedIn.keys()])}`); process.exit(1); }
console.log(`simMlbGmDesk: all seven checks passed (${SEEDS.length} seeds x ${SEASONS} seasons)`);
