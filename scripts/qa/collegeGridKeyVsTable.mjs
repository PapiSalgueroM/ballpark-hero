/* scripts/qa/collegeGridKeyVsTable.mjs  (Round 1105)

   A RELEASE FENCE, RUN BY HAND, ONCE PER RELEASE. IT READS PRODUCTION.
   It is deliberately not named sim*: scripts/runAllSims.mjs runs every
   scripts/sim*.mjs, and nothing that pages a live table belongs in that run
   (the outage of 2026-10-02 was heavy test reads against the live database).

   WHAT IT COMPARES. The committed answer key, scripts/data/collegeGridPlayers.json,
   with public.college_grid_players, row by row on id, over the columns the
   table holds. Until Round 1105 this was section 8b of
   scripts/simCollegeGridKey.mjs, because the College Grid page judged from that
   table. The page no longer reads it (the key ships with the site as two files
   generated from the committed file), so the table is no longer what players
   are judged against; it is still loaded from the same file, and a difference
   means one of the two is stale.

   WHAT IT PRINTS: the rows only in the table, the rows only in the file and the
   rows whose columns differ (the first 20 and a count of each).

   EXIT CODES
     0  the two are equal
     0  with a loud line: the table's only extra rows are exactly AUDITED_OUT
        (scripts/genCollegeGridData.mjs). Expected until the Round 706
        migration is applied and the table is reloaded from the key: the key
        dropped those thirteen rows in Round 1105 and the table still has them.
     1  any other difference
     2  the table could not be read: NOTHING WAS COMPARED

   Run (the lead, at the gate):  node scripts/qa/collegeGridKeyVsTable.mjs
   Offline, no request at all:    node scripts/qa/collegeGridKeyVsTable.mjs --selftest
     feeds the comparison planted rows (equal, the thirteen extra, one stray
     row, one changed column) and checks all four outcomes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDITED_OUT, COLUMNS, foldName } from '../genCollegeGridData.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const KEY_FILE = path.join(ROOT, 'scripts', 'data', 'collegeGridPlayers.json');
const TABLE_COLUMNS = ['id', 'display_name', 'name_norm', 'colleges', 'colleges_agreed', 'groups', 'best_pick', 'first_round', 'undrafted', 'heisman_year', 'first_season', 'seasons', 'dup'];
const SHOW = 20;

const fileRowsAsObjects = (rows) => rows.map((r) => Object.fromEntries(COLUMNS.map((c, i) => [c, r[i]])));
const canon = (row) => JSON.stringify(TABLE_COLUMNS.map((c) => row[c] ?? null));
const auditedId = (a) => `draft:${a.year}-${a.pick}`;

/** Rows only in the table, rows only in the file, and rows whose table columns differ. Pure. */
export function compareKeyWithTable(tableRows, fileRows) {
  const inTable = new Map(tableRows.map((r) => [String(r.id), r]));
  const inFile = new Map(fileRows.map((r) => [String(r.id), r]));
  const onlyTable = tableRows.filter((r) => !inFile.has(String(r.id)));
  const onlyFile = fileRows.filter((r) => !inTable.has(String(r.id)));
  const changed = [];
  for (const [id, f] of inFile) {
    const t = inTable.get(id);
    if (!t || canon(t) === canon(f)) continue;
    changed.push({ id, columns: TABLE_COLUMNS.filter((c) => JSON.stringify(t[c] ?? null) !== JSON.stringify(f[c] ?? null)) });
  }
  return { onlyTable, onlyFile, changed, duplicateIds: tableRows.length - inTable.size };
}

/** equal, audited (the table's only extra rows are exactly the thirteen) or different. Pure. */
export function verdictOf(diff) {
  if (diff.duplicateIds) return 'different';
  if (!diff.onlyTable.length && !diff.onlyFile.length && !diff.changed.length) return 'equal';
  if (diff.onlyFile.length || diff.changed.length || diff.onlyTable.length !== AUDITED_OUT.length) return 'different';
  const listed = new Map(AUDITED_OUT.map((a) => [auditedId(a), foldName(a.name)]));
  const allListed = diff.onlyTable.every((r) => listed.get(String(r.id)) === foldName(r.display_name));
  return allListed && new Set(diff.onlyTable.map((r) => String(r.id))).size === AUDITED_OUT.length ? 'audited' : 'different';
}

function printDiff(diff, log = console.log) {
  const show = (title, list, line) => {
    log(`${title}: ${list.length}`);
    for (const x of list.slice(0, SHOW)) log(`   ${line(x)}`);
    if (list.length > SHOW) log(`   ... and ${list.length - SHOW} more`);
  };
  show('rows only in the table', diff.onlyTable, (r) => `${r.id}  ${r.display_name}`);
  show('rows only in the file', diff.onlyFile, (r) => `${r.id}  ${r.display_name}`);
  show('rows whose columns differ', diff.changed, (c) => `${c.id}  ${c.columns.join(', ')}`);
  if (diff.duplicateIds) log(`ids the table holds more than once: ${diff.duplicateIds}`);
}

