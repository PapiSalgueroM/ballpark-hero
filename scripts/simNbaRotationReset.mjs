/* Actual Board restart regression with one isolated executable reset control. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const test = 'src/components/nba-front-office/NbaRotationReset.test.tsx';
const files = [board, test, 'src/components/nba-front-office/NbaRotationPanel.tsx', 'src/lib/nbaRotation.ts', 'src/lib/nbaFrontOffice.ts', 'src/data/conquestDataNba.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = [
  'keeps ordinary restored roster and local save unchanged as an independent baseline',
  'keeps ordinary new-franchise restart and own-key deletion as an independent baseline',
  'closes the previous rotation view before a new franchise opens its roster',
];
const control = process.env.NBA_ROTATION_RESET_CONTROL || '';
assert.ok(control === '' || control === 'reset', 'Known reset control');
const anchor = '    setRotationOpen(false); rotationReturn.current = false;';
const source = held.find(([file]) => file === board)[1].source;
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
assert.equal(code.split(anchor).length - 1, 1, 'One executable reset binding');
const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
const heldCrlf = Buffer.from(crlfBytes);
assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'CRLF reset binding survives normalization');
assert.deepEqual(crlfBytes, heldCrlf, 'Raw CRLF bytes held');

let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nba-rotation-reset887-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  if (control) {
    const removed = source.replace(anchor, '');
    assert.notEqual(removed, source, 'Control removes the actual reset expression');
    assert.equal(removed.split(anchor).length - 1, 0, 'Reset expression was removed');
    const relative = "from './NbaRotationPanel'";
    assert.equal(removed.split(relative).length - 1, 1, 'Copied Board uses the actual panel');
    const copy = path.join(folder, 'NbaFrontOfficeBoard.tsx');
    owned.push(copy);
    await writeFile(copy, removed.replace(relative, "from '@/components/nba-front-office/NbaRotationPanel'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/nba-front-office/NbaFrontOfficeBoard': copy });
  }
  const reportFile = path.join(folder, 'report.json');
  owned.push(reportFile);
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'One-worker reset proof finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.deepEqual(rows.map(row => row.title), titles, 'All three actual Board outcomes execute');
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'), 'No skips or pending cases');
  if (control) {
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, 1);
    assert.equal(report.numPassedTests, 2);
    const failed = rows.filter(row => row.status === 'failed');
    assert.deepEqual(failed.map(row => row.title), [titles[2]]);
    assert.match(failed[0].failureMessages.join('\n'), /AssertionError:/);
    assert.ok(rows.slice(0, 2).every(row => row.status === 'passed'), 'Both original lifecycle and persistence baselines held');
    console.log('NBA rotation reset control: one actual executable reset line removed in a private Board copy.');
    console.log('NBA rotation reset control: exactly one stale-view outcome rejected, two independent baselines held, zero skipped cases.');
    console.log(`NBA_ROTATION_RESET_CONTROL: ${JSON.stringify({ title: failed[0].title, failure: failed[0].failureMessages[0] })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0);
    assert.equal(report.numFailedTests, 0);
    assert.equal(report.numPassedTests, 3);
    console.log('NBA rotation reset: 3/3 actual Board lifecycle outcomes passed, zero skipped cases.');
    console.log('NBA rotation reset: opening a saved manual rotation, abandoning it and choosing another franchise returns to that franchise roster list.');
    console.log('NBA rotation reset: old restored save stays unchanged, restart deletes only the own key, and a new rotation starts without an old receipt or old player ID.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Board, test, engine, panel and dataset raw bytes held');
  }
}
console.log('NBA rotation reset: normalized control binding, raw source holds and owned cleanup verified. Component fixtures do not prove native play, live data or real roster accuracy.');
