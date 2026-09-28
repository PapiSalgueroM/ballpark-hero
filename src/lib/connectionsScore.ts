/**
 * Round 646: the Connections score, one rule for all five sports.
 *
 * A solved daily pays for the lives left: four to start, one gone for every
 * wrong group. The five hooks (soccer, baseball, NBA, NFL, NHL) record through
 * connectionsScore rather than each writing 4 and 250 inline.
 */
export const CONNECTIONS_LIVES = 4;
export const CONNECTIONS_POINTS_PER_LIFE = 250;

/** What a finished daily records: the lives left times the points a life is
    worth when it was solved, and 0 when it was not. */
export function connectionsScore(won: boolean, livesLeft: number): number {
  return won ? livesLeft * CONNECTIONS_POINTS_PER_LIFE : 0;
}

/**
 * The most a Connections daily can record: solved without a wrong group, all
 * four lives left, through the rule above: 1000. game_score_caps holds it for
 * every *connections key (scripts/simCapsAreCeilings.mjs).
 */
export const CONNECTIONS_CEILING = connectionsScore(true, CONNECTIONS_LIVES);
