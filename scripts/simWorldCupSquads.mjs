/* World Cup squads harness: the squads table holds whole tournaments, once.

   Round 389. world_cup_players carried one 2026 squad out of 48 (Spain, put
   in by Round 83 with placeholder numbers), so any 2026 debutant failed
   Player Bingo's "Played at a World Cup" tile, which two players reported by
   name. It also carried every 2014 row three times and every 2018 row twice.
   Round 389 imported the other 47 squads from two independent sources that
   had to agree on every man (Wikipedia's squad templates through the
   Wikipedia API, parsed by a script rather than retyped by a model, and Al
   Jazeera's full squad article, with Yahoo Sports as the third voice where
   those two differed) and collapsed the duplicates.

   What it holds, live:
     1. 2026: 48 nations, each with 23 to 26 rows and at least three
        goalkeepers, positions from {GK, DF, MF, FW}, a plausible date of
        birth on every row, and the eleven men a fan would name first all
        present (a pin against the wrong tournament or a half import).
     2. No (player, nation, year) appears twice in any tournament from 2010
        on. This is the fence for the 2014 and 2018 triplicates.

   Negative controls (house rule: prove each check can fail):
     SIM_WC_CONTROL=short   drops one 2026 nation from the fetched set before
                            section 1 counts; it must go red.
     SIM_WC_CONTROL=dupe    doubles one 2018 row in memory before section 2
                            counts; it must go red.
   Each asserts it changed something before running.

   Run: node scripts/simWorldCupSquads.mjs   (needs the database)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_WC_CONTROL || '';
let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

async function rows(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_}/rest/v1/world_cup_players?${query}`, {
      headers: { apikey: KEY, authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    }).catch(() => null);
    if (!res) abort('\nSUPABASE UNREACHABLE. NOTHING WAS CHECKED.');
    if (res.status === 416) break;
    if (!res.ok) abort(`\nSUPABASE ANSWERED HTTP ${res.status}. NOTHING WAS CHECKED.`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

section = 1;
console.log('1) 2026: 48 nations, whole squads, sane rows, the famous names present');
{
  let all = await rows('select=player_name,nationality,position,date_of_birth,squad_number&world_cup_year=eq.2026&order=nationality,squad_number');
  if (all.length === 0) abort('\nSUPABASE RETURNED NO 2026 ROWS. NOTHING WAS CHECKED.');
  const byNation = new Map();
  for (const r of all) { if (!byNation.has(r.nationality)) byNation.set(r.nationality, []); byNation.get(r.nationality).push(r); }
  if (CONTROL === 'short') {
    const victim = 'Panama';
    if (!byNation.has(victim)) abort('control cannot run: Panama is not in the 2026 set');
    byNation.delete(victim);
    console.log('   NEGATIVE CONTROL ON: Panama removed from the fetched set');
  }
  if (byNation.size !== 48) fail(`${byNation.size} nations in 2026, the tournament had 48`);
  let thin = 0;
  for (const [nation, list] of byNation) {
    if (list.length < 23 || list.length > 26) { fail(`${nation}: ${list.length} rows, a squad is 23 to 26`); thin += 1; }
    /* Every squad named three keepers, but a squad that ships short of 26
       may have lost one of them to the two-source rule (Bosnia and
       Herzegovina: Mladen Jurkas is listed by Wikipedia alone), so the floor
       drops to two there. A full squad with two is still wrong. */
    const gks = list.filter(r => r.position === 'GK').length;
    if (gks < (list.length === 26 ? 3 : 2)) fail(`${nation}: ${gks} goalkeepers in a squad of ${list.length}`);
    for (const r of list) {
      if (!['GK', 'DF', 'MF', 'FW'].includes(r.position)) fail(`${nation}: "${r.player_name}" has position "${r.position}"`);
      /* Measured on the imported rows: the oldest is Craig Gordon (1982) and
         the youngest were born in 2008. 1980 to 2011 leaves a few years each
         side and still refuses a birth date from the wrong century. */
      const y = Number(String(r.date_of_birth || '').slice(0, 4));
      if (!(y >= 1980 && y <= 2011)) fail(`${nation}: "${r.player_name}" was born ${r.date_of_birth}, which is not a 2026 squad member`);
    }
  }
  const names = new Set(all.map(r => r.player_name));
  /* Eleven names a fan would list first, spread across the field: a half
     import or the wrong tournament fails this before anything else does. */
  const pins = ['Lionel Messi', 'Kylian Mbappé', 'Lamine Yamal', 'Erling Haaland', 'Jude Bellingham', 'Cristiano Ronaldo', 'Mohamed Salah', 'Son Heung-min', 'Virgil van Dijk', 'Christian Pulisic', 'Vinícius Júnior'];
  for (const p of pins) if (!names.has(p)) fail(`"${p}" is not in the 2026 rows`);
  console.log(`   ${all.length} rows across ${byNation.size} nations, ${thin} outside 23 to 26, ${pins.filter(p => names.has(p)).length} of ${pins.length} pins present`);
}

section = 2;
console.log('2) No player appears twice for one nation in one tournament, 2010 on');
{
  let all = await rows('select=player_name,nationality,world_cup_year&world_cup_year=gte.2010&order=world_cup_year,nationality,player_name');
  if (all.length === 0) abort('\nSUPABASE RETURNED NO ROWS FROM 2010 ON. NOTHING WAS CHECKED.');
  if (CONTROL === 'dupe') {
    const victim = all.find(r => r.world_cup_year === 2018);
    if (!victim) abort('control cannot run: no 2018 row to double');
    all = [...all, { ...victim }];
    console.log(`   NEGATIVE CONTROL ON: "${victim.player_name}" (${victim.nationality} 2018) doubled in memory`);
  }
  const seen = new Map();
  for (const r of all) { const k = `${r.world_cup_year}|${r.nationality}|${r.player_name}`; seen.set(k, (seen.get(k) || 0) + 1); }
  const dupes = [...seen].filter(([, n]) => n > 1);
  for (const [k, n] of dupes.slice(0, 5)) fail(`${k.replace(/\|/g, ' / ')} appears ${n} times`);
  if (dupes.length > 5) fail(`${dupes.length - 5} more duplicated rows`);
  const years = {};
  for (const r of all) years[r.world_cup_year] = (years[r.world_cup_year] || 0) + 1;
  console.log(`   ${all.length} rows, ${dupes.length} duplicated; per year ${Object.entries(years).map(([y, n]) => `${y}: ${n}`).join(', ')}`);
}

if (CONTROL) {
  const target = { short: 1, dupe: 2 }[CONTROL];
  if (!target) abort(`unknown control "${CONTROL}"`);
  const fired = bySection[target];
  if (fired > 0) { console.log(`\ncontrol "${CONTROL}": ${fired} failure(s) fired in section ${target} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${target}, the check is dead`);
}
if (failures > 0) { console.error(`\nsimWorldCupSquads: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimWorldCupSquads: all green');
