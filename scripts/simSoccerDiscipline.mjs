/* Actual saved consequences, card events and ban gaps, with copied defects
   required to fail their specific assertions rather than an import. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = path.join(ROOT, '.tmp-fx/soccer-discipline-tests.json');
const copies = [];
function run(alias, file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (alias) { env.US_BOARD_CONTROL_ALIAS = alias; env.US_BOARD_CONTROL_FILE = file; }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerDiscipline.test.ts', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.signal) throw result.error || new Error(`test stopped: ${result.signal}`);
  if (!fs.existsSync(report)) throw new Error('runner produced no assertion report');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(s => !s.assertionResults?.length)) throw new Error('suite or import failure is not a regression proof');
  return { status: result.status, assertions: suites.flatMap(s => s.assertionResults) };
}
function fault(source, alias, needle, replacement, required) {
  const original = fs.readFileSync(path.join(ROOT, source), 'utf8').replaceAll('\r\n', '\n');
  if (original.split(needle).length !== 2) throw new Error(`control refused: one ${required} anchor required`);
  const changed = original.replace(needle, replacement);
  if (changed === original) throw new Error('control refused: changed nothing');
  const copy = path.join(ROOT, path.dirname(source), `__control_soccerDiscipline${path.extname(source)}`);
  copies.push(copy);
  fs.writeFileSync(copy, changed);
  const result = run(alias, copy);
  if (result.status === 0 || !result.assertions.some(a => a.status === 'failed' && a.fullName.includes(required))) throw new Error(`control did not fail its ${required} outcome assertion`);
  console.log(`ok effective ${required} copied defect caught`);
}
try {
  const current = run();
  if (current.status !== 0 || current.assertions.length !== 11 || current.assertions.some(a => a.status !== 'passed')) throw new Error('soccer discipline outcomes failed');
  console.log('ok saved cards, real bans, appeal result ordering, injury boundaries and stat headroom');
  fault('src/lib/soccerCareerEngine.ts', '@/lib/soccerCareerEngine',
    's.pendingSuspensionMatches = serveClubSuspension(0, 0, s.pendingSuspensionMatches).remaining + 3;', '', 'accepts the existing');
  fault('src/lib/soccerDiscipline.ts', '@/lib/soccerDiscipline',
    'const served = Math.min(ban, Math.max(0, apps));', 'const served = 0;', 'accepts the existing');
  fault('src/lib/soccerCareerEngine.ts', '@/lib/soccerCareerEngine',
    'else delete s.pendingSuspensionMatches;', 'else s.pendingSuspensionMatches = season.suspensionMatches;', 'accepts the existing');
  fault('src/lib/soccerCareerEngine.ts', '@/lib/soccerCareerEngine',
    'if (s.phase === "red_card_appeal_result" as any) return s;', '', 'shows an appeal');
  fault('src/lib/season/core.ts', '@/lib/season/core',
    'let suspended = Math.max(0, a.suspended ?? 0);', 'let suspended = 0;', 'places served bans');
  fault('src/lib/season/soccerEvents.ts', './soccerEvents',
    "kind: red ? 'red' : 'injury'", "kind: 'injury'", 'shows recorded send-offs');
  fault('src/lib/soccerDiscipline.ts', '@/lib/soccerDiscipline',
    "red > 0 ? `🟥 ${red} red card${red === 1 ? '' : 's'}` : ''", "''", 'serves only actual');
  fault('src/lib/soccerCareerEngine.ts', '@/lib/soccerCareerEngine',
    'if (apps > 0 && state.divingActive && !isGK) goals += 2;', 'if (state.divingActive && !isGK) goals += 2;', 'keeps all appearances suspended');
  fault('src/lib/soccerCareerEngine.ts', '@/lib/soccerCareerEngine',
    'const redCards = Math.random() < 0.08 && apps > 0 ? 1 : 0;', 'const redCards = Math.random() < 0.08 ? 1 : 0;', 'keeps all appearances suspended');
  console.log('simSoccerDiscipline: 11 outcome assertions green, 9 effective copied defects caught');
} finally {
  for (const copy of copies) if (fs.existsSync(copy)) fs.unlinkSync(copy);
}
