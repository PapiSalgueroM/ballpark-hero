/**
 * Round 82 harness: the Trade Finder across all four Front Office GM sims.
 * Asserts what tsc can't:
 *  - findTrades NEVER mutates the league it probes
 *  - every listed offer, executed on the same league state with the sport's
 *    real trade function, is accepted (the no-stale-offer guarantee)
 *  - offers are ranked by gain, pickless deals preferred over pick deals
 *  - at most one offer per franchise, capped at maxOffers
 *  - unknown player/team inputs return empty, never throw
 *  - a full shop across a league finishes fast (well under a second)
 *  - Round 829 review: every shop returns exactly what the oracle below
 *    returns (each probe on its own fresh copy). Control:
 *    TF_CONTROL=sharedclone (one copy a club, shared by its probes) must
 *    turn it red; before the oracle that mutation passed every check here.
 * Run: node scripts/simTradeFinder.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'tfSimEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'tfSim.bundle.mjs');

/* Round 829 review: TF_CONTROL=sharedclone bundles a copy of the finder that
   parses each club once and probes every man on that one copy, so a trade
   accepted early leaves the copy changed for every probe after it. That
   passed every check below until the oracle check (section "same as the
   oracle") was added; the control must turn it red. */
const TF_CONTROL = process.env.TF_CONTROL || '';
let finderPath = `${ROOT.replaceAll('\\', '/')}/src/lib/tradeFinder.ts`;
if (TF_CONTROL) {
  if (TF_CONTROL !== 'sharedclone') { console.error(`TF_CONTROL=${TF_CONTROL} is not a control this harness knows (sharedclone)`); process.exit(1); }
  let src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'tradeFinder.ts'), 'utf8').split('\r\n').join('\n');
  const swaps = [
    ['    const theirJson = JSON.stringify(theirTeam);\n', '    const theirJson = JSON.stringify(theirTeam);\n    const myClone = JSON.parse(myJson) as T;\n    const theirClone = JSON.parse(theirJson) as T;\n'],
    ['        const myClone = JSON.parse(myJson) as T;\n        const theirClone = JSON.parse(theirJson) as T;\n', ''],
  ];
  for (const [now] of swaps) if (!src.includes(now)) { console.error(`control ${TF_CONTROL}: ${JSON.stringify(now.slice(0, 60))} is not in tradeFinder.ts, so it would change nothing. Refusing to run.`); process.exit(1); }
  for (const [now, was] of swaps) src = src.split(now).join(was);
  finderPath = path.join(os.tmpdir(), 'tfSimFinderControl.ts').replaceAll('\\', '/');
  fs.writeFileSync(finderPath, src);
  console.log(`   control ${TF_CONTROL}: bundling an edited copy of the finder`);
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const finder = await import('${finderPath}');
const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaFrontOffice.ts');
const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbFrontOffice.ts');
const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nhlFrontOffice.ts');
const nfl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/frontOffice.ts');
export { finder, nba, mlb, nhl, nfl };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { finder, nba, mlb, nhl, nfl } = await import(pathToFileURL(BUNDLE).href);
const { findTrades } = finder;

let failures = 0, oracleMisses = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };

/* Round 829 review: THE ORACLE. The finder's contract written out the slow
   way: every probe on its own fresh copy of the league as it stands, the
   pickless deal before the sweetened one, a club's single best accepted
   gain (first wins a tie), best gain first. The finder may be as clever as
   it likes about copying; what it returns must be exactly this. Measured
   against origin/main's finder before Round 829 changed how it copies: 25
   seeds a sport, all four sports, identical. */
function oracle(teams, myTeamId, myPlayerId, cap, tradeFn, valueFn, maxOffers = 4, pickPenalty = 8) {
  const myTeam = teams[myTeamId];
  const mine = myTeam?.players.find(p => p.id === myPlayerId);
  if (!myTeam || !mine) return [];
  const offers = [];
  for (const [teamId, theirTeam] of Object.entries(teams)) {
    if (teamId === myTeamId) continue;
    let best = null;
    for (const target of [...theirTeam.players].sort((a, b) => b.ovr - a.ovr)) {
      for (const sweeten of [false, true]) {
        if (sweeten && myTeam.picks.length === 0) continue;
        const fresh = JSON.parse(JSON.stringify({ my: myTeam, their: theirTeam }));
        if (tradeFn(fresh.my, fresh.their, myPlayerId, target.id, sweeten, cap) === 'accepted') {
          const gain = valueFn(target) - valueFn(mine) - (sweeten ? pickPenalty : 0);
          if (!best || gain > best.gain) best = { teamId, playerId: target.id, playerName: target.name, playerPos: target.pos, playerOvr: target.ovr, playerAge: target.age, playerSalary: target.salary, sweeten, gain: Math.round(gain * 10) / 10 };
          break;
        }
      }
    }
    if (best) offers.push(best);
  }
  return offers.sort((a, b) => b.gain - a.gain).slice(0, maxOffers);
}
const mulberry = seed => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SPORTS = [
  { name: 'NBA', init: () => nba.initNbaLeague(mulberry(7)), tradeFn: nba.nbaTrade, valueFn: nba.nbaTradeValue },
  { name: 'MLB', init: () => mlb.initMlbLeague(mulberry(7)), tradeFn: mlb.mlbTrade, valueFn: mlb.mlbTradeValue },
  { name: 'NHL', init: () => nhl.initNhlLeague(mulberry(7)), tradeFn: nhl.nhlTrade, valueFn: nhl.nhlTradeValue },
  { name: 'NFL', init: () => nfl.initLeague(mulberry(7)), tradeFn: nfl.proposeTrade, valueFn: nfl.tradeValue },
];

