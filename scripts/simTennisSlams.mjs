/* simTennisSlams: public.tennis_grand_slam_winners against its row by row record.
 *
 * Round 732. The table feeds List Quiz (the four singles champion lists) and the
 * Tennis Chain validator. A read only audit found the 2026 French Open champions
 * NULL, the 2026 Wimbledon and US Open rows missing, a one row per year shape
 * that had dropped the December 1977 Australian Open, and nothing that pinned
 * any of it. Every row was then checked against the event's official champions
 * list and ESPN, and the result is scripts/data/tennisSlamsVerified2026-09.json.
 *
 * WHAT THIS READS. The record, and the migration that brings the table to it,
 * supabase/migrations/20260930_round_732_tennis_slams.sql. It does NOT read the
 * database. It replays the migration's statements over the rows as they were
 * read (the record's read values) and judges the END STATE the migration
 * produces, so it is green on the branch before the migration is applied and
 * stays the fence after. It reads the SQL with its comments stripped, so the
 * header's prose cannot satisfy a check. A statement it does not understand is
 * a failure, never skipped. Scores are replayed from the record's scores block,
 * every stored value keyed by id (1,017 of them, none with a digit, read from
 * the same rows the snapshot md5 covers), so the wipe the migration performs is
 * reversible from the record and this harness sees the values it clears.
 *
 * CHECKS
 *   parse        every statement in the migration is one this harness can replay
 *   hash         the migration's opening guard names the read (row count and md5)
 *                and its closing guard names this record's end state, computed
 *                here from the record the same way the SQL computes it
 *   guard        every update and delete names its row by id, event, year and the
 *                champion as read, and those values are the record's; every insert
 *                is skipped when its event already has a row
 *   agree        every verified or corrected row ends with the record's champion
 *                and edition
 *   present      every verified, corrected and filled row exists in the end state
 *   dropped      every dropped row is gone
 *   placeholder  no row ends with a NULL, blank or placeholder shaped champion
 *   stray        no row ends in the table that the record does not know
 *   unique       one row per tournament, category, year and edition
 *   score        the record keeps every stored score (counts.scoresKept of them,
 *                each keyed by a read id, none holding a digit) and no score
 *                without a digit survives the replay
 *   sources      every record row carries two distinct source URLs (neither of
 *                them Wikipedia, which is a spot check here, never a source), a
 *                check date and a known status, and the record's counts add up
 *
 * NEGATIVE CONTROLS. TENNIS_SLAMS_CONTROL=<name> plants one defect, asserts the
 * plant changed something, and exits 1 only if exactly its own check went red
 * (exit 2 if it changed nothing or turned any other check red):
 *   wrongvalue  -> agree        the 1901 correction writes a misspelt name
 *   missingrow  -> present      the Wimbledon 2026 men's insert is removed
 *   undropped   -> dropped      the delete of the 1941 wartime row is removed
 *   placeholder -> placeholder  an insert of a 'TBD' champion is added
 *   stray       -> stray        an insert of a real name for an event the record lacks
 *   unguarded   -> guard        the 1901 correction loses its read value guard
 *   noindex     -> unique       the one row per edition index is not created
 *   noscore     -> score        the score cleanup is removed
 *   lostscore   -> score        one stored score is dropped from the record's scores block
 *   wikisource  -> sources      one row's second source becomes a Wikipedia page
 *   stalehash   -> hash         the opening guard names a different md5
 *   unknownsql  -> parse        a statement this harness cannot replay is added
 *
 * Run: node scripts/simTennisSlams.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = path.join(ROOT, 'scripts', 'data', 'tennisSlamsVerified2026-09.json');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260930_round_732_tennis_slams.sql');
const T = 'public.tennis_grand_slam_winners';

const CONTROLS = {
  wrongvalue: 'agree', missingrow: 'present', undropped: 'dropped', placeholder: 'placeholder', stray: 'stray',
  unguarded: 'guard', noindex: 'unique', noscore: 'score', lostscore: 'score', wikisource: 'sources', stalehash: 'hash', unknownsql: 'parse',
};
const CONTROL = process.env.TENNIS_SLAMS_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`TENNIS_SLAMS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
let sql = fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n');

/* Controls plant their defect in the text or the record before anything runs,
   and refuse to run if the text they replace is not there. */
