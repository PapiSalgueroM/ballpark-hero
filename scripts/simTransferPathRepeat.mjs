/* Transfer Path owns its no-repeat rule at the hook boundary.

   Round 408. TransferPathBoard already filtered names from its suggestions,
   but addPlayer accepted a repeated player submitted directly. The regression
   test renders the real hook over a small temporal teammate graph, keeps a
   valid move, and checks that both exact and case-insensitive repeats return a
   machine-readable duplicate reason without changing the path.

   NEGATIVE CONTROL: SIM_TRANSFER_PATH_REPEAT_CONTROL=old copies the hook,
   removes the duplicate guard, refuses to continue if that rewrite changes
   nothing, proves the copied hook loads through the same Vitest test, and
   passes only when the duplicate assertion goes red for the expected reason.

   Run: node scripts/simTransferPathRepeat.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useTransferPath.test.ts';
const CONTROL = process.env.SIM_TRANSFER_PATH_REPEAT_CONTROL || '';

if (CONTROL && CONTROL !== 'old') {
  console.error(`SIM_TRANSFER_PATH_REPEAT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

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

function assertionEvidence(output) {
  const lines = output.split('\n');
  const selected = new Set();
  lines.forEach((line, index) => {
    if (/AssertionError|expected/.test(line)) {
      for (let i = Math.max(0, index - 3); i <= Math.min(lines.length - 1, index + 8); i += 1) selected.add(i);
    }
  });
  return [...selected].sort((a, b) => a - b).map(index => lines[index]).join('\n');
}

console.log('1) Transfer Path hook rejects repeated players and preserves valid moves');
let copy = null;
let env = {};
let exitCode = 0;
try {
  if (CONTROL === 'old') {
    const source = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useTransferPath.ts'), 'utf8');
    const guard = "\n    if (chain.some(player => player.toLowerCase() === name.toLowerCase())) {\n      return { ok: false, club: null, reason: 'duplicate' };\n    }\n";
    const regressed = source.replace(guard, '\n');
    if (regressed === source) {
      console.error('control cannot run: useTransferPath.ts has no duplicate guard to remove');
      process.exit(1);
    }
    const dir = path.join(ROOT, 'dist', '.transfer-path-repeat-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'useTransferPath.control.ts');
    fs.writeFileSync(copy, regressed);
    env = { TRANSFER_PATH_HOOK: copy.replaceAll('\\', '/') };
    console.log('   NEGATIVE CONTROL ON: the test runs against a copy without the duplicate guard');
  }

  const result = runVitest(env);
  if (!result.out.includes('useTransferPath.test.ts')) {
    console.error('vitest did not report on the Transfer Path test file, so nothing was checked');
    exitCode = 1;
  } else {
    const summary = result.out.match(/Tests\s+(.+)/);
    console.log(`   vitest exit ${result.code}, ${summary ? summary[1].trim() : 'no summary line'}`);

    if (CONTROL === 'old') {
      if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(result.out)) {
        console.error('control cannot run: the rewritten hook did not load');
        exitCode = 1;
      } else {
        const duplicateRed = /×.*rejects repeating (?:the )?start/.test(result.out);
        const assertionRed = /AssertionError|expected/.test(result.out);
        const observedResult = result.out.match(/CONTROL_OBSERVED_RESULT .+/)?.[0];
        const observedChain = result.out.match(/CONTROL_OBSERVED_CHAIN .+/)?.[0];
        if (!duplicateRed || !assertionRed || !observedResult || !observedChain) {
          console.error('control changed the hook but did not make the duplicate assertion fail');
          exitCode = 1;
        } else {
          console.log(`   ${observedResult}`);
          console.log(`   ${observedChain}`);
          console.log('   RED evidence from the old hook:\n' + assertionEvidence(result.out));
          console.log('simTransferPathRepeat control old: green. The old hook fails the duplicate assertion as expected.');
        }
      }
    } else if (result.code !== 0 || !/2 passed/.test(result.out)) {
      console.error('simTransferPathRepeat: the regression test is not green');
      exitCode = 1;
    }
  }
} finally {
  if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true });
}

if (exitCode !== 0) process.exit(exitCode);
if (CONTROL === 'old') process.exit(0);
console.log('simTransferPathRepeat: green. Valid moves remain valid and repeated players are rejected.');
