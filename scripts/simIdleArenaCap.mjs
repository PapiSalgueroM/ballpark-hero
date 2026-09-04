/**
 * Round 438 harness: Idle Arena keeps the two promises it prints.
 *
 * Promise one, the cap. The game tells the player that time away earns at half
 * speed and stops after eight hours, and its own tip says "leave it running
 * before bed, eight hours at half speed is four hours of income you did not
 * have to be there for". Until this round that was only true of a tab that had
 * actually been closed. A tab left open was paid whatever its clock said, at
 * full rate, with no cap at all, so the tick that lands after a hidden, frozen
 * or sleeping tab wakes up credited the whole night at twice the rate a closed
 * tab would have earned and with the cap nowhere in it. Parking a tab beat
 * playing, which is the one thing an idle game cannot afford.
 *
 * Promise two, the trophy example. The Trophy panel and the game's rules copy
 * both stated the inverse of the formula the code runs: "four trophies at four
 * million, nine at nine million" where trophiesFor is the square root, so four
 * million pays two and nine million pays three. The tips copy in the same file
 * said the right thing, so the game contradicted itself.
 *
 * What is measured, all of it against the real engine bundled out of
 * src/lib/idleArena.ts and driven at the real 100ms tick the hook installs:
 *
 *   1. THE CLOCK MEASURED HERE IS THE SHIPPED CLOCK. The hook drives tick off
 *      Date.now every TICK_MS and boots through applyOffline, so the driver
 *      below is not a second implementation of the rule.
 *   2. A LIVE TAB IS PAID IN REAL TIME. Twenty four hours at the real cadence
 *      pays twenty four hours at full rate. The cap must never touch somebody
 *      who is actually there, or the fix is worse than the bug.
 *   3. NO WAY OF BEING AWAY BEATS CLOSING THE TAB. Four shapes of the same
 *      twenty four hour absence (closed, frozen solid, throttled to a minute,
 *      clamped to a second then throttled) all pay the same eight hours at half
 *      rate. This is the section that was red.
 *   4. COMING BACK STARTS A NEW ABSENCE, and staying away does not.
 *   5. THE THRESHOLD HAS MEASURED HEADROOM on both sides.
 *   6. THE TROPHY EXAMPLE REPRODUCES through trophiesFor, in the panel and in
 *      the rules and tips copy.
 *
 * Negative controls, each reproducing the defect this round fixed:
 *   IDLE_CAP_CONTROL=uncapped  puts the old tick back (every gap paid in full at
 *                              full rate) and section 3 must go red.
 *   IDLE_CAP_CONTROL=example   puts "four trophies" back in the panel and section
 *                              6 must go red.
 *
 * Run: node scripts/simIdleArenaCap.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.IDLE_CAP_CONTROL || '';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** a control that does not find what it replaces is not a control */
function swap(src, from, to, what) {
  if (!src.includes(from)) {
    console.error(`  CONTROL DEAD: ${what} does not contain ${JSON.stringify(from)}, so the control changes nothing. Refusing to run.`);
    process.exit(2);
  }
  return src.split(from).join(to);
}

/* ── the real engine, patched only under a control ─────────────────────── */
const ENGINE_SRC_PATH = path.join(ROOT, 'src', 'lib', 'idleArena.ts');
let engineSrc = fs.readFileSync(ENGINE_SRC_PATH, 'utf8');
if (CONTROL === 'uncapped') {
  /* the shipped defect, exactly: tick never takes the away branch, so every gap
     however long is paid in full at full rate */
  engineSrc = swap(engineSrc, 'gap > AWAY_AFTER_MS', 'false', 'src/lib/idleArena.ts');
  console.log('CONTROL uncapped: tick takes the away branch never, the way it did before Round 438.');
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'idleArenaCap-'));
const SRC = path.join(TMP, 'engine.ts');
const BUNDLE = path.join(TMP, 'engine.bundle.mjs');
fs.writeFileSync(SRC, engineSrc);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${SRC}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const A = await import(pathToFileURL(BUNDLE).href);

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** a settled arena: ten of everything, every badge already earned, so the rate
 *  is a constant for the whole run and a payout is a number, not a trend */
