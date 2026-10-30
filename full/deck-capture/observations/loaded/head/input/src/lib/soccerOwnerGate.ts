/* ─── Round 1524: the gate to Soccer Career's club owner tail ───

   The owner tail (src/lib/soccerCareerOwner.ts: the clubs for sale, the
   season on the dugout's table, the four calls) is one lazy chunk with its
   screens (src/components/soccer-career/OwnerTail.tsx), because only a career
   that retires with €200M ever opens it and /soccer-career's first download
   is the site's most watched weight. This file is the only thing the engine
   imports of it, and it imports nothing at runtime: types only, plus one
   dynamic import with a literal specifier.

   Until loadOwnerTail() has landed the module the engine buys nothing and
   plays no owner season (both return the career unchanged); the page awaits
   the load before either, the way it awaits the manager market. The loader
   is the deck gate's (src/lib/soccerDeckGate.ts): one promise for every
   caller, and a load that rejects or resolves without the module in it (a
   cancelled vite:preloadError resolves empty) clears itself so a retry works. */
type OwnerTailModule = typeof import('./soccerCareerOwner');

let OWNER: OwnerTailModule | null = null;
let OWNER_INFLIGHT: Promise<void> | null = null;

/** True once the owner tail is in memory. */
export function ownerTailReady(): boolean { return OWNER !== null; }

/** The owner tail, or null while it is not loaded. */
export function ownerTail(): OwnerTailModule | null { return OWNER; }

/** Pull the owner tail in. Safe to call any number of times. */
export function loadOwnerTail(): Promise<void> {
  if (OWNER) return Promise.resolve();
  if (!OWNER_INFLIGHT) {
    const inflight: Promise<void> = import('./soccerCareerOwner').then(m => {
      const mod = m as Partial<OwnerTailModule> | null | undefined;
      if (!mod || typeof mod.ownerBuy !== 'function' || typeof mod.ownerSeason !== 'function') {
        throw new Error('owner tail missing');
      }
      OWNER = mod as OwnerTailModule;
    }).catch(e => { if (OWNER_INFLIGHT === inflight) OWNER_INFLIGHT = null; throw e; });
    OWNER_INFLIGHT = inflight;
  }
  return OWNER_INFLIGHT;
}
