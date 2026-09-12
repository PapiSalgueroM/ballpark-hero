/**
 * Round 545: a career in flight gets the second legs its season plays.
 *
 * WHY THIS EXISTS. A player reported on 2026-09-11: "2nd leg in UCL knockout".
 * Club Manager had shipped exactly that three days earlier in Round 507, which
 * looks like the report is simply wrong until you read the migration path.
 * There is not one. Every save made before 2026-09-08 carries one knockout week
 * per round with no `uclLeg` on it, and the engine says so in its own words and
 * handles it defensively so a legacy save still crowns a champion, one legged,
 * for the rest of its season. The player was right about their own save.
 *
 * ensureUclCalendar could not do it: it only ever inserts a MISSING round of 16
 * week, returns early the moment one is there, and never looks at the quarter
 * or semi finals.
 *
 * WHAT THIS HOLDS:
 *   1. A legacy calendar gains a second leg for every knockout round still in
 *      front of the player, and the existing week becomes leg 1. Measured on a
 *      real career built by the engine and then stripped back to the legacy
 *      shape, not on a hand written fixture.
 *   2. A round already PLAYED is left exactly as it was. Those ties were
 *      settled on one match and that result is in the bracket and in the
 *      player's history, so adding a leg there would rewrite a result rather
 *      than repair a calendar. This is the assertion that stops a well meaning
 *      later version reaching backwards.
 *   3. It is idempotent: running it twice changes nothing, so it is safe in a
 *      load path that runs on every open.
 *   4. A modern calendar, which already carries both legs, is untouched.
 *   5. The first knockout round this save actually plays reads as two legged off
 *      the calendar afterwards, which is what the draw asks before it decides
 *      which club hosts the deciding leg. Not hardcoded to the round of 16: a
 *      modern save has none, it starts at the quarter final, so asking about
 *      R16 here would have passed on a career that never plays one.
 *   6. An era save, which does play a round of 16, migrates too. That is the
 *      one round ensureUclCalendar also knows about, so it is where the two
 *      repairs have to agree rather than fight.
 *
 * NEGATIVE CONTROL: LEG_MIGRATION_CONTROL=noop replaces the migration with a
 * function that does nothing, which is exactly the state before this round, and
 * sections 1, 2, 5 and 6 must go red. It asserts the replacement really matched
 * something first and refuses to run otherwise.
 *
 * Run: node scripts/simUclLegMigration.mjs      (no database)
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.LEG_MIGRATION_CONTROL || '';
const KNOWN_CONTROLS = ['noop'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`LEG_MIGRATION_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ENTRY = path.join(os.tmpdir(), 'uclLegEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'uclLeg.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

if (CONTROL === 'noop') {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  const re = /(function ensureUclLegs\(state\)\s*\{)/;
  if (!re.test(text)) {
    console.error('CONTROL noop cannot find ensureUclLegs in the bundle, so it would change nothing');
    process.exit(1);
  }
  const mutated = text.replace(re, '$1 return;');
  if (mutated === text) { console.error('CONTROL noop changed nothing'); process.exit(1); }
  fs.writeFileSync(BUNDLE, mutated);
  console.log('   NEGATIVE CONTROL ON: the migration made a no-op, sections 1, 2, 5 and 6 must go red');
}

const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
const { startCareer, ensureUclLegs, uclLegsFor } = cm;

/* A career whose club really does play in Europe, so the calendar carries
   knockout weeks at all. */
const fresh = startCareer('Real Madrid');
const koWeeks = c => c.calendar.map((e, i) => ({ e, i })).filter(({ e }) => e.type === 'uclKo');
if (!koWeeks(fresh).length) {
  console.error('the reference career has no Champions League knockout weeks, so there is nothing to migrate');
  process.exit(1);
}

