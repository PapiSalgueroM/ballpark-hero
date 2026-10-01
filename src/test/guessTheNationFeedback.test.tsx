import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GuessTheNationBoard } from '@/components/guess-the-nation/GuessTheNationBoard';
import { POINTS_BY_CLUE } from '@/types/guessTheNation';
import { recordCompletion } from '@/lib/completions';

const fixture = vi.hoisted(() => ({
  rows: Array.from({ length: 14 }, (_, i) => ({ id: `fixture-${i}`, country_name: `Fictional Nation ${i}`, common_names: [], flag_emoji: '🌐', continent: 'Europe', difficulty: 'easy', season_focus: 'both', vibe_word: 'Fixture vibe', continent_hint: 'Fixture region', population_hint: 'Fixture population', games_attended_hint: 'Fixture attendance', total_medals_hint: 'Fixture medals', best_sport_hint: 'Fixture sport', famous_moment_hint: 'Fixture moment', winter_history_hint: 'Fixture winter', gold_medal_hint: 'Fixture gold', flag_colors_hint: 'Fixture colors', country_size_hint: 'Fixture size', iconic_moment: 'Declared fictional fixture only.' })),
  inserts: [] as { table: string; value: unknown }[],
  clipboard: vi.fn(async (_text: string) => {}),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  type Query = { select: () => Query; order: () => Query; then: (resolve: (value: { data: typeof fixture.rows; error: null }) => unknown) => Promise<unknown>; insert: (value: unknown) => Promise<{ error: null }> };
  const query: Query = { select: () => query, order: () => query, then: resolve => Promise.resolve({ data: fixture.rows, error: null }).then(resolve), insert: value => { fixture.inserts.push({ table, value }); return Promise.resolve({ error: null }); } };
  return query;
} } }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller', getLocalTodayCount: () => 0 }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const target = () => fixture.rows[20261001 % fixture.rows.length];
const wrong = () => fixture.rows.find(row => row.id !== target().id)!;
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const raw = () => localStorage.getItem('guess-the-nation-daily-2026-10-01');
const clueNodes = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-nation-clue]')];
const status = (view: ReturnType<typeof render>) => view.getAllByRole('status').find(node => node.classList.contains('min-h-[40px]'))!;
async function start() {
  const view = render(<MemoryRouter><GuessTheNationBoard /></MemoryRouter>);
  await act(async () => {});
  await act(async () => { click(view, /Daily Challenge/); });
  return view;
}
function guess(view: ReturnType<typeof render>, name: string) {
  fireEvent.change(view.getByRole('textbox', { name: 'Search countries' }), { target: { value: name } });
  click(view, new RegExp(`${name}$`));
}
beforeEach(() => {
  localStorage.clear(); fixture.inserts.length = 0; vi.clearAllMocks(); vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Actual Nation Board and hook committed feedback', () => {
  it('miss and hint cue only the exact newly opened clue with stable nodes', async () => {
    const view = await start(), nodes = clueNodes(view);
    expect(nodes).toHaveLength(12);
    guess(view, wrong().country_name);
    expect(status(view)).toHaveTextContent('Wrong guess. Clue 2 is open.');
    expect(nodes[1].className).toMatch(/clue/); expect(nodes[0].className).not.toMatch(/clue/);
    click(view, /Hint/);
    expect(status(view)).toHaveTextContent('Clue 3 is open. 1000 points available.');
    expect(nodes[2].className).toMatch(/clue/); expect(nodes[1].className).not.toMatch(/clue/);
    clueNodes(view).forEach((node, i) => expect(node).toBe(nodes[i]));
    const receipt = status(view), state = raw();
    view.rerender(<MemoryRouter><GuessTheNationBoard /></MemoryRouter>);
    expect(status(view)).toBe(receipt); expect(raw()).toBe(state);
    act(() => { vi.advanceTimersByTime(599); }); expect(receipt).toHaveTextContent('Clue 3');
    act(() => { vi.advanceTimersByTime(1); }); expect(receipt).toBeEmptyDOMElement();
    expect(nodes[2].className).not.toMatch(/clue/); expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.inserts).toEqual([]);
  });

  it('correct and confirmed give up report actual results without a false miss', async () => {
    const view = await start(); guess(view, target().country_name);
    expect(status(view)).toHaveTextContent('Correct guess. Nation found. 1200 points.');
    expect(status(view)).not.toHaveTextContent('Wrong guess');
    expect(view.container.querySelector('[data-nation-result="won"]')?.className).toMatch(/result/);
    click(view, 'Back to modes'); vi.spyOn(Math, 'random').mockReturnValue(0); await act(async () => { click(view, /Unlimited/); });
    guess(view, 'Fictional Nation 13');
    click(view, /Give Up/); click(view, 'Cancel');
    expect(view.queryByText('Answer revealed. You scored 0 points.')).toBeNull();
    click(view, /Give Up/); click(view, 'Yes, Give Up');
    expect(status(view)).toHaveTextContent('Answer revealed. You scored 0 points.');
    expect(view.container.querySelector('[data-nation-result="lost"]')?.className).toMatch(/result/);
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    expect(vi.mocked(recordCompletion).mock.calls[1]).toEqual(['/guess-the-nation', 0, 'FixtureBaller', 0]);
    expect(fixture.inserts).toHaveLength(1);
  });

  it('empty and unmatched typing stay quiet then a valid choice still works', async () => {
    const view = await start(), state = raw(), input = view.getByRole('textbox', { name: 'Search countries' });
    for (const value of ['', 'zzzz unmatched fixture']) {
      fireEvent.change(input, { target: { value } });
      expect(status(view)).toBeEmptyDOMElement(); expect(raw()).toBe(state);
    }
    guess(view, wrong().country_name); click(view, /Hint/);
    expect(status(view)).toHaveTextContent('Clue 3 is open. 1000 points available.');
    expect(JSON.parse(raw()!).guesses).toEqual([wrong().country_name]);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('restored finish and fresh mode stay quiet with original booking and hint reset', async () => {
    const view = await start(); click(view, /Hint/); guess(view, target().country_name);
    const saved = raw(); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-the-nation', 1100, 'FixtureBaller', 0);
    view.unmount(); const restored = await start();
    expect(status(restored)).toBeEmptyDOMElement(); expect(restored.container.querySelector('[data-nation-result]')).toBeNull();
    expect(raw()).toBe(saved); expect(recordCompletion).toHaveBeenCalledTimes(1); expect(fixture.inserts).toHaveLength(1);
    click(restored, 'Back to modes'); await act(async () => { click(restored, /Unlimited/); });
    expect(status(restored)).toBeEmptyDOMElement(); expect(restored.queryByText(/hints? used/)).toBeNull();
    click(restored, /Hint/); expect(restored.getByText('1 hint used')).toBeVisible(); expect(raw()).toBe(saved);
  });

  it('owned controls and full guess text bind finite static reduced feedback', async () => {
    const view = await start();
    expect(view.getByRole('button', { name: /Hint/ })).toHaveClass('min-h-[44px]');
    guess(view, wrong().country_name); click(view, /Give Up/);
    for (const name of [/Give Up$/, 'Yes, Give Up', 'Cancel']) {
      const button = typeof name === 'string' ? view.getByRole('button', { name }) : view.getAllByRole('button', { name })[0];
      expect(button).toHaveClass('min-h-[44px]');
    }
    const chip = view.container.querySelector('[data-nation-guess="0"]');
    expect(chip).toHaveTextContent(wrong().country_name); expect(chip?.className).toMatch(/fullName/);
    const css = readFileSync(process.env.NATION_FEEDBACK_CSS || path.resolve('src/components/guess-the-nation/GuessTheNationFeedback.module.css'), 'utf8');
    expect(css).toMatch(/\.clue\s*\{\s*animation:\s*clueOpen 420ms ease-out 1;/);
    expect(css).toMatch(/\.reply\s*\{\s*animation:\s*replyReveal 420ms ease-out 1;/);
    expect(css).toMatch(/\.result\s*\{\s*animation:\s*resultReveal 420ms ease-out 1;/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.clue, \.reply, \.result\s*\{\s*animation:\s*none;/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/); expect(css).not.toMatch(/infinite/);
  });

  it('holds independent original full tier table exact save share and completion', async () => {
    expect(POINTS_BY_CLUE).toEqual([1200, 1100, 1000, 850, 700, 550, 400, 250, 150, 100, 50, 0]);
    const view = await start();
    for (let clue = 1; clue < POINTS_BY_CLUE.length; clue++) {
      expect(view.getByRole('button', { name: /Hint/ })).toHaveTextContent(`Hint (-${POINTS_BY_CLUE[clue - 1] - POINTS_BY_CLUE[clue]} pts)`);
      click(view, /Hint/);
      expect(JSON.parse(raw()!).revealedClues).toBe(clue + 1);
    }
    guess(view, target().country_name);
    expect(JSON.parse(raw()!)).toEqual({ puzzleId: target().id, revealedClues: 12, guesses: [], gameStatus: 'won', score: 0, v: 1, date: '2026-10-01' });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-the-nation', 0, 'FixtureBaller', 0);
    expect(fixture.inserts).toEqual([{ table: 'guess_nation_scores', value: { puzzle_date: '2026-10-01', clues_used: 12, score: 0, guessed: true, mode: 'daily' } }]);
    click(view, /Copy Score Card/);
    expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(`🌍 Guess The Nation: Oct 1, 2026\nGuessed ${target().country_name} for 0 points\nScore: I guessed today's Nation in 12 clues on DoUKnowBall!\nScore: 0 🌍\ndouknowball.com/guess-the-nation`);
    act(() => { vi.advanceTimersByTime(1000); }); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
