/* Rarity Round agreement harness: every player the dropdown offers for a
   category is a player the category's pool accepts.

   Round 387. Born out of the Round 381 sweep: "Name a goalkeeper" offered
   Claudio Bravo, the Chilean keeper, and refused him. The dropdown filters
   player_market_values by position across every row a player has and dedupes
   by the most valuable one; the pool read player_peak_values, one row per
   player carrying the position of his NEWEST row, and person_key is NULL on
   every row, so for a shared name that newest row was another man's (the
   Argentine left-back's). Two fixes: player_peak_values now carries the
   position and nationality of the row that earned the peak, and the position
   and nationality pools read player_position_peaks and
   player_nationality_peaks, one row per player and TAG, so the pool means
   what the dropdown means: ever tagged.

   What it holds, live:
     1. For every category with a filtered dropdown (nationality-* and
        position-*), the real searchPlayers with the category's own
        sourceConfig is run for a spread of two letter prefixes, and every
        player it offers is in the category's real pool (cat.fetchPool). This
        is the whole promise: nothing on offer is refused.
     2. Claudio Bravo is offered for "Name a goalkeeper" and accepted.
     3. player_peak_values agrees with the dropdown's row for every player
        section 1 saw: the position and nationality on offer are the ones the
        view carries.

   Negative control (house rule: prove the check can fail):
     SIM_RARITY_AGREE_CONTROL=peakonly judges section 1 against a pool built
     from player_peak_values (one tag per player, the pre-Round-387 shape)
     instead of the real pool; the multi-tag players the dropdown offers must
     then be refused. The control refuses to run unless it finds at least one
     such player to refuse.

   Run: node scripts/simRarityAgreement.mjs   (needs the database)
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_RARITY_AGREE_CONTROL || '';
const ENTRY = path.join(os.tmpdir(), 'rarityAgreementEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'rarityAgreement.bundle.mjs');

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

fs.writeFileSync(ENTRY, `
export { CATEGORIES } from '${ROOT_URL}/src/lib/rarityRound.ts';
export { searchPlayers, normalizeName } from '${ROOT_URL}/src/lib/playerSearch.ts';
export { supabase } from '${ROOT_URL}/src/integrations/supabase/client.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { CATEGORIES, searchPlayers, normalizeName, supabase } = await import(pathToFileURL(BUNDLE).href);

const nothingChecked = () => abort('\nSUPABASE UNREACHABLE. NOTHING WAS CHECKED.');

const PREFIXES = ['al', 'an', 'ar', 'ca', 'da', 'de', 'di', 'ed', 'el', 'fe', 'fr', 'ga', 'gi', 'ha', 'ja', 'jo', 'ju', 'ka', 'le', 'lu', 'ma', 'mi', 'mo', 'na', 'ni', 'pa', 'pe', 'ra', 'ro', 'sa', 'se', 'th', 'to', 'vi', 'wi', 'yo'];

const filtered = CATEGORIES.filter(c => c.sourceConfig && Array.isArray(c.sourceConfig.filters) && c.sourceConfig.filters.length === 1 && c.sourceConfig.filters[0].op === 'eq');
if (filtered.length < 5) abort(`only ${filtered.length} filtered categories found, the catalog is not being read`);

/* Every player the dropdown offered, per category: name, and the row's own tag. */
const offered = new Map(); // cat.id -> Map<key, { rawName, tagColumn, tagValue, meta }>
let searches = 0;
let errors = 0;

section = 1;
console.log(`1) Everything the dropdown offers is in the pool, ${filtered.length} filtered categories${CONTROL === 'peakonly' ? ' (judged against one tag per player, the pre-Round-387 pool)' : ''}`);
{
  const peakByName = new Map();
  for (const cat of filtered) {
    const filter = cat.sourceConfig.filters[0];
    const seen = new Map();
    for (const q of PREFIXES) {
      searches += 1;
      const res = await searchPlayers({ source: cat.sourceConfig, query: q, minChars: 2, limit: 8 });
      if (res.error) { errors += 1; continue; }
      for (const e of res.results) {
        if (!seen.has(e.key)) seen.set(e.key, { rawName: e.rawName, tagColumn: filter.column, tagValue: filter.value, meta: e.meta });
      }
    }
    offered.set(cat.id, seen);
    const pool = await cat.fetchPool();
    if (!pool || pool.length === 0) { fail(`${cat.id}: the pool came back empty`); continue; }
    let accepted;
    if (CONTROL === 'peakonly' && filter.column !== 'position' && filter.column !== 'nationality') {
      /* The old pool for a club category never read the view, so there is
         nothing old to judge it against; only the tag categories carry the
         pre-Round-387 shape. */
      console.log(`   ${cat.id.padEnd(24)} skipped under the control, the view has no ${filter.column} column`);
      continue;
    }
    if (CONTROL === 'peakonly') {
      const names = [...seen.values()].map(v => v.rawName);
      for (let i = 0; i < names.length; i += 80) {
        const { data, error } = await supabase.from('player_peak_values').select('player_name, position, nationality').in('player_name', names.slice(i, i + 80));
        if (error) nothingChecked();
        for (const r of data) peakByName.set(normalizeName(r.player_name), r);
      }
      accepted = key => { const r = peakByName.get(key); return !!r && r[filter.column] === filter.value; };
    } else {
      const keys = new Set(pool.map(p => p.key));
      accepted = key => keys.has(key);
    }
    let refused = 0;
    for (const [key, v] of seen) {
      if (!accepted(key)) {
        refused += 1;
        if (refused <= 3) fail(`${cat.id}: the dropdown offers "${v.rawName}" and the pool refuses him`);
      }
    }
    if (refused > 3) fail(`${cat.id}: ${refused - 3} more offered and refused`);
    console.log(`   ${cat.id.padEnd(24)} offered ${String(seen.size).padStart(3)}, pool ${String(pool.length).padStart(5)}, refused ${refused}`);
  }
  if (searches > 0 && errors === searches) nothingChecked();
  if (CONTROL === 'peakonly' && bySection[1] === 0) abort('control cannot run: no offered player has a second tag, so there is nothing for the old pool to refuse');
  console.log(`   ${searches} searches, ${errors} errors`);
}

