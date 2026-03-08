export interface College {
  name: string;
  nicknames: string[];
  mascot: string;
  vibeWord: string;
  region: string;
  state: string;
  enrollment: number;
  acceptanceRate: number;
  conference: string;
  conferenceType: 'power4' | 'group5' | 'independent';
  basketballHistory: string;
  cfbHistory: string;
  olympicAthletes: string;
  nflDraftHistory: string;
  famousAlumniHint: string;
  colors: string;
  funFact: string;
}

export type CollegeGameMode = 'daily' | 'unlimited' | 'conference';
export type CollegeDifficulty = 'easy' | 'hard';

export interface CollegeClue {
  number: number;
  icon: string;
  label: string;
  text: string;
}
