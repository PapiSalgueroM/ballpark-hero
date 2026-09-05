export type League = 'Premier League' | 'La Liga' | 'Serie A' | 'Ligue 1' | 'Bundesliga' | 'Liga Portugal' | 'Eredivisie' | 'Scottish Premiership' | 'Belgian Pro League' | 'Turkish Süper Lig' | 'Austrian Bundesliga' | 'Swiss Super League' | 'Ukrainian Premier League' | 'Russian Premier League' | 'Danish Superliga' | 'Greek Super League' | 'Czech First League' | 'MLS' | 'Saudi Pro League' | 'Brazilian Série A' | 'Argentine Primera División' | 'J1 League' | 'K League 1' | 'Liga MX' | 'A-League' | 'Chinese Super League' | 'Indian Super League' | 'Colombian Primera A' | 'Chilean Primera División' | 'Paraguayan Primera División' | 'Uruguayan Primera División' | 'Peruvian Primera División' | 'Ecuadorian Serie A' | 'Croatian HNL' | 'Serbian SuperLiga' | 'Romanian SuperLiga' | 'Polish Ekstraklasa' | 'Norwegian Eliteserien' | 'Swedish Allsvenskan' | 'Finnish Veikkausliiga' | 'South African Premier Division' | 'Egyptian Premier League' | 'Moroccan Botola' | 'Tunisian Ligue 1' | 'Qatari Stars League' | 'UAE Pro League' | 'Scottish Championship' | 'EFL Championship' | 'Other';

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'CF' | 'ST';

export type Difficulty = 'easy' | 'hard' | 'insane';

/* Round 443: a fourth state, for a tile the game genuinely cannot judge.
 * Footle's KIT # column is the case that forced it: 1,375 of the 1,507 players
 * in the live pool have no squad number on file, so 'incorrect' would have the
 * board announce "wrong" about a comparison nobody can make. It paints the
 * same neutral grey as 'incorrect' and scores and shares the same, it just
 * does not claim the guess missed. */
export type CellStatus = 'correct' | 'close' | 'incorrect' | 'unknown';

export type ArrowDirection = 'up' | 'down' | null;

export interface Player {
  name: string;
  club: string;
  nationality: string;
  league: League;
  goals: number;
  assists: number;
  position: Position;
  /** Squad number, or null when none is on file. Round 443: it used to be 0 for
   *  "unknown", and Footle printed that 0 as though it were the man's number. */
  kitNumber: number | null;
  age: number;
  marketValue: number;
  difficulty: Difficulty;
  /** Pins the shown/simulated overall for generated fillers (Dart Draft academy prospects, trialists). */
  fixedOverall?: number;
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
