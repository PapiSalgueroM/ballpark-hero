/** Round 535: actual earned, signed and stolen NFL legend identities.
 * Declared initial ownership preserves real geometry and all original rosters.
 * Checked OS-temp source controls earn only their exact named AssertionError.
 * Runtime and caught-backend errors must reject with exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquest.legends.test.tsx';
const FILES = { hook: 'src/hooks/useConquest.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_LEGENDS_CONTROL || '';
const CASES = [
 'keeps both ordinary franchise pool cards unmarked at their shipped ratings',
 'keeps an earned legend card saveable when its owner already has the ordinary player',
 'blocks an earned legend when the ordinary same-name player moved to another active team',
 'registers one successful earned legend and preserves a second same-owner reward',
 'preserves an earned legend through a real steal and forwards its new owner to the engine',
 'retains eliminated legend identity in both released-player offer paths',
 'keeps an acquired legend when docked signing waives the actual weakest ordinary player',
 'clears run identities on reset without reviving an older earned-card callback',
];
const hook = (test, message, from, to) => ({ file: 'hook', test, message, from, to });
const useGuard = "    if (!canResolvePowerup('powerup_received') || !pendingPowerup || powerupUnavailableReason) return;";
const ignoreReason = "    if (!canResolvePowerup('powerup_received') || !pendingPowerup) return;";
const allActive = '  const activeRosterNames = new Set(getAliveTeamsFrom(territories).flatMap(id => rosters[id] || []));';
const ownActive = '  const activeRosterNames = new Set(pendingPowerup ? rosters[pendingPowerup.teamId] || [] : []);';
const offerCard = '      const card = getNflRosterPlayer(fa.name, teamId, legendPlayers)!;';
const signAnchor = '    const teamId = powerupTeam;\n    finishPowerup();\n    setRosters(prev => ({';
const saveAnchor = '    finishPowerup();\n    setTeamSavedPowerups(prev => {';
const CONTROLS = {
 ordinaryoffer: hook(0, 'ORDINARY OFFER: a reward pool card keeps its ordinary rating on its matching franchise', offerCard,
  '      const card = getNflRosterPlayer(fa.name, teamId)!;'),
 ordinaryidentity: hook(0, 'ORDINARY IDENTITY: acquiring a same-name pool player does not activate a legend', signAnchor,
  '    const teamId = powerupTeam;\n    finishPowerup();\n    setLegendPlayers(prev => new Set([...prev, playerName]));\n    setRosters(prev => ({'),
 ordinaryengine: hook(0, 'ORDINARY ENGINE: an actual battle receives explicit empty legend identity with the acquired roster',
  '  const sim = simulateDetailedBattle(attacker, defender, territories, rosters, null, null, ratingOverrides, teamUpgrades, legendPlayers);',
  '  const sim = simulateDetailedBattle(attacker, defender, territories, rosters, null, null, ratingOverrides, teamUpgrades);'),
 ownreason: hook(1, 'OWN ORDINARY REASON: an active same-name identity makes the earned legend card unavailable',
  "    : pendingPowerup?.powerup.id === 'legend' && (!pendingLegend || activeRosterNames.has(pendingLegend.name))",
  "    : pendingPowerup?.powerup.id === 'legend' && !pendingLegend"),
 owncard: hook(1, 'OWN ORDINARY CARD: blocked use preserves the earned card and all roster identities', useGuard, ignoreReason),
 ownsave: hook(1, 'OWN ORDINARY SAVE: the blocked earned legend card remains bankable', saveAnchor,
  '    finishPowerup();\n    if (powerup.id === \'legend\') return;\n    setTeamSavedPowerups(prev => {'),
 blockedmarker: hook(1, 'BLOCKED MARKER: blocked same-name redemption cannot promote an ordinary player', saveAnchor,
  '    finishPowerup();\n    if (powerup.id === \'legend\') setLegendPlayers(prev => new Set([...prev, TEAM_LEGENDS[teamId].name]));\n    setTeamSavedPowerups(prev => {'),
 otherreason: hook(2, 'OTHER ORDINARY REASON: an active same-name identity makes the earned legend card unavailable', allActive, ownActive),
 othercard: hook(2, 'OTHER ORDINARY CARD: blocked use preserves the earned card and all roster identities', useGuard, ignoreReason),
 foreignordinary: hook(2, 'FOREIGN ORDINARY: a blocked franchise reward leaves the opponent ordinary card at 80', saveAnchor,
  '    finishPowerup();\n    if (powerup.id === \'legend\') setLegendPlayers(prev => new Set([...prev, TEAM_LEGENDS[teamId].name]));\n    setTeamSavedPowerups(prev => {'),
 activation: hook(3, 'ACTIVATE ONCE: one earned card records one real legend identity and roster addition',
  '          setLegendPlayers(prev => new Set([...prev, legend.name]));', ''),
 activationonce: hook(3, 'ACTIVATE ONCE: one earned card records one real legend identity and roster addition',
  '    return rewardActionTokenRef.current === rewardActionToken && phaseRef.current === expectedPhase', '    return true'),
 ownlegend: hook(3, 'OWN LEGEND REASON: an active same-name identity makes the earned legend card unavailable',
  "    : pendingPowerup?.powerup.id === 'legend' && (!pendingLegend || activeRosterNames.has(pendingLegend.name))",
  "    : pendingPowerup?.powerup.id === 'legend' && (!pendingLegend || (activeRosterNames.has(pendingLegend.name) && !legendPlayers.has(pendingLegend.name)))"),
 duplicatemarker: hook(3, 'DUPLICATE MARKER: saving another reward leaves the original legend identity intact', saveAnchor,
  '    finishPowerup();\n    setLegendPlayers(new Set());\n    setTeamSavedPowerups(prev => {'),
 transfer: hook(4, 'TRANSFER IDENTITY: an actually earned legend retains its 99 identity after a real player steal',
  '    setPlayerConfirmed(playerName);', '    setLegendPlayers(new Set());\n    setPlayerConfirmed(playerName);'),
 transferengine: hook(4, 'TRANSFER ENGINE: the new owner actual simulation receives the earned legend marker and unchanged real result',
  '      const result = simulateBattle(team, enemyId, territories, rosters, upgrades, legendPlayers, buildRatingOverrides());',
  '      const result = simulateBattle(team, enemyId, territories, rosters, upgrades, new Set(), buildRatingOverrides());'),
 transferresult: hook(4, 'TRANSFER ENGINE: the new owner actual simulation receives the earned legend marker and unchanged real result',
  '    simulation: sim,', '    simulation: { ...sim, finalDefScore: sim.finalDefScore + 7 },'),
 otherlegend: hook(4, 'OTHER LEGEND REASON: an active same-name identity makes the earned legend card unavailable', allActive, ownActive),
 eliminated: hook(5, 'ELIMINATED IDENTITY: losing all territory does not erase an earned run identity',
  '      setEliminated(e => [...e, result.loser]);', '      setEliminated(e => [...e, result.loser]);\n      setLegendPlayers(new Set());'),
 releaseddock: hook(5, 'RELEASED DOCK: the eliminated owner releases the actual earned 99 card into docked free agency',
  "        const info = getNflRosterPlayer(name, favoriteTeam || '', legendPlayers) || { position: '?', overall: 75 };",
  "        const info = getNflRosterPlayer(name, favoriteTeam || '') || { position: '?', overall: 75 };"),
 releasedreward: hook(5, 'RELEASED REWARD: an earned signing reward offers the same retained 99 identity', offerCard,
  '      const card = getNflRosterPlayer(fa.name, teamId, new Set())!;'),
 releasedsign: hook(5, 'RELEASED SIGN: the released legend can rejoin an active roster with its earned identity', signAnchor,
  '    const teamId = powerupTeam;\n    finishPowerup();\n    setLegendPlayers(new Set());\n    setRosters(prev => ({'),
 waiver: hook(6, 'WAIVER IDENTITY: canonical earned 99 metadata keeps the legend and waives the actual weakest player',
  '      const ovr = getNflRosterPlayer(name, favoriteTeam, legendPlayers)?.overall ?? 75;',
  '      const ovr = getNflRosterPlayer(name, favoriteTeam)?.overall ?? 75;'),
 reset: hook(7, 'RESET IDENTITY: a fresh run clears earned legend metadata with its acquired roster', '    setLegendPlayers(new Set());', ''),
 stale: hook(7, 'RESET STALE: an older earned-card callback cannot restore a cleared legend', useGuard,
  '    if (!pendingPowerup || powerupUnavailableReason) return;'),
 runtime: hook(0, null, 'export function useConquest() {', "export function useConquest() {\n  throw new Error('Unexpected NFL legends runtime control');"),
 backend: hook(0, null, 'export function useConquest() {',
  "import { supabase as nflLegendBackend } from '@/integrations/supabase/client';\ntry { void nflLegendBackend.auth; } catch {}\nexport function useConquest() {"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-legends-'));
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
  plugins: [{ name: 'isolated-nfl-legends-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '8/8 NFL legends cases green (declared initial-map fixtures, real actions)'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-legends-')) throw new Error('Refusing cleanup outside the unique NFL-legends temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL legends control files cleaned');
}
if (!success) process.exitCode = 1;
