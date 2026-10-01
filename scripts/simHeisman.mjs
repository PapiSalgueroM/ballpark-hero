/**
 * Round 729 harness: the Heisman record, the migration that brings the table to
 * it, and the Record Books page baked from it, held together.
 *
 * WHAT IT READS. Three committed files and nothing else:
 *   scripts/data/heismanVerified2026-09.json   every row of cfb_heisman_winners,
 *       checked on 2026-09-30 against heisman.com and ESPN, with both readings
 *   supabase/migrations/20260930_round_729_heisman.sql   the unapplied migration
 *   src/data/recordBooks.json                   the rows the Heisman page shows
 * It never reads the database. It reads the MIGRATION'S END STATE: the table as
 * the migration read it (its read_state list) with the migration's corrections
 * applied (its fix list), and the end state the migration itself asserts (its
 * end_state list). So it is green on the branch before the migration is applied,
 * and it stays green after, because the end state is what the table then holds.
 *
 * THE CHECKS
 *   1. The record is sound: one row per year from 1935 with no gap and no repeat,
 *      a winner, school and position on every row, nothing placeholder shaped, a
 *      status of verified, corrected or dropped (a correction says what it was,
 *      a drop says why), at least two source URLs from two different hosts with
 *      the award body first, and counts that add up.
 *   2. The record is pinned: a hash of year, id, winner, school, position and
 *      status over every row. Changing a verified value means changing this file
 *      too, on purpose, with the reason in the commit.
 *   3. The end state agrees with the record: every row the migration ends with
 *      carries the record's year, winner, school and position, the end state it
 *      asserts is the one its corrections produce, and each correction starts
 *      from the value the record says was there.
 *   4. No verified row is missing from the end state, asserted or computed.
 *   5. Nothing else remains: no row beyond the verified ones, and no row shaped
 *      like a placeholder (an empty or TBD style value, a year past the record,
 *      a winner with a digit or a dup tag, a position neither source uses).
 *   6. The migration is guarded and changes only what it says: in its code (the
 *      comments stripped) a read state guard that raises before the UPDATE, an
 *      UPDATE that touches a row only while it holds the value read, a row count
 *      guard equal to the record's corrections, an end state check that raises,
 *      and no INSERT, DELETE or DDL; in its header, one line per correction.
 *   7. The page shows the record: the heisman section of recordBooks.json is the
 *      record's rows, newest first, cell for cell.
 *
 * NEGATIVE CONTROLS. HEISMAN_CONTROL=<name> plants one defect in memory and the
 * run is green only if that control's own check went red, with the finding the
 * control is about, and every other check stayed green. Each control refuses to
 * run if the thing it changes is not there. HEISMAN_CONTROL=all runs them all.
 *
 * Run: node scripts/simHeisman.mjs
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const RECORD_FILE = 'scripts/data/heismanVerified2026-09.json';
const MIGRATION_FILE = 'supabase/migrations/20260930_round_729_heisman.sql';
const BOOK_FILE = 'src/data/recordBooks.json';

/* The pin. sha256 over "year|id|winner|school|position|status", one line per row,
   rows by year. Recompute only after re-verifying, and say why in the commit. */
const RECORD_PIN = 'ca0912f9615ed4df806c7679ecd66829d65498c0bdea4ddc82fe686ceb141307';
/* the codes the two sources print for every winner */
const POSITIONS = new Set(['QB', 'RB', 'HB', 'FB', 'WR', 'TE', 'CB', 'CB/WR']);

/* control -> [the check it must turn red, a phrase its finding must carry] */
const CONTROLS = {
  onesource: [1, 'two sources'],
  recordedit: [2, 'pin'],
  enddiffers: [3, 'the record says'],
  missing: [4, 'missing'],
  placeholder: [5, 'placeholder'],
  unguarded: [6, 'guard'],
  stalepage: [7, 'the record says'],
};
const CONTROL = process.env.HEISMAN_CONTROL || '';

