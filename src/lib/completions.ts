import { supabase } from '@/integrations/supabase/client';
import { recordGameCompletion as recordStreakCompletion } from '@/lib/streaks';

/**
 * Wave 3: anonymous, sitewide completion tracking.
 *
 * public.game_completions (id, game text, completed_on date default utc-today,
 * created_at, score integer nullable, player_name text nullable).
 * RLS: anyone (anon + authenticated) can INSERT, anyone can SELECT.
 *
 * This is intentionally separate from the auth-gated tables written by
 * useGameCompletion (user_game_scores, daily_completions, user_scores,
 * user_best_scores, profiles), those only ever get rows for logged-in users.
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
/* Round 299, off the owner's leaderboard note ("everyone is just called
   baller and something... not a single person with an actual name"). Guests
   dominate the board, and every guest was minted as Baller-NNNN, so the
   whole board read as one person. New guests draw from a sports word pair
   instead, over 1,600 combinations before the number against the old 9,000
   copies of one name, so the board reads like a crowd. Existing stored handles are untouched: a returning guest keeps the
   name their old rows are under, because renaming them would orphan their
   own history in front of them. No real person's name and no product name
   is in these lists, and none may ever be added: an invented handle that
   collides with a real player reads as that player on a public board. */
const HANDLE_LEFT = [
  'Clinical', 'Rapid', 'Icy', 'Golden', 'Fearless', 'Crafty', 'Late', 'Prime',
  'Rowdy', 'Silky', 'Humble', 'Electric', 'Stubborn', 'Lucky', 'Vintage', 'Sunday',
  'Marauding', 'Tidy', 'Frozen', 'Wired', 'Casual', 'Furious', 'Patient', 'Slick',
  'Roaming', 'Quiet', 'Bold', 'Scrappy', 'Steady', 'Wild', 'Sharp', 'Heavy',
  'Nutmeg', 'Overtime', 'Backpost', 'Boxout', 'Curveball', 'Fadeaway', 'Offside', 'Powerplay', 'Baller',
] as const;
const HANDLE_RIGHT = [
  'Volley', 'Winger', 'Keeper', 'Slugger', 'Playmaker', 'Sweeper', 'Anchor', 'Closer',
  'Dime', 'Enforcer', 'Poacher', 'Regista', 'Southpaw', 'Snapper', 'Gaffer', 'Utility',
  'Fullback', 'Shortstop', 'Blueliner', 'Sixthman', 'Returner', 'Libero', 'Pinch', 'Deke',
  'Screamer', 'Worldie', 'Rebounder', 'Freekick', 'Slapshot', 'Buzzer', 'Handoff', 'Hatty',
  'Rondo', 'Tifo', 'Boxscore', 'Dugout', 'Paint', 'Pocket', 'Glueguy', 'Grinder', 'Baller',
] as const;

