/* College tables fence: Round 706's five migrations and the readers that mirror them.
 *
 * Round 706 wrote five migrations for the college tables (nfl_draft_picks,
 * ncaa_player_stats, cfb_qb_stats, cfb_rb_stats, cbb_programs) and changed the
 * readers so the games are right before the migrations land and unchanged
 * after: a name starting with "_" is a placeholder and no search offers it, a
 * draft row with no position and no college is a sentence about a pick and not
 * a player, and the three cbb programs filed twice are one program each. Every
 * one of those files names this harness as its fence. It runs offline, from
 * the branch's own files, and is deterministic:
 *
 *   1. THE PLACEHOLDER RULE has two copies (src/lib/placeholderName.ts for the
 *      app, scripts/lib/placeholderName.mjs for the offline scripts). Both are
 *      run over a table of names: leading underscore refused, real names kept,
 *      names with accents and other scripts kept, an underscore anywhere else
 *      kept. And the two files carry the same regex in their CODE (comments
 *      stripped first). The grid archive has a third, stricter rule of its own
 *      (scripts/lib/gridArchiveRules.mjs malformedName: no name with an
 *      underscore anywhere is PRINTED, which is a printing rule and not a
 *      placeholder rule, so "Not_A Placeholder" is kept here and not printed
 *      there). The two must never disagree the other way: every name the
 *      placeholder rule refuses, the archive refuses to print.
 *   2. CBB_PROGRAMS. The game's own dedupePrograms (src/lib/cbbPrograms.ts,
 *      bundled here) runs over scripts/data/cbbProgramTwins.json, the eight live
 *      rows the migration's three pairs and two Philadelphia programs with
 *      different courts. The fixture must carry every value the migration's
 *      WHERE clauses pin (the kept rows' names and arrays, the deleted rows'
 *      names, the dashed spelling as the SQL's U& constant decodes), and the rule
 *      must hide exactly the ids the SQL deletes, keep the partner the SQL pairs
 *      each with, and write exactly the common_names arrays the SQL writes. A
 *      hidden twin's own name stays a correct guess on its kept row, nothing but
 *      common_names changes on a kept row, and the home court guard holds: two
 *      programs in one city whose hints have no "plays at" never fold into one.
 *   3. THE DRAFT CLEANER (scripts/lib/draftRounds.mjs, the College Grid key's
 *      reader). A forfeit sentence, a "Selection moved down 12 spots" row and a
 *      row with blank position and college are placeholders; a player, a row with
 *      only a position and a row with only a college are kept; a pick 0 row is
 *      dropped; and the player wins a slot a placeholder holds at a lower id.
 *   4. THE MIGRATIONS. Each file is exactly one DO block, declares every
 *      constant once and checks every constant it declares, and its counts add
 *      up: rows before minus every delete equals rows after (the SQL states no
 *      inserts), the invented list holds as many rows as it declares, each cfb
 *      rk list is as long as its constant, the cbb pairs match its deletes, the
 *      nfl header's per year breakdown sums to the constants its block declares,
 *      and the rounds the nfl block reads back after step 3 agree with the picks
 *      docs/audits/college-tables-2026-09-30.md pins from two organisations,
 *      every pin on a round step 3 derives is read back (the pins marked parsed,
 *      rounds the scrape already had, are not owed one).
 *   5. THE COLLEGE GRID KEY BUILDER (scripts/genCollegeGridData.mjs) refuses a
 *      placeholder: a "_ Name" cfb stats row that would otherwise join a career
 *      joins nobody and adds no school.
 *   6. THE CALL SITES. Sections 1 and 2 hold the rules; this holds the places
 *      the games run them, so deleting a call, or feeding it the wrong list,
 *      goes red. src/lib/playerSearch.ts, src/lib/cbbGrid.ts and
 *      src/hooks/useCbbProgram.ts are bundled from the branch with three
 *      modules swapped (the database client becomes a table of rows in memory
 *      with PostgREST's filters and order applied, completion tracking does
 *      nothing, getTodayET returns the date under test) and the hook is mounted
 *      in jsdom. searchPlayers with the College Basketball Grid's own source
 *      offers the probe players and never a "_ Surname" row, although the
 *      placeholders carry the most points. The hook, over the eight fixture
 *      rows: the search list is exactly the rows the cbb migration keeps, with
 *      the arrays it writes; the daily on 16 consecutive dates (every slot of
 *      the eight) is pool[date % 8] over the rows in id order with a twin's slot
 *      dealing its kept row, so the code moves no date's puzzle; a cbb_daily
 *      row naming a hidden twin deals its kept row, on which every name the
 *      twin went by that a keyboard can type wins; and a Daily click that
 *      beats the mount load still deals the kept row.
 *   7. THE LIVE TABLES, optional. One HEAD request per table with a count header
 *      (Prefer: count=exact, one key column selected, limit 1; nothing but the
 *      count comes back), the URL and key read from the literals in
 *      src/integrations/supabase/client.ts (never the VITE env vars). Each count
 *      must be the one its migration was measured at or the one it leaves; a
 *      later round that changes one of these tables on purpose updates the
 *      migration's constants, or retires this check once the migration is
 *      applied. And one read of cbb_programs' rows (281 today), which the
 *      game's dedupePrograms must fold into exactly the three twins the
 *      migration deletes (none once it has run), so a new row that would form a
 *      false pair in the browser is caught here. When the host cannot be
 *      reached the section prints "skipped: offline", keeping any failure it
 *      found before the network went; SIM_COLLEGE_TABLES_LIVE=off forces the
 *      skip. A reachable host answering anything else is a failure, not a skip.
 *
 * NEGATIVE CONTROLS. Every control runs on EVERY invocation, in memory over a
 * copy of its inputs, and the harness is red unless each one fires (the section
 * it targets goes red). A control refuses to run, and the harness is red, if
 * the string it mutates is not in the code it mutates, so a control can never
 * pass by changing nothing. SIM_COLLEGE_TABLES_CONTROL=<name> applies that one
 * mutation to the real run instead: exit 1 when it fired (the mutated tree is
 * rightly red), exit 2 when it did not (the check is dead). A control run never
 * exits 0.
 *   placeholder  the app's regex becomes /^\s*__/        -> 1 (copies disagree, regexes differ)
 *   archive      malformedName strips leading underscores -> 1 (the archive would print "_ Johnston")
 *   twin         Loyola (LA)'s home court is renamed      -> 2 (dedupe misses the pair the SQL deletes)
 *   names        the SQL's Seattle array loses Seattle U -> 2 (arrays differ)
 *   generic      the generic pair says where it plays    -> 2 (the guard test merges them)
 *   cleaner      draftRounds.mjs back to the forfeit rule -> 3 (the moved row wins a slot)
 *   constants    the nfl SQL's rows after is off by one  -> 4
 *   pins         the record's McNeil pin says round 16   -> 4 (read back disagrees)
 *   unread       the Dzierzak read back loses its round  -> 4 (a derived pin is never read back)
 *   keyguard     the key builder loses its placeholder skip -> 5 (the placeholder joins)
 *   searchcall   rowToRaw loses its isPlaceholderName line   -> 6 (the search offers "_ Johnston")
 *   offered      the hook offers rows.map, not programs.map  -> 6 (the search lists both twins)
 *   pool         the daily pool becomes the kept programs    -> 6 (8 slots become 5, dailies move)
 *   slot         a twin's slot deals the twin itself         -> 6 (a hidden twin is dealt)
 *   dailytwin    a cbb_daily twin is dealt as it is          -> 6 (the hidden twin is the puzzle)
 *   early        the Daily click no longer waits for the load -> 6 (the click deals the hidden twin)
 * Section 7 has no control: it reads the live tables, and a control there
 * would be a fake answer from a fake host. Its comparison is section 2's.
 *
 * Run: node scripts/simCollegeTables.mjs
 * Every threshold here is an equality with a value read from the SQL or the
 * fixture, so there is no margin to set. Measured 2026-09-30 on the live tables
 * (all five migrations unapplied): nfl_draft_picks 28015, ncaa_player_stats
 * 43800, cfb_qb_stats 5800, cfb_rb_stats 14800, cbb_programs 281, and
 * dedupePrograms over the 281 live cbb rows hides exactly the three twins.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import * as draftLibReal from './lib/draftRounds.mjs';
import { isPlaceholderName as isPlaceholderNameScripts } from './lib/placeholderName.mjs';
import * as archiveRulesReal from './lib/gridArchiveRules.mjs';
import * as M from './lib/collegeTablesMirror.mjs';
import * as keyLibReal from './genCollegeGridData.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const MIG = path.join(ROOT, 'supabase', 'migrations');
const read = f => fs.readFileSync(f, 'utf8');
const SQL_FILES = {
  nfl: '20260930120000_round_706_nfl_draft_picks.sql',
  ncaa: '20260930120100_round_706_ncaa_player_stats.sql',
  qb: '20260930120200_round_706_cfb_qb_stats.sql',
  rb: '20260930120300_round_706_cfb_rb_stats.sql',
  cbb: '20260930120400_round_706_cbb_programs.sql',
};
const SQL = Object.fromEntries(Object.entries(SQL_FILES).map(([k, f]) => [k, read(path.join(MIG, f))]));
const AUDIT = read(path.join(ROOT, 'docs', 'audits', 'college-tables-2026-09-30.md'));
const PH_TS_PATH = path.join(ROOT, 'src', 'lib', 'placeholderName.ts');
const CBB_TS_PATH = path.join(ROOT, 'src', 'lib', 'cbbPrograms.ts');
const CLIENT_TS_PATH = path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts');
const PH_TS = read(PH_TS_PATH);
const PH_MJS = read(path.join(SCRIPTS, 'lib', 'placeholderName.mjs'));
const DRAFT_MJS_PATH = path.join(SCRIPTS, 'lib', 'draftRounds.mjs');
const KEY_MJS_PATH = path.join(SCRIPTS, 'genCollegeGridData.mjs');
const ARCHIVE_MJS_PATH = path.join(SCRIPTS, 'lib', 'gridArchiveRules.mjs');
const SEARCH_TS_PATH = path.join(ROOT, 'src', 'lib', 'playerSearch.ts');
const HOOK_TS_PATH = path.join(ROOT, 'src', 'hooks', 'useCbbProgram.ts');
const CBB_GRID_TS_PATH = path.join(ROOT, 'src', 'lib', 'cbbGrid.ts');
const DATE_TS_PATH = path.join(ROOT, 'src', 'lib', 'dateUtils.ts');
const CALL_SITE_SOURCES = { search: read(SEARCH_TS_PATH), hook: read(HOOK_TS_PATH) };
const FIXTURE = JSON.parse(read(path.join(SCRIPTS, 'data', 'cbbProgramTwins.json')));

const CONTROLS = {
  placeholder: 1, archive: 1, twin: 2, names: 2, generic: 2, cleaner: 3, constants: 4, pins: 4, unread: 4, keyguard: 5,
  searchcall: 6, offered: 6, pool: 6, slot: 6, dailytwin: 6, early: 6,
};
const ONLY = process.env.SIM_COLLEGE_TABLES_CONTROL || '';
if (ONLY && !CONTROLS[ONLY]) {
  console.error(`SIM_COLLEGE_TABLES_CONTROL=${ONLY} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const abort = m => { console.error(m); process.exit(1); };
const need = (cond, what) => { if (!cond) abort(`control cannot run: ${what}. NOTHING WAS CHECKED.`); };
const sameArray = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const short = id => String(id).slice(0, 8);
const show = v => (v === undefined ? 'undefined' : JSON.stringify(v));

/** A file's code with its comments removed, so a guard reads the rule and not the prose about it. */
const codeOnly = src => src.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const placeholderRegexIn = src => codeOnly(src).match(/return\s+(\/[^/\n]+\/[a-z]*)\.test\(/)?.[1] ?? null;

/* ------------------------------------------------------------------ */
/* The app's modules, bundled; a script copied with one line changed    */
/* ------------------------------------------------------------------ */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simCollegeTables-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
let made = 0;
async function bundleApp(phPath) {
  made += 1;
  const entry = path.join(TMP, `entry${made}.mjs`);
  const outfile = path.join(TMP, `bundle${made}.mjs`);
  const abs = f => f.replaceAll('\\', '/');
  fs.writeFileSync(entry, `export * as cbb from '${abs(CBB_TS_PATH)}';\nexport * as ph from '${abs(phPath)}';\n`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
}
/** A scripts/ module copied into TMP with its relative imports pinned and one string of its CODE replaced. */
async function importMutated(file, old, replacement) {
  const src = read(file);
  const code = codeOnly(src);
  need(code.includes(old), `${path.basename(file)} code does not contain ${JSON.stringify(old)}`);
  need(code.split(old).length === 2, `${path.basename(file)} code contains ${JSON.stringify(old)} more than once`);
  const pinned = src.replace(/from '\.\/([^']+)'/g, (_, rel) => `from '${pathToFileURL(path.join(SCRIPTS, rel)).href}'`);
  const mutated = pinned.replaceAll(old, replacement);
  need(codeOnly(mutated) !== codeOnly(pinned), `the mutation of ${path.basename(file)} changed no code`);
  made += 1;
  const out = path.join(TMP, `${path.basename(file, '.mjs')}.control${made}.mjs`);
  fs.writeFileSync(out, mutated);
  return import(pathToFileURL(out).href);
}
const app = await bundleApp(PH_TS_PATH);

/* ------------------------------------------------------------------ */
/* 1. The placeholder rule, both copies                                 */
/* ------------------------------------------------------------------ */
/* [name, refused, why]. The refused names are the rows the migrations delete
   plus the shapes the rule must also refuse; the kept names are real players
   the tables hold (plain, mirrored, marked) and real names with accents and
   other scripts, plus the shapes an underscore elsewhere must not trip. */
const PROBES = [
  ['_ Johnston', true, 'ncaa_player_stats 21867'], ['_ Ford', true, 'ncaa_player_stats 32408'], ['_ Eldredge', true, 'ncaa_player_stats 41595'],
  ['_ Sullivan', true, 'cfb_qb_stats 4151'], ['_ Gonzalez', true, 'cfb_qb_stats 4749'], ['_ Hawkins', true, 'cfb_qb_stats 4770'],
  ['_ Debacco', true, 'cfb_rb_stats 11565'], ['_ Delancellotti', true, 'cfb_rb_stats 11574'], ['_ Eonte', true, 'cfb_rb_stats 11864'],
  ['_ Green', true, 'cfb_rb_stats 12048'], ['_ Lowe', true, 'cfb_rb_stats 13117'], ['_ Murphy', true, 'cfb_rb_stats 13514'],
  ['_ Oduah', true, 'cfb_rb_stats 13602'], ['_ Ordione', true, 'cfb_rb_stats 13612'], ['_ Polamalu', true, 'cfb_rb_stats 13700'],
  ['_ Ratliff', true, 'cfb_rb_stats 13760'], ['_ Reese', true, 'cfb_rb_stats 13778'],
  ['  _ Padded', true, 'leading spaces then an underscore'], ['\t_ Tabbed', true, 'a tab then an underscore'],
  ['_', true, 'an underscore alone'], ['_Nospace', true, 'no space after the underscore'], ['__ Doubled', true, 'two underscores'],
  ['Zion Williamson', false, 'ncaa_player_stats 15491'], ['Aamir McCleary', false, 'ncaa_player_stats 22833'],
  ['Bradley Beal', false, 'ncaa_player_stats 22955'], ['Ignas Brazdeikis', false, 'ncaa_player_stats 22887'],
  ['Pat McNeil', false, 'nfl_draft_picks 1976 pick 472'], ['Billy Main', false, 'nfl_draft_picks 1970 pick 313'],
  ['Rayford Jenkins', false, 'nfl_draft_picks 1970 pick 442'], ['Watson, CurtCurt Watson', false, 'a mirrored draft name'],
  ['Paul Warfield HOF', false, 'a Hall of Fame marker'], ['I.V. Wilson', false, 'initials with periods'],
  ["Da'Quan Bowers", false, 'an apostrophe'], ['Nikola Jokić', false, 'a c with acute'], ['Luka Dončić', false, 'a c with caron'],
  ['Kristaps Porziņģis', false, 'Latvian letters'], ['Jonas Valančiūnas', false, 'Lithuanian letters'],
  ['Bojan Bogdanović', false, 'Croatian letters'], ['Manu Ginóbili', false, 'an o with acute'], ['José Calderón', false, 'Spanish accents'],
  ['Ömer Aşık', false, 'Turkish letters'], ['Dāvis Bertāns', false, 'long a marks'], ['Álvaro Morata', false, 'a leading accented capital'],
  ['Not_A Placeholder', false, 'an underscore inside a word'], ['Trailing underscore_', false, 'an underscore at the end'],
  ['', false, 'the empty string'], [null, false, 'null'], [undefined, false, 'undefined'],
];
function sectionPlaceholder({ tsFn, tsSrc, archive }) {
  const out = [];
  if (PROBES.length < 30) out.push(`only ${PROBES.length} probe names, the table must hold at least 30`);
  let refused = 0;
  for (const [name, expected, why] of PROBES) {
    if (expected) refused += 1;
    const a = isPlaceholderNameScripts(name);
    const b = tsFn(name);
    if (a !== expected) out.push(`scripts copy ${a ? 'refuses' : 'keeps'} ${show(name)}, expected ${expected ? 'refused' : 'kept'} (${why})`);
    if (b !== expected) out.push(`app copy ${b ? 'refuses' : 'keeps'} ${show(name)}, expected ${expected ? 'refused' : 'kept'} (${why})`);
    /* The archive's printing rule is stricter on purpose; it must never print a name this rule refuses. */
    if (expected && archive(name) === null) out.push(`the grid archive's malformedName would print ${show(name)}, a placeholder (${why})`);
  }
  const reTs = placeholderRegexIn(tsSrc);
  const reMjs = placeholderRegexIn(PH_MJS);
  if (!reTs || !reMjs) out.push(`could not read the regex out of the code (app ${reTs}, scripts ${reMjs})`);
  else if (reTs !== reMjs) out.push(`src/lib/placeholderName.ts tests ${reTs} and scripts/lib/placeholderName.mjs tests ${reMjs}`);
  return { out, info: `${PROBES.length} names (${refused} refused, ${PROBES.length - refused} kept), both copies test ${reMjs}, the archive prints none of the ${refused}` };
}

/* ------------------------------------------------------------------ */
/* 2. cbb_programs                                                      */
/* ------------------------------------------------------------------ */
const GENERIC_PAIR = [
  { id: 'generic-1', school_name: 'Alpha College', common_names: ['Alpha'], region_hint: 'Philadelphia, Pennsylvania (Northeast)', mascot_hint: 'The Hawks, whose mascot never stops flapping its wings', created_at: '2026-01-01T00:00:00Z' },
  { id: 'generic-2', school_name: 'Beta University', common_names: ['Beta'], region_hint: 'Philadelphia, Pennsylvania (Northeast)', mascot_hint: 'The Hawks, whose mascot never stops flapping its wings', created_at: '2026-01-02T00:00:00Z' },
];
function sectionCbb({ rows, sql, generic }) {
  const out = [];
  const mig = M.readCbbMigration(sql);
  const byId = new Map(rows.map(r => [r.id, r]));
  if (mig.pairs.length === 0) out.push('the SQL names no pairs');
  if (mig.updates.size === 0 || mig.deletes.size === 0) out.push(`the SQL has ${mig.updates.size} UPDATE and ${mig.deletes.size} DELETE statements to read`);

  // The fixture carries what the SQL's WHERE clauses pin.
  const pinned = (id, where, what) => {
    const r = byId.get(id);
    if (!r) { out.push(`the SQL ${what} ${short(id)}, which is not in the fixture`); return; }
    if (where.school_name !== undefined && r.school_name !== where.school_name) out.push(`${short(id)}: the fixture says ${show(r.school_name)}, the SQL's WHERE says ${show(where.school_name)}`);
    if (where.common_names !== undefined && !sameArray(r.common_names, where.common_names)) out.push(`${short(id)}: the fixture's common_names ${show(r.common_names)} are not the ${show(where.common_names)} the SQL's WHERE demands`);
    if (where.championships_hint !== undefined && r.championships_hint !== where.championships_hint) out.push(`${short(id)}: championships_hint ${show(r.championships_hint)} against the SQL's ${show(where.championships_hint)}`);
  };
  for (const [id, u] of mig.updates) pinned(id, u.where, 'updates');
  for (const [id, d] of mig.deletes) pinned(id, d.where, 'deletes');
  for (const [x, y] of mig.pairs) {
    if (!byId.has(x) || !byId.has(y)) out.push(`pair ${short(x)}/${short(y)}: not both in the fixture`);
    const del = [x, y].filter(i => mig.deletes.has(i));
    if (del.length !== 1) out.push(`pair ${short(x)}/${short(y)}: the SQL deletes ${del.length} of its two rows, expected exactly one`);
  }

  // The rule over the fixture: hides what the SQL deletes, keeps the partner, writes the SQL's arrays.
  const { programs, replacedBy } = app.cbb.dedupePrograms(rows);
  const hidden = [...replacedBy.keys()];
  const wantHidden = [...mig.deletes.keys()];
  if (!sameSet(hidden, wantHidden)) out.push(`dedupePrograms hides ${hidden.length} rows (${hidden.map(short).join(', ') || 'none'}), the SQL deletes ${wantHidden.length} (${wantHidden.map(short).join(', ')})`);
  for (const [x, y] of mig.pairs) {
    const h = hidden.find(i => i === x || i === y);
    if (!h) continue;
    const other = h === x ? y : x;
    if (replacedBy.get(h).id !== other) out.push(`${short(h)} is replaced by ${short(replacedBy.get(h).id)}, the SQL pairs it with ${short(other)}`);
  }
  if (programs.length !== rows.length - mig.deletes.size) out.push(`dedupePrograms keeps ${programs.length} of ${rows.length} rows, the SQL deletes ${mig.deletes.size}`);
  for (const p of programs) {
    const live = byId.get(p.id);
    if (!live) { out.push(`a kept program ${short(p.id)} is not a fixture row`); continue; }
    const want = mig.updates.has(p.id) ? mig.updates.get(p.id).after : live.common_names;
    if (!sameArray(p.common_names, want)) out.push(`${p.school_name} (${short(p.id)}) ends with ${show(p.common_names)}, the SQL leaves ${show(want)}`);
    for (const k of Object.keys(live)) if (k !== 'common_names' && live[k] !== p[k]) out.push(`${p.school_name}: ${k} changed from ${show(live[k])} to ${show(p[k])}`);
  }
  for (const id of mig.updates.keys()) if (!programs.some(p => p.id === id)) out.push(`the SQL updates ${short(id)} but dedupePrograms does not keep it`);
  for (const id of hidden) {
    const kept = replacedBy.get(id);
    const twin = byId.get(id);
    const names = [kept.school_name, ...(kept.common_names ?? [])].map(app.cbb.foldProgramText);
    if (!names.includes(app.cbb.foldProgramText(twin.school_name))) out.push(`${show(twin.school_name)} is no longer a correct guess on ${kept.school_name}`);
  }

  // The home court guard: one city, one generic hint, two programs.
  const g = app.cbb.dedupePrograms(generic);
  if (g.replacedBy.size !== 0) out.push(`two programs in one city with a generic mascot hint were folded into one (${[...g.replacedBy.keys()].join(', ')})`);
  for (const r of generic) if (app.cbb.programKeys(r).some(k => k.startsWith('court:')) && !/\bplays? at\s+/i.test(r.mascot_hint)) out.push(`${r.school_name} gets a court key from a hint with no "plays at"`);
  return { out, info: `${rows.length} fixture rows, ${hidden.length} hidden (${hidden.map(short).join(', ')}), ${mig.updates.size} arrays rewritten as the SQL writes them, the generic pair stays two programs` };
}

/* ------------------------------------------------------------------ */
/* 3. The draft cleaner                                                 */
/* ------------------------------------------------------------------ */
function sectionDraft({ lib }) {
  const out = [];
  const row = (id, year, pick, player_name, position, college, round = null) => ({ id, year, round, pick, player_name, position, team: null, college });
  /* The sentences are the table's own (the nfl migration's step 2); the players are probe shapes. */
  const forfeit = row(30, 2024, 85, 'Selection forfeited', null, null);
  const moved = row(10, 2017, 128, 'Selection moved down 12 spots', null, null);
  const penalty = row(11, 1978, 89, 'no pick, penalized by NFL for staging illegal workouts', '', '   ');
  const forfeitNamed = row(23, 2017, 131, 'Selection forfeited by the club', 'Guard', 'Probe State');
  const player = row(20, 2017, 128, 'Probe Receiver', 'Wide Receiver', 'Probe State');
  const noCollege = row(21, 2017, 129, 'Probe Lineman', 'Guard', null);
  const noPosition = row(22, 2017, 130, 'Probe Back', null, 'Probe Tech');
  const zero = row(40, 1990, 0, 'Probe Zero', 'Guard', 'Probe State');
  const tackle = row(31, 2024, 85, 'Probe Tackle', 'Offensive Tackle', 'Probe Tech');
  const second = row(50, 2017, 33, 'Probe Second', 'Guard', 'Probe Tech', 2);
  const judge = (r, want, why) => { if (lib.isPlaceholderDraftRow(r) !== want) out.push(`${show(r.player_name)} is ${want ? 'kept, expected refused' : 'refused, expected kept'} (${why})`); };
  judge(forfeit, true, 'a forfeit sentence');
  judge(moved, true, 'no position and no college');
  judge(penalty, true, 'blank position and blank college');
  judge(forfeitNamed, true, 'a forfeit sentence is refused whatever else the row carries');
  judge(player, false, 'a player');
  judge(noCollege, false, 'a position alone keeps a row');
  judge(noPosition, false, 'a college alone keeps a row');
  if (lib.isForfeitRow(moved)) out.push('the forfeit rule alone already refuses "Selection moved down 12 spots", so the widening measures nothing');
  const all = [moved, player, forfeit, tackle, noCollege, noPosition, forfeitNamed, zero, penalty, second];
  const cleaned = lib.cleanDraftPicks(all);
  const ids = cleaned.map(r => r.id);
  const wantIds = [50, 20, 21, 22, 31];
  if (!sameArray(ids, wantIds)) out.push(`cleanDraftPicks returns ids ${ids.join(', ')}, expected ${wantIds.join(', ')} (placeholders and pick 0 dropped, one row per slot in year and pick order)`);
  const slot = cleaned.find(r => r.year === 2017 && r.pick === 128);
  if (!slot || slot.id !== 20) out.push(`2017 pick 128 goes to id ${slot?.id ?? 'nobody'}, expected the player (20) although the placeholder holds the lower id (10)`);
  const ends = lib.firstRoundEnds(cleaned);
  if (ends.get(2017) !== 32) out.push(`2017's first round ends at ${ends.get(2017)}, expected 32 (round two starts at pick 33)`);
  if (ends.get(2024) !== null) out.push(`2024 has no round two row and should have no boundary, got ${ends.get(2024)}`);
  return { out, info: `7 shapes judged, ${cleaned.length} of ${all.length} rows kept, 2017 pick 128 goes to the player over the lower id placeholder` };
}

/* ------------------------------------------------------------------ */
/* 4. The migrations                                                    */
/* ------------------------------------------------------------------ */
/** The record's pins: (year|pick) to round, every "pin: yes" row of the audit's derivation table,
 *  and the ones marked parsed (a round the scrape already had, which step 3 never touches). */
function readAuditPins(md) {
  const pins = new Map();
  const parsed = new Set();
  for (const line of M.lf(md).split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 8) continue;
    const [, year, pick, , round, , , pin] = cells;
    if (!/^\d{4}$/.test(year) || !/^\d+$/.test(pick) || !/^\d+$/.test(round)) continue;
    if (!/^yes\b/.test(pin)) continue;
    pins.set(`${year}|${pick}`, Number(round));
    if (/\bparsed\b/.test(pin)) parsed.add(`${year}|${pick}`);
  }
  return { pins, parsed };
}
function sectionSql({ files, audit }) {
  const out = [];
  const table = [];
  for (const [k, sql] of Object.entries(files)) {
    const blocks = M.readDoBlocks(sql);
    if (blocks.opens !== 1 || blocks.closes !== 1) out.push(`${k}: ${blocks.opens} DO block(s) opened and ${blocks.closes} closed, expected exactly one`);
    const decls = M.readConstantDeclarations(sql);
    if (decls.length === 0) out.push(`${k}: no constant declared`);
    const seen = new Map();
    for (const d of decls) seen.set(d.name, (seen.get(d.name) ?? 0) + 1);
    for (const [name, n] of seen) if (n !== 1) out.push(`${k}: ${name} is declared ${n} times`);
    for (const d of decls) if (M.countUses(sql, d.name) < 2) out.push(`${k}: ${d.name} is declared and never checked`);
    const C = M.readMigrationConstants(sql);
    if (!Number.isInteger(C.expected_rows_before) || !Number.isInteger(C.expected_rows_after)) out.push(`${k}: no rows before and after constants`);
    table.push(`${SQL_FILES[k].replace(/^\d+_round_706_/, '').replace(/\.sql$/, '')}: ${decls.filter(d => d.type === 'integer').map(d => `${d.name.replace(/^expected_/, '')} ${d.value}`).join(', ')}`);
  }

  const nfl = M.readMigrationConstants(files.nfl);
  const nflDeletes = nfl.expected_exact_copies + nfl.expected_placeholders + nfl.expected_invented;
  if (nfl.expected_rows_before - nflDeletes !== nfl.expected_rows_after) out.push(`nfl: ${nfl.expected_rows_before} - ${nfl.expected_exact_copies} - ${nfl.expected_placeholders} - ${nfl.expected_invented} is not ${nfl.expected_rows_after}`);
  const invented = M.readInventedRows(files.nfl);
  if (invented.length !== nfl.expected_invented) out.push(`nfl: the SQL lists ${invented.length} invented rows and declares ${nfl.expected_invented}`);
  if (new Set(invented.map(r => r.id)).size !== invented.length) out.push('nfl: an invented id is listed twice');
  const bd = M.readNflBreakdown(files.nfl);
  if (!bd) out.push('nfl: the header does not state its measured per year breakdown');
  else {
    const sum = l => l.reduce((s, x) => s + x.count, 0);
    if (bd.derived !== nfl.expected_rounds_derived || sum(bd.derivedByYear) !== nfl.expected_rounds_derived) out.push(`nfl: the header says ${bd.derived} derived and its years add up to ${sum(bd.derivedByYear)}, the block declares ${nfl.expected_rounds_derived}`);
    if (bd.unknown !== nfl.expected_rounds_unknown || sum(bd.unknownByYear) !== nfl.expected_rounds_unknown) out.push(`nfl: the header says ${bd.unknown} set NULL and its years add up to ${sum(bd.unknownByYear)}, the block declares ${nfl.expected_rounds_unknown}`);
    if (bd.pastBoundary - nfl.expected_invented !== nfl.expected_rounds_derived + nfl.expected_rounds_unknown) out.push(`nfl: ${bd.pastBoundary} rows past their boundary minus the ${nfl.expected_invented} invented is not ${nfl.expected_rounds_derived} derived plus ${nfl.expected_rounds_unknown} unknown`);
    const years = new Set([...bd.derivedByYear, ...bd.unknownByYear].map(x => x.year));
    if (years.size !== bd.drafts) out.push(`nfl: the header's lists name ${years.size} drafts and it says ${bd.drafts}`);
  }

  const ncaa = M.readMigrationConstants(files.ncaa);
  if (ncaa.expected_rows_before - ncaa.expected_twin_rows - ncaa.expected_placeholders !== ncaa.expected_rows_after) out.push(`ncaa: ${ncaa.expected_rows_before} - ${ncaa.expected_twin_rows} - ${ncaa.expected_placeholders} is not ${ncaa.expected_rows_after}`);
  for (const k of ['qb', 'rb']) {
    const c = M.readMigrationConstants(files[k]);
    const rk = M.readRkList(files[k]);
    if (c.expected_rows_before - c.expected_placeholders !== c.expected_rows_after) out.push(`cfb_${k}_stats: ${c.expected_rows_before} - ${c.expected_placeholders} is not ${c.expected_rows_after}`);
    if (rk.length !== c.expected_placeholders) out.push(`cfb_${k}_stats: the SQL lists ${rk.length} rk and declares ${c.expected_placeholders}`);
    if (new Set(rk).size !== rk.length) out.push(`cfb_${k}_stats: an rk is listed twice`);
  }
  const cbb = M.readMigrationConstants(files.cbb);
  const mig = M.readCbbMigration(files.cbb);
  if (cbb.expected_rows_before - mig.deletes.size !== cbb.expected_rows_after) out.push(`cbb: ${cbb.expected_rows_before} - ${mig.deletes.size} deletes is not ${cbb.expected_rows_after}`);
  if (mig.pairs.length !== mig.deletes.size) out.push(`cbb: ${mig.pairs.length} pairs allowed, ${mig.deletes.size} rows deleted`);

  // The rounds the nfl block reads back after step 3, against the record's pins.
  const { pins, parsed } = readAuditPins(audit);
  const backs = M.readNflReadBacks(files.nfl);
  if (pins.size === 0) out.push('the audit record pins no row');
  if (backs.length === 0) out.push('the nfl block reads back no sample round');
  let agreed = 0;
  for (const [year, pick, round] of backs) {
    const pin = pins.get(`${year}|${pick}`);
    if (pin === undefined) continue;
    if (pin !== round) out.push(`nfl: the block reads back ${year} pick ${pick} as round ${round}, the record pins round ${pin}`);
    else agreed += 1;
  }
  if (agreed === 0) out.push('no read back sample is pinned by the record, so the two cannot be compared');
  /* Every pin the record holds on a derived round is read back when the block runs; a parsed pin
     (a round the scrape already had) proves nothing about step 3, so it is not owed one. */
  const readBack = new Set(backs.map(([y, p]) => `${y}|${p}`));
  const owed = [...pins.keys()].filter(k => !parsed.has(k));
  for (const k of owed) if (!readBack.has(k)) out.push(`nfl: the record pins ${k.replace('|', ' pick ')} at round ${pins.get(k)} and the block never reads it back`);
  return { out, table, info: `5 files, one DO block each; ${pins.size} record pins (${parsed.size} parsed, ${owed.length} on derived rounds, every one read back), ${backs.length} read backs, ${agreed} compared` };
}

