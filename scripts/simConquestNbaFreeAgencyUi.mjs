/** Round 530: real NBA free-agency panel and guide with a controlled hook fixture.
 * simConquestNbaFreeAgency covers actual battles and signing effects.
 * Controls change one exact source anchor in a unique OS-temp copy and require
 * exact AssertionErrors. Runtime errors never earn credit; runtime must exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoardNba.freeAgency.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoardNba.tsx';
const HELP = 'src/components/conquest/ConquestHowToPlayNba.tsx';
const CONTROL = process.env.SIM_NBA_FREE_AGENCY_UI_CONTROL || '';
const CASES = [
  ['keeps a controlled live-team picker after choosing a favorite', 'CONTROLLED: picker follows the current favorite'],
  ['clears an eliminated favorite and offers a replacement', 'ELIMINATED: old favorite clears with a visible recovery notice'],
  ...['animating', 'battle', 'powerup_received', 'gameover'].map(phase => [`locks team changes and signing during ${phase}`, `PHASE: ${phase} locks both free-agency actions`]),
  ['shows remaining settled battles without enabling an early signing', 'COOLDOWN: remaining settled battles keep signing disabled'],
  ['offers only supplied candidates and signs the selected entry', 'CANDIDATES: only the hook-approved pool is offered'],
  ['keeps team selection usable when the available pool is empty', 'EMPTY: no stale candidates and an active team picker remain'],
  ['explains the signing cost and shared cooldown in the guide', 'HELP: guide explains waiver and the shared three-battle cooldown'],
];
const expected = (...indices) => Object.fromEntries(indices.map(index => [index, CASES[index][1]]));
const boundaries = (...indices) => Object.fromEntries(indices.map(index => [index, 'BOUNDARY: no backend, transport or browser storage writes']));
const boardBoundaries = boundaries(0, 1, 2, 3, 4, 5, 6, 7, 8);
const entry = 'export default function ConquestBoardNba() {';
const CONTROLS = {
  controlled: { from: 'value={activeFavorite}', to: 'defaultValue={activeFavorite}', errors: expected(0) },
  alive: { from: 'NBA_TEAMS.filter(team => aliveTeamIds.includes(team.id)).map', to: 'NBA_TEAMS.map', errors: { 0: 'ALIVE: picker offers only surviving teams' } },
  change: { from: 'onChange={(e) => { if (e.target.value) setFavoriteTeam(e.target.value); }}', to: 'onChange={() => {}}', errors: { 0: 'CHANGE: picker dispatches the new favorite' } },
  eliminated: { from: "  const activeFavorite = favoriteTeam && aliveTeamIds.includes(favoriteTeam) ? favoriteTeam : '';", to: "  const activeFavorite = favoriteTeam || '';", errors: expected(1) },
  eliminatedsign: { from: "phase === 'ready' && !!activeFavorite && freeAgencyCooldownRemaining", to: "phase === 'ready' && freeAgencyCooldownRemaining", errors: { 1: 'ELIMINATED SIGN: choose a surviving favorite before signing' } },
  signphase: { from: "  const canSign = phase === 'ready' && !!activeFavorite", to: '  const canSign = !!activeFavorite', errors: expected(2, 3, 4, 5) },
  selectorphase: { from: "          disabled={phase !== 'ready'}", to: '          disabled={false}', errors: expected(2, 3, 4, 5) },
  cooldown: { from: '&& freeAgencyCooldownRemaining === 0 && canSignFreeAgent()', to: '&& canSignFreeAgent()', errors: expected(6) },
  candidates: { from: 'availableCandidates.map(candidate => (', to: 'NBA_TEAMS.flatMap(team => team.players).slice(0, 2).map(candidate => (', errors: expected(7) },
  sign: { from: 'onClick={() => signFreeAgencyCandidate(candidate)}', to: 'onClick={() => {}}', errors: { 7: 'SIGN: selected candidate reaches the guarded hook action' } },
  empty: { from: 'availableCandidates.length > 0 ? (', to: 'true ? (', errors: expected(8) },
  help: { file: HELP, from: 'Pick an active team and settle 3 battles to unlock a signing.', to: 'Pick an active team and settle 2 battles to unlock a signing.', errors: expected(9) },
  copy: { from: 'Arcade player pool. Availability follows the rosters in this run.', to: 'Arcade player pool.', errors: { 7: 'COPY: availability describes the simulated run' } },
  status: { from: 'Finish this turn before changing teams or signing.', to: 'Wait.', errors: Object.fromEntries(['animating', 'battle', 'powerup_received'].map((phase, index) => [index + 2, `STATUS: ${phase} explains why signing is locked`])) },
  gameover: { from: 'This run is finished. Start a new run to sign players.', to: 'Wait.', errors: { 5: 'STATUS: gameover explains why signing is locked' } },
  transport: { from: entry, to: `${entry}\n  try { fetch('https://nba-free-agency-ui.invalid/forbidden'); } catch {}`, errors: boardBoundaries },
  storage: { from: entry, to: `${entry}\n  try { localStorage.setItem('nba-free-agency-ui-control', 'changed'); } catch {}`, errors: boardBoundaries },
  backend: { from: entry, to: `import { supabase as freeAgencyUiBackend } from '@/integrations/supabase/client';\n${entry}\n  try { void freeAgencyUiBackend.auth; } catch {}`, errors: boardBoundaries },
  importbackend: { from: entry, to: `import { supabase as freeAgencyUiBackend } from '@/integrations/supabase/client';\ntry { void freeAgencyUiBackend.auth; } catch {}\n${entry}`, errors: boundaries(0, 1, 2, 3, 4, 5, 6, 7, 8, 9) },
  runtime: { from: entry, to: `${entry}\n  throw new Error('Unexpected NBA free-agency UI runtime control');`, errors: {} },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nba-free-agency-ui-'));
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
  plugins: [{ name: 'isolated-nba-free-agency-ui-control', enforce: 'pre', transform(code, id) {
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
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact 10 named UI cases were not reported');
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '10/10 NBA free-agency UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nba-free-agency-ui-')) throw new Error('Refusing cleanup outside the unique NBA UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NBA free-agency UI control files cleaned');
}
if (!success) process.exitCode = 1;
