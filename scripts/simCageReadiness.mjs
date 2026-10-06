/* Actual action hints and prior-engine equivalence with copied-source controls. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), self = fileURLToPath(import.meta.url);
const engine = 'src/lib/cageClash.ts', board = 'src/components/cage-clash/CageClashBoard.tsx';
const canvas = 'src/components/cage-clash/CageClashCanvas.tsx', stats = 'src/components/cage-clash/CageFightStats.tsx';
const testFile = 'src/test/cageReadiness.test.tsx';
const titles = {
  cost: 'reports literal contextual costs including each sides first and continuing submission',
  priority: 'prioritizes legal position before gas cooldown and range for either corner',
  range: 'matches strike and clinch reach at literal standing edges without applying range on the mat',
  recovery: 'matches exact gas and cooldown recovery with actual attacks on the following tick',
  equivalence: 'keeps every seeded combat state identical to the accepted engine before helper extraction',
  descriptions: 'describes all six real action buttons with visible hints and unchanged accessible names',
  held: 'keeps a held button active through recovering hints and lands the next actual strike',
  overrides: 'shows drill restrictions and paused hints before ordinary readiness without advancing play',
  readonly: 'calculates repeated hints without editing resources scores or either fighter',
  baseline: 'preserves the accepted promotion world independently of readiness changes',
};
const controls = {
  groundCost: { file: engine, from: "return state.position === 'ground' && action === 'kick' ? 8 : CAGE_ACTION_COSTS[action];", to: "return state.position === 'ground' && action === 'kick' ? 16 : CAGE_ACTION_COSTS[action];", test: titles.cost },
  submissionCost: { file: engine, from: "if (action === 'submit') return state[side].submission === 0 ? CAGE_ACTION_COSTS.submit + .8 : .8;", to: "if (action === 'submit') return state[side].submission === 0 ? CAGE_ACTION_COSTS.submit : .8;", test: titles.cost },
  kickRange: { file: engine, from: "return action === 'kick' ? 20 : action === 'power' ? 12 : action === 'jab' ? 10 : action === 'grapple' ? 9 : Infinity;", to: "return action === 'kick' ? 19 : action === 'power' ? 12 : action === 'jab' ? 10 : action === 'grapple' ? 9 : Infinity;", test: titles.range },
  grappleRange: { file: engine, from: "return action === 'kick' ? 20 : action === 'power' ? 12 : action === 'jab' ? 10 : action === 'grapple' ? 9 : Infinity;", to: "return action === 'kick' ? 20 : action === 'power' ? 12 : action === 'jab' ? 10 : action === 'grapple' ? 10 : Infinity;", test: titles.range },
  legal: { file: engine, from: "if (!canCageAction(state, action, side)) return 'Unavailable';", to: "if (false) return 'Unavailable';", test: titles.priority },
  gasEdge: { file: engine, from: "if (state[side].stamina < cageActionCost(state, action, side)) return 'Recover gas';", to: "if (state[side].stamina <= cageActionCost(state, action, side)) return 'Recover gas';", test: titles.recovery },
  cooldown: { file: engine, from: "if (state[side].cooldown > 0) return 'Recovering';", to: "if (state[side].cooldown > 1) return 'Recovering';", test: titles.recovery },
  distance: { file: engine, from: "if (state.position === 'standing' && Math.abs(state[side].x - state[opposite(side)].x) > cageActionRange(action)) return 'Move closer';", to: "if (false) return 'Move closer';", test: titles.range },
  readonly: { file: engine, from: "export function cageActionReadiness(state: CageFight, action: CageAction, side: CageSide = 'player'): CageActionReadiness {", to: "export function cageActionReadiness(state: CageFight, action: CageAction, side: CageSide = 'player'): CageActionReadiness { state.tick += 1;", test: titles.readonly },
  description: { file: board, from: 'aria-describedby={descriptionId}', to: 'aria-describedby={undefined}', test: titles.descriptions },
  held: { file: board, from: 'disabled={!running || !canCageAction(fight, action) || Boolean(practice && !canCagePracticeAction(practice, action))}', to: "disabled={!running || hint !== 'Ready' || !canCageAction(fight, action) || Boolean(practice && !canCagePracticeAction(practice, action))}", test: titles.held },
  drill: { file: board, from: "const hint = practice && !canCagePracticeAction(practice, action) ? 'Not in drill'", to: "const hint = false ? 'Not in drill'", test: titles.overrides },
  paused: { file: board, from: "paused || helpOpen ? 'Paused' : cageActionReadiness(fight, action)", to: "false ? 'Paused' : cageActionReadiness(fight, action)", test: titles.overrides },
  equivalence: { file: engine, from: 'export const CAGE_ACTION_COSTS: Record<CageAction, number> = { jab: 7, power: 14, kick: 16, grapple: 12, submit: 12, escape: 10 };', to: 'export const CAGE_ACTION_COSTS: Record<CageAction, number> = { jab: 0, power: 14, kick: 16, grapple: 12, submit: 12, escape: 10 };', test: titles.equivalence },
};
const mode = process.env.CAGE_READINESS_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known Cage Readiness control');
const evidence = path.resolve(process.env.CAGE_READINESS_ARTIFACTS || path.join(root, 'cage-readiness-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const results = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_READINESS_CONTROL: control, CAGE_READINESS_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal; results.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Readiness ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCageReadiness')).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'Every action hint outcome and effective control ran successfully');
  console.log(`simCageReadiness: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`); process.exit(0);
}
const held = [];
for (const relative of [engine, board, canvas, stats, 'src/hooks/useCageClash.ts', 'src/lib/cagePractice.ts', 'src/lib/cageCircuit.ts', testFile]) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} source bytes unchanged`)));
}
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-readiness-'));
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP; delete env.CAGE_READINESS_ENGINE_SOURCE;
  if (mode) {
    const spec = controls[mode], source = (await readFile(path.join(root, spec.file), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(source.split(spec.from).length - 1, 1, 'Control binds one exact executable source anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Control changes actual executable code');
    const target = path.join(folder, path.basename(spec.file)); await writeFile(target, changed);
    const aliases = { ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: target };
    if (spec.file === board) for (const sibling of [canvas, stats]) {
      const file = path.join(folder, path.basename(sibling)); await writeFile(file, (await readFile(path.join(root, sibling), 'utf8')).replaceAll('\r\n', '\n'));
      aliases['@/' + sibling.slice(4).replace(/\.tsx?$/, '')] = file;
    }
    if (spec.file === engine) env.CAGE_READINESS_ENGINE_SOURCE = target;
    await writeFile(path.join(evidence, `${mode}-changed-source.txt`), changed); env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const reportFile = path.join(evidence, `${mode || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (mode) args.push('--testNamePattern', [controls[mode].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${mode || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'The bounded readiness process finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module|not wrapped in act/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(result => result.assertionResults);
  assert.equal(rows.length, Object.keys(titles).length); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (mode) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[mode].test]);
    assert.deepEqual(passed.map(row => row.title), [titles.baseline]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, Object.keys(titles).length - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n'); assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else { assert.equal(run.status, 0); assert.equal(failed.length, 0); assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles))); }
  console.log(`simCageReadiness ${mode || 'normal'}: actual readiness outcomes and independent promotion baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-readiness-'));
  await rm(folder, { recursive: true, force: true }); for (const verify of held) await verify();
}
