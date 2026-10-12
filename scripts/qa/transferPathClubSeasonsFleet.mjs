/* Remote-only continuation proof for the frozen Transfer Path candidate.
   Compare every retained puzzle and the fallback with an independent graph,
   including shortened paths with middle players. Controls compile changed
   copies of the actual helper; the candidate checkout is never edited. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildGraph, deriveHint, distances, hintProblems, sharedClub } from '../lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANDIDATE = path.resolve(process.env.TRANSFER_PATH_CANDIDATE_ROOT || '');
const OUT = path.resolve(process.env.TRANSFER_PATH_PROOF_OUT || path.join(ROOT, '.tmp-fx/transfer-path-continuation'));
const FROZEN = '2dfee3048450e2dd61479473c7a1f48861b7512b';
const RULES = ['classic', 'active', 'europe'];
const HELPER = 'src/lib/transferPathClubSeasons.ts';
const INPUTS = [
  'package.json', 'package-lock.json', 'src/data/careerPlayers.ts',
  'src/data/transferPathClubSeasons.ts', 'src/data/transferPathPuzzles.ts',
  HELPER, 'src/lib/transferPathGraph.ts', 'src/lib/transferPathModes.ts',
  'src/lib/transferPathIdentity.ts', 'src/data/transferPathVerifiedActive.ts',
  'scripts/data/transferPathPull/puzzles.txt',
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', ['-C', CANDIDATE, ...args], { encoding: 'utf8' }).trim();
const read = relative => fs.readFileSync(path.join(CANDIDATE, relative));
const entryOf = (p, rule) => rule === 'classic' ? p : p[rule] ?? null;
const identity = p => [p.name, p.nationality].map(s => String(s).normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ')).join('|');

const receipt = { candidateCommit: FROZEN, status: 'pending', sourceHashes: {}, fleets: [], changed: [], controls: [], selected: [] };
let temporary;

async function compile(helperPath, label) {
  const source = relative => JSON.stringify(path.join(CANDIDATE, relative).replaceAll('\\', '/'));
  const output = path.join(temporary, `${label}.mjs`);
  await build({
    stdin: { contents: [
      `export { careerPlayers } from ${source('src/data/careerPlayers.ts')};`,
      `export { default as fallbackPuzzles } from ${source('src/data/transferPathPuzzles.ts')};`,
      `export { VERIFIED_TRANSFER_PATH_CLUB_SEASONS as memberships } from ${source('src/data/transferPathClubSeasons.ts')};`,
      `export { playersUnderRule, isEuropeanClub } from ${source('src/lib/transferPathModes.ts')};`,
      `export { refreshTransferPathPuzzles, verifiedClubSeasonsOf } from ${JSON.stringify(helperPath.replaceAll('\\', '/'))};`,
    ].join('\n'), resolveDir: CANDIDATE, loader: 'ts' },
    outfile: output, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    alias: { '@': path.join(CANDIDATE, 'src') },
  });
  return import(pathToFileURL(output).href);
}

// This merge deliberately does not call the candidate's transferPathSpells.
function independentlySupplement(players, memberships, rule, isEuropeanClub) {
  return players.map(p => ({ ...p, career: [
    ...p.career,
    ...memberships.filter(m => identity(m) === identity(p)
      && (rule !== 'europe' || isEuropeanClub(m.club))
      && !p.career.some(s => s.club === m.club && s.season === m.season))
      .map(m => ({ club: m.club, season: m.season })),
  ] }));
}

function baselinePuzzle(pair, graphs) {
  const entries = Object.fromEntries(RULES.map(rule => {
    const d = deriveHint(graphs[rule].before, pair.playerA, pair.playerB);
    return [rule, d ? { minSteps: d.minSteps, hint: d.hint, oneOptimalPath: d.path } : null];
  }));
  assert(entries.classic, `${pair.id}: no original classic route`);
  return { id: pair.id, playerA: pair.playerA, playerB: pair.playerB, ...entries.classic, active: entries.active, europe: entries.europe };
}

function inspect(fleet, refreshed, graphs, label) {
  const failures = [];
  const changed = [];
  const check = (ok, id, rule, issue) => { if (!ok) failures.push({ id, rule, issue }); };
  check(refreshed.length === fleet.length, label, 'all', 'pool length changed');
  for (let i = 0; i < fleet.length; i += 1) {
    const old = fleet[i], actual = refreshed[i];
    if (!actual) { check(false, old.id, 'all', 'puzzle missing'); continue; }
    check(actual.id === old.id && actual.playerA === old.playerA && actual.playerB === old.playerB, old.id, 'all', 'order or identity changed');
    let anyChange = false;
    for (const rule of RULES) {
      const { before, after } = graphs[rule];
      const oldTruth = deriveHint(before, old.playerA, old.playerB);
      const truth = deriveHint(after, old.playerA, old.playerB);
      const previous = entryOf(old, rule), entry = entryOf(actual, rule);
      const changes = !!truth && oldTruth?.minSteps !== truth.minSteps;
      anyChange ||= changes;
      if (!changes) {
        check(rule === 'classic'
          ? actual.minSteps === old.minSteps && actual.hint === old.hint && actual.oneOptimalPath === old.oneOptimalPath
          : entry === previous, old.id, rule, 'unchanged metadata or reference changed');
      }
      if (!truth) { check(entry === null, old.id, rule, 'unreachable rule gained metadata'); continue; }
      check(!!entry, old.id, rule, 'reachable rule missing metadata');
      if (!entry) continue;
      check(entry.minSteps === truth.minSteps, old.id, rule, `minimum ${entry.minSteps}, expected ${truth.minSteps}`);
      for (const issue of hintProblems(after, old.playerA, old.playerB, entry.minSteps, entry.hint)) check(false, old.id, rule, issue);
      const optimal = entry.oneOptimalPath;
      check(Array.isArray(optimal), old.id, rule, 'optimal path missing');
      if (Array.isArray(optimal)) {
        check(optimal[0] === old.playerA && optimal.at(-1) === old.playerB && optimal.length - 1 === truth.minSteps
          && new Set(optimal).size === optimal.length, old.id, rule, 'optimal path endpoints, length or uniqueness wrong');
        for (let j = 1; j < optimal.length; j += 1) check(sharedClub(after, optimal[j - 1], optimal[j]) !== null, old.id, rule, `illegal optimal link ${optimal[j - 1]} to ${optimal[j]}`);
      }
      if (changes) changed.push({ id: old.id, rule, playerA: old.playerA, playerB: old.playerB, oldMinSteps: oldTruth?.minSteps ?? null,
        newMinSteps: truth.minSteps, middlePlayers: truth.minSteps - 1, path: truth.path,
        clubs: truth.path.slice(1).map((p, j) => sharedClub(after, truth.path[j], p)) });
    }
    check(anyChange || actual === old, old.id, 'all', 'unchanged puzzle reference changed');
  }
  return { failures, changed };
}

function selectMiddle(rule, fleets, graphs) {
  const candidates = fleets.flatMap(({ name, puzzles, changed }) => changed.filter(c => c.rule === rule
    && c.oldMinSteps !== null && c.newMinSteps < c.oldMinSteps && c.middlePlayers >= 1)
    .map(c => ({ ...c, puzzle: puzzles.find(p => p.id === c.id), selectionScope: name })));
  candidates.sort((a, b) => Number(b.newMinSteps >= 3) - Number(a.newMinSteps >= 3) || a.id.localeCompare(b.id));
  if (candidates.length) return candidates[0];

  // A retained pool can omit a shape. Enumerate recorded identities explicitly
  // instead of silently dropping shortened-middle coverage or making up spells.
  const { before, after } = graphs[rule];
  for (const a of before.names) {
    const oldDistances = distances(before, a), newDistances = distances(after, a);
    for (const b of before.names) {
      const oldMin = oldDistances.get(b), newMin = newDistances.get(b);
      if (oldMin === undefined || newMin === undefined || newMin < 2 || newMin >= oldMin) continue;
      const d = deriveHint(after, a, b);
      const puzzle = baselinePuzzle({ id: `proof-${rule}-shortened-middle`, playerA: a, playerB: b }, graphs);
      return { rule, puzzle, oldMinSteps: oldMin, newMinSteps: newMin, path: d.path,
        clubs: d.path.slice(1).map((p, j) => sharedClub(after, d.path[j], p)), selectionScope: 'full-pool',
        selectionReason: 'No retained or fallback puzzle shortened through a middle player; selected from all recorded pool identities.' };
    }
  }
  throw new Error(`${rule}: no recorded shortened-middle pair exists`);
}

try {
  assert(process.env.CI, 'Transfer Path fleet proof runs remotely only');
  assert(process.env.TRANSFER_PATH_CANDIDATE_ROOT, 'Set TRANSFER_PATH_CANDIDATE_ROOT to the remote frozen checkout');
  assert.equal(git(['rev-parse', 'HEAD']), FROZEN, 'candidate is not the exact accepted source');
  for (const relative of INPUTS) {
    const bytes = read(relative);
    const frozen = execFileSync('git', ['-C', CANDIDATE, 'show', `${FROZEN}:${relative}`]);
    assert.equal(sha(bytes), sha(frozen), `${relative}: working bytes differ from frozen source`);
    receipt.sourceHashes[relative] = sha(bytes);
  }
  receipt.careerPlayersSha256 = receipt.sourceHashes['src/data/careerPlayers.ts'];
  receipt.independentOracleSha256 = sha(fs.readFileSync(path.join(ROOT, 'scripts/lib/transferPathHints.mjs')));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-fleet-'));
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const site = await compile(path.join(CANDIDATE, HELPER), 'candidate');
  const playersBefore = JSON.stringify(site.careerPlayers);
  const graphs = Object.fromEntries(RULES.map(rule => {
    const pool = site.playersUnderRule(site.careerPlayers, rule);
    const afterPlayers = independentlySupplement(pool, site.memberships, rule, site.isEuropeanClub);
    const before = buildGraph(pool), after = buildGraph(afterPlayers);
    const actual = site.verifiedClubSeasonsOf(pool, rule);
    assert.deepEqual([...actual.keys()].sort(), after.names, `${rule}: candidate identity set differs`);
    for (const [name, keys] of actual) for (const bucket of ['exact', 'calendar', 'span']) {
      assert.deepEqual([...keys[bucket]].sort(), [...after.keys.get(name)[bucket]].sort(), `${rule}: ${name} ${bucket} membership differs`);
    }
    return [rule, { before, after }];
  }));
  const pairs = read('scripts/data/transferPathPull/puzzles.txt').toString('utf8').trim().split(/\r?\n/).map(line => {
    const [id, playerA, playerB] = line.split('|');
    assert(id && playerA && playerB, 'retained puzzle row is incomplete');
    return { id, playerA, playerB };
  });
  assert.equal(pairs.length, 885, 'all 885 retained puzzles must run');
  assert.equal(new Set(pairs.map(p => p.id)).size, pairs.length, 'retained puzzle ids repeat');
  const fleets = [
    { name: 'retained-885', metadataSource: 'independent original graph; committed retained ids and endpoints', puzzles: pairs.map(p => baselinePuzzle(p, graphs)) },
    { name: 'fallback', metadataSource: 'actual committed fallback metadata', puzzles: site.fallbackPuzzles },
  ];
  assert(fleets[1].puzzles.length > 0, 'fallback coverage is empty');
  for (const fleet of fleets) {
    for (const puzzle of fleet.puzzles) for (const rule of RULES) {
      const entry = entryOf(puzzle, rule);
      const truth = deriveHint(graphs[rule].before, puzzle.playerA, puzzle.playerB);
      assert.equal(!!entry, !!truth, `${fleet.name}/${puzzle.id}/${rule}: baseline reachability differs`);
      if (entry) assert.deepEqual(hintProblems(graphs[rule].before, puzzle.playerA, puzzle.playerB, entry.minSteps, entry.hint), [], 'original metadata is not independently valid');
    }
    const inputBefore = JSON.stringify(fleet.puzzles);
    const result = inspect(fleet.puzzles, site.refreshTransferPathPuzzles(fleet.puzzles, site.careerPlayers), graphs, fleet.name);
    assert.deepEqual(result.failures, [], `${fleet.name}: candidate metadata differs from independent truth`);
    assert.equal(JSON.stringify(fleet.puzzles), inputBefore, 'candidate mutated the supplied puzzle pool');
    fleet.changed = result.changed;
    receipt.fleets.push({ name: fleet.name, metadataSource: fleet.metadataSource, puzzles: fleet.puzzles.length, ruleEntries: fleet.puzzles.length * RULES.length,
      changed: result.changed.length, shortenedMiddle: result.changed.filter(c => c.oldMinSteps !== null && c.newMinSteps < c.oldMinSteps && c.middlePlayers >= 1).length });
    receipt.changed.push(...result.changed.map(c => ({ fleet: fleet.name, ...c })));
    console.log(`FLEET ${fleet.name}: ${fleet.puzzles.length} puzzles, ${result.changed.length} changed rule entries, ${receipt.fleets.at(-1).shortenedMiddle} shortened middle paths`);
  }
  assert(receipt.changed.length > 0, 'membership changed no puzzle metadata, controls would be vacuous');
  receipt.selected = ['classic', 'europe'].map(rule => selectMiddle(rule, fleets, graphs));
  for (const selected of receipt.selected) {
    const checked = inspect([selected.puzzle], site.refreshTransferPathPuzzles([selected.puzzle], site.careerPlayers), graphs, selected.selectionScope);
    assert.deepEqual(checked.failures, [], 'selected browser pair does not pass actual helper');
    assert(checked.changed.some(c => c.rule === selected.rule && c.newMinSteps === selected.newMinSteps), 'selected middle-pair refresh was not exercised');
    console.log(`MIDDLE ${selected.rule}: ${selected.puzzle.id} ${selected.oldMinSteps} -> ${selected.newMinSteps}, ${selected.path.join(' -> ')}`);
  }

  const helper = read(HELPER).toString('utf8').replaceAll('\r\n', '\n');
  for (const [name, needle, replacement] of [
    ['no-refresh', '  return puzzles.map(puzzle => {', '  return puzzles;\n  return puzzles.map(puzzle => {'],
    ['wrong-minimum', 'return { minSteps: steps, hint, oneOptimalPath: path };', 'return { minSteps: steps + 1, hint, oneOptimalPath: path };'],
  ]) {
    assert.equal(helper.split(needle).length - 1, 1, `${name}: actual helper anchor must occur exactly once`);
    const patched = helper.replace(needle, replacement);
    assert.notEqual(patched, helper, `${name}: control changed nothing`);
    const copy = path.join(temporary, `${name}.ts`);
    fs.writeFileSync(copy, patched);
    const faulty = await compile(copy, name);
    const controlFleets = [...fleets, { name: 'selected-middle', puzzles: receipt.selected.map(s => s.puzzle) }];
    const failures = controlFleets.flatMap(fleet => inspect(fleet.puzzles, faulty.refreshTransferPathPuzzles(fleet.puzzles, site.careerPlayers), graphs, fleet.name).failures);
    for (const selected of receipt.selected) assert(failures.some(f => f.id === selected.puzzle.id
      && f.rule === selected.rule && f.issue.startsWith('minimum ')), `${name}: selected ${selected.rule} middle-pair minimum did not fail`);
    receipt.controls.push({ name, changedActualHelper: true, sourceSha256: sha(patched), failures: failures.length, examples: failures.slice(0, 6) });
    console.log(`CONTROL ${name}: actual helper changed, ${failures.length} independent findings`);
  }
  assert.equal(JSON.stringify(site.careerPlayers), playersBefore, 'candidate career statistics were mutated');
  for (const relative of INPUTS) assert.equal(sha(read(relative)), receipt.sourceHashes[relative], `${relative}: candidate bytes changed during proof`);
  receipt.players = site.careerPlayers.length;
  receipt.statisticsRows = site.careerPlayers.reduce((n, p) => n + p.career.length, 0);
  receipt.status = 'passed';
  console.log(`Transfer Path fleet: ${receipt.fleets.reduce((n, f) => n + f.ruleEntries, 0)} rule entries, two effective controls, ${receipt.statisticsRows} unchanged statistics rows`);
} catch (error) {
  receipt.status = 'failed';
  receipt.error = error.stack || String(error);
  process.exitCode = 1;
  console.error(receipt.error);
} finally {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'fleet.json'), JSON.stringify(receipt, null, 2) + '\n');
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
