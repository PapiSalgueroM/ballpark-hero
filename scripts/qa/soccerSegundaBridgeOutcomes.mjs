import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
assert(process.env.CI, 'Remote isolated CI only');
const root = process.cwd(), out = path.resolve(arg('--out', process.env.QA_OUT));
const baseline = path.resolve(arg('--baseline', '')), zip = path.resolve(arg('--baseline-zip', ''));
const originals = path.resolve(arg('--original-bodies', ''));
const spec = JSON.parse(fs.readFileSync(arg('--faults', 'scripts/qa/soccerSegundaBridgeFaults.json'), 'utf8'));
assert(!JSON.stringify(spec).includes('MUST_BIND'), 'Bind actual candidate and exact reviewed fault spans before execution');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = b => crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b])).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const save = (dir, file, value) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2) + '\n'); };
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
const casesPath = 'scripts/qa/soccerSegundaBridgeCases.json', readerPath = 'scripts/qa/soccerSegundaBridgeEvidence.mjs';
assert.equal(sha(fs.readFileSync(casesPath)), '7d88b73e0b2bd4e16c995b6799a25345de7bbc642078e36aba258a6cf2ef1ca3');
const cases = read(casesPath), names = cases.cases.map(test => test.fullName);
assert.equal(cases.cases.length, 7); assert.equal(cases.files.length, 2);
assert.equal(blob(fs.readFileSync(readerPath)), spec.readerBlob);
const zipBytes = fs.readFileSync(zip);
assert.equal(zipBytes.length, 2675629); assert.equal(sha(zipBytes), '3e9c89a2a24207957761b640ede622c587d97c2daaeaaeddd8498afb3d82119e');
const prior = read(path.join(baseline, 'admission.json'));
assert.equal(prior.status, 'original-admitted'); assert.equal(prior.head, 'abd5f1d616a14da15c76ef380a4447a09a62cd86');
assert.equal(prior.tree, '34cdd1c06ab219c6bbe961ae1e83d8ba4c48e13e');
assert.equal(prior.sourceAndOfflineHeld, true); assert.equal(prior.generator.rows, 307);
for (const test of cases.cases) {
  const bytes = fs.readFileSync(path.join(baseline, 'evidence', test.raw + '.json'));
  assert.equal(bytes.length, prior.evidence[test.raw].bytes); assert.equal(sha(bytes), prior.evidence[test.raw].sha256);
}
for (const file of cases.files) assert.equal(sha(fs.readFileSync(file.path)), file.sha256);
const receipt = process.env.SIM_OFFLINE_RECEIPT;
const offline = () => { assert(receipt && fs.existsSync(receipt)); assert.equal(fs.readFileSync(receipt).length, 0, 'Existing offline receipt must stay empty'); };
const tracked = git('ls-files', '-z').split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(tracked.map(file => [file, sha(fs.readFileSync(file))]));
const clean = inventory(), head = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all'), '');
assert.match(spec.candidateHead, /^[a-f0-9]{40}$/); assert.match(spec.candidateTree, /^[a-f0-9]{40}$/);
assert.equal(git('rev-parse', spec.candidateHead + '^{tree}'), spec.candidateTree);
execFileSync('git', ['merge-base', '--is-ancestor', spec.candidateHead, head], { cwd: root });
assert.deepEqual(Object.keys(spec.candidatePins).sort(), Object.keys(cases.originalPins).sort());
const candidate = new Map(), original = new Map();
for (const [file, pin] of Object.entries(cases.originalPins)) {
  const held = fs.readFileSync(file); assert.equal(blob(held), spec.candidatePins[file], file + ' candidate pin');
  candidate.set(file, held);
  const old = blob(held) === pin ? held : fs.readFileSync(path.join(originals, file));
  assert.equal(blob(old), pin, file + ' prehydrated original body'); original.set(file, old);
}
assert.deepEqual(spec.faults.map(fault => fault.id), ['missing-row', 'since-year', 'manager-leak', 'cup-context', 'country-provenance', 'colour-owner']);
for (const fault of spec.faults) {
  assert(candidate.has(fault.path), 'Only admitted source-pin paths may be mutated');
  assert.equal(typeof fault.before, 'string'); assert(fault.before.length > 0); assert.equal(typeof fault.after, 'string');
  assert.notEqual(fault.before, fault.after);
  const before = candidate.get(fault.path).toString('utf8');
  assert.equal(before.split(fault.before).length - 1, 1, fault.id + ' unique actual candidate span');
  const changed = before.replace(fault.before, fault.after);
  assert.notEqual(changed, before);
  if (fault.after) { assert.equal(changed.split(fault.after).length - 1, 1); assert.equal(changed.replace(fault.after, fault.before), before); }
  else { const at = before.indexOf(fault.before); assert.equal(changed.slice(0, at) + fault.before + changed.slice(at), before); }
}
const expectedNames = { 'missing-row': [names[0], names[2]], 'since-year': [names[0], names[3]], 'manager-leak': [names[3]], 'cup-context': [names[4]] };
for (const fault of spec.faults.slice(0, 4)) assert.deepEqual(fault.failedFullNames, expectedNames[fault.id]);
assert.equal(process.env.SEEDS, undefined); assert.equal(process.env.CAREERS, undefined);
offline(); save(out, 'candidate-source.json', clean);
const report = { status: 'incomplete', head, tree: git('rev-parse', 'HEAD^{tree}'), candidateHead: spec.candidateHead,
  candidateTree: spec.candidateTree, originalInput: { run: 41958380733, job: 127018622387, artifact: 13383634508, bytes: zipBytes.length, sha256: sha(zipBytes) },
  scope: 'Seven frozen cases with fixed/original/restored outcomes, four actual unit faults, two existing data-fence faults. No build/native/public or whole-suite credit.', arms: [] };
