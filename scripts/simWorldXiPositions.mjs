/**
 * Round 345 harness: World XI eligibility from positions actually PLAYED.
 *
 * The owner's Round 319 handoff: "a CF with RW history should fit a RW slot".
 * The data is the curated player_verified_positions table, human-verified with
 * two sources per claim. It is deliberately NOT derived from the market-value
 * rows: that table has no person identity, and every name-keyed derivation
 * tried during Round 345 merged different humans sharing a name into fake
 * careers (two Brazilian Gabriel Pereiras born a year apart became one
 * centre-back with wide-right seasons; a "Daniel" played goal and attacking
 * midfield at once). History widens eligibility only where a curator verified
 * it for that specific human (primary_position must match the pooled player),
 * and never through the family chain Round 319 narrowed (LWB still cannot
 * reach a front line RW slot unless he verifiably played wide right).
 *
 * What this holds, on the LIVE pool the game itself fetches:
 *   1. The curated table feeds the pool: a measured number of pooled players
 *      carry a played-positions list beyond their primary (floor from
 *      measured headroom, half of first measurement).
 *   2. History genuinely widens: a measured number of players fit the strict
 *      front line RW slot ONLY through history (same floor rule), and every
 *      such player's own list contains a wide-right role, so the widening is
 *      exactly as wide as the history.
 *   3. The Round 319 wall stands: no player whose history lacks a wide-right
 *      role reaches RW through the history path.
 *
 * NEGATIVE CONTROL: WXIPOS_CONTROL=nohistory strips every positionsPlayed
 * list after the fetch (asserting there was something to strip) and section 2
 * must go red, proving the widening being measured is real.
 *
 * Run: node scripts/simWorldXiPositions.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'wxiPosEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'wxiPos.bundle.mjs');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.WXIPOS_CONTROL || '';
if (CONTROL && CONTROL !== 'nohistory') { console.error(`WXIPOS_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const m = await import('${ROOT.replaceAll('\\', '/')}/src/lib/worldXi.ts');
export const { fetchWorldXiPool, fitsSlot, eligiblePositions } = m;
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { fetchWorldXiPool, fitsSlot, eligiblePositions } = await import(pathToFileURL(BUNDLE).href);

const data = await fetchWorldXiPool();
if (!data) {
  console.log('SUPABASE UNREACHABLE OR POOL TOO SMALL. NOTHING WAS CHECKED.');
  console.error('simWorldXiPositions: the pool did not load, which is itself worth investigating');
  process.exit(1);
}

/* The strict front line right wing slot: fitsSlot only reads label for the
   two front line wings, so this minimal shape is the real gate. */
const RW_SLOT = { label: 'RW', allowed: [] };
const WIDE_RIGHT = new Set(['RW', 'RM']);

if (CONTROL === 'nohistory') {
  const had = data.players.filter(p => p.positionsPlayed?.length).length;
  if (!had) { console.error('control found nothing to strip: no player carries positionsPlayed'); process.exit(1); }
  for (const p of data.players) delete p.positionsPlayed;
  console.log(`   NEGATIVE CONTROL ON: positionsPlayed stripped from ${had} players, section 2 must go red`);
}

console.log('1) the curated table feeds the pool');
{
  const withHistory = data.players.filter(p => p.positionsPlayed && p.positionsPlayed.length >= 1);
  /* measured 2026-08-29, curated only: 63 of ~5,500 pooled players carry a
     history list, one per curated row with secondaries (the top 150 by value,
     human-verified). The first cut derived 344 from the market-value rows and
     nearly all were name collisions faking careers, which is why derivation
     is gone. Floor at half per the harness convention. */
  const FLOOR = 31;
  if (CONTROL !== 'nohistory' && withHistory.length < FLOOR) {
    fail(`${withHistory.length} pooled players carry a played-positions list, the floor is ${FLOOR}`);
  }
  console.log(`   ${withHistory.length} of ${data.players.length} pooled players carry verified position history`);
}

console.log('2) history genuinely widens eligibility, exactly as wide as the history');
{
  const widened = data.players.filter(p => {
    const primaryFits = eligiblePositions(p.position).some(pos => pos === 'RW' || pos === 'RM');
    return !primaryFits && fitsSlot(p, RW_SLOT);
  });
  /* measured 2026-08-29, curated only: 6 players reach the strict RW slot
     only through their own history (Cole Palmer, Arda Güler, Phil Foden and
     friends, each with a verified wide-right season); floor at half. */
  const FLOOR = 3;
  if (widened.length < FLOOR) {
    fail(`${widened.length} players fit the front line RW slot only through history, the floor is ${FLOOR} (the control strips history to force exactly this)`);
  }
  for (const p of widened) {
    if (!(p.positionsPlayed ?? []).some(pos => WIDE_RIGHT.has(pos))) {
      fail(`${p.name} reached the RW slot without a wide-right role in his own history (${(p.positionsPlayed ?? []).join(', ')})`);
    }
  }
  if (widened.length) {
    const sample = widened.slice(0, 3).map(p => `${p.name} (${p.position}, played ${p.positionsPlayed.join('/')})`);
    console.log(`   ${widened.length} players earn the RW slot by history, e.g. ${sample.join('; ')}`);
  }
}

console.log('3) the Round 319 wall stands');
{
  const breached = data.players.filter(p => {
    if (!['LWB', 'RWB', 'LB', 'RB', 'CB'].includes(p.position)) return false;
    if ((p.positionsPlayed ?? []).some(pos => WIDE_RIGHT.has(pos))) return false;
    return fitsSlot(p, RW_SLOT);
  });
  for (const p of breached.slice(0, 5)) {
    fail(`${p.name} (${p.position}) reaches the front line RW slot with no wide-right history`);
  }
  console.log(`   ${breached.length} defenders reach RW without history (must be 0)`);
}

console.log('');
if (CONTROL === 'nohistory') {
  if (failures > 0) { console.log(`simWorldXiPositions control: green. Stripped history was missed by the widening check (${failures} finding).`); process.exit(0); }
  console.error('simWorldXiPositions control: RED. Widening passed with no history at all.'); process.exit(1);
}
if (failures > 0) { console.error(`simWorldXiPositions: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simWorldXiPositions: green. Played it for real, eligible for exactly it.');
