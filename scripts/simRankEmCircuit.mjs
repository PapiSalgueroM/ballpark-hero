/* Actual circuit outcomes and copied-code rejection controls. Runs offline. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helper = 'src/lib/rankEmCircuit.ts';
const page = 'src/pages/RankEm.tsx';
const testFile = 'src/test/rankEmCircuit.test.tsx';
const deal = 'deals one completed-career board per sport without exposing the pinned daily';
const score = 'scores actual placements across three explicit reveals with finite advancement';
const baseline = 'preserves the original daily score save and single completion independently';
const controls = {
  daily: { file: helper, from: 'id === dailyId ||', to: 'false ||', test: deal },
  family: { file: helper, from: "id === 'mlb-sb-circuit' && dailyId === 'mlb-sb'", to: 'false', test: deal },
  data: { file: helper, from: "{ name: 'Kenny Lofton', value: 622 }", to: "{ name: 'Kenny Lofton', value: 623 }", test: deal },
  score: { file: helper, from: 'sum + (order ? scoreRankGuess(order, circuitRound(state, index)) : 0)', to: 'sum + (order ? 5 : 0)', test: score },
  advance: { file: helper, from: "if (state.phase !== 'reveal') return state;", to: "if (state.phase === 'done') return state;", test: score },
  lock: { file: helper, from: "state.phase !== 'playing' || draft.length !== 5 ||", to: "state.phase !== 'playing' ||", test: 'keeps editing quiet and locks exactly one valid permutation' },
  version: { file: helper, from: '|| value.v !== 1', to: '|| false', test: 'rejects unreachable phases tampered orders invalid seeds and foreign names' },
  save: { file: helper, from: 'localStorage.setItem(CIRCUIT_SAVE_KEY, JSON.stringify(state));', to: 'void state;', test: 'round trips every reached phase without changing the saved deal at midnight' },
  quota: { file: helper, from: 'return true; } catch { return false; }', to: 'return true; } catch { return true; }', test: 'handles unavailable storage without writing partial or invalid state' },
  help: { file: page, from: 'For example, totals of 30, 20 and 10 belong in that order. Swapping the first two leaves only the last player in the right place. These example numbers are not player statistics.', to: 'Rank the players and continue.', test: 'shows worked instructions before play and safely reopens circuit rules' },
  values: { file: page, from: '{item.value.toLocaleString()}', to: '{(item.value + 1).toLocaleString()}', test: 'retains factual reveals and earns eight of fifteen through the actual page' },
  completion: { file: page, from: "useGameCompletion('rank-em', rawDailyStatus !== 'playing',", to: "useGameCompletion('rank-em', rawDailyStatus !== 'playing' || isCircuit && circuit.phase === 'done',", test: 'retains factual reveals and earns eight of fifteen through the actual page' },
  draft: { file: page, from: 'storeCircuit(editCircuit(circuitRef.current, order));', to: 'void order;', test: 'restores a partial draft a reveal and a finished result through real remounts' },
  replay: { file: page, from: 'storeCircuit(startCircuit(next));', to: 'storeCircuit(state);', test: 'reviews completed sports and replays without inheriting points or answers' },
};
const control = process.env.RANK_CIRCUIT_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known circuit control');
const evidence = path.resolve(process.env.RANK_CIRCUIT_ARTIFACTS || path.join(root, 'rank-em-circuit-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const summary = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: root,
      env: { ...process.env, RANK_CIRCUIT_CONTROL: name, RANK_CIRCUIT_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 24 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    summary.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Rank circuit ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simRankEmCircuit')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
  assert.ok(summary.every(row => row.passed), 'All normal and control outcomes must pass');
  console.log(`simRankEmCircuit all: 14 normal outcomes and ${Object.keys(controls).length} effective controls accepted.`);
  process.exit(0);
}
const heldFiles = [helper, page, testFile, 'src/pages/RankEmOrder.module.css', 'src/lib/orderTheList.ts', 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts'];
const held = await Promise.all(heldFiles.map(async file => ({ file, bytes: await readFile(path.join(root, file)) })));
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP; delete env.NO_COLOR;
const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
let folder, copy;
try {
  if (control) {
    const spec = controls[control], source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.from).length - 1, 1, `${control} has exactly one executable anchor`);
    let changed = source.replace(spec.from, spec.to);
    assert.notEqual(changed, source);
    if (spec.file === page) changed = changed.replace("from './RankEmOrder.module.css'", "from '@/pages/RankEmOrder.module.css'");
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/rank-circuit-'));
    copy = path.join(folder, path.basename(spec.file));
    await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, baseline].join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 24 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Runner completed normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'No runner fault earns control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 14); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 12);
    const row = rows.find(row => row.title === controls[control].test);
    assert.equal(row?.status, 'failed');
    assert.match(row.failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, ''), /AssertionError:|Error: expect\(element\)/, 'Intended outcome assertion rejects the mutation');
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed');
    console.log(`simRankEmCircuit ${control}: one intended assertion fails, independent Daily baseline passes, twelve intentional skips.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 14); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simRankEmCircuit: fourteen actual model and mounted outcomes pass.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  for (const item of held) assert.deepEqual(await readFile(path.join(root, item.file)), item.bytes, `${item.file} bytes held`);
}
console.log('simRankEmCircuit: seven source inputs held; reports and mutated copies retained.');
