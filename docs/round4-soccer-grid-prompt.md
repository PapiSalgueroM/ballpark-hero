# Round 4 — SoccerGrid Batch 2A: Generation Prompt + Tracking Doc
Date: 2026-05-26

## Status
- Batch 2A target: **15 puzzles** (sg-016 through sg-030)
- Batch 2A current approved count: **15 / 15 ✅ COMPLETE**
- Migration applied: `20260526000005_soccer_grid_puzzles_batch2a.sql` — Supabase confirmed COUNT(*) = 30
- Next action: Batch 2B (sg-031 through sg-050, 20 puzzles) — unblocked at 100% pass rate

---

## Generation Prompt Template

Copy everything between the triple-dashes below and paste into a separate Claude.ai chat.
Before each run, fill in the two bracketed sections: **PUZZLE TYPES FOR THIS RUN** and **ALREADY APPROVED IN THIS BATCH**.

---

```
SOCCER GRID PUZZLE GENERATION

You are generating new puzzles for a daily sports trivia game called Soccer Grid. The game shows
a 3×3 grid. Players name a soccer/football player who satisfies BOTH the row attribute AND the
column attribute for each cell.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each puzzle has:
- puzzle_id: "sg-NNN" (I will specify the ID range for this run)
- rows: exactly 3 attributes (the row headers)
- cols: exactly 3 attributes (the column headers)

Each attribute:
- label: display text shown to users (see conventions below)
- type: MUST be one of exactly 8 values:
    club | nationality | league | award | position | champions_league | world_cup | misc

Label conventions (follow exactly):
- club        → "Played for [Club Name]"
- nationality → "[Nationality adjective]"  (e.g. "Brazilian", "Colombian", "Belgian")
- league      → "Played in [League Name]"  (e.g. "Played in Eredivisie", "Played in Primeira Liga")
- position    → use ONLY these four exact strings:
                  "Forward (FWD)"  |  "Midfielder (MID)"  |  "Defender (DEF)"  |  "Goalkeeper (GK)"
- champions_league → "Champions League Winner"
- world_cup        → "World Cup Winner"
- award       → "Golden Boot Winner"  OR  "Ballon d'Or Winner"  OR  "Europa League Winner"
- misc        → "Over 100 International Caps"  |  "Copa América Winner"  |  "UEFA Euro Winner"
                "African Cup of Nations Winner"  |  "Played in Saudi Pro League"  |  other milestones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY: CELL VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EVERY puzzle you generate, you MUST produce a 3×3 cell validation table.
For each of the 9 cells (row × col intersection), name AT LEAST 1 real player who satisfies
BOTH attributes.

Rules:
- The player must have actually played for the club, hold the nationality, played in the league,
  or won the award — no guesses.
- If you cannot name any player for a cell → mark it "DEAD CELL" → do NOT include that puzzle
  → propose a replacement attribute instead.
- If you can name only 1 player for a cell → mark it "MARGINAL (1 only): [name]" so the
  reviewer can decide.
- Aim for cells where 3–15 players satisfy both attributes (not 0, not 100+).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXISTING PUZZLES — DO NOT DUPLICATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following 15 puzzles already exist. No new puzzle may:
(a) repeat an identical 6-attribute set (order doesn't matter across rows+cols combined), OR
(b) share 3 or more attributes with any of these puzzles (order-insensitive).

sg-001 rows: Played for Barcelona, Played for Real Madrid, Played for Manchester United
       cols: Forward (FWD), Champions League Winner, World Cup Winner

sg-002 rows: Played for Chelsea, Played for AC Milan, Played for Bayern Munich
       cols: Midfielder (MID), Played in Premier League, Golden Boot Winner

sg-003 rows: Played for Liverpool, Played for Juventus, Played for PSG
       cols: Defender (DEF), Played in La Liga, Over 100 International Caps

sg-004 rows: Played for Arsenal, Played for Inter Milan, Played for Manchester City
       cols: Forward (FWD), Played in Serie A, Champions League Winner

sg-005 rows: Played for Atletico Madrid, Played for Borussia Dortmund, Played for Tottenham
       cols: Goalkeeper (GK), World Cup Winner, Played in Bundesliga

sg-006 rows: Brazilian, French, Argentine
       cols: Played for Real Madrid, Champions League Winner, Played in Ligue 1

sg-007 rows: Played for Roma, Played for Napoli, Played for AC Milan
       cols: Forward (FWD), Played in Serie A, Over 100 International Caps

sg-008 rows: Played for Barcelona, Played for Chelsea, Played for Bayern Munich
       cols: Midfielder (MID), World Cup Winner, Played in Premier League

sg-009 rows: German, Spanish, Italian
       cols: Defender (DEF), Champions League Winner, World Cup Winner

sg-010 rows: Played for Manchester City, Played for Liverpool, Played for Real Madrid
       cols: Forward (FWD), Played in La Liga, Golden Boot Winner

sg-011 rows: Played for PSG, Played for Juventus, Played for Arsenal
       cols: Midfielder (MID), Played in Ligue 1, Over 100 International Caps

sg-012 rows: Played for Tottenham, Played for Inter Milan, Played for Borussia Dortmund
       cols: Goalkeeper (GK), Champions League Winner, Played in Bundesliga

sg-013 rows: Portuguese, Dutch, English
       cols: Forward (FWD), Played in Premier League, Champions League Winner

sg-014 rows: Played for Barcelona, Played for Manchester United, Played for AC Milan
       cols: Defender (DEF), World Cup Winner, Played in Serie A

sg-015 rows: Played for Real Madrid, Played for Chelsea, Played for Liverpool
       cols: Played in MLS, Champions League Winner, Over 100 International Caps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALREADY APPROVED IN THIS BATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[PASTE PREVIOUSLY APPROVED PUZZLES HERE BEFORE RUNNING — same format as the existing puzzles
above. Leave blank on Run 1.]

Apply the same 3+ attribute overlap rule against these too.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSTRAINTS FOR THIS BATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ATTRIBUTE CAPS (track across all puzzles you generate in this session):
- "Champions League Winner": max 2 total across all 5 puzzles in this run
- "World Cup Winner": max 2 total across all 5 puzzles in this run
- "Forward (FWD)": max 2 total across all 5 puzzles in this run
- "Played for Real Madrid" (row OR col): max 1 total across all 5 puzzles in this run

NEW ATTRIBUTES TO INTRODUCE — prioritize using these (not required in every puzzle, but aim
for variety across the batch):
- Ballon d'Or Winner (type: award)
- Europa League Winner (type: award)
- Copa América Winner (type: misc)
- UEFA Euro Winner (type: misc)
- African Cup of Nations Winner (type: misc)
- Played in Eredivisie (type: league)
- Played in Primeira Liga (type: league)
- Played in Süper Lig (type: league)
- Played in Saudi Pro League (type: league)

NEW CLUBS TO PRIORITIZE (not yet used in existing 15 puzzles):
High priority: Ajax, Porto, Benfica, Sevilla, Lyon, Marseille, Galatasaray, Boca Juniors,
               River Plate, Flamengo
Medium priority: Bayer Leverkusen, Lazio, Fiorentina, Sporting CP, PSV, Feyenoord, Celtic,
                 Inter Miami

NEW NATIONALITIES TO PRIORITIZE (not yet used in existing 15 puzzles):
High priority: Colombian, Uruguayan, Belgian, Croatian, Senegalese, Ivorian, Polish
Medium priority: Norwegian, Welsh, Egyptian, Cameroonian, Moroccan, Serbian, Japanese,
                 South Korean

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUZZLE TYPES FOR THIS RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[FILL IN BEFORE EACH RUN — copy the appropriate line from the run schedule below:]

Run 1: 3 three-club-rows + 1 three-nationality-rows + 1 mixed-rows  (IDs: sg-016 to sg-020)
Run 2: 3 three-club-rows + 1 three-nationality-rows + 1 achievement-heavy  (IDs: sg-021 to sg-025)
Run 3: 2 three-club-rows + 1 three-nationality-rows + 1 mixed-rows + 1 achievement-heavy  (IDs: sg-026 to sg-030)

Row type definitions:
- three-club-rows: all 3 row attributes are clubs
- three-nationality-rows: all 3 row attributes are nationalities
- mixed-rows: 2 clubs + 1 nationality, OR 2 nationalities + 1 club, OR similar mix
- achievement-heavy: 0 position cols — all 3 cols are leagues, awards, or achievement misc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each puzzle, output:

1. PUZZLE [puzzle_id]
   rows:
     [row 1 label]  (type: [type])
     [row 2 label]  (type: [type])
     [row 3 label]  (type: [type])
   cols:
     [col 1 label]  (type: [type])
     [col 2 label]  (type: [type])
     [col 3 label]  (type: [type])

2. CELL VALIDATION TABLE:
   Format as a labeled grid. Rows = row attributes. Columns = col attributes.
   Each cell: player name(s), or DEAD CELL, or MARGINAL (1 only): [name].

3. NEAR-DUPLICATE CHECK: list any attributes shared with existing puzzles (must be ≤2 overlaps
   with any single existing puzzle).

Generate [N] puzzles now.
```

