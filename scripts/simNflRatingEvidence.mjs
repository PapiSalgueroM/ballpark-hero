/* Round889: actual saved-player explanations, including the unchanged legacy path. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/front-office/FrontOfficeBoard.tsx';
const test = 'src/components/front-office/FrontOfficeRatingEvidence.test.tsx';
const files = [board, test, 'src/lib/frontOffice.ts', 'src/data/frontOfficeDepth.ts'];
const held = files.map(file => [file, fs.readFileSync(path.join(root, file))]);
const source = held[0][1].toString('utf8').replaceAll('\r\n', '\n');
const controls = {
  evidence: ['const e = p?.openingRatingEvidence;', 'const e = undefined;', [0, 1]],
  opening: ['` · opening estimate ${e.openingOvr}:', '` · opening estimate ${p.ovr}:', [1]],
  basis: ["&& ['production', 'defensive-proxy', 'participation-proxy', 'draft-prior', 'unmeasured-prior'].includes(e.basis)", '', [3]],
  legacy: ["' · no 2025 season, rated on draft spot'", "''", [2]],
};
const control = process.env.NFL_RATING_UI_CONTROL || '';
const original = process.env.NFL_RATING_UI_ORIGINAL === '1';
assert.ok(!control || control in controls);
assert.ok(!control || !original);
for (const [anchor] of Object.values(controls)) assert.equal(source.split(anchor).length - 1, 1, 'Executable normalized anchor exists exactly once');
let folder;
try {
  fs.mkdirSync(path.join(root, '.sim-control'), { recursive: true });
  folder = fs.mkdtempSync(path.join(root, '.sim-control/nfl-evidence889-'));
  let copy = source;
  if (original) {
    const before = spawnSync('git', ['show', `56356be9:${board}`], { cwd: root, encoding: 'utf8' });
    assert.equal(before.status, 0, 'Physical original Board available');
    copy = before.stdout.replaceAll('\r\n', '\n');
    assert.notEqual(copy, source, 'Original is actually different');
  } else if (control) {
    copy = copy.replace(controls[control][0], controls[control][1]);
    assert.notEqual(copy, source, 'Control changes executable code');
  }
  const copiedBoard = path.join(folder, 'FrontOfficeBoard.tsx');
  const reportFile = path.join(folder, 'report.json');
  fs.writeFileSync(copiedBoard, copy);
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], {
    cwd: root, env: { ...process.env, FORCE_COLOR: '0', NO_DOUBLE_SWAP: JSON.stringify({ '@/components/front-office/FrontOfficeBoard': copiedBoard }) }, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = (run.stdout || '') + (run.stderr || '');
  assert.ok(!run.error && !run.signal);
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 4);
  assert.equal(report.numPendingTests, 0);
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.ok(rows.every(row => ['passed', 'failed'].includes(row.status)));
  const expected = original ? [0, 1, 3] : control ? controls[control][2] : [];
  const failed = rows.flatMap((row, i) => row.status === 'failed' ? [i] : []);
  console.log('NFL rating evidence: ' + JSON.stringify({ original, control, passed: report.numPassedTests, failed: rows.filter(row => row.status === 'failed').map(row => ({ title: row.title, messages: row.failureMessages })) }));
  if (!expected.length && run.status !== 0) console.log(output);
  assert.deepEqual(failed, expected, 'Exact intended failures with independent baselines held');
  assert.equal(run.status, expected.length ? 1 : 0);
  assert.equal(report.numPassedTests, 4 - expected.length);
} finally {
  if (folder) {
    for (const name of ['FrontOfficeBoard.tsx', 'report.json']) fs.rmSync(path.join(folder, name), { force: true });
    fs.rmdirSync(folder);
  }
  for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Source bytes held');
}
console.log('NFL rating evidence: all4 actual Board cases ran; no browser, production or save migration credited.');
