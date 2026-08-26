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
};

export const SPORT_TAG: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  mlb: 'MLB',
  nhl: 'NHL',
  soccer: 'SOCCER',
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
   else. */
export async function fetchLiveScores(now: Date = new Date()): Promise<LiveScoreRow[]> {
  try {
    const { from, to } = windowFor(now);
    const params = new URLSearchParams({
      select: '*',
      order: 'start_at.asc',
      limit: '60',
    });
    params.append('start_at', `gte.${from}`);
    params.append('start_at', `lte.${to}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/live_scores?${params.toString()}`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return sortForTicker((data as LiveScoreRow[]).filter(isShowable));
  } catch {
    return [];
  }
}
