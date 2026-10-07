/* Mounted Soccer training lifecycle, with retained executable copied faults.
   Each fault must fail one named outcome and preserve the independent engine. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const panel = 'src/components/soccer-career/TrainingPanel.tsx', clock = 'src/hooks/usePracticeClock.ts';
const testFile = 'src/test/soccerPracticeLifecycle.test.tsx';
const cases = {
  verdict: 'keeps five actual mixed penalty verdicts and the earned one time bank unchanged',
  final: 'abandons a final penalty before it can hijack the real Through Ball and First Touch boards',
  reset: 'reopens a clean penalty run without an old reveal advancing the new counter',
  gateExit: 'cancels passing gate deadlines and random draws as soon as Drills is chosen',
  keeperExit: 'cancels keeper setup tell and reveal timers on every route back to Drills',
  timedExit: 'allows leaving an active sprint and cancels both running stopwatches before reopening',
  penalty: 'holds the remaining penalty reveal through blur rules and explicit resume without accepting paused shots',
  help: 'freezes a running penalty when rules open and preserves its last seven hundred milliseconds',
  keeper: 'preserves keeper setup tell and reveal remainders then banks the actual five saves',
  gates: 'preserves gate closing and between pass delays while paused taps cannot earn hits',
  cones: 'excludes paused wall time and paused cone taps from the real slalom score',
  sprint: 'preserves sprint time and real step score across hidden focus and paused input',
  starts: 'ignores paused start buttons until the player explicitly resumes the new run',
  close: 'cancels pending work on Close and unmount without extra callbacks or random draws',
  independent: 'retains the independent engine gain and fresh midfielder drill baseline',
};
const controls = {
  penaltyScore: { file: panel, from: 'finish("shooting", g * 20)', to: 'finish("shooting", g * 10)', test: cases.verdict },
  penaltyExit: { file: panel, from: 'clock.timeout(() => {\n      setLastPen(null);', to: 'setTimeout(() => {\n      setLastPen(null);', test: cases.final },
  extraHelp: { file: panel, from: 'const openBoard = (next: Screen) => { clock.reset(); setShowRules(false); setScreen(next); };', to: 'const openBoard = (next: Screen) => { clock.reset(); setScreen(next); };', test: cases.final },
  penaltyReset: { file: panel, from: 'clock.timeout(() => {\n      setLastPen(null);', to: 'setTimeout(() => {\n      setLastPen(null);', test: cases.reset },
  gateExit: { file: panel, from: 'gateTimer.current = clock.timeout(() => {', to: 'gateTimer.current = window.setTimeout(() => {', test: cases.gateExit },
  keeperSetup: { file: panel, from: 'clock.timeout(gkNextShot, 600)', to: 'window.setTimeout(gkNextShot, 600)', test: cases.keeperExit },
  keeperTell: { file: panel, from: 'gkTimer.current = clock.timeout(() => {\n      setGkTell(null);', to: 'gkTimer.current = window.setTimeout(() => {\n      setGkTell(null);', test: cases.keeperExit },
  keeperReveal: { file: panel, from: 'gkTimer.current = clock.timeout(() => {\n      if (gkShotNo', to: 'gkTimer.current = window.setTimeout(() => {\n      if (gkShotNo', test: cases.keeperExit },
  coneExit: { file: panel, from: 'runTimer.current = clock.interval(', to: 'runTimer.current = window.setInterval(', test: cases.timedExit },
  sprintExit: { file: panel, from: 'paceTimer.current = clock.interval(', to: 'paceTimer.current = window.setInterval(', test: cases.timedExit },
  activeBack: { file: panel, from: 'const toMenu = () => { clock.reset();', to: 'const toMenu = () => { if (paceRunning) return; clock.reset();', test: cases.timedExit },
  blur: { file: clock, from: "window.addEventListener('blur', blur);", to: "window.addEventListener('blur', () => {});", test: cases.penalty },
  hidden: { file: clock, from: 'if (document.hidden) blur();', to: 'if (false) blur();', test: cases.sprint },
  help: { file: panel, from: 'if (!showRules) clock.pause();', to: 'if (false) clock.pause();', test: cases.help },
  resume: { file: clock, from: 'excluded += Date.now() - stoppedAt;', to: 'excluded += 0;', test: cases.cones },
  penaltyInput: { file: panel, from: 'const takePen = (zone: number) => {\n    if (clock.isPaused()) return;', to: 'const takePen = (zone: number) => {', test: cases.penalty },
  keeperInput: { file: panel, from: 'const gkDive = (zone: number) => {\n    if (clock.isPaused()) return;', to: 'const gkDive = (zone: number) => {', test: cases.keeper },
  gateInput: { file: panel, from: 'const tapGate = (g: number) => {\n    if (clock.isPaused()) return;', to: 'const tapGate = (g: number) => {', test: cases.gates },
  coneInput: { file: panel, from: 'const clickCone = (i: number) => {\n    if (clock.isPaused()) return;', to: 'const clickCone = (i: number) => {', test: cases.cones },
  sprintInput: { file: panel, from: 'paceRunning && !clock.isPaused() && setClicks', to: 'paceRunning && setClicks', test: cases.sprint },
  keeperDeadline: { file: panel, from: '}, 650);', to: '}, 600);', test: cases.keeper },
  gateGap: { file: panel, from: 'clock.timeout(() => lightGate(n + 1), 350)', to: 'clock.timeout(() => lightGate(n + 1), 300)', test: cases.gates },
  coneTime: { file: panel, from: 'const elapsed = clock.now() - (dribbleStart.current ?? clock.now());', to: 'const elapsed = Date.now() - (dribbleStart.current ?? clock.now());', test: cases.cones },
  sprintTime: { file: panel, from: 'const left = 5 - (clock.now() - startedAt) / 1000;', to: 'const left = 5 - (Date.now() - startedAt) / 1000;', test: cases.sprint },
  close: { file: panel, from: 'const close = () => { clock.clearAll(); onClose(); };', to: 'const close = () => { onClose(); };', test: cases.close },
  unmount: { file: clock, from: 'unmount: () => { mounted = false; clearAll(); },', to: 'unmount: () => { mounted = false; },', test: cases.close },
  sprintStart: { file: panel, from: 'const startPace = () => {\n    if (clock.isPaused()) return;', to: 'const startPace = () => {', test: cases.starts },
  gateStart: { file: panel, from: 'const startGates = () => {\n    if (clock.isPaused()) return;', to: 'const startGates = () => {', test: cases.starts },
  bank: { file: panel, from: 'setBanked(true); onComplete(drill, score);', to: 'setBanked(true); onComplete(drill, score); onComplete(drill, score);', test: cases.verdict },
};
const control = process.env.SOCCER_PRACTICE_LIFECYCLE_CONTROL || '', count = Object.keys(cases).length;
assert(!control || control === 'all' || control in controls, 'Known Soccer practice lifecycle fault');
const out = path.resolve(process.env.SOCCER_PRACTICE_LIFECYCLE_ARTIFACTS || path.join(root, 'career-practice-lifecycle-artifacts/soccer'));
await mkdir(out, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, SOCCER_PRACTICE_LIFECYCLE_CONTROL: name, SOCCER_PRACTICE_LIFECYCLE_ARTIFACTS: out }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(out, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Soccer practice lifecycle ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simSoccerPracticeLifecycle')).join('\n') + '\n' : output.slice(-14000));
  }
  await writeFile(path.join(out, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(row => row.passed), 'All normal and effective copied faults pass');
  console.log(`simSoccerPracticeLifecycle all: ${count} actual outcomes and ${Object.keys(controls).length} effective faults passed.`);
  process.exit(0);
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const siblings = [panel, clock];
const held = [...siblings, 'src/components/soccer-career/DrillBoard.tsx', 'src/components/soccer-career/FirstTouchBoard.tsx', 'src/components/soccer-career/ThroughBallBoard.tsx', 'src/components/soccer-career/TrainingFeedback.module.css',
  'src/lib/soccerCareerEngine.ts', 'src/lib/careerDrills.ts', 'src/lib/firstTouchDrill.ts', 'src/lib/throughBallDrill.ts', testFile, 'scripts/simSoccerPracticeLifecycle.mjs'];
const before = {};
for (const file of held) {
  const bytes = await readFile(path.join(root, file));
  before[file] = digest(bytes);
}
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(out, `${control || 'normal'}-report.json`);
let folder;
const copies = [];
try {
  if (control) {
    const spec = controls[control];
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/soccer-practice-'));
    const aliases = {}, receipts = [];
    for (const file of siblings) {
      const original = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
      let changed = original;
      if (file === spec.file) {
        assert.equal(original.split(spec.from).length - 1, 1, 'Fault binds exactly one executable source anchor');
        changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original, 'The copied fault changes real source');
        await writeFile(path.join(out, `${control}-mutation.json`), JSON.stringify({ control, file, from: spec.from, to: spec.to, anchorCount: 1, originalSha256: digest(original), changedSha256: digest(changed), test: spec.test }, null, 2));
      }
      const mutated = changed !== original, changedSha256 = digest(changed);
      if (file === panel) for (const [from, to] of [
        ['"./DrillBoard"', '"@/components/soccer-career/DrillBoard"'],
        ['"./FirstTouchBoard"', '"@/components/soccer-career/FirstTouchBoard"'],
        ['"./TrainingFeedback.module.css"', '"@/components/soccer-career/TrainingFeedback.module.css"'],
      ]) {
        assert.equal(changed.split(from).length - 1, 1, 'Copied panel resolves each original sibling import once');
        changed = changed.replace(from, to);
      }
      const copy = path.join(folder, path.basename(file)); copies.push(copy); await writeFile(copy, changed);
      await writeFile(path.join(out, `${control}-${path.basename(file)}.txt`), changed);
      aliases['@/' + file.slice(4).replace(/\.tsx?$/, '')] = copy;
      receipts.push({ file, mutated, originalSha256: digest(original), changedSha256, copiedSha256: digest(changed), siblingImportsRewritten: file === panel ? 3 : 0 });
    }
    assert.equal(receipts.filter(row => row.mutated).length, 1, 'Only the named copied source is mutated');
    await writeFile(path.join(out, `${control}-copies.json`), JSON.stringify(receipts, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); await writeFile(path.join(out, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Actual mounted lifecycle runner completed');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime failures earn no fault credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, count - 2);
    const intended = rows.find(row => row.title === controls[control].test); assert.equal(intended?.status, 'failed');
    const failure = intended.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, '');
    assert.match(failure, /AssertionError:|Error: expect\(element\)/, 'The named outcome fails an actual assertion');
    assert.equal(rows.find(row => row.title === cases.independent)?.status, 'passed');
    console.log(`simSoccerPracticeLifecycle ${control}: mapped outcome rejected changed source; independent engine baseline passed.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, count); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log(`simSoccerPracticeLifecycle: ${count} actual outcomes passed.`);
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  const after = {};
  for (const file of held) {
    const bytes = await readFile(path.join(root, file));
    after[file] = digest(bytes);
  }
  await writeFile(path.join(out, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, `All ${held.length} source files remain unchanged`);
}
