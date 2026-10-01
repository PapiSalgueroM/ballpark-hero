/**
 * Round 287: real scores for the ticker, read from the table the poller keeps.
 *
 * HOW THE DATA GETS HERE. supabase/functions/scores-poll asks the free feed
 * for today's games every 20 minutes and writes what it gets into
 * public.live_scores. Nothing in the browser ever talks to the feed: this file
 * reads the table through the ordinary anon client, once on mount and every
 * five minutes after that. A poll that failed leaves stale rows, and stale
 * rows are filtered by start time here, so the worst case is a quiet ticker,
 * never a wrong one.
 *
 * Nothing here is invented: every line is a real fixture with the status the
 * feed gave it. When the feed says nothing about a day, the ticker says
 * nothing about it either.
 *
 * The Supabase client is imported from the one place that knows the live
 * project. Never read VITE_SUPABASE_* (see CLAUDE.md).
 */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export interface LiveScoreRow {
  id: string;
  sport: 'nfl' | 'nba' | 'mlb' | 'nhl' | 'soccer' | string;
  league: string;
  home: string;
  away: string;
  home_score: number | null;
  away_score: number | null;
  status_short: string;
  status_long: string;
  start_at: string;
  live: boolean;
  finished: boolean;
  updated_at: string;
}

/** Where a sport's card sends you: its hub. */
export const SPORT_HUB: Record<string, string> = {
  nfl: '/pro-football',
  nba: '/pro-basketball',
  mlb: '/baseball',
  nhl: '/hockey',
  soccer: '/soccer',
  /* Round 414: the sports the owner asked for. Each tag links somewhere the
     site actually has games for that sport; tennis has no hub, so its tag
     goes to the tennis game rather than to the home page. */
  cfb: '/college',
  cbb: '/college',
  wnba: '/pro-basketball',
  tennis: '/tennis-chain',
};

export const SPORT_TAG: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  mlb: 'MLB',
  nhl: 'NHL',
  soccer: 'SOCCER',
  cfb: 'CFB',
  cbb: 'CBB',
  wnba: 'WNBA',
  tennis: 'TENNIS',
};

/* The feed gives full names ("New York Yankees"). A ticker wants the part a
   fan says. Two word nicknames are listed because "Sox" and "Jays" on their
   own are not names anyone uses; everything else takes its last word. Soccer
   clubs are already short and are left whole. */
const TWO_WORD = ['Red Sox', 'White Sox', 'Blue Jays', 'Trail Blazers', 'Maple Leafs', 'Golden Knights', 'Red Wings', 'Blue Jackets'];
export function teamShort(name: string, sport: string): string {
  const n = (name || '').trim();
  if (!n) return '';
  if (sport === 'soccer') return n.length > 19 ? n.slice(0, 18).trimEnd() + '.' : n;
  for (const t of TWO_WORD) if (n.endsWith(t)) return t;
  const parts = n.split(/\s+/);
  return parts[parts.length - 1];
}

/** How far the ticker looks: games that started in the last twelve hours or
 *  start in the next twenty, so a finished game keeps its score on the strip
 *  through the morning after and tonight's games appear by lunchtime. */
export const LOOKBACK_MS = 12 * 3600 * 1000;
export const LOOKAHEAD_MS = 20 * 3600 * 1000;

export function windowFor(now: Date): { from: string; to: string } {
  return {
    from: new Date(now.getTime() - LOOKBACK_MS).toISOString(),
    to: new Date(now.getTime() + LOOKAHEAD_MS).toISOString(),
  };
}

/** Live games first, then the ones about to start, then the finals, each in
 *  kickoff order. Whatever the sport, the thing happening right now leads. */
export function sortForTicker(rows: LiveScoreRow[]): LiveScoreRow[] {
  const rank = (r: LiveScoreRow) => (r.live ? 0 : !r.finished ? 1 : 2);
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.start_at.localeCompare(b.start_at));
}

/** A row that cannot be shown honestly is not shown at all. */
export function isShowable(r: LiveScoreRow): boolean {
  if (!r.home || !r.away || !r.start_at) return false;
  if ((r.live || r.finished) && (r.home_score == null || r.away_score == null)) return false;
  return true;
}

/* Round 711, the failure modes. What the poller really does, read from
   supabase/functions/scores-poll and measured against the table on
   2026-09-30: each run asks the feeds for ONE New York date and rewrites
   every row it gets back, stamping each with updated_at, the moment it
   fetched. The every-20-minutes cron asks for today in New York, so today's
   slate is rewritten every 20 minutes (measured: 26 unfinished rows of the
   day, none more than 2 seconds apart). Rows for any other date come from
   the separate day=1 cron, which runs hours apart (stamps seen at 16:05Z
   and 22:05Z), and from the follow-up pass that polls yesterday's date
   through the morning so a game crossing midnight gets its final. So the
   only stamps that can stand in for the 20 minute clock are those on rows
   whose start falls on today's New York date; tomorrow's rows are judged
   only by their own start time (not started and not due yet is always
   current), and nothing here ever says a score is current because the
   browser's clock says so. */

/** No write for this long means at least two polls went missing. */
export const FEED_LATE_MS = 45 * 60 * 1000;
/** A row this far behind the newest write has dropped out of the feed:
 *  one missed poll is noise, a second is the feed no longer carrying it. */
export const ROW_DROPPED_MS = 30 * 60 * 1000;

const stamp = (iso: unknown): number => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : NaN;
};

const NY_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

