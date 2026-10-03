/* Round 987: the NHL Front Office on the GM desk (src/lib/nhlGmDesk.ts).
 *
 * The first bind of the four shared GM modules to a real engine. This
 * harness drives the NHL engine and the desk exactly the way the board
 * calls them (NhlFrontOfficeBoard.tsx), with seeded draws, and checks:
 *   1  a save from before the desk plays to the identical league, season
 *      after season, as the engine did before this round (a fixture recorded
 *      from the pre-round engine), and opening the desk changes nothing in
 *      the league it opens on
 *   2  over ten seeded seasons, every user man whose deal runs out has a
 *      recorded decision, and what happened to him is what it says: a kept
 *      man is still here (or retired), a man let go is gone; a man drafted
 *      with the desk on comes up after exactly his entry level seasons
 *   3  no trade lands after the deadline, and deals do land before it; the
 *      window shuts once round 16 is played (what the guide says), the older
 *      trade paths' refusal (nhlDeadlineRefusal) agrees with it every round,
 *      and each of the board's four old trade handlers asks it first
 *   4  picks are conserved league wide: every club's pick in every round of
 *      every year carried exists exactly once, after every deal and summer,
 *      and every engine list is the ledger's; an offer sheet the GM cashes in
 *      pays him picks the club that tabled it really held
 *   5  the staff's effects change their consumer at every level step: the
 *      win probability, the scouting miss, the rounds an injury costs, for
 *      the whole staff and for each post on its own, each edge post reaching
 *      the strength by exactly its weight
 *   6  migration keeps every marker, a corrupt block resets alone, retained
 *      salary stays at its full figure while the deal runs and the limits hold
 *      (half a salary, three deals a club, twice a contract)
 *   7  every desk panel draws (server rendered), and the re-sign desk draws a
 *      tile for every expiring man; the deal box says shut only with the desk on
 * Negative controls (SIM_NHL_GM_DESK_CONTROL), each must go red in its check:
 *   coinflip   the summer runs the engine's own offseason, coin flip and all  (2)
 *   latetrade  the package clock never moves, so deals pass the deadline     (3)
 *   droppick   a pick sent in a package is dropped from the ledger           (4)
 *   flatstaff  the staff edge is always nothing                             (5)
 *   nodefault  the engine's win probability reads an edge by default        (1)
 *   refusaldrift  the old trade paths count the clock a round behind        (3)
 *   noguard    the trade finder's accept skips the deadline                 (3)
 *   onepost    the special teams key misspelt, so that post does nothing    (5)
 *   sheetpicks an offer sheet's pick goes back to the club that held it     (4)
 *   shortelc   a draftee signs the engine's figure, a season short           (2)
 *   retaintwice  retentions counted by club, not by contract                (6)
 * Recording the fixture: SIM_NHL_GM_DESK_RECORD=<git ref of the engine before
 * this round> rewrites scripts/data/nhlGmDeskFixture.json from that engine.
 *
 * MEASURED 2026-10-03 after the review fixes (draftees on the rules' entry
 * level deal, the GM cashing in every other offer sheet), on three seed sets
 * of ten (1..10, 11..20, 21..30), ten seasons a seed, totals per set:
 *   expiring men decided   280 / 286 / 265   (by the GM 166 / 163 / 152, by the staff's rule 114 / 123 / 113)
 *   draftees come up       99 / 99 / 96, every one after exactly his entry level seasons
 *   deals before deadline  686 / 665 / 650   tries after it 400 each, landed 0; refusal agreed 2000 rounds each
 *   deals moving a pick    664 / 648 / 629   with salary retained 61 / 60 / 65
 *   offer sheets cashed    by the GM 22 / 25 / 23, picks paid 41 / 38 / 32, none owed by a club with none left
 *   staff ladder (fixed)   edge 0 to 2.40 strength, win .566 to .660, scouting miss 2.23 to 0.57,
 *                          a three round injury 3.00 to 2.25 rounds; alone, the head coach takes the win
 *                          .566 to .614, special teams and the goalie coach .566 to .590 each
 * Every floor in T sits near 70 percent of the lowest set. Every control was
 * run on seeds 1..10 and fired in its own check, failures counted: coinflip
 * 29 in 2, latetrade 400 in 3, droppick 452 in 4, flatstaff 63 in 5,
 * nodefault 7 in 1, refusaldrift 100 in 3, noguard 1 in 3, onepost 18 in 5,
 * sheetpicks 34 in 4, shortelc 120 in 2, retaintwice 1 in 6.
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
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'nhlGmDeskFixture.json');

const CONTROL = process.env.SIM_NHL_GM_DESK_CONTROL || '';
const RECORD = process.env.SIM_NHL_GM_DESK_RECORD || '';
const CONTROLS = {
  coinflip: '2', latetrade: '3', droppick: '4', flatstaff: '5', nodefault: '1',
  refusaldrift: '3', noguard: '3', onepost: '5', sheetpicks: '4', shortelc: '2', retaintwice: '6',
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_NHL_GM_DESK_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const SEEDS = (process.env.SIM_NHL_GM_DESK_SEEDS || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const SEASONS = 10;

/* Floors: the measured size of each walk, see MEASURED in the header. */
const T = {
  minDecisions: 185, minGm: 106, minAuto: 79, minEarlyDeals: 455, minLateTries: 280, minRetained: 40, minPickMoves: 440,
  minDrafteesUp: 67, minTakeGm: 15, minSheetPaid: 22,
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
  desk: path.join(ROOT, 'src', 'lib', 'nhlGmDesk.ts'),
  engine: path.join(ROOT, 'src', 'lib', 'nhlFrontOffice.ts'),
  board: path.join(ROOT, 'src', 'components', 'nhl-front-office', 'NhlFrontOfficeBoard.tsx'),
};
const EDITS = {
  coinflip: ['desk', '  const run = runDeskOffseason(nhlContractHost, league, ledger, rng);',
    '  const run = { ok: true as const, engine: nhlContractHost.runOffseason(league, rng, team), applied: [] as GmDecision[], picksAdded: [] as number[] };'],
  latetrade: ['desk', 'periodsPlayed: nhlPeriodsPlayed(league), seasonClosed: false },', 'periodsPlayed: 0, seasonClosed: false },'],
  droppick: ['desk', '  let next = withGmBlock(desk, NHL_DESK_KEYS.picks, out.ledger);',
    '  let next = withGmBlock(desk, NHL_DESK_KEYS.picks, { v: 1, picks: out.ledger.picks.filter(p => !pkg.give.some(a => a.kind === \'pick\' && a.key === pickKey(p))) });'],
  flatstaff: ['desk', "  const e = (key: string) => gmStaffEffect(NHL_STAFF_PACK, block, key);", "  const e = (key: string) => 0 * gmStaffEffect(NHL_STAFF_PACK, block, key);"],
  nodefault: ['engine', 'export function nhlWinProb(a: NhlGmTeam, b: NhlGmTeam, edgeA = 0, edgeB = 0): number {',
    'export function nhlWinProb(a: NhlGmTeam, b: NhlGmTeam, edgeA = 0.01, edgeB = 0): number {'],
  /* Review round 1: the older trade paths' refusal counts the clock one round behind the window. */
  refusaldrift: ['desk', '  return nhlTradeWindow(league).reason;',
    '  return tradeWindow(NHL_DEADLINE, NHL_FO_ROUNDS, Math.max(0, league.round - 2), false).reason;'],
  /* The trade finder's accept skips the deadline. */
  noguard: ['board', '    if (!league || !myTradePiece || deadlineBlock()) return;\n    const lg: NhlLeague = JSON.parse(JSON.stringify(league));\n    const pickRound = lastPickRound(lg, o.sweeten);',
    '    if (!league || !myTradePiece) return;\n    const lg: NhlLeague = JSON.parse(JSON.stringify(league));\n    const pickRound = lastPickRound(lg, o.sweeten);'],
  /* One post's effect key misspelt: gmStaffEffect reads an unknown key as nothing. */
  onepost: ['desk', "    + e('specialTeamsEdge') * NHL_SPECIAL_TEAMS_WEIGHT;", "    + e('specialTeamEdge') * NHL_SPECIAL_TEAMS_WEIGHT;"],
  /* The sheet's pick goes back to the club that already held it. */
  sheetpicks: ['desk', '      if (pay) picks = movePicks(picks, [pickKey(pay)], team);', '      if (pay) picks = movePicks(picks, [pickKey(pay)], sheet.club);'],
  /* A draftee signs the engine's figure, so the summer after draft night eats a season of his entry level deal. */
  shortelc: ['desk', '  p.years = nhlEntryLevelYears(p.age) + 1;', '  p.years = nhlEntryLevelYears(p.age);'],
  /* The desk counts retentions by club instead of by contract. */
  retaintwice: ['desk', '    timesRetained: id => retained.filter(r => r.playerId === id).length,', '    timesRetained: id => retained.filter(r => r.club === id).length,'],
};
const overrides = new Map();
if (CONTROL) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape SIM_NHL_GM_DESK_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (src.split(from).length !== 2) { console.error(`control cannot run: the line ${CONTROL} rewrites is there more than once`); process.exit(2); }
  const out = src.replace(from, to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${CONTROLS[CONTROL]} must go red`);
}
if (RECORD) {
  const old = execFileSync('git', ['show', `${RECORD}:src/lib/nhlFrontOffice.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  overrides.set(path.resolve(FILES.engine).toLowerCase(), old);
  console.log(`RECORDING the fixture from the engine at ${RECORD}`);
}

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simNhlGmDesk-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as E from '${ROOT_URL}/src/lib/nhlFrontOffice.ts';
export * as D from '${ROOT_URL}/src/lib/nhlGmDesk.ts';
export * as C from '${ROOT_URL}/src/lib/gmContracts.ts';
export * as P from '${ROOT_URL}/src/lib/gmPicks.ts';
export * as S from '${ROOT_URL}/src/lib/gmStaff.ts';
export * as G from '${ROOT_URL}/src/lib/gmDesk.ts';
export { NHL_STAFF_PACK } from '${ROOT_URL}/src/data/gmStaff/packs.ts';
export { nhlContractHost } from '${ROOT_URL}/src/lib/gmContractsHostNhl.ts';
export { leagueNames } from '${ROOT_URL}/src/lib/foNames.ts';
export { NHL_OPENING_RATINGS } from '${ROOT_URL}/src/data/nhlOpeningRatings.ts';
export { NHL_DESK_PANELS, NHL_RECAP_PANELS } from '${ROOT_URL}/src/components/nhl-front-office/NhlGmDesk.tsx';
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
const { E, D, C, P, S, G, NHL_STAFF_PACK, nhlContractHost: HOST, leagueNames, NHL_OPENING_RATINGS } = M;

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
const leagueHash = lg => crypto.createHash('sha1').update(J(lg).replace(/"h[0-9a-z]+-(\d+)"/g, '"h-$1"')).digest('hex');
const TEAM = 'TOR';

