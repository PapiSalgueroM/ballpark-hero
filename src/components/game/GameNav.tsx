import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const footyGames = [
  { path: '/', label: '🎯 Footle', description: 'Guess the player from stats' },
  { path: '/career', label: '📜 Career Quiz', description: 'Guess from career history' },
  { path: '/higher-lower', label: '📊 Higher or Lower', description: 'Compare all-time career stats' },
  { path: '/connections', label: '🔗 Connections', description: 'Find groups of 4 players' },
  { path: '/build-your-xi', label: '⚽ Build Your XI', description: 'Create a lineup, get AI rated' },
  { path: '/guess-the-face', label: '🖼️ Guess the Face', description: 'Unblur the soccer player' },
  { path: '/football-connect-4', label: '🔴🔵 Connect 4', description: 'Soccer trivia meets Connect 4' },
  { path: '/world-cup', label: '🏆 World Cup', description: 'Guess the World Cup legend' },
];

const moreGames = [
  { path: '/ufc', label: '🥊 UFC Guesser', description: 'Guess the UFC fighter' },
  { path: '/nba-starting-5', label: '🏀 NBA Starting 5', description: 'Build a lineup with stat challenges' },
  { path: '/nba-connect-4', label: '🏀 NBA Connect 4', description: 'NBA trivia meets Connect 4' },
  { path: '/nba-chain', label: '🔗 NBA Chain', description: 'Build a chain of connected players' },
  { path: '/football-grid', label: '🏈 Pro Football Grid', description: '3×3 grid puzzle with rarity scores' },
  { path: '/college-grid', label: '🎓 College Grid', description: 'College football 3×3 grid puzzle' },
  { path: '/football-timeline', label: '📅 Timeline', description: 'Order players by draft year' },
  { path: '/football-draft', label: '🎰 Draft Guesser', description: 'Guess the draft round' },
  { path: '/baseball-career', label: '⚾ Career Path', description: 'Guess the baseball player' },
  { path: '/baseball-connections', label: '⚾ Connections', description: 'Group baseball players' },
  { path: '/hockey-career', label: '🏒 Career Path', description: 'Guess the hockey player' },
  { path: '/hockey-higher-lower', label: '🏒 Higher/Lower', description: 'Compare career points' },
  { path: '/nfl-career', label: '🏈 NFL Career Path', description: 'Guess the NFL player' },
  { path: '/teammates', label: '🤝 Teammates or Not?', description: 'Were they ever teammates?' },
  { path: '/olympics', label: '🏅 The Medal Games', description: 'Guess the mystery athlete' },
];

function GameSection({ title, games, currentPath, grid }: { title: string; games: typeof footyGames; currentPath: string; grid?: boolean }) {
  const filtered = games.filter((g) => g.path !== currentPath);
  if (filtered.length === 0) return null;

  return (
    <div>
      <h3 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        {title}
      </h3>
      <div className={cn(
        grid
          ? 'grid grid-cols-2 gap-3 max-w-xl mx-auto'
          : 'flex flex-wrap items-center justify-center gap-3'
      )}>
        {filtered.map((g) => (
          <Link
            key={g.path}
            to={g.path}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-6 py-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-all hover:scale-105 text-center'
            )}
          >
            <span className="text-xl font-bold text-primary font-display">{g.label}</span>
            <span className="text-xs text-muted-foreground text-center">{g.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GameNav() {
  const location = useLocation();

  return (
    <div className="mt-12 mb-6">
      <div className="border-t border-border/50 pt-8 space-y-8">
        <GameSection title="More Soccer" games={footyGames} currentPath={location.pathname} grid />
        <GameSection title="More Games" games={moreGames} currentPath={location.pathname} grid />
      </div>
    </div>
  );
}
