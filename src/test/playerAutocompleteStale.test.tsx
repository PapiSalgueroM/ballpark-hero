import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PlayerAutocomplete, type PlayerAutocompleteProps } from '@/components/game/PlayerAutocomplete';
import { normalizeName, searchPlayers, type PlayerEntity } from '@/lib/playerSearch';

/* Round 1138. The search box every search game mounts kept the LAST search's
   names on screen under the new text until the new search answered (the
   debounce plus the fetch), and a tap in that window picked the old name. A
   list is now only ever on screen for the query that produced it, leaving the
   box drops the list, and Enter picks the only name showing where the page
   asks for a pick from the list. The test names are matched by
   scripts/simPlayerAutocompleteInteraction.mjs, so do not rename them. Every
   search here is a stub: no database.

   Measured on main (6f57ce78) before the fix, the sweep of test 1, of 200
   trials: seed 1138 offered a stale name 67 times and picked it 67 times;
   seed 2138, 72 and 72; seed 3138, 67 and 67. After the fix all three read 0. */

vi.mock('@/lib/playerSearch', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/playerSearch')>(),
  searchPlayers: vi.fn(),
}));

const A: PlayerEntity = { key: 'alpha stone', personKey: 'fixture-a', name: 'Alpha Stone', rawName: 'Alpha Stone', meta: { club: 'Fixture East' }, matchRank: 0, prominence: 2 };
const B: PlayerEntity = { key: 'bravo field', personKey: 'fixture-b', name: 'Bravo Field', rawName: 'Bravo Field', meta: { club: 'Fixture West' }, matchRank: 0, prominence: 1 };
const searchOptions = { source: { table: 'fixture_players', nameColumn: 'name' }, minChars: 3 };
const FINDING = 'Finding players...';

/** The fixture whose name the typed text starts, the way the real ranking keeps only a matching row. */
function fixtureFor(query: string): PlayerEntity[] {
  const q = normalizeName(query);
  return [A, B].filter(entity => q.length > 0 && normalizeName(entity.name).startsWith(q));
}

/** A search that answers each query after its own delay, and settles empty at once on an abort (as the real one does). */
function slowSearch(delayFor: (query: string) => number) {
  vi.mocked(searchPlayers).mockImplementation(({ query, signal }) => new Promise(resolve => {
    const timer = setTimeout(() => resolve({ results: fixtureFor(query), error: null }), delayFor(query));
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve({ results: [], error: null }); });
  }));
}

/** A search whose answer is already on its way: it lands after its delay whatever the abort, and every signal it was handed is kept. */
function deafSearch(delayMs: number): (AbortSignal | undefined)[] {
  const signals: (AbortSignal | undefined)[] = [];
  vi.mocked(searchPlayers).mockImplementation(({ query, signal }) => new Promise(resolve => {
    signals.push(signal);
    setTimeout(() => resolve({ results: fixtureFor(query), error: null }), delayMs);
  }));
  return signals;
}

function props(overrides: Partial<PlayerAutocompleteProps> = {}): PlayerAutocompleteProps {
  return { value: 'Alpha', onChange: vi.fn(), onSelect: vi.fn(), searchOptions, validateOnly: true, debounceMs: 0, ...overrides };
}

/** What a test can do to the page below from outside: change its text, make it busy, change what it searches. */
type Page = {
  setText?: (text: string) => void;
  setBusy?: (busy: boolean) => void;
  setOptions?: (options: PlayerAutocompleteProps['searchOptions']) => void;
  setPool?: (names: string[]) => void;
};

/** A page that holds the box's text itself, so a pick leaves the picked name in the box the way a real page does. */
function PageWithBox({ page, onSelect }: { page: Page; onSelect: PlayerAutocompleteProps['onSelect'] }) {
  const [text, setText] = useState('Alpha');
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<PlayerAutocompleteProps['searchOptions']>(searchOptions);
  page.setText = setText;
  page.setBusy = setBusy;
  const [pool, setPool] = useState<string[] | undefined>(undefined);
  page.setOptions = setOptions;
  page.setPool = setPool;
  return <PlayerAutocomplete value={text} onChange={setText} onSelect={onSelect} searchOptions={options} localNames={pool} disabled={busy} validateOnly debounceMs={50} />;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plain DOM reads for the sweep: a role query walks the whole accessibility tree and 800 of them cost a minute. */
function optionsIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
}

