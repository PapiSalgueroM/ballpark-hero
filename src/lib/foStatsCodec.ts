/**
 * Round 1566: the one save shape of a front office season's lines, shared.
 *
 * Round 1542 kept the NFL's lines as short arrays (src/lib/nflSeasonStats.ts)
 * because the NBA's named rows (FoStatLine, src/lib/foSeasonStats.ts) put a
 * deep NFL save over its budget, and the NBA kept its named rows. One engine,
 * many sports: the smaller shape is now every sport's. A sport binds it with
 * its own columns (a FoStatsCodec) and nothing else:
 *   A LINE is [name, position, games, starts, ...the sport's columns], then a
 *     1 for a first year man drafted in this save. `starts` is only there when
 *     the sport keeps a man's starts apart from his games (the NBA's bench
 *     plays); the NFL's pool is its starters, so its line has none.
 *   THE LINES are nested by club, then by man id: a man traded mid season has
 *     a line a club.
 *   A CLUB is [games, wins, points for, points against, ...the sport's club
 *     columns].
 * Every reader spells a block out with foExpand, the one expand function, as
 * the shared named lines (FoSeasonStats) that the leaders, the awards and the
 * card read. A save from before this shape (the NBA's named rows) is turned
 * into it on load with foPack, which writes exactly what the recorder would
 * have written from the same games, so the next save is the new shape.
 *
 * Pure, imports types only, so a harness bundles it as it is.
 */
import type { FoSeasonStats, FoStatLine, FoTeamTotals } from './foSeasonStats';

/** What a sport keeps: its line columns in order, whether starts are kept apart from games, its club columns. */
export interface FoStatsCodec {
  /** The line's stat columns, in the order they are saved, e.g. ['pts', 'reb', 'ast']. */
  cols: readonly string[];
  /** True when a man's starts are kept apart from his games. */
  gs: boolean;
  /** The club's own counts after [games, wins, points for, points against], in order. */
  clubCols: readonly string[];
}

/** A man's season for one club as every save keeps it (see the header). */
export type FoSavedLine = (string | number)[];
/** A club's season as every save keeps it: [games, wins, points for, points against, ...the sport's club columns]. */
export type FoSavedClub = number[];
/** A season's block as every save keeps it. A sport may add its own keys beside these (the NFL's `plays`). */
export interface FoSavedStats {
  season: number;
  /** By club, then by man id. */
  lines: Record<string, Record<string, FoSavedLine>>;
  clubs: Record<string, FoSavedClub>;
}
/** The block as readers want it: the shared named lines and club totals, and each club's own columns. */
export interface FoExpandedStats extends FoSeasonStats {
  club: Record<string, number[]>;
}

/** Where a line's first stat column sits. */
const first = (c: FoStatsCodec): number => (c.gs ? 4 : 3);
/** How long a line is without its first year mark. */
const lineLength = (c: FoStatsCodec): number => first(c) + c.cols.length;
/** Where a column sits on a line. */
export function foColAt(c: FoStatsCodec, col: string): number {
  const i = c.cols.indexOf(col);
  if (i < 0) throw new Error(`no column ${col}`);
  return first(c) + i;
}

/** A fresh block for a season: no lines, no clubs. */
export function foNewSaved(season: number): FoSavedStats {
  return { season, lines: {}, clubs: {} };
}

/**
 * His line for a club, opened at nothing when he has none yet (the first
 * year mark is set only when it opens). The name is written fresh every time,
 * so the line reads by his latest name.
 */
export function foOpenLine(c: FoStatsCodec, block: FoSavedStats, team: string, id: string, name: string, pos: string, rookie: boolean): FoSavedLine {
  const men = block.lines[team] ?? (block.lines[team] = {});
  const line = men[id] ?? (men[id] = [name, pos, ...new Array<number>(lineLength(c) - 2).fill(0), ...(rookie ? [1] : [])]);
  line[0] = name;
  return line;
}

/** One game on a line: a game always, and a start when the sport keeps starts and he started. */
export function foLineGame(c: FoStatsCodec, line: FoSavedLine, started: boolean): void {
  const counts = line as number[];
  counts[2] += 1;
  if (c.gs && started) counts[3] += 1;
}

/** Add `n` to one column of a line. */
export function foLineAdd(c: FoStatsCodec, line: FoSavedLine, col: string, n = 1): void {
  (line as number[])[foColAt(c, col)] += n;
}

/** One game on a club's season: a game, a win when it outscored the other side, the points both ways, its own columns. */
export function foClubGame(c: FoStatsCodec, block: FoSavedStats, team: string, pts: number, opp: number, own: readonly number[] = []): void {
  const k = block.clubs[team] ?? new Array<number>(4 + c.clubCols.length).fill(0);
  block.clubs[team] = [k[0] + 1, k[1] + (pts > opp ? 1 : 0), k[2] + pts, k[3] + opp, ...c.clubCols.map((_, i) => k[4 + i] + (own[i] ?? 0))];
}

/**
 * THE one expand function: a block spelled out as the shared named lines,
 * keyed `${team}|${id}`, every column there (a zero too), gs equal to g when
 * the sport keeps no starts; the club totals; each club's own columns. A
 * fresh object: nothing written to it reaches the save.
 */
