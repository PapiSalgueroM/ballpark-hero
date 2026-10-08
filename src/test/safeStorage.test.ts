/**
 * Round 1142: the storage seam. Every case imports the module fresh, because
 * the seam decides once, as it loads, exactly like it does in the browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Seam = typeof import('@/lib/safeStorage');
const NAMES = ['localStorage', 'sessionStorage'] as const;
const original = new Map<string, PropertyDescriptor | undefined>();

function denied(): never {
  throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
}
function blockAccessors(configurable = true) {
  for (const name of NAMES) Object.defineProperty(window, name, { configurable, get: denied });
}
function fillStorage() {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  });
}
const load = async (): Promise<Seam> => { vi.resetModules(); return import('@/lib/safeStorage'); };

beforeEach(() => {
  for (const name of NAMES) original.set(name, Object.getOwnPropertyDescriptor(window, name));
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.__DUKB_RAW_STORAGE__;
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const name of NAMES) {
    const d = original.get(name);
    if (d) Object.defineProperty(window, name, d); else delete (window as unknown as Record<string, unknown>)[name];
  }
  delete window.__DUKB_RAW_STORAGE__;
});

describe('safeStorage: a browser that stores normally', () => {
  it('passes every call straight through to the browser storage and reports no trouble', async () => {
    const realLocal = window.localStorage;
    const realSession = window.sessionStorage;
    realLocal.setItem('old-save', 'from last week');
    const seam = await load();
    expect(seam.getStorageTrouble()).toBeNull();
    expect(seam.sessionStorageIsMemory).toBe(false);
    expect(seam.safeLocalStorage.getItem('old-save')).toBe('from last week');
    seam.safeLocalStorage.setItem('k', 'v');
    expect(realLocal.getItem('k')).toBe('v');
    expect(seam.safeLocalStorage.length).toBe(2);
    seam.safeLocalStorage.removeItem('k');
    expect(realLocal.getItem('k')).toBeNull();
    seam.safeSessionStorage.setItem('s', '1');
    expect(realSession.getItem('s')).toBe('1');
    expect(realLocal.getItem('s')).toBeNull();
    /* window is left exactly as the browser made it */
    expect(window.localStorage).toBe(realLocal);
    expect(seam.getStorageTrouble()).toBeNull();
  });

  /* The review's finding: the first cut probed with a write and a remove as
     the module loaded, on both stores, in every browser. Three committed
     checks pin the auth client's own probe as the only write an import of the
     client causes (scripts/playInboxCard.mjs, scripts/qa/managerWorldBrowser1077.mjs,
     scripts/qa/managerMatchPlans1079.mjs), and each page load fired a storage
     event in every other tab. */
  it('writes and removes NOTHING as it loads', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const removes = vi.spyOn(Storage.prototype, 'removeItem');
    const clears = vi.spyOn(Storage.prototype, 'clear');
    await load();
    expect(writes).not.toHaveBeenCalled();
    expect(removes).not.toHaveBeenCalled();
    expect(clears).not.toHaveBeenCalled();
  });

  it('the write probe is one write and one remove of its own key, once a visit, only when asked', async () => {
    const seam = await load();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const removes = vi.spyOn(Storage.prototype, 'removeItem');
    expect(seam.probeStorageWrites()).toBeNull();
    expect(writes.mock.calls.map(c => c[0])).toEqual(['__dukb_storage_probe__']);
    expect(removes.mock.calls.map(c => c[0])).toEqual(['__dukb_storage_probe__']);
    expect(writes.mock.contexts[0]).toBe(window.localStorage);
    expect(seam.probeStorageWrites()).toBeNull();
    expect(seam.probeStorageWrites()).toBeNull();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(removes).toHaveBeenCalledTimes(1);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

describe('safeStorage: storage blocked', () => {
  it('stands in for the visit when the accessor throws, and puts the stand in on window', async () => {
    blockAccessors();
    expect(() => window.localStorage).toThrow();
    const seam = await load();
    expect(seam.getStorageTrouble()).toBe('blocked');
    /* nothing to probe: there is no browser store to write to */
    expect(seam.probeStorageWrites()).toBe('blocked');
    seam.safeLocalStorage.setItem('k', 'v');
    expect(seam.safeLocalStorage.getItem('k')).toBe('v');
    /* the call sites that never heard of the seam: the bare global works now */
    expect(window.localStorage).toBe(seam.safeLocalStorage);
    expect(localStorage.getItem('k')).toBe('v');
    localStorage.setItem('bare', '1');
    expect(seam.safeLocalStorage.getItem('bare')).toBe('1');
    expect(window.sessionStorage).toBe(seam.safeSessionStorage);
    expect(seam.safeSessionStorage).not.toBe(seam.safeLocalStorage);
  });

  it('stands in when the browser hands back null (a web view with storage turned off)', async () => {
    for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: () => null });
    const seam = await load();
    expect(seam.getStorageTrouble()).toBe('blocked');
    expect(localStorage.getItem('nothing')).toBeNull();
    localStorage.setItem('a', 'b');
    expect(seam.safeLocalStorage.getItem('a')).toBe('b');
  });

  it('stands in when the object is there but every call on it throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
    const seam = await load();
    expect(seam.getStorageTrouble()).toBe('blocked');
    seam.safeLocalStorage.setItem('k', 'v');
    expect(seam.safeLocalStorage.getItem('k')).toBe('v');
    expect(window.localStorage).toBe(seam.safeLocalStorage);
  });

  it('still works on the seam when window will not take the stand in', async () => {
    const define = Object.defineProperty;
    blockAccessors();
    vi.spyOn(Object, 'defineProperty').mockImplementation(((o: object, p: PropertyKey, d: PropertyDescriptor) => {
      if (o === window && (p === 'localStorage' || p === 'sessionStorage')) throw new TypeError('Cannot redefine property');
      return define(o, p, d);
    }) as typeof Object.defineProperty);
    const seam = await load();
    expect(seam.getStorageTrouble()).toBe('blocked');
    seam.safeLocalStorage.setItem('k', 'v');
    expect(seam.safeLocalStorage.getItem('k')).toBe('v');
    expect(() => window.localStorage).toThrow();
  });
});