async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => {
  vi.useRealTimers();
  vi.mocked(searchPlayers).mockReset();
  vi.mocked(searchPlayers).mockImplementation(async ({ query }) => ({ results: fixtureFor(query), error: null }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('player autocomplete: a list is only on screen for the query that produced it', () => {
  it('never offers the last query under new text, across 200 seeded timings', async () => {
    vi.useFakeTimers();
    const seed = Number(process.env.STALE_SWEEP_SEED || 1138);
    const rng = mulberry32(seed);
    const TRIALS = 200;
    let staleVisible = 0, stalePicked = 0, currentPicked = 0, stuckFinding = 0;
    for (let trial = 0; trial < TRIALS; trial++) {
      const debounceMs = [0, 50, 200][Math.floor(rng() * 3)];
      const aDelay = Math.floor(rng() * 301);                              // 0 to 300
      const bDelay = 50 + Math.floor(rng() * 551);                         // 50 to 600
      const typeAt = Math.floor(rng() * (debounceMs + aDelay + 101));      // A's answer is sometimes still in flight
      const tapAt = Math.floor(rng() * (debounceMs + bDelay));             // always before B's own answer can show
      slowSearch(query => (normalizeName(query).startsWith('a') ? aDelay : bDelay));
      const p = props({ debounceMs });
      const view = render(<PlayerAutocomplete {...p} />);
      await advance(typeAt);
      view.rerender(<PlayerAutocomplete {...p} value="Bravo" />);
      await advance(tapAt);
      const offered = optionsIn(view.container);
      if (offered.some(option => option.textContent?.includes(A.name))) staleVisible++;
      if (offered.length > 0) fireEvent.pointerDown(offered[0]);
      const pickedStale = vi.mocked(p.onSelect).mock.calls.some(([entity]) => entity.personKey === A.personKey);
      if (pickedStale) stalePicked++;
      await advance(debounceMs + bDelay + 50);
      await act(async () => { await vi.runAllTimersAsync(); });
      if (view.container.textContent?.includes(FINDING)) stuckFinding++;
      if (vi.mocked(p.onSelect).mock.calls.length === 0) {
        const current = optionsIn(view.container);
        if (current.length === 1 && current[0].textContent?.includes(B.name)) {
          fireEvent.pointerDown(current[0]);
          if (vi.mocked(p.onSelect).mock.calls.some(([entity]) => entity.personKey === B.personKey)) currentPicked++;
        }
      }
      await act(async () => { await vi.runAllTimersAsync(); });
      if (view.container.textContent?.includes(FINDING)) stuckFinding++;
      view.unmount();
    }
    console.log(`STALE_SWEEP seed=${seed} trials=${TRIALS} staleVisible=${staleVisible} stalePicked=${stalePicked} currentPicked=${currentPicked} stuckFinding=${stuckFinding}`);
    expect({ staleVisible, stalePicked, stuckFinding }).toEqual({ staleVisible: 0, stalePicked: 0, stuckFinding: 0 });
    expect(currentPicked).toBe(TRIALS);
  }, 120_000);

  it('drops the list in the same render the text changes', async () => {
    const p = props();
    const view = render(<PlayerAutocomplete {...p} />);
    expect((await view.findAllByRole('option')).map(o => o.textContent)).toEqual([expect.stringContaining(A.name)]);
    view.rerender(<PlayerAutocomplete {...p} value="Bravo" />);
    expect(view.queryAllByRole('option')).toHaveLength(0);
    expect(view.getByText(FINDING)).toBeVisible();
    expect(view.queryByText('No players found')).toBeNull();
    expect((await view.findAllByRole('option')).map(o => o.textContent)).toEqual([expect.stringContaining(B.name)]);
  });

  it('drops the list when the search options change under the same text', async () => {
    const p = props();
    const view = render(<PlayerAutocomplete {...p} />);
    await view.findAllByRole('option');
    const scoped = { ...searchOptions, source: { ...searchOptions.source, filters: [{ column: 'club', op: 'eq' as const, value: 'Fixture West' }] } };
    view.rerender(<PlayerAutocomplete {...p} searchOptions={scoped} />);
    expect(view.queryAllByRole('option')).toHaveLength(0);
    expect(view.getByText(FINDING)).toBeVisible();
    expect(view.queryByText('No players found')).toBeNull();
    await view.findAllByRole('option');
    expect(searchPlayers).toHaveBeenCalledTimes(2);
  });

  it('drops the list when the player leaves the box and searches again on return', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const ways: { name: string; leave: (input: HTMLElement) => void; back: (input: HTMLElement) => void }[] = [
      { name: 'a tap outside', leave: () => { fireEvent.pointerDown(document.body); }, back: input => { fireEvent.focus(input); } },
      { name: 'Escape', leave: input => { fireEvent.keyDown(input, { key: 'Escape' }); }, back: input => { fireEvent.click(input); } },
      { name: 'focus moving to another control', leave: input => { fireEvent.blur(input, { relatedTarget: outside }); }, back: input => { fireEvent.focus(input); } },
    ];
    try {
      for (const way of ways) {
        vi.mocked(searchPlayers).mockClear();
        const view = render(<PlayerAutocomplete {...props()} />);
        const input = view.getByRole('combobox');
        await view.findAllByRole('option');
        expect(searchPlayers, way.name).toHaveBeenCalledTimes(1);
        way.leave(input);
        expect(view.queryByRole('listbox'), way.name).toBeNull();
        way.back(input);
        expect(view.queryAllByRole('option'), way.name).toHaveLength(0);
        expect(view.getByText(FINDING), way.name).toBeVisible();
        expect((await view.findAllByRole('option')).map(o => o.textContent), way.name).toEqual([expect.stringContaining(A.name)]);
        expect(searchPlayers, way.name).toHaveBeenCalledTimes(2);
        view.unmount();
      }
      // A blur with no related target (the window losing focus) drops nothing.
      vi.mocked(searchPlayers).mockClear();
      const view = render(<PlayerAutocomplete {...props()} />);
      await view.findAllByRole('option');
      fireEvent.blur(view.getByRole('combobox'));
      expect(view.getAllByRole('option')).toHaveLength(1);
      expect(view.queryByText(FINDING)).toBeNull();
      expect(searchPlayers).toHaveBeenCalledTimes(1);
    } finally {
      outside.remove();
    }
  });

  it('Enter picks the only name showing when the page asks for a pick from the list', async () => {
    // One settled name: a held key, and an input method's own Enter, never pick; a plain Enter picks once.
    const one = props();
    const view = render(<PlayerAutocomplete {...one} />);
    const input = view.getByRole('combobox');
    await view.findAllByRole('option');
    fireEvent.keyDown(input, { key: 'Enter', repeat: true });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(one.onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(one.onSelect).toHaveBeenCalledExactlyOnceWith(A);
    expect(one.onChange).toHaveBeenCalledExactlyOnceWith(A.name);
    view.unmount();

    // Two names: Enter does nothing until an arrow key highlights one.
    vi.mocked(searchPlayers).mockResolvedValue({ results: [A, B], error: null });
    const two = props({ value: 'Fixture' });
    const pair = render(<PlayerAutocomplete {...two} />);
    expect(await pair.findAllByRole('option')).toHaveLength(2);
    fireEvent.keyDown(pair.getByRole('combobox'), { key: 'Enter' });
    expect(two.onSelect).not.toHaveBeenCalled();
    pair.unmount();

    // One name from the previous text while the new search is in flight: Enter does nothing.
    vi.mocked(searchPlayers).mockImplementation(async ({ query }) => ({ results: fixtureFor(query), error: null }));
    const stale = props();
    const moved = render(<PlayerAutocomplete {...stale} />);
    await moved.findAllByRole('option');
    vi.mocked(searchPlayers).mockImplementation(() => new Promise(() => {}));
    moved.rerender(<PlayerAutocomplete {...stale} value="Bravo" />);
    fireEvent.keyDown(moved.getByRole('combobox'), { key: 'Enter' });
    expect(stale.onSelect).not.toHaveBeenCalled();
  });

  it('Enter still sends the typed text on a free text page with one name showing', async () => {
    const submit = vi.fn();
    const p = props({ validateOnly: false, onSubmitFreeText: submit });
    const view = render(<PlayerAutocomplete {...p} />);
    expect(await view.findAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(view.getByRole('combobox'), { key: 'Enter' });
    expect(submit).toHaveBeenCalledExactlyOnceWith('Alpha');
    expect(p.onSelect).not.toHaveBeenCalled();
  });

  it('offers a settled list for the text in the box exactly as before', async () => {
    vi.mocked(searchPlayers).mockResolvedValue({ results: [A, B], error: null });
    const p = props({ value: 'Fixture' });
    const view = render(<PlayerAutocomplete {...p} />);
    const options = await view.findAllByRole('option');
    expect(options.map(o => o.textContent)).toEqual([`${A.name}Fixture East`, `${B.name}Fixture West`]);
    expect(view.queryByText(FINDING)).toBeNull();
    expect(searchPlayers).toHaveBeenCalledExactlyOnceWith({ ...searchOptions, query: 'Fixture', signal: expect.any(AbortSignal) });
    expect(fireEvent.pointerDown(options[1])).toBe(false);
    expect(p.onChange).toHaveBeenCalledExactlyOnceWith(B.name);
    expect(p.onSelect).toHaveBeenCalledExactlyOnceWith(B);
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it('never shows Finding players with nothing in flight', async () => {
    // The parent keeps the picked name in the box (Missing XI, Rarity Round, NBA Lineup do), so the text never changes.
    const backs: { name: string; pick: boolean; back: (input: HTMLElement) => void }[] = [
      { name: 'a pick, then focus', pick: true, back: input => { fireEvent.focus(input); } },
      { name: 'Escape, then a click', pick: false, back: input => { fireEvent.click(input); } },
      { name: 'a pick, then a click with no focus event', pick: true, back: input => { fireEvent.click(input); } },
    ];
    for (const way of backs) {
      vi.mocked(searchPlayers).mockClear();
      const p = props({ value: A.name });
      const view = render(<PlayerAutocomplete {...p} />);
      const input = view.getByRole('combobox');
      const [option] = await view.findAllByRole('option');
      if (way.pick) {
        fireEvent.pointerDown(option);
        expect(p.onSelect, way.name).toHaveBeenCalledExactlyOnceWith(A);
      } else {
        fireEvent.keyDown(input, { key: 'Escape' });
      }
      expect(view.queryByRole('listbox'), way.name).toBeNull();
      way.back(input);
      await waitFor(() => expect(searchPlayers, way.name).toHaveBeenCalledTimes(2));
      expect((await view.findAllByRole('option')).map(o => o.textContent), way.name).toEqual([expect.stringContaining(A.name)]);
      expect(view.queryByText(FINDING), way.name).toBeNull();
      view.unmount();
    }
  });

  /* Tests 9 to 12 were added after the review of Round 1138. Its mutation run
     left five one line edits of the box green (the fewest letters boundary and
     the flight guards in leave and in a pick), and its reading found Escape
     swallowed while a search was out. Each test below goes red under the edit
     it is named for; the harness plants four of them as controls. */

  it('searches at exactly the fewest letters the page asks for', async () => {
    vi.useFakeTimers();
    slowSearch(() => 50);
    // minChars is 3 here. Three letters are enough text: the list shows, drops on leaving and returns.
    const three = render(<PlayerAutocomplete {...props({ value: 'Alp' })} />);
    expect(three.queryByText(FINDING)).not.toBeNull();
    await advance(100);
    expect(optionsIn(three.container).map(o => o.textContent)).toEqual([expect.stringContaining(A.name)]);
    fireEvent.pointerDown(document.body);
    expect(three.queryByRole('listbox')).toBeNull();
    fireEvent.focus(three.getByRole('combobox'));
    expect(three.queryByText(FINDING)).not.toBeNull();
    await advance(100);
    expect(optionsIn(three.container)).toHaveLength(1);
    expect(searchPlayers).toHaveBeenCalledTimes(2);
    three.unmount();

    // Three letters that match nobody say so.
    const nobody = render(<PlayerAutocomplete {...props({ value: 'Zzz' })} />);
    await advance(100);
    expect(nobody.queryByText('No players found')).not.toBeNull();
    nobody.unmount();

    // Two letters are not: no panel, no search, and coming back to the box opens nothing.
    vi.mocked(searchPlayers).mockClear();
    const two = render(<PlayerAutocomplete {...props({ value: 'Al' })} />);
    await advance(100);
    fireEvent.focus(two.getByRole('combobox'));
    await advance(100);
    expect(two.queryByRole('listbox')).toBeNull();
    expect(searchPlayers).not.toHaveBeenCalled();
  });

  it('drops a search still in flight when the player leaves the box', async () => {
    vi.useFakeTimers();
    // The answer is already on its way and does not hear the abort, so it lands after the player has left.
    const signals = deafSearch(300);
    const deaf = render(<PlayerAutocomplete {...props()} />);
    await advance(100);
    expect(signals).toHaveLength(1);
    expect(deaf.queryByText(FINDING)).not.toBeNull();
    fireEvent.pointerDown(document.body);
    expect(signals[0]?.aborted).toBe(true);
    expect(deaf.queryByRole('listbox')).toBeNull();
    await advance(400);
    expect(deaf.queryByRole('listbox')).toBeNull();
    // Coming back: nothing asked before leaving may show, only the row of the fresh search.
    fireEvent.focus(deaf.getByRole('combobox'));
    expect(optionsIn(deaf.container)).toHaveLength(0);
    expect(deaf.queryByText('No players found')).toBeNull();
    expect(deaf.queryByText(FINDING)).not.toBeNull();
    await advance(400);
    expect(optionsIn(deaf.container).map(o => o.textContent)).toEqual([expect.stringContaining(A.name)]);
    expect(signals).toHaveLength(2);
    deaf.unmount();

    // Leaving inside the debounce window: the search for the text the player left is never sent.
    vi.mocked(searchPlayers).mockClear();
    slowSearch(() => 50);
    const early = render(<PlayerAutocomplete {...props({ debounceMs: 200 })} />);
    await advance(100);
    fireEvent.pointerDown(document.body);
    await advance(1000);
    expect(searchPlayers).not.toHaveBeenCalled();
    expect(early.queryByRole('listbox')).toBeNull();
    fireEvent.focus(early.getByRole('combobox'));
    expect(early.queryByText(FINDING)).not.toBeNull();
    await advance(300);
    expect(optionsIn(early.container)).toHaveLength(1);
    expect(searchPlayers).toHaveBeenCalledTimes(1);
  });

  it('drops a search still in flight when a name is picked', async () => {
    vi.useFakeTimers();
    /* The page keeps the picked name in the box, and its own name pool changes
       while the list shows: the box searches again under the same text, so the
       settled list stays up with a second search behind it. */
    const signals = deafSearch(300);
    const p = props({ value: A.name, localNames: ['Pool One'] });
    const view = render(<PlayerAutocomplete {...p} />);
    await advance(400);
    expect(optionsIn(view.container)).toHaveLength(1);
    view.rerender(<PlayerAutocomplete {...p} localNames={['Pool Two']} />);
    await advance(100);
    expect(signals).toHaveLength(2);
    fireEvent.pointerDown(optionsIn(view.container)[0]);
    expect(p.onSelect).toHaveBeenCalledExactlyOnceWith(A);
    expect(signals[1]?.aborted).toBe(true);
    await advance(400);
    expect(view.queryByRole('listbox')).toBeNull();
    // Coming back: not the list from before the pick, a fresh search.
    fireEvent.focus(view.getByRole('combobox'));
    expect(optionsIn(view.container)).toHaveLength(0);
    expect(view.queryByText(FINDING)).not.toBeNull();
    await advance(400);
    expect(optionsIn(view.container)).toHaveLength(1);
    expect(signals).toHaveLength(3);
    view.unmount();

    // The same pick inside the debounce window: the search that was waiting is never sent.
    vi.mocked(searchPlayers).mockClear();
    slowSearch(() => 50);
    const q = props({ value: A.name, localNames: ['Pool One'], debounceMs: 200 });
    const waiting = render(<PlayerAutocomplete {...q} />);
    await advance(400);
    expect(searchPlayers).toHaveBeenCalledTimes(1);
    waiting.rerender(<PlayerAutocomplete {...q} localNames={['Pool Two']} />);
    await advance(100);
    fireEvent.pointerDown(optionsIn(waiting.container)[0]);
    expect(q.onSelect).toHaveBeenCalledExactlyOnceWith(A);
    await advance(1000);
    expect(searchPlayers).toHaveBeenCalledTimes(1);
    expect(waiting.queryByRole('listbox')).toBeNull();
  });

  it('Escape leaves the box while a search is in flight', async () => {
    vi.useFakeTimers();
    const signals = deafSearch(300);
    const view = render(<PlayerAutocomplete {...props()} />);
    const input = view.getByRole('combobox');
    await advance(100);
    expect(view.queryByText(FINDING)).not.toBeNull();
    fireEvent.keyDown(input, { key: 'Escape' });
    // The panel closes now, not when the names arrive, and the search is given up.
    expect(view.queryByRole('listbox')).toBeNull();
    expect(signals[0]?.aborted).toBe(true);
    await advance(400);
    expect(view.queryByRole('listbox')).toBeNull();
    fireEvent.click(input);
    expect(view.queryByText(FINDING)).not.toBeNull();
    await advance(400);
    expect(optionsIn(view.container).map(o => o.textContent)).toEqual([expect.stringContaining(A.name)]);
    // Escape again with the next search out, then typing on: the new text gets its own list and nothing older.
    view.rerender(<PlayerAutocomplete {...props({ value: 'Alph' })} />);
    await advance(100);
    fireEvent.keyDown(input, { key: 'Escape' });
    view.rerender(<PlayerAutocomplete {...props({ value: 'Bravo' })} />);
    await advance(250);
    expect(optionsIn(view.container)).toHaveLength(0);
    await advance(400);
    expect(optionsIn(view.container).map(o => o.textContent)).toEqual([expect.stringContaining(B.name)]);
    view.unmount();

    // Escape closes the empty row too.
    slowSearch(() => 0);
    const nobody = render(<PlayerAutocomplete {...props({ value: 'Zzz' })} />);
    await advance(50);
    expect(nobody.queryByText('No players found')).not.toBeNull();
    fireEvent.keyDown(nobody.getByRole('combobox'), { key: 'Escape' });
    expect(nobody.queryByRole('listbox')).toBeNull();
  });

  /* Test 13 was added by the closing fix pass. A pick used to search for the
     picked name straight away, so on a page that keeps the name in the box the
     list came back over whatever sits under it (Missing XI's Lock in guess
     button), and on a page that shows the name while it checks the pick the
     list sat open under a disabled box (Build Your XI). */
  it('a pick does not bring the list back under the picked name', async () => {
    vi.useFakeTimers();
    slowSearch(() => 50);
    const lastQuery = () => vi.mocked(searchPlayers).mock.calls.at(-1)?.[0].query;

    // Missing XI's shape: the page keeps the picked name in the box.
    const keeps: Page = {};
    const onSelect = vi.fn();
    const view = render(<PageWithBox page={keeps} onSelect={onSelect} />);
    const input = view.getByRole('combobox') as HTMLInputElement;
    await advance(200);
    expect(optionsIn(view.container).map(o => o.textContent)).toEqual([expect.stringContaining(A.name)]);
    expect(searchPlayers).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(optionsIn(view.container)[0]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(A);
    expect(input.value).toBe(A.name);
    expect(view.queryByRole('listbox')).toBeNull();
    await advance(1000);
    expect(view.queryByRole('listbox')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(searchPlayers).toHaveBeenCalledTimes(1);
    // The page's own name pool changing under the picked name opens nothing either: the player is not in the box.
    act(() => keeps.setPool?.(['Pool Two']));
    await advance(1000);
    expect(view.queryByRole('listbox')).toBeNull();
    expect(searchPlayers).toHaveBeenCalledTimes(1);

    // Coming back to the box asks for the picked name's own list.
    fireEvent.click(input);
    expect(view.queryByText(FINDING)).not.toBeNull();
    await advance(200);
    expect(optionsIn(view.container).map(o => o.textContent)).toEqual([expect.stringContaining(A.name)]);
    expect(searchPlayers).toHaveBeenCalledTimes(2);
    expect(lastQuery()).toBe(A.name);

    // Picking again closes it again, and any other text is searched for like always.
    fireEvent.pointerDown(optionsIn(view.container)[0]);
    await advance(1000);
    expect(view.queryByRole('listbox')).toBeNull();
    expect(searchPlayers).toHaveBeenCalledTimes(2);
    act(() => keeps.setText?.('Alpha Ston'));
    expect(view.queryByText(FINDING)).not.toBeNull();
    await advance(200);
    expect(optionsIn(view.container)).toHaveLength(1);
    expect(searchPlayers).toHaveBeenCalledTimes(3);
    view.unmount();

    // Build Your XI's shape: the box is disabled with the picked name in it while the pick is checked, then cleared.
    vi.mocked(searchPlayers).mockClear();
    const checks: Page = {};
    const busyView = render(<PageWithBox page={checks} onSelect={() => checks.setBusy?.(true)} />);
    await advance(200);
    fireEvent.pointerDown(optionsIn(busyView.container)[0]);
    expect((busyView.getByRole('combobox') as HTMLInputElement).value).toBe(A.name);
    expect(busyView.getByRole('combobox')).toBeDisabled();
    await advance(1000);
    expect(busyView.queryByRole('listbox')).toBeNull();
    expect(searchPlayers).toHaveBeenCalledTimes(1);
    act(() => { checks.setBusy?.(false); checks.setText?.(''); });
    await advance(1000);
    expect(busyView.queryByRole('listbox')).toBeNull();
    // The pick is over: the same name put in whole (a paste, a swipe typed word) is searched for.
    act(() => checks.setText?.(A.name));
    expect(busyView.queryByText(FINDING)).not.toBeNull();
    await advance(200);
    expect(optionsIn(busyView.container).map(o => o.textContent)).toEqual([expect.stringContaining(A.name)]);
    expect(searchPlayers).toHaveBeenCalledTimes(2);
    busyView.unmount();

    // A new source under the picked name (the next team, the next category) is a new query and is searched for.
    vi.mocked(searchPlayers).mockClear();
    const moves: Page = {};
    const movedView = render(<PageWithBox page={moves} onSelect={vi.fn()} />);
    await advance(200);
    fireEvent.pointerDown(optionsIn(movedView.container)[0]);
    await advance(1000);
    expect(searchPlayers).toHaveBeenCalledTimes(1);
    act(() => moves.setOptions?.({ ...searchOptions, source: { ...searchOptions.source, filters: [{ column: 'club', op: 'eq' as const, value: 'Fixture East' }] } }));
    await advance(200);
    expect(optionsIn(movedView.container)).toHaveLength(1);
    expect(searchPlayers).toHaveBeenCalledTimes(2);
  });
});
