import { describe, expect, it } from 'vitest';
import { getEasternDayRange } from '@/lib/dateUtils';

describe('Eastern completion day bounds', () => {
  it.each([
    ['2026-03-08', '2026-03-08T05:00:00.000Z', '2026-03-09T04:00:00.000Z'],
    ['2026-11-01', '2026-11-01T04:00:00.000Z', '2026-11-02T05:00:00.000Z'],
    ['2026-11-12', '2026-11-12T05:00:00.000Z', '2026-11-13T05:00:00.000Z'],
    ['2026-12-31', '2026-12-31T05:00:00.000Z', '2027-01-01T05:00:00.000Z'],
    ['2028-02-29', '2028-02-29T05:00:00.000Z', '2028-03-01T05:00:00.000Z'],
  ])('includes the entire New York day %s', (day, start, end) => {
    expect(getEasternDayRange(day)).toEqual({ start, end });
  });
});
