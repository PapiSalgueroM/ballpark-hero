/**
 * Round 646: the Connections score, one rule for all five sports.
 *
 * A solved daily pays for the lives left: four to start, one gone for every
 * wrong group. The five hooks (soccer, baseball, NBA, NFL, NHL) read these
 * rather than each writing 4 and 250 inline.
 */
export const CONNECTIONS_LIVES = 4;
export const CONNECTIONS_POINTS_PER_LIFE = 250;

/**
 * The most a Connections daily can record: solved without a wrong group, all
 * four lives left, 4 x 250 = 1000. game_score_caps holds it for every
 * *connections key (scripts/simCapsAreCeilings.mjs).
 */
export const CONNECTIONS_CEILING = CONNECTIONS_LIVES * CONNECTIONS_POINTS_PER_LIFE;
