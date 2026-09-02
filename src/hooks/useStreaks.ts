import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getStreakState,
  getTopPerGameStreaks,
  getVisitStreakFrom,
  recordGameCompletion,
  recordVisit,
  type StreakState,
} from '@/lib/streaks';

/**
 * React wrapper around src/lib/streaks.ts (#101).
 *
 * Local-first by design: every value here is readable and correct for
 * guests (no login required to play anything, per this app's guest-first
 * posture). Signed-in saves are also backed up to profiles.streak_state, and
 * AuthContext restores that snapshot after sign-in. Nothing in this hook
 * ever blocks or throws on account of a sync attempt; the local read/write
 * path stays instant even when the network is unavailable.
 */

/**
 * Attempts to push the local streak snapshot up to a durable per-user store
 * so it survives a browser reset / new device, "best effort, never
 * blocking" per the spec.
 *
 * The live profiles table has a per-user streak_state jsonb column and an
 * owner-write RLS policy. This remains best effort: a failed backup never
 * interrupts a game, and the next signed-in completion tries again.
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
  /** Consecutive ET days visited ending today (yesterday-grace), for the "days in a row" stat. */
  visitStreakDays: number;
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

  useEffect(() => {
    const onRestore = () => refresh();
    window.addEventListener('dukb-streaks-restored', onRestore);
    window.addEventListener('dukb-streaks-changed', onRestore);
    return () => {
      window.removeEventListener('dukb-streaks-restored', onRestore);
      window.removeEventListener('dukb-streaks-changed', onRestore);
    };
  }, [refresh]);

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
    visitStreakDays: getVisitStreakFrom(state.loginDates),
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
