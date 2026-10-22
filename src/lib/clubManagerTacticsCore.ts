/**
 * Round 1522: the part of the team instructions the engine itself carries, kept small on purpose.
 *
 * The page budget (scripts/sweepWeight.mjs) holds Club Manager and the two dailies that load its engine (Manager
 * Hot Seat, Deadline Day) to their rows, and the instructions' table, words, styles and report numbers weigh about
 * 3.6K gzipped. So the engine knows only this: the types, what balanced is, how a saved value is read, and a slot
 * the tactics module (clubManagerTactics.ts) fills when it loads. It loads with the Tactics tab, the dressing room's
 * and the live sheet's tactics, the Match Centre, and (useClubManager) before any match of a career that has
 * instructions is played; the dailies never set any, so they never load it.
 *
 * With the slot empty every reader in the engine plays balanced, which is exactly what a career with no
 * instructions does; useClubManager refuses to play a match whose career needs the module until it is in.
 *
 * Imports engine types only, so the engine imports this without a cycle.
 */
import type { CareerState, LiveChange, LiveMatch, MatchDetail, MyFixture, XiSlot } from '@/lib/clubManager';

export type Setting = -1 | 0 | 1;
export type InstructionKey = 'press' | 'tempo' | 'width' | 'line';
export interface TeamInstructions { press: Setting; tempo: Setting; width: Setting; line: Setting; }
export type AiStyleId = 'gegenpress' | 'possession' | 'patient' | 'wingplay' | 'direct' | 'counter' | 'lowblock' | 'balanced';

/** One entry of a match's instruction log: from the minute after `minute`, these were in force. Kick off is minute 0. */
export interface InstructionStep { minute: number; plus?: number; instructions: TeamInstructions; }

/** What the match report prints for the instructions: the numbers each one moves. */
export interface TacticStats {
  /** Balls my side won back in their third. */
  wonHigh: number;
  crosses: number;
  /** Their men caught offside by my line. */
  offsides: number;
  /** Their goals that came on the break. */
  breakConceded: number;
  /** My goals that came from wide. */
  wideGoals: number;
  /** Extra fitness the instructions cost each man who played (negative: what standing off gave back). */
  legs: number;
}

export const INSTRUCTION_KEYS: InstructionKey[] = ['press', 'tempo', 'width', 'line'];
export const BALANCED: TeamInstructions = { press: 0, tempo: 0, width: 0, line: 0 };

/** True for no instructions at all, or all four on balanced. */
export function isBalanced(i: TeamInstructions | null | undefined): boolean {
  return !i || (i.press === 0 && i.tempo === 0 && i.width === 0 && i.line === 0);
}

/** A saved value read back: four settings, or null for anything else (a junk value plays as balanced). */
export function readInstructions(raw: unknown): TeamInstructions | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return INSTRUCTION_KEYS.every(k => o[k] === -1 || o[k] === 0 || o[k] === 1)
    ? { press: o.press as Setting, tempo: o.tempo as Setting, width: o.width as Setting, line: o.line as Setting }
    : null;
}

/** True when the log ever leaves balanced: the match the report and the legs read the instructions off. */
export const logEverSet = (log: InstructionStep[] | undefined): boolean => (log ?? []).some(s => !isBalanced(s.instructions));

/** What the engine asks of the tactics module. Every call is made only off balanced. */
export interface TacticsImpl {
  /** The goal rate boosts my instructions are worth in a half against the other side's style. */
  edge(state: CareerState, fx: MyFixture, xi: XiSlot[], instr: TeamInstructions, half: 1 | 2): { atk: number; def: number };
  /** A stretch's knock factor and shots per expected goal. */
  segment(instr: TeamInstructions): { knock: number; shots: number };
  /** The points of the ball the log was worth over a half. */
  possShift(live: LiveMatch, half: 1 | 2): number;
  /** The report's block for a match whose log left balanced. */
  day(state: CareerState, fx: MyFixture, live: LiveMatch, pairs: XiSlot[], lastMinute: number): NonNullable<MatchDetail['tactics']>;
  /** An instructions, formation or duty change at minute m (plus p into a board), applied to `live`; false refuses. */
  change(state: CareerState, live: LiveMatch, change: LiveChange, m: number, p: number): boolean;
}

let impl: TacticsImpl | null = null;
/** The tactics module fills the slot as it loads. */
export function setTacticsImpl(x: TacticsImpl): void { impl = x; }
/** The tactics module, or null before it has loaded. */
export function tacticsImpl(): TacticsImpl | null { return impl; }
