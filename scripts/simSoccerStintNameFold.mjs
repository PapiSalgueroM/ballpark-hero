/* The soccer stint lookup can reach a player whose name carries an accent.
 *
 * Round 498. TWO shipped functions read soccer_player_club_stints by name and
 * both did it with .ilike against the RAW player_name column:
 *   soccer-grid-validate        the full name lookup and the surname fallback
 *   football-connect4-validate  the Round 497 confirm-only club pass
 * So a name typed in plain letters never reached a stored accented name. This
 * is the same defect Round 486 fixed for the NBA table, on a different table,
 * which is the repo's own standing lesson: a bug found in one place must be
 * checked in every sibling that shares the shape.
 *
 * MEASURED 2026-09-07 over all 80,586 rows and 27,851 distinct names:
 *   6,270 distinct names (22.5 percent) change under folding and could not be
 *     reached by any plain spelling. 18,833 of the 80,586 rows.
 *   313 carry a letter with NO canonical decomposition, so NFD alone still
 *     misses them and the transliteration table is required, not decoration.
 *   Proved rather than argued: ilike with the folded spelling returned no rows
 *     for 5 of 5 sampled names.
 *
 * IT IS NOT ONLY ACCENTS. The fold flattens anything that is not a letter or a
 * digit, so "Aaron Wan-Bissaka" was unreachable by typing "aaron wan bissaka"
 * with no accent involved anywhere. The hyphen alone did it.
 *
 * WHAT THIS HOLDS:
 *   1. The DATABASE fold and the JS fold agree, row by row, over the whole
 *      table. This is the check Round 486 was built around: unaccent handles
 *      the no-decomposition letters and JS NFD does not, so the two folds
 *      silently disagreed and no typed spelling could reach the player. A
 *      column that disagrees with its function is a second opinion, not an
 *      index.
 *   2. Every row has a folded name. A re-import that forgets the backfill would
 *      make those players unreachable again, and nothing else would notice.
 *   3. Both shipped functions query the folded column, not the raw one.
 *   4. Live: names that provably could not be reached before now resolve, and
 *      the count is measured rather than asserted.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   STINT_FOLD_CONTROL=notranslit drops the transliteration step from the
 *     harness's own fold, reproducing the exact Round 486 disagreement, so
 *     section 1 goes red on the Turkish and Scandinavian names.
 *   STINT_FOLD_CONTROL=rawcolumn makes section 4 query the raw column the way
 *     the code did before this round, so it goes red with the names it cannot
 *     reach.
 *
 * Run: node scripts/simSoccerStintNameFold.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.STINT_FOLD_CONTROL || '';
if (CONTROL && !['notranslit', 'rawcolumn'].includes(CONTROL)) {
  console.error(`STINT_FOLD_CONTROL=${CONTROL} is not a control this harness knows (notranslit, rawcolumn)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const C4 = path.join(ROOT, 'supabase', 'functions', 'football-connect4-validate', 'index.ts');
const GRID = path.join(ROOT, 'supabase', 'functions', 'soccer-grid-validate', 'index.ts');
const c4src = readFileSync(C4, 'utf8');
const gridsrc = readFileSync(GRID, 'utf8');

/* The fold is LIFTED OUT OF THE SHIPPED FUNCTION, never retyped. A copy here
   would agree with itself while the deployed file said something else, which is
   precisely the failure this harness exists to catch. */
function liftFold(src, declName) {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex(l => l.startsWith('const TRANSLIT'));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.includes('.trim();'));
  if (end < 0) return null;
  let js = lines.slice(start, end + 1).join('\n')
    .replace(': Record<string, string>', '')
    .replace('(s: string)', '(s)');
  if (CONTROL === 'notranslit') {
    js = js.replace(/\.replace\(\/\[ıßøłđæœþð\]\/g, \(c\) => TRANSLIT\[c\] \?\? c\)/, '');
  }
  return eval(`(() => { ${js}; return ${declName}; })()`);
}
const foldC4 = liftFold(c4src, 'foldName');
const foldGrid = liftFold(gridsrc, 'norm');
if (!foldC4 || !foldGrid) {
  console.error('could not lift the fold out of one of the shipped functions');
  process.exit(1);
}
{
  const probes = ['Ömer Aşık', 'Albert Grønbæk', 'Aaron Wan-Bissaka', 'Aarón Ñíguez'];
  const disagree = probes.filter(p => foldC4(p) !== foldGrid(p));
  disagree.forEach(p => fail(`the two shipped functions fold "${p}" differently: connect4 says "${foldC4(p)}", grid says "${foldGrid(p)}". One table, one fold.`));
  console.log(`   folds lifted from both functions, ${probes.length - disagree.length}/${probes.length} probes agree`);
}

