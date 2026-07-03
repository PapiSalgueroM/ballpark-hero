import { supabase } from '@/integrations/supabase/client';

/**
 * Wave 3: anonymous, sitewide completion tracking.
 *
 * public.game_completions (id, game text, completed_on date default utc-today, created_at)
 * RLS: anyone (anon + authenticated) can INSERT, anyone can SELECT.
 *
 * This is intentionally separate from the auth-gated tables written by
 * useGameCompletion (user_game_scores, daily_completions, user_scores,
 * user_best_scores, profiles) — those only ever get rows for logged-in users.
 * game_completions exists so "Most Played Today" and the sitewide today-count
 * reflect every visitor, logged in or not. No PII is ever sent: only the
 * game's route path.
 */

const LOCAL_TODAY_KEY = 'dukb-local-completions';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fire-and-forget insert into game_completions. Never throws, never blocks
 * gameplay: any failure (network, RLS, offline) is caught and swallowed.
 *
 * @param gamePath the game's route path, e.g. '/soccer-grid'. Leading slash
 * is stripped so the stored value is a bare slug like the rest of the site's
 * conventions (gameRegistry paths minus the leading '/').
 */
export function recordCompletion(gamePath: string): void {
  try {
    const game = gamePath.replace(/^\//, '');
    if (!game) return;

    // Supabase client typings don't know about game_completions yet (it was
    // added directly via SQL, not through a generated-types migration), so
    // this table is addressed dynamically rather than through the typed
    // `.from()` overloads.
    (supabase.from as any)('game_completions')
      .insert({ game })
      .then(({ error }: { error: unknown }) => {
        if (error) {
          // Swallow silently — this must never surface to the player.
          console.debug('[completions] insert failed (ignored):', error);
        }
      });

    bumpLocalTodayCount();
  } catch {
    // Never let a tracking failure break gameplay.
  }
}

/**
 * Local, same-browser count of completions recorded today, used as the
 * instant/optimistic half of the header's daily score chip so it doesn't
 * have to wait on a round trip for the player's own most recent completion.
 */
function bumpLocalTodayCount(): void {
  try {
    const today = todayStr();
    const raw = localStorage.getItem(LOCAL_TODAY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const count = parsed && parsed.date === today ? (parsed.count || 0) + 1 : 1;
    localStorage.setItem(LOCAL_TODAY_KEY, JSON.stringify({ date: today, count }));
  } catch {
    /* localStorage unavailable (quota/private mode) — not critical */
  }
}

/** Reads today's locally-tracked completion count for this browser only. */
export function getLocalTodayCount(): number {
  try {
    const raw = localStorage.getItem(LOCAL_TODAY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return parsed && parsed.date === todayStr() ? (parsed.count || 0) : 0;
  } catch {
    return 0;
  }
}
