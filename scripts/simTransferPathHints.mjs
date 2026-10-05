/**
 * Round 294 harness: Transfer Path's minimum and hint tell the truth about the
 * graph the game plays on.
 *
 * The rule since 2026-07-10 is same club, same season. The puzzle rows were
 * written before it: "Direct link. Both wore the Barcelona shirt" on a pair
 * the game refuses (tp-19, the 2026-08-19 report), "One middle man does it"
 * on puzzles that need two or three, and 84 minimums that could be beaten.
 * Every row is now derived by scripts/genTransferPathHints.mjs; this fence
 * holds the derivation and the shipped rows to the same standard:
 *
 *   1. THE APPLIED COMPANION AGAINST THE CURRENT PULL. Every retained classic
 *      row in the quarantine companion is checked on the graph in
 *      scripts/data/transferPathPull/: the
 *      minimum is the search's minimum, the hint promises that many steps,
 *      names both players, and a shortest path really starts at the club it
 *      names first and ends at the club it names last. All 885 retained
 *      puzzles are reachable. Seventeen Jonathan David pairs were
 *      quarantined when their only path depended on a projected season.
 *   2. THE FALLBACK THE PAGE SHOWS WHEN THE TABLE IS DOWN. src/data/transferPathPuzzles.ts
 *      against src/data/careerPlayers.ts by the same test, and each
 *      oneOptimalPath is a chain the game would accept, link by link.
 *   3. THE LIVE TABLES, through the site's own fetchers plus a raw active-pair
 *      read. Active accepts only two atomic rollout states: the applied
 *      2026-09-07 restore's 203 pairs exactly, or the Round 531 refresh's 212
 *      pairs exactly (the identity set grew from 78 to 90; the refresh is
 *      applied after the Round 531 frontend is live). Partial and mixed states
 *      fail, and the applied state prints how many of its rows the current
 *      identity set already beats, so the pending refresh cannot be forgotten.
 *      SKIPS LOUDLY when Supabase is unreachable.
 *   4. THE WORDING: no long dash, under 200 characters, and no hint that
 *      says "Direct link" on a pair the game would refuse (the exact shape
 *      of the reported defect, kept as its own line so it can never return).
 *   5. THE CURRENT SPECIAL RULE ROWS against the pull, per rule.
 *   6. THE QUARANTINE COMPANION. Its 17 exact deletions equal the evidence
 *      ledger, its 885 retained rows equal both generated hint migrations
 *      field for field, and its transaction and row-count guards stay intact.
 *   7. THE ROUND 784 REWRITE. The career quiz's first club rows (Alisson at
 *      Internacional in 2013, Musiala's 2019-2020 Bayern game and more) are
 *      new links, so supabase/migrations/20261001120000_career_first_clubs.sql
 *      rewrites, in the same transaction, the Transfer Path entries they
 *      shorten. On the baked pool (src/data/careerPlayers.ts, the tables after
 *      that migration) every rewritten value must be the search's own, every
 *      value it replaces must be the applied companion's, every applied entry
 *      the pool beats must be rewritten and no other, and the pending active
 *      refresh must still hold. Measured 2026-10-01: 8 entries on 6 puzzles
 *      (6 classic, 2 Europe), no active entry moves. Section 3 accepts the live
 *      table on either side of that rewrite, never between. Since Round 1010b
 *      the committed bake is a later pool, so this section runs on the pool
 *      before 1010, rebuilt by undoing scripts/data/careerSeason2025.json and
 *      proved by its preBake hash (aborts otherwise).
 *   8. THE ROUND 1010B REWRITE (supabase/migrations/20261015120000_round_1010_
 *      career_season_2025_26.sql): every puzzle naming the removed Alisson
 *      Becker is renamed to Alisson, every entry the bake beats (classic,
 *      Europe, active) is rewritten and no other, each new value is the
 *      search's on the bake and each old value the one live after Round 784
 *      and the Round 531 refresh. Measured 2026-10-05: 13 renames, 53
 *      rewrites (18 classic, 19 Europe, 16 active); tpa-762 goes from 3 to 2.
 *      Section 3 accepts the live table before or after it, never between,
 *      and the reader it uses is proved here on both tables and a half one.
 *
 * NEGATIVE CONTROLS: TPH_CONTROL=stale plants the old tp-19 hint on the
 * parsed migration (section 1 must go red); TPH_CONTROL=club plants a hint
 * naming a club the first player never shared with anyone (section 1 must
 * go red); TPH_CONTROL=min raises the minimum on tpa-944 (section 1
 * must go red); TPH_CONTROL=direct plants a well formed direct link claim on
 * tp-19, the reported pair, which the game refuses (sections 1 and 4 must go
 * red); TPH_CONTROL=companion changes one retained row only in the parsed
 * companion migration (section 6 must go red); TPH_CONTROL=livepuzzleid
 * changes one live puzzle id in memory and the restore preflight must catch it.
 * TPH_CONTROL=r784min writes tpa-285's classic minimum one step too high in
 * the parsed Round 784 rows, and TPH_CONTROL=r784drop drops tpa-640's Europe
 * row from them (section 7 must report that exact row in both).
 * Round 1010b: TPH_CONTROL=r1010min writes tpa-762's classic minimum one step
 * too high, r1010drop drops its Europe rewrite, r1010rename leaves it
 * unrenamed (section 8 must report tpa-762 in each), and r1010append rebuilds
 * the pre-1010 pool with Alisson Becker appended instead of at his sorted place
 * (the preBake hash must refuse it).
 *
 * Run: node scripts/simTransferPathHints.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { MODE_RULES, ROUND_784_MIGRATION, buildGraph, deriveHint, distances, expandCompactCareers, hintProblems, parseActiveRefreshMigration, parseActiveRestoreMigration, parseHint, parseRuleEntryRefresh, parseTransferPathCompanionMigration, ruleEntryRefreshState, ruleProblems, sharedClub } from './lib/transferPathHints.mjs';
import { LEDGER_FILE as SEASON_LEDGER_FILE, bakeHash, parseSeasonMigrationPuzzles, seasonMigrationState, undoLedger } from './lib/careerSeasonLedger.mjs';
import { MIGRATION_OUT as SEASON_MIGRATION, RULES as SEASON_RULES, liveAfter784, ruleGraphs } from './genCareerSeasonAdditions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TPH_CONTROL || '';
const LOCAL_ONLY = process.env.TRANSFER_PATH_LOCAL_ONLY === '1';
if (CONTROL && !['stale', 'club', 'min', 'direct', 'mode', 'companion', 'livepuzzleid', 'r784min', 'r784drop', 'r1010min', 'r1010drop', 'r1010rename', 'r1010append'].includes(CONTROL)) { console.error(`TPH_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
/* Round 1010b: the season ledger, and its migration's Transfer Path rows read back */
const seasonLedger = JSON.parse(fs.readFileSync(path.join(ROOT, SEASON_LEDGER_FILE), 'utf8'));
const season1010 = parseSeasonMigrationPuzzles(fs.readFileSync(path.join(ROOT, SEASON_MIGRATION), 'utf8'));
const sameValue = (x, y) => (x === null && y === null) || (!!x && !!y && x.minSteps === y.minSteps && x.hint === y.hint);
let failures = 0;
let liveIdControlCaught = false;
const fail = m => { failures += 1; if (failures <= 25) console.error('  FAIL: ' + m); };

