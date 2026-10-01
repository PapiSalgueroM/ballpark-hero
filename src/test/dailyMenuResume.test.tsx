/**
 * Round 721 review fix: going back to the menu mid daily and opening it again
 * picks up where you left off.
 *
 * Deadline Day and Manager Hot Seat (Round 719) both read what was waiting in
 * storage once, on mount, and never again. A move wrote the daily record but
 * left the in memory copy (dailySaved, freeSaved) as it was at mount, so
 * Menu then reopening the daily started the window or the job from nothing,
 * and the next move overwrote the stored actions with the new, shorter list.
 * The day's progress was lost, and "one go per day" stopped being true: you
 * could look at the fixed dice and start the daily again in the same visit.
 *
 * Measured before the fix (this file, red): Deadline Day reopened at 0
 * actions and hour 0 after 2 actions; Manager Hot Seat reopened on the brief
 * after a match had been played.
 */
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeadlineDay } from '@/hooks/useDeadlineDay';
import ManagerHotSeatBoard from '@/components/manager-hot-seat/ManagerHotSeatBoard';
import { getTodayET } from '@/lib/dateUtils';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

/** Every stored value whose key mentions the slug, parsed. */
function stored(slug: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (let k = 0; k < localStorage.length; k++) {
    const key = localStorage.key(k)!;
    if (!key.includes(slug)) continue;
    try { out.push(JSON.parse(localStorage.getItem(key) ?? 'null')); } catch { /* not ours */ }
  }
  return out;
}
const actionCount = (rec: Record<string, unknown> | undefined) => {
  const a = rec?.actions ?? (rec?.fields as Record<string, unknown> | undefined)?.actions;
  return Array.isArray(a) ? a.length : -1;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Deadline Day: Menu and back keeps the window', () => {
  it('reopens the daily at the same hour with the same actions, and the store keeps them', () => {
    const { result } = renderHook(() => useDeadlineDay());
    act(() => { result.current.startDaily(); });
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current.phase).toBe('play');
    act(() => { result.current.callClub(0); });
    const ask = result.current.run!.targets[0].neg!.theirAsk;
    act(() => { result.current.bid(0, Math.round(ask * 0.9 * 10) / 10); });
    const before = result.current.run!;
    expect(before.actions.length).toBe(2);
    expect(before.hour).toBe(1);

    act(() => { result.current.backToMenu(); });
    expect(result.current.dailySaved?.length).toBe(2);
    act(() => { result.current.startDaily(); });
    act(() => { vi.advanceTimersByTime(50); });
    const after = result.current.run!;
    expect(after.actions.length).toBe(before.actions.length);
    expect(after.hour).toBe(before.hour);
    expect(after.state.budget).toBe(before.state.budget);

    /* The next move adds to the stored list rather than replacing it. */
    act(() => { result.current.callClub(after.targets.findIndex(t => t.status === 'idle')); });
    expect(actionCount(stored('deadline-day').find(r => r && typeof r === 'object' && JSON.stringify(r).includes(getTodayET())))).toBe(3);
  });

  it('a finished daily is not offered again and a free play resumes from the menu', () => {
    const { result } = renderHook(() => useDeadlineDay());
    act(() => { result.current.startDaily(); });
    act(() => { vi.advanceTimersByTime(50); });
    act(() => { result.current.callClub(0); });
    act(() => { result.current.finish(); });
    expect(result.current.phase).toBe('done');
    act(() => { result.current.backToMenu(); });
    expect(result.current.dailyDone).not.toBeNull();
    expect(result.current.dailySaved).toBeNull();

    const club = result.current.daily.club;
    act(() => { result.current.startFree(club); });
    act(() => { vi.advanceTimersByTime(50); });
    act(() => { result.current.callClub(0); });
    const seed = result.current.run!.setup.seed;
    act(() => { result.current.backToMenu(); });
    expect(result.current.freeSaved?.actions.length).toBe(1);
    act(() => { result.current.resumeFree(); });
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current.run!.setup.seed).toBe(seed);
    expect(result.current.run!.actions.length).toBe(1);
  });
});

describe('Manager Hot Seat: Menu and back keeps the job', () => {
  it('reopens the daily on the next match, not on the brief, and the store keeps the match', () => {
    const view = render(<ManagerHotSeatBoard />);
    fireEvent.click(view.getByRole('button', { name: "Take today's job" }));
    act(() => { vi.advanceTimersByTime(50); });
    fireEvent.click(view.getByRole('button', { name: 'Take the job' }));
    /* Answer the press if they are waiting, then play one match. */
    const press = view.queryByTestId('hot-seat-press');
    if (press) fireEvent.click(press.querySelector('button')!);
    fireEvent.click(view.getByRole('button', { name: 'Kick off' }));
    const played = actionCount(stored('manager-hot-seat')[0]);
    expect(played).toBeGreaterThan(0);

    fireEvent.click(view.getByRole('button', { name: 'Menu' }));
    fireEvent.click(view.getByRole('button', { name: 'Back to the dugout' }));
    act(() => { vi.advanceTimersByTime(50); });
    expect(view.queryByTestId('hot-seat-brief')).toBeNull();
    expect(actionCount(stored('manager-hot-seat')[0])).toBe(played);
  }, 120000);
});
