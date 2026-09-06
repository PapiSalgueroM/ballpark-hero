/**
 * ROUND 376: THE SLUG A GAME RECORDS UNDER IS NOT ALWAYS THE SLUG IT IS
 * ROUTED AT, AND EVERYTHING THAT JOINS THE TWO NEEDS TO KNOW THAT.
 *
 * `daily_completions.game_slug` is written by each game's own
 * `useGameCompletion(...)` call. Six of those names are not registry paths:
 * the four Conquest boards record as `<sport>-imperialism`, the Quiz Board
 * still records under the original route name it carried before Round 305
 * renamed it, and Guess The Club records as `guess-soccer-club-questions`.
 *
 * THE GAMES ARE NOT LOSING CREDIT, and that was checked rather than assumed:
 * `game_score_caps` carries caps under the SAME names the code writes, so
 * Round 360's allowlist accepts them and they score and rank normally. The
 * scoring pipeline agrees with itself.
 *
 * WHAT BROKE is every place a completion slug is looked up in the REGISTRY,
 * and all five live ones are `daily: true`, so both places bit:
 *   - Most Played Today dropped the entry, and if that took the list under
 *     three the whole section fell back to its curated trio while looking
 *     completely normal.
 *   - The daily checklist looked for `conquest` while the row said
 *     `conquest-imperialism`, so finishing the game never ticked the box.
 *
 * WHY THIS MAPS RATHER THAN RENAMES. Renaming what gets written would split
 * every one of these games' history across two slugs, would be rejected by the
 * score caps allowlist until matching rows were added, and the Quiz Board's
 * original name is in simNoRivalNames' LIVE_IDENTIFIERS list exactly because
 * changing it is a migration with a backfill rather than a find and replace.
 * The written name is the stable thing; the lookup is what was wrong.
 *
 * `scripts/simCompletionSlugs.mjs` holds both sides against each other: every
 * slug the source writes must resolve here, and every distinct slug in the live
 * table must resolve or be named below as retired.
 */
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';

/** Completion slug -> the registry path that game is routed at. */
export const COMPLETION_SLUG_TO_PATH: Record<string, string> = {
  'conquest-imperialism': '/conquest',
  'conquest-mlb-imperialism': '/conquest-mlb',
  'conquest-nba-imperialism': '/conquest-nba',
  'conquest-nhl-imperialism': '/conquest-nhl',
  /* Round 459 added the soccer map on the shared board, which records under
     the sport's gameId (src/data/soccerConquest.ts) rather than a quoted
     literal, so the scanners that read call sites for slugs never saw it and
     the review of that round found the Round 376 defect back: the daily chip
     never ticked, Most Played dropped the game and the Daily Legend badge
     could not be won. simDailyLegend is the fence that catches it. */
  'conquest-soccer-imperialism': '/soccer-conquest',
  /* Round 305 moved the Quiz Board to /quiz-board and kept its original name
     for the localStorage prefix and the Supabase table, because changing those
     is a migration. The completion slug is the same identifier and stays too,
     which is why it is written in the quoted form the rival-name guard's
     LIVE_IDENTIFIERS list allows. */
  'jeopardy': '/quiz-board',
  /* The game is currently commented out of the registry, so this resolves to
     nothing on purpose and the fence below knows that. */
  'guess-soccer-club-questions': '/guess-soccer-club',
};

/**
 * Slugs that appear in the live table and deliberately name no current game.
 * Each one needs a reason, so that "unresolvable" can never quietly become the
 * normal state of this file.
 */
export const RETIRED_COMPLETION_SLUGS: Record<string, string> = {
  'overrated-underrated': 'retired in Round 314, its route redirects',
  'tier-list': 'retired in Round 314, its route redirects',
  'lineup-builder': 'renamed before Round 300, historical rows only',
  'career-path': 'renamed before Round 300, historical rows only',
  'ufc-game': 'renamed to ufc, historical rows only',
  'cbb-program': 'renamed to guess-cbb-team, historical rows only',
  'nba-lineup': 'renamed to nba-starting-5, historical rows only',
  'tennis-player': 'renamed to guess-tennis-player, historical rows only',
  'blind-rank': 'renamed to rank-em, historical rows only',
  /* Round 480: these three carry a score cap on purpose and no code can send
     them, which is the shape simLeaderboardCaps section 6 now refuses unless
     it is written down here. Their caps are KEPT deliberately, the rule the
     caps migration states: dropping a retired game's cap makes points real
     players really earned vanish. Verified in git rather than taken from the
     migration's word: Stadium Draft was added by 38e35142 and removed with
     three other games by 9b31163c, and Darts was added by 2c5d4f72 and
     removed by the same commit. */
  'stadium-draft': 'Stadium Draft, added 38e35142 and removed by 9b31163c with three other weak games; its cap is kept so its historical points still count',
  'darts': 'the Darts 501 game, added 2c5d4f72 and removed by 9b31163c; cap kept for the same reason',
  /* The one of the three whose own history is thin: the slug never appears in
     src in any ref, so it is presumably how the Darts game keyed its
     completions from outside the pattern the scanner reads, or an early
     spelling. The caps migration lists it among the retirees it deliberately
     kept, and its rows stop when that game went, so it is declared on that
     authority and flagged here rather than quietly assumed. */
  'darts-501': 'the same Darts game under a second key; named in the 20260830 caps migration as a deliberate retiree, though the slug itself is not in any source ref',
};

/**
 * Resolve a recorded completion slug to its registry game.
 *
 * Takes the slug as written into the table, not a path. Returns undefined when
 * the slug names a retired game or one that is not currently routed, which is a
 * real answer rather than a failure: callers drop those.
 */
export function gameForCompletionSlug(slug: string): GameDef | undefined {
  const path = COMPLETION_SLUG_TO_PATH[slug] ?? `/${slug}`;
  return ALL_GAMES.find(g => g.path === path);
}

/** The completion slug a registry path records under. The inverse of the map. */
export function completionSlugForPath(path: string): string {
  const found = Object.entries(COMPLETION_SLUG_TO_PATH).find(([, p]) => p === path);
  return found ? found[0] : path.replace(/^\//, '');
}
