import { Player } from '@/types/game';
import { FORMATIONS, playerRating, type Formation } from '@/lib/squadDeal';
import type { RebuildClub } from '@/lib/fetchRebuild';
import {
  hashSeed, budgetFor, managerOptionsFor, KEEP_MANAGER, managerFits, boardEnvelopeFor, fortuneDeckFor,
  drawFinEvent, planRivals, isContested, warRivalIndex, rivalCapFor, nextRaise, spinOrder, dealReplacements,
  drawPunishments, applyPreset, forceSales, bestFor, buildXi, xiRatingWithHoles, OVERDRAFT_LIMIT,
  type ManagerOption, type BoardEnvelope, type BoardObjective, type FinEvent, type FortuneCard,
  type ReplacementDeal, type RebuildPreset, type RivalPlan, type PunishCard, type ForcedSwap,
} from '@/lib/rebuildDeck';

/**
 * Rebuild Challenge: the loop, as pure functions over plain data.
 *
 * Round 456. The whole run (envelopes, the manager, the spin, keep or sell,
 * the three prices and the free bench, the bidding wars, the reckoning) is a
 * RunState and a set of functions that take one and return the next. The
 * React hook (src/hooks/useRebuild.ts) owns the timers and the network; the
 * harness (scripts/simRebuildLoop.mjs) drives thousands of runs through the
 * same functions with no page at all. A later round that seats more than one
 * player at the table (pass and play, online, against the CPU) gets one
 * RunState per seat and nothing here has to change.
 *
 * Every function returns the state it was given, untouched, when the move is
 * not legal right now. That is how the page stays crash free on a double tap
 * and how the harness proves a move is refused: same object back.
 */

export type RunPhase = 'envelopes' | 'manager' | 'spin' | 'done';

export interface WarState {
  player: Player;
  rivalIdx: number;
  price: number;
  leader: 'you' | 'rival';
  cap: number;
  log: string[];
  outcome: 'live' | 'won' | 'lost';
}

export interface Perks {
  rescout: number;
  discount: number;
  noWar: number;
}

export interface Reckoning {
  notes: string[];
  xi: (Player | null)[];
  /** Money as the player closed the window, before the board touched anything. The demands are judged on this. */
  windowFunds: number;
  /** Money after the forced sales and the fines. */
  funds: number;
  ratingPen: number;
  swaps: ForcedSwap[];
  remainingDeficit: number;
  cards: PunishCard[];
  missed: BoardObjective[];
}

export interface RunState {
  seed: number;
  club: RebuildClub;
  preset: RebuildPreset;
  formation: Formation;
  /** The club's real squad, as inherited. Never mutated: sold men are tracked in `sold`. */
  squad: Player[];
  /** The market with the preset applied and the club's own players excluded. */
  market: Player[];
  phase: RunPhase;
  startRating: number;
  target: number;
  /** The inherited XI the wheel resolves, built once from the original squad. */
  baseXi: (Player | null)[];
  /** The seeded order the wheel lands on the shirts. */
  order: number[];
  /** Settled shirts by slot index: a Player, or null for a shirt given to a 40 overall. */
  decided: Record<number, Player | null>;
  settledCount: number;
  spun: number | null;
  deal: ReplacementDeal | null;
  dealAttempt: number;
  sold: Player[];
  signed: Player[];
  /** Men lost to a rival in a bidding war, by name, with the rival who took them. */
  lost: Record<string, number>;
  managerOptions: ManagerOption[];
  manager: ManagerOption | null;
  board: BoardEnvelope;
  financeDeck: FortuneCard[];
  financeCard: FortuneCard | null;
  financeIndex: number | null;
  /** Every envelope that arrived after the board's: the finance pick and the ones that came as you went. */
  post: FinEvent[];
  extraFunds: number;
  overpaid: number;
  discounts: number;
  actions: number;
  perks: Perks;
  rivalPlans: RivalPlan[];
  war: WarState | null;
  reckoning: Reckoning | null;
}

