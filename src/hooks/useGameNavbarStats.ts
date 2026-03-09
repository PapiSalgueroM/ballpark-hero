import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GameNavbarStats {
  gamesPlayedToday: number;
  totalPointsToday: number;
  dailyRank: number | null;
  currentStreak: number;
  loading: boolean;
}

const TOTAL_GAMES = 37;

export function useGameNavbarStats(): GameNavbarStats & { totalGames: number } {
  const { user } = useAuth();
  const [stats, setStats] = useState<GameNavbarStats>({
    gamesPlayedToday: 0,
    totalPointsToday: 0,
    dailyRank: null,
    currentStreak: 0,
    loading: true,
  });

  const fetchStats = async () => {
    if (!user) {
      setStats({ gamesPlayedToday: 0, totalPointsToday: 0, dailyRank: null, currentStreak: 0, loading: false });
      return;
    }

    try {
      // Fetch user's own score from user_scores
      const { data: userScore } = await supabase
        .from('user_scores')
        .select('total_points, games_played_today')
        .eq('user_id', user.id)
        .single();

      const totalPoints = userScore?.total_points || 0;
      const gamesPlayed = userScore?.games_played_today || 0;

      // Fetch all scores for rank calculation
      const { data: allScores } = await supabase
        .from('user_scores')
        .select('user_id, total_points')
        .order('total_points', { ascending: false });

      const rank = allScores
        ? allScores.findIndex(s => s.user_id === user.id) + 1
        : null;

      setStats({
        gamesPlayedToday: gamesPlayed,
        totalPointsToday: totalPoints,
        dailyRank: rank && rank > 0 ? rank : null,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch game navbar stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

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
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { ...stats, totalGames: TOTAL_GAMES };
}
