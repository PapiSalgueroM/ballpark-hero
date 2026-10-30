/* Round 1567: the Baseball, NFL and NHL Connections migration, and its checksummed all or nothing form, run for
   real in an embedded Postgres (PGlite), never against the live project.

   supabase/migrations/20261029130000_round_1567_us_connections_gray.sql (the guarded form) and the SQL that
   scripts/qa/usConnections1567Checksummed.mjs writes from the lead's exports (the form production gets, as 1553
   and 1558 did) both run here word for word.

   What it proves:
     0. the migration is what its generator gives from the files (31 baseball, 4 NFL, 4 NHL boards); every new board
        is the shipped file's board and every old value is the base file's board or the baseball seed's;
     A. "file": each table holds the base file's boards plus two rows past the file (one valid, one not); the guarded
        form rewrites every named row to the new board in place, touches nothing else, keeps the row count, every
        sort_order and the valid pool, and a second run is a no-op;
     B. "seed": baseball as its seed migration left it; the guarded form still lands all 31;
     C. "drift": one named row per table changed first; the guarded form leaves exactly those alone;
     D. "checksum": the checksummed form written from an export of the "file" tables lands all 39, and a second
        run is a no-op;
     E. "tamper": one character of that payload changed (a hand copy slip): it raises and changes nothing;
     F. "late drift": a row changed after the export: it raises and changes nothing (all or nothing);
     G. the generator itself stops on an export holding a drifted row.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseUsConnections1567.mjs
   Negative controls, each must exit 1 and say which check caught it:
     REHEARSE_CONTROL=noguard  the guard stripped from the guarded form: C overwrites the drifted rows
     REHEARSE_CONTROL=drift    one tile of bconn-018's new board changed in the migration only: check 0
     REHEARSE_CONTROL=tamper   the payload checksum test stripped from the checksummed form: E lands a wrong board
     REHEARSE_CONTROL=nohash   the per row hash test stripped from the checksummed form: F overwrites the late drift
   A control that cannot find what it changes exits 2 (ABORTED). Not named sim*: the suite runner must not pick up
   a script that needs a package the repo does not carry. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { plan, boardsAt, seedBoards, migrationText, same, SPORTS, MIGRATION as MIGRATION_PATH, BASE, ROUND_FILES } from './usConnections1567Migration.mjs';
import { checksummedSql, payloadFrom } from './usConnections1567Checksummed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROL = process.env.REHEARSE_CONTROL || '';
if (CONTROL && !['noguard', 'drift', 'tamper', 'nohash'].includes(CONTROL)) { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
const dir = process.env.PGLITE_DIR;
if (!dir) { console.error('PGLITE_DIR is not set: see the header of this file. Nothing was run.'); process.exit(2); }
const entry = path.join(dir, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js');
if (!fs.existsSync(entry)) { console.error(`no PGlite at ${entry}. Nothing was run.`); process.exit(2); }
const { PGlite } = await import(pathToFileURL(entry).href);
const abort = m => { console.error(`control ${CONTROL}: ${m}, ABORTED`); process.exit(2); };

let failures = 0;
const fail = s => { failures += 1; console.error('  FAIL: ' + s); };
const caught = new Set();
const catchBy = (check, s) => { caught.add(check); fail(s); };

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let MIGRATION = read(MIGRATION_PATH);
const SEED = read('supabase/migrations/20260526000007_baseball_connections_puzzles.sql');
if (CONTROL === 'noguard') {
  let n = 0;
  for (const s of Object.keys(SPORTS)) {
    const guard = `\n         and c.groups_json in (select o.old_groups from r1567_${s} o where o.puzzle_id = r.puzzle_id);`;
    if (MIGRATION.includes(guard)) { MIGRATION = MIGRATION.replace(guard, ';'); n += 1; }
  }
  if (n !== 3) abort(`found ${n} of the 3 guards`);
}
if (CONTROL === 'drift') {
  const at = MIGRATION.indexOf("    ('bconn-018', ");
  const end = at < 0 ? -1 : MIGRATION.indexOf('\n', at);
  const line = at < 0 ? '' : MIGRATION.slice(at, end);
  const k = line.lastIndexOf('Luis Aparicio');
  if (k < 0) abort("bconn-018's new board with Luis Aparicio is not in the migration");
  MIGRATION = MIGRATION.slice(0, at) + line.slice(0, k) + 'Luis Aparicia' + line.slice(k + 'Luis Aparicio'.length) + MIGRATION.slice(end);
}

/* the migration's own rows by table: puzzle_id, a known old board, the new board */
const rows = { baseball: [], nfl: [], nhl: [] };
let current = null;
for (const line of MIGRATION.split('\n')) {
  const t = line.match(/insert into r1567_(\w+) /);
  if (t) current = t[1];
  const m = line.match(/^\s*\('([^']+)', '((?:[^']|'')*)', '((?:[^']|'')*)'\),?$/);
  if (m && current) rows[current].push({ id: m[1], old: JSON.parse(m[2].replace(/''/g, "'")), now: JSON.parse(m[3].replace(/''/g, "'")) });
}
const ids = s => [...new Set(rows[s].map(r => r.id))];
const p = await plan();
const head = await boardsAt(ROUND_FILES); /* fix-1567: the round's boards, not whatever head this runs on */
const base = await boardsAt(BASE);
const seed = seedBoards();

