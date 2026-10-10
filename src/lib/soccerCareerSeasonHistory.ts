import type { SeasonRecord } from './soccerCareerEngine';
import { readMatchRating, readOvr, soccerRatingRows } from './careerSeasonRatings';

export interface SeasonHistorySource {
  seasons: readonly SeasonRecord[];
  position: string;
}

export type SeasonMetricKey = 'ovr' | 'rating' | 'apps' | 'goals' | 'assists' | 'cleanSheets';

export interface SeasonHistoryMetric {
  key: SeasonMetricKey;
  label: string;
  digits: 0 | 1;
  value: number | null;
}

export interface SavedSeasonAvailability {
  apps: number | null;
  injury: string | null;
  injuryRecorded: boolean;
  injuryWeeks: number | null;
  injurySevere: boolean | null;
  suspensionMatches: number | null;
  zeroAppsReason: string | null;
}

export interface SeasonHistoryRow {
  index: number;
  year: number | null;
  age: number | null;
  club: string | null;
  onLoanFrom: string | null;
  metrics: SeasonHistoryMetric[];
  availability: SavedSeasonAvailability;
}

export interface SeasonComparisonMetric extends Omit<SeasonHistoryMetric, 'value'> {
  first: number | null;
  second: number | null;
  delta: number | null;
}

export interface SavedSeasonComparison {
  first: SeasonHistoryRow;
  second: SeasonHistoryRow;
  metrics: SeasonComparisonMetric[];
}

const count = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const savedName = (value: unknown): string | null => typeof value === 'string' && value.trim().length > 0 ? value : null;
const statKeys: Record<string, 'apps' | 'goals' | 'assists' | 'cleanSheets'> = { A: 'apps', G: 'goals', As: 'assists', CS: 'cleanSheets' };
const zeroAppStatus: Record<string, string> = { BANNED: 'Banned', 'BANNED (PED)': 'Banned', PRISON: 'Prison', CONVICTED: 'Convicted' };

/** Saved facts only. Injury weeks are never converted into matches missed. */
export function savedSeasonAvailability(row: SeasonRecord): SavedSeasonAvailability {
  const apps = count(row.apps);
  const injury = savedName(row.injury);
  const injuryRecorded = row.injury === null || injury !== null;
  const injurySevere = typeof row.injurySevere === 'boolean' ? row.injurySevere : null;
  const status = Object.prototype.hasOwnProperty.call(zeroAppStatus, row.club) ? zeroAppStatus[row.club] : null;
  const zeroAppsReason = apps !== 0 ? null : status
    ?? (injury ? injurySevere === true ? 'Severe injury recorded' : 'Injury recorded' : 'No appearances recorded');
  return {
    apps, injury, injuryRecorded,
    injuryWeeks: count(row.injuryWeeks),
    injurySevere,
    suspensionMatches: count(row.suspensionMatches),
    zeroAppsReason,
  };
}

/** The index is always the original save index, even when years repeat. */
export function seasonHistoryRows(career: SeasonHistorySource): SeasonHistoryRow[] {
  return career.seasons.flatMap((row, index) => {
    if (row.type !== 'playing') return [];
    const rated = soccerRatingRows([row], career.position)[0];
    const apps = count(row.apps);
    const metrics: SeasonHistoryMetric[] = [
      { key: 'ovr', label: 'Saved OVR', digits: 0, value: readOvr(row.ovr) },
      { key: 'rating', label: 'Match rating', digits: 1, value: apps !== null && apps > 0 ? readMatchRating(row) : null },
      ...rated.stats.map(stat => {
        const key = statKeys[stat.short];
        return { key, label: stat.label, digits: 0 as const, value: count(row[key]) === null ? null : stat.value };
      }),
    ];
    return [{ index, year: count(row.year), age: count(row.age), club: savedName(row.club), onLoanFrom: savedName(row.onLoanFrom), metrics, availability: savedSeasonAvailability(row) }];
  });
}

export function defaultSeasonComparison(rows: readonly SeasonHistoryRow[]): [number, number] | null {
  return rows.length < 2 ? null : [rows[rows.length - 2].index, rows[rows.length - 1].index];
}

/** The change is the second saved value minus the first, before display. */
export function compareSavedSeasons(career: SeasonHistorySource, firstIndex: number, secondIndex: number): SavedSeasonComparison | null {
  if (!Number.isInteger(firstIndex) || !Number.isInteger(secondIndex) || firstIndex === secondIndex) return null;
  const rows = seasonHistoryRows(career);
  const first = rows.find(row => row.index === firstIndex), second = rows.find(row => row.index === secondIndex);
  if (!first || !second) return null;
  return {
    first, second,
    metrics: first.metrics.map(metric => {
      const other = second.metrics.find(row => row.key === metric.key)!;
      const delta = metric.value === null || other.value === null ? null : Number((other.value - metric.value).toFixed(metric.digits));
      return { key: metric.key, label: metric.label, digits: metric.digits, first: metric.value, second: other.value, delta };
    }),
  };
}
