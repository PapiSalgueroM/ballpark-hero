/* Round 1558: the Baseball, NFL and NHL Connections rows migration, run for real in an embedded Postgres, never
   against the live project.

   supabase/migrations/20261022180000_round_1558_us_connections_truth.sql is applied by the lead at a release.
   Here it runs word for word in PGlite (the real engine inside node). Baseball sits on its own create and seed
   migration (20260526000007, bconn-001 to 060); the NFL and NHL tables have no create migration in the repo, so
   they are made in the same shape and hold the files' boards from before the round (nflconn-001 to 004,
   nhlconn-001 to 004). Each table runs in two scenarios: "seed" (baseball exactly as its seed left it, the labels
   of bconn-009, 012 and 015 still with the seed's dash) and "file" (every row holding the file's board from before
   the round), and in each one row the migration names drifts on purpose.

   What it proves:
     0. every new board in the migration is the shipped file's board (the harness judges the file);
     1. every named row whose stored board is one the migration knows ends holding the new board;
     2. the drifted row is left exactly as it was (the guard), and so is every row the migration does not name;
     3. the row count, every sort_order and the number of valid boards (the pool the game deals from) are
        unchanged, so no daily reshuffles;
     4. a second run changes nothing.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseUsConnections1558.mjs
   Negative controls, each must exit 1: REHEARSE_CONTROL=noguard strips the guard from all three blocks, so the
   drifted rows are overwritten; REHEARSE_CONTROL=drift renames one tile of bconn-010's new board in the migration
   only, so check 0 finds the migration and the file apart. A control that cannot find what it changes exits 2
   (ABORTED). It is not named sim*: the suite runner must not pick up a script that needs a package the repo does
   not carry. */
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
const SEED = read('supabase/migrations/20260526000007_baseball_connections_puzzles.sql');
let MIGRATION = read('supabase/migrations/20261022180000_round_1558_us_connections_truth.sql');
const TABLES = { baseball: 'baseball_connections_puzzles', nfl: 'nfl_connections_puzzles', nhl: 'nhl_connections_puzzles' };
if (CONTROL === 'noguard') {
  let n = 0;
  for (const s of Object.keys(TABLES)) {
    const guard = `         and c.groups_json in (select o.old_groups from r1558_${s} o where o.puzzle_id = r.puzzle_id);`;
    if (MIGRATION.includes(guard)) { MIGRATION = MIGRATION.replace(guard, ';'); n += 1; }
  }
  if (n !== 3) { console.error(`control noguard: found ${n} of the 3 guards in the migration, ABORTED`); process.exit(2); }
}
if (CONTROL === 'drift') {
  const at = MIGRATION.indexOf("    ('bconn-010', ");
  const end = at < 0 ? -1 : MIGRATION.indexOf('\n', at);
  const line = at < 0 ? '' : MIGRATION.slice(at, end);
  const cut = line.lastIndexOf("'::jsonb, '");
  const drifted = cut < 0 ? line : line.slice(0, cut) + line.slice(cut).replace(/"players":\["[^"]*"/, '"players":["A Drifted Player"');
  if (drifted === line) { console.error('control drift: bconn-010 is not in the migration, ABORTED'); process.exit(2); }
  MIGRATION = MIGRATION.slice(0, at) + drifted + MIGRATION.slice(end);
}

/* the migration's own rows by table: puzzle_id, a known old board, the new board */
const rows = { baseball: [], nfl: [], nhl: [] };
let current = null;
for (const line of MIGRATION.split('\n')) {
  const t = line.match(/insert into r1558_(\w+) /);
  if (t) current = t[1];
  const m = line.match(/^\s*\('([^']+)', '((?:[^']|'')*)'::jsonb, '((?:[^']|'')*)'::jsonb\),?$/);
  if (m && current) rows[current].push({ id: m[1], old: JSON.parse(m[2].replace(/''/g, "'")), now: JSON.parse(m[3].replace(/''/g, "'")) });
}
let failures = 0;
const fail = s => { failures += 1; console.error('  FAIL: ' + s); };
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const ids = s => [...new Set(rows[s].map(r => r.id))];
if (ids('baseball').length !== 33 || ids('nfl').length !== 1 || ids('nhl').length !== 1) fail(`the migration names ${ids('baseball').length} baseball, ${ids('nfl').length} NFL and ${ids('nhl').length} NHL boards; this round rewrites 33, 1 and 1`);

/* 0. every new board in the migration is the shipped file's board, word for word */
const files = {};
{
  const { build } = await import('esbuild');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearse1558-'));
  const R = ROOT.split(path.sep).join('/');
  fs.writeFileSync(path.join(tmp, 'entry.mjs'), `export { baseballConnectionsPuzzles } from '${R}/src/data/baseballConnectionsPuzzles.ts';
export { nflConnectionsPuzzles } from '${R}/src/data/nflConnectionsPuzzles.ts';
export { nhlConnectionsPuzzles } from '${R}/src/data/nhlConnectionsPuzzles.ts';`);
  await build({ entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const b = await import(pathToFileURL(path.join(tmp, 'bundle.mjs')).href);
  files.baseball = b.baseballConnectionsPuzzles; files.nfl = b.nflConnectionsPuzzles; files.nhl = b.nhlConnectionsPuzzles;
  for (const s of Object.keys(TABLES)) {
    const fileBoard = new Map(files[s].map(x => [x.id, x.groups.map(g => ({ theme: g.theme, players: g.players, difficulty: g.difficulty }))]));
    let tied = 0;
    for (const r of rows[s]) {
      const f = fileBoard.get(r.id);
      if (!f) fail(`${s} ${r.id} is in the migration and not in the file`);
      else if (!same(f, r.now)) fail(`${s} ${r.id}: the migration's new board is not the file's board; regenerate the migration from the file`);
      else tied += 1;
    }
    console.log(`   ${s} file: ${tied} of ${rows[s].length} new boards in the migration equal the shipped file's boards`);
  }
}

const CREATE = t => `create table public.${t} (id uuid primary key default gen_random_uuid(), puzzle_id text not null unique, groups_json jsonb not null, sort_order smallint not null, created_at timestamptz not null default now());`;
/* the game deals from the valid boards only (four groups of five, twenty different names) */
const valid = r => { const g = Array.isArray(r.groups_json) ? r.groups_json : []; const all = g.flatMap(x => x.players ?? []); return g.length === 4 && g.every(x => (x.players ?? []).length === 5) && new Set(all).size === 20; };

async function scenario(sport, name, driftId) {
  const table = TABLES[sport];
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated;');
  const firstOld = new Map();
  for (const r of rows[sport]) if (!firstOld.has(r.id)) firstOld.set(r.id, r.old);
  if (sport === 'baseball') await db.exec(SEED);
  else {
    await db.exec(CREATE(table));
    for (const [i, b] of files[sport].entries()) {
      const groups = firstOld.get(b.id) ?? b.groups;
      await db.query(`insert into public.${table} (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)`, [b.id, JSON.stringify(groups), i]);
    }
  }
  /* the file scenario: every named row holds the file's board from before the round (the first old value the
     migration knows for it; for bconn-009, 012 and 015 the seed's dashed spelling is the second) */
  if (name === 'file') for (const [id, old] of firstOld) await db.query(`update public.${table} set groups_json = $1::jsonb where puzzle_id = $2`, [JSON.stringify(old), id]);
  const drifted = [{ theme: 'A drifted board', players: ['A', 'B', 'C', 'D', 'E'], difficulty: 'yellow' }];
  if (driftId) await db.query(`update public.${table} set groups_json = $1::jsonb where puzzle_id = $2`, [JSON.stringify(drifted), driftId]);

  const snapshot = async () => (await db.query(`select puzzle_id, sort_order, groups_json from public.${table} order by sort_order`)).rows;
  const before = await snapshot();
  /* this scenario holds one table, so only its block runs (each block names only its own table) */
  const own = MIGRATION.replace(/do \$\$[\s\S]*?\$\$;/g, block => (block.includes(`public.${table} `) ? block : ''));
  if (!own.includes(`update public.${table} c`)) fail(`${sport} ${name}: the migration has no block for ${table}`);
  await db.exec(own);
  const after = await snapshot();
  if (after.length !== before.length) fail(`${sport} ${name}: the table went from ${before.length} rows to ${after.length}`);
  if (!same(after.map(r => [r.puzzle_id, r.sort_order]), before.map(r => [r.puzzle_id, r.sort_order]))) fail(`${sport} ${name}: a puzzle_id or sort_order moved, so the daily deal would reshuffle`);
  const poolBefore = before.filter(valid).length;
  const poolAfter = after.filter(valid).length;
  if (poolAfter !== poolBefore) fail(`${sport} ${name}: the dealt pool went from ${poolBefore} valid boards to ${poolAfter}, so every daily would reshuffle`);
  const afterById = new Map(after.map(r => [r.puzzle_id, r]));
  const beforeById = new Map(before.map(r => [r.puzzle_id, r]));
  let rewritten = 0;
  for (const id of ids(sport)) {
    const got = afterById.get(id)?.groups_json;
    if (id === driftId) { if (!same(got, drifted)) fail(`${sport} ${name}: ${id} had drifted and was overwritten anyway`); continue; }
    const now = rows[sport].find(r => r.id === id).now;
    if (same(got, now)) rewritten += 1; else fail(`${sport} ${name}: ${id} does not hold the new board`);
  }
  const named = new Set(ids(sport));
  for (const b of before) if (!named.has(b.puzzle_id) && !same(afterById.get(b.puzzle_id)?.groups_json, b.groups_json)) fail(`${sport} ${name}: ${b.puzzle_id} is not in the migration and changed`);
  void beforeById;
  await db.exec(own);
  if (!same(await snapshot(), after)) fail(`${sport} ${name}: a second run changed the table`);
  console.log(`   ${sport} ${name}: ${before.length} rows, ${poolBefore} valid before and ${poolAfter} after; ${rewritten} rewritten in place${driftId ? `; ${driftId} drifted on purpose and left alone` : ''}`);
}

await scenario('baseball', 'seed', 'bconn-016');
await scenario('baseball', 'file', 'bconn-016');
await scenario('nfl', 'file', null);
await scenario('nfl', 'drift', 'nflconn-004');
await scenario('nhl', 'file', null);
await scenario('nhl', 'drift', 'nhlconn-004');
if (failures) { console.error(`rehearseUsConnections1558: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('rehearseUsConnections1558: green. The rows land in place, a drifted row is left alone, and a second run is a no-op.');
