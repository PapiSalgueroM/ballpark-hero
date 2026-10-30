/**
 * Round 1606: real dugouts. Who was really in charge of a club on the opening day of a season, as a dated fact.
 *
 * Sport agnostic and pure: nothing here knows Club Manager, a league or a calendar. A game binds a table of rows
 * (its own data file) and asks it questions. Club Manager's table is src/data/clubManagerDugouts.ts.
 *
 * THE RULE THIS MODULE EXISTS TO HOLD (decision A, Round 1606). A real manager's name is a dated fact shown in a
 * display slot (a club page, a fixture card) and nothing else. No sentence a game writes may carry it: not a
 * headline, an inbox message, a press question, a live event, a report line, an offer or a season summary. No
 * rating, style, value or record is ever attached to a real manager, so the row holds a name and the month he was
 * appointed and nothing more. A chair nobody could check on two sources is not in the table at all; its club goes
 * on the partial list and keeps a made up name that says so.
 *
 * Nothing here reads a clock. The month comes from the row, so a label is the same on every day it is drawn.
 */

/** One chair: the man in charge for the club's first league match of the season the table describes. */
export interface RealDugoutRow {
  /** His name as the club spells it. */
  name: string;
  /** The month he was appointed to that stint, 'YYYY-MM'. Left out where two sources disagree on the month. */
  appointed?: string;
}

/** Era (or season) id, then the club's name exactly as the game spells it, then the chair. */
export type RealDugoutTable = Record<string, Record<string, RealDugoutRow>>;

/** Era id, then the clubs of a covered league whose chair could not be two sourced (the CM_PARTIAL shape). */
export type RealDugoutPartial = Record<string, string[]>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The chair for a club in an era, or null when the table has no row for it. */
export function realDugoutFor(table: RealDugoutTable, era: string, club: string): RealDugoutRow | null {
  const rows = Object.prototype.hasOwnProperty.call(table, era) ? table[era] : undefined;
  if (!rows || !Object.prototype.hasOwnProperty.call(rows, club)) return null;
  const row = rows[club];
  return row && typeof row.name === 'string' && row.name.trim() ? row : null;
}

/** Every real manager's name in the table, sorted and unique, for the real name and never quote sets. */
export function realDugoutNames(table: RealDugoutTable): string[] {
  const out = new Set<string>();
  for (const rows of Object.values(table)) {
    for (const row of Object.values(rows)) {
      if (row && typeof row.name === 'string' && row.name.trim()) out.add(row.name);
    }
  }
  return [...out].sort();
}

/** True when a club's chair in an era is on the table's partial list (a covered league, not two sourced). */
export function realDugoutPartial(partial: RealDugoutPartial, era: string, club: string): boolean {
  const list = Object.prototype.hasOwnProperty.call(partial, era) ? partial[era] : undefined;
  return Array.isArray(list) && list.includes(club);
}

/** The MADE UP tag's title on a made up manager in a chair the table covers but could not two source. */
export const DUGOUT_PARTIAL_TITLE = 'Not a real manager. We could not check who was in charge on the opening day on two sources, so this game made him up.';
/** The MADE UP tag's title on every other made up manager (a later appointment, or a league the table does not cover). */
export const DUGOUT_MADE_UP_TITLE = 'Not a real manager. This game made him up.';

/** "since Jun 2024" from '2024-06', or null when the month is missing or not in the 'YYYY-MM' shape. */
export function realDugoutSince(appointed?: string): string | null {
  if (typeof appointed !== 'string') return null;
  const m = /^(\d{4})-(\d{2})$/.exec(appointed);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `since ${MONTHS[month - 1]} ${m[1]}`;
}
