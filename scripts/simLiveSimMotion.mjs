/** Round 603: rendered action triggers, saves versus goals, pause, player controls
 * and unchanged settlement. Controls rewrite temporary copies, never source.
 * LIVE_MOTION_CONTROL=trigger|save|pause|mutation|lineup|speed|reduced|terminal|redraw must turn the corresponding
 * runtime check red. Every replacement is asserted before a control runs.
 */
import { readFile, writeFile, mkdtemp, realpath, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.LIVE_MOTION_CONTROL || '';
assert.ok(['', 'trigger', 'save', 'pause', 'mutation', 'lineup', 'speed', 'reduced', 'terminal', 'redraw'].includes(control), 'Unknown live motion control');
const folder = await mkdtemp(path.join(tmpdir(), 'cm-motion-'));
const env = { ...process.env };
try {
  if (control) {
    let viewer = (await readFile(path.join(root, 'src/components/club-manager/LiveSimScreen.tsx'), 'utf8')).replaceAll('\r\n', '\n');
    let motion = (await readFile(path.join(root, 'src/components/club-manager/LiveSimMotion.tsx'), 'utf8')).replaceAll('\r\n', '\n');
    const replace = (source, before, after) => { assert.equal(source.split(before).length - 1, 1, 'Control anchor must occur exactly once: ' + before); assert.notEqual(before, after); return source.replace(before, after); };
    if (control === 'trigger') viewer = replace(viewer, 'setMotionEvent({ event: e, key, at: clock })', 'setMotionEvent(null)');
    if (control === 'save') motion = replace(motion, 'const event = action.event;', "const event = action.event.kind === 'save' ? { ...action.event, kind: 'goal' as const } : action.event;");
    if (control === 'pause') viewer = replace(viewer, 'if (paused || !running || finished) { lastTs.current = null; return; }', 'if (!running || finished) { lastTs.current = null; return; }');
    if (control === 'mutation') viewer = replace(viewer, 'firedRef.current.add(key);', "firedRef.current.add(key); if (e.kind === 'goal' && liveNow) liveNow.myGoals += 1;");
    if (control === 'lineup') motion = replace(motion, '&& samePlayers(action.scene.mine, scene.mine) && samePlayers(action.scene.theirs, scene.theirs)', '&& true');
    if (control === 'speed') viewer = replace(viewer, 'c + dt * BASE_RATE * speed', 'c + dt * BASE_RATE');
    if (control === 'reduced') motion = replace(motion, 'reduced ? 1.05 : clock - action.event.at', 'clock - action.event.at');
    if (control === 'terminal') viewer = replace(viewer, 'const terminalWindup = !!terminalAction && clock >= terminalMinute - 1.05 && clock < terminalMinute;', 'const terminalWindup = false;');
    if (control === 'redraw') viewer = replace(viewer, 'const motionStillCommitted = !motionEvent || motionEvent.event.minute <= clock || feed.includes(motionEvent.event);', 'const motionStillCommitted = true;');
    const componentPath = path.join(folder, 'LiveSimMotion.tsx').replaceAll('\\', '/');
    viewer = replace(viewer, "import { LivePitchPlayer, useLiveSimMotion } from '@/components/club-manager/LiveSimMotion';", "import { LivePitchPlayer, useLiveSimMotion } from './LiveSimMotion';");
    viewer = replace(viewer, "import type { MotionEvent } from '@/components/club-manager/LiveSimMotion';", "import type { MotionEvent } from './LiveSimMotion';");
    await writeFile(componentPath, motion);
    await writeFile(path.join(folder, 'LiveSimMotion.css'), await readFile(path.join(root, 'src/components/club-manager/LiveSimMotion.css')));
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
  const selected = { trigger: 'actual feed', save: 'committed action|actual feed', pause: 'pause freezes', mutation: 'settled results', lineup: 'substitution during', speed: 'speed changes', reduced: 'reduced motion', terminal: 'terminal goal and save contact', redraw: 'a tactics redraw cancels' };
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/liveSimMotion.test.tsx', '--reporter=verbose'];
  if (control) args.push('--config', path.join(folder, 'vitest.config.mjs'), '-t', selected[control]);
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()), 'Temporary cleanup must stay under the OS temp directory');
  assert.ok(path.basename(folder).startsWith('cm-motion-'));
  await rm(folder, { recursive: true, force: true });
}
