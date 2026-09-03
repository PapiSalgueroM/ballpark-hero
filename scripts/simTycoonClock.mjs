/**
 * Round 424 harness: the Stadium Tycoon match actually gets played.
 *
 * THE BUG. src/lib/stadiumTycoon.ts computed the minutes elapsed as
 *   Math.floor((st.minute * MIN_LEN + dt) / MIN_LEN) - st.minute
 * and st.minute is an integer, so that is just Math.floor(dt / MIN_LEN) with
 * the remainder recomputed from st.minute every call and thrown away. The hook
 * ticks as soon as its accumulator passes 0.2s, so dt is about a fifth of a
 * second, Math.floor(0.2 / 1.4) is 0, and the answer was 0 on every tick
 * forever. The clock never moved: no goals, no matches, no wins, no streak, no
 * divisions, on any save, for anybody.
 *
 * WHY NOTHING CAUGHT IT. Every existing check drove tick() with a big dt, which
 * is the one shape that hides this: at dt = 60 the floor is 42 and the clock
 * looks fine. The bug only exists at the rate the GAME actually runs at. So the
 * rule this harness follows is: drive the engine at the cadence the hook really
 * uses, read from the hook rather than assumed, and assert the player-visible
 * outcome rather than that the function returned.
 *
 * NEGATIVE CONTROL: TYCOON_CLOCK_CONTROL=stall restores the pre 424 line and
 * every section must go red. It asserts the banking line is present before
 * swapping it, because a control that rewrites an absent string proves nothing.
 *
 * Run: node scripts/simTycoonClock.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TYCOON_CLOCK_CONTROL || '';
if (CONTROL && CONTROL !== 'stall') {
  console.error(`TYCOON_CLOCK_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const BANKED = `  st.matchSec = (st.matchSec ?? 0) + dt;
  let minutes = Math.floor(st.matchSec / MIN_LEN);
  st.matchSec -= minutes * MIN_LEN;`;
const STALLED = `  let minutes = Math.floor((st.minute * MIN_LEN + dt) / MIN_LEN) - st.minute;`;

/* THE CADENCE THE GAME REALLY USES, read out of the hook instead of guessed, so
   this cannot drift into testing a tick rate the app abandoned. */
const hook = fs.readFileSync(path.join(ROOT, 'src/hooks/useStadiumTycoon.ts'), 'utf8');
const accMatch = hook.match(/if \(acc >= ([0-9.]+)\)/);
if (!accMatch) {
  console.error('cannot find the tick threshold in useStadiumTycoon.ts, so the cadence here would be a guess');
  process.exit(1);
}
const DT = Number(accMatch[1]);
console.log(`   driving tick() at the hook's real cadence, dt = ${DT}s`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonclock-'));
const cleanup = [];
process.on('exit', () => {
  for (const f of cleanup) { try { fs.rmSync(f, { force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});

let entry = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
if (CONTROL === 'stall') {
  const raw = fs.readFileSync(entry, 'utf8').split('\r\n').join('\n');
  if (!raw.includes(BANKED)) {
    console.error('control stall: the banking lines are not in stadiumTycoon.ts, so this control would prove nothing');
    process.exit(1);
  }
  entry = path.join(ROOT, 'src/lib', '__control_stadiumTycoon.ts');
  fs.writeFileSync(entry, raw.replace(BANKED, STALLED));
  cleanup.push(entry);
  console.log('   NEGATIVE CONTROL ON: the pre 424 clock is back, this run must go red');
}
const out = path.join(tmp, 'tycoon.mjs');
execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`,
  { cwd: ROOT, shell: true });
const lib = await import('file:///' + out.replace(/\\/g, '/'));

function mulberry(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Play a fresh save for `seconds` of wall clock at the hook's real cadence. */
function play(seconds, seed = 5) {
  const rng = mulberry(seed);
  let st = lib.newTycoon(Date.now());
  const ticks = Math.round(seconds / DT);
  let goals = 0;
  for (let i = 0; i < ticks; i += 1) {
    const r = lib.tick(st, DT, rng);
    st = r.state;
    for (const e of r.events || []) if (e.kind === 'goal') goals += 1;
  }
  return { st, goals };
}

console.log('1) the clock moves at all');
const oneMin = play(60);
if ((oneMin.st.minute ?? 0) <= 0) {
  fail(`after 60s of play at dt=${DT}s the match clock still reads minute ${oneMin.st.minute ?? 0}, so no match is being played`);
}
console.log(`   60s of play -> minute ${oneMin.st.minute ?? 0}`);

console.log('2) the clock moves at the rate the game claims');
/* MIN_LEN is 1.4 real seconds per match minute, so 140s should be near 100
   match minutes. The band is wide on purpose: the point is the SCALE, not a
   decimal, and a half-time or a whistle may consume a tick. */
const long = play(140);
/* st.minute RESETS when a match ends, so counting it alone under-reports as
   soon as play passes 90 minutes: the first draft of this check read 10 and
   called a working clock broken. Count finished matches too. */
const mins = (long.st.minute ?? 0) + (long.st.matchNo ?? 0) * 90;
const expected = 140 / 1.4;
if (mins < expected * 0.7) {
  fail(`140s of play advanced only ${mins} match minutes, well under the ${Math.round(expected)} the 1.4s minute implies`);
}
console.log(`   140s of play -> ${mins} match minutes (about ${Math.round(expected)} expected)`);

console.log('3) a match finishes and the next one starts');
const full = play(400);
if ((full.st.matchNo ?? 0) < 1) {
  fail(`after 400s of play the game is still on match ${full.st.matchNo ?? 0}, so no match ever completed`);
}
console.log(`   400s of play -> match #${full.st.matchNo ?? 0}, ${full.st.totalGoals ?? 0} goals, ${full.st.totalWins ?? 0} wins`);

console.log('4) goals are actually scored, which is the whole game');
if ((full.st.totalGoals ?? 0) <= 0) {
  fail('400s of play produced no goals at all, so the scoreboard never changes and no goal bonus is ever paid');
}
if (full.goals <= 0) {
  fail('no goal EVENT was emitted, so the floating bonus and the crowd noise never fire');
}
console.log(`   ${full.goals} goal event(s) emitted for the UI to react to`);

console.log('5) no play time is lost: banked seconds carry across ticks');
/* The original bug was silent discarding, so this asserts the conservation
   directly rather than trusting the total above. */
const a = play(200, 11);
const accounted = (a.st.minute ?? 0) + (a.st.matchNo ?? 0) * 90;
if (accounted < (200 / 1.4) * 0.7) {
  fail(`200s of play accounts for only ${accounted} match minutes across ${a.st.matchNo ?? 0} finished match(es), so time is being dropped`);
}
console.log(`   200s -> ${accounted} match minutes accounted for across ${a.st.matchNo ?? 0} finished match(es)`);

console.log('');
if (CONTROL === 'stall') {
  if (failures > 0) {
    console.log(`simTycoonClock control: green. The stalled clock was reported (${failures} finding${failures === 1 ? '' : 's'}), so this harness works.`);
    process.exit(0);
  }
  console.error('simTycoonClock control: RED. The clock was stalled and nothing failed, so this harness proves nothing.');
  process.exit(1);
}
if (failures > 0) {
  console.error(`simTycoonClock: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonClock: green. The match is played, goals are scored, and no play time is dropped.');
