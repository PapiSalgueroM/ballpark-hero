export interface SoccerClubPuzzle {
  id: string;
  fullName: string;
  commonNames: string[]; // aliases accepted in autocomplete
  country: string;
  league: string;
  clues: {
    vibe: string;
    leagueHint: string;
    leagueTitles: number;
    kitColors: string;
  };
  funFact: string;
}

export type GameMode = 'daily' | 'unlimited' | 'league';

export interface GuessSoccerClubState {
  puzzle: SoccerClubPuzzle;
  revealedClues: number; // 1-5
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  mode: GameMode;
  leagueFilter?: string;
}

// 5 clues → scores 1200, 900, 600, 300, 0
export const POINTS_BY_CLUE = [1200, 900, 600, 300, 0];

export const CLUE_LABELS = [
  'Vibe',
  'Country & League',
  'League Titles',
  'Kit Colors',
  'Club Name',
];
