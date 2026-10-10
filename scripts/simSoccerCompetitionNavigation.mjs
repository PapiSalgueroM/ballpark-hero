/* Competition tabs preserve the actual live/review state. Copied defects
   must fail executed outcome assertions, never just an import or syntax. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = path.join(ROOT, '.tmp-fx/competition-navigation-tests.json');
const copies = [];
function run(alias, file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (alias) { env.US_BOARD_CONTROL_ALIAS = alias; env.US_BOARD_CONTROL_FILE = file; }
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerSeasonCompetitions.test.tsx', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.error || r.signal) throw r.error || new Error(`test stopped: ${r.signal}`);
  if (!fs.existsSync(report)) throw new Error('missing assertion report');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(s => !s.assertionResults?.length)) throw new Error('suite/import failure is not outcome proof');
  return { status: r.status, assertions: suites.flatMap(s => s.assertionResults) };
}
function fault(source, alias, from, to, required) {
  const original = fs.readFileSync(path.join(ROOT, source), 'utf8');
  if (original.split(from).length !== 2) throw new Error(`control refused: ${required} anchor must occur once`);
  const changed = original.replace(from, to);
  if (changed === original) throw new Error('control changed nothing');
  const copy = path.join(ROOT, path.dirname(source), `__control_competitionNavigation${path.extname(source)}`);
  copies.push(copy); fs.writeFileSync(copy, changed);
  const r = run(alias, copy);
  if (r.status === 0 || !r.assertions.some(a => a.status === 'failed' && a.fullName.includes(required))) throw new Error(`control escaped ${required} assertion`);
  console.log(`ok effective ${required} defect caught`);
}
try {
  const r = run();
  if (r.status !== 0 || !r.assertions.length || r.assertions.some(a => a.status !== 'passed')) throw new Error('competition navigation outcomes failed');
  console.log(`ok ${r.assertions.length} saved competition and actual navigation outcomes`);
  fault('src/components/soccer-career/SoccerSeasonCentre.tsx', '@/components/soccer-career/SoccerSeasonCentre',
    '{model && <SeasonCentre', "{model && screen === 'league' && <SeasonCentre", 'freezes and resumes');
  fault('src/components/season-centre/MatchClock.tsx', '@/components/season-centre/MatchClock',
    'if (active && done && !told.current)', 'if (done && !told.current)', 'a hidden instant clock');
  fault('src/components/soccer-career/SoccerSeasonCentre.tsx', '@/components/soccer-career/SoccerSeasonCentre',
    ' || savedSeasonCompetitions(career, row).length > 0', '', 'opens an old saved campaign');
  fault('src/components/soccer-career/SeasonCompetitionPanel.tsx', '@/components/soccer-career/SeasonCompetitionPanel',
    'const currentSquad = !competition && !leagueUnavailable ? squadNow(career) : null;', 'const currentSquad = { club: row.club, year: row.year };', 'labels the current squad');
  console.log('simSoccerCompetitionNavigation: outcomes green, 4 effective copied defects caught');
} finally {
  for (const copy of copies) if (fs.existsSync(copy)) fs.unlinkSync(copy);
}