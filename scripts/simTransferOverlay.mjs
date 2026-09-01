/* Transfer overlay harness: the verified moves are in the table, and stay there.

   Round 393. The market value table's 2026 rows are an autumn 2025 snapshot.
   scripts/transferOverlay2026.mjs is the repo's verified list of moves since,
   and until this round it reached only Club Manager's roster bake, so Footle,
   Player Bingo, Rarity Round and player search showed Rodri at City and
   Barcola at PSG while Club Manager did not. The Round 393 migration wrote
   every entry's `db` club to the player's 2026 row. This harness holds that:

     1. SOURCE. Every entry names a `db` spelling, and every `to` is a string
        or null. An entry without `db` is a move the table would never learn.
     2. THE TABLE. For every entry with a 2026 row, the row's club equals the
        entry's `db`. A re-import that rolls a verified move back goes red
        here, which is the whole reason this file exists: the dataset is
        refreshed from a snapshot and the snapshot predates the window.
     3. SPELLINGS. Every `db` value is a club the table's 2026 rows actually
        carry, so a typo cannot quietly invent a club the games have never
        heard of.
     4. NAMESAKES. No entry's name matches more than one 2026 row, because the
        migration keys on the name alone.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_OVERLAY_CONTROL=stale   pretends Rodri's entry says Manchester City;
                                 section 2 must go red.
     SIM_OVERLAY_CONTROL=typo    misspells one db club in memory; section 3
                                 must go red.
   Each control refuses to run if what it rewrites is not there, and is
   judged on its own section only.

   Needs the database. When it cannot be reached it says so and checks nothing.

   Run: node scripts/simTransferOverlay.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRANSFER_OVERLAY_2026 } from './transferOverlay2026.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_OVERLAY_CONTROL || '';
const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEADERS = { apikey: KEY, authorization: `Bearer ${KEY}` };

/* Three attempts before giving up: under the full board this fence went red
   once on a single HTTP 500 that the same query did not reproduce, which is
   the transient simGridArchive learned to retry in Round 369. A pull that
   never answers still aborts and says nothing was checked. */
async function rest(pathAndQuery) {
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res;
    try { res = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { headers: HEADERS }); }
    catch (err) { last = `unreachable (${String(err).slice(0, 80)})`; res = null; }
    if (res && res.ok) return res.json();
    if (res) last = `HTTP ${res.status}`;
    if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  abort(`\nSUPABASE ${last} for ${pathAndQuery.slice(0, 120)} after 3 attempts. NOTHING WAS CHECKED.`);
}

let overlay = TRANSFER_OVERLAY_2026.map(e => ({ ...e }));
if (CONTROL === 'stale') {
  const rodri = overlay.find(e => e.name === 'Rodri');
  if (!rodri || rodri.db !== 'FC Barcelona') abort('control cannot run: the Rodri entry is not FC Barcelona');
  rodri.db = 'Manchester City';
  console.log('   NEGATIVE CONTROL ON: the Rodri entry pretends the table should still say Manchester City');
}
if (CONTROL === 'typo') {
  const e = overlay.find(x => x.db === 'Al-Ahli SFC');
  if (!e) abort('control cannot run: no Al-Ahli SFC entry to misspell');
  /* Not "Al-Ahli SC": that is a real spelling in the table (a different
     club), which is exactly the kind of near miss section 3 exists for, but
     it makes a useless control. The misspelling has to be one no row has. */
  e.db = 'Al-Ahli SFC (typo)';
  console.log(`   NEGATIVE CONTROL ON: ${e.name}'s db club misspelled to "Al-Ahli SFC (typo)"`);
}

section = 1;
console.log(`1) Every entry carries the table's spelling (${overlay.length} entries)`);
for (const e of overlay) {
  if (typeof e.name !== 'string' || !e.name.trim()) fail('an entry has no name');
  if (!(typeof e.to === 'string' || e.to === null)) fail(`${e.name}: to must be an engine club or null`);
  if (typeof e.db !== 'string' || !e.db.trim()) fail(`${e.name}: no db spelling, the table would never learn this move`);
}

/* one query for every overlay name: the 2026 rows */
const names = overlay.map(e => e.name);
const inList = names.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',');
const rows = await rest(`player_market_values?select=player_name,club,market_value_usd&year=eq.2026&player_name=in.(${encodeURIComponent(inList)})&limit=1000`);
const byName = new Map();
for (const r of rows) { if (!byName.has(r.player_name)) byName.set(r.player_name, []); byName.get(r.player_name).push(r); }

section = 2;
console.log('2) The table says what the overlay says, for every entry with a 2026 row');
{
  let checked = 0, missing = [];
  for (const e of overlay) {
    const list = byName.get(e.name) || [];
    if (list.length === 0) { missing.push(e.name + (e.add ? ' (added at bake)' : '')); continue; }
    checked += 1;
    for (const r of list) {
      if (r.club !== e.db) fail(`${e.name}: the 2026 row says ${r.club}, the verified move says ${e.db}`);
    }
  }
  console.log(`   ${checked} entries checked against their 2026 row; ${missing.length} have no 2026 row: ${missing.join(', ') || 'none'}`);
}

section = 3;
console.log('3) Every db spelling is a club the 2026 rows carry');
{
  const wanted = [...new Set(overlay.map(e => e.db).filter(Boolean))];
  const clubList = wanted.map(c => `"${c.replace(/"/g, '\\"')}"`).join(',');
  const found = await rest(`player_market_values?select=club&year=eq.2026&club=in.(${encodeURIComponent(clubList)})&limit=1000`);
  const present = new Set(found.map(r => r.club));
  for (const c of wanted) if (!present.has(c)) fail(`"${c}" is not a club spelling in the 2026 rows (typo, or a club the table does not carry)`);
  console.log(`   ${wanted.length} spellings, ${wanted.filter(c => present.has(c)).length} present`);
}

section = 4;
console.log('4) No entry name matches more than one 2026 row');
{
  for (const e of overlay) {
    const n = (byName.get(e.name) || []).length;
    if (n > 1) fail(`${e.name}: ${n} rows for 2026, the migration keys on the name alone`);
  }
  console.log(`   ${overlay.length} names, none ambiguous`);
}

const own = { stale: 2, typo: 3 }[CONTROL];
const total = failures[1] + failures[2] + failures[3] + failures[4];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (stale, typo)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimTransferOverlay: ${total} failure(s)`); process.exit(1); }
console.log('\nsimTransferOverlay: all green');
