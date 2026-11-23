import type { CareerStint } from '@/lib/careerLadder';

export type SeasonTotals = Pick<CareerStint, 'goals' | 'assists' | 'appearances'>;

type SeasonCorrection = {
  previousClub: string;
  previousTotals?: { before: SeasonTotals; after: SeasonTotals };
  firstClubInPreviousSeason?: Omit<CareerStint, 'season' | 'sortOrder'> & { aliases: readonly string[] };
  added: Omit<CareerStint, 'sortOrder'>;
  addedPartialTotals: SeasonTotals;
};

/** Completed senior club seasons missing or partial in the Career Ladder feed. */
export const CAREER_LADDER_VERIFIED_SEASONS: Partial<Record<string, SeasonCorrection>> = {
  // The transfer and completed club totals, independently listed by Opta and PlaymakerStats.
  // https://www.newcastleunited.com/en/news/newcastle-united-sell-alexander-isak
  // https://theanalyst.com/players/4199/alexander-isak/career
  // https://www.playmakerstats.com/player/alexander-isak/509348?epoca_id=155
  // https://www.playmakerstats.com/player/alexander-isak/509348?epoca_id=154
  'a0000001-0000-0000-0000-000000000060': {
    previousClub: 'Newcastle',
    previousTotals: {
      before: { goals: 18, assists: 3, appearances: 25 },
      after: { goals: 27, assists: 6, appearances: 42 },
    },
    added: { season: '2025-2026', club: 'Liverpool', goals: 4, assists: 1, appearances: 22, marketValue: null },
    addedPartialTotals: { goals: 18, assists: 4, appearances: 25 },
  },
  // The 2024/25 United and Villa senior stints are split at the February loan.
  // https://www.manutd.com/en/news/loan-news-marcus-rashford-joins-aston-villa-from-man-utd
  // https://next.avfc.co.uk/news/2026/november/02/prematch-barcelona-connections/
  // https://www.playmakerstats.com/player/marcus-rashford/434080?epoca_id=154
  // https://statbunker.com/players/GetHistoryStats?comps_type=-1&dates=2024&player_id=52719
  // Published Villa assist totals differ. The Barcelona totals also differ by one league assist.
  // https://www.fcbarcelona.com/en/news/4319297/agreement-between-fc-barcelona-and-manchester-united-for-the-loan-of-marcus-rashford
  // https://www.manutd.com/en/news/manchester-united-transfer-ins-and-outs-summer-window-2025
  // https://theanalyst.com/players/4159/marcus-rashford/career
  // https://footballan.com/player/m-rashford/?season=2025-2026
  'a0000001-0000-0000-0000-000000000024': {
    previousClub: 'Aston Villa',
    previousTotals: {
      before: { goals: 7, assists: 3, appearances: 24 },
      after: { goals: 4, assists: null, appearances: 17 },
    },
    firstClubInPreviousSeason: {
      club: 'Manchester United', aliases: ['Man Utd', 'Manchester Utd', 'Man United'], goals: 7, assists: 3, appearances: 24, marketValue: null,
    },
    added: { season: '2025-2026', club: 'Barcelona', goals: 14, assists: null, appearances: 49, marketValue: null },
    addedPartialTotals: { goals: 5, assists: 3, appearances: 18 },
  },
};
