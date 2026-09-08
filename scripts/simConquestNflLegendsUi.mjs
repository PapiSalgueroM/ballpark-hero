/** Round 535: NFL earned legend controls with a controlled hook fixture.
 * simConquestNflLegends covers actual reward and battle effects. Each control
 * changes one exact source anchor in a unique OS-temp copy and requires exact
 * AssertionErrors, with every other case green. Runtime must reject with exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoard.legends.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoard.tsx';
const HELP = 'src/components/conquest/ConquestHowToPlay.tsx';
const CONTROL = process.env.SIM_NFL_LEGENDS_UI_CONTROL || '';
const CASES = [
  [
    "keeps the ordinary same-name pool card on MIN",
    "POOL: MIN does not turn a signed name into an earned legend"
  ],
  [
    "keeps the ordinary same-name pool card on SEA",
    "POOL: SEA does not turn a signed name into an earned legend"
  ],
  [
    "keeps the earned legend card after transfer to KC",
    "TRANSFER: KC keeps earned legend identity and metadata"
  ],
  [
    "keeps the earned legend card after transfer to BUF",
    "TRANSFER: BUF keeps earned legend identity and metadata"
  ],
  [
    "shows the earned legend in the losing roster choice",
    "STEAL CARD: the offered earned legend retains its card"
  ],
  [
    "shows the earned legend in the upgrade choice",
    "UPGRADE CARD: the owner earned legend keeps its rating in the picker"
  ],
  [
    "keeps a temporary upgrade distinct from an earned legend",
    "TEMPORARY: a battle boost does not create permanent legend identity"
  ],
  [
    "preserves an ordinary pool card after transfer",
    "ORDINARY TRANSFER: the unearned card keeps its existing pool rating"
  ],
  [
    "explains earned legend transfers and unavailable cards",
    "HELP TRANSFER: an earned legend card follows its player for the run"
  ]
];
const CONTROLS = {
  "rostercontext": {
    "from": "getNflRosterPlayer(name, teamId, legendPlayers)",
    "to": "getNflRosterPlayer(name, teamId)",
    "errors": {
      "0": "POOL: MIN does not turn a signed name into an earned legend",
      "1": "POOL: SEA does not turn a signed name into an earned legend",
      "2": "TRANSFER: KC keeps earned legend identity and metadata",
      "3": "TRANSFER: BUF keeps earned legend identity and metadata",
      "6": "TEMPORARY: a battle boost does not create permanent legend identity"
    }
  },
  "winner": {
    "from": "upgradedPlayer={game.battleUpgrades[game.battleResult?.winner || '']}\n              legendPlayers={game.legendPlayers}",
    "to": "upgradedPlayer={game.battleUpgrades[game.battleResult?.winner || '']}\n              legendPlayers={new Set()}",
    "errors": {
      "2": "TRANSFER: KC keeps earned legend identity and metadata"
    }
  },
  "loser": {
    "from": "upgradedPlayer={game.battleUpgrades[game.battleResult?.loser || '']}\n              legendPlayers={game.legendPlayers}",
    "to": "upgradedPlayer={game.battleUpgrades[game.battleResult?.loser || '']}\n              legendPlayers={new Set()}",
    "errors": {
      "3": "TRANSFER: BUF keeps earned legend identity and metadata"
    }
  },
  "stealcontext": {
    "from": "getNflRosterPlayer(player, game.battleResult?.loser || '', game.legendPlayers)",
    "to": "getNflRosterPlayer(player, game.battleResult?.loser || '')",
    "errors": {
      "4": "STEAL CARD: the offered earned legend retains its card"
    }
  },
  "upgradecontext": {
    "from": "getNflRosterPlayer(player, game.powerupTeam || '', game.legendPlayers)",
    "to": "getNflRosterPlayer(player, game.powerupTeam || '')",
    "errors": {
      "5": "UPGRADE CARD: the owner earned legend keeps its rating in the picker"
    }
  },
  "badge": {
    "from": "const isLegend = p?.keyStat === 'Legend';",
    "to": "const isLegend = false;",
    "errors": {
      "2": "TRANSFER: KC keeps earned legend identity and metadata",
      "3": "TRANSFER: BUF keeps earned legend identity and metadata"
    }
  },
  "boost": {
    "from": "const ovr = isUpgraded ? 99 : (isLegend ? 99 : p?.overall);",
    "to": "const ovr = p?.overall;",
    "errors": {
      "6": "TEMPORARY: a battle boost does not create permanent legend identity"
    }
  },
  "position": {
    "from": "{p?.position || '-'}</td>",
    "to": "{'-'}</td>",
    "errors": {
      "0": "POOL: MIN does not turn a signed name into an earned legend",
      "1": "POOL: SEA does not turn a signed name into an earned legend",
      "2": "TRANSFER: KC keeps earned legend identity and metadata",
      "3": "TRANSFER: BUF keeps earned legend identity and metadata",
      "6": "TEMPORARY: a battle boost does not create permanent legend identity",
      "7": "ORDINARY TRANSFER: the unearned card keeps its existing pool rating"
    }
  },
  "key": {
    "from": "{isLegend ? 'Legend' : (p?.keyStat || '-')}</td>",
    "to": "{'-'}</td>",
    "errors": {
      "2": "TRANSFER: KC keeps earned legend identity and metadata",
      "3": "TRANSFER: BUF keeps earned legend identity and metadata"
    }
  },
  "ordinary": {
    "from": "const isLegend = p?.keyStat === 'Legend';",
    "to": "const isLegend = !!p;",
    "errors": {
      "0": "POOL: MIN does not turn a signed name into an earned legend",
      "1": "POOL: SEA does not turn a signed name into an earned legend",
      "6": "TEMPORARY: a battle boost does not create permanent legend identity",
      "7": "ORDINARY TRANSFER: the unearned card keeps its existing pool rating"
    }
  },
  "stealaction": {
    "from": "onClick={() => game.stealPlayer(player)}",
    "to": "onClick={() => {}}",
    "errors": {
      "4": "STEAL ACTION: the offered legend name reaches the hook"
    }
  },
  "upgradeaction": {
    "from": "onClick={() => game.chooseUpgradePlayer(player)}",
    "to": "onClick={() => {}}",
    "errors": {
      "5": "UPGRADE ACTION: the selected legend name reaches the hook"
    }
  },
  "helptransfer": {
    "from": "The legend card follows the player when another team recruits them.",
    "to": "The card stays with its franchise.",
    "errors": {
      "8": "HELP TRANSFER: an earned legend card follows its player for the run"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "helpduplicate": {
    "from": "If your legend's name is already on a surviving roster, the All-Time Great card cannot be used yet. Choose Save for Later to keep it. Signing a same-name player from the ordinary pool does not make them a legend.",
    "to": "Use the power whenever you want.",
    "errors": {
      "8": "HELP DUPLICATE: an unavailable card can be saved and ordinary signings stay ordinary"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "transport": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { fetch('https://nfl-legends-ui.invalid'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "storage": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { localStorage.setItem('nfl-legends-probe', '1'); } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "caughtbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflLegendUiBackend } from '@/integrations/supabase/client';\nexport default function ConquestBoard() {\n  try { void nflLegendUiBackend.auth; } catch {}",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "importbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflLegendUiBackend } from '@/integrations/supabase/client';\ntry { void nflLegendUiBackend.auth; } catch {}\nexport default function ConquestBoard() {",
    "errors": {
      "0": "BOUNDARY: no backend, transport or browser storage writes",
      "1": "BOUNDARY: no backend, transport or browser storage writes",
      "2": "BOUNDARY: no backend, transport or browser storage writes",
      "3": "BOUNDARY: no backend, transport or browser storage writes",
      "4": "BOUNDARY: no backend, transport or browser storage writes",
      "5": "BOUNDARY: no backend, transport or browser storage writes",
      "6": "BOUNDARY: no backend, transport or browser storage writes",
      "7": "BOUNDARY: no backend, transport or browser storage writes",
      "8": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "runtime": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  throw new Error('Unexpected NFL legends UI runtime control');",
    "errors": {}
  }
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-legends-ui-'));
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
  plugins: [{ name: 'isolated-nfl-legends-ui-control', enforce: 'pre', transform(code, id) {
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
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact 9 named UI cases were not reported');
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '9/9 NFL legends UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-legends-ui-')) throw new Error('Refusing cleanup outside the unique NFL legends UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL legends UI control files cleaned');
}
if (!success) process.exitCode = 1;
