/**
 * Round 535 harness: Guess The College's source data cannot drift off the
 * evidence it was verified against.
 *
 * WHY IT EXISTS. Before Round 535 src/data/colleges.ts had no provenance, no
 * year on a single number and no check of any kind, and the audit that added
 * them found real breakage sitting in the clue set: Texas credited with a
 * basketball national championship in 2023 it has never won, Georgia Tech
 * credited with the 2004 one it lost in the final, Louisville still counting a
 * title the NCAA vacated in 2018, UCLA's eleven credited to a coach who won
 * ten of them, Oklahoma called the school with the most Heisman winners when
 * USC has more, Baylor given an undefeated 2013 that finished 11-1, and
 * Arizona State given a Rose Bowl it lost 20-17. None of that was catchable,
 * because every countable claim sat inside a prose sentence.
 *
 * WHAT IT HOLDS.
 *   1. Shape: 70 schools, no duplicate name, nickname or IPEDS unit id.
 *   2. Provenance: the header carries a real date, not in the future, and the
 *      evidence file it names exists and carries the same date.
 *   3. Conferences: every string is a conference that exists in 2026-27, and
 *      only the four power leagues may be marked power4.
 *   4. The ledgers: seasons are in range, unique and sorted, every key is a
 *      school in the file, no count is negative or above the pinned maximum,
 *      and no vacated season appears in a ledger while every vacated season is
 *      named in its own list.
 *   5. Anchors: 27 values pinned straight off the evidence file.
 *   6. Enrollment: every shipped figure carries its year and its unit id and
 *      sits in a sane band; every withheld one is in COLLEGE_THIN with a
 *      reason; the two sets do not overlap.
 *   7. Derivation: the counts the player reads are computed from the ledgers.
 *      The clue builder must call the count helpers, and no clue string in the
 *      data file may re-type a championship count beside them.
 *   8. House style: no em or en dash in the data file or this one.
 *
 * NEGATIVE CONTROL: COLLEGE_CONTROL=anchor copies the data file, moves one
 * pinned anchor by one (Alabama's fall 2023 enrollment, 39622 to 39623), and
 * runs section 5 against the copy. It REFUSES TO RUN if that rewrite changed
 * nothing, because a control that cannot fire turns green into "the control
 * missed" rather than "the check works". Line endings are folded before the
 * match so a CRLF checkout cannot silently defeat it.
 *
 * Run: node scripts/simColleges.mjs
 *      COLLEGE_CONTROL=anchor node scripts/simColleges.mjs   (must go red)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src/data/colleges.ts');
const HOOK = path.join(ROOT, 'src/hooks/useGuessTheCollege.ts');
const CONTROL = process.env.COLLEGE_CONTROL || '';
if (CONTROL && CONTROL !== 'anchor') {
  console.error(`COLLEGE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = (m) => { failures += 1; console.error('  FAIL: ' + m); };

/* ------------------------------------------------------ load the data file */
// Folding CRLF first: this checkout is Windows and a control that matches on a
// raw byte string would quietly fail to fire against \r\n.
const rawSource = fs.readFileSync(DATA, 'utf8');
const source = rawSource.replace(/\r\n/g, '\n');

let modulePath = DATA;
if (CONTROL === 'anchor') {
  const OLD = 'enrollment: 39622,';
  const NEW = 'enrollment: 39623,';
  if (!source.includes(OLD)) {
    console.error('CONTROL REFUSES TO RUN: "' + OLD + '" is not in ' + DATA + ', so the rewrite would change nothing and green would mean the control missed.');
    process.exit(2);
  }
  const patched = source.replace(OLD, NEW);
  if (patched === source) {
    console.error('CONTROL REFUSES TO RUN: the rewrite changed nothing.');
    process.exit(2);
  }
  modulePath = path.join(os.tmpdir(), 'dukb_colleges_control.ts');
  fs.writeFileSync(modulePath, patched);
  console.log('CONTROL anchor: Alabama fall 2023 enrollment moved 39622 -> 39623 in a copy. Section 5 must go red.\n');
}

