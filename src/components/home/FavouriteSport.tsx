import { cn } from '@/lib/utils';
import { SPORT_NAME, type SportKey } from '@/data/homeFront';
import { SportGlyph, sportStyle } from './SportGlyph';

/** The chip's words. The world category holds the Olympics and the games that
    mix every sport, so "All sports" would say the wrong thing here. */
const chipName = (sport: SportKey) => (sport === 'world' ? 'World & Olympic' : SPORT_NAME[sport]);

/**
 * Round 717: the favourite sport chips, right above the sport sections.
 *
 * Tap a sport and its section moves to the top of the list below; tap it
 * again to put the list back in its usual order. The pick is remembered in
 * this browser (src/data/homeFront.ts reads and checks it). The chips sit
 * above everything they reorder and the sentence beside them never changes,
 * so a tap moves nothing on screen that the visitor is already looking at.
 */
export function FavouriteSport({ sports, value, onPick }: {
  sports: readonly SportKey[];
  value: SportKey | null;
  onPick: (sport: SportKey | null) => void;
}) {
  return (
    <section aria-labelledby="home-your-sport" data-home-fav-sport="" className="mt-2">
      <h3 id="home-your-sport" className="font-display text-sm font-bold text-foreground">Your sport</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Pick a sport to show its games first. Pick it again to reset.</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {sports.map(sport => {
          const on = value === sport;
          return (
            <li key={sport}>
              <button
                type="button"
                aria-pressed={on}
                data-fav-sport={sport}
                onClick={() => onPick(on ? null : sport)}
                style={sportStyle(sport)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-primary',
                  on
                    ? 'border-tile bg-tile/15 text-foreground'
                    : 'border-border/80 bg-surface-1 text-muted-foreground hover:border-tile/50 hover:text-foreground',
                )}
              >
                <SportGlyph sport={sport} className="h-3.5 w-3.5 text-tile" />
                {chipName(sport)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
