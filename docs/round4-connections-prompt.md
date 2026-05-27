# Round 4 — Connections Batch 2 Framework

**Status:** Phase B (framework) — generation has NOT started
**Target:** 95 new puzzles (puzzle-156 → puzzle-250), sort_order 155-249
**Batch 1 baseline:** 155 puzzles live, 620 categories extracted to `docs/connections-batch1-categories.txt`
**Scope lock:** Soccer-only. No multi-sport crossovers. Matches Batch 1.

## Run plan

19 runs × 5 puzzles each = 95 total.

| Run | Puzzles            | Sort order  | Status     |
|-----|--------------------|-------------|------------|
| 1   | puzzle-156 to 160  | 155-159     | approved   |
| 2   | puzzle-161 to 165  | 160-164     | approved   |
| 3   | puzzle-166 to 170  | 165-169     | approved   |
| 4   | puzzle-171 to 175  | 170-174     | approved   |
| 5   | puzzle-176 to 180  | 175-179     | pending    |
| 6   | puzzle-181 to 185  | 180-184     | pending    |
| 7   | puzzle-186 to 190  | 185-189     | pending    |
| 8   | puzzle-191 to 195  | 190-194     | pending    |
| 9   | puzzle-196 to 200  | 195-199     | pending    |
| 10  | puzzle-201 to 205  | 200-204     | pending    |
| 11  | puzzle-206 to 210  | 205-209     | pending    |
| 12  | puzzle-211 to 215  | 210-214     | pending    |
| 13  | puzzle-216 to 220  | 215-219     | pending    |
| 14  | puzzle-221 to 225  | 220-224     | pending    |
| 15  | puzzle-226 to 230  | 225-229     | pending    |
| 16  | puzzle-231 to 235  | 230-234     | pending    |
| 17  | puzzle-236 to 240  | 235-239     | pending    |
| 18  | puzzle-241 to 245  | 240-244     | pending    |
| 19  | puzzle-246 to 250  | 245-249     | pending    |

## Puzzle structure (locked from Batch 1)

Each puzzle = 4 groups × 4 players = 16 unique players.

**Tier mapping (NYT Connections convention):**
- `"difficulty": "easy"` → yellow
- `"difficulty": "medium"` → green
- `"difficulty": "hard"` → blue
- `"difficulty": "insane"` → purple

**Each puzzle must have exactly one of each difficulty.**

**JSONB shape per row:**
```json
{
  "groups": [
    {"category": "...", "players": ["P1","P2","P3","P4"], "difficulty": "easy"},
    {"category": "...", "players": ["P1","P2","P3","P4"], "difficulty": "medium"},
    {"category": "...", "players": ["P1","P2","P3","P4"], "difficulty": "hard"},
    {"category": "...", "players": ["P1","P2","P3","P4"], "difficulty": "insane"}
  ]
}
```

## Tier style guide (extracted from Batch 1)

**Easy (yellow)** — Famous current rosters, common nationalities, well-known historical club ties.
- ✅ "Current Real Madrid stars 2025-26"
- ✅ "Played for Chelsea"
- ✅ "From Brazil"

**Medium (green)** — Less-saturated nationalities, regional league legends, mid-tier historical rosters.
- ✅ "From Senegal", "From Croatia"
- ✅ "Ligue 1 legends", "Liga NOS legends"
- ✅ "Played for Sporting CP"

**Hard (blue)** — Two-club crossovers, era-specific achievements, statistical thresholds.
- ✅ "Played for both Man Utd AND Chelsea"
- ✅ "Over 100 PL assists"
- ✅ "Retired in MLS"

**Insane (purple)** — Specific verifiable feats, award + constraint combos, rare statistical achievements.
- ✅ "Won Ballon d'Or before turning 22"
- ✅ "Scored on their CL debut AND final appearance"
- ❌ NO wordplay, puns, or theme-based grouping. Pure factual specificity.

## THE ONE-AWAY TRAP — critical constraint

**No player may legitimately fit two groups in the same puzzle.**

Example violation: if a puzzle has "From Brazil" (easy) and "Played for Real Madrid" (medium), Vinicius Jr. fits both → puzzle is broken. Solver guesses Vinicius for either group and is "one away" with no recoverable logic.

**QC rule:** For every puzzle, build a 16-player × 4-category matrix. Each player must have exactly ONE truthful category. If a player fits two, swap one player or restructure the category.

## Dedup baseline

**File:** `docs/connections-batch1-categories.txt` (620 lines, one category per line)

