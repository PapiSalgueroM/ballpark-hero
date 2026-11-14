import { afterEach, expect, it, vi } from 'vitest';
import {
  evalWorldUcl, finishSeason, loadCareer, playNextEntry, saveCareer, startCareer, startNextSeason,
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
  const shortlist = summary.ballonDorShortlist!;
  expect(shortlist).toHaveLength(10);
  expect(shortlist[0]).toMatchObject(summary.ballonDor!);
  expect(shortlist[0].evidence).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'watched-ucl', stage: 'winner' }),
  ]));
  expect(shortlist.flatMap(row => row.evidence)).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'league-winner' }),
    expect.objectContaining({ kind: 'league-goals' }),
  ]));
  expect(shortlist.map(row => row.score)).toEqual(shortlist.map(row => row.score).sort((a, b) => b - a));
  expect(new Set(shortlist.map(row => row.club + '|' + row.name)).size).toBe(10);
  expect(state.history.at(-1)?.ballonDorShortlist).toEqual(shortlist);
  expect(saveCareer(state)).toBe(true);
  expect(loadCareer()?.pendingSummary?.ballonDor).toEqual(summary.ballonDor);
  expect(loadCareer()?.pendingSummary?.ballonDorShortlist).toEqual(shortlist);
  expect(loadCareer()?.history.at(-1)?.ballonDorShortlist).toEqual(shortlist);
  expect(startNextSeason(state).history.at(-1)?.ballonDorShortlist).toEqual(shortlist);
  vi.mocked(Math.random).mockImplementation(stream(582));
  expect(finishSeason(career).summary.ballonDorShortlist).toEqual(shortlist);
}, 20000);

it('keeps five completed shortlists and the older winner without padding a sparse season', () => {
  const initial = completedSeason('Everton');
  const one = finishSeason(initial).state.history.at(-1)!;
  const sparse = {
    ...initial, season: 6, worldComps: undefined, world: {}, uclBracket: undefined,
    leagueBook: undefined, scorerRace: [], squad: initial.squad.map(p => ({ ...p, comp: undefined })),
    history: Array.from({ length: 5 }, (_, i) => ({ ...one, season: i + 1 })),
  };
  const { state, summary } = finishSeason(sparse);
  expect(summary.ballonDorShortlist).toHaveLength(1);
  expect(summary.ballonDorShortlist?.[0]).toMatchObject(summary.ballonDor!);
  expect(summary.ballonDorShortlist?.[0].evidence).toEqual([{ kind: 'league-winner', league: 'Premier League' }]);
  expect(state.history.filter(row => row.ballonDorShortlist).map(row => row.season)).toEqual([2, 3, 4, 5, 6]);
  expect(state.history[0].ballonDor).toEqual(one.ballonDor);
  expect(state.history[0].ballonDorShortlist).toBeUndefined();
  expect(sparse.history[0].ballonDorShortlist).toEqual(one.ballonDorShortlist);
}, 20000);

it('still uses the winner of a final the managed club played', () => {
  const career = completedSeason('Real Madrid');
  expect(career.uclBracket?.find(tie => tie.round === 'F')).toMatchObject({ mine: true, winner: 'Barcelona' });
  expect(evalWorldUcl(career)).toBeNull();
  const { summary } = finishSeason(career);
  expect(summary.ballonDor).toEqual({ name: 'Lamine Yamal', club: 'Barcelona' });
  expect(summary.ballonDorShortlist?.[0]).toMatchObject(summary.ballonDor!);
  expect(summary.ballonDorShortlist?.[0].evidence).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'played-ucl', stage: 'winner' }),
  ]));
}, 20000);

it('keeps the award already recorded in a legacy season summary', () => {
  const { state: career } = finishSeason(completedSeason('Everton'));
  const legacyAward = { name: 'Alexander Isak', club: 'Liverpool' };
  const legacy = { ...career, pendingSummary: { ...career.pendingSummary!, ballonDor: legacyAward, ballonDorShortlist: undefined },
    history: career.history.map(row => ({ ...row, ballonDorShortlist: undefined })) };
  localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));
  expect(loadCareer()?.pendingSummary?.ballonDor).toEqual(legacyAward);
  expect(loadCareer()?.pendingSummary?.ballonDorShortlist).toBeUndefined();
  expect(loadCareer()?.history.at(-1)?.ballonDorShortlist).toBeUndefined();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).pendingSummary.ballonDor).toEqual(legacyAward);
}, 20000);
