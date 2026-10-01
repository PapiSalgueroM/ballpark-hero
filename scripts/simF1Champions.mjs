/**
 * simF1Champions: Round 734. The f1_driver_standings record is held to itself, to its
 * migration, and to the two games that read the table.
 *
 * WHY THIS EXISTS. Round 734 read every row of public.f1_driver_standings (3,095 rows, 1950
 * to 2025) against formula1.com and the Jolpica dataset, wrote what it found to
 * scripts/data/f1ChampionsVerified2026-09.json, and wrote a fail closed migration that
 * corrects 18 rows and inserts the 11 rows a 100 row import page cut off. Both files named
 * this fence before it existed, and the first review found the record stating a false fact
 * 16 times: a note saying a driver "drove for more than one team" was emitted whenever
 * formula1.com printed a long entrant name (Red Bull Racing Renault) where the column held
 * the short one (Red Bull). The notes now say only what the two sources show, with the
 * evidence in fields, and this file makes sure that stays true.
 *
 * WHAT THIS HOLDS:
 *   1. THE RECORD IS ONE PIECE. The status counts equal the rows; every season cites a
 *      pair of different sources (formula1.com, Jolpica); ids, positions and drivers are
 *      unique within their scope; the top three of every season repeat their rows exactly;
 *      a marked row has a note, a filled row has a note and no id, a corrected row has a
 *      change that lands on the value the row holds, an unranked verified row has a race
 *      start or a note; and the four digests tableAtRead holds for each of the 76 seasons
 *      recompute from the rows with the changes reversed and the filled rows removed. That
 *      last check is what ties the record to the table as it was read on 2026-09-30.
 *   2. THE MIGRATION IS THE RECORD'S. Its 13 before and 13 after fingerprints recompute
 *      from the record with the migration's own recipe (concat_ws of the seven columns,
 *      rows ordered by their md5, joined with newlines, md5), every update traces to a
 *      change in the record with the same new value and names the old value in its where
 *      clause, every insert traces to a filled row, and the counts match both ways: no
 *      change without an update, no update without a change.
 *   3. A CONSTRUCTOR NOTE SAYS ONLY WHAT THE SOURCES SHOW. A note that counts more than
 *      one team needs a constructors field listing them (Jolpica's list for that driver
 *      and season) with the column's name among them; a printed name needs a
 *      constructorPrinted field that differs from the column; a note with no field behind
 *      it fails; a row note claiming a second team fails.
 *   4. THE GAMES AGREE WITH THE RECORD. Every row of src/data/f1HLDrivers.ts (Higher or
 *      Lower and Face Off) matches the record on career wins, titles, first and last
 *      season, every record driver with eight or more wins is in that file, and the List
 *      Quiz still reads driver_name at position 1, where the record has exactly one
 *      champion per season and one spelling per champion.
 *
 * NEGATIVE CONTROLS (F1_CONTROL). Each edits an in memory copy of one file, refuses to
 * run unless its anchor is in the text exactly once, and must redden exactly the sections
 * named. Under a control this exits 1 when the right sections went red and 3 when they
 * did not; an unknown control exits 2 so a typo never reads as a result.
 *   wins       2025 Verstappen's row gains a win: the 2025 digest and his career    1, 4
 *              total both move
 *   points     1976 Hunt's row goes back to 66: the row disagrees with its own     1, 2
 *              change and the 1976 end state fingerprint moves
 *   note       2012 Vettel's note claims more than one team with no second         3
 *              constructor behind it
 *   counts     the verified count comes up one short                               1
 *   migration  the migration writes Hunt 70 where the record says 69               2
 *
 * Reads files only. Needs no database and no browser.
 *
 * Run: node scripts/simF1Champions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = path.join(ROOT, 'scripts', 'data', 'f1ChampionsVerified2026-09.json');
const HL = path.join(ROOT, 'src', 'data', 'f1HLDrivers.ts');
const LIST_QUIZ = path.join(ROOT, 'src', 'lib', 'listQuiz.ts');

const CONTROL = process.env.F1_CONTROL || '';
const EXPECT = { wins: [1, 4], points: [1, 2], note: [3], counts: [1], migration: [2] };
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`F1_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(2);
}

const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const fail = (m) => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = (m) => { console.error(m); process.exit(2); };
const lf = (t) => t.replace(/\r\n/g, '\n');
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');
/* en dash and em dash, built from their code points so this file never carries one itself */
const DASH = new RegExp('[' + String.fromCharCode(0x2013) + String.fromCharCode(0x2014) + ']');

