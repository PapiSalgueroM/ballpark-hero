/* Round 1221: the NFL's score law, moved here from src/lib/season/nfl.ts
   (Round 1147) with every body unchanged, so a game that is not the Season
   Center can play the same law. src/lib/season/nfl.ts imports it back and
   still exports `nflScore`, and scripts/simUsSeasonCentre.mjs holds the move
   to the byte (its digest mode and scripts/data/usSeasonLawDigest.json).

   Real and two sourced: what a scoring play is worth. The 7 and the 3 below
   are the ledger's NFL_SCORING (src/data/usLeagueShape.ts);
   src/test/usSeasonNfl.test.ts and src/test/gameLawNfl.test.ts hold the two
   together. THIS SIM'S OWN: ten drives a side, how often a drive scores, the
   cap on touchdowns, how a level game is broken, and the scale that turns a
   share of wins into an edge.

   This is the SCORE half of the law (./types.ts says why there are two) and
   it imports nothing but types, so it can sit in any chunk. */
import type { Rng, ScoreLaw } from './types';

/** The drives a side has in a game, and the most of them that may end in a
 *  touchdown (nine sevens and a field goal are 66, and the three a level
 *  game adds keeps a side at 69 or under: never past the cap). */
export const DRIVES = 10;
const MAX_TD = 9;
/** A drive ends in a touchdown 26 times in 100 at even strength (2.6 a game)
 *  and in a field goal about 14 (1.445 a game): 22.5 points a team game. */
export const TD_A_GAME = 2.6;
export const FG_A_DRIVE = 0.1445;

/** [his side, the other side] for a side `edge` stronger. Each side has ten
 *  drives; a drive ends in a touchdown (seven), a field goal (three) or
 *  nothing, so a side's score scatters like a football score does (a Poisson
 *  count of touchdowns gives a side seven of them about four times as often
 *  at even strength: 1.7% against 0.45%). A lone
 *  field goal becomes two (so no repair of the core's can make a 4, which no
 *  drive list can), and the law itself never returns a level game. */
export function nflScore(edge: number, home: boolean, rng: Rng): [number, number] {
  const venue = home ? 1 : -1;
  const side = (e: number) => {
    const p = Math.min(0.6, Math.max(0.06, (TD_A_GAME + 0.05 * e) / DRIVES));
    let td = 0;
    let fg = 0;
    for (let i = 0; i < DRIVES; i += 1) {
      const u = rng();
      if (u < p) { if (td < MAX_TD) td += 1; } else if (u < p + FG_A_DRIVE) fg += 1;
    }
    const pts = 7 * td + 3 * fg;
    return pts === 3 ? 6 : pts;
  };
  let us = side(edge + venue);
  let them = side(-edge - venue);
  if (us === them) {
    const more = us === 0 ? 7 : 3;
    if (home) us += more; else them += more;
  }
  return [us, them];
}

/** The edge at which a side wins that share of its games against level
 *  opposition. A game's margin has a standard deviation of about 13.4 points
 *  under the ten drive law and a unit of edge is worth 0.7 of a point, so a
 *  logistic of 11.3 a unit lands the share of wins (held by the repairs and
 *  the median records scripts/simUsSeasonCentre.mjs measures). */
export function nflEdgeForShare(share: number): number {
  const p = Math.min(0.98, Math.max(0.02, share));
  return 11.3 * Math.log(p / (1 - p));
}

/** The law as a game outside the Season Center plays it. `nflScore` gives the
 *  home side one unit of edge for the venue, and `nflEdgeForShare` already is
 *  the whole gap for that share of wins, so the unit comes off first. */
export const NFL_SCORE_LAW: ScoreLaw = {
  id: 'nfl',
  score: (pHome, rng) => nflScore(nflEdgeForShare(pHome) - 1, true, rng),
};