const ENTRY = path.join(os.tmpdir(), 'dukb_colleges_entry.mjs');
const OUT = path.join(os.tmpdir(), 'dukb_colleges_bundle.mjs');
fs.writeFileSync(ENTRY, `export * from ${JSON.stringify(modulePath.replace(/\\/g, '/'))};\n`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const mod = await import(pathToFileURL(OUT).href + '?t=' + Date.now());
const {
  colleges, COLLEGE_DATA_META, CFB_TITLE_SEASONS, CFB_VACATED_TITLES,
  NCAA_MBB_TITLE_SEASONS, NCAA_MBB_VACATED_TITLES, COLLEGE_THIN,
  cfbTitleCount, mbbTitleCount,
} = mod;

const byName = new Map(colleges.map((c) => [c.name, c]));
const get = (name) => byName.get(name);

/* ----------------------------------------------------------- 1) the shape */
console.log('1) shape');
{
  if (colleges.length !== 70) fail(`${colleges.length} schools, the audit covered exactly 70; move the count here in the round that adds one`);
  const names = new Set();
  const units = new Map();
  const nicks = new Map();
  for (const c of colleges) {
    if (names.has(c.name)) fail(`duplicate school: ${c.name}`);
    names.add(c.name);
    if (!Number.isInteger(c.ipedsUnitId) || c.ipedsUnitId < 100000 || c.ipedsUnitId > 999999) {
      fail(`${c.name} has no usable IPEDS unit id (${c.ipedsUnitId}), so its enrollment cannot be pulled again`);
    }
    if (units.has(c.ipedsUnitId)) fail(`${c.name} shares IPEDS unit id ${c.ipedsUnitId} with ${units.get(c.ipedsUnitId)}`);
    units.set(c.ipedsUnitId, c.name);
    // A shared nickname is fine and true: "Tigers" really is LSU, Clemson,
    // Memphis and Missouri, and the guess checker accepts it for whichever
    // school is the answer. What is not fine is a nickname that is another
    // school's full name, because that reads as the wrong school entirely.
    for (const n of c.nicknames) {
      const k = n.toLowerCase();
      nicks.set(k, c.name);
    }
    for (const f of ['mascot', 'vibeWord', 'region', 'state', 'conference', 'basketballHistory', 'cfbHistory', 'nflDraftHistory', 'famousAlumniHint', 'colors', 'funFact']) {
      if (typeof c[f] !== 'string' || c[f].trim() === '') fail(`${c.name}.${f} is empty`);
    }
  }
  for (const c of colleges) {
    for (const n of c.nicknames) {
      const other = byName.get(n);
      if (other && other.name !== c.name) {
        fail(`${c.name} carries "${n}" as a nickname, which is ${other.name}'s full name`);
      }
    }
  }
  console.log(`   ${colleges.length} schools, ${units.size} unit ids, ${nicks.size} distinct nicknames`);
}

/* ------------------------------------------------------ 2) the provenance */
console.log('2) provenance header');
{
  const d = COLLEGE_DATA_META && COLLEGE_DATA_META.verified;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) {
    fail(`COLLEGE_DATA_META.verified is "${d}", which is not a date`);
  } else {
    const parsed = new Date(d + 'T00:00:00Z');
    if (Number.isNaN(parsed.getTime())) fail(`COLLEGE_DATA_META.verified "${d}" does not parse`);
    else if (parsed.getTime() > Date.now()) fail(`COLLEGE_DATA_META.verified "${d}" is in the future`);
    else if (String(parsed.toISOString().slice(0, 10)) !== d) fail(`COLLEGE_DATA_META.verified "${d}" is not a real calendar day`);
  }
  const evidence = path.join(ROOT, COLLEGE_DATA_META.evidence || '');
  if (!COLLEGE_DATA_META.evidence || !fs.existsSync(evidence)) {
    fail(`the header points at ${COLLEGE_DATA_META.evidence}, which is not in the repo`);
  } else {
    const text = fs.readFileSync(evidence, 'utf8');
    if (!text.includes(d)) fail(`${COLLEGE_DATA_META.evidence} does not carry the date ${d} the header claims`);
    if (!/VERIFIED/.test(text) || !/CORRECTED/.test(text) || !/REMOVED/.test(text)) {
      fail('the evidence file does not use the VERIFIED / CORRECTED / REMOVED statuses');
    }
  }
  if (COLLEGE_DATA_META.schools !== colleges.length) {
    fail(`the header says ${COLLEGE_DATA_META.schools} schools, the array has ${colleges.length}`);
  }
  if (COLLEGE_DATA_META.enrollmentYear !== 2023) fail('the header enrollment year moved without the numbers moving');
  console.log(`   verified ${d}, evidence ${COLLEGE_DATA_META.evidence}`);
}

