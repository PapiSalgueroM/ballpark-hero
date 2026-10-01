import { useCallback, useState } from 'react';
import {
  loadBestRecord, saveBestRecord, type BestRecord, type PerfectSeasonSportKey,
} from '@/lib/perfectSeason';

/**
 * Round 820: the best record a browser has posted in one Perfect Season sport,
 * shared by all four pages (Round 784 wrote it into the NBA page alone).
 * Read once at mount; the prerenderer sees an empty store and draws nothing,
 * so the snapshot is stable. `record` weighs a finished run against the
 * stored best and keeps the better one; `reset` clears the "new best" flag
 * when the player runs it back.
 */
export function usePerfectSeasonBest(sport: PerfectSeasonSportKey) {
  const [best, setBest] = useState<BestRecord | null>(() => loadBestRecord(sport));
  const [newBest, setNewBest] = useState(false);
  const record = useCallback((run: Omit<BestRecord, 'v'>) => {
    const outcome = saveBestRecord(sport, run);
    setBest(outcome.best);
    setNewBest(outcome.improved);
  }, [sport]);
  const reset = useCallback(() => setNewBest(false), []);
  return { best, newBest, record, reset };
}
