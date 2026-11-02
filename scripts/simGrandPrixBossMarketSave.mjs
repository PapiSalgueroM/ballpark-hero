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
const HOOK = 'src/hooks/useGrandPrixBoss.ts', TEST = 'src/test/grandPrixBossMarketSave.test.tsx';
const OLD = 'scripts/qa/source-controls/useGrandPrixBoss.before-market.ts.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const held = new Map([HOOK, TEST, OLD, 'src/test/grandPrixBossSave.test.tsx', 'src/lib/grandPrixBoss.ts', 'src/lib/saveFence.ts', 'src/hooks/useSaveFenceWatch.ts', 'src/lib/completions.ts', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'].map(file => [file, fs.readFileSync(path.join(root, file))]));
assert.equal(sha(held.get(TEST)), 'c6a64b60b25770a3ab38bd7bb2749809fc266302ffcdd5cbe8661673991e83b9');
assert.equal(sha(held.get(OLD)), 'b2024f84b91cec4d263772b906b8adeb6903c0a2e5eef5ab3bf878b5b9484298');
const source = held.get(HOOK).toString('utf8');
const hookUndoSteps = [
  {
    "expectedAfter": null,
    "prior": "",
    "current": "  if (action.type === 'setDriverFocus') {\n    const driver = career.drivers.find(row => row.id === action.driverId)!;\n    return driver.name + ' training focus saved.';\n  }\n",
    "name": "focus-message"
  },
  {
    "expectedAfter": "f0ec04a26c60db6c4a5b1e4b555a699979a2fdad464e404d0e906f2538b8c23b",
    "prior": "  if (career.phase === 'seasonReview') return 'Season ' + career.season + ' saved.';\n  if (career.phase === 'raceResult') return 'Round ' + (career.round + 1) + ' result saved.';\n  return 'Lap ' + career.race!.lap + ' saved. Make your next race call.';",
    "current": "  if (action.type === 'raceInterval') {\n    if (career.phase === 'seasonReview') return 'Season ' + career.season + ' saved.';\n    if (career.phase === 'raceResult') return 'Round ' + (career.round + 1) + ' result saved.';\n    return 'Lap ' + career.race!.lap + ' saved. Make your next race call.';\n  }\n  const exhaustive: never = action;\n  return exhaustive;",
    "name": "exhaustive-feedback"
  },
  {
    "expectedAfter": "be8ac387c5b3158788d28b2186155c137c4a89d6fff30fd571df4d86965ec046",
    "prior": "",
    "current": "  if (action.type === 'startNextSeason') return 'Season ' + career.season + ' is ready. Team saved.';\n",
    "name": "rollover-message"
  },
  {
    "expectedAfter": "b2024f84b91cec4d263772b906b8adeb6903c0a2e5eef5ab3bf878b5b9484298",
    "prior": "",
    "current": "  if (action.type === 'signDriver' || action.type === 'renewDriver') {\n    const driverId = action.type === 'signDriver' ? action.incomingDriverId : action.driverId;\n    const driver = career.drivers.find(row => row.id === driverId)!;\n    return driver.name + (action.type === 'signDriver' ? ' signed for season ' : ' renewed for season ')\n      + driver.contract!.startsSeason + '. Team saved.';\n  }\n",
    "name": "market-message"
  }
];
let hookPrior = source;
const hookProof = [];
for (const step of hookUndoSteps) {
  const executed = hookPrior.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
  assert.equal(executed.split(step.current).length - 1, 1, 'One executed known message provenance span');
  assert.equal(hookPrior.split(step.current).length - 1, 1, 'One raw known message provenance span');
  const offset = hookPrior.indexOf(step.current), fromSha256 = sha(Buffer.from(hookPrior));
  hookPrior = hookPrior.slice(0, offset) + step.prior + hookPrior.slice(offset + step.current.length);
  assert.notEqual(sha(Buffer.from(hookPrior)), fromSha256);
  if (step.expectedAfter) assert.equal(sha(Buffer.from(hookPrior)), step.expectedAfter, 'Exact known prior message-only source');
  hookProof.push({ offset, before: step.current, after: step.prior, name: step.name, fromSha256, toSha256: sha(Buffer.from(hookPrior)) });
}
let hookRestored = hookPrior;
for (const { offset, before, after } of hookProof.slice().reverse()) {
  assert.equal(hookRestored.slice(offset, offset + after.length), after);
  hookRestored = hookRestored.slice(0, offset) + before + hookRestored.slice(offset + after.length);
}
assert.equal(hookRestored, source, 'Whole message-only provenance inverse holds persist and fence bytes');
const hookCompatibility = { actualSha256: sha(Buffer.from(source)), steps: hookProof,
  recoveredSha256: sha(Buffer.from(hookPrior)), restoredSha256: sha(Buffer.from(hookRestored)) };
