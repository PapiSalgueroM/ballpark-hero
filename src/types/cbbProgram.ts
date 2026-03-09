export interface CbbProgramPuzzle {
  id: string;
  school_name: string;
  common_names: string[];
  clues: string[];
}

export interface CbbProgramState {
  puzzle: CbbProgramPuzzle;
  revealedClues: number;
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  mode: 'daily' | 'unlimited';
}

export const MAX_CLUES = 6;

export const POINTS_BY_CLUE = [1000, 800, 600, 400, 200, 100];
