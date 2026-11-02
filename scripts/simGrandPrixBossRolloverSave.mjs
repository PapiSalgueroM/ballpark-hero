import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1');
assert.equal(process.env.SIM_NETWORK, 'offline');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = 'src/hooks/useGrandPrixBoss.ts', TEST = 'src/test/grandPrixBossRolloverSave.test.tsx';
const OLD = 'scripts/qa/source-controls/useGrandPrixBoss.before-rollover.ts.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = [HOOK, TEST, OLD, 'src/lib/grandPrixBoss.ts', 'src/lib/saveFence.ts', 'src/hooks/useSaveFenceWatch.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'];
const held = new Map(paths.map(file => [file, fs.readFileSync(path.join(root, file))]));
const original = held.get(HOOK), source = original.toString('utf8');
assert.equal(sha(held.get(OLD)), 'be8ac387c5b3158788d28b2186155c137c4a89d6fff30fd571df4d86965ec046');
assert.equal(sha(held.get(TEST)), '37b5dc1988904f28694e909488c8bc9007dc6f14cf0bd0938aa08ce77e3f9f3f');
assert.equal(sha(held.get('src/lib/grandPrixBoss.ts')), 'cae28d2852bfa6f23ffc5afca171486d017809327caded4cbf63f300f3fd8db0');
const message = "  if (action.type === 'startNextSeason') return 'Season ' + career.season + ' is ready. Team saved.';\n";
assert.equal(source.split(message).length, 2);
assert.equal(source.replace(message, ''), held.get(OLD).toString('utf8'), 'Exactly one message line differs from qualified market hook');
const outBase = path.resolve(process.env.GP_BOSS_ROLLOVER_SAVE_OUT || os.tmpdir());
fs.mkdirSync(outBase, { recursive: true });
const out = fs.mkdtempSync(path.join(outBase, 'dukb-grand-prix-rollover-save-'));
const copy = path.join(out, 'useGrandPrixBoss.ts');
const ids = ['GP_HOOK_ROLLOVER_SAVE:', 'GP_HOOK_ROLLOVER_QUOTA:'];
const results = [];
function run(name, file = null, failures = new Map()) {
  const reportFile = path.join(out, name + '.json'), env = { ...process.env };
  for (const key of ['GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'GP_BOSS_PAGE_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  if (file) env.GP_BOSS_HOOK_FILE = file;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, failures.size ? 1 : 0);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.success, failures.size === 0); assert.equal(report.numTotalTests, 2);
  assert.equal(report.numPassedTests, 2 - failures.size); assert.equal(report.numFailedTests, failures.size);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert.equal(report.testResults.length, 1); assert(report.testResults[0].name.endsWith('/' + TEST));
  const cases = report.testResults[0].assertionResults, seen = new Set(); assert.equal(cases.length, 2);
  for (const row of cases) {
    const matches = ids.filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1);
    const id = matches[0]; assert(!seen.has(id)); seen.add(id);
    const marker = failures.get(id); assert.equal(row.status, marker ? 'failed' : 'passed');
    assert.equal(row.failureMessages.length, marker ? 1 : 0);
    if (marker) { assert.match(row.failureMessages[0], /AssertionError:/); assert(row.failureMessages[0].includes(marker)); }
  }
  const runtimeCounters = { numUnhandledErrors: report.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null };
  for (const value of Object.values(runtimeCounters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
  for (const errors of [report.errors, report.unhandledErrors]) if (Array.isArray(errors)) assert.equal(errors.length, 0);
  const raw = (child.stdout || '') + '\n' + (child.stderr || '');
  assert(!/(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test(raw));
  for (const [filePath, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, filePath)), bytes, 'Held source: ' + filePath);
  const result = { name, passed: 2 - failures.size, ownedFailures: failures.size, declaredSkips: 0, rawExit: child.status, runtimeCounters,
    runtimeCounterCompleteness: Object.values(runtimeCounters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED' };
  results.push(result); console.log(name + ': ' + result.passed + ' passes, ' + result.ownedFailures + ' owned assertion failures, zero skips.');
}
try {
  run('current');
  fs.writeFileSync(copy, original); assert.equal(sha(fs.readFileSync(copy)), sha(original)); run('healthy-copy', copy);
  fs.writeFileSync(copy, held.get(OLD)); assert.notEqual(sha(fs.readFileSync(copy)), sha(original));
  run('before-rollover-message', copy, new Map([[ids[0], 'GP_HOOK_ROLLOVER_SAVE_MUST_NOT_THROW'], [ids[1], 'GP_HOOK_ROLLOVER_QUOTA_MUST_NOT_THROW']]));
  const wrong = source.replace(message, message.replace('career.season', '(career.season + 1)'));
  assert.notEqual(wrong, source); assert.equal(wrong.replace(message.replace('career.season', '(career.season + 1)'), message), source);
  fs.writeFileSync(copy, wrong);
  run('wrong-year-message', copy, new Map([[ids[0], 'GP_HOOK_ROLLOVER_YEAR_MESSAGE']]));
  fs.writeFileSync(copy, original); assert.equal(sha(fs.readFileSync(copy)), sha(original)); run('restored-copy', copy);
  assert.equal(results.length, 5);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.deepEqual(totals, { passed: 7, ownedFailures: 3, declaredSkips: 0 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Two real-season rollover save regressions only. No full persistence or UI integration credit.', children: 5, executed: 10, totals, results }, null, 2));
  console.log('simGrandPrixBossRolloverSave: 7 healthy passes, 3 owned copied-fault assertions, 10 executed outcomes.');
} finally {
  for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Final held source: ' + file);
  console.log('Grand Prix Boss rollover save evidence: ' + out);
}
