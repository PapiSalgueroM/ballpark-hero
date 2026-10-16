/* ─── Round 1334: the gate to Soccer Career's lazy deck ────────────────────

   The soccer deck (src/lib/soccerDeck.ts with src/data/soccerDeck/* and the
   shared deck src/lib/gmInbox.ts) is one lazy chunk. This file is the only
   thing the engine and the page import of it, and it imports nothing at
   runtime: types only, plus one dynamic import with a literal specifier, so
   nothing of the deck rides in /soccer-career's first download.

   Until loadSoccerDeck() has landed the module, both questions answer []:
   soccerDeckSlot deals no card and soccerDeckPending adds nothing to the
   catalog, so the engine plays exactly the game it played before this round.
   Nothing calls loadSoccerDeck in this round but the deck's own tests and
   harnesses (Round 1504 makes the page fetch it).

   The loader is the engine's manager market pattern (loadManagerMarket: one
   promise for every caller, a failed load clears itself so a retry works),
   with one change the site's reload rule needs: src/lib/freshBuild.ts cancels
   a failed chunk's vite:preloadError, which makes the dynamic import RESOLVE
   with nothing in it. So the gate keeps the module only when it holds the
   deck's two functions; anything else is a failed load (not ready, the slot
   [], the promise rejects and clears so a retry can land it). */
import type { CareerState, RandomEvent } from './soccerCareerEngine';

type SoccerDeckModule = typeof import('./soccerDeck');

/** The deck's ids, 700 to 999 (600 to 699 are the other lane's routines). */
export function isSoccerDeckId(id: unknown): boolean {
  return typeof id === 'number' && Number.isInteger(id) && id >= 700 && id <= 999;
}

const fetchDeck = (): Promise<unknown> => import('./soccerDeck');
let loader: () => Promise<unknown> = fetchDeck;
let DECK: SoccerDeckModule | null = null;
let DECK_INFLIGHT: Promise<void> | null = null;
/* Bumped by the tests' seam, so a load still in flight when the seam resets
   can never write the deck or clear a newer load afterwards. */
let LOAD_GEN = 0;

/** True once the deck is in memory and its cards can be dealt and answered. */
export function soccerDeckReady(): boolean { return DECK !== null; }

/**
 * Pull the deck in. Safe to call any number of times: the second call gets
 * the same promise. A load that rejects, or resolves without the deck in it,
 * rejects here, leaves the deck not ready and clears itself so a retry works.
 */
export function loadSoccerDeck(): Promise<void> {
  if (DECK) return Promise.resolve();
  if (!DECK_INFLIGHT) {
    const gen = LOAD_GEN;
    const inflight: Promise<void> = loader().then(m => {
      const mod = m as Partial<SoccerDeckModule> | null | undefined;
      if (!mod || typeof mod.dealSoccerDeck !== 'function' || typeof mod.pendingSoccerDeck !== 'function') {
        throw new Error('soccer deck: the chunk loaded without the deck in it');
      }
      if (gen === LOAD_GEN) DECK = mod as SoccerDeckModule;
    }).catch(e => { if (DECK_INFLIGHT === inflight) DECK_INFLIGHT = null; throw e; });
    DECK_INFLIGHT = inflight;
  }
  return DECK_INFLIGHT;
}

/** The deck cards pending in a saved batch (for applyEventChoice's catalog
 *  lookup), or [] while the deck is not loaded. */
export function soccerDeckPending(state: CareerState): RandomEvent[] {
  return DECK ? DECK.pendingSoccerDeck(state) : [];
}

/** At most one deck card for this summer, or [] while the deck is not loaded. */
export function soccerDeckSlot(state: CareerState, season: number, key: string, taken: readonly RandomEvent[]): RandomEvent[] {
  return DECK ? DECK.dealSoccerDeck(state, season, key, taken) : [];
}

/** The tests' seam: hand in another loader (none puts the real import back)
 *  and forget any deck already loaded. */
export function setSoccerDeckLoader(next?: () => Promise<unknown>): void {
  loader = next ?? fetchDeck;
  LOAD_GEN += 1;
  DECK = null;
  DECK_INFLIGHT = null;
}
