/* scripts/simCollegeGridShipped.mjs  (Round 1105)

   College Grid's answer key, as it SHIPS. From Round 1105 the page no longer
   pages public.college_grid_players (36 reads and 9,462,264 bytes decoded
   before the board showed, measured live 2026-10-07). Two compact files
   generated from scripts/data/collegeGridPlayers.json ride in the build and
   the browser judges and searches from them. This harness reads COMMITTED
   FILES ONLY. It makes no request, so runAllSims can never file it as a skip
   the way it files the database harness (scripts/simCollegeGridKey.mjs) when
   the database is out of reach.

   WHAT THIS HOLDS:
     1. NONE OF THE THIRTEEN SHIPS. No key row sits at draft:1977-<pick> under
        a name on AUDITED_OUT (scripts/genCollegeGridData.mjs), no search name
        is one of the thirteen unless a row that is not on the list carries it,
        and the list's thirteen names are the thirteen the Round 706 migration
        deletes, read out of its DELETE statement (code, not its comment).
     2. THE COMPACT FILES ARE THE KEY. decodeCollegeKey returns exactly the
        key's rows; matched on display name (unique, asserted), every decoded
        row equals the key row's seven judged columns and its two flags equal
        what indexCollegeEntries sets on the full rows; and every entry is
        judged on all 57 labels both ways with the same verdict.
     3. NOTHING MOVED FOR ANYONE WHO STAYED (recorded before). The verdict
        matrix of the kept rows, through the edited lib over the filtered key
        AND through the decoded files, hashes to what record mode wrote from
        the untouched lib over the untouched key.
     4. NOT STALE. renderCompact(committed key) is byte equal to both files.
     5. EVERY BOARD KEEPS ITS ANSWERS. Each of the 675 cells' yes names, from
        the decoded entries, hash to the recorded value (so the only answers
        that left are the recorded audited ones). And, with the generator's
        own rule (cellAnswers, MIN_TWO_SOURCE and canFillAll imported from
        scripts/genCollegeGridBoards.mjs, no second copy): every dealt cell
        clears the floor, every board can be filled by nine different players
        and the committed boards file is what the generator would write.
     6. A BUDGET. Raw and gzip level 9 bytes of each file and of the pair, and
        the CPU time of parse plus decode plus index (median of 7), each under
        a ceiling set from measured headroom (the constants below).
     7. THE SOURCE STAGE. buildCollegeKey over a small synthetic source drops
        the audited row at 1977 pick 320 and keeps a different name at the
        same pick.
     8. THE DOOR AND FAIL CLOSED, THROUGH THE REAL HOOK. Runs
        src/test/collegeGridFailClosed.test.tsx, which must pass, and again
        under each of its two controls, which must fail the cases they aim at
        with their marker line showing a count above zero. Plain run only.

   SECTIONS 3 AND THE HASH HALF OF 5 RETIRE WHEN THE KEY MOVES. They are a
   before and after proof for one round. The fixture stores the sha256 of the
   kept key rows it was recorded from. While the committed key hashes to that,
   both are graded. When a later round refreshes the key on purpose (Round
   1110: the 2026 class, the split legends) the harness prints one loud line,
   lists it in the summary and grades the rest. That round deletes the two
   sections and the fixture in the commit that refreshes the key.

   RECORD MODE (SIM_CGSHIPPED_RECORD=1) was run ONCE, in the round's first
   commit (7c498b0a), over the untouched lib and the untouched key, and wrote
   scripts/data/collegeGridRecorded1105.json. It refuses to run while that
   file exists.

   NEGATIVE CONTROLS (SIM_CGSHIPPED_CONTROL=<name>, all in memory, the files on
   disk never written; each run exits 0 only when its sections went red):
     auditedback  one audited row and its name planted back (refuses if there)   1
     flipflag     one decoded undrafted bit flipped                              2
     shiftrow     the judge columns rotated one row against the names            2, 3
     stale        one character of one name changed in the search text           4
     fat          the search text padded by 30 percent                           6
     noexclude    section 7 run with the generator's noAuditExclusion flag       7

   Run: node scripts/simCollegeGridShipped.mjs
*/
import { createHash } from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import {
  AUDITED_OUT, JUDGE_OUT, SEARCH_OUT, buildCollegeKey, dropAuditedRows, foldName, readKeyFile, readPositionGroups, renderCompact,
} from './genCollegeGridData.mjs';
import { MIN_TWO_SOURCE, OUT as BOARDS_OUT, canFillAll, cellAnswers, dealBoards, renderBoards } from './genCollegeGridBoards.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILE = path.join(ROOT, 'scripts', 'data', 'collegeGridPlayers.json');
const RECORDED = path.join(ROOT, 'scripts', 'data', 'collegeGridRecorded1105.json');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260930120000_round_706_nfl_draft_picks.sql');
const FAILCLOSED_TEST = 'src/test/collegeGridFailClosed.test.tsx';

