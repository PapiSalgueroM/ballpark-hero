import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Link } from 'react-router-dom';
import { useRoutePath } from '@/hooks/useRoutePath';
import { SPORT_HUB, SPORT_TAG, boardAt, startLabel, teamShort, type LiveScoreRow } from '@/lib/liveScores';
import {
  FILTER_ALL, FILTER_MINE, followableTeams, readFollows, readSportFilter, teamKey, toggleFollow, writeFollows, writeSportFilter,
} from '@/lib/tickerPrefs';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
 *
 * Round 711, spec section 9 and D44. Four things a fan expects from a real
 * bottom line: when it last heard from the feed ("Updated 2:05 PM", the
 * poller's own stamp, never the browser clock), a plain Delayed notice when
 * that is too long ago, a sport filter, and teams they follow, starred from a
 * score card and led to the front. The follows and the filter live in this
 * browser (src/lib/tickerPrefs.ts). None of it can reach a snapshot: it only
 * renders once a read has answered, and the prerenderer never lets one.
 */

export interface TopTickerProps {
  scores?: LiveScoreRow[];
  /** how the last read went; a strip given only rows behaves as before */
  status?: 'loading' | 'ok' | 'failed';
  /** the server's clock at that read, in ms, the one freshness is judged by */
  checkedAt?: number | null;
}

export interface SportGroup {
  sport: string;
  tag: string;
  hub: string;
  rows: LiveScoreRow[];
}

/* Soccer leads, the site's own ordering convention, then the American
   leagues in season-weight order, then anything new the feed ever adds.
   Round 414: college football sits behind the NFL and college basketball
   behind the NBA, the way a bottom line pairs them, and tennis closes. */
const SPORT_ORDER = ['soccer', 'mlb', 'nfl', 'cfb', 'nba', 'cbb', 'nhl', 'wnba', 'tennis'];

const NO_FOLLOWS: ReadonlySet<string> = new Set();

/** Round 711: a game involving a team the visitor follows. */
export function isFollowedRow(r: LiveScoreRow, followed: ReadonlySet<string>): boolean {
  if (!r || followed.size === 0) return false;
  return followed.has(teamKey(r.sport, r.home)) || followed.has(teamKey(r.sport, r.away));
}

/** Round 711: the visitor's filter applied to the wire. 'all' is every
 *  game, 'mine' is games with a followed team, anything else is one sport. */
export function filterScores(scores: LiveScoreRow[], filter: string, followed: ReadonlySet<string>): LiveScoreRow[] {
  if (filter === FILTER_ALL) return scores;
  if (filter === FILTER_MINE) return scores.filter(r => isFollowedRow(r, followed));
  return scores.filter(r => r?.sport === filter);
}

/**
 * Groups the wire into per-sport boxes, each ordered the way a fan scans a
 * bottom line: games in play first, then today's kickoffs soonest first,
 * then finals, most recent first. Empty sports simply do not appear.
 *
 * Round 711, spec 9.4 puts the visitor's own teams first: a game with a
 * followed team leads its sport's box, and a sport with such a game leads
 * the wire. Everything else keeps the order above.
 */
export function groupScores(scores: LiveScoreRow[], followed: ReadonlySet<string> = NO_FOLLOWS): SportGroup[] {
  const bySport = new Map<string, LiveScoreRow[]>();
  for (const r of scores) {
    /* a sport is a text key or it is nothing: a row carrying a number there
       would throw on toUpperCase below, on every route */
    if (!r || typeof r.sport !== 'string' || !r.sport) continue;
    const list = bySport.get(r.sport) ?? [];
    list.push(r);
    bySport.set(r.sport, list);
  }
  const mine = (sport: string) => (bySport.get(sport) ?? []).some(r => isFollowedRow(r, followed));
  const sports = [...bySport.keys()].sort((a, b) => {
    const fa = mine(a) ? 0 : 1;
    const fb = mine(b) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    const ia = SPORT_ORDER.indexOf(a);
    const ib = SPORT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
  return sports.map(sport => {
    const rows = [...(bySport.get(sport) ?? [])].sort((a, b) => {
      const followA = isFollowedRow(a, followed) ? 0 : 1;
      const followB = isFollowedRow(b, followed) ? 0 : 1;
      if (followA !== followB) return followA - followB;
      const stateA = a.live ? 0 : !a.finished ? 1 : 2;
      const stateB = b.live ? 0 : !b.finished ? 1 : 2;
      if (stateA !== stateB) return stateA - stateB;
      const ta = Date.parse(a.start_at) || 0;
      const tb = Date.parse(b.start_at) || 0;
      return stateA === 2 ? tb - ta : ta - tb;
    });
    return {
      sport,
      tag: Object.prototype.hasOwnProperty.call(SPORT_TAG, sport) ? SPORT_TAG[sport] : sport.toUpperCase(),
      hub: Object.prototype.hasOwnProperty.call(SPORT_HUB, sport) ? SPORT_HUB[sport] : '/',
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

/** What a card needs from the strip to offer its follow star. */
interface FollowProps {
  followed: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onMenu: (id: string, open: boolean) => void;
  /** true while the menu being opened was opened by a pointer, see below */
  pointerOpen: MutableRefObject<boolean>;
}

/* Round 711: star a team from its score card. The star opens a two line menu
   (one per team) rather than guessing which side you meant. When the menu was
   opened with a mouse or a finger, closing it must NOT hand focus back to the
   star: focus inside the strip is itself a pause (Round 306), so returning it
   there left the wire parked, the same trap Round 317 found under the pause
   button. A keyboard user gets focus back where they were, as they should. */
function FollowStar({ row, follow }: { row: LiveScoreRow; follow: FollowProps }) {
  /* Only real, distinct sides get a line: the feed's "TBD @ TBD" placeholder
     pair keys as one team twice, and "TBD" is nobody's team to follow. */
  const teams = followableTeams(row.sport, row.away, row.home);
  if (teams.length === 0) return null;
  const mine = teams.filter(t => follow.followed.has(t.key));
  return (
    <DropdownMenu modal={false} onOpenChange={o => follow.onMenu(row.id, o)}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-follow-toggle={mine.length ? 'on' : 'off'}
          onPointerDown={() => { follow.pointerOpen.current = true; }}
          onKeyDown={() => { follow.pointerOpen.current = false; }}
          aria-label={mine.length
            ? `Following ${mine.map(t => t.name).join(' and ')}. Change who you follow`
            : `Follow ${teams.map(t => t.name).join(' or ')}`}
          className={`inline-flex items-center justify-center h-full w-8 shrink-0 text-[13px] leading-none transition-colors hover:bg-muted/40 ${mine.length ? 'text-[hsl(var(--ticker-late))]' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <span aria-hidden="true">{mine.length ? '★' : '☆'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        data-no-prerender="true"
        className="min-w-[13rem]"
        onCloseAutoFocus={e => { if (follow.pointerOpen.current) e.preventDefault(); }}
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Follow a team and its games lead the ticker</DropdownMenuLabel>
        {teams.map(t => (
          <DropdownMenuCheckboxItem
            key={t.key}
            data-follow-team={t.name}
            checked={follow.followed.has(t.key)}
            onCheckedChange={() => follow.onToggle(t.key)}
          >
            {t.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScoreCard({ row, hub, stale, follow }: { row: LiveScoreRow; hub: string; stale: boolean; follow: FollowProps }) {
  const home = teamShort(row.home, row.sport);
  const away = teamShort(row.away, row.sport);
  /* Round 711, D44: a game the feed stopped writing keeps its last real
     score but never says LIVE; it says when that score is from. */
  const asOf = stale ? startLabel(row.updated_at) : '';
  const state = stale
    ? (asOf ? `as of ${asOf}` : 'not updating')
    : row.live ? (row.status_long || 'Live') : row.finished ? 'Final' : startLabel(row.start_at);
  const liveNow = row.live && !stale;
  /* American sports read away then home ("Astros at Yankees"); soccer reads
     home then away. The strip follows the convention the fan expects. */
  const first = row.sport === 'soccer' ? [home, row.home_score] : [away, row.away_score];
  const second = row.sport === 'soccer' ? [away, row.away_score] : [home, row.home_score];
  return (
    <span data-no-prerender="true" className="inline-flex items-center h-full shrink-0 border-l border-border/60">
      <Link
        to={hub}
        data-no-prerender="true"
        data-score-card=""
        data-stale={stale ? 'true' : undefined}
        className="inline-flex items-center gap-1.5 h-full pl-3 pr-1 text-[11px] shrink-0 hover:bg-muted/40 transition-colors"
        aria-label={`${first[0]} ${first[1] ?? ''} ${row.sport === 'soccer' ? 'v' : 'at'} ${second[0]} ${second[1] ?? ''}, ${stale ? `score ${state}, not updating` : state}`}
      >
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-semibold text-foreground whitespace-nowrap">{first[0]}</span>
          {first[1] != null && <span className="tabular-nums font-bold text-foreground">{first[1]}</span>}
          <span className="text-muted-foreground px-0.5" aria-hidden="true">{row.sport === 'soccer' ? 'v' : '@'}</span>
          <span className="font-semibold text-foreground whitespace-nowrap">{second[0]}</span>
          {second[1] != null && <span className="tabular-nums font-bold text-foreground">{second[1]}</span>}
        </span>
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${stale ? 'text-[hsl(var(--ticker-late))]' : liveNow ? 'text-destructive' : row.finished ? 'text-muted-foreground' : 'text-primary'}`}>
          {liveNow && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />}
          {state}
        </span>
      </Link>
      <FollowStar row={row} follow={follow} />
    </span>
  );
}

function SportBox({ group, open, stale, follow }: { group: SportGroup; open: boolean; stale: ReadonlySet<string>; follow: FollowProps }) {
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
        {open && group.rows.map(r => <ScoreCard key={r.id} row={r} hub={group.hub} stale={stale.has(r.id)} follow={follow} />)}
      </span>
    </span>
  );
}

const HIDDEN_PREFIXES = ['/admin', '/reset-password'];

export function TopTicker({ scores = [], status = 'ok', checkedAt = null }: TopTickerProps) {
  const pathname = useRoutePath();
  /* Round 711: the freshness rules run once per read, against the server's
     clock at that read. Without a clock (a strip handed rows alone) the
     newest stamp stands in, which judges rows against each other only. */
  const board = useMemo(() => {
    const newest = scores.reduce((m, r) => Math.max(m, Date.parse(r?.updated_at ?? '') || 0), 0);
    return boardAt(scores, checkedAt ?? newest);
  }, [scores, checkedAt]);
  const [follows, setFollows] = useState<string[]>(() => readFollows());
  const followed = useMemo(() => new Set(follows), [follows]);
  const [filter, setFilter] = useState<string>(() => readSportFilter());
  const shown = useMemo(() => filterScores(board.rows, filter, followed), [board, filter, followed]);
  const groups = useMemo(() => groupScores(shown, followed), [shown, followed]);
  /* Round 711: the open box is remembered by SPORT, not by position. Starring
     a team moves its sport to the front, and a remembered index would then
     point at a different box and fold up the one the visitor was using. */
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  /* Round 711: an open menu (the filter, or a card's follow star) holds the
     wire still, or the card under the menu would crawl away from it. Ids are
     pruned against what is on screen, so a card that leaves the board with
     its menu open cannot park the wire for good. */
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const onMenu = useCallback((id: string, o: boolean) => {
    setOpenMenus(s => (o ? (s.includes(id) ? s : [...s, id]) : s.filter(x => x !== id)));
  }, []);
  const menuOpen = openMenus.some(id => id === 'filter' || shown.some(r => r.id === id));
  const pointerOpen = useRef(false);
  const chooseFilter = useCallback((v: string) => {
    setFilter(v);
    writeSportFilter(v);
    setOpenKey(null);
  }, []);
  const onToggle = useCallback((key: string) => {
    const next = toggleFollow(follows, key);
    setFollows(next);
    writeFollows(next);
    /* Unfollowing the last team while showing "My teams" would leave a wire
       with no card to star, and a menu hint pointing at stars that are not
       there. The filter falls back to every sport instead. */
    if (next.length === 0 && filter === FILTER_MINE) chooseFilter(FILTER_ALL);
  }, [follows, filter, chooseFilter]);
  const follow = useMemo<FollowProps>(() => ({ followed, onToggle, onMenu, pointerOpen }), [followed, onToggle, onMenu]);
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
  /* A feed refresh can shrink the group list under the pointer, and a filter
     or a follow can reorder it: the open box is found by its sport, and the
     first box opens when that sport has left the wire. */
  const open = Math.max(0, groups.findIndex(g => g.sport === openKey));
  const openSport = groups[open]?.sport ?? null;
  const lastSportRef = useRef<string | null>(null);
  useEffect(() => {
    if (reducedMotion || paused || userPaused || menuOpen || groups.length === 0) return undefined;
    const vp = viewportRef.current;
    if (!vp) return undefined;
    const fresh = lastSportRef.current !== openSport;
    lastSportRef.current = openSport;
    if (fresh) vp.scrollLeft = 0;
    const advance = () => setOpenKey(groups[(open + 1) % groups.length].sport);
    /* a fresh sport gets the reading hold; a resume after hover or pause
       picks up mid glide almost at once */
    let holdLeft = fresh ? 1500 : 350;
    /* Round 336, his report: "the ticker is moving really slow". 55 was
       measured live at 60 px/s, which on a 3000px day-ahead slate is nearly
       a minute per pass. Doubled, and the reading hold trimmed to match.
       Round 414, his report the other way: "put the ticker speed a little
       bit slower". 110 read as a blur once a sport carried twenty cards, so
       it comes down about a third, which is still nearly half again quicker
       than the 60 he called slow. A little bit slower, not back to before. */
    const SPEED = 75; // px per second, the cable crawl
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
        if (settled >= dwellMs(groups[open]?.rows.length ?? 0) && groups.length > 1) {
          advance();
          return;
        }
        raf = requestAnimationFrame(step);
        return;
      }
      vp.scrollLeft = vp.scrollLeft + (SPEED * dt) / 1000;
      if (vp.scrollLeft >= maxScroll - 1) {
        if (groups.length > 1) {
          advance();
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
  }, [open, openSport, groups, reducedMotion, paused, userPaused, menuOpen]);

  /* Round 711: a filter to one sport leaves a single box, and a single box
     that overflows still glides (it loops itself). The pause button used to
     show only for two or more boxes; it now shows for anything that moves.
     Showing it only takes width from the viewport, so it cannot flicker. */
  /* Measured twice: once now, and once more after the box's 500ms opening
     transition has run, because a box read while it is still sliding open
     from maxWidth 0 has almost no width and the button would stay hidden
     until the next read replaced the groups. A resize re-measures too. */
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      setOverflowing(!!vp && vp.scrollWidth - vp.clientWidth > 4);
    };
    measure();
    const settled = window.setTimeout(measure, 650);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(settled);
      window.removeEventListener('resize', measure);
    };
  }, [groups, open]);

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  const home = pathname === '/';
  const anyLive = groups.some(g => g.rows.some(r => r.live && !board.stale.has(r.id)));
  const answered = status !== 'loading';
  /* The sports the filter offers: whatever is on the wire now, plus a saved
     sport that is not on today, so the visitor can always get back out. */
  const sportsOnWire = groupScores(board.rows).map(g => g.sport);
  if (filter !== FILTER_ALL && filter !== FILTER_MINE && !sportsOnWire.includes(filter)) sportsOnWire.push(filter);
  /* Own keys only: a saved sport is text from localStorage, and a plain
     object answers "constructor" with a function, not a tag. */
  const tagOf = (s: string) => (Object.prototype.hasOwnProperty.call(SPORT_TAG, s) ? SPORT_TAG[s] : s.toUpperCase());
  const filterLabel = filter === FILTER_ALL ? 'All' : filter === FILTER_MINE ? 'My teams' : tagOf(filter);
  /* the phone strip is a third the width, so the button wears a short name */
  const filterShort = filter === FILTER_MINE ? 'Mine' : filterLabel;
  const showFilter = answered && (board.rows.length > 0 || filter !== FILTER_ALL);
  const updated = board.updatedAt != null ? startLabel(new Date(board.updatedAt).toISOString(), new Date(checkedAt ?? board.updatedAt)) : '';
  const stampLine = board.late ? `Delayed, updated ${updated}` : `Updated ${updated}`;
  /* D44: what the wire says when it has nothing. A read that failed is
     "unavailable", never "no games"; so is a read whose every row of
     today's slate was dropped as gone, because boardAt judges lateness on
     the rows it was handed, dropped ones included, and the newest of them
     can only be gone when it is itself past FEED_LATE_MS: the feed is late,
     not quiet. An answered read with no games says so; and a filter that
     empties the wire says which filter did it. */
  const emptyLine = !answered
    ? ''
    : board.rows.length === 0
      ? (status === 'failed' || board.late ? 'Live scores temporarily unavailable' : 'No games on the board right now')
      : groups.length === 0
        ? (filter === FILTER_MINE ? 'None of your teams are on the board right now' : `No ${filterLabel} games on the board right now`)
        : '';

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
        {(groups.length > 1 || overflowing) && !reducedMotion && (
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
            {emptyLine && (
              <span data-no-prerender="true" data-empty-line="" className="inline-flex items-center h-full px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                {emptyLine}
              </span>
            )}
            {reducedMotion
              ? groups.map(g => <SportBox key={g.sport} group={g} open stale={board.stale} follow={follow} />)
              : groups.map((g, i) => <SportBox key={g.sport} group={g} open={i === open} stale={board.stale} follow={follow} />)}
          </div>
        </div>
        {/* Round 711, D44: when the feed last wrote, from the poller's own
            stamp. Past two missed polls it turns into a plain Delayed notice
            in the late colour, so nothing on the wire passes for current.
            On a phone (the strip shows there on the home page only) the
            stamp and a long filter name would leave the wire narrower than
            one card, measured at 390px: so below md the stamp moves into
            the filter menu as its first line and the button wears the
            short name. */}
        {answered && updated && (
          <span
            data-no-prerender="true"
            data-feed-stamp={board.late ? 'late' : 'fresh'}
            title={board.late ? `The scores feed has not updated since ${updated}` : `Scores last updated ${updated}`}
            className={`shrink-0 h-full hidden md:inline-flex items-center px-2 border-l border-border/60 text-[10px] whitespace-nowrap ${board.late ? 'font-bold text-[hsl(var(--ticker-late))]' : 'text-muted-foreground'}`}
          >
            {stampLine}
          </span>
        )}
        {showFilter && (
          <DropdownMenu modal={false} onOpenChange={o => onMenu('filter', o)}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-no-prerender="true"
                data-sport-filter={filter}
                onPointerDown={() => { pointerOpen.current = true; }}
                onKeyDown={() => { pointerOpen.current = false; }}
                aria-label={`Showing ${filter === FILTER_ALL ? 'every sport' : filterLabel}. Choose what the ticker shows`}
                className="shrink-0 h-full min-w-8 inline-flex items-center gap-1 px-2 border-l border-border/60 text-[10px] font-black uppercase tracking-[0.12em] text-foreground hover:bg-muted/40 transition-colors"
              >
                <span className="md:hidden">{filterShort}</span>
                <span className="hidden md:inline">{filterLabel}</span>
                <span aria-hidden="true" className="text-muted-foreground">▾</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              data-no-prerender="true"
              className="min-w-[11rem]"
              onCloseAutoFocus={e => { if (pointerOpen.current) e.preventDefault(); }}
            >
              {updated && (
                <DropdownMenuLabel data-feed-stamp-phone={board.late ? 'late' : 'fresh'} className={`md:hidden text-[11px] font-normal ${board.late ? 'font-bold text-[hsl(var(--ticker-late))]' : 'text-muted-foreground'}`}>{stampLine}</DropdownMenuLabel>
              )}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Show scores for</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filter} onValueChange={chooseFilter}>
                <DropdownMenuRadioItem value={FILTER_ALL}>Every sport</DropdownMenuRadioItem>
                {(follows.length > 0 || filter === FILTER_MINE) && (
                  <DropdownMenuRadioItem value={FILTER_MINE}>My teams ({follows.length})</DropdownMenuRadioItem>
                )}
                {sportsOnWire.map(s => (
                  <DropdownMenuRadioItem key={s} value={s}>{tagOf(s)}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {follows.length === 0 && (
                <p className="px-2 pb-1.5 pt-1 text-[11px] leading-snug text-muted-foreground">Tap the star on any score to follow a team. Its games go first.</p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </section>
  );
}

export default TopTicker;
