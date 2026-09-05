/* Round 441: Sign the Player runs the auction the owner described.
 *
 * HIS FORMAT, written out in full in the 2026-08-28 review: "First a random
 * positon is chosen. More than likely the second best player in the lot get
 * revealed and there price is shown. The bidding starts and if two people
 * wnat him or more then theres a bidding battle. If not if its just one then
 * they win the player for the listed price and if zero then there price goes
 * down a little and more and more until someone decided they want him. After
 * the bidding war is done then we move to the next posion. The other players
 * on the lot or up for bidding are not revealed nor bidding starts for them
 * until all positions go up for bidding once. Usually after they put up the
 * best player for bidding... And u keep doing this till your roster is full
 * and then u battle it out in si."
 *
 * WHAT WAS ALREADY RIGHT, and is pinned here rather than rewritten: the
 * random position order, one lot per position before any position comes up
 * twice, the middle band first and the elite band second, the single most
 * valuable player in the room held back to headline the close, list price
 * openings, the decay on an unwanted lot, and the end of auction fill. Round
 * 327 built all of that and Round 315 anchored the opening price to the real
 * market value, which is why nobody is priced at 162 million any more.
 *
 * WHAT WAS WRONG, and what this harness holds:
 *   A. TWO THIRDS OF AUCTIONS COULD NOT BE FINISHED. The rivals were started
 *      by an effect keyed on whether YOU were active, and an effect keyed on a
 *      flag only fires when that flag CHANGES. Two lots in a row you could not
 *      bid on, which is any two positions you already own coming up back to
 *      back in the second pass, or any lot at all once your money is gone, and
 *      the room stopped dead: no buttons, nothing on a timer, no showdown.
 *      Measured by playing the real page in jsdom, 18 auctions across three
 *      ways of playing: 12 died before the showdown as shipped (six frozen on
 *      lot 13 of 22, six on a screen with neither a lot nor a result), 0 after.
 *   B. AN UNCONTESTED LOT DID NOT SELL AT ITS LIST PRICE. A rival with nobody
 *      to beat still raised himself one step, so a lot only one bidder wanted
 *      went for 5, 10 or 25 million OVER the number on the card. The sentence
 *      his format is most explicit about was the one case the room never
 *      played. Measured over 240 driven auctions (three ways of playing, 80
 *      seeds each): 1151 of 1151 uncontested lots sold above list as shipped,
 *      worst was Martin Zubimendi at 91M on an 81M list; 0 of 1138 after.
 *   C. ONE MAN COULD SIGN FOR TWO CLUBS IN THE SAME LEAGUE. The end of auction
 *      fill handed the same journeyman to every squad still missing that
 *      position. Measured over 1320 rooms taken straight out of those driven
 *      auctions: all 1320 doubled a player as shipped, 0 after. A FINISHED
 *      auction cannot reach that state today (see the reachability line in
 *      section 4), so section 5 holds the whole auction and the fill's own
 *      contract separately, and only the second one has teeth.
 *
 * The engine now lives in src/lib/auctionHouse.ts (runRivalBids, the decay
 * helpers, fillOpenChairs, applySale) instead of inside the page component,
 * which is why any of this can be measured at all. The driver below supplies
 * only the human's choices; every rule it exercises is the shipped one.
 *
 * THE POOL: scripts/data/auctionMarketRows.json, the eight columns
 * SignThePlayer's own query selects, in the order it receives them.
 * `--refresh` re-pulls it through PostgREST with the URL and key the app
 * exports. A missing file fails closed; rows are never synthesised.
 *
 * NEGATIVE CONTROLS, one per fix, each refusing to run if the line it means
 * to rewrite is not in the source:
 *   SIM_SIGNAUCTION_CONTROL=hangwiring  restores the effect that started the
 *      rivals only when your own eligibility changed, section 8 red
 *   SIM_SIGNAUCTION_CONTROL=stepover    restores the self raise, section 3 red
 *   SIM_SIGNAUCTION_CONTROL=sharedfill  restores the shared journeyman, section 5 red
 *   SIM_SIGNAUCTION_CONTROL=ratingprice restores the pre Round 315 rating
 *      opening, which reopens Mile Svilar at exactly the 162 million the owner
 *      reported, section 6 red
 *
 * SIM_SIGNAUCTION_PLAYS raises the number of auctions section 8 plays in the
 * page (default 6, about two seconds each).
 *
 * Run: node scripts/simSignThePlayerAuction.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const ROWS_FILE = `${ROOT}/scripts/data/auctionMarketRows.json`;
const LIB = `${ROOT}/src/lib/auctionHouse.ts`;
const REFRESH = process.argv.includes('--refresh');
const CONTROLS = ['stepover', 'sharedfill', 'ratingprice', 'hangwiring'];
const CONTROL = process.env.SIM_SIGNAUCTION_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SIM_SIGNAUCTION_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/signAuction.entry.mjs`;
const BUNDLE = `${TMP}/signAuction.bundle.mjs`;

/* ---------- the negative controls, applied to a copy outside the tree ----------
   A fresh checkout of this repo is CRLF, so every needle is matched against a
   copy with the line endings normalised. A control that matches nothing is a
   dead control, and a dead control is a green harness that proved nothing. */
