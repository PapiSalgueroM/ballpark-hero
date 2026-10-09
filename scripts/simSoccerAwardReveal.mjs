/* Saved outcomes stay hidden until the actual ranked list, with effective
   copied controls for spoilers, award confetti and the abrupt generation. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = path.join(ROOT, '.tmp-fx/award-reveal-tests.json');
const tests = ['src/test/soccerAwardReveal.test.tsx', 'src/test/soccerAwardGeneration.test.ts'];
const copies = [];
function run(alias, file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (alias) { env.US_BOARD_CONTROL_ALIAS = alias; env.US_BOARD_CONTROL_FILE = file; }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...tests, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.signal) throw result.error || new Error(`test stopped: ${result.signal}`);
  if (!fs.existsSync(report)) throw new Error('test runner did not produce its assertion report');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(s => !s.assertionResults?.length)) throw new Error('suite or import failure is not a regression proof');
  return { status: result.status, assertions: suites.flatMap(s => s.assertionResults) };
}
function fault(source, alias, needle, replacement, required) {
  const original = fs.readFileSync(path.join(ROOT, source), 'utf8');
  if (original.split(needle).length !== 2) throw new Error(`control refused: one ${required} anchor required`);
  const changed = original.replace(needle, replacement);
  if (changed === original) throw new Error('control refused: changed nothing');
  const copy = path.join(ROOT, path.dirname(source), `__control_awardReveal${path.extname(source)}`);
  copies.push(copy);
  fs.writeFileSync(copy, changed);
  const result = run(alias, copy);
  if (result.status === 0 || !result.assertions.some(a => a.status === 'failed' && a.fullName.includes(required))) throw new Error(`control did not fail its ${required} outcome assertion`);
  console.log(`ok effective ${required} copied defect caught`);
}
try {
  const current = run();
  if (current.status !== 0 || current.assertions.length !== 8 || current.assertions.some(a => a.status !== 'passed')) throw new Error('award reveal outcome tests failed');
  console.log('ok saved winners, losers, stale saves, ranked countdown and recurring new contenders');
  fault('src/lib/soccerAwardReveal.ts', '@/lib/soccerAwardReveal',
    'return queued && current && night && !night.revealed && !night.speech ? night.year : null;', 'return null;', 'keeps a saved');
  fault('src/components/career/AwardsNightCard.tsx', '@/components/career/AwardsNightCard',
    'const resultVisible = !reveal || reveal.complete || finished;', 'const resultVisible = true;', 'reveals the ranked');
  fault('src/components/career/AwardsNightCard.tsx', '@/components/career/AwardsNightCard',
    'resultVisible && isWinner && confetti && <Confetti', 'resultVisible && isWinner && <Confetti', 'reveals the ranked');
  fault('src/lib/soccerCareerEngine.ts', '@/lib/soccerCareerEngine',
    'const generation = Math.min(5, Math.max(0, year - 2027));', 'const generation = year <= 2032 ? 0 : 5;', 'puts known names');
  fault('src/lib/soccerCareerEngine.ts', '@/lib/soccerCareerEngine',
    'generateContender(usedNames, 9900 + i)', 'generateContender(usedNames, (year - 2024) * 100 + i)', 'keeps future contender');
  console.log('simSoccerAwardReveal: 8 outcome assertions green, 5 effective copied defects caught');
} finally {
  for (const copy of copies) if (fs.existsSync(copy)) fs.unlinkSync(copy);
}
