/**
 * Round 827 harness: every value the career rows migration writes traces to a
 * record row with two sources, and every record row reaches the migration and
 * the baked pool.
 *
 * WHAT WAS WRONG. Round 784 fixed the first clubs of 25 players and listed what
 * it left: Griezmann's 2009-10 read 10 apps 2 goals (both sources: 40 and 6),
 * Haaland's whole Salzburg spell sat on 2018-19 with no 2019-20 row, De
 * Bruyne's Chelsea row said 2012-13 (he played there in 2013-14) and his
 * Wolfsburg 2013-14 row carried most of his 2014-15 league line, and Kane's
 * three loans were missing while his 2012-13 Tottenham row carried the Leicester
 * numbers. scripts/data/careerRowsVerified2026-10.json is the record of every
 * correction with its sources, scripts/genCareerRowsVerified.mjs writes the
 * migration and the baked pool from it, and this fence holds the three together.
 *
 * WHAT IT HOLDS:
 *   1. THE RECORD. Every changed value and every added season names at least two
 *      sources, each with a link and a read date that is not in the future, and
 *      at least two of them give exactly the value written. A value moved to
 *      null (assists only) says why, and no two of its sources agree on a number.
 *      An added season carries assists null and market value 0 (shown n/a). A row
 *      kept as it is has two sources that disagree, each with a link, keeps one of
 *      their values and names the third sources tried. Every row the record
 *      rewrites says what happens to its assists: a recorded change, or an
 *      assistsKept entry whose source gives exactly the kept number and none a
 *      different one (the adversarial review found De Bruyne's Werder row rewritten
 *      while keeping 10 assists both quoted sources put at 9). No long dash
 *      anywhere in the record.
 *   2. THE MIGRATION AGAINST THE RECORD. The career writes are parsed out of the
 *      SQL file: every field a write changes, other than the sort order, is a
 *      record change (player id, season, club, field, from, to) or a recorded
 *      added season, every record row is written exactly once, the sort orders
 *      run 0 to n-1 in the record's path order, the after state the migration
 *      asserts is exactly the writes applied, every assistsKept number is the one
 *      the after state asserts, and the row counts it guards add up.
 *   3. THE BAKED POOL. src/data/careerPlayers.ts is the pool the record ends in
 *      (every to value, every added row, every recorded path), and each touched
 *      player's rows there are the rows the migration's after state asserts.
 *   4. THE LIVE TABLES. Either the state the record starts from (the migration is
 *      PENDING, printed loudly) or the state it ends in. Anything between fails.
 *      CAREER_ROWS_LOCAL_ONLY=1 skips this LOUDLY.
 *
 * NEGATIVE CONTROLS (CAREER_ROWS_CONTROL), each refusing to run when its target
 * is missing:
 *   onesource  leaves Griezmann's 2009-10 appearances with one source (section 1)
 *   assists    drops the Werder Bremen assists change from the record (section 1)
 *   untraced   writes Kane's Millwall goals as 10 in the parsed migration (section 2)
 *   dropped    drops the Werder Bremen write from the parsed migration (section 2)
 *   file       writes Haaland's 2019-20 Salzburg goals as 27 in the file text (section 3)
 *   mixed      flips Griezmann's 2009-10 appearances in the live read, so the
 *              tables are half way between the two states (section 4)
 *
 * Run: node scripts/simCareerRowsVerified.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { OUT_FILE, fetchLiveCareerPlayers, supabaseFromClientTs } from './bakeCareerPlayers.mjs';
import { MIGRATION_FILE, afterProblems, loadRecord, parseAfterRows, parseCareerWrites, parseCountGuards, recordState } from './genCareerRowsVerified.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CAREER_ROWS_CONTROL || '';
const LOCAL_ONLY = process.env.CAREER_ROWS_LOCAL_ONLY === '1';
const CONTROLS = { onesource: 1, assists: 1, untraced: 2, dropped: 2, file: 3, mixed: 4 };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`CAREER_ROWS_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
if (CONTROL === 'mixed' && LOCAL_ONLY) { console.error('mixed control cannot run with CAREER_ROWS_LOCAL_ONLY=1: section 4 is the one it plants'); process.exit(1); }

let failures = 0;
const failedSections = new Set();
let section = 0;
const fail = m => { failures += 1; failedSections.add(section); if (failures <= 30) console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const today = new Date().toISOString().slice(0, 10);
const FIELDS = ['season', 'club', 'goals', 'assists', 'appearances', 'marketValue'];
const rowKey = (player, season, club) => `${player}|${season}|${club}`;

const record = loadRecord(ROOT);
const recordText = fs.readFileSync(path.join(ROOT, 'scripts/data/careerRowsVerified2026-10.json'), 'utf8');
const sql = fs.readFileSync(path.join(ROOT, MIGRATION_FILE), 'utf8');
let fileText = fs.readFileSync(path.join(ROOT, OUT_FILE), 'utf8').replaceAll('\r\n', '\n');

if (CONTROL === 'onesource') {
  const c = record.changed.find(x => x.player === 'Antoine Griezmann' && x.field === 'appearances');
  if (!c || c.sources.length < 2) abort('onesource control cannot run: Griezmann 2009-10 appearances is not recorded with two sources');
  c.sources = c.sources.slice(0, 1);
  console.log('   NEGATIVE CONTROL ON: Griezmann 2009-10 appearances keeps one source');
}
if (CONTROL === 'assists') {
  const i = record.changed.findIndex(x => x.player === 'Kevin De Bruyne' && x.club === 'Werder Bremen' && x.field === 'assists');
  if (i < 0) abort('assists control cannot run: the record does not change the Werder Bremen assists');
  record.changed.splice(i, 1);
  console.log('   NEGATIVE CONTROL ON: the Werder Bremen assists change is dropped from the record');
}

console.log('1) the record: two sources for every value written, a reason for every n/a, a third tried for every row kept');
section = 1;
{
  const sourceOk = (s, where) => {
    if (!s || typeof s.name !== 'string' || !s.name) { fail(`${where}: a source without a name`); return false; }
    if (!/^https:\/\//.test(s.url ?? '')) { fail(`${where}: ${s.name} has no https link`); return false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.read ?? '') || s.read > today) { fail(`${where}: ${s.name} has no read date, or one in the future`); return false; }
    if (typeof s.says !== 'string' || s.says.length < 8) { fail(`${where}: ${s.name} does not say what it records`); return false; }
    return true;
  };
  const ids = new Map();
  for (const c of [...record.changed, ...record.added]) {
    if (ids.has(c.player) && ids.get(c.player) !== c.playerId) fail(`${c.player} is recorded under two ids`);
    ids.set(c.player, c.playerId);
  }
  let values = 0;
  for (const c of record.changed) {
    const where = `${c.player} ${c.season} ${c.club} ${c.field}`;
    if (!FIELDS.includes(c.field)) { fail(`${where}: not a field of a season row`); continue; }
    if (c.from === c.to) fail(`${where}: from and to are the same`);
    const names = new Set(c.sources.map(s => s.name));
    if (c.sources.length < 2 || names.size !== c.sources.length) fail(`${where}: ${c.sources.length} sources (${[...names].join(', ')}), at least two distinct are needed`);
    if (c.to === null) {
      if (c.field !== 'assists') fail(`${where}: only assists may move to n/a`);
      if (typeof c.reason !== 'string' || c.reason.length < 20) fail(`${where}: moved to n/a without a reason`);
      const numbers = c.sources.map(s => s.value).filter(v => typeof v === 'number');
      if (numbers.length !== new Set(numbers).size) fail(`${where}: two sources agree on ${numbers.find((v, i) => numbers.indexOf(v) !== i)}, so the row should carry it rather than n/a`);
      for (const s of c.sources) sourceOk(s, where);
    } else {
      const agreeing = c.sources.filter(s => sourceOk(s, where) && s.value === c.to);
      if (agreeing.length < 2) fail(`${where}: ${agreeing.length} source${agreeing.length === 1 ? '' : 's'} give ${c.to}, two are needed`);
    }
    values += 1;
  }
  for (const a of record.added) {
    const where = `${a.player} ${a.season} ${a.club} (added)`;
    if (a.assists !== null) fail(`${where}: assists must be null, no second source counts them`);
    if (a.marketValue !== 0) fail(`${where}: market value must be 0 (n/a), no second source publishes one`);
    const agreeing = a.sources.filter(s => sourceOk(s, where) && s.appearances === a.appearances && s.goals === a.goals);
    if (agreeing.length < 2) fail(`${where}: ${agreeing.length} source${agreeing.length === 1 ? '' : 's'} give ${a.appearances} apps ${a.goals} goals, two are needed`);
    values += 1;
  }
  for (const k of record.keptAsIs) {
    const where = `${k.player} ${k.season} ${k.club} ${k.field} (kept)`;
    const vals = k.sources.map(s => s.value);
    if (k.sources.length < 2) fail(`${where}: fewer than two sources`);
    if (new Set(vals).size < 2) fail(`${where}: the sources agree (${vals[0]}), so this is not a disagreement to keep`);
    if (!vals.includes(k.value)) fail(`${where}: keeps ${k.value}, which no source gives`);
    if (!Array.isArray(k.thirdTried) || !k.thirdTried.length) fail(`${where}: no third source tried`);
    for (const s of k.sources) sourceOk(s, where);
    if (record.changed.some(c => c.player === k.player && c.season === k.season && c.club === k.club && c.field === k.field)) fail(`${where}: also recorded as changed`);
  }
  /* every row the record rewrites says what happens to its assists */
  const rewritten = new Map(record.changed.map(c => [rowKey(c.player, c.season, c.club), c]));
  const assistsChanged = new Set(record.changed.filter(c => c.field === 'assists').map(c => rowKey(c.player, c.season, c.club)));
  const assistsKept = new Map((record.assistsKept ?? []).map(k => [rowKey(k.player, k.season, k.club), k]));
  for (const [key, c] of rewritten) {
    const where = `${c.player} ${c.season} ${c.club}`;
    const k = assistsKept.get(key);
    if (assistsChanged.has(key) && k) fail(`${where}: assists recorded as both changed and kept`);
    else if (!assistsChanged.has(key) && !k) fail(`${where}: the record rewrites the row and says nothing about its assists (change them, or keep them under assistsKept with the source that gives them)`);
    else if (k) {
      if (k.playerId !== c.playerId) fail(`${where}: assistsKept names ${k.playerId}, the change ${c.playerId}`);
      const numbers = (k.sources ?? []).filter(s => sourceOk(s, `${where} assists kept`)).map(s => s.value).filter(v => typeof v === 'number');
      if (!Number.isInteger(k.value) || !numbers.includes(k.value)) fail(`${where}: keeps ${k.value} assists, which no linked source gives`);
      const other = numbers.find(v => v !== k.value);
      if (other !== undefined) fail(`${where}: keeps ${k.value} assists while a source gives ${other}`);
    }
  }
  for (const [key, k] of assistsKept) if (!rewritten.has(key)) fail(`${k.player} ${k.season} ${k.club}: assists kept on a row the record does not rewrite`);
  const dup = record.duplicate;
  if (!dup || dup.players?.length !== 2 || !dup.decision || !(dup.beforeRemoving066?.length >= 3)) fail('the duplicate is not recorded with both ids, a decision and what must change before a removal');
  /* the two long dashes by code point (0x2013, 0x2014), so this file carries neither */
  if ([0x2013, 0x2014].some(code => recordText.includes(String.fromCharCode(code)))) fail('the record carries a long dash');
  for (const name of Object.keys(record.paths)) if (!ids.has(name)) fail(`a path is recorded for ${name}, who has no recorded change`);
  console.log(`   ${record.changed.length} changed values and ${record.added.length} added seasons on ${ids.size} players, ${values} checked; ${record.keptAsIs.length} rows kept with the disagreement recorded; assists addressed on ${rewritten.size} rewritten rows (${assistsChanged.size} changed, ${assistsKept.size} kept)`);
}

