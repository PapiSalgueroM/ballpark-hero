import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SUPABASE_URL = "https://flawuiqbvjobmkfkauhw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y";

export default defineTool({
  name: "most_played_today",
  title: "Most played today",
  description:
    "Return the most-played DoUKnowBall games today (UTC), ranked by number of completions across all visitors.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .optional()
      .describe("Maximum number of games to return. Defaults to 10. Clamped between 1 and 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ limit }) => {
    const cap = Math.min(Math.max(typeof limit === "number" ? limit : 10, 1), 50);
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await (supabase.from as any)("game_completions")
      .select("game")
      .eq("completed_on", today);

    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ game: string }>) {
      counts.set(row.game, (counts.get(row.game) ?? 0) + 1);
    }
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([game, completions]) => ({ game, completions }));

    return {
      content: [{ type: "text", text: JSON.stringify({ date: today, ranked }, null, 2) }],
      structuredContent: { date: today, ranked },
    };
  },
});
