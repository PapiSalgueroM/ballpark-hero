import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

// Remote-only actual-import controls. This file does not change product sources.
const MANIFEST_SHA = 'e72f8819fc3bca9a128d3bdb28202d91a6510495154b16adf23a806b5dd4b4a6';
const RECIPES_SHA = '2d7199f2a86efa12b618a7f16b4f944b3ed936fa45de558e45acd8c5ca2d1493';
const CONFIG_BLOB = 'ed2a9dc677f77dfe95c061064eeff5782b856864';
const MOMENT_RECIPES_SHA = 'b04ba053ceed1854dafab35e27f0b81bf7212b9993d2b93fcfdf0a91e4e72eb1';
const OLD_CORE_SHA = '66acef16d52f023fcb73ec7fb18a626f44c372bbfc182ca355681ac65f17caec';
const LEDGER = 'src/lib/season/momentsSave.ts';
const HOOK = 'src/components/soccer-career/useSoccerMoments.tsx';
const CORE = 'src/lib/careerDrills.ts';
const BOARD = 'src/components/soccer-career/DrillBoard.tsx';
const CORE_SHA = 'a5a66ed166667051d24e0d737f47941587b28edd633a7823c6e6741172db3c74';
const BOARD_SHA = '23294f3ccbf23a10753c076ea040998565adeaa2ac8a9661c52d20999e8d3f87';
const configAliases = { [CORE]: '@/lib/careerDrills', [BOARD]: '@/components/soccer-career/DrillBoard', [LEDGER]: '@/lib/season/momentsSave', [HOOK]: '@/components/soccer-career/useSoccerMoments' };
const sourcePins = { [CORE]: CORE_SHA, [BOARD]: BOARD_SHA, [LEDGER]: '2dfaf3a4e1300668e656f487befeb8fe50f76821d382262cf5b45a8c4f4218ab', [HOOK]: 'cf22ab07c57f6ccc707dfe0a21d2f5d46d1a495de94740c9d3eab674dd69c65e' };
const hookAdapters = [[" from './SoccerMomentBoard';", " from '@/components/soccer-career/SoccerMomentBoard';"]];
const adapters = [
  [" from './arcade';", " from '@/lib/arcade';"],
  [" from './freeKick';", " from '@/lib/freeKick';"],
  [" from './soccerCareerEngine';", " from '@/lib/soccerCareerEngine';"],
  [" from './season/momentsSave';", " from '@/lib/season/momentsSave';"],
];
const sha = body => crypto.createHash('sha256').update(body).digest('hex');
const hashFile = file => sha(fs.readFileSync(file));
const safe = file => typeof file === 'string' && /^[A-Za-z0-9_.\/-]+$/.test(file) && !file.startsWith('/') && !file.includes('..') && !file.includes('//');
const occurrences = (body, part) => { assert(part.length > 0); return body.split(part).length - 1; };
const stripAnsi = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const options = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i], value = process.argv[i + 1];
  assert(['--manifest', '--recipes', '--moment-recipes', '--core-original', '--out'].includes(key) && value && !options.has(key), 'WALL_CONTROL_ARGUMENTS');
  options.set(key, value);
}
assert.equal(options.size, 5, 'WALL_CONTROL_ARGUMENTS');
assert.equal(process.env.GITHUB_REPOSITORY, 'PapiSalgueroM/ballpark-hero');
assert.equal(process.env.GITHUB_REPOSITORY_ID, '1195729679');
assert.equal(process.env.GITHUB_REF, 'refs/heads/codex/career-finite-wall');
assert(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''));
assert(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '') && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || ''));
assert.equal(git(['rev-parse', 'HEAD']).trim(), process.env.GITHUB_SHA);
assert.equal(git(['rev-parse', 'HEAD:vitest.config.ts']).trim(), CONFIG_BLOB, 'WALL_CONTROL_ACTUAL_CONFIG');
assert(!process.env.NO_DOUBLE_SWAP, 'WALL_CONTROL_NO_INHERITED_SWAP');
const root = fs.realpathSync(process.cwd()), runnerTemp = fs.realpathSync(process.env.RUNNER_TEMP);
const out = path.resolve(options.get('--out'));
assert(out.startsWith(runnerTemp + path.sep) && !fs.existsSync(out), 'WALL_CONTROL_FRESH_OUTPUT');
const manifestFile = path.resolve(options.get('--manifest')), recipesFile = path.resolve(options.get('--recipes'));
assert.equal(hashFile(manifestFile), MANIFEST_SHA, 'WALL_CONTROL_MANIFEST_PIN');
assert.equal(hashFile(recipesFile), RECIPES_SHA, 'WALL_CONTROL_RECIPES_PIN');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const recipes = JSON.parse(fs.readFileSync(recipesFile, 'utf8'));
const momentFile = path.resolve(options.get('--moment-recipes')), oldCoreFile = path.resolve(options.get('--core-original'));
assert.equal(hashFile(momentFile), MOMENT_RECIPES_SHA, 'WALL_CONTROL_MOMENT_RECIPES_PIN');
assert.equal(hashFile(oldCoreFile), OLD_CORE_SHA, 'WALL_CONTROL_WHOLE_OLD_CORE_PIN');
const momentRecipes = JSON.parse(fs.readFileSync(momentFile, 'utf8'));
assert.equal(momentRecipes.count, 7); assert.equal(momentRecipes.recipes.length, 7);
assert.equal(manifest.suites.length, 12);
assert.equal(manifest.suites.reduce((n, s) => n + s.tests, 0), 84);
assert.equal(Object.keys(manifest.pins).length, 18);
const suites = new Map();
for (const entry of manifest.suites) {
  assert(safe(entry.file) && entry.file.startsWith('src/test/') && /\.test\.tsx?$/.test(entry.file));
  assert(Number.isSafeInteger(entry.tests) && entry.tests > 0 && !suites.has(entry.file));
  suites.set(entry.file, entry.tests);
}
assert.equal(suites.get('src/test/careerWallShot.test.ts'), 6);
assert.equal(suites.get('src/test/soccerMomentWallRules.test.ts'), 7);
for (const [file, expected] of Object.entries(manifest.pins)) {
  assert(safe(file) && /^[a-f0-9]{64}$/.test(expected));
  assert.equal(hashFile(file), expected, file);
}
assert.equal(manifest.pins[CORE], CORE_SHA); assert.equal(manifest.pins[BOARD], BOARD_SHA);
assert.equal(manifest.pins['src/test/careerWallShot.test.ts'], 'b75993336f618d9dc0322756dd021d71b4a412109bbe0be72f71208b464e54bb');
assert.equal(manifest.pins['src/test/soccerMomentWallRules.test.ts'], 'e5e8ca9ffc26e15bdaf51b057e55d34f4bd738c0325f7440f3df71fe8809605d');
assert.equal(recipes.count, 17); assert.equal(recipes.controls.length, 17);
const originals = new Map(Object.keys(sourcePins).map(file => [file, fs.readFileSync(file, 'utf8')]));
for (const [file, expected] of Object.entries(sourcePins)) { assert.equal(manifest.pins[file], expected); assert.equal(sha(originals.get(file)), expected); }
const oldCore = fs.readFileSync(oldCoreFile, 'utf8');
const oldCoreRecipe = {
  id: 'core-old-whole', kind: 'whole-original-core', target: CORE, alias: configAliases[CORE],
  sourceSha256: CORE_SHA, before: originals.get(CORE), after: oldCore, position: 0, forwardCount: 1,
  changedSha256: OLD_CORE_SHA, wholeInverseSha256: CORE_SHA,
  testPath: 'src/test/careerWallShot.test.ts', caseTitle: null, expectedExit: 1,
  expectedAssertionMarkers: ['WALL_V2_FINITE_WINGS_CLEAR', 'WALL_V2_ABOVE_WALL_CLEAR'],
  classifier: { total: 6, passed: 4, failed: 2, pending: 0, todo: 0, exactOwnedFailures: [
    { caseTitle: 'allows a low shot around either end of the rules-2 wall', marker: 'WALL_V2_FINITE_WINGS_CLEAR' },
    { caseTitle: 'allows a high shot above the rules-2 wall even when the old gap is closed', marker: 'WALL_V2_ABOVE_WALL_CLEAR' },
  ] },
};
const allRecipes = [...recipes.controls.map(recipe => ({ ...recipe, target: recipe.sourceSha256 === CORE_SHA ? CORE : BOARD, kind: 'single-case-mutation' })), ...momentRecipes.recipes, oldCoreRecipe];
assert.equal(allRecipes.length, 25);
function changedBody(recipe) {
  const raw = originals.get(recipe.target), position = recipe.position ?? raw.indexOf(recipe.before);
  assert(Number.isSafeInteger(position) && position >= 0 && raw.slice(position, position + recipe.before.length) === recipe.before);
  assert.equal(occurrences(raw, recipe.before), 1, recipe.id + ':before');
  const changed = raw.slice(0, position) + recipe.after + raw.slice(position + recipe.before.length);
  assert.notEqual(changed, raw); assert.equal(sha(changed), recipe.changedSha256, recipe.id + ':changed');
  assert.equal(changed.slice(position, position + recipe.after.length), recipe.after);
  const inverse = changed.slice(0, position) + recipe.before + changed.slice(position + recipe.after.length);
  assert.equal(inverse, raw, recipe.id + ':positioned-inverse'); assert.equal(sha(inverse), recipe.wholeInverseSha256);
  return changed;
}
const ids = new Set();
for (const recipe of allRecipes) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id) && !ids.has(recipe.id)); ids.add(recipe.id);
  assert(Object.hasOwn(sourcePins, recipe.target)); assert.equal(sourcePins[recipe.target], recipe.sourceSha256);
  if (recipe.alias) assert.equal(recipe.alias, configAliases[recipe.target]);
  assert.equal(recipe.forwardCount, 1); changedBody(recipe);
  assert(suites.has(recipe.testPath)); if (recipe.testSourceSha256) assert.equal(manifest.pins[recipe.testPath], recipe.testSourceSha256);
  assert(Array.isArray(recipe.expectedAssertionMarkers) && recipe.expectedAssertionMarkers.length > 0);
  for (const marker of recipe.expectedAssertionMarkers) assert(/^[A-Z][A-Z0-9_]+$/.test(marker));
  assert.equal(recipe.expectedExit, 1);
  if (recipe.kind.startsWith('whole-original-')) {
    assert.equal(recipe.caseTitle, null); const c = recipe.classifier;
    assert.equal(c.total, suites.get(recipe.testPath)); assert.equal(c.total, c.passed + c.failed);
    assert.equal(c.pending, 0); assert.equal(c.todo, 0); assert.equal(c.exactOwnedFailures.length, c.failed);
    assert.equal(new Set(c.exactOwnedFailures.map(row => row.caseTitle)).size, c.failed);
    for (const row of c.exactOwnedFailures) assert(recipe.expectedAssertionMarkers.includes(row.marker));
  } else assert(typeof recipe.caseTitle === 'string' && recipe.caseTitle.trim() === recipe.caseTitle && recipe.caseTitle.length > 0);
}
const copyRoot = path.join(root, '.sim-control/career-finite-wall-source-controls');
assert(!fs.existsSync(copyRoot), 'WALL_CONTROL_FRESH_COPIES');
git(['check-ignore', '--quiet', '.sim-control/career-finite-wall-source-controls/owned.ts']);
assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '', 'WALL_CONTROL_CLEAN_START');
fs.mkdirSync(out);
const write = (name, body) => fs.writeFileSync(path.join(out, name), body, { flag: 'wx' });
const json = (name, value) => write(name, JSON.stringify(value, null, 2) + '\n');
const errors = [], runs = [], controls = [], adapterProofs = [];
const binding = { source: process.env.GITHUB_SHA, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, repository: process.env.GITHUB_REPOSITORY, manifestSha256: MANIFEST_SHA, recipesSha256: RECIPES_SHA, runnerSha256: hashFile(fileURLToPath(import.meta.url)), configGitBlob: CONFIG_BLOB };
binding.momentRecipesSha256 = MOMENT_RECIPES_SHA; binding.wholeOriginalCoreSha256 = OLD_CORE_SHA;
json('binding.json', binding); write('pilot-manifest.json', fs.readFileSync(manifestFile)); write('source-recipes.json', fs.readFileSync(recipesFile));
write('moment-recipes.json', fs.readFileSync(momentFile)); write('careerDrills.original.ts', fs.readFileSync(oldCoreFile));
json('whole-original-core-classifier.json', oldCoreRecipe);