/* the puzzle counts measured on 2026-08-26; a shrink is lost coverage */
const PUZZLE_FLOOR = 885;
const PLAYER_FLOOR = 253;
const COMPANION = path.join(ROOT, 'supabase/migrations/20260907173202_quarantine_unreachable_transfer_path_puzzles_and_refresh_hints.sql');
const APPLIED_RESTORE = path.join(ROOT, 'supabase/migrations/20260907190000_restore_verified_active_transfer_path_hints.sql');
const ACTIVE_RESTORE = path.join(ROOT, 'supabase/migrations/20260911190000_refresh_verified_active_transfer_path_hints.sql');
/* Round 531: the 90 verified identities connect 212 of the 885 retained puzzles
   (docs/audits/transfer-path-active-identities-2026-09-11.md); the applied
   2026-09-07 restore holds 203 on 78 and is the other valid live state */
const ACTIVE_RESTORE_ROWS = 212;
const APPLIED_ACTIVE_ROWS = 203;

function checkRows(graph, rows, label) {
  let unreachable = 0, checked = 0;
  for (const r of rows) {
    const problems = hintProblems(graph, r.a, r.b, r.minSteps, r.hint);
    if (problems.includes('no path exists')) unreachable += 1;
    for (const p of problems) fail(`${label} ${r.id} (${r.a} to ${r.b}): ${p}`);
    checked += 1;
  }
  return { unreachable, checked };
}

console.log('1) the applied companion classic rows against the current pull');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
  const graph = buildGraph(players);
  const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
  const parsed = parseTransferPathCompanionMigration(fs.readFileSync(COMPANION, 'utf8'));
  const rows = parsed.desired.map(row => ({ id: row.id, a: row.playerA, b: row.playerB, minSteps: row.minSteps, hint: row.hint }));
  if (rows.length !== pairs.size) fail(`the applied companion carries ${rows.length} retained rows for ${pairs.size} pulled puzzles`);
  for (const row of rows) {
    const pair = pairs.get(row.id);
    if (!pair) fail(`the applied companion updates ${row.id}, which the pull does not have`);
    else if (row.a !== pair.a || row.b !== pair.b) fail(`the applied companion ${row.id} names ${row.a} to ${row.b}, expected ${pair.a} to ${pair.b}`);
  }
  if (rows.length < PUZZLE_FLOOR) fail(`${rows.length} puzzles, the floor is ${PUZZLE_FLOOR}`);
  if (graph.names.length < PLAYER_FLOOR) fail(`${graph.names.length} players in the pull, the floor is ${PLAYER_FLOOR}`);
  if (CONTROL === 'stale') { const r = rows.find(x => x.id === 'tp-19'); r.hint = 'Direct link. Both wore the Barcelona shirt.'; console.log('   NEGATIVE CONTROL ON: tp-19 carries its old hint again, this section must go red'); }
  if (CONTROL === 'club') { const r = rows.find(x => x.id === 'tp-3'); r.hint = `One middle man does it. He was at Liverpool with ${r.a} and at Manchester United with ${r.b}.`; console.log('   NEGATIVE CONTROL ON: tp-3 names a club Pirlo never shared with anyone, this section must go red'); }
  if (CONTROL === 'direct') { const r = rows.find(x => x.id === 'tp-19'); r.minSteps = 1; r.hint = 'Direct link. They were at Barcelona together.'; console.log('   NEGATIVE CONTROL ON: tp-19 claims a direct link in the new wording, on a pair the game refuses, this section must go red'); }
  if (CONTROL === 'min') {
    const r = rows.find(x => x.id === 'tpa-944');
    if (!r) { console.error('control cannot run: tpa-944 is not in the pull'); process.exit(1); }
    r.minSteps += 1;
    console.log('   NEGATIVE CONTROL ON: tpa-944 carries a minimum one step too high, this section must go red');
  }
  const { unreachable, checked } = checkRows(graph, rows, 'companion');
  if (unreachable) fail(`${unreachable} puzzles cannot be solved on the pulled graph`);
  const byMin = {};
  for (const r of rows) byMin[r.minSteps] = (byMin[r.minSteps] ?? 0) + 1;
  console.log(`   ${checked} puzzles checked on ${graph.names.length} players; by minimum ${JSON.stringify(byMin)}`);
  if ((byMin[2] ?? 0) < 400 || (byMin[3] ?? 0) < 300) fail('the mix of minimums moved a long way from the corrected 2026-09-07 measurement (469 twos, 374 threes, 40 fours, 2 fives)');
}

