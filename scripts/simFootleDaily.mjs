/* Footle daily harness: the answer comes from the pool that actually loaded.

   Round 384. useDailyPuzzle leaves `puzzles` out of its selection memo on
   purpose and takes the real selection through supabasePuzzle. Round 365
   wired that into four hooks and missed useGame.ts, which passed a pool
   DERIVED FROM STATE as `puzzles`. The memo ran once against the 748 entry
   fallback file and never again when the live pool arrived, so every daily
   answer came from the file. Measured 2026-09-01 before the fix: the live
   pool held 1,507 players to the file's 748, the insane tier 1,200 to 326,
   today's answer was Ben Seghir from the file and Savinho from the live
   pool, and all of the next 30 days differed.

   simDailyPuzzleContract is a source check and it missed this on purpose:
   it looked for useState names and dailyPool is a useMemo. Round 384
   widened it, but a source check can only ever find the shapes someone has
   thought of. Section 1 here is different in kind: it renders the REAL hook
   under vitest with the fetch mocked to a pool the file cannot contain and
   asserts the target is drawn from it. The wiring is the defect, so the
   wiring is what is tested. The test itself is src/hooks/useGame.test.ts.

   Section 2 reads the live pool and records the headroom the fix buys:
   every tier's live pool must hold names the file does not. Floors sit far
   under the measured values (easy 33, hard 161, insane 1,173 live-only).
   When the database cannot be reached this section says so and is skipped,
   because section 1 is the promise and it needs no network.

   Negative control (house rule: prove the check can fail):
     SIM_FOOTLE_DAILY_CONTROL=freeze writes a copy of useGame.ts rewritten
     to its pre-Round-384 shape (puzzles: dailyPool, no supabasePuzzle) into
     the temp directory, points the test at it through FOOTLE_HOOK, and the
     first test must then FAIL. The control refuses to run if the rewrite
     changed nothing.

   Run: node scripts/simFootleDaily.mjs
*/
import { spawnSync, execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_FOOTLE_DAILY_CONTROL || '';
const TEST = 'src/hooks/useGame.test.ts';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

function runVitest(extraEnv) {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

console.log('1) The real hook, rendered: the daily target is drawn from the fetched pool');
{
  let env = {};
  let copy = null;
  if (CONTROL === 'freeze') {
    const src = fs.readFileSync(path.join(ROOT, 'src/hooks/useGame.ts'), 'utf8');
    let regressed = src.replace(/\n\s*supabasePuzzle: todaysTarget,\n\s*getPuzzleId: \(p\) => p\.name,/, '');
    regressed = regressed.replace(/puzzles: players,/, 'puzzles: dailyPool,');
    if (regressed === src || /supabasePuzzle: todaysTarget/.test(regressed) || !/puzzles: dailyPool,/.test(regressed)) {
      console.error('control cannot run: useGame.ts is not in the shape this control rewrites');
      process.exit(1);
    }
    /* Inside the project root, because vite refuses to load a module from
       anywhere else (a temp directory copy failed with "does the file
       exist", which made the control red for the wrong reason). Under dist,
       because git ignores it and a crashed run cannot leave a hook copy
       where tsc or the contract fence would read it. Removed again below
       whatever happens. */
    const dir = path.join(ROOT, 'dist', '.footle-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'useGame.control.ts');
    fs.writeFileSync(copy, regressed);
    env = { FOOTLE_HOOK: copy.replaceAll('\\', '/') };
    console.log('   NEGATIVE CONTROL ON: the test runs against a copy of the hook in its pre-Round-384 shape');
  }
  let code;
  let out;
  try {
    ({ code, out } = runVitest(env));
  } finally {
    if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
  if (!out.includes('useGame.test.ts')) fail('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${code}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (CONTROL === 'freeze') {
    /* The control is only proven when the rewritten hook actually ran: the
       reload test must still pass on it, and the pool test must fail on its
       assertion. A copy that failed to load is a load error, not a finding. */
    const loaded = /✓.*keeps a saved board across a reload/.test(out);
    if (!loaded) { console.error('control cannot run: the rewritten hook did not load, so any red is a load error and not the check:\n' + out.slice(-1500)); process.exit(1); }
    const assertionRed = /×.*is drawn from the fetched pool/.test(out) && /AssertionError|expected/.test(out);
    if (assertionRed) {
      const line = out.split('\n').find(l => /expected/.test(l)) || '';
      fail('on the pre-Round-384 shape the target comes from the file: ' + line.trim());
    }
  } else {
    if (code !== 0) {
      const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected/.test(l)).slice(0, 8);
      fail('the hook test is red:\n    ' + lines.join('\n    '));
    }
    if (!/2 passed/.test(out)) fail(`expected both tests to pass, vitest says: ${summary ? summary[1].trim() : 'nothing'}`);
  }
}

console.log('2) The live pool holds players the file does not, on every tier');
{
  const ENTRY = path.join(os.tmpdir(), 'footleDailyEntry.mjs');
  const BUNDLE = path.join(os.tmpdir(), 'footleDaily.bundle.mjs');
  fs.writeFileSync(ENTRY, `
export { fetchFootlePlayerPool } from '${ROOT_URL}/src/lib/fetchFootlePlayerPool.ts';
export { players } from '${ROOT_URL}/src/data/players.ts';
export * as du from '${ROOT_URL}/src/lib/dateUtils.ts';
`);
  execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const { fetchFootlePlayerPool, players, du } = await import(pathToFileURL(BUNDLE).href);
  let live = [];
  try { live = await fetchFootlePlayerPool(); } catch { live = []; }
  if (live.length === 0) {
    console.log('   SKIPPED: the live pool could not be read (fetchFootlePlayerPool returned nothing), section 1 stands on its own');
  } else {
    const today = du.getTodayET();
    const tier = du.getDailyTier(today);
    console.log(`   file ${players.length}, live ${live.length}, today ${today} is a ${tier} day`);
    const FLOOR = { easy: 10, hard: 40, insane: 300 };
    for (const t of ['easy', 'hard', 'insane']) {
      const fileNames = new Set(players.filter(p => p.difficulty === t).map(p => p.name));
      const liveTier = live.filter(p => p.difficulty === t);
      const onlyLive = liveTier.filter(p => !fileNames.has(p.name)).length;
      console.log(`   ${t}: file ${fileNames.size}, live ${liveTier.length}, live only ${onlyLive}`);
      if (liveTier.length === 0) fail(`${t}: the live pool has no players on this tier, so a ${t} day would fall back to the file`);
      if (onlyLive < FLOOR[t]) fail(`${t}: only ${onlyLive} live players are missing from the file (floor ${FLOOR[t]}), the fetch or the tiering changed`);
    }
    const pool = live.filter(p => p.difficulty === tier);
    const filePool = players.filter(p => p.difficulty === tier);
    const a = filePool[du.dailyIndex(today, filePool.length)];
    const b = pool[du.dailyIndex(today, pool.length)];
    console.log(`   today via the file would be ${a ? a.name : 'nobody'}; via the live pool it is ${b ? b.name : 'nobody'}`);
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
  console.error(`\nsimFootleDaily: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimFootleDaily: all green');