/** The shape a save written before Round 507 has: one week per round, no leg. */
const toLegacy = career => {
  const c = JSON.parse(JSON.stringify(career));
  const seen = new Set();
  c.calendar = c.calendar.filter(e => {
    if (e.type !== 'uclKo') return true;
    if (seen.has(e.uclRound)) return false;   /* drop the second leg */
    seen.add(e.uclRound);
    delete e.uclLeg;                          /* and the leg marker */
    return true;
  });
  return c;
};

const roundsOf = c => [...new Set(koWeeks(c).map(({ e }) => e.uclRound))];
const legsFor = (c, round) => koWeeks(c).filter(({ e }) => e.uclRound === round).length;

/* ------------------------------------------------------------------ */
console.log('\n1) A legacy calendar gains the second leg for every round still ahead');
const legacy = toLegacy(fresh);
legacy.week = 0;
const twoLegRounds = roundsOf(legacy).filter(r => uclLegsFor(legacy.eraId, r) === 2);
if (twoLegRounds.length < 2) fail(`only ${twoLegRounds.length} two legged rounds in the reference career, expected R16, QF and SF`);
for (const r of twoLegRounds) {
  if (legsFor(legacy, r) !== 1) fail(`the legacy fixture for ${r} already has ${legsFor(legacy, r)} weeks, so this test is not testing the legacy shape`);
}
ensureUclLegs(legacy);
for (const r of twoLegRounds) {
  const weeks = koWeeks(legacy).filter(({ e }) => e.uclRound === r);
  if (weeks.length !== 2) { fail(`${r} still has ${weeks.length} week(s) after the migration`); continue; }
  const legs = weeks.map(({ e }) => e.uclLeg);
  if (legs[0] !== 1 || legs[1] !== 2) fail(`${r} legs came out as ${JSON.stringify(legs)}, expected [1, 2]`);
  if (weeks[1].i !== weeks[0].i + 1) fail(`${r}'s second leg is not the week straight after the first`);
}
/* The final is one leg in every era, and must stay that way. */
if (roundsOf(legacy).includes('F') && legsFor(legacy, 'F') !== 1) {
  fail('the final was given a second leg, and it has been one match at a neutral venue for the life of the competition');
}
if (!failures) console.log(`   ${twoLegRounds.length} rounds repaired to two legs, the final left at one`);

/* ------------------------------------------------------------------ */
console.log('2) A round already played is left exactly as it was');
let before = failures;
const midSeason = toLegacy(fresh);
const firstKo = koWeeks(midSeason)[0];
const secondKo = koWeeks(midSeason)[1];
if (!secondKo) {
  fail('the reference career has only one knockout round, so the played/ahead split cannot be tested');
} else {
  /* Stand the player between the two knockout rounds: the first is behind
     them and settled, the second is still in front. */
  midSeason.week = firstKo.i + 1;
  const playedRound = firstKo.e.uclRound;
  const aheadRound = secondKo.e.uclRound;
  ensureUclLegs(midSeason);
  if (legsFor(midSeason, playedRound) !== 1) {
    fail(`${playedRound} was already played and the migration gave it ${legsFor(midSeason, playedRound)} weeks, rewriting a settled result`);
  }
  if (koWeeks(midSeason).find(({ e }) => e.uclRound === playedRound)?.e.uclLeg !== undefined) {
    fail(`${playedRound} was already played and the migration marked it as a leg`);
  }
  if (uclLegsFor(midSeason.eraId, aheadRound) === 2 && legsFor(midSeason, aheadRound) !== 2) {
    fail(`${aheadRound} is still ahead of the player and did not get its second leg`);
  }
}
if (failures === before) console.log('   the settled round untouched, the round ahead repaired');

/* ------------------------------------------------------------------ */
console.log('3) Running it twice changes nothing');
before = failures;
const twice = toLegacy(fresh);
twice.week = 0;
ensureUclLegs(twice);
const afterOnce = JSON.stringify(twice.calendar);
ensureUclLegs(twice);
if (JSON.stringify(twice.calendar) !== afterOnce) fail('a second run changed the calendar, so it is not safe in a load path that runs on every open');
if (failures === before) console.log('   idempotent');

