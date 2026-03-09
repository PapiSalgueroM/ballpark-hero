import { useAuth } from '@/contexts/AuthContext';
import { Flame, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function StreakReminder() {
  const { user, profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reset dismissed state each day
    const today = new Date().toISOString().split('T')[0];
    const lastDismissed = localStorage.getItem('streak-reminder-dismissed');
    if (lastDismissed !== today) {
      setDismissed(false);
    }
  }, []);

  if (!user || !profile || dismissed) return null;

  // Only show if user has a streak and hasn't played today
  const today = new Date().toISOString().split('T')[0];
  const hasPlayedToday = profile.last_played_date === today;

  if (hasPlayedToday || profile.current_streak === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('streak-reminder-dismissed', today);
  };

  return (
    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <Flame className="w-8 h-8 text-orange-500 animate-pulse" />
        <div>
          <p className="font-medium">
            Don't break your <span className="text-orange-500 font-bold">{profile.current_streak} day</span> streak!
          </p>
          <p className="text-sm text-muted-foreground">
            Play today's daily challenge to keep it going 🔥
          </p>
        </div>
      </div>
    </div>
  );
}
