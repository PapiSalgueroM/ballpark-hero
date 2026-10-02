// Fictional finals rows feed the original question builder, hook, save and recorder.
import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useWhodTheyBeat } from '@/hooks/useWhodTheyBeat';
import WhodTheyBeat from '@/pages/WhodTheyBeat';
import { FINALS_COMPS, buildQuestions, type FinalsCompDef, type FinalsRow } from '@/lib/whodTheyBeat';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

vi.mock('@/lib/whodTheyBeat', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/whodTheyBeat')>()),
  fetchFinalsRows: async (comp: FinalsCompDef) => fixtureRows(comp),
}));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <div data-fixture-share={score} /> }));

function fixtureRows(comp: FinalsCompDef): FinalsRow[] {
  return Array.from({ length: 12 }, (_, i) => ({ year: 2000 + i, winner: `Fictional ${comp.key} Winner ${i}`, loser: `Fictional ${comp.key} Finalist ${i}`, series: `Fixture series ${i}`, score: 'Fixture score', venue: 'Fixture Stadium', place: 'Fixture City' }));
}
const boardFor = (day: string) => buildQuestions(new Map(FINALS_COMPS.map(comp => [comp.key, fixtureRows(comp)])), `whod-they-beat:${day}`);
const saved = (day = getTodayET()) => JSON.parse(localStorage.getItem(`whod-they-beat-daily-${day}`)!);
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => {
  localStorage.clear(); resetMocks(); consumeRestoredFinish('whod-they-beat');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date('2026-10-02T16:00:00Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); consumeRestoredFinish('whod-they-beat'); });
async function start(mode: 'daily' | 'unlimited' = 'daily') {
  const view = renderHook(useWhodTheyBeat); await flush();
  expect(view.result.current.loadState).toBe('ready'); expect(view.result.current.questions).toHaveLength(10);
  if (mode === 'unlimited') act(() => view.result.current.switchMode(mode));
  return view;
}
type View = Awaited<ReturnType<typeof start>>;
function pick(view: View, correct = true) { act(() => view.result.current.answer(correct ? view.result.current.current!.correctIndex : (view.result.current.current!.correctIndex + 1) % 4)); }
function next(view: View) { act(() => view.result.current.advanceReveal()); }
// Original auto-advance and the new manual action both exercise identical save/score baselines.
function settleBaseline(view: View) {
  act(() => vi.advanceTimersByTime(2300));
  if (view.result.current.showingResult) next(view);
}
function toLast(view: View, wrongAt = -1) {
  for (let i = 0; i < 9; i++) { pick(view, i !== wrongAt); settleBaseline(view); }
  expect(view.result.current.qIdx).toBe(9);
}
async function page() {
  const view = render(<HelmetProvider><MemoryRouter><WhodTheyBeat /></MemoryRouter></HelmetProvider>); await flush();
  expect(view.getByRole('button', { name: boardFor(getTodayET())[0].options[0] })).toBeEnabled();
  return view;
}

describe('Who would they beat readable reveal', () => {
  it.each(['daily', 'unlimited'] as const)('keeps the %s answer and explanation readable until an explicit advance', async mode => {
    const view = await start(mode), question = view.result.current.current;
    pick(view); act(() => vi.advanceTimersByTime(10_000));
    expect(view.result.current.current).toEqual(question);
    expect(view.result.current.showingResult).toBe(true);
    expect(view.result.current.pickedIndex).toBe(question!.correctIndex);
    expect(view.result.current.answers).toEqual([]); expect(view.result.current.done).toBe(false);
    next(view); expect(view.result.current.qIdx).toBe(1); expect(view.result.current.score).toBe(1);
    expect(view.result.current.showingResult).toBe(false);
    next(view); expect(view.result.current.answers).toEqual([true]);
    pick(view); expect(view.result.current.showingResult).toBe(true);
    next(view); expect(view.result.current.answers).toEqual([true, true]);
  });

  it('preserves a wrong answer as one saved false with zero earned points', async () => {
    const view = await start(); pick(view, false);
    expect(saved()).toEqual({ answers: [false] }); expect(view.result.current.score).toBe(0);
    settleBaseline(view); expect(view.result.current.answers).toEqual([false]);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('same-frame picks accept only the first decided answer', async () => {
    const view = await start(), answer = view.result.current.answer, correct = view.result.current.current!.correctIndex;
    act(() => { answer(correct); answer((correct + 1) % 4); });
    expect(view.result.current.pickedIndex).toBe(correct); expect(saved()).toEqual({ answers: [true] });
    next(view); expect(view.result.current.answers).toEqual([true]); expect(view.result.current.score).toBe(1);
  });

  it.each([-1, 4, 1.5, NaN, Infinity, '0', null, undefined])('rejects invalid option %s without deciding or saving a round', async invalid => {
    const view = await start(); act(() => view.result.current.answer(invalid as number));
    expect(view.result.current.showingResult).toBe(false); expect(view.result.current.pickedIndex).toBeNull();
    expect(view.result.current.answers).toEqual([]); expect(localStorage.getItem(`whod-they-beat-daily-${getTodayET()}`)).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('mode changes discard pending reveal actions without changing the saved daily', async () => {
    const view = await start(); pick(view); const raw = localStorage.getItem(`whod-they-beat-daily-${getTodayET()}`);
    act(() => view.result.current.switchMode('unlimited')); next(view);
    expect(view.result.current.qIdx).toBe(0); expect(view.result.current.showingResult).toBe(false);
    pick(view); expect(view.result.current.showingResult).toBe(true); next(view);
    expect(view.result.current.answers).toEqual([true]);
    act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.answers).toEqual([true]); expect(view.result.current.showingResult).toBe(false);
    expect(localStorage.getItem(`whod-they-beat-daily-${getTodayET()}`)).toBe(raw);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('unlimited replay clears pending feedback and keeps the daily save untouched', async () => {
    const view = await start(); pick(view); settleBaseline(view);
    const raw = localStorage.getItem(`whod-they-beat-daily-${getTodayET()}`);
    act(() => view.result.current.switchMode('unlimited')); pick(view);
    act(() => view.result.current.playAgain()); next(view);
    expect(view.result.current.answers).toEqual([]); expect(view.result.current.showingResult).toBe(false);
    pick(view); expect(view.result.current.showingResult).toBe(true); next(view);
    expect(view.result.current.answers).toEqual([true]);
    expect(localStorage.getItem(`whod-they-beat-daily-${getTodayET()}`)).toBe(raw);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('a refresh during an early reveal resumes after that already saved answer', async () => {
    const first = await start(); pick(first); first.unmount(); const again = await start();
    expect(again.result.current.qIdx).toBe(1); expect(again.result.current.answers).toEqual([true]);
    expect(again.result.current.showingResult).toBe(false); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('the final daily pick records its exact score before results and never books again on refresh', async () => {
    const first = await start(); toLast(first, 2); pick(first);
    expect(first.result.current.done).toBe(false); expect(saved().answers).toHaveLength(10);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/whod-they-beat', 9, 'Tester', 1);
    first.unmount(); const again = await start();
    expect(again.result.current.done).toBe(true); expect(again.result.current.score).toBe(9);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('a final reveal mode toggle retains the complete daily and exactly one booking', async () => {
    const view = await start(); toLast(view); pick(view);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/whod-they-beat', 10, 'Tester', 1);
    act(() => view.result.current.switchMode('unlimited')); act(() => vi.advanceTimersByTime(10_000));
    expect(view.result.current.answers).toEqual([]);
    act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.done).toBe(true); expect(view.result.current.score).toBe(10);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('pins an overnight final pick to the day that dealt the board', async () => {
    vi.setSystemTime(new Date('2026-10-03T03:59:00Z'));
    const view = await start(); toLast(view); vi.setSystemTime(new Date('2026-10-03T04:01:00Z')); pick(view); settleBaseline(view);
    expect(view.result.current.done).toBe(true); expect(saved('2026-10-02').answers).toHaveLength(10);
    expect(localStorage.getItem('whod-they-beat-daily-2026-10-03')).toBeNull();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/whod-they-beat', 10, 'Tester', 1);
  });

  it.each([true, false])('the actual page keeps %s feedback locked and announces earned score before Next final', async correct => {
    const view = await page(), question = boardFor(getTodayET())[0];
    const choice = view.getByRole('button', { name: question.options[correct ? question.correctIndex : (question.correctIndex + 1) % 4] });
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    choice.focus(); focus.mockClear(); fireEvent.click(choice);
    act(() => vi.advanceTimersByTime(10_000));
    const feedback = view.getByRole('status');
    expect(feedback).toHaveTextContent(`${correct ? 'Right!' : 'Nope.'} The ${question.winner} beat the ${question.options[question.correctIndex]}.`);
    expect(feedback).toHaveTextContent(question.detail);
    expect(view.getByText('Right:', { exact: false })).toHaveTextContent(`Right: ${correct ? 1 : 0}`);
    for (const option of question.options) expect(view.getByRole('button', { name: option })).toBeDisabled();
    const advance = view.getByRole('button', { name: 'Next final' }); expect(advance).toHaveFocus();
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    fireEvent.click(advance);
    expect(view.queryByRole('status')).toBeNull(); expect(view.getByText('Final:', { exact: false })).toHaveTextContent('Final: 2/10');
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it.each(['Daily', 'Unlimited', 'the Record Books'])('preserves intentional focus on %s when answer feedback appears', async name => {
    const view = await page(), question = boardFor(getTodayET())[0];
    const outside = name === 'the Record Books' ? view.getByRole('link', { name }) : view.getByRole('button', { name });
    outside.focus(); expect(outside).toHaveFocus();
    fireEvent.click(view.getByRole('button', { name: question.options[question.correctIndex] }));
    expect(view.getByRole('button', { name: 'Next final' })).toBeEnabled();
    expect(outside).toHaveFocus();
    act(() => vi.advanceTimersByTime(10_000));
    expect(outside).toHaveFocus(); expect(saved()).toEqual({ answers: [true] });
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('the actual page shows View results after the last pick and keeps the final share and booking exact', async () => {
    const view = await page(), questions = boardFor(getTodayET());
    for (let i = 0; i < questions.length; i++) {
      fireEvent.click(view.getByRole('button', { name: questions[i].options[questions[i].correctIndex] }));
      expect(view.getByText('Right:', { exact: false })).toHaveTextContent(`Right: ${i + 1}`);
      const advance = view.getByRole('button', { name: i === 9 ? 'View results' : 'Next final' });
      if (i === 9) {
        expect(view.queryByRole('heading', { name: '10/10 Remembered!' })).toBeNull();
        expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/whod-they-beat', 10, 'Tester', 1);
      }
      fireEvent.click(advance);
    }
    expect(within(view.getByRole('status')).getByRole('heading', { name: '10/10 Remembered!' })).toBeVisible();
    expect(view.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', "10/10 on today's Who'd They Beat?");
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
