/* NFL/NHL restore rejects unusable nested data before committing React state.
   Current progress, older owner/ID/recap migrations and in-progress drafts
   stay playable. Rejecting a save preserves its raw bytes until the player
   deletes it or chooses a new club, and never deletes another game's save.

   Negative controls alter a temporary copy of the actual reader, not src:
     pool: accept a missing freeAgents pool again, four recovery cases fail.
     period: accept week/round zero again, both period recovery cases fail.
   Each control requires exactly its targeted tests to fail on assertions.
   Run FRONT_OFFICE_SAVE_CONTROL=all to prove both controls after the green run.
*/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const test = 'src/test/frontOfficeSaveRecovery.test.tsx';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-gm-save854-'));
const report = path.join(dir, 'result.json'), copy = path.join(dir, 'frontOfficeSave.ts');
const source = fs.readFileSync(path.join(root, 'src/lib/frontOfficeSave.ts'), 'utf8');
const anchor = "  if (!record(value) || !record(value.league)) return false;";
const controls = process.env.FRONT_OFFICE_SAVE_CONTROL || '';
const title = (sport, name) => `${sport} actual save recovery ${name}`;
const rejected = name => `rejects ${name} before render and deletes only this save on request`;
const fresh = 'allows a fresh club to replace the unusable save without clearing another game';
const targets = {
  pool: ['NFL', 'NHL'].flatMap(sport => [title(sport, rejected('missing free agent pool')), title(sport, fresh)]),
  period: ['NFL', 'NHL'].map(sport => title(sport, rejected('zero period'))),
};
function run(control = '') {
  const env = { ...process.env };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    assert.equal(source.split(anchor).length - 1, 1, 'The code anchor must change exactly once.');
    const bypass = control === 'pool'
      ? 'record(value) && record(value.league) && value.league.freeAgents == null'
      : 'record(value) && record(value.league) && (value.league.week === 0 || value.league.round === 0)';
    const changed = source.replace(anchor, `  if (${bypass}) return true;\n${anchor}`);
    assert.notEqual(changed, source, 'The negative control must alter the reader.');
    fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/frontOfficeSave': copy });
  }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile', report], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  if (result.error) throw result.error;
  assert.ok(fs.existsSync(report), 'Vitest must produce an actual test report.');
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(json.numTotalTests, 36, 'The complete focused suite must run.');
  const failed = json.testResults.flatMap(file => file.assertionResults).filter(row => row.status === 'failed');
  if (!control) {
    assert.equal(result.status, 0, failed.map(row => row.fullName + ': ' + row.failureMessages[0]).join('\n'));
    assert.equal(failed.length, 0); assert.equal(json.numPassedTests, 36);
    console.log('Front Office save recovery: 36/36 actual component checks passed.');
    console.log('Front Office save recovery: 12 current, older, draft, recap and ID-repair restore cases passed.');
    console.log('Front Office save recovery: 20 nested-corruption cases retain raw bytes, reject before render and delete only their own save on request.');
    console.log('Front Office save recovery: four malformed-JSON and fresh-club recovery cases passed; fresh replacements preserve other game saves.');
  } else {
    assert.notEqual(result.status, 0, 'The control must make the test run fail.');
    assert.deepEqual(failed.map(row => row.fullName).sort(), [...targets[control]].sort(), 'Only the control targets may fail.');
    assert.ok(failed.every(row => row.failureMessages.some(message => /AssertionError|TestingLibraryElementError/.test(message))), 'Controls must fail on the recovery assertions.');
    console.log(`Front Office save recovery control ${control}: ${failed.length} targeted assertions failed, all other checks passed.`);
    for (const row of failed) console.log(`Front Office save recovery control ${control}: rejected ${row.fullName}.`);
    console.log(`Front Office save recovery control ${control}: ${json.numPassedTests} unaffected component checks passed out of ${json.numTotalTests} total checks.`);
  }
  fs.unlinkSync(report);
}
try {
  if (!controls || controls === 'all') run();
  if (controls === 'all') { run('pool'); run('period'); }
  else if (controls) { assert.ok(Object.hasOwn(targets, controls), 'Unknown save control.'); run(controls); }
} finally {
  for (const file of [copy, report]) if (fs.existsSync(file)) fs.unlinkSync(file);
  fs.rmdirSync(dir);
}
console.log('Front Office save recovery cleanup: disposable reader copies and result directory removed; the production reader was read only.');
