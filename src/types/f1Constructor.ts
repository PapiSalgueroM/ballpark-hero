export interface F1ConstructorPuzzle {
  id: string;
  constructorName: string;
  commonNames: string[];
  clues: string[];
}

export interface F1ConstructorState {
  puzzle: F1ConstructorPuzzle;
  revealedClues: number;
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  mode: 'daily' | 'unlimited';
}

export const MAX_CLUES = 6;

export const POINTS_BY_CLUE = [1000, 800, 600, 400, 200, 100];
