/* Round 1046: where a viewer stopped watching a season, for any game's
   Season Centre. One small record per game in this browser's localStorage:
   a per viewer convenience, never part of a save. Every read and write is
   guarded, a record that is not exactly the shape below is no record, and a
   record is never repaired: it either names a season the save still holds,
   by the season's own key, or it is ignored.

   This file knows no sport: the game passes its name and how it keys a
   season. It imports nothing, because the career page reads the record in
   its first download to draw the Resume chip (scripts/simFlagshipWeight.mjs
   holds it to that). */

export type ResumeSpeed = 1 | 3 | 'results';

export interface SeasonResume {
  /** The season's own key, built by the game from saved fields: it changes exactly when the season shown would. */
  key: string;
  year: number;
  /** Rounds fully watched, 1 or more. */
  md: number;
  speed: ResumeSpeed;
  /** True when the season replays the same whatever the save does next; false when only the save's current season can show it. */
  stable: boolean;
}

export const resumeStorageKey = (game: string) => `seasonCentre:v1:${game}`;

const whole = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

/** The record in a parsed value, or null when it is anything but exactly that shape. */
export function asResume(v: unknown): SeasonResume | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.key !== 'string' || r.key.length < 1 || r.key.length > 200) return null;
  if (!whole(r.year, 1900, 2200) || !whole(r.md, 1, 400)) return null;
  if (r.speed !== 1 && r.speed !== 3 && r.speed !== 'results') return null;
  if (typeof r.stable !== 'boolean') return null;
  return { key: r.key, year: r.year, md: r.md, speed: r.speed, stable: r.stable };
}

/** Never throws. */
export function readResume(game: string): SeasonResume | null {
  try { return asResume(JSON.parse(localStorage.getItem(resumeStorageKey(game)) ?? 'null')); } catch { return null; }
}

/** Never throws; a browser that refuses storage simply keeps no place. */
export function writeResume(game: string, r: SeasonResume): void {
  try { localStorage.setItem(resumeStorageKey(game), JSON.stringify(r)); } catch { /* no place kept */ }
}

/** Never throws. */
export function clearResume(game: string): void {
  try { localStorage.removeItem(resumeStorageKey(game)); } catch { /* nothing to clear */ }
}

/** The index of the season a record belongs to, or -1. The ONE rule the
 *  chip, the Season Centre and the harness share: a played season of the
 *  same year whose key is the record's, and either the record is stable or
 *  that season is `liveYear`, the one season the save can still show as it
 *  was watched. */
export function resumeRowIndex<Row extends { year: number; type: string; apps: number }>(
  r: SeasonResume | null, rows: readonly Row[], keyOf: (row: Row) => string | null, liveYear?: number | null,
): number {
  if (!r) return -1;
  return rows.findIndex(row => row.year === r.year && row.type === 'playing' && row.apps > 0 && keyOf(row) === r.key && (r.stable || liveYear === row.year));
}

/** "Resume 2031/32, matchday 14": the season's printed label and the NEXT round, in the game's word for a round. */
export const resumeLabel = (r: SeasonResume, season: string, round: string) => `Resume ${season}, ${round} ${r.md + 1}`;
