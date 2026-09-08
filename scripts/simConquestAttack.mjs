/* Soccer Conquest Attack integration fence.
 *
 * Runs the checked-in map generator in offline check mode, then the real
 * engine, map, save and rendered-board Vitest files. Every Vitest outcome is
 * printed so runAllSims can prove the checks actually ran.
 *
 * SIM_CONQUEST_ATTACK_CONTROL=revision changes the production revision
 * transition in a temporary sibling module.
 * SIM_CONQUEST_ATTACK_CONTROL=ui-short-run stops the real full-map UI driver
 * after action 159. SIM_CONQUEST_ATTACK_UI_EXTRA_ERROR=1 adds a real unhandled
 * error so the control-only reporter guard can prove it fails closed. Each mode
 * must fail only its owned assertion while checked-in source stays untouched.
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
if (CONTROL && !['revision', 'ui-short-run'].includes(CONTROL)) abort(`Unknown Soccer Attack control: ${CONTROL}`);

const generator = spawnSync(process.execPath, ['scripts/genSoccerAttackMap.mjs', '--check'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
if (generator.status !== 0) abort(`Offline map check failed:\n${generator.stdout}${generator.stderr || generator.error || ''}`);
console.log('Offline map generator --check passed');
for (const line of generator.stdout.trim().split(/\r?\n/).filter(Boolean)) console.log(`  ${line}`);

let testPaths = TESTS;
let testArgs = [];
let controlFiles = [];
let controlErrorReportPath = '';
let controlErrorReportSource = '';
if (CONTROL === 'revision') {
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
} else if (CONTROL === 'ui-short-run') {
  const testPath = path.join(ROOT, 'src/components/conquest/SoccerAttackBoard.test.tsx');
  const controlTest = path.join(ROOT, `src/components/conquest/.sim-conquest-attack-ui-control-${process.pid}.test.tsx`);
  const controlReporter = path.join(ROOT, `scripts/.sim-conquest-attack-ui-reporter-${process.pid}.mjs`);
  controlErrorReportPath = path.join(ROOT, `scripts/.sim-conquest-attack-ui-errors-${process.pid}.json`);
  const testSource = fs.readFileSync(testPath, 'utf8');
  const needle = 'for (let step = 0; step < 220; step += 1) {';
  if (testSource.split(needle).length !== 2) abort('UI short-run control must match exactly one full-map loop cap');
  let changedTest = testSource.replace(needle, 'for (let step = 0; step < 159; step += 1) {');
  if (changedTest === testSource || changedTest.includes(needle)) abort('UI short-run control changed no full-map loop cap');
  if (process.env.SIM_CONQUEST_ATTACK_UI_EXTRA_ERROR === '1') {
    const testStart = "  it('plays a complete real map through the UI without ranked completion', async () => {";
    if (changedTest.split(testStart).length !== 2) abort('UI error control must match exactly one full-map test');
    changedTest = changedTest.replace(testStart, `${testStart}\n    setTimeout(() => { throw new Error('SIM_CONQUEST_ATTACK_UI_EXTRA_ERROR'); }, 0);`);
  }
  const reporterSource = `import fs from 'node:fs';\nexport default class {\n  onFinished(_files, errors) {\n    fs.writeFileSync(${JSON.stringify(controlErrorReportPath)}, JSON.stringify((errors || []).map(error => ({\n      name: String(error?.name || ''),\n      message: String(error?.message || ''),\n      stack: String(error?.stack || ''),\n      type: String(error?.type || ''),\n      keys: Object.keys(error || {}).sort(),\n    }))));\n  }\n}\n`;
  fs.writeFileSync(controlTest, changedTest);
  fs.writeFileSync(controlReporter, reporterSource);
  controlFiles = [controlTest, controlReporter, controlErrorReportPath];
  testPaths = [path.relative(ROOT, controlTest).replaceAll('\\', '/')];
  testArgs = ['-t', 'plays a complete real map through the UI without ranked completion', `--reporter=${path.relative(ROOT, controlReporter).replaceAll('\\', '/')}`];
  console.log('NEGATIVE CONTROL ON: the real full-map UI driver stops after action 159');
}

let result;
try {
  result = spawnSync(process.execPath, [
    path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...testPaths, ...testArgs,
    '--reporter=json', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism',
  ], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      ATTACK_MAP_SEEDS: Array.from({ length: 20 }, (_, index) => index).join(','),
      CI: '1', NO_COLOR: '1', FORCE_COLOR: '0',
    },
  });
} finally {
  if (controlErrorReportPath && fs.existsSync(controlErrorReportPath)) {
    controlErrorReportSource = fs.readFileSync(controlErrorReportPath, 'utf8');
  }
  for (const file of controlFiles) fs.rmSync(file, { force: true });
}

let report;
try { report = JSON.parse(result.stdout); }
catch { abort(`Vitest returned no readable report:\n${result.stdout}\n${result.stderr || result.error || ''}`); }

if (CONTROL === 'revision') {
  const cases = report.testResults?.flatMap(suite => suite.assertionResults || []) || [];
  const target = cases.find(test => test.fullName?.includes('advances each phase once, commits a legal integer bearing'));
  if (result.status === 0 || target?.status !== 'failed' || !/expected 2 to be 1|expected 2 to equal 1/i.test(target.failureMessages?.join('\n') || '')) {
    abort(`Revision control did not fail the intended phase-transition invariant:\n${target?.failureMessages?.join('\n') || result.stderr || 'target outcome missing'}`);
  }
  console.log(`  ${target.status.toUpperCase()}: ${target.fullName}`);
  console.log('control "revision": changed production transition failed the existing revision invariant');
  process.exit(0);
}

if (CONTROL === 'ui-short-run') {
  let finishedErrors;
  try {
    finishedErrors = JSON.parse(controlErrorReportSource);
    if (!Array.isArray(finishedErrors) || finishedErrors.some(error => !error || typeof error !== 'object'
      || typeof error.name !== 'string' || typeof error.message !== 'string' || typeof error.stack !== 'string'
      || typeof error.type !== 'string' || !Array.isArray(error.keys))) throw new Error('invalid error array');
  } catch {
    abort('UI short-run control reporter did not produce a valid error array');
  }
  const cases = report.testResults?.flatMap(suite => suite.assertionResults || []) || [];
  const named = cases.filter(test => test.fullName?.includes('plays a complete real map through the UI without ranked completion'));
  const failed = cases.filter(test => test.status === 'failed');
  const target = named[0];
  const messages = target?.failureMessages || [];
  const expectedFailure = messages.length === 1 && /expected ['"]recap['"] to be ['"]finished['"]/i.test(messages[0]);
  if (result.status !== 1 || result.signal || result.error
    || named.length !== 1 || failed.length !== 1 || failed[0] !== target
    || report.success !== false || report.numFailedTests !== 1
    || report.testResults?.length !== 1 || report.testResults[0]?.status !== 'failed'
    || finishedErrors.length !== 0 || !expectedFailure) {
    abort(`UI short-run control did not fail only the real completion state:\nREPORT=${JSON.stringify({
      status: result.status,
      signal: result.signal,
      error: String(result.error || ''),
      success: report.success,
      named: named.length,
      failed: failed.length,
      targetIsOnlyFailure: failed[0] === target,
      numFailedTests: report.numFailedTests,
      numFailedTestSuites: report.numFailedTestSuites,
      numTotalTests: report.numTotalTests,
      numPendingTests: report.numPendingTests,
      expectedFailure,
    })}\nSIDECAR=${JSON.stringify(finishedErrors)}\nJSON=${JSON.stringify(messages)}\nSTDERR=${result.stderr || ''}`);
  }
  console.log(`  ${target.status.toUpperCase()}: ${target.fullName}`);
  console.log('control "ui-short-run": action 159 left the real full-map UI on recap, so completion failed');
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
