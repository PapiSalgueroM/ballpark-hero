import { Player } from '@/types/game';
import { playerRating } from '@/lib/squadDeal';
import { KEEP_MANAGER, OVERDRAFT_LIMIT, managerFits, nextRaise } from '@/lib/rebuildDeck';
import * as loop from '@/lib/rebuildLoop';
import type { RunState } from '@/lib/rebuildLoop';

/**
 * Rebuild Challenge: the policies that play a run with no hand on the phone.
 *
 * Round 461. These three lived inside scripts/simRebuildLoop.mjs from Round
 * 456 as the harness's own players: keep everything, sell everything, and a
 * thinking policy that reads the board, prices the scouts' bands and shares
 * the pot across the shirts still to come. The multiplayer table needs a CPU
 * seat that plays exactly that thinking policy, so the policies moved here
 * and the harness imports them back out of the bundle. One copy, driven by
 * the page and by the harness, which is how the harness's "skill beats spam"
 * margin becomes a fact about the CPU seat rather than about a lookalike.
 *
 * Everything here is pure over a RunState. policyMove takes one step and
 * hands back the engine's answer, so a caller can animate a CPU seat a move
 * at a time or run it to the whistle in one call.
 */

export type DealMove =
  | { kind: 'offer'; name: string }
  | { kind: 'promote'; name: string }
  | { kind: 'redeal' }
  | { kind: 'forty' };

export interface RebuildPolicy {
  name: string;
  /** Which finance envelope to pick, by index into the deck. */
  finance: (s: RunState) => number;
  /** The manager id to hire, KEEP_MANAGER.id to keep the man in place. */
  manager: (s: RunState) => string;
  /** Keep or sell the man the wheel landed on. */
  spun: (s: RunState) => 'keep' | 'sell';
  /** What to do with an open scouts' list. */
  deal: (s: RunState) => DealMove;
  /** Raise or walk when a rival leads a bidding war. */
  war: (s: RunState) => 'raise' | 'walk';
}

const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a: number[]): number => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

function dearestAffordable(s: RunState, ceiling: number): Player | undefined {
  if (!s.deal) return undefined;
  return s.deal.offers
    .filter(p => loop.offerPrice(s, p) <= ceiling)
    .sort((a, b) => loop.offerPrice(s, b) - loop.offerPrice(s, a))[0];
}

export const KEEP_ALL: RebuildPolicy = {
  name: 'keep everything',
  finance: () => 0,
  manager: () => KEEP_MANAGER.id,
  spun: () => 'keep',
  deal: s => (s.deal?.bench[0] ? { kind: 'promote', name: s.deal.bench[0].name } : { kind: 'forty' }),
  war: () => 'walk',
};

export const SELL_ALL: RebuildPolicy = {
  name: 'sell everything',
  finance: () => 0,
  manager: s => s.managerOptions.reduce((a, b) => (b.cost > a.cost ? b : a)).id,
  spun: () => 'sell',
  deal: s => {
    const best = dearestAffordable(s, loop.spendCeilingOf(s));
    if (best) return { kind: 'offer', name: best.name };
    if (s.deal?.bench[0]) return { kind: 'promote', name: s.deal.bench[0].name };
    return { kind: 'forty' };
  },
  war: s => (s.war && nextRaise(s.war.price) <= loop.spendCeilingOf(s) ? 'raise' : 'walk'),
};

/* The thinking policy reads the board. Every demand is plain data, so it can
   count how many signings and sales it still owes, which value cap it must
   stay under, and which kind of man (young, marquee, a compatriot) the next
   deal should favour. That is what a player who reads the envelope does; the
   dumb policies never look at it. */
const SIGNINGS_OWED: Record<string, number> = { busy: 3, pressureFour: 4, youth: 2, youth3: 3, idCore: 2, sameNation: 2, marquee: 1, marquee2: 2, idGalactico: 1, idStatement: 2, idUpgrade: 1 };
const SALES_OWED: Record<string, number> = { clearout: 2, pressureClearout: 3, idFlip: 1 };

interface BoardRead {
  unmet: Set<string>;
  signings: number;
  sales: number;
  cap: number;
  reserve: number;
}

