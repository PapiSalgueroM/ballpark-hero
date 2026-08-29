/**
 * Round 344 harness: the stale values sweep stays true.
 *
 * scripts/data/staleSweep2026.json is the committed record of the 2026-08-29
 * sweep: 243 high-peak players whose value rows had gone stale, classified by
 * parallel researchers under the two-source rule and reviewed by hand. This
 * holds the database to that record:
 *
 *   1. Every audited ACTIVE has a year-2026 row, and its value matches the
 *      audit within a dollar-rounding tolerance, so the sweep's writes can
 *      never silently vanish or drift.
 *   2. Every audited RETIRED name still has NO year-2026 row, so nobody
 *      "fixes" a retired legend with an invented current value. (A genuine
 *      un-retirement is a new sweep entry, not a silent row.)
 *   3. The collision names (one name, two humans) stay documented and get no
 *      blind 2026 row either.
 *
 * NEGATIVE CONTROL: VALUE_CONTROL=phantom adds a made-up active entry to the
 * in-memory audit (a name that provably has no 2026 row) and section 1 must
 * go red, proving the check reads the database and not its own wishes.
 *
 * Run: node scripts/simValueFreshness.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.VALUE_CONTROL || '';
if (CONTROL && CONTROL !== 'phantom') { console.error(`VALUE_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const client = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/staleSweep2026.json'), 'utf8'));
if (!audit.active?.length || !audit.retired?.length) { console.error('the audit file is empty, nothing to hold'); process.exit(1); }

if (CONTROL === 'phantom') {
  audit.active.push({ name: 'Phantom Sweepcheck', club: 'Nowhere FC', value_usd: 12345678, age: 27 });
  console.log('   NEGATIVE CONTROL ON: a phantom active planted, section 1 must go red');
}

const names = [...audit.active.map(p => p.name), ...audit.retired.map(p => p.name), ...audit.collisions.map(p => p.name)];
const rows2026 = new Map();
for (let i = 0; i < names.length; i += 20) {
  const batch = names.slice(i, i + 20);
  const inList = batch.map(n => `"${n.replace(/"/g, '')}"`).join(',');
  const url = `${URL_}/rest/v1/player_market_values?select=player_name,market_value_usd&year=eq.2026&player_name=in.(${encodeURIComponent(inList)})&limit=1000`;
  const rows = await fetch(url, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } }).then(r => r.json());
  if (!Array.isArray(rows)) { console.error('DATABASE UNREACHABLE. NOTHING WAS CHECKED.'); process.exit(1); }
  for (const r of rows) rows2026.set(r.player_name, r.market_value_usd);
}

console.log('1) every audited active has its 2026 row at the audited value');
{
  let ok = 0;
  for (const p of audit.active) {
    const v = rows2026.get(p.name);
    if (v == null) { fail(`${p.name} was verified active at ${p.club} but has no 2026 row`); continue; }
    if (Math.abs(v - p.value_usd) > 1000) { fail(`${p.name}'s 2026 row says ${v}, the audit says ${p.value_usd}`); continue; }
    ok += 1;
  }
  console.log(`   ${ok} of ${audit.active.length} audited actives present and matching`);
}

console.log('2) the retired stay honestly rowless in 2026');
{
  let clean = 0;
  for (const p of audit.retired) {
    if (rows2026.has(p.name)) fail(`${p.name} is audited retired but grew a 2026 row`);
    else clean += 1;
  }
  console.log(`   ${clean} of ${audit.retired.length} retired names carry no invented current value`);
}

console.log('3) the collisions stay documented and untouched');
{
  for (const p of audit.collisions) {
    if (rows2026.has(p.name)) fail(`${p.name} is a documented name collision but got a blind 2026 row`);
  }
  if (audit.collisions.length < 4) fail(`the audit records ${audit.collisions.length} collisions where the sweep found 4`);
  console.log(`   ${audit.collisions.length} collision names held`);
}

console.log('');
if (CONTROL === 'phantom') {
  if (failures > 0) { console.log(`simValueFreshness control: green. The phantom active was reported (${failures} finding).`); process.exit(0); }
  console.error('simValueFreshness control: RED. A made-up active passed the row check.'); process.exit(1);
}
if (failures > 0) { console.error(`simValueFreshness: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simValueFreshness: green. The sweep is written, the retired are left in peace.');
