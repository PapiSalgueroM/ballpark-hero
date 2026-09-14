/**
 * simTournamentWinners: every squad in docs/data/soccer-data.json is filed
 * under the nation whose players it actually holds.
 *
 * THE DEFECT THIS EXISTS FOR. Rank 7 of the data provenance inventory:
 * "Root cause of 115 quarantined Connections puzzles, still wrong in the repo".
 * Six of the eight keys in tournament_winners held a DIFFERENT nation's squad
 * than the key named. "WC 2022 Argentina winners" was Ecuador's squad. "Euro
 * 2024 Spain winners" was Germany's. A generator reading that file labels
 * every one of those players "Played for <the key's nation>", which is how 115
 * puzzles came out unsolvable in May 2026. It was diagnosed on 2026-05-29 and
 * was still wrong in the repo when this was written on 2026-09-13.
 *
 * HOW THE RE-KEY WAS PROVED, which is the part worth copying. The 2026-05-29
 * diagnosis was reached by a human reading player names. This round did it
 * again by a different route and without looking at that audit first: every
 * list was resolved player by player against src/data/playerNationalities.ts,
 * the fail-closed nationality bake. Each of the eight came back as exactly ONE
 * nationality with no mixture whatsoever, and the six that disagreed with
 * their key were the same six. Two independent methods, the same answer.
 *
 * WHAT IT CHECKS.
 *   1. No list is filed under the wrong nation. Every player the nationality
 *      bake can resolve must carry the nationality the key names. One
 *      mismatch fails: these are squads, not mixtures, and the whole defect
 *      was a list sitting under someone else's name.
 *   2. Enough players resolve for section 1 to mean something. The bake covers
 *      current players best, so an old squad resolves thinly, and a check that
 *      resolves nothing passes for the wrong reason. The total resolved across
 *      the file is ratcheted.
 *   3. This file is still read by NOTHING under src, scripts or supabase. It
 *      is a generation input, not a shipped source, and that is the only
 *      reason four of its eight lists are allowed to be squads this site
 *      cannot two-source. The day something imports it, that stops being true
 *      and this goes red so somebody has to make the decision on purpose.
 *   4. The quarantined Connections migration is still quarantined. It was
 *      generated from the broken mapping, so applying it would put the 115
 *      unsolvable puzzles into the live table.
 *
 * WHAT WAS NOT FIXED, and why that is not a dodge. Only the two World Cup keys
 * could be replaced with the real winners, because public.national_team_squads
 * covers the World Cup and nothing else. No table on this site holds Spain's
 * Euro 2024 squad, Italy's Euro 2020, Argentina's Copa America 2021 or
 * Senegal's AFCON 2021, and inventing them is forbidden. Those four lists are
 * real squads wrongly labelled, so they are re-keyed to the nation they really
 * are and no longer claim to be winners. Nothing was deleted and 111 real
 * player names went from libelled to correct.
 *
 * CONTROLS:
 *   TW_CONTROL=miskey  a key put back under the wrong nation, section 1 fires
 *   TW_CONTROL=reader  a src file made to look like it imports the JSON,
 *                      section 3 fires
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TW_CONTROL || '';
const JSON_FILE = 'docs/data/soccer-data.json';
const NAT_FILE = 'src/data/playerNationalities.ts';
const QUARANTINED = 'supabase/migrations/_DO_NOT_APPLY_20260527_connections_batch_autopilot.sql.bak';
/* Today's resolved total, MEASURED at 106 on 2026-09-13, not picked. The first
   draft of this line said 110 because that felt like a round number near it,
   and it went red on correct data immediately. Below this the nationality bake
   has lost coverage and section 1 is checking less than it did. */
const RESOLVED_FLOOR = 106;

let failures = 0;
const fired = new Set();
const fail = (n, msg) => { fired.add(n); console.error('  FAIL: ' + msg); failures += 1; };

const data = JSON.parse(fs.readFileSync(path.join(ROOT, JSON_FILE), 'utf8'));
let winners = data.tournament_winners;
if (CONTROL === 'miskey') {
  const from = 'Euro 2024 Germany squad';
  if (!winners[from]) {
    console.error(`CONTROL miskey cannot run: "${from}" is not a key any more, so it would change nothing.`);
    process.exit(2);
  }
  const rebuilt = {};
  for (const [k, v] of Object.entries(winners)) rebuilt[k === from ? 'Euro 2024 Spain winners' : k] = v;
  winners = rebuilt;
  console.log('   CONTROL miskey: Germany\'s squad filed under Spain again, section 1 must fire');
}

