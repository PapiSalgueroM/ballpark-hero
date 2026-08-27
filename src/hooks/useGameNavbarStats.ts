import { useState, useEffect, useCallback, useRef } from 'react';
import { TOTAL_GAMES } from '@/data/gameRegistry';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPlayerName, getLocalTodayCount } from '@/lib/completions';
import { getGlobalCurrentStreak } from '@/lib/streaks';

interface GameNavbarStats {
  gamesPlayedToday: number;
  totalPointsToday: number;
  dailyRank: number | null;
  currentStreak: number;
  loading: boolean;
}

/**
 * Header stats, rebuilt (owner: "the data on the top of screen never changed.
 * It still says zero points and zero out of 70 games played. And don't say my
 * rank either").
 *
 * Round 301, audit finding 14, comment brought back to the truth: until
 * Round 300 the user_scores / daily_completions tables received no writes
 * from most games, so the handle-keyed game_completions reads below were the
 * only honest source; the server tables are live now and the local engine
 * remains the guest half. Note that GameNavbar only renders these stats for
 * signed in players (guests see a sign-up chip instead), the handle keying
 * just keeps the numbers continuous across the guest to account transition.
 * What each stat reads:
 * - Identity: getCurrentPlayerName(profile), the same handle (guest
 *   "Baller-1234" or profile name) that game_completions rows are written
 *   under.
 * - Points today + world rank: the global_rank RPC (same normalized scoring
 *   as the sitewide leaderboard, each game's best run of the day is worth
 *   up to 100 pts). This is TODAY's board; the profile page's rank badge is
 *   the all-time board, which is why this chip is labeled "Today".
 * - Games played today: distinct games from game_completions for this
 *   handle, floored by the local same-browser distinct-game count so the
 *   chip updates instantly even if the insert is still in flight.
 * - Streak: the local streak engine (the instant same-browser record).
 */
export function useGameNavbarStats(): GameNavbarStats & { totalGames: number } {
  const { profile } = useAuth();
  const playerName = getCurrentPlayerName(profile);
  const [stats, setStats] = useState<GameNavbarStats>({
    gamesPlayedToday: 0,
    totalPointsToday: 0,
    dailyRank: null,
    currentStreak: 0,
    loading: true,
  });
  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const todayUtc = new Date().toISOString().split('T')[0];

      const [rankRes, playedRes] = await Promise.all([
        (supabase.rpc as any)('global_rank', {
          p_player: playerName,
          p_period: 'today',
          p_games: null,
        }),
        (supabase.from as any)('game_completions')
          .select('game')
          .eq('player_name', playerName)
          .eq('completed_on', todayUtc),
      ]);

      const rankRow = Array.isArray(rankRes?.data) ? rankRes.data[0] : rankRes?.data ?? null;
      const totalPointsToday = rankRow ? Number(rankRow.total_points) || 0 : 0;
      const dailyRank = rankRow && Number(rankRow.rank) > 0 ? Number(rankRow.rank) : null;

      const serverGames = playedRes?.data
        ? new Set((playedRes.data as Array<{ game: string }>).map((r) => r.game)).size
        : 0;
      /* Round 301, audit finding 7: both sides of this max now count
         DISTINCT games completed today (getLocalTodayCount returns the size
         of a local slug set since Round 301), so the merge no longer mixes
         a raw completion count against a distinct count and a replay of one
         game cannot inflate the chip. */
      const gamesPlayedToday = Math.max(serverGames, getLocalTodayCount());

      setStats({
        gamesPlayedToday,
        totalPointsToday,
        dailyRank,
        currentStreak: getGlobalCurrentStreak(),
        loading: false,
      });
    } catch (error) {
      console.debug('[NavbarStats] fetch failed:', error);
      // Even offline, show local truths rather than dashes.
      setStats((prev) => ({
        ...prev,
        gamesPlayedToday: Math.max(prev.gamesPlayedToday, getLocalTodayCount()),
        currentStreak: getGlobalCurrentStreak(),
        loading: false,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [playerName]);

  useEffect(() => {
    fetchStats();

    // Refetch when the app comes back to the foreground (mobile) or focus.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleFocus = () => fetchStats();
    window.addEventListener('focus', handleFocus);

    // Instant refresh after a game finishes (small delay for the DB write).
    const handleGameComplete = () => {
      setStats((prev) => ({
        ...prev,
        gamesPlayedToday: Math.max(prev.gamesPlayedToday, getLocalTodayCount()),
        currentStreak: getGlobalCurrentStreak(),
      }));
      setTimeout(fetchStats, 800);
    };
    window.addEventListener('game-completion-saved', handleGameComplete);

    // Light polling fallback.
    const pollInterval = setInterval(fetchStats, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('game-completion-saved', handleGameComplete);
      clearInterval(pollInterval);
    };
  }, [fetchStats]);

  return { ...stats, totalGames: TOTAL_GAMES };
}
