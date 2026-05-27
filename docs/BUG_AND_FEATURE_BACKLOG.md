# DoUKnowBall — Comprehensive Bug & Feature Backlog
Source: Anthony's live-site QA review (mobile, 2026-05-27)
Owner: Anthony | Executor: Claude Code (autonomous with end-of-session review)

## Execution philosophy

For each item below, Claude Code follows this loop:
1. Read the relevant hook + page component files to understand current implementation
2. Implement the fix following the EXACT steps provided
3. Run the verification command provided
4. Visual check if a UI change (run dev server, take screenshot if possible, or commit and let Vercel/Lovable rebuild)
5. Commit with descriptive message (subject + body, no AI attribution, no emojis)
6. Push to origin
7. Update this file: change Status from TODO to DONE with commit hash
8. Move to next item

**Default decisions when ambiguous:**
- Tier names not specified: pick gem/metal hierarchy (Diamond/Ruby/Emerald/Sapphire/Gold/Silver/Bronze) and document in docs/DECISIONS.md
- Colors not specified: match the game's existing theme palette
- Library not specified: prefer libraries already in package.json (e.g. shadcn/ui Command for autocomplete is already there)
- Supabase column doesn't exist: write migration to ADD it before code change
- Unsure how a game mechanic should work: search the web for similar games (NYT Connections, Immaculate Grid, Footle, Worldle, Tradle) and match the pattern, document choice
- Wikipedia URL 404: try 2 variants then skip
- Stuck for over 60 min on one item: flag in docs/BLOCKERS.md and move on

**Locked files — NEVER modify (will break daily-puzzle rotation):**
- src/hooks/useDailyPuzzle.ts
- src/lib/dateUtils.ts
- src/hooks/useShirtNumber.ts
- src/hooks/useCareerGame.ts
- src/hooks/useTransferPath.ts
- src/hooks/useGuessSoccerClub.ts
- src/hooks/useSoccerGrid.ts
- src/hooks/useConnections.ts

Adding rows to Supabase tables = ALLOWED.
Adding new pages/routes = ALLOWED.
Adding new components = ALLOWED.
Modifying these specific hook files = FORBIDDEN. If a bug fix requires modifying a locked hook, document it in docs/BLOCKERS.md and move on.

**Commit format:**
- Subject line: "fix(game-name): brief description" or "feat(game-name): brief description"
- Blank line
- Body: what was wrong, what was changed, how to verify
- Use tmp_commit_msg.txt heredoc pattern, never -m flag for multi-line
- Verify with bash -c "cat tmp_commit_msg.txt" before commit
- After commit: rm tmp_commit_msg.txt, then git push

**Status tracking:** Each item has **Status:** TODO. When done, replace with **Status:** DONE — commit <hash>

---

## Severity definitions

| Severity | Meaning | Order |
|---|---|---|
| **P0** | Broken — game or feature does not work | First |
| **P1** | UX bug — works but wrong behavior or confusing | Second |
| **P2** | Feature request — new functionality | Third |
| **P3** | Content scaling — more puzzles/data | Fourth |

Complexity estimates:
- **S** (Small): under 30 min — single file/component
- **M** (Medium): 30 min - 2 hrs — multi-file change
- **L** (Large): half day — multiple components + data work
- **XL** (Extra-large): full day+ — major redesign or new pipeline

---


## P0 — BROKEN (must fix to make site usable)

### P0-1: Football Grid — autocomplete missing on player name input
**Game:** Football Grid | **Complexity:** M | **Status:** TODO

**Problem:** No suggestions appear when user types a player name. Users must type exact full name.

**Files to read:** src/hooks/useFootballGrid.ts, src/pages/FootballGrid.tsx, src/data/footballGridPuzzles.ts