describe('safeStorage: storage full', () => {
  it('keeps writes for the visit, still reads what was saved before, and leaves window alone', async () => {
    window.localStorage.setItem('old-save', 'kept from last week');
    const realLocal = window.localStorage;
    fillStorage();
    const seam = await load();
    /* not known yet: nothing has written, and the seam does not write as it loads */
    expect(seam.getStorageTrouble()).toBeNull();
    expect(seam.probeStorageWrites()).toBe('full');
    expect(seam.getStorageTrouble()).toBe('full');
    /* a full session store is still the browser's own and outlives a reload: only blocked is "memory" */
    expect(seam.sessionStorageIsMemory).toBe(false);
    expect(seam.safeLocalStorage).not.toBe(realLocal);
    expect(seam.safeLocalStorage.getItem('old-save')).toBe('kept from last week');
    seam.safeLocalStorage.setItem('cookie-consent', 'essential');
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBe('essential');
    /* nothing reached the browser's own store, and a guarded save still sees its write fail */
    expect(realLocal.getItem('cookie-consent')).toBeNull();
    expect(window.localStorage).toBe(realLocal);
    expect(() => window.localStorage.setItem('x', 'y')).toThrow();
  });

  it('learns it is full from the first write the browser refuses, with no probe at all', async () => {
    const realLocal = window.localStorage;
    fillStorage();
    const seam = await load();
    expect(seam.getStorageTrouble()).toBeNull();
    seam.safeLocalStorage.setItem('cookie-consent', 'accepted');
    expect(seam.getStorageTrouble()).toBe('full');
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBe('accepted');
    expect(realLocal.getItem('cookie-consent')).toBeNull();
  });

  it('learns it is full from a refused safeSetItem too', async () => {
    fillStorage();
    const seam = await load();
    expect(seam.getStorageTrouble()).toBeNull();
    expect(seam.safeSetItem('footle-rules-seen', '1')).toBe(false);
    expect(seam.getStorageTrouble()).toBe('full');
  });

  it('a session store that refuses a write says nothing about saves', async () => {
    const seam = await load();
    fillStorage();
    seam.safeSessionStorage.setItem('dukb-reloaded-for', 'index-abc.js');
    expect(seam.safeSessionStorage.getItem('dukb-reloaded-for')).toBe('index-abc.js');
    expect(seam.getStorageTrouble()).toBeNull();
  });

  it('a remove reaches the browser store underneath, so a cleared choice stays cleared after a reload', async () => {
    window.localStorage.setItem('cookie-consent', 'accepted');
    const realLocal = window.localStorage;
    fillStorage();
    const seam = await load();
    seam.safeLocalStorage.removeItem('cookie-consent');
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBeNull();
    expect(realLocal.getItem('cookie-consent')).toBeNull();
  });
});

