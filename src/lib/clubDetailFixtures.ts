import { careerLeagueOf, careerRoundPairs, leagueRounds, worldLeagueDefs, type CareerState } from '@/lib/clubManager';

export interface ClubLeagueFixtureRow {
  round: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'recorded' | 'unrecorded' | 'upcoming';
}

/** Read this season's saved league schedule without advancing the career. */
export function clubLeagueFixtures(career: CareerState, clubName: string): { leagueId: string; leagueName: string; rows: ClubLeagueFixtureRow[] } | null {
  const own = careerLeagueOf(career);
  let leagueId = own.id, leagueName = own.name, clubs = career.leagueClubs;
  let played = career.calendar.slice(0, career.week).filter(entry => entry.type === 'league').length;
  if (!clubs.includes(clubName)) {
    const league = worldLeagueDefs(career).find(league => league.id !== own.id && career.world?.[league.id]?.table.some(row => row.club === clubName));
    if (!league) return null;
    leagueId = league.id; leagueName = league.name;
    clubs = career.world![league.id].table.map(row => row.club);
    played = career.world![league.id].round;
  }
  if (clubs.length < 2) return null;
  const schedule = Array.from({ length: leagueRounds(clubs.length) }, (_, round) =>
    careerRoundPairs(career, round, clubs, leagueId).filter(pair => pair.includes(clubName)).map(([home, away]) => ({ round, home, away }))).flat();
  const meetings = new Map<string, number>();
  for (const row of schedule) {
    const key = `${row.home}|${row.away}`; meetings.set(key, (meetings.get(key) ?? 0) + 1);
  }
  const rows = schedule.map(({ round, home, away }): ClubLeagueFixtureRow => {
    const key = `${home}|${away}`, score = career.pairResults?.[leagueId]?.[key];
    // One saved tuple cannot identify a round when a directed pairing repeats.
    const recorded = round < played && meetings.get(key) === 1 && Array.isArray(score) && score.length === 2
      && score.every(goals => Number.isInteger(goals) && goals >= 0);
    return { round, home, away, homeGoals: recorded ? score[0] : null, awayGoals: recorded ? score[1] : null,
      status: round >= played ? 'upcoming' : recorded ? 'recorded' : 'unrecorded' };
  });
  return { leagueId, leagueName, rows };
}