let libPath = LIB;
if (CONTROL && CONTROL !== 'hangwiring') {
  const src = fs.readFileSync(LIB, 'utf8').replace(/\r\n/g, '\n');
  const needles = {
    stepover: [
      'const target = lead === null ? p : p + bidStepFor(p);',
      'const target = p + bidStepFor(p);',
      'the self raise restored: a rival with nobody to beat opens one step over list',
    ],
    sharedfill: [
      'const fill = fillPool.find(w => w.slotKey === slot.key && !taken.has(w.name));',
      'const fill = fillPool.find(w => w.slotKey === slot.key);',
      'the shared journeyman restored: every squad missing a position gets the same man',
    ],
    ratingprice: [
      'const anchored = p.marketValue > 5 ? Math.round(p.marketValue) : Math.round((rating - 55) * 3);',
      'const anchored = Math.round((rating - 55) * 6);',
      'the pre Round 315 rating opening restored: the curve the owner reported at 162 million',
    ],
  };
  const [needle, replacement, note] = needles[CONTROL];
  if (!src.includes(needle)) {
    console.error(`control run: "${needle}" is not in auctionHouse.ts, refusing to run a dead control`);
    process.exit(1);
  }
  libPath = `${TMP}/auctionHouse.control.${CONTROL}.ts`;
  fs.writeFileSync(libPath, src.replace(needle, replacement));
  console.log(`NEGATIVE CONTROL ON: ${note}`);
}

fs.writeFileSync(ENTRY, `
export * as ah from '${libPath}';
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '${ROOT}/src/integrations/supabase/client.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });

/* The Supabase client reads localStorage at module scope, and the pool
   builder is only reachable through its own PostgREST call, so the snapshot
   is served to the REAL fetch the client resolves at construction. Both stubs
   have to be in place before the bundle is imported. */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const realFetch = globalThis.fetch;
let servedRows = [];
let served = 0;
globalThis.fetch = async (url, init) => {
  const href = String(url);
  if (href.includes('/rest/v1/player_market_values')) {
    served += 1;
    return new Response(JSON.stringify(servedRows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, init);
};

const { ah, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import(pathToFileURL(BUNDLE).href);
const {
  AUCTION_SLOTS, DECAY_FLOOR, applySale, bidStepFor, buildAuctionPool, createBidders,
  decayFloorFor, decaySnapper, fillOpenChairs, nextDecayPrice, orderLots, runRivalBids,
  simulateShowdown,
} = ah;

/* ---------- the snapshot, the eight columns SignThePlayer selects ---------- */
const COLUMNS = ['player_name', 'position', 'age', 'nationality', 'club', 'market_value_usd', 'goals', 'assists'];
if (REFRESH) {
  const url = `${SUPABASE_URL}/rest/v1/player_market_values?select=${COLUMNS.join(',')}`
    + '&year=eq.2026&age=not.is.null&order=market_value_usd.desc,player_name.asc&limit=600';
  const res = await realFetch(url, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` } });
  if (!res.ok) { console.error(`--refresh: PostgREST answered ${res.status}, the snapshot is unchanged`); process.exit(1); }
  const pulled = await res.json();
  const before = fs.existsSync(ROWS_FILE) ? fs.readFileSync(ROWS_FILE, 'utf8') : '';
  const text = '[\n' + pulled.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n]\n';
  fs.writeFileSync(ROWS_FILE, text);
  console.log(`--refresh: ${pulled.length} rows pulled through PostgREST, snapshot ${text === before ? 'unchanged' : 'rewritten'}`);
}
if (!fs.existsSync(ROWS_FILE)) {
  console.error(`${ROWS_FILE} is missing. Run with --refresh to pull it; this harness never synthesises rows.`);
  process.exit(1);
}
servedRows = JSON.parse(fs.readFileSync(ROWS_FILE, 'utf8'));
const realValue = new Map(servedRows.map(r => [r.player_name, r.market_value_usd / 1e6]));

