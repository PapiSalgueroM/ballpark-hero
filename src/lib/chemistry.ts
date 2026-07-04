/**
 * Shared chemistry-score utility (R6 Wave 9).
 *
 * Pure, framework-free math for a second, replayable scoring axis on top of
 * lineup-builder games: pairwise links between picked players based on
 * shared club, league, or nationality. Reused as-is by World XI, Build Your
 * XI, and Perfect Lineup as an ADDITIVE display layer only; nothing here
 * changes any existing scoring, grading, or verdict logic.
 *
 * Input shape is intentionally loose (all fields optional) so it adapts to
 * whatever each game's picked-player data actually carries, rather than
 * forcing every game onto one rigid Player type. If a game only has a
 * club or an assigned team, links just resolve from what is present.
 */

export interface ChemistryPlayer {
  /** Unique-enough label for display and dedupe (usually the player name). */
  name: string;
  club?: string;
  league?: string;
  nationality?: string;
  position?: string;
}

export type LinkType = 'club' | 'league' | 'nationality';

export interface ChemistryLink {
  a: string; // ChemistryPlayer.name
  b: string; // ChemistryPlayer.name
  type: LinkType;
}

export interface ChemistryResult {
  totalBonus: number;
  links: ChemistryLink[];
  /** Bonus points attributed to each player by name, capped per CHEMISTRY_WEIGHTS.perPlayerCap. */
  perPlayerBonus: Record<string, number>;
  /** Convenience counts, handy for a compact "3 club links, 2 league links" line. */
  counts: Record<LinkType, number>;
}

/**
 * v1 weights. Deliberately simple: every matching pair of a given type is
 * worth a flat number of points, capped per player so one super-connected
 * player cannot dominate the total. Tune here only, nothing else in this
 * file should need to change if these numbers move.
 */
export const CHEMISTRY_WEIGHTS = {
  club: 3, // same club = strongest link
  league: 2, // same league = medium link
  nationality: 1, // same nationality = light link
  perPlayerCap: 9, // v1 cap on bonus attributed to any single player
} as const;

const LINK_TYPES: LinkType[] = ['club', 'league', 'nationality'];

function fieldFor(p: ChemistryPlayer, type: LinkType): string | undefined {
  const raw = type === 'club' ? p.club : type === 'league' ? p.league : p.nationality;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Computes pairwise chemistry links across a list of picked players.
 * Order-independent, safe to call with any number of players (0, 1, or 11+).
 */
export function computeChemistry(players: ChemistryPlayer[]): ChemistryResult {
  const links: ChemistryLink[] = [];
  const perPlayerBonus: Record<string, number> = {};
  const counts: Record<LinkType, number> = { club: 0, league: 0, nationality: 0 };

  for (const p of players) perPlayerBonus[p.name] = 0;

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      if (a.name === b.name) continue;

      for (const type of LINK_TYPES) {
        const va = fieldFor(a, type);
        const vb = fieldFor(b, type);
        if (!va || !vb || va !== vb) continue;

        links.push({ a: a.name, b: b.name, type });
        counts[type]++;

        const pts = CHEMISTRY_WEIGHTS[type];
        perPlayerBonus[a.name] = Math.min(CHEMISTRY_WEIGHTS.perPlayerCap, (perPlayerBonus[a.name] ?? 0) + pts);
        perPlayerBonus[b.name] = Math.min(CHEMISTRY_WEIGHTS.perPlayerCap, (perPlayerBonus[b.name] ?? 0) + pts);
      }
    }
  }

  const totalBonus = Object.values(perPlayerBonus).reduce((sum, v) => sum + v, 0);

  return { totalBonus, links, perPlayerBonus, counts };
}

/**
 * Compact display line, e.g. "Chemistry +12: 3 club links, 2 league links".
 * Omits link types with zero count. Returns a "no links yet" line at 0 so
 * callers never render an empty string.
 */
export function formatChemistry(result: ChemistryResult): string {
  const parts: string[] = [];
  if (result.counts.club > 0) parts.push(`${result.counts.club} club link${result.counts.club === 1 ? '' : 's'}`);
  if (result.counts.league > 0) parts.push(`${result.counts.league} league link${result.counts.league === 1 ? '' : 's'}`);
  if (result.counts.nationality > 0) {
    parts.push(`${result.counts.nationality} nationality link${result.counts.nationality === 1 ? '' : 's'}`);
  }

  if (parts.length === 0) return `Chemistry +0: no links yet`;
  return `Chemistry +${result.totalBonus}: ${parts.join(', ')}`;
}
