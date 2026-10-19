import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { BASE, FORM_FILES, CATEGORY_HUNKS, ORIGINAL_SHA256, FIXED_SHA256, changeCategory, hash, ORIGINAL_ADMISSION, assertOriginalAdmission } from './reportCategoryPressedState1437.mjs';

export const OLD_ENTRIES = ['scripts/simReportDraftLifecycle.mjs', 'scripts/simReportSubmitPendingNames.mjs'];
export const OLD_METHOD_SHA256 = ['633813aabbd404bb6fe371b540d0f2ab38b206d6a5264f5a1596aae39b27fbcd', '6b704cf4a584ae46edfa7a194354907c87f650602a179f219dfb51db80be0a54'];
export const PREFIXES = OLD_ENTRIES.map(() => "import { dispatchHistoricalCategoryDefault1437 } from './qa/reportCategoryCompatibility1437.mjs';\nif (await dispatchHistoricalCategoryDefault1437(import.meta.url)) process.exit(0);\n");
const OLD_KEYS = ['REPORT_DRAFT_MODE', 'REPORT_DRAFT_OUT', 'REPORT_PENDING_NAMES_MODE', 'REPORT_PENDING_NAMES_OUT'];
const TEMP_PREFIXES = ['report-draft-evidence-', 'report-submit-pending-names-evidence-'];
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const git = (root, args, binary = false) => {
  const result = spawnSync('git', args, { cwd: root, encoding: binary ? undefined : 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120000 });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(result.status, 0, `Exact historical Git ${args.join(' ')}: ${result.stderr}`); return result.stdout;
};
export const manifest = root => fs.readdirSync(root, { recursive: true, withFileTypes: true }).map(entry => {
  assert(!entry.isSymbolicLink() && (entry.isFile() || entry.isDirectory()), 'Every complete-tree member must be an ordinary file or directory');
  const full = path.join(entry.parentPath, entry.name), directory = entry.isDirectory();
  return { file: path.relative(root, full).split(path.sep).join('/'), type: directory ? 'directory' : 'file', bytes: directory ? 0 : fs.statSync(full).size, sha256: directory ? null : hash(fs.readFileSync(full)) };
}).sort((a, b) => a.file.localeCompare(b.file));
export function recoverOldMethod(source, index) {
  assert(Number.isInteger(index) && index >= 0 && index < OLD_ENTRIES.length, 'Known historical method');
  const prefix = PREFIXES[index]; assert(source.startsWith(prefix), 'Exact additive historical prefix at byte zero');
  assert.equal(source.split(prefix).length, 2, 'Exactly one additive historical prefix');
  const recovered = source.slice(prefix.length); assert.notEqual(recovered, source);
  assert.equal(hash(recovered), OLD_METHOD_SHA256[index], 'Complete historical method inverse, no predicate waiver');
  assert.equal(prefix + recovered, source, 'Whole historical forward recovery'); return recovered;
}
export function assertHistoricalCaller(root, entry, argv, env) {
  assert.equal(argv.length, 2, 'Exact ordinary historical CLI argv');
  const relative = path.relative(root, entry).split(path.sep).join('/');
  assert(OLD_ENTRIES.includes(relative), 'Known historical entry caller');
  assert.equal(path.resolve(argv[1]), path.resolve(entry), 'Only an ordinary direct historical CLI can dispatch');
  for (const key of OLD_KEYS) assert(!Object.hasOwn(env, key), `Historical ordinary defaults require absent ${key}`);
  return OLD_ENTRIES.indexOf(relative);
}
export function assertHistoricalForms(actual) {
  assert.equal(actual.length, FORM_FILES.length, 'Exact two historical caller forms');
  const arm = actual.every((body, index) => hash(body) === ORIGINAL_SHA256[FORM_FILES[index]]) ? 'original' : actual.every((body, index) => hash(body) === FIXED_SHA256[FORM_FILES[index]]) ? 'category' : null;
  assert(arm, 'Only the exact whole original or both category forms are historical callers'); return arm;
}
export function compatibilityPlan(root) {
  const methods = {}, methodInverses = [], forms = {}, formInverses = [];
  for (const [index, file] of OLD_ENTRIES.entries()) {
    const actual = fs.readFileSync(path.join(root, file), 'utf8'), recovered = recoverOldMethod(actual, index);
    assert.equal(recovered, git(root, ['show', `${BASE}:${file}`]), 'Entire old method equals exact admitted Git body');
    methods[file] = recovered; methodInverses.push({ file, prefix: PREFIXES[index], actualSha256: hash(actual), recoveredSha256: hash(recovered), forwardSha256: hash(PREFIXES[index] + recovered) });
  }
  const actual = FORM_FILES.map(file => fs.readFileSync(path.join(root, file), 'utf8'));
  const sourceArm = assertHistoricalForms(actual);
  if (sourceArm === 'category') assertOriginalAdmission({ originalAdmission: ORIGINAL_ADMISSION });
  for (const [index, file] of FORM_FILES.entries()) {
    const recovered = sourceArm === 'category' ? changeCategory(actual[index], CATEGORY_HUNKS[index], 'inverse') : actual[index];
    assert.equal(hash(recovered), ORIGINAL_SHA256[file]); assert.equal(recovered, git(root, ['show', `${BASE}:${file}`]), 'Whole historical original form equals Git');
    forms[file] = recovered; formInverses.push({ file, sourceArm, actualSha256: hash(actual[index]), recoveredSha256: hash(recovered), changed: actual[index] !== recovered });
  }
  return { methods, forms, sourceArm, methodInverses, formInverses };
}
function rawCases(file, count, failed) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')); assert.equal(raw.numTotalTests, count); assert.equal(raw.numFailedTests, failed); assert.equal(raw.numPassedTests, count - failed);
  assert.equal(raw.numPendingTests, 0); assert.equal(raw.numTodoTests, 0); assert.equal(raw.numRuntimeErrorTestSuites || 0, 0); assert.equal(raw.numUnhandledErrors || 0, 0);
  if (raw.unhandledErrors !== undefined) assert.deepEqual(raw.unhandledErrors, []);
  const rows = raw.testResults.flatMap(item => item.assertionResults); assert.equal(rows.length, count); assert(rows.every(row => ['passed', 'failed'].includes(row.status))); return rows;
}
function verifyLifecycle(directory) {
  const value = JSON.parse(fs.readFileSync(path.join(directory, 'unit/summary.json'), 'utf8'));
  assert.equal(value.mode, 'fixed'); assert.equal(value.sourceHeld, true); assert.equal(value.temporaryModulesRemoved, true);
  const names = ['normal', 'bare', 'original', 'completion-owner', 'timer-owner', 'restored'], faults = [0, 0, 12, 10, 2, 0];
  assert.deepEqual(value.cases.map(row => row.name), names);
  for (const [index, name] of names.entries()) {
    const rows = rawCases(path.join(directory, 'unit', name + '.json'), 14, faults[index]);
    assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => ({ name: row.fullName, messages: row.failureMessages })), value.cases[index].failures);
    const receipt = path.join(directory, 'unit', name + '.transport'); if (fs.existsSync(receipt)) assert.equal(fs.statSync(receipt).size, 0);
    assert(!/Unhandled\s+(?:Errors?|Rejections?)|SIM_OFFLINE_BLOCK/i.test(fs.readFileSync(path.join(directory, 'unit', name + '.log'), 'utf8')));
  }
  for (const inverse of value.formInverses) assert.equal(inverse.fixedSha256, ORIGINAL_SHA256[inverse.file]);
  return { cases: 84, purposeFaults: 24, wholeSummarySha256: hash(fs.readFileSync(path.join(directory, 'unit/summary.json'))) };
}
function verifyPending(directory) {
  const value = JSON.parse(fs.readFileSync(path.join(directory, 'unit/summary.json'), 'utf8'));
  assert.equal(value.status, 'passed'); assert.equal(value.mode, 'fixed'); assert.equal(value.modeEnvAbsent, true); assert.equal(value.outEnvAbsent, true); assert.equal(value.sourceHeld, true); assert.equal(value.temporaryModulesRemoved, true);
  assert.deepEqual(value.forms.actualSha256, ORIGINAL_SHA256);
  const names = ['normal', 'bare', 'whole-original', 'footer-omission', 'game-omission', 'restored'], faults = [0, 0, 4, 2, 2, 0];
  assert.deepEqual(value.arms.map(row => row.name), names);
  for (const [index, name] of names.entries()) {
    const rows = rawCases(path.join(directory, 'unit', name, 'vitest.json'), 6, faults[index]);
    assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => ({ name: row.fullName, messages: row.failureMessages })), value.arms[index].failures);
    assert.equal(fs.statSync(path.join(directory, 'unit', name, 'transport.transport')).size, 0);
  }
  rawCases(path.join(directory, 'unit/current/vitest.json'), 38, 0); assert.equal(value.current.cases, 38);
  const nested = verifyLifecycle(path.join(directory, 'unit/legacy/evidence')); assert.equal(value.legacy.cases, nested.cases);
  return { cases: 36, purposeFaults: 8, repeatedHistoricalRegressionCases: 38, nestedLifecycle: nested, wholeSummarySha256: hash(fs.readFileSync(path.join(directory, 'unit/summary.json'))) };
}
function safeFreshTemp(name) {
  const absolute = path.resolve(name); assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()), 'Only direct owned OS-temp packets are cleaned');
  assert(TEMP_PREFIXES.some(prefix => path.basename(absolute).startsWith(prefix)), 'Known historical packet prefix'); return absolute;
}
export async function dispatchHistoricalCategoryDefault1437(moduleUrl) {
  const entry = path.resolve(fileURLToPath(moduleUrl)), root = path.resolve(path.dirname(entry), '..');
  const relative = path.relative(root, entry).split(path.sep).join('/'), index = assertHistoricalCaller(root, entry, process.argv, process.env);
  const require = createRequire(moduleUrl), parentPreload = path.join(root, 'scripts/lib/offlineTransport.cjs');
  assert(require.cache[require.resolve(parentPreload)], 'Ordinary offline preload required by historical dispatcher'); assert.equal(process.env.SIM_NETWORK, 'offline');
  const plan = compatibilityPlan(root), evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'report-category-historical-'));
  const childRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'report-category-historical-tree-')), checkout = path.join(childRoot, 'checkout');
  const prior = new Set(fs.readdirSync(os.tmpdir()).filter(name => TEMP_PREFIXES.some(prefix => name.startsWith(prefix))));
  const head = git(root, ['rev-parse', 'HEAD']).trim(), summary = { version: 1, scope: 'historical-report-default', status: 'running', entry: relative, sourceArm: plan.sourceArm, exactHead: head, modeEnvAbsent: true, outEnvAbsent: true, methodInverses: plan.methodInverses, formInverses: plan.formInverses, actualCurrentCategoryProof: false, current44Credit: false };
  let failure;
  try {
    const archive = git(root, ['archive', '--format=zip', head], true); fs.writeFileSync(path.join(evidenceRoot, 'exact-head.zip'), archive); summary.archiveSha256 = hash(archive);
    git(root, ['clone', '--shared', '--no-checkout', root, checkout]); git(checkout, ['checkout', '--detach', head]); assert.equal(git(checkout, ['rev-parse', 'HEAD']).trim(), head);
    const initial = git(checkout, ['ls-files', '-z']).split('\0').filter(Boolean).sort();
    const parentMembers = git(root, ['ls-files', '-z']).split('\0').filter(Boolean).sort(); assert.deepEqual(initial, parentMembers, 'Whole parent and detached archive membership match');
    const sourceTree = directory => Object.fromEntries(initial.map(file => [file, hash(fs.readFileSync(path.join(directory, file)))]));
    summary.parentTrackedTree = sourceTree(root); write(path.join(evidenceRoot, 'parent-tracked-tree.json'), summary.parentTrackedTree);
    summary.exactArchiveTree = sourceTree(checkout); assert.deepEqual(summary.exactArchiveTree, summary.parentTrackedTree, 'Every actual parent tracked source byte equals exact detached HEAD before inverse');
    write(path.join(evidenceRoot, 'exact-archive-tree.json'), summary.exactArchiveTree);
    for (const [file, body] of Object.entries({ ...plan.methods, ...plan.forms })) {
      assert.equal(fs.readFileSync(path.join(checkout, file), 'utf8'), fs.readFileSync(path.join(root, file), 'utf8'), 'Committed exact HEAD binds the actual input source');
      fs.writeFileSync(path.join(checkout, file), body); const saved = path.join(evidenceRoot, 'recovered', file); fs.mkdirSync(path.dirname(saved), { recursive: true }); fs.writeFileSync(saved, body);
    }
    const before = sourceTree(checkout); write(path.join(evidenceRoot, 'historical-source-before.json'), before);
    const allowed = [...OLD_ENTRIES, ...FORM_FILES]; assert.deepEqual(Object.keys(before).filter(file => before[file] !== summary.exactArchiveTree[file]).sort(), allowed.filter(file => hash(fs.readFileSync(path.join(root, file))) !== hash(({ ...plan.methods, ...plan.forms })[file])).sort());
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(checkout, 'node_modules'), 'dir');
    const env = { ...process.env }, options = env.NODE_OPTIONS || ''; assert.equal(options.split(parentPreload).length, 2, 'One exact parent ordinary preload path');
    env.NODE_OPTIONS = options.replace(parentPreload, path.join(checkout, 'scripts/lib/offlineTransport.cjs')); for (const key of OLD_KEYS) delete env[key];
    const receipt = path.join(evidenceRoot, 'transport.transport'); fs.writeFileSync(receipt, ''); env.SIM_OFFLINE_RECEIPT = receipt;
    const result = spawnSync(process.execPath, [relative], { cwd: checkout, env, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 1500000 });
    fs.writeFileSync(path.join(evidenceRoot, 'stdout.log'), result.stdout || ''); fs.writeFileSync(path.join(evidenceRoot, 'stderr.log'), result.stderr || '');
    write(path.join(evidenceRoot, 'process.json'), { executable: process.execPath, args: [relative], cwd: checkout, head, nodeOptionsBefore: options, nodeOptionsAfter: env.NODE_OPTIONS, parentPreload, childPreload: path.join(checkout, 'scripts/lib/offlineTransport.cjs'), parentPreloadSha256: hash(fs.readFileSync(parentPreload)), childPreloadSha256: hash(fs.readFileSync(path.join(checkout, 'scripts/lib/offlineTransport.cjs'))), oldKeysAbsent: OLD_KEYS.every(key => !Object.hasOwn(env, key)), exitCode: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null });
    assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(result.status, 0); assert.equal(fs.statSync(receipt).size, 0);
    assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|SIM_OFFLINE_BLOCK/i.test((result.stdout || '') + (result.stderr || '')));
    const fresh = fs.readdirSync(os.tmpdir()).filter(name => TEMP_PREFIXES.some(prefix => name.startsWith(prefix)) && !prior.has(name));
    const candidates = fresh.filter(name => name.startsWith(TEMP_PREFIXES[index])); assert.equal(candidates.length, 1, 'Exactly one actual requested old default packet');
    const actual = safeFreshTemp(path.join(os.tmpdir(), candidates[0])), copy = path.join(evidenceRoot, 'evidence'); fs.cpSync(actual, copy, { recursive: true, errorOnExist: true });
    const actualTree = manifest(actual); assert.deepEqual(manifest(copy), actualTree, 'Complete actual historical output tree copied'); write(path.join(evidenceRoot, 'copied-tree.json'), actualTree);
    summary.actualDirectory = actual; summary.copiedDirectory = 'evidence'; summary.copiedFiles = actualTree.filter(row => row.type === 'file').length; summary.copiedEntries = actualTree.length;
    summary.historical = index === 0 ? verifyLifecycle(copy) : verifyPending(copy);
    const after = sourceTree(checkout); write(path.join(evidenceRoot, 'historical-source-after.json'), after); assert.deepEqual(after, before, 'Every historical child source byte and membership held');
    assert.deepEqual(git(checkout, ['ls-files', '-z']).split('\0').filter(Boolean).sort(), initial); assert.deepEqual(sourceTree(root), summary.parentTrackedTree, 'Whole parent source held across historical default'); assert.deepEqual(git(root, ['ls-files', '-z']).split('\0').filter(Boolean).sort(), parentMembers); summary.parentTrackedTreeHeld = true; summary.sourceHeld = true; summary.status = 'passed';
  } catch (error) { failure = error; summary.status = 'failed'; summary.failure = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    const fresh = fs.readdirSync(os.tmpdir()).filter(name => TEMP_PREFIXES.some(prefix => name.startsWith(prefix)) && !prior.has(name));
    const acquisitions = [];
    for (const name of fresh) {
      const actual = safeFreshTemp(path.join(os.tmpdir(), name)); let acquired = summary.status !== 'failed';
      if (!acquired) {
        const copied = path.join(evidenceRoot, 'failure-default-packets', name), row = { name, actual, copied: path.relative(evidenceRoot, copied), acquired: false, originalRetained: true }; acquisitions.push(row);
        try { const tree = manifest(actual); fs.mkdirSync(path.dirname(copied), { recursive: true }); fs.cpSync(actual, copied, { recursive: true, errorOnExist: true }); assert.deepEqual(manifest(copied), tree); write(path.join(evidenceRoot, 'failure-default-' + name + '-tree.json'), tree); row.acquired = true; row.tree = 'failure-default-' + name + '-tree.json'; acquired = true; }
        catch (error) { row.failure = { name: error.name, message: error.message, stack: error.stack }; }
        if (acquired) row.originalRetained = false;
      }
      if (acquired) fs.rmSync(actual, { recursive: true, force: true });
    }
    summary.failedDefaultAcquisitions = acquisitions;
    fs.rmSync(childRoot, { recursive: true, force: true }); assert(!fs.existsSync(childRoot)); summary.childTreeRemoved = true;
    summary.actualDefaultPacketsRemoved = fresh.every(name => !fs.existsSync(path.join(os.tmpdir(), name))); write(path.join(evidenceRoot, 'summary.json'), summary);
  }
  console.log(JSON.stringify({ kind: 'report-category-historical-default', status: summary.status, entry: relative, evidenceRoot, summarySha256: hash(fs.readFileSync(path.join(evidenceRoot, 'summary.json'))), modeEnvAbsent: true, outEnvAbsent: true, sourceHeld: summary.sourceHeld === true, childTreeRemoved: summary.childTreeRemoved === true, historicalSourceReplay: true }));
  if (failure) throw failure;
  return true;
}
export function assertCompatibilityRefusals(root) {
  const result = [];
  for (const [index, file] of OLD_ENTRIES.entries()) {
    const source = fs.readFileSync(path.join(root, file), 'utf8'), prefix = PREFIXES[index];
    for (const [kind, changed] of [['missing', source.replace(prefix, '')], ['duplicate', source + prefix], ['altered', source.replace('dispatchHistoricalCategoryDefault1437(import.meta.url)', 'dispatchHistoricalCategoryDefault1437(undefined)')], ['unrelated', source + '\n']]) {
      assert.notEqual(changed, source); assert.throws(() => recoverOldMethod(changed, index)); result.push({ file, kind, changedSha256: hash(changed), changedSource: changed, refused: true });
    }
  }
  return result;
}