**Fix steps:**
1. Find the input component for player name entry
2. Confirm shadcn/ui Command (cmdk) is in package.json
3. Query Supabase nflfastr_player_stats for distinct player_name on mount, cache in state
4. Replace plain Input with shadcn/ui Command component
5. Filter as user types (case-insensitive substring, show top 8)
6. On selection, fill input

**Verification:** Type "tom b" at /football-grid, see "Tom Brady" suggestion, click fills input.

**Done when:** Autocomplete shows after 2+ chars, suggestions clickable, input fills.

---

### P0-2: Football Grid — guessing does not register correct OR incorrect answers
**Game:** Football Grid | **Complexity:** L | **Status:** TODO

**Problem:** Submitting any answer consumes a guess but does not update cell state. Game is completely broken.

**Files to read:** src/hooks/useFootballGrid.ts, src/pages/FootballGrid.tsx

**Fix steps:**
1. Console.log at: guess submit, validation function, state setter
2. Fix stale closure: use functional setState setGuesses(prev => ...)
3. Normalize comparison: .trim().toLowerCase() on both sides
4. Correct → fill cell green with player name; incorrect → red flash, cell stays empty
5. Decrement guess counter; trigger game-over check at 0 or all cells filled

**Verification:** Correct answer fills cell green + counter drops. Wrong answer flashes red + counter drops. Nonexistent player shows toast, no counter change.

**Done when:** Both correct and incorrect answers update state visibly.

---

### P0-3: Football Grid — board resets on browser refresh
**Game:** Football Grid | **Complexity:** S | **Status:** TODO

**Problem:** Daily game gives a new board on every refresh and erases progress.

**Files to read:** src/hooks/useFootballGrid.ts, src/hooks/useDailyPuzzle.ts (LOCKED — read only)

**Fix steps:**
1. Find board selection — if using Math.random() or Date.now(), replace with date-seed pattern from useDailyPuzzle
2. Add localStorage persistence. Key: football-grid-state-YYYY-MM-DD. Value: JSON of guesses + completion.
3. On mount: load from localStorage if date matches
4. On every guess: save to localStorage
5. Next day: old state expires naturally

**Verification:** Play guesses, refresh, board same, answers preserved. New day shows fresh board.

**Done when:** Same daily board persists across refreshes.


### P0-4: Guess CBB Program — game never loads, stuck on "Loading program"
**Game:** Guess CBB Team / Program | **Complexity:** M | **Status:** TODO

**Problem:** /guess-cbb-team shows permanent "Loading program..." — game never appears.

