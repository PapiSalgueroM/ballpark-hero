# DoUKnowBall Autopilot Brief
For: Claude Code running unsupervised
Owner: Anthony (review at end, not during)
Created: 2026-05-27

## Purpose
This brief lets Claude Code scale games autonomously across DoUKnowBall.com without supervision until completion or stop-condition. Read this entire document before starting work. When in doubt, follow the rules here rather than guessing.

## Source of truth documents
1. docs/GAMES_INVENTORY.md - all 44 games triaged with GREEN/YELLOW/RED ratings
2. docs/round4-plan.md - original scaling plan
3. docs/data/soccer-data.json - sourced player data (38 clubs + 8 tournaments)
4. docs/scripts/build-soccer-data.py - data scraper (rerun anytime for fresh data)

## Execution order (locked)
Follow the Scaling Plan in GAMES_INVENTORY.md exactly:
1. Shirt Number
2. Connections
3. Guess Soccer Club
4. Transfer Path
5. Higher or Lower
6. Guess The Year
7. Guess NFL Team
8. Guess The Nation
9. Baseball Connections
10. World Cup
11+ Continue with YELLOW games in inventory order
Later: RED games (see RED-game handling section below)

## Standard Operating Procedures (MANDATORY)

### File writes
- For ANY file over 50 lines: use chunked heredoc, max 100 lines per chunk
- After EVERY file write: verify with wc -l, grep counts, and (for Python) python -c "import ast; ast.parse(open('FILE').read()); print('SYNTAX OK')"
- NEVER use the Write tool for files over 100 lines - it corrupts long content
- If a heredoc returns "Parser aborted" or similar warnings, SPLIT into smaller chunks

### Commit message writes
- ALWAYS use heredoc to tmp_commit_msg.txt, NEVER -m "..." for multi-line
- ALWAYS verify with bash -c "cat tmp_commit_msg.txt" BEFORE git commit
- After commit: rm tmp_commit_msg.txt, then git push
- Format: subject line, blank line, body. No AI attribution.

### Locked files (DO NOT MODIFY)
- src/hooks/useDailyPuzzle.ts
- src/lib/dateUtils.ts
- All 17 Phase B migrated hooks
- src/hooks/useShirtNumber.ts, useCareerGame.ts, useTransferPath.ts, useGuessSoccerClub.ts, useSoccerGrid.ts, useConnections.ts

Adding rows to Supabase tables via migration files = ALLOWED.
Modifying these hooks = FORBIDDEN.

### Verification before every commit
1. git status (verify only intended files modified)
2. For SQL migrations: wc -c on the file (must be non-zero, proportional to row count)
3. For Python scripts: ast.parse check
4. For JSON: python -m json.tool FILE > /dev/null (validates JSON)
5. For commit message: bash -c "cat tmp_commit_msg.txt"
6. ONLY commit after all 5 pass

### Auto-compact recovery
If conversation compaction fires mid-task, before resuming run:
- git log --oneline -5
- ls -la docs/scripts/ docs/data/
- bash -c "cat docs/AUTOPILOT_BRIEF.md | head -20"
Then resume from the last completed step.


## GREEN Game Protocols (full autopilot)

For each GREEN game: build a Python generator script in docs/scripts/, run it, output a Supabase migration file, commit, push, move to next game.

### Protocol: Shirt Number (32 → 100, +68 puzzles)

PREREQUISITE: Hook is LOCKED. Confirm Supabase table `shirt_number_puzzles` exists by checking supabase/migrations/. Phase 0 retrofit may be needed if the hook reads from a hardcoded file - check src/hooks/useShirtNumber.ts. If retrofit needed, FLAG and skip to next game.

If table exists:

1. Build docs/scripts/build-shirt-number-puzzles.py (chunked):
   - Reads docs/data/soccer-data.json
   - For each club's squad, extracts player names
   - For famous players (Messi, Ronaldo, Mbappe, Haaland, etc), maps to their iconic shirt numbers from a curated dict inside the script
   - Outputs 68 new rows in INSERT SQL format
   - Skip players whose canonical number is uncertain

