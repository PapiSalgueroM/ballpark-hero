import { useState, useCallback, useMemo, useEffect } from 'react';
import { Player } from '@/types/game';
import {
  FORMATIONS, playerRating, fetchSquadPool, filterByTopic,
  type Formation, type FormationSlot, type Topic,
} from '@/lib/squadDeal';
import { useGameCompletion } from '@/hooks/useGameCompletion';

/**
 * $1 Billion Budget Builder.
 *
 * Deliberately reuses squadDeal's FORMATIONS, playerRating and fetchSquadPool
 * rather than duplicating them, same pitch coordinates, same rating curve, so
 * a 90-rated player means the same thing here as in Squad Deal.
 *
 * NOTE ON UNITS: Player.marketValue from fetchSquadPool is in MILLIONS
 * (squadDeal divides market_value_usd by 1e6). So the €1B budget is 1000.
 * Do not "fix" this to raw USD without changing BUDGET too.
 */
export const BUDGET = 1000; // €1,000M = €1B

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
  sign: (p: Player) => void;
  release: (slotIndex: number) => void;
  reset: () => void;
  shareText: string;
}

export function useBudgetBuilder(): BudgetBuilderState {
  const [pool, setPool] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [formationName, setFormationName] = useState(FORMATIONS[0].name);
  const [topic, setTopic] = useState<Topic>('all');
  const [squad, setSquad] = useState<Squad>({});
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSquadPool('current').then(p => {
      if (cancelled) return;
      setPool(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const formation = useMemo(
    () => FORMATIONS.find(f => f.name === formationName) ?? FORMATIONS[0],
    [formationName],
  );

  const topicPool = useMemo(() => filterByTopic(pool, topic), [pool, topic]);

  const spent = useMemo(
    () => Object.values(squad).reduce((s, p) => s + (p?.marketValue ?? 0), 0),
    [squad],
  );
  const remaining = BUDGET - spent;
  const filled = Object.values(squad).filter(Boolean).length;
  const complete = filled === formation.slots.length;

  const teamRating = useMemo(() => {
    const picked = Object.values(squad).filter(Boolean) as Player[];
    if (picked.length === 0) return 0;
    return Math.round(picked.reduce((s, p) => s + playerRating(p), 0) / picked.length);
  }, [squad]);

  const usedNames = useMemo(
    () => new Set(Object.values(squad).filter(Boolean).map(p => p!.name)),
    [squad],
  );

  /**
   * Candidates for the open slot: right position, not already signed, and
   * affordable with what's left. Affordability is the whole game — showing
   * players you can't buy would just be noise.
   */
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

  useGameCompletion('budget-builder', complete, teamRating * 10, filled);

  const sign = useCallback((p: Player) => {
    if (activeSlot === null) return;
    setSquad(prev => ({ ...prev, [activeSlot]: p }));
    setActiveSlot(null);
    setSearch('');
  }, [activeSlot]);

  const release = useCallback((slotIndex: number) => {
    setSquad(prev => {
      const next = { ...prev };
      delete next[slotIndex];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSquad({});
    setActiveSlot(null);
    setSearch('');
  }, []);

  // Changing formation clears the squad, slot indices mean different
  // positions between formations, so keeping picks would scramble the XI.
  const setFormation = useCallback((name: string) => {
    setFormationName(name);
    setSquad({});
    setActiveSlot(null);
  }, []);

  const shareText = useMemo(() => {
    if (!complete) return '';
    const lines = formation.slots.map((s, i) => {
      const p = squad[i];
      return p ? `${s.label}: ${p.name} (€${p.marketValue}M)` : null;
    }).filter(Boolean);
    return `€1B Budget Builder, ${formation.name}\nRating: ${teamRating} · Spent: €${spent}M of €${BUDGET}M\n${lines.join('\n')}\ndouknowball.com/budget-builder`;
  }, [complete, formation, squad, teamRating, spent]);

  return {
    loading, pool: topicPool, formation, setFormation, topic, setTopic,
    squad, activeSlot, setActiveSlot, candidates, search, setSearch,
    spent, remaining, filled, complete, teamRating, sign, release, reset, shareText,
  };
}
