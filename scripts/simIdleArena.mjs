/**
 * Round 288 harness: Idle Arena's curve is a curve, its save cannot hurt it,
 * and a trophy is worth lifting.
 *
 * A bot plays the game in node: every second it taps a few times, then buys
 * whatever pays for itself soonest. Three players are run: one who taps six
 * times a second, one who never taps, and one who has already lifted ten
 * trophies. What is measured, against thresholds set from the numbers the
 * first runs produced:
 *
 *   1. PROGRESS. The tapper reaches a million points (the trophy floor) within
 *      the first hour, the pure idler within the first three, and income never
 *      goes down. A curve that stalls is a game people close.
 *   2. THE TROPHY IS WORTH IT. Ten trophies get to a million clearly faster
 *      than none. Otherwise the reset is a trap.
 *   3. OFFLINE IS HONEST. Eight hours away earns exactly the cap at half
 *      rate; a week away earns the same as eight hours.
 *   4. THE SAVE. A round trip through serialize/loadSave is lossless, and
 *      garbage, hostile and partial saves load as a fresh arena or a coerced
 *      one, never as a crash or a NaN.
 *   5. THE NUMBERS READ. fmt covers every magnitude the game can reach.
 *   6. THE TROPHY ROOM (Round 957). Four perks bought with trophies, each a
 *      ladder of three. A veteran fresh from a lift plays four stages (a quick
 *      run tapped to the first trophy, a long run tapped to a hundred-trophy
 *      run, nine nights away, seven days away) and the measure is seconds per
 *      trophy, level one of each perk against keeping its trophies. The engine
 *      has no dice, so the "seeds" are nine players: 30, 60 or 100 trophies
 *      held, tapping 3, 6 or 9 times a second. Checked for every one of them:
 *        (a) each perk speeds up its own stage, band 4% (smallest measured
 *            8.2%, Scouting Network on the long run);
 *        (b) it is the best perk there by 2% (smallest 4.0%, Night Shift over
 *            Scouting Network on nights away);
 *        (c) no perk beats every other at every stage;
 *        (d) each perk is slower than keeping its trophies somewhere, band 0.5%
 *            (smallest 1.2%, Head Start on the long run): a trade, not a gift;
 *        (e) every rung of every ladder beats the rung below at home for a
 *            player holding 60 or 100, band 1% (smallest 2.4%, Night Shift's
 *            third level).
 *      Measured 2026-10-03, 54s for the matrix on a busy machine.
 *   7. OLD SAVES. Saves written by the engine from before the round load into
 *      this one with no perks and the identical rate, tap value, catch up,
 *      prices and lift.
 *
 * Negative controls (IDLE_ARENA_CONTROL), each must turn the run red:
 *   free      Night Shift costs no trophies, so (d) finds a free win.
 *   dominant  Night Shift's rate leaks into the live rate, so (c) finds one
 *             perk best at every stage.
 *   oldsave   a trophy pays 4% instead of 5%, so section 7 finds old saves
 *             scoring less.
 *
 * Run: node scripts/simIdleArena.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.IDLE_ARENA_CONTROL || '';
/* the commit the trophy room was built on: its engine is "a save from before
   the round" for section 6 */
const PRE_ROUND = '64d5be42';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** a control that does not find what it replaces is not a control */
function swap(src, from, to) {
  if (!src.includes(from)) {
    console.error(`  CONTROL DEAD: src/lib/idleArena.ts does not contain ${JSON.stringify(from)}, so the control changes nothing. Refusing to run.`);
    process.exit(2);
  }
  return src.split(from).join(to);
}

/* Round 957: the engine is copied, patched only under a control, and bundled
   from the copy, the simIdleArenaCap shape */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'idleArena-'));