/* A control edits a copy in memory, never the file, and only when its anchor is there once. */
function mutate(text, what, before, after) {
  const first = text.indexOf(before);
  if (first < 0) abort(`control ${CONTROL} cannot run: "${before.slice(0, 70)}" is not in ${what}`);
  if (text.indexOf(before, first + 1) >= 0) abort(`control ${CONTROL} cannot run: "${before.slice(0, 70)}" is in ${what} more than once`);
  const out = text.slice(0, first) + after + text.slice(first + before.length);
  if (out === text) abort(`control ${CONTROL} changed nothing`);
  console.log(`   NEGATIVE CONTROL ON (${CONTROL}): in ${what}, "${before.slice(0, 64)}" now reads "${after.slice(0, 64)}"`);
  return out;
}

/* ---------------- the record, or a doctored copy of it ---------------- */
let recordText = lf(fs.readFileSync(RECORD, 'utf8'));
if (CONTROL === 'wins') recordText = mutate(recordText, 'the record', '[3076, "max_verstappen", "Max Verstappen", "red_bull", "Red Bull", 2, 421, 8, "verified"]', '[3076, "max_verstappen", "Max Verstappen", "red_bull", "Red Bull", 2, 421, 9, "verified"]');
if (CONTROL === 'points') recordText = mutate(recordText, 'the record', '[1637, "hunt", "James Hunt", "mclaren", "McLaren", 1, 69, 6, "corrected"]', '[1637, "hunt", "James Hunt", "mclaren", "McLaren", 1, 66, 6, "corrected"]');
if (CONTROL === 'note') recordText = mutate(recordText, 'the record', 'Jolpica lists one constructor for him in 2012, Red Bull; formula1.com', 'drove for more than one team in 2012, Red Bull; formula1.com');
if (CONTROL === 'counts') recordText = mutate(recordText, 'the record', '"verified": 2950,', '"verified": 2949,');
let rec;
try { rec = JSON.parse(recordText); } catch (err) { abort(`the record is not JSON: ${err.message}`); }
if (!rec.seasons || !Array.isArray(rec.changes)) abort('the record has no seasons or no changes list; nothing was checked');

const seasons = Object.keys(rec.seasons).map(Number).sort((a, b) => a - b);
const asRow = (r) => ({ id: r[0], driver_id: r[1], driver_name: r[2], constructor_id: r[3], constructor_name: r[4], position: r[5], points: r[6], wins: r[7], status: r[8] });
/* post: the table the migration leaves (the rows as written). pre: the table as read, which is
   post without the filled rows and with every change put back to its old value. */
const post = {};
const pre = {};
for (const s of seasons) {
  post[s] = rec.seasons[s].rows.map(asRow);
  const p = post[s].filter((r) => r.status !== 'filled').map((r) => ({ ...r }));
  for (const c of rec.changes.filter((c) => c.season === s)) {
    const row = p.find((r) => r.id === c.id);
    if (row) row[c.field] = c.old;
  }
  pre[s] = p;
}

/* The recipes. The migration's: concat_ws('|', seven columns, position as '-' when null), rows
   ordered by md5(row), joined with newlines, md5. tableAtRead's four are the same shape over
   fewer columns, except hidorder, which is the driver_ids in id order joined with commas. */
