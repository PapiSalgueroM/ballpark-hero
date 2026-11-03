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
const hook = 'src/hooks/useGrandPrixBoss.ts';
const test = 'src/test/grandPrixBossSave.test.tsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const heldPaths = [hook, test, 'src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'src/lib/saveFence.ts', 'src/hooks/useSaveFenceWatch.ts', 'src/lib/completions.ts', 'vitest.config.ts', 'src/test/setup.ts', 'package.json', 'package-lock.json'];
const held = new Map();
for (const file of heldPaths) {
  const bytes = fs.readFileSync(path.join(root, file));
  held.set(file, Buffer.from(bytes));
}
const source = fs.readFileSync(path.join(root, hook), 'utf8').replace(/\r\n?/g, '\n');
const base = path.resolve(process.env.GP_BOSS_SAVE_OUT || path.join(root, 'tmp'));
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'grand-prix-save-'));
const candidate = path.join(out, 'useGrandPrixBoss.ts');
const ids = ['GP_SAVE_AVAILABLE:', 'GP_SAVE_EMPTY:', 'GP_SAVE_LOAD:', 'GP_SAVE_START:', 'GP_SAVE_OCCUPIED_START:', 'GP_SAVE_QUOTA_START:', 'GP_SAVE_QUOTA_ACTION:', 'GP_SAVE_NOOP:', 'GP_SAVE_DUPLICATE:', 'GP_SAVE_MOVED:', 'GP_SAVE_BAD_RAW:', 'GP_SAVE_UNREADABLE:', 'GP_SAVE_CONFIRMATION:', 'GP_SAVE_COMPLETE:', 'GP_SAVE_FINAL_QUOTA:', 'GP_SAVE_FINAL_CONFIRMATION:'];
const failedWrite = "    if (outcome === 'failed') { setView(old => ({ ...old, message: FAILED })); return false; }";
const unsafeWrite = "    if (outcome === 'failed') { present(saved, 'ready', message); return true; }";
const persisted = '    if (!persist({ schemaVersion: 1, career: result.state, completedSeasons }, savedMessage(result.state, action))) return false;';
const completion = "    if (completed) recordCompletion('/grand-prix-boss');";
const claims = "    if (!Array.isArray(claims) || claims.length > 12 || !claims.every((season, index) => Number.isSafeInteger(season) && season > 0\n      && (index === 0 || season > claims[index - 1])\n      && (season < read.state.season || season === read.state.season && read.state.phase === 'seasonReview'))) {\n      return { saved: null, status: 'invalid', message: INVALID };\n    }\n";
const occupied = "    if (existing !== null) {\n      const read = decode(existing);\n      if (read.status === 'ready') moved();\n      else present(null, read.status, read.message);\n      return false;\n    }\n";
const earlyCompletion = [[completion, ''], [persisted, completion + '\n' + persisted]];
const unsafeFence = [['      return true;\n    });', '      return false;\n    });'], [failedWrite, "    if (outcome === 'failed') { present(current.current, 'unreadable', UNCERTAIN); return false; }"]];
const controls = [
  ['empty', 'GP_SAVE_EMPTY:', [["if (raw === null) return { saved: null, status: 'empty', message: '' };", "if (raw === null) return { saved: null, status: 'unreadable', message: UNREADABLE };"]]],
  ['adopt-order', 'GP_SAVE_LOAD:', [["    saveFence.adopt(KEY);\n    try {\n      raw.current = localStorage.getItem(KEY);", "    try {\n      raw.current = localStorage.getItem(KEY);\n      saveFence.adopt(KEY);"]]],
  ['start-without-storage', 'GP_SAVE_START:', [["    return persist({ schemaVersion: 1, career: createCareer(seed), completedSeasons: [] }, 'Your new team is saved.');", '    return true;']]],
  ['occupied', 'GP_SAVE_OCCUPIED_START:', [[occupied, '']]],
  ['quota-start', 'GP_SAVE_QUOTA_START:', [[failedWrite, unsafeWrite]]],
  ['quota-action', 'GP_SAVE_QUOTA_ACTION:', [[failedWrite, unsafeWrite]]],
  ['readback', 'GP_SAVE_NOOP:', [['        if (stored === raw.current) return false;', '        if (stored === raw.current) { confirmation.ok = true; return true; }']]],
  ['duplicate-revision', 'GP_SAVE_DUPLICATE:', [['    const result = applyAction(before.career, action);', '    const result = applyAction(before.career, { ...action, expectedRevision: before.career.revision });']]],
  ['moved-visibility', 'GP_SAVE_MOVED:', [['moved: watch.moved || locallyMoved', 'moved: false']]],
  ['claims', 'GP_SAVE_BAD_RAW:', [[claims, '']]],
  ['read-error-empty', 'GP_SAVE_UNREADABLE:', [["    } catch {\n      present(null, 'unreadable', UNREADABLE);\n    }", "    } catch {\n      present(null, 'empty', '');\n    }"]]],
  ['uncertain-publish', 'GP_SAVE_CONFIRMATION:', [["    if (!confirmation.ok) { present(current.current, 'unreadable', UNCERTAIN); return false; }", "    if (false && !confirmation.ok) { present(current.current, 'unreadable', UNCERTAIN); return false; }"]]],
  ['completion-order', 'GP_SAVE_COMPLETE:', earlyCompletion],
  ['completion-quota', 'GP_SAVE_FINAL_QUOTA:', earlyCompletion],
  ['completion-fence', 'GP_SAVE_FINAL_CONFIRMATION:', unsafeFence, 'GP_SAVE_UNCERTAIN_FINAL_BYTES_MUST_STALE_OTHER_OLD_TABS'],
  ['wrapper-version', 'GP_SAVE_BAD_RAW:', [['if (Number.isSafeInteger(value.schemaVersion) && value.schemaVersion > 1)', 'if (false && Number.isSafeInteger(value.schemaVersion) && value.schemaVersion > 1)']]],
  ['engine-version', 'GP_SAVE_BAD_RAW:', [['status: read.reason, message:', "status: 'invalid', message:"]]],
  ['uncertain-fence', 'GP_SAVE_CONFIRMATION:', unsafeFence, 'GP_SAVE_UNCERTAIN_LANDED_BYTES_MUST_STALE_OTHER_OLD_TABS'],
];
const results = [];
const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-useGrandPrixBoss.ts'), source);
function run(name, failedId = null, hookFile = null, marker = null) {
  const reportFile = path.join(out, name + '.json');
  const env = { ...process.env };
  for (const key of ['GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  if (hookFile !== null) env.GP_BOSS_HOOK_FILE = hookFile;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (failedId && name !== 'absence') args.push('--testNamePattern=' + failedId);
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, failedId ? 1 : 0);
  const raw = (child.stdout || '') + '\n' + (child.stderr || '');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1); assert(report.testResults[0].name.endsWith('/' + test));
  const rows = report.testResults[0].assertionResults;
  assert.equal(rows.length, 16); assert.equal(report.numTotalTests, 16);
  assert.equal(report.numPassedTests, failedId ? 0 : 16); assert.equal(report.numFailedTests, failedId ? 1 : 0);
  assert.equal(report.numPendingTests, failedId ? 15 : 0); assert.equal(report.numTodoTests, 0);
  const runtimeCounters = { numUnhandledErrors: report.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null };
  for (const [key, value] of Object.entries(runtimeCounters)) { if (value === null) continue; assert.equal(typeof value, 'number'); assert.equal(value, 0, key); }
  const detectedRuntimeError = Object.values(runtimeCounters).some(value => typeof value === 'number' && value > 0) || /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test(raw);
  assert.equal(detectedRuntimeError, false);
  const seen = new Set();
  for (const row of rows) {
    const matches = ids.filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1); const id = matches[0]; assert(!seen.has(id)); seen.add(id);
    const failed = id === failedId; assert.equal(row.status, failed ? 'failed' : failedId ? 'skipped' : 'passed');
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) { assert.match(row.failureMessages[0], /AssertionError:/); if (name === 'absence') assert.match(row.failureMessages[0], /GP_SAVE_MODULE_MISSING/); if (marker) assert(row.failureMessages[0].includes(marker)); }
  }
  const result = { name, failedId, rawExit: child.status, passed: report.numPassedTests, ownedFailures: report.numFailedTests, declaredSkips: report.numPendingTests,
    runtimeCounters, runtimeCounterCompleteness: Object.values(runtimeCounters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED', detectedRuntimeError,
    rawErrors: report.errors ?? null, rawUnhandledErrors: report.unhandledErrors ?? null };
  results.push(result);
  fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(result, null, 2));
  console.log(`${name}: ${result.passed} passes, ${result.ownedFailures} owned assertion failures, ${result.declaredSkips} declared skips; runtime=${JSON.stringify(runtimeCounters)}`);
}
let complete = false;
try {
  run('current');
  fs.writeFileSync(candidate, held.get(hook)); assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(hook)));
  run('healthy-copy', null, candidate);
  for (const [name, id, patches, marker] of controls) {
    let changed = source;
    const edits = [];
    for (const [before, after] of patches) {
      const code = changed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      assert.equal(code.split(before).length - 1, 1, name + ': one executable source anchor');
      assert.equal(changed.split(before).length - 1, 1);
      const offset = changed.indexOf(before); edits.push({ offset, before, after });
      changed = changed.slice(0, offset) + after + changed.slice(offset + before.length);
    }
    assert.notEqual(sha(Buffer.from(changed)), sha(Buffer.from(source)), name + ': physical copy changed');
    let inverse = changed;
    for (const edit of [...edits].reverse()) inverse = inverse.slice(0, edit.offset) + edit.before + inverse.slice(edit.offset + edit.after.length);
    assert.equal(inverse, source, name + ': whole source inverse');
    fs.writeFileSync(path.join(out, name + '-useGrandPrixBoss.ts'), changed);
    fs.writeFileSync(path.join(out, name + '.edits.json'), JSON.stringify({ edits, originalSha256: sha(Buffer.from(source)), changedSha256: sha(Buffer.from(changed)), inverseSha256: sha(Buffer.from(inverse)) }, null, 2));
    try { fs.writeFileSync(candidate, changed); run(name, id, candidate, marker); }
    finally {
      fs.writeFileSync(candidate, held.get(hook)); assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(hook)));
      {
        const actualBytes = fs.readFileSync(path.join(root, hook));
        assert.deepEqual(actualBytes, held.get(hook));
      }
    }
  }
  const missing = path.join(out, 'missing-useGrandPrixBoss.ts'); assert.equal(fs.existsSync(missing), false);
  run('absence', 'GP_SAVE_AVAILABLE:', missing);
  run('restored-copy', null, candidate);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.deepEqual(totals, { passed: 48, ownedFailures: controls.length + 1, declaredSkips: (controls.length + 1) * 15 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Actual hook, engine, save fence and storage in jsdom. No native page reload, production recorder, route or browser qualification.', results, totals }, null, 2));
  complete = true;
  console.log(`simGrandPrixBossSave: ${totals.passed} healthy passes, ${totals.ownedFailures} effective physical-copy faults, ${totals.declaredSkips} declared unselected skips.`);
} finally {
  const after = [];
  for (const [file, expected] of held) {
    {
      const actualBytes = fs.readFileSync(path.join(root, file));
      assert.deepEqual(actualBytes, expected, 'Final held input: ' + file);
    }
    after.push({ file, bytes: expected.length, sha256: sha(expected) });
  }
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2)); assert.deepEqual(after, receipts());
  console.log('Grand Prix Boss save evidence: ' + out);
  if (complete && !process.env.GP_BOSS_SAVE_OUT) fs.rmSync(out, { recursive: true, force: true });
}
