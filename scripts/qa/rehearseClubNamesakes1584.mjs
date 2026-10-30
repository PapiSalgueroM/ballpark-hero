/* Round 1584: the two pieces of SQL this round hands the lead, run for real in an embedded Postgres (PGlite), never
   against the live project.

   A, THE DETECTION. scripts/qa/clubNamesakes1584Detect.sql runs word for word over the detection fixture
      (scripts/data/clubNamesakes1584/detectFixture.json) loaded as public.player_market_values, and its rows must
      equal what scripts/lib/clubNamesakeDetect.mjs returns on the same rows: same signals, clubs, years, counts,
      ranks, blocs, the percentile_cont quartiles and medians, and the same names (as a set: the SQL's order among
      equal values is not defined). So the JS twin that section D of simClubNamesakes trusts is the lead's Q1.
   A2, THE CLAUSES THE FIXTURE CANNOT REACH. The fixture has no row without a nationality and no split season row, so
      the same comparison runs again with synthetic rows added to the PGlite table only: one FC Barcelona 2011 row
      with no nationality (S1 Arsenal FC 2011 must drop, margin 5 to 4) and twelve rows of one split season club in
      2005 holding a cheap bloc (flagged under a plain name, left out as a split). Each is asserted to move the JS
      result first, so the comparison is known to reach both clauses.
   B, THE CACHE PURGE. A synthetic ai_validation_cache (two Tula men's Arsenal yeses, one with the label as the
      column; a refusal; a London man's yes; a Tula man's yes for another club; the same key under Soccer Connect 4;
      a surname only key) is read with the exact Q6 text, scripts/qa/genClubNamesakePurge1584.mjs writes the form from
      that read and the committed Q3c, and the form runs: exactly the two yeses go, every other row is byte for byte
      as it was, every removed row still matched the hash Q6 read, and a second run raises and changes nothing.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseClubNamesakes1584.mjs
   Negative controls, REHEARSE_CONTROL=<name>, each must exit 1 and print FIRED (applied and a check went red); one
   that cannot find what it changes exits 2 (ABORTED); one applied with every check green exits 3 (DID NOT FIRE):
     sql14    Q1's S1 sized from the nationality rows only (critic advice 14 reverted): A2 must disagree.
     sqlsplit Q1's split season exclusion dropped: A2 must disagree.
     parity   the top value of Arsenal FC's 2010 Argentine bloc raised above the rest's quartile in the PGlite table
              only (critic 22): the SQL drops that row and the JS does not, so A must disagree.
     tamper   one character of the purge payload changed after its checksum: the form raises, nothing is removed.
     drift    one target row's verdict edited in the table after the Q6 read: the form raises, nothing is removed.
     noguard  the drift edit with the per row hash guard stripped from the form: the edited row is removed, and the
              check that every removed row still matched its read must catch it.
   It is not named sim*: the suite runner must not pick up a script that needs a package the repo does not carry. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detectNamesakes } from '../lib/clubNamesakeDetect.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROLS = ['parity', 'tamper', 'drift', 'noguard', 'sql14', 'sqlsplit'];
const CONTROL = process.env.REHEARSE_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`REHEARSE_CONTROL=${CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
const dir = process.env.PGLITE_DIR;
if (!dir) { console.error('PGLITE_DIR is not set: see the header of this file. Nothing was run.'); process.exit(2); }
const entry = path.join(dir, 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js');
if (!fs.existsSync(entry)) { console.error(`no PGlite at ${entry}. Nothing was run.`); process.exit(2); }
const { PGlite } = await import(pathToFileURL(entry).href);

const abort = m => { console.error(`control ${CONTROL}: ${m}, ABORTED`); process.exit(2); };
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const fired = [];
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const DATA = 'scripts/data/clubNamesakes1584';

/* Q1's text, with the two clause controls applied to it before either pass reads it */
let SQL = read('scripts/qa/clubNamesakes1584Detect.sql').trim().replace(/;$/, '');
const SQL_EDITS = {
  sql14: ['count(*)::int as n_all from base_all group by club, year', 'count(*)::int as n_all from base group by club, year',
    'S1 sized from the nationality rows only (critic advice 14 reverted)'],
  sqlsplit: [" and strpos(club, ' / ') = 0", '', 'the split season exclusion dropped from Q1'],
};
if (SQL_EDITS[CONTROL]) {
  const [from, to, what] = SQL_EDITS[CONTROL];
  if (SQL.split(from).length !== 2) abort(`the clause "${from.trim()}" is not in Q1 once`);
  SQL = SQL.replace(from, to);
  fired.push(`${CONTROL}: ${what}`);
}
const loadMarket = async rows => {
  const db = new PGlite();
  await db.exec(`create table public.player_market_values (id bigint primary key, player_name text, club text,
    year integer, nationality text, market_value_usd bigint)`);
  await db.query(`insert into public.player_market_values (id, player_name, club, year, nationality, market_value_usd)
    select id, player_name, club, year, nationality, market_value_usd from jsonb_to_recordset($1::jsonb)
    as x(id bigint, player_name text, club text, year integer, nationality text, market_value_usd bigint)`, [JSON.stringify(rows)]);
  return db;
};
const num = v => (v == null ? null : Number(v));
const shape = d => JSON.stringify({
  signal: d.signal, club: d.club, year: num(d.year), n: num(d.n), size_rank: num(d.size_rank), nat: d.nat ?? null,
  k: num(d.k), bloc_max: num(d.bloc_max), bloc_med: num(d.bloc_med), rest_q1: num(d.rest_q1), rest_med: num(d.rest_med),
  names: d.names == null ? null : (Array.isArray(d.names) ? d.names : String(d.names).split(', ')).slice().sort(),
});
const parity = (sqlRows, jsRows, what) => {
  const a = sqlRows.map(shape).sort(), b = jsRows.map(shape).sort();
  const onlySql = a.filter(x => !b.includes(x)), onlyJs = b.filter(x => !a.includes(x));
  if (!onlySql.length && !onlyJs.length) ok(`${what}: the SQL and the JS twin agree on all ${a.length} rows (${a.filter(x => x.includes('"S2"')).length} S2, ${a.filter(x => x.includes('"S1"')).length} S1)`);
  else fail(`${what}: the SQL returns ${a.length} rows and the JS ${b.length}; ${onlySql.length} only in the SQL, ${onlyJs.length} only in the JS: ${(onlySql[0] || onlyJs[0]).slice(0, 160)}`);
};

