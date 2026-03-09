export interface NascarDriverPuzzle {
  id: string;
  driver_name: string;
  common_names: string[];
  clues: string[];
}

export interface NascarDriverState {
  puzzle: NascarDriverPuzzle;
  revealedClues: number;
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  mode: 'daily' | 'unlimited';
}

export const MAX_CLUES = 6;

export const POINTS_BY_CLUE = [1000, 800, 600, 400, 200, 100];
