/**
 * Round 1142: one seam for a browser that will not store anything.
 *
 * Reading window.localStorage THROWS when a browser blocks site data ("block
 * all cookies", strict modes, some in app browsers and embedded views). The
 * Supabase client read it at module scope, so the entry module died before
 * React mounted and the visitor got the saved page's static text with nothing
 * to press, on every route. The quieter second case is storage that can be
 * read but refuses every write (full, or a quota of zero): there the cookie
 * banner threw on its own button and could never be dismissed.
 *
 * What this file decides as it loads, by READING only. It never writes as it
 * loads: three committed checks (scripts/playInboxCard.mjs and the two
 * Club Manager walks under scripts/qa) pin the auth client's own probe as the
 * only storage write an import of the client may cause, and they are right
 * to. A write here would also fire a storage event in every other open tab on
 * every page load.
 *
 *   ok       the storage can be read. The seam passes every call straight
 *            through to the browser's own storage and keeps nothing itself.
 *   blocked  the storage cannot be read at all. The seam is a store that
 *            lives for the visit, and it is also put on window in place of the
 *            accessor that throws, so the several hundred call sites that say
 *            localStorage.getItem keep working without a try block each.
 *            Nothing is kept past the visit. The Web Locks API is refused
 *            in the same browsers, so that gets a stand in too (see
 *            standInForLocks below).
 *   full     reads work, writes throw. That cannot be known without writing,
 *            so it is learned later, one of three ways: probeStorageWrites()
 *            (one write and one remove, once a visit, asked for by the
 *            notice when a game page opens), a write through the seam that
 *            the browser refuses, or a refused safeSetItem. From the first
 *            refusal the seam keeps what it is given for the visit, laid over
 *            the browser's own store so whatever is already saved can still
 *            be read. Nothing is put on window: a game that guards its own
 *            save has to keep seeing the write fail, so it can say so.
 *
 * StorageNotice reads getStorageTrouble() and tells the player, once a page,
 * that progress is not being saved here.
 *
 * Round 1144: 'full' is taken back when it stops being true. Before, the
 * first refused write set it for the rest of the visit, so after a player
 * freed some room and his save went through the line at the top still said
 * the storage was full until the page was loaded again. It is unlearned in
 * ONE place, recheckStorageWrites(), and only on proof:
 *   - Never because the browser took a write. A store with no room left
 *     still takes a write that needs none (the same key at the same size,
 *     which is what a page does when it saves what it loaded), so a taken
 *     write says nothing. The first cut of this round unlearned on any of
 *     them, and in a real Chromium the line left on the bracket page while
 *     every save was still being refused.
 *   - Never while a game holds a save the browser refused (holdPendingSave
 *     below). That save is the thing the line is about.
 *   - By writing and removing the probe key with as much NEW room as the
 *     largest refused write needed (refusedNeed): room for one character
 *     says nothing about a save of four hundred.
 *   - And then by writing what the seam kept for the visit. A cookie choice
 *     or a sign in made while the store was full used to be lost at the next
 *     page load, with no line left to say why. While any of it still does
 *     not fit, 'full' stays.
 * The recheck only ever runs while the seam ALREADY says full, so the rule
 * above holds as it did: a browser that stores normally is probed at most
 * once a visit, by probeStorageWrites(). The notice asks for a recheck a
 * moment after a press and when the tab comes back, never on a timer.
 * subscribeStorageTrouble() tells a listener when the answer changes.
 * 'blocked' is decided as this file loads and never changes.
 *
 * The same round: a save a game could not write waits in the open page for
 * the player to retry it, and a reload would throw it away. A game names
 * that save with holdPendingSave(), and anything that reloads the page on
 * the app's own account asks settlePendingSaves() first (src/lib/freshBuild.ts).
 * Held, not carried: with the storage refusing writes there is nowhere to
 * put the save that outlives the page, and carrying it would mean a second
 * way of writing every game's save. The retry the game already has is run
 * once instead, and the page stays while it is still refused.
 *
 * window.__DUKB_RAW_STORAGE__ (read once, here) hands back the browser's own
 * storage with no probe and no fallback. It exists for one reason:
 * scripts/playStorageBlocked.mjs sets it as its negative control and proves
 * the page is dead without this file.
 */

