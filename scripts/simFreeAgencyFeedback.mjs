/* Round 884: real negotiated offers with isolated executable feedback controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = 'src/components/us-career/FreeAgencyPanel.tsx';
const cssFile = 'src/components/us-career/FreeAgencyFeedback.module.css';
const test = 'src/test/freeAgencyFeedback.test.tsx';
const files = [component, cssFile, test, 'src/lib/usCareerFreeAgency.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = {
  raised: 'announces only the raised offer with exact earned annual term and total differences',
  held: 'announces a held engine result without claiming extra money or contract years',
  withdrawn: 'announces a withdrawn offer and keeps other original signing options available',
  restored: 'keeps restored and passive resolved offers quiet without an owned push',
  consumed: 'consumes a no-op push before any matching passive offer response can arrive',
  repeat: 'does not replay an earned receipt on prop clones or a repeated disabled Push',
  replacement: 'clears stale negotiation feedback when a new unpushed window replaces the market',
  raisedFocus: 'hands raised Push opener focus to its local result with preventScroll',
  withdrawnFocus: 'hands withdrawn Push opener focus to its local result with preventScroll',
  outside: 'preserves deliberate connected outside focus while the push response commits',
  motion: 'bounds earned feedback to one short animation and declares static reduced motion',
};
const baselines = [
  'preserves original offer order exact terms and signing indices as an independent baseline',
  'preserves the real one-use negotiation and exact callback index as an independent baseline',
];
const controls = {
  consumed: [component, '      setIntent(null);', '      void intent;', [titles.consumed]],
  annual: [component, 'Math.abs(annualChange)', 'Math.abs(annualChange) + 1', [titles.raised]],
  years: [component, '${yearsChange} year', '${yearsChange + 1} year', [titles.raised]],
  total: [component, 'Math.abs(totalChange)', 'Math.abs(totalChange) + 1', [titles.raised]],
  local: [component, 'intent?.index === i && outcome && motion.offer', 'outcome && motion.offer', [titles.raised]],
  receipt: [component, "', motion.receipt)}>", "')}>", [titles.raised]],
  status: [component, '<p ref={receipt} role="status"', '<p ref={receipt}', [titles.raised, titles.held, titles.withdrawn, titles.repeat, titles.replacement, titles.raisedFocus, titles.withdrawnFocus, titles.outside]],
  focus: [component, 'receipt.current?.focus({ preventScroll: true });', 'void receipt.current;', [titles.raisedFocus, titles.withdrawnFocus]],
  focusOwner: [component, 'active === intent.opener || active === document.body || !active?.isConnected', 'true', [titles.outside]],
  restored: [component, 'useState<PushIntent | null>(null)', 'useState<PushIntent | null>(() => { const index = w.offers.findIndex(offer => offer.pushed); return index < 0 ? null : { index, offer: w.offers[index], window: { ...w }, opener: document.body as HTMLButtonElement }; })', [titles.restored]],
  replacement: [component, '&& settled.pushed;', '&& true;', [titles.replacement]],
  finite: [cssFile, 'animation: offerReply 550ms ease-out 1;', 'animation: offerReply 1550ms ease-out 1;', [titles.motion]],
  reduced: [cssFile, 'animation: none;', 'animation: offerReply 550ms ease-out 1;', [titles.motion]],
};
const control = process.env.FREE_AGENCY_FEEDBACK_CONTROL || '';
assert.ok(!control || control in controls, 'Known free-agency feedback control');
for (const [file, anchor] of Object.values(controls)) {
  const source = held.find(([name]) => name === file)[1].source;
  assert.equal(source.split(anchor).length - 1, 1, 'Control binds one actual executable expression');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const originalBytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Actual control binds once with CRLF source');
  assert.deepEqual(crlfBytes, originalBytes, 'CRLF source bytes held');
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/free-agency884-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP; delete env.FREE_AGENCY_FEEDBACK_CSS;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const [target, anchor, replacement] = controls[control];
    const componentSource = held.find(([file]) => file === component)[1].source;
    const cssSource = held.find(([file]) => file === cssFile)[1].source;
    const original = target === component ? componentSource : cssSource;
    const changed = original.replace(anchor, replacement); assert.notEqual(changed, original, 'Control actually changes source');
    const componentCopy = path.join(folder, 'FreeAgencyPanel.tsx'), cssCopy = path.join(folder, 'FreeAgencyFeedback.module.css');
    await writeFile(componentCopy, target === component ? changed : componentSource); owned.push(componentCopy);
    await writeFile(cssCopy, target === cssFile ? changed : cssSource); owned.push(cssCopy);
    env.FREE_AGENCY_FEEDBACK_CSS = cssCopy;
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/us-career/FreeAgencyPanel': componentCopy, '@/components/us-career/FreeAgencyFeedback.module.css': cssCopy });
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 13);
  for (const baseline of baselines) assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Original engine and signing baseline held');
  if (control) {
    const expected = controls[control][3], failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 13 - expected.length);
    assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
    assert.ok(rows.every(row => row.status === 'failed' || row.status === 'passed'), 'All thirteen outcomes execute');
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|expect\(element\)|TestingLibraryElementError: Unable to find an accessible element with the role/);
    console.log(`Free-agency feedback ${control}: one executable source binding changed in an isolated component/CSS copy.`);
    console.log(`Free-agency feedback ${control}: ${expected.length} intended failures, ${13 - expected.length} independent passes, no skipped cases.`);
    console.log(`FA_FEEDBACK_CONTROL: ${JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, messages: row.failureMessages })) })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 13); assert.equal(report.numFailedTests, 0);
    console.log('Free-agency feedback:13/13 actual shared-component and real pushFaOffer cases passed; none skipped.');
    console.log('Free-agency feedback: raised11.3M x3years, held10M x2years and withdrawn offers preserve exact engine state, signing indices and one-use callbacks.');
    console.log('Free-agency feedback: only the committed requested offer announces actual annual/year/total deltas or held/withdrawn terms.');
    console.log('Free-agency feedback: restored/passive/no-op windows stay quiet, replacement markets clear stale feedback and prop clones cannot replay the earned receipt.');
    console.log('Free-agency feedback: opener focus uses preventScroll, intentional outside focus is held and only the earned card/receipt gets bounded motion with explicit reduced CSS.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Original component/CSS/test/negotiation engine bytes held');
  }
}
console.log('Free-agency feedback: CRLF controls bind, original bytes held and owned copies cleaned. Fictional offers and final-entrance JSDOM fixture do not prove native layout or career persistence.');
