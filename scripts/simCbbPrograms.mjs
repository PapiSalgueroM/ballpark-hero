/**
 * Round 531 piece 3: the cbb_programs table against the record.
 *
 * The 24 rows /guess-cbb-team was seeded with on 2026-06-14 were generated
 * from memory and never checked (docs/audits/cbb_programs_audit.md). They
 * were verified two source on 2026-09-11
 * (docs/audits/cbb-programs-verification-2026-09-11.md) and this harness
 * holds that truth against the LIVE table, the simSilverwareSort shape: the
 * record typed in here from the evidence file, the table must agree.
 *
 * DERIVED, NOT TYPED TWICE. The record is the champion list itself, one
 * entry per tournament from 1939 to 2026, as Wikipedia's champions list and
 * ESPN's all-time winners list both give it. Each school's count and years
 * fall out of that list, so a count cannot drift from its years. The one
 * thing typed per school is its conference (the 2026-27 membership, which
 * the evidence file checked against ESPN's 2025-26 standings and the 2026-27
 * realignment list). Vacated titles are not in the list (Louisville 2013).
 *
 * HOW THE HINTS ARE READ. championships_hint leads with the count ("6
 * national titles (1999, ...)"), so the count is the leading integer. The
 * years are the four digit numbers inside the first parenthesis after
 * "national title(s)"; a zero title row has no such parenthesis (its text
 * names runner-up finishes) and is not year checked, and UCLA's years are a
 * range so it is text checked for "1964-1975" instead. conference_hint is
 * read as everything before its first " (", so a hint may name the old
 * conference in the parenthesis and still parse as the new one. mascot_hint
 * must name the verified home arena, because two rows carried a building
 * name that changed in 2025 and a hint can go stale without a title moving.
 *
 * FAILS CLOSED. When the table cannot be read the harness exits 1 and says
 * nothing was checked; it never passes on an empty pull. Rows the
 * migration 20260911120000 corrects fail against the live table until the
 * desktop lane applies it and are printed as "pending migration
 * 20260911120000" (the set is parsed from the migration file, not typed).
 *
 * NEGATIVE CONTROL: CBB_CONTROL=count hands the 2015 title to a school
 * outside the 24, so one derived count (Duke) is off by one and section 2
 * must go red. It refuses to run if the list does not say Duke for 2015.
 *
 * PREVIEW: CBB_PREVIEW=migration applies the migration's SET values to the
 * pulled rows in memory and must come back green, which is how "green once
 * the migration is applied" was proven before anyone applied it.
 *
 * Run: node scripts/simCbbPrograms.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CBB_CONTROL || '';
if (CONTROL && CONTROL !== 'count') { console.error(`CBB_CONTROL=${CONTROL} is not a control this harness knows (count)`); process.exit(1); }
const MIGRATION = '20260911120000';
const PREVIEW = process.env.CBB_PREVIEW === 'migration';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ------------------------------------------------------------------ */
/* The record: every NCAA Division I men's tournament, 1939 to 2026.   */
/* Names are the table's school_name spellings. 2020 was not held.     */
/* Louisville's 2013 title is vacated and is deliberately absent.       */
/* ------------------------------------------------------------------ */
const CHAMPIONS = {
  1939: 'Oregon', 1940: 'Indiana', 1941: 'Wisconsin', 1942: 'Stanford', 1943: 'Wyoming',
  1944: 'Utah', 1945: 'Oklahoma State', 1946: 'Oklahoma State', 1947: 'Holy Cross',
  1948: 'Kentucky', 1949: 'Kentucky', 1950: 'CCNY', 1951: 'Kentucky', 1952: 'Kansas',
  1953: 'Indiana', 1954: 'La Salle', 1955: 'San Francisco', 1956: 'San Francisco',
  1957: 'North Carolina', 1958: 'Kentucky', 1959: 'California', 1960: 'Ohio State',
  1961: 'Cincinnati', 1962: 'Cincinnati', 1963: 'Loyola Chicago', 1964: 'UCLA', 1965: 'UCLA',
  1966: 'UTEP', 1967: 'UCLA', 1968: 'UCLA', 1969: 'UCLA', 1970: 'UCLA', 1971: 'UCLA',
  1972: 'UCLA', 1973: 'UCLA', 1974: 'North Carolina State', 1975: 'UCLA', 1976: 'Indiana',
  1977: 'Marquette', 1978: 'Kentucky', 1979: 'Michigan State', 1980: 'Louisville',
  1981: 'Indiana', 1982: 'North Carolina', 1983: 'North Carolina State', 1984: 'Georgetown',
  1985: 'Villanova', 1986: 'Louisville', 1987: 'Indiana', 1988: 'Kansas', 1989: 'Michigan',
  1990: 'UNLV', 1991: 'Duke', 1992: 'Duke', 1993: 'North Carolina', 1994: 'Arkansas',
  1995: 'UCLA', 1996: 'Kentucky', 1997: 'Arizona', 1998: 'Kentucky', 1999: 'Connecticut',
  2000: 'Michigan State', 2001: 'Duke', 2002: 'Maryland', 2003: 'Syracuse',
  2004: 'Connecticut', 2005: 'North Carolina', 2006: 'Florida', 2007: 'Florida',
  2008: 'Kansas', 2009: 'North Carolina', 2010: 'Duke', 2011: 'Connecticut',
  2012: 'Kentucky', 2013: null, 2014: 'Connecticut', 2015: 'Duke', 2016: 'Villanova',
  2017: 'North Carolina', 2018: 'Villanova', 2019: 'Virginia', 2020: null, 2021: 'Baylor',
  2022: 'Kansas', 2023: 'Connecticut', 2024: 'Connecticut', 2025: 'Florida', 2026: 'Michigan',
};
const NOT_HELD = new Set([2020]);
const VACATED = new Set([2013]);

