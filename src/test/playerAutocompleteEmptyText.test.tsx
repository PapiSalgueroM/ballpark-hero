import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import type { PlayerEntity, SearchPlayersOptions } from '@/lib/playerSearch';

/* Round 1010a. A name outside Transfer Path's pool used to meet a bare "No
   players found", and nothing reached a report because the box only takes a
   pick from the list (the tpa-762 report arrived with lastRejected null).
   This holds the two optional props that fix it, emptyText and onNoResults,
   and the board's use of them: the pool text, the chain or target text when
   the search came back empty only because the name is left out on purpose,
   and the last empty search riding along with a report. */

type Reply = { results: PlayerEntity[]; error: string | null } | 'reject';
const replies = new Map<string, Reply>();
const holds = new Set<string>();
const releases = new Map<string, () => void>();
const calls: string[] = [];

vi.mock('@/lib/playerSearch', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/playerSearch')>();
  return {
    ...real,
    searchPlayers: vi.fn(async ({ query, signal }: SearchPlayersOptions) => {
      const key = real.normalizeName(query);
      calls.push(key);
      if (holds.has(key)) await new Promise<void>(resolve => releases.set(key, resolve));
      // The real searchPlayers settles an aborted search as empty, no error.
      if (signal?.aborted) return { results: [], error: null };
      const reply = replies.get(key) ?? { results: [], error: null };
      if (reply === 'reject') throw new Error('fixture network down');
      return reply;
    }),
  };
});

/* simTransferPathEmptyState's controls swap in a rewritten copy of the
   empty list rules; without the variable this is the real module. */
vi.mock('@/lib/transferPathEmptyList', async () => {
  const swapped = process.env.TRANSFER_PATH_EMPTY_LIST;
  return swapped ? await import(/* @vite-ignore */ swapped) : await vi.importActual('@/lib/transferPathEmptyList');
});

/* The board is drawn for real with its hook and frame stubbed, so what is
   tested is the board's own wiring: the exclude set it builds, the text it
   picks and the context it hands a report. */
const board = {
  puzzle: { id: 'tpa-762', playerA: 'Alisson Becker', playerB: 'Mikel Oyarzabal', minSteps: 3, hint: 'Stored hint.' },
  chain: ['Alisson Becker', 'Martin Ødegaard'],
  connections: [null, 'Fixture FC'],
  status: 'building', score: 0, mode: 'daily', unlimitedIndex: 0,
  rule: 'classic', activeRule: 'classic', setRule: () => {}, ruleLocked: true, dailyRuleBlocked: false,
  ruleAvailability: { classic: 3, active: 0, europe: 0 }, optimal: 3, hint: 'Head hint.', stranded: false,
  moreHelp: null as null | { doors: unknown; lines: string[] },
  addPlayer: () => ({ ok: false, club: null }), giveUp: () => {}, revealPath: null,
  switchToUnlimited: () => {}, nextPuzzle: () => {},
  /* Round 1010a review: the punctuated and short form names a player types
     without the hyphen, the apostrophe or the full name. */
  getAllPlayerNames: () => [
    'Alisson Becker', 'Martin Ødegaard', 'Mikel Oyarzabal',
    'Trent Alexander-Arnold', "N'Golo Kanté", "Samuel Eto'o", 'Son Heung-min', 'Vinícius Júnior',
    'Neymar', 'Lionel Messi', 'Warren Zaïre-Emery', 'Mohamed Salah',
  ],
  getPlayerNationality: () => '', getPlayerClubs: () => new Set<string>(),
  isLoading: false, isLoadingPool: false,
};
vi.mock('@/hooks/useTransferPath', () => ({ useTransferPath: () => board }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra?: ReactNode; children: ReactNode }) => <div>{headerExtra}{children}</div>,
}));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({
  default: ({ gameContext }: { gameContext: Record<string, unknown> }) => <pre data-testid="report">{JSON.stringify(gameContext)}</pre>,
}));

const { PlayerAutocomplete } = await import('@/components/game/PlayerAutocomplete');
/* simTransferPathEmptyState swaps in a rewritten copy of the board for its
   negative controls, the same way simTransferPathGuidance swaps the hook. */
const boardPath = process.env.TRANSFER_PATH_BOARD;
const { TransferPathBoard } = boardPath
  ? await import(/* @vite-ignore */ boardPath)
  : await import('@/components/transfer-path/TransferPathBoard');
const { searchPlayers } = await import('@/lib/playerSearch');

const entity = (name: string): PlayerEntity =>
  ({ key: name, name, meta: {} } as unknown as PlayerEntity);

function draw(initial: string, props: { emptyText?: string; onNoResults?: (q: string) => void } = {}) {
  let setText: (v: string) => void = () => {};
  function Fixture() {
    const [text, set] = useState(initial);
    setText = set;
    return (
      <PlayerAutocomplete value={text} onChange={set} onSelect={() => {}} validateOnly
        searchOptions={{ source: {} as never, minChars: 2 }} debounceMs={0} {...props} />
    );
  }
  render(<Fixture />);
  return { type: (v: string) => act(() => setText(v)) };
}

beforeEach(() => { replies.clear(); holds.clear(); releases.clear(); calls.length = 0; });
afterEach(() => cleanup());

