/* Round 1076: mounted shared drills, actual outcomes, copied faults and source hold.
   The historical fixture remains immutable; simCareerTraining still replays its
   normal timing, score, random draw and projected markup checkpoints. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/careerPracticeLifecycle.test.tsx';
const BANK_BASELINE = 'independent rating bank preserves thresholds and the player ceiling';
const CLOCK = 'src/hooks/usePracticeClock.ts';
const GROUND = 'src/components/career/TrainingGround.tsx';
const drill = name => `src/components/career/drills/${name}Drill.tsx`;
const requested = process.env.CAREER_PRACTICE_LIFECYCLE_CONTROL || '';
const controls = {
  stale_pick: { file: drill('ZonePick'), from: 'pickTimer.current = clock.timeout(() => {', to: 'pickTimer.current = window.setTimeout(() => {', test: 'supersedes the old reveal when the same penalty drill reopens' },
  gate_abandon: { file: drill('GateTap'), from: 'gateTimer.current = clock.timeout(() => {', to: 'gateTimer.current = window.setTimeout(() => {', test: 'supersedes gates running out behind the menu' },
  keeper_initial: { file: drill('ZonePick'), from: 'gkTimer.current = clock.timeout(gkNextShot, 600);', to: 'gkTimer.current = window.setTimeout(gkNextShot, 600);', test: 'keeper pause conserves the initial delay, tell, dive and reveal' },
  cone_input: { file: drill('ConeRun'), from: 'if (clock.isPaused()) return;', to: 'if (false) return;', test: 'cone time and mistakes exclude the entire paused interval' },
  burst_start: { file: drill('BurstTap'), from: 'if (clock.isPaused()) return;', to: 'if (false) return;', test: 'lane ignores starting input while paused' },
  burst_input: { file: drill('BurstTap'), from: 'if (paceRunning && !clock.isPaused())', to: 'if (paceRunning)', test: 'burst preserves remaining time and ignores taps while paused' },
  pick_input: { file: drill('ZonePick'), from: 'const takePen = (zone: number) => {\n    if (clock.isPaused()) return;', to: 'const takePen = (zone: number) => {', test: 'spots ignores starting input while paused' },
  keeper_input: { file: drill('ZonePick'), from: 'const gkDive = (zone: number) => {\n    if (clock.isPaused()) return;', to: 'const gkDive = (zone: number) => {', test: 'keeper pause conserves the initial delay, tell, dive and reveal' },
  gate_start: { file: drill('GateTap'), from: 'const startGates = () => {\n    if (clock.isPaused()) return;', to: 'const startGates = () => {', test: 'reads ignores starting input while paused' },
  gate_input: { file: drill('GateTap'), from: 'const tapGate = (g: number) => {\n    if (clock.isPaused()) return;', to: 'const tapGate = (g: number) => {', test: 'gates preserve both the open window and between-gate delay' },
  help: { file: GROUND, from: 'if (playing) clock.pause();', to: 'if (false) clock.pause();', test: 'help preserves the remaining shot reveal and requires explicit resume' },
  blur: { file: CLOCK, from: 'if (activeRef.current) clock.pause();', to: 'if (false) clock.pause();', test: 'blur preserves remaining time without refocus resuming play' },
  hidden: { file: CLOCK, from: 'if (document.hidden) blur();', to: 'if (false) blur();', test: 'hidden preserves remaining time without refocus resuming play' },
  elapsed: { file: CLOCK, from: 'excluded += Date.now() - stoppedAt;', to: 'excluded += 0;', test: 'preserves the fractional interval remainder and virtual elapsed time' },
  remainder: { file: CLOCK, from: 'for (const [id, task] of tasks) arm(id, task);', to: 'for (const [id, task] of tasks) { task.due = now() + (task.repeat || 1100); arm(id, task); }', test: 'preserves the fractional interval remainder and virtual elapsed time' },
  unmount: { file: CLOCK, from: 'unmount: () => { mounted = false; clearAll(); },', to: 'unmount: () => {},', test: 'unmount cancels scheduled callbacks and clears every native timer' },
  inactive: { file: CLOCK, from: 'if (!active) clock.reset();', to: 'if (false) clock.reset();', test: 'inactive transition cancels work and does not pause unrelated screens' },
  close: { file: GROUND, from: 'const close = () => { attemptRef.current += 1; clock.clearAll(); onClose(); };', to: 'const close = () => { attemptRef.current += 1; onClose(); };', test: 'close and unmount cancel the pending penalty reveal' },
  burst_back: { file: drill('BurstTap'), from: '<button onClick={onBack}', to: '<button onClick={() => { if (!paceRunning) onBack(); }}', test: 'Back immediately abandons an active burst and resets the next attempt' },
  burst_boundary: { file: drill('BurstTap'), from: '[paceRunning, paceLeft, clock.paused]', to: '[paceRunning, paceLeft]', test: 'burst completion at the blur boundary settles after explicit resume' },
  resume_label: { file: GROUND, from: "'Resume practice' : 'Pause practice'", to: "'Paused practice' : 'Pause practice'", test: 'help preserves the remaining shot reveal and requires explicit resume' },
  score: { file: GROUND, from: 'setScore(trainingScore(sc));', to: 'setScore(trainingScore(sc - 1));', test: 'supersedes the abandoned fifth penalty with the new drill result' },
  gate_gap: { file: drill('GateTap'), from: 'gateTimer.current = clock.timeout(() => lightGate(n + 1), 350);', to: 'gateTimer.current = window.setTimeout(() => lightGate(n + 1), 350);', test: 'gates preserve both the open window and between-gate delay' },
};
assert(!requested || requested === 'all' || controls[requested], 'Unknown shared practice lifecycle control');
const files = [CLOCK, GROUND, ...['ConeRun', 'BurstTap', 'ZonePick', 'GateTap'].map(drill), TEST,
  'src/test/careerTrainingGround.test.tsx', 'src/test/careerTrainingGround.fixture.json',
  'src/lib/careerTraining.ts', 'src/lib/nbaCareerTraining.ts', 'src/lib/nflCareerTraining.ts',
  'src/lib/nhlCareerTraining.ts', 'src/lib/mlbCareerTraining.ts', 'scripts/simCareerPracticeLifecycle.mjs',
];
const sha = file => createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
const before = Object.fromEntries(files.map(file => [file, sha(file)]));
const artifacts = path.join(ROOT, 'career-practice-lifecycle-artifacts', 'shared');
fs.mkdirSync(artifacts, { recursive: true });
const tempRoot = path.join(ROOT, '.sim-control');
fs.mkdirSync(tempRoot, { recursive: true });
const temp = fs.mkdtempSync(path.join(tempRoot, 'practice-lifecycle-'));
const report = { sourceBefore: before, baseline: null, controls: [], sourceAfter: null };
const save = () => fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify(report, null, 2));
function run(name, swap) {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  delete env.RECORD_TRAINING_FIXTURE;
  if (swap) env.NO_DOUBLE_SWAP = JSON.stringify(swap);
  const json = path.join(artifacts, `${name}.json`);
  fs.rmSync(json, { force: true });
  const result = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--testTimeout=120000', '--reporter=json', '--outputFile', json], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  fs.writeFileSync(path.join(artifacts, `${name}.log`), `${result.stdout || ''}\n${result.stderr || ''}`);
  assert(!result.error, `${name}: ${result.error}`);
  assert(fs.existsSync(json), `${name}: mounted suite produced no JSON result`);
  const data = JSON.parse(fs.readFileSync(json, 'utf8'));
  const assertions = data.testResults.flatMap(file => file.assertionResults || []);
  assert.equal(assertions.length, 23, `${name}: every expected outcome must run`);
  assert(assertions.every(row => ['passed', 'failed'].includes(row.status)), `${name}: no pending or skipped cases`);
  assert.equal(assertions.find(row => row.title === BANK_BASELINE)?.status, 'passed', `${name}: the unchanged independent bank baseline must pass`);
  return { exit: result.status, passed: assertions.filter(row => row.status === 'passed').length, failed: assertions.filter(row => row.status === 'failed').map(row => ({ title: row.title, messages: row.failureMessages })) };
}
try {
  report.baseline = run('baseline'); save();
  assert.equal(report.baseline.exit, 0, 'The unchanged product must pass before any control');
  assert.equal(report.baseline.passed, 23, 'All shared practice outcomes pass');
  for (const name of requested === 'all' ? Object.keys(controls) : requested ? [requested] : []) {
    const control = controls[name];
    const source = fs.readFileSync(path.join(ROOT, control.file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(source.split(control.from).length - 1, 1, `${name}: mutation anchor exists exactly once`);
    const changed = source.replace(control.from, control.to);
    assert.notEqual(changed, source, `${name}: copied source must actually change`);
    const copy = path.join(temp, `${name}${path.extname(control.file)}`);
    fs.writeFileSync(copy, changed);
    const alias = '@/' + control.file.replace(/^src\//, '').replace(/\.tsx?$/, '');
    const outcome = run(name, { [alias]: copy.replaceAll('\\', '/') });
    const intended = outcome.failed.find(row => row.title === control.test);
    report.controls.push({ name, file: control.file, from: control.from, to: control.to, intendedTest: control.test, ...outcome }); save();
    assert.notEqual(outcome.exit, 0, `${name}: the fault stayed green`);
    assert(intended, `${name}: the intended lifecycle outcome did not fail`);
    assert(intended.messages.some(message => /AssertionError|expect\(received\)/.test(message)), `${name}: expected an assertion failure, not a runtime/setup error`);
    assert(outcome.passed > 0, `${name}: unrelated mounted outcomes must still pass`);
    console.log(`shared practice control ${name}: intended assertion failed, ${outcome.passed} other outcomes passed`);
  }
} finally {
  report.sourceAfter = Object.fromEntries(files.map(file => [file, sha(file)])); save();
  fs.rmSync(temp, { recursive: true, force: true });
  assert.deepEqual(report.sourceAfter, before, 'Production sources, tests and historical fixture must remain unchanged by execution');
}
console.log(`simCareerPracticeLifecycle: 22 mounted outcomes and the independent bank baseline passed; ${report.controls.length} copied faults rejected; source hold passed.`);
