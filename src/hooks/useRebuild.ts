import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Player } from '@/types/game';
import { FORMATIONS, playerRating, type Formation } from '@/lib/squadDeal';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  fetchRebuildClubs, fetchClubSquad, fetchMarket,
  type RebuildClub,
} from '@/lib/fetchRebuild';
import {
  hashSeed, coachOptionsFor, KEEP_COACH, drawFinEvent,
  dealObjectivesWithIdentity, budgetFor, fortuneDeckFor,
  planRivals, simulateRival, simulateSeason,
  isContested, warRivalIndex, rivalCapFor, nextRaise,
  spinOrder, dealReplacements, drawPunishments, applyPreset, forceSales,
  bestFor, buildXi, xiRatingWithHoles,
  OVERDRAFT_LIMIT,
  type CoachOption, type BoardObjective, type FinEvent, type RivalResult,
  type RivalPlan, type SeasonResult, type FortuneCard, type ReplacementDeal,
  type RebuildPreset,
} from '@/lib/rebuildDeck';

export interface WarView {
  player: Player;
  rival: RivalPlan;
  rivalIdx: number;
  price: number;
  leader: 'you' | 'rival';
  cap: number;
  log: string[];
  thinking: boolean;
  outcome: 'live' | 'won' | 'lost';
}

/** Round 333: the cuts list and the open market browser are gone. The window
 *  is one loop now: spin for a position, keep or sell the man you drew,
 *  selling deals three priced replacements plus the free bench. */
export type Phase = 'pick-club' | 'pick-coach' | 'fortune' | 'spin' | 'done';

export interface ObjectiveView {
  objective: BoardObjective;
  met: boolean;
}

export interface RebuildState {
  phase: Phase;
  loading: boolean;
  clubs: RebuildClub[];
  club: RebuildClub | null;
  squad: Player[];
  market: Player[];
  formation: Formation;
  setFormation: (name: string) => void;
  /** The XI as it stands: resolved slots show the decision, unspun slots the incumbent, an open sale shows empty. */
  startingXi: (Player | null)[];
  startRating: number;
  currentRating: number;
  target: number;
  budget: number;
  sold: Player[];
  signed: Player[];
  chooseClub: (c: RebuildClub) => void;
  sign: (p: Player) => void;
  finish: () => void;
  reset: () => void;
  grade: string;
  shareText: string;
  /** Tier-scaled starting money before sales and swings (Round 51). */
  baseBudget: number;
  // Fortune card flip (Round 51: pick one of ten)
  fortuneDeck: FortuneCard[];
  flippedFortune: FortuneCard | null;
  flippedIndex: number | null;
  flipFortune: (i: number) => void;
  confirmFortune: () => void;
  // Round 333: the spin loop
  preset: RebuildPreset;
  setPreset: (p: RebuildPreset) => void;
  spunSlot: number | null;
  spinning: boolean;
  spinsDone: number;
  spinsTotal: number;
  spin: () => void;
  keepSpun: () => void;
  sellSpun: () => void;
  deal: ReplacementDeal | null;
  takeReplacement: (p: Player) => void;
  promoteBench: (p: Player) => void;
  /** The last resort that keeps the loop alive: play the shirt empty (rated 40). */
  leaveEmpty: () => void;
  redealSpun: () => void;
  /** Settled shirts: a Player, or null for a shirt deliberately left empty. */
  decided: Map<number, Player | null>;
  /** Money after the final reckoning (forced sales, fines); equals budget until then. */
  finalFunds: number;
  // Rebuild expansion (owner 2026-08-05)
  coachOptions: CoachOption[];
  keepCoach: CoachOption;
  coach: CoachOption | null;
  pickCoach: (c: CoachOption) => void;
  objectives: ObjectiveView[];
  finLog: FinEvent[];
  penalties: string[];
  rivals: RivalResult[] | null;
  rivalsLoading: boolean;
  // Live bidding wars + season sim (owner 2026-08-05)
  war: WarView | null;
  raiseWar: () => void;
  walkAway: () => void;
  lostToRivals: string[];
  overpaid: number;
  season: SeasonResult | null;
}

