/* Round 871: bounded cancellable Bingo loads through real page and loader.
   PLAYER_BINGO_LOAD_CONTROL corrupts one real behavior in disposable copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.PLAYER_BINGO_LOAD_CONTROL || '';
assert.ok(['', 'workers', 'signals', 'owner', 'deadline', 'cleanup', 'errors', 'queued', 'dedupe'].includes(control));
const files = ['src/pages/PlayerBingo.tsx', 'src/lib/playerBingo.ts', 'src/test/playerBingoLoad.test.tsx', 'src/test/playerBingoTransport.test.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = {
  latest: 'limits latest-row chunk requests to three while preserving all seven chunks',
  history: 'limits paged history chunk requests to three without truncating seven pages',
  cancelLatest: 'caller cancellation stops queued latest chunks and never starts history',
  cancelHistory: 'caller cancellation stops queued history chunks and further pagination',
  failLatest: 'a failed latest request aborts siblings and pending chunks without partial data',
  failHistory: 'a failed history request aborts siblings and pending chunks without partial data',
  wc: 'a failed World Cup read cancels other initial pool requests immediately',
  queued: 'a just-resolved latest chunk cannot start queued work after cancellation',
  forward: 'forwards one owned signal to every existing query kind',
  oldSuccess: 'ignores a timed-out old success after a fresh retry becomes playable',
  oldNull: 'ignores a timed-out old null response after a fresh retry becomes playable',
  strict: 'cancels StrictMode first mount without rejecting the current mount',
  pending: 'ends a permanently pending load at 30 seconds without automatic retry',
  unmount: 'aborts an abandoned load and clears its pending deadline',
  dedupe: 'deduplicates same-frame retry clicks instead of multiplying pool loads',
};
const mutations = {
  workers: [1, 'const QUERY_CONCURRENCY = 3;', 'const QUERY_CONCURRENCY = 1000;', 1, ['latest', 'history', 'cancelLatest', 'cancelHistory', 'failLatest', 'failHistory', 'queued']],
  signals: [1, '.abortSignal(signal)', '.abortSignal(undefined as unknown as AbortSignal)', 5, ['forward', 'cancelLatest', 'cancelHistory', 'failLatest', 'failHistory', 'wc']],
  owner: [0, 'if (loadRef.current !== request || request.controller.signal.aborted) return;', 'void request.controller.signal;', 1, ['oldSuccess', 'oldNull', 'strict']],
  deadline: [0, 'const LOAD_TIMEOUT_MS = 30_000;', 'const LOAD_TIMEOUT_MS = 300_000;', 1, ['pending', 'oldSuccess', 'oldNull']],
  cleanup: [0, '      if (request) {\n        clearTimeout(request.timer);\n        request.controller.abort();\n      }', '      void request;', 1, ['unmount', 'strict']],
  errors: [1, '  } catch {\n    controller.abort();\n    return null;', '  } catch {\n    return null;', 1, ['wc']],
  queued: [1, '    while (next < chunks.length) {\n      checkBingoLoad(controller.signal);', '    while (next < chunks.length) {', 1, ['queued']],
  dedupe: [0, '    if (loadRef.current) return;', '    void loadRef.current;', 1, ['dedupe']],
};
for (const [index, anchor, , count] of Object.values(mutations)) {
  const crlfBytes = Buffer.from(held[index][1].source.replaceAll('\n', '\r\n'));
  const crlfHeld = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, count, 'Actual control bindings survive CRLF');
  assert.deepEqual(crlfBytes, crlfHeld);
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/player-bingo-load871-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const [index, anchor, replacement, count] = mutations[control];
    const source = held[index][1].source;
    assert.equal(source.split(anchor).length - 1, count, 'Control binds actual executable source');
    const changed = source.split(anchor).join(replacement);
    assert.notEqual(changed, source, 'Control actually changes its copy');
    const copy = path.join(folder, path.basename(files[index]));
    await writeFile(copy, changed); owned.push(copy);
    const alias = index === 0 ? '@/pages/PlayerBingo' : '@/lib/playerBingo';
    env.NO_DOUBLE_SWAP = JSON.stringify({ [alias]: copy });
  }
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/playerBingoLoad.test.tsx', 'src/test/playerBingoTransport.test.ts', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner errors are not measured behavior');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 19);
  if (control) {
    const intended = mutations[control][4].map(key => titles[key]);
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, intended.length); assert.equal(report.numPassedTests, 19 - intended.length);
    for (const title of intended) assert.equal(rows.filter(row => row.title === title).length, 1);
    for (const row of rows) assert.equal(row.status, intended.includes(row.title) ? 'failed' : 'passed', row.fullName);
    console.log(`simPlayerBingoLoad ${control}: real executable anchors changed in a disposable page or loader.`);
    console.log(`simPlayerBingoLoad ${control}: ${intended.length} exact lifecycle or transport outcomes reject the control, ${19 - intended.length} independent cases pass.`);
    console.log(`simPlayerBingoLoad ${control}: complete query predicates, paged transforms, banked score, replay and null-failure baselines hold.`);
    console.log(`simPlayerBingoLoad ${control}: ${rows.find(row => row.status === 'failed').failureMessages[0].split('\n')[0]}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 19); assert.equal(report.numFailedTests, 0);
    console.log('simPlayerBingoLoad: 19 actual page and loader outcomes pass, no pending or unhandled cases.');
    console.log('simPlayerBingoLoad: latest and paged history peaks are three each, all 17 fixture queries and 280 players retained.');
    console.log('simPlayerBingoLoad: existing select/filter/order/range predicates and complete historical transforms match independent fixtures.');
    console.log('simPlayerBingoLoad: caller cancellation and failed reads abort siblings and stop queued work, with no partial playable data.');
    console.log('simPlayerBingoLoad: 30-second deadline offers manual Retry; stale loads, same-frame clicks, StrictMode and unmount remain isolated.');
    console.log('simPlayerBingoLoad: first-line 100-point booking and no-refetch replay remain intact.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual page, loader and focused suite bytes held');
  }
}
console.log('simPlayerBingoLoad: CRLF bindings proved, raw source bytes held, owned copies cleaned; fictional transport only, no browser or live calls.');
