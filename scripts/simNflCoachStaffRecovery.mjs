/* Original actual component diagnostic. Fixed qualification follows admitted reproduction. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const engine = 'src/lib/usCoachCareer.ts';
const panel = 'src/components/us-career/CoachCareerPanel.tsx';
const suite = 'src/test/nflCoachStaffRecovery.test.tsx';
const oldSuite = 'src/test/usCoachRetirement.test.tsx';
const group = 'actual NFL empty coaching market recovery';
const titles = [
  'fresh NFL retiree can take a staff role without skipping a season',
  'JSON-restored stranded NFL coach can take staff work and keep the record',
  'unused recovery preserves the original empty market and idle decline',
  'completed NFL coach keeps recovery and progression unavailable',
  'employed NFL coach keeps recovery unavailable and the ordinary season intact',
  'earned NFL offers stay available without a staff shortcut',
  'nba empty coaching keeps the existing sit-out path',
  'mlb empty coaching keeps the existing sit-out path',
  'nhl empty coaching keeps the existing sit-out path',
];
const faults = [
  'Fresh NFL Take a staff role is missing from the actual empty-market panel',
  'Stranded NFL Take a staff role is missing from the actual empty-market panel',
];
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Runtime inherits ordinary offline transport');
assert(!process.env.NFL_COACH_MODE || process.env.NFL_COACH_MODE === 'baseline', 'This diagnostic admits original source only; fixed proof follows original admission');
for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'US_COACH_RETIRE_CONTROL']) assert(!process.env[key], `No inherited control ${key}`);
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.replaceAll('\r\n', '\n');
const clean = value => value.replace(/\x1b\[[0-9;]*m/g, '');
for (const file of [engine, panel, oldSuite, 'src/lib/usCareerToCoach.ts', 'src/components/us-career/UsCareerBoard.tsx', 'src/test/usCareerReports1346.test.tsx']) {
  assert.equal(lf(fs.readFileSync(path.join(root, file), 'utf8')), git(['show', `${base}:${file}`]), `Original whole source held: ${file}`);
}
const artifactRoot = process.env.NFL_COACH_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-staff-'));
assert(path.isAbsolute(artifactRoot) && fs.statSync(artifactRoot).isDirectory(), 'Existing absolute evidence root');
assert(path.relative(root, artifactRoot).split(path.sep).includes('..'), 'Evidence is outside checkout');
const out = path.join(artifactRoot, 'unit'); assert(!fs.existsSync(out), 'Fresh unit evidence'); fs.mkdirSync(out);
const arm = path.join(out, 'original'); fs.mkdirSync(arm);
const write = (name, body) => fs.writeFileSync(path.join(out, name), typeof body === 'string' ? body : JSON.stringify(body, null, 2) + '\n', { flag: 'wx' });
function sourceMap() {
  return git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => {
    const body = fs.readFileSync(path.join(root, file)); return { file, bytes: body.length, sha256: sha(body) };
  });
}
const initial = sourceMap(), statusBefore = git(['status', '--porcelain', '--untracked-files=all']);
const report = { version: 1, base, head: git(['rev-parse', 'HEAD']).trim(), mode: 'baseline', qualified: false, productQualified: false, cases: 23, arms: [], sourceHeld: false };
write('source-before.json', initial);
write('source-bindings.json', { base, engine: sha(fs.readFileSync(path.join(root, engine))), panel: sha(fs.readFileSync(path.join(root, panel))), suite: sha(fs.readFileSync(path.join(root, suite))), oldSuite: sha(fs.readFileSync(path.join(root, oldSuite))), titles, faults });
try {
  const receipt = path.join(arm, 'transport.transport');
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', suite, oldSuite, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile=${path.join(arm, 'vitest.json')}`];
  const child = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, FORCE_COLOR: '0', NFL_COACH_FIXTURE_OUT: path.join(out, 'fixtures.json'), SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  write('original/stdout.log', child.stdout ?? ''); write('original/stderr.log', child.stderr ?? '');
  write('original/process.json', { command: process.execPath, args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
  assert.ifError(child.error); assert.equal(child.signal, null, 'No timeout or signal earns diagnostic credit');
  assert(!fs.existsSync(receipt) || fs.statSync(receipt).size === 0, 'No swallowed child transport denial');
  const output = clean(`${child.stdout ?? ''}\n${child.stderr ?? ''}`);
  assert.doesNotMatch(output, /Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|(?:^|\n)(?:TypeError|ReferenceError|SyntaxError):|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND|Test timed out|Timeout calling/, 'No setup, transform, undefined-call or pending-timeout credit');
  const json = JSON.parse(fs.readFileSync(path.join(arm, 'vitest.json'), 'utf8'));
  assert.equal(child.status, 1); assert.equal(json.testResults.length, 2); assert.equal(json.numTotalTests, 23);
  assert.equal(json.numPassedTests, 21); assert.equal(json.numFailedTests, 2);
  assert.equal(json.numPendingTests, 0); assert.equal(json.numTodoTests, 0); assert.equal(json.success, false);
  if (json.numRuntimeErrorTestSuites !== undefined) assert.equal(json.numRuntimeErrorTestSuites, 0);
  if (json.unhandledErrors !== undefined) assert.deepEqual(json.unhandledErrors, []);
  const current = json.testResults.filter(row => row.name.replaceAll('\\', '/').endsWith('/' + suite));
  const old = json.testResults.filter(row => row.name.replaceAll('\\', '/').endsWith('/' + oldSuite));
  assert.equal(current.length, 1); assert.equal(old.length, 1);
  assert.equal(current[0].status, 'failed'); assert.equal(current[0].message, '');
  assert.equal(old[0].status, 'passed'); assert.equal(old[0].message, ''); assert.equal(old[0].assertionResults.length, 14);
  assert(old[0].assertionResults.every(row => row.status === 'passed' && row.failureMessages.length === 0), 'All fourteen original retirement cases remain healthy');
  assert.deepEqual(current[0].assertionResults.map(row => row.title), titles);
  const failures = [];
  for (const [index, row] of current[0].assertionResults.entries()) {
    assert.deepEqual(row.ancestorTitles, [group]); assert.equal(row.fullName, `${group} ${titles[index]}`);
    const failed = index < 2; assert.equal(row.status, failed ? 'failed' : 'passed'); assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) {
      const message = clean(row.failureMessages[0]);
      assert(message.startsWith(`AssertionError: ${faults[index]}: expected null not to be null`), 'Only the actual missing button assertion fails');
      assert(clean(child.stderr ?? '').includes(faults[index]), 'Full printed runner output identifies the same actual missing action');
      failures.push({ title: row.title, message });
    }
  }
  assert.equal(failures.length, 2);
  const fixtures = JSON.parse(fs.readFileSync(path.join(out, 'fixtures.json'), 'utf8'));
  assert.equal(fixtures.fresh.phase, 'retired'); assert.equal(fixtures.fresh.coach, null);
  assert.equal(fixtures.freshCoach.offers.length, 0); assert.equal(fixtures.freshCoach.done, false);
  assert.equal(fixtures.stranded.coach.profile.seasonsOut, 3); assert.equal(fixtures.stranded.coach.offers.length, 0);
  assert.equal(fixtures.stranded.coach.results.length, 3); assert.equal(fixtures.done.coach.done, true);
  report.arms.push({ name: 'original', passed: 21, failed: 2, failures }); report.qualified = true;
} finally {
  const final = sourceMap(); write('source-after.json', final);
  assert.deepEqual(final, initial, 'Every tracked source body and member held');
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), statusBefore, 'Working source and untracked membership held');
  report.sourceHeld = true; write('report.json', report);
}
console.log('simNflCoachStaffRecovery: actual fresh and three-idle NFL markets lack Take a staff role, exactly two intended component faults and twenty-one healthy outcomes.');
console.log('simNflCoachStaffRecovery: original automatic market, earned offers, employed/done guards and all other sports held; fourteen original retirement cases pass.');
console.log(`simNflCoachStaffRecovery: original diagnostic only, ${path.join(out, 'report.json')}; actual production-route evidence is separate.`);
