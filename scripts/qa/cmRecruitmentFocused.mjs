import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

assert.equal(process.env.CI, '1', 'Remote qualification only');
const ROOT = process.cwd(), OUT = path.resolve(process.env.CM_RECRUITMENT_OUT || 'cm-recruitment-focused-artifacts');
const BASE = '14ec28b1cbc82b1abcdf14244dec7acae25d1507', BRANCH = 'codex/cm-recruitment-shortlist-fixed-20261028';
const MANIFEST = 'qa/cm-recruitment-shortlist-v1/SOURCE-READY.json';
const sha = value => createHash('sha256').update(value).digest('hex');
const git = value => createHash('sha1').update('blob ' + value.length + '\0').update(value).digest('hex');
const plain = value => String(value).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
const manifestRaw = fs.readFileSync(MANIFEST);
assert.equal(sha(manifestRaw), '282b5cf5bc141fc9be92ab7b6f4178f4aef6bc3d50fe7fe0653c7fb8044e590e', 'Frozen product and test selector');
const manifest = JSON.parse(manifestRaw);
const expected = [
  {
    "prefix": "Club Manager current recruitment identities and explicit metadata writes",
    "titles": [
      "stores only current identity and context while keeping every existing field and all draws",
      "admits12 targets in order, rejects the13th and makes a duplicate at capacity a no-op",
      "removes an unavailable target and restores exact original bytes after the last removal",
      "reads absent and malformed metadata without changing a byte or consuming a draw",
      "rejects each changed club era start-year and seed context including same-club foreign-era data",
      "an explicit Add replaces foreign metadata with the current context, with no other change",
      "an actual keyed target follows its exact key across a club move and reads updated facts",
      "a missing stable key never falls back to a same-name same-cohort replacement",
      "legacy matching keeps the original club and game cohort, refuses ambiguity and does not follow namesakes",
      "refuses a supplied nonexistent key before adding any metadata",
      "duplicate legacy and keyed views of the same current row do not create two targets"
    ],
    "path": "src/test/clubManagerRecruitment.test.ts"
  },
  {
    "prefix": "Club Manager recruitment shortlist first behavior baseline",
    "titles": [
      "adds a current Buy row without starting talks or changing any old career field",
      "opens an empty shortlist while the transfer window is shut without writing",
      "reopens a saved identity using the current record and leaves saved bytes unchanged",
      "does not present a same-club target copied from another era as current or repair it on read",
      "preserves the ordinary Talk callback with the exact existing current player object",
      "ordinary rendering and a no-match search preserve input bytes and consume no random draws"
    ],
    "path": "src/test/clubManagerRecruitmentBaseline.test.tsx"
  },
  {
    "prefix": "actual recruitment board and ordinary Buy return",
    "titles": [
      "shows the supplied current record, existing primary-position peers and no persisted price",
      "keeps closed-window facts readable, disables Find and removes only explicit metadata",
      "Find passes only the current row and makes no write or random draw",
      "an unavailable target cannot be found but remains removable",
      "a refused Remove retains the target and reports a save failure without a success claim",
      "an explicit Save arrival commits only once through StrictMode effect replay",
      "a delayed Save arrival from a replaced career refuses rather than changing the new career",
      "help and its Back preserve the list and return focus to the actual help opener",
      "the real transfer screen returns Find to ordinary Buy search without talking paying or loaning"
    ],
    "path": "src/test/clubManagerRecruitmentBoard.test.tsx"
  },
  {
    "prefix": "recruitment through the actual saved Club Manager hook",
    "titles": [
      "leaves old careers without metadata and refuses null or identity transforms without a write",
      "commits once outside updater replay, persists first and preserves every old field and draw",
      "keeps memory, disk and the unmount writer unchanged after both quota attempts refuse",
      "retains metadata through a genuine lean retry and actual parked-slot roundtrip",
      "reserves the committed career so the same captured add cannot publish twice in one event",
      "refuses outside the actual hub before invoking a proposed metadata transform",
      "refuses a retained hub callback after a phase-only move to the managers screen",
      "does not overwrite the manager another slot has made active",
      "refuses a newer same-slot save fence without invoking or publishing a transform",
      "makes an old callback validate its captured origin against the latest committed career",
      "invalidates the actual writer on unmount before a delayed add can run"
    ],
    "path": "src/test/clubManagerRecruitmentHook.test.tsx"
  }
];
const held = {
  'src/lib/clubManager.ts': 'a505743537b383bc7885bb81f5a72c11e154b566',
  'src/lib/clubManagerDeals.ts': '6e62966e4950ac6e2fa0577f45d21527b9266ce6',
  'src/lib/clubManagerLoanDevelopment.ts': '98265b3e10752b671127c1b23d6725d83d28e47b',
  'src/lib/clubManagerLoanPlan.ts': '419b68389dad53c297d1a225611a653c0ed83b30',
  'src/components/club-manager/LoanPlanCard.tsx': 'b7b713399752fd97a5b27174108f2488d85bd037'
};
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');
const sourcePins = [];
for (const file of manifest.files) {
  const raw = fs.readFileSync(file.path);
  assert.equal(raw.length, file.bytes, 'Selected byte count ' + file.path);
  assert.equal(sha(raw), file.sha256, 'Selected SHA ' + file.path);
  assert.equal(git(raw), file.gitBlob, 'Selected Git body ' + file.path);
  sourcePins.push({ path: file.path, sha256: sha(raw), git: git(raw), bytes: raw.length });
}
assert.equal(sourcePins.length, 9);
for (const [file, pin] of Object.entries(held)) {
  const raw = fs.readFileSync(file); assert.equal(git(raw), pin, 'Held authority/Loan ' + file);
  sourcePins.push({ path: file, sha256: sha(raw), git: pin, bytes: raw.length });
}
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), process.env.GITHUB_SHA);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim(), BASE, 'Atomic child of qualified Loan416');
assert.equal(process.env.GITHUB_REF_NAME, BRANCH);
const allowed = [...manifest.files.map(file => file.path), MANIFEST, 'scripts/qa/cmRecruitmentFocused.mjs', '.github/workflows/cm-recruitment-shortlist-fixed.yml'].sort();
const changed = execFileSync('git', ['diff', '--name-only', BASE, 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed, allowed, 'Only nine selected product/test bodies and three QA paths');
write('selected-source-pins.json', { base: BASE, head: process.env.GITHUB_SHA, branch: BRANCH, sourcePins, changed });
function admit(value, log) {
  const cli = plain(log);
  assert.equal(value.success, true, 'ACTUAL_SUCCESS');
  assert.equal(value.numFailedTestSuites, 0, 'NO_FAILED_SUITES');
  assert.equal(value.numTotalTests, 37); assert.equal(value.numPassedTests, 37);
  assert.equal(value.numFailedTests, 0); assert.equal(value.numPendingTests, 0); assert.equal(value.numTodoTests, 0);
  assert(Array.isArray(value.testResults) && value.testResults.length === 4, 'FOUR_ACTUAL_FILES');
  assert(!/Failed Suites|Unhandled Errors|Vitest caught\s+\d+\s+unhandled|UnhandledRejection|UncaughtException|^\s*Errors\s+\d+\s+errors?/mi.test(cli), 'NO_CLI_INFRASTRUCTURE');
  const names = [];
  for (const target of expected) {
    const suites = value.testResults.filter(suite => suite.name.replaceAll('\\', '/').endsWith('/' + target.path));
    assert.equal(suites.length, 1, 'ONE_ACTUAL_FILE ' + target.path);
    const suite = suites[0]; assert.equal(suite.status, 'passed', 'ACTUAL_FILE_PASSED');
    assert.equal(typeof suite.message, 'string'); assert.equal(suite.message, '', 'NO_SUITE_DIAGNOSTICS');
    const rows = suite.assertionResults;
    assert.equal(rows.length, target.titles.length, 'ACTUAL_FILE_ROWS');
    assert.deepEqual(rows.map(row => row.fullName).sort(), target.titles.map(title => target.prefix + ' ' + title).sort(), 'EXACT_CASE_IDENTITIES');
    for (const row of rows) {
      assert.equal(row.status, 'passed', 'ACTUAL_CASE_PASSED');
      assert(Array.isArray(row.failureMessages)); assert.equal(row.failureMessages.length, 0, 'NO_CASE_ERRORS');
      names.push(row.fullName);
    }
  }
  assert.equal(names.length, 37); assert.equal(new Set(names).size, 37);
  assert(/^\s*Test Files\s+4 passed\s+\(4\)\s*$/m.test(cli), 'ACTUAL_FILE_CLOSING');
  assert(/^\s*Tests\s+37 passed\s+\(37\)\s*$/m.test(cli), 'ACTUAL_CASE_CLOSING');
  assert(cli.includes('JSON report written to ' + path.join(OUT, 'focused.json')), 'ACTUAL_JSON_WRITTEN');
  return { total: 37, passed: 37, failed: 0, skipped: 0, files: 4 };
}
if ((process.argv[2] || 'run') === 'run') {
  const report = path.join(OUT, 'focused.json'), log = path.join(OUT, 'focused.log');
  const fd = fs.openSync(log, 'w'); let child;
  try {
    child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...expected.map(row => row.path),
      '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + report],
      { cwd: ROOT, env: { ...process.env }, stdio: ['ignore', fd, fd], timeout: 360_000 });
  } finally { fs.closeSync(fd); }
  write('process.json', { status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0, 'Healthy focused process');
  const reportRaw = fs.readFileSync(report), logRaw = fs.readFileSync(log), value = JSON.parse(reportRaw), text = logRaw.toString('utf8');
  const actual = admit(value, text), controls = [];
  for (const kind of ['suite-message', 'failed-suites-cli', 'unhandled-cli']) {
    const copied = structuredClone(value); let copiedLog = text, guard;
    if (kind === 'suite-message') { copied.testResults[0].message = 'COPIED QA afterAll diagnostic'; guard = /NO_SUITE_DIAGNOSTICS/; }
    if (kind === 'failed-suites-cli') { copiedLog += '\n\u001b[31mFailed Suites 1\u001b[0m\n'; guard = /NO_CLI_INFRASTRUCTURE/; }
    if (kind === 'unhandled-cli') { copiedLog += '\nVitest caught 1 unhandled error during the test run.\n'; guard = /NO_CLI_INFRASTRUCTURE/; }
    const raw = Buffer.from(JSON.stringify(copied));
    assert(JSON.stringify(copied) !== JSON.stringify(value) || copiedLog !== text, 'COPIED_DIAGNOSTIC_SEMANTIC_CHANGE');
    assert(sha(raw) !== sha(reportRaw) || sha(copiedLog) !== sha(logRaw), 'COPIED_DIAGNOSTIC_BYTES_CHANGED');
    write('copied-' + kind + '.json', copied); fs.writeFileSync(path.join(OUT, 'copied-' + kind + '.log'), copiedLog);
    assert.throws(() => admit(copied, copiedLog), guard, 'Specific copied diagnostic rejection');
    assert.deepEqual(admit(JSON.parse(reportRaw), text), actual, 'Original readmitted');
    controls.push({ kind, copiedOnly: true, changed: true, rejected: true, originalReadmitted: true });
  }
  assert.equal(sha(fs.readFileSync(report)), sha(reportRaw)); assert.equal(sha(fs.readFileSync(log)), sha(logRaw));
  write('FOCUSED-ADMISSION.json', { status: 'EARLY_TYPES_AND_37_CASES_ONLY', actual, copiedDiagnostics: controls,
    limits: 'No physical feature controls, full suite, baseline/default paired runner, build, readers, caps, browser or visual qualification from this early gate.' });
  console.log('PASS early recruitment focused:37 actual cases,0 skips,3 changed copied diagnostic refusals/restores');
}
for (const file of sourcePins) assert.equal(sha(fs.readFileSync(file.path)), file.sha256, 'Critical source held ' + file.path);
write('source-held.json', { sourcePins, held: true });
