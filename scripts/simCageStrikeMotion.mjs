/* Actual canvas footprints with effective controls on copied painter source. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), self = fileURLToPath(import.meta.url);
const painter = 'src/components/cage-clash/CageClashCanvas.tsx', testFile = 'src/test/cageStrikeMotion.test.tsx';
const titles = {
  jab: 'draws a tucked jab windup an extended contact and a returning glove',
  arcs: 'draws distinct heavy and kick arcs while a clinch knee stays bent',
  mirror: 'mirrors both corners toward their opponent even after they cross sides',
  ground: 'draws downward top strikes and upward bottom strikes through all three stages',
  motion: 'cycles normal idle and walking but keeps reduced motion and guard poses static',
  readonly: 'paints repeated live poses without advancing or editing any fight state',
  baseline: 'preserves the original empty arena floor rails and corner labels independently of strike poses',
};
const controls = {
  jab: { from: '[[7, -42], [27, -40], [15, -41]][strikeStage]', to: '[[7, -42], [27, -40], [15, -41]][1]', test: titles.jab },
  heavy: { from: '[[-14, -29, -13, -44], [16, -27, 22, -43], [10, -27, 8, -36]][strikeStage]', to: '[[-14, -29, -13, -44], [16, -27, 22, -43], [10, -27, 8, -36]][1]', test: titles.arcs },
  kick: { from: '[[9, -29, 9, -19], [17, -26, 30, -26], [13, -22, 18, -13]]', to: '[[9, -29, 9, -19], [17, -26, 18, -26], [13, -22, 18, -13]]', test: titles.arcs },
  knee: { from: '[[13, -22, 8, -13], [20, -31, 14, -22], [11, -23, 7, -12]]', to: '[[9, -29, 9, -19], [17, -26, 30, -26], [13, -22, 18, -13]]', test: titles.arcs },
  mirror: { from: 'ctx.scale(facing, 1);', to: 'ctx.scale(1, 1);', test: titles.mirror },
  topJab: { from: '[[5, y - 8], [12, y + 12], [7, y + 3]][strikeStage]', to: '[[5, y - 8], [12, y + 12], [7, y + 3]][1]', test: titles.ground },
  topPower: { from: '[[6, y - 20], [13, y + 19], [8, y - 6]][strikeStage]', to: '[[6, y - 20], [13, y - 20], [8, y - 6]][strikeStage]', test: titles.ground },
  bottomJab: { from: '[[4, y - 8], [12, y - 22], [9, y - 14]][strikeStage]', to: '[[4, y - 8], [12, y - 8], [9, y - 14]][strikeStage]', test: titles.ground },
  reduced: { from: 'const strikeStage = reduced ? 1 :', to: 'const strikeStage = false ? 1 :', test: titles.motion },
  stride: { from: "const stride = !reduced && pose === 'move'", to: "const stride = pose === 'move'", test: titles.motion },
  idle: { from: "const bob = !reduced && !active && state?.phase === 'fight' ? Math.floor(state.tick / 6) % 2 : 0;", to: 'const bob = 0;', test: titles.motion },
  guard: { from: 'rect(6, -49 + y, 8, 9, color);', to: 'rect(6, -40 + y, 8, 9, color);', test: titles.motion },
  readonly: { from: 'const active = !!f && f.actionTicks > 0;', to: 'if (f) f.cooldown += 1; const active = !!f && f.actionTicks > 0;', test: titles.readonly },
  arena: { from: "rect(0, 0, 320, 180, '#0c1427');", to: "rect(0, 0, 319, 180, '#0c1427');", test: titles.baseline, baseline: titles.readonly },
};
const mode = process.env.CAGE_STRIKE_MOTION_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known Cage Strike Motion control');
const evidence = path.resolve(process.env.CAGE_STRIKE_MOTION_ARTIFACTS || path.join(root, 'cage-strike-motion-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const results = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_STRIKE_MOTION_CONTROL: control, CAGE_STRIKE_MOTION_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Strike Motion ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCageStrikeMotion')).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'Every painter outcome and effective control ran successfully');
  console.log(`simCageStrikeMotion: ${Object.keys(titles).length} actual painter outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [painter, testFile, 'src/lib/cageClash.ts', 'src/lib/cagePractice.ts', 'src/lib/cageCircuit.ts', 'src/hooks/useCageClash.ts']) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} source bytes unchanged`)));
}
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-strike-motion-'));
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const spec = controls[mode], source = (await readFile(path.join(root, painter), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(source.split(spec.from).length - 1, 1, 'Control binds one exact executable painter anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Control changes actual executable source');
    const target = path.join(folder, path.basename(painter)); await writeFile(target, changed);
    await writeFile(path.join(evidence, `${mode}-changed-source.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/cage-clash/CageClashCanvas': target });
  }
  const reportFile = path.join(evidence, `${mode || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  const independent = mode ? controls[mode].baseline || titles.baseline : '';
  if (mode) args.push('--testNamePattern', [controls[mode].test, independent].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${mode || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'The bounded painter process finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module|not wrapped in act/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(result => result.assertionResults);
  assert.equal(rows.length, Object.keys(titles).length); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (mode) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[mode].test]);
    assert.deepEqual(passed.map(row => row.title), [independent]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, Object.keys(titles).length - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n');
    assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0);
    assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simCageStrikeMotion ${mode || 'normal'}: literal painter outcomes and independent baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-strike-motion-'));
  await rm(folder, { recursive: true, force: true });
  for (const verify of held) await verify();
}
