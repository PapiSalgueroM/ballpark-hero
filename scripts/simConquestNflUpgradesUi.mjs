/** Round 534: NFL owner upgrade controls with a controlled hook fixture.
 * simConquestNflUpgrades covers actual reward and battle effects. Each control
 * changes one exact source anchor in a unique OS-temp copy and requires exact
 * AssertionErrors, with every other case green. Runtime must reject with exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoard.upgrades.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoard.tsx';
const HELP = 'src/components/conquest/ConquestHowToPlay.tsx';
const CONTROL = process.env.SIM_NFL_UPGRADES_UI_CONTROL || '';
const CASES = [
  [
    "shows every queued owner with the selected player",
    "QUEUE: each queued player is paired with its own team"
  ],
  [
    "shows the consumed battle snapshot for KC",
    "SNAPSHOT: KC shows its consumed boost with original card metadata"
  ],
  [
    "shows the consumed battle snapshot for BUF",
    "SNAPSHOT: BUF shows its consumed boost with original card metadata"
  ],
  [
    "keeps queued boosts out of the prior battle roster",
    "PRIOR BATTLE: pending upgrades do not rewrite either old roster"
  ],
  [
    "explains and blocks a duplicate owner upgrade",
    "DUPLICATE REASON: the pending card explains why use is unavailable"
  ],
  [
    "keeps saving and dismissal available for a duplicate card",
    "DUPLICATE EXITS: Save, Close and Escape retain the duplicate card"
  ],
  [
    "explains team-specific lifetime and independent queues",
    "HELP OWNER: the boost lasts until its owner actually battles"
  ]
];
const CONTROLS = {
  "queues": {
    "from": "Object.entries(game.teamUpgrades).map",
    "to": "Object.entries(game.teamUpgrades).slice(0, 1).map",
    "errors": {
      "0": "QUEUE: each queued player is paired with its own team"
    }
  },
  "owner": {
    "from": "TEAM_MAP.get(teamId)?.name}'s next battle",
    "to": "TEAM_MAP.get('KC')?.name}'s next battle",
    "errors": {
      "0": "QUEUE: each queued player is paired with its own team"
    }
  },
  "player": {
    "from": "⬆️ {player} boosted",
    "to": "⬆️ unknown boosted",
    "errors": {
      "0": "QUEUE: each queued player is paired with its own team"
    }
  },
  "winner": {
    "from": "upgradedPlayer={game.battleUpgrades[game.battleResult?.winner || '']}",
    "to": "upgradedPlayer={undefined}",
    "errors": {
      "1": "SNAPSHOT: KC shows its consumed boost with original card metadata"
    }
  },
  "loser": {
    "from": "upgradedPlayer={game.battleUpgrades[game.battleResult?.loser || '']}",
    "to": "upgradedPlayer={undefined}",
    "errors": {
      "2": "SNAPSHOT: BUF shows its consumed boost with original card metadata"
    }
  },
  "winnerqueue": {
    "from": "upgradedPlayer={game.battleUpgrades[game.battleResult?.winner || '']}",
    "to": "upgradedPlayer={game.teamUpgrades[game.battleResult?.winner || '']}",
    "errors": {
      "1": "SNAPSHOT: KC shows its consumed boost with original card metadata",
      "3": "PRIOR BATTLE: pending upgrades do not rewrite either old roster"
    }
  },
  "loserqueue": {
    "from": "upgradedPlayer={game.battleUpgrades[game.battleResult?.loser || '']}",
    "to": "upgradedPlayer={game.teamUpgrades[game.battleResult?.loser || '']}",
    "errors": {
      "2": "SNAPSHOT: BUF shows its consumed boost with original card metadata",
      "3": "PRIOR BATTLE: pending upgrades do not rewrite either old roster"
    }
  },
  "bleed": {
    "from": "const isUpgraded = name === upgradedPlayer;",
    "to": "const isUpgraded = true;",
    "errors": {
      "1": "ISOLATION: KC does not boost the other team's roster",
      "2": "ISOLATION: BUF does not boost the other team's roster",
      "3": "PRIOR BATTLE: pending upgrades do not rewrite either old roster"
    }
  },
  "reason": {
    "from": "{game.powerupUnavailableReason}</p>",
    "to": "{null}</p>",
    "errors": {
      "4": "DUPLICATE REASON: the pending card explains why use is unavailable"
    }
  },
  "lock": {
    "from": "disabled={!!game.powerupUnavailableReason}",
    "to": "disabled={false}",
    "errors": {
      "4": "DUPLICATE LOCK: Use Now cannot replace the queued owner upgrade"
    }
  },
  "save": {
    "from": "onClick={game.savePowerupForLater}",
    "to": "disabled onClick={game.savePowerupForLater}",
    "errors": {
      "5": "DUPLICATE SAVE: a deferred duplicate can still be banked"
    }
  },
  "saveaction": {
    "from": "onClick={game.savePowerupForLater}",
    "to": "onClick={() => {}}",
    "errors": {
      "5": "DUPLICATE EXITS: Save, Close and Escape retain the duplicate card"
    }
  },
  "dismiss": {
    "from": "onOpenChange={open => { if (!open) game.savePowerupForLater(); }}",
    "to": "onOpenChange={() => {}}",
    "errors": {
      "5": "DUPLICATE EXITS: Save, Close and Escape retain the duplicate card"
    }
  },
  "helpowner": {
    "from": "that team's next actual battle",
    "to": "the next battle",
    "errors": {
      "6": "HELP OWNER: the boost lasts until its owner actually battles"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "helppreserve": {
    "from": "Neutral claims and other teams' battles keep your upgrade queued. Different teams can each have their own upgrades.",
    "to": "The next turn spends all upgrades.",
    "errors": {
      "6": "HELP PRESERVE: neutral claims and unrelated teams preserve separate upgrades"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "helpduplicate": {
    "from": "If a team already has an upgrade queued, choose Save for Later on its next Upgrade card.",
    "to": "Use another card to replace it.",
    "errors": {
      "6": "HELP DUPLICATE: a second owner upgrade can be saved"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "transport": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { fetch('https://nfl-upgrades-ui.invalid'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "storage": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { localStorage.setItem('nfl-upgrades-probe', '1'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "caughtbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflUpgradeUiBackend } from '@/integrations/supabase/client';\nexport default function ConquestBoard() {\n  try { void nflUpgradeUiBackend.auth; } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "importbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflUpgradeUiBackend } from '@/integrations/supabase/client';\ntry { void nflUpgradeUiBackend.auth; } catch {}\nexport default function ConquestBoard() {",
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
    "to": "export default function ConquestBoard() {\n  throw new Error('Unexpected NFL upgrades UI runtime control');",
    "errors": {}
  }
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-upgrades-ui-'));
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
  plugins: [{ name: 'isolated-nfl-upgrades-ui-control', enforce: 'pre', transform(code, id) {
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
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact 7 named UI cases were not reported');
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '7/7 NFL upgrades UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-upgrades-ui-')) throw new Error('Refusing cleanup outside the unique NFL upgrades UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL upgrades UI control files cleaned');
}
if (!success) process.exitCode = 1;
