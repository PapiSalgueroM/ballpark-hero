/** Round 536: real original-map NFL steal decisions and settlement outcomes.
 * Checked OS-temp source controls earn only their exact named AssertionError.
 * Runtime and caught-backend faults must reject with exit 1.
 * Winner-name rejection is measured on disjoint rosters; this does not claim an
 * independent witness for the redundant winner-absence or phase-only guards.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquest.steal.test.tsx';
const FILES = { hook: 'src/hooks/useConquest.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_STEAL_CONTROL || '';
const CASES = [
 'rejects unknown and non-loser names while preserving a legal retry',
 'settles a direct legal choice after the confirmation delay with the real score',
 'installs an actionable decision after the entire natural play reveal',
 'consumes repeated choices once without letting Skip to Result revive them',
 'shares one decision between steal and skip in either action order',
 'preserves the pending decision across closing and reopening the picker',
 'rejects captured callbacks when another real battle has a pending decision',
 'cancels pending confirmation on reset and never revives the prior run',
 'cancels confirmation work and rejects retained actions after unmount',
];
const hook = (test, message, from, to) => ({ file: 'hook', test, message, from, to });
const membership = `  const canStealPlayer = useCallback((playerName: string) => canResolveBattle()
    && (rosters[pendingBattleApply!.result.loser] || []).includes(playerName)
    && !(rosters[pendingBattleApply!.result.winner] || []).includes(playerName),`;
const stealGuard = '    if (!canStealPlayer(playerName)) return;';
const consumeSteal = '    const result = pending.result;\n    pendingBattleApplyRef.current = null;';
const stealTimer = '    // Brief confirmation animation, then apply\n    addTimeout(() => {';
const settle = '      applyBattleResult(pending.attacker, pending.defender, result, playerName);';
const skipSettle = '    applyBattleResult(pending.attacker, pending.defender, pending.result);';
const open = `  const openStealModal = useCallback(() => {
    if (!canResolveBattle()) return;
    setStealModalOpen(true);`;
const close = `  const closeStealModal = useCallback(() => {
    if (!canResolveBattle()) return;
    setStealModalOpen(false);`;
const skip = `    const pending = pendingBattleApply!;
    pendingBattleApplyRef.current = null;
    setStealModalOpen(false);
    applyBattleResult(pending.attacker, pending.defender, pending.result);`;
const CONTROLS = {
 eligibility: hook(0, 'ELIGIBILITY: only a current losing-roster player is offered', membership,
  '  const canStealPlayer = useCallback((playerName: string) => canResolveBattle(),'),
 invalid: hook(0, 'INVALID: an ineligible input changes no state and schedules no confirmation', stealGuard, ''),
 retry: hook(0, 'RETRY: one actual score log turn and cooldown settle', stealGuard,
  '    if (!canStealPlayer(playerName)) { pendingBattleApplyRef.current = null; return; }'),
 skipinstall: hook(1, 'SKIP INSTALL: Skip to Result creates an actionable decision without opening a modal',
  '    setPendingBattleApply({ attacker: team, defender: enemyId, result });\n  }, [clearTimeouts]);',
  '    setPendingBattleApplyState({ attacker: team, defender: enemyId, result });\n  }, [clearTimeouts]);'),
 confirm: hook(1, 'CONFIRM LOCK: an accepted transfer immediately closes every settlement action',
  '    stealActionReady: canResolveBattle(), canStealPlayer, canSkipSteal: canResolveBattle(),',
  '    stealActionReady: true, canStealPlayer, canSkipSteal: true,'),
 delay: hook(1, 'DELAY: the real roster and result remain unchanged until 1200 milliseconds',
  '    }, 1200);\n  }, [canStealPlayer, pendingBattleApply, applyBattleResult]);',
  '    }, 0);\n  }, [canStealPlayer, pendingBattleApply, applyBattleResult]);'),
 loser: hook(1, 'TRANSFER: one legal player moves from loser to winner while an away loss keeps territory',
  '        next[result.loser] = (next[result.loser] || []).filter(p => p !== playerName);', ''),
 winner: hook(1, 'TRANSFER: one legal player moves from loser to winner while an away loss keeps territory',
  '        next[result.winner] = [...(next[result.winner] || []), playerName];', ''),
 score: hook(1, 'DIRECT: one actual score log turn and cooldown settle', settle,
  '      applyBattleResult(pending.attacker, pending.defender, { ...result, winScore: result.winScore + 7 }, playerName);'),
 log: hook(1, 'DIRECT: one actual score log turn and cooldown settle', settle,
  '      applyBattleResult(pending.attacker, pending.defender, result);'),
 ranking: hook(1, 'DIRECT: one actual score log turn and cooldown settle',
  '    applyPowerRankUpdate(result.winner, result.loser);', ''),
 clear: hook(1, 'CLEAR: completed confirmation leaves a clean ready state',
  '      setPendingBattleApply(null);\n      setPlayerConfirmed(null);',
  '      setPendingBattleApply(null);'),
 naturalinstall: hook(2, 'NATURAL INSTALL: finishing the real reveal creates an actionable final decision',
  '          setPendingBattleApply({ attacker: team, defender: enemyId, result });',
  '          setPendingBattleApplyState({ attacker: team, defender: enemyId, result });'),
 once: hook(3, 'ONCE: repeated and refreshed callbacks move one player and settle exactly once', consumeSteal,
  '    const result = pending.result;'),
 replay: hook(3, 'REPLAY: a completed decision cannot schedule another transfer', stealGuard,
  "    if (!canStealPlayer(playerName) && phaseRef.current === 'battle') return;"),
 racesteal: hook(4, 'RACE: the first accepted action alone transfers or skips and settles once', consumeSteal,
  '    const result = pending.result;'),
 raceskip: hook(4, 'RACE: the first accepted action alone transfers or skips and settles once', skipSettle,
  skipSettle + '\n' + skipSettle),
 idle: hook(5, 'IDLE: picker actions before a battle leave the game idle', open,
  '  const openStealModal = useCallback(() => {\n    setStealModalOpen(true);'),
 open: hook(5, 'OPEN: an actionable decision opens its picker', open, open.replace('setStealModalOpen(true)', 'setStealModalOpen(false)')),
 close: hook(5, 'CLOSE: closing the picker preserves the unsettled decision', close, close.replace('    setStealModalOpen(false);', '')),
 skipclear: hook(5, 'SKIP CLEAR: skipping a nonempty roster closes and clears the picker', skip, skip.replace('    setStealModalOpen(false);\n', '')),
 stale: hook(6, 'STALE: callbacks from the previous battle cannot touch the current decision',
  '    && !!pendingBattleApply && pendingBattleApplyRef.current === pendingBattleApply',
  '    && !!pendingBattleApply && !!pendingBattleApplyRef.current'),
 fresh: hook(6, 'FRESH: the current callback still settles its real battle once',
  '  const skipSteal = useCallback(() => {\n    if (!canResolveBattle()) return;',
  '  const skipSteal = useCallback(() => {\n    if (!canResolveBattle() || turn > 0) return;'),
 resettimer: hook(7, 'RESET TIMER: resetting cancels the actual confirmation timer', stealTimer, stealTimer.replace('addTimeout', 'setTimeout')),
 unmounttimer: hook(8, 'UNMOUNT TIMER: no retired confirmation timer remains or fires', stealTimer, stealTimer.replace('addTimeout', 'setTimeout')),
 unmountaction: hook(8, 'UNMOUNT ACTION: retained unsettled actions cannot schedule work after disposal',
  '    rewardActionTokenRef.current = null;\n    pendingBattleApplyRef.current = null;\n  }, []);',
  '    rewardActionTokenRef.current = null;\n  }, []);'),
 runtime: hook(0, null, 'export function useConquest() {', "export function useConquest() {\n  throw new Error('Unexpected NFL steal runtime control');"),
 backend: hook(0, null, 'export function useConquest() {',
  "import { supabase as nflStealBackend } from '@/integrations/supabase/client';\ntry { void nflStealBackend.auth; } catch {}\nexport function useConquest() {"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-steal-'));
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
  plugins: [{ name: 'isolated-nfl-steal-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '9/9 NFL steal cases green (original map, real battles)'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-steal-')) throw new Error('Refusing cleanup outside the unique NFL-steal temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL steal control files cleaned');
}
if (!success) process.exitCode = 1;
