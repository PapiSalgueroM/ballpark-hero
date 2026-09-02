/**
 * Round 350 harness: the grid pools are deep enough, and no two boards twin.
 *
 * Why it exists. Every grid draws its daily puzzle from a static array on a
 * shuffled cycle (selectDailyPuzzle in useDailyPuzzle.ts walks the whole pool
 * before any puzzle repeats), so THE POOL LENGTH IS THE REPEAT INTERVAL IN
 * DAYS. Measured 2026-08-29 the NFL grid pool was 30, meaning the site's
 * highest-value page, ranked for a 49,500-a-month term with the season about
 * to start, handed a daily player the same board every month. The recon that
 * found it also found the second cost: an answer archive cannot be published
 * for a pool that recycles that fast, because a retired board is never
 * retired for long (see docs/designs/GRID-ARCHIVE-DESIGN.md).
 *
 * What this holds:
 *   1. Repeat interval: each static pool is at least its floor, and the NFL
 *      grid clears the 60-day promise the round was built to make.
 *   2. No twins: no two puzzles in a pool produce the same nine crossings.
 *      Rows and columns are compared as unordered sets, because swapping the
 *      two axes of a board yields the same nine questions.
 *   3. Internally sound: three distinct rows, three distinct cols, and no
 *      label on both axes at once (a franchise crossed with itself is not a
 *      question).
 *   4. In vocabulary: every type is in the union the renderer knows, and
 *      every label matches the house shape for its type, so a new author
 *      cannot quietly invent a criterion the validator was never taught.
 *   5. Typeable (Round 401): src/data/nflGridLocalNames.ts equals what
 *      scripts/genNflGridLocalNames.mjs derives from the Round 350 evidence
 *      ledger, so every evidenced answer is a name the search box can offer.
 *      A ledger edit that forgets to regenerate goes red here.
 *
 * NEGATIVE CONTROLS: GRIDPOOL_CONTROL=dupe clones one NFL puzzle back into
 * the pool (asserting the pool was big enough to clone from) and section 2
 * must go red. GRIDPOOL_CONTROL=names drops one evidenced name from the
 * derivation in memory and section 5 must go red.
 *
 * Run: node scripts/simGridPuzzlePool.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GRIDPOOL_CONTROL || '';
if (CONTROL && CONTROL !== 'dupe' && CONTROL !== 'names') {
  console.error(`GRIDPOOL_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
let section = 0;
let sectionFive = 0;
const fail = m => { failures += 1; if (section === 5) sectionFive += 1; console.error('  FAIL: ' + m); };

/* The pools that ARE the rotation. Soccer is deliberately absent: its pool is
   fetched from the database at runtime (fetchSoccerGridPuzzles) and the static
   array is only a fallback, so a length assertion here would measure the
   fallback and quietly pass while the real pool drifted. */
const POOLS = [
  { key: 'football-grid', module: 'src/data/footballGridPuzzles.ts', name: 'footballGridPuzzles', floor: 60 },
  { key: 'college-grid', module: 'src/data/collegeGridPuzzles.ts', name: 'collegeGridPuzzles', floor: 60 },
];

