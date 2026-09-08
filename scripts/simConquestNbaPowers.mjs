/** Round 527: real NBA Arcade hook powers and simulator effects.
 * Controlled rewards and small maps keep acquisition deterministic; the hook
 * and battle simulator execute their production code. Each control changes one
 * exact source anchor in a unique OS-temp copy and runs its named outcome test.
 * The runtime control must exit 1 and is never credited as expected failure.
 * No production data, storage, backend, src or dist file is rewritten by a run.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquestNba.powers.test.tsx';
const FILES = { hook: 'src/hooks/useConquestNba.ts', engine: 'src/lib/conquestBattleNba.ts' };
const CONTROL = process.env.SIM_CONQUEST_NBA_POWERS_CONTROL || '';
const CASES = [
  'awards one visible power after a real nonfinal attacker conquest',
  'awards no power or territory for a losing away attack',
  'keeps two saved powers and reopens only one card with stale inputs rejected',
  'recruits only eligible eliminated NBA players for the saved reward owner',
  'protects one home loss without spending a shield on an away loss',
  'keeps upgrades for their owners and passes both selections to their next battle',
  'applies a selected upgrade while its owner defends and then consumes it',
  'applies both selected upgrades in the same real simulated battle',
  'keeps ordinary NBA players distinct from activated legends across teams',
  'adds a franchise legend once and ignores replayed use clicks',
  'steals one chosen eligible region and rejects stale or invalid choices',
  'removes a queued upgrade when its owner loses its final region to a power',
  'lets empty selections return to the card and save without losing the power',
  'finishes the map after a territory steal or battle without another reward',
  'cancels a confirmed player steal when the game resets',
  'cancels pending player-steal work when the hook unmounts',
];
const hook = (test, message, from, to) => ({ file: 'hook', test, message, from, to });
const engine = (test, message, from, to) => ({ file: 'engine', test, message, from, to });
const CONTROLS = {
  reward: hook(0, 'ACQUISITION: conquest awards exactly one visible winner-owned power',
    "      setPendingPowerup({ teamId: result.winner, powerup: getRandomPowerup() });\n      setPhase('powerup_received');", "      setPhase('ready');"),
  replay: hook(0, 'ACQUISITION: conquest awards exactly one visible winner-owned power',
    "    if (phaseRef.current !== 'battle' || !pendingBattleApply || settlingBattleRef.current\n      || pendingBattleRef.current !== pendingBattleApply) return;", '    if (!pendingBattleApply) return;'),
  away: hook(1, 'AWAY: repelled attacks change no territory and award no power',
    '    if (result.loser === attacker) {', '    if (result.loser === attacker) {\n      setPendingPowerup({ teamId: result.winner, powerup: getRandomPowerup() });'),
  capacity: hook(2, 'INVENTORY: two slots replace the oldest reward without duplicate saves',
    '...current.slice(1), { id: powerup.id', '...current.slice(0), { id: powerup.id'),
  reopen: hook(2, 'REOPEN: one saved reward becomes a visible card exactly once',
    "    setPhase('powerup_received');\n  }, [teamSavedPowerups, territories, setPhase]);", "    setPhase('ready');\n  }, [teamSavedPowerups, territories, setPhase]);"),
  ready: hook(2, 'READY: unresolved rewards reject battle starts and saved-card reopening',
    "    if (phaseRef.current !== 'ready') return;", ''),
  savedphase: hook(2, 'REOPEN: one saved reward becomes a visible card exactly once',
    "    if (phaseRef.current !== 'ready' || !getAliveTeamsFrom(territories).includes(teamId)", "    if (!getAliveTeamsFrom(territories).includes(teamId)"),
  freepool: hook(3, 'FREEPOOL: selection keeps the recipient and offers only unclaimed eliminated NBA players',
    '    const agents: FreeAgent[] = [];', "    const agents: FreeAgent[] = [{ name: 'Synthetic non-NBA candidate', position: 'G', overall: 99 }];"),
  recipient: hook(3, 'RECIPIENT: one recruit joins the saved owner even when another team attacked last',
    '    const { teamId } = pendingPowerup;\n    finishPowerup();\n    setRosters(prev => ({', '    const teamId = attackingTeam!;\n    finishPowerup();\n    setRosters(prev => ({'),
  invalidrecruit: hook(3, 'INVALID: unknown recruits cannot spend or change a reward',
    ' || !freeAgentList.some(p => p.name === playerName)', ''),
  shield: hook(4, 'SHIELD HOME: one losing defense spends its shield and prevents conquest and reward',
    '        next.delete(result.loser);', ''),
  upgradeowners: hook(5, 'UPGRADE OWNERS: a second team keeps its own selection without erasing the first',
    '    setTeamUpgrades(prev => ({ ...prev, [teamId]: playerName }));', '    setTeamUpgrades({ [teamId]: playerName });'),
  upgradelifetime: hook(5, 'UPGRADE OWNERS: a second team keeps its own selection without erasing the first',
    '      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== team && id !== enemyId)));', '      setTeamUpgrades({});'),
  defense: hook(6, 'UPGRADE DEFENSE: a defender receives and consumes its own selected boost',
    'Object.entries(teamUpgrades).filter(([id]) => id === team || id === enemyId)', 'Object.entries(teamUpgrades).filter(([id]) => id === team)'),
  both: engine(7, 'UPGRADE BOTH: both selected players improve in paired real simulations',
    '  const upgrades = teamUpgrades ?? (upgradeTeam && upgradedPlayer ? { [upgradeTeam]: upgradedPlayer } : {});', '  const upgrades: Record<string, string> = {};'),
  ordinary: engine(8, 'LEGEND ORDINARY: a familiar franchise name alone cannot turn an ordinary player into a legend',
    'if (!legendPlayers && legend?.name === name)', 'if (legend?.name === name)'),
  transfer: engine(8, 'LEGEND TRANSFER: explicit activation preserves legend strength after a roster transfer',
    '  if (legendPlayers?.has(name) && acquiredLegend) {', '  if (false && legendPlayers?.has(name) && acquiredLegend) {'),
  legend: hook(9, 'LEGEND: the existing franchise great joins once',
    '[...(prev[teamId] || []), pendingLegend.name]', '[...(prev[teamId] || []), pendingLegend.name, pendingLegend.name]'),
  legendmetadata: hook(9, 'LEGEND: the existing franchise great joins once',
    '      setLegendPlayers(prev => new Set([...prev, pendingLegend.name]));', ''),
  legendreset: hook(9, 'LEGEND RESET: a fresh game clears activated legend metadata',
    '    setLegendPlayers(new Set());', ''),
  territory: hook(10, 'TERRITORY: the chosen region changes owner once and updates elimination',
    '    const updated = { ...territories, [stateId]: teamId };', '    const updated = { ...territories };'),
  territoryinvalid: hook(10, 'TERRITORY INVALID: only advertised enemy regions can be selected',
    ' || !availablePowerupTerritories.includes(stateId)', ''),
  elimination: hook(11, 'ELIMINATION UPGRADE: taking the final region removes its owner queued upgrade',
    '      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== previousOwner)));', ''),
  cancel: hook(12, 'CANCEL: an unavailable choice returns its original reward card',
    "    setPhase('powerup_received');\n  }, [pendingPowerup, setPhase]);", "    setPhase('ready');\n  }, [pendingPowerup, setPhase]);"),
  finalsteal: hook(13, 'STEAL VICTORY: taking the final region ends the game',
    "    if (aliveAfter.length <= 1) setPhase('gameover');", ''),
  finalreward: hook(13, 'FINAL REWARD: final conquests end without another reward',
    "    if (aliveAfter.length <= 1) {\n      setPhase('gameover');", "    if (aliveAfter.length <= 1) {\n      setPendingPowerup({ teamId: result.winner, powerup: getRandomPowerup() });\n      setPhase('gameover');"),
  reset: hook(14, 'RESET: deferred steals cannot mutate the fresh game',
    '  const reset = useCallback(() => {\n    clearTimeouts();', '  const reset = useCallback(() => {'),
  unmount: hook(15, 'UNMOUNT: deferred player steals are canceled',
    '  useEffect(() => () => { pendingBattleRef.current = null; clearTimeouts(); }, []);',
    '  useEffect(() => () => { pendingBattleRef.current = null; }, []);'),
  timeout: hook(14, 'RESET: deferred steals cannot mutate the fresh game',
    '    addTimeout(() => {\n      setRosters(prev => {', '    setTimeout(() => {\n      setRosters(prev => {'),
  runtime: hook(0, null, 'export function useConquestNba() {', "export function useConquestNba() {\n  throw new Error('Unexpected NBA powers runtime control');"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nba-powers-'));
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
  plugins: [{ name: 'isolated-nba-power-control', enforce: 'pre', transform(code, id) {
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
    || report.tests.some(test => !CASES.includes(test.name))) throw new Error('The exact sixteen named outcome tests were not reported');
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '16/16 real NBA power cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nba-powers-')) throw new Error('Refusing cleanup outside the unique NBA-powers temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NBA power control files cleaned');
}
if (!success) process.exitCode = 1;
