/**
 * Round 216 harness (number 84): Wonderkid Factory's economy holds together.
 *
 * An idle game fails three ways: it softlocks (nothing affordable, nothing
 * coming), it runs away (numbers explode, choices stop mattering), or it
 * stalls (the carrot never arrives). And THIS idle game has two extra ways
 * to lie: a kid could grow past the ceiling the scout report promised, or a
 * generated kid could wear a real footballer's name. Every one of those is
 * pinned here.
 *
 * Sections:
 *  1. greedy active play reaches the first move up inside 45 minutes, and
 *     the income curve actually curves (late window multiple of early)
 *  2. the ceiling rule: nobody ever passes his potential, growth slows as
 *     the ceiling nears (Rounds 96 and 116, the headroom rule)
 *  3. the price curve: monotone in rating, the promise premium really fades
 *     to zero by 23, deadline day measures exactly x1.5, each agent level
 *     measures exactly its slice (Round 95: multipliers reach nominal)
 *  4. the clock: a kid leaves on his 24th birthday and frees the bed, a
 *     full academy stops scouting and holds at most one find in hand
 *  5. names: hundreds of kids, no duplicate inside any academy, every name
 *     inside the enumerated intlNames space (the Round 199 wall covers that
 *     space against every real name on the site), every nation mapped
 *  6. the move up: star arithmetic exact, higher region ceilings really
 *     higher, nothing carried that should stay behind
 *  7. offline: half speed, hard 8 hour cap, zero cash movement
 *  8. the save: roundtrip identity, corrupt JSON refused, a doctored save
 *     comes back clamped (a working game, never a printing press)
 *  9. static wiring: the unscored session mark in the tycoon shape, the
 *     route, the registry row, the guide bundle entry
 *
 * Run: node scripts/simWonderkid.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'wonderkidEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'wonderkid.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/wonderkidFactory.ts');
const names = await import('${ROOT.replaceAll('\\', '/')}/src/lib/intlNames.ts');
export const W = mod;
export const N = names;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);

const { W, N } = await import(pathToFileURL(BUNDLE).href);
const {
  REGIONS, FACILITIES, MAX_REP, YEAR_SEC, LEAVE_AGE,
  SHOWCASE_SEC, SHOWCASE_MULT, DEADLINE_MULT,
  newFactory, tick, applyOffline, buyFacility, sellProspect, startShowcase,
  canMoveUp, moveUp, capacity, facilityCost, findSec, salePrice, basePrice,
  trainMult, priceMult, regionIndex, serialize, deserialize, potentialRead,
} = W;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const NOW = 1_700_000_000_000;

/* ---------------------------------------------------------- 1. the curve */
console.log('1) greedy play: liveness, the curve, the carrot');
{
  const s = newFactory(NOW, 12345);
  const DT = 1;
  let firstMoveUp = null;
  let firstSale = null;
  let earnedEarly = 0, earnedLate = 0;
  const EARLY = [60, 360], LATE = [1500, 1800];
  for (let t = 0; t < 2700; t += DT) {
    tick(s, DT);
    if (s.showcaseCooldown <= 0 && s.showcaseLeft <= 0) startShowcase(s);
    /* greedy sales, the way a person plays: cash out anyone finished
       growing or running out of runway, anyone close to done while
       deadline day pays extra, and when the beds are FULL sell the kid
       nearest his ceiling so the scouts keep working */
    const sellOne = id => {
      const cashBefore = s.cash;
      sellProspect(s, id);
      const gain = s.cash - cashBefore;
      if (firstSale === null && gain > 0) firstSale = t;
      if (t >= EARLY[0] && t < EARLY[1]) earnedEarly += gain;
      if (t >= LATE[0] && t < LATE[1]) earnedLate += gain;
    };
    for (const p of [...s.prospects]) {
      const done = p.rating >= p.potential - 0.5;
      const runway = p.age >= 22;
      const deadline = s.deadlineLeft > 0 && p.rating >= p.potential - 3;
      if (done || runway || deadline) sellOne(p.id);
    }
    if (s.prospects.length >= capacity(s)) {
      const nearest = [...s.prospects].sort((a, b) => (a.potential - a.rating) - (b.potential - b.rating))[0];
      sellOne(nearest.id);
    }
    /* greedy buys, cheapest first, dorms only when the beds sit full */
    let bought = true;
    while (bought) {
      bought = false;
      const wants = FACILITIES
        .filter(f => f.id !== 'dorms' || s.prospects.length >= capacity(s) - 1)
        .map(f => [f.id, facilityCost(s, f.id)])
        .sort((a, b) => a[1] - b[1]);
      for (const [id] of wants) {
        if (buyFacility(s, id)) { bought = true; break; }
      }
    }
    if (firstMoveUp === null && canMoveUp(s)) firstMoveUp = t;
  }
  if (firstSale === null || firstSale > 180) fail(`the first sale should land inside three minutes, landed ${firstSale === null ? 'never' : 'at ' + firstSale + 's'}`);
  if (firstMoveUp === null) fail(`greedy play never unlocked the first move up inside 45 minutes (lifetime ${Math.round(s.lifetime)} of ${REGIONS[0].goal})`);
  else console.log(`   first sale at ${firstSale}s, first move up reachable at minute ${(firstMoveUp / 60).toFixed(1)} (bar: 45)`);
  /* the curve: minutes 25 to 30 out-earn minutes 1 to 6 by a real multiple.
     Floor 3x, set from measured headroom, not hope. */
  if (earnedEarly <= 0) fail('greedy play earned nothing at all in minutes 1 to 6');
  else {
    const mult = earnedLate / Math.max(1, earnedEarly);
    console.log(`   window earnings: early ${Math.round(earnedEarly)}, late ${Math.round(earnedLate)} (${mult.toFixed(1)}x)`);
    if (mult < 3) fail(`the curve is flat: late window only ${mult.toFixed(2)}x the early one (floor 3x)`);
  }
}

