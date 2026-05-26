import { supabase } from "@/integrations/supabase/client";
import type { TransferPathPuzzle } from "@/data/transferPathPuzzles";

export async function fetchTransferPathPuzzles(): Promise<TransferPathPuzzle[]> {
  try {
    const { data, error } = await supabase
      .from("transfer_path_puzzles")
      .select("puzzle_id, player_a, player_b, min_steps, hint, sort_order")
      .order("sort_order", { ascending: true });

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
      // oneOptimalPath intentionally omitted — unused at runtime
    }));
  } catch (err) {
    console.warn("[fetchTransferPathPuzzles] unexpected error:", err);
    return [];
  }
}
