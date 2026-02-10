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
  age: number;
  koTko: number;
  submissions: number;
  highestP4PRank: number; // 1 = #1 ever
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
    p4pRank: UfcCellResult;
  };
}
