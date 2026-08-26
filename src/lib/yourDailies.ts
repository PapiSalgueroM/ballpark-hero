/**
 * Round 293: "Your dailies", the home page's own checklist.
 *
 * Every daily game credits a local streak when it is finished (streaks.ts,
 * written by useGameCompletion for every visitor, signed in or not), so the
 * browser already knows which dailies this person plays and whether each one
 * is done today. Nothing on the home page said so: the reminder nudged about
 * the global streak and the game navs listed what was left in one category.
 * This picks the handful worth showing and says, per game, done or not.
 *
 * Pure: takes the streak map and the registry, returns a list. No DOM, no
 * clock (the caller passes today's ET date), so simYourDailies can measure it.
 */
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';
import type { StreakEntry } from '@/lib/streaks';

export const MAX_YOUR_DAILIES = 6;

export interface YourDaily {
  game: GameDef;
  /** finished today already */
  done: boolean;
  /** consecutive ET days, 0 when the run has lapsed */
  streak: number;
  longest: number;
}

/**
 * The dailies this person has finished at least once, best streak first, at
 * most MAX_YOUR_DAILIES of them. A game that is not a daily, or that has left
 * the registry, is not offered whatever the save says, so a retired route
 * can never be linked from here. Empty for a first visit, on purpose: a new
 * visitor gets the game list, not a checklist with nothing ticked.
 */
export function pickYourDailies(
  perGame: Record<string, StreakEntry>,
  today: string,
  games: readonly GameDef[] = ALL_GAMES,
): YourDaily[] {
  const bySlug = new Map<string, GameDef>();
  for (const g of games) if (g.daily) bySlug.set(g.path.replace(/^\//, ''), g);
  const out: YourDaily[] = [];
  for (const [slug, entry] of Object.entries(perGame ?? {})) {
    const game = bySlug.get(slug);
    if (!game || !entry || typeof entry !== 'object') continue;
    const longest = Number.isFinite(entry.longest) ? Math.max(0, Math.floor(entry.longest)) : 0;
    const current = Number.isFinite(entry.current) ? Math.max(0, Math.floor(entry.current)) : 0;
    if (longest <= 0 && current <= 0 && !entry.lastDate) continue;
    out.push({ game, done: entry.lastDate === today, streak: current, longest });
  }
  out.sort((a, b) => b.streak - a.streak || b.longest - a.longest || a.game.label.localeCompare(b.game.label));
  return out.slice(0, MAX_YOUR_DAILIES);
}

/** the one line under the heading: what is left today */
export function yourDailiesLine(list: YourDaily[]): string {
  if (list.length === 0) return '';
  const left = list.filter(d => !d.done).length;
  if (left === 0) return 'All done for today. See you tomorrow.';
  if (left === list.length) return `${left} to play today.`;
  return `${list.length - left} done, ${left} to go.`;
}
