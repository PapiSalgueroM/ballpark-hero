import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { PlayerAutocompleteProps } from '@/components/game/PlayerAutocomplete';
import { searchPlayers, type PlayerEntity } from '@/lib/playerSearch';

vi.mock('@/lib/playerSearch', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/playerSearch')>(), searchPlayers: vi.fn(),
}));
const { PlayerAutocomplete } = process.env.AUTOCOMPLETE_TOUCH_COMPONENT
  ? await import(/* @vite-ignore */ process.env.AUTOCOMPLETE_TOUCH_COMPONENT) as typeof import('@/components/game/PlayerAutocomplete')
  : await import('@/components/game/PlayerAutocomplete');
const entities: PlayerEntity[] = [
  { key: 'fixture orion', personKey: 'fixture-east', name: 'Fixture Orion', rawName: 'Fixture Orion', meta: { club: 'Fixture East' }, matchRank: 0, prominence: 2 },
  { key: 'fixture vega', personKey: 'fixture-west', name: 'Fixture Vega', rawName: 'Fixture Vega', meta: { club: 'Fixture West' }, matchRank: 0, prominence: 1 },
];
const searchOptions = { source: { table: 'fixture_players', nameColumn: 'name', filters: [{ column: 'club', op: 'eq' as const, value: 'Fixture East' }] },
  minChars: 3, exclude: new Set(['fixture excluded']) };
type Kind = 'touch' | 'pen' | 'mouse' | undefined;
const CAUSE = 'autocomplete pointerdown committed a scrollable suggestion before activation';

