/**
 * Round 580: the tycoon's rooms. Stadium Tycoon and Wonderkid Factory become one
 * game with two tabs on /stadium-tycoon (docs/design/round-580-tycoon-merge.md).
 * Each room keeps its own engine, its own hook and its own save; nothing here
 * reads or writes a save.
 *
 * What this file decides is when the Academy tab needs you while you are looking
 * at the Stadium. It is imported at runtime only by the academy panel, so the
 * academy lib and its name bank never reach the stadium's first load; the page
 * imports its types and nothing else.
 */
import { capacity, canMoveUp, LEAVE_AGE, YEAR_SEC } from '@/lib/wonderkidFactory';
import type { FactoryState } from '@/lib/wonderkidFactory';

export type Room = 'stadium' | 'academy';

/** A kid this close to his 24th birthday lights the Academy tab. */
export const LEAVING_SOON_SEC = 60;

export interface AcademyStatus {
  /** Deadline Day is live: every fee pays more right now. */
  deadline: boolean;
  /** Every bed is taken, so the scouts have stopped. */
  bedsFull: boolean;
  /** The region's target is met and the move up is waiting. */
  moveUp: boolean;
  /** A kid walks out on a free inside the next minute. */
  leavingSoon: boolean;
}

export function academyStatus(s: FactoryState): AcademyStatus {
  return {
    deadline: s.deadlineLeft > 0,
    bedsFull: s.prospects.length >= capacity(s),
    moveUp: canMoveUp(s),
    leavingSoon: s.prospects.some(k => k.age === LEAVE_AGE - 1 && k.ageClock >= YEAR_SEC - LEAVING_SOON_SEC),
  };
}
