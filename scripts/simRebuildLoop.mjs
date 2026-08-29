/* Rebuild spin loop, Round 333: the wheel, the deals and the reckoning hold
 * their own laws.
 *
 * The owner's phase two spec: spin for a position, keep or sell the drawn
 * man, selling deals three priced replacements plus free bench promotion,
 * negative money ends in random forced sales, missed board demands draw
 * punishment cards with one safe in the deck, and restriction presets
 * narrow the market.
 *
 * WHAT IT HOLDS. Every new engine piece is PURE, so this drives them with
 * synthetic fixture players (invented names, shipped nowhere). The laws:
 *   1. THE WHEEL: spinOrder is a true permutation of the eleven shirts,
 *      byte deterministic per seed, different across seeds, and every
 *      shirt reaches every draw position somewhere in the seed space;
 *   2. THE DEAL: offers fit the slot, dodge every taken name, never repeat,
 *      and run dearest to cheapest; the bench is the squad's best four fits
 *      and is always free of taken names; the same (seed, salt) deals the
 *      same list;
 *   3. THE PUNISHMENT DECK: draws are without replacement, capped at the
 *      five cards, deterministic, and a five card draw holds exactly one
 *      safe card;
 *   4. THE PRESETS: purely narrowing, and exact: europe5 keeps precisely
 *      the top five league men, u25 precisely the 24 and unders;
 *   5. THE RECKONING: forceSales' books balance to the cent (deficit minus
 *      recouped equals the remainder), every swap puts a cheaper fit in the
 *      right shirt, nobody arrives twice, no swap happens after the debt is
 *      already cleared, and a deep market always clears an overdraft deficit.
 *
 * MEASURED, not invented (the Round 284 lesson): the variety and coverage
 * numbers were measured on this fixture before the floors were set. 300
 * seeds produced 300 distinct wheel orders and full 11x11 position
 * coverage; 500 one-miss draws hit all five cards, the rarest 97 times;
 * 200 overdraft reckonings cleared the debt 200 times. Floors sit well
 * under those. The first run of this harness, before the engine's mixSeed
 * warmup existed, measured the OPPOSITE: one shirt order family and the
 * same first punishment card 500 times in 500, which is what the engine
 * fix was for.
 *
 * NEGATIVE CONTROL: SIM_REBUILD_CONTROL=dupslot feeds the permutation
 * validator a wheel order with a shirt drawn twice and must go red,
 * proving the validator can actually see a broken wheel.
 *
 * Run: node scripts/simRebuildLoop.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_REBUILD_CONTROL || '';
if (CONTROL && CONTROL !== 'dupslot') { console.error(`SIM_REBUILD_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/rebuildLoop.entry.mjs`;
const BUNDLE = `${TMP}/rebuildLoop.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as rd from '${ROOT}/src/lib/rebuildDeck.ts';
export { FORMATIONS, playerRating } from '${ROOT}/src/lib/squadDeal.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { rd, FORMATIONS, playerRating } = await import(pathToFileURL(BUNDLE).href);
const {
  spinOrder, dealReplacements, drawPunishments, applyPreset, forceSales,
  PUNISH_DECK, REBUILD_PRESETS, OVERDRAFT_LIMIT,
} = rd;

const F433 = FORMATIONS[0];
const SLOTS = F433.slots.length;

/* Synthetic fixture players: invented names, shipped nowhere. */
function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'];
const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie', 'Liga Portugal', 'MLS'];
function fixturePlayers(seed, perPos) {
  const rng = lehmer(seed);
  const out = [];
  let id = 0;
  for (const pos of POSITIONS) {
    for (let n = 0; n < perPos; n += 1) {
      id += 1;
      out.push({
        name: `Fixture ${pos} ${id}`, club: 'Fixture FC', nationality: 'Fixtureland',
        league: LEAGUES[Math.floor(rng() * LEAGUES.length)],
        goals: Math.floor(rng() * 25), assists: Math.floor(rng() * 15),
        position: pos, kitNumber: (id % 40) + 1, age: 17 + Math.floor(rng() * 18),
        marketValue: 1 + Math.floor(rng() * 120), difficulty: 'easy',
      });
    }
  }
  return out;
}
const MARKET = fixturePlayers(9001, 40);
const SQUAD = fixturePlayers(7007, 4);

