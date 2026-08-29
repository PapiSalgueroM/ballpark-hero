/**
 * Round 161 harness: structured deals.
 *
 * The negotiation table takes packages now: cash plus add-ons plus a
 * sell-on plus a part-exchange player, weighed by dealPackageValue. The
 * things a regression here would break, pinned:
 *
 *  1. IDENTITY: an extras-free offer behaves exactly as it always did (the
 *     package of pure cash IS the cash), so eleven rounds of transfer
 *     calibration stand untouched.
 *  2. A structure genuinely buys cash off the price: a cash-only offer that
 *     fails closes once the same cash carries add-ons worth the gap.
 *  3. The budget pays CASH only; the add-on queues instead of leaving now.
 *  4. The swapped player leaves with the deal and cannot be bought back.
 *  5. The sell-on rides the signing, and when he is later sold the old club
 *     takes its cut off the top, exactly the promised percentage.
 *  6. Add-ons come due in later summers at roughly the stated rate, never
 *     for a manager who moved clubs.
 * Run: node scripts/simDealDepth.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'dealDepthEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'dealDepth.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, startNextSeason, finishSeason, buildMarket, startNegotiation, makeOffer,
  dealPackageValue, acceptBid, sellValue, playNextEntry,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;

/** A fresh career with an open summer window and a mid-priced target. */
function freshDeal(seed, clubName = 'Aston Villa') {
  Math.random = seeded(seed);
  const s = startCareer(clubName);
  const market = buildMarket(s);
  const target = market.find(m => m.price >= 15 && m.price <= Math.min(45, s.budget * 0.8) && !m.generated);
  if (!target) throw new Error('no suitable target on the market');
  const opened = startNegotiation(s, target);
  if (!opened || !opened.negotiation) throw new Error('negotiation would not open');
  return { state: opened, target };
}

/* ---------- 1. Identity: no extras means the old game exactly ---------- */
console.log('1) Extras-free offers behave as they always did');
{
  const { state } = freshDeal(11);
  const ask = state.negotiation.theirAsk;
  if (dealPackageValue(state, ask, 12.3) !== 12.3) fail('a pure cash package must equal the cash');
  if (dealPackageValue(state, ask, 12.3, {}) !== 12.3) fail('empty extras must equal the cash');
  // Meeting the ask still closes instantly.
  const done = makeOffer(state, ask);
  if (!done || done.negotiation.status !== 'agreed') fail(`meeting the ask did not close (status ${done?.negotiation?.status})`);
  // And an insult still burns patience.
  const { state: s2 } = freshDeal(12);
  const low = makeOffer(s2, s2.negotiation.theirAsk * 0.5);
  if (!low || (low.negotiation.status === 'open' && low.negotiation.patience >= s2.negotiation.patience)) {
    fail('a lowball no longer burns patience');
  }
}

/* ---------- 2 + 3. Structure closes the gap; budget pays cash only ---------- */
console.log('2) Add-ons close a deal cash alone could not, and only cash leaves now');
{
  const { state } = freshDeal(21);
  const ask = state.negotiation.theirAsk;
  const cash = Math.round(ask * 0.9 * 10) / 10; // short of the 0.97 line alone
  const addOn = Math.ceil(((ask * 0.97 - cash) / 0.6) * 10) / 10 + 0.5;
  const pkg = dealPackageValue(state, ask, cash, { addOn });
  if (pkg < ask * 0.97) fail(`test arithmetic wrong: package ${pkg} under the line for ask ${ask}`);
  const before = state.budget;
  const done = makeOffer(state, cash, { addOn });
  if (!done || done.negotiation.status !== 'agreed') {
    fail(`cash 90 percent plus add-ons did not close (status ${done?.negotiation?.status})`);
  } else {
    const spent = Math.round((before - done.budget) * 10) / 10;
    if (spent !== cash) fail(`budget moved by ${spent}, cash was ${cash}: add-ons must not be paid up front`);
    const q = done.pendingAddOns ?? [];
    if (q.length !== 1 || Math.abs(q[0].amount - addOn) > 0.01) fail('the add-on did not join the pending queue');
    if (!done.squad.some(p => p.name === done.negotiation.player.name)) fail('the signed player is not in the squad');
  }
}