console.log('0) the migration against its generator and the files');
{
  const want = { baseball: 31, nfl: 4, nhl: 4 };
  for (const s of Object.keys(SPORTS)) {
    if (ids(s).length !== want[s] || p[s].length !== want[s]) catchBy('0', `${s}: the migration names ${ids(s).length} boards, the generator ${p[s].length}, this round ${want[s]}`);
    const fileBoard = new Map(head[s].map(b => [b.id, b.groups]));
    const baseBoard = new Map(base[s].map(b => [b.id, b.groups]));
    let tied = 0, olds = 0;
    for (const r of rows[s]) {
      if (!same(fileBoard.get(r.id), r.now)) catchBy('0', `${s} ${r.id}: the migration's new board is not the shipped file's board`);
      else tied += 1;
      if (same(baseBoard.get(r.id), r.old) || (s === 'baseball' && same(seed[r.id], r.old))) olds += 1;
      else catchBy('0', `${s} ${r.id}: an old value is neither the base file's board (${BASE}) nor the seed's`);
    }
    console.log(`   ${s}: ${ids(s).length} boards, ${tied} of ${rows[s].length} new values equal the shipped file, ${olds} of ${rows[s].length} old values are the base file's or the seed's`);
  }
  if (!CONTROL && (await migrationText()) !== MIGRATION) catchBy('0', 'the committed migration is not what scripts/qa/usConnections1567Migration.mjs writes');
}

const CREATE = t => `create table public.${t} (id uuid primary key default gen_random_uuid(), puzzle_id text not null unique, groups_json jsonb not null, sort_order smallint not null, created_at timestamptz not null default now());`;
const valid = g => { const a = Array.isArray(g) ? g : []; const all = a.flatMap(x => x.players ?? []); return a.length === 4 && a.every(x => (x.players ?? []).length === 5) && new Set(all).size === 20; };
const DRIFTED = [{ theme: 'A drifted board', players: ['A', 'B', 'C', 'D', 'E'], difficulty: 'yellow' }];
const DRIFT_IDS = { baseball: 'bconn-018', nfl: 'nflconn-004', nhl: 'nhlconn-004' };

/** A fresh database holding the base file's boards (or, for baseball "seed", the seed migration's), plus two rows
    past the file in each table: one valid board, one with three groups (the game never deals it). */
async function fresh(kind = 'file') {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated;');
  for (const [s, [, table]] of Object.entries(SPORTS)) {
    if (s === 'baseball' && kind === 'seed') await db.exec(SEED);
    else {
      await db.exec(CREATE(table));
      for (const [i, b] of base[s].entries()) await db.query(`insert into public.${table} (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)`, [b.id, JSON.stringify(b.groups), i + 1]);
    }
    const last = base[s].length;
    await db.query(`insert into public.${table} (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)`, [`${s}-past-1`, JSON.stringify(base[s][0].groups), last + 1]);
    await db.query(`insert into public.${table} (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)`, [`${s}-past-2`, JSON.stringify(base[s][1].groups.slice(0, 3)), last + 2]);
  }
  return db;
}
const snap = async (db, table) => (await db.query(`select puzzle_id, sort_order, groups_json from public.${table} order by sort_order`)).rows;
const snapAll = async db => Object.fromEntries(await Promise.all(Object.entries(SPORTS).map(async ([s, [, t]]) => [s, await snap(db, t)])));
const tryExec = async (db, sql) => { try { await db.exec(sql); return null; } catch (e) { return String(e.message ?? e); } };

/** The table after a run against the table before it: every named row at the new board (or left alone), nothing
    else changed, the row count, sort_order and the valid pool kept. */
