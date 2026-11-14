import { describe, expect, it, vi } from 'vitest';
import {
  acceptOffer, advanceProSeason, advanceYouthYear, applyRehabChoice, calcOverall, FALLBACK_CLUBS, initCareer, manualRetire, repairCareer,
  type CareerState,
} from '@/lib/soccerCareerEngine';
import { announceSoccerFarewell, farewellSeasonComplete } from '@/lib/soccerCareerFarewell';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { mulberry32 } from '@/lib/leagueCore';

function seeded<T>(seed: number, run: () => T): T {
  const random = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try { return run(); } finally { random.mockRestore(); }
}

function injuredCareer(): CareerState {
  const clubs = FALLBACK_CLUBS;
  const signed = seeded(166, () => {
    const academy = initCareer('Fixture Prospect', 'England', 'ST', '2020', {
      pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60,
    }, 60, 2020, clubs);
    const offered = advanceYouthYear(academy, clubs);
    return acceptOffer(offered, offered.pendingOffers[0]);
  });
  expect(signed.phase).toBe('playing');
  const career = seeded(13, () => advanceProSeason(signed, clubs));
  expect(career.phase).toBe('rehab_choice');
  expect(career.pendingRehab?.name).toBe('ACL rupture');
  return career;
}

function load(career: CareerState) {
  const parsed = parseSoccerCareerSave(serializeSoccerCareerSave(career));
  expect(isSoccerCareerSave(parsed)).toBe(true);
  return repairCareer(parsed as CareerState);
}

describe('Soccer Career rehab save recovery', () => {
  it.each([undefined, null])('reopens a rehab save with no choice payload (%s) and can play its next season', missing => {
    const normal = load(injuredCareer());
    const saved = { ...normal, pendingRehab: missing };
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Save recovery drew randomness'); });
    let recovered;
    try { recovered = load(saved); } finally { random.mockRestore(); }
    expect(recovered.phase).toBe('playing');
    expect(serializeSoccerCareerSave(recovered)).toBe(serializeSoccerCareerSave({ ...saved, phase: 'playing' }));
    expect(load(recovered)).toEqual(recovered);
    const next = seeded(166, () => advanceProSeason(recovered, FALLBACK_CLUBS));
    expect(next.seasons.length).toBe(recovered.seasons.length + 1);
  });

  it.each([
    [0, 7, 5, 2, 'rushed'],
    [0, 166, 2, 0, 'rushed'],
    [1, 166, 2, 1, 'plan'],
    [2, 166, 1, 0, 'specialist'],
  ] as const)('carries the actual injury recovery into the save for choice %s and roll %s', (choice, seed, paceLoss, physicalLoss, path) => {
    const injured = load(injuredCareer());
    const before = { ...injured, netWorth: 2, pendingRehab: { ...injured.pendingRehab!, specialistCost: 0.8 } };
    const season = before.seasons.at(-1)!;
    const after = seeded(seed, () => applyRehabChoice(before, choice));

    expect(after.seriousInjuries?.at(-1)?.path).toBe(path);
    expect(after.pace).toBe(before.pace - paceLoss);
    expect(after.physical).toBe(before.physical - physicalLoss);
    expect(after.overall).toBe(calcOverall(after, after.position));
    expect(after.seasons.at(-1)).toEqual({ ...season, rehabOverall: [before.overall, after.overall] });
    expect(season.rehabOverall).toBeUndefined();
    expect(after.seasons.slice(0, -1)).toEqual(before.seasons.slice(0, -1));
    expect(load(after)).toEqual(after);

    const next = seeded(166, () => advanceProSeason(load(after), FALLBACK_CLUBS, true));
    expect(next.seasons.at(-1)?.ratingPath?.[0]).toBe(after.overall);
    expect(next.seasons.at(-2)?.rehabOverall).toEqual([before.overall, after.overall]);
  });

  it('preserves a healthy pending choice and a finished career', () => {
    const valid = load(injuredCareer());
    expect(valid.phase).toBe('rehab_choice');
    expect(valid.pendingRehab?.name).toBe('ACL rupture');
    expect(load(valid)).toEqual(valid);
    const retired = load(manualRetire({ ...valid, pendingRehab: null }));
    expect(retired.retired).toBe(true);
    expect(load({ ...retired, phase: 'rehab_choice' })).toEqual(retired);
  });

  it('preserves a completed farewell instead of opening an extra playing year', () => {
    const valid = load(injuredCareer());
    const last = { ...valid.seasons.at(-1)!, age: 31 };
    const source: CareerState = { ...valid, phase: 'playing', age: 31, overall: 80,
      pendingRehab: null, seasons: [...valid.seasons.slice(0, -1), last] };
    const announced = announceSoccerFarewell(source);
    const interrupted: CareerState = { ...announced, phase: 'rehab_choice', age: 32,
      seasons: [...announced.seasons, { ...last, year: last.year + 1, age: 32 }] };
    expect(farewellSeasonComplete(interrupted)).toBe(true);
    expect(load(interrupted)).toEqual(interrupted);
  });
});
