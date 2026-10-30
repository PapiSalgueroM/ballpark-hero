import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FootballConnect4 from '@/pages/FootballConnect4';
import { useFootballConnect4 } from '@/hooks/useFootballConnect4';

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
vi.mock('@/components/football-connect4/FootballConnect4HowToPlay', () => ({ FootballConnect4HowToPlay: () => null }));
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  PlayerAutocomplete: ({ value, onChange, onSelect, disabled }: {
    value: string; onChange: (value: string) => void;
    onSelect: (entity: { name: string }) => void | Promise<void>; disabled?: boolean;
  }) => (
    <div>
      <input aria-label="QA player search" value={value} disabled={disabled} onChange={event => onChange(event.target.value)} />
      <button type="button" disabled={disabled} onClick={() => {
        boundary.picks.push(Promise.resolve(onSelect({ name: value })));
      }}>Choose QA player</button>
    </div>
  ),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

const answer = (name: string) => ({
  ok: true, status: 200, json: async () => ({ valid: true, fullName: name }),
}) as Response;
const PRIOR = 'QA Prior Player';
const LATE = 'QA Pending Player';

beforeEach(() => {
  localStorage.clear();
  boundary.picks.length = 0;
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

it('an enabled Unlimited restart keeps the fresh board after the previous answer arrives', async () => {
  const pending = deferred<Response>();
  const fetchMock = vi.fn().mockResolvedValueOnce(answer(PRIOR)).mockReturnValueOnce(pending.promise);
  vi.stubGlobal('fetch', fetchMock);
  render(<FootballConnect4 />);

  const unlimited = screen.getByRole('button', { name: '∞ Unlimited' });
  fireEvent.click(unlimited);
  expect(screen.getByText("Blue's Turn", { exact: true })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /^Empty square,/ })).toHaveLength(42);

  fireEvent.click(screen.getAllByRole('button', { name: /^Empty square,/ })[0]);
  fireEvent.change(screen.getByRole('textbox', { name: 'QA player search' }), { target: { value: PRIOR } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Choose QA player' }));
    await boundary.picks[0];
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole('button', { name: /^QA Prior Player,/ })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: /^Empty square,/ })).toHaveLength(41);
  expect(screen.getByText("Red's Turn", { exact: true })).toBeDefined();

  fireEvent.click(screen.getAllByRole('button', { name: /^Empty square,/ })[0]);
  fireEvent.change(screen.getByRole('textbox', { name: 'QA player search' }), { target: { value: LATE } });
  fireEvent.click(screen.getByRole('button', { name: 'Choose QA player' }));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(boundary.picks).toHaveLength(2);
  expect(screen.getByRole('textbox', { name: 'QA player search' })).toHaveProperty('disabled', true);
  expect(unlimited).toHaveProperty('disabled', false);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).playerName).toBe(LATE);

  vi.mocked(Math.random).mockReturnValue(0.999);
  fireEvent.click(unlimited);
  expect(screen.getByText("Blue's Turn", { exact: true })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /^Empty square,/ })).toHaveLength(42);
  expect(screen.queryAllByRole('button', { name: /^QA Prior Player,/ })).toHaveLength(0);
  const freshLabels = screen.getAllByRole('button', { name: /^Empty square,/ }).map(button => button.getAttribute('aria-label'));

  await act(async () => {
    pending.resolve(answer(LATE));
    await boundary.picks[1];
  });

  expect({
    emptySquares: screen.queryAllByRole('button', { name: /^Empty square,/ }).map(button => button.getAttribute('aria-label')),
    priorPieces: screen.queryAllByRole('button', { name: /^QA Prior Player,/ }).length,
    latePieces: screen.queryAllByRole('button', { name: /^QA Pending Player,/ }).length,
    blueTurn: screen.queryAllByText("Blue's Turn", { exact: true }).length,
    redTurn: screen.queryAllByText("Red's Turn", { exact: true }).length,
  }, 'FOOTBALL_CONNECT4_STALE_RESTART_BOARD').toEqual({
    emptySquares: freshLabels, priorPieces: 0, latePieces: 0, blueTurn: 1, redTurn: 0,
  });
});