---

## QC Checklist

Apply per 5-puzzle run before adding candidates to the tracking table.

### Structural validation
- [ ] Exactly 3 rows and 3 cols per puzzle
- [ ] Each attribute has `label` (non-empty string) and `type`
- [ ] `type` is one of the 8 valid values: `club` `nationality` `league` `award` `position` `champions_league` `world_cup` `misc`
- [ ] Label follows exact format convention: `"Played for X"` for club, `"[Adjective]"` for nationality, `"Played in X"` for league, exact strings for position
- [ ] `puzzle_id` is in the correct range for this run (sg-016 through sg-030 for batch 2A)

### Cell validation
- [ ] All 9 cells have ≥1 named player (zero DEAD CELLs)
- [ ] MARGINAL cells (1 player only) flagged — acceptable if the single answer is a well-known player; reject if obscure
- [ ] No cell has a trivially obvious answer pool — signals the attribute pair is too broad (100+ valid players)

### Near-duplicate check
- [ ] Attributes shared with each existing sg-001 through sg-015: ≤2 per puzzle (order-insensitive across rows+cols)
- [ ] Attributes shared with other candidates in the same run: ≤2

### Attribute cap check (running tally — see cap tracker below)
- [ ] Champions League Winner total in batch 2A ≤ 2
- [ ] World Cup Winner total in batch 2A ≤ 3
- [ ] Forward (FWD) total in batch 2A ≤ 4
- [ ] Played for Real Madrid (row or col) total in batch 2A ≤ 1

### Factual spot-check (~3–4 cells per run, ~9–12 cells total across batch 2A)
- [ ] Pick the least-familiar or most specific claims to verify
- [ ] Always verify MARGINAL cells — the single named player must actually be valid
- [ ] Verify against Wikipedia career history, Transfermarkt, or equivalent
- [ ] Log each spot-checked cell and result in the tracking table notes column
- [ ] If a spot-checked cell fails → reject that puzzle → note failure type for template diagnosis

---

## Acceptance Criteria — Batch 2A

### Pass thresholds (evaluated after all 15 candidates reviewed)

| Pass rate | Action |
|---|---|
| **≥70% (≥11 of 15 pass QC)** | ✅ Proceed to Batch 2B |
| **50–69% (8–10 of 15 pass)** | Identify failure pattern → revise prompt template → regenerate failed candidates → re-evaluate before proceeding to 2B |
| **<50% (<8 of 15 pass)** | 🛑 STOP — fundamental issue with prompt or cell validation assumptions; full framework review required before any more generation |

### Stop-on-failure rule (applied per run of 5)
If a single run of 5 produces >30% rework (>1.5 puzzles need rework, i.e., 2 or more fail), treat as a batch failure signal. Do not start the next run until the failure pattern is identified and the prompt is revised.

### Failure pattern taxonomy (use to diagnose which part of the prompt to fix)
| Failure type | Diagnosis | Fix |
|---|---|---|
| Dead cells | Cell validation instruction too weak | Strengthen "DEAD CELL" definition; add example |
| Near-duplicate violations | Existing puzzle list not being followed | Reformat existing puzzles more prominently |
| Cap violations | Caps not being tracked by the model | Add "RUNNING TALLY" output field to format |
| Factual errors | Claude.ai wrong about career facts | Add explicit examples of known-valid players per new attribute |
| Too-broad cells | Caps not preventing trivial combos | Tighten cap constraints; add "avoid trivially easy cells" instruction |

### Partial-pass handling

If batch 2A produces fewer than 15 approved puzzles after all 3 runs (e.g., 11 pass, 4 fail), the options are:

**(a) Run 4 — regenerate failed puzzles with revised constraints** *(preferred if failure patterns are diagnosable)*
**(b) Commit batch 2A with fewer than 15 puzzles** (e.g., 11) and add the deficit to batch 2B's count — migration adjusted to match
**(c) Stop and revise the prompt template** before any more generation

**Default behavior:** Option (a) unless the failure rate is so high (<50%) that the stop-on-failure rule fires. Commit only when the batch hits the target count (15) OR when option (b) is explicitly chosen with the migration adjusted to match.

---

## Batch 2A Tracking Table

Updated after each run. Status values: `pending` / `approved` / `rejected` / `approved-marginal`

