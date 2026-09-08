/* NBA Conquest Arcade outcome harness.

   NBA Arcade was forked before the NFL Arcade home and away rule was fixed.
   A failed NBA away raid therefore transferred the attacker's whole empire
   to the defender and eliminated the attacker. The rendered hook test drives
   real battles through the real timers and simulator. It holds both outcomes:

     1. A losing attacker keeps every region, stays alive and gets a repelled
        entry in the battle log.
     2. The result panel tells the player the raid was repelled instead of
        claiming the attacker was eliminated.

   Negative controls prove each half can fail:

     SIM_CONQUEST_NBA_CONTROL=annihilate
       Runs against a copy of the hook whose attacker guard is disabled. The
       map outcome test must fail while the copy test stays green.

     SIM_CONQUEST_NBA_CONTROL=lie
       Runs against a copy of the board whose repelled copy branch is disabled.
       The copy test must fail while the map outcome stays green.

   Each control first proves the exact production bytes exist and that the
   rewrite changed them. Load errors never count as a working control.

   Run: node scripts/simConquestNbaArcade.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useConquestNba.test.tsx';
const CONTROL = process.env.SIM_CONQUEST_NBA_CONTROL || '';
const abort = message => { console.error(message); process.exit(1); };

function runVitest(extraEnv = {}) {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return { code: result.status, out: (result.stdout || '') + (result.stderr || '') };
}

function controlledCopy(relativePath, needle, replacement) {
  const sourcePath = path.join(ROOT, relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const matches = source.split(needle).length - 1;
  if (matches !== 1) abort(`control cannot run: expected one target in ${relativePath}, found ${matches}`);
  const changed = source.replace(needle, replacement);
  if (changed === source) abort(`control cannot run: ${relativePath} bytes did not change`);
  const controlRoot = path.join(ROOT, 'dist', '.conquest-nba-control-');
  fs.mkdirSync(path.dirname(controlRoot), { recursive: true });
  const tempDir = fs.mkdtempSync(controlRoot);
  const copy = path.join(tempDir, path.basename(relativePath));
  fs.writeFileSync(copy, changed);
  return { tempDir, copy: copy.replaceAll('\\', '/') };
}

let env = {};
let tempDir = null;
if (CONTROL === 'annihilate') {
  const made = controlledCopy(
    'src/hooks/useConquestNba.ts',
    'if (result.loser === attacker) {',
    'if (false && result.loser === attacker) {',
  );
  tempDir = made.tempDir;
  env = { CONQUEST_NBA_HOOK: made.copy };
  console.log('NEGATIVE CONTROL ON: losing NBA attackers are annihilated again');
} else if (CONTROL === 'lie') {
  const made = controlledCopy(
    'src/components/conquest/ConquestBoardNba.tsx',
    'game.battleResult.loser === game.attackingTeam',
    'false && game.battleResult.loser === game.attackingTeam',
  );
  const copiedBoard = fs.readFileSync(made.copy, 'utf8');
  const rewiredBoard = copiedBoard.replace(
    "from './ConquestRegionMap'",
    "from '@/components/conquest/ConquestRegionMap'",
  );
  if (rewiredBoard === copiedBoard) abort('control cannot run: the copied board relative import was not rewired');
  fs.writeFileSync(made.copy, rewiredBoard);
  tempDir = made.tempDir;
  env = { CONQUEST_NBA_BOARD: made.copy };
  console.log('NEGATIVE CONTROL ON: the NBA result panel lies about a repelled raid');
} else if (CONTROL) {
  abort(`unknown control "${CONTROL}" (annihilate, lie)`);
}

let code;
let out;
try {
  ({ code, out } = runVitest(env));
} finally {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
}

if (!out.includes(path.basename(TEST))) abort('vitest did not report the NBA Arcade test file:\n' + out.slice(-1800));
if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) {
  abort('the test or controlled copy did not load:\n' + out.slice(-1800));
}

const mapCase = 'repels a losing attacker without deleting its empire';
const copyCase = 'tells the player that the failed away raid was repelled';

if (!CONTROL) {
  if (code !== 0 || !/2 passed/.test(out)) abort('NBA Arcade regression is red:\n' + out.slice(-2400));
  console.log('NBA Conquest away-loss regression');
  console.log(`  1) ${mapCase}: green`);
  console.log(`  2) ${copyCase}: green`);
  console.log('NBA Arcade: 2 of 2 real hook and board outcomes green');
  process.exit(0);
}

const target = CONTROL === 'annihilate' ? mapCase : copyCase;
const other = CONTROL === 'annihilate' ? copyCase : mapCase;
if (!new RegExp(`×.*${target}`).test(out) || !/AssertionError|expected/.test(out)) {
  abort(`control "${CONTROL}" did not fail its own outcome assertion:\n` + out.slice(-2400));
}
if (!new RegExp(`✓.*${other}`).test(out)) {
  abort(`control "${CONTROL}" also broke the unrelated outcome, so its red is not trustworthy:\n` + out.slice(-2400));
}

console.log(`control "${CONTROL}": its outcome failed and the other outcome stayed green, the check works`);
