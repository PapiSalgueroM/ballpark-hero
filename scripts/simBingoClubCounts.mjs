/* Player Bingo club counts harness (Round 1571).

   The report (question_reports 83d2b79c, 2026-10-29): Tyler Morton played for
   Liverpool, Blackburn Rovers, Hull City and Lyon, so he fits "Played for 4+
   clubs", and the board said no. He is right. The cause is the data under the
   square: player_market_values holds no Defensive Midfield rows for 2023, 2024
   or 2025 (Round 669's finding), so the game saw Liverpool 2022 and Lyon 2026
   and nothing between. The same hole sits under every man whose table career
   starts at or after it.

   It runs the REAL fetchBingoData, bundled twice (BASE's playerBingo.ts read
   with git show, and the tree's), against scripts/lib/bingoFixtureClient.mjs,
   which answers the lib's own reads from the committed fixture
   scripts/data/bingoPoolHistory-2026-10-29.json (the lead's read of
   2026-10-29 12:37 EDT through the public REST API: 483 names, 3,692 rows).
   Nothing here reaches the network.

   Sections:
     0. the fixture: its sha256 is the lead's, BASE builds a pool of 100 or
        more from it, and Tyler Morton is in that pool (if he is not, the
        diagnosis cannot be replayed: stop and tell the lead).
     1. the diagnosis receipt and the candidate rule. BASE's club history for
        Morton is {liverpool fc, olympique lyon}: two clubs, refused on 4+.
        The hole class (the lead's ruling R1, critic correction 1): every pool
        man with no counted row in one or more of 2023, 2024 and 2025 whose
        counted rows begin in 2023 or later, plus every pool man on Round 669's
        write and existingChecked lists. The record's committed `candidates`
        must equal what the rule yields. Printed, not asserted: the classes
        this round does not judge (owed by number in the record).
     2. identity, BASE against the tree: the pool, seasonStats and clubYears
        (the honour tiles' input) byte equal; every man's club history is
        BASE's plus his record additions under the count rule (a "Club A /
        Club B" row is both clubs, the record's aliases are one club, its
        reserve sides are none), written again here from the record; every
        criterion's support is equal except the club squares, where every man
        who moves is judged in the record (each move printed); and every man
        whose club square verdict the count rule ALONE would move is judged.
     3. verdicts: Morton counts exactly 4 on the tree, fits 4+ and is not a
        One-club man; every judged man's count, 4+ and One-club verdicts on
        BASE and on the tree are the record's before and after; and the clubs
        the tree counts for him are exactly his sourced senior career (the
        table's clubs he played for plus his additions), no club short and
        none over. (--write-verdicts writes before and after; read them.)
     4. completeness, a ratchet: every candidate in exactly one of additions,
        agrees, partial and pending; no name twice; pending may only shrink
        (PENDING_MAX below is set to exactly the new count by every batch
        that judges men; a count below it is red too, so a batch cannot
        forget to lower it).
     5. sources: every added club and every agrees verdict carries two or more
        sources on different hosts, none crowd edited, each with a url, the
        date read (not after today, not before the fixture) and a quoted line;
        and every added club has one fromSeason and one toSeason, in order.
     6. derived: every judged man's typed tableClubs (the generator's refusal
        input) is BASE's club history for him on the fixture;
        src/data/bingoClubAdditions.json is the generator's output byte for
        byte, the generator refuses nothing (no club he already has under
        another spelling or slash part), and every added club uses the
        table's own spelling where the table spells it at all, and one the
        table never spells reads like no table spelling and no club tile
        (Man City for Manchester City: red).
     7. the fleet: 200 seeds of a seeded Math.random through generateBoard
        and buildDeck on BASE and on the tree. Every criterion's eligibility
        is equal, so the board's tile sequence must be byte identical on all
        200 seeds; a deck must be identical wherever every board tile kept its
        support (printed; expected near zero, since the career shape quota
        puts a club count tile on nearly every board); and no seed that keeps
        the per tile guarantee in the first cards on BASE loses it.
     8. the window answer (Round 1576). Every round keyed entry of the window
        class, whichever round in ROUNDS judged him, carries a `window` block: which overlay wrote his 2026 row (`hand` or
        `generated`), the club it wrote (`db`, the overlay's table spelling)
        and the generated row's `from` (null for a hand man), all equal to the
        overlay files; and `clubs`, his senior first team club or clubs of
        2025-26, each with two sources on two host families whose quoted
        lines reach into 2025-26 (a 25/26 season token, or quoted dates whose
        span overlaps 2025-07-01 to 2026-06-30). Each window club is one of
        his sourced career or added clubs and is counted by the tree; an added
        window club's fromSeason to toSeason covers 2025-26; a generated
        man's `from` is one of his window clubs. A man with no senior window
        club lists none and says why in `note`; a partial man may list none
        (his `reason` says why, `waitsOn` names the round that can fix him).
        A window man judged by an earlier round is printed, and the overlay's
        club must be in his tree history.
     9. against the previous closed head on this record (PREV): every entry
        of PREV's record is byte equal by name (except a name in AMENDED, which
        a later brief names), no PREV name gains a second entry, every entry
        new since PREV carries round ROUND, and the
        record's round, checkedOn, report, fixture, counting, hole candidates,
        PREV's rule keys and PREV's classes' round and rule are byte equal;
        a `prev` bundle (PREV's playerBingo.ts, clubCareerAdditions.ts and
        derived file) gives every pool man without a ROUND entry (or an
        AMENDED name) the tree's club history exactly; every support
        difference between prev and the tree is on a club square and is a
        ROUND or AMENDED man (printed as the list a
        What's New line may draw on: empty means no entry); and the 200
        seeded boards are byte identical prev against the tree, with decks
        equal wherever every tile kept its support and no guarantee lost.

   Negative controls (each asserts it changed something, or exits 3):
     BINGO_CLUBS_CONTROL=rule      the Round 669 lists dropped from the rule:
                                   the committed candidates disagree, red.
     BINGO_CLUBS_CONTROL=onesource one sourced entry loses a source: red.
     BINGO_CLUBS_CONTROL=pending   one judged man put back in pending, so
                                   pending grows past PENDING_MAX: red.
     BINGO_CLUBS_CONTROL=forgot    both ratchets read one more than their
                                   counts (a batch that forgot to lower
                                   them): section 4 red.
     BINGO_CLUBS_CONTROL=leak      one club added in memory to a man who is
                                   not in the record: red.
     BINGO_CLUBS_CONTROL=nomorton  Morton dropped from the derived file fed
                                   to the tree's lib: red.
     BINGO_CLUBS_CONTROL=noapply   the apply call line patched out of a copy
                                   of the tree's playerBingo.ts: red.
     BINGO_CLUBS_CONTROL=noreserve the reserve sides emptied in the derived
                                   file fed to the tree's lib: red.
     BINGO_CLUBS_CONTROL=nosplit   the mid season split patched out of a copy
                                   of clubCareerAdditions.ts: red.
     (No control for the aliases in the count: no fixture man holds two
     spellings of one club, so an alias moves nobody; the unit test covers
     the mapping. The generator's alias refusal has aliasdup below.)
     BINGO_CLUBS_CONTROL=drift     one extra draw before the tree's boards:
                                   section 7 red.
     BINGO_CLUBS_CONTROL=handedit  one byte of the derived file changed: red.
     BINGO_CLUBS_CONTROL=slashdup  critic correction 6: an addition of a club
                                   he holds only inside a spaced slash row
                                   (Pedro Porro: Girona FC, inside "Girona FC
                                   / Real Valladolid CF") planted in a copy of
                                   the record fed to the generator: section 6
                                   red ("the generator refuses").
     BINGO_CLUBS_CONTROL=aliasdup  the same with a declared alias spelling of
                                   a club he holds (Joshua Kimmich: FC Bayern
                                   Munich beside bayern munich): section 6 red.
     BINGO_CLUBS_CONTROL=tableclubs one judged man's typed tableClubs loses a
                                   club in memory: section 6 red.
     BINGO_CLUBS_CONTROL=noseason  one added club loses its toSeason in
                                   memory: section 5 red.
     FIXTURE_CONTROL=cap           the stub drops the range and the 1,000 row
                                   cap: at least one man's history changes.
   Round 1576's controls (the four section 8 ones take ROUND's first entry
   that fits, else the first window entry of any round, and exit 3 while the
   record holds none, and say so):
     BINGO_CLUBS_CONTROL=window    the generated half of the window rule
                                   dropped (Ward-Prowse leaves the class): the
                                   committed class and the owed pin disagree,
                                   section 1 red.
     BINGO_CLUBS_CONTROL=unjudged  one pool man who is on no list added to the
                                   owed names: UNJUDGED passes its ratchet,
                                   section 4 red.
     BINGO_CLUBS_CONTROL=nowindow  the first ROUND entry's window block
                                   deleted in memory: section 8 red.
     BINGO_CLUBS_CONTROL=windowdrop the first ROUND addition whose window club
                                   is an added club loses that club in the
                                   derived file fed to the tree's lib: section
                                   8 red ("not counted"; 2 and 3 may redden).
     BINGO_CLUBS_CONTROL=windowseason one window quote swapped for a 2022-23
                                   transfer line: section 8 red.
     BINGO_CLUBS_CONTROL=windowdb  the first ROUND entry's window.db edited:
                                   section 8 red.
     BINGO_CLUBS_CONTROL=bornone   ROUND's first born date (else any round
                                   keyed entry's) keeps one source in memory:
                                   section 5 red (onesource lands on a Round
                                   1571 club and never reached this check).
     BINGO_CLUBS_CONTROL=shortname the added "Manchester City" written "Man
                                   City" in the derived copy section 6's
                                   spelling checks read: section 6 red (a new
                                   key that reads like a table spelling or a
                                   club tile).
     BINGO_CLUBS_CONTROL=touchprev one PREV entry's notes edited in memory:
                                   section 9 red. (Named for PREV, not for a
                                   round, so it moves with PREV.)
     BINGO_CLUBS_CONTROL=prevleak  one club added in memory to the tree's
                                   history of a pool man with no ROUND entry:
                                   section 9 red.
     drift (above) must redden section 9 as well as 7.
   Exit 0 green, 1 red (or a control that fired), 2 could not run, 3 a control
   that changed nothing.

   What a later round on this record must know (the lead's Bingo ruling of
   2026-10-29: one record, one generator, one derived file, one ratchet
   design, rounds strictly serial 1576, 1577, 1588):
     BASE is pinned to 692590145 for good. Section 2 fails on ANY later change
     to the pool, seasonStats, clubYears or a non club tile's support, by
     design. Round 1576 edited no src file, so BASE and the honours pin stand.
     The next round that edits src/lib/playerBingo.ts (1577, or the other
     lane's BS-mix-4, whichever comes first) moves section 2 in that round
     and says so; it never moves BASE (the bundler takes the derived file and
     clubCareerAdditions.ts from the tree, so a moved BASE would carry every
     addition).
     PREV and ROUNDS: every round on this record moves PREV to the last closed
     head and appends its own number to ROUNDS (so ROUND becomes its number)
     in its own commit, with both legs of section 9 shown, and lists in
     AMENDED by name any earlier entry its brief amends (printed; never an
     unnamed edit; an amended man may move against PREV in section 9).
     Sections 4, 5 and 8 check every round keyed entry by its own round and
     class, so the earlier rounds' men stay covered: nothing else in this
     file changes when ROUND moves. Every entry new since PREV must carry
     round ROUND (section 9). Proven review 2026-10-30: ROUNDS [1576, 9999]
     with PREV at this round's head stays green with section 8 still holding
     the 23 Round 1576 men (rc result r1576-fix-a, line moved).
     A new class goes under record.classes (its key, round, rule, owedBy,
     candidates), its rule beside the window rule in section 1, its harness
     section at the next free number; never renumber an earlier section.
     The two ratchets: PENDING_MAX (pending) and UNJUDGED_MAX (pending plus
     every owed row, distinct names, suffixes stripped) only fall, and each
     must EQUAL its count (review 2026-10-30), so a batch that forgets to
     lower one is red. A class
     opening step may raise them by exactly its new names, printed; nothing
     else raises them. Round 1576 opened the window class by moving its 98
     unjudged men from owed into pending: pending 0 to 98, unjudged 141 to
     139.
     The window class is pinned to the two Round 1576 owed rows of the record
     at WINDOW_OWED_AT. The rule runs on BASE's lib, but bingoFixtureBundle
     resolves whoAmI.ts and playerSearch.ts against the tree, so a later
     isSameMan change (Round 1589) can move the class: then rerun
     --write-candidates, print the names that moved, and put any new name in
     a new class under the lead's ruling; never edit the pin silently.
     The identity guards of the bind (role, nationality, birth year window,
     an ambiguous match refused) are caught only by the two unit files
     src/test/clubCareerAdditions.test.ts and
     src/test/playerBingoClubCounts.test.ts: the fixture holds no namesake
     near an addition, so this harness cannot see a guard deleted (review
     2026-10-29, mutations norole, nonat, loosenby, firstmatch). Keep both
     files in every gate beside this harness.

   Run: node scripts/simBingoClubCounts.mjs
        node scripts/simBingoClubCounts.mjs --write-candidates   (rewrites the
        record's candidates, every class's candidates, pending and owed, then
        stops: commit the result)
        node scripts/simBingoClubCounts.mjs --write-verdicts     (writes every
        judged man's verdict before and after, then stops: read them)
*/
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBingoLib, fixtureRows } from './lib/bingoFixtureBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '692590145'; // origin/main when the round began (Release BS live plus board commits)
const FIXTURE = 'scripts/data/bingoPoolHistory-2026-10-29.json';
const FIXTURE_SHA256 = '8c8f8fc276a7dd696e586b97148ea1815712e64c619665750b5d45a9efe353e1';
const RECORD = 'scripts/data/bingoClubAdditions-2026-10.json';
const HOLE_YEARS = [2023, 2024, 2025];
const PENDING_MAX = 75;
const UNJUDGED_MAX = 116;
const PREV = '32baab916'; // the previous closed head on this record (Round 1571's)
/* Every round that has written round keyed entries on this record, in the order they closed. A
   later round appends its own number; ROUND (the last) is the round whose men section 9 lets move
   against PREV. Sections 4, 5 and 8 check every round keyed entry by its own round and class, so an
   earlier round's men stay covered after ROUND moves on. */