/* the 24 audited rows: the 2026-27 conference, typed from the evidence file */
const CONFERENCES = {
  'Gonzaga': 'Pac-12 Conference',
  'Houston': 'Big 12 Conference',
  'Baylor': 'Big 12 Conference',
  'Kansas': 'Big 12 Conference',
  'Cincinnati': 'Big 12 Conference',
  'Ohio State': 'Big Ten Conference',
  'Duke': 'Atlantic Coast Conference',
  'Virginia': 'Atlantic Coast Conference',
  'UCLA': 'Big Ten Conference',
  'Kentucky': 'Southeastern Conference',
  'Indiana': 'Big Ten Conference',
  'Connecticut': 'Big East Conference',
  'Louisville': 'Atlantic Coast Conference',
  'Michigan State': 'Big Ten Conference',
  'Arkansas': 'Southeastern Conference',
  'Villanova': 'Big East Conference',
  'Arizona': 'Big 12 Conference',
  'Maryland': 'Big Ten Conference',
  'North Carolina State': 'Atlantic Coast Conference',
  'Michigan': 'Big Ten Conference',
  'Syracuse': 'Atlantic Coast Conference',
  'Georgetown': 'Big East Conference',
  'Florida': 'Southeastern Conference',
  'North Carolina': 'Atlantic Coast Conference',
};
/* the home arena each mascot_hint must name, typed from the evidence file; two
   of the 24 rows carried a name the building lost in 2025, which is why the
   fence reads this field at all (Syracuse's hint describes its dome rather
   than naming it, and that description holds) */
const ARENAS = {
  'Gonzaga': 'McCarthey Athletic Center',
  'Houston': 'Fertitta Center',
  'Baylor': 'Foster Pavilion',
  'Kansas': 'Allen Fieldhouse',
  'Cincinnati': 'Fifth Third Arena',
  'Ohio State': 'Value City Arena',
  'Duke': 'Cameron Indoor Stadium',
  'Virginia': 'John Paul Jones Arena',
  'UCLA': 'Pauley Pavilion',
  'Kentucky': 'Rupp Arena',
  'Indiana': 'Assembly Hall',
  'Connecticut': 'PeoplesBank Arena',
  'Louisville': 'KFC Yum! Center',
  'Michigan State': 'Breslin Center',
  'Arkansas': 'Bud Walton Arena',
  'Villanova': 'Xfinity Mobile Arena',
  'Arizona': 'McKale Center',
  'Maryland': 'Xfinity Center',
  'North Carolina State': 'Lenovo Center',
  'Michigan': 'Crisler Center',
  'Syracuse': 'domed stadium',
  'Georgetown': 'Capital One Arena',
  'Florida': "O'Connell Center",
  'North Carolina': 'Dean Smith Center',
};
/* rows whose years are not a plain list in the hint, checked by text instead */
const YEARS_AS_TEXT = { 'UCLA': '1964-1975' };
const AUDITED = Object.keys(CONFERENCES);