function bundle(name, src) {
  const file = path.join(TMP, `${name}.ts`);
  const out = path.join(TMP, `${name}.bundle.mjs`);
  fs.writeFileSync(file, src);
  execSync(`"${ROOT}/node_modules/.bin/esbuild" "${file}" --bundle --format=esm --platform=node --outfile="${out}" --log-level=error`, { stdio: 'inherit' });
  return import(pathToFileURL(out).href);
}
let engineSrc = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'idleArena.ts'), 'utf8');
if (CONTROL === 'free') {
  engineSrc = swap(engineSrc, "pitch: 'for a night away', cost: [3, 5, 8]", "pitch: 'for a night away', cost: [0, 0, 0]");
  console.log('CONTROL free: Night Shift costs no trophies, so it can never make anything slower. Section 6 must go red.');
} else if (CONTROL === 'dominant') {
  engineSrc = swap(engineSrc, 'let m = 1 + s.trophies * TROPHY_BONUS + s.ach.length * ACHIEVEMENT_BONUS;', 'let m = (1 + s.trophies * TROPHY_BONUS + s.ach.length * ACHIEVEMENT_BONUS) * (awayRate(s) / OFFLINE_RATE);');
  console.log('CONTROL dominant: Night Shift leaks into the live rate, so one perk wins everywhere. Section 6 must go red.');
} else if (CONTROL === 'oldsave') {
  engineSrc = swap(engineSrc, 'export const TROPHY_BONUS = 0.05;', 'export const TROPHY_BONUS = 0.04;');
  console.log('CONTROL oldsave: a trophy pays 4% to make room for the perks, so a save from before the round scores less. Section 6 must go red.');
} else if (CONTROL) {
  console.error(`unknown IDLE_ARENA_CONTROL ${CONTROL}`);
  process.exit(2);
}
const A = await bundle('engine', engineSrc);

/** the bot: buy the purchase with the shortest payback it can afford. A tapper
 *  values a tap upgrade at `tapWorth` taps a second. */
function bestBuy(s, tapWorth = 3) {
  let best = null;
  for (const g of A.GENERATORS) {
    const owned = s.owned[g.id] ?? 0;
    const cost = A.genCost(g, owned, A.growthOf(s, g.id));
    if (cost > s.points) continue;
    const gain = g.baseRate * A.genMult(s, g.id) * A.globalMult(s);
    const payback = cost / gain;
    if (!best || payback < best.payback) best = { kind: 'gen', id: g.id, payback };
  }
  const rate = A.totalRate(s);
  for (const u of A.UPGRADES) {
    if (!A.upgradeAvailable(s, u) || u.cost > s.points) continue;
    let gain = 0;
    if (u.gen && u.genMult) gain = A.genRate(s, A.GENERATORS.find(g => g.id === u.gen)) * (u.genMult - 1);
    if (u.globalMult) gain = rate * (u.globalMult - 1);
    if (u.tapMult || u.tapShare) gain = A.tapValue(s) * tapWorth; // taps are worth about three a second to a tapper
    if (gain <= 0) continue;
    const payback = u.cost / gain;
    if (!best || payback < best.payback) best = { kind: 'up', id: u.id, payback };
  }
  return best;
}

function play({ tapsPerSec, trophies = 0, seconds, stopAt = Infinity, openingTaps = 0 }) {
  let s = A.newState(0);
  s = { ...s, trophies };
  for (let i = 0; i < openingTaps; i++) s = A.tap(s);
  let t = 0;
  let firstMillionAt = null;
  const rates = [];
  let played = 0;
  for (t = 1; t <= seconds; t++) {
    played = t;
    for (let i = 0; i < tapsPerSec; i++) s = A.tap(s);
    /* Round 438: advance the clock at the cadence the hook actually installs.
       A one second step used to be fine and is not any more: a gap that big is
       how the engine now tells a tab nobody is watching from somebody sitting
       there, so driving in second long jumps would measure the away rules and
       call them the game. */
    for (let k = 1; k <= 1000 / A.TICK_MS; k++) s = A.tick(s, (t - 1) * 1000 + k * A.TICK_MS).state;
    for (let guard = 0; guard < 20; guard++) {
      const b = bestBuy(s);
      if (!b) break;
      s = b.kind === 'gen' ? A.buyGen(s, b.id) : A.buyUpgrade(s, b.id);
    }
    if (t % 60 === 0) rates.push(A.totalRate(s));
    if (firstMillionAt === null && s.earned >= A.TROPHY_FLOOR) firstMillionAt = t;
    if (s.earned >= stopAt) break;
    if (!Number.isFinite(s.points) || !Number.isFinite(s.earned)) { fail(`the state went non finite at second ${t}`); break; }
  }
  return { state: s, firstMillionAt, rates, seconds: played, openingTaps };
}

