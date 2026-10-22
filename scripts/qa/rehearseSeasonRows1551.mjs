/* Round 1551: the 2026 season rows migration, run for real in an embedded Postgres, never against the live project.

   supabase/migrations/20261022120000_round_1551_2026_season_rows.sql is applied by the lead at a release. Here it
   runs word for word in PGlite (the real engine inside node) on top of the two create files this folder carries
   (afl_premiers and nrl_premiers, with every real row). afl_brownlow and nrl_dally_m were built through the MCP and
   have no create file, so they are made here in the shape PROJECT-STATE.md records (year, winner, club, votes; and
   year, winner) and filled with plainly fictional fixture rows to the verified counts, 112 and 47.

   What it proves:
     1. on the real premiers rolls the rows land and the ratchets simListQuizSources pins come true: 130 and 118
        rows, 18 and 20 names, the Brisbane Lions on 6 flags, the Sydney Roosters on 5, the Storm still on 4;
     2. the medal rows land: 113 and 48, the 2026 winners exactly as the sources give them;
     3. a second run changes nothing;
     4. a wrong pre count in the LAST block (nrl_dally_m at 46) raises and leaves all four tables untouched;
     5. a different 2026 winner already present raises and writes nothing.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseSeasonRows1551.mjs
   Negative control, must exit 1: REHEARSE_CONTROL=noafl drops the AFL insert from the migration text.
   It is not named sim*: the suite runner must not pick up a script that needs a package the repo does not carry. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROL = process.env.REHEARSE_CONTROL || '';
if (CONTROL && CONTROL !== 'noafl') { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
const dir = process.env.PGLITE_DIR;
if (!dir) { console.error('PGLITE_DIR is not set: see the header of this file. Nothing was run.'); process.exit(2); }
const entry = path.join(dir, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js');
if (!fs.existsSync(entry)) { console.error(`no PGlite at ${entry}. Nothing was run.`); process.exit(2); }
const { PGlite } = await import(pathToFileURL(entry).href);

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let MIGRATION = read('supabase/migrations/20261022120000_round_1551_2026_season_rows.sql');
const AFL_INSERT = "INSERT INTO afl_premiers (year, premier) VALUES (2026, 'Brisbane Lions');";
if (CONTROL === 'noafl') {
  if (!MIGRATION.includes(AFL_INSERT)) { console.error('control noafl: the AFL insert is not in the migration, ABORTED'); process.exit(2); }
  MIGRATION = MIGRATION.replace(AFL_INSERT, 'NULL;');
  console.log('CONTROL noafl');
}
const CREATES = [read('supabase/migrations/20260820_create_afl_premiers.sql'), read('supabase/migrations/20260820_create_nrl_premiers.sql')];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const eq = (what, got, want) => { if (got !== want) fail(`${what}: ${got}, want ${want}`); };

async function fresh({ dallyRows = 47, brownlowExtra = '' } = {}) {
  const db = new PGlite();
  for (const c of CREATES) await db.exec(c);
  await db.exec(`CREATE TABLE afl_brownlow (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, year int NOT NULL, winner text NOT NULL, club text, votes int);
    CREATE TABLE nrl_dally_m (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, year int NOT NULL, winner text NOT NULL);
    INSERT INTO afl_brownlow (year, winner, club, votes) SELECT 1800 + g, 'Fixture medallist ' || g, 'Fixture club', 20 FROM generate_series(1, 112) g;
    INSERT INTO nrl_dally_m (year, winner) SELECT 1800 + g, 'Fixture medallist ' || g FROM generate_series(1, ${dallyRows}) g;
    ${brownlowExtra}`);
  return db;
}
const one = async (db, sql) => (await db.query(sql)).rows[0];
const counts = async db => {
  const r = await one(db, `SELECT (SELECT count(*) FROM afl_premiers)::int a, (SELECT count(*) FROM nrl_premiers)::int n,
    (SELECT count(*) FROM afl_brownlow)::int b, (SELECT count(*) FROM nrl_dally_m)::int d`);
  return `${r.a}/${r.n}/${r.b}/${r.d}`;
};
const clubCount = async (db, table, col, name) => (await one(db, `SELECT count(*)::int c FROM ${table} WHERE ${col} = '${name}'`)).c;
const distinct = async (db, table, col) => (await one(db, `SELECT count(DISTINCT ${col})::int c FROM ${table}`)).c;

console.log('1) the rows land on the real rolls');
{
  const db = await fresh();
  eq('pre counts', await counts(db), '129/117/112/47');
  /* A raise is a FAIL with its message, never a crash past the summary line. */
  const run = async what => {
    try { await db.exec(MIGRATION); } catch (e) {
      fail(`the ${what} raised: ${String(e?.message ?? e)}`);
      try { await db.exec('ROLLBACK'); } catch { /* already rolled back */ }
    }
  };
  await run('first run');
  eq('post counts', await counts(db), '130/118/113/48');
  eq('afl distinct names', await distinct(db, 'afl_premiers', 'premier'), 18);
  eq('nrl distinct names', await distinct(db, 'nrl_premiers', 'premier'), 20);
  eq('Brisbane Lions flags', await clubCount(db, 'afl_premiers', 'premier', 'Brisbane Lions'), 6);
  eq('Sydney Roosters premierships', await clubCount(db, 'nrl_premiers', 'premier', 'Sydney Roosters'), 5);
  eq('Melbourne Storm premierships', await clubCount(db, 'nrl_premiers', 'premier', 'Melbourne Storm'), 4);
  const afl = await one(db, 'SELECT premier FROM afl_premiers WHERE year = 2026');
  eq('afl 2026', afl?.premier, 'Brisbane Lions');
  const nrl = await one(db, 'SELECT premier, competition FROM nrl_premiers WHERE year = 2026');
  eq('nrl 2026', `${nrl?.premier} ${nrl?.competition}`, 'Sydney Roosters NRL');
  const bl = await one(db, 'SELECT winner, club, votes FROM afl_brownlow WHERE year = 2026');
  eq('brownlow 2026', `${bl?.winner} ${bl?.club} ${bl?.votes}`, 'Nick Daicos Collingwood 47');
  const dm = await one(db, 'SELECT winner FROM nrl_dally_m WHERE year = 2026');
  eq('dally m 2026', dm?.winner, 'Nathan Cleary');
  console.log('2) a second run changes nothing');
  await run('re-run');
  eq('counts after a re-run', await counts(db), '130/118/113/48');
  await db.close();
}

