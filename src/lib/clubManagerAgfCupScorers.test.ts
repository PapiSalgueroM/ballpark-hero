import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OPENING_2026_CUP_SCORERS } from '@/data/clubManagerOpening2026CupScorers';
import {
  beginLeagueCoachSeason, engineRegistrations, loadCareer, playNextEntry,
  restoreEngineRegistrations, startCareer, type CareerState,
} from '@/lib/clubManager';
import { serializeParkedCareer } from '@/lib/clubManagerParkedSave';
import { UCL_GROUP_LEDGER } from '@/lib/clubManagerUclGroups';
import { cmVarGameAsk } from '@/lib/clubManagerVar';
import { CM_VAR_LIVE } from '@/lib/clubManagerVarLive';
import { withSeed } from '@/lib/managerHotSeat';

const club = 'AGF';
const nativeRules = {
  championshipPlayoffs: true, bundesligaPlayoff: true, frenchPlayoffs: true,
  inSeasonRatings: true, worldRatingTiming: true, opening2026Loans: true, opening2026Transfers: true,
} as const;
const varAsk = cmVarGameAsk(CM_VAR_LIVE);
const registrations = engineRegistrations();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1791633600000);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  restoreEngineRegistrations(registrations);
  localStorage.clear();
});

function play(state: CareerState, seed: number) {
  const untilWeek = state.week + 1;
  const advance = (from: CareerState) => playNextEntry(from, { skipHalftime: true, untilWeek, ...varAsk });
  const first = withSeed(seed + untilWeek, () => advance(state));
  return first.kind === 'window' && first.state.week === state.week
    ? withSeed(seed + untilWeek + 0x1000000, () => advance(first.state)) : first;
}

function pending(managedClub: string, seed: number, week: number) {
  let state = beginLeagueCoachSeason(withSeed(seed,
    () => startCareer(managedClub, 'now', undefined, undefined, undefined, null, nativeRules)));
  while (state.week < week) {
    const next = play(state, seed).state;
    expect(next.week).toBeGreaterThan(state.week);
    state = next;
  }
  return state;
}

it.each([
  ['Real Madrid', 116137, 3, 'Club Brugge|AGF', [0, 2], 'Frederik Tingager'],
  ['Club Brugge', 115373, 11, 'AGF|AEK Athens', [2, 3], 'Magnus Knudsen'],
] as const)('names a verified AGF scorer in the background with %s at seed %s and week %s',
  (managedClub, seed, week, fixture, score, scorer) => {
    const before = pending(managedClub, seed, week);
    const candidate = play(structuredClone(before), seed);
    const get = OPENING_2026_CUP_SCORERS.get.bind(OPENING_2026_CUP_SCORERS);
    const noAgf = vi.spyOn(OPENING_2026_CUP_SCORERS, 'get').mockImplementation(team => team === club ? undefined : get(team));
    const old = play(before, seed);
    noAgf.mockRestore();

    const credit = [JSON.stringify(['now', club, scorer]), scorer, club, 1];
    const book = candidate.state.uclScorers!;
    const oldBook = old.state.uclScorers!;
    expect(book.players.filter(row => row[2] === club)).toContainEqual(credit);
    expect(book.players.filter(row => row[0] !== credit[0])).toEqual(oldBook.players);
    expect(book.unresolved).toBe(oldBook.unresolved - 1);
    expect(book.ownGoals).toBe(oldBook.ownGoals);
    expect(candidate.state.pairResults?.[UCL_GROUP_LEDGER]?.[fixture]).toEqual(score);
    expect(candidate.state.pairResults?.[UCL_GROUP_LEDGER]).toEqual(old.state.pairResults?.[UCL_GROUP_LEDGER]);
    expect(candidate.report).toEqual(old.report);
    expect(loadCareer(serializeParkedCareer(candidate.state))?.uclScorers).toEqual(book);
    expect(loadCareer(serializeParkedCareer(old.state))?.uclScorers).toEqual(oldBook);
  });

it('keeps an AGF midfield goal anonymous when the verified player has left', () => {
  const seed = 115373;
  const before = pending('Club Brugge', seed, 11);
  const after = play({ ...before, goneNames: [...before.goneNames, 'Magnus Knudsen'] }, seed).state;

  expect(after.pairResults?.[UCL_GROUP_LEDGER]?.['AGF|AEK Athens']).toEqual([2, 3]);
  expect(after.uclScorers?.players.some(row => row[1] === 'Magnus Knudsen')).toBe(false);
  expect(after.uclScorers?.unresolved).toBe(1);
});

it('keeps both managed AGF goals on the original Gift Links player key', () => {
  const seed = 115381;
  const managed = play(pending('Club Brugge', seed, 3), seed);
  expect(managed.report).toMatchObject({
    home: 'Club Brugge', away: club, homeGoals: 2, awayGoals: 2,
    oppScorers: [
      { name: 'Gift Links', minute: 29 },
      { name: 'Gift Links', minute: 90, plus: 2, freeKick: true },
    ],
  });
  expect(managed.state.uclScorers?.players.filter(row => row[2] === club)).toEqual([
    [JSON.stringify(['now', club, 'Gift Links', 'LM', 1998, 0]), 'Gift Links', club, 2],
  ]);
});
