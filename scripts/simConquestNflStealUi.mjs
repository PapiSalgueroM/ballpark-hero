/** Round 536: NFL pending battle steal controls with a controlled hook fixture.
 * simConquestNflSteal covers actual settlement and timer effects. Each control
 * changes one exact source anchor in a unique OS-temp copy and requires exact
 * AssertionErrors, with every other case green. Runtime must reject with exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/conquest/ConquestBoard.steal.test.tsx';
const BOARD = 'src/components/conquest/ConquestBoard.tsx';
const CONTROL = process.env.SIM_NFL_STEAL_UI_CONTROL || '';
const CASES = [
  [
    "dispatches the eligible loser choice for the shown winner",
    ""
  ],
  [
    "disables a displayed player the hook cannot accept",
    ""
  ],
  [
    "does not reopen a picker for an inactive pending battle",
    ""
  ],
  [
    "hides a stale open modal when the battle is inactive",
    ""
  ],
  [
    "offers Continue when no losing-roster player is eligible",
    ""
  ],
  [
    "does not offer Continue without settlement permission",
    ""
  ],
  [
    "keeps Continue hidden when a player can be selected",
    ""
  ],
  [
    "shows confirmation while all further steal controls are closed",
    ""
  ],
  [
    "keeps Close and Escape connected to box-score review and reopening",
    ""
  ],
  [
    "explains reviewing and finishing a player choice",
    ""
  ]
];
const CONTROLS = {
  "recipient": {
    "from": "Choose a player to add to {winTeam?.name}",
    "to": "Choose a player to add to {loseTeam?.name}",
    "errors": {
      "0": "RECIPIENT: the picker names the current battle winner"
    }
  },
  "eligible": {
    "from": "disabled={!game.canStealPlayer(player)}",
    "to": "disabled={true}",
    "errors": {
      "0": "ELIGIBLE: the permitted losing-roster player can be selected"
    }
  },
  "ineligible": {
    "from": "disabled={!game.canStealPlayer(player)}",
    "to": "disabled={false}",
    "errors": {
      "1": "INELIGIBLE: a displayed inadmissible name is disabled"
    }
  },
  "choice": {
    "from": "onClick={() => game.stealPlayer(player)}",
    "to": "onClick={() => {}}",
    "errors": {
      "0": "CHOICE: the selected eligible name reaches the hook"
    }
  },
  "openguard": {
    "from": "game.stealActionReady && hasStealChoices",
    "to": "hasStealChoices",
    "errors": {
      "2": "OPEN GUARD: an inactive battle cannot reopen the picker",
      "7": "CONFIRMATION: the selected player is shown without another settlement action"
    }
  },
  "empty": {
    "from": "(game.rosters[game.battleResult?.loser || ''] || []).some(game.canStealPlayer)",
    "to": "(game.rosters[game.battleResult?.loser || ''] || []).length > 0",
    "errors": {
      "4": "EMPTY CHOICES: no eligible name has a visible Continue exit"
    }
  },
  "modal": {
    "from": "open={game.stealModalOpen && game.stealActionReady}",
    "to": "open={game.stealModalOpen}",
    "errors": {
      "3": "MODAL GUARD: a stale open flag cannot expose inactive choices",
      "7": "CONFIRMATION: the selected player is shown without another settlement action"
    }
  },
  "skipguard": {
    "from": "game.canSkipSteal && !hasStealChoices",
    "to": "!hasStealChoices",
    "errors": {
      "5": "CONTINUE GUARD: empty choices alone cannot bypass settlement permission"
    }
  },
  "skipchoices": {
    "from": "game.canSkipSteal && !hasStealChoices",
    "to": "game.canSkipSteal",
    "errors": {
      "6": "PICK FIRST: eligible choices keep the player selection flow"
    }
  },
  "skipaction": {
    "from": "onClick={game.skipSteal}",
    "to": "onClick={() => {}}",
    "errors": {
      "4": "CONTINUE ACTION: the empty-choice exit settles through the hook"
    }
  },
  "close": {
    "from": "if (!open) game.closeStealModal();",
    "to": "if (!open) {}",
    "errors": {
      "8": "DISMISS: Close and Escape preserve the box-score review action"
    }
  },
  "reopen": {
    "from": "onClick={game.openStealModal}",
    "to": "onClick={() => {}}",
    "errors": {
      "8": "REOPEN: reviewing the score can reopen the same unspent choice"
    }
  },
  "helpreview": {
    "from": "Close the picker to review the box score, then reopen it to choose one player.",
    "to": "Choose a player.",
    "errors": {
      "9": "HELP REVIEW: closing and reopening preserves one player choice"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "helpcontinue": {
    "from": "If there are no eligible players, use Continue to finish the battle.",
    "to": "Finish the choice.",
    "errors": {
      "9": "HELP CONTINUE: empty choices have an explained finish action"
    },
    "file": "src/components/conquest/ConquestHowToPlay.tsx"
  },
  "transport": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { fetch('https://nfl-steal-ui.invalid'); } catch {}",
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
  "storage": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  try { localStorage.setItem('nfl-steal-probe','1'); } catch {}",
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
  "caughtbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflStealUiBackend } from '@/integrations/supabase/client';\nexport default function ConquestBoard() {\n  try { void nflStealUiBackend.auth; } catch {}",
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
  "importbackend": {
    "from": "export default function ConquestBoard() {",
    "to": "import { supabase as nflStealUiBackend } from '@/integrations/supabase/client';\ntry { void nflStealUiBackend.auth; } catch {}\nexport default function ConquestBoard() {",
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
      "9": "BOUNDARY: no backend, transport or browser storage writes"
    }
  },
  "runtime": {
    "from": "export default function ConquestBoard() {",
    "to": "export default function ConquestBoard() {\n  throw new Error('Unexpected NFL steal UI runtime control');",
    "errors": {}
  }
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-steal-ui-'));
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
  plugins: [{ name: 'isolated-nfl-steal-ui-control', enforce: 'pre', transform(code, id) {
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
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '10/10 NFL steal UI cases green'}; zero unhandled or suite errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-steal-ui-')) throw new Error('Refusing cleanup outside the unique NFL steal UI temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL steal UI control files cleaned');
}
if (!success) process.exitCode = 1;
