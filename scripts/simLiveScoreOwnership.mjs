/* Round874: actual ticker request outcomes with inert transport boundaries.
   LIVE_SCORE_OWNERSHIP_CONTROL=hidden|overlap|owner|deadline|cleanup|signal
   changes one executable binding in an isolated copy and must fail its target. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hook = 'src/hooks/useLiveScores.ts';
const lib = 'src/lib/liveScores.ts';
const tests = ['src/test/liveScoresOwnership.test.tsx', 'src/test/liveScoresTransport.test.ts'];
const baselines = ['keeps the original five-minute visible refresh cadence', 'preserves the original read window, row shape, limit and server clock'];
const controls = {
  hidden: { file: hook, anchor: "if (!live || document.visibilityState !== 'visible' || request) return;", replacement: 'if (!live || request) return;', test: 'waits for a visible tab and never polls while hidden' },
  overlap: { file: hook, anchor: "if (!live || document.visibilityState !== 'visible' || request) return;", replacement: "if (!live || document.visibilityState !== 'visible') return;", test: 'coalesces visibility events into the one pending read' },
  owner: { file: hook, anchor: 'if (!live || request !== owned) return;', replacement: 'if (!live) return;', test: 'cancels a hidden request and ignores its late answer after foreground recovery' },
  deadline: { file: hook, anchor: 'const REQUEST_MS = 15_000;', replacement: 'const REQUEST_MS = 150_000;', test: 'bounds a hung read and protects its replacement from the old response' },
  cleanup: { file: hook, anchor: 'window.clearTimeout(owned.timer);\n      owned.controller.abort();', replacement: 'window.clearTimeout(owned.timer);\n      void owned.controller;', test: 'aborts on unmount and removes polling and visibility callbacks' },
  signal: { file: lib, anchor: '      signal,', replacement: '      signal: undefined,', test: 'forwards the owned cancellation signal to the actual score fetch' },
};
const control = process.env.LIVE_SCORE_OWNERSHIP_CONTROL || '';
if (control) assert.ok(controls[control], 'Known copied-source control required');
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const holds = await Promise.all([hook, lib, ...tests].map(async file => ({ file, ...holdSource(await readFile(path.join(root, file))) })));
const source = new Map(holds.map(({ file, source }) => [file, source]));
const folder = await mkdtemp(path.join(root, '.sim-live-score-'));
const owned = [];
try {
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const env = { ...process.env, VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...tests, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    const original = source.get(spec.file);
    assert.equal(original.split(spec.anchor).length - 1, 1, 'Actual executable control must bind exactly once');
    const changed = original.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, original);
    const copy = path.join(folder, path.basename(spec.file)); owned.push(copy);
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.file === hook ? '@/hooks/useLiveScores' : '@/lib/liveScores']: copy });
    args.push('--testNamePattern', [spec.test, ...baselines].join('|'));
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner must finish normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 11);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 2); assert.equal(report.numPendingTests, 8);
    const target = rows.find(row => row.title === controls[control].test);
    assert.equal(target?.status, 'failed');
    for (const title of baselines) assert.equal(rows.find(row => row.title === title)?.status, 'passed');
    assert.match(target.failureMessages.join('\n'), /AssertionError:|expected/);
    console.log(`Ticker ${control}: one asserted executable binding changed in an isolated source copy.`);
    console.log(`Ticker ${control}: intended outcome rejected, two independent baselines held, eight explicitly unselected cases.`);
    console.log(`Ticker ${control}: no runner, import or timeout failure was counted as a finding.`);
    console.log(`TICKER_OWNERSHIP_CONTROL: ${JSON.stringify({ control, title: target.title, messages: target.failureMessages })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 11); assert.equal(report.numPendingTests, 0);
    console.log('Ticker ownership:11/11 actual hook and fetch-boundary cases passed, none skipped.');
    console.log('Ticker ownership: hidden polling, overlap, hung loads, stale replies, unmount and StrictMode verified.');
    console.log('Ticker ownership: signal reaches actual fetch; five-minute cadence, real read shape and server-clock offset held.');
    console.log('Ticker ownership: fictional inert transport fixtures only, zero production requests or sports-data edits.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  await rmdir(folder);
  for (const { file, bytes } of holds) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual production/test bytes held');
  }
}
console.log('Ticker ownership: owned temporary files removed, original bytes preserved. Native live recovery not claimed.');
