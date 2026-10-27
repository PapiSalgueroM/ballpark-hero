/* Changed-copy controls for the actual shootout engine and its preservation proof. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceFile = path.join(root, 'src/lib/clubManager.ts');
const bytes = fs.readFileSync(sourceFile);
const source = bytes.toString('utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const out = path.resolve(process.env.CM_SHOOTOUT_CONTROLS_OUT || path.join(root, '.sim-artifacts/cm-shootout-controls-' + Date.now()));
assert.ok(out.startsWith(root + path.sep));
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-shootout-controls-'));
const condition = '(detail.mine > detail.theirs) === won && last?.mine === detail.mine && last?.theirs === detail.theirs';
const controls = [
  ['omit-detail', 'return { won, detail };', 'return { won };'],
  ['extra-global', 'const roll = order ? null : Math.random();', 'const roll = order ? null : (Math.random(), Math.random());'],
  ['ignore-winner', condition, 'last?.mine === detail.mine && last?.theirs === detail.theirs'],
  ['ignore-completeness', condition, '(detail.mine > detail.theirs) === won'],
];
const healthy = JSON.parse(fs.readFileSync(path.join(process.env.CM_SHOOTOUT_RESULTS_OUT, 'summary.json'), 'utf8'));
assert.equal(healthy.status, 'passed');
const key = row => row.mode + ':' + row.seed;
const affected = new Set(healthy.cases.filter(row => row.mode !== 'explicit' && row.decidedBy === 'pens').map(key));
assert.ok(affected.size > 0);
const receipts = [];
function run(args, env, folder) {
  const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(folder, 'stdout.log'), result.stdout || '');
  fs.writeFileSync(path.join(folder, 'stderr.log'), result.stderr || '');
  assert.ok(!result.error && !result.signal, 'The actual control process must finish');
  return result;
}
try {
  for (const [id, anchor, replacement] of controls) {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
    assert.equal(code.split(anchor).length - 1, 1, id + ' executable anchor');
    assert.equal(source.split(anchor).length - 1, 1);
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source);
    assert.equal(changed.replace(replacement, anchor), source, 'Complete source reversal');
    const folder = path.join(out, id);
    fs.mkdirSync(folder);
    const copy = path.join(temp, id + '.ts');
    fs.writeFileSync(copy, changed);
    fs.writeFileSync(path.join(folder, 'source-copy.ts'), changed);
    let findings;
    if (id === 'ignore-completeness') {
      const reportFile = path.join(folder, 'unit.json');
      const result = run(['node_modules/vitest/vitest.mjs', 'run', 'src/test/clubManagerShootoutResults.test.ts',
        '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + reportFile],
        { NO_DOUBLE_SWAP: JSON.stringify({ '@/lib/clubManager': copy }) }, folder);
      const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      const rows = report.testResults.flatMap(file => file.assertionResults);
      assert.equal(result.status, 1);
      assert.equal(report.numTotalTests, 7);
      assert.equal(report.numFailedTests, 1);
      assert.equal(report.numPassedTests, 6);
      assert.equal(report.numPendingTests, 0);
      assert.equal(Number(report.numUnhandledErrors || 0), 0);
      assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.title),
        ['exhausts 128 detached attempts without inventing an unrecorded deciding kick']);
      findings = rows.filter(row => row.status === 'failed').map(row => row.title);
    } else {
      const cohortOut = path.join(folder, 'cohort');
      const result = run(['scripts/simCmShootoutResults.mjs'],
        { CM_SHOOTOUT_RESULTS_PHASE: 'fixed', CM_SHOOTOUT_RESULTS_CANDIDATE: copy, CM_SHOOTOUT_RESULTS_OUT: cohortOut }, folder);
      const report = JSON.parse(fs.readFileSync(path.join(cohortOut, 'summary.json'), 'utf8'));
      assert.equal(result.status, 1);
      assert.equal(report.status, 'assertion-failure');
      assert.equal(report.cases.length, healthy.cases.length);
      assert.equal(report.controls.length, 10);
      assert.ok(report.failures.length > 0);
      assert.ok(report.failures.every(row => affected.has(key(row))), 'Only default shootout fixtures are affected');
      if (id === 'extra-global') {
        assert.equal(report.preservationPassed, false);
        assert.ok(report.failures.some(row => row.label === 'global-draw-values-and-count'));
      } else {
        assert.equal(report.preservationPassed, true);
        assert.ok(report.failures.every(row => row.label === 'new-detail'));
        if (id === 'omit-detail') assert.equal(report.failures.length, affected.size);
      }
      findings = report.failures.map(row => ({ mode: row.mode, seed: row.seed, label: row.label }));
    }
    receipts.push({ id, changed: true, sourceHash: hash(bytes), faultHash: hash(changed), wholeReverse: true, findings });
    fs.writeFileSync(path.join(out, 'controls.json'), JSON.stringify(receipts, null, 2));
    console.log(id + ': actual changed engine rejected for the intended outcome; other scopes preserved.');
  }
  assert.equal(receipts.length, 4);
} finally {
  assert.deepEqual(fs.readFileSync(sourceFile), bytes, 'The canonical source remains byte-identical');
  if (path.dirname(temp) === os.tmpdir() && path.basename(temp).startsWith('cm-shootout-controls-')) fs.rmSync(temp, { recursive: true, force: true });
}
console.log('Shootout controls: all four effective source faults rejected; complete reversals and canonical source held.');
