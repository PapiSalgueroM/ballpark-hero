import { Link } from 'react-router-dom';
import { Trophy, Gamepad2, Medal, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';
import { useDailyLegend } from '@/hooks/useDailyLegend';
import { DailyLegendOverlay } from '@/components/game/DailyLegendOverlay';

export function GameNavbar() {
  const { user, loading: authLoading } = useAuth();
  const { gamesPlayedToday, totalPointsToday, dailyRank, currentStreak, totalGames, loading: statsLoading } = useGameNavbarStats();
  const { showCelebration, streakDays, dismissCelebration } = useDailyLegend();

  const isLoading = authLoading || statsLoading;

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
            {/* Games Played Today */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" />
                ) : user ? (
                  <span>
                    <span className="font-medium text-foreground">{gamesPlayedToday}</span>
                    /{totalGames}
                  </span>
                ) : (
                  <span>-/{totalGames}</span>
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

          {/* Empty — right (balance the logo) */}
          <div className="shrink-0 w-[4.5rem] sm:w-[6.5rem]" />
        </div>

      {showCelebration && (
        <DailyLegendOverlay streakDays={streakDays} onDismiss={dismissCelebration} />
      )}
    </>
  );
}