function boardRead(s: RunState): BoardRead {
  const unmet = new Set(loop.objectivesOf(s).filter(o => !o.met).map(o => o.objective.id));
  let signings = 0;
  let sales = 0;
  for (const id of unmet) {
    if (SIGNINGS_OWED[id]) signings = Math.max(signings, SIGNINGS_OWED[id] - s.signed.length);
    if (SALES_OWED[id]) sales = Math.max(sales, SALES_OWED[id] - s.sold.length);
  }
  const cap = Math.min(...s.board.demands.map(o => o.capValue ?? Infinity));
  const reserve = unmet.has('pressureBank') ? 20 : unmet.has('inTheBlack') ? 0 : -OVERDRAFT_LIMIT / 2;
  return { unmet, signings, sales, cap, reserve };
}

/* What the scouts' three bands typically hold for a shirt: the median value
   and rating of the top 8 percent, the 25 to 55 percent band and the bottom
   20 percent of the market's fits, which is how dealReplacements deals. A
   player who has seen a few lists knows roughly what each price buys. The
   view is a pure function of the market and the shirt, so it is cached per
   market array (one per run, or one per club in the harness). */
interface BandView { marquee: Player[]; solid: Player[]; cheap: Player[] }
const bandCache = new WeakMap<Player[], Map<string, BandView>>();

function bandView(s: RunState, slotIdx: number): BandView {
  let perMarket = bandCache.get(s.market);
  if (!perMarket) {
    perMarket = new Map();
    bandCache.set(s.market, perMarket);
  }
  const key = `${s.formation.name}|${slotIdx}`;
  const hit = perMarket.get(key);
  if (hit) return hit;
  const slot = s.formation.slots[slotIdx];
  const fits = s.market.filter(p => slot.allowed.includes(p.position)).sort((a, b) => b.marketValue - a.marketValue);
  const band = (lo: number, hi: number) => fits.slice(Math.floor(lo * fits.length), Math.max(Math.floor(lo * fits.length) + 1, Math.floor(hi * fits.length)));
  const view = { marquee: band(0, 0.08), solid: band(0.25, 0.55), cheap: band(0.8, 1) };
  perMarket.set(key, view);
  return view;
}

/** The rating a sale of this shirt would probably buy with `cash`, less the
 *  man's own rating: for each band, the median rating of the members the
 *  cash reaches, counted only when the cash reaches at least a third of the
 *  band, because the draw inside a band is random. */
