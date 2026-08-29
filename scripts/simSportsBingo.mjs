/* Sports Bingo (Round 323): the card is fair, the packs can always fill it,
 * and the CPU levels mean what their names say.
 *
 * WHAT IT HOLDS, on the same fallback pool the game itself plays when the
 * database is unreachable (748 baked players, every field real):
 *   1. determinism and spread: one seed always deals the identical card and
 *      packs, and a year of daily seeds deals a year of genuinely different
 *      cards (the Round 212 Lehmer seeding trap, pinned);
 *   2. completability: over hundreds of seeds, every condition on every
 *      card is satisfiable by some player in that game's ten packs, and a
 *      perfect player who claims everything claimable reaches the blackout;
 *   3. condition density: every condition in the bank is satisfied by a
 *      real share of the pool (floor 0.8%, measured min 1.6% for 15+ goals,
 *      so the floor sits below the data with headroom, not in it), and
 *      every label fits a card square;
 *   4. scoring identities: empty card 0, full blackout exactly 100 (the
 *      sitewide scale), and marking one more square never lowers the score;
 *   5. CPU ordering: over many games, ruthless out-marks sharp and sharp
 *      out-marks casual, by margins set from measured runs.
 *
 * NEGATIVE CONTROL: SIM_BINGO_CONTROL=impossible severs the completability
 * pass in a bundled copy and section 2 must find incompletable cards,
 * proving the pass is load bearing rather than decorative.
 *
 * Run: node scripts/simSportsBingo.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_BINGO_CONTROL || '';
if (CONTROL && CONTROL !== 'impossible') { console.error(`SIM_BINGO_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/sportsBingo.entry.mjs`;
const BUNDLE = `${TMP}/sportsBingo.bundle.mjs`;

let libPath = `${ROOT}/src/lib/sportsBingo.ts`;
if (CONTROL === 'impossible') {
  const src = fs.readFileSync(libPath, 'utf8');
  const needle = 'for (const cond of conds) {';
  if (!src.includes(needle)) { console.error('control run: the completability loop to sever is not in the source, refusing to run a dead control'); process.exit(1); }
  libPath = `${TMP}/sportsBingo.control.ts`;
  fs.writeFileSync(libPath, src.replace(needle, 'for (const cond of []) {'));
  console.log('NEGATIVE CONTROL ON: the completability pass severed in a bundled copy, section 2 must now find incompletable cards');
}
fs.writeFileSync(ENTRY, `
export * as bingo from '${libPath}';
export { players as POOL } from '${ROOT}/src/data/players.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const { bingo, POOL } = await import(pathToFileURL(BUNDLE).href);
const { CONDITIONS, CARD_SIZE, FREE_INDEX, PACK_COUNT, PACK_SIZE, buildGame, claimableSquares, conditionById, cpuClaims, dailySeed, lehmer, lineCount, scoreGame, squareCondition } = bingo;

const fingerprint = g => g.cardIds.join(',') + '|' + g.packs.flat().map(p => p.name).join(',');

/* A perfect player: claim every claimable square in every pack. */
const perfectRun = g => {
  const marked = new Array(CARD_SIZE).fill(false);
  for (const pack of g.packs) for (const sq of claimableSquares(g, pack, marked)) marked[sq] = true;
  return marked;
};

if (CONTROL !== 'impossible') {
  console.log('1) determinism and daily spread');
  {
    const a = buildGame(POOL, 123456);
    const b = buildGame(POOL, 123456);
    if (fingerprint(a) !== fingerprint(b)) fail('the same seed dealt two different games');
    const prints = new Set();
    const d0 = new Date(Date.UTC(2026, 0, 1));
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(d0.getTime() + i * 86400000);
      const str = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      prints.add(fingerprint(buildGame(POOL, dailySeed(str))));
    }
    if (prints.size < 360) fail(`a year of daily seeds dealt only ${prints.size} distinct games, the Lehmer seeding trap is back`);
    console.log(`   one seed one game; 365 daily dates dealt ${prints.size} distinct games`);
  }
}

console.log('2) every card is completable from its own packs');
{
  let incompletable = 0;
  let blackouts = 0;
  const SEEDS = 300;
  for (let s = 1; s <= SEEDS; s += 1) {
    const g = buildGame(POOL, s * 7919);
    const all = g.packs.flat();
    for (const id of g.cardIds) {
      if (!all.some(p => conditionById(id).test(p))) { incompletable += 1; break; }
    }
    const marked = perfectRun(g);
    if (marked.filter((m, i) => m && i !== FREE_INDEX).length === CARD_SIZE - 1) blackouts += 1;
  }
  if (CONTROL === 'impossible') {
    if (incompletable > 0) { console.log(`simSportsBingo control: green. With the pass severed, ${incompletable} of ${SEEDS} cards were incompletable.`); process.exit(0); }
    console.error('simSportsBingo control: RED. Every card was still completable with the pass severed, something else is doing the work.');
    process.exit(1);
  }
  if (incompletable > 0) fail(`${incompletable} of ${SEEDS} cards carried a condition their packs cannot satisfy`);
  if (blackouts !== SEEDS) fail(`a perfect player blacked out only ${blackouts} of ${SEEDS} cards`);
  console.log(`   ${SEEDS} seeds: zero incompletable cards, and a perfect player blacks out all ${SEEDS}`);
}

