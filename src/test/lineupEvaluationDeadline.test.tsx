import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLUB_TABLE_NAMES } from '@/data/lineupTeams';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import { supabase } from '@/integrations/supabase/client';
import { localEvaluateSoccerXI } from '@/lib/localLineupEval';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateSoccerXI: vi.fn() }));

const local = vi.mocked(localEvaluateSoccerXI);
const localVerdict = { rating: 'Solid', headline: 'Fixture fallback', analysis: 'Market value review' };
const remoteVerdict = { rating: 'Contender', headline: 'Fixture evaluator', analysis: 'Remote review' };
const rawPositions = [
  'Goalkeeper', 'Left-Back', 'Centre-Back', 'Centre-Back', 'Right-Back',
  'Central Midfield', 'Central Midfield', 'Central Midfield', 'Left Winger', 'Centre-Forward', 'Right Winger',
];

async function draftXi() {
  const { result } = renderHook(() => useLineupBuilder());
  act(() => result.current.selectFormation('4-3-3'));
  for (const [index, rawPosition] of rawPositions.entries()) {
    const club = CLUB_TABLE_NAMES[result.current.currentTeam!.name][0];
    act(() => result.current.selectPosition(index));
    await act(async () => {
      await result.current.submitPlayer(`Fixture Player ${index + 1}`, { club, rawPosition });
    });
    act(() => result.current.finishSpin());
  }
  expect(result.current.phase).toBe('reviewing');
  expect(result.current.filledCount).toBe(11);
  return result;
}

function waitForAbort<T>(signal: AbortSignal | null | undefined, settle: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => Promise.resolve().then(settle).then(resolve, reject);
    if (signal?.aborted) void abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

function holdReferee() {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => waitForAbort(init?.signal, () => {
    throw new DOMException('Aborted', 'AbortError');
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  local.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Build Your XI evaluation', () => {
  it('finishes with the fallback at the deadline when the referee stalls', async () => {
    const fetchMock = holdReferee();
    local.mockResolvedValue(localVerdict);
    const xi = await draftXi();

    await act(async () => { void xi.current.evaluateTeam(); });
    expect(xi.current.isEvaluating).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });

    expect(xi.current.phase).toBe('result');
    expect(xi.current.verdict).toEqual(localVerdict);
    expect(xi.current.isEvaluating).toBe(false);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(local).toHaveBeenCalledTimes(1);
  });

  it('uses the same deadline if a failed referee leaves market-value reads stalled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Unavailable' }) }));
    local.mockImplementation((_names, signal) => waitForAbort(signal, () => localVerdict));
    const xi = await draftXi();

    await act(async () => { void xi.current.evaluateTeam(); });
    expect(local).toHaveBeenCalledTimes(1);
    expect(xi.current.isEvaluating).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });

    expect(xi.current.phase).toBe('result');
    expect(xi.current.verdict).toEqual(localVerdict);
    expect(xi.current.isEvaluating).toBe(false);
    expect(local.mock.calls[0][1]?.aborted).toBe(true);
  });

  it('shows a provisional result if market lookups are waiting for the auth session', async () => {
    const actual = await vi.importActual<typeof import('@/lib/localLineupEval')>('@/lib/localLineupEval');
    local.mockImplementation(actual.localEvaluateSoccerXI);
    const session = vi.spyOn(supabase.auth, 'getSession').mockReturnValue(new Promise(() => {}));
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Unavailable' }) });
    vi.stubGlobal('fetch', fetchMock);
    const xi = await draftXi();

    await act(async () => { void xi.current.evaluateTeam(); });
    expect(session).toHaveBeenCalled();
    expect(xi.current.isEvaluating).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });

    expect(xi.current.phase).toBe('result');
    expect(xi.current.verdict?.analysis).toContain('11 picks could not be checked before the timeout, rated on trust.');
    expect(xi.current.verdict?.analysis).not.toContain('Weak link');
    expect(xi.current.isEvaluating).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the remote verdict when it arrives within the wait', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => remoteVerdict }));
    const xi = await draftXi();

    await act(async () => { await xi.current.evaluateTeam(); });

    expect(xi.current.phase).toBe('result');
    expect(xi.current.verdict).toEqual(remoteVerdict);
    expect(local).not.toHaveBeenCalled();
  });

  it('aborts a submitted review on Start Over without opening a result', async () => {
    const fetchMock = holdReferee();
    const xi = await draftXi();
    await act(async () => { void xi.current.evaluateTeam(); });
    await act(async () => { xi.current.resetGame(); });

    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(xi.current.phase).toBe('formation');
    expect(xi.current.verdict).toBeNull();
    expect(xi.current.isEvaluating).toBe(false);
    expect(local).not.toHaveBeenCalled();
  });
});
