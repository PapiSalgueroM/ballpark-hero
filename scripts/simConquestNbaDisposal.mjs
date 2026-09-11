/** Round 538: four real-hook NBA disposal cases from the preserved audit.
 * Original map and real simulations; exact source controls use OS-temp copies.
 * Runtime and caught-backend errors must reject with exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquestNba.disposal.test.tsx';
const FILES = { hook: 'src/hooks/useConquestNba.ts' };
const CONTROL = process.env.SIM_CONQUEST_NBA_DISPOSAL_CONTROL || '';
const CASES = [
 'settles one repeated choice and rejects the prior callbacks in the next actual battle',
 'cancels an accepted confirmation on reset and rejects old work after a fresh actual battle',
 'cancels an already accepted confirmation on unmount',
 'rejects an unused captured valid choice after unmount before it schedules new work',
];
const hook = (test, message, from, to) => ({ file: 'hook', test, message, from, to });
const identity = '      || pendingBattleRef.current !== pendingBattleApply || !(rosters[battleResult.loser] || []).includes(playerName)';
const withoutIdentity = '      || !(rosters[battleResult.loser] || []).includes(playerName)';
const cleanup = '  useEffect(() => () => { pendingBattleRef.current = null; clearTimeouts(); }, []);';
const CONTROLS = {
 once: hook(0, 'ONCE: one actual transfer and settlement',
  '    settlingBattleRef.current = true;\n    setPlayerConfirmed(playerName);', '    setPlayerConfirmed(playerName);'),
 stale: hook(0, 'STALE BATTLE: earlier callbacks cannot touch the next result', identity, withoutIdentity),
 reset: hook(1, 'RESET: scheduled and stale work cannot change reset',
  '  const reset = useCallback(() => {\n    clearTimeouts();', '  const reset = useCallback(() => {'),
 resetnew: hook(1, 'RESET NEW BATTLE: old identity remains invalid', identity, withoutIdentity),
 accepted: hook(2, 'ACCEPTED UNMOUNT: pending work is canceled', cleanup,
  '  useEffect(() => () => { pendingBattleRef.current = null; }, []);'),
 unused: hook(3, 'UNUSED UNMOUNT: disposed action must not schedule or execute a new settlement', cleanup,
  '  useEffect(() => () => clearTimeouts(), []);'),
 runtime: hook(0, null, 'export function useConquestNba() {',
  "export function useConquestNba() {\n  throw new Error('Unexpected NBA disposal runtime control');"),
 backend: hook(0, null, 'export function useConquestNba() {',
  "import { supabase as nbaDisposalBackend } from '@/integrations/supabase/client';\ntry { void nbaDisposalBackend.auth; } catch {}\nexport function useConquestNba() {"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nba-disposal-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;
try {
  const control = CONTROLS[CONTROL], originalPath = control && path.join(ROOT, FILES[control.file]);
  const copy = path.join(temp, 'source.control.ts');
  if (control) {
    const original = fs.readFileSync(originalPath, 'utf8').replaceAll('\r\n', '\n');
    const matches = original.split(control.from).length - 1;
    if (matches !== 1 || control.from === control.to) throw new Error(`${CONTROL}: expected one changed source anchor, found ${matches}`);
    const changed = original.replace(control.from, control.to);
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
      if (task.type === 'test') tests.push({ name: task.name, mode: task.mode, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
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
  root: ${JSON.stringify(slash(ROOT))}, cacheDir: ${JSON.stringify(slash(path.join(temp, 'cache')))}, esbuild: { jsx: 'automatic' },
  plugins: [{ name: 'isolated-nba-disposal-control', enforce: 'pre', transform(code, id) {
    if (${!!control} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(originalPath ? slash(originalPath) : '')}) return { code: fs.readFileSync(${JSON.stringify(copy)}, 'utf8'), map: null };
  } }],
  test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}] },
  resolve: { alias: { '@': ${JSON.stringify(slash(path.join(ROOT, 'src')))} } },
};
`);
  const args = ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config, '--maxWorkers=1', `--reporter=${slash(reporter)}`];
  if (control) args.push('-t', CASES[control.test]);
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  if (run.error || run.signal || !fs.existsSync(reportPath)) throw new Error(`Runner did not complete: ${run.error || run.signal || run.stderr}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (report.files !== 1 || report.tests.length !== CASES.length || new Set(report.tests.map(test => test.name)).size !== CASES.length
    || report.tests.some(test => !CASES.includes(test.name))) throw new Error('The exact four named outcome tests were not reported');
  if (report.unhandled.length || report.suiteErrors.length) throw new Error(`Unexpected runtime/suite errors: ${JSON.stringify({ unhandled: report.unhandled, suite: report.suiteErrors })}`);
  let exact = true;
  for (const [index, name] of CASES.entries()) {
    const test = report.tests.find(item => item.name === name);
    if (control && index !== control.test) {
      const skipped = (test.mode === 'skip' || test.state === 'skip') && test.errors.length === 0;
      exact &&= skipped; if (!skipped) console.error(JSON.stringify(test)); continue;
    }
    const message = control?.message;
    const matches = message ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (control ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${(run.stdout + run.stderr).slice(-2500)}`);
  console.log(`PASS: ${control ? '1 exact controlled failure' : '4/4 NBA disposal cases green (original map, real battles)'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nba-disposal-')) throw new Error('Refusing cleanup outside the unique NBA-disposal temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NBA disposal control files cleaned');
}
if (!success) process.exitCode = 1;
