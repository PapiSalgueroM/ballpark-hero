import type { CareerStint } from '@/lib/careerLadder';

type SeasonCorrection = {
  previousClub: string;
  added: CareerStint;
  previousTotals?: {
    before: Pick<CareerStint, 'goals' | 'assists' | 'appearances'>;
    after: Pick<CareerStint, 'goals' | 'assists' | 'appearances'>;
  };
};

/** Completed senior club seasons missing from the Career Ladder feed. */
export const CAREER_LADDER_VERIFIED_SEASONS: Partial<Record<string, SeasonCorrection>> = {
  // Isak to Liverpool and the Liverpool 2025/26 and Newcastle 2024/25 totals.
  // https://www.liverpoolfc.com/news/liverpool-complete-signing-alexander-isak
  // https://www.newcastleunited.com/en/news/newcastle-united-sell-alexander-isak
  // https://www.playmakerstats.com/player/alexander-isak/509348?epoca_id=155
  // https://www.apwin.com/player/1501/alexander-isak/
  // https://www.playmakerstats.com/player/alexander-isak/509348?epoca_id=154
  // https://fbref.com/en/players/8e92be30/all_comps/Alexander-Isak-Stats---All-Competitions
  'a0000001-0000-0000-0000-000000000060': {
    previousClub: 'Newcastle',
    added: { season: '2025-2026', club: 'Liverpool', goals: 4, assists: 1, appearances: 22, marketValue: null, sortOrder: 8 },
    previousTotals: {
      before: { goals: 18, assists: 3, appearances: 25 },
      after: { goals: 27, assists: 6, appearances: 42 },
    },
  },
  // Rashford's 2025/26 Barcelona loan and all-competition totals.
  // https://www.fcbarcelona.com/en/news/4319297/agreement-between-fc-barcelona-and-manchester-united-for-the-loan-of-marcus-rashford
  // https://fbref.com/en/players/a1d5bd30/all_comps/Marcus-Rashford-Stats---All-Competitions
  // https://footballan.com/player/m-rashford/?season=2025-2026
  'a0000001-0000-0000-0000-000000000024': {
    previousClub: 'Aston Villa',
    added: { season: '2025-2026', club: 'Barcelona', goals: 14, assists: 11, appearances: 49, marketValue: null, sortOrder: 10 },
  },
};
