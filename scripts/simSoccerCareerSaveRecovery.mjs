/* The actual Soccer Career page loads healthy and supported older careers,
   rejects malformed core save data without overwriting it, and recovers only
   through the player's own delete or new-career action.

   SOCCER_CAREER_SAVE_CONTROL=seasons accepts seasons:null in a temporary
   reader copy. SOCCER_CAREER_SAVE_CONTROL=retired moves restore after mount
   in a temporary page copy and makes a restored retirement record again.
   Both controls must fail precisely their intended component assertions.
   SOCCER_CAREER_SAVE_CONTROL=all runs green checks and both controls.
*/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const test = 'src/test/soccerCareerSaveRecovery.test.tsx';
const controlParent = path.join(root, '.sim-control');
fs.mkdirSync(controlParent, { recursive: true });
const dir = fs.mkdtempSync(path.join(controlParent, 'career-save857-'));
const report = path.join(dir, 'result.json');
const sourcePaths = ['src/lib/soccerCareerSave.ts', 'src/pages/SoccerCareer.tsx'];
const sources = sourcePaths.map(file => fs.readFileSync(path.join(root, file), 'utf8'));
const controls = process.env.SOCCER_CAREER_SAVE_CONTROL || '';
const title = name => `Soccer Career actual save recovery ${name}`;
const targets = {
  seasons: [
    title('rejects null seasons before render, retains raw bytes and deletes only its own key on request'),
    title('allows an explicit new career to replace damaged bytes without touching another save'),
  ],
  retired: [
    title('restores a retired career on the first render and never records it again after reload'),
    title('records a newly finished ceremony once and does not replay it on the next mount'),
  ],
};
function run(control = '') {
  const env = { ...process.env };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const index = control === 'seasons' ? 0 : 1;
    const anchor = control === 'seasons'
      ? '  if (!record(value)) return false;'
      : '  const [career, setCareer] = useState<CareerState | null>(restoredSave.career);';
    const replacement = control === 'seasons'
      ? `${anchor}\n  if (value.seasons === null) return true;`
      : '  const [career, setCareer] = useState<CareerState | null>(null);\n  useEffect(() => { setCareer(restoredSave.career); }, []);';
    assert.equal(sources[index].split(anchor).length - 1, 1, 'The real control anchor must match exactly once.');
    const changed = sources[index].replace(anchor, replacement);
    assert.notEqual(changed, sources[index], 'The control must change the actual reader or page code.');
    const copy = path.join(dir, control === 'seasons' ? 'soccerCareerSave.ts' : 'SoccerCareer.tsx');
    fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [control === 'seasons' ? '@/lib/soccerCareerSave' : '@/pages/SoccerCareer']: copy });
  }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--reporter=json', '--outputFile', report], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  if (result.error) throw result.error;
  assert.ok(fs.existsSync(report), 'The component tests must produce an actual report.');
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(Number(json.numUnhandledErrors ?? 0), 0, 'The component run must have no unhandled errors.');
  assert.equal(json.numPendingTests, 0, 'The component run must not skip focused cases.');
  assert.equal(json.numTotalTests, 39, `All focused component tests must run. ${json.testResults.map(file => file.message || '').join('\n')}`);
  const failed = json.testResults.flatMap(file => file.assertionResults).filter(row => row.status === 'failed');
  if (!control) {
    assert.equal(result.status, 0, failed.map(row => row.fullName + ': ' + row.failureMessages[0]).join('\n'));
    assert.equal(json.numPassedTests, 39); assert.equal(failed.length, 0);
    console.log('Soccer Career save recovery: 39/39 actual component checks passed.');
    console.log('Soccer Career save recovery: 12 current, older, event, international, post-retirement and completion baselines passed.');
    console.log('Soccer Career save recovery: 23 malformed core saves retain raw bytes, recover before render and delete only their own key on request.');
    console.log('Soccer Career save recovery: malformed and primitive JSON, explicit new-career replacement and the clean creator passed.');
    console.log('Soccer Career save recovery: restored retirements record zero completions; finishing a ceremony records once and stays once after reload.');
  } else {
    assert.notEqual(result.status, 0, 'The control must make the component run fail.');
    assert.deepEqual(failed.map(row => row.fullName).sort(), [...targets[control]].sort(), 'Only intended control assertions may fail.');
    assert.equal(json.numPassedTests, 39 - targets[control].length);
    assert.ok(failed.every(row => row.failureMessages.some(message => /AssertionError|TestingLibraryElementError/.test(message))), 'Each control must fail on a real assertion.');
    console.log(`Soccer Career save recovery control ${control}: ${failed.length} intended component assertions failed.`);
    for (const row of failed) console.log(`Soccer Career save recovery control ${control}: rejected ${row.fullName}: ${row.failureMessages[0].split('\n')[0]}`);
    console.log(`Soccer Career save recovery control ${control}: ${json.numPassedTests}/39 unaffected checks passed.`);
  }
  fs.unlinkSync(report);
}
try {
  if (!controls || controls === 'all') run();
  if (controls === 'all') { run('seasons'); run('retired'); }
  else if (controls) { assert.ok(Object.hasOwn(targets, controls), 'Unknown save control.'); run(controls); }
} finally {
  for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
  fs.rmdirSync(dir);
  sourcePaths.forEach((file, index) => assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), sources[index], `${file} must remain byte-identical through the harness.`));
}
console.log('Soccer Career save recovery cleanup: temporary copies and reports removed; production page and reader bytes stayed identical.');