const ENTRY = path.join(os.tmpdir(), 'gridPoolEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'gridPool.bundle.mjs');
fs.writeFileSync(ENTRY, POOLS.map(p =>
  `export { ${p.name} } from '${(ROOT + '/' + p.module).replaceAll('\\', '/')}';`
).join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const mod = await import(pathToFileURL(BUNDLE).href);

const TYPES = new Set(['team', 'college', 'draft', 'award', 'position', 'superbowl', 'probowl', 'misc']);
/* The house shapes, DERIVED FROM THE SHIPPED POOLS on 2026-08-29 rather than
   invented: the first draft of this list was one author's guess and it flagged
   "Top 10 Pick", "Top 5 Pick" and "Went Undrafted", three criteria that have
   been live and working for months. A guard that fails good shipped data is a
   guard that gets switched off, so the vocabulary is what the game actually
   speaks, widened only where a new criterion is a plain variant of one of
   these. A label matching none of these is not proven wrong, it is UNREVIEWED,
   and an unreviewed criterion is one nobody has asked the AI validator to
   judge consistently. */
const SHAPES = {
  team: /^Played for .+$/,
  probowl: /^\d+\+ Pro Bowls$/,
  superbowl: /^(Won Super Bowl|\d+\+ Super Bowl Wins)$/,
  draft: /^(1st Overall Pick|Drafted 1st overall|First Round Pick|Top \d+ Pick|Undrafted|Went Undrafted|Round \d+ or Later Pick)$/,
};

const boardKey = p => {
  const rows = p.rows.map(a => a.label).slice().sort().join('|');
  const cols = p.cols.map(a => a.label).slice().sort().join('|');
  /* Unordered across axes: swapping rows and cols asks the same nine
     questions, so the two arrangements must count as the same board. */
  return [rows, cols].sort().join(' X ');
};

console.log('1) the repeat interval is the pool length, and the pool clears its floor');
const pools = {};
for (const spec of POOLS) {
  const pool = mod[spec.name].slice();
  if (CONTROL === 'dupe' && spec.key === 'football-grid') {
    if (pool.length < 2) { console.error('control found nothing to clone: pool too small'); process.exit(1); }
    pool.push({ ...pool[0], id: `${pool[0].id}-control-clone` });
    console.log(`   NEGATIVE CONTROL ON: cloned ${pool[0].id} back into ${spec.key}, section 2 must go red`);
  }
  pools[spec.key] = pool;
  console.log(`   ${spec.key.padEnd(14)} ${pool.length} puzzles, so ${pool.length} days between repeats (floor ${spec.floor})`);
  if (pool.length < spec.floor) {
    fail(`${spec.key} repeats every ${pool.length} days, the floor is ${spec.floor}`);
  }
}

console.log('2) no two boards ask the same nine questions');
for (const [key, pool] of Object.entries(pools)) {
  const seen = new Map();
  let twins = 0;
  for (const p of pool) {
    const k = boardKey(p);
    if (seen.has(k)) {
      twins += 1;
      if (twins <= 3) fail(`${key}: ${p.id} is the same board as ${seen.get(k)}`);
    } else seen.set(k, p.id);
  }
  if (twins > 3) fail(`${key}: ${twins - 3} further duplicate boards beyond the three shown`);
  console.log(`   ${key.padEnd(14)} ${seen.size} distinct boards of ${pool.length}`);
}

console.log('3) every board is internally a real question');
for (const [key, pool] of Object.entries(pools)) {
  let bad = 0;
  for (const p of pool) {
    const rows = p.rows.map(a => a.label);
    const cols = p.cols.map(a => a.label);
    const dupRow = new Set(rows).size !== rows.length;
    const dupCol = new Set(cols).size !== cols.length;
    const crossed = rows.filter(r => cols.includes(r));
    if (dupRow || dupCol || crossed.length) {
      bad += 1;
      if (bad <= 3) {
        fail(`${key}: ${p.id} ${dupRow ? 'repeats a row label ' : ''}${dupCol ? 'repeats a col label ' : ''}${crossed.length ? `crosses "${crossed[0]}" with itself` : ''}`.trim());
      }
    }
  }
  if (bad > 3) fail(`${key}: ${bad - 3} further degenerate boards beyond the three shown`);
  console.log(`   ${key.padEnd(14)} ${pool.length - bad} of ${pool.length} boards sound`);
}

console.log('4) every criterion is in the vocabulary the game was taught');
for (const [key, pool] of Object.entries(pools)) {
  let offTypes = 0, offShapes = 0;
  for (const p of pool) {
    for (const a of [...p.rows, ...p.cols]) {
      if (!TYPES.has(a.type)) {
        offTypes += 1;
        if (offTypes <= 3) fail(`${key}: ${p.id} uses type "${a.type}", which the renderer does not know`);
      }
      const shape = SHAPES[a.type];
      if (shape && !shape.test(a.label)) {
        offShapes += 1;
        if (offShapes <= 3) fail(`${key}: ${p.id} label "${a.label}" does not match the house shape for ${a.type}`);
      }
    }
  }
  console.log(`   ${key.padEnd(14)} ${offTypes} unknown types, ${offShapes} off-shape labels`);
}

section = 5;
console.log('5) every evidenced NFL answer is a name the search box can offer');
{
  const { namesFromLedger, renderModule } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'genNflGridLocalNames.mjs')).href);
  let derived = namesFromLedger();
  if (CONTROL === 'names') {
    if (derived.length < 2) { console.error('control found nothing to drop: the ledger names fewer than two players'); process.exit(1); }
    derived = derived.slice(1);
    console.log(`   NEGATIVE CONTROL ON: dropped "${namesFromLedger()[0]}" from the derivation, section 5 must go red`);
  }
  const committed = fs.readFileSync(path.join(ROOT, 'src', 'data', 'nflGridLocalNames.ts'), 'utf8').split('\r\n').join('\n');
  if (committed !== renderModule(derived)) fail('src/data/nflGridLocalNames.ts is not what the generator derives from the ledger; run node scripts/genNflGridLocalNames.mjs');
  if (!/localNames=\{NFL_GRID_LOCAL_NAMES\}/.test(fs.readFileSync(path.join(ROOT, 'src', 'components', 'football-grid', 'GridPlayerSearch.tsx'), 'utf8'))) fail('GridPlayerSearch no longer hands NFL_GRID_LOCAL_NAMES to the autocomplete');
  console.log(`   ${derived.length} evidenced names, committed file ${committed === renderModule(derived) ? 'matches' : 'differs'}`);
}

console.log('');
if (CONTROL === 'names') {
  if (sectionFive > 0) { console.log(`simGridPuzzlePool control: green. The dropped name was caught (${sectionFive} finding in section 5).`); process.exit(0); }
  console.error('simGridPuzzlePool control: RED. A missing evidenced name passed, so the derivation check cannot bite.');
  process.exit(1);
}
if (CONTROL === 'dupe') {
  if (failures > 0) { console.log(`simGridPuzzlePool control: green. The cloned board was caught (${failures} finding).`); process.exit(0); }
  console.error('simGridPuzzlePool control: RED. A cloned board passed, so the twin check cannot bite.');
  process.exit(1);
}
if (failures > 0) { console.error(`simGridPuzzlePool: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simGridPuzzlePool: green. Deep pools, distinct boards, criteria the game understands.');
