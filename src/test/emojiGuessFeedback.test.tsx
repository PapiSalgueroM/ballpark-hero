import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import EmojiGuess from '@/pages/EmojiGuess';
import { pickDaily, useEmojiGuess } from '@/hooks/useEmojiGuess';
import { recordCompletion } from '@/lib/completions';
import { loadGameContent } from '@/data/gameContent/loader';
import styles from '@/components/emoji-guess/EmojiGuessFeedback.module.css';

const fixture = vi.hoisted(() => ({
  bank: Array.from({ length: 5 }, (_, i) => ({ id: 'fixture-' + i, emoji: '⚽🧩', answer: i === 0 ? 'Fíxture Áster' : i === 1 ? 'Fixture' + 'UnbrokenFullAnswer'.repeat(5) : 'Fixture Answer ' + i,
    aliases: ['fixture alias ' + i], category: 'player' as const, difficulty: i < 2 ? 'easy' as const : i < 4 ? 'medium' as const : 'hard' as const, hint: 'Fixture hint for puzzle ' + i })),
  clipboard: vi.fn(async (_text: string) => {}),
}));
vi.mock('@/data/emojiPuzzles', () => ({ EMOJI_PUZZLES: fixture.bank, MIN_BANK_SIZE: 5 }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

const key = 'emoji-guess-2026-10-01';
const element = () => <MemoryRouter initialEntries={['/emoji-guess']}><HelmetProvider><EmojiGuess /></HelmetProvider></MemoryRouter>;
const mount = async () => { const view = render(element()); await act(async () => {}); return view; };
const input = (view: ReturnType<typeof render>) => view.getByRole('textbox', { name: 'Who or what is this' });
const submit = (view: ReturnType<typeof render>, value: string) => {
  fireEvent.change(input(view), { target: { value } });
  fireEvent.submit(input(view).closest('form')!);
};
const saved = () => JSON.parse(localStorage.getItem(key)!) as { guesses: string[][]; index: number };
const activeCue = (view: ReturnType<typeof render>, kind: string) => view.container.querySelector(`[data-emoji-cue="${kind}"]`);
const settle = () => act(() => { vi.advanceTimersByTime(700); });
const complete = (view: ReturnType<typeof render>) => {
  const puzzles = pickDaily('2026-10-01');
  const guesses: string[][] = [];
  for (let i = 0; i < puzzles.length; i += 1) {
    const row = [...Array.from({ length: i === 1 ? 1 : i === 2 ? 2 : i === 3 ? 3 : 0 }, () => 'Fixture miss')];
    if (i !== 3) row.push(puzzles[i].aliases[0]);
    for (const answer of row) submit(view, answer);
    guesses.push(row);
    fireEvent.click(view.getByRole('button', { name: i === 4 ? 'See result' : 'Next puzzle' }));
  }
  return guesses;
};

beforeAll(async () => { await loadGameContent('/emoji-guess'); });
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Emoji Guess committed feedback', () => {
  it('matches the unchanged five-puzzle hook score save and share baseline', () => {
    const { result } = renderHook(() => useEmojiGuess());
    const puzzles = pickDaily('2026-10-01');
    expect(puzzles).toHaveLength(5); expect(new Set(puzzles.map(p => p.id)).size).toBe(5);
    expect(puzzles.map(p => p.difficulty)).toEqual(['easy', 'easy', 'medium', 'medium', 'hard']);
    const guesses: string[][] = [];
    for (let i = 0; i < 5; i += 1) {
      const row = Array.from({ length: i === 1 ? 1 : i === 2 ? 2 : i === 3 ? 3 : 0 }, () => 'Fixture miss');
      if (i !== 3) row.push(puzzles[i].aliases[0]);
      for (const answer of row) act(() => result.current.guess(answer));
      guesses.push(row);
      expect(result.current.current?.points).toBe([100, 60, 30, 0, 100][i]);
      expect(saved()).toEqual({ guesses: [...guesses, ...Array.from({ length: 4 - i }, () => [])], index: i });
      expect(recordCompletion).not.toHaveBeenCalled();
      act(() => result.current.next());
    }
    expect(saved()).toEqual({ guesses, index: 5 });
    expect(result.current.totalScore).toBe(290); expect(result.current.solvedCount).toBe(4);
    expect(result.current.shareText).toBe('Emoji Guess, 2026-10-01\n🟩🟨🟧🟥🟩\n4/5 solved · 290 pts\ndouknowball.com/emoji-guess');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/emoji-guess', 290, 'FixtureBaller', 4);
  });

  it('reveals an accepted miss and hint then announces the earned second-try score', async () => {
    const view = await mount(); const field = input(view), form = field.closest('form'), puzzles = pickDaily('2026-10-01');
    expect(view.getByText(/For example, one miss unlocks a hint/)).toBeVisible();
    submit(view, 'Fixture miss');
    expect(activeCue(view, 'miss')).not.toBeNull(); expect(activeCue(view, 'miss')).toHaveClass(styles.failure);
    expect(view.container.querySelector('[data-emoji-hint]')).toHaveClass(styles.reveal);
    expect(view.getByRole('status')).toHaveTextContent('Not yet. 2 guesses left. Hint unlocked.');
    expect(input(view)).toBe(field); expect(field.closest('form')).toBe(form); expect(field).toHaveFocus();
    submit(view, puzzles[0].aliases[0]);
    expect(activeCue(view, 'solved')).not.toBeNull(); expect(activeCue(view, 'solved')).toHaveClass(styles.success);
    expect(view.getByRole('status')).toHaveTextContent('Solved on try 2. 60 points earned.');
    expect(view.getByText('+60 points')).toBeVisible(); expect(view.getByRole('button', { name: 'Next puzzle' })).toHaveFocus();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps typing blanks quiet and preserves fresh duplicate attempts with strict earlier-node identity', async () => {
    const view = await mount(), field = input(view), form = field.closest('form')!;
    fireEvent.submit(form); fireEvent.change(field, { target: { value: '   ' } }); fireEvent.submit(form);
    expect(localStorage.getItem(key)).toBeNull(); expect(view.container.querySelectorAll('[data-emoji-cue]')).toHaveLength(0);
    fireEvent.change(field, { target: { value: 'Fixture miss' } });
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(saved().guesses[0]).toEqual(['Fixture miss']);
    const first = view.container.querySelector('[data-emoji-guess="0"]'); settle();
    submit(view, 'Fixture miss');
    expect(saved().guesses[0]).toEqual(['Fixture miss', 'Fixture miss']);
    expect(view.container.querySelector('[data-emoji-guess="0"]')).toBe(first);
    expect(first).not.toHaveAttribute('data-emoji-cue'); expect(activeCue(view, 'miss')).toHaveAttribute('data-emoji-guess', '1');
    expect(view.getByRole('status')).toHaveTextContent('Not yet. 1 guess left.');
  });

  it('routes native actions to Next input and Share while owned repeated keys stay quiet', async () => {
    const view = await mount(); const field = input(view);
    expect(fireEvent.keyDown(field, { key: 'Enter', repeat: true })).toBe(false);
    expect(fireEvent.keyDown(field, { key: ' ', repeat: true })).toBe(true);
    submit(view, pickDaily('2026-10-01')[0].aliases[0]);
    const next = view.getByRole('button', { name: 'Next puzzle' }); expect(next).toHaveFocus();
    expect(fireEvent.keyDown(next, { key: 'Enter', repeat: true })).toBe(false);
    expect(fireEvent.keyDown(next, { key: ' ', repeat: true })).toBe(false);
    fireEvent.click(next); expect(input(view)).toHaveFocus();
    expect(activeCue(view, 'next')).not.toBeNull(); expect(activeCue(view, 'next')).toHaveClass(styles.reveal);
    for (let i = 1; i < 5; i += 1) { submit(view, pickDaily('2026-10-01')[i].aliases[0]); fireEvent.click(view.getByRole('button', { name: i === 4 ? 'See result' : 'Next puzzle' })); }
    const share = view.getByRole('button', { name: 'Share result' }); expect(share).toHaveFocus();
    expect(fireEvent.keyDown(share, { key: 'Enter', repeat: true })).toBe(false); expect(fixture.clipboard).not.toHaveBeenCalled();
  });

  it('reveals the actual failed answer with zero points and only one final result announcement', async () => {
    const view = await mount(); const puzzles = pickDaily('2026-10-01');
    for (let i = 0; i < 3; i += 1) submit(view, 'Fixture miss');
    expect(activeCue(view, 'failed')).not.toBeNull(); expect(activeCue(view, 'failed')).toHaveClass(styles.failure);
    expect(view.getByText(puzzles[0].answer)).toBeVisible(); expect(view.getByRole('status')).toHaveTextContent('Answer revealed, 0 points.');
    fireEvent.click(view.getByRole('button', { name: 'Next puzzle' }));
    for (let i = 1; i < 5; i += 1) { submit(view, puzzles[i].aliases[0]); fireEvent.click(view.getByRole('button', { name: i === 4 ? 'See result' : 'Next puzzle' })); }
    /* Round 951: the one status is the shared result card, carrying the result in words. */
    expect(activeCue(view, 'result')).not.toBeNull(); const status = view.getByRole('status');
    expect(within(status).getByText('400')).toBeVisible(); expect(within(status).getByText('points · 4/5 solved')).toBeVisible();
    const review = [...view.container.querySelectorAll('[data-emoji-review]')]; view.rerender(element());
    expect(view.getByRole('status')).toBe(status); expect(within(status).getByText('points · 4/5 solved')).toBeVisible();
    for (let i = 0; i < 5; i += 1) expect(view.container.querySelectorAll('[data-emoji-review]')[i]).toBe(review[i]);
    settle(); expect(activeCue(view, 'result')).toBeNull(); expect(within(status).getByText('400')).toBeVisible();
    view.rerender(element()); expect(view.getByRole('status')).toBe(status); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('completes the actual Page at 290 with exact original storage and clipboard payload', async () => {
    const view = await mount(), guesses = complete(view);
    expect(saved()).toEqual({ guesses, index: 5 }); expect(view.getByText('290')).toBeVisible(); expect(view.getByText('points · 4/5 solved')).toBeVisible();
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Share result' })); });
    expect(fixture.clipboard).toHaveBeenCalledWith('Emoji Guess, 2026-10-01\n🟩🟨🟧🟥🟩\n4/5 solved · 290 pts\ndouknowball.com/emoji-guess');
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(recordCompletion).toHaveBeenCalledWith('/emoji-guess', 290, 'FixtureBaller', 4);
  });

  it('restores partial and finished original saves with quiet cues writes and completion', async () => {
    localStorage.setItem(key, JSON.stringify({ guesses: [['Fixture miss'], [], [], [], []], index: 0 }));
    const write = vi.spyOn(Storage.prototype, 'setItem'), partialRaw = localStorage.getItem(key);
    const view = await mount(); expect(view.container.querySelectorAll('[data-emoji-cue]')).toHaveLength(0); expect(view.container.querySelector('[data-emoji-hint]')).not.toHaveClass(styles.reveal);
    expect(localStorage.getItem(key)).toBe(partialRaw); expect(write).not.toHaveBeenCalled(); view.unmount();
    const finished = { guesses: pickDaily('2026-10-01').map(p => [p.aliases[0]]), index: 5 }; localStorage.setItem(key, JSON.stringify(finished)); write.mockClear();
    const done = await mount(); expect(done.getByText('500')).toBeVisible(); expect(done.container.querySelectorAll('[data-emoji-cue]')).toHaveLength(0);
    expect(within(done.getByRole('status')).getByText('points · 5/5 solved')).toBeVisible(); expect(write).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('retains current cue and nodes through clones then clears and cancels its owned timer', async () => {
    const view = await mount(); submit(view, 'Fixture miss'); const row = activeCue(view, 'miss'), status = view.getByRole('status');
    act(() => { vi.advanceTimersByTime(100); }); view.rerender(element());
    expect(activeCue(view, 'miss')).toBe(row); expect(view.getByRole('status')).toBe(status);
    fireEvent.change(input(view), { target: { value: 'typing' } }); expect(activeCue(view, 'miss')).toBe(row);
    settle(); expect(view.container.querySelectorAll('[data-emoji-cue]')).toHaveLength(0);
    view.rerender(element()); expect(view.container.querySelectorAll('[data-emoji-cue]')).toHaveLength(0);
    const schedule = vi.spyOn(window, 'setTimeout'), cancel = vi.spyOn(window, 'clearTimeout'); submit(view, 'another miss');
    const timerIndex = schedule.mock.calls.findIndex(call => call[1] === 600); expect(timerIndex).toBeGreaterThanOrEqual(0);
    const timer = schedule.mock.results[timerIndex].value; view.unmount(); expect(cancel).toHaveBeenCalledWith(timer);
  });

  it('keeps full answer text and real finite reduced-motion declarations bound to owned controls', async () => {
    const view = await mount(); complete(view);
    for (const puzzle of pickDaily('2026-10-01')) {
      const row = view.container.querySelector<HTMLElement>(`[data-emoji-review="${puzzle.id}"]`)!;
      expect(within(row).getByText(puzzle.answer)).toHaveClass(styles.fullText);
      expect(within(row).getByText(puzzle.answer)).not.toHaveClass('truncate');
    }
    expect(view.getByRole('button', { name: 'Share result' })).toHaveClass('min-h-[44px]');
    const css = readFileSync(process.env.EMOJI_GUESS_CSS || path.resolve('src/components/emoji-guess/EmojiGuessFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.action\s*\{[^}]*min-height:\s*44px;[^}]*min-width:\s*44px;/);
    expect(css).toMatch(/\.reveal\s*\{\s*animation:\s*clueReveal 360ms ease-out 1;/);
    expect(css).toMatch(/\.success\s*\{\s*animation:\s*solvedOutline 420ms ease-out 1;/);
    expect(css).toMatch(/\.failure\s*\{\s*animation:\s*missedOutline 360ms ease-out 1;/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.reveal, \.success, \.failure\s*\{\s*animation:\s*none;/);
  });
});
