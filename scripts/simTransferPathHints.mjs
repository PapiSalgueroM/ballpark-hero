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
 *   1. THE MIGRATION AGAINST THE PULL IT WAS MADE FROM. Every update in
 *      supabase/migrations/20260826_transfer_path_hints_temporal.sql is parsed
 *      and checked on the graph in scripts/data/transferPathPull/: the
 *      minimum is the search's minimum, the hint promises that many steps,
 *      names both players, and a shortest path really starts at the club it
 *      names first and ends at the club it names last. All 885 retained
 *      puzzles are reachable. Seventeen Jonathan David pairs were
 *      quarantined when their only path depended on a projected season.
 *   2. THE FALLBACK THE PAGE SHOWS WHEN THE TABLE IS DOWN. src/data/transferPathPuzzles.ts
 *      against src/data/careerPlayers.ts by the same test, and each
 *      oneOptimalPath is a chain the game would accept, link by link.
 *   3. THE LIVE TABLES, through the site's own fetchers. SKIPS LOUDLY when
 *      Supabase is unreachable, because the sandbox usually cannot reach it.
 *   4. THE WORDING: no long dash, under 200 characters, and no hint that
 *      says "Direct link" on a pair the game would refuse (the exact shape
 *      of the reported defect, kept as its own line so it can never return).
 *   5. THE SPECIAL RULE MIGRATION against the pull, per rule.
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
 * companion migration (section 6 must go red).
 *
 * Run: node scripts/simTransferPathHints.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { MODE_RULES, buildGraph, distances, expandCompactCareers, hintProblems, parseHint, parseModeMigration, ruleProblems, sharedClub } from './lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TPH_CONTROL || '';
