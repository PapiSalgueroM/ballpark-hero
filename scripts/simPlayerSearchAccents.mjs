/* Player search harness: an unaccented query finds an accented name at the
   database, and the same query gives the same answer every time.

   Round 386. Born out of the Round 381 sweep. searchPlayers has two legs: an
   ilike on the raw name column with the raw typed text, and a "prominence
   pool" of the 1,000 most valuable rows ranked client side. The first leg
   returned zero rows for "gundogan", "rudiger" and "yaya toure" because the
   table keeps the accents, and the second was ordered by value with no
   tiebreak while 317 rows tie at its 1,000th seat, so ten identical requests
   returned eight different name sets and an accented man on the tie was
   found at "ant" and gone once the name was typed correctly.

   Round 386 gave player_market_values a stored name_folded column,
   lower(unaccent(player_name)) with a trigram index, made the soccer sources
   search it with the normalized query, and gave both legs a value, recency,
   name order. This harness holds all three promises live:
     1. The column: no row is missing it, and on the names that motivated the
        round it equals what the client's normalizeName produces, so the two
        sides of the comparison fold the same way.
     2. The search: for each accented man, the plain spelling of his full
        name and of his surname returns his row through the real
        searchPlayers with the real soccer source.
     3. Determinism: ten identical requests for a two letter query return one
        result set.

   Negative controls (house rule: prove each check can fail):
     SIM_SEARCH_CONTROL=raw    runs section 2 through a copy of the source with
                               foldedNameColumn removed, the pre-Round-386
                               shape; some of the names must vanish.
     SIM_SEARCH_CONTROL=notie  runs section 3 against the pool fetched with the
                               pre-Round-386 order (value only) ten times and
                               requires at least two different answers. This
                               control reads the database's own tie handling,
                               which is what the round measured as unstable;
                               if Postgres ever returns the tie in one order
                               ten times in a row the control will say it
                               changed nothing, and that is a re-run, not a
                               defect.
   Each control asserts it changed something before running and is judged
   only on the section it targets.

   Run: node scripts/simPlayerSearchAccents.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_SEARCH_CONTROL || '';
const ENTRY = path.join(os.tmpdir(), 'playerSearchAccentsEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'playerSearchAccents.bundle.mjs');

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

fs.writeFileSync(ENTRY, `
export { searchPlayers, normalizeName, SOCCER_MARKET_VALUE_SOURCE, TRANSFER_PATH_PLAYER_SOURCE } from '${ROOT_URL}/src/lib/playerSearch.ts';
export { supabase } from '${ROOT_URL}/src/integrations/supabase/client.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { searchPlayers, normalizeName, SOCCER_MARKET_VALUE_SOURCE, TRANSFER_PATH_PLAYER_SOURCE, supabase } = await import(pathToFileURL(BUNDLE).href);

const nothingChecked = () => abort('\nSUPABASE UNREACHABLE. NOTHING WAS CHECKED.');

/* The men who motivated the round, with the plain spellings a player types. */
const CASES = [
  { name: 'İlkay Gündoğan', typed: ['ilkay gundogan', 'gundogan'] },
  { name: 'Antonio Rüdiger', typed: ['antonio rudiger', 'rudiger'] },
  { name: 'Yaya Touré', typed: ['yaya toure', 'toure'] },
  { name: 'Kylian Mbappé', typed: ['kylian mbappe', 'mbappe'] },
  { name: 'Martin Ødegaard', typed: ['martin odegaard', 'odegaard'] },
  { name: 'Kléberson', typed: ['kleberson'] },
  { name: 'Fábio Coentrão', typed: ['fabio coentrao', 'coentrao'] },
  { name: 'Edmílson', typed: ['edmilson'] },
  { name: 'Nicolò Barella', typed: ['nicolo barella', 'barella'] },
];

