import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
const CONTRACT = {"status":"SOURCE_ONLY_EXISTING_COMPONENT_PRESERVATION_UNRUN","product":"51da27a2367cc84ca0c622def41029dbc2580b68","productTree":"2fa231631ddb813fedefe10a2e6382b7ba729295","productFiles":5502,"proofFiles":5504,"branch":"codex/soccer-centre-preservation-20261030","proofAdds":[".github/workflows/sc-centre-preservation.yml","scripts/qa/proveSoccerCentrePreservation.mjs"],"sourcePins":[{"path":"package.json","bytes":3495,"sha256":"acfe14626dea53cf5f9c5e0286b766a22237656b52aac4c888b080873ac90e31","gitBlob":"2ff64986fb76ebc51b706f2fd24765768874008a"},{"path":"package-lock.json","bytes":309049,"sha256":"c7e3867eabf0bfa03a8aa6a5e601b0050b937ed210d48c6bbd241019e3c9ea76","gitBlob":"97d6f12a052f25f400462938c241789a083f0bfe"},{"path":"scripts/lib/offlineTransport.cjs","bytes":10660,"sha256":"e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221","gitBlob":"0fda542a2649fe5da937c6976fd0f5b6073e74b6"},{"path":"scripts/qa/freeKickLab1070.mjs","bytes":27126,"sha256":"6279c8f608e56439e73f0bbcda73f9ed69e15d48e9b13119de4d6a7f05fb46b7","gitBlob":"1cf030d9182fd4fd68fca39f32e757c69bf9e58a"},{"path":"vitest.config.ts","bytes":5364,"sha256":"6a68dd2f214dab4a3013eb41bad38eea65d703d61440002710ec246495e1c58a","gitBlob":"ed2a9dc677f77dfe95c061064eeff5782b856864"},{"path":"scripts/simPhonePanelFocus.mjs","bytes":4961,"sha256":"a9b7b5cbfe30864ef9d367f54498c68643a7f02324af7cd47fb06d265139d374","gitBlob":"a627c23e1b1e9d5d3975cdf848cc7a3e88537f4f"},{"path":"scripts/simTrophyCabinet.mjs","bytes":2858,"sha256":"f0575904fed1a4736a67852e5b1c527978b3047577abffa725394ca59d1362f4","gitBlob":"83495cd7a77d76dd6c586853dd175aafbf360ffe"},{"path":"src/test/phonePanelFocus.test.tsx","bytes":11266,"sha256":"fa11faf96c8237e06f2f09f65f1493f5e416f389131fa87bb28be8e175fba743","gitBlob":"13de255d8a064798374f7018d67ba58024abcb30"},{"path":"src/test/trophyCabinet.test.tsx","bytes":12894,"sha256":"95ac91c11c6104dd3e60336cb185c5c571dabc306ff8e1b88fb55aec4ec9327b","gitBlob":"9466daa474ea303eca8fd328f2db4eed98e6e7da"},{"path":"src/components/soccer-career/PhonePanel.tsx","bytes":36595,"sha256":"71ca1bae1592517c486fe48fd3c5a3b26cd3efe749d3b0cf2a66177cb90ac6e6","gitBlob":"5c1ac9fa9d852f61b01a751197af3766f157d508"},{"path":"src/components/soccer-career/TrophyCabinet.tsx","bytes":14602,"sha256":"c646d0a44f2b0129f853cd338d3dbbf5ac1a64fc8a482d7e925f4681cf6d7b75","gitBlob":"39184dbdc4bb6a70af1e9366239d26701d06796c"},{"path":"src/lib/dialogA11y.ts","bytes":1274,"sha256":"d43a2a4c7f3c895e8ab1d151337d2a532f2242f32284af5b09462dcf22a88aa5","gitBlob":"823eaec15df9fd5527295caf41f8cebe94efcb7e"}],"cacheAdmitterSHA256":"e2a461526255acc26d834ab273896876214b4f50f0e5115999b6edbe9890d248","cacheAdmitterGit":"5974db4668e4696cb49ee850287f11f8c31f6a2a","scope":"Only ordinary actual PhonePanel12 and TrophyCabinet12 plus its existing effective control. No build, types, caps, readers, browser, full suite or lazy Page handoff credit."};
const CACHE_ADMITTER = "import fs from 'node:fs';\nimport path from 'node:path';\nimport assert from 'node:assert/strict';\nimport { createHash } from 'node:crypto';\nconst out = process.argv[2];\nconst read = file => new Map(fs.readFileSync(path.join(out, file), 'utf8').trim().split('\\n').filter(Boolean).map(line => { const m = /^([a-f0-9]{64})  (.+)$/.exec(line); assert(m, 'RELEASE_DEPENDENCY_MAP_LINE'); return [m[2], m[1]]; }));\nconst before = read('dependencies.before'), after = read('dependencies.after'), added = [...after.keys()].filter(file => !before.has(file));\nfor (const [file, hash] of before) assert.equal(after.get(file), hash, 'RELEASE_ORIGINAL_DEPENDENCY_BODY_HELD:' + file);\nassert.equal([...before.keys()].filter(file => file.startsWith('node_modules/.vite/vitest/')).length, 0);\nassert(added.length <= 1, 'RELEASE_ONE_DEFAULT_RESULTS_CACHE_ONLY');\nconst entries = [];\nfor (const file of added) {\n const projectId = createHash('sha1').update('').digest('hex');\n assert.equal(file, 'node_modules/.vite/vitest/' + projectId + '/results.json');\n const body = fs.readFileSync(file), data = JSON.parse(body);\n assert.deepEqual(Object.keys(data).sort(), ['results', 'version']); assert.equal(data.version, '3.2.7'); assert(Array.isArray(data.results));\n for (const row of data.results) {\n  assert(Array.isArray(row) && row.length === 2); assert.match(row[0], /^:src\\/.+\\.(test|spec)\\.(ts|tsx)$/);\n  const relative = row[0].slice(1); assert(!relative.split('/').includes('..')); assert(fs.existsSync(relative), 'RELEASE_CACHE_IDENTITY_ACTUAL_SOURCE');\n  assert.deepEqual(Object.keys(row[1]).sort(), ['duration', 'failed']); assert.equal(typeof row[1].failed, 'boolean'); assert(Number.isFinite(row[1].duration) && row[1].duration >= 0);\n }\n fs.writeFileSync(path.join(out, 'default-results-cache.json'), body, { flag: 'wx' });\n entries.push({ file, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), tests: data.results.map(row => row[0]), kind: 'NEW_GENERATED_RESULTS_CACHE_ONLY_NO_TEST_CREDIT' });\n}\nfs.writeFileSync(path.join(out, 'DEPENDENCY-CACHE-ADMISSION.json'), JSON.stringify({ originalFilesAndBodiesHeld: true, entries }, null, 2) + '\\n', { flag: 'wx' });\n";
const checkout = process.cwd(), out = process.env.SC_PRESERVATION_OUT, root = path.join(out ?? '', 'matched-source');
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update('blob ' + body.length + '\0').update(body).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: checkout, maxBuffer: 1 << 29 });
const gt = (...args) => git(...args).toString().trim();
const json = (name, value) => { const file = path.join(out, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); };
function inventory(dir, prefix = '') {
  return fs.readdirSync(dir).sort().flatMap(name => {
    const file = path.join(dir, name), relative = prefix + name, stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return [{ file: relative, link: fs.readlinkSync(file) }];
    if (stat.isDirectory()) return inventory(file, relative + '/');
    assert(stat.isFile()); return [{ file: relative, bytes: stat.size, sha256: sha(fs.readFileSync(file)) }];
  });
}
function tree(ref) {
  return git('ls-tree', '-rz', '--full-tree', ref).toString().split('\0').filter(Boolean).map(row => {
    const m = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row); assert(m, 'SC_CAPS_REGULAR_SOURCE');
    return { mode: m[1], gitBlob: m[2], file: m[3] };
  }).sort((a, b) => a.file.localeCompare(b.file));
}
function pin(relative, expected) {
  const body = fs.readFileSync(path.join(root, relative)); assert.equal(body.length, expected.bytes); assert.equal(sha(body), expected.sha256); assert.equal(blob(body), expected.gitBlob);
}
function run(id, command, args, cwd = root, env = {}, timeout = 600000, allowed = [0]) {
  const dir = path.join(out, id); fs.mkdirSync(dir, { recursive: true });
  const stdout = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), stderr = fs.openSync(path.join(dir, 'stderr.log'), 'wx'); let actual;
  const started = new Date().toISOString();
  try { actual = spawnSync(command, args, { cwd, env: { ...process.env, ...env, FORCE_COLOR: '0' }, timeout, killSignal: 'SIGKILL', stdio: ['ignore', stdout, stderr] }); }
  finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  const receipt = { command, args, cwd, started, ended: new Date().toISOString(), status: actual.status, signal: actual.signal, error: actual.error ? String(actual.error) : null };
  json(id + '/process.json', receipt); assert(allowed.includes(actual.status), 'SC_CAPS_RAW:' + id); assert.equal(actual.signal, null); assert.equal(actual.error, undefined);
  return fs.readFileSync(path.join(dir, 'stdout.log'), 'utf8') + fs.readFileSync(path.join(dir, 'stderr.log'), 'utf8');
}
function checkoutState() { return { head: gt('rev-parse', 'HEAD'), refs: gt('show-ref'), indexSHA256: sha(fs.readFileSync(path.resolve(checkout, gt('rev-parse', '--git-path', 'index')))) }; }
let sourceRows, before, deps, fontsDir, fontsInventory, prepared = false, failure, results = [], cacheAdmission;
try {
  assert.equal(gt('rev-list', '--parents', '-n1', 'HEAD'), process.env.GITHUB_SHA + ' ' + CONTRACT.product); assert.equal(gt('rev-parse', CONTRACT.product + '^{tree}'), CONTRACT.productTree);
  const product = tree(CONTRACT.product); sourceRows = tree('HEAD'); assert.equal(product.length, 5502); assert.equal(sourceRows.length, 5504);
  const additions = sourceRows.filter(row => !product.some(value => value.file === row.file)); assert.deepEqual(additions.map(row => row.file).sort(), CONTRACT.proofAdds.slice().sort()); assert(additions.every(row => row.mode === '100644'));
  assert.deepEqual(sourceRows.filter(row => !additions.includes(row)), product, 'SC_CAPS_ALL_PRODUCT_BODIES_MODES_HELD'); assert.equal(gt('status', '--porcelain=v1', '--untracked-files=all'), '');
  before = checkoutState(); json('CHECKOUT-BEFORE.json', before); json('SOURCE-TOPOLOGY.json', { contract: CONTRACT, proof: process.env.GITHUB_SHA, proofTree: gt('rev-parse', 'HEAD^{tree}'), productRows: product, proofRows: sourceRows, additions });
  git('archive', '--format=tar', '--output=' + path.join(out, 'source.tar'), 'HEAD'); fs.mkdirSync(root); run('extract', 'tar', ['-xf', path.join(out, 'source.tar'), '-C', root], checkout);
  fs.symlinkSync(path.join(checkout, 'node_modules'), path.join(root, 'node_modules'), 'dir'); for (const source of CONTRACT.sourcePins) pin(source.path, source);
  deps = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-BEFORE.json', deps); prepared = true;
  const offline = path.join(root, 'scripts/lib/offlineTransport.cjs'), localOnly = { NODE_OPTIONS: '--require=' + offline, SIM_NETWORK: 'offline' };
  fontsDir = path.join(out, 'prepared-fonts'); assert(!fs.existsSync(fontsDir));
  run('font-dependency-prefetch', process.execPath, ['scripts/qa/freeKickLab1070.mjs', '--prefetch-fonts-only'], root, { NODE_OPTIONS: '', FREE_KICK_FONT_CACHE: fontsDir });
  fontsInventory = inventory(fontsDir); json('FONTS-BEFORE.json', fontsInventory);
  const ordinary = { ...localOnly, PHONE_PANEL_CONTROL: '', US_BOARD_CONTROL_ALIAS: '', US_BOARD_CONTROL_FILE: '', NO_DOUBLE_SWAP: '' };
  try {
    const log = run('phone-panel-focus', process.execPath, ['scripts/simPhonePanelFocus.mjs'], root, ordinary);
    assert.match(log.replace(/\x1b\[[0-9;]*m/g, ''), /Tests\s+12 passed/, 'Existing phone suite12 executes');
    assert.match(log, /^simPhonePanelFocus: twelve actual-panel checks passed with real career, thread, contact and money helpers\.$/m);
    results.push({ id: 'simPhonePanelFocus', status: 'EXISTING_RAW0_AND_OWNED_CLOSING', ordinaryCases: 12 });
  } catch (error) { results.push({ id: 'simPhonePanelFocus', status: 'FAILED_OR_INCOMPLETE', name: error.name, message: error.message }); }
  const reportRelative = '.tmp-fx/trophy-tests.json', controlRelative = 'src/components/soccer-career/__control_TrophyCabinet.tsx';
  const report = path.join(root, reportRelative), control = path.join(root, controlRelative);
  assert(!fs.existsSync(report) && !fs.existsSync(control), 'Fresh source-owned trophy paths only');
  let trophyError, trophyPassed = false;
  try {
    const log = run('trophy-cabinet', process.execPath, ['scripts/simTrophyCabinet.mjs'], root, ordinary);
    assert.match(log.replace(/\x1b\[[0-9;]*m/g, ''), /Tests\s+12 passed/, 'Existing healthy trophy suite12 executes');
    assert.match(log, /^simTrophyCabinet: saved honors green, effective negative control caught$/m);
    trophyPassed = true;
  } catch (error) { trophyError = error; }
  finally {
    if (fs.existsSync(report)) {
      assert(fs.lstatSync(report).isFile() && !fs.lstatSync(report).isSymbolicLink(), 'Owned report is regular');
      const body = fs.readFileSync(report); fs.writeFileSync(path.join(out, 'trophy-final-existing-report.json'), body, { flag: 'wx' });
      fs.unlinkSync(report);
      json('OWNED-TROPHY-REPORT.json', { path: reportRelative, beforeAbsent: true, bytes: body.length, sha256: sha(body), capturedAs: 'trophy-final-existing-report.json', role: trophyPassed ? 'FINAL_BUILTIN_CONTROL_REPORT_NOT_HEALTHY_JSON' : 'FINAL_EXISTING_REPORT_NO_HEALTHY_OR_CONTROL_CREDIT_INCOMPLETE_RUN', sourceReportRemovedAfterCapture: !fs.existsSync(report) });
    } else { json('OWNED-TROPHY-REPORT.json', { path: reportRelative, beforeAbsent: true, status: 'MISSING_ON_FAILED_OR_INCOMPLETE_RUN', noInventedReport: true }); trophyError ??= new Error('Existing trophy final report was not retained'); }
  }
  if (!trophyError) { try { assert(trophyPassed && !fs.existsSync(control), 'Existing trophy control cleaned its own source copy'); } catch (error) { trophyError = error; } }
  results.push(trophyError ? { id: 'simTrophyCabinet', status: 'FAILED_OR_INCOMPLETE', name: trophyError.name, message: trophyError.message } : { id: 'simTrophyCabinet', status: 'EXISTING_RAW0_AND_OWNED_CLOSING', ordinaryCases: 12, existingEffectiveControl: true });
  json('EXISTING-PRESERVATION-RESULTS.json', { results, healthyTrophyJSON: 'NOT_RETAINED_BY_EXISTING_HARNESS_FINAL_REPORT_OVERWRITTEN_BY_CONTROL', componentOnly: true });
  assert(results.length === 2 && results.every(row => row.status === 'EXISTING_RAW0_AND_OWNED_CLOSING'), 'Both ordinary preservation harnesses required');
} catch (error) { failure = error; json('ERROR.json', { name: error.name, message: error.message, stack: error.stack }); }
finally {
  if (prepared) {
    try {
      const after = checkoutState(); json('CHECKOUT-AFTER.json', after); assert.deepEqual(after, before); assert.equal(gt('status', '--porcelain=v1', '--untracked-files=all'), '');
      for (const dir of [checkout, root]) for (const row of sourceRows) { const file = path.join(dir, row.file); assert.equal(blob(fs.readFileSync(file)), row.gitBlob, 'SC_CAPS_SOURCE_BODY_HELD:' + row.file); assert.equal(Boolean(fs.statSync(file).mode & 0o111), row.mode === '100755'); }
      const matched = inventory(root).filter(row => row.file !== 'node_modules' && !row.file.startsWith('dist/')); assert.deepEqual(matched.map(row => row.file).sort(), sourceRows.map(row => row.file).sort()); json('MATCHED-SOURCE-AFTER.json', matched);
      const finalDeps = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-AFTER.json', finalDeps);
      const cacheOut = path.join(out, 'generated-results-cache'); fs.mkdirSync(cacheOut);
      const sums = rows => rows.filter(row => row.sha256).map(row => row.sha256 + '  node_modules/' + row.file).join('\n') + '\n';
      fs.writeFileSync(path.join(cacheOut, 'dependencies.before'), sums(deps), { flag: 'wx' }); fs.writeFileSync(path.join(cacheOut, 'dependencies.after'), sums(finalDeps), { flag: 'wx' });
      assert.equal(sha(CACHE_ADMITTER), CONTRACT.cacheAdmitterSHA256); assert.equal(blob(Buffer.from(CACHE_ADMITTER)), CONTRACT.cacheAdmitterGit);
      const admitFile = path.join(out, 'admit-results-cache.mjs'); fs.writeFileSync(admitFile, CACHE_ADMITTER, { flag: 'wx' });
      run('generated-results-cache-admission', process.execPath, [admitFile, cacheOut], root, { NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'), SIM_NETWORK: 'offline' });
      cacheAdmission = JSON.parse(fs.readFileSync(path.join(cacheOut, 'DEPENDENCY-CACHE-ADMISSION.json')));
      const caches = new Map(cacheAdmission.entries.map(row => [row.file.slice('node_modules/'.length), row]));
      for (const [file, entry] of caches) { const row = finalDeps.find(value => value.file === file); assert(row && row.sha256 === entry.sha256 && row.bytes === entry.bytes); }
      const order = values => values.slice().sort((a, b) => a.file.localeCompare(b.file));
      assert.deepEqual(order(finalDeps.filter(row => !caches.has(row.file))), order(deps), 'Original dependency bodies and links exact; only admitted generated default cache');
      if (fontsInventory) { const final = inventory(fontsDir); assert.deepEqual(final, fontsInventory); json('FONTS-AFTER.json', final); }
      json('FINAL-HOLDS.json', { status: 'HELD', allSourceBodiesAndModes: sourceRows.length, originalProductBodies: 5502, matchedMembership: true, headIndexRefs: true, originalDependencies: true, existingExactGeneratedDefaultCachePolicyOnly: cacheAdmission, fontsHeld: Boolean(fontsInventory), noBrowserInstallOrLinks: true });
    } catch (error) { failure ??= error; json('HOLDS-ERROR.json', { name: error.name, message: error.message, stack: error.stack }); }
    if (fontsDir && fs.existsSync(fontsDir)) { try { run('archive-font-cache', 'tar', ['-cf', path.join(out, 'font-cache.tar'), '-C', fontsDir, '.'], checkout); } catch (error) { failure ??= error; } }
    try { run('archive-matched-source', 'tar', ['-cf', path.join(out, 'matched-final.tar'), '--exclude=./node_modules', '--exclude=./dist', '-C', root, '.'], checkout); } catch (error) { failure ??= error; }
  }
}
json('COMPLETION.json', { status: failure ? 'FAILED_OR_INCOMPLETE_PRESERVATION_NOT_ADMITTED' : 'ONLY_TWO_EXISTING_COMPONENT_PRESERVATION_HARNESSES', source: process.env.GITHUB_SHA, product: CONTRACT.product, results, sourceHolds: fs.existsSync(path.join(out, 'FINAL-HOLDS.json')), cacheAdmission, typesBuildCapsReaders: 'SEPARATE_EXISTING_GATES_NOT_RUN_HERE', fourCasePageFocusProof: 'SEPARATE_FIXED_OLD_RESTORED_PROOF', pagePhoneTrophyLazyAndLoadedErrorCentre: 'UNRUN_BY_THESE_COMPONENT_TESTS', fullSuites: 'UNRUN', mergeOrPublicationCredit: false, failure: failure ? { name: failure.name, message: failure.message } : null });
if (failure) { console.error(failure); process.exitCode = 1; } else console.log('SC_CENTRE_PRESERVATION: ordinary phone12 and trophy12 with its existing effective control passed; source and dependency custody held.');
