import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Rocket } from 'lucide-react';
import { justShipped } from '@/data/homeFront';
import type { GameDef } from '@/data/gameRegistry';

/** How many of the newest games the box shows. */
export const JUST_SHIPPED_COUNT = 4;

/**
 * Round 659: Just shipped. The newest games by the day they shipped, read
 * off the registry's addedOn (never a typed date), plus the way into the
 * changelog, where the month of work that happened inside the games is
 * written up. The owner's complaint was that the site looked the same from
 * one month to the next; this box is the part of the front page that shows
 * what moved.
 *
 * The cards themselves are drawn by the home page, so they are the same game
 * cards as everywhere else on it (with the NEW badge from the same rule).
 */
export function JustShipped({ children }: { children: (games: GameDef[]) => ReactNode }) {
  const games = useMemo(() => justShipped(JUST_SHIPPED_COUNT), []);
  if (games.length === 0) return null;
  return (
    <section aria-labelledby="home-shipped" data-home-shipped="">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="home-shipped" className="flex items-center gap-2.5 text-lg font-display font-bold text-foreground">
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-inset ring-gold/30">
            <Rocket className="h-4 w-4" />
          </span>
          Just shipped
        </h2>
        <Link to="/whats-new" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-primary hover:underline">
          Everything that changed
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      {children(games)}
    </section>
  );
}
