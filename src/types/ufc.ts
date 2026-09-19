export type WeightClass =
  | 'Strawweight'
  | 'Flyweight'
  | 'Bantamweight'
  | 'Featherweight'
  | 'Lightweight'
  | 'Welterweight'
  | 'Middleweight'
  | 'Light Heavyweight'
  | 'Heavyweight';

export const WEIGHT_CLASS_ORDER: WeightClass[] = [
  'Strawweight',
  'Flyweight',
  'Bantamweight',
  'Featherweight',
  'Lightweight',
  'Welterweight',
  'Middleweight',
  'Light Heavyweight',
  'Heavyweight',
];

/* Round 660: age is no longer typed. A typed age is wrong for every fighter
   whose birthday has passed since the day it was written, so the row carries
   the verified birth date and the game computes the age on the day it is
   played (ageOn in src/lib/ufcGameLogic.ts). The P4P column went at the same
   time: the UFC has only published pound for pound rankings since 2013, so a
   "highest ever" rank for Royce Gracie or Ken Shamrock was invented, and no
   two sources record every fighter's peak. yearsActive is the span from the
   year of the first UFC bout to the year of the latest one. */
export interface UfcFighter {
  name: string;
  nationality: string;
  weightClass: WeightClass;
  yearsActive: string; // e.g. "2005-2023"
  yearsActiveStart: number;
  yearsActiveEnd: number;
  record: string; // e.g. "29-7-0"
  wins: number;
  losses: number;
  draws: number;
  birthDate: string; // YYYY-MM-DD
  koTko: number;
  submissions: number;
}

export type UfcCellStatus = 'correct' | 'close' | 'incorrect';
export type UfcArrowDirection = 'up' | 'down' | null;

export interface UfcCellResult {
  value: string;
  status: UfcCellStatus;
  arrow?: UfcArrowDirection;
}

export interface UfcGuessResult {
  fighterName: string;
  isCorrect: boolean;
  cells: {
    yearsActive: UfcCellResult;
    weightClass: UfcCellResult;
    nationality: UfcCellResult;
    age: UfcCellResult;
    wins: UfcCellResult;
    losses: UfcCellResult;
    draws: UfcCellResult;
    koTko: UfcCellResult;
    submissions: UfcCellResult;
  };
}
