/* Actual grapple footprints with effective controls on copied painter source. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), self = fileURLToPath(import.meta.url);
const painter = 'src/components/cage-clash/CageClashCanvas.tsx', testFile = 'src/test/cageGrappleMotion.test.tsx';
const titles = {
  position: 'shows distinct guard half guard and mount legs even with reduced motion',
  mirror: 'mirrors the actual top corner and keeps bottom legs attached to the other fighter',
  grapple: 'draws a separate grapple load drive and settle from top bottom and clinch',
  escape: 'draws the longer escape effort and preserves its distinct clinch frames',
  pressure: 'uses each fighters actual submission pressure for three grips at constant action ticks',
  reduced: 'holds reduced effort still while keeping ground position and pressure truthful',
  readonly: 'paints repeated grapple states without advancing or editing the fight',
  baseline: 'preserves the original arena and accepted standing strikes independently of grappling',
};
const controls = {
  legs: { from: '[[-21, y - 9, -12, y - 16], [-23, y - 5, -17, y - 10], [-25, y, -31, y + 1]][level]', to: '[[-21, y - 9, -12, y - 16], [-23, y - 5, -17, y - 10], [-25, y, -31, y + 1]][0]', test: titles.position },
  feet: { from: 'const footX = [6, 11, 16][level];', to: 'const footX = [6, 11, 16][0];', test: titles.position },
  mirror: { from: "const playerTop = state.top === 'player';", to: 'const playerTop = false;', test: titles.mirror },
  grapple: { from: "(pose === 'grapple' ? [[14, y + 5], [19, y + 11], [11, y + 8]] : [[4, y - 10], [20, y + 13], [9, y - 5]])[effortStage]", to: "(pose === 'grapple' ? [[14, y + 5], [19, y + 11], [11, y + 8]] : [[4, y - 10], [20, y + 13], [9, y - 5]])[1]", test: titles.grapple },
  escape: { from: '[[1, y - 12], [17, y - 18], [8, y - 10]]', to: '[[1, y - 12], [1, y - 12], [8, y - 10]]', test: titles.escape },
  clinchEscape: { from: "!['jab', 'power', 'kick', 'escape', 'guard'].includes(f?.action ?? 'idle')", to: "!['jab', 'power', 'kick', 'guard'].includes(f?.action ?? 'idle')", test: titles.escape },
  pressure: { from: 'const pressure = (f?.submission ?? 0) >= 65 ? 2 : (f?.submission ?? 0) >= 25 ? 1 : 0;', to: 'const pressure = (f?.submission ?? 0) >= 85 ? 2 : (f?.submission ?? 0) >= 25 ? 1 : 0;', test: titles.pressure },
  ownPressure: { from: 'const pressure = (f?.submission ?? 0) >= 65 ? 2 : (f?.submission ?? 0) >= 25 ? 1 : 0;', to: 'const pressure = (state?.player.submission ?? 0) >= 65 ? 2 : (state?.player.submission ?? 0) >= 25 ? 1 : 0;', test: titles.pressure },
  reduced: { from: 'const effortStage = reduced || !active ? 1 :', to: 'const effortStage = !active ? 1 :', test: titles.reduced },
  reducedPressure: { from: 'const pressure = (f?.submission ?? 0) >= 65 ? 2 : (f?.submission ?? 0) >= 25 ? 1 : 0;', to: 'const pressure = reduced ? 0 : (f?.submission ?? 0) >= 65 ? 2 : (f?.submission ?? 0) >= 25 ? 1 : 0;', test: titles.pressure },
  readonly: { from: 'const active = !!f && f.actionTicks > 0;', to: 'if (f) f.cooldown += 1; const active = !!f && f.actionTicks > 0;', test: titles.readonly },
  strike: { from: '[[7, -42], [27, -40], [15, -41]][strikeStage]', to: '[[7, -42], [27, -40], [15, -41]][1]', test: titles.baseline, baseline: titles.readonly },
  arena: { from: "rect(0, 0, 320, 180, '#0c1427');", to: "rect(0, 0, 319, 180, '#0c1427');", test: titles.baseline, baseline: titles.readonly },
};
const mode = process.env.CAGE_GRAPPLE_MOTION_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known Cage Grapple Motion control');
const evidence = path.resolve(process.env.CAGE_GRAPPLE_MOTION_ARTIFACTS || path.join(root, 'cage-grapple-motion-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const results = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_GRAPPLE_MOTION_CONTROL: control, CAGE_GRAPPLE_MOTION_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Grapple Motion ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCageGrappleMotion')).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'Every painter outcome and effective control ran successfully');
  console.log(`simCageGrappleMotion: ${Object.keys(titles).length} actual painter outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [painter, testFile, 'src/lib/cageClash.ts', 'src/lib/cagePractice.ts', 'src/lib/cageCircuit.ts', 'src/hooks/useCageClash.ts']) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} source bytes unchanged`)));
}
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-grapple-motion-'));
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
  console.log(`simCageGrappleMotion ${mode || 'normal'}: literal painter outcomes and independent baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-grapple-motion-'));
  await rm(folder, { recursive: true, force: true });
  for (const verify of held) await verify();
}
