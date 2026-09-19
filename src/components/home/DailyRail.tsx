import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getTodayET } from '@/lib/dateUtils';
import { dailyGames, todaysPuzzle, sportOf, SPORT_NAME } from '@/data/homeFront';
import type { GameDef } from '@/data/gameRegistry';
import { SportGlyph, sportStyle } from './SportGlyph';

/**
 * Round 659: the dailies rail. Every daily game on the site in one row that
 * scrolls sideways inside itself, led by Today's puzzle: one daily picked by
 * the date, the same for everyone, so the front of the site is different
 * every day without anybody touching it.
 *
 * NO PERSONAL PROGRESS, ON PURPOSE. No ticks, no day counts, no "N of M
 * done". Round 297 removed exactly that from this page on the owner's word,
 * and scripts/simHomeFront.mjs renders this rail with and without a planted
 * streak record and fails if a single character differs.
 *
 * The day is pinned once at mount, the rule every daily game follows, so
 * the pick cannot change under somebody reading it at midnight. The page
 * itself never scrolls: the arrows move the rail, and only when pressed.
 */
export function DailyRail({ today }: { today?: string }) {
  const day = useRef(today ?? getTodayET()).current;
  const { spotlight, rest, total } = useMemo(() => {
    const all = dailyGames();
    const pick = todaysPuzzle(day);
    return { spotlight: pick, rest: all.filter(g => g !== pick), total: all.length };
  }, [day]);
  const railRef = useRef<HTMLDivElement>(null);

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* old browser: animate */ }
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' });
  };

  if (total === 0) return null;

  return (
    <section aria-labelledby="home-dailies" data-home-dailies="">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="home-dailies" className="flex items-center gap-2.5 text-lg font-display font-bold text-foreground">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
              <CalendarDays className="h-4 w-4" />
            </span>
            Daily puzzles
          </h2>
          <p className="mt-1 text-xs text-muted-foreground md:pl-[42px]">
            {total} daily boards, the same one for everybody. New ones at midnight Eastern.
          </p>
        </div>
        <div className="hidden shrink-0 gap-1.5 sm:flex">
          <button type="button" onClick={() => nudge(-1)} aria-label="Scroll the daily puzzles back" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => nudge(1)} aria-label="Scroll the daily puzzles on" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* On a phone the rail runs to the screen edge, the way a thumb
          expects; on a wider screen it stays inside the page's column and
          fades out at the right so the cut reads as "more this way". */}
      <div ref={railRef} className="-mx-4 snap-x overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:px-0 sm:[mask-image:linear-gradient(to_right,#000_calc(100%-56px),transparent)]">
        <ul className="grid w-max auto-cols-max grid-flow-col grid-rows-2 gap-2.5 sm:pr-14">
          {spotlight && (
            <li className="row-span-2 snap-start">
              <Spotlight game={spotlight} />
            </li>
          )}
          {rest.map(game => (
            <li key={game.path} className="snap-start">
              <DailyChip game={game} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Spotlight({ game }: { game: GameDef }) {
  const sport = sportOf(game.path);
  return (
    <Link
      to={game.path}
      style={sportStyle(sport)}
      data-daily-spotlight={game.path}
      data-no-prerender=""
      className="group relative flex h-full w-[252px] flex-col justify-between gap-2 overflow-hidden rounded-2xl border border-tile/40 bg-surface-1 p-4 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-tile/70"
    >
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_100%_at_100%_0%,hsl(var(--tile)/0.22),transparent_60%)]" />
      <SportGlyph sport={sport} className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 text-tile opacity-[0.12]" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
          Today's puzzle
        </span>
        <h3 className="mt-2.5 font-display text-lg font-bold leading-tight text-foreground">
          <span aria-hidden="true" className="mr-1.5">{game.emoji}</span>
          {game.label}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{game.description}</p>
      </div>
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <SportGlyph sport={sport} className="h-3.5 w-3.5 text-tile" />
          {SPORT_NAME[sport]}
        </span>
        <span className="inline-flex h-8 items-center gap-1 rounded-full bg-foreground/10 px-3 text-xs font-bold text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Play className="h-3 w-3 fill-current" aria-hidden="true" />
          Play
        </span>
      </div>
    </Link>
  );
}

function DailyChip({ game }: { game: GameDef }) {
  const sport = sportOf(game.path);
  return (
    <Link
      to={game.path}
      style={sportStyle(sport)}
      data-daily-chip={game.path}
      className="group flex h-[80px] w-[184px] items-center gap-3 rounded-xl border border-border/80 bg-surface-1 px-3 transition-[border-color,background-color] duration-200 hover:border-tile/60 hover:bg-surface-2"
    >
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-tile/15 text-xl ring-1 ring-inset ring-tile/25">
        {game.emoji}
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 text-[13px] font-semibold leading-4 text-foreground group-hover:text-primary">
          {game.label}
        </span>
        {/* the sport in words and as its drawn glyph, so the chip's colour
            is never the only thing saying which sport it is */}
        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <SportGlyph sport={sport} className="h-3 w-3 text-tile" />
          {SPORT_NAME[sport]}
        </span>
      </span>
    </Link>
  );
}