/** Every man the user drafted with the desk on: the season of his draft and his age at it. */
const draftedIn = new Map();

/** Draft night as the board runs it: the user takes the best grade he sees, the CPU clubs go in batches. */
function draftNight(lg, team, rng, desk) {
  const mine = lg.teams[team];
  let count = E.nhlDraftCapital(mine) ?? 0;
  let cls = E.nhlDraftClass(rng, Math.max(24, count + 10), leagueNames(lg));
  const level = desk ? S.gmStaffLevel(D.nhlStaffOf(desk, lg, team).block, 'scouting') : 1;
  const grade = pr => (desk ? D.nhlScoutRead(pr, team, lg.season, level) : pr.grade);
  let left = 2;
  let picksLeft = count;
  const aiBatch = () => {
    const order = E.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team);
    cls = E.nhlAiDraftPicks(lg, cls, order, rng).remaining;
    left -= 1;
  };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = [...cls].sort((a, b) => grade(b) - grade(a))[0];
    const round = mine.picks[0];
    if (!E.nhlConsumeDraftPick(mine)) break;
    const p = E.nhlProspectToPlayer(pr, rng, lg.ratingModelVersion);
    if (desk) { D.nhlSignDraftee(p); draftedIn.set(p.id, { season: lg.season, age: p.age }); }
    mine.players.push(p);
    if (desk) desk = D.nhlNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    const batches = nextPicks === 0 ? left : Math.min(1, left);
    for (let i = 0; i < batches; i++) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
  return desk;
}