console.log('2) the migration against the record: every value written is a record row, every record row is written');
section = 2;
const writes = parseCareerWrites(sql);
const afterRows = parseAfterRows(sql);
if (!writes || !afterRows || !writes.length || !afterRows.length) abort(`could not parse the career writes out of ${MIGRATION_FILE}`);
if (CONTROL === 'untraced') {
  const w = writes.find(x => x.player === 'Harry Kane' && x.now.club === 'Millwall');
  if (!w || w.now.goals !== 9) abort('untraced control cannot run: no Kane Millwall write with 9 goals in the migration');
  w.now = { ...w.now, goals: 10 };
  console.log('   NEGATIVE CONTROL ON: the parsed migration writes Kane\'s Millwall goals as 10');
}
if (CONTROL === 'dropped') {
  const i = writes.findIndex(x => x.player === 'Kevin De Bruyne' && x.now.club === 'Werder Bremen');
  if (i < 0) abort('dropped control cannot run: no Werder Bremen write in the migration');
  writes.splice(i, 1);
  console.log('   NEGATIVE CONTROL ON: the Werder Bremen write is dropped from the parsed migration');
}
{
  const changes = new Map(record.changed.map(c => [`${rowKey(c.playerId, c.season, c.club)}|${c.field}`, c]));
  const adds = new Map(record.added.map(a => [rowKey(a.playerId, a.season, a.club), a]));
  const seen = new Set();
  const touchedIds = new Set([...record.changed, ...record.added].map(c => c.playerId));
  for (const w of writes) {
    const where = `${w.player} ${w.now.season} ${w.now.club}`;
    if (!touchedIds.has(w.playerId)) fail(`${where}: the migration writes a player the record does not touch`);
    if (!w.rowId) {
      const a = adds.get(rowKey(w.playerId, w.now.season, w.now.club));
      if (!a) { fail(`${where}: inserted, and the record adds no such season`); continue; }
      for (const f of FIELDS) if (w.now[f] !== a[f]) fail(`${where}: inserted with ${f} ${w.now[f]}, the record adds ${a[f]}`);
      seen.add(`add|${rowKey(w.playerId, w.now.season, w.now.club)}`);
      continue;
    }
    for (const f of FIELDS) {
      if (w.old[f] === w.now[f]) continue;
      const c = changes.get(`${rowKey(w.playerId, w.now.season, w.now.club)}|${f}`);
      if (!c) { fail(`${where}: ${f} ${w.old[f]} to ${w.now[f]} traces to no record row`); continue; }
      if (c.from !== w.old[f] || c.to !== w.now[f]) fail(`${where}: ${f} ${w.old[f]} to ${w.now[f]}, the record says ${c.from} to ${c.to}`);
      seen.add(`change|${rowKey(w.playerId, w.now.season, w.now.club)}|${f}`);
    }
  }
  for (const c of record.changed) if (!seen.has(`change|${rowKey(c.playerId, c.season, c.club)}|${c.field}`)) fail(`${c.player} ${c.season} ${c.club}: the record changes ${c.field} ${c.from} to ${c.to} and the migration does not`);
  for (const a of record.added) if (!seen.has(`add|${rowKey(a.playerId, a.season, a.club)}`)) fail(`${a.player} ${a.season} ${a.club}: recorded as added and the migration does not insert it`);

  /* the after state the migration asserts: per player, sort orders 0..n-1 in the
     record's path order, and every written row exactly as written */
  const byPlayer = new Map();
  for (const r of afterRows) (byPlayer.get(r.player) ?? byPlayer.set(r.player, []).get(r.player)).push(r);
  for (const [name, order] of Object.entries(record.paths)) {
    const rows = (byPlayer.get(name) ?? []).slice().sort((x, y) => x.sortOrder - y.sortOrder);
    const got = rows.map(r => `${r.season} ${r.club}`);
    if (got.join('|') !== order.join('|')) fail(`${name}: the migration's after state runs ${got.join(', ')}; the record's path is ${order.join(', ')}`);
    if (rows.some((r, i) => r.sortOrder !== i)) fail(`${name}: the after state's sort orders are not 0 to ${rows.length - 1}`);
  }
  for (const w of writes) {
    const r = afterRows.find(x => x.playerId === w.playerId && x.sortOrder === w.now.sortOrder);
    if (!r || FIELDS.some(f => r[f] !== w.now[f])) fail(`${w.player} ${w.now.season} ${w.now.club}: the after state does not assert the row as written`);
  }
  for (const k of record.assistsKept ?? []) {
    const r = afterRows.find(x => x.playerId === k.playerId && x.season === k.season && x.club === k.club);
    if (!r || r.assists !== k.value) fail(`${k.player} ${k.season} ${k.club}: the record keeps ${k.value} assists, the migration's after state asserts ${r ? r.assists : 'no such row'}`);
  }
  const counts = parseCountGuards(sql);
  const inserts = writes.filter(w => !w.rowId).length;
  if (counts.seasonsBefore === null || counts.seasonsAfter === null || counts.players === null) fail('the migration does not guard the season and player counts');
  else if (counts.seasonsAfter - counts.seasonsBefore !== record.added.length || inserts !== record.added.length) fail(`the migration guards ${counts.seasonsBefore} to ${counts.seasonsAfter} seasons with ${inserts} inserts; the record adds ${record.added.length}`);
  const code = sql.replace(/^\s*--.*$/gm, '');
  if (!/is not distinct from desired\.old_assists/.test(code) || !/s\.id = desired\.row_id/.test(code)) fail('an update is not matched by row id and by every value it replaces');
  if (!/if updated_this_row <> 1 then raise exception/.test(code)) fail('an update does not fail closed on a row count other than one');
  console.log(`   ${writes.length} writes (${inserts} inserts) and ${afterRows.length} after state rows; every changed field and every insert is a record row; seasons ${counts.seasonsBefore} to ${counts.seasonsAfter}`);
}