**Files to read:** src/hooks/useCbbProgram.ts, src/pages/GuessCbbTeam.tsx, supabase/migrations/*cbb*.sql

**Fix steps:**
1. Check DevTools Network: does Supabase request return data or error?
2. Anthony runs in Supabase SQL editor: SELECT count(*) FROM cbb_programs; SELECT count(*) FROM cbb_daily;
3. If tables empty: write migration seeding 30+ D1 programs (Duke, UNC, Kentucky, Kansas, UCLA, etc.)
4. If hook bug: fix query column names
5. Add error UI: if fetch fails show "Could not load — try again" instead of infinite spinner

**Verification:** /guess-cbb-team loads within 3 seconds with a real puzzle, or shows clean error.

**Done when:** Game loads and is playable.

---

### P0-5: NBA Build Your Starting 5 — error on lineup evaluation
**Game:** NBA Starting 5 | **Complexity:** M | **Status:** TODO

**Problem:** After all 5 players submitted, evaluation step throws an error.

**Files to read:** src/hooks/useNbaLineup.ts, src/pages/NbaStarting5.tsx, src/data/nbaTeams.ts, src/data/nbaStats.ts

**Fix steps:**
1. Reproduce and catch error in console
2. Add null-check on every player object before reading attributes
3. Guard Math operations against empty arrays
4. Wrap evaluation in try/catch with user-friendly fallback
5. Also: lock positions (player can only fill positions they played), capitalize player name display

**Verification:** Submit valid 5-player lineup, evaluation runs, score appears, no console error.

**Done when:** Lineup evaluation runs without error, score and breakdown display.

---

### P0-6: Report buttons site-wide — owner cannot view submitted reports
**Game:** All games (site-wide) | **Complexity:** M | **Status:** TODO

**Problem:** Users submit reports but Anthony has no admin view to read them.

**Files to read:** grep src/ for "report" to find button component and submission logic; check supabase/migrations/ for the reports table.

**Fix steps:**
1. Identify report table (likely question_reports per migrations)
2. Build route /admin/reports
3. Admin route guard: only visible if auth user email matches ADMIN_EMAIL env var
4. Simple list view: report ID, game, puzzle ID, notes, timestamp — sorted newest first
5. Add "Mark resolved" toggle

**Verification:** Submit test report, log in as Anthony, navigate to /admin/reports, see it listed.

**Done when:** Anthony can view all submitted reports from one admin page.


---

## P1 — UX BUGS (works but wrong/confusing)

### P1-1: Home Screen — "be the first to play today" is misleading
**Game:** Home / landing page
**Complexity:** M
**Status:** TODO

**Problem:** Home shows "be the first to play today" even when many users have played. Likely because the counter only includes signed-in users. Anthony also sees this in incognito while logged in elsewhere — suggests it is not tracking anonymous sessions properly.

**Fix:**
1. Replace with EITHER:
   (a) "X people playing now" (active session count from last 5 minutes)
   (b) "X plays today" (cumulative count from midnight UTC)
2. Track via Supabase function or a simple play_events table with anonymous session IDs (use localStorage UUID, not auth.uid)
3. Insert event on game start for every visitor, not just authenticated
4. Replace label dynamically based on count

**Done when:** Count reflects actual usage including anonymous users.

---

### P1-2: Home Screen — same game suggested every visit
**Game:** Home
**Complexity:** S
**Status:** TODO

**Problem:** "Suggested game" always defaults to the same one.

**Fix:** Rotate suggestion based on date-seed OR random selection from games not played today by this session. Use localStorage to track today's plays.

**Done when:** Suggested game varies between visits and across days.

---

### P1-3: Football Grid — only 3 rarity tiers, need 6-7 with thematic names
**Game:** Football Grid
**Complexity:** S
**Status:** TODO

**Problem:** Rarity tiers: rare/uncommon/standard. Should be 6-7 tiers with cooler names.

**Fix:** Implement tier hierarchy (from rarest to most common):
1. Phoenix (top 0.1% of correct answers)
2. Diamond (0.1-1%)
3. Ruby (1-3%)
4. Emerald (3-7%)
5. Sapphire (7-15%)
6. Gold (15-30%)
7. Silver (30-60%)
8. Bronze (60%+)

Pick a color for each. Update the rarity calc to bucket by percent of users who got it right. Show tier badge after each correct answer.

**Done when:** 8 tiers visible, color-coded, displayed after correct guesses.

---

### P1-4: Football Timeline — confusing wording on ordering task
**Game:** Football Timeline
**Complexity:** S
**Status:** TODO

**Problem:** Users mix up the ordering direction. Also: when user gets order wrong, the year shown next to a player is the year of the player who should be in that slot, not the actual draft year of the player there.

**Fix:**
1. Update instruction text: "Drag to order from earliest draft year (top) to most recent (bottom)"
2. On incorrect submission, show each player's actual draft year next to their name (not the expected year for that slot)

**Done when:** Instructions are unambiguous AND wrong-order display shows actual draft years.

---

### P1-5: Share buttons — vertical layout looks bad
**Game:** Site-wide (after game completion)
**Complexity:** S
**Status:** TODO

**Problem:** Share buttons stacked vertically. Should be horizontal.

**Fix:** Change container from flex-col to flex-row gap-2 (Tailwind). Wrap to 2 rows if too wide on narrow screens.

**Done when:** Share buttons sit in a horizontal row on all viewport widths.

---

### P1-6: Football Draft Guesser — flat scoring removes incentive
**Game:** Football Draft Guesser
**Complexity:** M
**Status:** TODO

**Problem:** Get the round right = 10 points regardless of clues used. No incentive to guess early.

**Fix:** Tiered scoring based on clues used before guess:
- Correct on clue 1: 30 pts
- Correct on clue 2: 25 pts
- Correct on clue 3: 20 pts
- Correct on clue 4: 15 pts
- Correct on clue 5: 10 pts
- Correct on clue 6+: 5 pts
- Wrong: 0 pts

Bonus: exact pick number (not just round) = +20 pts.

**Done when:** Scoring varies by clues-used AND there is a bonus for exact pick.


### P1-7: NFL Conquest — map territory needs city-coordinate splitting
**Game:** NFL Conquest | **Complexity:** XL | **Status:** TODO

**Problem:** States with multiple NFL teams need city-based splitting (NY/NJ has Giants+Jets, CA has 49ers+Rams+Chargers, TX has Cowboys+Texans, OH has Bengals+Browns, FL has Dolphins+Jaguars+Buccaneers, PA has Eagles+Steelers).

**Fix:**
1. Get coordinates for each NFL team home city
2. For states with multiple teams: split via Voronoi diagram (use d3-geo-voronoi or similar)
3. Each territory gets team primary color
4. Team city name labels centered in each territory region

**Sub-items:**
- Single-team states: whole state in team color
- Multi-team states: Voronoi split
- States with no NFL team: neutral gray
- Team labels: bold, centered, white-with-outline for contrast

**Files to modify:** src/data/usStatesPaths.ts, src/hooks/useConquest.ts, src/components/Conquest*.tsx

**Done when:** Map shows correct geographic splits with team colors and centered labels.

---

### P1-8: NFL Conquest — add side panel for team standings
**Game:** NFL Conquest | **Complexity:** M | **Status:** TODO

**Problem:** No visible standings during gameplay.

**Fix:** Side panel showing remaining teams (sorted by rating, with W-L record) and eliminated teams (collapsed). Collapsible on mobile, always-visible on desktop.

**Done when:** Side panel shows remaining + eliminated with records.

---

### P1-9: Guess The College — hints are too vague
**Game:** Guess The College | **Complexity:** M | **Status:** TODO

**Problem:** Hints like "vibe: southern" then "region: southeast" are not useful.

**Fix:** For each D1 school, store specific facts: famous alumni (athletes, presidents), stadium/arena name, chants/songs, founded year, conference, championship count, mascot, colors. Create docs/data/d1-schools.json sourced from Wikipedia.

**Done when:** Hints are specific, vary by school, reveal info progressively.

---

### P1-10: Guess NFL Team — hints too easy/vague
**Game:** Guess NFL Team | **Complexity:** M | **Status:** TODO

**Problem:** Hint 2 reveals region — too easy. Need specific year/opponent-style hints.

**Fix:** New hint format: "Lost SB to the 49ers in 1994", "Drafted Tom Brady in 2000", "Last playoff appearance: 2019". Build src/data/nflTeamFacts.ts with 10+ specific facts per team in difficulty order.

**Done when:** Hints are specific, fact-based, and progressively easier.

---

### P1-11: NBA Build Your Starting 5 — multiple usability issues
**Game:** NBA Starting 5 | **Complexity:** M | **Status:** TODO

**Problems:** Can not click court positions to add players; players placed in invalid positions; no autocomplete; previous name lingers in input; allows any player not just roster-eligible; names not capitalized.

**Fixes:**
1. Make court position circles clickable — opens position-specific input
2. Lock positions: only allow valid placements from player career data
3. Add Command autocomplete with team-filtered player list
4. Reset input on submit
5. Filter players to team-roster only
6. Capitalize names with toTitleCase utility

**Done when:** All 6 issues resolved, lineup-building feels intuitive.

---

### P1-12: Football Grid — unlimited guesses toggle
**Game:** Football Grid | **Complexity:** S | **Status:** TODO

**Problem:** Limited guesses prevent score-chasing. Depends on P0-3.

**Fix:** After P0-3 ships, add settings toggle "Unlimited guesses mode" — disables guess counter. Default off; users opt in. Persists in localStorage.

**Done when:** Toggle exists, persists in localStorage, affects guess limit.


---

## P2 — FEATURES (new functionality)

### P2-1: NBA Connect 4 — more categories + multiplayer
**Game:** NBA Connect 4 | **Complexity:** L | **Status:** TODO

**Fix:**
1. Expand category data — use NBA data to generate 50+ category combinations (e.g., "Lakers AND played college at Kentucky", "drafted top 5 AND made All-Star")
2. Add real-time multiplayer using Supabase Realtime channels
3. Validate all category-player matches against actual NBA data

**Done when:** 50+ categories live, real-time 2-player mode works.

---

### P2-2: NBA Chain — redesign as "Golf" year-selection game
**Game:** NBA Chain | **Complexity:** XL | **Status:** TODO

**Mechanic rewrite:**
- Game shows: start player → end player + "Score to beat: N"
- User connects via shared teammates, each step requires selecting a specific YEAR both players overlapped on the same team
- Example: Embiid → Kyrie → user picks Embiid + Harden + Year 2022-23 (76ers), then Harden + Kyrie + exact Nets overlap year
- Score = steps used; lower is better (golf scoring)
- Year dropdown shows only valid overlap years between selected players

**Data needed:** NBA team rosters by season (Wikipedia or basketball-reference)

**Done when:** Game runs golf-style, year validation enforces exact overlap.

---

### P2-3: Hockey + Baseball games — match soccer/NFL/NBA format
**Game:** Hockey Career, Baseball Career, Hockey HL, Baseball Connections | **Complexity:** L | **Status:** TODO

**Fix:** Apply the same UX patterns now used in soccer/NFL/NBA equivalents to all 4 games:
- Autocomplete suggestions on inputs
- Rarity tier display
- Score tracking
- Daily puzzle persistence
- Share buttons (horizontal)
- Report button

**Done when:** All 4 games match the polish level of the soccer/NFL flagships.

---

### P2-4: Footle — restrict player pool + tier definitions
**Game:** Footle | **Complexity:** M | **Status:** TODO

**Fix:**
1. Active pool: top 150 players by 2026 market value from player_market_values table
2. Include all-time greats still active: Messi, Neymar, Suarez (verify each is active 2025-26)
3. Tier definitions (2026 stats only):
   - Easy: top 50 market value
   - Medium: rank 51-100
   - Hard: rank 101-200 OR low-rank but iconic
   - Insane: rank 201-500 OR niche-but-verified
4. Rebuild docs/scripts/build-footle-pool.py to generate pool with tier assignments

**Done when:** Pool reflects 2026 data, tiers map cleanly to difficulty.

---

### P2-5: Combine college games into unified hub
**Game:** Guess CBB Team + Guess The College + new CFB grid | **Complexity:** L | **Status:** TODO

**Fix:**
1. Build college games hub at /college
2. Sub-routes: /college/cfb-grid (3x3 for CFB), /college/cbb-grid (3x3 for CBB), /college/guess-program (existing fixed game)
3. Add new college games using same patterns as soccer/NFL (timeline, draft guesser)
4. Use d1-schools.json data from P1-9

**Done when:** Hub exists, all college games accessible from one entry, new games functional.

---

### P2-6: Site-wide — active player count + game variety on home
**Game:** Home / global state | **Complexity:** M | **Status:** TODO

(Relates to P1-1 and P1-2)

**Fix:**
- Live "X playing now" counter (5-min active window)
- "X plays today" cumulative
- Rotating "Featured game today" (date-seeded)
- "Trending games" (top 3 most-played in last 24h)

**Done when:** Home page shows real activity numbers and rotates featured content.


---

## P3 — CONTENT SCALING (more puzzles/data)

### P3-1: Shirt Number — 32 to 100 puzzles (+68)
Use docs/data/soccer-data.json + curated iconic-numbers dict (Messi=10, CR7=7, Mbappe=9, etc.). Output: supabase/migrations/20260527_shirt_number_batch.sql. **Status:** TODO

### P3-2: Connections — 185 to 300 puzzles (+115)
Use docs/data/soccer-data.json. Build deterministic generator. Categories: club rosters, nationalities (underused), tournament winners. NO two-club crossovers in autopilot (career data not sourced). Append to docs/connections-batch1-categories.txt. **Status:** TODO

### P3-3: Guess Soccer Club — 82 to 150 puzzles (+68)
Curated 4-clue puzzles per club. Source club facts from Wikipedia infoboxes. **Status:** TODO

### P3-4: Transfer Path — 21 to 50 (+29 candidates only)
Generate candidates from career_seasons table. Human verification needed. Output: docs/candidates/transfer-path-batch.json. **Status:** TODO

### P3-5: Higher or Lower — expand pool to 500
Pull top 500 from player_market_values. Output: regenerated src/data/higherLowerPlayers.ts. **Status:** TODO

### P3-6: Guess The Year — 22 to 50 (+28)
Curated famous events list. Output: candidates file for review. **Status:** TODO

### P3-7: Guess NFL Team — 32 to 75 (+43)
After P1-10 hint quality fix, generate batch using team facts. **Status:** TODO

### P3-8: Guess The Nation — expand to 80 countries
Use tournament winner rosters + curated facts. **Status:** TODO

### P3-9: Baseball Connections — 80 to 130 (+50 candidates)
Use Lahman MLB tables. Same generator pattern as soccer Connections. **Status:** TODO

### P3-10: World Cup — 32 to 60 (+28)
Curated WC facts. Output candidates file. **Status:** TODO

### P3-11: Soccer Grid — already at target (50). No work needed. **Status:** DONE

### P3-12: All other games (F1, UFC, Tennis, NASCAR, etc.)
For each game without a clear data pipeline: write docs/candidates/<game>-notes.md describing what data sourcing would be needed. Skip puzzle generation. **Status:** TODO

---

## How to execute this backlog

**Command:** "Read docs/BUG_AND_FEATURE_BACKLOG.md and execute every TODO item top to bottom. After each item: commit + push + mark Status DONE with commit hash. If blocked on any item, write to docs/BLOCKERS.md and continue to next. Never modify locked files."

**Expected per-item rhythm:**
1. Read relevant files
2. Implement fix
3. Verify (run dev server / check console / inspect file output)
4. Commit with subject + body via tmp_commit_msg.txt heredoc
5. Push
6. Update Status in this file to DONE — commit <hash>
7. Move to next item

**Halt conditions:**
- 3 consecutive item failures
- Migration file > 100KB (suspicious)
- Locked file modification attempted
- Git push fails twice
- Auto-compact at 5% — write status to docs/AUTOPILOT_STATUS.md and halt

**Status report on halt:** Write to docs/AUTOPILOT_STATUS.md:
- Items completed (with commit hashes)
- Items skipped (with reason in docs/BLOCKERS.md)
- Next recommended starting point

---

## End of Backlog

Total items: 6 P0 + 12 P1 + 6 P2 + 12 P3 = 36 items
Estimated effort: P0 ~4 hrs, P1 ~10 hrs, P2 ~15 hrs, P3 ~8 hrs (if data sources ready) = 37 hrs total

Anthony reviews docs/AUTOPILOT_STATUS.md whenever Claude Code halts.