type View = { result: { current: ReturnType<typeof useFootballConnect4> } };
type FetchBoundary = ReturnType<typeof vi.fn>;
type ReplyKind = 'accepted' | 'rejected' | 'unverified' | '429' | 'transport' | 'delayed JSON';
const RESTART_REPLIES: ReplyKind[] = ['accepted', 'rejected', 'unverified', '429', 'transport', 'delayed JSON'];
const OVERLAP_REPLIES: ReplyKind[] = ['accepted', 'rejected', '429', 'transport'];

function gate<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function pendingValidation(kind: ReplyKind, name: string) {
  const wire = gate<Response>();
  const body = gate<unknown>();
  const entered = gate<void>();
  const payload = kind === 'accepted' || kind === 'delayed JSON'
    ? { valid: true, fullName: name }
    : { valid: false, reason: 'QA validator refusal', ...(kind === 'unverified' ? { unverified: true } : {}) };
  const response = {
    ok: kind !== '429', status: kind === '429' ? 429 : 200,
    json: () => { entered.resolve(); return kind === 'delayed JSON' ? body.promise : Promise.resolve(payload); },
  } as Response;
  return {
    promise: wire.promise,
    async exposeJSON() { wire.resolve(response); await entered.promise; },
    release() {
      if (kind === 'transport') wire.reject(new Error('QA transport failure'));
      else if (kind === 'delayed JSON') body.resolve(payload);
      else wire.resolve(response);
    },
  };
}

function wireFetch() {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function openHook(mode: 'daily' | 'unlimited' = 'unlimited') {
  const view = renderHook(() => useFootballConnect4());
  if (mode === 'unlimited') act(() => view.result.current.switchMode('unlimited'));
  expect(view.result.current.isLoading).toBe(false);
  expect(view.result.current.phase).toBe('playing');
  return view;
}

function gameFacts(view: View) {
  const state = view.result.current;
  return JSON.parse(JSON.stringify({
    mode: state.mode, config: state.boardConfig, board: state.board, currentTurn: state.currentTurn,
    phase: state.phase, winner: state.winner, isDraw: state.isDraw,
    usedPlayers: [...state.usedPlayers].sort(), selectedColumn: state.selectedColumn,
    targetRow: state.targetRow, validationError: state.validationError,
  }));
}

function storageFacts() {
  return Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]);
}

async function move(view: View, fetchMock: FetchBoundary, name: string, col = 0) {
  fetchMock.mockResolvedValueOnce(answer(name));
  act(() => view.result.current.selectColumn(col));
  await act(async () => { await view.result.current.submitPlayer(name); });
  expect(view.result.current.isValidating).toBe(false);
}

async function priorMove(view: View, fetchMock: FetchBoundary) {
  await move(view, fetchMock, PRIOR);
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(1);
  expect(view.result.current.currentTurn).toBe('red');
}

async function begin(view: View, fetchMock: FetchBoundary, kind: ReplyKind, name = LATE, col = 0) {
  const request = pendingValidation(kind, name);
  fetchMock.mockReturnValueOnce(request.promise);
  act(() => view.result.current.selectColumn(col));
  let work!: Promise<void>;
  act(() => { work = view.result.current.submitPlayer(name); });
  if (kind === 'delayed JSON') await act(async () => { await request.exposeJSON(); });
  return { request, work };
}

async function settle(pending: Awaited<ReturnType<typeof begin>>) {
  await act(async () => { pending.request.release(); await pending.work; });
}

function restart(view: View) {
  vi.mocked(Math.random).mockReturnValue(0.999);
  act(() => view.result.current.switchMode('unlimited'));
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(0);
  expect(view.result.current.currentTurn).toBe('blue');
}

for (const kind of RESTART_REPLIES) it(`ignores ${kind} from the previous Unlimited game after restart`, async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  await priorMove(view, fetchMock);
  const pending = await begin(view, fetchMock, kind);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  restart(view);
  const fresh = gameFacts(view);
  const stored = storageFacts();
  await settle(pending);
  expect(gameFacts(view), `C4_STALE_RESTART_${kind}`).toEqual(fresh);
  expect(view.result.current.isValidating).toBe(false);
  expect(storageFacts()).toEqual(stored);
  await move(view, fetchMock, 'QA Fresh Player', 1);
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(1);
  expect(view.result.current.usedPlayers.size).toBe(1);
  expect(view.result.current.currentTurn).toBe('red');
});