function plant(from, to) {
  if (!sql.includes(from)) { console.error(`CONTROL ${CONTROL} changed nothing: the migration does not contain ${JSON.stringify(from.slice(0, 80))}`); process.exit(2); }
  sql = sql.replace(from, to);
}
const SCORE_SQL = `update ${T} set score = null where score is not null and score !~ '[0-9]';`;
if (CONTROL === 'wrongvalue') plant(`set champion = 'P. Girod' where id = 356`, `set champion = 'P. Girot' where id = 356`);
if (CONTROL === 'missingrow') plant(
  `insert into ${T} (tournament, category, year, edition, champion)\nselect 'Wimbledon', 'Men''s Singles', 2026, null, 'Jannik Sinner'\nwhere not exists (select 1 from ${T} where tournament = 'Wimbledon' and category = 'Men''s Singles' and year = 2026 and coalesce(edition, '') = '');\n`, '');
if (CONTROL === 'undropped') plant(`delete from ${T} where id = 266 and tournament = 'French Open' and category = 'Men''s Singles' and year = 1941 and champion = 'Bernard Destremau';\n`, '');
if (CONTROL === 'placeholder') plant(SCORE_SQL, `insert into ${T} (tournament, category, year, edition, champion)\nselect 'Wimbledon', 'Men''s Singles', 2027, null, 'TBD'\nwhere not exists (select 1 from ${T} where tournament = 'Wimbledon' and category = 'Men''s Singles' and year = 2027 and coalesce(edition, '') = '');\n${SCORE_SQL}`);
if (CONTROL === 'stray') plant(SCORE_SQL, `insert into ${T} (tournament, category, year, edition, champion)\nselect 'Wimbledon', 'Men''s Singles', 1940, null, 'Bobby Riggs'\nwhere not exists (select 1 from ${T} where tournament = 'Wimbledon' and category = 'Men''s Singles' and year = 1940 and coalesce(edition, '') = '');\n${SCORE_SQL}`);
if (CONTROL === 'unguarded') plant(`where id = 356 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1901 and champion = 'Suzanne Girod';`, `where id = 356 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1901;`);
if (CONTROL === 'noindex') plant(`create unique index tennis_grand_slam_winners_one_per_edition on ${T} (tournament, category, year, coalesce(edition, ''));
`, '');
if (CONTROL === 'noscore') plant(SCORE_SQL + '\n', '');
if (CONTROL === 'stalehash') plant(`h <> '${record.snapshot.md5}'`, `h <> '00000000000000000000000000000000'`);
if (CONTROL === 'unknownsql') plant(SCORE_SQL, `truncate ${T};\n${SCORE_SQL}`);
if (CONTROL === 'lostscore') {
  if (!record.scores || record.scores['831'] !== 'Peru') { console.error('CONTROL lostscore changed nothing: the record does not keep the score of id 831'); process.exit(2); }
  delete record.scores['831'];
}
if (CONTROL === 'wikisource') {
  const r = record.rows.find(x => x.id === 16);
  if (!r || /wikipedia/.test(r.sources[1])) { console.error('CONTROL wikisource changed nothing'); process.exit(2); }
  r.sources = [r.sources[0], 'https://en.wikipedia.org/wiki/James_Anderson_(tennis)'];
}

const results = [];
const check = (name, problems, detail) => results.push({ name, problems, detail });

/* ---------- parse the migration, comments stripped ---------- */
const code = sql.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
const doBlocks = [...code.matchAll(/do \$\$([\s\S]*?)end \$\$;/g)].map(m => m[1]);
const rest = code.replace(/do \$\$[\s\S]*?end \$\$;/g, '');
const statements = rest.split(/;\s*(?:\n|$)/).map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);