console.log('1) the curve moves, for a tapper and for a pure idler');
const tapper = play({ tapsPerSec: 6, seconds: 3 * 3600, stopAt: 2e10 });
/* the idler is somebody who tapped twenty times to see what happens and then
   left the tab open */
const idler = play({ tapsPerSec: 0, seconds: 6 * 3600, stopAt: 2e10, openingTaps: 20 });
console.log(`   tapper: a million at ${tapper.firstMillionAt === null ? 'never' : A.fmtDuration(tapper.firstMillionAt)}, ${A.fmt(tapper.state.earned)} earned by ${A.fmtDuration(tapper.seconds)}, ${A.fmt(A.totalRate(tapper.state))}/s`);
console.log(`   idler:  a million at ${idler.firstMillionAt === null ? 'never' : A.fmtDuration(idler.firstMillionAt)}, ${A.fmt(idler.state.earned)} earned by ${A.fmtDuration(idler.seconds)}, ${A.fmt(A.totalRate(idler.state))}/s`);
/* measured on the first balanced build: tapper 14m, idler 57m. The floors sit
   at roughly three times those so a retune has room without crying wolf. */
if (tapper.firstMillionAt === null || tapper.firstMillionAt > 45 * 60) fail(`a tapper takes ${tapper.firstMillionAt === null ? 'forever' : A.fmtDuration(tapper.firstMillionAt)} to reach the trophy floor, wanted under 45 minutes`);
if (idler.firstMillionAt === null || idler.firstMillionAt > 3 * 3600) fail(`a pure idler takes ${idler.firstMillionAt === null ? 'forever' : A.fmtDuration(idler.firstMillionAt)} to reach the trophy floor, wanted under 3 hours`);
for (const [name, run] of [['tapper', tapper], ['idler', idler]]) {
  for (let i = 1; i < run.rates.length; i++) if (run.rates[i] < run.rates[i - 1]) { fail(`${name}: income fell between minute ${i} and ${i + 1}`); break; }
  const wantTaps = (name === 'tapper' ? 6 * run.seconds : 0) + run.openingTaps;
  if (run.state.taps !== wantTaps) fail(`${name}: tap count is ${run.state.taps}, expected ${wantTaps}`);
}
/* Reachability, not the bot's taste: the greedy bot keeps buying the cheapest
   payback and can go three hours without a Champion even when it could afford
   five. What has to hold is that a player who saved up could have bought every
   tier several times over inside an evening. */
for (const g of A.GENERATORS) {
  if (tapper.state.earned < g.baseCost * 5) fail(`in ${A.fmtDuration(tapper.seconds)} a tapper earned ${A.fmt(tapper.state.earned)}, not enough to buy five ${g.label}s (${A.fmt(g.baseCost * 5)}), so the top of the squad is out of reach for an evening`);
}

