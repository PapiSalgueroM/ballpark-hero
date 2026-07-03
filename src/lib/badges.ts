import { supabase } from '@/integrations/supabase/client';
import { getStreakState } from '@/lib/streaks';
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
interface OwnCompletionRow {
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
  { id: 'perfect-week', emoji: '🌅', name: 'Perfect Week', desc: '7 day streak, no gaps' },
];

/** Distinct non-empty category titles from the game registry, used by the All Rounder badge. */
function registryCategoryCount(): number {
  return CATEGORIES.filter(c => c.games.length > 0).length;
}

/** Maps a game slug (bare, no leading slash) back to its registry category title, or null if not found. */
function categoryForSlug(slug: string): string | null {
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

/**
 * Computes every badge's earned/locked state for the current browser's
 * player (guest handle or signed-in display name/username).
 *
 * @param profile optional signed-in profile (display_name/username) so
 * signed-in players' badges are computed against their profile handle
 * rather than a stale local guest handle from before they signed in.
 */
export async function getBadgeState(
  profile?: { display_name?: string | null; username?: string | null } | null
): Promise<BadgeState[]> {
  const playerName = getCurrentPlayerName(profile);
  const streaks = getStreakState();
  const rows = await fetchOwnCompletions(playerName);

  const totalCompletions = rows.length;

  const playedCategories = new Set(
    rows.map(r => categoryForSlug(r.game)).filter((c): c is string => !!c)
  );
  const totalCategories = registryCategoryCount();

  const perDayCounts = new Map<string, Set<string>>();
  rows.forEach(r => {
    const set = perDayCounts.get(r.completed_on) ?? new Set<string>();
    set.add(r.game);
    perDayCounts.set(r.completed_on, set);
  });
  const maxDistinctGamesInADay = Math.max(0, ...[...perDayCounts.values()].map(s => s.size));

  const earnedById: Record<string, boolean> = {
    'streak-3': streaks.global.longest >= 3,
    'streak-7': streaks.global.longest >= 7,
    'streak-30': streaks.global.longest >= 30,
    'games-10': totalCompletions >= 10,
    'games-50': totalCompletions >= 50,
    'games-100': totalCompletions >= 100,
    'all-rounder': totalCategories > 0 && playedCategories.size >= totalCategories,
    'visited-7': streaks.loginDates.length >= 7,
    'visited-30': streaks.loginDates.length >= 30,
    'variety-5': maxDistinctGamesInADay >= 5,
    'perfect-week': streaks.global.longest >= 7,
  };

  return BADGE_DEFS.map(def => ({ ...def, earned: !!earnedById[def.id] }));
}
