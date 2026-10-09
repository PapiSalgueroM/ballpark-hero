import { afterEach, describe, expect, it, vi } from 'vitest';
import { acceptOffer, advanceProSeason, FALLBACK_CLUBS, initCareer, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { getEraStars } from '@/lib/careerEras';

function nightIn(year: number) {
  vi.spyOn(Math, 'random').mockReturnValue(0.7);
  const stats = { pace: 90, shooting: 90, passing: 90, dribbling: 90, defending: 90, physical: 90, reflexes: 90 };
  let state = initCareer('Generation Tester', 'Brazil', 'ST', '2020s', stats, 90, 2020, FALLBACK_CLUBS, null, 95);
  const club = FALLBACK_CLUBS.find(c => c.name === 'Real Madrid')!;
  state = acceptOffer(state, { club, contractYears: 5, wage: 400000, transferFee: 0 });
  state = { ...state, age: 25, phase: 'playing', rival: null, seasons: [{
    ...state.seasons[state.seasons.length - 1], year: year - 1, age: 25, type: 'playing', club: club.name,
    apps: 35, goals: 25, assists: 10, rating: 8, ballonDor: false, ballonDorRank: null,
  } as SeasonRecord] };
  const next = advanceProSeason(state, FALLBACK_CLUBS);
  expect(next.pendingBallonDor, `The engine staged the ${year} ballot`).not.toBeNull();
  expect(next.pendingBallonDor!.year).toBe(year);
  return next.pendingBallonDor!;
}

afterEach(() => vi.restoreAllMocks());

describe('Soccer award generations', () => {
  it('puts known names and guarded new names on the same ranked ballot before the future field takes over', () => {
    const real = new Set(getEraStars(2031).map(s => s.name));
    const mixed = nightIn(2031).nominees.filter(n => !n.isPlayer);
    expect(mixed.some(n => real.has(n.name))).toBe(true);
    expect(mixed.some(n => !real.has(n.name))).toBe(true);
    expect(new Set(mixed.map(n => n.name)).size).toBe(mixed.length);
    const future = nightIn(2033).nominees.filter(n => !n.isPlayer);
    expect(future.every(n => !real.has(n.name))).toBe(true);
  });

  it('keeps future contender identities across seasons while preserving ranked, unique ballots', () => {
    const first = nightIn(2033), next = nightIn(2034);
    const names = new Set(first.nominees.filter(n => !n.isPlayer).map(n => n.name));
    const recurring = next.nominees.filter(n => !n.isPlayer && names.has(n.name));
    expect(recurring.length).toBeGreaterThanOrEqual(5);
    for (const night of [first, next]) {
      expect(new Set(night.nominees.map(n => n.name)).size).toBe(night.nominees.length);
      expect(night.nominees.map(n => n.points)).toEqual(night.nominees.map(n => n.points).sort((a, b) => b - a));
      const at = night.nominees.findIndex(n => n.isPlayer);
      if (at >= 0) expect(night.playerRank).toBe(at + 1);
    }
  });
});
