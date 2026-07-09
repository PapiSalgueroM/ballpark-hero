import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Star, Medal, Flame, ArrowLeft } from 'lucide-react';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';
import { useDailyLegend } from '@/hooks/useDailyLegend';
import { DailyLegendOverlay } from '@/components/game/DailyLegendOverlay';

/**
 * Game-page top bar.
 *
 * Owner feedback applied:
 * - Logo is bigger and stretched out ("have the DoUKnowBall on the top left
 *   a bit longer and stretched out and maybe a bit bigger") — full wordmark
 *   on mobile too, wide tracking.
 * - Stats chips now show REAL numbers for everyone, guests included:
 *   useGameNavbarStats reads the same identity game_completions rows are
 *   written under, so points/rank/games-today are never stuck at 0 or "-".
 * - Back button stays boxed and visible on the right.
 */
export function GameNavbar() {
  const navigate = useNavigate();
  const { gamesPlayedToday, totalPointsToday, dailyRank, currentStreak, totalGames, loading } = useGameNavbarStats();
  const { showCelebration, streakDays, dismissCelebration } = useDailyLegend();

  return (
    <>
      <nav className="w-full bg-background/95 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          {/* Logo — left, bigger + stretched */}
          <Link
            to="/"
            className="shrink-0 font-display font-black text-primary hover:opacity-80 transition-opacity"
          >
            <span className="text-base sm:text-2xl tracking-[0.18em] sm:tracking-[0.22em] uppercase">
              DoUKnowBall
            </span>
          </Link>

          {/* Stats — center */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1 min-w-0">
            {/* Games completed today */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" aria-hidden="true" />
              <span className="text-muted-foreground" aria-label="Games completed today">
                {loading ? (
                  <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" />
                ) : (
                  <span>
                    <span className="font-medium text-gold">{gamesPlayedToday}</span>/{totalGames}
                  </span>
                )}
              </span>
            </div>

            {/* Points today */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
              <span className="text-muted-foreground">
                {loading ? (
                  <span className="inline-block w-10 h-4 bg-muted animate-pulse rounded" />
                ) : (
                  <span>
                    <span className="hidden sm:inline">Points: </span>
                    <span className="font-medium text-foreground">{totalPointsToday.toLocaleString()}</span>
                  </span>
                )}
              </span>
            </div>

            {/* Streak */}
            {currentStreak > 0 && (
              <div className="hidden xs:flex sm:flex items-center gap-1 text-xs sm:text-sm">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                <span className="font-medium text-foreground">{currentStreak}</span>
              </div>
            )}

            {/* World rank today */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
              <span className="text-muted-foreground">
                {loading ? (
                  <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" />
                ) : dailyRank ? (
                  <span>
                    <span className="hidden sm:inline">Rank: </span>
                    <span className="font-medium text-foreground">#{dailyRank}</span>
                  </span>
                ) : (
                  <span>
                    <span className="hidden sm:inline">Rank: </span>—
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Back — right, boxed so it can't be missed */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border-2 border-primary/60 bg-surface-1 px-3 py-1.5 min-h-[36px] text-xs sm:text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </nav>

      {showCelebration && (
        <DailyLegendOverlay streakDays={streakDays} onDismiss={dismissCelebration} />
      )}
    </>
  );
}
