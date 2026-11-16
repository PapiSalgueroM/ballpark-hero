import { useEffect, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SPORT_NAME, type SportKey } from '@/data/homeFront';
import { SportGlyph, sportStyle } from './SportGlyph';

// The catalogue becomes a sidebar at the same breakpoint.
const DESKTOP_CATALOGUE = '(min-width: 1024px)';
const JUMP_TRIGGER = 'home-catalogue-sport-trigger';

function subscribeCatalogueWidth(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_CATALOGUE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const catalogueIsWide = () => window.matchMedia(DESKTOP_CATALOGUE).matches;

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
  onJump: (event: MouseEvent<HTMLAnchorElement>, opener?: string, fallback?: string) => boolean;
}) {
  const desktop = useSyncExternalStore(subscribeCatalogueWidth, catalogueIsWide, () => true);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (desktop) setOpen(false); }, [desktop]);

  const links = sports.map(sport => {
    const id = `home-sport-index-${sport}`;
    return (
      <li key={sport} className="flex min-w-0 items-stretch border-b border-border">
        <a
          href={`#sport-${sport}`}
          id={desktop ? id : undefined}
          onClick={event => {
            if (desktop) onJump(event, id, JUMP_TRIGGER);
            else if (onJump(event, JUMP_TRIGGER, id)) setOpen(false);
          }}
          style={sportStyle(sport)}
          className={`flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded px-2 font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-primary ${desktop ? 'scroll-mt-28 text-xs' : 'text-sm'}`}
        >
          <SportGlyph sport={sport} className="h-3.5 w-3.5 shrink-0 text-tile" />
          <span>{browseSportName(sport)}</span>
        </a>
      </li>
    );
  });

  return (
    <nav aria-labelledby="browse-sports-heading" data-home-fav-sport="" className="mt-2 lg:flex lg:min-h-0 lg:flex-col">
      {desktop ? (
        <ul className="grid min-h-0 grid-cols-1 overflow-y-auto [scrollbar-width:thin]">{links}</ul>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger id={JUMP_TRIGGER} className="inline-flex min-h-11 w-full scroll-mt-36 items-center justify-between gap-2 rounded-lg border border-border bg-background sm:scroll-mt-28 px-3 text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-primary">
            Jump to sport <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
          </PopoverTrigger>
          <PopoverContent align="start" aria-label="Jump to sport" collisionPadding={12}
            className="max-h-[var(--radix-popover-content-available-height)] w-72 max-w-[calc(100vw-1.5rem)] overflow-auto rounded-xl px-2 py-1"
            onCloseAutoFocus={event => {
              if (document.activeElement?.id.startsWith('sport-')) event.preventDefault();
            }}
          >
            <ul className="grid grid-cols-2 gap-x-1">{links}</ul>
          </PopoverContent>
        </Popover>
      )}
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
