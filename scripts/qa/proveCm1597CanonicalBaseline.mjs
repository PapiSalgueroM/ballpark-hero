import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
const CONTRACT = {"schema":1,"status":"BOUND_SOURCE_ONLY_CAUSAL_BASELINE_UNRUN","product":"f5ecd0f9f31c9603a4f8ae095e8b06ac5686c47c","productTree":"3c71787c5bf5e84f8346a5248b8700840475c1a3","productParent":"d4558a9e7a5d2f7e8f05f329578aac6ccad9bdb0","productParentTree":"5113319e10b5254ae7a3721a4c086e934b2fa16e","productFiles":5461,"proofFiles":5467,"branch":"codex/cm-1597-canonical-links-baseline-20261030","engine":{"path":"src/lib/clubManager.ts","sha256":"77833608422e167b62d9d8da6b8a3ad6c988effbdc699d768c0a99def6c1ffeb","bytes":1253430,"gitBlob":"ebe9f28efdb1d4fbba289f8a92a166d82f607c09"},"files":[{"file":"src/test/cmFreeAgentContinuity.test.ts","sha256":"63444df9baacfbf418dca0e479ab2e6a3bf0d8064b255e2b3ec2c296b1d5f133","gitBlob":"9dc0568ee56338b5c932c9fed0c4df20d1879ba1","cases":[{"ancestorTitles":["Club Manager free-agent continuity"],"title":"recovers a naturally expired player in the arrival season without a cheaper contract","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"restores a later free-agent signing with the same identity and durable development","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"uses renewal wage and fee floors when an expired player returns","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps a promoted academy identity after expiry and reload","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps manual release embargoes and ordinary signing limits","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps summer retirement terminal instead of listing the player as free","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"loads legacy thin free agents without guessing an ambiguous world identity","baseline":"preserve"}]},{"file":"src/test/cmFreeAgentLegacyIdentity.test.ts","sha256":"334a78d061b0d20c1beee2cfea3e4e09a2603b2ac5aac41eebb2bf405c9d302d","gitBlob":"ad3658dafa3c3ec8ff79f1849f94c8793a01cea8","cases":[{"ancestorTitles":["Club Manager legacy free-agent identity"],"title":"keeps a verified youth pad fictional when a thin legacy pool row omits generated","baseline":"preserve"}]},{"file":"src/test/cmFreeAgentRetention.test.ts","bytes":7819,"sha256":"d5de9e491e3bcb9ad29b5d38364c4eb0f8dc77f95f31b2ee5823a53b646db1a7","gitBlob":"0b2cab5ce6eae125a6bc73c794460796491d6177","cases":[{"title":"keeps a living naturally expired player available after the third summer and reload","ancestorTitles":["Club Manager long free-agent retention"],"baseline":"preserve"},{"title":"removes canonical retirees and preserves ordinary pool expiry and manual release guards","ancestorTitles":["Club Manager long free-agent retention"],"baseline":"preserve"}]},{"file":"src/test/cmFreeAgentCanonicalLinks.test.ts","bytes":11053,"sha256":"b4b1d39ab91c04172cbded97bb28c82b4ec0a8309d3f6315933fd14cf7da84c2","gitBlob":"e8e89d72991afe1f3a7413f29617c167b45a2d02","cases":[{"ancestorTitles":["Club Manager canonical free-agent links"],"title":"ages a keyed expired player through its own canonical record when a namesake exists","baseline":"ownedRed","marker":"CM_FA_JOIN_KEYED_SUMMER"},{"ancestorTitles":["Club Manager canonical free-agent links"],"title":"recovers an old-save release with its known key across reload and the next summer","baseline":"ownedRed","marker":"CM_FA_JOIN_RECOVERY_KEY"}]}],"originalCorpus":{"path":"scripts/fixtures/cmFreeAgencyOldSaves.json","commit":"d6d0244472cf3fba61d1ad85e10cce1d75740968","sha256":"f6ad7d901d2775a01c21de91f3279b2ab33ea05b74af7b1e7d9c0f099ee85747","gitBlob":"ae715b108a141bf5be5920cdcfdba185cdeba243","bytes":287840},"proofAdditions":[".github/workflows/cm-1597-canonical-baseline.yml","scripts/qa/proveCm1597CanonicalBaseline.mjs","src/test/cmFreeAgentRetention.test.ts","src/test/cmFreeAgentCanonicalLinks.test.ts","src/test/fixtures/cmCanonicalLinks/collision.career.json","src/test/fixtures/cmCanonicalLinks/recovery.career.json"],"futureOnlyMarkers":["CM_FA_JOIN_KEYED_SUMMER","CM_FA_JOIN_RECOVERY_KEY"],"excluded":"Both canonical lookup repairs, K UI/harness/floors, simultaneous namesake-wide pool/signing support and every unrelated app change remain unadopted","fixtures":[{"file":"src/test/fixtures/cmCanonicalLinks/collision.career.json","bytes":63354,"sha256":"41a8e89fd30fcb16e0e4e174cefa08c3e133c7de4da40e00fdc2b5d07718ce7c","gitBlob":"1f7aa1bf04bbcdd597b453efa807692a8152b790"},{"file":"src/test/fixtures/cmCanonicalLinks/recovery.career.json","bytes":203475,"sha256":"d28b73b9da0ad2b2aaee65a69e1fa55c471127df554814baacb5807de2758167","gitBlob":"eed382fe2499c445a35a2b2bb658d57e014752cf"}],"discoveryAdmission":{"run":41028481290,"attempt":1,"artifact":12964841925,"receiptSHA256":"bb578e46af92002c5296771825e6d6f8e230f890940a8bf73401879636203823","profileSHA256":"8553913dccf0255d91d094841d2f611d0272c1486f501d6653351430db13f8ab"}}; // FIXED_SOURCE_CONTRACT
const REPORTER_PINS = [
  ['node_modules/vitest/dist/reporters.js', '374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
  ['node_modules/vitest/dist/chunks/index.VByaPkjc.js', '59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
  ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js', '4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
  ['node_modules/@vitest/runner/dist/chunk-hooks.js', '5e0b0ece2242e3475a0312a375fac6e47287602792d7f4999d2d733ecda2d69a'],
];
const checkout = process.cwd(), out = process.env.CM_JOIN_OUT;
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const git = args => execFileSync('git', ['-C', checkout, ...args], { maxBuffer: 1 << 29 });
const key = row => JSON.stringify([row.file, row.ancestorTitles, row.title]);
const cases = CONTRACT.files.flatMap(file => file.cases.map(row => ({ ...row, file: file.file })));
const root = path.join(out ?? '', 'matched-source');
function pin(file, expected) {
  const body = fs.readFileSync(file);
  if (expected.bytes !== undefined) assert.equal(body.length, expected.bytes, 'CM_JOIN_PIN_BYTES');
  assert.equal(sha(body), expected.sha256, 'CM_JOIN_PIN_SHA256');
  assert.equal(blob(body), expected.gitBlob, 'CM_JOIN_PIN_GIT'); return body;
}
function tree(ref) {
  return git(['ls-tree', '-rz', '--full-tree', ref]).toString().split('\0').filter(Boolean).map(row => {
    const m = /^(\d+) (blob) ([a-f0-9]{40})\t(.+)$/.exec(row);
    assert(m, 'CM_JOIN_REGULAR_BLOBS_ONLY'); assert(['100644', '100755'].includes(m[1]), 'CM_JOIN_EXPECTED_MODES');
    return { mode: m[1], gitBlob: m[3], path: m[4] };
  }).sort((a, b) => a.path.localeCompare(b.path));
}
function inventory(dir, prefix = '') {
  return fs.readdirSync(dir).sort().flatMap(name => {
    const rel = prefix + name, file = path.join(dir, name), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return [{ path: rel, link: fs.readlinkSync(file) }];
    if (stat.isDirectory()) return inventory(file, rel + '/');
    assert(stat.isFile(), 'CM_JOIN_FILE_MEMBERSHIP'); return [{ path: rel, bytes: stat.size, sha256: sha(fs.readFileSync(file)) }];
  });
}
function run(id, command, args, cwd = root, timeout = 600000, extraEnv = {}) {
  const dir = path.join(out, id); fs.mkdirSync(dir, { recursive: true });
  const stdout = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), stderr = fs.openSync(path.join(dir, 'stderr.log'), 'wx');
  const start = new Date().toISOString(), time = process.hrtime.bigint(); let result;
  try { result = spawnSync(command, args, { cwd, env: { ...process.env, ...extraEnv, FORCE_COLOR: '0' }, timeout, killSignal: 'SIGKILL', stdio: ['ignore', stdout, stderr] }); }
  finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  const receipt = { command, args, cwd, start, end: new Date().toISOString(), durationMs: Number(process.hrtime.bigint() - time) / 1e6, status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null };
  json(id + '/process.json', receipt); return receipt;
}
const requireZero = result => { assert.equal(result.status, 0, 'CM_JOIN_RAW_EXIT'); assert.equal(result.signal, null, 'CM_JOIN_RAW_EXIT'); assert.equal(result.error, null, 'CM_JOIN_RAW_EXIT'); };
function inspect(actual) {
  const { process: raw, report, runtime } = actual;
  assert.equal(raw.status, 1, 'CM_JOIN_RAW_EXIT'); assert.equal(raw.signal, null, 'CM_JOIN_RAW_EXIT'); assert.equal(raw.error, null, 'CM_JOIN_RAW_EXIT');
  assert.equal(runtime.arrayReceived, true, 'CM_JOIN_RUNTIME'); assert.equal(runtime.count, 0, 'CM_JOIN_RUNTIME');
  assert.deepEqual(runtime.errors, [], 'CM_JOIN_RUNTIME'); assert.deepEqual(runtime.fileErrors, [], 'CM_JOIN_RUNTIME');
  assert.equal(report.success, false, 'CM_JOIN_COUNTS'); const rows = [];
  assert.deepEqual(report.testResults.map(file => path.relative(root, file.name).split(path.sep).join('/')).sort(), CONTRACT.files.map(file => file.file).sort(), 'CM_JOIN_FILES');
  for (const file of report.testResults) {
    const relative = path.relative(root, file.name).split(path.sep).join('/'), declared = CONTRACT.files.find(row => row.file === relative);
    assert(declared, 'CM_JOIN_FILES'); assert.equal(file.message, '', 'CM_JOIN_FILE_ERROR');
    assert.equal(file.status, declared.cases.some(row => row.baseline === 'ownedRed') ? 'failed' : 'passed', 'CM_JOIN_CASE_STATUS');
    rows.push(...file.assertionResults.map(row => ({ ...row, file: relative })));
  }
  assert.equal(new Set(rows.map(key)).size, 12, 'CM_JOIN_IDENTITIES'); assert.deepEqual(rows.map(key).sort(), cases.map(key).sort(), 'CM_JOIN_IDENTITIES');
  for (const row of rows) {
    const declared = cases.find(value => key(value) === key(row)); assert(declared, 'CM_JOIN_IDENTITIES');
    assert.equal(row.fullName, [...row.ancestorTitles, row.title].join(' '), 'CM_JOIN_IDENTITIES');
    if (declared.baseline === 'ownedRed') {
      assert.equal(row.status, 'failed', 'CM_JOIN_CASE_STATUS'); assert.equal(row.failureMessages.length, 1, 'CM_JOIN_OWNED_ASSERTION');
      const firstLine = row.failureMessages[0].split('\n')[0];
      assert.match(firstLine, /^AssertionError(?:\s|\[|:)/, 'CM_JOIN_OWNED_ASSERTION');
      assert(firstLine.includes(declared.marker), 'CM_JOIN_OWNED_ASSERTION');
    } else { assert.equal(row.status, 'passed', 'CM_JOIN_CASE_STATUS'); assert.deepEqual(row.failureMessages, [], 'CM_JOIN_CASE_STATUS'); }
  }
  for (const [field, count] of Object.entries({ numTotalTests: 12, numPassedTests: 10, numFailedTests: 2, numPendingTests: 0, numTodoTests: 0, numPendingTestSuites: 0 })) assert.equal(report[field], count, 'CM_JOIN_COUNTS');
  assert(report.numPassedTestSuites > 0 && report.numFailedTestSuites > 0); assert.equal(report.numTotalTestSuites, report.numPassedTestSuites + report.numFailedTestSuites, 'CM_JOIN_COUNTS');
  return { total: 12, passed: 10, ownedAssertionReds: 2, skipped: 0, runtimeErrors: 0, exactIdentities: cases.map(key).sort(), ownedMarkers: cases.filter(row => row.baseline === 'ownedRed').map(row => row.marker) };
}
function reporter() {
  const req = createRequire(path.join(root, 'package.json')), resolved = req.resolve('vitest/reporters');
  assert.equal(fs.realpathSync(resolved), fs.realpathSync(path.join(root, 'node_modules/vitest/dist/reporters.js')), 'CM_JOIN_PHYSICAL_REPORTER');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).scripts.test, 'vitest run');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'node_modules/vitest/package.json'))).version, '3.2.7');
  fs.mkdirSync(path.join(out, 'reporter-source'));
  for (const [file, expected] of REPORTER_PINS) { const body = fs.readFileSync(path.join(root, file)); assert.equal(sha(body), expected, 'CM_JOIN_REPORTER_PIN'); fs.writeFileSync(path.join(out, 'reporter-source', path.basename(file)), body, { flag: 'wx' }); }
  const body = [
    'import { JsonReporter } from ' + JSON.stringify(pathToFileURL(resolved).href) + ';',
    "import fs from 'node:fs'; import assert from 'node:assert/strict';",
    'export default class extends JsonReporter { async onFinished(files, errors, coverage) {',
    "assert(Array.isArray(files) && Array.isArray(errors), 'CM_BASELINE_ACTUAL_ERROR_ARRAY');",
    'const clean = error => ({name:error?.name??null,message:error?.message??String(error),stack:error?.stack??null});',
    'const fileErrors=files.flatMap(file=>(file.result?.errors??[]).map(error=>({file:file.filepath,...clean(error)})));',
    "fs.writeFileSync(process.env.CM_BASELINE_RUNTIME_JSON, JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(clean),fileErrors},null,2)+'\\n',{flag:'wx'});",
    'await super.onFinished(files, errors, coverage); } }',
  ].join('\n') + '\n';
  const file = path.join(out, 'runtime-json-reporter.mjs'); fs.writeFileSync(file, body, { flag: 'wx' }); requireZero(run('reporter-syntax', process.execPath, ['--check', file]));
  json('REPORTER-BINDING.json', { file, sha256: sha(body), resolved, physical: fs.realpathSync(resolved), pins: REPORTER_PINS }); return file;
}
async function units() {
  const custom = reporter(), dir = path.join(out, 'baseline12'); fs.mkdirSync(dir);
  const actual = { process: run('baseline12', 'npm', ['test', '--', ...CONTRACT.files.map(file => file.file), '--no-cache', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=' + custom, '--outputFile.json=' + path.join(dir, 'actual.json')], root, 600000, { CM_BASELINE_RUNTIME_JSON: path.join(dir, 'runtime.json') }), report: JSON.parse(fs.readFileSync(path.join(dir, 'actual.json'))), runtime: JSON.parse(fs.readFileSync(path.join(dir, 'runtime.json'))) };
  json('baseline12/ACTUAL.json', actual); const admitted = inspect(actual), foundation = Buffer.from(JSON.stringify(actual)), controls = [];
  const working = path.join(out, 'classifier-working.json'); fs.writeFileSync(working, foundation, { flag: 'wx' });
  for (const [id, marker, mutate] of [
    ['raw', 'CM_JOIN_RAW_EXIT', value => { value.process.status = 0; }],
    ['identity', 'CM_JOIN_IDENTITIES', value => { value.report.testResults[0].assertionResults[0].title += ' changed'; }],
    ['runtime', 'CM_JOIN_RUNTIME', value => { value.runtime.count = 1; value.runtime.errors = [{ name: 'OwnedCopyControl', message: 'copied classifier input only' }]; }],
  ]) {
    const changed = JSON.parse(foundation); mutate(changed); fs.writeFileSync(working, JSON.stringify(changed)); assert.notEqual(sha(fs.readFileSync(working)), sha(foundation));
    let refused; try { inspect(JSON.parse(fs.readFileSync(working))); } catch (error) { refused = error; } finally { fs.writeFileSync(working, foundation); }
    assert(refused instanceof assert.AssertionError && refused.message.includes(marker), 'CM_JOIN_CLASSIFIER_CONTROL'); assert.deepEqual(fs.readFileSync(working), foundation); inspect(JSON.parse(fs.readFileSync(working)));
    controls.push({ id, marker, beforeSHA256: sha(foundation), changedSHA256: sha(Buffer.from(JSON.stringify(changed))), restoredSHA256: sha(fs.readFileSync(working)), refusal: { name: refused.name, message: refused.message }, productPassCredit: false });
    json('classifier-' + id + '-changed.json', changed);
  }
  json('CLASSIFIER-CONTROLS.json', controls); json('BASELINE12-ADMISSION.json', admitted); return admitted;
}
assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? ''), 'CM_JOIN_REMOTE_ONLY');
assert.equal(process.env.GITHUB_REF, 'refs/heads/' + CONTRACT.branch, 'CM_JOIN_BRANCH');
assert(path.isAbsolute(out ?? '') && fs.realpathSync(out) === out && !out.startsWith(checkout + path.sep) && out !== checkout, 'CM_JOIN_EXTERNAL_OUTPUT');
assert.equal(cases.length, 12); assert.equal(CONTRACT.status, 'BOUND_SOURCE_ONLY_CAUSAL_BASELINE_UNRUN');
let sourceRows, initial, dependencies, prepared = false, failure, admission;
try {
  assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA, 'CM_JOIN_HEAD');
  assert.equal(git(['rev-list', '--parents', '-n1', 'HEAD']).toString().trim(), process.env.GITHUB_SHA + ' ' + CONTRACT.product, 'CM_JOIN_PROOF_SOLE_CHILD');
  assert.equal(git(['rev-list', '--parents', '-n1', CONTRACT.product]).toString().trim(), CONTRACT.product + ' ' + CONTRACT.productParent, 'CM_JOIN_PRODUCT_SOLE_PARENT');
  assert.equal(git(['rev-parse', CONTRACT.product + '^{tree}']).toString().trim(), CONTRACT.productTree);
  assert.equal(git(['rev-parse', CONTRACT.productParent + '^{tree}']).toString().trim(), CONTRACT.productParentTree);
  const prior = tree(CONTRACT.productParent), product = tree(CONTRACT.product); sourceRows = tree('HEAD');
  assert.equal(prior.length, CONTRACT.productFiles); assert.equal(product.length, CONTRACT.productFiles); assert.equal(sourceRows.length, CONTRACT.proofFiles);
  const changed = product.filter(row => JSON.stringify(row) !== JSON.stringify(prior.find(value => value.path === row.path)));
  assert.deepEqual(changed.map(row => row.path), [CONTRACT.engine.path], 'CM_JOIN_ONLY_ENGINE_JOIN');
  assert.equal(changed[0].gitBlob, CONTRACT.engine.gitBlob);
  assert.deepEqual(prior.map(row => row.path), product.map(row => row.path), 'CM_JOIN_ALL_OTHER_PRODUCT_PATHS_HELD');
  const additions = sourceRows.filter(row => !product.some(value => value.path === row.path));
  assert.deepEqual(additions.map(row => row.path).sort(), CONTRACT.proofAdditions.slice().sort(), 'CM_JOIN_ONLY_SIX_PROOF_ADDITIONS');
  assert(additions.every(row => row.mode === '100644'));
  assert.deepEqual(sourceRows.filter(row => !additions.includes(row)), product, 'CM_JOIN_PRODUCT_HELD');
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']).toString(), '', 'CM_JOIN_INITIAL_CLEAN_SOURCE');
  initial = { head: git(['rev-parse', 'HEAD']).toString(), refs: git(['show-ref']).toString(), indexSHA256: sha(fs.readFileSync(path.join(checkout, git(['rev-parse', '--git-path', 'index']).toString().trim()))) };
  json('SOURCE-TOPOLOGY.json', { contract: CONTRACT, proof: process.env.GITHUB_SHA, sourceRows, productRows: product, productOnlyChange: changed, proofOnlyAdditions: additions });
  fs.writeFileSync(path.join(out, 'source-before.tar'), git(['archive', '--format=tar', 'HEAD']), { flag: 'wx' });
  fs.mkdirSync(root); requireZero(run('extract', 'tar', ['-xf', path.join(out, 'source-before.tar'), '-C', root], checkout, 120000));
  fs.symlinkSync(path.join(checkout, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  pin(path.join(root, CONTRACT.engine.path), CONTRACT.engine);
  for (const file of [...CONTRACT.files, ...CONTRACT.fixtures]) pin(path.join(root, file.file), file);
  json('FIXTURE-PINS-BEFORE-PAYLOAD.json', CONTRACT.fixtures);
  dependencies = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-BEFORE.json', dependencies); prepared = true;
  requireZero(run('app-types', path.join(root, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json'], root, 300000));
  admission = await units();
} catch (error) { failure ??= error; json('DIAGNOSTIC-ERROR.json', { name: error.name, message: error.message, stack: error.stack }); }
finally {
  if (prepared) {
    try {
      for (const dir of [checkout, root]) {
        for (const row of sourceRows) {
          const file = path.join(dir, row.path), body = fs.readFileSync(file); assert.equal(blob(body), row.gitBlob, 'CM_JOIN_SOURCE_BODY_HELD:' + row.path);
          assert.equal(Boolean(fs.statSync(file).mode & 0o111), row.mode === '100755', 'CM_JOIN_SOURCE_MODE_HELD:' + row.path);
        }
      }
      const members = inventory(root).filter(row => row.path !== 'node_modules');
      assert(members.every(row => !('link' in row)), 'CM_JOIN_NO_UNEXPECTED_SOURCE_SYMLINK');
      assert.deepEqual(members.map(row => row.path).sort(), sourceRows.map(row => row.path).sort(), 'CM_JOIN_MATCHED_MEMBERSHIP_HELD');
      assert.equal(fs.realpathSync(path.join(root, 'node_modules')), fs.realpathSync(path.join(checkout, 'node_modules')), 'CM_JOIN_PHYSICAL_DEPS_HELD');
      const finalDeps = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-AFTER.json', finalDeps);
      const beforeMap = new Map(dependencies.map(row => [row.path, row])), added = finalDeps.filter(row => !beforeMap.has(row.path));
      assert(added.length <= 1, 'CM_JOIN_ONLY_RESULT_CACHE_ADDITION');
      assert.deepEqual(finalDeps.filter(row => beforeMap.has(row.path)), dependencies, 'CM_JOIN_ORIGINAL_DEPS_HELD');
      const cache = [];
      for (const row of added) {
        assert.equal(row.path, '.vite/vitest/' + createHash('sha1').update('').digest('hex') + '/results.json', 'CM_JOIN_EXACT_CACHE_PATH');
        const body = fs.readFileSync(path.join(checkout, 'node_modules', row.path)), data = JSON.parse(body);
        assert.deepEqual(Object.keys(data).sort(), ['results', 'version']); assert.equal(data.version, '3.2.7'); assert.equal(data.results.length, 4);
        assert.deepEqual(data.results.map(value => value[0]).sort(), CONTRACT.files.map(file => ':' + file.file).sort(), 'CM_JOIN_CACHE_IDENTITIES');
        for (const value of data.results) { assert.equal(value.length, 2); assert.deepEqual(Object.keys(value[1]).sort(), ['duration', 'failed']); assert.equal(value[1].failed, CONTRACT.files.find(file => ':' + file.file === value[0]).cases.some(row => row.baseline === 'ownedRed')); assert(Number.isFinite(value[1].duration) && value[1].duration >= 0); }
        fs.writeFileSync(path.join(out, 'default-vitest-results-cache.json'), body, { flag: 'wx' }); cache.push(row);
      }
      assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']).toString(), '', 'CM_JOIN_CHECKOUT_MEMBERSHIP_HELD');
      assert.equal(git(['rev-parse', 'HEAD']).toString(), initial.head, 'CM_JOIN_HEAD_HELD'); assert.equal(git(['show-ref']).toString(), initial.refs, 'CM_JOIN_REFS_HELD');
      assert.equal(sha(fs.readFileSync(path.join(checkout, git(['rev-parse', '--git-path', 'index']).toString().trim()))), initial.indexSHA256, 'CM_JOIN_INDEX_HELD');
      requireZero(run('archive-final', 'tar', ['-cf', path.join(out, 'matched-final.tar'), '--exclude=./node_modules', '-C', root, '.'], checkout, 120000));
      json('FINAL-HOLDS.json', { status: 'HELD', trackedBodiesAndModes: sourceRows.length, matchedMembership: true, sourceIndexAndRefs: true, originalDependencyBodiesAndMembership: dependencies.length, exactGeneratedResultCache: cache, immutableAppPaths: true, outsideOnlyOutputs: true });
    } catch (error) { failure ??= error; json('FINAL-HOLDS-ERROR.json', { name: error.name, message: error.message, stack: error.stack }); }
  } else json('FINAL-HOLDS-NOT-REACHED.json', { status: 'SETUP_INCOMPLETE_NO_QUALIFICATION' });
}
json('COMPLETION.json', { status: failure ? 'BASELINE_REFUSED_NO_FIX_AUTHORIZED' : 'ACTUAL_TWO_OWNED_REDS_TEN_PRESERVES_NO_PRODUCT_ADOPTION', product: CONTRACT.product, engine: CONTRACT.engine.gitBlob, baseline12: admission ?? null, sourceHolds: fs.existsSync(path.join(out, 'FINAL-HOLDS.json')), canonicalRepair: 'UNAUTHORED', kUiHarnessFloors: 'NOT_ADOPTED', namesakeWideSupport: 'UNCLAIMED', build: 'UNRUN', browser: 'UNRUN', fullSuiteAndSims: 'UNRUN', caps: 'UNRUN', compatibilityWithMain: 'SEPARATE_UNPROVEN', featureReady: false, failure: failure ? { name: failure.name, message: failure.message } : null });
if (failure) { console.error(failure); process.exitCode = 1; } else console.log('CM1597_CANONICAL_BASELINE: actual12 identities,2 owned AssertionError reds,10 preservation passes and0 runtime errors; no product adoption.');
