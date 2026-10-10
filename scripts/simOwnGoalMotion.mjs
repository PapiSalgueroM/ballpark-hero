/* Round 1216: an own goal is drawn as one by the shared pitch part (src/components/pitch-motion/motion.tsx).
 *
 * The clean run is src/test/pitchOwnGoal.test.tsx, all of it: the dense fleet (every eligible goal of 200 real
 * half feeds is an own goal, read on the cast the viewer holds for it), the rules OG1 to OG10 with a baseline arm
 * (the same line with og off, which is the picture before this round), the scenes made by hand, the two recorded
 * digests, the viewer on an own goal for each side, and the twin of Release AR's held cast test.
 *
 * OWN_GOAL_CONTROL=<name> rewrites a DISPOSABLE COPY of one source file, asserts its anchor is there exactly
 * once first, and must turn exactly its own test red on an assertion while one independent test (the material)
 * stays green. Every anchor is a single line and every read normalises line endings (simHarnessAnchors says why).
 *   plain      og is ignored, the picture before this round                         OG1
 *   side       the man is looked up on the side that GOT the goal                   OG1
 *   crowded    nobody steps off the line from the touch to the corner               OG9
 *   late       the instants are read a tenth of the action late                     OG2
 *   cheer      the hop is left on the man who delivered it                          OG3
 *   keeperdown a keeper who put it in stays lying in his dive, where the figure
 *              draws no hands at a head                                             OG3
 *   through    nobody steps aside when the man's walk passes through a team mate    OG4
 *   straight   the ball meets the man ON the straight line to the corner: no turn   OG5
 *   keepercorner  a keeper's own goal ends in the corner the line's own flank or the
 *              minute's parity picks, not the one on the side the ball came from    OG5 (the sweep by hand)
 *   absent     a named man who is not there falls back to the first outfield man    OG6
 *   reducedog  the hook follows the clock under reduced motion                      OG7
 *   setpiece   og is honoured on a penalty and on a free kick                       OG8
 *   kind       og is honoured on a line that is not a goal (a shot, a save)         OG8
 *   bandlow    a back deep in his own box is met where he stands, not at 13         OG10
 *   bandhigh   a back up the pitch is brought back to 28, not to 18                 OG10
 *   clamp      a back out by a touchline is met out there, not 26 from the middle   OG10
 *   touchmoved the touch comes at half of the flight                                OWN (the recorded frames)
 *   ruemoved   the hands stop short of the head                                     RUE (the recorded figure)
 *   viewerplain  the same change as plain, read in the live match                   the live match draws an own goal (both sides)
 *   castnow    the viewer no longer holds the cast while a chance plays             the twin of Release AR's test
 * A control exits 1 when its test went red on an assertion, as it must, and 3 when it did anything else.
 *
 * OWN_GOAL_FLEET=<n> (1 or more) hands the test file another dense fleet for its first describe (the same five
 * clubs on other seeds). One fleet is one sample: a bound that is green on the committed fleet and red on
 * another is a coin toss, so a bound is read on several before its number is written down. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.OWN_GOAL_CONTROL || '';
const TEST_FILE = 'src/test/pitchOwnGoal.test.tsx';
const TESTS = 16;
const baseline = 'the material is a dense fleet of own goals';
const MOTION = 'src/components/pitch-motion/motion.tsx';
const VIEWER = 'src/components/club-manager/LiveSimScreen.tsx';
const ENTRY = "if (action.event.og && action.event.kind === 'goal' && !action.event.penalty && !action.event.freeKick) return ownGoalFrame(scene, action, elapsed);";
const controls = {
  plain: { file: MOTION, anchor: ENTRY, replacement: 'void ownGoalFrame;', test: 'OG1: the ball goes in off the man the line names', fails: 1 },
  side: { file: MOTION, anchor: 'const man = ownGoalFigure(mine ? scene.theirs : scene.mine, own);', replacement: 'const man = ownGoalFigure(mine ? scene.mine : scene.theirs, own);', test: 'OG1: the ball goes in off the man the line names', fails: 1 },
  crowded: { file: MOTION, anchor: 'return p.keeper || gap >= 3.6 ? p', replacement: 'return p.keeper || gap >= 0 ? p', test: 'OG9: from the touch to the net the ball passes nobody else', fails: 1 },
  late: { file: MOTION, anchor: 'const whole = at(elapsed);', replacement: 'const whole = at(elapsed * .9);', test: 'OG2: the instants are the goal it always was', fails: 1 },
  cheer: { file: MOTION, anchor: 'for (const key in poses) delete poses[key].hop;', replacement: 'void poses;', test: 'OG3: nobody is the scorer', fails: 1 },
  keeperdown: { file: MOTION, anchor: ' * (1 - smooth(since)) || 0, catching: reach', replacement: ', catching: reach', test: 'OG3: nobody is the scorer', fails: 1 },
  through: { file: MOTION, anchor: 'if (ease <= 0) return now;', replacement: 'if (ease <= 1) return now;', test: 'OG4: nobody stands on a team mate', fails: 1 },
  straight: { file: MOTION, anchor: 'if (Math.abs(x - straight) < 5) x = straight + (x < straight ? -5 : 5);', replacement: 'x = straight;', test: 'OG5: the turn can be seen', fails: 1 },
  keepercorner: { file: MOTION, anchor: "const flank: PitchEvent['flank'] = !man ? own.flank : (man.keeper ? drawn(own.flank, PLANT_SPAN).ball.x : man.x) < 50 ? 'left' : 'right';", replacement: "const flank: PitchEvent['flank'] = !man || man.keeper ? own.flank : man.x < 50 ? 'left' : 'right';", test: 'OG5: the turn can be seen', fails: 1 },
  absent: { file: MOTION, anchor: '(event.text ? conceding.find(p => p.name === event.text) : undefined) ?? null;', replacement: '(event.text ? conceding.find(p => p.name === event.text) : undefined) ?? conceding.find(p => !p.keeper) ?? null;', test: 'OG6: who it goes in off', fails: 1 },
  reducedog: { file: MOTION, anchor: 'reduced ? 1.05 : clock - action.event.at', replacement: 'clock - action.event.at', test: 'OG7: reduced motion shows the last frame at once', fails: 1 },
  setpiece: { file: MOTION, anchor: ' && !action.event.penalty && !action.event.freeKick) return ownGoalFrame', replacement: ') return ownGoalFrame', test: 'OG8: a goal from the spot or from a direct free kick', fails: 1 },
  kind: { file: MOTION, anchor: "if (action.event.og && action.event.kind === 'goal' && ", replacement: 'if (action.event.og && ', test: 'OG8: a goal from the spot or from a direct free kick', fails: 1 },
  bandlow: { file: MOTION, anchor: 'const y = depth(Math.max(13, Math.min(18, depth(place.y))));', replacement: 'const y = depth(Math.max(3, Math.min(18, depth(place.y))));', test: 'OG10: a back meets it in a band', fails: 1 },
  bandhigh: { file: MOTION, anchor: 'const y = depth(Math.max(13, Math.min(18, depth(place.y))));', replacement: 'const y = depth(Math.max(13, Math.min(28, depth(place.y))));', test: 'OG10: a back meets it in a band', fails: 1 },
  clamp: { file: MOTION, anchor: 'let x = Math.max(24, Math.min(76, place.x));', replacement: 'let x = place.x;', test: 'OG10: a back meets it in a band', fails: 1 },
  touchmoved: { file: MOTION, anchor: 'const OWN_GOAL_TOUCH = .55;', replacement: 'const OWN_GOAL_TOUCH = .5;', test: 'OWN: every own goal frame of the hand made scenes', fails: 1 },
  ruemoved: { file: MOTION, anchor: '- rue * 17;', replacement: '- rue * 12;', test: 'RUE: the figure with his head in his hands', fails: 1 },
  viewerplain: { file: MOTION, anchor: ENTRY, replacement: 'void ownGoalFrame;', test: 'the live match draws an own goal', fails: 2 },
  castnow: { file: VIEWER, anchor: 'const castFrom = liveAction && clock >= liveAction.at && clock - liveAction.at <= ACTION_SPAN ? Math.max(liveAction.at, openedAt.current) : null;', replacement: 'const castFrom = null as number | null;', test: 'an own goal still on its way when the line up changes off the clock', fails: 1 },
};
if (control && !Object.hasOwn(controls, control)) { console.log(`simOwnGoalMotion: unknown control "${control}".`); process.exit(3); }
await mkdir(path.join(root, '.sim-control'), { recursive: true });
const folder = await mkdtemp(path.join(root, '.sim-control/own-goal-'));
const reportPath = path.join(folder, 'result.json');
let code = control ? 3 : 1;
let summary = '';
try {
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST_FILE, '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=300000', '--hookTimeout=120000', '--reporter=default', '--reporter=json', '--outputFile.json=' + reportPath];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.anchor).length - 1, 1, `the anchor of control ${control} must be in ${spec.file} exactly once`);
    let changed = source.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, source);
    const copy = path.join(folder, path.basename(spec.file));
    if (spec.file === MOTION) {
      const cssImport = "'./pitchMotion.css'";
      assert.equal(changed.split(cssImport).length - 1, 1, 'one stylesheet import to re-point');
      changed = changed.replace(cssImport, "'@/components/pitch-motion/pitchMotion.css'");
    }
    await writeFile(copy, changed);
    /* Every name the part is reached by resolves to the copy: the test's own import, Club Manager's re-export
       and the folder's own files must all be one module. */
    env.NO_DOUBLE_SWAP = JSON.stringify(spec.file === MOTION
      ? { '@/components/club-manager/LiveSimMotion': copy, '@/components/pitch-motion/motion': copy }
      : { '@/components/club-manager/LiveSimScreen': copy });
    args.push('--testNamePattern', spec.test + '|' + baseline);
    console.log(`Negative control changed temporary source: ${control} (${spec.file})`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || '');
  process.stdout.write(output);
  const broken = !!run.error || !!run.signal || /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/.test(output);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const rows = report.testResults.flatMap(suite => suite.assertionResults);
  const ran = rows.filter(row => row.status === 'passed' || row.status === 'failed');
  if (control) {
    const spec = controls[control];
    const failed = ran.filter(row => row.status === 'failed');
    const onAssertion = failed.every(row => /AssertionError|Error: expect\(/.test(row.failureMessages.join('\n')));
    const fired = !broken && run.status === 1 && failed.length === spec.fails && failed.every(row => row.fullName.includes(spec.test)) && onAssertion
      && ran.filter(row => row.status === 'passed').length === 1 && rows.find(row => row.title.startsWith(baseline))?.status === 'passed';
    code = fired ? 1 : 3;
    summary = fired
      ? `simOwnGoalMotion: control ${control} turned "${spec.test}" red on an assertion (${failed.length} failed) and the material stayed green, as it must.`
      : `simOwnGoalMotion: control ${control} did NOT behave: vitest exit ${run.status}, ${failed.length} failed (wanted ${spec.fails}), ${ran.length - failed.length} passed${broken ? ', and something timed out or failed to load' : ''}${onAssertion ? '' : ', and a failure was not an assertion'}.`;
  } else {
    const green = !broken && run.status === 0 && rows.length === TESTS && rows.every(row => row.status === 'passed') && Number(report.numUnhandledErrors ?? 0) === 0;
    code = green ? 0 : 1;
    summary = green
      ? `simOwnGoalMotion: green. ${rows.length} tests passed: the dense fleet, OG1 to OG9 against their baseline arm, the scenes made by hand (OG6 to OG8 and OG10), the two recorded digests, the live match on an own goal for each side, and the held cast twin.`
      : `simOwnGoalMotion: RED. vitest exit ${run.status}, ${rows.filter(row => row.status === 'failed').length} failed, ${rows.filter(row => row.status === 'passed').length} passed of ${rows.length} (wanted ${TESTS})${broken ? ', and something timed out or failed to load' : ''}.`;
  }
} catch (error) {
  summary = `simOwnGoalMotion: ${control ? `control ${control} ABORTED` : 'ABORTED'}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`;
} finally {
  await rm(folder, { recursive: true, force: true });
}
console.log(summary);
process.exit(code);
