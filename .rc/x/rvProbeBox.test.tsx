import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { PlayerAutocomplete, type PlayerAutocompleteProps } from '@/components/game/PlayerAutocomplete';
import { normalizeName, searchPlayers, type PlayerEntity } from '@/lib/playerSearch';

/* REVIEWER'S PROBE for Round 1138 (runner lens). Never committed. Legs the round's own tests do not walk:
   a search still in flight when the player leaves the box, and the exact minChars boundary. */

vi.mock('@/lib/playerSearch', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/playerSearch')>(),
  searchPlayers: vi.fn(),
}));

const A: PlayerEntity = { key: 'alpha stone', personKey: 'fixture-a', name: 'Alpha Stone', rawName: 'Alpha Stone', meta: { club: 'Fixture East' }, matchRank: 0, prominence: 2 };
const B: PlayerEntity = { key: 'bravo field', personKey: 'fixture-b', name: 'Bravo Field', rawName: 'Bravo Field', meta: { club: 'Fixture West' }, matchRank: 0, prominence: 1 };
const searchOptions = { source: { table: 'fixture_players', nameColumn: 'name' }, minChars: 3 };
const FINDING = 'Finding players...';

function fixtureFor(query: string): PlayerEntity[] {
  const q = normalizeName(query);
  return [A, B].filter(entity => q.length > 0 && normalizeName(entity.name).startsWith(q));
}
function props(overrides: Partial<PlayerAutocompleteProps> = {}): PlayerAutocompleteProps {
  return { value: 'Alpha', onChange: vi.fn(), onSelect: vi.fn(), searchOptions, validateOnly: true, debounceMs: 0, ...overrides };
}
function optionsIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
}
async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => { vi.useFakeTimers(); vi.mocked(searchPlayers).mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('reviewer probe: the search box', () => {
  it('P1 leaving with a search in flight whose source ignores the abort: nothing fetched before leaving comes back', async () => {
    let calls = 0;
    vi.mocked(searchPlayers).mockImplementation(({ query }) => new Promise(resolve => {
      calls += 1;
      setTimeout(() => resolve({ results: fixtureFor(query), error: null }), 300);
    }));
    const view = render(<PlayerAutocomplete {...props()} />);
    await advance(100);
    expect(calls).toBe(1);
    expect(view.queryByText(FINDING)).not.toBeNull();
    fireEvent.pointerDown(document.body);
    await advance(400); // the answer lands after the player left
    expect(optionsIn(view.container)).toHaveLength(0);
    fireEvent.focus(view.getByRole('combobox'));
    // Before the new search answers, no name fetched before leaving may be on screen.
    expect(optionsIn(view.container)).toHaveLength(0);
    expect(view.queryByText('No players found')).toBeNull();
    expect(view.queryByText(FINDING)).not.toBeNull();
    await advance(400);
    expect(optionsIn(view.container)).toHaveLength(1);
    expect(calls).toBe(2);
  });

  it('P2 leaving with a search in flight that honours the abort: no empty row flashes on return', async () => {
    vi.mocked(searchPlayers).mockImplementation(({ query, signal }) => new Promise(resolve => {
      const timer = setTimeout(() => resolve({ results: fixtureFor(query), error: null }), 300);
      signal?.addEventListener('abort', () => { clearTimeout(timer); resolve({ results: [], error: null }); });
    }));
    const view = render(<PlayerAutocomplete {...props()} />);
    await advance(100);
    fireEvent.pointerDown(document.body);
    await advance(400);
    fireEvent.focus(view.getByRole('combobox'));
    expect(view.queryByText('No players found')).toBeNull();
    expect(view.queryByText(FINDING)).not.toBeNull();
    await advance(400);
    expect(optionsIn(view.container)).toHaveLength(1);
  });

  it('P3 exactly minChars letters: the list shows, drops on leaving and returns on coming back', async () => {
    vi.mocked(searchPlayers).mockImplementation(({ query }) => new Promise(resolve => {
      setTimeout(() => resolve({ results: fixtureFor(query), error: null }), 50);
    }));
    const view = render(<PlayerAutocomplete {...props({ value: 'Alp' })} />);
    await advance(100);
    expect(optionsIn(view.container)).toHaveLength(1);
    fireEvent.pointerDown(document.body);
    expect(optionsIn(view.container)).toHaveLength(0);
    fireEvent.focus(view.getByRole('combobox'));
    expect(view.queryByText(FINDING)).not.toBeNull();
    await advance(100);
    expect(optionsIn(view.container)).toHaveLength(1);
  });

  it('P4 exactly minChars letters with no match says No players found', async () => {
    vi.mocked(searchPlayers).mockImplementation(async () => ({ results: [], error: null }));
    const view = render(<PlayerAutocomplete {...props({ value: 'Zzz' })} />);
    await advance(50);
    expect(view.queryByText('No players found')).not.toBeNull();
  });

  it('P5 Escape with a search in flight, then typing on: the new text gets its own list and nothing older', async () => {
    vi.mocked(searchPlayers).mockImplementation(({ query }) => new Promise(resolve => {
      setTimeout(() => resolve({ results: fixtureFor(query), error: null }), 300);
    }));
    const view = render(<PlayerAutocomplete {...props()} />);
    await advance(100);
    fireEvent.keyDown(view.getByRole('combobox'), { key: 'Escape' });
    view.rerender(<PlayerAutocomplete {...props({ value: 'Bravo' })} />);
    await advance(250); // Alpha's answer (asked before Escape) lands now, Bravo's is still out
    expect(optionsIn(view.container).filter(o => (o.textContent || '').includes('Alpha'))).toHaveLength(0);
    await advance(400);
    expect(optionsIn(view.container).map(o => (o.textContent || '').includes('Bravo'))).toEqual([true]);
  });
});