const pgText = (v) => (v === null || v === undefined ? null : String(v));
const posText = (p) => (p === null || p === undefined ? '-' : String(p));
const concatWs = (...vals) => vals.filter((v) => v !== null && v !== undefined).join('|');
const byOwnMd5 = (lines) => lines.map((l) => [md5(l), l]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map((x) => x[1]).join('\n');
const migrationFingerprint = (rows) => md5(byOwnMd5(rows.map((r) => concatWs(r.driver_id, r.driver_name, r.constructor_id, r.constructor_name, posText(r.position), pgText(r.points), pgText(r.wins)))));
const digests = (rows) => ({
  hcore: md5(byOwnMd5(rows.map((r) => [r.driver_id, posText(r.position), String(r.points), String(r.wins)].join('|')))),
  hname: md5(byOwnMd5(rows.map((r) => concatWs(r.driver_id, r.driver_name)))),
  hcons: md5(byOwnMd5(rows.map((r) => concatWs(r.driver_id, r.constructor_id, r.constructor_name)))),
  hidorder: md5([...rows].sort((a, b) => a.id - b.id).map((r) => r.driver_id).join(',')),
});

/* ---------------- 1. the record is one piece ---------------- */
section = 1;
console.log('1) The record is one piece: counts, rows, sources, top three, notes, and the digests of the table as read');
{
  const STATUSES = new Set(['verified', 'corrected', 'filled', 'marked']);
  const tally = {};
  let total = 0;
  let digestsChecked = 0;
  const ids = new Set();
  for (const s of seasons) {
    const S = rec.seasons[s];
    const notes = S.notes || {};
    const starts = S.raceStarts || {};
    const seenPos = new Set();
    const seenDriver = new Set();
    let champions = 0;
    if (!Array.isArray(S.src) || S.src.length !== 2 || S.src[0] === S.src[1]) fail(`${s}: src is not a pair of two different sources`);
    else {
      if (!/^https:\/\/www\.formula1\.com\//.test(S.src[0])) fail(`${s}: src[0] is not formula1.com`);
      if (!/^https:\/\/api\.jolpi\.ca\//.test(S.src[1])) fail(`${s}: src[1] is not Jolpica`);
    }
    if (!/^https:\/\/www\.formula1\.com\/.*\/races$/.test(S.winsSrc || '')) fail(`${s}: winsSrc is not formula1.com's race list`);
    for (const r of post[s]) {
      total += 1;
      tally[r.status] = (tally[r.status] || 0) + 1;
      const who = `${s} ${r.driver_id}`;
      if (!STATUSES.has(r.status)) fail(`${who}: status "${r.status}"`);
      if (r.status === 'filled' ? r.id !== null : !Number.isInteger(r.id)) fail(`${who}: id ${r.id} (a filled row has none, every other row has one)`);
      if (r.id !== null) { if (ids.has(r.id)) fail(`${who}: id ${r.id} appears twice`); ids.add(r.id); }
      for (const k of ['driver_id', 'driver_name', 'constructor_id', 'constructor_name']) if (typeof r[k] !== 'string' || !r[k].trim()) fail(`${who}: ${k} is empty`);
      if (!(r.position === null || (Number.isInteger(r.position) && r.position >= 1))) fail(`${who}: position ${r.position}`);
      if (!(typeof r.points === 'number' && r.points >= 0)) fail(`${who}: points ${r.points}`);
      if (!(Number.isInteger(r.wins) && r.wins >= 0)) fail(`${who}: wins ${r.wins}`);
      if (r.position !== null) { if (seenPos.has(r.position)) fail(`${who}: position ${r.position} appears twice in ${s}`); seenPos.add(r.position); }
      if (r.position === 1) champions += 1;
      if (seenDriver.has(r.driver_id)) fail(`${who}: two rows in one season`);
      seenDriver.add(r.driver_id);
      if (r.status === 'marked' && !notes[r.driver_id]) fail(`${who}: marked without a note saying why`);
      if (r.status === 'filled') {
        if (!notes[r.driver_id]) fail(`${who}: filled without a note`);
        if (r.position !== null || r.points !== 0 || r.wins !== 0) fail(`${who}: a filled row must be a scoreless unranked starter`);
      }
      if (r.status === 'corrected') {
        const cs = rec.changes.filter((c) => c.season === s && c.id === r.id && c.driver_id === r.driver_id);
        if (!cs.length) fail(`${who}: corrected without a change`);
        for (const c of cs) if (r[c.field] !== c.new) fail(`${who}: the row holds ${c.field} ${JSON.stringify(r[c.field])} but its change lands on ${JSON.stringify(c.new)}`);
      }
      if (r.status === 'verified' && r.position === null && !starts[r.driver_id] && !notes[r.driver_id]) fail(`${who}: verified and unranked with neither a race start nor a note`);
    }
    if (champions !== 1) fail(`${s}: ${champions} rows at position 1`);
    const champ = post[s].find((r) => r.position === 1);
    if (champ && champ.driver_name !== S.champion) fail(`${s}: champion "${S.champion}" but position 1 is ${champ.driver_name}`);
    for (const k of Object.keys(notes)) if (!seenDriver.has(k)) fail(`${s}: a note for ${k}, who has no row`);
    for (const k of Object.keys(starts)) if (!seenDriver.has(k)) fail(`${s}: a race start for ${k}, who has no row`);
    if (!Array.isArray(S.top3) || S.top3.length !== 3) fail(`${s}: top3 has ${Array.isArray(S.top3) ? S.top3.length : 0} entries`);
    else {
      S.top3.forEach((t, i) => {
        if (t.position !== i + 1) fail(`${s}: top3[${i}] is position ${t.position}`);
        const r = post[s].find((x) => x.id === t.id);
        if (!r) { fail(`${s}: top3 ${t.driver_id} has no row with id ${t.id}`); return; }
        for (const k of ['position', 'driver_id', 'driver_name', 'constructor_name', 'points', 'wins', 'status']) if (r[k] !== t[k]) fail(`${s} ${t.driver_id}: top3 ${k} ${JSON.stringify(t[k])} but the row holds ${JSON.stringify(r[k])}`);
        if (!Array.isArray(t.src) || t.src.length !== 2 || t.src[0] === t.src[1]) fail(`${s} ${t.driver_id}: top3 src is not a pair`);
        if (t.old) for (const [k, v] of Object.entries(t.old)) if (!rec.changes.some((c) => c.id === t.id && c.field === k && c.old === v)) fail(`${s} ${t.driver_id}: top3 old ${k} ${JSON.stringify(v)} has no change behind it`);
      });
    }
    const ta = rec.tableAtRead && rec.tableAtRead[s];
    if (!ta) fail(`${s}: no tableAtRead entry`);
    else {
      if (ta.n !== pre[s].length) fail(`${s}: tableAtRead n ${ta.n} but the record reverses to ${pre[s].length} rows`);
      const minid = Math.min(...pre[s].map((r) => r.id));
      if (ta.minid !== minid) fail(`${s}: tableAtRead minid ${ta.minid} but the record's first id is ${minid}`);
      const d = digests(pre[s]);
      for (const k of Object.keys(d)) { digestsChecked += 1; if (d[k] !== ta[k]) fail(`${s}: ${k} recomputes to ${d[k]}, tableAtRead holds ${ta[k]}`); }
    }
  }
  for (const c of rec.changes) {
    if (c.old === c.new) fail(`change ${c.season} ${c.driver_id} ${c.field}: old equals new`);
    if (!post[c.season] || !post[c.season].some((r) => r.id === c.id && r.status === 'corrected')) fail(`change ${c.season} id ${c.id}: no corrected row behind it`);
    if (!Array.isArray(c.src) || c.src.length !== 2 || c.src[0] === c.src[1]) fail(`change ${c.season} ${c.driver_id} ${c.field}: not two different sources`);
  }
  const counts = rec.counts || {};
  const read = total - (tally.filled || 0);
  if (counts.read !== read) fail(`counts.read ${counts.read} but the record holds ${read} rows that were read`);
  for (const k of ['verified', 'corrected', 'filled', 'marked']) if (counts[k] !== (tally[k] || 0)) fail(`counts.${k} ${counts[k]} but the rows tally ${tally[k] || 0}`);
  if (counts.dropped !== 0) fail(`counts.dropped is ${counts.dropped}, and the record drops nothing`);
  if (seasons.length !== 76 || seasons[0] !== 1950 || seasons[seasons.length - 1] !== 2025) fail(`${seasons.length} seasons from ${seasons[0]} to ${seasons[seasons.length - 1]}; the record covers 1950 to 2025`);
  if (DASH.test(recordText)) fail('the record carries a dash');
  console.log(`   ${total} rows across ${seasons.length} seasons (${['verified', 'corrected', 'filled', 'marked'].map((k) => `${tally[k] || 0} ${k}`).join(', ')}), ${rec.changes.length} changes, ${digestsChecked} digests of the table as read recomputed`);
}

/* ---------------- 2. the migration is the record's ---------------- */
section = 2;
console.log("2) The migration is the record's: 26 fingerprints, every update, every insert");
{
  const migPath = typeof rec.migration === 'string' ? path.join(ROOT, rec.migration) : null;
  if (!migPath || !fs.existsSync(migPath)) fail(`the record names migration ${rec.migration}, which does not exist`);
  else {
    let mig = lf(fs.readFileSync(migPath, 'utf8'));
    if (CONTROL === 'migration') mig = mutate(mig, 'the migration', 'set points = 69 where id = 1637', 'set points = 70 where id = 1637');
    if (!mig.includes('scripts/simF1Champions.mjs')) fail('the migration header does not name this fence');
    if (!mig.includes('scripts/data/f1ChampionsVerified2026-09.json')) fail('the migration header does not name the record');
    if (DASH.test(mig)) fail('the migration carries a dash');
    if (!/^do \$migration\$/m.test(mig) || !/^\$migration\$;/m.test(mig)) fail('the migration is not one do block');

    const preLits = {};
    const postLits = {};
    const fpRe = /where season = (\d{4})\) s;\n\s*if h is distinct from '([0-9a-f]{32})' then raise exception 'Round 734: season \d{4} (moved since|did not land)/g;
    let m;
    while ((m = fpRe.exec(mig))) (m[3] === 'moved since' ? preLits : postLits)[m[1]] = m[2];
    const touched = Object.keys(preLits);
    if (touched.length !== 13 || Object.keys(postLits).length !== 13) fail(`${touched.length} before and ${Object.keys(postLits).length} after fingerprints read from the migration, 13 and 13 expected`);
    const expectTouched = new Set([
      ...rec.changes.map((c) => String(c.season)),
      ...seasons.filter((s) => post[s].some((r) => r.status === 'filled')).map(String),
    ]);
    for (const s of expectTouched) if (!preLits[s] || !postLits[s]) fail(`season ${s} is changed by the record but the migration does not fingerprint it before and after`);
    let fingerprints = 0;
    for (const s of touched) {
      if (!expectTouched.has(s)) fail(`season ${s} is fingerprinted but the record changes nothing in it`);
      if (!pre[s]) { fail(`season ${s} is not in the record`); continue; }
      const before = migrationFingerprint(pre[s]);
      const after = migrationFingerprint(post[s]);
      fingerprints += 1;
      if (before !== preLits[s]) fail(`season ${s}: the table as read recomputes to ${before}, the migration expects ${preLits[s]}`);
      if (postLits[s]) { fingerprints += 1; if (after !== postLits[s]) fail(`season ${s}: the end state recomputes to ${after}, the migration expects ${postLits[s]}`); }
    }

    const upRe = /update public\.f1_driver_standings set (.+?) where id = (\d+) and season = (\d{4}) and driver_id = '([^']+)'(.*?);/g;
    const sqlValue = (v) => (v.startsWith("'") ? v.slice(1, -1).replace(/''/g, "'") : Number(v));
    const covered = new Set();
    let updates = 0;
    let assignments = 0;
    while ((m = upRe.exec(mig))) {
      updates += 1;
      const id = Number(m[2]);
      const season = Number(m[3]);
      const driver = m[4];
      const where = m[5];
      for (const a of m[1].split(', ')) {
        assignments += 1;
        const am = a.match(/^(\w+) = (.+)$/);
        if (!am) { fail(`cannot read assignment "${a}"`); continue; }
        const field = am[1];
        const value = sqlValue(am[2]);
        const idx = rec.changes.findIndex((c) => c.id === id && c.season === season && c.driver_id === driver && c.field === field);
        if (idx < 0) { fail(`update of row ${id} (${season} ${driver}) ${field} has no change in the record`); continue; }
        const c = rec.changes[idx];
        covered.add(idx);
        if (c.new !== value) fail(`row ${id} (${season} ${driver}) ${field}: the migration writes ${JSON.stringify(value)}, the record says ${JSON.stringify(c.new)}`);
        const guard = typeof c.old === 'number' ? `${field} = ${c.old}` : `${field} = '${String(c.old).replace(/'/g, "''")}'`;
        if (!where.includes(` and ${guard}`)) fail(`row ${id} (${season} ${driver}) ${field}: the update does not name the old value ${JSON.stringify(c.old)} in its where clause`);
      }
      if (!mig.includes(`row ${id} (${season} ${driver}) was not as read`)) fail(`row ${id}: no row_count guard after its update`);
    }
    rec.changes.forEach((c, i) => { if (!covered.has(i)) fail(`change ${c.season} ${c.driver_id} ${c.field} is in the record but not in the migration`); });
    const correctedRows = seasons.reduce((n, s) => n + post[s].filter((r) => r.status === 'corrected').length, 0);
    if (updates !== correctedRows) fail(`${updates} update statements for ${correctedRows} corrected rows`);
    if (assignments !== rec.changes.length) fail(`${assignments} field assignments for ${rec.changes.length} changes`);

    const inRe = /insert into public\.f1_driver_standings \(season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name\) values \((\d{4}), null, 0, 0, '([^']+)', (U&'[^']*'|'[^']*'), '([^']+)', '([^']+)'\);/g;
    const sqlName = (v) => (v.startsWith('U&')
      ? v.slice(3, -1).replace(/\\([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      : v.slice(1, -1)).replace(/''/g, "'");
    const filled = [];
    for (const s of seasons) for (const r of post[s]) if (r.status === 'filled') filled.push({ season: s, ...r });
    const inserted = new Set();
    let inserts = 0;
    while ((m = inRe.exec(mig))) {
      inserts += 1;
      const season = Number(m[1]);
      const driver = m[2];
      const name = sqlName(m[3]);
      const f = filled.find((r) => r.season === season && r.driver_id === driver);
      if (!f) { fail(`insert of ${season} ${driver} has no filled row in the record`); continue; }
      inserted.add(f);
      if (f.driver_name !== name || f.constructor_id !== m[4] || f.constructor_name !== m[5]) fail(`insert of ${season} ${driver}: ${name} / ${m[4]} / ${m[5]} but the record holds ${f.driver_name} / ${f.constructor_id} / ${f.constructor_name}`);
      if (!mig.includes(`insert of ${season} ${driver} failed`)) fail(`insert of ${season} ${driver}: no row_count guard`);
    }
    for (const f of filled) if (!inserted.has(f)) fail(`filled row ${f.season} ${f.driver_id} is in the record but the migration does not insert it`);
    if (inserts !== filled.length) fail(`${inserts} inserts for ${filled.length} filled rows`);
    console.log(`   ${fingerprints} fingerprints recomputed, ${updates} updates carrying ${assignments} field changes, ${inserts} inserts, all traced to the record`);
  }
}

/* ---------------- 3. a constructor note says only what the sources show ---------------- */
section = 3;
console.log('3) A constructor note says only what the two sources show');
{
  const CLAIM = /more than one (team|constructor)|(two|three|four|several|both|\d+) (teams|constructors)|switched|moved to|also drove/i;
  const WORD = { two: 2, three: 3, four: 4 };
  let noted = 0;
  let multi = 0;
  let printed = 0;
  for (const s of seasons) {
    for (const t of rec.seasons[s].top3 || []) {
      const who = `${s} ${t.driver_id}`;
      const note = t.constructorNote;
      const cons = t.constructors;
      const pr = t.constructorPrinted;
      if (cons !== undefined) {
        multi += 1;
        if (!Array.isArray(cons) || cons.length < 2) fail(`${who}: constructors must list at least two, it holds ${JSON.stringify(cons)}`);
        else {
          if (new Set(cons).size !== cons.length) fail(`${who}: constructors repeats a name`);
          if (!cons.includes(t.constructor_name)) fail(`${who}: the column's ${t.constructor_name} is not among ${cons.join(', ')}`);
          if (!note) fail(`${who}: ${cons.length} constructors recorded but no note says so`);
          else {
            for (const c of cons) if (!note.includes(c)) fail(`${who}: the note does not name ${c}`);
            const wm = note.match(/lists (\w+) constructors/);
            if (!wm || WORD[wm[1]] !== cons.length) fail(`${who}: the note counts "${wm ? wm[1] : 'nothing'}" constructors, the field lists ${cons.length}`);
          }
        }
      }
      if (pr !== undefined) {
        printed += 1;
        if (typeof pr !== 'string') fail(`${who}: constructorPrinted is not text`);
        else if (pr === t.constructor_name) fail(`${who}: constructorPrinted equals the column, so there is nothing to record`);
        else if (!note) fail(`${who}: a printed name is recorded but no note says so`);
        else if (pr === '' ? !/print no team/.test(note) : !note.includes(pr)) fail(`${who}: the note does not say what formula1.com prints (${JSON.stringify(pr)})`);
      }
      if (note) {
        noted += 1;
        if (cons === undefined && pr === undefined) fail(`${who}: a note with no field behind it: "${note.slice(0, 80)}"`);
        if (!note.includes(t.constructor_name)) fail(`${who}: the note does not name the column's ${t.constructor_name}`);
        if (CLAIM.test(note) && !(Array.isArray(cons) && cons.length >= 2)) fail(`${who}: the note claims more than one team and the record shows one: "${note.slice(0, 90)}"`);
        if (DASH.test(note)) fail(`${who}: dash in the note`);
      }
    }
    for (const [k, v] of Object.entries(rec.seasons[s].notes || {})) if (/more than one team|also drove/i.test(v)) fail(`${s} ${k}: a row note claims more than one team, which no field backs`);
  }
  console.log(`   ${noted} notes: ${multi} where Jolpica lists more than one constructor, ${printed} where formula1.com prints a different text from the column`);
}

/* ---------------- 4. the games agree with the record ---------------- */
section = 4;
console.log('4) The games agree with the record: Higher or Lower wins and titles, the List Quiz champions');
{
  const byDriver = new Map();
  for (const s of seasons) {
    for (const r of post[s]) {
      const d = byDriver.get(r.driver_id) || { names: new Set(), wins: 0, titles: 0, first: Infinity, last: -Infinity };
      d.names.add(r.driver_name);
      d.wins += r.wins;
      if (r.position === 1) d.titles += 1;
      d.first = Math.min(d.first, s);
      d.last = Math.max(d.last, s);
      byDriver.set(r.driver_id, d);
    }
  }
  for (const [id, d] of byDriver) if (d.names.size > 1) fail(`${id} is spelled ${[...d.names].join(' and ')} across seasons`);
  const byName = new Map();
  for (const [id, d] of byDriver) for (const n of d.names) byName.set(n, { id, ...d });

  const hl = lf(fs.readFileSync(HL, 'utf8'));
  const rowRe = /\{ name: '([^']+)', careerWins: (\d+), titles: (\d+), constructors: '[^']*', firstSeason: (\d{4}), lastSeason: (\d{4}) \}/g;
  const hlRows = [];
  let m;
  while ((m = rowRe.exec(hl))) hlRows.push({ name: m[1], wins: Number(m[2]), titles: Number(m[3]), first: Number(m[4]), last: Number(m[5]) });
  if (hlRows.length < 40) fail(`only ${hlRows.length} rows read from f1HLDrivers.ts (42 when this was written)`);
  for (const h of hlRows) {
    const d = byName.get(h.name);
    if (!d) { fail(`${h.name}: in f1HLDrivers.ts, not in the record under that spelling`); continue; }
    if (d.wins !== h.wins) fail(`${h.name}: careerWins ${h.wins}, the record sums ${d.wins}`);
    if (d.titles !== h.titles) fail(`${h.name}: titles ${h.titles}, the record has ${d.titles} seasons at position 1`);
    if (d.first !== h.first || d.last !== h.last) fail(`${h.name}: seasons ${h.first} to ${h.last}, the record spans ${d.first} to ${d.last}`);
  }
  const POOL_WINS = 8; /* the file's own rule: every driver with eight or more wins */
  for (const [id, d] of byDriver) if (d.wins >= POOL_WINS && !hlRows.some((h) => d.names.has(h.name))) fail(`${[...d.names][0]} (${id}) has ${d.wins} wins in the record and is not in f1HLDrivers.ts`);

  const lq = lf(fs.readFileSync(LIST_QUIZ, 'utf8'));
  const qm = lq.match(/id: 'f1-champs',[\s\S]*?minAnswers: (\d+),[\s\S]*?fetch: \(\) => col\('f1_driver_standings', 'driver_name', q => q\.eq\('position', 1\)\)/);
  if (!qm) fail('listQuiz.ts no longer reads f1_driver_standings driver_name at position 1 for f1-champs; this section no longer knows what the quiz shows');
  const champIds = new Set();
  const champNames = new Set();
  for (const s of seasons) for (const r of post[s]) if (r.position === 1) { champIds.add(r.driver_id); champNames.add(r.driver_name); }
  if (champNames.size !== champIds.size) fail(`${champNames.size} champion names for ${champIds.size} champions: one is spelled two ways and the quiz would show him twice`);
  if (qm && champNames.size < Number(qm[1])) fail(`${champNames.size} champions, the quiz needs ${qm[1]}`);
  if (champNames.size !== 35) fail(`${champNames.size} distinct champions, 35 expected for 1950 to 2025`);
  console.log(`   ${hlRows.length} Higher or Lower drivers agree on wins, titles and seasons; ${champNames.size} champions, one spelling each, quiz floor ${qm ? qm[1] : '?'}`);
}

/* ---------------- verdict ---------------- */
const total = Object.values(failures).reduce((a, b) => a + b, 0);
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const fired = Object.keys(failures).filter((k) => failures[k] > 0).map(Number);
  const asExpected = want.every((s) => failures[s] > 0) && fired.every((s) => want.includes(s));
  if (asExpected) {
    console.log(`\nsimF1Champions control ${CONTROL}: fired as it must. Section${want.length > 1 ? 's' : ''} ${want.join(' and ')} went red (${want.map((s) => `${failures[s]}`).join(' and ')} finding(s)) and nothing else did. Exit 1 is the control working.`);
    process.exit(1);
  }
  console.error(`\nsimF1Champions control ${CONTROL}: RED. Expected sections ${want.join(', ')} to fail and no other; sections that failed: ${fired.join(', ') || 'none'}.`);
  process.exit(3);
}
if (total > 0) { console.error(`\nsimF1Champions: RED, ${total} failure(s)`); process.exit(1); }
console.log('\nsimF1Champions: green (the record holds together and matches the table as read, the migration is the record\'s, every constructor note is backed, and both games agree)');
