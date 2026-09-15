/* College Grid answer key harness: the key is derived, the boards are proven, and every board finishes offline.

   Round 611. College Grid used to judge every guess through an AI validator
   that runs dry for most of the US day, and a guess it could not confirm was
   never counted, so from 2026-07-31 no board recorded a finish. The page now
   judges in memory against public.college_grid_players, which is
   scripts/data/collegeGridPlayers.json loaded row for row, and the 75 boards
   are dealt from that key by scripts/genCollegeGridBoards.mjs. This fence
   pulls the source tables fresh, rebuilds the key in memory with
   scripts/genCollegeGridData.mjs, and holds:

     1. ROUND ONE IS DERIVED. first_round equals (a pick at most that year's
        firstRoundEnds) for every entry, null where a year has no round two
        rows. The one allowed difference is the generator's own rule: a false
        turns null when a draft row held by nobody carries the same folded
        name and is not past its boundary (measured 2026-09-15: 2 careers).
        Every first rounder has a pick inside his year's first round. Pins:
        Derrick Henry 2016 pick 45 false, Joe Burrow 2020 pick 1 true.
     2. COLLEGES COME FROM TWO SOURCES. Draft against roster agreement, on the
        careers holding both, after entity decoding and the derived aliases,
        is at or above AGREEMENT_FLOOR_PCT. Every alias is backed by at least
        3 careers, recounted here from the raw strings. No school spelling in
        the key carries an undecoded HTML entity or the front half of one.
     3. BOARDS ARE PROVEN. 75 boards, ids cg611-001 to cg611-075, 3x3, the
        closed vocabulary with matching types, no repeated label, at most one
        of Heisman Winner, Top 5 Pick and 1st Overall Pick, no repeated board.
        Every cell holds at least 3 two-source yes answers (distinct folded
        names) and a yes answer who was a first round pick or played 5 or
        more NFL seasons, recomputed here from the fresh key through
        judgeCollegeCell. node scripts/genCollegeGridBoards.mjs --check exits 0.
     4. EVERY BOARD FINISHES OFFLINE, BOTH WAYS. src/test/collegeGridOffline.test.tsx
        drives the REAL useCollegeGrid with the network stubbed to throw: a
        win bot fills 9 of 9 in 9 counted guesses on 75 of 75 boards, a loss
        bot that submits a definite no each time ends 75 of 75 lost at 15.
        The unknown share over a fixed sample is reported.
     5. WRONG REFUSALS STAY FIXED. Deion Sanders x Florida State x Defensive
        Back, Champ Bailey x Georgia x Defensive Back, Rashaan Salaam x
        Colorado x Heisman Winner, Bo Jackson x Auburn x 1st Overall Pick and
        Jalen Hurts x Alabama x Quarterback all judge yes.
     6. HEISMAN IDENTITY. 91 rows for 91 years, 90 winners (Archie Griffin won
        twice), each winner on exactly one entry. A winner with a draft row of
        the same folded name and school shares that entry. Any other entry
        carrying a winner's folded name judges unknown on Heisman Winner.
     7. UNDRAFTED PROBE. Entries marked undrafted whose folded surname and a
        school match a draft row within a year of their first season (a row
        no other career holds) stay at or under UNDRAFTED_PROBE_BASELINE.
     8. TABLE EQUALS FILE. (8a) the committed file's rows equal the fresh
        derivation. (8b) public.college_grid_players row count and a hash of
        its judged columns equal the file. 8b SKIPS LOUDLY while the table
        does not exist or Supabase is unreachable.
     9. ONE DRAFT SLOT, ONE PERSON. No career is split from a draft row of its
        own draft slot (its NFL key draft, or its roster draft number in the
        year before or the year of its first season) held by a non-career
        entry under the same folded surname. The two tables spell some first
        names two ways, and a split lets one spelling cost a guess where the
        other is right, and lets one man fill two cells. Every cell judging
        yes for one half and no for the other is listed. Pins: Nate Gerry
        (the draft table's Nathan Gerry, 2017 pick 184) judges yes on Nebraska
        x Linebacker and Nebraska x Defensive Back.
    10. COLLEGE POSITIONS COUNT. A cfb_qb_stats or cfb_rb_stats row lists the
        position a player held in college. For every row that sits on exactly
        one entry (its folded name is the entry's or a draft row's, and the
        entry's cfb schools hold every school on the row), no school on the
        row judges no on the row's position group. Pins: Matt Jones (Arkansas)
        x Arkansas x Quarterback and Scott Frost x Stanford x Quarterback
        judge yes (college quarterbacks the NFL lists at WR and DB).
    11. A TRANSFER LIST CANNOT INVENT A SCHOOL. A school a career holds only
        inside a roster transfer list ("West Virginia; Florida State"), in no
        single school roster string, draft row, Heisman row or cfb row, that
        the cfb tables cover, is not in colleges when one of his cfb rows
        lists two or more schools without it. Pins: Will Grier judges yes on
        West Virginia x Quarterback and not yes on Florida State x
        Quarterback (his cfb row: Florida, West Virginia).
    12. DRAFT NAMES READ AS NAMES. No name in the key ends in a Hall of Fame
        marker or a lone number (the draft table stores "Paul Warfield HOF"
        and "Matt Snell 3"). Pin: Paul Warfield's 1964 draft row reads as
        Paul Warfield and shares his 1970 to 1977 career's folded name, so
        both carry identityOpen.

   NEGATIVE CONTROLS. Every one runs on EVERY invocation, in memory or against
   copies written under a temp folder that is removed on exit, and each one
   asserts it changed something before its section is judged:
     roundcol      section 1 reads the raw round column instead of the boundary
     entity        the key is rebuilt splitting on semicolons before decoding
     thinalias     an alias no career backs is planted in the alias list
     emptycell     board 1's first row becomes Boise State and its first column
                   1st Overall Pick
     nocount       every verdict the hook sees that is not yes becomes unknown
                   (the world before this round); the loss bot must fail
     window        entries whose first NFL season is before 2000 are dropped
                   (the old prompt's window); the first four pins must fail
     nomerge       the Heisman join is skipped on every drafted winner;
                   Salaam's entry must judge no
     plantdrafted  Joe Burrow is marked undrafted; the probe must list him
     droprow       one row is removed from the file in memory
     noslotjoin    the key is rebuilt without the draft slot join; section 9
                   must list Nate Gerry split from Nathan Gerry
     nocfbpos      the key is rebuilt without the cfb row positions; section
                   10 must charge Matt Jones on Arkansas x Quarterback
     keeplistonly  the key is rebuilt keeping every roster transfer list
                   school; section 11 must list Will Grier at Florida State
     hofname       the raw draft name "Paul Warfield HOF" is planted back on
                   his 1964 draft entry; section 12 must list it
   SIM_CGKEY_CONTROL=<name> runs just that control and exits 0 only if it fired.

   SUPABASE UNREACHABLE: the source pull fails, the harness says NOTHING WAS
   CHECKED and exits 1, which runAllSims files as a skip on a lane with no
   database.

   Run: node scripts/simCollegeGridKey.mjs
*/
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildCollegeKey, COLUMNS, decodeText, foldName, groupsOfListedPosition, pullSources, readDraftName, readKeyFile,
  readPositionGroups, splitColleges, splitSchoolList, toRows,
} from './genCollegeGridData.mjs';
import { cleanDraftPicks, firstRoundEnds, inFirstRound } from './lib/draftRounds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILE = path.join(ROOT, 'scripts', 'data', 'collegeGridPlayers.json');
const OFFLINE_TEST = 'src/test/collegeGridOffline.test.tsx';

