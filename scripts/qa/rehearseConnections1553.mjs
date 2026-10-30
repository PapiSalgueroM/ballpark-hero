/* Round 1553: the Connections rows migration, run for real in an embedded Postgres, never against the live project.

   supabase/migrations/20261022130000_round_1553_connections_truth.sql is applied by the lead at a release. Here it
   runs word for word in PGlite (the real engine inside node) on top of the table's own create and seed migration
   (20260526000004, puzzle-1 to 155) plus the pre-round boards of every rewritten row above 155, taken from the
   migration's own guard values. It runs twice: once on the table exactly as the seed migration left it, and once
   with every rewritten row holding the file's pre-round board, which is what the live table is believed to hold
   (Round 219's live fence has found no name twice on a soccer board since August, and six seeded rows had one).

   What it proves:
     0. every new board in the migration is the shipped file's board (the harnesses judge the file);
     1. every rewritten row whose stored board is the file's pre-round board ends holding the new board;
     2. a row that has drifted from the file is left exactly as it was (the guard), and so is every row the
        migration does not name;
     3. the row count, every sort_order and the number of valid boards (the pool the game deals from) are
        unchanged, so no daily reshuffles;
     4. a second run changes nothing;
     5. the seed migration's own rows that already differ from the pre-round file (six, each listing one man in
        two groups, so the game filters them out) are left alone and counted out loud: rewriting them would add
        valid boards and reshuffle every daily.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseConnections1553.mjs
   Negative controls, each must exit 1: REHEARSE_CONTROL=noguard strips the guard, so the drifted row is
   overwritten; REHEARSE_CONTROL=drift renames one tile of puzzle-10's new board in the migration only, so check 0
   finds the migration and the file apart. A control that cannot find what it changes exits 2 (ABORTED).
   It is not named sim*: the suite runner must not pick up a script that needs a package the repo does not carry. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROL = process.env.REHEARSE_CONTROL || '';
if (CONTROL && CONTROL !== 'noguard' && CONTROL !== 'drift') { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
const dir = process.env.PGLITE_DIR;
if (!dir) { console.error('PGLITE_DIR is not set: see the header of this file. Nothing was run.'); process.exit(2); }
const entry = path.join(dir, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js');
if (!fs.existsSync(entry)) { console.error(`no PGlite at ${entry}. Nothing was run.`); process.exit(2); }
const { PGlite } = await import(pathToFileURL(entry).href);

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const SEED = read('supabase/migrations/20260526000004_connections_puzzles.sql');
let MIGRATION = read('supabase/migrations/20261022130000_round_1553_connections_truth.sql');
const GUARD = '         and c.groups_json in (select o.old_groups from r1553_rows o where o.puzzle_id = r.puzzle_id);';
if (CONTROL === 'noguard') {
  if (!MIGRATION.includes(GUARD)) { console.error('control noguard: the guard is not in the migration, ABORTED'); process.exit(2); }
  MIGRATION = MIGRATION.replace(GUARD, ';');
}
if (CONTROL === 'drift') {
  /* one new board in the migration drifts from the file (its first tile renamed), as a data fix that never
     regenerated the migration would leave it: check 0 must go red, and nothing else */
  const at = MIGRATION.indexOf("    ('puzzle-10', ");
  const end = at < 0 ? -1 : MIGRATION.indexOf('\n', at);
  const line = at < 0 ? '' : MIGRATION.slice(at, end);
  const cut = line.lastIndexOf("'::jsonb, '");
  const drifted = cut < 0 ? line : line.slice(0, cut) + line.slice(cut).replace(/"players":\["[^"]*"/, '"players":["A Drifted Player"');
  if (drifted === line) { console.error('control drift: puzzle-10 is not in the migration, ABORTED'); process.exit(2); }
  MIGRATION = MIGRATION.slice(0, at) + drifted + MIGRATION.slice(end);
}

/* the migration's own rows: puzzle_id, the pre-round board, the new board */
const rows = [];
for (const line of MIGRATION.split('\n')) {
  const m = line.match(/^\s*\('([^']+)', '((?:[^']|'')*)'::jsonb, '((?:[^']|'')*)'::jsonb\),?$/);
  if (m) rows.push({ id: m[1], old: JSON.parse(m[2].replace(/''/g, "'")), now: JSON.parse(m[3].replace(/''/g, "'")) });
}
let failures = 0;
const fail = s => { failures += 1; console.error('  FAIL: ' + s); };
if (rows.length < 50) fail(`the migration carries ${rows.length} rows; this round rewrites 57`);

