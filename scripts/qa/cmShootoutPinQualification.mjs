import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

const option = key => { const i = process.argv.indexOf(key); assert(i >= 0 && process.argv[i + 1], key); return path.resolve(process.argv[i + 1]); };
const out = option('--out'), reference = option('--reference'), root = process.cwd();
assert(process.env.RUNNER_TEMP && out.startsWith(path.resolve(process.env.RUNNER_TEMP) + path.sep));
fs.mkdirSync(out, { recursive: true });
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim();
assert.equal(git(['rev-parse', 'HEAD^']), '00c85815cac64d72014594e6b38515d4d6ce2e45');
const files = git(['ls-files', '-z']).split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const before = inventory(); write(out + '/source-before.json', before);
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '');
const target = 'scripts/simCmShootoutOrder.mjs', temp = 'scripts/.release-shootout-pin-observation.mjs';
const candidate = fs.readFileSync(target, 'utf8');
assert.equal(hash(candidate), '20efe1ae6177474aa23f85d3f9d4e2097ed14d6ee6bb00dfe41b90e0e33cc8f7');
assert.equal(git(['hash-object', 'src/lib/clubManager.ts']), '9d8dc92557bf2f4358b5be044359354eda841769');
const original = execFileSync('git', ['show', 'HEAD^:' + target], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
assert.equal(hash(original), '475420251c7b091b4f310374922c63d1835f9feb596bdde109236b3f98893b31');
fs.writeFileSync(out + '/original-harness.mjs', original); fs.writeFileSync(out + '/candidate-harness.mjs', candidate);
const oldEvidence = read(reference + '/vanilla/normal-baseline.json');
assert.equal(oldEvidence.rows.length, 150); assert.equal(oldEvidence.namedBase.rows, 300);
const identityFields = ['baselineRef', 'baselineSourceHash', 'rows', 'oldLoad', 'firstDifference', 'summary', 'namedBase', 'runtimeErrors', 'failedSections', 'mutation'];
const declarations = [
  { name: 'ignoreorder', required: [1] }, { name: 'noskip', required: [1] },
  { name: 'nocap', required: [3] }, { name: 'unsetpath', required: [4, 5] },
  { name: 'tie-record', required: [4] }, { name: 'ownkeeper', required: [6] },
  { name: 'wrongkeeper', required: [6] }, { name: 'nooppkeeper', required: [6] },
  { name: 'oppworst', required: [1, 6] }, { name: 'thinside', required: [7] },
  { name: 'nomakeup', required: [7] }, { name: 'keeperonfull', required: [7] },
];
const setupFaults = [
  { name: 'omit-baseline-rule-bridge',
    before: "const oldRules = engine => !WRITE_FIXTURE && (engine === historical || engine === baseline || (!!leagueOut && engine === leagueOut)",
    after: "const oldRules = engine => !WRITE_FIXTURE && (engine === historical || (!!leagueOut && engine === leagueOut)" },
  { name: 'omit-baseline-neutralizer',
    before: "  const baselineSource = unmanagedSource(baselineRaw.split('\\r\\n').join('\\n'));",
    after: "  const baselineSource = baselineRaw.split('\\r\\n').join('\\n');" },
];
const launcher = out + '/launch.mjs';
fs.writeFileSync(launcher, "import path from 'node:path';import{pathToFileURL}from'node:url';const file=process.argv[2];process.argv[1]=path.resolve('scripts/simCmShootoutOrder.mjs');await import(pathToFileURL(path.resolve(file)).href);\n");
const phases = []; let healthy = null, active = null, problem = null;
assert(!fs.existsSync(temp), 'No existing QA copy may be replaced');
function run(name, source, control = '', kind = 'normal', required = []) {
  const dir = out + '/' + name; fs.mkdirSync(dir, { recursive: true });
  const receipt = dir + '/transport.log'; fs.writeFileSync(receipt, '');
  if (active !== null) assert.equal(fs.readFileSync(temp, 'utf8'), active);
  fs.writeFileSync(temp, source); active = source;
  assert.equal(fs.readFileSync(temp, 'utf8'), source);
  const env = { ...process.env, CI: '1', SIM_NETWORK: 'offline', TZ: 'UTC',
    NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'),
    SIM_OFFLINE_RECEIPT: receipt, CM_SHOOTOUT_ARTIFACTS: dir + '/artifacts' };
  for (const key of ['SIM_SEED', 'CM_SHOOTOUT_CONTROL', 'CM_SHOOTOUT_WRITE_FIXTURE', 'ONLY', 'BROWSER']) delete env[key];
  if (control) env.CM_SHOOTOUT_CONTROL = control;
  write(dir + '/source-association.json', { name, kind, control, canonicalArgv: target, harnessSHA256: hash(source),
    trackedHarnessSHA256: hash(candidate), changedHarness: source !== candidate, requiredSections: required });
  const child = spawnSync('timeout', ['--kill-after=20s', '900s', process.execPath, launcher, temp],
    { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 925000 });
  fs.writeFileSync(dir + '/stdout.log', child.stdout || ''); fs.writeFileSync(dir + '/stderr.log', child.stderr || '');
  fs.writeFileSync(dir + '/native.exit', String(child.status) + '\n');
  write(dir + '/process.json', { status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
  assert(!child.error && !child.signal, name + ' completed without timeout or process error');
  assert.equal(fs.statSync(receipt).size, 0, name + ' has no transport attempts');
  assert.equal(fs.readFileSync(temp, 'utf8'), source); assert.equal(fs.readFileSync(target, 'utf8'), candidate);
  const log = (child.stdout || '') + (child.stderr || '');
  assert.doesNotMatch(log, /unhandledRejection|uncaughtException|Unhandled (?:Error|Rejection)/i);
  const baselineFile = dir + '/artifacts/' + (control || 'normal') + '-baseline.json';
  if (kind === 'inapplicable') {
    assert.equal(child.status, 2); assert(!fs.existsSync(baselineFile));
    const exact = control === 'keepleague'
      ? 'control cannot run: the pinned engine already holds the league, so there is no arm to take away'
      : "control cannot run: this tree's world reads no age, or the pinned engine reads it too, so there is no curve 1 arm to take away";
    assert.equal((child.stderr || '').trim(), exact);
    const phase = { name, kind, nativeExit: 2, effectiveControlCredit: false, reason: exact };
    phases.push(phase); write(dir + '/admission.json', phase); return;
  }
  assert(fs.existsSync(baselineFile), name + ' retained actual completed harness report');
  const r = read(baselineFile), failures = Object.values(r.failedSections).flat();
  assert.deepEqual(r.runtimeErrors, []);
  assert.equal(r.rows.length, 150); assert.equal(r.namedBase.rows, 300); assert(r.oldLoad);
  assert(r.sources.length >= 2 && r.sources.every(row => row.held && row.before === row.after));
  assert(r.executedSources.length >= 3); assert(r.executedSources.every(row => /^[a-f0-9]{64}$/.test(row.hash)));
  if (kind === 'old-diagnostic') {
    assert.equal(child.status, 1); assert.equal(failures.length, 4);
    for (const key of identityFields) assert.deepEqual(r[key], oldEvidence[key], 'Retained original 5b70 identity: ' + key);
  } else {
    assert.equal(r.baselineRef, 'c176be815dc4af57dfd7185a485e28357aa0d41e');
    assert.equal(r.baselineSourceGit, 'cf378e002c1f253a4cd48a147af66117f982f6b2');
    assert.equal(r.baselineNeutralizer, 'same current-compatible unmanaged source');
    if (kind === 'normal' || kind === 'restored') {
      assert.equal(child.status, 0); assert.deepEqual(r.failedSections, {});
      assert.equal(r.summary.paired, 150); assert.equal(r.namedBase.paired, 300);
      assert.equal(r.summary.defaultPens, r.summary.withKicks); assert(r.namedBase.pens >= 12);
      assert.equal(r.summary.by1052, 0); assert.equal(r.summary.by1600, 0);
      assert.equal(r.namedBase.by1052, 0); assert.equal(r.namedBase.by1600, 0);
      assert.equal(r.curve1Arm1600, null);
      if (healthy) for (const key of [...identityFields, 'baselineSourceGit', 'baselineNeutralizer']) assert.deepEqual(r[key], healthy[key], 'Restored complete semantic evidence: ' + key);
      else healthy = r;
    } else {
      assert.equal(child.status, 1); assert(failures.length > 0);
      for (const section of required) assert(r.failedSections[String(section)]?.length > 0, name + ' actual intended section ' + section + ' rejects');
      if (kind === 'engine-control') {
        assert.equal(r.mutation.control, control); assert.equal(r.mutation.hits, 1); assert.equal(r.mutation.changed, true);
        assert.notEqual(r.mutation.beforeHash, r.mutation.afterHash);
        assert.equal(r.mutation.beforeHash, '1ca9560d8658ad88c96a4a085f676b51623a2c9134e665a872993564b95cf2a1');
      } else {
        assert.equal(kind, 'setup-control'); assert.equal(r.mutation, null);
        assert.notEqual(hash(source), hash(candidate));
        assert.notEqual(JSON.stringify({ rows: r.rows, oldLoad: r.oldLoad }), JSON.stringify({ rows: healthy.rows, oldLoad: healthy.oldLoad }), 'Actual result/full-state or next-draw evidence changed');
      }
    }
  }
  const phase = { name, kind, nativeExit: child.status, failures: r.failedSections, rows: r.rows.length,
    namedAggregateRows: r.namedBase.rows, oldLoadPresent: true, runtimeErrors: r.runtimeErrors, sourcesHeld: true,
    effectiveControlCredit: kind === 'engine-control' || kind === 'setup-control' };
  phases.push(phase); write(dir + '/admission.json', phase);
}
try {
  run('old-5b70-diagnostic', original, '', 'old-diagnostic');
  run('normal', candidate);
  for (const control of declarations) run(control.name, candidate, control.name, 'engine-control', control.required);
  for (const name of ['keepleague', 'keepcurve']) run(name + '-inapplicable', candidate, name, 'inapplicable');
  for (const fault of setupFaults) {
    assert.equal(candidate.split(fault.before).length - 1, 1, fault.name + ' exact executable anchor');
    const mutant = candidate.replace(fault.before, fault.after);
    assert.notEqual(mutant, candidate);
    assert.equal(mutant.split(fault.after).length - 1, 1);
    assert.equal(mutant.replace(fault.after, fault.before), candidate, 'Whole harness inverse: ' + fault.name);
    fs.writeFileSync(out + '/' + fault.name + '-harness.mjs', mutant);
    write(out + '/' + fault.name + '-fault.json', { ...fault, beforeHash: hash(candidate), afterHash: hash(mutant), wholeInverse: true });
    run(fault.name, mutant, '', 'setup-control', [4, 5]);
  }
  run('restored', candidate, '', 'restored');
  assert.equal(phases.length, 19);
  assert.equal(phases.filter(p => p.effectiveControlCredit).length, 14);
} catch (error) { problem = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  if (active !== null) { assert.equal(fs.readFileSync(temp, 'utf8'), active); fs.unlinkSync(temp); }
  const after = inventory(); write(out + '/source-after.json', after);
  const sourceHeld = JSON.stringify(before) === JSON.stringify(after), cleanAfter = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
  write(out + '/pin-qualification.json', { eligible: !problem && sourceHeld && cleanAfter, problem, phases, sourceHeld, cleanAfter,
    oldFailuresWaived: false, effectiveControls: phases.filter(p => p.effectiveControlCredit).length,
    inapplicableObservations: phases.filter(p => p.kind === 'inapplicable').length,
    limits: 'All original assertions execute. 150 retained raw rows plus 300 named aggregate comparisons per completed arm, not 450 raw vectors. Old 5b70 four-failure proof stays failed and separate. Two historical bridge controls are explicitly inapplicable/native2; twelve original engine controls and two actual symmetric-setup omission controls must fire. No product fix or public release is admitted.' });
  if (!sourceHeld || !cleanAfter) problem ||= { message: 'Source closure failed' };
}
if (problem) { console.error(problem); process.exitCode = 1; }
else console.log('Pinned-main normal and restored strict450 comparisons passed; old4 failures retained; 12 engine controls and 2 setup omission controls effective; 2 historical controls explicitly inapplicable.');
