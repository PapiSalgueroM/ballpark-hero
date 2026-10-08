import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

/* REVIEWER'S PROBE for Round 1138 (runner lens). Never committed. The builder says a reset and a new formation
   give up on the pick in flight; the round's tests only walk a reroll and cancelValidation. These legs use a
   validator answer that is ALREADY ON ITS WAY when the player gives up (the request ignores the abort), so the
   late valid answer is what the hook has to drop. */

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateSoccerXI: vi.fn() }));
const dealt = vi.hoisted(() => ({ teams: [] as { name: string; isNation: boolean }[] }));
vi.mock('@/data/lineupTeams', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/lineupTeams')>();
  return { ...real, getRandomTeamAssignments: () => dealt.teams.map((team) => ({ ...team })) };
});

import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import type { PickMeta, TeamAssignment } from '@/types/lineupBuilder';

const BRAZIL: TeamAssignment = { name: 'Brazil', isNation: true };
const TYPED = 'Qzx Van Rightback';
const ON_FILE: PickMeta = { rawName: 'Qzx van Rightback', rawPosition: 'Right-Back', position: 'RB', club: 'Real Madrid', nationality: 'Brazil' };
const RB = 4;

type Reply = { ok: boolean; status: number; json: () => Promise<unknown> };

/** A validator whose answer is released by the test and which ignores the abort, like a response already on the wire. */
function lateValidator() {
  const seen: { url: string; signal: AbortSignal | null | undefined }[] = [];
  let release!: (reply: Reply) => void;
  const pending = new Promise<Reply>((resolve) => { release = resolve; });
  vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit = {}) => {
    seen.push({ url: String(url), signal: init.signal });
    if (String(url).includes('player_verified_positions')) return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    if (String(url).includes('validate-player')) return pending;
    return Promise.reject(new Error(`unexpected request to ${url}`));
  }));
  const calls = () => seen.filter((call) => call.url.includes('validate-player'));
  return { calls, release: () => release({ ok: true, status: 200, json: async () => ({ valid: true, fullName: 'Late Answer' }) }) };
}

function start() {
  dealt.teams = Array.from({ length: 11 }, () => BRAZIL);
  const hook = renderHook(() => useLineupBuilder());
  act(() => hook.result.current.selectFormation('4-3-3'));
  act(() => hook.result.current.selectPosition(RB));
  return hook;
}

describe('reviewer probe: giving up on a pick whose answer is already on its way', () => {
  beforeEach(() => { vi.useRealTimers(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('H1 a reset, then a new game: the late valid answer fills nothing', async () => {
    const { calls, release } = lateValidator();
    const { result } = start();
    let done: Promise<void> | undefined;
    act(() => { done = result.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(calls()).toHaveLength(1));
    act(() => result.current.resetGame());
    act(() => result.current.selectFormation('4-3-3'));
    act(() => result.current.selectPosition(RB));
    await act(async () => { release(); await done; });
    expect(calls()[0].signal?.aborted).toBe(true);
    expect(result.current.filledSlots.size).toBe(0);
    expect(result.current.filledCount).toBe(0);
    expect(result.current.validationError).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('H2 a new formation chosen while the check is out: the late valid answer fills nothing', async () => {
    const { calls, release } = lateValidator();
    const { result } = start();
    let done: Promise<void> | undefined;
    act(() => { done = result.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(calls()).toHaveLength(1));
    act(() => result.current.selectFormation('4-4-2'));
    await act(async () => { release(); await done; });
    expect(calls()[0].signal?.aborted).toBe(true);
    expect(result.current.filledSlots.size).toBe(0);
    expect(result.current.isValidating).toBe(false);
  });

  it('H3 a reroll: the late valid answer fills nothing under the new team', async () => {
    const { calls, release } = lateValidator();
    const { result } = start();
    let done: Promise<void> | undefined;
    act(() => { done = result.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(calls()).toHaveLength(1));
    act(() => result.current.rerollTeam());
    await act(async () => { release(); await done; });
    expect(result.current.filledSlots.size).toBe(0);
    expect(result.current.validationError).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('H4 leaving the page aborts the check in flight', async () => {
    const { calls } = lateValidator();
    const hook = start();
    act(() => { void hook.result.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(calls()).toHaveLength(1));
    hook.unmount();
    expect(calls()[0].signal?.aborted).toBe(true);
  });

  it('H5 the same pick sent twice in one tick fills one slot once', async () => {
    const { calls, release } = lateValidator();
    const { result } = start();
    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    act(() => { first = result.current.submitPlayer(TYPED, ON_FILE); second = result.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(calls().length).toBeGreaterThan(0));
    await act(async () => { release(); await first; await second; });
    expect(result.current.filledSlots.size).toBe(1);
    expect(result.current.filledCount).toBe(1);
  });
});
