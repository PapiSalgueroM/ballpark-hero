/* Round 1046: where every row of a ranked list stood before, for any list
   that is drawn twice (a league table after two matchdays, a group, a
   leaderboard). Pure, and it imports nothing: the caller hands in two whole
   TRUE orders, and nothing here guesses a place in between.

   src/components/motion/RankShiftTable.tsx is the part that moves rows with
   it; a sport or a game binds that part and never this file's caller. */

/** One key's move. Places are 0 based; `from` is -1 when the key was not in the old order. */
export interface RankMove { club: string; from: number; to: number }

/** Where every key of `after` stood in `before`, in `after`'s order. */
export function rankShift(before: readonly string[], after: readonly string[]): RankMove[] {
  const was = new Map<string, number>();
  before.forEach((key, i) => { if (!was.has(key)) was.set(key, i); });
  return after.map((club, to) => ({ club, from: was.get(club) ?? -1, to }));
}
