import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { createHash } from 'node:crypto';
import { stripVTControlCharacters } from 'node:util';

const ROOT = fs.realpathSync(process.cwd());
const OUT = fs.realpathSync(process.env.XI_MIXED_OUT);
const SPEC = 'qa/build-xi-mixed60/SOURCE.json';
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b])).digest('hex');
function regular(file) { const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink(), 'MIXED_REGULAR_FILE'); return fs.readFileSync(file); }
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const spec = JSON.parse(regular(SPEC));
assert.equal(spec.bound, true, 'MIXED_UNBOUND_SOURCE');
assert(['owned-red', 'all-pass'].includes(spec.phase), 'MIXED_PHASE');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert.equal(process.env.XI_MIXED_SELECTOR_SHA, sha(regular(SPEC)), 'MIXED_SELECTOR_PIN');
function source() {
  const entries = {};
  for (const p of spec.pins) {
    const b = regular(p.path); assert.equal(blob(b), p.git, 'MIXED_SOURCE_PIN:' + p.path); assert.equal(b.length, p.bytes);
    entries[p.path] = { bytes: b.length, git: blob(b), sha256: sha(b) };
  }
  return entries;
}
const before = source(); write('selected-source-before.json', before);
assert(spec.tests.length > 0 && spec.cases.length > 0, 'MIXED_TEST_CENSUS');
assert.equal(new Set(spec.cases.map(c => c.file + '\0' + c.fullName)).size, spec.cases.length);
const expectedFailed = spec.phase === 'owned-red' ? spec.cases.filter(c => c.owned) : [];
assert.equal(expectedFailed.length, spec.phase === 'owned-red' ? 3 : 0, 'MIXED_OWNED_CENSUS');
const noInfra = /Unhandled (?:Errors?|Rejection|Exception)|Error during collection|Failed to load url|Cannot find (?:module|package)|Test timed out|worker exited unexpectedly|SyntaxError|TypeError|ReferenceError|TestingLibraryElementError/i;

