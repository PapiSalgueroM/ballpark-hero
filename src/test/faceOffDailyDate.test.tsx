import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFaceOff } from '@/hooks/useFaceOff';
import {
  DAILY_DIFFICULTY, ROUNDS, SAVE_KEY, buildCategories, dealRounds, loadSave,
  makeRng, recordMatch, resolveRound, resolveVersus, seedForDate, serialize,
  shareText,
} from '@/lib/faceOff';

const clock = vi.hoisted(() => ({ now: 0 }));
const external = vi.hoisted(() => ({ ranked: vi.fn(), unranked: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: external.ranked }));
vi.mock('@/lib/completions', () => ({ recordCompletion: external.unranked }));

const DAY_ZERO = '2026-10-29';
const DAY_ONE = '2026-10-30';
const BEFORE_MIDNIGHT = '2026-10-30T03:59:50.000Z';
const AFTER_MIDNIGHT = '2026-10-30T04:00:10.000Z';
const ANSWER_SECONDS = 0.25;
type GameView = { result: { current: ReturnType<typeof useFaceOff> } };

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(BEFORE_MIDNIGHT));
  clock.now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
  vi.spyOn(Math, 'random').mockReturnValue(0.42);
  external.ranked.mockClear();
  external.unranked.mockClear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

function dailyDeal(day: string) {
  return dealRounds(buildCategories(), makeRng(seedForDate(day)), DAILY_DIFFICULTY, ROUNDS);
}

function startDaily(view: GameView, day: string) {
  act(() => view.result.current.start('daily', DAILY_DIFFICULTY));
  expect(view.result.current.phase).toBe('playing');
  expect(view.result.current.rounds).toHaveLength(ROUNDS);
  expect(view.result.current.rounds).toEqual(dailyDeal(day));
}

function finishSolo(view: GameView) {
  for (let roundIndex = 0; roundIndex < ROUNDS; roundIndex += 1) {
    const round = view.result.current.current!;
    expect(view.result.current.phase).toBe('playing');
    expect(view.result.current.index).toBe(roundIndex);
    expect(round).not.toBeNull();
    clock.now += ANSWER_SECONDS * 1000;
    act(() => view.result.current.pick(round.higher));
    expect(view.result.current.phase).toBe('reveal');
    expect(view.result.current.results).toHaveLength(roundIndex + 1);
    expect(view.result.current.lastResult).toEqual(resolveRound(round, round.higher, ANSWER_SECONDS));
    act(() => view.result.current.next());
  }
  expect(view.result.current.phase).toBe('done');
  expect(view.result.current.results).toHaveLength(ROUNDS);
}

function finishVersus(view: GameView) {
  for (let roundIndex = 0; roundIndex < ROUNDS; roundIndex += 1) {
    const round = view.result.current.current!;
    const wrong = round.higher === 'a' ? 'b' : 'a';
    expect(view.result.current.phase).toBe('playing');
    expect(view.result.current.turn).toBe(1);
    clock.now += ANSWER_SECONDS * 1000;
    act(() => view.result.current.pick(round.higher));
    expect(view.result.current.phase).toBe('handoff');
    act(() => view.result.current.ready());
    expect(view.result.current.turn).toBe(2);
    clock.now += ANSWER_SECONDS * 1000;
    act(() => view.result.current.pick(wrong));
    expect(view.result.current.phase).toBe('reveal');
    expect(view.result.current.lastResult).toEqual(resolveVersus(round, round.higher, ANSWER_SECONDS, wrong, ANSWER_SECONDS));
    act(() => view.result.current.next());
  }
  expect(view.result.current.phase).toBe('done');
  expect(view.result.current.results).toHaveLength(ROUNDS);
}

function finishOvernightDaily() {
  const view = renderHook(useFaceOff);
  startDaily(view, DAY_ZERO);
  vi.setSystemTime(new Date(AFTER_MIDNIGHT));
  finishSolo(view);
  return view;
}

