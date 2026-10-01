import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PerfectLineupBoard from '@/components/perfect-lineup/PerfectLineupBoard';
import { simulate, type LineupSlot } from '@/data/perfectLineup';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import type { Player, Position } from '@/types/game';

const fixture = vi.hoisted(() => ({ pool: [] as Player[], slots: [] as LineupSlot[], pick: vi.fn() }));
vi.mock('@/data/players', () => ({ players: fixture.pool }));
vi.mock('@/data/perfectLineup', async importOriginal => ({
  ...await importOriginal<typeof import('@/data/perfectLineup')>(),
  rollLineup: () => fixture.slots,
}));
vi.mock('@/hooks/usePerfectLineup', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks/usePerfectLineup')>();
  return { ...actual, usePerfectLineup: () => {
    const game = actual.usePerfectLineup();
    return { ...game, pickPlayer: (id: number, player: Player) => { fixture.pick(id, player); game.pickPlayer(id, player); } };
  } };
});
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const player = (index: number, position: Position = 'ST'): Player => Object.freeze({
  name: `Fixture ${position} ${String(index).padStart(2, '0')}`, position,
  club: index % 2 ? 'Fixture Club Beta' : 'Fixture Club Alpha',
  league: index % 2 ? 'La Liga' : 'Premier League',
  nationality: Math.floor(index / 2) % 2 ? 'Fixture West' : 'Fixture East',
  marketValue: 150 - index, goals: 0, assists: 0, kitNumber: null, age: 24, difficulty: 'easy',
});
const board = () => render(<MemoryRouter><PerfectLineupBoard /></MemoryRouter>);
const slot = (view: ReturnType<typeof render>, id: number) => view.container.querySelector<HTMLElement>(`[data-lineup-slot="${id}"]`)!;
async function open(view: ReturnType<typeof render>, id = 9) {
  const group = slot(view, id);
  const trigger = within(group).getByRole('button', { name: '+ Pick' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = view.getByRole('dialog');
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  return { dialog, group, trigger };
}
const rows = (dialog: HTMLElement) => Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).filter(button => /^Fixture /.test(button.textContent || ''));
const names = (dialog: HTMLElement) => rows(dialog).map(row => row.querySelector('span')!.textContent);
const count = (dialog: HTMLElement, shown: number, matching: number, eligible: number) => expect(within(dialog).getByRole('status')).toHaveTextContent(`Showing ${shown} of ${matching} matching players (${eligible} eligible).`);
const filter = (dialog: HTMLElement, label: string, value: string) => fireEvent.change(within(dialog).getByRole('combobox', { name: label }), { target: { value } });
const search = (dialog: HTMLElement, value: string) => fireEvent.change(within(dialog).getByRole('textbox', { name: 'Search players' }), { target: { value } });
const choose = (dialog: HTMLElement, p: Player) => fireEvent.click(rows(dialog).find(row => row.querySelector('span')!.textContent === p.name)!);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  fixture.pool.splice(0, fixture.pool.length, ...Array.from({ length: 56 }, (_, index) => player(index)), ...(['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CAM'] as Position[]).map((position, index) => player(56 + index, position)));
  fixture.slots.splice(0, fixture.slots.length, ...(['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'ST', 'ST', 'ST'] as Position[]).map((position, id) => ({ id, label: position, allowed: [position], constraint: { type: 'any' } } as LineupSlot)));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Soccer Classic lineup picker', () => {
  it('combines League, Country and trimmed name search, preserves value order, and resets', async () => {
    const view = board();
    const { dialog } = await open(view);
    count(dialog, 40, 56, 56);
    expect(names(dialog)).toEqual(fixture.pool.slice(0, 40).map(p => p.name));
    filter(dialog, 'League', 'Premier League');
    count(dialog, 28, 28, 56);
    filter(dialog, 'Country', 'Fixture East');
    const expected = fixture.pool.filter(p => p.position === 'ST' && p.league === 'Premier League' && p.nationality === 'Fixture East');
    count(dialog, 14, 14, 56);
    expect(names(dialog)).toEqual(expected.map(p => p.name));
    search(dialog, '  st 4  ');
    count(dialog, 3, 3, 56);
    expect(names(dialog)).toEqual(['Fixture ST 40', 'Fixture ST 44', 'Fixture ST 48']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset filters' }));
    count(dialog, 40, 56, 56);
    expect(within(dialog).getByRole('textbox')).toHaveValue('');
    within(dialog).getAllByRole('combobox').forEach(select => expect(select).toHaveValue(''));
    expect(within(dialog).getByRole('button', { name: 'Reset filters' })).toBeDisabled();
    expect(fixture.pick).not.toHaveBeenCalled();
  });

  it('loads every eligible player, keeps earlier nodes, and picks the exact later object', async () => {
    const view = board();
    const { dialog, group, trigger } = await open(view);
    const original = rows(dialog);
    const more = within(dialog).getByRole('button', { name: 'Load more players' });
    more.focus();
    fireEvent.click(more);
    count(dialog, 56, 56, 56);
    expect(names(dialog)).toEqual(fixture.pool.slice(0, 56).map(p => p.name));
    original.forEach((row, index) => expect(rows(dialog)[index]).toBe(row));
    expect(within(dialog).queryByRole('button', { name: 'Load more players' })).toBeNull();
    expect(dialog).toHaveFocus();
    choose(dialog, fixture.pool[45]);
    await waitFor(() => expect(group).toHaveFocus());
    expect(trigger.isConnected).toBe(false);
    expect(fixture.pick).toHaveBeenCalledOnce();
    expect(fixture.pick.mock.calls[0][0]).toBe(9);
    expect(fixture.pick.mock.calls[0][1]).toBe(fixture.pool[45]);
    expect(within(group).getByText('Fixture ST 45', { exact: true })).toBeVisible();
    expect(group).toHaveAccessibleName('ST lineup slot');
    const next = await open(view, 8);
    count(next.dialog, 40, 55, 55);
    fireEvent.click(within(next.dialog).getByRole('button', { name: 'Load more players' }));
    expect(names(next.dialog)).not.toContain('Fixture ST 45');
    expect(names(next.dialog)).not.toContain('Fixture GK 56');
  });

  it('applies original position, slot constraint and duplicate exclusions before targeting', async () => {
    fixture.slots[9] = { ...fixture.slots[9], constraint: { type: 'league', value: 'La Liga' } };
    const view = board();
    let opened = await open(view);
    count(opened.dialog, 28, 28, 28);
    expect(within(opened.dialog).getByRole('combobox', { name: 'League' }).querySelectorAll('option')).toHaveLength(2);
    expect(names(opened.dialog)).toEqual(fixture.pool.filter(p => p.position === 'ST' && p.league === 'La Liga').map(p => p.name));
    filter(opened.dialog, 'Country', 'Fixture West');
    count(opened.dialog, 14, 14, 28);
    choose(opened.dialog, fixture.pool[3]);
    opened = await open(view, 8);
    search(opened.dialog, 'Fixture ST 03');
    count(opened.dialog, 0, 0, 55);
    expect(within(opened.dialog).getByText('No matching players. Reset filters to see eligible players.')).toBeVisible();
    search(opened.dialog, 'Fixture GK');
    expect(rows(opened.dialog)).toHaveLength(0);
  });

  it('distinguishes an empty eligible pool from filter no-match', async () => {
    fixture.slots[9] = { ...fixture.slots[9], constraint: { type: 'nationality', value: 'Fixture Missing' } };
    const view = board();
    const { dialog } = await open(view);
    count(dialog, 0, 0, 0);
    expect(within(dialog).getByText('No eligible players for this slot.')).toBeVisible();
    expect(within(dialog).queryByText('No matching players. Reset filters to see eligible players.')).toBeNull();
    expect(rows(dialog)).toHaveLength(0);
    expect(within(dialog).queryByRole('button', { name: 'Load more players' })).toBeNull();
  });

  it('resets paging on filters without replacing focused controls or retained rows', async () => {
    const view = board();
    const { dialog } = await open(view);
    const first = rows(dialog)[0];
    const league = within(dialog).getByRole('combobox', { name: 'League' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Load more players' }));
    league.focus();
    filter(dialog, 'League', 'Premier League');
    count(dialog, 28, 28, 56);
    expect(rows(dialog)[0]).toBe(first);
    expect(league).toHaveFocus();
    expect(within(dialog).getByRole('combobox', { name: 'League' })).toBe(league);
    filter(dialog, 'League', '');
    count(dialog, 40, 56, 56);
  });

  it('leaves saves, draws, inputs, picks and completion untouched while browsing', async () => {
    const before = JSON.stringify({ pool: fixture.pool, slots: fixture.slots });
    const view = board();
    const { dialog } = await open(view);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const random = vi.spyOn(Math, 'random');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Load more players' }));
    filter(dialog, 'Country', 'Fixture East');
    search(dialog, 'Fixture ST 4');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset filters' }));
    expect(write).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    expect(fixture.pick).not.toHaveBeenCalled();
    expect(vi.mocked(useGameCompletion).mock.calls.some(call => call[1])).toBe(false);
    expect(JSON.stringify({ pool: fixture.pool, slots: fixture.slots })).toBe(before);
    expect(view.getByText('0/11')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(view.getByRole('button', { name: 'Simulate Match' })).toBeDisabled();
  });

  it.each([9, 0])('returns Close to the exact opening Pick control in slot %i', async id => {
    const view = board();
    const { dialog, trigger } = await open(view, id);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(view.queryByRole('dialog')).toBeNull();
    expect(fixture.pick).not.toHaveBeenCalled();
  });

  it('returns Escape after filtering and remembers later openers independently', async () => {
    const view = board();
    const first = await open(view, 9);
    search(first.dialog, 'Fixture ST 45');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(first.trigger).toHaveFocus());
    const second = await open(view, 0);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(second.trigger).toHaveFocus());
    expect(first.trigger).not.toHaveFocus();
    expect(fixture.pick).not.toHaveBeenCalled();
  });

  it('keeps all eleven chosen objects and the original simulated score, grade and value', async () => {
    const view = board();
    const picked = [...fixture.pool.slice(56), fixture.pool[0], fixture.pool[45], fixture.pool[1]];
    for (let id = 0; id < 11; id++) {
      const { dialog } = await open(view, id);
      search(dialog, picked[id].name);
      choose(dialog, picked[id]);
    }
    const expected = simulate(picked);
    expect(fixture.pick).toHaveBeenCalledTimes(11);
    fixture.pick.mock.calls.forEach(([id, p], index) => { expect(id).toBe(index); expect(p).toBe(picked[index]); });
    fireEvent.click(view.getByRole('button', { name: 'Simulate Match' }));
    expect(view.getByText(`Grade ${expected.grade}`, { exact: true })).toBeVisible();
    expect(view.getByText(`${expected.goalsFor}-${expected.goalsAgainst}`, { exact: true })).toBeVisible();
    expect(view.getByText(String(expected.rating), { exact: true })).toBeInTheDocument();
    expect(view.getByText(`${expected.chemistry}%`, { exact: true })).toBeInTheDocument();
    expect(view.getByText(`€${expected.squadValue}M`, { exact: true })).toBeInTheDocument();
    expect(useGameCompletion).toHaveBeenLastCalledWith('perfect-lineup', true, expected.rating);
    expect(view.getAllByRole('group')).toHaveLength(11);
  }, 15000);

  it('labels only League and Country with 44px controls and preserves full long row text', async () => {
    fixture.pool[0] = Object.freeze({ ...fixture.pool[0], name: `Fixture ${'UnbrokenName'.repeat(10)}`, club: `Fixture ${'UnbrokenClub'.repeat(10)}` });
    const view = board();
    const { dialog } = await open(view);
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(2);
    for (const label of ['League', 'Country']) expect(within(dialog).getByRole('combobox', { name: label })).toHaveClass('h-11');
    expect(within(dialog).getByRole('textbox', { name: 'Search players' })).toHaveClass('min-h-[44px]');
    for (const label of ['Reset filters', 'Load more players']) expect(within(dialog).getByRole('button', { name: label })).toHaveClass('min-h-[44px]');
    rows(dialog).forEach(row => expect(row).toHaveClass('min-h-[44px]'));
    const first = rows(dialog)[0];
    expect(first).toHaveAccessibleName(`${fixture.pool[0].name} ${fixture.pool[0].club} · €150M`);
    first.querySelectorAll('span').forEach(span => expect(span).toHaveClass('[overflow-wrap:anywhere]'));
    expect(dialog).toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-y-auto');
  });
});
