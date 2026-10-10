/* Round 1221: what a sport's score law looks like to a game that is not its
   Season Center.

   A law is two things, in two files a sport, because a module is never split
   across chunks. The SCORE is what a press needs in the same tick: small,
   and static wherever it is used. The STORY is everything that tells a game
   after it is decided (the scoring plays of a final, their minutes, the
   clock, the club lines) and is only reached by whoever tells one. The NFL's
   are ./nflScore.ts and ./nfl.ts.

   Types only: nothing of this file is left in a build. */
import type { SeasonEvent } from '../season/core';

export type Rng = () => number;

/** A game an engine has already decided. `beyond`: it went past regulation, for an engine that draws that. */
export interface DecidedGame { homeWon: boolean; pHome: number; beyond?: boolean }

export interface ScoreLaw {
  id: string;
  /** [home, away] as the law itself plays a game whose home side wins `pHome` of the time. */
  score(pHome: number, rng: Rng, decided?: DecidedGame): [number, number];
}

/** A game clock, in the shape the Season Center's match clock is handed. */
export interface LawClock { length: number; label(minute: number): string; start: string; end: string; endShort: string; labelClass?: string }

export interface StoryLaw {
  id: string;
  /** The scoring plays that make that final, 'us' being the HOME club, minute ordered; null: no list makes it. */
  events(home: number, away: number, rng: Rng): SeasonEvent[] | null;
  clock: LawClock;
  /** One line for a scoring play of that club. */
  line(e: SeasonEvent, club: string): string;
}
