/* Round 1583: the NBA Connections file boards (nbaconn-001 to 004) against the live table, and the guarded
   migration for the ones this round decided in place.

   The daily is dealt from nba_connections_puzzles; the shipped file (src/data/nbaConnectionsPuzzles.ts) is only the
   offline fallback, and its four ids are also live rows. Round 1574's table tools keep only the rows the file does
   not hold (usConnectionsTableImport.mjs init and drift both skip a file id), so a live nbaconn-002 that differs
   from the file would be invisible to them, and a migration whose old value comes from the file would leave such a
   row alone with a NOTICE while the harness stays green on the file (critic-1583 item 7). So:

     node scripts/qa/nbaConnections1583Migration.mjs compare nba=<export.json>
       each file id's live row, by scripts/lib/connectionsMigration.mjs classify with a plan whose old and new value
       are both the base file's board: every one must come back current. Anything else (drifted, missing) STOPS,
       exit 1, named. COMPARE_CONTROL=edit changes one base board in memory first: it must come back drifted, exit 1.
       Run it on the lead's export before any decision, and again on the fresh export of the apply day (where a row
       already holding the new board is reported as applied, not drifted).

     node scripts/qa/nbaConnections1583Migration.mjs write | check
       the guarded migration (MIGRATION): every file id whose board differs between BASE and ROUND_FILES, rewritten
       in place only while the live row still holds the base board (the 1558 guard, written by
       scripts/lib/connectionsMigration.mjs guardedBlockSql, the one engine). check exits 1 unless the committed file is
       what write gives.

     node scripts/qa/nbaConnections1583Migration.mjs checksummed nba=<export.json> <out.sql>
       the checksummed, all or nothing form from a fresh export (connectionsMigration.mjs classify and checksummedSql):
       a row already holding the new board is left out, a row holding the base board goes in with its exported hash,
       anything else (drifted) or a missing row STOPS (exit 1) unless ACCEPT_DRIFTED names it after the lead reads it.

   BASE is the commit this round's branch was cut from (Round 1574's closed head, carrying 1567's); ROUND_FILES is
   the round's data commit, the file as this round decided it. Merge the branch, never squash it, or the commit is
   lost; a later edit of the file is that round's own migration. Reads git, the export and the repo; never the
   network. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { classify, checksummedSql as lift, guardedBlockSql, same } from '../lib/connectionsMigration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BASE = 'b4a331a9cb1db7411b91538eaeaf29385d2ce3a9';
export const ROUND_FILES = process.env.R1583_ROUND_FILES ?? '4708a3d5965729156892f3e538633b2c3cfef96d';
export const MIGRATION = 'supabase/migrations/20261031120000_round_1583_nba_connections_dated.sql';
export const TABLE = 'nba_connections_puzzles';
export const WRITER = 'scripts/qa/nbaConnections1583Migration.mjs';
const FILE = 'src/data/nbaConnectionsPuzzles.ts';

/** The file's boards now (rev null) or at a commit: [{ id, groups: [{ theme, players, difficulty }] }]. */
export async function boardsAt(rev) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r1583mig-'));
  const R = ROOT.split(path.sep).join('/');
  let at = `${R}/${FILE}`;
  if (rev) {
    at = path.join(tmp, 'nbaConnectionsPuzzles.ts');
    fs.writeFileSync(at, execFileSync('git', ['show', `${rev}:${FILE}`], { cwd: ROOT, maxBuffer: 1 << 26 }));
    at = at.split(path.sep).join('/');
  }
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export { nbaConnectionsPuzzles as b } from '${at}';`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  return b.map(x => ({ id: x.id, groups: x.groups.map(g => ({ theme: g.theme, players: [...g.players], difficulty: g.difficulty })) }));
}

/** The file ids' live rows against the base file: { already, drifted, missing, applied } from classify. */
export async function compareFileRows(rows, { control = '' } = {}) {
  const base = await boardsAt(BASE);
  if (control === 'edit') {
    const g = base[1]?.groups[2];
    if (!g || !g.players.length) throw new Error('COMPARE_CONTROL=edit: no base board to edit, ABORTED');
    g.players = [...g.players.slice(1), g.players[0]];
    console.log(`COMPARE_CONTROL=edit: ${base[1].id} "${g.theme}" reordered in memory; it must come back drifted`);
  }
  const plan = { nba: base.map(b => ({ id: b.id, olds: [b.groups], next: b.groups })) };
  const c = classify({ plan, exports: { nba: rows }, acceptDrifted: [] });
  const strip = xs => xs.map(x => x.slice('nba:'.length));
  /* a row that already holds this round's board is applied, not drifted (the apply day's fresh export, after) */
  const head = new Map((await boardsAt(ROUND_FILES)).map(b => [b.id, b.groups]));
  const live = new Map(rows.map(r => [r.puzzle_id, typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json]));
  const drifted = strip(c.drifted);
  const applied = drifted.filter(id => same(live.get(id), head.get(id)));
  return { ids: base.map(b => b.id), already: strip(c.already), drifted: drifted.filter(id => !applied.includes(id)), missing: strip(c.missing), applied };
}

/** Every rewritten file row: [{ id, olds: [base board], next: decided board }], in file order. */
export async function plan() {
  const [base, head] = [await boardsAt(BASE), await boardsAt(ROUND_FILES)];
  if (head.length !== base.length || head.some((b, i) => b.id !== base[i].id)) throw new Error(`the file's ids or their order changed between ${BASE} and ${ROUND_FILES}: this round rewrites boards in place only`);
  const out = [];
  for (const [i, b] of head.entries()) {
    const was = base[i];
    if (b.groups.map(g => g.difficulty).join() !== was.groups.map(g => g.difficulty).join()) throw new Error(`${b.id}: the colours moved`);
    if (same(was.groups, b.groups)) continue;
    out.push({ id: b.id, olds: [was.groups], next: b.groups });
  }
  return out;
}

