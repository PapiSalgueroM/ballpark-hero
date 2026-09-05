/* Rebuild loop harness, Round 456: the whole run, driven by policy, no page.
 *
 * WHAT IT DRIVES. src/lib/rebuildLoop.ts is the game as pure functions over a
 * RunState (envelopes, manager, spin, keep or sell, the three prices and the
 * free bench, bidding wars, the whistle). This bundles the REAL engine with
 * esbuild, builds every club's market through the REAL buildMarket from the
 * baked pool (scripts/data/rebuildMarket.json, 2,914 rows of game_player_pool
 * pulled by scripts/bakeRebuildSquads.mjs) and plays hundreds of seeded runs
 * through three policies:
 *   keep everything   keeps every man the wheel lands on
 *   sell everything   sells every man and buys the dearest thing it can reach
 *   thinking          sells the weak links when there is money, buys the best
 *                     affordable upgrade, promotes for free when the bench is
 *                     as good, walks from wars it cannot win
 *
 * WHAT IT HOLDS
 *   1) every run ends, and every shirt is settled at the whistle with no man
 *      in two shirts, before the reckoning and after it
 *   2) selling is final: a sold man never comes back in a deal, a bench or the
 *      XI, and keep after sell is refused
 *   3) the three prices are ordered dearest first, the free bench is offered
 *      whenever the squad has a fit outside the XI, the 40 overall is always
 *      there, and the cheap seat is actually cheap
 *   4) negative money force sells: random (the first shirt sold is not the
 *      same one every time and not simply the dearest) and bounded (never
 *      more swaps than shirts, every swap recoups, funds never fall)
 *   5) the punishment deck holds exactly one safe card and deals without
 *      replacement
 *   6) the board's demands are checkable (plain data in, boolean out) and
 *      checked (the reckoning's misses equal a recount, one card per miss),
 *      every hand is satisfiable under every preset, the mood runs from
 *      horrible to great and only Barcelona's envelope mentions its sponsor
 *   7) skill beats spam: the thinking policy finishes above both dumb ones by
 *      a measured margin, on rating and on the target
 *   8) the managers are three generated people with different profiles and
 *      fees, and no hire covers the target on its own
 *   9) one seed, one run: a replay is byte identical
 *
 * NEGATIVE CONTROL, and it reproduces the shipped defect this round fixed:
 *   SIM_REBUILD_LOOP_CONTROL=top900   caps the market at the 900 most valuable
 *                                     rows inside a copy of rebuildDeck.ts,
 *                                     which is what src/lib/fetchRebuild.ts did
 *                                     until Round 456 (fetchAllRows was handed
 *                                     a cap of 900). Row 900 of the pool is
 *                                     worth 15 million, so the scouts' "cheap
 *                                     seat" was never under 15 million and a
 *                                     modest club could not reach any of the
 *                                     three prices without the overdraft.
 *                                     Section 3 must FAIL on the cheap seat.
 * The control patches a copy of the file, normalises CRLF first, asserts the
 * text it rewrites is present exactly once, and refuses to run otherwise.
 *
 * Run: node scripts/simRebuildLoop.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.SIM_REBUILD_LOOP_CONTROL || '';
if (CONTROL && CONTROL !== 'top900') {
  console.error(`SIM_REBUILD_LOOP_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* ---------- module paths, patched in place for a control ---------- */

const DECK_SRC = `${ROOT}/src/lib/rebuildDeck.ts`;
const LOOP_SRC = `${ROOT}/src/lib/rebuildLoop.ts`;
const CONTROL_DIR = `${ROOT}/.sim-control`;
fs.rmSync(CONTROL_DIR, { recursive: true, force: true });

function patchedCopy(file, oldText, newText, outName) {
  const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const hits = src.split(oldText).length - 1;
  if (hits !== 1) {
    console.error(`control cannot fire: ${path.basename(file)} contains the text it rewrites ${hits} times, not once`);
    console.error(oldText);
    process.exit(1);
  }
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
  const out = `${CONTROL_DIR}/${outName}`;
  fs.writeFileSync(out, src.replace(oldText, newText));
  return out;
}

let deckPath = DECK_SRC;
if (CONTROL === 'top900') {
  deckPath = patchedCopy(
    DECK_SRC,
    'export function buildMarket(rows: MarketRow[], excludeClub: string, leagueOf: (name: string, club: string) => League): Player[] {\n  const seen = new Set<string>();',
    'export function buildMarket(rows: MarketRow[], excludeClub: string, leagueOf: (name: string, club: string) => League): Player[] {\n  rows = rows.slice(0, 900);\n  const seen = new Set<string>();',
    'simRebuildLoop.control.rebuildDeck.ts',
  );
  console.log('NEGATIVE CONTROL ON: the market is the 900 most valuable rows, the shape fetchRebuild shipped until Round 456');
}

/* ---------- bundle the real modules ---------- */

