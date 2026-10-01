import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { F1ConstructorBoard } from '@/components/f1-constructor/F1ConstructorBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <p>{score}</p> }));
vi.mock('@/components/f1-constructor/F1ConstructorHowToPlay', () => ({ F1ConstructorHowToPlay: () => null }));
vi.mock('@/components/f1-constructor/F1ConstructorSearch', () => ({ F1ConstructorSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture team')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture other')}>Fixture wrong guess</button></div> }));
vi.mock('@/data/f1Constructors', () => {
  const puzzle = { id: 'fixture-team', constructorName: 'Fixture team', commonNames: ['Fixture team'], clues: ['Fixture clue one', 'Fixture clue two', 'Fixture clue three', 'Fixture clue four', 'Fixture clue five', 'Fixture clue six'] };
  return { getDailyF1ConstructorPuzzle: () => puzzle, getRandomF1ConstructorPuzzle: () => puzzle, resolveF1Constructor: (name: string) => ({ id: name === 'Fixture team' ? puzzle.id : 'fixture-other' }) };
});

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-30T16:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const start = (view: ReturnType<typeof render>, daily = false) => fireEvent.click(view.getByRole('button', { name: daily ? /Daily Challenge/ : /Unlimited Mode/ }));
const settle = () => act(() => vi.advanceTimersByTime(800));

describe('constructor committed guess feedback', () => {
  it('never reports a committed winning guess as wrong and preserves first-clue score', () => {
    const view = render(<F1ConstructorBoard />); start(view);
    fireEvent.click(view.getByRole('button', { name: 'Fixture correct guess' }));
    act(() => vi.advanceTimersByTime(60));
    expect(view.queryByText('Wrong guess! Try again...')).toBeNull();
    expect(view.getByText('1000 pts')).toBeVisible();
    expect(view.container.querySelector('[data-constructor-feedback="correct"]')).not.toBeNull();
    expect(view.container.querySelector('[data-constructor-result="won"]')).not.toBeNull();
    settle();
    expect(view.container.querySelector('[data-constructor-feedback]')).toBeNull();
    expect(view.getByText('1000 pts')).toBeVisible();
  });

  it('reacts to each actual wrong guess once, retains clue nodes and then reports the correct score', () => {
    const view = render(<F1ConstructorBoard />); start(view);
    const clue = view.getByText('Fixture clue one');
    const action = view.getByRole('button', { name: 'Fixture wrong guess' });
    fireEvent.click(action);
    const first = view.container.querySelector('[data-constructor-feedback="wrong"]');
    expect(first).not.toBeNull();
    expect(view.getByText(/Clue 2\/6/)).toBeVisible();
    expect(view.getByText('Fixture clue one')).toBe(clue);
    expect(view.getByRole('button', { name: 'Fixture wrong guess' })).toBe(action);
    settle();
    fireEvent.click(action);
    expect(view.container.querySelector('[data-constructor-feedback="wrong"]')).not.toBe(first);
    expect(view.getByText(/Clue 3\/6/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Fixture correct guess' }));
    expect(view.container.querySelector('[data-constructor-feedback="wrong"]')).toBeNull();
    expect(view.getByText('600 pts')).toBeVisible();
  });

  it('keeps hints and unchanged rerenders quiet, without replaying or extending a committed cue', () => {
    const view = render(<F1ConstructorBoard />); start(view);
    fireEvent.click(view.getByRole('button', { name: /Hint/ }));
    expect(view.container.querySelector('[data-constructor-feedback]')).toBeNull();
    expect(view.getByText(/Clue 2\/6/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Fixture wrong guess' }));
    const cue = view.container.querySelector('[data-constructor-feedback]');
    act(() => vi.advanceTimersByTime(300)); view.rerender(<F1ConstructorBoard />);
    expect(view.container.querySelector('[data-constructor-feedback]')).toBe(cue);
    act(() => vi.advanceTimersByTime(500));
    expect(view.container.querySelector('[data-constructor-feedback]')).toBeNull();
    view.rerender(<F1ConstructorBoard />);
    expect(view.container.querySelector('[data-constructor-feedback]')).toBeNull();
  });

  it('keeps a restored completed daily readable and quiet', () => {
    const view = render(<F1ConstructorBoard />); start(view, true);
    fireEvent.click(view.getByRole('button', { name: 'Fixture correct guess' }));
    expect(JSON.parse(localStorage.getItem('f1-constructor-daily-2026-09-30')!).gameStatus).toBe('won');
    view.unmount();
    const restored = render(<F1ConstructorBoard />); start(restored, true);
    expect(restored.getByText('1000 pts')).toBeVisible();
    expect(restored.container.querySelector('[data-constructor-feedback]')).toBeNull();
    expect(restored.container.querySelector('[data-constructor-result]')).toBeNull();
    settle();
    expect(restored.queryByText('Wrong guess! Try again...')).toBeNull();
  });

  it('reports the final wrong guess without changing the zero-score loss', () => {
    const view = render(<F1ConstructorBoard />); start(view);
    for (let index = 0; index < 6; index++) fireEvent.click(view.getByRole('button', { name: 'Fixture wrong guess' }));
    expect(view.container.querySelector('[data-constructor-feedback="wrong"]')).not.toBeNull();
    expect(view.container.querySelector('[data-constructor-result="lost"]')).not.toBeNull();
    expect(view.getByText('It was Fixture team')).toBeVisible();
    expect(view.queryByText(/pts$/)).toBeNull();
    settle();
    expect(view.container.querySelector('[data-constructor-result]')).toBeNull();
    expect(view.getByText('It was Fixture team')).toBeVisible();
  });

  it('clears reactions on reset and unmount without stale delayed work', () => {
    const view = render(<F1ConstructorBoard />); start(view);
    fireEvent.click(view.getByRole('button', { name: 'Fixture correct guess' }));
    fireEvent.click(view.getByRole('button', { name: 'Play Again' }));
    expect(view.container.querySelector('[data-constructor-feedback]')).toBeNull();
    settle(); start(view);
    expect(view.container.querySelector('[data-constructor-feedback]')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Fixture wrong guess' }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not call a give-up decision a guessed answer', () => {
    const view = render(<F1ConstructorBoard />); start(view);
    fireEvent.click(view.getByRole('button', { name: 'Fixture wrong guess' })); settle();
    fireEvent.click(view.getByRole('button', { name: /^🏳️ Give Up$/ }));
    fireEvent.click(view.getByRole('button', { name: 'Yes, Give Up' }));
    expect(view.container.querySelector('[data-constructor-feedback]')).toBeNull();
    expect(view.container.querySelector('[data-constructor-result]')).toBeNull();
    expect(view.getByText('It was Fixture team')).toBeVisible();
  });
});
