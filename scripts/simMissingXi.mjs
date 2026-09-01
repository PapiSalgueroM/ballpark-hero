/* Missing XI data integrity harness.

   Born in Round 295 out of three real user reports. The July 2026 daily
   (frozen for weeks by the pre-Round-212 seed) blanked the left forward of
   cl-2021-r16-real, and the entry had the wrong XI: a misremembered 4-3-3
   with the 84th minute super-sub written in as a starter. Players who
   answered with the man who genuinely started ("LW was literally the
   player") were told they were wrong.

   Two lessons enforced here:
   1) Structure: every candidate must occupy the slot it claims, every XI
      must be 11 unique names, dashes stay out of shipped strings, and one
      man has one spelling across the file. This ran as a hand tool
      (xiCheck.ts) but only over four lineups and only when somebody
      remembered; now it sweeps the whole file on every board.
   2) The corrected Atalanta XI is PINNED against an independent copy of the
      teamsheet, because the wrong version of this lineup is the one people
      remember: without a pin, a future editor "fixing" Vinicius back to
      Asensio looks like a data cleanup and no structural check would object.

   Round 383 added sections 4 and 5: a verified database alias must be
   accepted and must key as the same try as the lineup spelling, and the
   surname hint must name the family name (Park, not Ji-sung) and count its
   letters only. Neither touches the network; simMissingXiReach is the live
   half and checks every alias against the table.

   Negative controls (house rule: prove each check can fail):
     SIM_MISSINGXI_CONTROL=wrongxi    swaps the pinned Vinicius entry for the
                                      super-sub; section 2 must FAIL.
     SIM_MISSINGXI_CONTROL=noalias    strips every alias before the accept
                                      check; section 4 must FAIL.
     SIM_MISSINGXI_CONTROL=nosurname  drops Park Ji-sung's surname field;
                                      section 5's pin must FAIL.
   Each control asserts it actually changed something before running, so a
   stale pin or a drifted file cannot green a control.

   Run: node scripts/simMissingXi.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_MISSINGXI_CONTROL || '';
const ENTRY = path.join(os.tmpdir(), 'missingXiHarnessEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'missingXiHarness.bundle.mjs');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

fs.writeFileSync(ENTRY, `
export { LINEUPS, isCorrectGuess, guessKey, hintForLevel } from '${ROOT_URL}/src/lib/missingXi.ts';
export { normalizeName } from '${ROOT_URL}/src/lib/playerSearch.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
/* The stub must live in THIS process: an import statement inside the entry
   hoists above any statement beside it, so a stub written into the entry
   runs after the bundled supabase client already asked for localStorage. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { LINEUPS, isCorrectGuess, guessKey, hintForLevel, normalizeName } = await import(pathToFileURL(BUNDLE).href);

console.log('1) Every lineup is structurally sound, every blank sits in its own slot, one man has one spelling');
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
  /* Round 383: one man, one spelling. The file had both Nicolo and Nicolò
     Barella, and the roster the page hands the autocomplete keys rows by
     normalized name, so a second spelling was a second identical row. */
  const spellings = new Map();
  for (const lu of LINEUPS) {
    for (const s of lu.slots) {
      const key = normalizeName(s.name);
      if (!spellings.has(key)) spellings.set(key, new Set());
      spellings.get(key).add(s.name);
    }
  }
  for (const set of spellings.values()) {
    if (set.size > 1) fail(`"${[...set].join('" and "')}" are one starter spelled two ways`);
  }
  console.log(`   ${LINEUPS.length} lineups swept, ${spellings.size} distinct starters`);
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
  const control = CONTROL === 'wrongxi';
  if (control) {
    const i = PINNED.indexOf('Vinicius Junior');
    if (i === -1) { console.error('control cannot run: could not find the pin it is meant to corrupt'); process.exit(1); }
    PINNED[i] = 'Marco Asensio';
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
    /* Round 383: the table carries a second Nemanja Vidic row with a
       trailing U+200E, invisible and offered as its own player. Any
       invisible format character must fall away before names are compared. */
    if (!isCorrectGuess('Vinicius Junior' + String.fromCharCode(0x200e), vini)) fail('a trailing invisible mark makes the right name a wrong guess');
    if (!isCorrectGuess(String.fromCharCode(0xfeff) + 'Vinicius Junior', vini)) fail('a leading byte order mark makes the right name a wrong guess');
    if (isCorrectGuess('Marco Asensio', vini)) fail('the super-sub passes as the starter');
  }
}