const lehmer = seed => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};

/* buildAuctionPool draws its three bands with Math.random, so the whole
   harness runs under a seeded generator: same seeds, same rooms, every run. */
const realRandom = Math.random;
const withSeed = (seed, fn) => {
  const rng = lehmer(seed);
  Math.random = rng;
  try { return fn(rng); } finally { Math.random = realRandom; }
};
/* buildAuctionPool awaits its rows, and the band picks happen AFTER that
   await, so the seed has to be held across it or the pool is random again and
   the numbers this harness prints stop being reproducible. */
const withSeedAsync = async (seed, fn) => {
  const rng = lehmer(seed);
  Math.random = rng;
  try { return await fn(rng); } finally { Math.random = realRandom; }
};

const currentPool = await withSeedAsync(20260904, () => buildAuctionPool('current'));
if (!currentPool) { console.error('the current pool did not build from the snapshot, nothing to test'); process.exit(1); }
if (served === 0) { console.error('the pool builder never asked PostgREST for rows, the snapshot was not the source'); process.exit(1); }
const legendsPool = await withSeedAsync(777, () => buildAuctionPool('legends'));
if (!legendsPool) { console.error('the offline legends pool did not build, nothing to test'); process.exit(1); }

/* ---------- the driver: the engine's rules, the human's choices ----------
   Every rule below (who may bid, at what price, who takes the hammer, when
   the decay starts and stops, how open chairs fill) is called out of
   auctionHouse. The driver only supplies what a person supplies: bid or pass.
   POLICIES: 'pass' never bids, 'open' opens at list and never raises,
   'chase' opens and keeps raising while it can afford the smallest step. */