let failure = null;
function restore() { for (const [file, bytes] of candidate) fs.writeFileSync(file, bytes); assert.deepEqual(inventory(), clean); assert.equal(git('status', '--porcelain=v1', '--untracked-files=all'), ''); }
function apply(buffers) {
  restore(); for (const [file, bytes] of buffers) fs.writeFileSync(file, bytes);
  const expected = { ...clean }; for (const [file, bytes] of buffers) expected[file] = sha(bytes);
  assert.deepEqual(inventory(), expected); return expected;
}
function child(dir, label, command, args, extra = {}) {
  offline(); const result = spawnSync(command, args, { cwd: root, env: { ...process.env, ...extra }, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024, timeout: 20 * 60 * 1000 });
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, label + '.stdout.log'), result.stdout ?? '');
  fs.writeFileSync(path.join(dir, label + '.stderr.log'), result.stderr ?? '');
  save(dir, label + '.native.json', { command: [command, ...args], exit: result.status, signal: result.signal, error: result.error ? String(result.error) : null });
  assert.equal(result.error, undefined); assert.equal(result.signal, null); offline();
  const output = (result.stdout ?? '') + '\n' + (result.stderr ?? '');
  assert(!/\b(?:Unhandled\s+(?:Errors?|Rejection|Exception)|Vitest caught|uncaughtException|unhandledRejection)\b/i.test(output));
  return { exit: result.status, output };
}
function types(dir) {
  const typed = child(dir, 'types', path.join(root, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json']);
  assert.equal(typed.exit, 0); save(dir, 'types-passed.json', { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 });
}
function validate(dir, failed) {
  const result = read(path.join(dir, 'vitest.json')), assertions = result.testResults.flatMap(file => file.assertionResults);
  assert.equal(result.testResults.length, 2); assert.equal(result.numTotalTests, 7); assert.equal(assertions.length, 7);
  assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests ?? 0, 0);
  for (const key of ['numRuntimeErrors', 'numRuntimeErrorTestSuites']) if (Object.hasOwn(result, key)) assert.equal(result[key], 0);
  if (Object.hasOwn(result, 'unhandledErrors')) { assert(Array.isArray(result.unhandledErrors)); assert.equal(result.unhandledErrors.length, 0); }
  assert.equal(result.success, failed.length === 0); assert.equal(result.numFailedTests, failed.length); assert.equal(result.numPassedTests, 7 - failed.length);
  assert.deepEqual(assertions.map(test => test.fullName).sort(), [...names].sort());
  assert.deepEqual(assertions.filter(test => test.status === 'failed').map(test => test.fullName).sort(), [...failed].sort());
  for (const test of assertions) {
    assert.equal(test.status, failed.includes(test.fullName) ? 'failed' : 'passed');
    if (test.status === 'failed') {
      assert.equal(test.failureMessages.length, 1);
      const message = test.failureMessages[0].replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').trim();
      assert.match(message, /^AssertionError:/); assert(!/\b(?:TypeError|ReferenceError|SyntaxError)\b/.test(message));
    } else assert.equal(test.failureMessages?.length ?? 0, 0);
  }
  const raw = Object.fromEntries(cases.cases.map(test => [test.raw, read(path.join(dir, 'evidence', test.raw + '.json'))]));
  save(dir, 'actual-case-census.json', assertions.map(test => ({ fullName: test.fullName, status: test.status })));
  return raw;
}
function unitArm(name, buffers, failed, mode) {
  const expected = apply(buffers), dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
  types(dir);
  const run = child(dir, 'vitest', process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...cases.files.map(file => file.path),
    '--maxWorkers=1', '--minWorkers=1', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')], { SEGUNDA_EVIDENCE_DIR: path.join(dir, 'evidence') });
  assert.equal(run.exit, failed.length ? 1 : 0);
  const raw = validate(dir, failed);
  if (mode) {
    const args = [readerPath, '--out', dir, '--mode', mode, '--exit-code', String(run.exit), '--baseline', baseline];
    if (mode === 'original') {
      const candidateInventoryFile = path.join(out, 'candidate-source.json'), overlay = path.join(dir, 'original-overlay.json');
      save(dir, 'original-overlay.json', { kind: 'bound-original-overlay', head, originalPins: cases.originalPins,
        candidateInventoryFile, candidateInventorySHA256: sha(fs.readFileSync(candidateInventoryFile)), status: git('status', '--porcelain=v1', '--untracked-files=all') });
      args.push('--original-overlay', overlay);
    }
    const measured = child(dir, 'reader', process.execPath, args); assert.equal(measured.exit, 0);
    assert.equal(read(path.join(dir, 'admission.json')).status, mode + '-admitted');
  }
  assert.deepEqual(inventory(), expected); offline();
  report.arms.push({ name, nativeExit: run.exit, failedFullNames: failed, evidence: Object.fromEntries(cases.cases.map(test =>
    [test.raw, sha(fs.readFileSync(path.join(dir, 'evidence', test.raw + '.json')))])) });
  return { dir, raw };
}
try {
  const fixed = unitArm('fixed', new Map(), [], 'fixed');
  const normalFence = child(path.join(out, 'normal-data-fence'), 'fence', process.execPath, ['scripts/simCareerClubPool.mjs'], { SIM_CLUB_POOL_CONTROL: '' });
  assert.equal(normalFence.exit, 0); assert(normalFence.output.includes('simCareerClubPool: all sections green')); assert.deepEqual(inventory(), clean);
  const old = unitArm('original', original, cases.cases.filter(test => test.owned).map(test => test.fullName), 'original');
  for (const test of cases.cases) assert.deepEqual(fs.readFileSync(path.join(old.dir, 'evidence', test.raw + '.json')), fs.readFileSync(path.join(baseline, 'evidence', test.raw + '.json')), 'Whole repeated-original RAW bytes');
  for (const file of ['generator-derived.json', 'generator-inputs.json', 'generator-rendered.ts', 'held-reference.json'])
    assert.deepEqual(fs.readFileSync(path.join(old.dir, file)), fs.readFileSync(path.join(baseline, file)), 'Whole repeated-original ' + file);
  for (const fault of spec.faults) {
    const before = candidate.get(fault.path), changed = Buffer.from(before.toString('utf8').replace(fault.before, fault.after));
    const dir = path.join(out, fault.id);
    save(dir, 'actual-source-fault.json', { path: fault.path, beforeBlob: blob(before), afterBlob: blob(changed), before: fault.before, after: fault.after, changed: true });
    try {
      if (fault.failedFullNames) {
        const arm = unitArm(fault.id, new Map([[fault.path, changed]]), fault.failedFullNames, null), value = Object.fromEntries(Object.entries(arm.raw).map(([key, row]) => [key, row.value]));
        if (fault.id === 'missing-row') { assert(!value.canonical.added.some(club => club.id === 'cm-real-oviedo')); assert.equal(value.canonical.added.length, 18); assert(value.world.lower.some(club => club.name === 'Real Oviedo' && club.id.startsWith('career-lower-'))); }
        if (fault.id === 'since-year') { assert.equal(value.canonical.since['Real Oviedo'], 2025); assert(value.history.held.historical.find(vector => vector.year === 2025).clubs.some(club => club.id === 'cm-real-oviedo')); }
        if (fault.id === 'manager-leak') for (const vector of value.history.held.historical) { assert(vector.manager.some(club => club.id === 'cm-real-oviedo')); assert(!vector.clubs.some(club => club.id === 'cm-real-oviedo')); }
        if (fault.id === 'cup-context') { assert.deepEqual(value.cup.resolved, ['Andorra', 'Andorra']); assert.equal(value.cup.openingRead, null); }
      } else {
        const expected = apply(new Map([[fault.path, changed]])); types(dir);
        const run = child(dir, 'fence', process.execPath, ['scripts/simCareerClubPool.mjs'], { SIM_CLUB_POOL_CONTROL: '' });
        assert.equal(run.exit, 1); assert(run.output.includes(fault.diagnostic));
        assert.match(run.output, /simCareerClubPool: \d+ failure\(s\) in section\(s\) 3(?:\r?\n|$)/);
        assert.deepEqual(inventory(), expected);
        report.arms.push({ name: fault.id, nativeExit: 1, owner: 'Existing simCareerClubPool section3', diagnostic: fault.diagnostic });
      }
    } finally { restore(); }
  }
  const restored = unitArm('restored-fixed', new Map(), [], 'fixed');
  for (const test of cases.cases) assert.deepEqual(fs.readFileSync(path.join(restored.dir, 'evidence', test.raw + '.json')), fs.readFileSync(path.join(fixed.dir, 'evidence', test.raw + '.json')), 'Whole restored-fixed RAW including module/action tapes');
  for (const file of ['generator-derived.json', 'generator-inputs.json', 'generator-rendered.ts', 'held-reference.json'])
    assert.deepEqual(fs.readFileSync(path.join(restored.dir, file)), fs.readFileSync(path.join(fixed.dir, file)), 'Whole restored-fixed ' + file);
  report.status = 'admitted';
} catch (error) { failure = error; report.error = String(error?.stack ?? error); }
finally {
  try { restore(); offline(); report.finalSourceAndLockHeld = true; }
  catch (error) { failure ??= error; report.status = 'incomplete'; report.restoreError = String(error?.stack ?? error); }
  save(out, 'final-source.json', inventory()); save(out, 'outcomes.json', report);
}
if (failure) throw failure;
console.log('SC_SEGUNDA_OUTCOMES_ADMITTED fixed/original/restored and six physical faults; whole source and full RAW held');
