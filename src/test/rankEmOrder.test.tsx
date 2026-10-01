import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import RankEm from '@/pages/RankEm';
import { getDailyRankRound, scoreRankGuess, scrambledNames, RANK_POINTS_PER_SLOT } from '@/lib/orderTheList';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { recordCompletion } from '@/lib/completions';
import { loadGameContent } from '@/data/gameContent/loader';
import styles from '@/pages/RankEmOrder.module.css';

const fixture = vi.hoisted(() => ({
  round: { id: 'fixture-rank', sport: 'NBA' as const, statLabel: 'fixture career points', unit: 'pts', source: 'Fictional test fixture',
    items: ['Fixture Aster', 'Fixture' + 'UnbrokenFullPlayerName'.repeat(4), 'Fixture Cedar', 'Fixture Delta', 'Fixture Elm'].map((name, i) => ({ name, value: 500 - i * 100 })) },
  clipboard: vi.fn(async (_text: string) => {}),
}));
vi.mock('@/lib/orderTheList', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/orderTheList')>(), getDailyRankRound: () => fixture.round, getRandomRankRound: () => fixture.round }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

const key = 'rank-em-daily-2026-10-01';
const names = () => fixture.round.items.map(item => item.name);
const element = () => <MemoryRouter initialEntries={['/rank-em']}><HelmetProvider><RankEm /></HelmetProvider></MemoryRouter>;
const mount = async () => { const view = render(element()); await act(async () => {}); return view; };
const choice = (view: ReturnType<typeof render>, name: string) => {
  const buttons = [...view.container.querySelectorAll<HTMLButtonElement>('button')].filter(button => (button.getAttribute('aria-label') || button.textContent?.trim()) === name);
  expect(buttons).toHaveLength(1);
  return buttons[0];
};
const lock = (view: ReturnType<typeof render>) => choice(view, 'Lock order');
const draft = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-rank-name]')].map(row => row.textContent);
const pickAll = (view: ReturnType<typeof render>, order = names()) => order.forEach(name => fireEvent.click(choice(view, name)));
const saveFor = (order: string[]) => ({ v: 1, date: '2026-10-01', puzzleIndex: 0, guesses: [{ order }], gameStatus: scoreRankGuess(order, fixture.round) === 5 ? 'won' : 'lost' });
const saved = () => JSON.parse(localStorage.getItem(key)!);

