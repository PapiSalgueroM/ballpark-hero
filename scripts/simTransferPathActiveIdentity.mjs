/**
 * Transfer Path's active rule uses verified player identity, never a season
 * row that merely reaches 2026 and never a raw name shared by two people.
 *
 * The allowlist is derived from three committed, two-source evidence sets:
 * the 2026 World Cup squads, the verified 2026 transfer overlay, and the
 * 2026 stale-player sweep. World Cup and stale-sweep rows match on normalized
 * name plus nationality. The overlay has no nationality, so it may add an
 * identity only when that normalized name is unique in both the overlay and
 * the career pool.
 *
 * What this holds:
 *   1) the generated identity set equals a fresh derivation from those three
 *      sources, with 78 safe career identities;
 *   2) runtime eligibility ignores projected career seasons and refuses the
 *      Colombian Luis Suarez evidence for the Uruguayan Luis Suarez;
 *   3) the compact pull carries the same identities as runtime, and its active
 *      graph connects exactly 203 of the 885 retained puzzles;
 *   4) the staged companion keeps active hints null and the separate restore
 *      migration carries those same 203 derived active hints.
 *
 * Negative controls:
 *   TPAI_CONTROL=rawname adds the Uruguayan Luis Suarez key to a temporary
 *   allowlist copy.
 *   TPAI_CONTROL=directcollision removes the direct-evidence collision guard
 *   from a temporary derivation copy.
 *   TPAI_CONTROL=careernamecollision removes the unique career-name guard from
 *   a temporary derivation copy.
 *   TPAI_CONTROL=restoreguard removes one null precondition from the parsed
 *   restore migration.
 *   TPAI_CONTROL=appliedwrite plants a write to the applied companion.
 *   TPAI_CONTROL=restorerewrite removes the restore's write-once branch.
 *
 * Run: node scripts/simTransferPathActiveIdentity.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildGraph, deriveHint, expandCompactCareers, parseActiveRestoreMigration, ruleProblems } from './lib/transferPathHints.mjs';
import { deriveVerifiedActiveIdentities } from './lib/transferPathActiveIdentities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src').replaceAll('\\', '/');
const CONTROL = process.env.TPAI_CONTROL || '';
if (CONTROL && !['rawname', 'directcollision', 'careernamecollision', 'restoreguard', 'appliedwrite', 'restorerewrite'].includes(CONTROL)) {
  console.error(`TPAI_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const findings = [];
const fail = message => {
  failures += 1;
  findings.push(message);
  if (failures <= 25) console.error(`  FAIL: ${message}`);
};
const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');

const tmp = os.tmpdir();
let deriveForChecks = deriveVerifiedActiveIdentities;
if (CONTROL === 'directcollision' || CONTROL === 'careernamecollision') {
  const helperSource = read(path.join(ROOT, 'scripts/lib/transferPathActiveIdentities.mjs'));
  const needle = CONTROL === 'directcollision'
    ? '    const directSources = directByName.get(name)?.size === 1 ? direct.get(key) : undefined;'
    : '    if (careerNameCounts.get(name) !== 1 || candidateNameCounts.get(name) !== 1) continue;';
  if (!helperSource.includes(needle)) {
    console.error('control cannot run: the selected collision guard is not in the expected shape');
    process.exit(1);
  }
  const replacement = CONTROL === 'directcollision'
    ? '    const directSources = direct.get(key);'
    : '    // negative control removes the unique career-name guard';
  const changed = helperSource.replace(needle, replacement);
  if (changed === helperSource) {
    console.error('control cannot run: removing the selected collision guard changed nothing');
    process.exit(1);
  }
  const helperPath = path.join(tmp, 'transferPathActiveIdentities.control.mjs');
  fs.writeFileSync(helperPath, changed);
  deriveForChecks = (await import(pathToFileURL(helperPath).href + `?v=${Date.now()}`)).deriveVerifiedActiveIdentities;
  console.log(CONTROL === 'directcollision'
    ? 'NEGATIVE CONTROL ON: conflicting direct evidence may activate one normalized raw name'
    : 'NEGATIVE CONTROL ON: a directly evidenced identity may share one normalized raw name across two career records');
}
let modesPath = `${SRC}/lib/transferPathModes.ts`;
let identitiesPath = `${SRC}/data/transferPathVerifiedActive.ts`;
if (CONTROL === 'rawname') {
  const identitySource = read(path.join(ROOT, 'src/data/transferPathVerifiedActive.ts'));
  const needle = "  'lionel messi|argentina',";
  if (!identitySource.includes(needle)) {
    console.error('control cannot run: the verified identity file has no Lionel Messi row to extend');
    process.exit(1);
  }
  const changed = identitySource.replace(needle, `${needle}\n  'luis suarez|uruguay',`);
  if (changed === identitySource) {
    console.error('control cannot run: adding the raw-name collision changed nothing');
    process.exit(1);
  }
  identitiesPath = path.join(tmp, 'transferPathVerifiedActive.control.ts').replaceAll('\\', '/');
  fs.writeFileSync(identitiesPath, changed);

  const modeSource = read(path.join(ROOT, 'src/lib/transferPathModes.ts'));
  const importNeedle = "from '@/data/transferPathVerifiedActive';";
  if (!modeSource.includes(importNeedle)) {
    console.error('control cannot run: transferPathModes.ts no longer imports the generated identity file in the expected shape');
    process.exit(1);
  }
  const modeChanged = modeSource.replace(importNeedle, `from '${identitiesPath}';`);
  modesPath = path.join(tmp, 'transferPathModes.control.ts').replaceAll('\\', '/');
  fs.writeFileSync(modesPath, modeChanged);
  console.log('NEGATIVE CONTROL ON: a Colombian raw-name match is allowed to activate the Uruguayan Luis Suarez');
}

const entry = path.join(tmp, 'tpai-entry.mjs');
const bundle = path.join(tmp, 'tpai-bundle.mjs');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
fs.writeFileSync(entry, [
  `export { isActivePlayer, playersUnderRule } from '${modesPath}';`,
  `export { transferPathIdentityKey } from '${SRC}/lib/transferPathIdentity.ts';`,
  `export { VERIFIED_ACTIVE_IDENTITY_KEYS } from '${identitiesPath}';`,
  `export { careerPlayers as fallbackPlayers } from '${SRC}/data/careerPlayers.ts';`,
  `export { TRANSFER_OVERLAY_2026 as overlay } from '${SRC}/../scripts/transferOverlay2026.mjs';`,
].join('\n'));
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const site = await import(pathToFileURL(bundle).href + `?v=${Date.now()}`);

const unquote = value => value.replace(/''/g, "'");
const worldCupRows = [];
const worldCupSql = read(path.join(ROOT, 'supabase/migrations/20260901_round_389_world_cup_2026_squads.sql'));
for (const match of worldCupSql.matchAll(/^\('((?:[^']|'')*)','((?:[^']|'')*)',/gm)) {
  worldCupRows.push({ name: unquote(match[1]), nationality: unquote(match[2]) });
}
const staleRows = JSON.parse(read(path.join(ROOT, 'scripts/data/staleSweep2026.json'))).active;
const pullNameUniverse = read(path.join(ROOT, 'scripts/data/transferPathPull/careers.txt')).split('\n').filter(Boolean).map(line => line.slice(0, line.indexOf('|')));

function counted(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

const fallbackByName = counted(site.fallbackPlayers.map(player => site.transferPathIdentityKey(player.name, '').split('|')[0]));
const pullByName = counted(pullNameUniverse.map(name => site.transferPathIdentityKey(name, '').split('|')[0]));
const overlayByName = counted(site.overlay.map(player => site.transferPathIdentityKey(player.name, '').split('|')[0]));
const directEvidence = new Set([
  ...worldCupRows.map(player => site.transferPathIdentityKey(player.name, player.nationality)),
  ...staleRows.map(player => site.transferPathIdentityKey(player.name, player.nationality)),
]);
const directEvidenceNames = new Set([...directEvidence].map(key => key.split('|')[0]));
const expected = new Set();
for (const player of site.fallbackPlayers) {
  const key = site.transferPathIdentityKey(player.name, player.nationality);
  const name = key.split('|')[0];
  const uniqueOverlayMatch = overlayByName.get(name) === 1
    && fallbackByName.get(name) === 1
    && pullByName.get(name) === 1
    && !directEvidenceNames.has(name);
  if (directEvidence.has(key) || uniqueOverlayMatch) expected.add(key);
}

console.log('1) generated identities against the three committed evidence sets');
{
  const generated = new Set(site.VERIFIED_ACTIVE_IDENTITY_KEYS);
  for (const key of expected) if (!generated.has(key)) fail(`verified evidence identity is missing from the generated set: ${key}`);
  for (const key of generated) if (!expected.has(key)) fail(`generated active identity has no safe evidence match: ${key}`);
  if (expected.size !== 78) fail(`fresh evidence derivation found ${expected.size} safe identities, expected 78`);
  if (generated.size !== 78) fail(`generated file carries ${generated.size} identities, expected 78`);
  console.log(`   ${worldCupRows.length} World Cup rows, ${site.overlay.length} transfer rows, ${staleRows.length} stale-sweep rows, ${generated.size} safe career identities`);
}

console.log('2) runtime uses the whole identity and ignores career season projections');
{
  const messi = { name: 'Lionel Messi', nationality: 'Argentina', career: [{ club: 'Test', season: '2024-2025' }] };
  const uruguayLuis = { name: 'Luis Suárez', nationality: 'Uruguay', career: [{ club: 'Test', season: '2025-2026' }] };
  const invented = { name: 'Made Up Active Player', nationality: 'Argentina', career: [{ club: 'Test', season: '2025-2026' }] };
  if (!site.isActivePlayer(messi)) fail('Lionel Messi is verified active but runtime rejects him without a projected 2025-2026 career row');
  if (site.isActivePlayer(uruguayLuis)) fail('Luis Suárez of Uruguay is activated by evidence for Luis Suárez of Colombia');
  if (site.isActivePlayer(invented)) fail('an unverified identity becomes active solely from a projected 2025-2026 career row');
  const rawNameCollision = deriveForChecks({
    careerPlayers: [{ name: 'Luis Suárez', nationality: 'Uruguay' }],
    worldCupRows: [{ name: 'Luis Suárez', nationality: 'Colombia' }],
    staleRows: [],
    overlayRows: [{ name: 'Luis Suárez' }],
    identityKey: site.transferPathIdentityKey,
  });
  if (rawNameCollision.length !== 0) fail('the generator assigns a raw Luis Suarez overlay row across conflicting nationality evidence');
  const duplicateCareerName = deriveForChecks({
    careerPlayers: [{ name: 'Adriano', nationality: 'Brazil' }, { name: 'Adriano', nationality: 'Portugal' }],
    worldCupRows: [],
    staleRows: [],
    overlayRows: [{ name: 'Adriano' }],
    identityKey: site.transferPathIdentityKey,
  });
  if (duplicateCareerName.length !== 0) fail('the generator assigns one raw Adriano overlay row to ambiguous career identities');
  const duplicateDirectName = deriveForChecks({
    careerPlayers: [{ name: 'Alex Smith', nationality: 'England' }],
    worldCupRows: [{ name: 'Alex Smith', nationality: 'England' }],
    staleRows: [{ name: 'Alex Smith', nationality: 'Scotland' }],
    overlayRows: [],
    identityKey: site.transferPathIdentityKey,
  });
  if (duplicateDirectName.length !== 0) fail('the generator admits two directly evidenced identities that share one normalized raw name');
  const duplicateDirectCareerName = deriveForChecks({
    careerPlayers: [{ name: 'Alex Smith', nationality: 'England' }, { name: 'Alex Smith', nationality: 'Scotland' }],
    worldCupRows: [{ name: 'Alex Smith', nationality: 'England' }],
    staleRows: [],
    overlayRows: [],
    identityKey: site.transferPathIdentityKey,
  });
  if (duplicateDirectCareerName.length !== 0) fail('the generator admits a directly evidenced identity whose normalized raw name has two career records');
  console.log(`   verified Messi ${site.isActivePlayer(messi) ? 'accepted' : 'rejected'}, Uruguayan Luis Suarez ${site.isActivePlayer(uruguayLuis) ? 'accepted' : 'refused'}, invented season row ${site.isActivePlayer(invented) ? 'accepted' : 'refused'}`);
}

const pullDir = path.join(ROOT, 'scripts/data/transferPathPull');
const players = expandCompactCareers(read(path.join(pullDir, 'careers.txt')));
const pairs = new Map(read(path.join(pullDir, 'puzzles.txt')).split('\n').filter(Boolean).map(line => {
  const [id, a, b] = line.split('|');
  return [id, { a, b }];
}));
const activePlayers = site.playersUnderRule(players, 'active');
const graph = buildGraph(activePlayers);
let eligible = 0;
for (const { a, b } of pairs.values()) if (deriveHint(graph, a, b)) eligible += 1;

console.log('3) compact pull and active graph use the same identity rule');
{
  const pullKeys = new Set(activePlayers.map(player => site.transferPathIdentityKey(player.name, player.nationality)));
  for (const key of expected) if (!pullKeys.has(key)) fail(`verified identity is missing or has no nationality in careers.txt: ${key}`);
  for (const key of pullKeys) if (!expected.has(key)) fail(`careers.txt activates an identity outside the evidence set: ${key}`);
  if (activePlayers.length !== 78) fail(`the pull activates ${activePlayers.length} players, expected 78`);
  if (pairs.size !== 885) fail(`the retained pull carries ${pairs.size} puzzles, expected 885`);
  if (eligible !== 203) fail(`the verified active graph connects ${eligible} puzzles, expected 203`);
  console.log(`   ${activePlayers.length} of ${players.length} pull players verified active, ${eligible} of ${pairs.size} puzzles have a path`);
}

function parseSqlTuple(line) {
  const text = line.trim().replace(/^\(/, '').replace(/\),?$/, '');
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'") {
      current += ch;
      if (quoted && text[i + 1] === "'") { current += text[++i]; continue; }
      quoted = !quoted;
      continue;
    }
    if (ch === ',' && !quoted) { cells.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}
function sqlText(cell) {
  if (!cell.startsWith("'") || !cell.endsWith("'")) return null;
  return unquote(cell.slice(1, -1));
}
const companionSql = read(path.join(ROOT, 'supabase/migrations/20260907173202_quarantine_unreachable_transfer_path_puzzles_and_refresh_hints.sql'));
const desiredStart = companionSql.indexOf('  for desired in');
const desiredEnd = companionSql.indexOf('\n    ) as rows(\n      puzzle_id, player_a, player_b', desiredStart);
if (desiredStart < 0 || desiredEnd < 0) {
  console.error('the pending companion migration no longer has its desired VALUES block');
  process.exit(1);
}
const companionRows = new Map();
for (const line of companionSql.slice(desiredStart, desiredEnd).split('\n')) {
  if (!/^\s*\('/.test(line)) continue;
  const cells = parseSqlTuple(line);
  if (cells.length !== 9) { fail(`companion tuple has ${cells.length} cells, expected 9: ${line.slice(0, 80)}`); continue; }
  const id = sqlText(cells[0]);
  const active = cells[5] === 'null::smallint' ? null : { minSteps: Number(cells[5]), hint: sqlText(cells[6]) };
  companionRows.set(id, active);
}

let restoreSql = read(path.join(ROOT, 'supabase/migrations/20260907190000_restore_verified_active_transfer_path_hints.sql'));
if (CONTROL === 'restoreguard') {
  const needle = '      and p.active_hint is null;';
  if ((restoreSql.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length !== 2) {
    console.error('control cannot run: the restore does not have two active-hint null preconditions');
    process.exit(1);
  }
  const changed = restoreSql.replace(needle, '      and true;');
  if (changed === restoreSql) {
    console.error('control cannot run: removing a restore null precondition changed nothing');
    process.exit(1);
  }
  restoreSql = changed;
  console.log('NEGATIVE CONTROL ON: one exact null precondition is missing from the active restore');
}
const restoreRows = parseActiveRestoreMigration(restoreSql);

function checkRestoreGuards(sql) {
  const code = sql.replace(/^\s*--.*$/gm, '');
  const count = needle => code.split(needle).length - 1;
  if ((code.match(/^begin;$/gm) ?? []).length !== 1 || (code.match(/^commit;$/gm) ?? []).length !== 1) fail('restore guard: the migration is not enclosed by one explicit transaction');
  if (!/select count\(\*\) into matching_rows from public\.transfer_path_puzzles;\s*if matching_rows <> 885 then/.test(code)) fail('restore guard: the retained-table precondition is not exactly 885 rows');
  const preflight = code.match(/select count\(\*\) into matching_rows\s*from public\.transfer_path_puzzles p\s*where p\.puzzle_id = desired\.puzzle_id[\s\S]*?;/)?.[0] ?? '';
  const update = code.match(/update public\.transfer_path_puzzles p\s*set[\s\S]*?;/)?.[0] ?? '';
  for (const predicate of [
    'p.puzzle_id = desired.puzzle_id',
    'p.player_a = desired.player_a',
    'p.player_b = desired.player_b',
    'p.active_min_steps is null',
    'p.active_hint is null',
  ]) {
    if (!preflight.includes(predicate) || !update.includes(predicate)) fail(`restore guard: exact tuple and null predicate "${predicate}" must protect both the preflight and update`);
  }
  if (count('if matching_rows <> 1 then') !== 1) fail('restore guard: each desired tuple is not required to match exactly once');
  if (!code.includes('get diagnostics updated_this_row = row_count;') || !code.includes('updated_rows := updated_rows + updated_this_row;')) fail('restore guard: updated rows are not counted from database row_count');
  if (!code.includes('if updated_rows <> 203 then')) fail('restore guard: the update count is not fixed at 203');
  if (!/where p\.active_min_steps is not null and p\.active_hint is not null;\s*if matching_rows <> 203 then/.test(code)) fail('restore guard: the final complete active-pair count is not fixed at 203');
  if (!/where \(p\.active_min_steps is null\) <> \(p\.active_hint is null\)/.test(code)) fail('restore guard: partial active pairs are not rejected');
  const assignments = [...update.matchAll(/\b(active_[a-z_]+)\s*=/g)].map(match => match[1]);
  if (assignments.join(',') !== 'active_min_steps,active_hint') fail('restore guard: the restore update must set only the two active fields');
}
checkRestoreGuards(restoreSql);

console.log('4) staged companion and separate restore preserve the rollout order');
{
  let generatorCode = read(path.join(ROOT, 'scripts/genTransferPathHints.mjs'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  if (CONTROL === 'appliedwrite') {
    const needle = "const COMPANION_OUT = path.join(ROOT, 'supabase/migrations/20260907173202_quarantine_unreachable_transfer_path_puzzles_and_refresh_hints.sql');";
    if (!generatorCode.includes(needle)) { console.error('control cannot run: the applied companion path is not in the expected shape'); process.exit(1); }
    const changed = generatorCode.replace(needle, `${needle}\nfs.writeFileSync(COMPANION_OUT, 'unsafe');`);
    if (changed === generatorCode) { console.error('control cannot run: planting an applied migration write changed nothing'); process.exit(1); }
    generatorCode = changed;
    console.log('   NEGATIVE CONTROL ON: the generator writes to the already applied companion');
  }
  if (CONTROL === 'restorerewrite') {
    const needle = 'if (fs.existsSync(ACTIVE_RESTORE_OUT)) {';
    if (!generatorCode.includes(needle)) { console.error('control cannot run: the restore write-once branch is not in the expected shape'); process.exit(1); }
    const changed = generatorCode.replace(needle, 'if (false) {');
    if (changed === generatorCode) { console.error('control cannot run: removing the restore write-once branch changed nothing'); process.exit(1); }
    generatorCode = changed;
    console.log('   NEGATIVE CONTROL ON: the generator can rewrite an existing active restore migration');
  }
  if (/fs\.writeFileSync\((?:OUT|MODE_OUT|COMPANION_OUT)\b/.test(generatorCode)) fail('the generator still rewrites an already applied Transfer Path migration');
  if (!/if \(fs\.existsSync\(ACTIVE_RESTORE_OUT\)\)[\s\S]*?existing !== restore[\s\S]*?create a new dated migration[\s\S]*?else \{\s*fs\.writeFileSync\(ACTIVE_RESTORE_OUT/.test(generatorCode)) fail('the active restore generator is not write-once with an identical-content check');
  let derivedEligible = 0;
  let companionEligible = 0;
  for (const [id, { a, b }] of pairs) {
    const derived = deriveHint(graph, a, b);
    const companion = companionRows.get(id) ?? null;
    const restore = restoreRows.get(id) ?? null;
    const stored = restore ? { minSteps: restore.minSteps, hint: restore.hint } : null;
    for (const problem of ruleProblems(graph, a, b, stored)) fail(`active restore ${id}: ${problem}`);
    if (derived) derivedEligible += 1;
    if (companion) companionEligible += 1;
    if (companion) fail(`applied companion ${id} restores an active hint before the identity frontend is live`);
    if ((derived === null) !== (restore === null) || (derived && (derived.minSteps !== restore.minSteps || derived.hint !== restore.hint))) {
      fail(`separate active restore ${id} differs from current verified graph truth`);
    }
    if (restore && (restore.a !== a || restore.b !== b)) fail(`separate active restore ${id} names ${restore.a} to ${restore.b}, expected ${a} to ${b}`);
  }
  for (const id of restoreRows.keys()) if (!pairs.has(id)) fail(`separate active restore carries unknown puzzle ${id}`);
  if (companionRows.size !== pairs.size) fail(`pending companion carries ${companionRows.size} rows for ${pairs.size} puzzles`);
  if (restoreRows.size !== 203) fail(`separate active restore carries ${restoreRows.size} rows, expected 203`);
  if (derivedEligible !== 203) fail(`current verified graph connects ${derivedEligible} active paths, expected 203`);
  if (companionEligible !== 0) fail(`pending companion carries ${companionEligible} active paths, expected zero until the frontend is live`);
  console.log(`   applied companion ${companionEligible} active paths, separate restore ${restoreRows.size}, current verified graph ${derivedEligible}`);
}

console.log('');
if (CONTROL) {
  const caught = CONTROL === 'directcollision'
    ? findings.some(message => /two directly evidenced identities/.test(message))
    : CONTROL === 'careernamecollision'
      ? findings.some(message => /normalized raw name has two career records/.test(message))
    : CONTROL === 'appliedwrite'
      ? findings.some(message => /generator still rewrites an already applied/.test(message))
    : CONTROL === 'restorerewrite'
      ? findings.some(message => /active restore generator is not write-once/.test(message))
    : CONTROL === 'restoreguard'
      ? findings.some(message => /restore guard: exact tuple and null predicate/.test(message))
      : findings.some(message => /Luis Suárez of Uruguay|luis suarez\|uruguay|connects \d+ puzzles/.test(message));
  if (failures > 0 && caught) {
    console.log(`simTransferPathActiveIdentity control (${CONTROL}): green. The planted defect was reported (${failures} findings).`);
    process.exit(0);
  }
  console.error(`simTransferPathActiveIdentity control (${CONTROL}): RED. ${failures ? 'Findings came, but not the planted defect.' : 'The planted defect went unreported.'}`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simTransferPathActiveIdentity: ${failures} failures`);
  process.exit(1);
}
console.log('simTransferPathActiveIdentity: green. Active mode is identity-verified, namesake-safe, and staged consistently across runtime and migrations.');
