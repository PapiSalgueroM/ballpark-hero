import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNationMentality, startCareer, startNextSeason } from '@/lib/clubManager';
import { runManagerSummer } from '@/lib/soccerInternational';

function seeded(seed: number): () => number {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}

describe('Club Manager national tactics', () => {
  afterEach(() => vi.restoreAllMocks());

  it('changes the national job while keeping club instructions and invalid states intact', () => {
    const club = startCareer('Manchester City');
    const state = { ...club, startYear: 2027, nationJob: { nation: 'England', since: 1, played: 0, won: 0, lastResult: null, lastYear: null } };
    expect(setNationMentality(club, 'attacking')).toBeNull();
    expect(setNationMentality(state, 'balanced')).toBeNull();
    const next = setNationMentality(state, 'defensive')!;
    expect(next.nationJob?.mentality).toBe('defensive');
    expect(next.mentality).toBe(club.mentality);
    expect(next.xiIds).toBe(club.xiIds);
    expect(next.week).toBe(club.week);
    expect(state.nationJob).not.toHaveProperty('mentality');
    vi.spyOn(Math, 'random').mockImplementation(seeded(23));
    const summer = startNextSeason(next);
    expect(summer.nationCampaign?.mentality).toBe('defensive');
    expect(summer.nationJob?.mentality ?? null).toBe(summer.nationCampaign?.lostJob ? null : 'defensive');
    expect(setNationMentality(next, 'balanced')?.nationJob?.mentality).toBeUndefined();
  });

  it('keeps balanced equivalent and shifts goals both ways across paired qualifying campaigns', () => {
    const choose = vi.spyOn(Math, 'random');
    let defensiveScored = 0, defensiveAllowed = 0, attackingScored = 0, attackingAllowed = 0;
    for (let seed = 1; seed <= 96; seed++) {
      choose.mockImplementation(seeded(seed));
      const legacy = runManagerSummer('England', 2028, 3)!;
      choose.mockImplementation(seeded(seed));
      expect(runManagerSummer('England', 2028, 3, 'balanced')).toEqual(legacy);
      choose.mockImplementation(seeded(seed));
      const defensive = runManagerSummer('England', 2028, 3, 'defensive')!.qualifying.table.find(row => row.nation === 'England')!;
      choose.mockImplementation(seeded(seed));
      const attacking = runManagerSummer('England', 2028, 3, 'attacking')!.qualifying.table.find(row => row.nation === 'England')!;
      defensiveScored += defensive.gf;
      defensiveAllowed += defensive.ga;
      attackingScored += attacking.gf;
      attackingAllowed += attacking.ga;
      expect(defensive.played).toBe(10);
      expect(attacking.played).toBe(10);
    }
    expect(attackingScored - defensiveScored).toBeGreaterThan(300);
    expect(attackingAllowed - defensiveAllowed).toBeGreaterThan(250);
  });
});
