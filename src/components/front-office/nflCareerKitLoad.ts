/**
 * Round 1550: the one door to the NFL career kit (nflCareerKit.ts, which says when the board asks for it).
 *
 * The kit is fetched once per page and kept for the rest of it, so a board mounted later (a test, a reload of the
 * component) reads it at once. A fetch that fails is forgotten, so the next ask tries again; a chunk that will
 * not load is also handled site wide (the vite:preloadError listener reloads once, and the save is in
 * localStorage).
 *
 * Never imported by value from the kit: only its type, so this file stays in the page and the kit stays out.
 *
 * Round 1559: the fetch once rule is every sport's (careerKitLoader.ts, a leaf with no imports, so the module level
 * call below evaluates nothing imported). The NFL's three names stay, and the literal import of the kit stays in
 * this file.
 */
import { makeCareerKitLoader } from '@/components/front-office-shared/careerKitLoader';

export type NflCareerKit = typeof import('./nflCareerKit');

/** Round 1561: the loader itself, for the shared hook (useGmCareerKit.ts) the board calls. */
export const nflCareerKitLoader = makeCareerKitLoader<NflCareerKit>(() => import('./nflCareerKit'));

/** The kit when it has arrived, else null. */
export function nflCareerKitNow(): NflCareerKit | null {
  return nflCareerKitLoader.now();
}

/** Where the kit stands: never asked for, on its way, or here. Read by the board's tests. */
export function nflCareerKitState(): 'idle' | 'loading' | 'ready' {
  return nflCareerKitLoader.state();
}

/** Ask for the kit. Every caller shares one fetch; a failed one can be asked for again. */
export function loadNflCareerKit(): Promise<NflCareerKit> {
  return nflCareerKitLoader.load();
}
