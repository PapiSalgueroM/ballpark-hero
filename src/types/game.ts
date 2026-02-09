export type League = 'Premier League' | 'La Liga' | 'Serie A' | 'Ligue 1' | 'Bundesliga';

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'CF' | 'ST';

export type Difficulty = 'easy' | 'hard';

export type CellStatus = 'correct' | 'close' | 'incorrect';

export type ArrowDirection = 'up' | 'down' | null;

export interface Player {
  name: string;
  club: string;
  nationality: string;
  league: League;
  goals: number;
  assists: number;
  position: Position;
  heightCm: number;
  kitNumber: number;
  age: number;
  marketValue: number; // in millions USD
  difficulty: Difficulty;
}

export interface CellResult {
  value: string;
  status: CellStatus;
  arrow?: ArrowDirection;
}

export interface GuessResult {
  playerName: string;
  isCorrect: boolean;
  cells: {
    nationality: CellResult;
    league: CellResult;
    goals: CellResult;
    assists: CellResult;
    position: CellResult;
    height: CellResult;
    kitNumber: CellResult;
    age: CellResult;
    marketValue: CellResult;
  };
}