function sourceMembers() {
  const raw = git(['ls-files', '-z']);
  const files = raw.split('\0').filter(Boolean).sort();
  assert.equal(new Set(files).size, files.length); for (const file of files) assert(safe(file));
  return files;
}
function dependencyMembers(directory = 'node_modules') {
  const found = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = dir + '/' + entry.name;
      if (file === 'node_modules/.vite') continue;
      if (entry.isDirectory()) visit(file); else if (entry.isFile()) found.push(file);
    }
  }
  visit(directory); return found.sort();
}
function snapshot(files) { return files.map(file => ({ file, sha256: hashFile(file) })); }
function saveInventory(stem, rows) {
  write(stem + '.members', rows.map(row => row.file).join('\0') + '\0');
  write(stem + '.sha256', rows.map(row => row.sha256 + '  ' + row.file).join('\n') + '\n');
}
let sourceBefore, dependenciesBefore;
const copies = new Map([[CORE, path.join(copyRoot, 'careerDrills.ts')], [BOARD, path.join(copyRoot, 'DrillBoard.tsx')], [LEDGER, path.join(copyRoot, 'momentsSave.ts')], [HOOK, path.join(copyRoot, 'useSoccerMoments.tsx')]]);
const swap = Object.fromEntries([...copies].map(([file, copy]) => [configAliases[file], copy]));
function adapt(target, body) {
  let result = body; const stages = [];
  const rules = target === CORE ? adapters : target === HOOK ? hookAdapters : [];
  for (const [before, after] of rules) {
    assert.equal(occurrences(result, before), 1, 'WALL_CONTROL_IMPORT_ADAPTER_BEFORE');
    result = result.replace(before, after); stages.push({ before, after, sha256: sha(result) });
  }
  let inverse = result;
  for (const [before, after] of rules.slice().reverse()) {
    assert.equal(occurrences(inverse, after), 1, 'WALL_CONTROL_IMPORT_ADAPTER_AFTER'); inverse = inverse.replace(after, before);
  }
  assert.equal(inverse, body, 'WALL_CONTROL_IMPORT_ADAPTER_INVERSE');
  return { body: result, sourceSha256: sha(body), adaptedSha256: sha(result), stages, wholeInverseExact: true };
}
function copy(target, raw, label) {
  const proof = adapt(target, raw), file = copies.get(target);
  fs.writeFileSync(file, proof.body); assert.equal(hashFile(file), proof.adaptedSha256);
  write(label + '.raw-source.txt', raw); write(label + '.adapted-source.txt', proof.body);
  adapterProofs.push({ label, target, ...proof, body: undefined });
}
function runtimes(raw) {
  const names = ['numRuntimeErrorTestSuites', 'numUnhandledErrors'];
  for (const name of names) if (Object.hasOwn(raw, name)) assert.equal(raw[name], 0, name);
  if (Object.hasOwn(raw, 'unhandledErrors')) assert.deepEqual(raw.unhandledErrors, []);
  return { observed: Object.fromEntries(names.filter(k => Object.hasOwn(raw, k)).map(k => [k, raw[k]])), absentUnknown: names.filter(k => !Object.hasOwn(raw, k)), unhandledErrorsPresent: Object.hasOwn(raw, 'unhandledErrors') };
}
function run(label, recipe = null, fault = false) {
  const whole = recipe?.kind.startsWith('whole-original-') ?? false;
  const active = [...copies].map(([target, copyFile]) => ({ file: copyFile, sha256: adapt(target, fault && recipe.target === target ? changedBody(recipe) : originals.get(target)).adaptedSha256 }));
  for (const row of active) assert.equal(hashFile(row.file), row.sha256, 'WALL_CONTROL_ACTIVE_COPY');
  const fileList = recipe ? [recipe.testPath] : [...suites.keys()];
  const reportFile = path.join(out, label + '.json'), logFile = path.join(out, label + '.log'), transportFile = path.join(out, label + '.transport');
  fs.writeFileSync(transportFile, '', { flag: 'wx' });
  const args = ['run', ...fileList, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + reportFile];
  if (recipe && !whole) args.push('--testNamePattern=(?:^|\\s)' + escapeRegex(recipe.caseTitle) + '$');
  const fd = fs.openSync(logFile, 'wx'); let child;
  try {
    child = spawnSync('node_modules/.bin/vitest', args, { cwd: root, env: { ...process.env, SIM_NETWORK: 'offline', SIM_OFFLINE_RECEIPT: transportFile, NO_DOUBLE_SWAP: JSON.stringify(swap), NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs') }, stdio: ['ignore', fd, fd], timeout: 180000, killSignal: 'SIGTERM' });
  } finally { fs.closeSync(fd); }
  write(label + '.exit', child.status === null ? 'NO_EXIT_CODE\n' : child.status + '\n');
  json(label + '.process.json', { status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message, code: child.error.code } : null, args, swap });
  for (const row of active) assert.equal(hashFile(row.file), row.sha256, label + ':copied-source-hold');
  assert.equal(child.error, undefined, label + ':spawn-or-timeout'); assert.equal(child.signal, null, label + ':signal');
  assert.equal(child.status, fault ? 1 : 0, label + ':exit');
  assert.equal(fs.statSync(transportFile).size, 0, label + ':transport');
  const raw = JSON.parse(fs.readFileSync(reportFile, 'utf8')), runtime = runtimes(raw);
  assert.doesNotMatch(stripAnsi(fs.readFileSync(logFile, 'utf8')), /Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i, label + ':runtime-log');
  assert.equal(raw.success, !fault); assert.equal(raw.numTodoTests, 0);
  assert.equal(raw.testResults.length, fileList.length, label + ':suite-count');
  const expectedTotal = fileList.reduce((n, file) => n + suites.get(file), 0);
  assert.equal(raw.numTotalTests, expectedTotal);
  const failures = new Map(fault ? whole ? recipe.classifier.exactOwnedFailures.map(row => [row.caseTitle, [row.marker]]) : [[recipe.caseTitle, recipe.expectedAssertionMarkers]] : []);
  const expectedPassed = fault ? whole ? recipe.classifier.passed : 0 : recipe && !whole ? 1 : expectedTotal;
  assert.equal(raw.numPassedTests, expectedPassed);
  assert.equal(raw.numFailedTests, failures.size);
  assert.equal(raw.numPendingTests, recipe && !whole ? expectedTotal - 1 : 0);
  const seen = new Set(), seenCases = new Set(), observedFailures = []; let selectedCount = 0;
  for (const suite of raw.testResults) {
    const file = path.relative(root, path.resolve(suite.name)).split(path.sep).join('/');
    assert(fileList.includes(file) && !seen.has(file), label + ':actual-suite'); seen.add(file);
    assert.equal(suite.assertionResults.length, suites.get(file), label + ':discovery');
    assert.equal(suite.status, fault ? 'failed' : 'passed', label + ':suite-status');
    for (const row of suite.assertionResults) {
      const selected = !recipe || whole || row.title === recipe.caseTitle;
      if (!selected) { assert(['pending', 'skipped'].includes(row.status), label + ':other-case-executed'); assert.deepEqual(row.failureMessages, []); continue; }
      selectedCount += 1;
      if (recipe) { assert(!seenCases.has(row.title), label + ':unique-case'); seenCases.add(row.title); }
      const markersForCase = failures.get(row.title);
      assert.equal(row.status, markersForCase ? 'failed' : 'passed', row.fullName);
      if (!markersForCase) { assert.deepEqual(row.failureMessages, []); continue; }
      assert.equal(row.failureMessages.length, 1, label + ':single-assertion');
      const message = stripAnsi(row.failureMessages[0]);
      assert(/^\s*AssertionError:/.test(message), label + ':owned-assertion-required');
      assert.doesNotMatch(message, /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|UnhandledError)\s*:/, label + ':setup-or-runtime-refusal');
      const markers = markersForCase.filter(marker => new RegExp('(?:^|[^A-Z0-9_])' + marker + '(?:$|[^A-Z0-9_])').test(message));
      assert(markers.length > 0, label + ':owned-marker');
      observedFailures.push({ title: row.title, fullName: row.fullName, observedOwnedMarkers: markers, failureMessages: row.failureMessages });
    }
  }
  assert.equal(seen.size, fileList.length); assert.equal(selectedCount, recipe && !whole ? 1 : expectedTotal);
  assert.equal(observedFailures.length, failures.size);
  const observation = { label, control: recipe?.id ?? null, phase: fault ? 'fault' : recipe ? label.endsWith('-healthy') ? 'healthy' : 'restored' : label, processExit: child.status, suites: fileList, total: expectedTotal, passed: raw.numPassedTests, failed: raw.numFailedTests, pending: raw.numPendingTests, runtime, rawJsonSha256: hashFile(reportFile), logSha256: hashFile(logFile), transportSha256: hashFile(transportFile), owned: observedFailures };
  runs.push(observation); json(label + '.observation.json', observation); return observation;
}
try {
  sourceBefore = snapshot(sourceMembers()); dependenciesBefore = snapshot(dependencyMembers());
  saveInventory('source-before', sourceBefore); saveInventory('dependencies-before', dependenciesBefore);
  fs.mkdirSync(copyRoot, { recursive: true });
  for (const [target, raw] of originals) copy(target, raw, path.basename(copies.get(target)) + '-initial');
  let healthy = false;
  try { run('all-copy-healthy'); healthy = true; } catch (error) { errors.push({ phase: 'all-copy-healthy', name: error.name, message: error.message, stack: error.stack }); }
  if (healthy) for (const recipe of allRecipes) {
    const target = recipe.target, raw = originals.get(target);
    const record = { id: recipe.id, target, sourceSha256: recipe.sourceSha256, changedSha256: recipe.changedSha256, wholeInverseExact: false, healthy: false, fault: false, restored: false, errors: [] };
    try {
      run(recipe.id + '-healthy', recipe); record.healthy = true;
      const changed = changedBody(recipe);
      copy(target, changed, recipe.id + '-fault');
      record.wholeInverseExact = true;
      run(recipe.id + '-fault', recipe, true); record.fault = true;
    } catch (error) { record.errors.push({ phase: 'healthy-or-fault', name: error.name, message: error.message, stack: error.stack }); }
    finally {
      try { copy(target, raw, recipe.id + '-restored'); run(recipe.id + '-restored', recipe); record.restored = true; }
      catch (error) { record.errors.push({ phase: 'restored', name: error.name, message: error.message, stack: error.stack }); }
    }
    controls.push(record); if (!record.healthy || !record.fault || !record.restored || record.errors.length) errors.push({ phase: recipe.id, message: 'control not admitted', details: record.errors });
  }
} catch (error) { errors.push({ phase: 'setup-or-controls', name: error.name, message: error.message, stack: error.stack }); }
finally {
  try {
    if (fs.existsSync(copyRoot)) {
      for (const [target, raw] of originals) copy(target, raw, path.basename(copies.get(target)) + '-final');
      run('all-copy-restored');
    }
  } catch (error) { errors.push({ phase: 'all-copy-restored', name: error.name, message: error.message, stack: error.stack }); }
  try {
    assert(sourceBefore && dependenciesBefore, 'WALL_CONTROL_COMPLETE_BEFORE_INVENTORIES');
    const sourceAfter = snapshot(sourceMembers()), dependenciesAfter = snapshot(dependencyMembers());
    saveInventory('source-after', sourceAfter); saveInventory('dependencies-after', dependenciesAfter);
    assert.deepEqual(sourceAfter, sourceBefore, 'WALL_CONTROL_TRACKED_SOURCE_HOLD');
    assert.deepEqual(dependenciesAfter, dependenciesBefore, 'WALL_CONTROL_DEPENDENCIES_HOLD');
    assert.equal(git(['rev-parse', 'HEAD']).trim(), binding.source);
    const diff = git(['diff', '--exit-code', 'HEAD']); write('source-diff.log', diff); assert.equal(diff, '');
    const status = git(['status', '--porcelain', '--untracked-files=all']); write('git-status.log', status); assert.equal(status, '');
    for (const name of fs.readdirSync(out).filter(name => name.endsWith('.transport'))) assert.equal(fs.statSync(path.join(out, name)).size, 0, name);
    write('final-holds.exit', '0\n');
  } catch (error) { errors.push({ phase: 'final-holds', name: error.name, message: error.message, stack: error.stack }); if (!fs.existsSync(path.join(out, 'final-holds.exit'))) write('final-holds.exit', '1\n'); }
  json('copy-adapters.json', { coreImportOnly: adapters, hookImportOnly: hookAdapters, proofs: adapterProofs });
  const complete = errors.length === 0 && controls.length === 25 && runs.length === 77 && controls.every(row => row.healthy && row.fault && row.restored && row.wholeInverseExact);
  json('report.json', { status: complete ? 'WALL_COPIED_SOURCE_CONTROLS_ADMITTED' : 'WALL_COPIED_SOURCE_CONTROLS_REFUSED', complete, ...binding, controlCount: controls.length, expectedControls: 25, observedRunCount: runs.length, expectedRuns: 77, controls, runs, errors, applicationQualified: false, browserOrPixelClaim: false, missingRuntimeCountersRemainUnknown: true });
  const names = fs.readdirSync(out).sort();
  write('evidence.sha256', names.map(name => { assert(safe(name) && fs.statSync(path.join(out, name)).isFile()); return hashFile(path.join(out, name)) + '  ' + name; }).join('\n') + '\n');
  process.exitCode = complete ? 0 : 1;
}
