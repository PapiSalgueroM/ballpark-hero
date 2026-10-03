import { supabase } from '@/integrations/supabase/client';
import { getStreakState, readDiary } from '@/lib/streaks';
import { getCurrentPlayerName } from '@/lib/completions';
import { CATEGORIES } from '@/data/gameRegistry';

/**
 * Local-first badges (#103). See docs/INCENTIVES_SPEC.md section 3 for the
 * full rationale, including which rules were deliberately omitted (first
 * perfect grid, night owl / early bird, sport-master badges) and why.
 *
 * Every rule here is computed from data that is already written today by
 * files outside this change's edit list:
 *   - src/lib/streaks.ts's localStorage state (global/per-game streaks,
 *     loginDates) - #101, shipped, untouched by this change.
 *   - The player's own rows in public.game_completions, matched by
 *     player_name against this browser's current handle (see
 *     src/lib/completions.ts's getCurrentPlayerName / getGuestHandle).
 *
 * No new write path or hook-in was added anywhere (useGameCompletion.ts is
 * not on this change's edit list). game_completions already gets a row per
 * completion for every player, guest or signed-in, via the existing call in
 * useGameCompletion.ts; as of the completions.ts change in this same build,
 * that row now always carries a player_name, which is what makes reading it
 * back out per-player possible without any additional plumbing.
 */

export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
}

export interface BadgeState extends BadgeDef {
  earned: boolean;
}

/** Row shape read back from game_completions for the current player only. */
export interface OwnCompletionRow {
  game: string;
  completed_on: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'streak-3', emoji: '🔥', name: 'Streak Starter', desc: '3 day streak' },
  { id: 'streak-7', emoji: '🔥🔥', name: 'On Fire', desc: '7 day streak' },
  { id: 'streak-30', emoji: '👑', name: 'Streak King', desc: '30 day streak' },
  { id: 'games-10', emoji: '🎮', name: 'Rookie', desc: '10 games played' },
  { id: 'games-50', emoji: '🎮🎮', name: 'Veteran', desc: '50 games played' },
  { id: 'games-100', emoji: '🏆', name: 'Century Club', desc: '100 games played' },
  { id: 'all-rounder', emoji: '🌍', name: 'All Rounder', desc: 'Play every sport category' },
  { id: 'visited-7', emoji: '📅', name: 'Creature of Habit', desc: 'Visit on 7 different days' },
  { id: 'visited-30', emoji: '🗓️', name: 'Regular', desc: 'Visit on 30 different days' },
  { id: 'variety-5', emoji: '🎯', name: 'Well Rounded', desc: '5 different games in one day' },
  { id: 'perfect-week', emoji: '🌅', name: 'Perfect Week', desc: 'Play every day, Monday to Sunday' },
  { id: 'streak-14', emoji: '🔥🔥🔥', name: 'Two Weeks Hot', desc: '14 day streak' },
  { id: 'games-25', emoji: '🎮', name: 'Getting Serious', desc: '25 games played' },
  { id: 'games-250', emoji: '💎', name: 'Superfan', desc: '250 games played' },
  { id: 'visited-100', emoji: '🏛️', name: 'Local Legend', desc: 'Visit on 100 different days' },
  { id: 'points-1000', emoji: '⭐', name: 'Point Hunter', desc: 'Earn 1,000 total points' },
  { id: 'points-10000', emoji: '🌟', name: 'Point Master', desc: 'Earn 10,000 total points' },
];

/* ─── Round 981: every badge is one fenced rule ─────────────────────────────
   A badge used to be a line of ad hoc logic, which is how 'perfect-week'
   ended up the identical predicate to 'streak-7' and the points badges read
   this browser's tally while the profile beside them showed the account's.
   Now each badge is one fact compared with one number, the facts are built
   in one place (buildBadgeFacts), and the totals the profile prints come
   from the same merge (ownTotals), so a badge cannot be earned off a number
   the page does not show, nor locked beside a number that says it is due.
   scripts/simBadges.mjs walks every rule at its threshold and one below. */

/** The one number each badge rule reads. Whole numbers, never negative. */
export interface BadgeFacts {
  /** Best run of days in a row with a finished game. */
  longestStreak: number;
  /** Finished games, lifetime. */
  gamesPlayed: number;
  /** Points, lifetime. */
  totalPoints: number;
  /** Registry categories with no recorded play yet (All Rounder wants 0). */
  categoriesLeft: number;
  /** Distinct days this browser opened the site. */
  visitDays: number;
  /** Most different games finished on one day. */
  bestDayVariety: number;
  /** Monday to Sunday weeks with a finished game on all seven days. */
  fullWeeks: number;
}