/* First run 2026-09-15: 4,269 of 4,349 careers agree (98.16 percent). The
   contract asked for the first run minus 0.5 points (97.66), but the entity
   control only lowers agreement to 4,247 of 4,349 (97.655 percent), 0.005
   points under that line, which is a coin toss. The floor sits halfway
   between the healthy value and the control instead. */
const AGREEMENT_FLOOR_PCT = 97.9;
/* First run 2026-09-15, two listed: DJ Pumphrey, who is Donnel Pumphrey, 2017
   pick 132 (a real miss in the NFL key), and Lavert Hill (Michigan, from
   2022) against Daxton Hill 2022 pick 31, a different Michigan player with
   the same surname. Since the draft slot join, that row sits on the key's Dax
   Hill career, so the probe no longer lists Lavert Hill and the baseline is 1. */
const UNDRAFTED_PROBE_BASELINE = 1;
const ALIAS_MIN_CAREERS = 3;
const MIN_TWO_SOURCE = 3;
const FAME_SEASONS = 5;
const RARE = ['Heisman Winner', 'Top 5 Pick', '1st Overall Pick'];
const TABLE_COLUMNS = ['id', 'display_name', 'name_norm', 'colleges', 'colleges_agreed', 'groups', 'best_pick', 'first_round', 'undrafted', 'heisman_year', 'first_season', 'seasons', 'dup'];
const PINS = [
  ['Deion Sanders', 'Florida State', 'Defensive Back'],
  ['Champ Bailey', 'Georgia', 'Defensive Back'],
  ['Rashaan Salaam', 'Colorado', 'Heisman Winner'],
  ['Bo Jackson', 'Auburn', '1st Overall Pick'],
  ['Jalen Hurts', 'Alabama', 'Quarterback'],
];

const CONTROLS = { roundcol: 1, entity: 2, thinalias: 2, emptycell: 3, nocount: 4, window: 5, nomerge: 6, plantdrafted: 7, droprow: 8, noslotjoin: 9, nocfbpos: 10, keeplistonly: 11, hofname: 12 };
const ONLY = process.env.SIM_CGKEY_CONTROL || '';
if (ONLY && !CONTROLS[ONLY]) {
  console.error(`SIM_CGKEY_CONTROL=${ONLY} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simcgkey-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const pct = (a, b) => (b ? (100 * a) / b : 0);
const show = (list, n = 4) => list.slice(0, n).join('; ') + (list.length > n ? `; and ${list.length - n} more` : '');

// ---------------------------------------------------------------------------
// Load: the source tables, the fresh key, the committed file, the page's judge
// ---------------------------------------------------------------------------

console.log('College Grid answer key: pulling the source tables fresh');
let src;
try {
  src = await pullSources(m => console.log('   ' + m));
} catch (err) {
  abort(`SUPABASE UNREACHABLE: ${String(err.message || err).slice(0, 160)}\nsimCollegeGridKey: NOTHING WAS CHECKED.`);
}
const built = buildCollegeKey(src);
const players = built.players;
const picks = cleanDraftPicks(src.picks);
const ends = firstRoundEnds(picks);
const pickAt = new Map(picks.map(p => [`${p.year}|${p.pick}`, p]));
const aliasMap = list => new Map(list.map(a => [a.from, a.to]));
const canonOf = list => { const m = aliasMap(list); return s => m.get(s) ?? s; };
const canon = canonOf(built.stats.aliases);
const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
console.log(`   fresh key: ${players.length} entries; committed file: ${file.rows.length} rows`);

async function loadModules() {
  const entry = path.join(TMP, 'entry.mjs');
  const bundle = path.join(TMP, 'bundle.mjs');
  const abs = f => path.join(ROOT, f).replaceAll('\\', '/');
  /* The supabase client reads localStorage when it loads and a static import
     is hoisted above the stub, so the modules are imported dynamically. */
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${abs('src/lib/collegeGrid.ts')}');
export const engine = await import('${abs('src/lib/gridEngine.ts')}');
export const puzzles = await import('${abs('src/data/collegeGridPuzzles.ts')}');
`);
  const r = spawnSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${entry}" --bundle --format=esm --platform=node --outfile="${bundle}" --log-level=error`, { shell: true, encoding: 'utf8' });
  if (r.status !== 0) abort(`esbuild could not bundle the College Grid modules:\n${r.stderr || r.stdout}`);
  return import(pathToFileURL(bundle).href);
}
const { lib, engine, puzzles } = await loadModules();
const BOARDS = puzzles.collegeGridPuzzles;

const index = list => lib.indexCollegeEntries(list);
const byDisplay = entries => {
  const m = new Map();
  for (const e of entries) m.set(engine.normalizeGridName(e.name), e);
  return m;
};
const draftFold = p => foldName(readDraftName(p.player_name));
const keyOf = (y, k) => `${y}|${k}`;
const heldBy = list => {
  const m = new Map();
  for (const p of list) for (const [y, k] of p.proof.draft_rows) m.set(keyOf(y, k), p);
  return m;
};

// ---------------------------------------------------------------------------
// The sections, each a function of its inputs so a control can feed it a copy
// ---------------------------------------------------------------------------

function sectionOne(list, rowVerdict) {
  const out = [];
  const held = heldBy(list);
  const unheldByFold = new Map();
  for (const p of picks) {
    if (held.has(keyOf(p.year, p.pick))) continue;
    const f = draftFold(p);
    unheldByFold.set(f, [...(unheldByFold.get(f) ?? []), p]);
  }
  const exempt = [];
  const past = [];
  const mismatch = [];
  for (const p of list) {
    const rows = p.proof.draft_rows;
    const verdicts = rows.map(([y, k]) => rowVerdict(y, k));
    const want = verdicts.some(v => v === true) ? true : (verdicts.length && verdicts.every(v => v === false) ? false : null);
    if (want === true && !rows.some(([y, k]) => inFirstRound(y, k, ends) === true)) past.push(`${p.display_name} ${rows.map(r => r.join(' pick ')).join(', ')}`);
    if (p.first_round === want) continue;
    if (want === false && p.first_round === null
      && (unheldByFold.get(p.name_norm) ?? []).some(r => inFirstRound(r.year, r.pick, ends) !== false)) { exempt.push(p.display_name); continue; }
    mismatch.push(`${p.display_name}: first_round ${p.first_round}, the rule says ${want} (${rows.map(r => r.join(' pick ')).join(', ') || 'no draft row'})`);
  }
  if (mismatch.length) out.push(`${mismatch.length} entries disagree with the round rule: ${show(mismatch)}`);
  if (past.length) out.push(`${past.length} first rounders have no pick inside their year's first round: ${show(past)}`);
  const d = byDisplay(index(list));
  for (const [name, year, pick, want] of [['Derrick Henry', 2016, 45, false], ['Joe Burrow', 2020, 1, true]]) {
    const e = d.get(engine.normalizeGridName(name));
    const raw = e && list.find(p => p.id === e.id);
    const holds = raw && raw.proof.draft_rows.some(([y, k]) => y === year && k === pick);
    const ruleSays = rowVerdict(year, pick);
    if (!raw || !holds || raw.first_round !== want || ruleSays !== want) out.push(`pin ${name}: ${year} pick ${pick} should be first_round ${want}; the key holds ${raw ? `${JSON.stringify(raw.proof.draft_rows)} first_round ${raw.first_round}` : 'no such entry'}, and the rule reads that pick as ${ruleSays}`);
  }
  return { out, exempt };
}

