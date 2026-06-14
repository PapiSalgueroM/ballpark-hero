import { useState, useCallback, useMemo } from 'react';
import {
  LineupConfig,
  GenericSlot,
  GenericSimResult,
  rollLineup,
  eligiblePlayers,
  simulate,
} from '@/lib/perfectLineupEngine';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type Phase = 'picking' | 'result';
export type Mode = 'daily' | 'unlimited';

function dailySeed(): number {
  return parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10);
}

export function usePerfectLineupGeneric<P>(config: LineupConfig<P>) {
  const size = config.formation.length;
  const [mode, setMode] = useState<Mode>('daily');
  const [slots, setSlots] = useState<GenericSlot[]>(() => rollLineup(config, dailySeed()));
  const [picks, setPicks] = useState<Record<number, P>>({});
  const [phase, setPhase] = useState<Phase>('picking');
  const [result, setResult] = useState<GenericSimResult | null>(null);

  const filledCount = Object.keys(picks).length;
  const allFilled = filledCount === size;

  const rollDaily = useCallback(() => {
    setMode('daily');
    setSlots(rollLineup(config, dailySeed()));
    setPicks({});
    setResult(null);
    setPhase('picking');
  }, [config]);

  const rollUnlimited = useCallback(() => {
    setMode('unlimited');
    setSlots(rollLineup(config, Math.floor(Math.random() * 2 ** 31)));
    setPicks({});
    setResult(null);
    setPhase('picking');
  }, [config]);

  const eligibleFor = useCallback(
    (slotId: number): P[] => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return [];
      const otherUsed = new Set(
        Object.entries(picks)
          .filter(([id]) => Number(id) !== slotId)
          .map(([, p]) => config.nameOf(p)),
      );
      return eligiblePlayers(config, slot, otherUsed);
    },
    [slots, picks, config],
  );

  const pickPlayer = useCallback((slotId: number, player: P) => {
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
    if (Object.keys(picks).length !== size) return;
    const ordered = slots.map((s) => picks[s.id]);
    setResult(simulate(config, ordered));
    setPhase('result');
  }, [picks, slots, size, config]);

  const reset = useCallback(() => {
    setPicks({});
    setResult(null);
    setPhase('picking');
  }, []);

  useGameCompletion(config.gameId, phase === 'result', result?.rating ?? 0);

  return useMemo(
    () => ({
      mode,
      slots,
      picks,
      phase,
      result,
      filledCount,
      allFilled,
      rollDaily,
      rollUnlimited,
      eligibleFor,
      pickPlayer,
      clearSlot,
      simulateLineup,
      reset,
    }),
    [mode, slots, picks, phase, result, filledCount, allFilled, rollDaily, rollUnlimited, eligibleFor, pickPlayer, clearSlot, simulateLineup, reset],
  );
}
