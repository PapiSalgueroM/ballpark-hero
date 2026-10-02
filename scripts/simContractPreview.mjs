/* Round 868: actual renewal previews must match the real committed contract.
   CONTRACT_PREVIEW_CONTROL=budget|fee|cap changes a disposable component only.
   CONTRACT_PREVIEW_CONTROL=all runs normal and all three asserted controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const test = 'src/test/contractPreview.test.tsx';
const component = 'src/components/club-manager/ContractsCard.tsx';
const control = process.env.CONTRACT_PREVIEW_CONTROL || '';
assert.ok(['', 'budget', 'fee', 'cap', 'all'].includes(control), 'Unknown contract preview control.');
const heldPaths = [component, test, 'src/lib/clubManager.ts'];
const heldBytes = heldPaths.map(file => fs.readFileSync(path.join(root, file)));
const source = fs.readFileSync(path.join(root, component), 'utf8').replace(/\r\n/g, '\n');
const parent = path.join(root, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, 'contract-preview868-'));
const report = path.join(folder, 'report.json');
const copies = [];
const title = name => `Club Manager contract preview ${name}`;
const capTargets = ['plain', 'clause'].map(kind => title(`warns about the ${kind} soft cap but preserves an affordable over-cap renewal`));
const quoteTargets = [
  title('shows both complete real renewal quotes without mutating career or saving'),
  ...['plain', 'clause'].map(kind => title(`makes the ${kind} forecast become the real contract budget wage and saved deal`)),
  ...['plain', 'clause'].map(kind => title(`allows the exact ${kind} fee boundary and really leaves zero in the kitty`)),
  ...capTargets,
  title('quotes the full renewal behind Remove and really deletes the existing clause'),
  title('uses supported missing wage and cap defaults without repairing the input'),
];

function run(kind = '') {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (kind) {
    const anchors = {
      budget: ['{money(next.budget)}', '{money(career.budget)}'],
      fee: ['a week. {money(terms.fee)} to sign.</p>', 'a week. {money(0)} to sign.</p>'],
      cap: ['nextBill !== null && nextBill > cap &&', 'false && nextBill !== null && nextBill > cap &&'],
    };
    const [anchor, replacement] = anchors[kind];
    assert.equal(source.split(anchor).length - 1, 1, 'The executable quote control anchor must occur exactly once.');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'The control must change the actual rendered forecast.');
    const copy = path.join(folder, `ContractsCard-${kind}.tsx`);
    fs.writeFileSync(copy, changed);
    copies.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/ContractsCard': copy });
  }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--reporter=json', '--outputFile', report], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  assert.ok(!result.error, `${String(result.error)}\n${result.stderr || ''}`);
  assert.ok(fs.existsSync(report), 'The actual component suite must produce a JSON report.');
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(json.numTotalTests, 13, `Every component case must run. ${result.stdout || ''}\n${result.stderr || ''}`);
  assert.equal(json.numPendingTests, 0, 'No focused case may be skipped.');
  assert.equal(Number(json.numUnhandledErrors ?? 0), 0, 'No unhandled error may coexist with assertion results.');
  const failed = json.testResults.flatMap(file => file.assertionResults).filter(row => row.status === 'failed');
  if (!kind) {
    assert.equal(result.status, 0, failed.map(row => `${row.fullName}: ${row.failureMessages[0]}`).join('\n'));
    assert.equal(json.numPassedTests, 13);
    assert.equal(failed.length, 0);
    console.log('Contract preview: 13/13 actual-screen cases passed with real careers and renewal engines.');
    console.log('Contract preview: plain and clause forecasts matched actual contracts, money, wages and saved/reloaded deals.');
    console.log('Contract preview: exact-fee boundaries, insufficient money and affordable over-cap renewals passed.');
    console.log('Contract preview: clause removal, supported wage/cap defaults, read-only rendering and unchanged callback/key routing passed.');
  } else {
    const targets = kind === 'cap' ? capTargets : quoteTargets;
    assert.equal(result.status, 1, 'The changed forecast must cause an assertion failure.');
    assert.deepEqual(failed.map(row => row.fullName).sort(), [...targets].sort(), 'Only intended rendered forecast assertions may fail.');
    assert.equal(json.numPassedTests, 13 - targets.length);
    assert.ok(failed.every(row => row.failureMessages.some(message => /toHaveTextContent/.test(message))), 'Each targeted failure must assert rendered forecast content.');
    console.log(`Contract preview control ${kind}: one unique executable forecast anchor changed in an isolated component.`);
    console.log(`Contract preview control ${kind}: ${targets.length} intended content assertions failed; ${13 - targets.length} independent cases stayed green.`);
    console.log(`Contract preview control ${kind}: all13 cases ran with zero pending tests and unhandled errors.`);
    for (const row of failed) console.log(`Contract preview control ${kind}: rejected ${row.fullName}.`);
  }
  fs.rmSync(report, { force: true });
}

try {
  if (!control || control === 'all') run();
  if (control === 'all') { run('budget'); run('fee'); run('cap'); }
  else if (control) run(control);
} finally {
  fs.rmSync(report, { force: true });
  copies.forEach(file => fs.rmSync(file, { force: true }));
  fs.rmdirSync(folder);
  heldPaths.forEach((file, index) => assert.deepEqual(fs.readFileSync(path.join(root, file)), heldBytes[index], `${file} must stay byte-identical through the harness.`));
}
console.log('Contract preview cleanup: owned copies/reports removed; production component, engine and test bytes stayed identical.');