/* ------------------------------------------------------- 3) conferences */
console.log('3) conferences for 2026-27');
// Every league that actually exists in 2026-27 and could hold one of these
// schools. A conference that stops existing has to be removed here by hand,
// which is the point: realignment should break the build, not the clue.
const LEAGUES_2026_27 = new Set([
  'SEC', 'Big Ten', 'ACC', 'Big 12', 'Pac-12', 'Mountain West',
  'American Conference', 'Sun Belt', 'Conference USA', 'MAC', 'WCC',
  'Big East', 'Atlantic 10', 'Independent',
]);
const POWER_FOUR = new Set(['SEC', 'Big Ten', 'ACC', 'Big 12']);
{
  for (const c of colleges) {
    if (!LEAGUES_2026_27.has(c.conference)) {
      fail(`${c.name} competes in "${c.conference}", which is not a 2026-27 conference this harness knows`);
    }
    if (c.conferenceType === 'power4' && !POWER_FOUR.has(c.conference)) {
      fail(`${c.name} is marked power4 but plays in the ${c.conference}`);
    }
    if (c.conferenceType !== 'power4' && POWER_FOUR.has(c.conference)) {
      fail(`${c.name} plays in the ${c.conference} but is not marked power4`);
    }
  }
  const seen = [...new Set(colleges.map((c) => c.conference))].sort();
  console.log(`   ${seen.length} leagues in play: ${seen.join(', ')}`);
}

/* ---------------------------------------------------------- 4) the ledgers */
console.log('4) championship ledgers');
// Pinned off the evidence: Alabama leads football at 13 poll era titles and
// UCLA leads basketball at 11. A count above either is arithmetic that has
// gone wrong, not a school that improved.
const CFB_MAX = 13;
const MBB_MAX = 11;
{
  const checkLedger = (ledger, label, max, lo, hi, vacated) => {
    const vacatedPairs = new Set(vacated.map((v) => v.school + '|' + v.season));
    for (const [school, seasons] of Object.entries(ledger)) {
      if (!byName.has(school)) fail(`${label} has a ledger for "${school}", which is not a school in this file`);
      if (!Array.isArray(seasons) || seasons.length === 0) { fail(`${label}: ${school} has an empty ledger, drop the key instead`); continue; }
      if (seasons.length > max) fail(`${label}: ${school} shows ${seasons.length} titles, above the pinned maximum of ${max}`);
      if (seasons.length < 0) fail(`${label}: ${school} shows a negative count`);
      const sorted = [...seasons].sort((a, b) => a - b);
      if (JSON.stringify(sorted) !== JSON.stringify(seasons)) fail(`${label}: ${school} seasons are not in order`);
      if (new Set(seasons).size !== seasons.length) fail(`${label}: ${school} lists a season twice`);
      for (const s of seasons) {
        if (!Number.isInteger(s) || s < lo || s > hi) fail(`${label}: ${school} lists season ${s}, outside ${lo} to ${hi}`);
        if (vacatedPairs.has(school + '|' + s)) fail(`${label}: ${school} still counts ${s}, which is in the vacated list`);
      }
    }
    for (const v of vacated) {
      if (!byName.has(v.school)) fail(`${label} vacated list names "${v.school}", not a school in this file`);
      if (!v.reason || v.reason.length < 20) fail(`${label} vacated ${v.school} ${v.season} has no reason written down`);
    }
    if (vacated.length === 0) fail(`${label} names no vacated title at all; the two known ones must stay named`);
  };
  const thisYear = new Date().getUTCFullYear();
  checkLedger(CFB_TITLE_SEASONS, 'football', CFB_MAX, 1936, thisYear, CFB_VACATED_TITLES);
  checkLedger(NCAA_MBB_TITLE_SEASONS, 'basketball', MBB_MAX, 1939, thisYear, NCAA_MBB_VACATED_TITLES);

  for (const c of colleges) {
    const f = cfbTitleCount(c.name);
    const b = mbbTitleCount(c.name);
    if (f < 0 || b < 0) fail(`${c.name} derives a negative count`);
    if (f > CFB_MAX) fail(`${c.name} derives ${f} football titles, above the pinned maximum`);
    if (b > MBB_MAX) fail(`${c.name} derives ${b} basketball titles, above the pinned maximum`);
    if (f !== (CFB_TITLE_SEASONS[c.name] || []).length) fail(`${c.name} football count does not match its ledger`);
    if (b !== (NCAA_MBB_TITLE_SEASONS[c.name] || []).length) fail(`${c.name} basketball count does not match its ledger`);
  }
  const totalF = colleges.reduce((n, c) => n + cfbTitleCount(c.name), 0);
  const totalB = colleges.reduce((n, c) => n + mbbTitleCount(c.name), 0);
  console.log(`   ${totalF} football title seasons and ${totalB} basketball ones across the 70`);
}

