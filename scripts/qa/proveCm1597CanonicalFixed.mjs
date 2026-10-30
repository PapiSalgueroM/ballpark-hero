import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
const CONTRACT = {"schema":1,"status":"BOUND_SOURCE_ONLY_FIXED_PROOF_UNRUN","product":"94b5dda5ad9cb3365122cb4c5068d2120bac517c","productTree":"b2f27dc2a15ff87e61e42d33a03d9c818de02be6","productParent":"f5ecd0f9f31c9603a4f8ae095e8b06ac5686c47c","productParentTree":"3c71787c5bf5e84f8346a5248b8700840475c1a3","parentFiles":5461,"productFiles":5465,"proofFiles":5467,"branch":"codex/cm-1597-canonical-links-fixed-20261030","engine":{"path":"src/lib/clubManager.ts","bytes":1253412,"sha256":"07c02818b342ca5f8ba999bc1a8f8cabb5f039592b1c83fcbb9467040ff36e4d","gitBlob":"726e57cc47a173ef6e03bc066e134c43d29ad7c5","mode":"100644"},"beforeEngine":{"path":"src/lib/clubManager.ts","bytes":1253430,"sha256":"77833608422e167b62d9d8da6b8a3ad6c988effbdc699d768c0a99def6c1ffeb","gitBlob":"ebe9f28efdb1d4fbba289f8a92a166d82f607c09"},"productAdditions":[{"path":"src/test/cmFreeAgentRetention.test.ts","bytes":7819,"sha256":"d5de9e491e3bcb9ad29b5d38364c4eb0f8dc77f95f31b2ee5823a53b646db1a7","gitBlob":"0b2cab5ce6eae125a6bc73c794460796491d6177","mode":"100644"},{"path":"src/test/cmFreeAgentCanonicalLinks.test.ts","bytes":11053,"sha256":"b4b1d39ab91c04172cbded97bb28c82b4ec0a8309d3f6315933fd14cf7da84c2","gitBlob":"e8e89d72991afe1f3a7413f29617c167b45a2d02","mode":"100644"},{"path":"src/test/fixtures/cmCanonicalLinks/collision.career.json","bytes":63354,"sha256":"41a8e89fd30fcb16e0e4e174cefa08c3e133c7de4da40e00fdc2b5d07718ce7c","gitBlob":"1f7aa1bf04bbcdd597b453efa807692a8152b790","mode":"100644"},{"path":"src/test/fixtures/cmCanonicalLinks/recovery.career.json","bytes":203475,"sha256":"d28b73b9da0ad2b2aaee65a69e1fa55c471127df554814baacb5807de2758167","gitBlob":"eed382fe2499c445a35a2b2bb658d57e014752cf","mode":"100644"}],"proofAdditions":[".github/workflows/cm-1597-canonical-fixed.yml","scripts/qa/proveCm1597CanonicalFixed.mjs"],"files":[{"file":"src/test/cmFreeAgentContinuity.test.ts","sha256":"63444df9baacfbf418dca0e479ab2e6a3bf0d8064b255e2b3ec2c296b1d5f133","gitBlob":"9dc0568ee56338b5c932c9fed0c4df20d1879ba1","cases":[{"ancestorTitles":["Club Manager free-agent continuity"],"title":"recovers a naturally expired player in the arrival season without a cheaper contract","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"restores a later free-agent signing with the same identity and durable development","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"uses renewal wage and fee floors when an expired player returns","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps a promoted academy identity after expiry and reload","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps manual release embargoes and ordinary signing limits","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps summer retirement terminal instead of listing the player as free","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"loads legacy thin free agents without guessing an ambiguous world identity","baseline":"preserve"}]},{"file":"src/test/cmFreeAgentLegacyIdentity.test.ts","sha256":"334a78d061b0d20c1beee2cfea3e4e09a2603b2ac5aac41eebb2bf405c9d302d","gitBlob":"ad3658dafa3c3ec8ff79f1849f94c8793a01cea8","cases":[{"ancestorTitles":["Club Manager legacy free-agent identity"],"title":"keeps a verified youth pad fictional when a thin legacy pool row omits generated","baseline":"preserve"}]},{"file":"src/test/cmFreeAgentRetention.test.ts","bytes":7819,"sha256":"d5de9e491e3bcb9ad29b5d38364c4eb0f8dc77f95f31b2ee5823a53b646db1a7","gitBlob":"0b2cab5ce6eae125a6bc73c794460796491d6177","cases":[{"title":"keeps a living naturally expired player available after the third summer and reload","ancestorTitles":["Club Manager long free-agent retention"],"baseline":"preserve"},{"title":"removes canonical retirees and preserves ordinary pool expiry and manual release guards","ancestorTitles":["Club Manager long free-agent retention"],"baseline":"preserve"}]},{"file":"src/test/cmFreeAgentCanonicalLinks.test.ts","bytes":11053,"sha256":"b4b1d39ab91c04172cbded97bb28c82b4ec0a8309d3f6315933fd14cf7da84c2","gitBlob":"e8e89d72991afe1f3a7413f29617c167b45a2d02","cases":[{"ancestorTitles":["Club Manager canonical free-agent links"],"title":"ages a keyed expired player through its own canonical record when a namesake exists","baseline":"preserve","marker":"CM_FA_JOIN_KEYED_SUMMER"},{"ancestorTitles":["Club Manager canonical free-agent links"],"title":"recovers an old-save release with its known key across reload and the next summer","baseline":"preserve","marker":"CM_FA_JOIN_RECOVERY_KEY"}]},{"bytes":11327,"gitBlob":"8bcbd466ec9fcbac7375fca053f51ef5872369d9","file":"src/test/cmMarketMaxPrice.test.tsx","sha256":"c8536dcc1f0654f4ef5b0f29ccd1546b423f35a905cc51dedea16fff8701a7fa","cases":[{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"keeps existing price presets and the default Buy results unchanged","baseline":"preserve"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"includes the exact asking-price boundary and excludes the next higher ask","baseline":"preserve"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"filters public asking prices without using stored market values","baseline":"preserve"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"applies the asking-price ceiling before the fifty-result limit","baseline":"preserve"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"clears the custom ceiling and keeps preset shortcuts usable","baseline":"preserve"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"rejects malformed ceilings without silently parsing a partial number","baseline":"preserve"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"uses each selected currency symbol without converting the asking-price amount","baseline":"preserve"}]},{"bytes":15512,"gitBlob":"2e85487d83d47dcc69f20956525018583c46674d","file":"src/test/cmFreeAgentDiscovery.test.tsx","sha256":"0bdd5465a9e5ccb91322416f622b611c3fe2552bb543d3257d66ceb74d938b7f","cases":[{"ancestorTitles":["Club Manager free-agent discovery on Transfers"],"title":"keeps the contracts desk quotes and signing callback intact","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent discovery on Transfers"],"title":"shows the existing free-agent pool and signing terms in the open transfer window","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent discovery on Transfers"],"title":"shows the same free-agent signing action with the transfer window closed","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent discovery on Transfers"],"title":"keeps engine refusals disabled and a refused callback leaves the pool unchanged","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent discovery on Transfers"],"title":"shows an empty pool without inventing signable rows","baseline":"preserve"},{"ancestorTitles":["Club Manager free-agent discovery on Transfers"],"title":"uses the existing signing hook once and retains its actual saved deal after reload","baseline":"preserve"}]}],"fixtures":[{"file":"src/test/fixtures/cmCanonicalLinks/collision.career.json","bytes":63354,"sha256":"41a8e89fd30fcb16e0e4e174cefa08c3e133c7de4da40e00fdc2b5d07718ce7c","gitBlob":"1f7aa1bf04bbcdd597b453efa807692a8152b790"},{"file":"src/test/fixtures/cmCanonicalLinks/recovery.career.json","bytes":203475,"sha256":"d28b73b9da0ad2b2aaee65a69e1fa55c471127df554814baacb5807de2758167","gitBlob":"eed382fe2499c445a35a2b2bb658d57e014752cf"}],"sourceControls":[{"engine":{"bytes":1253453,"sha256":"d47df2c69c679d76b9b1907ff7498e0268cc58b843bfa3074cfff40646d54680","gitBlob":"2374c2819c4e36d94d9dcb2c33fc949bdae048ff"},"span":{"id":"current-year-canonical-then-next-year-key","path":"src/lib/clubManager.ts","line":7893,"before":"  const nextSeason = career.season + 1, year = worldYear(career);\n  const ahead = livingWorldOf(career) ? worldRosterView(refreshWorldRoster({ ...career, season: nextSeason })) : null;\n  const neutral = { ...career, training: DEFAULT_TRAINING, academy: undefined, facilities: undefined, staff: undefined };\n  const kept: FreeAgent[] = [];\n  for (const f of pool) {\n    if (isJourneyman(f)) { kept.push(f); continue; }\n    const held = (ahead?.records ?? []).filter(r => r.owner === null && (r.status === 'released' || r.status === 'retired')\n      && r.origin.name === f.name && r.origin.birthYear === year - f.age && r.player.position === f.position);","after":"  const nextSeason = career.season + 1;\n  const ahead = livingWorldOf(career) ? worldRosterView(refreshWorldRoster({ ...career, season: nextSeason })) : null;\n  const neutral = { ...career, training: DEFAULT_TRAINING, academy: undefined, facilities: undefined, staff: undefined };\n  const kept: FreeAgent[] = [];\n  for (const f of pool) {\n    if (isJourneyman(f)) { kept.push(f); continue; }\n    const current = freeAgentRecord(career, f);\n    const held = current ? (ahead?.records ?? []).filter(r => r.key === current.key\n      && r.owner === null && (r.status === 'released' || r.status === 'retired')) : [];","count":1},"ownedMarkers":["CM_FA_JOIN_KEYED_SUMMER"],"id":"summer"},{"engine":{"bytes":1253389,"sha256":"fe5369863c06b92926575445dfcf36a05f064d4edcd57b8ba83fee034ccc83e6","gitBlob":"b54e7a75c6d81ad98e93b087340d41966a63541a"},"span":{"id":"recovered-row-keeps-verified-key","path":"src/lib/clubManager.ts","line":7953,"before":"      founderSaleRatio: p.founderSaleRatio, since: career.season,\n      reason: mine.has(p.name) ? 'released' : 'expired', fromMyClub: true,","after":"      founderSaleRatio: p.founderSaleRatio, since: career.season,\n      reason: mine.has(p.name) ? 'released' : 'expired', fromMyClub: true, worldRosterKey: r.key,","count":1},"ownedMarkers":["CM_FA_JOIN_RECOVERY_KEY"],"id":"recovery"},{"engine":{"path":"src/lib/clubManager.ts","bytes":1253430,"sha256":"77833608422e167b62d9d8da6b8a3ad6c988effbdc699d768c0a99def6c1ffeb","gitBlob":"ebe9f28efdb1d4fbba289f8a92a166d82f607c09"},"ownedMarkers":["CM_FA_JOIN_KEYED_SUMMER","CM_FA_JOIN_RECOVERY_KEY"],"id":"whole-original"}],"causalBaseline":{"attempt":1,"originalSHA256":"602a06e910adabe90d2e1be2fe8bdc5b57304d79231484cab602fff5f9fd5125","receiptSHA256":"60fb69176a777dd5e60e507f6dbd3d9678f19db87c3ced5728ad26de4c7e5c56","run":41034820915,"proof":"4547070b0500d019a46a5cdb1b95ab160d8564f9"},"excluded":"No K UI/harness/floor adoption, name-wide support, app changes beyond the two engine spans and four frozen permanent additions, build/caps/browser/full-suite/sims/current-main/release qualification"}; // FIXED_SOURCE_CONTRACT
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

function inspect(actual, ownedMarkers = []) {
  const { process: raw, report, runtime } = actual;
  assert.equal(new Set(ownedMarkers).size, ownedMarkers.length, 'CM_FIXED_DECLARED_REDS');
  for (const marker of ownedMarkers) assert.equal(cases.filter(row => row.marker === marker).length, 1, 'CM_FIXED_DECLARED_REDS');
  const redCount = ownedMarkers.length;
  assert.equal(raw.status, redCount ? 1 : 0, 'CM_JOIN_RAW_EXIT'); assert.equal(raw.signal, null, 'CM_JOIN_RAW_EXIT'); assert.equal(raw.error, null, 'CM_JOIN_RAW_EXIT');
  assert.equal(runtime.arrayReceived, true, 'CM_JOIN_RUNTIME'); assert.equal(runtime.count, 0, 'CM_JOIN_RUNTIME');
  assert.deepEqual(runtime.errors, [], 'CM_JOIN_RUNTIME'); assert.deepEqual(runtime.fileErrors, [], 'CM_JOIN_RUNTIME');
  assert.equal(report.success, redCount === 0, 'CM_JOIN_COUNTS'); const rows = [];
  assert.deepEqual(report.testResults.map(file => path.relative(root, file.name).split(path.sep).join('/')).sort(), CONTRACT.files.map(file => file.file).sort(), 'CM_JOIN_FILES');
  for (const file of report.testResults) {
    const relative = path.relative(root, file.name).split(path.sep).join('/'), declared = CONTRACT.files.find(row => row.file === relative);
    assert(declared, 'CM_JOIN_FILES'); assert.equal(file.message, '', 'CM_JOIN_FILE_ERROR');
    assert.equal(file.status, declared.cases.some(row => ownedMarkers.includes(row.marker)) ? 'failed' : 'passed', 'CM_JOIN_CASE_STATUS');
    rows.push(...file.assertionResults.map(row => ({ ...row, file: relative })));
  }
  assert.equal(new Set(rows.map(key)).size, 25, 'CM_JOIN_IDENTITIES'); assert.deepEqual(rows.map(key).sort(), cases.map(key).sort(), 'CM_JOIN_IDENTITIES');
  for (const row of rows) {
    const declared = cases.find(value => key(value) === key(row)); assert(declared, 'CM_JOIN_IDENTITIES');
    assert.equal(row.fullName, [...row.ancestorTitles, row.title].join(' '), 'CM_JOIN_IDENTITIES');
    if (ownedMarkers.includes(declared.marker)) {
      assert.equal(row.status, 'failed', 'CM_JOIN_CASE_STATUS'); assert.equal(row.failureMessages.length, 1, 'CM_JOIN_OWNED_ASSERTION');
      const firstLine = row.failureMessages[0].split('\n')[0];
      assert.match(firstLine, /^AssertionError(?:\s|\[|:)/, 'CM_JOIN_OWNED_ASSERTION');
      assert(firstLine.includes(declared.marker), 'CM_JOIN_OWNED_ASSERTION');
    } else { assert.equal(row.status, 'passed', 'CM_JOIN_CASE_STATUS'); assert.deepEqual(row.failureMessages, [], 'CM_JOIN_CASE_STATUS'); }
  }
  for (const [field, count] of Object.entries({ numTotalTests: 25, numPassedTests: 25 - redCount, numFailedTests: redCount, numPendingTests: 0, numTodoTests: 0, numPendingTestSuites: 0 })) assert.equal(report[field], count, 'CM_JOIN_COUNTS');
  assert(Number.isInteger(report.numPassedTestSuites) && report.numPassedTestSuites > 0, 'CM_JOIN_COUNTS');
  assert(Number.isInteger(report.numFailedTestSuites) && (redCount ? report.numFailedTestSuites > 0 : report.numFailedTestSuites === 0), 'CM_JOIN_COUNTS');
  assert.equal(report.numTotalTestSuites, report.numPassedTestSuites + report.numFailedTestSuites, 'CM_JOIN_COUNTS');
  return { total: 25, passed: 25 - redCount, ownedAssertionReds: redCount, skipped: 0, runtimeErrors: 0, exactIdentities: cases.map(key).sort(), ownedMarkers };
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
let installedReporter;
async function units(id, ownedMarkers = [], engine = CONTRACT.engine) {
  const engineFile = path.join(root, CONTRACT.engine.path);
  pin(engineFile, engine);
  const custom = installedReporter ??= reporter(), dir = path.join(out, id); fs.mkdirSync(dir);
  const actual = { process: run(id, 'npm', ['test', '--', ...CONTRACT.files.map(file => file.file), '--no-cache', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=' + custom, '--outputFile.json=' + path.join(dir, 'actual.json')], root, 600000, { CM_BASELINE_RUNTIME_JSON: path.join(dir, 'runtime.json') }), report: JSON.parse(fs.readFileSync(path.join(dir, 'actual.json'))), runtime: JSON.parse(fs.readFileSync(path.join(dir, 'runtime.json'))), sourceEngine: engine };
  json(id + '/ACTUAL.json', actual); pin(engineFile, engine);
  const admitted = inspect(actual, ownedMarkers); json(id + '/ADMISSION.json', admitted); return { actual, admitted };
}
function copiedControls(actual) {
  const foundation = Buffer.from(JSON.stringify(actual)), controls = [];
  const working = path.join(out, 'classifier-working.json'); fs.writeFileSync(working, foundation, { flag: 'wx' });
  for (const [id, marker, mutate] of [
    ['raw', 'CM_JOIN_RAW_EXIT', value => { value.process.status = 1; }],
    ['identity', 'CM_JOIN_IDENTITIES', value => { value.report.testResults[0].assertionResults[0].title += ' changed'; }],
    ['runtime', 'CM_JOIN_RUNTIME', value => { value.runtime.count = 1; value.runtime.errors = [{ name: 'OwnedCopyControl', message: 'copied classifier input only' }]; }],
  ]) {
    const changed = JSON.parse(foundation); mutate(changed); fs.writeFileSync(working, JSON.stringify(changed)); assert.notEqual(sha(fs.readFileSync(working)), sha(foundation));
    let refused; try { inspect(JSON.parse(fs.readFileSync(working))); } catch (error) { refused = error; } finally { fs.writeFileSync(working, foundation); }
    assert(refused instanceof assert.AssertionError && refused.message.includes(marker), 'CM_JOIN_CLASSIFIER_CONTROL'); assert.deepEqual(fs.readFileSync(working), foundation); inspect(JSON.parse(fs.readFileSync(working)));
    controls.push({ id, marker, beforeSHA256: sha(foundation), changedSHA256: sha(Buffer.from(JSON.stringify(changed))), restoredSHA256: sha(fs.readFileSync(working)), refusal: { name: refused.name, message: refused.message }, productPassCredit: false });
    json('classifier-' + id + '-changed.json', changed);
  }
  json('CLASSIFIER-CONTROLS.json', controls); return controls;
}
function inverseSpan(body, span) {
  const text = body.toString('utf8'); assert.deepEqual(Buffer.from(text), body, 'CM_FIXED_UTF8_BODY');
  assert.equal(text.split(span.after).length - 1, 1, 'CM_FIXED_SINGLETON_INVERSE');
  const changed = Buffer.from(text.replace(span.after, span.before));
  assert.notEqual(sha(changed), sha(body), 'CM_FIXED_EFFECTIVE_INVERSE');
  assert.equal(changed.toString('utf8').split(span.before).length - 1, 1, 'CM_FIXED_SINGLETON_FORWARD');
  assert.deepEqual(Buffer.from(changed.toString('utf8').replace(span.before, span.after)), body, 'CM_FIXED_WHOLE_FORWARD'); return changed;
}
async function sourceControl(control) {
  const file = path.join(root, CONTRACT.engine.path), fixed = pin(file, CONTRACT.engine);
  const changed = control.id === 'whole-original' ? git(['cat-file', 'blob', CONTRACT.beforeEngine.gitBlob]) : inverseSpan(fixed, control.span);
  if (control.id === 'whole-original') {
    assert.equal(git(['ls-tree', CONTRACT.productParent, '--', CONTRACT.engine.path]).toString().trim(), '100644 blob ' + CONTRACT.beforeEngine.gitBlob + '\t' + CONTRACT.engine.path, 'CM_FIXED_ORIGINAL_COMMIT_ASSOCIATION');
    let reconstructed = fixed; for (const arm of CONTRACT.sourceControls.filter(row => row.span)) reconstructed = inverseSpan(reconstructed, arm.span);
    assert.deepEqual(reconstructed, changed, 'CM_FIXED_WHOLE_ORIGINAL_TWO_SPAN_INVERSE');
  }
  assert.notEqual(sha(changed), sha(fixed), 'CM_FIXED_SOURCE_CONTROL_EFFECTIVE');
  assert.equal(changed.length, control.engine.bytes); assert.equal(sha(changed), control.engine.sha256); assert.equal(blob(changed), control.engine.gitBlob);
  const directory = path.join(out, 'source-controls', control.id); fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'before-fixed.ts'), fixed, { flag: 'wx' }); fs.writeFileSync(path.join(directory, 'changed.ts'), changed, { flag: 'wx' });
  let inverse, restored, failure;
  try { fs.writeFileSync(file, changed); pin(file, control.engine); inverse = await units(control.id + '-inverse25', control.ownedMarkers, control.engine); }
  catch (error) { failure = error; json('source-controls/' + control.id + '/INVERSE-REFUSAL.json', { name: error.name, message: error.message, stack: error.stack }); }
  finally {
    fs.writeFileSync(file, fixed); pin(file, CONTRACT.engine); fs.writeFileSync(path.join(directory, 'restored-fixed.ts'), fs.readFileSync(file), { flag: 'wx' });
    try { restored = await units(control.id + '-restored25'); }
    catch (error) { failure ??= error; json('source-controls/' + control.id + '/RESTORATION-REFUSAL.json', { name: error.name, message: error.message, stack: error.stack }); }
  }
  const result = { id: control.id, changedSourcePath: CONTRACT.engine.path, before: CONTRACT.engine, changed: control.engine, restored: CONTRACT.engine, exactPhysicalSinglePath: true, inverse: inverse?.admitted ?? null, fixedRestoration: restored?.admitted ?? null, failure: failure ? { name: failure.name, message: failure.message } : null };
  json('source-controls/' + control.id + '/RECEIPT.json', result); if (failure) throw failure; return result;
}
assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? ''), 'CM_JOIN_REMOTE_ONLY');
assert.equal(process.env.GITHUB_REF, 'refs/heads/' + CONTRACT.branch, 'CM_JOIN_BRANCH');
assert(path.isAbsolute(out ?? '') && fs.realpathSync(out) === out && !out.startsWith(checkout + path.sep) && out !== checkout, 'CM_JOIN_EXTERNAL_OUTPUT');
assert.equal(cases.length, 25); assert.equal(CONTRACT.status, 'BOUND_SOURCE_ONLY_FIXED_PROOF_UNRUN');
assert.match(CONTRACT.product, /^[a-f0-9]{40}$/); assert.match(CONTRACT.productTree, /^[a-f0-9]{40}$/);
let sourceRows, initial, dependencies, prepared = false, failure, admission; const physicalControls = [];
try {
  assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA, 'CM_JOIN_HEAD');
  assert.equal(git(['rev-list', '--parents', '-n1', 'HEAD']).toString().trim(), process.env.GITHUB_SHA + ' ' + CONTRACT.product, 'CM_JOIN_PROOF_SOLE_CHILD');
  assert.equal(git(['rev-list', '--parents', '-n1', CONTRACT.product]).toString().trim(), CONTRACT.product + ' ' + CONTRACT.productParent, 'CM_JOIN_PRODUCT_SOLE_PARENT');
  assert.equal(git(['rev-parse', CONTRACT.product + '^{tree}']).toString().trim(), CONTRACT.productTree);
  assert.equal(git(['rev-parse', CONTRACT.productParent + '^{tree}']).toString().trim(), CONTRACT.productParentTree);
  const prior = tree(CONTRACT.productParent), product = tree(CONTRACT.product); sourceRows = tree('HEAD');
  assert.equal(prior.length, CONTRACT.parentFiles); assert.equal(product.length, CONTRACT.productFiles); assert.equal(sourceRows.length, CONTRACT.proofFiles);
  const priorByPath = new Map(prior.map(row => [row.path, row]));
  const changed = product.filter(row => priorByPath.has(row.path) && JSON.stringify(row) !== JSON.stringify(priorByPath.get(row.path)));
  assert.deepEqual(changed.map(row => row.path), [CONTRACT.engine.path], 'CM_FIXED_ONLY_ENGINE_MODIFIED');
  assert.equal(changed[0].gitBlob, CONTRACT.engine.gitBlob); assert.equal(changed[0].mode, '100644');
  const permanentAdditions = product.filter(row => !priorByPath.has(row.path));
  assert.deepEqual(permanentAdditions.map(row => row.path).sort(), CONTRACT.productAdditions.map(row => row.path).sort(), 'CM_FIXED_FOUR_PERMANENT_ADDITIONS');
  for (const row of permanentAdditions) { const expected = CONTRACT.productAdditions.find(value => value.path === row.path); assert.equal(row.gitBlob, expected.gitBlob); assert.equal(row.mode, '100644'); }
  assert.deepEqual(product.filter(row => priorByPath.has(row.path) && row.path !== CONTRACT.engine.path), prior.filter(row => row.path !== CONTRACT.engine.path), 'CM_FIXED_OTHER5460_PRODUCT_BODIES_MODES_HELD');
  const additions = sourceRows.filter(row => !product.some(value => value.path === row.path));
  assert.deepEqual(additions.map(row => row.path).sort(), CONTRACT.proofAdditions.slice().sort(), 'CM_FIXED_ONLY_TWO_PROOF_ADDITIONS');
  assert(additions.every(row => row.mode === '100644')); assert.deepEqual(sourceRows.filter(row => !additions.includes(row)), product, 'CM_JOIN_PRODUCT_HELD');
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']).toString(), '', 'CM_JOIN_INITIAL_CLEAN_SOURCE');
  initial = { head: git(['rev-parse', 'HEAD']).toString(), refs: git(['show-ref']).toString(), indexSHA256: sha(fs.readFileSync(path.join(checkout, git(['rev-parse', '--git-path', 'index']).toString().trim()))) };
  json('SOURCE-TOPOLOGY.json', { contract: CONTRACT, proof: process.env.GITHUB_SHA, sourceRows, productRows: product, productOnlyChange: changed, permanentAdditions, proofOnlyAdditions: additions });
  fs.writeFileSync(path.join(out, 'source-before.tar'), git(['archive', '--format=tar', 'HEAD']), { flag: 'wx' });
  fs.mkdirSync(root); requireZero(run('extract', 'tar', ['-xf', path.join(out, 'source-before.tar'), '-C', root], checkout, 120000));
  fs.symlinkSync(path.join(checkout, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  pin(path.join(root, CONTRACT.engine.path), CONTRACT.engine); for (const file of [...CONTRACT.files, ...CONTRACT.fixtures]) pin(path.join(root, file.file), file);
  json('FIXTURE-PINS-BEFORE-PAYLOAD.json', CONTRACT.fixtures);
  dependencies = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-BEFORE.json', dependencies); prepared = true;
  requireZero(run('app-types', path.join(root, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json'], root, 300000));
  const first = await units('fixed25'); admission = first.admitted; copiedControls(first.actual);
  for (const control of CONTRACT.sourceControls) physicalControls.push(await sourceControl(control));
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
        assert.deepEqual(Object.keys(data).sort(), ['results', 'version']); assert.equal(data.version, '3.2.7'); assert.equal(data.results.length, 6);
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
json('COMPLETION.json', { status: failure ? 'FIXED_PROOF_REFUSED_RETAIN_ACTUALS' : 'ACTUAL_FIXED25_THREE_PHYSICAL_INVERSES_AND_RESTORATIONS_NO_BROAD_ADOPTION', product: CONTRACT.product, engine: CONTRACT.engine.gitBlob, fixed25: admission ?? null, physicalControls, sourceHolds: fs.existsSync(path.join(out, 'FINAL-HOLDS.json')), kUiHarnessFloors: 'NOT_ADOPTED', namesakeWideSupport: 'UNCLAIMED', build: 'UNRUN', browser: 'UNRUN', fullSuiteAndSims: 'UNRUN', caps: 'UNRUN', compatibilityWithMain: 'SEPARATE_UNPROVEN', broadFeatureReady: false, failure: failure ? { name: failure.name, message: failure.message } : null });
if (failure) { console.error(failure); process.exitCode = 1; } else console.log('CM1597_CANONICAL_FIXED: actual25 green, three physical engine inverses with exact owned reds and each same-copy fixed25 restoration; no broad product qualification.');