/* 0. every new board in the migration is the shipped file's board, word for word: simConnectionsFacts and
   simFairPuzzles judge the file, the migration is what players are dealt, and a data fix that skipped
   regenerating the migration would otherwise ship one board to the file and another to the table */
const canonTop = v => Array.isArray(v) ? v.map(canonTop) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonTop(v[k])])) : v;
{
  const { build } = await import('esbuild');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearse1553-'));
  fs.writeFileSync(path.join(tmp, 'entry.mjs'), `export { connectionsPuzzles } from '${ROOT.replaceAll('\\', '/')}/src/data/connectionsPuzzles.ts';`);
  await build({ entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { connectionsPuzzles } = await import(pathToFileURL(path.join(tmp, 'bundle.mjs')).href);
  const fileBoard = new Map(connectionsPuzzles.map(b => [b.id, b.groups.map(g => ({ category: g.category, players: g.players, difficulty: g.difficulty }))]));
  let tied = 0;
  /* Round 1565 rebuilt three of these boards again (puzzle-81, 90 and 109) and its own migration carries them on from
     here, so for those the file is held to that migration (scripts/qa/rehearseConnections1565.mjs), not to this one */
  const later = new Set([...fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261029120000_round_1565_connections_live.sql'), 'utf8').matchAll(/^ {4}\('([a-z]+-[0-9-]+)', '/gm)].map(m => m[1]));
  for (const r of rows) {
    const f = fileBoard.get(r.id);
    if (later.has(r.id)) { console.log(`   ${r.id}: rebuilt again by Round 1565, held to that migration`); continue; }
    if (!f) fail(`${r.id} is in the migration and not in src/data/connectionsPuzzles.ts`);
    else if (JSON.stringify(canonTop(f)) !== JSON.stringify(canonTop(r.now))) fail(`${r.id}: the migration's new board is not the file's board; regenerate the migration from the file`);
    else tied += 1;
  }
  console.log(`   file: ${tied} of ${rows.length} new boards in the migration equal the shipped file's boards`);
}

const num = id => Number(id.replace('puzzle-', ''));
async function scenario(name) {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated;');
  await db.exec(SEED);
  for (const r of rows.filter(x => num(x.id) > 155)) {
    await db.query('insert into public.connections_puzzles (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)', [r.id, JSON.stringify(r.old), num(r.id) - 1]);
  }
  /* the file scenario: the live table holds the boards the file held before this round, which is what
     Round 219's live fence (no name twice on a board) says of it since August */
  if (name === 'file') for (const r of rows) await db.query('update public.connections_puzzles set groups_json = $1::jsonb where puzzle_id = $2', [JSON.stringify(r.old), r.id]);
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
  /* the game deals from the valid boards only (sixteen different names), so their count is the pool size dailyIndex sees */
  const valid = r => { const g = Array.isArray(r.groups_json) ? r.groups_json : []; const all = g.flatMap(x => x.players ?? []); return g.length === 4 && g.every(x => (x.players ?? []).length === 4) && new Set(all).size === 16; };
  const poolBefore = before.filter(valid).length;
  const poolAfter = after.filter(valid).length;
  if (poolAfter !== poolBefore) fail(`the dealt pool went from ${poolBefore} valid boards to ${poolAfter}, so every daily would reshuffle`);
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

  console.log(`   ${name}: ${before.length} rows, ${poolBefore} valid before and ${poolAfter} after; ${rewritten} rewritten in place; ${DRIFT} drifted on purpose and left alone; ${seedDrift.length} seeded rows already differ from the pre-round file and were left alone${seedDrift.length ? ': ' + seedDrift.join(' ') : ''}`);
}
/* the seed scenario: the table exactly as migration 20260526000004 left it; the file scenario: as the file had it */
await scenario('seed');
await scenario('file');
if (failures) { console.error(`rehearseConnections1553: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('rehearseConnections1553: green. The rows land in place, a drifted row is left alone, and a second run is a no-op.');
