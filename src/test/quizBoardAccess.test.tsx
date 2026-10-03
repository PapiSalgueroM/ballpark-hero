import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuizBoard } from '@/components/quiz-board/QuizBoard';
import motion from '@/components/quiz-board/QuizBoard.module.css';
import { fetchQuizBoardClues, VALUES, type Clue } from '@/lib/fetchQuizBoard';
import { useGameCompletion } from '@/hooks/useGameCompletion';

vi.mock('@/lib/fetchQuizBoard', () => ({ VALUES: [200, 400, 600, 800, 1000], fetchQuizBoardClues: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));

const KEY = 'jeopardy-2026-09-30';
const clues = (): Clue[] => VALUES.map(value => ({
  clueId: `fixture-${value}`, category: 'Fictional showcase',
  clue: `Which invented club won the ${value} point showcase?`, answer: `Mosswick ${value}`,
  eventYear: 2025, value,
}));
const draw = () => render(<MemoryRouter><QuizBoard /></MemoryRouter>);
const ready = async (view: ReturnType<typeof render>) => {
  await waitFor(() => expect(view.getByRole('button', { name: 'Fictional showcase, $200' })).toBeEnabled());
};
const open = (view: ReturnType<typeof render>, value = 200) => {
  const button = view.getByRole('button', { name: `Fictional showcase, $${value}` });
  button.focus(); fireEvent.click(button);
  return button;
};
const answer = (view: ReturnType<typeof render>, value: number, guess: string) => {
  open(view, value);
  const dialog = within(view.getByRole('dialog'));
  fireEvent.change(dialog.getByRole('textbox', { name: 'Your answer' }), { target: { value: guess } });
  fireEvent.submit(dialog.getByRole('textbox').closest('form')!);
};
const tick = (ms = 20) => act(() => vi.advanceTimersByTime(ms));
const useClock = () => {
  vi.useRealTimers();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
};
const stored = () => JSON.parse(localStorage.getItem(KEY)!);
const scoreNode = (view: ReturnType<typeof render>) => view.container.querySelector('[data-quiz-score]')!;
const feedbackCells = (view: ReturnType<typeof render>) => view.container.querySelectorAll('[data-quiz-clue][data-quiz-feedback]');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  localStorage.clear();
  vi.mocked(fetchQuizBoardClues).mockResolvedValue(clues());
  vi.mocked(useGameCompletion).mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('actual Sports Quiz Board access and committed feedback', () => {
  it('opens the exact labeled clue and closes for free to its original mounted opener', async () => {
    const view = draw(); await ready(view);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const opener = open(view);
    const dialog = view.getByRole('dialog', { name: 'Fictional showcase · $200' });
    expect(dialog).toHaveAccessibleDescription(clues()[0].clue);
    expect(within(dialog).getByRole('textbox', { name: 'Your answer' })).toHaveFocus();
    expect(within(dialog).getByRole('button', { name: 'Answer' })).toHaveClass('min-h-[44px]');
    expect(within(dialog).getByRole('textbox')).toHaveClass('min-h-[44px]');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByRole('button', { name: 'Fictional showcase, $200' })).toBe(opener);
    expect(scoreNode(view)).toHaveTextContent('$0');
    expect(view.getByText('0/5 answered')).toBeVisible();
    expect(feedbackCells(view)).toHaveLength(0);
    expect(writes).not.toHaveBeenCalled();
  });

  it('uses Escape as a free skip and restores the second exact opener without carrying a guess', async () => {
    const view = draw(); await ready(view);
    const first = open(view);
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'Unsubmitted fixture guess' } });
    fireEvent.keyDown(view.getByRole('textbox'), { key: 'Escape' });
    await waitFor(() => expect(first).toHaveFocus());
    const second = open(view, 400);
    expect(view.getByRole('textbox')).toHaveValue('');
    expect(view.getByRole('dialog')).toHaveAccessibleName('Fictional showcase · $400');
    fireEvent.keyDown(view.getByRole('textbox'), { key: 'Escape' });
    await waitFor(() => expect(second).toHaveFocus());
    expect(scoreNode(view)).toHaveTextContent('$0');
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(view.container.querySelector('[data-quiz-feedback]')).toBeNull();
  });

  it('cues the committed correct and wrong tiles and exact score, saving each original clue once', async () => {
    const view = draw(); await ready(view);
    useClock();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    answer(view, 200, 'Mosswick 200'); tick();
    const correct = view.getByRole('group', { name: 'Fictional showcase, $200, correct' });
    expect(correct).toHaveClass(motion.correct);
    expect(correct).toHaveAttribute('data-quiz-feedback', 'correct');
    expect(correct).toHaveFocus();
    expect(correct).toHaveTextContent('🟩');
    expect(scoreNode(view)).toHaveClass(motion.scoreCorrect);
    expect(scoreNode(view)).toHaveTextContent('$200');
    expect(stored()).toEqual({ results: { 'fixture-200': true }, score: 200 });
    expect(view.queryByRole('button', { name: 'Fictional showcase, $200' })).toBeNull();
    answer(view, 400, 'An incorrect invented answer'); tick();
    const wrong = view.getByRole('group', { name: 'Fictional showcase, $400, wrong' });
    expect(wrong).toHaveClass(motion.wrong);
    expect(wrong).toHaveAttribute('data-quiz-feedback', 'wrong');
    expect(wrong).toHaveFocus();
    expect(wrong).toHaveTextContent('🟥');
    expect(correct).not.toHaveClass(motion.correct);
    expect(scoreNode(view)).toHaveClass(motion.scoreWrong);
    expect(scoreNode(view)).toHaveTextContent('$-200');
    expect(stored()).toEqual({ results: { 'fixture-200': true, 'fixture-400': false }, score: -200 });
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(2);
    expect(view.getByText('2/5 answered')).toBeVisible();
  });

  it('keeps active clones on the same tile and settles without replay, writes or retained timers', async () => {
    const view = draw(); await ready(view);
    useClock();
    answer(view, 200, 'Mosswick 200'); tick();
    const cell = view.getByRole('group', { name: 'Fictional showcase, $200, correct' });
    const score = scoreNode(view);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    tick(180); view.rerender(<MemoryRouter><QuizBoard /></MemoryRouter>);
    expect(view.getByRole('group', { name: 'Fictional showcase, $200, correct' })).toBe(cell);
    expect(scoreNode(view)).toBe(score);
    expect(cell).toHaveClass(motion.correct);
    tick(501);
    expect(cell).not.toHaveClass(motion.correct);
    expect(view.container.querySelector('[data-quiz-feedback]')).toBeNull();
    view.rerender(<MemoryRouter><QuizBoard /></MemoryRouter>);
    expect(view.getByRole('group', { name: 'Fictional showcase, $200, correct' })).toBe(cell);
    expect(cell).not.toHaveClass(motion.correct);
    open(view, 400); fireEvent.keyDown(view.getByRole('textbox'), { key: 'Escape' }); tick();
    expect(view.container.querySelector('[data-quiz-feedback]')).toBeNull();
    expect(writes).not.toHaveBeenCalled();
    answer(view, 600, 'wrong'); tick();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restores partial results and exact score quietly, then cues only the newly committed clue', async () => {
    localStorage.setItem(KEY, JSON.stringify({ results: { 'fixture-200': true, 'fixture-400': false }, score: -200 }));
    const view = draw();
    await waitFor(() => expect(view.getByRole('button', { name: 'Fictional showcase, $600' })).toBeEnabled());
    expect(view.getByRole('group', { name: 'Fictional showcase, $200, correct' })).not.toHaveClass(motion.correct);
    expect(view.getByRole('group', { name: 'Fictional showcase, $400, wrong' })).not.toHaveClass(motion.wrong);
    expect(view.container.querySelector('[data-quiz-feedback]')).toBeNull();
    expect(scoreNode(view)).toHaveTextContent('$-200');
    view.rerender(<MemoryRouter><QuizBoard /></MemoryRouter>);
    expect(view.container.querySelector('[data-quiz-feedback]')).toBeNull();
    answer(view, 600, 'Mosswick 600');
    expect(view.getByRole('group', { name: 'Fictional showcase, $600, correct' })).toHaveClass(motion.correct);
    expect(scoreNode(view)).toHaveTextContent('$400');
    expect(stored()).toEqual({ results: { 'fixture-200': true, 'fixture-400': false, 'fixture-600': true }, score: 400 });
  });

  it('preserves blank-answer matching and a cleared negative score banking and sharing zero', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const view = draw(); await ready(view);
    for (const value of VALUES) answer(view, value, '');
    expect(scoreNode(view)).toHaveTextContent('$-3000');
    expect(view.getByText('5/5 answered')).toBeVisible();
    expect(view.getByRole('heading', { name: 'Board cleared' })).toBeVisible();
    expect(view.container.querySelector('[data-result-score]')).toHaveTextContent('$0');
    expect(view.container.querySelector('[data-result-moment]')).toHaveAttribute('data-result-moment', 'loss');
    expect(stored().score).toBe(-3000);
    expect(stored().results).toEqual(Object.fromEntries(VALUES.map(value => [`fixture-${value}`, false])));
    expect(vi.mocked(useGameCompletion).mock.calls.at(-1)).toEqual(['jeopardy', true, 0, 0]);
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Share result' })); });
    expect(writeText).toHaveBeenCalledExactlyOnceWith('Sports Quiz Board, 2026-09-30\n🟥🟥🟥🟥🟥\n$0\ndouknowball.com/quiz-board');
  });

  it('restores a completed winning board quietly with the original completion and share truth', async () => {
    localStorage.setItem(KEY, JSON.stringify({ results: Object.fromEntries(VALUES.map(value => [`fixture-${value}`, true])), score: 3000 }));
    const view = draw();
    await waitFor(() => expect(view.getByRole('heading', { name: 'Board cleared' })).toBeVisible());
    expect(view.container.querySelector('[data-result-score]')).toHaveTextContent('$3000');
    expect(view.container.querySelector('[data-result-moment]')).toHaveAttribute('data-result-moment', 'win');
    expect(view.getAllByRole('group')).toHaveLength(5);
    expect(view.container.querySelector('[data-quiz-feedback]')).toBeNull();
    expect(view.queryByRole('button', { name: /Fictional showcase, \$/ })).toBeNull();
    expect(vi.mocked(useGameCompletion).mock.calls.at(-1)).toEqual(['jeopardy', true, 3000, 5]);
    view.rerender(<MemoryRouter><QuizBoard /></MemoryRouter>);
    expect(view.container.querySelector('[data-quiz-feedback]')).toBeNull();
  });
});
