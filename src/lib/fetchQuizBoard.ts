import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const VALUES = [200, 400, 600, 800, 1000] as const;
export type ClueValue = (typeof VALUES)[number];

export interface Clue {
  clueId: string;
  category: string;
  clue: string;
  answer: string;
  eventYear: number;
  value: ClueValue;
}

/**
 * Clue bank from public.jeopardy_clues (the table name is the live one in
 * Supabase and cannot change without a migration), generated in SQL from the verified
 * champions tables so the board can never drift from the source data.
 *
 * The view deliberately excludes most of soccer_league_champions. Audit
 * 2026-07-15 found only two trustworthy leagues in it (English Premier League,
 * English First Division); every other league has duplicated years, and its
 * top_scorer column holds the RUNNER-UP for La Liga rather than a scorer. Don't
 * widen this query to other leagues without re-auditing them.
 */
export async function fetchQuizBoardClues(): Promise<Clue[]> {
  try {
    const { data, error } = await fetchAllRows<{
      clue_id: string; category: string; clue: string;
      answer: string; event_year: number; value: number;
    }>(
      (from, to) =>
        supabase
          .from('jeopardy_clues')
          .select('clue_id, category, clue, answer, event_year, value')
          .range(from, to),
      1000,
    );

    if (error || !data || data.length === 0) {
      console.warn('[fetchQuizBoardClues] empty/error', error);
      return [];
    }

    return data
      .filter(r => r.clue_id && r.category && r.clue && r.answer)
      .map(r => ({
        clueId: r.clue_id,
        category: r.category,
        clue: r.clue,
        answer: r.answer,
        eventYear: r.event_year,
        value: r.value as ClueValue,
      }));
  } catch (err) {
    console.warn('[fetchQuizBoardClues] unexpected', err);
    return [];
  }
}