export type BadgeMetric = keyof BadgeFacts;

/** Earned when facts[metric] is at least `atLeast`, or, for a rule that
 *  counts what is still missing, at most `atMost`. Exactly one is set. */
export interface BadgeRule {
  metric: BadgeMetric;
  atLeast?: number;
  atMost?: number;
}

export const BADGE_RULES: Record<string, BadgeRule> = {
  'streak-3': { metric: 'longestStreak', atLeast: 3 },
  'streak-7': { metric: 'longestStreak', atLeast: 7 },
  'streak-14': { metric: 'longestStreak', atLeast: 14 },
  'streak-30': { metric: 'longestStreak', atLeast: 30 },
  'games-10': { metric: 'gamesPlayed', atLeast: 10 },
  'games-25': { metric: 'gamesPlayed', atLeast: 25 },
  'games-50': { metric: 'gamesPlayed', atLeast: 50 },
  'games-100': { metric: 'gamesPlayed', atLeast: 100 },
  'games-250': { metric: 'gamesPlayed', atLeast: 250 },
  'all-rounder': { metric: 'categoriesLeft', atMost: 0 },
  'visited-7': { metric: 'visitDays', atLeast: 7 },
  'visited-30': { metric: 'visitDays', atLeast: 30 },
  'visited-100': { metric: 'visitDays', atLeast: 100 },
  'variety-5': { metric: 'bestDayVariety', atLeast: 5 },
  'perfect-week': { metric: 'fullWeeks', atLeast: 1 },
  'points-1000': { metric: 'totalPoints', atLeast: 1000 },
  'points-10000': { metric: 'totalPoints', atLeast: 10000 },
};

/** A count a badge can trust: a finite whole number, never below zero. */
export function cleanCount(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), Number.MAX_SAFE_INTEGER);
}

/** Pure: whether one rule holds for these facts. A rule with no number, or
 *  a fact that is not a clean count, never earns. */
export function ruleHolds(rule: BadgeRule | undefined, facts: BadgeFacts): boolean {
  if (!rule) return false;
  const raw = facts[rule.metric];
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return false;
  if (typeof rule.atLeast === 'number') return raw >= rule.atLeast;
  if (typeof rule.atMost === 'number') return raw <= rule.atMost;
  return false;
}

/** Pure: every badge's state for these facts, in BADGE_DEFS order. */
export function computeBadges(facts: BadgeFacts): BadgeState[] {
  return BADGE_DEFS.map(def => ({ ...def, earned: ruleHolds(BADGE_RULES[def.id], facts) }));
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Pure: how many Monday to Sunday weeks have all seven days in `days`
 *  (YYYY-MM-DD strings, any order, repeats and junk ignored). One clock per
 *  call: never pass two sources' days merged, a late night play can carry a
 *  different date in each and make a week out of six real days. */
export function fullCalendarWeeks(days: readonly unknown[]): number {
  const weeks = new Map<number, Set<number>>();
  for (const d of days) {
    if (typeof d !== 'string' || !DAY_RE.test(d)) continue;
    const t = Date.parse(`${d}T00:00:00Z`);
    if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== d) continue;
    const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday 0 .. Sunday 6
    const monday = t - dow * DAY_MS;
    const set = weeks.get(monday) ?? new Set<number>();
    set.add(dow);
    weeks.set(monday, set);
  }
  let full = 0;
  weeks.forEach(set => { if (set.size === 7) full += 1; });
  return full;
}

/** What this browser knows, from src/lib/streaks.ts. */
export interface LocalTotals {
  plays: number;
  points: number;
  currentStreak: number;
  longestStreak: number;
}

/** What the account knows: user_game_scores counted, user_scores read. */
export interface ServerTotals {
  gamesPlayed?: number | null;
  totalPoints?: number | null;
  currentStreak?: number | null;
  longestStreak?: number | null;
  /** user_scores.last_played_at; the server counts its streak days in UTC. */
  lastPlayedAt?: string | null;
}

export interface ProfileTotals {
  gamesPlayed: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
}

/** Pure: user_scores.current_streak is only written on a play, so it keeps
 *  its old number after the run breaks. It counts while the last play was
 *  today or yesterday (UTC, the server's own day), the same grace the local
 *  streak gives. */
