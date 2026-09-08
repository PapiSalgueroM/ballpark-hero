/** Round 533: NFL saved power and picker controls with a controlled hook fixture.
 * simConquestNflPowers covers actual reward and picker effects. Each control
 * changes one exact source anchor in a unique OS-temp copy and requires exact
 * AssertionErrors, with every other case green. Runtime must reject with exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoard.powers.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoard.tsx';
const HELP = 'src/components/conquest/ConquestHowToPlay.tsx';
const CONTROL = process.env.SIM_NFL_POWERS_UI_CONTROL || '';
const CASES = [
  [
    "reopens the chosen saved owner and slot",
    "SAVED: saved powers have named usable controls and run-only copy"
  ],
  [
    "locks saved controls during battle",
    "LOCK: battle blocks saved power use"
  ],
  [
    "locks saved controls during gameover",
    "LOCK: gameover blocks saved power use"
  ],
  [
    "locks saved controls during pending card",
    "LOCK: pending card blocks saved power use"
  ],
  [
    "locks saved controls during pending picker",
    "LOCK: pending picker blocks saved power use"
  ],
  [
    "keeps saved powers reachable for every surviving team",
    "TEAMS: every surviving team has a reachable saved control"
  ],
  [
    "offers the correct award recipient and saves on dismissal",
    "DISMISS: Save, Close and Escape each bank the pending card"
  ],
  [
    "provides safe exits for the empty free_agent picker",
    "EXIT: free_agent preserves the card through Back, Close and Escape"
  ],
  [
    "provides safe exits for the empty upgrade picker",
    "EXIT: upgrade preserves the card through Back, Close and Escape"
  ],
  [
    "provides safe exits for the empty territory_steal picker",
    "EXIT: territory_steal preserves the card through Back, Close and Escape"
  ],
  [
    "submits the offered free agent",
    "AGENT: the offered player reaches the power action"
  ],
  [
    "upgrades the power owner rather than the current attacker",
    "UPGRADE: the selected owner player reaches the action"
  ],
  [
    "submits the offered bordering state",
    "TERRITORY: the offered bordering state reaches the action"
  ],
  [
    "preserves both optional random-choice actions",
    "RANDOM PLAYER: random choice keeps its existing action"
  ],
  [
    "explains earning, banking and returning to powers",
    "HELP BANK: instructions explain the original earning rule and saved capacity"
  ]
];
const CONTROLS = {
  "saved": {
    "from": "onClick={() => game.useSavedPowerup(id, i)}",
    "to": "onClick={() => {}}",
    "errors": {
      "0": "SAVED ACTION: the selected owner and slot reach the hook",
      "5": "TEAM ACTIONS: all surviving saved owners can be opened"
    }
  },
  "savedname": {
    "from": "aria-label={`Open ${team.name} saved ${pu.label}, slot ${i + 1}`}",
    "to": "aria-label={`Saved ${pu.label}`} ",
    "errors": {
      "0": "SAVED: saved powers have named usable controls and run-only copy",
      "1": "LOCK: battle blocks saved power use",
      "2": "LOCK: gameover blocks saved power use",
      "3": "LOCK: pending card blocks saved power use",
      "4": "LOCK: pending picker blocks saved power use",
      "5": "TEAMS: every surviving team has a reachable saved control"
    }
  },
  "ready": {
    "from": "  const powerActionsReady = game.phase === 'ready' && !game.pendingPowerup && !game.powerupUseType;",
    "to": "  const powerActionsReady = true;",
    "errors": {
      "1": "LOCK: battle blocks saved power use",
      "2": "LOCK: gameover blocks saved power use",
      "3": "LOCK: pending card blocks saved power use",
      "4": "LOCK: pending picker blocks saved power use"
    }
  },
  "turn": {
    "from": "{powerActionsReady && (",
    "to": "{game.phase === 'ready' && (",
    "errors": {
      "3": "TURN LOCK: pending card blocks starting another turn",
      "4": "TURN LOCK: pending picker blocks starting another turn"
    }
  },
  "dismiss": {
    "from": "<Dialog open={game.phase === 'powerup_received' && !!game.pendingPowerup} onOpenChange={open => { if (!open) game.savePowerupForLater(); }}>",
    "to": "<Dialog open={game.phase === 'powerup_received' && !!game.pendingPowerup} onOpenChange={() => {}}>",
    "errors": {
      "6": "DISMISS: Save, Close and Escape each bank the pending card"
    }
  },
  "save": {
    "from": "onClick={game.savePowerupForLater}",
    "to": "onClick={() => {}}",
    "errors": {
      "6": "DISMISS: Save, Close and Escape each bank the pending card"
    }
  },
  "use": {
    "from": "onClick={game.usePowerupNow}",
    "to": "onClick={() => {}}",
    "errors": {
      "6": "USE: Use Now dispatches the pending power"
    }
  },
  "capacity": {
    "from": "(game.teamSavedPowerups[game.pendingPowerup.teamId] || []).length >= 2",
    "to": "false",
    "errors": {
      "6": "AWARD: the owner and oldest-slot replacement are visible"
    }
  },
  "free_agentclose": {
    "from": "<Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'free_agent'} onOpenChange={open => { if (!open) game.cancelPowerupUse(); }}>",
    "to": "<Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'free_agent'} onOpenChange={() => {}}>",
    "errors": {
      "7": "EXIT: free_agent preserves the card through Back, Close and Escape"
    }
  },
  "upgradeclose": {
    "from": "<Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'upgrade'} onOpenChange={open => { if (!open) game.cancelPowerupUse(); }}>",
    "to": "<Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'upgrade'} onOpenChange={() => {}}>",
    "errors": {
      "8": "EXIT: upgrade preserves the card through Back, Close and Escape"
    }
  },
  "territory_stealclose": {
    "from": "<Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'territory_steal'} onOpenChange={open => { if (!open) game.cancelPowerupUse(); }}>",
    "to": "<Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'territory_steal'} onOpenChange={() => {}}>",
    "errors": {
      "9": "EXIT: territory_steal preserves the card through Back, Close and Escape"
    }
  },
  "freeagentback": {
    "from": "<button onClick={game.cancelPowerupUse} className=\"min-h-8 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted\">Back to Power</button>\n        </DialogContent>\n      </Dialog>\n\n      {/* Territory Steal Target Chooser",
    "to": "<span />\n        </DialogContent>\n      </Dialog>\n\n      {/* Territory Steal Target Chooser",
    "errors": {
      "7": "BACK: free_agent has a return to the card"
    }
  },
  "territoryback": {
    "from": "<button onClick={game.cancelPowerupUse} className=\"min-h-8 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted\">Back to Power</button>\n        </DialogContent>\n      </Dialog>\n\n      {/* Upgrade Player Chooser",
    "to": "<span />\n        </DialogContent>\n      </Dialog>\n\n      {/* Upgrade Player Chooser",
    "errors": {
      "9": "BACK: territory_steal has a return to the card"
    }
  },
  "upgradeback": {
    "from": "<button onClick={game.cancelPowerupUse} className=\"min-h-8 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted\">Back to Power</button>\n        </DialogContent>\n      </Dialog>\n\n      {/* Power Rankings",
    "to": "<span />\n        </DialogContent>\n      </Dialog>\n\n      {/* Power Rankings",
    "errors": {
      "8": "BACK: upgrade has a return to the card"
    }
  },
  "agentempty": {
    "from": "{game.freeAgentList.length === 0 &&",
    "to": "{false &&",
    "errors": {
      "7": "EMPTY: free_agent explains the empty picker"
    }
  },
  "upgradeempty": {
    "from": "{(game.rosters[game.powerupTeam || ''] || []).length === 0 &&",
    "to": "{false &&",
    "errors": {
      "8": "EMPTY: upgrade explains the empty picker"
    }
  },
  "territoryempty": {
    "from": "{game.stealCandidates.length === 0 &&",
    "to": "{false &&",
    "errors": {
      "9": "EMPTY: territory_steal explains the empty picker"
    }
  },
  "agentrecipient": {
    "from": "Choose a player for {t(game.powerupTeam)?.name}.",
    "to": "Choose a target.",
    "errors": {
      "7": "RECIPIENT: free_agent describes the power owner"
    }
  },
  "upgraderecipient": {
    "from": "Choose a roster player for {t(game.powerupTeam)?.name}.",
    "to": "Choose a target.",
    "errors": {
      "8": "RECIPIENT: upgrade describes the power owner"
    }
  },
  "territoryrecipient": {
    "from": "Choose a bordering state for {t(game.powerupTeam)?.name}.",
    "to": "Choose a target.",
    "errors": {
      "9": "RECIPIENT: territory_steal describes the power owner"
    }
  },
  "agent": {
    "from": "onClick={() => game.signFreeAgent(fa.name)}",
    "to": "onClick={() => {}}",
    "errors": {
      "10": "AGENT: the offered player reaches the power action"
    }
  },
  "upgrade": {
    "from": "onClick={() => game.chooseUpgradePlayer(player)}",
    "to": "onClick={() => {}}",
    "errors": {
      "11": "UPGRADE: the selected owner player reaches the action"
    }
  },
  "territory": {
    "from": "onClick={() => game.stealTerritoryTarget(c.stateId)}",
    "to": "onClick={() => {}}",
    "errors": {
      "12": "TERRITORY: the offered bordering state reaches the action"
    }
  },
  "randomplayer": {
    "from": "onClick={() => game.chooseUpgradePlayer()}",
    "to": "onClick={() => {}}",
    "errors": {
      "13": "RANDOM PLAYER: random choice keeps its existing action"
    }
  },
  "randomstate": {
    "from": "onClick={() => game.stealTerritoryTarget()}",
    "to": "onClick={() => {}}",
    "errors": {
      "13": "RANDOM STATE: random state keeps its existing action"
    }
  },
  "helpbank": {
    "from": "Keep up to 2 saved powers per team",
    "to": "Keep up to 3 saved powers per team",
    "errors": {
      "14": "HELP BANK: instructions explain the original earning rule and saved capacity"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "helpexit": {
    "from": "Closing a picker also returns to the card.",
    "to": "Close the picker.",
    "errors": {
      "14": "HELP EXIT: instructions explain both dismissal paths"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "helpexample": {
    "from": "For example, earn Upgrade on a lightning state.",
    "to": "Earn Upgrade.",
    "errors": {
      "14": "HELP EXAMPLE: the saved power flow has a worked example"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "transport": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { fetch('https://nfl-powers-ui.invalid/forbidden'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes",
      "8": "BOUNDARY: no backend, transport or browser storage writes",
      "9": "BOUNDARY: no backend, transport or browser storage writes",
      "10": "BOUNDARY: no backend, transport or browser storage writes",
      "11": "BOUNDARY: no backend, transport or browser storage writes",
      "12": "BOUNDARY: no backend, transport or browser storage writes",
      "13": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "storage": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { localStorage.setItem('nfl-powers-ui-control', 'changed'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes",
      "8": "BOUNDARY: no backend, transport or browser storage writes",
      "9": "BOUNDARY: no backend, transport or browser storage writes",
      "10": "BOUNDARY: no backend, transport or browser storage writes",
      "11": "BOUNDARY: no backend, transport or browser storage writes",
      "12": "BOUNDARY: no backend, transport or browser storage writes",
      "13": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "backend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflPowersUiBackend } from '@/integrations/supabase/client';\nexport default function ConquestBoard() {\n  try { void nflPowersUiBackend.auth; } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes",
      "8": "BOUNDARY: no backend, transport or browser storage writes",
      "9": "BOUNDARY: no backend, transport or browser storage writes",
      "10": "BOUNDARY: no backend, transport or browser storage writes",
      "11": "BOUNDARY: no backend, transport or browser storage writes",
      "12": "BOUNDARY: no backend, transport or browser storage writes",
      "13": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "importbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflPowersUiBackend } from '@/integrations/supabase/client';\ntry { void nflPowersUiBackend.auth; } catch {}\nexport default function ConquestBoard() {",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes",
      "8": "BOUNDARY: no backend, transport or browser storage writes",
      "9": "BOUNDARY: no backend, transport or browser storage writes",
      "10": "BOUNDARY: no backend, transport or browser storage writes",
      "11": "BOUNDARY: no backend, transport or browser storage writes",
      "12": "BOUNDARY: no backend, transport or browser storage writes",
      "13": "BOUNDARY: no backend, transport or browser storage writes",
      "14": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "runtime": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  throw new Error('Unexpected NFL powers UI runtime control');",
    "errors": {}
  }
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-powers-ui-'));
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
  plugins: [{ name: 'isolated-nfl-powers-ui-control', enforce: 'pre', transform(code, id) {
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
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact 15 named UI cases were not reported');
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '15/15 NFL powers UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-powers-ui-')) throw new Error('Refusing cleanup outside the unique NFL powers UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL powers UI control files cleaned');
}
if (!success) process.exitCode = 1;