function sectionTwo(key, list) {
  const out = [];
  const a = key.stats.agreement;
  const share = pct(a.afterAliases, a.entries);
  if (share < AGREEMENT_FLOOR_PCT) out.push(`draft against roster agreement is ${a.afterAliases} of ${a.entries} (${share.toFixed(3)} percent), under the ${AGREEMENT_FLOOR_PCT} percent floor`);
  /* Alias support, recounted from the raw strings rather than the generator's count. */
  const careers = new Map(src.careers.map(c => [c.id, c]));
  const rosterRaw = new Map();
  for (const r of src.rosters) {
    if (!r.gsis_id) continue;
    for (const c of splitColleges(r.college)) rosterRaw.set(r.gsis_id, (rosterRaw.get(r.gsis_id) ?? new Set()).add(c));
  }
  const both = [];
  for (const p of list) {
    const c = careers.get(p.id);
    if (!c || !p.proof.draft_rows.length) continue;
    const draft = new Set(p.proof.draft_rows.flatMap(([y, k]) => splitColleges(pickAt.get(keyOf(y, k))?.college)));
    const roster = new Set([...splitColleges(c.college), ...(rosterRaw.get(p.id) ?? [])]);
    if (draft.size && roster.size) both.push({ draft, roster });
  }
  const thin = [];
  for (const al of key.stats.aliases) {
    const n = both.filter(x => x.roster.has(al.from) && x.draft.has(al.to)).length;
    if (n < ALIAS_MIN_CAREERS) thin.push(`${al.from} to ${al.to} (${n} careers)`);
  }
  if (thin.length) out.push(`${thin.length} aliases are backed by fewer than ${ALIAS_MIN_CAREERS} careers: ${show(thin)}`);
  const ENTITY = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+)(;|$)/i;
  const mangled = new Set();
  for (const p of list) {
    for (const s of [...p.colleges, ...p.colleges_agreed, ...p.proof.roster_colleges, ...p.proof.heisman_schools, ...p.proof.cfb_schools]) if (ENTITY.test(s)) mangled.add(s);
  }
  if (mangled.size) out.push(`${mangled.size} school spellings carry an undecoded entity: ${show([...mangled])}`);
  return { out, share, aliases: key.stats.aliases.length, careersWithBoth: both.length };
}

function twoSource(e, proof, school, crit) {
  if (!e.collegesAgreed.includes(school)) return false;
  switch (crit.kind) {
    case 'position': return proof.draft_groups.includes(crit.group) && proof.roster_groups.includes(crit.group);
    case 'firstRound': return proof.roster_pick != null && proof.draft_rows.some(([y, k]) => k === proof.roster_pick && inFirstRound(y, k, ends) === true);
    case 'topPick': return proof.roster_pick != null && proof.roster_pick === e.bestPick;
    case 'heisman': return proof.draft_rows.length > 0 && proof.heisman_schools.includes(school);
    default: return false;
  }
}

function sectionThree(boards, list) {
  const out = [];
  const entries = index(list);
  const proofById = new Map(list.map(p => [p.id, p.proof]));
  const bySchool = new Map();
  for (const e of entries) for (const c of e.colleges) bySchool.set(c, [...(bySchool.get(c) ?? []), e]);
  if (boards.length !== 75) out.push(`${boards.length} boards, the pool is exactly 75`);
  const keys = new Set();
  const two = [];
  boards.forEach((b, i) => {
    const want = `cg611-${String(i + 1).padStart(3, '0')}`;
    if (b.id !== want) out.push(`board ${i + 1} has id ${b.id}, expected ${want}`);
    if (b.rows.length !== 3 || b.cols.length !== 3) out.push(`${b.id}: not 3x3`);
    for (const a of b.rows) { const l = lib.labelOf(a.label); if (!l || l.kind !== 'college' || l.type !== a.type) out.push(`${b.id}: row "${a.label}" (${a.type}) is not a school in the vocabulary`); }
    for (const a of b.cols) { const l = lib.labelOf(a.label); if (!l || l.kind === 'college' || l.type !== a.type) out.push(`${b.id}: column "${a.label}" (${a.type}) is not a criterion in the vocabulary`); }
    const labels = [...b.rows, ...b.cols].map(a => a.label);
    if (new Set(labels).size !== labels.length) out.push(`${b.id}: a label repeats`);
    if (b.cols.filter(a => RARE.includes(a.label)).length > 1) out.push(`${b.id}: more than one of ${RARE.join(', ')}`);
    const k = `${b.rows.map(a => a.label).sort().join('|')} X ${b.cols.map(a => a.label).sort().join('|')}`;
    if (keys.has(k)) out.push(`${b.id}: repeats an earlier board`);
    keys.add(k);
    for (const row of b.rows) {
      for (const col of b.cols) {
        const crit = lib.labelOf(col.label);
        const yes = (bySchool.get(row.label) ?? []).filter(e => lib.judgeCollegeCell(e, row, col) === 'yes');
        const people = new Set(yes.filter(e => crit && twoSource(e, proofById.get(e.id), row.label, crit)).map(e => e.nameNorm));
        const famous = yes.some(e => e.firstRound === true || e.seasons >= FAME_SEASONS);
        two.push(people.size);
        if (people.size < MIN_TWO_SOURCE) out.push(`${b.id} ${row.label} x ${col.label}: ${people.size} two-source yes answers (${yes.length} yes in all), the floor is ${MIN_TWO_SOURCE}`);
        if (!famous) out.push(`${b.id} ${row.label} x ${col.label}: no yes answer was a first rounder or played ${FAME_SEASONS} seasons`);
      }
    }
  });
  const sorted = two.slice().sort((x, y) => x - y);
  return { out, cells: two.length, min: sorted[0], median: sorted[Math.floor(sorted.length / 2)] };
}

function sectionFive(list) {
  const out = [];
  const d = byDisplay(index(list));
  const facts = [];
  for (const [name, row, col] of PINS) {
    const e = d.get(engine.normalizeGridName(name));
    const v = e ? lib.judgeCollegeCell(e, row, col) : 'not in the key';
    if (v !== 'yes') out.push(`${name} x ${row} x ${col} judges ${v}`);
    else facts.push(`${name}: ${e.colleges.join('/')}, pick ${e.bestPick ?? '-'}, heisman ${e.heismanYear ?? '-'}, groups ${[...e.groups].join('/')}`);
  }
  return { out, facts, failed: PINS.filter(([n, r, c]) => { const e = d.get(engine.normalizeGridName(n)); return !e || lib.judgeCollegeCell(e, r, c) !== 'yes'; }).map(p => p[0]) };
}