console.log('3) the baked pool is the pool the record ends in, row for row with the migration');
section = 3;
if (CONTROL === 'file') {
  const from = '{ season: "2019-2020", club: "RB Salzburg", goals: 28,';
  if (!fileText.includes(from)) abort('file control cannot run: the Salzburg 2019-20 row is not in the file as written');
  fileText = fileText.replace(from, '{ season: "2019-2020", club: "RB Salzburg", goals: 27,');
  console.log('   NEGATIVE CONTROL ON: the file carries Haaland\'s 2019-20 Salzburg goals as 27');
}
let filePlayers;
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-career-rows-'));
  const copy = path.join(tmp, 'careerPlayers.ts');
  fs.writeFileSync(copy, fileText);
  const entry = path.join(tmp, 'entry.mjs');
  const bundle = path.join(tmp, 'bundle.mjs');
  fs.writeFileSync(entry, `export { careerPlayers } from '${copy.replaceAll('\\', '/')}';\n`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  filePlayers = (await import(pathToFileURL(bundle).href)).careerPlayers;
  for (const p of afterProblems(filePlayers, record)) fail(`file: ${p}`);
  let compared = 0;
  for (const name of new Set(afterRows.map(r => r.player))) {
    const career = filePlayers.find(p => p.name === name)?.career ?? [];
    const asserted = afterRows.filter(r => r.player === name).sort((x, y) => x.sortOrder - y.sortOrder);
    if (career.length !== asserted.length) fail(`${name}: ${career.length} rows in the file, the migration asserts ${asserted.length}`);
    career.forEach((s, i) => {
      const r = asserted[i];
      if (!r || FIELDS.some(f => r[f] !== s[f])) fail(`${name} row ${i + 1}: the file has ${s.season} ${s.club} ${s.appearances} apps ${s.goals} goals, the migration asserts ${r ? `${r.season} ${r.club} ${r.appearances} apps ${r.goals} goals` : 'nothing'}`);
      compared += 1;
    });
  }
  console.log(`   every to value, added row and path is in the file; ${compared} rows of the touched players match the migration's after state`);
}

