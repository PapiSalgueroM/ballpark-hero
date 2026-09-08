/** Round 532: actual NFL roster and picker UI with a controlled hook fixture.
 * simConquestNflRoster covers real engine outcomes. Source controls change one
 * exact anchor in unique OS-temp copies and require named AssertionErrors,
 * with all unaffected cases green. Unrelated runtime errors must exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoard.roster.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoard.tsx';
const CONTROL = process.env.SIM_NFL_ROSTER_UI_CONTROL || '';
const CASES = [
  [
    "shows transferred roster metadata for KC",
    "ROSTER: KC keeps transferred position, rating and key stat"
  ],
  [
    "shows transferred roster metadata for BUF",
    "ROSTER: BUF keeps transferred position, rating and key stat"
  ],
  [
    "retains original cards, own legends and queued upgrade display",
    "ORIGINAL: owner card and queued upgrade display remain intact"
  ],
  [
    "shows pool-only metadata without inventing a key stat",
    "POOL: a pool-only player has a card with an unknown key-stat fallback"
  ],
  [
    "keeps the unknown-player fallback in the roster and picker",
    "UNKNOWN: missing cards retain explicit roster fallbacks"
  ],
  [
    "shows transferred metadata in the steal picker and dispatches its name",
    "STEAL: transferred candidate retains position, rating and key stat"
  ],
  [
    "shows transferred metadata in the upgrade picker and dispatches its name",
    "UPGRADE: transferred candidate retains position and rating"
  ]
];
const CONTROLS = {
  "roster": {
    "from": "              const p = getNflRosterPlayer(name, teamId, legendPlayers);",
    "to": "              const p = TEAM_MAP.get(teamId)?.players.find(player => player.name === name);",
    "errors": {
      "0": "ROSTER: KC keeps transferred position, rating and key stat",
      "1": "ROSTER: BUF keeps transferred position, rating and key stat",
      "2": "LEGEND: own-team legend presentation keeps its priority",
      "3": "POOL: a pool-only player has a card with an unknown key-stat fallback"
    }
  },
  "steal": {
    "from": "              const playerData = getNflRosterPlayer(player, game.battleResult?.loser || '', game.legendPlayers);",
    "to": "              const playerData = TEAM_MAP.get(game.battleResult?.loser || '')?.players.find(card => card.name === player);",
    "errors": {
      "5": "STEAL: transferred candidate retains position, rating and key stat"
    }
  },
  "upgrade": {
    "from": "              const playerData = getNflRosterPlayer(player, game.powerupTeam || '', game.legendPlayers);",
    "to": "              const playerData = TEAM_MAP.get(game.powerupTeam || '')?.players.find(card => card.name === player);",
    "errors": {
      "6": "UPGRADE: transferred candidate retains position and rating"
    }
  },
  "stealaction": {
    "from": "onClick={() => game.stealPlayer(player)}",
    "to": "onClick={() => {}}",
    "errors": {
      "5": "STEAL ACTION: selected acquired name reaches the hook"
    }
  },
  "upgradeaction": {
    "from": "onClick={() => game.chooseUpgradePlayer(player)}",
    "to": "onClick={() => {}}",
    "errors": {
      "6": "UPGRADE ACTION: selected acquired name reaches the hook"
    }
  },
  "queued": {
    "from": "              const isUpgraded = name === upgradedPlayer;",
    "to": "              const isUpgraded = false;",
    "errors": {
      "2": "ORIGINAL: owner card and queued upgrade display remain intact"
    }
  },
  "ownlegend": {
    "from": "              const isLegend = p?.keyStat === 'Legend';",
    "to": "              const isLegend = false;",
    "errors": {
      "2": "LEGEND: own-team legend presentation keeps its priority"
    }
  },
  "poolstat": {
    "from": "(p?.keyStat || '-')",
    "to": "(p?.keyStat || 'Unknown')",
    "errors": {
      "3": "POOL: a pool-only player has a card with an unknown key-stat fallback",
      "4": "UNKNOWN: missing cards retain explicit roster fallbacks"
    }
  },
  "unknown": {
    "from": "              const p = getNflRosterPlayer(name, teamId, legendPlayers);",
    "to": "              const p = getNflRosterPlayer(name, teamId, legendPlayers) || { name, position: '?', overall: 75, keyStat: '' };",
    "errors": {
      "4": "UNKNOWN: missing cards retain explicit roster fallbacks"
    }
  },
  "unknownpicker": {
    "from": "              const playerData = getNflRosterPlayer(player, game.battleResult?.loser || '', game.legendPlayers);",
    "to": "              const playerData = getNflRosterPlayer(player, game.battleResult?.loser || '', game.legendPlayers) || { name: player, position: '?', overall: 75, keyStat: '' };",
    "errors": {
      "4": "UNKNOWN PICKER: missing cards keep the original name-only option"
    }
  },
  "transport": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { fetch('https://nfl-roster-ui.invalid/forbidden'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "storage": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { localStorage.setItem('synthetic-roster-probe', '1'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "backend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as rosterUiBackend } from '@/integrations/supabase/client';\nexport default function ConquestBoard() {\n  try { void rosterUiBackend.auth; } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "importbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as rosterUiBackend } from '@/integrations/supabase/client';\ntry { void rosterUiBackend.auth; } catch {}\nexport default function ConquestBoard() {",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "runtime": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  throw new Error('Unexpected NFL roster UI runtime control');",
    "errors": {}
  }
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-roster-ui-'));
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
  plugins: [{ name: 'isolated-nfl-roster-ui-control', enforce: 'pre', transform(code, id) {
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
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact seven named UI cases were not reported');
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '7/7 NFL roster UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-roster-ui-')) throw new Error('Refusing cleanup outside the unique NFL UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL roster UI control files cleaned');
}
if (!success) process.exitCode = 1;
