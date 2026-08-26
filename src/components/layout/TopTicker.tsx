import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SPORT_HUB, SPORT_TAG, startLabel, teamShort, type LiveScoreRow } from '@/lib/liveScores';

/**
 * Round 298: the strip becomes what the owner asked for in the 2026-08-26
 * tweaks document, and nothing else. His words, condensed: a LIVE label with
 * a little red circle top left, no question mark, no lines about the site
 * itself, solely that day's real games. Before a game: the matchup, its
 * start time, its sport. During and after: the score. Broken up by sport,
 * one sport's box expanding to show its games, then shrinking and moving to
 * the next, looping forever, the way the cable networks run their bottom
 * line.
 *
 * Everything the old strip carried besides scores is gone on that
 * instruction: the save lines, the fresh-daily rotation, the catalog counts,
 * the what's-new pointer, the hand-kept calendar events. The scores come in
 * as a prop from LiveTicker so this file stays pure: simTicker bundles it
 * into node and asserts the grouping and the absence of site promo without a
 * network client coming along.
 *
 * Every element below that is computed from the scores table carries
 * data-no-prerender. A snapshot outlives the build that wrote it, and a
 * score is stale twenty minutes later; the prerenderer drops what is marked
 * and its clock sampling catches what is not.
 */

export interface TopTickerProps {
  scores?: LiveScoreRow[];
}

export interface SportGroup {
  sport: string;
  tag: string;
  hub: string;
  rows: LiveScoreRow[];
}

/* Soccer leads, the site's own ordering convention, then the American
   leagues in season-weight order, then anything new the feed ever adds. */
const SPORT_ORDER = ['soccer', 'mlb', 'nfl', 'nba', 'nhl'];

/**
 * Groups the wire into per-sport boxes, each ordered the way a fan scans a
 * bottom line: games in play first, then today's kickoffs soonest first,
 * then finals, most recent first. Empty sports simply do not appear.
 */
