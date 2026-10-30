/* Round 1146: the own goal rule, in one place for every soccer game.

   Round 1167 gave the Soccer Career Season Centre own goals: a goal the
   season already had is, now and then, RE-LABELLED as an own goal. Nothing
   is added to a score and nothing is drawn from the stream the results come
   from: the question "is this goal an own goal?" is answered by a roll keyed
   on the goal itself, so the same goal always gets the same answer, on any
   machine, whatever else has been drawn since.

   Club Manager got the same ask (a player's report, 2026-10-09), and it is
   the same rule: a keyed tag on a goal the match already had, then a second
   keyed roll for who put it in. So the two rolls live here and both games
   read them. What differs is each game's own binding and nothing else:

     - the Season Centre keys a goal by its season, matchday, minute, side
       and place in the minute, and spreads the role over eleven men (one of
       them is the player himself);
     - Club Manager has real squads on both sides, so its role roll picks a
       named defender or the keeper of the side that conceded, out of the
       men on the pitch at that minute (see tagOwnGoals in clubManager.ts).

   The odds are the binding's too. The Season Centre's one in 64 is its own
   provisional game number (Round 1167 says so where it is used). Club
   Manager passes one in 32, about the three in a hundred the real game runs
   at, because its scorer tables sit beside real ones.

   Imports only the keyed generator. No Math.random here, ever: a draw from
   the ambient stream would move every result that follows it. */
import { keyedRng } from './keyedRng';

/** The Season Centre's odds: one eligible goal in this many is an own goal. */
export const OWN_GOAL_ONE_IN = 64;

/** Is the goal behind `key` an own goal, at one in `oneIn`? One keyed roll: the same key always answers the same. */
export function ownGoalTagged(key: string, oneIn: number = OWN_GOAL_ONE_IN): boolean {
  if (keyedRng(`${key}|tag`)() >= 1 / oneIn) return false;
  return true;
}

/** Who put it in, as one of `roles` equally likely places, 0 to roles - 1. A second keyed roll, apart from the tag's. */
export function ownGoalRole(key: string, roles: number): number {
  return Math.floor(keyedRng(`${key}|role`)() * roles);
}