2. Curated iconic-number dict (add to script):
   Messi=10, Cristiano Ronaldo=7, Mbappe=10, Haaland=9, Bellingham=5, Vinicius Jr=7, Salah=11, Kane=9, De Bruyne=17, Modric=10, Pedri=8, Rodri=16, Lewandowski=9, Saka=7, Bukayo=7, Foden=47, Rodrygo=11, Camavinga=12, Tchouameni=14, Valverde=15, etc.

3. Write output to supabase/migrations/20260527_shirt_number_batch_autopilot.sql

4. Verify wc -c on SQL file (non-zero, ~10-20KB expected)
5. Commit + push.

### Protocol: Connections (185 → 250, +65 puzzles)

PREREQUISITE: Sourced data exists in docs/data/soccer-data.json. Confirm with: python -c "import json; d = json.load(open('docs/data/soccer-data.json', encoding='utf-8')); print(len(d['current_squads_2025_26']), 'squads;', len(d['tournament_winners']), 'tournaments')"

Must report 38 squads and 8 tournaments. If less, rerun docs/scripts/build-soccer-data.py first.

1. Build docs/scripts/build-connections-puzzles.py (chunked, max 100 lines per chunk):

The script generates 65 Connections puzzles deterministically from soccer-data.json. Each puzzle has 4 groups (easy/medium/hard/insane) of 4 players each.

Category sources:
- Easy: 'Current [Club] stars 2025-26' - 4 players from a squad. Pick 4 squads NOT already used in baseline. Reference docs/connections-batch1-categories.txt to dedupe.
- Medium: 'From [Country]' - 4 players sharing nationality. Use less-saturated nationalities (Mexico, Czechia, Poland, Slovakia, etc.). Build nationality lookup by mining soccer-data.json + WC/Euro/AFCON/Copa winner rosters as a proxy for country membership.
- Hard: 'Played for both [Club A] and [Club B]' - DEFER. Skip this category. The two-club crossover requires career-history data we don't have. Replace with: 'Scored 10+ goals at [Tournament]' or 'Won [Tournament] [Year]' - use tournament_winners data.
- Insane: 'Won [Tournament] [Year] with [Country]' - 4 players from a single tournament-winning squad. Pick 4 random from the 23-30 in each tournament_winners entry.

Constraints (HARD):
- 16 unique players per puzzle (no repeats within puzzle)
- No category string exact match against docs/connections-batch1-categories.txt
- Skip a category if can't fill with 4 confidently-real players from sourced data
- Skip a puzzle entirely if any category can't be filled - move to next puzzle

2. Output 65 INSERT rows to supabase/migrations/20260527_connections_batch2_autopilot.sql

3. Format match Batch 1 schema: puzzle_id (puzzle-156 onwards), sort_order (155 onwards), groups (JSONB with category/players/difficulty).

4. Append new category strings to docs/connections-batch1-categories.txt for future dedup.

5. Verify wc -c on SQL file. Commit + push.

### Protocol: Guess Soccer Club (82 → 150, +68 puzzles)