| puzzle_id | rows summary | cols summary | run # | status | notes |
|---|---|---|---|---|---|
| sg-016 | Ajax / Porto / Benfica | Premier League / FWD / CL Winner | 1 | approved | |
| sg-017 | Sevilla / Marseille / Galatasaray | Premier League / FWD / French | 1 | approved | |
| sg-018 | Bayer Leverkusen / Lazio / Sporting CP | MID / Premier League / CL Winner | 1 | approved | |
| sg-019 | Colombian / Uruguayan / Chilean | Barcelona / Premier League / Copa América Winner | 1 | approved | |
| sg-020 | Boca Juniors / River Plate / Croatian | Serie A / MID / La Liga | 1 | approved | |
| sg-021 | Fiorentina / Valencia / Villarreal | Argentine / La Liga / MID | 2 | approved | Argentine used as col (previously row in sg-006) |
| sg-022 | Celtic / PSV / Feyenoord | DEF / Premier League / Dutch | 2 | approved | Dutch used as col (previously row in sg-013) |
| sg-023 | Lyon / Monaco / Lille | DEF / Ligue 1 / Serie A | 2 | approved | |
| sg-024 | Belgian / Polish / Norwegian | Borussia Dortmund / Ligue 1 / GK | 2 | approved | |
| sg-025 | Man United / Bayern Munich / Juventus | Ballon d'Or Winner / WC Winner / 100 Caps | 2 | approved | First use of Ballon d'Or Winner |
| sg-026 | Newcastle / Everton / West Ham | Eredivisie / DEF / Serie A | 3 | approved | First use of Eredivisie |
| sg-027 | Eintracht Frankfurt / Schalke / Beşiktaş | Premier League / Süper Lig / MID | 3 | approved | First use of Süper Lig; ş/ü UTF-8 verified |
| sg-028 | Senegalese / Ivorian / Cameroonian | AFCON Winner / Ligue 1 / Chelsea | 3 | approved | First use of African Cup of Nations Winner |
| sg-029 | Real Madrid / Bayern Munich / Inter Milan | WC Winner / UEFA Euro Winner / Europa League Winner | 3 | approved | First use of UEFA Euro Winner + Europa League Winner |
| sg-030 | Liverpool / Chelsea / Man City | Saudi Pro League / GK / Brazilian | 3 | approved | First use of Saudi Pro League; Brazilian used as col |

**Batch 2A result:** 15 / 15 approved &nbsp;|&nbsp; Pass rate: **100%** &nbsp;|&nbsp; Decision: **Proceed to Batch 2B**

---

## Running Attribute Cap Tallies

Updated as each puzzle is approved. Hard limits are for the full 35-puzzle expansion (batch 2A + 2B combined). Batch 2A budgets are the per-batch allocations.

| Attribute | Batch 2A approved | Batch 2A budget | Full-35 limit | Remaining for 2B |
|---|---|---|---|---|
| Champions League Winner | **2** (sg-016, sg-018) | ≤ 2 ✅ | ≤ 5 | 3 |
| World Cup Winner | **2** (sg-025, sg-029) | ≤ 3 ✅ | ≤ 6 | 4 |
| Forward (FWD) | **2** (sg-016, sg-017) | ≤ 4 ✅ | ≤ 8 | 6 |
| Played for Real Madrid (row or col) | **1** (sg-029 row) | ≤ 1 ✅ | ≤ 2 | 1 |
| Ballon d'Or Winner | **1** (sg-025) | 1–2 ✅ | 2–4 | 1–3 |
| Europa League Winner | **1** (sg-029) | 1 ✅ | 1–3 | 0–2 |
| Copa América Winner | **1** (sg-019) | 1 ✅ | 1–2 | 0–1 |
| UEFA Euro Winner | **1** (sg-029) | 0–1 ✅ | 1–2 | 0–1 |
| African Cup of Nations Winner | **1** (sg-028) | 0–1 ✅ | 1–2 | 0–1 |
| Played in Eredivisie | **1** (sg-026) | 1–2 ✅ | 2–3 | 1–2 |
| Played in Primeira Liga | **0** ⚠️ not introduced | 1 | 1–2 | 1–2 (must add in 2B) |
| Played in Süper Lig | **1** (sg-027) | 0–1 ✅ | 1 | **0 — AT FULL CAP** |
| Played in Saudi Pro League | **1** (sg-030) | 0–1 ✅ | 1 | **0 — AT FULL CAP** |

---

## New Club/Nationality Coverage Log

Track which new clubs and nationalities have been introduced. Update as puzzles are approved.

**New clubs introduced (target: cover most high-priority clubs across all 35):**
- [x] Ajax (sg-016)
- [x] Porto (sg-016)
- [x] Benfica (sg-016)
- [x] Sevilla (sg-017)
- [x] Lyon (sg-023)
- [x] Marseille (sg-017)
- [x] Galatasaray (sg-017)
- [x] Boca Juniors (sg-020)
- [x] River Plate (sg-020)
- [ ] Flamengo — not yet introduced, candidate for Batch 2B
- [x] Bayer Leverkusen (sg-018)
- [x] Lazio (sg-018)
- [x] Fiorentina (sg-021)
- [x] Sporting CP (sg-018)
- [x] PSV (sg-022)
- [x] Feyenoord (sg-022)
- [x] Celtic (sg-022)
- [ ] Inter Miami — not yet introduced, candidate for Batch 2B

Additional clubs introduced (not in original checklist): Valencia (sg-021), Villarreal (sg-021), Monaco (sg-023), Lille (sg-023), Newcastle (sg-026), Everton (sg-026), West Ham (sg-026), Eintracht Frankfurt (sg-027), Schalke (sg-027), Beşiktaş (sg-027)

**New nationalities introduced (target: cover most high-priority nationalities across all 35):**
- [x] Colombian (sg-019)
- [x] Uruguayan (sg-019)
- [x] Belgian (sg-024)
- [x] Croatian (sg-020)
- [x] Senegalese (sg-028)
- [x] Ivorian (sg-028)
- [x] Polish (sg-024)
- [x] Norwegian (sg-024)
- [ ] Welsh — not yet introduced, candidate for Batch 2B
- [ ] Egyptian — not yet introduced, candidate for Batch 2B
- [x] Cameroonian (sg-028)
- [ ] Moroccan — not yet introduced, candidate for Batch 2B
- [ ] Serbian — not yet introduced, candidate for Batch 2B
- [ ] Japanese — not yet introduced, candidate for Batch 2B
- [ ] South Korean — not yet introduced, candidate for Batch 2B

Additional nationality: Chilean (sg-019, not in original list but valid addition)

Previously-seen nationalities used as col attributes for the first time: Argentine (sg-021), Dutch (sg-022), Brazilian (sg-030)

---

## Migration Plan

**Batch 2A file:** `supabase/migrations/20260526000005_soccer_grid_puzzles_batch2a.sql`

Rules:
- INSERT only — table already exists, no DDL
- Plain string literals for JSONB columns — no `::jsonb` explicit casts (lesson from Session 1g)
- No `ON CONFLICT` clause (lesson from Session 1g)
- sort_order: sg-016 = 15, sg-017 = 16, … sg-030 = 29
- Apply manually via Supabase SQL Editor
- Verify: `SELECT COUNT(*) FROM soccer_grid_puzzles` → expect 30 after apply

**Batch 2B file (planned):** `supabase/migrations/20260526000006_soccer_grid_puzzles_batch2b.sql`
- IDs: sg-031 through sg-050, sort_order 30–49
- Only written after Batch 2A passes QC (≥70% acceptance rate)

---

## Edge Function Note

