/**
 * Round 353 harness: every difficulty setting on the soccer grid does something.
 *
 * The bug it exists for. Difficulty is derived, not stored: a puzzle's tier
 * comes from how narrow its row and column attribute types are. The first cut
 * split the score's THEORETICAL range (2 to 6) into even thirds, but the pool
 * cannot produce high scores, because narrow attributes are rare in it.
 * Measured on the 710 live puzzles the tiers came out easy 554, normal 153 and
 * hard 3, and filterPoolByDifficulty falls back to the whole pool whenever a
 * tier holds fewer than MIN_TIER, so choosing Hard silently handed the player
 * the same pool as everyone else. Nothing crashed, nothing logged, and the
 * settings panel went on offering a choice that had no effect.
 *
 * What this holds, against the LIVE pool the game itself fetches:
 *   1. Every tier is populated well enough that filterPoolByDifficulty selects
 *      rather than falling back, so no setting is inert.
 *   2. The tiers are actually distinct: on a sample of dates, the three
 *      settings do not all land on the same puzzle.
 *   3. The tiers mean what they say: mean narrowness rises from easy to
 *      normal to hard. A split that shuffled puzzles arbitrarily would pass
 *      sections 1 and 2 and fail this one.
 *
 * NEGATIVE CONTROL: TIERS_CONTROL=oldbands re-classifies the same live pool
 * with the pre-Round-353 thresholds (2.75 / 4.25) and requires section 1 to go
 * red, which is the exact bug being fenced, reproduced from the same data.
 *
 * Run: node scripts/simSoccerGridTiers.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TIERS_CONTROL || '';
if (CONTROL && CONTROL !== 'oldbands') {
  console.error(`TIERS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Must match filterPoolByDifficulty's fallback floor. If that constant moves,
   this one has to move with it, which is why it is named here rather than
   buried in a comparison. */
const MIN_TIER = 20;
const TIERS = ['easy', 'normal', 'hard'];

const ENTRY = path.join(os.tmpdir(), 'sgTiersEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'sgTiers.bundle.mjs');
fs.writeFileSync(ENTRY, `export { classifyPuzzleDifficulty, puzzleNarrownessScore, filterPoolByDifficulty } from '${(ROOT + '/src/lib/soccerGridDifficulty.ts').replaceAll('\\', '/')}';
export { dateSeed } from '${(ROOT + '/src/lib/dateUtils.ts').replaceAll('\\', '/')}';`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { classifyPuzzleDifficulty, puzzleNarrownessScore, filterPoolByDifficulty, dateSeed } = await import(pathToFileURL(BUNDLE).href);

/* The live pool, read the way every fetch fence here reads it. */
const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const headers = { apikey: KEY, authorization: `Bearer ${KEY}` };
let rows = [];
for (let off = 0; off < 5000; off += 500) {
  /* Retry before giving up. This fence declares an unreachable pool a failure
     on purpose, but a single dropped connection while the whole suite is
     hammering the same host is not an unreachable pool, and a fence that goes
     red for that reason is a fence people learn to ignore. */
  let page = null;
  for (let attempt = 0; attempt < 3 && page === null; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 1000 * attempt));
    page = await fetch(`${URL_}/rest/v1/soccer_grid_puzzles?select=puzzle_id,rows_json,cols_json&order=sort_order&limit=500&offset=${off}`, { headers })
      .then(r => r.json()).catch(() => null);
  }
  if (!Array.isArray(page) || page.length === 0) break;
  rows = rows.concat(page);
  if (page.length < 500) break;
}
if (rows.length < 50) {
  console.log('SOCCER GRID POOL UNREACHABLE OR TOO SMALL. NOTHING WAS CHECKED.');
  console.error('simSoccerGridTiers: the pool did not load, which is itself worth investigating');
  process.exit(1);
}
const pool = rows.map(r => ({ id: r.puzzle_id, rows: r.rows_json, cols: r.cols_json }));

/* The control re-classifies with the bands that shipped before Round 353, on
   the same live data, so it reproduces the real bug rather than a made up one. */
const oldClassify = p => {
  const s = puzzleNarrownessScore(p);
  if (s <= 2.75) return 'easy';
  if (s <= 4.25) return 'normal';
  return 'hard';
};
const classify = CONTROL === 'oldbands' ? oldClassify : classifyPuzzleDifficulty;
if (CONTROL === 'oldbands') {
  const differs = pool.filter(p => oldClassify(p) !== classifyPuzzleDifficulty(p)).length;
  if (differs === 0) {
    console.error('control changed nothing: the old bands classify this pool identically, so it proves nothing');
    process.exit(1);
  }
  console.log(`   NEGATIVE CONTROL ON: pre-Round-353 bands re-applied, ${differs} puzzles change tier, section 1 must go red`);
}

console.log(`1) every setting selects, against ${pool.length} live puzzles`);
const byTier = Object.fromEntries(TIERS.map(t => [t, pool.filter(p => classify(p) === t)]));
for (const t of TIERS) {
  const n = byTier[t].length;
  console.log(`   ${t.padEnd(7)} ${String(n).padStart(4)} puzzles`);
  if (n < MIN_TIER) {
    fail(`the ${t} tier holds ${n} puzzles, under the ${MIN_TIER} floor, so the filter falls back to the whole pool and choosing ${t} does nothing`);
  }
}

console.log('2) the settings do not all land on the same puzzle');
{
  /* Fixed dates, not today, so the check does not change its mind daily. */
  const dates = ['2026-01-05', '2026-03-17', '2026-06-30', '2026-09-09', '2026-12-25'];
  let identical = 0;
  for (const d of dates) {
    const seed = dateSeed(d);
    const picks = TIERS.map(t => {
      const p = filterPoolByDifficulty(pool, t);
      return p.length ? p[seed % p.length].id : null;
    });
    if (new Set(picks).size === 1) {
      identical += 1;
      fail(`on ${d} all three settings serve the same puzzle (${picks[0]})`);
    }
  }
  console.log(`   ${dates.length - identical} of ${dates.length} sampled dates serve different puzzles per setting`);
}

console.log('3) the tiers mean what they say');
{
  const mean = list => list.reduce((a, p) => a + puzzleNarrownessScore(p), 0) / (list.length || 1);
  const m = Object.fromEntries(TIERS.map(t => [t, +mean(byTier[t]).toFixed(3)]));
  console.log(`   mean narrowness  easy ${m.easy}  normal ${m.normal}  hard ${m.hard}`);
  if (!(m.easy < m.normal && m.normal < m.hard)) {
    fail(`narrowness does not rise across the tiers (${m.easy} / ${m.normal} / ${m.hard}), so the labels are decoration`);
  }
}

console.log('');
if (CONTROL === 'oldbands') {
  if (failures > 0) { console.log(`simSoccerGridTiers control: green. The old bands were caught (${failures} finding).`); process.exit(0); }
  console.error('simSoccerGridTiers control: RED. The pre-353 bands passed, so this harness would not have caught the bug it was written for.');
  process.exit(1);
}
if (failures > 0) { console.error(`simSoccerGridTiers: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simSoccerGridTiers: green. Three settings, three real pools, in the order the labels promise.');
