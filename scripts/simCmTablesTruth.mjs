/* Round 1325: Club Manager's squad list, contracts desk, dressing room and career card tell the truth.

   Runs src/test/cmTablesTruth.test.tsx through vitest's JSON reporter (the simContractPreview pattern) and reads
   the count, so a case that silently stopped running is a failure, not a pass. The file's six sections:
     1 the contracts desk labels every real man's wage and years as this game's, and no made up man's
     2 the squad list does the same on every opened row, and its foot note shows when the squad holds a real man
     3 the dressing room does the same in every man's view
     4 the career card prints the worst defeat with our score first
     5 every render draws nothing and leaves the career byte equal
     6 nothing drawn reads undefined, NaN, [object Object] or Infinity

   Negative controls (CM_TABLES_TRUTH_CONTROL=<name>). Each rewrites ONE line in a temporary copy of a component
   (the real file is never written), refuses to run unless its anchor occurs exactly once and the copy differs,
   points the test at the copy with NO_DOUBLE_SWAP, and then demands the sections it names go red and nothing else:
     nomark        the "is he real" rule says nobody is        every case of sections 1, 2 and 3 red
     markall       the rule says everybody is                  the made up men's careers red in 1, 2 and 3
     defeatraw     the card prints the stored score raw        every case of section 4 red
     drawinrender  the squad row detail draws one random number  every case of section 5 red
   A control that fires exits 1 and says FIRED on its last line; a control that turns the wrong thing red, or
   nothing, exits 3. CM_TABLES_TRUTH_CONTROL=all runs the plain suite and then every control, and exits 0 only
   when the suite is green and all four fired.

   Run: node scripts/simCmTablesTruth.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/cmTablesTruth.test.tsx';
const SQUAD = 'src/components/club-manager/SquadScreen.tsx';
const PANEL = 'src/components/club-manager/ClubManagerCareerPanel.tsx';
const control = process.env.CM_TABLES_TRUTH_CONTROL || '';
const CONTROLS = {
  nomark: { file: SQUAD, alias: '@/components/club-manager/SquadScreen',
    anchor: '  return !p.generated && !p.isYouth && !p.academyGrad;', to: '  return false;', sections: ['1', '2', '3'] },
  markall: { file: SQUAD, alias: '@/components/club-manager/SquadScreen',
    anchor: '  return !p.generated && !p.isYouth && !p.academyGrad;', to: '  return true;', sections: ['1', '2', '3'] },
  defeatraw: { file: PANEL, alias: '@/components/club-manager/ClubManagerCareerPanel',
    anchor: '{lowFirst(c.careerStats.biggestDefeat.score)}', to: '{c.careerStats.biggestDefeat.score}', sections: ['4'] },
  drawinrender: { file: SQUAD, alias: '@/components/club-manager/SquadScreen',
    anchor: '  const interest = interestOf(p, career.incomingBids ?? [], money);', to: '  Math.random();\n  const interest = interestOf(p, career.incomingBids ?? [], money);', sections: ['5'] },
};
if (control && control !== 'all' && !CONTROLS[control]) {
  console.log(`FAIL: CM_TABLES_TRUTH_CONTROL=${control} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
/* The suite holds this many cases: the fleet check, ten careers in each of sections 1, 2, 3, 5 and 6, and 4 old
   saves plus 3 played seeds in section 4. A case that stops running is a failure. */
const EXPECTED_CASES = 58;

const held = [TEST, SQUAD, PANEL].map(f => [f, fs.readFileSync(path.join(root, f))]);
const parent = path.join(root, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, 'cm-tables-truth-'));
const report = path.join(folder, 'report.json');

const sectionOf = name => (/^(\d)\s/.exec(name) || [])[1] || '?';