export interface RunSetup {
  club: RebuildClub;
  clubs: RebuildClub[];
  squad: Player[];
  market: Player[];
  preset: RebuildPreset;
  /** Defaults to the club name's hash, so a club plays out the same run each time. */
  seed?: number;
}

/**
 * The rating the HUD shows the second a club loads, before the player has
 * touched anything. It is the HUD's own law (xiRatingWithHoles), or the run
 * opens on a delta nobody earned. Round 435 found the two disagreeing: 15 of
 * 66 clubs opened at minus 3 or minus 4 and were graded "You made it worse".
 */
export function openingRating(formation: Formation, squad: Player[]): number {
  return xiRatingWithHoles(buildXi(formation, squad));
}

/**
 * Target is deliberately tier-aware. Elite squads are already near the rating
 * ceiling, so asking Real Madrid for +5 would be impossible while asking Genk
 * for +5 is trivial. Weak squads have far more headroom, bigger ask.
 */
export function targetFor(startRating: number, tier: RebuildClub['tier']): number {
  const bump = tier === 'elite' ? 2 : tier === 'strong' ? 3 : tier === 'mid' ? 5 : 7;
  return Math.min(95, startRating + bump);
}

export function gradeFor(current: number, start: number, target: number): string {
  if (current >= target + 3) return 'Legendary rebuild';
  if (current >= target) return 'Job done';
  if (current > start) return 'Some progress';
  if (current === start) return 'You changed nothing';
  return 'You made it worse';
}

export function createRun(setup: RunSetup): RunState {
  const seed = setup.seed ?? hashSeed(setup.club.club);
  const formation = FORMATIONS[0];
  const startRating = openingRating(formation, setup.squad);
  const board = boardEnvelopeFor(seed, setup.club, setup.preset);
  return {
    seed,
    club: setup.club,
    preset: setup.preset,
    formation,
    squad: setup.squad,
    market: applyPreset(setup.market, setup.preset),
    phase: 'envelopes',
    startRating,
    target: targetFor(startRating, setup.club.tier),
    baseXi: buildXi(formation, setup.squad).map(p => p ?? null),
    order: spinOrder(seed, formation.slots.length),
    decided: {},
    settledCount: 0,
    spun: null,
    deal: null,
    dealAttempt: 0,
    sold: [],
    signed: [],
    lost: {},
    managerOptions: managerOptionsFor(setup.club, seed),
    manager: null,
    board,
    financeDeck: fortuneDeckFor(seed),
    financeCard: null,
    financeIndex: null,
    post: [],
    extraFunds: board.delta,
    overpaid: 0,
    discounts: 0,
    actions: 0,
    perks: { rescout: 0, discount: 0, noWar: 0 },
    rivalPlans: planRivals(setup.club, setup.clubs, seed),
    war: null,
    reckoning: null,
  };
}

/* ---------------- readings ---------------- */

function liftOf(manager: ManagerOption | null): ((p: Player) => number) | undefined {
  if (!manager || manager.lift === 0) return undefined;
  return p => (managerFits(manager.profile, p) ? manager.lift : 0);
}

export function budgetOf(s: RunState): number {
  return budgetFor(s.club.tier)
    + s.extraFunds
    - (s.manager?.cost ?? 0)
    - s.overpaid
    + s.discounts
    + s.sold.reduce((t, p) => t + p.marketValue, 0)
    - s.signed.reduce((t, p) => t + p.marketValue, 0);
}

export function spendCeilingOf(s: RunState): number {
  return budgetOf(s) + OVERDRAFT_LIMIT;
}

/** The XI on screen: decisions override, an unspun shirt shows its incumbent, an open sale shows empty. */
export function xiOf(s: RunState): (Player | null)[] {
  const soldNames = new Set(s.sold.map(p => p.name));
  return s.formation.slots.map((_, i) => {
    if (i in s.decided) return s.decided[i];
    const inc = s.baseXi[i];
    return inc && !soldNames.has(inc.name) ? inc : null;
  });
}