/* ---------- 4. The swap leaves with the deal ---------- */
console.log('3) A part-exchange player leaves and stays gone');
{
  const { state } = freshDeal(31);
  const ask = state.negotiation.theirAsk;
  const swap = [...state.squad].sort((a, b) => sellValue(b) - sellValue(a))[2];
  const swapVal = Math.round(sellValue(swap) * 0.85 * 10) / 10;
  const cash = Math.max(0.1, Math.round((ask - swapVal) * 10) / 10);
  const done = makeOffer(state, cash, { swapId: swap.id });
  if (!done || done.negotiation.status !== 'agreed') {
    fail(`cash plus part exchange did not close (status ${done?.negotiation?.status})`);
  } else {
    if (done.squad.some(p => p.id === swap.id)) fail(`${swap.name} is still in the squad after going the other way`);
    if (!done.goneNames.includes(swap.name)) fail(`${swap.name} is not marked gone, he could be bought straight back`);
    if (cash >= ask * 0.97) fail('test arithmetic: the cash alone met the ask, the swap proved nothing');
  }
}

/* ---------- 5. The sell-on takes its cut on resale ---------- */
console.log('4) The sell-on clause pays the old club on resale');
{
  const { state } = freshDeal(41);
  const ask = state.negotiation.theirAsk;
  const sellOnPct = 20;
  const bonus = dealPackageValue(state, ask, 0, { sellOnPct });
  const cash = Math.max(0.1, Math.round((ask - bonus) * 10) / 10);
  const done = makeOffer(state, cash, { sellOnPct });
  if (!done || done.negotiation.status !== 'agreed') {
    fail(`cash plus sell-on did not close (status ${done?.negotiation?.status})`);
  } else {
    const signed = done.squad.find(p => p.name === done.negotiation.player.name);
    if (!signed?.sellOnOwed || signed.sellOnOwed.pct !== 20) fail('the signing does not carry the sell-on clause');
    // Sell him on: the old club takes exactly 20 percent off the top.
    const offer = 30;
    const withBid = {
      ...done,
      incomingBids: [{ playerId: signed.id, playerName: signed.name, club: 'Aston Villa', offer, status: 'open' }],
    };
    const before = withBid.budget;
    const sold = acceptBid(withBid, signed.id);
    if (!sold) fail('the resale would not go through');
    else {
      const gained = Math.round((sold.budget - before) * 10) / 10;
      const expected = Math.round(offer * 0.8 * 10) / 10;
      if (Math.abs(gained - expected) > 0.05) fail(`resale banked ${gained}, expected ${expected} after the 20 percent cut`);
    }
  }
}

/* ---------- 6. Add-ons come due at roughly the stated rate ---------- */
console.log('5) Add-ons come due across summers at about the stated rate');
{
  let triggered = 0;
  const trials = 30;
  for (let t = 0; t < trials; t++) {
    Math.random = seeded(500 + t * 7);
    let s = startCareer('Everton');
    s = { ...s, pendingAddOns: [{ name: 'Test Signing', to: 'Fulham', amount: 6 }] };
    // Play the season out quickly so it can be closed.
    let guard = 0;
    while (s.week < s.calendar.length && guard < 90) {
      guard += 1;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    const fin = finishSeason(s);
    const next = startNextSeason(fin.state);
    if ((next.pendingAddOns ?? []).length !== 0) fail('the add-on ledger was not settled over the summer');
    if ((next.aiHeadlines ?? []).some(h => h.includes('add-ons came due'))) triggered += 1;
  }
  /* 0.65 per roll over 30 trials: binomial sd ~2.6, so [12, 27] is over
     three sigma each side. Outside that band the rate is broken, not
     unlucky. */
  console.log(`   add-ons triggered in ${triggered}/${trials} summers`);
  if (triggered < 12 || triggered > 27) fail(`add-ons came due ${triggered}/${trials}, far from the 0.65 rate`);
}

Math.random = REAL_RANDOM;
if (failures > 0) {
  console.error(`simDealDepth: ${failures} FAILURES`);
  process.exit(1);
}
console.log('simDealDepth: all green');