for (const sport of SPORTS) {
  console.log(`── ${sport.name} ──`);
  let league;
  try {
    league = sport.init();
  } catch (e) {
    fail(`${sport.name}: league init crashed: ${e}`);
    continue;
  }
  const teamIds = Object.keys(league.teams);
  const myTeam = teamIds[0];
  const snapshot = JSON.stringify(league);
  let offersSeen = 0, accepted = 0, shops = 0, oracleMs = 0;
  const missesBefore = oracleMisses;
  const t0 = Date.now();

  for (const player of [...league.teams[myTeam].players].sort((a, b) => b.ovr - a.ovr).slice(0, 8)) {
    shops++;
    const offers = findTrades(league.teams, myTeam, player.id, league.cap, sport.tradeFn, sport.valueFn);
    if (JSON.stringify(league) !== snapshot) { fail(`${sport.name}: findTrades MUTATED the league (shopping ${player.name})`); break; }
    /* Round 829 review: exactly the oracle's list, offer for offer */
    const oracleStart = Date.now();
    const want = oracle(league.teams, myTeam, player.id, league.cap, sport.tradeFn, sport.valueFn);
    oracleMs += Date.now() - oracleStart;
    if (JSON.stringify(offers) !== JSON.stringify(want)) { oracleMisses += 1; fail(`${sport.name}: shopping ${player.name}, the finder's offers are not the oracle's (${offers.map(o => o.playerName).join(', ')} against ${want.map(o => o.playerName).join(', ')})`); }
    // ranking + per-team uniqueness
    for (let i = 1; i < offers.length; i++) if (offers[i].gain > offers[i - 1].gain) fail(`${sport.name}: offers not sorted by gain`);
    const teams = offers.map(o => o.teamId);
    if (new Set(teams).size !== teams.length) fail(`${sport.name}: multiple offers from one franchise`);
    if (offers.length > 4) fail(`${sport.name}: more than maxOffers`);
    offersSeen += offers.length;
    // the no-stale-offer guarantee: execute each on a fresh clone of the SAME state
    for (const o of offers) {
      const lg = JSON.parse(JSON.stringify(league));
      const res = sport.tradeFn(lg.teams[myTeam], lg.teams[o.teamId], player.id, o.playerId, o.sweeten, lg.cap);
      if (res !== 'accepted') fail(`${sport.name}: listed offer ${o.teamId}/${o.playerName} came back ${res}`);
      else {
        accepted++;
        if (!lg.teams[myTeam].players.some(p => p.id === o.playerId)) fail(`${sport.name}: accepted player did not arrive`);
        if (lg.teams[myTeam].players.some(p => p.id === player.id)) fail(`${sport.name}: shopped player did not leave`);
        if (o.sweeten && lg.teams[myTeam].picks.length !== league.teams[myTeam].picks.length - 1) fail(`${sport.name}: sweetened deal did not cost a pick`);
        if (!o.sweeten && lg.teams[myTeam].picks.length !== league.teams[myTeam].picks.length) fail(`${sport.name}: pickless deal cost a pick`);
      }
    }
  }
  /* the oracle's own slow copies are not the finder's time */
  const ms = Date.now() - t0 - oracleMs;
  console.log(`   ${shops} players shopped, ${offersSeen} offers, ${accepted} executed clean, ${ms}ms total (the oracle took ${oracleMs}ms more and agreed on ${shops - (oracleMisses - missesBefore)} of ${shops})`);
  if (ms > 3000) fail(`${sport.name}: shopping too slow (${ms}ms)`);
  if (offersSeen === 0) fail(`${sport.name}: zero offers for the entire top 8, market is dead`);

  // garbage inputs never throw
  try {
    if (findTrades(league.teams, myTeam, 'no-such-player', league.cap, sport.tradeFn, sport.valueFn).length !== 0) fail(`${sport.name}: unknown player should return []`);
    if (findTrades(league.teams, 'ZZZ', 'x', league.cap, sport.tradeFn, sport.valueFn).length !== 0) fail(`${sport.name}: unknown team should return []`);
  } catch (e) {
    fail(`${sport.name}: garbage input threw: ${e}`);
  }
}

if (TF_CONTROL) {
  console.log(`\ncontrol ${TF_CONTROL}: ${oracleMisses} shops differ from the oracle`);
  if (oracleMisses === 0) { console.log(`FAIL: control ${TF_CONTROL} did not fire`); process.exit(1); }
  console.log(`simTradeFinder: control ${TF_CONTROL} fired as designed`);
  process.exit(0);
}
console.log(failures === 0 ? '\nALL TRADE FINDER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