export function serverStreakAlive(lastPlayedAt: string | null | undefined, now: Date): boolean {
  if (typeof lastPlayedAt !== 'string') return false;
  const t = Date.parse(lastPlayedAt);
  if (!Number.isFinite(t)) return false;
  const day = (ms: number) => Math.floor(ms / DAY_MS);
  const gap = day(now.getTime()) - day(t);
  return gap >= 0 && gap <= 1;
}

function averageOf(points: number, games: number): number {
  return games > 0 ? Math.round(points / games) : 0;
}

/** Pure: the account's own numbers as one set, so nothing reads 0 beside a
 *  real total. Every count takes the larger of the two halves (local saw the
 *  guest era, the server saw the other devices), the same rule Round 301
 *  set for points. The average divides points and games from the SAME half,
 *  the one that gave the points, never one half's points by the other's
 *  games. */
export function ownTotals(local: LocalTotals, server: ServerTotals | null | undefined, now: Date = new Date()): ProfileTotals {
  const lp = cleanCount(local.points);
  const lg = cleanCount(local.plays);
  const sp = cleanCount(server?.totalPoints);
  const sg = cleanCount(server?.gamesPlayed);
  const sCur = serverStreakAlive(server?.lastPlayedAt, now) ? cleanCount(server?.currentStreak) : 0;
  const totalPoints = Math.max(lp, sp);
  const gamesPlayed = Math.max(lg, sg);
  const currentStreak = Math.max(cleanCount(local.currentStreak), sCur);
  const longestStreak = Math.max(cleanCount(local.longestStreak), cleanCount(server?.longestStreak), currentStreak);
  const [pairPoints, pairGames] = sp > lp ? [sp, sg] : [lp, lg];
  const averageScore = pairGames > 0 ? averageOf(pairPoints, pairGames) : averageOf(totalPoints, gamesPlayed);
  return { gamesPlayed, totalPoints, currentStreak, longestStreak, averageScore };
}

/** Pure: someone else's profile, where only the server half means anything. */
export function viewedTotals(server: ServerTotals | null | undefined, now: Date = new Date()): ProfileTotals {
  return ownTotals({ plays: 0, points: 0, currentStreak: 0, longestStreak: 0 }, server, now);
}

/** Distinct non-empty category titles from the game registry, used by the All Rounder badge. */
export function registryCategoryCount(): number {
  return CATEGORIES.filter(c => c.games.length > 0).length;
}