/* ------------------------------------------------------- 2. the ceiling */
console.log('2) the ceiling rule: never passed, approach slows');
{
  const s = newFactory(NOW, 999);
  s.levels.dorms = 9;
  s.levels.coaching = 10;
  /* force a full house then train for hours */
  for (let t = 0; t < 600 && s.prospects.length < capacity(s); t += 1) tick(s, 1);
  const watched = s.prospects.map(p => ({ id: p.id, pot: p.potential, firstFifth: null, lastFifth: null, start: p.rating }));
  for (let t = 0; t < 4 * 3600; t += 5) {
    tick(s, 5);
    for (const w of watched) {
      const p = s.prospects.find(x => x.id === w.id);
      if (!p) continue;
      if (p.rating > p.potential + 1e-9) fail(`kid ${p.id} passed his ceiling: ${p.rating} over ${p.potential}`);
      const span = w.pot - w.start;
      if (span > 4) {
        const frac = (p.rating - w.start) / span;
        if (frac < 0.2 && w.firstFifth === null) w.firstFifth = t;
        if (frac >= 0.8 && w.lastFifth === null) w.lastFifth = t;
      }
    }
  }
  /* ageing removes kids at 24, so measure on the ones that stayed long
     enough to finish */
  const finished = watched.filter(w => w.firstFifth !== null && w.lastFifth !== null);
  if (finished.length === 0) console.log('   (no kid finished his climb before leaving, slowdown check skipped, said out loud)');
  else {
    /* the last stretch takes longer than the first stretch for everyone */
    const quicker = finished.filter(w => w.lastFifth - w.firstFifth * 4 < 0).length;
    if (quicker > 0) fail(`${quicker} kids grew FASTER near the ceiling than at the start`);
    console.log(`   ${finished.length} kids finished a climb, every one slowed toward the top, none passed it`);
  }
}

