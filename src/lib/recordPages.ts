import type { RecordRow } from '@/lib/records';

/**
 * Round 649: everything the per competition record pages say that is a number
 * or a name is counted here, from the rows in src/data/recordBooks.json, at
 * render. Nothing in this file is typed history.
 *
 * THE COUNTING RULE, and it follows the rows as they are rather than as anyone
 * might want them to be:
 *   - every row is one title (or medal) for the name on that row;
 *   - a year with two rows (a split college football title, a shared Dally M,
 *     a tied Brownlow count, rugby league's split 1997) gives one to each name;
 *   - a year with no row (a season never played, a title stripped and left
 *     vacant) gives one to nobody;
 *   - a club that moved or was renamed is counted under each name it won under,
 *     because the rows name clubs as they were at the time and nothing here
 *     keeps a list of which names belong together.
 * The pages print this rule in words, built from the same rows, so a reader can
 * see exactly how a count came out.
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
