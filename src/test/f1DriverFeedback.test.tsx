import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { F1DriverBoard } from '@/components/f1-driver/F1DriverBoard';
import { recordCompletion } from '@/lib/completions';
import { POINTS_BY_CLUE } from '@/types/f1Driver';
import styles from '@/components/f1-driver/F1DriverFeedback.module.css';

const fixture = vi.hoisted(() => ({
  puzzle: { id: 'fiction-racer', driverName: 'Fixture Racer', commonNames: ['Fixture Racer'], clues: ['Generated first clue', 'Generated second clue', 'Generated third clue', 'Generated fourth clue', 'Generated fifth clue', 'Generated sixth clue'] },
  clipboard: vi.fn(async (_text: string) => {}),
}));
vi.mock('@/data/f1Drivers', () => ({ getDailyF1Puzzle: () => fixture.puzzle, getRandomF1Puzzle: () => fixture.puzzle,
  resolveF1Driver: (name: string) => ({ id: name === 'Fixture Racer' ? fixture.puzzle.id : 'fiction-other' }) }));
vi.mock('@/components/f1-driver/F1DriverSearch', () => ({ F1DriverSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture Racer')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/f1-driver/F1DriverHowToPlay', () => ({ F1DriverHowToPlay: () => null }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const board = () => <MemoryRouter><F1DriverBoard /></MemoryRouter>;
const mount = () => render(board());
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const start = (view: ReturnType<typeof render>, daily = false) => click(view, daily ? /Daily Challenge/ : /Unlimited Mode/);
const correct = (view: ReturnType<typeof render>) => click(view, 'Fixture correct guess');
const wrong = (view: ReturnType<typeof render>) => click(view, 'Fixture wrong guess');
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cue = (view: ReturnType<typeof render>) => view.container.querySelector<HTMLElement>('[data-f1-driver-feedback]');
const result = (view: ReturnType<typeof render>) => view.container.querySelector<HTMLElement>('[data-f1-driver-result]');
const saved = () => JSON.parse(localStorage.getItem('f1-driver-daily-2026-10-01')!);
const exactSaved = (clues: number, guesses: string[], status: string, score: number) => ({ puzzleId: fixture.puzzle.id, revealedClues: clues, guesses, gameStatus: status, score, v: 1, date: '2026-10-01' });

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('actual F1 driver committed feedback', () => {
  it('never calls a committed first-clue win wrong at the old delayed boundary', () => {
    const view = mount(); start(view, true); correct(view);
    expect(view.getByText('1,000 pts')).toBeVisible(); expect(cue(view)).toHaveAttribute('data-f1-driver-feedback', 'correct');
    expect(result(view)).toHaveAttribute('data-f1-driver-result', 'won'); expect(result(view)).toHaveClass(styles.won);
    tick(50); expect(view.queryByText('Wrong guess! Try again...')).toBeNull(); expect(cue(view)).toHaveTextContent('Correct guess. Driver found.');
    expect(saved()).toEqual(exactSaved(1, ['Fixture Racer'], 'won', 1000)); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', 1000, 'FixtureBaller', 0);
    tick(550); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull(); expect(view.getByText('1,000 pts')).toBeVisible();
  });

  it('cues each actual repeated wrong append while preserving stable clues and the600 win', () => {
    const view = mount(); start(view, true); const nodes = [...view.container.querySelectorAll('[data-f1-driver-clue]')];
    const action = view.getByRole('button', { name: 'Fixture wrong guess' }); wrong(view);
    const first = cue(view); expect(first).toHaveAttribute('data-f1-driver-feedback', 'wrong'); expect(first).toHaveClass(styles.reply);
    expect(view.getByText(/Clue 2\/6/)).toBeVisible(); tick(600); expect(cue(view)).toBeNull(); wrong(view);
    expect(cue(view)).toHaveAttribute('data-f1-driver-feedback', 'wrong'); expect(cue(view)).not.toBe(first);
    expect(view.getByRole('button', { name: 'Fixture wrong guess' })).toBe(action);
    expect(saved()).toEqual(exactSaved(3, ['Fixture Other', 'Fixture Other'], 'playing', 0));
    correct(view); expect(cue(view)).toHaveAttribute('data-f1-driver-feedback', 'correct'); expect(view.getByText('600 pts')).toBeVisible();
    [...view.container.querySelectorAll('[data-f1-driver-clue]')].forEach((node, i) => expect(node).toBe(nodes[i]));
    expect(saved()).toEqual(exactSaved(3, ['Fixture Other', 'Fixture Other', 'Fixture Racer'], 'won', 600));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', 600, 'FixtureBaller', 0);
  });

  it('keeps hints and unchanged clones quiet without restarting a live cue', () => {
    const view = mount(); start(view); click(view, /Hint/); expect(cue(view)).toBeNull(); expect(view.getByText(/Clue 2\/6/)).toBeVisible();
    wrong(view); const reply = cue(view); tick(300); view.rerender(board()); expect(cue(view)).toBe(reply);
    tick(300); expect(cue(view)).toBeNull(); view.rerender(board()); tick(50); expect(cue(view)).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
  });

  it('restores completed and partial dailies quietly without paying a restored finish', () => {
    localStorage.setItem('f1-driver-daily-2026-10-01', JSON.stringify(exactSaved(3, ['Fixture Other', 'Fixture Other', 'Fixture Racer'], 'won', 600)));
    const raw = localStorage.getItem('f1-driver-daily-2026-10-01'), view = mount(); start(view, true); tick(800);
    expect(view.getByText('600 pts')).toBeVisible(); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    expect(localStorage.getItem('f1-driver-daily-2026-10-01')).toBe(raw); view.unmount();
    localStorage.setItem('f1-driver-daily-2026-10-01', JSON.stringify(exactSaved(2, ['Fixture Other'], 'playing', 0)));
    const partial = mount(); start(partial, true); expect(cue(partial)).toBeNull(); correct(partial);
    expect(partial.getByText('800 pts')).toBeVisible(); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', 800, 'FixtureBaller', 0);
  });

  it('reports the exhausted last miss truthfully and preserves exact zero-score loss', () => {
    const view = mount(); start(view, true); for (let i = 0; i < 6; i++) wrong(view);
    expect(cue(view)).toHaveAttribute('data-f1-driver-feedback', 'wrong'); expect(cue(view)).toHaveTextContent('Wrong guess. The answer is below.');
    expect(view.queryByText('Wrong guess! Try again...')).toBeNull(); expect(result(view)).toHaveClass(styles.lost);
    expect(view.getByText('It was Fixture Racer')).toBeVisible(); expect(saved()).toEqual(exactSaved(6, Array(6).fill('Fixture Other'), 'lost', 0));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', 0, 'FixtureBaller', 0); tick(600); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull();
  });

  it('clears reset and unmount timers rather than leaking delayed wrong work', () => {
    const view = mount(); start(view); correct(view); expect(vi.getTimerCount()).toBe(1); click(view, 'Play Again');
    expect(vi.getTimerCount()).toBe(0); tick(800); start(view); expect(cue(view)).toBeNull(); wrong(view); expect(vi.getTimerCount()).toBe(1);
    view.unmount(); expect(vi.getTimerCount()).toBe(0); tick(800);
  });

  it('keeps immediate give-up decisions separate from an active wrong-guess cue', () => {
    const view = mount(); start(view, true); wrong(view); tick(100); expect(cue(view)).toHaveAttribute('data-f1-driver-feedback', 'wrong');
    click(view, /^🏳️ Give Up$/); click(view, 'Cancel'); expect(cue(view)).toHaveAttribute('data-f1-driver-feedback', 'wrong'); expect(recordCompletion).not.toHaveBeenCalled();
    click(view, /^🏳️ Give Up$/); click(view, 'Yes, Give Up'); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull();
    expect(saved()).toEqual(exactSaved(2, ['Fixture Other'], 'lost', 0)); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', 0, 'FixtureBaller', 0);
  });

  it('binds complete previous-guess text to the owned wrapping rule', () => {
    const view = mount(); start(view); wrong(view);
    const name = view.getByText('Fixture Other'); expect(name).toHaveClass(styles.guessName); expect(name.textContent).toBe('Fixture Other');
    const css = readFileSync(process.env.F1_DRIVER_FEEDBACK_CSS || path.resolve('src/components/f1-driver/F1DriverFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.guessName\s*\{\s*min-width:\s*0;\s*max-width:\s*100%;\s*overflow-wrap:\s*anywhere;/);
  });

  it('binds finite once-only cues with a static reduced-motion override', () => {
    const css = readFileSync(process.env.F1_DRIVER_FEEDBACK_CSS || path.resolve('src/components/f1-driver/F1DriverFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.reply\s*\{\s*animation:\s*guessReply 420ms ease-out 1;/);
    expect(css).toMatch(/\.won\s*\{\s*animation:\s*driverWon 420ms ease-out 1;/); expect(css).toMatch(/\.lost\s*\{\s*animation:\s*driverLost 420ms ease-out 1;/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.reply,\s*\.won,\s*\.lost\s*\{\s*animation:\s*none;/);
    const view = mount(); start(view); wrong(view); expect(cue(view)).toHaveClass(styles.reply);
  });

  it('holds independent original six-clue points exact saves full shares and once completion', async () => {
    expect(POINTS_BY_CLUE).toEqual([1000, 800, 600, 400, 200, 100]);
    for (let misses = 0; misses < 6; misses++) {
      localStorage.clear(); vi.mocked(recordCompletion).mockClear(); fixture.clipboard.mockClear(); const view = mount(); start(view, true);
      for (let i = 0; i < misses; i++) wrong(view); correct(view); const clues = misses + 1, score = [1000, 800, 600, 400, 200, 100][misses];
      expect(view.getByText(`${score} pts`)).toBeVisible(); expect(saved()).toEqual(exactSaved(clues, [...Array(misses).fill('Fixture Other'), 'Fixture Racer'], 'won', score));
      expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/f1-driver', score, 'FixtureBaller', 0);
      await act(async () => { click(view, '📋 Copy Score Card'); });
      expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(`🏎️ Guess The F1 Driver: Oct 1, 2026\nScore: I guessed today's F1 Driver in ${clues} clue${clues > 1 ? 's' : ''}!\nScore: ${score} 🏎️\ndouknowball.com/f1-driver`);
      view.rerender(board()); tick(800); expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
    }
  });
});
