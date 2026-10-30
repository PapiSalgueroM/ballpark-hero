/**
 * Round 1601: the seasons a man played for my club, written down when a season ends.
 *
 * Until this round no save kept a single past season of any player: the summer wipes every
 * season line (agePlayer). So at the end of each season, finishSeason calls archiveCareerSeason
 * once, and this file writes one short row for every man who played for my club that season.
 *
 * WHERE THE ROWS LIVE. In one optional CareerState list, `pastLines`, and never on the CMPlayer.
 * The world ledger copies a whole CMPlayer every summer, on every refresh and for every man who
 * leaves, so rows on the man would ride into the ledger, be stored twice, and live on for sold
 * men. A LIST and never a map keyed by a player's id (the house rule written on the league book's
 * `my`): a harness that sorts a save's keys before it normalises ids would read two equal saves
 * as different.
 *
 * THE RULE, said on the card: seasons are kept for the men at the club when a season ends, while
 * they stay. Each season end keeps an entry only for a man of the squad or out on loan from it,
 * so a man who left (sold, released, retired, walked) loses his rows at the next season end. A
 * man re-signed before that season end keeps them, if he comes back under the same id. When the
 * manager moves jobs, the rows of seasons finished at the old club go at the next season end, and
 * the card shows only this club's seasons before that (rowIsHere), so a namesake at the new club
 * never wears another man's seasons.
 *
 * A man out on loan keeps his line too: the save plays no loan games, so every app on his line
 * is a game for MY club.
 *
 * Pure and import free: nothing is read at module scope and nothing here draws a number, so the
 * engine imports it without a cycle and without moving a single draw.
 */

/** One season: [season, apps, goals, assists, cleanSheets, rating10]. Six integers, never a hole. */
export type PastRow = [season: number, apps: number, goals: number, assists: number, cleanSheets: number, rating10: number];
/** One man's kept seasons, by his squad id, oldest first. */
export type PastEntry = [id: string, rows: PastRow[]];

/** The most seasons kept for one man. Ten short rows keep the card a tile. */
export const PAST_KEPT = 10;

/** The part of a man's line the archive reads. */
export interface LineIn {
  id: string;
  apps?: number;
  seasonGoals: number;
  seasonAssists: number;
  cleanSheets?: number;
  ratingSum?: number;
}

/** The part of a save the archive reads and writes. */
export interface ArchiveIn {
  season: number;
  squad: readonly LineIn[];
  loanedOut?: readonly { player: LineIn }[];
  pastLines?: PastEntry[];
  pastFrom?: number;
  /** The club of this save, and the club of every season it finished (history, this season's included). */
  clubName?: string;
  history?: readonly { season: number; club: string }[];
}

const whole = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const count = (v: unknown): number => (whole(v) ? v : 0);

/** This season's row for one man, or null when he did not play. */
export function pastRowOf(p: LineIn, season: number): PastRow | null {
  const apps = count(p.apps);
  if (apps < 1 || !whole(season) || season < 1) return null;
  const sum = typeof p.ratingSum === 'number' && Number.isFinite(p.ratingSum) && p.ratingSum > 0 ? p.ratingSum : 0;
  return [season, apps, count(p.seasonGoals), count(p.seasonAssists), count(p.cleanSheets), Math.round(sum * 10)];
}

/**
 * The careful reader of one man's rows: keeps only six non negative integers with a season of
 * at least 1 and apps of at least 1, in strictly rising season order, the last PAST_KEPT of them.
 * Anything else is dropped, never thrown on. It invents no other bound.
 */
export function readPast(raw: unknown): PastRow[] {
  if (!Array.isArray(raw)) return [];
  const out: PastRow[] = [];
  for (const r of raw) {
    if (!Array.isArray(r) || r.length !== 6) continue;
    let ok = true;
    for (let i = 0; i < 6; i++) if (!whole(r[i])) ok = false;
    if (!ok || r[0] < 1 || r[1] < 1) continue;
    if (out.length && r[0] <= out[out.length - 1][0]) continue;
    out.push([r[0], r[1], r[2], r[3], r[4], r[5]]);
  }
  return out.slice(-PAST_KEPT);
}

/** The careful reader of the whole list: one entry an id, the first one wins, empty entries dropped. */
export function readPastLines(raw: unknown): PastEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: PastEntry[] = [];
  for (const e of raw) {
    if (!Array.isArray(e) || e.length !== 2 || typeof e[0] !== 'string' || !e[0] || seen.has(e[0])) continue;
    const rows = readPast(e[1]);
    if (!rows.length) continue;
    seen.add(e[0]);
    out.push([e[0], rows]);
  }
  return out;
}

/** One man's kept rows, oldest first. */
export function pastOf(raw: unknown, id: string): PastRow[] {
  return readPastLines(raw).find(e => e[0] === id)?.[1] ?? [];
}

/** A man's rows with this season's row put in (a second call for the same season replaces it). */
export function withSeasonRow(rows: readonly PastRow[], row: PastRow | null): PastRow[] {
  if (!row) return rows.slice();
  return [...rows.filter(r => r[0] !== row[0]), row].sort((a, b) => a[0] - b[0]).slice(-PAST_KEPT);
}

/**
 * True when a row's season was finished at the club the save is at now, or the save does not say.
 * A row of a season finished at another club (the manager moved jobs) is not "here": squad ids are
 * built from names, so a namesake at the new club would otherwise inherit the old man's seasons.
 */
export function rowIsHere(state: Pick<ArchiveIn, 'clubName' | 'history'>, row: PastRow): boolean {
  if (state.clubName === undefined) return true;
  const club = (state.history ?? []).find(h => h.season === row[0])?.club;
  return club === undefined || club === state.clubName;
}

/**
 * The season end write, on finishSeason's own clone. Every man of the squad and every man out
 * on loan gets this season's row when he played; every entry of a man in neither is dropped, and
 * so is every row of a season finished at another club; the key is left off when nobody holds a
 * row; pastFrom is set once, the first time this runs.
 */
export function archiveCareerSeason(state: ArchiveIn): void {
  const old = new Map(readPastLines(state.pastLines).map(([id, rows]): PastEntry => [id, rows.filter(r => rowIsHere(state, r))]));
  const men: LineIn[] = [...state.squad, ...(state.loanedOut ?? []).map(l => l?.player).filter((p): p is LineIn => !!p)];
  const seen = new Set<string>();
  const next: PastEntry[] = [];
  for (const p of men) {
    if (!p || typeof p.id !== 'string' || !p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    const rows = withSeasonRow(old.get(p.id) ?? [], pastRowOf(p, state.season));
    if (rows.length) next.push([p.id, rows]);
  }
  if (next.length) state.pastLines = next;
  else delete state.pastLines;
  if (state.pastFrom === undefined) state.pastFrom = state.season;
}

/** The average match rating of a row: rating10 / 10 / apps, null for a man with no game. */
export function averageOf(apps: number, rating10: number): number | null {
  return apps > 0 ? rating10 / 10 / apps : null;
}
