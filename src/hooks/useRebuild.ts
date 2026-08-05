import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Player } from '@/types/game';
import { FORMATIONS, playerRating, type Formation, type FormationSlot } from '@/lib/squadDeal';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  fetchRebuildClubs, fetchClubSquad, fetchMarket,
  type RebuildClub,
} from '@/lib/fetchRebuild';
import {
  hashSeed, coachOptionsFor, KEEP_COACH, dealObjectives, drawFinEvent,
  planRivals, simulateRival, simulateSeason,
  isContested, warRivalIndex, rivalCapFor, nextRaise,
  type CoachOption, type BoardObjective, type FinEvent, type RivalResult,
  type RivalPlan, type SeasonResult,
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

export type Phase = 'pick-club' | 'pick-coach' | 'rebuilding' | 'done';

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
  startingXi: (Player | undefined)[];
  startRating: number;
  currentRating: number;
  target: number;
  budget: number;
  sold: Player[];
  signed: Player[];
  activeSlot: number | null;
  setActiveSlot: (i: number | null) => void;
  candidates: Player[];
  search: string;
  setSearch: (s: string) => void;
  chooseClub: (c: RebuildClub) => void;
  sell: (p: Player) => void;
  sign: (p: Player) => void;
  finish: () => void;
  reset: () => void;
  grade: string;
  shareText: string;
  // Box2box expansion (owner 2026-08-05)
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

/** Best available player for a slot, by rating. Never Math.random(). */
function bestFor(slot: FormationSlot, pool: Player[], used: Set<string>): Player | undefined {
  return pool
    .filter(p => slot.allowed.includes(p.position) && !used.has(p.name))
    .sort((a, b) => playerRating(b) - playerRating(a))[0];
}

function buildXi(formation: Formation, pool: Player[]): (Player | undefined)[] {
  const used = new Set<string>();
  return formation.slots.map(slot => {
    const p = bestFor(slot, pool, used);
    if (p) used.add(p.name);
    return p;
  });
}

function xiRating(xi: (Player | undefined)[]): number {
  const picked = xi.filter(Boolean) as Player[];
  if (picked.length === 0) return 0;
  return Math.round(picked.reduce((s, p) => s + playerRating(p), 0) / picked.length);
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
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Box2box expansion state (owner 2026-08-05)
  const [seed, setSeed] = useState(0);
  const [coachOptions, setCoachOptions] = useState<CoachOption[]>([]);
  const [coach, setCoach] = useState<CoachOption | null>(null);
  const [objectiveDeck, setObjectiveDeck] = useState<BoardObjective[]>([]);
  const [finLog, setFinLog] = useState<FinEvent[]>([]);
  const [extraFunds, setExtraFunds] = useState(0);
  const [transferActions, setTransferActions] = useState(0);
  const [penalties, setPenalties] = useState<string[]>([]);
  const [forcedOut, setForcedOut] = useState<Set<string>>(new Set());
  const [rivals, setRivals] = useState<RivalResult[] | null>(null);
  const [rivalsLoading, setRivalsLoading] = useState(false);

  // Live bidding wars + season sim (owner 2026-08-05)
  const [rivalPlans, setRivalPlans] = useState<RivalPlan[]>([]);
  const [war, setWar] = useState<WarView | null>(null);
  const [lostMap, setLostMap] = useState<Map<string, number>>(new Map());
  const [overpaid, setOverpaid] = useState(0);
  const [season, setSeason] = useState<SeasonResult | null>(null);
  const warTimer = useRef<number | null>(null);
  const warRef = useRef<WarView | null>(null);
  useEffect(() => { warRef.current = war; }, [war]);

  useEffect(() => () => { if (warTimer.current) window.clearTimeout(warTimer.current); }, []);

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

  /** Current squad = original minus sold, plus signed, minus board force-sales. */
  const activeSquad = useMemo(
    () => [...squad.filter(p => !soldNames.has(p.name)), ...signed].filter(p => !forcedOut.has(p.name)),
    [squad, soldNames, signed, forcedOut],
  );

  const startingXi = useMemo(() => buildXi(formation, activeSquad), [formation, activeSquad]);
  const coachBonus = coach?.bonus ?? 0;
  const currentRating = useMemo(
    () => (startingXi.some(Boolean) ? Math.min(99, xiRating(startingXi) + coachBonus) : 0),
    [startingXi, coachBonus],
  );

  const budget = useMemo(
    () => BASE_BUDGET
      + extraFunds
      - (coach?.cost ?? 0)
      - overpaid
      + sold.reduce((s, p) => s + p.marketValue, 0)
      - signed.reduce((s, p) => s + p.marketValue, 0),
    [sold, signed, extraFunds, coach, overpaid],
  );

  const target = useMemo(
    () => (club ? targetFor(startRating, club.tier) : 0),
    [club, startRating],
  );

  const signedNames = useMemo(() => new Set(signed.map(p => p.name)), [signed]);

  const candidates = useMemo(() => {
    if (activeSlot === null) return [];
    const slot = formation.slots[activeSlot];
    if (!slot) return [];
    const q = search.trim().toLowerCase();
    return market
      .filter(p => slot.allowed.includes(p.position))
      .filter(p => !signedNames.has(p.name))
      .filter(p => !lostMap.has(p.name))
      .filter(p => p.marketValue <= budget)
      .filter(p => (q ? p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q) : true))
      .sort((a, b) => playerRating(b) - playerRating(a))
      .slice(0, 50);
  }, [activeSlot, formation, market, signedNames, budget, search, lostMap]);

  const objectives: ObjectiveView[] = useMemo(
    () => objectiveDeck.map(o => ({
      objective: o,
      met: o.check({ signed, sold, budget }),
    })),
    [objectiveDeck, signed, sold, budget],
  );

  useGameCompletion('rebuild', phase === 'done', Math.max(0, currentRating * 10), currentRating >= target ? 1 : 0);

  const chooseClub = useCallback(async (c: RebuildClub) => {
    setClub(c);
    setLoading(true);
    const s = hashSeed(c.club);
    setSeed(s);
    const [sq, mk] = await Promise.all([fetchClubSquad(c.club), fetchMarket(c.club)]);
    setSquad(sq);
    setMarket(mk);
    setStartRating(xiRating(buildXi(FORMATIONS[0], sq)));
    setFormationName(FORMATIONS[0].name);
    setSold([]);
    setSigned([]);
    setCoach(null);
    setCoachOptions(coachOptionsFor(c.tier, s));
    setObjectiveDeck(dealObjectives(s));
    setFinLog([]);
    setExtraFunds(0);
    setTransferActions(0);
    setPenalties([]);
    setForcedOut(new Set());
    setRivals(null);
    setRivalPlans(planRivals(c, clubs, s));
    setWar(null);
    setLostMap(new Map());
    setOverpaid(0);
    setSeason(null);
    setLoading(false);
    setPhase('pick-coach');
  }, [clubs]);

  const pickCoach = useCallback((c: CoachOption) => {
    setCoach(c);
    setPhase('rebuilding');
  }, []);

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

  const sell = useCallback((p: Player) => {
    setSold(prev => {
      if (prev.some(x => x.name === p.name)) return prev;
      bumpFinances();
      return [...prev, p];
    });
  }, [bumpFinances]);

  const completeSigning = useCallback((p: Player, premium: number) => {
    setSigned(prev => {
      if (prev.some(x => x.name === p.name)) return prev;
      bumpFinances();
      return [...prev, p];
    });
    if (premium > 0) setOverpaid(o => o + premium);
    setActiveSlot(null);
    setSearch('');
  }, [bumpFinances]);

  const sign = useCallback((p: Player) => {
    if (p.marketValue > budget || war) return;
    // A rival can hijack the deal and start a live bidding war (seeded per
    // run + player; stars attract wars, squad players mostly do not).
    if (rivalPlans.length === 2 && playerRating(p) >= 72 && isContested(p, seed)) {
      const rivalIdx = warRivalIndex(p, seed);
      const rival = rivalPlans[rivalIdx];
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
      setActiveSlot(null);
      setSearch('');
      return;
    }
    completeSigning(p, 0);
  }, [budget, war, rivalPlans, seed, completeSigning]);

  const raiseWar = useCallback(() => {
    if (!war || war.outcome !== 'live' || war.thinking || war.leader !== 'rival') return;
    const myBid = nextRaise(war.price);
    if (myBid > budget) return;
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

  const finish = useCallback(async () => {
    if (war) return; // settle the bidding war first
    // Board reckoning: every unmet objective costs you a player.
    const out = new Set(forcedOut);
    const unmet = objectiveDeck.filter(o => !o.check({ signed, sold, budget }));
    if (unmet.length > 0) {
      const notes: string[] = [];
      for (const o of unmet) {
        const pool = [...signed, ...squad.filter(p => !soldNames.has(p.name))]
          .filter(p => !out.has(p.name))
          .sort((a, b) => b.marketValue - a.marketValue);
        const victim = pool[0];
        if (victim) {
          out.add(victim.name);
          notes.push(`${o.emoji} ${o.penaltyText} (${victim.name} was sold)`);
        } else {
          notes.push(`${o.emoji} ${o.penaltyText}`);
        }
      }
      setForcedOut(out);
      setPenalties(notes);
    }
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

        // Season sim uses your POST-penalty squad, coach bonus included.
        const postSquad = [...squad.filter(p => !soldNames.has(p.name)), ...signed].filter(p => !out.has(p.name));
        const postXiPlayers = buildXi(formation, postSquad).filter(Boolean) as Player[];
        const postRating = postXiPlayers.length
          ? Math.min(99, xiRating(buildXi(formation, postSquad)) + (coach?.bonus ?? 0))
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
  }, [war, objectiveDeck, signed, sold, budget, forcedOut, squad, soldNames, club, clubs, seed, market, rivalPlans, lostMap, formation, coach]);

  const reset = useCallback(() => {
    setPhase('pick-club');
    setClub(null);
    setSquad([]);
    setMarket([]);
    setSold([]);
    setSigned([]);
    setStartRating(0);
    setActiveSlot(null);
    setCoach(null);
    setCoachOptions([]);
    setObjectiveDeck([]);
    setFinLog([]);
    setExtraFunds(0);
    setTransferActions(0);
    setPenalties([]);
    setForcedOut(new Set());
    setRivals(null);
    setRivalPlans([]);
    setWar(null);
    setLostMap(new Map());
    setOverpaid(0);
    setSeason(null);
    if (warTimer.current) window.clearTimeout(warTimer.current);
  }, []);

  const setFormation = useCallback((name: string) => setFormationName(name), []);

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
    return `Rebuild: ${club.club}\n${startRating} → ${currentRating} (target ${target})\nCoach: ${coach?.name ?? 'Caretaker'}\n${grade}${rivalLine}${seasonLine}\nSold ${sold.length} · Signed ${signed.length} · €${budget}M left\ndouknowball.com/rebuild`;
  }, [phase, club, startRating, currentRating, target, grade, sold, signed, budget, coach, rivals, season]);

  return {
    phase, loading, clubs, club, squad: activeSquad, market, formation, setFormation,
    startingXi, startRating, currentRating, target, budget, sold, signed,
    activeSlot, setActiveSlot, candidates, search, setSearch,
    chooseClub, sell, sign, finish, reset, grade, shareText,
    coachOptions, keepCoach: KEEP_COACH, coach, pickCoach,
    objectives, finLog, penalties, rivals, rivalsLoading,
    war, raiseWar, walkAway,
    lostToRivals: [...lostMap.keys()], overpaid, season,
  };
}
