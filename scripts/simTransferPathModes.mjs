/* Transfer Path's special rules: every stored minimum and hint is the search's
   own, under the rule's own filter, and no chain a rule hands out breaks that
   rule.

   Round 460. Active players only and Europe only are filters on the graph the
   game searches (src/lib/transferPathModes.ts, the file the page filters
   through). Each rule gets its own minimum and hint per puzzle, derived by
   scripts/genTransferPathHints.mjs and stored in the puzzle table's
   <rule>_min_steps and <rule>_hint columns. The trap this fence exists for is
   Round 294's, one door over: a stored number or hint that the rule's own
   search disagrees with, so a player follows a hint into a refusal, or a rule
   that quietly lets a chain through a club or a player it was meant to remove.

   What it holds:
     1) THE CURRENT STORED RULE ROWS AGAINST THE PULL, PER RULE. Europe comes
        from the applied quarantine companion and active comes from the new
        verified restore. The graph is rebuilt through the page's own
        playersUnderRule (bundled from the real module), and for every puzzle
        and rule: null means the search finds no path, a number means the
        search's minimum, and the hint promises that many steps and names a
        first and last club a shortest path really uses. Then the derived
        shortest path is walked link by link with the REAL module, apart from
        the graph: under active every name on it has a verified name plus
        nationality identity, under Europe every link's shared club is European, and
        every link is a same club same season link on the everyday graph. The
        share of puzzles with a path is measured and floored from headroom
        (2026-09-07: Active 203 of 885, Europe 872 of 885).
     2) THE FALLBACK THE PAGE SHOWS WHEN THE TABLE IS DOWN, PER RULE.
        src/data/transferPathPuzzles.ts against src/data/careerPlayers.ts by
        the same test, and each rule's oneOptimalPath walked link by link.
     3) THE LIVE TABLE, through the site's own fetcher plus a raw read for null
        pair integrity. Europe equals the migration text for text. Active may
        be in exactly one of two atomic rollout states: all 885 pairs null, or
       all 203 verified paths restored exactly. Any partial
        or mixed third state fails. SKIPS LOUDLY when Supabase is unreachable.
     4) THE SOURCE. The hook filters through playersUnderRule and reads
        puzzleUnderRule, the fetcher selects all four columns. Comments are
        stripped before matching.

   NEGATIVE CONTROLS, each refusing to run if its rewrite changed nothing:
     TPM_CONTROL=min plants a typed Europe minimum one step too high on
       tpa-944 in the parsed migration; section 1 must go red on that row.
     TPM_CONTROL=abroad rewrites a COPY of transferPathModes.ts so Saudi and
       United States clubs count as European, builds section 1's graph through
       the copy, and keeps the link walk on the real module: a Europe chain
       through Al-Nassr or LA Galaxy must be reported, and section 1 must go
       red. CRLF is folded before the rewrite is checked.
     TPM_CONTROL=liveidentity changes Lionel Messi's live nationality only in
       memory. The staged-null preflight must reject the proposed restore rows.
     TPM_CONTROL=livepuzzleid changes one live puzzle id only in memory. The
       preflight must report the proposed restore id that disappeared.

   Run: node scripts/simTransferPathModes.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import {
  MODE_RULES, buildGraph, distances, expandCompactCareers, parseActiveRestoreMigration, parseTransferPathCompanionMigration, ruleProblems, sharedClub, shortestPath,
} from './lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src').replaceAll('\\', '/');
const CONTROL = process.env.TPM_CONTROL || '';
const LOCAL_ONLY = process.env.TRANSFER_PATH_LOCAL_ONLY === '1';
if (CONTROL && !['min', 'abroad', 'liveidentity', 'livepuzzleid'].includes(CONTROL)) { console.error(`TPM_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const findings = [];
const fail = m => { failures += 1; findings.push(m); if (failures <= 25) console.error('  FAIL: ' + m); };

/* measured 2026-09-07 on the corrected 885 puzzle pull: Europe 872 */
const SHARE_FLOOR = { active: 0.22, europe: 0.95 };
const PUZZLE_FLOOR = 885;
const COMPANION = path.join(ROOT, 'supabase/migrations/20260907173202_quarantine_unreachable_transfer_path_puzzles_and_refresh_hints.sql');
const ACTIVE_RESTORE = path.join(ROOT, 'supabase/migrations/20260907190000_restore_verified_active_transfer_path_hints.sql');

