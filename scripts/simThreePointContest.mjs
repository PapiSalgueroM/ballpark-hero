/* Actual contest and original ten-shot Board outcomes, with copied controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boardPath = 'src/components/buzzer-beater/BuzzerBeaterBoard.tsx';
const helperPath = 'src/lib/threePointContest.ts';
const independent = 'preserves recorded ten shot modes and restored daily bytes';
const controls = {
  money: { file: helperPath, anchor: 'return (index + 1) % BALLS_PER_RACK === 0 ? 2 : 1;', replacement: 'return 1;', test: 'uses five arcade racks and exact regular and money ball scoring' },
  length: { file: boardPath, anchor: "if (shotIdx + 1 >= rounds) { setPhase('done'); return; }", replacement: "if (shotIdx + 1 >= ROUNDS_PER_RUN) { setPhase('done'); return; }", test: 'plays all twenty five exact engine shots without recording the contest' },
  completion: { file: boardPath, anchor: "isDone && !bookedAlready && (mode === 'daily' || mode === 'unlimited')", replacement: "isDone && !bookedAlready && mode !== 'practice'", test: 'plays all twenty five exact engine shots without recording the contest' },
  pause: { file: boardPath, anchor: "if (phase === 'aiming' || phase === 'flying') pause();", replacement: 'void phase;', test: 'pauses contest shots and reopens rules without stale charging' },
};
const control = process.env.THREE_POINT_CONTEST_CONTROL || '';
assert.ok(!control || control in controls, 'Known contest control');
const heldFiles = [boardPath, helperPath, 'src/lib/buzzerBeater.ts', 'src/lib/arcade.ts', 'src/hooks/useArcadeFlight.ts', 'src/lib/arcadeRecord.ts', 'src/hooks/useGameCompletion.ts', 'src/components/game/HowToPlayPopover.tsx'];
const held = await Promise.all(heldFiles.map(async file => {
  const bytes = await readFile(path.join(root, file));
  return async () => assert.deepEqual(await readFile(path.join(root, file)), bytes, `${file} raw bytes held`);
}));
const boardSource = (await readFile(path.join(root, boardPath), 'utf8')).replace(/\r\n/g, '\n');
const helperSource = (await readFile(path.join(root, helperPath), 'utf8')).replace(/\r\n/g, '\n');
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/three-point-contest-'));
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = controls[control], swaps = {};
    for (const [file, original] of [[boardPath, boardSource], [helperPath, helperSource]]) {
      let changed = original;
      if (file === spec.file) {
        assert.equal(original.split(spec.anchor).length - 1, 1, 'Copied control binds one actual statement');
        changed = original.replace(spec.anchor, spec.replacement);
        assert.notEqual(changed, original, 'Copied control changes actual code');
      }
      if (file === helperPath) changed = changed.replace("from './buzzerBeater';", "from '@/lib/buzzerBeater';");
      const copy = path.join(folder, path.basename(file)); await writeFile(copy, changed); owned.push(copy);
      swaps[file === boardPath ? '@/components/buzzer-beater/BuzzerBeaterBoard' : '@/lib/threePointContest'] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/threePointContest.test.tsx', '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile];
  if (control) args.push('--testNamePattern', controls[control].test + '|' + independent);
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner finishes without termination');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runner faults earn no credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 4); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 2);
    const intended = rows.filter(row => row.title === controls[control].test);
    assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    assert.match(intended[0].failureMessages.join('\n'), /AssertionError:|Error: expect\(element\)\.(?:toHaveTextContent|toHaveAttribute|toHaveFocus|toBeInTheDocument)/, 'Intended assertion rejects the changed binding');
    assert.equal(rows.find(row => row.title === independent)?.status, 'passed', 'Original ten-shot lifecycle stays green');
    console.log(`simThreePointContest ${control}: changed binding fails one intended outcome, original ten-shot baseline passes, two cases skipped.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 4); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simThreePointContest: four actual helper, Board, physics, flight and record lifecycle cases pass.');
    console.log('simThreePointContest: five racks,25 shots and1/2 scoring exercise the original shot engine.');
    console.log('simThreePointContest: contest replay stays unrecorded; original ten-shot modes and daily restoration hold.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of held) await verify();
}
console.log('simThreePointContest: eight runtime inputs held; only owned copies/report removed.');
