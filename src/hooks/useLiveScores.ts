/**
 * Round 287: the scores the ticker shows, refreshed while the tab is open.
 *
 * Fetches once on mount and every five minutes after that, and again when
 * the tab comes back into view, because a ticker that shows a 3rd quarter
 * score from before lunch is worse than one that shows nothing.
 *
 * Round 711: the hook now says how the last read went, not just what it got.
 * 'loading' until the first answer, 'ok' after a read that answered, 'failed'
 * after one that did not. A failed read keeps the rows it already had: their
 * own updated_at stamps age honestly and the freshness rules in liveScores.ts
 * mark them delayed, which beats a strip that blinks empty on one dropped
 * request. checkedAt is the SERVER's clock at the last answer (the Date
 * header), carried forward by the offset it last measured when a read fails,
 * so a visitor whose clock is an hour out does not see every game as late.
 */
import { useEffect, useState } from 'react';
import { fetchLiveBoard, type LiveScoreRow } from '@/lib/liveScores';

const REFRESH_MS = 5 * 60 * 1000;

export type LiveStatus = 'loading' | 'ok' | 'failed';

export interface LiveScoresState {
  rows: LiveScoreRow[];
  status: LiveStatus;
  /** the server's time at the last check, in ms; null before the first */
  checkedAt: number | null;
}

export function useLiveScores(): LiveScoresState {
  const [state, setState] = useState<LiveScoresState>({ rows: [], status: 'loading', checkedAt: null });
  useEffect(() => {
    let live = true;
    let offset = 0;
    const load = () => {
      fetchLiveBoard().then(read => {
        if (!live) return;
        const local = Date.now();
        if (read) {
          if (read.serverNow != null) offset = read.serverNow - local;
          setState({ rows: read.rows, status: 'ok', checkedAt: local + offset });
        } else {
          setState(prev => ({ rows: prev.rows, status: 'failed', checkedAt: local + offset }));
        }
      });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return state;
}