if (CONTROL === 'count') {
  if (CHAMPIONS[2015] !== 'Duke') { console.error('control cannot run: the list does not say Duke for 2015, so handing it away would change nothing'); process.exit(1); }
  CHAMPIONS[2015] = 'Marquette';
  console.log('NEGATIVE CONTROL ON: the 2015 title is handed to Marquette, Duke derives to 4, section 2 must go red');
}

/* ------------------------------------------------- 0: the record itself */
console.log('0) the record is one champion per tournament held');
const yearsInList = Object.keys(CHAMPIONS).map(Number);
if (yearsInList.length !== 2026 - 1939 + 1) fail(`the list holds ${yearsInList.length} years, expected ${2026 - 1939 + 1} (1939 to 2026)`);
for (const y of yearsInList) {
  const held = !NOT_HELD.has(y) && !VACATED.has(y);
  if (held && !CHAMPIONS[y]) fail(`${y}: no champion typed for a tournament that was held`);
  if (!held && CHAMPIONS[y]) fail(`${y}: a champion typed for a year that was not held or was vacated`);
}
const titles = {};
for (const [y, school] of Object.entries(CHAMPIONS)) {
  if (!school) continue;
  (titles[school] ??= []).push(Number(y));
}
const auditedTitles = AUDITED.reduce((n, s) => n + (titles[s]?.length ?? 0), 0);
console.log(`   ${yearsInList.length} years, ${Object.values(CHAMPIONS).filter(Boolean).length} titles, ${auditedTitles} of them at the 24 audited schools`);

/* -------------------------------------------- 1: the live table, whole */
console.log('1) the live table');
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
const keyMatch = clientTs.match(/eyJ[A-Za-z0-9_.-]+/);
if (!urlMatch || !keyMatch) { console.error('FATAL: could not extract the Supabase URL and key from client.ts'); process.exit(1); }
/* Connection: close so the socket is gone before the verdict. Calling
   process.exit with a keep-alive fetch socket still closing trips a libuv
   assertion on Windows and the exit code comes back as 127, so the verdict
   is set through process.exitCode and the loop is left to drain. */
const headers = { apikey: keyMatch[0], Authorization: `Bearer ${keyMatch[0]}`, Prefer: 'count=exact', Connection: 'close' };

let rows = null, exact = null, why = '';
try {
  const res = await fetch(`${urlMatch[0]}/rest/v1/cbb_programs?select=*&order=id.asc`, { headers });
  if (res.ok) {
    rows = await res.json();
    exact = Number((res.headers.get('content-range') ?? '').split('/')[1]);
  } else why = `HTTP ${res.status}`;
} catch (e) { rows = null; why = e?.message ?? String(e); }
if (!Array.isArray(rows) || rows.length === 0 || !Number.isFinite(exact)) {
  console.error(`simCbbPrograms: FAIL. The cbb_programs table was unreachable (${why || 'empty pull'}) and NOTHING WAS CHECKED.`);
  process.exitCode = 1;
} else {
  checkRows();
}