section = 2;
console.log('2) Claudio Bravo, the Chilean keeper, is offered for "Name a goalkeeper" and accepted');
{
  const cat = filtered.find(c => c.id === 'position-goalkeeper');
  if (!cat) fail('no position-goalkeeper category');
  else {
    const res = await searchPlayers({ source: cat.sourceConfig, query: 'claudio bravo', minChars: 2, limit: 8 });
    if (res.error) nothingChecked();
    const bravo = res.results.find(e => normalizeName(e.rawName) === 'claudio bravo');
    if (!bravo) fail('the goalkeeper dropdown does not offer Claudio Bravo');
    else {
      const pool = await cat.fetchPool();
      if (!pool.some(p => p.key === 'claudio bravo')) fail('the goalkeeper pool refuses Claudio Bravo');
      console.log(`   offered as ${bravo.meta.position || '?'}, ${bravo.meta.nationality || '?'}, $${((bravo.meta.value || 0) / 1e6).toFixed(0)}M; in the pool: ${pool.some(p => p.key === 'claudio bravo')}`);
    }
  }
}

section = 3;
console.log('3) player_peak_values carries the tags of the row the dropdown shows');
{
  const wanted = new Map();
  for (const seen of offered.values()) for (const [key, v] of seen) if (!wanted.has(key)) wanted.set(key, v);
  const names = [...wanted.values()].map(v => v.rawName);
  const view = new Map();
  for (let i = 0; i < names.length; i += 80) {
    const { data, error } = await supabase.from('player_peak_values').select('player_name, position, nationality, peak_value_usd').in('player_name', names.slice(i, i + 80));
    if (error) nothingChecked();
    for (const r of data) view.set(normalizeName(r.player_name), r);
  }
  let compared = 0;
  let mismatches = 0;
  let namesakeTies = 0;
  for (const [key, v] of wanted) {
    const r = view.get(key);
    if (!r) { fail(`"${v.rawName}" is offered but has no row in player_peak_values`); continue; }
    /* Only the row the dropdown shows as the player's peak can be compared:
       the filtered dropdown shows his best row under the filter, and the view
       shows his best row overall. Where those are the same row (same value),
       the tags must match. */
    if (Number(v.meta.value) !== Number(r.peak_value_usd)) continue;
    compared += 1;
    const off = { position: v.meta.position, nationality: v.meta.nationality };
    if ((off.position || '') !== (r.position || '') || (off.nationality || '') !== (r.nationality || '')) {
      /* Two different men can share a name AND a peak value in the same year
         (two Serginhos, a Brazilian left-back and a Cape Verdean right
         winger). The view breaks that tie by row id and the dropdown by
         whichever row it saw first, and neither side can see the other's
         key. When every tag on offer sits on a row at that same value, it is
         a namesake tie and a display matter, not a refused player: section 1
         already proved the pool accepts him. */
      const { data, error } = await supabase
        .from('player_market_values')
        .select('position, nationality')
        .eq('player_name', v.rawName)
        .eq('market_value_usd', Number(r.peak_value_usd))
        .limit(50);
      if (error) nothingChecked();
      const onOffer = data.some(x => (x.position || '') === (off.position || '') && (x.nationality || '') === (off.nationality || ''));
      const onView = data.some(x => (x.position || '') === (r.position || '') && (x.nationality || '') === (r.nationality || ''));
      if (onOffer && onView) {
        namesakeTies += 1;
        console.log(`   namesake tie, display only: "${v.rawName}" is ${off.position}, ${off.nationality} on offer and ${r.position}, ${r.nationality} in the view, both at $${(Number(r.peak_value_usd) / 1e6).toFixed(0)}M`);
        continue;
      }
      mismatches += 1;
      if (mismatches <= 3) fail(`"${v.rawName}": the dropdown shows ${off.position}, ${off.nationality}; the view carries ${r.position}, ${r.nationality}`);
    }
  }
  if (mismatches > 3) fail(`${mismatches - 3} more tag mismatches`);
  console.log(`   ${wanted.size} offered players, ${compared} whose peak row the dropdown showed, ${mismatches} mismatches, ${namesakeTies} namesake ties`);
}

if (CONTROL) {
  const target = { peakonly: 1 }[CONTROL];
  if (!target) abort(`unknown control "${CONTROL}"`);
  const fired = bySection[target];
  const elsewhere = failures - fired;
  if (fired > 0) {
    console.log(`\ncontrol "${CONTROL}": ${fired} failure(s) fired in section ${target} as expected, the check works${elsewhere ? ` (${elsewhere} elsewhere, not counted)` : ''}`);
    process.exit(0);
  }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${target}, the check is dead`);
}

if (failures > 0) {
  console.error(`\nsimRarityAgreement: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimRarityAgreement: all green');
