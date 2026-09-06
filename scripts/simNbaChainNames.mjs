/* NBA Chain can answer the biggest names in the modern game.
 *
 * Round 486. Measured against production on 2026-09-06, "Nikola Jokic",
 * "Luka Doncic" and "Nikola Vucevic" each came back "does not appear in our NBA
 * records (1949-2024)", while Durant and Curry resolved normally. The game had
 * been played that same day, and nobody had reported it.
 *
 * TWO causes, and repairing either alone would have changed nothing:
 *   1. The names were double encoded UTF-8. nba_player_team_stints held 393
 *      rows across 144 people as "Nikola JokiÄ", and bref_nba_player_seasons
 *      held 902 rows across the same 144. The bref table also feeds
 *      nbaHLPlayers, localLineupEval, nbaStatLine, perfectSeasonNba and
 *      statDetective, so those names were being DISPLAYED broken elsewhere.
 *   2. The validator folded accents in JS and then fetched with an ilike on the
 *      RAW column, so "Jokic" missed "Jokić" even once the encoding was right.
 *
 * WHAT THIS HOLDS, against the live database and the live function, because
 * both causes lived outside the source:
 *   1. No double encoded name remains in either table. The detector keys on a
 *      character in U+0080-U+00BF, the artifact range, NOT on the letters Ã or
 *      Â: censusing 53 tables with the naive detector produced false positives
 *      on correctly spelled Portuguese ("Ânderson Polga", "Ângelo"), and a
 *      repair driven by that would have corrupted real names.
 *   2. Every row's name_folded still matches the fold of its own player_name.
 *      The column is backfilled by migration, so a re-import that forgets it
 *      would silently lose every accented player again.
 *   3. The live function answers a battery of accented stars. This is the
 *      outcome the player experiences and it is measured, not inferred.
 *   4. The source still prefilters on name_folded. A revert to the raw column
 *      would pass sections 1 to 3 on the day and break the game again.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   NBA_NAMES_CONTROL=nofold  expects the source to use the raw column, so
 *     section 4 goes red.
 *   NBA_NAMES_CONTROL=rawmatch recomputes the fold WITHOUT stripping accents,
 *     so section 2 disagrees with the stored column and goes red. It proves
 *     section 2 can actually see a wrong fold rather than passing vacuously.
 *
 * Run: node scripts/simNbaChainNames.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.NBA_NAMES_CONTROL || '';
if (CONTROL && !['nofold', 'rawmatch'].includes(CONTROL)) {
  console.error(`NBA_NAMES_CONTROL=${CONTROL} is not a control this harness knows (nofold, rawmatch)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(qs, attempt = 0) {
  try {
    const res = await fetch(`${URL_}/rest/v1/${qs}`, { headers: HEAD });
    if (res.ok) return res.json();
  } catch { /* retried below */ }
  if (attempt === 0) { await new Promise(r => setTimeout(r, 700)); return rest(qs, 1); }
  return null;
}

/* The function's own norm(), character for character. If these drift the
   column stops being an index and becomes a second opinion. */
const TRANSLIT = { 'ı': 'i', 'ß': 'ss', 'ø': 'o', 'ł': 'l', 'đ': 'd', 'æ': 'ae', 'œ': 'oe', 'þ': 'th', 'ð': 'd' };
const norm = s => (s || '').toLowerCase().replace(/[ıßøłđæœþð]/g, c => TRANSLIT[c] ?? c)
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
/* The control's deliberately broken fold: everything except the accents. */
const normNoAccent = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/* A character in U+0080-U+00BF never appears in a real name and is the tell of
   a double encoding. Ã and Â on their own do NOT qualify: Portuguese uses them. */
const MOJIBAKE = /[-¿]/;

