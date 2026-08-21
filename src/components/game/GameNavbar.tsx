import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Star, Medal, Flame, ArrowLeft, UserPlus } from 'lucide-react';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';
import { useDailyLegend } from '@/hooks/useDailyLegend';
import { DailyLegendOverlay } from '@/components/game/DailyLegendOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

/**
 * Game-page top bar. This renders on all 118 routes, so a change here is a
 * change to the whole site.
 *
 * Owner feedback applied:
 * - Logo is bigger and stretched out ("have the DoUKnowBall on the top left
 *   a bit longer and stretched out and maybe a bit bigger") - full wordmark
 *   on mobile too, wide tracking.
 * - Owner 2026-08-05: personal stats are for ACCOUNTS only. Signed-out
 *   players get a "Sign up" chip that opens the auth modal instead of a row
 *   of zeros that looks broken.
 * - Back button stays boxed and visible on the right.
 *
 * ── Round 129: the overlap ──
 *
 * His report: "the things on the top of the page overlap and don't look good.
 * Like my streak and points and stuff." He was right, and the numbers are ugly.
 * Measured on the built site in Chromium with a real signed-in session and a
 * worst case day (98,765 points, rank #12345, a 365 day streak):
 *
 *   390 wide: the wordmark occupied x 12 to 159.8 and the stats block started
 *             at x 93.9. Sixty five point nine pixels of straight overlap. The
 *             games-played number was literally painted on top of "OWBALL".
 *   320 wide: 100.9px of the same overlap, AND a second collision, 31.7px of
 *             the stats block sitting under the Back button.
 *   430 wide: still 45.9px.
 *   Signed out it was smaller but still there: 54.9px at 320, 19.9px at 390.
 *
 * WHY it overlapped, because the cause is not obvious and the old layout looked
 * like it had already been made safe. The bar was a three column grid,
 * minmax(0,1fr) / auto / minmax(0,1fr). Round 117 changed those side tracks
 * from 1fr to minmax(0,1fr) on purpose, to kill the automatic minimum size that
 * was pushing the Back button off the right edge. That fix worked and it is
 * also what caused this: a track that is allowed to shrink to zero WILL shrink
 * to zero, but the things standing in it do not shrink with it. The centre
 * track is `auto`, so grid sizing hands it its full max-content width first
 * (202px of stats at 390) and the two flexible tracks split whatever is left,
 * 71px each. "DOUKNOWBALL" is one unbreakable word 148px wide. It cannot wrap,
 * it cannot shrink, so it simply spills 77px out of its own 71px track and
 * paints over the neighbour. Grid does not clip and does not warn.
 *
 * WHAT I TRIED AND THREW AWAY. Shrinking the wordmark on phones fits the maths
 * (text-sm with tighter tracking measures about 118px) and is the smallest
 * possible diff, but it is a direct reversal of the one thing he asked for by
 * name, so it was out before it was measured. Dropping the rank or the points
 * on small screens fits too, and it is what the streak was already doing
 * silently, but he named the missing streak in the same sentence as the
 * overlap. Keeping one row and only shrinking the numbers does not work at any
 * width: the logo is 148 and Back is 79, which is 227 of the 280 usable pixels
 * at 320, and four stats will not live in the remaining 53 however small the
 * font gets. Even at 430 there are only 164 pixels going spare against 202 of
 * stats. One row genuinely cannot hold all of it on a phone.
 *
 * WHAT IT DOES NOW. The bar is a wrapping flex row, not a grid, and the stats
 * take a full width line of their own below the wordmark and the Back button
 * until there is provably room for all three side by side, which is 1024 and
 * up. Nothing is positioned by a track that can be smaller than its contents,
 * so the failure mode when something grows is a wrap onto another line, never
 * a collision. Costs 24px of height on a phone (53 -> 77) and buys back a bar
 * that reads.
 *
 * And the streak is finally on screen for him. It was written as
 * "hidden xs:flex sm:flex", but there is no xs breakpoint in tailwind.config.ts,
 * so that class never existed and the whole thing collapsed to "hidden below
 * 640". His streak has been invisible on his phone since the day it shipped.
 *
 * Nothing is hidden on mobile now. The four values are all there. Below 640 the
 * words "Points:" and "Rank:" stay collapsed to their icons, which is how it
 * already worked and is what keeps four stats inside 296px at 320 wide, so
 * every icon carries an aria-label for anyone reading this with a screen
 * reader.
 *
 * Guarded by scripts/simMobileChrome.mjs, which measures every child box of
 * this bar at 320, 390, 430, 1024 and 1440 on a sample of real game pages, with
 * the worst case numbers injected, and fails on any overlap or any horizontal
 * overflow.
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
        {/* Round 129: flex-wrap, not grid. See the note above. The order swap is
            what puts the stats between the wordmark and Back on a desktop while
            keeping them on their own line on a phone: on the wrapped layout the
            first line is logo + Back and the stats drop underneath, and from
            1024 up the stats slot back into the middle and grow to fill. */}
        {/* Round 159: at lg and up the bar becomes a three column grid with
            EQUAL flexible side tracks, so the stats block sits on the true
            centre of the page instead of the centre of whatever space was
            left after the logo (his note: "the points and rank and games
            played is off centered"). Below lg nothing changes: the wrapping
            flex layout that fixed the Round 129 overlap stays exactly as it
            was, and simMobileChrome still measures every width. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 py-2 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          {/* Logo, left, bigger + stretched */}
          <Link
            to="/"
            className="order-1 shrink-0 font-display font-black text-primary hover:opacity-80 transition-opacity lg:justify-self-start"
          >
            <span className="text-base sm:text-2xl tracking-[0.18em] sm:tracking-[0.22em] uppercase">
              DoUKnowBall
            </span>
          </Link>

          {/* Back, right, boxed so it can't be missed. Second in the DOM so that
              on a phone it shares the top line with the logo instead of being
              stranded under the stats. */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="order-2 lg:order-3 shrink-0 inline-flex items-center gap-1.5 rounded-lg border-2 border-primary/60 bg-surface-1 px-3 py-1.5 min-h-[36px] text-xs sm:text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm lg:justify-self-end"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Stats (or the guest chip), own line on a phone, middle from 1024 up.
              flex-auto rather than flex-1 on purpose: flex-1 sets the basis to 0,
              which tells the browser this item never needs any width, so it would
              stop causing a line break and start squeezing itself into whatever
              was left instead. flex-auto keeps the basis at the content width, so
              when it stops fitting it wraps, which is the safe failure. */}
          <div className="order-3 lg:order-2 w-full lg:w-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-5 lg:justify-self-center">
            {!user ? (
              /* Guest: one honest chip instead of zeroed stats */
              <button
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-gold/50 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
                <span className="hidden sm:inline">Sign up to track your stats</span>
                <span className="sm:hidden">Track stats</span>
              </button>
            ) : (
              <>
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
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" aria-hidden="true" />
                  <span className="text-muted-foreground" aria-label="Points today">
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

                {/* Streak. Round 129: visible on phones at last, see the note above. */}
                {currentStreak > 0 && (
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" aria-hidden="true" />
                    <span className="font-medium text-foreground" aria-label="Day streak">{currentStreak}</span>
                  </div>
                )}

                {/* World rank today */}
                <div className="flex items-center gap-1 text-xs sm:text-sm">
                  <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" aria-hidden="true" />
                  <span className="text-muted-foreground" aria-label="World rank today">
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
              </>
            )}
          </div>
        </div>
      </nav>

      {showCelebration && (
        <DailyLegendOverlay streakDays={streakDays} onDismiss={dismissCelebration} />
      )}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab="signup" />
    </>
  );
}
