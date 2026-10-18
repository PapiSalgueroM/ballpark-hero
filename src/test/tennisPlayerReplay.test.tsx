import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TennisPlayerBoard } from '@/components/tennis-player/TennisPlayerBoard';
import { recordCompletion } from '@/lib/completions';

const fixture = vi.hoisted(() => ({
  row: { id: 'fixture-tennis-replay', player_name: 'Fixture Tennis Player', common_names: [], vibe_word: 'Generated vibe', nationality_era_hint: 'Generated nationality', tour_hint: 'Generated tour', slam_count_hint: 'Generated titles', slam_detail_hint: 'Generated details', famous_moment_hint: 'Generated moment' },
  inserts: [] as unknown[],
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  expect(['tennis_players', 'tennis_daily', 'tennis_scores']).toContain(table);
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

type View = ReturnType<typeof render>;
const click = (view: View, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const correct = (view: View) => click(view, 'Fixture correct guess');
const wrong = (view: View) => click(view, 'Fixture wrong guess');
const openPrompt = (view: View) => click(view, /^🏳️ Give Up$/);
const prompt = (view: View) => view.getByRole('button', { name: 'Yes, Give Up' });
const quiet = (view: View) => {
  expect(view.queryByRole('button', { name: 'Yes, Give Up' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Cancel' })).toBeNull();
};
async function start(daily = false) {
  const view = render(<MemoryRouter><TennisPlayerBoard /></MemoryRouter>);
  await act(async () => {});
  await act(async () => { click(view, daily ? /Daily Challenge/ : /Unlimited Mode/); });
  return view;
}
async function replay(view: View) {
  click(view, 'Play Again');
  expect(view.getByRole('button', { name: /Unlimited Mode/ })).toBeVisible();
  await act(async () => { click(view, /Unlimited Mode/); });
}
const scorePost = (clues: number, score: number) => ({ puzzle_date: '2026-10-01', clues_used: clues, score, guessed: true, mode: 'unlimited' });

beforeEach(() => { localStorage.clear(); fixture.inserts.length = 0; vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });

describe('actual Tennis Player surrender prompt across replay', () => {
  it('clears an unanswered surrender prompt before replaying the same unlimited puzzle', async () => {
    const view = await start(); wrong(view); openPrompt(view);
    expect(prompt(view)).toBeVisible(); correct(view);
    expect(view.getByText('800 pts')).toBeVisible();
    expect(fixture.inserts).toEqual([scorePost(2, 800)]);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 800, 'FixtureBaller', 0);
    await replay(view);
    expect(view.getByText('Clue 1/6 · 1000 pts available')).toBeVisible();
    expect(view.queryByRole('button', { name: 'Yes, Give Up' }), 'A replay must not inherit the previous surrender decision').toBeNull();
    quiet(view);
    expect(view.queryByRole('button', { name: /^🏳️ Give Up$/ })).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(fixture.inserts).toEqual([scorePost(2, 800)]);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('cancels a current surrender decision and keeps the accepted guess and payout', async () => {
    const view = await start(); wrong(view); openPrompt(view); click(view, 'Cancel');
    quiet(view); expect(view.getByText('Clue 2/6 · 800 pts available')).toBeVisible();
    expect(view.getByText('Fixture Other')).toBeVisible();
    expect(view.getByRole('button', { name: 'Fixture correct guess' })).toBeVisible();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.inserts).toEqual([]);
    correct(view); expect(view.getByText('800 pts')).toBeVisible();
    expect(fixture.inserts).toEqual([scorePost(2, 800)]);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 800, 'FixtureBaller', 0);
    expect(localStorage.length).toBe(0);
  });

  it('confirms a fresh surrender for zero points without a winning score post', async () => {
    const view = await start(); wrong(view); openPrompt(view); click(view, 'Yes, Give Up');
    expect(view.getByText('It was Fixture Tennis Player')).toBeVisible();
    expect(view.getByText('Better luck next time!')).toBeVisible(); quiet(view);
    expect(view.queryByRole('button', { name: 'Fixture correct guess' })).toBeNull();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-tennis-player', 0, 'FixtureBaller', 0);
    expect(fixture.inserts).toEqual([]); expect(localStorage.length).toBe(0);
  });

  it('keeps an active surrender decision open through hints and further guesses', async () => {
    const view = await start(true); wrong(view); openPrompt(view);
    const confirmation = prompt(view); click(view, /Hint/); wrong(view);
    expect(prompt(view)).toBe(confirmation); expect(confirmation).toBeVisible();
    expect(view.getByRole('button', { name: 'Cancel' })).toBeVisible();
    expect(view.getByText('Clue 4/6 · 400 pts available')).toBeVisible();
    expect(view.getByText('1 hint used')).toBeVisible();
    const saved = JSON.parse(localStorage.getItem('guess-tennis-player-daily-2026-10-01')!);
    expect(saved).toEqual({ v: 1, date: '2026-10-01', puzzle: { id: fixture.row.id, player_name: fixture.row.player_name, common_names: [], clues: [fixture.row.vibe_word, fixture.row.nationality_era_hint, fixture.row.tour_hint, fixture.row.slam_count_hint, fixture.row.slam_detail_hint, fixture.row.famous_moment_hint] }, revealedClues: 4, guesses: ['Fixture Other', 'Fixture Other'], gameStatus: 'playing', score: 0 });
    expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.inserts).toEqual([]);
  });

  it('replays the same puzzle with normal clue points and an available fresh decision', async () => {
    const view = await start(); correct(view);
    expect(view.getByText('1,000 pts')).toBeVisible(); await replay(view); quiet(view);
    expect(view.getByText('Clue 1/6 · 1000 pts available')).toBeVisible();
    wrong(view); click(view, /Hint/); openPrompt(view); expect(prompt(view)).toBeVisible(); click(view, 'Cancel'); quiet(view);
    expect(view.getByText('Clue 3/6 · 600 pts available')).toBeVisible(); correct(view);
    expect(view.getByText('600 pts')).toBeVisible();
    expect(fixture.inserts).toEqual([scorePost(1, 1000), scorePost(3, 600)]);
    expect(vi.mocked(recordCompletion).mock.calls).toEqual([['/guess-tennis-player', 1000, 'FixtureBaller', 0], ['/guess-tennis-player', 600, 'FixtureBaller', 0]]);
    expect(localStorage.length).toBe(0);
  });
});