/* ---------------------------------------------------------------- A */
console.log('A) the detection SQL and its JS twin return the same rows');
{
  const fx = JSON.parse(read(`${DATA}/detectFixture.json`));
  const db = await loadMarket(fx.rows);
  const n = Number((await db.query('select count(*)::int as n from public.player_market_values')).rows[0].n);
  if (n === fx.rows.length) ok(`${n} fixture rows loaded`);
  else fail(`${n} rows loaded of ${fx.rows.length}`);
  const js = detectNamesakes(fx.rows);
  if (CONTROL === 'parity') {
    const bloc = js.find(d => d.signal === 'S2' && d.club === 'Arsenal FC' && d.year === 2010 && d.nat === 'Argentina');
    if (!bloc) abort('the JS twin does not flag Arsenal FC 2010 Argentina');
    const top = fx.rows.filter(r => r.club === 'Arsenal FC' && r.year === 2010 && r.nationality === 'Argentina')
      .sort((a, b) => b.market_value_usd - a.market_value_usd)[0];
    const raised = Math.ceil((bloc.rest_q1 + 1000000) / 1000000) * 1000000;
    await db.query('update public.player_market_values set market_value_usd = $1 where id = $2', [raised, top.id]);
    fired.push(`parity: ${top.player_name} (id ${top.id}) raised from ${top.market_value_usd} to ${raised} in PGlite only, above the rest's quartile ${bloc.rest_q1}`);
  }
  parity((await db.query(SQL)).rows, js, 'the fixture');
  if (JSON.stringify(js) === JSON.stringify(fx.expected)) ok('the JS twin returns the fixture\'s committed expected list');
  else fail('the JS twin no longer returns the fixture\'s committed expected list');
  await db.close();
}

/* ---------------------------------------------------------------- A2 */
/* The fixture and the lead's pulls carry no row without a nationality and no split season row, so two clauses of Q1
   could be wrong with A green (review M2). Synthetic rows, in this PGlite table only, never in a committed fixture:
   one FC Barcelona 2011 row with no nationality (Barcelona 31 becomes 32, Arsenal FC's 36 is then 4 clear, so S1
   2011 must drop, and it drops only if S1 is sized from every row), and twelve rows of one split season club in 2005,
   a cheap bloc of three in it (they would be an S2 row of their own if the split exclusion were missing). */
