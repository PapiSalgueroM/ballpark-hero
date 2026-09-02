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
 * NEGATIVE CONTROLS:
 *   VALUE_CONTROL=phantom adds a made-up active entry to the in-memory audit
 *   (a name that provably has no 2026 row) and section 1 must go red.
 *   VALUE_CONTROL=refusal returns one HTTP 403 with an empty JSON array for a
 *   retired-only batch. The old parser could accept that as a verified empty
 *   result, so the caller must report exactly one fail-closed refusal without
 *   retrying the returned HTTP response or reading its body.
 *
 * Run: node scripts/simValueFreshness.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithTransportRetry } from './lib/fetchWithTransportRetry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.VALUE_CONTROL || '';
const KNOWN_CONTROLS = ['phantom', 'refusal'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) { console.error(`VALUE_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const client = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/staleSweep2026.json'), 'utf8'));
if (!audit.active?.length || !audit.retired?.length) { console.error('the audit file is empty, nothing to hold'); process.exit(1); }
if (audit.collisions.length < 4) fail(`the audit records ${audit.collisions.length} collisions where the sweep found 4`);

if (CONTROL === 'phantom') {
  audit.active.push({ name: 'Phantom Sweepcheck', club: 'Nowhere FC', value_usd: 12345678, age: 27 });
  console.log('   NEGATIVE CONTROL ON: a phantom active planted, section 1 must go red');
}

const names = [...audit.active.map(p => p.name), ...audit.retired.map(p => p.name), ...audit.collisions.map(p => p.name)];
const refusalBatchStart = Math.ceil(audit.active.length / 20) * 20;
const refusalBatch = names.slice(refusalBatchStart, refusalBatchStart + 20);
let refusalInjected = false;
let refusalFailed = false;
let refusalBodyRead = false;
let refusalRequestCalls = 0;
if (CONTROL === 'refusal') {
  const activeNames = new Set(audit.active.map(p => p.name));
  if (!refusalBatch.length || refusalBatch.some(name => activeNames.has(name))) {
    console.error('control cannot run: no retired-only fetch batch is available');
    process.exit(1);
  }
  console.log(`   NEGATIVE CONTROL ON: batch ${refusalBatchStart / 20 + 1} receives one HTTP 403 with [] and must fail closed`);
}
const rows2026 = new Map();
for (let i = 0; i < names.length; i += 20) {
  const batch = names.slice(i, i + 20);
  const inList = batch.map(n => `"${n.replace(/"/g, '')}"`).join(',');
  const url = `${URL_}/rest/v1/player_market_values?select=player_name,market_value_usd&year=eq.2026&player_name=in.(${encodeURIComponent(inList)})&limit=1000`;
  const refusalTarget = CONTROL === 'refusal' && i === refusalBatchStart;
  /* Round 335: this used to be a bare .then(r => r.json()), and the guard
     below never got the chance to speak. A sandbox whose egress proxy blocks
     the database answers with a plain text body ("Host not in allowlist"),
     json() threw a SyntaxError, and the harness died with "Unexpected token
     'H'" instead of the sentence written right here for exactly this case.
     The guard stays fail closed on purpose: a run that reached no database
     checked nothing and must not read as a pass. */
  let rows = null;
  try {
    const request = async () => {
      if (refusalTarget) {
        refusalRequestCalls += 1;
        if (!refusalInjected) {
          refusalInjected = true;
          const response = new Response('[]', { status: 403, headers: { 'content-type': 'application/json' } });
          const readBody = response.text.bind(response);
          response.text = async () => { refusalBodyRead = true; return readBody(); };
          return response;
        }
      }
      return fetch(url, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } });
    };
    const { response: res, error } = await fetchWithTransportRetry(request);
    if (!res) throw error;
    if (!res.ok) {
      fail(`database batch ${i / 20 + 1} answered HTTP ${res.status}, so its values were not verified`);
      if (refusalTarget && res.status === 403) {
        refusalFailed = true;
        continue;
      }
      if (!CONTROL && failures === 1) console.error(`DATABASE BATCH ${i / 20 + 1} REFUSED (HTTP ${res.status}). NOTHING WAS CHECKED FOR THIS BATCH.`);
      else console.error(`database batch ${i / 20 + 1} was unavailable after ${failures - 1} earlier finding${failures === 2 ? '' : 's'}`);
      process.exit(1);
    }
    const body = await res.text();
    try { rows = JSON.parse(body); }
    catch { console.error(`the database answered with something that is not JSON (HTTP ${res.status}): ${body.slice(0, 80)}`); }
  } catch (err) {
    console.error(`the database could not be reached: ${String(err).slice(0, 120)}`);
  }
  if (!Array.isArray(rows)) {
    if (!CONTROL && failures === 0) console.error('DATABASE UNREACHABLE. NOTHING WAS CHECKED.');
    else console.error('the live value check could not continue, and an earlier or controlled finding must not be hidden as an environment skip');
    console.error('This harness reads the live database, so it can only run where egress to it is open (the desktop lane).');
    process.exit(1);
  }
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
  console.log(`   ${audit.collisions.length} collision names held`);
}

console.log('');
if (CONTROL === 'phantom') {
  if (failures > 0) { console.log(`simValueFreshness control: green. The phantom active was reported (${failures} finding).`); process.exit(0); }
  console.error('simValueFreshness control: RED. A made-up active passed the row check.'); process.exit(1);
}
if (CONTROL === 'refusal') {
  if (refusalInjected && refusalFailed && refusalRequestCalls === 1 && !refusalBodyRead && failures === 1) {
    console.log('simValueFreshness control: green. One HTTP refusal produced exactly one fail-closed finding without a retry or body read.');
    process.exit(0);
  }
  console.error(`simValueFreshness control: RED. Expected one injected caller failure without retry or body read, got injected=${refusalInjected}, failed=${refusalFailed}, calls=${refusalRequestCalls}, bodyRead=${refusalBodyRead}, failures=${failures}.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simValueFreshness: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simValueFreshness: green. The sweep is written, the retired are left in peace.');
