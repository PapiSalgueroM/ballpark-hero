/* Results-only seasons keep their verified opponents. Both old naming
   gates are restored in copied modules to prove the regression tests fail. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(ROOT, 'src/lib/season/soccer.ts');
const copy = path.join(ROOT, 'src/lib/season/__control_soccerOpponents.ts');
const original = fs.readFileSync(source, 'utf8');
const test = 'src/test/soccerSeasonOpponents.test.ts';
const report = path.join(ROOT, '.tmp-fx/opponents-tests.json');
function run(file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (file) {
    env.US_BOARD_CONTROL_ALIAS = '@/lib/season/soccer';
    env.US_BOARD_CONTROL_FILE = file;
  }
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.error || r.signal) throw r.error || new Error(`test stopped: ${r.signal}`);
  if (!fs.existsSync(report)) throw new Error('test runner did not produce its assertion report');
  const results = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!results?.length || results.some(s => !s.assertionResults?.length)) throw new Error('suite or import failure is not a regression proof');
  return { status: r.status, assertions: results.flatMap(s => s.assertionResults) };
}
function fault(needle, replacement) {
  if (original.split(needle).length !== 2) throw new Error('control anchor must occur exactly once');
  const changed = original.replace(needle, replacement);
  if (changed === original) throw new Error('control changed nothing');
  fs.writeFileSync(copy, changed);
  const result = run(copy);
  if (result.status === 0 || !result.assertions.some(a => a.status === 'failed' && a.fullName.includes('names every Anderlecht opponent'))) throw new Error('restored naming defect escaped the required assertion');
}
try {
  const current = run();
  if (current.status !== 0 || current.assertions.length !== 8 || current.assertions.some(a => a.status !== 'passed')) throw new Error('opponent regression tests failed');
  console.log('ok current results-only opponents and saved season agreement');
  fault('if (sizeKey) {', "if (mode === 'table' && sizeKey) {");
  console.log('ok copied table-only opponent-pool defect was caught');
  fault('  open.sort((a, b) => a.pos - b.pos);', "  if (ctx.mode !== 'table') return out;\n  open.sort((a, b) => a.pos - b.pos);");
  console.log('ok copied results-only label defect was caught');
  console.log('simSoccerCareerOpponents: current behavior green, 2 effective negative controls caught');
} finally {
  if (fs.existsSync(copy)) fs.unlinkSync(copy);
}
