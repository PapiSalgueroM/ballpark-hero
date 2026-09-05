import type { CareerPlayer } from '@/types/career';
import type { TransferPathPuzzle, TransferPathRuleHint } from '@/data/transferPathPuzzles';
import { flagForClub } from '@/lib/careerLadder';
import { flagEmojiToIso } from '@/lib/flagUtils';
import { FLAG_CODES } from '@/components/FlagImg';
import { confederationFor } from '@/lib/confederationGroups';

/* Round 460: Transfer Path's special rules, from the owner's 2026-08-28 review
   ("fine; add special rule modes (active players only, Europe only)").

   A rule is a FILTER ON THE GRAPH the game searches, and nothing else. The
   link rule itself never changes: same club, same season. A special rule
   removes players (active only) or seasons (Europe only) before the search
   runs, so the minimum and the hint for a pair differ per rule, and both are
   derived per rule by scripts/genTransferPathHints.mjs over this same filter.
   The page and the generator share this file on purpose: a second copy of
   "European" or "active" would drift from the game the way the hints drifted
   from the link rule in Round 294, and the fence in simTransferPathModes
   checks every stored row against a search built through this file.

   ACTIVE PLAYERS ONLY. Every name in the chain, the start and the target
   included, must have a career row that touches ACTIVE_YEAR. The constant is
   pinned rather than read from a clock (nothing computed from a clock goes
   into a saved page), and simTransferPathModes fails the moment the career
   tables carry a season past it, which is the signal to move it.

   EUROPE ONLY. Every club a link goes through must be a European club. What
   counts as European is read from data the repo already carries, none of it
   typed here: the club's country comes from CLUB_COUNTRY in careerLadder.ts
   through flagForClub (the table that puts a flag beside every club in
   Career Ladder, measured at 274 of 274 career pool clubs in Round 319), the
   flag becomes an ISO code through flagEmojiToIso, and the code counts as
   Europe when a nation carrying it in FLAG_CODES sits in UEFA in the
   international engine's NATION_CONFED, read through confederationFor. The
   one addition is Monaco: the principality fields no national team, so it
   has no confederation, but AS Monaco plays in the French league system and
   in UEFA competitions, so the club is European. */

export type TransferPathRule = 'classic' | 'active' | 'europe';
export type TransferPathSpecialRule = Exclude<TransferPathRule, 'classic'>;

export const TRANSFER_PATH_RULES: readonly TransferPathRule[] = ['classic', 'active', 'europe'];
export const TRANSFER_PATH_SPECIAL_RULES: readonly TransferPathSpecialRule[] = ['active', 'europe'];

export const RULE_LABEL: Record<TransferPathRule, string> = {
  classic: 'Everyday',
  active: 'Active players only',
  europe: 'Europe only',
};

export const RULE_BLURB: Record<TransferPathRule, string> = {
  classic: 'Any teammate counts: same club, same season.',
  active: 'Every name in the chain must have a 2025-26 season on our career records, the start and the target included.',
  europe: 'Every club a link goes through must be a European club.',
};

/** The year a career row must touch for its player to count as active. */
export const ACTIVE_YEAR = 2026;

/**
 * The season a player must be on record for, in the form the page prints
 * ("2025-26"). The words on the page say "on our career records" on purpose:
 * the career table is a pull, and the review of Round 460 found players who
 * are plainly still playing (Jan Oblak among them) whose rows stop at
 * 2024-25, so a refusal must never tell a player that a real footballer has
 * retired. It says what the records hold, which is the only thing it knows.
 */
export const ACTIVE_SEASON_LABEL = `${ACTIVE_YEAR - 1}-${String(ACTIVE_YEAR).slice(-2)}`;

/** "2025-2026" spans 2025 to 2026, "2026" is a calendar season. Anything else spans nothing. */
export function seasonSpan(season: string): [number, number] | null {
  const m = /^(\d{4})(?:-(\d{4}))?$/.exec(String(season).trim());
  if (!m) return null;
  const start = Number(m[1]);
  return [start, m[2] ? Number(m[2]) : start];
}

export function seasonTouchesYear(season: string, year: number): boolean {
  const span = seasonSpan(season);
  return span !== null && span[0] <= year && year <= span[1];
}

export function isActivePlayer(player: Pick<CareerPlayer, 'career'>): boolean {
  return player.career.some(s => seasonTouchesYear(s.season, ACTIVE_YEAR));
}

/** ISO codes that count as Europe on top of the UEFA member list. See the note at the top. */
const EUROPE_BY_LEAGUE = new Set(['mc']);

let uefaCodes: Set<string> | null = null;
/** Built on first use, never at module scope: this file sits under the hook and the generator both. */
function uefaIsoCodes(): Set<string> {
  if (!uefaCodes) {
    const codes = new Set<string>(EUROPE_BY_LEAGUE);
    for (const [nation, iso] of Object.entries(FLAG_CODES)) {
      if (confederationFor(nation) === 'UEFA') codes.add(iso);
    }
    uefaCodes = codes;
  }
  return uefaCodes;
}

const europeanByClub = new Map<string, boolean>();

/** True when the club plays in a UEFA member association's league system. Unknown clubs are not European. */
export function isEuropeanClub(club: string): boolean {
  const cached = europeanByClub.get(club);
  if (cached !== undefined) return cached;
  const iso = flagEmojiToIso(flagForClub(club));
  const european = iso !== null && uefaIsoCodes().has(iso);
  europeanByClub.set(club, european);
  return european;
}

/**
 * The player pool the game searches under a rule. Classic is the pool as is.
 * Active keeps only active players, every season of theirs intact. Europe
 * keeps only European seasons and drops anyone left with none, so a player
 * who never played in Europe is not a node at all.
 */
export function playersUnderRule(players: CareerPlayer[], rule: TransferPathRule): CareerPlayer[] {
  if (rule === 'active') return players.filter(isActivePlayer);
  if (rule === 'europe') {
    const out: CareerPlayer[] = [];
    for (const p of players) {
      const career = p.career.filter(s => isEuropeanClub(s.club));
      if (career.length === 0) continue;
      out.push(career.length === p.career.length ? p : { ...p, career });
    }
    return out;
  }
  return players;
}

/** The minimum and hint a puzzle carries under a rule, or null when it has no path under it. */
export function puzzleUnderRule(puzzle: TransferPathPuzzle, rule: TransferPathRule): TransferPathRuleHint | null {
  if (rule === 'classic') return { minSteps: puzzle.minSteps, hint: puzzle.hint };
  return puzzle[rule] ?? null;
}
