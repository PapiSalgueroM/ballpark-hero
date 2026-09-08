/** Round 526: real NBA Arcade hook, static map data and denied external boundaries.
 * SIM_NBA_REGIONS_CONTROL changes one exact anchor in a unique OS-temp copy.
 * The old-map control recreates invisible regions; other controls prove retained
 * away-loss behavior and the transport, backend and storage boundary checks.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquestNba.regions.test.tsx';
const HOOK = path.join(ROOT, 'src/hooks/useConquestNba.ts');
const CONTROL = process.env.SIM_NBA_REGIONS_CONTROL || '';
const CASES = [
  ['initializes exactly the rendered regions with their configured owners', 'INITIAL: territory keys and owners match the rendered NBA map'],
  ['restores the exact visible map after a completed turn and reset', 'RESET: completed game restores only configured visible regions'],
  ['places initial powers only on rendered unowned regions', 'POWERS: initial locations belong to visible neutral regions'],
  ['never targets or claims invisible territory through real seeded turns', 'TURNS: real targeting and ownership stay on rendered regions'],
  ['preserves both empires when a real away attacker loses', 'AWAY LOSS: repelled attacker and defender keep all prior territory'],
];
const expected = (...indices) => Object.fromEntries(indices.map(index => [index, CASES[index][1]]));
const boundaryErrors = Object.fromEntries(CASES.map((_, index) => [index, 'BOUNDARY: no backend, transport or browser storage writes']));
const initializer = 'NBA_STATES.forEach(s => { t[s.id] = INITIAL_TERRITORIES_NBA[s.id] || null; });';
const entry = 'export function useConquestNba() {';
const CONTROLS = {
  'old-map': { from: initializer, to: initializer.replace('NBA_STATES', 'STATE_POSITIONS'), errors: expected(0, 1, 2, 3) },
  'away-loss': { from: 'if (result.loser === attacker) {', to: 'if (false && result.loser === attacker) {', errors: expected(4) },
  storage: { from: entry, to: `${entry}\n  try { localStorage.setItem('nba-regions-control', 'changed'); } catch { /* deliberate swallow */ }`, errors: boundaryErrors },
  transport: { from: entry, to: `${entry}\n  try { fetch('https://nba-regions-fixture.invalid/forbidden'); } catch { /* deliberate swallow */ }`, errors: boundaryErrors },
  backend: { from: entry, to: `import { supabase } from '@/integrations/supabase/client';\n${entry}\n  try { supabase.from('forbidden'); } catch { /* deliberate swallow */ }`, errors: boundaryErrors },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nba-regions-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;
try {
  const copy = path.join(temp, 'useConquestNba.control.ts');
  if (CONTROL) {
    const original = fs.readFileSync(HOOK, 'utf8').replaceAll('\r\n', '\n');
    const { from, to } = CONTROLS[CONTROL];
    const count = original.split(from).length - 1;
    if (count !== 1) throw new Error(`${CONTROL}: expected one source anchor, found ${count}`);
    const changed = original.replace(from, to);
    if (changed === original) throw new Error(`${CONTROL}: source control changed nothing`);
    fs.writeFileSync(copy, changed);
    console.log(`CONTROL ${CONTROL}: one exact source anchor changed in unique OS-temp copy`);
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
  plugins: [{ name: 'isolated-nba-regions-control', enforce: 'pre', transform(code, id) {
    if (${!!CONTROL} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(slash(HOOK))}) {
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
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact five named hook tests were not reported');
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '5/5 real NBA hook cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nba-regions-')) throw new Error('Refusing cleanup outside the unique NBA-regions temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NBA regions control files cleaned');
}
if (!success) process.exitCode = 1;