const lit = s => s.replace(/''/g, "'");
const STR = `'((?:[^']|'')*)'`;
function conds(where) {
  const out = {}; const re = new RegExp(`(\\w+) (?:= ${STR}|= (-?\\d+)|(is null))`, 'g');
  let m, left = where;
  while ((m = re.exec(where))) {
    out[m[1]] = m[4] ? null : m[3] !== undefined ? Number(m[3]) : lit(m[2]);
    left = left.replace(m[0], '');
  }
  if (left.replace(/\band\b/g, '').trim()) return null;
  return out;
}
const ops = []; const parseProblems = [];
for (const s of statements) {
  let m;
  if (s === 'begin' || s === 'commit') continue;
  if ((m = s.match(new RegExp(`^alter table ${T.replace('.', '\\.')} add column edition text$`)))) { ops.push({ op: 'addcol' }); continue; }
  if (s.startsWith(`comment on column ${T}.edition is `)) continue;
  if ((m = s.match(new RegExp(`^update ${T.replace('.', '\\.')} set (champion|edition) = ${STR} where (.*)$`)))) {
    const c = conds(m[3]); if (!c) { parseProblems.push('unreadable where: ' + s.slice(0, 120)); continue; }
    ops.push({ op: 'set', col: m[1], value: lit(m[2]), where: c, text: s }); continue;
  }
  if (s === `update ${T} set score = null where score is not null and score !~ '[0-9]'`) { ops.push({ op: 'score' }); continue; }
  if ((m = s.match(new RegExp(`^delete from ${T.replace('.', '\\.')} where (.*)$`)))) {
    const c = conds(m[1]); if (!c) { parseProblems.push('unreadable where: ' + s.slice(0, 120)); continue; }
    ops.push({ op: 'delete', where: c, text: s }); continue;
  }
  if ((m = s.match(new RegExp(`^insert into ${T.replace('.', '\\.')} \\(tournament, category, year, edition, champion\\) select ${STR}, ${STR}, (\\d+), (?:${STR}|null), ${STR} where not exists \\(select 1 from ${T.replace('.', '\\.')} where tournament = ${STR} and category = ${STR} and year = (\\d+) and coalesce\\(edition, ''\\) = ${STR}\\)$`)))) {
    ops.push({ op: 'insert', row: { tournament: lit(m[1]), category: lit(m[2]), year: +m[3], edition: m[4] === undefined ? null : lit(m[4]), champion: lit(m[5]) },
      guard: { tournament: lit(m[6]), category: lit(m[7]), year: +m[8], edition: lit(m[9]) }, text: s });
    continue;
  }
  if (s === `create unique index tennis_grand_slam_winners_one_per_edition on ${T} (tournament, category, year, coalesce(edition, ''))`) { ops.push({ op: 'unique' }); continue; }
  parseProblems.push('a statement this harness cannot replay: ' + s.slice(0, 120));
}
if (doBlocks.length !== 2) parseProblems.push(`expected an opening and a closing guard block, found ${doBlocks.length}`);
check('parse', parseProblems, `${ops.length} statements replayed, ${doBlocks.length} guard blocks`);

