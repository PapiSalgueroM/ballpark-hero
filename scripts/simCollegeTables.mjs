/* College tables harness: the five Round 706 migrations, held against the live tables.

   Round 706 wrote five migrations for the college tables (nfl_draft_picks,
   ncaa_player_stats, cfb_qb_stats, cfb_rb_stats, cbb_programs) and changed the
   readers so the games are right before the migrations land and unchanged
   after. Every one of those files names this harness as its fence. It pulls
   the five tables, works out for each whether its migration has landed (the
   row count equals the constant measured before, or the one expected after,
   both read out of the SQL file), and holds:

     1. nfl_draft_picks. BEFORE: scripts/lib/collegeTablesMirror.mjs replays
        every step over the pull and its counts equal the SQL's constants
        (exact copies, placeholder rows, the 13 invented 1977 rows, rounds
        derived, rounds left unknown, rows after). AFTER: no exact copy, no
        placeholder row, no invented row, no row filed round 1 past its year's
        parsed first round remains. In both states the derived rounds equal the
        record at the fifteen picks docs/audits/college-tables-2026-09-30.md
        pins from two organisations (Pat McNeil 1976 pick 472 round 17, Billy
        Main 1970 pick 313 round 13, ...), 1977's tail and 1982's late rounds
        carry no round, and 2024 and 2025 hold one row per pick, 257 each.
        cleanDraftPicks (the College Grid key's reader) returns the same rows
        under the old forfeit rule and the new placeholder rule, and the rows it
        returns after the migration are the rows it returned before minus
        exactly the 13 invented ones, with every year's first round boundary
        unchanged.
     2. ncaa_player_stats. BEFORE: every slug held twice is identical column
        for column (the 33 columns the SQL compares), the twin rows and the "_"
        names count what the SQL says, and the sample rows the SQL reads back
        are kept or gone as it says. AFTER: no twin slug, no "_" name. In both
        states the two copies of isPlaceholderName (scripts/lib for the offline
        scripts, src/lib for the app) agree on every live name in the three
        stats tables, and their code carries the same rule.
     3. cfb_qb_stats and cfb_rb_stats. BEFORE: the "_" names are exactly the rk
        each SQL lists, no more. AFTER: none remains.
     4. cbb_programs. BEFORE: the game's own dedupePrograms (src/lib/cbbPrograms.ts,
        bundled here) hides exactly the ids the SQL deletes, the kept rows the SQL
        updates carry exactly the common_names arrays it writes, every other kept
        row is untouched, and no cbb_daily row points at a hidden id. AFTER: 278
        rows, dedupePrograms hides nothing, the updated rows carry the arrays. In
        both states the home court guard holds: two programs in one city whose
        mascot hints have no "plays at" phrase are never folded into one.
     5. THE CONSTANTS ADD UP. For each SQL file, rows before minus every delete
        equals rows after, read from the file, not typed here.

   FAILS CLOSED. When a table cannot be read the harness exits 1 and says
   nothing was checked; a table whose count is neither the before nor the after
   constant is a failure, not a skip.

   NEGATIVE CONTROLS. Every one runs on EVERY invocation, in memory over a copy
   of the pulled rows or the SQL text, and the harness is red unless each one
   fires (the section it targets goes red). A control refuses to run, and the
   harness is red, if the row or text it mutates is not there, so a control can
   never pass by changing nothing. SIM_COLLEGE_TABLES_CONTROL=<name> runs just
   that control and exits 0 only if it fired.
     copy       1990 pick 2 becomes an exact copy of pick 1 -> section 1 (copies count)
     blank      a real 2020 first rounder loses position and college -> section 1 (placeholders)
     blocks     1976's round 2 block overlaps round 3      -> section 1 (derived count, the McNeil pin)
     invented   id 14619 is not "Jakob Cepon" any more     -> section 1 (invented count)
     twin       row 23233's points change                  -> section 2 (twins that differ)
     underscore a named cfb_qb row becomes "_ Test"         -> section 3 (unlisted placeholder)
     agree      the app's copy says no name is a placeholder -> section 2 (the copies disagree)
     regex      the app's source carries a different regex -> section 2 (the code differs)
     court      a second Philadelphia program is given La Salle's home court -> section 4 (hidden set)
     generic    the two generic hint programs say where they play -> section 4 (the guard test merges)
     names      the SQL's Seattle array loses "Seattle U"  -> section 4 (arrays differ)
     constants  the nfl SQL's rows after is off by one    -> section 5

   Run: node scripts/simCollegeTables.mjs
   Measured 2026-09-30 on the live tables (all five migrations unapplied):
   nfl_draft_picks 28015 rows, 1000 copies, 71 placeholders, 13 invented, 1653
   derived, 270 unknown; ncaa_player_stats 43800, 1600 twins, 3 placeholders;
   cfb_qb_stats 5800, 3; cfb_rb_stats 14800, 13; cbb_programs 281, 3 hidden,
   cbb_daily 0 rows. Every threshold here is an equality with a constant the
   SQL carries, so there is no margin to set. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pullAll } from './genNflGridData.mjs';
import { cleanDraftPicks, firstRoundEnds, isForfeitRow } from './lib/draftRounds.mjs';
import { isPlaceholderName as isPlaceholderNameScripts } from './lib/placeholderName.mjs';
import * as M from './lib/collegeTablesMirror.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIG = path.join(ROOT, 'supabase', 'migrations');
const SQL = {
  nfl: fs.readFileSync(path.join(MIG, '20260930120000_round_706_nfl_draft_picks.sql'), 'utf8'),
  ncaa: fs.readFileSync(path.join(MIG, '20260930120100_round_706_ncaa_player_stats.sql'), 'utf8'),
  qb: fs.readFileSync(path.join(MIG, '20260930120200_round_706_cfb_qb_stats.sql'), 'utf8'),
  rb: fs.readFileSync(path.join(MIG, '20260930120300_round_706_cfb_rb_stats.sql'), 'utf8'),
  cbb: fs.readFileSync(path.join(MIG, '20260930120400_round_706_cbb_programs.sql'), 'utf8'),
};

const CONTROLS = { copy: 1, blank: 1, blocks: 1, invented: 1, twin: 2, underscore: 3, agree: 2, regex: 2, court: 4, generic: 4, names: 4, constants: 5 };
const ONLY = process.env.SIM_COLLEGE_TABLES_CONTROL || '';
if (ONLY && !CONTROLS[ONLY]) {
  console.error(`SIM_COLLEGE_TABLES_CONTROL=${ONLY} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const abort = m => { console.error(m); process.exit(1); };

/* The record's pins: two organisations agree on the player and the round at these picks
   (docs/audits/college-tables-2026-09-30.md section 2, the "pin: yes" rows). */