/* ------------------------------------------------------------------ */
/* 5. The College Grid key builder                                      */
/* ------------------------------------------------------------------ */
function sectionKey({ build: buildKey, positionGroups }) {
  const out = [];
  /* A probe world: one career, its draft row, and two cfb stats rows that both
     fit it by name, school and season. One of them is a placeholder. */
  const career = { id: 'probe-1', name: 'Probe Passer', teams: ['PRB'], seasons: [2013, 2016], pos: ['QB'], college: 'Probe State', draft: { year: 2013, round: 3, pick: 70 } };
  const picks = [
    { id: 1, year: 2013, round: 1, pick: 1, player_name: 'Probe Opener', position: 'Quarterback', college: 'Probe Tech' },
    { id: 2, year: 2013, round: 2, pick: 33, player_name: 'Probe Second', position: 'Guard', college: 'Probe Tech' },
    { id: 3, year: 2013, round: 3, pick: 70, player_name: 'Probe Passer', position: 'Quarterback', college: 'Probe State' },
  ];
  const qb = [
    { player_name: '_ Probe Passer', player_slug: 'probe-passer-1', year_max: 2012, schools: 'Probe State, Ghost College', pos: 'QB' },
    { player_name: 'Probe Passer', player_slug: 'probe-passer-2', year_max: 2012, schools: 'Probe State', pos: 'QB' },
  ];
  let res;
  try { res = buildKey({ careers: [career], picks, rosters: [], heisman: [], qb, rb: [], positionGroups }); }
  catch (err) { out.push(`buildCollegeKey threw: ${err.message}`); return { out, info: 'threw' }; }
  const p = res.players.find(x => x.id === 'probe-1');
  if (!p) { out.push('the probe career is not in the key'); return { out, info: 'no career' }; }
  if (res.stats.cfb.rows !== 2) out.push(`the builder counted ${res.stats.cfb.rows} cfb rows, expected 2`);
  if (res.stats.cfb.joined !== 1) out.push(`${res.stats.cfb.joined} cfb rows joined the career, expected 1: the "_ Probe Passer" placeholder must join nobody`);
  if (p.colleges.includes('Ghost College')) out.push('the placeholder row\'s school reached the career');
  if (!sameArray(p.proof.cfb_schools, ['Probe State'])) out.push(`cfb schools ${show(p.proof.cfb_schools)}, expected ["Probe State"]`);
  if (!sameArray(p.colleges, ['Probe State'])) out.push(`colleges ${show(p.colleges)}, expected ["Probe State"]`);
  return { out, info: `${res.players.length} entries; cfb rows ${res.stats.cfb.rows}, joined ${res.stats.cfb.joined}; colleges ${show(p.colleges)}` };
}

