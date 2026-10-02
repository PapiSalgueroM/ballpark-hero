import { HIGHER_LOWER_DAILY_ROUNDS } from '@/lib/higherLowerScore';

/**
 * Round 848: what a game's saved daily log has to look like before
 * useDailyPuzzle restores it (each game hands its own check in as
 * isValidGuesses). The hook already refuses a log that is not an array or
 * holds null; these are the item fields a page reads without a guard, and the
 * counts the hook itself never lets a log pass. A save that fails is thrown
 * away and the day starts fresh, where it used to break the page.
 *
 * Each check is deliberately no stricter than what the game writes and what
 * its page needs, so a real save from today always passes: a field the page
 * tolerates missing is not checked. src/test/dailySaveShapes.test.tsx mounts
 * every one of these games with damaged saves; src/test/dailySaveHardening
 * restores saves written by the code before this round.
 */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';
const isTextList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isText);
const isCellIn = (v: unknown, size: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < size;

/** Higher or Lower, every sport: no more than the day's ten rounds, each a
    decided { t: 'result', correct } with a real boolean. */
export function isHigherLowerDailyLog(log: ReadonlyArray<unknown>): boolean {
  return log.length <= HIGHER_LOWER_DAILY_ROUNDS
    && log.every((a) => isRecord(a) && a.t === 'result' && typeof a.correct === 'boolean');
}

/* The columns each board draws for every guess row. */
const FOOTLE_COLUMNS = ['nationality', 'club', 'goals', 'assists', 'position', 'kitNumber', 'age', 'marketValue'];
const UFC_COLUMNS = ['yearsActive', 'weightClass', 'nationality', 'age', 'wins', 'losses', 'draws', 'koTko', 'submissions'];

/* A cell's value is drawn as text. Round 848 review: anything React can draw
   passes, a blank included (a pool row with no nationality on file writes
   null, and that is a blank tile, not a broken page); only an object, which
   React refuses to draw, fails. */
function hasCells(cells: unknown, columns: string[]): boolean {
  return isRecord(cells) && columns.every((key) => {
    const cell = cells[key];
    return isRecord(cell) && isText(cell.status) && (cell.value === null || typeof cell.value !== 'object');
  });
}

/** Footle: at most `max` guesses, each a named guess with every board column. */
export function isFootleLog(log: ReadonlyArray<unknown>, max: number): boolean {
  return log.length <= max && log.every((g) =>
    isRecord(g) && isText(g.playerName) && typeof g.isCorrect === 'boolean' && hasCells(g.cells, FOOTLE_COLUMNS));
}

/** Guess the UFC Fighter: the same, with the fighter board's columns. */
export function isUfcLog(log: ReadonlyArray<unknown>, max: number): boolean {
  return log.length <= max && log.every((g) =>
    isRecord(g) && isText(g.fighterName) && typeof g.isCorrect === 'boolean' && hasCells(g.cells, UFC_COLUMNS));
}

/** MLB, NBA, NFL and NHL Connections: a solved group carries its theme and
    players, a miss is bare, and the fourth miss ends the day (the lives row
    drew a negative count past it). */
export function isSportConnectionsLog(log: ReadonlyArray<unknown>): boolean {
  let misses = 0;
  for (const a of log) {
    if (!isRecord(a)) return false;
    if (a.t === 'x') misses++;
    else if (a.t !== 'ok' || !isText(a.theme) || !isTextList(a.players)) return false;
  }
  return misses <= 4;
}

/** Rank 'Em: one locked order of names a day. */
export function isRankEmLog(log: ReadonlyArray<unknown>): boolean {
  return log.length <= 1 && log.every((a) => isRecord(a) && isTextList(a.order));
}

/** Football Connect 4: a move lands on a real cell of the 6 by 7 board for a
    real side and names its player; a skip names its side. */
export function isConnect4Log(log: ReadonlyArray<unknown>, rows: number, cols: number): boolean {
  return log.every((a) => {
    if (!isRecord(a) || (a.team !== 'blue' && a.team !== 'red')) return false;
    if (a.t === 'skip') return true;
    return a.t === 'move' && isCellIn(a.row, rows) && isCellIn(a.col, cols) && isText(a.playerName);
  });
}

/** Transfer Path: a step names its player (the chain is matched on it). */
export function isTransferPathLog(log: ReadonlyArray<unknown>): boolean {
  return log.every((a) => isRecord(a) && (
    a.t === 'won' || a.t === 'give' || (a.t === 'step' && isText(a.player) && (isText(a.club) || a.club === null))
  ));
}
