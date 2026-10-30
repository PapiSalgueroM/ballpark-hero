// Round 1565: rehearse the Connections migration and its production form in PGlite on a read only export of the live
// connections_puzzles table, never on production.
// usage: PGLITE_DIR=<dir with @electric-sql/pglite> node scripts/qa/rehearseConnections1565.mjs <export.json>
//        REHEARSE_CONTROL=tamper|drift|noguard for the controls
// Proves, on the export:
//   1) md5(groups_json::text) in Postgres equals scripts/lib/pgJsonbText.mjs's boardMd5 on every exported board and every
//      board of the shipped file (the hash the live snapshot and section 6 of simConnectionsFacts compare by)
//   2) supabase/migrations/20261029120000_round_1565_connections_live.sql leaves every row at the shipped file's board,
//      changes no puzzle_id, sort_order or row count, keeps the valid pool's size and order, and a second run is a no-op
//   3) scripts/qa/connections1565Applied.sql, on a fresh copy, does the same as one all or nothing step, and a second run
//      is a no-op
// Controls (each must exit 1, and its last line says what fired):
//   tamper   one character of the production payload changed after its checksum: it must raise and apply nothing
//   drift    one row the migration rewrites is edited in the table first, as if somebody changed it after the export:
//            both forms must leave it alone (the run is red because the table moved: re-export before applying)
//   noguard  the drift edit with the migration's guard stripped: the edited row is overwritten, which must be caught
// Not named sim*: it needs PGlite, which this repo does not carry (the runner installs it with npm --prefix).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { boardMd5 } from '../lib/pgJsonbText.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [exportPath] = process.argv.slice(2);
const CONTROL = process.env.REHEARSE_CONTROL ?? '';
if (!exportPath || !process.env.PGLITE_DIR) { console.error('usage: PGLITE_DIR=<dir> node scripts/qa/rehearseConnections1565.mjs <export.json>'); process.exit(2); }
const { PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js')).href);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'reh1565-'));
fs.writeFileSync(path.join(TMP, 'e.mjs'), `export { connectionsPuzzles } from '${ROOT.replaceAll('\\', '/')}/src/data/connectionsPuzzles.ts';`);
await build({ entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'b.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { connectionsPuzzles: file } = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);
const fileMd5 = new Map(file.map(b => [b.id, boardMd5(b.groups)]));

const migrationSql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261029120000_round_1565_connections_live.sql'), 'utf8');
const appliedSql = fs.readFileSync(path.join(ROOT, 'scripts/qa/connections1565Applied.sql'), 'utf8');
const rows = JSON.parse(fs.readFileSync(exportPath, 'utf8')).sort((a, b) => a.sort_order - b.sort_order);
const groupsOf = raw => { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : (v?.groups ?? []); };
const valid = gs => { const all = gs.flatMap(x => x.players); return gs.length === 4 && gs.every(x => x.players.length === 4) && new Set(all).size === 16; };
const migIds = [...migrationSql.matchAll(/^ {4}\('([a-z]+-[0-9-]+)', '/gm)].map(m => m[1]);
let failures = 0;
const fail = m => { failures += 1; console.log('FAIL: ' + m); };
const abort = m => { console.log(`REHEARSE_CONTROL=${CONTROL} ABORTED: ${m}`); process.exit(2); };

const fresh = async () => {
  const db = new PGlite();
  await db.exec('create table public.connections_puzzles (puzzle_id text primary key, sort_order int not null, groups_json jsonb not null);');
  for (const r of rows) await db.query('insert into public.connections_puzzles values ($1, $2, $3)', [r.puzzle_id, r.sort_order, JSON.stringify(groupsOf(r.groups_json))]);
  return db;
};
const snap = async db => (await db.query('select puzzle_id, sort_order, md5(groups_json::text) as h, groups_json from public.connections_puzzles order by sort_order')).rows;
const run = async (db, sql) => { try { await db.exec(sql); return ''; } catch (e) { return String(e.message || e); } };

console.log(`export: ${rows.length} rows; migration rewrites ${migIds.length}; control ${CONTROL || 'none'}`);
if (!migIds.length) fail('the migration names no rows');

/* 1) one hash on both sides */
{
  const db = await fresh();
  const pg = new Map((await snap(db)).map(r => [r.puzzle_id, r.h]));
  let bad = 0;
  for (const r of rows) if (pg.get(r.puzzle_id) !== boardMd5(groupsOf(r.groups_json))) bad += 1;
  for (const b of file) {
    const h = (await db.query('select md5($1::jsonb::text) as h', [JSON.stringify(b.groups)])).rows[0].h;
    if (h !== fileMd5.get(b.id)) bad += 1;
  }
  if (bad) fail(`${bad} boards hash differently in Postgres and in pgJsonbText`);
  console.log(`1) md5(groups_json::text) equals boardMd5 on ${rows.length} exported and ${file.length} file boards: ${bad ? 'NO' : 'yes'}`);
}

/* the drift edit: somebody changes a row after the export */
const DRIFT_ID = migIds[0];
const drift = async db => {
  const r = await db.query(`update public.connections_puzzles set groups_json = jsonb_set(groups_json, '{0,category}', '"Edited after the export"') where puzzle_id = $1`, [DRIFT_ID]);
  if (r.affectedRows !== 1) abort(`no row ${DRIFT_ID} to edit`);
};

/* 2) the guarded migration */
{
  let sql = migrationSql;
  if (CONTROL === 'noguard') {
    const guard = '\n         and c.groups_json = (select o.old_groups from r1565_rows o where o.puzzle_id = r.puzzle_id);';
    if (!sql.includes(guard)) abort('the guard it strips is not in the migration');
    sql = sql.replace(guard, ';');
  }
  const db = await fresh();
  if (CONTROL === 'drift' || CONTROL === 'noguard') await drift(db);
  const before = await snap(db);
  const threw = await run(db, sql);
  if (threw) fail(`the migration raised: ${threw.slice(0, 160)}`);
  const after = await snap(db);
  let atFile = 0, moved = 0;
  after.forEach((r, i) => {
    if (r.puzzle_id !== before[i].puzzle_id || r.sort_order !== before[i].sort_order) moved += 1;
    if (r.h === fileMd5.get(r.puzzle_id)) atFile += 1;
    else if (r.puzzle_id === DRIFT_ID && (CONTROL === 'drift' || CONTROL === 'noguard')) fail(`${DRIFT_ID} was edited after the export and the guard left it alone: the table moved, so re-export before applying`);
    else fail(`${r.puzzle_id} is not at the shipped file's board after the migration`);
  });
  if ((CONTROL === 'drift' || CONTROL === 'noguard')) {
    const d = after.find(r => r.puzzle_id === DRIFT_ID);
    if (d.groups_json[0].category !== 'Edited after the export') fail(`${DRIFT_ID} was edited after the export and the migration overwrote it: the guard did not hold`);
  }
  if (after.length !== rows.length || moved) fail(`rows ${after.length} of ${rows.length}, ${moved} moved`);
  const pool = rs => rs.filter(r => valid(r.groups_json)).map(r => r.puzzle_id).join('|');
  if (pool(after) !== pool(before)) fail('the valid pool changed size or order');
  const again = await run(db, sql);
  const after2 = await snap(db);
  if (again || after2.some((r, i) => r.h !== after[i].h)) fail('a second run of the migration changed the table');
  console.log(`2) migration: ${atFile} of ${after.length} rows at the file's board, ${moved} moved, valid pool ${pool(after).split('|').length} unchanged, second run a no-op`);
}

/* 3) the production form, on a fresh copy */
{
  let sql = appliedSql;
  if (CONTROL === 'tamper') {
    const a = sql.indexOf('"players":["', sql.indexOf('$pl$['));
    if (a < 0) abort('no payload to tamper with');
    const at = a + 12;
    sql = sql.slice(0, at) + (sql[at] === 'X' ? 'Y' : 'X') + sql.slice(at + 1);
  }
  const db = await fresh();
  if (CONTROL === 'drift' || CONTROL === 'noguard') await drift(db);
  const before = await snap(db);
  const threw = await run(db, sql);
  const after = await snap(db);
  const unchanged = after.every((r, i) => r.h === before[i].h);
  if (threw) fail(`the production form raised and ${unchanged ? 'applied nothing' : 'CHANGED THE TABLE'}: ${threw.slice(0, 120)}`);
  else {
    const off = after.filter(r => r.h !== fileMd5.get(r.puzzle_id)).map(r => r.puzzle_id);
    if (off.length) fail(`after the production form ${off.length} rows are not at the file's board: ${off.slice(0, 5).join(' ')}`);
    const again = await run(db, sql);
    const after2 = await snap(db);
    if (again || after2.some((r, i) => r.h !== after[i].h)) fail('a second run of the production form changed the table or raised');
  }
  console.log(`3) production form: ${threw ? 'raised' : 'landed'}; table ${unchanged ? 'unchanged' : 'changed'}`);
}

if (failures) {
  console.log(`rehearseConnections1565: ${failures} failure${failures === 1 ? '' : 's'}${CONTROL ? ` (control ${CONTROL} fired)` : ''}`);
  process.exit(1);
}
console.log(`rehearseConnections1565: green. ${migIds.length} rows land at the shipped file's boards in place, both forms, and a second run is a no-op.`);
