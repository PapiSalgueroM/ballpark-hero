/**
 * Round 646: what a grid daily pays, one rule for all seven grids (soccer,
 * football, college, NBA, MLB, NHL and college basketball).
 *
 * The board is three rows by three columns, and every cell filled with a right
 * answer pays the same flat amount. The seven recorders call gridScore.
 */
export const GRID_CELLS = 3 * 3;
export const GRID_CELL_POINTS = 100;

/** What a finished grid records: the cells filled with a right answer. */
export function gridScore(cellsRight: number): number {
  return cellsRight * GRID_CELL_POINTS;
}

/**
 * The most a grid daily can record: all nine cells filled, through the rule
 * above: 900. game_score_caps holds it for every *-grid key
 * (scripts/simCapsAreCeilings.mjs).
 */
export const GRID_CEILING = gridScore(GRID_CELLS);
