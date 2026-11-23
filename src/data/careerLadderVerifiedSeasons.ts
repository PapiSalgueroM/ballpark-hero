import type { CareerStint } from '@/lib/careerLadder';

export type SeasonTotals = Pick<CareerStint, 'goals' | 'assists' | 'appearances'>;

type SeasonCorrection = {
  previousClub: string;
  previousTotals?: { before: SeasonTotals; after: SeasonTotals };
  added: CareerStint;
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
    added: { season: '2025-2026', club: 'Liverpool', goals: 4, assists: 1, appearances: 22, marketValue: null, sortOrder: 8 },
    addedPartialTotals: { goals: 18, assists: 4, appearances: 25 },
  },
  // Opta and FootballAN agree on 49 apps and 14 goals. Their league assist totals are 7 and 8 respectively.
  // https://www.fcbarcelona.com/en/news/4319297/agreement-between-fc-barcelona-and-manchester-united-for-the-loan-of-marcus-rashford
  // https://www.manutd.com/en/news/manchester-united-transfer-ins-and-outs-summer-window-2025
  // https://theanalyst.com/players/4159/marcus-rashford/career
  // https://footballan.com/player/m-rashford/?season=2025-2026
  'a0000001-0000-0000-0000-000000000024': {
    previousClub: 'Aston Villa',
    added: { season: '2025-2026', club: 'Barcelona', goals: 14, assists: null, appearances: 49, marketValue: null, sortOrder: 10 },
    addedPartialTotals: { goals: 5, assists: 3, appearances: 18 },
  },
};
