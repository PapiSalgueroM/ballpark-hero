import { useEffect, useState } from "react";
import type { CareerState } from "@/lib/soccerCareerEngine";

/* Round 985: a career moment plays once, when the state flips.

   The international debut, the rivalry verdict and the legacy card are the
   moments. Each one plays when the career steps into it in front of the
   player, and never again: not when the card is mounted a second time (the
   attributes screen and back), not on a reload, not in a new tab, not after
   the browser was closed.

   Round 926 did this for the tournament card with a list of played keys in
   localStorage. That list can fail two ways, both written down in its own
   comment: a save already sitting on the card the day the list shipped plays
   once more, and a browser that cannot write the list replays on every load.
   This rule needs no storage at all, so it has neither. The page reads the
   save once, in the initialiser that restores it, and hands that career to
   settleLoadedMoments: every moment the save already holds is settled before
   any card draws. Only a moment that first appears AFTER the load (the state
   flipped in this visit, because the player pressed the button that got
   there) is fresh, and the card settles it once it has committed, so it is
   fresh for exactly one mount.

   The key is the moment plus the run, so a second career in the same visit
   gets its own debut. The run is the player's name, nation, position and his
   first season's year and club, which never change once a career starts. */

const settled = new Set<string>();

function runTag(c: CareerState): string {
  const first = c.seasons?.[0];
  return [c.playerName, c.nationality, c.position, first?.year ?? "", first?.club ?? ""].join("|");
}

/** The debut card's moment, while the career is on it. */
export function debutMomentKey(c: CareerState): string | null {
  return c.phase === "international_debut" ? `debut|${runTag(c)}|${c.intStats?.debutYear}` : null;
}

/** The legacy card's moment, once the career is over and scored. */
export function legacyMomentKey(c: CareerState): string | null {
  return c.phase === "retired" && c.legacy ? `legacy|${runTag(c)}|${c.legacy.tier}|${c.legacy.score}` : null;
}

/** The rivalry verdict's moment, from the day he retires. */
export function rivalryMomentKey(c: CareerState): string | null {
  const s = c.rivalrySummary;
  return c.retired && s && c.rival
    ? `rivalry|${runTag(c)}|${c.rival.name}|${s.overallWinner}|${s.playerWins}|${s.rivalWins}`
    : null;
}

/** Every moment the restored save already holds is settled: it was seen. */
export function settleLoadedMoments(c: CareerState | null): void {
  if (!c) return;
  for (const k of [debutMomentKey(c), legacyMomentKey(c), rivalryMomentKey(c)]) {
    if (k) settled.add(k);
  }
}

/** True only on the first mount of a moment that flipped in this visit.
    Read in the initialiser (a discarded render reads the same answer),
    settled in the effect once the render has committed. */
export function useCareerMoment(key: string | null): boolean {
  const [fresh] = useState(() => key !== null && !settled.has(key));
  useEffect(() => {
    if (key) settled.add(key);
  }, [key]);
  return fresh;
}

/** Test seam: forget every settled moment, as a new tab would. */
export function resetCareerMomentsForTest(): void {
  settled.clear();
}
