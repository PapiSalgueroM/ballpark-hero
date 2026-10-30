/* Round 1558: the Baseball, NFL and NHL Connections rows migration, run for real in an embedded Postgres, never
   against the live project.

   supabase/migrations/20261022180000_round_1558_us_connections_truth.sql is applied by the lead at a release.
   Here it runs word for word in PGlite (the real engine inside node). Baseball sits on its own create and seed
   migration (20260526000007, bconn-001 to 060); the NFL and NHL tables have no create migration in the repo, so
   they are made in the same shape and hold the files' boards from before the round (nflconn-001 to 004,
   nhlconn-001 to 004) as git holds them in scripts/data/usConnectionsPreRound1558.json, never the migration's
   own old values, and check 0b fails when a migration old value is not that board (the review found the first
   version seeded them from the migration, so nothing checked those two values independently). Each table runs in two scenarios: "seed" (baseball exactly as its seed left it, the labels
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
   only, so check 0 finds the migration and the file apart; REHEARSE_CONTROL=oldvalue renames one tile of
   nflconn-004's OLD board in the migration only, so check 0b finds it is not the board from before the round and
   the NFL scenario finds the row drifted. A control that cannot find what it changes exits 2
   (ABORTED). It is not named sim*: the suite runner must not pick up a script that needs a package the repo does
   not carry. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROL = process.env.REHEARSE_CONTROL || '';
if (CONTROL && CONTROL !== 'noguard' && CONTROL !== 'drift' && CONTROL !== 'oldvalue') { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
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
if (CONTROL === 'oldvalue') {
  /* the migration's guard value for nflconn-004 stops being the board from before the round */
  const at = MIGRATION.indexOf("    ('nflconn-004', '");
  const end = at < 0 ? -1 : MIGRATION.indexOf('\n', at);
  const line = at < 0 ? '' : MIGRATION.slice(at, end);
  const cut = line.indexOf("'::jsonb, '");
  const changed = cut < 0 ? line : line.slice(0, cut).replace(/"players":\["[^"]*"/, '"players":["Not The Pre Round Player"') + line.slice(cut);
  if (changed === line) { console.error('control oldvalue: nflconn-004 is not in the migration, ABORTED'); process.exit(2); }
  MIGRATION = MIGRATION.slice(0, at) + changed + MIGRATION.slice(end);
}
/* the NFL and NHL boards from before the round, taken from git (eccb77b18), never from the migration */
const PRE = JSON.parse(read('scripts/data/usConnectionsPreRound1558.json'));

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
if (ids('baseball').length !== 35 || ids('nfl').length !== 1 || ids('nhl').length !== 1) fail(`the migration names ${ids('baseball').length} baseball, ${ids('nfl').length} NFL and ${ids('nhl').length} NHL boards; this round rewrites 35, 1 and 1`);

/* 0. every new board in the migration is the shipped file's board, word for word */
const files = {};
{
  /* Round 1567 rewrote 39 of these boards after this migration was applied (2026-10-23), so the files this one is
     held to are the ones Round 1558 left on main (1229c0190, read from git), not today's. Re-record attribution
     (runner r1567-fx-rr on 2a30833e7): the script as it was at 1229c0190, run on this round's tree, exits 1 with
     29 failures, each "the migration's new board is not the file's board"; the same script with only the three
     data files put back to 1229c0190 exits 0 green; this version on the round's head exits 0 green */
  const { boardsAt } = await import('./usConnections1567Migration.mjs');
  const b = await boardsAt('1229c0190');
  files.baseball = b.baseball; files.nfl = b.nfl; files.nhl = b.nhl;
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

/* 0b. NFL and NHL have no seed in the repo: every old value the migration guards on must be the board from before
   the round as git holds it (scripts/data/usConnectionsPreRound1558.json), and that list is the file's ids in order */
for (const s of ['nfl', 'nhl']) {
  if (JSON.stringify(PRE[s].map(b => b.id)) !== JSON.stringify(files[s].map(b => b.id))) fail(`${s}: the pre-round boards and the file differ in ids or order`);
  const pre = new Map(PRE[s].map(b => [b.id, b.groups]));
  let tied = 0;
  for (const r of rows[s]) {
    if (!pre.has(r.id)) fail(`${s} ${r.id}: the migration guards a board that was not in the file before the round`);
    else if (!same(pre.get(r.id), r.old)) fail(`${s} ${r.id}: the migration's old value is not the board from before the round (git ${PRE.base}), so the guard would call the live row drifted`);
    else tied += 1;
  }
  console.log(`   ${s} pre-round: ${tied} of ${rows[s].length} old values in the migration equal the board from before the round (git ${PRE.base})`);
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
    /* the boards from before the round as git holds them, not the migration's old values (check 0b ties the two) */
    for (const [i, b] of PRE[sport].entries()) {
      await db.query(`insert into public.${table} (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)`, [b.id, JSON.stringify(b.groups), i]);
    }
  }
  /* the baseball file scenario: every named row holds the file's board from before the round (the first old value
     the migration knows for it; for bconn-009, 012 and 015 the seed's dashed spelling is the second) */
  if (name === 'file' && sport === 'baseball') for (const [id, old] of firstOld) await db.query(`update public.${table} set groups_json = $1::jsonb where puzzle_id = $2`, [JSON.stringify(old), id]);
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
  let overwritten = false;
  for (const id of ids(sport)) {
    const got = afterById.get(id)?.groups_json;
    if (id === driftId) { if (!same(got, drifted)) { overwritten = true; fail(`${sport} ${name}: ${id} had drifted and was overwritten anyway`); } continue; }
    const now = rows[sport].find(r => r.id === id).now;
    if (same(got, now)) rewritten += 1; else fail(`${sport} ${name}: ${id} does not hold the new board`);
  }
  const named = new Set(ids(sport));
  for (const b of before) if (!named.has(b.puzzle_id) && !same(afterById.get(b.puzzle_id)?.groups_json, b.groups_json)) fail(`${sport} ${name}: ${b.puzzle_id} is not in the migration and changed`);
  void beforeById;
  await db.exec(own);
  if (!same(await snapshot(), after)) fail(`${sport} ${name}: a second run changed the table`);
  console.log(`   ${sport} ${name}: ${before.length} rows, ${poolBefore} valid before and ${poolAfter} after; ${rewritten} rewritten in place${driftId ? `; ${driftId} drifted on purpose and ${overwritten ? "OVERWRITTEN" : "left alone"}` : ''}`);
}

await scenario('baseball', 'seed', 'bconn-016');
await scenario('baseball', 'file', 'bconn-016');
await scenario('nfl', 'file', null);
await scenario('nfl', 'drift', 'nflconn-004');
await scenario('nhl', 'file', null);
await scenario('nhl', 'drift', 'nhlconn-004');
if (failures) { console.error(`rehearseUsConnections1558: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('rehearseUsConnections1558: green. The rows land in place, a drifted row is left alone, and a second run is a no-op.');
