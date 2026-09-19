import type { RecordRow, RecordSection } from '@/lib/records';

/**
 * Round 649: everything the per competition record pages say that is a number
 * or a name is counted here, from the rows in src/data/recordBooks.json, at
 * render. Nothing in this file is typed history.
 *
 * THE COUNTING RULE, and it follows the rows as they are rather than as anyone
 * might want them to be:
 *   - every row is one title (or medal) for the name exactly as that row writes
 *     it, character for character;
 *   - a year with two rows (a split college football title, a shared Dally M,
 *     a tied Brownlow count, rugby league's split 1997) gives one to each name;
 *   - a year with no row (a season never played, a title stripped and left
 *     vacant) gives one to nobody;
 *   - so a club written two ways, or one that moved or was renamed, counts
 *     separately under each name. Nothing here keeps a list of which names
 *     belong together, and the rows do not always use the name of the day
 *     either, so the pages never say they do.
 * The pages print this rule in words above the leaders table, built from the
 * same rows, so a reader can see exactly how a count came out.
 *
 * THE SPAN RULE (Round 649 review). Several tables start after the competition
 * did: the Stanley Cup rows begin in 1915, college football's in 1981. So every
 * heading, fact and link that could read as all time names the span instead:
 * "since 1915", "earliest year listed". That is true for a table that starts at
 * the competition's first season too, so one rule serves all twelve and nothing
 * keeps a list of which tables are short.
 *
 * scripts/simRecordPages.mjs recounts all of it independently from the JSON and
 * compares against the saved pages, so this file is not allowed to mark its own
 * homework.
 */

export interface Leader {
  name: string;
  count: number;
  /** the years this name won, oldest first */
  years: number[];
}

export interface Decade {
  /** 1990 for the 1990s */
  start: number;
  rows: RecordRow[];
}

/** Rows grouped by decade, newest decade first, rows kept in the order given. */
export function decadesOf(rows: RecordRow[]): Decade[] {
  const byStart = new Map<number, RecordRow[]>();
  for (const r of rows) {
    const start = Math.floor(r.year / 10) * 10;
    const list = byStart.get(start);
    if (list) list.push(r);
    else byStart.set(start, [r]);
  }
  return [...byStart.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([start, list]) => ({ start, rows: list }));
}

/** One entry per name, most titles first, ties in alphabetical order. */
export function titleCounts(rows: RecordRow[]): Leader[] {
  const byName = new Map<string, number[]>();
  for (const r of rows) {
    const list = byName.get(r.champion);
    if (list) list.push(r.year);
    else byName.set(r.champion, [r.year]);
  }
  return [...byName.entries()]
    .map(([name, years]) => ({ name, count: years.length, years: [...years].sort((a, b) => a - b) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** The leaders table: every name that has won more than once, so a tie can never
 *  be cut in half. Only if nobody has won twice does it list everybody. */
export function leadersOf(rows: RecordRow[]): { leaders: Leader[]; once: number } {
  const all = titleCounts(rows);
  const multi = all.filter(l => l.count >= 2);
  if (multi.length === 0) return { leaders: all, once: 0 };
  return { leaders: multi, once: all.length - multi.length };
}

export interface Span {
  first: number;
  latest: number;
  /** distinct years with at least one row */
  seasons: number;
  firstNames: string[];
  latestNames: string[];
  /** distinct names across every row */
  distinct: number;
  /** years with more than one row, oldest first */
  splitYears: number[];
  /** years between first and latest with no row at all, oldest first */
  gapYears: number[];
}

export function spanOf(rows: RecordRow[]): Span | null {
  if (!rows.length) return null;
  const perYear = new Map<number, string[]>();
  for (const r of rows) {
    const list = perYear.get(r.year);
    if (list) list.push(r.champion);
    else perYear.set(r.year, [r.champion]);
  }
  const years = [...perYear.keys()].sort((a, b) => a - b);
  const first = years[0];
  const latest = years[years.length - 1];
  const gapYears: number[] = [];
  for (let y = first; y <= latest; y++) if (!perYear.has(y)) gapYears.push(y);
  return {
    first,
    latest,
    seasons: years.length,
    firstNames: perYear.get(first) ?? [],
    latestNames: perYear.get(latest) ?? [],
    distinct: new Set(rows.map(r => r.champion)).size,
    splitYears: years.filter(y => (perYear.get(y)?.length ?? 0) > 1),
    gapYears,
  };
}

/** "A", "A and B", "A, B and C" */
export function joinNames(names: (string | number)[]): string {
  const xs = names.map(String);
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** [1916, 1917, 1918, 1940] reads as "1916 to 1918 and 1940" */
export function yearRanges(years: number[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < years.length) {
    let j = i;
    while (j + 1 < years.length && years[j + 1] === years[j] + 1) j += 1;
    parts.push(j > i ? `${years[i]} to ${years[j]}` : String(years[i]));
    i = j + 1;
  }
  return joinNames(parts);
}

export const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** What a row's year IS, from the section's own column label: "year" on a Year
 *  table (the Super Bowl is keyed by the year the game was played, not the
 *  season it closed), "season" only where the column says Season. */
export const yearNounOf = (def: RecordSection): string => def.yearLabel.toLowerCase();

/** A decade's heading. A first decade the rows only partly cover says so
 *  ("Stanley Cup winners from 1915 to 1919", "English football champions in
 *  1889") instead of naming a whole decade the table does not hold. */
export function decadeHeading(def: RecordSection, start: number, first: number, latest: number): string {
  const many = capFirst(def.words.many);
  if (first <= start) return `${many} in the ${start}s`;
  const end = Math.min(start + 9, latest);
  return first === end ? `${many} in ${first}` : `${many} from ${first} to ${end}`;
}

/** The first year a section's rows hold, which every span bound phrase is built on. */
export const firstYearOf = (rows: RecordRow[]): number =>
  rows.reduce((min, r) => Math.min(min, r.year), Number.POSITIVE_INFINITY);

/** The one wording for a link to a section's page, used by /records, by the other
 *  section pages, and copied literally into the hubs and format explainers, where
 *  simRecordPages check 9 holds the copy to this rule: "Stanley Cup winners since
 *  1915, year by year". */
export const sinceLabel = (def: RecordSection, first: number): string =>
  `${capFirst(def.words.many)} since ${first}, year by year`;

/** The newest `seasons` years of rows (the rows arrive newest first), keeping a
 *  year with two rows whole, so a shared title is never shown half shared. */
export function recentSeasons(rows: RecordRow[], seasons: number): RecordRow[] {
  const keep = new Set<number>();
  for (const r of rows) {
    if (keep.size >= seasons && !keep.has(r.year)) break;
    keep.add(r.year);
  }
  return rows.filter(r => keep.has(r.year));
}
