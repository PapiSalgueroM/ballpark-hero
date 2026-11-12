import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { recordCompletion } from '@/lib/completions';
import { newTycoon, serializeTycoon, setTicketPolicy, TYCOON_SAVE_KEY } from '@/lib/stadiumTycoon';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
vi.mock('@/lib/tycoonRewards', () => ({ recordFullTimes: vi.fn() }));

const now = 1767225600000;
const frames = vi.fn((_frame: FrameRequestCallback) => 1);

beforeEach(() => {
  localStorage.removeItem(TYCOON_SAVE_KEY);
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal('requestAnimationFrame', frames);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem(TYCOON_SAVE_KEY);
});

function openOlderTab() {
  const stadium = setTicketPolicy(newTycoon(now), 'community');
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(stadium, now));
  const view = renderHook(() => useStadiumTycoon());
  const newer = serializeTycoon(setTicketPolicy(stadium, 'premium'), now);
  localStorage.setItem(TYCOON_SAVE_KEY, newer);
  return { view, newer };
}

it('preserves a newer stadium save when an older tab leaves', () => {
  const { view, newer } = openOlderTab();
  const writes = vi.spyOn(Storage.prototype, 'setItem');

  act(() => { window.dispatchEvent(new Event('pagehide')); });
  view.unmount();

  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(newer);
  expect(writes).not.toHaveBeenCalled();
});

it('pauses a stale stadium clock and refuses a stale ticket change', () => {
  const { view, newer } = openOlderTab();
  const [frame] = frames.mock.calls[0];
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: TYCOON_SAVE_KEY, newValue: newer }));
  });
  act(() => {
    frame(5200);
    view.result.current.doSetTicketPolicy('standard');
  });

  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(newer);
  expect(writes).not.toHaveBeenCalled();
  expect(recordCompletion).not.toHaveBeenCalled();
  expect(frames).toHaveBeenCalledTimes(1);
  expect(view.result.current.saveMoved).toBe(true);
});
