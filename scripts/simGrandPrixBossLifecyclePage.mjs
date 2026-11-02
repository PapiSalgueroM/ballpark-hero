import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'src/pages/GrandPrixBoss.tsx', TEST = 'src/test/grandPrixBossLifecyclePage.test.tsx';
const OLD = 'scripts/qa/source-controls/GrandPrixBoss.before-lifecycle.tsx.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [PAGE, TEST, OLD, 'scripts/simGrandPrixBossLifecyclePage.mjs', 'src/test/fixtures/grandPrixBossV5Starter.json',
  'src/lib/grandPrixBoss.ts', 'src/hooks/useGrandPrixBoss.ts', 'src/lib/keyedRng.ts', 'src/lib/saveFence.ts',
  'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts', 'src/hooks/useRoutePath.ts',
  'src/components/game/RulesGate.tsx', 'src/components/ui/dialog.tsx', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
assert.equal(sha(held.get(TEST)), '4fb25845cdc79a71bd5d95a3f9cc663f67907ac4b0048a8c92f2f37b1bb246f7', 'Held three-case lifecycle test');
assert.equal(sha(held.get('src/test/fixtures/grandPrixBossV5Starter.json')), 'cf3b484781dbff04df9033d0e1dfe239e6d9562f5cf026db2e4b1e233162a028');
const old = held.get(OLD);
assert.equal(old.length, 31750); assert.equal(sha(old), '1474ae6a5e7c5ca99cc56e43c53502af4a4639ec1345f78af51a1af5588c8fc1', 'Exact focus-fixed before-lifecycle page');
assert.equal(createHash('sha1').update('blob ' + old.length + '\0').update(old).digest('hex'), '3a1f42d093c1e07a391e5b715d94d1cf60bc8d43');
assert.notEqual(sha(old), sha(held.get(PAGE)), 'The actual page differs from the known missing-feature control');
const workspaceTemp = path.join(root, 'tmp'); fs.mkdirSync(workspaceTemp, { recursive: true });
const base = path.resolve(process.env.GP_BOSS_LIFECYCLE_PAGE_OUT || workspaceTemp);
assert(base !== path.join(root, 'src') && !base.startsWith(path.join(root, 'src') + path.sep));
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-lifecycle-page-'));
const copyDir = fs.mkdtempSync(path.join(workspaceTemp, 'dukb-grand-prix-lifecycle-page-copy-'));
assert.equal(path.dirname(copyDir), workspaceTemp, 'Dynamically imported page stays in allowed workspace tmp');
const candidate = path.join(copyDir, 'GrandPrixBoss.tsx'), results = [];
const identities = new Map([
  ['GP_C_PAGE_FOCUS: dispatches free owned focus choices only in actual engine windows', 'GP_C_PAGE_FOCUS_CONTROL_MISSING'],
  ['GP_C_PAGE_REPLACEMENTS: displays canonical prospects and publishes the exact next-year transaction', 'GP_C_PAGE_REPLACEMENT_DISCLOSURE_MISSING'],
  ['GP_C_PAGE_RULES: explains lifecycle decisions in real first and reopened rules without changing the team', 'GP_C_PAGE_LIFECYCLE_GUIDANCE_MISSING'],
]);
const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
const hold = () => { for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Actual input held: ' + file); };
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-page.tsx.txt'), held.get(PAGE));
fs.writeFileSync(path.join(out, 'old-page.tsx.txt'), old);
fs.writeFileSync(path.join(out, 'copy-location.json'), JSON.stringify({ evidence: out, importedPage: candidate, allowedRoot: workspaceTemp }, null, 2));
fs.writeFileSync(candidate, held.get(PAGE));
function run(name, copied = false, missing = false) {
  const report = path.join(out, name + '.vitest.json'), transport = path.join(out, name + '.transport');
  const env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'),
    SIM_NETWORK: 'offline', SIM_OFFLINE_RECEIPT: transport, FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const key of ['GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  const beforeCopy = copied ? fs.readFileSync(candidate) : null;
  if (copied) { assert(beforeCopy.length > 0); env.GP_BOSS_PAGE_FILE = candidate; }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + report];
  fs.writeFileSync(transport, '');
  fs.writeFileSync(path.join(out, name + '.argv.json'), JSON.stringify({ command: process.execPath, args, pageCopy: copied ? candidate : null,
    pageCopyBytes: beforeCopy?.length ?? null, pageCopySha256: beforeCopy ? sha(beforeCopy) : null }, null, 2));
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || ''); fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  fs.writeFileSync(path.join(out, name + '.exit.json'), JSON.stringify({ status: child.status, signal: child.signal,
    error: child.error ? { name: child.error.name, message: child.error.message } : null }, null, 2));
  hold(); if (beforeCopy) assert.deepEqual(fs.readFileSync(candidate), beforeCopy, 'Physical page held during child');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, missing ? 1 : 0);
  assert.equal(fs.statSync(transport).size, 0, 'No attempted child network');
  const r = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(r.success, !missing); assert.equal(r.numTotalTests, 3); assert.equal(r.numPassedTests, missing ? 0 : 3);
  assert.equal(r.numFailedTests, missing ? 3 : 0); assert.equal(r.numPendingTests, 0); assert.equal(r.numTodoTests, 0);
  assert.equal(r.testResults.length, 1); assert(r.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
  const rows = r.testResults[0].assertionResults, seen = new Set(), cases = [];
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert(identities.has(row.title)); assert(!seen.has(row.title)); seen.add(row.title);
    assert.equal(row.status, missing ? 'failed' : 'passed'); assert.equal(row.failureMessages.length, missing ? 1 : 0);
    if (missing) {
      const failure = row.failureMessages[0].replace(/\u001b\[[0-9;]*m/g, '');
      const headline = failure.split('\n').find(line => line.includes('AssertionError:'));
      assert(headline && headline.includes(identities.get(row.title)), 'Exact owned missing-feature assertion after actual fixture foundations');
    }
    cases.push({ title: row.title, status: row.status, failureMessages: row.failureMessages });
  }
  assert.equal(seen.size, 3);
  const runtimeCounters = { numUnhandledErrors: r.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: r.numRuntimeErrorTestSuites ?? null };
  for (const count of Object.values(runtimeCounters)) if (count !== null) { assert.equal(typeof count, 'number'); assert.equal(count, 0); }
  for (const errors of [r.errors, r.unhandledErrors]) if (errors != null) { assert(Array.isArray(errors)); assert.equal(errors.length, 0); }
  const raw = (child.stdout || '') + '\n' + (child.stderr || '');
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test(raw);
  assert.equal(detectedRuntimeError, false);
  const result = { name, rawExit: child.status, passed: missing ? 0 : 3, ownedFailures: missing ? 3 : 0, declaredSkips: 0, totalExecuted: 3,
    transportBytes: 0, runtimeCounters, runtimeCounterCompleteness: Object.values(runtimeCounters).some(count => count === null) ? 'UNKNOWN' : 'REPORTED',
    detectedRuntimeError, rawErrors: r.errors ?? null, rawUnhandledErrors: r.unhandledErrors ?? null, cases };
  results.push(result); fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(result, null, 2));
  console.log(name + ': ' + result.passed + ' passes, ' + result.ownedFailures + ' owned assertions, zero skips.');
}
let primary = null, totals = null;
const cleanupErrors = [];
try {
  run('current');
  assert.deepEqual(fs.readFileSync(candidate), held.get(PAGE), 'Healthy physical page is byte-identical'); run('healthy-copy', true);
  fs.writeFileSync(candidate, old); assert.deepEqual(fs.readFileSync(candidate), old, 'Known old physical page is exact');
  run('whole-before-lifecycle', true, true);
  fs.writeFileSync(candidate, held.get(PAGE)); assert.deepEqual(fs.readFileSync(candidate), held.get(PAGE), 'Physical page restored before final child');
  run('restored-copy', true);
  totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures,
    declaredSkips: sum.declaredSkips + row.declaredSkips, totalExecuted: sum.totalExecuted + row.totalExecuted }),
    { passed: 0, ownedFailures: 0, declaredSkips: 0, totalExecuted: 0 });
  assert.equal(results.length, 4); assert.deepEqual(totals, { passed: 9, ownedFailures: 3, declaredSkips: 0, totalExecuted: 12 });
} catch (error) {
  primary = error; fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
} finally {
  try { fs.writeFileSync(candidate, held.get(PAGE)); assert.deepEqual(fs.readFileSync(candidate), held.get(PAGE)); }
  catch (error) { cleanupErrors.push({ step: 'copy-restore', name: error.name, message: error.message }); }
  const after = [];
  for (const [file, expected] of held) {
    try { const actual = fs.readFileSync(path.join(root, file)); after.push({ file, bytes: actual.length, sha256: sha(actual) }); assert.deepEqual(actual, expected, 'Actual input held: ' + file); }
    catch (error) { cleanupErrors.push({ step: 'source', file, name: error.name, message: error.message }); }
  }
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  fs.writeFileSync(path.join(out, 'cleanup.json'), JSON.stringify(cleanupErrors, null, 2));
  console.log('Lifecycle page evidence: ' + out);
}
if (primary) throw primary;
assert.deepEqual(cleanupErrors, [], 'Page restoration and complete input holds');
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({
  scope: 'Three lifecycle component cases only. Exact focus-fixed missing-feature control, not new coverage of the old fifteen cases, native browser, storage provider or route.',
  childRuns: 4, totals, results, oldPageSha256: sha(old), actualPageSha256: sha(held.get(PAGE)),
}, null, 2));
console.log('simGrandPrixBossLifecyclePage: nine healthy passes, three owned missing-feature assertions, zero skips; twelve executed outcomes.');
