/* Actual Shot lab outcomes. Each copied-source fault must fail its named
   assertion while the original Unlimited engine and completion stay green. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const board = 'src/components/free-kick/FreeKickBoard.tsx';
const comparison = 'src/components/free-kick/FreeKickLabComparison.tsx';
const testFile = 'src/test/freeKickLab.test.tsx';
const cases = {
  rules: 'shows instructions and a worked example before play and restores rule focus',
  retry: 'retries identical real shots with every chosen setting retained',
  compare: 'compares only the latest two settled actual paths when bend changes',
  setup: 'changes and wraps the actual setup ladder with fresh comparison and attempt counts',
  stopped: 'stops wall traces at real contact and omits imaginary goal crossing readings',
  input: 'routes delayed aim drags sliders and keyboard without charging or accidental kicks',
  pause: 'holds the actual remaining flight through rules pause blur and unmount',
  duplicate: 'locks duplicate releases before a render with both motion preferences',
  daily: 'keeps a saved Daily byte identical without lab points records shares or completions',
  baseline: 'retains original Unlimited engine results and its single earned completion independently',
};
const controls = {
  focus: { file: board, from: 'const target = labOpener.current?.isConnected ? labOpener.current : labKick.current;\n      target?.focus({ preventScroll: true });', to: 'const target = labOpener.current?.isConnected ? labOpener.current : labKick.current;\n      void target;', test: cases.rules },
  rng: { file: board, from: 'lehmer((labSeedRef.current ^ 0x5eed1234) + kickIdx * 7919)', to: 'rngRef.current', test: cases.retry },
  retry: { file: board, from: 'clearPointerHold(); resetFlight(); setResult(null);\n    if (changeSetup)', to: 'clearPointerHold(); resetFlight(); setResult(null); setPower(.6); setCurve(0); setAimX(0); setAimY(.5);\n    if (changeSetup)', test: cases.retry },
  compare: { file: board, from: 'setLabShots(previous => [...previous.slice(-1), labShot])', to: 'setLabShots(previous => [...previous.slice(0, 1), labShot])', test: cases.compare },
  settled: { file: board, from: "setResult(r);\n    setPhase('flying');", to: "setResult(r);\n    if (labShot) setLabShots(previous => [...previous.slice(-1), labShot]);\n    setPhase('flying');", test: cases.compare },
  path: { file: board, from: "points={path.map(point => `${toViewX(point.x)},${toViewY(point.y)}`).join(' ')}", to: "points={path.map(point => `${toViewX(point.x)},${toViewY(point.y + .1)}`).join(' ')}", test: cases.compare },
  setup: { file: board, from: 'if (changeSetup) { setKickIdx(i => (i + 1) % kicks.length); setLabShots([]); labAttemptRef.current = 0; }', to: 'if (changeSetup) { setKickIdx(i => (i + 1) % kicks.length); labAttemptRef.current = 0; }', test: cases.setup },
  wall: { file: comparison, from: 'return result.hitWall ? result.path.slice(0, Math.round(result.path.length * .45) + 1) : result.path;', to: 'return result.path;', test: cases.stopped },
  arrival: { file: comparison, from: 'const arrival = !result.hitWall && !tooWeak;', to: 'const arrival = !tooWeak;', test: cases.stopped },
  input: { file: board, from: "if (isSteady && event.key === ' ') event.preventDefault();", to: 'void event;', test: cases.input },
  pause: { file: board, from: "window.addEventListener('blur', stopAim); document.addEventListener('visibilitychange', hidden);", to: "document.addEventListener('visibilitychange', hidden);", test: cases.pause },
  duplicate: { file: board, from: "if (mode === 'lab') labReleaseLock.current = true;", to: 'void mode;', test: cases.duplicate },
  record: { file: board, from: 'if (labShot) setLabShots(previous => [...previous.slice(-1), labShot]);', to: 'if (labShot) { setLabShots(previous => [...previous.slice(-1), labShot]); writeArcadeRun(SLUG, todayStr, COUNT_FIELD, { score: 0, count: 0 }); }', test: cases.daily },
  completion: { file: board, from: "isDone && mode !== 'practice' && mode !== 'lab' && !bookedAlready", to: "(isDone || (mode === 'lab' && phase === 'kickEnd')) && mode !== 'practice' && !bookedAlready", test: cases.daily },
  exit: { file: board, from: 'setScore(completedDaily?.score ?? 0); setGoals(completedDaily?.count ?? 0);', to: 'setScore(0); setGoals(0);', test: cases.daily },
};
const control = process.env.FREE_KICK_LAB_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known Free Kick lab control');
const evidence = path.resolve(process.env.FREE_KICK_LAB_ARTIFACTS || path.join(root, 'free-kick-lab-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root,
      env: { ...process.env, FREE_KICK_LAB_CONTROL: name, FREE_KICK_LAB_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Free Kick lab ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simFreeKickLab')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert.ok(outcomes.every(row => row.passed), 'All normal/control runs were attempted and must pass');
  console.log(`simFreeKickLab all: 10 actual mounted outcomes and ${Object.keys(controls).length} effective controls. Original Unlimited baseline green in every copied-source run.`);
  process.exit(0);
}

const heldFiles = [board, comparison, 'src/components/free-kick/FreeKickPractice.module.css', 'src/lib/freeKick.ts', 'src/lib/arcade.ts', 'src/lib/arcadeRecord.ts', 'src/hooks/useArcadeFlight.ts', 'src/hooks/useGameCompletion.ts', testFile];
const verifyBytes = [];
const hashes = {};
for (const relative of heldFiles) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  hashes[relative] = createHash('sha256').update(bytes).digest('hex');
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} original bytes held`)));
}
await writeFile(path.join(evidence, `${control || 'normal'}-source-hashes.json`), JSON.stringify(hashes, null, 2));
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
let folder;
try {
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.from).length - 1, 1, `${control} must bind exactly one executable anchor`);
    const changed = source.replace(spec.from, spec.to);
    assert.notEqual(changed, source, `${control} must change executable code`);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/free-kick-lab-'));
    const copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    if (spec.file === board) await copyFile(path.join(root, 'src/components/free-kick/FreeKickPractice.module.css'), path.join(folder, 'FreeKickPractice.module.css'));
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ file: spec.file, anchor: spec.from, replacement: spec.to, count: 1, test: spec.test, original: createHash('sha256').update(source).digest('hex'), changed: createHash('sha256').update(changed).digest('hex') }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx$/, '')]: copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.baseline].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Real test runner completed without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime or import faults cannot earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 10, 'Every named outcome is discovered');
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0, 'No unhandled runner errors');
  if (control) {
    const target = rows.filter(row => row.title === controls[control].test); assert.equal(target.length, 1);
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 8);
    assert.equal(target[0].status, 'failed');
    const failure = target[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
    assert.match(failure, /AssertionError:/, 'Only the mapped AssertionError can earn control credit');
    assert.doesNotMatch(failure, /TestingLibraryElementError|TypeError:|ReferenceError:/, 'Missing elements or broken execution cannot earn credit');
    assert.equal(rows.find(row => row.title === cases.baseline)?.status, 'passed', 'Independent original Unlimited outcome stays green');
    console.log(`simFreeKickLab ${control}: one mapped assertion rejected one changed executable anchor; original Unlimited passed; eight intentional skips; zero unhandled errors.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 10); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simFreeKickLab: 10 actual mounted outcomes passed for exact repeated paths, changed bend, bounded settled comparisons, wall contact, input locks, pause and Daily isolation.');
  }
} finally {
  if (folder) await rm(folder, { recursive: true, force: true });
  await Promise.all(verifyBytes.map(verify => verify()));
}
console.log('simFreeKickLab: nine original runtime inputs held byte identical; actual JSON reports, hashes and changed-source receipts retained.');
