/* ─── Round 1039: the retirement talk on the one US career board ───

   Pure glue between the shared board (src/components/us-career/UsCareerBoard.tsx)
   and the Round 915 engines (careerRetirement.ts, careerHallOfFame.ts), for
   all four sports through the binding's optional `hall`.

   - The talk is DERIVED, never a phase: pendingTalk reads the career as it
     stands after a season, so a reload re-asks a talk nobody answered, and an
     old save already inside the rule is asked on its first load.
   - Nothing here draws a random number. The talk moves no stream.
   - The deck's own retirement cards (RETIREMENT_CARD_IDS) are held out of an
     offseason whose talk is pending, at the moment the summer is dealt, so
     one offseason never asks twice (scripts/simCareerHall.mjs, section 11).
     The deck files never import this file or the Hall data: the rule reaches
     the deal only through the board and the binding. */

import { answerRetirement, careerEndsAfter, retirementTalk, sanitizeRetirement } from './careerRetirement';
import type { RetirementChoiceId, RetirementTalk } from './careerRetirement';
import { sanitizeHallSpeech, sanitizeNumberRetired } from './careerHallOfFame';
import type { UsHallSport } from './careerHallOfFame';
import type { UsCareerCore } from './usCareerSport';

/** Every deck card that offers a retirement or a farewell, in the four life B
 *  decks. scripts/simCareerHall.mjs (section 11) fails if a card whose answer
 *  writes a farewell is missing here, or an id here is in no deck. */
export const RETIREMENT_CARD_IDS: ReadonlySet<string> = new Set([
  'lifeB_retireHealthy', 'lifeB_retirementTour',
  'nbaB_retireHealthy', 'nbaB_farewellTour',
  'mlbB_retireHealthy', 'mlbB_farewellTour',
  'nhlB_farewellTour', 'nhlB_walkAwayHealthy',
]);

/** The season the talk is about: the last one played. */
export function lastSeasonYear(c: UsCareerCore): number {
  return c.seasons.length ? c.seasons[c.seasons.length - 1].year : c.year;
}

/** The talk the career owes right now, or null: no Hall bound, retired, no
 *  season played yet, or the rule does not hold. */
export function pendingTalk<C extends UsCareerCore>(c: C, hall: UsHallSport<C> | undefined): RetirementTalk | null {
  if (!hall || c.retired || c.seasons.length === 0) return null;
  return retirementTalk(hall.retirement, hall.snapshot(c), c.retirement);
}

/** Writes the answer for the season just played. Mutates c (the board's copy). */
export function answerTalk(c: UsCareerCore, choice: RetirementChoiceId): void {
  c.retirement = answerRetirement(c.retirement, lastSeasonYear(c), choice);
}

/** True when a decision of his (the talk, a deck farewell, the retire button)
 *  ends the career after the season labelled `year`. */
export function endsAfterSeason(c: UsCareerCore, year: number): boolean {
  return careerEndsAfter(c.retirement, year);
}

/** 'Hang them up now': the last season played is the last. Mutates c. */
export function manualRetire(c: UsCareerCore): void {
  c.retirement = answerRetirement(c.retirement, lastSeasonYear(c), 'retireNow');
}

/** Repair on load, the house pattern: each of the three Round 1039 blocks is
 *  checked alone and a broken one is dropped alone. Old saves have none and
 *  come back untouched. Mutates c. */
export function repairHallOnLoad(c: UsCareerCore): void {
  if (c.retirement !== undefined) {
    const r = sanitizeRetirement(c.retirement);
    if (Object.keys(r).length) c.retirement = r; else delete c.retirement;
  }
  if (c.hallSpeech !== undefined) {
    const s = sanitizeHallSpeech(c.hallSpeech);
    if (Object.keys(s).length) c.hallSpeech = s; else delete c.hallSpeech;
  }
  if (c.numberRetiredBy !== undefined) {
    const n = sanitizeNumberRetired(c.numberRetiredBy);
    if (n) c.numberRetiredBy = n; else delete c.numberRetiredBy;
  }
}

/** The filter the summer deal takes: the deck's retirement cards are out
 *  while the talk is pending, and nothing is filtered otherwise (null, so the
 *  deal is the Round 1038 one draw for draw). */
export function talkDeckFilter<C extends UsCareerCore>(c: C, hall: UsHallSport<C> | undefined): ((e: { id: string }) => boolean) | null {
  if (!pendingTalk(c, hall)) return null;
  return e => RETIREMENT_CARD_IDS.has(e.id);
}
