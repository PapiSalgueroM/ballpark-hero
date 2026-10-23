/**
 * Round 1550: the one door to the NFL career kit (nflCareerKit.ts, which says when the board asks for it).
 *
 * The kit is fetched once per page and kept for the rest of it, so a board mounted later (a test, a reload of the
 * component) reads it at once. A fetch that fails is forgotten, so the next ask tries again; a chunk that will
 * not load is also handled site wide (the vite:preloadError listener reloads once, and the save is in
 * localStorage).
 *
 * Never imported by value from the kit: only its type, so this file stays in the page and the kit stays out.
 */
export type NflCareerKit = typeof import('./nflCareerKit');

let kit: NflCareerKit | null = null;
let pending: Promise<NflCareerKit> | null = null;

/** The kit when it has arrived, else null. */
export function nflCareerKitNow(): NflCareerKit | null {
  return kit;
}

/** Where the kit stands: never asked for, on its way, or here. Read by the board's tests. */
export function nflCareerKitState(): 'idle' | 'loading' | 'ready' {
  return kit ? 'ready' : pending ? 'loading' : 'idle';
}

/** Ask for the kit. Every caller shares one fetch; a failed one can be asked for again. */
export function loadNflCareerKit(): Promise<NflCareerKit> {
  if (kit) return Promise.resolve(kit);
  if (!pending) {
    pending = import('./nflCareerKit').then(
      m => { kit = m; return m; },
      e => { pending = null; throw e; },
    );
  }
  return pending;
}