function playAuction(pool, policy, rand) {
  const { lots, weakFills } = orderLots(pool, rand);
  let bidders = createBidders();
  const unsold = [];
  const sales = [];
  const rooms = [];
  for (const entry of lots) {
    rooms.push(bidders);
    const lot = entry.player;
    const slotsLeftAfter = AUCTION_SLOTS.length - AUCTION_SLOTS.findIndex(s => s.key === lot.slotKey) - 1;
    let active = new Set(bidders.filter(b => b.squad[lot.slotKey] === null && b.budget >= 5).map(b => b.id));
    let price = lot.basePrice;
    let leader = null;
    const whoBid = new Set();
    let settled = null;
    let guard = 0;
    while (!settled) {
      if ((guard += 1) > 400) throw new Error(`lot ${lot.name} never resolved`);
      if (active.has('you')) {
        const you = bidders.find(b => b.id === 'you');
        const want = leader === null ? price : price + bidStepFor(price);
        const takeIt = policy === 'chase' || (policy === 'open' && leader === null);
        if (takeIt && you.budget >= want) {
          price = want;
          leader = 'you';
          whoBid.add('you');
        } else {
          active.delete('you');
        }
      }
      const ex = runRivalBids({ lot, bidders, active, price, leader, slotsLeftAfter, rand });
      for (const e of ex.events) if (e.kind === 'bid') whoBid.add(e.bidderId);
      active = new Set(ex.active);
      price = ex.price;
      leader = ex.leader;
      if (ex.outcome === 'sold') settled = { winner: ex.winner, price, phase: 'list', bidders: whoBid.size };
      else if (ex.outcome === 'decay') {
        const floor = decayFloorFor(lot.basePrice);
        let p = price;
        let steps = 0;
        for (;;) {
          if ((steps += 1) > 200) throw new Error(`the decay on ${lot.name} never reached the floor`);
          const next = nextDecayPrice(p);
          if (next <= floor) { settled = { winner: null, price: p, phase: 'decay', steps, bidders: whoBid.size }; break; }
          p = next;
          const snap = decaySnapper(bidders, lot, p, slotsLeftAfter, rand);
          if (snap) { settled = { winner: snap, price: p, phase: 'decay', steps, bidders: whoBid.size }; break; }
        }
      }
    }
    if (settled.winner) bidders = applySale(bidders, lot, settled.winner, settled.price);
    else unsold.push(lot);
    sales.push({ lot, ...settled });
  }
  const fillPool = [...weakFills, ...unsold];
  const preFill = bidders;
  bidders = fillOpenChairs(bidders, fillPool);
  return { lots, sales, bidders, preFill, rooms, unsold, fillPool };
}

const POLICIES = ['pass', 'open', 'chase'];
const SEEDS = 80;
const runs = [];
for (const policy of POLICIES) {
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rand = lehmer(seed * 7919 + policy.length * 131);
    runs.push({ policy, seed, ...withSeed(seed * 104729, () => playAuction(currentPool, policy, rand)) });
  }
}
console.log(`Driven ${runs.length} full auctions on the real pool (${POLICIES.join(', ')} x ${SEEDS} seeds), ${runs[0].lots.length} lots each.`);

console.log('1) his running order: every position once, middle band first, the best player last');
{
  let bad = 0;
  const openers = new Set();
  for (const pool of [currentPool, legendsPool]) {
    for (let seed = 1; seed <= 120; seed += 1) {
      const { lots, weakFills } = orderLots(pool, lehmer(seed * 7907 + 13));
      if (lots.length !== AUCTION_SLOTS.length * 2) { bad += 1; fail(`seed ${seed}: ${lots.length} lots, wanted ${AUCTION_SLOTS.length * 2}`); continue; }
      const firstPass = lots.slice(0, AUCTION_SLOTS.length);
      const seen = new Set(firstPass.map(l => l.player.slotKey));
      if (seen.size !== AUCTION_SLOTS.length) { bad += 1; fail(`seed ${seed}: a position came up twice before all ${AUCTION_SLOTS.length} had come up once`); }
      if (!firstPass.every(l => l.pass === 1 && l.player.tier === 'good')) { bad += 1; fail(`seed ${seed}: the first look at a position is not the middle band`); }
      if (!lots.slice(AUCTION_SLOTS.length).every(l => l.pass === 2 && l.player.tier === 'great')) { bad += 1; fail(`seed ${seed}: the second time around is not the elite band`); }
      const last = lots[lots.length - 1];
      const best = Math.max(...lots.map(l => l.player.marketValue));
      if (!last.headline || last.player.marketValue !== best) { bad += 1; fail(`seed ${seed}: the headline lot is not the most valuable player in the room`); }
      if (lots.some(l => l.player.tier === 'weak')) { bad += 1; fail(`seed ${seed}: the journeyman band went under the hammer`); }
      if (weakFills.length !== AUCTION_SLOTS.length) { bad += 1; fail(`seed ${seed}: ${weakFills.length} journeymen, wanted one per position`); }
      if (pool === currentPool) openers.add(lots[0].player.slotKey);
    }
  }
  if (openers.size < 6) fail(`only ${openers.size} distinct positions ever opened the auction, the order is not random`);
  if (bad === 0) console.log(`   240 orders across both pools: one lot per position before any repeats, ${openers.size} of ${AUCTION_SLOTS.length} positions seen opening, the best player always last`);
}

