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

export type Phase = 'picking' | 'result';
export type Mode = 'daily' | 'unlimited';

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

  useGameCompletion('perfect-lineup', phase === 'result', result?.rating ?? 0);

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
  };
}
