/** Round 523: real Profile rendering and share handlers, synthetic boundaries.
 * Baseline before the production fix: five named failures, seven positive cases.
 * SIM_PROFILE_AVATAR_CONTROL mutates one exact source anchor in a unique OS-temp
 * copy. Never changes src, dist, accounts or real backend records.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/pages/Profile.avatar.test.tsx';
const PROFILE = path.join(ROOT, 'src/pages/Profile.tsx');
const CONTROL = process.env.SIM_PROFILE_AVATAR_CONTROL || '';
const CASES = [
  ['does not show visitor metadata avatar on another named player', 'OTHER AVATAR: Alpha without a photo cannot show visitor metadata'],
  ['uses the viewed username instead of the visitor email initial', 'OTHER INITIAL: charlie username wins over visitor email Z'],
  ['uses an own username before the matching account email', 'OWN USERNAME: bravo username wins over own email Z'],
  ['preserves the matching owners metadata avatar fallback', 'OWN AVATAR: matching owner keeps metadata photo fallback'],
  ['preserves own email initial when both profile names are absent', 'OWN EMAIL: matching nameless owner keeps email initial Z'],
  ['uses neutral U when no profile name or own email is available', 'NEUTRAL: missing identity fields produce U'],
  ['keeps the saved own avatar ahead of metadata', 'SAVED AVATAR: viewed saved image takes precedence'],
  ['keeps the saved other avatar ahead of metadata', 'SAVED AVATAR: viewed saved image takes precedence'],
  ['removes the owners photo when navigating to another profile without remounting', 'NAVIGATION: other profile cannot retain owner photo'],
  ['uses the viewed username for signed-out readers too', 'SIGNED OUT: viewed username supplies initial without an auth user'],
  ['shares the existing viewed-player card without visitor identity or avatar', 'SHARE CARD: captured card keeps Alpha identity and no visitor photo'],
  ['keeps viewed-player identity in the clipboard fallback', 'SHARE FALLBACK: clipboard text stays with Alpha instead of visitor'],
];
const expected = (...indices) => Object.fromEntries(indices.map(index => [index, CASES[index][1]]));
const allErrors = message => Object.fromEntries(CASES.map((_, index) => [index, message]));
const account = 'const avatarAccount = viewingProfile?.user_id === user?.id ? user : null;';
const url = 'const avatarUrl = viewingProfile?.avatar_url || avatarAccount?.user_metadata?.avatar_url;';
const initial = "const avatarInitial = (viewingProfile?.display_name || viewingProfile?.username || avatarAccount?.email || 'U').charAt(0).toUpperCase();";
const rendered = '  return (\n    <>\n      <PageSeo';
const CONTROLS = {
  account: { from: account, to: 'const avatarAccount = user;', errors: expected(0, 8) },
  metadata: { from: url, to: 'const avatarUrl = viewingProfile?.avatar_url;', errors: expected(3, 8) },
  saved: { from: url, to: 'const avatarUrl = avatarAccount?.user_metadata?.avatar_url;', errors: expected(6, 7) },
  precedence: { from: url, to: 'const avatarUrl = avatarAccount?.user_metadata?.avatar_url || viewingProfile?.avatar_url;', errors: expected(6) },
  display: { from: initial, to: initial.replace('viewingProfile?.display_name || ', ''), errors: expected(0, 8) },
  username: { from: initial, to: initial.replace('viewingProfile?.username || ', ''), errors: expected(1, 2, 9) },
  email: { from: initial, to: initial.replace('avatarAccount?.email || ', ''), errors: expected(4) },
  neutral: { from: initial, to: initial.replace("'U'", "'?'") , errors: expected(5) },
  uppercase: { from: initial, to: initial.replace('.toUpperCase()', ''), errors: expected(1, 2, 4, 9) },
  rendered: { from: '{avatarInitial}', to: "{'X'}", errors: expected(0, 1, 2, 4, 5, 8, 9) },
  card: { from: "{viewingProfile?.display_name || 'Anonymous Player'}", to: "{user?.email || 'Anonymous Player'}", errors: expected(10) },
  clipboard: { from: "viewingProfile?.display_name || 'Player'", to: "user?.email || 'Player'", errors: expected(11) },
  storage: { from: rendered, to: `  localStorage.setItem('dukb-streaks-v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('dukb-streaks-v1')!), totalPoints: 123456 }));\n${rendered}`,
    errors: allErrors('STORAGE: avatar rendering preserves browser totals') },
  backend: { from: rendered, to: `  try { supabase.from('user_preferences').delete(); } catch { /* deliberately swallowed */ }\n${rendered}`,
    errors: allErrors('BOUNDARY: exact fixture reads and local share captures only') },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-profile-avatar-'));
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
  const reporter = path.join(temp, 'reporter.mjs'), reportPath = path.join(temp, 'report.json');
  fs.writeFileSync(reporter, `import fs from 'node:fs';
export default class {
  onFinished(files, errors) {
    const tests = [], suiteErrors = [];
    const shape = error => ({ name: error.name, message: error.message });
    const visit = task => {
      if (task.type === 'test') tests.push({ name: task.name, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
      else suiteErrors.push(...(task.result?.errors || []).map(shape));
      for (const child of task.tasks || []) visit(child);
    };
    for (const file of files || []) visit(file);
    fs.writeFileSync(${JSON.stringify(reportPath)}, JSON.stringify({ files: (files || []).length, tests, suiteErrors, unhandled: (errors || []).map(shape) }));
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
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')), names = CASES.map(([name]) => name);
  if (report.files !== 1 || report.tests.length !== names.length || new Set(report.tests.map(test => test.name)).size !== names.length
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact twelve named component tests were not reported');
  if (report.unhandled.length || report.suiteErrors.length) throw new Error(`Unexpected runtime/suite errors: ${JSON.stringify({ unhandled: report.unhandled, suite: report.suiteErrors })}`);
  const errors = CONTROL ? CONTROLS[CONTROL].errors : {};
  let exact = true;
  for (const [index, name] of names.entries()) {
    const test = report.tests.find(item => item.name === name), message = errors[index];
    const matches = message
      ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (CONTROL ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${output.slice(-4000)}`);
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '12/12 real Profile cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-profile-avatar-')) throw new Error('Refusing cleanup outside the unique Profile-avatar temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary Profile control files cleaned');
}
if (!success) process.exitCode = 1;
