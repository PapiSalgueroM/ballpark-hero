import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Star, Medal, Flame, ArrowLeft, UserPlus } from 'lucide-react';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';
import { useDailyLegend } from '@/hooks/useDailyLegend';
import { DailyLegendOverlay } from '@/components/game/DailyLegendOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

/**
 * Game-page top bar.
 *
 * Owner feedback applied:
 * - Logo is bigger and stretched out ("have the DoUKnowBall on the top left
 *   a bit longer and stretched out and maybe a bit bigger") - full wordmark
 *   on mobile too, wide tracking.
 * - Owner 2026-08-05: personal stats are for ACCOUNTS only. Signed-out
 *   players get a "Sign up" chip that opens the auth modal instead of a row
 *   of zeros that looks broken.
 * - Back button stays boxed and visible on the right.
 */
export function GameNavbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const { gamesPlayedToday, totalPointsToday, dailyRank, currentStreak, totalGames, loading } = useGameNavbarStats();
  const { showCelebration, streakDays, dismissCelebration } = useDailyLegend();

  return (
    <>
      <nav className="w-full bg-background/95 border-b border-border/40">
        {/* Round 117: minmax(0,1fr), not 1fr. A grid track sized 1fr still gets
            min-width:auto, so it refuses to shrink below its own content and the
            Back button was pushed 13px off the right edge of a 320px phone on
            every one of the 118 game pages. Same root cause as the guess row
            this round fixes with min-w-0: an implicit min-size nobody asked for. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2">
          {/* Logo, left, bigger + stretched */}
          <Link
            to="/"
            className="shrink-0 justify-self-start font-display font-black text-primary hover:opacity-80 transition-opacity"
          >
            <span className="text-base sm:text-2xl tracking-[0.18em] sm:tracking-[0.22em] uppercase">
              DoUKnowBall
            </span>
          </Link>

          {!user ? (
            /* Guest: one honest chip instead of zeroed stats */
            <button
              onClick={() => setAuthOpen(true)}
              className="justify-self-center inline-flex items-center gap-1.5 rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-gold/50 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
              <span className="hidden sm:inline">Sign up to track your stats</span>
              <span className="sm:hidden">Track stats</span>
            </button>
          ) : (
          /* Stats, center */
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 min-w-0">
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
                    <span className="hidden sm:inline">Rank: </span>-</span>
                )}
              </span>
            </div>
          </div>
          )}

          {/* Back, right, boxed so it can't be missed */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="shrink-0 justify-self-end inline-flex items-center gap-1.5 rounded-lg border-2 border-primary/60 bg-surface-1 px-3 py-1.5 min-h-[36px] text-xs sm:text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </nav>

      {showCelebration && (
        <DailyLegendOverlay streakDays={streakDays} onDismiss={dismissCelebration} />
      )}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab="signup" />
    </>
  );
}
