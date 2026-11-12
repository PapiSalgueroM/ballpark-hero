import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import {
  AWAY_MATCHDAY_SEC, deserializeTycoon, newTycoon, offlineEarnings, prestige,
  prestigeThreshold, serializeTycoon, TYCOON_SAVE_KEY,
} from '@/lib/stadiumTycoon';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));

const EPOCH = Date.UTC(2026, 10, 11, 22);
let now: number;
let visibility: DocumentVisibilityState;
const savedAt = () => JSON.parse(localStorage.getItem(TYCOON_SAVE_KEY)!).savedAt;

function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
}

beforeEach(() => {
  now = EPOCH;
  visibility = 'visible';
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  vi.spyOn(Math, 'random').mockReturnValue(0.75);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(newTycoon(EPOCH), EPOCH));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Stadium Tycoon hidden close', () => {
  it.each([true, false])('preserves the unpaid interval across hidden close (pagehide: %s)', pagehide => {
    const mounted = renderHook(useStadiumTycoon);
    setVisibility('hidden');
    const cutoff = savedAt();
    const hiddenSeconds = 2 * 60 * 60;
    now += hiddenSeconds * 1000;
    if (pagehide) act(() => { window.dispatchEvent(new Event('pagehide')); });
    const onClose = savedAt();
    mounted.unmount();
    const afterCleanup = savedAt();

    visibility = 'visible';
    const restored = renderHook(useStadiumTycoon);
    const pay = offlineEarnings(newTycoon(EPOCH), now);
    const matchdays = Math.floor(hiddenSeconds / AWAY_MATCHDAY_SEC);
    expect(pay).toBeGreaterThan(0);
    expect(matchdays).toBeGreaterThan(0);
    expect({
      onClose, afterCleanup,
      pay: restored.result.current.awayPay,
      matchdays: restored.result.current.awayTrip?.results.length ?? 0,
      settledThrough: savedAt(),
    }).toEqual({
      onClose: cutoff, afterCleanup: cutoff,
      pay, matchdays, settledThrough: now,
    });

    restored.unmount();
    const second = renderHook(useStadiumTycoon);
    expect(second.result.current.awayPay).toBeNull();
    expect(second.result.current.awayTrip).toBeNull();
  });

  it('keeps a visible pagehide and cleanup on their existing current timestamp', () => {
    const mounted = renderHook(useStadiumTycoon);
    now += 1000;
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(savedAt()).toBe(now);
    mounted.unmount();
    expect(savedAt()).toBe(now);
  });

  it('still settles the same absence when the hidden tab wakes in place', () => {
    const mounted = renderHook(useStadiumTycoon);
    setVisibility('hidden');
    now += 2 * 60 * 60 * 1000;
    setVisibility('visible');
    expect(mounted.result.current.awayPay).toBe(offlineEarnings(newTycoon(EPOCH), now));
    expect(mounted.result.current.awayTrip?.results.length).toBe(Math.floor(7200 / AWAY_MATCHDAY_SEC));
    expect(savedAt()).toBe(now);
  });

  it('keeps the exact sold ground after a hidden pagehide and cleanup', () => {
    const ground = newTycoon(EPOCH);
    const before = serializeTycoon({ ...ground, lifetime: prestigeThreshold(ground) }, EPOCH);
    localStorage.setItem(TYCOON_SAVE_KEY, before);
    const mounted = renderHook(useStadiumTycoon);
    now += 196;
    const soldGround = prestige(deserializeTycoon(before, EPOCH)!, now);
    const soldBytes = serializeTycoon(soldGround, now);
    expect(soldGround.rep).toBe(1);
    act(() => { expect(mounted.result.current.doPrestige()).toBe(true); });
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(soldBytes);

    setVisibility('hidden');
    const afterHide = localStorage.getItem(TYCOON_SAVE_KEY);
    now += 1000;
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    const afterPagehide = localStorage.getItem(TYCOON_SAVE_KEY);
    mounted.unmount();

    expect({
      hidden: afterHide === soldBytes,
      pagehide: afterPagehide === soldBytes,
      cleanup: localStorage.getItem(TYCOON_SAVE_KEY) === soldBytes,
      timestamp: savedAt(),
    }).toEqual({ hidden: true, pagehide: true, cleanup: true, timestamp: now - 1000 });
  });

  it.each([true, false])('leaves the old ground and paid time when the sale is refused (storage error: %s)', storageError => {
    const ground = newTycoon(EPOCH);
    const initial = serializeTycoon({
      ...ground,
      lifetime: storageError ? prestigeThreshold(ground) : 0,
    }, EPOCH);
    const before = serializeTycoon(deserializeTycoon(initial, EPOCH)!, EPOCH);
    localStorage.setItem(TYCOON_SAVE_KEY, before);
    const mounted = renderHook(useStadiumTycoon);
    now += 196;

    const fault = storageError ? vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Controlled stadium save refusal', 'QuotaExceededError');
    }) : undefined;
    act(() => { expect(mounted.result.current.doPrestige()).toBe(false); });
    if (fault) expect(fault).toHaveBeenCalledTimes(1);
    fault?.mockRestore();
    expect(mounted.result.current.state.rep).toBe(0);
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(before);

    setVisibility('hidden');
    now += 1000;
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(before);
    mounted.unmount();
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(before);
  });
});
