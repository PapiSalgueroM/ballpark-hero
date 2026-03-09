import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useGameScore() {
  const { user, profile, refreshProfile } = useAuth();

  const saveScore = useCallback(async (
    gameType: string,
    score: number,
    correctAnswers: number = 0
  ) => {
    if (!user) return { saved: false };

    try {
      // Insert game score
      await supabase.from('user_game_scores').insert({
        user_id: user.id,
        game_type: gameType,
        score,
        correct_answers: correctAnswers,
        puzzle_date: new Date().toISOString().split('T')[0],
      });

      // Update or insert best score
      const { data: existingBest } = await supabase
        .from('user_best_scores')
        .select('best_score')
        .eq('user_id', user.id)
        .eq('game_type', gameType)
        .single();

      if (!existingBest) {
        await supabase.from('user_best_scores').insert({
          user_id: user.id,
          game_type: gameType,
          best_score: score,
        });
      } else if (score > existingBest.best_score) {
        await supabase
          .from('user_best_scores')
          .update({ best_score: score, achieved_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('game_type', gameType);
        
        toast.success('🏆 New personal best!');
      }

      // Update streak and stats
      const today = new Date().toISOString().split('T')[0];
      const lastPlayed = profile?.last_played_date;
      
      let newStreak = profile?.current_streak || 0;
      
      if (lastPlayed !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastPlayed === yesterdayStr) {
          // Consecutive day - increment streak
          newStreak += 1;
          
          // Check for milestones
          if (newStreak === 3) toast.success("🔥 You're on fire! 3 day streak!");
          if (newStreak === 7) toast.success("💪 One week strong! 7 day streak!");
          if (newStreak === 30) toast.success("🏆 Legendary status! 30 day streak!");
          if (newStreak === 100) toast.success("🐐 You are the GOAT! 100 day streak!");
        } else if (lastPlayed !== today) {
          // Streak broken
          newStreak = 1;
        }

        await supabase
          .from('profiles')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, profile?.longest_streak || 0),
            last_played_date: today,
            total_games_played: (profile?.total_games_played || 0) + 1,
            total_correct_answers: (profile?.total_correct_answers || 0) + correctAnswers,
          })
          .eq('user_id', user.id);

        await refreshProfile();
      }

      return { saved: true, isNewBest: !existingBest || score > existingBest.best_score };
    } catch (error) {
      console.error('Failed to save score:', error);
      return { saved: false };
    }
  }, [user, profile, refreshProfile]);

  return { saveScore };
}
