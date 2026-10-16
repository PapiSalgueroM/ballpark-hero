/* Actual screen and pure-reader outcomes. Runtime belongs to remote offline CI. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Requires remote offline CI');
const phase = process.env.CLUB_FIXTURES_PHASE || 'fixed'; assert(['baseline', 'fixed'].includes(phase));
const out = path.resolve(process.env.CLUB_FIXTURES_OUT || 'club-fixtures-artifacts'); fs.mkdirSync(out, { recursive: true });
const test = 'src/test/clubDetailFixtures.test.tsx', component = 'src/components/club-manager/ClubDetailScreen.tsx';
const originalRef = 'a758fcec4392c57c639aa54cda840810c8e44663';
const missing = [
  'fixtures show the saved directed score and calendar-prefix progress',
  'fixtures follow saved world membership and its independent round counter',
  'fixtures leave missing legacy scores unrecorded instead of inferring table results',
  'fixtures use the founded clubs saved odd league and omit its byes',
  'fixtures explain when the clicked club has no saved league membership',
  'fixtures retain the actual saved first-season schedule after the real save loader',
  'fixtures Back returns to the same squad before the outer Back leaves the club',
];
const preserve = ['preservation keeps the initial owned squad value and best eleven', 'preservation keeps the initial rival world roster',
  'preservation keeps outer navigation and does not write or draw randomness'];
function run(label, files, expectedFailures = []) {
  const reportFile = path.join(out, label + '.json'); assert(!fs.existsSync(reportFile), 'Do not replace evidence');
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=default', '--reporter=json', `--outputFile.json=${reportFile}`], { encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || ''); fs.writeFileSync(path.join(out, label + '.log'), output); process.stdout.write(output);
  fs.writeFileSync(path.join(out, label + '.exit'), String(run.status) + '\n');
  assert(!run.error && !run.signal && fs.existsSync(reportFile));
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|\[SIM_OFFLINE_BLOCK\]|Cannot find module|SyntaxError|ReferenceError|TypeError/.test(output));
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')), cases = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(report.testResults.length, files.length); assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  if (files.length === 1) { assert.equal(cases.length, 10); assert.deepEqual(cases.map(row => row.title).sort(), [...missing, ...preserve].sort()); }
  else assert.equal(cases.length, 21);
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), [...expectedFailures].sort());
  for (const row of failed) assert.equal(row.failureMessages.length, 1);
  for (const row of failed) assert(/^AssertionError: club detail must offer its saved league fixtures: expected false to be true/s.test(row.failureMessages[0]));
  assert.equal(report.success, expectedFailures.length === 0); assert.equal(report.numFailedTests, expectedFailures.length);
  assert.equal(report.numPassedTests, cases.length - expectedFailures.length); assert.equal(run.status, expectedFailures.length ? 1 : 0);
  console.log(`PASS ${label}: ${report.numPassedTests} passes, ${expectedFailures.length} exact owned faults, pending0`);
}
const held = fs.readFileSync(component), heldTest = fs.readFileSync(test);
run('current', [test], phase === 'baseline' ? missing : []);
if (phase === 'fixed') {
  const original = spawnSync('git', ['show', `${originalRef}:${component}`], { encoding: 'utf8' }); assert.equal(original.status, 0);
  assert.notEqual(original.stdout.replaceAll('\r\n', '\n'), held.toString().replaceAll('\r\n', '\n'), 'Original control must change the actual component');
  fs.writeFileSync(path.join(out, 'ClubDetailScreen.original.tsx'), original.stdout); fs.writeFileSync(path.join(out, 'ClubDetailScreen.fixed.tsx'), held);
  try { fs.writeFileSync(component, original.stdout); run('original', [test], missing); }
  finally { fs.writeFileSync(component, held); }
  run('restored', [test, 'src/test/clubDetailCurrentRoster.test.tsx', 'src/test/clubDetailOwnClub.test.tsx']);
}
assert.deepEqual(fs.readFileSync(component), held); assert.deepEqual(fs.readFileSync(test), heldTest);
console.log('PASS complete component/test restoration and actual saved league fixture outcomes');
