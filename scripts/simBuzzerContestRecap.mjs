/* Actual contest results and rim-readout outcomes. Copied faults retain their
   changed sources, hashes, reports and independent recorded-mode baseline.
   BUZZER_CONTEST_RECAP_CONTROL=all attempts every gate serially. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '..');
const board = 'src/components/buzzer-beater/BuzzerBeaterBoard.tsx';
const scorecard = 'src/components/buzzer-beater/ContestScorecard.tsx';
const testFile = 'src/test/buzzerContestRecap.test.tsx';
const settled = 'records only landed outcomes through pause help and the exact remaining flight';
const racks = 'revisits every actual rack with distinct outcomes and exact money ball points';
const replay = 'clears all earned balls and rack selection when another contest starts';
const local = 'keeps contest results local across restored daily exit and reentry';
const reduced = 'settles reduced motion once and keeps missed money balls distinct from unused balls';
const blocked = 'does not invent a rim crossing for an actual blocked practice shot';
const low = 'does not invent a rim crossing for a shot that never reaches rim height';
const independent = 'preserves original recorded daily and unlimited engine outcomes independently';
const append = "if (mode === 'contest') setContestOutcomes(previous => [...previous, r.made]);";
const controls = {
  missing: { file: board, from: append, to: 'void mode;', test: settled },
  early: { file: board, from: `launch(() => {\n      ${append}`, to: `${append}\n    launch(() => {`, test: settled },
  duplicate: { file: board, from: 'previous => [...previous, r.made]', to: 'previous => [...previous, r.made, r.made]', test: reduced },
  reset: { file: board, from: 'setContestOutcomes([]);', to: 'void contestOutcomes;', test: replay },
  made: { file: board, from: append, to: "if (mode === 'contest') setContestOutcomes(previous => [...previous, !r.made]);", test: racks },
  missed: { file: scorecard, from: "outcome === false ? 'missed'", to: "false ? 'missed'", test: settled },
  rack: { file: scorecard, from: 'const index = rack * BALLS_PER_RACK + ball;', to: 'const index = ball;', test: racks },
  points: { file: scorecard, from: 'total + contestPoints(rack * BALLS_PER_RACK + ball, made)', to: 'total + Number(made)', test: racks },
  select: { file: scorecard, from: 'onClick={() => setSelectedRack(rack)}', to: 'onClick={() => setSelectedRack(0)}', test: racks },
  name: { file: scorecard, from: "${status === 'in-flight' ? 'in flight' : status}", to: '${"upcoming"}', test: settled },
  symbol: { file: scorecard, from: "`✓${value === 2 ? '2' : ''}`", to: "`•${value === 2 ? '2' : ''}`", test: racks },
  completion: { file: board, from: "isDone && !bookedAlready && (mode === 'daily' || mode === 'unlimited')", to: "isDone && !bookedAlready && mode !== 'practice' && mode !== 'lab'", test: local },
  record: { file: board, from: "phase !== 'done' || mode !== 'daily' || savedRef.current", to: "phase !== 'done' || (mode !== 'daily' && mode !== 'contest') || savedRef.current", test: local },
  blockedDetail: { file: board, from: "result.blocked ? 'Stopped at the defender. No rim crossing.'", to: "false ? 'Stopped at the defender. No rim crossing.'", test: blocked },
  lowDetail: { file: board, from: "result.entryDeg <= 0 ? 'Never reached rim height.' : <>Came in at", to: "false ? 'Never reached rim height.' : <>Came in at", test: low },
  blockedLanding: { file: board, from: '(result && !result.blocked && result.entryDeg > 0)', to: '(result && result.entryDeg > 0)', test: blocked },
  lowLanding: { file: board, from: '(result && !result.blocked && result.entryDeg > 0)', to: '(result && !result.blocked)', test: low },
  blockedWindow: { file: board, from: 'result.depthWindow > 0 && !result.blocked && result.entryDeg > 0', to: 'result.depthWindow > 0 && result.entryDeg > 0', test: blocked },
  flying: { file: board, from: "flying={phase === 'flying'}", to: 'flying={false}', test: settled },
};
const control = process.env.BUZZER_CONTEST_RECAP_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known contest recap control');
const evidence = path.resolve(process.env.BUZZER_CONTEST_RECAP_ARTIFACTS || path.join(root, 'buzzer-contest-recap-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root,
      env: { ...process.env, BUZZER_CONTEST_RECAP_CONTROL: name, BUZZER_CONTEST_RECAP_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} contest recap ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simBuzzerContestRecap')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert.ok(results.every(result => result.passed), 'Every normal and control gate passes; all were attempted');
  console.log(`simBuzzerContestRecap all: eight actual Board outcomes and ${Object.keys(controls).length} effective copied faults pass; every fault preserves one independent recorded-mode baseline.`);
  process.exit(0);
}

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const heldFiles = [board, scorecard, 'src/lib/buzzerBeater.ts', 'src/lib/threePointContest.ts', 'src/lib/arcade.ts',
  'src/hooks/useArcadeFlight.ts', 'src/lib/arcadeRecord.ts', 'src/hooks/useGameCompletion.ts',
  'src/components/game/HowToPlayPopover.tsx', testFile, 'scripts/simBuzzerContestRecap.mjs'];
const before = Object.fromEntries(await Promise.all(heldFiles.map(async file => [file, hash(await readFile(path.join(root, file)))])));
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
let folder;
let copy;
try {
  if (control) {
    const spec = controls[control];
    const original = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    const count = original.split(spec.from).length - 1;
    assert.equal(count, 1, `${control} binds exactly one executable source anchor`);
    const changed = original.replace(spec.from, spec.to);
    assert.notEqual(changed, original, `${control} changes actual code`);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/buzzer-contest-recap-'));
    copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ control, source: spec.file,
      from: spec.from, to: spec.to, anchorCount: count, originalSha256: hash(original), changedSha256: hash(changed), test: spec.test }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx$/, '')]: copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner completed without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime faults earn no control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 8); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 6);
    const intended = rows.filter(row => row.title === controls[control].test);
    assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    const failure = intended[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
    assert.match(failure, /AssertionError:|Error: expect\(element\)/, 'A named outcome assertion rejects the copied fault');
    assert.equal(rows.find(row => row.title === independent)?.status, 'passed', 'Untouched original recorded-mode baseline passes');
    console.log(`simBuzzerContestRecap ${control}: one mapped outcome rejected the effective copied fault; one original-mode baseline passed and six cases were intentionally skipped.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 8); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simBuzzerContestRecap: eight real Board outcomes pass for settled25-shot racks, both money-ball results, replay, local-only records, actual stopped shots and original recorded modes.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  const after = Object.fromEntries(await Promise.all(heldFiles.map(async file => [file, hash(await readFile(path.join(root, file)))])));
  await writeFile(path.join(evidence, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, 'Every production and harness input stays byte-identical');
}
console.log('simBuzzerContestRecap: eleven source hashes held; runtime reports, changed source copies and effective mutation receipts retained.');
