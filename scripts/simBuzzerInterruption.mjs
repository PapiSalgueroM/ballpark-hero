/* Buzzer Beater keyboard interruption outcomes, with real Board, flight and scoring. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = 'src/test/buzzerInterruption.test.tsx';
const ancestor = 'Buzzer Beater keyboard charge interruptions';
const ids = ['daily', 'unlimited', 'contest'].flatMap(mode =>
  ['global-space', 'button-space', 'button-enter'].flatMap(input =>
    ['window-blur', 'document-hidden'].map(signal => mode + '-' + input + '-' + signal)));
const titles = ids.map(id => "'" + id + "' cancels charge before stale key release");
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const out = process.env.BUZZER_INTERRUPTION_OUT
  ? path.resolve(process.env.BUZZER_INTERRUPTION_OUT)
  : await mkdtemp(path.join(os.tmpdir(), 'dukb-buzzer-interruption-'));
const relative = path.relative(root, out);
assert.ok(path.isAbsolute(relative) || relative.startsWith('..' + path.sep), 'BUZZER_INTERRUPTION_OUTSIDE_CHECKOUT');
if (process.env.BUZZER_INTERRUPTION_OUT) await mkdir(out);
const json = (name, value) => writeFile(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const reporterURL = pathToFileURL(createRequire(path.join(root, 'package.json')).resolve('vitest/reporters')).href;
const reporter = "import { JsonReporter } from " + JSON.stringify(reporterURL) + ";\n"
  + "import assert from 'node:assert/strict';\nimport { writeFileSync } from 'node:fs';\n"
  + "export default class RuntimeReporter extends JsonReporter {\n"
  + " async onFinished(files, errors, coverage) {\n"
  + "  assert(Array.isArray(errors), 'BUZZER_INTERRUPTION_CALLBACK_ARRAY');\n"
  + "  writeFileSync(process.env.BUZZER_INTERRUPTION_RUNTIME,JSON.stringify({arrayReceived:true,count:errors.length,errors,files:files.map(f=>f.filepath)},null,2)+String.fromCharCode(10),{flag:'wx'});\n"
  + "  await super.onFinished(files,errors,coverage);\n }\n}\n";
const reporterFile = path.join(out, 'runtime-reporter.mjs');
await writeFile(reporterFile, reporter, { flag: 'wx' });
await writeFile(path.join(out, 'transport.jsonl'), '', { flag: 'wx' });
const env = { ...process.env, FORCE_COLOR: '0', SIM_NETWORK: 'offline',
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs')].filter(Boolean).join(' '),
  SIM_OFFLINE_RECEIPT: path.join(out, 'transport.jsonl'), BUZZER_INTERRUPTION_RUNTIME: path.join(out, 'runtime-errors.json') };
delete env.NO_COLOR;
delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(out, 'vitest.json');
const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', file,
  '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism',
  '--reporter=default', '--reporter=' + reporterFile, '--outputFile.json=' + reportFile];
const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
await writeFile(path.join(out, 'stdout.log'), run.stdout || '', { flag: 'wx' });
await writeFile(path.join(out, 'stderr.log'), run.stderr || '', { flag: 'wx' });
await writeFile(path.join(out, 'raw.exit'), String(run.status) + '\n', { flag: 'wx' });
const processRecord = { executable: process.execPath, args, status: run.status, signal: run.signal, error: run.error ? String(run.error) : null };
await json('process.json', processRecord);
if (run.status !== 0) process.stdout.write((run.stdout || '') + '\n' + (run.stderr || ''));
const report = JSON.parse(await readFile(reportFile, 'utf8'));
const runtime = JSON.parse(await readFile(path.join(out, 'runtime-errors.json'), 'utf8'));
const cli = ((run.stdout || '') + '\n' + (run.stderr || '')).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
const M = code => 'BUZZER_INTERRUPTION_' + code;
function judge(value) {
  const { report: d, runtime: r, process: p, cli: output } = value;
  assert.equal(p.status, 0, M('RAW_ZERO'));
  assert.equal(p.signal, null); assert.equal(p.error, null);
  assert.equal(r.arrayReceived, true, M('CALLBACK_ARRAY'));
  assert(Array.isArray(r.errors), M('CALLBACK_ARRAY'));
  assert.equal(r.count, r.errors.length, M('CALLBACK_ARRAY'));
  assert.equal(r.count, 0, M('CALLBACK_ZERO'));
  assert.equal(d.testResults.length, 1, M('ONE_FILE'));
  const f = d.testResults[0];
  assert.equal(path.resolve(f.name), path.join(root, file), M('ONE_FILE'));
  assert.deepEqual(r.files, [f.name], M('CALLBACK_FILES'));
  const rows = f.assertionResults;
  assert.deepEqual(rows.map(row => row.title).sort(), [...titles].sort(), M('CASE_IDENTITIES'));
  for (const row of rows) {
    assert.deepEqual(row.ancestorTitles, [ancestor], M('CASE_IDENTITIES'));
    assert.equal(row.fullName, ancestor + ' ' + row.title, M('CASE_IDENTITIES'));
    assert.equal(row.status, 'passed', M('ROW_PASS'));
    assert.deepEqual(row.failureMessages, [], M('ROW_PASS'));
  }
  assert.equal(f.status, 'passed'); assert.equal(f.message, '');
  for (const [key, expected] of Object.entries({ numTotalTests: 18, numPassedTests: 18,
    numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, numTotalTestSuites: 2,
    numPassedTestSuites: 2, numFailedTestSuites: 0, numPendingTestSuites: 0 })) assert.equal(d[key], expected, M('COUNTERS'));
  assert.equal(d.success, true);
  assert.match(output, /^\s*Test Files\s+1 passed \(1\)\s*$/m, M('DEFAULT_CLI'));
  assert.match(output, /^\s*Tests\s+18 passed \(18\)\s*$/m, M('DEFAULT_CLI'));
}
const value = { process: processRecord, report, runtime, cli };
judge(value);
const original = Buffer.from(JSON.stringify(value, null, 2) + '\n');
const working = path.join(out, 'copied-working.json');
await writeFile(working, original, { flag: 'wx' });
const controls = [];
for (const [id, mutate, marker] of [
  ['missing-case', v => { v.report.testResults[0].assertionResults.splice(0, 1); }, M('CASE_IDENTITIES')],
  ['skip', v => { v.report.testResults[0].assertionResults[0].status = 'skipped'; }, M('ROW_PASS')],
  ['callback-error', v => { v.runtime.errors = [{ name: 'Error', message: 'COPIED_CALLBACK_ERROR' }]; v.runtime.count = 1;
  }, M('CALLBACK_ZERO')],
]) {
  const copy = JSON.parse((await readFile(working)).toString());
  mutate(copy);
  const changed = Buffer.from(JSON.stringify(copy, null, 2) + '\n');
  assert.notDeepEqual(changed, original, M('CONTROL_EFFECTIVE'));
  await writeFile(working, changed);
  await writeFile(path.join(out, id + '.changed.json'), changed, { flag: 'wx' });
  let failure;
  try { judge(JSON.parse((await readFile(working)).toString())); assert.fail('COPIED_CONTROL_DID_NOT_REFUSE'); }
  catch (error) { assert.equal(error.code, 'ERR_ASSERTION'); assert(error.message.includes(marker)); failure = { name: error.name, code: error.code, message: error.message }; }
  finally {
    await writeFile(working, original);
    assert.deepEqual(await readFile(working), original, M('SAME_COPY_RESTORED'));
    judge(JSON.parse((await readFile(working)).toString()));
    await writeFile(path.join(out, id + '.restored.json'), await readFile(working), { flag: 'wx' });
  }
  controls.push({ id, marker, scope: 'COPIED_REPORT_CHECKER_ONLY', actualFeaturePassCredit: false,
    workingFile: working, changedFile: id + '.changed.json', restoredFile: id + '.restored.json', beforeSHA256: sha(original), changedSHA256: sha(changed),
    restoredSHA256: sha(await readFile(working)), sameCopyRestored: true, actualFailure: failure });
}
assert.equal(await readFile(reporterFile, 'utf8'), reporter, M('REPORTER_HELD'));
assert.equal((await readFile(path.join(out, 'transport.jsonl'))).length, 0, M('OFFLINE'));
await json('admission.json', { status: 'BUZZER_INTERRUPTION_FOCUSED_18_PASS', file, ids, raw: run.status,
  cases: 18, fileUnits: 1, aggregateSuiteUnits: 2, describeUnits: 1, skipped: 0, todo: 0,
  actualCallbackErrors: runtime.count, controls, reporterURL,
  reporterSHA256: sha(reporter), browserOrFullSuiteCredit: false });
console.log('simBuzzerInterruption: 18 real Board cases pass; no skipped/todo/callback errors.');
console.log('simBuzzerInterruption: three modes/keyboard paths, independent blur/hidden unit signals.');
console.log('simBuzzerInterruption: stale releases idle, fresh real shots settle once by RAF/backup.');
console.log('simBuzzerInterruption: 3 copied checker refusals/same-file restores; evidence ' + out);
