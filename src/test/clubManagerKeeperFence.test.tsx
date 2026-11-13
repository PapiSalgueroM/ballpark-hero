import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useClubManager } from '@/hooks/useClubManager';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import { BROKEN_SAVE_MARK } from '@/lib/brokenSaveRecovery';
import { SAVE_KEY } from '@/lib/clubManagerSaveKeys';
import { createPoint, restorePoint } from '@/lib/cmSavePoints';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import { applyPending, stageRestore } from '@/lib/saveKeeper';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
}));

const cm = CONTINUE_SAVES.find(entry => entry.saveKey === SAVE_KEY)!;
const fence = fenceKeyOf(SAVE_KEY);
const raw = () => localStorage.getItem(SAVE_KEY);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  saveFence.release(SAVE_KEY);
});

afterEach(() => {
  saveFence.release(SAVE_KEY);
  localStorage.clear();
  sessionStorage.clear();
});

describe('Club Manager keeper restores', () => {
  it.each(['kept aside save', 'save point'] as const)('stales an open tab after restoring a %s', async source => {
    const hook = renderHook(() => useClubManager());
    await waitFor(() => expect(hook.result.current.phase).toBe('clubSelect'));
    act(() => hook.result.current.chooseClub('Everton'));
    act(() => hook.result.current.confirmClub());
    await waitFor(() => expect(hook.result.current.phase).toBe('hub'));
    const career = hook.result.current.career!;
    const earlier = raw()!;
    const backup = SAVE_KEY + BROKEN_SAVE_MARK + '2026-11-12T20-00-00';
    let pointId: string | undefined;
    if (source === 'kept aside save') localStorage.setItem(backup, earlier);
    else {
      const point = createPoint(1, career, 'Before tactics', localStorage);
      expect(point.ok).toBe(true);
      if (point.ok) pointId = point.meta.id;
    }
    act(() => hook.result.current.setMentality(career.mentality === 'attacking' ? 'balanced' : 'attacking'));
    const later = raw()!;
    expect(later).not.toBe(earlier);
    const generation = Number(localStorage.getItem(fence));

    if (source === 'kept aside save') expect(stageRestore(cm, backup, localStorage)).toEqual({ ok: true });
    else expect(restorePoint(1, pointId!, hook.result.current.career!, localStorage)).toEqual({ ok: true });
    expect(raw()).toBe(later);
    expect(applyPending(localStorage)).toMatchObject({ path: cm.path, ok: true });
    expect(raw()).toBe(earlier);
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(raw()).toBe(earlier);
    act(() => hook.result.current.setMentality('defensive'));
    expect(raw()).toBe(earlier);
    expect(hook.result.current.saveMoved).toBe(true);
    hook.unmount();
    expect(raw()).toBe(earlier);
    expect(Number(localStorage.getItem(fence))).toBe(generation + 1);
  });
});
