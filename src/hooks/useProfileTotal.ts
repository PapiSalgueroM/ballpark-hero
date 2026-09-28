import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { primeScoreCaps, sumClampedRecords } from '@/lib/scoreCaps';

/**
 * Round 648: the profile's all time total, summed from the player's own
 * records with each one clamped at its game's cap.
 *
 * Until this round the page read user_scores.total_points, a running sum that
 * record_auth_completion grew by the raw score of every save, so one Pack
 * Battle pack (the banked value in dollars) added about 8.8 million to a total
 * where a whole Club Manager season is worth 130. This hook reads the records
 * behind that number (user_game_scores, every row, paged past the 1,000 row
 * response cap) and the caps the World Leaderboard scores against
 * (public.game_denominators, through src/lib/scoreCaps.ts), and adds each
 * record at no more than its cap.
 *
 * total is null while loading and when either read fails, so the page can
 * fall back to the stored total rather than show a zero it does not believe.
 * The Round 648 migration brings the stored total onto the same rule, so the
 * fallback and the all time rank agree with this number once it has landed.
 *
 * Fence: scripts/simProfileTotal.mjs (src/test/profileTotal.test.tsx).
 */
export interface ProfileTotal {
  /** The sum of the records, each clamped at its cap; null while loading or when a read failed. */
  total: number | null;
  loading: boolean;
}

interface ScoreRow {
  game_type: string;
  score: number | null;
}

export function useProfileTotal(userId: string | null | undefined): ProfileTotal {
  const [state, setState] = useState<ProfileTotal>({ total: null, loading: !!userId });

  useEffect(() => {
    if (!userId) {
      setState({ total: null, loading: false });
      return undefined;
    }
    let cancelled = false;
    setState({ total: null, loading: true });
    (async () => {
      const [caps, rows] = await Promise.all([
        primeScoreCaps(),
        fetchAllRows<ScoreRow>((from, to) =>
          supabase
            .from('user_game_scores')
            .select('game_type, score')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to)),
      ]);
      if (cancelled) return;
      if (!caps || rows.error) {
        setState({ total: null, loading: false });
        return;
      }
      const total = sumClampedRecords(rows.data.map(r => ({ game: r.game_type, score: r.score })), caps);
      setState({ total, loading: false });
    })().catch(() => {
      if (!cancelled) setState({ total: null, loading: false });
    });
    return () => { cancelled = true; };
  }, [userId]);

  return state;
}