console.log('2) two or more bidders is a bidding battle, and it finishes above list');
{
  let wars = 0;
  let flat = 0;
  let premium = 0;
  for (const run of runs) {
    for (const s of run.sales) {
      if (s.phase !== 'list' || s.bidders < 2) continue;
      wars += 1;
      premium += s.price - s.lot.basePrice;
      if (s.price <= s.lot.basePrice) { flat += 1; if (flat <= 3) fail(`${s.lot.name}: ${s.bidders} bidders fought and it still sold at list (${s.price} vs ${s.lot.basePrice})`); }
    }
  }
  if (wars < 200) fail(`only ${wars} contested lots across ${runs.length} auctions, too few to hold a law on`);
  if (flat === 0) console.log(`   ${wars} contested lots, every one finished above its list price, average premium ${(premium / wars).toFixed(1)}M`);
}

console.log('3) exactly one bidder wins him for the listed price');
{
  let solo = 0;
  let over = 0;
  let worst = null;
  for (const run of runs) {
    for (const s of run.sales) {
      if (s.phase !== 'list' || s.bidders !== 1) continue;
      solo += 1;
      if (s.price !== s.lot.basePrice) {
        over += 1;
        const gap = s.price - s.lot.basePrice;
        if (!worst || gap > worst.gap) worst = { name: s.lot.name, gap, list: s.lot.basePrice, paid: s.price };
      }
    }
  }
  if (solo < 200) fail(`only ${solo} uncontested lots across ${runs.length} auctions, too few to hold a law on`);
  if (CONTROL === 'stepover') {
    if (over > 0) { console.log(`simSignThePlayerAuction control: green. Self raise restored, ${over} of ${solo} uncontested lots sold over list, worst ${worst.name} at ${worst.paid}M on a ${worst.list}M list.`); process.exit(0); }
    console.error('simSignThePlayerAuction control: RED. Every uncontested lot still sold at list with the self raise restored.');
    process.exit(1);
  }
  if (over > 0) fail(`${over} of ${solo} uncontested lots sold above list, worst ${worst.name} paid ${worst.paid}M on a ${worst.list}M list`);
  else console.log(`   ${solo} uncontested lots, every one settled at exactly the number on the card`);
}