/** A season with the desk off: the exact calls the board makes on a save from before the desk. */
function seasonOff(lg, team, rng) {
  for (;;) {
    E.simNhlRound(lg, team, rng);
    E.nhlAiMoves(lg, team, rng);
    if (lg.round >= E.NHL_FO_ROUNDS) break;
    lg.round += 1;
  }
  const po = E.runNhlFoPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  draftNight(lg, team, rng, null);
  E.nhlOffseason(lg, rng, team);
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
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
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
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  for (let r = 0; r < 7; r++) { E.simNhlRound(lg, TEAM, rng); E.nhlAiMoves(lg, TEAM, rng); lg.round += 1; }
  const before = J(lg);
  const desk = D.openNhlDesk(lg, TEAM);
  if (J(lg) !== before) fail('openNhlDesk changed the league it opened on');
  if (!desk || desk.v !== 1 || !['contracts', 'picks', 'staff', 'retained'].every(k => k in desk.blocks)) fail(`the opened desk is missing a block: ${J(Object.keys(desk?.blocks ?? {}))}`);
}
console.log(`   ${idCompared} seasons replayed against ${fixture.recordedFrom}`);

/* ================================================================== */
/* Sections 2, 3 and 4 share one walk: ten seasons a seed with the desk on. */
const stats = {
  decisions: 0, gm: 0, auto: 0, earlyDeals: 0, lateTries: 0, lateDeals: 0, retained: 0, pickMoves: 0,
  pickChecks: 0, applyChecks: 0, buyers: 0, sellers: 0,
  drafteesUp: 0, takeGm: 0, takeAuto: 0, sheetPaid: 0, sheetUnpaid: 0, refusalChecks: 0,
};
const problems = { s2: [], s3: [], s4: [] };
const ids = lg => Object.keys(lg.teams);
const rules = () => D.nhlGamePickRules();

/** Every club's pick in every round of every year carried exists exactly once, and every engine list is the ledger's. */
function checkPicks(lg, desk, where) {
  stats.pickChecks++;
  /* The block as stored, not as read: a reader that fails closed would hand
     back a fresh ledger and hide the very loss this check is for. */
  const ledger = desk.blocks[D.NHL_DESK_KEYS.picks];
  if (!P.validateLedger(ledger, ids(lg), rules())) { problems.s4.push(`${where}: the stored pick ledger does not validate`); return; }
  for (const p of P.ledgerProblems(ledger, ids(lg), lg.season, rules())) problems.s4.push(`${where}: ${p}`);
  for (const [abbr, t] of Object.entries(lg.teams)) {
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    const list = [...t.picks].sort((a, b) => a - b);
    if (J(held) !== J(list)) problems.s4.push(`${where}: ${abbr} engine list ${J(list)} but the ledger says ${J(held)}`);
  }
}

const byValue = arr => [...arr].sort((a, b) => E.nhlTradeValue(a) - E.nhlTradeValue(b) || a.id.localeCompare(b.id));

/** One package a round, before the round is played, the way a GM on the hub would: alternately a man and a
    second rounder for their man, and two men for their man and their second rounder. Round 3 keeps half a salary. */
