import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Remote actual-import controls. Copies remain outside tracked application source.
const ROOT = fs.realpathSync(process.cwd()), TEMP = fs.realpathSync(process.env.RUNNER_TEMP);
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--out');
const OUT = path.resolve(process.argv[3]);
assert(OUT.startsWith(TEMP + path.sep) && !fs.existsSync(OUT), 'PITCH_CONTROL_FRESH_OUTPUT');
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert.equal(process.env.GITHUB_REPOSITORY, 'PapiSalgueroM/ballpark-hero');
assert(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''));
assert(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '') && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || ''));
assert(!process.env.NO_DOUBLE_SWAP && !process.env.US_BOARD_CONTROL_ALIAS && !process.env.US_BOARD_CONTROL_FILE, 'PITCH_CONTROL_NO_INHERITED_ALIAS');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => sha(fs.readFileSync(file));
const git = args => execFileSync('git', args, { cwd: ROOT }).toString();
assert.equal(git(['rev-parse', 'HEAD']).trim(), process.env.GITHUB_SHA);
assert.equal(git(['rev-parse', 'HEAD:vitest.config.ts']).trim(), 'ed2a9dc677f77dfe95c061064eeff5782b856864', 'PITCH_CONTROL_ACTUAL_CONFIG');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'));
const PITCH = 'src/components/pitch-motion/PitchMotion.tsx', MINI = 'src/components/season-centre/MiniPitch.tsx';
const productPins = {
  [PITCH]: '53c4983e70cd48dafd66d5379937e98515288521ff9cdcb618e62cbbd5d2ad30',
  [MINI]: '34b6b132c6ebaf4f2b91e8e28c7e0ec82fed3db74e6a0a2e0a07cbda7f297994',
};
const testPins = {
  'src/test/PitchMotion.build.test.tsx': 'a7784c4de034f629baeaccffa7f8db1aa66043fda08b9980acf55f7a18609775',
  'src/test/MiniPitch.height.test.tsx': '2e7c3d5c14cee4911631b72dfb6af23f2848ec4c960ac4c461c0ea61b140def5',
};
const inputPins = { ...productPins, ...testPins,
  'vitest.config.ts': '6a68dd2f214dab4a3013eb41bad38eea65d703d61440002710ec246495e1c58a',
  'scripts/lib/offlineTransport.cjs': 'e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221' };
