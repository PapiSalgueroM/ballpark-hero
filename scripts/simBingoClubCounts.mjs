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
        (PENDING_MAX below is lowered by every batch that judges men).
     5. sources: every added club and every agrees verdict carries two or more
        sources on different hosts, none crowd edited, each with a url, the
        date read (not after today, not before the fixture) and a quoted line;
        and every added club has one fromSeason and one toSeason, in order.
     6. derived: every judged man's typed tableClubs (the generator's refusal
        input) is BASE's club history for him on the fixture;
        src/data/bingoClubAdditions.json is the generator's output byte for
        byte, the generator refuses nothing (no club he already has under
        another spelling or slash part), and every added club uses the
        table's own spelling where the table spells it at all.
     7. the fleet: 200 seeds of a seeded Math.random through generateBoard
        and buildDeck on BASE and on the tree. Every criterion's eligibility
        is equal, so the board's tile sequence must be byte identical on all
        200 seeds; a deck must be identical wherever every board tile kept its
        support (printed; expected near zero, since the career shape quota
        puts a club count tile on nearly every board); and no seed that keeps
        the per tile guarantee in the first cards on BASE loses it.

   Negative controls (each asserts it changed something, or exits 3):
     BINGO_CLUBS_CONTROL=rule      the Round 669 lists dropped from the rule:
                                   the committed candidates disagree, red.
     BINGO_CLUBS_CONTROL=onesource one sourced entry loses a source: red.
     BINGO_CLUBS_CONTROL=pending   one judged man put back in pending, so
                                   pending grows past PENDING_MAX: red.
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
   Exit 0 green, 1 red (or a control that fired), 2 could not run, 3 a control
   that changed nothing.

   Two things a later round must know:
     BASE is pinned to 692590145 for good. Section 2 fails on ANY later change
     to the pool, seasonStats, clubYears or a non club tile's support, by
     design. The next round that edits src/lib/playerBingo.ts (the other
     lane's BS-mix-4, Rounds 1576 and 1577) must move BASE to its own base
     commit, or move section 2, in that round, and say so.
     The identity guards of the bind (role, nationality, birth year window,
     an ambiguous match refused) are caught only by the two unit files
     src/test/clubCareerAdditions.test.ts and
     src/test/playerBingoClubCounts.test.ts: the fixture holds no namesake
     near an addition, so this harness cannot see a guard deleted (review
     2026-10-29, mutations norole, nonat, loosenby, firstmatch). Keep both
     files in every gate beside this harness.

   Run: node scripts/simBingoClubCounts.mjs
        node scripts/simBingoClubCounts.mjs --write-candidates   (rewrites the
        record's candidates and adds new names to pending; commit the result)
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
const PENDING_MAX = 0;
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

if (WRITE) {
  const judged = new Set([...record.additions, ...record.agrees, ...record.partial].map(e => e.name));
  record.candidates = candidates;
  record.pending = candidates.filter(n => !judged.has(n));
  fs.writeFileSync(path.join(ROOT, RECORD), JSON.stringify(record, null, 2) + '\n');
  console.log(`   --write-candidates: wrote ${candidates.length} candidates, ${record.pending.length} pending, to ${RECORD}`);
}
if (JSON.stringify(record.candidates) !== JSON.stringify(candidates)) {
  const missingNames = candidates.filter(n => !record.candidates.includes(n));
  const extra = record.candidates.filter(n => !candidates.includes(n));
  fail(`the record's committed candidates differ from the rule (rule only: ${missingNames.slice(0, 6).join(', ') || 'none'}; record only: ${extra.slice(0, 6).join(', ') || 'none'})`);
}

/* Printed, not asserted: the classes this round does not judge (the lead's
   ruling R1 numbers them). The record's `owed` carries each list by round. */
const candidateSet = new Set(candidates);
const ownRows = new Map();
for (const p of baseData.pool) ownRows.set(p.name, rows.filter(r => (r.player_name ?? '').trim() === p.name && base.isSameMan(p, { age: r.age, year: r.year })));
const gapOutside = [];
const academySeniors = [];
const lateStarters = [];
for (const p of baseData.pool) {
  if (candidateSet.has(p.name)) continue;
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
const { TRANSFER_OVERLAY_2026_HAND, WINDOW_2026_ADDITIONS } = await import(new URL('./transferOverlay2026.mjs', import.meta.url).href);
const poolByNorm = new Map(baseData.pool.map(p => [norm(p.name), p]));
const handMen = [...new Set(TRANSFER_OVERLAY_2026_HAND.map(e => norm(e.name)).filter(n => poolByNorm.has(n)))].map(n => poolByNorm.get(n).name).filter(n => !candidateSet.has(n)).sort();
const windowLost = [];
for (const e of WINDOW_2026_ADDITIONS) {
  const p = poolByNorm.get(norm(e.name));
  if (!p || candidateSet.has(p.name) || !e.from) continue;
  const fromKey = base.clubKey(e.from);
  const counted = new Set([...(baseData.clubYears.get(p.name) ?? [])].map(c => c.key));
  if (fromKey && !counted.has(fromKey)) windowLost.push(`${p.name} (${e.from})`);
}
console.log(`   owed to Round 1576, C2: pool men on the hand overlay (no from, each needs a lookup): ${handMen.length}; generated overlay rows whose from club is in none of his counted rows: ${windowLost.length}: ${windowLost.join('; ')}`);
console.log(`   owed, C1 outside the hole (a 2023 to 2025 year missing after his first counted row, not a candidate): ${gapOutside.length}: ${gapOutside.join(', ')}`);
console.log(`   owed, academy filtered rows at a club he has no counted row at (critic advice 10): ${academySeniors.length}`);
for (let i = 0; i < academySeniors.length; i += 6) console.log('     ' + academySeniors.slice(i, i + 6).join('; '));
console.log(`   owed, C3 late starters outside the hole (first counted row at a listed age of 22 or more): ${lateStarters.length}`);
for (let i = 0; i < lateStarters.length; i += 8) console.log('     ' + lateStarters.slice(i, i + 8).join('; '));
const owedNow = [
  { round: 1576, class: 'C2 window: pool men on the hand overlay, whose 2025-26 club needs a lookup', names: handMen },
  { round: 1576, class: 'C2 window: generated overlay rows whose from club is in none of his counted rows', names: windowLost },
  { round: null, class: 'C1 outside the hole: a 2023 to 2025 year missing after a first counted row before 2023 (no round numbered by the lead; suggested 1577)', names: gapOutside },
  { round: 1577, class: 'academy filtered rows at a club with no counted row (critic advice 10)', names: academySeniors },
  { round: 1577, class: 'C3 late starters outside the hole: first counted row at a listed age of 22 or more', names: lateStarters },
];
if (WRITE) {
  record.owed = owedNow;
  fs.writeFileSync(path.join(ROOT, RECORD), JSON.stringify(record, null, 2) + '\n');
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
if (WRITE_VERDICTS && !CONTROL) fs.writeFileSync(path.join(ROOT, RECORD), JSON.stringify(record, null, 2) + '\n');
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
for (const n of candidates) if (!seen.has(n)) fail(`candidate ${n} is in none of additions, agrees, partial and pending`);
/* A man who is not a candidate is judged only because the count rule moves one of his club
   square verdicts (class 'counting'); section 2 requires every such man to be judged. */
const movers = new Set([...verdictMoves.map(m => m.split(" now fits ")[0].split(" no longer fits ")[0]), ...ruleMoverNames]);
for (const e of [...record.additions, ...record.agrees]) {
  if (candidateSet.has(e.name)) continue;
  if (e.class !== 'counting') fail(`${e.name} is judged but is neither a candidate nor of class counting`);
  else if (!movers.has(e.name)) fail(`${e.name} is of class counting but no club square verdict of his moves`);
}
for (const e of record.partial) if (!candidateSet.has(e.name)) fail(`partial ${e.name} is not a candidate`);
if (lists.pending.length > PENDING_MAX) fail(`pending holds ${lists.pending.length}, the ratchet allows ${PENDING_MAX} (it may only shrink)`);
console.log(`   ${candidates.length} candidates: ${lists.additions.length} additions, ${lists.agrees.length} agrees, ${lists.partial.length} partial, ${lists.pending.length} pending (ratchet ${PENDING_MAX})`);
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
}
if (CONTROL === 'onesource') {
  const victim = sourced.find(s => (s.sources ?? []).length >= 2);
  if (victim) {
    victim.sources = victim.sources.slice(1);
    changed(`${victim.what} loses a source`);
  }
}
for (const s of sourced) {
  const hosts = new Set();
  for (const src of s.sources ?? []) {
    let host = '';
    try {
      const url = new URL(src.url);
      if (url.protocol !== 'https:') fail(`${s.what}: ${src.url} is not https`);
      host = url.hostname.replace(/^www[.]/, '');
    } catch {
      fail(`${s.what}: "${src.url}" is not a url`);
      continue;
    }
    if (BANNED_HOSTS.test(host)) fail(`${s.what}: ${host} is crowd edited`);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(src.read ?? '') || src.read < FIXTURE_DAY || src.read > today) fail(`${s.what}: read date "${src.read}" is not a day from ${FIXTURE_DAY} to ${today}`);
    if (typeof src.quote !== 'string' || src.quote.trim().length < 8) fail(`${s.what}: ${host} has no quoted line`);
    hosts.add(host);
  }
  if (hosts.size < 2) fail(`${s.what}: ${hosts.size} host(s), two different hosts are required`);
}
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
const spellings = new Map();
for (const r of rows) if (r.club) spellings.set(norm(r.club), r.club);
const unseen = [];
for (const a of derived.add) {
  for (const club of a.clubs) {
    const table = spellings.get(norm(club));
    if (table && table !== club) fail(`${a.n}: "${club}" is spelled "${table}" in the table`);
    if (!table) unseen.push(`${a.n}: ${club}`);
  }
}
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