/** The live rating, the manager's lift included, the reckoning's penalty included once there is one. */
export function ratingOf(s: RunState, manager: ManagerOption | null = s.manager): number {
  const lift = liftOf(manager);
  if (s.reckoning) {
    return Math.max(1, Math.min(99, xiRatingWithHoles(s.reckoning.xi, lift) - s.reckoning.ratingPen));
  }
  const xi = xiOf(s);
  if (!xi.some(Boolean)) return 0;
  return Math.max(1, Math.min(99, xiRatingWithHoles(xi, lift)));
}

export interface ObjectiveView {
  objective: BoardObjective;
  met: boolean;
}

/** Every demand, checked against the window as the player has it (or closed it). */
export function objectivesOf(s: RunState): ObjectiveView[] {
  const budget = s.reckoning ? s.reckoning.windowFunds : budgetOf(s);
  return s.board.demands.map(o => ({ objective: o, met: o.check({ signed: s.signed, sold: s.sold, budget }) }));
}

/** The money after the whistle, or the live budget until then. */
export function finalFundsOf(s: RunState): number {
  return s.reckoning ? s.reckoning.funds : budgetOf(s);
}

export function gradeOf(s: RunState): string {
  return gradeFor(ratingOf(s), s.startRating, s.target);
}

/** Can the scouts be asked for a fresh list right now: the list is a dead end, or a perk pays for it. */
export function canRedeal(s: RunState): boolean {
  if (!s.deal || s.war) return false;
  const ceiling = spendCeilingOf(s);
  const deadEnd = !s.deal.offers.some(p => offerPrice(s, p) <= ceiling) && s.deal.bench.length === 0;
  return deadEnd || s.perks.rescout > 0;
}

/** What an offer costs this player right now: the value, or 20 percent under it while the discount perk is held. */
export function offerPrice(s: RunState, p: Player): number {
  return s.perks.discount > 0 ? Math.round(p.marketValue * 0.8) : p.marketValue;
}

/* ---------------- the envelopes and the manager ---------------- */

export function pickFinance(s: RunState, index: number): RunState {
  if (s.phase !== 'envelopes' || s.financeCard) return s;
  const card = s.financeDeck[index];
  if (!card) return s;
  const perks = { ...s.perks };
  if (card.perk) perks[card.perk] += 1;
  return {
    ...s,
    financeCard: card,
    financeIndex: index,
    extraFunds: s.extraFunds + card.delta,
    perks,
    post: [...s.post, { emoji: card.emoji, text: card.title, delta: card.delta, perk: card.perk }],
  };
}

export function toManager(s: RunState): RunState {
  if (s.phase !== 'envelopes' || !s.financeCard) return s;
  return { ...s, phase: 'manager' };
}

export function hireManager(s: RunState, id: string): RunState {
  if (s.phase !== 'manager') return s;
  const manager = id === KEEP_MANAGER.id ? KEEP_MANAGER : s.managerOptions.find(m => m.id === id);
  if (!manager) return s;
  return { ...s, manager, phase: 'spin' };
}

/** Formation is a pre spin choice: once the wheel has drawn a shirt the shape
 *  is locked, or the decided map would point at dead slots. The opening
 *  reading and the target follow the shape, because nothing has been decided
 *  yet; leaving them pinned to the 4-3-3 was the last live route to the Round
 *  435 bug (a squad with a hole in the 4-3-3 switching to a shape it fits
 *  banked up to 4 points, and the target did not move with it). */
export function setFormation(s: RunState, name: string): RunState {
  if (s.phase === 'done' || s.settledCount > 0 || s.spun !== null) return s;
  const formation = FORMATIONS.find(f => f.name === name);
  if (!formation || formation.name === s.formation.name) return s;
  const startRating = openingRating(formation, s.squad);
  return {
    ...s,
    formation,
    startRating,
    target: targetFor(startRating, s.club.tier),
    baseXi: buildXi(formation, s.squad).map(p => p ?? null),
    order: spinOrder(s.seed, formation.slots.length),
  };
}

/* ---------------- the spin ---------------- */

/** The names nobody can be dealt again: everyone holding or promised a shirt,
 *  everyone bought, sold or lost to a rival this window. */
