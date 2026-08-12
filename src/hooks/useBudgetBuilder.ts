import { useState, useCallback, useMemo, useEffect } from 'react';
import { Player } from '@/types/game';
import {
  FORMATIONS, playerRating, fetchSquadPool, filterByTopic,
  type Formation, type FormationSlot, type Topic,
} from '@/lib/squadDeal';
import { simulateSeries, type SeriesResult } from '@/lib/dartDraft';
import { dateSeed, getTodayET } from '@/lib/dateUtils';
import { useGameCompletion } from '@/hooks/useGameCompletion';

/**
 * Budget Builder v2 (owner task 49, 2026-08-05: "criteria, eras, and a goal").
 *
 * - ERAS: build from the 2026 market, or travel back to the 2015 or 2007
 *   market (player_market_values holds those years; each row's age and value
 *   are that season's). The budget self-calibrates per era and formation:
 *   62% of what the naive most-expensive XI would cost, so every era forces
 *   the same tradeoffs even though 2007 money is tiny next to 2026 money.
 * - CRITERIA: one board demand per day (date-seeded). Meeting it pays a
 *   score bonus; it never blocks a signing, it just judges you.
 * - GOAL: when the XI is complete you play a 3-leg final against the Money
 *   XI, the squad money would buy with no budget at all. Beat the checkbook.
 *
 * Reuses squadDeal's FORMATIONS/playerRating/fetchSquadPool and dartDraft's
 * match sim so ratings and match logic mean the same thing everywhere.
 * NOTE ON UNITS: marketValue is in MILLIONS.
 */

export interface EraDef {
  id: 'today' | 'y2015' | 'y2007';
  label: string;
  emoji: string;
  year: number;
  blurb: string;
}

export const BB_ERAS: EraDef[] = [
  { id: 'today', label: 'Today', emoji: '⚡', year: 2026, blurb: 'The 2026 market' },
  { id: 'y2015', label: '2015', emoji: '📼', year: 2015, blurb: 'Prime Messi vs prime Ronaldo money' },
  { id: 'y2007', label: '2007', emoji: '🕰️', year: 2007, blurb: 'When 40M bought a superstar' },
];

export interface BbCriterion {
  id: string;
  emoji: string;
  label: string;
  /** True when the completed XI satisfies the demand. */
  check: (picked: Player[], budget: number, remaining: number) => boolean;
  /** Skip this criterion outside the Today era (league data is current-only). */
  todayOnly?: boolean;
}

const CRITERIA: BbCriterion[] = [
  { id: 'youth', emoji: '🌱', label: 'Sign at least 3 players aged 23 or under', check: p => p.filter(x => x.age > 0 && x.age <= 23).length >= 3 },
  { id: 'no-galactico', emoji: '🧾', label: 'No single player may cost over a third of the budget', check: (p, b) => p.every(x => x.marketValue <= b / 3) },
  { id: 'nation-core', emoji: '🤝', label: 'Build a core: 4+ players sharing a nationality', check: p => { const m = new Map<string, number>(); p.forEach(x => m.set(x.nationality, (m.get(x.nationality) ?? 0) + 1)); return [...m.values()].some(n => n >= 4); } },
  { id: 'bargains', emoji: '🛒', label: 'Find value: at least 2 players under 15M', check: p => p.filter(x => x.marketValue < 15).length >= 2 },
  { id: 'veteran', emoji: '🧓', label: 'At least one leader aged 32 or older', check: p => p.some(x => x.age >= 32) },
  { id: 'in-the-black', emoji: '🏦', label: 'Leave at least 10% of the budget unspent', check: (_p, b, r) => r >= b * 0.1 },
  { id: 'world-tour', emoji: '🌍', label: 'At least 6 different nationalities', check: p => new Set(p.map(x => x.nationality)).size >= 6 },
  { id: 'club-rule', emoji: '🚫', label: 'No two players from the same club', check: p => new Set(p.map(x => x.club)).size === p.length },
  { id: 'star-power', emoji: '⭐', label: 'At least one player rated 90 or higher', check: p => p.some(x => playerRating(x) >= 90) },
  { id: 'league-spread', emoji: '🗺️', label: 'No more than 4 players from one league', check: p => { const m = new Map<string, number>(); p.forEach(x => m.set(x.league, (m.get(x.league) ?? 0) + 1)); return [...m.values()].every(n => n <= 4); }, todayOnly: true },
];

