import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { F1DriverBoard } from '@/components/f1-driver/F1DriverBoard';
import { recordCompletion } from '@/lib/completions';
import { POINTS_BY_CLUE } from '@/types/f1Driver';
import type { F1DriverPuzzle } from '@/types/f1Driver';

const fixture = vi.hoisted(() => ({
  puzzle: { id: 'fiction-hint-racer', driverName: 'Fixture Racer', commonNames: ['Fixture Racer'], clues: ['Generated first clue', 'Generated second clue', 'Generated third clue', 'Generated fourth clue', 'Generated fifth clue', 'Generated sixth clue'] },
  clipboard: vi.fn(async (_text: string) => {}),
  authored: null as F1DriverPuzzle | null,
}));
vi.mock('@/data/f1Drivers', () => ({ getDailyF1Puzzle: () => fixture.authored ?? fixture.puzzle, getRandomF1Puzzle: () => fixture.authored ?? fixture.puzzle,
  resolveF1Driver: (name: string) => ({ id: name === 'Fixture Racer' ? fixture.puzzle.id : 'fiction-other' }) }));
vi.mock('@/components/f1-driver/F1DriverSearch', () => ({ F1DriverSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture Racer')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const mount = () => render(<MemoryRouter><F1DriverBoard /></MemoryRouter>);
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const key = 'f1-driver-daily-2026-10-01';
const exact = (clues: number, guesses: string[], score: number) => ({ puzzleId: fixture.puzzle.id, revealedClues: clues, guesses, gameStatus: 'won', score, v: 1, date: '2026-10-01' });
const card = (clues: number, score: number) => `🏎️ Guess The F1 Driver: Oct 1, 2026\nScore: I guessed today's F1 Driver in ${clues} clue${clues > 1 ? 's' : ''}!\nScore: ${score} 🏎️\ndouknowball.com/f1-driver`;
beforeEach(() => { fixture.authored = null; localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('actual F1 driver hint points and help', () => {
  it.each([1, 2, 3, 4, 5])('advertises original next payout from clue %i', clue => {
    const view = mount(); click(view, /Daily Challenge/);
    for (let i = 1; i < clue; i++) click(view, 'Fixture wrong guess');
    tick(650);
    const score = POINTS_BY_CLUE[clue];
    expect(view.getByText(`Clue ${clue}/6 · ${POINTS_BY_CLUE[clue - 1]} pts available`)).toBeVisible();
    const hint = view.getByRole('button', { name: /Hint/ }); expect(hint).toHaveTextContent(`💡 Hint (${score} pts next)`); fireEvent.click(hint);
    expect(view.getByText(`Clue ${clue + 1}/6 · ${score} pts available`)).toBeVisible();
    expect(view.getByText('1 hint used')).toBeVisible();
    expect(view.container.querySelector('[data-f1-driver-feedback]')).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
    click(view, 'Fixture correct guess');
    expect(view.getByText(`${score} pts`)).toBeVisible();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(exact(clue + 1, [...Array(clue - 1).fill('Fixture Other'), 'Fixture Racer'], score));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', score, 'FixtureBaller', 0);
    click(view, /Copy Score Card/); expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(card(clue + 1, score));
  });

  it('counts mixed misses and hints without inventing a flat penalty', () => {
    const view = mount(); click(view, /Daily Challenge/); click(view, 'Fixture wrong guess'); tick(650);
    click(view, '💡 Hint (600 pts next)'); click(view, 'Fixture wrong guess'); tick(650); click(view, '💡 Hint (200 pts next)');
    expect(view.getByText(/hints used/)).toHaveTextContent(/^2 hints used$/); expect(view.queryByText(/used \(-/)).toBeNull();
    expect(view.getByText('Clue 5/6 · 200 pts available')).toBeVisible();
    expect(view.container.querySelector('[data-f1-driver-feedback]')).toBeNull();
    click(view, 'Fixture correct guess'); expect(view.getByText('200 pts')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(exact(5, ['Fixture Other', 'Fixture Other', 'Fixture Racer'], 200));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', 200, 'FixtureBaller', 0);
    click(view, /Copy Score Card/); expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(card(5, 200));
  });

  it('hides the max clue hint and keeps all five hint actions quiet', () => {
    const view = mount(); click(view, /Unlimited Mode/);
    for (const score of [800, 600, 400, 200, 100]) click(view, `💡 Hint (${score} pts next)`);
    expect(view.getByText('5 hints used')).toBeVisible(); expect(view.getByText('Clue 6/6 · 100 pts available')).toBeVisible();
    expect(view.queryByRole('button', { name: /Hint/ })).toBeNull(); expect(view.container.querySelector('[data-f1-driver-feedback]')).toBeNull();
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    click(view, 'Fixture correct guess'); expect(view.getByText('100 pts')).toBeVisible();
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', 100, 'FixtureBaller', 0);
  });

  it('shows an actual tier worked example and returns help focus without scrolling', () => {
    const view = mount(), help = view.getByRole('button', { name: 'How to Play' }); help.focus();
    expect(help).toHaveClass('min-h-[44px]'); click(view, 'How to Play');
    const dialog = view.getByRole('dialog', { name: 'How to Play' });
    expect(dialog).toHaveTextContent('Fictional example: you have 1,000 points available. Take one hint and a correct guess is worth 800 points. At clue 6, it is worth 100.');
    expect(dialog).toHaveTextContent('Daily challenge gives everyone the same driver.');
    const focus = vi.spyOn(help, 'focus'); fireEvent.keyDown(document, { key: 'Escape' }); tick(0);
    expect(view.queryByRole('dialog')).toBeNull(); expect(help).toHaveFocus(); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('labels the original authored clue strings neutrally in their original order', async () => {
    const original = await vi.importActual<typeof import('@/data/f1Drivers')>('@/data/f1Drivers');
    const before = JSON.stringify(original.F1_DRIVERS); fixture.authored = original.getDailyF1Puzzle();
    const view = mount(); click(view, /Daily Challenge/);
    for (const score of [800, 600, 400, 200, 100]) click(view, `💡 Hint (${score} pts next)`);
    const clues = [...view.container.querySelectorAll('[data-f1-driver-clue]')];
    expect(clues).toHaveLength(fixture.authored.clues.length);
    clues.forEach((card, i) => { expect(card.querySelector('span')).toHaveTextContent(`Clue ${i + 1}`); expect(card.querySelector('p')?.textContent).toBe(fixture.authored!.clues[i]); });
    expect(JSON.stringify(original.F1_DRIVERS)).toBe(before); expect(recordCompletion).not.toHaveBeenCalled();
    expect(view.getByText('Clue 6/6 · 100 pts available')).toBeVisible();
  });

  it('holds independent original six payouts save full share and once completion', () => {
    expect(POINTS_BY_CLUE).toEqual([1000, 800, 600, 400, 200, 100]);
    for (let clue = 1; clue <= 6; clue++) {
      localStorage.clear(); vi.clearAllMocks(); const view = mount(); click(view, /Daily Challenge/);
      for (let i = 1; i < clue; i++) click(view, 'Fixture wrong guess');
      click(view, 'Fixture correct guess'); const score = POINTS_BY_CLUE[clue - 1];
      expect(view.getByText(`${score} pts`)).toBeVisible(); expect(JSON.parse(localStorage.getItem(key)!)).toEqual(exact(clue, [...Array(clue - 1).fill('Fixture Other'), 'Fixture Racer'], score));
      expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', score, 'FixtureBaller', 0); click(view, /Copy Score Card/); expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(card(clue, score));
      tick(650); expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
    }
  });
});