export function foExpand(c: FoStatsCodec, s: Pick<FoSavedStats, 'season' | 'lines' | 'clubs'>): FoExpandedStats {
  const out: FoExpandedStats = { season: s.season, lines: {}, teams: {}, club: {} };
  const at = first(c);
  for (const [team, men] of Object.entries(s.lines)) {
    for (const [id, l] of Object.entries(men)) {
      const tot: Record<string, number> = {};
      c.cols.forEach((col, i) => { tot[col] = l[at + i] as number; });
      const g = l[2] as number;
      const line: FoStatLine = { id, name: l[0] as string, team, pos: l[1] as string, g, gs: c.gs ? (l[3] as number) : g, tot };
      if (l[lineLength(c)] === 1) line.rookie = true;
      out.lines[`${team}|${id}`] = line;
    }
  }
  for (const [team, k] of Object.entries(s.clubs)) {
    out.teams[team] = { g: k[0], w: k[1], pts: k[2], opp: k[3] };
    out.club[team] = k.slice(4);
  }
  return out;
}

/**
 * A save from before this shape: the named rows (FoSeasonStats) turned into
 * the saved block, line by line in the order they were written, so the block
 * is exactly what the recorder writes from the same games. The club columns a
 * named block never kept start at nothing.
 */
export function foPack(c: FoStatsCodec, named: FoSeasonStats): FoSavedStats {
  const out = foNewSaved(named.season);
  for (const l of Object.values(named.lines)) {
    const men = out.lines[l.team] ?? (out.lines[l.team] = {});
    men[l.id] = [l.name, l.pos, l.g, ...(c.gs ? [l.gs] : []), ...c.cols.map(col => l.tot[col] ?? 0), ...(l.rookie ? [1] : [])];
  }
  for (const [team, t] of Object.entries(named.teams)) out.clubs[team] = [t.g, t.w, t.pts, t.opp, ...c.clubCols.map(() => 0)];
  return out;
}

/* ------------------------------------------------------------------ readers */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Every column of a line and a club is a count: a whole number, zero or more. A column that can go below zero or
 *  hold a fraction (a plus/minus, an average) does not fit this shape as written: its bind must widen these readers
 *  for that column first, or foReadSaved refuses every block that holds one. */
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';

/** A saved line that reads whole: two words, the counts, then a 1 for a first year man or nothing. */
function readLine(c: FoStatsCodec, v: unknown): boolean {
  const n = lineLength(c);
  if (!Array.isArray(v) || (v.length !== n && v.length !== n + 1) || !isText(v[0]) || !isText(v[1])) return false;
  if (!v.slice(2, n).every(isCount)) return false;
  return v.length === n || v[n] === 1;
}
const readClub = (c: FoStatsCodec, k: unknown): boolean => Array.isArray(k) && k.length === 4 + c.clubCols.length && k.every(isCount) && k[1] <= k[0];

/** True when `v` reads whole as a saved block of this sport's shape. Never throws. */
export function foReadSaved(c: FoStatsCodec, v: unknown): v is FoSavedStats {
  try {
    if (!isObj(v) || !Number.isInteger(v.season) || !isObj(v.lines) || !isObj(v.clubs)) return false;
    if (!Object.values(v.lines).every(men => isObj(men) && Object.values(men).every(l => readLine(c, l)))) return false;
    return Object.values(v.clubs).every(k => readClub(c, k));
  } catch {
    return false;
  }
}

const readNamedLine = (c: FoStatsCodec, key: string, l: unknown): boolean => isObj(l) && isText(l.id) && isText(l.name) && isText(l.team)
  && isText(l.pos) && key === `${l.team}|${l.id}` && isCount(l.g) && isCount(l.gs) && isObj(l.tot)
  && c.cols.every(col => (l.tot as Record<string, unknown>)[col] === undefined || isCount((l.tot as Record<string, unknown>)[col]))
  && (l.rookie === undefined || l.rookie === true);
const readTeam = (t: unknown): t is FoTeamTotals => isObj(t) && isCount(t.g) && isCount(t.w) && isCount(t.pts) && isCount(t.opp);

/** True when `v` reads whole as a block of named rows, the shape before Round 1566. Never throws. */
export function foReadNamed(c: FoStatsCodec, v: unknown): v is FoSeasonStats {
  try {
    if (!isObj(v) || !Number.isInteger(v.season) || !isObj(v.lines) || !isObj(v.teams) || v.clubs !== undefined) return false;
    if (!Object.entries(v.lines).every(([key, l]) => readNamedLine(c, key, l))) return false;
    return Object.values(v.teams).every(readTeam);
  } catch {
    return false;
  }
}

/**
 * A stored block as this shape: the block itself when it reads whole, the
 * named rows turned into it when they read whole, null when neither reads.
 * Never throws.
 */
export function foSavedFrom(c: FoStatsCodec, v: unknown): FoSavedStats | null {
  if (foReadSaved(c, v)) return v;
  if (foReadNamed(c, v)) return foPack(c, v);
  return null;
}
