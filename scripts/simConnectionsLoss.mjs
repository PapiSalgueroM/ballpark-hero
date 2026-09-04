/* Connections loss harness: a loss reports the groups the player found.

   Round 425. NHL, NBA and NFL Connections counted solvedGroups.length, and
   that list is padded with the unsolved groups when the last life goes so
   the board can reveal them, so every loss read 4/4 on the counter, the
   result line and the copied score card. Part two found the same padding
   on the unlimited side of all four hooks (Baseball included) and a result
   line on the Baseball page that read the padded list through an operator
   precedence slip, and fixed both.

   The check renders the REAL hooks under vitest
   (src/hooks/useConnectionsLoss.test.ts): a daily loss with one group
   found, a reload after it, an unlimited loss with one group found, and
   the next unlimited puzzle. A source check could only find the shapes
   somebody had already thought of; this reads the value the pages print.

   Negative control (house rule: prove the check can fail):
     SIM_CONNECTIONS_LOSS_CONTROL=pad writes a copy of useNhlConnections.ts
     rewritten to count the padded list (the pre-Round-425 shape) under
     dist/, points the NHL row at it through CONNECTIONS_HOOK_NHL, and the
     NHL row's two tests must then FAIL on their foundGroups assertion while
     the other three rows stay green. The control refuses to run if the
     rewrite changed nothing.

   Run: node scripts/simConnectionsLoss.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CONNECTIONS_LOSS_CONTROL || '';
const TEST = 'src/hooks/useConnectionsLoss.test.ts';
const HOOK = 'src/hooks/useNhlConnections.ts';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

function runVitest(extraEnv) {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=verbose', TEST],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

console.log('1) The real hooks, rendered: a loss counts the groups the player found, in both modes');
{
  let env = {};
  let copy = null;
  if (CONTROL === 'pad') {
    const src = fs.readFileSync(path.join(ROOT, HOOK), 'utf8');
    const from = /const foundGroups = mode === 'daily' \? dailySolvedGroups\.length : unlimitedSolvedGroups\.length;/;
    const regressed = src.replace(from, 'const foundGroups = solvedGroups.length;');
    if (regressed === src || !/const foundGroups = solvedGroups\.length;/.test(regressed)) {
      console.error('control cannot run: useNhlConnections.ts is not in the shape this control rewrites');
      process.exit(1);
    }
    /* Under dist/, inside the project root, for the reasons simFootleDaily
       records: vite refuses modules outside the root, and git ignores dist so
       a crashed run cannot leave the copy where tsc would read it. */
    const dir = path.join(ROOT, 'dist', '.connections-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'useNhlConnections.control.ts');
    fs.writeFileSync(copy, regressed);
    env = { CONNECTIONS_HOOK_NHL: copy.replaceAll('\\', '/') };
    console.log('   NEGATIVE CONTROL ON: the NHL row runs against a copy of the hook that counts the padded list');
  }
  let code;
  let out;
  try {
    ({ code, out } = runVitest(env));
  } finally {
    if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
  if (!out.includes('useConnectionsLoss.test.ts')) fail('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${code}, ${summary ? summary[1].trim() : 'no summary line'}`);
  /* One line per test, so the runner can see the checks ran (it reports a
     green harness that prints fewer than four lines as EMPTY) and so a red
     names the row and the mode that failed. */
  for (const l of out.split('\n').filter(l => /^\s*[✓×]\s/.test(l))) console.log('   ' + l.trim());
  if (CONTROL === 'pad') {
    /* Proven only when the rewritten hook actually ran: the other three rows
       pass, and the NHL rows fail on the assertion, not on a load error. */
    const othersGreen = /6 passed/.test(out);
    const nhlRed = /2 failed/.test(out) && /NHL Connections/.test(out) && /expected 4 to be 1/.test(out);
    if (!othersGreen) { console.error('control cannot run: the NBA, NFL and Baseball rows did not all pass, so the run is broken rather than the check firing:\n' + out.slice(-1500)); process.exit(1); }
    if (nhlRed) fail('on the pre-Round-425 shape a loss counts the padded list: expected 4 to be 1');
  } else {
    if (code !== 0) {
      const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected/.test(l)).slice(0, 8);
      /* A red with no assertion in it is vitest itself failing (a crash, a
         port, a cache collision), which needs the raw tail to diagnose. */
      fail('the hook test is red:\n    ' + (lines.length ? lines.join('\n    ') : 'no assertion lines, vitest output tail:\n' + out.slice(-1500)));
    }
    if (!/8 passed/.test(out)) fail(`expected all eight tests to pass, vitest says: ${summary ? summary[1].trim() : 'nothing'}`);
  }
}

if (CONTROL) {
  if (failures > 0) {
    console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`);
    process.exit(0);
  }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}

if (failures > 0) {
  console.error(`\nsimConnectionsLoss: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimConnectionsLoss: all green');