const base = path.resolve(process.env.GP_BOSS_MARKET_SAVE_OUT || path.join(root, 'tmp')); fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-market-save-'));
const candidate = path.join(out, 'useGrandPrixBoss.ts');
const cases = new Map([
  ['GP_HOOK_MARKET_SIGN:', 'GP_HOOK_MARKET_SIGN_MUST_NOT_THROW'],
  ['GP_HOOK_MARKET_QUOTA:', 'GP_HOOK_MARKET_QUOTA_MUST_NOT_THROW'],
  ['GP_HOOK_MARKET_UNCERTAIN:', 'GP_HOOK_MARKET_UNCERTAIN_MUST_NOT_THROW'],
  ['GP_HOOK_MARKET_RENEW:', 'GP_HOOK_MARKET_RENEW_MESSAGE'],
]);
const results = [], receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-hook.ts'), held.get(HOOK));
fs.writeFileSync(path.join(out, 'hook-compatibility.json'), JSON.stringify(hookCompatibility, null, 2) + '\n');
function run(name, mode = 'healthy', file = null, selected = null) {
  const reportFile = path.join(out, name + '.vitest.json'), env = { ...process.env };
  for (const key of ['GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'GP_BOSS_PAGE_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  if (file !== null) env.GP_BOSS_HOOK_FILE = file;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (selected) args.push('--testNamePattern=' + selected);
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || ''); fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, mode === 'healthy' ? 0 : 1);
  const r = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const expected = mode === 'healthy' ? { passed: 4, failed: 0, skipped: 0 } : selected ? { passed: 0, failed: 1, skipped: 3 } : { passed: 0, failed: 4, skipped: 0 };
  assert.equal(r.success, mode === 'healthy'); assert.equal(r.numTotalTests, 4); assert.equal(r.numPassedTests, expected.passed);
  assert.equal(r.numFailedTests, expected.failed); assert.equal(r.numPendingTests, expected.skipped); assert.equal(r.numTodoTests, 0);
  assert.equal(r.testResults.length, 1); assert(r.testResults[0].name.endsWith('/' + TEST));
  const rows = r.testResults[0].assertionResults, seen = new Set(); assert.equal(rows.length, 4);
  for (const row of rows) {
    const matches = [...cases.keys()].filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1);
    const id = matches[0]; assert(!seen.has(id)); seen.add(id);
    const failed = mode !== 'healthy' && (!selected || id === selected), skipped = !!selected && !failed;
    assert.equal(row.status, failed ? 'failed' : skipped ? 'skipped' : 'passed');
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) {
      assert.match(row.failureMessages[0], /AssertionError:/);
      const marker = name === 'signing-message' && id === 'GP_HOOK_MARKET_SIGN:' ? 'GP_HOOK_MARKET_SIGN_MESSAGE' : cases.get(id);
      assert(row.failureMessages[0].includes(marker));
    }
  }
  const runtimeCounters = { numUnhandledErrors: r.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: r.numRuntimeErrorTestSuites ?? null };
  for (const value of Object.values(runtimeCounters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
  for (const errors of [r.errors, r.unhandledErrors]) if (Array.isArray(errors)) assert.equal(errors.length, 0);
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test((child.stdout || '') + '\n' + (child.stderr || ''));
  assert.equal(detectedRuntimeError, false);
  const row = { name, rawExit: child.status, passed: expected.passed, ownedFailures: expected.failed, declaredSkips: expected.skipped, runtimeCounters,
    runtimeCounterCompleteness: Object.values(runtimeCounters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED', detectedRuntimeError };
  results.push(row); fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(row, null, 2));
  for (const [file, bytes] of held) assert.equal(sha(fs.readFileSync(path.join(root, file))), sha(bytes), name + ': actual source held');
  console.log(name + ': ' + row.passed + ' passes, ' + row.ownedFailures + ' owned assertions, ' + row.declaredSkips + ' declared skips.');
}
function control(name, before, after, id) {
  const executed = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
  assert.equal(executed.split(before).length - 1, 1); assert.equal(source.split(before).length - 1, 1);
  const offset = source.indexOf(before), changed = source.slice(0, offset) + after + source.slice(offset + before.length);
  assert.notEqual(changed, source); assert.equal(changed.slice(0, offset) + before + changed.slice(offset + after.length), source);
  fs.writeFileSync(candidate, changed); fs.writeFileSync(path.join(out, name + '-hook.ts'), changed);
  fs.writeFileSync(path.join(out, name + '.edit.json'), JSON.stringify({ offset, before, after, originalSha256: sha(Buffer.from(source)), changedSha256: sha(Buffer.from(changed)), inverseSha256: sha(Buffer.from(source)) }, null, 2));
  try { run(name, 'fault', candidate, id); }
  finally { fs.writeFileSync(candidate, held.get(HOOK)); assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(HOOK))); }
}
try {
  run('current'); fs.writeFileSync(candidate, held.get(HOOK)); run('healthy-copy', 'healthy', candidate);
  const oldFile = path.join(out, 'before-market-hook.ts'); fs.writeFileSync(oldFile, held.get(OLD));
  run('whole-old-hook', 'fault', oldFile);
  const anchor = "  if (action.type === 'signDriver' || action.type === 'renewDriver') {";
  control('signing-message', anchor, "  if (action.type === 'renewDriver') {", 'GP_HOOK_MARKET_SIGN:');
  control('renewal-message', anchor, "  if (action.type === 'signDriver') {", 'GP_HOOK_MARKET_RENEW:');
  run('restored-copy', 'healthy', candidate);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.equal(results.length, 6); assert.deepEqual(totals, { passed: 12, ownedFailures: 6, declaredSkips: 6 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Contract save messages and real persistence boundaries only. No rollover, page, route or full-game readiness.', childRuns: 6, totalExecuted: 18, totals, results }, null, 2));
  console.log('simGrandPrixBossMarketSave: 12 passes, 6 owned assertions, 6 declared skips; 18 executed outcomes.');
} finally {
  const after = [...held].map(([file]) => { const bytes = fs.readFileSync(path.join(root, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; });
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2)); assert.deepEqual(after, receipts());
  console.log('Grand Prix Boss market save evidence: ' + out);
}