const ROUNDS = [1576];
const ROUND = ROUNDS[ROUNDS.length - 1];
const AMENDED = []; // PREV entries this round's brief amends, by name (none)
const WINDOW_OWED_AT = '32baab916'; // the record whose two Round 1576 owed rows define the window class
const WINDOW_SEASON = { from: '2025-07-01', to: '2026-06-30' };
const BANNED_HOSTS = /(^|\.)(wikipedia\.org|wikidata\.org|fandom\.com|thesportsdb\.com|wikiwand\.com)$/;
const CONTROL = process.env.BINGO_CLUBS_CONTROL || '';
const FIXTURE_CONTROL = process.env.FIXTURE_CONTROL || '';
const WRITE = process.argv.includes('--write-candidates');

let failures = 0;
let section = '';
const bySection = {};
const fail = m => { failures += 1; bySection[section] = (bySection[section] ?? 0) + 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error('COULD NOT RUN: ' + m); process.exit(2); };
let controlChanged = 0;
const changed = what => { controlChanged += 1; console.log(`   control changed: ${what}`); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simBingoClubCounts-'));
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');

/* ---------------------------------------------------------------- 0 */
section = '0';
console.log('0) The fixture');
// The lead's file has LF endings; a Windows checkout with autocrlf turns them into CRLF, so the hash
// is taken on LF text (the committed blob is the lead's bytes exactly).
const fixtureBytes = Buffer.from(fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8').replaceAll('\r\n', '\n'), 'utf8');
if (sha(fixtureBytes) !== FIXTURE_SHA256) fail(`${FIXTURE} sha256 is ${sha(fixtureBytes)}, the lead's read is ${FIXTURE_SHA256}`);
const rows = JSON.parse(fixtureBytes.toString('utf8')).rows;
let baseSource;
try {
  baseSource = execSync(`git show ${BASE}:src/lib/playerBingo.ts`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
} catch (error) {
  abort(`git show ${BASE}:src/lib/playerBingo.ts failed (${error.message.split('\n')[0]})`);
}
const base = await loadBingoLib({ root: ROOT, libSource: baseSource, label: 'base', tmp });
async function load(lib, opts = {}) {
  globalThis.__bingoFixture = { rows, ...opts };
  const data = await lib.fetchBingoData();
  if (!data) abort('fetchBingoData returned null on the fixture');
  return { data, served: globalThis.__bingoFixture.maxRows ?? 0, page: globalThis.__bingoFixture.maxPageRows ?? 0, requests: globalThis.__bingoFixture.requests ?? 0 };
}
const baseRun = await load(base);
const baseData = baseRun.data;
console.log(`   BASE ${BASE}: pool ${baseData.pool.length} from ${new Set(rows.map(r => r.player_name)).size} names and ${rows.length} rows, ${baseRun.requests} requests, largest response ${baseRun.served} rows, largest history page ${baseRun.page} rows`);
if (baseData.pool.length < 100) fail(`the fixture pool holds ${baseData.pool.length} men, under 100`);
const mortonRef = baseData.pool.find(p => p.name === 'Tyler Morton');
if (!mortonRef) abort('Tyler Morton is not in the fixture pool, so the report cannot be replayed: stop and tell the lead (critic advice 18)');
if (FIXTURE_CONTROL === 'cap') {
  const capped = (await load(base, { ignorePaging: true })).data;
  const moved = baseData.pool.filter(p => JSON.stringify(capped.seasonStats.get(p.name)) !== JSON.stringify(baseData.seasonStats.get(p.name))).map(p => p.name);
  if (moved.length) {
    console.log(`   FIXTURE_CONTROL=cap FIRED: ${moved.length} men's histories change with paging off (${moved.slice(0, 5).join(', ')})`);
    process.exit(1);
  }
  console.log(`   FIXTURE_CONTROL=cap did not fire: no history page reached the 1,000 row cap (largest ${baseRun.page}), so nobody exceeds a page and paging is not exercised by this fixture`);
  process.exit(3);
}

/* ---------------------------------------------------------------- 1 */
section = '1';
console.log('1) The diagnosis receipt and the candidate rule');
const crit = (data, id) => base.buildCriteria(data).find(c => c.id === id);
const mortonBase = [...(baseData.clubHistory.get('Tyler Morton') ?? [])].sort();
const fourPlusBase = crit(baseData, 'journeyman-4-clubs');
const oneClubBase = crit(baseData, 'one-club-man');
console.log(`   BASE Tyler Morton (${mortonRef.club}, ${mortonRef.year}, ${mortonRef.position}): clubs [${mortonBase.join(', ')}], count ${mortonBase.length}, 4+ ${fourPlusBase.test(mortonRef, baseData)}, one club ${oneClubBase.test(mortonRef, baseData)}`);
if (JSON.stringify(mortonBase) !== JSON.stringify(['liverpool fc', 'olympique lyon'])) fail(`BASE gives Morton [${mortonBase.join(', ')}], the lead's read C gives Liverpool FC 2022 and Olympique Lyon 2026`);
if (fourPlusBase.test(mortonRef, baseData)) fail('BASE accepts Morton on Played for 4+ clubs, which is not the refusal the report describes');

const record = JSON.parse(read(RECORD));
const norm = base.normalizeName;
const dm669 = JSON.parse(read('scripts/data/defensiveMidfield2026.json'));
const lists669 = new Set([...(dm669.write ?? []), ...(dm669.existingChecked ?? [])].map(e => norm(e.name)));

/* Counted years and first counted row per pool man, from BASE's clubYears:
   the same rows the club squares count (identity guard and academy filter
   applied by the lib itself, never reimplemented here). */
function countedYears(data, name) {
  return new Set((data.clubYears.get(name) ?? []).map(e => e.year));
}
function holeClass(data, { with669 = true } = {}) {
  const out = [];
  for (const p of data.pool) {
    const years = countedYears(data, p.name);
    const first = years.size ? Math.min(...years) : p.year;
    const missing = HOLE_YEARS.some(y => !years.has(y));
    if ((missing && first >= HOLE_YEARS[0]) || (with669 && lists669.has(norm(p.name)))) out.push(p.name);
  }
  return out.sort();
}
let candidates = holeClass(baseData);
if (CONTROL === 'rule') {
  const without = holeClass(baseData, { with669: false });
  if (without.length !== candidates.length) changed(`the Round 669 lists dropped from the rule: ${candidates.length} candidates become ${without.length}`);
  candidates = without;
}
const from669 = candidates.filter(n => lists669.has(norm(n))).length;
console.log(`   hole class: ${candidates.length} candidates (${from669} on Round 669's lists, ${candidates.length - from669} more whose counted rows begin at or after 2023 with a hole year missing)`);
if (!candidates.includes('Tyler Morton')) fail('Tyler Morton is not a candidate under the rule');

if (WRITE) record.candidates = candidates;
if (JSON.stringify(record.candidates) !== JSON.stringify(candidates)) {
  const missingNames = candidates.filter(n => !record.candidates.includes(n));
  const extra = record.candidates.filter(n => !candidates.includes(n));
  fail(`the record's committed candidates differ from the rule (rule only: ${missingNames.slice(0, 6).join(', ') || 'none'}; record only: ${extra.slice(0, 6).join(', ') || 'none'})`);
}

/* The window class (Round 1576): Round 1571's own owed computation lifted into a rule. Every pool
   man on the hand overlay who is not a hole candidate, plus every generated overlay row whose pool
   man is not a hole candidate and whose `from` club key is in none of his counted clubYears keys
   (a row with `from` null wrote over no club and is skipped). Plain names; the classes map is the
   one shape every later class extends (the lead's ruling B2). */
const { TRANSFER_OVERLAY_2026_HAND, WINDOW_2026_ADDITIONS } = await import(new URL('./transferOverlay2026.mjs', import.meta.url).href);
const poolByNorm = new Map(baseData.pool.map(p => [norm(p.name), p]));
const holeSet = new Set(candidates);
function windowClass(data, { generated = true } = {}) {
  const out = new Set();
  for (const e of TRANSFER_OVERLAY_2026_HAND) {
    const p = poolByNorm.get(norm(e.name));
    if (p && !holeSet.has(p.name)) out.add(p.name);
  }
  if (generated) {
    for (const e of WINDOW_2026_ADDITIONS) {
      const p = poolByNorm.get(norm(e.name));
      if (!p || holeSet.has(p.name) || !e.from) continue;
      const fromKey = base.clubKey(e.from);
      const counted = new Set([...(data.clubYears.get(p.name) ?? [])].map(c => c.key));
      if (fromKey && !counted.has(fromKey)) out.add(p.name);
    }
  }
  return [...out].sort();
}
let windowCandidates = windowClass(baseData);
if (CONTROL === 'window') {
  const handOnly = windowClass(baseData, { generated: false });
  if (handOnly.length !== windowCandidates.length) changed(`the generated half of the window rule dropped: ${windowCandidates.length} window candidates become ${handOnly.length}`);
  windowCandidates = handOnly;
}
const classes = { window: windowCandidates };
const allCandidates = [...new Set([...candidates, ...Object.values(classes).flat()])];
const candidateSet = new Set(allCandidates);
const handOf = new Map();
for (const e of TRANSFER_OVERLAY_2026_HAND) {
  const p = poolByNorm.get(norm(e.name));
  if (p) handOf.set(p.name, [...(handOf.get(p.name) ?? []), e]);
}
const generatedOf = new Map();
for (const e of WINDOW_2026_ADDITIONS) {
  const p = poolByNorm.get(norm(e.name));
  if (p) generatedOf.set(p.name, [...(generatedOf.get(p.name) ?? []), e]);
}
const fixtureNames = new Set(rows.map(r => (r.player_name ?? '').trim()));
const generatedLost = windowCandidates.filter(n => !handOf.has(n));
console.log(`   window class: ${windowCandidates.length} candidates (${windowCandidates.length - generatedLost.length} on the hand overlay; ${generatedLost.length} from generated rows whose from club he has no counted row at: ${generatedLost.map(n => `${n} (${generatedOf.get(n).map(e => e.from).join(', ')})`).join('; ')})`);
console.log(`   printed, not asserted: generated rows with from null (wrote over no club): ${WINDOW_2026_ADDITIONS.filter(e => !e.from).map(e => `${e.name}${fixtureNames.has(e.name) ? ' (a fixture name)' : ''}`).join(', ')}`);
const sameDb = WINDOW_2026_ADDITIONS.filter(e => e.from && e.from === e.db);
console.log(`   printed, not asserted: generated rows with from equal to db (changed nothing): ${sameDb.length}${sameDb.some(e => fixtureNames.has(e.name)) ? ', fixture names among them: ' + sameDb.filter(e => fixtureNames.has(e.name)).map(e => e.name).join(', ') : ', none a fixture name'}`);
console.log(`   printed, not asserted: hand overlay names in the fixture but outside BASE's pool (the lead's live pass): ${[...new Set(TRANSFER_OVERLAY_2026_HAND.map(e => e.name))].filter(n => fixtureNames.has(n) && !poolByNorm.has(norm(n))).join(', ') || 'none'}`);
for (const [n, list] of handOf) if (candidateSet.has(n) && new Set(list.map(e => e.db)).size > 1) fail(`${n} has two hand overlay rows with different clubs (${list.map(e => e.db).join(', ')})`);
for (const n of windowCandidates) if (handOf.has(n) && generatedOf.has(n)) fail(`${n} is on the hand overlay and has a generated row: section 8 cannot say which overlay wrote his row`);
/* The pin: the class is exactly what Round 1571 owed this round (its two Round 1576 rows at
   WINDOW_OWED_AT, suffixes stripped), read with git show, never typed here. */
let owedAtRecord;
try {
  owedAtRecord = JSON.parse(execSync(`git show ${WINDOW_OWED_AT}:${RECORD}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
} catch (error) {
  abort(`git show ${WINDOW_OWED_AT}:${RECORD} failed (${error.message.split('\n')[0]})`);
}
const stripSuffix = n => n.replace(/ \(.*\)$/, '');
const pinned = [...new Set(owedAtRecord.owed.filter(o => o.round === 1576).flatMap(o => o.names).map(stripSuffix))].sort();
if (JSON.stringify(windowCandidates) !== JSON.stringify(pinned)) fail(`the window rule (${windowCandidates.length}) is not the ${pinned.length} names Round 1571 owed to Round 1576 at ${WINDOW_OWED_AT} (rule only: ${windowCandidates.filter(n => !pinned.includes(n)).join(', ') || 'none'}; pin only: ${pinned.filter(n => !windowCandidates.includes(n)).join(', ') || 'none'})`);
const judgedNames = new Set([...record.additions, ...record.agrees, ...record.partial].map(e => e.name));
if (WRITE) {
  record.classes = { ...(record.classes ?? {}) };
  for (const [key, names] of Object.entries(classes)) record.classes[key] = { ...(record.classes[key] ?? { round: ROUND }), candidates: names };
  record.pending = allCandidates.filter(n => !judgedNames.has(n));
}
for (const [key, names] of Object.entries(classes)) {
  const committed = record.classes?.[key];
  if (!committed) { fail(`the record has no classes.${key}`); continue; }
  if (JSON.stringify(committed.candidates) !== JSON.stringify(names)) fail(`the record's classes.${key}.candidates differ from the rule (rule only: ${names.filter(n => !(committed.candidates ?? []).includes(n)).slice(0, 6).join(', ') || 'none'}; record only: ${(committed.candidates ?? []).filter(n => !names.includes(n)).slice(0, 6).join(', ') || 'none'})`);
  if (typeof committed.rule !== 'string' || committed.rule !== record.rule?.[key]) fail(`classes.${key}.rule must be the record's rule.${key} sentence`);
}
if (record.classes?.window && record.classes.window.round !== 1576) fail(`classes.window.round is ${record.classes.window.round}, not 1576`);
for (const key of Object.keys(record.classes ?? {})) if (!(key in classes)) fail(`the record carries classes.${key}, which no rule in section 1 computes`);

/* Printed, not asserted: the classes this round does not judge (the lead's
   ruling R1 numbers them). The record's `owed` carries each list by round.
   Since Round 1576 the owed lists skip every candidate of every class and
   every judged man (a list of men nobody has judged). */
const ownRows = new Map();
for (const p of baseData.pool) ownRows.set(p.name, rows.filter(r => (r.player_name ?? '').trim() === p.name && base.isSameMan(p, { age: r.age, year: r.year })));
const gapOutside = [];
const academySeniors = [];
const lateStarters = [];
for (const p of baseData.pool) {
  if (candidateSet.has(p.name) || judgedNames.has(p.name)) continue;
  const years = countedYears(baseData, p.name);
  const first = years.size ? Math.min(...years) : p.year;
  if (HOLE_YEARS.some(y => !years.has(y) && y > first)) gapOutside.push(p.name);
  const own = ownRows.get(p.name);
  const counted = new Set(baseData.clubHistory.get(p.name) ?? []);
  const academyClubs = [...new Set(own.filter(r => base.isAcademyRow({ age: r.age, value: r.market_value_usd })).map(r => base.clubKey(r.club ?? '')).filter(k => k && !counted.has(k)))];
  if (academyClubs.length) academySeniors.push(`${p.name} (${academyClubs.join(', ')})`);
  const firstRow = own.filter(r => !base.isAcademyRow({ age: r.age, value: r.market_value_usd }) && r.year === first)[0];
  if (firstRow && Number(firstRow.age) >= 22) lateStarters.push(`${p.name} (${first}, ${firstRow.age})`);
}
console.log(`   owed, C1 outside the hole (a 2023 to 2025 year missing after his first counted row, not a candidate): ${gapOutside.length}: ${gapOutside.join(', ')}`);
console.log(`   owed, academy filtered rows at a club he has no counted row at (critic advice 10): ${academySeniors.length}`);
for (let i = 0; i < academySeniors.length; i += 6) console.log('     ' + academySeniors.slice(i, i + 6).join('; '));
console.log(`   owed, C3 late starters outside the hole (first counted row at a listed age of 22 or more): ${lateStarters.length}`);
for (let i = 0; i < lateStarters.length; i += 8) console.log('     ' + lateStarters.slice(i, i + 8).join('; '));
const owedNow = [
  { round: null, class: 'C1 outside the hole: a 2023 to 2025 year missing after a first counted row before 2023 (no round numbered by the lead; suggested 1577)', names: gapOutside },
  { round: 1577, class: 'academy filtered rows at a club with no counted row (critic advice 10)', names: academySeniors },
  { round: 1577, class: 'C3 late starters outside the hole: first counted row at a listed age of 22 or more', names: lateStarters },
];
if (WRITE) {
  record.owed = owedNow;
  fs.writeFileSync(path.join(ROOT, RECORD), JSON.stringify(record, null, 2) + '\n');
  console.log(`   --write-candidates: wrote ${candidates.length} hole candidates, ${Object.entries(classes).map(([k, v]) => `${v.length} ${k}`).join(', ')} class candidates, ${record.pending.length} pending and ${owedNow.length} owed rows to ${RECORD}; stopping here (rerun without the flag for the proof)`);
  process.exit(failures ? 1 : 0);
}
if (JSON.stringify(record.owed) !== JSON.stringify(owedNow)) fail('the record\'s owed lists differ from what the fixture yields (rerun with --write-candidates and commit)');

/* ---------------------------------------------------------------- 2 */
section = '2';
console.log('2) Identity, BASE against the tree');
const APPLY_ANCHOR = '    applyClubAdditions(clubHistory, pool, clubAdditions.add as ClubAddition[],';
let headSource = read('src/lib/playerBingo.ts');
const headExtra = {};
if (CONTROL === 'noapply') {
  const lines = headSource.split('\n');
  const at = lines.findIndex(l => l.startsWith(APPLY_ANCHOR));
  if (at < 0) abort('=noapply: the apply call line is not in src/lib/playerBingo.ts');
  lines.splice(at, 1);
  headSource = lines.join('\n');
  changed('the apply call patched out of a copy of playerBingo.ts');
}
if (CONTROL === 'nomorton') {
  const json = JSON.parse(read('src/data/bingoClubAdditions.json'));
  const kept = json.add.filter(a => a.n !== 'Tyler Morton');
  if (kept.length === json.add.length) abort('=nomorton: Tyler Morton is not in src/data/bingoClubAdditions.json');
  headExtra['@/data/bingoClubAdditions.json'] = JSON.stringify({ ...json, add: kept });
  changed('Tyler Morton removed from the derived file');
}
if (CONTROL === 'noreserve') {
  const json = JSON.parse(read('src/data/bingoClubAdditions.json'));
  if (!json.rules?.reserves?.length) abort('=noreserve: the derived file lists no reserve sides');
  headExtra['@/data/bingoClubAdditions.json'] = JSON.stringify({ ...json, rules: { ...json.rules, reserves: [] } });
  changed('the reserve sides emptied in the derived file');
}
if (CONTROL === 'nosplit') {
  const anchor = "return value.split(' / ')";
  const module = read('src/lib/clubCareerAdditions.ts');
  if (!module.includes(anchor)) abort('=nosplit: the split line is not in src/lib/clubCareerAdditions.ts');
  headExtra['@/lib/clubCareerAdditions'] = module.replace(anchor, 'return [value]');
  changed('the mid season split patched out of a copy of clubCareerAdditions.ts');
}
const windowClubName = c => (typeof c === 'string' ? c : c?.club);
let windowDropped = null;
if (CONTROL === 'windowdrop') {
  const json = JSON.parse(read('src/data/bingoClubAdditions.json'));
  /* ROUND's additions first, then any earlier round keyed addition (section 8 covers them all). */
  for (const e of [...record.additions.filter(x => x.round === ROUND), ...record.additions.filter(x => x.round !== undefined && x.round !== ROUND)]) {
    const added = new Set((e.clubs ?? []).map(c => c.club));
    const club = (e.window?.clubs ?? []).map(windowClubName).find(c => added.has(c));
    const row = json.add.find(a => a.n === e.name);
    if (!club || !row?.clubs.includes(club)) continue;
    headExtra['@/data/bingoClubAdditions.json'] = JSON.stringify({ ...json, add: json.add.map(a => (a === row ? { ...a, clubs: a.clubs.filter(c => c !== club) } : a)) });
    windowDropped = { name: e.name, club };
    changed(`${e.name}'s added window club ${club} removed from the derived file fed to the tree's lib`);
    break;
  }
  if (!windowDropped) console.log('   =windowdrop: no round keyed addition has an added window club yet, so it changes nothing (exit 3 by design until one exists)');
}
const head = await loadBingoLib({ root: ROOT, libSource: headSource, label: 'head', tmp, extraSources: headExtra });
const headData = (await load(head)).data;
const derivedNow = JSON.parse(read('src/data/bingoClubAdditions.json'));
const addedBy = new Map(derivedNow.add.map(a => [a.n, a.clubs.map(c => base.clubKey(c))]));
const judged = new Set([...record.additions, ...record.agrees].map(e => e.name));
/* The count rule, written again here from the record (not imported from the module under test):
   split on the spaced slash, drop the record's reserve sides, map its aliases. */
const reserveKeys = new Set((record.counting?.reserves ?? []).map(r => r.key));
const aliasOf = new Map((record.counting?.aliases ?? []).map(a => [a.from, a.to]));
const countRule = keys => {
  const out = new Set();
  for (const key of keys) {
    for (const part of key.split(' / ')) {
      const k = base.clubKey(part);
      if (k && !reserveKeys.has(k)) out.add(aliasOf.get(k) ?? k);
    }
  }
  return out;
};
if (CONTROL === 'leak') {
  const victim = headData.pool.find(p => !addedBy.has(p.name));
  headData.clubHistory.get(victim.name)?.add('qzx leaked club');
  changed(`one added club applied to ${victim.name}, who is not in the record`);
}
const asJson = map => JSON.stringify([...map.entries()].map(([k, v]) => [k, v instanceof Set ? [...v].sort() : v]).sort());
if (JSON.stringify(headData.pool) !== JSON.stringify(baseData.pool)) fail('the pool differs from BASE (every field, in order)');
if (asJson(headData.seasonStats) !== asJson(baseData.seasonStats)) fail('seasonStats differ from BASE');
if (asJson(headData.clubYears) !== asJson(baseData.clubYears)) fail('clubYears (the honour tiles\' input) differ from BASE');
let movedHistories = 0;
for (const p of baseData.pool) {
  const raw = new Set(baseData.clubHistory.get(p.name) ?? []);
  for (const k of addedBy.get(p.name) ?? []) raw.add(k);
  const want = [...countRule(raw)].sort();
  const got = [...(headData.clubHistory.get(p.name) ?? [])].sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${p.name}: club history [${got.join(', ')}] is not BASE's plus his record additions under the count rule [${want.join(', ')}]`);
  if (JSON.stringify(got) !== JSON.stringify([...(baseData.clubHistory.get(p.name) ?? [])].sort())) movedHistories += 1;
}
const CLUB_SQUARES = id => id === 'one-club-man' || id === 'journeyman-4-clubs' || id.startsWith('club-');
const baseCriteria = base.buildCriteria(baseData);
const headCriteria = head.buildCriteria(headData);
const verdictMoves = [];
if (JSON.stringify(baseCriteria.map(c => c.id)) !== JSON.stringify(headCriteria.map(c => c.id))) fail('the criterion list differs from BASE');
for (const hc of headCriteria) {
  const bc = baseCriteria.find(c => c.id === hc.id);
  if (!bc) continue;
  const gained = hc.support.filter(n => !bc.support.includes(n));
  const lost = bc.support.filter(n => !hc.support.includes(n));
  if (!gained.length && !lost.length) continue;
  if (!CLUB_SQUARES(hc.id)) fail(`${hc.id} support moved though it is not a club square (gained ${gained.join(', ')}; lost ${lost.join(', ')})`);
  for (const n of [...gained, ...lost]) {
    if (!judged.has(n)) fail(`${hc.id}: ${n} moved but is not judged in the record (additions or agrees)`);
    verdictMoves.push(`${n} ${gained.includes(n) ? 'now fits' : 'no longer fits'} ${hc.label} (support ${bc.support.length} -> ${hc.support.length})`);
  }
}
console.log(`   pool, seasonStats and clubYears equal to BASE; ${movedHistories} club histories changed; ${verdictMoves.length} club square verdicts moved`);
for (const m of verdictMoves) console.log('     ' + m);
/* The count rule alone (BASE's rows, no additions): every man whose club square verdict it would
   move must be judged in the record, so the split, the aliases and the reserve sides never move a
   verdict nobody checked. */
const ruledData = { ...baseData, clubHistory: new Map([...baseData.clubHistory].map(([n, s]) => [n, countRule(s)])) };
const ruledCriteria = base.buildCriteria(ruledData);
const ruleMovers = new Set();
for (const rc of ruledCriteria) {
  if (!CLUB_SQUARES(rc.id)) continue;
  const bc = baseCriteria.find(c => c.id === rc.id);
  for (const n of [...rc.support.filter(x => !bc.support.includes(x)), ...bc.support.filter(x => !rc.support.includes(x))]) ruleMovers.add(`${n}|${rc.label}`);
}
const ruleMoverNames = new Set([...ruleMovers].map(m => m.split('|')[0]));
for (const n of ruleMoverNames) if (!judged.has(n)) fail(`the count rule alone moves ${n} (${[...ruleMovers].filter(m => m.startsWith(n + '|')).map(m => m.split('|')[1]).join(', ')}) and he is not judged`);
console.log(`   the count rule alone (split, aliases, reserve sides) moves ${ruleMoverNames.size} men's club square verdicts: ${[...ruleMovers].map(m => m.replace('|', ': ')).join('; ')}`);
const support = (criteria, id) => criteria.find(c => c.id === id)?.support.length;
console.log(`   support on the fixture: One-club man ${support(baseCriteria, 'one-club-man')} -> ${support(headCriteria, 'one-club-man')}, Played for 4+ clubs ${support(baseCriteria, 'journeyman-4-clubs')} -> ${support(headCriteria, 'journeyman-4-clubs')}`);

/* ---------------------------------------------------------------- 3 */
section = '3';
console.log('3) Verdicts');
const verdictOf = (lib, data, name) => {
  const p = data.pool.find(x => x.name === name);
  if (!p) return null;
  const criteria = lib.buildCriteria(data);
  return {
    count: data.clubHistory.get(name)?.size ?? 0,
    fourPlus: criteria.find(c => c.id === 'journeyman-4-clubs').test(p, data),
    oneClub: criteria.find(c => c.id === 'one-club-man').test(p, data),
  };
};
const mortonHead = verdictOf(head, headData, 'Tyler Morton');
console.log(`   tree Tyler Morton: [${[...(headData.clubHistory.get('Tyler Morton') ?? [])].join(', ')}], count ${mortonHead?.count}, 4+ ${mortonHead?.fourPlus}, one club ${mortonHead?.oneClub}`);
if (!mortonHead || mortonHead.count !== 4 || !mortonHead.fourPlus || mortonHead.oneClub) fail('Tyler Morton must count exactly 4 clubs on the tree, fit Played for 4+ clubs and not be a One-club man');
const WRITE_VERDICTS = process.argv.includes('--write-verdicts');
let careerChecked = 0;
for (const e of [...record.additions, ...record.agrees]) {
  const b = verdictOf(base, baseData, e.name);
  const h = verdictOf(head, headData, e.name);
  if (WRITE_VERDICTS && !CONTROL) {
    if (JSON.stringify(e.verdict) !== JSON.stringify({ before: b, after: h })) console.log(`   --write-verdicts: ${e.name} ${JSON.stringify(b)} -> ${JSON.stringify(h)}`);
    e.verdict = { before: b, after: h };
  }
  if (!e.verdict) { fail(`${e.name} has no verdict in the record`); continue; }
  if (JSON.stringify(b) !== JSON.stringify(e.verdict.before)) fail(`${e.name}: BASE gives ${JSON.stringify(b)}, the record's before says ${JSON.stringify(e.verdict.before)}`);
  if (JSON.stringify(h) !== JSON.stringify(e.verdict.after)) fail(`${e.name}: the tree gives ${JSON.stringify(h)}, the record's after says ${JSON.stringify(e.verdict.after)}`);
  /* The whole senior career the sources give (the table's clubs he played for, plus the additions)
     is exactly what the tree counts: no club short, none over. */
  const senior = [...(e.career ?? []), ...(e.clubs ?? [])].map(c => base.clubKey(c.club)).map(k => aliasOf.get(k) ?? k);
  if (!e.career) { fail(`${e.name} carries no sourced career`); continue; }
  const got = [...(headData.clubHistory.get(e.name) ?? [])].sort();
  if (JSON.stringify(got) !== JSON.stringify([...new Set(senior)].sort())) fail(`${e.name}: the tree counts [${got.join(', ')}], his sourced senior career is [${[...new Set(senior)].sort().join(', ')}]`);
  else careerChecked += 1;
}
if (WRITE_VERDICTS && !CONTROL) {
  fs.writeFileSync(path.join(ROOT, RECORD), JSON.stringify(record, null, 2) + '\n');
  console.log(`   --write-verdicts: wrote ${record.additions.length + record.agrees.length} verdicts to ${RECORD}; stopping here (rerun without the flag for the proof)`);
  process.exit(failures ? 1 : 0);
}
console.log(`   ${record.additions.length + record.agrees.length} recorded verdicts checked against BASE and the tree; ${careerChecked} whole senior careers equal to what the tree counts`);

/* ---------------------------------------------------------------- 4 */
section = '4';
console.log('4) Completeness, a ratchet');
const lists = { additions: record.additions.map(e => e.name), agrees: record.agrees.map(e => e.name), partial: record.partial.map(e => e.name), pending: [...record.pending] };
if (CONTROL === 'pending') {
  const moved = lists.agrees[0] ?? lists.additions[0];
  if (moved) {
    lists.pending.push(moved);
    changed(`${moved} put back in pending`);
  }
}
const seen = new Map();
for (const [list, names] of Object.entries(lists)) {
  for (const n of names) {
    if (seen.has(n)) fail(`${n} is in both ${seen.get(n)} and ${list}`);
    seen.set(n, list);
  }
}
for (const n of allCandidates) if (!seen.has(n)) fail(`candidate ${n} is in none of additions, agrees, partial and pending`);
for (const n of lists.pending) if (!candidateSet.has(n)) fail(`pending ${n} is a candidate of no class`);
/* A man who is not a candidate of any class is judged only because the count rule moves one of
   his club square verdicts (class 'counting'); section 2 requires every such man to be judged. */
const movers = new Set([...verdictMoves.map(m => m.split(" now fits ")[0].split(" no longer fits ")[0]), ...ruleMoverNames]);
for (const e of [...record.additions, ...record.agrees]) {
  if (candidateSet.has(e.name)) continue;
  if (e.class !== 'counting') fail(`${e.name} is judged but is no candidate of any class and not of class counting`);
  else if (!movers.has(e.name)) fail(`${e.name} is of class counting but no club square verdict of his moves`);
}
for (const e of record.partial) if (!candidateSet.has(e.name)) fail(`partial ${e.name} is not a candidate`);
/* Every round keyed entry (Round 1576 on; Round 1571's entries carry no round key) belongs to a
   round in ROUNDS, names in `class` the class it was judged under (its key, alone or followed by a
   space: "window (hand overlay, ...)"), is a candidate of that class, and when judged carries
   `fullCareer` true (new in Round 1576: the contract Round 1577's classes read before they take a
   man back). Checked by each entry's own round and class, never only for ROUND, so moving ROUND
   keeps every earlier round's men covered. */
const roundKeyed = [...record.additions, ...record.agrees, ...record.partial].filter(e => e.round !== undefined);
const roundEntries = roundKeyed.filter(e => e.round === ROUND);
const classOf = e => Object.keys(classes).find(k => e.class === k || String(e.class ?? '').startsWith(`${k} `)) ?? null;
for (const e of roundKeyed) {
  if (!ROUNDS.includes(e.round)) fail(`${e.name}: round ${e.round} is no round on this record (${ROUNDS.join(', ')}); an entry from before Round 1576 carries no round key`);
  const key = classOf(e);
  if (!key) fail(`${e.name}: class "${e.class}" names no class of this record (${Object.keys(classes).join(', ')})`);
  else if (!classes[key].includes(e.name)) fail(`${e.name} carries class ${key} but is not a ${key} candidate`);
  if (!record.partial.includes(e) && e.fullCareer !== true) fail(`${e.name}: a judged round ${e.round} entry must carry fullCareer true`);
}
/* forgot (review 2026-10-30): both ratchets read one more than their counts, as a batch that forgot
   to lower them would leave them; the old "may not exceed" test stayed green on that, equality is red. */
const pendingRatchet = PENDING_MAX + (CONTROL === 'forgot' ? 1 : 0);
const unjudgedRatchet = UNJUDGED_MAX + (CONTROL === 'forgot' ? 1 : 0);
if (CONTROL === 'forgot') changed(`both ratchets read one more than their counts (${pendingRatchet}, ${unjudgedRatchet})`);
if (lists.pending.length !== pendingRatchet) fail(`pending holds ${lists.pending.length}, the ratchet reads ${pendingRatchet}: every batch sets it to exactly the new count (it may only shrink)`);
/* The second ratchet: the distinct names nobody has judged (pending plus every owed row), so a
   class that moves men from owed into pending can never hide growth. */
const owedNames = record.owed.flatMap(o => o.names).map(stripSuffix);
if (CONTROL === 'unjudged') {
  const listed = new Set([...lists.pending, ...owedNames, ...seen.keys()]);
  const outsider = baseData.pool.find(p => !listed.has(p.name));
  if (outsider) {
    owedNames.push(outsider.name);
    changed(`${outsider.name}, on no list, added to the owed names`);
  }
}
const unjudged = new Set([...lists.pending, ...owedNames]);
if (unjudged.size !== unjudgedRatchet) fail(`pending plus owed holds ${unjudged.size} distinct names, the ratchet reads ${unjudgedRatchet}: every batch sets it to exactly the new count (it may only shrink)`);
for (const n of unjudged) if (judgedNames.has(n)) fail(`${n} is judged and still on a pending or owed list`);
console.log(`   ${allCandidates.length} candidates (${candidates.length} hole, ${Object.entries(classes).map(([k, v]) => `${v.length} ${k}`).join(', ')}): ${lists.additions.length} additions, ${lists.agrees.length} agrees, ${lists.partial.length} partial, ${lists.pending.length} pending (ratchet ${PENDING_MAX}); round keyed entries ${roundKeyed.length} (${ROUNDS.map(r => `round ${r}: ${roundKeyed.filter(e => e.round === r).length}`).join(', ')}; ROUND ${ROUND})`);
console.log(`   unjudged (pending plus owed, distinct): ${unjudged.size} (ratchet ${UNJUDGED_MAX}); owed rows: ${record.owed.map(o => `${o.round ?? 'unnumbered'} ${o.names.length}`).join(', ')}`);
if (lists.pending.length) console.log(`   pending: ${lists.pending.join(', ')}`);

/* ---------------------------------------------------------------- 5 */
section = '5';
console.log('5) Sources');
const today = new Date().toISOString().slice(0, 10);
const FIXTURE_DAY = '2026-10-29';
const sourced = [];
for (const e of record.additions) for (const c of e.clubs ?? []) sourced.push({ what: `${e.name}: ${c.club}`, sources: c.sources });
for (const e of [...record.additions, ...record.agrees]) {
  if (!(e.career ?? []).length && !(e.clubs ?? []).length) fail(`${e.name}: no sourced club at all`);
  for (const c of e.career ?? []) sourced.push({ what: `${e.name}: ${c.club} (career)`, sources: c.sources });
  for (const s of e.identity?.sources ?? []) if (!s.url || !s.quote) fail(`${e.name}: an identity source without url or quote`);
  /* Round 1576 on (critic 1576 advice 10d): the born date on two host families too, for every
     round keyed entry, not only ROUND's. */
  if (e.round !== undefined) sourced.push({ what: `${e.name}: born ${e.identity?.born} (identity)`, sources: e.identity?.sources, bornOf: e.round });
}
if (CONTROL === 'onesource') {
  const victim = sourced.find(s => (s.sources ?? []).length >= 2);
  if (victim) {
    victim.sources = victim.sources.slice(1);
    changed(`${victim.what} loses a source`);
  }
}
/* bornone (review 2026-10-30): onesource lands on a Round 1571 club, so this one proves the round
   keyed born date check itself: ROUND's first born date on two sources keeps one, else any round's. */
if (CONTROL === 'bornone') {
  const born = sourced.filter(s => s.bornOf !== undefined && (s.sources ?? []).length >= 2);
  const victim = born.find(s => s.bornOf === ROUND) ?? born[0];
  if (victim) {
    victim.sources = victim.sources.slice(0, 1);
    changed(`${victim.what} keeps one source (round ${victim.bornOf})`);
  } else console.log('   =bornone: no round keyed born date with two sources yet (exit 3 by design)');
}
/* Hosts are counted by family since Round 1576 (critic 1576 advice 10d): transfermarkt.com and
   transfermarkt.us are one host, api.fotmob.com and fotmob.com are one. The family is the label
   before the public suffix (a "co" or "com" second level label is skipped: bbc.co.uk is bbc). */
const hostFamily = host => {
  const labels = host.split('.');
  let i = labels.length - 2;
  if (i > 0 && ['co', 'com', 'org', 'net', 'gov', 'ac'].includes(labels[i])) i -= 1;
  return labels[Math.max(i, 0)];
};
function checkSources(what, sources) {
  const hosts = new Set();
  for (const src of sources ?? []) {
    let host = '';
    try {
      const url = new URL(src.url);
      if (url.protocol !== 'https:') fail(`${what}: ${src.url} is not https`);
      host = url.hostname.replace(/^www[.]/, '');
    } catch {
      fail(`${what}: "${src.url}" is not a url`);
      continue;
    }
    if (BANNED_HOSTS.test(host)) fail(`${what}: ${host} is crowd edited`);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(src.read ?? '') || src.read < FIXTURE_DAY || src.read > today) fail(`${what}: read date "${src.read}" is not a day from ${FIXTURE_DAY} to ${today}`);
    if (typeof src.quote !== 'string' || src.quote.trim().length < 8) fail(`${what}: ${host} has no quoted line`);
    hosts.add(hostFamily(host));
  }
  if (hosts.size < 2) fail(`${what}: ${hosts.size} host famil${hosts.size === 1 ? 'y' : 'ies'}, two different hosts are required`);
}
for (const s of sourced) checkSources(s.what, s.sources);
console.log(`   ${sourced.length} sourced facts checked`);
/* Every added club carries the stint shape a later stints migration can write (critic advice 13):
   fromSeason and toSeason each ONE season ("2022-23", or "2022" where the league runs by calendar
   year), a split season's second year the first plus one, and from no later than to. */
const seasonRows = record.additions.flatMap(e => (e.clubs ?? []).map(c => ({ what: `${e.name}: ${c.club}`, from: c.fromSeason, to: c.toSeason })));
if (CONTROL === 'noseason' && seasonRows[0]?.to) {
  seasonRows[0].to = null;
  changed(`${seasonRows[0].what} loses its toSeason`);
}
const seasonStart = s => {
  const m = /^([0-9]{4})(?:-([0-9]{2}))?$/.exec(s ?? '');
  return m && (m[2] === undefined || Number(m[2]) === (Number(m[1]) + 1) % 100) ? Number(m[1]) : null;
};
let seasonsOk = 0;
for (const r of seasonRows) {
  const from = seasonStart(r.from);
  const to = seasonStart(r.to);
  if (from === null || to === null) fail(`${r.what}: fromSeason "${r.from}" and toSeason "${r.to}" must each be one season`);
  else if (from > to) fail(`${r.what}: fromSeason ${r.from} is after toSeason ${r.to}`);
  else seasonsOk += 1;
}
console.log(`   ${seasonsOk} of ${seasonRows.length} added clubs carry one fromSeason and one toSeason`);

/* ---------------------------------------------------------------- 6 */
section = '6';
console.log('6) The derived file');
const { buildDerived, DERIVED } = await import(new URL('./genBingoClubAdditions.mjs', import.meta.url).href);
/* The generator's refusal reads each entry's typed tableClubs, so they must be the clubs BASE
   counts for him on the fixture, or it guards the wrong set (review 2026-10-29). */
const tableOf = new Map([...record.additions, ...record.agrees].map(e => [e.name, [...(e.tableClubs ?? [])]]));
if (CONTROL === 'tableclubs') {
  const victim = tableOf.get('Tyler Morton');
  if (victim?.includes('olympique lyon')) {
    victim.splice(victim.indexOf('olympique lyon'), 1);
    changed('Tyler Morton\'s typed tableClubs lose olympique lyon');
  }
}
let tableChecked = 0;
for (const [name, typed] of tableOf) {
  const want = [...(baseData.clubHistory.get(name) ?? [])].sort();
  const have = [...typed].sort();
  if (JSON.stringify(want) !== JSON.stringify(have)) fail(`${name}: the record's tableClubs [${have.join(', ')}] are not BASE's club history on the fixture [${want.join(', ')}]`);
  else tableChecked += 1;
}
console.log(`   tableClubs equal to BASE's club history for ${tableChecked} of ${tableOf.size} judged men`);
/* slashdup and aliasdup (critic correction 6): plant, in a copy of the record fed to the
   generator, one addition of a club the man already holds under a spaced slash part or a declared
   alias spelling. Each plant first proves it is that case and nothing simpler (the club is not one
   of his whole keys), so only the slash split or the alias map can refuse it. */
let genRecord = record;
const plant = (name, club, why) => {
  const p = baseData.pool.find(x => x.name === name);
  const held = [...(baseData.clubHistory.get(name) ?? [])];
  if (!p || !why(held) || held.includes(base.clubKey(club))) return;
  genRecord = structuredClone(record);
  genRecord.additions.push({ name, nationality: p.nationality, birthYear: null, position: p.position, tableClubs: held, clubs: [{ club, fromSeason: null, toSeason: null, loan: false, sources: [] }] });
  changed(`${name} gains "${club}" in a copy of the record (his table keys: ${held.join(', ')})`);
};
if (CONTROL === 'slashdup') plant('Pedro Porro', 'Girona FC', held => held.includes('girona fc / real valladolid cf'));
if (CONTROL === 'aliasdup') plant('Joshua Kimmich', 'FC Bayern Munich', held => held.includes('bayern munich') && (record.counting?.aliases ?? []).some(a => a.from === 'fc bayern munich' && a.to === 'bayern munich'));
const built = buildDerived(genRecord);
for (const r of built.refusals) fail(`the generator refuses: ${r}`);
let shipped = read(DERIVED).replaceAll('\r\n', '\n');
if (CONTROL === 'handedit') {
  const edited = shipped.replace('"Hull City"', '"Hull Citx"');
  if (edited !== shipped) changed('one byte of the derived file edited by hand');
  shipped = edited;
}
if (shipped !== built.text) fail(`${DERIVED} is not the generator's output (run node scripts/genBingoClubAdditions.mjs, never edit it by hand)`);
const derived = JSON.parse(built.text);
if (CONTROL === 'shortname') {
  const a = derived.add.find(x => x.clubs.includes('Manchester City'));
  if (!a) console.log('   =shortname: no added Manchester City in the derived file (exit 3 by design)');
  else {
    a.clubs = a.clubs.map(c => (c === 'Manchester City' ? 'Man City' : c));
    changed(`${a.n}'s added "Manchester City" written "Man City" (Transfermarkt's short form) in the copy the spelling checks read`);
  }
}
const spellings = new Map();
for (const r of rows) if (r.club) spellings.set(norm(r.club), r.club);
/* A new key that reads like a club the table already spells (review 2026-10-30, mutation mancity:
   Reijnders's "Manchester City" written "Man City" stayed green while his Played for Manchester City
   move vanished from section 9(c)). The fold: punctuation to spaces, affix words (fc, cf, ac, de and
   the like) and numbers of two or more digits dropped (a single digit stays: SC Dnipro-1 is not FC
   Dnipro). Two names are near when the folds hold the same number of words, each equal or a short
   form of three letters or fewer (same first letter, letters in order: man for manchester, utd for
   united), or when one is a single word made of the other's initials (PSG). An added club the table
   never spells must be near no table spelling and no club tile's label; a truly different club that
   folds near one goes in NOT_NEAR as [added club, the spelling it is not], with its reason. */
const NOT_NEAR = [];
const AFFIX_WORDS = new Set(['fc', 'cf', 'afc', 'sc', 'ac', 'as', 'cd', 'sd', 'ud', 'ss', 'ssc', 'sv', 'fk', 'nk', 'sk', 'bk', 'if', 'club', 'de', 'del', 'la', 'the', 'calcio', 'and']);
const clubWords = s => norm(s).replace(/[^a-z0-9 ]+/g, ' ').split(/ +/).filter(t => t && !/^[0-9]{2,}$/.test(t));
const looseWords = s => clubWords(s).filter(t => !AFFIX_WORDS.has(t));
const inOrder = (short, long) => { let i = 0; for (const ch of long) if (ch === short[i]) i += 1; return i === short.length; };
const shortFor = (a, b) => a.length <= 3 && b.length > a.length && a[0] === b[0] && inOrder(a, b);
const initials = s => clubWords(s).map(w => w[0]).join('');
const nearClub = (x, y) => {
  const a = looseWords(x);
  const b = looseWords(y);
  if (!a.length || !b.length) return false;
  if (a.length === b.length && a.every((w, i) => w === b[i] || shortFor(w, b[i]) || shortFor(b[i], w))) return true;
  return (a.length === 1 && a[0].length >= 2 && a[0] === initials(y)) || (b.length === 1 && b[0].length >= 2 && b[0] === initials(x));
};
const tileLabels = headCriteria.filter(c => c.id.startsWith('club-')).map(c => c.label.replace(/^Played for /, ''));
const nearTargets = [...new Set([...spellings.values(), ...tileLabels])];
const unseen = [];
for (const a of derived.add) {
  for (const club of a.clubs) {
    const table = spellings.get(norm(club));
    if (table && table !== club) fail(`${a.n}: "${club}" is spelled "${table}" in the table`);
    if (table) continue;
    unseen.push(`${a.n}: ${club}`);
    for (const t of nearTargets) {
      if (!nearClub(club, t) || NOT_NEAR.some(([x, y]) => x === club && y === t)) continue;
      fail(`${a.n}: "${club}" is spelled nowhere in the table but reads like "${t}" (${tileLabels.includes(t) ? 'a club tile' : 'a table spelling'}): use the table's spelling, or name the pair in NOT_NEAR if they are different clubs`);
    }
  }
}
console.log(`   near spellings: ${unseen.length} new keys held against ${nearTargets.length} table spellings and club tile labels (${tileLabels.length} tiles), ${NOT_NEAR.length} pairs in NOT_NEAR`);
console.log(`   ${derived.add.length} men, ${derived.add.reduce((n, a) => n + a.clubs.length, 0)} added clubs; clubs the fixture never spells (new keys, printed): ${unseen.length}${unseen.length ? ': ' + unseen.join('; ') : ''}`);

/* ---------------------------------------------------------------- 7 */
section = '7';
console.log('7) The fleet: 200 seeded boards and decks, BASE against the tree');
/* generateBoard's draws depend only on which criteria are eligible (support at MIN_TILE_SUPPORT or
   more) and on the bucket sizes, never on the support lists, so with eligibility equal the board's
   tile sequence must be byte identical seed for seed. buildDeck shuffles each tile's support, so a
   deck can only be equal where every tile on the board kept its support (printed, expected few:
   the career shape quota puts a club count tile on nearly every board). The fleet runs on fixture
   data, where the World Cup and Ballon d'Or sets are empty: these are fixture boards, not live ones. */
const mulberry32 = seed => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const realRandom = Math.random;
const eligible = criteria => criteria.filter(c => c.support.length >= base.MIN_TILE_SUPPORT).map(c => c.id);
if (JSON.stringify(eligible(baseCriteria)) !== JSON.stringify(eligible(headCriteria))) {
  const b = new Set(eligible(baseCriteria));
  const h = new Set(eligible(headCriteria));
  fail(`eligibility differs from BASE (now eligible: ${[...h].filter(x => !b.has(x)).join(', ') || 'none'}; no longer: ${[...b].filter(x => !h.has(x)).join(', ') || 'none'})`);
}
let boardsEqual = 0;
let decksComparable = 0;
let decksEqual = 0;
let guaranteeRegressions = 0;
const guaranteeHolds = (board, deck) => board.every(t => {
  const window = new Set(deck.slice(0, base.GUARANTEE_WINDOW).map(p => p.name));
  return t.support.filter(n => window.has(n)).length >= Math.min(base.GUARANTEED_PER_LINE, t.support.length);
});
for (let seed = 1; seed <= 200; seed++) {
  Math.random = mulberry32(seed);
  const bBoard = base.generateBoard(baseCriteria);
  const bDeck = base.buildDeck(baseData.pool, bBoard);
  Math.random = mulberry32(seed);
  if (CONTROL === 'drift' && seed === 1) changed('one extra draw before the tree\'s boards');
  if (CONTROL === 'drift') Math.random();
  const hBoard = head.generateBoard(headCriteria);
  const hDeck = head.buildDeck(headData.pool, hBoard);
  Math.random = realRandom;
  if (JSON.stringify(bBoard.map(c => c.id)) === JSON.stringify(hBoard.map(c => c.id))) boardsEqual += 1;
  if (bBoard.every((c, i) => hBoard[i] && JSON.stringify(c.support) === JSON.stringify(hBoard[i].support))) {
    decksComparable += 1;
    if (JSON.stringify(bDeck.map(p => p.name)) === JSON.stringify(hDeck.map(p => p.name))) decksEqual += 1;
    else fail(`seed ${seed}: every board tile kept its support but the deck differs from BASE`);
  }
  if (guaranteeHolds(bBoard, bDeck) && !guaranteeHolds(hBoard, hDeck)) guaranteeRegressions += 1;
}
Math.random = realRandom;
if (boardsEqual !== 200) fail(`${200 - boardsEqual} of 200 seeded boards differ from BASE`);
if (guaranteeRegressions) fail(`${guaranteeRegressions} seeds keep the ${base.GUARANTEED_PER_LINE} per tile guarantee in the first ${base.GUARANTEE_WINDOW} cards on BASE and lose it on the tree`);
console.log(`   eligibility equal; ${boardsEqual} of 200 boards byte identical; ${decksComparable} boards kept every tile's support, ${decksEqual} of their decks identical; guarantee regressions ${guaranteeRegressions}`);

/* ---------------------------------------------------------------- 8 */
section = '8';
console.log(`8) The window answer (every round keyed entry of the window class, whichever round judged him)`);
/* A quoted line reaches into 2025-26 when it holds a 2025-26 season token (Transfermarkt's 25/26)
   or when the span of the dates it quotes (dd/mm/yyyy or yyyy-mm-dd; FotMob's "to now" is the day
   it was read) overlaps 2025-07-01 to 2026-06-30. A mechanical floor under the builder's reading,
   not a parse of which club each date belongs to: a 2022-23 line alone fails it. */
const quoteDates = q => [
  ...[...q.matchAll(/(?<![0-9])([0-9]{2})\/([0-9]{2})\/([0-9]{4})(?![0-9])/g)].map(m => `${m[3]}-${m[2]}-${m[1]}`),
  ...[...q.matchAll(/(?<![0-9])[0-9]{4}-[0-9]{2}-[0-9]{2}(?![0-9])/g)].map(m => m[0]),
];
const showsWindowSeason = (q, read) => {
  if (/(?<![0-9/])(25\/26|2025-26|2025\/26)(?![0-9/])/.test(q)) return true;
  const dates = quoteDates(q);
  if (/ to now(?![a-z])/.test(q) && read) dates.push(read);
  if (!dates.length) return false;
  dates.sort();
  return dates[0] <= WINDOW_SEASON.to && dates[dates.length - 1] >= WINDOW_SEASON.from;
};
const splitSeason = s => /^[0-9]{4}-[0-9]{2}$/.test(s ?? '');
const coversWindow = (from, to) => {
  const a = seasonStart(from);
  const b = seasonStart(to);
  if (a === null || b === null) return false;
  return splitSeason(from) && splitSeason(to) ? a <= 2025 && b >= 2025 : a <= 2026 && b >= 2025;
};
const keyOf = club => { const k = base.clubKey(club); return aliasOf.get(k) ?? k; };
function expectedOverlay(name) {
  const hand = handOf.get(name) ?? [];
  if (hand.length) return { overlay: 'hand', db: hand[hand.length - 1].db, from: null };
  const counted = new Set([...(baseData.clubYears.get(name) ?? [])].map(c => c.key));
  const row = (generatedOf.get(name) ?? []).find(g => g.from && !counted.has(base.clubKey(g.from)));
  return row ? { overlay: 'generated', db: row.db, from: row.from } : null;
}
const partialNames = new Set(record.partial.map(e => e.name));
const winEntries = structuredClone(roundKeyed.filter(e => classOf(e) === 'window'));
/* The section 8 controls pick ROUND's first entry that fits, else the first window entry of any round. */
const firstWith = test => winEntries.find(e => e.round === ROUND && test(e)) ?? winEntries.find(test);
if (CONTROL === 'nowindow') {
  const v = firstWith(e => e.window);
  if (v) { delete v.window; changed(`${v.name}'s window block deleted (round ${v.round})`); } else console.log('   =nowindow: no window entry yet (exit 3 by design)');
}
if (CONTROL === 'windowdb') {
  const v = firstWith(e => e.window?.db);
  if (v) { v.window.db = `${v.window.db} Reserves`; changed(`${v.name}'s window.db edited to "${v.window.db}" (round ${v.round})`); } else console.log('   =windowdb: no window entry yet (exit 3 by design)');
}
if (CONTROL === 'windowseason') {
  const v = firstWith(e => (e.window?.clubs ?? []).some(c => c?.sources?.length));
  if (v) {
    const c = v.window.clubs.find(x => x?.sources?.length);
    c.sources[0].quote = '22/23 01/07/2022 Other Club -> Another Club (-)';
    changed(`${v.name}: the first quote for window club ${c.club} swapped for a 2022-23 transfer line (round ${v.round})`);
  } else console.log('   =windowseason: no window club with sources yet (exit 3 by design)');
}
let tableLacked = 0;
let windowClubs = 0;
for (const e of winEntries) {
  const isPartial = partialNames.has(e.name);
  const exp = expectedOverlay(e.name);
  const w = e.window;
  if (!w) { fail(`${e.name}: no window block`); continue; }
  if (!exp) fail(`${e.name}: no overlay row explains his window class`);
  else if (w.overlay !== exp.overlay || w.db !== exp.db || (w.from ?? null) !== exp.from) fail(`${e.name}: window {overlay ${w.overlay}, db ${w.db}, from ${w.from}} is not the overlay's {${exp.overlay}, ${exp.db}, ${exp.from}}`);
  if (w.season !== '2025-26') fail(`${e.name}: window.season is "${w.season}", not "2025-26"`);
  const wclubs = w.clubs ?? [];
  if (!wclubs.length) {
    if (isPartial) { if (typeof e.reason !== 'string' || e.reason.length < 8) fail(`${e.name}: a partial window man with no window club needs a reason`); }
    else if (typeof w.note !== 'string' || w.note.trim().length < 8) fail(`${e.name}: no window club and no note saying why (a senior first team only)`);
    console.log(`   ${e.name}: no window club listed (${isPartial ? 'partial' : w.note})`);
  }
  if (isPartial && e.waitsOn !== undefined && ![1577, 1587, 1589].includes(e.waitsOn)) fail(`${e.name}: waitsOn ${e.waitsOn} is not 1577, 1587 or 1589`);
  const careerKeys = new Set((e.career ?? []).map(c => keyOf(c.club)));
  const addedKeys = new Set((e.clubs ?? []).map(c => keyOf(c.club)));
  const tree = headData.clubHistory.get(e.name) ?? new Set();
  let lacked = false;
  for (const wc of wclubs) {
    const club = windowClubName(wc);
    const k = keyOf(club ?? '');
    windowClubs += 1;
    if (!isPartial) {
      if (!careerKeys.has(k) && !addedKeys.has(k)) fail(`${e.name}: window club ${club} is in neither his sourced career nor his added clubs`);
      if (!tree.has(k)) fail(`${e.name}: window club ${club} is not counted by the tree (his 2025-26 club not counted)`);
    }
    checkSources(`${e.name}: window club ${club}`, wc?.sources);
    for (const s of wc?.sources ?? []) {
      if (typeof s.quote === 'string' && !showsWindowSeason(s.quote, s.read)) fail(`${e.name}: window club ${club}: a quote does not reach into 2025-26 ("${s.quote.slice(0, 90)}")`);
    }
    if (addedKeys.has(k)) {
      lacked = true;
      const c = e.clubs.find(x => keyOf(x.club) === k);
      if (!coversWindow(c.fromSeason, c.toSeason)) fail(`${e.name}: added window club ${club} runs ${c.fromSeason} to ${c.toSeason}, which does not cover 2025-26`);
    }
  }
  if (lacked) tableLacked += 1;
  if (!isPartial && exp?.overlay === 'generated' && !wclubs.some(wc => keyOf(windowClubName(wc) ?? '') === keyOf(exp.from))) fail(`${e.name}: the generated row's from (${exp.from}) is not one of his window clubs`);
}
for (const n of classes.window) {
  const e = [...record.additions, ...record.agrees, ...record.partial].find(x => x.name === n);
  if (!e || (e.round !== undefined && classOf(e) === 'window')) continue;
  const exp = expectedOverlay(n);
  const inTree = exp && (headData.clubHistory.get(n) ?? new Set()).has(keyOf(exp.db));
  console.log(`   ${n}: judged by an earlier round (class ${e.class}); the overlay's ${exp?.db} ${inTree ? 'is' : 'is NOT'} in his tree history`);
  if (!inTree && !partialNames.has(n)) fail(`${n}: the overlay's ${exp?.db} is not in his tree history`);
}
console.log(`   ${winEntries.length} window entries (${ROUNDS.map(r => `round ${r}: ${winEntries.filter(e => e.round === r).length}`).join(', ')}; ${winEntries.filter(e => partialNames.has(e.name)).length} partial), ${windowClubs} window clubs; ${tableLacked} men had a 2025-26 club the table lacked`);

/* ---------------------------------------------------------------- 9 */
section = '9';
console.log(`9) Against the previous closed head on this record, PREV ${PREV}`);
let prevRecord;
let prevLibSource;
let prevModule;
let prevDerived;
try {
  const show = rel => execSync(`git show ${PREV}:${rel}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  prevRecord = JSON.parse(show(RECORD));
  prevLibSource = show('src/lib/playerBingo.ts');
  prevModule = show('src/lib/clubCareerAdditions.ts');
  prevDerived = show('src/data/bingoClubAdditions.json');
} catch (error) {
  abort(`git show ${PREV} failed (${error.message.split('\n')[0]})`);
}
const treeByName = new Map();
for (const list of ['additions', 'agrees', 'partial']) for (const e of record[list]) treeByName.set(e.name, [...(treeByName.get(e.name) ?? []), { list, e }]);
const prevEntries = ['additions', 'agrees', 'partial'].flatMap(list => prevRecord[list].map(e => ({ list, e })));
let touchVictim = null;
if (CONTROL === 'touchprev') {
  touchVictim = prevEntries.find(p => !AMENDED.includes(p.e.name) && (treeByName.get(p.e.name) ?? []).length === 1)?.e.name ?? null;
  if (touchVictim) changed(`${touchVictim}'s notes edited in memory`);
}
let frozen = 0;
for (const { list, e } of prevEntries) {
  const mine = treeByName.get(e.name) ?? [];
  if (mine.length !== 1) { fail(`${e.name} (a PREV ${list} entry) has ${mine.length} entries in the tree's record`); continue; }
  if (AMENDED.includes(e.name)) { console.log(`   amended by name (the brief says so): ${e.name}`); continue; }
  const ours = e.name === touchVictim ? { ...mine[0].e, notes: `${mine[0].e.notes ?? ''} (edited)` } : mine[0].e;
  if (mine[0].list !== list || JSON.stringify(ours) !== JSON.stringify(e)) fail(`${e.name}: the PREV ${list} entry is not byte equal in the tree's record (${mine[0].list})`);
  else frozen += 1;
}
/* Every entry new since PREV is this round's: it carries round ROUND (an earlier round's number on a
   new entry would hide it from section 9's movers and from the round that owns it). */
const prevNames = new Set(prevEntries.map(p => p.e.name));
let newEntries = 0;
for (const [name, mine] of treeByName) {
  if (prevNames.has(name)) continue;
  newEntries += mine.length;
  for (const { e } of mine) if (e.round !== ROUND) fail(`${name} is new since PREV and carries round ${e.round}, not ROUND ${ROUND}`);
}
for (const key of ['round', 'checkedOn', 'report', 'fixture', 'counting', 'candidates']) if (JSON.stringify(record[key]) !== JSON.stringify(prevRecord[key])) fail(`the record's ${key} differs from PREV's`);
const prevRuleKeys = Object.keys(prevRecord.rule ?? {});
for (const key of prevRuleKeys) if (JSON.stringify(record.rule?.[key]) !== JSON.stringify(prevRecord.rule[key])) fail(`rule.${key} differs from PREV's`);
for (const [key, c] of Object.entries(prevRecord.classes ?? {})) for (const f of ['round', 'rule']) if (JSON.stringify(record.classes?.[key]?.[f]) !== JSON.stringify(c[f])) fail(`classes.${key}.${f} differs from PREV's`);
console.log(`   (a) ${frozen} of ${prevEntries.length} PREV entries byte equal by name (${AMENDED.length} amended by name); ${newEntries} entries new since PREV, each of round ${ROUND}; round, checkedOn, report, fixture, counting, hole candidates, ${prevRuleKeys.length} rule keys and ${Object.keys(prevRecord.classes ?? {}).length} earlier classes equal`);
const prevLib = await loadBingoLib({ root: ROOT, libSource: prevLibSource, label: 'prev', tmp, extraSources: { '@/data/bingoClubAdditions.json': prevDerived, '@/lib/clubCareerAdditions': prevModule } });
const prevData = (await load(prevLib)).data;
/* The men allowed to move against PREV: ROUND's entries and the PREV entries this round's brief
   amends by name (section 9(a) exempts the same names). */
const roundNames = new Set([...roundEntries.map(e => e.name), ...AMENDED]);
let prevLeakVictim = null;
if (CONTROL === 'prevleak') {
  prevLeakVictim = headData.pool.find(p => !roundNames.has(p.name))?.name ?? null;
  if (prevLeakVictim) changed(`one club added in memory to ${prevLeakVictim}'s tree history (no round ${ROUND} entry)`);
}
if (JSON.stringify(prevData.pool) !== JSON.stringify(headData.pool)) fail('the pool differs from PREV');
let sameHistories = 0;
for (const p of prevData.pool) {
  if (roundNames.has(p.name)) continue;
  const was = [...(prevData.clubHistory.get(p.name) ?? [])].sort();
  const now = [...(headData.clubHistory.get(p.name) ?? [])];
  if (p.name === prevLeakVictim) now.push('qzx leaked club');
  now.sort();
  if (JSON.stringify(was) !== JSON.stringify(now)) fail(`${p.name} has no round ${ROUND} entry and his club history moved against PREV ([${was.join(', ')}] -> [${now.join(', ')}])`);
  else sameHistories += 1;
}
console.log(`   (b) ${sameHistories} pool men without a round ${ROUND} entry keep PREV's club history exactly`);
const prevCriteria = prevLib.buildCriteria(prevData);
if (JSON.stringify(prevCriteria.map(c => c.id)) !== JSON.stringify(headCriteria.map(c => c.id))) fail('the criterion list differs from PREV');
const prevMoves = [];
for (const hc of headCriteria) {
  const pc = prevCriteria.find(c => c.id === hc.id);
  if (!pc) continue;
  const gained = hc.support.filter(n => !pc.support.includes(n));
  const lost = pc.support.filter(n => !hc.support.includes(n));
  if (!gained.length && !lost.length) continue;
  if (!CLUB_SQUARES(hc.id)) fail(`${hc.id} support moved against PREV though it is not a club square`);
  for (const n of [...gained, ...lost]) {
    if (!roundNames.has(n)) fail(`${hc.id}: ${n} moved against PREV but has no round ${ROUND} entry`);
    prevMoves.push(`${n} ${gained.includes(n) ? 'now fits' : 'no longer fits'} ${hc.label} (support ${pc.support.length} -> ${hc.support.length})`);
  }
}
console.log(`   (c) ${prevMoves.length} club square verdicts moved against PREV${prevMoves.length ? ' (the list a What\'s New line may draw on):' : ': none, so no What\'s New line'}`);
for (const m of prevMoves) console.log('     ' + m);
if (JSON.stringify(eligible(prevCriteria)) !== JSON.stringify(eligible(headCriteria))) fail('eligibility differs from PREV');
let prevBoards = 0;
let prevComparable = 0;
let prevDecks = 0;
let prevRegressions = 0;
for (let seed = 1; seed <= 200; seed++) {
  Math.random = mulberry32(seed);
  const pBoard = prevLib.generateBoard(prevCriteria);
  const pDeck = prevLib.buildDeck(prevData.pool, pBoard);
  Math.random = mulberry32(seed);
  if (CONTROL === 'drift') Math.random();
  const hBoard = head.generateBoard(headCriteria);
  const hDeck = head.buildDeck(headData.pool, hBoard);
  Math.random = realRandom;
  if (JSON.stringify(pBoard.map(c => c.id)) === JSON.stringify(hBoard.map(c => c.id))) prevBoards += 1;
  if (pBoard.every((c, i) => hBoard[i] && JSON.stringify(c.support) === JSON.stringify(hBoard[i].support))) {
    prevComparable += 1;
    if (JSON.stringify(pDeck.map(p => p.name)) === JSON.stringify(hDeck.map(p => p.name))) prevDecks += 1;
    else fail(`seed ${seed}: every board tile kept its PREV support but the deck differs from PREV`);
  }
  if (guaranteeHolds(pBoard, pDeck) && !guaranteeHolds(hBoard, hDeck)) prevRegressions += 1;
}
Math.random = realRandom;
if (prevBoards !== 200) fail(`${200 - prevBoards} of 200 seeded boards differ from PREV`);
if (prevRegressions) fail(`${prevRegressions} seeds keep the per tile guarantee on PREV and lose it on the tree`);
console.log(`   (d) eligibility equal to PREV; ${prevBoards} of 200 boards byte identical; ${prevComparable} boards kept every tile's support, ${prevDecks} of their decks identical; guarantee regressions ${prevRegressions}`);

/* ---------------------------------------------------------------- end */
const summary = Object.entries(bySection).map(([s, n]) => `section ${s}: ${n}`).join(', ');
if (CONTROL) {
  if (!controlChanged) {
    console.log(`simBingoClubCounts: CONTROL=${CONTROL} DID NOT FIRE (it changed nothing)`);
    process.exit(3);
  }
  if (failures) {
    console.log(`simBingoClubCounts: CONTROL=${CONTROL} FIRED (${failures} failures; ${summary})`);
    process.exit(1);
  }
  console.log(`simBingoClubCounts: CONTROL=${CONTROL} changed ${controlChanged} thing(s) but nothing went red: the check it targets is blind`);
  process.exit(3);
}
if (failures) {
  console.log(`simBingoClubCounts: RED, ${failures} failures (${summary})`);
  process.exit(1);
}
console.log('simBingoClubCounts: GREEN, every section held');