export function groupScores(scores: LiveScoreRow[]): SportGroup[] {
  const bySport = new Map<string, LiveScoreRow[]>();
  for (const r of scores) {
    if (!r || !r.sport) continue;
    const list = bySport.get(r.sport) ?? [];
    list.push(r);
    bySport.set(r.sport, list);
  }
  const sports = [...bySport.keys()].sort((a, b) => {
    const ia = SPORT_ORDER.indexOf(a);
    const ib = SPORT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
  return sports.map(sport => {
    const rows = [...(bySport.get(sport) ?? [])].sort((a, b) => {
      const stateA = a.live ? 0 : !a.finished ? 1 : 2;
      const stateB = b.live ? 0 : !b.finished ? 1 : 2;
      if (stateA !== stateB) return stateA - stateB;
      const ta = Date.parse(a.start_at) || 0;
      const tb = Date.parse(b.start_at) || 0;
      return stateA === 2 ? tb - ta : ta - tb;
    });
    return {
      sport,
      tag: SPORT_TAG[sport] ?? sport.toUpperCase(),
      hub: SPORT_HUB[sport] ?? '/',
      rows,
    };
  });
}

/** How long one sport's box stays open: a beat to read the label, then a
 *  beat and a half per game, clamped so one busy league cannot park the
 *  loop and one quiet league does not blink past. */
export function dwellMs(gameCount: number): number {
  return Math.min(14000, Math.max(5000, 2500 + gameCount * 1500));
}

function ScoreCard({ row, hub }: { row: LiveScoreRow; hub: string }) {
  const home = teamShort(row.home, row.sport);
  const away = teamShort(row.away, row.sport);
  const state = row.live ? (row.status_long || 'Live') : row.finished ? 'Final' : startLabel(row.start_at);
  /* American sports read away then home ("Astros at Yankees"); soccer reads
     home then away. The strip follows the convention the fan expects. */
  const first = row.sport === 'soccer' ? [home, row.home_score] : [away, row.away_score];
  const second = row.sport === 'soccer' ? [away, row.away_score] : [home, row.home_score];
  return (
    <Link
      to={hub}
      data-no-prerender="true"
      data-score-card=""
      className="inline-flex items-center gap-1.5 h-full px-3 border-l border-border/60 text-[11px] shrink-0 hover:bg-muted/40 transition-colors"
      aria-label={`${first[0]} ${first[1] ?? ''} ${row.sport === 'soccer' ? 'v' : 'at'} ${second[0]} ${second[1] ?? ''}, ${state}`}
    >
      <span className="inline-flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground whitespace-nowrap">{first[0]}</span>
        {first[1] != null && <span className="tabular-nums font-bold text-foreground">{first[1]}</span>}
        <span className="text-muted-foreground px-0.5" aria-hidden="true">{row.sport === 'soccer' ? 'v' : '@'}</span>
        <span className="font-semibold text-foreground whitespace-nowrap">{second[0]}</span>
        {second[1] != null && <span className="tabular-nums font-bold text-foreground">{second[1]}</span>}
      </span>
      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${row.live ? 'text-red-400' : row.finished ? 'text-muted-foreground' : 'text-primary'}`}>
        {row.live && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />}
        {state}
      </span>
    </Link>
  );
}

function SportBox({ group, open }: { group: SportGroup; open: boolean }) {
  return (
    <span data-no-prerender="true" className="inline-flex items-center h-full">
      <Link
        to={group.hub}
        data-sport-box=""
        className={`inline-flex items-center h-full px-3 text-[10px] font-black tracking-[0.16em] uppercase transition-colors ${open ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
      >
        {group.tag}
      </Link>
      <span
        className="inline-flex items-center h-full overflow-hidden transition-[max-width,opacity] duration-500 ease-in-out"
        style={{ maxWidth: open ? '4000px' : '0px', opacity: open ? 1 : 0 }}
        aria-hidden={!open}
      >
        {open && group.rows.map(r => <ScoreCard key={r.id} row={r} hub={group.hub} />)}
      </span>
    </span>
  );
}

const HIDDEN_PREFIXES = ['/admin', '/reset-password'];

export function TopTicker({ scores = [] }: TopTickerProps) {
  const { pathname } = useLocation();
  const groups = useMemo(() => groupScores(scores), [scores]);
  const [idx, setIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      return undefined;
    }
  }, []);

  /* The loop itself: hold on the open sport for its dwell, then advance.
     A one sport wire never advances; a dead wire has nothing to advance. */
  useEffect(() => {
    if (reducedMotion || groups.length < 2) return undefined;
    const t = window.setTimeout(() => setIdx(i => (i + 1) % groups.length), dwellMs(groups[idx % groups.length]?.rows.length ?? 0));
    return () => window.clearTimeout(t);
  }, [idx, groups, reducedMotion]);

  /* A feed refresh can shrink the group list under the pointer. */
  const open = groups.length ? idx % groups.length : 0;

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  const home = pathname === '/';
  const anyLive = groups.some(g => g.rows.some(r => r.live));

  return (
    <div data-site-chrome="" className={`${home ? '' : 'hidden md:block'} bg-[hsl(225_25%_4%)] border-b border-border/60 overflow-hidden h-8 relative`} aria-label="Live scores ticker">
      <div className="flex items-center h-full">
        <span data-live-chip="" className="shrink-0 z-10 h-full inline-flex items-center gap-1.5 px-3 bg-primary text-primary-foreground text-[10px] font-black tracking-[0.18em] uppercase">
          <span className={`w-1.5 h-1.5 rounded-full bg-red-500 ${anyLive ? 'animate-pulse' : ''}`} aria-hidden="true" />
          Live
        </span>
        <div ref={viewportRef} className="flex-1 overflow-hidden h-full" aria-live="off">
          <div className="flex items-center h-full w-max">
            {groups.length === 0 && (
              <span data-no-prerender="true" className="inline-flex items-center h-full px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                No games on the board right now
              </span>
            )}
            {reducedMotion
              ? groups.map(g => <SportBox key={g.sport} group={g} open />)
              : groups.map((g, i) => <SportBox key={g.sport} group={g} open={i === open} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopTicker;
