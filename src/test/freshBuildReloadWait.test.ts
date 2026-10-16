/**
 * Round 1338: once a page has asked for its stale chunk reload, every later
 * chunk failure in that page waits with the first.
 *
 * The build makes a cancelled vite:preloadError wait instead of handing the
 * import an empty module (scripts/lib/vitePreloadWait.mjs, proved by
 * scripts/simPreloadWait.mjs; vitest never sees that wrapper). This file holds
 * the page side: which failures src/lib/freshBuild.ts cancels. A cancel means
 * "this page is being replaced, wait", so it must happen exactly when a reload
 * is on its way, and never otherwise.
 *
 * Each "page" is a fresh copy of the modules, the storage seam first as
 * main.tsx has it, the way freshBuildBlockedStorage.test.ts makes one. The
 * listeners a page added are taken off after each test: a real reload drops
 * them, and an old page's listener must not answer for the next one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STALE_KEY = 'dukb-reloaded-stale-chunk';
const CHUNK = 'Failed to fetch dynamically imported module: https://douknowball.com/assets/TacticsPanel-Bq1x77Zk.js';
const OTHER = 'Failed to fetch dynamically imported module: https://douknowball.com/assets/SoccerCareer-Cq2y88Zk.js';
const KIT = 'Failed to fetch dynamically imported module: https://douknowball.com/assets/soundKit-D1G9IZR4.js';
const reload = vi.fn();
let added: Array<[string, EventListenerOrEventListenerObject]> = [];
let online = true;

async function pageLoad() {
  for (const [type, listener] of added) window.removeEventListener(type, listener);
  added = [];
  vi.resetModules();
  const seam = await import('@/lib/safeStorage');
  const fresh = await import('@/lib/freshBuild');
  fresh.watchForNewBuild();
  return { seam, fresh };
}
const preloadError = (message: string): boolean => {
  const event = new Event('vite:preloadError', { cancelable: true });
  (event as Event & { payload?: unknown }).payload = new Error(message);
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

beforeEach(() => {
  window.sessionStorage.clear();
  reload.mockClear();
  online = true;
  vi.stubGlobal('location', { ...window.location, reload });
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });
  const real = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    added.push([type, listener]);
    real(type, listener, options);
  });
});
afterEach(() => {
  for (const [type, listener] of added) window.removeEventListener(type, listener);
  added = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (window.navigator as unknown as Record<string, unknown>).onLine;
  delete (window as unknown as Record<string, unknown>).__DUKB_PRERENDER__;
});

describe('Round 1338: a page that asked for its reload waits with it', () => {
  it('1. the first chunk error in a page: cancelled, one reload, the once flag set', async () => {
    await pageLoad();
    expect(preloadError(CHUNK)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(STALE_KEY)).toBe('1');
  });

  it('2. a second and a third error in the same page: cancelled, still one reload', async () => {
    await pageLoad();
    expect(preloadError(CHUNK)).toBe(true);
    expect(preloadError(OTHER)).toBe(true);
    expect(preloadError(CHUNK)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('3. the sound kit after it: still never cancelled (Round 1132)', async () => {
    await pageLoad();
    expect(preloadError(CHUNK)).toBe(true);
    expect(preloadError(KIT)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('4. the next page, its one reload spent: nothing cancelled, no reload, twice', async () => {
    await pageLoad();
    expect(preloadError(CHUNK)).toBe(true);
    await pageLoad();
    expect(window.sessionStorage.getItem(STALE_KEY)).toBe('1');
    expect(preloadError(CHUNK)).toBe(false);
    expect(preloadError(OTHER)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('5. under the prerenderer: nothing cancelled, no reload, twice', async () => {
    (window as unknown as Record<string, unknown>).__DUKB_PRERENDER__ = true;
    await pageLoad();
    expect(preloadError(CHUNK)).toBe(false);
    expect(preloadError(OTHER)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(STALE_KEY)).toBeNull();
  });

  it('6. offline: nothing cancelled; back online in the same page, the next error gets the one reload', async () => {
    online = false;
    await pageLoad();
    expect(preloadError(CHUNK)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    online = true;
    expect(preloadError(CHUNK)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('7. a save the browser refused: nothing cancelled, no reload, twice', async () => {
    const { seam } = await pageLoad();
    const release = seam.holdPendingSave(() => false);
    try {
      expect(preloadError(CHUNK)).toBe(false);
      expect(preloadError(OTHER)).toBe(false);
      expect(reload).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem(STALE_KEY)).toBeNull();
    } finally {
      release();
    }
  });

  it('8. storage blocked: never cancelled, never reloads', async () => {
    const names = ['localStorage', 'sessionStorage'] as const;
    const original = names.map(name => Object.getOwnPropertyDescriptor(window, name));
    const denied = (): never => { throw new DOMException('Access is denied for this document.', 'SecurityError'); };
    for (const name of names) Object.defineProperty(window, name, { configurable: true, get: denied });
    try {
      const { seam } = await pageLoad();
      expect(seam.sessionStorageIsMemory).toBe(true);
      expect(preloadError(CHUNK)).toBe(false);
      expect(preloadError(OTHER)).toBe(false);
      expect(reload).not.toHaveBeenCalled();
    } finally {
      names.forEach((name, i) => {
        const d = original[i];
        if (d) Object.defineProperty(window, name, d); else delete (window as unknown as Record<string, unknown>)[name];
      });
    }
  });
});
