import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useContractChaos } from '@/hooks/useContractChaos';
import { allOutcomes, buildDeal, dailySeed, freeSeed, SAVE_KEY } from '@/lib/contractChaos';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const firstDay = '2026-11-11';
const secondDay = '2026-11-12';
const beforeMidnight = new Date('2026-11-12T04:59:59Z');
const afterMidnight = new Date('2026-11-12T05:00:01Z');

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(beforeMidnight);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

it('keeps the dealt date when an offer is signed across Eastern midnight', () => {
  const { result, unmount } = renderHook(useContractChaos);
  const firstDeal = buildDeal(dailySeed(firstDay));
  const outcome = allOutcomes(firstDeal)[0];

  act(() => result.current.start('daily'));
  expect(result.current.deal).toEqual(firstDeal);
  act(() => result.current.open(0));
  vi.setSystemTime(afterMidnight);
  act(() => result.current.sign(0));

  expect(result.current.today).toBe(secondDay);
  expect(result.current.save.daily).toEqual({
    date: firstDay, score: outcome.score, club: firstDeal.offers[0].fa.label, verdict: outcome.verdict,
  });
  expect(result.current.dailyPlayed).toBeNull();
  expect(result.current.outcomes[0]).toEqual(outcome);
  unmount();

  const reopened = renderHook(useContractChaos).result;
  expect(reopened.current.save.daily?.date).toBe(firstDay);
  expect(reopened.current.dailyPlayed).toBeNull();
  act(() => reopened.current.start('daily'));
  expect(reopened.current.deal).toEqual(buildDeal(dailySeed(secondDay)));
  expect(reopened.current.deal).not.toEqual(firstDeal);
  act(() => reopened.current.sign(0));
  expect(reopened.current.dailyPlayed?.date).toBe(secondDay);
  expect(reopened.current.save.played).toBe(2);
});

it('keeps the same-day lock and lets Free play retain it', () => {
  const { result } = renderHook(useContractChaos);
  act(() => result.current.start('daily'));
  act(() => result.current.sign(0));
  const daily = result.current.dailyPlayed;
  expect(daily?.date).toBe(firstDay);

  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  act(() => result.current.toMenu());
  act(() => result.current.start('free'));
  expect(result.current.deal).toEqual(buildDeal(freeSeed(0.5)));
  act(() => result.current.sign(0));
  expect(result.current.dailyPlayed).toEqual(daily);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).daily).toEqual(daily);
  expect(result.current.save.played).toBe(2);
});

it.each([
  ['the same Daily', beforeMidnight],
  ['an older Daily', afterMidnight],
])('keeps another tab’s receipt when this tab signs %s', (_label, finishTime) => {
  const stale = renderHook(useContractChaos).result;
  act(() => stale.current.start('daily'));

  vi.setSystemTime(finishTime);
  const fresh = renderHook(useContractChaos).result;
  act(() => fresh.current.start('daily'));
  act(() => fresh.current.sign(0));
  const saved = localStorage.getItem(SAVE_KEY);
  expect(fresh.current.save.played).toBe(1);

  act(() => stale.current.sign(1));
  expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
  expect(stale.current.save).toEqual(fresh.current.save);
  expect(stale.current.phase).toBe('menu');
});
