import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

// Root binds this exact declaration after both test leaves have independent source review.
const CONTRACT = {
  "status": "BOUND",
  "files": [
    {
      "file": "src/test/cmFreeAgentContinuity.test.ts",
      "sha256": "55cb4b3d18d8b351b14a288bb3ffe154d99192ed2d20d6f7e9edcbf1e770781e",
      "gitBlob": "8c67f676dcb4ee0072a091ca56175c8897da4407",
      "cases": [
        {
          "ancestorTitles": [
            "Club Manager free-agent continuity"
          ],
          "title": "recovers a naturally expired player in the arrival season without a cheaper contract",
          "baseline": "failed",
          "marker": "CM_FA_EXPIRY_RECOVERY"
        },
        {
          "ancestorTitles": [
            "Club Manager free-agent continuity"
          ],
          "title": "restores a later free-agent signing with the same identity and durable development",
          "baseline": "failed",
          "marker": "CM_FA_CANONICAL_IDENTITY"
        },
        {
          "ancestorTitles": [
            "Club Manager free-agent continuity"
          ],
          "title": "uses renewal wage and fee floors when an expired player returns",
          "baseline": "failed",
          "marker": "CM_FA_RENEWAL_WAGE"
        },
        {
          "ancestorTitles": [
            "Club Manager free-agent continuity"
          ],
          "title": "keeps a promoted academy identity after expiry and reload",
          "baseline": "failed",
          "marker": "CM_FA_ACADEMY_CANONICAL_RETENTION"
        },
        {
          "ancestorTitles": [
            "Club Manager free-agent continuity"
          ],
          "title": "keeps manual release embargoes and ordinary signing limits",
          "baseline": "passed"
        },
        {
          "ancestorTitles": [
            "Club Manager free-agent continuity"
          ],
          "title": "keeps summer retirement terminal instead of listing the player as free",
          "baseline": "passed"
        },
        {
          "ancestorTitles": [
            "Club Manager free-agent continuity"
          ],
          "title": "loads legacy thin free agents without guessing an ambiguous world identity",
          "baseline": "passed"
        }
      ],
      "fixtures": []
    },
    {
      "file": "src/test/cmMarketMaxPrice.test.tsx",
      "sha256": "c8536dcc1f0654f4ef5b0f29ccd1546b423f35a905cc51dedea16fff8701a7fa",
      "gitBlob": "8bcbd466ec9fcbac7375fca053f51ef5872369d9",
      "cases": [
        {
          "ancestorTitles": [
            "Club Manager exact maximum asking price"
          ],
          "title": "keeps existing price presets and the default Buy results unchanged",
          "baseline": "passed"
        },
        {
          "ancestorTitles": [
            "Club Manager exact maximum asking price"
          ],
          "title": "includes the exact asking-price boundary and excludes the next higher ask",
          "baseline": "failed",
          "marker": "CM_MAX_ASK_BOUNDARY_CONTROL_MISSING"
        },
        {
          "ancestorTitles": [
            "Club Manager exact maximum asking price"
          ],
          "title": "filters public asking prices without using stored market values",
          "baseline": "failed",
          "marker": "CM_MAX_ASK_PUBLIC_CONTROL_MISSING"
        },
        {
          "ancestorTitles": [
            "Club Manager exact maximum asking price"
          ],
          "title": "applies the asking-price ceiling before the fifty-result limit",
          "baseline": "failed",
          "marker": "CM_MAX_ASK_SLICE_CONTROL_MISSING"
        },
        {
          "ancestorTitles": [
            "Club Manager exact maximum asking price"
          ],
          "title": "clears the custom ceiling and keeps preset shortcuts usable",
          "baseline": "failed",
          "marker": "CM_MAX_ASK_CLEAR_CONTROL_MISSING"
        },
        {
          "ancestorTitles": [
            "Club Manager exact maximum asking price"
          ],
          "title": "rejects malformed ceilings without silently parsing a partial number",
          "baseline": "failed",
          "marker": "CM_MAX_ASK_INVALID_CONTROL_MISSING"
        },
        {
          "ancestorTitles": [
            "Club Manager exact maximum asking price"
          ],
          "title": "uses each selected currency symbol without converting the asking-price amount",
          "baseline": "failed",
          "marker": "CM_MAX_ASK_CURRENCY_CONTROL_MISSING"
        }
      ],
      "fixtures": []
    }
  ]
};
const APP_PINS = [
  ['src/lib/clubManager.ts', '4ce178814d8fb9de0564b32488d57c0fc75d91d6', 1241789],
  ['src/hooks/useClubManager.ts', '7297073ea60b93501df48ea9b7dfc74edd2217de', 70744],
  ['src/components/club-manager/TransferScreen.tsx', 'b310a2b8371130272106bdb3e2f9f1377807d355', 77950],
  ['src/components/club-manager/ContractsCard.tsx', 'bf8eff4c94da3d3e172447a62ef0f2c61017cb9c', 27697],
];
const REPORTER_PINS = [
  ['node_modules/vitest/dist/reporters.js', '374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
  ['node_modules/vitest/dist/chunks/index.VByaPkjc.js', '59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
  ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js', '4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
  ['node_modules/@vitest/runner/dist/chunk-hooks.js', '5e0b0ece2242e3475a0312a375fac6e47287602792d7f4999d2d733ecda2d69a'],
];
const root = process.cwd(), out = process.env.CM_MARKET_BASELINE_OUT;
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex');
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const key = row => JSON.stringify([row.file, row.ancestorTitles, row.title]);
const relative = file => path.relative(root, file).split(path.sep).join('/');
const declared = CONTRACT.files.flatMap(file => (file.cases ?? []).map(row => ({ ...row, file: file.file })));

function inspect(actual) {
  assert.equal(actual.process.status, 1, 'CM_BASELINE_RAW_EXIT');
  assert.equal(actual.process.signal, null, 'CM_BASELINE_RAW_EXIT');
  assert.equal(actual.process.error, null, 'CM_BASELINE_RAW_EXIT');
  assert.equal(actual.runtime.arrayReceived, true, 'CM_BASELINE_RUNTIME_ERRORS');
  assert.equal(actual.runtime.count, 0, 'CM_BASELINE_RUNTIME_ERRORS');
  assert.deepEqual(actual.runtime.errors, [], 'CM_BASELINE_RUNTIME_ERRORS');
  assert.deepEqual(actual.runtime.fileErrors, [], 'CM_BASELINE_RUNTIME_ERRORS');
  const report = actual.report, rows = [];
  assert.equal(report.success, false, 'CM_BASELINE_COUNTERS');
  assert.deepEqual(report.testResults.map(file => relative(file.name)).sort(), CONTRACT.files.map(file => file.file).sort(), 'CM_BASELINE_FILES');
  for (const file of report.testResults) {
    assert.equal(file.message, '', 'CM_BASELINE_FILE_METHOD_FAILURE');
    assert(file.assertionResults.length > 0, 'CM_BASELINE_EMPTY_FILE');
    assert.equal(file.status, 'failed', 'CM_BASELINE_FILE_STATUS');
    for (const row of file.assertionResults) rows.push({ ...row, file: relative(file.name) });
  }
  assert.equal(new Set(rows.map(key)).size, rows.length, 'CM_BASELINE_IDENTITIES');
  assert.deepEqual(rows.map(key).sort(), declared.map(key).sort(), 'CM_BASELINE_IDENTITIES');
  for (const expected of declared) {
    const row = rows.find(value => key(value) === key(expected));
    assert.equal(row.fullName, [...row.ancestorTitles, row.title].join(' '), 'CM_BASELINE_IDENTITIES');
    if (expected.baseline === 'passed') {
      assert.equal(row.status, 'passed', 'CM_BASELINE_PRESERVATION');
      assert.deepEqual(row.failureMessages, [], 'CM_BASELINE_PRESERVATION');
    } else {
      assert.equal(row.status, 'failed', 'CM_BASELINE_TARGET_STATUS');
      assert.equal(row.failureMessages.length, 1, 'CM_BASELINE_ASSERTION_ERROR');
      assert.match(row.failureMessages[0], /^AssertionError(?:\s|\[|:)/, 'CM_BASELINE_ASSERTION_ERROR');
      assert(row.failureMessages[0].includes(expected.marker), 'CM_BASELINE_FAILURE_MARKER');
    }
  }
  const failed = declared.filter(row => row.baseline === 'failed').length;
  assert.equal(report.numTotalTests, rows.length, 'CM_BASELINE_COUNTERS');
  assert.equal(report.numFailedTests, failed, 'CM_BASELINE_COUNTERS');
  assert.equal(report.numPassedTests, rows.length - failed, 'CM_BASELINE_COUNTERS');
  assert.equal(report.numPendingTests, 0, 'CM_BASELINE_COUNTERS');
  assert.equal(report.numTodoTests, 0, 'CM_BASELINE_COUNTERS');
  assert.equal(report.numPendingTestSuites, 0, 'CM_BASELINE_COUNTERS');
  assert.equal(report.numTotalTestSuites, report.numPassedTestSuites + report.numFailedTestSuites, 'CM_BASELINE_COUNTERS');
  assert(report.numFailedTestSuites > 0, 'CM_BASELINE_COUNTERS');
  return { files: report.testResults.length, total: rows.length, passed: rows.length - failed, failed, pending: 0, rows };
}

assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? ''), 'REMOTE_BASELINE_ONLY');
assert(out && path.isAbsolute(out) && !path.resolve(out).startsWith(root + path.sep) && path.resolve(out) !== root, 'BASELINE_OUTPUT_OUTSIDE_SOURCE');
assert.equal(CONTRACT.status, 'BOUND', 'CM_BASELINE_CONTRACT_UNBOUND');
for (const file of CONTRACT.files) {
  assert(/^[a-f0-9]{64}$/.test(file.sha256 ?? '') && /^[a-f0-9]{40}$/.test(file.gitBlob ?? ''), 'CM_BASELINE_LEAF_PIN');
  const body = fs.readFileSync(file.file);
  assert.equal(sha(body), file.sha256, 'CM_BASELINE_LEAF_PIN'); assert.equal(blob(body), file.gitBlob, 'CM_BASELINE_LEAF_PIN');
  assert(Array.isArray(file.cases) && file.cases.some(row => row.baseline === 'passed') && file.cases.some(row => row.baseline === 'failed'), 'CM_BASELINE_CASE_CONTRACT');
  assert(Array.isArray(file.fixtures), 'CM_BASELINE_FIXTURE_CONTRACT');
  for (const row of file.cases) {
    assert(Array.isArray(row.ancestorTitles) && typeof row.title === 'string' && row.title, 'CM_BASELINE_CASE_CONTRACT');
    assert(['passed', 'failed'].includes(row.baseline), 'CM_BASELINE_CASE_CONTRACT');
    if (row.baseline === 'failed') assert(typeof row.marker === 'string' && /^CM_[A-Z0-9_]+$/.test(row.marker), 'CM_BASELINE_CASE_CONTRACT');
  }
}
const markers = declared.filter(row => row.baseline === 'failed').map(row => row.marker);
assert.equal(new Set(markers).size, markers.length, 'CM_BASELINE_UNIQUE_TARGET_MARKERS');
for (const [file, expectedBlob, expectedBytes] of APP_PINS) { const body = fs.readFileSync(file); assert.equal(body.length, expectedBytes); assert.equal(blob(body), expectedBlob, 'CM_BASELINE_APP_SOURCE_HELD'); }
assert.equal(JSON.parse(fs.readFileSync('package.json')).scripts.test, 'vitest run', 'CM_BASELINE_DEFAULT_TEST_SCRIPT');
assert.equal(JSON.parse(fs.readFileSync('node_modules/vitest/package.json')).version, '3.2.7', 'CM_BASELINE_REPORTER_VERSION');
const dir = path.join(out, 'units'); fs.mkdirSync(dir);
json(path.join(dir, 'bound-contract.json'), CONTRACT);
const sourceDir = path.join(dir, 'reporter-source'); fs.mkdirSync(sourceDir);
for (const [file, expected] of REPORTER_PINS) { const body = fs.readFileSync(file); assert.equal(sha(body), expected, 'CM_BASELINE_REPORTER_PIN'); fs.writeFileSync(path.join(sourceDir, path.basename(file)), body, { flag: 'wx' }); }
const rootRequire = createRequire(path.join(root, 'package.json'));
const resolved = fs.realpathSync(rootRequire.resolve('vitest/reporters'));
assert.equal(resolved, fs.realpathSync('node_modules/vitest/dist/reporters.js'), 'CM_BASELINE_CANONICAL_REPORTER');
const runtimeFile = path.join(dir, 'actual-runtime-errors.json'), reportFile = path.join(dir, 'vitest.json'), reporterFile = path.join(dir, 'runtime-json-reporter.mjs');
const reporter = [
  'import { JsonReporter } from ' + JSON.stringify(pathToFileURL(resolved).href) + ';',
  "import fs from 'node:fs'; import assert from 'node:assert/strict';",
  'export default class extends JsonReporter { async onFinished(files, errors, coverage) {',
  "assert(Array.isArray(files) && Array.isArray(errors), 'CM_BASELINE_ACTUAL_ERROR_ARRAY');",
  'const clean = error => ({name:error?.name??null,message:error?.message??String(error),stack:error?.stack??null});',
  'const fileErrors=files.flatMap(file=>(file.result?.errors??[]).map(error=>({file:file.filepath,...clean(error)})));',
  "fs.writeFileSync(process.env.CM_BASELINE_RUNTIME_JSON, JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(clean),fileErrors},null,2)+'\\n',{flag:'wx'});",
  'await super.onFinished(files, errors, coverage); } }',
].join('\n') + '\n';
fs.writeFileSync(reporterFile, reporter, { flag: 'wx' });
const reporterSyntax = spawnSync(process.execPath, ['--check', reporterFile], { encoding: 'utf8', timeout: 10000 });
json(path.join(dir, 'reporter-syntax.process.json'), { status: reporterSyntax.status, signal: reporterSyntax.signal, error: reporterSyntax.error ? String(reporterSyntax.error) : null });
fs.writeFileSync(path.join(dir, 'reporter-syntax.stdout.log'), reporterSyntax.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(dir, 'reporter-syntax.stderr.log'), reporterSyntax.stderr ?? '', { flag: 'wx' });
assert.equal(reporterSyntax.status, 0, 'CM_BASELINE_REPORTER_SYNTAX');
assert.equal(reporterSyntax.signal, null, 'CM_BASELINE_REPORTER_SYNTAX');
json(path.join(dir, 'reporter-binding.json'), { resolved, canonicalComparison: true, sha256: sha(reporter), pins: REPORTER_PINS });
const args = ['test', '--', ...CONTRACT.files.map(file => file.file), '--no-cache', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=' + reporterFile, '--outputFile.json=' + reportFile];
const unset = ['TYCOON_AWAY_CONTROL','COMPLETION_HOOK','OWNED_TIMEOUTS_HOOK','CONQUEST_NBA_HOOK','CONQUEST_NBA_BOARD','POLL_FIXTURES','US_BOARD_CONTROL_ALIAS','US_BOARD_CONTROL_FILE','DAILY_RECORD_CONTROL','TYCOON_ROOMS_PAGE','TYCOON_LOADS_STADIUM_HOOK','TYCOON_LOADS_ACADEMY_HOOK','TYCOON_LOADS_STADIUM_LIB','TYCOON_LOADS_ACADEMY_LIB','TYCOON_PITCH_COMPONENT','TYCOON_PACKS_REWARDS','TYCOON_PACKS_PANEL','NO_DOUBLE_SWAP'];
const env = { ...process.env, CM_BASELINE_RUNTIME_JSON: runtimeFile, CM_MARKET_BASELINE_FIXTURES_OUT: path.join(out, 'fixtures') }; for (const name of unset) delete env[name];
json(path.join(dir, 'ordinary-environment.json'), { unset, config: 'vitest.config.ts', aliasOverrides: false, scopedFiles: CONTRACT.files.map(file => file.file) });
const stdout = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), stderr = fs.openSync(path.join(dir, 'stderr.log'), 'wx'); let child;
try { child = spawnSync('npm', args, { cwd: root, env, timeout: 480000, stdio: ['ignore', stdout, stderr] }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
const processRecord = { executable: 'npm', args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
json(path.join(dir, 'process.json'), processRecord); fs.writeFileSync(path.join(dir, 'raw.exit'), String(child.status) + '\n', { flag: 'wx' });
assert.equal(sha(fs.readFileSync(reporterFile)), sha(reporter), 'CM_BASELINE_REPORTER_HELD');
const actual = { process: processRecord, report: JSON.parse(fs.readFileSync(reportFile)), runtime: JSON.parse(fs.readFileSync(runtimeFile)) };
const counts = inspect(actual), foundation = Buffer.from(JSON.stringify(actual, null, 2) + '\n');
const fixtureRows = [];
for (const file of CONTRACT.files) for (const name of file.fixtures) {
  assert(typeof name === 'string' && name && !path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'CM_BASELINE_FIXTURE_PATH');
  const body = fs.readFileSync(path.join(out, 'fixtures', name));
  fixtureRows.push({ declaredBy:file.file, path:name, bytes:body.length, sha256:sha(body), gitBlob:blob(body) });
}
fs.writeFileSync(path.join(dir, 'classifier-foundation.json'), foundation, { flag: 'wx' });
const working = path.join(dir, 'classifier-working.json'), controls = []; fs.writeFileSync(working, foundation, { flag: 'wx' });
const failureRow = value => value.report.testResults.flatMap(file => file.assertionResults).find(row => row.status === 'failed');
const passingRow = value => value.report.testResults.flatMap(file => file.assertionResults).find(row => row.status === 'passed');
for (const [id, marker, mutate] of [
  ['raw', 'CM_BASELINE_RAW_EXIT', value => { value.process.status = 0; }],
  ['file', 'CM_BASELINE_FILES', value => { value.report.testResults.pop(); }],
  ['count', 'CM_BASELINE_COUNTERS', value => { value.report.numTotalTests++; }],
  ['runtime', 'CM_BASELINE_RUNTIME_ERRORS', value => { value.runtime.count++; value.runtime.errors.push({name:'Error',message:'copy control'}); }],
  ['preservation', 'CM_BASELINE_PRESERVATION', value => { passingRow(value).status = 'failed'; }],
  ['target-marker', 'CM_BASELINE_FAILURE_MARKER', value => { failureRow(value).failureMessages = ['AssertionError: CM_UNDECLARED_COPY_CONTROL']; }],
  ['method', 'CM_BASELINE_ASSERTION_ERROR', value => { failureRow(value).failureMessages = ['TypeError: copied method failure']; }],
]) {
  const changed = structuredClone(actual); mutate(changed); const body = Buffer.from(JSON.stringify(changed, null, 2) + '\n'); assert.notDeepEqual(body, foundation);
  const changedFile = 'classifier-' + id + '.changed.json'; fs.writeFileSync(path.join(dir, changedFile), body, { flag: 'wx' }); fs.writeFileSync(working, body); let refusal;
  try { inspect(JSON.parse(fs.readFileSync(working))); } catch (error) { refusal = error; } finally { fs.writeFileSync(working, foundation); }
  assert(refusal instanceof assert.AssertionError && refusal.message.includes(marker), 'CM_BASELINE_COPY_CONTROL_REFUSAL:' + id);
  assert.deepEqual(fs.readFileSync(working), foundation); inspect(JSON.parse(fs.readFileSync(working)));
  const restoredFile = 'classifier-' + id + '.restored.json'; fs.writeFileSync(path.join(dir, restoredFile), fs.readFileSync(working), { flag: 'wx' });
  controls.push({ id, marker, changedFile, restoredFile, beforeSHA256: sha(foundation), changedSHA256: sha(body), restoredSHA256: sha(fs.readFileSync(working)), refusal: {name:refusal.name,message:refusal.message}, sameCopyRestored: true, productPassCredit: false });
}
assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'CM_BASELINE_STRICT_OFFLINE_TRANSPORT');
json(path.join(out, 'CAUSAL-BASELINE-ADMISSION.json'), { status:'EXACT_DECLARED_CM_MISSING_FEATURE_BASELINE_REPRODUCED', source:process.env.GITHUB_SHA, parent:process.env.EXPECTED_PARENT, unitRaw:child.status, ...counts, actualRuntimeErrors:0, fileErrors:0, reporterHeld:true, copiedClassifierControls:controls, fixtureContracts:CONTRACT.files.map(file=>({file:file.file,fixtures:file.fixtures})), actualRetainedFixtures:fixtureRows, sourceEndHolds:'REQUIRED_SEPARATE_ALWAYS_STEP', featureReady:false, build:'UNRUN',browser:'UNRUN',fullSEO:'UNRUN',sims:'UNRUN',fullDefaultSuite:'UNRUN_SCOPED_TWO_FILES_ONLY' });
console.log('CM_CAUSAL_BASELINE_QUALIFIED: only the exact declared missing-feature assertions failed; every preservation case passed. No product-ready claim.');