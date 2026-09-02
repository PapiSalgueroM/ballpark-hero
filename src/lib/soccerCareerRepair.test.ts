import { afterEach, describe, expect, it, vi } from 'vitest';
import { repairCareer, type CareerState } from '@/lib/soccerCareerEngine';

const legacySave = (): CareerState => ({
  playerName: 'Legacy Ace',
  nationality: 'Australia',
  position: 'ST',
  era: '2020s',
  currentClub: 'Sydney FC',
  overall: 72,
  seasons: [],
} as unknown as CareerState);

describe('repairCareer legacy prime migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('assigns identical old saves the exact same prime without consuming Math.random', () => {
    const random = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.8);

    const first = repairCareer(legacySave());
    const second = repairCareer(legacySave());

    expect(random).not.toHaveBeenCalled();
    expect(first.primeType).toBe('extended');
    expect(second.primeType).toBe('extended');
  });
});
