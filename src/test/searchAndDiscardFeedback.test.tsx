import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchAndDiscard from '@/pages/SearchAndDiscard';
import feedback from '@/pages/SearchAndDiscard.module.css';
import { SD_FORMATION, applyKeep, cpuKeep, drawOffer, duelOver, emptySlots, newDuel, sdFits, settleSeason, type SdState } from '@/lib/searchDiscard';
import * as duel from '@/lib/searchDiscard';
import { playerRating } from '@/lib/squadDeal';
import { recordCompletion } from '@/lib/completions';
import type { Player, Position } from '@/types/game';

vi.mock('@/lib/squadDeal', async original => ({ ...await original<typeof import('@/lib/squadDeal')>(), fetchSquadPool: async () => pool }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', async original => ({ ...await original<typeof import('@/lib/completions')>(), recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/lib/badges', async original => ({ ...await original<typeof import('@/lib/badges')>(), getNewlyEarnedBadges: async () => [] }));

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CM', 'CDM', 'CAM', 'LW', 'RW', 'ST', 'CF'];
const pool: Player[] = Array.from({ length: 176 }, (_, index) => ({
  name: `Fixture Valen Mosswick ${index}`, club: 'Fixture Caldermere club', nationality: 'England', league: 'Other',
  goals: 0, assists: 0, position: POSITIONS[index % POSITIONS.length], kitNumber: null,
  age: 20 + index % 15, marketValue: 10 + index % 40, difficulty: 'easy', fixedOverall: 65 + index % 30,
}));
const SEED = Math.floor(0.25 * 2147483645) + 1;
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(0.25); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const ready = async () => {
  const view = render(<HelmetProvider><MemoryRouter initialEntries={['/search-and-discard']}><SearchAndDiscard /></MemoryRouter></HelmetProvider>);
  await view.findByRole('button', { name: /Pass and play/ });
  return view;
};
const start = async (mode: 'cpu' | 'pass' = 'pass') => {
  const view = await ready();
  fireEvent.click(view.getByRole('button', { name: mode === 'cpu' ? /Versus the CPU/ : /Pass and play/ }));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  return { view, model: newDuel(pool, SEED) };
};
const slots = (view: Awaited<ReturnType<typeof ready>>) => [...view.container.querySelectorAll<HTMLButtonElement>('[data-sd-slot]')];
const offers = (view: Awaited<ReturnType<typeof ready>>) => [...view.container.querySelectorAll<HTMLButtonElement>('[data-sd-offer]')];
const slot = (view: Awaited<ReturnType<typeof ready>>, side: number, index: number) => view.container.querySelector<HTMLButtonElement>(`[data-sd-slot="${side}:${index}"]`)!;
const currentOffers = (view: Awaited<ReturnType<typeof ready>>) => offers(view).map(node => node.dataset.sdOffer);
const pulseCount = (view: Awaited<ReturnType<typeof ready>>) => view.container.querySelectorAll(`.${feedback.kept}`).length;
const sameSlots = (view: Awaited<ReturnType<typeof ready>>, nodes: HTMLButtonElement[]) => { expect(slots(view)).toHaveLength(nodes.length); slots(view).forEach((node, index) => expect(node).toBe(nodes[index])); };
const commit = (view: Awaited<ReturnType<typeof ready>>, model: SdState, offer: Player[]) => {
  const choice = cpuKeep(model, offer);
  const option = offers(view).find(node => node.dataset.sdOffer === choice.keep.name)!;
  option.focus(); fireEvent.click(option);
  const target = slot(view, model.turn, choice.slotIndex);
  expect(target).toBeEnabled(); fireEvent.click(target);
  return { next: applyKeep(model, offer, choice.keep, choice.slotIndex), choice, target };
};

describe('actual Search and Discard committed presentation', () => {
  it('retains all22 slot nodes through selection, cancellation, cloned renders and committed keeps', async () => {
    const { view, model } = await start();
    const nodes = slots(view), offer = drawOffer(model);
    expect(view.container.querySelector(`#dukb-main > .${feedback.page}`)).not.toBeNull();
    expect(nodes).toHaveLength(22); expect(currentOffers(view)).toEqual(offer.map(player => player.name));
    const choice = cpuKeep(model, offer), option = offers(view).find(node => node.dataset.sdOffer === choice.keep.name)!;
    option.focus(); fireEvent.click(option);
    sameSlots(view, nodes); expect(pulseCount(view)).toBe(0);
    for (const node of slots(view)) expect(node.className).not.toContain('animate-pulse');
    fireEvent.click(option); sameSlots(view, nodes); expect(slots(view).every(node => node.disabled)).toBe(true);
    expect(pulseCount(view)).toBe(0); expect(view.container.querySelectorAll('[data-sd-discard]')).toHaveLength(0);
    const { target } = commit(view, model, offer);
    sameSlots(view, nodes); expect(target).toBeDisabled(); expect(target).toHaveTextContent(choice.keep.name);
    expect(target).toHaveClass(feedback.kept); expect(pulseCount(view)).toBe(1);
    const dropped = offer.filter(player => player !== choice.keep);
    for (const player of dropped) expect(view.container.querySelector(`[data-sd-discard="${player.name}"]`)).toHaveClass(feedback.discarded);
    view.rerender(<HelmetProvider><MemoryRouter initialEntries={['/search-and-discard']}><SearchAndDiscard /></MemoryRouter></HelmetProvider>);
    sameSlots(view, nodes); expect(pulseCount(view)).toBe(1);
    act(() => vi.advanceTimersByTime(501)); expect(pulseCount(view)).toBe(0);
    expect(view.container.querySelectorAll(`.${feedback.discarded}`)).toHaveLength(0);
    sameSlots(view, nodes); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('focuses a non-first chosen offer target and returns to the next reachable search without page scrolling', async () => {
    const { view, model } = await start(); const offer = drawOffer(model);
    const chosen = offer.slice(1).find(player => emptySlots(model, 0).some(index => sdFits(player, SD_FORMATION.slots[index])))!;
    expect(chosen).toBeDefined();
    const option = offers(view).find(node => node.dataset.sdOffer === chosen.name)!;
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    option.focus(); fireEvent.click(option);
    const index = emptySlots(model, 0).find(value => sdFits(chosen, SD_FORMATION.slots[value]))!;
    const target = slot(view, 0, index); expect(target).toHaveFocus();
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(target).toHaveAccessibleName(`Manager A, ${SD_FORMATION.slots[index].label}: Keep ${chosen.name} here`);
    expect(fireEvent.keyDown(target, { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.click(target);
    const next = applyKeep(model, offer, chosen, index), nextOffer = drawOffer(next);
    expect(currentOffers(view)).toEqual(nextOffer.map(player => player.name));
    expect(offers(view).find(node => !node.disabled)).toHaveFocus();
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(target).toHaveAccessibleName(`Manager A, ${SD_FORMATION.slots[index].label}: ${chosen.name}, rating ${playerRating(chosen)}`);
  });

  it('scrolls only the chosen squad column when its compatible keyboard target is below view', async () => {
    const { view, model } = await start(); const offer = drawOffer(model), choice = cpuKeep(model, offer);
    const target = slot(view, 0, choice.slotIndex), column = view.container.querySelector<HTMLElement>('[data-sd-squad="0"]')!;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 600, bottom: 644 } as DOMRect);
    vi.spyOn(column, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 452 } as DOMRect);
    fireEvent.click(offers(view).find(node => node.dataset.sdOffer === choice.keep.name)!);
    expect(target).toHaveFocus(); expect(column.scrollTop).toBe(196);
    expect(window.scrollY).toBe(0);
  });

  it('keeps the exact CPU delay, cues only its actual keep and leaves external dialog focus alone', async () => {
    const { view, model } = await start('cpu'); let offer = drawOffer(model);
    const nodes = slots(view), first = commit(view, model, offer); let next = first.next;
    const heading = view.container.querySelector('[data-sd-turn]')!;
    expect(heading).toHaveFocus(); expect(offers(view).every(node => node.disabled)).toBe(true);
    act(() => vi.advanceTimersByTime(1099)); expect(slot(view, 1, 0).dataset.sdPlayer).toBe('');
    sameSlots(view, nodes); expect(pulseCount(view)).toBe(0);
    const dialog = document.createElement('div'), input = document.createElement('input'); dialog.setAttribute('role', 'dialog'); dialog.append(input); document.body.append(dialog); input.focus();
    offer = drawOffer(next); const pick = cpuKeep(next, offer); next = applyKeep(next, offer, pick.keep, pick.slotIndex);
    act(() => vi.advanceTimersByTime(1));
    sameSlots(view, nodes); expect(slot(view, 1, pick.slotIndex)).toHaveClass(feedback.kept);
    expect(slot(view, 1, pick.slotIndex)).toHaveTextContent(pick.keep.name);
    expect(input).toHaveFocus(); expect(currentOffers(view)).toEqual(drawOffer(next).map(player => player.name));
    dialog.remove(); act(() => vi.advanceTimersByTime(501)); expect(pulseCount(view)).toBe(0);
  });

  it.each(['cpu', 'pass'] as const)('preserves the complete %s duel, original season, exact share and one completion', async mode => {
    const { view, model } = await start(mode); let state = model, offer = drawOffer(state);
    const nodes = slots(view); let keeps = 0;
    while (!duelOver(state)) {
      if (mode === 'cpu' && state.turn === 1) {
        const choice = cpuKeep(state, offer); state = applyKeep(state, offer, choice.keep, choice.slotIndex);
        act(() => vi.advanceTimersByTime(1100));
      } else state = commit(view, state, offer).next;
      keeps += 1;
      if (!duelOver(state)) {
        sameSlots(view, nodes);
        for (let side = 0; side < 2; side += 1) for (let index = 0; index < 11; index += 1) expect(slot(view, side, index).dataset.sdPlayer).toBe(state.squads[side][index]?.name ?? '');
        offer = drawOffer(state); expect(currentOffers(view)).toEqual(offer.map(player => player.name));
      }
    }
    expect(keeps).toBe(22); expect(state.discards).toHaveLength(44);
    expect(new Set([...state.squads.flat(), ...state.discards].filter(Boolean).map(player => player!.name)).size).toBe(66);
    const season = settleSeason(state.squads[0], state.squads[1]), score = Math.min(100, Math.round(season.points[0] / 114 * 100)), won = season.winner === 0;
    expect(view.container.querySelector('[data-sd-result]')).toHaveFocus();
    expect(view.getByText(`You ${season.points[0]} pts (${season.ratings[0]} OVR) · ${mode === 'cpu' ? 'CPU' : 'Manager B'} ${season.points[1]} pts (${season.ratings[1]} OVR)`)).toBeVisible();
    for (const line of season.story) expect(view.getByText(line)).toBeVisible();
    expect(view.container.querySelector('pre')).toHaveTextContent(`🔎 Search and Discard ${won ? '🏆' : '🫠'} ${season.points[0]} pts vs ${season.points[1]} pts`);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    fireEvent.click(view.getByRole('button', { name: 'Share on X' }));
    const shared = new URL(String(open.mock.calls[0][0])).searchParams.get('text');
    expect(shared).toBe(`I scored ${score} on Search and Discard at DoUKnowBall! Can you beat me?\n🔎 Search and Discard\n${won ? '🏆' : '🫠'} ${season.points[0]} pts vs ${season.points[1]} pts\ndouknowball.com/search-and-discard`);
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(recordCompletion).toHaveBeenCalledWith('/search-and-discard', score, 'Fixture guest', won ? 1 : 0);
    view.rerender(<HelmetProvider><MemoryRouter initialEntries={['/search-and-discard']}><SearchAndDiscard /></MemoryRouter></HelmetProvider>);
    act(() => vi.advanceTimersByTime(1500)); expect(recordCompletion).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole('button', { name: 'New duel' }));
    expect(view.getByRole('button', { name: /Versus the CPU/ })).toHaveFocus();
    expect(view.container.querySelector('[data-sd-result]')).toBeNull(); expect(pulseCount(view)).toBe(0);
    fireEvent.click(view.getByRole('button', { name: /Pass and play/ })); expect(slots(view).every(node => node.dataset.sdPlayer === '')).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('cancels pending CPU work on unmount and preserves the original helper baseline', async () => {
    const { view, model } = await start('cpu'); const offer = drawOffer(model); commit(view, model, offer);
    const lateWork = vi.spyOn(duel, 'cpuKeep');
    view.unmount(); act(() => vi.advanceTimersByTime(2000)); expect(lateWork).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
    const baseline = newDuel(pool, SEED), first = drawOffer(baseline), choice = cpuKeep(baseline, first), next = applyKeep(baseline, first, choice.keep, choice.slotIndex);
    expect(next.squads[0][choice.slotIndex]).toBe(choice.keep); expect(next.discards).toEqual(first.filter(player => player !== choice.keep));
    expect(next.pool.every(player => !first.includes(player))).toBe(true); expect(baseline.squads[0].every(player => player === null)).toBe(true);
  });

  it('refuses a repeated same-frame keep without drawing an extra trio or adding an extra cue', async () => {
    const { view, model } = await start(); const offer = drawOffer(model), choice = cpuKeep(model, offer);
    fireEvent.click(offers(view).find(node => node.dataset.sdOffer === choice.keep.name)!);
    const target = slot(view, 0, choice.slotIndex);
    act(() => { target.click(); target.click(); });
    const next = applyKeep(model, offer, choice.keep, choice.slotIndex), nextOffer = drawOffer(next);
    expect(currentOffers(view)).toEqual(nextOffer.map(player => player.name));
    expect(slots(view).filter(node => node.dataset.sdPlayer)).toHaveLength(1);
    expect(view.container.querySelectorAll('[data-sd-discard]')).toHaveLength(2);
    expect(pulseCount(view)).toBe(1); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
