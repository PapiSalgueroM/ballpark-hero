// Release BQ triage (runner only, PGlite in memory, never production): rehearse the lead's verify SELECTs around the
// two migrations. node .rc/x/testVerify.mjs <pglite dir> <verify-1553.sql> <verify-1551.sql>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [pgDir, v1553, v1551] = process.argv.slice(2);
const { PGlite } = await import(pathToFileURL(path.join(pgDir, 'node_modules/@electric-sql/pglite/dist/index.js')).href);
let bad = 0;
const want = (label, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) bad += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(exp)})`}`); };
const num = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : typeof v === 'bigint' ? Number(v) : v]));

/* Round 1553 */
{
  const db = new PGlite();
  const mig = fs.readFileSync('supabase/migrations/20261022130000_round_1553_connections_truth.sql', 'utf8');
  const lines = mig.split('\r\n').join('\n').split('\n');
  const s = lines.findIndex(l => l.includes('insert into r1553_rows (puzzle_id, old_groups, new_groups) values'));
  const e = lines.findIndex((l, i) => i > s && l.trim() === ';');
  const vals = lines.slice(s + 1, e).join('\n');
  await db.exec('create table public.connections_puzzles (puzzle_id text primary key, groups_json jsonb not null, sort_order int not null);');
  await db.exec(`insert into public.connections_puzzles (puzzle_id, groups_json, sort_order) select puzzle_id, old_groups::jsonb, row_number() over () from (values ${vals}) v(puzzle_id, old_groups, new_groups);`);
  const sql = fs.readFileSync(v1553, 'utf8');
  const run = async () => num((await db.query(sql)).rows[0]);
  want('1553 before', await run(), { present: 57, now_new: 0, still_old: 57, drifted: 0, won_2026_ucl: 1 });
  await db.exec(`update public.connections_puzzles set groups_json = '[{"category":"drifted","players":[]}]'::jsonb where puzzle_id = 'puzzle-80';`);
  want('1553 before, one drifted', await run(), { present: 57, now_new: 0, still_old: 56, drifted: 1, won_2026_ucl: 1 });
  await db.exec(mig);
  want('1553 after (puzzle-80 left alone by the guard)', await run(), { present: 57, now_new: 56, still_old: 0, drifted: 1, won_2026_ucl: 0 });
  await db.exec(mig);
  want('1553 after a second run (a no-op)', await run(), { present: 57, now_new: 56, still_old: 0, drifted: 1, won_2026_ucl: 0 });
}
/* Round 1551 */
{
  const db = new PGlite();
  await db.exec(`create table public.afl_premiers (year int, premier text);
    create table public.nrl_premiers (year int, premier text, competition text);
    create table public.afl_brownlow (year int, winner text, club text, votes int);
    create table public.nrl_dally_m (year int, winner text);
    insert into public.afl_premiers select 1896 + g, 'x' from generate_series(1, 129) g;
    insert into public.nrl_premiers select 1907 + g, 'x', 'NSWRL' from generate_series(1, 117) g;
    insert into public.afl_brownlow select 1913 + g, 'x', 'y', 10 from generate_series(1, 112) g;
    insert into public.nrl_dally_m select 1978 + g, 'x' from generate_series(1, 47) g;`);
  const sql = fs.readFileSync(v1551, 'utf8');
  const run = async () => (await db.query(sql)).rows.map(num).map(r => [r.t, r.n, r.y2026]);
  const pre = [['afl_premiers', 129, 0], ['nrl_premiers', 117, 0], ['afl_brownlow', 112, 0], ['nrl_dally_m', 47, 0]];
  want('1551 before', await run(), pre);
  await db.exec(fs.readFileSync('supabase/migrations/20261022120000_round_1551_2026_season_rows.sql', 'utf8'));
  const post = [['afl_premiers', 130, 1], ['nrl_premiers', 118, 1], ['afl_brownlow', 113, 1], ['nrl_dally_m', 48, 1]];
  want('1551 after', await run(), post);
  await db.exec(fs.readFileSync('supabase/migrations/20261022120000_round_1551_2026_season_rows.sql', 'utf8'));
  want('1551 after a second run (a no-op)', await run(), post);
}
console.log(bad ? `testVerify: ${bad} FAILED` : 'testVerify: every verify SELECT reads what the rehearsal holds');
process.exit(bad ? 1 : 0);
