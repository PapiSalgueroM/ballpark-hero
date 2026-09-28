import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { profileTotal } from '@/lib/pointsRule';
import { primeScoreCaps } from '@/lib/scoreCaps';

/**
 * Round 648: the profile's all time total, summed from the player's own
 * records by the profile's rule (src/lib/pointsRule.ts): one row per game per
 * day, the day's best, capped. That is the owner directed recompute of
 * 2026-09-19, and the Round 648 migration holds user_scores.total_points to
 * the same rule with the same caps, so this total and the stored one the all
 * time rank counts are one number once the migration has landed.
 *
 * The records are user_game_scores (every row, paged past the 1,000 row
 * response cap), read as game, score and puzzle_date, the three columns the
 * rule groups and ranks by. The caps are public.game_score_caps through
 * src/lib/scoreCaps.ts, the plain table cached in this browser for six hours,
 * never the game_denominators view, whose NULL fallback runs a percentile
 * over game_completions.
 *
 * total is null while loading and when either read fails, so the page can
 * fall back to the stored total rather than show a zero it does not believe.
 *
 * Fence: scripts/simProfileTotal.mjs (src/test/profileTotal.test.tsx).
 */
export interface ProfileTotal {
  /** The rule over the player's records; null while loading or when a read failed. */
  total: number | null;
  loading: boolean;
}

interface ScoreRow {
  game_type: string;
  score: number | null;
  puzzle_date: string | null;
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
            .select('game_type, score, puzzle_date')
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
      const total = profileTotal(rows.data.map(r => ({ game: r.game_type, score: r.score, day: r.puzzle_date })), caps);
      setState({ total, loading: false });
    })().catch(() => {
      if (!cancelled) setState({ total: null, loading: false });
    });
    return () => { cancelled = true; };
  }, [userId]);

  return state;
}