export type StorageTrouble = 'blocked' | 'full';
type StorageName = 'localStorage' | 'sessionStorage';

declare global {
  interface Window {
    __DUKB_RAW_STORAGE__?: boolean;
  }
}

const PROBE_KEY = '__dukb_storage_probe__';

/**
 * How much NEW room a write needs in a store, in characters: the key and the
 * value for a key the store does not hold, the growth for one it does. A
 * browser counts a store's quota the same way, which is why a full one still
 * takes an overwrite that does not grow.
 */
function roomNeeded(store: Storage, key: string, value: string): number {
  let held: string | null = null;
  try { held = store.getItem(key); } catch { held = null; }
  return held === null ? key.length + value.length : Math.max(1, value.length - held.length);
}

/* For a store made below: the way to write what it kept to the store under it. */
const flushers = new WeakMap<Storage, () => boolean>();

/**
 * A Storage shaped store that lives for the visit. Given the browser's own
 * storage as `under`, reads fall through to it, a write tries it first and is
 * kept here only when it refuses (and `onRefused` hears how much room it
 * needed), and a remove reaches it too. While the browser takes every write
 * this keeps nothing and is a plain pass through.
 */
export function createMemoryStorage(under: Storage | null = null, onRefused?: (need: number) => void): Storage {
  const kept = new Map<string, string>();
  /* Keys removed here that the store underneath would not let go of. */
  const gone = new Set<string>();
  let below = under;

  const keys = (): string[] => {
    const out: string[] = [];
    if (below) {
      try {
        for (let i = 0; i < below.length; i += 1) {
          const k = below.key(i);
          if (k !== null && !gone.has(k) && !kept.has(k)) out.push(k);
        }
      } catch { /* it stopped answering: what is kept here is all there is */ }
    }
    return [...out, ...kept.keys()];
  };

  const store = {
    get length(): number { return keys().length; },
    key(index: number): string | null { return keys()[index] ?? null; },
    getItem(key: string): string | null {
      const k = String(key);
      if (kept.has(k)) return kept.get(k) as string;
      if (!below || gone.has(k)) return null;
      try { return below.getItem(k); } catch { return null; }
    },
    setItem(key: string, value: string): void {
      const k = String(key);
      const v = String(value);
      gone.delete(k);
      if (below) {
        try { below.setItem(k, v); kept.delete(k); return; } catch { onRefused?.(roomNeeded(below, k, v)); }
      }
      kept.set(k, v);
    },
    removeItem(key: string): void {
      const k = String(key);
      kept.delete(k);
      if (!below) return;
      try { below.removeItem(k); } catch { gone.add(k); }
    },
    clear(): void {
      kept.clear();
      gone.clear();
      if (!below) return;
      try { below.clear(); } catch { below = null; }
    },
  };
  /* Round 1144: what was kept here goes to the store underneath once it has
     room again, and a remove it would not make is asked again. True when
     nothing is left here that the store underneath does not have. */
  const flush = (): boolean => {
    if (!below) return true;
    for (const [k, v] of [...kept]) {
      try { below.setItem(k, v); kept.delete(k); } catch { return false; }
    }
    for (const k of [...gone]) {
      try { below.removeItem(k); gone.delete(k); } catch { return false; }
    }
    return true;
  };
  flushers.set(store as Storage, flush);
  return store as Storage;
}

interface Resolved { storage: Storage; real: Storage | null; blocked: boolean }

function resolve(name: StorageName, onRefused: (need: number) => void): Resolved {
  let real: Storage | null = null;
  try { real = window[name] ?? null; } catch { real = null; }
  if (real) {
    try {
      /* A read, never a write: see the header. */
      real.getItem(PROBE_KEY);
      return { storage: createMemoryStorage(real, onRefused), real, blocked: false };
    } catch { /* it cannot even be read: treat it as blocked */ }
  }
  const memory = createMemoryStorage();
  try {
    Object.defineProperty(window, name, { configurable: true, enumerable: true, get: () => memory });
  } catch { /* window would not take it: everything on the seam still works */ }
  return { storage: memory, real: null, blocked: true };
}

