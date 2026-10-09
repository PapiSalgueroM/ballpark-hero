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
function run(file) {
  const env = { ...process.env };
  if (file) {
    env.US_BOARD_CONTROL_ALIAS = '@/lib/season/soccer';
    env.US_BOARD_CONTROL_FILE = file;
  }
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--maxWorkers=1', '--minWorkers=1'], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.error || r.signal) throw r.error || new Error(`test stopped: ${r.signal}`);
  return r.status;
}
function fault(needle, replacement) {
  if (original.split(needle).length !== 2) throw new Error('control anchor must occur exactly once');
  const changed = original.replace(needle, replacement);
  if (changed === original) throw new Error('control changed nothing');
  fs.writeFileSync(copy, changed);
  if (run(copy) === 0) throw new Error('restored naming defect escaped the tests');
}
try {
  if (run() !== 0) throw new Error('opponent regression tests failed');
  console.log('ok current results-only opponents and saved season agreement');
  fault('if (sizeKey) {', "if (mode === 'table' && sizeKey) {");
  console.log('ok copied table-only opponent-pool defect was caught');
  fault('  open.sort((a, b) => a.pos - b.pos);', "  if (ctx.mode !== 'table') return out;\n  open.sort((a, b) => a.pos - b.pos);");
  console.log('ok copied results-only label defect was caught');
  console.log('simSoccerCareerOpponents: current behavior green, 2 effective negative controls caught');
} finally {
  if (fs.existsSync(copy)) fs.unlinkSync(copy);
}