/** The permutation validator section 1 leans on; the control breaks its input. */
function permutationProblems(order, n) {
  const problems = [];
  if (order.length !== n) problems.push(`length ${order.length}, wanted ${n}`);
  const seen = new Set();
  for (const v of order) {
    if (!Number.isInteger(v) || v < 0 || v >= n) problems.push(`slot ${v} is out of range`);
    if (seen.has(v)) problems.push(`slot ${v} drawn twice`);
    seen.add(v);
  }
  return problems;
}

if (CONTROL === 'dupslot') {
  const order = spinOrder(42, SLOTS);
  order[0] = order[1];
  const problems = permutationProblems(order, SLOTS);
  if (problems.length > 0) { console.log(`simRebuildLoop control: green. The planted double draw was caught (${problems[0]}).`); process.exit(0); }
  console.error('simRebuildLoop control: RED. A wheel that drew the same shirt twice went unseen.');
  process.exit(1);
}

console.log('1) the wheel: a seeded permutation, every shirt everywhere');
{
  const orders = new Set();
  const positionsSeen = Array.from({ length: SLOTS }, () => new Set());
  for (let seed = 1; seed <= 300; seed += 1) {
    const order = spinOrder(seed, SLOTS);
    for (const p of permutationProblems(order, SLOTS)) fail(`seed ${seed}: ${p}`);
    const again = spinOrder(seed, SLOTS);
    if (order.join(',') !== again.join(',')) fail(`seed ${seed}: the same seed spun two different orders`);
    orders.add(order.join(','));
    order.forEach((slot, drawPos) => positionsSeen[slot].add(drawPos));
  }
  /* Measured: 300 of 300 orders distinct on this range. Floor at 280. */
  if (orders.size < 280) fail(`only ${orders.size} distinct orders in 300 seeds`);
  const fullCoverage = positionsSeen.every(s => s.size === SLOTS);
  if (!fullCoverage) fail('some shirt never reaches some draw position across 300 seeds');
  console.log(`   300 seeds: all true permutations, ${orders.size} distinct orders, every shirt reaches every draw position`);
}

console.log('2) the deal: fits, dodges taken names, dearest to cheapest, deterministic');
{
  let checked = 0;
  let benchSeen = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    for (let slotIdx = 0; slotIdx < SLOTS; slotIdx += 1) {
      const slot = F433.slots[slotIdx];
      const taken = new Set(
        MARKET.filter((_, i) => i % 7 === seed % 7).map(p => p.name)
          .concat(SQUAD.filter((_, i) => i % 3 === seed % 3).map(p => p.name)),
      );
      const deal = dealReplacements(MARKET, SQUAD, slot, taken, seed, slotIdx);
      checked += 1;
      if (deal.offers.length === 0) fail(`seed ${seed} slot ${slotIdx}: a 40 a position market dealt zero offers`);
      const names = new Set();
      for (const o of deal.offers) {
        if (!slot.allowed.includes(o.position)) fail(`seed ${seed} slot ${slotIdx}: a ${o.position} offered for ${slot.label}`);
        if (taken.has(o.name)) fail(`seed ${seed} slot ${slotIdx}: ${o.name} offered while taken`);
        if (names.has(o.name)) fail(`seed ${seed} slot ${slotIdx}: ${o.name} offered twice`);
        names.add(o.name);
      }
      for (let k = 1; k < deal.offers.length; k += 1) {
        if (deal.offers[k].marketValue > deal.offers[k - 1].marketValue) {
          fail(`seed ${seed} slot ${slotIdx}: offers are not dearest to cheapest`);
        }
      }
      if (deal.bench.length > 4) fail(`seed ${seed} slot ${slotIdx}: ${deal.bench.length} bench options`);
      benchSeen += deal.bench.length;
      for (let k = 0; k < deal.bench.length; k += 1) {
        const b = deal.bench[k];
        if (!slot.allowed.includes(b.position)) fail(`seed ${seed} slot ${slotIdx}: bench ${b.position} for ${slot.label}`);
        if (taken.has(b.name)) fail(`seed ${seed} slot ${slotIdx}: bench ${b.name} while taken`);
        if (!SQUAD.some(p => p.name === b.name)) fail(`seed ${seed} slot ${slotIdx}: bench ${b.name} is not a squad player`);
        if (k > 0 && playerRating(b) > playerRating(deal.bench[k - 1])) fail(`seed ${seed} slot ${slotIdx}: bench not best first`);
      }
      const again = dealReplacements(MARKET, SQUAD, slot, taken, seed, slotIdx);
      const fp = d => d.offers.map(o => o.name).join('|') + '#' + d.bench.map(b => b.name).join('|');
      if (fp(deal) !== fp(again)) fail(`seed ${seed} slot ${slotIdx}: the same seed and salt dealt two lists`);
    }
  }
  console.log(`   ${checked} deals: every offer fits and dodges taken names, prices run down, bench is squad only (${benchSeen} bench options seen)`);
}

