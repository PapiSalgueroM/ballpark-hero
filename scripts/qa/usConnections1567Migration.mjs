/* Round 1567: write (or check) the guarded migration for the boards this round rewrote in place.

   The boards are the three shipped files (src/data/baseballConnectionsPuzzles.ts, nflConnectionsPuzzles.ts,
   nhlConnectionsPuzzles.ts) at the round's base commit and now. A board is in the migration when it differs; its
   known old values are the base file's board and, for baseball, the seed's own board (migration
   20260526000007) where that differs from the base file (a row nobody has rewritten since the seed still holds
   it). Every row is rewritten only while it holds a known old value: the 1558 guard, word for word.

     node scripts/qa/usConnections1567Migration.mjs write    rewrites the migration file
     node scripts/qa/usConnections1567Migration.mjs check    exit 1 unless the committed file is what write gives

   It reads git (the base commit's files) and the repo; never the network. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BASE = '1229c0190';
/* fix-1567 (review-read-1567 minor 6): the round's new boards are the three files at the round's own data commit,
   not at whatever head this runs on, so the next round that edits one of the files does not turn this check, the
   rehearsal or the checksummed writer red (Round 1558's rehearsal had to be repointed for exactly that). The files
   have not changed since this commit on the round's branch; merge the branch, never squash it, or the commit is
   lost. A later edit of the files is that round's own migration. */
export const ROUND_FILES = 'e61011096f352f2ba5e6c2853794a038c74e3a15';
export const MIGRATION = 'supabase/migrations/20261029120000_round_1567_us_connections_gray.sql';
const SEED = 'supabase/migrations/20260526000007_baseball_connections_puzzles.sql';
export const SPORTS = { baseball: ['baseballConnectionsPuzzles', 'baseball_connections_puzzles'], nfl: ['nflConnectionsPuzzles', 'nfl_connections_puzzles'], nhl: ['nhlConnectionsPuzzles', 'nhl_connections_puzzles'] };

/** The three files' boards, now (rev null) or at a commit: { sport: [{ id, groups }] }. */
export async function boardsAt(rev) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r1567mig-'));
  const R = ROOT.split(path.sep).join('/');
  const lines = [];
  for (const [s, [file]] of Object.entries(SPORTS)) {
    let at = `${R}/src/data/${file}.ts`;
    if (rev) {
      at = path.join(tmp, `${file}.ts`);
      fs.writeFileSync(at, execFileSync('git', ['show', `${rev}:src/data/${file}.ts`], { cwd: ROOT, maxBuffer: 1 << 26 }));
      at = at.split(path.sep).join('/');
    }
    lines.push(`export { ${file} as ${s} } from '${at}';`);
  }
  fs.writeFileSync(path.join(tmp, 'e.mjs'), lines.join('\n'));
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const m = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  const out = {};
  for (const s of Object.keys(SPORTS)) out[s] = m[s].map(b => ({ id: b.id, groups: b.groups.map(g => ({ theme: g.theme, players: [...g.players], difficulty: g.difficulty })) }));
  return out;
}

/** The baseball seed's boards: { puzzle_id: groups }. */
export function seedBoards() {
  const out = {};
  for (const line of fs.readFileSync(path.join(ROOT, SEED), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\('(bconn-\d+)', '(.*)'(?:::jsonb)?, \d+\)[,;]?$/);
    if (m) out[m[1]] = JSON.parse(m[2].replace(/''/g, "'"));
  }
  return out;
}

/* jsonb compares objects by content, not key order; so does this */
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x));
export const same = (a, b) => canon(a) === canon(b);
/* the repo carries no dash character: one in a stored value is written as its JSON escape */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`, 'g');
const lit = v => `'${JSON.stringify(v).replace(DASHES, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).replace(/'/g, "''")}'`;

/** Every rewritten row: { sport: [{ id, olds: [groups], next: groups }] }. */
export async function plan() {
  const [base, head] = [await boardsAt(BASE), await boardsAt(ROUND_FILES)];
  const seed = seedBoards();
  const out = {};
  for (const s of Object.keys(SPORTS)) {
    out[s] = [];
    for (const b of head[s]) {
      const was = base[s].find(x => x.id === b.id);
      if (!was) throw new Error(`${s} ${b.id} is new since ${BASE}: this round only rewrites boards in place`);
      if (same(was.groups, b.groups)) continue;
      const olds = [was.groups];
      if (s === 'baseball' && seed[b.id] && !same(seed[b.id], was.groups)) olds.push(seed[b.id]);
      out[s].push({ id: b.id, olds, next: b.groups });
    }
    if (head[s].length !== base[s].length) throw new Error(`${s}: ${base[s].length} boards at ${BASE}, ${head[s].length} now`);
  }
  return out;
}