console.log('A2) the two clauses the fixture cannot reach: S1 sized from every row, and split seasons left out');
{
  const fx = JSON.parse(read(`${DATA}/detectFixture.json`));
  const SPLIT = 'Synthetic FC / Other FC';
  const synth = [{ id: 900000000001, year: 2011, club: 'FC Barcelona', nationality: null, player_name: 'Synthetic No Nationality', market_value_usd: 1000000 }];
  for (let i = 0; i < 12; i += 1) synth.push({ id: 900000000100 + i, year: 2005, club: SPLIT, nationality: i < 3 ? 'Synthland' : 'Otherland',
    player_name: `Synthetic Split ${i + 1}`, market_value_usd: i < 3 ? 100000 + i * 10000 : 5000000 + i * 1000000 });
  const rows = [...fx.rows, ...synth];
  const plain = detectNamesakes(fx.rows), js = detectNamesakes(rows);
  const has = (list, s, club, year) => list.some(d => d.signal === s && d.club === club && d.year === year);
  if (has(plain, 'S1', 'Arsenal FC', 2011) && !has(js, 'S1', 'Arsenal FC', 2011)) ok('the row with no nationality takes S1 Arsenal FC 2011 off the JS list (margin 5 to 4)');
  else fail('the row with no nationality does not move S1 Arsenal FC 2011 in the JS twin, so it exercises nothing');
  const unsplit = detectNamesakes(rows.map(r => (r.club === SPLIT ? { ...r, club: 'Synthetic FC' } : r)));
  if (has(unsplit, 'S2', 'Synthetic FC', 2005) && !js.some(d => d.club === SPLIT)) ok('the twelve split rows would be an S2 row under a plain club name, and as a split season they are left out');
  else fail('the split rows do not exercise the split exclusion (no S2 row under a plain name, or flagged as a split)');
  const db = await loadMarket(rows);
  parity((await db.query(SQL)).rows, js, 'the fixture plus the synthetic rows');
  await db.close();
}

