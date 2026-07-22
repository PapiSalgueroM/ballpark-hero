import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'F'];

export interface TransferCase {
  playerName: string;
  nationality: string;
  position: string;
  fromClub: string;
  toClub: string;
  moveYear: number;
  valueAtMove: number;
  valueAfter: number;
  pctChange: number;
  actualGrade: Grade;
}

/**
 * Real club-to-club moves with what actually happened to the player's value
 * three years on, from public.transfer_grade_pool.
 *
 * The grade is band-relative on purpose. The obvious version — "A = tripled in
 * value" — is broken: market values are integer millions capped at 216, so a
 * EUR 194m player literally cannot triple, and that scheme produced ZERO
 * A-grades above EUR 80m (0 of 54). Every marquee transfer was pre-doomed to
 * C/D/F by arithmetic. The view now grades on percentile within value band, so
 * an A means "beat comparable moves at the same price" and is reachable at
 * every level. Don't revert it to absolute multiples.
 */
export async function fetchTransferGrades(): Promise<TransferCase[]> {
  try {
    const { data, error } = await fetchAllRows<{
      player_name: string; nationality: string | null; position: string | null;
      from_club: string; to_club: string; move_year: number;
      value_at_move: number; value_after: number; pct_change: number;
      actual_grade: string;
    }>(
      (from, to) =>
        supabase
          .from('transfer_grade_pool')
          .select('player_name, nationality, position, from_club, to_club, move_year, value_at_move, value_after, pct_change, actual_grade')
          .gte('value_at_move', 25)
          .order('value_at_move', { ascending: false })
          .range(from, to),
      800,
    );

    if (error || !data || data.length === 0) {
      console.warn('[fetchTransferGrades] empty/error', error);
      return [];
    }

    return data
      .filter(r => r.player_name && r.from_club && r.to_club && r.nationality)
      .map(r => ({
        playerName: r.player_name,
        nationality: r.nationality!,
        position: r.position ?? 'Unknown',
        fromClub: r.from_club,
        toClub: r.to_club,
        moveYear: r.move_year,
        valueAtMove: r.value_at_move,
        valueAfter: r.value_after,
        pctChange: r.pct_change,
        actualGrade: r.actual_grade as Grade,
      }));
  } catch (err) {
    console.warn('[fetchTransferGrades] unexpected', err);
    return [];
  }
}
