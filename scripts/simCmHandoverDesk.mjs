/** Round 1375: remote proof over the unchanged ten-case appointment method.
 * Controls replace only the calendar in isolated source copies. The original
 * arm uses the entire calendar from CM_HANDOVER_BASE, not a reconstructed
 * approximation. No tracked source, historical assertion or budget is edited.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === 'true' && process.env.SIM_NETWORK === 'offline', 'Appointment proof runs only in CI with offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.CM_HANDOVER_OUT || path.join(ROOT, 'manager-handover-artifacts/proof'));
const BASE = process.env.CM_HANDOVER_BASE || 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const CALENDAR = 'src/lib/clubManagerCalendar.ts';
const TEST = 'src/test/clubManagerHandoverDesk.test.ts';
const METHOD = '862de03d5e912ecccade0f64d3840f23fa7f6992';
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.toString().replaceAll('\r\n', '\n');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 128 * 1024 * 1024 });
/* Round BII (Release BI join): normalised on read, so simHarnessAnchors sees the calendar anchors below match on a
   CRLF checkout too; every hash this file compares is of the same normalised text (the copies at the copied app check). */
const read = relative => lf(fs.readFileSync(path.join(ROOT, relative)));
const one = (source, before, after) => {
  assert.equal(source.split(before).length - 1, 1, 'Unique executable control anchor');
  const next = source.replace(before, after); assert.notEqual(next, source, 'Control changes executable source'); return next;
};
const assignments = { picker: '    inbox: career.inbox,\n', job: '    inbox: [reaction],\n' };
const clear = '    decisions: undefined,\n';
const remove = (source, which) => one(source, assignments[which] + clear, assignments[which]);
const add = (source, which) => one(source, assignments[which], assignments[which] + clear);
const current = lf(read(CALENDAR)), original = lf(git(['show', `${BASE}:${CALENDAR}`]));
const baseCommit = git(['rev-parse', '--verify', `${BASE}^{commit}`]).toString().trim();
assert.equal(remove(remove(current, 'picker'), 'job'), original, 'Complete calendar differs from bound base only at the two clearing fields');
assert.equal(lf(read(TEST)), lf(git(['show', `${METHOD}:${TEST}`])), 'All ten test cases remain byte-frozen to qualified baseline method');
const restored = add(add(original, 'picker'), 'job');
assert.equal(restored, current, 'Full original calendar restores exactly to candidate');
const variants = [
  { name: 'normal', source: current, faults: [] },
  { name: 'original-calendar', source: original, faults: ['picker', 'job'] },
  { name: 'missing-picker', source: remove(current, 'picker'), faults: ['picker'] },
  { name: 'missing-job', source: remove(current, 'job'), faults: ['job'] },
  { name: 'restored', source: restored, faults: [] },
];
assert.equal(new Set(variants.slice(0, 4).map(variant => sha(variant.source))).size, 4, 'Both single-field faults and full original are distinct');
const files = git(['ls-files', '-z', '--', 'src', 'scripts', '.github/workflows', 'package.json', 'package-lock.json', 'bun.lock',
  'vitest.config.ts', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'index.html']).toString().split('\0').filter(Boolean);
const sourceBefore = Object.fromEntries(files.map(file => [file, sha(read(file))]));
const copyRoots = ['src', 'package.json', 'vitest.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json'];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-handover-desk-'));
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(path.join(OUT, 'receipt.json')), 'Refuse to replace an earlier proof receipt');
const receipt = { status: 'incomplete', head: git(['rev-parse', 'HEAD']).toString().trim(), base: baseCommit,
  baseTree: git(['rev-parse', `${baseCommit}^{tree}`]).toString().trim(), method: METHOD,
  calendar: { candidateSha256: sha(current), originalSha256: sha(original), restoredSha256: sha(restored) },
  sourceBefore, arms: [], comparisons: [] };
