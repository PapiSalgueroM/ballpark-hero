/* Round 777: actual shot rules, steady inputs and unrecorded practice lifecycle.
   FREE_KICK_PRACTICE_CONTROL selects an asserted temporary component mutation. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/components/free-kick/FreeKickBoard.tsx');
const control = process.env.FREE_KICK_PRACTICE_CONTROL || '';
const delayed = /holds chosen power through delayed aim taps and drags/;
const isolated = /finishes and replays ten real shots without replacing a saved daily/;
const restored = /returns to the original saved daily and later unlimited mode/;
const controls = {
  scroll: { changes: [["if (mode === 'practice' && event.key === ' ') event.preventDefault();", '', 1]], failure: /routes range, button and dialog keys independently/ },
  power: { changes: [['if (!paused) setPower(Number(event.target.value));', 'if (!paused) setPower(0.6);', 1]], failure: delayed },
  aimtap: { changes: [['if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);', 'if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); strike();', 1]], failure: delayed },
  charge: { changes: [
    ["const beginCharge = useCallback(() => {\n    if (mode === 'practice') return;", 'const beginCharge = useCallback(() => {', 1],
    ["if (mode === 'practice') { aimingRef.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); } else beginCharge();", 'beginCharge();', 1],
  ], failure: delayed },
  complete: { changes: [["isDone && mode !== 'practice' && !bookedAlready", 'isDone && !bookedAlready', 1]], failure: isolated },
  write: { changes: [["if (phase !== 'done' || mode !== 'daily' || savedRef.current) return;", "if (phase !== 'done' || mode === 'unlimited' || savedRef.current) return;", 1]], failure: isolated },
  keys: { changes: [['if (isInteractive(e)) return;', '', 1]], failure: /routes range, button and dialog keys independently/ },
  help: { changes: [["if (mode === 'practice' && (phase === 'aiming' || phase === 'flying') && !paused) pause();", '', 1]], failure: /pauses selected inputs and the real flight/ },
  focus: { changes: [['target?.focus({ preventScroll: true });', '', 1]], failure: /shows rules and a worked example before play/ },
  restorewrite: { changes: [["if (completedDaily) {\n      savedRef.current = true;", "if (completedDaily) {\n      savedRef.current = false;", 1]], failure: restored },
  restoremark: { changes: [
    ["import { getTodayET } from '@/lib/dateUtils';", "import { getTodayET } from '@/lib/dateUtils';\nimport { markRestoredFinish } from '@/lib/restoredFinish';", 1],
    ["if (completedDaily) {\n      savedRef.current = true;", "if (completedDaily) {\n      savedRef.current = true;\n      markRestoredFinish(SLUG);", 1],
  ], failure: restored },
  seed: { changes: [["const seed = m === 'daily' ? daySeed(todayStr) : Math.floor(Math.random() * 2147483645) + 1;", "const seed = m === 'daily' ? daySeed(todayStr) : 1;", 1]], failure: delayed },
  share: { changes: [["{mode !== 'practice' && <ShareButtons", '{<ShareButtons', 1]], failure: isolated },
  daily: { changes: [["const completedDaily = m === 'daily' ? completedDailyRef.current : null;", "const completedDaily = m === 'daily' ? restored : null;", 1]], failure: /keeps a newly finished daily booked across practice and unlimited/ },
  booked: { changes: [['setBookedDaily(completedDaily !== null);', 'setBookedDaily(false);', 1]], failure: /keeps a newly finished daily in memory when private storage refuses its write/ },
};
assert.ok(!control || control in controls, 'Unknown Free Kick practice control');
const original = (await readFile(source, 'utf8')).replace(/\r\n/g, '\n');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1600' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/freeKickPractice.test.tsx', '--reporter=verbose'];
  if (control) {
    const spec = controls[control];
    let changed = original.replace(/\r\n/g, '\n');
    for (const [anchor, replacement, count] of spec.changes) {
      assert.equal(changed.split(anchor).length - 1, count, 'Control must alter the exact live binding count');
      changed = changed.replaceAll(anchor, replacement);
    }
    assert.notEqual(changed, original.replace(/\r\n/g, '\n'), 'Control must change actual code');
    const dependency = "'./FreeKickPractice.module.css'";
    assert.equal(changed.split(dependency).length - 1, 1, 'Copied component must resolve its actual scoped CSS');
    changed = changed.replace(dependency, "'@/components/free-kick/FreeKickPractice.module.css'");
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/free-kick-practice-'));
    copy = path.join(folder, 'FreeKickBoard.tsx'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/free-kick/FreeKickBoard': copy });
    args.push('-t', `${spec.failure.source}|keeps reduced motion immediate and discards normal practice work on unmount`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /freeKickPractice\.test\.tsx/, 'Actual rendered tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed practice behavior must fail an outcome');
    assert.match(output, /Tests\s+1 failed.*1 passed.*9 skipped/, 'One intended failure and one independent unchanged outcome must both be reported');
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].failure.source), 'The intended outcome must appear in the failure report');
    assert.match(output, /AssertionError|TestingLibraryElementError|expect\(element\)|expected .* to/i, 'A real assertion must fail');
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|No test files found|Test timed out|Timeout calling|Unhandled Errors/);
    console.log(`simFreeKickPractice ${control}: its asserted copy failed the intended outcome; the independent actual reduced-motion/cleanup check stayed green.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000)); assert.match(output, /11 passed/);
    console.log('simFreeKickPractice: eleven actual Board/engine checks passed for explicit inputs, exact geometry, native key routing, pause/help, ten-shot practice, fresh daily roundtrips and private storage refusal.');
  }
  assert.equal((await readFile(source, 'utf8')).replace(/\r\n/g, '\n'), original, 'Controls must preserve shared production source');
} finally { if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder); }