/* -------------------------------------------------------- 5) the anchors */
console.log('5) anchors pinned off the evidence file');
{
  // Each of these is a row in docs/audits/colleges-verification-2026-09-12.md.
  const ANCHORS = [
    ['University of Alabama', 'cfb titles', () => cfbTitleCount('University of Alabama'), 13],
    ['University of Alabama', 'enrollment', () => get('University of Alabama').enrollment, 39622],
    ['University of Alabama', 'ipeds unit', () => get('University of Alabama').ipedsUnitId, 100751],
    ['University of California, Los Angeles', 'mbb titles', () => mbbTitleCount('University of California, Los Angeles'), 11],
    ['University of Louisville', 'mbb titles (2013 vacated)', () => mbbTitleCount('University of Louisville'), 2],
    ['University of Southern California', 'cfb titles (2004 vacated)', () => cfbTitleCount('University of Southern California'), 6],
    ['University of Michigan', 'mbb titles (1989 and 2026)', () => mbbTitleCount('University of Michigan'), 2],
    ['University of Florida', 'mbb titles (2006, 2007, 2025)', () => mbbTitleCount('University of Florida'), 3],
    ['University of Texas at Austin', 'mbb titles, never won it', () => mbbTitleCount('University of Texas at Austin'), 0],
    ['Georgia Institute of Technology', 'mbb titles, lost the 2004 final', () => mbbTitleCount('Georgia Institute of Technology'), 0],
    ['Indiana University Bloomington', 'cfb titles (2025)', () => cfbTitleCount('Indiana University Bloomington'), 1],
    ['University of Illinois Urbana-Champaign', 'cfb titles, none in the poll era', () => cfbTitleCount('University of Illinois Urbana-Champaign'), 0],
    ['University of Minnesota', 'cfb titles', () => cfbTitleCount('University of Minnesota'), 4],
    ['Ohio State University', 'cfb titles', () => cfbTitleCount('Ohio State University'), 7],
    ['University of Notre Dame', 'cfb titles', () => cfbTitleCount('University of Notre Dame'), 8],
    ['University of Kentucky', 'mbb titles', () => mbbTitleCount('University of Kentucky'), 8],
    ['Gonzaga University', 'conference', () => get('Gonzaga University').conference, 'Pac-12'],
    ['Boise State University', 'conference', () => get('Boise State University').conference, 'Pac-12'],
    ['San Diego State University', 'conference', () => get('San Diego State University').conference, 'Pac-12'],
    ['University of Nevada, Las Vegas', 'conference', () => get('University of Nevada, Las Vegas').conference, 'Mountain West'],
    ['University of Memphis', 'conference', () => get('University of Memphis').conference, 'American Conference'],
    ['University of Oklahoma', 'conference', () => get('University of Oklahoma').conference, 'SEC'],
    ['University of Texas at Austin', 'conference', () => get('University of Texas at Austin').conference, 'SEC'],
    ['Duke University', 'enrollment', () => get('Duke University').enrollment, 17112],
    ['Liberty University', 'enrollment', () => get('Liberty University').enrollment, 103251],
    ['Vanderbilt University', 'enrollment', () => get('Vanderbilt University').enrollment, 13456],
  ];
  if (ANCHORS.length < 15) fail(`only ${ANCHORS.length} anchors are pinned, the round asked for at least 15`);
  let held = 0;
  for (const [school, what, read, expected] of ANCHORS) {
    let actual;
    try { actual = read(); } catch (e) { actual = 'threw: ' + e.message; }
    if (actual !== expected) fail(`anchor ${school} ${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    else held += 1;
  }
  const nd = get('University of Notre Dame');
  if (!nd.conferenceNote || !/football/i.test(nd.conferenceNote)) {
    fail('Notre Dame no longer says its ACC membership stops at football');
  } else held += 1;
  console.log(`   ${held} of ${ANCHORS.length + 1} anchors held`);
}

/* ------------------------------------------------------- 6) the enrollment */
console.log('6) enrollment and the thin list');
{
  const thin = Object.keys(COLLEGE_THIN);
  for (const name of thin) {
    if (!byName.has(name)) fail(`COLLEGE_THIN names "${name}", not a school in this file`);
    const reason = COLLEGE_THIN[name];
    if (!reason || reason.length < 20) fail(`COLLEGE_THIN has no readable reason for ${name}`);
  }
  for (const c of colleges) {
    const withheldEnrolment = c.enrollment === undefined;
    const withheldOlympics = c.olympicAthletes === undefined;
    if ((withheldEnrolment || withheldOlympics) && !(c.name in COLLEGE_THIN)) {
      fail(`${c.name} is missing a clue but is not in COLLEGE_THIN, so the page cannot explain it`);
    }
    if (!withheldEnrolment) {
      if (c.enrollmentYear !== 2023) fail(`${c.name} ships an enrollment with year ${c.enrollmentYear}, the pull was fall 2023`);
      if (!Number.isInteger(c.enrollment) || c.enrollment < 2000 || c.enrollment > 250000) {
        fail(`${c.name} enrollment ${c.enrollment} is outside any sane band`);
      }
    } else if (c.enrollmentYear !== undefined) {
      fail(`${c.name} has no enrollment but still carries a year`);
    }
  }
  if (thin.length === 0) fail('COLLEGE_THIN is empty; the audit left seven entries and emptying it hides them');
  console.log(`   ${colleges.filter((c) => c.enrollment !== undefined).length} schools ship a fall 2023 figure, ${thin.length} are marked thin`);
}

/* --------------------------------------------------------- 7) derivation */
console.log('7) the counts are derived, not typed');
{
  const before7 = failures;
  const hook = fs.readFileSync(HOOK, 'utf8').replace(/\r\n/g, '\n');
  // Strip comments first: prose about the check is the one place the string a
  // guard looks for is guaranteed to appear.
  const hookCode = hook.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (!/cfbTitleCount\s*\(/.test(hookCode) || !/mbbTitleCount\s*\(/.test(hookCode)) {
    fail('the clue builder no longer calls the count helpers, so the number the player reads is typed somewhere else');
  }
  if (/college\.acceptanceRate|acceptanceRate/.test(hookCode)) fail('the acceptance rate clue is back');

  // A clue string must not re-type a championship count beside the derived one.
  // A count word, then up to a couple of words, then "national" or "NCAA",
  // then up to a couple more, then championship or title. That shape catches
  // "5 NCAA basketball championships" and "three national titles" while
  // leaving "multiple Big Ten championships" and "a 12 season run" alone,
  // because those name no national title at all. Four digit years are excluded
  // so "the 1980 and 1986 titles stand" is not read as a count.
  const RETYPED = /\b(?!\d{4}\b)(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:\w+\s+){0,2}(?:national|NCAA)\s+(?:\w+\s+){0,2}(?:championship|title)s?\b/i;
  for (const c of colleges) {
    for (const f of ['basketballHistory', 'cfbHistory']) {
      if (RETYPED.test(c[f])) {
        fail(`${c.name}.${f} types a championship count into prose: "${c[f]}". The count comes from the ledger.`);
      }
    }
  }
  if (failures === before7) console.log('   clue counts come from the ledgers and no clue string re-types one');
}

/* -------------------------------------------------------- 8) house style */
console.log('8) house style');
{
  const before = failures;
  const self = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  for (const [label, text] of [['src/data/colleges.ts', source], ['scripts/simColleges.mjs', self]]) {
    // Built from code points so this file does not have to contain the
    // characters it bans.
    const dash = text.match(new RegExp('[\\u2013\\u2014]'));
    if (dash) fail(`${label} contains U+${dash[0].codePointAt(0).toString(16)}, which this repo does not use`);
  }
  if (failures === before) console.log('   no em or en dash in the data file or this harness');
}

/* -------------------------------------------------------------- verdict */
console.log('');
if (CONTROL === 'anchor') {
  if (failures === 0) {
    console.error('CONTROL FAILED: the anchor was moved and every check still passed. The anchors are not holding anything.');
    process.exit(1);
  }
  console.log(`CONTROL FIRED as intended: ${failures} failure(s) with one anchor moved by one.`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`simColleges: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simColleges: green');
