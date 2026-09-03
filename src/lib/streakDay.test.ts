import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStreakState,
  recordGameCompletion,
  recordGameStreakDay,
} from '@/lib/streaks';

describe('activity-only streak days', () => {
  beforeEach(() => localStorage.clear());

  it('advances the day once without counting a season or match as a finished game', () => {
    recordGameCompletion('footle', new Date('2026-09-01T16:00:00.000Z'), 100);

    const first = recordGameStreakDay('soccer-career', new Date('2026-09-02T16:00:00.000Z'));
    expect(first.changed).toBe(true);
    expect(first.state).toEqual({
      version: 1,
      global: { current: 2, longest: 2, lastDate: '2026-09-02' },
      perGame: {
        footle: { current: 1, longest: 1, lastDate: '2026-09-01' },
        'soccer-career': { current: 1, longest: 1, lastDate: '2026-09-02' },
      },
      loginDates: [],
      totalPlays: 1,
      totalPoints: 100,
    });

    const repeated = recordGameStreakDay('soccer-career', new Date('2026-09-02T20:00:00.000Z'));
    expect(repeated.changed).toBe(false);
    expect(repeated.state).toEqual(first.state);
    expect(getStreakState().totalPlays).toBe(1);
  });
});
