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
      <div className="mb-3 flex items-center gap-2.5">
        <Pin aria-hidden="true" className="h-5 w-5 text-gold" />
        <div>
          <h2 id="home-game-picks" className="font-display text-lg font-bold text-foreground">Your picks</h2>
          <p className="text-xs text-muted-foreground">Your pinned games, ready to play.</p>
        </div>
      </div>
      <ul ref={rowRef} className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
        {games.map(game => {
          const sport = sportOf(game.path);
          return (
            <li key={game.path} style={sportStyle(sport)} className="relative w-[268px] shrink-0">
              <Link
                to={game.path}
                data-game-pick-link={game.path}
                className="group flex h-full min-h-[108px] items-center gap-3 rounded-xl border border-border bg-surface-1 py-3 pl-3 pr-14 transition-colors hover:border-tile/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-tile/15 text-2xl text-tile">
                  {game.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-display text-sm font-bold leading-snug text-foreground">{game.label}</span>
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <SportGlyph sport={sport} className="h-3.5 w-3.5 text-tile" />
                    Play <ArrowRight aria-hidden="true" className="h-3 w-3" />
                  </span>
                </span>
              </Link>
              <GamePickButton game={game} pinned onToggle={unpin} className="absolute right-1.5 top-1.5" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