function run(kind = '') {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (kind) {
    const c = CONTROLS[kind];
    const source = fs.readFileSync(path.join(root, c.file), 'utf8').replace(/\r\n/g, '\n');
    const count = source.split(c.anchor).length - 1;
    if (count !== 1) { console.log(`FAIL control ${kind}: its anchor occurs ${count} times in ${c.file}, so it would not change exactly one thing`); return 3; }
    const changed = source.replace(c.anchor, () => c.to);
    if (changed === source) { console.log(`FAIL control ${kind}: the copy is the same as ${c.file}`); return 3; }
    const copy = path.join(folder, `${path.basename(c.file, '.tsx')}-${kind}.tsx`);
    fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [c.alias]: copy });
  }
  fs.rmSync(report, { force: true });
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=json', '--outputFile', report, '--testTimeout=300000', '--hookTimeout=300000'],
    { cwd: root, env, encoding: 'utf8', timeout: 1200000, maxBuffer: 64 * 1024 * 1024 });
  const secs = Math.round((Date.now() - t0) / 1000);
  if (r.error || !fs.existsSync(report)) {
    console.log(`FAIL ${kind || 'suite'}: vitest gave no report (${r.error ? String(r.error) : `exit ${r.status}`}) ${String(r.stderr || '').slice(-600)}`);
    return 3;
  }
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  const rows = json.testResults.flatMap(f => f.assertionResults);
  const failed = rows.filter(x => x.status === 'failed');
  const fileErrors = json.testResults.filter(f => f.message).map(f => f.message);
  console.log(`   ${kind || 'suite'}: ${json.numTotalTests} cases, ${json.numPassedTests} passed, ${failed.length} failed, ${json.numPendingTests} skipped, ${secs}s`);
  if (fileErrors.length) { console.log(`FAIL ${kind || 'suite'}: the test file did not run: ${String(fileErrors[0]).slice(0, 600)}`); return 3; }
  if (json.numPendingTests > 0) { console.log(`FAIL ${kind || 'suite'}: ${json.numPendingTests} cases skipped`); return 3; }
  if (EXPECTED_CASES && json.numTotalTests !== EXPECTED_CASES) { console.log(`FAIL ${kind || 'suite'}: ${json.numTotalTests} cases ran, the suite holds ${EXPECTED_CASES}`); return 3; }
  if (!kind) {
    for (const f of failed) console.log(`   red: ${f.fullName}: ${String(f.failureMessages[0] || '').split('\n')[0].slice(0, 300)}`);
    return failed.length ? 1 : 0;
  }
  const want = new Set(CONTROLS[kind].sections);
  const stray = failed.filter(f => !want.has(sectionOf(f.fullName)));
  const bySection = {};
  for (const f of failed) bySection[sectionOf(f.fullName)] = (bySection[sectionOf(f.fullName)] || 0) + 1;
  for (const f of failed.slice(0, 40)) console.log(`   control ${kind} red: ${f.fullName}`);
  if (stray.length) { console.log(`FAIL control ${kind}: ${stray.length} cases outside sections ${[...want].join(', ')} went red, first ${stray[0].fullName}`); return 3; }
  const inSection = s => rows.filter(x => sectionOf(x.fullName) === s);
  if (kind === 'markall') {
    const madeUp = ['academy graduate', 'made up free agent', 'Dundee', 'Hertha'];
    for (const s of want) {
      for (const who of madeUp) {
        if (!failed.some(f => sectionOf(f.fullName) === s && f.fullName.includes(who))) { console.log(`FAIL control ${kind}: section ${s} stayed green for the career with ${who}`); return 3; }
      }
    }
  } else {
    for (const s of want) {
      const all = inSection(s);
      const red = all.filter(x => x.status === 'failed');
      if (!all.length || red.length !== all.length) { console.log(`FAIL control ${kind}: ${red.length} of ${all.length} cases of section ${s} went red, every one should`); return 3; }
    }
  }
  console.log(`CONTROL ${kind} FIRED: ${failed.length} cases red (${Object.entries(bySection).map(([s, n]) => `section ${s}: ${n}`).join(', ')}), none elsewhere`);
  return 1;
}

let code = 0;
try {
  if (!control || control === 'all') {
    code = run();
    console.log(code === 0 ? 'simCmTablesTruth: every case green' : 'simCmTablesTruth: FAIL, cases red above');
  }
  if (control === 'all') {
    const results = Object.keys(CONTROLS).map(k => [k, run(k)]);
    const misfired = results.filter(([, c]) => c !== 1);
    if (misfired.length) code = 3;
    console.log(`simCmTablesTruth all: suite ${code === 0 ? 'green' : 'red'}, controls ${results.map(([k, c]) => `${k} ${c === 1 ? 'fired' : 'DID NOT FIRE'}`).join(', ')}`);
  } else if (control) {
    code = run(control);
  }
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
  for (const [f, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, f)), bytes, `${f} must stay byte identical through the harness`);
}
process.exit(code);
