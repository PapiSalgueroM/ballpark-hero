import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NbaConnect4 from '@/pages/NbaConnect4';
import NflConnect4 from '@/pages/NflConnect4';
import NhlConnect4 from '@/pages/NhlConnect4';
import MlbConnect4 from '@/pages/MlbConnect4';
import { useNbaConnect4 } from '@/hooks/useNbaConnect4';
import { useNflConnect4 } from '@/hooks/useNflConnect4';
import { useNhlConnect4 } from '@/hooks/useNhlConnect4';
import { useMlbConnect4 } from '@/hooks/useMlbConnect4';

const boundary = vi.hoisted(() => ({ picks: [] as Promise<void>[] }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ title, headerExtra, children }: { title: string; headerExtra?: ReactNode; children: ReactNode }) => (
    <main><h1>{title}</h1>{headerExtra}{children}</main>
  ),
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/nba-connect4/NbaConnect4HowToPlay', () => ({ NbaConnect4HowToPlay: () => null }));
vi.mock('@/components/nfl-connect4/NflConnect4HowToPlay', () => ({ NflConnect4HowToPlay: () => null }));
vi.mock('@/components/nhl-connect4/NhlConnect4HowToPlay', () => ({ NhlConnect4HowToPlay: () => null }));
vi.mock('@/components/mlb-connect4/MlbConnect4HowToPlay', () => ({ MlbConnect4HowToPlay: () => null }));
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  PlayerAutocomplete: ({ value, onChange, onSelect, disabled }: {
    value: string; onChange: (value: string) => void;
    onSelect: (entity: { name: string }) => void | Promise<void>; disabled?: boolean;
  }) => (
    <div>
      <input aria-label="QA NBA player search" value={value} disabled={disabled} onChange={event => onChange(event.target.value)} />
      <button type="button" disabled={disabled} onClick={() => {
        boundary.picks.push(Promise.resolve(onSelect({ name: value })));
      }}>Choose QA NBA player</button>
    </div>
  ),
}));

