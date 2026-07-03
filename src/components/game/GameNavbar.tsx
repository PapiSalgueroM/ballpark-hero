import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Star, Medal, Flame, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';
import { useDailyLegend } from '@/hooks/useDailyLegend';
import { DailyLegendOverlay } from '@/components/game/DailyLegendOverlay';
import { getLocalTodayCount } from '@/lib/completions';

export function GameNavbar() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { gamesPlayedToday, totalPointsToday, dailyRank, currentStreak, totalGames, loading: statsLoading } = useGameNavbarStats();
  const { showCelebration, streakDays, dismissCelebration } = useDailyLegend();

  const isLoading = authLoading || statsLoading;

  // Wave 3 / item #16: cross-game daily score chip. Upgrades the old plain
  // "-/64" progress slot into a gold-token chip per the R5 header spec (3.8),
  // sitting directly beside the existing "Points Today" slot so together
  // they read as one daily-score story (completed count + points) without
  // duplicating the same number twice in one row.
  //
  // Completed count: signed-in players get the real distinct-games count
  // from useGameNavbarStats (gamesPlayedToday, sourced from daily_completions).
  // Signed-out players get the local, same-browser count that
  // src/lib/completions.ts increments every time useGameCompletion fires an
  // anonymous insert into game_completions, since there is no per-visitor
  // identity to query server-side for them. This is a real behavior change
  // from before: logged-out players now see their own daily progress instead
  // of a static "-".
  const [localCompletedToday, setLocalCompletedToday] = useState(0);
  useEffect(() => {
    setLocalCompletedToday(getLocalTodayCount());
    const onCompletion = () => setLocalCompletedToday(getLocalTodayCount());
    window.addEventListener('game-completion-saved', onCompletion);
    return () => window.removeEventListener('game-completion-saved', onCompletion);
  }, []);

  const dailyCompletedCount = user ? gamesPlayedToday : localCompletedToday;

  return (
    <>
      <nav className="w-full bg-background/95 border-b border-border/40">
        <div className="flex items-center justify-between">
          {/* Logo — left */}
          <Link to="/" className="shrink-0 font-display font-bold text-primary hover:opacity-80 transition-opacity">
            <span className="hidden sm:inline text-sm">DoUKnowBall</span>
            <span className="sm:hidden text-sm">🏠</span>
          </Link>

          {/* Stats — center */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1">
            {/* Daily Score chip — today's completed-game count, gold token */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" aria-hidden="true" />
              <span className="text-muted-foreground" aria-label="Games completed today">
                {isLoading ? (
                  <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" />
                ) : (
                  <span>
                    <span className="font-medium text-gold">{dailyCompletedCount}</span>/{totalGames}
                  </span>
                )}
              </span>
            </div>

            {/* Points Today */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
              <span className="text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block w-10 h-4 bg-muted animate-pulse rounded" />
                ) : user ? (
                  <span>
                    <span className="hidden sm:inline">Points: </span>
                    <span className="font-medium text-foreground">{totalPointsToday.toLocaleString()}</span>
                  </span>
                ) : (
                  <span>
                    <span className="hidden sm:inline">Points: </span>-
                  </span>
                )}
              </span>
            </div>

            {/* Streak */}
            {user && currentStreak > 0 && (
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                <span className="font-medium text-foreground">{currentStreak}</span>
              </div>
            )}

            {/* Daily Rank */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
              <span className="text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" />
                ) : user && dailyRank ? (
                  <span>
                    <span className="hidden sm:inline">Rank: </span>
                    <span className="font-medium text-foreground">#{dailyRank}</span>
                  </span>
                ) : (
                  <span>
                    <span className="hidden sm:inline">Rank: </span>#-
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Back to previous page — right */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="shrink-0 inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      </nav>

      {showCelebration && (
        <DailyLegendOverlay streakDays={streakDays} onDismiss={dismissCelebration} />
      )}
    </>
  );
}
