/* Round 1046: where a viewer stopped watching a season, for any game's
   Season Centre. One small record per game in this browser's localStorage:
   a per viewer convenience, never part of a save. A record that is not
   exactly the shape below is no record, and a record is never repaired: it
   either names a season the save still holds, by the season's own key, or
   it is ignored.

   This file is the READ side and knows no sport: the game passes its name
   and how it keys a season. It imports nothing and stays small, because the
   career page reads the record in its first download to draw the Resume
   chip (scripts/simFlagshipWeight.mjs holds it to that). The write side
   loads with the Season Centre: src/components/season-centre/resumeStore.ts. */

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
  /** The viewer's own word for a round of this season ("Matchday", "League game"), so the chip and the button it leads
   *  to say the same thing. Absent in a record kept before the word was. */
  round?: string;
}

export const resumeStorageKey = (game: string) => `seasonCentre:v1:${game}`;

const whole = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** The record in a parsed value, or null when it is anything but that shape. */
export function asResume(v: unknown): SeasonResume | null {
  const r = v as SeasonResume | null;
  return r && typeof r.key === 'string' && r.key !== '' && r.key.length <= 200 && whole(r.year, 1900, 2200) && whole(r.md, 1, 400)
    && (r.speed === 1 || r.speed === 3 || r.speed === 'results') && typeof r.stable === 'boolean'
    && (r.round === undefined || (typeof r.round === 'string' && r.round !== '' && r.round.length <= 40)) ? r : null;
}

/** Never throws. */
export function readResume(game: string): SeasonResume | null {
  try { return asResume(JSON.parse(localStorage.getItem(resumeStorageKey(game)) ?? 'null')); } catch { return null; }
}

/** The index of the season a record belongs to, or -1. The ONE rule the
 *  chip, the Season Centre and the harness share: a season of the same year
 *  whose key is the record's, and either the record is stable or that season
 *  is `liveYear`, the one season the save can still show as it was watched.
 *  Which seasons can be shown at all is the game's to say: its `keyOf`
 *  answers null for one that cannot (soccer: a year he did not play), so no
 *  sport's row shape is known here. */
export function resumeRowIndex<Row extends { year: number }>(
  r: SeasonResume | null, rows: readonly Row[], keyOf: (row: Row) => string | null, liveYear?: number | null,
): number {
  if (!r) return -1;
  return rows.findIndex(row => row.year === r.year && keyOf(row) === r.key && (r.stable || liveYear === row.year));
}

/** "Resume 2031/32, matchday 14": the season's printed label and the NEXT round, in the word the viewer itself used
 *  for a round of that season (the record's), or the game's usual word when the record does not hold one. */
export const resumeLabel = (r: SeasonResume, season: string, round: string) => `Resume ${season}, ${(r.round ?? round).toLowerCase()} ${r.md + 1}`;
