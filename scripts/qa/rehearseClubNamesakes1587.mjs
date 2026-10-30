/* Round 1587: the record migration and the applied form, run for real in an embedded Postgres (PGlite), never against
 * production. Tables are typed as pzzad-resync/P1_footle.sql declares player_market_values (varchar text, integer
 * year and age, bigint id and value) and as types.ts lists soccer_player_club_stints.
 *   A  PARITY: the guard recipe computed by Postgres equals the export's h on every Q2 and Q3 row (the lead computed h
 *      in node and proved the file fingerprints against Postgres's own aggregate; this proves the recipe itself).
 *   B  THE RECORD on a fresh load: exactly the payload rows change, only their club, each to its payload club; every
 *      other row, including the decoys a name keyed or club keyed bug would hit, is byte for byte unchanged (critic
 *      advice 19); a second run changes nothing and counts every row already current.
 *   C  THE APPLIED FORM on a fresh load: the same, and its second run raises nothing and changes nothing.
 *   D  THE CACHE PURGE (review 1587 major 2): a made up ai_validation_cache (scripts/lib/arsenalCacheFixture1587.mjs) is
 *      read with the lead's own Q6 text (scripts/qa/clubNamesakes1584CacheRead.sql), genArsenalCachePurge1587.mjs is
 *      run on it as the lead runs it, and its form removes exactly the Build Your XI and Connect 4 yeses of the sarandi
 *      man and nothing else; a second run raises and removes nothing.
 * Outside rows loaded beside Q2 and Q3: every Q3c stint not in Q3 (the Sarandí men's other clubs, Arsenal Tula, Kyiv),
 * and per sarandi man two decoy market rows: one at CA Lanús and one at "Arsenal FC" in 1999 with an id outside Q2.
 * Controls, REHEARSE_CONTROL=<name>; FIRED only when applied and a check went red (exit 1), else DID NOT FIRE (exit 3):
 *   parity   one Q2 row's market value raised by 1 in PGlite only: the recipe no longer equals its h, A is red.
 *   tamper   one character of the applied form's payload changed after its checksum: it raises, nothing written, C red.
 *   drift    one payload row's position edited in the table first: the applied form raises and writes nothing, the
 *            record rewrites the rest and leaves that row, and both say 1 drifted: B and C are red.
 *   noguard  the drift edit, and the guard stripped from the record's market update: the edited row is overwritten, B red.
 *   cachedrift  one cached yes the purge targets edited after the Q6 read: the purge raises and removes nothing, D red.
 * PGlite is not a dependency of this repo: npm install --prefix /tmp/pgl @electric-sql/pglite, then
 *   PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseClubNamesakes1587.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SQL_MARKET_HASH, SQL_STINT_HASH } from '../lib/arsenalGuard1587.mjs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { cacheFixture } from '../lib/arsenalCacheFixture1587.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTROLS = ['parity', 'tamper', 'drift', 'noguard', 'cachedrift'];
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
const json = p => JSON.parse(read(p));
const DATA = 'scripts/data/clubNamesakes1584';
const Q2 = json(`${DATA}/arsenalMarket-2026-10-29.json`);
const Q3 = json(`${DATA}/arsenalStints-2026-10-29.json`);
const Q3C = json(`${DATA}/stintsArsenalMen-2026-10-29.json`);
const LEDGER = json(`${DATA}/arsenalLedger.json`);
const RECORD = read('supabase/migrations/20261101120000_round_1587_arsenal_de_sarandi.sql');
let APPLIED = read('scripts/qa/clubNamesakes1587Applied.sql');
const payloadOf = sql => JSON.parse(/payload text := '(.*)';/.exec(sql)[1].replace(/''/g, "'"));
const PAYLOAD = payloadOf(APPLIED);
const N = PAYLOAD.market.length, M = PAYLOAD.stints.length;

const q3ids = new Set(Q3.map(r => r.id));
const outsideStints = Q3C.filter(r => !q3ids.has(r.id));
const sarMen = LEDGER.men.filter(m => m.verdict === 'sarandi');
const q2ById = new Map(Q2.map(r => [r.id, r]));
const decoys = sarMen.flatMap(m => {
  const r = q2ById.get(m.rows[0]);
  return [{ ...r, id: 900000000 + r.id, club: 'CA Lanús' }, { ...r, id: 910000000 + r.id, club: 'Arsenal FC', year: 1999 }];
});
const marketRows = Q2.concat(decoys), stintRows = Q3.concat(outsideStints);

async function fresh() {
  const db = new PGlite();
  await db.exec(`create table public.player_market_values (id bigint primary key, player_name varchar, position varchar,
      age integer, nationality varchar, club varchar, market_value_usd bigint, matches integer, year integer,
      person_key text, name_folded text);
    create table public.soccer_player_club_stints (id bigint primary key, player_name text, name_folded text, club text,
      first_year integer, last_year integer, seasons integer, debut_year integer, debut_age integer, nationality text,
      position text, person_key text);`);
  await db.query(`insert into public.player_market_values select * from jsonb_populate_recordset(null::public.player_market_values, $1::jsonb)`, [JSON.stringify(marketRows)]);
  await db.query(`insert into public.soccer_player_club_stints select * from jsonb_populate_recordset(null::public.soccer_player_club_stints, $1::jsonb)`, [JSON.stringify(stintRows)]);
  return db;
}
const snapshot = async db => {
  const m = (await db.query('select id, club, md5(t::text) as full, md5(row(id, player_name, position, age, nationality, market_value_usd, matches, year, person_key, name_folded)::text) as rest from public.player_market_values t')).rows;
  const s = (await db.query('select id, club, md5(t::text) as full, md5(row(id, player_name, name_folded, first_year, last_year, seasons, debut_year, debut_age, nationality, position, person_key)::text) as rest from public.soccer_player_club_stints t')).rows;
  return { m: new Map(m.map(r => [Number(r.id), r])), s: new Map(s.map(r => [Number(r.id), r])) };
};
const run = async (db, sql) => {
  const notices = [];
  try {
    const res = await db.exec(sql, { onNotice: n => notices.push(n.message) });
    const m = /Round 1587: [^"\\]*missing/.exec(notices.join(' | ') || JSON.stringify(res));
    return { notice: m ? m[0] : '', raised: '' };
  } catch (e) { return { notice: '', raised: String(e.message || e) }; }
};
const pm = new Map(PAYLOAD.market.map(p => [p.id, p])), ps = new Map(PAYLOAD.stints.map(p => [p.id, p]));
const DRIFT_ID = PAYLOAD.market[0].id;
const drifting = CONTROL === 'drift' || CONTROL === 'noguard';
const editDrift = async db => { await db.query("update public.player_market_values set position = position || ' (edited)' where id = $1", [DRIFT_ID]); };
/* every payload row reads its new club and kept every other column; every other row is byte for byte what it was */
function compare(before, after, what) {
  const bad = [];
  for (const [tbl, pay] of [['m', pm], ['s', ps]]) {
    let wrongClub = 0, otherCols = 0, outside = 0;
    for (const [id, b] of before[tbl]) {
      const a = after[tbl].get(id), p = pay.get(id);
      if (p && !(drifting && tbl === 'm' && id === DRIFT_ID)) { if (a.club !== p.new) wrongClub += 1; if (a.rest !== b.rest) otherCols += 1; }
      else if (!p && a.full !== b.full) outside += 1;
    }
    if (wrongClub || otherCols || outside) bad.push(`${tbl === 'm' ? 'market' : 'stints'}: ${wrongClub} payload rows without their new club, ${otherCols} with another column changed, ${outside} rows outside the payload changed`);
  }
  if (!bad.length) ok(`${what}: the ${N} market and ${M} stint payload rows read their new club with every other column kept; the other ${before.m.size - N} market and ${before.s.size - M} stint rows (decoys included) are unchanged`);
  else fail(`${what}: ${bad.join('; ')}`);
}
const unchanged = (before, after, what) => {
  const diff = [...before.m].filter(([id, b]) => after.m.get(id).full !== b.full).length + [...before.s].filter(([id, b]) => after.s.get(id).full !== b.full).length;
  if (!diff) ok(`${what}: nothing changed`); else fail(`${what}: ${diff} rows changed`);
};
const keptDrift = async (db, what) => {
  if (!drifting) return;
  const r = (await db.query('select club from public.player_market_values where id = $1', [DRIFT_ID])).rows[0];
  if (r.club === pm.get(DRIFT_ID).old) ok(`${what}: the row edited after the read (id ${DRIFT_ID}) kept its old club`);
  else fail(`${what}: the row edited after the read (id ${DRIFT_ID}) was overwritten to ${r.club}`);
};

