/* Round 1428: category changes reset the actual appearance options window. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const MODE = process.env.APPEARANCE_SCROLL_MODE || 'fixed';
assert(['baseline', 'fixed'].includes(MODE), 'APPEARANCE_SCROLL_MODE must be baseline or fixed');
const evidenceRoot = process.env.APPEARANCE_SCROLL_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'appearance-scroll-evidence-'));
const OUT = path.join(evidenceRoot, 'unit');
fs.mkdirSync(OUT, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'appearance-scroll-modules-'));
const BASE = '8fc62292db90a7a973389336bbe8cff6de184fae';
const BUILDER = 'src/components/soccer-career/AppearanceBuilder.tsx';
const ALIAS = '@/components/soccer-career/AppearanceBuilder';
const frozenFiles = ['src/components/soccer-career/PlayerAvatar.tsx', 'src/lib/soccerCareerAppearance.ts',
  'src/lib/careerAppearanceCopy.ts', 'src/lib/soccerBoots.ts'];
const heldFiles = [BUILDER, ...frozenFiles, 'src/test/appearanceCategoryScroll.test.tsx',
  'src/test/appearanceSportCopy.test.tsx', 'src/test/soccerAppearanceOptions.test.tsx', 'vitest.config.ts'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBefore = Object.fromEntries(heldFiles.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime'), react: require.resolve('react'),
  'lucide-react': require.resolve('lucide-react') };
const names = ['starts a changed category at its first choices without changing the look',
  'keeps the same category and scroll when its current category is clicked',
  'keeps the current options scroll when an option changes its saved field'];
const sports = ['soccer', 'nfl', 'nba', 'mlb', 'nhl'];
const declared = sports.flatMap(sport => names.map(name => `${sport} appearance category scroll ${name}`));
const expectedFaults = sports.map(sport => `${sport} appearance category scroll ${names[0]}`);
const summary = [], controls = [];
const original = {};

function run(name, aliases = {}, failed = 0, bare = false) {
  const report = path.join(OUT, name + '.json'), receipt = path.join(OUT, name + '.transport');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt };
  if (bare) delete env.NO_DOUBLE_SWAP;
  else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...aliases });
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/appearanceCategoryScroll.test.tsx',
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + report],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000, env });
  const output = (child.stdout || '') + (child.stderr || '');
  fs.writeFileSync(path.join(OUT, name + '.log'), output);
  assert.ifError(child.error); assert.equal(child.signal, null, `${name}: child signal`);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test(output), `${name}: no out-of-case unhandled error credit`);
  assert.equal(child.status, failed ? 1 : 0, `${name}: unexpected test exit, inspect raw log`);
  const result = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(result.numTotalTests, 15); assert.equal(result.numPassedTests, 15 - failed); assert.equal(result.numFailedTests, failed);
  assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0);
  assert.equal(result.numRuntimeErrorTestSuites || 0, 0);
  if (result.numUnhandledErrors !== undefined) assert.equal(result.numUnhandledErrors, 0);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  const cases = result.testResults.flatMap(file => file.assertionResults);
  assert.deepEqual(cases.map(test => test.fullName).sort(), [...declared].sort(), `${name}: exact fifteen mounted cases`);
  const failures = cases.filter(test => test.status === 'failed');
  assert.equal(failures.length, failed);
  assert.deepEqual(failures.map(test => test.fullName).sort(), failed ? [...expectedFaults].sort() : []);
  for (const test of failures) {
    assert.equal(test.failureMessages.length, 1, `${name}: one precise scroll assertion`);
    assert(test.failureMessages[0].startsWith('AssertionError: A changed appearance category must start at its first choices:'), `${name}: exact leading category-reset fault`);
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(test.failureMessages[0]), `${name}: no preparation failure credit`);
  }
  assert(!fs.existsSync(receipt) || fs.statSync(receipt).size === 0, `${name}: empty child transport receipt`);
  summary.push({ name, passed: result.numPassedTests, failed, pending: 0, bare,
    failures: failures.map(test => ({ name: test.fullName, messages: test.failureMessages })) });
  console.log(`${name}: ${15 - failed} passed, ${failed} expected category-reset faults, 0 skipped`);
}

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, 'One exact executable options-scroller anchor');
  const changed = source.replace(before, after); assert.notEqual(changed, source, 'The mutation changes executable source'); return changed;
}
function copy(name, body) {
  fs.writeFileSync(path.join(OUT, name + '.tsx'), body);
  const file = path.join(TEMP, name + '.tsx'); fs.writeFileSync(file, body); return { [ALIAS]: file };
}

try {
  for (const file of [BUILDER, ...frozenFiles]) {
    const child = spawnSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0, `Read actual PR339 original ${file}: ${child.stderr}`);
    original[file] = child.stdout;
    fs.writeFileSync(path.join(OUT, 'original-' + path.basename(file)), child.stdout);
    if (frozenFiles.includes(file)) assert.equal(sourceBefore[file].toString('utf8'), child.stdout, `${file}: complete catalogue/avatar source held at PR339`);
  }
  // External builder copies keep their original relative avatar import unchanged.
  fs.writeFileSync(path.join(TEMP, 'PlayerAvatar.tsx'), sourceBefore[frozenFiles[0]]);
  const source = sourceBefore[BUILDER].toString('utf8');
  if (MODE === 'baseline') {
    assert.equal(source, original[BUILDER], 'Original builder is held completely at PR339');
    run('baseline', {}, 5);
  } else {
    const before = '<div key={tab} className="min-h-[92px] max-h-[190px] overflow-y-auto scrollbar-thin pr-0.5">';
    const after = '<div className="min-h-[92px] max-h-[190px] overflow-y-auto scrollbar-thin pr-0.5">';
    const changed = replaceOnce(source, before, after);
    assert.equal(changed, original[BUILDER], 'Removing only the category key recovers the entire PR339 builder');
    const recovered = replaceOnce(changed, after, before);
    assert.equal(recovered, source, 'The exact inverse recovers the entire fixed builder');
    for (const rejected of [source.replace(before, ''), source.replace(before, before.replace('key={tab}', 'key="changed"')), source + '\n' + before]) {
      assert.throws(() => replaceOnce(rejected, before, after), /One exact executable options-scroller anchor/, 'Missing, altered or duplicated anchor is refused');
    }
    const originalAlias = copy('whole-original', original[BUILDER]);
    const controlAlias = copy('removed-category-key', changed), restoredAlias = copy('restored-category-key', recovered);
    controls.push({ name: 'removed-category-key', before, after, originalSha256: hash(original[BUILDER]), fixedSha256: hash(source),
      changedFile: 'removed-category-key.tsx', changedSha256: hash(changed), recoveredFile: 'restored-category-key.tsx', recoveredSha256: hash(recovered), refusalChecks: ['missing', 'altered', 'duplicate'] });
    run('normal'); run('bare', {}, 0, true); run('original', originalAlias, 5);
    run('removed-category-key', controlAlias, 5); run('restored', restoredAlias);
  }
} finally {
  fs.rmSync(TEMP, { recursive: true, force: true }); assert(!fs.existsSync(TEMP), 'Temporary module copies removed');
  for (const file of heldFiles) assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), sourceBefore[file], `${file}: source bytes held`);
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ base: BASE, mode: MODE, scope: 'Actual mounted editor, explicit DOM scrollTop fixture only; native overflow outcome is separate browser evidence',
    cases: summary, controls, sourceBefore: Object.fromEntries(heldFiles.map(file => [file, hash(sourceBefore[file])])), sourceHeld: true, temporaryModulesRemoved: true }, null, 2));
}
console.log(MODE === 'baseline' ? 'simAppearanceCategoryScroll baseline: 15 actual DOM cases, 5 precise original scroll faults and 10 healthy cases; fixed controls not run.'
  : 'simAppearanceCategoryScroll: normal, bare, whole-original, effective key removal and inverse-restored cases passed.');