/* The "now" world of the nationality bake: one name to one nationality. */
const natSrc = fs.readFileSync(path.join(ROOT, NAT_FILE), 'utf8');
const start = natSrc.indexOf('now: {');
const end = natSrc.indexOf('\n},', start);
if (start < 0 || end < 0) { console.error(`could not read the "now" block out of ${NAT_FILE}`); process.exit(1); }
const NAT = {};
for (const m of natSrc.slice(start, end).matchAll(/'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)'/g)) {
  NAT[m[1].replace(/\\'/g, "'")] = m[2].replace(/\\'/g, "'");
}
console.log(`Nationality bake: ${Object.keys(NAT).length} names in the "now" world`);

/* A key names a country in prose; the bake spells some of them differently. */
const COUNTRY_ALIAS = { 'Ivory Coast': "Cote d'Ivoire" };
const countryOf = key => {
  /* "AFCON 2021 Burkina Faso squad" -> "Burkina Faso": drop the competition,
     the year, and the trailing word. */
  const words = key.replace(/\s+(winners|squad)$/i, '').split(/\s+/);
  const yearAt = words.findIndex(w => /^\d{4}$/.test(w));
  const name = words.slice(yearAt + 1).join(' ');
  return COUNTRY_ALIAS[name] || name;
};
const clean = n => n.replace(/\s*\((?:captain|c)\)\s*$/i, '').trim();

// ---------------------------------------------------------------------------
console.log('\n--- 1. every squad is filed under the nation whose players it holds ---');
let resolvedTotal = 0;
for (const [key, list] of Object.entries(winners)) {
  const want = countryOf(key);
  if (!want) { fail(1, `"${key}" does not name a country this check can read`); continue; }
  const wrong = [];
  let resolved = 0;
  for (const raw of list) {
    const nat = NAT[clean(raw)];
    if (!nat) continue;
    resolved += 1;
    if (nat !== want) wrong.push(`${clean(raw)} is ${nat}`);
  }
  resolvedTotal += resolved;
  if (wrong.length) {
    fail(1, `"${key}" is filed under ${want} but holds ${wrong.length} player(s) of another nation: ${wrong.slice(0, 4).join(', ')}${wrong.length > 4 ? ` and ${wrong.length - 4} more` : ''}`);
  } else {
    console.log(`  ${key.padEnd(38)} ${resolved} of ${list.length} resolved, all ${want}`);
  }
}

// ---------------------------------------------------------------------------
console.log('\n--- 2. enough names resolved for section 1 to mean anything ---');
if (resolvedTotal < RESOLVED_FLOOR) {
  fail(2, `only ${resolvedTotal} players resolved against the nationality bake, below the floor of ${RESOLVED_FLOOR}. Section 1 cannot see a mis-keyed squad it cannot resolve, so a green run above means less than it looks.`);
} else {
  console.log(`  ${resolvedTotal} players resolved (floor ${RESOLVED_FLOOR})`);
}

// ---------------------------------------------------------------------------
console.log('\n--- 3. nothing shipped reads this file ---');
const SCAN = ['src', 'scripts', 'supabase'];
const walk = dir => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...walk(p)); }
    else if (/\.(ts|tsx|mjs|js|json)$/.test(e.name)) out.push(p);
  }
  return out;
};
const readers = [];
for (const dir of SCAN) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of walk(full)) {
    if (path.resolve(f) === path.resolve(path.join(ROOT, 'scripts/simTournamentWinners.mjs'))) continue;
    const text = fs.readFileSync(f, 'utf8');
    /* Comments name the file on purpose, so strip them before matching: a
       guard that reads the prose explaining the guard is the oldest mistake
       in this repo. */
    const code = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
    if (code.includes('soccer-data.json')) readers.push(path.relative(ROOT, f).replaceAll('\\', '/'));
  }
}
if (CONTROL === 'reader') {
  if (readers.length) {
    console.error('CONTROL reader cannot run: something already reads the file, so it would change nothing.');
    process.exit(2);
  }
  readers.push('src/data/PRETEND_READER.ts');
  console.log('   CONTROL reader: a shipped file made to import the JSON, section 3 must fire');
}
if (readers.length) {
  fail(3, `${readers.join(', ')} now reads ${JSON_FILE}. It stopped being a generation input the moment that happened: four of its eight squads are lists this site cannot two-source, and a shipped source needs a higher bar than "not wrong about whose squad it is".`);
} else {
  console.log(`  nothing under ${SCAN.join(', ')} reads ${JSON_FILE}, so it is still a generation input`);
}

// ---------------------------------------------------------------------------
console.log('\n--- 4. the Connections batch generated from the broken mapping is still quarantined ---');
const qPath = path.join(ROOT, QUARANTINED);
if (!fs.existsSync(qPath)) {
  fail(4, `${QUARANTINED} is gone. It was generated from the mis-keyed squads, so it must stay quarantined rather than be applied or renamed. If it was deliberately deleted, delete this section too and say why.`);
} else {
  console.log(`  ${path.basename(QUARANTINED)} still carries its _DO_NOT_APPLY_ prefix and its .bak suffix`);
}

// ---------------------------------------------------------------------------
const EXPECT = { miskey: 1, reader: 3 };
if (CONTROL) {
  const want = EXPECT[CONTROL];
  if (want === undefined) { console.error(`Unknown TW_CONTROL "${CONTROL}"`); process.exit(2); }
  if (fired.has(want)) { console.log(`\nCONTROL ${CONTROL}: section ${want} fired, as it must.`); process.exit(0); }
  console.error(`\nCONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`);
  process.exit(1);
}
if (failures) { console.error(`\nsimTournamentWinners: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimTournamentWinners: every squad is under its own nation, and the file is still read by nothing.');
