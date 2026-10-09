import type { CareerState, SeasonRecord, UCLResult } from '@/lib/soccerCareerEngine';

// Fictional career results for tests. None of these scores are real results.
export const cupSeason: SeasonRecord = {
  year: 2027, age: 23, club: 'Arsenal', clubCountry: 'England', clubTier: 1,
  apps: 42, leagueApps: 30, goals: 14, assists: 9, cleanSheets: 0,
  yellowCards: 2, redCards: 0, rating: 7.2, leagueTitle: false, domesticCup: true,
  championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
  type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0,
  tournament: null, tournamentResult: null,
  cupRun: { cup: 'FA Cup', stages: [
    { stage: 'early', won: true },
    { stage: 'QF', opp: 'Chelsea', won: true, for: 2, against: 1, home: false },
    { stage: 'SF', opp: 'Liverpool', won: true, for: 1, against: 0 },
    { stage: 'F', opp: 'Newcastle', won: true },
  ], final: { for: 1, against: 1, legs: 1, decidedBy: 'penalties', pensFor: 5, pensAgainst: 4 } },
};

export const clubCampaign: UCLResult = {
  seasonYear: cupSeason.year, club: cupSeason.club, qualified: true,
  competition: 'Champions League', result: 'Quarter-final', playerGoals: 2, isTopScorer: false,
  matches: [
    { round: 'QF', opponent: 'Barcelona', leg: 1, home: true, goalsFor: 2, goalsAgainst: 1, playerGoals: 1, won: true },
    { round: 'QF', opponent: 'Barcelona', leg: 2, home: false, goalsFor: 0, goalsAgainst: 2, playerGoals: 0, won: false, aggFor: 2, aggAgainst: 3, decidedBy: 'aggregate' },
  ],
};

export const twoLegFinalSeason: SeasonRecord = {
  ...cupSeason, club: 'Al Ahly', clubCountry: 'Egypt', clubTier: 4, domesticCup: false, cupRun: undefined,
};
export const twoLegFinalCampaign: UCLResult = {
  ...clubCampaign, club: twoLegFinalSeason.club, competition: 'CAF Champions League', result: 'Winners', playerGoals: 1,
  matches: [
    { round: 'Final', opponent: 'Wydad', leg: 1, home: true, goalsFor: 2, goalsAgainst: 1, playerGoals: 1, won: true },
    { round: 'Final', opponent: 'Wydad', leg: 2, home: false, goalsFor: 1, goalsAgainst: 1, playerGoals: 0, won: true, aggFor: 3, aggAgainst: 2, decidedBy: 'aggregate' },
  ],
};
export const neutralFinalCampaign: UCLResult = {
  ...clubCampaign, result: 'Winners', playerGoals: 1,
  matches: [
    { round: 'Final', opponent: 'Barcelona', leg: 1, home: false, goalsFor: 2, goalsAgainst: 0, playerGoals: 1, won: true, decidedBy: 'aggregate' },
  ],
};

export const competitionCareer = { lastUCLResult: clubCampaign } as Pick<CareerState, 'lastUCLResult'>;

export const firstStageCampaign: UCLResult = {
  ...clubCampaign, result: 'League Phase', matches: [],
  firstStage: { kind: 'leaguePhase', through: false, stages: [{
    label: 'League phase', position: 27, of: 36, footnote: 'Saved test stage',
    myRow: { club: 'Arsenal', w: 0, d: 1, l: 1, gf: 1, ga: 2, pts: 1 },
    games: [
      { matchday: 1, opponent: 'Juventus', home: true, goalsFor: 0, goalsAgainst: 1, playerGoals: 0 },
      { matchday: 2, opponent: 'Dortmund', home: false, goalsFor: 1, goalsAgainst: 1, playerGoals: 1 },
    ],
  }] },
};