export function getGuestHandle(): string {
  const mint = () => {
    const left = HANDLE_LEFT[Math.floor(Math.random() * HANDLE_LEFT.length)];
    let right = HANDLE_RIGHT[Math.floor(Math.random() * HANDLE_RIGHT.length)];
    if (right === left) right = 'Baller';
    return `${left}${right}-${Math.floor(10 + Math.random() * 90)}`;
  };
  try {
    const existing = localStorage.getItem(GUEST_HANDLE_KEY);
    if (existing) return existing;
    const handle = mint();
    localStorage.setItem(GUEST_HANDLE_KEY, handle);
    return handle;
  } catch {
    // localStorage unavailable, fall back to a per-call random handle.
    // Not persisted, so it won't match across renders, but it still lets an
    // insert carry a name rather than null.
    return mint();
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
export function recordCompletion(gamePath: string, score?: number, playerName?: string, correctAnswers = 0): void {
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
        } else {
          /* Round 157: tell the header a play just landed, so games-played,
             points and rank move while you are actually playing instead of
             waiting for the next poll. */
          try { window.dispatchEvent(new Event('game-completion-saved')); } catch { /* SSR/harness */ }
        }
      });

    /* Round 300: THE ONE RECORDER. Before this round there were three
       pipelines and which ones a game fed depended on which helper it
       happened to call: the 19 useGameCompletion games fed all three, the
       direct callers fed only the anonymous row, so a signed in player could
       finish a Club Manager season or any of Round 299's fourteen games and
       watch their flame, their points and their rank not move. Now every
       path through this function feeds all three: the anonymous row above,
       the local streak record here, and the signed in save below when a
       session exists. useGameCompletion no longer writes any of this
       itself, it calls this function like everybody else, so nothing counts
       twice. */
    recordStreakCompletion(game, new Date(), typeof score === 'number' && Number.isFinite(score) ? score : 0);

    supabase.auth.getUser()
      .then(({ data }) => {
        if (data?.user) return saveAuthCompletion(data.user.id, game, typeof score === 'number' && Number.isFinite(score) ? score : 0, correctAnswers);
      })
      .then(saved => {
        if (saved) {
          try { window.dispatchEvent(new Event('game-completion-saved')); } catch { /* SSR/harness */ }
        }
      })
      .catch(() => { /* signed out or auth unreachable: the play still counted above */ });

    bumpLocalTodayCount();
  } catch {
    // Never let a tracking failure break gameplay.
  }
}

/**
 * Round 300: the signed in save, moved VERBATIM out of useGameCompletion so
 * every recordCompletion caller feeds it, not only the 19 games that mounted
 * the hook. Writes user_game_scores, daily_completions (its unique
 * constraint dedupes a same day replay), the user_scores row the navbar and
 * leaderboard read, and user_best_scores. Returns true when it ran to the
 * end so the caller can announce the save. All errors are swallowed by the
 * caller: a stats failure must never surface to the player.
 */
export async function saveAuthCompletion(userId: string, gameSlug: string, score: number, correctAnswers: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  await supabase.from('user_game_scores').insert({
    user_id: userId,
    game_type: gameSlug,
    score,
    correct_answers: correctAnswers,
    puzzle_date: today,
  });

  await supabase.from('daily_completions').insert({
    user_id: userId,
    game_slug: gameSlug,
    date: today,
  });

  const { data: existing } = await supabase
    .from('user_scores')
    .select('total_points, games_played_today, last_played_at, current_streak, longest_streak')
    .eq('user_id', userId)
    .single();

  const { count: distinctGamesToday } = await supabase
    .from('daily_completions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('date', today);

  const gamesPlayedToday = distinctGamesToday || 1;
  const lastDate = existing?.last_played_at
    ? new Date(existing.last_played_at).toISOString().split('T')[0]
    : null;
  const isSameDay = lastDate === today;

  if (!existing) {
    await supabase.from('user_scores').insert({
      user_id: userId,
      total_points: score,
      games_played_today: gamesPlayedToday,
      last_played_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_streak: 1,
      longest_streak: 1,
    });
  } else {
    let newStreak = existing.current_streak || 0;
    if (!isSameDay) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      newStreak = lastDate === yesterdayStr ? newStreak + 1 : 1;
    }
    const newLongest = Math.max(newStreak, existing.longest_streak || 0);
    await supabase
      .from('user_scores')
      .update({
        total_points: existing.total_points + score,
        games_played_today: gamesPlayedToday,
        last_played_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_streak: newStreak,
        longest_streak: newLongest,
      })
      .eq('user_id', userId);
  }

  const { data: existingBest } = await supabase
    .from('user_best_scores')
    .select('best_score')
    .eq('user_id', userId)
    .eq('game_type', gameSlug)
    .single();

  if (!existingBest) {
    await supabase.from('user_best_scores').insert({
      user_id: userId,
      game_type: gameSlug,
      best_score: score,
    });
  } else if (score > existingBest.best_score) {
    await supabase
      .from('user_best_scores')
      .update({ best_score: score, achieved_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('game_type', gameSlug);
  }

  return true;
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
    /* localStorage unavailable (quota/private mode), not critical */
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
