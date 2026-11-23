import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OPENING_2026_CUP_SCORERS } from '@/data/clubManagerOpening2026CupScorers';
import {
  beginLeagueCoachSeason, engineRegistrations, loadCareer, playNextEntry, restoreEngineRegistrations,
  resumeMatch, startCareer, startSecondHalf,
  type CareerState, type PlayEvent,
} from '@/lib/clubManager';
import { serializeParkedCareer } from '@/lib/clubManagerParkedSave';
import { UCL_GROUP_LEDGER } from '@/lib/clubManagerUclGroups';
import { cmVarGameAsk } from '@/lib/clubManagerVar';
import { CM_VAR_LIVE } from '@/lib/clubManagerVarLive';
import { withSeed } from '@/lib/managerHotSeat';

const club = 'Thun';
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

function play(career: CareerState, seed: number) {
  const untilWeek = career.week + 1;
  const advance = (from: CareerState) => playNextEntry(from, { skipHalftime: true, untilWeek, ...varAsk });
  const first = withSeed(seed + untilWeek, () => advance(career));
  return first.kind === 'window' && first.state.week === career.week
    ? withSeed(seed + untilWeek + 0x1000000, () => advance(first.state)) : first;
}

function pending(seed: number, week: number) {
  let state = beginLeagueCoachSeason(withSeed(seed,
    () => startCareer('Club Brugge', 'now', undefined, undefined, undefined, null, nativeRules)));
  while (state.week < week) {
    const next = play(state, seed).state;
    expect(next.week).toBeGreaterThan(state.week);
    state = next;
  }
  return state;
}

const credited = (state: CareerState) => state.uclScorers?.players.filter(row => row[2] === club) ?? [];
const total = (state: CareerState, name: string) => credited(state).find(row => row[1] === name)?.[3] ?? 0;

it.each([
  [115366, 6, 'Thun|Manchester City', [1, 4], 'ATT', 'Marc Gutbub', 1],
  [115368, 3, 'Thun|Como', [1, 1], 'DEF', 'Nicolas Bürgy', 1],
  [115373, 3, 'AGF|Thun', [2, 1], 'MID', 'Justin Roth', 1],
  [115366, 20, 'Thun|Celtic', [2, 0], 'ATT', 'Brighton Labeau', 2],
] as const)('credits a verified player in background replay %s at week %s', (seed, week, fixture, score, line, scorer, count) => {
  const before = pending(seed, week);
  const after = play(before, seed).state;
  expect(after.pairResults?.[UCL_GROUP_LEDGER]?.[fixture]).toEqual(score);
  const improvers = credited(after).filter(row => row[3] > total(before, row[1]));
  expect(improvers).toHaveLength(1);
  const [id, name, , goals, generated] = improvers[0];
  expect(name).toBe(scorer);
  expect(goals - total(before, name)).toBe(count);
  expect(id).toBe(JSON.stringify(['now', club, name]));
  expect(generated).toBeUndefined();
  expect(OPENING_2026_CUP_SCORERS.get(club)).toContainEqual({ name, line });
  expect(loadCareer(serializeParkedCareer(after))?.uclScorers).toEqual(after.uclScorers);
});

it('keeps an empty forward slot anonymous when a verified player has already moved away', () => {
  const seed = 115366;
  const before = pending(seed, 6);
  const after = play({ ...before, goneNames: [...before.goneNames, 'Marc Gutbub'] }, seed).state;
  expect(after.pairResults?.[UCL_GROUP_LEDGER]?.['Thun|Manchester City']).toEqual([1, 4]);
  expect(credited(after)).toEqual([]);
  expect(after.uclScorers?.unresolved).toBe(1);
});

it('names the managed goals and matching shots without changing the score or an old settled save', () => {
  const seed = 115390;
  const before = pending(seed, 20);
  const candidate = play(before, seed);
  const get = OPENING_2026_CUP_SCORERS.get.bind(OPENING_2026_CUP_SCORERS);
  const noThun = vi.spyOn(OPENING_2026_CUP_SCORERS, 'get').mockImplementation(team => team === club ? undefined : get(team));
  const old = play(before, seed);
  noThun.mockRestore();

  expect(candidate.report).toMatchObject({ home: club, away: 'Club Brugge', homeGoals: 3, awayGoals: 3 });
  const goals = candidate.report!.oppScorers;
  expect(goals.map(goal => goal.minute)).toEqual([2, 49, 78]);
  expect(goals.map(goal => goal.name)).toEqual(['Nicolas Bürgy', 'Marc Gutbub', 'Nils Reichmuth']);
  const names = OPENING_2026_CUP_SCORERS.get(club)?.map(row => row.name) ?? [];
  for (const goal of goals) expect(names).toContain(goal.name);
  const goalShots = candidate.report?.detail?.play.filter(event => event.side === 'opp' && event.goal);
  expect(goalShots?.map(event => [event.who, event.minute])).toEqual(goals.map(goal => [goal.name, goal.minute]));
  for (const name of new Set(goals.map(goal => goal.name))) {
    expect(total(candidate.state, name) - total(before, name)).toBe(goals.filter(goal => goal.name === name).length);
  }
  expect(candidate.state.pairResults?.[UCL_GROUP_LEDGER]).toEqual(old.state.pairResults?.[UCL_GROUP_LEDGER]);
  expect(candidate.state.uclScorers?.ownGoals).toBe(old.state.uclScorers?.ownGoals);
  expect(candidate.state.uclScorers?.unresolved).toBe(old.state.uclScorers!.unresolved - 3);
  expect(old.report?.oppScorers.map(goal => goal.name)).toEqual(['Thun No. 10', 'Thun No. 11', 'Thun No. 8']);
  expect(loadCareer(serializeParkedCareer(old.state))?.uclScorers).toEqual(old.state.uclScorers);
});

it('keeps a named first half across reload and keeps disallowed VAR goals uncredited', () => {
  const before = pending(115390, 20);
  const kickoff = (seed: number) => withSeed(seed, () => playNextEntry(before, { untilWeek: 21, ...varAsk }));
  const paused = kickoff(115411);
  expect(paused.kind).toBe('halftime');
  const goal = paused.state.live?.h1Opp?.[0];
  expect(goal).toMatchObject({ minute: 2 });
  expect(OPENING_2026_CUP_SCORERS.get(club)?.map(row => row.name) ?? []).toContain(goal?.name);
  const reloaded = loadCareer(serializeParkedCareer(paused.state))!;
  expect(reloaded.live?.h1Opp).toEqual(paused.state.live?.h1Opp);
  const secondHalf = withSeed(115412, () => startSecondHalf(reloaded))!;
  const finished = withSeed(115413, () => resumeMatch(secondHalf));
  expect(finished.report).toMatchObject({ home: club, away: 'Club Brugge', homeGoals: 1, awayGoals: 4 });
  expect(finished.report?.oppScorers[0]).toEqual(goal);

  const ruledOut = kickoff(115513);
  expect(ruledOut.kind).toBe('halftime');
  expect(ruledOut.state.live?.h1Opp).toEqual([]);
  const review = (event: PlayEvent) => event.kind === 'var' && event.side === 'opp' && event.review?.decision === 'disallowed';
  expect(ruledOut.state.live?.h1Play?.filter(review)).toEqual([expect.objectContaining({
    minute: 29, who: 'Thun No. 10',
    review: expect.objectContaining({ id: '2026:Club Brugge:20:Thun:0:45:opp:29:0:Thun No. 10:goal' }),
  })]);
});