beforeAll(async () => { await loadGameContent('/rank-em'); });
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Rank Em editable order', () => {
  it('holds the original helper and daily-hook 1000 600 and zero score save baseline', async () => {
    const all = names(), partial = [all[0], all[1], all[2], all[4], all[3]], wrong = [...all.slice(1), all[0]];
    expect(scrambledNames(fixture.round, 17)).toEqual(scrambledNames(fixture.round, 17));
    expect(new Set(scrambledNames(fixture.round, 17))).toEqual(new Set(all)); expect(RANK_POINTS_PER_SLOT).toBe(200);
    for (const [order, score] of [[all, 1000], [partial, 600], [wrong, 0]] as const) {
      localStorage.clear(); vi.mocked(recordCompletion).mockClear();
      const hook = renderHook(() => {
        const state = useDailyPuzzle<{ id: string }, { order: string[] }>({ gameSlug: 'rank-em', puzzles: [{ id: 'rank-em-daily' }], maxGuesses: 1,
          isWon: guesses => guesses.length > 0 && scoreRankGuess(guesses[0].order, fixture.round) === 5,
          isLost: guesses => guesses.length > 0 && scoreRankGuess(guesses[0].order, fixture.round) < 5, deserializeGuesses: raw => raw as { order: string[] }[] });
        useGameCompletion('rank-em', state.gameStatus !== 'playing', state.guesses.length ? scoreRankGuess(state.guesses[0].order, fixture.round) * RANK_POINTS_PER_SLOT : 0);
        return state;
      });
      await act(async () => {}); act(() => hook.result.current.addGuess({ order: [...order] }));
      expect(saved()).toEqual(saveFor([...order])); expect(recordCompletion).toHaveBeenCalledTimes(1);
      expect(recordCompletion).toHaveBeenCalledWith('/rank-em', score, 'FixtureBaller', 0);
      act(() => hook.result.current.addGuess({ order: [...wrong] })); expect(saved()).toEqual(saveFor([...order])); expect(recordCompletion).toHaveBeenCalledTimes(1);
      hook.unmount();
    }
  });

  it('keeps five picks editable and quiet until an exact corrected perfect order is locked', async () => {
    const view = await mount(), all = names(), random = vi.spyOn(Math, 'random');
    const order = [all[1], all[0], ...all.slice(2)]; pickAll(view, order);
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled(); expect(lock(view)).toBeEnabled();
    expect(draft(view)).toEqual(order); expect(view.getByRole('status')).toHaveTextContent('5/5 selected');
    expect(random).not.toHaveBeenCalled();
    fireEvent.click(choice(view, `Move ${all[0]} up`)); expect(draft(view)).toEqual(all);
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    fireEvent.click(lock(view)); expect(saved()).toEqual(saveFor(all)); expect(view.getByText('5 / 5 correct')).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(recordCompletion).toHaveBeenCalledWith('/rank-em', 1000, 'FixtureBaller', 0);
  });

  it('swaps removes and undoes without replacing original choices or fixed rung nodes', async () => {
    const view = await mount(), all = names(), rungs = [...view.container.querySelectorAll('[data-rank-slot]')], choices = all.map(name => choice(view, name));
    pickAll(view); fireEvent.click(choice(view, `Move ${all[0]} down`)); expect(draft(view)).toEqual([all[1], all[0], ...all.slice(2)]);
    fireEvent.click(choice(view, `Remove ${all[2]}`)); expect(draft(view)).toEqual([all[1], all[0], all[3], all[4], 'Pick a player']);
    fireEvent.click(choice(view, 'Undo last')); expect(draft(view)).toEqual([all[1], all[0], all[3], 'Pick a player', 'Pick a player']);
    fireEvent.click(choices[2]); fireEvent.click(choices[4]);
    for (let i = 0; i < 5; i++) { expect(view.container.querySelectorAll('[data-rank-slot]')[i]).toBe(rungs[i]); expect(choice(view, all[i])).toBe(choices[i]); }
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps incomplete disabled duplicate and boundary edits out of the actual daily action', async () => {
    const view = await mount(), all = names(); fireEvent.click(lock(view)); expect(localStorage.getItem(key)).toBeNull();
    act(() => { fireEvent.click(choice(view, all[0])); fireEvent.click(choice(view, all[0])); });
    expect(draft(view)).toEqual([all[0], 'Pick a player', 'Pick a player', 'Pick a player', 'Pick a player']);
    const up = choice(view, `Move ${all[0]} up`), down = choice(view, `Move ${all[0]} down`);
    fireEvent.click(up); fireEvent.click(down); expect(draft(view)).toEqual([all[0], 'Pick a player', 'Pick a player', 'Pick a player', 'Pick a player']);
    expect(up).toBeDisabled(); expect(down).toBeDisabled(); expect(lock(view)).toBeDisabled(); expect(localStorage.getItem(key)).toBeNull();
    pickAll(view, all.slice(1)); fireEvent.click(choice(view, `Move ${all[4]} down`)); expect(draft(view)).toEqual(all);
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('locks exact partial and zero daily orders with the original share and one completion', async () => {
    const all = names(), orders = [[all[0], all[1], all[2], all[4], all[3]], [...all.slice(1), all[0]]];
    for (const order of orders) {
      localStorage.clear(); vi.mocked(recordCompletion).mockClear(); const view = await mount(); pickAll(view, order); fireEvent.click(lock(view));
      const count = scoreRankGuess(order, getDailyRankRound()), score = count * 200;
      expect(saved()).toEqual(saveFor(order)); expect(view.getByText(`${count} / 5 correct`)).toBeVisible();
      expect(recordCompletion).toHaveBeenCalledTimes(1); expect(recordCompletion).toHaveBeenCalledWith('/rank-em', score, 'FixtureBaller', 0);
      await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Share result' })); });
      expect(fixture.clipboard).toHaveBeenLastCalledWith(`I scored ${count}/5 on today's Rank 'Em on Rank 'Em at DoUKnowBall! Can you beat me?\n📊 Rank 'Em, NBA fixture career points: ${count}/5\ndouknowball.com/rank-em`);
      view.unmount();
    }
  });

  it('hands focus to enabled neighbors lock and result and guards owned held keys', async () => {
    const view = await mount(), all = names();
    for (const name of all) { const button = choice(view, name); button.focus(); expect(fireEvent.keyDown(button, { key: 'Enter', repeat: true })).toBe(false); fireEvent.click(button); }
    expect(lock(view)).toHaveFocus(); expect(fireEvent.keyDown(lock(view), { key: ' ', repeat: true })).toBe(false);
    const up = choice(view, `Move ${all[1]} up`); up.focus(); fireEvent.click(up); expect(choice(view, `Remove ${all[1]}`)).toHaveFocus();
    const remove = choice(view, `Remove ${all[1]}`); fireEvent.click(remove); expect(view.getByRole('group', { name: `Rank 1: ${all[0]}` })).toHaveFocus();
    fireEvent.click(choice(view, all[1])); expect(lock(view)).toHaveFocus(); fireEvent.click(lock(view)); expect(view.getByRole('heading', { name: /correct$/ })).toHaveFocus();
    view.unmount(); localStorage.clear(); vi.mocked(recordCompletion).mockClear();
    const narrow = await mount(); pickAll(narrow);
    const opener = choice(narrow, `Move ${all[1]} up`), hiddenTarget = choice(narrow, `Remove ${all[0]}`);
    const rect = (top: number, height: number) => ({ x: 0, y: top, width: 44, height, top, bottom: top + height, left: 0, right: 44, toJSON: () => ({}) });
    vi.spyOn(hiddenTarget, 'getBoundingClientRect').mockReturnValue(rect(-80, 44));
    vi.spyOn(opener, 'getBoundingClientRect').mockReturnValue(rect(10, 44));
    vi.spyOn(narrow.container.querySelector<HTMLElement>('[data-rank-ladder]')!, 'getBoundingClientRect').mockReturnValue(rect(0, 240));
    opener.focus(); fireEvent.click(opener);
    expect(opener).toHaveFocus(); expect(draft(narrow)).toEqual([all[1], all[0], ...all.slice(2)]);
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    narrow.unmount(); localStorage.clear(); vi.mocked(recordCompletion).mockClear();
    const replay = await mount(); pickAll(replay, all.slice(0, 4));
    const undoButton = choice(replay, 'Undo last');
    vi.spyOn(lock(replay), 'getBoundingClientRect').mockReturnValue(rect(-80, 48));
    vi.spyOn(undoButton, 'getBoundingClientRect').mockReturnValue(rect(20, 44));
    choice(replay, all[4]).focus(); fireEvent.click(choice(replay, all[4]));
    expect(undoButton).toHaveFocus(); expect(draft(replay)).toEqual(all);
    expect(fireEvent.keyDown(undoButton, { key: 'Enter', repeat: true })).toBe(false);
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    replay.unmount(); localStorage.clear(); vi.mocked(recordCompletion).mockClear();
    const lowPool = await mount(); pickAll(lowPool, all.slice(0, 2));
    const rowRemove = choice(lowPool, `Remove ${all[0]}`);
    for (const button of lowPool.container.querySelectorAll('button')) vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(rect(900, 44));
    vi.spyOn(rowRemove, 'getBoundingClientRect').mockReturnValue(rect(20, 44));
    vi.spyOn(lowPool.container.querySelector<HTMLElement>('[data-rank-ladder]')!, 'getBoundingClientRect').mockReturnValue(rect(0, 200));
    const lowOpener = choice(lowPool, all[2]); lowOpener.focus(); fireEvent.click(lowOpener);
    expect(rowRemove).toHaveFocus(); expect(draft(lowPool)).toEqual([...all.slice(0, 3), 'Pick a player', 'Pick a player']);
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('allows only one same-frame unlimited lock and never books draft or unlimited edits', async () => {
    const view = await mount(); fireEvent.click(choice(view, '∞ Unlimited')); pickAll(view);
    const button = lock(view); act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(view.getByRole('region', { name: 'Rank result' })).toHaveAttribute('data-rank-action-count', '1');
    expect(localStorage.getItem(key)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('restores finished orders and mode round trips quietly without rebooking', async () => {
    const all = names(); localStorage.setItem(key, JSON.stringify(saveFor(all))); const initial = localStorage.getItem(key), writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = await mount(); expect(view.getByText('5 / 5 correct')).toBeVisible(); expect(view.container.querySelector('[data-rank-cue]')).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    fireEvent.click(choice(view, '∞ Unlimited')); pickAll(view); expect(localStorage.getItem(key)).toBe(initial); expect(writes).not.toHaveBeenCalled();
    fireEvent.click(choice(view, '📅 Daily')); expect(view.getByText('5 / 5 correct')).toBeVisible(); expect(recordCompletion).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-rank-cue]')).toBeNull();
  });

  it('reveals only an actual committed result and retains clone identity through finite cleanup', async () => {
    const view = await mount(); expect(view.container.querySelector('[data-rank-cue]')).toBeNull(); pickAll(view); expect(view.container.querySelector('[data-rank-cue]')).toBeNull();
    fireEvent.click(lock(view)); const result = view.getByRole('region', { name: 'Rank result' }), rungs = [...view.container.querySelectorAll('[data-rank-slot]')];
    expect(result).toHaveAttribute('data-rank-cue', 'committed'); expect(result).toHaveClass(styles.committed);
    view.rerender(element()); expect(view.getByRole('region', { name: 'Rank result' })).toBe(result);
    for (let i = 0; i < 5; i++) expect(view.container.querySelectorAll('[data-rank-slot]')[i]).toBe(rungs[i]);
    act(() => vi.advanceTimersByTime(650)); expect(result).not.toHaveAttribute('data-rank-cue'); expect(result).not.toHaveClass(styles.committed);
    view.rerender(element()); expect(result).not.toHaveAttribute('data-rank-cue'); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps complete names targets and finite reduced-motion styles bound to the actual page', async () => {
    const view = await mount(); pickAll(view);
    for (const row of view.container.querySelectorAll<HTMLElement>('[data-rank-slot]')) expect(row.querySelector('[data-rank-name]')).toHaveClass(styles.fullText);
    for (const name of names()) expect(choice(view, name)).toHaveClass(styles.action, styles.fullText);
    expect(lock(view)).toHaveClass(styles.action); expect(within(view.container.querySelectorAll<HTMLElement>('[data-rank-slot]')[1]).getByRole('button', { name: /Remove/ })).toHaveClass(styles.action);
    expect(view.container.querySelector('[data-rank-ladder]')).toHaveClass(styles.ladder);
    const css = readFileSync(process.env.RANK_ORDER_CSS || path.resolve('src/pages/RankEmOrder.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/min-height:\s*44px;\s*min-width:\s*44px;/); expect(css).toMatch(/animation:\s*orderReveal 420ms ease-out 1;/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[^}]+\.committed\s*\{\s*animation:\s*none;/); expect(css).toMatch(/overflow-wrap:\s*anywhere;/);
    expect(css).toMatch(/max-height:\s*200px;\s*overflow-y:\s*auto;/);
  });
});
