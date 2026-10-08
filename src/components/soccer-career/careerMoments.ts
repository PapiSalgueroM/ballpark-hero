import { settleMoments } from "@/components/career-moments/useCareerMoment";
import type { CareerState, IntlTournament } from "@/lib/soccerCareerEngine";
import type { SignedNote } from "./SignedSlip";

/* Round 1107: the rule itself (the hook, the set it remembers in, the beat
   helper) moved word for word to src/components/career-moments/useCareerMoment.ts,
   the career moment kit every career on the site shares. This file keeps
   what is soccer's own, the keys and the settle step, and re-exports the
   rest, so not one importer changed a line. Every import here that is not
   the kit's hook file must stay a TYPE import: the Season Centre imports
   useCareerMoment from this path and is mounted on other sports' pages, so
   a value import of the soccer engine here would put that engine on them. */
export { useCareerMoment, beatStyle, resetCareerMomentsForTest } from "@/components/career-moments/useCareerMoment";
export type { CareerMoment } from "@/components/career-moments/useCareerMoment";

/* Round 985: a career moment plays once, when the state flips.

   The international debut, the rivalry verdict, the legacy card and the
   tournament card (Round 926) are the moments. Each one plays when the career
   steps into it in front of the player, and never again: not when the card is
   mounted a second time (the attributes screen and back), not on a reload,
   not in a new tab, not after the browser was closed.

   Round 926 first did this for the tournament card with a list of played keys
   in localStorage. That list could fail two ways, both written down in its own
   comment: a save already sitting on the card the day the list shipped played
   once more, and a browser that could not write the list replayed on every
   load. This rule needs no storage at all, so it has neither, and the
   tournament card now follows it too: one rule for every moment on the page. The page reads the
   save once, in the initialiser that restores it, and hands that career to
   settleLoadedMoments: a moment is settled on load only when the save SITS
   on its card (Round 1107 made the tournament follow that too; a pending
   tournament two Continues away from its card has been seen by nobody).
   Only a moment that first appears AFTER the load (the state
   flipped in this visit, because the player pressed the button that got
   there) is fresh, and the card settles it once it has started playing, so it
   plays on exactly one mount.

   The key is the moment plus the run, so a second career in the same visit
   gets its own debut. The run is the player's name, nation and position plus
   a short hash of his own seasons (year, club, games, goals). The identity
   alone is not enough: the era fixes the start year and the academy club is
   drawn from a small home pool, so a restart with the same name can match it
   exactly (Round 926 hashes its run's numbers for the same reason). No moment
   is pending across a new season, so the seasons hold still while it waits.

   A fresh moment also waits to be SEEN. The legacy card and the rivalry
   verdict mount below the fold, so a moment that ran at mount would play to
   nobody and then count as played. Until the card comes into view its beats
   hold on their first frame (animation-play-state paused) and the confetti
   waits; the moment is settled when it starts, not when it mounts. */

/** FNV-1a over a string, as 8 hex digits. Not security, just a short tag. */
function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** The run a moment belongs to: who he is plus a short hash of his seasons. */
export function runTag(c: CareerState): string {
  const seasons = (c.seasons ?? []).map(s => [s?.year, s?.club, s?.apps, s?.goals]);
  return [c.playerName, c.nationality, c.position, shortHash(JSON.stringify(seasons))].join("|");
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

/** The tournament card's moment (Round 926), while the career sits on it.
    Built from the tournament alone, because the card is handed only that.
    Tournament years follow a fixed calendar, so a second career with the
    same nation reaches the same World Cup in the same year; the key carries
    this run's own numbers (his games, his ratings, the scores) through the
    hash, so a different career's run is a different key. */
export function tournamentMomentKey(t: IntlTournament): string {
  const run = JSON.stringify([
    t.champion, t.runnerUp, t.playerApps, t.playerGoals, t.playerAssists, t.playerAvgRating,
    t.squad?.myScore,
    (t.matches ?? []).map(m => [m.round, m.home, m.away, m.homeGoals, m.awayGoals, m.playerGoals, m.playerAssists, m.playerRating]),
    (t.bracket ?? []).map(b => [b.round, b.slot, b.home, b.away, b.homeGoals, b.awayGoals]),
  ]);
  return `tournament|${t.nation}|${t.name}|${t.year}|${t.myResult}|${shortHash(run)}`;
}

/** The signing scene's moment (Round 1107): this run, and this deal's own
    terms. The slip is page memory, never in the save, so nothing settles it
    on load: after a reload there is no slip to draw. */
export function signingMomentKey(note: SignedNote): string {
  return `signing|${runTag(note.forCareer)}|${note.kind}|${note.club}|${note.years}|${note.wage}`;
}

/** A moment is settled on load only when the restored save SITS on its card:
    that card was seen. Round 1107 put the tournament on the same rule as the
    other three: a save that merely holds a pending tournament (it is played
    inside the season step, two or three Continues before its card) has not
    shown it to anybody yet. */
export function settleLoadedMoments(c: CareerState | null): void {
  if (!c) return;
  const tournament = c.phase === "world_cup" && c.pendingTournament ? tournamentMomentKey(c.pendingTournament) : null;
  settleMoments([debutMomentKey(c), legacyMomentKey(c), rivalryMomentKey(c), tournament]);
}