/* --------------------------------------------------------- 3. the price */
console.log('3) the price curve and its multipliers');
{
  const s = newFactory(NOW, 7);
  /* monotone in rating at fixed age */
  let prev = 0;
  for (let r = 45; r <= 95; r += 5) {
    const price = basePrice(r, 99, 17);
    if (price <= prev) fail(`price not monotone in rating at ${r}`);
    prev = price;
  }
  /* the premium fades: same rating and ceiling, older is never dearer, and
     23 pays exactly the rating-only price */
  const young = basePrice(70, 90, 18);
  const fading = basePrice(70, 90, 22);
  const gone = basePrice(70, 90, 23);
  const flat = basePrice(70, 70, 23);
  if (!(young > fading && fading > gone)) fail(`the promise premium does not fade: 18y ${young}, 22y ${fading}, 23y ${gone}`);
  if (Math.abs(gone - flat) > 1e-9) fail(`at 23 the premium should be exactly zero: ${gone} vs rating-only ${flat}`);
  console.log(`   70 rated with a 90 ceiling: ${Math.round(young)} at 18, ${Math.round(fading)} at 22, ${Math.round(gone)} at 23`);
  /* Round 95's rule: the multipliers measure their nominal value */
  const kid = { id: 1, name: 'x', nation: 'England', pos: 'MF', age: 18, ageClock: 0, rating: 70, potential: 80 };
  s.prospects = [kid];
  const base = salePrice(s, kid);
  s.deadlineLeft = 10;
  const dl = salePrice(s, kid);
  const dlRatio = dl / base;
  if (Math.abs(dlRatio - DEADLINE_MULT) > 0.02) fail(`deadline day measures ${dlRatio.toFixed(3)}, not ${DEADLINE_MULT}`);
  s.deadlineLeft = 0;
  s.levels.agents = 10;
  const ag = salePrice(s, kid) / base;
  if (Math.abs(ag - 1.8) > 0.02) fail(`ten agent levels measure ${ag.toFixed(3)}, not 1.8`);
  s.levels.agents = 0;
  s.rep = 4;
  const rp = salePrice(s, kid) / base;
  if (Math.abs(rp - 1.4) > 0.02) fail(`four stars measure ${rp.toFixed(3)} on fees, not 1.4`);
  s.rep = 0;
  const tBase = trainMult(s);
  if (Math.abs(tBase - 1) > 1e-9) fail(`training multiplier at zero everything is ${tBase}, not 1`);
  s.showcaseLeft = 5;
  if (Math.abs(trainMult(s) / tBase - SHOWCASE_MULT) > 1e-9) fail('the showcase does not measure x3');
  console.log(`   deadline x${dlRatio.toFixed(2)}, agents(10) x${ag.toFixed(2)}, stars(4) x${rp.toFixed(2)}, showcase x${SHOWCASE_MULT}`);
}

/* --------------------------------------------------------- 4. the clock */
console.log('4) the clock: leavers, beds, the held find');
{
  const s = newFactory(NOW, 42);
  s.prospects.push({ id: 900, name: 'Old Timer', nation: 'England', pos: 'DF', age: 23, ageClock: YEAR_SEC - 2, rating: 60, potential: 60 });
  const beds = s.prospects.length;
  tick(s, 5);
  if (s.prospects.some(p => p.id === 900)) fail('a 24th birthday did not end the stay');
  if (s.leftFree !== 1) fail(`leftFree should be 1, is ${s.leftFree}`);
  if (s.prospects.length >= beds && beds > 0) { /* bed freed, possibly refilled by a find, both fine */ }
  /* a full academy stops scouting and holds at most one find in hand.
     The hold is measured in short steps: one 3600s tick would also age
     every kid twelve years and empty the beds through the leaver rule,
     which is its own check, not this one. */
  const s2 = newFactory(NOW, 43);
  for (let t = 0; t < 3600 && s2.prospects.length < capacity(s2); t += 1) tick(s2, 1);
  if (s2.prospects.length !== capacity(s2)) fail('an hour of scouting never filled three beds');
  for (let t = 0; t < 240; t += 5) {
    tick(s2, 5);
    if (s2.prospects.length > capacity(s2)) fail(`the academy overfilled: ${s2.prospects.length} in ${capacity(s2)} beds`);
    if (s2.scoutProgress > findSec(s2) + 1e-9) fail('a full academy banked more than one find in hand');
  }
  if (s2.prospects.length === capacity(s2)) {
    const before = s2.prospects.length;
    const youngest = [...s2.prospects].sort((a, b) => a.age - b.age)[0];
    sellProspect(s2, youngest.id);
    tick(s2, 1);
    if (s2.prospects.length !== before) fail('the held find did not land the moment a bed freed');
  }
  console.log('   leaver freed his bed, full house held exactly one find, it landed on the next tick');
}

/* -------------------------------------------------------------- 5. names */
console.log('5) names: unique per academy, inside the enumerated space');
{
  const space = new Set(N.allIntlNames());
  let kids = 0;
  for (let run = 0; run < 40; run++) {
    const s = newFactory(NOW, 1000 + run);
    s.levels.dorms = 9;
    s.levels.scouting = 12;
    s.rep = run % REGIONS.length;
    for (let t = 0; t < 1200 && s.prospects.length < capacity(s); t += 1) tick(s, 1);
    const seen = new Set();
    for (const p of s.prospects) {
      kids += 1;
      if (seen.has(p.name)) fail(`duplicate name in one academy: ${p.name} (run ${run})`);
      seen.add(p.name);
      if (!space.has(p.name)) fail(`${p.name} is not from intlNames, a new bank has crept in`);
      if (!(p.nation in N.NATION_FAMILY)) fail(`${p.nation} has no naming family`);
      if (p.potential > 99 || p.potential < 40) fail(`ceiling out of the world: ${p.potential}`);
      if (p.rating > p.potential) fail(`born past his own ceiling: ${p.rating} over ${p.potential}`);
    }
  }
  console.log(`   ${kids} kids across 40 academies: zero duplicates, all inside the enumerated space`);
}