describe('Face Off daily date ownership', () => {
  it('stale-menu-start-deals-click-day', () => {
    const view = renderHook(useFaceOff);
    expect(view.result.current.today).toBe(DAY_ZERO);
    vi.setSystemTime(new Date(AFTER_MIDNIGHT));
    expect(view.result.current.phase).toBe('menu');
    expect(view.result.current.today).toBe(DAY_ZERO);
    expect(dailyDeal(DAY_ZERO)).not.toEqual(dailyDeal(DAY_ONE));
    startDaily(view, DAY_ONE);
    finishSolo(view);
    expect(loadSave(localStorage.getItem(SAVE_KEY)).daily?.date).toBe(DAY_ONE);
    expect(view.result.current.today).toBe(DAY_ONE);
  });

  it('overnight-result-keeps-deal-day', () => {
    const view = finishOvernightDaily();
    const stored = loadSave(localStorage.getItem(SAVE_KEY));
    expect(stored.daily?.date, 'FACEOFF_DAILY_DATE_RECORD').toBe(DAY_ZERO);
    expect(stored).toEqual(view.result.current.save);
    expect(stored.played).toBe(1);
    expect(stored.daily?.you).toBe(view.result.current.totals.you);
    expect(stored.daily?.rival).toBe(view.result.current.totals.rival);
  });

  it('overnight-share-keeps-deal-day', () => {
    const view = finishOvernightDaily();
    expect(view.result.current.today, 'FACEOFF_DAILY_DATE_SHARE').toBe(DAY_ZERO);
    const text = shareText(view.result.current.totals, view.result.current.difficulty, view.result.current.today);
    expect(text.startsWith(`Face Off daily ${DAY_ZERO}:`)).toBe(true);
    expect(text).not.toContain(`Face Off daily ${DAY_ONE}:`);
  });

  it('overnight-menu-leaves-new-daily-open', () => {
    const view = finishOvernightDaily();
    act(() => view.result.current.toMenu());
    expect(view.result.current.phase).toBe('menu');
    expect(view.result.current.today).toBe(DAY_ONE);
    expect(view.result.current.dailyPlayed, 'FACEOFF_DAILY_DATE_NEXT_DAY_UNLOCK').toBeNull();
    startDaily(view, DAY_ONE);
    finishSolo(view);
    const stored = loadSave(localStorage.getItem(SAVE_KEY));
    expect(stored.played).toBe(2);
    expect(stored.daily?.date).toBe(DAY_ONE);
    act(() => view.result.current.toMenu());
    expect(view.result.current.dailyPlayed).toEqual(stored.daily);
  });

  it('same-day-and-unranked-mode-preservation', () => {
    const view = renderHook(useFaceOff);
    const initial = loadSave(null);
    startDaily(view, DAY_ZERO);
    finishSolo(view);
    const daily = recordMatch(initial, view.result.current.totals, DAILY_DIFFICULTY, DAY_ZERO);
    expect(view.result.current.save).toEqual(daily);
    expect(localStorage.getItem(SAVE_KEY)).toBe(serialize(daily));
    expect(view.result.current.today).toBe(DAY_ZERO);
    expect(external.ranked.mock.calls.some(call => call[1] === true)).toBe(true);
    expect(external.unranked).not.toHaveBeenCalled();

    act(() => view.result.current.toMenu());
    external.ranked.mockClear();
    act(() => view.result.current.start('unlimited', 'pro'));
    finishSolo(view);
    const unlimited = recordMatch(daily, view.result.current.totals, 'pro', null);
    expect(view.result.current.save).toEqual(unlimited);
    expect(unlimited.daily).toEqual(daily.daily);
    expect(localStorage.getItem(SAVE_KEY)).toBe(serialize(unlimited));
    expect(external.ranked.mock.calls.every(call => call[1] === false)).toBe(true);
    expect(external.unranked).toHaveBeenCalledTimes(1);
    expect(external.unranked).toHaveBeenLastCalledWith('/face-off');

    act(() => view.result.current.toMenu());
    external.ranked.mockClear();
    act(() => view.result.current.start('versus', 'pro'));
    finishVersus(view);
    expect(view.result.current.save).toEqual(unlimited);
    expect(localStorage.getItem(SAVE_KEY)).toBe(serialize(unlimited));
    expect(external.ranked.mock.calls.every(call => call[1] === false)).toBe(true);
    expect(external.unranked).toHaveBeenCalledTimes(2);
    expect(external.unranked).toHaveBeenLastCalledWith('/face-off');
    act(() => view.result.current.toMenu());
    expect(view.result.current.dailyPlayed).toEqual(daily.daily);
  });
});
