/* Soccer Conquest Attack integration fence.
 *
 * Runs the checked-in map generator in offline check mode, then the real
 * engine, map, save and rendered-board Vitest files. Every Vitest outcome is
 * printed so runAllSims can prove the checks actually ran.
 *
 * SIM_CONQUEST_ATTACK_CONTROL=revision changes the production revision
 * transition in a temporary sibling module. The existing phase-transition
 * test must fail on that changed behavior, while the checked-in source stays
 * untouched.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = [
  'src/lib/conquestAttack.test.ts',
  'src/lib/conquestAttackMap.test.ts',
  'src/lib/conquestAttackSave.test.ts',
  'src/components/conquest/SoccerAttackBoard.test.tsx',
];
const MINIMUMS = [92, 11, 4, 14];
const CONTROL = process.env.SIM_CONQUEST_ATTACK_CONTROL || '';
const abort = message => { console.error(message); process.exit(1); };
if (CONTROL && CONTROL !== 'revision') abort(`Unknown Soccer Attack control: ${CONTROL}`);

const generator = spawnSync(process.execPath, ['scripts/genSoccerAttackMap.mjs', '--check'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
if (generator.status !== 0) abort(`Offline map check failed:\n${generator.stdout}${generator.stderr || generator.error || ''}`);
console.log('Offline map generator --check passed');
for (const line of generator.stdout.trim().split(/\r?\n/).filter(Boolean)) console.log(`  ${line}`);

let testPaths = TESTS;
let testArgs = [];
let controlFiles = [];
if (CONTROL) {
  const enginePath = path.join(ROOT, 'src/lib/conquestAttack.ts');
  const testPath = path.join(ROOT, 'src/lib/conquestAttack.test.ts');
  const suffix = `.sim-conquest-attack-control-${process.pid}`;
  const controlEngine = path.join(ROOT, `src/lib/${suffix}.ts`);
  const controlTest = path.join(ROOT, `src/lib/${suffix}.test.ts`);
  const source = fs.readFileSync(enginePath, 'utf8');
  const needle = '  next.revision++;';
  if (source.split(needle).length !== 2) abort('Revision control must match exactly one production transition');
  const changed = source.replace(needle, '  next.revision += 2;');
  if (changed === source) abort('Revision control changed no production code');
  const testSource = fs.readFileSync(testPath, 'utf8');
  const controlImport = `./${suffix}`;
  const changedTest = testSource.replaceAll('./conquestAttack', controlImport);
  if (changedTest === testSource) abort('Revision control did not redirect the existing engine test');
  fs.writeFileSync(controlEngine, changed);
  fs.writeFileSync(controlTest, changedTest);
  controlFiles = [controlEngine, controlTest];
  testPaths = [path.relative(ROOT, controlTest).replaceAll('\\', '/')];
  testArgs = ['-t', 'advances each phase once, commits a legal integer bearing, and leaves inputs unchanged'];
  console.log('NEGATIVE CONTROL ON: revision transition advances by two');
}

let result;
try {
  result = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...testPaths, ...testArgs, '--reporter=json'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      ATTACK_MAP_SEEDS: Array.from({ length: 20 }, (_, index) => index).join(','),
      CI: '1', NO_COLOR: '1', FORCE_COLOR: '0',
    },
  });
} finally {
  for (const file of controlFiles) fs.rmSync(file, { force: true });
}

let report;
try { report = JSON.parse(result.stdout); }
catch { abort(`Vitest returned no readable report:\n${result.stdout}\n${result.stderr || result.error || ''}`); }

if (CONTROL) {
  const cases = report.testResults?.flatMap(suite => suite.assertionResults || []) || [];
  const target = cases.find(test => test.fullName?.includes('advances each phase once, commits a legal integer bearing'));
  if (result.status === 0 || target?.status !== 'failed' || !/expected 2 to be 1|expected 2 to equal 1/i.test(target.failureMessages?.join('\n') || '')) {
    abort(`Revision control did not fail the intended phase-transition invariant:\n${target?.failureMessages?.join('\n') || result.stderr || 'target outcome missing'}`);
  }
  console.log(`  ${target.status.toUpperCase()}: ${target.fullName}`);
  console.log('control "revision": changed production transition failed the existing revision invariant');
  process.exit(0);
}

const suites = TESTS.map(test => report.testResults?.find(suite => suite.name.replaceAll('\\', '/').endsWith(test)));
if (suites.some(suite => !suite?.assertionResults?.length)) abort('Vitest did not exercise all four Soccer Attack test files');
for (const [index, suite] of suites.entries()) {
  if (suite.assertionResults.length < MINIMUMS[index]) abort(`${TESTS[index]} coverage shrank to ${suite.assertionResults.length}, below ${MINIMUMS[index]}`);
  const passed = suite.assertionResults.filter(test => test.status === 'passed').length;
  console.log(`${TESTS[index]}: ${passed}/${suite.assertionResults.length} passed`);
  for (const test of suite.assertionResults) console.log(`  ${test.status.toUpperCase()}: ${test.fullName}`);
}
const cases = suites.flatMap(suite => suite.assertionResults);
const failed = cases.filter(test => test.status !== 'passed');
if (result.status !== 0 || failed.length) {
  abort(failed.map(test => `${test.fullName}: ${test.failureMessages.join('\n')}`).join('\n') || result.stderr || 'Vitest failed');
}

console.log(`ALL SOCCER ATTACK CHECKS PASSED (${cases.length} real Vitest outcomes, 20 actual-map seeds)`);
