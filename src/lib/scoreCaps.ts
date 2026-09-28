import { supabase } from '@/integrations/supabase/client';
import { settlePendingPoints } from '@/lib/streaks';
import { CAPS_CACHE_KEY, CAPS_FRESH_MS, parseCapsCache, storedCap, type ScoreCaps } from '@/lib/pointsRule';

/**
 * Round 648: the caps the profile's points rule reads (src/lib/pointsRule.ts),
 * from public.game_score_caps, cached in this browser.
 *
 * WHY THE TABLE AND NOT THE VIEW. public.game_denominators is a view over this
 * same table whose NULL cap fallback runs a percentile over game_completions,
 * the table Round 370 (supabase/migrations/20260831_disk_io_leaderboard_cache.sql)
 * took off the page path after the Disk IO budget alert. The table is a plain
 * read of about 150 rows (151 on 2026-09-28), public read, and after Round
 * 646 every scored game's row in it is that game's real ceiling.
 * record_auth_completion and the recompute in the Round 648 migrations read
 * the same table with the same rule, so the total this browser shows and the
 * one the database stores agree.
 *
 * The cache is one localStorage key, refreshed when older than FRESH_MS, so a
 * profile view or a play reads the table at most once in six hours per
 * browser. A read that comes back empty is a failed read, never "nothing is
 * allowed to score": an empty allowlist does not exist in production, and
 * trusting one would drop every held play to nothing.
 *
 * The browser's tally (src/lib/streaks.ts) credits a play at record time with
 * knownCap(); a play whose game this browser has no cap for yet is held there
 * and settled when a fresh read lands, which recordCompletion kicks off on
 * every play.
 *
 * Fence: scripts/simProfileTotal.mjs (src/test/profileTotal.test.tsx).
 */

/* The key and the freshness window live beside the rule (src/lib/pointsRule.ts),
   because the streak store reads this same copy to check a tally it counted
   before the rule (src/lib/streaks.ts). */
const CACHE_KEY = CAPS_CACHE_KEY;
const FRESH_MS = CAPS_FRESH_MS;

interface CachedCaps {
  caps: ScoreCaps;
  fetchedAt: number;
}

let memory: CachedCaps | null = null;
let inFlight: Promise<ScoreCaps | null> | null = null;

function readCache(): CachedCaps | null {
  try {
    return parseCapsCache(localStorage.getItem(CACHE_KEY));
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

/**
 * The cached cap for a slug: a number, null for a row with no ceiling on
 * record, or undefined when this browser has no cap for it (the table not
 * read yet, or a game newer than the copy). Synchronous, so the recorder can
 * credit a play in place.
 */
export function knownCap(slug: string): number | null | undefined {
  if (!memory) memory = readCache();
  if (!memory || !Object.prototype.hasOwnProperty.call(memory.caps, slug)) return undefined;
  return memory.caps[slug];
}

/**
 * A fresh read of public.game_score_caps. On success it replaces the cache
 * and settles every play the streak store was holding for a cap. Never
 * throws; null means the table could not be read and nothing changed.
 */
export async function fetchScoreCaps(): Promise<ScoreCaps | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      /* The table is newer than the generated types, same dynamic access as
         src/pages/RarityRound.tsx. About 150 rows, under the 1,000 row
         response cap, so no paging. */
      const { data, error } = await (supabase.from as any)('game_score_caps').select('game, max_score');
      if (error || !Array.isArray(data)) return null;
      const caps: ScoreCaps = {};
      for (const row of data as Array<{ game?: unknown; max_score?: unknown }>) {
        if (typeof row?.game !== 'string' || !row.game) continue;
        const value = storedCap(row.max_score);
        if (value !== undefined) caps[row.game] = value;
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

/** The caps, from the cache while it is fresh, else from a read of the table; the stale cache if the read fails; null when there is nothing at all. */
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
