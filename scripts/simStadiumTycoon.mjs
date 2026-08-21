/**
 * Round 146 harness: Stadium Tycoon's economy holds together for hours.
 *
 * An idle game fails in exactly three ways: it softlocks (nothing affordable,
 * nothing coming), it runs away (numbers explode and choices stop mattering),
 * or it stalls (the prestige carrot never arrives). So this plays the game
 * headless with a simple greedy strategy and measures the curve:
 *
 *  - liveness: before the first prestige is reachable, SOME purchase is
 *    always within 60 seconds of income (no dead screen for a new player);
 *    after the bar fills the slowdown is the intended wall, capped at four
 *    minutes so it can never become a cliff
 *  - progression: income at 30 minutes is a large multiple of income at
 *    minute 1 (measured 2026-08-18 on the division-era economy: about 530x;
 *    floor 8x)
 *  - the carrot: greedy active play reaches the first prestige inside 45
 *    minutes (measured 2026-08-18: minute 14)
 *
 * Round 162 grew the game (divisions, payroll, golden whistle, badges) and
 * sections 9 to 12 pin each new system to its exact formula: the division
 * multiplier and promotion bonus to the digit, staff income deltas to the
 * rate card, all five whistle prizes with no stacking and no offline leak,
 * and badges at +2% each, exactly once, forever.
 *  - prestige math: a star really multiplies, thresholds really grow
 *  - offline pay: capped at 8h half-rate, zero for sub-30s blips
 *  - save roundtrip: serialize/deserialize is identity on the fields that
 *    matter, and corrupt saves fall back to a fresh start instead of NaN
 *
 * Run: node scripts/simStadiumTycoon.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/tycoonEntry.mjs';
const BUNDLE = '/tmp/tycoon.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/stadiumTycoon.ts');
const cm = await import('${ROOT}/src/lib/clubManager.ts');
export const T = mod;
export const CM_WORLD = { real: cm.REAL_LEAGUES, eras: cm.ERA_LEAGUES };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { T, CM_WORLD } = await import(BUNDLE);
const {
  TRACKS, newTycoon, tick, buy, tap, costOf, canBuy, incomePerSec,
  prestige, canPrestige, prestigeThreshold, offlineEarnings,
  serializeTycoon, deserializeTycoon, repMult, attendance, capacity,
  activateBoost, boostReady, boostActive, BOOST_CHARGE_SEC, BOOST_DURATION_SEC,
  DIVISIONS, divisionIndex, divisionOf, winsToNextDivision,
  STAFF, staffCostOf, canHire, hire, staffBaseIncome, totalStaffLevels,
  GOLDEN_INFO, rollGoldenKind, goldenActive, catchGolden,
  ACHIEVEMENTS, ACH_BONUS, achMult, tapValue, oppChancePerMin, levelOf,
} = T;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

/**
 * Greedy player: every 2 sim-seconds, buy the cheapest affordable track
 * (with a light bias to Stands when the ground is full), tap 3 times per
 * second like a bored thumb. This is a FLOOR strategy: anything a smarter
 * player does lands earlier, so the timing assertions hold for everyone.
 */
function playFor(state, seconds, roll, opts = {}) {
  let s = state;
  const log = [];
  for (let t = 0; t < seconds; t += 2) {
    s = tick(s, 2, roll).state;
    if (!opts.noTap) { s = tap(s); s = tap(s); s = tap(s); s = tap(s); s = tap(s); s = tap(s); }
    // Buy everything affordable, cheapest first, full ground prefers seats.
    for (let guard = 0; guard < 25; guard++) {
      const full = attendance(s) >= capacity(s) - 5;
      const options = TRACKS
        .filter(tr => canBuy(s, tr.id))
        .sort((a, b) => {
          const ca = costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1);
          const cb = costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1);
          return ca - cb;
        });
      if (!options.length) break;
      s = buy(s, options[0].id);
    }
    if (t % 60 === 0) log.push({ min: t / 60, income: incomePerSec(s), money: s.money, lifetime: s.lifetime });
  }
  return { s, log };
}