console.log('2) ten trophies are worth having');
const veteran = play({ tapsPerSec: 6, trophies: 10, seconds: 3 * 3600, stopAt: A.TROPHY_FLOOR });
console.log(`   ten trophies: a million at ${veteran.firstMillionAt === null ? 'never' : A.fmtDuration(veteran.firstMillionAt)} against ${A.fmtDuration(tapper.firstMillionAt ?? 0)} with none`);
if (veteran.firstMillionAt === null || tapper.firstMillionAt === null || veteran.firstMillionAt > tapper.firstMillionAt * 0.85) fail('ten trophies do not make the next run at least 15% faster, so lifting is a trap');
{
  const s = { ...tapper.state };
  const gained = A.trophiesFor(s.earned);
  if (gained < 1) fail(`a run that earned ${A.fmt(s.earned)} lifts ${gained} trophies`);
  const after = A.lift(s, 1000);
  if (after.trophies !== s.trophies + gained) fail('lift did not add the trophies');
  if (after.points !== 0 || after.earned !== 0 || after.upgrades.length !== 0 || A.GENERATORS.some(g => after.owned[g.id] !== (g.id === 'ballboy' ? 1 : 0))) fail('lift did not reset the run to a fresh arena (one Ball Boy, nothing else)');
  if (after.allTime !== s.allTime || after.ach.length < s.ach.length) fail('lift threw away the all time total or the achievements');
  if (A.lift({ ...A.newState(0), earned: A.TROPHY_FLOOR - 1 }, 0).trophies !== 0) fail('a run under the floor lifted a trophy');
  if (A.trophiesFor(4 * A.TROPHY_FLOOR) !== 2 || A.trophiesFor(100 * A.TROPHY_FLOOR) !== 10) fail('the trophy formula is not the square root it claims to be');
  console.log(`   ${gained} trophies from ${A.fmt(s.earned)}, reset clean, achievements and all time kept`);
}

console.log('3) offline earning is capped and halved');
{
  const s = { ...tapper.state, lastTick: 0 };
  const rate = A.totalRate(s);
  const eight = A.applyOffline(s, A.OFFLINE_CAP_MS);
  const week = A.applyOffline(s, 7 * 24 * 3600 * 1000);
  const wantEight = rate * (A.OFFLINE_CAP_MS / 1000) * A.OFFLINE_RATE;
  if (Math.abs(eight.earned - wantEight) > 1e-6 * wantEight) fail(`eight hours away earned ${A.fmt(eight.earned)}, expected ${A.fmt(wantEight)}`);
  if (Math.abs(week.earned - eight.earned) > 1e-6 * wantEight) fail(`a week away earned ${A.fmt(week.earned)} against eight hours' ${A.fmt(eight.earned)}, so the cap is not a cap`);
  if (A.applyOffline(s, -5000).earned !== 0) fail('a clock that went backwards earned something');
  console.log(`   eight hours: ${A.fmt(eight.earned)}, a week: ${A.fmt(week.earned)}, backwards clock: 0`);
}

console.log('4) the save round trips and survives hostility');
{
  const s = tapper.state;
  const back = A.loadSave(A.serialize(s), 0);
  if (!back || JSON.stringify(back) !== JSON.stringify(s)) fail('serialize then loadSave is not the identity');
  const hostile = [
    ['garbage', 'not json'], ['null', 'null'], ['array', '[1,2,3]'], ['string', '"hi"'],
    ['negative', JSON.stringify({ v: 1, points: -5, earned: -1, taps: -3 })],
    ['nan', '{"v":1,"points":"NaN","earned":null,"owned":{"striker":"lots"}}'],
    ['unknown upgrade', JSON.stringify({ v: 1, points: 10, upgrades: ['hax', 'sweetspot'], ach: ['fake', 'tap100'] })],
    ['huge', JSON.stringify({ v: 1, points: 1e308, earned: 1e308, owned: { champion: 1e9 } })],
    /* Round 957: a broken perks block resets that block and nothing else */
    ['bad perks', JSON.stringify({ v: 1, points: 10, trophies: 7, perks: { longNight: 99, nightShift: -1, headStart: 'lots', scouting: 1.5, hax: 2 } })],
    ['perks not an object', JSON.stringify({ v: 1, points: 10, trophies: 7, perks: [3, 3] })],
  ];
  for (const [name, raw] of hostile) {
    let out;
    try { out = A.loadSave(raw, 0); } catch (e) { fail(`${name} save threw: ${String(e).slice(0, 60)}`); continue; }
    if (out === null) continue;
    const bad = Object.entries(out).find(([k, v]) => typeof v === 'number' && !Number.isFinite(v));
    if (bad) fail(`${name} save loaded with a non finite ${bad[0]}`);
    if (out.points < 0 || out.taps < 0) fail(`${name} save loaded with a negative number`);
    if (out.upgrades.some(u => !A.UPGRADES.some(x => x.id === u))) fail(`${name} save kept an unknown upgrade`);
    if (out.ach.some(a => !A.ACHIEVEMENTS.some(x => x.id === a))) fail(`${name} save kept an unknown achievement`);
    if (!out.perks || typeof out.perks !== 'object') fail(`${name} save loaded with no perks block`);
    else if (Object.entries(out.perks).some(([id, l]) => !A.PERKS.some(p => p.id === id) || !Number.isInteger(l) || l < 1 || l > A.PERK_MAX)) fail(`${name} save kept a perk that does not exist or a level off the ladder: ${JSON.stringify(out.perks)}`);
    if (name.endsWith('perks') || name.startsWith('perks')) {
      if (out.trophies !== 7 || out.points !== 10) fail(`${name}: a broken perks block took the trophies or the points with it`);
      const want = name === 'bad perks' ? { longNight: A.PERK_MAX, scouting: 1 } : {};
      if (JSON.stringify(out.perks) !== JSON.stringify(want)) fail(`${name}: perks loaded as ${JSON.stringify(out.perks)}, expected ${JSON.stringify(want)}`);
    }
    try { A.totalRate(out); A.tapValue(out); A.tick(out, 1000); } catch (e) { fail(`${name} save crashed the engine: ${String(e).slice(0, 60)}`); }
  }
  console.log(`   round trip identical, ${hostile.length} hostile saves handled`);
}

