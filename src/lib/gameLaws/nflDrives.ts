/* Round 1542: the DRIVE ARITHMETIC of the NFL's story law, moved here out of
   ./nfl.ts with every body unchanged (MAX_FG, NflDrives, driveOptions,
   nflDriveCost, nflDrives). That file imports them back and still exports
   every name it exported before, and its story (NFL_STORY_LAW.events) makes
   the same two calls on the same stream through nflDrivePair below.

   Why it moved: the NFL Front Office's press now credits each touchdown of a
   told final to a man (src/lib/nflSeasonStats.ts), so it has to split that
   final into scoring drives exactly as the Game Day tile does. The story
   (the minutes, the clock, every sentence) stays in ./nfl.ts and rides with a
   card alone: scripts/simGmGameDay.mjs section 6 keeps any board from
   reaching it. This file is arithmetic and nothing else, so it can sit in a
   board's chunk.

   Today the drive COUNTS are a pure function of the score: for every score a
   front office can tell, the cheapest list is the only one, so the first draw
   of nflDrives always picks from a list of one and the stream only orders the
   sixes, sevens and eights. The press still asks on the story's own stream
   (src/lib/gmGameScore.ts, gmStoryKey) so a later rule with ties keeps the
   press and the tile in step.

   It imports ../keyedShuffle and types, nothing else. No React, no
   Math.random. */
import { shuffled } from '../keyedShuffle';
import type { Rng } from './types';

/** The most field goals one side is given in a game. */
export const MAX_FG = 6;

/** The scoring drives of one side: touchdowns worth 6, 7 or 8, field goals, safeties. */
export interface NflDrives { tds: number[]; fgs: number; safeties: number }

/** How far a list is from plain football: every touchdown that is not a
 *  seven costs one, a safety four. */
function driveOptions(points: number, minTd: number, exactFg: number | null): { t: number; f: number; s: number; cost: number }[] {
  const out: { t: number; f: number; s: number; cost: number }[] = [];
  if (!Number.isInteger(points) || points < 0 || minTd < 0) return out;
  for (let s = 0; s <= 1; s += 1) {
    for (let f = exactFg ?? 0; f <= (exactFg ?? MAX_FG); f += 1) {
      const rest = points - 3 * f - 2 * s;
      if (rest < 0) break;
      for (let t = minTd; 6 * t <= rest; t += 1) {
        if (rest > 8 * t) continue;
        out.push({ t, f, s, cost: Math.abs(rest - 7 * t) + 4 * s });
      }
    }
  }
  return out;
}

/** The least a drive list for that score strays from sevens and threes; null: no list makes it. */
export function nflDriveCost(points: number, minTd: number, exactFg: number | null): number | null {
  const opts = driveOptions(points, minTd, exactFg);
  return opts.length ? Math.min(...opts.map(o => o.cost)) : null;
}

/** The scoring drives of one side that make `points`, with at least `minTd`
 *  touchdowns (his) and, for a kicker's own side, exactly `exactFg` field
 *  goals. Sevens and threes first; a 6 (the kick after is missed), an 8 (a
 *  two point try) and at most one safety only when the sum needs it. Every
 *  whole number has a list except 1 and 4; null when there is none. */
export function nflDrives(points: number, minTd: number, exactFg: number | null, rng: Rng): NflDrives | null {
  const opts = driveOptions(points, minTd, exactFg);
  const u = rng();
  if (opts.length === 0) return null;
  const least = Math.min(...opts.map(o => o.cost));
  const best = opts.filter(o => o.cost === least);
  const pick = best[Math.floor(u * best.length)];
  const off = points - 3 * pick.f - 2 * pick.s - 7 * pick.t;
  const tds = shuffled(Array.from({ length: pick.t }, (_, i) => (i < Math.abs(off) ? 7 + Math.sign(off) : 7)), rng);
  return { tds, fgs: pick.f, safeties: pick.s };
}

/** Both sides' drive lists of a told final, the home side first, on one
 *  stream: the first two calls the NFL's story makes, in the same order and
 *  both always made. Null when either side has no list. */
export function nflDrivePair(home: number, away: number, rng: Rng): [NflDrives, NflDrives] | null {
  const us = nflDrives(home, 0, null, rng);
  const them = nflDrives(away, 0, null, rng);
  return us && them ? [us, them] : null;
}
