import { recordGameCompletion as recordStreakCompletion, getEtDateString } from '@/lib/streaks';
import { nameModerationError } from '@/lib/nameModeration';

/**
 * Round 679: this file keeps who a row is filed under (the guest handle, the
 * cached display name, the public name) and the local today count. The
 * writers moved to src/lib/playLedger.ts, the one module that inserts into
 * game_completions or calls the door; this file writes nothing to the
 * database. What follows is the history of the table those writers feed.
 *
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

function mint(): string {
  const left = HANDLE_LEFT[Math.floor(Math.random() * HANDLE_LEFT.length)];
  let right = HANDLE_RIGHT[Math.floor(Math.random() * HANDLE_RIGHT.length)];
  /* never a doubled word; when the doubled word IS Baller, the old
     fallback was a no-op and minted "BallerBaller" (Round 318 fix) */
  if (right === left) right = left === 'Baller' ? 'Volley' : 'Baller';
  return `${left}${right}-${Math.floor(10 + Math.random() * 90)}`;
}

/**
 * Round 679: a fresh handle in place of one the board refused because another
 * account owns that name (economy step E3's name rule). Only this browser's
 * own stored handle is replaced, so a signed in name or a name handed in by a
 * caller is never touched; returns the new handle, or null when the refused
 * name is not the stored one. src/lib/playLedger.ts calls it once per refused
 * row and sends that row once more, never twice.
 */
export function remintGuestHandle(refused: string): string | null {
  try {
    if (!refused || localStorage.getItem(GUEST_HANDLE_KEY) !== refused) return null;
    let fresh = mint();
    for (let i = 0; i < 4 && fresh === refused; i += 1) fresh = mint();
    if (fresh === refused) return null;
    localStorage.setItem(GUEST_HANDLE_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

export function getGuestHandle(): string {
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

/**
 * The display handle to attribute a completion/leaderboard row to right now:
 * the signed-in profile's display_name or username if available, else the
 * persistent local guest handle. This is a point-in-time read, not reactive:
 * callers that need to react to a profile edit should re-read it, it does
 * not subscribe to anything.
 */
export function getCurrentPlayerName(profile?: { display_name?: string | null; username?: string | null } | null): string {
  const fromProfile = profile?.display_name || profile?.username;
  return fromProfile || getCachedDisplayName() || getGuestHandle();
}

/**
 * Round 539: the same answer, WITHOUT minting a handle when there is not one.
 *
 * getGuestHandle is a read that writes: no stored handle, or a stored one in
 * the pre Round 318 shape, and it mints a new one off Math.random and saves it.
 * That is correct for the recorder, which is about to insert a row and needs a
 * name to put on it. It is wrong for a READER, and Round 527's achievement case
 * is a pure reader that claimed in its own header to write nothing. It called
 * getCurrentPlayerName, which reaches getGuestHandle, so opening /profile as a
 * signed in user whose row has no display_name and no username minted and
 * stored a guest handle. Proved at runtime with a recording localStorage.
 *
 * Readers use this. No handle stored means no handle, which is the honest
 * answer: a player with no identity yet has no rows to find either, so the
 * empty string an unknown handle produces is the same empty board.
 */
export function peekCurrentPlayerName(profile?: { display_name?: string | null; username?: string | null } | null): string {
  const fromProfile = profile?.display_name || profile?.username;
  if (fromProfile) return fromProfile;
  const cached = getCachedDisplayName();
  if (cached) return cached;
  try {
    const existing = localStorage.getItem(GUEST_HANDLE_KEY);
    return existing && !LEGACY_HANDLE.test(existing) ? existing : '';
  } catch {
    return '';
  }
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
 * Round 399: the local streak day, on its own. Round 392 moved Club Manager's
 * match pings and Soccer Career's season pings onto recordActivity, which
 * writes the anonymous row and nothing else, and that silently stopped a
 * played match or season from keeping the header flame alive: since Round
 * 159 a season had counted as playing today. This records that day locally
 * (idempotent per day, no signed in save, no points) and the two sims call it
 * beside their ping. The boards keep Round 301's shape and do not.
 */
export function recordStreakDay(gamePath: string): void {
  try {
    const game = gamePath.replace(/^\//, '');
    if (!game) return;
    recordStreakCompletion(game, new Date(), 0);
  } catch {
    // Never let a tracking failure break gameplay.
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
export function bumpLocalTodayCount(game: string): void {
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
