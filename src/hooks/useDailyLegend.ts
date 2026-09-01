import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_GAMES } from '@/data/gameRegistry';
import { completionSlugForPath } from '@/data/completionSlugs';

/**
 * ROUND 377: THE BADGE IS FOR FINISHING THE DAY'S DAILY GAMES, WHICH IS WHAT
 * ITS NAME HAS ALWAYS SAID AND NOT WHAT IT USED TO CHECK.
 *
 * It awarded on reaching TOTAL_GAMES, which is ALL_GAMES.length: every game on
 * the site, 118 of them, including Club Manager seasons, four Front Office
 * career sims and four Conquest map campaigns. Nobody finishes that in a day.
 * daily_badges has zero rows and always has. Worse, counting ALL_GAMES meant
 * the bar ROSE with every game shipped, so it was not merely out of reach, it
 * was moving away.
 * Measured for the record before changing it: the most any signed in player has
 * ever completed in one day is 25 distinct games, on 2026-07-27.
 *
 * THE TARGET AND THE COPY NOW COME FROM THE SAME PLACE. The overlay used to
 * congratulate people with a hardcoded "all 37 games", true a long time ago and
 * shown to every winner and every reader of their shared post. A number written
 * in prose next to a rule computed elsewhere is a promise nobody keeps.
 */
export const LEGEND_GAMES = ALL_GAMES.filter(g => g.daily);
export const LEGEND_TARGET = LEGEND_GAMES.length;

/* Recorded completion slugs are not always registry paths: the Conquest boards
   and the Quiz Board record under other names (see src/data/completionSlugs.ts,
   Round 376). Comparing raw paths here would mean five daily games could never
   count toward the badge, which on its own would keep it unwinnable. */
const LEGEND_SLUGS = new Set(LEGEND_GAMES.map(g => completionSlugForPath(g.path)));

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

    /* Counted against the daily set only, and intersected rather than sized, so
       finishing a pile of non daily games can never stand in for the dailies
       the badge is actually about. */
    const done = new Set(completions?.map(c => c.game_slug) || []);
    const dailiesDone = [...LEGEND_SLUGS].filter(s => done.has(s)).length;
    if (dailiesDone < LEGEND_TARGET) return;

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
