import { Flame, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getStreakState, getEtDateString } from '@/lib/streaks';

/**
 * "Don't break your streak" nudge on the home page.
 *
 * Previously this read from useAuth().profile, but the `profiles` table does
 * not exist in the live project (see src/lib/streaks.ts), so `profile` was
 * always null and the component ALWAYS returned null - the reminder never
 * showed for anyone. It now reads the local-first streak engine, so it works
 * for every visitor (logged in or not): it appears only when there is a live
 * streak (kept yesterday) that today's play would extend.
 */
export function StreakReminder() {
  const [dismissed, setDismissed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [playedToday, setPlayedToday] = useState(true);

  useEffect(() => {
    const today = getEtDateString();
    const state = getStreakState();
    setStreak(state.global.current);
    setPlayedToday(state.global.lastDate === today);
    setDismissed(localStorage.getItem('streak-reminder-dismissed') === today);
  }, []);

  // Only nudge when there is a streak still alive (kept through yesterday) that
  // the player has not yet extended today. getStreakState() already zeroes out
  // a streak whose last day is older than yesterday, so streak > 0 means "alive".
  if (dismissed || streak <= 0 || playedToday) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('streak-reminder-dismissed', getEtDateString());
  };

  return (
    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss streak reminder"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <Flame className="w-8 h-8 text-orange-500 animate-pulse" />
        <div>
          <p className="font-medium">
            Don't break your <span className="text-orange-500 font-bold">{streak} day</span> streak!
          </p>
          <p className="text-sm text-muted-foreground">
            Play any daily game today to keep it going 🔥
          </p>
        </div>
      </div>
    </div>
  );
}