const HEADER = `-- Round 1567 (2026-10-29): Baseball, NFL and NHL Connections, the gray pairs decided and the club groups dated.
--
-- UNAPPLIED. Written for review; the lead applies it at a release, away from midnight ET and never beside a gate
-- on live tables. Never rehearsed on production (BEGIN ... ROLLBACK still takes the locks): it is rehearsed in
-- PGlite (scripts/qa/rehearseUsConnections1567.mjs). Written by scripts/qa/usConnections1567Migration.mjs from the
-- three files at ${BASE} and at the round's head; never edit it by hand.
--
-- What it does: rewrites, IN PLACE, the rows of baseball_connections_puzzles, nfl_connections_puzzles and
-- nhl_connections_puzzles whose boards this round changed in src/data/baseballConnectionsPuzzles.ts,
-- nflConnectionsPuzzles.ts and nhlConnectionsPuzzles.ts. Same puzzle_id, same sort_order, same row count, so
-- dailyIndex deals the same board on the same day and nothing reshuffles. Only groups_json changes.
--
-- Why: Round 1558 left 53 baseball pairs the record could not judge (a man with 10 to 30 percent of his games at
-- the position of a group beside him, Frank Robinson with 29.4 percent in left field beside "Hall of Fame left
-- fielders"; one to four seasons beside a legends group), two members it could not place (Curt Schilling,
-- Paul Molitor) and two just over its 30 percent line (Stan Musial, Jim Thome). Each was read on two hosts
-- (scripts/data/baseballConnectionsVerified-2026-10.json, grayPairs), none was decided, so each man left that
-- board and a man the record decides against every group on it took his place. Shohei Ohtani (14 starts in
-- 2026) left the board beside "Won Cy Young Award" until the 2026 vote is named. And every "Played for the X"
-- group in the three sports gains a date the checker holds to ("as of 2026", "as of 2025", "as of 2025-26"),
-- because a man still playing on the board could otherwise become a second right answer by signing there.
--
-- The guard: a row is rewritten only while it still holds one of the boards known from before this round (jsonb
-- equality): the base file's board, and for a baseball row nobody has rewritten since the seed, the seed's own
-- board. A row that holds anything else is left alone and named in a NOTICE, never overwritten blind. The live
-- tables hold more rows than the files; rows past the files are not touched.
--
-- A saved daily guess keeps the groups it solved as they were saved, so apply on a day this rewrites no dealt
-- board: node scripts/qa/connectionsDealtDay1567.mjs baseball=<export>,nfl=<export>,nhl=<export> <YYYY-MM-DD>
-- To apply a drifted table as one checksummed, all or nothing step, see scripts/qa/usConnections1567Checksummed.mjs.
--
-- A re-run after a good apply is a no-op (no row still holds an old board).
`;

function block(sport, rows) {
  const table = SPORTS[sport][1];
  const tmp = `r1567_${sport}`;
  const values = rows.flatMap(r => r.olds.map(o => `    ('${r.id}', ${lit(o)}, ${lit(r.next)})`));
  return `
-- ${table}: ${rows.length} boards (${values.length} known old values)
do $$
declare
  rewritten int := 0;
  already int := 0;
  drifted text[] := '{}';
  missing text[] := '{}';
  r record;
begin
  create temp table ${tmp} (puzzle_id text, old_groups jsonb, new_groups jsonb) on commit drop;
  insert into ${tmp} (puzzle_id, old_groups, new_groups) values
${values.join(',\n')}
  ;
  for r in select distinct puzzle_id, new_groups from ${tmp} loop
    if not exists (select 1 from public.${table} c where c.puzzle_id = r.puzzle_id) then
      missing := missing || r.puzzle_id;
    elsif exists (select 1 from public.${table} c where c.puzzle_id = r.puzzle_id and c.groups_json = r.new_groups) then
      already := already + 1;
    else
      update public.${table} c
         set groups_json = r.new_groups
       where c.puzzle_id = r.puzzle_id
         and c.groups_json in (select o.old_groups from ${tmp} o where o.puzzle_id = r.puzzle_id);
      if found then
        rewritten := rewritten + 1;
      else
        drifted := drifted || r.puzzle_id;
      end if;
    end if;
  end loop;
  drop table ${tmp};
  raise notice 'Round 1567 ${table}: % boards rewritten, % already current, % drifted from every known old board (left alone): %, % not in the table: %',
    rewritten, already, coalesce(array_length(drifted, 1), 0), drifted, coalesce(array_length(missing, 1), 0), missing;
end
$$;
`;
}

export async function migrationText() {
  const p = await plan();
  return HEADER + Object.keys(SPORTS).map(s => block(s, p[s])).join('');
}

const step = process.argv[2];
if (step === 'write' || step === 'check') {
  const text = await migrationText();
  const file = path.join(ROOT, MIGRATION);
  if (step === 'write') {
    fs.writeFileSync(file, text);
    const p = await plan();
    console.log(`wrote ${MIGRATION}: ${Object.entries(p).map(([s, r]) => `${s} ${r.length} boards (${r.reduce((t, x) => t + x.olds.length, 0)} old values)`).join(', ')}`);
  } else {
    const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
    if (have !== text) { console.error(`${MIGRATION} is not what the files at ${BASE} and ${ROUND_FILES.slice(0, 9)} give: run write`); process.exit(1); }
    console.log(`${MIGRATION} matches the files`);
    if (!same(await boardsAt(null), await boardsAt(ROUND_FILES))) console.log(`note: the three files have changed since ${ROUND_FILES.slice(0, 9)}; the migration stays the round's, and the change is a later round's to migrate`);
  }
}