beforeEach(() => {
  vi.mocked(searchPlayers).mockReset(); vi.mocked(searchPlayers).mockResolvedValue({ results: entities, error: null });
});
afterEach(() => {
  cleanup();
  // End any original tap-click wait with the next actual outside pointer event.
  fireEvent.pointerDown(document.body); vi.restoreAllMocks();
});
async function draw(overrides: Partial<PlayerAutocompleteProps> = {}) {
  const props: PlayerAutocompleteProps = { value: 'Fixture', onChange: vi.fn(), onSelect: vi.fn(), searchOptions,
    validateOnly: true, debounceMs: 0, ...overrides };
  const view = render(<PlayerAutocomplete {...props} />), input = view.getByRole('combobox') as HTMLInputElement;
  if (props.value.length >= searchOptions.minChars) await view.findAllByRole('option');
  act(() => input.focus()); return { ...view, input, props };
}
function pointer(target: HTMLElement, kind: Kind, name = 'pointerdown', x = 100, y = 100): boolean {
  const event = new MouseEvent(name, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
  if (kind !== undefined) Object.defineProperty(event, 'pointerType', { value: kind });
  Object.defineProperty(event, 'pointerId', { value: 17 }); Object.defineProperty(event, 'isPrimary', { value: true });
  return fireEvent(target, event);
}
function uncommitted(view: Awaited<ReturnType<typeof draw>>): boolean {
  return vi.mocked(view.props.onChange).mock.calls.length === 0 && vi.mocked(view.props.onSelect).mock.calls.length === 0
    && view.input.value === view.props.value;
}
function picked(view: Awaited<ReturnType<typeof draw>>, entity: PlayerEntity): void {
  expect(view.props.onChange).toHaveBeenCalledExactlyOnceWith(entity.name);
  expect(view.props.onSelect).toHaveBeenCalledExactlyOnceWith(entity); expect(view.queryByRole('listbox')).toBeNull();
}

describe('Player autocomplete touch scroll activation', () => {
  for (const kind of ['touch', 'pen'] as const) it(`touch scroll missing: ${kind} pointerdown leaves the current suggestion uncommitted`, async () => {
    const view = await draw(), option = view.getAllByRole('option')[0], list = view.getByRole('listbox');
    const dispatched = pointer(option, kind);
    expect(uncommitted(view), CAUSE).toBe(true); expect(dispatched, 'scrollable pointerdown must keep its native default').toBe(true);
    expect(view.getByRole('listbox')).toBe(list); expect(view.getAllByRole('option')).toHaveLength(2); expect(view.input).toHaveFocus();
  });
  for (const kind of ['touch', 'pen'] as const) it(`touch scroll missing: ${kind} pointercancel leaves the current suggestion uncommitted`, async () => {
    const view = await draw(), option = view.getAllByRole('option')[0];
    pointer(option, kind); pointer(option, kind, 'pointercancel');
    expect(uncommitted(view), CAUSE).toBe(true); expect(view.getAllByRole('option')).toHaveLength(2);
  });
  for (const kind of ['touch', 'pen'] as const) it(`touch scroll missing: ${kind} drag without a native click leaves the current suggestion uncommitted`, async () => {
    const view = await draw(), option = view.getAllByRole('option')[0];
    pointer(option, kind); pointer(option, kind, 'pointermove', 100, 180); pointer(option, kind, 'pointerup', 100, 180);
    // DOM events test pre-activation state only. The browser owns native scrolling and click cancellation.
    expect(uncommitted(view), CAUSE).toBe(true); expect(view.getAllByRole('option')).toHaveLength(2);
  });
  for (const kind of ['touch', 'pen'] as const) it(`touch scroll preservation: ${kind} completed click commits the current identity once`, async () => {
    const view = await draw(), option = view.getAllByRole('option')[1];
    pointer(option, kind); pointer(option, kind, 'pointerup'); fireEvent.click(option, { detail: 1 });
    picked(view, entities[1]); fireEvent.click(option, { detail: 1 }); picked(view, entities[1]);
  });
  it('touch scroll preservation: mouse pointerdown keeps its original before-blur selection', async () => {
    const view = await draw(), option = view.getAllByRole('option')[0];
    expect(pointer(option, 'mouse')).toBe(false); picked(view, entities[0]); expect(view.input).toHaveFocus();
    fireEvent.blur(view.input, { relatedTarget: document.body }); fireEvent.click(option, { detail: 1 }); picked(view, entities[0]);
  });
  it('touch scroll preservation: unspecified pointerdown keeps its original selection', async () => {
    const view = await draw(), option = view.getAllByRole('option')[0];
    expect(pointer(option, undefined)).toBe(false); picked(view, entities[0]); fireEvent.click(option, { detail: 1 }); picked(view, entities[0]);
  });
  it('touch scroll preservation: keyboard or assistive click commits once', async () => {
    const view = await draw(), option = view.getAllByRole('option')[1]; act(() => option.focus());
    fireEvent.click(option, { detail: 0 }); picked(view, entities[1]); fireEvent.click(option, { detail: 0 }); picked(view, entities[1]);
  });
  it('touch scroll preservation: ArrowDown and Enter keep input focus', async () => {
    const view = await draw(); fireEvent.keyDown(view.input, { key: 'ArrowDown' });
    expect(view.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(view.input, { key: 'Enter' }); picked(view, entities[0]); expect(view.input).toHaveFocus();
  });
  it('touch scroll preservation: ArrowUp and Tab keep input focus', async () => {
    const view = await draw(); fireEvent.keyDown(view.input, { key: 'ArrowUp' });
    expect(view.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(fireEvent.keyDown(view.input, { key: 'Tab' })).toBe(false); picked(view, entities[1]); expect(view.input).toHaveFocus();
  });
  for (const kind of ['touch', 'pen'] as const) it(`touch scroll preservation: disabled ${kind} activation commits nothing`, async () => {
    const view = await draw(), option = view.getAllByRole('option')[0]; view.rerender(<PlayerAutocomplete {...view.props} disabled />);
    expect(view.input).toBeDisabled(); expect(option).toBeDisabled(); pointer(option, kind); fireEvent.click(option, { detail: 1 });
    fireEvent.click(option, { detail: 0 }); fireEvent.keyDown(view.input, { key: 'Enter' }); expect(uncommitted(view)).toBe(true);
  });
  it('touch scroll preservation: changed text removes prior suggestions before activation', async () => {
    const view = await draw(), option = view.getAllByRole('option')[0];
    view.rerender(<PlayerAutocomplete {...view.props} value="Vega" />);
    expect(option.isConnected).toBe(false); expect(view.queryAllByRole('option')).toHaveLength(0);
    pointer(option, 'touch'); fireEvent.click(option, { detail: 1 }); expect(view.props.onSelect).not.toHaveBeenCalled();
    expect(view.props.onChange).not.toHaveBeenCalled(); await view.findAllByRole('option');
  });
  it('touch scroll preservation: changed filters remove prior suggestions before activation', async () => {
    const view = await draw(), option = view.getAllByRole('option')[0];
    const scoped = { ...searchOptions, source: { ...searchOptions.source, filters: [{ column: 'club', op: 'eq' as const, value: 'Fixture West' }] } };
    view.rerender(<PlayerAutocomplete {...view.props} searchOptions={scoped} />);
    expect(option.isConnected).toBe(false); expect(view.queryAllByRole('option')).toHaveLength(0);
    pointer(option, 'pen'); fireEvent.click(option, { detail: 1 }); expect(view.props.onSelect).not.toHaveBeenCalled();
    expect(view.props.onChange).not.toHaveBeenCalled(); await view.findAllByRole('option');
  });
  it('touch scroll preservation: outside focus removes prior suggestions before activation', async () => {
    const view = await draw(), option = view.getAllByRole('option')[0], outside = document.createElement('button'); document.body.appendChild(outside);
    try {
      fireEvent.blur(view.input, { relatedTarget: outside }); expect(view.queryByRole('listbox')).toBeNull(); expect(option.isConnected).toBe(false);
      pointer(option, 'touch'); fireEvent.click(option, { detail: 1 }); expect(view.props.onSelect).not.toHaveBeenCalled();
      expect(view.props.onChange).not.toHaveBeenCalled();
    } finally { outside.remove(); }
  });
  it('touch scroll preservation: namesakes keep exact chosen identity and caller filters', async () => {
    const namesakes = entities.map((entity, index) => ({ ...entity, key: 'fixture orion', name: 'Fixture Orion',
      rawName: index === 0 ? 'Fixture Orion' : 'FIXTURE ORION', disambiguator: `Fixture ${index === 0 ? 'East' : 'West'}` }));
    vi.mocked(searchPlayers).mockResolvedValue({ results: namesakes, error: null }); const held = JSON.stringify(namesakes), view = await draw();
    expect(view.getByText('Fixture East')).toBeVisible(); expect(view.getByText('Fixture West')).toBeVisible();
    await waitFor(() => expect(searchPlayers).toHaveBeenCalledExactlyOnceWith({ ...searchOptions, query: 'Fixture', signal: expect.any(AbortSignal) }));
    fireEvent.click(view.getAllByRole('option')[1], { detail: 0 }); picked(view, namesakes[1]); expect(JSON.stringify(namesakes)).toBe(held);
  });
  it('touch scroll preservation: free text keeps its enabled and disabled Enter contract', async () => {
    const submit = vi.fn(), view = await draw({ value: 'Fi', validateOnly: false, onSubmitFreeText: submit, disabled: true });
    fireEvent.keyDown(view.input, { key: 'Enter' }); expect(submit).not.toHaveBeenCalled();
    view.rerender(<PlayerAutocomplete {...view.props} disabled={false} />); act(() => view.input.focus());
    fireEvent.keyDown(view.input, { key: 'Enter' }); expect(submit).toHaveBeenCalledExactlyOnceWith('Fi');
    expect(view.props.onSelect).not.toHaveBeenCalled(); expect(view.props.onChange).not.toHaveBeenCalled();
  });
});
