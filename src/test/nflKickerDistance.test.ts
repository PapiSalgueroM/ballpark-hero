import { describe, expect, it, vi } from 'vitest';
import { nflStatLineFor } from '@/lib/nflMyCareer';

describe('NFL career field-goal distance', () => {
  it('tempers the high end without turning every long kick into a record tie', () => {
    const rng = vi.fn(() => 0.98);
    const line = nflStatLineFor({ pos: 'K', form: 96, games: 17 }, rng);

    expect(line).toEqual({ fgAtt: 36, fgMade: 35, longFg: 67 });
    expect(rng).toHaveBeenCalledTimes(3);
  });

  it('still allows a record-length make at the top of the range', () => {
    const line = nflStatLineFor({ pos: 'K', form: 110, games: 17 }, () => 0.98);

    expect(line.longFg).toBe(68);
  });

  it('keeps an ordinary kicker line and shorter schedule intact', () => {
    const line = nflStatLineFor({ pos: 'K', form: 76, games: 16 }, () => 0.5);

    expect(line).toEqual({ fgAtt: 28, fgMade: 24, longFg: 60 });
  });
});
