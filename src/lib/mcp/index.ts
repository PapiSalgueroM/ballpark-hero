import { defineMcp } from "@lovable.dev/mcp-js";
import listGamesTool from "./tools/list-games";
import mostPlayedTodayTool from "./tools/most-played-today";
import leaderboardTool from "./tools/leaderboard";

export default defineMcp({
  name: "douknowball-mcp",
  title: "DoUKnowBall",
  version: "0.1.0",
  instructions:
    "Tools for DoUKnowBall, a daily sports trivia site. Use `list_games` to discover games, `most_played_today` for today's most popular games, and `leaderboard_today` for the top scores in a given game today.",
  tools: [listGamesTool, mostPlayedTodayTool, leaderboardTool],
});