const RECORD_PINS = [
  [1976, 472, 'Pat McNeil', 17], [1976, 404, 'Bob Dzierzak', 15],
  [1970, 313, 'Billy Main', 13], [1970, 442, 'Rayford Jenkins', 17],
  [1971, 442, 'Charles Hill', 17],
  [1972, 150, 'Curt Watson', 6], [1972, 250, 'Mike Franks', 10],
  [1973, 330, 'Alan Kelso', 13], [1973, 400, 'Ken Muhlbeier', 16],
  [1974, 100, 'Jimmy Allen', 4],
  [1975, 240, 'Hank Englehardt', 10], [1975, 300, 'Andre Roundtree', 12],
  [1946, 280, 'Jay Perrin', 29], [1946, 281, 'Jim LaRue', 30],
  [1950, 391, 'Dud Parker', 30],
];
const NCAA_KEPT = [22833, 15491, 22955, 22887];
const NCAA_GONE = [23233, 16691, 23355, 23287, 21867, 32408, 41595];

/* ------------------------------------------------------------------ */
/* The app's modules, bundled                                          */
/* ------------------------------------------------------------------ */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simCollegeTables-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
async function loadApp() {
  const entry = path.join(TMP, 'entry.mjs');
  const bundle = path.join(TMP, 'bundle.mjs');
  const abs = f => path.join(ROOT, f).replaceAll('\\', '/');
  fs.writeFileSync(entry, `export * as cbb from '${abs('src/lib/cbbPrograms.ts')}';\nexport * as ph from '${abs('src/lib/placeholderName.ts')}';\n`);
  const r = spawnSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${entry}" --bundle --format=esm --platform=node --outfile="${bundle}" --log-level=error`, { shell: true, encoding: 'utf8' });
  if (r.status !== 0) abort(`esbuild could not bundle the app's college modules:\n${r.stderr || r.stdout}`);
  return import(pathToFileURL(bundle).href);
}
const app = await loadApp();