/* ── the real module, and under the abroad control a rewritten copy for the graph ── */
const TMP = os.tmpdir();
let RULES_FOR_GRAPH = `${SRC}/lib/transferPathModes.ts`;
if (CONTROL === 'abroad') {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/transferPathModes.ts'), 'utf8').replaceAll('\r\n', '\n');
  const from = "const EUROPE_BY_LEAGUE = new Set(['mc']);";
  if (!src.includes(from)) { console.error('control cannot run: transferPathModes.ts is not in the shape this control rewrites'); process.exit(1); }
  const copy = path.join(TMP, 'transferPathModes.control.ts');
  fs.writeFileSync(copy, src.replace(from, "const EUROPE_BY_LEAGUE = new Set(['mc', 'sa', 'us']);"));
  RULES_FOR_GRAPH = copy.replaceAll('\\', '/');
  console.log('NEGATIVE CONTROL ON: the graph is built through a copy where Saudi and United States clubs count as European; the link walk stays on the real module');
}
const ENTRY = path.join(TMP, 'tpm-entry.mjs');
const BUNDLE = path.join(TMP, 'tpm-bundle.mjs');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
fs.writeFileSync(ENTRY, `
export * as real from '${SRC}/lib/transferPathModes.ts';
export * as graphRules from '${RULES_FOR_GRAPH}';
export { default as fallbackPuzzles } from '${SRC}/data/transferPathPuzzles.ts';
export { careerPlayers as fallbackPlayers } from '${SRC}/data/careerPlayers.ts';
export { fetchCareerPlayers } from '${SRC}/lib/fetchCareerPlayers.ts';
export { fetchTransferPathPuzzles } from '${SRC}/lib/fetchTransferPathPuzzles.ts';
export { fetchAllRows } from '${SRC}/lib/fetchAllRows.ts';
export { supabase } from '${SRC}/integrations/supabase/client.ts';
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const site = await import(pathToFileURL(BUNDLE).href);
const { real, graphRules } = site;

/**
 * Walk a chain link by link. Every link must be a same club same season link
 * on the everyday graph, and every name and club on it must pass the rule
 * through the REAL module, whatever graph the chain came from.
 */
function chainProblems(rule, everyday, byName, chain, clubOf) {
  const out = [];
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1], b = chain[i];
    const club = clubOf(a, b);
    if (club === null) { out.push(`${a} and ${b} never shared a season, the game would refuse that link`); continue; }
    if (!(everyday.adj.get(a)?.get(b) ?? []).some(s => s.club === club)) out.push(`${a} and ${b} never shared a season at ${club}`);
    if (rule === 'europe' && !real.isEuropeanClub(club)) out.push(`a Europe chain runs through ${club}, which is not a European club`);
  }
  if (rule === 'active') for (const name of chain) {
    const p = byName.get(name);
    if (!p || !real.isActivePlayer(p)) out.push(`an active only chain carries ${name}, whose identity is not in the verified active set`);
  }
  return out;
}

const pull = path.join(ROOT, 'scripts/data/transferPathPull');
const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
const companionParsed = parseTransferPathCompanionMigration(fs.readFileSync(COMPANION, 'utf8'));
const companionRows = new Map(companionParsed.desired.map(row => [row.id, row]));
const restoreRows = parseActiveRestoreMigration(fs.readFileSync(ACTIVE_RESTORE, 'utf8'));
const stored = new Map([...pairs].map(([id]) => {
  const companion = companionRows.get(id);
  const active = restoreRows.get(id);
  return [id, {
    active: active ? { minSteps: active.minSteps, hint: active.hint, first: null, last: null } : null,
    europe: companion?.europeMinSteps === null || companion?.europeMinSteps === undefined
      ? null
      : { minSteps: companion.europeMinSteps, hint: companion.europeHint, first: null, last: null },
  }];
}));

console.log('1) current stored rule rows against the pull, per rule');
{
  if (companionParsed.desired.length !== companionRows.size) fail('the applied companion repeats a retained puzzle id');
  if (companionRows.size !== pairs.size) fail(`the applied companion carries ${companionRows.size} rows for ${pairs.size} pulled puzzles`);
  if (restoreRows.size !== 203) fail(`the separate active restore carries ${restoreRows.size} rows, expected 203`);
  if (stored.size < PUZZLE_FLOOR) fail(`${stored.size} puzzles, the floor is ${PUZZLE_FLOOR}`);
  for (const row of companionParsed.desired) {
    const pair = pairs.get(row.id);
    if (!pair) fail(`the applied companion carries ${row.id}, which the pull does not have`);
    else if (pair.a !== row.playerA || pair.b !== row.playerB) fail(`the applied companion ${row.id} names ${row.playerA} to ${row.playerB}, expected ${pair.a} to ${pair.b}`);
    if (row.activeMinSteps !== null || row.activeHint !== null) fail(`the applied companion restores active fields on ${row.id}`);
  }
  for (const [id, row] of restoreRows) {
    const pair = pairs.get(id);
    if (!pair) fail(`the active restore carries ${id}, which the pull does not have`);
    else if (pair.a !== row.a || pair.b !== row.b) fail(`the active restore ${id} names ${row.a} to ${row.b}, expected ${pair.a} to ${pair.b}`);
  }
  const active = players.filter(real.isActivePlayer).length;
  console.log(`   ${players.length} players in the pull, ${active} with a verified ${real.ACTIVE_YEAR} identity`);

  if (CONTROL === 'min') {
    const r = stored.get('tpa-944');
    if (!r || !r.europe) { console.error('control cannot run: tpa-944 has no Europe entry to plant on'); process.exit(1); }
    r.europe = { ...r.europe, minSteps: r.europe.minSteps + 1 };
    console.log(`   NEGATIVE CONTROL ON: tpa-944 carries a typed Europe minimum of ${r.europe.minSteps}, this section must go red`);
  }

  const everyday = buildGraph(players);
  const byName = new Map(players.map(p => [p.name, p]));
  for (const rule of MODE_RULES) {
    const graph = buildGraph(graphRules.playersUnderRule(players, rule));
    let withPath = 0, walked = 0;
    const byMin = {};
    for (const [id, { a, b }] of pairs) {
      const s = stored.get(id)?.[rule] ?? null;
      for (const p of ruleProblems(graph, a, b, s)) fail(`stored row ${id} under ${rule} (${a} to ${b}): ${p}`);
      if (!s) continue;
      withPath += 1;
      byMin[s.minSteps] = (byMin[s.minSteps] ?? 0) + 1;
      const chain = shortestPath(graph, a, b);
      if (!chain) continue;
      walked += 1;
      for (const p of chainProblems(rule, everyday, byName, chain, (x, y) => sharedClub(graph, x, y))) fail(`stored row ${id} under ${rule}: ${p}`);
    }
    const share = withPath / pairs.size;
    console.log(`   ${rule}: ${graph.names.length} players in the graph, ${withPath} of ${pairs.size} puzzles have a path (${(share * 100).toFixed(1)} percent), ${walked} shortest chains walked; by minimum ${JSON.stringify(byMin)}`);
    if (SHARE_FLOOR[rule] !== undefined && share < SHARE_FLOOR[rule]) fail(`${rule}: only ${(share * 100).toFixed(1)} percent of puzzles have a path, the floor is ${SHARE_FLOOR[rule] * 100} percent`);
  }
}

console.log('2) the fallback the page shows when the table is down, per rule');
{
  const everyday = buildGraph(site.fallbackPlayers);
  const byName = new Map(site.fallbackPlayers.map(p => [p.name, p]));
  for (const rule of MODE_RULES) {
    const graph = buildGraph(real.playersUnderRule(site.fallbackPlayers, rule));
    let withPath = 0;
    for (const p of site.fallbackPuzzles) {
      const entry = p[rule] ?? null;
      for (const pr of ruleProblems(graph, p.playerA, p.playerB, entry ? { minSteps: entry.minSteps, hint: entry.hint } : null)) fail(`fallback ${p.id} under ${rule}: ${pr}`);
      if (!entry) continue;
      withPath += 1;
      const chain = entry.oneOptimalPath;
      if (!Array.isArray(chain)) { fail(`fallback ${p.id} under ${rule} has no oneOptimalPath`); continue; }
      if (chain[0] !== p.playerA || chain[chain.length - 1] !== p.playerB) fail(`fallback ${p.id} under ${rule}: the path does not run from ${p.playerA} to ${p.playerB}`);
      if (chain.length - 1 !== entry.minSteps) fail(`fallback ${p.id} under ${rule}: the path has ${chain.length - 1} steps, minSteps says ${entry.minSteps}`);
      for (const pr of chainProblems(rule, everyday, byName, chain, (x, y) => sharedClub(graph, x, y))) fail(`fallback ${p.id} under ${rule}: ${pr}`);
    }
    console.log(`   ${rule}: ${withPath} of ${site.fallbackPuzzles.length} fallback puzzles have a path on the fallback pool, every path walked`);
  }
}

console.log('3) the live table, through the site\'s own fetcher');
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
    if (CONTROL === 'liveidentity') {
      const before = players.find(player => player.name === 'Lionel Messi' && player.nationality === 'Argentina');
      if (!before) { console.error('control cannot run: live Lionel Messi of Argentina is absent'); process.exit(1); }
      players = players.map(player => player === before ? { ...player, nationality: 'Uruguay' } : player);
      console.log('   NEGATIVE CONTROL ON: live Lionel Messi carries the wrong nationality before the staged restore preflight');
    }
    if (CONTROL === 'livepuzzleid') {
      const before = puzzles.find(puzzle => puzzle.id === 'tpa-26');
      if (!before) { console.error('control cannot run: live tpa-26 is absent'); process.exit(1); }
      puzzles = puzzles.map(puzzle => puzzle === before ? { ...puzzle, id: 'control-tpa-26-missing' } : puzzle);
      console.log('   NEGATIVE CONTROL ON: live tpa-26 is replaced in memory before the staged restore preflight');
    }
    if (puzzles.length < PUZZLE_FLOOR) fail(`${puzzles.length} live puzzles, the floor is ${PUZZLE_FLOOR}`);
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
    for (const id of restoreRows.keys()) if (!livePuzzleIds.has(id)) fail(`proposed active restore ${id} is absent from the live table`);
    const everyday = buildGraph(players);
    const byName = new Map(players.map(p => [p.name, p]));
    for (const rule of MODE_RULES) {
      const graph = buildGraph(real.playersUnderRule(players, rule));
      let same = 0, withPath = 0;
      if (rule === 'active') {
        for (const p of puzzles) {
          const restore = restoreRows.get(p.id) ?? null;
          const proposed = restore ? { minSteps: restore.minSteps, hint: restore.hint } : null;
          if (restore && (restore.a !== p.playerA || restore.b !== p.playerB)) fail(`proposed active restore ${p.id} names ${restore.a} to ${restore.b}, live has ${p.playerA} to ${p.playerB}`);
          for (const pr of ruleProblems(graph, p.playerA, p.playerB, proposed)) fail(`proposed active restore ${p.id}: ${pr}`);
          if (proposed) {
            withPath += 1;
            const chain = shortestPath(graph, p.playerA, p.playerB);
            if (chain) for (const pr of chainProblems(rule, everyday, byName, chain, (x, y) => sharedClub(graph, x, y))) fail(`proposed active restore ${p.id}: ${pr}`);
          }
          const live = p.active ?? null;
          if (activeLiveState === 'staged-null') {
            if (live !== null) fail(`live ${p.id} has an active hint during the staged-null rollout state`);
            else same += 1;
          } else if (activeLiveState === 'restored') {
            if ((live === null) !== (proposed === null) || (live && (live.minSteps !== proposed.minSteps || live.hint !== proposed.hint))) fail(`live ${p.id} under active differs from the exact verified restore row`);
            else same += 1;
          }
        }
        console.log(`   active: proposed restore checks on the live graph (${withPath} paths); database state ${activeLiveState}, ${same} of ${puzzles.length} rows match that atomic state`);
        continue;
      }
      for (const p of puzzles) {
        const live = p[rule] ?? null;
        const mig = stored.get(p.id)?.[rule] ?? null;
        if (!stored.has(p.id)) fail(`live ${p.id} is not in the migration`);
        else if ((live === null) !== (mig === null) || (live && (live.minSteps !== mig.minSteps || live.hint !== mig.hint))) fail(`live ${p.id} under ${rule} differs from the migration: live ${JSON.stringify(live)}, migration ${JSON.stringify(mig && { minSteps: mig.minSteps, hint: mig.hint })}`);
        else same += 1;
        for (const pr of ruleProblems(graph, p.playerA, p.playerB, live ? { minSteps: live.minSteps, hint: live.hint } : null)) fail(`live ${p.id} under ${rule}: ${pr}`);
        if (!live) continue;
        withPath += 1;
        const chain = shortestPath(graph, p.playerA, p.playerB);
        if (chain) for (const pr of chainProblems(rule, everyday, byName, chain, (x, y) => sharedClub(graph, x, y))) fail(`live ${p.id} under ${rule}: ${pr}`);
      }
      console.log(`   ${rule}: ${same} of ${puzzles.length} live rows equal the migration text for text, ${withPath} with a path, on ${graph.names.length} live players${rule === 'active' ? ' (restored state)' : ''}`);
    }
  }
  }
}

console.log('4) the source: the page filters through the same module');
{
  const code = s => s.replaceAll('\r\n', '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const hook = code(fs.readFileSync(path.join(ROOT, 'src/hooks/useTransferPath.ts'), 'utf8'));
  if (!/playersUnderRule\s*\(/.test(hook)) fail('useTransferPath does not filter its pool through playersUnderRule');
  if (!/puzzleUnderRule\s*\(/.test(hook)) fail('useTransferPath does not read a puzzle through puzzleUnderRule');
  const fetcher = code(fs.readFileSync(path.join(ROOT, 'src/lib/fetchTransferPathPuzzles.ts'), 'utf8'));
  const select = fetcher.match(/\.select\(\s*"([^"]*)"\s*\)/);
  const cols = select ? select[1].split(',').map(s => s.trim()) : [];
  for (const rule of MODE_RULES) for (const col of [`${rule}_min_steps`, `${rule}_hint`]) if (!cols.includes(col)) fail(`fetchTransferPathPuzzles does not select ${col}`);
  console.log(`   the hook filters through playersUnderRule and reads puzzleUnderRule; the fetcher selects ${cols.length} columns including every rule pair`);
}

console.log('');
if (CONTROL) {
  const specific = CONTROL === 'abroad'
    ? findings.some(f => /a Europe chain runs through/.test(f))
    : CONTROL === 'liveidentity'
      ? findings.some(f => /proposed active restore/.test(f))
    : CONTROL === 'livepuzzleid'
      ? findings.some(f => /proposed active restore tpa-26 is absent from the live table/.test(f))
      : findings.some(f => /tpa-944 under europe/.test(f) && /the search says/.test(f));
  if (failures > 0 && specific) { console.log(`simTransferPathModes control (${CONTROL}): green. The planted defect was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simTransferPathModes control (${CONTROL}): RED. ${failures ? 'Findings came, but not the one the control plants.' : 'The planted defect went unreported.'}`); process.exit(1);
}
if (failures > 0) { console.error(`simTransferPathModes: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simTransferPathModes: green. Under every rule the stored minimum is the search\'s, every hint describes a path the rule accepts, and no chain leaves the rule.');
