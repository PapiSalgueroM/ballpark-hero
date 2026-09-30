/**
 * Round 731: pin public.nascar_champions to the row by row record.
 *
 * The data map said this table was complete and had never been checked
 * against a second source. Round 731 read all 77 rows and checked each one
 * against nascar.com and Racing Reference (ESPN for every champion, Fox Sports
 * for every team). The result lives in scripts/data/nascarChampionsVerified2026-09.json
 * and the fixes in supabase/migrations/20260930_round_731_nascar_champions.sql.
 *
 * WHAT THIS READS. It does not trust the live table to be fixed. It rebuilds
 * the table as it stood when it was read (the record's values, with each
 * corrected field put back to what it "was"), then runs the migration's own
 * update, delete and insert statements over that copy, honouring their WHERE
 * clauses, and checks the END STATE that migration would leave. So it is green
 * on the branch before the migration is applied, and it goes red the moment
 * the migration and the record disagree. SQL comments are stripped before
 * parsing, because the migration header quotes every old and new value and a
 * parser reading prose would find them there.
 *
 * Sections:
 *   1) provenance: every row carries two source URLs from the two sources,
 *      a second team source, a status and the date it was checked
 *   2) famous totals, read off the record: seven titles for Richard Petty,
 *      Dale Earnhardt and Jimmie Johnson, four for Jeff Gordon, three for
 *      Joey Logano; 15 for Rick Hendrick's team and 5 for Roger Penske's
 *      (both counts stated by nascar.com after the 2025 and 2024 finales)
 *   3) the migration's guard hashes are the record's before and end states
 *   4) the migration's end state agrees with the record, field by field
 *   5) no verified row is missing from the end state, and it still holds the
 *      36 distinct champions nascar.com counts
 *   6) no placeholder, junk or unrecorded row remains in the end state
 *   7) the live table (read only, public REST) is either the state that was
 *      read or the verified end state, and nothing else. Skipped, loudly, if
 *      the database cannot be reached.
 *
 * Negative controls, NASCAR_CONTROL=<name>. Each plants one defect, refuses to
 * run if the plant changed nothing, and passes only if its own section and no
 * other goes red:
 *   nosource    drops one source URL from one row            -> section 1
 *   anchor      expects six Petty titles instead of seven    -> section 2
 *   guard       swaps the migration's before hash            -> section 3
 *   wrongvalue  makes the 1968 update write a different team -> section 4
 *   missing     adds a delete of the 1992 row                -> section 5
 *   placeholder adds an insert of a 2026 'TBD' row           -> section 6
 *   live        alters one value of the live read            -> section 7
 *
 * Run: node scripts/simNascarChampions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD_PATH = path.join(ROOT, 'scripts', 'data', 'nascarChampionsVerified2026-09.json');
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations', '20260930_round_731_nascar_champions.sql');
const TABLE = 'public.nascar_champions';
const FIELDS = ['driver_name', 'team', 'manufacturer', 'wins_that_season', 'points'];
const CONTROLS = { nosource: 1, anchor: 2, guard: 3, wrongvalue: 4, missing: 5, placeholder: 6, live: 7 };
const CONTROL = process.env.NASCAR_CONTROL || '';
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`NASCAR_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const cannotRun = why => { console.error(`control cannot run: ${why}`); process.exit(1); };

const red = new Map();
let section = 0;
const fail = m => { red.set(section, (red.get(section) || 0) + 1); console.error(`  FAIL: ${m}`); };
const start = (n, title) => { section = n; console.log(`${n}) ${title}`); };

const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
let rows = record.rows;
let sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

/* ---------- plants ---------- */
const plantSql = (from, to, label) => {
  if (!sql.includes(from)) cannotRun(`the migration does not contain the text the ${label} control replaces`);
  const next = sql.replace(from, to);
  if (next === sql) cannotRun(`the ${label} control changed nothing`);
  sql = next;
  console.log(`NEGATIVE CONTROL ON (${label}). Section ${CONTROLS[label]} must go red, and only it.`);
};
if (CONTROL === 'nosource') {
  const before = JSON.stringify(rows);
  rows = rows.map(r => (r.year === 1992 ? { ...r, sources: r.sources.slice(0, 1) } : r));
  if (JSON.stringify(rows) === before) cannotRun('no source was dropped');
  console.log('NEGATIVE CONTROL ON (nosource): the 1992 row keeps one source. Section 1 must go red, and only it.');
}
if (CONTROL === 'guard') {
  const m = /before_md5\s+constant\s+text\s*:=\s*'([0-9a-f]{32})'/.exec(sql);
  if (!m) cannotRun('no before_md5 literal in the migration');
  plantSql(`'${m[1]}'`, `'${'0'.repeat(32)}'`, 'guard');
}
if (CONTROL === 'wrongvalue') plantSql("set team = 'Holman-Moody' where year = 1968", "set team = 'Holman Moody Racing' where year = 1968", 'wrongvalue');
if (CONTROL === 'missing' || CONTROL === 'placeholder') {
  const stmt = CONTROL === 'missing'
    ? `  delete from ${TABLE} where year = 1992;\n`
    : `  insert into ${TABLE} (year, driver_name, team, manufacturer, wins_that_season, points) values (2026, 'TBD', null, null, null, null);\n`;
  plantSql('\nend\n$migration$;', `\n${stmt}end\n$migration$;`, CONTROL);
}

