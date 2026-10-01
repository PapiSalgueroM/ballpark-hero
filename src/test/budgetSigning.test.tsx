import { act, cleanup, fireEvent, render, renderHook, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetBuilderBoard } from '@/components/budget-builder/BudgetBuilderBoard';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import type { BudgetBuilderState } from '@/hooks/useBudgetBuilder';
import type { Player } from '@/types/game';
import { recordCompletion } from '@/lib/completions';
import styles from '@/components/budget-builder/BudgetBuilderBoard.module.css';

const boundary = vi.hoisted(() => ({ refuse: false, state: null as BudgetBuilderState | null, signs: vi.fn(), releases: vi.fn() }));
vi.mock('@/hooks/useBudgetBuilder', async original => {
  const actual = await original<typeof import('@/hooks/useBudgetBuilder')>();
  return { ...actual, useBudgetBuilder: () => {
    const state = actual.useBudgetBuilder(); boundary.state = state;
    return { ...state, sign: (player: Player) => { boundary.signs(player); if (!boundary.refuse) state.sign(player); },
      release: (slot: number) => { boundary.releases(slot); if (!boundary.refuse) state.release(slot); } };
  } };
});
vi.mock('@/lib/squadDeal', async original => ({ ...await original<typeof import('@/lib/squadDeal')>(), fetchSquadPool: async () => pool }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));

const player = (name: string, position: Player['position'], marketValue: number): Player => ({
  name, position, marketValue, nationality: 'Fixture Nation', club: `Fixture club ${name}`, league: 'Other',
  age: 22, goals: 0, assists: 0, kitNumber: null, difficulty: 'easy',
});
const xi = FORMATIONS[0].slots.map((slot, index) => player(`Fixture player ${index}`, slot.allowed[0], 40));
const replacement = player('Fixture boundary keeper', 'GK', 1000);
const tooDear = player('Fixture over budget keeper', 'GK', 1001);
let pool: Player[];
const rng = (seed: number) => () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
const writeText = vi.fn(async () => {});

