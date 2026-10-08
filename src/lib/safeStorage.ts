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
 * A Storage shaped store that lives for the visit. Given the browser's own
 * storage as `under`, reads fall through to it, a write tries it first and is
 * kept here only when it refuses (and `onRefused` hears about it), and a
 * remove reaches it too. While the browser takes every write this keeps
 * nothing and is a plain pass through.
 */
export function createMemoryStorage(under: Storage | null = null, onRefused?: () => void): Storage {
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
        try { below.setItem(k, v); kept.delete(k); return; } catch { onRefused?.(); }
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
  return store as Storage;
}

interface Resolved { storage: Storage; real: Storage | null; blocked: boolean }

function resolve(name: StorageName, onRefused: () => void): Resolved {
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

/* True from the first write this browser refused on this visit. */
let refusedWrite = false;
const noteRefusedWrite = (): void => { refusedWrite = true; };

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
    } catch { refusedWrite = true; }
  }
  return getStorageTrouble();
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
    refusedWrite = true;
    return false;
  }
}
