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
 * Owner request: every game page ends with THREE "play next" suggestions in
 * one consistent format (previously a single card). Picks are deterministic
 * per (ET day, current game), same for every visitor, rotating daily -
 * drawn from three different categories where possible, preferring daily
 * games this browser hasn't completed yet today.
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

  const nextGames = useMemo(() => {
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

  if (nextGames.length === 0) return null;

  return (
    /* ROUND 280: THIS BLOCK ROTATES DAILY AND MUST NOT BE PHOTOGRAPHED.
       The three picks are seeded with the ET date, so re-rendering the site
       tomorrow gives every game page a different trio. That is exactly what the
       owner asked for and nothing about it changes for a real visitor; the
       problem is only that the prerenderer was capturing it, which had two
       costs. The small one is the churn Round 274 already ruled a defect: 126
       snapshots rewritten every run, burying whatever actually changed. The
       large one arrived this round. The sitemap's lastmod is now derived from a
       hash of each page's shipped text, so that Google is told the truth about
       what changed; a block that rewrites itself daily would re-date all 126
       pages on every build and hand back the exact "everything changed today"
       lie that fix exists to end. Those two cannot both be true, so one had to
       go, and it is not the visitor's rotation.

       WHAT THE SNAPSHOT LOSES, MEASURED RATHER THAN WAVED AT. Simulating both
       seeds across all 113 games: with the date in it this block leaves 27
       games with no inbound link on any given day and hands one game 26; the
       date-free variant leaves 32 and hands one 29. It is a lumpy distributor
       either way. The link graph a crawler needs is carried by the "More games
       to play" block from relatedGamesFor, which is deliberately date-free and
       proven by simRelatedGames to give every game inbound links and to leave
       the whole site one connected component. That block stays in the snapshot.
       So the saved page keeps the links that were designed to be there and
       loses three that happened to be picked on a Tuesday.

       Found by scripts/playSnapshotDrift.mjs on its first real run, which is
       the entire reason that harness was written this round. */
    <div className="mt-12 mb-6" data-no-prerender="true">
      <div className="border-t border-border/50 pt-8">
        <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Play Next
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          {nextGames.map(game => (
            <Link
              key={game.path}
              to={game.path}
              className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-lg transition-all group flex flex-col items-center text-center"
            >
              <span className="text-3xl mb-2 block">{game.emoji}</span>
              <h3 className="text-base font-display font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                {game.label}
              </h3>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{game.description}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-xs group-hover:opacity-90 transition-opacity">
                Play Now
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
        {nextGames.some(g => g.daily) && <DailyCountdown />}
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
      </div>
    </div>
  );
}
