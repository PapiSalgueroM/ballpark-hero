/* Round 1553: the Connections rows migration, run for real in an embedded Postgres, never against the live project.

   supabase/migrations/20261022130000_round_1553_connections_truth.sql is applied by the lead at a release. Here it
   runs word for word in PGlite (the real engine inside node) on top of the table's own create and seed migration
   (20260526000004, puzzle-1 to 155) plus the pre-round boards of every rewritten row above 155, taken from the
   migration's own guard values, which is how the live table is believed to hold them.

   What it proves:
     1. every rewritten row whose stored board is the file's pre-round board ends holding the new board;
     2. a row that has drifted from the file is left exactly as it was (the guard), and so is every row the
        migration does not name;
     3. the row count and every sort_order are unchanged, so no daily reshuffles;
     4. a second run changes nothing;
     5. the seed migration's own rows that already differ from the pre-round file are counted out loud: those
        are the rows the lead's read only export must settle before the apply.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseConnections1553.mjs
   Negative control, must exit 1: REHEARSE_CONTROL=noguard strips the guard, so the drifted row is overwritten.
   It is not named sim*: the suite runner must not pick up a script that needs a package the repo does not carry. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROL = process.env.REHEARSE_CONTROL || '';
if (CONTROL && CONTROL !== 'noguard') { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
const dir = process.env.PGLITE_DIR;
if (!dir) { console.error('PGLITE_DIR is not set: see the header of this file. Nothing was run.'); process.exit(2); }
const entry = path.join(dir, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js');
if (!fs.existsSync(entry)) { console.error(`no PGlite at ${entry}. Nothing was run.`); process.exit(2); }
const { PGlite } = await import(pathToFileURL(entry).href);

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const SEED = read('supabase/migrations/20260526000004_connections_puzzles.sql');
let MIGRATION = read('supabase/migrations/20261022130000_round_1553_connections_truth.sql');
const GUARD = '         and c.groups_json = r.old_groups;';
if (CONTROL === 'noguard') {
  if (!MIGRATION.includes(GUARD)) { console.error('control noguard: the guard is not in the migration, ABORTED'); process.exit(2); }
  MIGRATION = MIGRATION.replace(GUARD, ';');
}

/* the migration's own rows: puzzle_id, the pre-round board, the new board */
const rows = [];
for (const line of MIGRATION.split('\n')) {
  const m = line.match(/^\s*\('([^']+)', '((?:[^']|'')*)'::jsonb, '((?:[^']|'')*)'::jsonb\),?$/);
  if (m) rows.push({ id: m[1], old: JSON.parse(m[2].replace(/''/g, "'")), now: JSON.parse(m[3].replace(/''/g, "'")) });
}
let failures = 0;
const fail = s => { failures += 1; console.error('  FAIL: ' + s); };
if (rows.length < 50) fail(`the migration carries ${rows.length} rows; this round rewrites 56`);

const db = new PGlite();
await db.exec('create role anon; create role authenticated;');
await db.exec(SEED);
const num = id => Number(id.replace('puzzle-', ''));
for (const r of rows.filter(x => num(x.id) > 155)) {
  await db.query('insert into public.connections_puzzles (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)', [r.id, JSON.stringify(r.old), num(r.id) - 1]);
}
/* one row drifts on purpose: the guard must leave it alone */
const DRIFT = 'puzzle-151';
const drifted = [{ category: 'A drifted board', players: ['A', 'B', 'C', 'D'], difficulty: 'easy' }];
await db.query('update public.connections_puzzles set groups_json = $1::jsonb where puzzle_id = $2', [JSON.stringify(drifted), DRIFT]);

const snapshot = async () => (await db.query('select puzzle_id, sort_order, groups_json from public.connections_puzzles order by sort_order')).rows;
/* jsonb hands keys back in its own order, so compare with every object's keys sorted */
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const before = await snapshot();
const byId = new Map(before.map(r => [r.puzzle_id, r]));
const seedDrift = rows.filter(r => r.id !== DRIFT && byId.has(r.id) && !same(byId.get(r.id).groups_json, r.old)).map(r => r.id);

await db.exec(MIGRATION);
const after = await snapshot();
if (after.length !== before.length) fail(`the table went from ${before.length} rows to ${after.length}`);
if (!same(after.map(r => [r.puzzle_id, r.sort_order]), before.map(r => [r.puzzle_id, r.sort_order]))) fail('a puzzle_id or sort_order moved, so the daily deal would reshuffle');
const afterById = new Map(after.map(r => [r.puzzle_id, r]));
let rewritten = 0;
for (const r of rows) {
  const got = afterById.get(r.id)?.groups_json;
  if (r.id === DRIFT) { if (!same(got, drifted)) fail(`${DRIFT} had drifted from the file and was overwritten anyway`); continue; }
  if (seedDrift.includes(r.id)) { if (!same(got, byId.get(r.id).groups_json)) fail(`${r.id} differed from the file and was overwritten anyway`); continue; }
  if (same(got, r.now)) rewritten += 1; else fail(`${r.id} does not hold the new board`);
}
const named = new Set(rows.map(r => r.id));
for (const b of before) if (!named.has(b.puzzle_id) && !same(afterById.get(b.puzzle_id)?.groups_json, b.groups_json)) fail(`${b.puzzle_id} is not in the migration and changed`);

await db.exec(MIGRATION);
if (!same(await snapshot(), after)) fail('a second run changed the table');

console.log(`   ${before.length} rows; ${rewritten} rewritten in place; ${DRIFT} drifted on purpose and left alone; ${seedDrift.length} seeded rows already differ from the pre-round file and were left alone${seedDrift.length ? ': ' + seedDrift.join(' ') : ''}`);
if (failures) { console.error(`rehearseConnections1553: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('rehearseConnections1553: green. The rows land in place, a drifted row is left alone, and a second run is a no-op.');