console.log('4) nobody wants him, so the price falls, and the fall is bounded');
{
  const maxStepsAllowed = Math.ceil(Math.log(DECAY_FLOOR) / Math.log(0.9)) + 2;
  /* 4a: every base price in the room, not only the ones an auction reached.
     The fall has to strictly fall and has to terminate from anywhere. */
  for (const p of currentPool) {
    let price = p.basePrice;
    const floor = decayFloorFor(p.basePrice);
    let steps = 0;
    for (;;) {
      const next = nextDecayPrice(price);
      if (next <= floor) break;
      if (next >= price) { fail(`${p.name}: the decay stalled at ${price}M`); break; }
      price = next;
      if ((steps += 1) > maxStepsAllowed) { fail(`${p.name}: the decay from ${p.basePrice}M never reached its ${floor}M floor`); break; }
    }
  }

  /* 4b: the branch itself, driven on rooms the auction actually produced. The
     budgets and squads below are the state the 240 driven auctions ended on
     before the fill, not invented ones, and every lot whose position is still
     open on one of those squads is re offered to them. That is where a rival
     is poor enough to walk away, which is the only way his "if zero" case is
     reached at all: see the reachability line printed underneath. */
  let offered = 0;
  let decays = 0;
  let takenLow = 0;
  let withdrawn = 0;
  let worstSteps = 0;
  for (const run of runs) {
    const rand = lehmer(run.seed * 65537 + 11);
    for (const entry of run.lots) {
      const lot = entry.player;
      const bidders = run.preFill;
      const active = new Set(bidders.filter(b => b.id !== 'you' && b.squad[lot.slotKey] === null && b.budget >= 5).map(b => b.id));
      if (active.size === 0) continue;
      offered += 1;
      const slotsLeftAfter = AUCTION_SLOTS.length - AUCTION_SLOTS.findIndex(s => s.key === lot.slotKey) - 1;
      const ex = runRivalBids({ lot, bidders, active, price: lot.basePrice, leader: null, slotsLeftAfter, rand });
      if (ex.outcome !== 'decay') continue;
      decays += 1;
      const floor = decayFloorFor(lot.basePrice);
      let p = ex.price;
      let steps = 0;
      for (;;) {
        if ((steps += 1) > maxStepsAllowed + 5) { fail(`${lot.name}: the decay never reached its ${floor}M floor`); break; }
        const next = nextDecayPrice(p);
        if (next <= floor) { withdrawn += 1; break; }
        p = next;
        const snap = decaySnapper(bidders, lot, p, slotsLeftAfter, rand);
        if (snap) {
          takenLow += 1;
          if (p >= lot.basePrice) fail(`${lot.name}: a decayed lot sold at or above list (${p} vs ${lot.basePrice})`);
          if (p < floor) fail(`${lot.name}: a decayed lot sold under its ${floor}M floor at ${p}M`);
          break;
        }
      }
      worstSteps = Math.max(worstSteps, steps);
      if (steps > maxStepsAllowed) fail(`${lot.name}: the decay took ${steps} steps, the floor is ${maxStepsAllowed} away at worst`);
    }
  }
  if (decays < 50) fail(`only ${decays} of ${offered} re offered lots found no taker, too few to hold a law on`);
  else console.log(`   ${decays} unwanted lots of ${offered} re offered fell: ${takenLow} snapped up cheap, ${withdrawn} withdrawn at the floor, worst fall ${worstSteps} steps of a possible ${maxStepsAllowed}`);

  /* 4c: how often his "if zero" case is reached in ordinary play. A rival's
     floor valuation is 1.28 x list x 0.88 personality x 1.15 need x 0.85
     noise = 1.10 x list before the tier bonus, so no rival can ever decline a
     lot on VALUE: only an empty wallet makes him walk. Reported rather than
     retuned, because the level of the room is a balance call and not a bug. */
  const inPlay = runs.reduce((n, r) => n + r.sales.filter(s => s.phase === 'decay').length, 0);
  console.log(`   reachability in ordinary play: ${inPlay} of ${runs.length * runs[0].lots.length} lots decayed, because a rival's floor valuation is 1.10x list before his tier bonus`);
}

