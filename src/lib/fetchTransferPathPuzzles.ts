import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import type { TransferPathPuzzle } from "@/data/transferPathPuzzles";

interface TransferPathRow {
  puzzle_id: string;
  player_a: string;
  player_b: string;
  min_steps: number;
  hint: string;
  sort_order: number;
}

export async function fetchTransferPathPuzzles(): Promise<TransferPathPuzzle[]> {
  try {
    // 970 rows and growing, page past the API's 1,000-row cap before it bites.
    const { data, error } = await fetchAllRows<TransferPathRow>((from, to) =>
      supabase
        .from("transfer_path_puzzles")
        .select("puzzle_id, player_a, player_b, min_steps, hint, sort_order")
        .order("sort_order", { ascending: true })
        .range(from, to),
    );

    if (error || !data || data.length === 0) {
      console.warn("[fetchTransferPathPuzzles] query failed or empty:", error);
      return [];
    }

    return data.map(row => ({
      id:       row.puzzle_id,
      playerA:  row.player_a,
      playerB:  row.player_b,
      minSteps: row.min_steps,
      hint:     row.hint,
      // oneOptimalPath intentionally omitted, unused at runtime
    }));
  } catch (err) {
    console.warn("[fetchTransferPathPuzzles] unexpected error:", err);
    return [];
  }
}