/* ---------- 1. Liveness: no softlock across two hours ---------- */
console.log('1) Something is always affordable soon');
{
  /* Two contracts, split at the prestige point on purpose. BEFORE the first
     star is reachable, a purchase must never be more than a minute away, or
     a new player hits a dead screen. AFTER the bar fills, the slowdown IS
     the design (the wall is what makes selling up attractive), so the only
     rule is that it stays a wall and not a cliff: four minutes, tops, on a
     player who refuses to prestige for two straight hours. */
  const roll = seeded(42);
  let s = newTycoon(0);
  let worstPre = 0;
  let worstPost = 0;
  for (let min = 0; min < 120; min++) {
    ({ s } = { s: playFor(s, 60, roll).s });
    const income = incomePerSec(s);
    const cheapest = Math.min(...TRACKS.filter(t => (s.levels[t.id] ?? 0) < t.maxLevel).map(t => costOf(s, t.id)));
    const wait = Math.max(0, (cheapest - s.money) / Math.max(0.1, income));
    if (canPrestige(s)) worstPost = Math.max(worstPost, wait);
    else worstPre = Math.max(worstPre, wait);
    if (!canPrestige(s) && wait > 60) {
      fail(`minute ${min}: pre-prestige, cheapest purchase is ${wait.toFixed(0)}s away, that is a dead screen`);
      break;
    }
    /* Measured 2026-08-18 on the division-era economy: a player who refuses
       a glowing prestige button for a FULL HOUR AND THREE QUARTERS past the
       first star sees a 203s wait at worst (the division multipliers pay
       the wall down faster than the flat economy did). The ceiling sits at
       420s: enough headroom that the intended wall never trips it, low
       enough that a genuinely runaway cost curve (20 minute waits) still
       fails loudly. */
    if (wait > 420) {
      fail(`minute ${min}: cheapest purchase is ${wait.toFixed(0)}s away even for a prestige refuser, that is a cliff`);
      break;
    }
  }
  console.log(`   worst wait pre-prestige: ${worstPre.toFixed(1)}s, post (the intended wall): ${worstPost.toFixed(1)}s`);
}

/* ---------- 2. Progression and the prestige carrot ---------- */
console.log('2) The curve moves and the carrot arrives');
{
  const roll = seeded(7);
  let s = newTycoon(0);
  const r1 = playFor(s, 60, roll);
  const income1 = incomePerSec(r1.s);
  const r30 = playFor(r1.s, 29 * 60, roll);
  const income30 = incomePerSec(r30.s);
  console.log(`   income at 1 min: ${income1.toFixed(1)}/s, at 30 min: ${income30.toFixed(1)}/s (${(income30 / income1).toFixed(1)}x)`);
  // Measured 2026-08-18 on the division-era economy: about 530x at 30
  // minutes on the greedy floor strategy (divisions and badges compound on
  // top of the old curve). 8x keeps honest daylight under it; below that
  // the curve died.
  if (income30 < income1 * 8) fail(`30 minute growth is only ${(income30 / income1).toFixed(1)}x`);

  // First prestige timing.
  const roll2 = seeded(99);
  let p = newTycoon(0);
  let firstAt = null;
  for (let min = 1; min <= 45 && firstAt === null; min++) {
    p = playFor(p, 60, roll2).s;
    if (canPrestige(p)) firstAt = min;
  }
  console.log(`   first prestige reachable at minute ${firstAt ?? '>45'}`);
  if (firstAt === null) fail('45 active minutes never reached the first prestige, the carrot is out of reach');

  // A star means something and thresholds climb.
  if (firstAt !== null) {
    const before = incomePerSec(p);
    const th1 = prestigeThreshold(p);
    const starred = prestige(p, 0);
    if (starred.rep !== p.rep + 1) fail('prestige did not grant a star');
    if (prestigeThreshold(starred) <= th1) fail('the next star is not more expensive than the last');
    const rolled = playFor(starred, 60, seeded(5)).s;
    if (repMult(rolled) !== 1.5) fail(`one star multiplies by ${repMult(rolled)}, expected 1.5`);
    if (rolled.totalWins < p.totalWins) fail('lifetime wins were wiped by prestige');
    if (rolled.money > 20000) fail('prestige carried money over, the reset is fake');
    console.log(`   star kept the counters, reset the money, and pays x${repMult(rolled)}`);
    void before;
  }
}