/* ---------------------------------------------------------------- A */
console.log('A) Postgres computes every export row\'s guard hash exactly as the export carries it');
{
  const db = await fresh();
  if (CONTROL === 'parity') {
    await db.query('update public.player_market_values set market_value_usd = market_value_usd + 1 where id = $1', [Q2[0].id]);
    fired.push(`parity: ${Q2[0].player_name} (id ${Q2[0].id}) worth 1 more in PGlite only`);
  }
  const mh = new Map((await db.query(`select id, ${SQL_MARKET_HASH('t', 't.club')} as h from public.player_market_values t where id < 900000000`)).rows.map(r => [Number(r.id), r.h]));
  const sh = new Map((await db.query(`select id, ${SQL_STINT_HASH('t', 't.club')} as h from public.soccer_player_club_stints t`)).rows.map(r => [Number(r.id), r.h]));
  const badM = Q2.filter(r => mh.get(r.id) !== r.h).length, badS = Q3.filter(r => sh.get(r.id) !== r.h).length;
  if (!badM && !badS) ok(`all ${Q2.length} Q2 and ${Q3.length} Q3 hashes recompute equal in Postgres (${marketRows.length} market and ${stintRows.length} stint rows loaded)`);
  else fail(`${badM} Q2 and ${badS} Q3 rows whose Postgres recipe differs from the export's h`);
  await db.close();
}

