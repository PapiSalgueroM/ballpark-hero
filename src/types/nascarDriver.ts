export interface NascarDriverPuzzle {
  id: string;
  driver_name: string;
  common_names: string[];
  /* ROUND 374: the labels ship WITH the clues. The board used to hold a
     hardcoded list written for clue columns that never existed on the table,
     two of which were wrong for the real data: there is no car number anywhere
     in the database, and "Cup Series Wins" over a race results row is the one
     claim that source cannot support. Generated together, they cannot drift. */
  clue_labels: string[];
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
