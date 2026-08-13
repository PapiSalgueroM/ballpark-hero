/**
 * Round 79 harness: 2K style stat allocation + plays-like.
 * Asserts what tsc can't:
 *  - allocOverall NEVER drifts from the engine's calcOverall (exact mirror)
 *  - allocRowsFor gives every position the right editable keys
 *  - normalizeAllocation always lands exactly on the target overall in bounds
 *  - outfield redistribution keeps overall pinned; GK drift stays bounded
 *  - the engine clamps potential above a customized overall
 *  - playsLike always answers, and pace/passing extremes match sane archetypes
 * Run: node scripts/simAllocation.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/allocSimEntry.mjs';
const BUNDLE = '/tmp/allocSim.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
const eras = await import('${ROOT}/src/lib/careerEras.ts');
export { engine, eras };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { engine, eras } = await import(BUNDLE);
const { calcOverall, initCareer, FALLBACK_CLUBS } = engine;
const { allocOverall, allocRowsFor, normalizeAllocation, allocMax, ALLOC_MIN, playsLike, PLAYS_LIKE_BANK, rollStartingOverall } = eras;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randomStats = () => Object.fromEntries(KEYS.map(k => [k, rnd(25, 85)]));

/* ---------- 1. allocOverall mirrors calcOverall exactly ---------- */
console.log('1) allocOverall === engine calcOverall (2000 random stat lines x 10 positions)');
{
  let drift = 0;
  for (let i = 0; i < 2000; i++) {
    const s = randomStats();
    for (const p of POSITIONS) if (allocOverall(s, p) !== calcOverall(s, p)) drift++;
  }
  if (drift > 0) fail(`${drift} mirror drifts between allocOverall and calcOverall`);
  else console.log('   zero drift');
}

/* ---------- 2. allocRowsFor shape ---------- */
console.log('2) allocRowsFor per position');
{
  for (const p of POSITIONS) {
    const rows = allocRowsFor(p);
    const keys = rows.map(r => r.key);
    if (new Set(keys).size !== keys.length) fail(`${p}: duplicate keys`);
    if (p === 'GK') {
      if (rows.length !== 7) fail(`GK: expected 7 rows, got ${rows.length}`);
    } else {
      if (rows.length !== 6) fail(`${p}: expected 6 rows, got ${rows.length}`);
      if (keys.includes('reflexes')) fail(`${p}: outfielder should not allocate reflexes`);
    }
    for (const r of rows) {
      if (!KEYS.includes(r.key)) fail(`${p}: bad key ${r.key}`);
      if (!r.label || typeof r.label !== 'string') fail(`${p}: missing label`);
    }
  }
}

/* ---------- 3. normalizeAllocation hits the target ---------- */
console.log('3) normalizeAllocation lands exactly on target (10 positions x 21 targets)');
{
  let misses = 0, oob = 0;
  for (const p of POSITIONS) {
    for (let target = 46; target <= 66; target++) {
      const s = normalizeAllocation(randomStats(), p, target);
      if (allocOverall(s, p) !== target) misses++;
      for (const r of allocRowsFor(p)) {
        const v = s[r.key];
        if (v < ALLOC_MIN || v > allocMax(target)) oob++;
      }
    }
  }
  if (misses > 0) fail(`${misses} normalizations missed the target overall`);
  if (oob > 0) fail(`${oob} normalized stats out of bounds`);
}

