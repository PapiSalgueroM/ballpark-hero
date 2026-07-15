import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TOTAL_GAMES } from '@/data/gameRegistry';

export function useDailyLegend() {
  const { user } = useAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  const [streakDays, setStreakDays] = useState(1);
  const [alreadyAwarded, setAlreadyAwarded] = useState(false);

  const checkAndAward = useCallback(async () => {
    if (!user || alreadyAwarded) return;

    const today = new Date().toISOString().split('T')[0];

    // Check if already awarded today
    const { data: existing } = await supabase
      .from('daily_badges')
      .select('id, streak_days')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      setAlreadyAwarded(true);
      return;
    }

    // Check if user completed every live game today
    const { data: completions } = await supabase
      .from('daily_completions')
      .select('game_slug')
      .eq('user_id', user.id)
      .eq('date', today);

    const uniqueGames = new Set(completions?.map(c => c.game_slug) || []);
    if (uniqueGames.size < TOTAL_GAMES) return;

    // Calculate streak: check consecutive past days
    const { data: badges } = await supabase
      .from('daily_badges')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(400);

    let streak = 1;
    if (badges && badges.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (badges[0].date === yesterdayStr) {
        // Count consecutive days backwards
        streak = 2;
        for (let i = 1; i < badges.length; i++) {
          const expected = new Date();
          expected.setDate(expected.getDate() - (i + 1));
          const expectedStr = expected.toISOString().split('T')[0];
          if (badges[i].date === expectedStr) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Insert badge
    await supabase.from('daily_badges').insert({
      user_id: user.id,
      date: today,
      streak_days: streak,
    });

    setStreakDays(streak);
    setAlreadyAwarded(true);
    setShowCelebration(true);
  }, [user, alreadyAwarded]);

  // Listen for new completions via realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('daily-legend-check')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_completions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkAndAward();
        }
      )
      .subscribe();

    // Also check on mount
    checkAndAward();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkAndAward]);

  return {
    showCelebration,
    streakDays,
    dismissCelebration: () => setShowCelebration(false),
  };
}