/* ---------------------------------------------------------------- B */
console.log('B) the record migration rewrites exactly the payload, and a second run is a no op');
{
  const db = await fresh();
  let record = RECORD;
  if (drifting) await editDrift(db);
  if (CONTROL === 'noguard') {
    const guard = ` and ${SQL_MARKET_HASH('t', 't.club')} = p.h;`;
    if (record.split(guard).length !== 2) abort('the market update guard is not in the record once');
    record = record.replace(guard, ';');
    fired.push('noguard: the record\'s market update guard stripped, with a row edited after the read');
  } else if (CONTROL === 'drift') fired.push(`drift: id ${DRIFT_ID}'s position edited before the run`);
  const before = await snapshot(db);
  const r1 = await run(db, record);
  const want = `Round 1587: ${N} market rows and ${M} stint rows rewritten, 0 already current, 0 drifted, 0 missing`;
  if (!r1.raised && (r1.notice === want || !r1.notice)) ok(`the record ran without raising${r1.notice ? ` ("${r1.notice}")` : ' (no notice captured; the rows below are the proof)'}`);
  else fail(`the record: ${r1.raised || r1.notice}`);
  const after = await snapshot(db);
  compare(before, after, 'the record');
  await keptDrift(db, 'the record');
  const r2 = await run(db, record);
  const again = await snapshot(db);
  unchanged(after, again, `the record's second run${r2.notice ? ` ("${r2.notice}")` : ''}${r2.raised ? ' RAISED ' + r2.raised : ''}`);
  await db.close();
}

/* ---------------------------------------------------------------- C */
console.log('C) the applied form rewrites exactly the payload or nothing, and a second run is a no op');
{
  const db = await fresh();
  if (drifting) await editDrift(db);
  if (CONTROL === 'tamper') {
    const from = `"new":"Arsenal de Sarandí"`;
    if (!APPLIED.includes(from)) abort('the payload carries no new club to tamper with');
    APPLIED = APPLIED.replace(from, `"new":"Arsenal de Sarandi"`);
    fired.push('tamper: one payload club changed after its checksum');
  }
  const before = await snapshot(db);
  const r1 = await run(db, APPLIED);
  if (!r1.raised) ok(`the applied form ran without raising${r1.notice ? ` ("${r1.notice}")` : ''}`);
  else fail(`the applied form raised: ${r1.raised.slice(0, 160)}`);
  const after = await snapshot(db);
  if (r1.raised) unchanged(before, after, 'after its raise'); else compare(before, after, 'the applied form');
  if (!r1.raised) {
    const r2 = await run(db, APPLIED);
    const again = await snapshot(db);
    if (r2.raised) fail(`the second run raised: ${r2.raised.slice(0, 120)}`);
    unchanged(after, again, `the applied form's second run${r2.notice ? ` ("${r2.notice}")` : ''}`);
  }
  await db.close();
}

