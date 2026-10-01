/* simBallonDor: public.ballon_dor against its row by row record.
 *
 * Round 730. The table feeds List Quiz, Rarity Round, the trivia question bank
 * and Player Bingo, all of them on rank 1 Men rows, and Rarity Round shows club
 * and nationality as autocomplete meta. Every one of its 76 rows was checked
 * against the co-organiser's own laureates list on uefa.com plus at least one
 * independent source on another host, and the result is
 * scripts/data/ballonDorVerified2026-09.json. Winner, year, rank and club were
 * right everywhere; nationality was NULL everywhere, and the migration
 * supabase/migrations/20260930_round_730_ballon_dor.sql fills it.
 *
 * WHAT THIS READS. The record and the migration. It does NOT read the database.
 * It parses the migration's one UPDATE, decodes its VALUES tuples (the accented
 * names are written as U& Unicode escapes so the file's encoding cannot move
 * them) and holds every tuple to the record row of the same id, so it is green
 * on the branch before the migration is applied and stays the fence after: a
 * later edit to either file that lets them disagree goes red here. It reads the
 * SQL with its comments stripped, so the header's prose (which lists every
 * change in words) can never satisfy a check. A statement it does not
 * understand inside the block is a failure, never skipped.
 *
 * THRESHOLDS. There are none to set from headroom: every check here is an
 * equality between two files the round shipped together, or a count the record
 * states about itself. Nothing is sampled and nothing is a maximum.
 *
 * CHECKS
 *   parse    one DO block, one UPDATE of public.ballon_dor setting nationality
 *            alone from a VALUES list aliased (id, year, award_type, rank,
 *            player_name, club, nationality); no other write inside the block
 *   guard    the UPDATE joins on id, year, award_type, rank, player_name and
 *            club and requires nationality to still be NULL; the row_count it
 *            demands is the tuple count; the four preconditions and the two
 *            postconditions name the record's own tallies (76 rows, 69 Men,
 *            7 Women, 0 filled before, 0 empty after, 76 rows after)
 *   agree    every tuple equals the record row of the same id on year,
 *            award_type, rank, player_name, club and nationality, compared as
 *            NFC, and both files are already NFC
 *   present  every record row has a tuple and every tuple a record row; ids
 *            are distinct in both
 *   read     every row's read values are its shipped values except nationality,
 *            which was read NULL, and the change line says exactly that
 *   shape    rank 1 only; the Men run 1956 to 2025 and the Women 2018 to 2025
 *            with no year missing except the ones the record's absent block
 *            names; no club or nationality is blank
 *   sources  every row carries at least two distinct https sources, one of them
 *            on an official host, none of them Wikipedia; its sourceKeys resolve
 *            to the record's sources block and match its URLs in order; every
 *            row has a check date and a known status; the counts block adds up
 *            (read = verified = rows, nothing corrected, filled or dropped,
 *            nationalityFilled = rows whose change fills nationality)
 *
 * NEGATIVE CONTROLS. BALLON_DOR_CONTROL=<name> plants one defect, refuses to
 * run (exit 2) if the text or value it replaces is not there, and exits 1 only
 * if exactly its own check went red (exit 2 if any other check went red too):
 *   swap        -> agree    one record nationality and its change line are
 *                           flipped in memory (Di Stefano 1957, Spain to
 *                           Argentina), a self consistent record edit that
 *                           only the comparison with the SQL can see
 *   wrongclub   -> agree    one tuple's club is changed in the SQL
 *   missingrow  -> present  one tuple is removed from the VALUES list and the
 *                           row_count check is lowered to match it
 *   unguarded   -> guard    the UPDATE stops requiring nationality IS NULL
 *   stalecount  -> guard    the opening row count precondition names 75
 *   nosource    -> sources  one row keeps only its official source
 *   badcount    -> sources  the record's nationalityFilled count is off by one
 *   unknownsql  -> parse    a DELETE is added inside the block
 *
 * Run: node scripts/simBallonDor.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = path.join(ROOT, 'scripts', 'data', 'ballonDorVerified2026-09.json');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260930_round_730_ballon_dor.sql');
const T = 'public.ballon_dor';
const COLS = ['id', 'year', 'award_type', 'rank', 'player_name', 'club', 'nationality'];

const CONTROLS = {
  swap: 'agree', wrongclub: 'agree', missingrow: 'present', unguarded: 'guard',
  stalecount: 'guard', nosource: 'sources', badcount: 'sources', unknownsql: 'parse',
};
const CONTROL = process.env.BALLON_DOR_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`BALLON_DOR_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

const recordText = fs.readFileSync(RECORD, 'utf8');
const record = JSON.parse(recordText);
let sql = fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n');

/* Controls plant their defect in the SQL text or the record before anything
   runs, and refuse to run if what they replace is not there. */