function takenNames(s: RunState): Set<string> {
  const taken = new Set<string>();
  for (const p of s.baseXi) if (p) taken.add(p.name);
  for (const p of Object.values(s.decided)) if (p) taken.add(p.name);
  for (const p of s.signed) taken.add(p.name);
  for (const p of s.sold) taken.add(p.name);
  for (const n of Object.keys(s.lost)) taken.add(n);
  return taken;
}

function makeDeal(s: RunState, slotIdx: number, attempt: number): ReplacementDeal {
  const deal = dealReplacements(s.market, s.squad, s.formation.slots[slotIdx], takenNames(s), s.seed, slotIdx + attempt * 37);
  return { offers: deal.offers.filter(o => !(o.name in s.lost)), bench: deal.bench };
}

/** The wheel lands on the next shirt in the seeded order. An inherited hole
 *  (the squad never had a fit) skips keep or sell and goes straight to the
 *  scouts' list. */
export function spinNext(s: RunState): RunState {
  if (s.phase !== 'spin' || s.spun !== null || s.deal || s.war) return s;
  if (s.settledCount >= s.order.length) return s;
  const slot = s.order[s.settledCount];
  const next = { ...s, spun: slot, dealAttempt: 0 };
  if (!s.baseXi[slot]) next.deal = makeDeal(next, slot, 0);
  return next;
}

function resolveSlot(s: RunState, p: Player | null): RunState {
  if (s.spun === null) return s;
  const decided = { ...s.decided, [s.spun]: p };
  return { ...s, decided, settledCount: Object.keys(decided).length, deal: null, dealAttempt: 0, spun: null };
}

/** Every second transfer action, an envelope arrives. */
function bump(s: RunState): RunState {
  const actions = s.actions + 1;
  if (actions % 2 !== 0) return { ...s, actions };
  const ev = drawFinEvent(s.seed, actions / 2);
  const perks = { ...s.perks };
  if (ev.perk) perks[ev.perk] += 1;
  return { ...s, actions, extraFunds: s.extraFunds + ev.delta, perks, post: [...s.post, ev] };
}

export function keep(s: RunState): RunState {
  if (s.phase !== 'spin' || s.spun === null || s.deal || s.war) return s;
  const incumbent = s.baseXi[s.spun];
  if (!incumbent) return s;
  return resolveSlot(s, incumbent);
}

/** Selling is final: the man goes to `sold`, can never be kept, dealt or
 *  promoted again, and the scouts' list opens for his shirt. */
export function sell(s: RunState): RunState {
  if (s.phase !== 'spin' || s.spun === null || s.deal || s.war) return s;
  const incumbent = s.baseXi[s.spun];
  if (!incumbent || s.sold.some(x => x.name === incumbent.name)) return s;
  const withSale = { ...s, sold: [...s.sold, incumbent] };
  return bump({ ...withSale, deal: makeDeal(withSale, s.spun, 0) });
}

function completeSigning(s: RunState, p: Player, paid: number): RunState {
  if (s.signed.some(x => x.name === p.name)) return s;
  const withMan = {
    ...s,
    signed: [...s.signed, p],
    discounts: s.discounts + Math.max(0, p.marketValue - paid),
    overpaid: s.overpaid + Math.max(0, paid - p.marketValue),
  };
  return bump(resolveSlot(withMan, p));
}

/** Take one of the scouts' three. The wallet can dip to the overdraft; the
 *  reckoning force sells shirts at random to claw a negative balance back. A
 *  rival can hijack the deal and start a bidding war (seeded per run and
 *  player; stars attract wars, squad players mostly do not). */