/* THE BUDGET. Measured 2026-10-07 on the committed files (35,598 rows):
     search  599,136 raw   205,231 gzip 9
     judge   542,050 raw   133,308 gzip 9
     pair  1,141,186 raw   338,539 gzip 9
   Byte ceilings are 1.15 times those, rounded up to a thousand. What the page
   read before this round, for scale: the key file is 6,233,432 raw and
   1,241,950 gzip; the page's 36 table reads decoded 9,462,264 bytes.
   CPU ceiling: parse plus decode plus index, process.cpuUsage() (user plus
   system) around the synchronous work, median of 7. Seven runs of this harness
   on 2026-10-07 with a dozen other agents on the machine gave medians of
   CPU_MEASURED_MS; the ceiling is 3 times the middle one. CPU time, not wall
   time, so a busy machine cannot turn it red. */
const BYTES = {
  searchRaw: 690_000, searchGzip: 237_000,
  judgeRaw: 624_000, judgeGzip: 154_000,
  pairRaw: 1_313_000, pairGzip: 390_000,
};
const OLD_KEY = { raw: 6_233_432, gzip: 1_241_950, decodedByPage: 9_462_264, reads: 36 };
const CPU_MEASURED_MS = '312, 344, 374, 375, 407, 438, 469';
const CPU_CEILING_MS = 1150;

const CONTROLS = { auditedback: [1], flipflag: [2], shiftrow: [2, 3], stale: [4], fat: [6], noexclude: [7] };
const CONTROL = process.env.SIM_CGSHIPPED_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_CGSHIPPED_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

const sha = (text) => createHash('sha256').update(text).digest('hex');
const gz = (text) => zlib.gzipSync(Buffer.from(text, 'utf8'), { level: 9 }).length;
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const median = (list) => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];
const num = (n) => n.toLocaleString('en-US');

/** The page's own lib, engine and the 75 boards, bundled into a fresh folder (never a fixed temp name). */
async function loadPage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgshipped-'));
  const entry = path.join(dir, 'entry.mjs');
  const outfile = path.join(dir, 'bundle.mjs');
  const at = (rel) => path.join(ROOT, rel).replaceAll('\\', '/');
  /* The supabase client reads localStorage when the module loads, and a static
     import is hoisted above the stub, so everything is imported dynamically. */
  fs.writeFileSync(entry, [
    'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
    `export const lib = await import('${at('src/lib/collegeGrid.ts')}');`,
    `export const engine = await import('${at('src/lib/gridEngine.ts')}');`,
    `export const puzzles = (await import('${at('src/data/collegeGridPuzzles.ts')}')).collegeGridPuzzles;`,
    '',
  ].join('\n'));
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(outfile).href);
}

const CODE = { yes: 'y', no: 'n', unknown: 'u' };

/** One character per label per entry, in the order given. */
function verdictMatrix(lib, ordered) {
  const counts = { yes: 0, no: 0, unknown: 0 };
  let text = '';
  for (const e of ordered) {
    for (const l of lib.LABELS) {
      const v = lib.judgeLabel(e, l.label);
      counts[v] += 1;
      text += CODE[v];
    }
  }
  return { hash: sha(text), rows: ordered.length, counts };
}

const inIdOrder = (entries) => entries.slice().sort((a, b) => byCodeUnit(a.id, b.id));

/** The sorted distinct display names that are a yes for one cell. */
function cellYesNames(lib, entries, row, col) {
  const names = new Set();
  for (const e of entries) if (lib.judgeCollegeCell(e, row, col) === 'yes') names.add(e.name);
  return [...names].sort(byCodeUnit);
}

const auditedId = (a) => `draft:${a.year}-${a.pick}`;

