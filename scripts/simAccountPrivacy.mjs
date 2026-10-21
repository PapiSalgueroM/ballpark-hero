import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const out = path.resolve(process.env.LEGAL_PRIVACY_OUT || 'legal-privacy-artifacts', 'account-controls');
fs.mkdirSync(out, { recursive: true });
const sourceFile = path.resolve('supabase/functions/account-privacy/handler.ts');
const original = fs.readFileSync(sourceFile, 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const sourceHash = hash(original);
const temp = fs.mkdtempSync(path.join(tmpdir(), 'dukb-account-privacy-'));
const report = { sourceHash, cases: [], complete: false };
const B = '22222222-2222-4222-8222-222222222222';
const faults = [
  ['removed-current-auth', 'const user = await services.getUser(token);', "const user = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.test', created_at: '2026-01-01', factors: [] };"],
  ['cross-account-export', 'const data = await services.exportData(user.id);', `const data = await services.exportData('${B}');`],
  ['ignored-password-confirmation', "if (confirmedId !== user.id) return json({ ok: false, error: 'password_not_confirmed' }, 403);", 'void confirmedId;'],
];
function run(name, replacement) {
  const jsonFile = path.join(out, name + '.json');
  const env = { ...process.env };
  delete env.ACCOUNT_PRIVACY_HANDLER;
  if (replacement) {
    const [, needle, value] = replacement;
    assert.equal(original.split(needle).length - 1, 1, name + ' has exactly one actual source target');
    const changed = original.replace(needle, value);
    assert.notEqual(changed, original);
    const file = path.join(temp, name + '.ts');
    fs.writeFileSync(file, changed);
    env.ACCOUNT_PRIVACY_HANDLER = file;
  }
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.account-privacy.config.ts', '--maxWorkers=1', '--minWorkers=1', '--reporter=json', '--outputFile=' + jsonFile];
  const child = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr.log'), child.stderr || '');
  assert(!child.error && !child.signal, name + ' must finish normally');
  const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  assert(result.numTotalTests > 0, name + ' must execute tests');
  if (replacement) {
    assert.equal(child.status, 1, name + ' must produce an actual test failure');
    assert(result.numFailedTests > 0, name + ' must fail assertions');
    assert.equal(result.numTotalTests, report.cases[0].tests, name + ' must collect the complete same suite');
    assert(result.testResults.some(row => row.assertionResults.some(test => test.status === 'failed' && test.failureMessages.some(message => /AssertionError|expected/i.test(message)))), name + ' must fail on the security expectation');
  } else {
    assert.equal(child.status, 0, name + ' must pass');
    assert.equal(result.numFailedTests, 0);
  }
  report.cases.push({ name, exit: child.status, tests: result.numTotalTests, failed: result.numFailedTests, controlledFault: !!replacement });
  console.log(`Account privacy: ${name}, ${result.numTotalTests} tests, ${result.numFailedTests} assertion failures, expected exit ${child.status}.`);
}
try {
  run('actual');
  for (const fault of faults) run(fault[0], fault);
  report.complete = true;
} finally {
  assert.equal(hash(fs.readFileSync(sourceFile)), sourceHash, 'Actual handler bytes stay unchanged');
  // This directory was created by this invocation for copied faults only.
  fs.rmSync(temp, { recursive: true, force: true });
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log('Account privacy: PASS, actual security cases and all copied faults verified.');