describe('safeStorage: the raw switch (the harness control)', () => {
  it('hands back the browser storage untouched when storage works', async () => {
    window.__DUKB_RAW_STORAGE__ = true;
    const realLocal = window.localStorage;
    const seam = await load();
    expect(seam.safeLocalStorage).toBe(realLocal);
    expect(seam.getStorageTrouble()).toBeNull();
    /* and the probe stands down, so the control really is the app as it was */
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    expect(seam.probeStorageWrites()).toBeNull();
    expect(writes).not.toHaveBeenCalled();
  });

  it('throws as the module loads when storage is blocked, which is the dead page this round fixes', async () => {
    window.__DUKB_RAW_STORAGE__ = true;
    blockAccessors();
    await expect(load()).rejects.toThrow(/Access is denied/);
  });
});

describe('safeStorage: the stand in behaves like Storage', () => {
  it('getItem, setItem, removeItem, key, length and clear', async () => {
    const { createMemoryStorage } = await load();
    const s = createMemoryStorage();
    expect(s.length).toBe(0);
    expect(s.getItem('missing')).toBeNull();
    expect(s.key(0)).toBeNull();
    s.setItem('a', '1');
    s.setItem('b', '2');
    s.setItem('a', '3');
    expect(s.length).toBe(2);
    expect(s.getItem('a')).toBe('3');
    expect([s.key(0), s.key(1)].sort()).toEqual(['a', 'b']);
    expect(s.key(2)).toBeNull();
    s.removeItem('a');
    s.removeItem('never there');
    expect(s.getItem('a')).toBeNull();
    expect(s.length).toBe(1);
    s.clear();
    expect(s.length).toBe(0);
    expect(s.getItem('b')).toBeNull();
  });

  it('stores strings, the way the browser does', async () => {
    const { createMemoryStorage } = await load();
    const s = createMemoryStorage();
    s.setItem('n', 7 as unknown as string);
    s.setItem('o', { a: 1 } as unknown as string);
    expect(s.getItem('n')).toBe('7');
    expect(s.getItem('o')).toBe('[object Object]');
  });

  it('laid over a store that refuses writes: keys from both are listed once, and a refused remove stays removed', async () => {
    const { createMemoryStorage } = await load();
    window.localStorage.setItem('old', '1');
    window.localStorage.setItem('both', 'under');
    const under = window.localStorage;
    fillStorage();
    const s = createMemoryStorage(under);
    s.setItem('both', 'over');
    s.setItem('new', '2');
    expect(s.length).toBe(3);
    const listed = [0, 1, 2].map(i => s.key(i)).sort();
    expect(listed).toEqual(['both', 'new', 'old']);
    expect(s.getItem('both')).toBe('over');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('refused'); });
    s.removeItem('old');
    expect(s.getItem('old')).toBeNull();
    expect(s.length).toBe(2);
    s.setItem('old', 'back');
    expect(s.getItem('old')).toBe('back');
  });

  it('a write goes to the browser store again the moment it takes one', async () => {
    const { createMemoryStorage } = await load();
    const under = window.localStorage;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const s = createMemoryStorage(under);
    s.setItem('k', 'memory');
    expect(under.getItem('k')).toBeNull();
    spy.mockRestore();
    s.setItem('k', 'real');
    expect(under.getItem('k')).toBe('real');
    expect(s.getItem('k')).toBe('real');
    expect(s.length).toBe(1);
  });
});

