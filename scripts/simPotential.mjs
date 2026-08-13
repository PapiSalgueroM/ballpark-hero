/**
 * Round 78 harness: potential system for Soccer Career.
 * Bundles the engine with esbuild and asserts the things tsc can't see:
 *  - rollStartingOverall really starts low now (mean in the upper-40s/low-50s,
 *    high starts rare)
 *  - rollPotential is weighted low with a genuinely small generational tail
 *  - potential >= start + 6 always (a career always has somewhere to go)
 *  - full simulated careers plateau at the ceiling: overall never blows past
 *    potential by more than the late-bloomer allowance
 *  - legacy saves without a potential field still advance without crashing
 * Run: node scripts/simPotential.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/potSimEntry.mjs';
const BUNDLE = '/tmp/potSim.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
const eras = await import('${ROOT}/src/lib/careerEras.ts');
export { engine, eras };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { engine, eras } = await import(BUNDLE);
const { initCareer, advanceYouthYear, advanceProSeason, FALLBACK_CLUBS } = engine;
const { rollStartingOverall, rollPotential, potentialTier } = eras;

// The page builds stats that average to the rolled overall; flat stats do the
// same job for the sim (overall = round(avg of the six outfield stats)).
const flatStats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };

/* ---------- 1. Starting overall distribution ---------- */
console.log('1) Starting overall distribution (100k rolls)');
{
  const N = 100000;
  let sum = 0, high = 0, veryHigh = 0, low = 0, min = 99, max = 0;
  for (let i = 0; i < N; i++) {
    const o = rollStartingOverall('ST');
    sum += o;
    if (o >= 63) high++;
    if (o >= 66) veryHigh++;
    if (o <= 55) low++;
    if (o < min) min = o;
    if (o > max) max = o;
  }
  const mean = sum / N;
  console.log(`   mean=${mean.toFixed(2)} min=${min} max=${max} P(>=63)=${(high / N * 100).toFixed(2)}% P(>=66)=${(veryHigh / N * 100).toFixed(2)}% P(<=55)=${(low / N * 100).toFixed(1)}%`);
  if (mean > 56) fail(`mean start ${mean.toFixed(2)} still too generous (want <= 56)`);
  if (mean < 46) fail(`mean start ${mean.toFixed(2)} suspiciously brutal (want >= 46)`);
  if (high / N > 0.10) fail(`P(start >= 63) = ${(high / N * 100).toFixed(2)}% too common (want <= 10%)`);
  if (low / N < 0.55) fail(`P(start <= 55) = ${(low / N * 100).toFixed(1)}% — most rolls should start low (want >= 55%)`);
  if (min < 40 || max > 72) fail(`start range [${min}, ${max}] outside sane bounds [40, 72]`);
}

/* ---------- 2. Potential distribution ---------- */
console.log('2) Potential distribution (100k rolls)');
{
  const N = 100000;
  let gen = 0, world = 0, star = 0, floorViolations = 0, sum = 0, min = 99, max = 0;
  for (let i = 0; i < N; i++) {
    const start = rollStartingOverall('CM');
    const p = rollPotential(start);
    sum += p;
    if (p >= 93) gen++;
    if (p >= 89) world++;
    if (p >= 84) star++;
    if (p < start + 6) floorViolations++;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const pctGen = gen / N * 100, pctWorld = world / N * 100, pctStar = star / N * 100;
  console.log(`   mean=${(sum / N).toFixed(2)} range=[${min},${max}] P(>=93)=${pctGen.toFixed(2)}% P(>=89)=${pctWorld.toFixed(2)}% P(>=84)=${pctStar.toFixed(2)}%`);
  if (pctGen > 4) fail(`generational potential ${pctGen.toFixed(2)}% too common (want <= 4%)`);
  if (pctGen < 0.5) fail(`generational potential ${pctGen.toFixed(2)}% never happens (want >= 0.5%)`);
  if (pctWorld > 12) fail(`world-class potential ${pctWorld.toFixed(2)}% too common (want <= 12%)`);
  if (pctStar > 30) fail(`star potential ${pctStar.toFixed(2)}% too common (want <= 30%)`);
  if (floorViolations > 0) fail(`${floorViolations} rolls broke the potential >= start + 6 floor`);
  if (max > 97) fail(`potential ${max} above the 97 hard cap`);
  const tiers = [70, 80, 85, 90, 94].map(p => potentialTier(p));
  for (const t of tiers) if (!t || typeof t.label !== 'string' || typeof t.color !== 'string') fail('potentialTier returned a bad shape');
}

/* ---------- 3. Careers respect the ceiling ---------- */
console.log('3) 40 full careers: overall plateaus at potential');
{
  let worstOver = 0, careersHitWall = 0, crashed = 0;
  for (let i = 0; i < 40; i++) {
    try {
      const start = rollStartingOverall('ST');
      const stats = flatStats(start);
      // Force a LOW ceiling so the wall actually gets tested
      const pot = Math.max(start + 6, 72 + (i % 8));
      let c = initCareer(`Sim${i}`, 'Spain', 'ST', 'modern', stats, start, 2020, FALLBACK_CLUBS, null, pot);
      if (c.potential !== pot) fail(`initCareer dropped the explicit potential (${c.potential} vs ${pot})`);
      let guard = 0;
      while (!c.retired && guard < 40) {
        guard++;
        c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
        // answer any blocking transfer situation by staying
        if (c.transferSituation) c = { ...c, transferSituation: null };
        const over = c.overall - pot;
        if (over > worstOver) worstOver = over;
      }
      if (c.peakOverall >= pot - 1) careersHitWall++;
    } catch (e) {
      crashed++;
      if (crashed === 1) console.error('   first crash: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e));
    }
  }
  console.log(`   worst overshoot=+${worstOver} careers reaching ceiling=${careersHitWall}/40 crashes=${crashed}`);
  if (crashed > 0) fail(`${crashed} careers crashed`);
  if (worstOver > 4) fail(`overall exceeded potential by ${worstOver} (late-bloomer allowance is 4)`);
  if (careersHitWall < 5) fail(`only ${careersHitWall}/40 careers ever approached their ceiling — wall may be set too low`);
}

/* ---------- 4. Legacy saves (no potential) still work ---------- */
console.log('4) Legacy save without potential field');
{
  try {
    const stats = flatStats(58);
    let c = initCareer('Legacy', 'England', 'CM', 'modern', stats, 58, 2020, FALLBACK_CLUBS, null);
    if (typeof c.potential !== 'number') fail('initCareer without explicit potential should roll one');
    // simulate a pre-R78 save: strip the field entirely
    delete c.potential;
    let guard = 0;
    while (!c.retired && guard < 30) {
      guard++;
      c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
    }
    console.log(`   legacy career ran ${guard} seasons, peak ${c.peakOverall}, retired=${c.retired}`);
    if (guard >= 30 && !c.retired) fail('legacy career never retired in 30 seasons');
  } catch (e) {
    fail('legacy save crashed: ' + e);
  }
}

console.log(failures === 0 ? '\nALL POTENTIAL CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