console.log('3) a wrong pre count in the last block writes nothing anywhere');
{
  const db = await fresh({ dallyRows: 46 });
  let threw = '';
  try { await db.exec(MIGRATION); } catch (e) { threw = String(e?.message ?? e); }
  if (!threw.includes('nrl_dally_m holds 46 rows')) fail(`the dally pre count guard did not raise as expected (${threw || 'no error'})`);
  try { await db.exec('ROLLBACK'); } catch { /* already rolled back */ }
  eq('counts after the refused run', await counts(db), '129/117/112/46');
  await db.close();
}

console.log('4) a different 2026 winner already present raises');
{
  const db = await fresh({ brownlowExtra: "INSERT INTO afl_brownlow (year, winner, club, votes) VALUES (2026, 'Fixture medallist X', 'Fixture club', 30);" });
  let threw = '';
  try { await db.exec(MIGRATION); } catch (e) { threw = String(e?.message ?? e); }
  if (!threw.includes('afl_brownlow already holds a different 2026 medallist')) fail(`the different winner guard did not raise (${threw || 'no error'})`);
  try { await db.exec('ROLLBACK'); } catch { /* already rolled back */ }
  eq('counts after the refused run', await counts(db), '129/117/113/47');
  await db.close();
}

console.log('');
if (failures > 0) {
  console.error(`rehearseSeasonRows1551: ${failures} failure${failures === 1 ? '' : 's'}${CONTROL ? ` (control ${CONTROL})` : ''}`);
  process.exit(1);
}
console.log(`rehearseSeasonRows1551: green. The migration lands the four rows, re-runs as a no-op and refuses a wrong table whole.${CONTROL ? ` Control ${CONTROL} did NOT fire.` : ''}`);
