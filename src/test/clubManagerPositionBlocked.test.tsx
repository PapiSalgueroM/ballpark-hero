import assert from 'node:assert/strict';
import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import * as E from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import * as calendar from '@/lib/clubManagerCalendar';
import { useClubManager } from '@/hooks/useClubManager';
import { saveFence } from '@/lib/saveFence';
import { activeSlot, readSlots } from '@/lib/clubManagerSlots';
import * as completions from '@/lib/completions';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
}));

type Api = ReturnType<typeof useClubManager> & { positionNotice?: string | null };
let current: Api | null = null;
let commits: { career: CareerState | null; raw: string | null }[] = [];
function Harness() {
  const g: Api = useClubManager();
  current = g;
  useLayoutEffect(() => { commits.push({ career: g.career, raw: localStorage.getItem(E.SAVE_KEY) }); }, [g.career]);
  return <p>{g.phase}</p>;
}
function read(): Api {
  if (!current) throw new Error('The actual hook has not mounted.');
  return current;
}
function snapshot() {
  return Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)
    .sort().map(key => [key, localStorage.getItem(key)]));
}
async function brokenMatch(): Promise<CareerState> {
  await import('@/lib/clubManagerTactics');
  let state = E.startCareer('Everton');
  const formation = E.FORMATIONS[state.formationIndex];
  const points = formation.slots.map(slot => ({ x: slot.x, y: slot.y }));
  state = { ...state, customShape: { v: 1, formationIndex: state.formationIndex, points } };
  for (let guard = 0; guard < 24; guard++) {
    const result = E.playNextEntry(state, { noCoach: true });
    state = result.state;
    if (result.kind !== 'halftime' || !state.live) continue;
    expect(state.live.positionRules, 'CM_POSITION_BLOCKED_REAL_MARKED_MATCH').toBe(1);
    expect(E.startSecondHalf(JSON.parse(JSON.stringify(state))), 'CM_POSITION_BLOCKED_HEALTHY_RESTART_FOUNDATION').not.toBeNull();
    const broken: CareerState = JSON.parse(JSON.stringify(state));
    (broken.live as unknown as { positionRules: number }).positionRules = 2;
    const before = JSON.stringify(broken);
    const refused = E.playNextEntry(broken, { noCoach: true });
    expect(refused.blocked, 'CM_POSITION_BLOCKED_ACTUAL_CORE_REASON').toBe('position-state-invalid');
    expect(refused.state, 'CM_POSITION_BLOCKED_ACTUAL_CORE_IDENTITY').toBe(broken);
    expect(JSON.stringify(broken), 'CM_POSITION_BLOCKED_REAL_FIXTURE_RAW_HELD').toBe(before);
    return broken;
  }
  throw new Error('The actual engine did not create a marked live fixture.');
}
function boundedActualEntry() {
  const actual = E.playNextEntry;
  let blockedCalls = 0;
  const spy = vi.spyOn(E, 'playNextEntry').mockImplementation((...args: Parameters<typeof E.playNextEntry>) => {
    const result = actual(...args);
    if (result.blocked === 'position-state-invalid') {
      blockedCalls++;
      // This finite native assertion diagnoses the second identical blocked iteration, never a timeout.
      assert(blockedCalls <= 1, 'CM_POSITION_BLOCKED_CALENDAR_MUST_STOP_AFTER_ONE_ACTUAL_REFUSAL');
    }
    return result;
  });
  return { spy, calls: () => blockedCalls };
}
async function bootBlocked() {
  const broken = await brokenMatch();
  saveFence.release(E.SAVE_KEY);
  expect(E.saveCareer(broken), 'CM_POSITION_BLOCKED_ACTUAL_STORAGE_FOUNDATION').toBe(true);
  render(<Harness />);
  await waitFor(() => expect(read().phase).toBe('resume'), { timeout: 10000 });
  act(() => read().resume());
  await waitFor(() => expect(read().phase).toBe('hub'), { timeout: 10000 });
  expect(read().career?.live?.positionRules, 'CM_POSITION_BLOCKED_LOADED_UNKNOWN_RULE_HELD').toBe(2);
  commits = [];
  vi.mocked(completions.recordActivity).mockClear();
  vi.mocked(completions.recordCompletion).mockClear();
  vi.mocked(completions.recordStreakDay).mockClear();
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); saveFence.release(E.SAVE_KEY);
  current = null; commits = [];
  let seed = 1458101;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => {
  vi.restoreAllMocks(); cleanup(); saveFence.release(E.SAVE_KEY);
  localStorage.clear(); sessionStorage.clear(); current = null; commits = [];
});

