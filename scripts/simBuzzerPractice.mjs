/* Round 778: actual Board, flight, physics, record and completion lifecycle.
   BUZZER_PRACTICE_CONTROL changes asserted copies, never production sources. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.BUZZER_PRACTICE_CONTROL || '';
const controls = {
  scroll: { anchor: "event.key === ' ' && event.currentTarget.tagName === 'INPUT'", replacement: 'false', name: 'keeps selected power through delayed and field Space inputs without charging or shooting' },
  repeat: { anchor: "event.repeat && (event.key === 'Enter' || event.key === ' ')", replacement: 'false', name: 'finishes and replays ten actual shots without record, completion or recorded sharing' },
  charge: { anchor: "mode === 'practice' || paused || phase !== 'aiming'", replacement: "paused || phase !== 'aiming'", failed: 1, passed: 8, name: 'keeps selected power through delayed and field Space inputs without charging or shooting' },
  capture: { anchor: "if (e.target === e.currentTarget) { if (isSteady) aimingRef.current = false; else cancelPointerCharge(e); }", replacement: 'aimingRef.current = false;', failed: 1, passed: 8, name: 'preserves continued child-capture drag and aim-only pointer release' },
  pointer: { anchor: 'if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);', replacement: 'if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); release();', failed: 1, passed: 8, name: 'preserves continued child-capture drag and aim-only pointer release' },
  physics: { anchor: 'takeShot({ x: fade, arc, power }, setup, rngRef.current)', replacement: 'takeShot({ x: fade, arc, power: 0.99 }, setup, rngRef.current)', failed: 6, passed: 3, name: 'uses the exact seeded engine path and retains field arrow aim' },
  completion: { anchor: "isDone && !bookedAlready && (mode === 'daily' || mode === 'unlimited')", replacement: 'isDone && !bookedAlready', failed: 3, passed: 6, name: 'finishes and replays ten actual shots without record, completion or recorded sharing' },
  record: { anchor: "phase !== 'done' || mode !== 'daily' || savedRef.current", replacement: "phase !== 'done' || mode === 'unlimited' || savedRef.current", failed: 3, passed: 6, name: 'finishes and replays ten actual shots without record, completion or recorded sharing' },
  restored: { anchor: "if (completedDaily) {\n      savedRef.current = true;", replacement: "if (completedDaily) {", failed: 2, passed: 7, name: 'preserves a restored daily byte for byte across practice and returning to today' },
  stale: { anchor: "if (completedDaily) {\n      savedRef.current = true;", replacement: "if (completedDaily) {\n      savedRef.current = true; markRestoredFinish(SLUG);", failed: 1, passed: 8, name: 'records an unlimited finish after returning to a restored daily without stale restore suppression' },
  focus: { anchor: 'target?.focus({ preventScroll: true });', replacement: 'void target;', failed: 3, passed: 6, name: 'finishes and replays ten actual shots without record, completion or recorded sharing' },
  help: { anchor: "if (phase === 'aiming' || phase === 'flying') pause();", replacement: 'void phase;', failed: 1, passed: 8, name: 'pauses rules and flight without consuming power or settling early' },
  share: { anchor: "(mode === 'daily' || mode === 'unlimited') && <ShareButtons", replacement: 'true && <ShareButtons', failed: 1, passed: 8, name: 'finishes and replays ten actual shots without record, completion or recorded sharing' },
  daily: { anchor: "const completedDaily = m === 'daily' ? completedDailyRef.current : null;", replacement: "const completedDaily = m === 'daily' ? restored : null;", name: 'keeps a newly finished daily booked across practice and unlimited without rewriting or recording it' },
  booked: { anchor: 'setBookedDaily(completedDaily !== null);', replacement: 'setBookedDaily(false);', name: 'keeps a newly finished daily in memory when private storage refuses its write' },
};
assert.ok(!control || control in controls, 'Unknown Buzzer practice control');
const sourcePath = path.join(root, 'src/components/buzzer-beater/BuzzerBeaterBoard.tsx');
const original = (await readFile(sourcePath, 'utf8')).replace(/\r\n/g, '\n');
const source = original.replace(/\r\n/g, '\n');
let folder;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const expected = controls[control];
    assert.equal(source.split(expected.anchor).length - 1, 1, 'Mutation must bind exactly one actual statement');
    let changed = source.replace(expected.anchor, expected.replacement);
    if (control === 'stale') changed = "import { markRestoredFinish } from '@/lib/restoredFinish';\n" + changed;
    assert.notEqual(changed, source, 'Control must change code');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/buzzer-practice-'));
    const copy = path.join(folder, 'BuzzerBeaterBoard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/buzzer-beater/BuzzerBeaterBoard': copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/buzzerPractice.test.tsx', '--reporter=verbose'];
  if (control) {
    const independent = controls[control === 'charge' || control === 'scroll' ? 'capture' : 'charge'].name;
    args.push('--testNamePattern', `${controls[control].name}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(control ? output.split('\n').filter(line => /[✓×]|FAIL |Tests\s|Test Files|Duration/.test(line)).join('\n') + '\n' : output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /buzzerPractice\.test\.tsx/, 'Actual Board tests must execute');
  if (control) {
    const expected = controls[control];
    assert.notEqual(run.status, 0, 'Changed input/bookkeeping must fail rendered outcomes');
    assert.match(output, /Tests\s+1 failed.*1 passed.*9 skipped/, output.slice(-6000));
    assert.ok(output.includes(`FAIL  src/test/buzzerPractice.test.tsx > Buzzer Beater steady practice > ${expected.name}`), 'Intended outcome assertion must fail');
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|Unhandled Errors|Test timed out|RPC timeout/, 'Loading or timeout errors never earn control credit');
    console.log(`simBuzzerPractice ${control}: the intended actual outcome rejects the binding; one independent actual outcome passes and nine tests are explicitly skipped. The separate positive gate runs all eleven.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000));
    assert.match(output, /11 passed/);
    console.log('simBuzzerPractice: eleven actual Board checks pass for delayed input, exact paths, continued capture, ten-shot/replay, rules/pause/focus, fresh daily roundtrips and private storage refusal.');
  }
  assert.equal((await readFile(sourcePath, 'utf8')).replace(/\r\n/g, '\n'), original, 'Production source remains unchanged');
  console.log('simBuzzerPractice: real shot/flight and record/completion lifecycle execute; copied controls preserve original sources and rules.');
} finally {
  if (folder) { await rm(path.join(folder, 'BuzzerBeaterBoard.tsx'), { force: true }); await rmdir(folder); }
}
