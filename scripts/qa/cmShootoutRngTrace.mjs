import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const option = name => { const i = process.argv.indexOf(name); assert(i >= 0 && process.argv[i + 1], name + ' is required'); return process.argv[i + 1]; };
const root = process.cwd(), out = path.resolve(option('--out')), hunkFile = path.resolve(option('--hunks'));
assert(process.env.RUNNER_TEMP && out.startsWith(path.resolve(process.env.RUNNER_TEMP) + path.sep), 'Keep all diagnostic evidence in RUNNER_TEMP');
const script = 'scripts/simCmShootoutOrder.mjs', observer = 'scripts/.release-shootout-rng-observed.mjs';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
assert.equal(git(['rev-parse', 'HEAD^']), '00c85815cac64d72014594e6b38515d4d6ce2e45');
assert.equal(git(['rev-parse', 'HEAD:src/lib/clubManager.ts']), '9d8dc92557bf2f4358b5be044359354eda841769');
assert.equal(git(['rev-parse', 'HEAD:' + script]), '8d348809a1cb6556d6628fa6571e0c38b3005bf1');
assert.equal(git(['hash-object', script]), '8d348809a1cb6556d6628fa6571e0c38b3005bf1');
assert.equal(git(['rev-parse', 'HEAD:scripts/data/cmShootoutUnset782.json']), '972ac314b0a6c676d1f2b5902256d37bc095c05f');
assert.equal(git(['rev-parse', 'HEAD:scripts/lib/seedRandom.mjs']), '13e2534d2936880c0529a37190050fffb7d8df7d');
assert.equal(digest(fs.readFileSync(hunkFile)), '880bdeacd1a7aaf162831544a277b412be5c1eedc312922af27c75e68b24647a');
assert.equal(fs.existsSync(observer), false);
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '');
const files = git(['ls-files', '-z']).split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(files.map(file => [file, digest(fs.readFileSync(file))]));
const before = inventory();
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/source-before.json', JSON.stringify(before, null, 2) + '\n');
const original = fs.readFileSync(script, 'utf8'), map = JSON.parse(fs.readFileSync(hunkFile, 'utf8'));
let changed = original;
for (const edit of map.edits) { assert.equal(changed.split(edit.before).length, 2, edit.name); changed = changed.replace(edit.before, edit.after); }
let inverse = changed;
for (const edit of map.edits.slice().reverse()) { assert.equal(inverse.split(edit.after).length, 2); inverse = inverse.replace(edit.after, edit.before); }
assert.equal(inverse, original); assert.notEqual(changed, original);
fs.writeFileSync(out + '/original-harness.mjs', original);
fs.writeFileSync(out + '/observed-harness.mjs', changed);
fs.copyFileSync(hunkFile, out + '/observer-hunks.json');
fs.writeFileSync(out + '/observer-source.json', JSON.stringify({ original: digest(original), observed: digest(changed), wholeInverse: true, originalGit: map.originalGit, edits: map.edits.map(edit => edit.name) }, null, 2) + '\n');
fs.writeFileSync(out + '/observer-launch.mjs', "import path from 'node:path';\nimport {pathToFileURL} from 'node:url';\nprocess.argv[1]=path.resolve('scripts/simCmShootoutOrder.mjs');\nawait import(pathToFileURL(path.resolve('scripts/.release-shootout-rng-observed.mjs')).href);\n");
const report = { traceEligible: false, sourceRef: '00c85815cac64d72014594e6b38515d4d6ce2e45', originalAssertionsWaived: false };
let problem = null;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fields = ['baselineRef', 'baselineSourceHash', 'rows', 'oldLoad', 'firstDifference', 'summary', 'namedBase', 'runtimeErrors', 'failedSections', 'mutation'];
function sameOutcomes(a, b) { for (const field of fields) assert.deepEqual(b[field], a[field], 'TRACE_OUTCOME_PARITY ' + field); }
function completeTrace(trace) {
  assert.equal(trace.calls, 2, 'TRACE_CAPTURE_COUNTS');
  assert.deepEqual(trace.traces.map(row => row.label), ['current-compatible', 'old-5b70'], 'TRACE_CAPTURE_COUNTS');
  for (const row of trace.traces) {
    assert.equal(row.seed, 782100); assert.equal(row.overflow, false, 'TRACE_CAPTURE_COUNTS');
    assert.equal(row.totalDraws, row.draws.length, 'TRACE_CAPTURE_COUNTS'); assert(row.totalDraws > 0 && row.totalDraws <= 20000);
    for (let i = 0; i < row.draws.length; i++) { assert.equal(row.draws[i].index, i); assert.equal(typeof row.draws[i].value, 'number'); assert(Number.isFinite(row.draws[i].value)); assert(row.draws[i].stack.length > 0 && row.draws[i].stack.length <= 1600); }
  }
}
function execute(label, entry) {
  const dir = out + '/' + label, receipt = out + '/' + label + '-transport.log';
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(receipt, '');
  const env = { ...process.env, CI: '1', SIM_NETWORK: 'offline', TZ: 'UTC', NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: receipt, CM_SHOOTOUT_ARTIFACTS: dir };
  for (const key of ['SIM_SEED', 'CM_SHOOTOUT_CONTROL', 'CM_SHOOTOUT_WRITE_FIXTURE', 'ONLY', 'BROWSER']) delete env[key];
  if (label === 'observed') env.CM_SHOOTOUT_TRACE_ARTIFACTS = out + '/trace'; else delete env.CM_SHOOTOUT_TRACE_ARTIFACTS;
  const run = spawnSync('timeout', ['--kill-after=15s', '15m', process.execPath, entry], { cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 930000 });
  fs.writeFileSync(dir + '/stdout.log', run.stdout || ''); fs.writeFileSync(dir + '/stderr.log', run.stderr || '');
  fs.writeFileSync(dir + '/native.exit', String(run.status) + '\n');
  assert(!run.error && !run.signal, 'Native command completed: ' + label); assert.equal(fs.statSync(receipt).size, 0);
  return run;
}
try {
  const vanilla = execute('vanilla', script);
  fs.writeFileSync(observer, changed, { flag: 'wx' });
  const observed = execute('observed', out + '/observer-launch.mjs');
  const a = read(out + '/vanilla/normal-baseline.json'), b = read(out + '/observed/normal-baseline.json');
  report.nativeExits = { vanilla: vanilla.status, observed: observed.status };
  assert.equal(vanilla.status, 1); assert.equal(observed.status, 1);
  assert.equal(a.rows.length, 150); assert.equal(a.namedBase.rows, 300);
  assert.deepEqual(a.runtimeErrors, []); assert.deepEqual(b.runtimeErrors, []);
  sameOutcomes(a, b);
  for (const value of [a, b]) assert(value.sources.every(row => row.held === true));
  assert.deepEqual(b.sources, a.sources);
  assert.deepEqual(b.executedSources.map(({ role, hash }) => ({ role, hash })), a.executedSources.map(({ role, hash }) => ({ role, hash })));
  const trace = read(out + '/trace/rng-traces.json'); completeTrace(trace);
  assert.equal(trace.traces[0].result.seed, a.rows[0].seed); assert.equal(a.rows[0].seed, 782100);
  assert.deepEqual(trace.traces[0].result, a.rows[0].candidate);
  assert.deepEqual(trace.traces[1].result, a.rows[0].baseline);
  assert.equal(digest(fs.readFileSync(out + '/trace/executed-bundle.mjs')), trace.bundleSHA256);
  for (const row of trace.traces) { const bytes = fs.readFileSync(out + '/trace/' + row.label + '-input.json'); assert.equal(bytes.length, row.inputBytes); assert.equal(digest(bytes), row.inputSHA256); }
  for (const row of trace.sources) assert.equal(digest(fs.readFileSync(out + '/trace/' + row.copy)), row.sha256);

  const alteredOutcome = structuredClone(b); alteredOutcome.rows[0].candidate.next += 0.25;
  assert.notDeepEqual(alteredOutcome.rows[0], b.rows[0]); assert.throws(() => sameOutcomes(a, alteredOutcome), /TRACE_OUTCOME_PARITY/);
  const alteredTrace = structuredClone(trace); alteredTrace.traces[0].totalDraws += 1;
  assert.notEqual(alteredTrace.traces[0].totalDraws, trace.traces[0].totalDraws); assert.throws(() => completeTrace(alteredTrace), /TRACE_CAPTURE_COUNTS/);
  fs.writeFileSync(out + '/checker-controls.json', JSON.stringify({ changedActualRetainedOutcome: true, outcomeParityRejected: true, changedActualCapturedCount: true, incompleteCaptureRejected: true, scope: 'Receipt-checker controls only. No engine, data, return value or RNG mutation.' }, null, 2) + '\n');
  report.traceEligible = true;
  report.outcomeFieldsExact = fields;
  report.fixtureRows = 150;
  report.namedRowsMeaning = '300 aggregate outcomes only, not 300 retained raw vectors';
  report.traceCalls = trace.traces.map(row => ({ label: row.label, seed: row.seed, inputSHA256: row.inputSHA256, draws: row.totalDraws, stackTruncatedCount: row.draws.filter(draw => draw.stackTruncated).length }));
  report.limits = 'Only two existing calls at seed782100. Raw stacks name executed bundle callsites; function suffix and line differences are not automatically causal. The original four Shootout failures remain failed. Bundle PID/path hashes are retained and are not full-state parity claims.';
} catch (error) {
  problem = error; report.error = { name: error.name, message: error.message, stack: error.stack };
} finally {
  if (fs.existsSync(observer)) fs.unlinkSync(observer);
  const after = inventory(); fs.writeFileSync(out + '/source-after.json', JSON.stringify(after, null, 2) + '\n');
  report.sourceHeld = JSON.stringify(after) === JSON.stringify(before);
  report.cleanAfter = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
  fs.writeFileSync(out + '/trace-admission.json', JSON.stringify(report, null, 2) + '\n');
}
if (problem || !report.sourceHeld || !report.cleanAfter) { console.error(problem || 'Source closure failed'); process.exitCode = 2; }
else { console.log('Trace observer matched all vanilla outcomes and retained the source-held two-call trace. Original Shootout native exit1 remains unwaived.'); process.exitCode = 1; }