const HEADER = n => `-- Round 1583 (2026-10-31): NBA Connections, the four file boards decided in place and dated.
--
-- UNAPPLIED. Written for review; the lead applies it at a release, away from midnight ET and never beside a gate
-- on live tables, after the release carrying Round 1567's matcher (src/lib/connectionsSolvedMatch.ts) and this
-- round's page and dialog is proven live. Never rehearsed on production (BEGIN ... ROLLBACK still takes the locks):
-- it is rehearsed in PGlite (scripts/qa/rehearseNbaConnections1583.mjs). Written by ${WRITER}
-- from src/data/nbaConnectionsPuzzles.ts at ${BASE} (the old boards) and ${ROUND_FILES} (the new);
-- never edit it by hand.
--
-- What it does: rewrites, IN PLACE, the ${n} rows of nba_connections_puzzles the shipped file also holds
-- (nbaconn-001 to nbaconn-004). Same puzzle_id, same sort_order, same row count, same order and colours of the four
-- groups, so dailyIndex deals the same board on the same day and nothing reshuffles. Only groups_json changes.
-- Rows nbaconn-005 to 020 (the table rows past the file) are not touched: they are Round 1586's.
--
-- Why: no NBA board had ever been held to two hosts, and one tile was false: Tony Parker sat in "Born in France"
-- on nbaconn-002 (born in Bruges, Belgium). He leaves it for Victor Wembanyama; Nicolas Batum (a season from 2,000
-- career three-pointers beside that group) leaves it for Ian Mahinmi; DeMarcus Cousins (rostered by the 2019-20
-- Lakers without a game, beside the Lakers group) leaves nbaconn-004 for De'Aaron Fox. Every club group is dated
-- "(as of 2025-26)", so a trade can never give a board a second right answer. Every member stands on two hosts
-- (scripts/data/nbaConnectionsVerified-2026-10.json).
--
-- The guard: a row is rewritten only while it still holds the base file's board (jsonb equality); the lead's
-- 2026-10-29 export held exactly that for all four (compare mode). A row that holds anything else is left alone and
-- named in a NOTICE, never overwritten blind.
--
-- A saved daily guess keeps the groups it solved as they were saved, so apply on a day this rewrites no dealt
-- board: node scripts/qa/connectionsDealtDay1583.mjs nba=<export> <YYYY-MM-DD> +40
-- To apply as one checksummed, all or nothing step: node ${WRITER} checksummed nba=<export> <out.sql>
--
-- A re-run after a good apply is a no-op (no row still holds its base board).
`;

