export interface YearPuzzle {
  year: number;
  clues: string[];
}

export interface GuessTheYearState {
  puzzle: YearPuzzle;
  revealedClues: number;
  guesses: number[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
}

export const POINTS_BY_CLUE = [1000, 800, 600, 400, 200, 100];