const LOCAL_ONLY = process.env.TRANSFER_PATH_LOCAL_ONLY === '1';
if (CONTROL && !['stale', 'club', 'min', 'direct', 'mode', 'companion'].includes(CONTROL)) { console.error(`TPH_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const fail = m => { failures += 1; if (failures <= 25) console.error('  FAIL: ' + m); };

/* the puzzle counts measured on 2026-08-26; a shrink is lost coverage */
const PUZZLE_FLOOR = 885;
const PLAYER_FLOOR = 253;

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

const unquoteSql = value => value.replace(/''/g, "'");
const nullableSqlNumber = value => value === 'null::smallint' ? null : Number(value);
const nullableSqlText = value => value === 'null::text' ? null : unquoteSql(value.slice(1, -1));

function parseCompanionMigration(sql) {
  const normalized = String(sql).replaceAll('\r\n', '\n');
  const desiredMarker = normalized.indexOf('  for desired in');
  const rejectedBlock = desiredMarker < 0 ? '' : normalized.slice(0, desiredMarker);
  const desiredBlock = desiredMarker < 0 ? '' : normalized.slice(desiredMarker);
  const rejected = [];
  const desired = [];
  const rejectedRow = /^\s*\('((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)'\),?$/gm;
  const desiredRow = /^\s*\('((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)', (\d+), '((?:[^']|'')*)', (null::smallint|\d+), (null::text|'(?:[^']|'')*'), (null::smallint|\d+), (null::text|'(?:[^']|'')*')\),?$/gm;
  let match;
  while ((match = rejectedRow.exec(rejectedBlock))) rejected.push({
    id: unquoteSql(match[1]), playerA: unquoteSql(match[2]), playerB: unquoteSql(match[3]),
  });
  while ((match = desiredRow.exec(desiredBlock))) desired.push({
    id: unquoteSql(match[1]),
    playerA: unquoteSql(match[2]),
    playerB: unquoteSql(match[3]),
    minSteps: Number(match[4]),
    hint: unquoteSql(match[5]),
    activeMinSteps: nullableSqlNumber(match[6]),
    activeHint: nullableSqlText(match[7]),
    europeMinSteps: nullableSqlNumber(match[8]),
    europeHint: nullableSqlText(match[9]),
  });
  return { rejected, desired };
}

console.log('1) the migration against the pull it was made from');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
  const graph = buildGraph(players);
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260826_transfer_path_hints_temporal.sql'), 'utf8');
  const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
  const rows = [];
  const re = /^update public\.transfer_path_puzzles set min_steps = (\d+), hint = '((?:[^']|'')*)' where puzzle_id = '((?:[^']|'')*)';$/gm;
  let m;
  while ((m = re.exec(sql))) {
    const id = m[3].replace(/''/g, "'");
    const pair = pairs.get(id);
    if (!pair) { fail(`the migration updates ${id}, which the pull does not have`); continue; }
    rows.push({ id, a: pair.a, b: pair.b, minSteps: Number(m[1]), hint: m[2].replace(/''/g, "'") });
  }
  if (rows.length !== pairs.size) fail(`the migration carries ${rows.length} updates for ${pairs.size} pulled puzzles`);
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
  const { unreachable, checked } = checkRows(graph, rows, 'migration');
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
  let players = [], puzzles = [];
  try {
    const warn = console.warn; console.warn = () => {};
    [players, puzzles] = await Promise.all([site.fetchCareerPlayers(), site.fetchTransferPathPuzzles()]);
    console.warn = warn;
  } catch { players = []; puzzles = []; }
  if (!players.length || !puzzles.length) {
    console.log('   SKIPPED, SUPABASE UNREACHABLE. NOT CHECKED. The migration was checked against its pull in section 1; run this where the host is reachable.');
  } else {
    const graph = buildGraph(players);
    const rows = puzzles.map(p => ({ id: p.id, a: p.playerA, b: p.playerB, minSteps: p.minSteps, hint: p.hint }));
    if (rows.length < PUZZLE_FLOOR) fail(`${rows.length} live puzzles, the floor is ${PUZZLE_FLOOR}`);
    if (graph.names.length < PLAYER_FLOOR) fail(`${graph.names.length} live players, the floor is ${PLAYER_FLOOR}`);
    const { unreachable, checked } = checkRows(graph, rows, 'live');
    if (unreachable) fail(`${unreachable} live puzzles cannot be solved`);
    const alisson = players.find(p => p.name === 'Alisson');
    if (alisson && alisson.career.some(s => s.club === 'Roma' && /^201[45]-/.test(s.season))) fail('the "Alisson" row still has Roma seasons before 2016');
    console.log(`   ${checked} live puzzles checked on ${graph.names.length} live players`);
    /* Round 460: the special rule columns, each on the graph its rule leaves.
       A row that disagrees with the search under ANY rule goes red here. */
    for (const rule of MODE_RULES) {
      const rg = buildGraph(site.playersUnderRule(players, rule));
      let withPath = 0;
      for (const p of puzzles) {
        const entry = p[rule] ?? null;
        if (entry) withPath += 1;
        for (const pr of ruleProblems(rg, p.playerA, p.playerB, entry ? { minSteps: entry.minSteps, hint: entry.hint } : null)) fail(`live ${p.id} under ${rule}: ${pr}`);
      }
      console.log(`   ${puzzles.length} live puzzles checked under ${rule}, ${withPath} with a path, on ${rg.names.length} players`);
    }
  }
  }
}

console.log('5) the special rule migration against the pull, per rule');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
  const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
  const stored = parseModeMigration(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260905_round_460_transfer_path_mode_hints.sql'), 'utf8'), pairs);
  if (stored.size !== pairs.size) fail(`the mode migration carries ${stored.size} rows for ${pairs.size} pulled puzzles`);
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
      for (const pr of ruleProblems(rg, a, b, entry)) fail(`mode migration ${id} under ${rule} (${a} to ${b}): ${pr}`);
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
    const parsed = parseCompanionMigration(companionSql);
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

    const classic = new Map();
    const classicSql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260826_transfer_path_hints_temporal.sql'), 'utf8');
    const classicRow = /^update public\.transfer_path_puzzles set min_steps = (\d+), hint = '((?:[^']|'')*)' where puzzle_id = '((?:[^']|'')*)';$/gm;
    let match;
    while ((match = classicRow.exec(classicSql))) {
      const id = unquoteSql(match[3]);
      if (classic.has(id)) fail(`the generated classic migration repeats ${id}`);
      classic.set(id, { minSteps: Number(match[1]), hint: unquoteSql(match[2]) });
    }
    const modes = parseModeMigration(
      fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260905_round_460_transfer_path_mode_hints.sql'), 'utf8'),
      new Map([...pairs].map(([id, pair]) => [id, { a: pair.playerA, b: pair.playerB }])),
    );
    if (classic.size !== pairs.size) fail(`the generated classic migration carries ${classic.size} rows for ${pairs.size} retained puzzles`);
    if (modes.size !== pairs.size) fail(`the generated mode migration carries ${modes.size} rows for ${pairs.size} retained puzzles`);

    if (CONTROL === 'companion') {
      const planted = parsed.desired.find(row => row.id === 'tpa-944');
      if (!planted) { console.error('control cannot run: tpa-944 is not in the companion migration'); process.exit(1); }
      planted.europeMinSteps += 1;
      console.log('   NEGATIVE CONTROL ON: tpa-944 differs only inside the parsed companion migration, this section must go red');
    }

    const actual = new Map(parsed.desired.map(row => [row.id, row]));
    for (const [id, pair] of pairs) {
      const classicEntry = classic.get(id);
      const modeEntry = modes.get(id);
      const expected = classicEntry && modeEntry ? {
        id,
        playerA: pair.playerA,
        playerB: pair.playerB,
        minSteps: classicEntry.minSteps,
        hint: classicEntry.hint,
        activeMinSteps: modeEntry.active?.minSteps ?? null,
        activeHint: modeEntry.active?.hint ?? null,
        europeMinSteps: modeEntry.europe?.minSteps ?? null,
        europeHint: modeEntry.europe?.hint ?? null,
      } : null;
      if (!expected) fail(`generated hint data is incomplete for retained puzzle ${id}`);
      else if (JSON.stringify(actual.get(id)) !== JSON.stringify(expected)) fail(`companion refresh ${id} differs from the generated classic or mode row`);
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
    console.log(`   ${parsed.rejected.length} exact deletions and ${parsed.desired.length} exact six-field refreshes match the ledger and both generated live migrations; ${site.fallbackPuzzles.length} generated fallback rows remain`);
  }
}

console.log('4) the wording');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const graph = buildGraph(expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8')));
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260826_transfer_path_hints_temporal.sql'), 'utf8');
  const hints = [...sql.matchAll(/hint = '((?:[^']|'')*)' where puzzle_id = '((?:[^']|'')*)'/g)].map(m => ({ hint: m[1].replace(/''/g, "'"), id: m[2] }));
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
  if (failures > 0) { console.log(`simTransferPathHints control (${CONTROL}): green. The planted row was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simTransferPathHints control (${CONTROL}): RED. The planted row went unreported.`); process.exit(1);
}
if (failures > 0) { console.error(`simTransferPathHints: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simTransferPathHints: green. Every minimum is the search\'s minimum and every hint describes a path the game accepts.');
