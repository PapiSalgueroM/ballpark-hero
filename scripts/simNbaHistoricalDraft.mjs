#!/usr/bin/env node
/** Normal NBA historical-intake regression plus one real copied-module fault. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const TEST = 'src/test/nbaHistoricalDraft2004.test.tsx';
const FIXTURE = 'scripts/data/nbaHistoricalDraft2004Fixture.json';
const DATA = 'src/data/nbaDraft2004.ts';
const names = [
  'new 2003 UI career exposes all 59 real selections after the 2003 season',
  'new Road to the Draft opts in before pending reload and reaches the real 2003 career',
  'the actual 2004 camp has a persistent real-identity participant and unchanged healthy role effects',
  'all factual identities survive actual reload and later real free-agency signing',
  'unmarked original career replay current era and other sport creations remain healthy and cohort absent',
].map(name => 'NBA 2004 historical draft regression ' + name);
const sha = b => createHash('sha256').update(b).digest('hex');
const source = new Map([DATA, TEST, FIXTURE, 'vitest.config.ts'].map(file => [file, fs.readFileSync(file)]));
const owned = fs.mkdtempSync(path.join(os.tmpdir(), 'nba-draft-2004-control-'));
const out = process.env.NBA_HISTORICAL_DRAFT_OUT
  ? path.resolve(process.env.NBA_HISTORICAL_DRAFT_OUT) : path.join(owned, 'results');
assert.ok(!fs.existsSync(out), 'NBA historical regression requires a fresh output directory');
fs.mkdirSync(out, { recursive: true });
const receipt = { status: 'running', output: out, runs: [], sourceHeld: false };
const write = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
function native(name, args, env = process.env) {
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 600_000, maxBuffer: 16_000_000 });
  fs.writeFileSync(path.join(out, name + '.stdout'), result.stdout ?? '');
  fs.writeFileSync(path.join(out, name + '.stderr'), result.stderr ?? '');
  const row = { name, command: [process.execPath, ...args], exit: result.status,
    signal: result.signal, error: result.error?.message ?? null };
  receipt.runs.push(row);
  write(name + '.native.json', row);
  assert.equal(row.signal, null, name + ' signal');
  assert.equal(row.error, null, name + ' transport');
  return row;
}
function result(name, expectedFailures) {
  const file = path.join(out, name + '.json');
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(report.success, expectedFailures.length === 0, name + ' report status');
  assert.equal(report.numTotalTests, 5, name + ' case census');
  assert.equal(report.numPassedTests, 5 - expectedFailures.length, name + ' passed census');
  assert.equal(report.numFailedTests, expectedFailures.length, name + ' failed census');
  for (const field of ['numPendingTests', 'numTodoTests', 'numRuntimeErrors', 'numRuntimeErrorTestSuites', 'numUnhandledErrors'])
    if (report[field] !== undefined) assert.equal(report[field], 0, name + ' ' + field);
  assert.equal(report.testResults.length, 1, name + ' one real test file');
  if (report.unhandledErrors) assert.deepEqual(report.unhandledErrors, [], name + ' unhandled errors');
  const log = fs.readFileSync(path.join(out, name + '.stdout'), 'utf8')
    + fs.readFileSync(path.join(out, name + '.stderr'), 'utf8');
  assert.ok(!/Unhandled Errors|Vitest caught|uncaughtException|unhandledRejection/.test(log), name + ' runtime error text');
  const cases = report.testResults[0].assertionResults;
  assert.deepEqual(cases.map(c => c.fullName), names, name + ' exact five cases');
  cases.forEach((c, i) => {
    const failed = expectedFailures.includes(i);
    assert.equal(c.status, failed ? 'failed' : 'passed', name + ' case ' + i);
    if (failed) {
      assert.ok(c.failureMessages.length > 0, name + ' owned failure exists');
      for (const message of c.failureMessages) {
        assert.match(message, /^AssertionError \[ERR_ASSERTION\]:/, name + ' Node business assertion');
        assert.match(message, /NBA_2004_(?:CLASS_|NEW_PROSPECT_POLICY|CAMP_PARTICIPANT|PERSISTED_IDENTITIES)/, name + ' owned marker');
        assert.ok(!/TypeError:|ReferenceError:|SyntaxError:/.test(message), name + ' no setup error');
      }
    }
  });
  return { cases: cases.map(c => ({ name: c.fullName, status: c.status })), reportSHA256: sha(fs.readFileSync(file)) };
}
try {
  const fixture = JSON.parse(source.get(FIXTURE).toString('utf8'));
  assert.equal(fixture.qualification?.status, 'admitted-eight-arms', 'Bind the actual healthy eight-arm authority before this regression lands');
  for (const field of ['run', 'job', 'artifact']) assert.match(fixture.qualification[field], /^\d+$/, 'actual authority ' + field);
  assert.match(fixture.qualification.independentAdmissionSHA256, /^[a-f0-9]{64}$/, 'actual independent admission');
  assert.equal(native('types', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json']).exit, 0, 'proper app types');
  const clean = { ...process.env, NBA_HISTORICAL_DRAFT_REGRESSION: '1' };
  delete clean.US_BOARD_CONTROL_ALIAS;
  delete clean.US_BOARD_CONTROL_FILE;
  const args = name => ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1',
    '--reporter=json', '--outputFile', path.join(out, name + '.json')];
  assert.equal(native('normal', args('normal'), clean).exit, 0, 'normal native exit');
  receipt.normal = result('normal', []);
  const before = source.get(DATA).toString('utf8');
  const span = '  {"id":"nba-draft-2004-p59","pick":59,"name":"Rashad Wright","families":["G"],"dob":"1982-03-17"},\n';
  assert.equal(before.split(span).length - 1, 1, 'actual selection59 executable row is unique');
  const at = before.indexOf(span);
  const changed = before.slice(0, at) + before.slice(at + span.length);
  assert.notEqual(changed, before, 'actual copied source edit must change bytes');
  assert.equal(changed.slice(0, at) + span + changed.slice(at), before, 'whole copied source inverse');
  const copy = path.join(owned, 'nbaDraft2004.ts');
  fs.writeFileSync(copy, changed);
  assert.equal(fs.readFileSync(copy, 'utf8'), changed, 'actual copied source readback');
  write('missing-selection-control.json', { alias: '@/data/nbaDraft2004', copy,
    sourceSHA256: sha(source.get(DATA)), copySHA256: sha(fs.readFileSync(copy)),
    removed: span, index: at, changed: true, wholeInverse: true });
  const controlEnv = { ...clean, US_BOARD_CONTROL_ALIAS: '@/data/nbaDraft2004', US_BOARD_CONTROL_FILE: copy };
  assert.equal(native('missing-selection', args('missing-selection'), controlEnv).exit, 1, 'actual source fault native exit');
  receipt.control = result('missing-selection', [0, 1, 2, 3]);
  assert.equal(fs.readFileSync(copy, 'utf8'), changed, 'controlled copy held during native run');
  assert.equal(changed.slice(0, at) + span + changed.slice(at), before, 'complete copied source inverse after native run');
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed';
  receipt.error = String(error);
  process.exitCode = 1;
} finally {
  const failures = [...source].filter(([file, bytes]) => !fs.readFileSync(file).equals(bytes)).map(([file]) => file);
  receipt.sourceHeld = failures.length === 0;
  receipt.changedOriginalFiles = failures;
  if (failures.length) { receipt.status = 'failed'; process.exitCode = 1; }
  write('regression.json', receipt);
  // Only this run's exact control leaf is removed. All native reports and logs stay retained.
  const copy = path.join(owned, 'nbaDraft2004.ts');
  if (fs.existsSync(copy)) fs.unlinkSync(copy);
}
console.log(receipt.status === 'passed'
  ? 'NBA historical draft: 5 cases passed; copied missing-selection control rejected by 4 business assertions; original source held.'
  : 'NBA historical draft FAILED. Retained native evidence: ' + out);
