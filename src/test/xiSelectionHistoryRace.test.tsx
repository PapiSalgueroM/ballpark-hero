import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PickMeta } from '@/types/lineupBuilder';

/* Fictional players and deferred transport. The actual hook and position/validator
   code run. Only deterministic team assignment, transport and completion side
   effects are fixtures. This is not a browser or real-player assertion. */
const fixture = vi.hoisted(() => ({ nation: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_PUBLISHABLE_KEY: 'fixture' }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateSoccerXI: vi.fn() }));
vi.mock('@/data/lineupTeams', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/lineupTeams')>();
  return { ...actual, getRandomTeamAssignments: () => (fixture.nation ? actual.nations : actual.clubs).slice(0, 11).map(name => ({ name, isNation: fixture.nation })) };
});
import { useLineupBuilder } from '@/hooks/useLineupBuilder';

const CAUSE = 'XI_SELECTION_RACE_OWNERSHIP: late history replaced the most recent pick accepted by the enabled picker';
const FIRST = 'Fixture Harbor Defender', SECOND = 'Fixture Harbor Striker';
const DEFENDER: PickMeta = { rawName: FIRST, rawPosition: 'Centre-Back', position: 'CB', club: 'Real Madrid', nationality: 'Fixture Nation', value: 1200000, age: 27, year: 2026 };
const STRIKER: PickMeta = { rawName: SECOND, rawPosition: 'Centre-Forward', position: 'ST', club: 'Real Madrid', nationality: 'Fixture Nation', value: 1300000, age: 27, year: 2026 };
const KEEPER: PickMeta = { rawName: 'Fixture Harbor Keeper', rawPosition: 'Goalkeeper', position: 'GK', club: 'Real Madrid', nationality: 'Fixture Nation', value: 1400000, age: 27, year: 2026 };
const FULLBACK: PickMeta = { rawName: 'Fixture Harbor Fullback', rawPosition: 'Right-Back', position: 'RB', club: 'Real Madrid', nationality: 'Fixture Nation', value: 1500000, age: 27, year: 2026 };
const NATION: PickMeta = { ...STRIKER, rawName: 'Fixture Nation Striker', club: 'Fixture Harbor FC', nationality: 'Argentina' };
type Hook = ReturnType<typeof useLineupBuilder>;
type Result = { current: Hook };
type Pending = { url: string; kind: 'history' | 'validator'; settled: boolean; release: (body: unknown) => void };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const observations: Record<string, unknown> = {};
let draws: number[], trace: Record<string, unknown>[], pending: Pending[], active: Promise<void>[];
function stores() {
  const one = (storage: Storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => {
    const key = storage.key(index)!; return [key, storage.getItem(key)] as const;
  }).sort(([left], [right]) => left.localeCompare(right)));
  return { local: one(localStorage), session: one(sessionStorage) };
}
function state(result: Result) {
  return { hook: JSON.parse(JSON.stringify(result.current, (_key, value) => value instanceof Map ? [...value] : typeof value === 'function' ? undefined : value)),
    draws: [...draws], stores: stores(), trace: copy(trace) };
}
function retain(id: string, row: unknown) {
  observations[id] = copy(row);
  if (process.env.XI_RACE_RAW) {
    mkdirSync(path.dirname(process.env.XI_RACE_RAW), { recursive: true });
    writeFileSync(process.env.XI_RACE_RAW, JSON.stringify({
      fixture: 'Actual hook with fictional players/deferred transport and deterministic existing club/nation catalog assignment; no browser or natural-frequency claim.',
      pageGate: 'LineupBuilder.handleSelectPlayer returns when isValidating. A retry is dispatched only while that actual public state is false.',
      observations,
    }, null, 2));
  }
}
function open(slot = 9, nation = false) {
  fixture.nation = nation;
  const view = renderHook(() => useLineupBuilder());
  act(() => view.result.current.selectFormation('4-4-2'));
  act(() => view.result.current.selectPosition(slot));
  trace.push({ action: 'actual selectFormation/selectPosition', formation: '4-4-2', slot, team: view.result.current.currentTeam });
  return view;
}
function begin(result: Result, name: string, pick: PickMeta) {
  let done!: Promise<void>;
  trace.push({ action: 'actual submitPlayer', name, pick: copy(pick) });
  act(() => { done = result.current.submitPlayer(name, pick); });
  active.push(done);
  return done;
}
async function finish(done: Promise<void>) { await act(async () => { await done; }); }
async function release(request: Pending, body: unknown, done: Promise<void>) {
  await act(async () => { request.release(body); await done; });
}
const validHistory = [{ primary_position: 'Centre-Back', secondary_positions: ['ST'] }];
beforeEach(async () => {
  // Warm React's async-act scheduler before measuring actual hook draws.
  await act(async () => {});
  fixture.nation = false; draws = []; trace = []; pending = []; active = [];
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('xi-race-sentinel', 'local-held'); sessionStorage.setItem('xi-race-sentinel', 'session-held');
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.5); return 0.5; });
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 16, 12));
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), kind = url.includes('/player_verified_positions?') ? 'history' : url.endsWith('/functions/v1/validate-player') ? 'validator' : null;
    trace.push({ action: 'actual transport request', url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null, kind });
    if (!kind) return Promise.reject(new Error('Unexpected fictional transport URL'));
    return new Promise<Response>((resolve, reject) => {
      const request: Pending = { url, kind, settled: false, release(body) {
        if (request.settled) throw new Error('Fixture request already settled');
        request.settled = true; trace.push({ action: 'fixture response', kind, body: copy(body) });
        resolve({ ok: true, json: async () => body } as Response);
      } };
      pending.push(request);
      init?.signal?.addEventListener('abort', () => {
        if (!request.settled) { request.settled = true; trace.push({ action: 'actual signal abort', kind }); reject(new DOMException('aborted', 'AbortError')); }
      }, { once: true });
    });
  }));
});
afterEach(async () => {
  await act(async () => { for (const request of pending) if (!request.settled) request.release(request.kind === 'history' ? [] : { unverified: true }); await Promise.allSettled(active); });
  cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe('Build Your XI history selection ownership', () => {
  it('history race missing: a late history cannot replace the latest enabled-picker selection', async () => {
    const view = open(), before = state(view.result), first = begin(view.result, FIRST, DEFENDER);
    const duringHistory = state(view.result);
    let second: Promise<void> | undefined;
    // The actual page guard is observed, not bypassed after busy becomes true.
    const retryEnabled = !view.result.current.isValidating;
    if (retryEnabled) { second = begin(view.result, SECOND, STRIKER); await finish(second); }
    const afterRetry = state(view.result);
    await release(pending[0], validHistory, first);
    const afterHistory = state(view.result), expectedOwner = retryEnabled ? SECOND : FIRST;
    retain('overlap', { before, duringHistory, retryEnabled, afterRetry, afterHistory, expectedOwner, inputs: { first: DEFENDER, second: STRIKER } });
    expect(view.result.current.filledSlots.get(9)?.playerName === expectedOwner, CAUSE).toBe(true);
    expect(view.result.current.filledSlots.size).toBe(1);
    expect(view.result.current.isValidating).toBe(false);
    expect(pending.map(request => request.kind)).toEqual(['history']);
    expect(draws).toEqual([]);
    expect(afterHistory.stores).toEqual(before.stores);
  });

  it('history race preservation: a matching-primary club pick stays local and immediate', async () => {
    const view = open(0), before = state(view.result), done = begin(view.result, KEEPER.rawName!, KEEPER);
    await finish(done);
    const after = state(view.result); retain('primary', { before, after, input: KEEPER });
    expect(view.result.current.filledSlots.get(0)?.playerName).toBe(KEEPER.rawName);
    expect(view.result.current.isValidating).toBe(false);
    expect(pending).toEqual([]); expect(draws).toEqual([]); expect(after.stores).toEqual(before.stores);
  });

  it('history race preservation: valid history still admits the originally selected player', async () => {
    const view = open(), before = state(view.result), done = begin(view.result, FIRST, DEFENDER), during = state(view.result);
    await release(pending[0], validHistory, done);
    const after = state(view.result); retain('valid-history', { before, during, after, input: DEFENDER });
    expect(view.result.current.filledSlots.get(9)?.playerName).toBe(FIRST);
    expect(view.result.current.filledSlots.get(9)?.pick?.played).toEqual(['ST']);
    expect(view.result.current.isValidating).toBe(false);
    expect(pending.map(request => request.kind)).toEqual(['history']); expect(draws).toEqual([]); expect(after.stores).toEqual(before.stores);
  });

  it('history race preservation: refused history releases the picker for a valid retry', async () => {
    const view = open(), before = state(view.result), done = begin(view.result, FIRST, DEFENDER), during = state(view.result);
    await release(pending[0], [], done);
    const refused = state(view.result), retryEnabled = !view.result.current.isValidating;
    if (retryEnabled) await finish(begin(view.result, SECOND, STRIKER));
    const afterRetry = state(view.result); retain('refused-retry', { before, during, refused, retryEnabled, afterRetry });
    expect(refused.hook.filledCount).toBe(0); expect(refused.hook.validationError).toContain('slot needs');
    expect(retryEnabled).toBe(true); expect(view.result.current.filledSlots.get(9)?.playerName).toBe(SECOND);
    expect(view.result.current.validationError).toBeNull(); expect(view.result.current.isValidating).toBe(false);
    expect(pending.map(request => request.kind)).toEqual(['history']); expect(draws).toEqual([]); expect(afterRetry.stores).toEqual(before.stores);
  });

  it('history race preservation: an unverified nation pick releases the picker and retry can succeed', async () => {
    const view = open(9, true), before = state(view.result), done = begin(view.result, NATION.rawName!, NATION), during = state(view.result);
    await release(pending[0], { unverified: true, reason: 'Fixture temporarily unavailable' }, done);
    const unverified = state(view.result), retryEnabled = !view.result.current.isValidating;
    if (retryEnabled) {
      const retry = begin(view.result, NATION.rawName!, NATION);
      await release(pending[1], { valid: true }, retry);
    }
    const afterRetry = state(view.result); retain('unverified-retry', { before, during, unverified, retryEnabled, afterRetry, input: NATION });
    expect(during.hook.isValidating).toBe(true); expect(unverified.hook.filledCount).toBe(0);
    expect(unverified.hook.validationError).toBe('Fixture temporarily unavailable'); expect(retryEnabled).toBe(true);
    expect(view.result.current.filledSlots.get(9)?.playerName).toBe(NATION.rawName); expect(view.result.current.isValidating).toBe(false);
    expect(pending.map(request => request.kind)).toEqual(['validator', 'validator']); expect(draws).toEqual([]); expect(afterRetry.stores).toEqual(before.stores);
  });

  it('history race preservation: reroll abandons a pending history without publishing into its new team', async () => {
    const view = open(), before = state(view.result), done = begin(view.result, FIRST, DEFENDER), during = state(view.result);
    act(() => view.result.current.rerollTeam());
    const cancelled = state(view.result);
    await release(pending[0], validHistory, done);
    const after = state(view.result); retain('reroll', { before, during, cancelled, after, input: DEFENDER });
    expect(after.hook).toEqual(cancelled.hook); expect(after.draws).toEqual(cancelled.draws); expect(after.stores).toEqual(cancelled.stores); expect(view.result.current.filledSlots.size).toBe(0);
    expect(view.result.current.selectedPositionIndex).toBeNull(); expect(view.result.current.isValidating).toBe(false);
    expect(draws).toEqual([0.5]); expect(after.stores).toEqual(before.stores);
  });

  it('history race preservation: reset abandons a pending history without repopulating the formation', async () => {
    const view = open(), before = state(view.result), done = begin(view.result, FIRST, DEFENDER), during = state(view.result);
    act(() => view.result.current.resetGame());
    const cancelled = state(view.result);
    await release(pending[0], validHistory, done);
    const after = state(view.result); retain('reset', { before, during, cancelled, after, input: DEFENDER });
    expect(after.hook).toEqual(cancelled.hook); expect(after.draws).toEqual(cancelled.draws); expect(after.stores).toEqual(cancelled.stores); expect(view.result.current.phase).toBe('formation');
    expect(view.result.current.formation).toBeNull(); expect(view.result.current.filledSlots.size).toBe(0);
    expect(view.result.current.isValidating).toBe(false); expect(draws).toEqual([]); expect(after.stores).toEqual(before.stores);
  });

  it('history race preservation: the existing next-door history wait stays busy and settles normally', async () => {
    const view = open(1), before = state(view.result), done = begin(view.result, FULLBACK.rawName!, FULLBACK), during = state(view.result);
    await release(pending[0], [], done);
    const after = state(view.result); retain('next-door', { before, during, after, input: FULLBACK });
    expect(during.hook.isValidating).toBe(true); expect(view.result.current.filledSlots.get(1)?.playerName).toBe(FULLBACK.rawName);
    expect(view.result.current.isValidating).toBe(false); expect(pending.map(request => request.kind)).toEqual(['history']);
    expect(draws).toEqual([]); expect(after.stores).toEqual(before.stores);
  });
});
