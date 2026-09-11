/**
 * Round 294: write the migration that puts a true minimum and a true hint on
 * every Transfer Path puzzle.
 *
 * Input is the pull taken through the database console on 2026-08-26 and
 * kept in scripts/data/transferPathPull/: careers.txt is every career_players
 * row with its career_seasons compacted to spells, puzzles.txt is every
 * retained transfer_path_puzzles row as id|a|b|old_min. Applied migrations are
 * immutable. Current classic and Europe truth is checked against the companion.
 *
 * Round 460: the same derivation under each special rule. Active players
 * only and Europe only are filters on the pool (src/lib/transferPathModes.ts,
 * the file the page searches through, bundled here so the generator cannot
 * disagree with the game about what "active" or "European" means). The
 * already applied Round 460 and quarantine migrations are immutable. Current
 * verified active results are written only to the separate restore migration.
 *
 * Round 531: src/data/careerPlayers.ts is baked from the live career tables
 * (253 players, it was 151 hand typed), so the identity candidates the active
 * rule can draw from grew with it. The derivation over the bigger pool admits
 * twelve more identities, each already carried by a committed two source
 * evidence set (docs/audits/transfer-path-active-identities-2026-09-11.md
 * names the set for every one), and refuses Emiliano Martinez on purpose: the
 * 2026 World Cup squads carry that name twice (Argentina, Uruguay), and a name
 * the evidence itself holds twice never activates by name. The two counts in
 * EXPECTED_ACTIVE_IDENTITIES and EXPECTED_ACTIVE_PUZZLES are tripwires, not
 * targets: a run that derives anything else stops before it writes, so a
 * change to the pool or the evidence is reviewed rather than absorbed. The
 * restore migration dated 2026-09-07 (78 identities, 203 puzzles) is APPLIED
 * (the live table carried its 203 pairs on 2026-09-11) and immutable, so the
 * current truth reaches the table through a refresh migration that names,
 * beside every value it writes, the applied value it replaces.
 *
 * Re-run after any change to the career tables, then apply the new files and
 * run simTransferPathHints and simTransferPathModes against the live tables.
 *
 * Run: node scripts/genTransferPathHints.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { MODE_RULES, buildGraph, deriveHint, expandCompactCareers, hintProblems, parseActiveRestoreMigration, ruleProblems } from './lib/transferPathHints.mjs';
import { deriveVerifiedActiveIdentities, parseWorldCupIdentities, verifiedActiveModule } from './lib/transferPathActiveIdentities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PULL = path.join(ROOT, 'scripts/data/transferPathPull');
const COMPANION_OUT = path.join(ROOT, 'supabase/migrations/20260907173202_quarantine_unreachable_transfer_path_puzzles_and_refresh_hints.sql');
const APPLIED_RESTORE = path.join(ROOT, 'supabase/migrations/20260907190000_restore_verified_active_transfer_path_hints.sql');
const ACTIVE_RESTORE_OUT = path.join(ROOT, 'supabase/migrations/20260911190000_refresh_verified_active_transfer_path_hints.sql');
const ACTIVE_OUT = path.join(ROOT, 'src/data/transferPathVerifiedActive.ts');

/* Round 531 tripwires, see the header: 90 identities over the 253 player pool
   (12 up from the 78 of 2026-09-07, Emiliano Martinez refused by the namesake
   guard), and the retained puzzles those identities connect. Move them only
   with the evidence file that explains the new number. The applied restore's
   own count is pinned too, so a parse that drops rows cannot pass as truth. */
const EXPECTED_ACTIVE_IDENTITIES = 90;
const EXPECTED_ACTIVE_PUZZLES = 212;
const APPLIED_ACTIVE_PUZZLES = 203;

/* Active identity evidence is generated before the page's rule module is
   bundled, because that module imports the generated set. */