console.log('3) condition density and label fit');
{
  let worst = 1;
  let worstId = '';
  for (const c of CONDITIONS) {
    const share = POOL.filter(p => c.test(p)).length / POOL.length;
    if (share < worst) { worst = share; worstId = c.id; }
    if (share < 0.008) fail(`condition ${c.id} is satisfied by only ${(share * 100).toFixed(2)}% of the pool`);
    if (c.label.length > 26) fail(`condition ${c.id} label does not fit a card square: "${c.label}"`);
  }
  console.log(`   ${CONDITIONS.length} conditions, thinnest is ${worstId} at ${(worst * 100).toFixed(1)}% against the 0.8% floor`);
}

console.log('4) scoring identities');
{
  const empty = new Array(CARD_SIZE).fill(false);
  if (scoreGame(empty) !== 0) fail(`an empty card scores ${scoreGame(empty)}, not 0`);
  const full = new Array(CARD_SIZE).fill(true);
  if (scoreGame(full) !== 100) fail(`a blackout scores ${scoreGame(full)}, not exactly 100`);
  if (lineCount(full) !== 12) fail(`a full board counts ${lineCount(full)} lines, not 12`);
  const rng = lehmer(42);
  for (let t = 0; t < 200; t += 1) {
    const m = empty.map(() => rng() < 0.4);
    m[FREE_INDEX] = false;
    const before = scoreGame(m);
    const open = m.findIndex((v, i) => !v && i !== FREE_INDEX);
    if (open === -1) continue;
    const m2 = [...m]; m2[open] = true;
    if (scoreGame(m2) < before) fail('marking one more square lowered the score');
  }
  console.log('   empty 0, blackout exactly 100 with 12 lines, and 200 random boards never score less for one more square');
}

console.log('5) the CPU levels mean what their names say');
{
  const avg = level => {
    let total = 0;
    const GAMES = 120;
    for (let s = 1; s <= GAMES; s += 1) {
      const g = buildGame(POOL, s * 104729);
      const rng = lehmer(s * 31 + 7);
      const marked = new Array(CARD_SIZE).fill(false);
      for (const pack of g.packs) for (const sq of cpuClaims(g, pack, marked, level, rng)) marked[sq] = true;
      total += marked.filter((m, i) => m && i !== FREE_INDEX).length;
    }
    return total / GAMES;
  };
  const casual = avg('casual');
  const sharp = avg('sharp');
  const ruthless = avg('ruthless');
  /* Measured after the final tuning, over this same 120 game run repeated:
     casual ~9.4, sharp ~17.9, ruthless ~22.1, gaps of 8.5 and 4.2. The
     demanded gap of 2 is half the smaller measured gap, so ordinary
     variance cannot flip a healthy build red, and a genuinely flattened
     retune (the 21.0 vs 22.8 one the first tuning shipped) still fails. */
  if (!(sharp >= casual + 2)) fail(`sharp (${sharp.toFixed(1)}) does not clearly out-mark casual (${casual.toFixed(1)})`);
  if (!(ruthless >= sharp + 2)) fail(`ruthless (${ruthless.toFixed(1)}) does not clearly out-mark sharp (${sharp.toFixed(1)})`);
  console.log(`   over 120 games each: casual ${casual.toFixed(1)}, sharp ${sharp.toFixed(1)}, ruthless ${ruthless.toFixed(1)} squares`);
}

console.log('6) the game is registered everywhere a game must be');
{
  const reg = fs.readFileSync(`${ROOT}/src/data/gameRegistry.ts`, 'utf8');
  if (!/path: '\/sports-bingo'/.test(reg)) fail('no gameRegistry entry for /sports-bingo');
  const app = fs.readFileSync(`${ROOT}/src/App.tsx`, 'utf8');
  if (!/path="\/sports-bingo"/.test(app)) fail('no App.tsx route for /sports-bingo');
  const loader = fs.readFileSync(`${ROOT}/src/data/gameContent/loader.ts`, 'utf8');
  if (!/'\/sports-bingo': 'soccer1'/.test(loader)) fail('no PATH_BUNDLE guide entry for /sports-bingo');
  console.log('   registry row, App route and guide bundle entry all present');
}

console.log('');
if (failures > 0) { console.error(`simSportsBingo: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simSportsBingo: green. Every card can be finished, and the packs play fair.');