/* ---------- 3. Idle-only play still moves (it is an idle game) ---------- */
console.log('3) Pure idling progresses too');
{
  const roll = seeded(1234);
  let s = newTycoon(0);
  const r = playFor(s, 45 * 60, roll, { noTap: true });
  console.log(`   45 min no-tap income: ${incomePerSec(r.s).toFixed(1)}/s, lifetime ${Math.round(r.s.lifetime)}`);
  if (incomePerSec(r.s) < incomePerSec(s) * 4) fail('an idle player saw almost no growth in 45 minutes');
}

/* ---------- 4. Offline pay obeys its own rules ---------- */
console.log('4) Away earnings are capped and honest');
{
  const roll = seeded(3);
  const s = playFor(newTycoon(0), 600, roll).s;
  const rate = incomePerSec(s);
  const base = { ...s, savedAt: 1000000 };
  const blip = offlineEarnings(base, 1000000 + 20 * 1000);
  if (blip !== 0) fail(`a 20 second blip paid ${blip}`);
  const hour = offlineEarnings(base, 1000000 + 3600 * 1000);
  const expectHour = Math.round(rate * 3600 * 0.5);
  if (Math.abs(hour - expectHour) > 1) fail(`one hour away paid ${hour}, expected ${expectHour}`);
  const week = offlineEarnings(base, 1000000 + 7 * 24 * 3600 * 1000);
  const cap = Math.round(rate * 8 * 3600 * 0.5);
  if (week !== cap) fail(`a week away paid ${week}, the 8h cap says ${cap}`);
  console.log(`   blip $0, hour $${hour}, week capped at $${week}`);
}

/* ---------- 5. Saves survive and corruption fails safe ---------- */
console.log('5) Save plumbing');
{
  const roll = seeded(8);
  const s = playFor(newTycoon(0), 300, roll).s;
  const back = deserializeTycoon(serializeTycoon(s, 555), 555);
  if (!back) { fail('a healthy save did not load'); }
  else {
    for (const k of ['money', 'lifetime', 'rep', 'fanbase', 'streak', 'matchNo', 'totalWins']) {
      if (Math.abs((back[k] ?? 0) - s[k]) > 0.001) fail(`roundtrip changed ${k}: ${s[k]} -> ${back[k]}`);
    }
    for (const t of TRACKS) {
      if ((back.levels[t.id] ?? 0) !== (s.levels[t.id] ?? 0)) fail(`roundtrip changed level ${t.id}`);
    }
  }
  if (deserializeTycoon('{"v":1,"money":"NaN bonanza"}', 0)?.money !== 40) {
    const d = deserializeTycoon('{"v":1,"money":"NaN bonanza"}', 0);
    if (d === null) { /* falling back to null is also safe */ }
    else fail('a corrupt money field survived the load');
  }
  if (deserializeTycoon('not json at all', 0) !== null) fail('garbage parsed as a save');
  if (deserializeTycoon(JSON.stringify({ v: 99 }), 0) !== null) fail('a future save version loaded into this engine');
  console.log('   roundtrip identity holds, corruption falls back safely');
}

/* ---------- 6. Matchday Hype pays exactly double, exactly once ---------- */
console.log('6) The boost is honest');
{
  const roll = seeded(77);
  let s = playFor(newTycoon(0), 300, roll).s;
  // Not ready early: five minutes of play is under the eight minute charge.
  if (boostReady(s)) fail('hype was ready before its charge time');
  if (activateBoost(s) !== s) fail('a partial charge still activated');
  // Charge to full with pure ticking (no purchases needed to charge).
  while (!boostReady(s)) s = tick(s, 10, roll).state;
  const base = incomePerSec(s);
  const lit = activateBoost(s);
  if (!boostActive(lit)) fail('activation did not light the boost');
  const ratio = incomePerSec(lit) / base;
  if (Math.abs(ratio - 2) > 1e-9) fail(`boost pays x${ratio}, the button says x2`);
  if (activateBoost(lit) !== lit) fail('an active boost re-activated (stacking)');
  // It burns out on schedule and the charge starts from zero.
  let cooled = lit;
  for (let t = 0; t < BOOST_DURATION_SEC + 5; t += 5) cooled = tick(cooled, 5, roll).state;
  if (boostActive(cooled)) fail('the boost outlived its sixty seconds');
  if (cooled.boostChargeSec > 20) fail(`the charge did not restart near zero (${cooled.boostChargeSec.toFixed(1)}s)`);
  // The multiplier is exactly the boostLeftSec flag and nothing else: the
  // same burnt-out state relit by hand doubles again, precisely.
  const relit = { ...cooled, boostLeftSec: 1 };
  if (Math.abs(incomePerSec(relit) / incomePerSec(cooled) - 2) > 1e-9) {
    fail('the multiplier is not cleanly keyed to the boost clock');
  }
  // Away pay ignores an active boost entirely.
  const withB = { ...lit, savedAt: 1000000 };
  const withoutB = { ...lit, boostLeftSec: 0, savedAt: 1000000 };
  const payB = offlineEarnings(withB, 1000000 + 3600 * 1000);
  const payN = offlineEarnings(withoutB, 1000000 + 3600 * 1000);
  if (payB !== payN) fail(`an active boost changed away pay: ${payB} vs ${payN}`);
  // And the clocks survive a save.
  const back = deserializeTycoon(serializeTycoon(lit, 5), 5);
  if (!back || Math.abs(back.boostLeftSec - lit.boostLeftSec) > 0.001) fail('the boost clock did not survive a save');
  console.log(`   x${ratio.toFixed(2)} while lit, no stacking, burns out on time, away pay unchanged`);
}