console.log('5) the numbers read');
{
  const cases = [[0, '0'], [7, '7'], [7.5, '7.5'], [999, '999'], [1000, '1.00K'], [12345, '12.3K'], [999999, '999K'], [1e6, '1.00M'], [2.5e9, '2.50B'], [1e12, '1.00T'], [1e15, '1.00Qa'], [1e18, '1.00Qi'], [NaN, '0']];
  for (const [n, want] of cases) if (A.fmt(n) !== want) fail(`fmt(${n}) = ${A.fmt(n)}, wanted ${want}`);
  if (A.fmtDuration(59) !== '59s' || A.fmtDuration(61) !== '1m 1s' || A.fmtDuration(3661) !== '1h 1m') fail('fmtDuration is off');
  console.log(`   ${cases.length} magnitudes, durations`);
}

console.log('6) the trophy room: every perk is a trade, and none of them wins everywhere');
{
  const HOUR = 3600 * 1000;
  /* the four ways of playing a run, each one the home of one perk */
  const STAGES = [
    { id: 'quick', what: 'a quick run, tapping to the first trophy', target: A.TROPHY_FLOOR },
    { id: 'long', what: 'a long run, tapping to a run worth a hundred trophies', target: 1e10 },
    { id: 'night', what: 'nights away, two minutes of play then eight hours gone, nine times', sessionS: 120, awayMs: 8 * HOUR, cycles: 9 },
    { id: 'day', what: 'days away, two minutes of play then a day gone, seven times', sessionS: 120, awayMs: 24 * HOUR, cycles: 7 },
  ];
  const HOME = { headStart: 'quick', scouting: 'long', nightShift: 'night', longNight: 'day' };
  const HELD = [30, 60, 100];
  const TAPS = [3, 6, 9];
  const LADDER_HELD = [60, 100];

  const spendAll = (s, taps) => {
    for (let guard = 0; guard < 5000; guard++) {
      const b = bestBuy(s, Math.max(taps, 0.01));
      if (!b) break;
      s = b.kind === 'gen' ? A.buyGen(s, b.id) : A.buyUpgrade(s, b.id);
    }
    return s;
  };
  /* one second at the desk, at the hook's real cadence */
  const second = (s, t, taps) => {
    for (let i = 0; i < taps; i++) s = A.tap(s);
    for (let k = 1; k <= 1000 / A.TICK_MS; k++) s = A.tick(s, t + k * A.TICK_MS).state;
    return spendAll(s, taps);
  };
  /** Seconds per trophy. A tapping stage is the time to its target over the
   *  trophies that target lifts; an away stage plays its whole schedule and
   *  divides by the trophies the run has earned (unfloored, so a few percent
   *  more points always reads as a few percent sooner). */
  function pace(s, stage, taps) {
    let t = 0;
    if (stage.cycles) {
      for (let c = 0; c < stage.cycles; c++) {
        for (let k = 0; k < stage.sessionS; k++) { s = second(s, t, taps); t += 1000; }
        s = A.tick(s, t + stage.awayMs).state;
        t += stage.awayMs;
        s = spendAll(s, taps);
      }
      return t / 1000 / Math.sqrt(s.earned / A.TROPHY_FLOOR);
    }
    while (s.earned < stage.target) {
      s = second(s, t, taps);
      t += 1000;
      if (t > 12 * HOUR) return Infinity;
    }
    return t / 1000 / A.trophiesFor(stage.target);
  }
  /** a veteran holding `held` trophies straight after a lift, with `level`
   *  of one perk bought out of them before it, and every badge already won */
  function start(held, perk, level) {
    let pre = { ...A.newState(0), trophies: held - 1, earned: A.TROPHY_FLOOR, ach: A.ACHIEVEMENTS.map(a => a.id) };
    for (let l = 0; l < level; l++) {
      const next = A.buyPerk(pre, perk);
      if (next === pre) return null;
      pre = next;
    }
    return A.lift(pre, 0);
  }
  const pct = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
  const ids = A.PERKS.map(p => p.id);
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(Object.keys(HOME).sort())) fail(`the room sells ${ids.join(', ')} and this harness knows homes for ${Object.keys(HOME).join(', ')}: a perk with no player it is for cannot be checked`);

  /* rel[held][taps][stage][perk] = level one's pace against keeping the trophies, minus one */
  const rel = {};
  const t0 = Date.now();
  for (const held of HELD) for (const taps of TAPS) {
    const key = `${held}/${taps}`;
    rel[key] = {};
    for (const st of STAGES) {
      const base = pace(start(held, ids[0], 0), st, taps);
      rel[key][st.id] = {};
      for (const id of ids) rel[key][st.id][id] = pace(start(held, id, 1), st, taps) / base - 1;
    }
  }
  for (const key of Object.keys(rel)) {
    console.log(`   ${key.padEnd(6)} ${STAGES.map(st => `${st.id}: ${ids.map(id => `${id} ${pct(rel[key][st.id][id])}`).join(' ')}`).join(' | ')}`);
  }
  console.log(`   (held/taps a second, level one of each perk against keeping its trophies; ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  ROOM_CHECKS(rel, { STAGES, HOME, ids, pace, start, LADDER_HELD, TAPS, pct });
}

console.log('7) a save from before the trophy room plays on unchanged');
{
  let oldSrc = '';
  try { oldSrc = execSync(`git show ${PRE_ROUND}:src/lib/idleArena.ts`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { /* reported below */ }
  if (!oldSrc.includes('export function loadSave')) fail(`cannot read the engine from before the round (git show ${PRE_ROUND}:src/lib/idleArena.ts), so there is nothing to compare an old save against`);
  else {
    const OLD = await bundle('preround', oldSrc);
    if ('perks' in OLD.newState(0)) fail(`the engine at ${PRE_ROUND} already has perks, so it is not a save from before the round`);
    /* real pre-round saves: what the old engine itself writes after a tapper's
       run, a veteran's run and a fresh arena, then a hand-built mid game */
    const oldRun = (taps, trophies) => {
      let s = { ...OLD.newState(0), trophies };
      for (let t = 1; t <= 900; t++) {
        for (let i = 0; i < taps; i++) s = OLD.tap(s);
        for (let k = 1; k <= 10; k++) s = OLD.tick(s, (t - 1) * 1000 + k * 100).state;
        for (const g of [...OLD.GENERATORS].reverse()) if (OLD.genCost(g, s.owned[g.id]) <= s.points) s = OLD.buyGen(s, g.id);
        for (const u of OLD.UPGRADES) if (OLD.upgradeAvailable(s, u) && u.cost <= s.points) s = OLD.buyUpgrade(s, u.id);
      }
      return s;
    };
    const saves = [
      ['fresh', OLD.newState(0)],
      ['a tapper, fifteen minutes in', oldRun(6, 0)],
      ['a veteran with twelve trophies', oldRun(4, 12)],
      ['an idler with forty trophies', oldRun(0, 40)],
    ];
    const now = 900_000 + 6 * 3600 * 1000;
    for (const [name, s] of saves) {
      const raw = OLD.serialize(s);
      const was = OLD.loadSave(raw, now);
      const is = A.loadSave(raw, now);
      if (!is) { fail(`${name}: the save no longer loads`); continue; }
      if (JSON.stringify(is.perks) !== '{}') fail(`${name}: a save with no perks field loaded with perks ${JSON.stringify(is.perks)}`);
      const pairs = [
        ['rate', OLD.totalRate(was), A.totalRate(is)],
        ['tap value', OLD.tapValue(was), A.tapValue(is)],
        ['the catch up on load', OLD.applyOffline(was, now).earned, A.applyOffline(is, now).earned],
        ['the next Champion', OLD.genCost(OLD.GENERATORS.at(-1), was.owned.champion), A.genCost(A.GENERATORS.at(-1), is.owned.champion, A.growthOf(is, 'champion'))],
        ['the trophies a lift adds', OLD.lift({ ...was, earned: 9e6 }, now).trophies, A.lift({ ...is, earned: 9e6 }, now).trophies],
        ['the squad a lift leaves', JSON.stringify(OLD.lift({ ...was, earned: 9e6 }, now).owned), JSON.stringify(A.lift({ ...is, earned: 9e6 }, now).owned)],
      ];
      for (const [what, a, b] of pairs) if (a !== b) fail(`${name}: ${what} was ${a} before the round and is ${b} now`);
      console.log(`   ${name.padEnd(32)} rate ${A.fmt(A.totalRate(is)).padStart(7)}, tap ${A.fmt(A.tapValue(is)).padStart(6)}, ${is.trophies} trophies: identical`);
    }
  }
}

/* Section 6's checks. The bands are set from the measured margins written in
   the header, roughly half of the smallest one measured. */
function ROOM_CHECKS(rel, { STAGES, HOME, ids, pace, start, LADDER_HELD, TAPS, pct }) {
  const BAND_HOME = 0.04, BAND_BEST = 0.02, BAND_COST = 0.005, BAND_STEP = 0.01;
  const keys = Object.keys(rel);
  const lo = {};
  const low = (name, x) => { lo[name] = Math.min(lo[name] ?? Infinity, x); };
  for (const key of keys) {
    for (const id of ids) {
      /* (a) it pays where it is meant to */
      const home = HOME[id];
      const gain = -rel[key][home][id];
      low(`${id} at home`, gain);
      if (!(gain >= BAND_HOME)) fail(`${key}: ${id} makes ${home} only ${pct(-gain)} against keeping the trophies, wanted at least ${pct(-BAND_HOME)}: the perk does not pay for the player it is sold to`);
      /* (b) it is the best buy there */
      const rival = Math.min(...ids.filter(o => o !== id).map(o => rel[key][home][o]));
      low(`${id} over the next best at home`, rival - rel[key][home][id]);
      if (!(rel[key][home][id] <= rival - BAND_BEST)) fail(`${key}: at ${home} ${id} is ${pct(rel[key][home][id])} and another perk ${pct(rival)}: it is not the clear pick for its own player`);
      /* (d) it costs something real somewhere */
      const worst = Math.max(...STAGES.map(st => rel[key][st.id][id]));
      low(`${id} worst stage slowdown`, worst);
      if (!(worst >= BAND_COST)) fail(`${key}: ${id} is never slower than keeping its trophies (worst ${pct(worst)}, wanted at least ${pct(BAND_COST)} somewhere): it is a free win, not a trade`);
    }
    /* (c) the brief's own words: no perk beats every other at every stage */
    for (const id of ids) {
      const everywhere = STAGES.every(st => ids.every(o => o === id || rel[key][st.id][id] < rel[key][st.id][o]));
      if (everywhere) fail(`${key}: ${id} beats every other perk at every stage, so the room has one right answer`);
    }
  }
  /* (e) every step of every ladder pays at home, for a player who can afford the ladder */
  for (const held of LADDER_HELD) for (const taps of TAPS) {
    for (const id of ids) {
      const st = STAGES.find(x => x.id === HOME[id]);
      const p = [0, 1, 2, 3].map(l => { const s0 = start(held, id, l); return s0 ? pace(s0, st, taps) : NaN; });
      for (let l = 1; l <= 3; l++) {
        const step = 1 - p[l] / p[l - 1];
        low(`${id} ladder step`, step);
        if (!(step >= BAND_STEP)) fail(`${held}/${taps}: ${id} level ${l} at ${st.id} is ${pct(-step)} against level ${l - 1}: that rung of the ladder is not worth its trophies`);
      }
    }
  }
  /* (f) the worked example the rules and the guide print is this harness's own case */
  {
    const ex = A.ROOM_EXAMPLE;
    const key = `${ex.held}/6`;
    const r = rel[key];
    if (!r) fail(`the worked example holds ${ex.held} trophies, and this harness does not play a player holding that many`);
    else {
      if (!(r.night[ex.perk] <= -BAND_COST)) fail(`the worked example says ${ex.perk} is the better deal overnight at ${ex.held} trophies, and it measures ${pct(r.night[ex.perk])}`);
      if (!(r.quick[ex.perk] >= BAND_COST && r.long[ex.perk] >= BAND_COST)) fail(`the worked example says somebody who sits and taps should keep the trophies, and ${ex.perk} measures ${pct(r.quick[ex.perk])} on a quick run and ${pct(r.long[ex.perk])} on a long one`);
    }
    if (ex.perk !== 'nightShift') fail(`the rules paragraph is written about Night Shift and ROOM_EXAMPLE now names ${ex.perk}`);
    const perk = A.PERKS.find(p => p.id === ex.perk);
    const page = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'IdleArena.tsx'), 'utf8');
    const m = page.match(/With (\d+) trophies, (\d+) spent on ([A-Za-z ]+?) drops the bonus from (\d+)% to (\d+)% but makes a night away pay (\d+)% speed instead of (\d+)%/);
    if (!m) fail('the page no longer carries the trophy room example line this check reads');
    else {
      const want = [ex.held, perk.cost[0], perk.label, Math.round(ex.held * A.TROPHY_BONUS * 100), Math.round((ex.held - perk.cost[0]) * A.TROPHY_BONUS * 100), Math.round(A.NIGHT_SHIFT_RATE[1] * 100), Math.round(A.OFFLINE_RATE * 100)];
      const got = [Number(m[1]), Number(m[2]), m[3], Number(m[4]), Number(m[5]), Number(m[6]), Number(m[7])];
      if (JSON.stringify(got) !== JSON.stringify(want)) fail(`the page's trophy room example says ${JSON.stringify(got)} and the engine gives ${JSON.stringify(want)}`);
    }
    console.log(`   worked example, ${ex.held} trophies and ${ex.perk}: overnight ${r ? pct(r.night[ex.perk]) : '?'}, sitting and tapping ${r ? pct(r.quick[ex.perk]) : '?'} and ${r ? pct(r.long[ex.perk]) : '?'}`);
  }
  console.log(`   smallest margins measured: ${Object.entries(lo).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}`);
  console.log(`   bands: home ${pct(BAND_HOME)}, best by ${pct(BAND_BEST)}, a real cost of ${pct(BAND_COST)}, each ladder step ${pct(BAND_STEP)}`);
}

console.log('');
if (failures > 0) { console.error(`simIdleArena: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simIdleArena: green. The curve climbs, the trophy pays, the cap holds, the save cannot bite.');
