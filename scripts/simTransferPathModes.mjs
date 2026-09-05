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
     1) THE MODE MIGRATION AGAINST THE PULL IT WAS MADE FROM, PER RULE. The
        VALUES rows in supabase/migrations/20260905_round_460_transfer_path_mode_hints.sql
        are parsed, the graph is rebuilt through the page's own
        playersUnderRule (bundled from the real module), and for every puzzle
        and rule: null means the search finds no path, a number means the
        search's minimum, and the hint promises that many steps and names a
        first and last club a shortest path really uses. Then the derived
        shortest path is walked link by link with the REAL module, apart from
        the graph: under active every name on it has a season touching
        ACTIVE_YEAR, under Europe every link's shared club is European, and
        every link is a same club same season link on the everyday graph. The
        share of puzzles with a path under each rule is measured and floored
        from headroom (2026-09-05: active 236 of 902, Europe 902 of 902).
        ACTIVE_YEAR is checked against the pull: a season ending after it
        means the constant is stale.
     2) THE FALLBACK THE PAGE SHOWS WHEN THE TABLE IS DOWN, PER RULE.
        src/data/transferPathPuzzles.ts against src/data/careerPlayers.ts by
        the same test, and each rule's oneOptimalPath walked link by link.
     3) THE LIVE TABLE, through the site's own fetcher. Every live row's rule
        pair equals the migration's, text for text (which is the proof that the
        SQL rebuilding the hint mirrors hintText), and passes the same checks
        on the live graph. SKIPS LOUDLY when Supabase is unreachable.
     4) THE SOURCE. The hook filters through playersUnderRule and reads
        puzzleUnderRule, the fetcher selects all four columns. Comments are
        stripped before matching.

   NEGATIVE CONTROLS, each refusing to run if its rewrite changed nothing:
     TPM_CONTROL=min plants a typed Europe minimum one step too high on
       tpa-945 in the parsed migration; section 1 must go red on that row.
     TPM_CONTROL=abroad rewrites a COPY of transferPathModes.ts so Saudi and
       United States clubs count as European, builds section 1's graph through
       the copy, and keeps the link walk on the real module: a Europe chain
       through Al-Nassr or LA Galaxy must be reported, and section 1 must go
       red. CRLF is folded before the rewrite is checked.

   Run: node scripts/simTransferPathModes.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import {
  MODE_RULES, buildGraph, distances, expandCompactCareers, parseModeMigration, ruleProblems, sharedClub, shortestPath,
} from './lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src').replaceAll('\\', '/');
const CONTROL = process.env.TPM_CONTROL || '';
if (CONTROL && !['min', 'abroad'].includes(CONTROL)) { console.error(`TPM_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const findings = [];
const fail = m => { failures += 1; findings.push(m); if (failures <= 25) console.error('  FAIL: ' + m); };

/* measured 2026-09-05 on the 902 puzzle pull: active 236 (26.2 percent), Europe 902 */
const SHARE_FLOOR = { active: 0.2, europe: 0.95 };
const PUZZLE_FLOOR = 902;
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260905_round_460_transfer_path_mode_hints.sql');

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
    if (!p || !real.isActivePlayer(p)) out.push(`an active only chain carries ${name}, who has no ${real.ACTIVE_YEAR} season`);
  }
  return out;
}

const pull = path.join(ROOT, 'scripts/data/transferPathPull');
const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
const stored = parseModeMigration(fs.readFileSync(MIGRATION, 'utf8'), pairs);

console.log('1) the mode migration against the pull it was made from, per rule');
{
  if (stored.size !== pairs.size) fail(`the migration carries ${stored.size} rows for ${pairs.size} pulled puzzles`);
  if (stored.size < PUZZLE_FLOOR) fail(`${stored.size} puzzles, the floor is ${PUZZLE_FLOOR}`);
  for (const id of stored.keys()) if (!pairs.has(id)) fail(`the migration carries ${id}, which the pull does not have`);
  const latest = Math.max(...players.flatMap(p => p.career.map(s => real.seasonSpan(s.season)?.[1] ?? 0)));
  if (latest > real.ACTIVE_YEAR) fail(`the pull carries a season ending in ${latest}, past ACTIVE_YEAR ${real.ACTIVE_YEAR}: move the constant`);
  const active = players.filter(real.isActivePlayer).length;
  console.log(`   ${players.length} players in the pull, ${active} with a season touching ${real.ACTIVE_YEAR}, latest season ends ${latest}`);

  if (CONTROL === 'min') {
    const r = stored.get('tpa-945');
    if (!r || !r.europe) { console.error('control cannot run: tpa-945 has no Europe entry to plant on'); process.exit(1); }
    r.europe = { ...r.europe, minSteps: r.europe.minSteps + 1 };
    console.log(`   NEGATIVE CONTROL ON: tpa-945 carries a typed Europe minimum of ${r.europe.minSteps}, this section must go red`);
  }

  const everyday = buildGraph(players);
  const byName = new Map(players.map(p => [p.name, p]));
  for (const rule of MODE_RULES) {
    const graph = buildGraph(graphRules.playersUnderRule(players, rule));
    let withPath = 0, walked = 0;
    const byMin = {};
    for (const [id, { a, b }] of pairs) {
      const s = stored.get(id)?.[rule] ?? null;
      for (const p of ruleProblems(graph, a, b, s)) fail(`migration ${id} under ${rule} (${a} to ${b}): ${p}`);
      if (!s) continue;
      withPath += 1;
      byMin[s.minSteps] = (byMin[s.minSteps] ?? 0) + 1;
      const chain = shortestPath(graph, a, b);
      if (!chain) continue;
      walked += 1;
      for (const p of chainProblems(rule, everyday, byName, chain, (x, y) => sharedClub(graph, x, y))) fail(`migration ${id} under ${rule}: ${p}`);
    }
    const share = withPath / pairs.size;
    console.log(`   ${rule}: ${graph.names.length} players in the graph, ${withPath} of ${pairs.size} puzzles have a path (${(share * 100).toFixed(1)} percent), ${walked} shortest chains walked; by minimum ${JSON.stringify(byMin)}`);
    if (share < SHARE_FLOOR[rule]) fail(`${rule}: only ${(share * 100).toFixed(1)} percent of puzzles have a path, the floor is ${SHARE_FLOOR[rule] * 100} percent`);
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
  let players = [], puzzles = [];
  try {
    const warn = console.warn; console.warn = () => {};
    [players, puzzles] = await Promise.all([site.fetchCareerPlayers(), site.fetchTransferPathPuzzles()]);
    console.warn = warn;
  } catch { players = []; puzzles = []; }
  if (!players.length || !puzzles.length) {
    console.log('   SKIPPED, SUPABASE UNREACHABLE. NOT CHECKED. The migration was checked against its pull in section 1; run this where the host is reachable.');
  } else {
    if (puzzles.length < PUZZLE_FLOOR) fail(`${puzzles.length} live puzzles, the floor is ${PUZZLE_FLOOR}`);
    const everyday = buildGraph(players);
    const byName = new Map(players.map(p => [p.name, p]));
    for (const rule of MODE_RULES) {
      const graph = buildGraph(real.playersUnderRule(players, rule));
      let same = 0, withPath = 0;
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
      console.log(`   ${rule}: ${same} of ${puzzles.length} live rows equal the migration text for text, ${withPath} with a path, on ${graph.names.length} live players`);
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
  const specific = CONTROL === 'abroad' ? findings.some(f => /a Europe chain runs through/.test(f)) : findings.some(f => /tpa-945 under europe/.test(f) && /the search says/.test(f));
  if (failures > 0 && specific) { console.log(`simTransferPathModes control (${CONTROL}): green. The planted defect was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simTransferPathModes control (${CONTROL}): RED. ${failures ? 'Findings came, but not the one the control plants.' : 'The planted defect went unreported.'}`); process.exit(1);
}
if (failures > 0) { console.error(`simTransferPathModes: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simTransferPathModes: green. Under every rule the stored minimum is the search\'s, every hint describes a path the rule accepts, and no chain leaves the rule.');