/** The New York calendar date a moment belongs to, the way the poller
 *  buckets a slate, as YYYY-MM-DD; '' for a moment that is not one. */
export function nyDateOf(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  try { return NY_DAY.format(new Date(ms)); } catch { return ''; }
}

/** When the poller last wrote anything on this board: the newest
 *  updated_at among its rows, or null when no row carries one. */
export function feedUpdatedAt(rows: LiveScoreRow[]): number | null {
  let newest: number | null = null;
  for (const r of rows) {
    const t = stamp(r?.updated_at);
    if (Number.isFinite(t) && (newest == null || t > newest)) newest = t;
  }
  return newest;
}

/** The browser side of the watchdog: the newest write is older than two
 *  missed polls. A board with no stamp at all is not called late here, it
 *  is called empty or unavailable by whoever renders it. */
export function feedIsLate(updatedAt: number | null, now: number): boolean {
  return updatedAt != null && now - updatedAt > FEED_LATE_MS;
}

/**
 * What a row may honestly say.
 *  current: the feed is still writing it (or it is final, and a final score
 *           does not go stale).
 *  stale:   a game shown as live that the feed stopped writing. Its last
 *           score is real, so it stays, but it says when it is from and it
 *           never says LIVE.
 *  gone:    a game that should have started by now, still marked not
 *           started, that the feed stopped writing. Whatever happened, the
 *           start time on the card is no longer true, so it is not shown.
 * A game that has not started and is not due yet keeps its start time even
 * when its row is old: the start time is still the best fact there is.
 */
export type RowFreshness = 'current' | 'stale' | 'gone';

export function rowFreshness(r: LiveScoreRow, feedNewest: number | null, now: number): RowFreshness {
  if (r.finished) return 'current';
  const t = stamp(r.updated_at);
  const behind = !Number.isFinite(t)
    || (feedNewest != null && feedNewest - t > ROW_DROPPED_MS)
    || now - t > FEED_LATE_MS;
  if (!behind) return 'current';
  if (r.live) return 'stale';
  const start = stamp(r.start_at);
  return Number.isFinite(start) && start <= now ? 'gone' : 'current';
}

export interface LiveBoard {
  /** the rows that may be shown, gone ones removed */
  rows: LiveScoreRow[];
  /** ids of live rows the feed stopped writing */
  stale: Set<string>;
  /** the newest write on the board, the "Updated" time */
  updatedAt: number | null;
  /** the newest write is older than FEED_LATE_MS */
  late: boolean;
}

/** The rows the 20 minute cron owns: those whose start falls on today's
 *  New York date. Their stamps are the only honest clock for the watchdog. */
export function todaysRows(rows: LiveScoreRow[], now: number): LiveScoreRow[] {
  const today = nyDateOf(now);
  return rows.filter(r => !!r && nyDateOf(stamp(r.start_at)) === today);
}

/** Every freshness rule applied to one read of the table at one moment.
 *  Lateness is judged on today's rows only: a board carrying nothing but
 *  tomorrow's slate has no 20 minute clock to be late against, and its
 *  newest write is shown as the "Updated" time without the alarm. */
export function boardAt(rows: LiveScoreRow[], now: number): LiveBoard {
  const owned = todaysRows(rows, now);
  const updatedAt = feedUpdatedAt(owned.length ? owned : rows);
  const stale = new Set<string>();
  const kept: LiveScoreRow[] = [];
  for (const r of rows) {
    if (!r) continue;
    const f = rowFreshness(r, updatedAt, now);
    if (f === 'gone') continue;
    if (f === 'stale') stale.add(r.id);
    kept.push(r);
  }
  return { rows: kept, stale, updatedAt, late: owned.length > 0 && feedIsLate(updatedAt, now) };
}

/** Twelve hour clock in the visitor's own zone, e.g. "7:05 PM". Only ever
 *  rendered live in a browser; the prerenderer never sees a score row. */
export function startLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  const day = d.toLocaleDateString([], { weekday: 'short' });
  return `${day} ${time}`;
}

/* Plain REST rather than the typed client, because the generated Database
   type does not know this table yet and every other workaround in the repo is
   a cast to any. The URL and key come from the one file that knows the live
   project. Read only: the anon policy on live_scores is select and nothing
   else.
   Round 711: a failed read answers null instead of an empty list, because
   "no games today" and "we could not ask" are different things to tell a
   fan. And the answer carries the database's own clock (the Date header,
   which the API exposes to the browser), so the freshness rules compare the
   poller's stamps with the server's time, never with a visitor's clock that
   may be an hour out. The limit went from 60 to 150: on 2026-09-30 the
   window held 99 rows, 89 of them tennis, and the oldest-first cut at 60
   was dropping that evening's games, which a sport filter or a followed
   team would then have come up empty on. */
export interface LiveRead {
  rows: LiveScoreRow[];
  /** the server's time when it answered, or null if it did not say */
  serverNow: number | null;
}

export async function fetchLiveBoard(now: Date = new Date()): Promise<LiveRead | null> {
  try {
    const { from, to } = windowFor(now);
    const params = new URLSearchParams({
      select: '*',
      order: 'start_at.asc',
      limit: '150',
    });
    params.append('start_at', `gte.${from}`);
    params.append('start_at', `lte.${to}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/live_scores?${params.toString()}`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return null;
    const server = Date.parse(res.headers.get('date') ?? '');
    return {
      rows: sortForTicker((data as LiveScoreRow[]).filter(r => !!r && isShowable(r))),
      serverNow: Number.isFinite(server) ? server : null,
    };
  } catch {
    return null;
  }
}
