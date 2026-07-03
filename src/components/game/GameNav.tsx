import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES, GameCategory, GameDef } from '@/data/gameRegistry';
import { ArrowRight } from 'lucide-react';
import { getTodayET } from '@/lib/dateUtils';
import { getStreakState } from '@/lib/streaks';
import { DailyCountdown } from '@/components/game/DailyCountdown';

interface GameNavProps {
  currentPath?: string;
  sportCategory?: string;
}

/**
 * #20: deterministic per (day, current game) hash, same djb2-style approach
 * as getDailyTier() in src/lib/dateUtils.ts. Two callers seeded with
 * different salts (see below) so "which category" and "which game in it"
 * don't collapse onto the same pseudo-random value.
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // keep as signed 32-bit integer
  }
  return Math.abs(hash);
}

/** Deterministically picks one item from arr using seed. Never Math.random(): same seed always yields the same index, which is what makes the rotation stable per day per game rather than per session. */
function pickDeterministic<T>(arr: T[], seed: number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[seed % arr.length];
}

/**
 * Games in `category` flagged daily that this browser has NOT already
 * completed today, per the local-first streak ledger in src/lib/streaks.ts
 * (perGame[slug].lastDate === today means credited today). This is
 * read-only and synchronous (localStorage), so it's cheap to call from a
 * render path. Wrapped in try/catch and returns null on any failure (e.g.
 * localStorage unavailable) so the caller can fall back gracefully instead
 * of the nav silently breaking.
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
    return null; // completion state not cheaply available - caller falls back
  }
}

export function GameNav({ currentPath, sportCategory }: GameNavProps = {}) {
  const location = useLocation();
  const path = currentPath || location.pathname;

  // Auto-detect category from path
  const detectedCategory = sportCategory
    || CATEGORIES.find(c => c.games.some(g => g.path === path))?.title;

  const category = CATEGORIES.find(c => c.title === detectedCategory);

  // #20: recommend a game from a DIFFERENT category than the current one,
  // rotating deterministically by date + current path so every visitor
  // playing the same game on the same ET day sees the same "Play Next" pick
  // (no per-session Math.random flicker), and the pick changes daily and
  // varies by which game you're on. Prefers a daily game in the target
  // category that isn't completed yet today when that's cheaply readable;
  // otherwise falls back to any game in that category, and if somehow no
  // other category has games, falls back to the previous same-category
  // behavior so the card never has nothing to show.
  const nextGame = useMemo(() => {
    const today = getTodayET();
    const seed = hashString(`${today}:${path}`);

    const otherCategories = CATEGORIES.filter(c => c.title !== category?.title && c.games.length > 0);

    if (otherCategories.length > 0) {
      const targetCategory = pickDeterministic(otherCategories, seed)!;
      const incompleteDaily = getIncompleteDailyGames(targetCategory, today);
      // Second hash (seed offset by 1) so "which category" and "which game
      // inside it" are independent draws instead of correlated off one value.
      const gameSeed = hashString(`${today}:${path}:game`);
      const pool = incompleteDaily ?? targetCategory.games;
      return pickDeterministic(pool, gameSeed);
    }

    // No other category has any games (shouldn't happen with current
    // registry, but keep the nav alive rather than assume it can't).
    const samePool = category?.games.filter(g => g.path !== path) ?? [];
    const gameSeed = hashString(`${today}:${path}:same`);
    return pickDeterministic(samePool, gameSeed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // Last-resort fallback: any other game sitewide. Only used if the above
  // somehow produced nothing (e.g. registry temporarily empty).
  const fallbackGame = useMemo(() => {
    if (nextGame) return null;
    const pool = CATEGORIES.flatMap(c => c.games).filter(g => g.path !== path);
    return pickRandomFallback(pool);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nextGame]);

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
        {game.daily && <DailyCountdown />}
        <p className="text-center mt-4">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            See all games →
          </Link>
        </p>
      </div>
    </div>
  );
}

/** True last-resort only (registry somehow empty of a deterministic pick) - fine to be non-deterministic here since it means something upstream already fell through every structured path. */
function pickRandomFallback<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}
