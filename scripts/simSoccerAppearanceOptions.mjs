/* Round 1425: actual mounted options, old SVG equivalence and effective controls.
   Uses the unchanged original modules from Git, with all runtime offline. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const runtimeAliases = {
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'),
};
const OUT = process.env.APPEARANCE_OPTIONS_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-appearance-'));
fs.mkdirSync(OUT, { recursive: true });
const BASE = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const files = {
  '@/lib/soccerCareerAppearance': 'src/lib/soccerCareerAppearance.ts',
  '@/components/soccer-career/PlayerAvatar': 'src/components/soccer-career/PlayerAvatar.tsx',
  '@/components/soccer-career/AppearanceBuilder': 'src/components/soccer-career/AppearanceBuilder.tsx',
};
const original = {}, mapping = {};
const sourceBefore = Object.fromEntries(Object.values(files).map(file => [file, fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')]));
for (const [alias, file] of Object.entries(files)) {
  const read = spawnSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(read.status, 0, `Read original ${file}: ${read.stderr}`);
  original[file] = read.stdout;
  const dest = path.join(OUT, 'original-' + path.basename(file));
  const code = read.stdout.replace('from "./PlayerAvatar"', 'from "@/components/soccer-career/PlayerAvatar"');
  fs.writeFileSync(dest, code); mapping[alias] = dest;
}
const baseline = path.join(OUT, 'original-svg.json');
const summary = [];
function run(name, env = {}, pattern, want = { passed: 28, failed: 0, pending: 0 }) {
  const report = path.join(OUT, name + '.json');
  const receipt = path.join(OUT, name + '.transport');
  const args = ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerAppearanceOptions.test.tsx',
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + report];
  if (pattern) args.push('-t', pattern);
  const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, APPEARANCE_OPTIONS_SVG_BASELINE: baseline, SIM_OFFLINE_RECEIPT: receipt, ...env,
      NO_DOUBLE_SWAP: JSON.stringify({ ...runtimeAliases, ...JSON.parse(env.NO_DOUBLE_SWAP || '{}') }) } });
  fs.writeFileSync(path.join(OUT, name + '.log'), (child.stdout || '') + (child.stderr || ''));
  assert.ifError(child.error); assert.equal(child.signal, null);
  assert.equal(child.status, want.failed ? 1 : 0, `${name}: unexpected test status, see ${name}.log`);
  const result = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(result.numRuntimeErrorTestSuites || 0, 0, `${name}: infrastructure error`);
  assert.equal(result.numTotalTests, want.passed + want.failed + want.pending, `${name}: complete declared census`);
  assert.equal(result.numTodoTests, 0, `${name}: no deferred cases`);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, [], `${name}: no unhandled errors`);
  assert.equal(result.numPassedTests, want.passed, `${name}: passed cases`);
  assert.equal(result.numFailedTests, want.failed, `${name}: failed cases`);
  assert.equal(result.numPendingTests, want.pending, `${name}: skipped cases`);
  const failures = result.testResults.flatMap(file => file.assertionResults).filter(test => test.status === 'failed');
  assert.equal(failures.length, want.failed);
  assert(!fs.existsSync(receipt) || fs.statSync(receipt).size === 0, `${name}: child attempted non-loopback transport`);
  summary.push({ name, passed: result.numPassedTests, failed: result.numFailedTests, pending: result.numPendingTests,
    failures: failures.map(test => ({ name: test.fullName, messages: test.failureMessages })) });
  console.log(`${name}: ${want.passed} passed, ${want.failed} expected failures, ${want.pending} skipped`);
  return failures;
}
run('capture-original', { APPEARANCE_OPTIONS_CAPTURE: '1', NO_DOUBLE_SWAP: JSON.stringify(mapping) }, undefined,
  { passed: 1, failed: 0, pending: 0 });
assert.equal(Object.keys(JSON.parse(fs.readFileSync(baseline, 'utf8')).svg).length, 243);
const baselineMode = process.env.APPEARANCE_OPTIONS_BASELINE === '1';
if (baselineMode) {
  const failed = run('original-feature-absence', {}, undefined, { passed: 7, failed: 21, pending: 0 });
  assert(failed.every(test => /editor |drawing |unknown-ID/.test(test.fullName)), 'Only the expected missing choices/drawings/lookups fail');
} else {
  run('normal');
  const avatarFile = files['@/components/soccer-career/PlayerAvatar'];
  const avatar = fs.readFileSync(path.join(ROOT, avatarFile), 'utf8').replace(/\r\n/g, '\n');
  const ids = ['texturedcrop', 'sidefringe', 'twists', 'shortlocs', 'halfup', 'afropuff', 'circlebeard', 'handlebar', 'ducktail', 'muttonchops'];
  let oldDrawingSource = avatar;
  for (const id of ids) {
    const anchor = new RegExp(`    ${id}: \\([\\s\\S]*?\\n    \\),\\n`);
    const entries = avatar.match(anchor);
    assert(entries, `One executable ${id} drawing entry`);
    oldDrawingSource = oldDrawingSource.replace(anchor, '');
    const changed = avatar.replace(anchor, `    ${id}: null,\n`);
    assert.notEqual(changed, avatar);
    const copy = path.join(OUT, `missing-${id}.tsx`); fs.writeFileSync(copy, changed);
    const failed = run(`missing-${id}`, { NO_DOUBLE_SWAP: JSON.stringify({ '@/components/soccer-career/PlayerAvatar': copy }) },
      `drawing '${id}' `, { passed: 0, failed: 1, pending: 27 });
    assert(failed[0].fullName.includes(`drawing '${id}' `), `Missing ${id} rejected by its actual render case`);
  }
  assert.equal(oldDrawingSource, original[avatarFile], 'Removing only the ten new drawings restores the complete original avatar source');
  const oldDrawing = 'opacity="0.55"';
  assert(avatar.includes(oldDrawing), 'Existing buzz-cut opacity control has a real drawing target');
  const changedOldDrawing = avatar.replace(oldDrawing, 'opacity="0.15"');
  assert.notEqual(changedOldDrawing, avatar);
  const oldCopy = path.join(OUT, 'changed-old-drawing.tsx'); fs.writeFileSync(oldCopy, changedOldDrawing);
  const oldFailed = run('changed-old-drawing', { NO_DOUBLE_SWAP: JSON.stringify({ '@/components/soccer-career/PlayerAvatar': oldCopy }) },
    'holds exact original SVG', { passed: 0, failed: 1, pending: 27 });
  assert(oldFailed[0].fullName.includes('holds exact original SVG'));
  const lookSource = fs.readFileSync(path.join(ROOT, files['@/lib/soccerCareerAppearance']), 'utf8').replace(/\r\n/g, '\n');
  const oldLabel = '{ id: "buzz", label: "Buzz Cut" }';
  assert.equal(lookSource.split(oldLabel).length, 2, 'An actual old catalogue entry is the control target');
  const changedLabel = lookSource.replace(oldLabel, '{ id: "buzz", label: "Changed Crop" }');
  assert.notEqual(changedLabel, lookSource);
  const labelCopy = path.join(OUT, 'changed-shared-catalogue.ts'); fs.writeFileSync(labelCopy, changedLabel);
  const labelFailed = run('changed-shared-catalogue', { NO_DOUBLE_SWAP: JSON.stringify({ '@/lib/soccerCareerAppearance': labelCopy }) },
    'holds exact original SVG', { passed: 0, failed: 1, pending: 27 });
  assert(labelFailed[0].fullName.includes('holds exact original SVG'));
  const randomStart = 'export function randomAppearance(): PlayerAppearance {\n  return {';
  assert.equal(lookSource.split(randomStart).length, 2, 'One actual random roll function');
  const extraRandom = lookSource.replace(randomStart, 'export function randomAppearance(): PlayerAppearance {\n  Math.random();\n  return {');
  assert.notEqual(extraRandom, lookSource);
  const randomCopy = path.join(OUT, 'extra-random-draw.ts'); fs.writeFileSync(randomCopy, extraRandom);
  const randomFailed = run('extra-random-draw', { NO_DOUBLE_SWAP: JSON.stringify({ '@/lib/soccerCareerAppearance': randomCopy }) },
    'retains original defaults and the exact seven', { passed: 0, failed: 1, pending: 27 });
  assert(randomFailed[0].fullName.includes('retains original defaults and the exact seven'));
  const builder = fs.readFileSync(path.join(ROOT, files['@/components/soccer-career/AppearanceBuilder']), 'utf8').replace(/\r\n/g, '\n');
  const fromHair = 'sport === "soccer" ? SOCCER_HAIRSTYLES : HAIRSTYLES';
  const fromBeard = 'sport === "soccer" ? SOCCER_FACIAL_HAIR : FACIAL_HAIR';
  assert.equal(builder.split(fromHair).length, 2); assert.equal(builder.split(fromBeard).length, 2);
  const exposed = builder.replace(fromHair, 'SOCCER_HAIRSTYLES').replace(fromBeard, 'SOCCER_FACIAL_HAIR')
    .replace('from "./PlayerAvatar"', 'from "@/components/soccer-career/PlayerAvatar"');
  assert.notEqual(exposed, builder);
  const copy = path.join(OUT, 'exposed-options.tsx'); fs.writeFileSync(copy, exposed);
  const failed = run('exposed-to-us', { NO_DOUBLE_SWAP: JSON.stringify({ '@/components/soccer-career/AppearanceBuilder': copy }) },
    undefined, { passed: 24, failed: 4, pending: 0 });
  assert(failed.every(test => /retains its old hair and beard/.test(test.fullName)));
  run('restored');
}
for (const file of Object.values(files)) assert.equal(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n'), sourceBefore[file], `${file} held byte-identical`);
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ base: BASE, mode: baselineMode ? 'baseline' : 'fixed', cases: summary }, null, 2));
console.log('simSoccerAppearanceOptions: all declared cases and actual source controls passed.');