function selftest() {
  const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  const rows = fileRowsAsObjects(file.rows.slice(0, 40));
  if (rows.length !== 40) throw new Error('the committed key holds fewer than 40 rows');
  const copy = () => rows.map((r) => ({ ...r }));
  const thirteen = AUDITED_OUT.map((a) => ({ ...rows[0], id: auditedId(a), display_name: a.name, name_norm: foldName(a.name) }));
  const cases = [
    ['a table equal to the file', copy(), 'equal'],
    ['the table holding exactly the thirteen audited rows more', [...copy(), ...thirteen], 'audited'],
    ['twelve of the thirteen', [...copy(), ...thirteen.slice(1)], 'different'],
    ['the thirteen ids under other names', [...copy(), ...thirteen.map((r) => ({ ...r, display_name: `${r.display_name} Probe` }))], 'different'],
    ['one stray row in the table', [...copy(), { ...rows[1], id: 'probe:stray', display_name: 'Probe Stray' }], 'different'],
    ['the thirteen and one stray row', [...copy(), ...thirteen, { ...rows[1], id: 'probe:stray', display_name: 'Probe Stray' }], 'different'],
    ['one row missing from the table', copy().slice(1), 'different'],
    ['one changed column', copy().map((r, i) => (i === 3 ? { ...r, best_pick: (r.best_pick ?? 0) + 1 } : r)), 'different'],
    ['the same id twice in the table', [...copy(), { ...rows[2] }], 'different'],
  ];
  let bad = 0;
  for (const [what, table, want] of cases) {
    const diff = compareKeyWithTable(table, rows);
    const got = verdictOf(diff);
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}: ${got}${ok ? '' : `, expected ${want}`} (only in table ${diff.onlyTable.length}, only in file ${diff.onlyFile.length}, changed ${diff.changed.length})`);
  }
  const changedOne = compareKeyWithTable(copy().map((r, i) => (i === 3 ? { ...r, best_pick: (r.best_pick ?? 0) + 1 } : r)), rows);
  if (changedOne.changed.length !== 1 || changedOne.changed[0].columns.join() !== 'best_pick') { bad += 1; console.log('FAIL the changed column is not named'); }
  console.log(bad ? `collegeGridKeyVsTable --selftest: red, ${bad} outcome${bad === 1 ? '' : 's'} wrong.` : `collegeGridKeyVsTable --selftest: green, all ${cases.length} planted worlds gave the expected outcome. No request was made.`);
  process.exit(bad ? 1 : 0);
}

/** The table's rows in pages of 1,000 ordered on id (lifted from simCollegeGridKey section 8b). */
async function readTable() {
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let r;
    try {
      r = await fetch(`${url}/rest/v1/college_grid_players?select=${TABLE_COLUMNS.join(',')}&order=id.asc&offset=${from}&limit=1000`, { headers, signal: AbortSignal.timeout(30000) });
    } catch (err) {
      return { error: `the database is unreachable (${String(err).slice(0, 80)})` };
    }
    if (!r.ok) return { error: `HTTP ${r.status} on the page from ${from}: ${(await r.text().catch(() => '')).slice(0, 160)}` };
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { rows };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--selftest')) selftest();
  const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  const table = await readTable();
  if (table.error) {
    console.error(`collegeGridKeyVsTable: NOTHING WAS COMPARED. ${table.error}`);
    process.exit(2);
  }
  const diff = compareKeyWithTable(table.rows, fileRowsAsObjects(file.rows));
  const verdict = verdictOf(diff);
  console.log(`the table holds ${table.rows.length} rows and the committed key ${file.rows.length}`);
  printDiff(diff);
  if (verdict === 'equal') console.log('collegeGridKeyVsTable: green. The table and the committed key are equal.');
  else if (verdict === 'audited') console.log(`collegeGridKeyVsTable: green, WITH A DIFFERENCE THAT IS EXPECTED FOR NOW. THE TABLE STILL HOLDS THE ${AUDITED_OUT.length} AUDITED 1977 ROWS THE KEY DROPPED IN ROUND 1105 AND NOTHING ELSE DIFFERS. It goes away when the Round 706 migration is applied and the table is reloaded from the key. The page does not read this table.`);
  else console.error('collegeGridKeyVsTable: red. The table and the committed key differ beyond the audited rows (above).');
  process.exit(verdict === 'different' ? 1 : 0);
}