/* ------------------------------------------------------------------ */
/* 6. The call sites the games run                                      */
/* ------------------------------------------------------------------ */
const requireCjs = createRequire(import.meta.url);
/* Resolved from this file: the entry sits in TMP, where a bare name resolves to nothing. */
const pkg = name => requireCjs.resolve(name).replaceAll('\\', '/');
/* The database: globalThis.__SIM_COLLEGE_DB__[table] is the table. eq, in,
   ilike, order (first call is the primary key, as PostgREST chains them),
   limit, single and maybeSingle behave as PostgREST does on these shapes.
   __SIM_COLLEGE_HOLD__ holds the first unfiltered read of one table until it
   is released, so a click can beat the mount load. */
const SUPABASE_STUB = `
const db = () => globalThis.__SIM_COLLEGE_DB__ || {};
function like(pattern) {
  const parts = String(pattern).toLowerCase().split('%');
  return value => {
    const s = String(value == null ? '' : value).toLowerCase();
    if (parts.length === 1) return s === parts[0];
    if (!s.startsWith(parts[0])) return false;
    let at = parts[0].length;
    for (let i = 1; i < parts.length - 1; i += 1) {
      const k = s.indexOf(parts[i], at);
      if (k < 0) return false;
      at = k + parts[i].length;
    }
    const last = parts[parts.length - 1];
    return s.length - last.length >= at && s.endsWith(last);
  };
}
function query(table) {
  const st = { filters: [], orders: [], limit: null, one: null };
  async function run() {
    const hold = globalThis.__SIM_COLLEGE_HOLD__;
    if (hold && hold.table === table && !hold.used && st.filters.length === 0) { hold.used = true; await hold.released; }
    let rows = (db()[table] || []).filter(r => st.filters.every(f => f(r)));
    if (st.orders.length) {
      rows = [...rows].sort((a, b) => {
        for (const [c, asc] of st.orders) {
          if (a[c] === b[c]) continue;
          const d = a[c] < b[c] ? -1 : 1;
          return asc ? d : -d;
        }
        return 0;
      });
    }
    if (st.limit !== null) rows = rows.slice(0, st.limit);
    rows = rows.map(r => ({ ...r }));
    if (st.one === 'single') return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: 'not exactly one row' } };
    if (st.one === 'maybe') return rows.length <= 1 ? { data: rows[0] || null, error: null } : { data: null, error: { message: 'more than one row' } };
    return { data: rows, error: null };
  }
  const q = {
    select() { return q; },
    order(column, opts) { st.orders.push([column, !opts || opts.ascending !== false]); return q; },
    limit(n) { st.limit = n; return q; },
    eq(column, value) { st.filters.push(r => r[column] === value); return q; },
    in(column, values) { st.filters.push(r => values.includes(r[column])); return q; },
    ilike(column, pattern) { const m = like(pattern); st.filters.push(r => m(r[column])); return q; },
    or() { throw new Error('the stub database has no or(); the College Basketball Grid source never sends one'); },
    abortSignal() { return q; },
    single() { st.one = 'single'; return q; },
    maybeSingle() { st.one = 'maybe'; return q; },
    insert() { return Promise.resolve({ data: null, error: null }); },
    then(resolve, reject) { return run().then(resolve, reject); },
  };
  return q;
}
export const supabase = { from: table => query(table) };
`;
const CALL_STUBS = {
  '@/integrations/supabase/client': SUPABASE_STUB,
  '@/hooks/useGameCompletion': 'export const useGameCompletion = () => undefined;',
  '@/lib/dateUtils': `export * from '${DATE_TS_PATH.replaceAll('\\', '/')}';\nexport const getTodayET = () => globalThis.__SIM_COLLEGE_TODAY__;\n`,
};
let domReady = false;
/* jsdom has to exist before react-dom loads; it decides at load whether a document is there. */
function setUpDom() {
  if (domReady) return;
  domReady = true;
  const { JSDOM } = requireCjs('jsdom');
  const win = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' }).window;
  /* The window and React's scheduler keep the event loop alive after the last
     check, so the run ends with an explicit exit (measured: a green run sat
     idle past ten minutes without one). */
  process.on('exit', () => { try { win.close(); } catch { /* best effort */ } });
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MouseEvent', 'getComputedStyle', 'localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, k, { value: win[k], configurable: true, writable: true });
  }
  globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = id => clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}
