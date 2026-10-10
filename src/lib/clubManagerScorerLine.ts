/**
 * Round 1146: how a goal is marked, wherever a scorer is listed.
 *
 * A player's report, 2026-10-09: "if a player scores a penalty in manager
 * mode, it should show (P) next to their goal". The engine has known which
 * goals came from the spot since Round 505 and the report card started
 * printing the mark in Round 1163, but the timeline under it and the live
 * commentary each wrote the goal their own way. These two functions are the
 * only place the mark is written down: the report card's scorer lists, the
 * report's timeline and the live screen's goal line all read them, so one
 * goal cannot be marked on one screen and bare on another.
 *
 * The shape is the one Round 1163 chose: the name, the minute, then the
 * mark ("Spot taker 45+2' (P)"). A shootout kick is not a goal: it has no scorer
 * line, so it can never carry one.
 *
 * The same round gave the game own goals (tagOwnGoals in clubManager.ts),
 * and they are marked here too: "Their centre back 63' (O.G)", under the club that got
 * the goal. The line is the name and the mark, as a match report prints it,
 * and no screen adds a word about the man.
 *
 * In its own small file, like the clock, so a screen or a test can read it
 * without loading the whole engine.
 */
import { minuteLabel, type ClockPoint } from '@/lib/clubManagerClock';

/** What a listing needs to know about a goal to mark it. */
export interface GoalMarks {
  /** Round 505: scored from the spot. */
  penalty?: boolean;
  /** Round 1146: an own goal. The name beside it is the man who put it into
   *  his own net, and the list it sits on is the club that got the goal. */
  og?: boolean;
}

/**
 * The mark after a goal, with its leading space: " (P)" from the spot,
 * " (O.G)" for an own goal, nothing for any other goal. A penalty is never an
 * own goal in the engine; if a line ever said both, it is the own goal that
 * decides who is named, so that is the mark it gets.
 */
export function scorerMark(g: GoalMarks): string {
  return g.og ? ' (O.G)' : g.penalty ? ' (P)' : '';
}

/** A scorer as a match report prints him: "Spot taker 45+2' (P)", "Their centre back 63' (O.G)". */
export function scorerLine(g: { name: string } & ClockPoint & GoalMarks): string {
  return `${g.name} ${minuteLabel(g)}${scorerMark(g)}`;
}
