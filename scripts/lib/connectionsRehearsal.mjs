/* The PGlite rehearsal of a Connections table migration, one engine for every sport (lifted in Round 1583 out of
   Round 1574's scripts/qa/rehearseUsConnections1574.mjs, whose checks, controls and judge it is, word for word).
   A round's script is thin: it names its migration and generator, the boards the table held at the export, the
   boards it decides and the lines of copy that differ, and calls rehearse(). Never against the live project.

   The guarded form (the round's migration) and the checksummed all or nothing form (the SQL its generator writes
   from an export, the form production gets) both run word for word on a table built as the export found it, in
   sort_order, plus one row past it that the game never deals (three groups). What it proves:
     0. the migration is what its generator gives, every new board is the decided one and every old value the
        board the table held;
     A. "export": the guarded form rewrites the planned rows in place, touches nothing else, keeps the row count,
        every sort_order and the valid pool, and a second run is a no-op;
     B. "drift": one planned row changed first; the guarded form leaves exactly that row alone;
     C. "checksum": the checksummed form written from an export of the table (md5 by PGlite itself) lands every
        planned row, and a second run is a no-op;
     D. "tamper": one character of that payload changed: it raises and changes nothing;
     E. "late drift": a row changed after the export: it raises and changes nothing (all or nothing);
     G. the rows after A, dumped and checked by scripts/simUsConnectionsFacts.mjs with US_CONN_LIVE and
        US_CONN_LIVE_STRICT set to the sport: 0 failures;
     H. the board the game deals (the app's own fetcher with its validity rule, over a stub client holding the
        table, and the app's own dailyIndex) is the same puzzle_id on every date from 2026-10-30 to 2027-12-03
        (400 dates) before and after the migration.
   Negative controls (REHEARSE_CONTROL), each must exit 1 and say which check caught it:
     noguard  the guard stripped from the guarded form: B overwrites the drifted row
     drift    one tile of the drift row's new board changed in the migration only: check 0
     tamper   the payload checksum test stripped from the checksummed form: D lands a wrong board
     nohash   the per row hash test stripped from the checksummed form: E overwrites the late drift
     dupname  one rewritten board carries a repeated name after A: the pool shrinks and H names the first date
              whose board moved
   A control that cannot find what it changes exits 2 (ABORTED). PGlite is not a dependency of this repo on purpose:
   PGLITE_DIR names the folder it was installed into (npm install --prefix /tmp/pgl @electric-sql/pglite). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { same } from './connectionsMigration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = ROOT.split(path.sep).join('/');
const OWN = { noguard: 'B', drift: '0', tamper: 'D', nohash: 'E', dupname: 'H' };
const valid = g => { const a = Array.isArray(g) ? g : []; const all = a.flatMap(x => x.players ?? []); return a.length === 4 && a.every(x => (x.players ?? []).length === 5) && new Set(all).size === 20; };
const DRIFTED = [{ theme: 'A drifted board', players: ['A', 'B', 'C', 'D', 'E'], difficulty: 'yellow' }];
const HASH_TEST = ' and md5(c.groups_json::text) = rec.h;';
const checksumTest = round => new RegExp(`  if md5\\(payload\\) <> '[0-9a-f]{32}' then\\n    raise exception 'Round ${round}: payload checksum mismatch, nothing applied';\\n  end if;\\n`);

/**
 * One round's rehearsal; it exits with the verdict (0 green, 1 a failure or a control that fired, 2 aborted).
 *   name        the script, as every verdict line names it
 *   round       the round number the checksummed form raises with
 *   sport       the US_CONN_LIVE key, the label of the per sport lines and the past row's prefix
 *   table, migration (its path), guardTmp (the temporary table the guard reads), n (the planned rows)
 *   driftId     the row B and E drift and the drift and dupname controls change
 *   mark        { from, to }: a name on driftId's new board and the one character change drift and D make
 *   load        async, after the controls are applied: { plan, newBoard(id), oldBoard(id), seed: [{ id, groups,
 *               order }] (the table as the export found it), past (the groups of the row past it) }
 *   migrationText, payloadFrom, checksummedSql   the generator's own functions
 *   keepLive    (puzzle_id, planned) => whether a row after A goes in G's dump
 *   fetcher     { file, name }: the app's fetcher module under the repo root and its export
 *   copy        { zero, newIs, oldIs, newSummary, oldSummary, writer, liveHeading, liveWhat, green }
 */
