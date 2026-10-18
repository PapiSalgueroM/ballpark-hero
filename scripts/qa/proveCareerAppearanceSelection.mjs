import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// Run only in remote CI. Controls use copied components and the existing alias seam.
const base = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const component = 'src/components/soccer-career/AppearanceBuilder.tsx';
const fixture = 'src/test/careerAppearanceSelection.test.tsx';
const related = 'src/test/appearanceSportCopy.test.tsx';
const mode = process.argv[2];
assert(['baseline', 'fixed'].includes(mode), 'Explicit baseline or fixed mode');
const out = process.env.APPEARANCE_SELECTION_OUT;
assert(out && path.isAbsolute(out) && fs.existsSync(out), 'Existing absolute outside evidence folder');
assert(!path.relative(process.cwd(), out).split(path.sep).every(part => part !== '..'), 'Evidence stays outside checkout');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Offline preload inherited');
assert.equal(process.versions.node.split('.')[0], '24');
const sha = body => createHash('sha256').update(body).digest('hex');
const clean = value => value.replace(/\x1b\[[0-9;]*m/g, '');
const original = execFileSync('git', ['show', `${base}:${component}`], { encoding: 'utf8' });
const source = fs.readFileSync(component, 'utf8');
const bindings = [
  { target: 'category', anchor: 'key={t.key}', extra: '\n            aria-pressed={tab === t.key}' },
  { target: 'skinTone', anchor: 'key={s.id}', extra: '\n                aria-pressed={appearance.skinTone === s.id}' },
  { target: 'hairstyle', anchor: 'key={h.id}', extra: ' aria-pressed={appearance.hairstyle === h.id}' },
  { target: 'hairColor', anchor: 'key={c.id}\n                  onClick', replacement: 'key={c.id}\n                  aria-pressed={appearance.hairColor === c.id}\n                  onClick' },
  { target: 'facialHair', anchor: 'key={f.id}', extra: ' aria-pressed={appearance.facialHair === f.id}' },
  { target: 'boots', anchor: 'key={b.id}', extra: '\n                aria-pressed={appearance.boots === b.id}' },
  { target: 'accessory', anchor: 'key={a.id}', extra: ' aria-pressed={appearance.accessory === a.id}' },
  { target: 'celebration', anchor: 'key={c.id}\n                onClick', replacement: 'key={c.id}\n                aria-pressed={appearance.celebration === c.id}\n                onClick' },
];
function replaceOnce(body, from, to) {
  assert.equal(body.split(from).length - 1, 1, 'Exactly one executable source anchor');
  const changed = body.replace(from, to);
  assert.notEqual(changed, body, 'Control changes its source');
  return changed;
}
const apply = (body, binding) => replaceOnce(body, binding.anchor, binding.replacement ?? binding.anchor + binding.extra);
const undo = (body, binding) => replaceOnce(body, binding.replacement ?? binding.anchor + binding.extra, binding.anchor);
const expectedFixed = bindings.reduce(apply, original);
assert.equal(bindings.reduce(undo, expectedFixed), original, 'Whole eight-attribute inverse');
assert.equal(source, mode === 'baseline' ? original : expectedFixed, 'Only eight exact selected-state attributes');
const sports = ['soccer', 'nfl', 'nba', 'mlb', 'nhl'];
const titles = sports.flatMap(sport => bindings.map(({ target }) => `${sport} appearance ${target} exposes its selected button`));
const manifest = { version: 1, mode, base, source: sha(source), original: sha(original), fixed: sha(expectedFixed), fixture: sha(fs.readFileSync(fixture)), related: sha(fs.readFileSync(related)), arms: [] };
const write = (file, body) => fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
const observations = new Map();
function behavior(value) {
  if (Array.isArray(value)) return value.map(behavior);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['pressed', 'selectionCorrect'].includes(key)).map(([key, item]) => [key, behavior(item)]));
  return value;
}
write('original-component.tsx', original);
write('expected-fixed-component.tsx', expectedFixed);
function run(name, input, file, faults = [], total = 40) {
  const raw = path.join(out, `${name}.raw.json`), report = path.join(out, `${name}.vitest.json`);
  const env = { ...process.env, APPEARANCE_SELECTION_RAW: file === fixture ? raw : '', SIM_OFFLINE_RECEIPT: path.join(out, `${name}.transport`) };
  delete env.NO_DOUBLE_SWAP;
  if (input !== null) {
    const redirect = path.join(out, `${name}.component.tsx`);
    const copied = replaceOnce(input, 'from "./PlayerAvatar"', 'from "@/components/soccer-career/PlayerAvatar"');
    fs.writeFileSync(redirect, copied, { flag: 'wx' });
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/soccer-career/AppearanceBuilder': redirect });
  }
  const args = ['node_modules/vitest/vitest.mjs', 'run', file, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', `--outputFile=${report}`];
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 360000, maxBuffer: 64 * 1024 * 1024 });
  write(`${name}.stdout.log`, result.stdout ?? '');
  write(`${name}.stderr.log`, result.stderr ?? '');
  write(`${name}.process.json`, JSON.stringify({ args, status: result.status, signal: result.signal, error: result.error ? String(result.error) : null }, null, 2) + '\n');
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${name} completed`);
  const output = clean((result.stdout ?? '') + '\n' + (result.stderr ?? ''));
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|TypeError:|ReferenceError:|SyntaxError:|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND/i.test(output), `${name} no setup or unhandled errors`);
  assert.equal(result.status, faults.length ? 1 : 0, `${name} actual child exit`);
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  const rows = json.testResults.flatMap(row => row.assertionResults);
  assert.equal(json.numTotalTests, total, `${name} test total`);
  assert.equal(json.numPendingTests, 0, `${name} no skipped cases`);
  assert.equal(json.numTodoTests, 0, `${name} no todo cases`);
  assert.equal(json.testResults.length, 1, `${name} one actual test file`);
  if (json.numRuntimeErrorTestSuites !== undefined) assert.equal(json.numRuntimeErrorTestSuites, 0, `${name} no runtime errors`);
  if (json.unhandledErrors !== undefined) assert.deepEqual(json.unhandledErrors, [], `${name} no unhandled errors`);
  assert.equal(json.success, faults.length === 0, `${name} overall test result`);
  assert.equal(rows.length, total);
  assert.equal(json.numFailedTests, faults.length);
  assert.equal(json.numPassedTests, total - faults.length);
  const failed = rows.filter(row => row.status === 'failed');
  const shortTitle = row => row.title ?? row.fullName;
  assert(rows.every(row => ['passed', 'failed'].includes(row.status)), `${name} all explicit completed statuses`);
  assert.deepEqual(failed.map(shortTitle).sort(), [...faults].sort(), `${name} exact causal targets`);
  for (const row of rows) {
    if (row.status === 'passed') assert.deepEqual(row.failureMessages, [], `${name} healthy case has no failure`);
    else {
      assert.equal(row.failureMessages.length, 1, `${name} one precise assertion`);
      const failure = clean(row.failureMessages[0]);
      assert(failure.startsWith('AssertionError: ACCESSIBLE_APPEARANCE_SELECTION:'), `${name} semantic assertion, not driver failure`);
      assert(/expected false to be true/i.test(failure), `${name} exact missing selected-state Boolean`);
    }
  }
  let rawSha256 = null;
  if (file === fixture) {
    const bytes = fs.readFileSync(raw), observation = JSON.parse(bytes);
    assert.equal(observation.version, 1);
    assert.deepEqual(observation.caseTitles, titles);
    assert.equal(Object.keys(observation.cases).length, 40);
    observations.set(name, observation);
    rawSha256 = sha(bytes);
  }
  assert.equal(fs.readFileSync(component, 'utf8'), source, `${name} actual product body held`);
  assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, `${name} no outbound transport`);
  const row = { name, tests: total, passed: total - faults.length, failed: faults.length, failedTitles: faults, rawSha256 };
  manifest.arms.push(row);
  console.log(`${name}: ${row.passed} pass, ${row.failed} exact semantic faults`);
  return row;
}
try {
  if (mode === 'baseline') {
    run('baseline-original', null, fixture, titles);
    run('baseline-related', null, related, [], 11);
    manifest.status = 'diagnosed-original-only';
  } else {
    assert.match(process.env.APPEARANCE_SELECTION_BASELINE_SHA ?? '', /^[a-f0-9]{64}$/, 'Actual baseline raw binding required');
    run('normal', null, fixture);
    const originalArm = run('original-inverse', original, fixture, titles);
    assert.equal(originalArm.rawSha256, process.env.APPEARANCE_SELECTION_BASELINE_SHA, 'Whole original observations equal separately received baseline');
    const normalRaw = observations.get('normal');
    assert.deepEqual(behavior(observations.get('original-inverse')), behavior(normalRaw), 'Original and fixed retain every non-semantic observation');
    for (const binding of bindings) {
      const changed = undo(source, binding);
      assert.equal(apply(changed, binding), source, 'Single binding control exact inverse');
      run(`remove-${binding.target}`, changed, fixture, sports.map(sport => `${sport} appearance ${binding.target} exposes its selected button`));
      const controlRaw = observations.get(`remove-${binding.target}`);
      assert.deepEqual(behavior(controlRaw), behavior(normalRaw), 'Control retains all callback, state, storage, RNG, option and text observations');
      for (const [key, row] of Object.entries(normalRaw.cases)) if (row.target !== binding.target)
        assert.deepEqual(controlRaw.cases[key], row, 'All35 unaffected cases retain their complete raw rows');
    }
    run('restored', null, fixture);
    assert.equal(manifest.arms[0].rawSha256, manifest.arms.at(-1).rawSha256, 'Whole normal and restored observations match');
    run('related-normal', null, related, [], 11);
    run('related-restored', null, related, [], 11);
    manifest.status = 'passed';
  }
} catch (error) {
  manifest.status = 'failed'; manifest.error = String(error.stack || error); throw error;
} finally {
  assert.equal(fs.readFileSync(component, 'utf8'), source, 'Final actual component held');
  write('proof.json', JSON.stringify(manifest, null, 2) + '\n');
}