export async function migrationText() {
  const p = await plan();
  return HEADER(p.length) + guardedBlockSql({ round: '1583', table: TABLE, tmp: 'r1583_nba', rows: p });
}

/** The checksummed SQL for a payload of { t, id, h, n } rows. Exported for the rehearsal. */
export const checksummedSql = payloadRows => lift({ round: '1583', writer: WRITER, tables: { nba: TABLE }, payloadRows });
/** The payload from an export: { rows, already, drifted, missing }. */
export const payloadFrom = async (exports, acceptDrifted = []) => classify({ plan: { nba: await plan() }, exports, acceptDrifted });

const step = process.argv[2];
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (step === 'compare') {
    const [s, file] = String(process.argv[3] ?? '').split('=');
    if (s !== 'nba' || !file) { console.error('usage: compare nba=<export.json>'); process.exit(2); }
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    let r;
    try { r = await compareFileRows(rows, { control: process.env.COMPARE_CONTROL ?? '' }); } catch (e) { console.error(e.message); process.exit(2); }
    const say = (k, xs) => `${xs.length} ${k}${xs.length ? ` (${xs.join(', ')})` : ''}`;
    console.log(`nba file ids ${r.ids.join(', ')} against ${path.basename(file)}: ${say('current', r.already)}; ${say('already holding this round\'s board', r.applied)}; ${say('drifted', r.drifted)}; ${say('missing', r.missing)}`);
    if (r.drifted.length || r.missing.length || r.already.length + r.applied.length !== r.ids.length) {
      console.error('STOP: a file id\'s live row is neither the base file\'s board nor this round\'s. Read it in the export: the live row is what gets decided, and its board joins the migration\'s old values.');
      process.exit(1);
    }
    console.log('nbaConnections1583Migration compare: green. Every file id\'s live row holds the base file\'s board (or already this round\'s).');
  } else if (step === 'write' || step === 'check') {
    const text = await migrationText();
    const file = path.join(ROOT, MIGRATION);
    const n = (await plan()).length;
    if (step === 'write') { fs.writeFileSync(file, text); console.log(`wrote ${MIGRATION}: nba ${n} boards`); }
    else {
      const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
      if (have !== text) { console.error(`${MIGRATION} is not what the file at ${BASE} and ${ROUND_FILES} gives: run write`); process.exit(1); }
      console.log(`${MIGRATION} matches the file at ${BASE} and ${ROUND_FILES} (${n} boards)`);
      if (!same(await boardsAt(null), await boardsAt(ROUND_FILES))) console.log(`note: the file has changed since ${ROUND_FILES}; the migration stays the round's, and the change is a later round's to migrate`);
    }
  } else if (step === 'checksummed') {
    const [src, outFile] = process.argv.slice(3);
    const [s, f] = String(src ?? '').split('=');
    if (s !== 'nba' || !f || !outFile) { console.error('usage: checksummed nba=<export.json> <out.sql>'); process.exit(2); }
    const accept = (process.env.ACCEPT_DRIFTED ?? '').split(',').filter(Boolean);
    const r = await payloadFrom({ nba: JSON.parse(fs.readFileSync(f, 'utf8')) }, accept);
    console.log(`rows to rewrite ${r.rows.length}; already current ${r.already.length}; drifted ${r.drifted.length}${r.drifted.length ? ` (${r.drifted.join(', ')})` : ''}; missing ${r.missing.length}${r.missing.length ? ` (${r.missing.join(', ')})` : ''}`);
    if (r.missing.length || r.drifted.some(x => !accept.includes(x.split(':')[1]))) { console.error('STOP: a row is missing or drifted. Look at it in the export; list a drifted row in ACCEPT_DRIFTED only if overwriting it with the new board is right.'); process.exit(1); }
    fs.writeFileSync(outFile, checksummedSql(r.rows));
    console.log(`wrote ${outFile}`);
  } else {
    console.error('usage: compare nba=<export.json> | write | check | checksummed nba=<export.json> <out.sql>');
    process.exit(2);
  }
}