/* ---------------------------------------------------------------- B */
console.log('B) the cache purge removes exactly the stale Arsenal yeses, all or nothing');
{
  const q3c = JSON.parse(read(`${DATA}/stintsArsenalMen-2026-10-29.json`));
  const by = new Map();
  for (const r of q3c) { if (!by.has(r.name_folded)) by.set(r.name_folded, []); by.get(r.name_folded).push(r); }
  /* two men of the table who only ever played at Arsenal Tula (first two by name, two word names), and London's Saka */
  const tula = [...by].filter(([n, rs]) => n.includes(' ') && rs.every(r => r.club === 'Arsenal Tula')).map(([n]) => n).sort();
  if (tula.length < 2 || !by.has('bukayo saka')) { console.error('the committed Q3c no longer holds two Tula only men and Bukayo Saka. Nothing was run.'); process.exit(2); }
  const [A, B] = tula;
  const yes = JSON.stringify({ valid: true, reason: 'Verified from career records.' });
  const no = JSON.stringify({ valid: false, reason: 'Checked against career records.' });
  const rows = [
    ['soccer-grid', `${A}|played for arsenal|russia`, yes, 'delete'],
    ['soccer-grid', `${B}|russia|played for arsenal`, yes, 'delete'],
    ['soccer-grid', `${A}|played for arsenal|played for zenit`, no, 'keep: a refusal'],
    ['soccer-grid', 'bukayo saka|played for arsenal|england', yes, 'keep: London'],
    ['soccer-grid', `${A}|played for zenit|russia`, yes, 'keep: another club'],
    ['football-connect4', `${A}|played for arsenal|russia`, yes, 'keep: another game'],
    ['soccer-grid', `${A.split(' ').pop()}|played for arsenal|russia`, yes, 'keep: a surname only key, held'],
  ];
  const db = new PGlite();
  await db.exec(`create table public.ai_validation_cache (game text not null, cache_key text not null, verdict jsonb not null,
    created_at timestamptz not null default now(), primary key (game, cache_key))`);
  for (const [g, k, v] of rows) await db.query('insert into public.ai_validation_cache (game, cache_key, verdict) values ($1, $2, $3::jsonb)', [g, k, v]);
  const q6 = (await db.query(read('scripts/qa/clubNamesakes1584CacheRead.sql').trim().replace(/;$/, ''))).rows;
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'r1584-purge-'));
  fs.writeFileSync(path.join(T, 'q6.json'), JSON.stringify(q6));
  const gen = spawnSync(process.execPath, [path.join(ROOT, 'scripts/qa/genClubNamesakePurge1584.mjs'), '--stints', path.join(ROOT, DATA, 'stintsArsenalMen-2026-10-29.json'),
    '--cache', path.join(T, 'q6.json'), '--out', path.join(T, 'purge.sql')], { encoding: 'utf8' });
  if (gen.status !== 0) { fail(`the generator exited ${gen.status}: ${(gen.stderr || '').trim().slice(0, 200)}`); }
  else {
    const toDelete = rows.filter(r => r[3] === 'delete').map(r => r[1]);
    const said = gen.stdout.split('\n').filter(l => l.startsWith('  delete: ')).map(l => l.slice(10)).sort();
    const heldSaid = gen.stdout.split('\n').filter(l => l.includes('HELD')).length;
    if (JSON.stringify(said) === JSON.stringify(toDelete.slice().sort()) && heldSaid === 1) ok(`the generator lists the ${toDelete.length} stale yeses and holds the surname only key`);
    else fail(`the generator lists ${said.length} to delete (${said.join('; ')}) and ${heldSaid} held`);
    let form = fs.readFileSync(path.join(T, 'purge.sql'), 'utf8');
    const GUARD = "      and md5(concat_ws('|', c.game, c.cache_key, c.verdict::text)) = p.h\n";
    if (CONTROL === 'tamper') {
      const at = form.indexOf('"game":"soccer-grid"');
      if (at < 0) abort('the payload carries no soccer-grid row');
      form = form.slice(0, at) + '"game":"soccer-grjd"' + form.slice(at + 20);
      fired.push('tamper: one payload character changed after its checksum');
    }
    if (CONTROL === 'drift' || CONTROL === 'noguard') {
      const r = await db.query("update public.ai_validation_cache set verdict = verdict || '{\"note\":\"edited after the read\"}'::jsonb where game = 'soccer-grid' and cache_key = $1", [toDelete[0]]);
      if (r.affectedRows !== 1) abort('the first target row is not in the table');
      fired.push(`${CONTROL}: ${toDelete[0]} edited after the Q6 read`);
    }
    if (CONTROL === 'noguard') {
      if (form.split(GUARD).length !== 2) abort('the hash guard is not in the form once');
      form = form.replace(GUARD, '');
      fired.push('noguard: the per row hash guard stripped from the form');
    }
    const snap = async () => new Map((await db.query("select game || '|' || cache_key as k, md5(concat_ws('|', game, cache_key, verdict::text)) as h from public.ai_validation_cache")).rows.map(r => [r.k, r.h]));
    const before = await snap();
    let notice = '', raised = '';
    try {
      const res = await db.exec(form);
      notice = JSON.stringify(res).match(/Round 1584: \d+ cached verdicts removed/)?.[0] ?? '';
    } catch (e) { raised = String(e.message || e); }
    const after = await snap();
    const removed = [...before.keys()].filter(k => !after.has(k));
    const changed = [...after.keys()].filter(k => before.get(k) !== after.get(k));
    const readHash = new Map(q6.map(r => [`${r.game}|${r.cache_key}`, r.h]));
    if (!raised && removed.length === toDelete.length && toDelete.every(k => removed.includes(`soccer-grid|${k}`))) ok(`the form ran and removed exactly the ${removed.length} stale yeses${notice ? ` ("${notice}")` : ''}`);
    else fail(`the form ${raised ? 'raised (' + raised.slice(0, 90) + ')' : 'ran'} and removed ${removed.length} rows: ${removed.join('; ') || 'none'}`);
    if (!changed.length) ok('every row left in the table is byte for byte as it was');
    else fail(`${changed.length} rows left in the table changed`);
    const stale = removed.filter(k => readHash.get(k) !== before.get(k));
    if (!stale.length) ok('every removed row still matched the hash Q6 read');
    else fail(`removed although it no longer matched its read: ${stale.join('; ')}`);
    if (removed.length === 0 || removed.length === toDelete.length) ok(`all or nothing: ${removed.length} of ${toDelete.length}`);
    else fail(`a partial purge: ${removed.length} of ${toDelete.length}`);
    if (!raised && removed.length) {
      let again = '';
      try { await db.exec(form); } catch (e) { again = String(e.message || e); }
      const third = await snap();
      if (new RegExp(`0 of ${toDelete.length} rows still match`).test(again) && third.size === after.size && [...third].every(([k, h]) => after.get(k) === h)) ok(`a second run raises (0 of ${toDelete.length} still match) and changes nothing`);
      else fail(`a second run ${again ? 'raised: ' + again.slice(0, 90) : 'did not raise'}, or changed the table`);
    }
  }
  await db.close();
}

console.log('');
/* FIRED only when applied AND a check went red; applied with every check green exits 3 and never prints green */
if (CONTROL) {
  if (!fired.length) { console.log(`control ${CONTROL} DID NOT FIRE: nothing changed`); process.exit(3); }
  if (!failures) { console.log(`control ${CONTROL} DID NOT FIRE: applied (${fired.join('; ')}) but every check stayed green`); process.exit(3); }
  console.log(`control ${CONTROL} FIRED: applied (${fired.join('; ')}) and ${failures} check(s) went red`);
}
if (failures) { console.log(`rehearseClubNamesakes1584: ${failures} finding(s).`); process.exit(1); }
console.log('rehearseClubNamesakes1584: green. Q1 and its JS twin agree in Postgres, and the purge form removes exactly the stale Arsenal yeses or nothing.');