function heismanWinners() {
  const groups = new Map();
  for (const h of src.heisman) {
    const winner = decodeText(h.winner).trim();
    const fold = foldName(winner);
    const nick = winner.match(/"([^"]+)"/);
    const folds = [...new Set([fold, ...(nick ? [foldName(`${nick[1]} ${winner.replace(/"[^"]*"/g, ' ').trim().split(/\s+/).pop()}`)] : [])])];
    const school = canon(decodeText(h.school).trim());
    const k = `${fold}|${school}`;
    if (!groups.has(k)) groups.set(k, { winner, folds, school, years: [] });
    groups.get(k).years.push(Number(h.year));
  }
  return [...groups.values()];
}

function sectionSix(list) {
  const out = [];
  const winners = heismanWinners();
  const years = new Set(src.heisman.map(h => Number(h.year)));
  if (src.heisman.length !== 91 || years.size !== 91) out.push(`cfb_heisman_winners holds ${src.heisman.length} rows over ${years.size} years; the record is 91 for 91 years, 1935 to 2025`);
  const holders = list.filter(p => p.heisman_year != null);
  if (holders.length !== winners.length) out.push(`${holders.length} entries carry a Heisman year for ${winners.length} winners`);
  const held = heldBy(list);
  let withDraftMatch = 0;
  const entries = index(list);
  const byId = new Map(entries.map(e => [e.id, e]));
  for (const w of winners) {
    const first = Math.min(...w.years);
    const on = holders.filter(p => p.heisman_year === first);
    if (on.length !== 1) { out.push(`${w.winner} (${w.school}, ${w.years.join(' and ')}) sits on ${on.length} entries`); continue; }
    if (!on[0].colleges.includes(w.school)) out.push(`${w.winner}'s entry ${on[0].display_name} does not hold ${w.school}`);
    const rows = picks.filter(p => w.folds.includes(draftFold(p)) && splitColleges(p.college).map(canon).includes(w.school));
    if (!rows.length) continue;
    withDraftMatch += 1;
    const takenBySomeone = rows.some(r => held.has(keyOf(r.year, r.pick)));
    const shares = rows.some(r => on[0].proof.draft_rows.some(([y, k]) => y === Number(r.year) && k === Number(r.pick)));
    if (takenBySomeone && !shares) out.push(`${w.winner} (${w.school} ${first}) does not share an entry with his draft row ${rows.map(r => `${r.year} pick ${r.pick}`).join(', ')}`);
  }
  const winnerFolds = new Set(winners.flatMap(w => w.folds));
  const namesakes = list.filter(p => p.heisman_year == null && winnerFolds.has(p.name_norm));
  for (const p of namesakes) {
    const v = lib.judgeLabel(byId.get(p.id), 'Heisman Winner');
    if (v !== 'unknown') out.push(`${p.display_name} carries a winner's name and judges ${v} on Heisman Winner`);
  }
  return { out, winners: winners.length, withDraftMatch, namesakes: namesakes.length, entries };
}

/** The last word of a name as written, a trailing Jr, Sr, II, III or IV skipped, then folded: Gardner-Johnson stays one surname. */
function surnameOf(name) {
  const words = String(name ?? '').trim().split(/\s+/);
  while (words.length > 1 && ['jr', 'sr', 'ii', 'iii', 'iv'].includes(foldName(words[words.length - 1]))) words.pop();
  return foldName(words[words.length - 1]);
}

function sectionSeven(list) {
  const out = [];
  const bySurname = new Map();
  for (const p of picks) {
    const s = surnameOf(readDraftName(p.player_name));
    bySurname.set(s, [...(bySurname.get(s) ?? []), p]);
  }
  const held = heldBy(list);
  const listed = [];
  for (const e of list) {
    if (!e.undrafted || e.first_season == null || !e.colleges.length) continue;
    const surname = surnameOf(e.name);
    const hit = (bySurname.get(surname) ?? []).find(r => {
      if (Math.abs(Number(r.year) - e.first_season) > 1) return false;
      if (!splitColleges(r.college).map(canon).some(c => e.colleges.includes(c))) return false;
      const holder = held.get(keyOf(r.year, r.pick));
      return !holder || holder.id === e.id || holder.first_season == null;
    });
    if (hit) listed.push(`${e.display_name} (${e.colleges.join('/')}, from ${e.first_season}) against ${readDraftName(hit.player_name)} ${hit.year} pick ${hit.pick}`);
  }
  if (listed.length > UNDRAFTED_PROBE_BASELINE) out.push(`${listed.length} undrafted entries match a draft row, the baseline is ${UNDRAFTED_PROBE_BASELINE}: ${show(listed, 6)}`);
  return { out, listed };
}

/** Careers split from a non-career entry holding a row of the career's own draft slot, under the same folded surname. */
function sectionNine(list) {
  const out = [];
  const entries = index(list);
  const byId = new Map(entries.map(e => [e.id, e]));
  const careers = new Map(src.careers.map(c => [c.id, c]));
  const held = heldBy(list);
  const lastWord = n => n.split(' ').pop();
  const pairs = new Map();
  for (const p of list) {
    if (p.first_season == null) continue;
    const d = careers.get(p.id)?.draft;
    const slots = d && typeof d === 'object' ? [[d.year, d.pick]] : [];
    if (p.proof.roster_pick != null) slots.push([p.first_season - 1, p.proof.roster_pick], [p.first_season, p.proof.roster_pick]);
    for (const [y, k] of slots) {
      const other = held.get(keyOf(y, k));
      if (!other || other.first_season != null || lastWord(other.name_norm) !== lastWord(p.name_norm)) continue;
      pairs.set(`${p.id}|${other.id}`, { p, other, slot: `${y} pick ${k}` });
    }
  }
  const dealt = new Set(BOARDS.flatMap(b => b.rows.flatMap(r => b.cols.map(c => `${r.label}|${c.label}`))));
  const split = [];
  for (const { p, other } of pairs.values()) {
    const a = byId.get(p.id);
    const b = byId.get(other.id);
    for (const s of lib.COLLEGE_LABELS) for (const c of lib.CRITERIA_LABELS) {
      const va = lib.judgeCollegeCell(a, s, c);
      const vb = lib.judgeCollegeCell(b, s, c);
      if ((va === 'no' && vb === 'yes') || (va === 'yes' && vb === 'no')) split.push(`${a.name} ${va}, ${b.name} ${vb} on ${s.label} x ${c.label}${dealt.has(`${s.label}|${c.label}`) ? ' (dealt)' : ''}`);
    }
  }
  if (pairs.size) out.push(`${pairs.size} careers are split from a draft row of their own draft slot under the same surname: ${show([...pairs.values()].map(x => `${x.p.display_name} and ${x.other.display_name} (${x.slot})`), 6)}`);
  if (split.length) out.push(`${split.length} cells judge yes for one half of a split and no for the other: ${show(split, 6)}`);
  const d = byDisplay(entries);
  const gerry = d.get(engine.normalizeGridName('Nate Gerry'));
  for (const col of ['Linebacker', 'Defensive Back']) {
    const v = gerry ? lib.judgeCollegeCell(gerry, 'Nebraska', col) : 'not in the key';
    if (v !== 'yes') out.push(`pin Nate Gerry x Nebraska x ${col} judges ${v}`);
  }
  return { out, pairs: pairs.size, split };
}

