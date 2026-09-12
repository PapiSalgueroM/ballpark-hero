/**
 * Round 535 narrowed this shape. The pool used to carry five career totals
 * per player. Two of them, career assists and career trophies, were dropped
 * because no publisher prints them: nobody records a footballer's career
 * assist total (there is no such figure at all for a career that ended before
 * the 1990s), and "trophies won" has no agreed definition, so every published
 * count is somebody's house rule rather than a fact.
 * See the header of src/data/higherLowerPlayers.ts.
 */
export type HigherLowerStatKey = 'appearances' | 'goals' | 'internationalCaps';

export interface HigherLowerPlayer {
  name: string;
  nationality: string;
  isIcon: boolean;
  stats: Record<HigherLowerStatKey, number>;
}
