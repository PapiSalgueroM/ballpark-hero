import { useSyncExternalStore } from 'react';

/**
 * Round 679: what the ledger (src/lib/playLedger.ts) decided about the last
 * finish on this page, for the shared result note to read.
 *
 * A finish is ranked (the day's one ranked result for that game) or practice,
 * and practice carries a reason: the door's own words for a signed in player
 * (docs/design/POINTS-ECONOMY-V2.md section 6, the answers Round 677's
 * record_play gives), the browser's run record for a guest, or 'free' for a
 * free run. src/components/game/UnrankedNote.tsx turns the reason into the
 * line section 11 writes for it.
 *
 * Kept apart from the ledger so the note does not pull the database client
 * into every card: this module imports React and nothing else. The outcome is
 * scoped to the page it was recorded on, so a finish on one game never labels
 * another game's card after a navigation.
 */
export interface LedgerOutcome {
  /** The completion key the finish was recorded under. */
  game: string;
  /** The page it was recorded on. */
  path: string;
  ranked: boolean;
  /** Why it was not ranked, or null. */
  reason: string | null;
}

const EVENT = 'dukb-ledger-outcome';
let latest: LedgerOutcome | null = null;

function here(): string {
  try { return typeof window !== 'undefined' && window.location ? window.location.pathname : ''; } catch { return ''; }
}

/** The ledger's one writer of outcomes. */
export function publishOutcome(game: string, ranked: boolean, reason: string | null = null): void {
  latest = { game, path: here(), ranked, reason };
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* SSR or a harness without window */ }
}

/** The last outcome, when it was recorded on the page showing now. */
export function outcomeHere(): LedgerOutcome | null {
  return latest && latest.path === here() ? latest : null;
}

function subscribe(onChange: () => void): () => void {
  try {
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  } catch {
    return () => undefined;
  }
}

/** The last outcome on this page, re-rendering when a new one lands. */
export function useLedgerOutcome(): LedgerOutcome | null {
  return useSyncExternalStore(subscribe, outcomeHere, () => null);
}

/** Test seam: forget the last outcome. */
export function resetLedgerOutcomeForTests(): void {
  latest = null;
}
