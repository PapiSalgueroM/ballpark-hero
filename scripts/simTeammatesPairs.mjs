/**
 * simTeammatesPairs: the Teammates game's 50 yes/no claims, adjudicated
 * against the site's own career table where that table can settle them.
 *
 * WHY THIS EXISTS. Rank 8 of docs/audits/data-provenance-inventory-2026-09-11.md:
 * "Every row is a binary answer", and src/data/teammatesPairs.ts had no
 * provenance and no harness at all. Each row says two named players either
 * were or were not club teammates, and the funFact beside it states the club
 * and the years, so a wrong row is a wrong fact told to a player twice.
 *
 * THE ASYMMETRY, which is the whole design and must not be flattened.
 * public.soccer_player_club_stints (80,586 rows, the same table Transfer Path
 * is built on) knows which clubs a player was at and when, so two players
 * sharing a club with overlapping years IS evidence they were teammates. The
 * absence of an overlap is NOT evidence they were not: the table's coverage
 * is partial, and this harness measures where. Frank Lampard has one stint
 * row for a man who played for four clubs, Andrea Pirlo has two for three,
 * and neither carries the MLS spell that makes the Pirlo pairs true, so three
 * true rows sit unadjudicated for want of data rather than because they are
 * wrong. So:
 *
 *   - a row claiming they were NEVER teammates, where the table shows a
 *     shared club, FAILS. Evidence beats the claim.
 *   - a row claiming they WERE teammates, where the table shows the shared
 *     club, is CONFIRMED, and then the funFact must name that club, because a
 *     funFact naming the wrong club is its own wrong fact.
 *   - no overlap is reported as UNADJUDICATED with the reason, and fails
 *     nothing. A check that treats missing data as a refutation gets easier
 *     the less data it has, which is the one thing a harness must never do.
 *
 * Because "unadjudicated" is free, the count of rows actually adjudicated is
 * itself ratcheted: if the table's coverage collapses this goes red rather
 * than passing quietly having checked nothing.
 *
 * The NBA and NFL rows cannot be adjudicated here at all: there is no
 * equivalent table (public.nba_player_team_seasons exists and is empty,
 * checked 2026-09-13). They get the structural checks only, and this file
 * says so rather than implying all 50 were verified.
 *
 * CONTROLS:
 *   TEAMMATES_CONTROL=flipfalse  a confirmed pair told they never played
 *                                together, section 3 must fire
 *   TEAMMATES_CONTROL=wrongclub  a funFact naming a club the pair never
 *                                shared, section 4 must fire
 *   TEAMMATES_CONTROL=dupe       the same pairing twice, section 2 must fire
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabaseFromClientTs } from './bakeCareerPlayers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TEAMMATES_CONTROL || '';
const FILE = 'src/data/teammatesPairs.ts';
/* today's adjudicated count; a run below this has lost coverage, not rows */
const ADJUDICATED_FLOOR = 10;

let failures = 0;
const fired = new Set();
const fail = (n, msg) => { fired.add(n); console.error('  FAIL: ' + msg); failures += 1; };

const rewrite = (src, from, to, what) => {
  if (!src.includes(from)) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} not found in the source.`);
    console.error('The control is stale, so this run would have been green for the wrong reason.');
    process.exit(2);
  }
  return src.replace(from, to);
};

let src = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
if (CONTROL === 'flipfalse') {
  src = rewrite(src, `player1: "Wayne Rooney", player2: "Robin van Persie", sport: "Soccer", answer: true`,
    `player1: "Wayne Rooney", player2: "Robin van Persie", sport: "Soccer", answer: false`,
    'the Rooney and van Persie row');
}
if (CONTROL === 'wrongclub') {
  src = rewrite(src, `Both played for Manchester United from 2012-2015`,
    `Both played for Liverpool from 2012-2015`, "the Rooney and van Persie funFact");
}
if (CONTROL === 'dupe') {
  src = rewrite(src, `  // MEDIUM (difficulty 2), less obvious`,
    `  { player1: "Thierry Henry", player2: "Lionel Messi", sport: "Soccer", answer: true, funFact: "Both played for Barcelona from 2007-2010.", difficulty: 2 },\n  // MEDIUM (difficulty 2), less obvious`,
    'the medium difficulty comment');
}