const BASE_BUDGET = 100; // €100M before any sales

/**
 * The rating the HUD will show the second a club loads, before the player has
 * touched anything. It has to be the HUD's own law (xiRatingWithHoles), or the
 * run opens on a delta nobody earned.
 *
 * Round 435: it was not. This averaged only the shirts somebody was in, the
 * HUD charged 40 for the empty ones, and the 15 of 66 clubs whose real squad
 * cannot fill a 4-3-3 opened at minus 3 or minus 4 with the grade reading
 * "You made it worse". The target was computed off the same inflated number,
 * so those clubs were also asked for a rating 3 or 4 points too high.
 */
export function openingRating(formation: Formation, squad: Player[]): number {
  return xiRatingWithHoles(buildXi(formation, squad));
}

/**
 * Target is deliberately tier-aware. Elite squads are already near the rating
 * ceiling, so asking Real Madrid for +5 would be impossible while asking Genk
 * for +5 is trivial. Weak squads have far more headroom, bigger ask.
 */
function targetFor(startRating: number, tier: RebuildClub['tier']): number {
  const bump = tier === 'elite' ? 2 : tier === 'strong' ? 3 : tier === 'mid' ? 5 : 7;
  return Math.min(95, startRating + bump);
}

function gradeFor(current: number, start: number, target: number): string {
  if (current >= target + 3) return 'Legendary rebuild';
  if (current >= target) return 'Job done';
  if (current > start) return 'Some progress';
  if (current === start) return 'You changed nothing';
  return 'You made it worse';
}

interface Reckoning {
  notes: string[];
  xi: (Player | null)[];
  funds: number;
  ratingPen: number;
}

