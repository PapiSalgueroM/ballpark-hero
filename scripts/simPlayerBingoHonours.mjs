import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const requestedOut = process.env.PLAYER_BINGO_HONOURS_OUT;
const defaultRoot = path.join(root, '.sim-artifacts/player-bingo-honours');
if (!requestedOut) mkdirSync(defaultRoot, { recursive: true });
const out = requestedOut ? path.resolve(requestedOut) : mkdtempSync(path.join(defaultRoot, 'run-'));
assert.ok(out.startsWith(root + path.sep), 'Output is owned by this checkout');
if (requestedOut) {
  assert.equal(existsSync(out), false, 'Fresh controls output required');
  mkdirSync(out, { recursive: true });
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const libFile = path.join(root, 'src/lib/playerBingo.ts');
const testFile = path.join(root, 'src/test/playerBingoHonours.test.ts');
const heldLib = readFileSync(libFile);
const heldTest = readFileSync(testFile);
const source = heldLib.toString('utf8').replaceAll('\r\n', '\n');
assert.equal(hash(Buffer.from(source)), 'F96056EDFC854C5EF188A5D9D3D9CEAD8CFAABAF28F24436656D313350344DAB');
assert.equal(hash(heldTest), 'D59E5466142A653A6F73B2C477B7267308FC875AC306213B3AD613CE1E42C622');
writeFileSync(path.join(out, 'source.raw.ts'), heldLib);
writeFileSync(path.join(out, 'source.LF.ts'), source);
writeFileSync(path.join(out, 'test.raw.ts'), heldTest);
const controls = [
  { id: 'remove-2026', anchor: "  { keys: ['paris saint-germain'], years: [2025, 2026] },", replacement: "  { keys: ['paris saint-germain'], years: [2025] },", failures: [
    'accepts the current PSG midfielder in 2026 without borrowing forward history',
    'preserves the verified 2025 pair and rejects non-winning PSG years',
  ] },
  { id: 'remove-vitinha-identity', anchor: "  if (normalizeName(ref.name) !== 'vitinha') return true;", replacement: '  return true;', failures: [
    'accepts the current PSG midfielder in 2026 without borrowing forward history',
    'keeps the Genoa forward unmerged and rejects a borrowed PSG title',
    'rejects a namesake history row with missing nationality',
    'rejects a namesake history row with different nationality',
    'rejects a namesake history row with missing position',
    'rejects a namesake history row with unknown position',
    'rejects a namesake history row with forward position',
  ] },
];
const temporary = [];
const report = { status: 'running', source: { rawBytes: heldLib.length, rawSha256: hash(heldLib), lfBytes: Buffer.byteLength(source), lfSha256: hash(Buffer.from(source)), testBytes: heldTest.length, testSha256: hash(heldTest) }, runs: [], controls: [], failures: [] };
const save = () => writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
save();
function run(id, copiedSource, expectedFailures) {
  const folder = path.join(out, id);
  mkdirSync(folder);
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  let copy;
  if (copiedSource !== null) {
    const sourceFolder = mkdtempSync(path.join(root, 'src/lib/.bingo-honours-'));
    copy = path.join(sourceFolder, 'playerBingo.ts');
    temporary.push({ copy, sourceFolder });
    writeFileSync(copy, copiedSource);
    writeFileSync(path.join(folder, 'source-copy.ts'), copiedSource);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/playerBingo': copy });
  }
  const resultFile = path.join(folder, 'vitest.json');
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/playerBingoHonours.test.ts', '--reporter=json', '--outputFile.json=' + resultFile, '--maxWorkers=1', '--no-file-parallelism'];
  const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 25000000 });
  writeFileSync(path.join(folder, 'stdout.txt'), result.stdout || '');
  writeFileSync(path.join(folder, 'stderr.txt'), result.stderr || '');
  const retained = { id, command: process.execPath, args, cwd: root, alias: env.NO_DOUBLE_SWAP ?? null, exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, stack: result.error.stack } : null, expectedFailures, rows: null, status: 'unaccepted' };
  report.runs.push(retained); save();
  assert.equal(retained.error, null);
  assert.equal(retained.signal, null);
  assert.ok(existsSync(resultFile), 'Complete Vitest report present');
  const actual = JSON.parse(readFileSync(resultFile, 'utf8'));
  retained.rows = actual.testResults.flatMap(file => file.assertionResults); save();
  assert.equal(Number(actual.numUnhandledErrors ?? 0), 0);
  assert.equal(actual.numPendingTests, 0);
  assert.equal(retained.rows.length, 9);
  assert.equal(actual.numTotalTests, 9);
  assert.equal(actual.numFailedTests, expectedFailures.length);
  assert.equal(actual.numPassedTests, 9 - expectedFailures.length);
  assert.equal(result.status, expectedFailures.length ? 1 : 0);
  assert.deepEqual(retained.rows.filter(row => row.status === 'failed').map(row => row.title).sort(), [...expectedFailures].sort());
  for (const row of retained.rows) assert.equal(row.status, expectedFailures.includes(row.title) ? 'failed' : 'passed', row.fullName);
  retained.status = 'pass'; save();
}
try {
  run('healthy', null, []);
  for (const control of controls) {
    const record = { ...control, forwardCount: source.split(control.anchor).length - 1, sourceChanged: false, reverseCount: null, wholeUndo: false, status: 'unaccepted' };
    report.controls.push(record); save();
    assert.equal(record.forwardCount, 1);
    const changed = source.replace(control.anchor, control.replacement);
    record.sourceChanged = changed !== source; save();
    assert.equal(record.sourceChanged, true);
    record.reverseCount = changed.split(control.replacement).length - 1; save();
    assert.equal(record.reverseCount, 1);
    const undo = changed.replace(control.replacement, control.anchor);
    writeFileSync(path.join(out, control.id + '.undo.ts'), undo);
    record.wholeUndo = undo === source; save();
    assert.equal(record.wholeUndo, true);
    run(control.id, changed, control.failures);
    record.status = 'pass'; save();
  }
  const last = report.controls.at(-1);
  const undo = readFileSync(path.join(out, last.id + '.undo.ts'), 'utf8');
  assert.equal(undo, source);
  run('whole-undo', undo, []);
  assert.deepEqual(readFileSync(libFile), heldLib);
  assert.deepEqual(readFileSync(testFile), heldTest);
  report.status = 'pass'; save();
  console.log('simPlayerBingoHonours: actual loader healthy9 and complete whole-undo9 pass.');
  console.log('simPlayerBingoHonours: remove2026 rejects exactly2 retained title cases,7 unrelated cases pass.');
  console.log('simPlayerBingoHonours: remove identity rejects exactly7 histories,2 unrelated cases pass.');
  console.log('simPlayerBingoHonours: full source/test bytes, both unique source mutations and complete reversals retained.');
  console.log('simPlayerBingoHonours PASS');
} catch (error) {
  report.status = 'fail';
  report.failures.push({ name: error.name, message: error.message, stack: error.stack });
  save(); process.exitCode = 1;
} finally {
  for (const { copy, sourceFolder } of temporary) {
    try {
      if (existsSync(copy)) unlinkSync(copy);
      rmdirSync(sourceFolder);
    } catch (error) {
      report.status = 'fail'; report.failures.push({ name: 'OwnedCopyCleanup', message: error.message, stack: error.stack }); process.exitCode = 1;
    }
  }
  const held = { lib: hash(readFileSync(libFile)) === hash(heldLib), test: hash(readFileSync(testFile)) === hash(heldTest) };
  writeFileSync(path.join(out, 'source-held.json'), JSON.stringify(held, null, 2) + '\n');
  if (!held.lib || !held.test) { report.status = 'fail'; report.failures.push({ name: 'SourceHold', message: 'Actual source changed during controls' }); process.exitCode = 1; save(); }
  save();
}