function tryDeal(lg, team, desk, s, where) {
  const r = lg.round;
  const others = ids(lg).filter(k => k !== team).sort();
  const partner = others[(s * 7 + r * 3) % others.length];
  const me = lg.teams[team], them = lg.teams[partner];
  const ledger = D.nhlPicksOf(desk, lg);
  const myPick = P.picksHeldBy(ledger, team).filter(p => p.round === 2).pop();
  const theirPick = P.picksHeldBy(ledger, partner).filter(p => p.round === 2).pop();
  const pkg = r % 2 === 1
    ? { from: team, to: partner, give: [{ kind: 'player', id: byValue(me.players)[0].id }, ...(myPick ? [{ kind: 'pick', key: P.pickKey(myPick) }] : [])], get: [{ kind: 'player', id: byValue(them.players)[0].id }] }
    : { from: team, to: partner, give: byValue(me.players).slice(0, 2).map(p => ({ kind: 'player', id: p.id })), get: [{ kind: 'player', id: byValue(them.players)[0].id }, ...(theirPick ? [{ kind: 'pick', key: P.pickKey(theirPick) }] : [])] };
  if (r === 3) pkg.give[0] = { ...pkg.give[0], retain: 0.5 };
  const open = D.nhlTradeWindow(lg).open;
  /* The board's older trade paths (the phone talks, the trade finder) ask
     nhlDeadlineRefusal; the packages ask the package clock. All three must
     read the same deadline in every round. */
  const refusal = D.nhlDeadlineRefusal(lg);
  stats.refusalChecks++;
  /* What the guide and the hub promise: the break after round 15 is the last
     chance, and once round 16 is played every deal is shut (0.75 of 20
     rounds, NHL_DEADLINE in gmDeadline.ts). `lg.round` is the round about to
     be played. */
  if (open !== (lg.round <= 16)) problems.s3.push(`${where} round ${r}: the window is ${open ? 'open' : 'shut'} with ${lg.round - 1} rounds played, the guide says deals shut once round 16 is played`);
  if ((refusal === null) !== open) problems.s3.push(`${where} round ${r}: the window says ${open ? 'open' : 'shut'} but the trade paths' refusal says ${J(refusal)}`);
  const res = D.nhlProposePackage(lg, desk, team, pkg);
  const yes = res.verdict.verdict === 'accepted';
  if (refusal !== null && res.verdict.step === 1 && res.verdict.reason !== refusal) problems.s3.push(`${where} round ${r}: the package refusal ${J(res.verdict.reason)} is not the trade paths' ${J(refusal)}`);
  if (!open) {
    stats.lateTries++;
    if (yes) { stats.lateDeals++; problems.s3.push(`${where} round ${r}: a deal landed after the deadline (round ${D.nhlTradeWindow(lg).deadlineAfter})`); }
    else if (res.verdict.step !== 1) problems.s3.push(`${where} round ${r}: refused after the deadline, but by step ${res.verdict.step} (${res.verdict.reason}), not the deadline`);
  }
  if (!yes) return desk;
  if (open) stats.earlyDeals++;
  if (pkg.give.some(a => a.retain)) stats.retained++;
  if ([...pkg.give, ...pkg.get].some(a => a.kind === 'pick')) stats.pickMoves++;
  checkPicks(lg, res.desk, `${where} round ${r} deal`);
  return res.desk;
}

/** The GM takes every other case himself, and leaves the rest open for the staff's rule. An offer sheet he
    matches one time and cashes in for the picks the next. */
let sheetTurn = 0;
function gmDecides(lg, team, desk) {
  const ledger = D.deskCopy(D.nhlContractsOf(desk, lg, team));
  C.deskCases(HOST, lg, ledger).forEach((c, i) => {
    if (i % 2 === 1) return;
    let made;
    if (c.restricted?.sheet) made = sheetTurn++ % 2 === 0 ? C.matchSheet(ledger, lg, c) : C.takePicks(ledger, lg, c);
    else if (c.restricted) made = C.tenderHim(ledger, lg, c);
    else if (c.man.ovr >= 76) { made = C.keepAtAsk(ledger, lg, c); if (!made.ok) made = C.letGo(ledger, lg, c); }
    else made = C.letGo(ledger, lg, c);
  });
  return G.withGmBlock(desk, D.NHL_DESK_KEYS.contracts, ledger);
}

const STAYS = new Set(['keep', 'option', 'tender', 'qualify-accepted', 'match']);

/** An offer sheet cashed in: every pick it pays left the club that tabled it and is now yours, and none is made up. */
function checkSheets(lg, team, summer, before, after, where) {
  const takes = summer.applied.filter(d => d.kind === 'take-picks' && d.picks?.length);
  for (const d of takes) {
    if (d.via === 'gm') stats.takeGm++; else stats.takeAuto++;
    const paid = summer.sheetPicks.filter(s => s.id === d.id);
    const at = ids(lg).find(k => k !== team && lg.teams[k].players.some(p => p.id === d.id));
    if (at && paid.length !== d.picks.length) problems.s4.push(`${where}: a sheet signer is at ${at} and ${paid.length} of ${d.picks.length} picks were paid`);
    for (const s of paid) {
      if (!s.key) { stats.sheetUnpaid++; continue; }
      const b = P.findPick(before, s.key), a = P.findPick(after, s.key);
      /* A pick the summer's roll just added is the club's own from birth. */
      const wasTheirs = b ? b.holder === s.club : !!a && a.orig === s.club;
      if (!wasTheirs) problems.s4.push(`${where}: the sheet paid ${s.key}, which ${s.club} did not hold (${b?.holder})`);
      else if (!a || a.holder !== team) problems.s4.push(`${where}: the sheet's pick ${s.key} went to ${a?.holder}, not to you`);
      else stats.sheetPaid++;
    }
  }
  if (summer.sheetPicks.some(s => !takes.some(d => d.id === s.id))) problems.s4.push(`${where}: a pick was paid for a sheet nobody cashed in`);
}

