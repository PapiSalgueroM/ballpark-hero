export interface SoccerGridPuzzle {
  id: string;
  rows: SoccerGridAttribute[];
  cols: SoccerGridAttribute[];
}

export interface SoccerGridAttribute {
  label: string;
  type: 'club' | 'nationality' | 'league' | 'award' | 'position' | 'champions_league' | 'world_cup' | 'misc';
}

export interface SoccerGridCell {
  index: number;
  playerName: string | null;
  status: 'empty' | 'correct' | 'wrong';
  rarity: number | null;
}

export type SoccerGridGameStatus = 'playing' | 'complete';