describe('PlayerAutocomplete emptyText and onNoResults', () => {
  it('keeps the default text for every caller that passes nothing', async () => {
    draw('zzzz');
    expect(await screen.findByText('No players found')).toBeTruthy();
  });

  it('shows emptyText when it is passed', async () => {
    draw('zzzz', { emptyText: 'Not in this pool yet.' });
    expect(await screen.findByText('Not in this pool yet.')).toBeTruthy();
    expect(screen.queryByText('No players found')).toBeNull();
  });

  it('fires onNoResults once per settled empty search, with the text searched', async () => {
    const onNoResults = vi.fn();
    const view = draw('zzzz', { onNoResults });
    await waitFor(() => expect(onNoResults).toHaveBeenCalledTimes(1));
    expect(onNoResults).toHaveBeenLastCalledWith('zzzz');
    view.type('qqqq');
    await waitFor(() => expect(onNoResults).toHaveBeenCalledTimes(2));
    expect(onNoResults).toHaveBeenLastCalledWith('qqqq');
  });

  it('does not fire when the search found someone', async () => {
    replies.set('vega', { results: [entity('Fixture Vega')], error: null });
    const onNoResults = vi.fn();
    draw('vega', { onNoResults });
    expect((await screen.findByRole('option')).textContent).toContain('Fixture Vega');
    expect(onNoResults).not.toHaveBeenCalled();
  });

  it('does not fire on a failed search, resolved or thrown, and keeps the failure text', async () => {
    replies.set('broken', { results: [], error: 'Search failed' });
    replies.set('thrown', 'reject');
    const onNoResults = vi.fn();
    const view = draw('broken', { onNoResults, emptyText: 'Not in this pool yet.' });
    expect(await screen.findByText('Could not load players. Try searching again.')).toBeTruthy();
    view.type('thrown');
    await waitFor(() => expect(screen.getByText('Could not load players. Try searching again.')).toBeTruthy());
    await new Promise(r => setTimeout(r, 20));
    expect(calls).toEqual(['broken', 'thrown']);
    expect(onNoResults).not.toHaveBeenCalled();
    expect(screen.queryByText('Not in this pool yet.')).toBeNull();
  });

  it('does not fire for a search that was overtaken and aborted before it settled', async () => {
    holds.add('slow');
    const onNoResults = vi.fn();
    const view = draw('slow', { onNoResults });
    await waitFor(() => expect(releases.has('slow')).toBe(true));
    replies.set('fast', { results: [entity('Fast Fixture')], error: null });
    view.type('fast');
    expect((await screen.findByRole('option')).textContent).toContain('Fast Fixture');
    await act(async () => { releases.get('slow')!(); await new Promise(r => setTimeout(r, 20)); });
    expect(calls).toEqual(['slow', 'fast']);
    expect(onNoResults).not.toHaveBeenCalled();
  });
});

describe('Transfer Path board: the empty list says why', () => {
  const POOL_TEXT = 'No player by that name in the Transfer Path pool yet. The pool holds 12 players.';
  const CHAIN_TEXT = "Already in your chain, or it's the target. Name one of his teammates.";
  const SPELLING_TEXT = 'Nothing matches that exact spelling. Try just the start of his surname.';

  async function typeIntoBoard(text: string) {
    render(<TransferPathBoard />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: text } });
    return screen.findByRole('status');
  }

  it("names the target by surname: the chain or target text, not 'not in the pool'", async () => {
    expect((await typeIntoBoard('oyarzabal')).textContent).toBe(CHAIN_TEXT);
  });

  it('an accented chain name typed plain is left out of the list and gets the same text', async () => {
    expect((await typeIntoBoard('odegaard')).textContent).toBe(CHAIN_TEXT);
    const exclude = vi.mocked(searchPlayers).mock.calls.at(-1)![0].exclude as Set<string>;
    expect([...exclude].sort()).toEqual(['alisson becker', 'martin odegaard', 'mikel oyarzabal']);
  });

  it('the target typed without his punctuation still gets the chain or target text', async () => {
    board.puzzle.playerB = 'Warren Zaïre-Emery';
    try {
      expect((await typeIntoBoard('zaire emery')).textContent).toBe(CHAIN_TEXT);
    } finally {
      board.puzzle.playerB = 'Mikel Oyarzabal';
    }
  });

  /* Round 1010a review: the search matches the text as typed, so every one of
     these comes back empty although the man is in the pool. None may be told
     he is not in it. */
  it.each([
    'alexander arnold', 'ngolo kante', 'etoo', 'heung-min son', 'son heung min',
    'vinicius jr', 'neymar jr', 'zaire emery', 'mo salah', 'leo messi',
  ])('a pool man typed as %s gets the spelling text, never "not in the pool"', async typedName => {
    expect((await typeIntoBoard(typedName)).textContent).toBe(SPELLING_TEXT);
  });

  it('a name nobody in the pool carries gets the pool text, and the next report carries it', async () => {
    expect((await typeIntoBoard('zzzz')).textContent).toBe(POOL_TEXT);
    await waitFor(() => {
      const report = JSON.parse(screen.getByTestId('report').textContent!);
      expect(report.lastNoMatch).toBe('zzzz');
      expect(report.poolSize).toBe(12);
    });
  });

  it('opens More help under the hint, and shows only the lines the hook made', async () => {
    board.moreHelp = { doors: {}, lines: ['🔎 First fixture line.', '🎯 Second fixture line.'] };
    try {
      render(<TransferPathBoard />);
      expect(screen.queryByText('More help')).toBeNull();
      fireEvent.click(screen.getByText('Show hint'));
      fireEvent.click(screen.getByText('More help'));
      expect(screen.getByText('🔎 First fixture line.')).toBeTruthy();
      expect(screen.getByText('🎯 Second fixture line.')).toBeTruthy();
    } finally {
      board.moreHelp = null;
    }
  });
});