console.log('2) the fallback the page shows when the table is down');
const ENTRY = path.join(os.tmpdir(), 'tph-entry.mjs');
const OUT = path.join(os.tmpdir(), 'tph-bundle.mjs');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
fs.writeFileSync(ENTRY, `
export { default as fallbackPuzzles } from '${ROOT.replaceAll('\\', '/')}/src/data/transferPathPuzzles.ts';
export { careerPlayers as fallbackPlayers } from '${ROOT.replaceAll('\\', '/')}/src/data/careerPlayers.ts';
export { fetchCareerPlayers } from '${ROOT.replaceAll('\\', '/')}/src/lib/fetchCareerPlayers.ts';
export { fetchTransferPathPuzzles } from '${ROOT.replaceAll('\\', '/')}/src/lib/fetchTransferPathPuzzles.ts';
export { fetchAllRows } from '${ROOT.replaceAll('\\', '/')}/src/lib/fetchAllRows.ts';
export { supabase } from '${ROOT.replaceAll('\\', '/')}/src/integrations/supabase/client.ts';
export { playersUnderRule } from '${ROOT.replaceAll('\\', '/')}/src/lib/transferPathModes.ts';
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const site = await import(pathToFileURL(OUT).href);
{
  const graph = buildGraph(site.fallbackPlayers);
  const rows = site.fallbackPuzzles.map(p => ({ id: p.id, a: p.playerA, b: p.playerB, minSteps: p.minSteps, hint: p.hint, path: p.oneOptimalPath }));
  if (rows.length < 12) fail(`only ${rows.length} fallback puzzles`);
  const { unreachable, checked } = checkRows(graph, rows, 'fallback');
  if (unreachable) fail(`${unreachable} fallback puzzles cannot be solved on the fallback pool`);
  for (const r of rows) {
    if (!Array.isArray(r.path)) { fail(`fallback ${r.id} has no oneOptimalPath`); continue; }
    if (r.path[0] !== r.a || r.path[r.path.length - 1] !== r.b) fail(`fallback ${r.id}: the path does not run from ${r.a} to ${r.b}`);
    if (r.path.length - 1 !== r.minSteps) fail(`fallback ${r.id}: the path has ${r.path.length - 1} steps, minSteps says ${r.minSteps}`);
    for (let i = 1; i < r.path.length; i++) if (sharedClub(graph, r.path[i - 1], r.path[i]) === null) fail(`fallback ${r.id}: ${r.path[i - 1]} and ${r.path[i]} never shared a season, the game would refuse that link`);
  }
  console.log(`   ${checked} fallback puzzles on ${graph.names.length} fallback players, every path a chain the game accepts`);
}

console.log('3) the live tables, through the site\'s own fetchers');
{
  if (LOCAL_ONLY) {
    console.log('   SKIPPED BY TRANSFER_PATH_LOCAL_ONLY=1. Live is not claimed checked.');
  } else {
  let players = [], puzzles = [], rawPuzzles = [], rawError = null;
  try {
    const warn = console.warn; console.warn = () => {};
    const raw = site.fetchAllRows((from, to) => site.supabase
      .from('transfer_path_puzzles')
      .select('puzzle_id, active_min_steps, active_hint')
      .order('puzzle_id', { ascending: true })
      .range(from, to));
    [players, puzzles, { data: rawPuzzles, error: rawError }] = await Promise.all([site.fetchCareerPlayers(), site.fetchTransferPathPuzzles(), raw]);
    console.warn = warn;
  } catch { players = []; puzzles = []; rawPuzzles = []; rawError = true; }
  if (!players.length || !puzzles.length || rawError || !rawPuzzles.length) {
    console.log('   SKIPPED, SUPABASE UNREACHABLE. NOT CHECKED. The migration was checked against its pull in section 1; run this where the host is reachable.');
  } else {
    if (CONTROL === 'livepuzzleid') {
      const before = puzzles.find(puzzle => puzzle.id === 'tpa-26');
      if (!before) { console.error('control cannot run: live tpa-26 is absent'); process.exit(1); }
      puzzles = puzzles.map(puzzle => puzzle === before ? { ...puzzle, id: 'control-tpa-26-missing' } : puzzle);
      console.log('   NEGATIVE CONTROL ON: live tpa-26 is replaced in memory before the active restore preflight');
    }
    const graph = buildGraph(players);
    const rows = puzzles.map(p => ({ id: p.id, a: p.playerA, b: p.playerB, minSteps: p.minSteps, hint: p.hint }));
    if (rows.length < PUZZLE_FLOOR) fail(`${rows.length} live puzzles, the floor is ${PUZZLE_FLOOR}`);
    if (graph.names.length < PLAYER_FLOOR) fail(`${graph.names.length} live players, the floor is ${PLAYER_FLOOR}`);
    const { unreachable, checked } = checkRows(graph, rows, 'live');
    if (unreachable) fail(`${unreachable} live puzzles cannot be solved`);
    const alisson = players.find(p => p.name === 'Alisson');
    if (alisson && alisson.career.some(s => s.club === 'Roma' && /^201[45]-/.test(s.season))) fail('the "Alisson" row still has Roma seasons before 2016');
    console.log(`   ${checked} live puzzles checked on ${graph.names.length} live players`);
    const restoreRows = parseActiveRefreshMigration(fs.readFileSync(ACTIVE_RESTORE, 'utf8'));
    const appliedRows = parseActiveRestoreMigration(fs.readFileSync(APPLIED_RESTORE, 'utf8'));
    const parsedCompanion = parseTransferPathCompanionMigration(fs.readFileSync(COMPANION, 'utf8'));
    const companionRows = new Map(parsedCompanion.desired.map(row => [row.id, row]));
    if (puzzles.length !== PUZZLE_FLOOR || companionRows.size !== puzzles.length) fail(`the atomic rollout expects ${PUZZLE_FLOOR} live and companion rows, found ${puzzles.length} live and ${companionRows.size} companion`);
    if (restoreRows.size !== ACTIVE_RESTORE_ROWS) fail(`the exact verified active restore carries ${restoreRows.size} rows, expected ${ACTIVE_RESTORE_ROWS}`);
    if (appliedRows.size !== APPLIED_ACTIVE_ROWS) fail(`the applied active restore parses to ${appliedRows.size} rows, expected ${APPLIED_ACTIVE_ROWS}`);
    if (rawPuzzles.length !== puzzles.length) fail(`the raw live read has ${rawPuzzles.length} rows, the site fetcher has ${puzzles.length}`);
    /* Round 1010b: its migration renames the puzzles naming Alisson Becker and
       rewrites the entries its season rows beat, in one transaction, so the
       table is all before it or all after it. After it, the checks below that
       hold the table to the applied companion, the Round 784 rewrite and the
       Round 531 refresh read the table as it stood before 1010 (the old names
       and old values the migration records), and the live values themselves
       are held to the search on the live graph. */
    const liveTable = new Map(puzzles.map(p => [p.id, { playerA: p.playerA, playerB: p.playerB, classic: { minSteps: p.minSteps, hint: p.hint }, europe: p.europe ?? null, active: p.active ?? null }]));
    const s1010 = seasonMigrationState(season1010, liveTable);
    if (s1010 === 'mixed') fail(`live Transfer Path rows are in a mixed state against the ${season1010.renames.length} renames and ${season1010.rewrites.length} rewrites of ${path.basename(SEASON_MIGRATION)}: only all before or all after is valid`);
    console.log(s1010 === 'after'
      ? `   the Round 1010b season rows, ${season1010.renames.length} renames and ${season1010.rewrites.length} Transfer Path rewrites are applied`
      : s1010 === 'before'
        ? `   PENDING: ${path.basename(SEASON_MIGRATION)} is not applied; every puzzle and entry it moves still carries the value it replaces`
        : `   the Round 1010b rewrite is MIXED on the live table`);
    const undo1010 = s1010 === 'after';
    const rename1010 = new Map(season1010.renames.map(r => [r.id, r]));
    const rewrite1010 = new Map(season1010.rewrites.map(r => [`${r.id}|${r.rule}`, r]));
    const before1010 = p => {
      if (!undo1010) return p;
      const v = { ...p };
      const rn = rename1010.get(p.id);
      if (rn) { v.playerA = rn.oldA; v.playerB = rn.oldB; }
      for (const rule of SEASON_RULES) {
        const w = rewrite1010.get(`${p.id}|${rule}`);
        if (!w) continue;
        if (rule === 'classic') { v.minSteps = w.old.minSteps; v.hint = w.old.hint; } else v[rule] = w.old;
      }
      return v;
    };
    const puzzlesBefore1010 = puzzles.map(before1010);
    const partialActive = rawPuzzles.filter(row => (row.active_min_steps === null) !== (row.active_hint === null));
    for (const row of partialActive.slice(0, 10)) fail(`live ${row.puzzle_id} has only half of its active hint pair`);
    if (partialActive.length > 10) fail(`${partialActive.length} live rows have only half of their active hint pair`);
    const liveActiveCount = undo1010
      ? puzzlesBefore1010.filter(p => p.active).length
      : rawPuzzles.filter(row => row.active_min_steps !== null && row.active_hint !== null).length;
    const activeLiveState = partialActive.length === 0 && liveActiveCount === appliedRows.size
      ? 'applied'
      : partialActive.length === 0 && liveActiveCount === restoreRows.size
        ? 'refreshed'
        : 'mixed';
    if (activeLiveState === 'mixed') fail(`live active hints are in a mixed state: ${liveActiveCount} complete, ${partialActive.length} partial; only the applied ${appliedRows.size} or the refreshed ${restoreRows.size} is valid`);
    const livePuzzleIds = new Set(puzzles.map(puzzle => puzzle.id));
    for (const id of restoreRows.keys()) if (!livePuzzleIds.has(id)) {
      fail(`proposed active restore ${id} is absent from the live table`);
      if (CONTROL === 'livepuzzleid' && id === 'tpa-26') liveIdControlCaught = true;
    }

    /* Round 784: the career migration rewrites eight entries in the same
       transaction as its career rows, so the table is on one side of it or
       the other. The search on the live graph (above and below) is what proves
       the careers and the hints moved together. */
    const r784 = parseRuleEntryRefresh(fs.readFileSync(path.join(ROOT, ROUND_784_MIGRATION), 'utf8'));
    const liveById = new Map(puzzlesBefore1010.map(p => [p.id, p]));
    const r784State = ruleEntryRefreshState(r784, (id, rule) => {
      const p = liveById.get(id);
      if (!p) return null;
      return rule === 'classic' ? { minSteps: p.minSteps, hint: p.hint } : (p[rule] ?? null);
    });
    if (r784State === 'mixed') fail(`live Transfer Path entries are in a mixed state against the ${r784.length} Round 784 rewrites: only all before or all after is valid`);
    const r784Europe = new Map(r784State === 'after' ? r784.filter(r => r.rule === 'europe').map(r => [r.id, r]) : []);
    console.log(r784State === 'after'
      ? `   the Round 784 career rows and their ${r784.length} Transfer Path rewrites are applied`
      : r784State === 'before'
        ? `   PENDING: ${path.basename(ROUND_784_MIGRATION)} is not applied; all ${r784.length} entries it rewrites still carry the values it replaces`
        : `   the Round 784 rewrite is MIXED on the live table`);

    /* Each special rule is checked on the graph its filter leaves. The pending
       refresh is preflighted even while the database holds the applied restore. */
    for (const rule of MODE_RULES) {
      const rg = buildGraph(site.playersUnderRule(players, rule));
      let withPath = 0, same = 0, staleApplied = 0;
      if (rule === 'active') {
        /* after 1010 the live values are the search's on the live graph; the
           refresh is necessarily applied (1010 refuses to run otherwise), so
           its preflight is not repeated on a pool it was never derived on */
        if (undo1010) for (const p of puzzles) for (const pr of ruleProblems(rg, p.playerA, p.playerB, p.active ?? null)) fail(`live ${p.id} under active: ${pr}`);
        for (const p of puzzlesBefore1010) {
          const restore = restoreRows.get(p.id) ?? null;
          const proposed = restore ? { minSteps: restore.minSteps, hint: restore.hint } : null;
          if (restore && (restore.a !== p.playerA || restore.b !== p.playerB)) fail(`proposed active restore ${p.id} names ${restore.a} to ${restore.b}, live has ${p.playerA} to ${p.playerB}`);
          if (!undo1010) for (const pr of ruleProblems(rg, p.playerA, p.playerB, proposed)) fail(`proposed active restore ${p.id}: ${pr}`);
          if (proposed) withPath += 1;
          const entry = p.active ?? null;
          if (activeLiveState === 'applied') {
            const appliedRow = appliedRows.get(p.id) ?? null;
            if ((entry === null) !== (appliedRow === null) || (entry && (entry.minSteps !== appliedRow.minSteps || entry.hint !== appliedRow.hint))) fail(`live ${p.id} under active differs from the applied 2026-09-07 restore row`);
            else same += 1;
            if (appliedRow && ruleProblems(rg, p.playerA, p.playerB, { minSteps: appliedRow.minSteps, hint: appliedRow.hint }).length) staleApplied += 1;
          } else if (activeLiveState === 'refreshed') {
            if ((entry === null) !== (proposed === null) || (entry && (entry.minSteps !== proposed.minSteps || entry.hint !== proposed.hint))) fail(`live ${p.id} under active differs from the exact verified refresh row`);
            else same += 1;
          }
        }
        console.log(`   active refresh preflighted on ${rg.names.length} live players (${withPath} paths); database state ${activeLiveState}, ${same} of ${puzzles.length} rows match that atomic state`);
        if (activeLiveState === 'applied') console.log(`   PENDING: the Round 531 refresh (${path.basename(ACTIVE_RESTORE)}) is not applied; ${staleApplied} applied rows are already beaten on the current identity set and ${restoreRows.size - appliedRows.size} pairs have no live hint. Apply it once the Round 531 frontend is live.`);
        continue;
      }
      for (const live of puzzles) {
        /* the live value holds on the live graph; the comparison with the
           companion reads the table as it stood before 1010 */
        for (const pr of ruleProblems(rg, live.playerA, live.playerB, live[rule] ? { minSteps: live[rule].minSteps, hint: live[rule].hint } : null)) fail(`live ${live.id} under ${rule}: ${pr}`);
        const p = before1010(live);
        const entry = p[rule] ?? null;
        if (entry) withPath += 1;
        const companion = companionRows.get(p.id);
        const rewrite = r784Europe.get(p.id);
        const expected = rewrite
          ? { minSteps: rewrite.minSteps, hint: rewrite.hint }
          : companion?.europeMinSteps === null || companion?.europeMinSteps === undefined
            ? null
            : { minSteps: companion.europeMinSteps, hint: companion.europeHint };
        if (!companion) fail(`live ${p.id} is absent from the applied companion`);
        else if (companion.playerA !== p.playerA || companion.playerB !== p.playerB) fail(`applied companion ${p.id} names ${companion.playerA} to ${companion.playerB}, live has ${p.playerA} to ${p.playerB}`);
        else if ((entry === null) !== (expected === null) || (entry && (entry.minSteps !== expected.minSteps || entry.hint !== expected.hint))) fail(`live ${p.id} under Europe differs from the applied companion${rewrite ? ' as the Round 784 migration rewrites it' : ''}`);
        else same += 1;
      }
      console.log(`   ${same} of ${puzzles.length} live rows match the applied companion${r784Europe.size ? ` with the ${r784Europe.size} Round 784 rewrites` : ''} under ${rule}, ${withPath} with a path, on ${rg.names.length} players`);
    }
  }
  }
}

console.log('5) current special rule rows against the pull, per rule');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
  const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
  const parsedCompanion = parseTransferPathCompanionMigration(fs.readFileSync(COMPANION, 'utf8'));
  const companionRows = new Map(parsedCompanion.desired.map(row => [row.id, row]));
  const restoreRows = parseActiveRefreshMigration(fs.readFileSync(ACTIVE_RESTORE, 'utf8'));
  const stored = new Map([...pairs].map(([id]) => {
    const companion = companionRows.get(id);
    const active = restoreRows.get(id);
    return [id, {
      active: active ? { minSteps: active.minSteps, hint: active.hint } : null,
      europe: companion?.europeMinSteps === null || companion?.europeMinSteps === undefined
        ? null
        : { minSteps: companion.europeMinSteps, hint: companion.europeHint },
    }];
  }));
  if (companionRows.size !== pairs.size) fail(`the applied companion carries ${companionRows.size} rows for ${pairs.size} pulled puzzles`);
  if (restoreRows.size !== ACTIVE_RESTORE_ROWS) fail(`the active restore carries ${restoreRows.size} rows, expected ${ACTIVE_RESTORE_ROWS}`);
  for (const [id, restore] of restoreRows) {
    const pair = pairs.get(id);
    if (!pair) fail(`the active restore carries unknown puzzle ${id}`);
    else if (restore.a !== pair.a || restore.b !== pair.b) fail(`the active restore ${id} names ${restore.a} to ${restore.b}, expected ${pair.a} to ${pair.b}`);
  }
  if (CONTROL === 'mode') {
    const r = stored.get('tpa-944');
    if (!r || !r.europe) { console.error('control cannot run: tpa-944 has no Europe entry to plant on'); process.exit(1); }
    r.europe = { ...r.europe, minSteps: r.europe.minSteps + 1 };
    console.log(`   NEGATIVE CONTROL ON: tpa-944 carries a typed Europe minimum of ${r.europe.minSteps}, this section must go red`);
  }
  for (const rule of MODE_RULES) {
    const rg = buildGraph(site.playersUnderRule(players, rule));
    let withPath = 0;
    for (const [id, { a, b }] of pairs) {
      const entry = stored.get(id)?.[rule] ?? null;
      if (entry) withPath += 1;
      for (const pr of ruleProblems(rg, a, b, entry)) fail(`stored row ${id} under ${rule} (${a} to ${b}): ${pr}`);
    }
    console.log(`   ${pairs.size} puzzles checked under ${rule}, ${withPath} with a path, on ${rg.names.length} players`);
  }
}

console.log('6) the quarantine companion migration against the evidence and generated rows');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean).map(line => {
    const [id, playerA, playerB] = line.split('|');
    return [id, { playerA, playerB }];
  }));
  const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerSeasonTruth.json'), 'utf8'));
  const impact = ledger.batchEvidence?.transferPathImpact;
  const companionInfo = impact?.liveCompanionMigration;
  if (!impact || !companionInfo) {
    fail('the career truth ledger does not define the Transfer Path companion migration');
  } else {
    const companionPath = path.join(ROOT, companionInfo.file);
    const companionSql = fs.readFileSync(companionPath, 'utf8').replaceAll('\r\n', '\n');
    const parsed = parseTransferPathCompanionMigration(companionSql);
    if (parsed.rejected.length !== companionInfo.deletedRows) fail(`the companion parses ${parsed.rejected.length} deletions, the ledger requires ${companionInfo.deletedRows}`);
    if (parsed.desired.length !== companionInfo.refreshedRows) fail(`the companion parses ${parsed.desired.length} refresh rows, the ledger requires ${companionInfo.refreshedRows}`);

    const rejectedIds = new Set(parsed.rejected.map(row => row.id));
    const desiredIds = new Set(parsed.desired.map(row => row.id));
    if (rejectedIds.size !== parsed.rejected.length) fail('the companion repeats a quarantined puzzle id');
    if (desiredIds.size !== parsed.desired.length) fail('the companion repeats a retained puzzle id');
    for (const id of rejectedIds) if (desiredIds.has(id)) fail(`the companion both deletes and refreshes ${id}`);

    const ledgerRejected = new Map((impact.quarantinedPuzzles ?? []).map(row => [row.id, row]));
    if (ledgerRejected.size !== companionInfo.deletedRows) fail(`the evidence ledger carries ${ledgerRejected.size} exact quarantined puzzles, expected ${companionInfo.deletedRows}`);
    const ledgerIds = [...(impact.quarantinedPuzzleIds ?? [])];
    if (ledgerIds.length !== ledgerRejected.size || ledgerIds.some(id => !ledgerRejected.has(id))) fail('the ledger quarantine id list disagrees with its exact puzzle tuples');
    for (const row of parsed.rejected) {
      const recorded = ledgerRejected.get(row.id);
      if (!recorded || recorded.playerA !== row.playerA || recorded.playerB !== row.playerB) fail(`companion deletion ${row.id} is not the exact tuple in the evidence ledger`);
      if (pairs.has(row.id)) fail(`quarantined puzzle ${row.id} remains in the corrected pull`);
    }
    for (const row of ledgerRejected.values()) if (!rejectedIds.has(row.id)) fail(`evidence-ledger quarantine ${row.id} is absent from the companion migration`);

    const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
    const classicGraph = buildGraph(players);
    const europeGraph = buildGraph(site.playersUnderRule(players, 'europe'));
    const current = new Map([...pairs].map(([id, pair]) => [id, {
      classic: deriveHint(classicGraph, pair.playerA, pair.playerB),
      europe: deriveHint(europeGraph, pair.playerA, pair.playerB),
    }]));

    if (CONTROL === 'companion') {
      const planted = parsed.desired.find(row => row.id === 'tpa-944');
      if (!planted) { console.error('control cannot run: tpa-944 is not in the companion migration'); process.exit(1); }
      planted.europeMinSteps += 1;
      console.log('   NEGATIVE CONTROL ON: tpa-944 differs only inside the parsed companion migration, this section must go red');
    }

    const actual = new Map(parsed.desired.map(row => [row.id, row]));
    for (const [id, pair] of pairs) {
      const derived = current.get(id);
      const expected = derived?.classic ? {
        id,
        playerA: pair.playerA,
        playerB: pair.playerB,
        minSteps: derived.classic.minSteps,
        hint: derived.classic.hint,
        activeMinSteps: null,
        activeHint: null,
        europeMinSteps: derived.europe?.minSteps ?? null,
        europeHint: derived.europe?.hint ?? null,
      } : null;
      if (!expected) fail(`generated hint data is incomplete for retained puzzle ${id}`);
      else if (JSON.stringify(actual.get(id)) !== JSON.stringify(expected)) fail(`companion refresh ${id} differs from the generated classic or Europe row, or restores active hints too early`);
    }
    for (const id of actual.keys()) if (!pairs.has(id)) fail(`companion refresh ${id} is not in the corrected pull`);

    const code = companionSql.replace(/^\s*--.*$/gm, '');
    if ((code.match(/^begin;$/gm) ?? []).length !== 1 || (code.match(/^commit;$/gm) ?? []).length !== 1) fail('the companion is not enclosed by one explicit transaction');
    if ((code.match(/if matching_rows <> 1 then/g) ?? []).length !== 2) fail('the companion does not guard both deletion and refresh tuple identity');
    if (!code.includes(`if removed_rows <> ${companionInfo.deletedRows} then`)) fail('the companion deletion count guard disagrees with the ledger');
    if (!code.includes(`if updated_rows <> ${companionInfo.refreshedRows} then`)) fail('the companion refresh count guard disagrees with the ledger');
    for (const field of companionInfo.refreshedFields ?? []) {
      if (!new RegExp(`\\b${field}\\s*=\\s*desired\\.${field}\\b`).test(code)) fail(`the companion does not refresh ${field} from its generated row`);
    }
    if ((companionInfo.refreshedFields ?? []).length !== 6) fail('the companion ledger must name all six live hint fields');
    const fallbackInfo = (impact.generatedFiles ?? []).find(file => file.file === 'src/data/transferPathPuzzles.ts');
    if (!fallbackInfo || site.fallbackPuzzles.length !== fallbackInfo.retainedRows) fail('the generated fallback puzzle count disagrees with the evidence ledger');
    console.log(`   ${parsed.rejected.length} exact deletions and ${parsed.desired.length} exact six-field refreshes match the ledger, classic and Europe rows; active stays null; ${site.fallbackPuzzles.length} generated fallback rows remain`);
  }
}

console.log('4) the wording');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const graph = buildGraph(expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8')));
  const hints = parseTransferPathCompanionMigration(fs.readFileSync(COMPANION, 'utf8')).desired.map(row => ({ hint: row.hint, id: row.id }));
  const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
  let longest = 0;
  for (const { hint, id } of [...hints, ...site.fallbackPuzzles.map(p => ({ hint: p.hint, id: `fallback ${p.id}` }))]) {
    longest = Math.max(longest, hint.length);
    if (/[\u2013\u2014]/.test(hint)) fail(`${id}: long dash in the hint`);
    if (hint.length > 200) fail(`${id}: hint is ${hint.length} characters, the card fits 200`);
    const claim = parseHint(hint);
    const pair = pairs.get(id);
    if (claim && claim.steps === 1 && pair && distances(graph, pair.a).get(pair.b) !== 1) fail(`${id}: says direct link on a pair the game refuses`);
  }
  console.log(`   ${hints.length + site.fallbackPuzzles.length} hints read, longest ${longest} characters`);
}

/** The pool as it stood before Round 1010b, proved by the ledger's preBake hash; aborts otherwise. */
function pre1010Pool() {
  const bake = site.fallbackPlayers;
  if (bakeHash(bake) === seasonLedger.preBake.sha256) return bake;
  const pool = undoLedger(bake, seasonLedger, { appendRemoved: CONTROL === 'r1010append' });
  if (bakeHash(pool) !== seasonLedger.preBake.sha256) {
    if (CONTROL === 'r1010append') { console.log(`simTransferPathHints control (${CONTROL}): green. With ${seasonLedger.removed.map(r => r.player).join(', ')} appended instead of at his sorted place the pool does not hash to preBake, and the harness stops before section 7.`); process.exit(0); }
    console.error(`ABORT: undoing ${SEASON_LEDGER_FILE} on the bake does not give the pool before Round 1010b (preBake ${seasonLedger.preBake.sha256.slice(0, 12)}); sections 7 and 8 cannot be trusted`);
    process.exit(1);
  }
  return pool;
}

console.log('7) the Round 784 career rows and the Transfer Path entries they rewrite');
let r784Caught = false;
{
  const ROUND_784_REWRITES = 8;
  const fail7 = (m, key) => {
    fail(m);
    if ((CONTROL === 'r784min' && key === 'tpa-285|classic') || (CONTROL === 'r784drop' && key === 'tpa-640|europe')) r784Caught = true;
  };
  const rows = parseRuleEntryRefresh(fs.readFileSync(path.join(ROOT, ROUND_784_MIGRATION), 'utf8'));
  if (CONTROL === 'r784min') {
    const r = rows.find(x => x.id === 'tpa-285' && x.rule === 'classic');
    if (!r) { console.error('control cannot run: tpa-285 classic is not in the parsed Round 784 rows'); process.exit(1); }
    r.minSteps += 1;
    console.log('   NEGATIVE CONTROL ON: tpa-285 is rewritten one step too high, this section must report it');
  }
  if (CONTROL === 'r784drop') {
    const i = rows.findIndex(x => x.id === 'tpa-640' && x.rule === 'europe');
    if (i < 0) { console.error('control cannot run: tpa-640 Europe is not in the parsed Round 784 rows'); process.exit(1); }
    rows.splice(i, 1);
    console.log('   NEGATIVE CONTROL ON: tpa-640 Europe is dropped from the rewrite, this section must report it');
  }
  const companion = new Map(parseTransferPathCompanionMigration(fs.readFileSync(COMPANION, 'utf8')).desired.map(r => [r.id, r]));
  const applied = (c, rule) => rule === 'classic'
    ? { minSteps: c.minSteps, hint: c.hint }
    : c.europeMinSteps === null ? null : { minSteps: c.europeMinSteps, hint: c.europeHint };
  /* the pool the Round 784 migration left: since Round 1010b the committed bake
     is a later one, so the pool is rebuilt by undoing the season ledger (its
     added rows dropped, its changed fields put back, the removed man restored
     at his sorted place) and must hash to the ledger's preBake */
  const pre1010 = pre1010Pool();
  const graphs = { classic: buildGraph(pre1010), europe: buildGraph(site.playersUnderRule(pre1010, 'europe')) };
  const byKey = new Map();
  for (const r of rows) {
    const key = `${r.id}|${r.rule}`;
    if (byKey.has(key)) fail7(`the Round 784 migration rewrites ${r.id} under ${r.rule} twice`, key);
    byKey.set(key, r);
    const c = companion.get(r.id);
    if (!c) { fail7(`the Round 784 migration rewrites ${r.id}, which the applied companion does not carry`, key); continue; }
    if (c.playerA !== r.a || c.playerB !== r.b) fail7(`the Round 784 migration names ${r.id} as ${r.a} to ${r.b}, the companion has ${c.playerA} to ${c.playerB}`, key);
    const old = applied(c, r.rule);
    if (!old || old.minSteps !== r.oldMinSteps || old.hint !== r.oldHint) fail7(`${r.id} under ${r.rule}: the value the Round 784 migration replaces is not the applied companion's`, key);
    const d = deriveHint(graphs[r.rule], r.a, r.b);
    if (!d || d.minSteps !== r.minSteps || d.hint !== r.hint) fail7(`${r.id} under ${r.rule}: the Round 784 migration writes ${r.minSteps} "${r.hint}", the search on the baked pool says ${d ? `${d.minSteps} "${d.hint}"` : 'no path'}`, key);
    if (/[\u2013\u2014]/.test(r.hint) || r.hint.length > 200) fail7(`${r.id} under ${r.rule}: the rewritten hint has a long dash or runs past 200 characters`, key);
  }
  let beaten = 0;
  for (const c of companion.values()) for (const rule of ['classic', 'europe']) {
    const key = `${c.id}|${rule}`;
    const stale = ruleProblems(graphs[rule], c.playerA, c.playerB, applied(c, rule)).length > 0;
    if (stale) beaten += 1;
    if (stale && !byKey.has(key)) fail7(`${c.id} under ${rule}: the baked pool beats the applied entry and the Round 784 migration does not rewrite it`, key);
    if (!stale && byKey.has(key)) fail7(`${c.id} under ${rule}: the Round 784 migration rewrites an entry the baked pool does not beat`, key);
  }
  const refresh = parseActiveRefreshMigration(fs.readFileSync(ACTIVE_RESTORE, 'utf8'));
  const activeGraph = buildGraph(site.playersUnderRule(pre1010, 'active'));
  for (const [id, r] of refresh) if (ruleProblems(activeGraph, r.a, r.b, { minSteps: r.minSteps, hint: r.hint }).length) fail7(`pending active refresh ${id} is beaten on the baked pool; a career change that moves an active minimum must rewrite it too`, `${id}|active`);
  if (rows.length !== ROUND_784_REWRITES) fail7(`the Round 784 migration rewrites ${rows.length} entries, ${ROUND_784_REWRITES} were derived on 2026-10-01; move this only with the pool change that explains it`, 'count');
  const classic = rows.filter(r => r.rule === 'classic').length;
  console.log(`   ${rows.length} entries rewritten (${classic} classic, ${rows.length - classic} Europe), each the search's on the baked pool over the applied value it replaces; ${beaten} applied entries beaten on the baked pool; the pending active refresh holds on all ${refresh.size}`);
}

