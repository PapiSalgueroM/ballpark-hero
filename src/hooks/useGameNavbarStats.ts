import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GameNavbarStats {
  gamesPlayedToday: number;
  totalPointsToday: number;
  dailyRank: number | null;
  currentStreak: number;
  loading: boolean;
}



export function useGameNavbarStats(): GameNavbarStats & { totalGames: number } {
  const { user } = useAuth();
  const [stats, setStats] = useState<GameNavbarStats>({
    gamesPlayedToday: 0,
    totalPointsToday: 0,
    dailyRank: null,
    currentStreak: 0,
    loading: true,
  });
  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!user) {
      console.log('[NavbarStats] No user, resetting stats');
      setStats({ gamesPlayedToday: 0, totalPointsToday: 0, dailyRank: null, currentStreak: 0, loading: false });
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    console.log('[NavbarStats] 🔄 Fetching stats for user:', user.id);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch user's own score from user_scores
      const { data: userScore, error: scoreError } = await supabase
        .from('user_scores')
        .select('total_points, current_streak')
        .eq('user_id', user.id)
        .single();

      if (scoreError && scoreError.code !== 'PGRST116') {
        console.error('[NavbarStats] ❌ Failed to fetch user score:', scoreError);
      }

      // Count distinct games completed today from daily_completions
      const { count: gamesPlayedCount, error: completionsError } = await supabase
        .from('daily_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', today);

      if (completionsError) {
        console.error('[NavbarStats] ❌ Failed to fetch daily completions:', completionsError);
      }

      const totalPoints = userScore?.total_points || 0;
      const gamesPlayed = gamesPlayedCount || 0;
      const streak = (userScore as any)?.current_streak || 0;

      // Fetch all scores for rank calculation
      const { data: allScores } = await supabase
        .from('user_scores')
        .select('user_id, total_points')
        .order('total_points', { ascending: false });

      const rank = allScores
        ? allScores.findIndex(s => s.user_id === user.id) + 1
        : null;

      console.log(`[NavbarStats] ✅ Games: ${gamesPlayed}, Points: ${totalPoints}, Rank: ${rank}, Streak: ${streak}`);

      setStats({
        gamesPlayedToday: gamesPlayed,
        totalPointsToday: totalPoints,
        dailyRank: rank && rank > 0 ? rank : null,
        currentStreak: streak,
        loading: false,
      });
    } catch (error) {
      console.error('[NavbarStats] ❌ Failed to fetch game navbar stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    } finally {
      fetchingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    fetchStats();

    if (!user) return;

    // Subscribe to realtime changes on user_scores
    const channel = supabase
      .channel('user_scores_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_scores',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[NavbarStats] 📡 Realtime update received');
          fetchStats();
        }
      )
      .subscribe();

    // Refetch when app comes back to foreground (critical for mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[NavbarStats] 👁️ Visibility change: visible — refetching');
        fetchStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refetch on window focus (covers tab switching on desktop too)
    const handleFocus = () => {
      fetchStats();
    };
    window.addEventListener('focus', handleFocus);

    // Listen for custom game-completion events from useGameCompletion
    const handleGameComplete = () => {
      console.log('[NavbarStats] 🎯 game-completion-saved event received — refetching in 500ms');
      // Small delay to let DB writes complete
      setTimeout(fetchStats, 500);
    };
    window.addEventListener('game-completion-saved', handleGameComplete);

    // Periodic polling fallback every 30s (realtime can drop on mobile)
    const pollInterval = setInterval(fetchStats, 30_000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('game-completion-saved', handleGameComplete);
      clearInterval(pollInterval);
    };
  }, [user, fetchStats]);

  return { ...stats, totalGames: TOTAL_GAMES };
}