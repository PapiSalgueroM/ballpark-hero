/* Round 855: one real cookie region shares the initial rules focus scope.
   HELP_CONSENT_FOCUS_CONTROL=external keeps the choices outside in a copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.HELP_CONSENT_FOCUS_CONTROL || '';
assert.ok(['', 'external'].includes(control), 'Known help consent control');
const files = ['src/components/CookieConsent.tsx', 'src/components/game/HowToPlayPopover.tsx', 'src/lib/consentedScripts.ts'];
const original = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/help-consent-'));
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = original[0][1].toString('utf8');
    const anchor = "document.querySelector<HTMLElement>('[data-dukb-help-cookie-choices]')";
    assert.equal(source.split(anchor).length - 1, 1, 'Control changes the actual portal target once');
    const changed = source.replace(anchor, 'null');
    assert.notEqual(changed, source);
    const copy = path.join(folder, 'CookieConsent.tsx');
    await writeFile(copy, changed);
    owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/CookieConsent': copy });
  }
  const reportFile = path.join(folder, 'report.json');
  owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/helpConsentFocus.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner errors do not count as defect checks');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 7);
  assert.equal(report.numPendingTests, 0);
  if (control) {
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, 5);
    assert.equal(report.numPassedTests, 2);
    const intended = [
      'Essential only receives focus inside initial rules and keeps its original consent behavior',
      'Accept receives focus inside initial rules and keeps its original consent behavior',
      'keeps its single pending banner reachable when initial help is dismissed',
      'reuses the banner and its choices when help is reopened without a decision',
      'honors storage choices and restores pending choices within the same open rules',
    ];
    for (const title of intended) {
      const row = rows.find(candidate => candidate.title === title);
      assert.equal(row?.status, 'failed');
      assert.match(row.failureMessages.join('\n'), /expect\(element\)\.(?:toHaveFocus|toContainElement)/);
    }
    assert.equal(rows.find(row => row.title.startsWith('preserves the normal modal trap'))?.status, 'passed');
    assert.equal(rows.find(row => row.title.startsWith('keeps the original focused bottom banner'))?.status, 'passed');
    console.log('simHelpConsentFocus external: five actual focus-scope assertions reject the outside portal; two independent answered-consent and ordinary-banner baselines pass.');
    for (const title of intended) console.log(`simHelpConsentFocus external: rejected ${title}.`);
    console.log('simHelpConsentFocus external: answered-consent trapping and the ordinary bottom banner still pass independently.');
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 7);
    assert.equal(report.numFailedTests, 0);
    console.log('simHelpConsentFocus: seven real-dialog outcomes pass for both choices, unchanged script gate, one region, dismissal, reopening, storage updates and normal trap.');
    console.log('simHelpConsentFocus: both initial-rules choices preserve their storage value, script gate and single consent-change event.');
    console.log('simHelpConsentFocus: three pending-choice lifecycle cases pass for dismissal, reopening and cross-tab storage updates.');
    console.log('simHelpConsentFocus: two independent baselines pass for the answered-consent modal trap and focused ordinary bottom banner.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, bytes] of original) assert.deepEqual(await readFile(path.join(root, file)), bytes, 'Actual component and script bytes held');
}
console.log('simHelpConsentFocus: real source held, disposable copies cleaned, no vendor requests.');
