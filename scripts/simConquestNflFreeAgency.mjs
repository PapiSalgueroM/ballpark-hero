/** Round 531: actual NFL map, rosters, hook and seeded battle outcomes.
 * Only the kind of randomly earned neutral-region reward is controlled.
 * Each control changes one exact source anchor in a unique OS-temp copy.
 * Only its named AssertionError earns credit; runtime/backend must exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquest.freeAgency.test.tsx';
const FILES = { hook: 'src/hooks/useConquest.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_FREE_AGENCY_CONTROL || '';
const CASES = [
  'selects only living favorites and allows clearing or replacing the selection',
  'accepts only the current dynamic pool and preserves a valid retry',
  'unlocks after exactly three settled battles and blocks unresolved turns',
  'signs once with one rating bump and never revives a spent callback',
  'invalidates old callbacks on team changes reset and unmount',
  'uses shipped acquired-player ratings instead of caller supplied metadata',
  'returns a waived curated candidate to the current pool',
  'blocks signing while a saved reward is reopened for a decision',
  'clears only the queued upgrade of the player being waived',
];
const hook = (test, message, from, to) => ({ file: 'hook', test, message, from, to });
const CONTROLS = {
  favorite: hook(0, 'FAVORITE: unknown teams cannot replace the selected recipient',
    '      || (teamId !== null && !getAliveTeamsFrom(territories).includes(teamId))) return;', '      || false) return;'),
  clear: hook(0, 'CLEAR: clearing the selection disables signing without spending the cooldown',
    '    setFavoriteTeamState(teamId);', '    setFavoriteTeamState(teamId || favoriteTeam);'),
  lostfavorite: hook(0, 'LOST FAVORITE: an eliminated recipient cannot spend a signing',
    '    if (!getAliveTeamsFrom(territories).includes(favoriteTeam)) return false;', ''),
  dynamic: hook(1, 'DYNAMIC POOL: eliminated final rosters join curated players without active names or duplicates',
    '    const seen = new Set(pool.map(x => x.name));\n\n    for (const elimId of eliminated) {',
    '    const seen = new Set(pool.map(x => x.name));\n\n    for (const elimId of [] as string[]) {'),
  canonical: hook(1, 'CANONICAL: unknown candidates cannot spend the signing',
    '    const available = freeAgencyPool().find(player => player.name === candidate.name);',
    '    const available = freeAgencyPool().find(player => player.name === candidate.name) || candidate;'),
  occupied: hook(1, 'POOL SIGN: an eligible eliminated player joins once and leaves the available pool',
    "      const teamName = TEAM_MAP.get(elimId)?.name || elimId;\n      for (const name of (rosters[elimId] || [])) {\n        if (activeRosterNames.has(name) || seen.has(name)) continue;",
    "      const teamName = TEAM_MAP.get(elimId)?.name || elimId;\n      for (const name of (rosters[elimId] || [])) {\n        if (seen.has(name)) continue;"),
  cooldown: hook(2, 'COOLDOWN: fewer than three settled battles cannot unlock signing',
    'const FREE_AGENCY_SIGN_COOLDOWN = 3;', 'const FREE_AGENCY_SIGN_COOLDOWN = 2;'),
  settled: hook(2, 'SETTLED: one completed battle adds one cooldown step',
    '    setConquestsSinceSign(prev => prev + 1);', '    setConquestsSinceSign(prev => prev + 2);'),
  phase: hook(2, 'START TOKEN: starting a turn invalidates a same-tick signing callback',
    "    if (freeAgencyTokenRef.current !== freeAgencyToken || phaseRef.current !== 'ready'\n      || !freeAgencyActionReady || !favoriteTeam) return false;", '    if (!favoriteTeam) return false;'),
  consume: hook(3, 'ONCE: same-tick signing replaces one player and records one transaction',
    '    freeAgencyTokenRef.current = null;\n    rewardActionTokenRef.current = null;\n    setRosters(prev => ({', '    rewardActionTokenRef.current = null;\n    setRosters(prev => ({'),
  bump: hook(3, 'BUMP: one accepted signing adds exactly two rating points',
    'const FREE_AGENCY_SIGN_BUMP = 2;', 'const FREE_AGENCY_SIGN_BUMP = 0;'),
  stale: hook(3, 'STALE: a spent callback cannot revive after three more battles',
    '  const freeAgencyToken = {};', '  const freeAgencyToken = useRef({}).current;'),
  teamtoken: hook(4, 'TEAM TOKEN: a same-tick team change invalidates the prior signing',
    '    freeAgencyTokenRef.current = null;\n    setFavoriteTeamState(teamId);', '    setFavoriteTeamState(teamId);'),
  reset: hook(4, 'RESET: reset rejects old signing work and clears the transaction state', '    setFavoriteTeamState(null);', ''),
  unmount: hook(4, 'UNMOUNT: disposed callbacks reject before reading the candidate',
    '  useEffect(() => () => {\n    freeAgencyTokenRef.current = null;\n    rewardActionTokenRef.current = null;\n  }, []);', '  useEffect(() => () => {\n    rewardActionTokenRef.current = null;\n  }, []);'),
  metadata: hook(5, 'ACQUIRED: canonical global metadata keeps the strong recruit and waives the actual weakest player',
    '      const ovr = getNflRosterPlayer(name, favoriteTeam)?.overall ?? 75;', '      const ovr = TEAM_MAP.get(favoriteTeam)?.players?.find(player => player.name === name)?.overall ?? 75;'),
  released: hook(6, 'RELEASED: signing history does not hide a candidate who was waived',
    '    const pool: ConquestFreeAgentCandidate[] = CONQUEST_FREE_AGENCY_POOL.filter(c => !activeRosterNames.has(c.name));',
    '    const pool: ConquestFreeAgentCandidate[] = CONQUEST_FREE_AGENCY_POOL.filter(c => !activeRosterNames.has(c.name) && !signedFreeAgents.includes(c.name));'),
  savedtoken: hook(7, 'SAVED CARD: reopening a saved card displays its decision before further signing',
    "    setPendingPowerup({ teamId, powerup: POWERUPS.find(p => p.id === pu.id)! });\n    setPhase('powerup_received');", "    setPendingPowerup({ teamId, powerup: POWERUPS.find(p => p.id === pu.id)! });\n    setPhase('ready');"),
  pending: hook(7, 'PENDING: a received power card blocks both docked actions',
    "  const freeAgencyActionReady = phase === 'ready' && !pendingPowerup && !powerupUseType;", "  const freeAgencyActionReady = phase === 'ready' || phase === 'powerup_received';"),
  neutral: hook(7, 'NEUTRAL: neutral claims do not advance the signing cooldown',
    '      const claimState = () => {\n        setTerritories(prev => ({ ...prev, [stateId]: team }));',
    '      const claimState = () => {\n        setConquestsSinceSign(prev => prev + 1);\n        setTerritories(prev => ({ ...prev, [stateId]: team }));'),
  upgrade: hook(8, 'WAIVED UPGRADE: the outgoing player loses its queued upgrade',
    '    if (upgradeActiveTeam === favoriteTeam && upgradedPlayer === weakestName) {\n      setUpgradeActiveTeam(null);\n      setUpgradedPlayer(null);\n    }', ''),
  keptupgrade: hook(8, 'KEPT UPGRADE: a retained player keeps its queued upgrade',
    '    if (upgradeActiveTeam === favoriteTeam && upgradedPlayer === weakestName) {', '    if (upgradeActiveTeam === favoriteTeam) {'),
  cooldownreset: hook(3, 'ONCE: same-tick signing replaces one player and records one transaction',
    '    setConquestsSinceSign(0);\n    setSignedFreeAgents(prev => [...prev, available.name]);', '    setConquestsSinceSign(1);\n    setSignedFreeAgents(prev => [...prev, available.name]);'),
  runtime: hook(0, null, 'export function useConquest() {', "export function useConquest() {\n  throw new Error('Unexpected NFL free-agency runtime control');"),
  backend: hook(0, null, 'export function useConquest() {',
    "import { supabase as nflFreeAgencyBackendProbe } from '@/integrations/supabase/client';\nexport function useConquest() {\n  try { void nflFreeAgencyBackendProbe.auth; } catch {}"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-free-agency-'));
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
  plugins: [{ name: 'isolated-nfl-free-agency-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '9/9 real NFL free-agency cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-free-agency-')) throw new Error('Refusing cleanup outside the unique NFL-free-agency temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL free-agency control files cleaned');
}
if (!success) process.exitCode = 1;
