/* Player Bingo pool harness: every pool player is his newest row, and a
   history row that cannot be the same man is not his.

   Round 385. Born out of the Round 381 sweep. fetchPool took the top 1,000
   rows by value from 2024 on and deduped them by name keeping the newest
   row AMONG THOSE 1,000, which is not the player's newest row: a man whose
   best recent year sat inside the top 1,000 and whose current year did not
   was held at the old club, age and value. Measured before the fix: 134 of
   467 pool players carried a row older than their newest, 67 at a club they
   had left, Kevin De Bruyne was a 32 year old at Manchester City against the
   table's own 2026 row at Napoli, and Elye Wahi satisfied "Aged 21 or
   younger" at 20 while his newest row said 22. Four of the eight criterion
   kinds read that row. simMarketYearScope stayed green throughout because
   it asks whether a query is year scoped, not whether it keeps the newest
   row.

   The second half is identity. person_key is NULL on every row, so one name
   is one career: "Rodri" is at least three men and the 2006 Barcelona row of
   a 21 year old put Manchester City's Rodri, then aged 10, alongside Messi.
   A history row now has to walk with the pool row (age against year), and a
   row at 19 or under valued at two million or less is an academy row for the
   club tiles, which is how Grimaldo's Barcelona B seasons read as Barcelona.

   What it holds:
     1. The two rules, on the real rows that motivated them, in BOTH
        directions: the impostor rows are refused and the man's own rows kept.
     2. Live: every pool player's row IS his newest recent row in the table
        (year, age, club, value), checked against an independent read. The
        pre-Round-385 selection is rebuilt here as the baseline, so the run
        prints how many players the fix moved.
     3. Live: the Messi club teammate tile no longer carries Rodri or
        Grimaldo, still carries every known Barcelona and PSG teammate who is
        in the pool, and Rodri's club history no longer holds Betis, Huesca or
        Cartagena.

   Known and printed, not asserted: Lucas Hernández. His 2023 row says PSG
   and Messi's 2023 row says PSG, but he joined the month after Messi left.
   The table's year is the valuation's calendar year, which can fall either
   side of a summer move, and the only rule that removes him (a first year
   at the club that is Messi's last there) also removes Fabián Ruiz and Hugo
   Ekitiké, who did play with him. A rejected right answer is the complaint
   this queue actually gets, so recall wins and he stays.

   Negative controls (house rule: prove each check can fail):
     SIM_BINGO_CONTROL=stale   judges section 2 on the pre-Round-385 selection
                               instead of the live pool; it must go red.
     SIM_BINGO_CONTROL=pin     injects Rodri into the Messi support before
                               section 3 reads it; it must go red.
   Each asserts it changed something before running.

   Run: node scripts/simPlayerBingoPool.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_BINGO_CONTROL || '';
const ENTRY = path.join(os.tmpdir(), 'playerBingoPoolEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'playerBingoPool.bundle.mjs');

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

fs.writeFileSync(ENTRY, `
export { fetchBingoData, buildCriteria, isSameMan, isAcademyRow, MIN_TILE_SUPPORT } from '${ROOT_URL}/src/lib/playerBingo.ts';
export { supabase } from '${ROOT_URL}/src/integrations/supabase/client.ts';
export { normalizeName } from '${ROOT_URL}/src/lib/playerSearch.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { fetchBingoData, buildCriteria, isSameMan, isAcademyRow, MIN_TILE_SUPPORT, supabase, normalizeName } = await import(pathToFileURL(BUNDLE).href);

const POOL_MIN_YEAR = 2024; // mirrors the lib's constant; section 2 fails loudly if the pool disagrees

section = 1;
console.log('1) The identity rules, on the rows that motivated them, in both directions');
{
  /* Rows read from player_market_values on 2026-09-01. Not derived from the
     lib on purpose: if the rule drifts, these are the memory. */
  const rodri = { age: 29, year: 2026 }; // Manchester City's Rodri, pool row
  const cases = [
    ['Rodri 2006 Barcelona, aged 21', rodri, { age: 21, year: 2006 }, false],
    ['Rodri 2009 Huesca, aged 32', rodri, { age: 32, year: 2009 }, false],
    ['Rodri 2017 Villarreal, aged 20', rodri, { age: 20, year: 2017 }, true],
    ['Rodri 2022 Manchester City, aged 25', rodri, { age: 25, year: 2022 }, true],
    ['a row with no age', rodri, { age: null, year: 2010 }, true],
    ['Lucas Hernandez 2019 Penarol, aged 26 (the Uruguayan)', { age: 29, year: 2026 }, { age: 26, year: 2019 }, false],
    ['Lucas Hernandez 2019 Atletico, aged 22 (the Frenchman)', { age: 29, year: 2026 }, { age: 22, year: 2019 }, true],
  ];
  for (const [label, ref, row, want] of cases) {
    if (isSameMan(ref, row) !== want) fail(`isSameMan: ${label} should be ${want ? 'kept' : 'refused'}`);
  }
  const academy = [
    ['Grimaldo 2012 Barcelona, 16, $1M', { age: 16, value: 1_000_000 }, true],
    ['a 19 year old at $2M', { age: 19, value: 2_000_000 }, true],
    ['a 19 year old at $3M', { age: 19, value: 3_000_000 }, false],
    ['a 20 year old at $1M', { age: 20, value: 1_000_000 }, false],
    ['no age', { age: null, value: 1_000_000 }, false],
  ];
  for (const [label, row, want] of academy) {
    if (isAcademyRow(row) !== want) fail(`isAcademyRow: ${label} should be ${want ? 'academy' : 'senior'}`);
  }
  console.log(`   ${cases.length + academy.length} cases, both directions`);
}