/**
 * A browser that blocks site data refuses the Web Locks API as well. Measured
 * in a real Chromium with the cookie setting on block: every call of
 * navigator.locks.request rejects with "SecurityError: The request was
 * denied." before its callback runs. The auth client takes a lock around
 * every session read, so each page load threw three uncaught errors and the
 * sign in state never finished loading (the home page was two buttons short).
 *
 * A lock keeps two tabs off the same stored session. Under blocked storage
 * each tab has its own stand in and nothing is shared, so there is nothing to
 * guard: when the browser refuses the lock before the callback has run, the
 * callback runs without one. Any other failure, and any error the callback
 * itself throws, passes straight through. Installed only in the blocked case.
 */
function standInForLocks(): void {
  try {
    const locks = window.navigator?.locks;
    if (!locks || typeof locks.request !== 'function') return;
    const native = (locks.request as unknown as (...args: unknown[]) => Promise<unknown>).bind(locks);
    const request = (...args: unknown[]): Promise<unknown> => {
      const callback = args[args.length - 1] as ((lock: unknown) => unknown) | undefined;
      if (typeof callback !== 'function') return native(...args);
      let entered = false;
      const watched = (lock: unknown) => { entered = true; return callback(lock); };
      let asked: Promise<unknown>;
      try { asked = Promise.resolve(native(...args.slice(0, -1), watched)); } catch (error) { asked = Promise.reject(error); }
      return asked.catch((error: unknown) => {
        const refused = !entered && !!error && (error as { name?: string }).name === 'SecurityError';
        if (!refused) throw error;
        return callback({ name: String(args[0]), mode: 'exclusive' });
      });
    };
    Object.defineProperty(locks, 'request', { configurable: true, writable: true, value: request });
  } catch { /* the browser's own stays in place */ }
}

function rawRequested(): boolean {
  try { return window.__DUKB_RAW_STORAGE__ === true; } catch { return false; }
}

/* The control's path reads the browser's own storage with no guard, on
   purpose: under blocked storage this line throws exactly as the app did
   before this round. */
const raw = rawRequested();

/* True from a write this browser refused until recheckStorageWrites() has
   proof that it has room again (Round 1144: it used to stay true for the
   rest of the visit). */
let refusedWrite = false;
/* The most NEW room any write refused since then needed, in characters. */
let refusedNeed = 0;
const troubleListeners = new Set<() => void>();
let tellingListeners = false;
/* Listeners hear about a change a moment later, never inside the call that
   made it: a write can be refused in the middle of a render, and a listener
   that sets state there would be updating one component while another
   renders. One telling per burst of changes. */
function tellListeners(): void {
  if (tellingListeners) return;
  tellingListeners = true;
  void Promise.resolve().then(() => {
    tellingListeners = false;
    for (const listener of [...troubleListeners]) { try { listener(); } catch { /* one listener must not silence the next */ } }
  });
}
function setRefusedWrite(next: boolean): void {
  if (refusedWrite === next) return;
  refusedWrite = next;
  tellListeners();
}
const noteRefusedWrite = (need: number): void => {
  if (need > refusedNeed) refusedNeed = need;
  setRefusedWrite(true);
};

const local: Resolved = raw
  ? { storage: window.localStorage, real: null, blocked: false }
  : resolve('localStorage', noteRefusedWrite);
const session: Resolved = raw
  ? { storage: window.sessionStorage, real: null, blocked: false }
  : resolve('sessionStorage', () => { /* a full session store is not the notice's business */ });
if (local.blocked) standInForLocks();

/** localStorage, or a stand in for the visit when this browser will not keep anything. */
export const safeLocalStorage: Storage = local.storage;
/** sessionStorage, same idea. */
export const safeSessionStorage: Storage = session.storage;

/**
 * Why nothing is being kept in this browser, or null when it is (or when
 * nobody has found out yet: 'full' is only known once a write was refused).
 */
export function getStorageTrouble(): StorageTrouble | null {
  if (local.blocked) return 'blocked';
  return refusedWrite ? 'full' : null;
}

let probedWrites = false;
/**
 * Finds out whether this browser takes a write at all: one write and one
 * remove of a key nothing else uses, at most once a visit. NOT run as this
 * file loads (see the header). The notice asks when a game page opens, which
 * is the only place the answer changes what is on the page.
 */
export function probeStorageWrites(): StorageTrouble | null {
  if (!probedWrites && !raw && local.real) {
    probedWrites = true;
    try {
      local.real.setItem(PROBE_KEY, '1');
      local.real.removeItem(PROBE_KEY);
    } catch { noteRefusedWrite(PROBE_KEY.length + 1); }
  }
  return getStorageTrouble();
}

