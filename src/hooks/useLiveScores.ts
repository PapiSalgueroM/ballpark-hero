/**
 * Round 287: the scores the ticker shows, refreshed while the tab is open.
 *
 * Fetches once on mount and every five minutes after that, and again when
 * the tab comes back into view, because a ticker that shows a 3rd quarter
 * score from before lunch is worse than one that shows nothing. Every failure
 * resolves to an empty list; the ticker then simply carries the site's own
 * lines, which is what it did before scores existed.
 */
import { useEffect, useState } from 'react';
import { fetchLiveScores, type LiveScoreRow } from '@/lib/liveScores';

const REFRESH_MS = 5 * 60 * 1000;

export function useLiveScores(): LiveScoreRow[] {
  const [rows, setRows] = useState<LiveScoreRow[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => { fetchLiveScores().then(r => { if (live) setRows(r); }); };
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
  return rows;
}