const aliases = { [PITCH]: '@/components/pitch-motion/PitchMotion', [MINI]: '@/components/season-centre/MiniPitch' };
const suites = new Map([
  ['src/test/PitchMotion.build.test.tsx', { ancestor: 'Generic PitchMotion optional build wiring', titles: [
    'renders the supplied build plan in actual ball and figure positions',
    'replans when only build changes while all other prop references and the clock stay held',
    'draws the real full-motion free-kick lift when build is supplied',
    'keeps a full-motion legacy free kick and a reduced-motion built free kick flat',
    'preserves omitted-build legacy positions across multiple real scene changes',
    'freezes the displayed frame while stopped and resumes on the supplied clock without changing inputs or drawing RNG',
  ] }],
  ['src/test/MiniPitch.height.test.tsx', { ancestor: 'Career mini pitch ball height', titles: [
    'draws the actual flight height and ground shadow for goals at either end',
    'keeps instant results and goals already present at mount on a flat terminal frame',
    'holds the exact displayed goal frame while paused and resumes that committed goal',
  ] }],
]);
const recipeFile = path.join(ROOT, 'scripts/qa/pitchFlight.controls.json');
assert.equal(hashFile(recipeFile), '3ce14ccf7152988b2afe728ca9b6ef0fd0f2ec2a9a593cc0ecaa3daa3c394d3e', 'PITCH_CONTROL_RECIPES');
const recipes = JSON.parse(fs.readFileSync(recipeFile, 'utf8')).controls;
assert.equal(recipes.length, 4);
const originals = new Map();
for (const [file, expected] of Object.entries(inputPins)) assert.equal(hashFile(path.join(ROOT, file)), expected, 'PITCH_CONTROL_INPUT_' + file);
for (const file of Object.keys(productPins)) originals.set(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));
function changedBody(recipe) {
  const original = originals.get(recipe.target);
  assert.equal(productPins[recipe.target], recipe.sourceSha256);
  assert.equal(recipe.occurrences, 1); assert.equal(original.split(recipe.before).length, 2, 'PITCH_CONTROL_UNIQUE_BEFORE');
  const changed = original.replace(recipe.before, recipe.after);
  assert.notEqual(changed, original); assert.equal(sha(changed), recipe.changedSha256);
  assert.equal(changed.split(recipe.after).length, 2, 'PITCH_CONTROL_UNIQUE_AFTER');
  assert.equal(changed.replace(recipe.after, recipe.before), original, 'PITCH_CONTROL_WHOLE_INVERSE');
  assert.equal(recipe.wholeInverseSha256, productPins[recipe.target]); return changed;
}
const ids = new Set();
for (const recipe of recipes) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id) && !ids.has(recipe.id)); ids.add(recipe.id);
  const suite = suites.get(recipe.testPath); assert(suite && suite.ancestor === recipe.ancestor && suite.titles.includes(recipe.caseTitle));
  assert(/^[A-Z0-9_]+$/.test(recipe.expectedAssertionMarker)); assert.equal(recipe.expectedExit, 1); changedBody(recipe);
}
fs.mkdirSync(OUT);
const write = (name, bytes) => fs.writeFileSync(path.join(OUT, name), bytes, { flag: 'wx' });
const json = (name, data) => write(name, JSON.stringify(data, null, 2) + '\n');
const summary = { status: 'running', complete: false, applicationQualified: false, source: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT,
  runnerSha256: hashFile(fileURLToPath(import.meta.url)), recipesSha256: hashFile(recipeFile),
  actualConfigGitBlob: 'ed2a9dc677f77dfe95c061064eeff5782b856864',
  copiedImports: 'Exact current NO_DOUBLE_SWAP aliases; no config or component import adapters.', runs: [], controls: [], errors: [] };
write('source-recipes.json', fs.readFileSync(recipeFile));
function sourceInventory() {
  const paths = git(['ls-files', '-z']).split('\0'); assert.equal(paths.pop(), ''); assert.equal(new Set(paths).size, paths.length);
  return paths.sort().map(file => {
    assert(file && !/[\r\n\\]/.test(file) && !path.isAbsolute(file) && !file.split('/').some(x => x === '.' || x === '..'));
    const physical = path.join(ROOT, file), stat = fs.lstatSync(physical); assert(stat.isFile() && !stat.isSymbolicLink());
    return { file, bytes: stat.size, sha256: hashFile(physical) };
  });
}
function dependencyInventory() {
  const rows = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name), rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (rel === 'node_modules/.vite') continue;
      const stat = fs.lstatSync(file); if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) walk(file);
      else { assert(stat.isFile()); rows.push({ file: rel, bytes: stat.size, sha256: hashFile(file) }); }
    }
  }
  walk(path.join(ROOT, 'node_modules')); assert(rows.length > 0); return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
const copied = path.join(OUT, 'copies');
const activeRoot = path.join(ROOT, '.sim-control', 'pitch-flight-feedback',
  process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT + '-' + process.env.GITHUB_SHA);
assert(!fs.existsSync(activeRoot), 'PITCH_CONTROL_FRESH_ACTIVE_COPIES');
assert.equal(git(['check-ignore', '--', path.relative(ROOT, activeRoot).split(path.sep).join('/')]).trim(),
  path.relative(ROOT, activeRoot).split(path.sep).join('/'), 'PITCH_CONTROL_EXISTING_IGNORED_PATH');
