/* Round 878: actual committed MoneyApp receipts, with isolated executable controls.
   MONEY_APP_FEEDBACK_CONTROL changes only owned component/CSS copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = 'src/components/us-career/MoneyApp.tsx';
const cssFile = 'src/components/us-career/MoneyAppFeedback.module.css';
const test = 'src/test/moneyAppFeedback.test.tsx';
const files = [component, cssFile, test, 'src/lib/careerMoney.ts', ...['nfl', 'nba', 'mlb', 'nhl'].map(sport => `src/lib/${sport}CareerMoney.ts`)];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = {
  deposit: 'announces the actual NFL deposit and only the two changed buckets',
  consumed: 'consumes a declined local action before any unrelated later committed props',
  restored: 'keeps a recovered account quiet with its exact latest statement and balances',
  passive: 'does not replay a receipt or highlight a new passive ledger line after prop clones',
  capped: 'restarts one real receipt for repeated identical transactions at the ledger cap',
  navigation: 'does not restart the statement cue when returning to Account after a transaction',
  motion: 'keeps feedback finite with an explicit visible static reduced-motion state',
};
const baselines = [
  'preserves exact account payloads balances and statement amounts without changing the career rules',
  'preserves market navigation and the sport shop without dispatching money actions',
];
const consumeAnchor = '    const before = pending.current;\n    pending.current = null;\n    if (!before) return;\n    const changed = ([\'cash\', \'vault\', \'invested\'] as const).filter(key => bank[key] !== before[key]);\n    const ledgerChanged = JSON.stringify(bank.entries) !== JSON.stringify(before.entries);\n    const entry = bank.entries[0];\n    if (!entry || (changed.length === 0 && !ledgerChanged)) return;\n    setLedgerCue(tab === \'account\');\n    setReceipt({ id: attempt, entry, changed });';
const controls = {
  consumed: [component, consumeAnchor, consumeAnchor.replace('    pending.current = null;\n', '').replace('    setReceipt(', '    pending.current = null;\n    setReceipt('), titles.consumed],
  capped: [component, 'if (!entry || (changed.length === 0 && !ledgerChanged)) return;', 'if (!entry || !ledgerChanged) return;', titles.capped],
  amount: [component, "{receipt.entry.a >= 0 ? '+' : ''}{fmt(receipt.entry.a)}", "{receipt.entry.a >= 0 ? '+' : ''}{fmt(Math.abs(receipt.entry.a))}", titles.deposit],
  buckets: [component, "receipt?.changed.includes('invested') && motion.changed", 'receipt && motion.changed', titles.deposit],
  latest: [component, 'i === 0 && ledgerCue && receipt && e.t === receipt.entry.t && e.a === receipt.entry.a && e.y === receipt.entry.y && motion.latest', 'i === 0 && ledgerCue && receipt && motion.latest', titles.passive],
  navigation: [component, 'setLedgerCue(false);', 'void ledgerCue;', titles.navigation],
  sequence: [component, '<div key={receipt.id} role="status"', '<div key="receipt" role="status"', titles.capped],
  status: [component, '<div key={receipt.id} role="status"', '<div key={receipt.id}', titles.deposit],
  restored: [component, 'useState<Receipt | null>(null)', "useState<Receipt | null>(() => { const saved = bankSummary(host, sport); return saved.entries[0] ? { id: 0, entry: saved.entries[0], changed: ['cash'] } : null; })", titles.restored],
  finite: [cssFile, 'animation: balanceChange 560ms ease-out;', 'animation: balanceChange 1560ms ease-out;', titles.motion],
  reduced: [cssFile, 'animation: none;', 'animation: balanceChange 560ms ease-out;', titles.motion],
};
const control = process.env.MONEY_APP_FEEDBACK_CONTROL || '';
assert.ok(!control || control in controls, 'Known MoneyApp feedback control');
for (const [file, anchor] of Object.values(controls)) {
  const source = held.find(([name]) => name === file)[1].source;
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const originalBytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Actual copied controls bind once under CRLF');
  assert.deepEqual(crlfBytes, originalBytes, 'CRLF source bytes held');
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/money-feedback878-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  delete env.MONEY_APP_FEEDBACK_CSS;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const [targetFile, anchor, replacement, title] = controls[control];
    const componentSource = held.find(([file]) => file === component)[1].source;
    const cssSource = held.find(([file]) => file === cssFile)[1].source;
    const original = targetFile === component ? componentSource : cssSource;
    assert.equal(original.split(anchor).length - 1, 1, 'Control changes one actual executable binding');
    const changed = original.replace(anchor, replacement); assert.notEqual(changed, original);
    const componentCopy = path.join(folder, 'MoneyApp.tsx');
    const cssCopy = path.join(folder, 'MoneyAppFeedback.module.css');
    await writeFile(componentCopy, targetFile === component ? changed : componentSource); owned.push(componentCopy);
    await writeFile(cssCopy, targetFile === cssFile ? changed : cssSource); owned.push(cssCopy);
    env.MONEY_APP_FEEDBACK_CSS = cssCopy;
    env.NO_DOUBLE_SWAP = JSON.stringify({
      '@/components/us-career/MoneyApp': componentCopy,
      '@/components/us-career/MoneyAppFeedback.module.css': cssCopy,
    });
    args.push('--testNamePattern', [title, ...baselines].join('|'));
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 19);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 2); assert.equal(report.numPendingTests, 16);
    const title = controls[control][3], failed = rows.filter(row => row.status === 'failed');
    assert.deepEqual(failed.map(row => row.title), [title]);
    for (const baseline of baselines) assert.equal(rows.find(row => row.title === baseline)?.status, 'passed');
    assert.match(failed[0].failureMessages.join('\n'), /AssertionError:|expect\(element\)|TestingLibraryElementError: Unable to find an accessible element with the role/);
    console.log(`MoneyApp feedback ${control}: one executable binding changed in an isolated component/CSS copy.`);
    console.log(`MoneyApp feedback ${control}: one intended outcome failed, both original financial/navigation baselines held,16 explicit skips.`);
    console.log(`MONEY_FEEDBACK_CONTROL: ${JSON.stringify({ control, title, messages: failed[0].failureMessages })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 19); assert.equal(report.numPendingTests, 0);
    console.log('MoneyApp feedback:19/19 focused cases passed with the actual shared component and real moneyAct engine; none skipped.');
    console.log('MoneyApp feedback: all four sport descriptors retain exact deposit payloads, balances, unchanged transfer wealth and newest signed statement.');
    console.log('MoneyApp feedback: actual withdrawals, two trade fees, holding units, winning/losing card outcomes, seed and one-sitting rule remain exact.');
    console.log('MoneyApp feedback: fresh/recovered accounts, passive prop clones and declined actions stay quiet; local intent cannot survive a later unrelated update.');
    console.log('MoneyApp feedback: identical capped-ledger transactions produce one new receipt and only actually changed balances/latest committed entry get finite cues.');
    console.log('MoneyApp feedback: returning to Account does not replay a statement cue; an actual new Account action still earns a new one.');
    console.log('MoneyApp feedback: existing account controls, market/back/shop navigation and focus stay intact; source CSS bounds motion at600ms and declares a visible reduced-motion state.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Production component/CSS/test/financial engine and descriptor bytes held');
  }
}
console.log('MoneyApp feedback: CRLF copied controls bind, original bytes held, owned temporary files cleaned. Native geometry/motion acceptance remains separate.');
