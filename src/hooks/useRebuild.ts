import { useState, useCallback, useMemo, useEffect } from 'react';
import { Player } from '@/types/game';
import { FORMATIONS, playerRating, type Formation, type FormationSlot } from '@/lib/squadDeal';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  fetchRebuildClubs, fetchClubSquad, fetchMarket,
  type RebuildClub,
} from '@/lib/fetchRebuild';

export type Phase = 'pick-club' | 'rebuilding' | 'done';

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
 * ceiling (playerRating caps at 99 and tops out ~85 for a €216m player), so
 * asking Real Madrid for +5 would be impossible while asking Genk for +5 is
 * trivial. Weak squads have far more headroom, so they get a bigger ask.
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

  const startingXi = useMemo(() => buildXi(formation, activeSquad), [formation, activeSquad]);
  const currentRating = useMemo(() => xiRating(startingXi), [startingXi]);

  const budget = useMemo(
    () => BASE_BUDGET
      + sold.reduce((s, p) => s + p.marketValue, 0)
      - signed.reduce((s, p) => s + p.marketValue, 0),
    [sold, signed],
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
      .filter(p => p.marketValue <= budget)
      .filter(p => (q ? p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q) : true))
      .sort((a, b) => playerRating(b) - playerRating(a))
      .slice(0, 50);
  }, [activeSlot, formation, market, signedNames, budget, search]);

  useGameCompletion('rebuild', phase === 'done', Math.max(0, currentRating * 10), currentRating >= target ? 1 : 0);

  const chooseClub = useCallback(async (c: RebuildClub) => {
    setClub(c);
    setLoading(true);
    const [sq, mk] = await Promise.all([fetchClubSquad(c.club), fetchMarket(c.club)]);
    setSquad(sq);
    setMarket(mk);
    setStartRating(xiRating(buildXi(FORMATIONS[0], sq)));
    setFormationName(FORMATIONS[0].name);
    setSold([]);
    setSigned([]);
    setLoading(false);
    setPhase('rebuilding');
  }, []);

  const sell = useCallback((p: Player) => {
    setSold(prev => (prev.some(x => x.name === p.name) ? prev : [...prev, p]));
  }, []);

  const sign = useCallback((p: Player) => {
    if (p.marketValue > budget) return;
    setSigned(prev => (prev.some(x => x.name === p.name) ? prev : [...prev, p]));
    setActiveSlot(null);
    setSearch('');
  }, [budget]);

  const finish = useCallback(() => setPhase('done'), []);

  const reset = useCallback(() => {
    setPhase('pick-club');
    setClub(null);
    setSquad([]);
    setMarket([]);
    setSold([]);
    setSigned([]);
    setStartRating(0);
    setActiveSlot(null);
  }, []);

  const setFormation = useCallback((name: string) => setFormationName(name), []);

  const grade = useMemo(
    () => gradeFor(currentRating, startRating, target),
    [currentRating, startRating, target],
  );

  const shareText = useMemo(() => {
    if (phase !== 'done' || !club) return '';
    return `Rebuild: ${club.club}\n${startRating} → ${currentRating} (target ${target})\n${grade}\nSold ${sold.length} · Signed ${signed.length} · €${budget}M left\ndouknowball.com/rebuild`;
  }, [phase, club, startRating, currentRating, target, grade, sold, signed, budget]);

  return {
    phase, loading, clubs, club, squad: activeSquad, market, formation, setFormation,
    startingXi, startRating, currentRating, target, budget, sold, signed,
    activeSlot, setActiveSlot, candidates, search, setSearch,
    chooseClub, sell, sign, finish, reset, grade, shareText,
  };
}
