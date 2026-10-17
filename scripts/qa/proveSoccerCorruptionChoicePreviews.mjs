// Remote-only caption proof. This reads actual getters and catalog rows without applying a choice.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = 'dccd1e146c27c7f6c889b180f371581d60e75b4b';
const TEST = 'src/test/soccerCareerCorruptionChoicePreviews.test.ts';
const TEST_SHA = 'ef4c9d79811d5453d4529ff35fe4429fa617fba3704f0f228cec75aed75b9a59';
const SELF = 'scripts/qa/proveSoccerCorruptionChoicePreviews.mjs';
const WORKFLOW = '.github/workflows/soccer-restored-choice-captions.yml';
const CATALOG = 'src/lib/soccerCareerCorruption.ts', CONTRACTS = 'src/lib/soccerCareerContracts.ts';
const CONSTANTS = 'src/lib/soccerCareerCorruptionConsequences.ts';
const IMPORT = "import { SOCCER_CORRUPTION_CONSEQUENCES } from './soccerCareerCorruptionConsequences';\n";
const CURRENT = [
  [315, 0, 'Heat +12. To clean dirty money each season, buy a laundering item in My Life > The other list.'],
  [320, 1, '€2M dirty now, Heat +25'],
  [320, 2, 'Heat -30, Integrity +14, Morale up to +10'],
  [325, 0, 'Pay 40% of hidden money plus 5% of net worth, Heat drops to almost nothing'],
];
const KEYS = ['restored315_0', 'restored320_1', 'restored320_2', 'restored325_0', 'fresh', 'siblings', 'unknown', 'life', 'wage', 'readOnly'];
const TITLES = [
  ...CURRENT.map(([id, index]) => `restored corruption caption ${id}:${index} uses the current consequence`),
  'fresh corruption choices keep all eight qualified consequences',
  'unchanged corruption siblings preserve their saved consequences',
  'unknown events and choice indices preserve saved text',
  'existing Life consequence refreshes stay unchanged',
  'wage-demand consequences still use the current career',
  'corruption caption reads preserve the whole save and random stream',
];
const CAUSES = CURRENT.map(([id, index]) => `Restored corruption choice ${id}:${index} must show its current qualified consequence`);
const mode = process.argv[2], out = process.env.CORRUPTION_PREVIEWS_OUT;
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const original = file => git(['show', `${BASE}:${file}`]);
const files = () => git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const sourceMap = names => Object.fromEntries(names.map(file => [file, fs.existsSync(file) ? sha(fs.readFileSync(file)) : null]));
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, `Unique source anchor: ${before}`);
  return source.replace(before, after);
}
const require = createRequire(import.meta.url);
assert(['baseline', 'fixed'].includes(mode), 'Use baseline or fixed');
assert(out && path.isAbsolute(out), 'CORRUPTION_PREVIEWS_OUT is absolute');
assert(process.env.CI === '1' || process.env.CI === 'true', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline simulation mode');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Offline preload inherited');
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual offline preload loaded');
assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh owned report path');
fs.mkdirSync(out, { recursive: true });
const report = { version: 1, mode, base: BASE, status: 'running', qualified: false, arms: [], limits: 'Caption lookup and existing catalog only. No callback action, migration, browser, economy or live claim.' };
let before, names;
try {
  git(['merge-base', '--is-ancestor', BASE, 'HEAD']);
  const allowed = new Set([CATALOG, CONTRACTS, CONSTANTS, TEST, SELF, WORKFLOW]);
  const changed = git(['diff', '--name-only', BASE, 'HEAD', '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(file => allowed.has(file)), `Only declared source leaves: ${changed}`);
  git(['diff', '--exit-code', 'HEAD', '--', '.', ':!docs']);
  assert.equal(sha(fs.readFileSync(TEST)), TEST_SHA, 'Frozen whole test');
  const catalog = original(CATALOG), contracts = original(CONTRACTS);
  assert.equal(sha(catalog), 'd8504b5bec9284cac0cc4ae7f7ec79b213550c39d3c84d9d15b8605170dc4a0c');
  assert.equal(sha(contracts), '153167ffd1b746d0311c07002b3dbdce996bdcf070b4496e381f0f78bcc7100a');
  assert.equal(git(['ls-tree', '--name-only', BASE, '--', CONSTANTS]).length, 0, 'New constant module absent from original source');
  let expectedCatalog = IMPORT + catalog.toString();
  for (const [id, index, value] of CURRENT) expectedCatalog = once(expectedCatalog, `consequence: "${value}"`, `consequence: SOCCER_CORRUPTION_CONSEQUENCES[${id}][${index}]`);
  const oldFallback = 'SOCCER_LIFE_CONSEQUENCES[eventId]?.[choiceIndex] ?? saved';
  const newFallback = 'SOCCER_LIFE_CONSEQUENCES[eventId]?.[choiceIndex] ?? SOCCER_CORRUPTION_CONSEQUENCES[eventId]?.[choiceIndex] ?? saved';
  const expectedContracts = once(contracts.toString(), "import { SOCCER_LIFE_CONSEQUENCES } from './soccerCareerLifeConsequences';\n", "import { SOCCER_LIFE_CONSEQUENCES } from './soccerCareerLifeConsequences';\n" + IMPORT).replace(oldFallback, newFallback);
  assert.equal(contracts.toString().split(oldFallback).length, 2, 'Unique original getter fallback');
  const expectedConstants = `export const SOCCER_CORRUPTION_CONSEQUENCES: Readonly<Record<number, Readonly<Record<number, string>>>> = {\n  315: { 0: '${CURRENT[0][2]}' },\n  320: {\n    1: '${CURRENT[1][2]}',\n    2: '${CURRENT[2][2]}',\n  },\n  325: { 0: '${CURRENT[3][2]}' },\n};\n`;
  const candidate = { [CATALOG]: Buffer.from(expectedCatalog), [CONTRACTS]: Buffer.from(expectedContracts), [CONSTANTS]: Buffer.from(expectedConstants) };
  if (mode === 'baseline') {
    assert(fs.readFileSync(CATALOG).equals(catalog), 'Whole original catalog');
    assert(fs.readFileSync(CONTRACTS).equals(contracts), 'Whole original getter module');
    assert(!fs.existsSync(CONSTANTS), 'No product constant module in baseline');
  } else {
    for (const file of Object.keys(candidate)) assert(fs.readFileSync(file).equals(candidate[file]), `Exact reviewed product body: ${file}`);
    let inverse = once(expectedCatalog, IMPORT, '');
    for (const [id, index, value] of CURRENT) inverse = once(inverse, `consequence: SOCCER_CORRUPTION_CONSEQUENCES[${id}][${index}]`, `consequence: "${value}"`);
    assert.equal(inverse, catalog.toString(), 'Four references and import invert to whole original catalog');
    assert.equal(once(once(expectedContracts, IMPORT, ''), newFallback, oldFallback), contracts.toString(), 'Import and fallback invert to whole original contracts');
  }
  fs.writeFileSync(path.join(out, 'originalCatalogue.ts'), catalog, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'originalContracts.ts'), contracts, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.ts'), fs.constants.COPYFILE_EXCL);
  json(path.join(out, 'source-bindings.json'), { base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), mode, test: { file: TEST, sha256: TEST_SHA }, original: { [CATALOG]: sha(catalog), [CONTRACTS]: sha(contracts), [CONSTANTS]: null }, candidate: Object.fromEntries(Object.entries(candidate).map(([file, body]) => [file, sha(body)])), currentConsequences: CURRENT });
  names = files(); before = sourceMap(names); json(path.join(out, 'source-before.json'), before);
  function runArm(label, preciseFaults, expectedSource) {
    assert.deepEqual(sourceMap(names), expectedSource, `${label} whole source before`);
    const dir = path.join(out, label); fs.mkdirSync(dir);
    const args = ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile=${path.join(dir, 'vitest.json')}`];
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, SC_CORRUPTION_CAPTIONS_RAW: path.join(dir, 'observations.json'), SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') } });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    const record = { label, status: 'unqualified', exit: result.status, signal: result.signal, args }; report.arms.push(record); json(path.join(dir, 'process.json'), record);
    json(path.join(dir, 'source-after.json'), sourceMap(names));
    assert.deepEqual(sourceMap(names), expectedSource, `${label} whole source after`); assert(!result.error && !result.signal, `${label} completed child`);
    const output = (result.stdout || '') + (result.stderr || ''); assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Cannot find module|No test files found|SIM_OFFLINE_BLOCK|TypeError:|ReferenceError:|SyntaxError:/i.test(output), `${label} no setup or transport fault`);
    assert.equal(result.status, preciseFaults ? 1 : 0, `${label} actual unit exit`);
    const units = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))), rows = units.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(units.testResults.length, 1); assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
    assert.equal(units.numTotalTests, 10); assert.equal(units.numPassedTests, preciseFaults ? 6 : 10); assert.equal(units.numFailedTests, preciseFaults ? 4 : 0); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.equal(rows.length, 10); assert.equal(units.success, !preciseFaults);
    assert.deepEqual(rows.map(row => row.title), TITLES);
    for (const [index, row] of rows.entries()) {
      assert.equal(row.status, preciseFaults && index < 4 ? 'failed' : 'passed');
      if (row.status === 'failed') { const failure = row.failureMessages.join('\n'); assert(failure.includes(CAUSES[index]), 'Exact named caption cause'); assert(/expected false to be true/i.test(failure), 'Exact caption Boolean assertion'); }
      else assert.equal(row.failureMessages.length, 0);
    }
    const rawBytes = fs.readFileSync(path.join(dir, 'observations.json')), raw = JSON.parse(rawBytes);
    assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
    for (const [index, key] of KEYS.entries()) {
      const row = raw.cases[key]; assert.equal(row.title, TITLES[index]); assert(Array.isArray(row.before) && row.before.length > 0); assert.deepEqual(row.after, row.before, `${key} whole inputs held`); assert.deepEqual(row.draws, []); assert(Array.isArray(row.lookups) && row.lookups.length > 0);
      for (const lookup of row.lookups) { assert(Number.isInteger(lookup.careerIndex) && lookup.careerIndex >= 0 && lookup.careerIndex < row.before.length); for (const field of ['saved', 'expected', 'actual']) assert.equal(typeof lookup[field], 'string'); }
      if (index < 4) { const [id, choice, expected] = CURRENT[index]; assert.equal(row.callbacksAbsent, true); assert.equal(row.lookups.length, 1); const lookup = row.lookups[0]; assert.equal(lookup.id, id); assert.equal(lookup.index, choice); assert.equal(lookup.expected, expected); assert.notEqual(lookup.saved, expected); assert.equal(lookup.actual, preciseFaults ? lookup.saved : expected); }
      else assert(row.lookups.every(lookup => lookup.actual === lookup.expected), `${key} literal preservation outcomes`);
    }
    const transport = path.join(dir, 'units.transport'); assert(!fs.existsSync(transport) || fs.statSync(transport).size === 0, `${label} zero owned ordinary transport blocks`);
    Object.assign(record, { status: 'qualified', passed: units.numPassedTests, failed: units.numFailedTests, rawBytes: rawBytes.length, rawSha256: sha(rawBytes) });
    return { raw, rawBytes };
  }
  if (mode === 'baseline') runArm('baseline', true, before);
  else {
    assert(/^[a-f0-9]{64}$/.test(process.env.SC_CORRUPTION_BASELINE_RAW_SHA256 || ''), 'Actual separately qualified baseline raw SHA is mandatory');
    const normal = runArm('normal', false, before);
    const originalMap = { ...before, [CATALOG]: sha(catalog), [CONTRACTS]: sha(contracts), [CONSTANTS]: null };
    let control;
    try { fs.writeFileSync(CATALOG, catalog); fs.writeFileSync(CONTRACTS, contracts); fs.unlinkSync(CONSTANTS); control = runArm('original', true, originalMap); }
    finally { for (const file of Object.keys(candidate)) fs.writeFileSync(file, candidate[file]); assert.deepEqual(sourceMap(names), before, 'Whole candidate restored in finally'); }
    assert.equal(sha(control.rawBytes), process.env.SC_CORRUPTION_BASELINE_RAW_SHA256, 'Whole original raw equals actual qualified baseline');
    for (const key of KEYS.slice(4)) assert.deepEqual(normal.raw.cases[key], control.raw.cases[key], `Whole preserved case: ${key}`);
    const restored = runArm('restored', false, before); assert(restored.rawBytes.equals(normal.rawBytes), 'Whole restored raw bytes equal normal');
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  if (before) { const after = sourceMap(names); json(path.join(out, 'source-after.json'), after); try { assert.deepEqual(after, before, 'Whole final source held'); report.sourceHeld = true; } catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; } }
  json(path.join(out, 'report.json'), report); console.log(`Corruption previews ${mode}: ${report.status}; ${report.arms.length} completed arm receipt(s), qualified=${report.qualified}`);
}