/* ---------- the end state the record promises, hashed the way the SQL hashes it ---------- */
const recEnd = record.rows.filter(r => r.status !== 'dropped');
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const endHash = rows => {
  const s = rows.map(r => ({ y: r.year, t: r.tournament, c: r.category, e: r.edition ?? '', ch: r.champion ?? '<NULL>' }))
    .sort((a, b) => a.y - b.y || cmp(a.t, b.t) || cmp(a.c, b.c) || cmp(a.e, b.e));
  return crypto.createHash('md5').update(s.map(r => `${r.y}|${r.t}|${r.c}|${r.e}|${r.ch}`).join('\n')).digest('hex');
};
{
  const p = [];
  const [pre, post] = doBlocks;
  const pm = (pre || '').match(/if n <> (\d+) or h <> '([0-9a-f]{32})' then\s+raise exception/);
  if (!pm) p.push('the opening guard does not compare a row count and an md5 and raise');
  else if (+pm[1] !== record.snapshot.rows || pm[2] !== record.snapshot.md5) p.push(`the opening guard names ${pm[1]} rows, md5 ${pm[2]}; the read was ${record.snapshot.rows} rows, md5 ${record.snapshot.md5}`);
  if (pre && !pre.includes(`md5(string_agg(id || '|' || year || '|' || tournament || '|' || category || '|' || coalesce(champion, '<NULL>'), E'\\n' order by id))`)) p.push('the opening guard hashes a different shape than the record read');
  const qm = (post || '').match(/if n <> (\d+) or h <> '([0-9a-f]{32})' then\s+raise exception/);
  const want = endHash(recEnd);
  if (!qm) p.push('the closing guard does not compare a row count and an md5 and raise');
  else if (+qm[1] !== recEnd.length || qm[2] !== want) p.push(`the closing guard names ${qm[1]} rows, md5 ${qm[2]}; the record's end state is ${recEnd.length} rows, md5 ${want}`);
  if (post && !post.includes(`order by year, tournament collate "C", category collate "C", coalesce(edition, '') collate "C"`)) p.push('the closing guard orders its hash differently from this harness');
  check('hash', p, `read ${record.snapshot.rows} rows ${record.snapshot.md5}, end ${recEnd.length} rows ${want}`);
}

/* ---------- replay ---------- */
let table = record.rows.filter(r => r.status !== 'filled').map(r => ({
  id: r.id, tournament: r.tournament, category: r.category, year: r.year,
  edition: r.read.edition ?? null, champion: r.read.champion, score: (record.scores || {})[String(r.id)] ?? null, hasEdition: false,
}));
const byId = new Map(record.rows.filter(r => r.id !== null).map(r => [r.id, r]));
const guardProblems = []; const uniqueProblems = [];
let nextId = 100000;
const match = (row, w) => Object.entries(w).every(([k, v]) => (k === 'edition' ? (row.edition ?? null) : row[k]) === v);
for (const o of ops) {
  if (o.op === 'addcol') { for (const r of table) r.hasEdition = true; continue; }
  if (o.op === 'set' || o.op === 'delete') {
    const w = o.where, rec = byId.get(w.id);
    const need = ['id', 'tournament', 'category', 'year', 'champion'];
    const missing = need.filter(k => !(k in w));
    if (missing.length) guardProblems.push(`${o.text.slice(0, 90)}... does not guard on ${missing.join(', ')}`);
    else if (!rec) guardProblems.push(`${o.text.slice(0, 90)}... names id ${w.id}, which the record never read`);
    else {
      for (const k of ['tournament', 'category', 'year']) if (w[k] !== rec[k]) guardProblems.push(`id ${w.id}: guard ${k} ${w[k]} is not the record's ${rec[k]}`);
      if (w.champion !== rec.read.champion) guardProblems.push(`id ${w.id}: guard champion ${w.champion} is not the value read, ${rec.read.champion}`);
    }
    if (o.op === 'set' && o.col === 'edition' && !('edition' in w)) guardProblems.push(`id ${w.id}: the edition update does not require the edition to be unset`);
    if (o.op === 'delete') table = table.filter(r => !match(r, w));
    else for (const r of table) if (match(r, w)) r[o.col] = o.value;
    continue;
  }
  if (o.op === 'insert') {
    const g = o.guard, r = o.row;
    if (g.tournament !== r.tournament || g.category !== r.category || g.year !== r.year || g.edition !== (r.edition ?? '')) guardProblems.push(`the insert of ${r.year} ${r.tournament} ${r.category} ${r.champion} checks a different event in its not exists`);
    const exists = table.some(x => x.tournament === g.tournament && x.category === g.category && x.year === g.year && (x.edition ?? '') === g.edition);
    if (!exists) table.push({ id: nextId++, ...r, score: null, hasEdition: true });
    continue;
  }
  if (o.op === 'score') { for (const r of table) if (r.score !== null && !/[0-9]/.test(r.score)) r.score = null; continue; }
  if (o.op === 'unique') continue;
}
{
  const seen = new Map();
  for (const r of table) { const k = `${r.tournament}|${r.category}|${r.year}|${r.edition ?? ''}`; if (seen.has(k)) uniqueProblems.push(`two rows for ${k}: ${seen.get(k)} and ${r.champion}`); seen.set(k, r.champion); }
  if (!ops.some(o => o.op === 'unique')) uniqueProblems.push('the migration does not create the one row per edition index');
}
check('guard', guardProblems, `${ops.filter(o => o.op === 'set' || o.op === 'delete').length} updates and deletes, ${ops.filter(o => o.op === 'insert').length} inserts`);

