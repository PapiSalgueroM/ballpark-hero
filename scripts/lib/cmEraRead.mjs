/**
 * Round 1600 (Proposal 4): what Club Manager shows for a past season's file row, written out for the era harnesses
 * in the order the engine must keep (critic correction 2 of the ratings design): the season's stretch first, which
 * is the man's LEVEL (eraUpliftRating), then Round 1214's points for his age on that season's own top, at the
 * file's age plus ERA_RATING_AGE_SHIFT (the files hold the 1 January age). The stretch and the top are read off the
 * engine's own eras module (ER, the harness's bundle); the read is the library's. So a harness that holds a squad
 * to this holds the engine to the order, and Round 1214's mutation `pointsfirst` (the points under the stretch)
 * turns it red.
 */
import { ageRead } from './cmValueCurve.mjs';
import { ERA_RATING_AGE_SHIFT } from './cmAges.mjs';

export function eraShown(ER, era, row) {
  return ageRead(ER.eraUpliftRating(era, row.r), row.a + ERA_RATING_AGE_SHIFT, ER.eraTop(era));
}

/** A row's level as the engine hands it (eraRosters keeps it as lv where the shown rating differs). */
export const eraLevel = row => row.lv ?? row.r;
