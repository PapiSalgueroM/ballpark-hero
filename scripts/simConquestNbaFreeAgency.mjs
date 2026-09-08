/** Round 530: actual NBA hook, map, rosters, and seeded battle outcomes.
 * Only reward selection is controlled for earned upgrade/legend scenarios.
 * SIM_CONQUEST_NBA_FREE_AGENCY_CONTROL selects one exact source mutation in a
 * unique OS-temp copy. Only its named AssertionError earns expected-red credit;
 * runtime and caught-backend probes must exit 1. No production data, src, dist,
 * or storage is rewritten.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquestNba.freeAgency.test.tsx';
const FILES = { hook: 'src/hooks/useConquestNba.ts' };
const CONTROL = process.env.SIM_CONQUEST_NBA_FREE_AGENCY_CONTROL || '';
const CASES = [
  'selects only living favorites between resolved battles',
  'offers only canonical candidates absent from every active roster',
  'unlocks exactly after three settled battles and counts no reward actions',
  'signs once with one rating bump and never revives a spent callback',
  'invalidates old signing callbacks on team change reset and unmount',
  'keeps a highly rated acquired player when replacing the actual weakest player',
  'returns a released candidate to the pool and allows a later signing',
  'preserves an activated legend when choosing the weakest roster player',
  'clears a queued upgrade when signing waives its selected player',
];
const hook = (test, message, from, to) => ({ file: 'hook', test, message, from, to });
const rating = `    let weakestName = roster[0];
    let weakestOvr = getNbaRosterPlayer(roster[0], favoriteTeam, legendPlayers)?.overall ?? 75;
    for (const name of roster) {
      const ovr = getNbaRosterPlayer(name, favoriteTeam, legendPlayers)?.overall ?? 75;
      if (ovr < weakestOvr) { weakestOvr = ovr; weakestName = name; }
    }`;
const oldRating = `    const playerMap = new Map((NBA_TEAM_MAP.get(favoriteTeam)?.players || []).map(player => [player.name, player]));
    let weakestName = roster[0];
    let weakestOvr = playerMap.get(roster[0])?.overall ?? 75;
    for (const name of roster) {
      const ovr = playerMap.get(name)?.overall ?? 75;
      if (ovr < weakestOvr) { weakestOvr = ovr; weakestName = name; }
    }`;
const CONTROLS = {
  favorite: hook(0, 'FAVORITE: invalid teams cannot replace a living selection',
    "      || teamId === favoriteTeam || !getAliveTeamsFrom(territories).includes(teamId)) return;", "      || teamId === favoriteTeam) return;"),
  favoritephase: hook(0, 'PHASE: active battles reject team changes and signings',
    "    if (freeAgencyTokenRef.current !== freeAgencyToken || phaseRef.current !== 'ready'\n      || teamId", "    if (freeAgencyTokenRef.current !== freeAgencyToken\n      || teamId"),
  lostfavorite: hook(0, 'LOST FAVORITE: an eliminated recipient cannot use a replenished signing',
    '    if (!getAliveTeamsFrom(territories).includes(favoriteTeam)) return false;', ''),
  canonical: hook(1, 'CANONICAL: unknown candidates cannot spend a signing',
    '    const available = availableFreeAgencyCandidates.find(player => player.name === candidate.name);',
    '    const available = availableFreeAgencyCandidates.find(player => player.name === candidate.name) || candidate;'),
  pool: hook(1, 'POOL: every active roster removes its players from the advertised pool',
    '  const availableFreeAgencyCandidates = CONQUEST_FREE_AGENCY_POOL_NBA.filter(candidate => !activeRosterNames.has(candidate.name));',
    '  const availableFreeAgencyCandidates = CONQUEST_FREE_AGENCY_POOL_NBA;'),
  cooldown: hook(2, 'COOLDOWN: fewer than three settled battles cannot unlock signing',
    'const FREE_AGENCY_SIGN_COOLDOWN = 3;', 'const FREE_AGENCY_SIGN_COOLDOWN = 2;'),
  settled: hook(2, 'SETTLED: one completed battle adds one cooldown step despite replayed settlement',
    '    setConquestsSinceSign(prev => prev + 1);', '    setConquestsSinceSign(prev => prev + 2);'),
  signphase: hook(2, 'REWARD PHASE: unresolved rewards block signing and team changes',
    "    if (freeAgencyTokenRef.current !== freeAgencyToken || phaseRef.current !== 'ready' || !favoriteTeam) return false;",
    '    if (freeAgencyTokenRef.current !== freeAgencyToken || !favoriteTeam) return false;'),
  readytransition: hook(2, 'READY TRANSITION: resolving a reward cannot revive its earlier signing callback',
    '  const setPhase = useCallback((next: Phase) => {\n    freeAgencyTokenRef.current = null;',
    '  const setPhase = useCallback((next: Phase) => {'),
  consume: hook(3, 'ONCE: repeated same-tick signing adds one player and one audit entry',
    '    freeAgencyTokenRef.current = null;\n    setRosters(prev => ({', '    setRosters(prev => ({'),
  bump: hook(3, 'BUMP: one accepted signing adds exactly two rating points',
    'const FREE_AGENCY_SIGN_BUMP = 2;', 'const FREE_AGENCY_SIGN_BUMP = 0;'),
  stale: hook(3, 'STALE COOLDOWN: a spent callback cannot revive after three more battles',
    '  const freeAgencyToken = {};', '  const freeAgencyToken = useRef({}).current;'),
  teamtoken: hook(4, 'TEAM TOKEN: selecting another team invalidates a same-tick old signing',
    '    freeAgencyTokenRef.current = null;\n    setFavoriteTeamState(teamId);', '    setFavoriteTeamState(teamId);'),
  reset: hook(4, 'RESET: reset invalidates same-tick signing work',
    '    setFavoriteTeamState(null);', ''),
  unmount: hook(4, 'UNMOUNT: disposed callbacks reject before inspecting a candidate',
    '  useEffect(() => () => { freeAgencyTokenRef.current = null; }, []);', ''),
  metadata: hook(5, 'ACQUIRED RATING: the 94-rated recruit stays while the original 77-rated player is waived', rating, oldRating),
  released: hook(6, 'RELEASED: a waived candidate returns despite signing history',
    '  const availableFreeAgencyCandidates = CONQUEST_FREE_AGENCY_POOL_NBA.filter(candidate => !activeRosterNames.has(candidate.name));',
    '  const availableFreeAgencyCandidates = CONQUEST_FREE_AGENCY_POOL_NBA.filter(candidate => !activeRosterNames.has(candidate.name) && !signedFreeAgents.includes(candidate.name));'),
  legend: hook(7, 'LEGEND RATING: an activated 99-rated legend cannot be mistaken for an unknown weak player', rating, oldRating),
  upgrade: hook(8, 'WAIVED UPGRADE: replacing the selected player clears its queued upgrade',
    '    setTeamUpgrades(prev => prev[favoriteTeam] === weakestName\n      ? Object.fromEntries(Object.entries(prev).filter(([id]) => id !== favoriteTeam)) : prev);', ''),
  cooldownreset: hook(3, 'ONCE: repeated same-tick signing adds one player and one audit entry',
    '    setConquestsSinceSign(0);\n    setSignedFreeAgents(prev => [...prev, available.name]);', '    setConquestsSinceSign(1);\n    setSignedFreeAgents(prev => [...prev, available.name]);'),
  runtime: hook(0, null, 'export function useConquestNba() {', "export function useConquestNba() {\n  throw new Error('Unexpected NBA free-agency runtime control');"),
  backend: hook(0, null, 'export function useConquestNba() {',
    "import { supabase as freeAgencyBackendProbe } from '@/integrations/supabase/client';\nexport function useConquestNba() {\n  try { void freeAgencyBackendProbe.auth; } catch {}"),
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nba-free-agency-'));
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
  plugins: [{ name: 'isolated-nba-free-agency-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${control ? '1 exact controlled failure' : '9/9 real NBA free-agency cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nba-free-agency-')) throw new Error('Refusing cleanup outside the unique NBA-free-agency temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NBA free-agency control files cleaned');
}
if (!success) process.exitCode = 1;
