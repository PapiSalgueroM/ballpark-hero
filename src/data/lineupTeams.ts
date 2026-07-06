import type { TeamAssignment } from '@/types/lineupBuilder';

export const clubs: string[] = [
  'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich',
  'PSG', 'Chelsea', 'Arsenal', 'Manchester United', 'Juventus',
  'AC Milan', 'Inter Milan', 'Borussia Dortmund', 'Atlético Madrid', 'Tottenham',
  'Napoli', 'Benfica', 'Porto', 'Ajax', 'Bayer Leverkusen',
  'Roma', 'Sevilla', 'Sporting CP', 'Newcastle', 'Aston Villa',
  'West Ham', 'Marseille', 'Lyon', 'Celtic', 'Galatasaray',
];

export const nations: string[] = [
  'Argentina', 'France', 'Brazil', 'England', 'Belgium',
  'Croatia', 'Netherlands', 'Portugal', 'Spain', 'Italy',
  'Germany', 'Uruguay', 'Colombia', 'USA', 'Mexico',
  'Senegal', 'Japan', 'South Korea', 'Nigeria', 'Denmark',
  'Switzerland', 'Morocco', 'Serbia', 'Poland', 'Cameroon',
];

const allTeams: TeamAssignment[] = [
  ...clubs.map((name) => ({ name, isNation: false })),
  ...nations.map((name) => ({ name, isNation: true })),
];

/** Return a shuffled list of 11 unique teams for a game session */
export function getRandomTeamAssignments(count = 11): TeamAssignment[] {
  const shuffled = [...allTeams].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * player_market_values.club stores some clubs under a different name than
 * the short label used for team assignments here (verified via execute_sql
 * on flawuiqbvjobmkfkauhw, 2026-07-06): a plain ilike('%PSG%') or
 * ilike('%Bayer Leverkusen%') returns zero rows even though the club exists,
 * because the stored value is the fuller/official name. Every other club in
 * `clubs` above substring-matches its stored value directly, so only the
 * mismatches need an entry here. Used to build the autocomplete's club
 * filter so a slot's suggestion pool is never accidentally empty.
 */
const CLUB_SEARCH_ALIASES: Record<string, string> = {
  'PSG': 'Paris Saint-Germain',
  'Atlético Madrid': 'Atlético de Madrid',
  'Bayer Leverkusen': 'Bayer 04 Leverkusen',
};

/** Returns the substring to filter player_market_values.club by for a given club label. */
export function clubSearchTerm(clubName: string): string {
  return CLUB_SEARCH_ALIASES[clubName] ?? clubName;
}
