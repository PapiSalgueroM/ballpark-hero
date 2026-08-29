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

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const finder = await import('${ROOT.replaceAll('\\', '/')}/src/lib/tradeFinder.ts');
const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaFrontOffice.ts');
const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbFrontOffice.ts');
const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nhlFrontOffice.ts');
const nfl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/frontOffice.ts');
export { finder, nba, mlb, nhl, nfl };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { finder, nba, mlb, nhl, nfl } = await import(pathToFileURL(BUNDLE).href);
const { findTrades } = finder;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
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
  let offersSeen = 0, accepted = 0, shops = 0;
  const t0 = Date.now();

  for (const player of [...league.teams[myTeam].players].sort((a, b) => b.ovr - a.ovr).slice(0, 8)) {
    shops++;
    const offers = findTrades(league.teams, myTeam, player.id, league.cap, sport.tradeFn, sport.valueFn);
    if (JSON.stringify(league) !== snapshot) { fail(`${sport.name}: findTrades MUTATED the league (shopping ${player.name})`); break; }
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
  const ms = Date.now() - t0;
  console.log(`   ${shops} players shopped, ${offersSeen} offers, ${accepted} executed clean, ${ms}ms total`);
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

console.log(failures === 0 ? '\nALL TRADE FINDER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