beforeEach(() => {
  pool = [...xi, replacement, tooDear]; boundary.refuse = false; boundary.state = null;
  vi.clearAllMocks(); localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(rng(77));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const start = async () => {
  const view = render(<BudgetBuilderBoard />);
  await view.findByRole('button', { name: 'GK slot 1: empty' });
  return view;
};
const slot = (view: ReturnType<typeof render>, index = 0) => view.container.querySelector<HTMLButtonElement>(`[data-budget-slot="${index}"]`)!;
const open = (view: ReturnType<typeof render>, index = 0) => { slot(view, index).focus(); fireEvent.click(slot(view, index)); };
const preview = (view: ReturnType<typeof render>, value: Player) => {
  const search = view.container.querySelector<HTMLInputElement>('input[aria-label="Search eligible players by name or club"]')!;
  fireEvent.change(search, { target: { value: value.name } });
  const button = [...view.container.querySelectorAll<HTMLButtonElement>('button[aria-label]')].find(node => node.getAttribute('aria-label') === `Preview signing ${value.name} for $${value.marketValue}M`)!;
  expect(button).toBeDefined();
  fireEvent.click(button); return button;
};
const confirm = (view: ReturnType<typeof render>) => {
  const button = [...view.container.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === 'Confirm signing')!;
  expect(button).toBeDefined(); fireEvent.click(button);
};
const field = (view: ReturnType<typeof render>, label: string) => within(view.container.querySelector<HTMLElement>('[data-budget-preview]')!).getByText(label).nextElementSibling;
const sign = (view: ReturnType<typeof render>, value: Player, index = 0) => { open(view, index); preview(view, value); confirm(view); };

describe('Budget Builder signing decisions', () => {
  it('previews exact existing values without spending and cancels back to the original candidate', async () => {
    const view = await start(); open(view);
    expect(view.getByRole('textbox')).toHaveFocus();
    const candidate = preview(view, xi[0]);
    expect(field(view, 'Signing cost')).toHaveTextContent('$40M');
    expect(field(view, 'Replacement refund')).toHaveTextContent('$0M');
    expect(field(view, 'Remaining after signing')).toHaveTextContent('$960M');
    expect(field(view, 'XI rating after signing')).toHaveTextContent(String(playerRating(xi[0])));
    expect(field(view, 'Signed after this choice')).toHaveTextContent('1/11');
    const current = boundary.state!;
    expect(field(view, 'Demand condition after signing')).toHaveTextContent(current.criterion.check([xi[0]], 1000, 960) ? 'Met so far' : 'Not met yet');
    expect(current.spent).toBe(0); expect(current.squad).toEqual({});
    expect(boundary.signs).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
    fireEvent.click(view.getByRole('button', { name: 'Cancel preview' }));
    expect(candidate).toHaveFocus(); expect(view.container.querySelector('[data-budget-preview]')).toBeNull();
    expect(boundary.state!.spent).toBe(0);
  });

  it('commits the original candidate once, retains the stable slot and returns exact focus', async () => {
    const view = await start(); const originalSlot = slot(view); sign(view, xi[0]);
    expect(boundary.signs).toHaveBeenCalledExactlyOnceWith(xi[0]);
    expect(boundary.signs.mock.calls[0][0]).toBe(xi[0]); expect(boundary.state!.squad[0]).toBe(xi[0]);
    expect(boundary.state!.remaining).toBe(960); expect(boundary.state!.teamRating).toBe(playerRating(xi[0]));
    expect(slot(view)).toBe(originalSlot); expect(originalSlot).toHaveFocus();
    expect(view.queryByRole('region', { name: 'Signing shortlist' })).toBeNull();
    expect(view.container.querySelector('[data-budget-feedback="committed"]')).toHaveTextContent('Fixture player 0 signed for $40M.');
    expect(originalSlot).toHaveAttribute('data-budget-slot-feedback', 'committed');
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('returns cancel focus to search when filtering removes the original preview button', async () => {
    const view = await start(); open(view); const candidate = preview(view, xi[0]);
    const search = view.getByRole('textbox');
    fireEvent.change(search, { target: { value: 'Fixture no matching player' } });
    expect(candidate.isConnected).toBe(false);
    expect(view.getByRole('button', { name: 'Confirm signing' })).toBeDisabled();
    expect(view.container.querySelector('[data-budget-preview]')).not.toBeNull();
    const cancel = view.getByRole('button', { name: 'Cancel preview' });
    cancel.focus(); fireEvent.click(cancel);
    expect(search).toHaveFocus();
    expect(view.container.querySelector('[data-budget-preview]')).toBeNull();
    expect(boundary.signs).not.toHaveBeenCalled(); expect(boundary.state!.spent).toBe(0);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('uses the replacement refund at the exact budget boundary and excludes a more expensive choice', async () => {
    const view = await start(); sign(view, xi[0]); open(view);
    expect(view.queryByRole('button', { name: `Preview signing ${tooDear.name} for $1001M` })).toBeNull();
    preview(view, xi[0]); expect(view.getByRole('button', { name: 'Confirm signing' })).toBeDisabled();
    preview(view, replacement);
    expect(field(view, 'Replacement refund')).toHaveTextContent('$40M');
    expect(field(view, 'Remaining after signing')).toHaveTextContent('$0M');
    expect(field(view, 'Signed after this choice')).toHaveTextContent('1/11'); confirm(view);
    expect(boundary.state!.squad[0]).toBe(replacement); expect(boundary.state!.spent).toBe(1000);
    expect(boundary.state!.remaining).toBe(0); expect(boundary.state!.filled).toBe(1);
  });

  it('keeps refused sign and release callbacks open and quiet, without crediting a later unrelated state change', async () => {
    const view = await start(); open(view); preview(view, xi[0]); boundary.refuse = true; confirm(view);
    expect(view.getByRole('region', { name: 'Signing shortlist' })).toBeVisible();
    expect(view.container.querySelector('[data-budget-preview]')).not.toBeNull();
    expect(view.container.querySelector('[data-budget-feedback]')).toBeNull(); expect(boundary.state!.spent).toBe(0);
    act(() => boundary.state!.sign(xi[0]));
    expect(view.container.querySelector('[data-budget-feedback]')).toBeNull();
    open(view); fireEvent.click(view.getByRole('button', { name: 'Release Fixture player 0 (+$40M)' }));
    expect(view.getByRole('region', { name: 'Signing shortlist' })).toBeVisible();
    expect(boundary.state!.squad[0]).toBe(xi[0]); expect(boundary.state!.remaining).toBe(960);
    expect(view.container.querySelector('[data-budget-feedback]')).toBeNull();
  });

  it('releases the exact slot only after committed truth, returning the exact refund and stable slot focus', async () => {
    const view = await start(); sign(view, xi[0]); const originalSlot = slot(view); open(view);
    fireEvent.click(view.getByRole('button', { name: 'Release Fixture player 0 (+$40M)' }));
    expect(boundary.releases).toHaveBeenCalledExactlyOnceWith(0); expect(boundary.state!.squad[0]).toBeUndefined();
    expect(boundary.state!.remaining).toBe(1000); expect(boundary.state!.filled).toBe(0);
    expect(view.queryByRole('region', { name: 'Signing shortlist' })).toBeNull();
    expect(slot(view)).toBe(originalSlot); expect(originalSlot).toHaveFocus();
    expect(view.container.querySelector('[data-budget-feedback]')).toHaveTextContent('Fixture player 0 released. $40M returned.');
  });

  it('closes and escapes to the exact opener without signing, and truthfully keeps the top sixty bound', async () => {
    pool = Array.from({ length: 75 }, (_, index) => player(`Fixture keeper ${index}`, 'GK', 100 - index));
    const view = await start(); open(view);
    expect(view.getAllByRole('button', { name: /^Preview signing/ })).toHaveLength(60);
    expect(view.getByText('Showing 60 of up to 60 eligible matches, highest value first. Search to narrow the shortlist.')).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Close signing shortlist' })); expect(slot(view)).toHaveFocus();
    open(view); fireEvent.keyDown(view.getByRole('textbox'), { key: 'Escape' }); expect(slot(view)).toHaveFocus();
    expect(boundary.signs).not.toHaveBeenCalled(); expect(boundary.state!.squad).toEqual({});
    open(view); preview(view, pool[74]); expect(view.getAllByRole('button', { name: /^Preview signing/ })).toHaveLength(1);
    expect(field(view, 'Signing cost')).toHaveTextContent('$26M');
  });

  it('keeps cues finite, quiet on cloned rerenders and cleared by reset or unmount', async () => {
    const view = await start(); vi.useRealTimers(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); sign(view, xi[0]);
    const cue = view.container.querySelector('[data-budget-feedback]'); const originalSlot = slot(view);
    expect(cue).toHaveClass(styles.feedback);
    act(() => vi.advanceTimersByTime(200)); view.rerender(<BudgetBuilderBoard />);
    expect(view.container.querySelector('[data-budget-feedback]')).toBe(cue); expect(slot(view)).toBe(originalSlot);
    act(() => vi.advanceTimersByTime(400)); expect(view.container.querySelector('[data-budget-feedback]')).toBeNull();
    view.rerender(<BudgetBuilderBoard />); expect(view.container.querySelector('[data-budget-feedback]')).toBeNull();
    sign(view, xi[1], 1); fireEvent.click(view.getByRole('button', { name: 'Reset' }));
    expect(view.container.querySelector('[data-budget-feedback]')).toBeNull(); expect(boundary.state!.spent).toBe(0);
    sign(view, xi[0]); expect(vi.getTimerCount()).toBeGreaterThan(0); view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the complete original XI, final score, series, completion and share against the unchanged hook', async () => {
    const view = await start();
    for (let index = 0; index < 11; index++) sign(view, xi[index], index);
    const boardState = boundary.state!; expect(boardState.complete).toBe(true); expect(boardState.spent).toBe(440);
    const actual = await vi.importActual<typeof import('@/hooks/useBudgetBuilder')>('@/hooks/useBudgetBuilder');
    const baseline = renderHook(() => actual.useBudgetBuilder()); await waitFor(() => expect(baseline.result.current.loading).toBe(false));
    for (let index = 0; index < 11; index++) {
      act(() => baseline.result.current.setActiveSlot(index)); act(() => baseline.result.current.sign(xi[index]));
    }
    expect(boardState.squad).toEqual(baseline.result.current.squad);
    expect(boardState.finalScore).toBe(baseline.result.current.finalScore);
    vi.mocked(Math.random).mockImplementation(rng(901)); fireEvent.click(view.getByRole('button', { name: /Play the Final vs the Money XI/ }));
    const final = boundary.state!;
    vi.mocked(Math.random).mockImplementation(rng(901)); act(() => baseline.result.current.playFinal());
    expect(final.series).toEqual(baseline.result.current.series); expect(final.finalScore).toBe(baseline.result.current.finalScore);
    expect(final.shareText).toBe(baseline.result.current.shareText);
    expect(view.getByText(`Score: ${final.finalScore}`)).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    expect(recordCompletion).toHaveBeenNthCalledWith(1, '/budget-builder', final.finalScore, null, final.teamRating);
    fireEvent.click(view.getByRole('button', { name: 'Share my XI' })); await waitFor(() => expect(writeText).toHaveBeenCalledExactlyOnceWith(final.shareText));
    expect(localStorage.length).toBe(0);
  });
});
