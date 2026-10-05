/* Round 1011: every season's rating in the career history.

   A player asked for it in these words: "playing as CB/CDM etc, goals don't
   matter as much as overall performance, so we can track their progress
   better". Every saved season row already carries its match rating (it is
   required by isSoccerCareerSave), and since this round a played row also
   carries ovr, the overall it was played at. This file reads both back
   honestly: a season nobody played (a ban, prison, a year out) has rating 0
   on the row and reads as null here, so a 0.0 is never printed, and a row
   saved before the stamp existed reads ovr null rather than a guess.

   No React and no engine import, so the harness can bundle it on its own. */
import type { SeasonRecord } from "@/lib/soccerCareerEngine";

type Row = Pick<SeasonRecord, "year" | "age" | "club" | "type" | "apps" | "goals" | "assists" | "cleanSheets" | "rating"> &
  Partial<Pick<SeasonRecord, "ovr" | "onLoanFrom" | "injury">>;

/** A finite whole overall from 1 to 99, otherwise null. */
export function readOvr(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 99 ? v : null;
}

/** The season's match rating, only for a season that was actually played. */
export function readMatchRating(row: Pick<Row, "type" | "apps" | "rating">): number | null {
  return row.type === "playing" && (row.apps ?? 0) > 0 && Number.isFinite(row.rating) && row.rating >= 3 && row.rating <= 10 ? row.rating : null;
}

export type RatingBand = "elite" | "good" | "ok" | "poor";

/** The engine's own bars, nothing new:
    poor at 6.3 or less, the club's strike (soccerCareerEngine.ts, `last.rating <= 6.3`);
    good at 6.8 or more, the lowest performanceBoost rung in generateSeasonStats;
    elite at 7.5 or more, pushCeiling's elite season. */
export function ratingBand(r: number): RatingBand {
  if (r >= 7.5) return "elite";
  if (r >= 6.8) return "good";
  if (r <= 6.3) return "poor";
  return "ok";
}

export interface SeasonStat {
  label: string;
  short: string;
  /** null when the number may not have been counted for that season (see backLineSheets) */
  value: number | null;
}

export interface SeasonRatingRow {
  year: number;
  age: number;
  club: string;
  onLoanFrom: string | null;
  ovr: number | null;
  rating: number | null;
  stats: SeasonStat[];
  note: string | null;
}

const BACK_LINE = ["CB", "LB", "RB"];
const OUT_CLUBS: Record<string, string> = { BANNED: "Banned", "BANNED (PED)": "Banned", PRISON: "Prison", CONVICTED: "Convicted" };

/** Clean sheets for the back line were only drawn from Round 667
    (2026-09-28). Every row the engine has stamped with ovr is newer than
    that, so its number is always real, a 0 included. An unstamped back line
    row with games and 0 may be a 0 that was never drawn (before Round 667) or
    a real 0 (Round 667 to Round 1010), and nothing on the row tells which, so
    it reads null and the screens say it may not have been counted. An
    unstamped row with more than 0 is real, and so is 0 in a season with no
    games. The keeper's were always drawn. */
function backLineSheets(row: Row): number | null {
  if ((row.apps ?? 0) > 0 && readOvr(row.ovr) === null && (row.cleanSheets ?? 0) === 0) return null;
  return row.cleanSheets ?? 0;
}

/** Only fields the engine really tracks per season, never the estimates the
    Career Stats tile derives (tackles, interceptions and the like). */
function statsFor(row: Row, position: string): SeasonStat[] {
  const apps: SeasonStat = { label: "Apps", short: "A", value: row.apps ?? 0 };
  if (position === "GK") return [apps, { label: "Clean sheets", short: "CS", value: row.cleanSheets ?? 0 }];
  if (BACK_LINE.includes(position)) return [apps, { label: "Clean sheets", short: "CS", value: backLineSheets(row) }, { label: "Goals", short: "G", value: row.goals ?? 0 }];
  return [apps, { label: "Goals", short: "G", value: row.goals ?? 0 }, { label: "Assists", short: "As", value: row.assists ?? 0 }];
}

function noteFor(row: Row): string | null {
  if ((row.apps ?? 0) > 0) return row.injury ? "Injured" : null;
  if (OUT_CLUBS[row.club]) return OUT_CLUBS[row.club];
  return row.injury ? "Injured" : "Did not play";
}

/** One row per played season (type "playing"), oldest first like the timeline. */
export function soccerRatingRows(seasons: readonly Row[], position: string): SeasonRatingRow[] {
  return (Array.isArray(seasons) ? seasons : []).filter(r => r && r.type === "playing").map(row => ({
    year: row.year,
    age: row.age,
    club: row.club,
    onLoanFrom: row.onLoanFrom ?? null,
    ovr: readOvr(row.ovr),
    rating: readMatchRating(row),
    stats: statsFor(row, position),
    note: noteFor(row),
  }));
}

/** The apps weighted mean of every rated season, with the games behind it, or null. */
export function careerAverageRating(seasons: readonly Row[]): { rating: number; games: number } | null {
  let sum = 0, games = 0;
  for (const row of Array.isArray(seasons) ? seasons : []) {
    const r = row ? readMatchRating(row) : null;
    if (r === null) continue;
    sum += r * row.apps;
    games += row.apps;
  }
  return games > 0 ? { rating: Math.round((sum / games) * 10) / 10, games } : null;
}

/** The first year that carries an overall, when played seasons before it do
    not (a save from before Round 1011 that kept going). null when every played
    season has one, or when none does yet. */
export function ovrTrackedFrom(rows: readonly SeasonRatingRow[]): number | null {
  const played = rows.filter(r => r.rating !== null);
  const first = played.findIndex(r => r.ovr !== null);
  return first > 0 ? played[first].year : null;
}

/** The two lines the Ratings screen draws, one value per played season, null
    where there is nothing true to plot. Nothing is filled in between. */
export function ratingSeries(rows: readonly SeasonRatingRow[]): { ovr: (number | null)[]; rating: (number | null)[] } {
  return { ovr: rows.map(r => r.ovr), rating: rows.map(r => r.rating) };
}

/** True when there are played seasons and not one of them has an overall yet. */
export function ovrNotYetTracked(rows: readonly SeasonRatingRow[]): boolean {
  const played = rows.filter(r => r.rating !== null);
  return played.length > 0 && played.every(r => r.ovr === null);
}
