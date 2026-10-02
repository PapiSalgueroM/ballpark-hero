/* Actual NBA Board opening and saved-evidence outcomes. Copies alone carry controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const test = 'src/components/nba-front-office/NbaFrontOfficeRatingEvidence.test.tsx';
const files = [board, test, 'src/lib/nbaFrontOffice.ts', 'src/data/nbaOpeningRatings.ts', 'src/data/conquestDataNba.ts', 'src/components/nba-front-office/NbaRotationPanel.tsx', 'scripts/simNbaRatingEvidence.mjs'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const source = held.find(([file]) => file === board)[1].source;
const executable = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const titles = [
  'drops a real pending rating import after unmount without overwriting a newer save',
  'starts actual DEN with all300 reviewed prices ratings and opening evidence',
  'settles two same-frame franchise clicks with one initializer and one save',
  'holds legacy progression and exact saved bytes as an independent baseline',
  'keeps opening estimates separate from developed grades after a real saved trade',
  'distinguishes actual prior-only and unmeasured provenance without claiming current evidence',
  'marks damaged saved basis unavailable while preserving grade and exact bytes',
  'refuses an invalid opening version without overwriting another save and retries cleanly',
];
const definitions = {
  lifetime: { anchor: '    if (!alive.current) return;', replacement: '', failed: [0] },
  map: { anchor: '    const lg = initNbaLeague(Math.random, NBA_OPENING_RATINGS);', replacement: '    const lg = initNbaLeague(Math.random);', failed: [1, 2, 7] },
  pending: { anchor: '    if (startPending.current) return;', replacement: '', failed: [2] },
  note: { anchor: 'Opening estimate ${e.openingOvr}: ${basis}.', replacement: 'Opening estimate ${p.ovr}: ${basis}.', failed: [4] },
  basis: { anchor: "  const basis = e?.basis === 'box-score-proxy' ? 'retained-season box scores'\n    : e?.basis === 'prior-only' ? 'prior season only, reduced confidence' : 'unmeasured game prior';", replacement: "  const basis = 'retained-season box scores';", failed: [5] },
  damaged: { anchor: "    && ['box-score-proxy', 'prior-only', 'unmeasured-prior'].includes(e.basis) ? e : null;", replacement: '    ? e : null;', failed: [6] },
  retry: { anchor: '      startPending.current = false;', replacement: '', failed: [7] },
};
const mode = process.env.NBA_RATING_EVIDENCE_CONTROL || '';
assert.ok(mode === '' || mode === 'original' || Object.hasOwn(definitions, mode), 'Known evidence control');
for (const { anchor } of Object.values(definitions)) {
  assert.equal(executable(source).split(anchor).length - 1, 1, 'One actual executable Board binding');
  const crlf = source.replaceAll('\n', '\r\n').replaceAll('\r\n', '\n');
  assert.equal(executable(crlf).split(anchor).length - 1, 1, 'CRLF checkout matches the same binding');
}

const receiptFolder = await mkdtemp(path.join(os.tmpdir(), 'dukb-nba-evidence895-'));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nba-evidence895-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  let expected = [], copySource;
  if (mode === 'original') {
    const old = spawnSync('git', ['show', `e8b39ccc:${board}`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(old.status, 0, 'Physical pre895 Board is available from e8b39ccc');
    assert.ok(!old.error && !old.signal, 'Original Board extraction finishes');
    copySource = old.stdout.replaceAll('\r\n', '\n');
    assert.notEqual(copySource, source, 'Physical original predates the feature');
    assert.doesNotMatch(executable(copySource), /function ratingNote\(/, 'Original has no new evidence presentation');
    expected = [1, 2, 4, 5, 6, 7];
  } else if (mode) {
    const definition = definitions[mode];
    copySource = source.replace(definition.anchor, definition.replacement);
    assert.notEqual(copySource, source, 'Control changes the unique executable binding');
    assert.equal(copySource.split(definition.anchor).length - 1, 0, 'Original binding is absent in the control copy');
    expected = definition.failed;
  }
  if (mode) {
    const relative = "from './NbaRotationPanel'";
    assert.equal(copySource.split(relative).length - 1, 1, 'Copy retains the actual rotation component');
    const copy = path.join(folder, 'NbaFrontOfficeBoard.tsx');
    owned.push(copy);
    await writeFile(copy, copySource.replace(relative, "from '@/components/nba-front-office/NbaRotationPanel'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/nba-front-office/NbaFrontOfficeBoard': copy });
  }
  const reportFile = path.join(receiptFolder, 'vitest.json');
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  await writeFile(path.join(receiptFolder, 'vitest.log'), output);
  assert.ok(!run.error && !run.signal, 'Bounded one-worker source proof finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numPendingTests, 0);
  assert.equal(report.numTotalTests, 8);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.deepEqual(rows.map(row => row.title), titles, 'All eight actual Board outcomes ran');
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'), 'No skipped or pending outcomes');
  const failed = rows.filter(row => row.status === 'failed');
  await writeFile(path.join(receiptFolder, 'attempt.json'), JSON.stringify({ mode: mode || 'normal', status: run.status, passed: report.numPassedTests, failed: report.numFailedTests, failedTitles: failed.map(row => row.title) }, null, 2));
  assert.deepEqual(failed.map(row => row.title), expected.map(index => titles[index]), 'Only exact intended outcome assertions reject the mutation');
  assert.equal(run.status, expected.length ? 1 : 0);
  assert.equal(report.numFailedTests, expected.length);
  assert.equal(report.numPassedTests, 8 - expected.length);
  for (const row of failed) {
    assert.match(row.failureMessages.join('\n'), /AssertionError:|Error: expect\(element\)\.toHaveTextContent\(\)|Error: Unable to find (?:role|an accessible element)/, 'Failure is an outcome assertion or deliberately missing evidence UI');
    assert.doesNotMatch(row.failureMessages.join('\n'), /TypeError:|ReferenceError:|Test timed out|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
    assert.ok(row.failureMessages.some(message => message.includes(test.replaceAll('/', '\\')) || message.includes(test)), 'Assertion belongs to the actual unchanged suite');
  }
  assert.equal(rows[3].status, 'passed', 'Independent legacy progression and exact raw-save baseline holds in every run');
  if (mode !== 'lifetime') assert.equal(rows[0].status, 'passed', 'Unrelated lifetime outcome holds when its own guard is retained');
  await writeFile(path.join(receiptFolder, 'verified-summary.json'), JSON.stringify({ mode: mode || 'normal', total: 8, passed: report.numPassedTests, failed: report.numFailedTests, pending: 0, expectedFailureIndices: expected, failedTitles: failed.map(row => row.title), originalCommit: mode === 'original' ? 'e8b39ccc' : null, sourceHashes: Object.fromEntries(held.map(([file, { bytes }]) => [file, createHash('sha256').update(bytes).digest('hex')])), limits: 'Actual Board/engine/data, deferred actual module import and simulated save progress. Component proof does not establish native play, real historical accuracy or live data.' }, null, 2));
  console.log(`NBA rating evidence ${mode || 'normal'}: ${report.numPassedTests}/8 passed, ${report.numFailedTests} exact intended rejections, zero skipped or unhandled outcomes.`);
  console.log('NBA rating evidence: actual300 opening tuples, same-frame settlement, import lifetime, untouched old saves and opening-versus-developed provenance are measured through the actual Board.');
  console.log(`NBA rating evidence receipt: ${receiptFolder}`);
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Production Board, actual engine, test and datasets retain original raw bytes');
  }
}
console.log('NBA rating evidence: CRLF-safe executable bindings, original raw-byte holds and owned-copy cleanup verified. No native or live claims.');