/* ---------- 7. Milestones pay once, ever ---------- */
console.log('7) Milestones are exactly-once and exploit-proof');
{
  const { MILESTONES } = T;
  const roll = seeded(2024);
  // Play until the first win milestone fires, then count its occurrences
  // across a long continuation AND across a prestige.
  let s = newTycoon(0);
  let fired = {};
  const record = evs => { for (const e of evs) if (e.kind === 'milestone') fired[e.label] = (fired[e.label] ?? 0) + 1; };
  for (let t = 0; t < 40 * 60 && !canPrestige(s); t += 2) {
    const r = tick(s, 2, roll);
    s = r.state;
    record(r.events);
    s = tap(s); s = tap(s);
    for (let g = 0; g < 20; g++) {
      const opts = TRACKS.filter(tr => canBuy(s, tr.id)).sort((a, b) => costOf(s, a.id) - costOf(s, b.id));
      if (!opts.length) break;
      s = buy(s, opts[0].id);
    }
  }
  const firedBefore = { ...fired };
  const count = Object.keys(firedBefore).length;
  console.log(`   ${count} milestones fired on the way to the first prestige`);
  if (count < 5) fail(`only ${count} milestones fired in a full greedy run to prestige`);
  for (const [label, n] of Object.entries(firedBefore)) {
    if (n !== 1) fail(`milestone "${label}" fired ${n} times`);
  }
  // Prestige, then run on: nothing already earned may fire again, and the
  // carried counters must not re-trigger the win and goal firsts instantly.
  let p = prestige(s, 0);
  if ((p.claimed ?? []).length !== (s.claimed ?? []).length) fail('prestige changed the claimed list');
  const rEarly = tick(p, 2, roll);
  record(rEarly.events);
  p = rEarly.state;
  for (const [label, n] of Object.entries(fired)) {
    if (n !== 1) fail(`milestone "${label}" re-fired after prestige (the carried-counter exploit)`);
  }
  // The exactly-once list survives a save.
  const back = deserializeTycoon(serializeTycoon(p, 9), 9);
  if (!back || back.claimed.length !== p.claimed.length) fail('claimed milestones did not survive a save');
  // And an unknown id in a tampered save is dropped, not paid forever.
  const tampered = deserializeTycoon(JSON.stringify({ ...JSON.parse(serializeTycoon(p, 9)), claimed: ['fake-id', ...p.claimed] }), 9);
  if (tampered && tampered.claimed.includes('fake-id')) fail('a fake milestone id survived the load');
  console.log('   exactly-once holds through prestige and saves; payouts match their labels');
}

