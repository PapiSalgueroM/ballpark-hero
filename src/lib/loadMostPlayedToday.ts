import { supabase } from '@/integrations/supabase/client';
import { gameForCompletionSlug } from '@/data/completionSlugs';
import type { MostPlayedEntry } from '@/hooks/useMostPlayed';

export async function loadMostPlayedToday(query: { p_min: number; p_limit: number }): Promise<MostPlayedEntry[] | null> {
  const { data, error } = await (supabase.rpc as any)('most_played_today', query);

  if (error || !data) return null;

  const ranked = (data as { game: string; plays: number }[])
    .map(row => {
      /* ROUND 376: RESOLVED, NOT CONCATENATED. This used to build a path
         by putting a slash in front of the recorded slug, which is right
         for most games and wrong for six of them: the Conquest boards
         record as `<sport>-imperialism`, and the Quiz Board still records
         under the route name it carried before Round 305 renamed it.
         Those returned undefined here and were filtered
         out below, so a genuinely trending game vanished from the
         section, and if that took the list under TOP_N the whole thing
         fell back to the curated trio while looking perfectly normal.
         That is the same silent-fallback failure Round 361 fixed, by a
         different door. */
      const game = gameForCompletionSlug(row.game);
      return game ? { game, count: Number(row.plays), isFallback: false } : null;
    })
    .filter((e): e is MostPlayedEntry => !!e);

  return ranked;
}
