/**
 * Pass-and-play snake draft for Build Your XI.
 *
 * Same device, no accounts. Classic snake: P1, P2, P2, P1, then repeat.
 * 22 pick attempts (11 each). If the turn timer hits zero the pick is
 * skipped: the slot stays empty and the next seat goes. Nobody invents a
 * player name to fill the gap.
 */

export type DraftSeat = 1 | 2;

export const SNAKE_TOTAL_PICKS = 22;
export const DRAFT_TURN_SECONDS = 30;

export interface DraftClock {
  seconds: number;
  paused: boolean;
}

export function snakeSeat(pickIndex: number): DraftSeat {
  const cycle = ((pickIndex % 4) + 4) % 4;
  return cycle === 0 || cycle === 3 ? 1 : 2;
}

export function advanceDraftPick(pickIndex: number): {
  pickIndex: number;
  seat: DraftSeat;
  complete: boolean;
} {
  const next = pickIndex + 1;
  const complete = next >= SNAKE_TOTAL_PICKS;
  return {
    pickIndex: next,
    seat: snakeSeat(Math.min(next, SNAKE_TOTAL_PICKS - 1)),
    complete,
  };
}

export function shouldPauseDraftTimer(opts: {
  searchFocused: boolean;
  searchHasText: boolean;
  isValidating: boolean;
  isSpinning: boolean;
}): boolean {
  return opts.searchFocused || opts.searchHasText || opts.isValidating || opts.isSpinning;
}

export function tickDraftClock(clock: DraftClock): { clock: DraftClock; expired: boolean } {
  if (clock.paused) return { clock, expired: false };
  const seconds = Math.max(0, clock.seconds - 1);
  return { clock: { ...clock, seconds }, expired: seconds <= 0 };
}
