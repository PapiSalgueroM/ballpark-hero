/* Round 1221: the keyed shuffle, moved out of src/lib/season/core.ts with its
   body unchanged, so a score law (src/lib/gameLaws) can lay a drive list out
   without importing the season core. The core imports it back and still
   exports it, so every reader of the core's `shuffled` reads this one body.

   This file imports NOTHING, so it can sit in any chunk. */

/** A keyed Fisher-Yates shuffle (a copy). */
export function shuffled<T>(xs: readonly T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