console.log('5) every roster fills, and no man signs for two clubs in the same league');
{
  let short = 0;
  let doubled = 0;
  let worst = null;
  for (const run of runs) {
    for (const b of run.bidders) {
      const filled = AUCTION_SLOTS.filter(s => b.squad[s.key]).length;
      if (filled !== AUCTION_SLOTS.length) { short += 1; if (short <= 3) fail(`${run.policy} seed ${run.seed}: ${b.name} plays the showdown with ${filled} of ${AUCTION_SLOTS.length}`); }
      if (b.budget < 0) fail(`${run.policy} seed ${run.seed}: ${b.name} finished on a negative budget`);
    }
    const owners = new Map();
    for (const b of run.bidders) for (const p of Object.values(b.squad)) if (p) owners.set(p.name, (owners.get(p.name) ?? 0) + 1);
    const dupes = [...owners].filter(([, n]) => n > 1);
    if (dupes.length) { doubled += 1; if (!worst) worst = { run: `${run.policy} seed ${run.seed}`, name: dupes[0][0], teams: dupes[0][1] }; }
  }
  if (doubled > 0) fail(`${doubled} of ${runs.length} auctions signed one man to two squads, first was ${worst.name} in ${worst.teams} teams (${worst.run})`);
  if (short === 0 && doubled === 0) console.log(`   ${runs.length * 3} squads, all ${AUCTION_SLOTS.length} chairs filled on every one, no player on two of them`);

  /* 5b: the fill's own contract, on the rooms the auction passes through.
     A finished auction can only ever leave ONE chair open per position (two
     of the three bidders win that position's two lots), so the whole auction
     above cannot reach the case where two squads need the same journeyman.
     A room mid auction can and does, and that is exactly what the fill is
     handed the moment a lot goes unsold, so the function is held to its
     contract directly: on any room, nobody signs a man another squad has.
     A mid auction room is deliberately short of bodies (three squads can be
     missing a position the room only has one journeyman for), so the chairs
     all filled law belongs to 5a above and is not repeated here. */
  let mid = 0;
  let midDoubled = 0;
  let midWorst = null;
  for (const run of runs.slice(0, 60)) {
    for (const room of run.rooms) {
      mid += 1;
      const filled = fillOpenChairs(room, run.fillPool);
      const owners = new Map();
      for (const b of filled) for (const p of Object.values(b.squad)) if (p) owners.set(p.name, (owners.get(p.name) ?? 0) + 1);
      const dupes = [...owners].filter(([, n]) => n > 1);
      if (dupes.length) { midDoubled += 1; if (!midWorst) midWorst = { name: dupes[0][0], teams: dupes[0][1] }; }
    }
  }
  if (CONTROL === 'sharedfill') {
    if (midDoubled > 0) { console.log(`simSignThePlayerAuction control: green. Shared journeyman restored, ${midDoubled} of ${mid} rooms put one man in two squads, first was ${midWorst.name} in ${midWorst.teams} of them.`); process.exit(0); }
    console.error('simSignThePlayerAuction control: RED. No room shared a player with the shared journeyman restored.');
    process.exit(1);
  }
  if (midDoubled > 0) fail(`${midDoubled} of ${mid} mid auction rooms signed one man to two squads, first was ${midWorst.name} in ${midWorst.teams} of them`);
  else console.log(`   ${mid} mid auction rooms filled straight from the engine, not one signed a man another squad already had`);
}

console.log('6) the opening price is the real market value, to the million');
{
  /* The owner: "im playing sign the player and u start off really expensive.
     For mike svilar your pricing him at 162 million." His row says 38. */
  const PINNED = { name: 'Mile Svilar', value: 38 };
  let checked = 0;
  let wrong = 0;
  let svilarSeen = 0;
  let worst = null;
  const seenNames = new Set();
  for (let seed = 1; seed <= 200; seed += 1) {
    const pool = await withSeedAsync(seed * 15485863, () => buildAuctionPool('current'));
    if (!pool) { fail(`seed ${seed}: the pool did not build`); continue; }
    for (const p of pool) {
      const real = realValue.get(p.name);
      if (real === undefined) { fail(`${p.name} is in the room but not in the snapshot the room was built from`); continue; }
      checked += 1;
      seenNames.add(p.name);
      const ratio = p.basePrice / real;
      if (!worst || Math.abs(ratio - 1) > Math.abs(worst.ratio - 1)) worst = { name: p.name, ratio, real, open: p.basePrice };
      if (p.basePrice !== Math.round(real)) wrong += 1;
      if (p.name === PINNED.name) {
        svilarSeen += 1;
        if (p.basePrice !== PINNED.value) {
          if (svilarSeen <= 1) fail(`${PINNED.name} opens at ${p.basePrice}M, his 2026 row says ${PINNED.value}M`);
        }
      }
    }
  }
  if (CONTROL === 'ratingprice') {
    if (wrong > 0) { console.log(`simSignThePlayerAuction control: green. Rating opening restored, ${wrong} of ${checked} openings left the real value, worst ${worst.name} opened at ${worst.open}M on a ${worst.real}M value (${worst.ratio.toFixed(2)}x).`); process.exit(0); }
    console.error('simSignThePlayerAuction control: RED. Every opening still matched the real value with the rating curve restored.');
    process.exit(1);
  }
  if (svilarSeen === 0) fail(`${PINNED.name} never came up across 200 rooms, the pin the owner reported is no longer being tested`);
  /* The band is arithmetic, not a number that felt right: an opening price is
     a whole number of millions, so the only gap it may ever show against the
     row it came from is the half million that rounding can move. Worst gap
     measured over the 200 rooms below is 0.5M, on a ratio of 1.008x. */
  if (Math.abs(worst.open - worst.real) > 0.5) fail(`${worst.name} opens at ${worst.open}M on a ${worst.real}M value, ${worst.ratio.toFixed(3)}x, more than rounding can explain`);
  if (wrong > 0) fail(`${wrong} of ${checked} openings did not equal the player's real market value`);
  else console.log(`   ${checked} openings over 200 rooms, ${seenNames.size} distinct players, worst ratio ${worst.ratio.toFixed(3)}x (${worst.name}), ${PINNED.name} opened at ${PINNED.value}M in ${svilarSeen} of them`);
}