/** A season with the desk on, in the board's order, and the summer through the desk. */
function seasonDesk(lg, team, desk, rng, s, where) {
  for (;;) {
    desk = tryDeal(lg, team, desk, s, where);
    E.simNhlRound(lg, team, rng, D.nhlDeskRoundOptions(desk, lg, team));
    E.nhlAiMoves(lg, team, rng);
    desk = D.nhlDeskAfterRound(desk, lg, team).desk;
    if (lg.round === D.nhlTradeWindow(lg).deadlineAfter) {
      const st = Object.values(D.nhlStances(lg));
      stats.buyers += st.filter(x => x === 'buyer').length;
      stats.sellers += st.filter(x => x === 'seller').length;
    }
    if (lg.round >= E.NHL_FO_ROUNDS) break;
    lg.round += 1;
  }
  const po = E.runNhlFoPlayoffs(lg, rng, D.nhlDeskEdges(desk, lg, team));
  lg.champions.push({ season: lg.season, team: po.champion });
  desk = draftNight(lg, team, rng, desk);
  desk = gmDecides(lg, team, desk);
  const closed = lg.season;
  const up = C.expiringMen(HOST, lg, team).map(m => ({ id: m.id, name: m.name }));
  /* A man drafted with the desk on comes up when his entry level deal has run: the rules' seasons, played. */
  const upIds = new Set(up.map(m => m.id));
  const rosterNow = new Set(lg.teams[team].players.map(p => p.id));
  for (const [id, at] of [...draftedIn]) {
    const played = closed - at.season;
    const want = D.nhlEntryLevelYears(at.age);
    if (!rosterNow.has(id)) { if (played >= want) draftedIn.delete(id); continue; }
    if (upIds.has(id)) {
      stats.drafteesUp++;
      if (played !== want) problems.s2.push(`${where}: a draftee (age ${at.age}) came up after ${played} seasons, his entry level deal is ${want}`);
      draftedIn.delete(id);
    } else if (played >= want) {
      problems.s2.push(`${where}: a draftee (age ${at.age}) has played ${played} seasons and his ${want} season entry level deal has not come up`);
      draftedIn.delete(id);
    }
  }
  const picksB = desk.blocks[D.NHL_DESK_KEYS.picks];
  const summer = D.nhlDeskOffseason(lg, desk, team, rng);
  if (!summer.ok) { problems.s2.push(`${where}: the desk summer refused to run (${summer.lines.join(' ')})`); return desk; }
  desk = summer.desk;
  checkSheets(lg, team, summer, picksB, desk.blocks[D.NHL_DESK_KEYS.picks], where);
  const ledger = D.nhlContractsOf(desk, lg, team);
  const roster = new Set(lg.teams[team].players.map(p => p.id));
  for (const m of up) {
    stats.applyChecks++;
    const d = ledger.decisions.find(x => x.season === closed && x.id === m.id);
    if (!d) { problems.s2.push(`${where}: ${m.name}'s deal ran out with no recorded decision`); continue; }
    stats.decisions++;
    if (d.via === 'gm') stats.gm++; else stats.auto++;
    const retired = summer.notes.some(n => n.includes(`${m.name} retires`));
    if (STAYS.has(d.kind) && !roster.has(m.id) && !retired) problems.s2.push(`${where}: ${m.name} was kept (${d.kind}) but is not on the roster`);
    if (!STAYS.has(d.kind) && roster.has(m.id)) problems.s2.push(`${where}: ${m.name} was let go (${d.kind}) but is still on the roster`);
  }
  /* The board will not play a roster over the limit (Round 968): the GM waives the weakest. */
  const mine = lg.teams[team];
  while (mine.players.length > E.NHL_ROSTER_MAX) {
    const down = byValue(mine.players)[0];
    if (!E.nhlRelease(mine, lg.freeAgents, down.id, lg.ratingModelVersion)) break;
  }
  checkPicks(lg, desk, `${where} summer`);
  return desk;
}

for (const seed of SEEDS) {
  const rng = mulberry32(1000 + seed);
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  let desk = D.openNhlDesk(lg, TEAM);
  checkPicks(lg, desk, `seed ${seed} open`);
  for (let s = 0; s < SEASONS; s++) desk = seasonDesk(lg, TEAM, desk, rng, s, `seed ${seed} season ${s + 1}`);
}

begin('2', 'over ten seasons a seed, no expiring man of yours leaves without a recorded decision, applied as written');
for (const p of problems.s2) fail(p);
if (stats.decisions < T.minDecisions) fail(`only ${stats.decisions} decisions over the walk, floor ${T.minDecisions}`);
if (stats.gm < T.minGm) fail(`only ${stats.gm} decisions by the GM, floor ${T.minGm}`);
if (stats.auto < T.minAuto) fail(`only ${stats.auto} settled by the staff's rule, floor ${T.minAuto}`);
if (stats.drafteesUp < T.minDrafteesUp) fail(`only ${stats.drafteesUp} draftees reached the end of their entry level deal, floor ${T.minDrafteesUp}`);
console.log(`   ${stats.applyChecks} expiring men: ${stats.gm} decided by the GM, ${stats.auto} by the staff's rule; ${stats.drafteesUp} draftees came up after exactly their entry level seasons`);

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
     deadlineBlock asks nhlDeadlineRefusal, the refusal checked above. */
  const raw = overrides.get(path.resolve(FILES.board).toLowerCase()) ?? lf(fs.readFileSync(FILES.board, 'utf8'));
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const body = name => {
    const at = code.indexOf(`  const ${name} = (`);
    if (at < 0) return null;
    const end = code.indexOf('\n  const ', at + 10);
    return code.slice(at, end < 0 ? undefined : end);
  };
  const guard = body('deadlineBlock');
  if (!guard || !guard.includes('nhlDeadlineRefusal(league)')) fail('deadlineBlock no longer asks nhlDeadlineRefusal');
  const paths = { openTradeTalks: 'openTalks(', acceptTalks: 'nhlExecuteTalksTrade(', doShop: 'findTrades(', acceptShopOffer: 'nhlTrade(' };
  let guarded = 0;
  for (const [name, engineCall] of Object.entries(paths)) {
    const b = body(name);
    if (!b) { fail(`the board has no ${name} handler to check`); continue; }
    const g = b.indexOf('deadlineBlock()'), t = b.indexOf(engineCall);
    if (t < 0) fail(`${name} no longer calls ${engineCall}, so this check is reading the wrong handler`);
    else if (g < 0 || g > t) fail(`${name} reaches ${engineCall} without asking deadlineBlock() first`);
    else guarded++;
  }
  console.log(`   ${stats.refusalChecks} rounds where the trade paths' refusal matched the window; ${guarded} of 4 board trade handlers ask the deadline first`);
}

