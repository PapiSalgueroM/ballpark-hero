/**
 * Round 91 harness: does the Conquest strategy layer actually change the game?
 * A feature that exists but never bites is worse than no feature, so this
 * measures behaviour, not just wiring:
 *  - ratings still decide most games (the layer must not drown skill)
 *  - runaway superpowers get checked (overextension is real)
 *  - landless teams genuinely recover sometimes (last stand is real)
 *  - the swing is always inside its cap, and probabilities stay legal
 * Run: node scripts/simConquest.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/cqEntry.mjs';
const BUNDLE = '/tmp/cq.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const imp = await import('${ROOT}/src/lib/imperialism.ts');
const mom = await import('${ROOT}/src/lib/conquestMomentum.ts');
export { imp, mom };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { imp, mom } = await import(BUNDLE);
const { seedEmpires, randomPairings, resolveGame, empireCounts, landlessTeams, statesOf, emptyRecords, applyRecords, homeWinProb, REGULAR_WEEKS } = imp;
const { momentumAdjust, applyMomentum, MAX_SWING } = mom;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const mulberry = s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ---------- 1. The swing is bounded and legal ---------- */
console.log('1) Swing stays inside its cap');
{
  let worst = 0, illegal = 0;
  for (let i = 0; i < 20000; i++) {
    const total = 100;
    const h = Math.floor(Math.random() * 101);
    const a = Math.floor(Math.random() * (101 - h));
    const ctx = { homeLand: h, awayLand: a, totalLand: total, homeStreak: Math.floor(Math.random() * 17) - 8, awayStreak: Math.floor(Math.random() * 17) - 8 };
    const adj = momentumAdjust(ctx);
    worst = Math.max(worst, Math.abs(adj));
    const p = applyMomentum(0.5, ctx);
    if (p < 0.05 || p > 0.95 || !Number.isFinite(p)) illegal++;
  }
  console.log(`   worst swing ${worst.toFixed(3)} (cap ${MAX_SWING})`);
  if (worst > MAX_SWING + 1e-9) fail(`swing ${worst} exceeded cap`);
  if (illegal > 0) fail(`${illegal} illegal probabilities`);
  if (worst < 0.05) fail('layer is too weak to ever matter');
}

/* ---------- 2. Overextension actually checks a superpower ---------- */
console.log('2) Overextension penalises the runaway leader');
{
  const total = 100;
  const evenly = momentumAdjust({ homeLand: 20, awayLand: 20, totalLand: total });
  const growing = momentumAdjust({ homeLand: 40, awayLand: 20, totalLand: total });
  const bloated = momentumAdjust({ homeLand: 85, awayLand: 5, totalLand: total });
  console.log(`   even ${evenly.toFixed(3)} | growing ${growing.toFixed(3)} | bloated ${bloated.toFixed(3)}`);
  if (Math.abs(evenly) > 1e-9) fail('equal empires should be neutral');
  if (growing <= 0) fail('a growing empire should carry momentum');
  if (bloated >= growing) fail('an overextended superpower should be WORSE off than a healthy grower');
}

/* ---------- 3. Last stand is real ---------- */
console.log('3) Landless teams fight harder');
{
  const total = 100;
  const landless = momentumAdjust({ homeLand: 0, awayLand: 30, totalLand: total });
  const tiny = momentumAdjust({ homeLand: 3, awayLand: 30, totalLand: total });
  console.log(`   landless ${landless.toFixed(3)} vs nearly-landless ${tiny.toFixed(3)}`);
  if (landless <= tiny) fail('a landless team should get the desperation bump');
}

/* ---------- 4. Ratings still dominate ---------- */
console.log('4) Ratings still decide most games');
{
  // Best vs worst, worst holding a big empire: the good team should still win most.
  const strongFav = homeWinProb('KC', 'CAR');
  // A healthy (not overextended) rival empire is the case where the map bites
  // hardest; a bloated 60 percent empire is deliberately self-cancelling.
  const withMap = homeWinProb('KC', 'CAR', { homeLand: 0, awayLand: 40, totalLand: 100, awayStreak: 4 });
  console.log(`   KC over CAR: ${strongFav.toFixed(3)} raw -> ${withMap.toFixed(3)} vs a healthy rival empire`);
  if (withMap <= 0.5) fail('the map should tilt games, not invert them');
  if (Math.abs(strongFav - withMap) < 0.02) fail('the map made no difference at all');
}

/* ---------- 5. Full seasons: the map churns instead of snowballing ---------- */
console.log('5) 40 seeded seasons');
{
  let wipeoutsRecovered = 0, seasonsWithLateDrama = 0, crashed = 0, champs = new Set();
  for (let s = 0; s < 40; s++) {
    try {
      const rng = mulberry(1000 + s);
      const owners = seedEmpires();
      // The real board pairs EVERY team each week (NFL_TEAMS), landless
      // included, which is what makes the last stand rule reachable.
      const teamIds = [...new Set(Object.values(seedEmpires()))];
      let records = emptyRecords(teamIds);
      let everLandless = new Set();
      let leaderAtHalf = null;
      for (let w = 1; w <= REGULAR_WEEKS; w++) {
        const pairs = randomPairings(teamIds, rng);
        const games = [];
        for (const [h, a] of pairs) games.push(resolveGame(h, a, owners, rng, records));
        records = applyRecords(records, games);
        for (const t of landlessTeams(owners)) everLandless.add(t);
        if (w === Math.floor(REGULAR_WEEKS / 2)) {
          leaderAtHalf = [...empireCounts(owners).entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
        }
      }
      const finalCounts = [...empireCounts(owners).entries()].sort((x, y) => y[1] - x[1]);
      const finalLeader = finalCounts[0]?.[0];
      champs.add(finalLeader);
      // did anyone who was wiped out claw back territory by the end?
      for (const t of everLandless) if (statesOf(owners, t).length > 0) { wipeoutsRecovered++; break; }
      if (leaderAtHalf && finalLeader && leaderAtHalf !== finalLeader) seasonsWithLateDrama++;
    } catch (e) { crashed++; if (crashed === 1) console.error('   first crash: ' + e.message); }
  }
  console.log(`   ${wipeoutsRecovered}/40 seasons had a wiped-out team recover land`);
  console.log(`   ${seasonsWithLateDrama}/40 seasons changed leader after halfway`);
  console.log(`   ${champs.size} different teams finished on top across 40 seasons`);
  if (crashed > 0) fail(`${crashed} seasons crashed`);
  if (champs.size < 5) fail('the map is still snowballing to the same few teams');
  if (seasonsWithLateDrama < 4) fail('leads are never challenged after halfway');
}

console.log(failures === 0 ? '\nALL CONQUEST CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