export function takeOffer(s: RunState, name: string): RunState {
  if (s.phase !== 'spin' || s.spun === null || !s.deal || s.war) return s;
  const p = s.deal.offers.find(o => o.name === name);
  if (!p) return s;
  const price = offerPrice(s, p);
  if (price > spendCeilingOf(s)) return s;

  const perks = { ...s.perks };
  let contested = false;
  const rivalIdx = warRivalIndex(p, s.seed);
  const rival = s.rivalPlans[rivalIdx];
  if (perks.noWar > 0) {
    perks.noWar -= 1;
  } else if (rival && s.rivalPlans.length === 2 && playerRating(p) >= 72 && isContested(p, s.seed)) {
    contested = true;
  }
  if (contested) {
    const opening = nextRaise(p.marketValue);
    return {
      ...s,
      perks,
      war: {
        player: p,
        rivalIdx,
        price: opening,
        leader: 'rival',
        cap: rivalCapFor(p, s.seed),
        log: [`${rival.emoji} ${rival.name} hijacks the deal: €${opening}M for ${p.name}!`],
        outcome: 'live',
      },
    };
  }
  if (perks.discount > 0 && price < p.marketValue) perks.discount -= 1;
  return completeSigning({ ...s, perks }, p, price);
}

/** The fourth option: a squad player already at the club takes the shirt, free. */
export function promote(s: RunState, name: string): RunState {
  if (s.phase !== 'spin' || s.spun === null || !s.deal || s.war) return s;
  const p = s.deal.bench.find(b => b.name === name);
  if (!p) return s;
  return bump(resolveSlot(s, p));
}

/** The last resort that keeps the loop alive: give the shirt to a 40 overall.
 *  The rating says so immediately, so it is a real cost, never a cheat. */
export function takeForty(s: RunState): RunState {
  if (s.phase !== 'spin' || s.spun === null || !s.deal || s.war) return s;
  return resolveSlot(s, null);
}

/** A fresh scouts' list for the open shirt: free when the list is a dead end, otherwise it spends the perk. */
export function redeal(s: RunState): RunState {
  if (!canRedeal(s) || s.spun === null || !s.deal) return s;
  const ceiling = spendCeilingOf(s);
  const deadEnd = !s.deal.offers.some(p => offerPrice(s, p) <= ceiling) && s.deal.bench.length === 0;
  const perks = { ...s.perks };
  if (!deadEnd) perks.rescout -= 1;
  const attempt = s.dealAttempt + 1;
  return { ...s, perks, dealAttempt: attempt, deal: makeDeal(s, s.spun, attempt) };
}

/* ---------------- bidding wars ---------------- */

export function raise(s: RunState): RunState {
  const w = s.war;
  if (!w || w.outcome !== 'live' || w.leader !== 'rival') return s;
  const myBid = nextRaise(w.price);
  if (myBid > spendCeilingOf(s)) return s;
  return { ...s, war: { ...w, price: myBid, leader: 'you', log: [...w.log, `You bid €${myBid}M.`] } };
}

/** The rival's answer to your bid: a counter while it sits under his hidden
 *  ceiling, otherwise he is out and the man is yours at your price. */
export function rivalReply(s: RunState): RunState {
  const w = s.war;
  if (!w || w.outcome !== 'live' || w.leader !== 'you') return s;
  const rival = s.rivalPlans[w.rivalIdx];
  const counter = nextRaise(w.price);
  if (counter <= w.cap) {
    return { ...s, war: { ...w, price: counter, leader: 'rival', log: [...w.log, `${rival.emoji} ${rival.name} goes again: €${counter}M!`] } };
  }
  const premium = Math.max(0, w.price - w.player.marketValue);
  const won: WarState = {
    ...w,
    outcome: 'won',
    log: [...w.log, `${rival.emoji} ${rival.name} is out. ${w.player.name} signs for €${w.price}M${premium > 0 ? ` (€${premium}M over his value)` : ''}.`],
  };
  return completeSigning({ ...s, war: won }, w.player, w.price);
}

export function walk(s: RunState): RunState {
  const w = s.war;
  if (!w || w.outcome !== 'live' || w.leader !== 'rival') return s;
  const rival = s.rivalPlans[w.rivalIdx];
  const lost = { ...s.lost, [w.player.name]: w.rivalIdx };
  const deal = s.deal ? { ...s.deal, offers: s.deal.offers.filter(o => o.name !== w.player.name) } : null;
  return {
    ...s,
    lost,
    deal,
    war: { ...w, outcome: 'lost', log: [...w.log, `You walk away. ${w.player.name} joins ${rival.name} at ${rival.club.club}.`] },
  };
}

