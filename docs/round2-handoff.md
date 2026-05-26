# DoUKnowBall — Round 2 Handoff
Date: 2026-05-25
Last commit: 7a36a64

## What shipped in Round 2
- Deleted Blurred Face game entirely (legal: player photos)
- Stripped Footle/Career club logos and crests (legal: IP)
- Added autocomplete dropdown to World Cup search (was missing entirely)
- Football Grid + College Grid: name leniency in validation edge functions, store fullName for display (fixes "Treveyon Henderson rejected" type bugs)
- Unicorn badge for N=1 grid selections (rarity > 100 = "🦄 Unicorn — Only you!")
- World Cup: skip duplicate Host Country clue when host == player country, shuffle middle clues with seeded PRNG (date-seeded for Daily, fresh random for Unlimited)

## 3 fixes marked "already correct" — user-reported bugs may still exist
These were not changed in Round 2 because the code looked right, but the user reported these as broken in testing:
- FIX 5: Homepage counter flickering every second — fetchStats has [] dep + 5min interval, but user saw flicker. Bug may be in a different component re-rendering.
- FIX 6: Auto-focus on grid cell click — all 3 search components have inputRef.current?.focus() in useEffect. May be a timing issue on mobile.
- FIX 8: Grid completion → daily_completions — all 3 grid hooks call useGameCompletion. But user reported "0/44 didn't increment" after playing. Likely the bug is in non-grid games not writing to daily_completions, or the Index.tsx read query.

These should be revisited in a final cleanup round (Round 4 or 5).

## Phase 1 Data Inventory Summary (verbal — docs/data-inventory.md is empty, write failed)
- Total games: 38
- Already wired to Supabase: 9 (NASCAR Driver, NASCAR Chain, Tennis Player, Tennis Chain, CBB Program, Guess the Nation, others)
- Needs wiring: 27 games using hardcoded src/data/*.ts files
- Partially wired: 5 (College Grid, Football Grid, Soccer Grid, HOF or Bust, Olympics — puzzles hardcoded, user selections in Supabase)

## Top wiring priorities (by line count)
- careerPlayers.ts: 2,874 lines (Career Path)
- connectionsPuzzles.ts: 1,799 lines (Connections)
- colleges.ts: 1,350 lines (Colleges)
- guess-soccer-club data: 1,151 lines
- Footle/players: 937 lines

## Sport → Supabase table mapping
- Soccer → player_market_values (176,415 rows)
- NFL → nflfastr_player_stats (134,470 rows)
- College → ncaa_player_stats (43,800 rows)
- NHL → nhl_draft (26,138 rows)
- NBA → nba_players_extended_v2 (5,135 rows)
- MLB → Lahman tables: batting, pitching, fielding, allstar, appearances (~422K rows)
- UFC/MMA → ufc_fights_v2 (3,917 rows)
- F1, Tennis, NASCAR, Olympic, Golf → pending design

## Next round: Round 3 = Data wiring
Per-sport sessions in this order, each a separate Claude Code session:
1. Soccer (Footle, World Cup, Career Path if soccer, Connections if soccer, Guess Soccer Club)
2. NFL (Guess NFL Team, Conquest, NFL Career Path, others)
3. College (CFB + CBB consolidation)
4. NHL + MLB (Hockey Career, Baseball Career, Baseball Connections)
5. F1, Tennis, NASCAR, UFC, Olympic, smaller games
6. Standardize the 5 partially-wired grid games

After Round 3: Round 4 = puzzle generators (50-200 puzzles per game stored in {game}_puzzles tables)
After Round 4: Round 5 = new puzzle TYPES / game redesigns (NBA Chain golf mode, Higher/Lower stat-based, etc.)
After Round 5: User does full playtest and produces final bug list.

## Working style notes for next Claude
- User wants minimal preamble, direct answers
- Push back when user wants to skip testing or bulk-fix without scoping
- User commits in single batches per round, not per-fix
- No AI attribution in commits
- Bun is the package manager, path: /c/Users/antho/.bun/bin/bun
- Always run TSC after edits: /c/Users/antho/.bun/bin/bun x tsc --noEmit
- Locked files (do NOT touch): src/hooks/useDailyPuzzle.ts, src/lib/dateUtils.ts, the 17 Phase B migrated hooks
