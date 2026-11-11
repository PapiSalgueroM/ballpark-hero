import { afterEach, expect, it, vi } from 'vitest';
import { isAvailable, playNextEntry, resumeMatch, startCareer, type CareerState } from './clubManager';
import { simToWeek } from './clubManagerCalendar';
import { cmVarGameAsk } from './clubManagerVar';

const reviewOptions = cmVarGameAsk(true);
const timber = 'p-quinten-timber';

function seedRandom(initial: number) {
  let seed = initial;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
}

function openingCareer() {
  seedRandom(1);
  const career = startCareer('Crystal Palace');
  seedRandom(5);
  return career;
}

const player = (c: CareerState, id: string) => c.squad.find(p => p.id === id)!;

afterEach(() => vi.restoreAllMocks());

it('makes a one-week match injury cost the next paid fixture', () => {
  const opening = openingCareer();
  const older = opening.squad.find(p => !opening.xiIds.includes(p.id) && p.position !== 'GK')!;
  older.injuryWeeks = 3;
  const result = playNextEntry(opening, { skipHalftime: true, ...reviewOptions });
  expect(result.report?.detail?.injuries).toContainEqual(expect.objectContaining({ id: timber, weeks: 1, minute: 11 }));
  expect(result.state.resultLog.at(-1)).toMatchObject({ opp: 'Everton', score: '0-1' });
  expect(player(result.state, timber).injuryWeeks).toBe(1);
  expect(player(result.state, older.id).injuryWeeks).toBe(2);

  seedRandom(41);
  const next = playNextEntry(result.state, reviewOptions);
  expect(next.kind).toBe('halftime');
  expect(next.live?.startXi).not.toContain(timber);
  const recovered = resumeMatch(next.state).state;
  expect(isAvailable(player(recovered, timber))).toBe(true);
  expect(player(recovered, older.id).injuryWeeks).toBe(1);
});

it('keeps the full match injury when settling a saved live match', () => {
  const firstHalf = playNextEntry(openingCareer(), reviewOptions);
  expect(firstHalf.live?.h1Injuries).toContainEqual(expect.objectContaining({ id: timber, weeks: 1 }));
  const paused = JSON.parse(JSON.stringify(firstHalf.state)) as CareerState;
  const result = resumeMatch(paused);
  expect(result.report?.detail?.injuries).toContainEqual(expect.objectContaining({ id: timber, weeks: 1 }));
  expect(player(result.state, timber).injuryWeeks).toBe(1);
});

it('keeps the full match injury when simming to the calendar date', () => {
  const result = simToWeek(openingCareer(), 1, reviewOptions);
  expect(result.lastReport?.detail?.injuries).toContainEqual(expect.objectContaining({ id: timber, weeks: 1 }));
  expect(result.state.week).toBe(1);
  expect(player(result.state, timber).injuryWeeks).toBe(1);
});
