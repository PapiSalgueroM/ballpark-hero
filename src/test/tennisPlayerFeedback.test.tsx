import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TennisPlayerBoard } from '@/components/tennis-player/TennisPlayerBoard';
import { POINTS_BY_CLUE } from '@/types/tennisPlayer';
import { recordCompletion } from '@/lib/completions';
import styles from '@/components/tennis-player/TennisPlayerFeedback.module.css';

const fixture = vi.hoisted(() => ({
  row: { id: 'fixture-tennis', player_name: 'Fixture Tennis Player', common_names: [], vibe_word: 'Generated vibe', nationality_era_hint: 'Generated nationality', tour_hint: 'Generated tour', slam_count_hint: 'Generated titles', slam_detail_hint: 'Generated details', famous_moment_hint: 'Generated moment' },
  inserts: [] as unknown[], clipboard: vi.fn(async (_text: string) => {}),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  let single = false;
  const reply = () => ({ data: table === 'tennis_daily' ? { player_id: fixture.row.id } : single ? fixture.row : [fixture.row], error: null });
  type Query = { select: () => Query; eq: () => Query; order: () => Query; maybeSingle: () => Promise<ReturnType<typeof reply>>; single: () => Promise<ReturnType<typeof reply>>; then: (resolve: (value: ReturnType<typeof reply>) => unknown) => Promise<unknown>; insert: (value: unknown) => Promise<{ error: null }> };
  const query: Query = { select: () => query, eq: () => query, order: () => query, maybeSingle: () => { single = true; return Promise.resolve(reply()); }, single: () => { single = true; return Promise.resolve(reply()); }, then: resolve => Promise.resolve(reply()).then(resolve), insert: value => { expect(table).toBe('tennis_scores'); fixture.inserts.push(value); return Promise.resolve({ error: null }); } };
  return query;
} } }));
vi.mock('@/components/tennis-player/TennisPlayerSearch', () => ({ TennisPlayerSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess(fixture.row.player_name)}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const board = () => <MemoryRouter><TennisPlayerBoard /></MemoryRouter>;
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
async function start(daily = false) { const view = render(board()); await act(async () => {}); await act(async () => { click(view, daily ? /Daily Challenge/ : /Unlimited Mode/); }); return view; }
const correct = (view: ReturnType<typeof render>) => click(view, 'Fixture correct guess');
const wrong = (view: ReturnType<typeof render>) => click(view, 'Fixture wrong guess');
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cue = (view: ReturnType<typeof render>) => view.container.querySelector<HTMLElement>('[data-tennis-player-feedback]');
const result = (view: ReturnType<typeof render>) => view.container.querySelector<HTMLElement>('[data-tennis-player-result]');
const puzzle = () => ({ id: fixture.row.id, player_name: fixture.row.player_name, common_names: [], clues: [fixture.row.vibe_word, fixture.row.nationality_era_hint, fixture.row.tour_hint, fixture.row.slam_count_hint, fixture.row.slam_detail_hint, fixture.row.famous_moment_hint] });
const exactSave = (clues: number, guesses: string[], gameStatus: string, score: number) => ({ puzzle: puzzle(), revealedClues: clues, guesses, gameStatus, score, v: 1, date: '2026-10-01' });
const rawKey = 'guess-tennis-player-daily-2026-10-01';
const saved = () => JSON.parse(localStorage.getItem(rawKey)!);
const css = () => readFileSync(process.env.TENNIS_FEEDBACK_CSS || path.resolve('src/components/tennis-player/TennisPlayerFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

beforeEach(() => { localStorage.clear(); fixture.inserts.length = 0; vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } }); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });

describe('actual Tennis Player committed feedback', () => {
  it('keeps a committed first-clue win correct at the old delayed boundary', async () => {
    const view = await start(true); correct(view); tick(50);
    expect(view.queryByText('Wrong guess! Try again...')).toBeNull(); expect(cue(view)).toHaveAttribute('data-tennis-player-feedback', 'correct'); expect(cue(view)).toHaveTextContent('Correct guess. Player found.');
    expect(result(view)).toHaveAttribute('data-tennis-player-result', 'won'); expect(result(view)).toHaveClass(styles.won);
    expect(saved()).toEqual(exactSave(1, [fixture.row.player_name], 'won', 1000)); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 1000, 'FixtureBaller', 0);
    tick(550); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull(); expect(view.getByText('1,000 pts')).toBeVisible();
  });

  it('cues repeated accepted wrong appends with stable clues and the original600 win', async () => {
    const view = await start(true), nodes = [...view.container.querySelectorAll('[data-tennis-player-clue]')], action = view.getByRole('button', { name: 'Fixture wrong guess' });
    wrong(view); const first = cue(view); expect(first).toHaveAttribute('data-tennis-player-feedback', 'wrong'); expect(first).toHaveClass(styles.reply); tick(600); wrong(view);
    expect(cue(view)).toHaveAttribute('data-tennis-player-feedback', 'wrong'); expect(cue(view)).not.toBe(first); expect(view.getByRole('button', { name: 'Fixture wrong guess' })).toBe(action);
    expect(saved()).toEqual(exactSave(3, ['Fixture Other', 'Fixture Other'], 'playing', 0)); correct(view);
    expect(view.getByText('600 pts')).toBeVisible(); expect(cue(view)).toHaveAttribute('data-tennis-player-feedback', 'correct');
    [...view.container.querySelectorAll('[data-tennis-player-clue]')].forEach((node, i) => expect(node).toBe(nodes[i]));
    expect(saved()).toEqual(exactSave(3, ['Fixture Other', 'Fixture Other', fixture.row.player_name], 'won', 600)); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 600, 'FixtureBaller', 0);
  });

  it('keeps hints and clones quiet without restarting or extending a live cue', async () => {
    const view = await start(); click(view, /Hint/); expect(cue(view)).toBeNull(); expect(view.getByText('1 hint used')).toBeVisible(); expect(view.getByRole('button', { name: '💡 Hint (600 pts next)' })).toBeVisible();
    wrong(view); const reply = cue(view); tick(300); view.rerender(board()); expect(cue(view)).toBe(reply); tick(300); expect(cue(view)).toBeNull(); view.rerender(board()); tick(100); expect(cue(view)).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.inserts).toEqual([]); expect(localStorage.length).toBe(0);
  });

  it('restores completed and partial dailies quietly without paying a restored finish', async () => {
    localStorage.setItem(rawKey, JSON.stringify(exactSave(3, ['Fixture Other', 'Fixture Other', fixture.row.player_name], 'won', 600))); const raw = localStorage.getItem(rawKey), view = await start(true); tick(800);
    expect(cue(view)).toBeNull(); expect(result(view)).toBeNull(); expect(localStorage.getItem(rawKey)).toBe(raw); expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.inserts).toEqual([]); view.unmount();
    localStorage.setItem(rawKey, JSON.stringify(exactSave(2, ['Fixture Other'], 'playing', 0))); const partial = await start(true); expect(cue(partial)).toBeNull(); correct(partial);
    expect(partial.getByText('800 pts')).toBeVisible(); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 800, 'FixtureBaller', 0);
  });

  it('reports the exhausted last miss truthfully with the original zero-score loss', async () => {
    const view = await start(true); for (let i = 0; i < 6; i++) wrong(view);
    expect(cue(view)).toHaveTextContent('Wrong guess. The answer is below.'); expect(view.queryByText('Wrong guess! Try again...')).toBeNull(); expect(result(view)).toHaveClass(styles.lost);
    expect(saved()).toEqual(exactSave(6, Array(6).fill('Fixture Other'), 'lost', 0)); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 0, 'FixtureBaller', 0);
    expect(fixture.inserts).toEqual([{ puzzle_date: '2026-10-01', clues_used: 6, score: 0, guessed: false, mode: 'daily' }]); tick(600); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull();
  });

  it('clears reset and unmount timers without leaking delayed feedback', async () => {
    const view = await start(); correct(view); expect(vi.getTimerCount()).toBe(1); click(view, 'Play Again'); expect(vi.getTimerCount()).toBe(0); tick(800);
    await act(async () => { click(view, /Unlimited Mode/); }); expect(cue(view)).toBeNull(); wrong(view); expect(vi.getTimerCount()).toBe(1); view.unmount(); expect(vi.getTimerCount()).toBe(0); tick(800);
  });

  it('separates an immediate Give up decision from the active wrong-guess stamp', async () => {
    const view = await start(true); wrong(view); tick(100); click(view, /^🏳️ Give Up$/); click(view, 'Cancel'); expect(cue(view)).toHaveAttribute('data-tennis-player-feedback', 'wrong'); expect(recordCompletion).not.toHaveBeenCalled();
    click(view, /^🏳️ Give Up$/); click(view, 'Yes, Give Up'); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull(); expect(saved()).toEqual(exactSave(2, ['Fixture Other'], 'lost', 0));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 0, 'FixtureBaller', 0); expect(fixture.inserts).toEqual([]);
  });

  it('binds finite static-motion cues full guess text and owned44px actions', async () => {
    const rules = css(); expect(rules).toMatch(/tennisReply 420ms ease-out 1;/); expect(rules).toMatch(/tennisWon 420ms ease-out 1;/); expect(rules).toMatch(/tennisLost 420ms ease-out 1;/);
    expect(rules).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.reply,\s*\.won,\s*\.lost\s*\{\s*animation:\s*none;/); expect(rules).toMatch(/\.guessName\s*\{\s*min-width:\s*0;\s*max-width:\s*100%;\s*overflow-wrap:\s*anywhere;/); expect(rules).toMatch(/\.action\s*\{\s*min-height:\s*44px;\s*min-width:\s*44px;/);
    const view = await start(); wrong(view); expect(view.getByText('Fixture Other')).toHaveClass(styles.guessName); expect(cue(view)).toHaveClass(styles.reply); expect(view.getByRole('button', { name: /Hint/ })).toHaveClass(styles.action); click(view, /^🏳️ Give Up$/);
    for (const name of ['Yes, Give Up', 'Cancel']) expect(view.getByRole('button', { name })).toHaveClass(styles.action);
  });

  it('reopens actual active-game help without changing the accepted round', async () => {
    const view = await start(true); wrong(view); tick(600);
    const before = localStorage.getItem(rawKey), nodes = [...view.container.querySelectorAll('[data-tennis-player-clue]')], help = view.getByRole('button', { name: 'How to Play' });
    fireEvent.click(help); expect(view.getByRole('dialog', { name: 'How to Play' })).toBeVisible();
    expect(localStorage.getItem(rawKey)).toBe(before); expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.inserts).toEqual([]);
    click(view, 'Close'); tick(250); expect(view.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(rawKey)).toBe(before); expect(saved()).toEqual(exactSave(2, ['Fixture Other'], 'playing', 0)); expect(cue(view)).toBeNull();
    [...view.container.querySelectorAll('[data-tennis-player-clue]')].forEach((node, i) => expect(node).toBe(nodes[i]));
    correct(view); expect(view.getByText('800 pts')).toBeVisible(); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 800, 'FixtureBaller', 0);
  });

  it('holds independent original six-clue payouts exact saves full shares and once completion', async () => {
    expect(POINTS_BY_CLUE).toEqual([1000, 800, 600, 400, 200, 100]);
    for (let misses = 0; misses < 6; misses++) {
      localStorage.clear(); vi.mocked(recordCompletion).mockClear(); fixture.inserts.length = 0; fixture.clipboard.mockClear(); const view = await start(true);
      for (let i = 0; i < misses; i++) wrong(view); correct(view); const clues = misses + 1, score = [1000, 800, 600, 400, 200, 100][misses];
      expect(saved()).toEqual(exactSave(clues, [...Array(misses).fill('Fixture Other'), fixture.row.player_name], 'won', score)); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', score, 'FixtureBaller', 0);
      expect(fixture.inserts).toEqual([{ puzzle_date: '2026-10-01', clues_used: clues, score, guessed: true, mode: 'daily' }]);
      for (const label of ['Vibe', 'Nationality & Era', 'Tour', 'Grand Slam Wins', 'Slams Won', 'Famous Moment']) expect(view.getByText(label, { exact: true })).toBeVisible();
      for (const clue of puzzle().clues) expect(view.getByText(clue, { exact: true })).toBeVisible();
      await act(async () => { click(view, '📋 Copy Score Card'); }); expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(`🎾 Guess The Tennis Player: Oct 1, 2026\nScore: I guessed today's Tennis Player in ${clues} clue${clues > 1 ? 's' : ''}!\nScore: ${score} 🎾\ndouknowball.com/guess-tennis-player`);
      view.rerender(board()); tick(800); expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
    }
  });
});
