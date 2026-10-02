/* Round 864: actual facilities quotes must match the real committed upgrade.
   FACILITIES_PREVIEW_CONTROL=missing|budget changes only a temporary component.
   FACILITIES_PREVIEW_CONTROL=all runs normal and both asserted controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const test = 'src/test/facilitiesPreview.test.tsx';
const component = 'src/components/club-manager/FacilitiesScreen.tsx';
const control = process.env.FACILITIES_PREVIEW_CONTROL || '';
assert.ok(['', 'missing', 'budget', 'all'].includes(control), 'Unknown facilities preview control.');
const heldPaths = [component, test];
const heldBytes = heldPaths.map(file => fs.readFileSync(path.join(root, file)));
const source = fs.readFileSync(path.join(root, component), 'utf8').replace(/\r\n/g, '\n');
const parent = path.join(root, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, 'facilities-preview864-'));
const report = path.join(folder, 'report.json');
const copies = [];
const title = name => `Club Manager facilities preview ${name}`;
const quoteTargets = [
  title('quotes all four real upgrades without changing the career, callbacks or storage'),
  ...['stadium', 'trainingGround', 'medical', 'dressingRoom'].map(id => title(`makes the ${id} forecast become the actual engine level, effect and remaining budget`)),
  title('allows the exact affordable boundary and shows zero remaining before the real purchase'),
  title('previews the supported legacy facilities fallback without repairing the input during render'),
];

function run(kind = '') {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (kind) {
    const [anchor, replacement] = kind === 'missing'
      ? ['const next = canBuy ? upgradeFacility(career, id) : null;', 'const next = null;']
      : ['{money(next.budget)}', '{money(career.budget)}'];
    assert.equal(source.split(anchor).length - 1, 1, 'The actual component control anchor must occur once.');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'The control must change an asserted actual component quote.');
    const copy = path.join(folder, `FacilitiesScreen-${kind}.tsx`);
    fs.writeFileSync(copy, changed);
    copies.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/FacilitiesScreen': copy });
  }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--reporter=json', '--outputFile', report], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  assert.ok(!result.error, `${String(result.error)}\n${result.stderr || ''}`);
  assert.ok(fs.existsSync(report), 'The actual component suite must produce a JSON report.');
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(json.numTotalTests, 11, `Every actual component case must run. ${result.stdout || ''}\n${result.stderr || ''}`);
  assert.equal(json.numPendingTests, 0, 'No focused case may be skipped.');
  assert.equal(Number(json.numUnhandledErrors ?? 0), 0, 'No unhandled error may coexist with the asserted outcomes.');
  const failed = json.testResults.flatMap(file => file.assertionResults).filter(row => row.status === 'failed');
  if (!kind) {
    assert.equal(result.status, 0, failed.map(row => `${row.fullName}: ${row.failureMessages[0]}`).join('\n'));
    assert.equal(json.numPassedTests, 11);
    assert.equal(failed.length, 0);
    console.log('Facilities preview: 11/11 actual-screen cases passed with the real career and upgrade engine.');
    console.log('Facilities preview: four exact effect/level/budget quotes matched four actual committed upgrades.');
    console.log('Facilities preview: exact-budget purchases, insufficient funds, maximum levels and supported legacy defaults passed.');
    console.log('Facilities preview: rendering stayed read-only; no-op callbacks and native-button key routing/focus stayed intact.');
  } else {
    assert.notEqual(result.status, 0, 'The asserted control must reject the changed quote.');
    assert.deepEqual(failed.map(row => row.fullName).sort(), [...quoteTargets].sort(), 'Only the seven intended quote assertions may fail.');
    assert.equal(json.numPassedTests, 4);
    assert.ok(failed.every(row => row.failureMessages.some(message => /toHaveTextContent/.test(message))), 'Each targeted failure must be a real rendered quote assertion.');
    console.log(`Facilities preview control ${kind}: a unique actual quote anchor changed in an isolated component copy.`);
    console.log(`Facilities preview control ${kind}: seven intended rendered quote assertions failed; four independent blockers/callback/focus baselines passed.`);
    console.log(`Facilities preview control ${kind}: all11 cases ran with zero pending tests and unhandled errors.`);
    for (const row of failed) console.log(`Facilities preview control ${kind}: rejected ${row.fullName}.`);
  }
  fs.rmSync(report, { force: true });
}

try {
  if (!control || control === 'all') run();
  if (control === 'all') { run('missing'); run('budget'); }
  else if (control) run(control);
} finally {
  fs.rmSync(report, { force: true });
  copies.forEach(file => fs.rmSync(file, { force: true }));
  fs.rmdirSync(folder);
  heldPaths.forEach((file, index) => assert.deepEqual(fs.readFileSync(path.join(root, file)), heldBytes[index], `${file} must stay byte-identical through the harness.`));
}
console.log('Facilities preview cleanup: owned copies/reports removed; production component and test bytes stayed identical.');