begin('4', 'picks are conserved league wide after every deal and every summer');
for (const p of problems.s4) fail(p);
if (stats.pickMoves < T.minPickMoves) fail(`only ${stats.pickMoves} deals moved a pick, floor ${T.minPickMoves}`);
if (stats.retained < T.minRetained) fail(`only ${stats.retained} deals kept part of a salary, floor ${T.minRetained}`);
if (stats.takeGm < T.minTakeGm) fail(`only ${stats.takeGm} offer sheets cashed in by the GM, floor ${T.minTakeGm}`);
if (stats.sheetPaid < T.minSheetPaid) fail(`only ${stats.sheetPaid} offer sheet picks reached you, floor ${T.minSheetPaid}`);
console.log(`   ${stats.pickChecks} ledger checks, ${stats.pickMoves} deals with a pick in them, ${stats.retained} with salary retained`);
console.log(`   offer sheets cashed in: ${stats.takeGm} by the GM, ${stats.takeAuto} by the staff's rule; ${stats.sheetPaid} picks paid, ${stats.sheetUnpaid} owed by a club with none left`);

/* ================================================================== */
begin('5', "the staff's effects change their consumer at every level step");
const L5 = E.initNhlLeague(mulberry32(5), NHL_OPENING_RATINGS);
const base = S.gmDefaultStaff(NHL_STAFF_PACK.rules, D.nhlStaffCtx(L5, TEAM));
const atLevel = level => {
  const block = { ...base };
  for (const post of NHL_STAFF_PACK.posts) block[post.id] = { ...base[post.id], level, potential: Math.max(level, base[post.id].potential) };
  return block;
};
const rival = L5.teams.BOS, mine5 = L5.teams[TEAM];
const ladder = [];
for (let level = 1; level <= 10; level++) {
  const block = atLevel(level);
  const desk = G.withGmBlock(D.openNhlDesk(L5, TEAM), D.NHL_DESK_KEYS.staff, { block, purse: 8 });
  const opts = D.nhlDeskRoundOptions(desk, L5, TEAM);
  const win = E.nhlWinProb(mine5, rival, opts.edges[TEAM], 0);
  let miss = 0, out = 0;
  const scoutLevel = S.gmStaffLevel(block, 'scouting');
  for (let i = 0; i < 3000; i++) { const t = 70 + (i % 15); miss += Math.abs(D.nhlScoutRead({ id: `p${i}`, trueOvr: t }, TEAM, 2026, scoutLevel) - t); }
  for (let i = 0; i < 4000; i++) out += opts.injuryRounds(TEAM, { id: `i${i}` }, 3);
  ladder.push({ level, edge: opts.edges[TEAM], win, miss: miss / 3000, out: out / 4000 });
}
if (Math.abs(ladder[0].win - E.nhlWinProb(mine5, rival)) > 1e-12) fail(`a level 1 staff moves the game: ${ladder[0].win} against ${E.nhlWinProb(mine5, rival)} with no desk`);
for (let i = 1; i < ladder.length; i++) {
  const a = ladder[i - 1], b = ladder[i];
  if (!(b.win > a.win)) fail(`level ${a.level} to ${b.level}: the win probability did not rise (${a.win.toFixed(4)} to ${b.win.toFixed(4)})`);
  if (!(b.miss < a.miss)) fail(`level ${a.level} to ${b.level}: the scouting miss did not shrink (${a.miss.toFixed(3)} to ${b.miss.toFixed(3)})`);
  if (!(b.out < a.out)) fail(`level ${a.level} to ${b.level}: an injury did not get shorter (${a.out.toFixed(3)} to ${b.out.toFixed(3)})`);
}
/* Each post on its own (review round 1): every other chair at level 1, this
   one up the ladder. A post whose effect reaches nothing hides inside the
   all posts ladder above (gmStaffEffect reads a key it does not know as
   nothing), so each post must move its own consumer at every step, and an
   edge post must reach the strength by exactly its weight: the engine's own
   nhlStrength weights, and a fifth for special teams as its panel says. */
const WEIGHTS = { offEdge: 0.5, defEdge: 0.3, goalieEdge: 0.2, specialTeamsEdge: D.NHL_SPECIAL_TEAMS_WEIGHT };
const postLines = [];
for (const post of NHL_STAFF_PACK.posts) {
  const keys = post.effects.map(x => x.key);
  const edgeKeys = keys.filter(k => k in WEIGHTS);
  const consumer = edgeKeys.length ? 'win' : keys.includes('scoutSpread') ? 'miss' : keys.includes('injuryWeeks') ? 'out' : null;
  if (!consumer) { fail(`the ${post.id} post's effects ${J(keys)} reach no consumer this harness knows`); continue; }
  const vals = [];
  for (let level = 1; level <= 10; level++) {
    const block = atLevel(1);
    block[post.id] = { ...base[post.id], level, potential: Math.max(level, base[post.id].potential) };
    const edge = D.nhlStaffEdge(block);
    const want = edgeKeys.reduce((s, k) => s + S.gmStaffEffect(NHL_STAFF_PACK, block, k) * WEIGHTS[k], 0);
    if (Math.abs(edge - want) > 1e-9) fail(`${post.id} at level ${level}: the staff edge is ${edge.toFixed(3)}, its own effects at their weights make ${want.toFixed(3)}`);
    let v = 0;
    if (consumer === 'win') v = E.nhlWinProb(mine5, rival, edge, 0);
    else if (consumer === 'miss') {
      const lv = S.gmStaffLevel(block, 'scouting');
      for (let i = 0; i < 3000; i++) { const t = 70 + (i % 15); v += Math.abs(D.nhlScoutRead({ id: `p${i}`, trueOvr: t }, TEAM, 2026, lv) - t) / 3000; }
    } else for (let i = 0; i < 4000; i++) v += D.nhlInjuryRounds(block, TEAM, 2026, 1, `i${i}`, 3) / 4000;
    if (vals.length && !(consumer === 'win' ? v > vals.at(-1) : v < vals.at(-1))) fail(`${post.id} alone, level ${level - 1} to ${level}: the ${consumer} did not move (${vals.at(-1).toFixed(4)} to ${v.toFixed(4)})`);
    vals.push(v);
  }
  postLines.push(`${post.id} ${consumer} ${vals[0].toFixed(3)} to ${vals[9].toFixed(3)}`);
}
console.log(`   each post alone: ${postLines.join('; ')}`);
{
  /* The other clubs never feel the user's staff. */
  const opts = D.nhlDeskRoundOptions(G.withGmBlock(D.openNhlDesk(L5, TEAM), D.NHL_DESK_KEYS.staff, { block: atLevel(10), purse: 8 }), L5, TEAM);
  if (Object.keys(opts.edges).join() !== TEAM) fail(`the desk hands an edge to ${J(Object.keys(opts.edges))}`);
  if (opts.injuryRounds('BOS', { id: 'x' }, 3) !== 3) fail('the user trainer shortened a rival injury');
}
console.log(`   edge ${ladder[0].edge.toFixed(2)} to ${ladder[9].edge.toFixed(2)}, win ${ladder[0].win.toFixed(3)} to ${ladder[9].win.toFixed(3)}, miss ${ladder[0].miss.toFixed(2)} to ${ladder[9].miss.toFixed(2)}, rounds out ${ladder[0].out.toFixed(2)} to ${ladder[9].out.toFixed(2)}`);