console.log('7) the showdown still runs on the filled squads');
{
  let played = 0;
  for (const run of runs.slice(0, 40)) {
    const result = withSeed(run.seed * 31337, () => simulateShowdown(run.bidders));
    if (result.table.length !== 3) { fail(`${run.policy} seed ${run.seed}: ${result.table.length} clubs in the table`); continue; }
    if (result.lines.length !== 6) fail(`${run.policy} seed ${run.seed}: ${result.lines.length} matches, a three club double round robin is 6`);
    if (!result.table.some(r => r.bidderId === run.bidders[0].id)) fail(`${run.policy} seed ${run.seed}: your club is missing from the table`);
    if (result.table.some(r => r.rating <= 0)) fail(`${run.policy} seed ${run.seed}: a club took the field with no rating`);
    played += 1;
  }
  console.log(`   ${played} showdowns simulated on filled squads, 6 matches each, every club rated`);
}

console.log('8) the real page plays every lot through to the showdown');
{
  /* The rules above are the engine's. This one is the page's: the room has to
     keep moving when you have no say in a lot, and the only way to prove that
     is to render the real component and press its real buttons. */
  const { playPageAuctions } = await import(pathToFileURL(`${ROOT}/scripts/lib/signThePlayerPage.mjs`).href);
  const res = await playPageAuctions({ root: ROOT, rows: servedRows, control: CONTROL === 'hangwiring', runs: Number(process.env.SIM_SIGNAUCTION_PLAYS || 6) });
  const stuck = res.filter(r => !r.finished);
  if (CONTROL === 'hangwiring') {
    if (stuck.length > 0) {
      console.log(`simSignThePlayerAuction control: green. Old wiring restored, ${stuck.length} of ${res.length} auctions died: ${stuck.map(r => `${r.policy} on ${r.lastLot} after ${r.lotsSeen} lots with ${r.buttons} playable buttons`).join('; ')}.`);
      for (const r of stuck) console.log(`     ${r.policy}: ${r.screen}`);
      process.exit(0);
    }
    console.error('simSignThePlayerAuction control: RED. Every auction still reached the showdown with the old wiring restored.');
    process.exit(1);
  }
  if (stuck.length > 0) fail(`${stuck.length} of ${res.length} played auctions never reached the showdown, first died on ${stuck[0].lastLot}`);
  else console.log(`   ${res.length} auctions played in the real page (${res.map(r => r.policy).join(', ')}), every one reached the showdown, ${res.reduce((n, r) => n + r.lotsSeen, 0)} lots opened in total`);
}

if (CONTROL) { console.error(`control ${CONTROL} ran to the end without its section going red`); process.exit(1); }
if (failures > 0) { console.error(`\nsimSignThePlayerAuction: ${failures} FAILURES`); process.exit(1); }
console.log('\nsimSignThePlayerAuction: all sections green.');
/* Section 8 leaves a live Supabase auth refresh timer and a jsdom animation
   frame loop behind it, either of which holds the event loop open for good.
   Exit on the result rather than waiting for a loop that never drains. */
process.exit(0);
