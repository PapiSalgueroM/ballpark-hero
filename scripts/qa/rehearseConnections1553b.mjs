// Round 1553, second part (2026-10-23): rehearse BOTH Connections migrations in PGlite on a read only export of the
// live connections_puzzles table, never on production. The live table had been edited apart from the shipped file,
// so 37 of the first migration's 57 rows held neither its old nor its new board; the second migration
// (supabase/migrations/20261023120000_round_1553_connections_drifted_rows.sql) rewrites those 37 from their exact
// exported board. Production received both as one checksummed, all or nothing step (scripts/qa/connections1553Applied.sql,
// docs/audits/ROUND-1553-APPLY-2026-10-23.md).
// usage: PGLITE_DIR=<dir with @electric-sql/pglite> node scripts/qa/rehearseConnections1553b.mjs <export.json>
//          <first.sql> <second.sql> <head boards json: { puzzle_id: groups }> [control]
// Proves: 57 of 57 rows end at the shipped file's boards, no other row changes, the row count, every sort_order and
// the valid pool (size and order, so no daily reshuffles) are unchanged, and a second run is a no-op.
// Controls: drift (one of the 37 rows is changed in the table first: it must be left alone, still green);
// noguard (the same, with the second part's guard stripped: the row is overwritten and the run must exit 1).
// Not named sim*: it needs PGlite, which this repo does not carry.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [exportPath, firstSql, secondSql, headPath, control = ''] = process.argv.slice(2);
const { PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js')).href);
const rows = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
const head = JSON.parse(fs.readFileSync(headPath, 'utf8')); // { id: groups }
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x);
const valid = gs => { const all = gs.flatMap(x => x.players); return gs.length === 4 && gs.every(x => x.players.length === 4) && new Set(all).size === 16; };
let failures = 0;
const fail = m => { failures++; console.log('FAIL: ' + m); };
const db = new PGlite();
await db.exec('create schema if not exists public; create table public.connections_puzzles (puzzle_id text primary key, sort_order int not null, groups_json jsonb not null);');
for (const r of rows) await db.query('insert into public.connections_puzzles values ($1, $2, $3)', [r.puzzle_id, r.sort_order, JSON.stringify(r.groups_json)]);
const second37 = [...fs.readFileSync(secondSql, 'utf8').matchAll(/\('(puzzle-\d+)', '/g)].map(m => m[1]);
if (control === 'drift' || control === 'noguard') {
  const id = second37[0];
  const res = await db.query(`update public.connections_puzzles set groups_json = jsonb_set(groups_json, '{0,category}', '"Drifted on purpose"') where puzzle_id = $1`, [id]);
  if (res.affectedRows !== 1) { console.log('ABORTED: the control changed nothing'); process.exit(2); }
  console.log(`control drift: ${id} changed before the second part`);
}
const snap = async () => (await db.query('select puzzle_id, sort_order, groups_json from public.connections_puzzles order by sort_order')).rows;
const before = await snap();
const notices = [];
const GUARD = '\n         and c.groups_json in (select o.old_groups from r1553b_rows o where o.puzzle_id = r.puzzle_id)';
const run = async f => {
  let sql = fs.readFileSync(f, 'utf8');
  if (control === 'noguard' && f === secondSql) {
    if (!sql.includes(GUARD)) { console.log('ABORTED: guard not found'); process.exit(2); }
    sql = sql.replace(GUARD, '');
  }
  await db.exec(sql);
};
db.onNotice?.(n => notices.push(n.message));
await run(firstSql);
await run(secondSql);
const after = await snap();
// checks
if (after.length !== before.length) fail(`row count ${before.length} -> ${after.length}`);
if (after.map(r => r.puzzle_id + ':' + r.sort_order).join() !== before.map(r => r.puzzle_id + ':' + r.sort_order).join()) fail('a puzzle_id or sort_order moved');
const vb = before.filter(r => valid(r.groups_json)).map(r => r.puzzle_id).join(), va = after.filter(r => valid(r.groups_json)).map(r => r.puzzle_id).join();
if (vb !== va) fail('the valid pool changed (size or order): every daily would reshuffle');
const migIds = new Set([...[...fs.readFileSync(firstSql, 'utf8').matchAll(/\('(puzzle-\d+)', '/g)].map(m => m[1]), ...second37]);
let atHead = 0, changedOutside = 0;
for (let i = 0; i < after.length; i++) {
  const a = after[i], b = before[i];
  if (migIds.has(a.puzzle_id)) { if (canon(a.groups_json) === canon(head[a.puzzle_id])) atHead++; }
  else if (canon(a.groups_json) !== canon(b.groups_json)) changedOutside++;
}
if (changedOutside) fail(`${changedOutside} rows outside the 57 changed`);
const expectAtHead = (control === 'drift' || control === 'noguard') ? 56 : 57;
if (atHead !== expectAtHead) fail(`${atHead} of the 57 rows hold the shipped file's board, expected ${expectAtHead}`);
// second run: a no-op
const mid = await snap();
await run(firstSql); await run(secondSql);
const again = await snap();
if (canon(mid) !== canon(again)) fail('a second run changed rows');
console.log(`rows ${after.length}; valid pool ${after.filter(r => valid(r.groups_json)).length} (before ${before.filter(r => valid(r.groups_json)).length}); of the 57: ${atHead} at the shipped file's board; rows outside the 57 changed: ${changedOutside}`);
console.log('notices:', notices.length ? notices.join(' || ') : '(PGlite gave no notice hook; counts above stand)');
if (failures) { console.log(`rehearse1553b: ${failures} failure(s)${control ? ` (control ${control}: FIRED)` : ''}`); process.exit(1); }
console.log('rehearse1553b: green');