/* ================================================================== */
begin('6', 'migration keeps every marker, a corrupt block resets alone, retained salary holds its figure and its limits');
{
  const lg = E.initNhlLeague(mulberry32(6), NHL_OPENING_RATINGS);
  lg.teams.BOS.picks = [1]; lg.teams.MTL.picks = [1, 2, 2]; lg.teams.CHI.picks = [];
  const desk = D.openNhlDesk(lg, TEAM);
  const ledger = D.nhlPicksOf(desk, lg);
  let markers = 0;
  for (const [abbr, t] of Object.entries(lg.teams)) {
    markers += t.picks.length;
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    if (J(held) !== J([...t.picks].sort((a, b) => a - b))) fail(`migration: ${abbr} held ${J(t.picks)} and the ledger gives it ${J(held)}`);
  }
  if (P.picksHeldBy(ledger, TEAM).length === 0 || markers !== ledger.picks.filter(p => p.year === lg.season).length) fail(`migration: ${markers} markers on the old lists, ${ledger.picks.filter(p => p.year === lg.season).length} picks this year in the ledger`);
  const broken = G.withGmBlock(desk, D.NHL_DESK_KEYS.picks, { v: 7 });
  if (D.nhlContractsOf(broken, lg, TEAM) !== desk.blocks.contracts) fail('a corrupt picks block took the contracts block with it');
  if (D.nhlStaffOf(broken, lg, TEAM) !== desk.blocks.staff) fail('a corrupt picks block took the staff block with it');
  if (!P.validateLedger(D.nhlPicksOf(broken, lg), Object.keys(lg.teams), D.nhlGamePickRules())) fail('a corrupt picks block did not come back as a sound fresh one');

  /* Retained salary: half of a man's salary stays on the club that sent him, at full figure while his deal runs. */
  let d = desk;
  const deal = (give, retain) => {
    const partner = ['BUF', 'DET', 'FLA', 'OTT'][d.blocks.retained.length % 4];
    const them = lg.teams[partner];
    return D.nhlProposePackage(lg, d, TEAM, { from: TEAM, to: partner, give: [{ kind: 'player', id: give.id, retain }], get: [{ kind: 'player', id: byValue(them.players)[0].id }] });
  };
  const sendable = () => [...lg.teams[TEAM].players].filter(p => p.years >= 2).sort((a, b) => E.nhlTradeValue(b) - E.nhlTradeValue(a));
  {
    /* A contract can be retained on twice at most (NHL_TRADE_RULES), counted per contract, on a copy of the league. */
    const y = sendable()[0];
    const row = club => ({ club, playerId: y.id, name: y.name, share: 0.5, kept: 1 });
    const tryWith = rows => {
      const lc = JSON.parse(J(lg));
      const dk = G.withGmBlock(desk, D.NHL_DESK_KEYS.retained, rows);
      return D.nhlProposePackage(lc, dk, TEAM, { from: TEAM, to: 'FLA', give: [{ kind: 'player', id: y.id, retain: 0.5 }], get: [{ kind: 'player', id: byValue(lc.teams.FLA.players)[0].id }] }).verdict;
    };
    const twice = tryWith([row('BUF'), row('DET')]);
    if (twice.verdict !== 'invalid' || !String(twice.reason).includes('as often as the league allows')) fail(`a contract already retained on twice was retained on a third time: ${J(twice)}`);
    const once = tryWith([row('BUF')]);
    if (once.verdict !== 'accepted') fail(`a contract retained on once could not be retained on again: ${J(once)}`);
  }
  const over = deal(sendable()[0], 0.6);
  if (over.verdict.verdict !== 'invalid' || over.verdict.step !== 3) fail(`retaining 60 percent was not refused by the league's rule: ${J(over.verdict)}`);
  const first = sendable()[0];
  const salary = first.salary;
  const res1 = deal(first, 0.5);
  if (res1.verdict.verdict !== 'accepted') fail(`a star for a fourth liner with half retained was refused: ${J(res1.verdict)}`);
  else {
    d = res1.desk;
    const kept = Math.round(salary * 0.5 * 10) / 10;
    const entry = (lg.teams[TEAM].deadCap ?? []).find(x => x.playerId === first.id);
    if (!entry || entry.amount !== kept) fail(`the sending club carries ${J(entry)} for ${first.name}, wanted ${kept}`);
    const moved = Object.values(lg.teams).flatMap(t => t.players).find(p => p.id === first.id);
    if (!moved || Math.abs(moved.salary - (salary - kept)) > 0.051) fail(`${first.name} costs his new club ${moved?.salary}, wanted ${salary - kept}`);
    for (let i = 0; i < 2; i++) { const r = deal(sendable()[0], 0.5); if (r.verdict.verdict === 'accepted') d = r.desk; else fail(`retained deal ${i + 2} of 3 refused: ${r.verdict.reason}`); }
    const fourth = deal(sendable()[0], 0.5);
    if (fourth.verdict.verdict !== 'invalid' || !String(fourth.verdict.reason).includes('retained contracts')) fail(`a fourth retained deal was not refused by the three deal limit: ${J(fourth.verdict)}`);
    const yearsLeft = moved ? moved.years : 0;
    const summer = D.nhlDeskOffseason(lg, d, TEAM, mulberry32(66));
    const after = (lg.teams[TEAM].deadCap ?? []).find(x => x.playerId === first.id);
    if (!summer.ok) fail('the desk summer refused to run in the retention walk');
    else if (yearsLeft >= 2 && (!after || after.amount !== kept)) fail(`after a summer the retained line reads ${J(after)}, wanted ${kept} again`);
    else if (yearsLeft < 2 && after) fail(`a retained line outlived the deal it was on: ${J(after)}`);
  }
}