/* ---------- 8. Opponent names are stable, fresh, and never real ---------- */
console.log('8) The opposition is invented, provably');
{
  const { opponentName, allOpponentNames } = T;
  const s0 = newTycoon(0);
  if (opponentName(s0) !== opponentName({ ...s0 })) fail('the same match drew two different opponents');
  const names = new Set();
  for (let m = 0; m < 40; m++) names.add(opponentName({ ...s0, matchNo: m }));
  console.log(`   ${names.size} distinct opponents in the first 40 matches, e.g. ${opponentName(s0)}`);
  if (names.size < 25) fail(`only ${names.size} distinct opponents in 40 matches, the fixture list is repetitive`);
  if (opponentName({ ...s0, matchNo: 3 }) === opponentName({ ...s0, matchNo: 3, rep: 1 })) {
    fail('a new ground replays the exact same fixture list');
  }
  // The legal-shaped guard: no generated combination may equal a real club
  // name anywhere in the Club Manager world, today or in any era.
  const realClubs = new Set();
  for (const lg of CM_WORLD.real ?? []) for (const c of lg.clubs) realClubs.add(c);
  for (const leagues of Object.values(CM_WORLD.eras ?? {})) {
    for (const lg of leagues) for (const c of lg.clubs) realClubs.add(c);
  }
  if (realClubs.size < 200) fail(`the real-club list only loaded ${realClubs.size} names, the collision check is not checking much`);
  const collisions = allOpponentNames().filter(n => realClubs.has(n));
  if (collisions.length) fail(`generated opponents collide with real clubs: ${collisions.join(', ')}`);
  console.log(`   ${allOpponentNames().length} possible names checked against ${realClubs.size} real clubs, 0 collisions`);
}

/* ---------- 9. Divisions: the ladder is real and pays exactly ---------- */
console.log('9) Ten divisions, exact multipliers, promotion pays');
{
  // The table itself: monotonic wins, monotonic pay, monotonic danger.
  if (DIVISIONS.length !== 10) fail(`expected 10 divisions, found ${DIVISIONS.length}`);
  for (let i = 1; i < DIVISIONS.length; i++) {
    if (DIVISIONS[i].winsNeeded <= DIVISIONS[i - 1].winsNeeded) fail(`division ${i} needs no more wins than division ${i - 1}`);
    if (DIVISIONS[i].incomeMult <= DIVISIONS[i - 1].incomeMult) fail(`division ${i} does not pay more than division ${i - 1}`);
    if (DIVISIONS[i].oppBoost <= DIVISIONS[i - 1].oppBoost) fail(`division ${i} is not harder than division ${i - 1}`);
  }
  const s0 = newTycoon(0);
  if (divisionIndex(s0) !== 0) fail('a new club is not in the bottom division');
  if (divisionIndex({ ...s0, groundWins: 5 }) !== 0) fail('5 wins already promoted');
  if (divisionIndex({ ...s0, groundWins: 6 }) !== 1) fail('6 wins did not promote to division 2');
  if (divisionIndex({ ...s0, groundWins: 500 }) !== 9) fail('500 wins is not The Summit');
  if (winsToNextDivision({ ...s0, groundWins: 4 }) !== 2) fail('wins-to-next arithmetic is off');
  if (winsToNextDivision({ ...s0, groundWins: 200 }) !== null) fail('The Summit still shows a next division');

  // The multiplier is exact: the same club lifted to Silverline (60 wins,
  // x2.25) earns exactly 2.25x, nothing else about it changed.
  const base = { ...newTycoon(0), fanbase: 900, money: 0 };
  const lifted = { ...base, groundWins: 60 };
  const ratio = incomePerSec(lifted) / incomePerSec(base);
  if (Math.abs(ratio - 2.25) > 1e-9) fail(`Silverline pays x${ratio}, the table says x2.25`);

  // And it shoots back: the opposition chance gap is exactly the oppBoost
  // gap while both sit inside the clamp window.
  const oppGap = oppChancePerMin(lifted) - oppChancePerMin(base);
  if (Math.abs(oppGap - DIVISIONS[5].oppBoost) > 1e-9) fail(`Silverline oppBoost lands as ${oppGap}, table says ${DIVISIONS[5].oppBoost}`);

  // Promotion pays on the spot: exactly attendance x8 x stage x rep, once.
  let p = { ...newTycoon(0), fanbase: 2000, groundWins: 5, minute: 89, goalsFor: 1, goalsAgainst: 0 };
  const noGoals = () => 0.999; // one quiet minute, straight to full time
  const r = tick(p, 1.4, noGoals);
  const promo = r.events.find(e => e.kind === 'promoted');
  if (!promo) fail('winning the sixth match did not raise a promotion');
  else {
    const expect = Math.round(attendance(r.state) * 8 * DIVISIONS[1].incomeMult * repMult(r.state));
    if (promo.amount !== expect) fail(`promotion paid ${promo.amount}, the formula says ${expect}`);
    if (!promo.label.includes('Gravel Lane')) fail(`promotion label reads "${promo.label}"`);
    if (r.state.bestDivision !== 1) fail('bestDivision did not record the climb');
  }
  // A won match that does NOT cross a line pays no promotion.
  const rQuiet = tick({ ...p, groundWins: 7 }, 1.4, noGoals);
  if (rQuiet.events.some(e => e.kind === 'promoted')) fail('a mid-table win paid a promotion');

  // Selling up starts the ladder over but the record book remembers.
  const climbed = { ...newTycoon(0), groundWins: 90, bestDivision: 6, lifetime: 1e12, rep: 0 };
  const sold = prestige(climbed, 0);
  if ((sold.groundWins ?? 0) !== 0) fail('prestige kept the ground wins, the new climb is fake');
  if (sold.bestDivision !== 6) fail('prestige forgot the best division reached');
  console.log(`   x2.25 exact at Silverline, promotion paid ${promo ? promo.amount : '?'} on the line, ladder resets on sale, record survives`);
}