function checkRows() {
if (exact !== rows.length) fail(`select count(*) says ${exact} rows, the pull returned ${rows.length}: the table is paged and the check is partial`);
const byName = new Map();
for (const r of rows) {
  if (byName.has(r.school_name)) fail(`school_name ${r.school_name} appears more than once`);
  byName.set(r.school_name, r);
}
const unaudited = rows.length - AUDITED.length;
console.log(`   ${rows.length} rows (count ${exact}); ${AUDITED.length} audited on 2026-09-11, ${unaudited} NOT VERIFIED BY ANY AUDIT YET`);
const longDash = rows.filter(r => [...JSON.stringify(r)].some(ch => ch.charCodeAt(0) === 8211 || ch.charCodeAt(0) === 8212));
if (longDash.length) console.log(`   NOTE: ${longDash.length} unaudited row(s) carry a long dash: ${longDash.map(r => r.school_name).join(', ')}`);
const oddShape = rows.filter(r => !/^\d+ national title/.test(r.championships_hint));
if (oddShape.length) console.log(`   NOTE: ${oddShape.length} row(s) do not lead with "N national title": ${oddShape.map(r => r.school_name).join(', ')}`);

/* ------------------------------------ 2: the 24 rows against the record */
console.log('2) the 24 audited rows against the record');
const migrationSql = fs.readFileSync(path.join(ROOT, 'supabase/migrations', `${MIGRATION}_cbb_programs_verified.sql`), 'utf8');
const updates = [...migrationSql.matchAll(/set (\w+) = '([^']*)'\s+where school_name = '([^']+)'/g)].map(m => ({ column: m[1], value: m[2], school: m[3] }));
const pending = new Set(updates.map(u => u.school));
if (pending.size === 0) fail(`migration ${MIGRATION} names no school_name, the pending set cannot be derived`);
/* CBB_PREVIEW=migration applies the migration's own SET values to the pulled
   rows in memory, the proof that the file the desktop lane will run and the
   pins above agree: the run must come back green with nothing pending. */
if (PREVIEW) {
  for (const u of updates) {
    const row = byName.get(u.school);
    if (!row) { fail(`preview: migration names ${u.school}, which is not in the table`); continue; }
    row[u.column] = u.value;
  }
  pending.clear();
  console.log(`   PREVIEW: ${updates.length} migration updates applied in memory, nothing may be pending`);
}

const parseCount = hint => { const m = /^(\d+)\b/.exec(hint ?? ''); return m ? Number(m[1]) : null; };
const parseYears = hint => {
  const m = /^\d+ national titles? \(([^)]*)\)/.exec(hint ?? '');
  return m ? (m[1].match(/\b(19|20)\d\d\b/g) ?? []).map(Number) : null;
};
const parseConference = hint => (hint ?? '').split(' (')[0].trim();

let checked = 0, pendingRows = 0;
for (const school of AUDITED) {
  const row = byName.get(school);
  if (!row) { fail(`${school}: not in the live table`); continue; }
  const problems = [];
  const want = titles[school] ?? [];
  const count = parseCount(row.championships_hint);
  if (count !== want.length) problems.push(`championships_hint says ${count} title(s), the record says ${want.length}`);
  if (want.length > 0) {
    if (YEARS_AS_TEXT[school]) {
      if (!row.championships_hint.includes(YEARS_AS_TEXT[school])) problems.push(`championships_hint does not carry "${YEARS_AS_TEXT[school]}"`);
    } else {
      const years = parseYears(row.championships_hint);
      if (!years) problems.push('championships_hint has no year list to read');
      else if (years.join(',') !== want.join(',')) problems.push(`championships_hint lists ${years.join(', ') || 'no years'}, the record says ${want.join(', ')}`);
    }
  }
  const conf = parseConference(row.conference_hint);
  if (conf !== CONFERENCES[school]) problems.push(`conference_hint reads "${conf}", the record says "${CONFERENCES[school]}"`);
  if (!(row.mascot_hint ?? '').includes(ARENAS[school])) problems.push(`mascot_hint does not name ${ARENAS[school]}: "${row.mascot_hint}"`);
  for (const field of ['vibe_word', 'region_hint', 'conference_hint', 'tournament_hint', 'championships_hint', 'mascot_hint']) {
    if ([...(row[field] ?? '')].some(ch => ch.charCodeAt(0) === 8211 || ch.charCodeAt(0) === 8212)) problems.push(`${field} carries a long dash`);
  }
  checked += 1;
  if (problems.length === 0) continue;
  const tag = pending.has(school) ? ` (pending migration ${MIGRATION})` : '';
  if (tag) pendingRows += 1;
  for (const p of problems) fail(`${school}: ${p}${tag}`);
}
console.log(`   ${checked} rows checked, ${pendingRows} failing only until migration ${MIGRATION} is applied`);

console.log('');
if (failures > 0) {
  console.error(`simCbbPrograms: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exitCode = 1;
  return;
}
console.log('simCbbPrograms: green. The 24 audited rows say what the record says.');
}
