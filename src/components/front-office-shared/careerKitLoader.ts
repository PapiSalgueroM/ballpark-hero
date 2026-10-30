/**
 * Round 1559: the one door to a Front Office board's career kit, for every sport. Round 1550 wrote it for the NFL
 * (nflCareerKitLoad.ts) with the NFL's import inside; the import is the only sport fact, so a sport hands it in and
 * keeps its literal `import('./xCareerKit')` in its own loader file (scripts/simFoLazyDesk.mjs reads that dynamic
 * edge by file).
 *
 * The kit is fetched once per page and kept for the rest of it, so a board mounted later (a test, a reload of the
 * component) reads it at once. A fetch that fails is forgotten, so the next ask tries again.
 *
 * A LEAF: this file imports nothing, so a sport's loader may call makeCareerKitLoader at its module scope (the same
 * reason the boards' lazyPart is a module level call, FrontOfficeBoard.tsx): nothing imported is evaluated there.
 */
export interface CareerKitLoader<K> {
  /** The kit when it has arrived, else null. */
  now(): K | null;
  /** Where the kit stands: never asked for, on its way, or here. */
  state(): 'idle' | 'loading' | 'ready';
  /** Ask for the kit. Every caller shares one fetch; a failed one can be asked for again. */
  load(): Promise<K>;
}

export function makeCareerKitLoader<K>(importer: () => Promise<K>): CareerKitLoader<K> {
  let kit: K | null = null;
  let pending: Promise<K> | null = null;
  return {
    now: () => kit,
    state: () => (kit ? 'ready' : pending ? 'loading' : 'idle'),
    load() {
      if (kit) return Promise.resolve(kit);
      if (!pending) {
        pending = importer().then(
          m => { kit = m; return m; },
          e => { pending = null; throw e; },
        );
      }
      return pending;
    },
  };
}

/** The moments a board is in, for careerKitNeeded. */
export interface CareerKitMoment {
  /** The board's phase: 'pick', 'hub', 'draft', 'recap', 'fired'. */
  phase: string;
  /** A press conference is waiting for an answer. */
  presser: boolean;
  /** A career box (Job market, Career, GM level) is open. */
  boxOpen: boolean;
  /** The league is on its last regular season period (the press that closes the season needs the verdict). */
  lastPeriod: boolean;
}

/**
 * When a board asks for its kit (Round 1550's rule, the NFL board's kitNeeded with the kit's own absence taken
 * out): the recap and the fired screen, a press conference to answer, a career box opened, and the last period of
 * the season on the hub. A season being played, the draft and the pick screen never ask. Pure, so one table holds
 * it (src/lib/gmCareerRules.test.ts holds it equal to the NFL board's expression until that board calls it).
 */
export function careerKitNeeded(m: CareerKitMoment): boolean {
  return m.phase === 'recap' || m.phase === 'fired' || m.presser || m.boxOpen || (m.phase === 'hub' && m.lastPeriod);
}