console.log('3) the punishment deck: without replacement, one safe card');
{
  const safeCount = PUNISH_DECK.filter(c => c.kind === 'safe').length;
  if (safeCount !== 1) fail(`the deck holds ${safeCount} safe cards, the spec says exactly one`);
  const firstDraw = new Map();
  for (let seed = 1; seed <= 500; seed += 1) {
    for (let misses = 0; misses <= 7; misses += 1) {
      const cards = drawPunishments(seed, misses);
      if (cards.length !== Math.min(misses, PUNISH_DECK.length)) {
        fail(`seed ${seed} misses ${misses}: drew ${cards.length}`);
      }
      const ids = new Set(cards.map(c => c.id));
      if (ids.size !== cards.length) fail(`seed ${seed} misses ${misses}: a card drawn twice`);
      if (misses === 5 && cards.filter(c => c.kind === 'safe').length !== 1) {
        fail(`seed ${seed}: a full five card draw did not hold exactly one safe`);
      }
      if (misses === 1) firstDraw.set(cards[0].id, (firstDraw.get(cards[0].id) ?? 0) + 1);
    }
    const a = drawPunishments(seed, 3).map(c => c.id).join(',');
    const b = drawPunishments(seed, 3).map(c => c.id).join(',');
    if (a !== b) fail(`seed ${seed}: the same reckoning drew two different hands`);
  }
  /* Measured: 500 one miss draws reach all five cards, rarest 97. Floor 40. */
  if (firstDraw.size !== PUNISH_DECK.length) fail(`only ${firstDraw.size} of ${PUNISH_DECK.length} cards ever drawn first`);
  const rarest = Math.min(...firstDraw.values());
  if (rarest < 40) fail(`the rarest first card came up only ${rarest} times in 500`);
  console.log(`   500 seeds x 8 miss counts: draws capped and unique, one safe in every full hand, rarest first card ${rarest} of 500`);
}

console.log('4) the presets: purely narrowing, and exact');
{
  if (REBUILD_PRESETS.length !== 3) fail(`${REBUILD_PRESETS.length} presets, the picker expects 3`);
  const top5 = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);
  const none = applyPreset(MARKET, 'none');
  if (none.length !== MARKET.length) fail('the open market preset dropped somebody');
  const eu = applyPreset(MARKET, 'europe5');
  const wantEu = MARKET.filter(p => top5.has(p.league)).length;
  if (eu.length !== wantEu) fail(`europe5 kept ${eu.length}, the fixture holds ${wantEu} top five men`);
  if (eu.some(p => !top5.has(p.league))) fail('europe5 let a non top five league through');
  const u25 = applyPreset(MARKET, 'u25');
  const wantU25 = MARKET.filter(p => p.age > 0 && p.age <= 24).length;
  if (u25.length !== wantU25) fail(`u25 kept ${u25.length}, the fixture holds ${wantU25} under 25s`);
  if (u25.some(p => p.age > 24)) fail('u25 let a 25 plus through');
  const marketNames = new Set(MARKET.map(p => p.name));
  if (eu.some(p => !marketNames.has(p.name)) || u25.some(p => !marketNames.has(p.name))) fail('a preset invented a player');
  console.log(`   open ${none.length}, europe5 ${eu.length}, u25 ${u25.length}: each exactly the matching subset, nobody invented`);
}