/* ---------- the migration, parsed from code only ---------- */
const code = sql.split(/\r?\n/).map(l => l.replace(/--.*$/, '')).join('\n');
const LIT = String.raw`'(?:[^']|'')*'|null|-?\d+`;
const lit = s => (/^null$/i.test(s) ? null : s.startsWith("'") ? s.slice(1, -1).replace(/''/g, "'") : Number(s));
function parseConds(text) {
  const conds = [];
  let rest = text.trim();
  const re = new RegExp(String.raw`^(\w+)\s*(?:=\s*(${LIT})|(is\s+null))\s*(?:and\b\s*|$)`, 'i');
  while (rest) {
    const m = re.exec(rest);
    if (!m) throw new Error(`cannot read the condition "${rest}"`);
    conds.push([m[1], m[3] ? null : lit(m[2])]);
    rest = rest.slice(m[0].length).trim();
  }
  return conds;
}
function parseSets(text) {
  const out = [];
  const re = new RegExp(String.raw`^\s*(\w+)\s*=\s*(${LIT})\s*(?:,|$)`, 'i');
  let rest = text.trim();
  while (rest) {
    const m = re.exec(rest);
    if (!m) throw new Error(`cannot read the assignment "${rest}"`);
    out.push([m[1], lit(m[2])]);
    rest = rest.slice(m[0].length).trim();
  }
  return out;
}
const stmts = [];
const T = TABLE.replace('.', String.raw`\.`);
for (const m of code.matchAll(new RegExp(String.raw`\b(update\s+${T}\s+set\s+([\s\S]+?)\s+where\s+([\s\S]+?);|delete\s+from\s+${T}\s+where\s+([\s\S]+?);|insert\s+into\s+${T}\s*\(([^)]*)\)\s*values\s*\(([\s\S]+?)\)\s*;)`, 'gi'))) {
  if (m[2]) stmts.push({ kind: 'update', sets: parseSets(m[2]), where: parseConds(m[3]) });
  else if (m[4]) stmts.push({ kind: 'delete', where: parseConds(m[4]) });
  else {
    const cols = m[5].split(',').map(s => s.trim());
    const vals = [...m[6].matchAll(new RegExp(LIT, 'gi'))].map(v => lit(v[0]));
    if (cols.length !== vals.length) throw new Error('an insert has a column count unlike its value count');
    stmts.push({ kind: 'insert', row: Object.fromEntries(cols.map((c, i) => [c, vals[i]])) });
  }
}
const hashLit = name => (new RegExp(String.raw`${name}\s+constant\s+text\s*:=\s*'([0-9a-f]{32})'`).exec(code) || [])[1] || null;

/* ---------- the states ---------- */
const pick = r => Object.fromEntries([['year', r.year], ...FIELDS.map(f => [f, r[f] ?? null])]);
const verified = rows.map(pick);
const readState = rows.map(r => ({ ...pick(r), ...(r.was || {}) }));
const matches = (row, where) => where.every(([c, v]) => (row[c] ?? null) === v);
let end = readState.map(r => ({ ...r }));
for (const s of stmts) {
  if (s.kind === 'update') end = end.map(r => (matches(r, s.where) ? { ...r, ...Object.fromEntries(s.sets) } : r));
  else if (s.kind === 'delete') end = end.filter(r => !matches(r, s.where));
  else end.push({ year: null, ...Object.fromEntries(FIELDS.map(f => [f, null])), ...s.row });
}
const fingerprint = rs => crypto.createHash('md5')
  .update(rs.slice().sort((a, b) => a.year - b.year).map(r => [r.year, ...FIELDS.map(f => r[f] ?? '~')].join('|')).join('\n'))
  .digest('hex');
console.log(`   record: ${rows.length} rows checked ${record.checked}; migration: ${stmts.length} statements (${stmts.filter(s => s.kind === 'update').length} update, ${stmts.filter(s => s.kind === 'delete').length} delete, ${stmts.filter(s => s.kind === 'insert').length} insert)`);
if (stmts.length === 0) { console.error('the migration yielded no statements, so nothing below would be testing anything'); process.exit(1); }