describe('safeStorage: safeSetItem, the write that cannot take a page down', () => {
  it('writes to the browser storage and says so when storage works', async () => {
    const seam = await load();
    expect(seam.safeSetItem('footle-rules-seen', '1')).toBe(true);
    expect(window.localStorage.getItem('footle-rules-seen')).toBe('1');
  });

  it('answers false and throws nothing when storage is full, and stores nothing a reader could not read back', async () => {
    fillStorage();
    const seam = await load();
    expect(seam.safeSetItem('footle-rules-seen', '1')).toBe(false);
    expect(window.localStorage.getItem('footle-rules-seen')).toBeNull();
    expect(seam.safeLocalStorage.getItem('footle-rules-seen')).toBeNull();
  });

  it('keeps the write for the visit when storage is blocked', async () => {
    blockAccessors();
    const seam = await load();
    expect(seam.safeSetItem('footle-rules-seen', '1')).toBe(true);
    expect(localStorage.getItem('footle-rules-seen')).toBe('1');
  });

  it('answers false when storage is blocked and window would not take the stand in', async () => {
    const define = Object.defineProperty;
    blockAccessors();
    vi.spyOn(Object, 'defineProperty').mockImplementation(((o: object, p: PropertyKey, d: PropertyDescriptor) => {
      if (o === window && (p === 'localStorage' || p === 'sessionStorage')) throw new TypeError('Cannot redefine property');
      return define(o, p, d);
    }) as typeof Object.defineProperty);
    const seam = await load();
    expect(seam.safeSetItem('footle-rules-seen', '1')).toBe(false);
  });

  it('under the raw switch it throws like the unguarded write it replaced', async () => {
    window.__DUKB_RAW_STORAGE__ = true;
    fillStorage();
    const seam = await load();
    expect(() => seam.safeSetItem('footle-rules-seen', '1')).toThrow(/quota/i);
  });
});

describe('safeStorage: the Web Locks stand in (a real blocked browser refuses locks too)', () => {
  const nav = window.navigator as Navigator & { locks?: unknown };
  let hadLocks: PropertyDescriptor | undefined;
  const refuse = () => Promise.reject(new DOMException('The request was denied.', 'SecurityError'));
  function giveLocks(request: (...args: unknown[]) => Promise<unknown>) {
    Object.defineProperty(nav, 'locks', { configurable: true, value: { request } });
  }
  type Locks = { request: (name: string, ...rest: unknown[]) => Promise<unknown> };
  const locks = () => (nav as unknown as { locks: Locks }).locks;

  beforeEach(() => { hadLocks = Object.getOwnPropertyDescriptor(nav, 'locks'); });
  afterEach(() => {
    if (hadLocks) Object.defineProperty(nav, 'locks', hadLocks); else delete (nav as unknown as Record<string, unknown>).locks;
  });

  it('runs the callback without a lock when the browser refuses one', async () => {
    blockAccessors();
    giveLocks(refuse);
    await load();
    await expect(locks().request('lock:session', async () => 'read the session')).resolves.toBe('read the session');
    await expect(locks().request('lock:session', { mode: 'exclusive' }, async (lock: unknown) => (lock ? 'held' : 'not held'))).resolves.toBe('held');
  });

  it('runs the callback once, and lets its own error through untouched', async () => {
    blockAccessors();
    /* a browser that grants the lock, with a callback that fails for its own reasons */
    giveLocks(async (...args: unknown[]) => (args[args.length - 1] as (l: unknown) => unknown)({ name: 'x', mode: 'exclusive' }));
    await load();
    let runs = 0;
    const failing = async () => { runs += 1; throw new DOMException('not yours to swallow', 'SecurityError'); };
    await expect(locks().request('lock:session', failing)).rejects.toThrow('not yours to swallow');
    expect(runs).toBe(1);
  });

  it('passes any other refusal through', async () => {
    blockAccessors();
    giveLocks(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    await load();
    await expect(locks().request('lock:session', async () => 'never')).rejects.toThrow('aborted');
  });

  it('leaves locks alone in a browser that stores normally', async () => {
    giveLocks(refuse);
    const before = locks().request;
    await load();
    expect(locks().request).toBe(before);
  });
});
