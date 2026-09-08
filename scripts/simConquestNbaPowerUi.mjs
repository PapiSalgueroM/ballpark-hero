/** Round 527: accessible power choices and saved controls on the real NBA board.
 * The hook is a deterministic UI fixture; simConquestNbaPowers covers actual effects.
 * Controls mutate one exact production source anchor in a unique OS-temp copy.
 * Each must report precisely its named assertion failures, with no extra errors.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoardNba.powers.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoardNba.tsx';
const HELP = 'src/components/conquest/ConquestHowToPlayNba.tsx';
const CONTROL = process.env.SIM_NBA_POWER_UI_CONTROL || '';
const CASES = [
  ['opens the selected saved slot for its owner between battles', 'SAVED: opens the selected owner and slot'],
  ['does not reopen saved powers while a battle runs', 'PHASE: saved controls are disabled during battle'],
  ['keeps saved powers reachable for every surviving team', 'TEAMS: every surviving team can open its saved power'],
  ['explains unavailable powers and the oldest replacement before saving', 'UNAVAILABLE: power use remains disabled until available'],
  ['uses the pending owner roster for upgrade selection', 'OWNER: only the pending owner roster is offered for upgrade'],
  ['signs the selected offered NBA player', 'SIGN: selected offered player reaches the power action'],
  ['offers only eligible territories and submits the selected region', 'TERRITORY: selected eligible region reaches the power action'],
  ['keeps an exit when free_agent has no choices', 'EMPTY: free_agent has an active way back to its card'],
  ['keeps an exit when upgrade has no choices', 'EMPTY: upgrade has an active way back to its card'],
  ['keeps an exit when territory_steal has no choices', 'EMPTY: territory_steal has an active way back to its card'],
  ['returns to the pending card when the selector is closed', 'CLOSE: closing the selector returns to its card'],
  ['shows separate waiting upgrades for their respective teams', 'UPGRADES: show every waiting owner and player'],
  ['shows each teams consumed battle upgrade on its own result roster', 'BATTLE: both consumed upgrades appear on the correct result rosters'],
  ['explains earning, banking and replaying a power in the help dialog', 'HELP: worked example covers reopening and using a saved power'],
];
const expected = (...indices) => Object.fromEntries(indices.map(index => [index, CASES[index][1]]));
const boundaries = Object.fromEntries(CASES.slice(0, -1).map((_, index) => [index, 'BOUNDARY: no backend, transport or browser storage writes']));
const entry = 'export default function ConquestBoardNba() {';
const CONTROLS = {
  saved: { from: 'onClick={() => game.useSavedPowerup(id, i)}', to: 'onClick={() => {}}', errors: expected(0, 2) },
  phase: { from: "disabled={game.phase !== 'ready'}", to: 'disabled={false}', errors: expected(1) },
  unavailable: { from: 'disabled={!!game.powerupUnavailableReason}', to: 'disabled={false}', errors: expected(3) },
  capacity: { from: 'Saving this one replaces the oldest.', to: 'This power can be saved.', errors: { 3: 'CAPACITY: warn before replacing the oldest saved power' } },
  owner: { from: 'game.rosters[game.pendingPowerup.teamId] || []', to: "game.rosters[game.attackingTeam || ''] || []", errors: expected(4) },
  upgrade: { from: 'onClick={() => game.chooseUpgradePlayer(name)}', to: 'onClick={() => {}}', errors: { 4: 'UPGRADE PICK: selected owner player reaches the power action' } },
  signing: { from: 'onClick={() => game.signFreeAgent(fa.name)}', to: 'onClick={() => {}}', errors: expected(5) },
  territory: { from: 'onClick={() => game.choosePowerupTerritory(stateId)}', to: 'onClick={() => {}}', errors: expected(6) },
  back: { from: 'onClick={game.cancelPowerupUse}', to: 'onClick={() => {}}', errors: expected(7, 8, 9) },
  close: { from: 'onOpenChange={open => { if (!open) game.cancelPowerupUse(); }}', to: 'onOpenChange={() => {}}', errors: expected(10) },
  waiting: { from: 'Object.entries(game.teamUpgrades).map', to: 'Object.entries({}).map', errors: expected(11) },
  battle: { from: "upgradedPlayer={game.battleUpgrades[game.battleResult?.loser || '']}", to: 'upgradedPlayer={undefined}', errors: expected(12) },
  example: { file: HELP, from: 'Save it, tap the saved arrow between battles, tap Use Now, and choose a player.', to: 'Save it, then choose a player.', errors: expected(13) },
  transport: { from: entry, to: `${entry}\n  try { fetch('https://nba-power-ui-fixture.invalid/forbidden'); } catch { /* deliberate swallow */ }`, errors: boundaries },
  storage: { from: entry, to: `${entry}\n  try { localStorage.setItem('nba-power-ui-control', 'changed'); } catch { /* deliberate swallow */ }`, errors: boundaries },
  backend: { from: entry, to: `import { supabase } from '@/integrations/supabase/client';\n${entry}\n  try { supabase.from('forbidden'); } catch { /* deliberate swallow */ }`, errors: boundaries },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
if (process.argv.includes('--controls')) {
  for (const control of ['', ...Object.keys(CONTROLS)]) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      cwd: ROOT, env: { ...process.env, SIM_NBA_POWER_UI_CONTROL: control }, stdio: 'inherit', timeout: 120000,
    });
    if (child.error || child.signal || child.status !== 0) process.exit(1);
  }
  console.log(`PASS: UI baseline and all ${Object.keys(CONTROLS).length} exact source controls`);
  process.exit(0);
}
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nba-power-ui-'));
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
  plugins: [{ name: 'isolated-nba-power-ui-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '14/14 NBA UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nba-power-ui-')) throw new Error('Refusing cleanup outside the unique NBA UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NBA UI control files cleaned');
}
if (!success) process.exitCode = 1;