**Dedup rules for Batch 2 categories:**
1. **No exact string repeats** — `grep -Fx "category text" docs/connections-batch1-categories.txt` must return empty
2. **No near-paraphrases** — semantic check by main Claude during QC. Examples of disallowed near-paraphrases:
   - "Played for Chelsea" vs "Chelsea legends" → same group, different words
   - "Won CL with 2+ clubs" vs "Won CL with TWO different clubs" → identical (Batch 1 already has this internal dup; do not propagate)
   - "From Brazil" vs "Brazilian players" → same group
3. **Append to baseline after each approved run** — after Run N is approved, append its 20 new categories to `docs/connections-batch1-categories.txt` so Run N+1 sees them

## Saturation watch — avoid overusing in Batch 2

Batch 1 used these heavily. Batch 2 should rotate AWAY from them or use sparingly:

**Saturated nationalities** (used 5+ times in Batch 1, deprioritize):
- Brazil, Argentina, France, Germany, Spain, Italy, England, Portugal, Netherlands

**Underused nationalities** (good for Batch 2 medium tier):
- Uruguay, Colombia, Mexico, USA, Canada, Australia, Egypt, Algeria, Ivory Coast, Ghana, Cameroon, Mali, Burkina Faso, South Africa, Iran, Iraq, Saudi Arabia, Sweden, Norway, Denmark, Finland, Poland, Czechia, Slovakia, Ukraine, Russia, Greece, Turkey, Romania, Hungary, Switzerland, Austria, Belgium, Republic of Ireland, Scotland, Northern Ireland, Albania, North Macedonia, Bosnia, Slovenia, Georgia, Armenia, China, Thailand, Indonesia, New Zealand, Costa Rica, Panama, Honduras, Jamaica, Trinidad

**Saturated current-club rosters 2025-26** (used in Batch 1, deprioritize):
- Real Madrid, Barcelona, Bayern Munich, Man City, Liverpool, Arsenal, Chelsea, Man Utd, PSG, Tottenham

**Underused current clubs** (good for Batch 2 easy tier):
- Atletico Madrid, Inter Milan, AC Milan, Juventus, Napoli, Roma, Lazio, Atalanta, Borussia Dortmund, Bayer Leverkusen, RB Leipzig, Eintracht Frankfurt, Marseille, Lyon, Monaco, Lille, Newcastle, Aston Villa, Brighton, Brentford, West Ham, Everton, Sporting CP, Benfica, Porto, Braga, Ajax, PSV, Feyenoord, Galatasaray, Fenerbahce, Besiktas, Celtic, Rangers, Shakhtar Donetsk, Red Bull Salzburg, River Plate, Boca Juniors, Flamengo, Palmeiras, LAFC, Inter Miami, Al Hilal, Al Nassr, Al Ittihad

