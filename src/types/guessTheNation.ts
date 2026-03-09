export interface NationPuzzle {
  id: string;
  countryName: string;
  commonNames: string[];
  flagEmoji: string;
  continent: string;
  difficulty: 'easy' | 'hard';
  seasonFocus: 'summer' | 'winter' | 'both';
  clues: {
    vibeWord: string;
    continentHint: string;
    populationHint: string;
    gamesAttendedHint: string;
    totalMedalsHint: string;
    bestSportHint: string;
    famousMomentHint: string;
    winterHistoryHint: string;
    goldMedalHint: string;
    flagColorsHint: string;
    countrySizeHint: string;
  };
  iconicMoment: string;
}

export interface GuessTheNationState {
  puzzle: NationPuzzle;
  mode: 'daily' | 'unlimited' | 'continent' | 'summer' | 'winter';
  difficulty: 'easy' | 'hard';
  continentFilter?: string;
  revealedClues: number;
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
}

export const MAX_CLUES = 12;

export const POINTS_BY_CLUE = [1200, 1100, 1000, 850, 700, 550, 400, 250, 150, 100, 50, 0];

export const CLUE_LABELS = [
  'Vibe',
  'Region',
  'Population',
  'Games Attended',
  'Total Medals',
  'Best Sport',
  'Famous Moment',
  'Winter History',
  'Gold Medals',
  'Flag Colors',
  'Country Size',
  'The Nation',
];

export const STREAK_BADGES = [
  { threshold: 3, label: 'Bronze Medalist', emoji: '🥉' },
  { threshold: 5, label: 'Silver Medalist', emoji: '🥈' },
  { threshold: 10, label: 'Gold Medalist', emoji: '🥇' },
  { threshold: 15, label: 'All Time Great', emoji: '🐐' },
];