/** College positions: a cfb stats row's position never judges no at a school on that row. */
function sectionTen(list) {
  const out = [];
  const entries = index(list);
  const byId = new Map(entries.map(e => [e.id, e]));
  const positionGroups = readPositionGroups();
  let rows = 0;
  const charged = [];
  for (const [id, cfbRows] of cfbRowsByEntry(list)) {
    const e = byId.get(id);
    for (const s of cfbRows) {
      const groups = groupsOfListedPosition(s.pos, positionGroups);
      if (!groups.size) continue;
      rows += 1;
      for (const g of groups) {
        const col = lib.CRITERIA_LABELS.find(l => l.group === g);
        for (const school of s.schoolList.filter(x => lib.labelOf(x)?.kind === 'college')) {
          if (lib.judgeCollegeCell(e, school, col) === 'no') charged.push(`${e.name} x ${school} x ${col.label} (college ${s.pos}, ${s.schools}; key groups ${[...e.groups].join('/')})`);
        }
      }
    }
  }
  const unique = [...new Set(charged)];
  if (unique.length) out.push(`${unique.length} college positions judge no at their own school: ${show(unique, 6)}`);
  const d = byDisplay(entries);
  for (const [name, school] of [['Matt Jones (Arkansas)', 'Arkansas'], ['Scott Frost', 'Stanford']]) {
    const e = d.get(engine.normalizeGridName(name));
    const v = e ? lib.judgeCollegeCell(e, school, 'Quarterback') : 'not in the key';
    if (v !== 'yes') out.push(`pin ${name} x ${school} x Quarterback judges ${v}`);
  }
  return { out, rows, charged: unique };
}

/** The cfb rows sitting on exactly one entry: folded name the entry's or a draft row's, every school inside its cfb schools. */
function cfbRowsByEntry(list) {
  const byFold = new Map();
  for (const p of list) {
    const folds = new Set([p.name_norm, ...p.proof.draft_rows.map(([y, k]) => draftFold(pickAt.get(keyOf(y, k))))]);
    for (const f of folds) byFold.set(f, [...(byFold.get(f) ?? []), p]);
  }
  const out = new Map();
  for (const s of [...src.qb, ...src.rb]) {
    const schools = [...new Set(splitSchoolList(s.schools).map(canon))];
    const on = (byFold.get(foldName(s.player_name)) ?? []).filter(p => schools.every(x => p.proof.cfb_schools.includes(x)));
    if (on.length === 1) out.set(on[0].id, [...(out.get(on[0].id) ?? []), { ...s, schoolList: schools }]);
  }
  return out;
}

/** Schools a career holds only through a roster transfer list, contradicted by his own multi school cfb row. */
function sectionEleven(list) {
  const out = [];
  const singles = new Map();
  const lists = new Map();
  const add = (m, id, s) => m.set(id, (m.get(id) ?? new Set()).add(s));
  for (const r of [...src.rosters.map(x => ({ id: x.gsis_id, college: x.college })), ...src.careers.map(c => ({ id: c.id, college: c.college }))]) {
    if (!r.id) continue;
    const parts = splitColleges(r.college).map(canon);
    for (const s of parts) add(parts.length === 1 ? singles : lists, r.id, s);
  }
  const covered = new Set([...src.qb, ...src.rb].flatMap(s => splitSchoolList(s.schools).map(canon)));
  const cfbOn = cfbRowsByEntry(list);
  const invented = [];
  let listOnly = 0;
  for (const p of list) {
    const draft = new Set(p.proof.draft_rows.flatMap(([y, k]) => splitColleges(pickAt.get(keyOf(y, k))?.college).map(canon)));
    const only = [...(lists.get(p.id) ?? [])].filter(s => !singles.get(p.id)?.has(s) && !draft.has(s) && !p.proof.heisman_schools.includes(s) && !p.proof.cfb_schools.includes(s));
    listOnly += only.length;
    const transfers = (cfbOn.get(p.id) ?? []).filter(s => s.schoolList.length > 1);
    if (!transfers.length) continue;
    for (const s of only.filter(x => covered.has(x) && p.colleges.includes(x))) invented.push(`${p.display_name} at ${s} (roster list only; cfb row ${transfers.map(t => t.schools).join(' | ')})`);
  }
  if (invented.length) out.push(`${invented.length} schools come only from a roster transfer list that the player's own cfb row contradicts: ${show(invented, 6)}`);
  const grier = byDisplay(index(list)).get(engine.normalizeGridName('Will Grier'));
  const fsu = grier ? lib.judgeCollegeCell(grier, 'Florida State', 'Quarterback') : 'not in the key';
  const wvu = grier ? lib.judgeCollegeCell(grier, 'West Virginia', 'Quarterback') : 'not in the key';
  if (fsu === 'yes') out.push('pin Will Grier x Florida State x Quarterback judges yes');
  if (wvu !== 'yes') out.push(`pin Will Grier x West Virginia x Quarterback judges ${wvu}`);
  return { out, listOnly, invented };
}

/** Names in the key carry no Hall of Fame marker and no trailing lone number. */
function sectionTwelve(list) {
  const out = [];
  const marked = list.filter(p => /(HOF|\s\d+)$/.test(p.name) || /(HOF|\s\d+)$/.test(p.display_name.replace(/ \(.*\)$/, '')));
  if (marked.length) out.push(`${marked.length} names in the key still carry a marker: ${show(marked.map(p => `${p.display_name} [${p.id}]`), 6)}`);
  const raw = src.picks.filter(p => /(HOF|\s\d+)$/.test(String(p.player_name ?? '').trim())).length;
  const entries = index(list);
  const warfield = entries.filter(e => e.nameNorm === 'paul warfield');
  const draftRow = warfield.find(e => e.id === 'draft:1964-11');
  if (!draftRow || !warfield.some(e => e.firstSeason !== null) || !warfield.every(e => e.identityOpen)) {
    out.push(`pin Paul Warfield: the key holds ${warfield.map(e => `${e.name} [${e.id}] identityOpen ${e.identityOpen}`).join('; ') || 'no paul warfield'}; the 1964 draft entry and the career should share the folded name and both be open`);
  }
  return { out, raw, marked };
}

const judgedHash = rows => {
  const canonRows = rows.map(r => TABLE_COLUMNS.map(c => r[c] ?? null)).sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  return crypto.createHash('sha256').update(JSON.stringify(canonRows)).digest('hex').slice(0, 16);
};

function sectionEightA(fileRows) {
  const out = [];
  if (JSON.stringify(file.columns) !== JSON.stringify(COLUMNS)) out.push('the committed file does not carry the columns the generator writes');
  const derived = toRows(players);
  if (fileRows.length !== derived.length) out.push(`the committed file holds ${fileRows.length} rows and the fresh derivation ${derived.length}`);
  else if (JSON.stringify(fileRows) !== JSON.stringify(derived)) {
    const diff = fileRows.findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(derived[i]));
    out.push(`the committed file differs from the fresh derivation from row ${diff} (${String(fileRows[diff]?.[0])}); run node scripts/genCollegeGridData.mjs`);
  }
  return { out };
}

const REST = (() => {
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
  return { url, headers: { apikey: key, authorization: `Bearer ${key}` } };
})();