if (CONTROL === 'all') {
  let bad = 0;
  for (const name of Object.keys(CONTROLS)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, HEISMAN_CONTROL: name }, encoding: 'utf8' });
    const last = (r.stdout || '').trim().split('\n').pop() || (r.stderr || '').trim().split('\n').pop() || '';
    if (r.status !== 0) bad += 1;
    console.log(`  ${r.status === 0 ? 'ok  ' : 'BAD '} ${name.padEnd(12)} ${last}`);
  }
  console.log('');
  if (bad) { console.error(`simHeisman controls: ${bad} of ${Object.keys(CONTROLS).length} did not behave.`); process.exit(1); }
  console.log(`simHeisman controls: green. All ${Object.keys(CONTROLS).length} controls turned their own check red and only that one.`);
  process.exit(0);
}
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`HEISMAN_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, all)`);
  process.exit(2);
}
if (CONTROL) console.log(`NEGATIVE CONTROL ${CONTROL} is on: check ${CONTROLS[CONTROL][0]} is SUPPOSED to go red, and only that one.\n`);

const findings = new Map();
let current = 0;
const fail = m => {
  if (!findings.has(current)) findings.set(current, []);
  findings.get(current).push(m);
  if (findings.get(current).length <= 6) console.error('  FAIL: ' + m);
};
const refuse = m => { console.error(`control ${CONTROL} cannot run: ${m}`); process.exit(2); };

const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const record = JSON.parse(readText(RECORD_FILE));
let sql = readText(MIGRATION_FILE);
const book = JSON.parse(readText(BOOK_FILE));

/* ---- the migration, read as code ---- */
/** the SQL with comments removed, quotes respected */
function stripSqlComments(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === "'") {
      let j = i + 1;
      while (j < src.length) { if (src[j] === "'" && src[j + 1] === "'") j += 2; else if (src[j] === "'") break; else j += 1; }
      out += src.slice(i, j + 1); i = j + 1;
    } else if (c === '-' && d === '-') {
      while (i < src.length && src[i] !== '\n') i += 1;
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
    } else { out += c; i += 1; }
  }
  return out;
}
/** the tuples of "with <name>(cols) as (values ... )" as arrays of numbers and strings */
function valuesOf(code, name) {
  const start = code.search(new RegExp(`with\\s+${name}\\s*\\([^)]*\\)\\s+as\\s*\\(\\s*values`, 'i'));
  if (start < 0) return null;
  let i = code.indexOf('values', start) + 'values'.length;
  const rows = [];
  let row = null, depth = 0;
  while (i < code.length) {
    const c = code[i];
    if (/\s|,/.test(c)) { i += 1; continue; }
    if (c === '(') { depth += 1; row = []; i += 1; continue; }
    if (c === ')') {
      if (depth === 0) break;
      depth -= 1; rows.push(row); row = null; i += 1; continue;
    }
    if (c === "'") {
      let j = i + 1, s = '';
      while (j < code.length) {
        if (code[j] === "'" && code[j + 1] === "'") { s += "'"; j += 2; } else if (code[j] === "'") break; else { s += code[j]; j += 1; }
      }
      row.push(s); i = j + 1; continue;
    }
    const m = code.slice(i).match(/^-?\d+/);
    if (m && row) { row.push(Number(m[0])); i += m[0].length; continue; }
    const w = code.slice(i).match(/^null\b/i);
    if (w && row) { row.push(null); i += 4; continue; }
    throw new Error(`${MIGRATION_FILE}: cannot read the ${name} list at ${JSON.stringify(code.slice(i, i + 30))}`);
  }
  return rows;
}
const asRow = t => ({ id: t[0], year: t[1], winner: t[2], school: t[3], position: t[4] });

/* ---- controls that edit the inputs, in memory ---- */
const rowByYear = y => record.rows.find(r => r.year === y);
const tuple = r => `(${r.id}, ${r.year}, '${r.winner.replace(/'/g, "''")}', '${r.school.replace(/'/g, "''")}', '${r.position}')`;
const readTuple = (id, year, winner, school, position) => `(${id}, ${year}, '${winner.replace(/'/g, "''")}', '${school.replace(/'/g, "''")}', '${position}')`;
function replaceOnce(src, from, to, why) {
  const at = src.indexOf(from);
  if (at < 0) refuse(`${why}: ${JSON.stringify(from.slice(0, 70))} is not there`);
  return src.slice(0, at) + to + src.slice(at + from.length);
}
function replaceIn(src, listName, from, to, why) {
  /* only inside the named values list, so a control cannot hit the other two */
  const start = src.search(new RegExp(`with\\s+${listName}\\s*\\(`, 'i'));
  if (start < 0) refuse(`${why}: no ${listName} list`);
  const end = src.indexOf('\n  )', start);
  const block = src.slice(start, end);
  return src.slice(0, start) + replaceOnce(block, from, to, why) + src.slice(end);
}

