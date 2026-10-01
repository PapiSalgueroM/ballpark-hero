import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ClueAuction from '@/pages/ClueAuction';
import { CLUE_MENU, buildClueReveals } from '@/lib/clueAuction';
import { fetchWhoAmIPool, type WhoAmIData, type WhoAmIPlayer } from '@/lib/whoAmI';
import { recordCompletion } from '@/lib/completions';
import { getStreakState } from '@/lib/streaks';
import styles from '@/pages/ClueAuction.module.css';

const sink = vi.hoisted(() => ({ rows: [] as unknown[], session: vi.fn(async () => ({ data: { session: null } })) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ insert: (row: unknown) => { sink.rows.push(row); return Promise.resolve({ error: null }); } }),
  auth: { getSession: sink.session },
} }));
vi.mock('@/lib/whoAmI', async original => ({ ...await original<typeof import('@/lib/whoAmI')>(), fetchWhoAmIPool: vi.fn(async () => data) }));
vi.mock('@/lib/completions', async original => {
  const actual = await original<typeof import('@/lib/completions')>();
  return { ...actual, recordCompletion: vi.fn(actual.recordCompletion) };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const player = (name: string, index: number): WhoAmIPlayer => ({ name, personKey: `fixture-person-${index}`, nationality: 'Fixture Nation',
  position: 'Attacking Midfield', club: `Fixture club ${index}`, value: 90_000_000 - index * 1_000_000, age: 24, year: 2025 });
const secret = player('Fixture Alder', 0);
const misses = Array.from({ length: 11 }, (_, index) => player(`Fixture Other ${String(index).padStart(2, '0')}`, index + 1));
let data: WhoAmIData;
const clipboard = vi.fn(async () => {});
const element = () => <MemoryRouter initialEntries={['/clue-auction']}><HelmetProvider><ClueAuction /></HelmetProvider></MemoryRouter>;
const start = async () => {
  const view = render(element());
  await view.findByRole('textbox', { name: 'Name the secret player' });
  return view;
};
const search = (view: ReturnType<typeof render>, query = 'Fixture') => {
  const input = view.getByRole('textbox'); act(() => input.focus());
  fireEvent.change(input, { target: { value: query } }); return input;
};
const guess = (view: ReturnType<typeof render>, p: WhoAmIPlayer, pointer = false) => {
  search(view, p.name);
  const option = view.getByRole('button', { name: new RegExp(p.name) });
  if (pointer) { fireEvent.mouseDown(option); fireEvent.click(option, { detail: 1 }); }
  else fireEvent.click(option, { detail: 0 });
};
const buy = (view: ReturnType<typeof render>, id: string) => {
  const card = view.container.querySelector<HTMLElement>(`[data-auction-clue="${id}"]`)!;
  fireEvent.click(within(card).getByRole('button')); return card;
};
const cue = (view: ReturnType<typeof render>) => view.container.querySelector('[data-auction-feedback]');
const clock = () => { vi.useRealTimers(); vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); };
const settle = () => act(() => vi.advanceTimersByTime(700));

beforeEach(() => {
  localStorage.clear(); localStorage.setItem('dukb-guest-handle', 'FixtureBaller');
  vi.clearAllMocks(); sink.rows = [];
  data = { pool: [secret, ...misses], clubHistory: new Map([[secret.personKey, new Set(['fixture club 0'])]]) };
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Clue Auction committed feedback and native controls', () => {
  it('keeps the real clue values, exact prices and unavailable clue without spending on boot', async () => {
    const view = await start();
    expect(CLUE_MENU.map(c => c.price)).toEqual([25, 15, 10, 10, 20, 35, 10, 30]);
    expect(buildClueReveals(secret, data.clubHistory.get(secret.personKey), new Map()).formerClub).toBeNull();
    const former = view.container.querySelector('[data-auction-clue="formerClub"]')!;
    expect(former).toHaveTextContent('Not available for this player'); expect(within(former as HTMLElement).queryByRole('button')).toBeNull();
    expect(cue(view)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled(); expect(sink.rows).toEqual([]);
    expect(localStorage.getItem('clue_auction_best_v1')).toBeNull(); expect(getStreakState().totalPlays).toBe(0);
  });

  it('retains the focused non-first suggestion and commits keyboard selection once', async () => {
    const view = await start(); const input = search(view);
    const option = view.getByRole('button', { name: /Fixture Other 00/ });
    fireEvent.blur(input, { relatedTarget: option }); act(() => option.focus());
    expect(option).toHaveFocus(); expect(option.isConnected).toBe(true);
    fireEvent.click(option, { detail: 0 });
    expect(view.container.querySelectorAll('[data-auction-wrong]')).toHaveLength(1);
    expect(view.container.querySelector('[data-auction-wrong]')).toHaveAttribute('data-auction-wrong', misses[0].name);
    expect(cue(view)).toHaveTextContent('Wrong guess. 90 points left.');
    expect(input).toHaveFocus(); expect(recordCompletion).not.toHaveBeenCalled();
    expect(view.queryByRole('button', { name: /Fixture Other 00/ })).toBeNull();
    search(view); const next = view.getByRole('button', { name: /Fixture Other 01/ });
    act(() => next.focus()); fireEvent.keyDown(next, { key: 'Escape' });
    expect(input).toHaveFocus(); expect(input).toHaveValue(''); expect(next.isConnected).toBe(false);
  });

  it('preserves pointer-before-blur and input Enter, while Escape and outside blur spend nothing', async () => {
    const view = await start(); guess(view, misses[0], true);
    expect(view.container.querySelectorAll('[data-auction-wrong]')).toHaveLength(1);
    const input = search(view, misses[1].name);
    fireEvent.keyDown(input, { key: 'Enter', repeat: true });
    expect(view.container.querySelectorAll('[data-auction-wrong]')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(view.container.querySelectorAll('[data-auction-wrong]')).toHaveLength(2);
    search(view); fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue(''); expect(view.queryByRole('button', { name: /Fixture Alder/ })).toBeNull();
    search(view); fireEvent.blur(input, { relatedTarget: document.body });
    expect(view.queryByRole('button', { name: /Fixture Alder/ })).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('reveals a bought clue at its exact cost, stable node and focus without duplicate purchases', async () => {
    const view = await start(); const card = view.container.querySelector<HTMLElement>('[data-auction-clue="nationality"]')!;
    const button = within(card).getByRole('button'); act(() => button.focus()); fireEvent.click(button);
    expect(card).toHaveFocus(); expect(view.container.querySelector('[data-auction-clue="nationality"]')).toBe(card);
    expect(card).toHaveClass(styles.reveal); expect(card).toHaveAttribute('data-auction-reveal', 'committed');
    expect(card).toHaveTextContent('Fixture Nation'); expect(cue(view)).toHaveTextContent('Nationality bought for 25. 75 points left.');
    fireEvent.click(button);
    expect(cue(view)).toHaveTextContent('75 points left'); expect(recordCompletion).not.toHaveBeenCalled();
    buy(view, 'club'); expect(cue(view)).toHaveTextContent('Current club bought for 35. 40 points left.');
    expect(card).not.toHaveClass(styles.reveal);
  });

  it('preserves exact win score, actual completion storage and custom share text once per case', async () => {
    const view = await start(); buy(view, 'nationality'); buy(view, 'club'); guess(view, misses[0]); guess(view, secret);
    expect(view.getByRole('heading', { name: 'Solved it with 30 points left' })).toHaveFocus();
    expect(cue(view)).toHaveAttribute('data-auction-feedback', 'won'); expect(cue(view)).toHaveTextContent('Solved. 30 points banked.');
    expect(view.container.querySelector('[data-auction-result="won"]')).toHaveClass(styles.resultCue);
    expect(view.queryByText('Wrong guess!')).toBeNull(); expect(view.container.querySelector('[data-auction-miss]')).toBeNull();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/clue-auction', 30, 'FixtureBaller');
    expect(sink.rows).toEqual([{ game: 'clue-auction', score: 30, player_name: 'FixtureBaller' }]);
    expect(localStorage.getItem('clue_auction_best_v1')).toBe('30'); expect(getStreakState()).toMatchObject({ totalPlays: 1, totalPoints: 30 });
    expect(view.getByText('24 (2025 list)')).toBeVisible();
    await act(async () => fireEvent.click(view.getByRole('button', { name: 'Share result' })));
    const expectedText = 'Solved it with 30 points left on Clue Auction at DoUKnowBall! Can you beat me? douknowball.com/clue-auction';
    expect(clipboard).toHaveBeenCalledExactlyOnceWith(expectedText);
    const outward = vi.spyOn(window, 'open').mockReturnValue(null);
    fireEvent.click(view.getByRole('button', { name: 'Share on X' }));
    expect(outward).toHaveBeenCalledExactlyOnceWith(`https://twitter.com/intent/tweet?text=${encodeURIComponent(expectedText)}`, '_blank', 'noopener,noreferrer');
    expect(view.container.querySelector('pre')).toHaveTextContent('💰 Clue Auction: 30/100 banked');
    view.rerender(element()); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps the exact unaffordable boundary and final wrong bank floor with one loss cue', async () => {
    const view = await start(); buy(view, 'nationality'); buy(view, 'club'); buy(view, 'clubInitial'); buy(view, 'valueBand');
    expect(cue(view)).toHaveTextContent('10 points left.');
    const age = view.container.querySelector<HTMLElement>('[data-auction-clue="ageBracket"]')!;
    const blocked = within(age).getByRole('button'); expect(blocked).toBeDisabled(); fireEvent.click(blocked);
    expect(age).not.toHaveAttribute('data-auction-reveal');
    guess(view, misses[0]); expect(cue(view)).toHaveAttribute('data-auction-feedback', 'lost');
    expect(view.getByRole('heading', { name: 'Bank empty. Case closed.' })).toHaveFocus();
    expect(view.container.querySelector('[data-auction-result="lost"]')).toHaveClass(styles.resultCue);
    expect(view.container.querySelector('[data-auction-miss]')).toBeNull();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/clue-auction', 0, 'FixtureBaller');
    expect(getStreakState()).toMatchObject({ totalPlays: 1, totalPoints: 0 }); expect(localStorage.getItem('clue_auction_best_v1')).toBeNull();
  });

  it('keeps active clones on the same cue and settles without replay or retained timers', async () => {
    const view = await start(); clock(); buy(view, 'nationality'); const card = view.container.querySelector('[data-auction-clue="nationality"]'); const firstCue = cue(view);
    act(() => vi.advanceTimersByTime(300)); view.rerender(element());
    expect(cue(view)).toBe(firstCue); expect(view.container.querySelector('[data-auction-clue="nationality"]')).toBe(card);
    act(() => vi.advanceTimersByTime(301)); expect(cue(view)).toBeNull(); expect(card).not.toHaveClass(styles.reveal);
    view.rerender(element()); expect(cue(view)).toBeNull();
    guess(view, misses[0]); const miss = view.container.querySelector('[data-auction-wrong]'); expect(miss).toHaveClass(styles.miss);
    settle(); expect(cue(view)).toBeNull(); view.rerender(element()); expect(cue(view)).toBeNull();
    guess(view, misses[1]); expect(view.container.querySelector('[data-auction-wrong]')).toBe(miss); expect(miss).not.toHaveClass(styles.miss);
    expect(vi.getTimerCount()).toBeGreaterThan(0); view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });

  it('resets a new case quietly, preserves loaded best and records a later finish once', async () => {
    localStorage.setItem('clue_auction_best_v1', '95'); const view = await start(); clock();
    expect(view.getByText('95')).toBeVisible(); expect(cue(view)).toBeNull(); guess(view, secret);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole('button', { name: 'New case' }));
    expect(cue(view)).toBeNull(); expect(view.container.querySelectorAll('[data-auction-wrong]')).toHaveLength(0);
    expect(view.getByRole('textbox')).toHaveValue(''); settle(); expect(cue(view)).toBeNull();
    guess(view, misses[0]); expect(recordCompletion).toHaveBeenCalledTimes(2);
    expect(vi.mocked(recordCompletion).mock.calls.map(args => args[1])).toEqual([100, 100]);
    expect(getStreakState()).toMatchObject({ totalPlays: 2, totalPoints: 200 }); expect(localStorage.getItem('clue_auction_best_v1')).toBe('100');
  });

  it('retains actual guide content and owned44px controls, without changing the fetch boundary', async () => {
    const view = await start(); const help = await view.findByRole('button', { name: 'How to play' });
    expect(view.getByText(/Example: buy the 10-point age bracket/)).toBeVisible();
    expect(help).toHaveClass('min-h-[44px]'); fireEvent.click(help);
    const dialog = await view.findByRole('dialog'); expect(dialog).toHaveTextContent('A worked example');
    expect(dialog).toHaveTextContent('a clue can only be bought while you hold more than its price');
    fireEvent.click(within(dialog).getByRole('button', { name: "Let's Play!" }));
    for (const node of view.container.querySelectorAll('[data-auction-clue] button')) expect(node).toHaveClass('min-h-[44px]');
    expect(fetchWhoAmIPool).toHaveBeenCalledTimes(1); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