async function record() {
  if (fs.existsSync(RECORDED)) {
    console.error(`REFUSED: ${path.relative(ROOT, RECORDED)} already exists. The before was recorded once, on the untouched code, and is never rewritten.`);
    process.exit(2);
  }
  const { lib, puzzles } = await loadPage();
  const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  const entries = lib.indexCollegeEntries(readKeyFile(file));
  const auditedIds = new Set(AUDITED_OUT.map(auditedId));
  const auditedNames = new Set(AUDITED_OUT.map((a) => a.name));
  for (const a of AUDITED_OUT) {
    const e = entries.find((x) => x.id === auditedId(a));
    if (!e || foldName(e.name) !== foldName(a.name)) throw new Error(`the untouched key does not hold ${a.name} at ${auditedId(a)}; nothing was recorded`);
  }
  const full = verdictMatrix(lib, inIdOrder(entries));
  const kept = verdictMatrix(lib, inIdOrder(entries.filter((e) => !auditedIds.has(e.id))));
  const cells = {};
  const auditedAnswers = [];
  for (const p of puzzles) {
    p.rows.forEach((row, r) => p.cols.forEach((col, c) => {
      const yes = cellYesNames(lib, entries, row.label, col.label);
      for (const n of yes) if (auditedNames.has(n)) auditedAnswers.push({ board: p.id, row: row.label, col: col.label, name: n });
      const keptNames = yes.filter((n) => !auditedNames.has(n));
      cells[`${p.id}|${r}|${c}`] = { hash: sha(JSON.stringify(keptNames)), count: keptNames.length };
    }));
  }
  const keptRows = file.rows.filter((r) => !auditedIds.has(r[0]));
  const out = {
    round: 1105,
    what: 'The before of Round 1105, recorded by scripts/simCollegeGridShipped.mjs (SIM_CGSHIPPED_RECORD=1) from the untouched src/lib/collegeGrid.ts over the untouched scripts/data/collegeGridPlayers.json. Never edited by hand and never recorded twice.',
    recordedAt: execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(),
    keyRows: file.rows.length,
    keptRows: keptRows.length,
    keptRowsSha256: sha(JSON.stringify(keptRows)),
    labels: lib.LABELS.length,
    matrixFull: full,
    matrixKept: kept,
    boards: puzzles.length,
    cells,
    auditedAnswers,
  };
  fs.writeFileSync(RECORDED, JSON.stringify(out, null, 1) + '\n');
  console.log(`recorded at ${out.recordedAt}: ${full.rows} rows x ${out.labels} labels, kept ${kept.rows} rows, ${Object.keys(cells).length} cells, ${auditedAnswers.length} audited answers`);
}

