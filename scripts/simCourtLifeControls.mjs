/* Mounted inputs reach the unchanged engine. Copied faults must break their
   named outcome while an independent seeded engine replay remains green. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const hook = 'src/hooks/useCourtLife.ts', controlsFile = 'src/components/court-life/CourtLifeControls.tsx';
const testFile = 'src/test/courtLifeControls.test.tsx';
const cases = {
  edges: 'keeps press and release edges between frames and matches the actual engine result',
  pause: 'clears every held and queued action on Help blur hidden and pause without charging or catch up',
  binding: 'binds a held finger to its original action through an actual possession change',
  movement: 'maps screen movement and limits keyboard input to the focused court',
  cancel: 'cancels pointer charge and never turns release clicks into a second action',
  restore: 'restores live play paused and holds invalid raw until explicit replacement',
  storage: 'keeps actual play running on storage failure and retries its current snapshot',
  season: 'records a season transition once and never repays a restored finished season',
  independent: 'retains the independent seeded engine baseline without hook input',
};
const controls = {
  edges: { from: '...edges.current.shift()', to: '...{}', test: cases.edges },
  queued: { from: 'edges.current = [];', to: 'void edges.current;', test: cases.pause },
  held: { from: '|| held.current.has(source)', to: '', test: cases.binding },
  movement: { from: 'moveX: screenY / length, moveY: screenX ? -screenX / length : 0', to: 'moveX: screenX / length, moveY: screenY / length', test: cases.movement },
  menus: { from: "!(event.target instanceof HTMLCanvasElement) || !event.target.hasAttribute('data-court-canvas') || ", to: '', test: cases.movement },
  cancel: { from: 'if (cancelled) {', to: 'if (false) {', test: cases.cancel },
  catchup: { from: 'elapsed > 150 ? 0 : elapsed', to: 'elapsed', test: cases.pause },
  neutral: { from: 'const next = neutralizeCourtMatch(matchRef.current);', to: 'const next = matchRef.current;', test: cases.pause },
  recovery: { from: 'if (protectRecovery.current)', to: 'if (false)', test: cases.restore },
  click: { file: controlsFile, from: 'if (event.detail === 0) tap(slot);', to: 'tap(slot);', test: cases.cancel },
  pad: { file: controlsFile, from: 'if (disabled) padPointer.current = null;', to: 'void disabled;', test: cases.cancel },
  restored: { from: 'const pausedRef = useRef(true);', to: 'const pausedRef = useRef(false);', test: cases.restore },
  storage: { from: "setStorageError('Could not save this career. You can keep playing and retry saving.');", to: 'setStorageError(null);', test: cases.storage },
};
const count = Object.keys(cases).length;
const control = process.env.COURT_LIFE_CONTROLS_CONTROL || '';
assert(!control || control === 'all' || control in controls, 'Known Court Life controls fault');
const out = path.resolve(process.env.COURT_LIFE_CONTROLS_ARTIFACTS || path.join(root, 'court-life-artifacts/controls'));
await mkdir(out, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, COURT_LIFE_CONTROLS_CONTROL: name, COURT_LIFE_CONTROLS_ARTIFACTS: out }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(out, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Court Life controls ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCourtLifeControls')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(out, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(row => row.passed), 'All outcome and effective fault gates pass');
  console.log(`simCourtLifeControls all: ${count} actual outcomes and ${Object.keys(controls).length} effective faults passed.`);
  process.exit(0);
}
const digest = value => createHash('sha256').update(value).digest('hex');
const held = [hook, controlsFile, testFile, 'src/lib/courtLife.ts', 'src/lib/courtLifeCareer.ts', 'src/data/courtLifeWorld.ts', 'scripts/simCourtLifeControls.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(held.map(async file => [file, digest(await readFile(path.join(root, file)))])));
const before = await hashes(), env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(out, `${control || 'normal'}-report.json`);
let folder, copy;
try {
  if (control) {
    const spec = controls[control], file = spec.file || hook;
    const original = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(original.split(spec.from).length - 1, 1, 'Fault binds exactly one executable source anchor');
    const changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original);
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/court-life-controls-'));
    copy = path.join(folder, path.basename(file)); await writeFile(copy, changed);
    await writeFile(path.join(out, `${control}-${path.basename(file)}.txt`), changed);
    await writeFile(path.join(out, `${control}-mutation.json`), JSON.stringify({ control, file, from: spec.from, to: spec.to, originalSha256: digest(original), changedSha256: digest(changed), test: spec.test }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + file.slice(4).replace(/\.tsx?$/, '')]: copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); await writeFile(path.join(out, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Actual mounted runner completed');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime failures earn no fault credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, count - 2);
    const intended = rows.find(row => row.title === controls[control].test); assert.equal(intended?.status, 'failed');
    assert.match(intended.failureMessages.join('\n'), /AssertionError:|Error: expect\(element\)/);
    assert.equal(rows.find(row => row.title === cases.independent)?.status, 'passed');
    console.log(`simCourtLifeControls ${control}: mapped outcome rejected changed source; independent engine replay passed.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, count); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log(`simCourtLifeControls: ${count} actual outcomes passed.`);
  }
} finally {
  if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  const after = await hashes(); await writeFile(path.join(out, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, 'All seven source files remain unchanged');
}