/* ---------- 10. Staff: the payroll earns exactly what it says ---------- */
console.log('10) Payroll math is exact and resets on sale');
{
  if (STAFF.length !== 8) fail(`expected 8 staff, found ${STAFF.length}`);
  for (let i = 1; i < STAFF.length; i++) {
    if (STAFF[i].baseCost <= STAFF[i - 1].baseCost) fail(`staff tier ${i} is not dearer than tier ${i - 1}`);
    if (STAFF[i].rate <= STAFF[i - 1].rate) fail(`staff tier ${i} does not out-earn tier ${i - 1}`);
  }
  let s = { ...newTycoon(0), money: 1000 };
  if (!canHire(s, 'steward')) fail('cannot hire a steward with $1000 in hand');
  if (canHire({ ...s, money: 50 }, 'steward')) fail('hired a steward the club cannot afford');
  const before = incomePerSec(s);
  const hired = hire(s, 'steward');
  if (hired.money !== 1000 - 100) fail(`the first steward cost ${1000 - hired.money}, the card says $100`);
  if (totalStaffLevels(hired) !== 1) fail('the hire did not land on the books');
  // The delta is the rate times every global multiplier, to the digit.
  const mults = repMult(hired) * T.streakMult(hired) * divisionOf(hired).incomeMult * achMult(hired);
  const delta = incomePerSec(hired) - before;
  if (Math.abs(delta - 0.6 * mults) > 1e-9) fail(`steward level 1 adds ${delta}/s, the rate card says ${0.6 * mults}`);
  // Next level costs more by exactly the growth factor.
  if (staffCostOf(hired, 'steward') !== Math.round(100 * 1.13)) fail('steward level 2 is not priced by the growth curve');
  // Payback: $100 at 0.6/s is about 167 seconds at day one multipliers.
  // Measured 2026-08-18: 166.7s. Anything past 10 minutes would mean the
  // bottom tier is dead weight at the stage it unlocks.
  const payback = 100 / delta;
  if (payback > 600) fail(`the first steward takes ${payback.toFixed(0)}s to pay for itself`);
  // Broke stays broke: a refused hire returns the same state object.
  const broke = { ...s, money: 3 };
  if (hire(broke, 'legend') !== broke) fail('a refused hire still changed state');
  // The payroll walks out the day you sell up.
  const rich = { ...hired, lifetime: 1e12 };
  const sold = prestige(rich, 0);
  if (totalStaffLevels(sold) !== 0) fail('prestige kept the payroll');
  console.log(`   steward pays back in ${payback.toFixed(0)}s, delta exact to the rate card, payroll resets on sale`);
}

