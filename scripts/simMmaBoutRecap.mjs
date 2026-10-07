/* Literal recap counters and real saved campaigns. Copied executable faults
   require one named AssertionError and an independent boxing/replay baseline. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const board = 'src/components/fight-promoter/MmaPromotionBoard.tsx';
const recap = 'src/components/fight-promoter/MmaBoutRecap.tsx';
const testFile = 'src/test/mmaBoutRecap.test.tsx';
const cases = {
  totals: 'shows literal asymmetric totals for each saved side without invented counts or seconds',
  rounds: 'selects only actual played rounds and returns to the independent literal totals',
  finish: 'reports the saved title finish winner and exact event bout identity',
  zero: 'keeps real zeros and the early finishing round without filling scheduled rounds',
  fresh: 'opens each actual freshly run card bout and returns focus without another action or award',
  history: 'keeps the selected historical event context while inspecting its actual saved bouts',
  reload: 'reloads the exact receipt rather than persisting local recap or paying another score',
  baseline: 'retains actual engine replay economics and original boxing save independently',
};
const controls = {
  headers: { file: recap, from: '<th scope="col" className="break-words p-2">{aName}</th><th scope="col" className="break-words p-2">{bName}</th>', to: '<th scope="col" className="break-words p-2">{bName}</th><th scope="col" className="break-words p-2">{aName}</th>', test: cases.totals },
  strikes: { file: recap, from: "['strikes', 'Landed strikes', 'strikesA', 'strikesB']", to: "['strikes', 'Landed strikes', 'strikesB', 'strikesA']", test: cases.totals },
  takedowns: { file: recap, from: "['takedowns', 'Takedowns', 'takedownsA', 'takedownsB']", to: "['takedowns', 'Takedowns', 'controlA', 'controlB']", test: cases.totals },
  control: { file: recap, from: "['control', 'Ground control', 'controlA', 'controlB']", to: "['control', 'Ground control', 'takedownsA', 'takedownsB']", test: cases.totals },
  submissions: { file: recap, from: "['submissionAttempts', 'Submission attempts', 'submissionAttemptsA', 'submissionAttemptsB']", to: "['submissionAttempts', 'Submission attempts', 'strikesA', 'strikesB']", test: cases.totals },
  points: { file: recap, from: "['points', 'Round points', 'pointsA', 'pointsB']", to: "['points', 'Round points', 'pointsB', 'pointsA']", test: cases.totals },
  total: { file: recap, from: 'played.reduce((sum, r) => sum + r[key], 0)', to: 'played.slice(0, 1).reduce((sum, r) => sum + r[key], 0)', test: cases.totals },
  round: { file: recap, from: "const played = selectedRound === 'total' ? bout.rounds : bout.rounds.filter(r => r.round === selectedRound);", to: 'const played = bout.rounds;', test: cases.rounds },
  phantom: { file: recap, from: "['total', ...bout.rounds.map(r => r.round)]", to: "['total', ...Array.from({ length: bout.scheduledRounds }, (_, i) => i + 1)]", test: cases.rounds },
  winner: { file: recap, from: '{bout.winnerId === bout.aId ? aName : bName} wins', to: '{bout.winnerId === bout.aId ? bName : aName} wins', test: cases.finish },
  zero: { file: recap, from: 'played.reduce((sum, r) => sum + r[key], 0)', to: 'played.reduce((sum, r) => sum + (r[key] || 1), 0)', test: cases.zero },
  units: { file: recap, from: "{stat === 'control' ? ' units' : ''}", to: "{stat === 'control' ? ' seconds' : ''}", test: cases.totals },
  focus: { file: board, from: 'recapOpeners.current[returnToBout.current]?.focus({ preventScroll: true });', to: 'void recapOpeners.current[returnToBout.current];', test: cases.fresh },
  history: { file: board, from: "const recap = view === 'result' && result && recapIndex !== null ? result.bouts[recapIndex] : null;", to: "const recap = view === 'result' && result && recapIndex !== null ? state!.history[state!.history.length - 1].bouts[recapIndex] : null;", test: cases.history },
  persist: { file: board, from: 'onClick={() => setRecapIndex(i)}>Bout recap</button>', to: 'onClick={() => { setRecapIndex(i); game.openResult(state.history.length - 1); }}>Bout recap</button>', test: cases.reload },
  award: { file: board, from: "useGameCompletion('fight-promoter', !!state?.closed && state.history.length > 0,", to: "useGameCompletion('fight-promoter', (!!state?.closed && state.history.length > 0) || !!recap,", test: cases.fresh },
};
const control = process.env.MMA_BOUT_RECAP_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known MMA bout recap control');
const evidence = path.resolve(process.env.MMA_BOUT_RECAP_ARTIFACTS || path.join(root, 'mma-bout-recap-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root,
      env: { ...process.env, MMA_BOUT_RECAP_CONTROL: name, MMA_BOUT_RECAP_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} MMA bout recap ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simMmaBoutRecap')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert.ok(outcomes.every(row => row.passed), 'Every normal/control run was attempted and must pass');
  console.log(`simMmaBoutRecap all: 8 actual mounted outcomes and ${Object.keys(controls).length} effective controls; independent replay/boxing baseline green in every source copy.`);
  process.exit(0);
}

const verifyBytes = [];
const hashes = {};
for (const relative of [board, recap, 'src/hooks/useMmaPromotion.ts', 'src/lib/mmaPromotion.ts', 'src/lib/fightPromoter.ts', 'src/components/fight-promoter/FightPromoterModes.tsx', testFile]) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  hashes[relative] = createHash('sha256').update(bytes).digest('hex');
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} original bytes held`)));
}
await writeFile(path.join(evidence, `${control || 'normal'}-source-hashes.json`), JSON.stringify(hashes, null, 2));
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
let folder;
try {
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.from).length - 1, 1, `${control} must bind exactly one executable anchor`);
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, `${control} must alter actual code`);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/mma-bout-recap-'));
    const copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ file: spec.file, anchor: spec.from, replacement: spec.to, count: 1, test: spec.test, original: createHash('sha256').update(source).digest('hex'), changed: createHash('sha256').update(changed).digest('hex') }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx$/, '')]: copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.baseline].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Real runner completed without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runner faults cannot earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')); const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 8, 'All eight actual cases were discovered'); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    const target = rows.filter(row => row.title === controls[control].test); assert.equal(target.length, 1);
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 6);
    assert.equal(target[0].status, 'failed'); const failure = target[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
    assert.match(failure, /AssertionError:/, 'Only the mapped AssertionError earns control credit'); assert.doesNotMatch(failure, /TestingLibraryElementError|TypeError:|ReferenceError:/);
    assert.equal(rows.find(row => row.title === cases.baseline)?.status, 'passed', 'Independent actual engine replay/boxing baseline passed');
    console.log(`simMmaBoutRecap ${control}: one changed executable binding rejected by its sole mapped AssertionError; replay/boxing passed; six intentional skips; zero unhandled errors.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 8); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simMmaBoutRecap: eight actual outcomes passed for literal counters, saved played rounds, honest units, title finish, event/history/back focus, quiet reload and unchanged saves.');
  }
} finally {
  if (folder) await rm(folder, { recursive: true, force: true });
  await Promise.all(verifyBytes.map(verify => verify()));
}
console.log('simMmaBoutRecap: seven original runtime inputs held byte identical; reports, hashes and changed-source receipts retained.');
