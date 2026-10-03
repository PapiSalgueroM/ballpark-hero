import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BallIqBoard } from '@/components/ball-iq/BallIqBoard';
import { useBallIq } from '@/hooks/useBallIq';
import { recordCompletion } from '@/lib/completions';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import styles from '@/components/ball-iq/BallIqFeedback.module.css';

const fixture = vi.hoisted(() => ({ bank: [200, 400, 600, 800, 1000].flatMap(value => Array.from({ length: 6 }, (_, i) => ({
  clueId: `fixture-${value}-${i}`, category: 'Fixture category', clue: `Fixture question ${value}-${i}`,
  answer: `Fixture answer ${value}-${i}` + (i === 0 ? 'UnbrokenFixtureAnswer'.repeat(8) : ''), eventYear: 2000 + i,
  value: value as 200 | 400 | 600 | 800 | 1000,
}))) }));
vi.mock('@/lib/fetchQuizBoard', () => ({ fetchQuizBoardClues: async () => fixture.bank }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));

const key = 'ball-iq-2026-10-02';
const element = () => <MemoryRouter><BallIqBoard /></MemoryRouter>;
const mount = async () => { const view = render(element()); await act(async () => {}); return view; };
const saved = () => JSON.parse(localStorage.getItem(key)!) as { chosen: (string | null)[]; index: number };
const question = (view: ReturnType<typeof render>) => fixture.bank.find(q => view.queryByText(q.clue))!;
const choose = (view: ReturnType<typeof render>, right = true) => {
  const q = question(view);
  const options = view.getAllByRole('button').filter(button => button.textContent?.startsWith('Fixture answer'));
  const option = right ? options.find(button => button.textContent === q.answer)! : options.find(button => button.textContent !== q.answer)!;
  option.focus(); fireEvent.click(option); return { q, option };
};
const advance = (view: ReturnType<typeof render>) => fireEvent.click(view.getByRole('button', { name: /Next question|See my IQ/ }));
const settle = () => act(() => { vi.advanceTimersByTime(700); });
const moment = (view: ReturnType<typeof render>) => view.container.querySelector('[data-result-moment]')?.getAttribute('data-result-moment');
/* The result card's emoji grid block (ResultScreen draws it aria-hidden in a mono face). */
const grid = (view: ReturnType<typeof render>) => view.container.querySelector('[role="status"] > div[aria-hidden="true"].font-mono')?.textContent;

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); consumeRestoredFinish('ball-iq');
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-02T16:00:00Z'));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); consumeRestoredFinish('ball-iq'); });