PREREQUISITE: Check current schema by reading the latest supabase/migrations/*soccer_club_puzzles*.sql. Confirm column names.

1. Build docs/scripts/build-soccer-club-puzzles.py:
   - For each club in soccer-data.json's CURRENT_SQUAD_URLS keys (38 clubs), generate 1-2 puzzles
   - Each puzzle: 4 clues progressively easier (founded year, league, kit color, most famous player)
   - Use a curated facts dict inside the script for clue text
   - Clue 1 (hardest): 'Founded in [year]' or 'Plays in [league]'
   - Clue 2: 'Kit colors: [colors]'
   - Clue 3: 'Most recent league title: [year]'
   - Clue 4 (easiest): 'Plays home games in [city]'
   
2. Source the facts from Wikipedia infoboxes via an extended scraper if needed - OR hardcode for the 38 clubs in soccer-data.json
3. Output to supabase/migrations/20260527_soccer_club_batch_autopilot.sql
4. Commit + push.

### Protocol: Guess The Nation (current → +30 countries)

PREREQUISITE: Read supabase/migrations/ for guess_nation_countries schema.

1. Build docs/scripts/build-nation-puzzles.py:
   - Use tournament_winners data + curated nationality lists
   - For 30 underrepresented countries (Czechia, Slovakia, Slovenia, Mali, Iraq, Iran, Mexico, Ecuador, Costa Rica, Jamaica, etc.) - 1 puzzle per country
   - 4 clues per country (population landmark, famous player, recent tournament, league)
2. Output migration. Commit + push.


## YELLOW Game Protocols (autopilot with checkpoint)

YELLOW games CAN be scaled by autopilot, but each needs a verification step. The pattern: generate proposed puzzles, output to a CANDIDATES file (not directly to a migration), log uncertainty notes for Anthony to review.

### General YELLOW workflow
1. Build the generator script (same chunked-heredoc protocol as GREEN)
2. Output to docs/candidates/[game-name]-batch.json instead of supabase/migrations/
3. Write a docs/candidates/[game-name]-REVIEW.md flagging:
   - Total candidates generated
   - Per-candidate confidence (high/medium/low)
   - Specific facts that need verification
4. Commit the candidates files
5. Move to next game - Anthony reviews candidates files in batch later

### Protocol: Transfer Path (21 → 50, +29 candidates)

PREREQUISITE: Check Supabase career_players (151 players) and career_seasons (1877 rows). The puzzle is "player A → player B via shared club chain". A puzzle is valid only if every transition in the chain matches actual career data.

1. Build docs/scripts/build-transfer-path-candidates.py:
   - Query (via local JSON snapshot or by writing a SQL query for Anthony to run): for each pair of players in career_players, check if they share at least one club via career_seasons
   - Generate "endpoint" puzzles: player A start at club X, player B end at club Y, intermediate clubs are the bridge
   - Output 30 candidates to docs/candidates/transfer-path-batch.json
2. Each candidate flagged with the exact path. Anthony spot-checks 5-10 manually.

### Protocol: Higher or Lower (~200 → expand pool)

PREREQUISITE: Hook reads hardcoded src/data/higherLowerPlayers.ts. Better long-term to migrate to Supabase player_market_values query. But that's a hook change to a LOCKED hook - skip the migration.

ALTERNATIVE: regenerate higherLowerPlayers.ts with more entries from player_market_values data.

1. Build docs/scripts/build-higher-lower-pool.py:
   - Read top 500 players from player_market_values (or use existing TM pipeline output if accessible from local files)
   - Output a fresh src/data/higherLowerPlayers.ts file with ~500 players
2. The src/ file IS auto-loaded by Vite on next build, so the hook doesn't need changes
3. Commit the new src/data/higherLowerPlayers.ts file directly (this is the EXCEPTION - it's a data file, not a hook)

NOTE: This requires Supabase data export which Claude Code may not have. If no access, FLAG and skip.

### Protocol: Guess The Year (~22 → 50, +28 candidates)

1. Build docs/scripts/build-guess-year-candidates.py:
   - Hardcoded list of 28 well-known soccer events with year + 4 clues each
   - Events: Maradona Hand of God 1986, Aguero title goal 2012, Bayern UCL final 2013, etc.
   - Use a curated dict for famous events (manageable - 28 items)
2. Output to docs/candidates/guess-year-batch.json
3. Anthony reviews historical accuracy + clue quality

### Protocol: Guess NFL Team (~32 → 50, +18 candidates)

1. Build docs/scripts/build-nfl-team-candidates.py:
   - 32 NFL teams - generate 1-2 puzzles per team
   - Curated facts dict per team (founding year, division, stadium, recent SB)
2. Output to docs/candidates/nfl-team-batch.json

### Protocol: Baseball Connections (~80 → 130, +50 candidates)

PREREQUISITE: Lahman MLB tables in Supabase. Same one-away-trap structural issue as soccer Connections.

1. Build docs/scripts/build-baseball-connections-candidates.py
2. Category sources (analogous to soccer):
   - 'Played for the [Team]'
   - 'Born in [State/Country]'
   - 'Won World Series with [Team]'
   - 'Hit 500+ career home runs' / 'Pitched a no-hitter' / etc.
3. Need a MLB data source - check supabase/migrations/ for Lahman exports, or build a small scraper from Baseball-Reference if needed.
4. Output to docs/candidates/baseball-connections-batch.json - 50 candidates

### Protocol: World Cup (~32 → 60, +28 candidates)

1. Build docs/scripts/build-world-cup-candidates.py:
   - Each candidate is a WC fact puzzle (year, host, winner, top scorer, famous moment)
   - 4 clues per candidate
2. Output to docs/candidates/world-cup-batch.json

### Protocol: F1 Driver, F1 Constructor, UFC, Score Predictor, Football Connect 4, Hockey HL, Teammates

For each: build a candidates generator using whatever sourced data is available. If no data source exists, write a stub script that explicitly flags "needs data pipeline" and continue to next game. Output flagged candidates to docs/candidates/[game].json with confidence ratings.


## RED Game Protocols (data-prep only, no full scaling)

RED games are interactive, simulation-based, edge-function-validated, or require multi-row career data authoring. Autopilot does NOT scale them but DOES contribute by improving their data foundations.

For each RED game in inventory: write a docs/candidates/red-[game-name]-notes.md file containing:
1. Game description (read from game's page/component file in src/pages/ or src/components/)
2. Data the game currently uses (read from hook + any local data files)
3. Data the game COULD benefit from (player attributes, current rosters, etc.)
4. Suggested next steps for human supervised work
5. If sourceable data exists for the game's domain (NBA rosters via web, NFL stats already in Supabase, etc.), GENERATE that data file as an additive contribution. Do NOT modify any hooks.

Example: For NFL Career game, autopilot could write docs/data/nfl-careers-extended.json sourced from Wikipedia, ready for human to integrate into the hook in a separate session.

For each RED game: spend at most 15 minutes of token budget. If data acquisition is non-trivial, write the notes file and move on.

## Stop Conditions

Autopilot STOPS and writes a status report when ANY of these occur:

1. **Token/context budget warning** — if auto-compact warning hits 5% remaining, stop work immediately, write status, commit.
2. **3 consecutive game failures** — if 3 games in a row hit blockers (missing data source, broken Supabase table, etc.), stop and surface the pattern.
3. **Migration file > 100KB** — too large, may indicate bad generation. Stop and flag.
4. **Any locked-file modification attempt** — autopilot must never touch the 17 locked hooks. Immediate stop.
5. **Git push failure** — if push errors (auth, network, conflict), stop and write status without retrying more than twice.
6. **Schema mismatch** — if a migration's INSERT fails because column names don't match, stop and flag the schema query needed.
7. **Completion** — when all GREEN + YELLOW games processed, write final status and stop.

## Completion Status Reporting

When autopilot stops (any reason), write docs/AUTOPILOT_STATUS.md with:

Required fields:
- Generated datetime
- Reason for stop (completion / error / budget / etc.)
- Games processed (per game: outcome - puzzles generated / candidates written / skipped)
- Games NOT processed (per game: reason)
- Files created (migrations, candidates, data, scripts)
- Migrations to apply (SQL files for Anthony to paste into Supabase, in order)
- Candidates to review (docs/candidates/* files for Anthony review)
- Blockers / unanswered questions
- Next session priority (recommended starting point)

## Launch instruction

When Anthony types "EXECUTE AUTOPILOT", Claude Code:
1. Reads this brief in full
2. Reads docs/GAMES_INVENTORY.md
3. Verifies state: git log -1, wc -l docs/data/soccer-data.json
4. Starts with priority 1 (Shirt Number) per scaling plan
5. Works sequentially through scaling plan, applying GREEN/YELLOW/RED protocols
6. Commits and pushes after EACH game completes
7. Continues until a Stop Condition fires
8. Writes AUTOPILOT_STATUS.md before halting

## End of Brief

This is the final document. All protocols and rules above are authoritative. When in doubt, FLAG and SKIP rather than guess. Never modify locked files. Never commit broken Python or unverified SQL.

