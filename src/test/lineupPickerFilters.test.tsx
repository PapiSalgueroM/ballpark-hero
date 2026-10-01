import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import GenericLineupBoard from '@/components/perfect-lineup/GenericLineupBoard';
import { type LineupConfig, rollLineup, simulate } from '@/lib/perfectLineupEngine';
import { getTodayET } from '@/lib/dateUtils';
import { useGameCompletion } from '@/hooks/useGameCompletion';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

interface FixturePlayer { name: string; pos: string; rating: number; team: string; era: string; country: string }
const configFor = (dimensionKeys = ['team', 'era', 'country']): LineupConfig<FixturePlayer> => ({
  gameId: 'fixture-lineup', gameName: 'Fixture Lineup', gamePath: '/fixture-lineup',
  formation: [{ label: 'Guard one', allowed: ['PG'] }, { label: 'Guard two', allowed: ['PG'] }],
  pool: Array.from({ length: 60 }, (_, index) => ({ name: index < 56 ? `Fixture Player ${String(index).padStart(2, '0')}` : `Ineligible Center ${index}`, pos: index < 56 ? 'PG' : 'C', rating: 100 - index, team: index % 2 ? 'Fixture Beta' : 'Fixture Alpha', era: Math.floor(index / 2) % 2 ? 'Fixture Present' : 'Fixture Past', country: Math.floor(index / 4) % 2 ? 'Fixture West' : 'Fixture East' })),
  nameOf: player => player.name, positionOf: player => player.pos, ratingOf: player => player.rating,
  subtitleOf: player => `${player.team} · ${player.era}`,
  dimensions: dimensionKeys.map(key => ({ key, label: key === 'country' ? 'Country' : key === 'team' ? 'Team' : 'Era', valueOf: player => player[key as 'team' | 'era' | 'country'] })),
  chemistryOf: [player => player.team, player => player.era], constrainedSlots: 0,
  scoreline: result => ({ big: `Fixture ${result.rating}`, shareScore: `${result.rating} fixture rating` }),
});
const rows = (dialog: HTMLElement) => Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).filter(button => /^(Fixture Player|Ineligible Center)/.test(button.textContent || ''));
const names = (dialog: HTMLElement) => rows(dialog).map(row => row.querySelector('span')!.textContent);
function open(view: ReturnType<typeof render>, index = 0) {
  fireEvent.click(view.getAllByRole('button', { name: '+ Pick' })[index]);
  return view.getByRole('dialog');
}
const counts = (dialog: HTMLElement, displayed: number, matching: number, eligible: number) => expect(within(dialog).getByRole('status')).toHaveTextContent(`Showing ${displayed} of ${matching} matching players (${eligible} eligible).`);

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('shared Perfect Lineup picker', () => {
  it('combines existing dimensions and name search, keeps engine order, and resets all filters', () => {
    const config = configFor();
    const view = render(<GenericLineupBoard config={config} />);
    const dialog = open(view);
    counts(dialog, 40, 56, 56);
    const search = within(dialog).getByRole('textbox', { name: 'Search players' });
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Team' }), { target: { value: 'Fixture Alpha' } });
    counts(dialog, 28, 28, 56);
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Era' }), { target: { value: 'Fixture Past' } });
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Country' }), { target: { value: 'Fixture East' } });
    counts(dialog, 7, 7, 56);
    expect(names(dialog)).toEqual(config.pool.filter(p => p.pos === 'PG' && p.team === 'Fixture Alpha' && p.era === 'Fixture Past' && p.country === 'Fixture East').map(p => p.name));
    fireEvent.change(search, { target: { value: '  player 4  ' } });
    counts(dialog, 2, 2, 56);
    expect(names(dialog)).toEqual(['Fixture Player 40', 'Fixture Player 48']);
    expect(within(dialog).queryByRole('button', { name: 'Load more players' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset filters' }));
    counts(dialog, 40, 56, 56);
    expect(search).toHaveValue('');
    within(dialog).getAllByRole('combobox').forEach(select => expect(select).toHaveValue(''));
    expect(within(dialog).getByRole('button', { name: 'Reset filters' })).toBeDisabled();
    expect(names(dialog)).toEqual(config.pool.slice(0, 40).map(p => p.name));
  });

  it('makes players beyond forty reachable, preserves earlier rows, and picks the exact later player', () => {
    const config = configFor();
    const view = render(<GenericLineupBoard config={config} />);
    let dialog = open(view);
    const original = rows(dialog);
    expect(within(dialog).queryByRole('button', { name: /^Fixture Player 45 / })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Load more players' }));
    counts(dialog, 56, 56, 56);
    const expanded = rows(dialog);
    original.forEach((row, index) => expect(expanded[index]).toBe(row));
    expect(names(dialog)).toEqual(config.pool.filter(p => p.pos === 'PG').map(p => p.name));
    expect(within(dialog).queryByRole('button', { name: 'Load more players' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Fixture Player 45 / }));
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByText('Fixture Player 45', { exact: true })).toBeVisible();
    dialog = open(view);
    counts(dialog, 40, 55, 55);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Load more players' }));
    expect(names(dialog)).not.toContain('Fixture Player 45');
    expect(names(dialog)).not.toContain('Ineligible Center 56');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Fixture Player 00 / }));
    const expected = simulate(config, [config.pool[45], config.pool[0]]);
    expect(view.getByRole('button', { name: 'Simulate' })).toBeEnabled();
    fireEvent.click(view.getByRole('button', { name: 'Simulate' }));
    expect(view.getByText(`Fixture ${expected.rating}`, { exact: true })).toBeVisible();
    expect(view.getByText(`Grade ${expected.grade}`, { exact: true })).toBeVisible();
    expect(view.getByText(/^Rating/)).toHaveTextContent(`Rating ${expected.rating}`);
    expect(view.getByText(/^Chemistry/)).toHaveTextContent(`Chemistry ${expected.chemistry}%`);
    expect(useGameCompletion).toHaveBeenCalledWith(config.gameId, true, expected.rating);
  }, 15000);

  it('resets pagination when a filter changes without replacing the focused select or retained rows', () => {
    const view = render(<GenericLineupBoard config={configFor()} />);
    const dialog = open(view);
    const original = rows(dialog)[0];
    const team = within(dialog).getByRole('combobox', { name: 'Team' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Load more players' }));
    team.focus();
    fireEvent.change(team, { target: { value: 'Fixture Alpha' } });
    counts(dialog, 28, 28, 56);
    expect(rows(dialog)[0]).toBe(original);
    expect(within(dialog).getByRole('combobox', { name: 'Team' })).toBe(team);
    expect(team).toHaveFocus();
    fireEvent.change(team, { target: { value: '' } });
    counts(dialog, 40, 56, 56);
    expect(rows(dialog)).toHaveLength(40);
  });

  it('preserves the existing slot constraint and position eligibility before applying filters', () => {
    const config = configFor(['team']);
    config.constrainedSlots = 1;
    const slots = rollLineup(config, Number(getTodayET().replace(/-/g, '')));
    const index = slots.findIndex(slot => slot.constraint.dim === 'team');
    expect(index).toBeGreaterThanOrEqual(0);
    const expected = config.pool.filter(p => p.pos === 'PG' && p.team === slots[index].constraint.value);
    const view = render(<GenericLineupBoard config={config} />);
    const dialog = open(view, index);
    counts(dialog, expected.length, expected.length, expected.length);
    expect(names(dialog)).toEqual(expected.map(p => p.name));
    expect(within(dialog).getAllByRole('option').map(option => option.getAttribute('value'))).toEqual(['', slots[index].constraint.value]);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Search players' }), { target: { value: 'Ineligible Center' } });
    counts(dialog, 0, 0, expected.length);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset filters' }));
    expect(names(dialog)).toEqual(expected.map(p => p.name));
  });

  it('distinguishes no matching players from an actually empty eligible pool', () => {
    let view = render(<GenericLineupBoard config={configFor()} />);
    let dialog = open(view);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Search players' }), { target: { value: 'Fixture missing name' } });
    counts(dialog, 0, 0, 56);
    expect(within(dialog).getByText('No matching players. Reset filters to see eligible players.')).toBeVisible();
    expect(within(dialog).queryByText('No eligible players for this slot.')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset filters' }));
    expect(rows(dialog)).toHaveLength(40);
    cleanup();
    const empty = configFor();
    empty.pool = empty.pool.filter(p => p.pos === 'C');
    view = render(<GenericLineupBoard config={empty} />);
    dialog = open(view);
    counts(dialog, 0, 0, 0);
    expect(within(dialog).getByText('No eligible players for this slot.')).toBeVisible();
    expect(within(dialog).queryByText('No matching players. Reset filters to see eligible players.')).toBeNull();
    expect(rows(dialog)).toHaveLength(0);
  });

  it('filters and loads more without save writes, random redeals, completion or pool mutation', () => {
    const config = configFor();
    const before = JSON.stringify(config);
    const view = render(<GenericLineupBoard config={config} />);
    const dialog = open(view);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const random = vi.spyOn(Math, 'random');
    const completionsBefore = vi.mocked(useGameCompletion).mock.calls.filter(call => call[1]).length;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Load more players' }));
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Team' }), { target: { value: 'Fixture Alpha' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Search players' }), { target: { value: 'Player 4' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset filters' }));
    expect(write.mock.calls.length, 'Picker controls must make zero save writes').toBe(0);
    expect(random.mock.calls.length, 'Picker controls must not redeal through random draws').toBe(0);
    expect(vi.mocked(useGameCompletion).mock.calls.filter(call => call[1])).toHaveLength(completionsBefore);
    expect(JSON.stringify(config)).toBe(before);
    expect(view.getByText('0/2')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(view.getByRole('button', { name: 'Simulate' })).toBeDisabled();
  });

  it.each([
    ['NBA', ['era', 'team'], ['Era', 'Team']],
    ['NHL', ['era', 'team'], ['Era', 'Team']],
    ['F1', ['team', 'era', 'country'], ['Team', 'Era', 'Country']],
  ])('renders only the %s configuration dimensions with labeled 44px controls', (_sport, keys, labels) => {
    const view = render(<GenericLineupBoard config={configFor(keys)} />);
    const dialog = open(view);
    const selects = within(dialog).getAllByRole('combobox');
    expect(selects).toHaveLength(labels.length);
    labels.forEach((label, index) => {
      expect(within(dialog).getByRole('combobox', { name: label })).toBe(selects[index]);
      expect(selects[index]).toHaveClass('h-11');
    });
    expect(within(dialog).getByRole('textbox', { name: 'Search players' })).toHaveClass('min-h-[44px]');
    expect(within(dialog).getByRole('button', { name: 'Reset filters' })).toHaveClass('min-h-[44px]');
    expect(within(dialog).getByRole('button', { name: 'Load more players' })).toHaveClass('min-h-[44px]');
    rows(dialog).forEach(row => expect(row).toHaveClass('min-h-[44px]'));
  });
});
