// Round BHH kit: PR283's "Original product control and exact full restoration" step as one line.
// Puts the World XI page and library of WX_ORIGINAL_BASE (default PR283's own parent 5b630266) into src,
// runs src/test/worldXiSummary.test.tsx, restores both files from HEAD, and passes only when the original
// fails exactly the three display tests with their markers and keeps the fourth (the real season).
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.WX_ORIGINAL_BASE || '5b630266d261b39128e4fb4544783d8e22214ce3';
const files = ['src/pages/WorldXi.tsx', 'src/lib/worldXi.ts'];
const out = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'wx-original-'));
const report = path.join(out, 'original.json');
const expected = [
  ['shows the exact card overall for every player after simulation', 'WORLD_XI_OVR'],
  ['shows the actual shared-club pairs behind the chemistry count', 'WORLD_XI_CLUB_LINKS'],
  ['shows zero shared clubs and clears the old detail on replay', 'WORLD_XI_ZERO_LINKS'],
];
const kept = 'keeps the real season inputs and match average distinct from card overall';

const fixed = files.map(f => fs.readFileSync(f));
let child;
try {
  for (const f of files) {
    const original = execFileSync('git', ['show', `${base}:${f}`]);
    assert.ok(!original.equals(fs.readFileSync(f)), `the control must change ${f}`);
    fs.writeFileSync(f, original);
  }
  child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/worldXiSummary.test.tsx',
    '--no-cache', '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json',
    `--outputFile=${report}`], { encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024 });
} finally {
  files.forEach((f, i) => fs.writeFileSync(f, fixed[i]));
}
execFileSync('git', ['diff', '--exit-code', '--', ...files]);
const log = `${child.stdout || ''}\n${child.stderr || ''}`;
assert.ok(!child.error && !child.signal, 'vitest must complete');
assert.doesNotMatch(log, /Unhandled (?:Errors?|Rejection)|Failed Suites|Source Errors|SIM_OFFLINE_BLOCK/);
const r = JSON.parse(fs.readFileSync(report, 'utf8'));
const rows = r.testResults.flatMap(t => t.assertionResults);
assert.equal(child.status, 1, 'the original page must go red');
assert.equal(rows.length, 4);
assert.equal(r.numFailedTests, 3);
assert.equal(r.numPassedTests, 1);
for (const [title, marker] of expected) {
  const row = rows.find(x => x.title === title);
  assert.ok(row && row.status === 'failed', `${title} must fail on the original`);
  assert.ok(row.failureMessages.length > 0 && row.failureMessages.every(m => m.includes(marker)), `${title} must fail on ${marker}`);
}
assert.equal(rows.find(x => x.title === kept)?.status, 'passed');
console.log(`wxOriginal: CONTROL FIRED-OK on base ${base.slice(0, 8)}: 3 display tests failed on their markers, the season test passed, both files restored`);
