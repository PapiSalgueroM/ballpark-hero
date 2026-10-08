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
    /* a full session store is still the browser's own and outlives a reload;
       what stops the reload here is the marker write being refused */
    expect(page.seam.sessionStorageIsMemory).toBe(false);
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

/* Review finding: the same rule in check(), the reload for a new build when
   the tab gets focus back, had no test. Taking the guard out left every gate
   green and would have reloaded the page on every focus under blocked
   storage, throwing the game in progress away each time. check() is private,
   so this drives it the way the browser does: wire the watcher, let the page
   get old enough, and give the window focus. */
describe('the new build reload on focus', () => {
  const T0 = 1_800_000_000_000;
  let now = T0;
  const wired: Array<{ target: EventTarget; type: string; fn: EventListenerOrEventListenerObject }> = [];
  const fetched = vi.fn(async () => ({
    ok: true,
    text: async () => '<script type="module" crossorigin src="/assets/index-NEWBUILD9.js"></script>',
  }));
  const settle = async () => { for (let i = 0; i < 5; i += 1) await new Promise(resolve => setTimeout(resolve, 0)); };

  /** One page load that booted on the old build, with the watcher wired. */
  async function bootOldBuild() {
    const page = await pageLoad();
    const ofWindow = window.addEventListener.bind(window);
    const ofDocument = document.addEventListener.bind(document);
    const w = vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, fn: EventListenerOrEventListenerObject) => {
      wired.push({ target: window, type, fn });
      ofWindow(type, fn);
    }) as typeof window.addEventListener);
    const d = vi.spyOn(document, 'addEventListener').mockImplementation(((type: string, fn: EventListenerOrEventListenerObject) => {
      wired.push({ target: document, type, fn });
      ofDocument(type, fn);
    }) as typeof document.addEventListener);
    page.fresh.watchForNewBuild();
    w.mockRestore();
    d.mockRestore();
    return page;
  }
  /** The tab comes back `seconds` later. */
  async function focusAfter(seconds: number) {
    now += seconds * 1000;
    window.dispatchEvent(new Event('focus'));
    await settle();
  }

  beforeEach(() => {
    now = T0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fetched.mockClear();
    vi.stubGlobal('fetch', fetched);
    const entry = document.createElement('script');
    entry.type = 'module';
    entry.setAttribute('src', '/assets/index-OLDBUILD1.js');
    entry.setAttribute('data-test-entry', '');
    document.head.appendChild(entry);
  });
  afterEach(() => {
    for (const x of wired.splice(0)) x.target.removeEventListener(x.type, x.fn);
    document.querySelectorAll('script[data-test-entry]').forEach(el => el.remove());
  });

  it('a browser that stores normally: reloads once for the new build, and the marker stops the second one', async () => {
    await bootOldBuild();
    await focusAfter(11);
    expect(fetched).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('dukb-reloaded-for')).toBe('index-NEWBUILD9.js');
    await focusAfter(61);
    expect(fetched).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('storage blocked: sees the new build and never reloads, on this page load or the next three', async () => {
    for (let load = 0; load < 4; load += 1) {
      /* a real reload hands the page the blocked accessor again, not the last page's stand in */
      for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
      const page = await bootOldBuild();
      expect(page.seam.sessionStorageIsMemory).toBe(true);
      await focusAfter(11);
      /* the check got as far as seeing a different build, so what held it back was the rule */
      expect(fetched).toHaveBeenCalledTimes(load + 1);
      for (const x of wired.splice(0)) x.target.removeEventListener(x.type, x.fn);
    }
    expect(reload).not.toHaveBeenCalled();
  });

  it('storage full: the marker is refused, so no reload', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    await bootOldBuild();
    await focusAfter(11);
    expect(fetched).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
