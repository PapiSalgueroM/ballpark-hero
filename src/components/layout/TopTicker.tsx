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
      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${row.live ? 'text-destructive' : row.finished ? 'text-muted-foreground' : 'text-primary'}`}>
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
  /* Round 306: auto advancing content needs a way to hold still. Pointer
     over the strip or keyboard focus inside it parks the wire on the open
     sport; leaving lets it run again. Reduced motion still shows everything
     at once with no cycling at all. */
  const [paused, setPaused] = useState(false);
  /* Round 307: the promised pause button, a deliberate stop that survives
     the pointer leaving. Hover pause and button pause are separate states
     so mousing away does not undo an explicit choice. */
  const [userPaused, setUserPaused] = useState(false);
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

  /* Round 317, his report "the ticker isnt moving": it wasn't, in the way
     that counts. The old loop held each sport's box perfectly still for up
     to 14 seconds and then swapped, and once Round 311 loaded the full day
     ahead a sport carries twenty plus cards, so everything past the screen
     edge was unreachable and the strip read as parked. The wire now GLIDES
     the way the cable bottom line he named does: a short hold to read the
     label, then a steady crawl through every card, and the handoff to the
     next sport when the last card has passed. A group that fits on screen
     holds for its old dwell instead. Reduced motion keeps the everything
     open, nothing moving layout. */
  const lastIdxRef = useRef(-1);
  useEffect(() => {
    if (reducedMotion || paused || userPaused || groups.length === 0) return undefined;
    const vp = viewportRef.current;
    if (!vp) return undefined;
    const fresh = lastIdxRef.current !== idx;
    lastIdxRef.current = idx;
    if (fresh) vp.scrollLeft = 0;
    /* a fresh sport gets the reading hold; a resume after hover or pause
       picks up mid glide almost at once */
    let holdLeft = fresh ? 1500 : 350;
    /* Round 336, his report: "the ticker is moving really slow". 55 was
       measured live at 60 px/s, which on a 3000px day-ahead slate is nearly
       a minute per pass. Doubled, and the reading hold trimmed to match. */
    const SPEED = 110; // px per second, the cable crawl
    let raf = 0;
    let last: number | null = null;
    let settled = 0;
    const step = (ts: number) => {
      if (last == null) last = ts;
      const dt = Math.min(100, ts - last);
      last = ts;
      if (holdLeft > 0) {
        holdLeft -= dt;
        raf = requestAnimationFrame(step);
        return;
      }
      const maxScroll = vp.scrollWidth - vp.clientWidth;
      if (maxScroll <= 4) {
        /* fits on screen: nothing to glide, so hold for the old dwell */
        settled += dt;
        if (settled >= dwellMs(groups[idx % groups.length]?.rows.length ?? 0) && groups.length > 1) {
          setIdx(i => (i + 1) % groups.length);
          return;
        }
        raf = requestAnimationFrame(step);
        return;
      }
      vp.scrollLeft = vp.scrollLeft + (SPEED * dt) / 1000;
      if (vp.scrollLeft >= maxScroll - 1) {
        if (groups.length > 1) {
          setIdx(i => (i + 1) % groups.length);
          return;
        }
        /* a one sport wire loops itself: hold at the end, then restart */
        vp.scrollLeft = 0;
        holdLeft = 1500;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [idx, groups, reducedMotion, paused, userPaused]);

  /* A feed refresh can shrink the group list under the pointer. */
  const open = groups.length ? idx % groups.length : 0;

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  const home = pathname === '/';
  const anyLive = groups.some(g => g.rows.some(r => r.live));

  return (
    /* Round 306: a section, not a div, because aria-label on a generic
       element is dropped by the browsers that matter; a named section is a
       real landmark a screen reader can jump to. */
    /* Round 336, the real cause of "on mobile it isnt moving": a touch tap
       synthesizes mouseenter at the finger and never sends the matching
       mouseleave, so one brush of the strip paused the wire forever on every
       phone. The hover pause is a MOUSE convenience, so it listens to
       pointer events now and acts only when the pointer is a real mouse; a
       finger never pauses this way (the explicit pause button and the
       keyboard focus pause both remain). */
    <section
      data-site-chrome=""
      className={`${home ? '' : 'hidden md:block'} bg-[hsl(var(--ticker))] border-b border-border/60 overflow-hidden h-8 relative`}
      aria-label="Live scores ticker"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPaused(false); }}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center h-full">
        <span data-live-chip="" className="shrink-0 z-10 h-full inline-flex items-center gap-1.5 px-3 bg-primary text-primary-foreground text-[10px] font-black tracking-[0.18em] uppercase">
          <span className={`w-1.5 h-1.5 rounded-full bg-red-500 ${anyLive ? 'animate-pulse' : ''}`} aria-hidden="true" />
          Live
        </span>
        {/* Round 307: the dedicated pause control the cycling always needed.
            Effective dwell also pauses under hover and focus; this button is
            the explicit choice that sticks. Hidden when there is nothing to
            cycle, because a pause button on a still strip is a lie. */}
        {groups.length > 1 && !reducedMotion && (
          <button
            type="button"
            onClick={() => setUserPaused(p => !p)}
            /* Round 317: a mouse click must not FOCUS this button, because
               focus inside the strip is itself a pause, so clicking resume
               left the wire parked anyway, which is exactly what the owner
               reported. preventDefault on mousedown stops the focus while
               keyboard tabbing still lands here and still parks the wire,
               which is the accessible behavior Round 306 promised. */
            onMouseDown={e => e.preventDefault()}
            aria-pressed={userPaused}
            aria-label={userPaused ? 'Resume the scores ticker' : 'Pause the scores ticker'}
            className="shrink-0 z-10 h-full px-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span aria-hidden="true">{userPaused ? '▶' : '⏸'}</span>
          </button>
        )}
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
    </section>
  );
}

export default TopTicker;
