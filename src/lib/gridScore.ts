/**
 * Round 646: what a grid daily pays, one rule for all seven grids (soccer,
 * football, college, NBA, MLB, NHL and college basketball).
 *
 * The board is three rows by three columns, and every cell filled with a right
 * answer pays the same flat amount.
 */
export const GRID_CELLS = 3 * 3;
export const GRID_CELL_POINTS = 100;

/**
 * The most a grid daily can record: all nine cells filled, 9 x 100 = 900.
 * game_score_caps holds it for every *-grid key
 * (scripts/simCapsAreCeilings.mjs).
 */
export const GRID_CEILING = GRID_CELLS * GRID_CELL_POINTS;