if (CONTROL === 'onesource') {
  const r = rowByYear(1961);
  if (!r || r.sources.length < 2) refuse('1961 has no second source to remove');
  r.sources = r.sources.slice(0, 1);
}
if (CONTROL === 'recordedit') {
  /* a coordinated edit everywhere except the pin: exactly what the pin is for */
  const r = rowByYear(1985);
  if (!r || r.school !== 'Auburn') refuse('1985 is not Auburn in the record');
  const was = readTuple(r.id, r.year, r.winner, 'Auburn', r.position);
  const now = readTuple(r.id, r.year, r.winner, 'Alabama', r.position);
  sql = replaceIn(sql, 'read_state', was, now, 'recordedit read_state');
  sql = replaceIn(sql, 'end_state', was, now, 'recordedit end_state');
  const b = (book.sections.heisman || []).find(x => x.year === 1985);
  if (!b || b.extra.school !== 'Auburn') refuse('1985 is not Auburn in recordBooks.json');
  b.extra.school = 'Alabama';
  r.school = 'Alabama';
}
if (CONTROL === 'enddiffers') {
  const r = rowByYear(1950);
  if (!r || r.position !== 'RB') refuse('1950 is not RB in the record');
  sql = replaceIn(sql, 'end_state', tuple(r), tuple({ ...r, position: 'QB' }), 'enddiffers');
}
if (CONTROL === 'missing') {
  const r = rowByYear(1990);
  if (!r) refuse('no 1990 row');
  sql = replaceIn(sql, 'end_state', `${tuple(r)},\n`, '', 'missing');
}
if (CONTROL === 'placeholder') {
  /* the table holds a row the migration neither corrects nor removes */
  const last = record.rows.reduce((a, b) => (b.id > a.id ? b : a));
  const asRead = tuple({ ...last, position: last.was?.position ?? last.position });
  sql = replaceIn(sql, 'read_state', asRead, `${asRead},\n    (${last.id + 1}, ${last.year + 1}, 'TBD', 'TBD', 'TBD')`, 'placeholder');
}
if (CONTROL === 'unguarded') {
  sql = replaceOnce(sql, 'and t.position = f.was', '', 'unguarded');
}
if (CONTROL === 'stalepage') {
  const b = (book.sections.heisman || []).find(x => x.year === 1950);
  if (!b || b.extra.position !== 'RB') refuse('1950 is not RB in recordBooks.json');
  b.extra.position = 'HB/P';
}

const code = stripSqlComments(sql);
const readState = (valuesOf(code, 'read_state') || []).map(asRow);
const endState = (valuesOf(code, 'end_state') || []).map(asRow);
const fixes = (valuesOf(code, 'fix') || []).map(t => ({ id: t[0], year: t[1], was: t[2], now: t[3] }));
/* the computed end state: the read state with each correction applied where it
   still holds the value read, exactly as the UPDATE's WHERE does */
const computed = readState.map(r => {
  const f = fixes.find(x => x.id === r.id && x.year === r.year && x.was === r.position);
  return f ? { ...r, position: f.now } : { ...r };
});
const kept = record.rows.filter(r => r.status === 'verified' || r.status === 'corrected');
const keptById = new Map(kept.map(r => [r.id, r]));

/** why a row looks like a placeholder, or '' */
const EMPTYISH = /^(tbd|tba|unknown|n\/?a|none|null|placeholder|test|xxx|\?+|-+|\.+)$/i;
function placeholderWhy(r, lastYear) {
  for (const k of ['winner', 'school', 'position']) {
    const v = r[k];
    if (v == null || !String(v).trim()) return `${k} is empty`;
    if (EMPTYISH.test(String(v).trim())) return `${k} is ${JSON.stringify(v)}`;
  }
  if (!Number.isInteger(r.year) || r.year < 1935 || r.year > lastYear) return `year ${r.year} is outside 1935 to ${lastYear}`;
  if (/\d|\(dup\)/i.test(r.winner)) return `winner ${JSON.stringify(r.winner)} carries a digit or a dup tag`;
  if (r.winner === r.school) return 'winner and school are the same text';
  if (!POSITIONS.has(r.position)) return `position ${JSON.stringify(r.position)} is a code neither source uses`;
  return '';
}

