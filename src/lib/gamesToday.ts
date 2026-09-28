import { supabase } from '@/integrations/supabase/client';
import { peekCurrentPlayerName } from '@/lib/completions';

/**
 * Round 645: ONE count of games played today, read the same way by the game
 * header (useGameNavbarStats) and the profile's Games Today tile.
 *
 * The owner defined that number as how many games he played that day. Until
 * this round the two surfaces counted it from different tables: the header
 * from game_completions under the player's handle, the profile from
 * daily_completions. They only agreed while every finish went through the
 * one ranked recorder. Round 645 routes a free run (Unlimited, free play, a
 * new season, versus) to recordUnrankedPlay, which writes a play to
 * game_completions and never to daily_completions, so the profile stopped
 * counting a finished Unlimited game while the header still did.
 *
 * Both now read this: the distinct games in game_completions under the
 * player's handle on the row's own day, floored by this browser's local set
 * of today's games (getLocalTodayCount), so the count moves the moment a
 * play lands and cannot go backwards while the insert is in flight. Every
 * finish feeds both halves, ranked or not (src/lib/completions.ts).
 */
export function readTodayRows(playerName: string) {
  const todayUtc = new Date().toISOString().split('T')[0];
  return (supabase.from as any)('game_completions')
    .select('game')
    .eq('player_name', playerName)
    .eq('completed_on', todayUtc);
}

/* The profile is a reader, so it names the player without minting a guest
   handle (Round 539, peekCurrentPlayerName). No name, no rows. */
export function readOwnTodayRows(
  profile: { display_name?: string | null; username?: string | null } | null | undefined,
): Promise<{ data: Array<{ game: string }> | null }> {
  const name = peekCurrentPlayerName(profile);
  return name ? readTodayRows(name) : Promise.resolve({ data: null });
}

export function mergeGamesToday(rows: Array<{ game: string }> | null | undefined, localGames: number): number {
  const serverGames = rows ? new Set(rows.map(r => r.game)).size : 0;
  return Math.max(serverGames, localGames);
}
