/** Round 529: real NFL and NBA pages keep Arcade instructions usable when storage fails.
 * Boards and external boundaries are inert fixtures. The six cases per sport run
 * the real page and dialog. Controls replace exactly one source anchor in unique
 * OS-temp copies, then require only the named AssertionErrors and no runtime errors.
 * SIM_CONQUEST_HELP_CONTROL=nfl-guard (or nba-guard) restores both original crashes.
 * Other controls: fallback, first, persist, scope, seen, manual, mode, resume,
 * each prefixed nfl- or nba-. The runtime control must exit 1, never earn credit.
 * Source and dist remain unchanged; no backend, transport, or persistent writes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/pages/Conquest.help.test.tsx';
const CONTROL = process.env.SIM_CONQUEST_HELP_CONTROL || '';
const NAMES = [
  'survives a denied help-flag read and shows the real instructions',
  'survives a denied help-flag write and keeps instructions usable',
  'shows first-run instructions with a separate flag and remembers the visit',
  'respects existing seen flags and allows manual reopening',
  'keeps the mode chooser and Imperialism independent of Arcade help storage',
  'resumes the correct unfinished daily before switching to Arcade',
];
const CASES = ['nfl', 'nba'].flatMap(sport => NAMES.map(name => `${sport} Arcade help > ${name}`));
const CONTROLS = {};
for (const [sport, file, key, other] of [
  ['nfl', 'Conquest.tsx', 'conquest-how-to-play-seen', 'conquest-nba-how-to-play-seen'],
  ['nba', 'ConquestNba.tsx', 'conquest-nba-how-to-play-seen', 'conquest-how-to-play-seen'],
]) {
  const add = (name, expectations, from, to) => {
    CONTROLS[`${sport}-${name}`] = { file, expected: Object.fromEntries(expectations.map(([index, message]) => [`${sport} Arcade help > ${NAMES[index]}`, message])), from, to };
  };
  const body = `      const seen = localStorage.getItem('${key}');\n      if (!seen) {\n        setShowHelp(true);\n        localStorage.setItem('${key}', 'true');\n      }`;
  add('guard', [[0, 'READ: denied help storage cannot crash the page or hide first-run instructions'], [1, 'WRITE: failed help persistence cannot crash the page or hide instructions']],
    `    try {\n${body}\n    } catch {\n      setShowHelp(true);\n    }`, body);
  add('fallback', [[0, 'READ: denied help storage cannot crash the page or hide first-run instructions']],
    '    } catch {\n      setShowHelp(true);\n    }', '    } catch {}');
  add('first', [[2, 'FIRST: another sport flag cannot hide first-run instructions']],
    '      if (!seen) {\n        setShowHelp(true);', '      if (!seen) {');
  add('persist', [[2, 'PERSIST: only this sport flag is recorded']],
    `        localStorage.setItem('${key}', 'true');`, '');
  add('scope', [[2, 'FIRST: another sport flag cannot hide first-run instructions']],
    `localStorage.getItem('${key}')`, `localStorage.getItem('${other}')`);
  add('seen', [[3, 'SEEN: existing nonempty flags suppress only automatic instructions']],
    '      if (!seen) {', '      if (true) {');
  add('manual', [[3, 'MANUAL: returning players can reopen the real instructions']],
    'onClick={() => setShowHelp(true)}', 'onClick={() => {}}');
  add('mode', [[4, 'MODES: choosing a game does not read Arcade help storage']],
    "    if (mode !== 'arcade') return;", '');
  add('resume', [[5, 'RESUME: an unfinished daily opens its own sport without Arcade storage']],
    `hasUnfinishedDaily('${sport}') ? 'imperialism' : 'select'`, "false ? 'imperialism' : 'select'");
}
CONTROLS.runtime = {
  file: 'Conquest.tsx', expected: { [CASES[0]]: null },
  from: "    if (mode !== 'arcade') return;",
  to: "    if (mode !== 'arcade') return;\n    throw new Error('Unexpected Conquest help runtime control');",
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-conquest-help-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;
try {
  const control = CONTROLS[CONTROL];
  const originalPath = control && path.join(ROOT, 'src/pages', control.file);
  const copy = path.join(temp, 'page.control.tsx');
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
    const visit = (task, parents = []) => {
      if (task.type === 'test') tests.push({ name: [...parents.slice(1), task.name].join(' > '), mode: task.mode, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
      else suiteErrors.push(...(task.result?.errors || []).map(shape));
      for (const child of task.tasks || []) visit(child, [...parents, task.name]);
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
  plugins: [{ name: 'isolated-conquest-help-control', enforce: 'pre', transform(code, id) {
    if (${!!control} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(originalPath ? slash(originalPath) : '')}) return { code: fs.readFileSync(${JSON.stringify(copy)}, 'utf8'), map: null };
  } }],
  test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}] },
  resolve: { alias: { '@': ${JSON.stringify(slash(path.join(ROOT, 'src')))} } },
};
`);
  const args = ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config, '--maxWorkers=1', `--reporter=${slash(reporter)}`];
  if (control) args.push('-t', Object.keys(control.expected).map(name => name.replace(' > ', ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  if (run.error || run.signal || !fs.existsSync(reportPath)) throw new Error(`Runner did not complete: ${run.error || run.signal || run.stderr}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (report.files !== 1 || report.tests.length !== CASES.length || new Set(report.tests.map(test => test.name)).size !== CASES.length
    || report.tests.some(test => !CASES.includes(test.name))) throw new Error(`The exact twelve named page cases were not reported: ${JSON.stringify(report)}`);
  if (report.unhandled.length || report.suiteErrors.length) throw new Error(`Unexpected runtime/suite errors: ${JSON.stringify({ unhandled: report.unhandled, suite: report.suiteErrors })}`);
  let exact = true;
  for (const name of CASES) {
    const test = report.tests.find(item => item.name === name);
    if (control && !Object.hasOwn(control.expected, name)) {
      const skipped = (test.mode === 'skip' || test.state === 'skip') && test.errors.length === 0;
      exact &&= skipped; if (!skipped) console.error(JSON.stringify(test)); continue;
    }
    const message = control?.expected[name];
    const matches = message ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (control ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${(run.stdout + run.stderr).slice(-1800)}`);
  console.log(`PASS: ${control ? `${Object.keys(control.expected).length} exact controlled failure(s)` : '12/12 real Conquest help cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-conquest-help-')) throw new Error('Refusing cleanup outside the unique Conquest-help temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary Conquest help control files cleaned');
}
if (!success) process.exitCode = 1;
