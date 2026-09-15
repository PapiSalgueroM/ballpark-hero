/**
 * Round 585: the gem ledger for React. Reads only; every write goes through
 * src/lib/tycoonRewards.ts, which tells this store when the ledger changed.
 */
import { useSyncExternalStore } from 'react';
import { loadLedger, subscribeLedger, newLedger } from '@/lib/tycoonRewards';
import type { RewardsLedger } from '@/lib/tycoonRewards';

/* One constant for the prerender, so a snapshot never carries a visitor's gems. */
const SERVER_LEDGER: RewardsLedger = newLedger();
const serverSnapshot = () => SERVER_LEDGER;

export function useTycoonRewards(): RewardsLedger {
  return useSyncExternalStore(subscribeLedger, loadLedger, serverSnapshot);
}
