import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPollDayET } from '@/lib/dateUtils';

const CASES = [
  ['2026-03-08T15:59:00Z', '2026-03-07'],
  ['2026-03-08T16:00:00Z', '2026-03-08'],
  ['2026-03-08T16:59:00Z', '2026-03-08'],
  ['2026-03-08T17:00:00Z', '2026-03-08'],
  ['2026-11-01T15:59:00Z', '2026-10-31'],
  ['2026-11-01T16:00:00Z', '2026-10-31'],
  ['2026-11-01T16:59:00Z', '2026-10-31'],
  ['2026-11-01T17:00:00Z', '2026-11-01'],
  ['2026-07-15T15:59:00Z', '2026-07-14'],
  ['2026-07-15T16:00:00Z', '2026-07-15'],
  ['2027-01-01T16:59:00Z', '2026-12-31'],
  ['2027-01-01T17:00:00Z', '2027-01-01'],
  ['2024-03-01T16:59:00Z', '2024-02-29'],
] as const;

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); });
afterEach(() => { vi.useRealTimers(); });

describe('poll noon Eastern calendar date', () => {
  it.each(CASES)('selects the poll date at %s', (utc, expected) => {
    vi.setSystemTime(new Date(utc));
    expect(getPollDayET(), `POLL_NOON_ET ${utc}`).toBe(expected);
  });
});
