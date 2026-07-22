export type Connect4Team = 'blue' | 'red';

export interface Connect4Cell {
  team: Connect4Team;
  playerName: string;
}

export interface Connect4Board {
  id: string;
  name: string;
  columnAttributes: string[];  // 7 attributes
  rowAttributes: string[];     // 6 attributes
}

export type Connect4Grid = (Connect4Cell | null)[][];

export type Connect4Phase = 'playing' | 'won' | 'draw';

export interface Connect4WinInfo {
  winner: Connect4Team;
  cells: [number, number][];  // winning 4 cells [row, col]
}
