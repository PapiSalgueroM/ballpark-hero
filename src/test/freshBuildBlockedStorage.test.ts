/**
 * Round 1142: the page must never reload itself when the "I already reloaded"
 * marker cannot survive the reload.
 *
 * src/lib/freshBuild.ts reloads once for a stale lazy chunk and marks that in
 * sessionStorage. Under blocked storage the read used to throw and the reload
 * never happened. Once the storage seam started standing in for the visit,
 * the read stopped throwing, the marker went into a store that the reload
 * itself throws away, and a chunk that stays missing would have spun the page
 * for ever. Each "page load" below is a fresh copy of the modules, the way a
 * real reload gives the page a fresh stand in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NAMES = ['localStorage', 'sessionStorage'] as const;
const original = new Map<string, PropertyDescriptor | undefined>();
const reload = vi.fn();

function denied(): never {
  throw new DOMException("Failed to read the 'sessionStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
}
/** One page load: the seam first, as main.tsx has it, then the module under test. */
async function pageLoad() {
  vi.resetModules();
  const seam = await import('@/lib/safeStorage');
  const fresh = await import('@/lib/freshBuild');
  return { seam, fresh };
}

beforeEach(() => {
  for (const name of NAMES) original.set(name, Object.getOwnPropertyDescriptor(window, name));
  window.sessionStorage.clear();
  reload.mockClear();
  vi.stubGlobal('location', { ...window.location, reload });
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const name of NAMES) {
    const d = original.get(name);
    if (d) Object.defineProperty(window, name, d); else delete (window as unknown as Record<string, unknown>)[name];
  }
  vi.unstubAllGlobals();
});

describe('the stale chunk reload', () => {
  it('a browser that stores normally: reloads once, and the marker stops the second one', async () => {
    const first = await pageLoad();
    expect(first.seam.sessionStorageIsMemory).toBe(false);
    expect(first.fresh.reloadOnceForStaleChunk()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    const second = await pageLoad();
    expect(second.fresh.reloadOnceForStaleChunk()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('storage blocked: never reloads, on this page load or the next three', async () => {
    for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
    for (let load = 0; load < 4; load += 1) {
      /* a real reload hands the page the blocked accessor again, not the last page's stand in */
      for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
      const page = await pageLoad();
      expect(page.seam.sessionStorageIsMemory).toBe(true);
      expect(page.fresh.reloadOnceForStaleChunk()).toBe(false);
    }
    expect(reload).not.toHaveBeenCalled();
  });

  it('storage full: never reloads either (the marker cannot be written)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    const page = await pageLoad();
    expect(page.seam.sessionStorageIsMemory).toBe(true);
    expect(page.fresh.reloadOnceForStaleChunk()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('control: the stand in alone would have let every page load reload again', async () => {
    /* what the seam made possible before the rule went in: the marker is
       written, the reload wipes it, the next load finds nothing */
    const { createMemoryStorage } = await import('@/lib/safeStorage');
    let reloads = 0;
    for (let load = 0; load < 4; load += 1) {
      const standIn = createMemoryStorage();
      if (standIn.getItem('dukb-reloaded-stale-chunk') !== '1') {
        standIn.setItem('dukb-reloaded-stale-chunk', '1');
        reloads += 1;
      }
    }
    expect(reloads).toBe(4);
  });
});
