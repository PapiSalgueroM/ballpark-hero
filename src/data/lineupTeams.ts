import type { TeamAssignment } from '@/types/lineupBuilder';

const clubs: string[] = [
  'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich',
  'PSG', 'Chelsea', 'Arsenal', 'Manchester United', 'Juventus',
  'AC Milan', 'Inter Milan', 'Borussia Dortmund', 'Atlético Madrid', 'Tottenham',
  'Napoli', 'Benfica', 'Porto', 'Ajax', 'Bayer Leverkusen',
  'Roma', 'Sevilla', 'Sporting CP', 'Newcastle', 'Aston Villa',
  'West Ham', 'Marseille', 'Lyon', 'Celtic', 'Galatasaray',
];

const nations: string[] = [
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
