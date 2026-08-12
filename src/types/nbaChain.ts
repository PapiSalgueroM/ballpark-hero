export interface ChainLink {
  playerName: string;
  connection?: string; // e.g. "Connected via Miami Heat (2011-12)"
}

export type ChainGamePhase = 'playing' | 'ended';

export interface ChainGameState {
  chain: ChainLink[];
  score: number;
  bestStreak: number;
  phase: ChainGamePhase;
  gameOverReason?: string;
}

// Starting players pool, randomly picked each game
export const CHAIN_STARTERS: string[] = [
  'LeBron James',
  'Stephen Curry',
  'Kevin Durant',
  'Kobe Bryant',
  'Michael Jordan',
  'Shaquille O\'Neal',
  'Tim Duncan',
  'Giannis Antetokounmpo',
  'Nikola Jokić',
  'James Harden',
  'Chris Paul',
  'Dwyane Wade',
  'Dirk Nowitzki',
  'Allen Iverson',
  'Russell Westbrook',
  'Kawhi Leonard',
  'Anthony Davis',
  'Kyrie Irving',
  'Damian Lillard',
  'Luka Dončić',
  'Joel Embiid',
  'Jayson Tatum',
  'Jimmy Butler',
  'Paul George',
  'Carmelo Anthony',
  'Dwight Howard',
  'Vince Carter',
  'Tracy McGrady',
  'Ray Allen',
  'Kevin Garnett',
];
