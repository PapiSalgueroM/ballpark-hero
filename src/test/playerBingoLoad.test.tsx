// Fictional boundary data exercises actual page load ownership without transport.
import './dailyReload/mocks';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, type ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import PlayerBingo from '@/pages/PlayerBingo';
import type { BingoCriterion, BingoData } from '@/lib/playerBingo';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const boundary = vi.hoisted(() => ({ calls: [] as { signal?: AbortSignal; resolve: (data: BingoData | null) => void; reject: (reason: unknown) => void }[] }));
vi.mock('@/lib/playerBingo', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/playerBingo')>();
  return { ...real,
    fetchBingoData: (signal?: AbortSignal) => new Promise<BingoData | null>((resolve, reject) => { boundary.calls.push({ signal, resolve, reject }); }),
    buildCriteria: (data: BingoData) => Array.from({ length: 24 }, (_, i): BingoCriterion => ({ id: `fixture-${i}`, kind: 'nationality', label: `${data.pool[0].name} tile ${i}`, icon: 'T', support: [], test: () => true })),
    generateBoard: (criteria: BingoCriterion[]) => criteria,
    buildDeck: (pool: BingoData['pool']) => pool,
  };
});
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const fixture = (name = 'Fictional Fresh'): BingoData => ({
  pool: Array.from({ length: 40 }, (_, i) => ({ name: i === 0 ? name : `Fictional ${i}`, nationality: 'Fixture', position: 'Fixture', club: 'Fixture', value: 0, age: 0, year: 0 })),
  clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map(), worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
});
const page = <HelmetProvider><MemoryRouter><PlayerBingo /></MemoryRouter></HelmetProvider>;
const settle = async (index: number, data: BingoData | null) => { await act(async () => { boundary.calls[index].resolve(data); }); };
const expire = async () => { await act(async () => { vi.advanceTimersByTime(30_000); }); };
beforeEach(() => { boundary.calls = []; localStorage.clear(); resetMocks(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Player Bingo owned load', () => {
  it('keeps a successful board playable and replays without another pool request', async () => {
    const view = render(page);
    expect(view.queryByTitle('Fictional Fresh tile 0')).toBeNull();
    await settle(0, fixture());
    expect(view.getByTitle('Fictional Fresh tile 0')).toBeEnabled();
    for (const i of [10, 11, 12, 13]) fireEvent.click(view.getByTitle(`Fictional Fresh tile ${i}`));
    fireEvent.click(view.getByRole('button', { name: 'Bank the win' }));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/player-bingo', 100, 'Tester');
    fireEvent.click(view.getByRole('button', { name: 'New board' }));
    expect(view.getByTitle('Fictional Fresh tile 0')).toBeEnabled();
    expect(boundary.calls).toHaveLength(1);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps null failures closed and allows one explicit successful retry', async () => {
    const view = render(page); await settle(0, null);
    expect(view.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(view.queryByTitle('Fictional Fresh tile 0')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Try again' }));
    expect(boundary.calls).toHaveLength(2);
    await settle(1, fixture());
    expect(view.getByTitle('Fictional Fresh tile 0')).toBeEnabled();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('ends a permanently pending load at 30 seconds without automatic retry', async () => {
    const view = render(page);
    act(() => { vi.advanceTimersByTime(29_999); });
    expect(view.queryByRole('button', { name: 'Try again' })).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(view.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(boundary.calls[0].signal?.aborted).toBe(true);
    act(() => { vi.advanceTimersByTime(90_000); });
    expect(boundary.calls).toHaveLength(1);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('ignores a timed-out old success after a fresh retry becomes playable', async () => {
    const view = render(page); await expire();
    fireEvent.click(view.getByRole('button', { name: 'Try again' }));
    await settle(1, fixture()); await settle(0, fixture('Fictional Stale'));
    expect(view.getByTitle('Fictional Fresh tile 0')).toBeEnabled();
    expect(view.queryByTitle('Fictional Stale tile 0')).toBeNull();
    expect(view.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('ignores a timed-out old null response after a fresh retry becomes playable', async () => {
    const view = render(page); await expire();
    fireEvent.click(view.getByRole('button', { name: 'Try again' }));
    await settle(1, fixture()); await settle(0, null);
    expect(view.getByTitle('Fictional Fresh tile 0')).toBeEnabled();
    expect(view.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('aborts an abandoned load and clears its pending deadline', () => {
    const view = render(page);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(boundary.calls[0].signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('cancels StrictMode first mount without rejecting the current mount', async () => {
    const view = render(<StrictMode>{page}</StrictMode>);
    expect(boundary.calls).toHaveLength(2);
    expect(boundary.calls[0].signal?.aborted).toBe(true);
    expect(boundary.calls[1].signal?.aborted).toBe(false);
    await settle(1, fixture()); await settle(0, fixture('Fictional Stale'));
    expect(view.getByTitle('Fictional Fresh tile 0')).toBeEnabled();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('deduplicates same-frame retry clicks instead of multiplying pool loads', async () => {
    const view = render(page); await settle(0, null);
    const retry = view.getByRole('button', { name: 'Try again' });
    act(() => { fireEvent.click(retry); fireEvent.click(retry); });
    expect(boundary.calls).toHaveLength(2);
    await settle(1, fixture());
    expect(view.getByTitle('Fictional Fresh tile 0')).toBeEnabled();
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
