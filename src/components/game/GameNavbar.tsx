import { Link } from 'react-router-dom';
import { Trophy, Gamepad2, Medal, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';
import { useDailyLegend } from '@/hooks/useDailyLegend';
import { DailyLegendOverlay } from '@/components/game/DailyLegendOverlay';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

export function GameNavbar() {
  const { user, profile, loading: authLoading } = useAuth();
  const { gamesPlayedToday, totalPointsToday, dailyRank, currentStreak, totalGames, loading: statsLoading } = useGameNavbarStats();
  const { showCelebration, streakDays, dismissCelebration } = useDailyLegend();
  const [authModal, setAuthModal] = useState(false);

  const getUserInitial = () => {
    if (profile?.display_name) {
      return profile.display_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const isLoading = authLoading || statsLoading;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
        <div className="container max-w-4xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Profile Icon / Sign In */}
            <div className="flex-shrink-0">
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              ) : user ? (
                <Link
                  to="/profile"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span className="font-semibold text-xs">{getUserInitial()}</span>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs sm:text-sm"
                  onClick={() => setAuthModal(true)}
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
              {/* Games Played Today */}
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {isLoading ? (
                    <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" />
                  ) : user ? (
                    <span>
                      <span className="font-medium text-foreground">{gamesPlayedToday}</span>
                      <span className="hidden xs:inline">/{totalGames}</span>
                      <span className="xs:hidden">/{totalGames}</span>
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
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={authModal}
        onClose={() => setAuthModal(false)}
        defaultTab="login"
      />

      {showCelebration && (
        <DailyLegendOverlay streakDays={streakDays} onDismiss={dismissCelebration} />
      )}
    </>
  );
}