/* ------------------------------------------------------------------ */
console.log('4) A modern calendar is untouched');
before = failures;
const modern = JSON.parse(JSON.stringify(fresh));
const modernBefore = JSON.stringify(modern.calendar);
ensureUclLegs(modern);
if (JSON.stringify(modern.calendar) !== modernBefore) fail('the migration edited a calendar that was already correct');
if (failures === before) console.log('   a career built today is left alone');

/* ------------------------------------------------------------------ */
console.log('5) The first knockout round this save plays really is two legged after the repair');
before = failures;
/* NOT hardcoded to R16. A modern save has no round of 16 at all: its first
   knockout round is the quarter final, which the reference career proves
   (uclFirstKoRound returns QF). Asking about R16 here would have made this
   section pass on a career that never plays one, which is the harness testing
   nothing. So it asks the save which round it starts at. */
const firstRepair = toLegacy(fresh);
firstRepair.week = 0;
const firstRound = koWeeks(firstRepair)[0].e.uclRound;
if (uclLegsFor(firstRepair.eraId, firstRound) !== 2) {
  fail(`the reference career's first knockout round (${firstRound}) is not two legged, so this section cannot test the repair`);
} else {
  if (koWeeks(firstRepair).filter(({ e }) => e.uclRound === firstRound).some(({ e }) => e.uclLeg !== undefined)) {
    fail('the legacy fixture already carries a leg marker on the first knockout round');
  }
  ensureUclLegs(firstRepair);
  const marked = koWeeks(firstRepair).filter(({ e }) => e.uclRound === firstRound);
  if (marked.length !== 2 || !marked.every(({ e }) => e.uclLeg !== undefined)) {
    fail(`after the migration ${firstRound} has ${marked.length} week(s) and does not carry both leg markers, so the draw still reads this save as one legged and hands the group winner the wrong ground`);
  }
}
if (failures === before) console.log(`   ${firstRound} reads as two legged off the calendar`);

/* ------------------------------------------------------------------ */
console.log('6) An era save, which really does play a round of 16, migrates too');
before = failures;
/* The modern format has no R16, so every section above tests QF and SF only.
   2015-16 plays the eight group draw into a round of 16, which is also the one
   round ensureUclCalendar knows about, so it is the case where the two repairs
   have to agree rather than fight. */
const eraCareer = startCareer('Barcelona', 'era2015');
const eraKo = eraCareer.calendar.filter(e => e.type === 'uclKo');
if (!eraKo.some(e => e.uclRound === 'R16')) {
  fail('the 2015-16 reference career has no round of 16, so this section cannot test it');
} else {
  const eraLegacy = toLegacy(eraCareer);
  eraLegacy.week = 0;
  if (legsFor(eraLegacy, 'R16') !== 1) fail('the 2015-16 legacy fixture is not in the legacy shape');
  ensureUclLegs(eraLegacy);
  if (legsFor(eraLegacy, 'R16') !== 2) fail('the 2015-16 round of 16 did not get its second leg');
  const r16 = koWeeks(eraLegacy).filter(({ e }) => e.uclRound === 'R16').map(({ e }) => e.uclLeg);
  if (r16[0] !== 1 || r16[1] !== 2) fail(`the 2015-16 round of 16 legs came out as ${JSON.stringify(r16)}`);
}
if (failures === before) console.log('   2015-16 round of 16 repaired to two legs');

/* ------------------------------------------------------------------ */
if (CONTROL === 'noop') {
  if (failures > 0) { console.log('\n   CONTROL FIRED: the unmigrated save was caught'); process.exit(0); }
  console.error('\n   CONTROL DID NOT FIRE: the harness cannot see the state every legacy save is in');
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimUclLegMigration: all green');