console.log('5) the reckoning: forced sales balance the books');
{
  let cleared = 0;
  let runs = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = lehmer(seed * 13 + 5);
    /* An XI of pricey fixture men so a cheaper market fit always exists. */
    const xi = F433.slots.map((slot, i) => ({
      name: `Owned ${slot.label} ${seed}-${i}`, club: 'Fixture FC', nationality: 'Fixtureland',
      league: 'Premier League', goals: 10, assists: 5,
      position: slot.allowed[0], kitNumber: i + 1, age: 26,
      marketValue: 40 + Math.floor(rng() * 80), difficulty: 'easy',
    }));
    const deficit = 1 + Math.floor(rng() * OVERDRAFT_LIMIT);
    const { swaps, remainingDeficit } = forceSales(xi, F433, MARKET, deficit, seed);
    runs += 1;
    const recouped = swaps.reduce((s, sw) => s + sw.recouped, 0);
    if (remainingDeficit !== Math.max(0, deficit - recouped)) {
      fail(`seed ${seed}: books off, deficit ${deficit}, recouped ${recouped}, remainder ${remainingDeficit}`);
    }
    const arrivals = new Set();
    let running = 0;
    for (let k = 0; k < swaps.length; k += 1) {
      const sw = swaps[k];
      if (k < swaps.length - 1 && running >= deficit) fail(`seed ${seed}: a swap happened after the debt was cleared`);
      running += sw.recouped;
      const slotIdx = xi.findIndex(p => p.name === sw.outName);
      if (slotIdx === -1) { fail(`seed ${seed}: sold ${sw.outName}, who holds no shirt`); continue; }
      if (!F433.slots[slotIdx].allowed.includes(sw.inPlayer.position)) {
        fail(`seed ${seed}: ${sw.inPlayer.position} forced into the ${F433.slots[slotIdx].label} shirt`);
      }
      if (sw.inPlayer.marketValue >= xi[slotIdx].marketValue) fail(`seed ${seed}: a forced sale that lost no money`);
      if (sw.recouped !== xi[slotIdx].marketValue - sw.inPlayer.marketValue) fail(`seed ${seed}: recouped sum is not the price gap`);
      if (arrivals.has(sw.inPlayer.name)) fail(`seed ${seed}: ${sw.inPlayer.name} arrived twice`);
      arrivals.add(sw.inPlayer.name);
    }
    if (remainingDeficit === 0) cleared += 1;
    const fpOf = r => r.swaps.map(sw => `${sw.outName}>${sw.inPlayer.name}`).join('|');
    if (fpOf(forceSales(xi, F433, MARKET, deficit, seed)) !== fpOf({ swaps })) {
      fail(`seed ${seed}: the same reckoning sold two different sets`);
    }
  }
  /* Measured: 200 of 200 overdraft deficits cleared on this market. Floor 195. */
  if (cleared < 195) fail(`only ${cleared} of ${runs} overdraft deficits cleared on a deep market`);
  console.log(`   ${runs} reckonings: books exact, shirts refilled by cheaper fits, ${cleared} of ${runs} debts fully cleared`);
}

console.log('');
if (failures > 0) { console.error(`simRebuildLoop: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simRebuildLoop: green. The wheel is fair, the deals are honest, and the reckoning balances the books.');
