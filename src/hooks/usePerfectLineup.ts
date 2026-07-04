import { useState, useCallback, useMemo } from 'react';
import { Player } from '@/types/game';
import {
  LineupSlot,
  SimResult,
  rollLineup,
  eligiblePlayers,
  simulate,
  FORMATION_SIZE,
} from '@/data/perfectLineup';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  UnbeatenRunResult,
  simulateUnbeatenRun,
} from '@/lib/unbeatenMode';
import { randomSeed } from '@/lib/perfectSeason';

export type Phase = 'picking' | 'result';
export type Mode = 'daily' | 'unlimited';

/** Top-level page mode: the existing classic builder, or the new Go
 *  Unbeaten season sim. Additive only; defaults to 'classic' so the
 *  existing flow never changes for anyone who never touches the toggle. */
export type GameView = 'classic' | 'unbeaten';
export type UnbeatenPhase = 'picking' | 'running' | 'done';

function dailySeed(): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return parseInt(today.replace(/-/g, ''), 10);
}

export function usePerfectLineup() {
  const [mode, setMode] = useState<Mode>('daily');
  const [slots, setSlots] = useState<LineupSlot[]>(() => rollLineup(dailySeed()));
  const [picks, setPicks] = useState<Record<number, Player>>({});
  const [phase, setPhase] = useState<Phase>('picking');
  const [result, setResult] = useState<SimResult | null>(null);

  // --- Go Unbeaten mode (additive; classic state above is untouched) -----
  const [view, setView] = useState<GameView>('classic');
  const [unbeatenPhase, setUnbeatenPhase] = useState<UnbeatenPhase>('picking');
  const [unbeatenRun, setUnbeatenRun] = useState<UnbeatenRunResult | null>(null);
  const [revealedMatches, setRevealedMatches] = useState(0);

  const usedNames = useMemo(
    () => new Set(Object.values(picks).map((p) => p.name)),
    [picks],
  );

  const filledCount = Object.keys(picks).length;
  const allFilled = filledCount === FORMATION_SIZE;

  const rollDaily = useCallback(() => {
    setMode('daily');
    setSlots(rollLineup(dailySeed()));
    setPicks({});
    setResult(null);
    setPhase('picking');
  }, []);

  const rollUnlimited = useCallback(() => {
    setMode('unlimited');
    setSlots(rollLineup(Math.floor(Math.random() * 2 ** 31)));
    setPicks({});
    setResult(null);
    setPhase('picking');
  }, []);

  const eligibleFor = useCallback(
    (slotId: number): Player[] => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return [];
      // A player already chosen for THIS slot should still appear; exclude only others.
      const otherUsed = new Set(
        Object.entries(picks)
          .filter(([id]) => Number(id) !== slotId)
          .map(([, p]) => p.name),
      );
      return eligiblePlayers(slot, otherUsed);
    },
    [slots, picks],
  );

  const pickPlayer = useCallback((slotId: number, player: Player) => {
    setPicks((prev) => ({ ...prev, [slotId]: player }));
  }, []);

  const clearSlot = useCallback((slotId: number) => {
    setPicks((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, []);

  const simulateLineup = useCallback(() => {
    if (Object.keys(picks).length !== FORMATION_SIZE) return;
    const ordered = slots.map((s) => picks[s.id]);
    setResult(simulate(ordered));
    setPhase('result');
  }, [picks, slots]);

  const reset = useCallback(() => {
    setPicks({});
    setResult(null);
    setPhase('picking');
  }, []);

  // --- Go Unbeaten actions -------------------------------------------------

  /** Switches the top-level tab. Leaves classic picks/result untouched so
   *  flipping back to Classic resumes exactly where it was left. */
  const setGameView = useCallback((v: GameView) => {
    setView(v);
  }, []);

  /** Runs the lineup's rating through the 38 match season sim. Requires a
   *  completed lineup (same FORMATION_SIZE picks as classic simulate). */
  const startUnbeatenRun = useCallback(() => {
    if (Object.keys(picks).length !== FORMATION_SIZE) return;
    const ordered = slots.map((s) => picks[s.id]);
    const rating = simulate(ordered).rating;
    const run = simulateUnbeatenRun(rating, randomSeed());
    setUnbeatenRun(run);
    setRevealedMatches(0);
    setUnbeatenPhase('running');
  }, [picks, slots]);

  /** Reveals the next match in the run; caller drives the pacing (interval or click). */
  const revealNextMatch = useCallback(() => {
    setRevealedMatches((r) => {
      if (!unbeatenRun) return r;
      const next = Math.min(unbeatenRun.played, r + 1);
      return next;
    });
  }, [unbeatenRun]);

  const skipUnbeatenReveal = useCallback(() => {
    if (!unbeatenRun) return;
    setRevealedMatches(unbeatenRun.played);
  }, [unbeatenRun]);

  const finishUnbeatenReveal = useCallback(() => {
    setUnbeatenPhase('done');
  }, []);

  const resetUnbeaten = useCallback(() => {
    setPicks({});
    setUnbeatenRun(null);
    setRevealedMatches(0);
    setUnbeatenPhase('picking');
  }, []);

  const rerollUnbeatenLineup = useCallback(() => {
    setSlots(rollLineup(Math.floor(Math.random() * 2 ** 31)));
    setPicks({});
    setUnbeatenRun(null);
    setRevealedMatches(0);
    setUnbeatenPhase('picking');
  }, []);

  // Single completion signal for the whole page: fires once for whichever
  // mode the player actually finished. Both modes share the 'perfect-lineup'
  // slug per spec (no new game slug), so this hook must only call
  // useGameCompletion once with one combined isComplete/score pair.
  const isComplete = phase === 'result' || unbeatenPhase === 'done';
  const completionScore =
    unbeatenPhase === 'done' && unbeatenRun ? unbeatenRun.points : result?.rating ?? 0;

  useGameCompletion('perfect-lineup', isComplete, completionScore);

  return {
    mode,
    slots,
    picks,
    phase,
    result,
    usedNames,
    filledCount,
    allFilled,
    rollDaily,
    rollUnlimited,
    eligibleFor,
    pickPlayer,
    clearSlot,
    simulateLineup,
    reset,
    // Go Unbeaten
    view,
    setGameView,
    unbeatenPhase,
    unbeatenRun,
    revealedMatches,
    startUnbeatenRun,
    revealNextMatch,
    skipUnbeatenReveal,
    finishUnbeatenReveal,
    resetUnbeaten,
    rerollUnbeatenLineup,
  };
}
