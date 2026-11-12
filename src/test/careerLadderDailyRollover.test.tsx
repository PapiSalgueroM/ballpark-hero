import './dailyReload/mocks';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import CareerLadder from '@/pages/CareerLadder';
import { fetchCareerPool, pickDailyPlayer, type CareerPlayer } from '@/lib/careerLadder';
import roster from '@/data/careerLadderRoster.json';
import { button, click, findButton, mountPage } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

vi.mock('@/lib/careerLadder', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/careerLadder')>(),
  fetchCareerPool: vi.fn(),
}));

const previousDate = '2026-11-11';
const currentDate = '2026-11-12';
const previousKey = `career-ladder-daily-${previousDate}`;
const currentKey = `career-ladder-daily-${currentDate}`;

const pool: CareerPlayer[] = roster.entries.map(([id, , , name]) => ({
  id, name, nationality: '', position: '',
  seasons: Array.from({ length: 4 }, (_, sortOrder) => ({
    season: String(sortOrder), club: 'Fixture Club', sortOrder,
    goals: null, assists: null, appearances: null, marketValue: null,
  })),
}));

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  vi.mocked(fetchCareerPool).mockReset();
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('preserves the new Career Ladder Daily when an older tab finishes loading after midnight', async () => {
  let resolvePrevious: (pool: CareerPlayer[]) => void = () => undefined;
  const delayedPool = new Promise<CareerPlayer[]>(resolve => { resolvePrevious = resolve; });
  vi.mocked(fetchCareerPool).mockReturnValueOnce(delayedPool).mockResolvedValue(pool);

  vi.setSystemTime(new Date('2026-11-12T04:59:59Z'));
  const previous = mountPage(<CareerLadder />, '/career-ladder');
  expect(findButton(previous.container, /^Give up$/)).toBeNull();

  vi.setSystemTime(new Date('2026-11-12T05:00:00Z'));
  const current = mountPage(<CareerLadder />, '/career-ladder');
  await act(async () => {});
  await click(button(current.container, /^Give up$/));
  await click(button(current.container, /^Yes, reveal it$/));
  const currentSave = localStorage.getItem(currentKey);
  expect(JSON.parse(currentSave ?? 'null')).toMatchObject({
    v: 1, date: currentDate, guesses: [{ t: 'give' }], gameStatus: 'lost',
  });

  const olderKey = 'career-ladder-daily-2026-11-10';
  const otherGameKey = 'career-ladder-daily-1900-daily-2026-11-10';
  const previousPuzzle = pickDailyPlayer(pool, previousDate, roster.entries);
  expect(previousPuzzle).not.toBeNull();
  const previousSave = JSON.stringify({
    v: 1, date: previousDate, puzzleIndex: 0, puzzleId: previousPuzzle?.id,
    guesses: [{ t: 'reveal' }], gameStatus: 'playing',
  });
  localStorage.setItem(previousKey, previousSave);
  localStorage.setItem(olderKey, 'older record');
  localStorage.setItem(otherGameKey, 'other game');

  await act(async () => { resolvePrevious(pool); });
  expect(button(previous.container, /^Give up$/)).toBeTruthy();
  expect(previous.container.textContent).toContain('2 more stints still hidden');
  expect(localStorage.getItem(currentKey)).toBe(currentSave);
  expect(localStorage.getItem(previousKey)).toBe(previousSave);
  expect(localStorage.getItem(olderKey)).toBeNull();
  expect(localStorage.getItem(otherGameKey)).toBe('other game');

  previous.unmount();
  current.unmount();
  const reopened = mountPage(<CareerLadder />, '/career-ladder');
  await act(async () => {});
  expect(reopened.container.textContent).toContain('Out of guesses');
  expect(findButton(reopened.container, /^Give up$/)).toBeNull();
  expect(localStorage.getItem(currentKey)).toBe(currentSave);
  expect(recordCompletion.mock.calls.map(([game, score]) => [game, score])).toEqual([['/career-ladder', 0]]);
});
