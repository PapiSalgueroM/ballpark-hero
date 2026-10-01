import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import GenericLineupBoard from '@/components/perfect-lineup/GenericLineupBoard';
import type { LineupConfig } from '@/lib/perfectLineupEngine';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

interface Player { name: string; position: string; rating: number }
const config: LineupConfig<Player> = {
  gameId: 'perfect-lineup-nba', gameName: 'Focus Fixture', gamePath: '/perfect-lineup-nba',
  formation: [{ label: 'Guard one', allowed: ['PG'] }, { label: 'Guard two', allowed: ['PG'] }],
  pool: [{ name: 'Generated Guard A', position: 'PG', rating: 82 }, { name: 'Generated Guard B', position: 'PG', rating: 79 }],
  nameOf: p => p.name, positionOf: p => p.position, ratingOf: p => p.rating,
  subtitleOf: p => p.position, dimensions: [], chemistryOf: [], constrainedSlots: 0,
  scoreline: r => ({ big: String(r.rating), shareScore: String(r.rating) }),
};

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function open(view: ReturnType<typeof render>, index: number) {
  const trigger = view.getAllByRole('button', { name: '+ Pick' })[index];
  const slot = trigger.parentElement!;
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = view.getByRole('dialog');
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  return { trigger, slot, dialog };
}

describe('shared lineup picker focus', () => {
  it('keeps filtering and exact chosen identity through dismissal', async () => {
    const view = render(<GenericLineupBoard config={config} />);
    const { dialog } = await open(view, 0);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Search players' }), { target: { value: 'Guard B' } });
    expect(within(dialog).queryByRole('button', { name: /Generated Guard A/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /Generated Guard B/ }));
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByText('Generated Guard B', { exact: true })).toBeVisible();
    expect(view.getByText('1/2')).toBeVisible();
  });

  it.each([0, 1])('returns Close dismissal to opening slot %i rather than BODY', async index => {
    const view = render(<GenericLineupBoard config={config} />);
    const { trigger, dialog } = await open(view, index);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getAllByRole('button', { name: '+ Pick' })).toHaveLength(2);
  });

  it('returns Escape to the opening control after filtering', async () => {
    const view = render(<GenericLineupBoard config={config} />);
    const { trigger, dialog } = await open(view, 1);
    const search = within(dialog).getByRole('textbox', { name: 'Search players' });
    search.focus();
    fireEvent.change(search, { target: { value: 'Guard B' } });
    fireEvent.keyDown(search, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.queryByText('Generated Guard B', { exact: true })).toBeNull();
  });

  it('focuses the stable labeled slot when choosing removes the opening control', async () => {
    const view = render(<GenericLineupBoard config={config} />);
    const { trigger, slot, dialog } = await open(view, 1);
    fireEvent.click(within(dialog).getByRole('button', { name: /Generated Guard B/ }));
    await waitFor(() => expect(slot).toHaveFocus());
    expect(trigger.isConnected).toBe(false);
    expect(slot).toHaveAttribute('role', 'group');
    expect(slot).toHaveAccessibleName('Guard two lineup slot');
    expect(within(slot).getByText('Generated Guard B', { exact: true })).toBeVisible();
    expect(view.getByText('1/2')).toBeVisible();
  });

  it('replaces the remembered opener on later opens and leaves chosen identity intact', async () => {
    const view = render(<GenericLineupBoard config={config} />);
    const first = await open(view, 1);
    fireEvent.click(within(first.dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(first.trigger).toHaveFocus());
    const second = await open(view, 0);
    fireEvent.click(within(second.dialog).getByRole('button', { name: /Generated Guard A/ }));
    await waitFor(() => expect(second.slot).toHaveFocus());
    expect(second.slot).not.toBe(first.slot);
    const third = await open(view, 0);
    expect(within(third.dialog).queryByRole('button', { name: /Generated Guard A/ })).toBeNull();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(third.trigger).toHaveFocus());
    expect(within(second.slot).getByText('Generated Guard A', { exact: true })).toBeVisible();
  });
});