/** A file's code with its comments removed, so a guard reads the rule and not the prose about it. */
const codeOnly = src => src.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const placeholderRegexIn = src => {
  const m = codeOnly(src).match(/return\s+(\/[^/\n]+\/[a-z]*)\.test\(/);
  return m ? m[1] : null;
};
const PH_TS = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'placeholderName.ts'), 'utf8');
const PH_MJS = fs.readFileSync(path.join(ROOT, 'scripts', 'lib', 'placeholderName.mjs'), 'utf8');

/* ------------------------------------------------------------------ */
/* The pull                                                            */
/* ------------------------------------------------------------------ */
console.log('simCollegeTables: pulling the five tables');
let live;
try {
  const [nfl, ncaa, qb, rb, cbb, daily] = await Promise.all([
    pullAll('nfl_draft_picks', 'id,year,round,pick,player_name,position,team,college', 'id'),
    pullAll('ncaa_player_stats', '*', 'id'),
    pullAll('cfb_qb_stats', 'rk,player_name,player_slug,schools', 'rk'),
    pullAll('cfb_rb_stats', 'rk,player_name,player_slug,schools', 'rk'),
    pullAll('cbb_programs', '*', 'id'),
    pullAll('cbb_daily', 'program_id,puzzle_date', 'puzzle_date'),
  ]);
  live = { nfl, ncaa, qb, rb, cbb, daily };
} catch (err) {
  abort(`simCollegeTables: ${err.message}\nNOTHING WAS CHECKED.`);
}
console.log(`   nfl_draft_picks ${live.nfl.length}, ncaa_player_stats ${live.ncaa.length}, cfb_qb_stats ${live.qb.length}, cfb_rb_stats ${live.rb.length}, cbb_programs ${live.cbb.length}, cbb_daily ${live.daily.length}`);

const clone = rows => rows.map(r => ({ ...r }));
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const sameArray = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** 'before' when the table holds the SQL's measured count, 'after' when it holds the expected end count, else null. */
function stateOf(n, C) {
  if (n === C.expected_rows_before) return 'before';
  if (n === C.expected_rows_after) return 'after';
  return null;
}

