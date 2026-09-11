/** Round 535: explicit earned-legend identity and real fixed-seed NFL outcomes.
 * Existing pool and legend card references, exact original32 compatibility.
 * Every source control must produce its named assertion in an OS-temp copy.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/lib/conquestBattle.legends.test.ts';
const FILES = { engine: 'src/lib/conquestBattle.ts', helper: 'src/lib/conquestRosterNfl.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_LEGEND_BATTLE_CONTROL || '';
const CASES = [
  'preserves all 32 original-roster outcomes with omitted or explicit identity',
  'preserves the legacy recipient and remaining-legend lookup contract',
  'keeps ordinary pool cards ordinary and unearned legends unresolved',
  'recognizes activated known legends at every owner without promoting other names',
  'uses the ordinary Adrian Peterson pool card in its own franchises actual battles',
  'uses the ordinary Marshawn Lynch pool card in its own franchises actual battles',
  'keeps transferred Adrian Peterson at 99 in both real battle roles',
  'keeps transferred Marshawn Lynch at 99 in both real battle roles',
  'combines earned legend identity with an independent queued player upgrade',
];
const probe = (file, test, message, from, to) => ({file, test, message, from, to});
const helper = (test, message, from, to) => probe('helper', test, message, from, to);
const engine = (test, message, from, to) => probe('engine', test, message, from, to);
const own = "  if (!legendPlayers && ownLegend?.name === name) return { ...ownLegend, overall: 99, keyStat: 'Legend' };";
const remaining = "  if (!legendPlayers && legend) return { ...legend, overall: 99, keyStat: 'Legend' };";
const activated = "  if (legendPlayers?.has(name) && legend) return { ...legend, overall: 99, keyStat: 'Legend' };";
const normalization = '  const upgrades = teamUpgrades ?? (upgradeTeam && upgradedPlayer ? { [upgradeTeam]: upgradedPlayer } : {});';
const CONTROLS = {
  original: helper(0, 'ORIGINAL: all 32 recorded no-legend battle outcomes remain unchanged', '  if (ownPlayer) return ownPlayer;', '  if (ownPlayer) return { ...ownPlayer, overall: 75 };'),
  legacyOwn: helper(1, 'LEGACY OWN: omitted identity retains franchise legend priority', own, ''),
  legacyRemaining: helper(1, 'LEGACY REMAINING: omitted identity retains other known legends', remaining, ''),
  ordinaryOwn: helper(2, 'ORDINARY CARD: an unearned own-franchise pool card keeps its existing pool metadata', own, "  if (ownLegend?.name === name) return { ...ownLegend, overall: 99, keyStat: 'Legend' };"),
  unearned: helper(2, 'UNEARNED CARD: an explicit empty identity does not infer a remaining legend', remaining, "  if (legend) return { ...legend, overall: 99, keyStat: 'Legend' };"),
  activated: helper(3, 'ACTIVATED CARD: the earned legend retains complete 99 metadata at every owner', activated, ''),
  activatedRating: helper(3, 'ACTIVATED CARD: the earned legend retains complete 99 metadata at every owner', activated, "  if (legendPlayers?.has(name) && legend) return { ...legend, overall: 80, keyStat: 'Legend' };"),
  activatedStat: helper(3, 'ACTIVATED CARD: the earned legend retains complete 99 metadata at every owner', activated, "  if (legendPlayers?.has(name) && legend) return { ...legend, overall: 99, keyStat: '' };"),
  nonlegend: helper(3, 'KNOWN ONLY: an ordinary player marker cannot invent a legend card', '  if (ownPlayer) return ownPlayer;', '  if (ownPlayer) return legendPlayers?.has(name) ? { ...ownPlayer, overall: 99 } : ownPlayer;'),
  unknown: helper(3, 'UNKNOWN: an unknown marker cannot invent a card', '  return undefined;', "  return { name, position: '?', overall: 75, keyStat: '' };"),
  poolCall: engine(4, 'POOL PLAYS: all 128 real previews match the ordinary existing pool card', 'getNflRosterPlayer(name, teamId, legendPlayers) ||', 'getNflRosterPlayer(name, teamId) ||'),
  poolPlays: engine(4, 'POOL PLAYS: all 128 real previews match the ordinary existing pool card', '    const play = generatePlay(offTeamId, defTeamId2, offRoster, defRosterFor, upgrades, legendPlayers);', '    const play = generatePlay(offTeamId, defTeamId2, offRoster, defRosterFor, upgrades);'),
  poolStats: engine(4, 'POOL OUTPUTS: all 128 complete battles match the ordinary existing pool card', '  const pos = getPlayersByPos(roster, teamId, legendPlayers);', '  const pos = getPlayersByPos(roster, teamId);'),
  lynchPool: helper(5, 'POOL PLAYS: all 128 real previews match the ordinary existing pool card', activated, activated + "\n  if (name === 'Marshawn Lynch') return { ...TEAM_LEGENDS.SEA, keyStat: 'Legend' };"),
  transferOff: engine(6, 'TRANSFER PLAYS: each real preview retains the acquired legend card at either battle side', '  const off = getPlayersByPos(offRoster, offTeamId, legendPlayers);', '  const off = getPlayersByPos(offRoster, offTeamId, new Set());'),
  transferAttStats: engine(6, 'TRANSFER OUTPUTS: each complete battle retains the acquired legend card at either battle side', '  const attStats = generateFullGameStats(attackerId, attRoster, finalAttScore, upgrades[attackerId], legendPlayers);', '  const attStats = generateFullGameStats(attackerId, attRoster, finalAttScore, upgrades[attackerId], new Set());'),
  transferDefStats: engine(6, 'TRANSFER OUTPUTS: each complete battle retains the acquired legend card at either battle side', '  const defStats = generateFullGameStats(defenderId, defRoster, finalDefScore, upgrades[defenderId], legendPlayers);', '  const defStats = generateFullGameStats(defenderId, defRoster, finalDefScore, upgrades[defenderId], new Set());'),
  lynchTransfer: helper(7, 'TRANSFER PLAYS: each real preview retains the acquired legend card at either battle side', activated, "  if (legendPlayers?.has(name) && legend && name !== 'Marshawn Lynch') return { ...legend, overall: 99, keyStat: 'Legend' };"),
  combined: engine(8, 'COMBINED: the actual battle applies both the permanent legend and its separate queued player upgrade', normalization, '  const upgrades = {};'),
  participants: engine(4, 'PARTICIPANTS: every actual box-score player belongs to the current roster', '    boxScore: { attStats, defStats },', "    boxScore: { attStats: { ...attStats, passingQb: 'Unknown Fixture Player' }, defStats },"),
  runtime: engine(0, null, normalization, "  throw new Error('Unexpected NFL legend runtime control');\n" + normalization),
  backend: engine(0, null, 'export function simulateDetailedBattle(', "import { supabase as legendBackend } from '@/integrations/supabase/client';\ntry { void legendBackend.auth; } catch {}\nexport function simulateDetailedBattle("),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-legend-battle-'));
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
  plugins: [{ name: 'isolated-nfl-legend-battle-control', enforce: 'pre', transform(code, id) {
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
    || report.tests.some(test => !CASES.includes(test.name))) throw new Error('The exact nine named outcome tests were not reported');
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '9/9 real NFL legend-battle cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-legend-battle-')) throw new Error('Refusing cleanup outside the unique NFL-upgrade-battle temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL legend-battle control files cleaned');
}
if (!success) process.exitCode = 1;