function plant(from, to) {
  if (!sql.includes(from)) { console.error(`CONTROL ${CONTROL} changed nothing: the migration does not contain ${JSON.stringify(from.slice(0, 90))}`); process.exit(2); }
  sql = sql.replace(from, to);
}
function refuse(msg) { console.error(`CONTROL ${CONTROL} changed nothing: ${msg}`); process.exit(2); }
if (CONTROL === 'swap') {
  const r = record.rows.find(x => x.id === 3);
  if (!r || r.nationality !== 'Spain' || r.change !== 'nationality NULL -> Spain') refuse('record id 3 is not Di Stefano with Spain');
  r.nationality = 'Argentina'; r.change = 'nationality NULL -> Argentina';
}
if (CONTROL === 'wrongclub') plant(`(2, 1956, 'Men', 1, 'Stanley Matthews', 'Blackpool', 'England'),`, `(2, 1956, 'Men', 1, 'Stanley Matthews', 'Stoke City', 'England'),`);
if (CONTROL === 'missingrow') {
  plant(`    (74, 2024, 'Men', 1, 'Rodri', 'Manchester City', 'Spain'),\n`, '');
  plant(`  get diagnostics n = row_count;\n  if n <> 76 then`, `  get diagnostics n = row_count;\n  if n <> 75 then`);
}
if (CONTROL === 'unguarded') plant(`     and b.club = v.club\n     and b.nationality is null;`, `     and b.club = v.club;`);
if (CONTROL === 'stalecount') plant(`  select count(*) into n from public.ballon_dor;\n  if n <> 76 then`, `  select count(*) into n from public.ballon_dor;\n  if n <> 75 then`);
if (CONTROL === 'nosource') {
  const r = record.rows.find(x => x.id === 43);
  if (!r || r.sources.length < 2 || r.sourceKeys.length < 2) refuse('record id 43 does not carry two or more sources');
  r.sources = r.sources.slice(0, 1); r.sourceKeys = r.sourceKeys.slice(0, 1);
}
if (CONTROL === 'badcount') {
  if (record.counts.nationalityFilled !== record.rows.length) refuse('the record\'s nationalityFilled count is not already the row count');
  record.counts.nationalityFilled = record.rows.length - 1;
}
if (CONTROL === 'unknownsql') plant(`  get diagnostics n = row_count;`, `  delete from public.ballon_dor where id = 1;\n  get diagnostics n = row_count;`);

const results = [];
const check = (name, problems, detail) => results.push({ name, problems, detail });
const nfc = s => s.normalize('NFC');