/** The table's rows, or { skip } naming why they could not be read. */
async function readTable() {
  let res;
  try {
    res = await fetch(`${REST.url}/rest/v1/college_grid_players?select=id&limit=1`, { headers: REST.headers, signal: AbortSignal.timeout(20000) });
  } catch (err) {
    return { skip: `Supabase is unreachable (${String(err).slice(0, 80)})` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404 || /PGRST205|42P01|does not exist|Could not find the table/i.test(body)) return { skip: 'public.college_grid_players does not exist yet (the Round 611 migration is written but not applied)' };
    return { error: `HTTP ${res.status}: ${body.slice(0, 160)}` };
  }
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${REST.url}/rest/v1/college_grid_players?select=${TABLE_COLUMNS.join(',')}&order=id.asc&offset=${from}&limit=1000`, { headers: REST.headers });
    if (!r.ok) return { error: `HTTP ${r.status} on the page from ${from}` };
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { rows };
}

function sectionEightB(table, fileRows) {
  const out = [];
  const asObjects = fileRows.map(r => Object.fromEntries(COLUMNS.map((c, i) => [c, r[i]])));
  if (table.rows.length !== asObjects.length) out.push(`the table holds ${table.rows.length} rows and the file ${asObjects.length}`);
  const a = judgedHash(table.rows);
  const b = judgedHash(asObjects);
  if (a !== b) out.push(`the judged columns hash to ${a} in the table and ${b} in the file`);
  return { out, hash: b };
}

// ---------------------------------------------------------------------------
// Section 4 helpers: the offline suite and the unknown share
// ---------------------------------------------------------------------------

function runOffline(control) {
  const report = path.join(TMP, `offline-${control || 'plain'}.json`);
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.CG_OFFLINE_CONTROL;
  if (control) env.CG_OFFLINE_CONTROL = control;
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', OFFLINE_TEST, '--reporter=json', `--outputFile.json=${report}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(report)) return { error: text.slice(-2000) };
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  const tests = new Map();
  for (const f of json.testResults || []) for (const t of f.assertionResults || []) tests.set((t.title.match(/^\((4[ab])\)/) || [])[1], t.status);
  return { tests, notes: [...text.matchAll(/CGOFFLINE\| (.+)/g)].map(m => m[1].trim()) };
}

function unknownShare() {
  const entries = index(players);
  const bySchool = new Map();
  for (const e of entries) for (const c of e.colleges) bySchool.set(c, [...(bySchool.get(c) ?? []), e]);
  const tally = { yes: 0, no: 0, unknown: 0 };
  for (const b of BOARDS) for (const row of b.rows) for (const col of b.cols) {
    for (const e of bySchool.get(row.label) ?? []) tally[lib.judgeCollegeCell(e, row, col)] += 1;
  }
  const n = tally.yes + tally.no + tally.unknown;
  return `every entry holding the row's school, over all ${BOARDS.length * 9} dealt cells: ${n} verdicts, yes ${pct(tally.yes, n).toFixed(1)}, no ${pct(tally.no, n).toFixed(1)}, unknown ${pct(tally.unknown, n).toFixed(1)} percent`;
}

// ---------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------

const derivedVerdict = (y, k) => inFirstRound(y, k, ends);
let tableRead = null;

