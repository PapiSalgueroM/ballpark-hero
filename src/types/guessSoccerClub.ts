export interface SoccerClubPuzzle {
  id: string;
  fullName: string;
  commonNames: string[]; // aliases accepted in autocomplete
  country: string;
  league: string;
  clues: {
    vibe: string;
    leagueHint: string;
    leagueTitles: number;
    kitColors: string;
  };
  funFact: string;
  /**
   * Names of 1-3 notable current players at this club, text only (no
   * images). Populated live from player_market_values by top market value
   * (src/lib/fetchSoccerClubNotablePlayers.ts) when the club's name matches
   * a club in that table closely enough to trust; left empty for clubs with
   * no confident match (mostly non-Big-5-league/MLS puzzle entries) so the
   * clue tier is skipped rather than shown blank or guessed at.
   */
  notablePlayers?: string[];
}

export type GameMode = 'daily' | 'unlimited' | 'league';

export interface GuessSoccerClubState {
  puzzle: SoccerClubPuzzle;
  revealedClues: number; // 1 to MAX_CLUES
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  mode: GameMode;
  leagueFilter?: string;
}

// 6 clues -> scores 1200, 960, 720, 480, 240, 0. The added "Notable Players"
// tier sits between kit colors and the full-name reveal, so the point curve
// for the pre-existing 5 clues is stretched proportionally rather than
// having a 6th clue bolted on with a mismatched point jump.
export const POINTS_BY_CLUE = [1200, 960, 720, 480, 240, 0];

export const CLUE_LABELS = [
  'Vibe',
  'Country & League',
  'League Titles',
  'Kit Colors',
  'Notable Players',
  'Club Name',
];