console.log('4) the live tables are the start or the end of the record, never between');
section = 4;
if (LOCAL_ONLY) console.log('   SKIPPED BY CAREER_ROWS_LOCAL_ONLY=1. The tables are not claimed checked.');
else {
  let live;
  try { live = await fetchLiveCareerPlayers(supabaseFromClientTs(ROOT)); } catch (e) { abort('Supabase unreachable, section 4 was not checked: ' + e.message); }
  if (!live.players.length) abort('the live read came back empty; section 4 was not checked');
  if (CONTROL === 'mixed') {
    const row = live.players.find(p => p.name === 'Antoine Griezmann')?.career.find(s => s.season === '2009-2010' && s.club === 'Real Sociedad');
    if (!row || ![10, 40].includes(row.appearances)) abort('mixed control cannot run: Griezmann 2009-10 reads neither 10 (before) nor 40 (after) appearances live');
    row.appearances = row.appearances === 10 ? 40 : 10;
    console.log(`   NEGATIVE CONTROL ON: the live read carries Griezmann's 2009-10 appearances as ${row.appearances} with the rest of the row untouched`);
  }
  const state = recordState(live.players, record);
  if (state === 'mixed') {
    fail('the live tables are neither the state the record starts from nor the state it ends in');
    for (const p of afterProblems(live.players, record).slice(0, 8)) fail(`live: ${p}`);
  } else if (state === 'before') console.log(`   PENDING: ${path.basename(MIGRATION_FILE)} is not applied; the tables still carry every value it replaces (${live.seasonRows.length} seasons)`);
  else console.log(`   applied: the tables carry every corrected value and added season (${live.seasonRows.length} seasons)`);
}

console.log('');
if (CONTROL) {
  if (failures > 0 && failedSections.has(CONTROLS[CONTROL])) { console.log(`simCareerRowsVerified control (${CONTROL}): green. Section ${CONTROLS[CONTROL]} reported the planted defect (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simCareerRowsVerified control (${CONTROL}): RED. ${failures ? 'Findings came, but not in the section the control plants.' : 'The planted defect went unreported.'}`);
  process.exit(1);
}
if (failures > 0) { console.error(`simCareerRowsVerified: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simCareerRowsVerified: green. Every value the migration writes traces to a record row with two sources, and the baked pool is where the record ends.');
