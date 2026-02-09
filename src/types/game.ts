export type League = 'Premier League' | 'La Liga' | 'Serie A' | 'Ligue 1' | 'Bundesliga' | 'Liga Portugal' | 'Eredivisie' | 'Scottish Premiership' | 'Belgian Pro League' | 'Turkish Süper Lig' | 'Austrian Bundesliga' | 'Swiss Super League' | 'Ukrainian Premier League' | 'Russian Premier League' | 'Danish Superliga' | 'Greek Super League' | 'Czech First League' | 'MLS' | 'Saudi Pro League' | 'Brazilian Série A' | 'Argentine Primera División';

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'CF' | 'ST';

export type Difficulty = 'easy' | 'hard' | 'insane';

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
  kitNumber: number;
  age: number;
  marketValue: number;
  difficulty: Difficulty;
}

export interface CellResult {
  value: string;
  status: CellStatus;
  arrow?: ArrowDirection;
  imageUrl?: string;
}

export interface GuessResult {
  playerName: string;
  isCorrect: boolean;
  cells: {
    nationality: CellResult;
    club: CellResult;
    goals: CellResult;
    assists: CellResult;
    position: CellResult;
    kitNumber: CellResult;
    age: CellResult;
    marketValue: CellResult;
  };
}
