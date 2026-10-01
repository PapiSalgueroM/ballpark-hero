import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { PlayerPool, draftRating, poolShortlist, type DraftPlayer } from '@/components/fantasy-draft/PlayerPool';

const fixture = (): DraftPlayer[] => Array.from({ length: 48 }, (_, index) => ({
  id: `fixture-${index}`, name: `Fixture Player ${String(index).padStart(2, '0')}`,
  position: ['GK', 'DEF', 'MID', 'FWD'][index % 4],
  nationality: ['Fixture Alpha', 'Fixture Beta', 'Fixture Gamma'][index % 3],
  dominant_foot: Math.floor(index / 4) % 2 ? 'Right' : 'Left',
  market_value_millions: 3 + ((index * 17) % 100), age: 20 + (index % 15),
}));
const ranked = (players: DraftPlayer[]) => [...players].sort((a, b) => draftRating(b) - draftRating(a));
const rows = (container: HTMLElement) => [...container.querySelectorAll<HTMLButtonElement>('button')].filter(button => button.querySelector('p'));
const names = (container: HTMLElement) => rows(container).map(row => row.querySelector('p')!.textContent);
const count = (container: HTMLElement, shown: number, matching: number, searching = false) => expect(within(container).getByRole('status')).toHaveTextContent(`Showing ${shown} of ${matching} ${searching ? 'matching' : 'available'} players.`);
const target = (container: HTMLElement, label: string, value: string) => fireEvent.change(within(container).getByRole('combobox', { name: label }), { target: { value } });

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Fantasy Draft pool targeting', () => {
  it('preserves the original default best ten and two-character twenty-match search policy', () => {
    const players = fixture();
    const sorted = ranked(players);
    const draftedIds = new Set([sorted[0].id]);
    const isEligible = (player: DraftPlayer) => player.id !== sorted[1].id;
    const view = render(<PlayerPool players={players} draftedIds={draftedIds} isEligible={isEligible} onSelect={vi.fn()} />);
    const expected = sorted.filter(player => !draftedIds.has(player.id) && isEligible(player));
    count(view.container, 10, 46);
    expect(names(view.container)).toEqual(expected.slice(0, 10).map(player => player.name));
    expect(names(view.container)).toEqual(poolShortlist(players, draftedIds, isEligible, 'All', '').map(player => player.name));
    const search = view.getByRole('textbox', { name: 'Search players' });
    fireEvent.change(search, { target: { value: 'F' } });
    count(view.container, 10, 46);
    expect(names(view.container)).toEqual(expected.slice(0, 10).map(player => player.name));
    fireEvent.change(search, { target: { value: 'Fixture Player' } });
    count(view.container, 20, 48, true);
    expect(names(view.container)).toEqual(sorted.slice(0, 20).map(player => player.name));
    expect(rows(view.container)[0]).toBeDisabled();
    expect(rows(view.container)[1]).toBeDisabled();
    expect(view.getByText('Best 10 available • search shows up to 20 matches • 1 drafted')).toBeVisible();
  });

  it('combines country, foot, position and name before the shortlist and resets every selector', () => {
    const players = fixture();
    const onSelect = vi.fn();
    const view = render(<PlayerPool players={players} draftedIds={new Set()} onSelect={onSelect} />);
    target(view.container, 'Country', 'Fixture Beta');
    count(view.container, 10, 16);
    target(view.container, 'Foot', 'Left');
    count(view.container, 8, 8);
    fireEvent.click(view.getByRole('button', { name: 'MID' }));
    const expected = ranked(players.filter(player => player.nationality === 'Fixture Beta' && player.dominant_foot === 'Left' && player.position === 'MID'));
    count(view.container, 2, 2);
    expect(names(view.container)).toEqual(expected.map(player => player.name));
    fireEvent.change(view.getByRole('textbox', { name: 'Search players' }), { target: { value: '34' } });
    count(view.container, 1, 1, true);
    expect(names(view.container)).toEqual(['Fixture Player 34']);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(rows(view.container)[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBe(players[34]);
    fireEvent.click(view.getByRole('button', { name: 'Reset filters' }));
    count(view.container, 10, 48);
    expect(view.getByRole('textbox', { name: 'Search players' })).toHaveValue('');
    view.getAllByRole('combobox').forEach(select => expect(select).toHaveValue(''));
    expect(view.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(view.getByRole('button', { name: 'MID' })).toHaveAttribute('aria-pressed', 'false');
    expect(view.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
    expect(names(view.container)).toEqual(ranked(players).slice(0, 10).map(player => player.name));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('retains drafted, rule-blocked and turn-disabled choices during targeted searches', () => {
    const players = fixture();
    const sorted = ranked(players);
    const drafted = sorted[0];
    const blocked = sorted[1];
    const draftedIds = new Set([drafted.id]);
    const isEligible = (player: DraftPlayer) => player.id !== blocked.id;
    const onSelect = vi.fn();
    const props = { players, draftedIds, isEligible, ineligibleReason: 'Fixture rule requires another player.', onSelect };
    const view = render(<PlayerPool {...props} />);
    for (const player of [drafted, blocked]) {
      target(view.container, 'Country', player.nationality);
      target(view.container, 'Foot', player.dominant_foot);
      fireEvent.change(view.getByRole('textbox', { name: 'Search players' }), { target: { value: player.name } });
      count(view.container, 1, 1, true);
      expect(names(view.container)).toEqual([player.name]);
      const row = rows(view.container)[0];
      expect(row).toBeDisabled();
      expect(row).toHaveClass(player === drafted ? 'opacity-35' : 'opacity-45');
      if (player === blocked) {
        expect(row).toHaveAttribute('title', props.ineligibleReason);
        expect(row).toHaveTextContent("Blocked by today's rule");
      }
      fireEvent.click(row);
    }
    fireEvent.click(view.getByRole('button', { name: 'Reset filters' }));
    view.rerender(<PlayerPool {...props} disabled />);
    expect(rows(view.container)).toHaveLength(10);
    rows(view.container).forEach(row => { expect(row).toBeDisabled(); fireEvent.click(row); });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('counts genuine no matches and empty pools without inventing selectable values', () => {
    let view = render(<PlayerPool players={fixture()} draftedIds={new Set()} onSelect={vi.fn()} />);
    target(view.container, 'Country', 'Fixture Gamma');
    target(view.container, 'Foot', 'Right');
    fireEvent.change(view.getByRole('textbox', { name: 'Search players' }), { target: { value: 'Fixture absent name' } });
    count(view.container, 0, 0, true);
    expect(view.getByText('No players found')).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Reset filters' }));
    count(view.container, 10, 48);
    cleanup();
    view = render(<PlayerPool players={[]} draftedIds={new Set()} onSelect={vi.fn()} />);
    count(view.container, 0, 0);
    expect(rows(view.container)).toHaveLength(0);
    expect(view.getByText('No players found')).toBeVisible();
    view.getAllByRole('combobox').forEach(select => expect(within(select).getAllByRole('option').map(option => option.getAttribute('value'))).toEqual(['']));
  });

  it('retains focused selectors and original row identity across filters and cloned props', () => {
    const players = fixture();
    const first = ranked(players)[0];
    const props = { players, draftedIds: new Set<string>(), onSelect: vi.fn() };
    const view = render(<PlayerPool {...props} />);
    const original = rows(view.container)[0];
    const country = view.getByRole('combobox', { name: 'Country' });
    const foot = view.getByRole('combobox', { name: 'Foot' });
    country.focus();
    target(view.container, 'Country', first.nationality);
    expect(country).toHaveFocus();
    expect(rows(view.container)[0]).toBe(original);
    foot.focus();
    target(view.container, 'Foot', first.dominant_foot);
    expect(foot).toHaveFocus();
    expect(rows(view.container)[0]).toBe(original);
    view.rerender(<PlayerPool {...props} players={players.map(player => ({ ...player }))} draftedIds={new Set()} />);
    expect(view.getByRole('combobox', { name: 'Country' })).toBe(country);
    expect(view.getByRole('combobox', { name: 'Foot' })).toBe(foot);
    expect(foot).toHaveFocus();
    expect(rows(view.container)[0]).toBe(original);
  });

  it('filters frozen inputs without selecting, writing saves, random draws or mutation', () => {
    const players = fixture();
    players.forEach(Object.freeze);
    Object.freeze(players);
    const draftedIds = new Set(['fixture-0']);
    const original = JSON.stringify(players);
    const onSelect = vi.fn();
    const view = render(<PlayerPool players={players} draftedIds={draftedIds} onSelect={onSelect} />);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const random = vi.spyOn(Math, 'random');
    target(view.container, 'Country', 'Fixture Alpha');
    target(view.container, 'Foot', 'Right');
    fireEvent.click(view.getByRole('button', { name: 'DEF' }));
    fireEvent.change(view.getByRole('textbox', { name: 'Search players' }), { target: { value: 'Fixture' } });
    fireEvent.click(view.getByRole('button', { name: 'Reset filters' }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(players)).toBe(original);
    expect([...draftedIds]).toEqual(['fixture-0']);
    expect(names(view.container)).toEqual(ranked(players.filter(player => player.id !== 'fixture-0')).slice(0, 10).map(player => player.name));
  });

  it('labels existing country and foot values with 44px targeting controls', () => {
    const view = render(<PlayerPool players={fixture()} draftedIds={new Set()} onSelect={vi.fn()} />);
    const country = view.getByRole('combobox', { name: 'Country' });
    const foot = view.getByRole('combobox', { name: 'Foot' });
    expect(within(country).getAllByRole('option').map(option => option.getAttribute('value'))).toEqual(['', 'Fixture Alpha', 'Fixture Beta', 'Fixture Gamma']);
    expect(within(foot).getAllByRole('option').map(option => option.getAttribute('value'))).toEqual(['', 'Left', 'Right']);
    [country, foot].forEach(select => expect(select).toHaveClass('h-11'));
    ['All', 'GK', 'DEF', 'MID', 'FWD', 'Reset filters'].forEach(name => expect(view.getByRole('button', { name })).toHaveClass('min-h-[44px]'));
    expect(view.getByRole('textbox', { name: 'Search players' })).toHaveClass('min-h-[44px]');
  });
});
