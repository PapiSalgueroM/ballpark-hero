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
const hookFile = 'src/hooks/useReportDraftLifecycle.ts';
if (MODE === 'fixed') heldFiles.push(hookFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBefore = Object.fromEntries(heldFiles.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
assert.equal(hash(sourceBefore['src/test/reportDraftLifecycle.test.tsx']), 'ca6774ec49cdf7fe4d64aff59deebab94bc43f9925833c4f7a9d8a631dca3255', 'The admitted fourteen-case test body is frozen');
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
const controls = [];
const formInverses = [];
const original = {};
const originalAliases = {};

function run(name, aliases = {}, want = { passed: 14, failed: 0 }, pattern, bare = false) {
  const report = path.join(OUT, name + '.json');
  const receipt = path.join(OUT, name + '.transport');
  const args = ['node_modules/vitest/vitest.mjs', 'run', 'src/test/reportDraftLifecycle.test.tsx',
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + report];
  if (pattern) args.push('-t', pattern);
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt };
  if (bare) delete env.NO_DOUBLE_SWAP;
  else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...aliases });
  const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000,
    env });
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
  summary.push({ name, passed: result.numPassedTests, failed: result.numFailedTests, pending, bare,
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

function recoverOriginalForms() {
  const hookImport = "import { useReportDraftLifecycle } from '@/hooks/useReportDraftLifecycle';\n";
  const specs = [
    { alias: '@/components/game/ReportQuestion', header: 'const ReportQuestion = ({ gameType, gameContext = {}, kinds = REPORT_REASONS }: ReportQuestionProps) => {',
      importAnchor: "import { REPORT_KINDS_QUESTION } from '@/components/game/reportKinds';\n", field: 'reason', setter: 'setReason', option: 'r' },
    { alias: '@/components/game/ReportSiteIssue', header: 'export function ReportSiteIssue() {',
      importAnchor: "import { buildReportContext } from '@/lib/reportContext';\n", field: 'kind', setter: 'setKind', option: 'k' },
  ];
  for (const spec of specs) {
    const file = forms[spec.alias], fixed = sourceBefore[file].toString('utf8');
    const admitted = {
      'src/components/game/ReportSiteIssue.tsx': '4e5c2049c07a2aa5154ba05f6d5ee973af549f9b09233f556fe8547efcf210ca',
      'src/components/game/ReportQuestion.tsx': '02b8fd8654cd1fd36000f618c7cf9b49c337215607523f4b8a83420cc8a115fb',
    };
    const label = spec.alias === '@/components/game/ReportQuestion' ? 'Submit Report' : 'Send report';
    const nameHunk = { name: 'pending action name', original: '                onClick={handleSubmit}\n',
      fixed: `                onClick={handleSubmit}\n                aria-label="${label}"\n` };
    const withoutName = fixed.includes(nameHunk.fixed) ? fixed.replace(nameHunk.fixed, nameHunk.original) : fixed;
    assert.equal(hash(withoutName), admitted[file], `${file}: exact admitted form after only the pending-name inverse`);
    const hunks = [
      ...(withoutName === fixed ? [] : [nameHunk]),
      { name: 'lifecycle import', fixed: spec.importAnchor + hookImport, original: spec.importAnchor },
      { name: 'dialog open state', fixed: spec.header + '\n', original: spec.header + '\n  const [open, setOpen] = useState(false);\n' },
      { name: 'lifecycle state owner',
        fixed: '  const { open, status, changeOpen, markDraftChanged, beginSubmission, completeSubmission, failSubmission } = useReportDraftLifecycle();\n',
        original: "  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');\n" },
      { name: 'pending submission entry', fixed: '    const submission = beginSubmission();\n    if (!submission) return;\n', original: "    setStatus('loading');\n" },
      { name: 'successful completion and reset',
        fixed: `      completeSubmission(submission, () => {\n        ${spec.setter}('');\n        setDetails('');\n      });\n`,
        original: `      setStatus('success');\n      setTimeout(() => {\n        setOpen(false);\n        setStatus('idle');\n        ${spec.setter}('');\n        setDetails('');\n      }, 1500);\n` },
      { name: 'failed completion', fixed: '      failSubmission(submission);\n', original: "      setStatus('error');\n" },
      { name: 'trigger opening', fixed: '        onClick={() => changeOpen(true)}\n', original: '        onClick={() => setOpen(true)}\n' },
      { name: 'dialog close handler', fixed: '      <Dialog open={open} onOpenChange={changeOpen}>\n', original: '      <Dialog open={open} onOpenChange={setOpen}>\n' },
      { name: 'category revision',
        fixed: `                    onClick={() => {\n                      if (${spec.field} !== ${spec.option}) markDraftChanged();\n                      ${spec.setter}(${spec.option});\n                    }}\n`,
        original: `                    onClick={() => ${spec.setter}(${spec.option})}\n` },
      { name: 'details revision',
        fixed: '                onChange={(e) => {\n                  if (details !== e.target.value) markDraftChanged();\n                  setDetails(e.target.value);\n                }}\n',
        original: '                onChange={(e) => setDetails(e.target.value)}\n' },
    ];
    let recovered = fixed;
    for (const hunk of hunks) {
      assert.equal(fixed.split(hunk.fixed).length, 2, `${file}: one actual ${hunk.name} hunk`);
      assert.equal(recovered.split(hunk.fixed).length, 2, `${file}: one current ${hunk.name} target`);
      const next = recovered.replace(hunk.fixed, hunk.original);
      assert.notEqual(next, recovered, `${file}: ${hunk.name} inverse changes source`);
      recovered = next;
    }
    assert.equal(recovered, original[file], `${file}: lifecycle inverse recovers the entire actual main775 form`);
    let forward = recovered;
    for (const hunk of [...hunks].reverse()) {
      assert.equal(forward.split(hunk.original).length, 2, `${file}: one ${hunk.name} forward target`);
      forward = forward.replace(hunk.original, hunk.fixed);
    }
    assert.equal(forward, fixed, `${file}: forward replacements recover the entire fixed form`);
    const name = 'recovered-' + path.basename(file), retained = path.join(OUT, name), copy = path.join(TEMP, name);
    fs.writeFileSync(retained, recovered); fs.writeFileSync(copy, recovered); originalAliases[spec.alias] = copy;
    formInverses.push({ file, recoveredFile: name, fixedSha256: hash(fixed), originalSha256: hash(original[file]),
      recoveredSha256: hash(recovered), forwardSha256: hash(forward), hunks });
  }
}

function controlCopy(name, mutations) {
  const source = sourceBefore[hookFile].toString('utf8');
  let changed = source;
  for (const { before, after } of mutations) {
    assert.equal(source.split(before).length, 2, `${name}: one executable fixed anchor`);
    assert.equal(changed.split(before).length, 2, `${name}: one current mutation target`);
    const next = changed.replace(before, after);
    assert.notEqual(next, changed, `${name}: each mutation changes its executable body`);
    changed = next;
  }
  let restored = changed;
  for (const { before, after } of [...mutations].reverse()) {
    assert.equal(restored.split(after).length, 2, `${name}: one exact inverse target`);
    restored = restored.replace(after, before);
  }
  assert.equal(restored, source, `${name}: reverse replacements reconstruct the entire fixed hook`);
  for (const guard of ['if (pending.current !== submission) return false;', 'pending.current = null;',
    'if (!mounted.current) return false;', 'if (!mounted.current) return;']) {
    assert.equal(changed.split(guard).length, 2, `${name}: mounted and pending ownership remain intact`);
  }
  const retained = path.join(OUT, name + '.ts'), copy = path.join(TEMP, name + '.ts');
  const recoveredName = name + '-restored.ts', recovered = path.join(TEMP, recoveredName);
  fs.writeFileSync(retained, changed); fs.writeFileSync(copy, changed);
  fs.writeFileSync(path.join(OUT, recoveredName), restored); fs.writeFileSync(recovered, restored);
  controls.push({ name, file: path.basename(retained), fixedSha256: hash(source), changedSha256: hash(changed),
    recoveredFile: recoveredName, recoveredSha256: hash(restored), mutations });
  return { changed: { '@/hooks/useReportDraftLifecycle': copy }, restored: { '@/hooks/useReportDraftLifecycle': recovered } };
}

function controlFailures(name, aliases, indexes) {
  const expected = ['game report', 'footer report'].flatMap(surface => indexes.map(index => `${surface} draft lifecycle ${names[index]}`));
  const failures = run(name, aliases, { passed: 14 - expected.length, failed: expected.length });
  assert.deepEqual(failures.map(test => test.fullName).sort(), [...expected].sort(), `${name}: only its declared ownership faults`);
  for (const test of failures) {
    const purpose = test.fullName.includes(names[5]) ? 'An older request must not put an error on the current session'
      : 'The current report draft must remain visible';
    assert.equal(test.failureMessages.length, 1, `${name}: one precise ownership assertion for ${test.fullName}`);
    assert(test.failureMessages[0].startsWith(`AssertionError: ${purpose}:`), `${name}: exact leading ownership assertion for ${test.fullName}`);
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
    recoverOriginalForms();
    run('normal');
    run('bare', {}, { passed: 14, failed: 0 }, undefined, true);
    originalFailures('original', originalAliases);
    const completionGuard = "    if (revision.current !== submission.revision) {\n      setStatus('idle');\n      return false;\n    }\n";
    const completion = controlCopy('completion-owner', [{ before: completionGuard,
      after: "    if (false) {\n      setStatus('idle');\n      return false;\n    }\n" }]);
    controlFailures('completion-owner', completion.changed, [0, 1, 2, 3, 5]);
    const cancellation = '  const markDraftChanged = () => {\n    revision.current += 1;\n    if (successTimer.current !== null) clearTimeout(successTimer.current);\n    successTimer.current = null;\n';
    const timer = controlCopy('timer-owner', [
      { before: cancellation, after: '  const markDraftChanged = () => {\n    revision.current += 1;\n' },
      { before: '      if (revision.current !== submission.revision) return;\n', after: '      if (false) return;\n' },
    ]);
    controlFailures('timer-owner', timer.changed, [4]);
    run('restored', timer.restored);
  }
} finally {
  fs.rmSync(TEMP, { recursive: true, force: true });
  assert(!fs.existsSync(TEMP), 'Temporary module copies removed');
  for (const file of heldFiles) assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), sourceBefore[file], `${file}: source bytes held`);
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ base: BASE, mode: MODE, cases: summary, controls, formInverses,
    sourceBefore: Object.fromEntries(heldFiles.map(file => [file, hash(sourceBefore[file])])), sourceHeld: true, temporaryModulesRemoved: true }, null, 2));
}
console.log(MODE === 'baseline'
  ? 'simReportDraftLifecycle baseline: 14 actual cases, 12 intended draft/session faults and 2 healthy cases; fixed controls not run.'
  : 'simReportDraftLifecycle: all declared cases and effective controls passed.');
