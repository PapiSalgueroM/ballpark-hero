/* Five real Board outcomes. Copied executable controls retain an independent
   original Daily restore, with exact named failures and raw input preservation.
   BUZZER_COURT_CONTROL=all keeps every report and attempts controls serially. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const board = 'src/components/buzzer-beater/BuzzerBeaterBoard.tsx';
const artwork = 'src/components/buzzer-beater/BuzzerCourtArtwork.tsx';
const flight = 'src/hooks/useArcadeFlight.ts';
const testFile = 'src/test/buzzerCourtPresentation.test.tsx';
const projection = 'keeps the actual ball hoop and release anchors on the accepted projection across fixed shots';
const motion = 'draws real limb and ball seam motion then settles and resets the same shot';
const pause = 'holds the visible rig and ball during pause and resumes the same remaining flight';
const reduced = 'uses the identical settled artwork immediately with reduced motion';
const baseline = 'restores the original daily quietly with identical bytes independently of court art';
const controls = {
  ball: { file: board, from: '<circle data-court-ball=""\n          cx={ball ? toX(ball.x) : toX(0.1)}', to: '<circle data-court-ball=""\n          cx={(ball ? toX(ball.x) : toX(0.1)) + 1}', test: projection, message: 'Scored ball horizontal projection' },
  rim: { file: board, from: 'x1={toX(setup.distance - RIM_RADIUS)} y1={toY(RIM_HEIGHT)}', to: 'x1={toX(setup.distance - RIM_RADIUS) + 1} y1={toY(RIM_HEIGHT)}', test: projection, message: 'Scored rim horizontal projection' },
  limbs: { file: artwork, from: 'const followThrough = released ? Math.min(1, Math.max(0, flight) * 4) : 0;', to: 'const followThrough = 0;', test: motion, message: 'Shooter limbs respond to the actual flight' },
  seams: { file: artwork, from: 'const rotation = Math.min(1, Math.max(0, flight)) * 540;', to: 'const rotation = 0;', test: motion, message: 'Ball seams rotate independently of translation' },
  pause: { file: flight, from: 'setProgress(flight.elapsed / durationMs);', to: 'setProgress(0);', test: pause, message: 'Pausing keeps the current visible rig' },
  reduced: { file: artwork, from: 'const followThrough = released ? Math.min(1, Math.max(0, flight) * 4) : 0;', to: "const followThrough = released && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? Math.min(1, Math.max(0, flight) * 4) : 0;", test: reduced, message: 'Reduced motion uses the ordinary settled pose' },
};
const control = process.env.BUZZER_COURT_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known court presentation control');
const evidence = path.resolve(process.env.BUZZER_COURT_ARTIFACTS || path.join(root, 'buzzer-court-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root,
      env: { ...process.env, BUZZER_COURT_CONTROL: name, BUZZER_COURT_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} court presentation ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simBuzzerCourtPresentation')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert.ok(outcomes.every(row => row.passed), 'Every normal/control outcome must pass; all were attempted');
  console.log(`simBuzzerCourtPresentation all: five real Board cases and ${Object.keys(controls).length} effective controls passed serially. The independent original Daily restore stayed green in every control.`);
  process.exit(0);
}

const heldFiles = [board, 'src/components/buzzer-beater/ShotLabComparison.tsx', 'src/lib/buzzerBeater.ts', 'src/lib/arcade.ts', 'src/lib/arcadeRecord.ts', flight, 'src/hooks/useGameCompletion.ts', 'src/test/buzzerShotLab.test.tsx', artwork, testFile];
const verifyBytes = [];
for (const relative of heldFiles) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} raw bytes held`)));
}
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
let folder;
let copy;
try {
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.from).length - 1, 1, `${control} must bind exactly one executable source anchor`);
    const changed = source.replace(spec.from, spec.to);
    assert.notEqual(changed, source, `${control} must change executable code`);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/buzzer-court-'));
    copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
    console.log(`simBuzzerCourtPresentation ${control}: changed one executable binding in ${spec.file}`);
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, baseline].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output);
  process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner completed without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runner faults cannot earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 5, 'All five real Board cases are discovered');
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(Number(report.numTodoTests ?? 0), 0);
  if (control) {
    const spec = controls[control];
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1);
    assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 3);
    const failed = rows.filter(row => row.status === 'failed');
    assert.equal(failed.length, 1); assert.equal(failed[0].title, spec.test);
    const failure = failed[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
    assert.match(failure, /AssertionError:/, 'The named geometry or pose assertion must reject the changed binding');
    assert.ok(failure.includes(spec.message), `Expected assertion: ${spec.message}`);
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Independent original Daily restore');
    assert.equal(rows.filter(row => row.status === 'skipped').length, 3, 'Only the three unselected cases are skipped');
    console.log(`simBuzzerCourtPresentation ${control}: one intended assertion failure, one independent original Daily baseline passed, three intentional skips.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 5); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    assert.ok(rows.every(row => row.status === 'passed'));
    console.log('simBuzzerCourtPresentation: five real Board outcomes passed, including exact rendered geometry, finite poses, pause, reduced motion and original Daily bytes.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  await Promise.all(verifyBytes.map(verify => verify()));
}
console.log('simBuzzerCourtPresentation: ten runtime inputs held byte for byte; reports and changed copies retained for review.');