describe('Unsupported marked positioning stops real advancement', { timeout: 120000 }, () => {
  it('stops the real Calendar after its first actual blocked entry without a draw or save', async () => {
    const broken = await brokenMatch(), body = JSON.stringify(broken), store = snapshot();
    const observer = boundedActualEntry();
    const draws = vi.spyOn(Math, 'random').mockClear(), writes = vi.spyOn(Storage.prototype, 'setItem');
    const run = calendar.simToWeek(broken, broken.week + 1);
    expect(observer.calls(), 'CM_POSITION_BLOCKED_CALENDAR_ONE_ACTUAL_CALL').toBe(1);
    expect(run.halt, 'CM_POSITION_BLOCKED_CALENDAR_PROPAGATES_REASON').toBe('position-state-invalid');
    expect(run.state, 'CM_POSITION_BLOCKED_CALENDAR_RETURNS_OLD_IDENTITY').toBe(broken);
    expect(run.lastReport, 'CM_POSITION_BLOCKED_CALENDAR_NO_RESULT').toBeNull();
    expect(draws, 'CM_POSITION_BLOCKED_CALENDAR_ZERO_DRAWS').not.toHaveBeenCalled();
    expect(writes, 'CM_POSITION_BLOCKED_CALENDAR_ZERO_WRITES').not.toHaveBeenCalled();
    expect(JSON.stringify(broken)).toBe(body); expect(snapshot()).toEqual(store);
  });

  it.each(['play', 'quickPlay', 'secondHalf', 'simToWeek'] as const)(
    'shows a truthful notice for actual %s refusal while keeping phase, raw storage and rewards unchanged', async operation => {
      await bootBlocked();
      const before = read().career!, phase = read().phase, oldReport = read().report, oldSummary = read().summary;
      const body = JSON.stringify(before), oldStore = snapshot();
      const observer = boundedActualEntry();
      const draws = vi.spyOn(Math, 'random').mockClear(), writes = vi.spyOn(Storage.prototype, 'setItem');
      act(() => {
        if (operation === 'simToWeek') read().simToWeek(before.week + 1);
        else read()[operation]();
      });
      expect(read().phase, 'CM_POSITION_BLOCKED_HOOK_PHASE_HELD_' + operation).toBe(phase);
      expect(typeof read().positionNotice, 'CM_POSITION_BLOCKED_HOOK_NOTICE_' + operation).toBe('string');
      expect(read().positionNotice, 'CM_POSITION_BLOCKED_HOOK_NOTICE_EXPLAINS_' + operation).toMatch(/saved positioning data needs review/i);
      expect(read().career, 'CM_POSITION_BLOCKED_HOOK_OLD_IDENTITY_' + operation).toBe(before);
      expect(JSON.stringify(read().career)).toBe(body);
      expect(read().report).toBe(oldReport); expect(read().summary).toBe(oldSummary);
      expect(writes, 'CM_POSITION_BLOCKED_HOOK_ZERO_NATIVE_WRITE_' + operation).not.toHaveBeenCalled();
      expect(draws, 'CM_POSITION_BLOCKED_HOOK_ZERO_RNG_' + operation).not.toHaveBeenCalled();
      expect(snapshot(), 'CM_POSITION_BLOCKED_HOOK_ALL_RAW_HELD_' + operation).toEqual(oldStore);
      expect(commits, 'CM_POSITION_BLOCKED_HOOK_NO_CAREER_COMMIT_' + operation).toEqual([]);
      expect(completions.recordActivity).not.toHaveBeenCalled();
      expect(completions.recordCompletion).not.toHaveBeenCalled();
      expect(completions.recordStreakDay).not.toHaveBeenCalled();
      if (operation !== 'secondHalf') expect(observer.calls()).toBe(1);
    });

  it('clears the old notice when the actual hook leaves that authoritative career', async () => {
    await bootBlocked();
    act(() => read().play());
    expect(typeof read().positionNotice, 'CM_POSITION_BLOCKED_CLEAR_POSITIVE_NOTICE').toBe('string');
    expect(activeSlot(), 'CM_POSITION_BLOCKED_CLEAR_OWNS_FIRST_SLOT').toBe(1);
    expect(readSlots()[1]?.summary, 'CM_POSITION_BLOCKED_CLEAR_EMPTY_SECOND_SLOT').toBeNull();
    act(() => read().newInSlot(2));
    expect(activeSlot(), 'CM_POSITION_BLOCKED_CLEAR_REAL_SECOND_SLOT').toBe(2);
    expect(read().career, 'CM_POSITION_BLOCKED_CLEAR_REAL_CONTEXT_EXIT').toBeNull();
    expect(read().positionNotice, 'CM_POSITION_BLOCKED_CLEAR_ON_CONTEXT_CHANGE').toBeNull();
  });

  it('keeps an actual ordinary unmarked Calendar window progressing with no position halt', async () => {
    await import('@/lib/clubManagerTactics');
    const made = E.startCareer('Everton');
    const ordinary: CareerState = { ...made, week: 0, live: null,
      calendar: [{ type: 'window', round: 0 }, { type: 'window', round: 0 }] };
    const body = JSON.stringify(ordinary), oldStore = snapshot();
    const actual = vi.spyOn(E, 'playNextEntry');
    const result = calendar.simToWeek(ordinary, 1);
    expect(actual.mock.calls.length > 0, 'CM_POSITION_BLOCKED_NORMAL_REAL_ENTRY').toBe(true);
    expect(result.state.week, 'CM_POSITION_BLOCKED_NORMAL_WEEK_ADVANCES').toBe(1);
    expect(result.halt, 'CM_POSITION_BLOCKED_NORMAL_NOT_POSITION_HALT').not.toBe('position-state-invalid');
    expect(JSON.stringify(ordinary), 'CM_POSITION_BLOCKED_NORMAL_INPUT_HELD').toBe(body);
    expect(snapshot(), 'CM_POSITION_BLOCKED_NORMAL_PURE_CALENDAR_NO_SAVE').toEqual(oldStore);
  });
});
