import { supabase } from '@/integrations/supabase/client';
import { dailyDraw, shuffledRange } from '@/lib/dateUtils';

/**
 * Who'd They Beat? (Round 242): the champion is given, you name the team
 * they beat in the finals. Built directly on the loser columns completed
 * in Rounds 239 to 242, so every question, every correct answer and
 * every wrong option is a real finals participant read from the audited
 * tables. A distractor is always a real beaten finalist of the SAME
 * competition, just from a different year.
 *
 * simWhodTheyBeat.mjs proves a simulated year of questions honest.
 */

export interface FinalsCompDef {
  key: string;
  emoji: string;
  label: string;
  table: string;
  yearCol: string;
  winCol: string;
  loseCol: string;
  seriesCol: string;
  question: (winner: string, year: number) => string;
}

export const FINALS_COMPS: FinalsCompDef[] = [
  {
    key: 'sb', emoji: '🏈', label: 'Super Bowl',
    table: 'super_bowls', yearCol: 'year', winCol: 'winner', loseCol: 'loser', seriesCol: 'sb_number',
    question: (w, y) => `The ${w} won the Super Bowl played in ${y}. Who did they beat?`,
  },
  {
    key: 'nba', emoji: '🏀', label: 'NBA Finals',
    table: 'nba_finals', yearCol: 'year', winCol: 'winner', loseCol: 'loser', seriesCol: 'series_result',
    question: (w, y) => `The ${w} won the ${y} NBA Finals. Who did they beat?`,
  },
  {
    key: 'ws', emoji: '⚾', label: 'World Series',
    table: 'world_series_v2', yearCol: 'year', winCol: 'winner', loseCol: 'loser', seriesCol: 'series_result',
    question: (w, y) => `The ${w} won the ${y} World Series. Who did they beat?`,
  },
  {
    key: 'cup', emoji: '🏒', label: 'Stanley Cup Final',
    table: 'stanley_cup_finals_v2', yearCol: 'year', winCol: 'winner', loseCol: 'loser', seriesCol: 'series_result',
    question: (w, y) => `The ${w} won the Stanley Cup in ${y}. Who did they beat in the final?`,
  },
  {
    key: 'wnba', emoji: '🏀', label: 'WNBA Finals',
    table: 'wnba_finals', yearCol: 'year', winCol: 'winner', loseCol: 'loser', seriesCol: 'series_result',
    question: (w, y) => `The ${w} won the ${y} WNBA Finals. Who did they beat?`,
  },
];

export interface FinalsRow {
  year: number;
  winner: string;
  loser: string;
  series: string;
}

export interface BeatQuestion {
  compKey: string;
  emoji: string;
  question: string;
  options: string[];
  correctIndex: number;
  year: number;
  winner: string;
  /** shown on the reveal, e.g. "4-3" (or the Super Bowl number) */
  detail: string;
}

export async function fetchFinalsRows(def: FinalsCompDef): Promise<FinalsRow[]> {
  const q = supabase
    .from(def.table as never)
    .select(`${def.yearCol}, ${def.winCol}, ${def.loseCol}, ${def.seriesCol}`);
  const { data, error } = await (q as unknown as { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> }).limit(5000);
  if (error || !Array.isArray(data)) throw new Error(`${def.table} unavailable`);
  const out: FinalsRow[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const year = r[def.yearCol];
    const winner = r[def.winCol];
    const loser = r[def.loseCol];
    const series = r[def.seriesCol];
    if (typeof year !== 'number' || typeof winner !== 'string' || typeof loser !== 'string') continue;
    if (!winner.trim() || !loser.trim()) continue;
    out.push({ year, winner: winner.trim(), loser: loser.trim(), series: typeof series === 'string' ? series.trim() : '' });
  }
  return out;
}

/** One question for one competition. Deterministic per label. */
export function buildQuestion(def: FinalsCompDef, rows: FinalsRow[], label: string): BeatQuestion | null {
  if (rows.length < 8) return null;
  const row = rows[dailyDraw(rows.length, `${label}:row`)];
  // distractors: real beaten finalists of this competition, never the
  // correct answer and never the champion themselves
  const pool = [...new Set(rows.map(r => r.loser))].filter(t => t !== row.loser && t !== row.winner);
  if (pool.length < 3) return null;
  const picks: string[] = [];
  for (const i of shuffledRange(pool.length, `${label}:distract`)) {
    if (picks.length >= 3) break;
    picks.push(pool[i]);
  }
  const options = [row.loser, ...picks];
  // deterministic option order
  const order = shuffledRange(options.length, `${label}:order`);
  const shuffled = order.map(i => options[i]);
  return {
    compKey: def.key, emoji: def.emoji,
    question: def.question(row.winner, row.year),
    options: shuffled,
    correctIndex: shuffled.indexOf(row.loser),
    year: row.year, winner: row.winner,
    detail: def.key === 'sb' ? (row.series ? `Super Bowl ${row.series}` : '') : (row.series ? `Series: ${row.series}` : ''),
  };
}

export const BEAT_ROUNDS = 10;

/** Each competition exactly twice, shuffled, no back-to-back repeats. */
export function buildBeatSlots(keys: string[], seedPrefix: string): string[] {
  const a = shuffledRange(keys.length, `${seedPrefix}:passA`).map(i => keys[i]);
  const b = shuffledRange(keys.length, `${seedPrefix}:passB`).map(i => keys[i]);
  if (a.length > 1 && a[a.length - 1] === b[0]) b.push(b.shift() as string);
  return [...a, ...b];
}

export function buildQuestions(
  rowsByKey: Map<string, FinalsRow[]>,
  seedPrefix: string,
): BeatQuestion[] {
  const usable = FINALS_COMPS.filter(c => (rowsByKey.get(c.key)?.length ?? 0) >= 8);
  if (usable.length === 0) return [];
  const slots = buildBeatSlots(usable.map(c => c.key), seedPrefix).slice(0, BEAT_ROUNDS);
  const out: BeatQuestion[] = [];
  slots.forEach((key, i) => {
    const def = FINALS_COMPS.find(c => c.key === key);
    const rows = rowsByKey.get(key);
    if (!def || !rows) return;
    const q = buildQuestion(def, rows, `${seedPrefix}:slot${i}`);
    if (q) out.push(q);
  });
  return out;
}