export interface Squad {
  [slotIndex: number]: Player | undefined;
}

export interface BudgetBuilderState {
  loading: boolean;
  pool: Player[];
  formation: Formation;
  setFormation: (name: string) => void;
  topic: Topic;
  setTopic: (t: Topic) => void;
  era: EraDef;
  setEra: (id: EraDef['id']) => void;
  budget: number;
  squad: Squad;
  activeSlot: number | null;
  setActiveSlot: (i: number | null) => void;
  candidates: Player[];
  search: string;
  setSearch: (s: string) => void;
  spent: number;
  remaining: number;
  filled: number;
  complete: boolean;
  teamRating: number;
  criterion: BbCriterion;
  criterionMet: boolean;
  moneyXi: (Player | null)[];
  moneyRating: number;
  series: SeriesResult | null;
  playFinal: () => void;
  finalScore: number;
  sign: (p: Player) => void;
  release: (slotIndex: number) => void;
  reset: () => void;
  shareText: string;
}

/** Greedy most-expensive XI for a formation: what money with no limit buys. */
function moneyXiFor(pool: Player[], formation: Formation): (Player | null)[] {
  const used = new Set<string>();
  return formation.slots.map(slot => {
    const p = pool
      .filter(x => slot.allowed.includes(x.position) && !used.has(x.name))
      .sort((a, b) => b.marketValue - a.marketValue)[0];
    if (p) used.add(p.name);
    return p ?? null;
  });
}