function settled() {
  const s = A.newState(0);
  for (const g of A.GENERATORS) s.owned[g.id] = 10;
  s.ach = A.ACHIEVEMENTS.map(a => a.id);
  return s;
}
const RATE = A.totalRate(settled());
const near = (a, b, rel = 1e-8) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

/** drive the clock the way the hook does: one tick per gap, in order */
function run(s, gapsMs) {
  let t = s.lastTick;
  for (const gap of gapsMs) { t += gap; s = A.tick(s, t).state; }
  return s;
}
const repeat = (gap, count) => { const out = new Array(count); out.fill(gap); return out; };

console.log('1) the clock measured here is the clock the hook installs');
{
  const hook = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useIdleArena.ts'), 'utf8');
  const want = [
    ['tick(s, Date.now())', 'the clock advances the real engine off the real time'],
    ['}, TICK_MS);', 'the interval period is TICK_MS, not a number of its own'],
    ['applyOffline(loaded, now)', 'the load path runs the away rule against the saved timestamp'],
  ];
  for (const [needle, why] of want) if (!hook.includes(needle)) fail(`useIdleArena.ts no longer has ${JSON.stringify(needle)}, so ${why} is no longer true and this harness is measuring something the game does not do`);
  console.log(`   hook drives tick(s, Date.now()) every TICK_MS (${A.TICK_MS}ms) and boots through applyOffline`);
  console.log(`   settled arena scores ${A.fmt(RATE)} a second, flat, for every case below`);
}

console.log('2) a live tab is paid in real time, all day');
{
  const live = run(settled(), repeat(A.TICK_MS, DAY / A.TICK_MS));
  const want = RATE * (DAY / 1000);
  console.log(`   24h at the real ${A.TICK_MS}ms cadence (${(DAY / A.TICK_MS).toLocaleString()} ticks): ${A.fmt(live.earned)}, wanted ${A.fmt(want)}`);
  if (!near(live.earned, want)) fail(`somebody who sat there all day earned ${A.fmt(live.earned)} instead of ${A.fmt(want)}: the cap has been let loose on active play, which is worse than the bug it was meant to fix`);
  if (typeof live.awayMs !== 'number') fail('the state carries no awayMs meter, so nothing is counting an absence against the eight hour cap');
  else if (live.awayMs !== 0) fail(`a tab that ticked every ${A.TICK_MS}ms all day banked ${A.fmtDuration(live.awayMs / 1000)} of away time, so somebody sitting there is being treated as gone`);
}

console.log('3) no way of being away beats closing the tab');
{
  const capped = RATE * (A.OFFLINE_CAP_MS / 1000) * A.OFFLINE_RATE;
  /* every one of these is the same twenty four hours away; only the shape of
     what the tab's timer did during it differs */
  const shapes = [
    ['tab closed, one catch up on load', s => A.applyOffline(s, s.lastTick + DAY).state],
    ['tab open, frozen solid, one late tick', s => run(s, [DAY])],
    ['tab open, throttled to a minute a tick', s => run(s, repeat(60_000, DAY / 60_000))],
    ['tab open, a second a tick for five minutes then a minute', s => run(s, [...repeat(1000, 300), ...repeat(60_000, (DAY - 300_000) / 60_000)])],
    ['tab open, ten minutes a tick', s => run(s, repeat(600_000, DAY / 600_000))],
  ];
  let worst = null;
  for (const [label, drive] of shapes) {
    const out = drive(settled());
    console.log(`   ${label.padEnd(58)} ${A.fmt(out.earned).padStart(9)}  (cap says ${A.fmt(capped)})`);
    if (!near(out.earned, capped)) fail(`${label}: 24 hours away earned ${A.fmt(out.earned)}, and the game says eight hours at half speed is ${A.fmt(capped)}`);
    if (worst === null || out.earned > worst.earned) worst = { label, earned: out.earned };
  }
  if (worst && worst.earned > capped * (1 + 1e-8)) fail(`the best way to be away is "${worst.label}" at ${A.fmt(worst.earned)}, which beats closing the tab: parking the game still pays better than playing it`);
}