(Anthony / main Claude: this list isn't exhaustive — extend it as Batch 2 generates.)

## Generation prompt template (use in separate Claude.ai gen tab)

Copy-paste this into the Claude.ai puzzle-generation tab. Replace `{N}` with the run number, `{START}` with first puzzle_id, `{END}` with last.

```
Generate Connections puzzles {START} through {END} for DoUKnowBall. Soccer-only.

Rules:
- Each puzzle = 4 groups × 4 players = 16 unique players
- Exactly one each of difficulty: easy, medium, hard, insane
- Difficulty maps to color: easy=yellow, medium=green, hard=blue, insane=purple
- NO player may legitimately fit 2 groups in the same puzzle (one-away trap)
- All facts must be verifiable as of 2025-26 season
- Player names: use commonly-known form (e.g. "Vinicius Jr.", not "Vinicius Junior")
- Escape apostrophes for SQL: Ballon d'Or → Ballon d''Or, N'Golo Kante → N''Golo Kante

Category constraints:
- DO NOT reuse any category string from Batch 1 (I will paste the existing 620 categories below for reference)
- DO NOT near-paraphrase Batch 1 categories
- Avoid saturated nationalities: Brazil, Argentina, France, Germany, Spain, Italy, England, Portugal, Netherlands
- Avoid saturated current-club rosters: Real Madrid, Barcelona, Bayern, Man City, Liverpool, Arsenal, Chelsea, Man Utd, PSG, Tottenham
- Prefer underused nationalities and clubs (see framework doc)

Tier style:
- Easy: famous current rosters or common nationalities ("From Uruguay", "Current Atletico Madrid stars 2025-26")
- Medium: regional league legends, mid-tier nationalities, historical rosters ("Ligue 1 legends", "Played for Sporting CP", "From Egypt")
- Hard: two-club crossovers, statistical achievements ("Played for both Inter AND AC Milan", "Over 50 CL goals")
- Insane: specific verifiable feats ("Scored a hat-trick on Premier League debut", "Won UCL as captain")

Output format — give me exactly 5 puzzles in this JSON shape, ready to paste:

[
  {
    "puzzle_id": "puzzle-{N}",
    "sort_order": {SORT},
    "groups": [
      {"category": "...", "players": ["...","...","...","..."], "difficulty": "easy"},
      {"category": "...", "players": ["...","...","...","..."], "difficulty": "medium"},
      {"category": "...", "players": ["...","...","...","..."], "difficulty": "hard"},
      {"category": "...", "players": ["...","...","...","..."], "difficulty": "insane"}
    ]
  },
  ...
]

After generating, self-check each puzzle:
1. All 16 players unique within the puzzle? ✓
2. Each player fits ONLY their assigned category (no one-away trap)? ✓
3. All facts true as of 2025-26 season? ✓
4. Apostrophes escaped (Ballon d''Or)? ✓
5. Categories not in Batch 1 baseline? ✓
6. One each of easy/medium/hard/insane? ✓
```

(Below the prompt template above, the gen-tab prompt should be followed by Anthony pasting the contents of `docs/connections-batch1-categories.txt` as a reference dump.)

## QC checklist (run by main Claude per puzzle)

For each of the 5 puzzles in a run:

- [ ] 16 unique players, no repeats within puzzle
- [ ] Exactly one each of easy/medium/hard/insane
- [ ] **One-away trap check** — for every player, verify they fit ONLY their assigned category. Mentally test: "Could a solver legitimately put player X in any other group?"
- [ ] All facts verifiable for 2025-26 season
- [ ] No category appears in Batch 1 baseline (exact or near-paraphrase)
- [ ] No category duplicates any earlier puzzle in current Batch 2 run
- [ ] Apostrophes SQL-escaped (`''` not `'`)
- [ ] Player names in commonly-known form
- [ ] Difficulty tier matches category style (easy ≠ insane-level trivia, etc.)
- [ ] Insane tier is fact-based, not wordplay

Approval bar: 5/5 puzzles pass = run approved → migrate categories to baseline file → next run.
If 1+ puzzles fail: send back to gen tab with specific feedback.

## Phase D — migration protocol (when all 19 runs approved)

Identical to SoccerGrid Batch 2B migration protocol:
1. Build single migration file: `supabase/migrations/20260527000001_connections_puzzles_batch2.sql`
2. Use bash heredoc with RELATIVE path:
```
   cat > supabase/migrations/20260527000001_connections_puzzles_batch2.sql << 'EOF'
   INSERT INTO connections_puzzles (puzzle_id, sort_order, groups_json) VALUES
   ('puzzle-156', 155, '{...}'::jsonb),
   ...
   ('puzzle-250', 249, '{...}'::jsonb);
   EOF
```
3. `wc -c` verification — must be non-zero, proportional to 95 rows
4. Visual inspection in VS Code
5. Manual paste into Supabase SQL Editor
6. Verify: `SELECT COUNT(*) FROM connections_puzzles;` returns 250
7. Verify: `SELECT puzzle_id, sort_order FROM connections_puzzles ORDER BY sort_order;` shows 0-249 contiguous
8. Commit migration file (separate commit)
9. Update this doc with "MIGRATION APPLIED" status (separate commit)

## Locked files — DO NOT MODIFY

Per Phase B migration of earlier rounds:
- `src/hooks/useConnections.ts` — locked, do not touch
- `src/hooks/useDailyPuzzle.ts` — locked
- `src/lib/dateUtils.ts` — locked
- All 17 Phase B migrated hooks — locked

Adding rows to Supabase via migration = fine. Modifying these hooks = NO.

## Session log

- **2026-05-27** — Phase B framework doc created. Run 1 pending.
- **2026-05-27** — Run 1 approved (puzzle-156 to 160). 5/5 passed QC. 20 categories added to baseline. 90 puzzles remaining.
- **2026-05-27** — Run 2 approved (puzzle-161 to 165). 5/5 passed QC (3 v2/v3 iterations needed). 20 categories added to baseline. 85 puzzles remaining.
- **2026-05-27** — Run 3 approved (puzzle-166 to 170). 5/5 passed QC (3 v2/v3 iterations needed). 20 categories added to baseline. 80 puzzles remaining.
- **2026-05-27** — Run 4 approved (puzzle-171 to 175). 5/5 passed QC on v1 (first single-pass run). 20 categories added to baseline. 75 puzzles remaining.
