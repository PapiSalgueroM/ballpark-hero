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
 * groups by game client-side (the table is expected to be small enough per
 * day that this is cheap; a server-side count(*)... group by would need a
 * view or RPC, which is out of scope for this pass), and returns the top 3
 * games with at least MIN_COMPLETIONS_TO_QUALIFY completions.
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
        const today = new Date().toISOString().slice(0, 10);

        // game_completions isn't in the generated Supabase types (added via
        // direct SQL), so it's addressed dynamically like the insert side in
        // src/lib/completions.ts.
        const { data, error } = await (supabase.from as any)('game_completions')
          .select('game')
          .eq('completed_on', today);

        if (error || !data) {
          if (!cancelled) setEntries(buildFallback());
          return;
        }

        const counts = new Map<string, number>();
        for (const row of data as { game: string }[]) {
          counts.set(row.game, (counts.get(row.game) || 0) + 1);
        }

        const ranked = [...counts.entries()]
          .filter(([, count]) => count >= MIN_COMPLETIONS_TO_QUALIFY)
          .sort((a, b) => b[1] - a[1])
          .slice(0, TOP_N)
          .map(([slug, count]) => {
            const game = gameByPath(`/${slug}`);
            return game ? { game, count, isFallback: false } : null;
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
