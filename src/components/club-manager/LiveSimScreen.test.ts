import { describe, expect, it } from 'vitest';
import { liveSimDrift } from '@/components/club-manager/LiveSimScreen';

describe('liveSimDrift', () => {
  it('gives each player an exact stable offset for a replay beat', () => {
    expect([0, 1, 2].map(salt => liveSimDrift(0, salt))).toEqual([-3.5, -2.25, -1]);
    expect([0, 1, 2].map(salt => liveSimDrift(0, salt))).toEqual([-3.5, -2.25, -1]);
  });

  it('moves the offsets forward on the next replay beat', () => {
    expect([0, 1, 2].map(salt => liveSimDrift(1, salt))).toEqual([-2.25, -1, 0]);
  });
});