async function run(id, args, expectedStatus, deadlineMs) {
  const receipt = path.join(OUT, id + '.transport'); fs.writeFileSync(receipt, '', { flag: 'wx' });
  const so = fs.openSync(path.join(OUT, id + '.stdout'), 'wx'), se = fs.openSync(path.join(OUT, id + '.stderr'), 'wx');
  const r = { id, command: process.execPath, args, cwd: ROOT, startedAt: new Date().toISOString(), pid: null, status: null, signal: null, error: null, closed: false, deadlineMs, deadlineExpired: false, signalAttempts: [] };
  const child = cp.spawn(process.execPath, args, { cwd: ROOT, detached: true, stdio: ['ignore', so, se], env: { ...process.env, NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: receipt, SIM_NETWORK: 'offline' } });
  r.pid = child.pid ?? null; write(id + '.start.json', r);
  let timer, killTimer;
  const signal = name => { const a = { signal: name, at: new Date().toISOString(), error: null }; try { process.kill(-child.pid, name); } catch (e) { a.error = { name: e.name, message: e.message }; } r.signalAttempts.push(a); };
  if (child.pid) timer = setTimeout(() => { r.deadlineExpired = true; signal('SIGTERM'); killTimer = setTimeout(() => { if (!r.closed) signal('SIGKILL'); }, 15000); }, deadlineMs);
  child.on('error', e => { r.error = { name: e.name, message: e.message, code: e.code ?? null }; });
  await new Promise(resolve => child.on('close', (code, signalled) => { r.status = code; r.signal = signalled; r.closed = true; r.closedAt = new Date().toISOString(); resolve(); }));
  clearTimeout(timer); clearTimeout(killTimer); fs.closeSync(so); fs.closeSync(se);
  for (const stream of ['stdout', 'stderr']) { const b = regular(path.join(OUT, id + '.' + stream)); r[stream + 'Bytes'] = b.length; r[stream + 'Sha256'] = sha(b); }
  r.receiptBytes = regular(receipt).length; write(id + '.closed.json', r);
  assert(Number.isInteger(r.pid) && r.pid > 0, 'MIXED_PROCESS_PID');
  assert.equal(r.status, expectedStatus, 'MIXED_PROCESS_EXIT'); assert.equal(r.signal, null); assert.equal(r.error, null); assert.equal(r.closed, true);
  assert.equal(r.deadlineExpired, false, 'MIXED_PROCESS_DEADLINE'); assert.deepEqual(r.signalAttempts, []); assert.equal(r.receiptBytes, 0, 'MIXED_OFFLINE_TRANSPORT');
  return r;
}
function suiteKeys(cases) {
  const keys = new Set();
  for (const c of cases) { keys.add(JSON.stringify([c.file])); for (let n = 1; n <= c.ancestors.length; n++) keys.add(JSON.stringify([c.file, ...c.ancestors.slice(0, n)])); }
  return keys;
}
function admit(observation) {
  const { report: j, status, log } = observation;
  assert.equal(status, spec.phase === 'owned-red' ? 1 : 0, 'MIXED_PROCESS_EXIT');
  assert(!noInfra.test(log), 'MIXED_NO_INFRA');
  assert.equal(j.success, expectedFailed.length === 0); assert.equal(j.numTotalTests, spec.cases.length);
  assert.equal(j.numFailedTests, expectedFailed.length); assert.equal(j.numPassedTests, spec.cases.length - expectedFailed.length);
  assert.equal(j.numPendingTests, 0, 'MIXED_NO_PENDING'); assert.equal(j.numTodoTests, 0);
  const allSuites = suiteKeys(spec.cases), failedSuites = suiteKeys(expectedFailed);
  assert.equal(j.numTotalTestSuites, allSuites.size, 'MIXED_SUITE_UNITS'); assert.equal(j.numFailedTestSuites, failedSuites.size);
  assert.equal(j.numPassedTestSuites, allSuites.size - failedSuites.size); assert.equal(j.numPendingTestSuites, 0);
  assert(Array.isArray(j.testResults)); assert.equal(j.testResults.length, spec.tests.length, 'MIXED_FILE_CENSUS');
  const names = [];
  for (const test of spec.tests) {
    const files = j.testResults.filter(f => path.resolve(f.name) === path.resolve(ROOT, test)); assert.equal(files.length, 1, 'MIXED_FILE_IDENTITY');
    const f = files[0], expected = spec.cases.filter(c => c.file === test), failed = expectedFailed.filter(c => c.file === test);
    assert.equal(f.message ?? '', '', 'MIXED_EMPTY_FILE_MESSAGE'); assert.equal(f.status, failed.length ? 'failed' : 'passed', 'MIXED_FILE_STATUS');
    assert.equal(f.assertionResults.length, expected.length);
    for (const e of expected) {
      const rows = f.assertionResults.filter(a => a.fullName === e.fullName); assert.equal(rows.length, 1, 'MIXED_CASE_IDENTITY');
      const a = rows[0], shouldFail = expectedFailed.includes(e);
      assert.equal(a.title, e.title); assert.deepEqual(a.ancestorTitles, e.ancestors); assert.equal(a.status, shouldFail ? 'failed' : 'passed', 'MIXED_CASE_STATUS');
      assert(Array.isArray(a.failureMessages));
      if (!shouldFail) assert.deepEqual(a.failureMessages, []);
      else {
        assert.equal(a.failureMessages.length, 1); const message = stripVTControlCharacters(a.failureMessages[0]);
        assert(/^\s*AssertionError(?::|\s|\[)/.test(message), 'MIXED_OWNED_ASSERTION');
        assert(message.includes(e.marker + ':'), 'MIXED_OWNED_MARKER'); assert(!noInfra.test(message), 'MIXED_NO_INFRA');
        assert(typeof e.causePattern === 'string' && e.causePattern.length > 0); assert(new RegExp(e.causePattern, 's').test(message), 'MIXED_OWNED_CAUSE');
        assert(message.includes(path.basename(test) + ':'), 'MIXED_OWNED_STACK');
      }
      names.push({ fullName: a.fullName, status: a.status });
    }
  }
  const plain = stripVTControlCharacters(log);
  const failedFiles = new Set(expectedFailed.map(c => c.file)).size;
  const fileParts = [failedFiles && failedFiles + ' failed', spec.tests.length - failedFiles && (spec.tests.length - failedFiles) + ' passed'].filter(Boolean).join(' \\| ');
  assert(new RegExp('Test Files\\s+' + fileParts + '\\s+\\(' + spec.tests.length + '\\)').test(plain), 'MIXED_CLI_FILES');
  const testParts = [expectedFailed.length && expectedFailed.length + ' failed', (spec.cases.length - expectedFailed.length) + ' passed'].filter(Boolean).join(' \\| ');
  assert(new RegExp('Tests\\s+' + testParts + '\\s+\\(' + spec.cases.length + '\\)').test(plain), 'MIXED_CLI_TESTS');
  assert(plain.includes('JSON report written to ' + path.join(OUT, 'vitest.json')), 'MIXED_CLI_JSON');
  return names;
}
function copied(id, seed, mutate, cause) {
  const file = path.join(OUT, 'copied-' + id + '.json'); fs.writeFileSync(file, seed, { flag: 'wx' });
  try {
    admit(JSON.parse(regular(file))); const value = JSON.parse(regular(file)); mutate(value); const changed = Buffer.from(JSON.stringify(value));
    assert.notEqual(sha(changed), sha(seed), 'MIXED_CONTROL_CHANGED'); fs.writeFileSync(file, changed);
    let caught; try { admit(JSON.parse(regular(file))); } catch (e) { caught = e; }
    assert(caught?.name === 'AssertionError' && caught.message.includes(cause), 'MIXED_CONTROL_SPECIFIC');
    fs.writeFileSync(file, seed); assert.equal(sha(regular(file)), sha(seed)); admit(JSON.parse(regular(file)));
    return { id, scope: 'DERIVED COPIED observation, not physical app fault', cause, beforeSha256: sha(seed), changedSha256: sha(changed), restoredSha256: sha(regular(file)), sameCopy: true };
  } finally { fs.writeFileSync(file, seed); }
}
try {
  const types = await run('types', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json'], 0, 240000);
  assert.equal(types.stdoutBytes, 0); assert.equal(types.stderrBytes, 0);
  const args = ['node_modules/vitest/vitest.mjs', 'run', ...spec.tests, '--no-cache', '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + path.join(OUT, 'vitest.json')];
  const tests = await run('tests', args, spec.phase === 'owned-red' ? 1 : 0, 240000);
  const log = regular(path.join(OUT, 'tests.stdout')).toString() + '\n' + regular(path.join(OUT, 'tests.stderr')).toString();
  const observation = { report: JSON.parse(regular(path.join(OUT, 'vitest.json'))), status: tests.status, log };
  const actual = admit(observation), seed = Buffer.from(JSON.stringify(observation));
  write('derived-observation.json', seed.toString());
  const controls = [
    copied('exit', seed, o => { o.status = spec.phase === 'owned-red' ? 0 : 1; }, 'MIXED_PROCESS_EXIT'),
    copied('file-error', seed, o => { o.report.testResults[0].message = 'unhandled test collection error'; }, 'MIXED_EMPTY_FILE_MESSAGE'),
  ];
  if (spec.phase === 'owned-red') controls.push(copied('owned-marker', seed, o => {
    const e = expectedFailed[0], f = o.report.testResults.find(f => path.resolve(f.name) === path.resolve(ROOT, e.file)), a = f.assertionResults.find(a => a.fullName === e.fullName);
    assert(a.failureMessages[0].includes(e.marker)); a.failureMessages[0] = a.failureMessages[0].split(e.marker).join('UNOWNED');
  }, 'MIXED_OWNED_MARKER'));
  const after = source(); assert.deepEqual(after, before, 'MIXED_SOURCE_HELD'); write('selected-source-after.json', after);
  write('admission.json', { schema: 1, phase: spec.phase, source: process.env.GITHUB_SHA, parent: spec.parent, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, processes: [types, tests], actual, controls, scope: 'Offline focused types and public API tests only. No build, browser, DB, live Edge, full suite or published claim.' });
  console.log('Mixed60 ' + spec.phase + ': exact ' + spec.cases.length + ' cases, ' + expectedFailed.length + ' owned failures, copied ' + controls.length + ', source held');
} catch (error) { write('failure.json', { name: error.name, message: error.message, stack: error.stack }); console.error(error.stack); process.exitCode = 1; }