/* ------------------------------------------------------------------ */
/* Section 1: nfl_draft_picks                                          */
/* ------------------------------------------------------------------ */
function sectionOne(rows, sql) {
  const out = [];
  const C = M.readMigrationConstants(sql);
  const invented = M.readInventedRows(sql);
  if (invented.length !== C.expected_invented) out.push(`the SQL lists ${invented.length} invented rows and says ${C.expected_invented}`);
  const state = stateOf(rows.length, C);
  if (!state) { out.push(`nfl_draft_picks holds ${rows.length} rows, neither the measured ${C.expected_rows_before} nor the expected ${C.expected_rows_after} after the migration`); return { out, state }; }

  const rep = M.mirrorNflDraftPicks(rows, invented);
  const final = state === 'before' ? rep.result : rows;
  if (state === 'before') {
    for (const [k, v] of [['copies', C.expected_exact_copies], ['placeholders', C.expected_placeholders], ['invented', C.expected_invented], ['derived', C.expected_rounds_derived], ['unknown', C.expected_rounds_unknown]]) {
      if (rep[k] !== v) out.push(`step ${k}: the mirror counts ${rep[k]}, the SQL says ${v}`);
    }
    if (rep.result.length !== C.expected_rows_after) out.push(`the mirror leaves ${rep.result.length} rows, the SQL expects ${C.expected_rows_after}`);
  } else {
    if (rep.copies !== 0) out.push(`${rep.copies} exact copies remain after the migration`);
    if (rep.placeholders !== 0) out.push(`${rep.placeholders} placeholder rows remain after the migration`);
    if (rep.invented !== 0) out.push(`${rep.invented} invented 1977 rows remain after the migration`);
    const past = M.roundOnePastBoundary(rows);
    if (past.length !== 0) out.push(`${past.length} rows are still round 1 past their first round after the migration`);
  }

  // The record's pins, on the rows the migration leaves (derived here before it lands, read back after).
  // A name the scrape mirrored ("Watson, CurtCurt Watson") is read as the readers read it, "Curt Watson".
  const readName = s => { const m = String(s).match(/^([^,]+), (\S+)\2 (.+)$/); return m && m[3] === m[1] ? `${m[2]} ${m[1]}` : String(s); };
  for (const [year, pick, name, round] of RECORD_PINS) {
    const r = final.find(x => x.year === year && x.pick === pick);
    if (!r) { out.push(`${year} pick ${pick}: no row`); continue; }
    if (readName(r.player_name) !== name || r.round !== round) out.push(`${year} pick ${pick}: ${r.player_name} round ${r.round}, the record says ${name} round ${round}`);
  }
  const tail77 = final.filter(r => r.year === 1977 && r.pick >= 280 && r.pick <= 335);
  if (tail77.length !== 43) out.push(`1977 picks 280 to 335 hold ${tail77.length} rows, expected 43 once the invented rows are gone`);
  if (tail77.some(r => r.round !== null)) out.push(`1977's tail still carries a round`);
  if (final.some(r => r.year === 1982 && r.pick >= 252 && r.pick <= 334 && r.round !== null)) out.push(`1982 picks 252 to 334 carry a round`);
  if (final.some(r => r.team === 'Baltimore Fatsos')) out.push(`a Baltimore Fatsos row survives`);
  for (const y of [2024, 2025]) {
    const n = final.filter(r => r.year === y).length;
    if (n !== 257) out.push(`${y} holds ${n} rows, expected 257`);
  }

  // cleanDraftPicks, the College Grid key's reader: the same under the old rule and the new one,
  // and the same before and after the migration but for the invented rows.
  const ids = list => list.map(r => r.id);
  const oldRule = list => {
    const byKey = new Map();
    for (const r of list) {
      if (isForfeitRow(r)) continue;
      const key = `${r.year}|${r.pick}`;
      if (!(r.pick > 0)) continue;
      const have = byKey.get(key);
      if (!have || r.id < have.id) byKey.set(key, r);
    }
    return [...byKey.values()].sort((a, b) => a.year - b.year || a.pick - b.pick);
  };
  const cleanedNow = cleanDraftPicks(rows);
  if (!sameArray(ids(cleanedNow), ids(oldRule(rows)))) out.push('cleanDraftPicks differs between the forfeit rule and the placeholder rule on the live rows');
  if (state === 'before') {
    const cleanedAfter = cleanDraftPicks(rep.result);
    const inventedIds = new Set(invented.map(x => x.id));
    const expected = cleanedNow.filter(r => !inventedIds.has(r.id));
    if (!sameArray(ids(cleanedAfter), ids(expected))) out.push(`cleanDraftPicks after the migration is not the rows before minus the ${invented.length} invented ones (${cleanedAfter.length} against ${expected.length})`);
    const endsNow = firstRoundEnds(cleanedNow), endsAfter = firstRoundEnds(cleanedAfter);
    const moved = [...endsNow].filter(([y, e]) => endsAfter.get(y) !== e).map(([y]) => y);
    if (moved.length) out.push(`the first round boundary moves in ${moved.join(', ')}`);
  }
  return { out, state, rep };
}

