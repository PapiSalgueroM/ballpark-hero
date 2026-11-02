/* Actual MLB replay cases. MLB_PLAYOFF_REPLAY_CONTROL=entry|duplicate|series|
   result|help|back|focus must fail at its named assertions. All source copies and
   raw reports stay under SIM_MLB_PLAYOFF_ARTIFACTS, or a unique temp folder. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.MLB_PLAYOFF_REPLAY_CONTROL || '';
const centre = 'src/components/us-career/season/UsSeasonCentre.tsx';
const panel = 'src/components/us-career/season/MlbPlayoffReplay.tsx';
const model = 'src/lib/season/mlbPlayoffReplay.ts';
const walk = 'steps through every game of the saved playoff run and returns to the same regular review';
const reopen = 'reopens the same W/L replay, explains its limits and reopens its rules';
const fleet = 'covers every modern finish and game count without duplicating a game or clinching early';
const expectedFailures = { entry: [walk, reopen], duplicate: [walk, fleet], series: [walk, fleet], result: [walk, fleet], help: [reopen], back: [walk, reopen], focus: [walk] };
assert(!control || expectedFailures[control], 'Unknown MLB_PLAYOFF_REPLAY_CONTROL');
const base = process.env.SIM_MLB_PLAYOFF_ARTIFACTS ? path.resolve(process.env.SIM_MLB_PLAYOFF_ARTIFACTS) : os.tmpdir();
fs.mkdirSync(base, { recursive: true });
const output = fs.mkdtempSync(path.join(base, 'mlb-playoff-replay-'));
const held = new Map([centre, panel, model].map(file => [file, fs.readFileSync(path.join(root, file))]));
const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
delete env.US_BOARD_CONTROL_ALIAS;
delete env.US_BOARD_CONTROL_FILE;

if (control) {
  let target;
  let changed;
  if (control === 'entry') {
    target = centre;
    const old = spawnSync('git', ['cat-file', 'blob', '5473657a332903ef9e2b5d349481e1242f6b66b4'], { cwd: root });
    assert.equal(old.status, 0, 'The exact original viewer blob is required, with full Git history');
    const identity = createHash('sha1').update(`blob ${old.stdout.length}\0`).update(old.stdout).digest('hex');
    assert.equal(identity, '5473657a332903ef9e2b5d349481e1242f6b66b4', 'Original viewer bytes must match their Git blob');
    changed = old.stdout.toString('utf8');
  } else if (control === 'focus') {
    target = panel;
    const old = spawnSync('git', ['cat-file', 'blob', 'e90554092f2f1d942eab7855147fd3e52841f825'], { cwd: root });
    assert.equal(old.status, 0, 'The exact original panel blob is required, with full Git history');
    const identity = createHash('sha1').update(`blob ${old.stdout.length}\0`).update(old.stdout).digest('hex');
    assert.equal(identity, 'e90554092f2f1d942eab7855147fd3e52841f825', 'Original panel bytes must match their Git blob');
    changed = old.stdout.toString('utf8');
  } else {
    const push = 'games.push({ round: round.round, series, no: at + 1, won, mine, theirs, need: round.need });';
    const mutations = {
      duplicate: [model, push, push.replace('no: at + 1', 'no: 1')],
      series: [model, 'if (won) mine += 1; else theirs += 1;', 'if (won) mine += 2; else theirs += 1;'],
      result: [model, push, push.replace('won, mine', 'won: !won, mine')],
      help: [panel, 'Game scores and individual game stats were not saved.', 'Game scores and individual game stats were saved.'],
      back: [panel, 'onClick={onBack}', 'onClick={() => undefined}'],
    };
    const [file, before, after] = mutations[control];
    target = file;
    const source = held.get(target).toString('utf8');
    assert.equal(source.split(before).length - 1, 1, `${control}: one executed source anchor is required`);
    changed = source.replace(before, after);
  }
  assert.notEqual(changed, held.get(target).toString('utf8'), `${control}: copied source must change`);
  const copy = path.join(output, path.basename(target));
  fs.writeFileSync(copy, changed);
  env.US_BOARD_CONTROL_ALIAS = `@/${target.slice(4).replace(/\.tsx?$/, '')}`;
  env.US_BOARD_CONTROL_FILE = copy;
}

const vitest = path.join(path.dirname(createRequire(path.join(root, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');
const reportFile = path.join(output, 'vitest.json');
const run = spawnSync(process.execPath, [vitest, 'run', 'src/test/mlbPlayoffReplay.test.tsx', 'src/test/mlbPlayoffReplayModel.test.ts', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`], {
  cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
fs.writeFileSync(path.join(output, 'stdout.log'), run.stdout || '');
fs.writeFileSync(path.join(output, 'stderr.log'), run.stderr || '');
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Actual product source must remain unchanged');
assert.ifError(run.error);
assert(fs.existsSync(reportFile), 'Vitest must write actual replay outcomes');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
assert(Array.isArray(report.testResults) && report.testResults.length === 2, 'Exactly two actual replay test files are required');
const rows = report.testResults.flatMap(file => file.assertionResults || []);
const passed = rows.filter(row => row.status === 'passed').length;
const failed = rows.filter(row => row.status === 'failed');
const runtimeCounts = {
  numUnhandledErrors: report.numUnhandledErrors === undefined ? null : report.numUnhandledErrors,
  numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites === undefined ? null : report.numRuntimeErrorTestSuites,
};
const raw = (run.stdout || '') + (run.stderr || '');
const detectedRuntimeError = Object.values(runtimeCounts).some(value => typeof value === 'number' && value > 0) || /Unhandled (?:Errors?|Rejection)|Vitest caught \d+ unhandled/.test(raw);
const expected = rows.length === 12 && !detectedRuntimeError && (control
  ? run.status === 1 && passed === 12 - expectedFailures[control].length
    && failed.map(row => row.title).sort().join('|') === expectedFailures[control].slice().sort().join('|')
    && failed.every(row => row.failureMessages.some(message => /AssertionError/.test(message)))
    && (control !== 'focus' || failed[0].failureMessages.some(message => message.includes('Revealing a playoff result must keep native focus on the next action')))
  : run.status === 0 && passed === 12 && failed.length === 0);
const summary = {
  control, rawExit: run.status, passed, failed: failed.map(row => row.title), expected, runtimeCounts, detectedRuntimeError,
  rawErrors: report.errors === undefined ? null : report.errors,
  rawUnhandledErrors: report.unhandledErrors === undefined ? null : report.unhandledErrors,
};
fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`simMlbPlayoffReplay: ${passed}/12 passed, ${failed.length}/12 failed, expected=${expected}, rawExit=${run.status}, runtimeCounts=${JSON.stringify(runtimeCounts)}. Evidence: ${output}`);
process.exit(expected ? run.status : 1);
