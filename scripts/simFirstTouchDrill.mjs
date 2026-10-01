/* Round 770: actual seeded First Touch rules and rendered career drill lifecycle.
   FIRST_TOUCH_CONTROL=timing|target|seed|bank|practice|practicewrite|stale|pause changes asserted source copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.FIRST_TOUCH_CONTROL || '';
const sources = {
  engine: 'src/lib/firstTouchDrill.ts',
  board: 'src/components/soccer-career/FirstTouchBoard.tsx',
};
const controls = {
  timing: { source: 'engine', changes: [[
    'const onTime = Number.isFinite(input.press) && input.press >= setup.arrival - setup.window && input.press <= setup.arrival + setup.window;',
    'const onTime = true;', 1,
  ]], failure: /gives every sampled round a legal win and timing and direction losses/ },
  target: { source: 'engine', changes: [['const matched = input.direction === setup.target;', 'const matched = true;', 1]], failure: /gives every sampled round a legal win and timing and direction losses/ },
  seed: { source: 'board', changes: [["drillSeed('firsttouch', today)", "drillSeed('firsttouch', '2026-01-01')", 2]], failure: /rejects invalid records, respects unavailable banking and uses the current day seed/ },
  bank: { source: 'board', changes: [['save({ ...recordRef.current, banked: true });', 'save({ ...recordRef.current, banked: false });', 1]], failure: /completes ten exact outcomes, blocks daily replay and persists one bank before the callback/ },
  practice: { source: 'board', changes: [["{mode === 'daily' && (canBank || record.banked) &&", '{(canBank || record.banked) &&', 1]], failure: /keeps practice scores and repeated practice separate from saved daily progress and banking/ },
  practicewrite: { source: 'board', changes: [["if (mode === 'daily') { writeDailyRecord(SLUG, today, { ...next }); setDaily(next); }", 'writeDailyRecord(SLUG, today, { ...next }); setDaily(next);', 1]], failure: /keeps practice scores and repeated practice separate from saved daily progress and banking/ },
  stale: { source: 'board', changes: [
    ["if (mode === 'daily' && restoreNewerDaily()) return;", '', 1],
    ['if (newer && (newer.rounds > next.rounds || newer.banked)) next = newer;', '', 1],
  ], failure: /preserves a newer other-tab checkpoint with (10|5) settled rounds/ },
  pause: { source: 'board', changes: [["stopClock(); if (phaseRef.current === 'resolve') flight.pause();", 'stopClock(); flight.pause();', 1]], failure: /freezes active time on Pause and hidden tabs/ },
};
assert.ok(!control || control in controls, 'Unknown First Touch control');
const originals = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([key, file]) => [key, await readFile(path.join(root, file), 'utf8')])));
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '2200' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = controls[control];
    let changed = originals[spec.source];
    for (const [anchor, replacement, count] of spec.changes) {
      assert.equal(changed.split(anchor).length - 1, count, 'Control must alter the exact live binding count');
      changed = changed.replaceAll(anchor, replacement);
    }
    assert.notEqual(changed, originals[spec.source], 'Control must change actual code');
    const [relative, resolved] = spec.source === 'engine'
      ? ["'./arcade'", "'@/lib/arcade'"]
      : ["'./FirstTouchBoard.module.css'", "'@/components/soccer-career/FirstTouchBoard.module.css'"];
    assert.equal(changed.split(relative).length - 1, 1, 'Temporary copy must resolve its actual dependency');
    changed = changed.replace(relative, resolved);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/first-touch-'));
    copy = path.join(folder, spec.source === 'engine' ? 'firstTouchDrill.ts' : 'FirstTouchBoard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.source === 'engine' ? '@/lib/firstTouchDrill' : '@/components/soccer-career/FirstTouchBoard']: copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/firstTouchDrill.test.ts', 'src/test/firstTouchBoard.test.tsx', '--reporter=verbose'], {
    cwd: root, env, encoding: 'utf8', timeout: 180000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /firstTouchDrill\.test\.ts/, 'Actual engine tests must execute');
  assert.match(output, /firstTouchBoard\.test\.tsx/, 'Actual rendered board tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed First Touch behavior must fail an outcome');
    assert.match(output, /Tests\s+\d+ failed.*\d+ passed/, 'Intended failures and unchanged green outcomes must both be reported');
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].failure.source), 'The intended outcome test must be in the actual failure report');
    assert.match(output, /AssertionError|TestingLibraryElementError|expected .* to/i, 'A real assertion must fail rather than module resolution');
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|No test files found/);
    console.log(`simFirstTouchDrill ${control}: the asserted source mutation failed its intended outcome; other engine/board checks remained green.`);
  } else {
    assert.equal(run.status, 0, output.slice(-7000));
    assert.match(output, /20 passed/);
    assert.match(output, /117 fixed policies.*240 runs each/);
    console.log('simFirstTouchDrill: twenty actual engine/board checks passed, including ten-ball input, exact geometry, daily/practice, pause/help, saved progress and one capped career bank.');
  }
  for (const [key, file] of Object.entries(sources)) assert.equal(await readFile(path.join(root, file), 'utf8'), originals[key], 'Controls must preserve shared production source');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