/** Dismiss a settled war so the loop can move on. */
export function clearWar(s: RunState): RunState {
  if (!s.war || s.war.outcome === 'live') return s;
  return { ...s, war: null };
}

/* ---------------- the whistle ---------------- */

export function canBlowWhistle(s: RunState): boolean {
  return s.phase === 'spin' && s.settledCount >= s.formation.slots.length && s.spun === null && !s.war;
}

export function blowWhistle(s: RunState): RunState {
  if (!canBlowWhistle(s)) return s;
  const notes: string[] = [];
  const xi: (Player | null)[] = s.formation.slots.map((_, i) => s.decided[i] ?? null);
  const windowFunds = budgetOf(s);
  let funds = windowFunds;
  let ratingPen = 0;

  // The overdraft reckoning (owner spec: end with negative money and
  // positions are force sold at random). Seeded, random order, each sale
  // swaps a shirt for the cheapest market fit until the debt clears.
  let swaps: ForcedSwap[] = [];
  let remainingDeficit = 0;
  if (funds < 0) {
    const forced = forceSales(xi, s.formation, s.market, -funds, s.seed);
    swaps = forced.swaps;
    remainingDeficit = forced.remainingDeficit;
    for (const sw of swaps) {
      const idx = xi.findIndex(p => p?.name === sw.outName);
      if (idx >= 0) xi[idx] = sw.inPlayer;
      funds += sw.recouped;
      notes.push(`\u{1F6A8} Forced sale: ${sw.outName} out, ${sw.inPlayer.name} in, €${sw.recouped}M back in the account`);
    }
    if (remainingDeficit > 0) {
      notes.push(`\u{1F6A8} €${remainingDeficit}M of debt is still there. The board is livid.`);
      ratingPen += 2;
    }
  }

  // The demands are judged on the window as the player closed it, not on the
  // books after the board's own clawback, or "finish with money in the bank"
  // would read as met the moment the forced sales cleared the debt.
  const missed = s.board.demands.filter(o => !o.check({ signed: s.signed, sold: s.sold, budget: windowFunds }));
  const cards = drawPunishments(s.seed, missed.length);
  const soldNames = new Set(s.sold.map(p => p.name));
  cards.forEach((card, k) => {
    const miss = missed[k];
    const head = `${card.emoji} ${card.title} (you missed: ${miss.text})`;
    if (card.kind === 'safe') { notes.push(`${head}: ${card.text}`); return; }
    if (card.kind === 'fine') { funds -= card.amount; notes.push(`${head}: ${card.text}`); return; }
    if (card.kind === 'ratingHit') { ratingPen += card.amount; notes.push(`${head}: ${card.text}`); return; }
    // sellBest and sellRandom take a shirt; the club's own depth steps in
    // if anyone fits, otherwise the shirt goes to a 40 overall.
    const holders = xi.map((p, i) => ({ p, i })).filter((x): x is { p: Player; i: number } => x.p !== null);
    if (holders.length === 0) { notes.push(`${head}: ${card.text}`); return; }
    let victim: { p: Player; i: number };
    if (card.kind === 'sellBest') {
      victim = [...holders].sort((a, b) => b.p.marketValue - a.p.marketValue)[0];
    } else {
      let r = ((s.seed ^ 0x726e64) + k * 7919) % 2147483647;
      if (r <= 0) r += 2147483646;
      r = (r * 16807) % 2147483647;
      victim = holders[Math.floor(((r - 1) / 2147483646) * holders.length)];
    }
    const used = new Set(xi.filter(Boolean).map(p => (p as Player).name));
    const stepUp = bestFor(
      s.formation.slots[victim.i],
      s.squad.filter(p => !soldNames.has(p.name) && !used.has(p.name)),
      new Set(),
    );
    xi[victim.i] = stepUp ?? null;
    notes.push(`${head}: ${card.text} (${victim.p.name} was sold${stepUp ? `, ${stepUp.name} steps in` : ', the shirt goes to a 40 overall'})`);
  });

  return {
    ...s,
    phase: 'done',
    reckoning: { notes, xi, windowFunds, funds, ratingPen, swaps, remainingDeficit, cards, missed },
  };
}
