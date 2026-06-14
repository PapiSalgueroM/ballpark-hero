export interface NflTeamPuzzle {
  id: string;
  fullName: string;
  city: string;
  nickname: string;
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';
  clues: {
    vibe: string;
    region: string;
    stadiumCapacity: number;
    superBowlAppearances: number;
    superBowlWins: number;
    famousPlayerHint: string;
    colors: string;
    stadiumHint: string;
    nicknameHint: string;
  };
  funFact: string;
  isRelocated?: boolean;
}

export type GameMode = 'daily' | 'unlimited' | 'conference';
export type Difficulty = 'easy' | 'hard';

export interface GuessNflTeamState {
  puzzle: NflTeamPuzzle;
  revealedClues: number;
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  mode: GameMode;
  difficulty: Difficulty;
  conferenceFilter?: 'AFC' | 'NFC';
  divisionFilter?: string;
}

export const POINTS_BY_CLUE = [1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 0];

export const CLUE_LABELS = [
  'Franchise Fact',
  'Franchise Fact',
  'Stadium Capacity',
  'Conference & Division',
  'Super Bowl Appearances',
  'Super Bowl Wins',
  'Franchise Fact',
  'Uniform Colors',
  'Franchise Fact',
  'Nickname Hint',
  'City',
  'Full Reveal'
];
