/* Round 1569: the extension talk with no offer, in all four US careers.

   A player report of 2026-10-26 (NBA My Career, "20 szn no offer"). The
   shared market (usCareerFreeAgency.ts) can never come back empty: the
   incumbent always offers and never walks. What does come back empty is the
   extension talk before the last year of a deal (usCareerExtension.ts
   buildExtension, below a leverage of 0.18), and its card gave one button and
   no reason, and promised a free agency that the engine's own age or length
   limit could make sure never came. Measured on 150 seeded careers a sport
   from season 16 on: 282 of 400 extension talks carried no offer, and 3 of
   them were followed by a season that ended the career.

   This file is pure: no rng, no storage. It reads the career and the sport's
   own retire rule and the extension's own leverage inputs, so it says
   nothing a sport's numbers do not already decide. */
import type { UsCareerCore } from './usCareerSport';

/** True when the season about to be played ends the career whatever happens:
 *  the sport's own retire rule already holds a year older with one more
 *  season played, at today's rating. A rating only falls at that age, so
 *  this never says "last" for a season that could be followed by another. */
export function seasonAheadIsLast<C extends UsCareerCore>(c: C, shouldRetire: (c: C) => boolean): boolean {
  if (c.retired) return false;
  const last = c.seasons[c.seasons.length - 1];
  const ahead = { ...c, age: c.age + 1, seasons: [...c.seasons, last ?? c.seasons[0]] } as C;
  return shouldRetire(ahead);
}

export interface NoOfferFacts {
  age: number;
  ovr: number;
  /** The position's decline age, the same one the extension's leverage reads. */
  cliffAge: number;
  /** What the open market would pay a year, in millions (the talk's own number). */
  market: number;
}

/** Why the club offered nothing, in plain words. The two inputs the
 *  extension's leverage weighs (usCareerExtension.ts extensionLeverage):
 *  years past the position's decline age, and a rating under the level a
 *  club pays to keep (a rating of 76 or under carries less than the 0.18 the
 *  club needs on its own, at no accolades).
 *  The decline age is this game's own tuning, not a sourced fact about the
 *  real sport (published aging curves put the real decline earlier for most
 *  positions), so the sentence says it is how this game's clubs price him,
 *  and names no position code (a raw "a SF" or "a 1B" read wrong). */
export function noOfferWhy(f: NoOfferFacts): string {
  const reasons: string[] = [];
  const past = f.age - f.cliffAge;
  if (past > 0) reasons.push(`at ${f.age} you are ${past} year${past === 1 ? '' : 's'} past the age this game's clubs start pricing in decline at your position`);
  if (f.ovr <= 76) reasons.push(`a ${f.ovr} rating is not one they pay to keep`);
  if (!reasons.length) reasons.push('they would rather keep the money free than commit to more years');
  const body = reasons.join(', and ');
  return `No offer, and here is why: ${body}. The open market prices you around $${f.market}M a year.`;
}