/** Maps a game slug (bare, no leading slash) back to its registry category title, or null if not found. */
export function categoryForSlug(slug: string): string | null {
  for (const cat of CATEGORIES) {
    if (cat.games.some(g => g.path.replace(/^\//, '') === slug)) return cat.title;
  }
  return null;
}

/**
 * Reads the current player's own completion rows from game_completions,
 * matched by player_name against this browser's current handle. Never
 * throws: any failure (network, offline, RLS) returns an empty array so
 * badge rules that depend on this just show as not-yet-earned rather than
 * erroring the Profile page.
 *
 * Capped at 500 most recent rows - comfortably above the 100-game "Century
 * Club" threshold and the realistic lifetime play volume for a trivia site,
 * while keeping the read bounded for a long-lived guest handle.
 */
async function fetchOwnCompletions(playerName: string): Promise<OwnCompletionRow[]> {
  try {
    // Dynamic .from() access: game_completions predates generated types,
    // same pattern as src/lib/completions.ts.
    const { data, error } = await (supabase.from as any)('game_completions')
      .select('game, completed_on')
      .eq('player_name', playerName)
      .order('completed_on', { ascending: false })
      .limit(500);

    if (error || !data) return [];
    return data as OwnCompletionRow[];
  } catch {
    return [];
  }
}

/** What this browser holds for the badge facts, from getStreakState() and
 *  the play diary. Only the fields read here. */
export interface LocalBadgeInputs {
  totalPlays: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  visitDays: number;
  /** Slugs this browser has finished at least once (the streak record's
   *  per game keys). */
  playedSlugs: readonly string[];
  /** ET days the play diary vouches for, one clock. */
  diaryDays: readonly string[];
}

/**
 * Pure: the facts every badge reads, from this browser, the account's own
 * game_completions rows and the account's server totals. Counts that both
 * halves keep go through ownTotals, the same merge the profile prints, so
 * Point Hunter and the Total Points tile can never disagree. Categories are
 * a union of real plays (a slug is a slug on any clock). Days are never
 * merged across sources: a full week has to stand in one source alone.
 */
export function buildBadgeFacts(
  local: LocalBadgeInputs,
  rows: readonly OwnCompletionRow[],
  server: ServerTotals | null | undefined,
  now: Date = new Date(),
): BadgeFacts {
  const goodRows = rows.filter(r => r && typeof r.game === 'string' && typeof r.completed_on === 'string');
  const totals = ownTotals(
    { plays: local.totalPlays, points: local.totalPoints, currentStreak: local.currentStreak, longestStreak: local.longestStreak },
    server,
    now,
  );

  const played = new Set<string>();
  for (const slug of [...goodRows.map(r => r.game), ...local.playedSlugs]) {
    const cat = typeof slug === 'string' ? categoryForSlug(slug) : null;
    if (cat) played.add(cat);
  }
  const totalCategories = registryCategoryCount();

  const perDay = new Map<string, Set<string>>();
  goodRows.forEach(r => {
    const set = perDay.get(r.completed_on) ?? new Set<string>();
    set.add(r.game);
    perDay.set(r.completed_on, set);
  });
  let bestDayVariety = 0;
  perDay.forEach(set => { bestDayVariety = Math.max(bestDayVariety, set.size); });

  return {
    longestStreak: totals.longestStreak,
    gamesPlayed: Math.max(totals.gamesPlayed, goodRows.length),
    totalPoints: totals.totalPoints,
    categoriesLeft: totalCategories > 0 ? Math.max(0, totalCategories - played.size) : 1,
    visitDays: cleanCount(local.visitDays),
    bestDayVariety,
    fullWeeks: Math.max(fullCalendarWeeks(local.diaryDays), fullCalendarWeeks(goodRows.map(r => r.completed_on))),
  };
}

/** This browser's half of the badge facts. Never throws. */
function readLocalBadgeInputs(): LocalBadgeInputs {
  try {
    const s = getStreakState();
    let diaryDays: string[] = [];
    try { diaryDays = readDiary()?.global.days ?? []; } catch { diaryDays = []; }
    return {
      totalPlays: s.totalPlays || 0,
      totalPoints: s.totalPoints || 0,
      currentStreak: s.global.current,
      longestStreak: s.global.longest,
      visitDays: s.loginDates.length,
      playedSlugs: Object.keys(s.perGame ?? {}),
      diaryDays,
    };
  } catch {
    return { totalPlays: 0, totalPoints: 0, currentStreak: 0, longestStreak: 0, visitDays: 0, playedSlugs: [], diaryDays: [] };
  }
}

/**
 * Computes every badge's earned/locked state for the current browser's
 * player (guest handle or signed-in display name/username).
 *
 * @param profile optional signed-in profile (display_name/username) so
 * signed-in players' badges are computed against their profile handle
 * rather than a stale local guest handle from before they signed in.
 * @param server Round 981: the account's own totals as the profile page
 * loaded them, so a signed in player on a second device sees the badges
 * the account has earned. Omitted (the unlock toast) means this browser and
 * the completion rows only.
 */
export async function getBadgeState(
  profile?: { display_name?: string | null; username?: string | null } | null,
  server?: ServerTotals | null,
): Promise<BadgeState[]> {
  const playerName = getCurrentPlayerName(profile);
  const rows = await fetchOwnCompletions(playerName);
  return computeBadges(buildBadgeFacts(readLocalBadgeInputs(), rows, server));
}

const EARNED_KEY = 'dukb-earned-badges-v1';

/**
 * Computes badges earned right now and returns any newly earned since the last
 * check, so the caller can show an unlock toast. On the very first call for a
 * browser it seeds the stored set with whatever is already earned and returns
 * nothing, so existing players are not spammed with a toast for every past
 * achievement. Never throws.
 */
export async function getNewlyEarnedBadges(
  profile?: { display_name?: string | null; username?: string | null } | null
): Promise<BadgeState[]> {
  let stored: string[] | null;
  try {
    const raw = localStorage.getItem(EARNED_KEY);
    stored = raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    stored = null;
  }

  const states = await getBadgeState(profile);
  const earnedNow = states.filter(b => b.earned).map(b => b.id);
  const persist = (ids: string[]) => {
    try { localStorage.setItem(EARNED_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  };

  // First run on this browser: seed silently, never toast historical badges.
  if (stored === null) {
    persist(earnedNow);
    return [];
  }

  const storedSet = new Set(stored);
  const fresh = states.filter(b => b.earned && !storedSet.has(b.id));
  if (fresh.length) persist(earnedNow);
  return fresh;
}
