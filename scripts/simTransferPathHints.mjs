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
 *      names first and ends at the club it names last. All 902 puzzles, none
 *      unreachable.
 *   2. THE FALLBACK THE PAGE SHOWS WHEN THE TABLE IS DOWN. src/data/transferPathPuzzles.ts
 *      against src/data/careerPlayers.ts by the same test, and each
 *      oneOptimalPath is a chain the game would accept, link by link.
 *   3. THE LIVE TABLES, through the site's own fetchers. SKIPS LOUDLY when
 *      Supabase is unreachable, because the sandbox usually cannot reach it.
 *   4. THE WORDING: no long dash, under 200 characters, and no hint that
 *      says "Direct link" on a pair the game would refuse (the exact shape
 *      of the reported defect, kept as its own line so it can never return).
 *
 * NEGATIVE CONTROLS: TPH_CONTROL=stale plants the old tp-19 hint on the
 * parsed migration (section 1 must go red); TPH_CONTROL=club plants a hint
 * naming a club the first player never shared with anyone (section 1 must
 * go red); TPH_CONTROL=min plants the old minimum on tpa-945 (section 1
 * must go red); TPH_CONTROL=direct plants a well formed direct link claim on
 * tp-19, the reported pair, which the game refuses (sections 1 and 4 must go
 * red).
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
if (CONTROL && !['stale', 'club', 'min', 'direct', 'mode'].includes(CONTROL)) { console.error(`TPH_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const fail = m => { failures += 1; if (failures <= 25) console.error('  FAIL: ' + m); };

/* the puzzle counts measured on 2026-08-26; a shrink is lost coverage */
const PUZZLE_FLOOR = 902;
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
  if (CONTROL === 'min') { const r = rows.find(x => x.id === 'tpa-945'); r.minSteps = 5; console.log('   NEGATIVE CONTROL ON: tpa-945 carries its old minimum of 5 again, this section must go red'); }
  const { unreachable, checked } = checkRows(graph, rows, 'migration');
  if (unreachable) fail(`${unreachable} puzzles cannot be solved on the pulled graph`);
  const byMin = {};
  for (const r of rows) byMin[r.minSteps] = (byMin[r.minSteps] ?? 0) + 1;
  console.log(`   ${checked} puzzles checked on ${graph.names.length} players; by minimum ${JSON.stringify(byMin)}`);
  if ((byMin[2] ?? 0) < 400 || (byMin[3] ?? 0) < 300) fail('the mix of minimums moved a long way from the 2026-08-26 measurement (490 twos, 388 threes, 24 fours)');
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

console.log('5) the special rule migration against the pull, per rule');
{
  const pull = path.join(ROOT, 'scripts/data/transferPathPull');
  const players = expandCompactCareers(fs.readFileSync(path.join(pull, 'careers.txt'), 'utf8'));
  const pairs = new Map(fs.readFileSync(path.join(pull, 'puzzles.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split('|'); return [id, { a, b }]; }));
  const stored = parseModeMigration(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260905_round_460_transfer_path_mode_hints.sql'), 'utf8'), pairs);
  if (stored.size !== pairs.size) fail(`the mode migration carries ${stored.size} rows for ${pairs.size} pulled puzzles`);
  if (CONTROL === 'mode') {
    const r = stored.get('tpa-945');
    if (!r || !r.europe) { console.error('control cannot run: tpa-945 has no Europe entry to plant on'); process.exit(1); }
    r.europe = { ...r.europe, minSteps: r.europe.minSteps + 1 };
    console.log(`   NEGATIVE CONTROL ON: tpa-945 carries a typed Europe minimum of ${r.europe.minSteps}, this section must go red`);
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
