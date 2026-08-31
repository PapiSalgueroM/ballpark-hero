import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';

export interface MostPlayedEntry {
  game: GameDef;
  count: number;
  /** true when this entry is a curated fallback, not a real completion count */
  isFallback: boolean;
}

// Flagship trio shown while game_completions doesn't yet have 3 games with
// 5+ completions today. Keeps the section from ever looking empty/broken,
// especially right after launch before the table has real volume.
const FALLBACK_PATHS = ['/soccer-grid', '/perfect-season-nba', '/transfer-path'];

const MIN_COMPLETIONS_TO_QUALIFY = 5;
const TOP_N = 3;

function gameByPath(path: string): GameDef | undefined {
  return ALL_GAMES.find(g => g.path === path);
}

function buildFallback(): MostPlayedEntry[] {
  return FALLBACK_PATHS
    .map(gameByPath)
    .filter((g): g is GameDef => !!g)
    .map(game => ({ game, count: 0, isFallback: true }));
}

/**
 * Wave 3 / item #11: "Most Played Today" wired to public.game_completions.
 *
 * Queries today's rows (UTC, matching the table's `completed_on` default),
 * asks the database for the top 3 games of the day with at least
 * MIN_COMPLETIONS_TO_QUALIFY completions, via the most_played_today function.
 * It used to select the day's rows and group them here, which was correct only
 * while a day stayed under PostgREST's 1,000 row cap. It stopped being correct
 * and said nothing. See the note at the call site.
 *
 * Falls back to a curated flagship trio whenever fewer than 3 games clear
 * the threshold, so the section never renders empty or looks broken.
 */
export function useMostPlayed(): { entries: MostPlayedEntry[]; loading: boolean } {
  const [entries, setEntries] = useState<MostPlayedEntry[]>(buildFallback());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        /* ROUND 361: COUNTED IN THE DATABASE, BECAUSE COUNTING IT HERE WAS
           SILENTLY WRONG. This used to select the day's rows and tally them in
           the browser, on the assumption written into the comment above that a
           day's table was small. PostgREST truncates every select at 1,000 rows
           (the same cap src/lib/fetchAllRows.ts exists for), and the day had
           grown to 3,550, so the tally ranked an arbitrary slice of the early
           hours: it saw club-manager 990, budget-builder 7 and ball-iq 1, where
           the day's real top three were club-manager 2638, soccer-career 547
           and nba-my-career 132. Only two games cleared the five play bar in
           that slice, which is fewer than TOP_N, so the section quietly served
           the curated fallback and looked completely normal while doing it.
           An aggregate returns three rows instead of thousands, so it cannot be
           truncated and it stops shipping a day of completions to a phone in
           order to count them. The function joins game_score_caps, which is
           Round 360's allowlist, so an invented game key cannot trend either. */
        const { data, error } = await (supabase.rpc as any)('most_played_today', {
          p_min: MIN_COMPLETIONS_TO_QUALIFY,
          p_limit: TOP_N,
        });

        if (error || !data) {
          if (!cancelled) setEntries(buildFallback());
          return;
        }

        const ranked = (data as { game: string; plays: number }[])
          .map(row => {
            const game = gameByPath(`/${row.game}`);
            return game ? { game, count: Number(row.plays), isFallback: false } : null;
          })
          .filter((e): e is MostPlayedEntry => !!e);

        if (!cancelled) {
          setEntries(ranked.length >= TOP_N ? ranked : buildFallback());
        }
      } catch {
        if (!cancelled) setEntries(buildFallback());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return { entries, loading };
}
