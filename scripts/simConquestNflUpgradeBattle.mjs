/** Round 534: real fixed-seed NFL upgrade outcomes and owner identity.
 * Unchanged original32 golden, card-99 reference comparisons, legacy inputs.
 * Exact OS-temp controls must produce their named assertion and no extra error.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/lib/conquestBattle.upgrades.test.ts';
const FILES = { engine: 'src/lib/conquestBattle.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_UPGRADE_BATTLE_CONTROL || '';
const CASES = [
  'preserves the 32 original-roster outcomes without queued upgrades',
  'applies both teams upgrades to real plays and box scores in either home role',
  'preserves legacy single-owner calls through the optional upgrade-map fallback',
  'treats an explicit empty map as authoritative over the legacy pair',
  'ignores upgrades belonging to absent teams or absent roster players',
  'applies a selected receivers upgrade to its own receiving plays and stats',
  'does not upgrade the opposing same-name pool player through the owner legend',
  'upgrades the same-name pool card only when its own team selects it',
];
const probe = (test, message, from, to) => ({ file: 'engine', test, message, from, to });
const normalization = '  const upgrades = teamUpgrades ?? (upgradeTeam && upgradedPlayer ? { [upgradeTeam]: upgradedPlayer } : {});';
const CONTROLS = {
  original: probe(0, 'ORIGINAL: all 32 recorded no-upgrade battle outputs stay unchanged',
    '  const numPlays = randInt(6, 8);', '  const numPlays = randInt(5, 8);'),
  plays: probe(1, 'BOTH PLAYS: both owners match their 99-card reference in visible plays',
    '    const play = generatePlay(offTeamId, defTeamId2, offRoster, defRosterFor, upgrades, legendPlayers);',
    '    const play = generatePlay(offTeamId, defTeamId2, offRoster, defRosterFor, {}, legendPlayers);'),
  attackerStats: probe(1, 'BOTH STATS: both owners match their 99-card reference in complete battle outputs',
    '  const attStats = generateFullGameStats(attackerId, attRoster, finalAttScore, upgrades[attackerId], legendPlayers);',
    '  const attStats = generateFullGameStats(attackerId, attRoster, finalAttScore, undefined, legendPlayers);'),
  defenderStats: probe(1, 'BOTH STATS: both owners match their 99-card reference in complete battle outputs',
    '  const defStats = generateFullGameStats(defenderId, defRoster, finalDefScore, upgrades[defenderId], legendPlayers);',
    '  const defStats = generateFullGameStats(defenderId, defRoster, finalDefScore, undefined, legendPlayers);'),
  quarterback: probe(1, 'BOTH PLAYS: both owners match their 99-card reference in visible plays',
    'getOvr(qb, offTeamId)', 'getOvr(qb, defTeamId)'),
  passDefense: probe(1, 'BOTH PLAYS: both owners match their 99-card reference in visible plays',
    '    const offRating = (getOvr(qb, offTeamId) + getOvr(target, offTeamId)) / 2;\n    const defRating = getOvr(defPlayer, defTeamId);',
    '    const offRating = (getOvr(qb, offTeamId) + getOvr(target, offTeamId)) / 2;\n    const defRating = getOvr(defPlayer, offTeamId);'),
  rushDefense: probe(1, 'BOTH PLAYS: both owners match their 99-card reference in visible plays',
    '    const offRating = getOvr(runner, offTeamId);\n    const defRating = getOvr(defPlayer, defTeamId);',
    '    const offRating = getOvr(runner, offTeamId);\n    const defRating = getOvr(defPlayer, offTeamId);'),
  legacy: probe(2, 'LEGACY: an omitted map retains the existing single-owner upgrade effect', normalization,
    '  const upgrades = teamUpgrades ?? {};'),
  empty: probe(3, 'EMPTY MAP: an explicit empty queue does not resurrect the legacy upgrade', normalization,
    '  const upgrades = teamUpgrades && Object.keys(teamUpgrades).length ? teamUpgrades : (upgradeTeam && upgradedPlayer ? { [upgradeTeam]: upgradedPlayer } : {});'),
  absent: probe(4, 'ABSENT: third-team and non-roster entries cannot change the current battle',
    '  const attStats = generateFullGameStats(attackerId, attRoster, finalAttScore, upgrades[attackerId], legendPlayers);',
    '  const attStats = generateFullGameStats(attackerId, attRoster, finalAttScore, Object.values(upgrades)[0], legendPlayers);'),
  receiver: probe(5, 'RECEIVER: the selected owner receiver matches the 99-card reference in actual battle outputs',
    'getOvr(target, offTeamId)', 'getOvr(target, defTeamId)'),
  owner: probe(6, 'OWNER NAME: upgrading MINs existing 99 legend leaves BUFs same-name 80 card unchanged',
    '    if (upgrades[teamId] === p.name) return 99;',
    '    if (Object.values(upgrades).includes(p.name)) return 99;'),
  pool: probe(7, 'POOL OWNER: BUFs selected pool card receives its own 99 effect in actual battle outputs', normalization,
    '  const upgrades = Object.fromEntries(Object.entries(teamUpgrades ?? (upgradeTeam && upgradedPlayer ? { [upgradeTeam]: upgradedPlayer } : {})).filter(([team]) => team !== defenderId));'),
  rusher: probe(7, 'POOL OWNER: BUFs selected pool card receives its own 99 effect in actual battle outputs',
    'getOvr(runner, offTeamId)', 'getOvr(runner, defTeamId)'),
  participants: probe(1, 'PARTICIPANTS: upgrades preserve current roster names',
    '    passingQb: qb.name,', "    passingQb: 'Synthetic absent participant',"),
  runtime: probe(0, null, normalization,
    "  throw new Error('Unexpected NFL upgrade-battle runtime control');\n" + normalization),
  backend: probe(0, null, "import { getNflRosterPlayer } from '@/lib/conquestRosterNfl';",
    "import { getNflRosterPlayer } from '@/lib/conquestRosterNfl';\nimport { supabase as upgradeBackend } from '@/integrations/supabase/client';\ntry { void upgradeBackend.auth; } catch {}"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-upgrade-battle-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;
try {
  const control = CONTROLS[CONTROL], originalPath = control && path.join(ROOT, FILES[control.file]);
  const copy = path.join(temp, 'source.control.ts');
  if (control) {
    const original = fs.readFileSync(originalPath, 'utf8').replaceAll('\r\n', '\n');
    const matches = original.split(control.from).length - 1;
    if (matches !== 1 || control.from === control.to) throw new Error(`${CONTROL}: expected one changed source anchor, found ${matches}`);
    const changed = original.replace(control.from, control.to);
    if (changed === original) throw new Error(`${CONTROL}: source control changed nothing`);
    fs.writeFileSync(copy, changed);
    console.log(`CONTROL ${CONTROL}: one exact source anchor changed in a unique OS-temp copy`);
  }
  const reporter = path.join(temp, 'reporter.mjs'), reportPath = path.join(temp, 'report.json');
  fs.writeFileSync(reporter, `import fs from 'node:fs';
export default class {
  onUserConsoleLog(log) { if (log.type === 'stdout') process.stdout.write(log.content); }
  onFinished(files, errors) {
    const tests = [], suiteErrors = [];
    const shape = error => ({ name: error.name, message: error.message });
    const visit = task => {
      if (task.type === 'test') tests.push({ name: task.name, mode: task.mode, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
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
  root: ${JSON.stringify(slash(ROOT))}, cacheDir: ${JSON.stringify(slash(path.join(temp, 'cache')))}, esbuild: { jsx: 'automatic' },
  plugins: [{ name: 'isolated-nfl-upgrade-battle-control', enforce: 'pre', transform(code, id) {
    if (${!!control} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(originalPath ? slash(originalPath) : '')}) return { code: fs.readFileSync(${JSON.stringify(copy)}, 'utf8'), map: null };
  } }],
  test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}] },
  resolve: { alias: { '@': ${JSON.stringify(slash(path.join(ROOT, 'src')))} } },
};
`);
  const args = ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config, '--maxWorkers=1', `--reporter=${slash(reporter)}`];
  if (control) args.push('-t', CASES[control.test]);
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  if (run.error || run.signal || !fs.existsSync(reportPath)) throw new Error(`Runner did not complete: ${run.error || run.signal || run.stderr}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (report.files !== 1 || report.tests.length !== CASES.length || new Set(report.tests.map(test => test.name)).size !== CASES.length
    || report.tests.some(test => !CASES.includes(test.name))) throw new Error('The exact eight named outcome tests were not reported');
  if (report.unhandled.length || report.suiteErrors.length) throw new Error(`Unexpected runtime/suite errors: ${JSON.stringify({ unhandled: report.unhandled, suite: report.suiteErrors })}`);
  let exact = true;
  for (const [index, name] of CASES.entries()) {
    const test = report.tests.find(item => item.name === name);
    if (control && index !== control.test) {
      const skipped = (test.mode === 'skip' || test.state === 'skip') && test.errors.length === 0;
      exact &&= skipped; if (!skipped) console.error(JSON.stringify(test)); continue;
    }
    const message = control?.message;
    const matches = message ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (control ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${(run.stdout + run.stderr).slice(-2500)}`);
  if (!control && run.stdout.trim()) console.log(run.stdout.trim());
  console.log(`REPORT: ${report.files} test file, ${report.tests.length} named cases, exit ${run.status}`);
  console.log(`PASS: ${control ? '1 exact controlled failure' : '8/8 real NFL upgrade-battle cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-upgrade-battle-')) throw new Error('Refusing cleanup outside the unique NFL-upgrade-battle temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL upgrade-battle control files cleaned');
}
if (!success) process.exitCode = 1;
