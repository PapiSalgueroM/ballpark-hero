export interface UfcFighter {
  name: string;
  nickname?: string;
  weightClass: string;
  record: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface FightResult {
  winner: string;
  loser: string;
  event: string;
  method: string;
  round: number;
  time: string;
}

export interface ChainLink {
  fighter: UfcFighter;
  defeatedBy?: UfcFighter;
}

export interface GameState {
  currentFighter: UfcFighter;
  chain: ChainLink[];
  score: number;
  gameStatus: 'playing' | 'ended';
  usedFighters: Set<string>;
  gameOverReason?: string;
  correctAnswer?: UfcFighter;
}

export type GameMode = 'daily' | 'unlimited' | 'hall-of-fame' | 'weight-class';