console.log('4) coming back starts a new absence, staying away does not');
{
  const capped = RATE * (A.OFFLINE_CAP_MS / 1000) * A.OFFLINE_RATE;
  const first = run(settled(), [DAY]);
  const stillAway = run(first, [DAY]);
  const back = run(first, repeat(A.TICK_MS, 600));           // one minute at the desk
  const second = run(back, [DAY]);
  const minute = RATE * 60;
  console.log(`   away a day: ${A.fmt(first.earned)}; away a second day without coming back: +${A.fmt(stillAway.earned - first.earned)}`);
  console.log(`   a minute back at the desk: +${A.fmt(back.earned - first.earned)}; then away another day: +${A.fmt(second.earned - back.earned)}`);
  if (!near(stillAway.earned, first.earned)) fail(`a second day away with nobody coming back earned another ${A.fmt(stillAway.earned - first.earned)}, so the eight hours refills on its own`);
  if (!near(back.earned - first.earned, minute)) fail(`a minute back at the desk paid ${A.fmt(back.earned - first.earned)} instead of ${A.fmt(minute)}`);
  if (!near(second.earned - back.earned, capped)) fail(`the second absence paid ${A.fmt(second.earned - back.earned)} instead of a fresh ${A.fmt(capped)}`);
}

console.log('5) the away threshold has headroom on both sides');
{
  /* Measured in Chromium, a 100ms interval on a live page: worst gap 112ms of
     300 with an idle main thread, 201ms of 271 with a 200ms task blocking the
     main thread every second. Below, every browser clamps a hidden tab's timers
     to at least 1000ms. */
  const LIVE_WORST_MS = 201;
  const HIDDEN_CLAMP_MS = 1000;
  if (typeof A.AWAY_AFTER_MS !== 'number') fail('the engine exports no AWAY_AFTER_MS, so it has no idea which gaps are somebody watching and which are a tab nobody is looking at');
  else {
  console.log(`   AWAY_AFTER_MS is ${A.AWAY_AFTER_MS}: ${(A.AWAY_AFTER_MS / LIVE_WORST_MS).toFixed(1)}x the ${LIVE_WORST_MS}ms measured live worst, ${((1 - A.AWAY_AFTER_MS / HIDDEN_CLAMP_MS) * 100).toFixed(0)}% under the ${HIDDEN_CLAMP_MS}ms hidden clamp`);
  if (A.AWAY_AFTER_MS < LIVE_WORST_MS * 3) fail(`AWAY_AFTER_MS is ${A.AWAY_AFTER_MS}ms against a measured live worst of ${LIVE_WORST_MS}ms, under three times headroom, so a janky frame gets paid as an absence`);
  if (A.AWAY_AFTER_MS >= HIDDEN_CLAMP_MS) fail(`AWAY_AFTER_MS is ${A.AWAY_AFTER_MS}ms, at or above the ${HIDDEN_CLAMP_MS}ms every browser clamps a hidden tab to, so a backgrounded tab is paid as if somebody were watching it`);
  for (const gap of [A.TICK_MS, 112, LIVE_WORST_MS, A.AWAY_AFTER_MS]) {
    const out = run(settled(), repeat(gap, Math.floor(HOUR / gap)));
    const want = RATE * (Math.floor(HOUR / gap) * gap / 1000);
    if (!near(out.earned, want)) fail(`an hour of ${gap}ms gaps paid ${A.fmt(out.earned)} instead of ${A.fmt(want)}: a live tab at that cadence is being docked`);
  }
  const justOver = run(settled(), repeat(A.AWAY_AFTER_MS + 1, 100));
  if (!near(justOver.earned, RATE * (100 * (A.AWAY_AFTER_MS + 1) / 1000) * A.OFFLINE_RATE)) fail(`a gap one millisecond over the threshold was not paid as away time`);
  console.log(`   live cadences up to ${A.AWAY_AFTER_MS}ms paid in full; one millisecond over is away time`);
  }
}

