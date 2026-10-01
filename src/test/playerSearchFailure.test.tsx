import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { dedupeAndRank, searchPlayers, type PlayerSourceConfig } from '@/lib/playerSearch';

const source: PlayerSourceConfig = {
  table: 'fixture_players', nameColumn: 'name', foldedNameColumn: 'folded',
  prominenceColumn: 'rating', recencyColumn: 'year', metaColumns: { club: 'club' },
  filters: [{ column: 'active', op: 'eq', value: true }],
};
const rows = [
  { name: 'Fixture Vega', rating: 90, year: 2025, club: 'Fixture West' },
  { name: 'Fixture Orion', rating: 80, year: 2025, club: 'Fixture East' },
  { name: 'Fixture Vega', rating: 70, year: 2020, club: 'Fixture Earlier' },
];
const failureText = 'Could not load players. Try searching again.';
type Reply = { rows?: typeof rows; fail?: boolean };
type Plan = { direct: Reply; fallback: Reply };
const plans = new Map<string, Plan>();
const pending = new Map<string, (() => void)[]>();
const requests: { query: string; direct: boolean; url: URL; signal?: AbortSignal | null }[] = [];
let heldQuery: string | null = null;
let writes: ReturnType<typeof vi.spyOn>;
let random: ReturnType<typeof vi.spyOn>;

const responseFor = (reply: Reply) => {
  return new Response(JSON.stringify(reply.fail ? { code: 'FIXTURE503', message: 'Private fixture diagnostic' } : reply.rows ?? []), {
    status: reply.fail ? 503 : 200, headers: { 'content-type': 'application/json' },
  });
};
function setup(plan: Plan, query = 'fixture') { plans.set(query, plan); }
function release(query: string) { pending.get(query)?.forEach(resolve => resolve()); pending.delete(query); }
function draw(value = 'Fixture', options: { localNames?: string[]; validateOnly?: boolean; debounceMs?: number } = {}) {
  const selected = vi.fn(), submitted = vi.fn();
  function Fixture() {
    const [text, setText] = useState(value);
    return <PlayerAutocomplete value={text} onChange={setText} onSelect={selected}
      searchOptions={{ source, minChars: 2, limit: 2 }} placeholder="Fixture player search"
      debounceMs={options.debounceMs ?? 0} localNames={options.localNames}
      validateOnly={options.validateOnly ?? true} onSubmitFreeText={submitted} />;
  }
  const view = render(<Fixture />);
  return { ...view, input: view.getByRole('combobox'), selected, submitted };
}

beforeEach(() => {
  plans.clear(); pending.clear(); requests.length = 0; heldQuery = null;
  writes = vi.spyOn(Storage.prototype, 'setItem');
  random = vi.spyOn(Math, 'random');
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    expect(method).toBe('GET');
    expect(url.pathname).toBe('/rest/v1/fixture_players');
    const direct = url.searchParams.has('folded');
    const keys = [...plans.keys()];
    const query = direct ? (url.searchParams.get('folded') ?? '').replace(/^ilike\.\%|\%$/g, '') : keys[keys.length - 1] ?? 'fixture';
    requests.push({ query, direct, url, signal: init?.signal });
    const reply = plans.get(query)?.[direct ? 'direct' : 'fallback'] ?? { rows: [] };
    if (heldQuery === query) await new Promise<void>(resolve => pending.set(query, [...pending.get(query) ?? [], resolve]));
    return responseFor(reply);
  }));
});
afterEach(() => { cleanup(); writes.mockRestore(); random.mockRestore(); vi.unstubAllGlobals(); });

