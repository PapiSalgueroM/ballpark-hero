/* Real Board outcomes. Copied executable controls retain two original-mode
   baselines and require only named assertion failures. Runtime evidence stays
   in buzzer-shot-lab-artifacts/mounted. BUZZER_SHOT_LAB_CONTROL=all runs every
   control serially and reports all failures before exiting. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const board = 'src/components/buzzer-beater/BuzzerBeaterBoard.tsx';
const comparison = 'src/components/buzzer-beater/ShotLabComparison.tsx';
const testFile = 'src/test/buzzerShotLab.test.tsx';
const retry = 'retries the same setup with retained controls and the identical actual trajectory';
const compare = 'compares only the latest two settled actual releases and their rendered paths';
const stopped = 'shows stopped shots honestly without imaginary rim metrics or landing markers';
const daily = 'keeps a newly earned daily byte identical across lab retries setup changes and return';
const independent = [
  'retains the original recorded daily and unlimited outcomes independently of the lab',
  'restores the original daily quietly without entering the lab',
];
const controls = {
  rng: { file: board, from: 'lehmer((labSeedRef.current ^ 0x5eed1234) + shotIdx * 7919)', to: 'rngRef.current', tests: [retry] },
  retry: { file: board, from: 'setResult(null);\n    if (changeSetup) {', to: 'setResult(null);\n    setFade(0); setArc(0.6); setPower(0.4);\n    if (changeSetup) {', tests: [retry] },
  release: { file: board, from: '? takeShot({ x: fade, arc, power }, setup, lehmer(', to: '? takeShot({ x: fade, arc, power: 0.99 }, setup, lehmer(', tests: ['turns a measured miss into a make through actual release adjustments'] },
  compare: { file: board, from: 'setLabShots(previous => [...previous.slice(-1), labShot])', to: 'setLabShots(previous => [...previous.slice(0, 1), labShot])', tests: [compare] },
  settled: { file: board, from: 'setResult(r);\n    setPhase(\'flying\');', to: 'setResult(r);\n    if (labShot) setLabShots(previous => [...previous.slice(-1), labShot]);\n    setPhase(\'flying\');', tests: [compare] },
  path: { file: board, from: 'd={shot.result.path.map((p, i) => `${i ? \'L\' : \'M\'} ${toX(p.x)} ${toY(p.y)}`).join(\' \')}', to: 'd={shot.result.path.map((p, i) => `${i ? \'L\' : \'M\'} ${toX(p.x)} ${toY(p.y + 1)}`).join(\' \')}', tests: [compare] },
  setup: { file: board, from: 'setShotIdx(i => (i + 1) % shots.length);\n      setLabShots([]);', to: 'setShotIdx(i => (i + 1) % shots.length);', tests: ['changes setup without carrying previous comparison or attempt counts'] },
  duplicate: { file: board, from: "if (mode === 'lab') labReleaseLock.current = true;", to: 'void mode;', tests: ['locks duplicate release before a render with reduced motion false', 'locks duplicate release before a render with reduced motion true'] },
  pause: { file: board, from: "if (phase === 'aiming' || phase === 'flying') pause();", to: 'void phase;', tests: ['holds the release and exact remaining flight while rules are open or play is paused'] },
  record: { file: board, from: 'if (labShot) setLabShots(previous => [...previous.slice(-1), labShot]);', to: 'if (labShot) { setLabShots(previous => [...previous.slice(-1), labShot]); writeArcadeRun(SLUG, todayStr, COUNT_FIELD, { score: 0, count: 0 }); }', tests: [daily] },
  completion: { file: board, from: "isDone && !bookedAlready && (mode === 'daily' || mode === 'unlimited')", to: "(isDone || (mode === 'lab' && labShots.length > 0)) && !bookedAlready && (mode === 'daily' || mode === 'unlimited' || mode === 'lab')", tests: [daily] },
  exit: { file: board, from: 'setMode(m);', to: "setMode(previous => previous === 'lab' && m === 'unlimited' ? 'lab' : m);", tests: ['leaves the lab for unlimited without stale shots or record changes'] },
  reset: { file: board, from: 'setCharging(false);\n    setLabShots([]);\n    labReleaseLock.current = false;', to: 'setCharging(false);\n    labReleaseLock.current = false;', tests: ['leaves the lab for practice without stale shots or record changes'] },
  rim: { file: comparison, from: '{result.blocked ? <p className="mt-2 text-muted-foreground">', to: '{false ? <p className="mt-2 text-muted-foreground">', tests: [stopped] },
  landing: { file: board, from: 'if (shot.result.blocked || shot.result.entryDeg <= 0) return null;', to: 'if (false) return null;', tests: [stopped] },
  contact: { file: board, from: "result.made ? result.verdict : 'Missed. Compare the path and rim crossing.'", to: 'result.verdict', tests: [compare] },
};
const control = process.env.BUZZER_SHOT_LAB_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known Shot lab control');
const evidence = path.resolve(process.env.BUZZER_SHOT_LAB_ARTIFACTS || path.join(root, 'buzzer-shot-lab-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root,
      env: { ...process.env, BUZZER_SHOT_LAB_CONTROL: name, BUZZER_SHOT_LAB_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Shot lab ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simBuzzerShotLab')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert.ok(outcomes.every(row => row.passed), 'Every normal/control outcome must pass; all were attempted');
  console.log(`simBuzzerShotLab all: 15 real Board cases and ${Object.keys(controls).length} effective controls passed serially. Two independent original-mode baselines stayed green in every control.`);
  process.exit(0);
}

const heldFiles = [board, comparison, 'src/lib/buzzerBeater.ts', 'src/lib/arcade.ts', 'src/lib/arcadeRecord.ts', 'src/hooks/useArcadeFlight.ts', 'src/hooks/useGameCompletion.ts', testFile];
const held = await Promise.all(heldFiles.map(async file => ({ file, bytes: await readFile(path.join(root, file)) })));
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
    folder = await mkdtemp(path.join(root, '.sim-control/buzzer-shot-lab-'));
    copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    const alias = '@/' + spec.file.slice(4).replace(/\.tsx$/, '');
    env.NO_DOUBLE_SWAP = JSON.stringify({ [alias]: copy });
    console.log(`simBuzzerShotLab ${control}: changed one executable binding in ${spec.file}`);
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [...controls[control].tests, ...independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output);
  process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner completed without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runner faults cannot earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 15, 'All fifteen real Board cases are discovered');
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    const wanted = controls[control].tests;
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, wanted.length);
    assert.equal(report.numPassedTests, independent.length); assert.equal(report.numPendingTests, 15 - wanted.length - independent.length);
    for (const name of wanted) {
      const matching = rows.filter(row => row.title === name); assert.equal(matching.length, 1);
      assert.equal(matching[0].status, 'failed', `Intended outcome fails: ${name}`);
      const failure = matching[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
      assert.match(failure, /AssertionError:|Error: expect\(element\)/, 'A named outcome assertion must reject the changed binding');
    }
    for (const name of independent) assert.equal(rows.find(row => row.title === name)?.status, 'passed', `Independent original-mode baseline: ${name}`);
    console.log(`simBuzzerShotLab ${control}: ${wanted.length} intended assertion failures, two original-mode baselines passed, ${15 - wanted.length - independent.length} intentional skips.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 15); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simBuzzerShotLab: 15 real Board outcomes passed, including exact paths, measured improvement, honest stopped-shot readouts, every mode exit and daily bytes.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  for (const item of held) assert.deepEqual(await readFile(path.join(root, item.file)), item.bytes, `${item.file} raw bytes held`);
}
console.log('simBuzzerShotLab: eight runtime inputs held byte for byte; reports and changed copies retained for review.');
