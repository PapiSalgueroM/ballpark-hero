import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import { useSaveFenceWatch } from '@/hooks/useSaveFenceWatch';

/* Round 1330: the generic watch over Round 1323's fence. Another tab is played
   here by writing the fence key one higher than this page adopted, which is
   what a fenced game write in another tab leaves on disk, and then firing the
   event that tab's write would raise here. Every case uses its own save key,
   because the fence singleton remembers what each page adopted. */

let n = 0;
let key = '';
const fence = () => fenceKeyOf(key);

function otherTabWrites() {
  const now = Number(window.localStorage.getItem(fence()) ?? '0');
  window.localStorage.setItem(fence(), String(now + 1));
}

function storageEvent(k: string | null) {
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key: k })); });
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

beforeEach(() => {
  n += 1;
  key = `watchTestSave${n}`;
  window.localStorage.clear();
  setVisibility('visible');
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSaveFenceWatch', () => {
  it('a storage event for the fence key sets moved after another tab wrote', () => {
    window.localStorage.setItem(fence(), '3');
    saveFence.adopt(key);
    const { result } = renderHook(() => useSaveFenceWatch(key));
    expect(result.current.moved).toBe(false);
    storageEvent(fence());
    expect(result.current.moved).toBe(false);
    otherTabWrites();
    storageEvent(fence());
    expect(result.current.moved).toBe(true);
  });

  it('a clear (key null) checks too', () => {
    window.localStorage.setItem(fence(), '1');
    saveFence.adopt(key);
    const { result } = renderHook(() => useSaveFenceWatch(key));
    otherTabWrites();
    storageEvent(null);
    expect(result.current.moved).toBe(true);
  });

  it('pageshow checks', () => {
    saveFence.adopt(key);
    const { result } = renderHook(() => useSaveFenceWatch(key));
    otherTabWrites();
    act(() => { window.dispatchEvent(new Event('pageshow')); });
    expect(result.current.moved).toBe(true);
  });

  it('becoming visible checks, going hidden does not', () => {
    saveFence.adopt(key);
    const { result } = renderHook(() => useSaveFenceWatch(key));
    otherTabWrites();
    setVisibility('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.moved).toBe(false);
    setVisibility('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.moved).toBe(true);
  });

  it('an event for any other key does nothing, the save itself included', () => {
    saveFence.adopt(key);
    const { result } = renderHook(() => useSaveFenceWatch(key));
    otherTabWrites();
    storageEvent(key);
    storageEvent('someOtherGameSave');
    storageEvent(`${fence()}x`);
    expect(result.current.moved).toBe(false);
    /* and the move is still there to find: the next check sees it */
    let answer = false;
    act(() => { answer = result.current.check(); });
    expect(answer).toBe(true);
    expect(result.current.moved).toBe(true);
  });

  it('an absent fence key is never moved', () => {
    saveFence.adopt(key);
    const { result } = renderHook(() => useSaveFenceWatch(key));
    storageEvent(fence());
    storageEvent(null);
    act(() => { window.dispatchEvent(new Event('pageshow')); });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    let answer = true;
    act(() => { answer = result.current.check(); });
    expect(answer).toBe(false);
    expect(result.current.moved).toBe(false);
  });

  it('writes nothing and adopts nothing: a page that never adopted is never moved', () => {
    const before = window.localStorage.length;
    const { result } = renderHook(() => useSaveFenceWatch(key));
    expect(window.localStorage.length).toBe(before);
    expect(window.localStorage.getItem(fence())).toBeNull();
    otherTabWrites();
    storageEvent(fence());
    expect(result.current.moved).toBe(false);
  });

  it('once moved it stays moved', () => {
    saveFence.adopt(key);
    const { result } = renderHook(() => useSaveFenceWatch(key));
    otherTabWrites();
    storageEvent(fence());
    expect(result.current.moved).toBe(true);
    window.localStorage.removeItem(fence());
    storageEvent(fence());
    expect(result.current.moved).toBe(true);
  });

  it('every listener is gone after unmount', () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');
    saveFence.adopt(key);
    const { unmount } = renderHook(() => useSaveFenceWatch(key));
    const added = [
      ...winAdd.mock.calls.filter(c => c[0] === 'storage' || c[0] === 'pageshow'),
      ...docAdd.mock.calls.filter(c => c[0] === 'visibilitychange'),
    ];
    expect(added.map(c => c[0]).sort()).toEqual(['pageshow', 'storage', 'visibilitychange']);
    unmount();
    for (const [type, handler] of added) {
      const removed = [...winRemove.mock.calls, ...docRemove.mock.calls].some(c => c[0] === type && c[1] === handler);
      expect(removed, `${String(type)} listener removed`).toBe(true);
    }
  });
});
