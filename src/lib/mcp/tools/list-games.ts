import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CATEGORIES } from "../../../data/gameRegistry";

export default defineTool({
  name: "list_games",
  title: "List games",
  description: "List all daily sports trivia games available on DoUKnowBall, optionally filtered by sport category.",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Optional sport category name (e.g. 'Soccer', 'NBA', 'NFL'). Case-insensitive."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category }) => {
    const filtered = category
      ? CATEGORIES.filter((c) => c.title.toLowerCase() === category.toLowerCase())
      : CATEGORIES;

    const games = filtered.flatMap((c) =>
      c.games.map((g) => ({
        category: c.title,
        label: g.label,
        path: g.path,
        description: g.description,
        daily: Boolean(g.daily),
        isNew: Boolean(g.isNew),
      })),
    );

    return {
      content: [{ type: "text", text: JSON.stringify(games, null, 2) }],
      structuredContent: { games },
    };
  },
});
