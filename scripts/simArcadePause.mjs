/* Round 762: real hook/Board pause outcomes with fixed shot payloads.
   Controls change asserted temporary copies, never production code. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.ARCADE_PAUSE_CONTROL || '';
const controls = {
  wallclock: { failures: 3, unaffected: 13, test: /freezes active time and rejects the old segment when resumed/ },
  unschedule: { failures: 1, unaffected: 15, test: /freezes active time and rejects the old segment when resumed/ },
  unbackup: { failures: 2, unaffected: 14, test: /unmount cancels all scheduled work and invalidates stale callbacks/ },
  staleflight: { failures: 3, unaffected: 13, test: /reset invalidates the previous flight and restores an unpaused start/ },
  stalerelease: { failures: 2, unaffected: 14, test: /cancels a held charge and requires a fresh press after resume/ },
  formkeys: { failures: 2, unaffected: 14, test: /keeps help, pause, ranges and dialogs out of global gameplay keys/ },
  linkkeys: { failures: 2, unaffected: 14, test: /keeps help, pause, ranges and dialogs out of global gameplay keys/ },
  rolekeys: { failures: 2, unaffected: 14, test: /keeps help, pause, ranges and dialogs out of global gameplay keys/ },
};
assert.ok(!control || control in controls, 'Unknown arcade pause control');
let folder;
const copies = [];
const originals = new Map();
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'arcade-pause-'));
    const modules = ['wallclock', 'unschedule', 'unbackup', 'staleflight'].includes(control)
      ? ['hooks/useArcadeFlight']
      : ['components/free-kick/FreeKickBoard', 'components/buzzer-beater/BuzzerBeaterBoard'];
    const swaps = {};
    for (const module of modules) {
      const sourcePath = path.join(root, `src/${module}.${module.startsWith('hooks/') ? 'ts' : 'tsx'}`);
      const original = await readFile(sourcePath, 'utf8');
      originals.set(sourcePath, original);
      const source = original.replace(/\r\n/g, '\n');
      const changes = {
        wallclock: ['flight.startedAt = performance.now();', 'if (segment === 1) flight.startedAt = performance.now();'],
        unschedule: ['    stop();\n    setPaused(true);', '    setPaused(true);'],
        unbackup: ['if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }', ''],
        staleflight: ['flightRef.current === flight && flight.segment === segment && !pausedRef.current', '!pausedRef.current'],
        stalerelease: ['  const endCharge = useCallback(() => {\n    if (!chargingRef.current) return;', '  const endCharge = useCallback(() => {'],
        formkeys: ['      if (isInteractive(e)) return;', ''],
        linkkeys: ['button, a[href], [role="button"], input', 'button, [role="button"], input'],
        rolekeys: ['button, a[href], [role="button"], input', 'button, a[href], input'],
      };
      const [anchor, replacement] = changes[control];
      assert.equal(source.split(anchor).length - 1, 1, `${module}: pause control must have one actual anchor`);
      let changed = source.replace(anchor, replacement);
      if (module === 'components/free-kick/FreeKickBoard') {
        const cssImport = "from './FreeKickPractice.module.css'";
        assert.equal(source.split(cssImport).length - 1, 1, 'Resolve exactly one practice CSS import in the copied Board');
        changed = changed.replace(cssImport, "from '@/components/free-kick/FreeKickPractice.module.css'");
      }
      assert.notEqual(changed, source, `${module}: pause control must alter the code`);
      const copy = path.join(folder, `${path.basename(module)}.${module.startsWith('hooks/') ? 'ts' : 'tsx'}`);
      await writeFile(copy, changed);
      copies.push(copy);
      swaps[`@/${module}`] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/arcadePause.test.tsx', '--reporter=verbose', '--testTimeout=60000'], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /arcadePause\.test\.tsx/, 'The actual hook and Board tests must run');
  if (control) {
    assert.notEqual(run.status, 0, output.slice(-6000));
    assert.match(output, controls[control].test);
    assert.match(output, new RegExp(`${controls[control].failures} failed.*${controls[control].unaffected} passed`), output.slice(-6000));
    console.log(`simArcadePause ${control} control: ${controls[control].failures} outcome checks rejected the changed code; ${controls[control].unaffected} unaffected checks passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000));
    assert.match(output, /16 passed/);
    console.log('simArcadePause: sixteen actual hook/Board checks passed for active time, stale callbacks, backup settlement, fresh input, keyboard routing and one daily save/completion.');
  }
  for (const [sourcePath, original] of originals) assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must stay unchanged');
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
