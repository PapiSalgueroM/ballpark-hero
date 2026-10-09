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
 * mark ("Saka 45+2' (P)"). A shootout kick is not a goal: it has no scorer
 * line, so it can never carry one.
 *
 * In its own small file, like the clock, so a screen or a test can read it
 * without loading the whole engine.
 */
import { minuteLabel, type ClockPoint } from '@/lib/clubManagerClock';

/** What a listing needs to know about a goal to mark it. */
export interface GoalMarks {
  /** Round 505: scored from the spot. */
  penalty?: boolean;
}

/** The mark after a goal, with its leading space: " (P)" from the spot, nothing for any other goal. */
export function scorerMark(g: GoalMarks): string {
  return g.penalty ? ' (P)' : '';
}

/** A scorer as a match report prints him: "Saka 45+2' (P)". */
export function scorerLine(g: { name: string } & ClockPoint & GoalMarks): string {
  return `${g.name} ${minuteLabel(g)}${scorerMark(g)}`;
}
