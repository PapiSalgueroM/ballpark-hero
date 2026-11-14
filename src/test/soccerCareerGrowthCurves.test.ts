import { describe, expect, it, vi } from 'vitest';
import { acceptOffer, advanceProSeason, advanceYouthYear, FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import { mulberry32 } from '@/lib/leagueCore';

const clubs = FALLBACK_CLUBS;

function seeded<T>(seed: number, play: () => T): T {
  const random = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try { return play(); } finally { random.mockRestore(); }
}

function runCohort(age: number, primeType: 'early' | 'normal' | 'late' | 'extended') {
  const overall = age < 24 ? 70 : 82;
  const stats = { pace: overall, shooting: overall, passing: overall, dribbling: overall,
    defending: overall, physical: overall, reflexes: overall };
  const paths = [];
  for (let seed = 130; seed < 154; seed++) {
    const signed = seeded(166, () => {
      const academy = initCareer('Generated Prospect ' + seed, 'England', 'ST', '2020',
        stats, overall, 2020, clubs, null, 95);
      const offered = advanceYouthYear(academy, clubs, true);
      return acceptOffer(offered, offered.pendingOffers[0]);
    });
    const start = { ...signed, ...stats, overall, age: age - 1, primeType, currentClubTier: 3,
      potential: 95, retirementSuggested: true, contractYearsLeft: 4 };
    const after = seeded(seed, () => advanceProSeason(start, clubs, true));
    const row = after.seasons.at(-1);
    if (row?.ratingPath) {
      expect(row.age).toBe(age);
      expect(row.ratingPath[0]).toBe(overall);
      expect(row.ratingPath[4]).toBe(after.overall);
      paths.push(row.ratingPath);
    }
  }
  expect(paths.length).toBeGreaterThanOrEqual(20);
  return [2, 4].map(i => paths.reduce((sum, path) => sum + path[i] - path[0], 0) / paths.length);
}

describe('Soccer Career development curves', () => {
  it('separates early and late players by the first half and close of a young senior season', () => {
    const early = runCohort(21, 'early');
    const typical = runCohort(21, 'normal');
    const late = runCohort(21, 'late');
    expect(early[0] - typical[0]).toBeGreaterThan(0.2);
    expect(early[1] - typical[1]).toBeGreaterThan(0.3);
    expect(typical[1] - late[1]).toBeGreaterThan(0.2);
  });

  it('lets a late bloomer close a season stronger than an extended-prime peer in their shared prime', () => {
    const late = runCohort(27, 'late');
    const extended = runCohort(27, 'extended');
    expect(late[1] - extended[1]).toBeGreaterThan(0.2);
  });

  it('preserves more overall through the first two decline seasons after an extended prime', () => {
    for (const age of [33, 34]) {
      const typical = runCohort(age, 'normal');
      const extended = runCohort(age, 'extended');
      expect(extended[1] - typical[1]).toBeGreaterThan(0.55);
      expect(extended[1]).toBeLessThan(0);
    }
    expect(runCohort(35, 'extended')).toEqual(runCohort(35, 'normal'));
  });
});
