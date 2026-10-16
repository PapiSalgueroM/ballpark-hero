import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import type { TransferPathPuzzle, TransferPathRuleHint } from "@/data/transferPathPuzzles";

interface TransferPathRow {
  puzzle_id: string;
  player_a: string;
  player_b: string;
  min_steps: number;
  hint: string;
  sort_order: number;
  /* Round 460: the same pair under each special rule, derived per rule by
     scripts/genTransferPathHints.mjs. A null pair means no path under that rule. */
  active_min_steps: number | null;
  active_hint: string | null;
  europe_min_steps: number | null;
  europe_hint: string | null;
}

/** Fails closed: a half written pair (a minimum without its hint, or the reverse) reads as no path. */
function ruleHint(minSteps: number | null, hint: string | null): TransferPathRuleHint | null {
  if (typeof minSteps !== "number" || typeof hint !== "string" || hint.length === 0) return null;
  return { minSteps, hint };
}

export async function fetchTransferPathPuzzles(): Promise<TransferPathPuzzle[]> {
  try {
    // 970 rows and growing, page past the API's 1,000-row cap before it bites.
    const { data, error } = await fetchAllRows<TransferPathRow>((from, to) =>
      supabase
        .from("transfer_path_puzzles")
        .select("puzzle_id, player_a, player_b, min_steps, hint, sort_order, active_min_steps, active_hint, europe_min_steps, europe_hint")
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
      active:   ruleHint(row.active_min_steps, row.active_hint),
      europe:   ruleHint(row.europe_min_steps, row.europe_hint),
      // oneOptimalPath intentionally omitted, unused at runtime
    }));
  } catch (err) {
    console.warn("[fetchTransferPathPuzzles] unexpected error:", err);
    return [];
  }
}
