export interface College {
  name: string;
  nicknames: string[];
  mascot: string;
  vibeWord: string;
  region: string;
  state: string;
  /** Total fall headcount for `ipedsUnitId` in `enrollmentYear`. Absent when the
   *  two publishers could not be made to agree on the same population; those
   *  schools are listed in COLLEGE_THIN and the clue says the number is withheld. */
  enrollment?: number;
  /** Fall of this year, so the clue can date its own number. */
  enrollmentYear?: number;
  /** IPEDS unit id, so anyone can pull the row again rather than trust this file. */
  ipedsUnitId: number;
  conference: string;
  conferenceType: 'power4' | 'group5' | 'independent';
  /** Shown beside the conference when membership needs a caveat, e.g. a full
   *  member everywhere except football. */
  conferenceNote?: string;
  basketballHistory: string;
  cfbHistory: string;
  /** Absent when nothing checkable was left after the audit. */
  olympicAthletes?: string;
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
