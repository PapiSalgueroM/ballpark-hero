/** Round 534: earned upgrade queues, actual map actions and real engine call-through.
 * Every source control changes one checked anchor in an OS-temp copy and earns
 * only its named AssertionError. Runtime and caught-backend probes must reject.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquest.upgrades.test.tsx';
const FILES = { hook: 'src/hooks/useConquest.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_UPGRADES_CONTROL || '';
const CASES = [
  'preserves an earned queue through unrelated and owner neutral claims',
  'preserves a queued owner while unrelated teams fight a real battle',
  'uses and consumes the attacker upgrade while retaining its real battle snapshot',
  'uses and consumes the defender upgrade when another team attacks its owner',
  'keeps independent earned queues and consumes only actual battle participants',
  'keeps a second same-owner reward unspent until the queued battle is played',
  'clears queued and battle upgrades on reset and rejects stale disposed choices',
  'clears an eliminated owner queue while retaining another in a declared initial-map fixture',
  'forwards both earned owner upgrades into one real battle in a declared initial-map fixture',
];
const hook = (test, message, from, to) => ({ file: 'hook', test, message, from, to });
const consume = '      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== team && id !== enemyId)));';
const select = '      const upgrades = Object.fromEntries(Object.entries(teamUpgrades).filter(([id]) => id === team || id === enemyId));';
const CONTROLS = {
  arm: hook(0, 'ARM: an earned choice queues its current roster player for its owner',
    '    setTeamUpgrades(prev => ({ ...prev, [powerupTeam]: player }));', '    setTeamUpgrades({});'),
  neutral: hook(0, 'NEUTRAL: another team claiming a neutral state preserves the queued upgrade',
    '    const team = alive[Math.floor(Math.random() * alive.length)];',
    '    setTeamUpgrades({});\n    const team = alive[Math.floor(Math.random() * alive.length)];'),
  ownerneutral: hook(0, 'OWNER NEUTRAL: an owner neutral claim does not spend its next battle upgrade',
    '      const claimState = () => {',
    '      const claimState = () => {\n        setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== team)));'),
  unrelated: hook(1, 'UNRELATED: an unrelated real battle does not consume Cincinnati upgrade', consume, '      setTeamUpgrades({});'),
  unrelatedsnapshot: hook(1, 'UNRELATED SNAPSHOT: a third team upgrade never enters the current simulation', select, '      const upgrades = { ...teamUpgrades };'),
  settledqueue: hook(1, 'SETTLED QUEUE: settlement preserves an unrelated queued owner',
    '  const skipSteal = useCallback(() => {', '  const skipSteal = useCallback(() => {\n    setTeamUpgrades({});'),
  attackcall: hook(2, 'ATTACK CALL: the hook forwards the attacker queue through the authoritative engine map',
    '  const sim = simulateDetailedBattle(attacker, defender, territories, rosters, null, null, ratingOverrides, teamUpgrades);',
    '  const sim = simulateDetailedBattle(attacker, defender, territories, rosters, null, null, ratingOverrides, {});'),
  attackconsume: hook(2, 'ATTACK CONSUME: the participating queue moves into the current battle snapshot', consume, ''),
  attacksnapshot: hook(2, 'ATTACK CONSUME: the participating queue moves into the current battle snapshot',
    '      setBattleUpgrades(upgrades);', '      setBattleUpgrades({});'),
  realresult: hook(2, 'REAL RESULT: the hook reveals the real engine result without replacing it',
    '    simulation: sim,', '    simulation: { ...sim, finalAttScore: sim.finalAttScore + 7 },'),
  resultsnapshot: hook(2, 'RESULT SNAPSHOT: the result table keeps the upgrade used by its actual box score',
    '  const skipToResult = useCallback(() => {', '  const skipToResult = useCallback(() => {\n    setBattleUpgrades({});'),
  settledsnapshot: hook(2, 'SETTLED SNAPSHOT: settlement retains the displayed battle upgrade',
    '  const skipSteal = useCallback(() => {', '  const skipSteal = useCallback(() => {\n    setBattleUpgrades({});'),
  nextsnapshot: hook(2, 'NEXT SNAPSHOT: the next accepted turn clears the previous battle upgrade',
    '    setBattleUpgrades({});\n\n    const team = alive[Math.floor(Math.random() * alive.length)];',
    '    const team = alive[Math.floor(Math.random() * alive.length)];'),
  defendcall: hook(3, 'DEFEND CALL: the defender owned queue reaches the actual engine', select,
    '      const upgrades = Object.fromEntries(Object.entries(teamUpgrades).filter(([id]) => id === team));'),
  defendconsume: hook(3, 'DEFEND CONSUME: defending spends only that owner next battle upgrade', consume,
    '      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== team)));'),
  defendsettled: hook(3, 'DEFEND SETTLED: the defender upgrade remains spent after the real battle settles',
    '  const skipSteal = useCallback(() => {', '  const skipSteal = useCallback(() => {\n    setTeamUpgrades(prev => ({ ...prev, ...battleUpgrades }));'),
  twoowners: hook(4, 'TWO OWNERS: a second earned upgrade cannot overwrite another team queue',
    '    setTeamUpgrades(prev => ({ ...prev, [powerupTeam]: player }));', '    setTeamUpgrades({ [powerupTeam]: player });'),
  participants: hook(4, 'PARTICIPANTS: spending Cincinnati upgrade preserves Kansas City queued player', consume, '      setTeamUpgrades({});'),
  participantcall: hook(4, 'PARTICIPANT CALL: the simulator receives only upgrades for its actual two teams',
    '      const result = simulateBattle(team, enemyId, territories, rosters, upgrades, buildRatingOverrides());',
    '      const result = simulateBattle(team, enemyId, territories, rosters, teamUpgrades, buildRatingOverrides());'),
  reason: hook(5, 'DUPLICATE REASON: the earned second card explains why its owner cannot replace the queue',
    "    ? 'This team already has an upgrade waiting for its next battle. Save this one for later.' : null;",
    '    ? null : null;'),
  duplicate: hook(5, 'DUPLICATE CARD: using a second upgrade preserves the pending reward and first queued player',
    "    if (!canResolvePowerup('powerup_received') || !pendingPowerup || powerupUnavailableReason) return;",
    "    if (!canResolvePowerup('powerup_received') || !pendingPowerup) return;"),
  duplicatesave: hook(5, 'DUPLICATE SAVE: the blocked earned card can be saved without replacing the queue',
    '    finishPowerup();\n    setTeamSavedPowerups(prev => {', '    finishPowerup();\n    setTeamUpgrades({});\n    setTeamSavedPowerups(prev => {'),
  availableagain: hook(5, 'AVAILABLE AGAIN: after the owner battle its saved upgrade becomes usable',
    "  const powerupUnavailableReason = pendingPowerup?.powerup.id === 'upgrade' && teamUpgrades[pendingPowerup.teamId]",
    "  const powerupUnavailableReason = pendingPowerup?.powerup.id === 'upgrade' && (teamUpgrades[pendingPowerup.teamId] || battleUpgrades[pendingPowerup.teamId])"),
  rearm: hook(5, 'SAVED REARM: a saved earned upgrade can queue again after the prior one was consumed',
    '    setTeamSavedPowerups(prev => ({\n      ...prev,\n      [teamId]: prev[teamId].filter((_, i) => i !== index),\n    }));', ''),
  resetqueue: hook(6, 'RESET MAPS: a new run clears both upgrade lifetimes',
    '    setTeamUpgrades({});\n    setBattleUpgrades({});', '    setBattleUpgrades({});'),
  resetbattle: hook(6, 'RESET MAPS: a new run clears both upgrade lifetimes',
    '    setTeamUpgrades({});\n    setBattleUpgrades({});', '    setTeamUpgrades({});'),
  stalereset: hook(6, 'STALE RESET: a prior picker cannot restore an upgrade after reset',
    "    if (!canResolvePowerup('powerup_use', 'upgrade') || !powerupTeam || teamUpgrades[powerupTeam]) return;",
    '    if (!powerupTeam || teamUpgrades[powerupTeam]) return;'),
  unmount: hook(6, 'DISPOSED PICKER: an unmounted random choice cannot consume work or schedule callbacks',
    '  useEffect(() => () => {\n    freeAgencyTokenRef.current = null;\n    rewardActionTokenRef.current = null;\n  }, []);',
    '  useEffect(() => () => {\n    freeAgencyTokenRef.current = null;\n  }, []);'),
  partialclaim: hook(7, 'PARTIAL CLAIM: losing one territory does not clear a still-living owner queue',
    '    if (prevOwner && ownerStatesLeft === 0) {', '    if (prevOwner) {'),
  eliminated: hook(7, 'ELIMINATED QUEUE: the removed owner loses its queued upgrade while the other owner retains theirs',
    '      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== prevOwner)));', ''),
  surviving: hook(7, 'ELIMINATED QUEUE: the removed owner loses its queued upgrade while the other owner retains theirs',
    '      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== prevOwner)));', '      setTeamUpgrades({});'),
  bothonce: hook(8, 'BOTH ONCE: the two earned owners fight in one actual simulation despite a repeated start',
    "    if (rewardActionTokenRef.current !== rewardActionToken || phaseRef.current !== 'ready'\n      || pendingPowerup || powerupUseType) return;", ''),
  bothattack: hook(8, 'BOTH CALL: one real engine invocation receives both earned owner upgrades', select,
    '      const upgrades = Object.fromEntries(Object.entries(teamUpgrades).filter(([id]) => id === enemyId));'),
  bothdefend: hook(8, 'BOTH CALL: one real engine invocation receives both earned owner upgrades', select,
    '      const upgrades = Object.fromEntries(Object.entries(teamUpgrades).filter(([id]) => id === team));'),
  bothconsume: hook(8, 'BOTH CONSUME: both participating queues move into the same current battle snapshot', consume,
    '      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== team)));'),
  bothsettled: hook(8, 'BOTH SETTLED: both earned upgrades stay spent while the completed battle retains both cards',
    '  const skipSteal = useCallback(() => {', '  const skipSteal = useCallback(() => {\n    setTeamUpgrades(prev => ({ ...prev, ...battleUpgrades }));'),
  runtime: hook(0, null, 'export function useConquest() {', "export function useConquest() {\n  throw new Error('Unexpected NFL upgrades runtime control');"),
  backend: hook(0, null, 'export function useConquest() {',
    "import { supabase as nflUpgradeBackend } from '@/integrations/supabase/client';\ntry { void nflUpgradeBackend.auth; } catch {}\nexport function useConquest() {"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-upgrades-'));
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
  plugins: [{ name: 'isolated-nfl-upgrades-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '9/9 NFL upgrades cases green (7 real initial map, 2 declared initial-map fixtures)'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-upgrades-')) throw new Error('Refusing cleanup outside the unique NFL-upgrades temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL upgrades control files cleaned');
}
if (!success) process.exitCode = 1;
