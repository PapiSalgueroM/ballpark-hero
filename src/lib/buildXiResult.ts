import { z } from 'zod';
import { BUILD_XI_DRAFT_KEY, readBuildXiPicks } from '@/lib/buildXiDraft';
import { ALL_POSITIONS } from '@/lib/positionFit';
import { safeLocalStorage } from '@/lib/safeStorage';
import type { SeasonReport } from '@/lib/worldXi';
import type { Position } from '@/types/game';
import type { AIVerdict } from '@/types/lineupBuilder';

const number = z.number().finite();
const string = z.string();
const fit = z.object({ roleFit: number, chemistry: number, balance: number });
const season = z.object({
  squadRating: number, tablePosition: number, points: number, topScorer: z.object({ name: string, goals: number }).nullable(),
  trophies: z.array(string), injuries: z.array(z.object({ name: string, weeksOut: number })), transferHeadline: string, narrative: z.array(string),
  record: z.object({ wins: number, draws: number, losses: number }), unbeatenRun: number, gapToTop: number, marginAsChampion: number,
  playerOfSeason: z.object({ name: string, rating: number }).nullable(),
  goalsFor: number.optional(), goalsAgainst: number.optional(), cleanSheets: number.optional(), assists: number.optional(),
  months: z.array(z.object({ month: string, played: number, wins: number, draws: number, losses: number, goalsFor: number, goalsAgainst: number,
    standout: z.object({ name: string, goals: number, assists: number, cleanSheets: number }).nullable(), moment: string })).optional(),
  playerStats: z.array(z.object({ name: string, position: z.custom<Position>(p => ALL_POSITIONS.some(role => role === p)),
    appearances: number, goals: number, assists: number, cleanSheets: number.nullable(), avgRating: number })).optional(),
  awards: z.object({ youngPlayer: z.object({ name: string, age: number, rating: number }).nullable(),
    goalOfSeason: z.object({ scorer: string, opponent: string, minute: string, month: string, score: string, line: string }).nullable() }).optional(),
  whatIf: z.object({ kind: z.enum(['formation', 'respin', 'none']), alternative: string, finishFrom: number, finishTo: number,
    pointsFrom: number, pointsTo: number, line: string }).optional(),
  fit: fit.extend({ matchRating: number, points: fit, line: string }).optional(),
});

export interface BuildXiResult {
  verdict: AIVerdict;
  season: SeasonReport | null;
}

const resultSchema = z.object({
  verdict: z.object({ rating: string.min(1), headline: string, analysis: string }), season: season.nullable(),
});

export function loadBuildXiDraft() {
  const raw = safeLocalStorage.getItem(BUILD_XI_DRAFT_KEY);
  const empty = { raw, draft: null, result: null };
  try {
    const value = raw && JSON.parse(raw);
    if (value?.version !== 2) return { raw, draft: readBuildXiPicks(value), result: null };
    const draft = readBuildXiPicks(value.draft);
    const result = resultSchema.safeParse(value.result);
    return draft?.slots.length === 11 && result.success ? { raw, draft, result: result.data as BuildXiResult } : empty;
  } catch {
    return empty;
  }
}
