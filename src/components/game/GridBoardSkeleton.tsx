import { cn } from '@/lib/utils';

/* Round 348: the grid boards hold their ground while data loads.
 *
 * Every grid page used to swap a one-line "Loading…" div (about 100px) for a
 * 300 to 650px board when its data landed, shoving the SEO block, the ad and
 * the nav down the page. Measured live at 375px on 2026-08-29 that was a
 * cumulative layout shift of 0.60 on soccer-grid, 0.40 on hockey-grid: a
 * failing Core Web Vital (over 0.25 is poor). This skeleton renders in the
 * loading branch with the SAME container and sizing classes as the real
 * boards, so the page's geometry is settled before the network answers.
 *
 * Two geometries, mirrored class for class:
 *  - 'square': GridBoard and SoccerGridBoard (soccer, football, college):
 *    max-w-lg, grid-cols-4 gap-1.5, aspect-square cells, short header row.
 *  - 'franchise': the NBA, MLB and NHL franchise grids: max-w-2xl,
 *    grid-cols-[80px_repeat(3,1fr)] with min-h rows.
 *
 * withSettings reserves soccer-grid's pre-first-guess settings panel too
 * (measured 214px at 375/390, 198 from sm up; the spacer heights below plus
 * p-4 and the border land on those numbers). A mid-game visitor gets no real
 * panel, so for them the reservation releases on load; that small upward
 * settle is the price of making the common case (a fresh daily visitor) hold
 * still, and it is far smaller than the full-board shove it replaces.
 *
 * data-board-reserve is load-bearing: scripts/playGridCls.mjs zeroes it as
 * its negative control to prove the reservation is what holds the page.
 */
export function GridBoardSkeleton({ variant, withSettings = false }: { variant: 'square' | 'franchise'; withSettings?: boolean }) {
  const cell = 'rounded-lg bg-surface-2 animate-pulse';
  return (
    <div data-board-reserve="">
      {withSettings && (
        <div className="mb-6 max-w-md mx-auto rounded-2xl border border-border bg-surface-1 p-4" aria-hidden="true">
          <div className={cn(cell, 'h-[180px] sm:h-[164px]')} />
        </div>
      )}
      <div className="relative" aria-hidden="true">
        {variant === 'square' ? (
          <div className="w-full max-w-lg mx-auto">
            <div className="grid grid-cols-4 gap-1.5">
              <div />
              {[0, 1, 2].map(i => (
                <div key={`h${i}`} className={cn(cell, 'h-14')} />
              ))}
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className={cn(cell, i % 4 === 0 ? 'h-full' : 'aspect-square')} />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-[80px_repeat(3,1fr)] sm:grid-cols-[110px_repeat(3,1fr)] gap-1.5 sm:gap-2">
              <div />
              {[0, 1, 2].map(i => (
                <div key={`h${i}`} className={cn(cell, 'min-h-[52px] sm:min-h-[64px]')} />
              ))}
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className={cn(cell, 'min-h-[64px] sm:min-h-[80px]')} />
              ))}
            </div>
          </div>
        )}
        <p className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Loading today's puzzle…
        </p>
      </div>
    </div>
  );
}
