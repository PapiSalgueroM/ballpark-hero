import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const games = [
  { path: '/', label: '🎯 Footle', description: 'Guess the player from stats' },
  { path: '/career', label: '📜 Career Quiz', description: 'Guess from career history' },
  { path: '/higher-lower', label: '📊 Higher or Lower', description: 'Compare all-time career stats' },
  { path: '/connections', label: '🔗 Connections', description: 'Find groups of 4 players' },
];

export function GameNav() {
  const location = useLocation();

  return (
    <div className="mt-12 mb-6">
      <div className="border-t border-border/50 pt-8">
        <h3 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          More Games
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {games
            .filter((g) => g.path !== location.pathname)
            .map((g) => (
              <Link
                key={g.path}
                to={g.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-6 py-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-all hover:scale-105 min-w-[180px]'
                )}
              >
                <span className="text-xl font-bold text-primary font-display">{g.label}</span>
                <span className="text-xs text-muted-foreground">{g.description}</span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