const SRC = path.join(ROOT, 'src').replaceAll('\\', '/');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const PRE_ENTRY = path.join(os.tmpdir(), 'gen-tph-active-entry.mjs');
const PRE_BUNDLE = path.join(os.tmpdir(), 'gen-tph-active-bundle.mjs');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
fs.writeFileSync(PRE_ENTRY, `export { careerPlayers as fallbackPlayers } from '${SRC}/data/careerPlayers.ts';\nexport { transferPathIdentityKey } from '${SRC}/lib/transferPathIdentity.ts';\nexport { TRANSFER_OVERLAY_2026 as overlay } from '${ROOT_URL}/scripts/transferOverlay2026.mjs';\n`);
await build({ entryPoints: [PRE_ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: PRE_BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const seed = await import(pathToFileURL(PRE_BUNDLE).href + `?v=${Date.now()}`);
const worldCupRows = parseWorldCupIdentities(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260901_round_389_world_cup_2026_squads.sql'), 'utf8'));
const staleRows = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/staleSweep2026.json'), 'utf8')).active;
const careerPullPath = path.join(PULL, 'careers.txt');
const compactLines = fs.readFileSync(careerPullPath, 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean);
const careerNameUniverse = compactLines.map(line => ({ name: line.slice(0, line.indexOf('|')) }));
const activeIdentities = deriveVerifiedActiveIdentities({
  careerPlayers: seed.fallbackPlayers,
  careerNameUniverse,
  worldCupRows,
  staleRows,
  overlayRows: seed.overlay,
  identityKey: seed.transferPathIdentityKey,
});
if (activeIdentities.length !== EXPECTED_ACTIVE_IDENTITIES) {
  console.error(`verified active identity count changed from ${EXPECTED_ACTIVE_IDENTITIES} to ${activeIdentities.length}; review the evidence matches before regenerating`);
  process.exit(1);
}
fs.writeFileSync(ACTIVE_OUT, verifiedActiveModule(activeIdentities));
console.log(`wrote ${path.relative(ROOT, ACTIVE_OUT)}: ${activeIdentities.length} normalized name plus nationality identities`);

/* careers.txt carries nationality only for identities in the generated active
   set. Every other line stays in its older two-field form, which is deliberate:
   an unknown nationality can never turn a raw-name match into an active player. */
const activeByName = new Map();
for (const identity of activeIdentities) {
  const normalizedName = seed.transferPathIdentityKey(identity.name, '').split('|')[0];
  const matches = activeByName.get(normalizedName) ?? [];
  matches.push(identity);
  activeByName.set(normalizedName, matches);
}
const annotatedLines = compactLines.map(line => {
  const firstBar = line.indexOf('|');
  const secondBar = line.indexOf('|', firstBar + 1);
  const name = line.slice(0, firstBar);
  const career = line.slice(secondBar === -1 ? firstBar + 1 : secondBar + 1);
  const normalizedName = seed.transferPathIdentityKey(name, '').split('|')[0];
  const matches = activeByName.get(normalizedName) ?? [];
  return matches.length === 1 ? `${name}|${matches[0].nationality}|${career}` : `${name}|${career}`;
});
fs.writeFileSync(careerPullPath, annotatedLines.join('\n') + '\n');

/* The page's own rule filters and fallback pools are bundled after the active
   identities exist. The fallback puzzle file is rewritten at the end. */
const ENTRY = path.join(os.tmpdir(), 'gen-tph-entry.mjs'), BUNDLE = path.join(os.tmpdir(), 'gen-tph-bundle.mjs');
fs.writeFileSync(ENTRY, `export { default as fallbackPuzzles } from '${SRC}/data/transferPathPuzzles.ts';\nexport { careerPlayers as fallbackPlayers } from '${SRC}/data/careerPlayers.ts';\nexport { playersUnderRule, ACTIVE_YEAR } from '${SRC}/lib/transferPathModes.ts';\n`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const site = await import(pathToFileURL(BUNDLE).href + `?v=${Date.now()}`);

const players = expandCompactCareers(fs.readFileSync(careerPullPath, 'utf8'));
const puzzles = fs.readFileSync(path.join(PULL, 'puzzles.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean).map(l => {
  const [id, a, b, min] = l.split('|');
  return { id, a, b, oldMin: Number(min) };
});
const graph = buildGraph(players);
console.log(`${players.length} players, ${graph.names.length} in the graph, ${puzzles.length} puzzles`);

const q = s => `'${String(s).replace(/'/g, "''")}'`;
let unreachable = 0, minChanged = 0, byMin = {};
const classicById = new Map();
for (const p of puzzles) {
  const d = deriveHint(graph, p.a, p.b);
  if (!d) { unreachable += 1; console.error(`  UNREACHABLE: ${p.id} ${p.a} -> ${p.b}`); continue; }
  const problems = hintProblems(graph, p.a, p.b, d.minSteps, d.hint);
  if (problems.length) { console.error(`  GENERATOR CONTRADICTS ITS OWN FENCE on ${p.id}: ${problems.join('; ')}`); process.exit(1); }
  if (/[\u2013\u2014]/.test(d.hint)) { console.error(`  long dash in ${p.id}`); process.exit(1); }
  if (d.minSteps !== p.oldMin) minChanged += 1;
  byMin[d.minSteps] = (byMin[d.minSteps] ?? 0) + 1;
  classicById.set(p.id, d);
}
if (unreachable) { console.error(`${unreachable} puzzle(s) have no path; current truth was not accepted`); process.exit(1); }
console.log(`derived current classic truth: ${puzzles.length} rows, minimum changed on ${minChanged}, by minimum ${JSON.stringify(byMin)}`);
for (const id of ['tp-19', 'tp-20', 'tp-3', 'tpa-29', 'tpa-944']) {
  const p = puzzles.find(x => x.id === id);
  if (p) { const d = deriveHint(graph, p.a, p.b); console.log(`  ${id}: ${p.oldMin} -> ${d.minSteps}, ${d.path.join(' > ')}\n     "${d.hint}"`); }
}

/* Derive every pair under each special rule. The applied Round 460 migration
   stays immutable. Current active rows go only to the new restore migration. */
const ruleGraphs = Object.fromEntries(MODE_RULES.map(rule => [rule, buildGraph(site.playersUnderRule(players, rule))]));
if (ruleGraphs.active.names.length !== EXPECTED_ACTIVE_IDENTITIES) {
  console.error(`the annotated pull activates ${ruleGraphs.active.names.length} players, expected the ${EXPECTED_ACTIVE_IDENTITIES} verified identities`);
  process.exit(1);
}
const modeStats = Object.fromEntries(MODE_RULES.map(rule => [rule, { players: ruleGraphs[rule].names.length, withPath: 0, byMin: {} }]));
const modesById = new Map();
for (const p of puzzles) {
  const derived = {};
  for (const rule of MODE_RULES) {
    const d = deriveHint(ruleGraphs[rule], p.a, p.b);
    derived[rule] = d;
    const problems = ruleProblems(ruleGraphs[rule], p.a, p.b, d ? { minSteps: d.minSteps, hint: d.hint } : null);
    if (problems.length) { console.error(`  GENERATOR CONTRADICTS ITS OWN FENCE on ${p.id} under ${rule}: ${problems.join('; ')}`); process.exit(1); }
    if (d && /[\u2013\u2014]/.test(d.hint)) { console.error(`  long dash in ${p.id} under ${rule}`); process.exit(1); }
    if (d) { modeStats[rule].withPath += 1; modeStats[rule].byMin[d.minSteps] = (modeStats[rule].byMin[d.minSteps] ?? 0) + 1; }
  }
  modesById.set(p.id, derived);
}
if (modeStats.active.withPath !== EXPECTED_ACTIVE_PUZZLES) {
  console.error(`verified active puzzle count changed from ${EXPECTED_ACTIVE_PUZZLES} to ${modeStats.active.withPath}; review the identity evidence and graph before writing mode migrations`);
  process.exit(1);
}
console.log(`derived current special-rule truth for ${puzzles.length} puzzles: ${JSON.stringify(modeStats)}`);

/* The applied quarantine companion stays immutable. Verify its retained rows
   still equal current classic and Europe truth, with active deliberately null. */
{
  const ruleCells = derived => derived
    ? `${derived.minSteps}, ${q(derived.hint)}`
    : 'null::smallint, null::text';
  const rows = puzzles.map(p => {
    const classic = classicById.get(p.id);
    const modes = modesById.get(p.id);
    return `      (${q(p.id)}, ${q(p.a)}, ${q(p.b)}, ${classic.minSteps}, ${q(classic.hint)}, ${ruleCells(null)}, ${ruleCells(modes.europe)})`;
  });
  let companion = fs.readFileSync(COMPANION_OUT, 'utf8').replaceAll('\r\n', '\n');
  const desired = companion.indexOf('  for desired in');
  const startMarker = '    from (values\n';
  const start = companion.indexOf(startMarker, desired);
  const endMarker = '\n    ) as rows(\n      puzzle_id, player_a, player_b, min_steps, hint,';
  const end = companion.indexOf(endMarker, start);
  if (desired < 0 || start < 0 || end < 0) {
    console.error('the pending companion migration no longer has the retained VALUES block the generator owns');
    process.exit(1);
  }
  const actualRows = companion.slice(start + startMarker.length, end);
  const expectedRows = rows.join(',\n');
  if (actualRows !== expectedRows) {
    console.error(`the applied companion migration no longer matches ${rows.length} current classic and Europe rows with active null; create a new migration instead of rewriting it`);
    process.exit(1);
  }
  console.log(`verified immutable ${path.relative(ROOT, COMPANION_OUT)}: ${rows.length} guarded retained rows, active hints stay null for the staged rollout`);
}

/* Round 531: the 2026-09-07 restore is APPLIED (the live table carried its
   203 pairs on 2026-09-11), so it is immutable and the current active truth
   reaches the table through a refresh. Every row names, beside the value it
   writes, the applied value it replaces (null for a pair the bigger identity
   set connects for the first time), so a drifted or already refreshed table
   raises instead of being rewritten. A bigger identity set cannot lose a
   path, so every applied pair must still be in the derived set. */
{
  const applied = parseActiveRestoreMigration(fs.readFileSync(APPLIED_RESTORE, 'utf8'));
  if (applied.size !== APPLIED_ACTIVE_PUZZLES) {
    console.error(`the applied restore parses to ${applied.size} rows, expected ${APPLIED_ACTIVE_PUZZLES}; it is applied and immutable, so this is a parse problem, not a data one`);
    process.exit(1);
  }
  const rows = [];
  let unchanged = 0;
  for (const p of puzzles) {
    const active = modesById.get(p.id).active;
    const old = applied.get(p.id) ?? null;
    if (old && (old.a !== p.a || old.b !== p.b)) { console.error(`applied active row ${p.id} names ${old.a} to ${old.b}, the pull has ${p.a} to ${p.b}`); process.exit(1); }
    if (old && !active) { console.error(`${p.id} has an applied active hint but no path on the current identity set; a bigger set cannot lose a path, review before writing`); process.exit(1); }
    if (!active) continue;
    if (old && old.minSteps === active.minSteps && old.hint === active.hint) unchanged += 1;
    rows.push(`      (${q(p.id)}, ${q(p.a)}, ${q(p.b)}, ${old ? old.minSteps : 'null::smallint'}, ${old ? q(old.hint) : 'null::text'}, ${active.minSteps}, ${q(active.hint)})`);
  }
  if (rows.length !== EXPECTED_ACTIVE_PUZZLES) {
    console.error(`verified active puzzle count changed from ${EXPECTED_ACTIVE_PUZZLES} to ${rows.length}; review the identity evidence before writing the refresh migration`);
    process.exit(1);
  }
  const restore = [
    '-- Refresh Transfer Path Active Players Only to the Round 531 identity set.',
    `-- Generated by scripts/genTransferPathHints.mjs from the ${activeIdentities.length} normalized name plus`,
    '-- nationality identities used by src/lib/transferPathModes.ts. The 2026-09-07 restore',
    `-- (78 identities, ${applied.size} pairs) is applied and immutable. Every row below names the`,
    '-- applied value it replaces beside the value it writes, so a drifted or already refreshed',
    '-- table raises instead of being rewritten. Apply only after the frontend carrying this',
    '-- identity set (Round 531) is live, so no hint names a player the live page refuses.',
    '',
    'begin;',
    '',
    'do $migration$',
    'declare',
    '  desired record;',
    '  matching_rows integer;',
    '  updated_this_row integer;',
    '  updated_rows integer := 0;',
    'begin',
    '  select count(*) into matching_rows from public.transfer_path_puzzles;',
    "  if matching_rows <> 885 then raise exception 'Expected 885 retained Transfer Path rows before active refresh, found %', matching_rows; end if;",
    '',
    '  select count(*) into matching_rows',
    '  from public.transfer_path_puzzles p',
    '  where p.active_min_steps is not null and p.active_hint is not null;',
    `  if matching_rows <> ${applied.size} then raise exception 'Expected the ${applied.size} applied active hints before refresh, found %', matching_rows; end if;`,
    '',
    '  for desired in',
    '    select *',
    '    from (values',
    rows.join(',\n'),
    '    ) as rows(puzzle_id, player_a, player_b, old_active_min_steps, old_active_hint, active_min_steps, active_hint)',
    '  loop',
    '    select count(*) into matching_rows',
    '    from public.transfer_path_puzzles p',
    '    where p.puzzle_id = desired.puzzle_id',
    '      and p.player_a = desired.player_a',
    '      and p.player_b = desired.player_b',
    '      and p.active_min_steps is not distinct from desired.old_active_min_steps::smallint',
    '      and p.active_hint is not distinct from desired.old_active_hint;',
    '',
    "    if matching_rows <> 1 then raise exception 'Expected one exact row holding the applied active value for %, found %', desired.puzzle_id, matching_rows; end if;",
    '',
    '    update public.transfer_path_puzzles p',
    '    set active_min_steps = desired.active_min_steps::smallint,',
    '        active_hint = desired.active_hint',
    '    where p.puzzle_id = desired.puzzle_id',
    '      and p.player_a = desired.player_a',
    '      and p.player_b = desired.player_b',
    '      and p.active_min_steps is not distinct from desired.old_active_min_steps::smallint',
    '      and p.active_hint is not distinct from desired.old_active_hint;',
    '',
    '    get diagnostics updated_this_row = row_count;',
    '    updated_rows := updated_rows + updated_this_row;',
    '  end loop;',
    '',
    `  if updated_rows <> ${rows.length} then raise exception 'Expected to refresh ${rows.length} verified active rows, updated %', updated_rows; end if;`,
    '',
    '  select count(*) into matching_rows',
    '  from public.transfer_path_puzzles p',
    '  where p.active_min_steps is not null and p.active_hint is not null;',
    `  if matching_rows <> ${rows.length} then raise exception 'Expected ${rows.length} complete active hints after refresh, found %', matching_rows; end if;`,
    '',
    '  if exists (',
    '    select 1 from public.transfer_path_puzzles p',
    '    where (p.active_min_steps is null) <> (p.active_hint is null)',
    "  ) then raise exception 'Transfer Path has a partial active hint after refresh'; end if;",
    'end',
    '$migration$;',
    '',
    'commit;',
    '',
  ].join('\n');
  if (fs.existsSync(ACTIVE_RESTORE_OUT)) {
    const existing = fs.readFileSync(ACTIVE_RESTORE_OUT, 'utf8').replaceAll('\r\n', '\n');
    if (existing !== restore) {
      console.error(`the existing active refresh migration differs from current truth; create a new dated migration instead of rewriting ${path.relative(ROOT, ACTIVE_RESTORE_OUT)}`);
      process.exit(1);
    }
    console.log(`verified immutable ${path.relative(ROOT, ACTIVE_RESTORE_OUT)}: ${rows.length} exact verified-active refresh rows`);
  } else {
    fs.writeFileSync(ACTIVE_RESTORE_OUT, restore);
    console.log(`wrote new ${path.relative(ROOT, ACTIVE_RESTORE_OUT)}: ${rows.length} exact verified-active refresh rows, ${unchanged} unchanged from the applied restore, ${applied.size} replaced, ${rows.length - applied.size} new`);
  }
}

/* The fallback pool the page shows when the table is down is a different
   graph (src/data/careerPlayers.ts, baked from the live career tables by
   scripts/bakeCareerPlayers.mjs since Round 531), so the fallback
   puzzles get their own derivation from it, under every rule. Puzzles with
   no classic path there are dropped from the fallback, never guessed; a
   puzzle with no path under a special rule carries null for that rule. */
{
  const fg = buildGraph(site.fallbackPlayers);
  const fRule = Object.fromEntries(MODE_RULES.map(rule => [rule, buildGraph(site.playersUnderRule(site.fallbackPlayers, rule))]));
  const kept = [], dropped = [];
  for (const p of site.fallbackPuzzles) {
    const d = deriveHint(fg, p.playerA, p.playerB);
    if (!d) { dropped.push(p.id); continue; }
    const problems = hintProblems(fg, p.playerA, p.playerB, d.minSteps, d.hint);
    if (problems.length) { console.error(`  fallback ${p.id}: ${problems.join('; ')}`); process.exit(1); }
    const entry = { id: p.id, playerA: p.playerA, playerB: p.playerB, minSteps: d.minSteps, oneOptimalPath: d.path, hint: d.hint };
    for (const rule of MODE_RULES) {
      const r = deriveHint(fRule[rule], p.playerA, p.playerB);
      entry[rule] = r ? { minSteps: r.minSteps, oneOptimalPath: r.path, hint: r.hint } : null;
      const rp = ruleProblems(fRule[rule], p.playerA, p.playerB, r ? { minSteps: r.minSteps, hint: r.hint } : null);
      if (rp.length) { console.error(`  fallback ${p.id} under ${rule}: ${rp.join('; ')}`); process.exit(1); }
    }
    kept.push(entry);
  }
  const js = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const ruleJs = r => r ? `{ minSteps: ${r.minSteps}, oneOptimalPath: [${r.oneOptimalPath.map(js).join(', ')}], hint: ${js(r.hint)} }` : 'null';
  const body = kept.map(p => `  {\n    id: ${js(p.id)}, playerA: ${js(p.playerA)}, playerB: ${js(p.playerB)}, minSteps: ${p.minSteps},\n    oneOptimalPath: [${p.oneOptimalPath.map(js).join(', ')}],\n    hint: ${js(p.hint)},\n${MODE_RULES.map(rule => `    ${rule}: ${ruleJs(p[rule])},\n`).join('')}  },`).join('\n');
  const file = `/** A pair's minimum and hint under one rule, with the path they were read from. */
export interface TransferPathRuleHint {
  minSteps: number;
  oneOptimalPath?: string[];
  hint: string;
}

export interface TransferPathPuzzle {
  id: string;
  playerA: string;
  playerB: string;
  minSteps: number;
  oneOptimalPath?: string[];
  hint: string;
  /** Round 460: the same pair under each special rule (src/lib/transferPathModes.ts),
   *  null where the rule leaves no path. Optional only so a puzzle built by hand in a
   *  test can leave them out; this file and the fetcher always set both, and a missing
   *  entry reads as no path, never as a path. */
  active?: TransferPathRuleHint | null;
  europe?: TransferPathRuleHint | null;
}

/**
 * The fallback pool, served only when transfer_path_puzzles cannot be read.
 * Round 294: every minimum, path and hint below is derived from
 * src/data/careerPlayers.ts (the fallback player pool) under the game's own
 * rule, same club in the same season, by scripts/genTransferPathHints.mjs.
 * Round 460: the special rule entries are derived the same way on the
 * fallback pool after that rule's filter.
 * GENERATED: do not edit by hand, re-run the generator. The live table is
 * derived the same way from the live career tables and carries its own
 * hints, which differ where the pools differ.
 */
const transferPathPuzzles: TransferPathPuzzle[] = [
${body}
];

export default transferPathPuzzles;
`;
  fs.writeFileSync(path.join(ROOT, 'src/data/transferPathPuzzles.ts'), file);
  const fStats = MODE_RULES.map(rule => `${rule} ${kept.filter(p => p[rule]).length}`).join(', ');
  console.log(`rewrote src/data/transferPathPuzzles.ts: ${kept.length} fallback puzzles kept (with a path under ${fStats})${dropped.length ? `, dropped (no path on the fallback pool): ${dropped.join(', ')}` : ''}`);
}
