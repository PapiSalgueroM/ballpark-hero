/**
 * Round 158 harness: the live viewer's contract with the engine.
 *
 * The viewer is theatre on top of the sim, and the one thing that must hold
 * is that the theatre and the report are the SAME match. That rests on three
 * engine guarantees this file pins:
 *
 *  1. Kick off commits the first half's scorers (names, minutes 1-45, ids
 *     from the starting XI) onto LiveMatch, sized exactly to the halftime
 *     score, for both sides.
 *  2. The full time report REUSES those exact lines: same names, same
 *     minutes, in order, with the second half's added on top at 46-90.
 *  3. Season stats are credited once. A watched match and a quick simmed
 *     match move seasonGoals by exactly the match's goals, never double.
 *
 * Plus the fallback: a paused save from before Round 158 (no h1 lines on
 * live) must still resolve cleanly with half-respecting minutes.
 * Run: node scripts/simLiveSim.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/cmLiveEntry.mjs';
const BUNDLE = '/tmp/cmLive.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const cm = (await import(BUNDLE)).engine;
const { startCareer, playNextEntry, resumeMatch } = cm;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };

const seasonGoalsOf = (state) => state.squad.reduce((s, p) => s + (p.seasonGoals ?? 0), 0);

/* ---------- 1. Kick off commits a truthful first half ---------- */
console.log('1) Kick off commits the first half scorers');
let state = startCareer('Aston Villa');
let checked = 0;
let guard = 0;
while (checked < 8 && state.week < state.calendar.length && guard < 40) {
  guard += 1;
  const res = playNextEntry(state);
  state = res.state;
  if (res.kind === 'window') continue;
  if (res.kind === 'seasonOver') break;
  if (res.kind !== 'halftime' || !state.live) continue;

  const live = state.live;
  if (!Array.isArray(live.h1My)) { fail('live match carries no h1My lines'); break; }
  if (!Array.isArray(live.h1Opp)) { fail('live match carries no h1Opp lines'); break; }
  if (live.h1My.length !== live.myGoals) fail(`h1My holds ${live.h1My.length} lines for a ${live.myGoals} goal half`);
  if (live.h1Opp.length !== live.oppGoals) fail(`h1Opp holds ${live.h1Opp.length} lines for a ${live.oppGoals} goal half`);
  const startSet = new Set(live.startXi);
  for (const sc of live.h1My) {
    if (sc.minute < 1 || sc.minute > 45) fail(`h1 scorer minute ${sc.minute} outside the first half`);
    if (!startSet.has(sc.id)) fail(`h1 scorer ${sc.name} is not in the starting XI`);
  }
  for (const sc of live.h1Opp) {
    if (sc.minute < 1 || sc.minute > 45) fail(`opp h1 minute ${sc.minute} outside the first half`);
  }

  /* ---------- 2. Full time reuses the committed lines ---------- */
  const before = seasonGoalsOf(state);
  const preMy = live.h1My.map(l => `${l.name}@${l.minute}`);
  const preOpp = live.h1Opp.map(l => `${l.name}@${l.minute}`);
  const done = resumeMatch(state);
  state = done.state;
  const rep = done.report;
  if (!rep) { fail('resumeMatch returned no report'); break; }
  const myGoals = rep.myScorers.length;
  const gotMyH1 = rep.myScorers.filter(sc => sc.minute <= 45).map(l => `${l.name}@${l.minute}`);
  const gotOppH1 = rep.oppScorers.filter(sc => sc.minute <= 45).map(l => `${l.name}@${l.minute}`);
  if (gotMyH1.join('|') !== preMy.join('|')) {
    fail(`the report rewrote my first half: committed [${preMy}], reported [${gotMyH1}]`);
  }
  if (gotOppH1.join('|') !== preOpp.join('|')) {
    fail(`the report rewrote their first half: committed [${preOpp}], reported [${gotOppH1}]`);
  }
  for (const sc of rep.myScorers.filter(sc => sc.minute > 45)) {
    if (sc.minute < 46 || sc.minute > 90) fail(`second half minute ${sc.minute} out of range`);
  }

  /* ---------- 3. Stats credited exactly once ---------- */
  const after = seasonGoalsOf(state);
  if (after - before !== myGoals) {
    fail(`a ${myGoals} goal match moved seasonGoals by ${after - before}`);
  }
  checked += 1;
}
if (checked < 6) fail(`only ${checked} watched matches exercised`);
console.log(`   ${checked} watched matches: first halves reused verbatim, stats credited once`);

/* ---------- 4. The pre-158 paused save still resolves ---------- */
console.log('2) A paused save from before the h1 lines existed');
{
  let s = startCareer('Everton');
  let g2 = 0;
  while (g2 < 30 && s.week < s.calendar.length) {
    g2 += 1;
    const res = playNextEntry(s);
    s = res.state;
    if (res.kind === 'halftime' && s.live) break;
    if (res.kind === 'seasonOver') break;
  }
  if (!s.live) fail('never reached an interval on the fallback path');
  else {
    // Strip the Round 157/158 fields the old save never had.
    delete s.live.h1My;
    delete s.live.h1Opp;
    delete s.live.lamMine;
    delete s.live.lamOpp;
    const htMy = s.live.myGoals;
    const htOpp = s.live.oppGoals;
    const done = resumeMatch(s);
    const rep = done.report;
    if (!rep) fail('old-shape live match did not resolve');
    else {
      if (!rep.detail) fail('old-shape live match produced no detail block');
      const h1MyLines = rep.myScorers.filter(sc => sc.minute <= 45).length;
      const h1OppLines = rep.oppScorers.filter(sc => sc.minute <= 45).length;
      if (h1MyLines !== htMy) fail(`fallback: ${htMy} first half goals but ${h1MyLines} first half scorer minutes`);
      if (h1OppLines !== htOpp) fail(`fallback: their ${htOpp} first half goals but ${h1OppLines} first half minutes`);
    }
  }
}

if (failures > 0) {
  console.error(`simLiveSim: ${failures} FAILURES`);
  process.exit(1);
}
console.log('simLiveSim: all green');