export async function rehearse(cfg) {
  const { name, round, sport, table, guardTmp, n: N, driftId: DRIFT_ID, mark, copy } = cfg;
  const CONTROL = process.env.REHEARSE_CONTROL || '';
  if (CONTROL && !Object.keys(OWN).includes(CONTROL)) { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
  const dir = process.env.PGLITE_DIR;
  if (!dir) { console.error('PGLITE_DIR is not set: see the header of this file. Nothing was run.'); process.exit(2); }
  const entry = path.join(dir, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js');
  if (!fs.existsSync(entry)) { console.error(`no PGlite at ${entry}. Nothing was run.`); process.exit(2); }
  const { PGlite } = await import(pathToFileURL(entry).href);
  const abort = m => { console.error(`control ${CONTROL}: ${m}, ABORTED`); process.exit(2); };

  let failures = 0;
  const fail = s => { failures += 1; console.error('  FAIL: ' + s); };
  const caught = new Set();
  const catchBy = (check, s) => { caught.add(check); fail(s); };

  let MIGRATION = fs.readFileSync(path.join(ROOT, cfg.migration), 'utf8').replace(/\r\n/g, '\n');
  if (CONTROL === 'noguard') {
    const guard = `\n         and c.groups_json in (select o.old_groups from ${guardTmp} o where o.puzzle_id = r.puzzle_id);`;
    if (!MIGRATION.includes(guard)) abort('the guard is not in the migration');
    MIGRATION = MIGRATION.replace(guard, ';');
  }
  if (CONTROL === 'drift') {
    const at = MIGRATION.indexOf(`    ('${DRIFT_ID}', `);
    const end = at < 0 ? -1 : MIGRATION.indexOf('\n', at);
    const line = at < 0 ? '' : MIGRATION.slice(at, end);
    const k = line.lastIndexOf(mark.from);
    if (k < 0) abort(`${DRIFT_ID}'s new board with ${mark.from} is not in the migration`);
    MIGRATION = MIGRATION.slice(0, at) + line.slice(0, k) + mark.to + line.slice(k + mark.from.length) + MIGRATION.slice(end);
  }

  /* the migration's own rows: puzzle_id, the board it replaces, the new board */
  const rows = [];
  for (const line of MIGRATION.split('\n')) {
    const m = line.match(/^\s*\('([^']+)', '((?:[^']|'')*)', '((?:[^']|'')*)'\),?$/);
    if (m) rows.push({ id: m[1], old: JSON.parse(m[2].replace(/''/g, "'")), now: JSON.parse(m[3].replace(/''/g, "'")) });
  }
  const { plan: p, newBoard, oldBoard, seed, past } = await cfg.load();

  console.log(`0) the migration against its generator and ${copy.zero}`);
  {
    if (rows.length !== N || p.length !== N) catchBy('0', `the migration names ${rows.length} rows, the generator ${p.length}, this round ${N}`);
    let tied = 0, olds = 0;
    for (const r of rows) {
      const nb = newBoard(r.id);
      if (nb === undefined || !same(nb, r.now)) catchBy('0', `${r.id}: the migration's new board is not ${copy.newIs}`); else tied += 1;
      if (same(oldBoard(r.id), r.old)) olds += 1; else catchBy('0', `${r.id}: the migration's old value is not ${copy.oldIs}`);
    }
    console.log(`   ${sport}: ${rows.length} rows, ${tied} new values equal ${copy.newSummary}, ${olds} old values are ${copy.oldSummary}`);
    if (!CONTROL && (await cfg.migrationText()) !== MIGRATION) catchBy('0', `the committed migration is not what ${copy.writer} writes`);
  }

  const CREATE = `create table public.${table} (id uuid primary key default gen_random_uuid(), puzzle_id text not null unique, groups_json jsonb not null, sort_order smallint not null, created_at timestamptz not null default now());`;

  /** A fresh database holding the table as the export found it, plus one row past it the game never deals. */
  async function fresh() {
    const db = new PGlite();
    await db.exec('create role anon; create role authenticated;');
    await db.exec(CREATE);
    for (const b of seed) await db.query(`insert into public.${table} (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)`, [b.id, JSON.stringify(b.groups), b.order]);
    const last = Math.max(...seed.map(b => b.order));
    await db.query(`insert into public.${table} (puzzle_id, groups_json, sort_order) values ($1, $2::jsonb, $3)`, [`${sport}-past-1`, JSON.stringify(past), last + 1]);
    return db;
  }
  const snap = async db => (await db.query(`select puzzle_id, sort_order, groups_json from public.${table} order by sort_order`)).rows;
  const tryExec = async (db, sql) => { try { await db.exec(sql); return null; } catch (e) { return String(e.message ?? e); } };
  const planned = new Set(rows.map(r => r.id));

  /** The table after a run against it before: every planned row at its new board (or left alone), nothing else
      changed, the row count, sort_order and the valid pool kept. */
  function judge(label, before, after, { left = [] } = {}) {
    const ok = { rewritten: 0, left: 0 };
    if (after.length !== before.length) catchBy('A', `${label}: ${before.length} rows became ${after.length}`);
    if (!same(after.map(r => [r.puzzle_id, r.sort_order]), before.map(r => [r.puzzle_id, r.sort_order]))) catchBy('A', `${label}: a puzzle_id or sort_order moved`);
    const vb = before.filter(r => valid(r.groups_json)).map(r => r.puzzle_id).join();
    const va = after.filter(r => valid(r.groups_json)).map(r => r.puzzle_id).join();
    if (vb !== va) catchBy('A', `${label}: the valid pool changed, so every daily would reshuffle`);
    const by = new Map(after.map(r => [r.puzzle_id, r.groups_json]));
    for (const b of before) {
      const got = by.get(b.puzzle_id);
      if (left.includes(b.puzzle_id)) { if (same(got, b.groups_json)) ok.left += 1; else catchBy('B', `${label}: ${b.puzzle_id} had drifted and was overwritten`); continue; }
      if (planned.has(b.puzzle_id)) { if (same(got, newBoard(b.puzzle_id))) ok.rewritten += 1; else catchBy('A', `${label}: ${b.puzzle_id} does not hold the new board`); continue; }
      if (!same(got, b.groups_json)) catchBy('A', `${label}: ${b.puzzle_id} is not in the migration and changed`);
    }
    return ok;
  }

  console.log('A) export: the guarded form on the table as exported');
  let BEFORE = null, AFTER = null;
  {
    const db = await fresh();
    BEFORE = await snap(db);
    const err = await tryExec(db, MIGRATION);
    if (err) catchBy('A', `the migration raised: ${err}`);
    AFTER = await snap(db);
    const ok = judge('export', BEFORE, AFTER);
    console.log(`   ${sport}: ${BEFORE.length} rows (${BEFORE.filter(r => valid(r.groups_json)).length} valid before, ${AFTER.filter(r => valid(r.groups_json)).length} after); ${ok.rewritten} rewritten in place`);
    await tryExec(db, MIGRATION);
    if (!same(await snap(db), AFTER)) catchBy('A', 'export: a second run changed the table');
  }

  console.log('B) drift: one planned row changed first; the guard leaves it alone');
  {
    const db = await fresh();
    await db.query(`update public.${table} set groups_json = $1::jsonb where puzzle_id = $2`, [JSON.stringify(DRIFTED), DRIFT_ID]);
    const before = await snap(db);
    const err = await tryExec(db, MIGRATION);
    if (err) catchBy('B', `the migration raised: ${err}`);
    const ok = judge('drift', before, await snap(db), { left: [DRIFT_ID] });
    console.log(`   ${sport}: ${ok.rewritten} rewritten, ${ok.left} drifted row left alone (${DRIFT_ID})`);
  }

  /* the export the lead takes: the rows with Postgres's own md5 of the stored text */
  const exportOf = async db => (await db.query(`select puzzle_id, sort_order, groups_json, md5(groups_json::text) as h from public.${table} order by sort_order`)).rows;
  const CHECKSUM_TEST = checksumTest(round);

  console.log('C) checksum: the all or nothing form from an export of the table');
  let SQL = '';
  {
    const db = await fresh();
    const r = await cfg.payloadFrom({ [sport]: await exportOf(db) });
    if (r.rows.length !== N || r.drifted.length || r.missing.length || r.already.length) catchBy('C', `the payload holds ${r.rows.length} rows (drifted ${r.drifted.length}, missing ${r.missing.length}, already ${r.already.length}), expected ${N} and none else`);
    SQL = cfg.checksummedSql(r.rows);
    const before = await snap(db);
    const err = await tryExec(db, SQL);
    if (err) catchBy('C', `the checksummed form raised: ${err}`);
    const after = await snap(db);
    const n = judge('checksum', before, after).rewritten;
    const err2 = await tryExec(db, SQL);
    if (err2) catchBy('C', `a second run raised: ${err2}`);
    if (!same(await snap(db), after)) catchBy('C', 'a second run changed the table');
    console.log(`   ${r.rows.length} rows in the payload; ${n} rewritten in place; a second run ${err2 ? 'raised' : 'is a no-op'}`);
  }

  console.log('D) tamper: one character of the payload changed');
  {
    const db = await fresh();
    let sql = SQL;
    const k = sql.indexOf(mark.from);
    if (k < 0) abort(`${mark.from} is not in the payload`);
    sql = sql.slice(0, k) + mark.to + sql.slice(k + mark.from.length);
    if (CONTROL === 'tamper') { if (!CHECKSUM_TEST.test(sql)) abort('the payload checksum test is not in the checksummed SQL'); sql = sql.replace(CHECKSUM_TEST, ''); }
    const before = await snap(db);
    const err = await tryExec(db, sql);
    const after = await snap(db);
    if (!err || !/checksum mismatch/.test(err)) catchBy('D', `a tampered payload was not refused by its checksum (${err ?? 'no error'})`);
    if (!same(after, before)) catchBy('D', 'a tampered payload changed the table');
    console.log(`   refused: ${err ? err.slice(0, 80) : 'NOT REFUSED'}; table ${same(after, before) ? 'unchanged' : 'CHANGED'}`);
  }

  console.log('E) late drift: a row changed between the export and the apply');
  {
    const db = await fresh();
    let sql = SQL;
    if (CONTROL === 'nohash') { const n = sql.split(HASH_TEST).length - 1; if (n !== 1) abort(`found ${n} of the 1 per row hash test`); sql = sql.split(HASH_TEST).join(';'); }
    await db.query(`update public.${table} set groups_json = $1::jsonb where puzzle_id = $2`, [JSON.stringify(DRIFTED), DRIFT_ID]);
    const before = await snap(db);
    const err = await tryExec(db, sql);
    const after = await snap(db);
    if (!err || !/nothing applied/.test(err)) catchBy('E', `a row that drifted after the export did not stop the step (${err ?? 'no error'})`);
    if (!same(after, before)) catchBy('E', 'a step with a drifted row changed the table (all or nothing broken)');
    console.log(`   refused: ${err ? err.slice(0, 90) : 'NOT REFUSED'}; table ${same(after, before) ? 'unchanged' : 'CHANGED'}`);
  }

  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `r${round}reh-`));
  console.log(`G) ${copy.liveHeading}, held to every section by the harness in strict live mode`);
  {
    const dump = path.join(TMP, `${sport}-after.json`);
    fs.writeFileSync(dump, JSON.stringify(AFTER.filter(r => cfg.keepLive(r.puzzle_id, planned)).map(r => ({ puzzle_id: r.puzzle_id, sort_order: r.sort_order, groups_json: r.groups_json }))));
    let out = '', code = 0;
    try { out = execFileSync('node', ['scripts/simUsConnectionsFacts.mjs'], { cwd: ROOT, env: { ...process.env, US_CONN_LIVE: `${sport}=${dump}`, US_CONN_LIVE_STRICT: sport, US_CONN_CONTROL: '' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { code = e.status ?? 1; out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
    const last = out.trim().split('\n').pop();
    if (code !== 0) catchBy('G', `the harness over the ${copy.liveWhat} after the migration exited ${code}: ${last}`);
    console.log(`   simUsConnectionsFacts with US_CONN_LIVE=${sport} and US_CONN_LIVE_STRICT=${sport}: exit ${code}; ${last.slice(0, 110)}`);
  }

  console.log('H) the board the game deals, 400 dates, before and after');
  {
    /* the app's own fetcher and validity rule over a stub client that answers with the table, and the app's dailyIndex */
    fs.writeFileSync(path.join(TMP, 'stub.mjs'), 'export const supabase = { from: () => ({ select: () => ({ order: async () => ({ data: globalThis.__CONN_ROWS, error: null }) }) }) };');
    fs.writeFileSync(path.join(TMP, 'h.mjs'), `export { dailyIndex } from '${R}/src/lib/dateUtils.ts';\nexport { ${cfg.fetcher.name} as fetchPuzzles } from '${R}/${cfg.fetcher.file}';`);
    const stubPlugin = { name: 'stub', setup(b) { b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: path.join(TMP, 'stub.mjs') })); } };
    await build({ entryPoints: [path.join(TMP, 'h.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'ho.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [stubPlugin] });
    const app = await import(pathToFileURL(path.join(TMP, 'ho.mjs')).href);
    const after = AFTER.map(r => ({ ...r, groups_json: JSON.parse(JSON.stringify(r.groups_json)) }));
    if (CONTROL === 'dupname') {
      const r = after.find(x => x.puzzle_id === DRIFT_ID);
      if (!r || !valid(r.groups_json)) abort(`${DRIFT_ID} is not a valid board after A`);
      r.groups_json[1].players[0] = r.groups_json[0].players[0];
      console.log(`REHEARSE_CONTROL=dupname: ${DRIFT_ID} now deals ${r.groups_json[0].players[0]} twice`);
    }
    const poolOf = async rowsNow => { globalThis.__CONN_ROWS = rowsNow.map(r => ({ puzzle_id: r.puzzle_id, groups_json: r.groups_json })); return app.fetchPuzzles(); };
    const pb = await poolOf(BEFORE);
    const pa = await poolOf(after);
    const start = new Date('2026-10-30T12:00:00Z');
    let moved = 0, first = null;
    for (let i = 0; i < 400; i += 1) {
      const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
      const b = pb[app.dailyIndex(d, pb.length)]?.id;
      const a = pa[app.dailyIndex(d, pa.length)]?.id;
      if (a !== b) { moved += 1; first ??= `${d} (${b} before, ${a} after)`; }
    }
    if (moved) catchBy('H', `${moved} of 400 dates deal another board after the migration, the first ${first}`);
    console.log(`   pools ${pb.length} before, ${pa.length} after; ${400 - moved} of 400 dates deal the same puzzle_id${first ? `; first moved ${first}` : ''}`);
  }

  console.log('');
  if (CONTROL) {
    const own = OWN[CONTROL];
    if (caught.has(own)) { console.error(`${name} control ${CONTROL}: FIRED, caught by check ${own} (${failures} failure${failures === 1 ? '' : 's'}; checks ${[...caught].join(', ')})`); process.exit(1); }
    console.log(`${name} control ${CONTROL}: did NOT fire (check ${own} stayed green; ${failures} failures in ${[...caught].join(', ') || 'none'}). This control proves nothing as the code stands.`);
    process.exit(0);
  }
  if (failures) { console.error(`${name}: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
  console.log(`${name}: ${copy.green}`);
  process.exit(0);
}