const withoutDesk = state => { const copy = structuredClone(state); delete copy.decisions; return copy; };
function verifyReport(directory, child, faults) {
  assert.equal(child.error, undefined, 'Actual test process starts and completes before its timeout');
  assert.equal(child.signal, null, 'Actual test process is not terminated');
  const rawLog = (child.stdout || '') + '\n' + (child.stderr || '');
  const log = rawLog.replace(/\u001b\[[0-9;]*m/g, '');
  assert(!/TypeError:|ReferenceError:|SyntaxError:|ERR_MODULE_NOT_FOUND|Unhandled (?:Errors?|Rejection|Exception)|Uncaught Exception|Failed Suites|Failed to load|Failed to resolve import|SIM_OFFLINE_BLOCK/i.test(log), 'No runtime, setup or transport error credit');
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'unit.json'), 'utf8'));
  const failedCount = faults.length * 2;
  assert.equal(child.status, failedCount ? 1 : 0); assert.equal(report.success, failedCount === 0);
  assert.equal(report.numTotalTests, 10); assert.equal(report.numPassedTests, 10 - failedCount); assert.equal(report.numFailedTests, failedCount);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0); assert.equal(report.testResults.length, 1);
  const file = report.testResults[0]; assert(file.name.endsWith('/' + TEST) && !file.message);
  const expected = new Map();
  for (const method of ['picker', 'job']) {
    const status = faults.includes(method) ? 'failed' : 'passed';
    expected.set(`handover desk missing: ${method} cannot claim predecessor funds`, { status,
      marker: `CM_HANDOVER_${method.toUpperCase()}_FUNDS: inherited funds remain claimable`, truth: 'expected false to be true' });
    expected.set(`handover desk missing: ${method} clears pending predecessor appeal`, { status,
      marker: `CM_HANDOVER_${method.toUpperCase()}_APPEAL: predecessor pending appeal remains on the new desk`, truth: 'expected true to be false' });
    expected.set(`handover desk preservation: ${method} keeps every other state field and draw`, { status: 'passed' });
  }
  for (const title of ['saved predecessor cards remain valid before appointment', 'existing funded reply applies once',
    'new manager matches still offer the original deck', 'refused join and empty calendar retain original guards']) {
    expected.set('handover desk preservation: ' + title, { status: 'passed' });
  }
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(row => row.title).sort(), [...expected.keys()].sort());
  for (const row of cases) {
    const want = expected.get(row.title); assert.equal(row.status, want.status, row.title);
    assert.equal(row.failureMessages.length, want.status === 'failed' ? 1 : 0, row.title);
    if (want.status === 'failed') {
      assert(row.failureMessages[0].startsWith('AssertionError: ' + want.marker), row.title);
      assert(row.failureMessages[0].includes(want.truth), row.title);
    }
  }
  const raw = JSON.parse(fs.readFileSync(path.join(directory, 'raw-states.json'), 'utf8'));
  for (const method of ['picker', 'job']) {
    const reference = raw[method + '-reference'], prepared = raw[method + '-prepared'];
    assert(reference && prepared && reference.whistles > 0 && prepared.whistles === reference.whistles);
    assert(reference.draws.length > 0); assert.deepEqual(prepared.draws, reference.draws);
    assert.deepEqual(prepared.input, reference.input);
    assert.deepEqual(withoutDesk(prepared.state), withoutDesk(reference.state));
    assert.deepEqual(prepared.predecessor.decisions.map(card => card.kind), ['situation', 'appeal']);
    assert(prepared.predecessor.decisions.every(card => !card.resolved && card.options.length > 0));
  }
  assert(raw.savedPredecessor && raw.newManagerDesk && raw.newManagerDesk.matches > 0);
  return { raw, cases: cases.map(row => ({ title: row.title, status: row.status })) };
}
const observations = new Map();
try {
  for (const variant of variants) {
    const directory = path.join(OUT, variant.name), project = path.join(temporary, variant.name);
    fs.mkdirSync(directory); fs.mkdirSync(project);
    for (const item of copyRoots) fs.cpSync(path.join(ROOT, item), path.join(project, item), { recursive: true });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(project, 'node_modules'), 'junction');
    fs.writeFileSync(path.join(project, CALENDAR), variant.source);
    fs.writeFileSync(path.join(directory, 'calendar.ts'), variant.source);
    const copiedSource = {};
    for (const file of files.filter(file => file.startsWith('src/'))) {
      const hash = sha(lf(fs.readFileSync(path.join(project, file)))); copiedSource[file] = hash;
      assert.equal(hash, file === CALENDAR ? sha(variant.source) : sourceBefore[file], 'Copied app differs only at declared calendar control: ' + file);
    }
    fs.writeFileSync(path.join(directory, 'source.json'), JSON.stringify({ calendarSha256: sha(variant.source), copiedSource }, null, 2));
    const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--config', path.join(project, 'vitest.config.ts'),
      '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile=' + path.join(directory, 'unit.json')];
    const child = spawnSync(process.execPath, args, { cwd: project, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, SIM_NETWORK: 'offline', TZ: 'UTC', CM_HANDOVER_RECEIPT: path.join(directory, 'raw-states.json'),
        SIM_OFFLINE_RECEIPT: path.resolve(ROOT, process.env.SIM_OFFLINE_RECEIPT || 'manager-handover-artifacts/transport.log'),
        NODE_OPTIONS: `--require=${path.join(ROOT, 'scripts/lib/offlineTransport.cjs')}` } });
    fs.writeFileSync(path.join(directory, 'stdout.log'), child.stdout || '');
    fs.writeFileSync(path.join(directory, 'stderr.log'), child.stderr || '');
    const row = { name: variant.name, faults: variant.faults, command: [process.execPath, ...args], cwd: project,
      exit: child.status, signal: child.signal, error: child.error?.message || null, calendarSha256: sha(variant.source) };
    receipt.arms.push(row); fs.writeFileSync(path.join(directory, 'process.json'), JSON.stringify(row, null, 2));
    const result = verifyReport(directory, child, variant.faults); observations.set(variant.name, result.raw); row.cases = result.cases;
    console.log(`${variant.name}: ${10 - variant.faults.length * 2} passed, ${variant.faults.length * 2} exact expected faults; full state and draw holds.`);
  }
  const normal = observations.get('normal'), historical = observations.get('original-calendar');
  assert.deepEqual(observations.get('restored'), normal, 'Restoring both fields restores every raw observation and draw');
  for (const method of ['picker', 'job']) {
    for (const variant of variants) {
      for (const fixture of ['reference', 'prepared']) {
        const key = `${method}-${fixture}`, observed = observations.get(variant.name)[key];
        assert.deepEqual(withoutDesk(observed.state), withoutDesk(normal[key].state), 'Calendar controls preserve every other state field');
        assert.deepEqual(observed.draws, normal[key].draws, 'Calendar controls preserve the full match RNG trace');
        if (!variant.faults.includes(method)) assert.deepEqual(observed.state, normal[key].state, 'Unaffected appointment stays byte-exact');
      }
    }
    for (const fixture of ['reference', 'prepared']) {
      const key = `${method}-${fixture}`;
      const currentBytes = Buffer.byteLength(JSON.stringify(normal[key].state));
      const originalBytes = Buffer.byteLength(JSON.stringify(historical[key].state));
      assert(currentBytes <= originalBytes, 'Clearing predecessor cards cannot increase the observed career save size');
      receipt.comparisons.push({ appointment: key, currentBytes, originalBytes, otherStateHeld: true, drawsHeld: true });
    }
  }
  receipt.status = 'pass';
} finally {
  const sourceAfter = Object.fromEntries(files.map(file => [file, sha(read(file))]));
  receipt.sourceAfter = sourceAfter; receipt.sourceHeld = JSON.stringify(sourceAfter) === JSON.stringify(sourceBefore);
  if (!receipt.sourceHeld) receipt.status = 'failed-source-hold';
  fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(receipt, null, 2));
  fs.rmSync(temporary, { recursive: true, force: true });
  assert.deepEqual(sourceAfter, sourceBefore, 'All tracked app, proof and verification bytes remain held');
}
console.log('simCmHandoverDesk: five qualified arms, frozen ten-case method, both isolated missing-field controls, complete original calendar and full restoration.');