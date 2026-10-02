import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLiveScores } from '@/hooks/useLiveScores';
import type { LiveRead, LiveScoreRow } from '@/lib/liveScores';

const boundary = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/liveScores', () => ({ fetchLiveBoard: boundary.fetch }));

// Fictional transport fixtures, never published sports records.
const row: LiveScoreRow = {
  id: 'fixture', sport: 'soccer', league: 'Fixture League', home: 'Fixture Home', away: 'Fixture Away',
  home_score: 2, away_score: 1, status_short: 'LIVE', status_long: 'Fixture live game',
  start_at: '2026-10-02T12:00:00Z', updated_at: '2026-10-02T12:00:00Z', live: true, finished: false,
};
function deferred() {
  let resolve!: (read: LiveRead | null) => void;
  const promise = new Promise<LiveRead | null>(yes => { resolve = yes; });
  return { promise, resolve };
}
function visibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
}
async function settle(work: ReturnType<typeof deferred>, read: LiveRead | null) {
  await act(async () => { work.resolve(read); await work.promise; });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  boundary.fetch.mockReset();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('preserves real read rows and server-clock offset across a failed refresh', async () => {
  const first = deferred();
  boundary.fetch.mockReturnValueOnce(first.promise).mockResolvedValue(null);
  const view = renderHook(() => useLiveScores());
  expect(view.result.current.status).toBe('loading');
  const serverNow = Date.now() + 60_000;
  await settle(first, { rows: [row], serverNow });
  expect(view.result.current).toEqual({ rows: [row], status: 'ok', checkedAt: serverNow });
  await act(async () => { vi.advanceTimersByTime(300_000); });
  expect(view.result.current).toEqual({ rows: [row], status: 'failed', checkedAt: serverNow + 300_000 });
});

it('waits for a visible tab and never polls while hidden', async () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  boundary.fetch.mockResolvedValue({ rows: [], serverNow: null });
  renderHook(() => useLiveScores());
  await act(async () => { vi.advanceTimersByTime(600_000); });
  expect(boundary.fetch).not.toHaveBeenCalled();
  visibility('visible');
  await act(async () => {});
  expect(boundary.fetch).toHaveBeenCalledTimes(1);
  visibility('hidden');
  await act(async () => { vi.advanceTimersByTime(600_000); });
  expect(boundary.fetch).toHaveBeenCalledTimes(1);
});

it('coalesces visibility events into the one pending read', async () => {
  const work = deferred();
  boundary.fetch.mockReturnValue(work.promise);
  renderHook(() => useLiveScores());
  visibility('visible'); visibility('visible'); visibility('visible');
  expect(boundary.fetch).toHaveBeenCalledTimes(1);
  const signal = boundary.fetch.mock.calls[0][1] as AbortSignal;
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(signal.aborted).toBe(false);
  await settle(work, { rows: [], serverNow: null });
});

it('cancels a hidden request and ignores its late answer after foreground recovery', async () => {
  const old = deferred(); const current = deferred();
  boundary.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = renderHook(() => useLiveScores());
  const signal = boundary.fetch.mock.calls[0][1] as AbortSignal;
  visibility('hidden');
  expect(signal.aborted).toBe(true);
  visibility('visible');
  expect(boundary.fetch).toHaveBeenCalledTimes(2);
  await settle(current, { rows: [row], serverNow: Date.now() });
  const accepted = view.result.current;
  await settle(old, { rows: [], serverNow: Date.now() - 999_000 });
  expect(view.result.current).toBe(accepted);
});

it('bounds a hung read and protects its replacement from the old response', async () => {
  const old = deferred(); const current = deferred();
  boundary.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = renderHook(() => useLiveScores());
  const signal = boundary.fetch.mock.calls[0][1] as AbortSignal;
  act(() => { vi.advanceTimersByTime(15_000); });
  expect(signal.aborted).toBe(true);
  expect(view.result.current).toEqual({ rows: [], status: 'failed', checkedAt: Date.now() });
  expect(boundary.fetch).toHaveBeenCalledTimes(1);
  visibility('visible');
  await settle(current, { rows: [row], serverNow: Date.now() });
  const accepted = view.result.current;
  await settle(old, null);
  expect(view.result.current).toBe(accepted);
});

it('aborts on unmount and removes polling and visibility callbacks', () => {
  boundary.fetch.mockReturnValue(deferred().promise);
  const view = renderHook(() => useLiveScores());
  const signal = boundary.fetch.mock.calls[0][1] as AbortSignal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  visibility('visible');
  act(() => { vi.advanceTimersByTime(600_000); });
  expect(boundary.fetch).toHaveBeenCalledTimes(1);
});

it('keeps the original five-minute visible refresh cadence', async () => {
  boundary.fetch.mockResolvedValue({ rows: [], serverNow: null });
  renderHook(() => useLiveScores());
  await act(async () => {});
  await act(async () => { vi.advanceTimersByTime(299_999); });
  expect(boundary.fetch).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(1); });
  expect(boundary.fetch).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(1);
});

it('StrictMode aborts the discarded owner without losing the current read', async () => {
  const old = deferred(); const current = deferred();
  boundary.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = renderHook(() => useLiveScores(), { wrapper: StrictMode });
  expect(boundary.fetch).toHaveBeenCalledTimes(2);
  expect((boundary.fetch.mock.calls[0][1] as AbortSignal).aborted).toBe(true);
  expect((boundary.fetch.mock.calls[1][1] as AbortSignal).aborted).toBe(false);
  await settle(current, { rows: [row], serverNow: Date.now() });
  const accepted = view.result.current;
  await settle(old, null);
  expect(view.result.current).toBe(accepted);
});