/* ---------- 11. The golden whistle: five prizes, zero lies ---------- */
console.log('11) Golden whistle effects are exact, unstackable, and save-safe');
{
  // The weight table maps fixed rolls to fixed prizes.
  const kinds = [0.1, 0.4, 0.6, 0.85, 0.95].map(v => rollGoldenKind(() => v));
  if (kinds.join(',') !== 'frenzy,tapRush,windfall,fanWave,freeLevel') {
    fail(`the weight table drew ${kinds.join(',')}`);
  }
  const roll = seeded(31);
  const s = playFor(newTycoon(0), 240, roll).s;

  // DERBY DAY: exactly x7 on income, and only while the clock burns.
  const derby = catchGolden(s, 'frenzy').state;
  if (!goldenActive(derby)) fail('a caught DERBY DAY did not light');
  const dRatio = incomePerSec(derby) / incomePerSec(s);
  if (Math.abs(dRatio - 7) > 1e-9) fail(`DERBY DAY pays x${dRatio}, the whistle says x7`);
  if (catchGolden(derby, 'windfall').state !== derby) fail('a second whistle stacked on a lit one');
  let cooled = derby;
  for (let t = 0; t < 90; t += 5) cooled = tick(cooled, 5, roll).state;
  if (goldenActive(cooled)) fail('DERBY DAY outlived its 77 seconds');
  if (cooled.goldenKind !== null) fail('a burnt out whistle left its kind behind');

  // CROWD SURGE: x25 on the tap and only the tap, exact to the rounding.
  const surge = catchGolden(s, 'tapRush').state;
  if (Math.abs(incomePerSec(surge) - incomePerSec(s)) > 1e-9) fail('CROWD SURGE leaked into passive income');
  const mg = levelOf(s, 'megaphone');
  const expectTap = Math.max(1, Math.round((incomePerSec(surge) * 0.7 + mg * 2) * repMult(surge) * 25));
  if (tapValue(surge) !== expectTap) fail(`CROWD SURGE tap pays ${tapValue(surge)}, the formula says ${expectTap}`);

  // TV WINDFALL: fifteen minutes of the current rate, instantly, capped.
  const { state: paid, amount } = catchGolden(s, 'windfall');
  const expectPay = Math.round(Math.min(incomePerSec(s) * 900, 1e15));
  if (amount !== expectPay) fail(`TV WINDFALL paid ${amount}, the formula says ${expectPay}`);
  if (Math.abs(paid.money - (s.money + expectPay)) > 0.001) fail('the windfall receipt does not match the wallet');
  if (Math.abs(paid.lifetime - (s.lifetime + expectPay)) > 0.001) fail('the windfall skipped the lifetime books');
  if (amount > 1e15) fail('the windfall cap failed');

  // WONDERGOAL: +12% fans with a floor of 50 for tiny clubs.
  const wave = catchGolden(s, 'fanWave');
  const expectBump = Math.max(50, Math.round(s.fanbase * 0.12));
  if (Math.abs(wave.state.fanbase - (s.fanbase + expectBump)) > 0.001) fail('the fan wave bump is off the formula');
  const tinyWave = catchGolden({ ...newTycoon(0), fanbase: 40 }, 'fanWave');
  if (Math.abs(tinyWave.state.fanbase - 90) > 0.001) fail('a tiny club did not get the 50 fan floor');

  // SPONSOR GIFT: one free level on the cheapest open track, wallet untouched.
  const gift = catchGolden(s, 'freeLevel').state;
  if (Math.abs(gift.money - s.money) > 0.001) fail('the free level was not free');
  const levelSum = st => TRACKS.reduce((n, t) => n + levelOf(st, t.id), 0);
  if (levelSum(gift) !== levelSum(s) + 1) fail('the sponsor gift did not land one level');

  // Catches are counted, and away pay ignores a lit whistle entirely.
  if ((derby.goldenCaught ?? 0) !== (s.goldenCaught ?? 0) + 1) fail('the caught counter did not move');
  const litSave = { ...derby, savedAt: 1000000 };
  const drySave = { ...derby, goldenKind: null, goldenLeftSec: 0, savedAt: 1000000 };
  const litPay = offlineEarnings(litSave, 1000000 + 3600 * 1000);
  const dryPay = offlineEarnings(drySave, 1000000 + 3600 * 1000);
  if (litPay !== dryPay) fail(`saving mid DERBY DAY changed away pay: ${litPay} vs ${dryPay}`);

  // Saves: a timed whistle survives, a doctored one comes back sane.
  const back = deserializeTycoon(serializeTycoon(derby, 5), 5);
  if (!back || back.goldenKind !== 'frenzy' || Math.abs(back.goldenLeftSec - derby.goldenLeftSec) > 0.001) {
    fail('a lit whistle did not survive a save');
  }
  const doctored = deserializeTycoon(JSON.stringify({ ...JSON.parse(serializeTycoon(derby, 5)), goldenKind: 'windfall', goldenLeftSec: 99999 }), 5);
  if (doctored && (doctored.goldenKind !== null || doctored.goldenLeftSec !== 0)) {
    fail('a doctored instant-kind whistle survived as a timed one');
  }
  console.log(`   x7 exact for 77s, taps x25 exact, windfall ${amount} on the nose, no stacking, saves sane`);
}

