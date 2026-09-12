/**
 * Round 543: a league's Champions League places are the ones it actually has.
 *
 * WHY THIS EXISTS. A player reported on 2026-09-11 that Chelsea should not be
 * in the 2026-27 Champions League because they failed to qualify. Reading the
 * engine for that turned up a wider version of the same mistake: three separate
 * places decided European qualification with a hardcoded `<= 4`, applied to
 * every European league alike.
 *
 * The engine has carried the right numbers the whole time. EURO_SLOTS is a per
 * league, per era table with a documented shape (Ligue 1 sends three, the
 * Eredivisie and the Primeira Liga two, and Scotland, Turkey, Belgium, Austria,
 * Greece, Denmark, Switzerland and Croatia send their champion and nobody
 * else), and it was read ONLY to write the board's objective label. So the
 * board would tell a Scottish manager that Europe means winning the league,
 * and the season end would put him in the Champions League for finishing
 * fourth. Nine of the fifteen modern leagues were wrong.
 *
 * That is CLAUDE.md's derived-never-typed rule: the game's own table knows the
 * answer, so nothing should assert a second one beside it. Round 543 added
 * `uclPlacesIn(league)` and pointed all four call sites at it.
 *
 * WHAT THIS HOLDS:
 *   1. uclPlacesIn agrees with EURO_SLOTS for every league in the table, and
 *      returns 0 for a league that plays no European football. Measured
 *      against the table rather than against numbers retyped here, so the two
 *      cannot drift apart.
 *   2. The boundary is real, per league: finishing in the last qualifying place
 *      earns it and finishing one below does not. Driven through the engine's
 *      own exported predicate with a real career state, not asserted on the
 *      helper alone.
 *   3. A one-slot league gives the place to the champion and to nobody else.
 *      This is the case the old code got wrong three places over.
 *   4. No source line anywhere in the engine still decides a European place
 *      with a hardcoded number, which is what stops the next call site being
 *      written the old way.
 *
 * NEGATIVE CONTROL: UCL_PLACES_CONTROL=hardcoded rewrites uclPlacesIn back to
 * a flat 4 inside the bundle before it is imported, which is exactly the code
 * that shipped, and sections 2 and 3 must go red. It asserts the rewrite
 * actually matched something first and refuses to run otherwise.
 *
 * Run: node scripts/simUclPlaces.mjs      (no database)
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

const CONTROL = process.env.UCL_PLACES_CONTROL || '';
const KNOWN_CONTROLS = ['hardcoded'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`UCL_PLACES_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ENTRY = path.join(os.tmpdir(), 'uclPlacesEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'uclPlaces.bundle.mjs');
/* Two-stage entry, the same trick the other engine harnesses use: ES module
   imports evaluate before the entry's own statements, so the localStorage stub
   has to be installed in a wrapper that DYNAMICALLY imports the engine. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

if (CONTROL === 'hardcoded') {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  /* The compiled body of uclPlacesIn. Put the shipped bug back: a flat four for
   * every European league, ignoring the table. */
  const re = /(function uclPlacesIn\([^)]*\)\s*\{\s*if\s*\([^)]*\)\s*return 0;\s*return )[^;]+;/;
  if (!re.test(text)) {
    console.error('CONTROL hardcoded cannot find uclPlacesIn in the bundle, so it would change nothing');
    process.exit(1);
  }
  const mutated = text.replace(re, '$14;');
  if (mutated === text) { console.error('CONTROL hardcoded changed nothing'); process.exit(1); }
  fs.writeFileSync(BUNDLE, mutated);
  console.log('   NEGATIVE CONTROL ON: uclPlacesIn forced back to a flat 4, sections 2 and 3 must go red');
}

const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
const { EURO_SLOTS, uclPlacesIn, sponsorBonusEarned, REAL_LEAGUES, careerLeagueOf } = cm;