function judge(label, s, before, after, { left = [] } = {}) {
  const ok = { rewritten: 0, left: 0 };
  if (after.length !== before.length) catchBy('A', `${label} ${s}: ${before.length} rows became ${after.length}`);
  if (!same(after.map(r => [r.puzzle_id, r.sort_order]), before.map(r => [r.puzzle_id, r.sort_order]))) catchBy('A', `${label} ${s}: a puzzle_id or sort_order moved`);
  const vb = before.filter(r => valid(r.groups_json)).map(r => r.puzzle_id).join();
  const va = after.filter(r => valid(r.groups_json)).map(r => r.puzzle_id).join();
  if (vb !== va) catchBy('A', `${label} ${s}: the valid pool changed, so every daily would reshuffle`);
  const named = new Set(ids(s));
  const by = new Map(after.map(r => [r.puzzle_id, r.groups_json]));
  for (const b of before) {
    const got = by.get(b.puzzle_id);
    if (left.includes(b.puzzle_id)) { if (same(got, b.groups_json)) ok.left += 1; else catchBy('C', `${label} ${s}: ${b.puzzle_id} had drifted and was overwritten`); continue; }
    if (named.has(b.puzzle_id)) { if (same(got, head[s].find(x => x.id === b.puzzle_id).groups)) ok.rewritten += 1; else catchBy('A', `${label} ${s}: ${b.puzzle_id} does not hold the new board`); continue; }
    if (!same(got, b.groups_json)) catchBy('A', `${label} ${s}: ${b.puzzle_id} is not in the migration and changed`);
  }
  return ok;
}

console.log('A) file: the guarded form on the base file boards');
{
  const db = await fresh('file');
  const before = await snapAll(db);
  const err = await tryExec(db, MIGRATION);
  if (err) catchBy('A', `the migration raised: ${err}`);
  const after = await snapAll(db);
  for (const s of Object.keys(SPORTS)) {
    const ok = judge('file', s, before[s], after[s]);
    console.log(`   ${s}: ${before[s].length} rows (${before[s].filter(r => valid(r.groups_json)).length} valid before, ${after[s].filter(r => valid(r.groups_json)).length} after); ${ok.rewritten} rewritten in place`);
  }
  await tryExec(db, MIGRATION);
  if (!same(await snapAll(db), after)) catchBy('A', 'file: a second run changed a table');
}

console.log('B) seed: baseball as its seed migration left it');
{
  const db = await fresh('seed');
  const before = (await snapAll(db)).baseball;
  const own = MIGRATION.replace(/do \$\$[\s\S]*?\$\$;/g, block => (block.includes('public.baseball_connections_puzzles ') ? block : ''));
  const err = await tryExec(db, own);
  if (err) catchBy('B', `the baseball block raised: ${err}`);
  const after = (await snapAll(db)).baseball;
  const ok = judge('seed', 'baseball', before, after);
  console.log(`   baseball: ${before.length} rows; ${ok.rewritten} rewritten in place from the seed's boards`);
}

console.log('C) drift: one named row per table changed first; the guard leaves it alone');
{
  const db = await fresh('file');
  for (const [s, [, t]] of Object.entries(SPORTS)) await db.query(`update public.${t} set groups_json = $1::jsonb where puzzle_id = $2`, [JSON.stringify(DRIFTED), DRIFT_IDS[s]]);
  const before = await snapAll(db);
  const err = await tryExec(db, MIGRATION);
  if (err) catchBy('C', `the migration raised: ${err}`);
  const after = await snapAll(db);
  for (const s of Object.keys(SPORTS)) {
    const ok = judge('drift', s, before[s], after[s], { left: [DRIFT_IDS[s]] });
    console.log(`   ${s}: ${ok.rewritten} rewritten, ${ok.left} drifted row left alone (${DRIFT_IDS[s]})`);
  }
}

/* the export the lead takes: the rows with Postgres's own md5 of the stored text */
const exportOf = async db => Object.fromEntries(await Promise.all(Object.entries(SPORTS).map(async ([s, [, t]]) => [s, (await db.query(`select puzzle_id, sort_order, groups_json, md5(groups_json::text) as h from public.${t} order by sort_order`)).rows])));
const CHECKSUM_TEST = /  if md5\(payload\) <> '[0-9a-f]{32}' then\n    raise exception 'Round 1567: payload checksum mismatch, nothing applied';\n  end if;\n/;
const stripChecksum = sql => {
  if (!CHECKSUM_TEST.test(sql)) abort('the payload checksum test is not in the checksummed SQL');
  return sql.replace(CHECKSUM_TEST, '');
};
const HASH_TEST = ' and md5(c.groups_json::text) = rec.h;';
const stripHash = sql => {
  const n = sql.split(HASH_TEST).length - 1;
  if (n !== 3) abort(`found ${n} of the 3 per row hash tests in the checksummed SQL`);
  return sql.split(HASH_TEST).join(';');
};

