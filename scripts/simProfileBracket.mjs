/** Round 524: real Profile summary reader, synthetic saved-bracket payloads.
 * Original baseline: eight named failures, five positives. Known render crashes
 * are converted to named survival assertions, not credited as runtime errors.
 * SIM_PROFILE_BRACKET_CONTROL uses one exact source mutation in a unique OS-temp
 * copy. The runtime control must be rejected with a nonzero exit, never counted
 * as a passing negative control. No src/dist/backend records are rewritten.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/pages/Profile.bracket.test.tsx';
const PROFILE = path.join(ROOT, 'src/pages/Profile.tsx');
const CONTROL = process.env.SIM_PROFILE_BRACKET_CONTROL || '';
const CASES = [
  ['reads the current writer-shaped object champion', 'CURRENT: writer-shaped object shows its top-level champion'],
  ['reads a serialized current writer-shaped champion', 'SERIALIZED: string payload shows its top-level champion'],
  ['prefers the current champion over both legacy fields', 'CURRENT PRIORITY: top-level champion wins over legacy fields'],
  ['preserves legacy awards priority over the knockout final', 'LEGACY PRIORITY: awards champion wins over knockout final'],
  ['retains a valid legacy knockout final fallback', 'LEGACY FINAL: valid knockout final remains supported'],
  ['skips invalid higher-priority candidates for a valid legacy string', 'CANDIDATES: invalid earlier values cannot mask valid legacy champion'],
  ['keeps the saved card without inventing a champion from picks', 'NO CHAMPION: saved card does not infer a winner from picks'],
  ['survives malformed serialized bracket JSON', 'MALFORMED JSON: bad saved text cannot crash Profile'],
  ['survives a serialized null bracket payload', 'PARSED NULL: serialized null cannot crash Profile'],
  ['rejects non-string legacy champions without crashing or rendering them', 'NONSTRING: unsafe legacy champion values remain a saved card'],
  ['treats primitive and array root payloads as a saved card', 'ROOT SHAPE: non-object payloads cannot supply a champion'],
  ['ignores malformed legacy containers', 'LEGACY SHAPE: only object containers supply named champion fields'],
  ['trims the selected champion without altering the saved payload', 'TRIM: chosen valid champion is trimmed'],
];
const expected = (...indices) => Object.fromEntries(indices.map(index => [index, CASES[index][1]]));
const allErrors = message => Object.fromEntries(CASES.map((_, index) => [index, message]));
const candidates = '[bd.champion, awards.champion, knockoutWinners.final]';
const parse = 'try { bracketData = JSON.parse(bracketData); } catch { bracketData = null; }';
const select = ".find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null;";
const rendered = '  return (\n    <>\n      <PageSeo';
const CONTROLS = {
  current: { from: candidates, to: '[awards.champion, knockoutWinners.final]', errors: expected(0, 1, 2, 12) },
  serialized: { from: parse, to: 'bracketData = null;', errors: expected(1) },
  currentpriority: { from: candidates, to: '[awards.champion, bd.champion, knockoutWinners.final]', errors: expected(2) },
  legacypriority: { from: candidates, to: '[bd.champion, knockoutWinners.final, awards.champion]', errors: expected(3) },
  final: { from: candidates, to: '[bd.champion, awards.champion]', errors: expected(4, 5) },
  truthy: { from: select, to: '.find((value) => !!value) as string ?? null;', errors: expected(5, 9, 12) },
  whitespace: { from: select, to: select.replace(' && value.trim().length > 0', ''), errors: expected(5) },
  trim: { from: select, to: select.replace('?.trim()', ''), errors: expected(12) },
  parsecatch: { from: parse, to: 'bracketData = JSON.parse(bracketData);', errors: expected(7) },
  nullguard: { from: "if (bracketData && typeof bracketData === 'object' && !Array.isArray(bracketData))", to: "if (typeof bracketData === 'object' && !Array.isArray(bracketData))", errors: expected(7, 8, 10) },
  inference: { from: candidates, to: "[bd.champion || (bd.knockoutPicks as Record<string, unknown>)?.['f-0'], awards.champion, knockoutWinners.final]", errors: expected(6) },
  fallback: { from: ": 'Bracket saved'}", to: ": 'Synthetic invented champion'}", errors: expected(6, 7, 8, 9, 10, 11) },
  link: { from: '/world-cup-bracket?bracket=${savedBracket.id}', to: '/world-cup-bracket?bracket=wrong-fixture', errors: allErrors('LINK: saved card keeps its exact bracket destination') },
  immutable: { from: select, to: `${select}\n    bd.champion = wcChampion;`, errors: { 12: 'IMMUTABLE: summary reading cannot rewrite saved bracket data' } },
  storage: { from: rendered, to: `  localStorage.setItem('dukb-streaks-v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('dukb-streaks-v1')!), totalPoints: 123456 }));\n${rendered}`,
    errors: allErrors('STORAGE: bracket summaries preserve browser totals') },
  backend: { from: rendered, to: `  try { supabase.from('user_preferences').delete(); } catch { /* deliberately swallowed */ }\n${rendered}`,
    errors: allErrors('BOUNDARY: only exact fixture reads and recognized render failures occur') },
  runtime: { from: "  let bracketData: unknown = savedBracket?.bracket_data;", to: "  if (savedBracket) throw new Error('Unexpected bracket control error');\n  let bracketData: unknown = savedBracket?.bracket_data;", errors: {} },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-profile-bracket-'));
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
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact thirteen named component tests were not reported');
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '13/13 real Profile cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-profile-bracket-')) throw new Error('Refusing cleanup outside the unique Profile-bracket temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary Profile control files cleaned');
}
if (!success) process.exitCode = 1;
