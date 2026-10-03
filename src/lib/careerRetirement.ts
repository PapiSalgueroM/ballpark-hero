/* ────────────────────────────────────────────────────────────────────────────
   careerRetirement.ts, the retirement talk and the farewell season (Round 915)

   One engine, many sports. Soccer Career ends on a warning, a choice and a
   ceremony; the four American careers ended on a hard stop. This module is the
   talk with no sport in it: when the rating has fallen far enough from the
   career peak, or under a floor, past a set age, the player is asked whether
   it is time. He can stop now, play one more year (and hear it again next
   year unless he climbs back inside the rule: the talk reads where he stands,
   not whether he fell again), or announce a farewell season: the next season
   is his last whatever the numbers say.

   The sport's own hard stop is untouched. A snapshot marked `forced` means the
   sport has already ended the career, so there is no talk. Nothing here draws a
   random number: the talk comes when the rule says so, every time.

   Saves: the block is optional. A save without one reads as never asked, and
   `sanitizeRetirement` turns a corrupt block into an empty one on its own,
   leaving the rest of the save alone.

   FOR THE ROUND THAT WIRES THIS (open, found in review). The life decks
   already offer retirement choices that end nothing: lifeB_retireHealthy
   (nflCareerLifeB, flag b_walkAway; the nba and mlb decks have the same
   event, and nothing reads the flag to end a career), the farewell tour
   events in all four decks, and nhlCareerLifeB's "One farewell year, then
   done". A board that mounts FarewellCard should stop drawing those, or
   route their answers through answerRetirement, so one offseason never asks
   twice and a farewell said in the deck really ends the career.

   SOCCER (a later round). Soccer asks once (retirementSuggested) and then
   re-asks only from 34 at 65 or lower, on a 40 percent coin. RetirementRule
   cannot say either yet; that round adds them as optional fields, with the
   coin on keyedRng, so the US rules above keep their meaning. */

/** A sport's retirement talk rule. Game tuning, not a real world number. */
export interface RetirementRule {
  /** The talk never comes before this age. */
  minAge: number;
  /** Rating points under the career peak that bring it. */
  dropFromPeak: number;
  /** A rating at or under this brings it. */
  floor: number;
}

/** The career as it stands after the season labelled `year` ended. */
export interface RetirementSnapshot {
  year: number;
  age: number;
  rating: number;
  peak: number;
  /** The sport's hard stop already ends the career. */
  forced: boolean;
}

/** What the save keeps. Every field optional. */
export interface RetirementBlock {
  /** Seasons after which he chose to play on. */
  declinedYears?: number[];
  /** The announced last season. */
  farewellYear?: number;
  /** The last season he played, when he chose to stop. */
  retiredYear?: number;
}

export type RetirementReason = "drop" | "floor";

export interface RetirementTalk {
  reason: RetirementReason;
  /** Points under the peak right now. */
  drop: number;
  rating: number;
  peak: number;
}

/** The best rating the career reached: its season lines and where it stands now. */
export function peakRating(seasons: { ovr: number }[], current: number): number {
  let peak = current;
  for (const s of seasons) if (s.ovr > peak) peak = s.ovr;
  return peak;
}

/** The talk after this season, or null. Asked again every year he plays on
 *  while the rule still holds; never once a decision has ended the career. */
export function retirementTalk(rule: RetirementRule, snap: RetirementSnapshot, block: RetirementBlock | undefined): RetirementTalk | null {
  const b = block ?? {};
  if (snap.forced || b.retiredYear !== undefined || b.farewellYear !== undefined) return null;
  if (snap.age < rule.minAge) return null;
  if ((b.declinedYears ?? []).includes(snap.year)) return null;
  const drop = Math.max(0, snap.peak - snap.rating);
  if (drop >= rule.dropFromPeak) return { reason: "drop", drop, rating: snap.rating, peak: snap.peak };
  if (snap.rating <= rule.floor) return { reason: "floor", drop, rating: snap.rating, peak: snap.peak };
  return null;
}

export type RetirementChoiceId = "retireNow" | "oneMore" | "farewell";

export interface RetirementChoice {
  id: RetirementChoiceId;
  emoji: string;
  label: string;
  /** What the button does, in the words the card shows. */
  detail: string;
}

/** The three answers. The words say what `answerRetirement` does, and the
 *  vitest file holds each one to it. */
export const RETIREMENT_CHOICES: RetirementChoice[] = [
  { id: "retireNow", emoji: "👋", label: "Retire now", detail: "This season was your last. The career ends here." },
  { id: "oneMore", emoji: "💪", label: "One more year", detail: "Play next season. Unless you play your way back up, this talk comes back after it." },
  { id: "farewell", emoji: "🎤", label: "Announce a farewell season", detail: "Next season is your last, and everyone knows it. The career ends when it does, whatever the numbers say." },
];

/** Writes the answer to the talk after the season labelled `year`. Returns a
 *  new block; the old one is not touched. */
export function answerRetirement(block: RetirementBlock | undefined, year: number, choice: RetirementChoiceId): RetirementBlock {
  const b: RetirementBlock = { ...(block ?? {}) };
  if (choice === "retireNow") b.retiredYear = year;
  else if (choice === "farewell") b.farewellYear = year + 1;
  else b.declinedYears = [...(b.declinedYears ?? []), year];
  return b;
}

/** True when the season labelled `year` is the announced farewell season. */
export function isFarewellSeason(block: RetirementBlock | undefined, year: number): boolean {
  return block?.farewellYear === year;
}

/** True when a decision of his ends the career after the season labelled
 *  `year`. The sport's hard stop is asked separately, as it always was. */
export function careerEndsAfter(block: RetirementBlock | undefined, year: number): boolean {
  if (!block) return false;
  if (block.retiredYear !== undefined && year >= block.retiredYear) return true;
  return block.farewellYear !== undefined && year >= block.farewellYear;
}

const isYear = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 1800 && v < 3000;

/** A block from a save, checked. Anything malformed resets this block alone. */
export function sanitizeRetirement(raw: unknown): RetirementBlock {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: RetirementBlock = {};
  if (r.declinedYears !== undefined) {
    if (!Array.isArray(r.declinedYears) || !r.declinedYears.every(isYear)) return {};
    out.declinedYears = [...r.declinedYears];
  }
  if (r.farewellYear !== undefined) {
    if (!isYear(r.farewellYear)) return {};
    out.farewellYear = r.farewellYear;
  }
  if (r.retiredYear !== undefined) {
    if (!isYear(r.retiredYear)) return {};
    out.retiredYear = r.retiredYear;
  }
  return out;
}
