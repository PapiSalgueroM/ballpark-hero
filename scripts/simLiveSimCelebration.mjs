/* Actual pitch poses and clock ownership. Controls mutate disposable copies.
   LIVE_CELEBRATION_CONTROL=missing|figure|expiry|reduced|window|deadball|penmoment|freeze|stable|ballstep: each must fail exactly its own row and
   leave the independent destinations row green (Round 1101: window reads goalWindow's net contact as 0, and
   deadball, which mutates a copy of PitchMotion.tsx, stops it telling a binder about the plan's dead balls).
   The review's fixes: penmoment lets a penalty's own stretch be told as a free kick again, freeze lets the part
   follow the clock while playing is false, stable rebuilds the plan whenever a binder hands over new arrays (all
   three on PitchMotion.tsx), and ballstep lets the hook put the ball at the shooter's foot in one frame. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Round 1101: the pitch moved to src/components/pitch-motion. A control mutates motion.tsx unless it names another file of the part. */
const controlFile = { deadball: 'PitchMotion.tsx', penmoment: 'PitchMotion.tsx', freeze: 'PitchMotion.tsx', stable: 'PitchMotion.tsx' }[process.env.LIVE_CELEBRATION_CONTROL || ''] ?? 'motion.tsx';
const sourceFile = path.join(root, 'src/components/pitch-motion', controlFile);
const sourceBytes = await readFile(sourceFile);
const source = sourceBytes.toString().replace(/\r\n/g, '\n');
const control = process.env.LIVE_CELEBRATION_CONTROL || '';
const baseline = 'keeps original goal, save and miss destinations without mutation or random draws';
const controls = {
  missing: { anchor: "event.kind === 'goal' && flight === 1 ? smooth(resolve / .55) : 0", replacement: '0', test: 'raises only the scorer and two nearest outfield teammates after net contact' },
  figure: { anchor: "data-cm-actor-pose={celebrate ? 'celebrate' : dive ? 'dive' : kick ? 'strike' : 'stand'}", replacement: "data-cm-actor-pose={dive ? 'dive' : kick ? 'strike' : 'stand'}", test: 'draws raised arms on the actual scorer figure' },
  expiry: { anchor: 'clock - action.event.at <= 1.05', replacement: 'clock - action.event.at <= 100', test: 'freezes with the viewer clock and expires at the existing action boundary' },
  reduced: { anchor: 'reduced ? 1.05 : clock - action.event.at', replacement: 'clock - action.event.at', test: 'uses a static raised-arm finish under reduced motion' },
  /* Round 1101: goalWindow reads net contact as the instant the line fires, so a binder's score would change before the ball is in. */
  deadball: { anchor: 'if (beat.dead && (', replacement: 'if (false && (', test: 'PitchMotion tells a binder about each dead ball, once' },
  penmoment: { anchor: " && beat.via !== 'carrier') {", replacement: ') {', test: 'PitchMotion tells a binder about each dead ball, once' },
  freeze: { anchor: 'if (playing) held.current = clock;', replacement: 'held.current = clock;', test: 'playing false freezes the part on the frame it is showing, whatever the clock does' },
  stable: { anchor: '[planKey]);', replacement: '[mine, theirs, feed, kickoffs]);', test: 'a binder that hands over fresh arrays on every render still gets one unbroken action' },
  ballstep: { anchor: 'if (planted < 1) frame.ball', replacement: 'if (false) frame.ball', test: 'an action that starts with the ball somewhere else brings it to the shooter during his plant' },
  window: { anchor: "if (since < (reduced ? 0 : NET_AT)) return 'windup';", replacement: "if (since < 0) return 'windup';", test: "goalWindow says windup, net and over at the contract's instants" },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Known celebration control');
await mkdir(path.join(root, '.sim-control'), { recursive: true });
const folder = await mkdtemp(path.join(root, '.sim-control/live-celebration-'));
const reportPath = path.join(folder, 'result.json');
const owned = [reportPath];
try {
  /* NO_COLOR as well: on Windows this vitest colours a matcher's message whatever FORCE_COLOR says, and the
     control's own regex below then misses 'Error: expect(' (Round 1101 found the figure control red for that alone). */
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/liveSimCelebration.test.tsx', '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile.json=' + reportPath];
  if (control) {
    const spec = controls[control];
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Unique executable mutation');
    const changed = source.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, source);
    const copy = path.join(folder, controlFile === 'motion.tsx' ? 'LiveSimMotion.tsx' : controlFile);
    owned.push(copy);
    if (controlFile === 'motion.tsx') {
      const cssImport = "'./pitchMotion.css'";
      assert.equal(changed.split(cssImport).length - 1, 1, 'One stylesheet import to re-point');
      await writeFile(copy, changed.replace(cssImport, "'@/components/pitch-motion/pitchMotion.css'"));
    } else await writeFile(copy, changed);
    /* Both names resolve to the copy: the tests reach the part through Club Manager's re-export and
       PitchMotion reaches it by its own path, and they must be one module. */
    env.NO_DOUBLE_SWAP = JSON.stringify(controlFile === 'motion.tsx'
      ? { '@/components/club-manager/LiveSimMotion': copy, '@/components/pitch-motion/motion': copy }
      : { ['@/components/pitch-motion/' + controlFile.slice(0, controlFile.lastIndexOf('.'))]: copy });
    args.push('--testNamePattern', spec.test + '|' + baseline);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || '');
  process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Normal test termination');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(suite => suite.assertionResults);
  assert.equal(rows.length, 17);
  if (control) {
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, 1);
    assert.equal(report.numPassedTests, 1);
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed');
    const failed = rows.find(row => row.title === controls[control].test);
    assert.equal(failed?.status, 'failed');
    assert.match(failed.failureMessages.join('\n'), /AssertionError:|Error: expect\(/);
    console.log(`simLiveSimCelebration: ${control} changed source, intended assertion failed, independent destinations stayed green.`);
  } else {
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 17);
    console.log('simLiveSimCelebration: 17 outcome checks passed, correct side, net-first, real figure, freeze/expiry, reduced motion, the three recorded digests of the lift, the part behind its contract (its dead ball moments, the frame it freezes on, fresh arrays, the ball brought to the shooter), the penalty line up and the free kick wall.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  await rmdir(folder);
  assert.deepEqual(await readFile(sourceFile), sourceBytes, 'Product source held');
}