/* one paged scan, refusing to run rather than reporting findings on a bad read */
const rows = [];
for (let from = 0; from < 200000; from += 1000) {
  let page = null;
  for (let attempt = 0; attempt < 4 && page === null; attempt += 1) {
    try {
      const r = await fetch(`${URL_}/rest/v1/soccer_player_club_stints?select=player_name,name_folded&order=player_name.asc,club.asc`,
        { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
      if (r.ok) page = await r.json();
      else if (attempt === 3) {
        console.error(`could not read soccer_player_club_stints at offset ${from} (HTTP ${r.status}); refusing to run rather than report findings against a bad read`);
        process.exit(1);
      }
    } catch (e) {
      if (attempt === 3) { console.error(`could not read the table (${e.message}); refusing to run`); process.exit(1); }
    }
    if (page === null) await new Promise(r => setTimeout(r, 900 * (attempt + 1)));
  }
  rows.push(...page);
  if (page.length < 1000) break;
}
console.log(`   ${rows.length} stint rows read`);
if (rows.length < 50000) {
  console.error(`only ${rows.length} rows read, which cannot be the whole table; refusing to run`);
  process.exit(1);
}

console.log('1) the database fold and the shipped JS fold agree, row by row');
{
  let mismatch = 0;
  const shown = [];
  for (const r of rows) {
    const mine = foldC4(r.player_name);
    if (r.name_folded !== mine) {
      mismatch += 1;
      if (shown.length < 6) shown.push(`"${r.player_name}": column says "${r.name_folded}", the function says "${mine}"`);
    }
  }
  shown.forEach(s => fail(`the two folds disagree, so no typed spelling can reach this player. ${s}`));
  if (mismatch > shown.length) fail(`and ${mismatch - shown.length} more rows where the folds disagree`);
  console.log(`   ${rows.length - mismatch}/${rows.length} rows agree`);
  if (CONTROL === 'notranslit' && mismatch === 0) {
    console.error('   CONTROL notranslit changed nothing: dropping the transliteration step must break the no-decomposition names');
    process.exit(1);
  }
}

console.log('2) every row has a folded name');
{
  const empty = rows.filter(r => r.name_folded === null || r.name_folded === '');
  empty.slice(0, 5).forEach(r => fail(`"${r.player_name}" has no folded name, so nothing can reach it`));
  if (empty.length > 5) fail(`and ${empty.length - 5} more rows with no folded name`);
  console.log(`   ${empty.length} rows with an empty folded name`);
}

console.log('3) both shipped functions query the folded column, not the raw one');
{
  const c4Body = c4src.slice(c4src.indexOf('async function confirmClubAttribute'));
  const c4Fn = c4Body.slice(0, c4Body.indexOf('\n}\n') + 3);
  if (!/\.eq\("name_folded"/.test(c4Fn)) fail('football-connect4-validate no longer looks the player up on name_folded');
  if (/\.ilike\("player_name"/.test(c4Fn)) fail('football-connect4-validate is back to matching the raw player_name column, which is accent blind');
  const gridStints = gridsrc.match(/from\("soccer_player_club_stints"\)[\s\S]{0,220}?limit\(60\);/g) || [];
  const rawGrid = gridStints.filter(b => /\.ilike\("player_name"/.test(b));
  rawGrid.forEach(() => fail('soccer-grid-validate still reads soccer_player_club_stints with ilike on the raw player_name column'));
  console.log(`   connect4 folded: ${/\.eq\("name_folded"/.test(c4Fn) ? 'yes' : 'NO'}; grid stint lookups: ${gridStints.length}, raw ones: ${rawGrid.length}`);
}

console.log('4) names that could not be reached before now resolve');
{
  const distinct = [...new Set(rows.map(r => r.player_name))];
  const hard = distinct.filter(n => foldC4(n) !== n.toLowerCase().trim());
  console.log(`   ${hard.length} of ${distinct.length} distinct names are unreachable by a raw match`);
  if (hard.length === 0) fail('no accent or punctuation names were found at all, so this section proved nothing');
  const sample = hard.filter((_, i) => i % Math.max(1, Math.floor(hard.length / 12)) === 0).slice(0, 12);
  let resolved = 0;
  for (const name of sample) {
    const typed = foldC4(name);
    const url = CONTROL === 'rawcolumn'
      ? `${URL_}/rest/v1/soccer_player_club_stints?select=player_name&player_name=ilike.${encodeURIComponent(typed)}&limit=1`
      : `${URL_}/rest/v1/soccer_player_club_stints?select=player_name&name_folded=eq.${encodeURIComponent(typed)}&limit=1`;
    const r = await fetch(url, { headers: HEAD });
    const j = r.ok ? await r.json() : [];
    if (j.length > 0) resolved += 1;
    else fail(`typing "${typed}" still reaches nobody, and the table stores "${name}"`);
  }
  console.log(`   ${resolved}/${sample.length} sampled names resolve from their plain spelling`);
  if (CONTROL === 'rawcolumn' && resolved === sample.length) {
    console.error('   CONTROL rawcolumn changed nothing: the raw column must fail to match a folded spelling');
    process.exit(1);
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimSoccerStintNameFold: green. One table, one fold, and a plain spelling reaches the player.'
    : `\nsimSoccerStintNameFold: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