/* ------------------------------------------------------------------ */
/* Section 2: ncaa_player_stats and the placeholder rule               */
/* ------------------------------------------------------------------ */
function sectionTwo(rows, sql, { qb, rb, tsFn = app.ph.isPlaceholderName, tsSrc = PH_TS }) {
  const out = [];
  const C = M.readMigrationConstants(sql);
  const state = stateOf(rows.length, C);
  if (!state) { out.push(`ncaa_player_stats holds ${rows.length} rows, neither ${C.expected_rows_before} nor ${C.expected_rows_after}`); return { out, state }; }
  const rep = M.mirrorNcaaPlayerStats(rows);
  if (rep.noSlug !== 0) out.push(`${rep.noSlug} rows have no player_slug`);
  if (rep.differing !== 0) out.push(`${rep.differing} twin slugs hold rows that differ, so they are not copies`);
  const final = state === 'before' ? rep.result : rows;
  if (state === 'before') {
    if (rep.twins !== C.expected_twin_rows) out.push(`twin rows: the mirror counts ${rep.twins}, the SQL says ${C.expected_twin_rows}`);
    if (rep.placeholders !== C.expected_placeholders) out.push(`placeholder names: the mirror counts ${rep.placeholders}, the SQL says ${C.expected_placeholders}`);
    if (rep.result.length !== C.expected_rows_after) out.push(`the mirror leaves ${rep.result.length} rows, the SQL expects ${C.expected_rows_after}`);
  } else {
    if (rep.twins !== 0) out.push(`${rep.twins} twin rows remain after the migration`);
    if (rep.placeholders !== 0) out.push(`${rep.placeholders} placeholder names remain after the migration`);
  }
  const finalIds = new Set(final.map(r => r.id));
  for (const id of NCAA_KEPT) if (!finalIds.has(id)) out.push(`kept sample row ${id} is gone`);
  for (const id of NCAA_GONE) if (finalIds.has(id)) out.push(`deleted sample row ${id} is still there`);

  // The two copies of the rule agree on every live name, and their code is the same rule.
  const names = [...rows, ...qb, ...rb].map(r => r.player_name);
  const disagree = names.filter(n => isPlaceholderNameScripts(n) !== tsFn(n));
  if (disagree.length) out.push(`the two isPlaceholderName copies disagree on ${disagree.length} live names (${disagree.slice(0, 3).join(', ')})`);
  const flagged = names.filter(n => isPlaceholderNameScripts(n)).length;
  if (state === 'before' && flagged !== C.expected_placeholders + M.readRkList(SQL.qb).length + M.readRkList(SQL.rb).length) out.push(`the rule flags ${flagged} live names across the three tables, the SQL files list ${C.expected_placeholders + M.readRkList(SQL.qb).length + M.readRkList(SQL.rb).length}`);
  const reTs = placeholderRegexIn(tsSrc), reMjs = placeholderRegexIn(PH_MJS);
  if (!reTs || !reMjs) out.push(`could not read the regex out of the code (ts ${reTs}, mjs ${reMjs})`);
  else if (reTs !== reMjs) out.push(`src/lib/placeholderName.ts tests ${reTs} and scripts/lib/placeholderName.mjs tests ${reMjs}`);
  return { out, state, rep };
}

/* ------------------------------------------------------------------ */
/* Section 3: cfb_qb_stats and cfb_rb_stats                            */
/* ------------------------------------------------------------------ */
function sectionThree(rows, sql, label) {
  const out = [];
  const C = M.readMigrationConstants(sql);
  const rk = M.readRkList(sql);
  const state = stateOf(rows.length, C);
  if (!state) { out.push(`${label} holds ${rows.length} rows, neither ${C.expected_rows_before} nor ${C.expected_rows_after}`); return { out, state }; }
  const rep = M.mirrorCfbStats(rows, rk);
  if (state === 'before') {
    if (rk.length !== C.expected_placeholders) out.push(`${label}: the SQL lists ${rk.length} rk and says ${C.expected_placeholders}`);
    if (rep.placeholders !== C.expected_placeholders) out.push(`${label}: ${rep.placeholders} placeholder names live, the SQL says ${C.expected_placeholders}`);
    if (rep.unlisted.length) out.push(`${label}: ${rep.unlisted.length} placeholder names the SQL does not list (rk ${rep.unlisted.map(r => r.rk).join(', ')})`);
    if (rep.listed !== rk.length) out.push(`${label}: the SQL lists ${rk.length} rk but only ${rep.listed} hold a placeholder name`);
    if (rep.result.length !== C.expected_rows_after) out.push(`${label}: the mirror leaves ${rep.result.length} rows, the SQL expects ${C.expected_rows_after}`);
  } else if (rep.placeholders !== 0) out.push(`${label}: ${rep.placeholders} placeholder names remain after the migration`);
  return { out, state };
}

