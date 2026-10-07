import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Decision regression recording runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'manager-appeal-isolation-artifacts/decision-regressions');
const HARNESS = 'scripts/simClubManagerDecisions.mjs';
const DESK = 'src/lib/clubManagerDecisions.ts';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/managerAppealIsolation1081/manifest.json')));
assert.equal(digest(fs.readFileSync(path.join(ROOT, HARNESS))), manifest.unchangedSource[HARNESS], 'Original assertions and fixtures are exact');
fs.mkdirSync(OUT, { recursive: true });
function sourceHashes(root) {
  const files = {};
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files[file] = digest(fs.readFileSync(path.join(root, file)));
    }
  };
  walk('src'); return files;
}
const report = { complete: false, sourceBefore: sourceHashes(ROOT), runs: [],
  originalVerificationBefore: Object.fromEntries([HARNESS, 'scripts/lib/seedRandom.mjs'].map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))])),
  scope: 'Unmodified original assertions, explicit supplemental seeds, and separately retained default coverage status' };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
save();
function run(name, root, seed, control) {
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: path.join(OUT, `${name}.transport.log`) };
  delete env.SIM_SEED; delete env.CM_DECISIONS_CONTROL;
  if (seed !== undefined) env.SIM_SEED = String(seed);
  if (control) env.CM_DECISIONS_CONTROL = control;
  const child = spawnSync(process.execPath, [path.join(root, HARNESS)], { cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120000 });
  fs.writeFileSync(path.join(OUT, `${name}.stdout.log`), child.stdout || '');
  fs.writeFileSync(path.join(OUT, `${name}.stderr.log`), child.stderr || '');
  const row = { name, seed: seed ?? null, seedEnvironment: seed === undefined ? 'truly unset, original filename initialization' : 'explicit', control: control ?? null,
    exit: child.status, signal: child.signal, error: child.error?.message, stdoutSha256: digest(child.stdout || ''), stderrSha256: digest(child.stderr || ''),
    failures: (child.stdout || '').split('\n').filter(line => line.startsWith('FAIL ')) };
  report.runs.push(row); save();
  assert(!child.error && !child.signal && Number.isInteger(child.status), 'Actual original harness finishes');
  assert(!/SyntaxError|ReferenceError|TypeError|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/.test(child.stderr || ''), 'Runtime/setup errors do not count as assertion evidence');
  assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, 'No blocked transport');
  assert((child.stdout || '').includes(`simClubManagerDecisions${control ? ` (control ${control})` : ''}: ${row.failures.length} findings`), 'Complete original terminal verdict');
  return row;
}
function defaultStatus(row) {
  if (row.exit === 0) { assert.deepEqual(row.failures, []); return 'passed'; }
  assert.equal(row.exit, 1); assert.equal(row.failures.length, 1);
  assert(/^FAIL \[1\] only [0-5] straight reds in the play seasons, under the floor of 6$/.test(row.failures[0]), 'Default may be characterized only for its actual coverage floor');
  return 'coverage-floor-red';
}
const baseline = fs.mkdtempSync(path.join(ROOT, '.manager-decision-baseline-1081-'));
try {
  fs.cpSync(path.join(ROOT, 'src'), path.join(baseline, 'src'), { recursive: true });
  fs.mkdirSync(path.join(baseline, 'scripts/lib'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, HARNESS), path.join(baseline, HARNESS));
  fs.copyFileSync(path.join(ROOT, 'scripts/lib/seedRandom.mjs'), path.join(baseline, 'scripts/lib/seedRandom.mjs'));
  report.copiedVerification = Object.fromEntries(Object.keys(report.originalVerificationBefore).map(file => [file, digest(fs.readFileSync(path.join(baseline, file)))]));
  assert.deepEqual(report.copiedVerification, report.originalVerificationBefore, 'Copied original harness and initialization stream are byte-exact');
  const historical = fs.readFileSync(path.join(ROOT, manifest.frozenSource));
  assert.equal(digest(historical), manifest.sha256);
  fs.writeFileSync(path.join(baseline, DESK), historical);
  report.baselineSource = sourceHashes(baseline);
  for (const [file, hash] of Object.entries(report.sourceBefore)) assert.equal(report.baselineSource[file], file === DESK ? manifest.sha256 : hash, `Baseline differs only at frozen decisions: ${file}`);
  assert.deepEqual(Object.keys(report.baselineSource), Object.keys(report.sourceBefore));
  report.currentDefault = defaultStatus(run('current-default', ROOT));
  report.historicalDefault = defaultStatus(run('historical-default', baseline));
  report.defaultLimitation = report.currentDefault === 'coverage-floor-red';
  for (const seed of [1, 2, 3, 4]) {
    const row = run(`current-seed-${seed}`, ROOT, seed);
    assert.equal(row.exit, 0, `Every original assertion passes on advertised supplemental seed ${seed}`);
    assert.deepEqual(row.failures, []);
  }
  const from = '    const next = won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA;';
  const to = '    const next = won ? 0 : p.suspendedMatches;';
  const current = fs.readFileSync(path.join(ROOT, DESK), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(current.split(from).length - 1, 1, 'Unique original loss control anchor');
  const original = fs.readFileSync(path.join(ROOT, HARNESS), 'utf8');
  assert(original.includes(`desk = swap(desk, '${from}', '${to}', 'clubManagerDecisions.ts');`), 'Original harness applies this exact copied mutation');
  const copied = current.replace(from, to); assert.notEqual(copied, current);
  fs.writeFileSync(path.join(OUT, 'freeloss-reconstructed-source.ts'), copied);
  const control = run('current-seed-1-freeloss', ROOT, 1, 'freeloss');
  assert.equal(control.exit, 1); assert(control.failures.some(line => line.startsWith('FAIL [3]')), 'Original lost-ban assertion rejects its executable copied fault');
  assert(control.failures.every(line => line.startsWith('FAIL [3]')), 'Only the intended original control section may fail');
  report.lossControl = { copiedSourceSha256: digest(copied), mappedSection: 3, healthyBaseline: 'current-seed-1',
    limit: 'Reconstructed exact original mutation retained; original harness removes its temporary emitted bundle' };
  report.sourceAfter = sourceHashes(ROOT); assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Actual sources stay held');
  report.originalVerificationAfter = Object.fromEntries(Object.keys(report.originalVerificationBefore).map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
  assert.deepEqual(report.originalVerificationAfter, report.originalVerificationBefore, 'Original assertion and stream source holds');
  report.complete = true; save();
  console.log(`Default current: ${report.currentDefault}; frozen historical: ${report.historicalDefault}.`);
  console.log('Supplemental original assertions: seeds 1, 2, 3 and 4 passed. Default status remains separately visible.');
  console.log('Original loss control fired in section 3 beside a healthy seed-1 baseline.');
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack }; save(); throw error;
} finally {
  fs.rmSync(baseline, { recursive: true, force: true });
}
