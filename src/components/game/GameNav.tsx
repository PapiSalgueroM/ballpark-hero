import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES, GameCategory, GameDef } from '@/data/gameRegistry';
import { getTodayET } from '@/lib/dateUtils';
import { getStreakState } from '@/lib/streaks';
import { DailyCountdown } from '@/components/game/DailyCountdown';
import { relatedGamesFor } from '@/lib/relatedGames';

interface GameNavProps {
  currentPath?: string;
  sportCategory?: string;
}

/**
 * Registered games use the stable six-link relatedGamesFor graph. Legacy and
 * archive routes outside the registry retain the earlier three-pick daily
 * fallback so their existing navigation does not disappear.
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // keep as signed 32-bit integer
  }
  return Math.abs(hash);
}

/** Deterministically picks one item from arr using seed. Never Math.random(). */
function pickDeterministic<T>(arr: T[], seed: number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[seed % arr.length];
}

/**
 * Games in `category` flagged daily that this browser has NOT already
 * completed today, per the local streak ledger. Read-only + synchronous
 * (localStorage). Returns null on any failure so callers can fall back.
 */
function getIncompleteDailyGames(category: GameCategory, todayEt: string): GameDef[] | null {
  try {
    const dailyGames = category.games.filter(g => g.daily);
    if (dailyGames.length === 0) return null;
    const { perGame } = getStreakState();
    const incomplete = dailyGames.filter(g => {
      const slug = g.path.replace(/^\//, '');
      return perGame[slug]?.lastDate !== todayEt;
    });
    return incomplete.length > 0 ? incomplete : null;
  } catch {
    return null;
  }
}

export function GameNav({ currentPath, sportCategory }: GameNavProps = {}) {
  const location = useLocation();
  const path = currentPath || location.pathname;

  // Auto-detect category from path
  const detectedCategory = sportCategory
    || CATEGORIES.find(c => c.games.some(g => g.path === path))?.title;

  const category = CATEGORIES.find(c => c.title === detectedCategory);
  const related = useMemo(() => relatedGamesFor(path), [path]);

  const fallbackGames = useMemo(() => {
    const today = getTodayET();
    const picks: GameDef[] = [];
    const usedPaths = new Set<string>([path]);
    const usedCategories = new Set<string>();

    const otherCategories = CATEGORIES.filter(
      c => c.title !== category?.title && c.games.length > 0,
    );

    // Up to three draws, each salted differently, each preferring a fresh
    // category and an incomplete daily game inside it.
    for (let i = 0; i < 6 && picks.length < 3; i++) {
      const catPool = otherCategories.filter(c => !usedCategories.has(c.title));
      const pool = catPool.length > 0 ? catPool : otherCategories;
      const targetCategory = pickDeterministic(pool, hashString(`${today}:${path}:cat${i}`));
      if (!targetCategory) break;

      const incompleteDaily = getIncompleteDailyGames(targetCategory, today);
      const gamePool = (incompleteDaily ?? targetCategory.games).filter(g => !usedPaths.has(g.path));
      const fullPool = gamePool.length > 0
        ? gamePool
        : targetCategory.games.filter(g => !usedPaths.has(g.path));
      const game = pickDeterministic(fullPool, hashString(`${today}:${path}:game${i}`));

      usedCategories.add(targetCategory.title);
      if (game) {
        picks.push(game);
        usedPaths.add(game.path);
      }
    }

    // Backfill from anywhere if the structured draws came up short.
    if (picks.length < 3) {
      const everything = CATEGORIES.flatMap(c => c.games).filter(g => !usedPaths.has(g.path));
      for (let i = 0; picks.length < 3 && i < everything.length; i++) {
        const game = pickDeterministic(everything, hashString(`${today}:${path}:fill${i}`));
        if (game && !usedPaths.has(game.path)) {
          picks.push(game);
          usedPaths.add(game.path);
        }
      }
    }

    return picks;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  const nextGames = related.length > 0 ? related : fallbackGames;
  const volatileFallback = related.length === 0;
  const hasDaily = nextGames.some(next =>
    CATEGORIES.some(c => c.games.some(game => game.path === next.path && game.daily)),
  );

  if (nextGames.length === 0) return null;

  return (
    /* Registered routes use the stable six-link graph and remain in snapshots.
       Retired and archive routes keep the old date-based fallback, so only
       that fallback is marked volatile. DailyCountdown marks its own clock. */
    <nav
      aria-label="Play next"
      className="mt-8 mb-6 border-t border-border/50 pt-6"
      data-no-prerender={volatileFallback ? 'true' : undefined}
      data-related-games={volatileFallback ? undefined : ''}
    >
      <h2 className="text-center text-sm font-semibold text-foreground mb-3">
        Play Next
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-3xl mx-auto">
        {nextGames.map(game => (
          <Link
            key={game.path}
            to={game.path}
            data-play-next-game=""
            className="rounded-xl border border-border bg-card px-3 py-2.5 hover:border-primary/50 transition-colors group"
          >
            <span className="block text-lg" aria-hidden="true">{game.emoji}</span>
            <span className="mt-0.5 block truncate text-xs font-bold text-foreground group-hover:text-primary">
              {game.label}
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground line-clamp-2">
              {game.description}
            </span>
          </Link>
        ))}
      </div>
      {hasDaily && <DailyCountdown />}
      <p className="text-center mt-4">
        {/* Round 209: padded to a real tap target. The sitewide phone
            sweep measured this at 14px on 82 pages, which is a third of
            what a thumb needs, and it is the link back to everything. */}
        <Link
          to="/"
          className="inline-flex items-center rounded-full px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          See all games →
        </Link>
      </p>
    </nav>
  );
}