console.log('4) A verified database alias is accepted, keys as the same try, and no other starter passes');
{
  /* The identity of each alias (same nationality, a club he was at) is
     checked against the live table by simMissingXiReach section 3; this
     offline section pins that the matcher honours the field, that the
     duplicate-guess key folds both spellings together, and that neither
     opens wider than the alias itself. */
  const control = CONTROL === 'noalias';
  let aliased = 0;
  for (const lu of LINEUPS) {
    for (const c of lu.blankCandidates) {
      if (!c.aliases || c.aliases.length === 0) continue;
      aliased += 1;
      const candidate = control ? { ...c, aliases: [] } : c;
      for (const a of c.aliases) {
        if (!isCorrectGuess(a, candidate)) fail(`${lu.id}: alias "${a}" is rejected for "${c.name}"`);
        if (guessKey(a, lu) !== guessKey(c.name, lu)) fail(`${lu.id}: "${a}" and "${c.name}" would burn two guesses`);
      }
      for (const s of lu.slots) {
        if (s.name !== c.name && isCorrectGuess(s.name, c)) fail(`${lu.id}: "${s.name}" passes as "${c.name}"`);
      }
    }
  }
  if (control && aliased === 0) { console.error('control cannot run: no alias to strip'); process.exit(1); }
  if (aliased === 0) fail('no candidate carries an alias; Round 383 added them, so the file has drifted');
  console.log(`   ${aliased} aliased candidates checked`);
}

console.log('5) The surname hint names the family name and counts its letters only');
{
  const control = CONTROL === 'nosurname';
  const surnameHints = (c, lu) => {
    const out = { initial: null, count: null };
    for (const level of [1, 2, 3, 4]) {
      const h = hintForLevel(level, c, lu);
      const i = h && h.match(/^Surname starts with: (.)$/);
      const n = h && h.match(/^Surname has (\d+) letters$/);
      if (i) out.initial = i[1];
      if (n) out.count = Number(n[1]);
    }
    return out;
  };
  let pinned = 0;
  for (const lu of LINEUPS) {
    for (const c of lu.blankCandidates) {
      const words = c.name.trim().split(/\s+/);
      if (c.surname && !words.includes(c.surname)) fail(`${lu.id}: surname "${c.surname}" is not a word of "${c.name}"`);
      const { initial, count } = surnameHints(c, lu);
      if (initial === null || count === null) { fail(`${lu.id}: "${c.name}" has no surname hints on the ladder`); continue; }
      /* The pin: Park is the family name and it has four letters, whatever
         the last word of the string says. */
      if (c.name === 'Park Ji-sung') {
        pinned += 1;
        const candidate = control ? { ...c, surname: undefined } : c;
        const p = surnameHints(candidate, lu);
        if (p.initial !== 'P' || p.count !== 4) fail(`${lu.id}: Park Ji-sung's hints say "${p.initial}" and ${p.count} letters; his surname is Park`);
      }
      if (/\P{L}/u.test(c.surname ?? words[words.length - 1]) && count !== (c.surname ?? words[words.length - 1]).replace(/[^\p{L}]/gu, '').length) {
        fail(`${lu.id}: "${c.name}" counts ${count} letters, punctuation included`);
      }
    }
  }
  if (control && pinned === 0) { console.error('control cannot run: Park Ji-sung is not a blank candidate'); process.exit(1); }
  if (pinned === 0) fail('Park Ji-sung is no longer a blank candidate, so the surname pin has nothing to hold');
  console.log(`   surname hints checked on every candidate, ${pinned} pinned`);
}

if (CONTROL) {
  if (failures > 0) {
    console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`);
    process.exit(0);
  }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}

if (failures > 0) {
  console.error(`\nsimMissingXi: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimMissingXi: all green');
