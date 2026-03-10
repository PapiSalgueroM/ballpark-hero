import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Automatically saves game completion data to user_scores, user_game_scores,
 * user_best_scores, daily_completions, and profiles when a game finishes.
 *
 * Call this hook in every game hook/board with the game slug, completion status, and score.
 */
export function useGameCompletion(
  gameSlug: string,
  isComplete: boolean,
  score: number,
  correctAnswers: number = 0
) {
  const { user, profile, refreshProfile } = useAuth();
  const savedRef = useRef(false);

  // Reset saved flag when game resets (isComplete goes back to false)
  useEffect(() => {
    if (!isComplete) {
      savedRef.current = false;
    }
  }, [isComplete]);

  useEffect(() => {
    if (!isComplete || !user || savedRef.current) return;
    savedRef.current = true;

    const save = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Insert game score
        await supabase.from('user_game_scores').insert({
          user_id: user.id,
          game_type: gameSlug,
          score,
          correct_answers: correctAnswers,
          puzzle_date: today,
        });

        // 2. Insert daily completion (unique constraint prevents duplicates)
        await supabase.from('daily_completions').insert({
          user_id: user.id,
          game_slug: gameSlug,
          date: today,
        });

        // 3. Upsert user_scores for navbar
        const { data: existing } = await supabase
          .from('user_scores')
          .select('total_points, games_played_today, last_played_at, current_streak, longest_streak')
          .eq('user_id', user.id)
          .single();

        const lastDate = existing?.last_played_at
          ? new Date(existing.last_played_at).toISOString().split('T')[0]
          : null;
        const isSameDay = lastDate === today;

        if (!existing) {
          await supabase.from('user_scores').insert({
            user_id: user.id,
            total_points: score,
            games_played_today: 1,
            last_played_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            current_streak: 1,
            longest_streak: 1,
          });
        } else {
          let newStreak = existing.current_streak || 0;
          if (!isSameDay) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            newStreak = lastDate === yesterdayStr ? newStreak + 1 : 1;
          }
          const newLongest = Math.max(newStreak, existing.longest_streak || 0);

          await supabase
            .from('user_scores')
            .update({
              total_points: existing.total_points + score,
              games_played_today: isSameDay ? existing.games_played_today + 1 : 1,
              last_played_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              current_streak: newStreak,
              longest_streak: newLongest,
            })
            .eq('user_id', user.id);
        }

        // 4. Update best score
        const { data: existingBest } = await supabase
          .from('user_best_scores')
          .select('best_score')
          .eq('user_id', user.id)
          .eq('game_type', gameSlug)
          .single();

        if (!existingBest) {
          await supabase.from('user_best_scores').insert({
            user_id: user.id,
            game_type: gameSlug,
            best_score: score,
          });
        } else if (score > existingBest.best_score) {
          await supabase
            .from('user_best_scores')
            .update({ best_score: score, achieved_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('game_type', gameSlug);
        }

        // 5. Update profile stats
        const lastPlayed = profile?.last_played_date;
        let newStreak = profile?.current_streak || 0;
        if (lastPlayed !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          newStreak = lastPlayed === yesterdayStr ? newStreak + 1 : 1;

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

          refreshProfile();
        }

        // Dispatch custom event so navbar stats refresh immediately
        window.dispatchEvent(new Event('game-completion-saved'));
      } catch (error) {
        console.error('Failed to save game completion:', error);
      }
    };

    save();
  }, [isComplete, user, gameSlug, score, correctAnswers, profile, refreshProfile]);
}
