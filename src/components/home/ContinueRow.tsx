import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, History } from 'lucide-react';
import { describeSave, savedGames, type SavedGame } from '@/data/continueSaves';
import { sportOf } from '@/data/homeFront';
import { SportGlyph, sportStyle } from './SportGlyph';

/** What a card says before its save has been opened, and whenever the save
    has nothing on it that reads cleanly. */
export const SAVED_FALLBACK = 'Saved in this browser';

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Round 717: Continue playing, under the Main Event band.
 *
 * One card for every long form game this browser holds a save for, linking
 * straight back into it. A visitor with no saves gets nothing at all, not an
 * empty box, so the first screen of a new visitor is exactly what it was.
 *
 * Which cards show is decided on the first render from whether each key
 * exists, so the row's size never changes after it appears. What each card
 * says (a club and a season, a fighter and his fight count) comes from the
 * save itself, opened after the page has drawn, and lands inside a line that
 * already holds its height. src/data/continueSaves.ts holds the list and the
 * reading rules; scripts/simHomeFront.mjs section 7 checks both.
 */
export function ContinueRow() {
  const [saved] = useState<SavedGame[]>(() => savedGames(browserStorage()));
  const [lines, setLines] = useState<Record<string, string>>({});

  useEffect(() => {
    if (saved.length === 0) return;
    const storage = browserStorage();
    const next: Record<string, string> = {};
    for (const { entry } of saved) {
      let raw: string | null = null;
      try { raw = storage ? storage.getItem(entry.saveKey) : null; } catch { raw = null; }
      const line = describeSave(entry, raw);
      if (line) next[entry.path] = line;
    }
    setLines(next);
  }, [saved]);

  if (saved.length === 0) return null;

  return (
    <section aria-labelledby="home-continue" data-home-continue="">
      <h2 id="home-continue" className="mb-3 flex items-center gap-2.5 text-lg font-display font-bold text-foreground">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
          <History className="h-4 w-4" />
        </span>
        Continue playing
      </h2>
      {/* the same sideways rail as the dailies: on a phone it runs to the
          screen edge, and the page itself never scrolls sideways */}
      <div className="-mx-4 snap-x overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:px-0">
        <ul className="flex w-max gap-2.5">
          {saved.map(({ entry, game }) => {
            const sport = sportOf(game.path);
            return (
              <li key={game.path} className="snap-start">
                <Link
                  to={game.path}
                  style={sportStyle(sport)}
                  data-continue-card={game.path}
                  className="group flex h-[72px] w-[248px] items-center gap-3 rounded-xl border border-border/80 bg-surface-1 px-3 transition-[border-color,background-color] duration-200 hover:border-tile/60 hover:bg-surface-2"
                >
                  <span aria-hidden="true" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-tile/15 text-xl ring-1 ring-inset ring-tile/25">
                    {game.emoji}
                    <span className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-surface-1 text-tile ring-1 ring-tile/50">
                      <SportGlyph sport={sport} className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold leading-5 text-foreground group-hover:text-primary">
                      {game.label}
                    </span>
                    <span data-continue-line="" className="block truncate text-xs leading-4 text-muted-foreground">
                      {lines[entry.path] ?? SAVED_FALLBACK}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
