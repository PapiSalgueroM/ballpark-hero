import { supabase } from '@/integrations/supabase/client';
import {
  recordGameCompletion as recordStreakCompletion,
  recordGameStreakDay as recordStreakDayOnly,
  getEtDateString,
  type StreakState,
} from '@/lib/streaks';
import { nameModerationError } from '@/lib/nameModeration';
import {
  getProgressHydrationSnapshot,
  isCurrentProgressHydration,
  type ProgressHydrationSnapshot,
} from '@/lib/progressHydration';

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

/* Signed-in completion saves update several read-modify-write tables and the
   profile streak snapshot. Keep them in invocation order so two fast finishes
   cannot let an older snapshot land after a newer one. A rejected save releases
   the queue, and gameplay remains local-first throughout. */
let authCompletionSaveQueue: Promise<void> = Promise.resolve();

function enqueueAuthCompletionSave<T>(work: () => Promise<T>): Promise<T> {
  const queued = authCompletionSaveQueue.catch(() => undefined).then(work);
  authCompletionSaveQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

function afterProgressHydration(
  snapshot: ProgressHydrationSnapshot | null,
  apply: (allowProfileStreakBackup: boolean) => void,
): void {
  if (!snapshot) {
    apply(true);
    return;
  }
  if (snapshot.status === 'pending' && snapshot.promise) {
    void snapshot.promise.then(apply, () => apply(false));
    return;
  }
  apply(snapshot.status === 'ready');
}

/* Round 301, audit finding 6: this used to be a UTC day while the streaks
   next to it kept Eastern days, so the Games Today counter reset to zero at
   8pm ET mid evening with the streak day still open. One clock for both. */
function todayStr(): string {
  return getEtDateString();
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
   copies of one name, so the board reads like a crowd. No real person's name
   and no product name is in these lists, and none may ever be added: an
   invented handle that collides with a real player reads as that player on a
   public board.

   Round 318 reversed the "existing handles are untouched" half of Round 299,
   at the owner's call in docs/TWEAKS-2026-08-28.md: legacy Baller-NNNN
   handles regenerate to the word pool on next visit, so the board stops
   reading as thousands of copies of one person. The cost is accepted and
   known: rows written under the old Baller name stay under it, so a
   returning legacy guest starts a fresh line on the board. */
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

/* The legacy shape Round 318 retires: exactly "Baller-" plus digits. A word
   pool mint can never match it (a pool handle always pairs two words before
   the dash), so this test can only ever catch a pre-Round-299 handle. */
const LEGACY_HANDLE = /^Baller-\d+$/;

export function getGuestHandle(): string {
  const mint = () => {
    const left = HANDLE_LEFT[Math.floor(Math.random() * HANDLE_LEFT.length)];
    let right = HANDLE_RIGHT[Math.floor(Math.random() * HANDLE_RIGHT.length)];
    /* never a doubled word; when the doubled word IS Baller, the old
       fallback was a no-op and minted "BallerBaller" (Round 318 fix) */
    if (right === left) right = left === 'Baller' ? 'Volley' : 'Baller';
    return `${left}${right}-${Math.floor(10 + Math.random() * 90)}`;
  };
  try {
    const existing = localStorage.getItem(GUEST_HANDLE_KEY);
    if (existing && !LEGACY_HANDLE.test(existing)) return existing;
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

function getStoredGuestHandle(): string | null {
  try {
    const existing = localStorage.getItem(GUEST_HANDLE_KEY);
    return existing && !LEGACY_HANDLE.test(existing) ? existing : null;
  } catch {
    return null;
  }
}

/**
 * Reads the identity already known on this device without minting one.
 * Render paths use this first, then mint from an effect after React commits,
 * so a discarded pre-commit render cannot consume a different random stream.
 */
export function getStoredPlayerName(profile?: { display_name?: string | null; username?: string | null } | null): string | null {
  const fromProfile = profile?.display_name || profile?.username;
  return fromProfile || getCachedDisplayName() || getStoredGuestHandle();
}

/**
 * The display handle to attribute a completion/leaderboard row to right now:
 * the signed-in profile's display_name or username if available, else the
 * persistent local guest handle. This is a point-in-time read, not reactive:
 * callers that need to react to a profile edit should re-read it, it does
 * not subscribe to anything.
 */
export function getCurrentPlayerName(profile?: { display_name?: string | null; username?: string | null } | null): string {
  return getStoredPlayerName(profile) || getGuestHandle();
}

/**
 * Round 318, the second half of the owner's leaderboard names decision: a
 * profanity blocklist in front of every name RENDERED on a shared surface.
 * Profile.tsx has refused dirty names at write time since the moderation
 * round, but names saved before that gate existed, or written through any
 * path that skipped it, are already in game_completions and would still
 * print. This is the render side of the same fence.
 *
 * A name that fails moderation is replaced with a handle derived from a hash
 * of the name itself, so the substitute is stable: the same row shows the
 * same substitute on every device and every reload, ranks stay
 * distinguishable, and nothing random flickers. Clean names pass through
 * byte for byte.
 */
export function publicName(name: string): string {
  const raw = (name ?? '').trim();
  if (!raw) return 'Player';
  if (nameModerationError(raw) === null) return raw;
  let h = 5381;
  for (let i = 0; i < raw.length; i += 1) h = ((h * 33) ^ raw.charCodeAt(i)) >>> 0;
  const left = HANDLE_LEFT[h % HANDLE_LEFT.length];
  let right = HANDLE_RIGHT[Math.floor(h / 97) % HANDLE_RIGHT.length];
  if (right === left) right = left === 'Baller' ? 'Volley' : 'Baller';
  return `${left}${right}-${10 + (h % 90)}`;
}

/* Round 301, audit finding 8: callers without React context (Club Manager's
   engine hook, the idle games, every direct recordCompletion site) passed no
   profile, so a signed in player's plays were filed under their guest handle
   and the header count plus every name keyed badge missed them. AuthContext
   caches the profile's display name here whenever it loads or changes, and
   getCurrentPlayerName falls back through it, so context free callers still
   attribute to the right name. Cleared on sign out by the same context. */
const DISPLAY_NAME_CACHE_KEY = 'dukb-display-name';
export function cacheDisplayName(name: string | null): void {
  try {
    if (name) localStorage.setItem(DISPLAY_NAME_CACHE_KEY, name);
    else localStorage.removeItem(DISPLAY_NAME_CACHE_KEY);
  } catch { /* storage unavailable, the guest handle fallback still works */ }
}
function getCachedDisplayName(): string | null {
  try { return localStorage.getItem(DISPLAY_NAME_CACHE_KEY); } catch { return null; }
}

/**
 * Round 301, audit finding 2: the ACTIVITY ping, distinct from a completion.
 * The four front office boards and the four my career boards ping after
 * every simulated round so Most Played Today reflects live play. (Club
 * Manager and Soccer Career keep recordCompletion for a FINISHED SEASON and
 * a retirement, which are genuine plays. Round 392 moved their per match
 * and per season pings here too: Round 157 had put a completion after every
 * Club Manager match, and this comment believed it fired once a season.) That ping used to be recordCompletion back when it only wrote
 * the anonymous row; Round 300's fan out silently upgraded it, so one
 * fifteen season career counted as sixteen plays, sixteen ranked rows and a
 * diluted average. This is the old shape on purpose: the anonymous row and
 * the local today count, NO streak record, NO signed in save. A real finish
 * still goes through recordCompletion, exactly once.
 */
/**
 * Round 399: the local streak day, on its own. Round 392 moved Club Manager's
 * match pings and Soccer Career's season pings onto recordActivity, which
 * writes the anonymous row and nothing else, and that silently stopped a
 * played match or season from keeping the header flame alive: since Round
 * 159 a season had counted as playing today. This records that day without
 * adding a finished game or points, and backs up the changed day for a
 * signed-in player. Repeated activity in the same ET day is a no-op, so the
 * two sims can call it beside every light ping. The boards keep Round 301's
 * shape and do not.
 */
export function recordStreakDay(gamePath: string): void {
  try {
    const game = gamePath.replace(/^\//, '');
    if (!game) return;
    const playedAt = new Date();
    const streakUser = supabase.auth.getUser();
    const hydration = getProgressHydrationSnapshot();
    const applyStreakDay = (allowProfileStreakBackup: boolean) => {
      try {
        if (hydration && !isCurrentProgressHydration(hydration)) return;
        const { state, changed } = recordStreakDayOnly(game, playedAt);
        if (!changed) return;
        try { window.dispatchEvent(new Event('dukb-streaks-changed')); } catch { /* SSR/harness */ }
        if (!allowProfileStreakBackup) return;
        enqueueAuthCompletionSave(async () => {
          const { data } = await streakUser;
          if (!data?.user) return false;
          return backupProfileStreakState(data.user.id, state);
        }).catch(() => { /* signed out or auth unreachable: the local day remains */ });
      } catch { /* a delayed local tracking failure must not surface */ }
    };
    afterProgressHydration(hydration, applyStreakDay);
  } catch {
    // Never let a tracking failure break gameplay.
  }
}

export function recordActivity(gamePath: string, score?: number, playerName?: string): void {
  try {
    const game = gamePath.replace(/^\//, '');
    if (!game) return;
    const row: { game: string; score?: number; player_name?: string } = { game };
    if (typeof score === 'number' && Number.isFinite(score)) row.score = score;
    row.player_name = playerName || getCurrentPlayerName();
    (supabase.from as any)('game_completions')
      .insert(row)
      .then(({ error }: { error: unknown }) => {
        if (error) console.debug('[completions] activity insert failed (ignored):', error);
        else { try { window.dispatchEvent(new Event('game-completion-saved')); } catch { /* SSR/harness */ } }
      });
    bumpLocalTodayCount(game);
  } catch {
    // Never let a tracking failure break gameplay.
  }
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
    const playedAt = new Date();
    const completionScore = typeof score === 'number' && Number.isFinite(score) ? score : 0;
    const completionUser = supabase.auth.getUser();
    const hydration = getProgressHydrationSnapshot();
    const saveSignedInCompletion = (
      streakState: StreakState | null,
      allowProfileStreakBackup: boolean,
    ) => {
      enqueueAuthCompletionSave(async () => {
        const { data } = await completionUser;
        if (!data?.user) return false;
        return saveAuthCompletion(
          data.user.id,
          game,
          completionScore,
          correctAnswers,
          streakState,
          allowProfileStreakBackup,
        );
      })
        .then(saved => {
          if (saved) {
            try { window.dispatchEvent(new Event('game-completion-saved')); } catch { /* SSR/harness */ }
          }
        })
        .catch(() => { /* signed out or auth unreachable: the play still counted above */ });
    };
    const applyCompletionProgress = (allowProfileStreakBackup: boolean) => {
      try {
        if (hydration && !isCurrentProgressHydration(hydration)) {
          saveSignedInCompletion(null, false);
          return;
        }
        const streakState = recordStreakCompletion(game, playedAt, completionScore);
        saveSignedInCompletion(streakState, allowProfileStreakBackup);
      } catch { /* a delayed local tracking failure must not surface */ }
    };

    /* If an established account is still loading its remote streak, apply
       this play only after that decision. Otherwise a blank browser could
       save streak 1 over a much longer account history. */
    afterProgressHydration(hydration, applyCompletionProgress);

    bumpLocalTodayCount(game);
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
export async function saveAuthCompletion(
  userId: string,
  gameSlug: string,
  score: number,
  correctAnswers: number,
  streakState: StreakState | null,
  allowProfileStreakBackup: boolean,
): Promise<boolean> {
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

  /* Back up the exact state returned when this completion was recorded.
     Reading localStorage here is unsafe because the anonymous completion
     event can refresh the profile while these server writes are in flight,
     briefly restoring the previous remote snapshot over the new local one. */
  if (allowProfileStreakBackup && streakState) {
    await backupProfileStreakState(userId, streakState);
  }

  return true;
}

async function backupProfileStreakState(userId: string, streakState: StreakState): Promise<boolean> {
  try {
    const { error } = await (supabase.from as any)('profiles').upsert(
      { user_id: userId, streak_state: streakState, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Local, same-browser tracking of which games were completed today, used as
 * the instant/optimistic half of the header's daily score chip so it doesn't
 * have to wait on a round trip for the player's own most recent completion.
 *
 * Round 301, audit finding 7: this used to be a raw completion COUNT, so a
 * replay of one game inflated it while the server half counted DISTINCT
 * games, and the navbar's Math.max compared two different units. The stored
 * payload is now {date, slugs: string[]}, the set of today's completed game
 * slugs, and getLocalTodayCount returns the set size so both halves count
 * the same thing. An old {date, count} payload carries no slug list to
 * migrate, so it is deliberately treated as empty for today: a one day
 * reset of the optimistic chip, acceptable because the server's distinct
 * count backstops signed in players and tomorrow starts clean anyway.
 */
function bumpLocalTodayCount(game: string): void {
  try {
    const today = todayStr();
    const raw = localStorage.getItem(LOCAL_TODAY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const slugs: string[] = parsed && parsed.date === today && Array.isArray(parsed.slugs) ? parsed.slugs : [];
    if (!slugs.includes(game)) slugs.push(game);
    localStorage.setItem(LOCAL_TODAY_KEY, JSON.stringify({ date: today, slugs }));
  } catch {
    /* localStorage unavailable (quota/private mode), not critical */
  }
}

/** Reads today's locally-tracked DISTINCT completed game count for this browser only. */
export function getLocalTodayCount(): number {
  try {
    const raw = localStorage.getItem(LOCAL_TODAY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return parsed && parsed.date === todayStr() && Array.isArray(parsed.slugs) ? parsed.slugs.length : 0;
  } catch {
    return 0;
  }
}