if (process.env.SIM_CGSHIPPED_RECORD === '1') {
  await record();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The world every section reads. A control mutates it in memory before the sections run.
// ---------------------------------------------------------------------------

const { lib, engine, puzzles } = await loadPage();
const recorded = JSON.parse(fs.readFileSync(RECORDED, 'utf8'));
const world = {
  key: JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')),
  searchText: fs.readFileSync(SEARCH_OUT, 'utf8'),
  judgeText: fs.readFileSync(JUDGE_OUT, 'utf8'),
  noAuditExclusion: false,
};

/** Asserts a control's target is what it expects before it is mutated, so a control can never "fire" on nothing. */
function mustBe(condition, what) {
  if (!condition) { console.error(`control ${CONTROL} cannot run: ${what}`); process.exit(1); }
}

if (CONTROL === 'auditedback') {
  const a = AUDITED_OUT[2];
  const search = JSON.parse(world.searchText);
  mustBe(!world.key.rows.some((r) => r[0] === auditedId(a)), `the key already holds ${auditedId(a)}`);
  mustBe(!search.names.includes(a.name), `the search file already offers ${a.name}`);
  world.key.rows.push([auditedId(a), a.name, a.name, foldName(a.name), ['Ohio State'], [], ['DB'], a.pick, false, false, null, null, 0, false, 0]);
  search.names.push(a.name);
  world.searchText = JSON.stringify(search);
}
if (CONTROL === 'flipflag') {
  const judge = JSON.parse(world.judgeText);
  const at = judge.f.findIndex((f) => (f & 4) === 0 && (f & 3) === 0);
  mustBe(at >= 0, 'no row with a clear undrafted bit and no first round bit to flip');
  judge.f[at] |= 4;
  world.judgeText = JSON.stringify(judge);
}
if (CONTROL === 'shiftrow') {
  const judge = JSON.parse(world.judgeText);
  mustBe(judge.count > 2 && JSON.stringify(judge.s[0]) + judge.g[0] + judge.p[0] !== JSON.stringify(judge.s[1]) + judge.g[1] + judge.p[1], 'the first two judge rows are identical, a rotation would change nothing');
  for (const k of ['s', 'g', 'p', 'f']) judge[k].push(judge[k].shift());
  judge.h = judge.h.map(([row, year]) => [(row - 1 + judge.count) % judge.count, year]);
  world.judgeText = JSON.stringify(judge);
}
if (CONTROL === 'stale') {
  const at = world.searchText.indexOf('"Tom Brady"');
  mustBe(at >= 0 && world.searchText.indexOf('"Tom Brady"', at + 1) < 0, 'the search text does not hold "Tom Brady" exactly once');
  world.searchText = world.searchText.replace('"Tom Brady"', '"Tom Brody"');
}
if (CONTROL === 'fat') {
  /* Padding that does not compress, so the raw and the gzip ceilings both see it. */
  const pad = Math.ceil(world.searchText.length * 0.3);
  let filler = '';
  for (let i = 0; filler.length < pad; i += 1) filler += sha(`fat-${i}`);
  mustBe(world.searchText.endsWith(']}'), 'the search text does not end with its names array');
  world.searchText = `${world.searchText.slice(0, -2)},"${filler.slice(0, pad)}"]}`;
}
if (CONTROL === 'noexclude') world.noAuditExclusion = true;

// ---------------------------------------------------------------------------
// What the sections share
// ---------------------------------------------------------------------------

/* Whether the before and after proof still applies is read off the file on
   disk, before any control touched the world, so a control cannot retire it. */
const KEY_MOVED = sha(JSON.stringify(JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')).rows)) !== recorded.keptRowsSha256;
const RETIRED_LINE = 'THE ROUND 1105 BEFORE AND AFTER PROOF IS RETIRED: THE KEY HAS MOVED. Sections 3 and the hash half of 5 were not graded. The round that refreshed the key deletes them and scripts/data/collegeGridRecorded1105.json.';

const players = readKeyFile(world.key);
const fullEntries = lib.indexCollegeEntries(players);
const playerByDisplay = new Map(players.map((p) => [p.display_name, p]));
const fullByDisplay = new Map(fullEntries.map((e) => [e.name, e]));

function parseShipped() {
  try {
    return { search: JSON.parse(world.searchText), judge: JSON.parse(world.judgeText) };
  } catch {
    return null;
  }
}
const shipped = parseShipped();
const decodedRows = shipped ? lib.decodeCollegeKey([shipped.search, shipped.judge]) : null;
const decodedEntries = decodedRows ? decodedRows.map((r) => lib.toCollegeJudgeEntry(r)) : null;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------
// 1. None of the thirteen ships
// ---------------------------------------------------------------------------

function migrationNames() {
  const sql = fs.readFileSync(MIGRATION, 'utf8').split('\r\n').join('\n');
  /* The marker line that stands alone above the statement, not the header's
     prose about it (the file's opening comment also starts a line with the
     same words). Then the statement only, with any line comment dropped:
     code, not prose. */
  const marker = sql.match(/^[ \t]*-- STEP 2b[ \t]*$/m);
  if (!marker) return null;
  const from = sql.indexOf('delete from', marker.index);
  const end = sql.indexOf(';', from);
  if (from < 0 || end < 0) return null;
  const code = sql.slice(from, end).split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
  if (!/^delete from public\.nfl_draft_picks\s+where year = 1977/.test(code)) return null;
  return [...code.matchAll(/\(\s*\d+\s*,\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
}

function sectionOne() {
  const out = [];
  const isListed = (p) => AUDITED_OUT.some((a) => p.id === auditedId(a) && foldName(p.name) === foldName(a.name));
  for (const p of players.filter(isListed)) out.push(`the key still holds ${p.display_name} at ${p.id}, an audited row`);
  const stillDropped = dropAuditedRows(world.key.rows).dropped.length;
  if (stillDropped) out.push(`the generator's own rule would still drop ${stillDropped} rows of the committed key`);
  const names = shipped?.search?.names;
  if (!Array.isArray(names)) out.push('the search file holds no names list');
  else {
    for (const a of AUDITED_OUT) {
      if (!names.includes(a.name)) continue;
      const realNamesake = players.some((p) => p.display_name === a.name && !isListed(p));
      if (!realNamesake) out.push(`the search file offers ${a.name}, an audited name no other key row carries`);
    }
  }
  const fromSql = migrationNames();
  if (!fromSql) out.push('the Round 706 migration has no STEP 2b statement to read the thirteen names from');
  else {
    const listed = AUDITED_OUT.map((a) => a.name).sort(byCodeUnit);
    if (fromSql.length !== 13) out.push(`STEP 2b of the migration deletes ${fromSql.length} rows, not 13`);
    if (!same(fromSql.slice().sort(byCodeUnit), listed)) out.push(`AUDITED_OUT does not name the rows STEP 2b deletes: list [${listed.join(', ')}], migration [${fromSql.slice().sort(byCodeUnit).join(', ')}]`);
  }
  const schools = new Set(players.flatMap((p) => p.colleges)).size;
  return { out, info: `${num(players.length)} key rows and ${num(names?.length ?? 0)} search names read; ${fromSql?.length ?? 0} names read out of the migration's DELETE statement; ${num(schools)} distinct schools in the key (1,165 before the thirteen left, measured 2026-10-07)` };
}

// ---------------------------------------------------------------------------
// 2. The compact files are the key
// ---------------------------------------------------------------------------

function sectionTwo() {
  const out = [];
  if (new Set(players.map((p) => p.display_name)).size !== players.length) out.push('two key rows share a display name, so a row cannot be matched on it');
  if (!decodedRows || !decodedEntries) return { out: [...out, 'decodeCollegeKey refuses the two committed files'], info: 'not decoded' };
  if (decodedRows.length !== players.length) out.push(`the files decode to ${decodedRows.length} rows and the key holds ${players.length}`);
  let columnMisses = 0;
  let flagMisses = 0;
  let verdictMisses = 0;
  const counts = { yes: 0, no: 0, unknown: 0 };
  let firstMiss = '';
  decodedRows.forEach((row, i) => {
    const p = playerByDisplay.get(row.display_name);
    const full = fullByDisplay.get(row.display_name);
    const entry = decodedEntries[i];
    if (!p || !full || !entry) { columnMisses += 1; firstMiss ||= `${row.display_name} is in the files and not in the key`; return; }
    const columnsOk = same(row.colleges, p.colleges) && same(row.groups, p.groups) && row.best_pick === p.best_pick
      && row.first_round === p.first_round && row.undrafted === p.undrafted && row.heisman_year === p.heisman_year;
    if (!columnsOk) { columnMisses += 1; firstMiss ||= `${row.display_name}: a judged column differs from the key`; }
    if (row.identity_open !== full.identityOpen || row.heisman_open !== full.heismanOpen) { flagMisses += 1; firstMiss ||= `${row.display_name}: a namesake flag differs from indexCollegeEntries`; }
    for (const l of lib.LABELS) {
      const a = lib.judgeLabel(entry, l.label);
      const b = lib.judgeLabel(full, l.label);
      counts[a] += 1;
      if (a !== b) { verdictMisses += 1; firstMiss ||= `${row.display_name} x ${l.label}: ${a} from the files, ${b} from the key`; }
    }
  });
  if (columnMisses) out.push(`${columnMisses} decoded rows differ from the key in a judged column (first: ${firstMiss})`);
  if (flagMisses) out.push(`${flagMisses} decoded rows carry a namesake flag the key does not set (first: ${firstMiss})`);
  if (verdictMisses) out.push(`${verdictMisses} verdicts differ between the files and the key (first: ${firstMiss})`);
  return { out, info: `${num(decodedRows.length)} rows x ${lib.LABELS.length} labels judged both ways: ${num(counts.yes)} yes, ${num(counts.no)} no, ${num(counts.unknown)} unknown, ${verdictMisses} different` };
}

// ---------------------------------------------------------------------------
// 3. Recorded before: nothing moved for anyone who stayed
// ---------------------------------------------------------------------------

function sectionThree() {
  if (KEY_MOVED) return { out: [], retired: true, info: 'retired' };
  const out = [];
  const fromKey = verdictMatrix(lib, inIdOrder(fullEntries));
  if (fromKey.hash !== recorded.matrixKept.hash) out.push(`the edited lib over the filtered key judges differently from the untouched lib: ${JSON.stringify(fromKey.counts)} now, ${JSON.stringify(recorded.matrixKept.counts)} recorded`);
  let fromFiles = null;
  if (!decodedEntries || !decodedRows) out.push('the shipped files do not decode, so their verdicts cannot be compared with the recorded matrix');
  else {
    const withIds = decodedEntries.map((e) => ({ ...e, id: playerByDisplay.get(e.name)?.id ?? `missing:${e.name}` }));
    fromFiles = verdictMatrix(lib, inIdOrder(withIds));
    if (fromFiles.hash !== recorded.matrixKept.hash) out.push(`the shipped files judge differently from the untouched lib over the untouched key: ${JSON.stringify(fromFiles.counts)} now, ${JSON.stringify(recorded.matrixKept.counts)} recorded`);
  }
  return { out, info: `${num(fromKey.rows)} kept rows x ${lib.LABELS.length} labels, recorded at ${recorded.recordedAt.slice(0, 8)} before any edit: the same sha256 through the edited lib and through the shipped files (${JSON.stringify(recorded.matrixKept.counts)})` };
}

// ---------------------------------------------------------------------------
// 4. Not stale
// ---------------------------------------------------------------------------

function sectionFour() {
  const out = [];
  let fresh;
  try { fresh = renderCompact(world.key, lib); } catch (err) { return { out: [`renderCompact threw on the committed key: ${err.message}`], info: 'threw' }; }
  if (fresh.search !== world.searchText) out.push('src/data/collegeGrid/collegeGridSearch.json is not what the generator renders from the committed key; run node scripts/genCollegeGridData.mjs --compact');
  if (fresh.judge !== world.judgeText) out.push('src/data/collegeGrid/collegeGridJudge.json is not what the generator renders from the committed key; run node scripts/genCollegeGridData.mjs --compact');
  return { out, info: `both files byte equal to renderCompact(committed key): ${num(fresh.count)} rows, stamp ${fresh.stamp}` };
}

// ---------------------------------------------------------------------------
// 5. Every board keeps its answers
// ---------------------------------------------------------------------------

function sectionFive() {
  const out = [];
  let hashInfo = 'the recorded answer hashes are retired with section 3';
  if (!KEY_MOVED) {
    if (!decodedEntries) out.push('the shipped files do not decode, so no cell can be read from them');
    else {
      let moved = 0;
      let firstMoved = '';
      let cells = 0;
      for (const p of puzzles) {
        p.rows.forEach((row, r) => p.cols.forEach((col, c) => {
          cells += 1;
          const names = cellYesNames(lib, decodedEntries, row.label, col.label);
          const was = recorded.cells[`${p.id}|${r}|${c}`];
          if (!was || sha(JSON.stringify(names)) !== was.hash) { moved += 1; firstMoved ||= `${p.id} ${row.label} x ${col.label}: ${names.length} answers now, ${was?.count ?? 'none'} recorded`; }
        }));
      }
      if (moved) out.push(`${moved} of ${cells} cells hold different answers from the recorded ones with the audited names left out (first: ${firstMoved})`);
      hashInfo = `${cells} cells read from the shipped files, each with exactly its recorded answers; the answers that left: ${recorded.auditedAnswers.map((a) => `${a.name} on ${a.board}`).join(', ')}`;
    }
  }
  /* The floor, by the generator's own rule over the full key (the proof block
     lives there, not in the shipped files). Never retires. */
  const proofById = new Map(players.map((p) => [p.id, p.proof]));
  const answers = cellAnswers(lib, fullEntries, proofById);
  let thinnest = null;
  for (const p of puzzles) {
    const list = p.rows.flatMap((row) => p.cols.map((col) => answers.get(`${row.label}|${col.label}`)));
    for (const cell of list) {
      if (!cell || !cell.ok) out.push(`${p.id}: ${cell ? `${cell.school} x ${cell.crit}` : 'a cell the vocabulary does not hold'} no longer clears the floor of ${MIN_TWO_SOURCE} two-source answers with a famous one`);
      if (cell && (!thinnest || cell.people.size < thinnest.people.size)) thinnest = cell;
    }
    if (list.every(Boolean) && !canFillAll(list)) out.push(`${p.id} can no longer be filled by nine different players`);
  }
  const committedBoards = fs.readFileSync(BOARDS_OUT, 'utf8').split('\r\n').join('\n');
  let boardsSame = false;
  try { boardsSame = renderBoards(lib, dealBoards(lib, answers).boards) === committedBoards; } catch (err) { out.push(`the board generator can no longer deal from this key: ${err.message}`); }
  if (!boardsSame) out.push('src/data/collegeGridPuzzles.ts is not what the generator deals from this key (the 75 boards would move)');
  return { out, info: `${hashInfo}. Floor: every dealt cell holds at least ${MIN_TWO_SOURCE} two-source answers (thinnest ${thinnest ? `${thinnest.school} x ${thinnest.crit}, ${thinnest.people.size}` : 'none'}), all ${puzzles.length} boards fillable, and the boards file is what the generator deals` };
}

// ---------------------------------------------------------------------------
// 6. The budget
// ---------------------------------------------------------------------------

function cpuOnce() {
  const start = process.cpuUsage();
  const search = JSON.parse(world.searchText);
  const judge = JSON.parse(world.judgeText);
  const rows = lib.decodeCollegeKey([search, judge]);
  const data = rows ? engine.indexFranchiseRows({ table: '', select: '', franchiseColumn: '', orderColumn: '', minPoolSize: lib.MIN_POOL_SIZE, toPlayer: lib.toCollegeJudgeEntry }, rows) : null;
  const used = process.cpuUsage(start);
  return { ms: (used.user + used.system) / 1000, indexed: data ? data.players.length : 0 };
}

function sectionSix() {
  const out = [];
  const size = {
    searchRaw: bytes(world.searchText), searchGzip: gz(world.searchText),
    judgeRaw: bytes(world.judgeText), judgeGzip: gz(world.judgeText),
  };
  size.pairRaw = size.searchRaw + size.judgeRaw;
  size.pairGzip = size.searchGzip + size.judgeGzip;
  for (const [k, ceiling] of Object.entries(BYTES)) if (size[k] > ceiling) out.push(`${k} is ${num(size[k])} bytes, over its ceiling of ${num(ceiling)}`);
  cpuOnce();
  const runs = Array.from({ length: 7 }, () => cpuOnce());
  const cpu = median(runs.map((r) => r.ms));
  if (cpu > CPU_CEILING_MS) out.push(`parse plus decode plus index costs ${cpu.toFixed(1)} ms of CPU (median of 7), over its ceiling of ${CPU_CEILING_MS} ms`);
  return {
    out,
    info: `search ${num(size.searchRaw)} raw, ${num(size.searchGzip)} gzip; judge ${num(size.judgeRaw)} raw, ${num(size.judgeGzip)} gzip; pair ${num(size.pairRaw)} raw, ${num(size.pairGzip)} gzip in 2 requests (ceilings ${num(BYTES.pairRaw)} and ${num(BYTES.pairGzip)}). Before: ${OLD_KEY.reads} table reads decoding ${num(OLD_KEY.decodedByPage)} bytes (the key file is ${num(OLD_KEY.raw)} raw, ${num(OLD_KEY.gzip)} gzip). CPU for parse, decode and index of ${num(runs[0].indexed)} rows: median ${cpu.toFixed(1)} ms of 7 [${runs.map((r) => r.ms.toFixed(0)).join(', ')}], ceiling ${CPU_CEILING_MS} ms (measured medians: ${CPU_MEASURED_MS})`,
  };
}

// ---------------------------------------------------------------------------
// 7. The source stage
// ---------------------------------------------------------------------------

function sectionSeven() {
  const out = [];
  /* A probe world: two careers and five draft rows. Two of the rows sit at
     1977 pick 320: the audited name (with the lowest id, as in the table) and
     a stand in for the real pick there. The stand in is a made up name on
     purpose: this harness states no fact about a real player. */
  const audited = AUDITED_OUT.find((a) => a.pick === 320);
  const careers = [
    { id: 'probe-1', name: 'Probe Passer', teams: ['PRB'], seasons: [2013, 2016], pos: ['QB'], college: 'Probe State', draft: { year: 2013, round: 3, pick: 70 } },
    { id: 'probe-2', name: 'Probe Runner', teams: ['PRB'], seasons: [2013, 2015], pos: ['RB'], college: 'Probe Tech', draft: { year: 2013, round: 2, pick: 33 } },
  ];
  const picks = [
    { id: 1, year: 2013, round: 1, pick: 1, player_name: 'Probe Opener', position: 'Quarterback', college: 'Probe Tech' },
    { id: 2, year: 2013, round: 2, pick: 33, player_name: 'Probe Runner', position: 'Running Back', college: 'Probe Tech' },
    { id: 3, year: 2013, round: 3, pick: 70, player_name: 'Probe Passer', position: 'Quarterback', college: 'Probe State' },
    { id: 14608, year: audited.year, round: 12, pick: audited.pick, player_name: audited.name, position: 'DB', college: 'Probe State' },
    { id: 99001, year: audited.year, round: 12, pick: audited.pick, player_name: 'Probe Realpick', position: 'DB', college: 'Probe Tech' },
  ];
  let res;
  try {
    res = buildCollegeKey({ careers, picks, rosters: [], heisman: [], qb: [], rb: [], positionGroups: readPositionGroups() }, { control: world.noAuditExclusion ? { noAuditExclusion: true } : {} });
  } catch (err) {
    return { out: [`buildCollegeKey threw on the probe world: ${err.message}`], info: 'threw' };
  }
  const names = res.players.map((p) => p.name);
  if (names.includes(audited.name)) out.push(`the source stage kept ${audited.name}, an audited row`);
  if (!names.includes('Probe Realpick')) out.push('the source stage lost the other name at 1977 pick 320: the drop must match the name, not the slot');
  if (res.stats.auditedOut !== 1 && !world.noAuditExclusion) out.push(`the source stage counted ${res.stats.auditedOut} audited rows left out, expected 1`);
  for (const n of ['Probe Passer', 'Probe Runner', 'Probe Opener']) if (!names.includes(n)) out.push(`the probe world lost ${n}`);
  return { out, info: `5 draft rows and 2 careers in, ${res.players.length} entries out (${names.join(', ')}); ${res.stats.auditedOut} audited row left out at 1977 pick 320` };
}

// ---------------------------------------------------------------------------
// 8. The door and fail closed, through the real hook (plain run only)
// ---------------------------------------------------------------------------

function runFailClosed(control) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgshipped-vitest-'));
  const report = path.join(dir, 'report.json');
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.CG_FAILCLOSED_CONTROL;
  if (control) env.CG_FAILCLOSED_CONTROL = control;
  /* vitest is found by node's own walk up from this script, so the harness runs from a worktree too. */
  const vitest = fileURLToPath(import.meta.resolve('vitest/vitest.mjs'));
  const r = spawnSync(process.execPath, [vitest, 'run', FAILCLOSED_TEST, '--reporter=json', `--outputFile.json=${report}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(report)) return { error: text.slice(-1500) };
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  const tests = [];
  for (const f of json.testResults || []) for (const t of f.assertionResults || []) tests.push({ title: t.title, tag: (t.title.match(/^\(([a-e])\)/) || [])[1] ?? null, status: t.status });
  return { tests, notes: [...text.matchAll(/CGFAILCLOSED\| (.+)/g)].map((m) => m[1].trim()), exit: r.status };
}

function sectionEight() {
  const out = [];
  const info = [];
  const statusOf = (r, tag) => r.tests.find((t) => t.tag === tag)?.status ?? 'missing';
  const markerCount = (r, name) => Number((r.notes.map((n) => n.match(new RegExp(`^control ${name}: (\\d+) `))).find(Boolean) || [])[1] ?? -1);

  const plain = runFailClosed('');
  if (plain.error) out.push(`the fail closed suite did not report: ${plain.error}`);
  else {
    const notPassed = plain.tests.filter((t) => t.status !== 'passed');
    if (plain.tests.length < 7) out.push(`the fail closed suite ran ${plain.tests.length} tests, expected at least 7`);
    for (const t of notPassed) out.push(`fail closed: "${t.title.slice(0, 80)}" is ${t.status}`);
    if (!plain.notes.some((n) => /^fail closed: 5 of 5 /.test(n))) out.push('the fail closed suite did not print its 5 of 5 failure worlds line, so case (c) returned without measuring');
    if (!plain.notes.some((n) => /^decoder: (\d+) of \1 /.test(n))) out.push('the fail closed suite did not print a full decoder line');
    info.push(`plain: ${plain.tests.length - notPassed.length} of ${plain.tests.length} tests passed (${plain.notes.filter((n) => /^(fail closed|decoder):/.test(n)).join('; ')})`);
  }

  const paged = runFailClosed('paged');
  if (paged.error) out.push(`control paged did not report: ${paged.error}`);
  else {
    const n = markerCount(paged, 'paged');
    if (!(n > 0)) out.push('control paged printed no marker with a count above zero, so it did not fire');
    if (statusOf(paged, 'a') !== 'failed') out.push(`control paged: case (a) is ${statusOf(paged, 'a')}; a key paged out of the table must fail the door`);
    info.push(`control paged: ${n} table reads, case (a) ${statusOf(paged, 'a')}`);
  }

  const accept = runFailClosed('acceptmissing');
  if (accept.error) out.push(`control acceptmissing did not report: ${accept.error}`);
  else {
    const n = markerCount(accept, 'acceptmissing');
    if (!(n > 0)) out.push('control acceptmissing printed no marker with a count above zero, so it did not fire');
    for (const tag of ['b', 'c']) if (statusOf(accept, tag) !== 'failed') out.push(`control acceptmissing: case (${tag}) is ${statusOf(accept, tag)}; accept on error must fail it`);
    if (statusOf(accept, 'a') !== 'passed') out.push(`control acceptmissing: case (a) is ${statusOf(accept, 'a')}; the door itself should still pass`);
    info.push(`control acceptmissing: ${n} loads answered with an accept anything key, case (b) ${statusOf(accept, 'b')}, case (c) ${statusOf(accept, 'c')}`);
  }
  return { out, info: info.join('. ') };
}

// ---------------------------------------------------------------------------

const SECTIONS = [
  [1, 'None of the thirteen ships', sectionOne],
  [2, 'The compact files are the key', sectionTwo],
  [3, 'Recorded before: nothing moved for anyone who stayed', sectionThree],
  [4, 'Not stale: both files are what the generator renders', sectionFour],
  [5, 'Every board keeps its answers', sectionFive],
  [6, 'The budget', sectionSix],
  [7, 'The source stage drops the audited row and keeps another name at the same pick', sectionSeven],
];
if (!CONTROL) SECTIONS.push([8, 'The door and fail closed, through the real hook', sectionEight]);

console.log(CONTROL
  ? `simCollegeGridShipped, control ${CONTROL}: the world is mutated in memory; sections ${CONTROLS[CONTROL].join(' and ')} must go red`
  : 'simCollegeGridShipped: committed files only, no request');

const red = new Set();
let failures = 0;
let retired = false;
for (const [n, title, run] of SECTIONS) {
  console.log(`\n${n}) ${title}`);
  const r = run();
  if (r.retired) { retired = true; console.log(`   ${RETIRED_LINE}`); continue; }
  for (const m of r.out.slice(0, 6)) console.log(`  FAIL: ${m}`);
  if (r.out.length > 6) console.log(`  ... and ${r.out.length - 6} more`);
  if (r.out.length) { red.add(n); failures += r.out.length; }
  /* A red section's summary would describe a state that is not there; the budget numbers are always worth reading. */
  if (r.info && (!r.out.length || n === 6)) console.log(`   ${r.info}`);
}
if (KEY_MOVED && !retired) retired = true;

console.log('');
if (CONTROL) {
  const wanted = CONTROLS[CONTROL];
  /* A retired section cannot go red; a control aimed only at retired sections cannot be graded. */
  const gradable = wanted.filter((n) => !(KEY_MOVED && n === 3));
  const missed = gradable.filter((n) => !red.has(n));
  if (!gradable.length || missed.length) {
    console.error(`control "${CONTROL}": did NOT fire in section ${missed.join(' and ') || wanted.join(' and ')}, the check is dead (red sections: ${[...red].join(', ') || 'none'})`);
    process.exit(1);
  }
  console.log(`control "${CONTROL}": fired in section ${gradable.join(' and ')} as expected, the check works (red sections in all: ${[...red].join(', ')})`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`simCollegeGridShipped: red, ${failures} failure${failures === 1 ? '' : 's'} above in section ${[...red].join(', ')}.`);
  process.exit(1);
}
console.log(`simCollegeGridShipped: green. None of the thirteen ships, the two files are the key row for row and verdict for verdict, every board keeps its answers and its floor, the files are inside their budget, the source stage drops by name, and the page fails closed through the real hook.${retired ? ` NOTE: ${RETIRED_LINE}` : ''}`);
