/* Missing XI data integrity harness.

   Born in Round 295 out of three real user reports. The July 2026 daily
   (frozen for weeks by the pre-Round-212 seed) blanked the left forward of
   cl-2021-r16-real, and the entry had the wrong XI: a misremembered 4-3-3
   with the 84th minute super-sub written in as a starter. Players who
   answered with the man who genuinely started ("LW was literally the
   player") were told they were wrong.

   Two lessons enforced here:
   1) Structure: every candidate must occupy the slot it claims, every XI
      must be 11 unique names, dashes stay out of shipped strings. This ran
      as a hand tool (xiCheck.ts) but only over four lineups and only when
      somebody remembered; now it sweeps the whole file on every board.
   2) The corrected Atalanta XI is PINNED against an independent copy of the
      teamsheet, because the wrong version of this lineup is the one people
      remember: without a pin, a future editor "fixing" Vinicius back to
      Asensio looks like a data cleanup and no structural check would object.

   Negative control (house rule: prove the check can fail):
     SIM_MISSINGXI_CONTROL=wrongxi swaps the pinned Vinicius entry for the
     super-sub and the run must then FAIL. The control asserts it actually
     changed the pin before running, so a stale pin cannot green the control.

   Run: node scripts/simMissingXi.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'missingXiHarnessEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'missingXiHarness.bundle.mjs');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

fs.writeFileSync(ENTRY, `
export { LINEUPS, isCorrectGuess } from '${ROOT.replaceAll('\\', '/')}/src/lib/missingXi.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
/* The stub must live in THIS process: an import statement inside the entry
   hoists above any statement beside it, so a stub written into the entry
   runs after the bundled supabase client already asked for localStorage. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { LINEUPS, isCorrectGuess } = await import(pathToFileURL(BUNDLE).href);

console.log('1) Every lineup is structurally sound and every blank sits in its own slot');
{
  const ids = new Set();
  for (const lu of LINEUPS) {
    if (ids.has(lu.id)) fail(`${lu.id}: duplicate lineup id`);
    ids.add(lu.id);
    if (lu.slots.length !== 11) fail(`${lu.id}: ${lu.slots.length} slots`);
    const names = new Set(lu.slots.map(s => s.name));
    if (names.size !== lu.slots.length) fail(`${lu.id}: duplicate name in XI`);
    if (lu.slots.filter(s => s.position === 'GK').length !== 1) fail(`${lu.id}: needs exactly one GK`);
    if (lu.blankCandidates.length < 2 || lu.blankCandidates.length > 3) fail(`${lu.id}: ${lu.blankCandidates.length} blank candidates, spec says 2-3`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lu.matchDate)) fail(`${lu.id}: matchDate "${lu.matchDate}" not YYYY-MM-DD`);
    for (const c of lu.blankCandidates) {
      const slot = lu.slots[c.slotIndex];
      if (!slot) { fail(`${lu.id}: "${c.name}" points at slot ${c.slotIndex} of ${lu.slots.length}`); continue; }
      if (slot.name !== c.name) fail(`${lu.id}: candidate "${c.name}" claims slot ${c.slotIndex} but that slot is "${slot.name}" (${slot.position})`);
      if (!isCorrectGuess(c.name, c)) fail(`${lu.id}: "${c.name}" does not match itself through the guess check`);
    }
    const dash = /[–—]/;
    const texts = [lu.dateLabel, lu.competition, lu.scoreLine, lu.venue, ...lu.blankCandidates.map(c => c.fact || '')];
    for (const t of texts) if (dash.test(t)) fail(`${lu.id}: banned dash in shipped string "${t}"`);
  }
  console.log(`   ${LINEUPS.length} lineups swept`);
}

console.log('2) The Atalanta second leg stays the real 3-5-2, pinned against the teamsheet');
{
  /* Independent copy of the XI, from ESPN's match page and theScore's
     confirmed-lineups piece, both read 2026-08-26. Not derived from the
     data file on purpose: if the file drifts, this list is the memory. */
  const PINNED = [
    'Thibaut Courtois',
    'Nacho', 'Raphael Varane', 'Sergio Ramos',
    'Lucas Vazquez', 'Federico Valverde', 'Toni Kroos', 'Luka Modric', 'Ferland Mendy',
    'Karim Benzema', 'Vinicius Junior',
  ];
  const control = process.env.SIM_MISSINGXI_CONTROL === 'wrongxi';
  if (control) {
    const i = PINNED.indexOf('Vinicius Junior');
    if (i === -1) { fail('control could not find the pin it is meant to corrupt'); }
    else PINNED[i] = 'Marco Asensio';
  }
  const lu = LINEUPS.find(l => l.id === 'cl-2021-r16-real');
  if (!lu) fail('cl-2021-r16-real is missing from LINEUPS');
  else {
    if (lu.formationLabel !== '3-5-2') fail(`Atalanta leg formation is "${lu.formationLabel}", the misremembered version was a 4-3-3`);
    const actual = lu.slots.map(s => s.name).sort().join('|');
    const pinned = [...PINNED].sort().join('|');
    if (actual !== pinned) fail(`Atalanta leg XI drifted from the pinned teamsheet.\n    pinned: ${pinned}\n    actual: ${actual}`);
    for (const ghost of ['Marco Asensio', 'Casemiro', 'Daniel Carvajal']) {
      if (!control && lu.slots.some(s => s.name === ghost)) fail(`${ghost} is back in the Atalanta XI; he did not start, see the Round 295 comment in missingXi.ts`);
    }
  }
}

console.log('3) The guess check takes case and accent variants, not just exact strings');
{
  const lu = LINEUPS.find(l => l.id === 'cl-2021-r16-real');
  const vini = lu && lu.blankCandidates.find(c => c.name === 'Vinicius Junior');
  if (!vini) fail('Vinicius Junior is not a blank candidate on the corrected lineup');
  else {
    if (!isCorrectGuess('vinicius junior', vini)) fail('lowercase guess rejected');
    if (!isCorrectGuess('VINICIUS JUNIOR', vini)) fail('uppercase guess rejected');
    if (isCorrectGuess('Marco Asensio', vini)) fail('the super-sub passes as the starter');
  }
}

if (process.env.SIM_MISSINGXI_CONTROL === 'wrongxi') {
  if (failures > 0) {
    console.log(`\ncontrol run: ${failures} failure(s) fired as expected, the pin works`);
    process.exit(0);
  }
  console.error('\ncontrol run: corrupting the pin changed NOTHING, the check is dead');
  process.exit(1);
}

if (failures > 0) {
  console.error(`\nsimMissingXi: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimMissingXi: all green');
