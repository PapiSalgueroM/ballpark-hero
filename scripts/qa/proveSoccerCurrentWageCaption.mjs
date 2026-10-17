// Remote-only proof of the current-contract caption and unchanged wage mechanics.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = 'dbb24af7931ea927567d573c6287a45f08fb352a';
const TEST = 'src/test/soccerCareerCurrentWageCaption.test.ts';
const TEST_SHA = '0a8558b1d4aaf6452ad0f5e05b94d0507eb7b04b55c8fb135212de569c26b8fc';
const SELF = 'scripts/qa/proveSoccerCurrentWageCaption.mjs';
const WORKFLOW = '.github/workflows/soccer-current-wage-caption.yml';
const CATALOG = 'src/lib/soccerCareerCorruption.ts', CONSTANTS = 'src/lib/soccerCareerCorruptionConsequences.ts';
const CURRENT = 'Current wage +8%, Integrity +10', LEGACY = 'Wage +8% permanently, Integrity +10';
const KEYS = ['fresh', 'restored', 'callback', 'newContract', 'siblingsAndCaptions', 'wageAndUnknown', 'readOnly'];
const TITLES = [
  'fresh contract choice describes the current wage increase',
  'restored contract choice refreshes the current wage caption',
  'the actual contract choice raises the current wage with existing rounding',
  'accepting a new contract replaces the earlier current-wage increase',
  'the other contract choice and existing shared captions stay unchanged',
  'wage-demand and unknown-caption fallbacks keep their existing behavior',
  'restored caption reads preserve the whole save and random stream',
];
const CAUSES = ['Fresh corruption choice 332:1 must describe the current wage increase', 'Restored corruption choice 332:1 must describe the current wage increase'];
const RELATED = ['src/test/soccerCareerCorruptionChoicePreviews.test.ts', 'src/test/soccerCareerLifeChoicePreviews.test.ts'];
const mode = process.argv[2], out = process.env.CURRENT_WAGE_OUT;
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const original = file => git(['show', `${BASE}:${file}`]);
const sourceMap = names => Object.fromEntries(names.map(file => [file, sha(fs.readFileSync(file))]));
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, `Unique source anchor: ${before}`);
  const changed = source.replace(before, after); assert.notEqual(changed, source);
  assert.equal(changed.split(after).length, 2, 'Unique changed operand');
  return changed;
}
const require = createRequire(import.meta.url);
assert(['baseline', 'fixed'].includes(mode), 'Use baseline or fixed');
assert(out && path.isAbsolute(out), 'CURRENT_WAGE_OUT is absolute');
assert(process.env.CI === '1' || process.env.CI === 'true', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline simulation mode');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Offline preload inherited');
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual offline preload loaded');
fs.mkdirSync(out, { recursive: true });
assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh owned report path');
const report = { version: 1, mode, base: BASE, status: 'running', qualified: false, arms: [], related: [], limits: 'Two consequence fields only. Actual callback and acceptOffer are exercised without changing either. JSON getter coverage is not a browser rendering or live claim.' };
let before, names;
try {
  git(['merge-base', '--is-ancestor', BASE, 'HEAD']);
  const allowed = new Set([CATALOG, CONSTANTS, TEST, SELF, WORKFLOW]);
  const changed = git(['diff', '--name-only', BASE, 'HEAD', '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(file => allowed.has(file)), `Only declared source leaves: ${changed}`);
  git(['diff', '--exit-code', 'HEAD', '--', '.', ':!docs']);
  assert.equal(sha(fs.readFileSync(TEST)), TEST_SHA, 'Frozen whole seven-case test');
  const catalog = original(CATALOG), constants = original(CONSTANTS);
  assert.equal(sha(catalog), '9f69c74b02cd87e5a7739034b5ed0c3e5ecb6cd0f7257df8651dfdd5938beed1');
  assert.equal(sha(constants), 'e16855d5e840927fbb08458eb7ab4db1abf16cb77d35cabc7fd60fb882600681');
  const catalogFrom = `consequence: "${LEGACY}"`, catalogTo = 'consequence: SOCCER_CORRUPTION_CONSEQUENCES[332][1]';
  const recordFrom = '\n};\n', recordTo = `\n  332: { 1: '${CURRENT}' },\n};\n`;
  const expectedCatalog = once(catalog.toString(), catalogFrom, catalogTo);
  const expectedConstants = once(constants.toString(), recordFrom, recordTo);
  const candidate = { [CATALOG]: Buffer.from(expectedCatalog), [CONSTANTS]: Buffer.from(expectedConstants) };
  assert.equal(once(expectedCatalog, catalogTo, catalogFrom), catalog.toString(), 'Whole catalog inverse');
  assert.equal(once(expectedConstants, recordTo, recordFrom), constants.toString(), 'Whole consequence record inverse');
  for (const file of Object.keys(candidate)) assert(fs.readFileSync(file).equals(mode === 'baseline' ? original(file) : candidate[file]), `Exact whole reviewed source: ${file}`);
  fs.writeFileSync(path.join(out, 'originalCatalogue.ts'), catalog, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'originalConsequences.ts'), constants, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.ts'), fs.constants.COPYFILE_EXCL);
  json(path.join(out, 'source-bindings.json'), { base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), mode, changed,
    test: { file: TEST, sha256: TEST_SHA }, original: { [CATALOG]: sha(catalog), [CONSTANTS]: sha(constants) },
    candidate: Object.fromEntries(Object.entries(candidate).map(([file, body]) => [file, sha(body)])), current: CURRENT, legacy: LEGACY });
  names = git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(); before = sourceMap(names);
  json(path.join(out, 'source-before.json'), before);
  function child(label, tests, expectedSource, rawName) {
    assert.deepEqual(sourceMap(names), expectedSource, `${label} whole source before`);
    const dir = path.join(out, label); fs.mkdirSync(dir);
    const args = ['node_modules/vitest/vitest.mjs', 'run', ...tests, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile=${path.join(dir, 'vitest.json')}`];
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, SC_CURRENT_WAGE_RAW: rawName ? path.join(dir, rawName) : '', SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') } });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    const record = { label, status: 'unqualified', exit: result.status, signal: result.signal, error: result.error?.message || null, args };
    json(path.join(dir, 'process.json'), record); json(path.join(dir, 'source-after.json'), sourceMap(names));
    assert.deepEqual(sourceMap(names), expectedSource, `${label} whole source after`);
    assert(!result.error && !result.signal, `${label} completed child`);
    const output = (result.stdout || '') + (result.stderr || '');
    assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Cannot find module|No test files found|SIM_OFFLINE_BLOCK|TypeError:|ReferenceError:|SyntaxError:/i.test(output), `${label} no setup or transport fault`);
    const units = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))), rows = units.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(units.testResults.length, tests.length); assert.deepEqual(units.testResults.map(suite => suite.name.replaceAll('\\', '/').split('/src/test/')[1]).sort(), tests.map(test => test.slice('src/test/'.length)).sort());
    assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
    const transport = path.join(dir, 'units.transport'); assert(!fs.existsSync(transport) || fs.statSync(transport).size === 0, `${label} zero ordinary transport blocks`);
    return { dir, result, record, units, rows };
  }
  function related(label, expectedSource) {
    const run = child(label, RELATED, expectedSource); report.related.push(run.record);
    assert.equal(run.result.status, 0); assert.equal(run.units.success, true); assert.equal(run.units.numTotalTests, 28);
    assert.equal(run.units.numPassedTests, 28); assert.equal(run.units.numFailedTests, 0); assert.equal(run.rows.length, 28);
    assert(run.rows.every(row => row.status === 'passed' && row.failureMessages.length === 0));
    const counts = Object.fromEntries(run.units.testResults.map(suite => [suite.name.replaceAll('\\', '/').split('/src/test/')[1], suite.assertionResults.length]));
    assert.deepEqual(counts, { 'soccerCareerCorruptionChoicePreviews.test.ts': 10, 'soccerCareerLifeChoicePreviews.test.ts': 18 });
    Object.assign(run.record, { status: 'qualified', passed: 28, failed: 0 });
  }
  function arm(label, faults, expectedSource) {
    const run = child(label, [TEST], expectedSource, 'observations.json'); report.arms.push(run.record);
    assert.equal(run.result.status, faults ? 1 : 0); assert.equal(run.units.success, !faults);
    assert.equal(run.units.numTotalTests, 7); assert.equal(run.units.numPassedTests, faults ? 5 : 7); assert.equal(run.units.numFailedTests, faults ? 2 : 0); assert.equal(run.rows.length, 7);
    assert.deepEqual(run.rows.map(row => row.title), TITLES);
    for (const [index, row] of run.rows.entries()) {
      assert.equal(row.status, faults && index < 2 ? 'failed' : 'passed');
      if (row.status === 'failed') { const failure = row.failureMessages.join('\n'); assert(failure.includes(CAUSES[index]), 'Exact named caption cause'); assert(/expected false to be true/i.test(failure), 'Exact caption Boolean assertion'); }
      else assert.equal(row.failureMessages.length, 0);
    }
    const rawBytes = fs.readFileSync(path.join(run.dir, 'observations.json')), raw = JSON.parse(rawBytes);
    assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
    for (const [index, key] of KEYS.entries()) {
      const row = raw.cases[key]; assert.equal(row.title, TITLES[index]);
      if (row.lookups) {
        assert(row.before.length > 0); assert.deepEqual(row.after, row.before, `${key} whole inputs held`); assert.deepEqual(row.draws, []); assert(row.lookups.length > 0);
        for (const lookup of row.lookups) {
          assert(Number.isInteger(lookup.careerIndex) && lookup.careerIndex >= 0 && lookup.careerIndex < row.before.length);
          for (const field of ['saved', 'expected', 'actual']) assert.equal(typeof lookup[field], 'string');
          assert.equal(lookup.actual, faults && index < 2 ? LEGACY : lookup.expected);
        }
        if (index < 2) {
          assert.equal(row.lookups.length, 1); assert.equal(row.lookups[0].id, 332); assert.equal(row.lookups[0].index, 1); assert.equal(row.lookups[0].expected, CURRENT);
          if (index === 0) { assert.equal(row.catalogConsequence, faults ? LEGACY : CURRENT); assert.equal(row.callbackPresent, true); }
          else { assert.equal(row.callbacksAbsent, true); assert.equal(row.lookups[0].saved, LEGACY); }
        }
      } else {
        assert.equal(row.currentEvent, null); assert.equal(row.operations.length, key === 'callback' ? 3 : 2);
        for (const operation of row.operations) {
          assert.deepEqual(operation.draws, []); assert.equal(operation.before.agentId, 'self');
          if (operation.label === 'actual-332-choice') {
            assert.equal(operation.after.weeklyWage, Math.round(operation.before.weeklyWage * 1.08));
            assert.equal(operation.after.integrityBonus, operation.before.integrityBonus + 10);
            assert.deepEqual(operation.inputAfter, operation.after); assert.deepEqual(operation.after.pendingEvents, []);
            assert.deepEqual(operation.after, { ...operation.before, weeklyWage: Math.round(operation.before.weeklyWage * 1.08), integrityBonus: operation.before.integrityBonus + 10,
              events: [...operation.before.events, '📃 Insisted every euro went on the official contract. Your accountant framed it'] });
          } else {
            assert.equal(operation.label, 'public-acceptOffer'); assert.equal(operation.before.weeklyWage, 108000); assert.equal(operation.after.weeklyWage, 70000);
            assert.equal(operation.after.contractYearsLeft, 3); assert.equal(operation.after.currentClub, 'Wage Fixture United'); assert.equal(operation.after.phase, 'playing');
            assert.deepEqual(operation.after.pendingOffers, []); assert.equal(operation.after.integrityBonus, 15);
            assert.equal(operation.after.dirtyMoney, operation.before.dirtyMoney); assert.equal(operation.after.netWorth, operation.before.netWorth);
            assert.deepEqual(operation.inputAfter, operation.before); assert.deepEqual(operation.offerAfter, operation.offerBefore);
          }
        }
      }
    }
    Object.assign(run.record, { status: 'qualified', passed: run.units.numPassedTests, failed: run.units.numFailedTests, rawBytes: rawBytes.length, rawSha256: sha(rawBytes) });
    related(`${label}-related`, expectedSource);
    return { raw, rawBytes };
  }
  if (mode === 'baseline') arm('baseline', true, before);
  else {
    assert(/^[a-f0-9]{64}$/.test(process.env.CURRENT_WAGE_BASELINE_RAW_SHA256 || ''), 'Actual separately qualified baseline raw SHA is mandatory');
    const normal = arm('normal', false, before);
    const originalMap = { ...before, [CATALOG]: sha(catalog), [CONSTANTS]: sha(constants) };
    let control;
    try { fs.writeFileSync(CATALOG, catalog); fs.writeFileSync(CONSTANTS, constants); control = arm('original', true, originalMap); }
    finally { for (const [file, body] of Object.entries(candidate)) fs.writeFileSync(file, body); assert.deepEqual(sourceMap(names), before, 'Whole candidate restored in finally'); }
    assert.equal(sha(control.rawBytes), process.env.CURRENT_WAGE_BASELINE_RAW_SHA256, 'Whole original raw equals actual qualified baseline');
    for (const key of KEYS.slice(2)) assert.deepEqual(normal.raw.cases[key], control.raw.cases[key], `Whole preserved outcome: ${key}`);
    const restored = arm('restored', false, before); assert(restored.rawBytes.equals(normal.rawBytes), 'Whole restored raw bytes equal normal');
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  if (before) { const after = sourceMap(names); json(path.join(out, 'source-after.json'), after); try { assert.deepEqual(after, before, 'Whole final source held'); report.sourceHeld = true; } catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; } }
  json(path.join(out, 'report.json'), report); console.log(`Current wage caption ${mode}: ${report.status}; ${report.arms.length} completed arm receipt(s), ${report.related.length} related suites of 28, qualified=${report.qualified}`);
}
