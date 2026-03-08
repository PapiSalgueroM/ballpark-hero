export interface WorldCupPuzzle {
  id: string;
  year: number;
  hostCountry: string;
  hostFlag: string;
  position: string;
  country: string;
  countryFlag: string;
  clubAtTime: string;
  achievement: string;
  answer: string;
}

export interface WorldCupClue {
  label: string;
  value: string;
}

export type WorldCupGameStatus = 'playing' | 'won' | 'lost';
