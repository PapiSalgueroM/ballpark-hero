import { afterEach, expect, it, vi } from 'vitest';
import {
  evalWorldUcl, finishSeason, loadCareer, playNextEntry, saveCareer, startCareer,
  SAVE_KEY, type CareerState,
} from '@/lib/clubManager';
import { saveFence } from '@/lib/saveFence';

function stream(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function completedSeason(club: string): CareerState {
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 15));
  const random = vi.spyOn(Math, 'random').mockImplementation(stream(2));
  let career = startCareer(club);
  for (let count = 0; career.week < career.calendar.length && count < 150; count++) {
    const next = playNextEntry(career, { skipHalftime: true, noCoach: true }).state;
    expect(next.week).toBeGreaterThan(career.week);
    career = next;
  }
  expect(career.week).toBe(career.calendar.length);
  expect(career.sacked).toBe(false);
  random.mockImplementation(stream(51));
  return career;
}

afterEach(() => {
  vi.restoreAllMocks();
  saveFence.release(SAVE_KEY);
  localStorage.clear();
});

it('considers the watched Champions League winner when settling the simulated Ballon d’Or', () => {
  const career = completedSeason('Everton');
  expect(career.uclGroup).toBeNull();
  expect(career.uclBracket?.find(tie => tie.round === 'F')?.winner).toBeFalsy();
  expect(evalWorldUcl(career)).toMatchObject({ done: true, winner: 'Bayern Munich' });
  const { state, summary } = finishSeason(career);
  expect(summary.ballonDor).toEqual({ name: 'Michael Olise', club: 'Bayern Munich' });
  expect(saveCareer(state)).toBe(true);
  expect(loadCareer()?.pendingSummary?.ballonDor).toEqual(summary.ballonDor);
}, 20000);

it('still uses the winner of a final the managed club played', () => {
  const career = completedSeason('Real Madrid');
  expect(career.uclBracket?.find(tie => tie.round === 'F')).toMatchObject({ mine: true, winner: 'Barcelona' });
  expect(evalWorldUcl(career)).toBeNull();
  expect(finishSeason(career).summary.ballonDor).toEqual({ name: 'Lamine Yamal', club: 'Barcelona' });
}, 20000);

it('keeps the award already recorded in a legacy season summary', () => {
  const { state: career } = finishSeason(completedSeason('Everton'));
  const legacyAward = { name: 'Alexander Isak', club: 'Liverpool' };
  const legacy = { ...career, pendingSummary: { ...career.pendingSummary!, ballonDor: legacyAward } };
  localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));
  expect(loadCareer()?.pendingSummary?.ballonDor).toEqual(legacyAward);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).pendingSummary.ballonDor).toEqual(legacyAward);
}, 20000);
