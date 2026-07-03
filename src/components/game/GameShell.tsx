import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';

interface GameShellProps {
  /** Two width variants only: narrow (max-w-2xl) for 1-2 column comparison/card games,
   *  wide (max-w-4xl) for search+board games. */
  width: 'narrow' | 'wide';
  /** Game title shown as the page's <h1>. Omit to render no heading block at all. */
  title?: string;
  /** Optional emoji shown above the title. */
  emoji?: string;
  /** One-line goal statement rendered under the title (spec 3.2's goal line). */
  subtitle?: string;
  /** Extra content rendered inside the header block, below the subtitle
   *  (e.g. mode toggles, difficulty pills, a How-to-Play trigger). */
  headerExtra?: ReactNode;
  /** Page content. */
  children: ReactNode;
  /** Optional className applied to the inner content container. */
  className?: string;
}

/**
 * Shared page shell for every game: GameNavbar + a width-constrained content
 * container + Footer. Replaces the copy-pasted
 * <main className="min-h-screen bg-background"><GameNavbar />...<Footer /></main>
 * boilerplate per R5 spec 3.1.
 */
export function GameShell({ width, title, emoji, subtitle, headerExtra, children, className }: GameShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <div
        className={cn(
          'mx-auto px-4 py-6 md:py-10',
          width === 'wide' ? 'max-w-4xl' : 'max-w-2xl',
          className,
        )}
      >
        {title && (
          <header className="text-center mb-6 md:mb-8">
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-[0.15em] uppercase text-primary mb-2">
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
        <Footer />
      </div>
    </main>
  );
}

export default GameShell;
