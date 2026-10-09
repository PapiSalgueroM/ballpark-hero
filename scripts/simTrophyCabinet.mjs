/* The cabinet names only wins stored in the career. A copied component
   deliberately admits losing seasons so the outcome tests must fail. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(ROOT, 'src/components/soccer-career/TrophyCabinet.tsx');
const copy = path.join(ROOT, 'src/components/soccer-career/__control_TrophyCabinet.tsx');
const report = path.join(ROOT, '.tmp-fx/trophy-tests.json');
function run(file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (file) {
    env.US_BOARD_CONTROL_ALIAS = '@/components/soccer-career/TrophyCabinet';
    env.US_BOARD_CONTROL_FILE = file;
  }
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/trophyCabinet.test.tsx', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.error || r.signal) throw r.error || new Error(`test stopped: ${r.signal}`);
  if (!fs.existsSync(report)) throw new Error('test runner did not produce its assertion report');
  const results = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!results?.length || results.some(s => !s.assertionResults?.length)) throw new Error('suite or import failure is not a regression proof');
  return { status: r.status, assertions: results.flatMap(s => s.assertionResults) };
}
try {
  const current = run();
  if (current.status !== 0 || !current.assertions.length || current.assertions.some(a => a.status !== 'passed')) throw new Error('trophy cabinet tests failed');
  console.log('ok actual winning seasons, stats, old saves and controls');
  const original = fs.readFileSync(source, 'utf8');
  const needle = 'return Boolean(trophy);';
  if (original.split(needle).length !== 2) throw new Error('win filter control anchor must occur exactly once');
  const changed = original.replace(needle, 'return true;');
  if (changed === original) throw new Error('win filter control changed nothing');
  fs.writeFileSync(copy, changed);
  const result = run(copy);
  if (result.status === 0 || !result.assertions.some(a => a.status === 'failed' && a.fullName.includes('trophy'))) throw new Error('invented trophy wins escaped the required assertion');
  console.log('ok copied losing-season defect changed the filter and was caught');
  console.log('simTrophyCabinet: saved honors green, effective negative control caught');
} finally {
  if (fs.existsSync(copy)) fs.unlinkSync(copy);
}