for (let parent = path.dirname(activeRoot); parent !== ROOT; parent = path.dirname(parent)) {
  if (fs.existsSync(parent)) {
    const stat = fs.lstatSync(parent); assert(stat.isDirectory() && !stat.isSymbolicLink());
  }
}
const healthy = {}, copyRows = [];
function assertCopies() {
  const expected = copyRows.map(row => row.name).sort();
  for (const directory of [activeRoot, copied]) assert.deepEqual(fs.readdirSync(directory).sort(), expected, 'PITCH_CONTROL_COPY_MEMBERS');
  return copyRows.map(row => {
    for (const file of [row.actual, row.evidence]) {
      const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink());
      assert.equal(stat.size, row.bytes); assert.equal(hashFile(file), row.sha256, 'PITCH_CONTROL_ACTUAL_AND_EVIDENCE_COPY_HELD');
    }
    return { ...row };
  });
}
function createCopy(name, body, expectedSha256) {
  assert.equal(path.basename(name), name); assert(!copyRows.some(row => row.name === name));
  assert.equal(sha(body), expectedSha256);
  const actual = path.join(activeRoot, name), evidence = path.join(copied, name);
  fs.writeFileSync(actual, body, { flag: 'wx' }); fs.writeFileSync(evidence, body, { flag: 'wx' });
  const row = { name, actual, evidence, bytes: Buffer.byteLength(body), sha256: expectedSha256 };
  copyRows.push(row); assertCopies(); return actual;
}
const stripAnsi = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
const escapeRegex = text => text.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
function run(label, recipe = null, fault = false, faultFile = null) {
  const swap = Object.fromEntries(Object.keys(productPins).map(file => [aliases[file], recipe && fault && file === recipe.target ? faultFile : healthy[file]]));
  const active = Object.keys(productPins).map(file => ({ target: file, file: swap[aliases[file]], evidence: copyRows.find(row => row.actual === swap[aliases[file]])?.evidence, sha256: recipe && fault && file === recipe.target ? recipe.changedSha256 : productPins[file] }));
  const copyBefore = assertCopies(); json(label + '.copy-members.before.json', copyBefore);
  for (const row of active) {
    assert.equal(hashFile(row.file), row.sha256, 'PITCH_CONTROL_ACTIVE_COPY');
    assert.equal(hashFile(row.evidence), row.sha256, 'PITCH_CONTROL_EVIDENCE_COPY');
  }
  const selected = recipe ? [recipe.testPath] : [...suites.keys()], expectedTotal = selected.reduce((n, file) => n + suites.get(file).titles.length, 0);
  const reportFile = path.join(OUT, label + '.report.json'), logFile = path.join(OUT, label + '.log'), receipt = path.join(OUT, label + '.transport');
  fs.writeFileSync(receipt, '', { flag: 'wx' });
  const args = ['run', ...selected, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + reportFile];
  if (recipe) args.push('--testNamePattern=^' + escapeRegex(recipe.ancestor + ' ' + recipe.caseTitle) + '$');
  const fd = fs.openSync(logFile, 'wx'); let child;
  try { child = spawnSync('node_modules/.bin/vitest', args, { cwd: ROOT,
    env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify(swap), SIM_NETWORK: 'offline', SIM_OFFLINE_RECEIPT: receipt, NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs') },
    stdio: ['ignore', fd, fd], timeout: 60000, killSignal: 'SIGTERM' }); } finally { fs.closeSync(fd); }
  json(label + '.process.json', { status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message, code: child.error.code } : null, args, swap, active });
  write(label + '.exit', child.status === null ? 'NO_EXIT_CODE\n' : child.status + '\n');
  const copyAfter = assertCopies(); assert.deepEqual(copyAfter, copyBefore, 'PITCH_CONTROL_COPY_MEMBERS_HELD');
  json(label + '.copy-members.after.json', copyAfter);
  for (const row of active) assert.equal(hashFile(row.file), row.sha256, 'PITCH_CONTROL_COPY_HELD');
  assert.equal(child.error, undefined, 'PITCH_CONTROL_NO_SPAWN_OR_TIMEOUT'); assert.equal(child.signal, null);
  assert.equal(child.status, fault ? 1 : 0); assert.equal(fs.statSync(receipt).size, 0);
  const raw = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(raw.success, !fault); assert.equal(raw.numTotalTests, expectedTotal);
  assert.equal(raw.numPassedTests, fault ? 0 : recipe ? 1 : expectedTotal);
  assert.equal(raw.numFailedTests, fault ? 1 : 0); assert.equal(raw.numPendingTests, recipe ? expectedTotal - 1 : 0); assert.equal(raw.numTodoTests, 0);
  assert.equal(raw.testResults.length, selected.length);
  const seen = new Set(), observed = []; let executed = 0;
  for (const suite of raw.testResults) {
    const file = path.relative(ROOT, path.resolve(suite.name)).split(path.sep).join('/'), spec = suites.get(file);
    assert(selected.includes(file) && spec && !seen.has(file)); seen.add(file);
    assert.equal(suite.status, fault ? 'failed' : 'passed'); if ('message' in suite) assert.equal(suite.message, '');
    assert.equal(suite.assertionResults.length, spec.titles.length);
    const names = new Set();
    for (const row of suite.assertionResults) {
      assert(spec.titles.includes(row.title) && !names.has(row.title)); names.add(row.title); assert.equal(row.fullName, spec.ancestor + ' ' + row.title);
      const chosen = !recipe || row.title === recipe.caseTitle;
      if (!chosen) { assert(['pending', 'skipped'].includes(row.status)); assert.deepEqual(row.failureMessages, []); continue; }
      executed += 1; assert.equal(row.status, fault ? 'failed' : 'passed');
      if (!fault) { assert.deepEqual(row.failureMessages, []); continue; }
      assert.equal(row.failureMessages.length, 1);
      const message = stripAnsi(row.failureMessages[0]);
      assert.match(message, /^\s*AssertionError:/, 'PITCH_CONTROL_NATIVE_OWNED_ASSERTION');
      assert.doesNotMatch(message, /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|UnhandledError)\s*:/);
      assert(new RegExp('(?:^|[^A-Z0-9_])' + recipe.expectedAssertionMarker + '(?:$|[^A-Z0-9_])').test(message), 'PITCH_CONTROL_EXACT_OWNED_MARKER');
      observed.push({ title: row.title, fullName: row.fullName, marker: recipe.expectedAssertionMarker, failureMessages: row.failureMessages });
    }
    assert.equal(names.size, spec.titles.length);
  }
  assert.equal(executed, recipe ? 1 : expectedTotal); assert.equal(observed.length, fault ? 1 : 0);
  const runtime = ['numRuntimeErrorTestSuites', 'numUnhandledErrors'];
  for (const key of runtime) if (key in raw) assert.equal(raw[key], 0);
  if ('unhandledErrors' in raw) assert.deepEqual(raw.unhandledErrors, []);
  assert.doesNotMatch(stripAnsi(fs.readFileSync(logFile, 'utf8')), /Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i);
  const result = { label, control: recipe?.id ?? null, phase: fault ? 'fault' : label.endsWith('healthy') ? 'healthy' : 'restored',
    realExit: child.status, registered: expectedTotal, passed: raw.numPassedTests, failed: raw.numFailedTests, pending: raw.numPendingTests,
    observedRuntimeCounters: Object.fromEntries(runtime.filter(key => key in raw).map(key => [key, raw[key]])),
    absentRuntimeCountersUnknown: runtime.filter(key => !(key in raw)), unhandledErrors: 'unhandledErrors' in raw ? raw.unhandledErrors : 'UNKNOWN_ABSENT',
    owned: observed, rawSha256: hashFile(reportFile), logSha256: hashFile(logFile), transportSha256: hashFile(receipt) };
  summary.runs.push(result); json(label + '.observation.json', result); return result;
}
let sourceBefore, depsBefore;
try {
  sourceBefore = sourceInventory(); depsBefore = dependencyInventory();
  json('source-before.json', sourceBefore); json('dependencies-before.json', depsBefore); fs.mkdirSync(copied);
  fs.mkdirSync(activeRoot, { recursive: true }); assert.equal(fs.realpathSync(activeRoot), activeRoot);
  for (const [file, body] of originals) {
    healthy[file] = createCopy(path.basename(file).replace('.tsx', '.healthy.tsx'), body, productPins[file]);
    assert.equal(hashFile(healthy[file]), productPins[file]);
  }
  run('all-nine-healthy');
  for (const recipe of recipes) {
    const record = { id: recipe.id, sourceSha256: recipe.sourceSha256, changedSha256: recipe.changedSha256, wholeInverseSha256: recipe.wholeInverseSha256,
      healthy: false, fault: false, restored: false, errors: [] };
    try {
      run(recipe.id + '-healthy', recipe); record.healthy = true;
      const file = createCopy(recipe.id + '.fault.tsx', changedBody(recipe), recipe.changedSha256);
      run(recipe.id + '-fault', recipe, true, file); record.fault = true;
    } catch (error) { record.errors.push({ name: error.name, message: error.message, stack: error.stack }); }
    finally {
      try { run(recipe.id + '-restored', recipe); record.restored = true; }
      catch (error) { record.errors.push({ name: error.name, message: error.message, stack: error.stack }); }
    }
    summary.controls.push(record);
    if (!record.healthy || !record.fault || !record.restored || record.errors.length) summary.errors.push({ control: recipe.id, message: 'control not admitted' });
  }
} catch (error) { summary.errors.push({ phase: 'setup-or-all-healthy', name: error.name, message: error.message, stack: error.stack }); }
finally {
  try { if (Object.keys(healthy).length === 2) run('all-nine-restored'); }
  catch (error) { summary.errors.push({ phase: 'all-restored', name: error.name, message: error.message, stack: error.stack }); }
  try {
    const sourceAfter = sourceInventory(), depsAfter = dependencyInventory(); json('source-after.json', sourceAfter); json('dependencies-after.json', depsAfter);
    assert.deepEqual(sourceAfter, sourceBefore, 'PITCH_CONTROL_FULL_SOURCE_HOLD'); assert.deepEqual(depsAfter, depsBefore, 'PITCH_CONTROL_FULL_DEPENDENCY_HOLD');
    for (const [file, expected] of Object.entries(inputPins)) assert.equal(hashFile(path.join(ROOT, file)), expected);
    assert.equal(hashFile(recipeFile), summary.recipesSha256); assert.equal(hashFile(fileURLToPath(import.meta.url)), summary.runnerSha256);
    const copies = assertCopies();
    assert.deepEqual(copies.map(row => row.name).sort(), [
      ...Object.keys(productPins).map(file => path.basename(file).replace('.tsx', '.healthy.tsx')),
      ...recipes.map(recipe => recipe.id + '.fault.tsx'),
    ].sort(), 'PITCH_CONTROL_ALL_SIX_COPY_MEMBERS');
    json('input-holds.json', { fullSourceRows: sourceAfter.length, fullDependencyRows: depsAfter.length, allEqual: true, inputPins, copies });
  } catch (error) { summary.errors.push({ phase: 'final-holds', name: error.name, message: error.message, stack: error.stack }); }
  summary.complete = summary.errors.length === 0 && summary.runs.length === 14 && summary.controls.length === 4 && summary.controls.every(c => c.healthy && c.fault && c.restored);
  summary.status = summary.complete ? 'ACTUAL_FIXED_NINE_AND_FOUR_COPIED_SOURCE_CONTROLS_PASS' : 'REFUSED'; json('proof.json', summary);
}
console.log('Pitch copied-source controls: ' + summary.status + ', ' + summary.runs.length + '/14 processes and ' + summary.controls.filter(c => c.healthy && c.fault && c.restored).length + '/4 controls.');
if (!summary.complete) process.exitCode = 1;