console.log('1) no double encoded name remains');
{
  for (const table of ['nba_player_team_stints', 'bref_nba_player_seasons']) {
    /* Paged, because PostgREST caps a select at 1,000 rows and reading only the
       first page would call a 30,000 row table clean on the strength of its
       first thousand. */
    let checked = 0, bad = [];
    for (let from = 0; ; from += 1000) {
      const res = await fetch(`${URL_}/rest/v1/${table}?select=player_name`,
        { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
      if (!res.ok) { fail(`could not read ${table}`); break; }
      const page = await res.json();
      for (const r of page) { checked++; if (MOJIBAKE.test(r.player_name || '')) bad.push(r.player_name); }
      if (page.length < 1000) break;
      if (from > 60000) break;
    }
    if (bad.length) fail(`${table}: ${bad.length} double encoded names remain, e.g. ${bad.slice(0, 3).join(', ')}`);
    console.log(`   ${table}: ${checked} rows read, ${bad.length} still broken`);
  }
}

console.log('2) every folded name still matches its own player_name');
{
  const fold = CONTROL === 'rawmatch' ? normNoAccent : norm;
  let checked = 0, wrong = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_}/rest/v1/nba_player_team_stints?select=player_name,name_folded`,
      { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
    if (!res.ok) { fail('could not read nba_player_team_stints'); break; }
    const page = await res.json();
    for (const r of page) {
      checked++;
      if ((r.name_folded ?? '') !== fold(r.player_name)) wrong.push(r.player_name);
    }
    if (page.length < 1000) break;
    if (from > 60000) break;
  }
  console.log(`   ${checked} rows, ${wrong.length} whose name_folded disagrees with their name`);
  if (wrong.length) fail(`${wrong.length} rows have a stale or wrong name_folded, e.g. ${wrong.slice(0, 3).join(', ')}: refill it or the accented players vanish again`);
  if (CONTROL === 'rawmatch' && wrong.length === 0) {
    console.error('   CONTROL rawmatch changed nothing: an unaccented fold must disagree with the column');
    process.exit(1);
  }
}

console.log('3) the live function answers the accented stars');
{
  /* Hand-picked because they are the men a player is most likely to type, and
     every one of them was unanswerable before this round. The partner is a real
     teammate, so a correct answer is valid=true with a named club. */
  const PAIRS = [
    ['Jamal Murray', 'Nikola Jokic'],
    ['Kyrie Irving', 'Luka Doncic'],
    ['Zach LaVine', 'Nikola Vucevic'],
    ['Joel Embiid', 'Dario Saric'],
    ['Trae Young', 'Bogdan Bogdanovic'],
  ];
  let ok = 0;
  for (const [prev, next] of PAIRS) {
    const res = await fetch(`${URL_}/functions/v1/nba-chain-validate`, {
      method: 'POST',
      headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ previousPlayer: prev, newPlayer: next }),
    });
    const j = await res.json().catch(() => ({}));
    const unknown = /does not appear in our NBA records/.test(String(j.reason || ''));
    if (unknown) fail(`${next} is still unknown to the validator: ${String(j.reason).slice(0, 90)}`);
    else ok++;
    console.log(`   ${next} <- ${prev}: ${unknown ? 'UNKNOWN PLAYER' : (j.valid ? j.connection : 'known, ' + String(j.reason || '').slice(0, 50))}`);
  }
  console.log(`   ${ok}/${PAIRS.length} accented players are known to the validator`);
}

console.log('4) the source still prefilters on the folded column');
{
  const src = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'nba-chain-validate', 'index.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const usesFolded = CONTROL === 'nofold' ? false : /ilike\(\s*["']name_folded["']/.test(src);
  if (!usesFolded) {
    fail('nba-chain-validate no longer prefilters on name_folded: an accent-sensitive ilike on the raw column is what hid Jokic, Doncic and Vucevic');
  }
  console.log(`   prefilter on name_folded: ${usesFolded ? 'yes' : 'NO'}`);
  if (CONTROL === 'nofold' && failures === 0) {
    console.error('   CONTROL nofold changed nothing');
    process.exit(1);
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimNbaChainNames: green. The accented players are in the table, folded, and answerable.'
  : `\nsimNbaChainNames: ${failures} finding(s).`);
process.exit(failures === 0 ? 0 : 1);
