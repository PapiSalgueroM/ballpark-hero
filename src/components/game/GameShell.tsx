import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';

interface GameShellProps {
  /** Two width variants only: narrow (max-w-2xl) for 1-2 column comparison/card games,
   *  wide (max-w-4xl) for search+board games. */
  width: 'narrow' | 'wide';
  /** Game title shown as the page's <h1>. Omit to render no heading block at all. */
  title?: string;
  /** Optional emoji shown above the title. */
  emoji?: string;
  /** One-line goal statement rendered under the title (spec 3.2's goal line). */
  subtitle?: ReactNode;
  /** Extra content rendered inside the header block, below the subtitle
   *  (e.g. mode toggles, difficulty pills, a How-to-Play trigger). */
  headerExtra?: ReactNode;
  /** Page content. */
  children: ReactNode;
  /** Optional className applied to the inner content container. */
  className?: string;
  /** Round 321: 'auto' (default) mounts the standard GameHelp "?" fed by
   *  the route's own guide content. Pages that already render their own
   *  rules control (RulesGate, a hand built popover) pass 'none' so no
   *  page ever shows two question marks. */
  help?: 'auto' | 'none';
}

/**
 * Shared page shell for every game: GameNavbar + a width-constrained content
 * container + Footer. Replaces the copy-pasted
 * <main id="dukb-main" className="min-h-screen bg-background"><GameNavbar />...<Footer /></main>
 * boilerplate per R5 spec 3.1.
 */
export function GameShell({ width, title, emoji, subtitle, headerExtra, children, className, help = 'auto' }: GameShellProps) {
  return (
    /* Round 306: the id the skip link points at. The doc comment above always
       promised it; the JSX never had it, so on 69 game pages the site's one
       keyboard affordance focused nothing. tabIndex -1 so the jump moves real
       focus, not just the scroll. */
    <main id="dukb-main" tabIndex={-1} className="min-h-screen bg-background">
      <GameNavbar />
      <div
        className={cn(
          /* Round 288: relative, so RulesGate's floating "?" (absolute top-0
             right-0) lands at the top right of this column beside the game's
             title, instead of resolving to the page corner on top of the
             navbar's Back button, which is where it had been sitting on every
             game drawn through this shell (measured at 390 wide: the "?" at x
             354 to 390, the Back button underneath it). */
          'relative mx-auto px-4 py-6 md:py-10',
          width === 'wide' ? 'max-w-4xl' : 'max-w-2xl',
          className,
        )}
      >
        {/* Round 321: the standard reopenable "?" on every game drawn
            through this shell, unless the page carries its own. Sits in the
            relative container's top left; RulesGate historically takes the
            top right. */}
        {help === 'auto' && <GameHelp />}
        {title && (
          <header className="text-center mb-6 md:mb-8">
            {/* Round 263: this heading made six game pages scroll sideways on a
                320px phone. "CONNECTIONS" is one unbreakable eleven letter word,
                and at text-4xl with 0.15em of letter spacing it measured 352px
                against a 256px container, pushing the whole document 64px wider
                than the screen. Every game on the site draws its title through
                this one component, so the bug was shared and only showed up on
                the longest titles. The size and the spacing now step up rather
                than starting at their largest, and break-words lets a title made
                of several words wrap instead of shoving. Measured after the
                change at 320, 390 and 1440. */}
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold tracking-[0.1em] sm:tracking-[0.15em] uppercase text-primary mb-2 break-words">
              {emoji && <span className="mr-2">{emoji}</span>}
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
                {subtitle}
              </p>
            )}
            {headerExtra}
          </header>
        )}
        {children}
        {/* Round 313: no Footer here. App.tsx renders the one global footer
            on every route (the Round 49 rule); this shell adding its own put
            two stacked footers on every game page, which the owner
            screenshotted. simSingleFooter enforces the rule now. */}
      </div>
    </main>
  );
}

export default GameShell;
