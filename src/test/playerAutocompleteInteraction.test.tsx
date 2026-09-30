import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PlayerAutocomplete, type PlayerAutocompleteProps } from '@/components/game/PlayerAutocomplete';
import { searchPlayers, type PlayerEntity } from '@/lib/playerSearch';

vi.mock('@/lib/playerSearch', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/playerSearch')>(),
  searchPlayers: vi.fn(),
}));

const entities: PlayerEntity[] = [
  { key: 'fixture orion', personKey: 'fixture-1', name: 'Fixture Orion', rawName: 'Fixture Orion', meta: { club: 'Fixture East' }, matchRank: 0, prominence: 2 },
  { key: 'fixture vega', personKey: 'fixture-2', name: 'Fixture Vega', rawName: 'Fixture Vega', meta: { club: 'Fixture West' }, matchRank: 0, prominence: 1 },
];
const searchOptions = {
  source: { table: 'fixture_players', nameColumn: 'name' },
  minChars: 3,
  exclude: new Set(['fixture excluded']),
};

beforeEach(() => {
  vi.mocked(searchPlayers).mockReset();
  vi.mocked(searchPlayers).mockResolvedValue({ results: entities, error: null });
});
afterEach(cleanup);

async function draw(overrides: Partial<PlayerAutocompleteProps> = {}) {
  const props: PlayerAutocompleteProps = {
    value: 'Fixture', onChange: vi.fn(), onSelect: vi.fn(),
    searchOptions, validateOnly: true, debounceMs: 0, ...overrides,
  };
  const view = render(<PlayerAutocomplete {...props} />);
  const input = view.getByRole('combobox');
  if (props.value.length >= searchOptions.minChars) await view.findAllByRole('option');
  return { ...view, props, input };
}

describe('player autocomplete interactions', () => {
  it('selects on pointerdown before blur and ignores the later pointer click', async () => {
    const events: string[] = [];
    const view = await draw({ onChange: name => events.push(`change:${name}`), onSelect: entity => events.push(`select:${entity.personKey}`) });
    act(() => view.input.focus());
    const option = view.getAllByRole('option')[0];
    expect(fireEvent.pointerDown(option)).toBe(false);
    fireEvent.click(option, { detail: 1 });
    expect(events).toEqual(['change:Fixture Orion', 'select:fixture-1']);
    expect(view.input).toHaveFocus();
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it('selects exactly once from a native keyboard or assistive click', async () => {
    const view = await draw();
    const option = view.getAllByRole('option')[1];
    act(() => option.focus());
    fireEvent.click(option, { detail: 0 });
    expect(view.props.onChange).toHaveBeenCalledExactlyOnceWith('Fixture Vega');
    expect(view.props.onSelect).toHaveBeenCalledExactlyOnceWith(entities[1]);
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it('keeps ArrowDown and Enter selection on the focused input', async () => {
    const view = await draw();
    act(() => view.input.focus());
    fireEvent.keyDown(view.input, { key: 'ArrowDown' });
    expect(view.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(view.input, { key: 'Enter' });
    expect(view.props.onSelect).toHaveBeenCalledExactlyOnceWith(entities[0]);
    expect(view.input).toHaveFocus();
  });

  it('keeps ArrowUp and highlighted Tab selection with input focus', async () => {
    const view = await draw();
    act(() => view.input.focus());
    fireEvent.keyDown(view.input, { key: 'ArrowUp' });
    expect(fireEvent.keyDown(view.input, { key: 'Tab' })).toBe(false);
    expect(view.props.onSelect).toHaveBeenCalledExactlyOnceWith(entities[1]);
    expect(view.input).toHaveFocus();
  });

  it('disables existing options and rejects stale pointer and keyboard activation', async () => {
    const view = await draw();
    view.rerender(<PlayerAutocomplete {...view.props} disabled />);
    expect(view.input).toBeDisabled();
    const option = view.getAllByRole('option')[0];
    expect(option).toBeDisabled();
    fireEvent.pointerDown(option);
    fireEvent.click(option, { detail: 0 });
    expect(view.props.onChange).not.toHaveBeenCalled();
    expect(view.props.onSelect).not.toHaveBeenCalled();
    view.rerender(<PlayerAutocomplete {...view.props} />);
    fireEvent.pointerDown(view.getAllByRole('option')[0]);
    expect(view.props.onSelect).toHaveBeenCalledExactlyOnceWith(entities[0]);
  });

  it('rejects a stale highlighted input event after disabling', async () => {
    const view = await draw();
    fireEvent.keyDown(view.input, { key: 'ArrowDown' });
    view.rerender(<PlayerAutocomplete {...view.props} disabled />);
    fireEvent.keyDown(view.input, { key: 'Enter' });
    fireEvent.keyDown(view.input, { key: 'Tab' });
    expect(view.props.onChange).not.toHaveBeenCalled();
    expect(view.props.onSelect).not.toHaveBeenCalled();
  });

  it('rejects disabled free text while preserving the enabled submit behavior', async () => {
    const submit = vi.fn();
    const view = await draw({ value: 'Fi', validateOnly: false, onSubmitFreeText: submit, disabled: true });
    fireEvent.keyDown(view.input, { key: 'Enter' });
    expect(submit).not.toHaveBeenCalled();
    view.rerender(<PlayerAutocomplete {...view.props} disabled={false} />);
    fireEvent.keyDown(view.input, { key: 'Enter' });
    expect(submit).toHaveBeenCalledExactlyOnceWith('Fi');
    expect(view.props.onSelect).not.toHaveBeenCalled();
  });

  it('preserves namesake identities, disambiguators and the caller search filters', async () => {
    const namesakes = entities.map((entity, index) => ({ ...entity, key: 'fixture orion', name: 'Fixture Orion', rawName: index === 0 ? 'Fixture Orion' : 'FIXTURE ORION', disambiguator: `Fixture ${index === 0 ? 'East' : 'West'}` }));
    vi.mocked(searchPlayers).mockResolvedValue({ results: namesakes, error: null });
    const view = await draw();
    expect(view.getByText('Fixture East')).toBeVisible();
    expect(view.getByText('Fixture West')).toBeVisible();
    await waitFor(() => expect(searchPlayers).toHaveBeenCalledExactlyOnceWith({ ...searchOptions, query: 'Fixture', signal: expect.any(AbortSignal) }));
    fireEvent.click(view.getAllByRole('option')[1], { detail: 0 });
    expect(view.props.onSelect).toHaveBeenCalledExactlyOnceWith(namesakes[1]);
  });
});
