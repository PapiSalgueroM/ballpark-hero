/** Round 531: real NFL free-agency panel and guide with a controlled hook fixture.
 * simConquestNflFreeAgency covers real battles and signing effects. Each control
 * changes one exact source anchor in a unique OS-temp copy and requires exact
 * AssertionErrors, with every other case green. Runtime must reject with exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoard.freeAgency.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoard.tsx';
const HELP = 'src/components/conquest/ConquestHowToPlay.tsx';
const CONTROL = process.env.SIM_NFL_FREE_AGENCY_UI_CONTROL || '';
const LABELS = ['animating', 'battle', 'steal', 'gameover', 'pending power', 'power picker'];
const CASES = [
  ['offers only surviving teams before choosing a favorite', 'ALIVE: picker offers only surviving teams'],
  ['preserves the favorite badge and Change team flow', 'CHANGE: Change team clears the favorite'],
  ['recovers an eliminated favorite through Change team', 'ELIMINATED: a visible notice and Change team offer recovery'],
  ...LABELS.map(label => [`locks all signing controls for ${label}`, `LOCK: ${label} disables Change and Sign`]),
  ['shows remaining settled battles without enabling an early signing', 'COOLDOWN: remaining settled battles keep signing disabled'],
  ['honors hook denial even when the visible cooldown is clear', 'HOOK GATE: the guarded hook retains final signing eligibility'],
  ['offers the dynamic pool and signs the selected entry for its recipient', 'CANDIDATES: only the supplied pool is offered with its recipient'],
  ['keeps Change team usable when the pool is empty', 'EMPTY: no stale candidates and an active Change team remain'],
  ['explains the signing cost and shared cooldown in the guide', 'HELP: guide explains waiver, capped bonus and the shared three-battle cooldown'],
];
const expected = (...indices) => Object.fromEntries(indices.map(index => [index, CASES[index][1]]));
const boundaries = (...indices) => Object.fromEntries(indices.map(index => [index, 'BOUNDARY: no backend, transport or browser storage writes']));
const boardBoundaries = boundaries(...Array.from({ length: 13 }, (_, index) => index));
const entry = 'export default function ConquestBoard() {';
const CONTROLS = {
  alive: { from: 'NFL_TEAMS.filter(t => aliveIds.includes(t.id)).map', to: 'NFL_TEAMS.map', errors: expected(0) },
  pick: { from: 'onChange={(e) => { if (e.target.value) setFavoriteTeam(e.target.value); }}', to: 'onChange={() => {}}', errors: { 0: 'PICK: selector dispatches the chosen favorite' } },
  badge: { from: '{favTeam ? `${favTeam.city} ${favTeam.name}` : favoriteTeam}', to: '{favoriteTeam}', errors: { 1: 'BADGE: chosen favorite retains the compact team badge' } },
  change: { from: 'onClick={() => setFavoriteTeam(null)}', to: 'onClick={() => {}}', errors: expected(1) },
  eliminated: { from: '  const favoriteEliminated = !!favoriteTeam && !aliveIds.includes(favoriteTeam);', to: '  const favoriteEliminated = false;', errors: expected(2) },
  eliminatedsign: { from: '&& !favoriteEliminated && freeAgencyCooldownRemaining', to: '&& freeAgencyCooldownRemaining', errors: expected(2) },
  signready: { from: '  const canSign = actionReady && !!favoriteTeam', to: '  const canSign = !!favoriteTeam', errors: expected(3, 4, 5, 6, 7, 8) },
  changeready: { from: '                onClick={() => setFavoriteTeam(null)}\n                disabled={!actionReady}', to: '                onClick={() => setFavoriteTeam(null)}\n                disabled={false}', errors: expected(3, 4, 5, 6, 7, 8) },
  selectorready: { from: '              defaultValue=""\n              disabled={!actionReady}', to: '              defaultValue=""\n              disabled={false}', errors: Object.fromEntries(LABELS.map((label, index) => [index + 3, `SELECT LOCK: ${label} disables the team picker`])) },
  cooldown: { from: '&& freeAgencyCooldownRemaining === 0 && canSignFreeAgent()', to: '&& canSignFreeAgent()', errors: expected(9) },
  hookgate: { from: '&& freeAgencyCooldownRemaining === 0 && canSignFreeAgent()', to: '&& freeAgencyCooldownRemaining === 0', errors: expected(10) },
  pool: { from: '{pool.map(candidate => (', to: '{pool.slice(0, 1).map(candidate => (', errors: expected(11) },
  dynamic: { from: '{candidate.blurb && <div className="text-muted-foreground">{candidate.blurb}</div>}', to: '{null}', errors: { 11: 'DYNAMIC: simulated eliminated-team notes remain visible' } },
  copy: { from: 'Arcade player pool. Availability follows the rosters in this run.', to: 'Arcade player pool.', errors: { 11: 'COPY: availability describes the simulated run' } },
  sign: { from: 'onClick={() => signFreeAgencyCandidate(candidate)}', to: 'onClick={() => {}}', errors: { 11: 'SIGN: selected candidate reaches the guarded hook action' } },
  empty: { from: '{pool.length === 0 && (', to: '{false && (', errors: expected(12) },
  help: { file: HELP, from: 'Pick a surviving team, then settle 3 battles to unlock a signing.', to: 'Pick a surviving team, then settle 2 battles to unlock a signing.', errors: expected(13) },
  example: { file: HELP, from: 'Claiming a neutral state does not count as a settled battle.', to: 'Every map turn counts toward the next signing.', errors: { 13: 'EXAMPLE: guide distinguishes battles from neutral claims' } },
  status: { from: 'Finish this turn before changing teams or signing.', to: 'Wait.', errors: Object.fromEntries(LABELS.flatMap((label, index) => label === 'gameover' ? [] : [[index + 3, `STATUS: ${label} explains the lock`]])) },
  gameover: { from: 'This run is finished. Start a new run to sign players.', to: 'Wait.', errors: { 6: 'STATUS: gameover explains the lock' } },
  transport: { from: entry, to: `${entry}\n  try { fetch('https://nfl-free-agency-ui.invalid/forbidden'); } catch {}`, errors: boardBoundaries },
  storage: { from: entry, to: `${entry}\n  try { localStorage.setItem('nfl-free-agency-ui-control', 'changed'); } catch {}`, errors: boardBoundaries },
  backend: { from: entry, to: `import { supabase as nflFreeAgencyUiBackend } from '@/integrations/supabase/client';\n${entry}\n  try { void nflFreeAgencyUiBackend.auth; } catch {}`, errors: boardBoundaries },
  importbackend: { from: entry, to: `import { supabase as nflFreeAgencyUiBackend } from '@/integrations/supabase/client';\ntry { void nflFreeAgencyUiBackend.auth; } catch {}\n${entry}`, errors: boundaries(...Array.from({ length: 14 }, (_, index) => index)) },
  runtime: { from: entry, to: `${entry}\n  throw new Error('Unexpected NFL free-agency UI runtime control');`, errors: {} },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-free-agency-ui-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;
try {
  const source = path.join(ROOT, CONTROLS[CONTROL]?.file || BOARD);
  const copy = path.join(temp, 'component.control.tsx');
  if (CONTROL) {
    const original = fs.readFileSync(source, 'utf8').replaceAll('\r\n', '\n');
    const { from, to } = CONTROLS[CONTROL];
    if (original.split(from).length - 1 !== 1) throw new Error(`${CONTROL}: expected one exact source anchor`);
    const changed = original.replace(from, to);
    if (changed === original) throw new Error(`${CONTROL}: source control changed nothing`);
    fs.writeFileSync(copy, changed);
    console.log(`CONTROL ${CONTROL}: one exact source anchor changed in unique OS-temp copy`);
  }
  const reporter = path.join(temp, 'reporter.mjs'), reportPath = path.join(temp, 'report.json');
  fs.writeFileSync(reporter, `import fs from 'node:fs';
export default class {
  onFinished(files, errors) {
    const tests = [], suiteErrors = [];
    const shape = error => ({ name: error.name, message: error.message });
    const visit = task => {
      if (task.type === 'test') tests.push({ name: task.name, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
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
  root: ${JSON.stringify(slash(ROOT))}, cacheDir: ${JSON.stringify(slash(path.join(temp, 'cache')))},
  esbuild: { jsx: 'automatic' },
  plugins: [{ name: 'isolated-nfl-free-agency-ui-control', enforce: 'pre', transform(code, id) {
    if (${!!CONTROL} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(slash(source))}) {
      return { code: fs.readFileSync(${JSON.stringify(copy)}, 'utf8'), map: null };
    }
  } }],
  test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}] },
  resolve: { alias: { '@': ${JSON.stringify(slash(path.join(ROOT, 'src')))} } },
};
`);
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config, '--maxWorkers=1', `--reporter=${slash(reporter)}`], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (run.error || run.signal || !fs.existsSync(reportPath)) throw new Error(`Runner did not complete: ${run.error || run.signal || output}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')), names = CASES.map(([name]) => name);
  if (report.files !== 1 || report.tests.length !== names.length || new Set(report.tests.map(test => test.name)).size !== names.length
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact 14 named UI cases were not reported');
  if (report.unhandled.length || report.suiteErrors.length) throw new Error(`Unexpected runtime/suite errors: ${JSON.stringify({ unhandled: report.unhandled, suite: report.suiteErrors })}`);
  const errors = CONTROL ? CONTROLS[CONTROL].errors : {};
  let exact = true;
  for (const [index, name] of names.entries()) {
    const test = report.tests.find(item => item.name === name), message = errors[index];
    const matches = message
      ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (CONTROL ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${output.slice(-4000)}`);
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '14/14 NFL free-agency UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-free-agency-ui-')) throw new Error('Refusing cleanup outside the unique NFL UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL free-agency UI control files cleaned');
}
if (!success) process.exitCode = 1;