/* ------------------------------------------------------------------ */
/* Section 4: cbb_programs                                             */
/* ------------------------------------------------------------------ */
const GENERIC_PAIR = [
  { id: 'g1', school_name: 'Alpha College', common_names: ['Alpha'], region_hint: 'Philadelphia, Pennsylvania (Northeast)', mascot_hint: 'The Hawks, whose mascot never stops flapping its wings', created_at: '2026-01-01T00:00:00Z' },
  { id: 'g2', school_name: 'Beta University', common_names: ['Beta'], region_hint: 'Philadelphia, Pennsylvania (Northeast)', mascot_hint: 'The Hawks, whose mascot never stops flapping its wings', created_at: '2026-01-02T00:00:00Z' },
];
function sectionFour(rows, sql, daily, genericPair = GENERIC_PAIR) {
  const out = [];
  const C = M.readMigrationConstants(sql);
  const mig = M.readCbbMigration(sql);
  const state = stateOf(rows.length, C);
  if (!state) { out.push(`cbb_programs holds ${rows.length} rows, neither ${C.expected_rows_before} nor ${C.expected_rows_after}`); return { out, state }; }
  const { programs, replacedBy } = app.cbb.dedupePrograms(rows);
  const hidden = [...replacedBy.keys()];
  const liveById = new Map(rows.map(r => [r.id, r]));
  if (state === 'before') {
    if (!sameSet(hidden, mig.deletes)) out.push(`dedupePrograms hides ${hidden.length} rows (${hidden.map(h => h.slice(0, 8)).join(', ')}), the SQL deletes ${mig.deletes.length} (${mig.deletes.map(h => h.slice(0, 8)).join(', ')})`);
    if (programs.length !== C.expected_rows_after) out.push(`dedupePrograms keeps ${programs.length} programs, the SQL expects ${C.expected_rows_after} rows`);
    for (const p of programs) {
      const want = mig.updates.has(p.id) ? mig.updates.get(p.id) : liveById.get(p.id)?.common_names;
      if (!sameArray(p.common_names, want)) out.push(`${p.school_name} (${p.id.slice(0, 8)}) ends with ${JSON.stringify(p.common_names)}, the SQL leaves ${JSON.stringify(want)}`);
    }
    for (const id of mig.updates.keys()) if (!programs.some(p => p.id === id)) out.push(`the SQL updates ${id.slice(0, 8)} but dedupePrograms does not keep it`);
    // Every hidden twin's own name is still a correct guess on its kept row.
    for (const id of hidden) {
      const kept = replacedBy.get(id);
      const twinName = app.cbb.foldProgramText(liveById.get(id).school_name);
      const names = [kept.school_name, ...(kept.common_names ?? [])].map(app.cbb.foldProgramText);
      if (!names.includes(twinName)) out.push(`"${liveById.get(id).school_name}" is no longer a correct guess on ${kept.school_name}`);
    }
    const pointed = daily.filter(d => hidden.includes(d.program_id));
    if (pointed.length) out.push(`cbb_daily points at a hidden row on ${pointed.map(d => d.puzzle_date).join(', ')}`);
  } else {
    if (hidden.length) out.push(`dedupePrograms still hides ${hidden.length} rows after the migration`);
    for (const [id, arr] of mig.updates) {
      const row = liveById.get(id);
      if (!row) out.push(`updated row ${id.slice(0, 8)} is gone`);
      else if (!sameArray(row.common_names, arr)) out.push(`${row.school_name} carries ${JSON.stringify(row.common_names)}, the SQL wrote ${JSON.stringify(arr)}`);
    }
    for (const id of mig.deletes) if (liveById.has(id)) out.push(`deleted row ${id.slice(0, 8)} is still there`);
  }
  // The home court guard: one city, one generic hint, two programs.
  const g = app.cbb.dedupePrograms(genericPair);
  if (g.replacedBy.size !== 0) out.push(`two programs in one city with a generic mascot hint were folded into one (${[...g.replacedBy.keys()].join(', ')})`);
  for (const r of genericPair) if (app.cbb.programKeys(r).some(k => k.startsWith('court:')) && !/\bplays? at\s+/i.test(r.mascot_hint)) out.push(`${r.school_name} gets a court key from a hint with no "plays at"`);
  return { out, state };
}

