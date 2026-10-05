/* Actual Footle page, result and comparison tiles. No live fetches or scores.
   FOOTLE_CURRENCY_CONTROL=euro restores the old result in a copied page. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageFile = path.join(root, 'src/pages/Footle.tsx');
const original = await readFile(pageFile);
const control = process.env.FOOTLE_CURRENCY_CONTROL || '';
assert.ok(!control || control === 'euro', 'Known currency control');
let folder;
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/footle-currency-'));
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = original.toString('utf8');
    const mutations = [
      { needle: '${fmtCompactUsd(targetPlayer.marketValue * 1_000_000)}', replacement: '€${targetPlayer.marketValue}M', label: 'Daily' },
      { needle: 'valued at {fmtCompactUsd(targetPlayer.marketValue * 1_000_000)}.', replacement: 'valued at €{targetPlayer.marketValue}M.', label: 'Unlimited' },
    ];
    let changed = source;
    for (const { needle, replacement, label } of mutations) {
      assert.equal(changed.split(needle).length - 1, 1, `${label}: executable formatter mutation occurs once`);
      const next = changed.replace(needle, replacement);
      assert.notEqual(next, changed, `${label}: control changes actual result code`);
      changed = next;
    }
    assert.notEqual(changed, source, 'The control changes actual result code');
    const copy = path.join(folder, 'Footle.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/Footle': copy });
  }
  const reportFile = path.join(folder, 'report.json');
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/footleResultCurrency.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], {
    cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024,
  });
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 5);
  assert.equal(report.numPendingTests, 0);
  if (control) {
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, 4);
    assert.equal(report.numPassedTests, 1);
    const failed = rows.filter(row => row.status === 'failed');
    assert.ok(failed.every(row => row.title.includes('result retains')));
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /Expected element to have text content:[\s\S]*valued at \$/);
    assert.equal(rows.find(row => row.title.startsWith('keeps the answer value concealed'))?.status, 'passed');
    console.log('simFootleCurrency euro: executable result mutation applied to a disposable page copy.');
    console.log('simFootleCurrency euro: four intended Daily and Unlimited USD-result assertions fail.');
    console.log('simFootleCurrency euro: original playing tile and answer-concealment baseline passes, no cases skipped.');
  } else {
    if (run.status !== 0) process.stdout.write((run.stdout || '') + (run.stderr || ''));
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 5);
    assert.equal(report.numFailedTests, 0);
    console.log('simFootleCurrency: Daily win/loss results match all eight original $216M tiles.');
    console.log('simFootleCurrency: Unlimited win/loss results match all eight original $54M tiles.');
    console.log('simFootleCurrency: five outcomes pass, including concealed answer during play and unchanged stored values.');
  }
} finally {
  if (folder) {
    await rm(path.join(folder, 'Footle.tsx'), { force: true });
    await rm(path.join(folder, 'report.json'), { force: true });
    await rmdir(folder);
  }
  assert.deepEqual(await readFile(pageFile), original, 'Actual page bytes held during the harness');
}
console.log('simFootleCurrency: owned copies cleaned, actual page held, no production data changed.');
