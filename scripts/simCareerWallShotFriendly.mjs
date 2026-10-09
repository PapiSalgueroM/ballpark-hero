/* A modest aim/timing error converts better than the old wall shot.
   Restoring the exact old ladder must fail the measured outcome check. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copy = path.join(ROOT, 'src/lib/__control_careerWallShotFriendly.ts');
const report = path.join(ROOT, '.tmp-fx/wall-shot-tests.json');
function run(file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (file) { env.US_BOARD_CONTROL_ALIAS = '@/lib/careerDrills'; env.US_BOARD_CONTROL_FILE = file; }
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/careerWallShotFriendly.test.ts', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.error || r.signal) throw r.error || new Error(`test stopped: ${r.signal}`);
  if (!fs.existsSync(report)) throw new Error('no assertion report');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(s => !s.assertionResults?.length)) throw new Error('suite or import failure is not a control proof');
  return { status: r.status, assertions: suites.flatMap(s => s.assertionResults) };
}
try {
  const current = run();
  if (current.status !== 0 || current.assertions.length !== 3 || current.assertions.some(a => a.status !== 'passed')) throw new Error('wall shot outcome checks failed');
  let changed = fs.readFileSync(path.join(ROOT, 'src/lib/careerDrills.ts'), 'utf8');
  for (const [from, to] of [
    ['(0.34 - t * 0.16)', '(0.30 - t * 0.17)'],
    ['(2.8 - t * 0.95)', '(2.4 - t * 1.1)'],
  ]) {
    if (changed.split(from).length !== 2) throw new Error('control refused: ladder anchor must appear exactly once');
    const next = changed.replace(from, to);
    if (next === changed) throw new Error('control refused: unchanged ladder');
    changed = next;
  }
  fs.writeFileSync(copy, changed);
  const control = run(copy);
  if (control.status === 0 || !control.assertions.some(a => a.status === 'failed' && a.fullName.includes('modest aiming and timing errors'))) throw new Error('old difficulty escaped the measured assertion');
  console.log('simCareerWallShotFriendly: forgiveness green, effective old-ladder control caught');
} finally { if (fs.existsSync(copy)) fs.unlinkSync(copy); }
