/* Offline category outcomes and changed-copy controls. Run on the remote CI runner. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.env.PLAYER_BINGO_CATEGORIES_PHASE || 'fixed';
assert.ok(['baseline', 'fixed'].includes(phase));
const base = 'b20ec6664df9d4c58d63ea0596791d33b2a3b8fc';
const sourceFile = 'src/lib/playerBingo.ts';
const testFile = 'src/test/playerBingoCategories.test.ts';
const titles = [
  'preserves all 52 original fixed IDs and the board and support rules',
  'adds exactly 12 distinct fixed categories without replacing an old ID',
  'accepts both sides of full-back and winger while refusing other positions',
  'keeps middle value bands disjoint at every boundary and rejects unknown values',
  'fills the two middle age bands without borrowing younger or older players',
  'requires attacking combinations in one season and does not invent missing contributions',
  'checks appearance and scoring efficiency boundaries on a single known season',
  'requires known discipline and matches in the same season instead of treating null as zero',
  'groups related attacking appearance discipline and high-value alternatives',
  'deals supported varied boards with a distinct-player winning line in the first 60 reveals',
];
const files = [sourceFile, testFile, 'src/pages/PlayerBingo.tsx', 'src/lib/whoAmI.ts',
  'src/lib/playerSearch.ts', 'scripts/simPlayerBingoCategories.mjs', 'vitest.config.ts',
  'package.json', 'package-lock.json'];
const held = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const receipts = () => held.map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: hash(bytes) }));
const source = held[0][1].toString('utf8').replaceAll('\r\n', '\n');
assert.equal(hash(held[1][1]), '98BDF62464755465B7EEE93705DE4C854838A896341FDF7DE1693CB9A9560D4F', 'Frozen test-first suite');
const originalHash = 'B446D6FEBC197D9210A01624BD41F71A31CD65EFAD5FF566FDF64DB0EBF792AC';
const out = path.resolve(process.env.PLAYER_BINGO_CATEGORIES_OUT || path.join(root, '.sim-artifacts/player-bingo-categories'));
assert.ok(out.startsWith(root + path.sep));
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
await writeFile(path.join(out, 'actual-playerBingo.ts'), source);
let temp;
const results = [];

async function run(id, copy, expectedFailures) {
  const folder = path.join(out, id);
  await mkdir(folder, { recursive: true });
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (copy !== null) {
    const copiedFile = path.join(temp, id + '.ts');
    await writeFile(copiedFile, copy);
    await writeFile(path.join(folder, 'source-copy.ts'), copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/playerBingo': copiedFile });
  }
  const reportFile = path.join(folder, 'unit.json');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', testFile,
    '--reporter=default', '--reporter=json', '--outputFile.json=' + reportFile,
    '--maxWorkers=1', '--no-file-parallelism'], {
    cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = (child.stdout || '') + '\n' + (child.stderr || '');
  await writeFile(path.join(folder, 'output.log'), output);
  assert.ok(!child.error && !child.signal, 'Runner must complete');
  assert.doesNotMatch(output, /Unhandled (?:Errors?|Rejections?)|Uncaught Exception|Failed to (?:resolve import|load)|Cannot find (?:module|package)|SyntaxError|Transform failed|Test timed out|SIM_OFFLINE_BLOCK/i);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(report.testResults.length, 1);
  assert.equal(report.testResults[0].message || '', '');
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numPendingTests, 0);
  assert.equal(report.numTodoTests, 0);
  assert.equal(rows.length, titles.length);
  assert.equal(report.numTotalTests, titles.length);
  assert.deepEqual(rows.map(row => row.title).sort(), [...titles].sort());
  assert.equal(new Set(rows.map(row => row.title)).size, titles.length);
  assert.equal(child.status, expectedFailures.length ? 1 : 0);
  assert.equal(report.numFailedTests, expectedFailures.length);
  assert.equal(report.numPassedTests, titles.length - expectedFailures.length);
  assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.title).sort(), [...expectedFailures].sort());
  for (const row of rows) {
    const failed = expectedFailures.includes(row.title);
    assert.equal(row.status, failed ? 'failed' : 'passed', row.title);
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) assert.match(row.failureMessages[0], /AssertionError|expected/i);
    if (failed && (id === 'baseline' || id === 'original-control')) {
      assert.match(row.failureMessages[0], /new category|new category IDs/i, 'Original must fail on the missing feature');
    }
  }
  const result = { id, runnerExit: child.status, cases: rows.length, failed: expectedFailures,
    preserved: titles.length - expectedFailures.length, copySha256: copy === null ? null : hash(Buffer.from(copy)) };
  results.push(result);
  await writeFile(path.join(folder, 'verdict.json'), JSON.stringify(result, null, 2));
  console.log(id + ': ' + rows.length + ' cases, ' + expectedFailures.length + ' exact intended failures, ' + result.preserved + ' preservation passes.');
}

async function mutate(id, anchor, replacement, expectedFailures, count = 1) {
  const executable = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
  assert.equal(executable.split(anchor).length - 1, count, 'Control binds actual executable source');
  assert.equal(source.split(anchor).length - 1, count, 'Mutation count is exact');
  const changed = source.replaceAll(anchor, replacement);
  assert.notEqual(hash(Buffer.from(changed)), hash(Buffer.from(source)), 'Control changed source bytes');
  assert.equal(changed.split(replacement).length - 1, count, 'Replacement count is exact');
  const restored = changed.replaceAll(replacement, anchor);
  assert.equal(restored, source, 'Complete source reversal');
  await writeFile(path.join(out, 'control-' + id + '.json'), JSON.stringify({
    anchor, replacement, count, originalSha256: hash(Buffer.from(source)), changedSha256: hash(Buffer.from(changed)),
    restoredSha256: hash(Buffer.from(restored)),
  }, null, 2));
  await run('control-' + id, changed, expectedFailures);
  return restored;
}

try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  temp = await mkdtemp(path.join(root, '.sim-control/bingo-categories-'));
  if (phase === 'baseline') {
    assert.equal(hash(Buffer.from(source)), originalHash, 'Baseline product source is unchanged');
    await run('baseline', null, titles.slice(1));
  } else {
    const original = execFileSync('git', ['show', base + ':' + sourceFile], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
    assert.equal(hash(Buffer.from(original)), originalHash, 'Immutable original source');
    assert.notEqual(source, original, 'Fixed phase includes real product changes');
    await writeFile(path.join(out, 'original-playerBingo.ts'), original);
    await run('normal', null, []);
    await run('original-control', original, titles.slice(1));
    const predicates = [
      ['full-back', "test: p => ['left-back', 'right-back'].includes(normalizeName(p.position)),", titles[2]],
      ['winger', "test: p => ['left winger', 'right winger'].includes(normalizeName(p.position)),", titles[2]],
      ['value30', 'test: p => p.value >= 30_000_000 && p.value < 50_000_000,', titles[3]],
      ['value50', 'test: p => p.value >= 50_000_000 && p.value < 100_000_000,', titles[3]],
      ['age22', 'test: p => p.age >= 22 && p.age <= 25,', titles[4]],
      ['age26', 'test: p => p.age >= 26 && p.age <= 28,', titles[4]],
      ['double10', 'test: (p, d) => anySeasonMatches(d, p, s => (s.goals ?? 0) >= 10 && (s.assists ?? 0) >= 10),', titles[5]],
      ['contributions30', 'test: (p, d) => anySeasonMatches(d, p, s => (s.goals ?? 0) + (s.assists ?? 0) >= 30),', titles[5]],
      ['matches50', 'test: (p, d) => anySeasonMatches(d, p, s => (s.matches ?? 0) >= 50),', titles[6]],
      ['goals10under30', 'test: (p, d) => anySeasonMatches(d, p, s => (s.goals ?? 0) >= 10 && s.matches != null && s.matches > 0 && s.matches < 30),', titles[6]],
      ['matches40nored', 'test: (p, d) => anySeasonMatches(d, p, s => (s.matches ?? 0) >= 40 && s.redCards === 0),', titles[7]],
      ['yellows10red', 'test: (p, d) => anySeasonMatches(d, p, s => (s.yellowCards ?? 0) >= 10 && (s.redCards ?? 0) >= 1),', titles[7]],
    ];
    let restored = source;
    for (const [id, anchor, title] of predicates) {
      restored = await mutate(id, anchor, 'test: () => true /* category-control-' + id + ' */,', [title]);
    }
    restored = await mutate('same-season', predicates[6][1],
      'test: (p, d) => anySeasonMatches(d, p, s => (s.goals ?? 0) >= 10) && anySeasonMatches(d, p, s => (s.assists ?? 0) >= 10),',
      [titles[5]]);
    restored = await mutate('known-red', 's.redCards === 0', '(s.redCards ?? 0) === 0', [titles[7]]);
    for (const [id, count] of [['season-attack', 2], ['season-matches', 3], ['season-discipline', 3]]) {
      restored = await mutate('group-' + id, "group: '" + id + "',", "group: undefined /* category-control-" + id + " */,", [titles[8]], count);
    }
    restored = await mutate('support-gate', 'const eligible = criteria.filter(c => c.support.length >= MIN_TILE_SUPPORT);',
      'const eligible = criteria.filter(() => true);', [titles[9]]);
    await run('restored', restored, []);
  }
  await writeFile(path.join(out, 'verdict.json'), JSON.stringify({
    status: 'passed', phase, base, results,
    scope: 'Fictional metadata, actual exported category and board functions, deterministic fixtures; no live data or browser claim.',
  }, null, 2));
} finally {
  const after = await Promise.all(files.map(async file => {
    const bytes = await readFile(path.join(root, file));
    return { file, bytes: bytes.length, sha256: hash(bytes) };
  }));
  await writeFile(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, receipts(), 'Application, tests, harnesses and packages remain held');
  if (temp) await rm(temp, { recursive: true, force: true });
}
console.log('simPlayerBingoCategories: ' + phase + ' proof passed; raw reports and changed-copy receipts retained.');