export function useRebuild(): RebuildState {
  const [phase, setPhase] = useState<Phase>('pick-club');
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<RebuildClub[]>([]);
  const [club, setClub] = useState<RebuildClub | null>(null);
  const [squad, setSquad] = useState<Player[]>([]);
  const [market, setMarket] = useState<Player[]>([]);
  const [formationName, setFormationName] = useState(FORMATIONS[0].name);
  const [sold, setSold] = useState<Player[]>([]);
  const [signed, setSigned] = useState<Player[]>([]);
  const [startRating, setStartRating] = useState(0);

  // Rebuild expansion state (owner 2026-08-05)
  const [seed, setSeed] = useState(0);
  const [coachOptions, setCoachOptions] = useState<CoachOption[]>([]);
  const [coach, setCoach] = useState<CoachOption | null>(null);
  const [objectiveDeck, setObjectiveDeck] = useState<BoardObjective[]>([]);
  const [finLog, setFinLog] = useState<FinEvent[]>([]);
  const [extraFunds, setExtraFunds] = useState(0);
  const [transferActions, setTransferActions] = useState(0);
  const [rivals, setRivals] = useState<RivalResult[] | null>(null);
  const [rivalsLoading, setRivalsLoading] = useState(false);

  // Round 51: fortune card
  const [fortuneDeck, setFortuneDeck] = useState<FortuneCard[]>([]);
  const [flippedFortune, setFlippedFortune] = useState<FortuneCard | null>(null);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  // Round 333: the spin loop
  const [preset, setPresetState] = useState<RebuildPreset>('none');
  const [order, setOrder] = useState<number[]>([]);
  const [spunSlot, setSpunSlot] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [deal, setDeal] = useState<ReplacementDeal | null>(null);
  const [dealAttempt, setDealAttempt] = useState(0);
  const [decided, setDecided] = useState<Map<number, Player | null>>(new Map());
  const [reckoning, setReckoning] = useState<Reckoning | null>(null);
  const spunSlotRef = useRef<number | null>(null);
  const spinTimer = useRef<number | null>(null);

  // Live bidding wars + season sim (owner 2026-08-05)
  const [rivalPlans, setRivalPlans] = useState<RivalPlan[]>([]);
  const [war, setWar] = useState<WarView | null>(null);
  const [lostMap, setLostMap] = useState<Map<string, number>>(new Map());
  const [overpaid, setOverpaid] = useState(0);
  const [season, setSeason] = useState<SeasonResult | null>(null);
  const warTimer = useRef<number | null>(null);
  const warRef = useRef<WarView | null>(null);
  useEffect(() => { warRef.current = war; }, [war]);

  useEffect(() => () => {
    if (warTimer.current) window.clearTimeout(warTimer.current);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRebuildClubs().then(c => {
      if (cancelled) return;
      setClubs(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const formation = useMemo(
    () => FORMATIONS.find(f => f.name === formationName) ?? FORMATIONS[0],
    [formationName],
  );

  const soldNames = useMemo(() => new Set(sold.map(p => p.name)), [sold]);

  /** Current squad = original minus sold, plus signed. */
  const activeSquad = useMemo(
    () => [...squad.filter(p => !soldNames.has(p.name)), ...signed],
    [squad, soldNames, signed],
  );

  /** The inherited XI the wheel resolves. Stable through the whole spin:
   *  built from the ORIGINAL squad, so selling a man never reshuffles the
   *  ten shirts still waiting for their spin. */
  const baseXi = useMemo(
    () => buildXi(formation, squad).map(p => p ?? null),
    [formation, squad],
  );

  /** The XI on screen: decisions override (a decided empty shirt stays
   *  empty), an open sale is an empty shirt too. */
  const startingXi = useMemo(
    () => formation.slots.map((_, i) => {
      if (decided.has(i)) return decided.get(i) ?? null;
      const inc = baseXi[i];
      return inc && !soldNames.has(inc.name) ? inc : null;
    }),
    [formation, decided, baseXi, soldNames],
  );

  const coachBonus = coach?.bonus ?? 0;
  const currentRating = useMemo(() => {
    if (reckoning) {
      return Math.max(1, Math.min(99, xiRatingWithHoles(reckoning.xi) + coachBonus - reckoning.ratingPen));
    }
    // Same law as the reckoning: an empty shirt plays like a 40, so leaving
    // one open shows its true cost live instead of at the whistle.
    return startingXi.some(Boolean) ? Math.max(1, Math.min(99, xiRatingWithHoles(startingXi) + coachBonus)) : 0;
  }, [reckoning, startingXi, coachBonus]);

  // Round 51: the war chest scales with club size.
  const baseBudget = useMemo(() => (club ? budgetFor(club.tier) : BASE_BUDGET), [club]);

  const budget = useMemo(
    () => baseBudget
      + extraFunds
      - (coach?.cost ?? 0)
      - overpaid
      + sold.reduce((s, p) => s + p.marketValue, 0)
      - signed.reduce((s, p) => s + p.marketValue, 0),
    [baseBudget, sold, signed, extraFunds, coach, overpaid],
  );

  const finalFunds = reckoning ? reckoning.funds : budget;

  const target = useMemo(
    () => (club ? targetFor(startRating, club.tier) : 0),
    [club, startRating],
  );

  const objectives: ObjectiveView[] = useMemo(
    () => objectiveDeck.map(o => ({
      objective: o,
      met: o.check({ signed, sold, budget: finalFunds }),
    })),
    [objectiveDeck, signed, sold, finalFunds],
  );

  useGameCompletion('rebuild', phase === 'done', Math.max(0, currentRating * 10), currentRating >= target ? 1 : 0);

  const setPreset = useCallback((p: RebuildPreset) => {
    // The restriction is a promise made before the window opens, never changed mid run.
    setPresetState(prev => (club ? prev : p));
  }, [club]);

  const chooseClub = useCallback(async (c: RebuildClub) => {
    setClub(c);
    setLoading(true);
    const s = hashSeed(c.club);
    setSeed(s);
    const [sq, mk] = await Promise.all([fetchClubSquad(c.club), fetchMarket(c.club)]);
    setSquad(sq);
    setMarket(applyPreset(mk, preset));
    setStartRating(openingRating(FORMATIONS[0], sq));
    setFormationName(FORMATIONS[0].name);
    setSold([]);
    setSigned([]);
    setCoach(null);
    setCoachOptions(coachOptionsFor(c.tier, s));
    setObjectiveDeck(dealObjectivesWithIdentity(s, c));
    setFortuneDeck(fortuneDeckFor(s));
    setFlippedFortune(null);
    setFlippedIndex(null);
    setOrder(spinOrder(s, FORMATIONS[0].slots.length));
    setSpunSlot(null);
    spunSlotRef.current = null;
    setSpinning(false);
    setDeal(null);
    setDealAttempt(0);
    setDecided(new Map());
    setReckoning(null);
    setFinLog([]);
    setExtraFunds(0);
    setTransferActions(0);
    setRivals(null);
    setRivalPlans(planRivals(c, clubs, s));
    setWar(null);
    setLostMap(new Map());
    setOverpaid(0);
    setSeason(null);
    setLoading(false);
    setPhase('pick-coach');
  }, [clubs, preset]);

  const pickCoach = useCallback((c: CoachOption) => {
    setCoach(c);
    setPhase('fortune');
  }, []);

  /** Round 51: flip exactly one of the ten fortune cards. */
  const flipFortune = useCallback((i: number) => {
    if (flippedFortune) return;
    const card = fortuneDeck[i];
    if (!card) return;
    setFlippedFortune(card);
    setFlippedIndex(i);
    setExtraFunds(f => f + card.delta);
    setFinLog(log => [...log, { emoji: card.emoji, text: card.title, delta: card.delta }]);
  }, [flippedFortune, fortuneDeck]);

  const confirmFortune = useCallback(() => {
    if (!flippedFortune) return;
    setPhase('spin');
  }, [flippedFortune]);

  /** Every second transfer action, the finance department calls. */
  const bumpFinances = useCallback(() => {
    setTransferActions(prev => {
      const next = prev + 1;
      if (next % 2 === 0) {
        const ev = drawFinEvent(seed, next / 2);
        setFinLog(log => [...log, ev]);
        setExtraFunds(f => f + ev.delta);
      }
      return next;
    });
  }, [seed]);

  /** The names nobody can be dealt again: everyone holding or promised a shirt,
   *  everyone bought, sold or lost to a rival this window. */
  const takenNames = useCallback(() => {
    const taken = new Set<string>();
    for (const p of baseXi) if (p) taken.add(p.name);
    decided.forEach(p => { if (p) taken.add(p.name); });
    for (const p of signed) taken.add(p.name);
    for (const p of sold) taken.add(p.name);
    lostMap.forEach((_, n) => taken.add(n));
    return taken;
  }, [baseXi, decided, signed, sold, lostMap]);

  const makeDeal = useCallback((slotIdx: number, attempt: number) => {
    const slot = formation.slots[slotIdx];
    return dealReplacements(market, squad, slot, takenNames(), seed, slotIdx + attempt * 37);
  }, [formation, market, squad, takenNames, seed]);

  const resolveSlot = useCallback((slotIdx: number, p: Player | null) => {
    setDecided(prev => new Map(prev).set(slotIdx, p));
    setDeal(null);
    setDealAttempt(0);
    setSpunSlot(null);
    spunSlotRef.current = null;
  }, []);

  const spin = useCallback(() => {
    if (phase !== 'spin' || spinning || spunSlot !== null || war || deal) return;
    const idx = decided.size;
    if (idx >= order.length) return;
    setSpinning(true);
    spinTimer.current = window.setTimeout(() => {
      const slot = order[idx];
      setSpinning(false);
      setSpunSlot(slot);
      spunSlotRef.current = slot;
      // An inherited hole (the squad never had a fit) skips keep-or-sell and
      // goes straight to the scouts' list.
      const incumbent = baseXi[slot];
      if (!incumbent) setDeal(makeDeal(slot, 0));
    }, 1200);
  }, [phase, spinning, spunSlot, war, deal, decided, order, baseXi, makeDeal]);

  const keepSpun = useCallback(() => {
    if (spunSlot === null || deal || spinning) return;
    const incumbent = baseXi[spunSlot];
    if (!incumbent) return;
    resolveSlot(spunSlot, incumbent);
  }, [spunSlot, deal, spinning, baseXi, resolveSlot]);

  const sellSpun = useCallback(() => {
    if (spunSlot === null || deal || spinning) return;
    const incumbent = baseXi[spunSlot];
    if (!incumbent) return;
    // A sale can never dead-end the run: even with no affordable offer and
    // no bench fit, leaveEmpty below resolves the shirt (at a price).
    setSold(prev => (prev.some(x => x.name === incumbent.name) ? prev : [...prev, incumbent]));
    setDeal(makeDeal(spunSlot, 0));
    bumpFinances();
  }, [spunSlot, deal, spinning, baseXi, makeDeal, bumpFinances]);

  /** A fresh scouts' list for the open slot, for when wars ate every offer. */
  const redealSpun = useCallback(() => {
    if (spunSlot === null || !deal) return;
    const attempt = dealAttempt + 1;
    setDealAttempt(attempt);
    setDeal(makeDeal(spunSlot, attempt));
  }, [spunSlot, deal, dealAttempt, makeDeal]);

  const completeSigning = useCallback((p: Player, premium: number) => {
    setSigned(prev => {
      if (prev.some(x => x.name === p.name)) return prev;
      bumpFinances();
      return [...prev, p];
    });
    if (premium > 0) setOverpaid(o => o + premium);
    const slot = spunSlotRef.current;
    if (slot !== null) resolveSlot(slot, p);
  }, [bumpFinances, resolveSlot]);

  const sign = useCallback((p: Player) => {
    // Round 333: the wallet can dip to the overdraft mid window; the reckoning
    // force-sells shirts at random to claw a negative balance back.
    if (p.marketValue > budget + OVERDRAFT_LIMIT || war) return;
    // A rival can hijack the deal and start a live bidding war (seeded per
    // run + player; stars attract wars, squad players mostly do not).
    const rivalIdx = warRivalIndex(p, seed);
    const rival = rivalPlans[rivalIdx];
    // The rival lookup can never be allowed to eat a signing: if it ever
    // comes back empty again (the Round 251 signed-XOR bug did exactly
    // that), the deal simply completes uncontested. Fail safe, not shut.
    if (rival && rivalPlans.length === 2 && playerRating(p) >= 72 && isContested(p, seed)) {
      const opening = nextRaise(p.marketValue);
      setWar({
        player: p,
        rival,
        rivalIdx,
        price: opening,
        leader: 'rival',
        cap: rivalCapFor(p, seed),
        log: [`${rival.emoji} ${rival.name} hijacks the deal: €${opening}M for ${p.name}!`],
        thinking: false,
        outcome: 'live',
      });
      return;
    }
    completeSigning(p, 0);
  }, [budget, war, rivalPlans, seed, completeSigning]);

  const takeReplacement = useCallback((p: Player) => {
    if (spunSlot === null || !deal || war) return;
    spunSlotRef.current = spunSlot;
    sign(p);
  }, [spunSlot, deal, war, sign]);

  /** The fourth option: a squad player already at the club takes the shirt, free. */
  const promoteBench = useCallback((p: Player) => {
    if (spunSlot === null || !deal || war) return;
    resolveSlot(spunSlot, p);
    bumpFinances();
  }, [spunSlot, deal, war, resolveSlot, bumpFinances]);

  /** The escape hatch the first playthrough proved necessary: with the wallet
   *  deep in the overdraft, every offer unaffordable and no bench fit, the
   *  run must still move. An empty shirt plays like a 40 and the rating says
   *  so immediately, so it is a real cost, never a cheat. */
  const leaveEmpty = useCallback(() => {
    if (spunSlot === null || !deal || war) return;
    resolveSlot(spunSlot, null);
  }, [spunSlot, deal, war, resolveSlot]);

  const raiseWar = useCallback(() => {
    if (!war || war.outcome !== 'live' || war.thinking || war.leader !== 'rival') return;
    const myBid = nextRaise(war.price);
    if (myBid > budget + OVERDRAFT_LIMIT) return;
    setWar(w => w && ({ ...w, price: myBid, leader: 'you', thinking: true, log: [...w.log, `🫵 You bid €${myBid}M.`] }));
    warTimer.current = window.setTimeout(() => {
      const w = warRef.current;
      if (!w || w.outcome !== 'live') return;
      const counter = nextRaise(w.price);
      if (counter <= w.cap) {
        setWar({ ...w, price: counter, leader: 'rival', thinking: false, log: [...w.log, `${w.rival.emoji} ${w.rival.name} fires back: €${counter}M!`] });
        return;
      }
      // Rival is out. The player is yours at your bid.
      const premium = Math.max(0, w.price - w.player.marketValue);
      completeSigning(w.player, premium);
      setWar({
        ...w,
        outcome: 'won',
        thinking: false,
        log: [...w.log, `${w.rival.emoji} ${w.rival.name} is OUT. ${w.player.name} signs for €${w.price}M${premium > 0 ? ` (€${premium}M over value)` : ''}!`],
      });
      warTimer.current = window.setTimeout(() => setWar(null), 1600);
    }, 700 + Math.floor(Math.random() * 500));
  }, [war, budget, completeSigning]);

  const walkAway = useCallback(() => {
    if (!war || war.outcome !== 'live' || war.thinking || war.leader !== 'rival') return;
    setLostMap(prev => new Map(prev).set(war.player.name, war.rivalIdx));
    setWar(w => w && ({
      ...w,
      outcome: 'lost',
      log: [...w.log, `You walk away. ${w.player.name} joins ${w.rival.name}'s ${w.rival.club.club}.`],
    }));
    warTimer.current = window.setTimeout(() => setWar(null), 1500);
  }, [war]);

  /** A lost war removes that offer from the open deal on screen. */
  const dealView = useMemo(() => {
    if (!deal) return null;
    return {
      offers: deal.offers.filter(o => !lostMap.has(o.name)),
      bench: deal.bench,
    };
  }, [deal, lostMap]);

  const finish = useCallback(async () => {
    if (war) return; // settle the bidding war first
    if (decided.size < formation.slots.length || spunSlot !== null || spinning) return;

    const notes: string[] = [];
    const xi: (Player | null)[] = formation.slots.map((_, i) => decided.get(i) ?? null);
    let funds = budget;
    let ratingPen = 0;

    // The overdraft reckoning (owner spec: end with negative money and
    // positions are force sold at random). Seeded, random order, each sale
    // swaps a shirt for the cheapest market fit until the debt clears.
    if (funds < 0) {
      const { swaps, remainingDeficit } = forceSales(xi, formation, market, -funds, seed);
      for (const sw of swaps) {
        const idx = xi.findIndex(p => p?.name === sw.outName);
        if (idx >= 0) xi[idx] = sw.inPlayer;
        funds += sw.recouped;
        notes.push(`🚨 Forced sale: ${sw.outName} out, ${sw.inPlayer.name} in, €${sw.recouped}M clawed back`);
      }
      if (remainingDeficit > 0) {
        notes.push(`🚨 €${remainingDeficit}M of debt could not be cleared. The board is livid.`);
        ratingPen += 2;
      }
    }

    // Board reckoning: every missed demand draws a punishment card from the
    // five card deck, without replacement, exactly one merciful.
    const unmet = objectiveDeck.filter(o => !o.check({ signed, sold, budget: funds }));
    const cards = drawPunishments(seed, unmet.length);
    cards.forEach((card, k) => {
      const missed = unmet[k];
      const head = `${card.emoji} ${card.title} (missed: ${missed.text})`;
      if (card.kind === 'safe') { notes.push(`${head}: ${card.text}`); return; }
      if (card.kind === 'fine') { funds -= card.amount; notes.push(`${head}: ${card.text}`); return; }
      if (card.kind === 'ratingHit') { ratingPen += card.amount; notes.push(`${head}: ${card.text}`); return; }
      // sellBest and sellRandom take a shirt; the club's own depth steps in
      // if anyone fits, otherwise the shirt stays empty and drags the rating.
      const holders = xi.map((p, i) => ({ p, i })).filter((x): x is { p: Player; i: number } => x.p !== null);
      if (holders.length === 0) { notes.push(`${head}: ${card.text}`); return; }
      let victim: { p: Player; i: number };
      if (card.kind === 'sellBest') {
        victim = [...holders].sort((a, b) => b.p.marketValue - a.p.marketValue)[0];
      } else {
        let s = ((seed ^ 0x726e64) + k * 7919) % 2147483647;
        if (s <= 0) s += 2147483646;
        s = (s * 16807) % 2147483647;
        victim = holders[Math.floor(((s - 1) / 2147483646) * holders.length)];
      }
      const used = new Set(xi.filter(Boolean).map(p => (p as Player).name));
      const stepUp = bestFor(
        formation.slots[victim.i],
        squad.filter(p => !soldNames.has(p.name) && !used.has(p.name)),
        new Set(),
      );
      xi[victim.i] = stepUp ?? null;
      notes.push(`${head}: ${card.text} (${victim.p.name} was sold${stepUp ? `, ${stepUp.name} steps in` : ', the shirt stays empty'})`);
    });

    setReckoning({ notes, xi, funds, ratingPen });
    setPhase('done');

    // Rivals post their windows after yours closes, then the season kicks off.
    if (club) {
      setRivalsLoading(true);
      try {
        const plans = rivalPlans.length === 2 ? rivalPlans : planRivals(club, clubs, seed);
        const humanSigned = new Set(signed.map(p => p.name));
        const results: RivalResult[] = [];
        for (let i = 0; i < plans.length; i++) {
          const plan = plans[i];
          const rivalSquad = await fetchClubSquad(plan.club.club);
          const wonInWars = [...lostMap.entries()].filter(([, idx]) => idx === i).map(([n]) => n);
          results.push(simulateRival(plan, rivalSquad, market, humanSigned, seed, wonInWars));
        }
        setRivals(results);

        // Season sim uses your POST-reckoning XI, coach bonus included.
        const postXiPlayers = xi.filter(Boolean) as Player[];
        const postRating = postXiPlayers.length
          ? Math.max(1, Math.min(99, xiRatingWithHoles(xi) + (coach?.bonus ?? 0) - ratingPen))
          : 0;
        const usedClubs = new Set([club.club, ...plans.map(p => p.club.club)]);
        const fillerPool = clubs.filter(c => !usedClubs.has(c.club) && c.tier === club.tier);
        const anyPool = fillerPool.length >= 3 ? fillerPool : clubs.filter(c => !usedClubs.has(c.club));
        const off = anyPool.length ? seed % anyPool.length : 0;
        const fillers = anyPool.length ? [...anyPool.slice(off), ...anyPool.slice(0, off)].slice(0, 3) : [];
        setSeason(simulateSeason({ clubName: club.club, rating: postRating, xi: postXiPlayers }, results, fillers, seed));
      } catch {
        setRivals(null);
        setSeason(null);
      } finally {
        setRivalsLoading(false);
      }
    }
  }, [war, decided, formation, spunSlot, spinning, budget, market, seed, objectiveDeck, signed, sold, squad, soldNames, club, clubs, rivalPlans, lostMap, coach]);

  const reset = useCallback(() => {
    setPhase('pick-club');
    setClub(null);
    setSquad([]);
    setMarket([]);
    setSold([]);
    setSigned([]);
    setStartRating(0);
    setCoach(null);
    setCoachOptions([]);
    setObjectiveDeck([]);
    setFortuneDeck([]);
    setFlippedFortune(null);
    setFlippedIndex(null);
    setOrder([]);
    setSpunSlot(null);
    spunSlotRef.current = null;
    setSpinning(false);
    setDeal(null);
    setDealAttempt(0);
    setDecided(new Map());
    setReckoning(null);
    setFinLog([]);
    setExtraFunds(0);
    setTransferActions(0);
    setRivals(null);
    setRivalPlans([]);
    setWar(null);
    setLostMap(new Map());
    setOverpaid(0);
    setSeason(null);
    if (warTimer.current) window.clearTimeout(warTimer.current);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
  }, []);

  /** Formation is a pre spin choice: once the wheel has drawn or resolved a
   *  shirt the shape is locked, or the decided map would point at dead slots.
   *
   *  The opening reading follows the shape, because nothing has been decided
   *  yet. Leaving it pinned to the 4-3-3 was the last live route to the Round
   *  435 bug: a squad with a hole in the 4-3-3 could switch to a shape it
   *  actually fits and bank up to 4 points, and the target, which is built off
   *  the opening reading, would not move with it. */
  const setFormation = useCallback((name: string) => {
    if (decided.size > 0 || spunSlot !== null || spinning) return;
    setFormationName(name);
    setStartRating(openingRating(FORMATIONS.find(f => f.name === name) ?? FORMATIONS[0], squad));
  }, [decided, spunSlot, spinning, squad]);

  const grade = useMemo(
    () => gradeFor(currentRating, startRating, target),
    [currentRating, startRating, target],
  );

  const shareText = useMemo(() => {
    if (phase !== 'done' || !club) return '';
    const rivalLine = rivals && rivals.length === 2
      ? `\nvs ${rivals[0].name} ${rivals[0].finalRating} · ${rivals[1].name} ${rivals[1].finalRating}`
      : '';
    const seasonLine = season ? `\nSeason: #${season.position} of ${season.table.length}` : '';
    return `Rebuild: ${club.club}\n${startRating} → ${currentRating} (target ${target})\nCoach: ${coach?.name ?? 'Caretaker'}\n${grade}${rivalLine}${seasonLine}\nSold ${sold.length} · Signed ${signed.length} · €${finalFunds}M left\ndouknowball.com/rebuild`;
  }, [phase, club, startRating, currentRating, target, grade, sold, signed, finalFunds, coach, rivals, season]);

  return {
    phase, loading, clubs, club, squad: activeSquad, market, formation, setFormation,
    startingXi, startRating, currentRating, target, budget, sold, signed,
    chooseClub, sign, finish, reset, grade, shareText,
    baseBudget,
    fortuneDeck, flippedFortune, flippedIndex, flipFortune, confirmFortune,
    preset, setPreset,
    spunSlot, spinning, spinsDone: decided.size, spinsTotal: formation.slots.length,
    spin, keepSpun, sellSpun,
    deal: dealView, takeReplacement, promoteBench, leaveEmpty, redealSpun,
    decided, finalFunds,
    coachOptions, keepCoach: KEEP_COACH, coach, pickCoach,
    objectives, finLog, penalties: reckoning?.notes ?? [], rivals, rivalsLoading,
    war, raiseWar, walkAway,
    lostToRivals: [...lostMap.keys()], overpaid, season,
  };
}
