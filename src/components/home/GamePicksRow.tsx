import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pin } from 'lucide-react';
import { VISIBLE_CATEGORIES, type GameDef } from '@/data/gameRegistry';
import { sportOf } from '@/data/homeFront';
import { GamePickButton } from '@/components/game/GamePickButton';
import { SportGlyph, sportStyle } from './SportGlyph';

export function GamePicksRow({ paths, onToggle, onEmpty }: {
  paths: string[];
  onToggle: (path: string) => void;
  onEmpty: () => void;
}) {
  const rowRef = useRef<HTMLUListElement>(null);
  const visibleGames = VISIBLE_CATEGORIES.flatMap(category => category.games);
  const games = paths
    .map(path => visibleGames.find(game => game.path === path))
    .filter((game): game is GameDef => !!game);

  const unpin = (path: string) => {
    const buttons = Array.from(rowRef.current?.querySelectorAll<HTMLButtonElement>('button[data-game-pick]') ?? []);
    const at = buttons.findIndex(button => button.dataset.gamePick === path);
    if (at >= 0 && document.activeElement === buttons[at]) {
      const next = buttons[at + 1] ?? buttons[at - 1];
      if (next) next.focus({ preventScroll: true });
      else onEmpty();
    }
    onToggle(path);
  };

  if (games.length === 0) return null;

  return (
    <section data-home-picks="" data-no-prerender="" aria-labelledby="home-game-picks">
      <div className="mb-2 flex items-center gap-2.5">
        <Pin aria-hidden="true" className="h-5 w-5 text-gold" />
        <h2 id="home-game-picks" className="font-display text-lg font-bold text-foreground">Your picks</h2>
      </div>
      <ul ref={rowRef} data-home-shelf-rail="" className="flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
        {games.map(game => {
          const sport = sportOf(game.path);
          return (
            <li key={game.path} style={sportStyle(sport)} className="flex w-[248px] max-w-full shrink-0 items-center rounded-lg border border-border border-l-[3px] border-l-tile bg-surface-1 pr-1.5">
              <Link
                to={game.path}
                data-game-pick-link={game.path}
                className="flex min-h-[66px] min-w-0 flex-1 self-stretch items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <SportGlyph sport={sport} className="h-[18px] w-[18px] shrink-0 text-tile" />
                <span className="min-w-0 flex-1 break-words font-display text-sm font-bold leading-snug text-foreground">{game.label}</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              </Link>
              <GamePickButton game={game} pinned onToggle={unpin} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