console.log('8) the Round 1010b season rows and the Transfer Path entries they rename and rewrite');
let r1010Caught = false;
{
  const PLANTED = { r1010min: 'tpa-762|classic', r1010drop: 'tpa-762|europe', r1010rename: 'tpa-762|rename' };
  const fail8 = (m, key) => { fail(m); if (PLANTED[CONTROL] === key) r1010Caught = true; };
  const parsed = JSON.parse(JSON.stringify(season1010));
  if (CONTROL === 'r1010min') {
    const r = parsed.rewrites.find(x => x.id === 'tpa-762' && x.rule === 'classic');
    if (!r?.next) { console.error('control cannot run: tpa-762 classic is not in the parsed 1010 rows'); process.exit(1); }
    r.next.minSteps += 1;
    console.log('   NEGATIVE CONTROL ON: tpa-762 is rewritten one step too high, this section must report it');
  }
  if (CONTROL === 'r1010drop') {
    const i = parsed.rewrites.findIndex(x => x.id === 'tpa-762' && x.rule === 'europe');
    if (i < 0) { console.error('control cannot run: tpa-762 Europe is not in the parsed 1010 rows'); process.exit(1); }
    parsed.rewrites.splice(i, 1);
    console.log('   NEGATIVE CONTROL ON: tpa-762 Europe is dropped from the rewrite, this section must report it');
  }
  if (CONTROL === 'r1010rename') {
    const i = parsed.renames.findIndex(x => x.id === 'tpa-762');
    if (i < 0) { console.error('control cannot run: tpa-762 is not renamed in the parsed 1010 rows'); process.exit(1); }
    parsed.renames.splice(i, 1);
    console.log('   NEGATIVE CONTROL ON: tpa-762 is left unrenamed, this section must report it');
  }
  /* the committed bake is the tables after the 1010 migration */
  if (bakeHash(site.fallbackPlayers) !== seasonLedger.postBake.sha256) fail8(`the committed bake is not the ledger's postBake, so the 1010 rows cannot be checked against it`, 'bake');
  const live = liveAfter784(ROOT);
  const graphs = ruleGraphs(site.fallbackPlayers, site.playersUnderRule);
  const keptAs = new Map((seasonLedger.removed ?? []).map(r => [r.player, r.keptAs]));
  const renamed = new Map(parsed.renames.map(r => [r.id, r]));
  for (const [id, p] of live) {
    const r = renamed.get(id);
    const names = keptAs.has(p.a) || keptAs.has(p.b);
    if (names && !r) fail8(`${id} (${p.a} to ${p.b}) names a removed man and the 1010 migration does not rename it`, `${id}|rename`);
    if (!names && r) fail8(`${id} is renamed and names no removed man`, `${id}|rename`);
    if (r && (r.oldA !== p.a || r.oldB !== p.b || r.a !== (keptAs.get(p.a) ?? p.a) || r.b !== (keptAs.get(p.b) ?? p.b))) fail8(`${id} is renamed from ${r.oldA} to ${r.oldB} into ${r.a} to ${r.b}, expected ${p.a} to ${p.b} into the kept names`, `${id}|rename`);
  }
  const byKey = new Map();
  for (const r of parsed.rewrites) {
    const key = `${r.id}|${r.rule}`;
    if (byKey.has(key)) fail8(`the 1010 migration rewrites ${r.id} under ${r.rule} twice`, key);
    byKey.set(key, r);
    const p = live.get(r.id);
    if (!p) { fail8(`the 1010 migration rewrites ${r.id}, which the applied companion does not carry`, key); continue; }
    const a = keptAs.get(p.a) ?? p.a, b = keptAs.get(p.b) ?? p.b;
    if (r.a !== a || r.b !== b) fail8(`the 1010 migration names ${r.id} as ${r.a} to ${r.b}, expected ${a} to ${b}`, key);
    if (!sameValue(r.old, p[r.rule])) fail8(`${r.id} under ${r.rule}: the value the 1010 migration replaces is not the one live after Round 784 and the Round 531 refresh`, key);
    const d = deriveHint(graphs[r.rule], a, b);
    const want = d ? { minSteps: d.minSteps, hint: d.hint } : null;
    if (!sameValue(r.next, want)) fail8(`${r.id} under ${r.rule}: the 1010 migration writes ${r.next ? `${r.next.minSteps} "${r.next.hint}"` : 'no path'}, the search on the bake says ${want ? `${want.minSteps} "${want.hint}"` : 'no path'}`, key);
    if (r.next && (/[–—]/.test(r.next.hint) || r.next.hint.length > 200)) fail8(`${r.id} under ${r.rule}: the rewritten hint has a long dash or runs past 200 characters`, key);
  }
  let beaten = 0;
  for (const [id, p] of live) for (const rule of SEASON_RULES) {
    const key = `${id}|${rule}`;
    const a = keptAs.get(p.a) ?? p.a, b = keptAs.get(p.b) ?? p.b;
    const stale = ruleProblems(graphs[rule], a, b, p[rule]).length > 0;
    if (stale) beaten += 1;
    if (stale && !byKey.has(key)) fail8(`${id} under ${rule}: the bake beats the live value (or it names a removed man) and the 1010 migration does not rewrite it`, key);
    if (!stale && byKey.has(key)) fail8(`${id} under ${rule}: the 1010 migration rewrites an entry the bake does not beat`, key);
  }
  /* section 3 reads the live table through seasonMigrationState: prove it on
     the two tables this migration moves between, and on one half way */
  const table = () => new Map([...live].map(([id, p]) => [id, { playerA: p.a, playerB: p.b, classic: p.classic, europe: p.europe, active: p.active }]));
  const before = table(), after = table(), half = table();
  for (const r of season1010.renames) { Object.assign(after.get(r.id), { playerA: r.a, playerB: r.b }); Object.assign(half.get(r.id), { playerA: r.a, playerB: r.b }); }
  for (const r of season1010.rewrites) after.get(r.id)[r.rule] = r.next;
  if (seasonMigrationState(season1010, before) !== 'before') fail8('the live state reader does not call the table before the 1010 migration "before"', 'state');
  if (seasonMigrationState(season1010, after) !== 'after') fail8('the live state reader does not call the table after the 1010 migration "after"', 'state');
  if (seasonMigrationState(season1010, half) !== 'mixed') fail8('the live state reader does not call a half applied table "mixed"', 'state');
  const count = rule => parsed.rewrites.filter(r => r.rule === rule).length;
  console.log(`   ${parsed.renames.length} puzzles renamed; ${parsed.rewrites.length} entries rewritten (${count('classic')} classic, ${count('europe')} Europe, ${count('active')} active), each the search's on the bake over the value live after Round 784; ${beaten} live entries beaten on the bake; the live state reader tells before, after and mixed apart`);
}

