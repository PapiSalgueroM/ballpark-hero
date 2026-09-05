import type { CareerSeason } from '@/types/career';

/**
 * The text Career Quiz prints in one revealed board cell.
 *
 * Pulled out of CareerBoard so the rule lives in one testable place:
 * scripts/simNoZeroFacts.mjs runs it over every real season row in
 * career_seasons and fails if any cell states a number the table does not
 * have. That is the whole point of it being here rather than inline in the
 * component.
 */
export const CAREER_COLUMN_KEYS = ['season', 'club', 'appearances', 'goals', 'assists', 'marketValue'] as const;

export type CareerColumnKey = (typeof CAREER_COLUMN_KEYS)[number];

/** What a cell shows when the table has nothing in that column. */
const UNKNOWN = 'n/a';

/**
 * ROUND 443, two things this used to state that the table does not carry:
 *
 * 1. 173 season rows across 8 real players (Cruyff, Baggio, Platini, Shearer,
 *    Robbie Keane, Anelka, van der Sar, Schmeichel) have no assists column,
 *    because nobody counted assists in those leagues in those years. The cell
 *    ran String(assists) on a null and printed the literal word "null".
 * 2. Six rows carry a market value of 0: Vardy's four seasons at Stocksbridge
 *    Park Steels and Halifax, and Inzaghi at Piacenza and Leffe. Those are
 *    non-league seasons with no valuation on file, and "$0M" reads as a
 *    valuation of nothing rather than as no valuation.
 *
 * Both now read "n/a". Zero stays a real zero everywhere it is one: a striker
 * who scored none that season still shows 0 goals.
 */
export function careerCellValue(season: CareerSeason, key: CareerColumnKey): string {
  switch (key) {
    case 'season':
      return season.season;
    case 'club':
      return season.club;
    case 'appearances':
      return season.appearances == null ? UNKNOWN : String(season.appearances);
    case 'goals':
      return season.goals == null ? UNKNOWN : String(season.goals);
    case 'assists':
      return season.assists == null ? UNKNOWN : String(season.assists);
    case 'marketValue':
      return season.marketValue == null || season.marketValue === 0 ? UNKNOWN : `$${season.marketValue}M`;
  }
}
