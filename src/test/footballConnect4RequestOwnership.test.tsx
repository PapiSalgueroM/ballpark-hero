import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FootballConnect4 from '@/pages/FootballConnect4';

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
