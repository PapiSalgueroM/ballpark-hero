import { describe, expect, it } from 'vitest';
import { GAME_COUNT_LABEL, TOTAL_GAMES } from '@/data/gameRegistry';

describe('game count copy', () => {
  it('uses a rounded down plus label instead of the brittle exact total', () => {
    const rounded = Number(GAME_COUNT_LABEL.replace('+', ''));

    expect(GAME_COUNT_LABEL).toMatch(/^\d+0\+$/);
    expect(rounded).toBeLessThanOrEqual(TOTAL_GAMES);
    expect(TOTAL_GAMES - rounded).toBeLessThan(10);
    expect(GAME_COUNT_LABEL).not.toBe(String(TOTAL_GAMES));
  });
});
