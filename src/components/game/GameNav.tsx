import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/data/gameRegistry';
import { ArrowRight } from 'lucide-react';

interface GameNavProps {
  currentPath: string;
  sportCategory: string;
}

export function GameNav({ currentPath, sportCategory }: GameNavProps) {
  // Find the category matching the sport
  const category = CATEGORIES.find(c => c.title === sportCategory);
  
  // Pick the first game in the same category that isn't the current one
  const nextGame = category?.games.find(g => g.path !== currentPath);

  // Fallback: pick any game from another category
  const fallbackGame = !nextGame
    ? CATEGORIES.flatMap(c => c.games).find(g => g.path !== currentPath)
    : null;

  const game = nextGame || fallbackGame;

  if (!game) return null;

  return (
    <div className="mt-12 mb-6">
      <div className="border-t border-border/50 pt-8">
        <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Play Next
        </p>
        <Link
          to={game.path}
          className="block max-w-md mx-auto rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-lg transition-all group"
        >
          <div className="text-center">
            <span className="text-4xl mb-3 block">{game.emoji}</span>
            <h3 className="text-lg font-display font-bold text-foreground group-hover:text-primary transition-colors mb-1">
              {game.label}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
            <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              Play Now
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
        <p className="text-center mt-4">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            See all games →
          </Link>
        </p>
      </div>
    </div>
  );
}
