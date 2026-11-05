import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); assert(i >= 0 && args[i + 1], 'Missing ' + name); return args[i + 1]; };
const out = path.resolve(arg('--out')), specPath = path.resolve(arg('--spec'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')), root = process.cwd();
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = b => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));
const strip = value => String(value).replace(/\x1b\[[0-9;]*m/g, '');
const equalBytes = (a, b, why) => assert(fs.readFileSync(a).equals(fs.readFileSync(b)), why);
const write = (dir, name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const git = (...a) => execFileSync('git', a, { cwd: root, env: { ...process.env, GIT_NO_LAZY_FETCH: '1' } });
const safe = p => { assert(/^src\/[A-Za-z0-9_./-]+$/.test(p) && !p.split('/').includes('..'), 'Bound App path'); return path.resolve(root, p); };
function receipt(file) { assert(fs.existsSync(file) && fs.statSync(file).size === 0, 'Silent actual receipt ' + file); }
function census(result, mode, nativeExit) {
  const tests = result.testResults?.flatMap(s => s.assertionResults ?? []) ?? [];
  assert.equal(result.testResults?.length, 1, 'SC_REAL_ENTRY_FILE_CENSUS');
  assert.equal(tests.length, 5, 'SC_REAL_ENTRY_CASE_CENSUS');
  assert.equal(new Set(tests.map(t => t.fullName)).size, 5, 'SC_REAL_ENTRY_CASE_CENSUS');
  assert.deepEqual(tests.map(t => t.fullName).sort(), spec.cases.map(t => t.fullName).sort(), 'SC_REAL_ENTRY_CASE_CENSUS');
  const cut = mode === 'original';
  assert.equal(nativeExit, cut ? 1 : 0); assert.equal(result.success, !cut);
  assert.equal(result.numTotalTests, 5); assert.equal(result.numPassedTests, cut ? 2 : 5); assert.equal(result.numFailedTests, cut ? 3 : 0);
  for (const key of ['numPendingTests', 'numTodoTests']) assert.equal(result[key] ?? 0, 0, key);
  for (const key of ['numRuntimeErrorTestSuites', 'numRuntimeErrorTests', 'numUnhandledErrors']) if (result[key] !== undefined) assert.equal(result[key], 0, key);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  for (const item of spec.cases) {
    const got = tests.find(t => t.fullName === item.fullName), fails = got.failureMessages ?? [];
    const owned = cut && item.ownership === 'owned';
    assert.equal(got.status, owned ? 'failed' : 'passed', item.fullName);
    if (owned) {
      assert.equal(fails.length, 1); const message = strip(fails[0]).trim();
      assert(/^AssertionError:/.test(message) && message.includes(item.marker), message);
      assert(!/\b(TypeError|SyntaxError|ReferenceError|UnhandledRejection|uncaught)\b/i.test(message), message);
    } else assert.deepEqual(fails, []);
  }
  return tests.map(t => ({ fullName: t.fullName, status: t.status, failureMessages: t.failureMessages ?? [] }));
}
function admitArm(dir, mode) {
  const native = json(path.join(dir, 'native-exits.json'));
  assert.equal(native.types.status, 0, 'Proper app-config types');
  assert.equal(native.types.command, 'node_modules/.bin/tsc');
  assert.deepEqual(native.types.args, ['--noEmit', '-p', 'tsconfig.app.json']);
  for (const key of ['types', 'vitest']) { assert.equal(native[key].signal, null); assert.equal(native[key].error, null); }
  for (const name of ['types', 'vitest', 'reader']) receipt(path.join(dir, 'transport', name + '.log'));
  const output = ['vitest.stdout.log', 'vitest.stderr.log'].map(n => fs.readFileSync(path.join(dir, n), 'utf8')).join('\n');
  assert(!/Unhandled Errors|Vitest caught|UnhandledRejection|uncaught exception|unhandled rejection/i.test(strip(output)), 'Runtime diagnostics');
  const report = json(path.join(dir, 'vitest.json')), tests = census(report, mode, native.vitest.status), raws = {};
  for (const item of spec.cases) {
    const file = path.join(dir, 'evidence', item.file), bytes = fs.readFileSync(file), raw = JSON.parse(bytes);
    assert(Array.isArray(raw.importDraws) && raw.importDraws.every(n => Number.isFinite(n) && n >= 0 && n < 1));
    assert(raw.value && typeof raw.value === 'object');
    raws[item.file] = { bytes: bytes.length, sha256: hash(bytes) };
    const value = raw.value;
    if (value.ui) { assert(value.ui.state && value.ui.bytes && Array.isArray(value.ui.args)); }
  }
  const legacy = json(path.join(dir, 'evidence', 'legacy.json')).value;
  assert.equal(legacy.condition, spec.legacyCondition);
  assert.equal(legacy.storage.soccerCareerSave, legacy.run.frames[0].saved, 'Declared full legacy storage boundary');
  assert.equal(legacy.storage['historical-entry-unrelated'], 'untouched');
  const copy = plain(report), original = JSON.stringify(copy);
  copy.testResults[0].assertionResults.pop();
  assert.notEqual(JSON.stringify(copy), original, 'Copied actual omission changed');
  let owned = null;
  try { census(copy, mode, native.vitest.status); } catch (error) {
    assert.equal(error.name, 'AssertionError'); assert(error.message.includes('SC_REAL_ENTRY_CASE_CENSUS'));
    owned = { name: error.name, message: error.message };
  }
  assert(owned, 'Copied actual census guard effective');
  copy.testResults[0].assertionResults = plain(report.testResults[0].assertionResults);
  assert.equal(JSON.stringify(copy), original, 'Whole copied actual omission inverse');
  write(dir, 'omission-control.json', { changed: true, owned, wholeInverseExact: true, actualHeld: true });
  write(dir, 'admission.json', { mode, tests, raw: raws, nativeTypeExit: native.types.status, nativeVitestExit: native.vitest.status });
}
if (args.includes('--admit-arm')) {
  admitArm(out, arg('--admit-arm'));
  console.log('SC_REAL_ENTRY_ARM_ADMITTED ' + arg('--admit-arm'));
} else {
  assert.equal(spec.schema, 1); assert.equal(spec.cases.length, 5);
  assert(/^[a-f0-9]{40}$/.test(spec.candidate) && /^[a-f0-9]{40}$/.test(spec.candidateTree), 'Concrete candidate');
  assert.equal(git('rev-parse', 'HEAD^').toString().trim(), spec.candidate);
  assert.equal(git('rev-parse', spec.candidate + '^{tree}').toString().trim(), spec.candidateTree);
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '', 'Clean input');
  const test = fs.readFileSync(spec.test.path);
  assert.equal(blob(test), spec.test.blob); assert.equal(hash(test), spec.test.sha256); assert.equal(test.length, spec.test.bytes);
  const candidate = new Map(), original = new Map();
  assert.equal(spec.changes.length, 5); assert.equal(new Set(spec.changes.map(x => x.path)).size, 5);
  for (const row of spec.changes) {
    const file = safe(row.path), bytes = fs.readFileSync(file);
    assert.equal(blob(bytes), row.candidate, 'Candidate ' + row.path); candidate.set(row.path, bytes);
    if (row.original === null) original.set(row.path, null);
    else { const old = git('show', spec.originalParent + ':' + row.path); assert.equal(blob(old), row.original, 'Original ' + row.path); original.set(row.path, old); }
  }
  for (const [p, wanted] of Object.entries(spec.unchangedPins)) assert.equal(blob(fs.readFileSync(p)), wanted, 'Unchanged pin ' + p);
  const tracked = git('ls-files', '-z').toString().split('\0').filter(Boolean), beforeIndex = git('ls-files', '-s');
  const snapshot = () => Object.fromEntries(tracked.map(p => [p, fs.existsSync(p) ? hash(fs.readFileSync(p)) : null]));
  const before = snapshot(); write(out, 'source-before.json', before);
  function hold(mode) {
    assert(git('ls-files', '-s').equals(beforeIndex), 'Whole index held');
    const got = snapshot(), allowed = mode === 'original' ? original : candidate;
    for (const p of tracked) assert.equal(got[p], allowed.has(p) ? (allowed.get(p) === null ? null : hash(allowed.get(p))) : before[p], 'Whole source ' + p);
    const expected = mode === 'original' ? spec.changes.map(r => (r.original === null ? ' D ' : ' M ') + r.path + '\0').sort() : [];
    const actual = git('status', '--porcelain=v1', '-z', '--untracked-files=all').toString().split('\0').filter(Boolean).map(x => x + '\0').sort();
    assert.deepEqual(actual, expected, 'Exact App overlay status');
    return got;
  }
  function install(mode) {
    for (const [p, bytes] of mode === 'original' ? original : candidate) {
      const file = safe(p);
      if (bytes === null) { if (fs.existsSync(file)) fs.unlinkSync(file); }
      else fs.writeFileSync(file, bytes);
    }
    hold(mode);
  }
  function child(dir, label, command, argv, extra = {}) {
    const transport = path.join(dir, 'transport', label + '.log');
    fs.writeFileSync(transport, '', { flag: 'wx' });
    const result = spawnSync(command, argv, { cwd: root, env: { ...process.env, ...extra, SIM_NETWORK: 'offline', GIT_NO_LAZY_FETCH: '1', SIM_OFFLINE_RECEIPT: transport },
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    fs.writeFileSync(path.join(dir, label + '.stdout.log'), result.stdout ?? '');
    fs.writeFileSync(path.join(dir, label + '.stderr.log'), result.stderr ?? '');
    return { command, args: argv, status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null };
  }
  const input = path.resolve(arg('--original-evidence')), inputHashes = {};
  for (const [name, wanted] of Object.entries(spec.originalEvidence.raw)) {
    const bytes = fs.readFileSync(path.join(input, 'evidence', name)); assert.equal(hash(bytes), wanted, 'Immutable first original ' + name);
    inputHashes[name] = hash(bytes);
  }
  write(out, 'input-original-raw-hashes.json', inputHashes);
  const measured = [];
  try {
    for (const arm of spec.arms) {
      install(arm.mode);
      const dir = path.join(out, arm.name);
      fs.mkdirSync(path.join(dir, 'transport'), { recursive: true }); fs.mkdirSync(path.join(dir, 'evidence'));
      write(dir, 'source-before.json', hold(arm.mode));
      const types = child(dir, 'types', 'node_modules/.bin/tsc', ['--noEmit', '-p', 'tsconfig.app.json']);
      write(dir, 'types-native.json', types);
      assert.equal(types.status, 0, 'Proper app-config types must pass before cases');
      assert.equal(types.signal, null); assert.equal(types.error, null);
      const vitest = child(dir, 'vitest', 'node_modules/.bin/vitest', ['run', spec.test.path, '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json'), '--maxWorkers=1', '--minWorkers=1'],
        { SC_HISTORICAL_ENTRY_EVIDENCE: path.join(dir, 'evidence') });
      write(dir, 'native-exits.json', { types, vitest });
      const reader = child(dir, 'reader', process.execPath, [self, '--admit-arm', arm.mode, '--out', dir, '--spec', specPath]);
      write(dir, 'reader-native.json', reader);
      write(dir, 'source-after.json', hold(arm.mode));
      measured.push({ ...arm, types, vitest, reader });
    }
  } finally {
    install('fixed');
    const after = snapshot(); write(out, 'source-after.json', after);
    assert.deepEqual(after, before, 'Whole final source bytes restored');
    assert(git('ls-files', '-s').equals(beforeIndex), 'Whole final index restored');
    assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '', 'Final clean status');
    write(out, 'source-restoration.json', { wholeTrackedSourceIndexLocksExact: true, finalStatus: '', appPaths: spec.changes });
  }
  write(out, 'native-arms.json', measured);
  assert.equal(measured.length, 4, 'All actual arms retained');
  for (const arm of measured) {
    assert.equal(arm.types.status, 0); assert.equal(arm.vitest.status, arm.mode === 'original' ? 1 : 0);
    assert.equal(arm.reader.status, 0);
    for (const label of ['types', 'vitest', 'reader']) receipt(path.join(out, arm.name, 'transport', label + '.log'));
  }
  for (const name of Object.keys(spec.originalEvidence.raw)) {
    equalBytes(path.join(out, 'original-revised', 'evidence', name), path.join(out, 'whole-app-reversed', 'evidence', name), 'Complete revised original/reversal RAW ' + name);
    equalBytes(path.join(out, 'fixed', 'evidence', name), path.join(out, 'restored-fixed', 'evidence', name), 'Complete fixed/restored RAW ' + name);
    for (const arm of ['fixed', 'whole-app-reversed', 'restored-fixed']) {
      const a = json(path.join(out, 'original-revised', 'evidence', name)), b = json(path.join(out, arm, 'evidence', name));
      assert.deepEqual(b.importDraws, a.importDraws, 'Complete import tape ' + name);
      assert.deepEqual(b.value.uiDraws, a.value.uiDraws, 'Complete UI tape ' + name);
      assert.deepEqual(b.value.mainDraws, a.value.mainDraws, 'Complete action tape ' + name);
    }
  }
  for (const name of ['legacy.json', 'newer-ui.json'])
    equalBytes(path.join(out, 'original-revised', 'evidence', name), path.join(out, 'fixed', 'evidence', name), 'Whole held RAW including storage ' + name);
  for (const name of Object.keys(spec.originalEvidence.raw)) {
    const oldFile = path.join(input, 'evidence', name), revisedFile = path.join(out, 'original-revised', 'evidence', name);
    if (name !== 'legacy.json') equalBytes(oldFile, revisedFile, 'Actual first original/revised untouched RAW ' + name);
    else {
      const oldBytes = fs.readFileSync(oldFile), revisedBytes = fs.readFileSync(revisedFile), old = JSON.parse(oldBytes), revised = JSON.parse(revisedBytes), inverse = plain(revised);
      assert.equal(revised.value.condition, spec.legacyCondition);
      assert.equal(revised.value.storage.soccerCareerSave, revised.value.run.frames[0].saved);
      delete inverse.value.condition;
      inverse.value.storage.soccerCareerSave = old.value.storage.soccerCareerSave;
      assert(Buffer.from(JSON.stringify(inverse, null, 2) + '\n').equals(oldBytes), 'Two-field declared legacy original inverse');
      write(out, 'legacy-storage-boundary-inverse.json', { originalSHA256: hash(oldBytes), revisedSHA256: hash(revisedBytes),
        declaredChangedPaths: ['value.condition', 'value.storage.soccerCareerSave'], wholeOriginalInverseExact: true, originalHeld: true });
    }
    assert.equal(hash(fs.readFileSync(oldFile)), inputHashes[name], 'Immutable original evidence held');
  }
  receipt(process.env.SIM_OFFLINE_RECEIPT);
  write(out, 'outcomes-admitted.json', { status: 'same-revision-original-fixed-whole-reversal-restored-admitted', candidate: spec.candidate,
    arms: measured.map(a => ({ name: a.name, types: a.types.status, vitest: a.vitest.status, reader: a.reader.status })),
    all5OriginalReversalRawExact: true, all5FixedRestoredRawExact: true, wholeLegacyNewerAcrossAppsExact: true,
    allImportUiActionTapesExact: true, originalFirstEvidenceRetainedAndDeclaredLegacyInverse: true, limits: spec.limits });
  console.log('SC_REAL_ENTRY_OUTCOMES_ADMITTED four actual arms, same-revision3owned2held then5green, whole reversal and restore');
}