/* ---------- parse the migration, comments stripped ---------- */
const code = sql.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
const blocks = [...code.matchAll(/do \$migration\$([\s\S]*?)\$migration\$;/g)].map(m => m[1]);
const outside = code.replace(/do \$migration\$[\s\S]*?\$migration\$;/g, '').trim();
const parseProblems = [];
if (blocks.length !== 1) parseProblems.push(`expected one DO block, found ${blocks.length}`);
if (outside) parseProblems.push(`statements outside the block: ${outside.slice(0, 100)}`);
const body = blocks[0] || '';
for (const kw of ['delete', 'insert', 'alter', 'drop', 'truncate', 'create', 'grant']) {
  if (new RegExp(`\\b${kw}\\b`, 'i').test(body)) parseProblems.push(`the block carries a ${kw} statement, which this harness does not replay`);
}
const updates = [...body.matchAll(/\bupdate\b/gi)];
if (updates.length !== 1) parseProblems.push(`expected one UPDATE, found ${updates.length}`);
const um = body.match(/update public\.ballon_dor b\s+set ([\s\S]*?)\s+from \(values\s*([\s\S]*?)\)\s+as v\(([^)]*)\)\s+where ([\s\S]*?);/i);
let tuples = [];
let setCols = [];
let where = '';
if (!um) parseProblems.push('the UPDATE is not shaped update ... set ... from (values ...) as v(...) where ...');
else {
  setCols = um[1].split(',').map(s => s.trim());
  if (setCols.length !== 1 || setCols[0] !== 'nationality = v.nationality') parseProblems.push(`the UPDATE sets ${um[1].trim()}, not nationality alone`);
  const alias = um[3].split(',').map(s => s.trim());
  if (alias.join(',') !== COLS.join(',')) parseProblems.push(`the VALUES alias is (${alias.join(', ')}), expected (${COLS.join(', ')})`);
  where = um[4];
  /* Each tuple: (int, int, 'str', int, str, str, str) where str is 'x' or U&'x'
     and a quote inside is doubled. */
  const STR = `(U&)?'((?:[^']|'')*)'`;
  const tupleRe = new RegExp(`\\(\\s*(\\d+),\\s*(\\d+),\\s*${STR},\\s*(\\d+),\\s*${STR},\\s*${STR},\\s*${STR}\\s*\\)`, 'g');
  const decode = (isU, raw) => {
    let s = raw.replace(/''/g, "'");
    if (isU) {
      s = s.replace(/\\\+([0-9A-Fa-f]{6})|\\([0-9A-Fa-f]{4})/g, (_, six, four) => String.fromCodePoint(parseInt(six || four, 16)));
      if (/\\/.test(s)) parseProblems.push(`an escape this harness cannot decode in ${raw}`);
    } else if (/\\/.test(s)) parseProblems.push(`a backslash in a plain literal: ${raw}`);
    return s;
  };
  let m;
  const valuesText = um[2];
  while ((m = tupleRe.exec(valuesText)) !== null) {
    tuples.push({
      id: +m[1], year: +m[2], award_type: decode(m[3], m[4]), rank: +m[5],
      player_name: decode(m[6], m[7]), club: decode(m[8], m[9]), nationality: decode(m[10], m[11]),
    });
  }
  const opens = (valuesText.match(/\(/g) || []).length;
  if (opens !== tuples.length) parseProblems.push(`${opens} tuples opened in the VALUES list but ${tuples.length} parsed`);
}
check('parse', parseProblems, `${tuples.length} tuples parsed from ${blocks.length} block(s)`);

/* ---------- the guards around the write ---------- */
const men = record.rows.filter(r => r.award_type === 'Men' && r.rank === 1).length;
const women = record.rows.filter(r => r.award_type === 'Women' && r.rank === 1).length;
const readFilled = record.rows.filter(r => r.read && r.read.nationality !== null && r.read.nationality !== undefined).length;
{
  const p = [];
  const w = where.replace(/\s+/g, ' ').trim();
  for (const c of ['id', 'year', 'award_type', 'rank', 'player_name', 'club']) {
    if (!w.includes(`b.${c} = v.${c}`)) p.push(`the UPDATE does not join on ${c}`);
  }
  if (!/\bb\.nationality is null\b/.test(w)) p.push('the UPDATE does not require nationality to still be NULL');
  const pre = [...body.matchAll(/select count\(\*\) into n from public\.ballon_dor([^;]*);\s*if n <> (\d+) then\s+raise exception/g)]
    .map(m => ({ filter: m[1].replace(/\s+/g, ' ').trim(), n: +m[2] }));
  const want = [
    { filter: '', n: record.rows.length, name: 'row count before' },
    { filter: "where award_type = 'Men' and rank = 1", n: men, name: 'Men rank 1' },
    { filter: "where award_type = 'Women' and rank = 1", n: women, name: 'Women rank 1' },
    { filter: 'where nationality is not null', n: readFilled, name: 'nationality already filled' },
    { filter: "where nationality is null or btrim(nationality) = ''", n: 0, name: 'empty nationality after' },
    { filter: '', n: record.rows.length, name: 'row count after' },
  ];
  if (pre.length !== want.length) p.push(`expected ${want.length} count guards, found ${pre.length}`);
  want.forEach((g, i) => {
    const got = pre[i];
    if (!got) return;
    if (got.filter !== g.filter) p.push(`guard ${i + 1} filters on "${got.filter}", expected "${g.filter}"`);
    if (got.n !== g.n) p.push(`guard ${i + 1} (${g.name}) demands ${got.n}, the record says ${g.n}`);
  });
  const rc = body.match(/get diagnostics n = row_count;\s*if n <> (\d+) then\s+raise exception/);
  if (!rc) p.push('the UPDATE is not followed by a row_count check that raises');
  else if (+rc[1] !== tuples.length) p.push(`the row_count check demands ${rc[1]} but the VALUES list holds ${tuples.length} tuples`);
  const raises = (body.match(/raise exception/g) || []).length;
  if (raises < want.length + 1) p.push(`${raises} raises for ${want.length + 1} guards`);
  check('guard', p, `${pre.length} count guards, row_count ${rc ? rc[1] : 'none'}, join on ${COLS.length - 1} columns plus nationality IS NULL`);
}

/* ---------- agree and present ---------- */
const byId = new Map(record.rows.map(r => [r.id, r]));
{
  const p = [];
  if (recordText !== nfc(recordText)) p.push('the record file is not NFC');
  for (const t of tuples) {
    const r = byId.get(t.id);
    if (!r) continue;
    for (const c of ['player_name', 'club', 'nationality', 'award_type']) {
      if (t[c] !== nfc(t[c])) p.push(`id ${t.id}: tuple ${c} ${JSON.stringify(t[c])} is not NFC`);
      if (nfc(t[c]) !== nfc(String(r[c]))) p.push(`id ${t.id} ${r.year} ${r.award_type}: tuple ${c} ${JSON.stringify(t[c])}, record ${JSON.stringify(r[c])}`);
    }
    for (const c of ['year', 'rank']) if (t[c] !== r[c]) p.push(`id ${t.id}: tuple ${c} ${t[c]}, record ${r[c]}`);
  }
  check('agree', p, `${tuples.filter(t => byId.has(t.id)).length} tuples compared on ${COLS.length - 1} fields`);
}
{
  const p = [];
  const tupleIds = new Set();
  for (const t of tuples) { if (tupleIds.has(t.id)) p.push(`id ${t.id} appears twice in the VALUES list`); tupleIds.add(t.id); }
  if (byId.size !== record.rows.length) p.push('the record repeats an id');
  for (const r of record.rows) if (!tupleIds.has(r.id)) p.push(`record id ${r.id} ${r.year} ${r.award_type} ${r.player_name} has no tuple`);
  for (const t of tuples) if (!byId.has(t.id)) p.push(`tuple id ${t.id} ${t.year} ${t.player_name} is not in the record`);
  check('present', p, `${record.rows.length} record rows, ${tuples.length} tuples`);
}

/* ---------- the read values and the change lines ---------- */
{
  const p = [];
  for (const r of record.rows) {
    const tag = `id ${r.id} ${r.year} ${r.award_type}`;
    if (!r.read) { p.push(`${tag}: no read block`); continue; }
    if (r.read.player_name !== r.player_name) p.push(`${tag}: player_name read as ${r.read.player_name}, ships as ${r.player_name}, but the round corrected nothing`);
    if (r.read.club !== r.club) p.push(`${tag}: club read as ${r.read.club}, ships as ${r.club}, but the round corrected nothing`);
    if (r.read.nationality !== null) p.push(`${tag}: nationality was read as ${JSON.stringify(r.read.nationality)}, the migration requires NULL`);
    if (r.change !== `nationality NULL -> ${r.nationality}`) p.push(`${tag}: change line ${JSON.stringify(r.change)} does not describe the fill to ${r.nationality}`);
  }
  check('read', p, `${record.rows.length} read blocks`);
}

/* ---------- the shape of the table ---------- */
{
  const p = [];
  const absent = new Set((record.absent || []).map(a => `${a.award_type}|${a.year}`));
  const ranges = { Men: [1956, 2025], Women: [2018, 2025] };
  for (const r of record.rows) {
    const tag = `id ${r.id} ${r.year} ${r.award_type}`;
    if (r.rank !== 1) p.push(`${tag}: rank ${r.rank}, the table holds winners only`);
    if (!ranges[r.award_type]) p.push(`${tag}: award_type ${r.award_type}`);
    for (const c of ['player_name', 'club', 'nationality']) if (typeof r[c] !== 'string' || !r[c].trim()) p.push(`${tag}: ${c} is blank`);
  }
  for (const [award, [from, to]] of Object.entries(ranges)) {
    const years = new Set(record.rows.filter(r => r.award_type === award).map(r => r.year));
    for (let y = from; y <= to; y++) {
      if (years.has(y) && absent.has(`${award}|${y}`)) p.push(`${award} ${y} has a row and is also listed absent`);
      if (!years.has(y) && !absent.has(`${award}|${y}`)) p.push(`${award} ${y} has no row and the record does not say why`);
    }
    for (const y of years) if (y < from || y > to) p.push(`${award} ${y} is outside ${from} to ${to}`);
    if (years.size !== record.rows.filter(r => r.award_type === award).length) p.push(`${award} has two rows for one year`);
  }
  check('shape', p, `Men ${men} rows 1956 to 2025, Women ${women} rows 2018 to 2025, ${absent.size} years explained absent`);
}

/* ---------- sources and counts ---------- */
{
  const p = [];
  const official = record.officialHosts || [];
  const isOfficial = u => { try { const h = new URL(u).hostname; return official.some(o => h === o || h.endsWith('.' + o)); } catch { return false; } };
  const STATUS = new Set(['verified', 'corrected', 'filled', 'dropped']);
  for (const r of record.rows) {
    const tag = `id ${r.id} ${r.year} ${r.award_type}`;
    if (!STATUS.has(r.status)) p.push(`${tag}: status ${r.status}`);
    if (!Array.isArray(r.sources) || r.sources.length < 2 || new Set(r.sources).size !== r.sources.length) p.push(`${tag}: needs two or more distinct sources`);
    else {
      for (const u of r.sources) {
        if (!/^https:\/\/[^\s/]+\.[^\s/]+\//.test(u)) p.push(`${tag}: source ${u} is not a URL`);
        if (/wikipedia\.org/i.test(u)) p.push(`${tag}: Wikipedia is a spot check, not a source (${u})`);
      }
      if (!r.sources.some(isOfficial)) p.push(`${tag}: no source on an official host (${official.join(', ')})`);
    }
    if (!Array.isArray(r.sourceKeys) || r.sourceKeys.length !== (r.sources || []).length) p.push(`${tag}: sourceKeys and sources differ in length`);
    else r.sourceKeys.forEach((k, i) => {
      const s = record.sources[k];
      if (!s) p.push(`${tag}: sourceKey ${k} is not in the record's sources block`);
      else if (s.url !== r.sources[i]) p.push(`${tag}: sourceKey ${k} resolves to ${s.url}, the row lists ${r.sources[i]}`);
    });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked || '')) p.push(`${tag}: no check date`);
  }
  for (const [k, s] of Object.entries(record.sources)) {
    if (!s.url || !/^https:\/\//.test(s.url)) p.push(`source ${k} has no https url`);
    if (s.official !== isOfficial(s.url)) p.push(`source ${k} says official ${s.official} but its host says ${isOfficial(s.url)}`);
  }
  const c = record.counts || {};
  const byStatus = s => record.rows.filter(r => r.status === s).length;
  if (c.read !== record.rows.length) p.push(`counts.read ${c.read} but ${record.rows.length} rows`);
  for (const s of ['verified', 'corrected', 'filled', 'dropped']) if (c[s] !== byStatus(s)) p.push(`counts.${s} ${c[s]} but ${byStatus(s)} rows`);
  const filled = record.rows.filter(r => /^nationality NULL -> /.test(r.change || '')).length;
  if (c.nationalityFilled !== filled) p.push(`counts.nationalityFilled ${c.nationalityFilled} but ${filled} rows fill nationality`);
  check('sources', p, `${record.rows.length} rows, ${Object.keys(record.sources).length} sources, ${official.length} official hosts`);
}

/* ---------- report ---------- */
for (const r of results) {
  if (r.problems.length) { console.log(`  FAIL ${r.name}: ${r.problems.length} problem(s), ${r.detail}`); for (const x of r.problems.slice(0, 8)) console.log(`       ${x}`); }
  else console.log(`  ok   ${r.name}: ${r.detail}`);
}
const failed = results.filter(r => r.problems.length).map(r => r.name);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (failed.length === 1 && failed[0] === want) { console.log(`simBallonDor CONTROL ${CONTROL}: only ${want} went red, as planted`); process.exit(1); }
  console.log(`simBallonDor CONTROL ${CONTROL} MISFIRED: expected only ${want} red, got [${failed.join(', ')}]`);
  process.exit(2);
}
console.log(`simBallonDor: ${results.length} checks, ${failed.length} failed; ${tuples.length} tuples held to ${record.rows.length} record rows (${men} Men, ${women} Women), ${record.counts.nationalityFilled} nationalities filled`);
process.exit(failed.length ? 1 : 0);
