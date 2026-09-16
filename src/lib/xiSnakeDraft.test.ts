import { describe, expect, it } from 'vitest';
import {
  DRAFT_TURN_SECONDS,
  SNAKE_TOTAL_PICKS,
  advanceDraftPick,
  shouldPauseDraftTimer,
  snakeSeat,
  tickDraftClock,
} from '@/lib/xiSnakeDraft';

describe('snakeSeat', () => {
  it('follows classic snake P1, P2, P2, P1', () => {
    const seats = Array.from({ length: 8 }, (_, i) => snakeSeat(i));
    expect(seats).toEqual([1, 2, 2, 1, 1, 2, 2, 1]);
  });

  it('gives each seat exactly 11 of the 22 picks', () => {
    const seats = Array.from({ length: SNAKE_TOTAL_PICKS }, (_, i) => snakeSeat(i));
    expect(seats.filter((s) => s === 1)).toHaveLength(11);
    expect(seats.filter((s) => s === 2)).toHaveLength(11);
    expect(SNAKE_TOTAL_PICKS).toBe(22);
  });
});

describe('advanceDraftPick', () => {
  it('skips a pick without inventing a player name', () => {
    const next = advanceDraftPick(0);
    expect(next.pickIndex).toBe(1);
    expect(next.seat).toBe(2);
    expect(next.complete).toBe(false);
    expect(next).not.toHaveProperty('playerName');
  });

  it('ends the draft after 22 pick attempts', () => {
    const next = advanceDraftPick(21);
    expect(next.pickIndex).toBe(22);
    expect(next.complete).toBe(true);
  });
});

describe('draft timer', () => {
  it('starts at the documented turn length', () => {
    expect(DRAFT_TURN_SECONDS).toBe(30);
  });

  it('expires and reports skip when it reaches zero', () => {
    const { clock, expired } = tickDraftClock({ seconds: 1, paused: false });
    expect(expired).toBe(true);
    expect(clock.seconds).toBe(0);
  });

  it('does not tick while paused for search', () => {
    const { clock, expired } = tickDraftClock({ seconds: 12, paused: true });
    expect(expired).toBe(false);
    expect(clock.seconds).toBe(12);
  });

  it('pauses while the player is focused or typing in search', () => {
    expect(shouldPauseDraftTimer({
      searchFocused: true,
      searchHasText: false,
      isValidating: false,
      isSpinning: false,
    })).toBe(true);
    expect(shouldPauseDraftTimer({
      searchFocused: false,
      searchHasText: true,
      isValidating: false,
      isSpinning: false,
    })).toBe(true);
    expect(shouldPauseDraftTimer({
      searchFocused: false,
      searchHasText: false,
      isValidating: false,
      isSpinning: false,
    })).toBe(false);
  });
});
