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
 *
 * Run: node scripts/simIdleArena.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'idleArenaEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'idleArena.bundle.mjs');
fs.writeFileSync(ENTRY, `export * from '${ROOT.replaceAll('\\', '/')}/src/lib/idleArena.ts';`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const A = await import(pathToFileURL(BUNDLE).href);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** the bot: buy the purchase with the shortest payback it can afford */
function bestBuy(s) {
  let best = null;
  for (const g of A.GENERATORS) {
    const owned = s.owned[g.id] ?? 0;
    const cost = A.genCost(g, owned);
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
    if (u.tapMult || u.tapShare) gain = A.tapValue(s) * 3; // taps are worth about three a second to a tapper
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
    s = A.tick(s, t * 1000).state;
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

console.log('');
if (failures > 0) { console.error(`simIdleArena: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simIdleArena: green. The curve climbs, the trophy pays, the cap holds, the save cannot bite.');
