import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPORT_NAME, type SportKey } from '@/data/homeFront';
import { SportGlyph, sportStyle } from './SportGlyph';

/** The chip's words. The world category holds the Olympics and the games that
    mix every sport, so "All sports" would say the wrong thing here. */
const chipName = (sport: SportKey) => (sport === 'world' ? 'World & Olympic' : SPORT_NAME[sport]);

/**
 * Open a sport directly or use its star to change the saved catalogue order.
 * The index sits above the sections it reorders, so toggling a star keeps the
 * control in place.
 */
export function FavouriteSport({ sports, value, onPick }: {
  sports: readonly SportKey[];
  value: SportKey | null;
  onPick: (sport: SportKey | null) => void;
}) {
  return (
    <nav aria-labelledby="browse-sports-heading" data-home-fav-sport="" className="mt-2">
      <p className="text-xs text-muted-foreground">Jump to a sport or star one to show it first.</p>
      <ul className="mt-2 grid grid-cols-2 gap-x-2 min-[480px]:gap-x-4 sm:grid-cols-3 lg:grid-cols-1">
        {sports.map(sport => {
          const on = value === sport;
          const name = chipName(sport);
          return (
            <li key={sport} className="flex min-w-0 items-stretch border-b border-border">
              <a
                href={`#sport-${sport}`}
                style={sportStyle(sport)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded px-1 text-xs font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-primary sm:px-2"
              >
                <SportGlyph sport={sport} className="h-3.5 w-3.5 shrink-0 text-tile" />
                <span>{name}</span>
              </a>
              <button
                type="button"
                aria-label={`Show ${name} first`}
                aria-pressed={on}
                data-fav-sport={sport}
                onClick={() => onPick(on ? null : sport)}
                className={cn(
                  'grid min-h-11 w-11 shrink-0 place-items-center rounded focus-visible:outline-primary',
                  on ? 'text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Star aria-hidden="true" className={cn('h-4 w-4', on && 'fill-current')} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