/* ---------- judge the end state ---------- */
const endById = new Map(table.filter(r => r.id < 100000).map(r => [r.id, r]));
const keyOf = r => `${r.tournament}|${r.category}|${r.year}|${r.edition ?? ''}`;
{
  const p = [];
  for (const r of record.rows.filter(x => x.status === 'verified' || x.status === 'corrected')) {
    const e = endById.get(r.id); if (!e) continue;
    if (e.champion !== r.champion) p.push(`id ${r.id} ${r.year} ${r.tournament} ${r.category}: ends as ${e.champion}, the record says ${r.champion}`);
    if ((e.edition ?? null) !== (r.edition ?? null)) p.push(`id ${r.id} ${r.year} ${r.tournament} ${r.category}: edition ends as ${e.edition}, the record says ${r.edition}`);
  }
  check('agree', p, `${record.rows.filter(x => x.status === 'verified' || x.status === 'corrected').length} verified and corrected rows compared`);
}
{
  const p = [];
  for (const r of record.rows.filter(x => x.status !== 'dropped')) {
    const found = r.id !== null ? endById.has(r.id) : table.some(e => e.id >= 100000 && keyOf(e) === keyOf(r) && e.champion === r.champion);
    if (!found) p.push(`${r.status} row missing: ${r.year}${r.edition ? ' ' + r.edition : ''} ${r.tournament} ${r.category} ${r.champion}`);
  }
  check('present', p, `${record.rows.filter(x => x.status !== 'dropped').length} rows expected`);
}
{
  const p = record.rows.filter(x => x.status === 'dropped' && endById.has(x.id)).map(r => `dropped row survives: id ${r.id} ${r.year} ${r.tournament} ${r.category} ${r.read.champion}`);
  check('dropped', p, `${record.rows.filter(x => x.status === 'dropped').length} dropped rows`);
}
const PLACEHOLDER = /^\s*$|^(tbd|tba|tbc|unknown|n\/?a|none|null|pending|winner|champion|placeholder|-+|\u2014|\?+)$/i;
{
  const p = table.filter(r => r.champion === null || PLACEHOLDER.test(r.champion)).map(r => `${r.year} ${r.tournament} ${r.category} ends with champion ${JSON.stringify(r.champion)}`);
  check('placeholder', p, `${table.length} rows in the end state`);
}
{
  const known = new Set(record.rows.filter(x => x.status === 'filled').map(r => `${keyOf(r)}|${r.champion}`));
  const p = table.filter(r => r.id >= 100000 && r.champion !== null && !PLACEHOLDER.test(r.champion) && !known.has(`${keyOf(r)}|${r.champion}`))
    .map(r => `a row the record does not know: ${r.year} ${r.tournament} ${r.category} ${r.champion}`);
  check('stray', p, `${table.filter(r => r.id >= 100000).length} inserted rows`);
}
check('unique', uniqueProblems, 'one row per tournament, category, year and edition');
{
  const p = [];
  const stored = Object.entries(record.scores || {});
  const readIds = new Set(record.rows.filter(r => r.id !== null).map(r => String(r.id)));
  if (stored.length !== record.counts.scoresKept) p.push(`the record keeps ${stored.length} scores, counts.scoresKept says ${record.counts.scoresKept}`);
  for (const [id, v] of stored) {
    if (!readIds.has(id)) p.push(`a score is kept for id ${id}, which the record never read`);
    if (typeof v !== 'string' || !v.length) p.push(`the score kept for id ${id} is not a value`);
    else if (/[0-9]/.test(v)) p.push(`the score kept for id ${id} holds a digit (${v}), so the cleanup would keep it and the model is wrong`);
  }
  const kept = table.filter(r => r.score !== null && !/[0-9]/.test(r.score)).length;
  if (kept) p.push(`${kept} rows keep a score with no digit in it`);
  check('score', p, `${stored.length} stored scores kept in the record, scores without a digit are cleared`);
}
{
  const p = []; const STATUS = new Set(['verified', 'corrected', 'filled', 'dropped']);
  for (const r of record.rows) {
    const tag = `${r.id ?? 'new'} ${r.year} ${r.tournament} ${r.category}`;
    if (!STATUS.has(r.status)) p.push(`${tag}: status ${r.status}`);
    if (!Array.isArray(r.sources) || r.sources.length !== 2 || new Set(r.sources).size !== 2) p.push(`${tag}: needs two distinct sources`);
    else for (const u of r.sources) { if (!/^https:\/\/[^\s/]+\.[^\s/]+\//.test(u)) p.push(`${tag}: source ${u} is not a URL`); if (/wikipedia\.org/i.test(u)) p.push(`${tag}: Wikipedia is a spot check, not a source (${u})`); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked || '')) p.push(`${tag}: no check date`);
    if (r.status === 'dropped' && !r.reason) p.push(`${tag}: dropped without a reason`);
    if (r.status !== 'dropped' && (!r.champion || PLACEHOLDER.test(r.champion))) p.push(`${tag}: kept without a champion`);
  }
  const c = s => record.rows.filter(r => r.status === s).length;
  const counts = record.counts;
  if (counts.read !== record.rows.filter(r => r.id !== null).length || counts.read !== record.snapshot.rows) p.push(`read count ${counts.read} does not match the rows read`);
  for (const s of ['verified', 'corrected', 'filled', 'dropped']) if (counts[s] !== c(s)) p.push(`count ${s} ${counts[s]} but ${c(s)} rows`);
  if (counts.endState !== record.rows.length - c('dropped')) p.push(`endState ${counts.endState} is not rows minus dropped`);
  check('sources', p, `${record.rows.length} record rows`);
}

/* ---------- report ---------- */
for (const r of results) {
  if (r.problems.length) { console.log(`  FAIL ${r.name}: ${r.problems.length} problem(s), ${r.detail}`); for (const x of r.problems.slice(0, 8)) console.log(`       ${x}`); }
  else console.log(`  ok   ${r.name}: ${r.detail}`);
}
const failed = results.filter(r => r.problems.length).map(r => r.name);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (failed.length === 1 && failed[0] === want) { console.log(`simTennisSlams CONTROL ${CONTROL}: only ${want} went red, as planted`); process.exit(1); }
  console.log(`simTennisSlams CONTROL ${CONTROL} MISFIRED: expected only ${want} red, got [${failed.join(', ')}]`);
  process.exit(2);
}
console.log(`simTennisSlams: ${results.length} checks, ${failed.length} failed; end state ${table.length} rows (record ${recEnd.length}), ${record.counts.verified} verified, ${record.counts.corrected} corrected, ${record.counts.filled} filled, ${record.counts.dropped} dropped`);
process.exit(failed.length ? 1 : 0);