section = 1;
console.log('1) name_folded is on every row and folds the way the client does');
{
  const { count, error } = await supabase.from('player_market_values').select('id', { count: 'exact', head: true }).is('name_folded', null);
  if (error) nothingChecked();
  if (count !== 0) fail(`${count} rows have no name_folded`);
  const { data, error: e2 } = await supabase.from('player_market_values').select('player_name, name_folded').in('player_name', CASES.map(c => c.name)).limit(1000);
  if (e2) nothingChecked();
  const seen = new Set();
  for (const r of data) {
    seen.add(r.player_name);
    if (r.name_folded !== normalizeName(r.player_name)) fail(`"${r.player_name}" folds to "${r.name_folded}" in the table and "${normalizeName(r.player_name)}" in the client`);
  }
  for (const c of CASES) if (!seen.has(c.name)) fail(`"${c.name}" has no row in the table, so this case measures nothing`);
  /* Only the market value source lives on this table. Transfer Path searches
     career_players, which has no folded column; it keeps the raw leg. */
  if (SOCCER_MARKET_VALUE_SOURCE.foldedNameColumn !== 'name_folded') fail('the soccer market value source does not declare foldedNameColumn');
  if (TRANSFER_PATH_PLAYER_SOURCE.table === 'player_market_values' && TRANSFER_PATH_PLAYER_SOURCE.foldedNameColumn !== 'name_folded') fail('the Transfer Path source reads this table without the folded column');
  console.log(`   ${data.length} rows across ${seen.size} names fold identically on both sides`);
}

section = 2;
console.log(`2) The plain spelling finds the accented man through the real search${CONTROL === 'raw' ? ' (folded column removed, the pre-Round-386 shape)' : ''}`);
{
  let source = SOCCER_MARKET_VALUE_SOURCE;
  if (CONTROL === 'raw') {
    if (!source.foldedNameColumn) abort('control cannot run: the source has no folded column to remove');
    const { foldedNameColumn, ...rest } = source;
    source = rest;
  }
  let queries = 0;
  let errors = 0;
  let found = 0;
  for (const c of CASES) {
    const want = normalizeName(c.name);
    for (const q of c.typed) {
      queries += 1;
      const res = await searchPlayers({ source, query: q, minChars: 2, limit: 8 });
      if (res.error) { errors += 1; continue; }
      if (res.results.some(e => normalizeName(e.rawName) === want)) found += 1;
      else fail(`"${q}" does not surface "${c.name}" (got ${res.results.slice(0, 3).map(e => `"${e.rawName}"`).join(', ') || 'nothing'})`);
    }
  }
  if (queries > 0 && errors === queries) nothingChecked();
  console.log(`   ${found} of ${queries} queries found their man, ${errors} errors`);
}

section = 3;
console.log(`3) Ten identical requests, one answer${CONTROL === 'notie' ? ' (pool fetched with the pre-Round-386 order)' : ''}`);
{
  const sets = [];
  if (CONTROL === 'notie') {
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from('player_market_values')
        .select('player_name')
        .order('market_value_usd', { ascending: false })
        .limit(1000);
      if (error) nothingChecked();
      sets.push([...new Set(data.map(r => normalizeName(r.player_name)))].sort().join('|'));
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const res = await searchPlayers({ source: SOCCER_MARKET_VALUE_SOURCE, query: 'an', minChars: 2, limit: 8 });
      if (res.error) nothingChecked();
      sets.push(res.results.map(e => e.key).join('|'));
    }
  }
  const distinct = new Set(sets).size;
  if (distinct !== 1) fail(`${distinct} different answers in 10 identical requests`);
  console.log(`   ${distinct} distinct answer${distinct === 1 ? '' : 's'} in 10 requests`);
}

if (CONTROL) {
  const target = { raw: 2, notie: 3 }[CONTROL];
  if (!target) abort(`unknown control "${CONTROL}"`);
  const fired = bySection[target];
  const elsewhere = failures - fired;
  if (fired > 0) {
    console.log(`\ncontrol "${CONTROL}": ${fired} failure(s) fired in section ${target} as expected, the check works${elsewhere ? ` (${elsewhere} elsewhere, not counted)` : ''}`);
    process.exit(0);
  }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${target}, the check is dead${CONTROL === 'notie' ? ' (or Postgres returned the tie in one order ten times; re-run before believing that)' : ''}`);
}

if (failures > 0) {
  console.error(`\nsimPlayerSearchAccents: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimPlayerSearchAccents: all green');
