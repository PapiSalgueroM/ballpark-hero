import { supabase } from '@/integrations/supabase/client';

/**
 * Wave 3: anonymous, sitewide completion tracking.
 *
 * public.game_completions (id, game text, completed_on date default utc-today,
 * created_at, score integer nullable, player_name text nullable).
 * RLS: anyone (anon + authenticated) can INSERT, anyone can SELECT.
 *
 * This is intentionally separate from the auth-gated tables written by
 * useGameCompletion (user_game_scores, daily_completions, user_scores,
 * user_best_scores, profiles) — those only ever get rows for logged-in users.
 * game_completions exists so "Most Played Today" and the sitewide today-count
 * reflect every visitor, logged in or not. No PII is ever sent: only the
 * game's route path, an optional numeric score, and a display handle (guest
 * handle or profile display name, never an email/user id).
 *
 * #102/#103: score + player_name were added (2026-07-03) so game_completions
 * can back the leaderboard (grouped max score per game/day) and, indirectly,
 * badges that read a player's own history. Both columns are nullable: older
 * rows and any caller that omits them just don't participate in ranked
 * views, they never error.
 */

const LOCAL_TODAY_KEY = 'dukb-local-completions';
const GUEST_HANDLE_KEY = 'dukb-guest-handle';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * This browser's persistent guest display handle, "Baller-1234" style.
 * Generated once and reused forever (until localStorage is cleared) so a
 * guest's leaderboard rows stay attributable to "the same player" across
 * sessions without ever requiring an account.
 *
 * Exported so Leaderboard.tsx (own-row highlight) and badges.ts / Profile.tsx
 * can read the same identity without duplicating the generation logic.
 */
export function getGuestHandle(): string {
  try {
    const existing = localStorage.getItem(GUEST_HANDLE_KEY);
    if (existing) return existing;
    const handle = `Baller-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(GUEST_HANDLE_KEY, handle);
    return handle;
  } catch {
    // localStorage unavailable, fall back to a per-call random handle.
    // Not persisted, so it won't match across renders, but it still lets an
    // insert carry a name rather than null.
    return `Baller-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

/**
 * The display handle to attribute a completion/leaderboard row to right now:
 * the signed-in profile's display_name or username if available, else the
 * persistent local guest handle. This is a point-in-time read, not reactive:
 * callers that need to react to a profile edit should re-read it, it does
 * not subscribe to anything.
 */
export function getCurrentPlayerName(profile?: { display_name?: string | null; username?: string | null } | null): string {
  const fromProfile = profile?.display_name || profile?.username;
  return fromProfile || getGuestHandle();
}

/**
 * Fire-and-forget insert into game_completions. Never throws, never blocks
 * gameplay: any failure (network, RLS, offline) is caught and swallowed.
 *
 * @param gamePath the game's route path, e.g. '/soccer-grid'. Leading slash
 * is stripped so the stored value is a bare slug like the rest of the site's
 * conventions (gameRegistry paths minus the leading '/').
 * @param score optional numeric score for this completion. Omitted/undefined
 * keeps the row out of leaderboard aggregation (score stays null) but the
 * insert still happens, matching the table's nullable-by-design column.
 * @param playerName optional display handle to attribute the score to. If
 * omitted, falls back to getCurrentPlayerName() with no profile (i.e. the
 * local guest handle), so every insert always carries some name.
 */
export function recordCompletion(gamePath: string, score?: number, playerName?: string): void {
  try {
    const game = gamePath.replace(/^\//, '');
    if (!game) return;

    const row: { game: string; score?: number; player_name?: string } = { game };
    if (typeof score === 'number' && Number.isFinite(score)) {
      row.score = score;
    }
    row.player_name = playerName || getCurrentPlayerName();

    // Supabase client typings don't know about game_completions yet (it was
    // added directly via SQL, not through a generated-types migration), so
    // this table is addressed dynamically rather than through the typed
    // `.from()` overloads.
    (supabase.from as any)('game_completions')
      .insert(row)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          // Swallow silently, this must never surface to the player.
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
