import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
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

function dailySeed(dateStr: string): number {
  // Round 52: seed off the ET date like every other daily on the site.
  // Round 428: the caller passes the day it pinned at mount, so the slots and
  // the record cannot end up on different sides of midnight.
  return parseInt(dateStr.replace(/-/g, ''), 10);
}

/* Round 428: today's finished daily, restored in the useState initializers
   below so a reload is finished on its very first render (the recorder sees
   no transition) instead of an empty board with the scoring known. Only the
   names are kept, in slot order: the slots come back from the day seed and
   the result is simulated again, which is pure. Fail closed, because
   scripts/sweepSaves.mjs feeds this key garbage: a list of the wrong length,
   a repeated name, or a name the pool no longer carries starts a fresh board. */
function loadDaily<P>(config: LineupConfig<P>, today: string): { picks: Record<number, P>; result: GenericSimResult } | null {
  return readDailyRecord(config.gameId, today, (f) => {
    const { names } = f;
    if (!Array.isArray(names) || names.length !== config.formation.length) return null;
    if (new Set(names).size !== names.length) return null;
    const picks: Record<number, P> = {};
    const ordered: P[] = [];
    for (let i = 0; i < names.length; i++) {
      const p = config.pool.find((x) => config.nameOf(x) === names[i]);
      if (!p) return null;
      picks[i] = p;
      ordered.push(p);
    }
    return { picks, result: simulate(config, ordered) };
  });
}

export function usePerfectLineupGeneric<P>(config: LineupConfig<P>) {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT, so the slots dealt from the
     day seed and the record written at Simulate always name the same day. The
     review caught the alternative: a lineup simulated after midnight ET was
     booked under TOMORROW, and tomorrow then opened finished with yesterday
     names dropped by index into differently constrained slots. */
  const todayStr = useRef(getTodayET()).current;
  const size = config.formation.length;
  const [restored] = useState(() => loadDaily(config, todayStr));
  const [mode, setMode] = useState<Mode>('daily');
  const [slots, setSlots] = useState<GenericSlot[]>(() => rollLineup(config, dailySeed(todayStr)));
  const [picks, setPicks] = useState<Record<number, P>>(restored?.picks ?? {});
  const [phase, setPhase] = useState<Phase>(restored ? 'result' : 'picking');
  const [result, setResult] = useState<GenericSimResult | null>(restored?.result ?? null);
  /* today's daily is in the books: restored above, or simulated and saved below */
  const [dailyDone, setDailyDone] = useState(restored !== null);

  const filledCount = Object.keys(picks).length;
  const allFilled = filledCount === size;

  const rollDaily = useCallback(() => {
    setMode('daily');
    setSlots(rollLineup(config, dailySeed(todayStr)));
    /* toggling back from unlimited shows the booked result, never a redeal */
    const saved = loadDaily(config, todayStr);
    setDailyDone(saved !== null);
    setPicks(saved?.picks ?? {});
    setResult(saved?.result ?? null);
    setPhase(saved ? 'result' : 'picking');
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
    if (mode === 'daily' && dailyDone) return;
    const ordered = slots.map((s) => picks[s.id]);
    setResult(simulate(config, ordered));
    setPhase('result');
  }, [picks, slots, size, config, mode, dailyDone]);

  const reset = useCallback(() => {
    if (mode === 'daily' && dailyDone) return;
    setPicks({});
    setResult(null);
    setPhase('picking');
  }, [mode, dailyDone]);

  /* A daily already in the books is not a finish: a reloaded or toggled
     back result never records, and the fresh one records once, in the same
     commit that then books it below. */
  useGameCompletion(config.gameId, phase === 'result' && !(mode === 'daily' && dailyDone), result?.rating ?? 0);

  useEffect(() => {
    if (mode !== 'daily' || phase !== 'result' || dailyDone) return;
    writeDailyRecord(config.gameId, todayStr, { names: slots.map((s) => config.nameOf(picks[s.id])) });
    setDailyDone(true);
  }, [mode, phase, dailyDone, slots, picks, config]);

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