const body = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
const rows = [];
for (const m of body.matchAll(/\{\s*player1:\s*"([^"]*)",\s*player2:\s*"([^"]*)",\s*sport:\s*"([^"]*)",\s*answer:\s*(true|false),\s*funFact:\s*"([^"]*)",\s*difficulty:\s*(\d+)\s*\}/g)) {
  rows.push({ p1: m[1], p2: m[2], sport: m[3], answer: m[4] === 'true', funFact: m[5], difficulty: Number(m[6]) });
}
console.log(`Parsed ${rows.length} pairs from ${FILE}`);
if (rows.length < 50) fail(-1, `parsed ${rows.length} pairs, fewer than the 50 the file is known to hold, so the parse is broken`);

// ---------------------------------------------------------------------------
console.log('\n--- 1. a pair is two different people, with a real sport and difficulty ---');
const SPORTS = new Set(['NBA', 'NFL', 'Soccer']);
for (const r of rows) {
  if (r.p1 === r.p2) fail(1, `${r.p1} is paired with himself`);
  if (!SPORTS.has(r.sport)) fail(1, `${r.p1} and ${r.p2} are filed under "${r.sport}"`);
  if (r.difficulty < 1 || r.difficulty > 3) fail(1, `${r.p1} and ${r.p2} have difficulty ${r.difficulty}`);
  if (!r.funFact.trim()) fail(1, `${r.p1} and ${r.p2} have no funFact, so a player is told the answer and nothing else`);
  /* The funFact has to agree with the answer it explains, and the only way
     to ask that without inventing false alarms is to look for the claim
     itself rather than for a keyword. A first draft demanded the word
     "never" in every false row and flagged two rows that explain themselves
     perfectly well without it ("they were always on opposite teams",
     "conference rivals their entire careers"). So: find the clauses that
     actually assert they played together, and check the sign. A false row may
     carry such a clause only if that clause is negated; a true row may not
     carry a negated one. A row that explains itself some other way is left
     alone, because it is not making the claim at all. */
  const TOGETHER = /(both (played|were)|played together|were teammates|became .{0,20}teammates|teammates (on|from|since|in))/i;
  const NEGATED = /\b(never|not|no longer|n't)\b/i;
  for (const clause of r.funFact.split(/[.;:!?]/)) {
    if (!TOGETHER.test(clause)) continue;
    const negated = NEGATED.test(clause);
    if (!r.answer && !negated) fail(1, `${r.p1} and ${r.p2} answer false, but the funFact states they played together: "${clause.trim()}"`);
    if (r.answer && negated) fail(1, `${r.p1} and ${r.p2} answer true, but the funFact denies they played together: "${clause.trim()}"`);
  }
}
console.log(`  ${rows.length} pairs are two people, in a known sport, with a funFact that agrees with the answer`);

// ---------------------------------------------------------------------------
console.log('\n--- 2. no pairing appears twice, in either order ---');
const seen = new Map();
for (const r of rows) {
  const k = [r.p1, r.p2].sort().join(' + ');
  if (seen.has(k)) fail(2, `${k} appears twice, so one puzzle can be drawn as two`);
  seen.set(k, r);
}
console.log(`  ${seen.size} distinct pairings`);

// ---------------------------------------------------------------------------
const soccer = rows.filter(r => r.sport === 'Soccer');
console.log(`\n--- 3. the ${soccer.length} soccer rows against soccer_player_club_stints ---`);
/* Match on name_folded, never on player_name. The table spells them
   "Zlatan Ibrahimović" and "Vinicius Junior" while this file spells them
   "Zlatan Ibrahimovic" and "Vinícius Jr.", and a first pass that joined on
   the raw name reported both as having zero career rows, which read like a
   hole in the database and was really the Round 315 spelling trap wearing a
   different hat. name_folded is the column the table carries for exactly
   this.

   The fold itself is LIFTED OUT OF THE SHIPPED EDGE FUNCTION rather than
   retyped, the same rule scripts/simSoccerStintNameFold.mjs states and for
   the same reason: a copy here would agree with itself while the deployed
   function said something else. Retyping it is how a first pass here decided
   Aubameyang was absent from the table, because name_folded flattens the
   hyphen to a space and the hand written copy did not. */
const GRID_FN = path.join(ROOT, 'supabase', 'functions', 'soccer-grid-validate', 'index.ts');
const liftFold = () => {
  const lines = fs.readFileSync(GRID_FN, 'utf8').split(/\r?\n/);
  const start = lines.findIndex(l => l.startsWith('const TRANSLIT'));
  const end = lines.findIndex((l, i) => i > start && l.includes('.trim();'));
  if (start < 0 || end < 0) {
    console.error(`could not lift the fold out of ${GRID_FN}; refusing to run rather than retype it`);
    process.exit(1);
  }
  const js = lines.slice(start, end + 1).join('\n')
    .replace(': Record<string, string>', '').replace('(s: string)', '(s)');
  return eval(`(() => { ${js}; return norm; })()`);
};
const shippedFold = liftFold();
/* name_folded flattens accents, case and punctuation but not name FORMS, so
   "Jr." against the table's "Junior" is spelled out here. */
const NAME_FORMS = { 'jr': 'junior' };
const fold = n => shippedFold(n).split(/\s+/).map(t => NAME_FORMS[t] || t).join(' ');

const supabase = supabaseFromClientTs(ROOT);
const wanted = [...new Set(soccer.flatMap(r => [r.p1, r.p2]))];
const { data: stints, error } = await supabase
  .from('soccer_player_club_stints')
  .select('player_name, name_folded, club, first_year, last_year')
  .in('name_folded', wanted.map(fold));
if (error) {
  console.error(`  FAIL: could not read soccer_player_club_stints: ${error.message}`);
  console.error('  This harness fails closed: an unreadable table is not a green run.');
  process.exit(1);
}
const byPlayer = new Map();
for (const s of stints) {
  const k = s.name_folded || fold(s.player_name);
  if (!byPlayer.has(k)) byPlayer.set(k, []);
  byPlayer.get(k).push(s);
}
/* A name this file uses that the table cannot find is not a coverage gap, it
   is a spelling mismatch that silently switches the check off for every pair
   that name appears in. It fails. */
const unresolved = wanted.filter(n => !byPlayer.has(fold(n)));
if (unresolved.length) {
  fail(3, `these names are in ${FILE} but match no row in soccer_player_club_stints even folded: ${unresolved.join(', ')}. Either the table spells them differently, in which case add the form, or they genuinely are not in it and every pair they appear in is unadjudicable on purpose.`);
} else {
  console.log(`  all ${wanted.length} soccer players named in the file resolve to career rows`);
}
const overlapsFor = (a, b) => {
  const A = byPlayer.get(fold(a)) || [], B = byPlayer.get(fold(b)) || [];
  const out = [];
  for (const x of A) for (const y of B) {
    if (x.club === y.club && x.first_year <= y.last_year && y.first_year <= x.last_year) {
      out.push({ club: x.club, from: Math.max(x.first_year, y.first_year), to: Math.min(x.last_year, y.last_year) });
    }
  }
  return out;
};

const adjudicated = [], unadjudicated = [];
for (const r of soccer) {
  const ov = overlapsFor(r.p1, r.p2);
  if (!ov.length) {
    const why = [r.p1, r.p2].map(n => `${n} has ${(byPlayer.get(fold(n)) || []).length} stint rows`).join(', ');
    unadjudicated.push({ r, why });
    continue;
  }
  adjudicated.push({ r, ov });
  if (!r.answer) {
    fail(3, `${r.p1} and ${r.p2} are told they were never teammates, but the career table has them both at ${ov.map(o => `${o.club} ${o.from}-${o.to}`).join(' and ')}`);
  }
}
console.log(`  adjudicated by the table: ${adjudicated.length} of ${soccer.length}`);
for (const { r, ov } of adjudicated) console.log(`    ${r.p1} + ${r.p2}: ${ov.map(o => `${o.club} ${o.from}-${o.to}`).join('; ')}`);
console.log(`  the table cannot settle ${unadjudicated.length}, which fails nothing and is a coverage gap, not a wrong row:`);
for (const { r, why } of unadjudicated) console.log(`    ${r.p1} + ${r.p2} (${why})`);
if (adjudicated.length < ADJUDICATED_FLOOR) {
  fail(3, `only ${adjudicated.length} soccer pairs could be adjudicated, against a floor of ${ADJUDICATED_FLOOR}. The table's coverage has dropped, so this section is checking less than it did and a green run would mean nothing.`);
}

// ---------------------------------------------------------------------------
console.log('\n--- 4. a confirmed pair\'s funFact names the club they actually shared ---');
const DROP = new Set(['fc', 'cf', 'sc', 'afc', 'ac', 'as', 'club', 'the']);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !DROP.has(t)).join(' ');
/* short forms a funFact is allowed to use for a club the table spells out */
const SHORT_FORMS = {
  'paris saint germain': ['psg'],
  'manchester united': ['man utd', 'man united'],
  'new york city': ['nycfc'],
  'barcelona': ['barca'],
};
let funFactChecked = 0;
for (const { r, ov } of adjudicated) {
  if (!r.answer) continue;
  funFactChecked += 1;
  const fact = norm(r.funFact);
  const named = ov.some(o => {
    const c = norm(o.club);
    return fact.includes(c) || (SHORT_FORMS[c] || []).some(sf => fact.includes(sf));
  });
  if (!named) {
    fail(4, `${r.p1} and ${r.p2} shared ${ov.map(o => o.club).join(' and ')}, but the funFact names none of them: "${r.funFact}"`);
  }
}
if (!funFactChecked) fail(4, 'no confirmed pair reached this section, so it checked nothing');
else console.log(`  ${funFactChecked} confirmed pairs name a club the table agrees they shared`);

