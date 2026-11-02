import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = path.join(root, 'src/pages/GrandPrixBoss.tsx');
const test = 'src/test/grandPrixBossPage.test.tsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const original = fs.readFileSync(page);
const source = original.toString('utf8');
const held = new Map([page, test, 'src/hooks/useGrandPrixBoss.ts', 'src/lib/grandPrixBoss.ts', 'src/lib/saveFence.ts', 'src/hooks/useSaveFenceWatch.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'].map(file => [path.resolve(root, file), sha(fs.readFileSync(path.resolve(root, file)))]));
const base = process.env.GP_BOSS_PAGE_OUT || os.tmpdir();
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-page-'));
const ids = ['GP_PAGE_AVAILABLE:', 'GP_PAGE_START:', 'GP_PAGE_HUB:', 'GP_PAGE_UPGRADE:', 'GP_PAGE_ORDERS:', 'GP_PAGE_STANDINGS:', 'GP_PAGE_BACK:', 'GP_PAGE_MOVED_EMPTY:', 'GP_PAGE_PROTECTED_SAVE:'];
const faults = [
  ['start', 'GP_PAGE_START:', 'game.start(crypto.getRandomValues(new Uint32Array(1))[0])', 'false'],
  ['labels', 'GP_PAGE_HUB:', ' aria-label={name}', ''],
  ['qualify', 'GP_PAGE_HUB:', "return dispatch({ type: 'qualify', expectedRevision: career.revision });", 'return false;'],
  ['price', 'GP_PAGE_UPGRADE:', "cost === null ? 'At the limit' : money(cost)", "cost === null ? 'At the limit' : money(cost + 1)"],
  ['revision', 'GP_PAGE_UPGRADE:', "game.dispatch({ type: 'upgrade', area, expectedRevision: career.revision })", "game.dispatch({ type: 'upgrade', area, expectedRevision: career.revision + 1 })"],
  ['orders', 'GP_PAGE_ORDERS:', 'compound: choices[driver.id]?.compound ?? entry.compound', "compound: 'soft'"],
  ['standings', 'GP_PAGE_STANDINGS:', "title: 'Driver standings'", "title: 'Changed driver table'"],
  ['back', 'GP_PAGE_BACK:', "if (from) openers.current[from]?.focus({ preventScroll: true });", "if (from) heading.current?.focus({ preventScroll: true });"],
  ['moved', 'GP_PAGE_MOVED_EMPTY:', "game.status === 'empty' && !game.moved", "game.status === 'empty'"],
  ['protected', 'GP_PAGE_PROTECTED_SAVE:', "game.status === 'empty' && !game.moved", "game.status !== 'ready'"],
];
const outcomes = [];
function run(name, redId = null, file = null, lookupFailure = false) {
  const reportFile = path.join(out, name + '.json');
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (redId) args.push('--testNamePattern=' + redId);
  const env = { ...process.env };
  for (const key of ['GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  if (file) env.GP_BOSS_PAGE_FILE = file;
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  assert.ifError(child.error); assert.equal(child.signal, null);
  assert.equal(child.status, redId ? 1 : 0, name + ': wrong raw exit');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1);
  const rows = report.testResults[0].assertionResults;
  assert.equal(rows.length, ids.length);
  assert.equal(report.numTotalTests, 9); assert.equal(report.numTodoTests, 0);
  const seen = new Set();
  for (const row of rows) {
    const matches = ids.filter(id => row.title.startsWith(id));
    assert.equal(matches.length, 1); assert(!seen.has(matches[0])); seen.add(matches[0]);
    assert.equal(row.status, !redId ? 'passed' : matches[0] === redId ? 'failed' : 'skipped');
    if (matches[0] === redId) {
      assert.equal(row.failureMessages.length, 1);
      const error = row.failureMessages[0];
      if (lookupFailure) assert(/TestingLibraryElementError/.test(error) && /Unable to find/.test(error), name + ': the missing visible table heading must own this failure');
      else assert(/AssertionError/.test(error), name + ': intended assertion required');
      if (name === 'absence') assert(error.includes('GP_PAGE_MODULE_MISSING'));
    }
  }
  const counters = { numUnhandledErrors: report.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null };
  for (const value of Object.values(counters)) if (value !== null) assert.equal(value, 0);
  for (const errors of [report.errors, report.unhandledErrors]) if (Array.isArray(errors)) assert.equal(errors.length, 0);
  const raw = (child.stdout || '') + (child.stderr || '');
  assert(!/Unhandled (?:Errors?|Rejection)|Vitest caught \d+ unhandled/.test(raw));
  for (const [filePath, hash] of held) assert.equal(sha(fs.readFileSync(filePath)), hash, name + ': actual source changed');
  const row = { name, rawExit: child.status, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests, counters, rawErrors: report.errors ?? null, rawUnhandledErrors: report.unhandledErrors ?? null };
  outcomes.push(row);
  console.log(name + ': ' + row.passed + ' passed, ' + row.failed + ' owned failures, ' + row.skipped + ' declared skips; counters ' + JSON.stringify(counters));
}
try {
  fs.writeFileSync(path.join(out, 'original-page.tsx'), original);
  run('current');
  const copy = path.join(out, 'GrandPrixBoss.tsx');
  fs.writeFileSync(copy, original); run('healthy-copy', null, copy);
  for (const [name, id, before, after] of faults) {
    assert.equal(source.split(before).length - 1, 1, name + ': unique executed anchor');
    const at = source.indexOf(before);
    const changed = source.slice(0, at) + after + source.slice(at + before.length);
    assert.notEqual(changed, source);
    const inverse = changed.slice(0, at) + before + changed.slice(at + after.length);
    assert.equal(inverse, source, name + ': complete inverse');
    fs.writeFileSync(copy, changed);
    fs.writeFileSync(path.join(out, name + '-copy.tsx'), changed);
    fs.writeFileSync(path.join(out, name + '-edit.json'), JSON.stringify({ at, before, after, originalSha256: sha(original), changedSha256: sha(changed), inverseSha256: sha(inverse) }, null, 2));
    run(name, id, copy, name === 'standings' || name === 'labels');
  }
  const absent = path.join(out, 'not-created.tsx'); assert(!fs.existsSync(absent));
  run('absence', 'GP_PAGE_AVAILABLE:', absent);
  fs.writeFileSync(copy, original); run('restored-copy', null, copy);
  assert.equal(outcomes.length, 14);
  assert.equal(outcomes.reduce((sum, row) => sum + row.passed, 0), 27);
  assert.equal(outcomes.reduce((sum, row) => sum + row.failed, 0), 11);
  assert.equal(outcomes.reduce((sum, row) => sum + row.skipped, 0), 88);
  console.log('simGrandPrixBossPage: 27 healthy passes, eleven effective owned copy faults, eighty-eight declared unselected skips.');
} finally {
  for (const [filePath, hash] of held) assert.equal(sha(fs.readFileSync(filePath)), hash, 'Actual source must remain held');
  fs.writeFileSync(path.join(out, 'outcomes.json'), JSON.stringify(outcomes, null, 2));
  console.log('Grand Prix Boss page evidence: ' + out);
}
