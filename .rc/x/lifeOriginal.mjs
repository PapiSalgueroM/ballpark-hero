// Round BHH kit: PR280's "Original product negative control and full restoration" step as one line.
// Puts soccerCareerLife.ts and soccerCareerLifeConsequences.ts of LIFE_ORIGINAL_BASE (default PR280's own parent
// bd3b6244, whose two files equal this tree's before the merge) into src, runs the preview test, restores both
// files from HEAD, and passes only when exactly the eight preview cases fail and the ten other cases pass.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.LIFE_ORIGINAL_BASE || 'bd3b62443d992b92c22bd303437cb3aa1c5eae5c';
const files = ['src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerLifeConsequences.ts'];
const out = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'life-original-'));
const report = path.join(out, 'original.json');
const expected = ['227:0', '230:0', '230:1', '232:0'].flatMap(id => [`fresh choice preview ${id}`, `restored choice preview ${id}`]).sort();

const fixed = files.map(f => fs.readFileSync(f));
let child;
try {
  for (const f of files) {
    const original = execFileSync('git', ['show', `${base}:${f}`]);
    assert.ok(!original.equals(fs.readFileSync(f)), `the control must change ${f}`);
    fs.writeFileSync(f, original);
  }
  child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerCareerLifeChoicePreviews.test.ts',
    '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile=${report}`],
    { encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024 });
} finally {
  files.forEach((f, i) => fs.writeFileSync(f, fixed[i]));
}
execFileSync('git', ['diff', '--exit-code', '--', ...files]);
const log = `${child.stdout || ''}\n${child.stderr || ''}`;
assert.ok(!child.error && !child.signal, 'vitest must complete');
assert.doesNotMatch(log, /Unhandled Errors|Unhandled Rejection|Uncaught Exception|SIM_OFFLINE_BLOCK/);
const r = JSON.parse(fs.readFileSync(report, 'utf8'));
const rows = r.testResults.flatMap(t => t.assertionResults);
assert.equal(child.status, 1, 'the original captions must go red');
assert.equal(rows.length, 18);
assert.equal(r.numFailedTests, 8);
assert.equal(r.numPassedTests, 10);
const failed = rows.filter(x => x.status === 'failed');
assert.deepEqual(failed.map(x => x.title).sort(), expected);
assert.ok(failed.every(x => x.failureMessages.length === 1 && x.failureMessages[0].includes('AssertionError')));
console.log(`lifeOriginal: CONTROL FIRED-OK on base ${base.slice(0, 8)}: exactly the 8 preview cases failed, 10 preserved, both files restored`);
