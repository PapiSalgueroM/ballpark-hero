import { Pin } from 'lucide-react';
import type { GameDef } from '@/data/gameRegistry';
import { GAME_PICKS_STORAGE_WARNING } from '@/hooks/useGamePicks';
import { cn } from '@/lib/utils';

export function GamePickButton({ game, pinned, onToggle, className }: {
  game: Pick<GameDef, 'path' | 'label'>;
  pinned: boolean;
  onToggle: (path: string) => void;
  className?: string;
}) {
  const label = `${pinned ? 'Unpin' : 'Pin'} ${game.label}`;
  return (
    <button
      type="button"
      data-game-pick={game.path}
      data-no-prerender=""
      aria-label={label}
      aria-pressed={pinned}
      title={label}
      onClick={() => onToggle(game.path)}
      className={cn(
        'grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        pinned
          ? 'border-gold/50 bg-gold/15 text-gold hover:bg-gold/25'
          : 'border-transparent bg-surface-1 text-muted-foreground hover:border-border hover:text-foreground',
        className,
      )}
    >
      <Pin aria-hidden="true" className="h-4 w-4" fill={pinned ? 'currentColor' : 'none'} />
    </button>
  );
}

export function GamePicksWarning() {
  return (
    <p data-game-picks-warning="" data-no-prerender="" role="status" className="text-sm text-muted-foreground">
      {GAME_PICKS_STORAGE_WARNING}
    </p>
  );
}
