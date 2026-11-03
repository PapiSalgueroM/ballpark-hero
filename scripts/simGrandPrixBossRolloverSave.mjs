import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
const held = new Map();
for (const file of paths) {
  const bytes = fs.readFileSync(path.join(root, file));
  held.set(file, Buffer.from(bytes));
}
const original = held.get(HOOK), source = fs.readFileSync(path.join(root, HOOK), 'utf8').replace(/\r\n?/g, '\n');
assert.equal(sha(held.get(OLD)), 'be8ac387c5b3158788d28b2186155c137c4a89d6fff30fd571df4d86965ec046');
assert.equal(sha(held.get(TEST)), '37b5dc1988904f28694e909488c8bc9007dc6f14cf0bd0938aa08ce77e3f9f3f');
const startupSource = fs.readFileSync(path.join(root, 'src/lib/grandPrixBoss.ts'), 'utf8').replace(/\r\n?/g, '\n');
let beforeStarter = startupSource;
const startupProof = [];
for (const [before, after] of [
  ['const teamId = teams[4].id;', 'const teamId = teams[6].id;'],
  ['drivers[8].contract!.wagePerRace = 180_000;', 'drivers[12].contract!.wagePerRace = 180_000;'],
  ['drivers[9].contract!.wagePerRace = 120_000;', 'drivers[13].contract!.wagePerRace = 120_000;'],
]) {
  const executed = beforeStarter.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
  assert.equal(executed.split(before).length - 1, 1, 'One executed startup provenance span');
  assert.equal(beforeStarter.split(before).length - 1, 1, 'One raw startup provenance span');
  const offset = beforeStarter.indexOf(before);
  beforeStarter = beforeStarter.slice(0, offset) + after + beforeStarter.slice(offset + before.length);
  startupProof.push({ offset, before, after });
}
assert.equal(sha(Buffer.from(beforeStarter)), '3a3e5652fbf43bfe13e9802521821378cc3221f7942f05f15b7242c98b1fea92', 'Only three startup edits recover the qualified same-C engine');
let startupRestored = beforeStarter;
for (const { offset, before, after } of startupProof.slice().reverse()) {
  assert.equal(startupRestored.slice(offset, offset + after.length), after);
  startupRestored = startupRestored.slice(0, offset) + before + startupRestored.slice(offset + after.length);
}
assert.equal(startupRestored, startupSource, 'Whole startup provenance inverse');
const engineCompatibility = { actualSha256: sha(Buffer.from(startupSource)), sameCBeforeStarterSha256: sha(Buffer.from(beforeStarter)),
  edits: startupProof, restoredSha256: sha(Buffer.from(startupRestored)) };
const message = "  if (action.type === 'startNextSeason') return 'Season ' + career.season + ' is ready. Team saved.';\n";
assert.equal(source.split(message).length, 2);
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
assert.equal(hookPrior, fs.readFileSync(path.join(root, OLD), 'utf8').replace(/\r\n?/g, '\n'), 'Known message-only inverses recover exact market hook');
const outBase = path.resolve(process.env.GP_BOSS_ROLLOVER_SAVE_OUT || path.join(root, 'tmp'));
fs.mkdirSync(outBase, { recursive: true });
const out = fs.mkdtempSync(path.join(outBase, 'dukb-grand-prix-rollover-save-'));
const copy = path.join(out, 'useGrandPrixBoss.ts');
fs.writeFileSync(path.join(out, 'engine-compatibility.json'), JSON.stringify(engineCompatibility, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'hook-compatibility.json'), JSON.stringify(hookCompatibility, null, 2) + '\n');
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
  for (const [filePath, bytes] of held) {
    const actualBytes = fs.readFileSync(path.join(root, filePath));
    assert.deepEqual(actualBytes, bytes, 'Held source: ' + filePath);
  }
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
  for (const [file, bytes] of held) {
    const actualBytes = fs.readFileSync(path.join(root, file));
    assert.deepEqual(actualBytes, bytes, 'Final held source: ' + file);
  }
  console.log('Grand Prix Boss rollover save evidence: ' + out);
}