console.log('6) the trophy example reproduces through the real formula');
{
  const WORD = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const W = Object.keys(WORD).filter(w => w !== 'a').join('|');
  const pairs = [];
  const add = (where, count, millions) => pairs.push({ where, count, millions });

  let page = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'IdleArena.tsx'), 'utf8');
  if (CONTROL === 'example') {
    page = swap(page, 'two trophies', 'four trophies', 'src/pages/IdleArena.tsx');
    console.log('CONTROL example: the panel says "four trophies" again, the way it did before Round 438.');
  }
  const world = fs.readFileSync(path.join(ROOT, 'src', 'data', 'gameContent', 'world.ts'), 'utf8');
  const arena = world.slice(world.indexOf("'/idle-arena'"), world.indexOf("'/idle-arena'") + 6000);

  /* the panel: "two trophies at {fmt(4 * TROPHY_FLOOR)}" */
  for (const m of page.matchAll(new RegExp(`\\b(${W})\\b(?:\\s+troph(?:y|ies))?\\s+at\\s*\\{fmt\\((\\d+)\\s*\\*\\s*TROPHY_FLOOR\\)\\}`, 'gi'))) {
    add('the Trophy panel', WORD[m[1].toLowerCase()], Number(m[2]));
  }
  const firstOne = page.match(/\b(one)\s+trophy\s+for\s+the\s+first\s*\{fmt\(TROPHY_FLOOR\)\}/i);
  if (firstOne) add('the Trophy panel', 1, 1);
  /* the rules copy: "One trophy at a million, two at four million" */
  for (const m of arena.matchAll(new RegExp(`\\b(${W})\\b(?:\\s+troph(?:y|ies))?\\s+at\\s+(a|${W})\\s+million`, 'gi'))) {
    add('the rules copy', WORD[m[1].toLowerCase()], WORD[m[2].toLowerCase()]);
  }
  /* the tips copy: "Four million pays two", and the page's own worked example:
     "A run that earns four million lifts two trophies" */
  for (const m of arena.matchAll(new RegExp(`\\b(${W})\\s+million\\s+(?:pays|lifts)\\s+(${W})\\b`, 'gi'))) {
    add('the tips copy', WORD[m[2].toLowerCase()], WORD[m[1].toLowerCase()]);
  }
  for (const m of page.matchAll(new RegExp(`\\b(${W})\\s+million\\s+(?:pays|lifts)\\s+(${W})\\b`, 'gi'))) {
    add('the worked example', WORD[m[2].toLowerCase()], WORD[m[1].toLowerCase()]);
  }

  const seen = {};
  for (const p of pairs) seen[p.where] = (seen[p.where] ?? 0) + 1;
  console.log(`   ${pairs.length} worked numbers found: ${Object.entries(seen).map(([k, v]) => `${v} in ${k}`).join(', ')}`);
  for (const [where, least] of [['the Trophy panel', 3], ['the rules copy', 3], ['the tips copy', 2], ['the worked example', 1]]) {
    if ((seen[where] ?? 0) < least) fail(`${where} states ${seen[where] ?? 0} worked trophy numbers, expected at least ${least}: the example this check exists to police has gone missing rather than got better`);
  }
  for (const p of pairs) {
    const real = A.trophiesFor(p.millions * A.TROPHY_FLOOR);
    if (real !== p.count) fail(`${p.where} says ${p.millions} million pays ${p.count} troph${p.count === 1 ? 'y' : 'ies'}, and trophiesFor pays ${real}`);
  }
  if (A.trophiesFor(A.TROPHY_FLOOR) !== 1 || A.trophiesFor(4 * A.TROPHY_FLOOR) !== 2 || A.trophiesFor(9 * A.TROPHY_FLOOR) !== 3) fail('trophiesFor is not the square root the copy describes');
  console.log(`   every one of them matches trophiesFor: 1M pays ${A.trophiesFor(A.TROPHY_FLOOR)}, 4M pays ${A.trophiesFor(4 * A.TROPHY_FLOOR)}, 9M pays ${A.trophiesFor(9 * A.TROPHY_FLOOR)}`);
}

console.log('');
if (failures > 0) { console.error(`simIdleArenaCap: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simIdleArenaCap: green. Being there pays in real time, being away pays eight hours at half speed however the tab was left, and the trophy example is the formula.');