describe('Ball IQ committed answer feedback', () => {
  it('matches the original twelve-question score save share and once-only completion', async () => {
    const { result } = renderHook(() => useBallIq()); await act(async () => {});
    expect(result.current.questions).toHaveLength(12);
    expect(result.current.questions.map(q => q.clue.value)).toEqual([200, 200, 200, 400, 400, 400, 600, 600, 800, 800, 1000, 1000]);
    const chosen: (string | null)[] = Array(12).fill(null);
    for (let i = 0; i < 12; i++) {
      const q = result.current.current!;
      const option = i % 2 === 0 ? q.clue.answer : q.options.find(opt => opt !== q.clue.answer)!;
      act(() => result.current.answer(option)); chosen[i] = option;
      expect(saved()).toEqual({ chosen, index: i });
      expect(recordCompletion).not.toHaveBeenCalled();
      act(() => result.current.next());
    }
    expect(saved()).toEqual({ chosen, index: 12 });
    expect(result.current.iq).toBe(106); expect(result.current.correctCount).toBe(6);
    expect(result.current.shareText).toBe('Ball Knowledge IQ, 2026-10-02\n🟩🟥🟩🟥🟩🟥🟩🟥🟩🟥🟩🟥\nIQ 106 · Solid ball knowledge\ndouknowball.com/ball-iq');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/ball-iq', 1060, 'FixtureBaller', 6);
  });

  it('announces a correct submitted answer and reveals the actual answer', async () => {
    const view = await mount(); const { q, option } = choose(view);
    const outcome = view.container.querySelector('[data-ball-iq-outcome="correct"]');
    expect(outcome).not.toBeNull();
    expect(outcome).toHaveTextContent('Correct.'); expect(outcome).toHaveTextContent(q.answer);
    expect(view.getByRole('status')).toHaveTextContent(`Correct. ${q.answer}. 1 of 12 answered, 1 correct.`);
    expect(outcome).toHaveClass(styles.correct, styles.reveal);
    expect(option).toBeDisabled(); expect(view.getByRole('button', { name: 'Next question' })).toBeEnabled();
    expect(saved().chosen[0]).toBe(q.answer); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('reveals the actual correct answer after a miss without adding correct credit', async () => {
    const view = await mount(); const { q, option } = choose(view, false);
    const outcome = view.container.querySelector('[data-ball-iq-outcome="wrong"]');
    expect(outcome).not.toBeNull();
    expect(outcome).toHaveTextContent('Not quite.'); expect(outcome).toHaveTextContent(q.answer);
    expect(view.getByRole('status')).toHaveTextContent(`Not quite. The answer is ${q.answer}. 1 of 12 answered, 0 correct.`);
    expect(outcome).toHaveClass(styles.wrong, styles.reveal);
    expect(view.getByText('1/12 answered · 0 correct')).toBeVisible();
    expect(option).toBeDisabled(); expect(saved().chosen[0]).toBe(option.textContent?.replace('Your pick', '').trim());
    settle(); expect(outcome).toHaveTextContent(q.answer); expect(saved().index).toBe(0);
  });

  it('counts submitted answers immediately and keeps progress stable on Next', async () => {
    const view = await mount(); expect(view.getByText('0/12 answered · 0 correct')).toBeVisible();
    choose(view);
    expect(view.getByText('1/12 answered · 1 correct')).toBeVisible();
    expect(view.getByRole('progressbar', { name: 'Questions answered' })).toHaveAttribute('aria-valuenow', '1');
    expect(view.container.querySelector('[data-ball-iq-progress="0"]')).toHaveAttribute('data-answer-state', 'correct');
    expect(view.container.querySelector('[data-ball-iq-progress="0"]')).toHaveClass('bg-emerald-500');
    advance(view);
    expect(view.getByText('1/12 answered · 1 correct')).toBeVisible();
    expect(view.getByRole('progressbar', { name: 'Questions answered' })).toHaveAttribute('aria-valuenow', '1');
    choose(view, false);
    expect(view.getByText('2/12 answered · 1 correct')).toBeVisible();
    expect(view.container.querySelector('[data-ball-iq-progress="1"]')).toHaveAttribute('data-answer-state', 'wrong');
    expect(view.container.querySelector('[data-ball-iq-progress="1"]')).toHaveClass('bg-destructive');
    expect(saved().index).toBe(1);
  });

  it('focuses the exact enabled Next action after answers and ignores held activation keys', async () => {
    const view = await mount(); choose(view);
    const next = view.getByRole('button', { name: 'Next question' });
    expect(next).toHaveFocus(); expect(next).toBeEnabled();
    expect(fireEvent.keyDown(next, { key: 'Enter', repeat: true })).toBe(false);
    expect(fireEvent.keyDown(next, { key: ' ', repeat: true })).toBe(false);
    expect(saved().index).toBe(0); fireEvent.click(next);
    choose(view, false); expect(view.getByRole('button', { name: 'Next question' })).toHaveFocus();
    expect(saved().index).toBe(1);
  });

  it('restores an answered daily quietly without replacing external focus', async () => {
    let view = await mount(); const { q } = choose(view); cleanup();
    const external = document.createElement('button'); document.body.append(external); external.focus();
    view = await mount();
    expect(view.container.querySelector('[data-ball-iq-outcome="correct"]')).toHaveTextContent(q.answer);
    expect(view.container.querySelector('[data-ball-iq-cue]')).toBeNull();
    expect(view.getByRole('status')).toBeEmptyDOMElement(); expect(external).toHaveFocus();
    expect(view.getByText('1/12 answered · 1 correct')).toBeVisible();
    expect(recordCompletion).not.toHaveBeenCalled(); external.remove();
  });

  it('keeps cue and element identity through clones then settles without erasing the outcome', async () => {
    const view = await mount(); const { q, option } = choose(view);
    const outcome = view.container.querySelector('[data-ball-iq-cue]')!;
    const next = view.getByRole('button', { name: 'Next question' });
    view.rerender(element());
    expect(view.container.querySelector('[data-ball-iq-cue]')).toBe(outcome);
    expect(option.isConnected).toBe(true); expect(view.getByRole('button', { name: 'Next question' })).toBe(next);
    act(() => { vi.advanceTimersByTime(300); }); view.rerender(element());
    act(() => { vi.advanceTimersByTime(350); });
    expect(view.container.querySelector('[data-ball-iq-cue]')).toBeNull();
    expect(outcome).not.toHaveClass(styles.reveal); expect(outcome).toHaveTextContent(q.answer);
    expect(view.getByRole('status')).toBeEmptyDOMElement(); expect(next).toHaveFocus();
  });

  it('cancels its owned answer emphasis timer on unmount', async () => {
    const view = await mount();
    const scheduled = vi.spyOn(window, 'setTimeout'), cleared = vi.spyOn(window, 'clearTimeout');
    choose(view);
    const ownTimers = scheduled.mock.calls.map((args, i) => ({ delay: args[1], id: scheduled.mock.results[i].value })).filter(timer => timer.delay === 600);
    expect(ownTimers).toHaveLength(1); view.unmount(); expect(cleared).toHaveBeenCalledWith(ownTimers[0].id);
    settle(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps the first accepted answer locked through synchronous duplicate input', async () => {
    const view = await mount(), q = question(view);
    const right = view.getByRole('button', { name: q.answer });
    const wrong = view.getAllByRole('button').find(button => button.textContent?.startsWith('Fixture answer') && button.textContent !== q.answer)!;
    right.focus(); act(() => { fireEvent.click(right); fireEvent.click(wrong); });
    expect(saved().chosen[0]).toBe(q.answer); expect(saved().index).toBe(0);
    fireEvent.click(wrong); fireEvent.click(right);
    expect(saved().chosen[0]).toBe(q.answer); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('finishes all twelve with the original perfect score save and quiet replay', async () => {
    let view = await mount(); const chosen: string[] = [];
    for (let i = 0; i < 12; i++) {
      chosen.push(choose(view).q.answer);
      expect(saved().index).toBe(i); expect(recordCompletion).not.toHaveBeenCalled(); advance(view);
    }
    expect(view.getByText('160')).toBeVisible(); expect(view.getByText('12/12 correct')).toBeVisible();
    expect(saved()).toEqual({ chosen, index: 12 });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/ball-iq', 1600, 'FixtureBaller', 12);
    /* Round 951: finished here, so the moment plays: a win, not settled. */
    expect(moment(view)).toBe('win'); expect(view.container.querySelector('[data-result-settled]')).toBeNull();
    cleanup(); view = await mount();
    expect(view.getByText('160')).toBeVisible(); expect(view.container.querySelector('[data-ball-iq-cue]')).toBeNull();
    /* Reopened: the same win, shown settled, so no reveal and no confetti replay. */
    expect(moment(view)).toBe('win'); expect(view.container.querySelector('[data-result-settled]')).not.toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('walks every rank band onto its result state with the exact squares on the card', async () => {
    const { result, unmount } = renderHook(() => useBallIq()); await act(async () => {});
    const qs = result.current.questions; unmount();
    /* values run 200 x3, 400 x3, 600 x2, 800 x2, 1000 x2 (6600 in all); IQ is 55 + 105 * earned / 6600 */
    const ladder: Array<[number[], number, string, string]> = [
      [[], 55, 'Does not know ball', 'loss'],
      [[10], 71, 'Knows of ball', 'loss'],
      [[10, 11], 87, 'Casual', 'close'],
      [[10, 11, 8, 0], 103, 'Casual', 'close'],
      [[10, 11, 8, 3], 106, 'Solid ball knowledge', 'win'],
      [[6, 7, 8, 9, 10, 11], 131, 'Knows ball', 'win'],
      [qs.map((_, i) => i), 160, 'Certified ball knower', 'win'],
    ];
    for (const [rightAt, iq, rank, state] of ladder) {
      const right = new Set(rightAt);
      const chosen = qs.map((q, i) => right.has(i) ? q.clue.answer : q.options.find(option => option !== q.clue.answer)!);
      localStorage.setItem(key, JSON.stringify({ chosen, index: 12 }));
      const view = await mount();
      expect(view.container.querySelector('[data-result-score]')).toHaveTextContent(String(iq));
      expect(view.getByRole('heading', { name: rank })).toBeVisible();
      expect(moment(view)).toBe(state);
      expect(view.container.querySelector('[data-result-settled]')).not.toBeNull();
      expect(grid(view)).toBe(qs.map((_, i) => right.has(i) ? '🟩' : '🟥').join(''));
      cleanup(); consumeRestoredFinish('ball-iq');
    }
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('binds readable answer text and finite reduced-motion rules to actual feedback', async () => {
    const view = await mount(); const { option } = choose(view);
    expect(option).toHaveClass(styles.fullText);
    expect(view.container.querySelector('[data-ball-iq-cue]')).toHaveClass(styles.reveal);
    const cssFile = process.env.BALL_IQ_FEEDBACK_CSS || path.resolve('src/components/ball-iq/BallIqFeedback.module.css');
    const css = readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.fullText\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/animation:\s*answerReveal\s+420ms\s+ease-out\s+1\s*;/);
    expect(css).not.toMatch(/infinite/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.reveal\s*\{\s*animation:\s*none/);
  });
});
