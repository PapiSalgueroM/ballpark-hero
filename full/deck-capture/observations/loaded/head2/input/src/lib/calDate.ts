/**
 * Round 946: the pure date helpers, shared.
 *
 * Round 158 wrote these for the Club Manager calendar and Round 466 moved
 * them into src/lib/clubManagerCalendar.ts. Round 946 lifts them here, word
 * for word, so the GM calendar (src/lib/gmCalendar.ts) dates its league year
 * with the same maths. clubManagerCalendar.ts re-exports every one of them,
 * so nothing that imports them from there changes, and
 * scripts/simGmCalendar.mjs section 1 replays a fixture recorded before the
 * move (scripts/data/calDateFixture946.json) to prove it.
 *
 * Gregorian helpers with no Date object: nothing here reads a clock, so a
 * date computed here never moves under a saved page.
 */

export interface CalDate { y: number; m: number; d: number; }

/** Day of week, 0 Sunday, for a Gregorian date. Sakamoto's method. */
export function dayOfWeek(y: number, m: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

export function daysInMonth(y: number, m: number): number {
  return [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function addDays(date: CalDate, n: number): CalDate {
  let { y, m, d } = date;
  d += n;
  while (d > daysInMonth(y, m)) { d -= daysInMonth(y, m); m += 1; if (m > 12) { m = 1; y += 1; } }
  while (d < 1) { m -= 1; if (m < 1) { m = 12; y -= 1; } d += daysInMonth(y, m); }
  return { y, m, d };
}

/** A sortable integer for a date: 20260808 for 8 August 2026. */
export function dateKey(date: CalDate): number {
  return date.y * 10000 + date.m * 100 + date.d;
}

/** Whole days from a to b (negative when b is earlier). */
export function daysBetween(a: CalDate, b: CalDate): number {
  const toDays = (x: CalDate): number => {
    // Days since 1 January year 0 in the proleptic Gregorian calendar.
    const y = x.m <= 2 ? x.y - 1 : x.y;
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const doy = Math.floor((153 * (x.m + (x.m > 2 ? -3 : 9)) + 2) / 5) + x.d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe;
  };
  return toDays(b) - toDays(a);
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Sat 8 Aug". */
export function shortDate(date: CalDate): string {
  return `${DAY_NAMES[dayOfWeek(date.y, date.m, date.d)]} ${date.d} ${MONTH_NAMES[date.m - 1].slice(0, 3)}`;
}

/** "2026-09-10": the ISO form, for keys and for data files. */
export function isoDate(date: CalDate): string {
  return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
}

/** The inverse of isoDate. Throws on anything that is not a real day, so a typo in a data file fails loudly. */
export function parseIsoDate(iso: string): CalDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`not an ISO date: ${iso}`);
  const date = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  if (date.m < 1 || date.m > 12 || date.d < 1 || date.d > daysInMonth(date.y, date.m)) throw new Error(`not a real day: ${iso}`);
  return date;
}
