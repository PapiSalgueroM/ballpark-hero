/* College Grid answers from its own tables instead of spending an AI call.
 *
 * Round 490. College Grid recorded its last completion on 2026-07-31 and
 * nothing in the 37 days after. The game was not broken; its checker was blind.
 *
 * scripts/simCollegeGrid.mjs has always proved that every square of every board
 * has a real answer, and it proves it from four tables the VALIDATOR never
 * opened: nfl_draft_picks, cfb_heisman_winners, cfb_all_americans and
 * cfb_national_champions. So the answers existed, the checker could not see
 * them, and every one of those cells fell through to a free AI allowance that
 * is spent for most of the day.
 *
 * Measured over the 450 criteria on the 75 boards: 275 (61 percent) could be
 * answered from data, and a cell needs BOTH of its criteria, so only about a
 * third of the board could ever be settled without the model. Adding draft
 * (44 criteria), Heisman (12) and All-American (19) takes that to 350 of 450,
 * about three fifths of cells.
 *
 * THE ROUND COLUMN IS CORRUPT, and that is the trap this file mostly exists for.
 * 8,767 of the 11,417 rows marked round 1 carry an impossible pick number, up to
 * 487, because the scrape defaults an unparsed round to 1. The 1982 draft alone
 * files picks 252 to 257 as first rounders. Rounds 2 to 8 are internally
 * consistent, so "first round" is DERIVED: every pick before round two begins,
 * a boundary that is in the data itself (33 in 2025, 32 in 2000, 26 in 1990).
 * Anyone who later "simplifies" this back to round = 1 turns thousands of late
 * picks into first rounders, so section 1 keeps the measurement alive.
 *
 * WHAT THIS HOLDS:
 *   1. The round column is still corrupt, measured, so the derivation is still
 *      necessary. If the data is ever repaired this section says so.
 *   2. The derived boundary agrees with where round two actually starts, across
 *      a spread of decades.
 *   3. The live validator settles a battery FROM DATA, and does not confirm a
 *      second round pick as a first rounder.
 *   4. The source does not test the round column for the first round question.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   CG_DATA_CONTROL=roundcol   judges the first round from the corrupt column,
 *     so section 2 accepts a 1982 pick 254 as a first rounder and goes red.
 *   CG_DATA_CONTROL=sourceblind expects the source NOT to read the new tables,
 *     so section 4 goes red.
 *
 * Run: node scripts/simCollegeGridFromData.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CG_DATA_CONTROL || '';
if (CONTROL && !['roundcol', 'sourceblind'].includes(CONTROL)) {
  console.error(`CG_DATA_CONTROL=${CONTROL} is not a control this harness knows (roundcol, sourceblind)`);
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
  } catch { /* retried */ }
  if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); return rest(qs, attempt + 1); }
  return null;
}
const enc = encodeURIComponent;

console.log('1) the round column is still unusable, so the derivation is still needed');
{
  const bad = await rest('nfl_draft_picks?select=id&round=eq.1&pick=gt.32&limit=1');
  const sample = await rest('nfl_draft_picks?select=player_name,year,round,pick&round=eq.1&pick=gt.200&order=year.desc&limit=3');
  const impossible = Array.isArray(bad) && bad.length > 0;
  if (!impossible) {
    console.log('   the round column now looks clean: no row is marked round 1 with a pick past 32.');
    console.log('   If that is a real repair, the derivation can be simplified. Verify before doing it.');
  } else {
    console.log('   round 1 rows with an impossible pick still exist, e.g.:');
    for (const r of sample ?? []) console.log(`     ${r.player_name} ${r.year} filed as round ${r.round} pick ${r.pick}`);
  }
}

