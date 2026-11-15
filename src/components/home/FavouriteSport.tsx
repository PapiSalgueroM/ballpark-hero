import type { MouseEventHandler } from 'react';
import { SPORT_NAME, type SportKey } from '@/data/homeFront';
import { SportGlyph, sportStyle } from './SportGlyph';

/** The chip's words. The world category holds the Olympics and the games that
    mix every sport, so "All sports" would say the wrong thing here. */
export const browseSportName = (sport: SportKey) => (sport === 'world' ? 'World & Olympic' : SPORT_NAME[sport]);

/**
 * Keep the index and order control above the sections they navigate or reorder.
 */
export function FavouriteSport({ sports, value, onPick, onJump }: {
  sports: readonly SportKey[];
  value: SportKey | null;
  onPick: (sport: SportKey | null) => void;
  onJump: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <nav aria-labelledby="browse-sports-heading" data-home-fav-sport="" className="mt-2 lg:flex lg:min-h-0 lg:flex-col">
      <ul className="grid grid-cols-2 gap-x-2 min-[480px]:gap-x-4 sm:grid-cols-3 lg:min-h-0 lg:grid-cols-1 lg:overflow-y-auto lg:[scrollbar-width:thin]">
        {sports.map(sport => {
          const name = browseSportName(sport);
          return (
            <li key={sport} className="flex min-w-0 items-stretch border-b border-border">
              <a
                href={`#sport-${sport}`}
                id={`home-sport-index-${sport}`}
                onClick={onJump}
                style={sportStyle(sport)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded px-1 text-xs font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-primary sm:px-2"
              >
                <SportGlyph sport={sport} className="h-3.5 w-3.5 shrink-0 text-tile" />
                <span>{name}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <label className="mt-2 flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch lg:gap-1">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Show first</span>
        <select
          value={value ?? ''}
          onChange={event => onPick((event.currentTarget.value || null) as SportKey | null)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-primary"
        >
          <option value="">Default order</option>
          {sports.map(sport => <option key={sport} value={sport}>{browseSportName(sport)}</option>)}
        </select>
      </label>
    </nav>
  );
}
