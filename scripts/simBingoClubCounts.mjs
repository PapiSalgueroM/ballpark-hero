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
     4. completeness, a ratchet: every candidate in exactly one of additions,
        agrees, partial and pending; no name twice; pending may only shrink
        (PENDING_MAX below is lowered by every batch that judges men).
     5. sources: every added club and every agrees verdict carries two or more
        sources on different hosts, none crowd edited, each with a url, the
        date read (not after today, not before the fixture) and a quoted line.

   Negative controls (each asserts it changed something, or exits 3):
     BINGO_CLUBS_CONTROL=rule      the Round 669 lists dropped from the rule:
                                   the committed candidates disagree, red.
     BINGO_CLUBS_CONTROL=onesource one sourced entry loses a source: red.
     BINGO_CLUBS_CONTROL=pending   one judged man put back in pending, so
                                   pending grows past PENDING_MAX: red.
     FIXTURE_CONTROL=cap           the stub drops the range and the 1,000 row
                                   cap: at least one man's history changes.
   Exit 0 green, 1 red (or a control that fired), 2 could not run, 3 a control
   that changed nothing.

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
const PENDING_MAX = 69;
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
    if (!candidateSet.has(n) && list !== 'additions') fail(`${n} is in ${list} but is not a candidate`);
  }
}
for (const n of candidates) if (!seen.has(n)) fail(`candidate ${n} is in none of additions, agrees, partial and pending`);
for (const e of record.additions) {
  if (!candidateSet.has(e.name) && e.name !== 'Tyler Morton') fail(`addition ${e.name} is not a candidate`);
}
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
for (const e of record.agrees) sourced.push({ what: `${e.name} (agrees)`, sources: e.sources });
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
