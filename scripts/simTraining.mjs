/**
 * Round 81 harness: training mini games.
 * Asserts what tsc can't:
 *  - one session per season, hard-guarded in the engine
 *  - score tiers bank the right boost through statBoostNextSeason
 *  - the banked boost actually lands on the stat at the next pro advance
 *  - GK shooting drill trains reflexes, outfielders train shooting
 *  - out-of-range scores clamp, old saves without the field train fine
 *  - trainingAvailable flips correctly across seasons and retirement
 * Run: node scripts/simTraining.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'trainSimEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'trainSim.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts');
export { engine };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { engine } = await import(pathToFileURL(BUNDLE).href);
const { initCareer, advanceYouthYear, advanceProSeason, applyTrainingResult, trainingAvailable, FALLBACK_CLUBS } = engine;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/* ---------- 1. Once per season ---------- */
console.log('1) One session per season');
{
  let c = initCareer('T1', 'Spain', 'ST', 'modern', flat(55), 55, 2020, FALLBACK_CLUBS, null, 80);
  if (!trainingAvailable(c)) fail('training should be available at creation');
  c = applyTrainingResult(c, 'pace', 90);
  if (trainingAvailable(c)) fail('training should be spent after a session');
  const again = applyTrainingResult(c, 'pace', 90);
  if (again !== c) fail('second session in one season was not a no-op');
  c = advanceYouthYear(c, FALLBACK_CLUBS);
  if (!trainingAvailable(c)) fail('training should refresh after a season advance');
}

/* ---------- 2. Tier boosts + landing on the stat ---------- */
console.log('2) Boost tiers land through statBoostNextSeason');
{
  // Get a pro career so the boost is consumed by advanceProSeason
  let c = initCareer('T2', 'Spain', 'ST', 'modern', flat(60), 60, 2020, FALLBACK_CLUBS, null, 90);
  let guard = 0;
  while (c.phase === 'youth' && guard < 5) { guard++; c = advanceYouthYear(c, FALLBACK_CLUBS); }
  if (c.pendingOffers?.length) {
    const { acceptOffer } = engine;
    c = acceptOffer(c, c.pendingOffers[0]);
  }
  // elite pace session
  c = applyTrainingResult(c, 'pace', 85);
  if ((c.statBoostNextSeason.pace || 0) !== 2) fail(`85 score banked ${c.statBoostNextSeason.pace}, want +2`);
  if (!c.events.some(e => e.includes('🏋️'))) fail('no training event line');
  // decent dribbling session cannot stack this season (guard), so check tiers on fresh states instead
  let mid = initCareer('T2b', 'Spain', 'CM', 'modern', flat(60), 60, 2020, FALLBACK_CLUBS, null, 90);
  mid = applyTrainingResult(mid, 'dribbling', 55);
  if ((mid.statBoostNextSeason.dribbling || 0) !== 1) fail(`55 score banked ${mid.statBoostNextSeason.dribbling}, want +1`);
  let low = initCareer('T2c', 'Spain', 'CM', 'modern', flat(60), 60, 2020, FALLBACK_CLUBS, null, 90);
  low = applyTrainingResult(low, 'shooting', 30);
  if (Object.keys(low.statBoostNextSeason).length !== 0) fail('sub-50 score should bank nothing');
  if (!low.events.some(e => e.includes('🏋️'))) fail('failed session should still log an event');
  // consumption: pace must rise by at least the boost minus any age decline
  const before = c.pace;
  const boost = c.statBoostNextSeason.pace || 0;
  const after = advanceProSeason(c, FALLBACK_CLUBS);
  if (Object.keys(after.statBoostNextSeason).length !== 0 && after.statBoostNextSeason.pace) fail('boost not cleared after advance');
  if (after.pace < before) fail(`pace fell from ${before} to ${after.pace} despite a +${boost} banked boost at age ${c.age}`);
}

/* ---------- 3. GK mapping ---------- */
console.log('3) GK shooting drill trains reflexes');
{
  let g = initCareer('T3', 'Spain', 'GK', 'modern', flat(58), 58, 2020, FALLBACK_CLUBS, null, 85);
  g = applyTrainingResult(g, 'shooting', 92);
  if ((g.statBoostNextSeason.reflexes || 0) !== 2) fail(`GK banked ${JSON.stringify(g.statBoostNextSeason)}, want reflexes +2`);
  if (g.statBoostNextSeason.shooting) fail('GK should not bank shooting');
}

/* ---------- 4. Clamps + old saves ---------- */
console.log('4) Score clamps and pre-R81 saves');
{
  let c = initCareer('T4', 'Spain', 'ST', 'modern', flat(55), 55, 2020, FALLBACK_CLUBS, null, 80);
  delete c.trainingSeasonYear;
  if (!trainingAvailable(c)) fail('old save without the field should be able to train');
  const hi = applyTrainingResult(c, 'pace', 400);
  if ((hi.statBoostNextSeason.pace || 0) !== 2) fail('overshoot score should clamp to elite tier');
  let c2 = initCareer('T4b', 'Spain', 'ST', 'modern', flat(55), 55, 2020, FALLBACK_CLUBS, null, 80);
  const lo = applyTrainingResult(c2, 'pace', -50);
  if (Object.keys(lo.statBoostNextSeason).length !== 0) fail('negative score should bank nothing');
}

/* ---------- 5. Retirement gating ---------- */
console.log('5) Retired careers cannot train');
{
  let c = initCareer('T5', 'Spain', 'ST', 'modern', flat(55), 55, 2020, FALLBACK_CLUBS, null, 80);
  c = { ...c, retired: true, phase: 'retired' };
  if (trainingAvailable(c)) fail('retired career can train');
}

/* ---------- 6. Full careers training every season ---------- */
console.log('6) 15 careers training every season, random scores');
{
  let crashed = 0, sessions = 0;
  for (let i = 0; i < 15; i++) {
    try {
      let c = initCareer(`T6-${i}`, 'England', 'CM', 'modern', flat(54), 54, 2020, FALLBACK_CLUBS, null, 82);
      let guard = 0;
      while (!c.retired && guard < 34) {
        guard++;
        if (trainingAvailable(c)) {
          const drills = ['dribbling', 'pace', 'shooting'];
          c = applyTrainingResult(c, drills[guard % 3], Math.floor(Math.random() * 101));
          sessions++;
        }
        c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
        if (c.transferSituation) c = { ...c, transferSituation: null };
        for (const k of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes']) {
          if (c[k] < 20 || c[k] > 99) fail(`${k} out of range: ${c[k]}`);
        }
      }
    } catch (e) {
      crashed++;
      if (crashed === 1) console.error('   first crash: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e));
    }
  }
  console.log(`   ${sessions} sessions across 15 careers, crashes=${crashed}`);
  if (crashed > 0) fail(`${crashed} careers crashed`);
  if (sessions < 100) fail(`only ${sessions} sessions, availability too dry`);
}

console.log(failures === 0 ? '\nALL TRAINING CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