/* Saves a game could not write and is holding in the open page (see the header). */
const pendingSaves = new Set<() => boolean>();

/**
 * Round 1144: asks again, but only while the seam already says the storage
 * is full, and it is the one place 'full' is taken back (see the header for
 * why a write the browser took is not enough). Nothing is asked while a game
 * holds a refused save. Otherwise: one write and one remove of the probe
 * key, padded to the room the largest refused write needed, then whatever
 * the seam kept for the visit. When the browser takes all of it, 'full' is
 * taken back. In a browser that stores normally (and in the blocked case,
 * and under the raw switch) this does nothing at all, so the once a visit
 * rule of probeStorageWrites() is not this function's to break.
 */
export function recheckStorageWrites(): StorageTrouble | null {
  if (refusedWrite && !raw && local.real) {
    if (pendingSaves.size > 0) return getStorageTrouble();
    try {
      local.real.setItem(PROBE_KEY, '1'.repeat(Math.max(1, refusedNeed - PROBE_KEY.length)));
      local.real.removeItem(PROBE_KEY);
      if (flushers.get(local.storage)?.() !== false) {
        refusedNeed = 0;
        setRefusedWrite(false);
      }
    } catch { /* still full */ }
  }
  return getStorageTrouble();
}

/** Calls the listener a moment after getStorageTrouble() starts answering differently. Returns the way to stop. */
export function subscribeStorageTrouble(listener: () => void): () => void {
  troubleListeners.add(listener);
  return () => { troubleListeners.delete(listener); };
}

/**
 * Round 1144: a game with a save the browser refused names it here for as
 * long as it waits. `retry` writes it once more and answers true when
 * nothing of it is left unsaved. Returns the way to take the name back
 * (the save went through, or the game was left).
 */
export function holdPendingSave(retry: () => boolean): () => void {
  pendingSaves.add(retry);
  return () => { pendingSaves.delete(retry); };
}

/**
 * Before the app reloads the page on its own account: every waiting save is
 * retried once. True when none is left waiting, so a reload loses nothing.
 * False means a save is still refused and the page has to stay. Under the
 * raw switch nothing is held, which is the app as it was before this round.
 */
export function settlePendingSaves(): boolean {
  if (raw) return true;
  let settled = true;
  for (const retry of [...pendingSaves]) {
    let saved = false;
    try { saved = retry(); } catch { saved = false; }
    if (!saved) settled = false;
  }
  return settled;
}

/**
 * True when sessionStorage will not outlive a reload of this page, which is
 * the blocked case: the stand in dies with the page. A "reload once" marker
 * written there is gone the moment the reload happens, so anything that
 * reloads on its own must not, or it reloads for ever (src/lib/freshBuild.ts
 * reads this). A session store that is merely full keeps what it has and
 * refuses the marker, and freshBuild already stands down on that refusal.
 */
export const sessionStorageIsMemory: boolean = session.blocked;

/**
 * A write that must not take the page down with it, and says whether it was
 * kept. Twenty nine call sites wrote with no guard at all, most of them a
 * "rules seen" flag set in a mount effect, and with storage full that one line
 * threw and the whole route fell to "This page broke" (measured on /footle
 * and /build-your-xi, and on eleven more routes with the same line). It writes to the
 * browser's storage exactly as before, which in the blocked case is the stand
 * in above. It does NOT go through the full case's stand in: every reader of
 * those keys still reads the browser's own storage, and a write they could
 * not read back would be worse than one that was skipped.
 */
export function safeSetItem(key: string, value: string): boolean {
  /* The bare global on purpose, not window.localStorage: it is the same thing
     in a browser, and it is what the line this replaced said, so a harness
     that runs a hook under node with its own localStorage still sees the
     write. */
  /* The control again: the write as it was before this round, guard and all gone. */
  if (raw) {
    localStorage.setItem(key, value);
    return true;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    /* a refused write is how the full case is learned (see the header) */
    let need = key.length + value.length;
    try { need = roomNeeded(localStorage, key, value); } catch { /* no storage to ask: all of it */ }
    noteRefusedWrite(need);
    return false;
  }
}
