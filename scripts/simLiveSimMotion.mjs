/** Round 603: rendered action triggers, saves versus goals, pause, player controls
 * and unchanged settlement. Controls rewrite temporary copies, never source.
 * LIVE_MOTION_CONTROL=trigger|save|pause|mutation|lineup|speed|reduced|terminal|redraw|whistle|banner|boardgoal|etclock must turn the corresponding
 * runtime check red. Every replacement is asserted before a control runs.
 * Round 670 review: whistle puts back the viewer deciding extra time off the
 * career it was rendered with rather than off the latest save, and the two
 * "ninetieth minute" tests must go red.
 * Round 670 polish: banner puts back the extra time banner's typed "Level
 * after 90 minutes", which is false beside a second leg that is level only on
 * aggregate, and the banner test must go red.
 * Round 781 review: boardgoal prints a goal banner's bare minute (90' for a
 * goal at 90+3), and etclock prints the extra time clock's bare minute (ET
 * 120' all through its board); each must turn its own test red. Before the
 * review both left every gate green.
 */
import { readFile, writeFile, mkdtemp, realpath, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.LIVE_MOTION_CONTROL || '';
assert.ok(['', 'trigger', 'save', 'pause', 'mutation', 'lineup', 'speed', 'reduced', 'terminal', 'redraw', 'whistle', 'banner', 'boardgoal', 'etclock'].includes(control), 'Unknown live motion control');
const folder = await mkdtemp(path.join(tmpdir(), 'cm-motion-'));
const env = { ...process.env };
try {
  if (control) {
    let viewer = (await readFile(path.join(root, 'src/components/club-manager/LiveSimScreen.tsx'), 'utf8')).replaceAll('\r\n', '\n');
    /* Round 1101: the pitch moved to src/components/pitch-motion. The mutated copy is still written as
       <folder>/LiveSimMotion.tsx, because the viewer copy imports './LiveSimMotion'. */
    let motion = (await readFile(path.join(root, 'src/components/pitch-motion/motion.tsx'), 'utf8')).replaceAll('\r\n', '\n');
    const replace = (source, before, after) => { assert.equal(source.split(before).length - 1, 1, 'Control anchor must occur exactly once: ' + before); assert.notEqual(before, after); return source.replace(before, after); };
    if (control === 'trigger') viewer = replace(viewer, 'setMotionEvent({ event: e, key, at: clock })', 'setMotionEvent(null)');
    if (control === 'save') motion = replace(motion, 'const event = action.event;', "const event = action.event.kind === 'save' ? { ...action.event, kind: 'goal' as const } : action.event;");
    if (control === 'pause') viewer = replace(viewer, 'if (paused || !running || finished) { lastTs.current = null; return; }', 'if (!running || finished) { lastTs.current = null; return; }');
    if (control === 'mutation') viewer = replace(viewer, 'firedRef.current.add(key);', "firedRef.current.add(key); if (e.kind === 'goal' && liveNow) liveNow.myGoals += 1;");
    if (control === 'lineup') motion = replace(motion, '&& samePlayers(action.scene.mine, scene.mine) && samePlayers(action.scene.theirs, scene.theirs)', '&& true');
    if (control === 'speed') viewer = replace(viewer, 'c + dt * BASE_RATE * speed', 'c + dt * BASE_RATE');
    if (control === 'reduced') motion = replace(motion, 'reduced ? 1.05 : clock - action.event.at', 'clock - action.event.at');
    if (control === 'terminal') viewer = replace(viewer, 'const terminalWindup = !!terminalAction && clock >= terminalMinute - 1.05 && clock < terminalMinute;', 'const terminalWindup = false;');
    if (control === 'redraw') viewer = replace(viewer, 'const motionStillCommitted = !motionEvent || motionEvent.event.minute + (motionEvent.event.plus ?? 0) <= clock || feed.includes(motionEvent.event);', 'const motionStillCommitted = true;');
    if (control === 'whistle') {
      viewer = replace(viewer, '      if (liveNow?.et) {\n', '      if (isExtraTimeDue(career)) {\n');
      viewer = replace(viewer, '  liveFeed, liveStatsAt, myOnPitchAt, oppOnPitchAt, squadNumbers, benchFor, MAX_SUBS, liveGoneIds,\n', '  liveFeed, liveStatsAt, myOnPitchAt, oppOnPitchAt, squadNumbers, benchFor, MAX_SUBS, liveGoneIds, isExtraTimeDue,\n');
    }
    if (control === 'banner') viewer = replace(viewer, "club: extraTimeCall(career, liveNow), tone: 'none'", "club: 'Level after 90 minutes', tone: 'none'");
    if (control === 'boardgoal') viewer = replace(viewer, "'GOAL! ' }, who, { t: ` ${minuteLabel(e)}` }]", "'GOAL! ' }, who, { t: ` ${e.minute}'` }]");
    if (control === 'etclock') viewer = replace(viewer, "stage === 'extra' ? `ET ${minuteLabel({ minute, plus })}`", "stage === 'extra' ? `ET ${minute}'`");
    const componentPath = path.join(folder, 'LiveSimMotion.tsx').replaceAll('\\', '/');
    viewer = replace(viewer, "import { LivePitchPlayer, useLiveSimMotion } from '@/components/club-manager/LiveSimMotion';", "import { LivePitchPlayer, useLiveSimMotion } from './LiveSimMotion';");
    viewer = replace(viewer, "import type { MotionEvent } from '@/components/club-manager/LiveSimMotion';", "import type { MotionEvent } from './LiveSimMotion';");
    motion = replace(motion, "import './pitchMotion.css';", "import '@/components/pitch-motion/pitchMotion.css';");
    await writeFile(componentPath, motion);
    await writeFile(path.join(folder, 'LiveSimScreen.tsx'), viewer);
    env.LIVE_MOTION_VIEWER = '/@fs/' + path.join(folder, 'LiveSimScreen.tsx').replaceAll('\\', '/');
    env.LIVE_MOTION_COMPONENT = '/@fs/' + componentPath;
    const config = {
      root,
      test: { environment: 'jsdom', globals: true, setupFiles: [path.join(root, 'src/test/setup.ts')], include: ['src/test/liveSimMotion.test.tsx'] },
      esbuild: { jsx: 'automatic' },
      resolve: { alias: { '@': path.join(root, 'src') }, dedupe: ['react', 'react-dom', 'lucide-react'] },
      server: { fs: { allow: [root, folder, await realpath(path.join(root, 'node_modules'))] } },
    };
    await writeFile(path.join(folder, 'vitest.config.mjs'), `export default ${JSON.stringify(config)};\n`);
    console.log('Negative control changed temporary source:', control);
  }
  const selected = { trigger: 'actual feed', save: 'committed action|actual feed', pause: 'pause freezes', mutation: 'settled results', lineup: 'substitution during', speed: 'speed changes', reduced: 'reduced motion', terminal: 'terminal goal and save contact', redraw: 'a tactics redraw cancels', whistle: 'the ninetieth minute asks the latest save', banner: 'the extra time banner says what is true', boardgoal: 'a goal in the board is announced with its plus', etclock: 'the extra time clock runs into its own board' };
  /* Round 1101: a test with no timeout of its own gets 60 seconds, not vitest's 5. On a machine with other
     lanes compiling, three controls went red on 'Test timed out in 5000ms', which is red for the wrong reason. */
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/liveSimMotion.test.tsx', '--reporter=verbose', '--testTimeout=60000'];
  if (control) args.push('--config', path.join(folder, 'vitest.config.mjs'), '-t', selected[control]);
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()), 'Temporary cleanup must stay under the OS temp directory');
  assert.ok(path.basename(folder).startsWith('cm-motion-'));
  await rm(folder, { recursive: true, force: true });
}