/* ------------------------------------------------------------------ */
/* Section 5: the constants add up                                     */
/* ------------------------------------------------------------------ */
function sectionFive(sqls) {
  const out = [];
  const nfl = M.readMigrationConstants(sqls.nfl);
  if (nfl.expected_rows_before - nfl.expected_exact_copies - nfl.expected_placeholders - nfl.expected_invented !== nfl.expected_rows_after) out.push(`nfl_draft_picks: ${nfl.expected_rows_before} - ${nfl.expected_exact_copies} - ${nfl.expected_placeholders} - ${nfl.expected_invented} is not ${nfl.expected_rows_after}`);
  const ncaa = M.readMigrationConstants(sqls.ncaa);
  if (ncaa.expected_rows_before - ncaa.expected_twin_rows - ncaa.expected_placeholders !== ncaa.expected_rows_after) out.push(`ncaa_player_stats: the constants do not add up`);
  for (const k of ['qb', 'rb']) {
    const c = M.readMigrationConstants(sqls[k]);
    if (c.expected_rows_before - c.expected_placeholders !== c.expected_rows_after) out.push(`cfb_${k}_stats: the constants do not add up`);
  }
  const cbb = M.readMigrationConstants(sqls.cbb);
  const del = M.readCbbMigration(sqls.cbb).deletes.length;
  if (cbb.expected_rows_before - del !== cbb.expected_rows_after) out.push(`cbb_programs: ${cbb.expected_rows_before} - ${del} deletes is not ${cbb.expected_rows_after}`);
  return { out };
}

/* ------------------------------------------------------------------ */
/* The real run                                                        */
/* ------------------------------------------------------------------ */
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
function report(n, title, res) {
  console.log(`${n}. ${title}${res.state ? ` (${res.state} the migration)` : ''}`);
  if (res.out.length === 0) console.log('   ok'); else res.out.forEach(fail);
}
if (!ONLY) {
  const s1 = sectionOne(live.nfl, SQL.nfl);
  report(1, 'nfl_draft_picks', s1);
  if (s1.rep) console.log(`   copies ${s1.rep.copies}, placeholders ${s1.rep.placeholders}, invented ${s1.rep.invented}, derived ${s1.rep.derived}, unknown ${s1.rep.unknown}, ${s1.rep.result.length} rows left; ${RECORD_PINS.length} record pins`);
  const s2 = sectionTwo(live.ncaa, SQL.ncaa, { qb: live.qb, rb: live.rb });
  report(2, 'ncaa_player_stats and the placeholder rule', s2);
  if (s2.rep) console.log(`   twins ${s2.rep.twins}, differing ${s2.rep.differing}, placeholders ${s2.rep.placeholders}, ${s2.rep.result.length} rows left`);
  const s3a = sectionThree(live.qb, SQL.qb, 'cfb_qb_stats');
  const s3b = sectionThree(live.rb, SQL.rb, 'cfb_rb_stats');
  report(3, 'cfb_qb_stats and cfb_rb_stats', { out: [...s3a.out, ...s3b.out], state: s3a.state === s3b.state ? s3a.state : `qb ${s3a.state}, rb ${s3b.state}` });
  report(4, 'cbb_programs', sectionFour(live.cbb, SQL.cbb, live.daily));
  report(5, 'the constants add up', sectionFive(SQL));
}

