import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRoutePath } from '@/hooks/useRoutePath';
import { ALL_GAMES, CATEGORIES, GameCategory, GameDef } from '@/data/gameRegistry';
import { dealtBySport, sportOf, SPORT_NAME } from '@/data/homeFront';
import { ArrowRight, RotateCw } from 'lucide-react';
import { getTodayET } from '@/lib/dateUtils';
import { getStreakState } from '@/lib/streaks';
import { DailyCountdown } from '@/components/game/DailyCountdown';
import styles from './GameNav.module.css';

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
  const routePath = useRoutePath();
  const path = currentPath || routePath;

  // Auto-detect category from path
  const detectedCategory = sportCategory
    || CATEGORIES.find(c => c.games.some(g => g.path === path))?.title;

  const category = CATEGORIES.find(c => c.title === detectedCategory);

  const openingPicks = useMemo(() => {
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
  }, [path, category]);

  return <PlayNext key={path} path={path} openingPicks={openingPicks} />;
}

type GameFilter = 'mix' | 'sport' | 'daily';

function PlayNext({ path, openingPicks }: { path: string; openingPicks: GameDef[] }) {
  const [filter, setFilter] = useState<GameFilter>('mix');
  const [offset, setOffset] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const sport = sportOf(path);
  const pools = useMemo(() => {
    const others = ALL_GAMES.filter(game => game.path !== path);
    const first = new Set(openingPicks.map(game => game.path));
    const bySport = dealtBySport(others);
    return {
      mix: [...openingPicks, ...bySport.filter(game => !first.has(game.path))],
      sport: ALL_GAMES.some(game => game.path === path) ? others.filter(game => sportOf(game.path) === sport) : [],
      daily: bySport.filter(game => game.daily),
    };
  }, [path, sport, openingPicks]);
  const pool = pools[filter];
  if (!pool.length) return null;
  const nextGames = Array.from({ length: Math.min(3, pool.length) }, (_, i) => pool[(offset + i) % pool.length]);
  const filters: [GameFilter, string][] = [
    ['mix', 'Across sports'],
    ['sport', sport === 'world' ? 'World games' : SPORT_NAME[sport]],
    ['daily', 'Daily games'],
  ];

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
    <section className="mt-12 mb-6" data-no-prerender="true" aria-label="Play Next">
      <div className="border-t border-border/50 pt-8">
        <p className="text-center font-display text-xl font-bold mb-3">
          Play Next
        </p>
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1" role="group" aria-label="Filter game suggestions">
          {filters.filter(([value]) => pools[value].length > 0).map(([value, label]) => (
            <button type="button" key={value} aria-pressed={filter === value}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:text-foreground aria-pressed:bg-secondary aria-pressed:text-foreground"
              onClick={() => { if (value !== filter) { setFilter(value); setOffset(0); setInteracted(true); } }}>
              {label}
            </button>
          ))}
          {pool.length > 3 && <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary hover:underline"
            onClick={() => { setOffset((offset + 3) % pool.length); setInteracted(true); }}>
            <RotateCw size={15} aria-hidden="true" /> New picks
          </button>}
        </div>
        <span className="sr-only" role="status">{interacted ? nextGames.map(game => game.label).join(', ') : ''}</span>
        <div data-play-next-cards="" className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          {nextGames.map(game => (
            <Link
              key={filter + game.path}
              to={game.path}
              data-google-vignette="false"
              className={`${styles.pick} ${interacted ? styles.changed : ''} group flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/50 focus-visible:border-primary`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="text-xl" aria-hidden="true">{game.emoji}</span>
                {SPORT_NAME[sportOf(game.path)]}
              </span>
              <h3 className="text-base font-display font-bold text-foreground group-hover:text-primary">
                {game.label}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{game.description}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-1 font-semibold text-xs text-primary">
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
            data-google-vignette="false"
            className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-xs text-muted-foreground hover:text-primary"
          >
            See all games →
          </Link>
        </p>
      </div>
    </section>
  );
}
