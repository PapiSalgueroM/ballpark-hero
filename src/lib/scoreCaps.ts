import { supabase } from '@/integrations/supabase/client';
import { settlePendingPoints } from '@/lib/streaks';

/**
 * Round 648: every points total on the profile clamps each record at its
 * game's cap before adding it, with the SAME caps the World Leaderboard uses.
 *
 * WHAT WAS WRONG. The profile's all time total was two running sums of raw
 * scores: user_scores.total_points on the server (record_auth_completion added
 * p_score as sent) and the browser's own tally in src/lib/streaks.ts (the
 * recorder added the score as sent). Pack Battle records the banked value of
 * a pack in dollars, so one pack added about 8,800,000 to a total in which a
 * finished Club Manager season is worth at most 130. Every other number on
 * the page that reads that total (the average score, the points badges, the
 * points achievements) inherited the same distortion.
 *
 * THE CAPS SOURCE IS THE BOARD'S. global_leaderboard and global_rank
 * (supabase/migrations/20260911_leaderboard_eastern_day.sql) score a play as
 * least(score, d.max_score) against public.game_denominators, the view over
 * game_score_caps that Round 360 made the allowlist: a frozen cap where one is
 * known, the game's own 99th percentile otherwise, floored at 1, and NO ROW
 * for a game that is not allowed to score. This module reads that view and
 * nothing else, so the profile and the board cannot disagree about what a
 * record is worth. A record whose game has no row contributes nothing here,
 * exactly as it contributes nothing on the board; simLeaderboardCaps is the
 * fence that keeps every shipped game in the view.
 *
 * THE BROWSER'S TALLY HAS TO CLAMP AT RECORD TIME, because it keeps a sum and
 * not the records, so it cannot be repaired on display. The recorder asks
 * knownCap() for the slug's cap from the cached copy of the view and hands it
 * to the streak store; when the cap is not cached yet (first play in a fresh
 * browser, or the site offline) the play is held on the store's pending list
 * and settled the moment a fresh read of the view lands, which recordCompletion
 * kicks off on every play. Nothing is ever added at a value nobody decided.
 *
 * The cache is one localStorage key, refreshed when older than FRESH_MS. A
 * read that comes back empty is treated as a failed read, never as "nothing is
 * allowed to score", because an empty allowlist does not exist in production
 * and trusting one would drop every pending play to zero.
 *
 * Fence: scripts/simProfileTotal.mjs (src/test/profileTotal.test.tsx).
 */

/** Completion slug to the board's denominator for it: an integer of at least 1. */
export type ScoreCaps = Record<string, number>;

export interface ScoreRecord {
  game: string;
  score: number | null | undefined;
}

const CACHE_KEY = 'dukb-score-caps-v1';
const FRESH_MS = 6 * 60 * 60 * 1000;

interface CachedCaps {
  caps: ScoreCaps;
  fetchedAt: number;
}

let memory: CachedCaps | null = null;
let inFlight: Promise<ScoreCaps | null> | null = null;

/** The points one record is worth: rounded, never negative, at most the cap. */
export function clampScore(score: number, cap: number): number {
  const points = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;
  return Math.min(points, cap);
}

function validCap(cap: unknown): cap is number {
  return typeof cap === 'number' && Number.isFinite(cap) && cap >= 1;
}

/**
 * Pure. The sum of the records with each one clamped at its game's cap. A
 * record whose game has no cap counts for nothing, the board's own rule for a
 * game that is not on the allowlist.
 */
export function sumClampedRecords(records: ScoreRecord[], caps: ScoreCaps): number {
  let total = 0;
  for (const record of records) {
    if (!record || typeof record.game !== 'string') continue;
    const cap = caps[record.game];
    if (!validCap(cap)) continue;
    total += clampScore(Number(record.score), cap);
  }
  return total;
}

function readCache(): CachedCaps | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.fetchedAt !== 'number' || !parsed.caps || typeof parsed.caps !== 'object') return null;
    const caps: ScoreCaps = {};
    for (const [game, cap] of Object.entries(parsed.caps)) if (validCap(cap)) caps[game] = cap;
    return Object.keys(caps).length ? { caps, fetchedAt: parsed.fetchedAt } : null;
  } catch {
    return null;
  }
}

function writeCache(entry: CachedCaps): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* storage unavailable: the in memory copy still serves this page load */
  }
}

/** The cached cap for a slug, or undefined when this browser has not read the view yet. Synchronous, so the recorder can clamp in place. */
export function knownCap(slug: string): number | undefined {
  if (!memory) memory = readCache();
  const cap = memory?.caps[slug];
  return validCap(cap) ? cap : undefined;
}

/**
 * A fresh read of public.game_denominators. On success it replaces the cache
 * and settles every play the streak store was holding for a cap. Never
 * throws; null means the view could not be read and nothing changed.
 */
export async function fetchScoreCaps(): Promise<ScoreCaps | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      /* The view is newer than the generated types, same dynamic access as the
         rest of the scoring pipeline. About 130 rows, well under the 1,000 row
         response cap, so no paging. */
      const { data, error } = await (supabase.from as any)('game_denominators').select('game, max_score');
      if (error || !Array.isArray(data)) return null;
      const caps: ScoreCaps = {};
      for (const row of data as Array<{ game?: unknown; max_score?: unknown }>) {
        const cap = Number(row?.max_score);
        if (typeof row?.game === 'string' && row.game && validCap(cap)) caps[row.game] = cap;
      }
      if (!Object.keys(caps).length) return null;
      memory = { caps, fetchedAt: Date.now() };
      writeCache(memory);
      settlePendingPoints(caps);
      return caps;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** The caps, from the cache while it is fresh, else from a read of the view; the stale cache if the read fails; null when there is nothing at all. */
export async function primeScoreCaps(): Promise<ScoreCaps | null> {
  if (!memory) memory = readCache();
  if (memory && Date.now() - memory.fetchedAt < FRESH_MS) return memory.caps;
  const fetched = await fetchScoreCaps();
  return fetched ?? memory?.caps ?? null;
}

/** Test seam: forget the in memory copy so a test can start from an empty browser. */
export function resetScoreCapsForTests(): void {
  memory = null;
  inFlight = null;
}
