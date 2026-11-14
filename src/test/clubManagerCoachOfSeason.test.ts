import { afterEach, expect, it, vi } from 'vitest';
import { beginLeagueCoachSeason, finishSeason, leagueRounds, loadCareer, playNextEntry, saveCareer, startCareer,
  startNextSeason, type CareerState } from '@/lib/clubManager';
import { startMidSeason } from '@/lib/clubManagerCalendar';
import { saveFence } from '@/lib/saveFence';
import { SAVE_KEY } from '@/lib/clubManagerSaveKeys';

const stream = (seed: number) => () => {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

function play(start: CareerState, stop = start.calendar.length) {
  let state = start;
  for (let guard = 0; !state.sacked && state.week < stop && guard < 100; guard++) {
    state = playNextEntry(state, { skipHalftime: true, noCoach: true }).state;
  }
  expect(state.week).toBeGreaterThanOrEqual(stop);
  return state;
}

afterEach(() => {
  vi.restoreAllMocks();
  saveFence.release(SAVE_KEY);
  localStorage.clear();
});

it('settles an attributed league award and preserves the exact recorded season on reload and rollover', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 15));
  const random = vi.spyOn(Math, 'random').mockImplementation(stream(2));
  const untracked = startCareer('PSV');
  const tracked = beginLeagueCoachSeason(untracked);
  random.mockImplementation(stream(71));
  const control = play(untracked);
  random.mockImplementation(stream(71));
  const end = play(tracked);
  expect(end.table).toEqual(control.table);
  expect(end.squad).toEqual(control.squad);
  expect(end.resultLog).toEqual(control.resultLog);

  const { state, summary } = finishSeason(end);
  const winner = summary.leagueCoachAward!;
  expect(winner).toMatchObject({ name: 'Gabriel Nunes', club: 'Ajax', points: 83, goalDifference: 54 });
  expect(winner.matches).toBe(leagueRounds(end.leagueClubs.length));
  expect(end.table.find(row => row.club === winner.club)?.pts).toBe(winner.points);
  expect(state.history.at(-1)?.leagueCoachAward).toEqual(winner);
  expect(saveCareer(state)).toBe(true);
  expect(loadCareer()?.pendingSummary?.leagueCoachAward).toEqual(winner);
  expect(startNextSeason(state).history.at(-1)?.leagueCoachAward).toEqual(winner);
}, 20000);

it('withholds an award after a takeover and never assigns a full-season record to a replacement chair', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 15));
  const random = vi.spyOn(Math, 'random').mockImplementation(stream(2));
  const dayOne = startCareer('Manchester City');
  const eligible = beginLeagueCoachSeason(dayOne);
  expect(Object.keys(eligible.leagueCoachBook!.rows)).toEqual([dayOne.clubName]);
  const club = 'Arsenal';
  dayOne.managers![club] = { name: 'Fixture Original Coach', since: dayOne.season };
  const tracked = beginLeagueCoachSeason(dayOne);
  random.mockImplementation(stream(71));
  const halfway = play(tracked, 24);
  const previous = halfway.managers![club];
  expect(previous.real).toBeUndefined();
  expect(halfway.leagueCoachBook?.rows[club]).toBeDefined();
  halfway.managers![club] = { name: 'Fixture Replacement', since: halfway.season };
  const end = play(halfway);
  expect(end.leagueCoachBook?.rows[club]).toBeUndefined();
  const { summary } = finishSeason(end);
  expect(summary.leagueCoachAward).toBeUndefined();

  random.mockImplementation(stream(71));
  const takeover = startMidSeason(tracked, 'newYear');
  expect(takeover.leagueCoachBook).toBeUndefined();
  random.mockImplementation(stream(71));
  expect(finishSeason(play(takeover)).summary.leagueCoachAward).toBeUndefined();
  random.mockImplementation(stream(71));
  expect(finishSeason(play(dayOne)).summary.leagueCoachAward).toBeUndefined();
}, 20000);