The `soccer-grid-validate` function sends `rowAttribute` and `colAttribute` as raw label strings to Gemini 2.5 Flash (knowledge cutoff: March 2026). New attribute labels (Ballon d'Or Winner, Played in Eredivisie, Copa América Winner, etc.) work without any code change — Gemini interprets them via natural language.

**Label wording must be unambiguous.** The AI validator has no hardcoded lookup for new attributes; it uses general knowledge. Clearly worded labels like `"Played in Eredivisie"` and `"Copa América Winner"` are safe. Ambiguous labels like `"Top scorer"` or `"Major trophy winner"` would produce inconsistent results — avoid them.

**Pre-existing quirk:** `"Played in MLS"` uses `type: "misc"` in sg-015 (inconsistent with other league attributes). Do NOT fix this in a new migration (would require an UPDATE). All new league attributes use `type: "league"`.

---

## Lessons Learned

- **Prompt template issues:** None. Template performed well across all 3 runs. No reformatting needed for Batch 2B.
- **Most common failure mode:** None — 15/15 pass rate. No dead cells, no near-duplicates, no cap violations caught in QC.
- **Attribute combinations to avoid in Batch 2B:** Süper Lig and Saudi Pro League are at their full-35 cap (1/1 each) — do NOT reuse. Played in Primeira Liga was skipped entirely in Batch 2A — must be introduced in Batch 2B.
- **New attributes that worked well:** All new attributes (Ballon d'Or Winner, Copa América Winner, UEFA Euro Winner, African Cup of Nations Winner, Europa League Winner, Eredivisie, Süper Lig, Saudi Pro League) introduced cleanly with no validator issues.
- **New attributes that caused problems:** None.
- **Factual errors caught in spot-check:** None flagged.
- **Batch 2A final pass rate:** 15 / 15 (100%)
- **Decision on Batch 2B:** ✅ Unblocked. Target: sg-031 through sg-050 (20 puzzles). Priorities: introduce Flamengo, Inter Miami, Primeira Liga, Welsh, Japanese, South Korean, Moroccan; add second Eredivisie puzzle; continue adding Ballon d'Or Winner (1–3 remaining budget).
- **File write issue (critical lesson for future sessions):** The Write tool (Claude Code) mangled the absolute Windows path `C:\Users\antho\ballpark-hero\supabase\migrations\...` into a single filename string at the repo root, producing a 0-byte garbage file (`Usersanthoballpark-herosupabasemigrations...sql`). The actual migration file was subsequently written correctly via Bash heredoc with relative path. **Rule going forward: use Bash heredoc for migration files, always verify with `wc -c` immediately after creation, and treat any Write tool output as unverified until byte count is confirmed non-zero.**

---

# Round 4 — SoccerGrid Batch 2B: Generation Prompt + Tracking Doc
Date: 2026-05-26 (approved after Batch 2A completion)

## Status
- Batch 2B target: **20 puzzles** (sg-031 through sg-050)
- Batch 2B current approved count: **0 / 20**
- Migration applied: pending — `20260526000006_soccer_grid_puzzles_batch2b.sql` (planned)
- Prerequisite: Batch 2A ✅ complete — sg-016 through sg-030, COUNT(*) = 30 confirmed
- Next action: Run 1 (sg-031 through sg-035)

---

## Run Plan

| Run | IDs | Row-type composition | Real Madrid rule |
|---|---|---|---|
| Run 1 | sg-031–035 | 2 three-club + 1 three-nationality + 1 mixed + 1 achievement-heavy | DO NOT USE — reserved for Run 3 |
| Run 2 | sg-036–040 | 2 three-club + 2 three-nationality + 1 mixed | DO NOT USE — reserved for Run 3 |
| Run 3 | sg-041–045 | 2 three-club + 1 three-nationality + 1 mixed + 1 achievement-heavy | ✅ USE HERE — achievement-heavy slot only |
| Run 4 | sg-046–050 | 3 three-club + 1 three-nationality + 1 mixed | DO NOT USE — consumed in Run 3 |

**Structural distribution:** 9 three-club / 5 three-nationality / 4 mixed / 2 achievement-heavy = 20 total

Row type definitions:
- **three-club-rows:** all 3 row attributes are clubs
- **three-nationality-rows:** all 3 row attributes are nationalities
- **mixed-rows:** 2 clubs + 1 nationality, OR 2 nationalities + 1 club
- **achievement-heavy:** 0 position cols — all 3 cols are leagues, awards, or achievement misc

---

## 5 New Constraints (Batch 2B — All Hard Rules)

These apply to every puzzle in every run. Violations are grounds for immediate rejection regardless of cell quality.

### Constraint 1 — BANNED TRIPLE
The column set `{Forward (FWD), Played in Premier League, Champions League Winner}` must NEVER all appear together in any single puzzle. Already saturates sg-013 and sg-016.

### Constraint 2 — PRIMEIRA LIGA TAUTOLOGY BAN
If `Played in Primeira Liga` appears as a col, NONE of the row attributes may be Porto, Benfica, Sporting CP, or any other Portuguese club. Trivially obvious intersection. Safe: use with nationality rows or non-Portuguese club rows.

### Constraint 3 — FLAMENGO RESTRICTION
`Played for Flamengo` cannot appear in the same puzzle as `Champions League Winner`. Flamengo has never competed in the UEFA Champions League — structural dead cell.

### Constraint 4 — INTER MIAMI DEPTH WARNING
`Played for Inter Miami` must NOT appear in achievement-heavy puzzles (all 3 cols as achievements). Founded 2020; alumni pool thin. Safe cols: World Cup Winner, Ballon d'Or Winner, position. Max 1 Inter Miami puzzle across all 20 Batch 2B puzzles.

### Constraint 5 — CAREER TIMING
For any club-row × achievement-col cell, the named player must have won the achievement while AT or AFTER that club. Canonical negative example: Ballack at Chelsea (left 2010, Chelsea won UCL 2012 — does NOT count).

---

## Generation Prompt Template

Copy everything between the triple-dashes below and paste into a separate Claude.ai chat.
Before each run, fill in: **PUZZLE TYPES FOR THIS RUN** and **ALREADY APPROVED IN BATCH 2B**.
Update per-run caps if any batch totals have been consumed by prior runs.

---

```
SOCCER GRID PUZZLE GENERATION — BATCH 2B

You are generating new puzzles for a daily sports trivia game called Soccer Grid. The game shows
a 3x3 grid. Players name a soccer/football player who satisfies BOTH the row attribute AND the
column attribute for each cell.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each puzzle has:
- puzzle_id: "sg-NNN" (specified below)
- rows: exactly 3 attributes (the row headers)
- cols: exactly 3 attributes (the column headers)

Each attribute:
- label: display text shown to users (see conventions below)
- type: MUST be one of exactly 8 values:
    club | nationality | league | award | position | champions_league | world_cup | misc

Label conventions (follow exactly):
- club        → "Played for [Club Name]"
- nationality → "[Nationality adjective]"  (e.g. "Brazilian", "Welsh", "South Korean")
- league      → "Played in [League Name]"  (e.g. "Played in Eredivisie", "Played in Primeira Liga")
- position    → use ONLY these four exact strings:
                  "Forward (FWD)"  |  "Midfielder (MID)"  |  "Defender (DEF)"  |  "Goalkeeper (GK)"
- champions_league → "Champions League Winner"
- world_cup        → "World Cup Winner"
- award       → "Golden Boot Winner"  OR  "Ballon d'Or Winner"  OR  "Europa League Winner"
- misc        → "Over 100 International Caps"  |  "Copa America Winner"  |  "UEFA Euro Winner"
                "African Cup of Nations Winner"  |  other milestones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY: CELL VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EVERY puzzle, produce a 3x3 cell validation table. Name AT LEAST 2 real players per cell.

Rules:
- The player must have actually played for the club, hold the nationality, played in the league,
  or won the award — no guesses.
- CAREER TIMING RULE: For every club-row x achievement-col cell, state the player's club tenure
  years and the achievement year.
  Example: "De Bruyne (Man City 2015–present, UCL 2023 ok)"
  Ballack left Chelsea in 2010; Chelsea won the UCL in 2012 — Ballack does NOT satisfy
  Chelsea + Champions League Winner. Apply this check to every such cell without exception.
- If you cannot name 2 players for a cell:
    → Mark "THIN (1 only): [name]" ONLY IF:
       (a) single player is globally recognized (top historical / current top-100 active), AND
       (b) no more than 2 THIN cells exist in this puzzle's 9-cell grid.
    → If either condition fails → puzzle fails cell validation → propose replacement attribute.
- If you cannot name any player → mark "DEAD CELL" → do NOT include that puzzle.
- Mark "TOO BROAD (100+)" if answer pool is trivially large → replace that attribute pair.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL CONSTRAINTS — ALL 5 ARE HARD RULES, NOT SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONSTRAINT 1 — BANNED TRIPLE:
Cols {Forward (FWD), Played in Premier League, Champions League Winner} must NEVER all appear
together in one puzzle. Saturates sg-013 and sg-016. Violation = immediate rejection.

CONSTRAINT 2 — PRIMEIRA LIGA TAUTOLOGY BAN:
If "Played in Primeira Liga" is a col, no row may be Porto, Benfica, Sporting CP, or any
Portuguese club. Safe: nationality rows or non-Portuguese club rows.

CONSTRAINT 3 — FLAMENGO RESTRICTION:
"Played for Flamengo" cannot be in the same puzzle as "Champions League Winner". Structural
dead cell — Flamengo has never played in the UEFA Champions League.

CONSTRAINT 4 — INTER MIAMI DEPTH WARNING:
"Played for Inter Miami" must NOT appear in achievement-heavy puzzles. Founded 2020, pool thin.
Safe cols: World Cup Winner, Ballon d'Or Winner, position. Avoid: Copa America Winner, UEFA
Euro Winner, AFCON Winner, Europa League Winner. Max 1 Inter Miami puzzle across all of Batch 2B.

CONSTRAINT 5 — CAREER TIMING:
For all club-row x achievement-col cells, state player tenure years + achievement year.
Do not skip for "obvious" cells — written audit trail is required.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREMIER LEAGUE SATURATION — MOST IMPORTANT CONSTRAINT IN BATCH 2B
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Played in Premier League" currently appears in 9 of 30 existing puzzles (30% of the pool).
This is the single most overused attribute in the entire set.

Hard rule: max 1 use per run, max 4 uses across all 20 Batch 2B puzzles.

Quality rule: if "Played in Premier League" IS used, the other two col attributes must be
high-variety (a new achievement, a rare nationality, a non-standard league) — NOT generic
position or common league fillers. Premier League must justify its appearance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXISTING PUZZLES — DO NOT DUPLICATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following 30 puzzles already exist. No new puzzle may:
(a) repeat an identical 6-attribute set (order-insensitive), OR
(b) share 3 or more attributes with any of these puzzles (order-insensitive).

IMPORTANT: Check every candidate against ALL 30 puzzles individually. In your NEAR-DUPLICATE
CHECK output, list every puzzle sharing exactly 2 attributes with your candidate (high-risk
neighbors). Immediately reject any candidate with 3+ overlap against ANY existing puzzle.

sg-001 rows: Played for Barcelona, Played for Real Madrid, Played for Manchester United
       cols: Forward (FWD), Champions League Winner, World Cup Winner

sg-002 rows: Played for Chelsea, Played for AC Milan, Played for Bayern Munich
       cols: Midfielder (MID), Played in Premier League, Golden Boot Winner

sg-003 rows: Played for Liverpool, Played for Juventus, Played for PSG
       cols: Defender (DEF), Played in La Liga, Over 100 International Caps

sg-004 rows: Played for Arsenal, Played for Inter Milan, Played for Manchester City
       cols: Forward (FWD), Played in Serie A, Champions League Winner

sg-005 rows: Played for Atletico Madrid, Played for Borussia Dortmund, Played for Tottenham
       cols: Goalkeeper (GK), World Cup Winner, Played in Bundesliga

sg-006 rows: Brazilian, French, Argentine
       cols: Played for Real Madrid, Champions League Winner, Played in Ligue 1

sg-007 rows: Played for Roma, Played for Napoli, Played for AC Milan
       cols: Forward (FWD), Played in Serie A, Over 100 International Caps

sg-008 rows: Played for Barcelona, Played for Chelsea, Played for Bayern Munich
       cols: Midfielder (MID), World Cup Winner, Played in Premier League

sg-009 rows: German, Spanish, Italian
       cols: Defender (DEF), Champions League Winner, World Cup Winner

sg-010 rows: Played for Manchester City, Played for Liverpool, Played for Real Madrid
       cols: Forward (FWD), Played in La Liga, Golden Boot Winner

sg-011 rows: Played for PSG, Played for Juventus, Played for Arsenal
       cols: Midfielder (MID), Played in Ligue 1, Over 100 International Caps

sg-012 rows: Played for Tottenham, Played for Inter Milan, Played for Borussia Dortmund
       cols: Goalkeeper (GK), Champions League Winner, Played in Bundesliga

sg-013 rows: Portuguese, Dutch, English
       cols: Forward (FWD), Played in Premier League, Champions League Winner

sg-014 rows: Played for Barcelona, Played for Manchester United, Played for AC Milan
       cols: Defender (DEF), World Cup Winner, Played in Serie A

sg-015 rows: Played for Real Madrid, Played for Chelsea, Played for Liverpool
       cols: Played in MLS, Champions League Winner, Over 100 International Caps

sg-016 rows: Played for Ajax, Played for Porto, Played for Benfica
       cols: Played in Premier League, Forward (FWD), Champions League Winner

sg-017 rows: Played for Sevilla, Played for Marseille, Played for Galatasaray
       cols: Played in Premier League, Forward (FWD), French

sg-018 rows: Played for Bayer Leverkusen, Played for Lazio, Played for Sporting CP
       cols: Midfielder (MID), Played in Premier League, Champions League Winner

sg-019 rows: Colombian, Uruguayan, Chilean
       cols: Played for Barcelona, Played in Premier League, Copa America Winner

sg-020 rows: Played for Boca Juniors, Played for River Plate, Croatian
       cols: Played in Serie A, Midfielder (MID), Played in La Liga

sg-021 rows: Played for Fiorentina, Played for Valencia, Played for Villarreal
       cols: Argentine, Played in La Liga, Midfielder (MID)

sg-022 rows: Played for Celtic, Played for PSV, Played for Feyenoord
       cols: Defender (DEF), Played in Premier League, Dutch

sg-023 rows: Played for Lyon, Played for Monaco, Played for Lille
       cols: Defender (DEF), Played in Ligue 1, Played in Serie A

sg-024 rows: Belgian, Polish, Norwegian
       cols: Played for Borussia Dortmund, Played in Ligue 1, Goalkeeper (GK)

sg-025 rows: Played for Manchester United, Played for Bayern Munich, Played for Juventus
       cols: Ballon d'Or Winner, World Cup Winner, Over 100 International Caps

sg-026 rows: Played for Newcastle, Played for Everton, Played for West Ham
       cols: Played in Eredivisie, Defender (DEF), Played in Serie A

sg-027 rows: Played for Eintracht Frankfurt, Played for Schalke, Played for Besiktas
       cols: Played in Premier League, Played in Super Lig, Midfielder (MID)

sg-028 rows: Senegalese, Ivorian, Cameroonian
       cols: African Cup of Nations Winner, Played in Ligue 1, Played for Chelsea

sg-029 rows: Played for Real Madrid, Played for Bayern Munich, Played for Inter Milan
       cols: World Cup Winner, UEFA Euro Winner, Europa League Winner

sg-030 rows: Played for Liverpool, Played for Chelsea, Played for Manchester City
       cols: Played in Saudi Pro League, Goalkeeper (GK), Brazilian

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALREADY APPROVED IN BATCH 2B
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

sg-031 rows: Played for Wolfsburg, Played for Shakhtar Donetsk, Played for Fenerbahçe
       cols: Midfielder (MID), Played in Bundesliga, Brazilian

sg-032 rows: Welsh, Egyptian, Serbian
       cols: Played in Premier League, Forward (FWD), Played for Liverpool

sg-033 rows: Played for Ajax, Played for PSV, Played for Lazio
       cols: Played in Eredivisie, Brazilian, Forward (FWD)

sg-034 rows: Played for Marseille, Played for Sevilla, Moroccan
       cols: Played in Ligue 1, Played in La Liga, Defender (DEF)

sg-035 rows: Played for Manchester United, Played for Atlético Madrid, Played for Valencia
       cols: World Cup Winner, Europa League Winner, Played in Primeira Liga

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSTRAINTS FOR THIS BATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PER-RUN ATTRIBUTE CAPS — RUN 2 (batch totals consumed after Run 1):
- "Champions League Winner":           max 1 across these 5 puzzles  (0 / 3 batch-used)
- "World Cup Winner":                  max 1 across these 5 puzzles  (1 / 4 batch-used)
- "Forward (FWD)":                     max 2 across these 5 puzzles  (2 / 6 batch-used)
- "Played in Premier League":          max 1 across these 5 puzzles  ← STRICTLY ENFORCED (1 / 4 batch-used — getting tight)
- "Played for Real Madrid" (row/col):  max 0 across these 5 puzzles  ← DO NOT USE — reserved for Run 3 only
    NOTE: Only 1 Real Madrid use allowed across ALL 20 Batch 2B puzzles.
- "Played in Serie A":                 max 1 across these 5 puzzles  (0 / 3 batch-used)
- "Played in La Liga":                 max 1 across these 5 puzzles  (1 / 3 batch-used)
- "Played in Ligue 1":                 max 1 across these 5 puzzles  (1 / 3 batch-used)
- "Ballon d'Or Winner":                max 1 across these 5 puzzles  (0 / 3 batch-used)
- "Europa League Winner":              max 1 across these 5 puzzles  (1 / 2 batch-used — 1 remaining total)

BATCH-WIDE HARD STOPS (never use in any run):
- "Played in Super Lig":               DO NOT USE — at full lifetime cap
- "Played in Saudi Pro League":        DO NOT USE — at full lifetime cap
- Banned triple cols: {FWD + Premier League + CL Winner} all together — NEVER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY ATTRIBUTES FOR BATCH 2B
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANDATORY across all 20 Batch 2B puzzles:
  ✅ "Played in Primeira Liga" — satisfied (sg-035)
  ✅ Second use of "Played in Eredivisie" — satisfied (sg-033; total ≥2 with sg-026 from 2A)

HIGH PRIORITY — nationalities not yet used (Run 2 focus):
  Japanese, South Korean
  (Welsh ✅ sg-032, Egyptian ✅ sg-032, Moroccan ✅ sg-034, Serbian ✅ sg-032 — 4 of 6 done ✅)
  Target: introduce Japanese and/or South Korean in this run's three-nationality-row puzzles

HIGH PRIORITY — clubs not yet used:
  Played for Flamengo (see Constraint 3 — NOT with CL Winner),
  Played for Inter Miami (max 1 batch-wide — see Constraint 4 — NOT in achievement-heavy),
  Played for Atletico Mineiro, Played for Santos,
  Played for Red Bull Salzburg, Played for Zenit St. Petersburg, Played for Olympiacos
  (Wolfsburg ✅ sg-031, Shakhtar Donetsk ✅ sg-031 already introduced)

MEDIUM PRIORITY — used once in 2A, room for more:
  Ballon d'Or Winner (budget: 3 remaining in 2B)
  Europa League Winner (budget: 1 remaining in 2B — use with caution)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUZZLE TYPES FOR THIS RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[CURRENT: Run 2 — copy the line below when pasting to Claude.ai. Update for Run 3+ as runs complete.]

Run 1 ✅ COMPLETE (sg-031–sg-035)
Run 2: 2 three-club-rows + 2 three-nationality-rows + 1 mixed-rows  (IDs: sg-036 to sg-040)  ← USE THIS
Run 3: 2 three-club-rows + 1 three-nationality-rows + 1 mixed-rows + 1 achievement-heavy  (IDs: sg-041 to sg-045)
Run 4: 3 three-club-rows + 1 three-nationality-rows + 1 mixed-rows  (IDs: sg-046 to sg-050)

Row type definitions:
- three-club-rows:       all 3 row attributes are clubs
- three-nationality-rows: all 3 row attributes are nationalities
- mixed-rows:            2 clubs + 1 nationality, OR 2 nationalities + 1 club
- achievement-heavy:     0 position cols — all 3 cols are leagues, awards, or misc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each puzzle, output ALL five sections in order:

1. PUZZLE [puzzle_id]  — row type: [three-club-rows | three-nationality-rows | mixed-rows | achievement-heavy]
   rows:
     [row 1 label]  (type: [type])
     [row 2 label]  (type: [type])
     [row 3 label]  (type: [type])
   cols:
     [col 1 label]  (type: [type])
     [col 2 label]  (type: [type])
     [col 3 label]  (type: [type])

2. CELL VALIDATION TABLE
   3x3 grid labeled by row and col attributes.
   Each cell: 2+ player names, or THIN (1 only): [name], or DEAD CELL, or TOO BROAD (100+).
   For every club-row x achievement-col cell: include tenure dates + achievement year.
   Example: "De Bruyne (Man City 2015–present, UCL 2023 ok), Haaland (Man City 2022–present, UCL 2023 ok)"
   THIN rules: (a) globally recognized player, AND (b) ≤2 THIN cells per puzzle.

3. NEAR-DUPLICATE CHECK
   Check against ALL 30 existing puzzles + all approved Batch 2B puzzles.
   List every puzzle sharing exactly 2 attributes: "sg-NNN: shares [attr1], [attr2]"
   Confirm: "All share ≤2 attributes. ✓" — or — "REJECT: 3+ overlap with sg-NNN."

4. CAP COMPLIANCE — RUNNING TALLY (update after each puzzle)
   Champions League Winner:     [n] / 1 max this run
   World Cup Winner:            [n] / 1 max this run
   Forward (FWD):               [n] / 2 max this run
   Played in Premier League:    [n] / 1 max this run
   Played for Real Madrid:      [n] / 0 max this run  ← DO NOT USE (reserved for Run 3)
   Played in Serie A:           [n] / 1 max this run
   Played in La Liga:           [n] / 1 max this run
   Played in Ligue 1:           [n] / 1 max this run
   Ballon d'Or Winner:          [n] / 1 max this run
   Europa League Winner:        [n] / 1 max this run

5. CONSTRAINT VIOLATIONS CHECK
   [ ] BANNED TRIPLE: cols do NOT contain all of {FWD, Premier League, CL Winner}
   [ ] PRIMEIRA LIGA TAUTOLOGY: if Primeira Liga used, no Portuguese clubs in rows
   [ ] FLAMENGO RESTRICTION: Flamengo not paired with Champions League Winner
   [ ] INTER MIAMI DEPTH: Inter Miami not in achievement-heavy puzzle
   [ ] CAREER TIMING: all club x achievement cells show tenure + achievement year

Generate [N] puzzles now.
```

---

## QC Checklist for Batch 2B

Apply per 5-puzzle run before adding candidates to the tracking table.

### Structural validation
- [ ] Exactly 3 rows and 3 cols per puzzle
- [ ] Each attribute has `label` (non-empty string) and `type`
- [ ] `type` is one of the 8 valid values: `club` `nationality` `league` `award` `position` `champions_league` `world_cup` `misc`
- [ ] Label follows exact format convention: `"Played for X"` for club, `"[Adjective]"` for nationality, `"Played in X"` for league, exact strings for position
- [ ] `puzzle_id` is in the correct range for this run
- [ ] Declared row type matches actual row composition (mixed-rows must be 2+1 or 1+2, not 3 clubs)

### Cell validation
- [ ] All 9 cells have ≥2 named players, OR valid THIN status, OR flagged for rejection
- [ ] THIN cells: (a) single player is globally recognized (top historical / current top-100 active)
- [ ] THIN cells: (b) no more than 2 THIN cells in any single puzzle — reject if 3+
- [ ] No DEAD CELLs
- [ ] No TOO BROAD cells (trivially large answer pool)

### ★ Cross-puzzle 3-overlap check (new in 2B — catches the sg-013/sg-016 QC miss)
- [ ] For each candidate, assemble its 6 attribute labels as a set
- [ ] Check against ALL 30 existing puzzles (sg-001 through sg-030) + all approved Batch 2B puzzles
- [ ] Any candidate sharing 3+ attributes with ANY existing puzzle → immediate rejection, do not migrate
- [ ] Log all 2-overlap pairs in the notes column (high-risk neighbors)
- [ ] Apply intra-batch too: new candidates checked against already-approved 2B puzzles

### ★ Banned triple check (new in 2B)
- [ ] Scan each candidate's col set for {Forward (FWD), Played in Premier League, Champions League Winner} all three together → reject immediately

### ★ Primeira Liga tautology check (new in 2B)
- [ ] If Played in Primeira Liga is a col, verify no row attributes are Porto, Benfica, Sporting CP, or any other Portuguese club → reject if tautology found

### ★ Flamengo + CL Winner check (new in 2B)
- [ ] Scan for Played for Flamengo paired with Champions League Winner in any puzzle → reject (structural dead cell)

### ★ Career-timing spot-check (strengthened from 2A)
- [ ] For ≥30% of club-row × achievement-col cells per run (~4–5 cells per run of 5 puzzles), verify player tenure dates vs. achievement date
- [ ] Always spot-check THIN cells first — single named player must definitively satisfy both
- [ ] Document: "[Player] at [Club] [year–year], won [achievement] [year] pass/fail"
- [ ] Cell failure → reject that puzzle → log failure type for template diagnosis
- [ ] If ≥2 cells fail in a single run → treat as batch signal, review prompt before next run

### Near-duplicate check (tightened from 2A)
- [ ] Attributes shared with sg-001 through sg-030 + approved 2B: ≤2 per puzzle (order-insensitive)

### Attribute cap check — per-run running tallies (from prompt output section 4)
- [ ] Champions League Winner: ≤1 this run
- [ ] World Cup Winner: ≤1 this run
- [ ] Forward (FWD): ≤2 this run
- [ ] Played in Premier League: ≤1 this run
- [ ] Played for Real Madrid: ≤1 this run (and ≤1 total in all 20 Batch 2B puzzles; 0 in Runs 1–2)
- [ ] Played in Serie A: ≤1 this run
- [ ] Played in La Liga: ≤1 this run
- [ ] Played in Ligue 1: ≤1 this run

### Factual spot-check (~4–5 cells per run, ~16–20 cells total across Batch 2B)
- [ ] Prioritize: THIN cells, first use of new attributes (Primeira Liga, Welsh, Flamengo, etc.)
- [ ] Verify against Wikipedia career history, Transfermarkt, or equivalent
- [ ] Log each spot-checked cell and result in tracking table notes column
- [ ] If a spot-checked cell fails → reject that puzzle → note failure type for template diagnosis

---

## Batch 2B Attribute Cap Table

Updated after each run is approved. Run 1 (sg-031–sg-035) complete.

| Attribute | 2B max | Used in 2B | Remaining |
|---|---|---|---|
| Champions League Winner | 3 | 0 | 3 |
| World Cup Winner | 4 | **1** (sg-035) | 3 |
| Forward (FWD) | 6 | **2** (sg-032, sg-033) | 4 |
| Played for Real Madrid (row or col) | 1 | 0 | 1 |
| Ballon d'Or Winner | 3 | 0 | 3 |
| Europa League Winner | 2 | **1** (sg-035) | 1 |
| Copa América Winner | 1 | 0 | 1 |
| UEFA Euro Winner | 1 | 0 | 1 |
| African Cup of Nations Winner | 1 | 0 | 1 |
| Played in Eredivisie | 2 (min 1) ✅ | **1** (sg-033) | 1 |
| Played in Primeira Liga | 2 (min 1) ✅ | **1** (sg-035) | 1 |
| Played in Premier League | 4 | **1** (sg-032) | 3 |
| Played in Serie A | 3 | 0 | 3 |
| Played in La Liga | 3 | **1** (sg-034) | 2 |
| Played in Ligue 1 | 3 | **1** (sg-034) | 2 |
| Played in Süper Lig | 0 — DO NOT USE | — | 0 |
| Played in Saudi Pro League | 0 — DO NOT USE | — | 0 |

---

## Mandatory Attributes Checklist

Must be fully satisfied before migration is applied.

- [x] **Played in Primeira Liga** — ✅ sg-035
- [x] **Played in Eredivisie** — ✅ sg-033 (total ≥2: sg-026 from 2A + sg-033)
- [ ] **Played for Flamengo** — ≥1 puzzle in 2B (NOT with Champions League Winner — Constraint 3)
- [ ] **Played for Inter Miami** — ≤1 puzzle in 2B (cap, not minimum)
- [x] **New nationalities (≥4 of 6):** Welsh ✅ sg-032 · Egyptian ✅ sg-032 · Moroccan ✅ sg-034 · Serbian ✅ sg-032 · Japanese ☐ · South Korean ☐

---

## Batch 2B Tracking Table

Updated after each run. Status values: `pending` / `approved` / `rejected` / `approved-marginal`

| puzzle_id | rows summary | cols summary | run # | status | notes |
|---|---|---|---|---|---|
| sg-031 | Wolfsburg / Shakhtar Donetsk / Fenerbahçe | MID / Bundesliga / Brazilian | 1 | approved | First use of Wolfsburg, Shakhtar Donetsk, Fenerbahçe; first Bundesliga col |
| sg-032 | Welsh / Egyptian / Serbian | Premier League / FWD / Liverpool (col) | 1 | approved | Introduces Welsh, Egyptian, Serbian; Liverpool as col (first big-club col in 2B) |
| sg-033 | Ajax / PSV / Lazio | Eredivisie / Brazilian / FWD | 1 | approved | 2nd Eredivisie use ✅ mandatory satisfied |
| sg-034 | Marseille / Sevilla / Moroccan | Ligue 1 / La Liga / DEF | 1 | approved | Introduces Moroccan; 2-attr overlap with sg-017 (Sevilla, Marseille — borderline, passes) |
| sg-035 | Man United / Atlético Madrid / Valencia | WC Winner / Europa League Winner / Primeira Liga | 1 | approved | Primeira Liga mandatory ✅; Europa League 2nd in 2B; WC Winner 1st in 2B |
| sg-036 | | | 2 | pending | |
| sg-037 | | | 2 | pending | |
| sg-038 | | | 2 | pending | |
| sg-039 | | | 2 | pending | |
| sg-040 | | | 2 | pending | |
| sg-041 | | | 3 | pending | |
| sg-042 | | | 3 | pending | |
| sg-043 | | | 3 | pending | |
| sg-044 | | | 3 | pending | |
| sg-045 | | | 3 | pending | |
| sg-046 | | | 4 | pending | |
| sg-047 | | | 4 | pending | |
| sg-048 | | | 4 | pending | |
| sg-049 | | | 4 | pending | |
| sg-050 | | | 4 | pending | |

**Batch 2B result:** 5 / 20 approved (Run 1: 5/5, 100%) &nbsp;|&nbsp; Pass rate: batch TBD &nbsp;|&nbsp; Decision: —

---

## Acceptance Criteria — Batch 2B

### Per-run pass thresholds

| Pass rate | Action |
|---|---|
| **≥70% (≥4 of 5 pass QC)** | ✅ Proceed to next run |
| **60% (3 of 5 pass)** | Identify failure pattern → revise prompt → regenerate failed candidates before next run |
| **<60% (<3 of 5 pass)** | 🛑 Apply stop-on-failure rule — do not start next run |

**Stop-on-first-run-failure rule:** If a single run of 5 produces ≥2 failures (>30% rework), treat as a batch failure signal. Do not start the next run until the failure pattern is identified and the prompt is revised.

### Batch-total thresholds

| Pass rate | Action |
|---|---|
| **≥70% (≥14 of 20 pass QC)** | ✅ Proceed to migration |
| **50–69% (10–13 pass)** | Identify failure pattern → revise prompt → Run 5 to regenerate failed candidates |
| **<50% (<10 pass)** | 🛑 STOP — full framework review before any further generation |

### Failure pattern taxonomy

| Failure type | Diagnosis | Fix |
|---|---|---|
| Dead cells | Cell validation instruction too weak | Strengthen DEAD CELL definition; require 2+ answers per cell |
| Near-duplicate violations | 30-puzzle list not scanned fully | Add per-puzzle overlap count to output format |
| Cap violations | Model not tracking running tally | Require RUNNING TALLY after every puzzle, not at end |
| Career timing errors | Tenure dates not checked vs award dates | Add more counter-examples (Ballack) to Constraint 5 |
| Too-broad cells | Attribute pair too permissive | Add TOO BROAD rejection criterion more prominently |
| Primeira Liga tautology | Constraint 2 not followed | Move tautology ban to top of schema section |
| Structural type mismatch | Mixed-rows ends up three-club | Require row-type declaration in header; reject if mismatch |
| THIN threshold exceeded | ≥3 THIN cells in one puzzle | Tighten floor; require 2 players minimum for next batch |

---

## Migration Plan — Batch 2B

**File:** `supabase/migrations/20260526000006_soccer_grid_puzzles_batch2b.sql`

Rules:
- INSERT only — table already exists, no DDL, no CREATE TABLE
- Plain string literals for JSONB columns — **no `::jsonb` explicit casts**
- **No `ON CONFLICT` clause**
- sort_order: sg-031 = 30, sg-032 = 31, … sg-050 = 49
- Apostrophes inside SQL strings doubled: `Eto''o`, `N''Golo`, `d''Or`, `d''Ivoire`
- Apply manually via Supabase SQL Editor
- Verify: `SELECT COUNT(*) FROM soccer_grid_puzzles` → expect **50** after apply

**File write protocol (enforced strictly — lesson from Batch 2A):**
1. Write via Bash heredoc with **relative path** — NOT the Write tool, NOT an absolute Windows path
2. Immediately verify: `wc -c supabase/migrations/20260526000006_soccer_grid_puzzles_batch2b.sql` — must show ≥7,000 bytes
3. If 0 bytes → retry; do not proceed to Supabase application
4. Open in WordPad (not Notepad) to visually confirm first 3–4 INSERT rows render correctly
5. Do not commit until Supabase application is confirmed and COUNT(*) = 50

---

## Lessons Learned — Batch 2B

*(Fill after batch completes)*

- **Prompt template issues:**
- **Most common failure mode:**
- **Attribute combinations to avoid in Batch 2C (if needed):**
- **New attributes that worked well:**
- **New attributes that caused problems:**
- **Factual errors caught in spot-check:**
- **Batch 2B final pass rate:**
- **Decision on Batch 2C:**