const ENTRY = `${TMP}/rebuildLoop.entry.mjs`;
const BUNDLE = `${TMP}/rebuildLoop.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as deck from '${deckPath}';
export * as loop from '${LOOP_SRC}';
export { FORMATIONS, playerRating, normalizePosition } from '${ROOT}/src/lib/squadDeal.ts';
export { getEnrichment } from '${ROOT}/src/data/footleEnrichment.ts';
`);
try {
  execSync(
    `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`,
    { stdio: 'inherit' },
  );
} finally {
  fs.rmSync(CONTROL_DIR, { recursive: true, force: true });
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { deck, loop, FORMATIONS, playerRating, normalizePosition, getEnrichment } = await import(pathToFileURL(BUNDLE).href);

/* ---------- fixtures ---------- */

const squadsFixture = JSON.parse(fs.readFileSync(`${ROOT}/scripts/data/rebuildSquads.json`, 'utf8'));
const marketFixture = JSON.parse(fs.readFileSync(`${ROOT}/scripts/data/rebuildMarket.json`, 'utf8'));

/** The same mapping src/lib/fetchRebuild.ts does on the rows this was baked from. */
function toSquad(rows) {
  const out = [];
  for (const [name, rawPos, age, usd] of rows) {
    const position = normalizePosition(rawPos || '');
    if (!position) continue;
    out.push({
      name, position, age, club: 'x', nationality: 'Unknown', league: 'Other',
      goals: 0, assists: 0, kitNumber: null, difficulty: 'easy',
      marketValue: Math.max(1, Math.round((usd || 1_000_000) / 1_000_000)),
    });
  }
  return out;
}
const MARKET_ROWS = marketFixture.rows.map(([player_name, position, age, nationality, club, market_value_usd]) => ({ player_name, position, age, nationality, club, market_value_usd }));
const leagueOf = (name, club) => getEnrichment(name, club).league;
const marketCache = new Map();
function marketFor(clubName) {
  if (!marketCache.has(clubName)) marketCache.set(clubName, deck.buildMarket(MARKET_ROWS, clubName, leagueOf));
  return marketCache.get(clubName);
}
const CLUBS = squadsFixture.clubs.map(c => ({ club: c.club, tier: c.tier, squadSize: c.squad.length, squadValueM: 0 }));
const SQUADS = new Map(squadsFixture.clubs.map(c => [c.club, toSquad(c.squad)]));

console.log(`Rebuild loop: ${CLUBS.length} clubs, ${MARKET_ROWS.length} market rows pulled ${marketFixture.pulled}${CONTROL ? `  [CONTROL=${CONTROL}]` : ''}`);
{
  const open = marketFor('Real Madrid');
  const cheapest = Math.min(...open.map(p => p.marketValue));
  console.log(`  the open market for one club: ${open.length} players, cheapest €${cheapest}M, dearest €${Math.max(...open.map(p => p.marketValue))}M`);
}

/* ---------- policies ---------- */

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

function dearestAffordable(s, ceiling) {
  return s.deal.offers.filter(p => loop.offerPrice(s, p) <= ceiling).sort((a, b) => loop.offerPrice(s, b) - loop.offerPrice(s, a))[0];
}

const KEEP_ALL = {
  name: 'keep everything',
  finance: () => 0,
  manager: () => deck.KEEP_MANAGER.id,
  spun: () => 'keep',
  deal: s => (s.deal.bench[0] ? { kind: 'promote', name: s.deal.bench[0].name } : { kind: 'forty' }),
  war: () => 'walk',
};

const SELL_ALL = {
  name: 'sell everything',
  finance: () => 0,
  manager: s => s.managerOptions.reduce((a, b) => (b.cost > a.cost ? b : a)).id,
  spun: () => 'sell',
  deal: s => {
    const best = dearestAffordable(s, loop.spendCeilingOf(s));
    if (best) return { kind: 'offer', name: best.name };
    if (s.deal.bench[0]) return { kind: 'promote', name: s.deal.bench[0].name };
    return { kind: 'forty' };
  },
  war: s => (deck.nextRaise(s.war.price) <= loop.spendCeilingOf(s) ? 'raise' : 'walk'),
};

/* The thinking policy reads the board. Every demand is plain data, so it can
   count how many signings and sales it still owes, which value cap it must
   stay under, and which kind of man (young, marquee, a compatriot) the next
   deal should favour. That is what a player who reads the envelope does; the
   dumb policies never look at it. */
const SIGNINGS_OWED = { busy: 3, pressureFour: 4, youth: 2, youth3: 3, idCore: 2, sameNation: 2, marquee: 1, marquee2: 2, idGalactico: 1, idStatement: 2, idUpgrade: 1 };
const SALES_OWED = { clearout: 2, pressureClearout: 3, idFlip: 1 };
function boardRead(s) {
  const unmet = new Set(loop.objectivesOf(s).filter(o => !o.met).map(o => o.objective.id));
  let signings = 0;
  let sales = 0;
  for (const id of unmet) {
    if (SIGNINGS_OWED[id]) signings = Math.max(signings, SIGNINGS_OWED[id] - s.signed.length);
    if (SALES_OWED[id]) sales = Math.max(sales, SALES_OWED[id] - s.sold.length);
  }
  const cap = Math.min(...s.board.demands.map(o => o.capValue ?? Infinity));
  const reserve = unmet.has('pressureBank') ? 20 : unmet.has('inTheBlack') ? 0 : -deck.OVERDRAFT_LIMIT / 2;
  return { unmet, signings, sales, cap, reserve };
}

/* What the scouts' three bands typically hold for a shirt: the median value
   and rating of the top 8 percent, the 25 to 55 percent band and the bottom
   20 percent of the market's fits, which is how dealReplacements deals. A
   player who has seen a few lists knows roughly what each price buys. */
const bandCache = new Map();
function bandView(s, slotIdx) {
  const key = `${s.club.club}|${s.formation.name}|${slotIdx}`;
  if (bandCache.has(key)) return bandCache.get(key);
  const slot = s.formation.slots[slotIdx];
  const fits = s.market.filter(p => slot.allowed.includes(p.position)).sort((a, b) => b.marketValue - a.marketValue);
  const band = (lo, hi) => fits.slice(Math.floor(lo * fits.length), Math.max(Math.floor(lo * fits.length) + 1, Math.floor(hi * fits.length)));
  const view = { marquee: band(0, 0.08), solid: band(0.25, 0.55), cheap: band(0.8, 1) };
  bandCache.set(key, view);
  return view;
}

/** The rating a sale of this shirt would probably buy with `cash`, less the
 *  man's own rating: for each band, the median rating of the members the
 *  cash reaches, counted only when the cash reaches at least a third of the
 *  band, because the draw inside a band is random. */
function expectedGain(s, slotIdx, cash) {
  const inc = s.baseXi[slotIdx];
  const r = inc ? playerRating(inc) : 40;
  const view = bandView(s, slotIdx);
  let best = 0;
  for (const members of [view.marquee, view.solid, view.cheap]) {
    const reach = members.filter(p => p.marketValue <= cash);
    if (members.length && reach.length * 3 >= members.length) best = Math.max(best, median(reach.map(playerRating)));
  }
  return best - r;
}

const THINKING = {
  name: 'thinking',
  finance: () => 0,
  manager: s => {
    /* The hire that lifts the XI most, if he is worth a fifth of the pot or less. */
    const budget = loop.budgetOf(s);
    const now = loop.ratingOf(s, null);
    let best = deck.KEEP_MANAGER.id;
    let bestGain = 0;
    for (const m of s.managerOptions) {
      const gain = loop.ratingOf(s, m) - now;
      if (m.cost <= budget * 0.2 && gain > bestGain) { best = m.id; bestGain = gain; }
    }
    return best;
  },
  spun: s => {
    const inc = s.baseXi[s.spun];
    const xi = loop.xiOf(s).filter(Boolean);
    const avg = mean(xi.map(playerRating));
    const r = playerRating(inc);
    const cash = loop.budgetOf(s) + inc.marketValue;
    const read = boardRead(s);
    const remaining = s.formation.slots.length - s.settledCount;
    const isStar = r >= avg + 4;
    /* The board is owed deals and the shirts are running out: sell anyone but a star. */
    if ((read.sales > 0 || read.signings > 0) && remaining <= read.sales + read.signings + 2 && !isStar && cash >= 12) return 'sell';
    /* A flip demand wants one big sale. */
    if (read.unmet.has('idFlip') && inc.marketValue >= 25 && !isStar) return 'sell';
    /* Sell when the sale plus the pot probably buys a better man AND the
       fallback (the solid band, if the marquee draw is out of reach) does not
       cost much: a list is a random draw, so the downside has to be bounded. */
    const spend = cash - Math.max(0, read.reserve);
    if (expectedGain(s, s.spun, spend) >= 2) {
      const solid = bandView(s, s.spun).solid.filter(p => p.marketValue <= spend);
      const fallback = solid.length ? median(solid.map(playerRating)) : 40;
      if (fallback >= r - 2) return 'sell';
    }
    return 'keep';
  },
  deal: s => {
    const inc = s.baseXi[s.spun];
    const floor = inc ? playerRating(inc) : 40;
    const budget = loop.budgetOf(s);
    const read = boardRead(s);
    const signedNations = new Set(s.signed.map(p => p.nationality));
    const lift = s.manager && s.manager.lift > 0 ? p => (deck.managerFits(s.manager.profile, p) ? s.manager.lift : 0) : () => 0;
    const score = p => {
      let v = playerRating(p) + lift(p);
      if (read.unmet.has('youth') && p.age > 0 && p.age <= 23) v += 4;
      if (read.unmet.has('youth3') && p.age > 0 && p.age <= 24) v += 4;
      if (read.unmet.has('idCore') && p.age > 0 && p.age <= 26) v += 4;
      if (read.unmet.has('marquee') && p.marketValue >= 70) v += 5;
      if (read.unmet.has('marquee2') && p.marketValue >= 60) v += 5;
      if (read.unmet.has('idGalactico') && p.marketValue >= 80) v += 6;
      if (read.unmet.has('idStatement') && p.marketValue >= 50) v += 5;
      if (read.unmet.has('sameNation') && signedNations.has(p.nationality)) v += 4;
      if (read.unmet.has('prime') && p.age > 29) v -= 8;
      return v;
    };
    /* Share the pot across the shirts still likely to need a buy: the weak
       links not yet spun plus the inherited holes. One shirt may take up to
       twice its share, never the whole pot with weak shirts still to come. */
    const room = budget - read.reserve;
    /* Keep a cheap seat's worth of money back for every shirt still worth selling. */
    const pending = s.order.slice(s.settledCount + 1).filter(i => !s.baseXi[i] || expectedGain(s, i, room + s.baseXi[i].marketValue) >= 2).length;
    const spendable = Math.max(Math.min(room, 6), room - pending * 6);
    const offers = s.deal.offers
      .filter(p => loop.offerPrice(s, p) <= spendable && p.marketValue <= read.cap)
      .sort((a, b) => score(b) - score(a) || loop.offerPrice(s, a) - loop.offerPrice(s, b));
    const best = offers[0];
    const bench = s.deal.bench[0];
    const benchR = bench ? playerRating(bench) + lift(bench) : 0;
    const bestR = best ? playerRating(best) + lift(best) : 0;
    if (best && score(best) > benchR + 1 && bestR >= floor - 1) return { kind: 'offer', name: best.name };
    if (bench && benchR >= floor - 2 && read.signings === 0) return { kind: 'promote', name: bench.name };
    if (best && bestR > benchR) return { kind: 'offer', name: best.name };
    if (bench) return { kind: 'promote', name: bench.name };
    /* Nothing affordable within the pot: a cheap man beats a 40 overall, even on the overdraft. */
    const cheap = s.deal.offers.filter(p => loop.offerPrice(s, p) <= loop.spendCeilingOf(s) && p.marketValue <= read.cap).sort((a, b) => loop.offerPrice(s, a) - loop.offerPrice(s, b))[0];
    if (cheap && loop.offerPrice(s, cheap) <= 12) return { kind: 'offer', name: cheap.name };
    if (loop.canRedeal(s) && s.dealAttempt < 2) return { kind: 'redeal' };
    return { kind: 'forty' };
  },
  war: s => {
    const next = deck.nextRaise(s.war.price);
    return next <= loop.budgetOf(s) && next <= s.war.player.marketValue * 1.3 ? 'raise' : 'walk';
  },
};

/* ---------- the driver ---------- */

function setupFor(clubName, seed) {
  const club = CLUBS.find(c => c.club === clubName);
  return { club, clubs: CLUBS, squad: SQUADS.get(clubName), market: marketFor(clubName), preset: 'none', seed };
}

/** Plays one run to the whistle. Every refused move is a finding: the policy
 *  asked for something legal, so the engine handing the same object back
 *  means the rules and the policy disagree about what is legal. */
function playRun(setup, policy, watch = {}) {
  let s = loop.createRun(setup);
  const deals = [];
  let steps = 0;
  const step = (next, what) => {
    if (next === s) throw new Error(`${policy.name} at ${setup.club.club}: "${what}" was refused with the same state back (phase ${s.phase}, spun ${s.spun}, deal ${!!s.deal}, war ${!!s.war})`);
    s = next;
  };
  while (s.phase !== 'done') {
    steps += 1;
    if (steps > 800) throw new Error(`${policy.name} at ${setup.club.club}: the run did not end in 800 steps`);
    if (s.phase === 'envelopes') {
      if (s.financeCard) step(loop.toManager(s), 'toManager');
      else step(loop.pickFinance(s, policy.finance(s)), 'pickFinance');
      continue;
    }
    if (s.phase === 'manager') { step(loop.hireManager(s, policy.manager(s)), 'hireManager'); continue; }
    if (s.war) {
      if (s.war.outcome !== 'live') { step(loop.clearWar(s), 'clearWar'); continue; }
      if (s.war.leader === 'you') { step(loop.rivalReply(s), 'rivalReply'); continue; }
      if (policy.war(s) === 'raise') {
        const raised = loop.raise(s);
        if (raised !== s) { s = raised; continue; }
      }
      step(loop.walk(s), 'walk');
      continue;
    }
    if (s.deal) {
      deals.push({ slot: s.spun, offers: s.deal.offers.map(p => ({ name: p.name, price: loop.offerPrice(s, p), value: p.marketValue })), bench: s.deal.bench.map(p => p.name), afterSale: !!s.baseXi[s.spun], attempt: s.dealAttempt, tier: setup.club.tier });
      if (watch.onDeal) watch.onDeal(s);
      const a = policy.deal(s);
      if (a.kind === 'offer') step(loop.takeOffer(s, a.name), `takeOffer ${a.name}`);
      else if (a.kind === 'promote') step(loop.promote(s, a.name), `promote ${a.name}`);
      else if (a.kind === 'redeal') step(loop.redeal(s), 'redeal');
      else step(loop.takeForty(s), 'takeForty');
      continue;
    }
    if (s.spun !== null) {
      if (policy.spun(s) === 'sell') {
        step(loop.sell(s), 'sell');
        if (watch.onSell) watch.onSell(s);
      } else step(loop.keep(s), 'keep');
      continue;
    }
    if (s.settledCount < s.formation.slots.length) { step(loop.spinNext(s), 'spinNext'); continue; }
    step(loop.blowWhistle(s), 'blowWhistle');
  }
  return { state: s, deals, steps };
}

const SEEDS_PER_CLUB = 6;
/* The club's name as the pool spells it: the one documented flavour line keys on it. */
const BARCELONA = 'FC Barcelona';
const seedsFor = clubName => Array.from({ length: SEEDS_PER_CLUB }, (_, k) => (deck.hashSeed(clubName) ^ (k * 0x9e3779b1)) >>> 0);

const runs = { [KEEP_ALL.name]: [], [SELL_ALL.name]: [], [THINKING.name]: [] };
let dealCount = 0;
let soldComeback = 0;
let keepAfterSellAccepted = 0;
const policies = [KEEP_ALL, SELL_ALL, THINKING];

/* ================= 1. every run ends, every shirt is settled, nobody wears two ================= */
console.log('\n1. EVERY RUN ENDS WITH A FULL XI');
let unsettled = 0;
let doubled = 0;
let played = 0;
for (const policy of policies) {
  for (const c of CLUBS) {
    for (const seed of seedsFor(c.club)) {
      const setup = setupFor(c.club, seed);
      let r;
      try {
        r = playRun(setup, policy, {
          onSell: s => {
            /* keep after sell must hand the same object back */
            if (loop.keep(s) !== s) keepAfterSellAccepted += 1;
          },
        });
      } catch (e) {
        fail(e.message);
        continue;
      }
      played += 1;
      runs[policy.name].push({ club: c.club, tier: c.tier, seed, ...r });
      const s = r.state;
      if (s.settledCount !== s.formation.slots.length || Object.keys(s.decided).length !== s.formation.slots.length) unsettled += 1;
      const before = s.formation.slots.map((_, i) => s.decided[i]).filter(Boolean).map(p => p.name);
      const after = s.reckoning.xi.filter(Boolean).map(p => p.name);
      if (new Set(before).size !== before.length || new Set(after).size !== after.length) doubled += 1;
      /* selling is final: sold men never come back */
      const soldNames = new Set(s.sold.map(p => p.name));
      for (const d of r.deals) {
        dealCount += 1;
        if (d.offers.some(o => soldNames.has(o.name)) || d.bench.some(n => soldNames.has(n))) soldComeback += 1;
      }
      if (after.some(n => soldNames.has(n))) soldComeback += 1;
      if (s.signed.some(p => soldNames.has(p.name))) soldComeback += 1;
    }
  }
}
console.log(`  ${played} runs played across ${policies.length} policies and ${CLUBS.length} clubs, ${dealCount} deals dealt`);
if (played < CLUBS.length * SEEDS_PER_CLUB * policies.length) fail(`only ${played} of ${CLUBS.length * SEEDS_PER_CLUB * policies.length} runs reached the whistle`);
if (unsettled > 0) fail(`${unsettled} runs reached the whistle with a shirt unsettled`);
if (doubled > 0) fail(`${doubled} runs had one man in two shirts`);
console.log(`  shirts unsettled at the whistle: ${unsettled}, XIs with a man in two shirts: ${doubled}`);

/* ================= 2. selling is final ================= */
console.log('\n2. SELLING IS FINAL');
const sells = runs[SELL_ALL.name].reduce((t, r) => t + r.state.sold.length, 0) + runs[THINKING.name].reduce((t, r) => t + r.state.sold.length, 0);
if (sells < 500) fail(`only ${sells} sales across the sell and thinking runs, too few to prove anything`);
if (soldComeback > 0) fail(`${soldComeback} times a sold man came back in a deal, a bench, a signing or the XI`);
if (keepAfterSellAccepted > 0) fail(`keep was accepted ${keepAfterSellAccepted} times after a sale`);
console.log(`  ${sells} sales made, sold men seen again: ${soldComeback}, keep accepted after a sale: ${keepAfterSellAccepted}`);

/* ================= 3. the three prices and the fourth option ================= */
console.log('\n3. THE THREE PRICES, THE FREE BENCH AND THE 40 OVERALL');
{
  let short = 0;
  let unordered = 0;
  let benchMissing = 0;
  let fortyRefused = 0;
  let checked = 0;
  const cheapByTier = { elite: [], strong: [], mid: [], modest: [] };
  const marqueeByTier = { elite: [], strong: [], mid: [], modest: [] };
  const seen = new Set();
  const inspected = new Set();
  const probe = {
    onDeal: s => {
      /* A deal is inspected once, as dealt. It comes round again after a lost
         war with the lost man filtered out, and that is not a short list. */
      const dealKey = `${s.seed}|${s.spun}|${s.dealAttempt}`;
      if (inspected.has(dealKey)) return;
      inspected.add(dealKey);
      checked += 1;
      const slot = s.formation.slots[s.spun];
      /* how many fits the market holds for this shirt, counted here, not by the deal */
      const taken = new Set([
        ...s.baseXi.filter(Boolean).map(p => p.name),
        ...Object.values(s.decided).filter(Boolean).map(p => p.name),
        ...s.signed.map(p => p.name), ...s.sold.map(p => p.name), ...Object.keys(s.lost),
      ]);
      const fits = s.market.filter(p => slot.allowed.includes(p.position) && !taken.has(p.name)).length;
      if (fits >= 3 && s.deal.offers.length < 3) short += 1;
      for (let i = 1; i < s.deal.offers.length; i += 1) {
        if (s.deal.offers[i].marketValue > s.deal.offers[i - 1].marketValue) unordered += 1;
      }
      const benchFits = s.squad.filter(p => slot.allowed.includes(p.position) && !taken.has(p.name)).length;
      if (benchFits > 0 && s.deal.bench.length === 0) benchMissing += 1;
      if (loop.takeForty(s) === s) fortyRefused += 1;
      if (s.deal.offers.length === 3 && s.dealAttempt === 0) {
        const key = `${s.club.club}|${s.spun}|${s.seed}`;
        if (!seen.has(key)) {
          seen.add(key);
          cheapByTier[s.club.tier].push(s.deal.offers[2].marketValue);
          marqueeByTier[s.club.tier].push(s.deal.offers[0].marketValue);
        }
      }
    },
  };
  for (const c of CLUBS) {
    for (const seed of seedsFor(c.club).slice(0, 2)) {
      try { playRun(setupFor(c.club, seed), SELL_ALL, probe); } catch (e) { fail(e.message); }
    }
  }
  console.log(`  ${checked} deals inspected: short lists ${short}, out of order prices ${unordered}, bench withheld ${benchMissing}, 40 overall refused ${fortyRefused}`);
  if (short > 0) fail(`${short} deals offered fewer than three prices with three or more fits in the market`);
  if (unordered > 0) fail(`${unordered} deals listed a dearer man below a cheaper one`);
  if (benchMissing > 0) fail(`${benchMissing} deals withheld the free bench while the squad had a fit`);
  if (fortyRefused > 0) fail(`${fortyRefused} deals refused the 40 overall`);
  for (const tier of ['elite', 'strong', 'mid', 'modest']) {
    const cheap = cheapByTier[tier];
    console.log(`  ${tier}: cheap seat median €${median(cheap)}M (range €${Math.min(...cheap)}M to €${Math.max(...cheap)}M) against a marquee median of €${median(marqueeByTier[tier])}M over ${cheap.length} first deals, pot €${deck.TIER_BUDGET[tier]}M`);
  }
  /* The cheap seat has to be cheap. Measured 2026-09-05 on the full pool the
     median sits at 4 million at every tier (range 4 to 5) against a 65 million
     modest pot; on the shipped top 900 it was 16 million (range 15 to 19), so
     12 sits between the two arms with room either side. */
  const modestCheap = median(cheapByTier.modest);
  if (!(modestCheap <= 12)) fail(`the cheap seat at modest clubs has a median of €${modestCheap}M, which is not a cheap seat (4 on the full pool, 16 on the shipped top 900)`);
  if (!(median(cheapByTier.elite) <= 12)) fail(`the cheap seat at elite clubs has a median of €${median(cheapByTier.elite)}M`);
}

/* ================= 4. negative money force sells, at random, bounded ================= */
console.log('\n4. THE OVERDRAFT RECKONING');
{
  const inDebt = runs[SELL_ALL.name].filter(r => r.state.reckoning.windowFunds < 0);
  let overBound = 0;
  let noRecoup = 0;
  let fundsFell = 0;
  let cleared = 0;
  const firstVictimSlot = new Map();
  let firstIsDearest = 0;
  let withSwaps = 0;
  for (const r of inDebt) {
    const rk = r.state.reckoning;
    if (rk.swaps.length > r.state.formation.slots.length) overBound += 1;
    if (rk.swaps.some(sw => sw.recouped <= 0)) noRecoup += 1;
    const afterForced = rk.windowFunds + rk.swaps.reduce((t, sw) => t + sw.recouped, 0);
    if (afterForced < rk.windowFunds) fundsFell += 1;
    if (rk.remainingDeficit === 0) cleared += 1;
    if (rk.swaps.length > 0) {
      withSwaps += 1;
      const xiBefore = r.state.formation.slots.map((_, i) => r.state.decided[i]);
      const idx = xiBefore.findIndex(p => p && p.name === rk.swaps[0].outName);
      firstVictimSlot.set(idx, (firstVictimSlot.get(idx) ?? 0) + 1);
      const dearest = xiBefore.reduce((a, b) => ((b?.marketValue ?? -1) > (a?.marketValue ?? -1) ? b : a), null);
      if (dearest && dearest.name === rk.swaps[0].outName) firstIsDearest += 1;
    }
  }
  console.log(`  ${inDebt.length} of ${runs[SELL_ALL.name].length} sell everything runs closed the window in debt, ${withSwaps} with at least one forced sale, ${cleared} cleared the debt in full`);
  if (inDebt.length < 60) fail(`only ${inDebt.length} runs closed in debt, too few to test the reckoning`);
  if (overBound > 0) fail(`${overBound} reckonings sold more shirts than the XI has`);
  if (noRecoup > 0) fail(`${noRecoup} reckonings booked a forced sale that recouped nothing`);
  if (fundsFell > 0) fail(`${fundsFell} reckonings left the club poorer after the forced sales`);
  const slotsHit = [...firstVictimSlot.keys()].filter(k => k >= 0).length;
  const dearestShare = withSwaps ? firstIsDearest / withSwaps : 0;
  console.log(`  first shirt sold: ${slotsHit} different shirts across the sample, the dearest man first ${(dearestShare * 100).toFixed(0)}% of the time`);
  if (slotsHit < 6) fail(`the first forced sale hit only ${slotsHit} different shirts, so it is not random`);
  if (dearestShare > 0.5) fail(`the first forced sale is the dearest man ${(dearestShare * 100).toFixed(0)}% of the time, which is a rule wearing a dice`);
}

/* ================= 5. the punishment deck ================= */
console.log('\n5. THE PUNISHMENT DECK');
{
  const safe = deck.PUNISH_DECK.filter(c => c.kind === 'safe');
  if (safe.length !== 1) fail(`the deck holds ${safe.length} safe cards, the spec says exactly one`);
  let repeats = 0;
  const first = new Map();
  for (let s = 0; s < 2000; s += 1) {
    const cards = deck.drawPunishments(deck.hashSeed(`punish-${s}`), 5);
    if (new Set(cards.map(c => c.id)).size !== 5) repeats += 1;
    first.set(cards[0].id, (first.get(cards[0].id) ?? 0) + 1);
  }
  const shares = deck.PUNISH_DECK.map(c => (first.get(c.id) ?? 0) / 2000);
  console.log(`  ${deck.PUNISH_DECK.length} cards, ${safe.length} safe; 2000 full draws, repeats ${repeats}; first card shares ${shares.map(x => (x * 100).toFixed(0) + '%').join(', ')}`);
  if (repeats > 0) fail(`${repeats} draws dealt the same card twice`);
  if (Math.min(...shares) < 0.12) fail(`one card opens only ${(Math.min(...shares) * 100).toFixed(0)}% of the time, the deck is predictable`);
}

/* ================= 6. the board's demands ================= */
console.log('\n6. THE BOARD DEMANDS');
{
  let miscounted = 0;
  let liveDisagrees = 0;
  let cardsOff = 0;
  for (const name of Object.keys(runs)) {
    for (const r of runs[name]) {
      const s = r.state;
      const rk = s.reckoning;
      const recount = s.board.demands.filter(o => !o.check({ signed: s.signed, sold: s.sold, budget: rk.windowFunds })).map(o => o.id);
      if (recount.join('|') !== rk.missed.map(o => o.id).join('|')) miscounted += 1;
      const live = loop.objectivesOf(s).filter(o => !o.met).map(o => o.objective.id);
      if (live.join('|') !== recount.join('|')) liveDisagrees += 1;
      if (rk.cards.length !== Math.min(recount.length, deck.PUNISH_DECK.length)) cardsOff += 1;
    }
  }
  console.log(`  reckonings recounted: misses miscounted ${miscounted}, live checklist disagreeing ${liveDisagrees}, card count off ${cardsOff}`);
  if (miscounted > 0) fail(`${miscounted} reckonings missed a different set of demands than a recount of the plain data`);
  if (liveDisagrees > 0) fail(`${liveDisagrees} times the live checklist disagreed with the reckoning`);
  if (cardsOff > 0) fail(`${cardsOff} reckonings drew a different number of cards than misses`);

  /* Every hand is satisfiable under every preset: search a small window space. */
  const SIGN = [5, 15, 20, 25, 30, 50, 60, 70, 80];
  const SALE = [5, 25, 30, 60, 90];
  const multisets = (values, maxSize) => {
    const out = [[]];
    let level = [[]];
    for (let size = 1; size <= maxSize; size += 1) {
      const next = [];
      for (const combo of level) {
        const from = combo.length ? values.indexOf(combo[combo.length - 1]) : 0;
        for (let i = from; i < values.length; i += 1) next.push([...combo, values[i]]);
      }
      out.push(...next);
      level = next;
    }
    return out;
  };
  const mk = (v, i, age) => ({ name: `p${i}${v}`, position: 'CM', age, nationality: 'Spain', marketValue: v, club: 'x', league: 'Other', goals: 0, assists: 0, kitNumber: null, difficulty: 'easy' });
  const signSets = multisets(SIGN, 4).map(vals => vals.map((v, i) => mk(v, i, 22)));
  const saleSets = multisets(SALE, 3).map(vals => vals.map((v, i) => mk(v, i + 9, 27)));
  const sum = arr => arr.reduce((t, p) => t + p.marketValue, 0);
  const satisfiable = (hand, tier, delta, cap) => {
    for (const signed of signSets) {
      if (cap !== undefined && signed.some(p => p.marketValue > cap)) continue;
      for (const sold of saleSets) {
        const state = { signed, sold, budget: deck.TIER_BUDGET[tier] + delta + sum(sold) - sum(signed) };
        if (hand.every(o => o.check(state))) return true;
      }
    }
    return false;
  };
  const moods = new Map();
  let impossible = 0;
  let sizeOff = 0;
  let spotify = 0;
  let spotifyElsewhere = 0;
  let hands = 0;
  const caps = { bargain: 30 };
  for (const preset of deck.REBUILD_PRESETS.map(p => p.id)) {
    for (const c of CLUBS) {
      for (const seed of seedsFor(c.club)) {
        const env = deck.boardEnvelopeFor(seed, c, preset);
        hands += 1;
        moods.set(env.mood, (moods.get(env.mood) ?? 0) + 1);
        const want = env.mood === 'great' ? 2 : env.mood === 'horrible' ? 4 : 3;
        if (env.demands.length !== want) sizeOff += 1;
        if (!satisfiable(env.demands, c.tier, env.delta, caps[preset])) {
          impossible += 1;
          if (impossible <= 5) console.error(`  ${c.club} (${c.tier}, ${preset}, ${env.mood}) is dealt a board no window can satisfy: ${env.demands.map(o => o.id).join(' | ')}`);
        }
        const mentions = /spotify/i.test(env.title + env.text);
        if (c.club === BARCELONA && mentions) spotify += 1;
        if (c.club !== BARCELONA && mentions) spotifyElsewhere += 1;
      }
    }
  }
  console.log(`  ${hands} envelopes dealt across ${deck.REBUILD_PRESETS.length} presets: unsatisfiable ${impossible}, demand count off mood ${sizeOff}`);
  console.log(`  moods: ${['horrible', 'bad', 'plain', 'good', 'great'].map(m => `${m} ${moods.get(m) ?? 0}`).join(', ')}; Barcelona's sponsor named ${spotify} times, at other clubs ${spotifyElsewhere}`);
  if (impossible > 0) fail(`${impossible} envelopes hold demands no window can satisfy`);
  if (sizeOff > 0) fail(`${sizeOff} envelopes carry the wrong number of demands for their mood`);
  for (const m of ['horrible', 'bad', 'plain', 'good', 'great']) if (!(moods.get(m) > 0)) fail(`the mood "${m}" was never dealt`);
  /* The one documented club line: Barcelona in a good or great mood names its
     sponsor, and only Barcelona does. Swept over enough seeds to see both
     moods, because four seeds can miss them. */
  const barca = CLUBS.find(c => c.club === BARCELONA);
  if (!barca) fail(`the fixture has no club named "${BARCELONA}", so the documented flavour line cannot be checked`);
  else {
    let goodMoods = 0;
    for (let k = 0; k < 60; k += 1) {
      const env = deck.boardEnvelopeFor(deck.hashSeed(`${BARCELONA}-${k}`), barca, 'none');
      if (env.mood === 'good' || env.mood === 'great') {
        goodMoods += 1;
        if (/spotify/i.test(env.title + env.text)) spotify += 1;
      }
    }
    if (goodMoods === 0) fail('60 seeds never put Barcelona\'s board in a good or great mood');
    if (spotify < goodMoods) fail(`Barcelona named its sponsor in ${spotify} of ${goodMoods} good or great envelopes`);
  }
  if (spotifyElsewhere > 0) fail(`${spotifyElsewhere} envelopes at other clubs mention Barcelona's sponsor`);
  const demandsMentioned = new Set(Object.values(runs).flat().flatMap(r => r.state.board.demands.map(o => o.id)));
  if (!demandsMentioned.has('youth3') || !demandsMentioned.has('marquee2')) fail('the two demands the owner named (three under 25s, two marquee buys) are never dealt');
}

/* ================= 7. skill beats spam ================= */
console.log('\n7. SKILL BEATS SPAM');
{
  const summary = {};
  for (const policy of policies) {
    const rs = runs[policy.name];
    const delta = mean(rs.map(r => loop.ratingOf(r.state) - r.state.startRating));
    const hit = mean(rs.map(r => (loop.ratingOf(r.state) >= r.state.target ? 1 : 0)));
    const debt = mean(rs.map(r => (r.state.reckoning.windowFunds < 0 ? 1 : 0)));
    const cards = mean(rs.map(r => r.state.reckoning.cards.length));
    summary[policy.name] = { delta, hit, debt, cards };
    console.log(`  ${policy.name.padEnd(16)} rating ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} on average, target hit ${(hit * 100).toFixed(0)}%, closed in debt ${(debt * 100).toFixed(0)}%, punishment cards ${cards.toFixed(2)} a run`);
    if (process.env.DIAG) {
      for (const tier of ['elite', 'strong', 'mid', 'modest']) {
        const t = rs.filter(r => r.tier === tier);
        const d = mean(t.map(r => loop.ratingOf(r.state) - r.state.startRating));
        const sold = mean(t.map(r => r.state.sold.length));
        const signed = mean(t.map(r => r.state.signed.length));
        const forty = mean(t.map(r => Object.values(r.state.decided).filter(p => p === null).length));
        const left = mean(t.map(r => r.state.reckoning.windowFunds));
        const pen = mean(t.map(r => r.state.reckoning.ratingPen));
        console.log(`      ${tier.padEnd(7)} ${d >= 0 ? '+' : ''}${d.toFixed(2)}  sold ${sold.toFixed(1)} signed ${signed.toFixed(1)} forty ${forty.toFixed(2)} left €${left.toFixed(0)}M pen ${pen.toFixed(2)}`);
      }
    }
  }
  const t = summary[THINKING.name];
  const k = summary[KEEP_ALL.name];
  const d = summary[SELL_ALL.name];
  /* Margins from measured headroom, 1188 runs on 2026-09-05 (six seeds at
     each of 66 clubs, three policies): thinking +1.52 on rating against sell
     everything +0.32 and keep everything -1.49; target hit 16% against 11%
     and 0%. The gaps are 1.2 and 3.0 points, 5 and 16 points on the hit rate,
     and the floors below sit at about half of each, so the deck can move
     without healthy code going red while a change that lets one button win
     (the shipped market, for one: see the control) still fails.

     The gap over sell everything is real but not wide, and that is a fact
     about the game, not the policy: a sale opens a random list, so even a
     well read sale is a gamble with a bounded upside. It is measured here so
     the next round that touches the bands sees what it did to it. */
  if (!(t.delta >= k.delta + 1.5)) fail(`thinking (${t.delta.toFixed(2)}) does not beat keep everything (${k.delta.toFixed(2)}) by 1.5 rating points`);
  if (!(t.delta >= d.delta + 0.6)) fail(`thinking (${t.delta.toFixed(2)}) does not beat sell everything (${d.delta.toFixed(2)}) by 0.6 rating points`);
  if (!(t.hit >= k.hit + 0.08)) fail(`thinking hits the target ${(t.hit * 100).toFixed(0)}% against keep everything's ${(k.hit * 100).toFixed(0)}%, not 8 points clear`);
  if (!(t.hit >= d.hit + 0.02)) fail(`thinking hits the target ${(t.hit * 100).toFixed(0)}% against sell everything's ${(d.hit * 100).toFixed(0)}%, not 2 points clear`);
  if (!(d.debt >= 0.4)) fail(`sell everything closes in debt only ${(d.debt * 100).toFixed(0)}% of the time, so the overdraft is not biting`);
  if (!(t.debt <= d.debt - 0.3)) fail(`thinking closes in debt ${(t.debt * 100).toFixed(0)}% of the time against sell everything's ${(d.debt * 100).toFixed(0)}%, so reading the pot is worth nothing`);
}

/* ================= 8. the managers ================= */
console.log('\n8. THE MANAGERS');
{
  let sameName = 0;
  let sameProfile = 0;
  let sameFee = 0;
  let coversTarget = 0;
  let realName = 0;
  const seenNames = new Set();
  const banned = ['Guardiola', 'Ancelotti', 'Klopp', 'Simeone', 'Emery', 'De Zerbi', 'Flick', 'Arteta', 'Slot', 'Mourinho'];
  for (const c of CLUBS) {
    const s = loop.createRun(setupFor(c.club, deck.hashSeed(c.club)));
    const names = s.managerOptions.map(m => m.name);
    const profiles = s.managerOptions.map(m => m.profile);
    const fees = s.managerOptions.map(m => m.cost);
    names.forEach(n => seenNames.add(n));
    if (new Set(names).size !== 3) sameName += 1;
    if (new Set(profiles).size !== 3) sameProfile += 1;
    if (new Set(fees).size !== 3) sameFee += 1;
    if (names.some(n => banned.some(b => n.includes(b)))) realName += 1;
    for (const m of s.managerOptions) if (loop.ratingOf(s, m) >= s.target) coversTarget += 1;
  }
  console.log(`  ${CLUBS.length} clubs: ${seenNames.size} distinct names across them; clubs with a repeated name ${sameName}, repeated profile ${sameProfile}, repeated fee ${sameFee}; hires that cover the target alone ${coversTarget}`);
  if (sameName > 0) fail(`${sameName} clubs offer the same manager twice`);
  if (sameProfile > 0) fail(`${sameProfile} clubs offer two managers with the same profile`);
  if (sameFee > 0) fail(`${sameFee} clubs offer two managers at the same fee`);
  if (coversTarget > 0) fail(`${coversTarget} hires reach the target with nothing else done, so the manager is the whole game`);
  if (realName > 0) fail(`${realName} clubs offer a real manager's name with a rating typed for him`);
  if (seenNames.size < 40) fail(`only ${seenNames.size} distinct manager names across ${CLUBS.length} clubs`);
}

/* ================= 9. one seed, one run ================= */
console.log('\n9. ONE SEED, ONE RUN');
{
  const a = playRun(setupFor(BARCELONA, 4242), THINKING).state;
  const b = playRun(setupFor(BARCELONA, 4242), THINKING).state;
  const c = playRun(setupFor(BARCELONA, 4243), THINKING).state;
  const strip = s => JSON.stringify({ decided: s.decided, sold: s.sold.map(p => p.name), signed: s.signed.map(p => p.name), funds: s.reckoning.funds, notes: s.reckoning.notes, manager: s.manager.id, mood: s.board.mood });
  if (strip(a) !== strip(b)) fail('the same seed and policy produced two different runs');
  if (strip(a) === strip(c)) fail('two different seeds produced the same run');
  console.log(`  seed 4242 replays byte for byte (${a.sold.length} sold, ${a.signed.length} signed, €${a.reckoning.funds}M left) and seed 4243 differs`);
}

/* ================= verdict ================= */
console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`control "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`control "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simRebuildLoop: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('simRebuildLoop: all checks passed');
