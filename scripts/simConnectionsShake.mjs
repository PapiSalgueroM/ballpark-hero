/* Connections shake harness: a wrong guess's timer dies with the component.

   Round 503. The four Connections hooks (NHL, NBA, NFL, Baseball) followed
   a wrong guess with a bare setTimeout(() => setShakeWrong(false), 600)
   that nothing cleared. An unmount inside the window set state on a dead
   component, and the full vitest run printed "window is not defined" at
   random when the callback landed after jsdom was torn down (8 errors on
   one run, 0 on the next two, same code). It never failed the run, so it
   sat as an open bug on the board rather than a fix.

   The check renders the REAL hooks under vitest with fake timers
   (src/hooks/useConnectionsShake.test.ts) and counts live timers: one after
   a miss, still one after a second miss, zero once the shake ends, and
   zero after an unmount mid shake. A source grep for clearTimeout would be
   satisfied by a comment; the timer count cannot be.

   Negative control (house rule: prove the check can fail):
     SIM_CONNECTIONS_SHAKE_CONTROL=bare writes a copy of useNhlConnections.ts
     with the bare timer put back and the cleanup effect removed (the pre
     Round 503 shape) under dist/, points the NHL row at it through
     CONNECTIONS_HOOK_NHL, and the NHL row's two tests must then FAIL on the
     timer count while the other three rows stay green. The control refuses
     to run if either rewrite changed nothing.

   Run: node scripts/simConnectionsShake.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CONNECTIONS_SHAKE_CONTROL || '';
const TEST = 'src/hooks/useConnectionsShake.test.ts';
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

/* The two pieces Round 503 added, verbatim, and what stood there before.
   Each is asserted present before it is replaced. */
const HELD_TIMER = `      if (shakeTimer.current !== null) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => {
        shakeTimer.current = null;
        setShakeWrong(false);
      }, 600);
`;
const BARE_TIMER = `      setTimeout(() => setShakeWrong(false), 600);
`;
const CLEANUP = `  useEffect(() => () => {
    if (shakeTimer.current !== null) clearTimeout(shakeTimer.current);
  }, []);
`;

console.log('1) The real hooks with fake timers: one timer per miss, none after the shake, none after an unmount');
{
  let env = {};
  let copy = null;
  if (CONTROL === 'bare') {
    const src = fs.readFileSync(path.join(ROOT, HOOK), 'utf8').split('\r\n').join('\n');
    if (!src.includes(HELD_TIMER) || !src.includes(CLEANUP)) {
      console.error(`control cannot run: ${HOOK} is not in the shape this control rewrites (update HELD_TIMER and CLEANUP in this file rather than deleting the control)`);
      process.exit(1);
    }
    const regressed = src.replace(HELD_TIMER, BARE_TIMER).replace(CLEANUP, '');
    if (regressed === src) {
      console.error('control cannot run: the rewrite changed nothing');
      process.exit(1);
    }
    /* Under dist/, inside the project root, for the reasons simFootleDaily
       records: vite refuses modules outside the root, and git ignores dist so
       a crashed run cannot leave the copy where tsc would read it. */
    const dir = path.join(ROOT, 'dist', '.connections-shake-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'useNhlConnections.control.ts');
    fs.writeFileSync(copy, regressed);
    env = { CONNECTIONS_HOOK_NHL: copy.replaceAll('\\', '/') };
    console.log('   NEGATIVE CONTROL ON: the NHL row runs against a copy of the hook with the bare timer put back');
  }
  let code;
  let out;
  try {
    ({ code, out } = runVitest(env));
  } finally {
    if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
  if (!out.includes('useConnectionsShake.test.ts')) fail('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${code}, ${summary ? summary[1].trim() : 'no summary line'}`);
  /* One line per test, so the runner can see the checks ran (it reports a
     green harness that prints fewer than four lines as EMPTY) and so a red
     names the row that failed. The SHAKE| lines are the measurements. */
  for (const l of out.split('\n').filter(l => /^\s*[✓×]\s/.test(l))) console.log('   ' + l.trim());
  for (const l of [...out.matchAll(/SHAKE\| (.+)/g)].map(m => m[1].trim()).slice(0, 4)) console.log('     ' + l);
  if (CONTROL === 'bare') {
    /* Proven only when the rewritten hook actually ran: the other three rows
       pass, and the NHL rows fail on the timer count, not on a load error. */
    const othersGreen = /6 passed/.test(out);
    const nhlRed = /2 failed/.test(out) && /NHL Connections/.test(out) && /expected (1|2) to be (0|1)/.test(out);
    if (!othersGreen) { console.error('control cannot run: the NBA, NFL and Baseball rows did not all pass, so the run is broken rather than the check firing:\n' + out.slice(-1500)); process.exit(1); }
    if (nhlRed) fail('on the pre Round 503 shape a timer outlives the miss and the unmount');
  } else {
    if (code !== 0) {
      const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected/.test(l)).slice(0, 8);
      fail('the hook test is red:\n    ' + (lines.length ? lines.join('\n    ') : 'no assertion lines, vitest output tail:\n' + out.slice(-1500)));
    }
    if (!/8 passed/.test(out)) fail(`expected all eight tests to pass, vitest says: ${summary ? summary[1].trim() : 'nothing'}`);
    if (/window is not defined/.test(out)) fail('the run still printed "window is not defined", so a timer fired after teardown');
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
  console.error(`\nsimConnectionsShake: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimConnectionsShake: all green');