if (!ONLY) {
  console.log('\n1) Round one is derived: first_round follows the boundary, never the raw round column');
  {
    const r = sectionOne(players, derivedVerdict);
    r.out.forEach(fail);
    const nullYears = [...ends].filter(([, e]) => e === null).map(([y]) => y);
    console.log(`   ${players.length} entries checked; ${[...ends].filter(([y, e]) => y >= 1970 && e !== null).length} drafts from 1970 carry a boundary; ${nullYears.length} years have none (${nullYears[0]} to ${nullYears[nullYears.length - 1]})`);
    console.log(`   false withheld to null by a same-name draft row nobody holds: ${r.exempt.length} (${r.exempt.join(', ')})`);
    console.log('   pins: Derrick Henry 2016 pick 45 not a first rounder, Joe Burrow 2020 pick 1 a first rounder');
  }

  console.log('\n2) Colleges come from two sources: agreement, alias support, no entity remnants');
  {
    const r = sectionTwo(built, players);
    r.out.forEach(fail);
    const a = built.stats.agreement;
    console.log(`   agreement ${a.afterAliases} of ${a.entries} (${r.share.toFixed(2)} percent; stored strings ${a.raw}, decoded and split ${a.beforeAliases}); floor ${AGREEMENT_FLOOR_PCT}`);
    console.log(`   ${r.aliases} derived aliases, each recounted over ${r.careersWithBoth} careers with both a draft and a roster college`);
  }

  console.log('\n3) Boards are proven: shape, vocabulary, and every cell recomputed from the fresh key');
  {
    const r = sectionThree(BOARDS, players);
    r.out.forEach(fail);
    console.log(`   ${BOARDS.length} boards, ${r.cells} cells; two-source answers per cell min ${r.min}, median ${r.median}`);
    const check = spawnSync(process.execPath, ['scripts/genCollegeGridBoards.mjs', '--check'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const last = ((check.stdout || '') + (check.stderr || '')).trim().split('\n').pop();
    if (check.status !== 0) fail(`genCollegeGridBoards --check exited ${check.status}: ${last}`);
    console.log(`   genCollegeGridBoards --check exited ${check.status}: ${last}`);
  }

  console.log('\n4) Every board finishes offline, both ways, through the real hook (vitest, network stubbed to throw)');
  {
    const r = runOffline('');
    if (r.error) fail(`the offline suite produced no report:\n${r.error}`);
    else {
      for (const n of r.notes) console.log(`   ${n}`);
      if (r.tests.get('4a') !== 'passed') fail(`the win bot test is ${r.tests.get('4a') ?? 'missing'}`);
      if (r.tests.get('4b') !== 'passed') fail(`the loss bot test is ${r.tests.get('4b') ?? 'missing'}`);
      if (!r.notes.some(n => /^win: 75 of 75/.test(n)) || !r.notes.some(n => /^loss: 75 of 75/.test(n))) fail('the offline suite did not print both 75 of 75 measurements, so a test returned without measuring');
    }
    console.log(`   unknown share (fixed sample): ${unknownShare()}`);
  }

  console.log('\n5) Wrong refusals stay fixed');
  {
    const r = sectionFive(players);
    r.out.forEach(fail);
    for (const f of r.facts) console.log(`   yes  ${f}`);
  }

  console.log('\n6) Heisman identity: one entry per winner, joined to his draft row, namesakes never no');
  {
    const r = sectionSix(players);
    r.out.forEach(fail);
    console.log(`   ${src.heisman.length} rows, ${r.winners} winners; ${r.withDraftMatch} winners have a folded-name draft row at their school; ${r.namesakes} other entries carry a winner's name`);
  }

  console.log('\n7) Undrafted probe');
  {
    const r = sectionSeven(players);
    r.out.forEach(fail);
    console.log(`   ${r.listed.length} listed (baseline ${UNDRAFTED_PROBE_BASELINE}): ${r.listed.join('; ') || 'none'}`);
  }

  console.log('\n8) Table equals file');
  {
    const a = sectionEightA(file.rows);
    a.out.forEach(fail);
    console.log(`   8a: the committed file's ${file.rows.length} rows ${a.out.length ? 'DIFFER from' : 'equal'} the fresh derivation`);
    tableRead = await readTable();
    if (tableRead.skip) console.log(`   8b: SKIPPED, NOT CHECKED: ${tableRead.skip}. The table's row count and judged-column hash were not compared with the file.`);
    else if (tableRead.error) fail(`8b: the table could not be read: ${tableRead.error}`);
    else {
      const b = sectionEightB(tableRead, file.rows);
      b.out.forEach(fail);
      console.log(`   8b: the table holds ${tableRead.rows.length} rows; judged columns hash ${b.hash} in the file`);
    }
  }

  console.log('\n9) One draft slot, one person: no career split from a draft row of its own slot');
  {
    const r = sectionNine(players);
    r.out.forEach(fail);
    console.log(`   ${r.pairs} splits, ${r.split.length} yes and no cells between halves; ${built.stats.joins.slot} rows joined on their draft slot; pins: Nate Gerry yes on Nebraska x Linebacker and x Defensive Back`);
  }

  console.log('\n10) College positions count: a cfb stats row\'s position never judges no at its own school');
  {
    const r = sectionTen(players);
    r.out.forEach(fail);
    console.log(`   ${r.rows} cfb rows with a position group sit on one entry; ${r.charged.length} judge no; pins: Matt Jones (Arkansas) and Scott Frost yes at Quarterback`);
  }

  console.log('\n11) A transfer list cannot invent a school: roster list only schools contradicted by his cfb row stay out');
  {
    const r = sectionEleven(players);
    r.out.forEach(fail);
    console.log(`   ${r.listOnly} schools sit only in a roster transfer list; ${r.invented.length} contradicted ones kept; the generator left out: ${built.stats.contradictedColleges.join(', ') || 'none'}; pins: Will Grier yes at West Virginia, not yes at Florida State`);
  }

  console.log('\n12) Draft names read as names: no Hall of Fame marker or lone number in the key');
  {
    const r = sectionTwelve(players);
    r.out.forEach(fail);
    console.log(`   ${r.raw} raw draft names end in a marker; ${r.marked.length} names in the key do; pin: Paul Warfield's 1964 row and career share a folded name, both open`);
  }
}

// ---------------------------------------------------------------------------
// The negative controls, every one on every run
// ---------------------------------------------------------------------------

const fired = [];
const dead = [];
const grade = (name, ok, detail) => {
  if (ok) { fired.push(name); console.log(`   fired: ${detail}`); } else { dead.push(name); fail(`control ${name} changed nothing it should have: ${detail}`); }
};
const mustChange = (name, changed, what) => {
  if (!changed) abort(`control ${name} cannot run: ${what}, so it would prove nothing`);
};
const clonePlayers = () => players.map(p => ({ ...p, proof: { ...p.proof } }));
const want = name => !ONLY || ONLY === name;

console.log('\nNegative controls');

if (want('roundcol')) {
  console.log('\nroundcol) section 1 reads the raw round column instead of the boundary');
  const raw = (y, k) => Number(pickAt.get(keyOf(y, k))?.round) === 1;
  const disagree = picks.filter(p => inFirstRound(p.year, p.pick, ends) !== null && raw(p.year, p.pick) !== inFirstRound(p.year, p.pick, ends)).length;
  mustChange('roundcol', disagree > 0, 'the raw round column agrees with the boundary on every row');
  const past1970 = picks.filter(p => Number(p.year) >= 1970 && Number(p.round) === 1 && ends.get(Number(p.year)) != null && Number(p.pick) > ends.get(Number(p.year))).length;
  console.log(`   ${disagree} draft rows read differently; ${past1970} rows from 1970 on are marked round 1 past their boundary`);
  const r = sectionOne(players, raw);
  grade('roundcol', r.out.some(m => /first rounders have no pick inside/.test(m)) && r.out.some(m => /disagree with the round rule/.test(m)), r.out.map(m => m.slice(0, 150)).join(' | ') || 'section 1 stayed green');
}

if (want('entity')) {
  console.log('\nentity) the key rebuilt splitting on semicolons before decoding');
  const strings = [...src.picks.map(p => p.college), ...src.rosters.map(r => r.college), ...src.careers.map(c => c.college)].filter(s => s != null);
  const differ = strings.filter(s => JSON.stringify(splitColleges(s, { decodeFirst: false })) !== JSON.stringify(splitColleges(s))).length;
  mustChange('entity', differ > 0, 'no source college string splits differently in the wrong order');
  let wrong;
  try { wrong = buildCollegeKey(src, { control: { decodeFirst: false } }); } catch (err) { wrong = null; fail(`control entity: the wrong-order build threw: ${err.message}`); }
  if (wrong) {
    const r = sectionTwo(wrong, wrong.players);
    console.log(`   ${differ} source strings split differently; agreement falls to ${wrong.stats.agreement.afterAliases} of ${wrong.stats.agreement.entries} (${r.share.toFixed(3)} percent)`);
    grade('entity', r.out.some(m => /under the .* floor/.test(m)) && r.out.some(m => /undecoded entity/.test(m)), r.out.map(m => m.slice(0, 150)).join(' | ') || 'section 2 stayed green');
  }
}

if (want('thinalias')) {
  console.log('\nthinalias) an alias no career backs is planted in the alias list');
  const planted = { ...built, stats: { ...built.stats, aliases: [...built.stats.aliases, { from: 'Boise State', to: 'Texas', entries: 99, of: 99 }] } };
  mustChange('thinalias', planted.stats.aliases.length === built.stats.aliases.length + 1 && !built.stats.aliases.some(a => a.from === 'Boise State'), 'the alias list already maps Boise State');
  const r = sectionTwo(planted, players);
  grade('thinalias', r.out.some(m => /Boise State to Texas \(0 careers\)/.test(m)), r.out.map(m => m.slice(0, 150)).join(' | ') || 'section 2 stayed green');
}

if (want('emptycell')) {
  console.log('\nemptycell) board 1: first row Boise State, first column 1st Overall Pick');
  const boards = BOARDS.map(b => ({ ...b, rows: [...b.rows], cols: [...b.cols] }));
  const b0 = boards[0];
  mustChange('emptycell', b0.rows[0].label !== 'Boise State' || b0.cols[0].label !== '1st Overall Pick', 'board 1 already opens on that cell');
  b0.rows[0] = { label: 'Boise State', type: 'college' };
  b0.cols[0] = { label: '1st Overall Pick', type: 'draft' };
  const r = sectionThree(boards, players);
  grade('emptycell', r.out.some(m => /^cg611-001 Boise State x 1st Overall Pick: 0 two-source/.test(m)), r.out.filter(m => /Boise State/.test(m)).map(m => m.slice(0, 150)).join(' | ') || 'section 3 stayed green');
}

if (want('nocount')) {
  console.log('\nnocount) every verdict the hook sees that is not yes becomes unknown; the loss bot must fail');
  const r = runOffline('nocount');
  if (r.error) fail(`control nocount: the offline suite produced no report:\n${r.error}`);
  else {
    for (const n of r.notes) console.log(`   ${n}`);
    const flipped = Number((r.notes.join(' ').match(/control nocount: (\d+) no verdicts/) || [])[1] || 0);
    mustChange('nocount', flipped > 0, 'the wrapped judge turned no verdict into unknown');
    if (r.tests.get('4a') !== 'passed') fail(`control nocount: the win bot went red too (${r.tests.get('4a')}), but yes verdicts are untouched`);
    grade('nocount', r.tests.get('4b') === 'failed' && r.notes.some(n => /^loss: 0 of 75/.test(n)), `loss bot test ${r.tests.get('4b')}`);
  }
}

if (want('window')) {
  console.log('\nwindow) entries whose first NFL season is before 2000 are dropped');
  const kept = players.filter(p => p.first_season == null || p.first_season >= 2000);
  mustChange('window', kept.length < players.length, 'no entry starts before 2000');
  console.log(`   ${players.length - kept.length} entries dropped`);
  const r = sectionFive(kept);
  const firstFour = PINS.slice(0, 4).map(p => p[0]);
  grade('window', firstFour.every(n => r.failed.includes(n)) && !r.failed.includes('Jalen Hurts'), `now failing: ${r.failed.join(', ') || 'none'}`);
}

if (want('nomerge')) {
  console.log('\nnomerge) the Heisman join skipped on every drafted winner');
  const list = clonePlayers();
  let skipped = 0;
  for (const p of list) {
    if (p.heisman_year == null || !p.proof.draft_rows.length) continue;
    p.heisman_year = null;
    p.proof.heisman_schools = [];
    skipped += 1;
  }
  mustChange('nomerge', skipped > 0, 'no drafted entry carries a Heisman year');
  const r = sectionSix(list);
  const salaam = byDisplay(r.entries).get(engine.normalizeGridName('Rashaan Salaam'));
  const verdict = salaam ? lib.judgeLabel(salaam, 'Heisman Winner') : 'missing';
  console.log(`   ${skipped} joins skipped; Rashaan Salaam's entry now judges ${verdict} on Heisman Winner`);
  grade('nomerge', r.out.some(m => /Rashaan Salaam .* sits on 0 entries/.test(m)) && verdict === 'no', r.out.filter(m => /Salaam/.test(m)).join(' | ') || 'section 6 stayed green');
}

if (want('plantdrafted')) {
  console.log('\nplantdrafted) Joe Burrow marked undrafted');
  const list = clonePlayers();
  const burrow = list.find(p => p.display_name === 'Joe Burrow');
  mustChange('plantdrafted', burrow && burrow.undrafted === false, 'Joe Burrow is not a drafted entry in the key');
  burrow.undrafted = true;
  const r = sectionSeven(list);
  grade('plantdrafted', r.out.length > 0 && r.listed.some(l => l.startsWith('Joe Burrow ')), r.listed.join('; ') || 'the probe listed nobody');
}

if (want('droprow')) {
  console.log('\ndroprow) one row removed from the file in memory');
  const rows = file.rows.slice(1);
  mustChange('droprow', rows.length === file.rows.length - 1 && file.rows.length > 0, 'the file has no rows');
  const a = sectionEightA(rows);
  grade('droprow', a.out.length > 0, `8a: ${a.out.join(' | ') || 'stayed green'}`);
  if (!tableRead) tableRead = await readTable();
  if (tableRead.skip) console.log(`   8b under droprow: SKIPPED, NOT CHECKED: ${tableRead.skip}`);
  else if (!tableRead.error) {
    const b = sectionEightB(tableRead, rows);
    if (!b.out.length) fail('control droprow: 8b stayed green against a file one row short');
    else console.log(`   fired in 8b too: ${b.out.join(' | ')}`);
  }
}

if (want('noslotjoin')) {
  console.log('\nnoslotjoin) the key rebuilt without the draft slot join');
  const wrong = buildCollegeKey(src, { control: { noSlotJoin: true } });
  mustChange('noslotjoin', built.stats.joins.slot > 0 && wrong.stats.joins.slot === 0 && wrong.players.length > players.length, 'the plain build joins no row on its draft slot');
  const r = sectionNine(wrong.players);
  console.log(`   ${wrong.players.length - players.length} more entries; ${r.pairs} splits, ${r.split.length} yes and no cells between halves`);
  grade('noslotjoin', r.pairs > 0 && r.split.some(m => /^Nate Gerry no, Nathan Gerry yes on Nebraska x Defensive Back/.test(m)) && r.out.some(m => /^pin Nate Gerry x Nebraska x Defensive Back judges no/.test(m)), r.out.map(m => m.slice(0, 200)).join(' | ') || 'section 9 stayed green');
}

if (want('nocfbpos')) {
  console.log('\nnocfbpos) the key rebuilt without the cfb row positions');
  const wrong = buildCollegeKey(src, { control: { noCfbGroups: true } });
  const changed = wrong.players.filter((p, i) => JSON.stringify(p.groups) !== JSON.stringify(players[i]?.groups)).length;
  mustChange('nocfbpos', changed > 0, 'no entry holds a group from a cfb row');
  const r = sectionTen(wrong.players);
  console.log(`   ${changed} entries lose a group; ${r.charged.length} college positions now judge no`);
  grade('nocfbpos', r.charged.some(m => /^Matt Jones \(Arkansas\) x Arkansas x Quarterback/.test(m)) && r.out.some(m => /^pin Scott Frost x Stanford x Quarterback judges no/.test(m)), r.out.map(m => m.slice(0, 200)).join(' | ') || 'section 10 stayed green');
}

if (want('keeplistonly')) {
  console.log('\nkeeplistonly) the key rebuilt keeping every roster transfer list school');
  const wrong = buildCollegeKey(src, { control: { keepListOnly: true } });
  mustChange('keeplistonly', built.stats.contradictedColleges.length > 0 && wrong.stats.contradictedColleges.length === 0, 'the plain build leaves no roster list school out');
  const r = sectionEleven(wrong.players);
  console.log(`   ${r.invented.length} contradicted schools kept`);
  grade('keeplistonly', r.invented.some(m => /^Will Grier at Florida State/.test(m)) && r.out.some(m => /^pin Will Grier x Florida State x Quarterback judges yes/.test(m)), r.out.map(m => m.slice(0, 200)).join(' | ') || 'section 11 stayed green');
}

if (want('hofname')) {
  console.log('\nhofname) "Paul Warfield HOF" planted back on his 1964 draft entry');
  const list = clonePlayers();
  const row = list.find(p => p.id === 'draft:1964-11');
  const rawName = String(src.picks.find(p => Number(p.year) === 1964 && Number(p.pick) === 11)?.player_name ?? '').trim();
  mustChange('hofname', row && rawName === 'Paul Warfield HOF' && row.name !== rawName, `draft:1964-11 is ${row ? row.name : 'missing'} and the raw row reads ${JSON.stringify(rawName)}`);
  row.name = rawName;
  row.display_name = rawName;
  row.name_norm = foldName(rawName);
  const r = sectionTwelve(list);
  grade('hofname', r.marked.some(p => p.id === 'draft:1964-11') && r.out.some(m => /^pin Paul Warfield/.test(m)), r.out.map(m => m.slice(0, 200)).join(' | ') || 'section 12 stayed green');
}

// ---------------------------------------------------------------------------

console.log('');
if (ONLY) {
  if (dead.length || failures > 0) abort(`control "${ONLY}": did NOT fire where it should, the check is dead`);
  console.log(`control "${ONLY}": fired in section ${CONTROLS[ONLY]} as expected, the check works`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`simCollegeGridKey: red, ${failures} failure${failures === 1 ? '' : 's'} above.`);
  process.exit(1);
}
const skipNote = tableRead?.skip ? ` Section 8b SKIPPED (${tableRead.skip}).` : '';
console.log(`simCollegeGridKey: green. The key is derived from its tables, all 75 boards are proven and finish offline both ways, and all ${fired.length} controls fired.${skipNote}`);
