import type { CareerState } from "./soccerCareerEngine";

/* Round 1519: a career the game ended says why on the ceremony card, in plain words. The age rules are the
   only game event that ends one; every other way is the player's own button. Read from the save, so an old
   save gets its line too and nothing new is written: a retired season row comes only from the age rules and
   from taking the suggestion, and only the age rules can stand at 45, or at 33 or older under 50 (the
   suggestion is never offered there, the rules fire first). Its own module rather than the engine, so the
   history harnesses that bundle the page with an older engine (scripts/lib/careerSoccerDeck1334.mjs and the
   inverses behind it) still find it. */
export function retirementReason(s: CareerState): string | null {
  if (!s.retired || s.seasons[s.seasons.length - 1]?.type !== "retired") return null;
  if (s.age >= 45) return "Forced out at 45, the age limit.";
  return s.overall < 50 && s.age >= 33 ? `Forced out at ${s.age}: overall ${s.overall}, the body could not keep up.` : null;
}
