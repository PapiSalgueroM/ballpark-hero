import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getStreakState,
  getTopPerGameStreaks,
  recordGameCompletion,
  recordVisit,
  type StreakState,
} from '@/lib/streaks';

/**
 * React wrapper around src/lib/streaks.ts (#101).
 *
 * Local-first by design: every value here is readable and correct for
 * guests (no login required to play anything, per this app's guest-first
 * posture). Signed-in sync is best-effort ONLY and, as of this writing, is
 * a documented no-op - see the comment on syncToProfileIfPossible below for
 * why. Nothing in this hook ever blocks or throws on account of the sync
 * attempt; the local read/write path is the source of truth regardless of
 * auth state.
 */

/**
 * Attempts to push the local streak snapshot up to a durable per-user store
 * so it survives a browser reset / new device, "best effort, never
 * blocking" per the spec.
 *
 * As of this writing there is nowhere to sync TO: the `profiles` table does
 * not exist in the live Supabase project (verified directly against
 * information_schema.columns and list_tables on flawuiqbvjobmkfkauhw --
 * it returned zero rows / "relation does not exist"), and no other table
 * has a suitable jsonb or dedicated streak column either. Per the build
 * spec ("If no suitable column exists, keep it local-only and PROPOSE the
 * exact ALTER TABLE in your report, do not run it"), this function is a
 * deliberate no-op stub rather than a blind write against a table that
 * isn't there. The proposed DDL lives in the accompanying report/PR
 * description, not in this file, since this task's edit list does not
 * include running migrations.
 *
 * Once a real table+column exists, this is the only function that needs to
 * change: swap the early return for an upsert of `state` (or a trimmed
 * projection of it) keyed by user.id, still wrapped in try/catch, still
 * fire-and-forget.
 */
async function syncToProfileIfPossible(userId: string, state: StreakState): Promise<void> {
  // The profiles table now exists (created 2026-07-03: user_id unique,
  // streak_state jsonb, RLS "Users manage own profile" + public read).
  // Best effort, fire-and-forget: failures are swallowed and the local
  // store stays the source of truth. Dynamic access because the table is
  // newer than the generated types (same pattern as src/lib/completions.ts).
  try {
    await (supabase.from as any)('profiles').upsert(
      { user_id: userId, streak_state: state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  } catch {
    // best effort only
  }
}

export interface UseStreaksResult {
  /** Current global "played anything today" streak, 0 if broken/never started. */
  globalCurrentStreak: number;
  /** Best global streak ever reached on this browser. */
  globalLongestStreak: number;
  /** Top N per-game streaks by longest, for Profile's "per-game best streaks" list. */
  topGameStreaks: Array<{ gameSlug: string; current: number; longest: number }>;
  /** Distinct ET days the app has been opened (this browser), for days-visited stats. */
  daysVisited: number;
  /** Lifetime game completions on this browser (Profile "games played"). */
  totalPlays: number;
  /** Lifetime points from completed games on this browser (Profile "points"). */
  totalPoints: number;
  /** Re-reads localStorage into state. Call after an external write (e.g. right after a completion) if you're not going through recordCompletion below. */
  refresh: () => void;
  /** Records a completed game's streak credit, then refreshes local state and best-effort syncs. This is what useGameCompletion's one-line hook-in calls. */
  recordCompletion: (gameSlug: string) => void;
}

export function useStreaks(): UseStreaksResult {
  const { user } = useAuth();
  const [state, setState] = useState<StreakState>(() => getStreakState());

  const refresh = useCallback(() => {
    setState(getStreakState());
  }, []);

  // Record "app opened today" once per mount for the days-visited stat.
  // Idempotent per ET day inside recordVisit itself, so mounting this hook
  // from multiple components in the same page load never inflates the count.
  useEffect(() => {
    recordVisit();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordCompletion = useCallback((gameSlug: string) => {
    const next = recordGameCompletion(gameSlug);
    setState(next);
    if (user) {
      // Fire-and-forget, never awaited by the caller, never throws.
      syncToProfileIfPossible(user.id, next).catch(() => { /* best effort only */ });
    }
  }, [user]);

  const topGameStreaks = getTopPerGameStreaksFrom(state, 5);

  return {
    globalCurrentStreak: state.global.current,
    globalLongestStreak: state.global.longest,
    topGameStreaks,
    daysVisited: state.loginDates.length,
    totalPlays: state.totalPlays ?? 0,
    totalPoints: state.totalPoints ?? 0,
    refresh,
    recordCompletion,
  };
}

/** Same ranking as getTopPerGameStreaks() in lib/streaks.ts, but derived from an already-loaded state object instead of re-reading localStorage, so render doesn't do a redundant read. */
function getTopPerGameStreaksFrom(state: StreakState, n: number) {
  return Object.entries(state.perGame)
    .map(([gameSlug, entry]) => ({ gameSlug, current: entry.current, longest: entry.longest }))
    .filter(g => g.longest > 0)
    .sort((a, b) => b.longest - a.longest || a.gameSlug.localeCompare(b.gameSlug))
    .slice(0, n);
}

// Re-exported so Profile.tsx can pull a one-off snapshot without mounting
// the hook if that's ever more convenient (kept for parity with lib/streaks.ts's exports).
export { getTopPerGameStreaks };
