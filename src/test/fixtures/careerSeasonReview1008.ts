import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';

// Fictional saved seasons. Expectations are literal saved values, never a review formatter.
export const reviewSports: Record<string, UsCareerSport> = {
  nba: NBA_CAREER_SPORT, nfl: NFL_CAREER_SPORT, mlb: MLB_CAREER_SPORT, nhl: NHL_CAREER_SPORT,
};
export interface ReviewFixture {
  slug: string;
  pos: string;
  games: number;
  gamesLabel: string;
  fields: Record<string, number | string>;
  regular: Record<string, string>;
  postseason: Record<string, string>;
}
export const reviewFixtures: ReviewFixture[] = [
  { slug: 'nba', pos: 'PG', games: 76, gamesLabel: 'Games',
    fields: { ppg: 24.6, rpg: 6.2, apg: 8.1, poGames: 19, poPpg: 26.1, poRpg: 5.8, poApg: 7.4 },
    regular: { 'Points per game': '24.6', 'Rebounds per game': '6.2', 'Assists per game': '8.1' },
    postseason: { Games: '19', 'Points per game': '26.1', 'Rebounds per game': '5.8', 'Assists per game': '7.4' } },
  { slug: 'nfl', pos: 'QB', games: 16, gamesLabel: 'Games',
    fields: { passYds: 4123, passTd: 31, ints: 8, tackles: 999, poGames: 3, poLine: '811 yds, 6 TD, 1 INT' },
    regular: { 'Passing yards': '4123', 'Passing touchdowns': '31', 'Interceptions thrown': '8' },
    postseason: { Games: '3', Performance: '811 yds, 6 TD, 1 INT' } },
  { slug: 'nfl', pos: 'EDGE', games: 15, gamesLabel: 'Games',
    fields: { sacks: 13.5, tackles: 62, forcedFum: 4, passYds: 999, poGames: 2, poLine: '3 sacks, 11 tackles' },
    regular: { Sacks: '13.5', Tackles: '62', 'Forced fumbles': '4' },
    postseason: { Games: '2', Performance: '3 sacks, 11 tackles' } },
  { slug: 'mlb', pos: 'CF', games: 151, gamesLabel: 'Games',
    fields: { avg: .287, hr: 29, rbi: 94, sb: 23, obp: .361, doubles: 37, era: 999, poGames: 8, poLine: '9 for 31 (0.290), 2 HR' },
    regular: { 'Batting average': '0.287', 'Home runs': '29', 'Runs batted in': '94', 'Stolen bases': '23', 'On base percentage': '0.361', Doubles: '37' },
    postseason: { 'Team postseason games': '8', Performance: '9 for 31 (0.290), 2 HR' } },
  { slug: 'mlb', pos: 'SP', games: 30, gamesLabel: 'Starts',
    fields: { wins: 16, lossesP: 7, era: 3.2, so: 211, hr: 999, poGames: 6, poLine: '2 appearances, 2.80 ERA, 19 K' },
    regular: { Wins: '16', Losses: '7', ERA: '3.20', Strikeouts: '211' },
    postseason: { 'Team postseason games': '6', Performance: '2 appearances, 2.80 ERA, 19 K' } },
  { slug: 'mlb', pos: 'RP', games: 61, gamesLabel: 'Appearances',
    fields: { saves: 27, holds: 6, era: 2.4, so: 83, hr: 999, poGames: 7, poLine: '4 appearances, 1.80 ERA, 8 K' },
    regular: { Saves: '27', Holds: '6', ERA: '2.40', Strikeouts: '83' },
    postseason: { 'Team postseason games': '7', Performance: '4 appearances, 1.80 ERA, 8 K' } },
  { slug: 'nhl', pos: 'C', games: 78, gamesLabel: 'Games',
    fields: { goals: 34, assists: 51, points: 85, wins: 999, poGames: 13, poGoals: 5, poAssists: 9, poPoints: 14 },
    regular: { Goals: '34', Assists: '51', Points: '85' },
    postseason: { Games: '13', Goals: '5', Assists: '9', Points: '14' } },
  { slug: 'nhl', pos: 'D', games: 79, gamesLabel: 'Games',
    fields: { goals: 11, assists: 38, points: 49, wins: 999, poGames: 12, poGoals: 2, poAssists: 6, poPoints: 8 },
    regular: { Goals: '11', Assists: '38', Points: '49' },
    postseason: { Games: '12', Goals: '2', Assists: '6', Points: '8' } },
  { slug: 'nhl', pos: 'G', games: 53, gamesLabel: 'Games',
    fields: { wins: 32, svpct: .918, goals: 999, poGames: 11, poWins: 6, poSvpct: .926 },
    regular: { Wins: '32', 'Save percentage': '0.918' },
    postseason: { Games: '11', Wins: '6', 'Save percentage': '0.926' } },
];

export function makeReviewCareer(fixture: ReviewFixture, retired = false): UsCareerCore {
  const sport = reviewSports[fixture.slug];
  const career: UsCareerCore = sport.startCareer(`Fixture ${sport.label} ${fixture.pos}`, fixture.pos,
    sport.create.archetypes[fixture.pos][0], () => .42, defaultAppearance(), 'now');
  const row = { year: 2032, team: career.team, age: 25, ovr: 84, games: fixture.games,
    salary: 12.75, teamResult: 'Fixture conference final', awards: ['Fixture All-Star', 'Fixture Sportsmanship'], ...fixture.fields };
  career.seasons = [
    { ...row, year: 2030, age: 23, ovr: 71, games: fixture.games - 4, salary: 3.5, awards: [] },
    row,
    { ...row, year: 2033, age: 26, ovr: 82, games: fixture.games - 1, salary: 14, awards: [] },
  ] as UsCareerSeason[];
  Object.assign(career, { year: 2034, age: 38, ovr: 96, salary: 99, contractYears: 3,
    retired, role: 'starter', netWorth: 20, pendingRivalryEvent: null, pendingRivalryChoice: null });
  return career;
}

export function reviewSave(career: UsCareerCore): string {
  return JSON.stringify({ c: career, phase: career.retired ? 'retired' : 'season', teamQuality: 80, coach: null });
}
