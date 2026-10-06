/* Actual circuit combat and completion, with effective copied-source controls. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url), engine = 'src/lib/cageClash.ts', circuit = 'src/lib/cageCircuit.ts', hook = 'src/hooks/useCageClash.ts';
const testFile = 'src/test/cageCircuit.test.tsx';
const titles = {
  world: 'uses the fixed opponent order and refreshes combat with wrapped stage seeds',
  combat: 'matches every standalone combat step and reaches all three real opponents across paired seeds',
  record: 'records actual finishes once and freezes finished combat without changing prior results',
  advance: 'rejects advancing live rounds breaks losses draws and the final win',
  score: 'scores only terminal runs with three fixed slots including unplayed opponents',
  completion: 'earns three keyboard wins with fresh next fights and records only the final circuit score',
  loss: 'ends a real first-fight loss once without offering or starting another opponent',
  abandon: 'abandons an intermediate earned win without points or restored progress',
  modes: 'switches between circuit accepted quick combat and unscored practice without stale mode state',
  lifecycle: 'keeps the circuit clock synchronized through released inputs help pause and cleanup',
  baseline: 'preserves the accepted promotion world independently of circuit mutations',
};
const completionAnchor = "const isComplete = !practice && (circuit ? isCageCircuitComplete(circuit) : fight?.phase === 'finished');";
const controls = {
  order: { file: circuit, from: "['balanced', 'striker', 'grappler']", to: "['balanced', 'grappler', 'striker']", test: titles.world },
  stageSeed: { file: circuit, from: '(state.seed + stage) >>> 0', to: 'state.seed >>> 0', test: titles.world },
  freshFight: { file: circuit, from: 'createCageFight(state.fight.player.style, CAGE_CIRCUIT_STYLES[stage], (state.seed + stage) >>> 0)', to: "{ ...state.fight, phase: 'fight', result: null }", test: titles.world },
  combat: { file: circuit, from: 'const fight = stepCageFight(state.fight, input);', to: 'const fight = stepCageFight(state.fight, { move: 0, guard: false, action: null });', test: titles.combat },
  result: { file: circuit, from: 'fight.result ? [...state.results, { ...fight.result }] : state.results', to: 'state.results', test: titles.record },
  repeatedResult: { file: circuit, from: "if (state.fight.phase !== 'fight') return state;", to: "if (state.fight.phase === 'break') return state;", test: titles.record },
  liveAdvance: { file: circuit, from: "if (state.fight.phase !== 'finished' || state.fight.result?.winner !== 'player'", to: 'if (false', test: titles.advance },
  lossAdvance: { file: circuit, from: "state.fight.result?.winner !== 'player'", to: 'false', test: titles.advance },
  finalAdvance: { file: circuit, from: 'state.stage >= CAGE_CIRCUIT_STYLES.length - 1', to: 'state.stage > CAGE_CIRCUIT_STYLES.length - 1', test: titles.advance },
  lossTerminal: { file: circuit, from: "state.fight.result!.winner !== 'player'", to: "state.fight.result!.winner === 'player'", test: titles.advance },
  intermediateScore: { file: circuit, from: 'return isCageCircuitComplete(state) ?', to: 'return true ?', test: titles.score },
  scoreSlots: { file: circuit, from: '/ CAGE_CIRCUIT_STYLES.length)', to: '/ state.results.length)', test: titles.score },
  scoreRounding: { file: circuit, from: 'Math.round(state.results.reduce(', to: 'Math.floor(state.results.reduce(', test: titles.score },
  intermediateCompletion: { file: hook, from: completionAnchor, to: "const isComplete = !practice && fight?.phase === 'finished';", test: titles.completion },
  circuitScore: { file: hook, from: 'circuit ? cageCircuitScore(circuit) : cageClashScore(fight)', to: 'cageClashScore(fight)', test: titles.completion },
  nextRef: { file: hook, from: 'const next = advanceCageCircuit(current);\n    if (next === current) return;\n    clearInput();\n    circuitRef.current = next;', to: 'const next = advanceCageCircuit(current);\n    if (next === current) return;\n    clearInput();\n    void next;', test: titles.completion },
  lossCompletion: { file: hook, from: completionAnchor, to: "const isComplete = !practice && (circuit ? isCageCircuitComplete(circuit) && fight?.result?.winner === 'player' : fight?.phase === 'finished');", test: titles.loss },
  reset: { file: hook, from: 'const reset = useCallback(() => {\n    clearInput();\n    circuitRef.current = null;\n    setCircuit(null);', to: 'const reset = useCallback(() => {\n    clearInput();', test: titles.abandon },
  quickClear: { file: hook, from: 'const start = useCallback((style: CageStyle, opponent: CageStyle) => {\n    clearInput();\n    circuitRef.current = null;\n    setCircuit(null);', to: 'const start = useCallback((style: CageStyle, opponent: CageStyle) => {\n    clearInput();', test: titles.modes },
  practiceClear: { file: hook, from: 'const startPractice = useCallback((drill: CageDrill, style: CageStyle) => {\n    clearInput();\n    circuitRef.current = null;\n    setCircuit(null);', to: 'const startPractice = useCallback((drill: CageDrill, style: CageStyle) => {\n    clearInput();', test: titles.modes },
  circuitClear: { file: hook, from: 'const startCircuit = useCallback((style: CageStyle) => {\n    clearInput();\n    practiceRef.current = null;\n    setPractice(null);', to: 'const startCircuit = useCallback((style: CageStyle) => {\n    clearInput();', test: titles.modes },
  hudSync: { file: hook, from: 'setFight(next);\n          setPractice(practiceRef.current);\n          setCircuit(circuitRef.current);', to: 'setFight(next);\n          setPractice(practiceRef.current);', test: titles.lifecycle },
};
const mode = process.env.CAGE_CIRCUIT_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known Cage Circuit control');
const evidence = path.resolve(process.env.CAGE_CIRCUIT_ARTIFACTS || path.join(root, 'cage-circuit-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const results = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_CIRCUIT_CONTROL: control, CAGE_CIRCUIT_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Circuit ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => /simCageCircuit|Cage Circuit paired runs/.test(line)).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'Every real outcome and effective control ran successfully');
  console.log(`simCageCircuit: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [engine, circuit, hook, testFile]) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} source bytes unchanged`)));
}
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-circuit-'));
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const spec = controls[mode], source = (await readFile(path.join(root, spec.file), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(source.split(spec.from).length - 1, 1, 'Control binds one exact executable source anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Control changes actual executable code');
    const aliases = {};
    const files = spec.file === hook ? [hook] : [engine, circuit];
    for (const original of files) {
      const file = path.join(folder, path.basename(original));
      await writeFile(file, original === spec.file ? changed : (await readFile(path.join(root, original), 'utf8')).replaceAll('\r\n', '\n'));
      aliases['@/' + original.slice(4).replace(/\.tsx?$/, '')] = file;
    }
    await writeFile(path.join(evidence, `${mode}-changed-source.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const reportFile = path.join(evidence, `${mode || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (mode) args.push('--testNamePattern', [controls[mode].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${mode || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'The bounded outcome process finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module|not wrapped in act/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(result => result.assertionResults);
  assert.equal(rows.length, Object.keys(titles).length); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (mode) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[mode].test]);
    assert.deepEqual(passed.map(row => row.title), [titles.baseline]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, Object.keys(titles).length - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n');
    assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0);
    assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simCageCircuit ${mode || 'normal'}: exact outcome assertions and independent promotion baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-circuit-'));
  await rm(folder, { recursive: true, force: true });
  for (const verify of held) await verify();
}
