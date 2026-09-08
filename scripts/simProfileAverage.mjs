/** Round 521: render the real Profile and useStreaks against synthetic reads.
 * Baseline before the fix: 5 named assertion failures, 3 passing tests.
 * Run normally, or set SIM_PROFILE_AVERAGE_CONTROL to one of CONTROLS below.
 * Controls transform only an isolated OS-temp source copy, never src or dist.
 * No actual backend transport is imported by the component tests.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/pages/Profile.average.test.tsx';
const PROFILE = path.join(ROOT, 'src/pages/Profile.tsx');
const CONTROL = process.env.SIM_PROFILE_AVERAGE_CONTROL || '';
const NAMES = [
  'uses browser points and plays while retaining the account points floor',
  'visibly labels the own average as this browser',
  'shows Not yet when this browser has no completed plays',
  'keeps a genuine zero average distinct from no browser plays',
  'uses account points and counted plays for another profile',
  'keeps the existing empty-account average for another profile',
  'rounds the local-only average without account score data',
  'treats the signed-in username route as this browser too',
];
const ownAverage = "? (localTotalPlays > 0 ? Math.round(localTotalPoints / localTotalPlays) : 'Not yet')";
const otherAverage = ': (totalGames > 0 ? Math.round(totalPoints / totalGames) : 0);';
const scope = "scope: isOwnProfile ? 'This browser' : undefined";
const rendered = '  return (\n    <>\n      <PageSeo';
const CONTROLS = {
  mixed: { from: ownAverage, to: ownAverage.replace('localTotalPoints /', 'totalPoints /'), errors: {
    0: 'AVERAGE: own browser 50/1 is 50, not account 550/browser 1',
    3: 'ZERO: two browser plays with zero points average zero',
    7: 'OWN ROUTE: own username uses the browser average of 50',
  } },
  caption: { from: scope, to: 'scope: undefined', errors: {
    1: 'CAPTION: own average visibly says This browser', 7: 'OWN ROUTE CAPTION: own username says This browser',
  } },
  empty: { from: ownAverage, to: ownAverage.replace("'Not yet'", '0'), errors: { 2: 'EMPTY: own browser without plays is Not yet' } },
  zero: { from: ownAverage, to: ownAverage.replace('localTotalPlays > 0', 'localTotalPoints > 0'), errors: { 3: 'ZERO: two browser plays with zero points average zero' } },
  other: { from: otherAverage, to: otherAverage.replace('totalPoints / totalGames', 'localTotalPoints / localTotalPlays'), errors: { 4: 'OTHER: viewed account uses 550/11 and ignores visitor totals' } },
  otherempty: { from: otherAverage, to: otherAverage.replace(': 0);', ": 'Not yet');"), errors: { 5: 'OTHER EMPTY: viewed account with no plays keeps zero' } },
  othercaption: { from: scope, to: "scope: 'This browser'", errors: {
    4: 'OTHER CAPTION: viewed account has no browser caption', 5: 'OTHER CAPTION: viewed account has no browser caption',
  } },
  round: { from: ownAverage, to: ownAverage.replace('Math.round', 'Math.floor'), errors: { 6: 'LOCAL: browser 125/2 rounds to 63 with total 125' } },
  points: { from: 'Math.max(userScoreData?.total_points ?? 0, localTotalPoints)', to: 'localTotalPoints', errors: {
    0: 'POINTS: own total keeps the account floor of 550', 2: 'POINTS: empty browser keeps the account floor of 550',
  } },
  storage: { from: rendered, to: `  localStorage.setItem('dukb-streaks-v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('dukb-streaks-v1')!), totalPoints: 123456 }));\n${rendered}`,
    errors: Object.fromEntries(NAMES.map((_, index) => [index, 'STORAGE: rendering preserves all seeded storage and totals'])) },
  backend: { from: rendered, to: `  try { supabase.from('user_preferences').upsert({ user_id: 'synthetic-control' }); } catch { /* deliberately swallowed */ }\n${rendered}`,
    errors: Object.fromEntries(NAMES.map((_, index) => [index, 'BOUNDARY: no unexpected backend or transport operations'])) },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-profile-average-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;

try {
  const copy = path.join(temp, 'Profile.control.tsx');
  if (CONTROL) {
    const original = fs.readFileSync(PROFILE, 'utf8').replaceAll('\r\n', '\n');
    const { from, to } = CONTROLS[CONTROL];
    const matches = original.split(from).length - 1;
    if (matches !== 1) throw new Error(`${CONTROL}: expected one source anchor, found ${matches}`);
    const changed = original.replace(from, to);
    if (changed === original) throw new Error(`${CONTROL}: source control changed nothing`);
    fs.writeFileSync(copy, changed);
    console.log(`CONTROL ${CONTROL}: one exact source anchor changed in a unique OS-temp copy`);
  }
  const reporter = path.join(temp, 'reporter.mjs');
  const reportPath = path.join(temp, 'report.json');
  fs.writeFileSync(reporter, `import fs from 'node:fs';
export default class {
  onFinished(files, errors) {
    const tests = [];
    const shape = error => ({ name: error.name, message: error.message });
    const visit = task => {
      if (task.type === 'test') tests.push({ name: task.name, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
      for (const child of task.tasks || []) visit(child);
    };
    for (const file of files || []) visit(file);
    fs.writeFileSync(${JSON.stringify(reportPath)}, JSON.stringify({ files: (files || []).length, tests, unhandled: (errors || []).map(shape) }));
  }
}
`);
  const config = path.join(temp, 'vitest.config.mjs');
  fs.writeFileSync(config, `import fs from 'node:fs';
export default {
  root: ${JSON.stringify(slash(ROOT))}, cacheDir: ${JSON.stringify(slash(path.join(temp, 'cache')))},
  esbuild: { jsx: 'automatic' },
  plugins: [{ name: 'isolated-profile-control', enforce: 'pre', transform(code, id) {
    if (${!!CONTROL} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(slash(PROFILE))}) {
      return { code: fs.readFileSync(${JSON.stringify(copy)}, 'utf8'), map: null };
    }
  } }],
  test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}] },
  resolve: { alias: { '@': ${JSON.stringify(slash(path.join(ROOT, 'src')))} } },
};
`);
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config, '--maxWorkers=1', `--reporter=${slash(reporter)}`], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (run.error || run.signal || !fs.existsSync(reportPath)) throw new Error(`Runner did not complete: ${run.error || run.signal || output}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (report.files !== 1 || report.tests.length !== NAMES.length || new Set(report.tests.map(test => test.name)).size !== NAMES.length
    || report.tests.some(test => !NAMES.includes(test.name))) throw new Error('The exact eight named component tests were not reported');
  if (report.unhandled.length) throw new Error(`Unexpected runtime errors: ${JSON.stringify(report.unhandled)}`);
  const expected = CONTROL ? CONTROLS[CONTROL].errors : {};
  let exact = true;
  for (const [index, name] of NAMES.entries()) {
    const test = report.tests.find(item => item.name === name);
    const message = expected[index];
    const matches = message
      ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (CONTROL ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${output.slice(-4000)}`);
  console.log(`PASS: ${CONTROL ? `${Object.keys(expected).length} exact controlled failures, all other cases green` : '8/8 real Profile cases green'}; zero unhandled errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-profile-average-')) {
    throw new Error('Refusing cleanup outside the unique Profile-average temporary directory');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary Profile control files cleaned');
}
if (!success) process.exitCode = 1;
