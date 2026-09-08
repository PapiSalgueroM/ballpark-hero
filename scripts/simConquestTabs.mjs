/* Conquest daily tab safety, through the real store and rendered board tests.
 * Both tests keep the engine and completion hook real and mock external writes.
 * SIM_CONQUEST_TABS_CONTROL=store removes the stale-write guard in a temp copy.
 * SIM_CONQUEST_TABS_CONTROL=board bypasses the board's commit and exposes a
 * second completion. Each control must fail its own assertion, not module load.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = ['src/lib/conquestDaily.test.ts', 'src/components/conquest/ImperialismBoardShared.test.tsx'];
const CONTROL = process.env.SIM_CONQUEST_TABS_CONTROL || '';
const abort = message => { console.error(message); process.exit(1); };
if (CONTROL && !['store', 'board'].includes(CONTROL)) abort(`Unknown Conquest tabs control: ${CONTROL}`);

let tempDir;
let extraEnv = {};
if (CONTROL) {
  const relative = CONTROL === 'store' ? 'src/lib/conquestDaily.ts' : 'src/components/conquest/ImperialismBoardShared.tsx';
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8').replaceAll('\r\n', '\n');
  const needle = CONTROL === 'store'
    ? "  if (current && (current.done || current.team !== run.team ||\n    current.picks.length > run.picks.length || current.picks.some((pick, i) => run.picks[i] !== pick))) return false;"
    : 'const outcome = await commitDailyRun(sport.key, expected, record, todayStr);';
  if (source.split(needle).length !== 2) abort(`Control ${CONTROL} must match exactly one production guard`);
  const changed = source.replace(needle, CONTROL === 'store' ? '' : "const outcome = 'saved' as const;");
  if (changed === source) abort(`Control ${CONTROL} changed no code`);
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  tempDir = fs.mkdtempSync(path.join(ROOT, 'dist', '.conquest-tabs-control-'));
  const copy = path.join(tempDir, path.basename(relative));
  fs.writeFileSync(copy, changed);
  extraEnv = { [CONTROL === 'store' ? 'CONQUEST_TABS_STORE' : 'CONQUEST_TABS_BOARD']: copy.replaceAll('\\', '/') };
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}

let result;
try {
  result = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...TESTS, '--reporter=json'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, CONQUEST_TABS_STORE: '', CONQUEST_TABS_BOARD: '', ...extraEnv, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
  });
} finally {
  if (tempDir && path.dirname(tempDir) === path.join(ROOT, 'dist')) fs.rmSync(tempDir, { recursive: true, force: true });
}
let report;
try { report = JSON.parse(result.stdout); } catch { abort(`Vitest returned no readable report:\n${result.stderr || result.error}`); }
const suites = TESTS.map(test => report.testResults?.find(suite => suite.name.replaceAll('\\', '/').endsWith(test)));
if (suites.some(suite => !suite?.assertionResults?.length)) abort('Vitest did not exercise both Conquest test files');
const cases = suites.flatMap(suite => suite.assertionResults);
if (suites[0].assertionResults.length < 18 || suites[1].assertionResults.length < 5) abort('Conquest coverage unexpectedly shrank');
for (const [i, suite] of suites.entries()) {
  const passed = suite.assertionResults.filter(test => test.status === 'passed').length;
  console.log(`${TESTS[i]}: ${passed}/${suite.assertionResults.length} passed`);
}
const failed = cases.filter(test => test.status !== 'passed');
if (!CONTROL) {
  if (result.status !== 0 || failed.length) abort(failed.map(test => `${test.fullName}: ${test.failureMessages.join('\n')}`).join('\n'));
  console.log(`ALL CONQUEST TAB CHECKS PASSED (${cases.length} real store and board outcomes)`);
} else {
  const targets = CONTROL === 'store'
    ? suites[0].assertionResults.filter(test => /keeps a finished result|rejects shorter/.test(test.title))
    : suites[1].assertionResults.filter(test => test.title === 'two tabs leaving the same final recap record only one completion');
  const expectedCount = CONTROL === 'store' ? 10 : 1;
  const ownFailures = targets.filter(test => test.status === 'failed' && /AssertionError/.test(test.failureMessages.join('\n')));
  const unaffected = suites[CONTROL === 'store' ? 1 : 0].assertionResults;
  if (result.status === 0 || ownFailures.length !== expectedCount || unaffected.some(test => test.status !== 'passed')) {
    abort(`Control ${CONTROL} did not fail its ${expectedCount} outcome assertion(s) with the other layer green:\n${failed.map(test => `${test.fullName}: ${test.failureMessages.join('\n')}`).join('\n')}`);
  }
  if (CONTROL === 'board' && !targets[0].failureMessages.some(message => /called 1 times, but got 2/.test(message))) {
    abort('The board control failed without exposing a second completion');
  }
  console.log(`control "${CONTROL}": ${ownFailures.length} targeted failure(s), the other layer stayed green`);
}
