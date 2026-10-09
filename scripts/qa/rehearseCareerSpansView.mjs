/* Round 1145: the career spans view, run for real against a fixture table, never against the live project.

   supabase/migrations/20261009_round_1145_bref_nba_career_spans.sql is applied by the lead by hand, and nobody
   building the round can reach the database. So the SQL is rehearsed here in an embedded Postgres (PGlite, the real
   engine compiled to run inside node): a small bref_nba_player_seasons table is loaded from
   src/test/fixtures/careerSpansViewCases.json, the migration file is run word for word, and the view must hand
   back exactly the rows that file lists as expected. src/test/statDetectiveSpans.test.tsx holds its own JS copy of
   the view to the same expected rows, so the copy the lib is tested against and the SQL that ships agree.

   What it proves:
     1. the migration runs on a fresh database, and as create or replace over the first draft of the view (the one
        that grouped by name alone), whichever the live project holds;
     2. the rows are right for a namesake under the 500 minute floor, two men over it, a cohort listed a year out,
        rows with no age, a combined '2TM' row, a malformed or missing season, a missing name, team or minutes;
     3. it holds whatever number type the age and minutes columns turn out to be (integer, numeric, double);
     4. the anon role can read it through the base table's read policy (security_invoker);
     5. read in small pages ordered by (player_name, cohort) nothing is skipped or repeated.

   PGlite is not a dependency of this repo on purpose (no package change for one rehearsal). Install it anywhere and
   say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseCareerSpansView.mjs
   Negative control, must exit 1: REHEARSE_CONTROL=byname runs the first draft's SQL in place of the migration.
   It is not named sim*: the suite runner must not pick up a script that needs a package the repo does not carry. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROL = process.env.REHEARSE_CONTROL || '';
if (CONTROL && CONTROL !== 'byname') { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows`); process.exit(2); }
const dir = process.env.PGLITE_DIR;
if (!dir) { console.error('PGLITE_DIR is not set: see the header of this file. Nothing was run.'); process.exit(2); }
const entry = path.join(dir, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js');
if (!fs.existsSync(entry)) { console.error(`no PGlite at ${entry}. Nothing was run.`); process.exit(2); }
const { PGlite } = await import(pathToFileURL(entry).href);

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const MIGRATION = read('supabase/migrations/20261009_round_1145_bref_nba_career_spans.sql');
const cases = JSON.parse(read('src/test/fixtures/careerSpansViewCases.json'));
/* The view as the round first wrote it and as the brief gave it. If the live project holds it, the migration has
   to replace it in place. */
const FIRST_DRAFT = `
create or replace view public.bref_nba_career_spans with (security_invoker = true) as
  select player_name, min(season) as first_season, max(season) as last_season, count(*)::int as rows
  from public.bref_nba_player_seasons group by player_name;
grant select on public.bref_nba_career_spans to anon, authenticated;`;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const teamsOf = t => (t == null ? null : String(t).split(',').sort().join(','));
const shape = r => ({ player_name: r.player_name, first_season: r.first_season, last_season: r.last_season, rows: Number(r.rows),
  cohort: r.cohort == null ? null : Number(r.cohort), rows_500: r.rows_500 == null ? null : Number(r.rows_500), teams: teamsOf(r.teams) });
const order = (a, b) => (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : (a.cohort ?? Infinity) - (b.cohort ?? Infinity));
const want = cases.expected.map(shape).sort(order);

async function rehearse(numberType, overFirstDraft) {
  const label = `${numberType} columns, ${overFirstDraft ? 'over the first draft' : 'fresh database'}`;
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create table public.bref_nba_player_seasons (
        id bigint generated always as identity primary key, season text, player_name text, team text,
        minutes ${numberType}, age ${numberType}, person_key text);
      alter table public.bref_nba_player_seasons enable row level security;
      create policy "public read" on public.bref_nba_player_seasons for select using (true);
      grant select on public.bref_nba_player_seasons to anon, authenticated;`);
    for (const r of cases.rows) {
      await db.query('insert into public.bref_nba_player_seasons (season, player_name, team, minutes, age) values ($1, $2, $3, $4, $5)',
        [r.season, r.player_name, r.team, r.minutes, r.age]);
    }
    if (overFirstDraft || CONTROL === 'byname') await db.exec(FIRST_DRAFT);
    if (CONTROL !== 'byname') await db.exec(MIGRATION);

    const cols = (await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'bref_nba_career_spans' order by ordinal_position`)).rows.map(r => r.column_name);
    if (cols.join(',') !== 'player_name,first_season,last_season,rows,cohort,rows_500,teams') fail(`${label}: the view's columns are [${cols.join(', ')}]`);
    const got = cols.includes('cohort')
      ? (await db.query('select player_name, first_season, last_season, rows, cohort, rows_500, teams from public.bref_nba_career_spans')).rows.map(shape).sort(order)
      : (await db.query('select player_name, first_season, last_season, rows from public.bref_nba_career_spans')).rows.map(shape).sort(order);
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      fail(`${label}: the view handed back ${got.length} rows that are not the ${want.length} expected`);
      const key = r => JSON.stringify(r);
      const wantSet = new Set(want.map(key)), gotSet = new Set(got.map(key));
      for (const r of got) if (!wantSet.has(key(r))) console.error('     not expected: ' + key(r));
      for (const r of want) if (!gotSet.has(key(r))) console.error('     missing:      ' + key(r));
    }

    await db.exec('set role anon');
    const asAnon = Number((await db.query('select count(*)::int as n from public.bref_nba_career_spans')).rows[0].n);
    await db.exec('reset role');
    if (asAnon !== got.length) fail(`${label}: the anon role reads ${asAnon} rows of ${got.length}`);

    if (cols.includes('cohort')) {
      const paged = [];
      for (let offset = 0; ; offset += 5) {
        const page = (await db.query(`select player_name, cohort from public.bref_nba_career_spans order by player_name asc, cohort asc nulls last limit 5 offset ${offset}`)).rows;
        paged.push(...page.map(r => `${r.player_name}|${r.cohort}`));
        if (page.length < 5) break;
      }
      if (paged.length !== got.length || new Set(paged).size !== got.length) fail(`${label}: read in pages of five the view gave ${paged.length} rows, ${new Set(paged).size} distinct, of ${got.length}`);
    }
    console.log(`   ${label}: ${got.length} rows, anon reads ${asAnon}`);
  } catch (e) {
    fail(`${label}: ${e && e.message ? e.message : e}`);
  } finally {
    await db.close();
  }
}

console.log(`rehearseCareerSpansView: ${cases.rows.length} season rows in, ${want.length} view rows expected${CONTROL ? ` (NEGATIVE CONTROL ON: ${CONTROL}, the first draft's SQL runs in place of the migration)` : ''}`);
for (const numberType of ['integer', 'numeric', 'double precision']) {
  await rehearse(numberType, false);
  await rehearse(numberType, true);
}

if (CONTROL) {
  if (failures === 0) { console.error(`\nCONTROL ${CONTROL} DID NOT FIRE: the first draft passed as the migration.`); process.exit(2); }
  console.log(`\nrehearseCareerSpansView control ${CONTROL}: fired, ${failures} failure(s) above. Exit 1 is the expected result.`);
  process.exit(1);
}
if (failures) { console.error(`\nrehearseCareerSpansView: ${failures} FAILURE(S)`); process.exit(1); }
console.log('\nrehearseCareerSpansView: green. The migration runs fresh and over the first draft, on integer, numeric and double columns; the view hands back the expected rows; anon can read it; paging by (player_name, cohort) is whole.');