/* ======================================================================= */
current = 1;
console.log('1) the record is sound');
{
  const years = record.rows.map(r => r.year).sort((a, b) => a - b);
  const first = years[0], last = years[years.length - 1];
  if (first !== 1935) fail(`the record starts in ${first}; the award began in 1935`);
  for (let y = first; y <= last; y++) {
    const n = years.filter(x => x === y).length;
    if (n === 0) fail(`the record has no row for ${y}`);
    if (n > 1) fail(`the record has ${n} rows for ${y}`);
  }
  const ids = record.rows.map(r => r.id);
  if (new Set(ids).size !== ids.length) fail('two record rows share an id');
  const tally = { verified: 0, corrected: 0, dropped: 0 };
  for (const r of record.rows) {
    if (!(r.status in tally)) { fail(`${r.year}: status ${JSON.stringify(r.status)} is not verified, corrected or dropped`); continue; }
    tally[r.status] += 1;
    if (r.status === 'dropped' && !r.reason) fail(`${r.year}: dropped with no reason`);
    if (r.status === 'corrected' && !(r.was && Object.entries(r.was).some(([k, v]) => v !== r[k]))) fail(`${r.year}: corrected but no field says what it was`);
    if (r.status === 'verified' && r.was) fail(`${r.year}: verified yet carries a was`);
    if (r.status !== 'dropped') {
      const why = placeholderWhy(r, last);
      if (why) fail(`${r.year}: ${why}`);
    }
    const src = Array.isArray(r.sources) ? r.sources : [];
    const hosts = new Set(src.filter(u => /^https:\/\//.test(u)).map(u => new URL(u).hostname.replace(/^www\./, '')));
    if (src.length < 2 || hosts.size < 2) fail(`${r.year}: needs two sources on two hosts, has ${src.length} on ${hosts.size}`);
    else if (!/^https:\/\/www\.heisman\.com\//.test(src[0])) fail(`${r.year}: the first source is not the award body: ${src[0]}`);
  }
  const c = record.counts || {};
  if (c.read !== record.rows.length) fail(`counts.read is ${c.read}, the record has ${record.rows.length} rows`);
  for (const k of Object.keys(tally)) if ((k === 'dropped' ? c.dropped : c[k]) !== tally[k]) fail(`counts.${k} is ${c[k]}, the rows give ${tally[k]}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.checkedOn || '')) fail('the record carries no checkedOn date');
  console.log(`   ${record.rows.length} rows, ${first} to ${last}: ${tally.verified} verified, ${tally.corrected} corrected, ${tally.dropped} dropped, checked ${record.checkedOn}`);
}

/* ======================================================================= */
current = 2;
console.log('2) the record matches its pin');
{
  const canon = [...record.rows].sort((a, b) => a.year - b.year).map(r => [r.year, r.id, r.winner, r.school, r.position, r.status].join('|')).join('\n');
  const got = createHash('sha256').update(canon, 'utf8').digest('hex');
  if (got !== RECORD_PIN) fail(`the record's hash is ${got.slice(0, 16)}..., the pin is ${RECORD_PIN.slice(0, 16)}...: a verified value changed without the pin`);
  console.log(`   sha256 ${got.slice(0, 16)}... over ${record.rows.length} rows`);
}

/* ======================================================================= */
current = 3;
console.log("3) the migration's end state agrees with the record");
{
  if (!readState.length || !endState.length || !fixes.length) fail('the migration has no read_state, fix or end_state list to read');
  let compared = 0;
  const endById = new Map(endState.map(r => [r.id, r]));
  const compById = new Map(computed.map(r => [r.id, r]));
  for (const [label, rows] of [['the end state it asserts', endState], ['the end state its corrections produce', computed]]) {
    for (const r of rows) {
      const want = keptById.get(r.id);
      if (!want) continue; /* check 5 owns rows the record does not hold */
      compared += 1;
      for (const k of ['year', 'winner', 'school', 'position']) {
        if (r[k] !== want[k]) fail(`${want.year} (id ${r.id}): ${label} has ${k} ${JSON.stringify(r[k])}, the record says ${JSON.stringify(want[k])}`);
      }
    }
  }
  for (const [id, e] of endById) {
    const c = compById.get(id);
    if (c && JSON.stringify(c) !== JSON.stringify(e)) fail(`id ${id}: the asserted end state and the computed one differ, so the migration's own final check would roll it back`);
  }
  for (const f of fixes) {
    const want = keptById.get(f.id);
    if (!want) continue;
    if (want.status !== 'corrected' || want.was?.position !== f.was) fail(`${f.year} (id ${f.id}): the migration corrects from ${JSON.stringify(f.was)}, the record says it was ${JSON.stringify(want.was?.position ?? want.position)}`);
    const r = readState.find(x => x.id === f.id);
    if (r && r.position !== f.was) fail(`${f.year} (id ${f.id}): the correction expects ${JSON.stringify(f.was)} but the read state holds ${JSON.stringify(r.position)}, so it would never fire`);
  }
  for (const want of kept.filter(r => r.status === 'corrected')) {
    if (!fixes.some(f => f.id === want.id)) fail(`${want.year}: the record corrects it and the migration does not`);
  }
  console.log(`   ${compared} row comparisons, ${fixes.length} corrections traced from the read state`);
}

/* ======================================================================= */
current = 4;
console.log('4) no verified row is missing from the end state');
{
  let present = 0;
  for (const want of kept) {
    const inEnd = endState.some(r => r.id === want.id && r.year === want.year);
    const inComp = computed.some(r => r.id === want.id && r.year === want.year);
    if (!inEnd) fail(`${want.year} ${want.winner} (id ${want.id}) is missing from the end state the migration asserts`);
    if (!inComp) fail(`${want.year} ${want.winner} (id ${want.id}) is missing from the end state its corrections produce`);
    if (inEnd && inComp) present += 1;
  }
  console.log(`   ${present} of ${kept.length} verified rows present in both`);
}

/* ======================================================================= */
current = 5;
console.log('5) nothing beyond the verified rows remains, and nothing placeholder shaped');
{
  const lastYear = Math.max(...record.rows.map(r => r.year));
  let rows = 0;
  for (const [label, list] of [['asserted', endState], ['computed', computed]]) {
    for (const r of list) {
      rows += 1;
      const why = placeholderWhy(r, lastYear);
      if (why) fail(`the ${label} end state keeps a placeholder shaped row, ${r.year} (id ${r.id}): ${why}`);
      if (!keptById.has(r.id)) fail(`the ${label} end state keeps id ${r.id} (${r.year} ${r.winner}), which is no verified row`);
    }
  }
  const dropped = record.rows.filter(r => r.status === 'dropped');
  for (const d of dropped) if (computed.some(r => r.id === d.id)) fail(`${d.year} (id ${d.id}) was dropped in the record and the migration keeps it`);
  console.log(`   ${rows} end state rows read, ${dropped.length} dropped rows checked gone`);
}

/* ======================================================================= */
current = 6;
console.log('6) the migration is guarded and changes only what it says');
{
  const lc = code.toLowerCase();
  const updateAt = lc.search(/\bupdate\s+public\.cfb_heisman_winners\b/);
  const updates = (lc.match(/\bupdate\s+public\.cfb_heisman_winners\b/g) || []).length;
  if (updates !== 1) fail(`${updates} UPDATE statements, expected exactly one`);
  for (const [re, what] of [[/\binsert\s+into\b/, 'INSERT'], [/\bdelete\s+from\b/, 'DELETE'], [/\btruncate\b/, 'TRUNCATE'], [/\b(alter|drop|create)\s+(table|function|policy|index|trigger|view)\b/, 'DDL']]) {
    if (re.test(lc)) fail(`the migration carries ${what}, which the record does not call for`);
  }
  const readAt = lc.search(/with\s+read_state\s*\(/);
  const firstRaise = lc.indexOf('raise exception', readAt);
  if (readAt < 0 || firstRaise < 0 || updateAt < 0 || !(readAt < firstRaise && firstRaise < updateAt)) fail('no read state guard that raises before the UPDATE');
  const where = updateAt >= 0 ? lc.slice(updateAt, lc.indexOf(';', updateAt)) : '';
  if (!/t\.position\s*=\s*f\.was/.test(where)) fail('the UPDATE has no guard on the value read, so it would overwrite a row that moved');
  if (!/t\.id\s*=\s*f\.id/.test(where)) fail('the UPDATE does not match rows by id');
  const nGuard = lc.match(/if\s+n\s*<>\s*(\d+)\s+then\s+raise\s+exception/);
  const corrected = record.rows.filter(r => r.status === 'corrected').length;
  if (!nGuard) fail('no row count guard after the UPDATE');
  else if (Number(nGuard[1]) !== corrected) fail(`the row count guard expects ${nGuard[1]}, the record corrects ${corrected}`);
  const endAt = lc.search(/with\s+end_state\s*\(/);
  if (endAt < updateAt || lc.indexOf('raise exception', endAt) < 0) fail('no end state check that raises after the UPDATE');
  /* the header is prose on purpose, so it is read with its comments */
  const header = sql.split('\n').filter(l => l.startsWith('--')).join('\n');
  for (const r of record.rows.filter(x => x.status === 'corrected')) {
    const line = `${r.year} ${r.winner} (id ${r.id}): ${r.was.position} to ${r.position}.`;
    if (!header.includes(line)) fail(`the header does not list ${line}`);
  }
  if (!/unapplied/i.test(header)) fail('the header does not say the migration is unapplied');
  console.log(`   ${updates} UPDATE, guard on the value read, count guard ${nGuard ? nGuard[1] : 'none'}, ${corrected} header lines`);
}

/* ======================================================================= */
current = 7;
console.log('7) the Record Books page shows the record');
{
  const rows = book.sections?.heisman;
  if (!Array.isArray(rows)) fail(`${BOOK_FILE} has no heisman section`);
  else {
    const want = [...kept].sort((a, b) => b.year - a.year);
    if (rows.length !== want.length) fail(`${BOOK_FILE} holds ${rows.length} Heisman rows, the record holds ${want.length}`);
    for (let i = 0; i < Math.max(rows.length, want.length); i++) {
      const g = rows[i], w = want[i];
      if (!g || !w) continue;
      const cells = [['year', g.year, w.year], ['winner', g.champion, w.winner], ['school', g.extra?.school, w.school], ['position', g.extra?.position, w.position]];
      for (const [k, got, exp] of cells) if (got !== exp) fail(`${BOOK_FILE} row ${i + 1} (${w.year}): ${k} is ${JSON.stringify(got)}, the record says ${JSON.stringify(exp)}`);
      const extraKeys = Object.keys(g.extra || {}).filter(k => k !== 'school' && k !== 'position');
      if (extraKeys.length) fail(`${BOOK_FILE} ${w.year} carries ${extraKeys.join(', ')}, which the record does not verify`);
    }
    console.log(`   ${rows.length} page rows against ${want.length} record rows, newest first`);
  }
}

/* ======================================================================= */
console.log('');
const red = [...findings.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const [want, phrase] = CONTROLS[CONTROL];
  const own = findings.get(want) || [];
  if (red.length === 1 && red[0] === want && own.some(m => m.includes(phrase))) {
    console.log(`simHeisman control ${CONTROL}: green. Check ${want} went red (${own.length} finding${own.length === 1 ? '' : 's'}, "${phrase}" among them) and no other check did.`);
    process.exit(0);
  }
  console.error(`simHeisman control ${CONTROL}: RED. Expected only check ${want} to fail with "${phrase}", got ${red.length ? red.join(', ') : 'none'}.`);
  process.exit(1);
}
if (red.length) {
  const n = [...findings.values()].reduce((a, b) => a + b.length, 0);
  console.error(`simHeisman: ${n} failure${n === 1 ? '' : 's'} in check${red.length === 1 ? '' : 's'} ${red.join(', ')}.`);
  process.exit(1);
}
console.log(`simHeisman: green. ${kept.length} verified Heisman rows, the migration's end state equal to them, ${record.rows.filter(r => r.status === 'corrected').length} corrections guarded, and the Record Books page showing the same rows.`);