console.log('D) checksum: the all or nothing form from an export of the file tables');
let SQL = '';
{
  const db = await fresh('file');
  const ex = await exportOf(db);
  const r = await payloadFrom(ex);
  if (r.rows.length !== 39 || r.drifted.length || r.missing.length || r.already.length) catchBy('D', `the payload holds ${r.rows.length} rows (drifted ${r.drifted.length}, missing ${r.missing.length}, already ${r.already.length}), expected 39 and none else`);
  SQL = checksummedSql(r.rows);
  const before = await snapAll(db);
  const err = await tryExec(db, SQL);
  if (err) catchBy('D', `the checksummed form raised: ${err}`);
  const after = await snapAll(db);
  let n = 0;
  for (const s of Object.keys(SPORTS)) n += judge('checksum', s, before[s], after[s]).rewritten;
  const err2 = await tryExec(db, SQL);
  if (err2) catchBy('D', `a second run raised: ${err2}`);
  if (!same(await snapAll(db), after)) catchBy('D', 'a second run changed a table');
  console.log(`   ${r.rows.length} rows in the payload; ${n} rewritten in place; a second run ${err2 ? 'raised' : 'is a no-op'}`);
}

console.log('E) tamper: one character of the payload changed');
{
  const db = await fresh('file');
  let sql = SQL;
  const k = sql.indexOf('Luis Aparicio');
  if (k < 0) abort('Luis Aparicio is not in the payload');
  sql = sql.slice(0, k) + 'Luis Aparicia' + sql.slice(k + 'Luis Aparicio'.length);
  if (CONTROL === 'tamper') sql = stripChecksum(sql);
  const before = await snapAll(db);
  const err = await tryExec(db, sql);
  const after = await snapAll(db);
  if (!err || !/checksum mismatch/.test(err)) catchBy('E', `a tampered payload was not refused by its checksum (${err ?? 'no error'})`);
  if (!same(after, before)) catchBy('E', 'a tampered payload changed a table');
  console.log(`   refused: ${err ? err.slice(0, 80) : 'NOT REFUSED'}; tables ${same(after, before) ? 'unchanged' : 'CHANGED'}`);
}

console.log('F) late drift: a row changed between the export and the apply');
{
  const db = await fresh('file');
  const sql = CONTROL === 'nohash' ? stripHash(SQL) : SQL;
  await db.query('update public.baseball_connections_puzzles set groups_json = $1::jsonb where puzzle_id = $2', [JSON.stringify(DRIFTED), 'bconn-018']);
  const before = await snapAll(db);
  const err = await tryExec(db, sql);
  const after = await snapAll(db);
  if (!err || !/nothing applied/.test(err)) catchBy('F', `a row that drifted after the export did not stop the step (${err ?? 'no error'})`);
  if (!same(after, before)) catchBy('F', 'a step with a drifted row changed a table (all or nothing broken)');
  console.log(`   refused: ${err ? err.slice(0, 90) : 'NOT REFUSED'}; tables ${same(after, before) ? 'unchanged' : 'CHANGED'}`);
}

console.log('G) the generator stops on an export holding a drifted row');
{
  const db = await fresh('file');
  await db.query('update public.nhl_connections_puzzles set groups_json = $1::jsonb where puzzle_id = $2', [JSON.stringify(DRIFTED), 'nhlconn-004']);
  const r = await payloadFrom(await exportOf(db));
  if (r.drifted.join() !== 'nhl:nhlconn-004' || r.rows.length !== 38) catchBy('G', `the generator saw drifted ${r.drifted.join() || 'none'} and ${r.rows.length} rows, expected nhl:nhlconn-004 and 38`);
  const r2 = await payloadFrom(await exportOf(db), ['nhlconn-004']);
  console.log(`   drifted ${r.drifted.join()}; ${r.rows.length} rows without it, ${r2.rows.length} once the lead accepts it`);
}

console.log('');
if (CONTROL) {
  const own = { noguard: 'C', drift: '0', tamper: 'E', nohash: 'F' }[CONTROL];
  if (caught.has(own)) { console.error(`rehearseUsConnections1567 control ${CONTROL}: FIRED, caught by check ${own} (${failures} failure${failures === 1 ? '' : 's'}; checks ${[...caught].join(', ')})`); process.exit(1); }
  console.log(`rehearseUsConnections1567 control ${CONTROL}: did NOT fire (check ${own} stayed green; ${failures} failures in ${[...caught].join(', ') || 'none'}). This control proves nothing as the code stands.`);
  process.exit(0);
}
if (failures) { console.error(`rehearseUsConnections1567: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('rehearseUsConnections1567: green. Both forms land the 39 boards in place, a drifted row is left alone or stops the step, a tampered payload is refused, and a second run is a no-op.');