// ---------------------------------------------------------------------------
const nonSoccer = rows.length - soccer.length;
console.log(`\nNot adjudicated by any table: the ${nonSoccer} NBA and NFL rows. There is no season by season team table for either sport in this database (nba_player_team_seasons is empty), so those rows have the structural checks above and no fact check. Do not read a green run as "all 50 verified".`);

/* The Supabase client leaves a handle open, and calling process.exit() on top
   of it crashes libuv on Windows with an assertion, which reports 127 and
   hides whatever this harness actually decided. So the verdict is set as an
   exit CODE and the loop is allowed to drain. */
const EXPECT = { flipfalse: 3, wrongclub: 4, dupe: 2 };
let code = 0;
if (CONTROL) {
  const want = EXPECT[CONTROL];
  if (want === undefined) { console.error(`Unknown TEAMMATES_CONTROL "${CONTROL}"`); code = 2; }
  else if (fired.has(want)) console.log(`\nCONTROL ${CONTROL}: section ${want} fired, as it must.`);
  else { console.error(`\nCONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`); code = 1; }
} else if (failures) {
  console.error(`\nsimTeammatesPairs: ${failures} failure(s)`);
  code = 1;
} else {
  console.log('\nsimTeammatesPairs: no row is contradicted by the career table, and every confirmed pair names the club it shared.');
}
process.exitCode = code;