/* ------------------------------------------------------------------ */
/* The controls                                                        */
/* ------------------------------------------------------------------ */
const fired = [];
const control = (name, fn) => {
  if (ONLY && ONLY !== name) return;
  const res = fn();
  const ok = res.out.length > 0;
  if (ok) { fired.push(name); console.log(`   fired: ${name} -> ${res.out[0]}`); }
  else fail(`control ${name} changed nothing it should have`);
};
const need = (cond, what) => { if (!cond) abort(`control cannot run: ${what} is not there. NOTHING WAS CHECKED.`); };
console.log('controls');
control('copy', () => {
  const rows = clone(live.nfl);
  const a = rows.find(x => x.year === 1990 && x.pick === 1);
  const b = rows.find(x => x.year === 1990 && x.pick === 2);
  need(a && b && b.id > a.id, '1990 picks 1 and 2, pick 2 the higher id');
  Object.assign(b, { ...a, id: b.id });
  return sectionOne(rows, SQL.nfl);
});
control('blank', () => {
  const rows = clone(live.nfl);
  const r = rows.find(x => x.year === 2020 && x.round === 1 && x.position && x.college);
  need(r, 'a 2020 first rounder with a position and a college');
  r.position = ''; r.college = null;
  return sectionOne(rows, SQL.nfl);
});
control('blocks', () => {
  const rows = clone(live.nfl);
  const r = rows.find(x => x.year === 1976 && x.pick === 60 && x.round === 2);
  need(r, '1976 pick 60 in round 2');
  r.round = 4;
  return sectionOne(rows, SQL.nfl);
});
control('invented', () => {
  const rows = clone(live.nfl);
  const r = rows.find(x => x.id === 14619 && x.player_name === 'Jakob Cepon');
  need(r, 'id 14619 "Jakob Cepon"');
  r.player_name = 'Someone Else';
  return sectionOne(rows, SQL.nfl);
});
control('twin', () => {
  const rows = clone(live.ncaa);
  const r = rows.find(x => x.id === 23233);
  need(r, 'ncaa row 23233');
  r.points = Number(r.points ?? 0) + 1;
  return sectionTwo(rows, SQL.ncaa, { qb: live.qb, rb: live.rb });
});
control('underscore', () => {
  const rows = clone(live.qb);
  const r = rows.find(x => !isPlaceholderNameScripts(x.player_name));
  need(r, 'a named cfb_qb row');
  r.player_name = '_ Test';
  return sectionThree(rows, SQL.qb, 'cfb_qb_stats');
});
control('agree', () => sectionTwo(live.ncaa, SQL.ncaa, { qb: live.qb, rb: live.rb, tsFn: () => false }));
control('regex', () => {
  need(placeholderRegexIn(PH_TS) === '/^\\s*_/', 'the regex /^\\s*_/ in src/lib/placeholderName.ts code');
  const src = codeOnly(PH_TS).replace('/^\\s*_/', '/^\\s*__/');
  need(src !== codeOnly(PH_TS), 'a changed source');
  return sectionTwo(live.ncaa, SQL.ncaa, { qb: live.qb, rb: live.rb, tsSrc: src });
});
control('court', () => {
  const rows = clone(live.cbb);
  const a = rows.find(x => x.school_name === 'La Salle' && /\bplays? at\s+/i.test(x.mascot_hint ?? ''));
  const b = rows.find(x => x.school_name === 'Temple');
  need(a && b && app.cbb.foldProgramText(a.region_hint) === app.cbb.foldProgramText(b.region_hint), 'La Salle (with a "plays at" hint) and Temple in one city');
  b.mascot_hint = a.mascot_hint;
  return sectionFour(rows, SQL.cbb, live.daily);
});
control('generic', () => {
  const pair = GENERIC_PAIR.map(r => ({ ...r, mascot_hint: 'The Hawks, who play at Hagan Arena' }));
  return sectionFour(live.cbb, SQL.cbb, live.daily, pair);
});
control('names', () => {
  need(SQL.cbb.includes("'Seattle', 'Redhawks', 'SU', 'Seattle U', 'Seattle University'"), "the Seattle array in the cbb SQL");
  const sql = SQL.cbb.replace("'Seattle', 'Redhawks', 'SU', 'Seattle U', 'Seattle University'", "'Seattle', 'Redhawks', 'SU', 'Seattle University'");
  return sectionFour(live.cbb, sql, live.daily);
});
control('constants', () => {
  const m = SQL.nfl.match(/expected_rows_after\s+constant integer := (\d+);/);
  need(m, 'expected_rows_after in the nfl SQL');
  const sql = SQL.nfl.replace(m[0], m[0].replace(m[1], String(Number(m[1]) + 1)));
  return sectionFive({ ...SQL, nfl: sql });
});

if (ONLY) {
  if (fired.length === 1) { console.log(`control "${ONLY}": fired in section ${CONTROLS[ONLY]} as expected, the check works`); process.exit(0); }
  console.error(`control "${ONLY}" did not fire`);
  process.exit(1);
}
if (failures) {
  console.error(`simCollegeTables: RED, ${failures} failure${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`simCollegeTables: green. The five tables agree with their migrations (or with their end state), the readers agree with the SQL, the derived rounds match the record, and all ${fired.length} controls fired.`);