/** searchPlayers, the College Basketball Grid's source and useCbbProgram, bundled with the two call site files served from `sources`. */
async function bundleCallSites(sources) {
  setUpDom();
  made += 1;
  const entry = path.join(TMP, `calls${made}.entry.mjs`);
  const outfile = path.join(TMP, `calls${made}.bundle.cjs`);
  const abs = f => f.replaceAll('\\', '/');
  fs.writeFileSync(entry, [
    `export { searchPlayers } from '${abs(SEARCH_TS_PATH)}';`,
    `export { CBB_PLAYER_SOURCE } from '${abs(CBB_GRID_TS_PATH)}';`,
    `export { useCbbProgram } from '${abs(HOOK_TS_PATH)}';`,
    `export { default as React, act } from '${pkg('react')}';`,
    `export { createRoot } from '${pkg('react-dom/client')}';`,
  ].join('\n'));
  const memory = new Map([[path.resolve(SEARCH_TS_PATH), sources.search], [path.resolve(HOOK_TS_PATH), sources.hook]]);
  await build({
    entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile, logLevel: 'silent',
    alias: { '@': path.join(ROOT, 'src') },
    plugins: [{
      name: 'sim-college-call-sites',
      setup(b) {
        b.onResolve({ filter: /^@\/(integrations\/supabase\/client|hooks\/useGameCompletion|lib\/dateUtils)$/ }, a => ({ path: a.path, namespace: 'sim-college-stub' }));
        b.onLoad({ filter: /.*/, namespace: 'sim-college-stub' }, a => ({ contents: CALL_STUBS[a.path], loader: 'js', resolveDir: ROOT }));
        b.onLoad({ filter: /(playerSearch|useCbbProgram)\.ts$/ }, a => {
          const src = memory.get(path.resolve(a.path));
          return src === undefined ? null : { contents: src, loader: 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  return requireCjs(outfile);
}

/* Probe rows for the search: two placeholders the table really holds as
   names, carrying the most points so the prominence leg lists them first,
   and two probe players. Not real players and not real stats. */
const SEARCH_ROWS = [
  { id: 1, player_name: '_ Johnston', points: 900, position: 'G' },
  { id: 2, player_name: 'Probe Johnston', points: 40, position: 'F' },
  { id: 3, player_name: '_ Eldredge', points: 800, position: 'G' },
  { id: 4, player_name: 'Probe Eldredge', points: 30, position: 'C' },
];
const SEARCH_CASES = [['johnston', ['Probe Johnston']], ['Eldredge', ['Probe Eldredge']], ['probe', ['Probe Johnston', 'Probe Eldredge']]];
const DAILY_DATES = Array.from({ length: 16 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
const typable = s => /^[ -~]+$/.test(s);

async function sectionCallSites({ sources, rows: fixtureRows, sql }) {
  const out = [];
  const m = await bundleCallSites(sources);
  const { React, act, createRoot } = m;

  // The search: the College Basketball Grid's own source, through searchPlayers.
  globalThis.__SIM_COLLEGE_DB__ = { ncaa_player_stats: SEARCH_ROWS };
  let offeredNames = 0;
  for (const [q, want] of SEARCH_CASES) {
    const res = await m.searchPlayers({ source: m.CBB_PLAYER_SOURCE, query: q });
    if (res.error) { out.push(`searchPlayers("${q}") failed: ${res.error}`); continue; }
    const got = res.results.map(r => r.rawName);
    offeredNames += got.length;
    if (!sameSet(got, want)) out.push(`the College Basketball Grid search for "${q}" offers ${show(got)}, expected ${show(want)}`);
  }

  // The hook, over the fixture rows in id order (the order loadPrograms asks for).
  const rows = [...fixtureRows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const mig = M.readCbbMigration(sql);
  const partner = new Map();
  for (const [x, y] of mig.pairs) { partner.set(x, y); partner.set(y, x); }
  const keptId = id => (mig.deletes.has(id) ? partner.get(id) : id);
  const byId = new Map(rows.map(r => [r.id, r]));
  const label = id => `${byId.get(id)?.school_name ?? '?'} (${short(id)})`;
  const wantNames = id => (mig.updates.has(id) ? mig.updates.get(id).after : byId.get(id).common_names);
  const ready = api => api?.programsStatus === 'ready';
  const settle = async (box, until) => {
    for (let i = 0; i < 50 && !until(box.api); i += 1) await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    return until(box.api);
  };
  async function mount(today, db, hold = null) {
    globalThis.__SIM_COLLEGE_TODAY__ = today;
    globalThis.__SIM_COLLEGE_DB__ = db;
    globalThis.__SIM_COLLEGE_HOLD__ = hold;
    localStorage.clear();
    const box = { api: null };
    function Probe() { box.api = m.useCbbProgram(); return null; }
    const root = createRoot(document.createElement('div'));
    await act(async () => { root.render(React.createElement(Probe)); });
    return { box, unmount: () => act(async () => { root.unmount(); }) };
  }
  const base = { cbb_programs: rows, cbb_daily: [] };

  // What the search box offers.
  {
    const { box, unmount } = await mount(DAILY_DATES[0], base);
    if (!(await settle(box, ready))) out.push('the hook never finished loading the programs');
    const offered = box.api?.allPrograms ?? [];
    const wantIds = rows.map(r => r.id).filter(id => !mig.deletes.has(id));
    if (!sameArray(offered.map(p => p.id), wantIds)) out.push(`the hook offers ${offered.length} programs (${offered.map(p => p.school_name).join(', ')}), the cbb migration leaves ${wantIds.length} (${wantIds.map(id => byId.get(id).school_name).join(', ')})`);
    for (const p of offered) if (byId.has(p.id) && !sameArray(p.common_names, wantNames(p.id))) out.push(`the hook offers ${p.school_name} with ${show(p.common_names)}, the SQL leaves ${show(wantNames(p.id))}`);
    await unmount();
  }

  // The daily fallback: pool[date % rows] over the rows in id order, a twin's slot dealing its kept row.
  let twinSlots = 0;
  for (const d of DAILY_DATES) {
    const { box, unmount } = await mount(d, base);
    await settle(box, ready);
    await act(async () => { await box.api.startGame('daily'); });
    const got = box.api.gameState?.puzzle;
    const slot = parseInt(d.replace(/-/g, ''), 10) % rows.length;
    const want = keptId(rows[slot].id);
    if (mig.deletes.has(rows[slot].id)) twinSlots += 1;
    if (!got) out.push(`${d}: the daily dealt nothing`);
    else if (got.id !== want) out.push(`${d}: the daily deals ${label(got.id)}; slot ${slot} of the ${rows.length} rows is ${label(rows[slot].id)}, so the day's program is ${label(want)}`);
    else if (!sameArray(got.common_names, wantNames(want))) out.push(`${d}: the daily deals ${label(want)} with ${show(got.common_names)}, the SQL leaves ${show(wantNames(want))}`);
    await unmount();
  }
  if (twinSlots === 0) out.push(`none of the ${DAILY_DATES.length} dates lands on a twin's slot, so the slot check measures nothing`);

  // A cbb_daily row naming a hidden twin, and every typable name the twin went by.
  let guessed = 0;
  for (const twinId of mig.deletes.keys()) {
    const twin = byId.get(twinId);
    if (!twin) { out.push(`the SQL deletes ${short(twinId)}, which is not in the fixture`); continue; }
    const names = [twin.school_name, ...(twin.common_names ?? [])].filter(typable);
    for (const name of names) {
      const d = DAILY_DATES[0];
      const { box, unmount } = await mount(d, { ...base, cbb_daily: [{ puzzle_date: d, program_id: twinId }] });
      await settle(box, ready);
      await act(async () => { await box.api.startGame('daily'); });
      const got = box.api.gameState?.puzzle;
      if (!got || got.id !== partner.get(twinId)) { out.push(`cbb_daily names ${label(twinId)} and the hook deals ${got ? label(got.id) : 'nothing'}, expected the kept ${label(partner.get(twinId))}`); await unmount(); break; }
      await act(async () => { box.api.makeGuess(name); });
      if (box.api.gameState?.gameStatus !== 'won') out.push(`"${name}", a name ${twin.school_name} went by, is not a correct guess on the kept ${got.school_name}`);
      else guessed += 1;
      await unmount();
    }
  }

  // A Daily click that beats the mount load.
  {
    const twinId = [...mig.deletes.keys()][0];
    const d = DAILY_DATES[0];
    let release = () => {};
    const hold = { table: 'cbb_programs', used: false, released: new Promise(r => { release = r; }) };
    const { box, unmount } = await mount(d, { ...base, cbb_daily: [{ puzzle_date: d, program_id: twinId }] }, hold);
    if (!hold.used || ready(box.api)) out.push('the mount load was not held, so the early click check measures nothing');
    await act(async () => { await box.api.startGame('daily'); });
    const got = box.api.gameState?.puzzle;
    release();
    await settle(box, ready);
    if (!got || got.id !== partner.get(twinId)) out.push(`a Daily click before the programs load deals ${got ? label(got.id) : 'nothing'} for a cbb_daily row naming ${label(twinId)}, expected the kept ${label(partner.get(twinId))}`);
    await unmount();
  }
  return { out, info: `the search offers ${offeredNames} names over ${SEARCH_CASES.length} queries and no placeholder; the hook offers ${rows.length - mig.deletes.size} of ${rows.length} rows, deals ${DAILY_DATES.length} dailies by slot (${twinSlots} on a twin's slot), deals the kept row for all ${mig.deletes.size} cbb_daily twins (${guessed} typable twin names win), and an early Daily click waits for the load` };
}

/* ------------------------------------------------------------------ */
/* 7. The live tables, optional                                         */
/* ------------------------------------------------------------------ */
async function sectionLive(files) {
  if (process.env.SIM_COLLEGE_TABLES_LIVE === 'off') return { out: [], lines: [], skipped: 'offline (SIM_COLLEGE_TABLES_LIVE=off)' };
  const client = codeOnly(read(CLIENT_TS_PATH));
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  if (!url || !key) return { out: ['src/integrations/supabase/client.ts does not carry SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY as literals'], lines: [] };
  /* table, its migration, and its key column (the cfb tables have no id; rk is their key). */
  const TABLES = [['nfl_draft_picks', 'nfl', 'id'], ['ncaa_player_stats', 'ncaa', 'id'], ['cfb_qb_stats', 'qb', 'rk'], ['cfb_rb_stats', 'rb', 'rk'], ['cbb_programs', 'cbb', 'id']];
  const out = [];
  const lines = [];
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  /* A network failure part way keeps every failure found before it: an offline skip never hides a red. */
  let counted = 0;
  const offline = err => ({ out, lines, skipped: `offline after ${counted} of ${TABLES.length} tables (${err.name}: ${String(err.message).slice(0, 80)}${err.cause ? `, ${String(err.cause.code ?? err.cause.message ?? err.cause).slice(0, 80)}` : ''})` });
  for (const [table, k, column] of TABLES) {
    const C = M.readMigrationConstants(files[k]);
    let res;
    try {
      res = await fetch(`${url}/rest/v1/${table}?select=${column}&limit=1`, {
        method: 'HEAD',
        headers: { ...headers, Prefer: 'count=exact' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      return offline(err);
    }
    if (!res.ok) { out.push(`${table}: HTTP ${res.status} from a reachable host`); continue; }
    const range = res.headers.get('content-range') ?? '';
    const count = Number(range.match(/\/(\d+)\s*$/)?.[1]);
    if (!Number.isInteger(count)) { out.push(`${table}: no count in content-range ${show(range)}`); continue; }
    counted += 1;
    const state = count === C.expected_rows_before ? 'before' : count === C.expected_rows_after ? 'after' : null;
    if (!state) out.push(`${table} holds ${count} rows, neither the ${C.expected_rows_before} its migration was measured at nor the ${C.expected_rows_after} it leaves. If a round changed this table on purpose, that round updates ${SQL_FILES[k]}'s constants (or retires this check once the file is applied); otherwise the table moved under the migration, and applying it would raise`);
    lines.push(`${table} ${count} rows (${state ?? 'neither side of'} the migration)`);
    if (k !== 'cbb' || !state) continue;

    /* The browser's twin rule over every live row: exactly the SQL's deletes before it runs, nothing after. */
    let rowsRes;
    try {
      rowsRes = await fetch(`${url}/rest/v1/cbb_programs?select=id,school_name,common_names,region_hint,mascot_hint,created_at&order=id.asc`, { headers, signal: AbortSignal.timeout(15000) });
    } catch (err) {
      return offline(err);
    }
    if (!rowsRes.ok) { out.push(`cbb_programs rows: HTTP ${rowsRes.status} from a reachable host`); continue; }
    const liveRows = await rowsRes.json();
    if (!Array.isArray(liveRows) || liveRows.length !== count) { out.push(`cbb_programs counted ${count} rows and a select of them returned ${Array.isArray(liveRows) ? liveRows.length : show(liveRows)}`); continue; }
    const mig = M.readCbbMigration(files.cbb);
    const { replacedBy } = app.cbb.dedupePrograms(liveRows);
    const hidden = [...replacedBy.keys()];
    const want = state === 'before' ? [...mig.deletes.keys()] : [];
    if (!sameSet(hidden, want)) out.push(`dedupePrograms over the ${liveRows.length} live cbb_programs rows hides ${hidden.length} (${hidden.map(short).join(', ') || 'none'}), expected ${state === 'before' ? `the ${want.length} the migration deletes (${want.map(short).join(', ')})` : 'none, the migration has removed the twins'}`);
    for (const [x, y] of state === 'before' ? mig.pairs : []) {
      const h = hidden.find(i => i === x || i === y);
      if (h && replacedBy.get(h).id !== (h === x ? y : x)) out.push(`live: ${short(h)} is replaced by ${short(replacedBy.get(h).id)}, the SQL pairs it with ${short(h === x ? y : x)}`);
    }
    lines.push(`cbb_programs: dedupePrograms over the ${liveRows.length} live rows hides ${hidden.length} (${hidden.map(short).join(', ') || 'none'})`);
  }
  return { out, lines };
}

/* ------------------------------------------------------------------ */
/* The run                                                              */
/* ------------------------------------------------------------------ */
const inputs = {
  ph: { tsFn: app.ph.isPlaceholderName, tsSrc: PH_TS, archive: archiveRulesReal.malformedName },
  cbb: { rows: FIXTURE.rows, sql: SQL.cbb, generic: GENERIC_PAIR },
  draft: { lib: draftLibReal },
  sql: { files: { ...SQL }, audit: AUDIT },
  key: { build: keyLibReal.buildCollegeKey, positionGroups: keyLibReal.readPositionGroups() },
  calls: { sources: { ...CALL_SITE_SOURCES }, rows: FIXTURE.rows, sql: SQL.cbb },
};
const SECTIONS = [
  [1, 'the placeholder rule, both copies, over a table of names', inp => sectionPlaceholder(inp.ph)],
  [2, 'cbb_programs: dedupePrograms against the migration', inp => sectionCbb(inp.cbb)],
  [3, 'nfl_draft_picks: the draft cleaner', inp => sectionDraft(inp.draft)],
  [4, 'the five migrations: one block each, constants that add up, read backs that match the record', inp => sectionSql(inp.sql)],
  [5, 'the College Grid key builder refuses a placeholder', inp => sectionKey(inp.key)],
  [6, 'the call sites: the College Basketball Grid search and the Guess the CBB Program hook', inp => sectionCallSites(inp.calls)],
];
/** A section 6 control: one string of a call site file's CODE replaced, in memory. */
const callSite = (key, old, replacement) => inp => {
  const src = inp.calls.sources[key];
  need(codeOnly(src).split(old).length === 2, `the ${key} call site's code does not hold ${JSON.stringify(old)} exactly once`);
  need(src.split(old).length === 2, `the ${key} call site holds ${JSON.stringify(old)} more than once, comments included`);
  const mutated = src.replace(old, () => replacement);
  need(codeOnly(mutated) !== codeOnly(src), `the mutation of the ${key} call site changed no code`);
  return { ...inp, calls: { ...inp.calls, sources: { ...inp.calls.sources, [key]: mutated } } };
};
const controls = {
  placeholder: async inp => {
    const old = '/^\\s*_/';
    need(codeOnly(PH_TS).includes(old), `the regex ${old} is not in src/lib/placeholderName.ts code`);
    const mutated = PH_TS.replace(old, '/^\\s*__/');
    need(codeOnly(mutated) !== codeOnly(PH_TS), 'the mutation changed no code');
    const f = path.join(TMP, 'placeholderName.control.ts');
    fs.writeFileSync(f, mutated);
    const m = await bundleApp(f);
    return { ...inp, ph: { ...inp.ph, tsFn: m.ph.isPlaceholderName, tsSrc: mutated } };
  },
  archive: async inp => {
    const lib = await importMutated(ARCHIVE_MJS_PATH, "const n = String(name ?? '').trim();", "const n = String(name ?? '').trim().replace(/^_+/, '').trim();");
    return { ...inp, ph: { ...inp.ph, archive: lib.malformedName } };
  },
  searchcall: callSite('search', 'if (isPlaceholderName(name)) return null;', ''),
  offered: callSite('hook', 'setAllPrograms(programs.map(mapRow));', 'setAllPrograms(rows.map(mapRow));'),
  pool: callSite('hook', 'dailyPoolRef.current = rows.map(row => mapRow(keptById.get(row.id) ?? replacedBy.get(row.id) ?? row));', 'dailyPoolRef.current = programs.map(mapRow);'),
  slot: callSite('hook', 'keptById.get(row.id) ?? replacedBy.get(row.id) ?? row', 'keptById.get(row.id) ?? row'),
  dailytwin: callSite('hook', 'const kept = replacedByRef.current.get(prog.id) ?? prog;', 'const kept = prog;'),
  early: callSite('hook', 'if (dailyPoolRef.current.length === 0) await loadPrograms();', ''),
  twin: inp => {
    const rows = inp.cbb.rows.map(r => ({ ...r }));
    const r = rows.find(x => x.school_name === 'Loyola (LA)' && /play at Gersten Pavilion$/.test(x.mascot_hint));
    need(r, 'the fixture has no Loyola (LA) row playing at Gersten Pavilion');
    r.mascot_hint = r.mascot_hint.replace('Gersten Pavilion', 'Albert Gersten Pavilion');
    return { ...inp, cbb: { ...inp.cbb, rows } };
  },
  names: inp => {
    const old = "'Seattle', 'Redhawks', 'SU', 'Seattle U', 'Seattle University'";
    need(M.sqlCode(SQL.cbb).includes(old), 'the Seattle array is not in the cbb SQL code');
    return { ...inp, cbb: { ...inp.cbb, sql: SQL.cbb.replace(old, "'Seattle', 'Redhawks', 'SU', 'Seattle University'") } };
  },
  generic: inp => ({ ...inp, cbb: { ...inp.cbb, generic: GENERIC_PAIR.map(r => ({ ...r, mascot_hint: 'The Hawks, who play at Hagan Arena' })) } }),
  cleaner: async inp => ({ ...inp, draft: { lib: await importMutated(DRAFT_MJS_PATH, 'isForfeitRow(row) || (blank(row?.position) && blank(row?.college))', 'isForfeitRow(row)') } }),
  constants: inp => {
    const m = M.sqlCode(SQL.nfl).match(/expected_rows_after\s+constant integer := (\d+);/);
    need(m, 'expected_rows_after is not declared in the nfl SQL code');
    const sql = SQL.nfl.replace(m[0], m[0].replace(m[1], String(Number(m[1]) + 1)));
    need(sql !== SQL.nfl, 'the mutation changed nothing');
    return { ...inp, sql: { ...inp.sql, files: { ...inp.sql.files, nfl: sql } } };
  },
  pins: inp => {
    const old = '| 1976 | 472 | Pat McNeil, Chiefs, Baylor | 17 |';
    need(AUDIT.includes(old), 'the McNeil pin row is not in the audit record');
    return { ...inp, sql: { ...inp.sql, audit: AUDIT.replace(old, '| 1976 | 472 | Pat McNeil, Chiefs, Baylor | 16 |') } };
  },
  unread: inp => {
    const old = "where year = 1976 and pick = 404 and player_name = 'Bob Dzierzak' and round = 15;";
    need(M.sqlCode(SQL.nfl).split(old).length === 2, 'the Dzierzak read back is not in the nfl SQL code exactly once');
    const sql = SQL.nfl.replace(old, "where year = 1976 and pick = 404 and player_name = 'Bob Dzierzak';");
    need(M.sqlCode(sql) !== M.sqlCode(SQL.nfl), 'the mutation changed no code');
    return { ...inp, sql: { ...inp.sql, files: { ...inp.sql.files, nfl: sql } } };
  },
  keyguard: async inp => {
    const lib = await importMutated(KEY_MJS_PATH, 'if (isPlaceholderName(s.player_name)) continue;', '');
    return { ...inp, key: { ...inp.key, build: lib.buildCollegeKey } };
  },
};

let failures = 0;
const perSection = {};
async function runSections(inp) {
  for (const [n, title, fn] of SECTIONS) {
    const res = await fn(inp);
    perSection[n] = res.out.length;
    console.log(`${n}) ${title}`);
    for (const t of res.table ?? []) console.log(`   ${t}`);
    if (res.out.length === 0) console.log(`   ok${res.info ? `: ${res.info}` : ''}`);
    else for (const m of res.out) { failures += 1; console.error(`  FAIL: ${m}`); }
  }
}

if (ONLY) {
  const mutated = await controls[ONLY](inputs);
  console.log(`NEGATIVE CONTROL ON: ${ONLY} (section ${CONTROLS[ONLY]} must go red)`);
  await runSections(mutated);
  const n = perSection[CONTROLS[ONLY]];
  if (n > 0) {
    console.log(`\nsimCollegeTables control ${ONLY}: fired, section ${CONTROLS[ONLY]} went red (${n} finding${n === 1 ? '' : 's'}). Exit 1 is the expected result under a control.`);
    process.exit(1);
  }
  console.error(`\nsimCollegeTables control ${ONLY}: DID NOT FIRE, section ${CONTROLS[ONLY]} stayed green. The check is dead.`);
  process.exit(2);
}

await runSections(inputs);

console.log('7) the live tables, read only: one count header per table and the cbb_programs rows');
const live = await sectionLive(inputs.sql.files);
for (const l of live.lines) console.log(`   ${l}`);
if (live.skipped) console.log(`   skipped: ${live.skipped}`);
if (live.out.length === 0) { if (!live.skipped) console.log('   ok'); }
else for (const m of live.out) { failures += 1; console.error(`  FAIL: ${m}`); }

console.log('controls (each applied to a copy of its inputs; the section it targets must go red)');
const fired = [];
for (const [name, section] of Object.entries(CONTROLS)) {
  const mutated = await controls[name](inputs);
  const res = await SECTIONS.find(s => s[0] === section)[2](mutated);
  if (res.out.length > 0) { fired.push(name); console.log(`   fired: ${name} -> ${res.out[0]}`); }
  else { failures += 1; console.error(`  FAIL: control ${name} changed nothing in section ${section}; the check is dead`); }
}

if (failures) {
  console.error(`\nsimCollegeTables: RED, ${failures} failure${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`\nsimCollegeTables: green. Both placeholder copies agree on ${PROBES.length} names, dedupePrograms hides what the cbb migration deletes and writes what it writes, the draft cleaner refuses the three placeholder shapes, the five migrations are one block each with constants that add up, the key builder skips a placeholder, the search and the hook the games run apply both rules, and all ${fired.length} controls fired.${live.skipped ? ` Section 7 skipped: ${live.skipped}.` : ''}`);
process.exit(0);
