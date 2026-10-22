/* Round 1523: the Puskas Award only from the season it was first given for, and the year convention proven
   rather than assumed. A season row's year is the year the season STARTS (seasonLabel prints 2008 as 2008-09),
   and the first winning goal was scored on 15 April 2009, a month the engine files under the season starting in
   2008 (monthYear). So 2008 is the first season that may hold the award, and the season card that deals a
   nominated goal already draws the same line. The engine's era fleet (scripts/simCareerForm.mjs section 5) holds
   zero awards before it. */
import { describe, expect, it } from 'vitest';
import { cardFitsSeason, FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { monthYear, PUSKAS_FIRST_SEASON, puskasAwardExists, seasonLabel } from '@/lib/soccerWorldTruth';

const STATS = { pace: 80, shooting: 85, passing: 75, dribbling: 80, defending: 40, physical: 70, reflexes: 30 };

function withSeason(year: number, goals: number): CareerState {
  const c = initCareer('Year Test', 'England', 'ST', '2005-09', STATS, 80, 2005, FALLBACK_CLUBS, null);
  const row = { year, age: 24, club: c.currentClub, clubCountry: c.currentClubCountry, clubTier: c.currentClubTier, apps: 30, goals,
    assists: 4, cleanSheets: 0, yellowCards: 1, redCards: 0, rating: 7.4, leagueTitle: false, domesticCup: false,
    championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing', intApps: 0, intGoals: 0,
    intAssists: 0, intRating: 0, tournament: null, tournamentResult: null } as unknown as SeasonRecord;
  return { ...c, seasons: [row] };
}

describe('the Puskas Award year (Round 1523)', () => {
  it('reads the first season as 2008-09, the season of the first winning goal', () => {
    expect(PUSKAS_FIRST_SEASON).toBe(2008);
    expect(seasonLabel(PUSKAS_FIRST_SEASON)).toBe('2008-09');
    expect(monthYear('April', PUSKAS_FIRST_SEASON)).toBe(2009);
    expect(monthYear('April', PUSKAS_FIRST_SEASON - 1)).toBe(2008);
  });

  it('gives no award for a season before it and does for that season on', () => {
    expect(puskasAwardExists(1990)).toBe(false);
    expect(puskasAwardExists(2007)).toBe(false);
    expect(puskasAwardExists(2008)).toBe(true);
    expect(puskasAwardExists(2031)).toBe(true);
  });

  it('agrees with the season card that deals a nominated goal', () => {
    for (const year of [2005, 2006, 2007, 2008, 2009, 2012]) {
      expect(cardFitsSeason(7, withSeason(year, 18))).toBe(puskasAwardExists(year));
    }
  });
});