/* ---------------------------------------------------------------- D (review 1587 major 2) */
console.log('D) the Build Your XI and Soccer Connect 4 cache purge, from Q6 as the lead reads it, removes exactly its rows or nothing');
{
  const fx = cacheFixture(LEDGER, Q2);
  if (!fx) fail('D: the ledger has no two word sarandi and london man to build the made up cache from');
  else {
    const db = new PGlite();
    await db.exec(`create table public.ai_validation_cache (game text not null, cache_key text not null, verdict jsonb not null,
      created_at timestamptz not null default now(), primary key (game, cache_key))`);
    for (const r of fx.rows) await db.query('insert into public.ai_validation_cache (game, cache_key, verdict) values ($1, $2, $3::jsonb)', [r.game, r.cache_key, JSON.stringify(r.verdict)]);
    const q6 = (await db.query(read('scripts/qa/clubNamesakes1584CacheRead.sql').trim().replace(/;$/, ''))).rows;
    const T = fs.mkdtempSync(path.join(os.tmpdir(), 'r1587-purge-'));
    fs.writeFileSync(path.join(T, 'q6.json'), JSON.stringify(q6));
    const gen = spawnSync(process.execPath, [path.join(ROOT, 'scripts/qa/genArsenalCachePurge1587.mjs'), '--cache', path.join(T, 'q6.json'), '--out', path.join(T, 'purge.sql')], { encoding: 'utf8' });
    const toDelete = fx.rows.filter(r => r.want === 'delete').map(r => `${r.game}|${r.cache_key}`).sort();
    if (gen.status !== 0) fail(`D: the generator exited ${gen.status}: ${(gen.stderr || '').trim().slice(0, 200)}`);
    else {
      const said = gen.stdout.split('\n').filter(l => l.startsWith('  delete: ')).map(l => l.slice(10).replace(' ', '|')).sort();
      const heldSaid = gen.stdout.split('\n').filter(l => l.includes('HELD')).length;
      if (JSON.stringify(said) === JSON.stringify(toDelete) && heldSaid === fx.rows.filter(r => r.want === 'held').length) ok(`D: from the ${q6.length} rows Q6 reads, the generator lists the ${toDelete.length} yeses of ${fx.S} and holds the last name only key`);
      else fail(`D: the generator lists ${said.length} to delete (${said.join('; ')}) and ${heldSaid} held`);
      const form = fs.readFileSync(path.join(T, 'purge.sql'), 'utf8');
      if (CONTROL === 'cachedrift') {
        const [g, ...k] = toDelete[0].split('|');
        const r = await db.query("update public.ai_validation_cache set verdict = verdict || '{\"note\":\"edited after the read\"}'::jsonb where game = $1 and cache_key = $2", [g, k.join('|')]);
        if (r.affectedRows !== 1) abort('the first target row is not in the table');
        fired.push(`cachedrift: ${toDelete[0]} edited after the Q6 read`);
      }
      const snap = async () => new Map((await db.query("select game || '|' || cache_key as k, md5(concat_ws('|', game, cache_key, verdict::text)) as h from public.ai_validation_cache")).rows.map(r => [r.k, r.h]));
      const before = await snap();
      let raised = '';
      try { await db.exec(form); } catch (e) { raised = String(e.message || e); }
      const after = await snap();
      const removed = [...before.keys()].filter(k => !after.has(k)).sort();
      const changed = [...after.keys()].filter(k => before.get(k) !== after.get(k));
      if (!raised && JSON.stringify(removed) === JSON.stringify(toDelete)) ok(`D: the form ran and removed exactly the ${removed.length} yeses (Build Your XI, the Connect 4 pair and its fact)`);
      else fail(`D: the form ${raised ? 'raised (' + raised.slice(0, 90) + ')' : 'ran'} and removed ${removed.length} rows: ${removed.join('; ') || 'none'}`);
      if (!changed.length && (removed.length === 0 || removed.length === toDelete.length)) ok(`D: all or nothing (${removed.length} of ${toDelete.length}), and every row left is byte for byte as it was`);
      else fail(`D: ${changed.length} rows left changed, ${removed.length} of ${toDelete.length} removed`);
      if (!raised && removed.length) {
        let again = '';
        try { await db.exec(form); } catch (e) { again = String(e.message || e); }
        const third = await snap();
        if (new RegExp(`0 of ${toDelete.length} rows still match`).test(again) && third.size === after.size) ok(`D: a second run raises (0 of ${toDelete.length} still match) and removes nothing`);
        else fail(`D: a second run ${again ? 'raised: ' + again.slice(0, 90) : 'did not raise'}, or changed the table`);
      }
    }
    await db.close();
  }
}

console.log('');
if (CONTROL) {
  if (!fired.length) { console.log(`control ${CONTROL} DID NOT FIRE: nothing changed`); process.exit(3); }
  if (!failures) { console.log(`control ${CONTROL} DID NOT FIRE: applied (${fired.join('; ')}) but every check stayed green`); process.exit(3); }
  console.log(`control ${CONTROL} FIRED: applied (${fired.join('; ')}) and ${failures} check(s) went red`);
}
if (failures) { console.log(`rehearseClubNamesakes1587: ${failures} finding(s).`); process.exit(1); }
/* review 1587 minor 2: the club named here is read off the payload, never typed (simClubNamesakes section M ties it to
   the grid's exclusion list) */
const writtenClubs = [...new Set(PAYLOAD.market.concat(PAYLOAD.stints).flatMap(p => p.new.split(' / ').filter((x, i) => p.old.split(' / ')[i] === 'Arsenal FC')))];
console.log(`rehearseClubNamesakes1587: green. Both forms move exactly the ${N} market rows and ${M} stints to ${writtenClubs.join(', ')} and nothing else, and a second run changes nothing.`);
