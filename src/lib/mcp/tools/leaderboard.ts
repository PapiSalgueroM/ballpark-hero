import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SUPABASE_URL = "https://flawuiqbvjobmkfkauhw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y";

export default defineTool({
  name: "leaderboard_today",
  title: "Leaderboard for today",
  description:
    "Return the top scoring players for a given DoUKnowBall game today (UTC). Uses each player's best score for the day.",
  inputSchema: {
    game: z
      .string()
      .min(1)
      .describe("Game slug (path without leading slash), e.g. 'soccer-grid' or 'guess-transfer-value'."),
    limit: z
      .number()
      .int()
      .optional()
      .describe("Number of leaderboard entries to return. Defaults to 25. Clamped between 1 and 100."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ game, limit }) => {
    const cap = Math.min(Math.max(typeof limit === "number" ? limit : 25, 1), 100);
    const slug = game.replace(/^\//, "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await (supabase.from as any)("game_completions")
      .select("player_name, score")
      .eq("game", slug)
      .eq("completed_on", today)
      .not("score", "is", null)
      .not("player_name", "is", null);

    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }

    const best = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ player_name: string; score: number }>) {
      const prev = best.get(row.player_name) ?? -Infinity;
      if (row.score > prev) best.set(row.player_name, row.score);
    }
    const ranked = [...best.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([player, score], i) => ({ rank: i + 1, player, score }));

    return {
      content: [{ type: "text", text: JSON.stringify({ date: today, game: slug, ranked }, null, 2) }],
      structuredContent: { date: today, game: slug, ranked },
    };
  },
});