export function useBudgetBuilder(): BudgetBuilderState {
  const [pools, setPools] = useState<Record<string, Player[]>>({});
  const [loading, setLoading] = useState(true);
  const [eraId, setEraId] = useState<EraDef['id']>('today');
  const [formationName, setFormationName] = useState(FORMATIONS[0].name);
  const [topic, setTopic] = useState<Topic>('all');
  const [squad, setSquad] = useState<Squad>({});
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState<SeriesResult | null>(null);

  const era = BB_ERAS.find(e => e.id === eraId) ?? BB_ERAS[0];

  useEffect(() => {
    let cancelled = false;
    if (pools[era.id]) { setLoading(false); return; }
    setLoading(true);
    fetchSquadPool('current', era.year).then(p => {
      if (cancelled) return;
      setPools(prev => ({ ...prev, [era.id]: p }));
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [era.id]);

  const pool = pools[era.id] ?? [];

  const formation = useMemo(
    () => FORMATIONS.find(f => f.name === formationName) ?? FORMATIONS[0],
    [formationName],
  );

  // Era pools before ~2020 predate some topic data; topics only apply Today.
  const topicPool = useMemo(
    () => (era.id === 'today' ? filterByTopic(pool, topic) : pool),
    [pool, topic, era.id],
  );

  const moneyXi = useMemo(() => moneyXiFor(topicPool, formation), [topicPool, formation]);

  /** Budget = 62% of the unconstrained best-XI cost, rounded to 10M, min 100M. */
  const budget = useMemo(() => {
    const naive = moneyXi.reduce((s, p) => s + (p?.marketValue ?? 0), 0);
    return Math.max(100, Math.round((naive * 0.62) / 10) * 10);
  }, [moneyXi]);

  const spent = useMemo(
    () => Object.values(squad).reduce((s, p) => s + (p?.marketValue ?? 0), 0),
    [squad],
  );
  const remaining = budget - spent;
  const filled = Object.values(squad).filter(Boolean).length;
  const complete = filled === formation.slots.length;

  const teamRating = useMemo(() => {
    const picked = Object.values(squad).filter(Boolean) as Player[];
    if (picked.length === 0) return 0;
    return Math.round(picked.reduce((s, p) => s + playerRating(p), 0) / picked.length);
  }, [squad]);

  const moneyRating = useMemo(() => {
    const picked = moneyXi.filter(Boolean) as Player[];
    if (picked.length === 0) return 0;
    return Math.round(picked.reduce((s, p) => s + playerRating(p), 0) / picked.length);
  }, [moneyXi]);

  /** Today's board demand, date-seeded; era-safe list. */
  const criterion = useMemo(() => {
    const eligible = CRITERIA.filter(c => !c.todayOnly || era.id === 'today');
    return eligible[dateSeed(getTodayET()) % eligible.length];
  }, [era.id]);

  const criterionMet = useMemo(() => {
    const picked = Object.values(squad).filter(Boolean) as Player[];
    if (!complete) return false;
    return criterion.check(picked, budget, remaining);
  }, [squad, complete, criterion, budget, remaining]);

  const usedNames = useMemo(
    () => new Set(Object.values(squad).filter(Boolean).map(p => p!.name)),
    [squad],
  );

  const candidates = useMemo(() => {
    if (activeSlot === null) return [];
    const slot: FormationSlot | undefined = formation.slots[activeSlot];
    if (!slot) return [];
    const currentCost = squad[activeSlot]?.marketValue ?? 0;
    const budgetForSlot = remaining + currentCost;
    const q = search.trim().toLowerCase();
    return topicPool
      .filter(p => slot.allowed.includes(p.position))
      .filter(p => !usedNames.has(p.name) || squad[activeSlot]?.name === p.name)
      .filter(p => p.marketValue <= budgetForSlot)
      .filter(p => (q ? p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q) : true))
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 60);
  }, [activeSlot, formation, topicPool, usedNames, squad, remaining, search]);

  const finalScore = useMemo(() => {
    if (!complete) return 0;
    let s = teamRating * 10 + Math.floor(Math.max(0, remaining) / 20);
    if (criterionMet) s += 100;
    if (series) s += series.outcome === 'win' ? 150 : series.outcome === 'draw' ? 50 : 0;
    return s;
  }, [complete, teamRating, remaining, criterionMet, series]);

  useGameCompletion('budget-builder', complete && series !== null, finalScore, teamRating);

  const playFinal = useCallback(() => {
    if (!complete) return;
    const mine = formation.slots.map((_, i) => squad[i] ?? null);
    setSeries(simulateSeries(mine, moneyXi));
  }, [complete, formation, squad, moneyXi]);

  const sign = useCallback((p: Player) => {
    if (activeSlot === null) return;
    setSquad(prev => ({ ...prev, [activeSlot]: p }));
    setActiveSlot(null);
    setSearch('');
    setSeries(null);
  }, [activeSlot]);

  const release = useCallback((slotIndex: number) => {
    setSquad(prev => {
      const next = { ...prev };
      delete next[slotIndex];
      return next;
    });
    setSeries(null);
  }, []);

  const reset = useCallback(() => {
    setSquad({});
    setActiveSlot(null);
    setSearch('');
    setSeries(null);
  }, []);

  // Changing formation or era clears the squad: slot indices shift and era
  // pools are different players entirely.
  const setFormation = useCallback((name: string) => {
    setFormationName(name);
    setSquad({});
    setActiveSlot(null);
    setSeries(null);
  }, []);

  const setEra = useCallback((id: EraDef['id']) => {
    setEraId(id);
    setSquad({});
    setActiveSlot(null);
    setSeries(null);
  }, []);

  const shareText = useMemo(() => {
    if (!complete) return '';
    const seriesLine = series
      ? `\nFinal vs the Money XI (${moneyRating}): ${series.userWins}-${series.aiWins}${series.outcome === 'win' ? ', beat the checkbook!' : series.outcome === 'draw' ? ', honors even' : ''}`
      : '';
    const critLine = `\nBoard demand: ${criterion.label} ${criterionMet ? '✅' : '❌'}`;
    return `Budget Builder (${era.label}, €${budget}M cap), ${formation.name}\nRating ${teamRating} · Spent €${spent}M · Score ${finalScore}${critLine}${seriesLine}\ndouknowball.com/budget-builder`;
  }, [complete, era, budget, formation, teamRating, spent, finalScore, criterion, criterionMet, series, moneyRating]);

  return {
    loading, pool: topicPool, formation, setFormation, topic, setTopic,
    era, setEra, budget,
    squad, activeSlot, setActiveSlot, candidates, search, setSearch,
    spent, remaining, filled, complete, teamRating,
    criterion, criterionMet, moneyXi, moneyRating, series, playFinal, finalScore,
    sign, release, reset, shareText,
  };
}