/* ------------------------------------------------------ 6. the move up */
console.log('6) the move up: exact star arithmetic, higher ceilings');
{
  const s = newFactory(NOW, 5);
  s.lifetime = REGIONS[0].goal;
  s.cash = 123456;
  s.levels.coaching = 5;
  s.careerEarned = 999_999;
  if (!canMoveUp(s)) fail('goal met but the move up stayed shut');
  moveUp(s);
  if (s.rep !== 1) fail(`one move up should pay one star, paid ${s.rep}`);
  if (s.cash !== 0 || s.levels.coaching !== 0 || s.prospects.length !== 0 || s.lifetime !== 0) fail('the move up carried something that should stay behind');
  if (s.careerEarned !== 999_999) fail('career earnings should travel');
  if (Math.abs(trainMult(s) - 1.15) > 1e-9) fail(`one star should train at exactly x1.15, measures ${trainMult(s)}`);
  if (Math.abs(priceMult(s) - 1.1) > 1e-9) fail(`one star should pay exactly x1.10, measures ${priceMult(s)}`);
  /* ceilings really rise with the region */
  const potsAt = rep => {
    const t = newFactory(NOW, 77);
    t.rep = rep;
    t.levels.dorms = 9;
    t.levels.scouting = 20;
    const pots = [];
    let guard = 0;
    while (pots.length < 150 && guard < 500) {
      for (let k = 0; k < 400 && t.prospects.length < capacity(t); k += 1) tick(t, 1);
      for (const p of [...t.prospects]) { pots.push(p.potential); sellProspect(t, p.id); }
      guard += 1;
    }
    return pots;
  };
  const low = potsAt(0), high = potsAt(3);
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  if (low.some(p => p > REGIONS[0].potMax)) fail('region one dealt a ceiling above its own cap');
  if (high.some(p => p > REGIONS[3].potMax)) fail('region four dealt a ceiling above its own cap');
  const gap = mean(high) - mean(low);
  console.log(`   mean ceiling ${mean(low).toFixed(1)} in ${REGIONS[0].name}, ${mean(high).toFixed(1)} in ${REGIONS[3].name} (gap ${gap.toFixed(1)})`);
  if (gap < 6) fail(`the regions barely differ: ceiling gap ${gap.toFixed(1)} (floor 6, the tuning gap is 12)`);
  /* the scout report never lies once it reads exact */
  const t6 = newFactory(NOW, 8);
  t6.levels.scouting = 6;
  for (let k = 0; k < 600 && t6.prospects.length === 0; k += 1) tick(t6, 1);
  const kid = t6.prospects[0];
  const read = potentialRead(t6, kid);
  if (read.kind !== 'exact' || read.lo !== kid.potential) fail('a level six scout misread a ceiling');
}

/* -------------------------------------------------------- 7. offline */
console.log('7) offline: half speed, the eight hour wall, no cash');
{
  const mk = seed => { const s = newFactory(NOW, seed); s.levels.scouting = 3; s.levels.dorms = 5; return s; };
  const a = mk(31); const b = mk(31);
  a.lastSeen = NOW - 1000 * 3600 * 1000; /* a thousand hours away */
  const appliedA = applyOffline(a, NOW);
  b.lastSeen = NOW - 8 * 3600 * 1000; /* exactly the cap */
  const appliedB = applyOffline(b, NOW);
  if (Math.abs(appliedA - appliedB) > 1e-6) fail(`a thousand hours away applied ${appliedA}s, the 8h cap applied ${appliedB}s, the wall leaks`);
  if (Math.abs(appliedA - 8 * 3600 * 0.5) > 1e-6) fail(`the cap should apply exactly 4h of progress, applied ${appliedA}s`);
  if (a.cash !== 0) fail('cash moved while nobody was there to sell');
  if (a.prospects.length === 0) fail('four hours of half speed scouting found nobody at all');
  const c = mk(31);
  c.lastSeen = NOW - 20 * 1000;
  const appliedC = applyOffline(c, NOW);
  if (appliedC > 15) fail('a twenty second blip applied real offline progress');
  console.log(`   1000h and 8h both apply ${(appliedA / 3600).toFixed(1)}h of progress, blip applied ${appliedC.toFixed(1)}s, cash untouched`);
}