for (const kind of OVERLAP_REPLIES) it(`old ${kind} cannot settle or unlock the new game request`, async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  await priorMove(view, fetchMock);
  const old = await begin(view, fetchMock, kind);
  restart(view);
  const current = await begin(view, fetchMock, 'accepted', 'QA Current Player', 1);
  try {
    expect(fetchMock, 'C4_NEW_REQUEST_AVAILABLE').toHaveBeenCalledTimes(3);
    expect(view.result.current.isValidating).toBe(true);
    const waiting = gameFacts(view);
    await settle(old);
    expect(gameFacts(view), `C4_OLD_REPLY_${kind}`).toEqual(waiting);
    expect(view.result.current.isValidating, 'C4_OLD_FINALLY_OWNS_NO_LOCK').toBe(true);
  } finally { await settle(old); await settle(current); }
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(1);
  expect(view.result.current.board.flat().find(Boolean)?.playerName).toBe('QA Current Player');
  expect(view.result.current.usedPlayers.size).toBe(1);
  expect(view.result.current.currentTurn).toBe('red');
  expect(view.result.current.isValidating).toBe(false);
});

for (const kind of ['accepted', 'transport'] as const) it(`Cancel invalidates a pending ${kind} answer`, async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  const pending = await begin(view, fetchMock, kind);
  act(() => view.result.current.cancelSelection());
  const cancelled = gameFacts(view);
  await settle(pending);
  expect(gameFacts(view), 'C4_CANCEL_OWNS_SELECTION').toEqual(cancelled);
  expect(view.result.current.isValidating).toBe(false);
  expect(view.result.current.selectedColumn).toBeNull();
  expect(view.result.current.targetRow).toBeNull();
});

for (const from of ['daily', 'unlimited'] as const) it(`${from} mode reply cannot add a ghost move after switching modes`, async () => {
  const fetchMock = wireFetch();
  const view = openHook(from);
  const pending = await begin(view, fetchMock, 'accepted');
  const stored = storageFacts();
  act(() => view.result.current.switchMode(from === 'daily' ? 'unlimited' : 'daily'));
  const destination = gameFacts(view);
  await settle(pending);
  expect(gameFacts(view), 'C4_MODE_OWNS_BOARD').toEqual(destination);
  expect(storageFacts(), 'C4_MODE_OWNS_DAILY_SAVE').toEqual(stored);
  expect(view.result.current.isValidating).toBe(false);
  if (from === 'daily') {
    act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(0);
    expect(view.result.current.currentTurn).toBe('blue');
  }
});

it('an accepted daily reply after unmount cannot write a saved move', async () => {
  const fetchMock = wireFetch();
  const view = openHook('daily');
  const pending = await begin(view, fetchMock, 'accepted');
  const stored = storageFacts();
  view.unmount();
  await settle(pending);
  expect(storageFacts(), 'C4_UNMOUNT_OWNS_DAILY_SAVE').toEqual(stored);
});

it('same-frame submissions own only one validator call and one move', async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  const request = pendingValidation('accepted', LATE);
  fetchMock.mockReturnValue(request.promise);
  act(() => view.result.current.selectColumn(0));
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => { first = view.result.current.submitPlayer(LATE); second = view.result.current.submitPlayer(LATE); });
  try { expect(fetchMock, 'C4_ONE_PENDING_VALIDATOR').toHaveBeenCalledTimes(1); }
  finally { await act(async () => { request.release(); await Promise.all([first, second]); }); }
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(1);
  expect(view.result.current.usedPlayers.size).toBe(1);
  expect(view.result.current.currentTurn).toBe('red');
});

for (const kind of ['accepted', 'rejected', 'unverified', '429', 'transport'] as const) it(`ordinary ${kind} preserves the current game contract`, async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  const pending = await begin(view, fetchMock, kind);
  const waiting = gameFacts(view);
  await settle(pending);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(view.result.current.isValidating).toBe(false);
  if (kind === 'accepted') {
    expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(1);
    expect(view.result.current.currentTurn).toBe('red');
    expect(view.result.current.selectedColumn).toBeNull();
    expect(view.result.current.targetRow).toBeNull();
    expect(view.result.current.usedPlayers.size).toBe(1);
  } else {
    expect({ ...gameFacts(view), validationError: null }).toEqual(waiting);
    expect(view.result.current.validationError).toBeTruthy();
    expect(view.result.current.currentTurn).toBe('blue');
    expect(view.result.current.phase).toBe('playing');
    expect(storageFacts()).toEqual([]);
    await move(view, fetchMock, 'QA Retried Player');
    expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(1);
    expect(view.result.current.currentTurn).toBe('red');
  }
});

