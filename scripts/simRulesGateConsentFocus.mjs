/* Round 858: original RulesGate preserves rules, consent choices and help focus.
   RULES_GATE_FOCUS_CONTROL=host or return removes a real protection in a copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.RULES_GATE_FOCUS_CONTROL || '';
assert.ok(['', 'host', 'return'].includes(control), 'Known RulesGate focus control');
const files = ['src/components/game/RulesGate.tsx', 'src/components/CookieConsent.tsx', 'src/lib/consentedScripts.ts'];
const held = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/rules-gate-focus-'));
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchors = {
      host: ['{open && <div data-dukb-help-cookie-choices="" className="empty:hidden" />}', '{null}'],
      return: ['triggerRef.current?.focus({ preventScroll: true });', 'void triggerRef.current;'],
    };
    const source = held[0][1].toString('utf8');
    const [anchor, replacement] = anchors[control];
    assert.equal(source.split(anchor).length - 1, 1, 'Control changes a real portal host or focus call once');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source);
    const copy = path.join(folder, 'RulesGate.tsx');
    await writeFile(copy, changed);
    owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/game/RulesGate': copy });
  }
  const reportFile = path.join(folder, 'report.json');
  owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/rulesGateConsentFocus.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner faults do not count as product checks');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 9);
  assert.equal(report.numPendingTests, 0);
  if (control) {
    const titles = control === 'host' ? [
      'Essential only is reachable within first-entry rules and preserves its consent gate',
      'Accept is reachable within first-entry rules and preserves its consent gate',
      'restores one bottom banner when rules close without a cookie decision',
      'puts newly pending storage choices back into the same open rules',
    ] : ['Escape', 'Close', "Let's Play!"].map(close => `returns to the exact manually opened help control after ${close}`);
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, titles.length);
    assert.equal(report.numPassedTests, 9 - titles.length);
    for (const title of titles) {
      const row = rows.find(candidate => candidate.title === title);
      assert.equal(row?.status, 'failed');
      assert.match(row.failureMessages.join('\n'), /expect\(element\)\.(?:toHaveFocus|toContainElement)/);
    }
    assert.equal(rows.find(row => row.title.startsWith('retains the normal modal trap'))?.status, 'passed');
    assert.equal(rows.find(row => row.title.startsWith('preserves first-entry instructions'))?.status, 'passed');
    console.log(`simRulesGateConsentFocus ${control}: executable ${control === 'host' ? 'cookie host' : 'focus return'} mutation applied once to a disposable component.`);
    console.log(`simRulesGateConsentFocus ${control}: ${titles.length} intended actual-outcome assertions fail.`);
    console.log(`simRulesGateConsentFocus ${control}: ${9 - titles.length} independent outcomes stay green, none skipped.`);
    console.log(`simRulesGateConsentFocus ${control}: original trap and seen-per-route instructions baseline both pass.`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 9);
    assert.equal(report.numFailedTests, 0);
    console.log('simRulesGateConsentFocus: nine actual RulesGate outcomes pass, no cases skipped.');
    console.log('simRulesGateConsentFocus: Essential and Accept share one keyboard focus scope without automatic consent.');
    console.log('simRulesGateConsentFocus: original script gate, storage updates and one bottom banner after dismissal hold.');
    console.log('simRulesGateConsentFocus: Escape, Close and Let\'s Play return to the exact manual help control.');
    console.log('simRulesGateConsentFocus: normal trap, instructions and existing seen-per-route behavior stay intact.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, bytes] of held) assert.deepEqual(await readFile(path.join(root, file)), bytes, 'Actual component and script bytes held');
}
console.log('simRulesGateConsentFocus: source held, owned copies cleaned, no backend or vendor requests.');