function expectedGain(s: RunState, slotIdx: number, cash: number): number {
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

export const THINKING: RebuildPolicy = {
  name: 'thinking',
  finance: () => 0,
  manager: s => {
    /* The hire that lifts the XI most, if he is worth a fifth of the pot or less. */
    const budget = loop.budgetOf(s);
    const now = loop.ratingOf(s, null);
    let best = KEEP_MANAGER.id;
    let bestGain = 0;
    for (const m of s.managerOptions) {
      const gain = loop.ratingOf(s, m) - now;
      if (m.cost <= budget * 0.2 && gain > bestGain) { best = m.id; bestGain = gain; }
    }
    return best;
  },
  spun: s => {
    if (s.spun === null) return 'keep';
    const inc = s.baseXi[s.spun];
    if (!inc) return 'keep';
    const xi = loop.xiOf(s).filter((p): p is Player => p !== null);
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
    if (s.spun === null || !s.deal) return { kind: 'forty' };
    const deal = s.deal;
    const inc = s.baseXi[s.spun];
    const floor = inc ? playerRating(inc) : 40;
    const budget = loop.budgetOf(s);
    const read = boardRead(s);
    const signedNations = new Set(s.signed.map(p => p.nationality));
    const manager = s.manager;
    const lift = manager && manager.lift > 0 ? (p: Player) => (managerFits(manager.profile, p) ? manager.lift : 0) : () => 0;
    const score = (p: Player) => {
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
    const pending = s.order.slice(s.settledCount + 1).filter(i => {
      const base = s.baseXi[i];
      return !base || expectedGain(s, i, room + base.marketValue) >= 2;
    }).length;
    const spendable = Math.max(Math.min(room, 6), room - pending * 6);
    const offers = deal.offers
      .filter(p => loop.offerPrice(s, p) <= spendable && p.marketValue <= read.cap)
      .sort((a, b) => score(b) - score(a) || loop.offerPrice(s, a) - loop.offerPrice(s, b));
    const best = offers[0];
    const bench = deal.bench[0];
    const benchR = bench ? playerRating(bench) + lift(bench) : 0;
    const bestR = best ? playerRating(best) + lift(best) : 0;
    if (best && score(best) > benchR + 1 && bestR >= floor - 1) return { kind: 'offer', name: best.name };
    if (bench && benchR >= floor - 2 && read.signings === 0) return { kind: 'promote', name: bench.name };
    if (best && bestR > benchR) return { kind: 'offer', name: best.name };
    if (bench) return { kind: 'promote', name: bench.name };
    /* Nothing affordable within the pot: a cheap man beats a 40 overall, even on the overdraft. */
    const cheap = deal.offers
      .filter(p => loop.offerPrice(s, p) <= loop.spendCeilingOf(s) && p.marketValue <= read.cap)
      .sort((a, b) => loop.offerPrice(s, a) - loop.offerPrice(s, b))[0];
    if (cheap && loop.offerPrice(s, cheap) <= 12) return { kind: 'offer', name: cheap.name };
    if (loop.canRedeal(s) && s.dealAttempt < 2) return { kind: 'redeal' };
    return { kind: 'forty' };
  },
  war: s => {
    if (!s.war) return 'walk';
    const next = nextRaise(s.war.price);
    return next <= loop.budgetOf(s) && next <= s.war.player.marketValue * 1.3 ? 'raise' : 'walk';
  },
};

export interface PolicyMove {
  /** The move the policy asked for, for the harness's refusal message. */
  what: string;
  next: RunState;
}

/** One move of a run under a policy, in the order the page offers them: the
 *  envelopes, the manager, a live war, an open list, the drawn shirt, the
 *  wheel, the whistle. The engine hands the same object back when the move
 *  is refused, and this passes that straight through so the caller can see
 *  it. A refused raise falls through to a walk, because a war the wallet
 *  cannot follow is a war you leave. */
export function policyMove(s: RunState, policy: RebuildPolicy): PolicyMove {
  if (s.phase === 'done') return { what: 'done', next: s };
  if (s.phase === 'envelopes') {
    if (s.financeCard) return { what: 'toManager', next: loop.toManager(s) };
    return { what: 'pickFinance', next: loop.pickFinance(s, policy.finance(s)) };
  }
  if (s.phase === 'manager') return { what: 'hireManager', next: loop.hireManager(s, policy.manager(s)) };
  if (s.war) {
    if (s.war.outcome !== 'live') return { what: 'clearWar', next: loop.clearWar(s) };
    if (s.war.leader === 'you') return { what: 'rivalReply', next: loop.rivalReply(s) };
    if (policy.war(s) === 'raise') {
      const raised = loop.raise(s);
      if (raised !== s) return { what: 'raise', next: raised };
    }
    return { what: 'walk', next: loop.walk(s) };
  }
  if (s.deal) {
    const a = policy.deal(s);
    if (a.kind === 'offer') return { what: `takeOffer ${a.name}`, next: loop.takeOffer(s, a.name) };
    if (a.kind === 'promote') return { what: `promote ${a.name}`, next: loop.promote(s, a.name) };
    if (a.kind === 'redeal') return { what: 'redeal', next: loop.redeal(s) };
    return { what: 'takeForty', next: loop.takeForty(s) };
  }
  if (s.spun !== null) {
    if (policy.spun(s) === 'sell') return { what: 'sell', next: loop.sell(s) };
    return { what: 'keep', next: loop.keep(s) };
  }
  if (s.settledCount < s.formation.slots.length) return { what: 'spinNext', next: loop.spinNext(s) };
  return { what: 'blowWhistle', next: loop.blowWhistle(s) };
}

export interface PolicyRun {
  state: RunState;
  steps: number;
  /** The move the engine refused, if the run stopped short of the whistle. */
  refused: string | null;
}

/** Plays a run to the whistle under a policy. Stops, rather than loops, on a
 *  refused move or after `maxSteps`, and says which. */
export function playToWhistle(start: RunState, policy: RebuildPolicy, maxSteps = 800): PolicyRun {
  let s = start;
  let steps = 0;
  while (s.phase !== 'done') {
    if (steps >= maxSteps) return { state: s, steps, refused: `no whistle in ${maxSteps} steps` };
    steps += 1;
    const { what, next } = policyMove(s, policy);
    if (next === s) return { state: s, steps, refused: what };
    s = next;
  }
  return { state: s, steps, refused: null };
}