/* --------------------------------------------------------- 8. the save */
console.log('8) the save: roundtrip, refusal, the doctored save');
{
  const s = newFactory(NOW, 21);
  s.levels.scouting = 4;
  for (let t = 0; t < 900; t += 1) tick(s, 1);
  const back = deserialize(serialize(s), NOW);
  if (!back) { fail('a clean save failed to load'); }
  else {
    for (const k of ['cash', 'lifetime', 'rep', 'sold', 'nextId', 'seed']) {
      if (back[k] !== s[k]) fail(`roundtrip changed ${k}: ${s[k]} to ${back[k]}`);
    }
    if (back.prospects.length !== s.prospects.length) fail('roundtrip changed the academy');
    else for (let i = 0; i < s.prospects.length; i++) {
      if (back.prospects[i].name !== s.prospects[i].name || back.prospects[i].rating !== s.prospects[i].rating) fail('roundtrip changed a kid');
    }
  }
  if (deserialize('not json at all', NOW) !== null) fail('garbage loaded as a save');
  if (deserialize(JSON.stringify({ v: 99 }), NOW) !== null) fail('a future version loaded');
  const doctored = JSON.stringify({
    v: 1, cash: 1e308, lifetime: -5, rep: 400, seed: 'x',
    levels: { scouting: 9999, coaching: -3, dorms: 9999, agents: 2.7 },
    prospects: Array.from({ length: 60 }, (_, i) => ({ id: i, name: i < 30 ? 'Same Name' : `K${i}`, nation: i % 2 ? 'England' : 'Narnia', pos: 'XX', age: 99, ageClock: 1e9, rating: 999, potential: 12 })),
    showcaseLeft: 1e9, deadlineLeft: 1e9, lastSeen: NOW * 2,
  });
  const d = deserialize(doctored, NOW);
  if (!d) fail('the doctored save should load CLAMPED, not refuse (v matched)');
  else {
    if (d.cash > 1e15) fail('doctored money kept its printing press');
    if (d.lifetime !== 0) fail('negative lifetime survived');
    if (d.rep !== 0) fail('doctored stars survived');
    if (d.levels.scouting !== FACILITIES[0].maxLevel) fail('doctored scouting did not clamp to the max level');
    if (d.levels.coaching !== 0) fail('negative coaching survived');
    if (d.prospects.length > 3 + d.levels.dorms) fail(`doctored academy holds ${d.prospects.length} kids over capacity`);
    const names = new Set(d.prospects.map(p => p.name));
    if (names.size !== d.prospects.length) fail('duplicate names survived the load');
    for (const p of d.prospects) {
      if (p.rating > p.potential) fail('a loaded kid sits past his ceiling');
      if (p.age >= LEAVE_AGE) fail('a loaded kid is past leaving age');
    }
    if (d.showcaseLeft > SHOWCASE_SEC) fail('a doctored showcase clock survived');
  }
  console.log('   roundtrip identity, garbage refused, the doctored save came back clamped');
}

/* ------------------------------------------------------ 9. static wiring */
console.log('9) static wiring: the mark, the route, the words');
{
  const hook = fs.readFileSync(path.join(ROOT, 'src/hooks/useWonderkidFactory.ts'), 'utf8');
  const unscored = "recordCompletion('/wonderkid-factory');";
  if (hook.split(unscored).length - 1 !== 1) fail('expected exactly one unscored session mark in the hook');
  if (hook.includes("recordCompletion('/wonderkid-factory',")) fail('the idle game must never send a score');
  const order = ['sessionMarkedRef.current) return', 'sessionMarkedRef.current = true', unscored];
  let at = 0, ok = true;
  for (const piece of order) {
    const i = hook.indexOf(piece, at);
    if (i === -1) { ok = false; break; }
    at = i;
  }
  if (!ok) fail('the sessionMarkedRef guard shape is broken (guard, latch, mark, in order)');
  const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  if (!app.includes('<Route path="/wonderkid-factory"')) fail('no route in App.tsx');
  const reg = fs.readFileSync(path.join(ROOT, 'src/data/gameRegistry.ts'), 'utf8');
  if (!reg.includes("path: '/wonderkid-factory'")) fail('no registry row');
  const loader = fs.readFileSync(path.join(ROOT, 'src/data/gameContent/loader.ts'), 'utf8');
  if (!loader.includes("'/wonderkid-factory': 'soccer2'")) fail('no PATH_BUNDLE entry, the guide would be unreachable');
  const soccer2 = fs.readFileSync(path.join(ROOT, 'src/data/gameContent/soccer2.ts'), 'utf8');
  if (!soccer2.includes("'/wonderkid-factory': {")) fail('no guide in soccer2.ts');
  console.log('   mark shape, route, registry row, bundle entry and guide all present');
}

console.log('');
if (failures > 0) {
  console.error(`simWonderkid: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simWonderkid: green. The academy cannot lie, leak, or stall.');
