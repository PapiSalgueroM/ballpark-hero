const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const out = process.env.USC4_OUT;
assert.ok(out && path.isAbsolute(out), 'absolute evidence path');
const dir = path.join(out, 'original-red');
fs.mkdirSync(dir);
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [file, expected] of [
  ['node_modules/vitest/dist/reporters.js', '374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
  ['node_modules/vitest/dist/chunks/index.VByaPkjc.js', '59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
  ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js', '4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
]) assert.equal(sha(fs.readFileSync(file)), expected, 'actual locked reporter source');
const reporter = [
  "import { JsonReporter } from " + JSON.stringify(pathToFileURL(path.resolve('node_modules/vitest/dist/reporters.js')).href) + ";",
  "import fs from 'node:fs';",
  "import a from 'node:assert/strict';",
  "export default class RuntimeReporter extends JsonReporter {",
  "  async onFinished(files, errors, coverage) {",
  "    a(Array.isArray(files)); a(Array.isArray(errors));",
  "    const tasks = node => ({ name: node.name, state: node.result?.state ?? null, errors: (node.result?.errors ?? []).map(e => ({message:e.message,actual:e.actual,expected:e.expected})), tasks: (node.tasks ?? []).map(tasks) });",
  "    fs.writeFileSync(process.env.USC4_CALLBACK_JSON, JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(e => ({name:e?.name,message:e?.message ?? String(e),stack:e?.stack})),files:files.map(f => ({filepath:f.filepath,task:tasks(f)}))},null,2)+'\\n',{flag:'wx'});",
  "    await super.onFinished(files, errors, coverage);",
  "  }",
  "}",
].join('\n') + '\n';
const reporterPath = path.join(dir, 'runtime-reporter.mjs');
fs.writeFileSync(reporterPath, reporter, { flag: 'wx' });
const resultPath = path.join(dir, 'result.json');
const callbackPath = path.join(dir, 'callback.json');
const args = [path.join(process.cwd(), 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/usConnect4ValidationLock.test.tsx', '--maxWorkers=1', '--no-file-parallelism', '--reporter=' + reporterPath, '--outputFile=' + resultPath];
json(path.join(dir, 'command.json'), { executable: process.execPath, args });
const stdout = fs.openSync(path.join(dir, 'stdout.log'), 'wx');
const stderr = fs.openSync(path.join(dir, 'stderr.log'), 'wx');
let run;
try { run = cp.spawnSync(process.execPath, args, { timeout: 180000, stdio: ['ignore', stdout, stderr], env: { ...process.env, USC4_CALLBACK_JSON: callbackPath, FORCE_COLOR: '0' } }); }
finally { fs.closeSync(stdout); fs.closeSync(stderr); }
json(path.join(dir, 'process.json'), { status: run.status, signal: run.signal, error: run.error ? String(run.error) : null });
fs.writeFileSync(path.join(dir, 'raw.exit'), String(run.status) + '\n', { flag: 'wx' });
assert.equal(run.status, 1, 'actual original page must return RED');
assert.equal(run.signal, null);
assert.equal(run.error, undefined);
const bytes = fs.readFileSync(resultPath);
const callbackBytes = fs.readFileSync(callbackPath);
function judge(report, callback) {
  assert.equal(report.numTotalTests, 1);
  assert.equal(report.numFailedTests, 1);
  assert.equal(report.numPassedTests, 0);
  assert.equal(report.numPendingTests, 0);
  assert.equal(report.numTodoTests, 0);
  assert.equal(report.testResults.length, 1);
  const file = report.testResults[0];
  assert.equal(path.resolve(file.name), path.resolve('src/test/usConnect4ValidationLock.test.tsx'));
  assert.equal(file.status, 'failed');
  assert.equal(file.assertionResults.length, 1);
  const row = file.assertionResults[0];
  assert.equal(row.title, 'a pending NBA answer ignores Skip and gives the next turn only after acceptance');
  assert.equal(row.status, 'failed');
  assert.equal(row.failureMessages.length, 1);
  assert.match(row.failureMessages[0], /US_CONNECT4_PENDING_TURN_LOCK/);
  assert.equal(callback.arrayReceived, true);
  assert.equal(callback.count, 0, 'actual onFinished callback has no runtime errors');
  assert.deepEqual(callback.errors, []);
  assert.equal(callback.files.length, 1);
  assert.equal(path.resolve(callback.files[0].filepath), path.resolve('src/test/usConnect4ValidationLock.test.tsx'));
  const leaves = [];
  const walk = task => { if (task.tasks.length) { assert.deepEqual(task.errors, []); task.tasks.forEach(walk); } else leaves.push(task); };
  walk(callback.files[0].task);
  assert.equal(leaves.length, 1);
  assert.equal(leaves[0].name, row.title);
  assert.equal(leaves[0].state, 'fail');
  assert.equal(leaves[0].errors.length, 1);
  const error = leaves[0].errors[0];
  assert.match(error.message, /US_CONNECT4_PENDING_TURN_LOCK/);
  assert.equal(typeof error.actual, 'string');
  assert.equal(typeof error.expected, 'string');
  assert.match(error.actual, /pendingTurn/);
  assert.match(error.expected, /pendingTurn/);
  return { title: row.title, failure: row.failureMessages[0], actual: error.actual, expected: error.expected };
}
const report = JSON.parse(bytes);
const callback = JSON.parse(callbackBytes);
const observed = judge(report, callback);
const copyPath = path.join(dir, 'classifier-working-copy.json');
const copyCallbackPath = path.join(dir, 'classifier-callback-working-copy.json');
fs.writeFileSync(copyPath, bytes, { flag: 'wx' });
fs.writeFileSync(copyCallbackPath, callbackBytes, { flag: 'wx' });
const controls = [
  ['unexpected-extra-failure', x => { x.numFailedTests += 1; }, () => {}],
  ['wrong-failure', x => { x.testResults[0].assertionResults[0].failureMessages = ['Unrelated synthetic failure']; }, () => {}],
  ['runtime-error', () => {}, x => { x.count = 1; x.errors = [{message:'Synthetic callback error'}]; }],
  ['wrong-file', x => { x.testResults[0].name = '/fixture/other.test.tsx'; }, () => {}],
  ['green-instead-of-red', x => { x.numFailedTests = 0; x.numPassedTests = 1; }, () => {}],
  ['missing-owned-task-cause', () => {}, x => { x.files[0].task.tasks = []; x.files[0].task.errors = []; }],
];
const rows = [];
for (const [id, mutate, mutateCallback] of controls) {
  const a = JSON.parse(bytes);
  const b = JSON.parse(callbackBytes);
  mutate(a); mutateCallback(b);
  assert.ok(JSON.stringify(a) !== JSON.stringify(report) || JSON.stringify(b) !== JSON.stringify(callback), 'semantic copied input actually changed: ' + id);
  fs.writeFileSync(copyPath, JSON.stringify(a));
  fs.writeFileSync(copyCallbackPath, JSON.stringify(b));
  const changed = !fs.readFileSync(copyPath).equals(bytes) || !fs.readFileSync(copyCallbackPath).equals(callbackBytes);
  assert.equal(changed, true, 'copied input actually changed: ' + id);
  const controlDir = path.join(dir, 'controls', id);
  fs.mkdirSync(controlDir, {recursive:true});
  const changedReport = fs.readFileSync(copyPath), changedCallback = fs.readFileSync(copyCallbackPath);
  fs.writeFileSync(path.join(controlDir, 'changed-report.json'), changedReport, {flag:'wx'});
  fs.writeFileSync(path.join(controlDir, 'changed-callback.json'), changedCallback, {flag:'wx'});
  let refused = false, refusal = null;
  try { judge(JSON.parse(fs.readFileSync(copyPath)), JSON.parse(fs.readFileSync(copyCallbackPath))); }
  catch (error) { refused = true; refusal = {name:error.name, message:error.message}; }
  finally { fs.writeFileSync(copyPath, bytes); fs.writeFileSync(copyCallbackPath, callbackBytes); }
  assert.equal(refused, true, 'changed copied input refused: ' + id);
  assert.deepEqual(fs.readFileSync(copyPath), bytes);
  assert.deepEqual(fs.readFileSync(copyCallbackPath), callbackBytes);
  assert.deepEqual(judge(JSON.parse(fs.readFileSync(copyPath)), JSON.parse(fs.readFileSync(copyCallbackPath))), observed);
  assert.equal(refusal.name, 'AssertionError');
  assert.ok(refusal.message.length);
  const row = {id,physicalCopyChanged:true,refused:true,refusal,sameCopyRestored:true,restoredAdmissionPassed:true,beforeReportSHA256:sha(bytes),beforeCallbackSHA256:sha(callbackBytes),changedReportSHA256:sha(changedReport),changedCallbackSHA256:sha(changedCallback),restoredReportSHA256:sha(fs.readFileSync(copyPath)),restoredCallbackSHA256:sha(fs.readFileSync(copyCallbackPath))};
  json(path.join(controlDir, 'result.json'), row);
  rows.push(row);
}
assert.deepEqual(fs.readFileSync(resultPath), bytes);
assert.deepEqual(fs.readFileSync(callbackPath), callbackBytes);
assert.equal(fs.readFileSync(reporterPath,'utf8'), reporter);
json(path.join(out, 'RED-ADMISSION.json'), {status:'ACTUAL_ORIGINAL_US_CONNECT4_PAGE_AND_HOOK_RED',rawExit:1,total:1,failed:1,runtimeCallbackErrors:0,observed,controls:rows,resultSHA256:sha(bytes),callbackSHA256:sha(callbackBytes),reporterSHA256:sha(Buffer.from(reporter)),source:process.env.GITHUB_SHA});
console.log('US_CONNECT4_ORIGINAL_RED: actual NBA page and hook returned1 with exactly1 owned pending-turn failure, zero callback errors;6 physical copied classifier controls changed, refused and restored.');