describe('truthful player-search failures', () => {
  it('reports each failed empty request leg including a skipped long-query fallback', async () => {
    for (const plan of [{ direct: { fail: true }, fallback: { rows: [] } }, { direct: { rows: [] }, fallback: { fail: true } }, { direct: { fail: true }, fallback: { fail: true } }]) {
      setup(plan);
      const result = await searchPlayers({ source, query: 'Fixture', minChars: 2 });
      expect(result.results).toEqual([]);
      expect(result.error).toBe('Private fixture diagnostic');
    }
    setup({ direct: { fail: true }, fallback: { rows } }, 'fixture fictional long player name');
    const first = requests.length;
    const long = await searchPlayers({ source, query: 'Fixture Fictional Long Player Name', minChars: 2 });
    expect(long).toEqual({ results: [], error: 'Private fixture diagnostic' });
    expect(requests.slice(first)).toHaveLength(1);
    expect(requests[requests.length - 1]?.direct).toBe(true);
  });

  it('keeps useful partial request results in the exact original ranking', async () => {
    for (const plan of [{ direct: { fail: true }, fallback: { rows } }, { direct: { rows }, fallback: { fail: true } }]) {
      setup(plan);
      const options = { source, query: 'Fixture', minChars: 2, limit: 2 };
      const result = await searchPlayers(options);
      expect(result).toEqual({ results: dedupeAndRank([rows], source, 'fixture', { limit: 2 }), error: null });
    }
  });

  it('shows a generic retry message for an actual failed empty lookup', async () => {
    setup({ direct: { fail: true }, fallback: { rows: [] } });
    const view = draw();
    await waitFor(() => expect(view.queryByText(failureText)).not.toBeNull());
    expect(view.getByText(failureText)).toHaveAttribute('role', 'status');
    expect(view.queryByText('No players found')).toBeNull();
    expect(view.queryByText('Private fixture diagnostic')).toBeNull();
    fireEvent.keyDown(view.input, { key: 'Enter' });
    expect(view.selected).not.toHaveBeenCalled();
    expect(view.submitted).not.toHaveBeenCalled();
  });

  it('keeps a successful empty lookup as no players found', async () => {
    setup({ direct: { rows: [] }, fallback: { rows: [] } });
    const view = draw();
    expect(await view.findByText('No players found')).toBeInTheDocument();
    expect(view.queryByText(failureText)).toBeNull();
  });

  it('clears failed search feedback on typing and successful results', async () => {
    setup({ direct: { fail: true }, fallback: { rows: [] } });
    const view = draw();
    await view.findByText(failureText);
    setup({ direct: { rows }, fallback: { rows: [] } }, 'fixture vega');
    heldQuery = 'fixture vega';
    fireEvent.change(view.input, { target: { value: 'Fixture Vega' } });
    await waitFor(() => expect(pending.get('fixture vega')).toHaveLength(2));
    expect(view.queryByText(failureText)).toBeNull();
    await act(async () => release('fixture vega'));
    expect(await view.findByRole('option', { name: /Fixture Vega/ })).toBeInTheDocument();
    expect(view.queryByText(failureText)).toBeNull();
  });

  it('keeps useful local matches selectable during remote failure', async () => {
    setup({ direct: { fail: true }, fallback: { fail: true } });
    const view = draw('Fixture', { localNames: ['Fixture Local'] });
    const option = await view.findByRole('option', { name: /Fixture Local/ });
    expect(view.queryByText(failureText)).toBeNull();
    fireEvent.click(option, { detail: 0 });
    expect(view.selected).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ rawName: 'Fixture Local', key: 'fixture local' }));
    expect(view.submitted).not.toHaveBeenCalled();
  });

  it('ignores an old failure after a newer request succeeds', async () => {
    setup({ direct: { fail: true }, fallback: { fail: true } }); heldQuery = 'fixture';
    const view = draw();
    await waitFor(() => expect(pending.get('fixture')).toHaveLength(2));
    setup({ direct: { rows }, fallback: { rows: [] } }, 'fixture vega');
    fireEvent.change(view.input, { target: { value: 'Fixture Vega' } });
    await view.findByRole('option', { name: /Fixture Vega/ });
    await act(async () => release('fixture'));
    expect(view.queryAllByRole('option')).toHaveLength(1);
    expect(view.queryByText(failureText)).toBeNull();
  });

  it('keeps a cleared in-flight search quiet without stale failure feedback', async () => {
    setup({ direct: { fail: true }, fallback: { fail: true } }); heldQuery = 'fixture';
    const view = draw();
    await waitFor(() => expect(pending.get('fixture')).toHaveLength(2));
    const firstSignal = requests[0].signal;
    fireEvent.change(view.input, { target: { value: '' } });
    expect(firstSignal?.aborted).toBe(true);
    await act(async () => release('fixture'));
    expect(view.queryByRole('listbox')).toBeNull();
    expect(view.queryByText(failureText)).toBeNull();
  });

  it('suppresses an intentionally aborted request even when its transport resolves an error', async () => {
    setup({ direct: { fail: true }, fallback: { fail: true } }); heldQuery = 'fixture';
    const controller = new AbortController();
    const result = searchPlayers({ source, query: 'Fixture', signal: controller.signal });
    await waitFor(() => expect(pending.get('fixture')).toHaveLength(2));
    controller.abort(); release('fixture');
    expect(await result).toEqual({ results: [], error: null });
  });

  it('preserves enabled free-text submission after a failed lookup', async () => {
    setup({ direct: { fail: true }, fallback: { rows: [] } });
    const view = draw('Fixture', { validateOnly: false });
    await view.findByText(failureText);
    fireEvent.keyDown(view.input, { key: 'Enter' });
    expect(view.submitted).toHaveBeenCalledExactlyOnceWith('Fixture');
    expect(view.selected).not.toHaveBeenCalled();
  });

  it('holds the independent original ranking filters exact selection and quiet storage', async () => {
    setup({ direct: { rows }, fallback: { rows } });
    const randomBefore = random.mock.calls.length;
    const result = await searchPlayers({ source, query: 'Fixture', exclude: new Set(['fixture orion']), limit: 2 });
    expect(result.results.map(entity => entity.rawName)).toEqual(['Fixture Vega']);
    expect(result.results[0].meta).toEqual({ club: 'Fixture West' });
    for (const request of requests) {
      expect(request.url.searchParams.get('active')).toBe('eq.true');
      expect(request.url.searchParams.get('order')).toBe('rating.desc,year.desc,name.asc');
      expect(request.url.searchParams.get('limit')).toBe(request.direct ? '200' : '1000');
    }
    const view = draw();
    const expected = dedupeAndRank([rows], source, 'fixture', { limit: 2 });
    await view.findAllByRole('option');
    fireEvent.keyDown(view.input, { key: 'ArrowDown' });
    fireEvent.keyDown(view.input, { key: 'ArrowDown' });
    fireEvent.keyDown(view.input, { key: 'Enter' });
    expect(view.selected).toHaveBeenCalledExactlyOnceWith(expected[1]);
    expect(view.submitted).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(random.mock.calls.length).toBe(randomBefore);
  });
});
