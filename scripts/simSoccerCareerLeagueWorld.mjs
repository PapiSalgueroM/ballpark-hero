/* Round 1175: saved future membership, movement and actual replay tables.
   Every copied defect changes one exact anchor and must fail its named test. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(ROOT, 'src/lib/soccerCareerLeagueWorld.ts');
const copy = path.join(ROOT, 'src/lib/__control_soccerCareerLeagueWorld.ts');
const seasonSource = path.join(ROOT, 'src/lib/season/soccer.ts');
const seasonCopy = path.join(ROOT, 'src/lib/season/__control_soccer.ts');
const report = path.join(ROOT, '.tmp-fx/league-world-tests.json');
function run(file, alias = '@/lib/soccerCareerLeagueWorld') {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (file) { env.US_BOARD_CONTROL_ALIAS = alias; env.US_BOARD_CONTROL_FILE = file; }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerCareerLeagueWorld.test.ts', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  if (result.error || result.signal) throw result.error || new Error(`test stopped: ${result.signal}`);
  if (!fs.existsSync(report)) throw new Error('world suite produced no assertion report');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(s => !s.assertionResults?.length)) throw new Error('suite or import failure is not a regression proof');
  return { status: result.status, assertions: suites.flatMap(s => s.assertionResults) };
}
try {
  const result = run();
  if (result.status !== 0 || result.assertions.length !== 11 || result.assertions.some(a => a.status !== 'passed')) throw new Error('future league world outcome tests failed or were skipped');
  console.log('ok five-country 15-year movement, actual final table, player division, offer projection, old save replay, partial Spain and fixed champion aliases');
  const controls = [
    { name: 'promoting the bottom clubs', anchor: 'const up = orderFor(p.lower).slice(0, p.count);', defect: 'const up = orderFor(p.lower).slice(-p.count);', assertion: 'changes membership over fifteen years with equal, disjoint and correctly ranked swaps' },
    { name: 'using form instead of the displayed table', anchor: 'return supplied && supplied.length === members.length', defect: 'return false && supplied && supplied.length === members.length', assertion: 'uses the displayed final table for relegation and retains that season after later movement' },
    { name: 'raw aliases duplicating a relegated club', anchor: '? supplied.map(n => members.find(m => same(m, n))!) : leagueWorldOrder', defect: '? supplied : leagueWorldOrder', assertion: 'normalizes saved club aliases before swapping and keeps the played spelling once' },
    { name: 'exact-name champion missing its saved derby key', source: seasonSource, copy: seasonCopy, alias: '@/lib/season/soccer', anchor: '(ctx.fixedNames?.[r] ?? r) === ctx.champion', defect: 'r === ctx.champion', assertion: 'binds a mixed-alias future champion to its saved derby key and field spelling' },
    { name: 'fixed rival ignoring the saved field spelling', source: seasonSource, copy: seasonCopy, alias: '@/lib/season/soccer', anchor: 'ctx.fixedNames?.[s.fixedKey] ?? s.fixedKey', defect: 's.fixedKey', assertion: 'binds a mixed-alias future champion to its saved derby key and field spelling' },
  ];
  for (const control of controls) {
    const original = fs.readFileSync(control.source ?? source, 'utf8');
    const controlledCopy = control.copy ?? copy;
    if (original.split(control.anchor).length !== 2) throw new Error(`${control.name} anchor must occur exactly once`);
    const changed = original.replace(control.anchor, control.defect);
    if (changed === original) throw new Error(`${control.name} changed nothing`);
    fs.writeFileSync(controlledCopy, changed);
    const bad = run(controlledCopy, control.alias);
    if (bad.status === 0 || !bad.assertions.some(a => a.status === 'failed' && a.fullName.includes(control.assertion))) throw new Error(`${control.name} escaped its named outcome`);
    console.log(`ok copied ${control.name} defect changed source and was caught`);
  }
  console.log('simSoccerCareerLeagueWorld: eleven outcome tests green, all five effective negative controls caught');
} finally { for (const file of [copy, seasonCopy]) if (fs.existsSync(file)) fs.unlinkSync(file); }
