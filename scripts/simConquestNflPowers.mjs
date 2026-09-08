/** Round 533: nine real NFL reward lifecycle cases, with seeded map/battle outcomes.
 * Only the earned power kind is controlled, after consuming its original draw.
 * Exact source mutations run in unique OS-temp copies. Only their named
 * AssertionError earns credit; runtime/caught-backend errors must reject.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquest.powers.test.tsx';
const FILES = { hook: 'src/hooks/useConquest.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_POWERS_CONTROL || '';
const CASES = [
  "makes one decision for an earned card across repeated use and save callbacks",
  "saves once and opens only one live saved card into its visible decision phase",
  "signs one canonical inactive player only from the current free-agent picker",
  "rejects invalid upgrade choices and applies the current roster choice once",
  "rejects invalid territory choices and records one power claim without a battle win",
  "preserves the optional random fallback for both valid power pickers",
  "cancels a picker back to its earned card without reviving earlier callbacks",
  "invalidates reward callbacks and pending highlight work on reset and unmount",
  "blocks new map turns during a received card picker or existing animation"
];
const CONTROLS = {
  "decision": {
    "file": "hook",
    "test": 0,
    "message": "DECISION: one earned card activates once and cannot also be saved",
    "from": "    return rewardActionTokenRef.current === rewardActionToken && phaseRef.current === expectedPhase",
    "to": "    return true"
  },
  "shield": {
    "file": "hook",
    "test": 0,
    "message": "DECISION: one earned card activates once and cannot also be saved",
    "from": "        setInvincibleTeams(prev => new Set([...prev, teamId]));",
    "to": ""
  },
  "save": {
    "file": "hook",
    "test": 1,
    "message": "SAVE ONCE: one earned card creates one saved entry",
    "from": "    finishPowerup();\n    setTeamSavedPowerups(prev => {",
    "to": "    setTeamSavedPowerups(prev => {"
  },
  "saved": {
    "file": "hook",
    "test": 1,
    "message": "SAVED OPEN: one click exposes one card and preserves the other saved reward",
    "from": "    if (rewardActionTokenRef.current !== rewardActionToken || phaseRef.current !== 'ready'\n      || pendingPowerup || powerupUseType || !getAliveTeamsFrom(territories).includes(teamId)) return;",
    "to": ""
  },
  "savedinput": {
    "file": "hook",
    "test": 1,
    "message": "SAVED INPUT: invalid owners or indices leave the inventory untouched",
    "from": "    if (!saved || !saved[index]) return;",
    "to": "    if (!saved) return;\n    index = Math.max(0, Math.floor(index));\n    if (!saved[index]) return;"
  },
  "received": {
    "file": "hook",
    "test": 1,
    "message": "SAVED OPEN: one click exposes one card and preserves the other saved reward",
    "from": "    setPendingPowerup({ teamId, powerup: POWERUPS.find(p => p.id === pu.id)! });\n    setPhase('powerup_received');",
    "to": "    setPendingPowerup({ teamId, powerup: POWERUPS.find(p => p.id === pu.id)! });\n    setPhase('ready');"
  },
  "owner": {
    "file": "hook",
    "test": 1,
    "message": "DEAD OWNER: an eliminated team cannot open its old saved reward",
    "from": "      || pendingPowerup || powerupUseType || !getAliveTeamsFrom(territories).includes(teamId)) return;",
    "to": "      || pendingPowerup || powerupUseType) return;"
  },
  "signphase": {
    "file": "hook",
    "test": 2,
    "message": "SIGN PHASE: a map animation cannot grant an unearned player",
    "from": "    if (!canResolvePowerup('powerup_use', 'free_agent') || !powerupTeam\n      || !freeAgentList.some(player => player.name === playerName)\n      || getAliveTeamsFrom(territories).some(id => (rosters[id] || []).includes(playerName))) return;\n    const teamId = powerupTeam;",
    "to": "    const teamId = powerupTeam || attackingTeam;\n    if (!teamId) return;"
  },
  "recipient": {
    "file": "hook",
    "test": 2,
    "message": "PICKER OWNER: the earned card remains attached to its recipient",
    "from": "        setFreeAgentList(buildFreeAgentList(teamId));\n        setPowerupTeam(teamId);",
    "to": "        setFreeAgentList(buildFreeAgentList(teamId));\n        setPowerupTeam(teamId === 'BUF' ? 'KC' : 'BUF');"
  },
  "pendingcard": {
    "file": "hook",
    "test": 2,
    "message": "PICKER OWNER: the earned card remains attached to its recipient",
    "from": "      case 'free_agent':\n        setFreeAgentList(buildFreeAgentList(teamId));",
    "to": "      case 'free_agent':\n        setPendingPowerup(null);\n        setFreeAgentList(buildFreeAgentList(teamId));"
  },
  "canonical": {
    "file": "hook",
    "test": 2,
    "message": "CANONICAL SIGN: unknown and already-active names preserve the open reward",
    "from": "      || !freeAgentList.some(player => player.name === playerName)\n",
    "to": ""
  },
  "signonce": {
    "file": "hook",
    "test": 2,
    "message": "SIGN ONCE: the canonical offer joins its recipient exactly once",
    "from": "    return rewardActionTokenRef.current === rewardActionToken && phaseRef.current === expectedPhase",
    "to": "    return true"
  },
  "upgradename": {
    "file": "hook",
    "test": 3,
    "message": "UPGRADE INPUT: invalid names and other power actions preserve the picker",
    "from": "    if (playerName !== undefined && !roster.includes(playerName)) return;",
    "to": ""
  },
  "type": {
    "file": "hook",
    "test": 3,
    "message": "UPGRADE INPUT: invalid names and other power actions preserve the picker",
    "from": "      && (!type || (powerupUseType === type && pendingPowerup.powerup.id === type\n        && powerupTeam === pendingPowerup.teamId));",
    "to": "      && true;"
  },
  "upgradeonce": {
    "file": "hook",
    "test": 3,
    "message": "UPGRADE ONCE: one roster choice creates one owned upgrade",
    "from": "    return rewardActionTokenRef.current === rewardActionToken && phaseRef.current === expectedPhase",
    "to": "    return true"
  },
  "upgradetarget": {
    "file": "hook",
    "test": 3,
    "message": "UPGRADE ONCE: one roster choice creates one owned upgrade",
    "from": "    setTeamUpgrades(prev => ({ ...prev, [powerupTeam]: player }));",
    "to": "    setTeamUpgrades({});"
  },
  "territoryname": {
    "file": "hook",
    "test": 4,
    "message": "TERRITORY INPUT: an invalid explicit state preserves the picker",
    "from": "    if (stateId !== undefined && !candidates.includes(stateId)) return;",
    "to": ""
  },
  "territoryonce": {
    "file": "hook",
    "test": 4,
    "message": "TERRITORY ONCE: one valid choice claims one state and resolves immediately",
    "from": "    return rewardActionTokenRef.current === rewardActionToken && phaseRef.current === expectedPhase",
    "to": "    return true"
  },
  "claimlog": {
    "file": "hook",
    "test": 4,
    "message": "POWER CLAIM: stealing a state does not invent a battle win",
    "from": "      turn: prev.length + 1, attacker: teamId, defender: 'powerup',\n      winner: teamId, score: `🗺️ Stole",
    "to": "      turn: prev.length + 1, attacker: teamId, defender: prevOwner || 'neutral',\n      winner: teamId, score: `🗺️ Stole"
  },
  "highlight": {
    "file": "hook",
    "test": 4,
    "message": "HIGHLIGHT: the completed claim highlight clears",
    "from": "    addTimeout(() => setTerritoryStolenState(null), 1500);",
    "to": ""
  },
  "highlightphase": {
    "file": "hook",
    "test": 4,
    "message": "HIGHLIGHT PHASE: delayed cleanup cannot dismiss the next earned card",
    "from": "    addTimeout(() => setTerritoryStolenState(null), 1500);",
    "to": "    addTimeout(() => { setTerritoryStolenState(null); setPhase('ready'); }, 1500);"
  },
  "randomupgrade": {
    "file": "hook",
    "test": 5,
    "message": "RANDOM UPGRADE: omitted input chooses a real current roster player",
    "from": "    const player = playerName ?? roster[Math.floor(Math.random() * roster.length)];",
    "to": "    const player = playerName ?? 'Synthetic absent random player';"
  },
  "randomterritory": {
    "file": "hook",
    "test": 5,
    "message": "RANDOM TERRITORY: omitted input chooses a real current border enemy",
    "from": "    const chosen = stateId ?? candidates[Math.floor(Math.random() * candidates.length)];",
    "to": "    const chosen = stateId ?? 'Synthetic absent random state';"
  },
  "cancel": {
    "file": "hook",
    "test": 6,
    "message": "CANCEL CARD: cancellation preserves the reward and closes the picker",
    "from": "  const cancelPowerupUse = useCallback(() => {",
    "to": "  const cancelPowerupUse = useCallback(() => {\n    setPendingPowerup(null);"
  },
  "stale": {
    "file": "hook",
    "test": 6,
    "message": "CANCEL STALE: returning to a card does not revive its earlier use or picker callbacks",
    "from": "  const rewardActionToken = {};",
    "to": "  const rewardActionToken = useRef({}).current;"
  },
  "reset": {
    "file": "hook",
    "test": 7,
    "message": "RESET CARD: old earned-card callbacks cannot alter a fresh run",
    "from": "    return rewardActionTokenRef.current === rewardActionToken && phaseRef.current === expectedPhase",
    "to": "    return true"
  },
  "resetpicker": {
    "file": "hook",
    "test": 7,
    "message": "RESET PICKER: old target choices and delayed highlight work cannot alter a fresh run",
    "from": "    if (!canResolvePowerup('powerup_use', 'territory_steal') || !powerupTeam) return;",
    "to": "    if (!powerupTeam) return;"
  },
  "unmount": {
    "file": "hook",
    "test": 7,
    "message": "UNMOUNT: disposed random choices stop before consuming RNG or scheduling work",
    "from": "  useEffect(() => () => {\n    freeAgencyTokenRef.current = null;\n    rewardActionTokenRef.current = null;\n    pendingBattleApplyRef.current = null;\n  }, []);",
    "to": "  useEffect(() => () => {\n    freeAgencyTokenRef.current = null;\n    pendingBattleApplyRef.current = null;\n  }, []);"
  },
  "startcard": {
    "file": "hook",
    "test": 8,
    "message": "START CARD: an unresolved earned card blocks the next map turn",
    "from": "    if (rewardActionTokenRef.current !== rewardActionToken || phaseRef.current !== 'ready'\n      || pendingPowerup || powerupUseType) return;",
    "to": ""
  },
  "startpicker": {
    "file": "hook",
    "test": 8,
    "message": "START PICKER: an unresolved target picker blocks the next map turn",
    "from": "    if (rewardActionTokenRef.current !== rewardActionToken || phaseRef.current !== 'ready'\n      || pendingPowerup || powerupUseType) return;",
    "to": "    if (phaseRef.current === 'powerup_received') return;"
  },
  "startanimation": {
    "file": "hook",
    "test": 8,
    "message": "START ANIMATION: a second start cannot replace an in-flight map turn",
    "from": "    if (rewardActionTokenRef.current !== rewardActionToken || phaseRef.current !== 'ready'\n      || pendingPowerup || powerupUseType) return;",
    "to": "    if (rewardActionTokenRef.current !== rewardActionToken || pendingPowerup || powerupUseType) return;"
  },
  "runtime": {
    "file": "hook",
    "test": 0,
    "message": null,
    "from": "export function useConquest() {",
    "to": "export function useConquest() {\n  throw new Error('Unexpected NFL powers runtime control');"
  },
  "backend": {
    "file": "hook",
    "test": 0,
    "message": null,
    "from": "export function useConquest() {",
    "to": "import { supabase as nflPowerBackend } from '@/integrations/supabase/client';\ntry { void nflPowerBackend.auth; } catch {}\nexport function useConquest() {"
  },
  "starthighlight": {
    "file": "hook",
    "test": 4,
    "message": "START HIGHLIGHT: the next map turn clears the canceled claim highlight",
    "from": "    clearTimeouts();\n    setNoEnemyMsg(null);\n    setTerritoryStolenState(null);",
    "to": "    clearTimeouts();\n    setNoEnemyMsg(null);"
  },
  "nextmap": {
    "file": "hook",
    "test": 4,
    "message": "NEXT MAP: the next real turn retains its animation phase",
    "from": "    setPhase('animating');",
    "to": "    setPhase('ready');"
  },
  "crossaction": {
    "file": "hook",
    "test": 8,
    "message": "CROSS ACTION: a docked signing invalidates a same-tick start using its old roster",
    "from": "    freeAgencyTokenRef.current = null;\n    rewardActionTokenRef.current = null;\n    setRosters(prev => ({",
    "to": "    freeAgencyTokenRef.current = null;\n    setRosters(prev => ({"
  }
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-powers-'));
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
  plugins: [{ name: 'isolated-nfl-powers-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '9/9 real NFL powers cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-powers-')) throw new Error('Refusing cleanup outside the unique NFL-powers temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL powers control files cleaned');
}
if (!success) process.exitCode = 1;
