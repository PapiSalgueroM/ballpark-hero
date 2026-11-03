/* Offline actual-loader/criteria proof. Remote CI only.
   PHASE=baseline expects one owned missing-alias outcome. Fixed normal is healthy.
   CONTROL=alias|country changes a physical source copy, then executes its exact restore. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport must be active');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.env.PLAYER_BINGO_GABRIEL_PHASE || 'fixed';
const control = process.env.PLAYER_BINGO_GABRIEL_CONTROL || '';
assert.ok(['baseline', 'fixed'].includes(phase), 'Known phase');
assert.ok(['', 'alias', 'country'].includes(control), 'Known physical source control');
assert.ok(!control || phase === 'fixed', 'Controls require the fixed loader');
const TEST = 'src/test/playerBingoGabrielWorldCup.test.ts';
const LOADER = 'src/lib/playerBingo.ts';
const SELF = 'scripts/simPlayerBingoGabrielWorldCup.mjs';
const BASE_GIT = '71036988bba361130cdead0b1e25727e72001e14';
const TEST_SHA = '0568c4e9d057dd99a2db94c62d5a9504ac27f1485251dadc1d2e26c483490a1b';
const DESCRIBE = 'Player Bingo Gabriel World Cup identity';
const titles = [
  'BINGO_GABRIEL_ALIAS: accepts exact Brazil full-name rows on first and later pages',
  'BINGO_GABRIEL_KEYS: preserves canonical keys, Andy bridge and unrelated buckets',
  'BINGO_GABRIEL_2022: does not turn the 2026 appearance into a 2022 appearance',
  'BINGO_GABRIEL_WINNER: does not turn the Brazil appearance into a winning squad',
  'BINGO_GABRIEL_IDENTITIES: refuses other Gabriels and similar surnames',
  'BINGO_GABRIEL_COUNTRY: refuses wrong, absent and dual squad nationalities',
  'BINGO_GABRIEL_PROTOCOL: preserves exact World Cup predicates and later canonical page',
  'BINGO_GABRIEL_FAILED_READ: cancels its owned siblings after a World Cup failure',
  'BINGO_GABRIEL_ABANDONED: issues no reads for an already abandoned caller',
];
const PINNED = {
  'src/lib/whoAmI.ts': '8b6da5c480857fa8b7164d50c322eaccd0f6a8af',
  'src/lib/playerSearch.ts': '0d19f2c23735eb30512dc7fc3a447eacef5e128f',
  'src/test/setup.ts': 'df00cdf5c54e8c8efc71e46d7585ae76acb4fc8d',
  'src/test/playerBingoWorldCupAlias.test.ts': 'd11c81a71407314c3a5bedc88c27c91a4fe16c81',
  'scripts/simPlayerBingoWorldCupAlias.mjs': 'b643ca14032d9bdc836c7a339d91bf2ff8cbcb0d',
  'scripts/lib/offlineTransport.cjs': '0fda542a2649fe5da937c6976fd0f5b6073e74b6',
  'vitest.config.ts': 'ed2a9dc677f77dfe95c061064eeff5782b856864',
  'package.json': '2ff64986fb76ebc51b706f2fd24765768874008a',
  'package-lock.json': '97d6f12a052f25f400462938c241789a083f0bfe',
  'bun.lock': 'dff081dcd34a1aa928ddc90d910774a6b855dfe3',
};
const files = [LOADER, TEST, SELF, ...Object.keys(PINNED)];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const meta = (file, bytes) => ({ file, bytes: bytes.length, sha256: hash(bytes), gitBlob: git(bytes) });
const held = new Map();
for (const file of files) {
  const bytes = await readFile(path.join(root, file));
  if (PINNED[file]) assert.equal(git(bytes), PINNED[file], 'Pinned unchanged source: ' + file);
  if (file === TEST) assert.equal(hash(bytes), TEST_SHA, 'Exact nine-case candidate');
  held.set(file, bytes);
}
const before = files.map(file => meta(file, held.get(file)));
const BRIDGE = "      if (key === 'gabriel magalhaes' && normalizeName(r.nationality ?? '') === 'brazil') {\n        keys.push('gabriel');\n      }\n";
const ANDY = "      if (key === 'andy robertson' && normalizeName(r.nationality ?? '') === 'scotland') {\n        keys.push('andrew robertson');\n      }\n";
const source = (await readFile(path.join(root, LOADER), 'utf8')).replaceAll('\r\n', '\n');
const count = (text, needle) => text.split(needle).length - 1;
assert.equal(count(source, ANDY), 1, 'Existing exact Andy bridge is held');
if (phase === 'baseline') {
  assert.equal(git(held.get(LOADER)), BASE_GIT, 'Actual PR450 old loader, not a reconstructed defect');
  assert.equal(count(source, BRIDGE), 0);
} else {
  assert.equal(count(source, BRIDGE), 1, 'Exact proposed country-bound Gabriel bridge');
  assert.equal(git(Buffer.from(source.replace(BRIDGE, ''))), BASE_GIT,
    'Full fixed-loader inverse is the exact PR450 source');
}
const workspaceTmp = path.join(root, 'tmp');
await mkdir(workspaceTmp, { recursive: true });
const tmpStat = await lstat(workspaceTmp);
assert.ok(tmpStat.isDirectory() && !tmpStat.isSymbolicLink(), 'Workspace copy root is a real directory');
const evidenceBase = process.env.PLAYER_BINGO_GABRIEL_OUT
  ? path.resolve(process.env.PLAYER_BINGO_GABRIEL_OUT)
  : await mkdtemp(path.join(workspaceTmp, 'player-bingo-gabriel-evidence-'));
const out = path.join(evidenceBase, 'units', control || phase);
await mkdir(out, { recursive: true });
assert.equal((await lstat(out)).isSymbolicLink(), false, 'Evidence directory is owned');
const put = (name, value) => writeFile(path.join(out, name), typeof value === 'string' || Buffer.isBuffer(value)
  ? value : JSON.stringify(value, null, 2) + '\n');
await put('source-before.json', before);
await put('playerBingo.ts.before', held.get(LOADER));
await put('execution.json', {
  schema: 1, phase, control, test: TEST, titles, defaultCaseTimeoutMs: 5000, childTimeoutMs: 120000,
  fixture: 'Synthetic transport only; actual loader and criteria. Root-verified name link only.',
  baselineGit: BASE_GIT, fixedFullInverseGit: phase === 'fixed' ? BASE_GIT : null,
  noProductionReads: true, noBrowserOrDatabaseCredit: true,
});
const ansi = text => String(text).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
const unexpected = /(?:\bUnhandled (?:Errors?|Rejections?)\b|\bUncaught (?:Exception|Error)\b|\bunhandledRejection\b|\buncaughtException\b|\bUnhandledPromiseRejection(?:Warning|Error)?\b|^\s*(?:TypeError|ReferenceError|RangeError|SyntaxError|EvalError|URIError)(?:\s*\[[^\]]+\])?:|^\s*Error(?:\s*\[[^\]]+\])?:|\bFailed to (?:resolve import|load)\b|\bCannot find (?:module|package)\b|\bTransform failed\b|\bTest timed out\b|\bSIM_OFFLINE_BLOCK\b)/im;
function runtimeCounters(report) {
  const result = {};
  for (const key of ['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests']) {
    const value = report[key];
    if (value === undefined || value === null) result[key] = { value: null, status: 'UNKNOWN' };
    else {
      assert.equal(typeof value, 'number', 'Numeric runtime counter: ' + key);
      assert.equal(value, 0, 'No reported runtime error: ' + key);
      result[key] = { value, status: 'REPORTED_ZERO' };
    }
  }
  return result;
}
function assertRuntimeLogs(stdout, stderr, label) {
  assert.doesNotMatch(ansi(stdout + '\n' + stderr), unexpected,
    'BINGO_GABRIEL_RUNTIME_DIAGNOSTIC:' + label);
}
const runtimeLogControls = [];
async function proveRuntimeGuard(item) {
  const dir = path.join(out, 'runtime-log-controls');
  await mkdir(dir);
  const original = Buffer.from(item.stdout + '\n' + item.stderr);
  const copy = path.join(dir, 'copied-output.log');
  await writeFile(path.join(dir, 'original.log'), original);
  assertRuntimeLogs(original.toString('utf8'), '', 'actual-original');
  const positive = Buffer.concat([original, Buffer.from(
    '\nnode:internal/modules/run_main: triggerUncaughtException(\nAssertionError: BINGO_GABRIEL_ALIAS_REQUIRED: expected false to be true\n')]);
  await writeFile(path.join(dir, 'expected-preamble.log'), positive);
  assertRuntimeLogs(positive.toString('utf8'), '', 'expected-assertion-and-node-preamble');
  for (const diagnostic of ['unhandledRejection', 'uncaughtException',
    'UnhandledPromiseRejection', 'UnhandledPromiseRejectionWarning', 'UnhandledPromiseRejectionError']) {
    const changed = Buffer.concat([original, Buffer.from('\n' + diagnostic + ': Fixture unrelated runtime diagnostic\n')]);
    assert.notEqual(hash(changed), hash(original), 'Copied log control changes bytes');
    await writeFile(copy, changed);
    const actual = await readFile(copy);
    assert.ok(actual.equals(changed), 'Physical copied-log fault is exact');
    assert.throws(() => assertRuntimeLogs(actual.toString('utf8'), '', diagnostic),
      error => error?.name === 'AssertionError' && String(error.message).startsWith('BINGO_GABRIEL_RUNTIME_DIAGNOSTIC:'),
      'Each known diagnostic is refused by the native runtime guard');
    await writeFile(path.join(dir, diagnostic + '.changed.log'), actual);
    await writeFile(copy, original);
    const restored = await readFile(copy);
    assert.ok(restored.equals(original), 'Whole original log restored');
    assertRuntimeLogs(restored.toString('utf8'), '', diagnostic + '-restored');
    await writeFile(path.join(dir, diagnostic + '.restored.log'), restored);
    runtimeLogControls.push({ diagnostic, changed: true, ownedAssertion: true, restoredHealthy: true,
      original: meta('original.log', original), mutated: meta(diagnostic + '.changed.log', changed),
      restored: meta(diagnostic + '.restored.log', restored),
      scope: 'Detached raw-reader lab, not a game-source fault or observed runtime event.' });
  }
  await writeFile(path.join(dir, 'receipt.json'), JSON.stringify({
    sourceChild: item.label, expectedAssertionAndNodePreambleAccepted: true, controls: runtimeLogControls,
  }, null, 2) + '\n');
}
const children = [];
let copyDir, copyFile, mutation;
let sourceHeld = false;
let primary = null;
const secondary = [];
const errorRecord = error => ({
  name: error?.name || 'Error', message: String(error?.message || error), stack: String(error?.stack || error),
});
async function remember(error, location) {
  const item = { location, ...errorRecord(error) };
  if (!primary) { primary = item; await put('primary-error.json', primary); }
  else { secondary.push(item); await put('secondary-errors.json', secondary); }
}
async function execute(label, aliasFile) {
  const childDir = path.join(out, label);
  await mkdir(childDir);
  const reportFile = path.join(childDir, 'unit.json');
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  delete env.US_BOARD_CONTROL_ALIAS;
  delete env.US_BOARD_CONTROL_FILE;
  if (aliasFile) env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/playerBingo': aliasFile });
  const argv = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST,
    '--reporter=default', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  const began = Date.now();
  const run = spawnSync(process.execPath, argv, {
    cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  const stdout = run.stdout || '', stderr = run.stderr || '';
  const receipt = {
    label, command: process.execPath, argv, cwd: root, aliasFile: aliasFile || null,
    status: run.status, signal: run.signal, error: run.error ? errorRecord(run.error) : null,
    elapsedMs: Date.now() - began, timeoutMs: 120000,
  };
  await writeFile(path.join(childDir, 'stdout.log'), stdout);
  await writeFile(path.join(childDir, 'stderr.log'), stderr);
  await writeFile(path.join(childDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  let raw = null;
  try { raw = await readFile(reportFile); } catch { /* The raw receipt remains available if the reporter never wrote. */ }
  const item = { label, receipt, stdout, stderr, raw };
  children.push(item);
  return item;
}
async function validate(item, expectedTitle) {
  const { receipt, stdout, stderr, raw, label } = item;
  assert.equal(receipt.error, null, label + ': no process setup/timeout error');
  assert.equal(receipt.signal, null, label + ': no signal');
  assert.ok(raw, label + ': actual JSON report exists');
  assertRuntimeLogs(stdout, stderr, label);
  const report = JSON.parse(raw.toString('utf8'));
  const counters = runtimeCounters(report);
  assert.equal(report.testResults.length, 1, label + ': one physical test file');
  const file = report.testResults[0];
  assert.equal(path.relative(root, path.resolve(file.name)).split(path.sep).join('/'), TEST, label + ': exact physical file');
  assert.equal(file.message || '', '', label + ': no file-level setup error');
  const rows = file.assertionResults;
  assert.equal(rows.length, 9); assert.equal(report.numTotalTests, 9);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert.deepEqual(rows.map(row => row.title).sort(), [...titles].sort(), label + ': exact nine titles');
  assert.equal(new Set(rows.map(row => row.fullName)).size, 9);
  const red = expectedTitle ? 1 : 0;
  assert.equal(receipt.status, red ? 1 : 0, label + ': native exit');
  assert.equal(report.numFailedTests, red); assert.equal(report.numPassedTests, 9 - red);
  assert.equal(report.success, !red);
  const identities = [];
  for (const row of rows) {
    assert.equal(row.fullName, DESCRIBE + ' ' + row.title, label + ': exact Vitest fullName');
    assert.deepEqual(row.ancestorTitles, [DESCRIBE]);
    assert.equal(row.status, row.title === expectedTitle ? 'failed' : 'passed', label + ': ' + row.title);
    if (row.title === expectedTitle) {
      assert.equal(row.failureMessages.length, 1);
      const first = ansi(row.failureMessages[0]).split(/\r?\n/).find(line => line.trim())?.trim() || '';
      const marker = expectedTitle === titles[0] ? 'BINGO_GABRIEL_ALIAS_REQUIRED' : 'BINGO_GABRIEL_COUNTRY_GUARD';
      const actual = expectedTitle === titles[0] ? 'false to be true' : 'true to be false';
      assert.match(first, new RegExp('^AssertionError: ' + marker + ': expected ' + actual + '(?:\\s|$)'),
        label + ': first primary is the exact owned boolean outcome, not a code-frame marker');
      identities.push({ title: row.title, fullName: row.fullName, status: row.status, primary: first });
    } else {
      assert.equal(row.failureMessages.length, 0);
      identities.push({ title: row.title, fullName: row.fullName, status: row.status });
    }
  }
  const verdict = { schema: 1, status: 'passed', label, nativeExit: receipt.status,
    physicalFiles: 1, executed: 9, healthy: 9 - red, ownedFailures: red, unselected: 0,
    expectedTitle: expectedTitle || null, runtimeCounters: counters, identities };
  await writeFile(path.join(out, label, 'verdict.json'), JSON.stringify(verdict, null, 2) + '\n');
  return verdict;
}
const verdicts = [];
try {
  if (!control) {
    const item = await execute(phase, null);
    verdicts.push(await validate(item, phase === 'baseline' ? titles[0] : null));
    await proveRuntimeGuard(item);
  } else {
    copyDir = await mkdtemp(path.join(workspaceTmp, 'player-bingo-gabriel-copy-'));
    copyFile = path.join(copyDir, 'playerBingo.ts');
    await writeFile(copyFile, held.get(LOADER));
    assert.ok((await readFile(copyFile)).equals(held.get(LOADER)), 'Actual copy starts with exact tracked bytes');
    const anchor = control === 'alias' ? "keys.push('gabriel');"
      : "key === 'gabriel magalhaes' && normalizeName(r.nationality ?? '') === 'brazil'";
    const replacement = control === 'alias' ? 'void keys;' : "key === 'gabriel magalhaes'";
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
    assert.equal(count(code, anchor), 1, 'One executable source anchor after comment stripping');
    assert.equal(count(source, anchor), 1, 'One exact physical replacement');
    const changed = Buffer.from(source.replace(anchor, replacement));
    assert.notEqual(hash(changed), hash(held.get(LOADER)), 'Source fault changed bytes');
    await writeFile(copyFile, changed);
    assert.ok((await readFile(copyFile)).equals(changed));
    await put('playerBingo.ts.changed', changed);
    mutation = { control, copyFile, anchor, replacement, changed: true,
      before: meta(LOADER, held.get(LOADER)), mutated: meta(LOADER, changed),
      sourceTextNormalization: 'CRLF to LF for executed-code anchors only; tracked raw byte custody is separate.' };
    await put('mutation.json', mutation);
    const fault = await execute(control, copyFile);
    assert.ok((await readFile(copyFile)).equals(changed), 'Actual mutant bytes held through child');
    await writeFile(copyFile, held.get(LOADER));
    assert.ok((await readFile(copyFile)).equals(held.get(LOADER)), 'Exact physical copy restoration');
    await put('playerBingo.ts.restored', await readFile(copyFile));
    const restored = await execute(control + '-restored', copyFile);
    assert.ok((await readFile(copyFile)).equals(held.get(LOADER)), 'Restored body held through healthy child');
    mutation.restored = meta(LOADER, held.get(LOADER));
    mutation.restoredEqualsBefore = true;
    mutation.physicalRestoreChild = restored.label;
    await put('mutation.json', mutation);
    // Collect both complete children before classifying either outcome.
    for (const [item, title] of [[fault, control === 'alias' ? titles[0] : titles[5]], [restored, null]]) {
      try { verdicts.push(await validate(item, title)); }
      catch (error) { await remember(error, item.label + ':validate'); }
    }
    if (!primary) await proveRuntimeGuard(fault);
  }
} catch (error) {
  await remember(error, 'controller');
} finally {
  try {
    if (copyFile) {
      await writeFile(copyFile, held.get(LOADER));
      assert.ok((await readFile(copyFile)).equals(held.get(LOADER)), 'Final copy cleanup starts restored');
    }
    const after = [];
    for (const file of files) {
      const expected = held.get(file);
      {
        const actual = await readFile(path.join(root, file));
        assert.ok(actual.equals(expected), 'Tracked full byte custody: ' + file);
      }
      after.push(meta(file, expected));
    }
    await put('source-after.json', after);
    assert.deepEqual(after, before);
    sourceHeld = true;
  } catch (error) { await remember(error, 'final-source-custody'); }
  try {
    if (copyDir) {
      const relative = path.relative(workspaceTmp, copyDir);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Delete only the owned workspace copy');
      await rm(copyDir, { recursive: true, force: true });
      await assert.rejects(lstat(copyDir), error => error?.code === 'ENOENT');
    }
    await put('cleanup.json', { copyDir: copyDir || null, removed: !!copyDir, trackedSourceHeld: sourceHeld });
  } catch (error) { await remember(error, 'copy-cleanup'); }
}
if (!primary) {
  try {
    assert.equal(verdicts.length, control ? 2 : 1, 'Every intended child actually classified');
    assert.equal(verdicts.reduce((n, row) => n + row.executed, 0), control ? 18 : 9);
    assert.equal(verdicts.reduce((n, row) => n + row.ownedFailures, 0), control || phase === 'baseline' ? 1 : 0);
    assert.equal(sourceHeld, true, 'Tracked full byte custody completed');
  } catch (error) { await remember(error, 'aggregate'); }
}
const summary = {
  schema: 1, status: primary ? 'failed' : 'passed', phase, control,
  children: children.map(item => item.label), verifiedChildren: verdicts.length,
  executed: verdicts.reduce((n, row) => n + row.executed, 0),
  healthy: verdicts.reduce((n, row) => n + row.healthy, 0),
  ownedFailures: verdicts.reduce((n, row) => n + row.ownedFailures, 0), unselected: 0,
  mutation: mutation || null, runtimeLogControls, primary, secondary,
  sourceHeld, rawChildrenMayExistBeyondVerifiedCounts: !!primary,
  limits: ['Synthetic transport; real loader and criteria only.', 'No browser, live roster, DB, club/stat calibration or release credit.'],
};
await put('summary.json', summary);
if (primary) throw new Error(primary.location + ': ' + primary.message);
console.log('Player Bingo Gabriel proof: ' + phase + '/' + (control || 'normal')
  + ', ' + verdicts.length + ' children, ' + summary.executed + ' executed, ' + summary.healthy
  + ' healthy, ' + summary.ownedFailures + ' owned, 0 skips.');
console.log('Exact source, physical fault/restoration, raw child reports and optional runtime availability retained at ' + out);
