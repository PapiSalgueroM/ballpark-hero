/* Earned practice outcomes and isolated copied-source controls. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url), engine = 'src/lib/cageClash.ts', practice = 'src/lib/cagePractice.ts', hook = 'src/hooks/useCageClash.ts';
const testFile = 'src/test/cagePractice.test.tsx';
const titles = {
  quick: 'keeps every normal seeded quick fight identical to the accepted release',
  rules: 'uses the fight range stamina and cooldown rules with an explicit passive partner',
  idle: 'stays untimed and passive without earning any idle lesson',
  gating: 'filters irrelevant keyboard actions through the lesson engine',
  striking: 'earns three strikes then gates attacks while release recovers actual gas',
  takedown: 'earns takedown lessons only through a clinch and an actual top position',
  submission: 'earns submission lessons with real positional work and full finishing pressure',
  escape: 'earns escape lessons by recovering guard before actually returning to the feet',
  terminal: 'freezes an earned lesson even when its underlying fight is still active',
  score: 'never records saves network activity or points for an actual practice submission',
  progression: 'advances the four drills only after mounted controls earn their objectives',
  lifecycle: 'releases practice controls and pauses help and hidden tabs without replaying input',
  reset: 'clears practice and held controls on retry reset and remount',
  baseline: 'preserves the accepted promotion world independently of practice controls',
};
const controls = {
  quickCpu: { file: engine, from: 'else if (state.tick % 8 === 0) next.cpuInput = cpuIntent(next, input, rng);', to: 'else if (false) next.cpuInput = cpuIntent(next, input, rng);', test: titles.quick },
  range: { file: engine, from: "state.position === 'standing' && Math.abs(attacker.x - target.x) > range", to: 'false', test: titles.rules },
  cooldown: { file: engine, from: "if (!action || action === 'submit' || !canCageAction(state, action, side) || actor.cooldown > 0) return;", to: "if (!action || action === 'submit' || !canCageAction(state, action, side)) return;", test: titles.rules },
  cost: { file: engine, from: '{ jab: 7, power: 14', to: '{ jab: 0, power: 14', test: titles.rules },
  passive: { file: engine, from: 'if (cpuOverride) next.cpuInput = cpuOverride;', to: 'if (cpuOverride) next.cpuInput = cpuIntent(next, input, rng);', test: titles.idle },
  timer: { file: practice, from: '{ ...state.fight, remainingTicks: CAGE_ROUND_TICKS }', to: 'state.fight', test: titles.idle },
  idleEarned: { file: practice, from: 'fight.player.hits >= 3 && fight.player.stamina >= 90', to: 'fight.player.hits >= 0 && fight.player.stamina >= 90', test: titles.idle },
  actionFilter: { file: practice, from: 'const action = input.action && canCagePracticeAction(state, input.action) ? input.action : null;', to: 'const action = input.action;', test: titles.gating },
  strikingGate: { file: practice, from: 'state.fight.player.hits < 3 &&', to: 'state.fight.player.hits < 999 &&', test: titles.striking },
  recoveryEarned: { file: practice, from: 'fight.player.hits >= 3 && fight.player.stamina >= 90', to: 'fight.player.hits >= 3 && fight.player.stamina >= 0', test: titles.striking },
  takedownEarned: { file: practice, from: "fight.player.takedowns > 0 && fight.position === 'ground' && fight.top === 'player'", to: "fight.position === 'clinch'", test: titles.takedown },
  submissionEarned: { file: practice, from: "fight.result?.winner === 'player' && fight.result.method === 'Submission'", to: 'fight.player.submission >= 1', test: titles.submission },
  guardEarned: { file: practice, from: 'fight.groundLevel === 0', to: 'fight.groundLevel <= 1', test: titles.escape },
  terminal: { file: practice, from: "if (state.complete || state.fight.phase === 'finished') return state;", to: "if (state.fight.phase === 'finished') return state;", test: titles.terminal },
  score: { file: hook, from: 'const finalScore = !practice && fight ? circuit ? cageCircuitScore(circuit) : cageClashScore(fight) : 0;', to: 'const finalScore = fight ? circuit ? cageCircuitScore(circuit) : cageClashScore(fight) : 0;', test: titles.score },
  completion: { file: hook, from: "const isComplete = !practice && (circuit ? isCageCircuitComplete(circuit) : fight?.phase === 'finished');", to: "const isComplete = circuit ? isCageCircuitComplete(circuit) : fight?.phase === 'finished';", test: titles.score },
  quickClear: { file: hook, from: "practiceRef.current = null;\n    setPractice(null);\n    const next = createCageFight(style, opponent, crypto.getRandomValues(new Uint32Array(1))[0]);", to: 'const next = createCageFight(style, opponent, crypto.getRandomValues(new Uint32Array(1))[0]);', test: titles.score },
  nextUnearned: { file: hook, from: 'if (!lesson?.complete) return;', to: 'if (!lesson) return;', test: titles.progression },
  nextOrder: { file: practice, from: 'CAGE_DRILLS.findIndex(item => item.id === drill) + 1', to: 'CAGE_DRILLS.findIndex(item => item.id === drill)', test: titles.progression },
  pausedPractice: { file: hook, from: "!practiceRef.current?.complete && !pausedRef.current && !helpRef.current && !document.hidden && current?.phase === 'fight'", to: "!practiceRef.current?.complete && (practiceRef.current || (!pausedRef.current && !helpRef.current && !document.hidden)) && current?.phase === 'fight'", test: titles.lifecycle },
  retryInput: { file: hook, from: 'const startPractice = useCallback((drill: CageDrill, style: CageStyle) => {\n    clearInput();', to: 'const startPractice = useCallback((drill: CageDrill, style: CageStyle) => {', test: titles.reset },
  resetPractice: { file: hook, from: 'practiceRef.current = null;\n    setPractice(null);\n    fightRef.current = null;', to: 'fightRef.current = null;', test: titles.reset },
};
const mode = process.env.CAGE_PRACTICE_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known Cage Practice control');
const evidence = path.resolve(process.env.CAGE_PRACTICE_ARTIFACTS || path.join(root, 'cage-practice-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const results = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_PRACTICE_CONTROL: control, CAGE_PRACTICE_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Practice ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => /simCagePractice/.test(line)).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'Every real outcome and effective control ran successfully');
  console.log(`simCagePractice: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [engine, practice, hook, testFile]) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} source bytes unchanged`)));
}
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-practice-'));
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const spec = controls[mode], source = (await readFile(path.join(root, spec.file), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(source.split(spec.from).length - 1, 1, 'Control binds one exact executable source anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Control changes actual executable code');
    const aliases = {};
    // Keep the wrapper's relative engine import and the test's direct engine import together.
    const files = spec.file === hook ? [hook] : [engine, practice];
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
  console.log(`simCagePractice ${mode || 'normal'}: exact outcome assertions and independent promotion baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-practice-'));
  await rm(folder, { recursive: true, force: true });
  for (const verify of held) await verify();
}
