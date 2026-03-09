import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GameNavbarStats {
  gamesPlayedToday: number;
  totalPointsToday: number;
  dailyRank: number | null;
  loading: boolean;
}

const TOTAL_GAMES = 37;

export function useGameNavbarStats(): GameNavbarStats & { totalGames: number } {
  const { user } = useAuth();
  const [stats, setStats] = useState<GameNavbarStats>({
    gamesPlayedToday: 0,
    totalPointsToday: 0,
    dailyRank: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStats({
        gamesPlayedToday: 0,
        totalPointsToday: 0,
        dailyRank: null,
        loading: false,
      });
      return;
    }

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      try {
        // Fetch user's games played and total points today
        const { data: userScores, error: userError } = await supabase
          .from('user_game_scores')
          .select('game_type, score')
          .eq('user_id', user.id)
          .eq('puzzle_date', today);

        if (userError) throw userError;

        // Calculate unique games played and total points
        const uniqueGames = new Set(userScores?.map(s => s.game_type) || []);
        const totalPoints = userScores?.reduce((sum, s) => sum + s.score, 0) || 0;

        // Fetch all users' daily totals to calculate rank
        const { data: allScores, error: allError } = await supabase
          .from('user_game_scores')
          .select('user_id, score')
          .eq('puzzle_date', today);

        if (allError) throw allError;

        // Aggregate scores by user
        const userTotals = new Map<string, number>();
        allScores?.forEach(s => {
          userTotals.set(s.user_id, (userTotals.get(s.user_id) || 0) + s.score);
        });

        // Calculate rank
        const sortedTotals = Array.from(userTotals.entries())
          .sort((a, b) => b[1] - a[1]);
        
        const rank = sortedTotals.findIndex(([uid]) => uid === user.id) + 1;

        setStats({
          gamesPlayedToday: uniqueGames.size,
          totalPointsToday: totalPoints,
          dailyRank: rank > 0 ? rank : null,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to fetch game navbar stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, [user]);

  return { ...stats, totalGames: TOTAL_GAMES };
}