/* ---------- 1 ---------- */
start(1, 'every row carries its provenance');
{
  const years = rows.map(r => r.year);
  const lo = Math.min(...years), hi = Math.max(...years);
  if (lo !== 1949) fail(`the record starts in ${lo}; the Cup Series started in 1949`);
  if (new Set(years).size !== years.length) fail('the record lists a season twice');
  if (hi - lo + 1 !== years.length) fail(`the record has ${years.length} rows for ${hi - lo + 1} seasons, so a season is missing from it`);
  let bad = 0;
  for (const r of rows) {
    const src = (r.sources || []).filter(u => /^https:\/\//.test(u));
    const hosts = new Set(src.map(u => new URL(u).hostname.replace(/^www\./, '')));
    const why = [];
    if (src.length < 2 || !hosts.has('nascar.com') || !hosts.has('racing-reference.info')) why.push('lacks a nascar.com and a Racing Reference URL');
    const team = (r.team_sources || []).filter(u => /^https:\/\//.test(u));
    if (new Set(team.map(u => new URL(u).hostname)).size < 2) why.push('has fewer than two team sources from two hosts');
    if (!['verified', 'corrected'].includes(r.status)) why.push(`has status "${r.status}"`);
    if (r.status === 'corrected' && !(r.was && Object.keys(r.was).length)) why.push('is marked corrected with no "was"');
    if (r.status === 'verified' && r.was) why.push('is marked verified but carries a "was"');
    if (why.length) { bad += 1; if (bad <= 4) fail(`${r.year} ${why.join(' and ')}`); }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.checked || '')) fail('the record has no date checked');
  console.log(`   ${rows.length - bad} of ${rows.length} rows carry two sources, a team source pair and a status`);
}

/* ---------- 2 ---------- */
start(2, 'the record reproduces the totals nascar.com states');
{
  const ORG = { 'Rick Hendrick': 'Hendrick', 'Hendrick Motorsports': 'Hendrick', 'Roger Penske': 'Penske', 'Team Penske': 'Penske', 'Penske Racing': 'Penske' };
  const ANCHORS = [
    ['driver', 'Richard Petty', CONTROL === 'anchor' ? 6 : 7],
    ['driver', 'Dale Earnhardt', 7],
    ['driver', 'Jimmie Johnson', 7],
    ['driver', 'Jeff Gordon', 4],
    ['driver', 'Joey Logano', 3],
    ['team', 'Hendrick', 15],
    ['team', 'Penske', 5],
  ];
  if (CONTROL === 'anchor') console.log('NEGATIVE CONTROL ON (anchor): Richard Petty is expected to hold six titles. Section 2 must go red, and only it.');
  for (const [kind, who, want] of ANCHORS) {
    const got = rows.filter(r => (kind === 'driver' ? r.driver_name === who : ORG[r.team] === who)).length;
    if (got !== want) fail(`${who} holds ${got} titles in the record, and the stated total is ${want}`);
  }
  console.log(`   ${ANCHORS.length} totals checked`);
}

/* ---------- 3 ---------- */
start(3, "the migration's guard hashes are the record's two states");
{
  const b = hashLit('before_md5'), a = hashLit('after_md5');
  if (!b || !a) fail('the migration has no before_md5 or after_md5 literal, so it is not guarded');
  if (b && b !== fingerprint(readState)) fail(`the guard expects the table to hash to ${b}, and the state the record says was read hashes to ${fingerprint(readState)}`);
  if (a && a !== fingerprint(verified)) fail(`the migration's end check expects ${a}, and the verified record hashes to ${fingerprint(verified)}`);
  if (record.fingerprint?.before !== fingerprint(readState)) fail('the record\'s own before fingerprint does not match its rows');
  if (!/raise\s+exception/i.test(code)) fail('the migration never raises, so a failed guard would carry on');
  console.log(`   before ${b}, end ${a}`);
}

/* ---------- 4 ---------- */
start(4, "the migration's end state agrees with the record");
{
  let bad = 0, compared = 0;
  const byYear = new Map();
  for (const r of end) { if (!byYear.has(r.year)) byYear.set(r.year, []); byYear.get(r.year).push(r); }
  for (const v of verified) {
    const got = byYear.get(v.year);
    if (!got) continue; /* absence is section 5's finding */
    for (const g of got) {
      compared += 1;
      for (const f of FIELDS) {
        if ((g[f] ?? null) !== (v[f] ?? null)) { bad += 1; if (bad <= 5) fail(`${v.year} ${f}: the migration leaves ${JSON.stringify(g[f])}, the record says ${JSON.stringify(v[f])}`); }
      }
    }
  }
  const changed = rows.filter(r => r.was).length;
  console.log(`   ${compared} rows compared on ${FIELDS.length} fields, ${bad} disagreements; ${changed} rows carry a correction`);
}

/* ---------- 5 ---------- */
start(5, 'no verified row is missing from the end state');
{
  const have = new Set(end.map(r => r.year));
  const gone = verified.filter(v => !have.has(v.year)).map(v => v.year);
  if (gone.length) fail(`the migration leaves no row for ${gone.join(', ')}, which the record verified`);
  const recorded = new Set(verified.map(v => v.year));
  const champs = new Set(end.filter(r => recorded.has(r.year)).map(r => r.driver_name));
  if (champs.size !== 36) fail(`the end state holds ${champs.size} distinct champions and nascar.com counts 36`);
  console.log(`   ${verified.length - gone.length} of ${verified.length} seasons present, ${champs.size} distinct champions`);
}

/* ---------- 6 ---------- */
start(6, 'no placeholder or junk row remains');
{
  const JUNK = /^(|tbd|tba|tbc|unknown|n\/a|na|none|null|undefined|placeholder|test|todo|x+|\?+|-+|\.+)$/i;
  const recorded = new Map(verified.map(v => [v.year, v]));
  const seen = new Map();
  let bad = 0;
  for (const r of end) {
    const why = [];
    if (!Number.isInteger(r.year)) why.push('has no year');
    else if (!recorded.has(r.year)) why.push('is a season the record does not hold');
    seen.set(r.year, (seen.get(r.year) || 0) + 1);
    for (const f of ['driver_name', 'team', 'manufacturer']) {
      const v = r[f];
      if (v == null || JUNK.test(String(v).trim())) why.push(`has ${f} ${JSON.stringify(v)}`);
    }
    if (r.wins_that_season != null && !(Number.isInteger(r.wins_that_season) && r.wins_that_season >= 0 && r.wins_that_season <= 30)) why.push(`has wins_that_season ${r.wins_that_season}`);
    if (why.length) { bad += 1; if (bad <= 4) fail(`the row for ${r.year} ${why.join(' and ')}`); }
  }
  for (const [y, n] of seen) if (n > 1) fail(`${y} has ${n} rows`);
  console.log(`   ${end.length} end state rows, ${bad} placeholder shaped`);
}

/* ---------- 7 ---------- */
start(7, 'the live table is the state read or the verified end state');
{
  let live = null;
  try {
    const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
    const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
    const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
    const res = await fetch(`${url}/rest/v1/nascar_champions?select=year,${FIELDS.join(',')}&order=year&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    live = await res.json();
  } catch (e) {
    console.log(`   SKIPPED: the live table could not be read (${e.message}). Sections 1 to 6 still stand.`);
    /* The live control needs the read; without it the control proves nothing,
       so it must not report green. Counted against section 0, which no
       control expects. */
    if (CONTROL === 'live') { section = 0; fail('control cannot run: the live table could not be read'); }
  }
  if (live) {
    if (CONTROL === 'live') {
      const before = JSON.stringify(live);
      live = live.map(r => (r.year === 1992 ? { ...r, team: 'Placeholder Racing' } : r));
      if (JSON.stringify(live) === before) { section = 0; fail('control cannot run: the live read has no 1992 row to alter'); section = 7; }
      console.log('NEGATIVE CONTROL ON (live): one live value altered. Section 7 must go red, and only it.');
    }
    const fp = fingerprint(live);
    const state = fp === fingerprint(readState) ? 'the state read on ' + record.checked + ' (migration not yet applied)'
      : fp === fingerprint(verified) ? 'the verified end state (migration applied)' : null;
    if (!state) fail(`the live table (${live.length} rows, md5 ${fp}) is neither the state read nor the verified end state, so a row moved outside this record`);
    else console.log(`   live: ${live.length} rows, ${state}`);
  }
}

/* Exit by setting the code and letting the process end. On Windows, calling
   process.exit() while fetch still holds a keep-alive socket aborts node with a
   libuv assertion and exit code 127, which reads as a red that was never there. */
console.log('');
const reds = [...red.keys()].sort();
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (red.has(want) && reds.length === 1) console.log(`simNascarChampions control (${CONTROL}): green. Section ${want} went red and no other did.`);
  else { console.error(`simNascarChampions control (${CONTROL}): RED. Expected section ${want} alone to go red; red sections: ${reds.join(', ') || 'none'}.`); process.exitCode = 1; }
} else if (reds.length) {
  console.error(`simNascarChampions: ${[...red.values()].reduce((a, b) => a + b, 0)} failures in sections ${reds.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`simNascarChampions: green. ${rows.length} seasons pinned, ${rows.filter(r => r.was).length} corrections, the migration's end state is the record.`);
}
