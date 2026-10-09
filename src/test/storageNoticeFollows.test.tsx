/**
 * Round 1144: the storage line follows the seam.
 *
 * Until this round the line read the seam once a page, and the seam never
 * took a refusal back, so "Storage is full" stayed up for the rest of the
 * visit after the player had made room and his save had gone through. A
 * review of Release AN saw exactly that on the four US careers.
 *
 * What is held here, in jsdom, with the real seam and the real component:
 * the line leaves on the same page once the browser takes writes again, a
 * moment after a press; its place stays so nothing under it moves; a browser
 * that stores normally is still written to once a visit and never again;
 * and presses close together share one check.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

const PROBE = '__dukb_storage_probe__';
const line = () => document.querySelector('[data-dukb-storage-notice]');
const place = () => document.querySelector('[data-dukb-storage-notice-left]');

let go: (path: string) => void = () => {};
function Mover() {
  const navigate = useNavigate();
  go = path => navigate(path);
  return null;
}

async function mount(path: string) {
  vi.resetModules();
  await import('@/lib/safeStorage');
  const { StorageNotice, RECHECK_AFTER_MS } = await import('@/components/StorageNotice');
  const view = render(<MemoryRouter initialEntries={[path]}><Mover /><StorageNotice /></MemoryRouter>);
  return { view, wait: RECHECK_AFTER_MS };
}
const refuseAll = () => vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
});
/* a press anywhere on the page, then the moment the notice waits, then the seam's own moment */
async function pressAndWait(ms: number) {
  await act(async () => {
    document.body.click();
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the storage line follows the seam', () => {
  it('leaves on the same page once the browser takes writes again, and its place stays', async () => {
    const full = refuseAll();
    const { wait } = await mount('/nba-my-career');
    expect(line()!.getAttribute('data-dukb-storage-notice')).toBe('full');
    const words = line()!.textContent;
    /* a press while the storage is still full: asked again, still refused, the line stays */
    await pressAndWait(wait);
    expect(line()).not.toBeNull();
    /* the player makes room (the browser takes writes again) and presses something, his Retry save say */
    full.mockRestore();
    await pressAndWait(wait);
    expect(line()).toBeNull();
    /* the page must not jump: the same words keep the line's place, unseen and unread */
    const kept = place();
    expect(kept).not.toBeNull();
    expect(kept!.textContent).toBe(words);
    expect(kept!.className).toContain('invisible');
    expect(kept!.getAttribute('aria-hidden')).toBe('true');
    expect(kept!.getAttribute('role')).toBeNull();
    expect(kept!.hasAttribute('data-no-prerender')).toBe(true);
    expect(window.localStorage.length).toBe(0);
  });

  it('comes back in the same place when a write is refused again, and the place is given up on the next page', async () => {
    const full = refuseAll();
    const { wait } = await mount('/nba-my-career');
    full.mockRestore();
    await pressAndWait(wait);
    expect(line()).toBeNull();
    expect(place()).not.toBeNull();
    /* a write refused later on the same page: the seam says so and the line is back */
    refuseAll();
    const seam = await import('@/lib/safeStorage');
    await act(async () => { seam.safeSetItem('footle-rules-seen', '1'); await Promise.resolve(); });
    expect(line()!.getAttribute('data-dukb-storage-notice')).toBe('full');
    expect(place()).toBeNull();
    vi.restoreAllMocks();
    await pressAndWait(wait);
    expect(place()).not.toBeNull();
    /* another game: no line there and no empty place either */
    await act(async () => { go('/footle'); await Promise.resolve(); });
    expect(line()).toBeNull();
    expect(place()).toBeNull();
    /* and none when he comes back to the first one */
    await act(async () => { go('/nba-my-career'); await Promise.resolve(); });
    expect(line()).toBeNull();
    expect(place()).toBeNull();
  });

  it('presses close together share one check, and nothing is asked without a press', async () => {
    const full = refuseAll();
    const { wait } = await mount('/nba-my-career');
    /* the probe as the page opened */
    expect(full).toHaveBeenCalledTimes(1);
    /* a whole idle minute: no timer of its own */
    await act(async () => { vi.advanceTimersByTime(60_000); await Promise.resolve(); });
    expect(full).toHaveBeenCalledTimes(1);
    await act(async () => {
      document.body.click();
      vi.advanceTimersByTime(wait - 50);
      document.body.click();
      document.body.click();
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(full).toHaveBeenCalledTimes(2);
    expect(full.mock.calls.every(c => c[0] === PROBE)).toBe(true);
  });

  it('asks again when the tab comes back', async () => {
    const full = refuseAll();
    const { wait } = await mount('/nba-my-career');
    full.mockRestore();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(wait);
      await Promise.resolve();
    });
    expect(line()).toBeNull();
  });

  /* Round 1142's rule, which this round keeps: the three committed checks that
     pin "one probe a visit" are about this browser, the ordinary one */
  it('in a browser that stores normally no press ever writes: one probe a visit, as before', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const removes = vi.spyOn(Storage.prototype, 'removeItem');
    const { wait } = await mount('/nba-my-career');
    expect(line()).toBeNull();
    for (let i = 0; i < 6; i += 1) await pressAndWait(wait);
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(wait); await Promise.resolve(); });
    expect(writes.mock.calls.map(c => c[0])).toEqual([PROBE]);
    expect(removes.mock.calls.map(c => c[0])).toEqual([PROBE]);
    expect(place()).toBeNull();
  });

  it('blocked storage stays said for the visit, and no press asks anything', async () => {
    const names = ['localStorage', 'sessionStorage'] as const;
    const before = names.map(n => [n, Object.getOwnPropertyDescriptor(window, n)] as const);
    for (const n of names) Object.defineProperty(window, n, { configurable: true, get: () => { throw new DOMException('Access is denied for this document.', 'SecurityError'); } });
    try {
      const { wait } = await mount('/nba-my-career');
      expect(line()!.getAttribute('data-dukb-storage-notice')).toBe('blocked');
      for (let i = 0; i < 3; i += 1) await pressAndWait(wait);
      expect(line()!.getAttribute('data-dukb-storage-notice')).toBe('blocked');
    } finally {
      cleanup();
      for (const [n, d] of before) { if (d) Object.defineProperty(window, n, d); else delete (window as unknown as Record<string, unknown>)[n]; }
    }
  });
});