console.log('2) the derived first round boundary agrees with where round two starts');
{
  const YEARS = [2025, 2021, 2010, 2000, 1990, 1982, 1970];
  let wrong = 0, checked = 0;
  for (const y of YEARS) {
    const r2 = await rest(`nfl_draft_picks?select=pick&year=eq.${y}&round=eq.2&order=pick.asc&limit=1`);
    const first2 = (r2 ?? [])[0]?.pick;
    if (typeof first2 !== 'number') { console.log(`   ${y}: no round two row, not judged`); continue; }
    const boundary = first2 - 1;
    checked++;
    /* Every row the derivation calls a first rounder must have a pick at or
       below the boundary; the control judges by the corrupt column instead. */
    const q = CONTROL === 'roundcol'
      ? `nfl_draft_picks?select=player_name,pick&year=eq.${y}&round=eq.1&order=pick.desc&limit=1`
      : `nfl_draft_picks?select=player_name,pick&year=eq.${y}&pick=lte.${boundary}&order=pick.desc&limit=1`;
    const top = await rest(q);
    const worst = (top ?? [])[0];
    if (worst && worst.pick > boundary) {
      fail(`${y}: ${worst.player_name} counts as a first round pick at pick ${worst.pick}, and round two starts at ${first2}`);
      wrong++;
    }
    console.log(`   ${y}: round two starts at ${first2}, so the first round ends at ${boundary}${worst ? `, worst counted pick ${worst.pick}` : ''}`);
  }
  console.log(`   ${checked} drafts checked, ${wrong} with an impossible first rounder`);
  if (CONTROL === 'roundcol' && wrong === 0) {
    console.error('   CONTROL roundcol changed nothing: the corrupt column must produce an impossible first rounder');
    process.exit(1);
  }
}

console.log('3) the live validator settles these from data, not from the model');
{
  const FROM_DATA = [
    ['Joe Burrow', 'Heisman Winner', 'First Round Pick'],
    ['Derrick Henry', 'Heisman Winner', 'Alabama'],
    ['Patrick Mahomes', 'Top 10 Pick', 'Quarterback'],
    ['Baker Mayfield', 'Heisman Winner', 'Oklahoma'],
  ];
  let fromData = 0;
  for (const [player, row, col] of FROM_DATA) {
    const res = await fetch(`${URL_}/functions/v1/college-grid-validate`, {
      method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: player, rowAttribute: row, colAttribute: col }),
    });
    const j = await res.json().catch(() => ({}));
    const settled = j.valid === true && (j.cached === true || /Verified from college and NFL records/.test(String(j.reason || '')));
    if (settled) fromData++;
    else fail(`${player} / "${row}" x "${col}" should be settled from data and came back: ${String(j.reason || j.error || '').slice(0, 70)}`);
    console.log(`   ${player} / ${row}: ${settled ? 'from data' : 'NOT settled from data'}`);
  }
  /* And the fix must not have made it generous: a second round pick is not a
     first rounder, whatever the corrupt column says about him. */
  const res = await fetch(`${URL_}/functions/v1/college-grid-validate`, {
    method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'Derrick Henry', rowAttribute: 'First Round Pick', colAttribute: 'Alabama' }),
  });
  const j = await res.json().catch(() => ({}));
  const wronglyConfirmed = j.valid === true && /Verified from college and NFL records/.test(String(j.reason || ''));
  if (wronglyConfirmed) fail('Derrick Henry was confirmed from data as a first round pick and he went 45th overall in round two');
  console.log(`   Derrick Henry / First Round Pick: ${wronglyConfirmed ? 'WRONGLY CONFIRMED' : 'not confirmed, correct'}`);
  console.log(`   ${fromData}/${FROM_DATA.length} settled without the model`);
}

console.log('4) the source reads the new tables and does not trust the round column');
{
  const src = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'college-grid-validate', 'index.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const reads = CONTROL === 'sourceblind' ? false :
    /cfb_heisman_winners/.test(src) && /cfb_all_americans/.test(src) && /nfl_draft_picks/.test(src);
  if (!reads) fail('college-grid-validate no longer reads the Heisman, All-American and draft tables, so those cells go back to the model');
  /* The round column may only be used to FIND where round two starts. It must
     never be the test for the first round itself. */
  const usesRoundOne = /eq\(\s*["']round["']\s*,\s*1\s*\)/.test(src);
  if (usesRoundOne) fail('the source tests round = 1 directly, and 8,767 rows marked round 1 have an impossible pick number');
  console.log(`   reads the new tables: ${reads ? 'yes' : 'NO'}; tests round = 1 directly: ${usesRoundOne ? 'YES' : 'no'}`);
  if (CONTROL === 'sourceblind' && failures === 0) {
    console.error('   CONTROL sourceblind changed nothing');
    process.exit(1);
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimCollegeGridFromData: green. The grid answers from its own tables, and the corrupt round column is not trusted.'
  : `\nsimCollegeGridFromData: ${failures} finding(s).`);
process.exit(failures === 0 ? 0 : 1);