/* ---------- 4. Redistribution invariants ---------- */
console.log('4) Redistribution: outfield overall pinned, GK drift bounded');
{
  let outfieldDrift = 0, gkWorst = 0;
  for (let i = 0; i < 500; i++) {
    const p = POSITIONS[rnd(1, 9)]; // outfield
    const target = rollStartingOverall(p);
    const s = normalizeAllocation(randomStats(), p, target);
    const keys = allocRowsFor(p).map(r => r.key);
    // random redistribution preserving the sum
    for (let m = 0; m < 40; m++) {
      const a = keys[rnd(0, keys.length - 1)], b = keys[rnd(0, keys.length - 1)];
      if (a === b) continue;
      if (s[a] > ALLOC_MIN && s[b] < allocMax(target)) { s[a]--; s[b]++; }
    }
    if (allocOverall(s, p) !== target) outfieldDrift++;
  }
  for (let i = 0; i < 500; i++) {
    const target = rollStartingOverall('GK');
    const s = normalizeAllocation(randomStats(), 'GK', target);
    const keys = allocRowsFor('GK').map(r => r.key);
    for (let m = 0; m < 40; m++) {
      const a = keys[rnd(0, keys.length - 1)], b = keys[rnd(0, keys.length - 1)];
      if (a === b) continue;
      if (s[a] > ALLOC_MIN && s[b] < allocMax(target)) { s[a]--; s[b]++; }
    }
    gkWorst = Math.max(gkWorst, Math.abs(allocOverall(s, 'GK') - target));
  }
  console.log(`   GK worst drift after wild redistribution: ${gkWorst}`);
  if (outfieldDrift > 0) fail(`${outfieldDrift} outfield redistributions moved the overall (must be pinned)`);
  if (gkWorst > 12) fail(`GK drift ${gkWorst} beyond sanity bound 12`);
}

/* ---------- 5. Engine clamps potential above a customized overall ---------- */
console.log('5) initCareer potential clamp');
{
  const s = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
  const c = initCareer('Clamp', 'Spain', 'ST', 'modern', s, 70, 2020, FALLBACK_CLUBS, null, 60);
  if (c.potential < 72) fail(`potential ${c.potential} not clamped above overall 70`);
}

/* ---------- 6. playsLike ---------- */
console.log('6) playsLike: coverage, extremes, flat build');
{
  for (const p of POSITIONS) {
    const pool = PLAYS_LIKE_BANK.filter(e => e.positions.includes(p));
    if (pool.length < 3) fail(`${p}: only ${pool.length} archetypes in the bank`);
    for (let i = 0; i < 300; i++) {
      const r = playsLike(randomStats(), p);
      if (!r || !r.name) { fail(`${p}: playsLike returned nothing`); break; }
      if (r.pct < 0 || r.pct > 98) { fail(`${p}: pct ${r.pct} out of range`); break; }
    }
  }
  // A pace-maxed striker should match a pace-forward archetype
  const speedy = playsLike({ pace: 85, shooting: 60, passing: 50, dribbling: 62, defending: 30, physical: 55, reflexes: 40 }, 'ST');
  const speedyEntry = PLAYS_LIKE_BANK.find(e => e.name === speedy.name);
  if (!speedyEntry || speedyEntry.shape[0] < 5) fail(`pace-maxed ST matched ${speedy.name}, whose shape is not pace-forward`);
  // A passing-maxed right back should match Alexander-Arnold
  const qb = playsLike({ pace: 55, shooting: 45, passing: 85, dribbling: 55, defending: 50, physical: 45, reflexes: 40 }, 'RB');
  if (qb.name !== 'Trent Alexander-Arnold') fail(`passing-maxed RB matched ${qb.name}, expected Alexander-Arnold`);
  // A reflex-monster keeper should match a shot-stopper archetype
  const wall = playsLike({ pace: 40, shooting: 40, passing: 38, dribbling: 42, defending: 55, physical: 60, reflexes: 85 }, 'GK');
  const wallEntry = PLAYS_LIKE_BANK.find(e => e.name === wall.name);
  if (!wallEntry || wallEntry.shape[6] < 6) fail(`reflex-maxed GK matched ${wall.name}, whose shape is not reflex-forward`);
  // Flat build gets the honest no-comp answer
  const flat = playsLike({ pace: 55, shooting: 55, passing: 55, dribbling: 55, defending: 55, physical: 55, reflexes: 55 }, 'CM');
  if (flat.pct !== 0) fail(`flat build should have no comparison, got ${flat.name} at ${flat.pct}%`);
  console.log(`   speedy ST -> ${speedy.name} (${speedy.pct}%), QB RB -> ${qb.name} (${qb.pct}%), wall GK -> ${wall.name} (${wall.pct}%)`);
}

console.log(failures === 0 ? '\nALL ALLOCATION CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
