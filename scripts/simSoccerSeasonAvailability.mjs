import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(ROOT, 'src/lib/season/soccer.ts');
const copy = path.join(ROOT, 'src/lib/season/__control_soccerAvailability.ts');
const report = path.join(ROOT, '.tmp-fx/soccer-availability-tests.json');
function run(file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (file) { env.US_BOARD_CONTROL_ALIAS = '@/lib/season/soccer'; env.US_BOARD_CONTROL_FILE = file; }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerSeasonAvailability.test.ts', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  if (result.error || result.signal) throw result.error || new Error(`availability test stopped: ${result.signal}`);
  if (!fs.existsSync(report)) throw new Error('availability suite produced no assertion report');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(s => !s.assertionResults?.length)) throw new Error('an import failure is not an availability regression proof');
  return { status: result.status, assertions: suites.flatMap(s => s.assertionResults) };
}
try {
  const healthy = run();
  if (healthy.status !== 0 || healthy.assertions.length !== 3 || healthy.assertions.some(a => a.status !== 'passed')) throw new Error('saved calendar outcomes failed or were skipped');
  console.log('ok saved missed derby, complete totals and feasible calendars passed');
  /* Release AQ: the anchor below spans two lines, and this checkout stores src with CRLF, so the read is
     normalised or the control can never run here (scripts/simHarnessAnchors.mjs holds that rule). */
  const original = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
  const anchor = '    const fixedMissed = fixedOf(row, ctx).filter(f => !f.played).length;\n    const room = Math.min(severe ? M : M - block, M - fixedMissed);';
  if (original.split(anchor).length !== 2) throw new Error('old physical-capacity control anchor must occur once');
  const changed = original.replace(anchor, '    const room = severe ? M : M - block;');
  if (changed === original) throw new Error('old capacity control changed nothing');
  fs.writeFileSync(copy, changed);
  const bad = run(copy);
  if (bad.status === 0 || !bad.assertions.some(a => a.status === 'failed' && a.fullName.includes('keeps a recorded missed derby'))) throw new Error('the copied old capacity escaped its actual table outcome');
  if (bad.assertions.filter(a => a.status === 'passed').length !== 2) throw new Error('the two already feasible calendar controls did not stay green');
  console.log('ok effective copied old capacity loses the exact full table, both feasible calendars stay green');
  console.log('simSoccerSeasonAvailability: three outcomes green and effective old-capacity defect caught');
} finally { if (fs.existsSync(copy)) fs.unlinkSync(copy); }