console.log('');
if (CONTROL) {
  if (CONTROL === 'r1010append') { console.error(`simTransferPathHints control (${CONTROL}): RED. The misplaced removed man still hashed to preBake.`); process.exit(1); }
  if (CONTROL === 'r1010min' || CONTROL === 'r1010drop' || CONTROL === 'r1010rename') {
    if (r1010Caught) { console.log(`simTransferPathHints control (${CONTROL}): green. Section 8 reported the planted row (${failures} findings).`); process.exit(0); }
    console.error(`simTransferPathHints control (${CONTROL}): RED. ${failures ? 'Findings came, but not the planted row.' : 'The planted row went unreported.'}`); process.exit(1);
  }
  if (CONTROL === 'r784min' || CONTROL === 'r784drop') {
    if (r784Caught) { console.log(`simTransferPathHints control (${CONTROL}): green. Section 7 reported the planted row (${failures} findings).`); process.exit(0); }
    console.error(`simTransferPathHints control (${CONTROL}): RED. ${failures ? 'Findings came, but not the planted row.' : 'The planted row went unreported.'}`); process.exit(1);
  }
  if (CONTROL === 'livepuzzleid') {
    if (failures > 0 && liveIdControlCaught) { console.log(`simTransferPathHints control (${CONTROL}): green. The missing proposed row was reported (${failures} findings).`); process.exit(0); }
    console.error(`simTransferPathHints control (${CONTROL}): RED. ${failures ? 'Findings came, but not the missing proposed row.' : 'The missing proposed row went unreported.'}`); process.exit(1);
  }
  if (failures > 0) { console.log(`simTransferPathHints control (${CONTROL}): green. The planted row was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simTransferPathHints control (${CONTROL}): RED. The planted row went unreported.`); process.exit(1);
}
if (failures > 0) { console.error(`simTransferPathHints: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simTransferPathHints: green. Every minimum is the search\'s minimum and every hint describes a path the game accepts.');
