import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('src/test/controls/consent1442/manifest.json', 'utf8'));
const out = path.resolve(process.env.LEGAL_PRIVACY_OUT || 'legal-privacy-artifacts', 'consent-controls');
fs.mkdirSync(out, { recursive: true });
const controls = manifest.files.map(row => {
  if (row.name === 'expiredDraft') return { ...row,
    old: row.old.replace('if (!saved) setAdvertising(false);',
      'if (!saved && !advertisingEdited.current) setAdvertising(next.advertising);\n      if (!saved && !explicitlyOpen.current) setAnalytics(false);'),
  };
  if (row.name === 'durableShadow') return { ...row,
    old: 'const raw = window.localStorage.getItem(CONSENT_KEY);', new: 'const raw = safeLocalStorage.getItem(CONSENT_KEY);',
  };
  if (row.name === 'gpcRestore') return { ...row,
    old: 'writeConsentPreferences({ advertising: false, analytics: saved.analytics }, saved.updatedAt);',
  };
  if (row.name === 'analyticsCollection') return { ...row,
    source: 'src/lib/consentPreferences.ts', alias: '@/lib/consentPreferences',
    old: 'value.analytics && value.analyticsOptIn === 1', new: 'value.analytics',
    test: 'src/test/consentWithdrawal1442.test.ts',
    testName: 'requires a new analytics opt-in even when a previous record contains analytics true',
  };
  return row;
});
const report = { cases: [], complete: false };
for (const row of controls) {
  const bytes = fs.readFileSync(row.source);
  const original = bytes.toString('utf8').replace(/\r\n/g, '\n');
  assert.equal(original.split(row.old).length - 1, 1, row.name + ' exact unique fault target');
  const copy = original.replace(row.old, row.new);
  assert.notEqual(original, copy);
  const controlFile = path.join(out, row.name + path.extname(row.source));
  fs.writeFileSync(controlFile, copy);
  for (const control of [false, true]) {
    const name = row.name + (control ? '-fault' : '-actual');
    const jsonFile = path.join(out, name + '.json');
    const env = { ...process.env };
    delete env.NO_DOUBLE_SWAP;
    if (control) env.NO_DOUBLE_SWAP = JSON.stringify({ [row.alias]: controlFile });
    const args = ['node_modules/vitest/vitest.mjs', 'run', row.test, '-t', row.testName, '--maxWorkers=1', '--minWorkers=1', '--reporter=json', '--outputFile=' + jsonFile];
    const child = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(out, name + '.stdout.log'), child.stdout || '');
    fs.writeFileSync(path.join(out, name + '.stderr.log'), child.stderr || '');
    assert(!child.error && !child.signal, name + ' completes normally');
    const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const selected = result.testResults.flatMap(suite => suite.assertionResults).filter(test => test.title === row.testName);
    assert.equal(selected.length, 1, name + ' selects exactly the intended case');
    assert.equal(child.status, control ? 1 : 0);
    assert.equal(selected[0].status, control ? 'failed' : 'passed');
    assert.equal(result.numFailedTests, control ? 1 : 0);
    if (control) assert(selected[0].failureMessages.some(message => /AssertionError|expected|^Error: expect\(element\)\.not\.toBeChecked\(\)/i.test(message.replace(/\u001b\[[0-9;]*m/g, ''))), name + ' fails on the actual expectation');
    report.cases.push({ name, controlledFault: control, exit: child.status, selectedStatus: selected[0].status });
    console.log(`Consent withdrawal: ${name}, expected ${selected[0].status}.`);
  }
  assert.deepEqual(fs.readFileSync(row.source), bytes, 'Actual source stays unchanged');
}
report.complete = true;
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Consent withdrawal: PASS, ${manifest.files.length} actual outcomes and ${manifest.files.length} effective copied faults.`);
