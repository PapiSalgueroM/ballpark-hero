import { saveFence } from "@/lib/saveFence";

export const SAVE_KEY = "soccerCareerSave";

export function adoptSoccerCareerSave(saveKey = SAVE_KEY): string | null {
  /* Round 1330: one tab wins (src/lib/saveFence.ts). Adopt the save's
     generation BEFORE it is read, so a write another tab lands between the
     two leaves this page stale, never the other one. Never released: nothing
     on this page writes the save once the page has gone, and the next mount
     adopts again before it reads, while a release would turn a later write
     of a remounted or retried tree into an unchecked claim. */
  saveFence.adopt(saveKey);
  try { return localStorage.getItem(saveKey); } catch { return null; }
}
