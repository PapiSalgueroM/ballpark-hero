import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NbaConnect4 from '@/pages/NbaConnect4';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

function currentTurn() {
  const red = screen.queryAllByText("Red's Turn", { exact: true }).length;
  const blue = screen.queryAllByText("Blue's Turn", { exact: true }).length;
  return red === 1 && blue === 0 ? 'red' : blue === 1 && red === 0 ? 'blue' : 'ambiguous';
}

beforeEach(() => { localStorage.clear(); boundary.picks.length = 0; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

it('a pending NBA answer ignores Skip and gives the next turn only after acceptance', async () => {
  const pending = deferred<Response>();
  const fetchMock = vi.fn().mockReturnValueOnce(pending.promise);
  vi.stubGlobal('fetch', fetchMock);
  render(<NbaConnect4 />);
  expect(screen.getByRole('heading', { level: 1, name: 'NBA CONNECT 4' })).toBeDefined();
  expect(currentTurn()).toBe('red');
  expect(screen.getAllByRole('button', { name: /^Empty square,/ })).toHaveLength(42);

  const skip = screen.getByRole('button', { name: 'Skip' });
  fireEvent.click(skip);
  expect(currentTurn()).toBe('blue');
  fireEvent.click(skip);
  expect(currentTurn()).toBe('red');
  expect(fetchMock).not.toHaveBeenCalled();

  fireEvent.click(screen.getAllByRole('button', { name: /^Empty square,/ })[0]);
  fireEvent.change(screen.getByRole('textbox', { name: 'QA NBA player search' }), { target: { value: 'QA Lock Player' } });
  fireEvent.click(screen.getByRole('button', { name: 'Choose QA NBA player' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toBe('https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/nba-connect4-validate');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).playerName).toBe('QA Lock Player');
  expect(boundary.picks).toHaveLength(1);
  expect(screen.getByRole('textbox', { name: 'QA NBA player search' })).toHaveProperty('disabled', true);

  fireEvent.click(skip);
  const pendingTurn = currentTurn();
  await act(async () => {
    pending.resolve({ ok: true, status: 200, json: async () => ({ valid: true, fullName: 'QA Lock Player' }) } as Response);
    await boundary.picks[0];
  });

  const pieces = screen.queryAllByRole('button', { name: /^QA Lock Player,/ });
  expect({
    pendingTurn,
    finalTurn: currentTurn(),
    redPieces: pieces.filter(piece => piece.classList.contains('bg-red-500/80')).length,
    bluePieces: pieces.filter(piece => piece.classList.contains('bg-blue-500/80')).length,
    occupied: 42 - screen.queryAllByRole('button', { name: /^Empty square,/ }).length,
  }, 'US_CONNECT4_PENDING_TURN_LOCK').toEqual({ pendingTurn: 'red', finalTurn: 'blue', redPieces: 1, bluePieces: 0, occupied: 1 });
});
