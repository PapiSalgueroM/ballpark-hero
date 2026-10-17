import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'a5b0e7675068525235883124a9947f656061a752';
const TEST = 'src/hooks/useClubManager.test.ts', HARNESS = 'scripts/simActivityNotCompletion.mjs';
const SELF = 'scripts/qa/proveManagerCompletionTimeout.mjs', WORKFLOW = '.github/workflows/manager-completion-timeout.yml';
const OUT = path.resolve(process.env.MANAGER_TIMEOUT_OUT || path.join(ROOT, 'manager-timeout-artifacts'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const title = ['a played match records activity and not a completion', 'a finished season records exactly one completion'];
const report = { status: 'running', method: 'Direct Vitest JSON stress, unchanged harness normal and controls; no stress-runner claim for the harness', base: BASE, arms: [], workers: [] };
assert(!fs.existsSync(OUT), 'A new run requires a fresh evidence directory');
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
save();
const workers = [], pending = new Set();
let fixed, original, files, reference, hookCopy, activeTest;
async function setVariant(bytes) { await writeFile(path.join(ROOT, TEST), bytes); activeTest = bytes; }
async function inventory(label, test) {
  const actual = {};
  for (let i = 0; i < files.length; i += 64) await Promise.all(files.slice(i, i + 64).map(async file => { actual[file] = sha(await readFile(path.join(ROOT, file))); }));
  fs.writeFileSync(path.join(OUT, label + '.source.json'), JSON.stringify(actual, null, 2) + '\n');
  if (reference) assert.deepEqual(actual, { ...reference, [TEST]: sha(test) }, 'Every tracked input is held except the declared test variant');
  return actual;
}
async function sample() {
  return Promise.all(workers.map(async child => {
    assert.equal(child.exitCode, null); assert.equal(child.signalCode, null);
    const raw = await readFile(`/proc/${child.pid}/stat`, 'utf8'), fields = raw.slice(raw.lastIndexOf(')') + 2).trim().split(/\s+/);
    assert.notEqual(fields[0], 'Z');
    return { pid: child.pid, start: fields[19], userTicks: Number(fields[11]), systemTicks: Number(fields[12]) };
  }));
}
async function stopWorkers() {
  await Promise.all(workers.map(child => new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('close', resolve); child.kill('SIGTERM');
  })));
}
async function run(label, args, extra = {}) {
  report.phase = label; save(); console.log(label + ' started');
  const before = workers.length && !report.workersStopped ? await sample() : [];
  await inventory(label + '-before', activeTest);
  const stdout = path.join(OUT, label + '.stdout'), stderr = path.join(OUT, label + '.stderr');
  const output = fs.openSync(stdout, 'w'), errors = fs.openSync(stderr, 'w'), started = Date.now();
  const child = spawn(process.execPath, args, { cwd: ROOT, detached: true, env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', SIM_ACTIVITY_CONTROL: '', CM_HOOK: '', ...extra }, stdio: ['ignore', output, errors] });
  pending.add(child);
  const result = await new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; process.kill(-child.pid, 'SIGKILL'); }, 600_000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, timedOut }); });
  }).finally(() => { pending.delete(child); fs.closeSync(output); fs.closeSync(errors); });
  const after = before.length ? await sample() : [];
  if (before.length) for (let i = 0; i < 20; i++) {
    assert.equal(after[i].pid, before[i].pid); assert.equal(after[i].start, before[i].start);
    assert(after[i].userTicks + after[i].systemTicks > before[i].userTicks + before[i].systemTicks, 'Every same busy worker used CPU during every arm');
  }
  const text = fs.readFileSync(stdout, 'utf8') + fs.readFileSync(stderr, 'utf8');
  const arm = { label, args, code: result.code, signal: result.signal, timedOut: result.timedOut, elapsedMs: Date.now() - started, before, after, stdout: sha(fs.readFileSync(stdout)), stderr: sha(fs.readFileSync(stderr)) };
  report.arms.push(arm); save();
  assert.equal(result.timedOut, false, label + ' exceeded the independent 600-second process guard');
  assert.equal(result.signal, null); assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|\[SIM_OFFLINE_BLOCK\]|Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(text));
  await inventory(label + '-after', activeTest);
  return { arm, text };
}
async function direct(label, kind, extra = {}) {
  const file = path.join(OUT, label + '.vitest.json');
  const result = await run(label, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=default', '--reporter=json', '--outputFile=' + file], extra);
  const data = JSON.parse(await readFile(file, 'utf8')), rows = data.testResults.flatMap(entry => entry.assertionResults);
  assert.equal(data.testResults.length, 1); assert.equal(rows.length, 2); assert.deepEqual(rows.map(row => row.title), title);
  assert.equal(data.numPendingTests, 0); assert.equal(data.numTodoTests, 0);
  assert(rows.every(row => ['passed', 'failed'].includes(row.status)));
  const failed = rows.filter(row => row.status === 'failed');
  if (kind === 'timeout') {
    assert.equal(result.arm.code, 1); assert.equal(data.success, false); assert.equal(data.numFailedTests, 1); assert.equal(data.numPassedTests, 1);
    assert.equal(rows[0].status, 'passed'); assert.equal(failed[0].title, title[1]); assert.equal(failed[0].failureMessages.length, 1);
    const headers = [...result.text.matchAll(/^\s*FAIL\s+([^\n]+)$/gm)];
    assert.equal(headers.length, 1, 'The default reporter names exactly one failed test');
    assert.equal(headers[0][1].trim(), TEST + ' > Club Manager completion shape > ' + title[1]);
    const block = result.text.slice(headers[0].index);
    assert(/^Error: Test timed out in 5000ms\./m.test(block), 'The named season failure must report its actual default timeout');
  } else if (kind === 'match') {
    assert.equal(result.arm.code, 1); assert.equal(data.success, false); assert.equal(data.numFailedTests, 2); assert.equal(data.numPassedTests, 0);
    assert(failed.every(row => row.failureMessages.length === 1 && /AssertionError/.test(row.failureMessages[0]) && !/timed out/.test(row.failureMessages[0])));
    assert(/called with arguments/.test(rows[0].failureMessages[0])); assert(/to be called 1 times, but got \d+ times/.test(rows[1].failureMessages[0]));
  } else { assert.equal(result.arm.code, 0); assert.equal(data.success, true); assert.equal(data.numFailedTests, 0); assert.equal(data.numPassedTests, 2); }
  return result;
}
async function normal(label) {
  const result = await run(label, [HARNESS]);
  assert.equal(result.arm.code, 0); assert(/vitest exit 0, 2 passed/.test(result.text)); assert(/simActivityNotCompletion: all green/.test(result.text));
  assert(!/FAIL:/.test(result.text)); return result.text;
}
try {
  assert.equal(process.platform, 'linux'); assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
  assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'));
  const require = createRequire(import.meta.url); assert(require.cache[require.resolve('../lib/offlineTransport.cjs')], 'The inherited preload actually executed');
  assert.equal(git('status', '--porcelain', '--untracked-files=no').toString(), '', 'Run only clean committed source');
  for (const file of [TEST, SELF, WORKFLOW]) assert.equal((await readFile(path.join(ROOT, file), 'utf8')).replaceAll('\r\n', '\n'), git('show', 'HEAD:' + file).toString(), 'Working source equals its committed canonical body: ' + file);
  fixed = await readFile(path.join(ROOT, TEST)); activeTest = fixed; original = git('show', BASE + ':' + TEST);
  const suffix = '  });\n});\n', wanted = '  }, 300_000);\n});\n';
  assert(original.toString().endsWith(suffix));
  assert.equal(fixed.toString(), original.toString().slice(0, -suffix.length) + wanted, 'Only the whole-season final timeout argument changes');
  assert.deepEqual(await readFile(path.join(ROOT, HARNESS)), git('show', BASE + ':' + HARNESS));
  const changed = git('diff', '--name-only', BASE, 'HEAD').toString().trim().split('\n').filter(file => file && !file.startsWith('docs/')).sort();
  assert.deepEqual(changed, [TEST, SELF, WORKFLOW].sort(), 'Exactly three non-document paths change from frozen I');
  files = git('ls-files', '-z').toString().split('\0').filter(Boolean).sort();
  reference = await inventory('fixed-initial', fixed);
  fs.writeFileSync(path.join(OUT, 'test.original.ts'), original); fs.writeFileSync(path.join(OUT, 'test.fixed.ts'), fixed); fs.writeFileSync(path.join(OUT, 'harness.original.mjs'), git('show', BASE + ':' + HARNESS));
  report.source = { head: git('rev-parse', 'HEAD').toString().trim(), changed, original: sha(original), fixed: sha(fixed), harness: sha(await readFile(path.join(ROOT, HARNESS))), files: files.length }; save();
  await setVariant(original); const baseline = await normal('original-normal');
  const workerCode = 'process.send({pid:process.pid,ready:true},()=>{let value=1;for(;;)value=(Math.imul(value,1664525)+1013904223)|0;});';
  await Promise.all(Array.from({ length: 20 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', workerCode], { cwd: ROOT, env: process.env, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] }); workers.push(child);
    const timer = setTimeout(() => reject(new Error('Busy worker readiness exceeded 60 seconds')), 60_000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('message', message => { clearTimeout(timer); try { assert.equal(message.pid, child.pid); assert.equal(message.ready, true); resolve(); } catch (error) { reject(error); } });
  })));
  report.workers = await sample(); assert.equal(report.workers.length, 20); save();
  for (const [variant, bytes, kind] of [['original', original, 'timeout'], ['fixed', fixed, 'pass'], ['restored-original', original, 'timeout']]) {
    await setVariant(bytes);
    for (let repeat = 1; repeat <= 3; repeat++) await direct(variant + '-stress-' + repeat, kind);
  }
  await stopWorkers(); report.workersStopped = true; save(); await setVariant(fixed);
  const final = await normal('fixed-normal'); assert.equal(final, baseline, 'Unchanged harness ordinary output is exactly equal');
  const expected = {
    match: [1, ['with a completion after every match the match test fails on its assertion, as it should', 'with a completion after every match the season test counts more than one, as it should']],
    career: [2, ["the season advance no longer pings recordActivity('/soccer-career') within 600 characters", "SoccerCareer.tsx calls recordCompletion('/soccer-career') 1 time(s); the scored completion is the retirement through useGameCompletion, a season is activity"]],
    heavy: [3, ['recordActivity calls saveAuthCompletion(...), which makes every sim round a full completion again']],
    noping: [2, ["the season advance no longer pings recordActivity('/soccer-career') within 600 characters"]],
    twocalls: [2, ['the season advance is called 2 times; a second call is a new site this check must be told about']],
    twodotted: [2, ['the season advance is called 2 times; a second call is a new site this check must be told about']],
  };
  for (const [control, [section, messages]] of Object.entries(expected)) {
    const result = await run('control-' + control, [HARNESS], { SIM_ACTIVITY_CONTROL: control }); assert.equal(result.arm.code, 0);
    assert(result.text.includes(`control "${control}": ${messages.length} failure(s) fired in section ${section} as expected, the check works`));
    assert.deepEqual(result.text.split('\n').filter(line => line.startsWith('  FAIL: ')).map(line => line.slice(8)), messages);
    assert((control === 'match' ? /vitest exit 1, 2 failed/ : /vitest exit 0, 2 passed/).test(result.text));
    assert.equal((result.text.match(/^\d\) /gm) || []).length, 3); assert(/writes the anonymous row: true/.test(result.text));
  }
  const hook = await readFile(path.join(ROOT, 'src/hooks/useClubManager.ts'), 'utf8'), anchor = "recordActivity('/club-manager', currentSeasonScore(";
  const replacement = "recordCompletion('/club-manager', currentSeasonScore(";
  const pieces = hook.split(anchor); assert.equal(pieces.length - 1, 3); const regressed = pieces.join(replacement); assert.notEqual(regressed, hook);
  let inverse = regressed, offset = 0;
  for (const piece of pieces.slice(0, -1)) { offset += piece.length; assert.equal(inverse.slice(offset, offset + replacement.length), replacement); inverse = inverse.slice(0, offset) + anchor + inverse.slice(offset + replacement.length); offset += anchor.length; }
  assert.equal(inverse, hook, 'Restore only the three changed match calls, preserving the existing season completion');
  report.matchControl = { replacements: 3, before: sha(hook), regressed: sha(regressed) }; save();
  hookCopy = path.join(ROOT, 'dist/.manager-timeout-control/useClubManager.control.ts'); fs.mkdirSync(path.dirname(hookCopy), { recursive: true }); await writeFile(hookCopy, regressed);
  await writeFile(path.join(OUT, 'hook.before.ts'), hook); await writeFile(path.join(OUT, 'hook.control.ts'), regressed);
  await direct('match-control-assertions', 'match', { CM_HOOK: hookCopy });
  report.status = 'passed'; console.log('PASS completion timeout: nine same-worker stress arms, two unchanged ordinary harness runs and six effective controls');
} catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; console.error(error.stack); }
finally {
  for (const child of pending) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* The child may already have exited. */ } }
  await stopWorkers();
  if (fixed) await setVariant(fixed);
  if (hookCopy && fs.existsSync(hookCopy)) fs.unlinkSync(hookCopy);
  try { if (reference) await inventory('fixed-final', fixed); } catch (error) { report.status = 'failed'; report.finalHoldError = error.stack; process.exitCode = 1; }
  report.finishedAt = new Date().toISOString(); save();
}