const games = [
  { sport: 'NBA', Page: NbaConnect4, useGame: useNbaConnect4, endpoint: 'nba-connect4-validate' },
  { sport: 'NFL', Page: NflConnect4, useGame: useNflConnect4, endpoint: 'nfl-connect4-validate' },
  { sport: 'NHL', Page: NhlConnect4, useGame: useNhlConnect4, endpoint: 'nhl-connect4-validate' },
  { sport: 'MLB', Page: MlbConnect4, useGame: useMlbConnect4, endpoint: 'mlb-connect4-validate' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function accepted(name: string) {
  return { ok: true, status: 200, json: async () => ({ valid: true, fullName: name }) } as Response;
}

function currentTurn() {
  const red = screen.queryAllByText("Red's Turn", { exact: true }).length;
  const blue = screen.queryAllByText("Blue's Turn", { exact: true }).length;
  return red === 1 && blue === 0 ? 'red' : blue === 1 && red === 0 ? 'blue' : 'ambiguous';
}

type GameState = ReturnType<typeof useNbaConnect4>;
function observed(state: GameState) {
  return {
    team: state.currentTeam, selected: state.selectedCol, checking: state.isValidating,
    occupied: state.grid.flat().filter(Boolean).length, used: state.usedPlayers.size, phase: state.phase,
  };
}

function oneRedAt(col: number, name: string) {
  return Array.from({ length: 6 }, (_, row) => Array.from({ length: 7 }, (_, column) => (
    row === 5 && column === col ? { team: 'red', playerName: name } : null
  )));
}

beforeEach(() => { localStorage.clear(); boundary.picks.length = 0; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

for (const game of games) {
  it(`a pending ${game.sport} answer ignores Skip and gives the next turn only after acceptance`, async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    render(<game.Page />);
    expect(screen.getByRole('heading', { level: 1, name: `${game.sport} CONNECT 4` })).toBeDefined();
    expect(currentTurn()).toBe('red');
    expect(screen.getAllByRole('button', { name: /^Empty square,/ })).toHaveLength(42);

    const skip = screen.getByRole('button', { name: 'Skip' });
    fireEvent.click(skip);
    expect(currentTurn()).toBe('blue');
    fireEvent.click(skip);
    expect(currentTurn()).toBe('red');
    expect(fetchMock).not.toHaveBeenCalled();

    const cells = screen.getAllByRole<HTMLButtonElement>('button', { name: /^Empty square,/ });
    const headers = screen.getAllByRole<HTMLButtonElement>('button').filter(button => (
      button.parentElement === cells[0].parentElement && !button.hasAttribute('aria-label')
    ));
    expect(headers).toHaveLength(7);
    expect(headers.every(button => !button.disabled)).toBe(true);
    expect(cells.every(button => !button.disabled)).toBe(true);
    fireEvent.click(cells[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'QA NBA player search' }), { target: { value: 'QA Lock Player' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose QA NBA player' }));
    let pendingTurn = 'not observed';
    let locked: { skip: boolean; headers: boolean[]; cells: boolean[]; input: boolean } | undefined;
    let selectedAfterAttempts = -1;
    try {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toBe(`https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/${game.endpoint}`);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).playerName).toBe('QA Lock Player');
      expect(boundary.picks).toHaveLength(1);
      expect(screen.getByRole('textbox', { name: 'QA NBA player search' })).toHaveProperty('disabled', true);
      locked = {
        skip: (skip as HTMLButtonElement).disabled,
        headers: headers.map(button => button.disabled), cells: cells.map(button => button.disabled),
        input: (screen.getByRole('textbox', { name: 'QA NBA player search' }) as HTMLInputElement).disabled,
      };
      fireEvent.click(skip);
      fireEvent.click(headers[1]);
      fireEvent.click(cells[2]);
      pendingTurn = currentTurn();
      selectedAfterAttempts = headers.findIndex(button => button.classList.contains('bg-primary'));
    } finally {
      await act(async () => {
        pending.resolve(accepted('QA Lock Player'));
        await Promise.all(boundary.picks);
      });
    }

    const pieces = screen.queryAllByRole('button', { name: /^QA Lock Player,/ });
    expect({
      pendingTurn,
      finalTurn: currentTurn(),
      redPieces: pieces.filter(piece => piece.classList.contains('bg-red-500/80')).length,
      bluePieces: pieces.filter(piece => piece.classList.contains('bg-blue-500/80')).length,
      occupied: 42 - screen.queryAllByRole('button', { name: /^Empty square,/ }).length,
    }, 'US_CONNECT4_PENDING_TURN_LOCK').toEqual({ pendingTurn: 'red', finalTurn: 'blue', redPieces: 1, bluePieces: 0, occupied: 1 });
    expect(locked, 'US_CONNECT4_PENDING_UI_LOCK').toEqual({ skip: true, headers: Array(7).fill(true), cells: Array(42).fill(true), input: true });
    expect(selectedAfterAttempts, 'US_CONNECT4_PENDING_SELECTION_LOCK').toBe(0);
    expect(pieces[0].getAttribute('aria-label')).toBe(cells[35].getAttribute('aria-label'));
    expect(screen.getAllByRole<HTMLButtonElement>('button', { name: /^Empty square,/ }).every(button => !button.disabled)).toBe(true);
    expect(headers.every(button => !button.disabled)).toBe(true);
    expect(skip).toHaveProperty('disabled', false);
  }, 20000);

  it(`${game.sport} hook API synchronously locks a second submit, Skip and column selection`, async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => game.useGame());
    act(() => { result.current.selectColumn(0); });
    const requests: Promise<void>[] = [];
    let locked: ReturnType<typeof observed> | undefined;
    try {
      act(() => {
        const api = result.current;
        requests.push(api.submitPlayer('QA First Player'));
        requests.push(api.submitPlayer('QA Second Player'));
        api.skipTurn();
        api.selectColumn(1);
      });
      locked = observed(result.current);
    } finally {
      await act(async () => {
        pending.resolve(accepted('QA First Player'));
        await Promise.all(requests);
      });
    }
    expect(fetchMock, 'US_CONNECT4_SYNCHRONOUS_SUBMIT_LOCK').toHaveBeenCalledTimes(1);
    expect(locked, 'US_CONNECT4_PENDING_HOOK_LOCK').toEqual({ team: 'red', selected: 0, checking: true, occupied: 0, used: 0, phase: 'playing' });
    expect(result.current.grid).toEqual(oneRedAt(0, 'QA First Player'));
    expect(observed(result.current)).toEqual({ team: 'blue', selected: null, checking: false, occupied: 1, used: 1, phase: 'playing' });
  });

  for (const outcome of ['unverified', '429', 'transport'] as const) {
    it(`${game.sport} keeps the pending turn and square through ${outcome} and accepts the same-turn retry`, async () => {
      const pending = deferred<Response>();
      const fetchMock = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(accepted('QA Retry Player'));
      vi.stubGlobal('fetch', fetchMock);
      const { result } = renderHook(() => game.useGame());
      act(() => { result.current.selectColumn(0); });
      let request: Promise<void> | undefined;
      let locked: ReturnType<typeof observed> | undefined;
      try {
        act(() => { request = result.current.submitPlayer('QA Pending Player'); });
        act(() => { result.current.skipTurn(); result.current.selectColumn(1); });
        locked = observed(result.current);
        await act(async () => {
          if (outcome === 'transport') pending.reject(new TypeError('QA transport unavailable'));
          else pending.resolve({
            ok: outcome !== '429', status: outcome === '429' ? 429 : 200,
            json: async () => ({ valid: false, unverified: true, reason: 'QA verifier unavailable, try again.' }),
          } as Response);
          await request;
        });
      } finally {
        await act(async () => {
          pending.resolve(accepted('QA Pending Player'));
          await request;
        });
      }
      const refused = observed(result.current);
      const refusal = result.current.validationError;
      await act(async () => { await result.current.submitPlayer('QA Retry Player'); });
      expect(locked, 'US_CONNECT4_RETRY_PENDING_LOCK').toEqual({ team: 'red', selected: 0, checking: true, occupied: 0, used: 0, phase: 'playing' });
      expect(refused, 'US_CONNECT4_NO_PENALTY_RETRY').toEqual({ team: 'red', selected: 0, checking: false, occupied: 0, used: 0, phase: 'playing' });
      expect(refusal).toEqual(expect.stringMatching(/try again/i));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        playerName: 'QA Pending Player', columnAttribute: result.current.board.columnAttributes[0], rowAttribute: result.current.board.rowAttributes[5],
      });
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
        playerName: 'QA Retry Player', columnAttribute: result.current.board.columnAttributes[0], rowAttribute: result.current.board.rowAttributes[5],
      });
      expect(result.current.grid).toEqual(oneRedAt(0, 'QA Retry Player'));
      expect(observed(result.current)).toEqual({ team: 'blue', selected: null, checking: false, occupied: 1, used: 1, phase: 'playing' });
      expect(result.current.validationError).toBeNull();
    });
  }

  it(`${game.sport} still accepts a normal answer after ordinary Skip and selection`, async () => {
    const fetchMock = vi.fn().mockResolvedValue(accepted('QA Normal Player'));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => game.useGame());
    expect(observed(result.current)).toEqual({ team: 'red', selected: null, checking: false, occupied: 0, used: 0, phase: 'playing' });
    act(() => { result.current.skipTurn(); });
    expect(result.current.currentTeam).toBe('blue');
    act(() => { result.current.skipTurn(); result.current.selectColumn(2); });
    expect(result.current.currentTeam).toBe('red');
    await act(async () => { await result.current.submitPlayer('QA Normal Player'); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/${game.endpoint}`);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      playerName: 'QA Normal Player', columnAttribute: result.current.board.columnAttributes[2], rowAttribute: result.current.board.rowAttributes[5],
    });
    expect(result.current.grid).toEqual(oneRedAt(2, 'QA Normal Player'));
    expect(observed(result.current)).toEqual({ team: 'blue', selected: null, checking: false, occupied: 1, used: 1, phase: 'playing' });
    expect(result.current.validationError).toBeNull();
  });
}