/* ================================================================== */
begin('7', 'every desk panel draws, and the re-sign desk shows a tile for every expiring man');
{
  const { NHL_DESK_PANELS, NHL_RECAP_PANELS, GmDeskMount, render } = M;
  const rng = mulberry32(77);
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  let desk = D.openNhlDesk(lg, TEAM);
  /* One season on, so somebody's deal is running out. */
  desk = seasonDesk(lg, TEAM, desk, rng, 0, 'render walk');
  const facts = { teamId: TEAM, teamLabel: TEAM, seasonsPlayed: 1, phase: 'hub', hub: {}, league: lg, seasonOver: false, deskOn: true, clubName: x => x, say: () => {}, commit: () => {} };
  const props = { sport: { key: 'nhl' }, desk, facts, onDesk: () => {}, onBack: () => {} };
  const marks = { staff: 'data-nhl-desk-staff', contracts: 'data-resign-desk', picks: 'data-gm-picks', deals: 'data-nhl-desk-deals' };
  for (const p of NHL_DESK_PANELS) {
    let html = '';
    try { html = render(p.Panel, props); } catch (e) { fail(`the ${p.key} panel threw: ${String(e).slice(0, 160)}`); continue; }
    if (!html.includes(marks[p.key])) fail(`the ${p.key} panel drew without its ${marks[p.key]} mark`);
  }
  const cases = C.deskCases(HOST, lg, D.nhlContractsOf(desk, lg, TEAM)).length;
  const html = render(NHL_DESK_PANELS.find(p => p.key === 'contracts').Panel, props);
  const tiles = (html.match(/data-resign-tile=/g) ?? []).length;
  if (cases === 0) fail('nobody is expiring a season in, so the re-sign tiles were not drawn at all');
  if (tiles !== cases) fail(`${cases} expiring men and ${tiles} tiles on the re-sign desk`);
  const hub = render(GmDeskMount, { sport: 'nhl', desk, facts, panels: NHL_DESK_PANELS, open: null, onOpen: () => {}, onDesk: () => {} });
  if ((hub.match(/<button/g) ?? []).length < NHL_DESK_PANELS.length) fail(`the hub drew ${(hub.match(/<button/g) ?? []).length} desk boxes for ${NHL_DESK_PANELS.length} panels`);
  if (NHL_RECAP_PANELS.length !== 1 || NHL_RECAP_PANELS[0].key !== 'contracts') fail('the recap mounts more than the re-sign desk');
  /* The deal box past the deadline: shut with the desk on; on a save without it the phone still deals, so it must not say shut. */
  const deals = NHL_DESK_PANELS.find(p => p.key === 'deals');
  const late = { ...facts, league: { ...lg, round: 18 } };
  if (deals.tile({ desk, facts: late }).value !== 'Deadline passed') fail(`with the desk on, the deal box at round 18 reads ${J(deals.tile({ desk, facts: late }).value)}`);
  if (deals.tile({ desk, facts: { ...late, deskOn: false } }).value === 'Deadline passed') fail('a save without the desk reads Deadline passed while its phone and trade finder still deal');
  console.log(`   4 panels drawn, ${tiles} re-sign tiles for ${cases} expiring men`);
}

/* ================================================================== */
const failed = [...failedIn.values()].reduce((s, n) => s + n, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const red = [...failedIn.keys()];
  console.log(`control ${CONTROL}: red in ${J(red)}, wanted ${want}`);
  if (!red.includes(want)) { console.error(`simNhlGmDesk: CONTROL ${CONTROL} DID NOT FIRE in check ${want}`); process.exit(1); }
  console.log(`simNhlGmDesk: control ${CONTROL} fired (${failed} failures, as it should)`);
  process.exit(0);
}
if (failed) { console.error(`simNhlGmDesk: ${failed} failure(s) in ${J([...failedIn.keys()])}`); process.exit(1); }
console.log(`simNhlGmDesk: all seven checks passed (${SEEDS.length} seeds x ${SEASONS} seasons)`);