/* ------------------------------------------------------------------ */
console.log('\n1) uclPlacesIn agrees with EURO_SLOTS, and a non-European league has none');
const slotIds = Object.keys(EURO_SLOTS);
if (slotIds.length < 15) fail(`EURO_SLOTS carries only ${slotIds.length} leagues, which is too few to be the real table`);
for (const id of slotIds) {
  const got = uclPlacesIn({ id, euro: true });
  if (got !== EURO_SLOTS[id].ucl) fail(`uclPlacesIn(${id}) said ${got}, EURO_SLOTS says ${EURO_SLOTS[id].ucl}`);
}
if (uclPlacesIn({ id: 'premier', euro: false }) !== 0) fail('a league with euro=false was given Champions League places');
if (!failures) console.log(`   ${slotIds.length} leagues agree with the table, non-European leagues get 0`);

/* ------------------------------------------------------------------ */
console.log('2) The boundary is real per league: the last place in earns it, one below does not');
let before = failures;
/* Driven through the engine's own predicate with a real state, so this measures
 * behaviour rather than the helper repeating itself. */
const euroLeagues = (REAL_LEAGUES ?? []).filter(l => l.euro && EURO_SLOTS[l.id]);
if (euroLeagues.length < 10) fail(`only ${euroLeagues.length} modern European leagues found, expected the full set`);
for (const league of euroLeagues) {
  const clubName = league.clubs?.[0];
  if (!clubName) { fail(`league ${league.id} has no clubs to test with`); continue; }
  const slots = EURO_SLOTS[league.id].ucl;
  const state = { clubName, eraId: undefined, sponsor: { bonusFor: 'europe', bonus: 5, perSeason: 1, years: 3, brand: 'Test' } };
  const got = careerLeagueOf(state);
  if (got.id !== league.id) continue; /* club name maps elsewhere, not this test's business */
  if (!sponsorBonusEarned(state, slots, 20)) fail(`${league.id}: finishing ${slots} of ${slots} places did not count as a European place`);
  if (sponsorBonusEarned(state, slots + 1, 20)) fail(`${league.id}: finishing ${slots + 1} counted as a Champions League place, but the league sends ${slots}`);
}
if (failures === before) console.log(`   ${euroLeagues.length} leagues, each earning at its own last place and not one below`);

/* ------------------------------------------------------------------ */
console.log('3) A one-slot league sends its champion and nobody else');
before = failures;
const oneSlot = slotIds.filter(id => EURO_SLOTS[id].ucl === 1);
if (oneSlot.length < 6) fail(`only ${oneSlot.length} single-slot leagues found, expected at least the eight modern ones`);
for (const id of oneSlot) {
  if (uclPlacesIn({ id, euro: true }) !== 1) fail(`${id} should send exactly one club`);
}
const scottish = (REAL_LEAGUES ?? []).find(l => l.id === 'scottish');
if (scottish) {
  const clubName = scottish.clubs[0];
  const state = { clubName, eraId: undefined, sponsor: { bonusFor: 'europe', bonus: 5, perSeason: 1, years: 3, brand: 'Test' } };
  if (careerLeagueOf(state).id === 'scottish') {
    if (!sponsorBonusEarned(state, 1, 12)) fail('the Scottish champion did not earn a European place');
    for (const pos of [2, 3, 4]) {
      if (sponsorBonusEarned(state, pos, 12)) fail(`finishing ${pos} in Scotland counted as a Champions League place`);
    }
  }
}
if (failures === before) console.log(`   ${oneSlot.length} single-slot leagues, champion only`);

/* ------------------------------------------------------------------ */
console.log('4) No source line still decides a European place with a hardcoded number');
before = failures;
const engineSrc = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8')
  .split('\n')
  .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))   /* a guard reads the code, never the comments */
  .join('\n');
for (const pattern of [/qualifiedUcl:\s*\w+\s*<=\s*\d/, /prevPos\s*<=\s*\d/, /bonusFor === 'europe'\) return \w+ <= \d/]) {
  if (pattern.test(engineSrc)) fail(`a European place is still decided by a literal: ${pattern}`);
}
if (failures === before) console.log('   all four call sites read the table');

/* ------------------------------------------------------------------ */
if (CONTROL === 'hardcoded') {
  if (failures > 0) { console.log('\n   CONTROL FIRED: the shipped behaviour was caught'); process.exit(0); }
  console.error('\n   CONTROL DID NOT FIRE: the harness cannot see the bug it was written for');
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimUclPlaces: all green');