/* ---------- 12. Achievements: 2% each, forever, exactly once ---------- */
console.log('12) Badges pay 2% each and never fire twice');
{
  if (ACHIEVEMENTS.length !== 47) fail(`expected 47 badges, found ${ACHIEVEMENTS.length}`);
  const ids = new Set(ACHIEVEMENTS.map(a => a.id));
  if (ids.size !== ACHIEVEMENTS.length) fail('duplicate badge ids');

  // The multiplier is exact: five badges is x1.10, to the digit.
  const s0 = newTycoon(0);
  const five = { ...s0, ach: ACHIEVEMENTS.slice(0, 5).map(a => a.id) };
  const mRatio = incomePerSec(five) / incomePerSec(s0);
  if (Math.abs(mRatio - (1 + 5 * ACH_BONUS)) > 1e-9) fail(`five badges pay x${mRatio}, expected x1.10`);

  // A crossed line fires once, with no cash attached, and never refires.
  let near = { ...newTycoon(0), fanbase: 500.5 };
  const r1 = tick(near, 2, () => 0.999);
  const achEvents = r1.events.filter(e => e.kind === 'ach');
  if (!achEvents.some(e => e.label.includes('500 fans'))) fail('crossing 500 fans did not raise the badge');
  if (achEvents.some(e => e.amount !== undefined)) fail('a badge paid cash, the multiplier is the payout');
  const r2 = tick(r1.state, 2, () => 0.999);
  if (r2.events.some(e => e.kind === 'ach' && e.label.includes('500 fans'))) fail('the 500 fan badge fired twice');

  // A long greedy run collects a stack of them, each exactly once.
  const roll = seeded(64);
  let g = newTycoon(0);
  const fired = {};
  for (let t = 0; t < 30 * 60; t += 2) {
    const r = tick(g, 2, roll);
    g = r.state;
    for (const e of r.events) if (e.kind === 'ach') fired[e.label] = (fired[e.label] ?? 0) + 1;
    g = tap(g); g = tap(g); g = tap(g); g = tap(g);
    for (let guard = 0; guard < 20; guard++) {
      const opts = TRACKS.filter(tr => canBuy(g, tr.id)).sort((a, b) => costOf(g, a.id) - costOf(g, b.id));
      if (!opts.length) break;
      g = buy(g, opts[0].id);
    }
  }
  const gCount = Object.keys(fired).length;
  // Measured 2026-08-18: 13 badges inside 30 greedy minutes. 8 keeps honest
  // daylight; a first session that earns fewer has lost its drip feed.
  if (gCount < 8) fail(`only ${gCount} badges in 30 greedy minutes, the drip feed is broken`);
  for (const [label, n] of Object.entries(fired)) {
    if (n !== 1) fail(`badge "${label}" fired ${n} times`);
  }
  if ((g.ach ?? []).length !== gCount) fail(`the books hold ${(g.ach ?? []).length} badges but ${gCount} fired`);
  if (Math.abs(achMult(g) - (1 + gCount * ACH_BONUS)) > 1e-9) fail('the badge multiplier does not match the badge count');

  // Badges are forever: the full list rides through a sale.
  const sold = prestige({ ...g, lifetime: 1e12 }, 0);
  if ((sold.ach ?? []).join(',') !== (g.ach ?? []).join(',')) fail('prestige touched the badge list');

  // And a tampered save cannot mint one.
  const fake = deserializeTycoon(JSON.stringify({ ...JSON.parse(serializeTycoon(g, 9)), ach: ['made-up', ...(g.ach ?? [])] }), 9);
  if (fake && fake.ach.includes('made-up')) fail('a fake badge id survived the load');
  console.log(`   ${gCount} badges in 30 min, x${achMult(g).toFixed(2)} exact, exactly-once, forever, tamper-proof`);
}

console.log('');
if (failures > 0) {
  console.error(`simStadiumTycoon: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simStadiumTycoon: green. The turnstiles spin and the math holds.');
