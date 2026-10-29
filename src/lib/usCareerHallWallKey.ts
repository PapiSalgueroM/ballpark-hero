/**
 * Round 1570: the two pieces of the Hall wall the shared US career board needs on its first frame, apart from
 * the rest of the wall (src/lib/usCareerHallWall.ts), which the board loads only when there is a wall to read or
 * a retired career to put up. Measured on one runner (r1570-s5a), the whole wall loaded with the board cost every
 * US career route 2.02K of gzipped JavaScript, over the 2K the lead allowed; this split is the lazy fallback.
 *
 * Imports no sport and no storage: the board loads it on all four routes.
 */
import type { HallSportId, UsHallSport } from '@/lib/careerHallOfFame';
import type { UsCareerCore } from '@/lib/usCareerSport';

export const hallWallKey = (slug: HallSportId): string => `${slug}-my-career-hall-v1`;

/** The career's identity on the wall: the ballot's own key, the salt that tells two same named careers apart,
 *  and the season and game counts that tell two old saves without a salt apart. Nothing in it changes after
 *  retirement, so a speech or a coaching career never makes a second plaque. */
export function wallKeyOf<C extends UsCareerCore>(c: C, hall: UsHallSport<C>): string {
  const games = c.seasons.reduce((n, s) => n + (Number.isFinite(s.games) ? s.games : 0), 0);
  return `${hall.key(c)}|${c.summerSalt ?? ''}|${c.seasons.length}|${games}`;
}
