export interface GridPuzzle {
  id: string;
  rows: GridAttribute[];
  cols: GridAttribute[];
}

export interface GridAttribute {
  label: string;
  type: 'team' | 'college' | 'draft' | 'award' | 'position' | 'superbowl' | 'probowl' | 'misc';
}

export interface CellState {
  index: number;
  playerName: string | null;
  status: 'empty' | 'correct' | 'wrong';
  rarity: number | null; // percentage 0-100
}

export type FootballGridGameStatus = 'playing' | 'complete';