/* Independent read of every recent row for a set of names, in small chunks. */
async function recentRows(names) {
  const out = [];
  for (let i = 0; i < names.length; i += 40) {
    const chunk = names.slice(i, i + 40);
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, year, age, club, market_value_usd')
      .in('player_name', chunk)
      .gte('year', POOL_MIN_YEAR)
      .gt('market_value_usd', 0)
      .not('age', 'is', null)
      .limit(1000);
    if (error) throw error;
    if (data.length >= 1000) throw new Error('a chunk hit the row cap, the oracle is incomplete');
    out.push(...data);
  }
  return out;
}

/* The pre-Round-385 selection, rebuilt here as the baseline: top 1,000 rows
   by value, deduped by name keeping the newest among them. */
async function oldSelection() {
  const { data, error } = await supabase
    .from('player_market_values')
    .select('player_name, year, age, club, market_value_usd')
    .gte('year', POOL_MIN_YEAR)
    .gt('market_value_usd', 0)
    .not('age', 'is', null)
    .order('market_value_usd', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const byName = new Map();
  for (const r of data) {
    const name = (r.player_name || '').trim();
    if (!name) continue;
    const prev = byName.get(name);
    if (!prev || r.year > prev.year || (r.year === prev.year && r.market_value_usd > prev.market_value_usd)) byName.set(name, r);
  }
  return [...byName.values()].map(r => ({ name: r.player_name.trim(), year: r.year, age: r.age, club: (r.club || '').trim(), value: r.market_value_usd }));
}

/* fetchBingoData fans out into a few dozen requests and returns null if any
   one of them fails, so one dropped connection would read as a dead
   database. Three attempts, the Round 362 lesson: a fence that goes red at
   random teaches people to re-run it instead of reading it. */
let data = null;
for (let attempt = 1; attempt <= 3 && !data; attempt++) {
  try { data = await fetchBingoData(); } catch { data = null; }
  if (!data && attempt < 3) {
    console.log(`   fetch attempt ${attempt} returned nothing, trying again`);
    await new Promise(r => setTimeout(r, 1500));
  }
}
if (!data) abort('\nSUPABASE UNREACHABLE OR POOL TOO SMALL. NOTHING WAS CHECKED.');

section = 2;
console.log(`2) Every one of ${data.pool.length} pool players is his newest recent row${CONTROL === 'stale' ? ' (judged on the pre-Round-385 selection)' : ''}`);
{
  const live = data.pool;
  const old = await oldSelection();
  if (CONTROL === 'stale' && old.length === 0) abort('control cannot run: the old selection is empty');
  const judged = CONTROL === 'stale' ? old : live;
  const rows = await recentRows(judged.map(p => p.name));
  const newest = new Map();
  for (const r of rows) {
    const name = (r.player_name || '').trim();
    const prev = newest.get(name);
    if (!prev || r.year > prev.year || (r.year === prev.year && r.market_value_usd > prev.market_value_usd)) newest.set(name, r);
  }
  let stale = 0;
  let moved = 0;
  const examples = [];
  for (const p of judged) {
    const n = newest.get(p.name);
    if (!n) { fail(`"${p.name}" has no recent row in the table at all`); continue; }
    const wrong = [];
    if (p.year !== n.year) wrong.push(`year ${p.year} vs ${n.year}`);
    if (p.age !== n.age) wrong.push(`age ${p.age} vs ${n.age}`);
    if ((p.club || '') !== (n.club || '').trim()) wrong.push(`club "${p.club}" vs "${(n.club || '').trim()}"`);
    if (p.value !== n.market_value_usd) wrong.push(`value ${p.value} vs ${n.market_value_usd}`);
    if (wrong.length) {
      stale += 1;
      if (examples.length < 5) examples.push(`${p.name}: ${wrong.join(', ')}`);
    }
  }
  for (const e of examples) fail(`held at a row that is not his newest: ${e}`);
  if (stale > examples.length) fail(`${stale - examples.length} more pool players held at a row that is not his newest`);
  /* The baseline, for the record: how many the fix moved. */
  const oldNewest = new Map(old.map(p => [p.name, p]));
  for (const p of live) {
    const o = oldNewest.get(p.name);
    if (o && (o.year !== p.year || o.club !== p.club || o.age !== p.age)) moved += 1;
  }
  const kdb = live.find(p => p.name === 'Kevin De Bruyne');
  const wahi = live.find(p => p.name === 'Elye Wahi');
  console.log(`   ${judged.length} judged, ${stale} stale; the pre-Round-385 selection would have held ${moved} of ${live.length} at an older row`);
  if (kdb) console.log(`   Kevin De Bruyne: ${kdb.club}, ${kdb.age}, $${(kdb.value / 1e6).toFixed(0)}M (${kdb.year})`);
  if (wahi) console.log(`   Elye Wahi: ${wahi.club}, ${wahi.age}, $${(wahi.value / 1e6).toFixed(0)}M (${wahi.year})`);
  if (live.some(p => p.year < POOL_MIN_YEAR)) fail('the pool holds a row older than POOL_MIN_YEAR, so the harness constant no longer mirrors the lib');
}

section = 3;
console.log('3) The Messi club teammate tile carries the right men, and Rodri\'s history is his own');
{
  const criteria = buildCriteria(data);
  const messi = criteria.find(c => c.id === 'messi-teammate');
  const barca = criteria.find(c => c.id === 'club-fc-barcelona');
  if (!messi) fail('no messi-teammate criterion');
  if (!barca) fail('no club-fc-barcelona criterion');
  const poolNames = new Set(data.pool.map(p => p.name));
  const support = new Set(messi ? messi.support : []);
  if (CONTROL === 'pin') {
    if (support.has('Rodri')) abort('control cannot run: Rodri is already on the Messi tile');
    if (!poolNames.has('Rodri')) abort('control cannot run: Rodri is not in the pool');
    support.add('Rodri');
  }
  for (const ghost of ['Rodri', 'Alejandro Grimaldo']) {
    if (poolNames.has(ghost) && support.has(ghost)) fail(`"${ghost}" is on the Messi club teammate tile and never shared a dressing room with him`);
  }
  /* Known teammates, only asserted when the man is in the pool today. The
     first draft listed Gavi and Jules Kounde and the harness refused both:
     Gavi debuted and Kounde arrived after Messi left Barcelona in August
     2021. The check caught its own author, which is what it is for. */
  const known = ['Pedri', 'Kylian Mbappé', 'Achraf Hakimi', 'Marquinhos', 'Frenkie de Jong', 'Ansu Fati', 'Fabián Ruiz', 'Ousmane Dembélé', 'Ronald Araújo', 'Jordi Alba', 'Sergio Busquets'];
  const present = known.filter(n => poolNames.has(n));
  for (const n of present) if (!support.has(n)) fail(`"${n}" played with Messi and is in the pool but not on the tile`);
  if (present.length < 3) fail(`only ${present.length} known teammates are in the pool, the check has too little to hold on to`);
  if (support.size < MIN_TILE_SUPPORT) fail(`Messi tile support is ${support.size}, under the ${MIN_TILE_SUPPORT} a tile needs`);
  if (barca && poolNames.has('Alejandro Grimaldo') && barca.support.includes('Alejandro Grimaldo')) fail('Grimaldo is on the "played for Barcelona" tile through his Barcelona B rows');
  const rodriClubs = [...(data.clubHistory.get('Rodri') || [])];
  for (const k of rodriClubs) if (/betis|huesca|cartagena|almeria|guadalajara/.test(k)) fail(`Rodri's club history holds "${k}", another Rodri's club`);
  const lucas = support.has('Lucas Hernández');
  console.log(`   Messi tile: ${support.size} players, ${present.length} known teammates in the pool all present; Lucas Hernandez ${lucas ? 'is on it (known limit, see header)' : 'is not on it'}`);
  console.log(`   Rodri's history: ${rodriClubs.length} clubs`);
}

if (CONTROL) {
  const target = { stale: 2, pin: 3 }[CONTROL];
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
  console.error(`\nsimPlayerBingoPool: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimPlayerBingoPool: all green');