for (const team of ['blue', 'red'] as const) it(`ordinary ${team} four in a column keeps its winner`, async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  if (team === 'red') act(() => view.result.current.skipTurn());
  for (let index = 0; index < 4; index += 1) {
    await move(view, fetchMock, `QA ${team} Winner ${index}`);
    if (index < 3) act(() => view.result.current.skipTurn());
  }
  expect(view.result.current.phase).toBe('won');
  expect(view.result.current.winner).toBe(team);
  expect(view.result.current.isDraw).toBe(false);
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(4);
});

it('an ordinary full board without four remains a draw', async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  const rows = ['RRBBRRB', 'RRBBRRB', 'RRBBRRB', 'BBRRBBR', 'RRBBRRB', 'RRBBRRB'];
  let moves = 0;
  for (let col = 0; col < 7; col += 1) for (let row = 5; row >= 0; row -= 1) {
    const team = rows[row][col] === 'R' ? 'red' : 'blue';
    if (view.result.current.currentTurn !== team) act(() => view.result.current.skipTurn());
    expect(view.result.current.phase).toBe('playing');
    await move(view, fetchMock, `QA Draw Player ${++moves}`, col);
  }
  expect(moves).toBe(42);
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(42);
  expect(view.result.current.phase).toBe('won');
  expect(view.result.current.isDraw).toBe(true);
  expect(view.result.current.winner).toBeNull();
});

it('a discarded Page reply cannot clear the new game draft', async () => {
  const fetchMock = wireFetch();
  const pending = pendingValidation('accepted', LATE);
  fetchMock.mockReturnValueOnce(pending.promise);
  render(<FootballConnect4 />);
  const unlimited = screen.getByRole('button', { name: '∞ Unlimited' });
  fireEvent.click(unlimited);
  fireEvent.click(screen.getAllByRole('button', { name: /^Empty square,/ })[0]);
  fireEvent.change(screen.getByRole('textbox', { name: 'QA player search' }), { target: { value: LATE } });
  fireEvent.click(screen.getByRole('button', { name: 'Choose QA player' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(unlimited);
  try {
    const square = screen.getAllByRole('button', { name: /^Empty square,/ })[0];
    expect(square, 'C4_RESTART_NEW_INPUT_AVAILABLE').toHaveProperty('disabled', false);
    fireEvent.click(square);
    fireEvent.change(screen.getByRole('textbox', { name: 'QA player search' }), { target: { value: 'QA New Draft' } });
    await act(async () => { pending.release(); await boundary.picks[0]; });
    expect(screen.getByRole('textbox', { name: 'QA player search' }), 'C4_PAGE_OWNS_NEW_DRAFT').toHaveProperty('value', 'QA New Draft');
    expect(screen.getAllByRole('button', { name: /^Empty square,/ })).toHaveLength(42);
  } finally { await act(async () => { pending.release(); await boundary.picks[0]; }); }
});

it('old delayed JSON cannot unlock a newer request', async () => {
  const fetchMock = wireFetch();
  const view = openHook();
  const old = await begin(view, fetchMock, 'delayed JSON');
  restart(view);
  const current = await begin(view, fetchMock, 'accepted', 'QA Current JSON Player', 1);
  try {
    expect(fetchMock, 'C4_JSON_NEW_REQUEST_AVAILABLE').toHaveBeenCalledTimes(2);
    const waiting = gameFacts(view);
    await settle(old);
    expect(gameFacts(view), 'C4_JSON_REPLY_OWNS_NO_BOARD').toEqual(waiting);
    expect(view.result.current.isValidating, 'C4_JSON_FINALLY_OWNS_NO_LOCK').toBe(true);
  } finally { await settle(old); await settle(current); }
  expect(view.result.current.board.flat().filter(Boolean)).toHaveLength(1);
  expect(view.result.current.board.flat().find(Boolean)?.playerName).toBe('QA Current JSON Player');
});
