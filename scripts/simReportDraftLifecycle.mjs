/* Round 1426: actual report forms retain newer drafts across late delivery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const MODE = process.env.REPORT_DRAFT_MODE || 'fixed';
assert(['baseline', 'fixed'].includes(MODE), 'REPORT_DRAFT_MODE must be baseline or fixed');
const evidenceRoot = process.env.REPORT_DRAFT_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'report-draft-evidence-'));
const OUT = path.join(evidenceRoot, 'unit');
fs.mkdirSync(OUT, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'report-draft-modules-'));
const BASE = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const forms = {
  '@/components/game/ReportQuestion': 'src/components/game/ReportQuestion.tsx',
  '@/components/game/ReportSiteIssue': 'src/components/game/ReportSiteIssue.tsx',
};
const heldFiles = [...Object.values(forms), 'src/test/reportDraftLifecycle.test.tsx',
  'src/test/reportDetails.test.tsx', 'src/test/reportContext.test.ts',
  'src/lib/reportContext.ts', 'src/components/game/reportKinds.ts', 'vitest.config.ts'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBefore = Object.fromEntries(heldFiles.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const runtimeAliases = {
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'),
  'lucide-react': require.resolve('lucide-react'),
};
const names = [
  'keeps a details-only edit after an older relay succeeds',
  'keeps a category-only edit after an older relay succeeds',
  'keeps a reopened pending draft without any edit after its older relay succeeds',
  'keeps a reopened edited draft after the captured direct fallback succeeds',
  'keeps a new opening and draft when the older success timer expires',
  'keeps a newer session free of the older error and sends its current retry',
  'closes an unchanged successful draft at 1500ms and restores blank form and focus',
];
const declared = ['game report', 'footer report'].flatMap(surface => names.map(name => `${surface} draft lifecycle ${name}`));
const expectedOriginalFaults = ['game report', 'footer report'].flatMap(surface => names.slice(0, 6).map(name => `${surface} draft lifecycle ${name}`));
const summary = [];
const original = {};
const originalAliases = {};

function run(name, aliases = {}, want = { passed: 14, failed: 0 }, pattern) {
  const report = path.join(OUT, name + '.json');
  const receipt = path.join(OUT, name + '.transport');
  const args = ['node_modules/vitest/vitest.mjs', 'run', 'src/test/reportDraftLifecycle.test.tsx',
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + report];
  if (pattern) args.push('-t', pattern);
  const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000,
    env: { ...process.env, SIM_OFFLINE_RECEIPT: receipt, NO_DOUBLE_SWAP: JSON.stringify({ ...runtimeAliases, ...aliases }) } });
  const output = (child.stdout || '') + (child.stderr || '');
  fs.writeFileSync(path.join(OUT, name + '.log'), output);
  assert.ifError(child.error); assert.equal(child.signal, null, `${name}: child signal`);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test(output), `${name}: no out-of-case unhandled error credit`);
  assert.equal(child.status, want.failed ? 1 : 0, `${name}: unexpected test exit, inspect ${name}.log`);
  const result = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(result.numTotalTests, 14, `${name}: complete declared census`);
  assert.equal(result.numPassedTests, want.passed, `${name}: passed cases`);
  assert.equal(result.numFailedTests, want.failed, `${name}: failed cases`);
  const pending = 14 - want.passed - want.failed;
  assert.equal(result.numPendingTests, pending, `${name}: exact skipped cases`);
  assert.equal(result.numTodoTests, 0, `${name}: no deferred cases`);
  assert.equal(result.numRuntimeErrorTestSuites || 0, 0, `${name}: no runtime error suite`);
  if (result.numUnhandledErrors !== undefined) assert.equal(result.numUnhandledErrors, 0, `${name}: no unhandled errors`);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, [], `${name}: no unhandled errors`);
  const cases = result.testResults.flatMap(file => file.assertionResults);
  assert.deepEqual(cases.map(test => test.fullName).sort(), [...declared].sort(), `${name}: exact real form cases`);
  const failures = cases.filter(test => test.status === 'failed');
  assert.equal(failures.length, want.failed);
  for (const test of failures) {
    const messages = test.failureMessages.join('\n');
    assert(/AssertionError/.test(messages), `${name}: failure must be an actual assertion`);
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(messages), `${name}: no preparation or lookup failure credit`);
  }
  assert(!fs.existsSync(receipt) || fs.statSync(receipt).size === 0, `${name}: child transport receipt must be empty`);
  summary.push({ name, passed: result.numPassedTests, failed: result.numFailedTests, pending,
    failures: failures.map(test => ({ name: test.fullName, messages: test.failureMessages })) });
  console.log(`${name}: ${want.passed} passed, ${want.failed} expected failures, ${pending} skipped`);
  return failures;
}

function originalFailures(name, aliases) {
  const failures = run(name, aliases, { passed: 2, failed: 12 });
  assert.deepEqual(failures.map(test => test.fullName).sort(), [...expectedOriginalFaults].sort(), `${name}: only the twelve original draft/session faults`);
  for (const test of failures) {
    const expectedMessage = test.fullName.includes(names[4]) ? 'A reopened report session must show its draft form'
      : test.fullName.includes(names[5]) ? 'An older request must not put an error on the current session'
        : 'The current report draft must remain visible';
    assert.equal(test.failureMessages.length, 1, `${name}: one precise draft-loss assertion for ${test.fullName}`);
    assert(test.failureMessages[0].startsWith(`AssertionError: ${expectedMessage}:`), `${name}: exact leading draft-loss assertion for ${test.fullName}`);
  }
}

try {
  for (const [alias, file] of Object.entries(forms)) {
    const read = spawnSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(read.error); assert.equal(read.status, 0, `Read actual original ${file}: ${read.stderr}`);
    original[file] = read.stdout;
    fs.writeFileSync(path.join(OUT, 'original-' + path.basename(file)), read.stdout);
    const copy = path.join(TEMP, 'original-' + path.basename(file)); fs.writeFileSync(copy, read.stdout); originalAliases[alias] = copy;
  }
  if (MODE === 'baseline') {
    for (const file of Object.values(forms)) assert.equal(sourceBefore[file].toString('utf8'), original[file], `${file}: baseline product held at actual main775`);
    originalFailures('baseline');
  } else {
    run('normal');
    originalFailures('original', originalAliases);
    assert.fail('Fixed-only independent completion and timer controls await the admitted original and reviewed product hunks');
  }
} finally {
  fs.rmSync(TEMP, { recursive: true, force: true });
  assert(!fs.existsSync(TEMP), 'Temporary module copies removed');
  for (const file of heldFiles) assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), sourceBefore[file], `${file}: source bytes held`);
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ base: BASE, mode: MODE, cases: summary,
    sourceBefore: Object.fromEntries(heldFiles.map(file => [file, hash(sourceBefore[file])])), sourceHeld: true, temporaryModulesRemoved: true }, null, 2));
}
console.log(MODE === 'baseline'
  ? 'simReportDraftLifecycle baseline: 14 actual cases, 12 intended draft/session faults and 2 healthy cases; fixed controls not run.'
  : 'simReportDraftLifecycle: all declared cases and effective controls passed.');
