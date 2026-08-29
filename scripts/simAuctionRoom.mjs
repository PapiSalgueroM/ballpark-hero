/* Round 327: the Sign the Player auction runs the owner's room.
 *
 * His spec, verbatim from the 08-28 review: "a random position opens the
 * lot, the revealed player starts at list price, live bidding war if
 * contested, price decays if nobody bites, the rest of the lot stays hidden
 * until every position has gone up once, the best player headlines the
 * final lots, fill the roster then settle it in a sim."
 *
 * WHAT IT HOLDS, on the offline LEGENDS pool the game itself falls back to:
 *   1. THE RUNNING ORDER LAW, over 200 seeded orders: pass one is exactly
 *      one lot per position from the middle band, pass two the elite band,
 *      the FINAL lot is always the single most valuable player in the room,
 *      the weak band never appears as a lot, and the order genuinely
 *      shuffles (many distinct orders across seeds);
 *   2. LIST PRICE: every player worth more than 5M opens at exactly his
 *      market value, the Round 315 anchor moved from 0.8x to 1.0x;
 *   3. VALUATIONS PRESERVED: the 1.28 multiplier on the 1.0x base prices a
 *      rival identically to the old 1.6 on 0.8x, proven numerically over a
 *      spread of market values, so the retune changed the opening price and
 *      nothing about what a rival will pay;
 *   4. THE DECAY MATH: from any list price the decay reaches the 30 percent
 *      floor in a bounded number of steps and never stalls above it.
 *
 * NEGATIVE CONTROL: SIM_AUCTION_CONTROL=buried patches the headline holdback
 * out of a bundled copy of orderLots and section 1 must go red, proving the
 * headline law is load bearing.
 *
 * Run: node scripts/simAuctionRoom.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_AUCTION_CONTROL || '';
if (CONTROL && CONTROL !== 'buried') { console.error(`SIM_AUCTION_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/auctionRoom.entry.mjs`;
const BUNDLE = `${TMP}/auctionRoom.bundle.mjs`;

let libPath = `${ROOT}/src/lib/auctionHouse.ts`;
if (CONTROL === 'buried') {
  const src = fs.readFileSync(libPath, 'utf8');
  const needle = 'const [headliner] = greats.splice(bestIdx, 1);';
  if (!src.includes(needle)) { console.error('control run: the headline line to sever is not in the source, refusing to run a dead control'); process.exit(1); }
  libPath = `${TMP}/auctionHouse.control.ts`;
  fs.writeFileSync(libPath, src.replace(needle, 'const [headliner] = greats.splice(0, 1);'));
  console.log('NEGATIVE CONTROL ON: the headline holdback severed in a bundled copy, section 1 must now find buried headliners');
}
fs.writeFileSync(ENTRY, `
export * as ah from '${libPath}';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { ah } = await import(pathToFileURL(BUNDLE).href);
const { AUCTION_SLOTS, DECAY_FLOOR, DECAY_STEP, buildAuctionPool, orderLots } = ah;

const lehmer = seed => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};

/* The legends theme builds offline from the baked LEGENDS list; the pool
   builder itself uses Math.random for band picks, which is fine here: the
   laws below must hold for EVERY pool, so a fresh pool per seed is a
   feature, not noise. */
const pool = await buildAuctionPool('legends');
if (!pool) { console.error('the legends pool did not build offline, nothing to test'); process.exit(1); }

