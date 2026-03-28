import { Link, useLocation } from 'react-router-dom';
import { VISIBLE_CATEGORIES } from '@/data/gameRegistry';

export function GameNav() {
  const location = useLocation();

  const visibleCategories = VISIBLE_CATEGORIES
    .map(cat => ({
      ...cat,
      games: cat.games.filter(g => g.path !== location.pathname),
    }))
    .filter(cat => cat.games.length > 0);

  return (
    <div className="mt-12 mb-6">
      <div className="border-t border-border/50 pt-8 space-y-8">
        {visibleCategories.map(cat => (
          <div key={cat.title}>
            <h3 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {cat.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
              {cat.games.map(g => (
                <Link
                  key={g.path}
                  to={g.path}
                  className="flex flex-col items-center justify-center gap-1 px-6 py-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-all hover:scale-105 text-center"
                >
                  <span className="text-xl font-bold text-primary font-display">
                    {g.emoji} {g.label}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">{g.description}</span>
                  {g.daily && (
                    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary mt-1">
                      Daily
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
