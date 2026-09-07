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
 *      read. Active accepts only two atomic rollout states: all 885 pairs null,
 *      or the exact 203 verified migration pairs. Partial and mixed states fail.
 *      SKIPS LOUDLY when Supabase is unreachable.
 *   4. THE WORDING: no long dash, under 200 characters, and no hint that
 *      says "Direct link" on a pair the game would refuse (the exact shape
 *      of the reported defect, kept as its own line so it can never return).
 *   5. THE CURRENT SPECIAL RULE ROWS against the pull, per rule.
 *   6. THE QUARANTINE COMPANION. Its 17 exact deletions equal the evidence
 *      ledger, its 885 retained rows equal both generated hint migrations
 *      field for field, and its transaction and row-count guards stay intact.
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
 *
 * Run: node scripts/simTransferPathHints.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { MODE_RULES, buildGraph, deriveHint, distances, expandCompactCareers, hintProblems, parseActiveRestoreMigration, parseHint, parseTransferPathCompanionMigration, ruleProblems, sharedClub } from './lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TPH_CONTROL || '';
const LOCAL_ONLY = process.env.TRANSFER_PATH_LOCAL_ONLY === '1';
if (CONTROL && !['stale', 'club', 'min', 'direct', 'mode', 'companion', 'livepuzzleid'].includes(CONTROL)) { console.error(`TPH_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
let liveIdControlCaught = false;
const fail = m => { failures += 1; if (failures <= 25) console.error('  FAIL: ' + m); };

/* the puzzle counts measured on 2026-08-26; a shrink is lost coverage */
const PUZZLE_FLOOR = 885;
const PLAYER_FLOOR = 253;
const COMPANION = path.join(ROOT, 'supabase/migrations/20260907173202_quarantine_unreachable_transfer_path_puzzles_and_refresh_hints.sql');
const ACTIVE_RESTORE = path.join(ROOT, 'supabase/migrations/20260907190000_restore_verified_active_transfer_path_hints.sql');

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
    const restoreRows = parseActiveRestoreMigration(fs.readFileSync(ACTIVE_RESTORE, 'utf8'));
    const parsedCompanion = parseTransferPathCompanionMigration(fs.readFileSync(COMPANION, 'utf8'));
    const companionRows = new Map(parsedCompanion.desired.map(row => [row.id, row]));
    if (puzzles.length !== PUZZLE_FLOOR || companionRows.size !== puzzles.length) fail(`the atomic rollout expects ${PUZZLE_FLOOR} live and companion rows, found ${puzzles.length} live and ${companionRows.size} companion`);
    if (restoreRows.size !== 203) fail(`the exact verified active restore carries ${restoreRows.size} rows, expected 203`);
    if (rawPuzzles.length !== puzzles.length) fail(`the raw live read has ${rawPuzzles.length} rows, the site fetcher has ${puzzles.length}`);
    const partialActive = rawPuzzles.filter(row => (row.active_min_steps === null) !== (row.active_hint === null));
    for (const row of partialActive.slice(0, 10)) fail(`live ${row.puzzle_id} has only half of its active hint pair`);
    if (partialActive.length > 10) fail(`${partialActive.length} live rows have only half of their active hint pair`);
    const liveActiveCount = rawPuzzles.filter(row => row.active_min_steps !== null && row.active_hint !== null).length;
    const restoredActiveCount = restoreRows.size;
    const activeLiveState = partialActive.length === 0 && liveActiveCount === 0
      ? 'staged-null'
      : partialActive.length === 0 && liveActiveCount === restoredActiveCount
        ? 'restored'
        : 'mixed';
    if (activeLiveState === 'mixed') fail(`live active hints are in a mixed state: ${liveActiveCount} complete, ${partialActive.length} partial; only staged zero or restored ${restoredActiveCount} is valid`);
    const livePuzzleIds = new Set(puzzles.map(puzzle => puzzle.id));
    for (const id of restoreRows.keys()) if (!livePuzzleIds.has(id)) {
      fail(`proposed active restore ${id} is absent from the live table`);
      if (CONTROL === 'livepuzzleid' && id === 'tpa-26') liveIdControlCaught = true;
    }

    /* Each special rule is checked on the graph its filter leaves. The active
       restore is preflighted even while the database is atomically null. */
    for (const rule of MODE_RULES) {
      const rg = buildGraph(site.playersUnderRule(players, rule));
      let withPath = 0, same = 0;
      if (rule === 'active') {
        for (const p of puzzles) {
          const restore = restoreRows.get(p.id) ?? null;
          const proposed = restore ? { minSteps: restore.minSteps, hint: restore.hint } : null;
          if (restore && (restore.a !== p.playerA || restore.b !== p.playerB)) fail(`proposed active restore ${p.id} names ${restore.a} to ${restore.b}, live has ${p.playerA} to ${p.playerB}`);
          for (const pr of ruleProblems(rg, p.playerA, p.playerB, proposed)) fail(`proposed active restore ${p.id}: ${pr}`);
          if (proposed) withPath += 1;
          const entry = p.active ?? null;
          if (activeLiveState === 'staged-null') {
            if (entry !== null) fail(`live ${p.id} has an active hint during the staged-null rollout state`);
            else same += 1;
          } else if (activeLiveState === 'restored') {
            if ((entry === null) !== (proposed === null) || (entry && (entry.minSteps !== proposed.minSteps || entry.hint !== proposed.hint))) fail(`live ${p.id} under active differs from the exact verified restore row`);
            else same += 1;
          }
        }
        console.log(`   active restore preflighted on ${rg.names.length} live players (${withPath} paths); database state ${activeLiveState}, ${same} of ${puzzles.length} rows match that atomic state`);
        continue;
      }
      for (const p of puzzles) {
        const entry = p[rule] ?? null;
        if (entry) withPath += 1;
        const companion = companionRows.get(p.id);
        const expected = companion?.europeMinSteps === null || companion?.europeMinSteps === undefined
          ? null
          : { minSteps: companion.europeMinSteps, hint: companion.europeHint };
        if (!companion) fail(`live ${p.id} is absent from the applied companion`);
        else if (companion.playerA !== p.playerA || companion.playerB !== p.playerB) fail(`applied companion ${p.id} names ${companion.playerA} to ${companion.playerB}, live has ${p.playerA} to ${p.playerB}`);
        else if ((entry === null) !== (expected === null) || (entry && (entry.minSteps !== expected.minSteps || entry.hint !== expected.hint))) fail(`live ${p.id} under Europe differs from the applied companion`);
        else same += 1;
        for (const pr of ruleProblems(rg, p.playerA, p.playerB, entry ? { minSteps: entry.minSteps, hint: entry.hint } : null)) fail(`live ${p.id} under ${rule}: ${pr}`);
      }
      console.log(`   ${same} of ${puzzles.length} live rows match the applied companion under ${rule}, ${withPath} with a path, on ${rg.names.length} players`);
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
  const restoreRows = parseActiveRestoreMigration(fs.readFileSync(ACTIVE_RESTORE, 'utf8'));
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
  if (restoreRows.size !== 203) fail(`the active restore carries ${restoreRows.size} rows, expected 203`);
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

console.log('');
if (CONTROL) {
  if (CONTROL === 'livepuzzleid') {
    if (failures > 0 && liveIdControlCaught) { console.log(`simTransferPathHints control (${CONTROL}): green. The missing proposed row was reported (${failures} findings).`); process.exit(0); }
    console.error(`simTransferPathHints control (${CONTROL}): RED. ${failures ? 'Findings came, but not the missing proposed row.' : 'The missing proposed row went unreported.'}`); process.exit(1);
  }
  if (failures > 0) { console.log(`simTransferPathHints control (${CONTROL}): green. The planted row was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simTransferPathHints control (${CONTROL}): RED. The planted row went unreported.`); process.exit(1);
}
if (failures > 0) { console.error(`simTransferPathHints: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simTransferPathHints: green. Every minimum is the search\'s minimum and every hint describes a path the game accepts.');