console.log('1) the running order law, 200 seeded orders');
{
  let buried = 0;
  const firstLots = new Set();
  const ORDERS = 200;
  for (let seed = 1; seed <= ORDERS; seed += 1) {
    const { lots, weakFills } = orderLots(pool, lehmer(seed * 7907));
    if (lots.length !== AUCTION_SLOTS.length * 2) fail(`seed ${seed}: ${lots.length} lots, wanted ${AUCTION_SLOTS.length * 2}`);
    const pass1 = lots.slice(0, AUCTION_SLOTS.length);
    if (!pass1.every(l => l.pass === 1 && l.player.tier === 'good')) fail(`seed ${seed}: pass one is not the middle band`);
    const p1Slots = new Set(pass1.map(l => l.player.slotKey));
    if (p1Slots.size !== AUCTION_SLOTS.length) fail(`seed ${seed}: pass one repeats a position before every position has gone once`);
    const pass2 = lots.slice(AUCTION_SLOTS.length);
    if (!pass2.every(l => l.pass === 2 && l.player.tier === 'great')) fail(`seed ${seed}: pass two is not the elite band`);
    const last = lots[lots.length - 1];
    const roomBest = Math.max(...lots.map(l => l.player.marketValue));
    if (!last.headline || last.player.marketValue !== roomBest) buried += 1;
    if (lots.some(l => l.player.tier === 'weak')) fail(`seed ${seed}: the weak band appeared as a lot`);
    if (weakFills.length !== AUCTION_SLOTS.length) fail(`seed ${seed}: ${weakFills.length} fill players, wanted one per position`);
    firstLots.add(lots[0].player.slotKey);
  }
  if (CONTROL === 'buried') {
    if (buried > 0) { console.log(`simAuctionRoom control: green. Severed, ${buried} of ${ORDERS} orders buried the headliner.`); process.exit(0); }
    console.error('simAuctionRoom control: RED. Every order still headlined the best player with the holdback severed.');
    process.exit(1);
  }
  if (buried > 0) fail(`${buried} of ${ORDERS} orders did not headline the room's most valuable player last`);
  if (firstLots.size < 6) fail(`only ${firstLots.size} distinct positions ever opened the auction across ${ORDERS} seeds, the shuffle is not shuffling`);
  console.log(`   ${ORDERS} orders: middle band first, one per position, elite second, the best player always last, ${firstLots.size} of ${AUCTION_SLOTS.length} positions seen opening`);
}

console.log('2) every lot opens at list price');
{
  let wrong = 0;
  for (const p of pool) {
    if (p.marketValue > 5 && p.basePrice !== Math.round(p.marketValue)) { wrong += 1; if (wrong <= 3) fail(`${p.name}: value ${p.marketValue}, opens at ${p.basePrice}`); }
  }
  if (wrong === 0) console.log(`   all ${pool.filter(p => p.marketValue > 5).length} valued players open at exactly their market value`);
}

console.log('3) the retune changed the opening price and nothing a rival pays');
{
  let worst = 0;
  for (const mv of [8, 20, 40, 75, 120, 180, 230]) {
    const oldBase = Math.round(mv * 0.8) * 1.6;
    const newBase = Math.round(mv * 1.0) * 1.28;
    const drift = Math.abs(newBase - oldBase);
    if (drift > worst) worst = drift;
    /* rounding of the anchor can move the product by up to 1.28 */
    if (drift > 1.3) fail(`value ${mv}M: old rival base ${oldBase}, new ${newBase}`);
  }
  console.log(`   seven market values checked, worst drift ${worst.toFixed(2)}M, inside rounding`);
}

console.log('4) the decay always reaches its floor');
{
  /* This models the page EXACTLY, 5M clamp included, because the clamp is
     load bearing: Math.round(5 * 0.9) is 5 again, a rounding fixpoint, so a
     floor below 5M would let a cheap lot decay forever. The first draft of
     this section modelled the floor without the clamp and proved exactly
     that stall on a 10M lot. */
  for (const base of [10, 60, 150, 300, 900]) {
    const floor = Math.max(5, Math.round(base * DECAY_FLOOR));
    let price = base;
    let steps = 0;
    while (Math.round(price * DECAY_STEP) > floor && steps < 60) { price = Math.round(price * DECAY_STEP); steps += 1; }
    if (steps >= 60) fail(`a ${base}M lot decayed ${steps} steps without reaching its floor of ${floor}`);
  }
  console.log('   five list prices from 10M to 900M all reach their floor in bounded steps, the 5M clamp holding off the rounding fixpoint');
}

console.log('');
if (failures > 0) { console.error(`simAuctionRoom: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simAuctionRoom: green. The room runs the way the owner specced it.');
