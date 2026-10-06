/* Actual combat and controller outcomes with effective copied-source controls. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url), engine = 'src/lib/cageClash.ts', hook = 'src/hooks/useCageClash.ts';
const testFile = 'src/test/cageClash.test.tsx';
const titles = {
  seeded: 'replays the same seeded input sequence without mutating its starting fight',
  range: 'requires actual strike range and keeps movement inside the cage without overlapping fighters',
  guard: 'guard reduces the same landed strike and charges the defending fighter stamina',
  cooldown: 'held strikes respect the actual cooldown and charge once per accepted attack',
  stamina: 'insufficient stamina rejects attacks and low stamina weakens a same seed landed hit',
  clinch: 'requires close range to clinch before attempting a takedown',
  takedown: 'earned takedowns establish a real top position and positional control',
  ground: 'top position posture passing and bottom restrictions change actual ground combat',
  submission: 'a held submission spends stamina builds visible progress and wins only at full pressure',
  resistance: 'guard and escape resistance reduce real opposing submission pressure',
  escape: 'a legal escape can return to standing and clears ground pressure and posture',
  decision: 'round breaks wait for input and decisions count all three earned round cards',
  terminal: 'a knockout is terminal and repeated steps or round continuation cannot pay or mutate again',
  score: 'legacy points use literal earned outcome damage defense and control weights',
  strategy: 'active range and stamina management outperforms blank input across paired seeded opponents',
  clock: 'steps real combat at 20Hz discards long frame gaps and cleans up its only clock',
  release: 'releases keyboard and pointer movement and cancels held actions without stale input',
  pause: 'pauses on blur and hidden pages then resumes CPU combat with no held movement',
  help: 'keeps help paused until explicit resume and ignores combat keys on form controls',
  completion: 'records exactly one actual finish and keeps its score after repeated frames and actions',
  quit: 'never awards an abandoned fight or restores combat after a remount',
  baseline: 'preserves the accepted promotion world and unrelated save bytes',
};
const controls = {
  seeded: { file: engine, from: 'const rng = random(next.seed + next.tick * 7919);', to: 'const rng = random(1);', test: titles.seeded },
  range: { file: engine, from: "state.position === 'standing' && Math.abs(attacker.x - target.x) > range", to: 'false', test: titles.range },
  guard: { file: engine, from: 'damage *= .3;', to: 'damage *= 1;', test: titles.guard },
  cooldown: { file: engine, from: "if (!action || action === 'submit' || !canCageAction(state, action, side) || actor.cooldown > 0) return;", to: "if (!action || action === 'submit' || !canCageAction(state, action, side)) return;", test: titles.cooldown },
  stamina: { file: engine, from: 'if (actor.stamina < cost) return;', to: 'if (false) return;', test: titles.stamina },
  staminaDamage: { file: engine, from: 'const staminaFactor = .45 + .55 * attacker.stamina / 100;', to: 'const staminaFactor = 1;', test: titles.stamina },
  recovery: { file: engine, from: "const gain = input.action === 'submit' ? 0 : input.guard ? .1 : resting ? .65 : .25;", to: "const gain = input.action === 'submit' ? 0 : input.guard ? .1 : resting ? 0 : .25;", test: titles.stamina },
  clinch: { file: engine, from: "state.position = 'clinch';", to: "state.position = 'standing';", test: titles.clinch },
  takedown: { file: engine, from: 'actor.takedowns += 1;', to: 'actor.takedowns += 0;', test: titles.takedown },
  controlTime: { file: engine, from: 'next[next.top].controlTicks += 1;', to: 'next[next.top].controlTicks += 0;', test: titles.takedown },
  pass: { file: engine, from: 'state.groundLevel = Math.min(2, state.groundLevel + 1) as 0 | 1 | 2;', to: 'state.groundLevel = state.groundLevel;', test: titles.ground },
  posture: { file: engine, from: 'actor.posture = !actor.posture;', to: 'actor.posture = actor.posture;', test: titles.ground },
  submissionProgress: { file: engine, from: 'actor.submission + progress -', to: 'actor.submission + progress * .5 -', test: titles.submission },
  submissionFinish: { file: engine, from: "if (actor.submission === 100) finish(state, side, 'Submission');", to: "if (actor.submission >= 50) finish(state, side, 'Submission');", test: titles.submission },
  resistance: { file: engine, from: 'const defenseFactor = guardActive(target, defense) ? 1 - .65 * target.stamina / 100 : 1;', to: 'const defenseFactor = 1;', test: titles.resistance },
  escape: { file: engine, from: "if (rng() < clamp(chance, .12, .9)) { stand(state);", to: 'if (false) { stand(state);', test: titles.escape },
  decision: { file: engine, from: 'if (next.remainingTicks === 0) roundCard(next);', to: 'if (false) roundCard(next);', test: titles.decision },
  terminal: { file: engine, from: "if (state.phase !== 'fight') return state;", to: "if (state.phase === 'break') return state;", test: titles.terminal },
  score: { file: engine, from: "const outcome = winner === 'player' ? 50 : winner === 'draw' ? 25 : 0;", to: "const outcome = winner === 'player' ? 0 : winner === 'draw' ? 25 : 0;", test: titles.score },
  strategy: { file: engine, from: 'const action = input.action, actor = state[side], target = state[opposite(side)];', to: "const action = side === 'player' ? null : input.action, actor = state[side], target = state[opposite(side)];", test: titles.strategy },
  clock: { file: hook, from: 'clock.debt += elapsed > 150 ? 0 : elapsed;', to: 'clock.debt += elapsed;', test: titles.clock },
  keyRelease: { file: hook, from: 'release(`key:${key}`);', to: 'void key;', test: titles.release },
  pointerCancel: { file: hook, from: "window.addEventListener('pointercancel', pointerUp);", to: 'void pointerUp;', test: titles.release },
  blur: { file: hook, from: "window.addEventListener('blur', pause);", to: 'void pause;', test: titles.pause },
  hidden: { file: hook, from: 'const hidden = () => { if (document.hidden) pause(); };', to: 'const hidden = () => {};', test: titles.pause },
  help: { file: hook, from: 'useEffect(() => { if (helpOpen) pause(); }, [helpOpen, pause]);', to: 'useEffect(() => {}, [helpOpen, pause]);', test: titles.help },
  completion: { file: hook, from: "useGameCompletion('cage-clash', isComplete, finalScore);", to: "useGameCompletion('cage-clash', false, finalScore);", test: titles.completion },
  quitAward: { file: hook, from: "useGameCompletion('cage-clash', isComplete, finalScore);", to: "useGameCompletion('cage-clash', isComplete || fight === null, finalScore);", test: titles.quit },
};
const mode = process.env.CAGE_CLASH_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known Cage Clash control');
const evidence = path.resolve(process.env.CAGE_CLASH_ARTIFACTS || path.join(root, 'cage-clash-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const modes = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_CLASH_CONTROL: control, CAGE_CLASH_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    modes.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Clash ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => /simCageClash|Cage strategy/.test(line)).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(modes, null, 2));
  assert(modes.every(row => row.passed), 'Every real outcome and effective control ran successfully');
  console.log(`simCageClash: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = await Promise.all([engine, hook, testFile].map(async file => [file, await readFile(path.join(root, file))]));
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-clash-'));
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const spec = controls[mode], source = (await readFile(path.join(root, spec.file), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(source.split(spec.from).length - 1, 1, 'Control binds one exact executable source anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Control changes actual executable code');
    const file = path.join(folder, path.basename(spec.file)); await writeFile(file, changed);
    await writeFile(path.join(evidence, `${mode}-changed-source.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: file });
  }
  const reportFile = path.join(evidence, `${mode || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (mode) args.push('--testNamePattern', [controls[mode].test, titles.baseline].map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
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
  console.log(`simCageClash ${mode || 'normal'}: exact outcome assertions and independent promotion baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-clash-'));
  await rm(folder, { recursive: true, force: true });
  for (const [file, original] of held) assert.deepEqual(await readFile(path.join(root, file)), original, `${file} source bytes unchanged`);
}
