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
import { sanitizeHallCal, sanitizeHallSpeech, sanitizeNumberRetired, stampHallCalibration } from './careerHallOfFame';
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
  /* Round 1051: the calibration stamp is only checked, never written here. A
     retired save with no stamp stays the bytes it is and reads calibration 1. */
  if (c.hallCal !== undefined) {
    const v = sanitizeHallCal(c.hallCal);
    if (v) c.hallCal = v; else delete c.hallCal;
  }
}

/** Round 1051: stamps the legacy calibration on the write that retires a
 *  career. The board calls it at the top of every save; it does nothing
 *  unless the career is retired and unstamped, and then it asks the save on
 *  disk: if that one is already retired this is an old retired save being
 *  written again (the speech, a coach career) and it keeps no stamp, so it
 *  goes on reading calibration 1. Otherwise this write is the retirement and
 *  it stamps today's calibration. An unreadable or missing save counts as
 *  not retired yet.
 *  Two tabs on one save, both ways. (1) The same career was retired a moment
 *  ago in another tab, so the save on disk is retired AND stamped while this
 *  tab still holds it live: this tab's retirement keeps the stamp that tab
 *  wrote (the review of 2026-10-08 measured the write taking it away, and the
 *  career then read calibration 1 on every later load). (2) Known and
 *  accepted: an old retired save whose storage is wiped or replaced in
 *  another tab while its board is open is written fresh with a stamp on its
 *  next save, because the disk no longer says it was retired. Mutates c. */
export function stampOnRetirement(c: UsCareerCore, saveKey: string): void {
  if (!c.retired || c.hallCal !== undefined) return;
  type OnDisk = { retired?: unknown; hallCal?: unknown; name?: unknown; pos?: unknown; draftPick?: unknown };
  let disk: OnDisk | null = null;
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) disk = (JSON.parse(raw) as { c?: OnDisk } | null)?.c ?? null;
  } catch { /* unreadable: not retired yet */ }
  if (disk?.retired !== true) { stampHallCalibration(c); return; }
  // Retired on disk already. With no stamp there it is an old retired save being written again: no stamp.
  // With one, and the same man, it is this career retired in another tab: keep what it was told.
  const told = sanitizeHallCal(disk.hallCal);
  if (told && disk.name === c.name && disk.pos === c.pos && disk.draftPick === c.draftPick) c.hallCal = told;
}

/** True when this offseason has the talk: it is pending now, or he already
 *  answered it 'one more year' for the season just played. (A farewell or a
 *  retirement settles the career, and the deck's cards stop on their own.) */
export function talkThisOffseason<C extends UsCareerCore>(c: C, hall: UsHallSport<C> | undefined): boolean {
  if (!hall) return false;
  return pendingTalk(c, hall) !== null || (c.retirement?.declinedYears ?? []).includes(lastSeasonYear(c));
}

/** The filter the summer takes, at the deal and at every card it opens: the
 *  deck's retirement cards are out of any offseason that has the talk. It
 *  reads the career when it is asked, so a talk that card 1 brings on (a
 *  rating drop into the rule) holds the later cards out too. Null with no
 *  Hall bound, which deals exactly the Round 1038 summer. */
export function talkDeckFilter<C extends UsCareerCore>(c: C, hall: UsHallSport<C> | undefined): ((e: { id: string }) => boolean) | null {
  if (!hall) return null;
  return e => RETIREMENT_CARD_IDS.has(e.id) && talkThisOffseason(c, hall);
}
