/* Round 1427: actual board and hook, fully intercepted fictional score IO. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const MODE = process.env.TENNIS_SCORE_MODE || 'fixed';
assert(['baseline', 'fixed'].includes(MODE), 'TENNIS_SCORE_MODE must be baseline or fixed');
const evidenceRoot = process.env.TENNIS_SCORE_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tennis-score-evidence-'));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'), 'Evidence is absolute and outside checkout');
const OUT = path.join(evidenceRoot, 'unit');
assert(!fs.existsSync(OUT), 'Fresh unit evidence directory'); fs.mkdirSync(OUT, { recursive: true });
const BASE = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const productFile = 'src/components/tennis-chain/TennisChainBoard.tsx';
const testFile = 'src/test/tennisChainScoreOwnership.test.tsx';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const tracked = git(['ls-files', '-z']);
const source = Object.fromEntries(tracked.toString('utf8').split('\0').filter(Boolean).map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
const testHash = hash(fs.readFileSync(path.join(ROOT, testFile)));
assert.equal(testHash, 'ea570467ba22bc996b97d9fb235d216d6adf810337192cf75eb25e1926e6ad46', 'Frozen eleven-case original test body');
const original = git(['show', BASE + ':' + productFile]);
fs.writeFileSync(path.join(OUT, 'original-TennisChainBoard.tsx'), original);
const titles = [
  'keeps the new round unsaved after an old insert completion',
  'keeps the new round unsaved after an old rank completion',
  ...['insert', 'rank'].flatMap(boundary => ['success', 'error'].map(outcome => 'keeps a current save pending across old ' + boundary + ' ' + outcome)),
  'ordinary current saves retain exact rows and the existing rank-error fallback',
  'a current insert failure keeps its nickname and allows the exact current retry',
  'a pending current save rejects a second submission without a duplicate row',
  'reset without a pending save starts a normal editable unsaved round',
  'an old save finishing during play does not pre-submit the next finished round',
];
const declared = titles.map(name => 'Tennis Chain score ownership ' + name);
const aliases = {
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'),
};
const summary = { version: 1, mode: MODE, productQualified: false, status: 'failed',
  scope: 'Actual TennisChainBoard and useTennisChain, fictional intercepted IO, existing search stimulus seam. No live writes. Original qualification only.',
  expected: { cases: 11, originalFaults: 6, healthyCases: 5 }, testSha256: testHash, originalSha256: hash(original), arms: [] };

function run(name, bare) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir);
  const receipt = path.join(dir, 'transport.transport'), raw = path.join(dir, 'vitest.json');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt, TENNIS_SCORE_TRACE_DIR: dir };
  if (bare) delete env.NO_DOUBLE_SWAP;
  else env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', testFile,
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + raw],
  { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  fs.writeFileSync(path.join(dir, 'exit-code.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }) + '\n');
  assert.ifError(child.error); assert.equal(child.signal, null, name + ': no signal');
  const output = (child.stdout || '') + (child.stderr || '');
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test(output), name + ': no unhandled error credit');
  assert.equal(child.status, 1, name + ': original six purpose failures');
  const value = JSON.parse(fs.readFileSync(raw, 'utf8'));
  assert.equal(value.testResults.length, 1); assert.equal(value.numTotalTests, 11); assert.equal(value.numPassedTests, 5); assert.equal(value.numFailedTests, 6);
  assert.equal(value.numPendingTests, 0); assert.equal(value.numTodoTests, 0); assert.equal(value.numRuntimeErrorTestSuites || 0, 0);
  if (value.numUnhandledErrors !== undefined) assert.equal(value.numUnhandledErrors, 0);
  if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, []);
  const cases = value.testResults.flatMap(file => file.assertionResults);
  assert.deepEqual(cases.map(row => row.fullName).sort(), [...declared].sort(), name + ': exact complete census');
  const failures = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failures.map(row => row.fullName).sort(), declared.slice(0, 6).sort(), name + ': only intended old-round ownership faults');
  for (const row of cases) {
    assert(['passed', 'failed'].includes(row.status), name + ': every case finished');
    if (row.status === 'passed') { assert.deepEqual(row.failureMessages, []); continue; }
    assert.equal(row.failureMessages.length, 1, name + ': one purpose assertion');
    const message = row.fullName.includes('keeps the new round unsaved') ? 'The new round must keep its own unsaved score form' : 'Reset must release the older round save busy state';
    assert(row.failureMessages[0].startsWith('AssertionError: ' + message + ':'), name + ': exact leading ownership assertion');
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(row.failureMessages[0]), name + ': no setup failure credit');
  }
  const trace = JSON.parse(fs.readFileSync(path.join(dir, 'trace.json'), 'utf8'));
  assert.deepEqual(trace.cases.map(row => row.name).sort(), [...titles].sort(), name + ': all actual outcome traces');
  for (const row of trace.cases) { assert.equal(row.pendingBeforeCleanup, 0, name + ': no purpose assertion left IO held'); assert.equal(row.pendingAfterCleanup, 0, name + ': no deferred IO survives cleanup'); }
  assert.equal(fs.existsSync(receipt) ? fs.readFileSync(receipt, 'utf8') : '', '', name + ': empty child offline receipt');
  summary.arms.push({ name, bare, passed: 5, failed: 6, pending: 0, failures: failures.map(row => ({ name: row.fullName, messages: row.failureMessages })), traceSha256: hash(JSON.stringify(trace)) });
  console.log(name + ':11 finished,6 expected original ownership faults,5 healthy,0 pending IO.');
  return trace;
}

try {
  assert.equal(MODE, 'baseline', 'Fixed qualification awaits admitted original and an authorized product edit');
  assert(fs.readFileSync(path.join(ROOT, productFile)).equals(original), 'Original board is exactly main775');
  const normal = run('normal', false), bare = run('bare', true);
  assert.deepEqual(bare, normal, 'Installed React aliases and bare resolution have exact matching actual outcome traces');
  summary.status = 'passed';
} finally {
  assert(tracked.equals(git(['ls-files', '-z'])), 'Tracked source membership held');
  for (const [file, sha256] of Object.entries(source)) assert.equal(hash(fs.readFileSync(path.join(ROOT, file))), sha256, 'Tracked source bytes held: ' + file);
  assert.equal(hash(fs.readFileSync(path.join(ROOT, testFile))), testHash, 'Untracked original test source held');
  assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])), 'Tracked and untracked status held');
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
